// Package sqlitestore is a small file-backed reference adapter for lifecycle
// conformance and host examples. It serializes management metadata in one SQLite
// row; high-volume hosts should implement the same contract with normalized tables.
// It is never installed by DataModule automatically. Providers/targets must still
// implement fencing, physical recovery and their own retention/cleanup policy.
package sqlitestore

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/url"
	"path/filepath"
	"reflect"
	"slices"
	"strings"
	"time"

	"github.com/goliatone/go-admin/data"
	_ "modernc.org/sqlite"
)

type Options struct {
	RetryWindow      time.Duration
	ReceiptRetention time.Duration
	Now              func() time.Time
}
type Store struct {
	db      *sql.DB
	options Options
}
type artifactKey struct{ Provider, ID string }
type claimKey struct{ Actor, Scope, Target, Command, Key string }
type tombstone struct {
	Fingerprint, OperationID string
	ExpiresAt                time.Time
}
type leaseState struct {
	Fence       uint64
	OperationID string
	Until       time.Time
}
type document struct {
	Artifacts   map[string]data.ArtifactRef
	Operations  map[string]data.Operation
	Claims      map[string]tombstone
	Leases      map[string]leaseState
	Targets     map[string]data.TargetState
	Receipts    map[string]data.PreparationReceipt
	RetainUntil map[string]time.Time
}

func Open(path string, options Options) (*Store, error) {
	if !filepath.IsAbs(path) || path == "" {
		return nil, data.Error(data.CodeInvalid)
	}
	if options.RetryWindow == 0 {
		options.RetryWindow = 30 * 24 * time.Hour
	}
	if options.ReceiptRetention == 0 {
		options.ReceiptRetention = 7 * 24 * time.Hour
	}
	if options.RetryWindow < time.Hour || options.RetryWindow > 90*24*time.Hour || options.ReceiptRetention < time.Hour || options.ReceiptRetention > 90*24*time.Hour {
		return nil, data.Error(data.CodeInvalid)
	}
	if options.Now == nil {
		options.Now = time.Now
	}
	query := url.Values{}
	query.Add("_pragma", "journal_mode(WAL)")
	query.Add("_pragma", "synchronous(FULL)")
	query.Add("_pragma", "busy_timeout(5000)")
	db, err := sql.Open("sqlite", (&url.URL{Scheme: "file", Path: path, RawQuery: query.Encode()}).String())
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(4)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err = db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS data_console_state (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL)`); err != nil {
		return nil, errors.Join(err, db.Close())
	}
	initial, err := json.Marshal(empty())
	if err != nil {
		return nil, errors.Join(err, db.Close())
	}
	if _, err = db.ExecContext(ctx, `INSERT OR IGNORE INTO data_console_state(id,body) VALUES(1,?)`, string(initial)); err != nil {
		return nil, errors.Join(err, db.Close())
	}
	return &Store{db: db, options: options}, nil
}
func empty() document {
	return document{Artifacts: map[string]data.ArtifactRef{}, Operations: map[string]data.Operation{}, Claims: map[string]tombstone{}, Leases: map[string]leaseState{}, Targets: map[string]data.TargetState{}, Receipts: map[string]data.PreparationReceipt{}, RetainUntil: map[string]time.Time{}}
}
func key[T data.TargetKey | claimKey | artifactKey](value T) string {
	b, _ := json.Marshal(value) //nolint:errcheck,errchkjson // Both allowed key structs contain only JSON-encodable strings.
	return string(b)
}
func (s *Store) Close() error { return s.db.Close() }
func (*Store) Capabilities() data.StoreCapabilities {
	return data.StoreCapabilities{Durable: true, AtomicClaims: true, Fencing: true, AtomicIntentFinalize: true, ProtectedRetention: true}
}
func (s *Store) transact(ctx context.Context, write bool, apply func(*document) error) (err error) {
	conn, err := s.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, conn.Close()) }()
	begin := "BEGIN"
	if write {
		begin = "BEGIN IMMEDIATE"
	}
	if _, err = conn.ExecContext(ctx, begin); err != nil {
		return err
	}
	// Rollback must also run when the request times out; otherwise a pooled
	// connection could retain the lock and accidentally commit later work.
	committed := false
	defer func() {
		if !committed {
			cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
			defer cancel()
			_, rollbackErr := conn.ExecContext(cleanup, "ROLLBACK")
			err = errors.Join(err, rollbackErr)
		}
	}()
	var body string
	if err = conn.QueryRowContext(ctx, `SELECT body FROM data_console_state WHERE id=1`).Scan(&body); err != nil {
		return err
	}
	var doc document
	if err = json.Unmarshal([]byte(body), &doc); err != nil {
		return err
	}
	if doc.Artifacts == nil {
		doc.Artifacts = map[string]data.ArtifactRef{}
	}
	if err = apply(&doc); err != nil {
		return err
	}
	if write {
		b, e := json.Marshal(doc)
		if e != nil {
			return e
		}
		if _, err = conn.ExecContext(ctx, `UPDATE data_console_state SET body=? WHERE id=1`, string(b)); err != nil {
			return err
		}
	}
	_, err = conn.ExecContext(ctx, "COMMIT")
	committed = err == nil
	return err
}
func (s *Store) Claim(ctx context.Context, op data.Operation) (out data.Claim, err error) {
	err = s.transact(ctx, true, func(d *document) error {
		k := key(claimKey{op.Principal.ActorID, op.Target.ScopeKey, op.Target.TargetID, op.Result.Kind.CommandID(), op.Input.IdempotencyKey})
		now := s.options.Now()
		if c, ok := d.Claims[k]; ok && now.Before(c.ExpiresAt) {
			if c.Fingerprint != op.Fingerprint {
				return data.Error(data.CodeConflict)
			}
			existing, ok := d.Operations[c.OperationID]
			if !ok {
				return data.Error(data.CodeGone)
			}
			out = data.Claim{Operation: existing, Replay: true}
			return nil
		}
		if _, ok := d.Operations[op.Result.OperationID]; ok {
			return data.Error(data.CodeConflict)
		}
		fingerprint, e := op.Input.Fingerprint(op.Result.Kind)
		if e != nil || fingerprint != op.Fingerprint || !op.Principal.Valid() || op.Target.ScopeKey != op.Principal.ScopeKey || op.Target.TargetID != op.Input.TargetID || op.Result.OperationID == "" || op.Result.State != data.Queued {
			return data.Error(data.CodeInvalid)
		}
		op.Result.Revision = 1
		op.CreatedAt = now
		op.UpdatedAt = now
		d.Claims[k] = tombstone{op.Fingerprint, op.Result.OperationID, now.Add(s.options.RetryWindow)}
		d.Operations[op.Result.OperationID] = op
		out = data.Claim{Operation: op}
		return nil
	})
	return
}
func (s *Store) GetOperation(ctx context.Context, id string) (out data.Operation, err error) {
	err = s.transact(ctx, false, func(d *document) error {
		var ok bool
		out, ok = d.Operations[id]
		if !ok {
			return data.Error(data.CodeGone)
		}
		return nil
	})
	return
}

func (s *Store) LookupRequest(ctx context.Context, request data.RequestKey) (out data.Operation, found bool, err error) {
	err = s.transact(ctx, false, func(d *document) error {
		k := key(claimKey{request.ActorID, request.Target.ScopeKey, request.Target.TargetID, request.Kind.CommandID(), request.IdempotencyKey})
		claim, ok := d.Claims[k]
		if !ok || !s.options.Now().Before(claim.ExpiresAt) {
			return nil
		}
		found = true
		out, ok = d.Operations[claim.OperationID]
		if !ok {
			return data.Error(data.CodeGone)
		}
		return nil
	})
	return
}
func (s *Store) ListOperations(ctx context.Context, target data.TargetKey, limit int) (out []data.Operation, err error) {
	out = []data.Operation{}
	if limit < 1 || limit > 100 {
		return nil, data.Error(data.CodeInvalid)
	}
	err = s.transact(ctx, false, func(d *document) error {
		for _, op := range d.Operations {
			if op.Target == target {
				out = append(out, op)
			}
		}
		sortOperations(out)
		if len(out) > limit {
			out = out[:limit]
		}
		return nil
	})
	return
}
func (s *Store) acquire(ctx context.Context, id string, target data.TargetKey, ttl time.Duration, recovery bool) (out data.Lease, err error) {
	if ttl < 5*time.Second || ttl > 60*time.Second {
		return out, data.Error(data.CodeInvalid)
	}
	err = s.transact(ctx, true, func(d *document) error {
		op, ok := d.Operations[id]
		if !ok || op.Target != target || op.Result.State.Terminal() {
			return data.Error(data.CodeGone)
		}
		k := key(target)
		state := d.Targets[k]
		if !recovery && (state.Pending != nil || state.RecoveryRequired) {
			return data.Error(data.CodeRecovery)
		}
		if recovery && state.Pending != nil && state.Pending.OperationID != id {
			return data.Error(data.CodeRecovery)
		}
		l := d.Leases[k]
		now := s.options.Now()
		if now.Before(l.Until) {
			return data.Error(data.CodeBusy)
		}
		if l.Fence >= 1<<53-1 {
			return data.Error(data.CodeUnavailable)
		}
		l.Fence++
		l.OperationID = id
		l.Until = now.Add(ttl)
		d.Leases[k] = l
		out = data.Lease{OperationID: id, Target: target, Fence: l.Fence, ExpiresAt: l.Until}
		return nil
	})
	return
}
func (s *Store) Acquire(ctx context.Context, id string, target data.TargetKey, ttl time.Duration) (data.Lease, error) {
	return s.acquire(ctx, id, target, ttl, false)
}
func (s *Store) AcquireRecovery(ctx context.Context, id string, target data.TargetKey, ttl time.Duration) (data.Lease, error) {
	return s.acquire(ctx, id, target, ttl, true)
}
func (s *Store) validLease(d *document, l data.Lease) error {
	current := d.Leases[key(l.Target)]
	if l.Fence == 0 || current.Fence != l.Fence || current.OperationID != l.OperationID || !s.options.Now().Before(current.Until) {
		return data.Error(data.CodeLeaseLost)
	}
	return nil
}
func (s *Store) Renew(ctx context.Context, l data.Lease, ttl time.Duration) (out data.Lease, err error) {
	if ttl < 5*time.Second || ttl > 60*time.Second {
		return out, data.Error(data.CodeInvalid)
	}
	err = s.transact(ctx, true, func(d *document) error {
		if e := s.validLease(d, l); e != nil {
			return e
		}
		k := key(l.Target)
		current := d.Leases[k]
		current.Until = s.options.Now().Add(ttl)
		d.Leases[k] = current
		l.ExpiresAt = current.Until
		out = l
		return nil
	})
	return
}
func (s *Store) CheckLease(ctx context.Context, l data.Lease) error {
	return s.transact(ctx, false, func(d *document) error { return s.validLease(d, l) })
}
func (s *Store) CheckCleanup(ctx context.Context, lease data.Lease, stageID string) error {
	return s.transact(ctx, false, func(d *document) error {
		if err := s.validLease(d, lease); err != nil {
			return err
		}
		state := d.Targets[key(lease.Target)]
		for id, receipt := range d.Receipts {
			if receipt.Target != lease.Target || receipt.StageID != stageID {
				continue
			}
			if state.Activation.ReceiptID == id || state.Pending != nil && (state.Pending.Prior.ReceiptID == id || state.Pending.Next.ReceiptID == id) || s.options.Now().Before(d.RetainUntil[id]) {
				return data.Error(data.CodeRecovery)
			}
		}
		return nil
	})
}
func (s *Store) Release(ctx context.Context, l data.Lease) error {
	return s.transact(ctx, true, func(d *document) error {
		if e := s.validLease(d, l); e != nil {
			return e
		}
		k := key(l.Target)
		current := d.Leases[k]
		current.Until = time.Time{}
		current.OperationID = ""
		d.Leases[k] = current
		return nil
	})
}
func immutable(old, next data.Operation) bool {
	return old.Target == next.Target && old.Principal == next.Principal && old.Fingerprint == next.Fingerprint && reflect.DeepEqual(old.Input, next.Input) && old.Result.Kind == next.Result.Kind && old.Result.DryRun == next.Result.DryRun
}
func (s *Store) save(d *document, next data.Operation, rev uint64, l *data.Lease) (data.Operation, error) {
	old, ok := d.Operations[next.Result.OperationID]
	if !ok {
		return next, data.Error(data.CodeGone)
	}
	if old.Result.Revision != rev || old.Result.Revision >= 1<<53-1 || old.Result.State.Terminal() || !immutable(old, next) {
		return next, data.Error(data.CodeConflict)
	}
	if err := s.checkSaveLease(d, old, next, l); err != nil {
		return next, err
	}
	if next.Result.State != data.Running && !next.Result.State.Terminal() {
		return next, data.Error(data.CodeInvalid)
	}
	// Intent resolution is the only path to terminal activation/reset.
	if pending := d.Targets[key(old.Target)].Pending; pending != nil && pending.OperationID == old.Result.OperationID {
		return next, data.Error(data.CodeRecovery)
	}
	next.Result.Revision = old.Result.Revision + 1
	next.CancelRequested = old.CancelRequested
	next.CreatedAt = old.CreatedAt
	next.UpdatedAt = s.options.Now()
	d.Operations[next.Result.OperationID] = next
	return next, nil
}
func (s *Store) checkSaveLease(d *document, old, next data.Operation, l *data.Lease) error {
	if l != nil {
		if l.OperationID != old.Result.OperationID || l.Target != old.Target {
			return data.Error(data.CodeLeaseLost)
		}
		if e := s.validLease(d, *l); e != nil {
			return e
		}
	} else if old.Result.Kind.Writes() && !old.Input.DryRun && (old.Result.State != data.Queued || next.Result.State != data.Failed) {
		return data.Error(data.CodeLeaseLost)
	}
	return nil
}

func (s *Store) Save(ctx context.Context, next data.Operation, rev uint64, l *data.Lease) (out data.Operation, err error) {
	err = s.transact(ctx, true, func(d *document) error { var e error; out, e = s.save(d, next, rev, l); return e })
	return
}
func (s *Store) RequestCancel(ctx context.Context, id string, rev uint64) (out data.Operation, err error) {
	err = s.transact(ctx, true, func(d *document) error {
		op, ok := d.Operations[id]
		if !ok {
			return data.Error(data.CodeGone)
		}
		if op.Result.Revision != rev {
			return data.Error(data.CodeConflict)
		}
		if !op.Result.State.Terminal() {
			op.CancelRequested = true
			op.Result.Phase = "cancel_requested"
			op.Result.Revision++
			op.UpdatedAt = s.options.Now()
			d.Operations[id] = op
		}
		out = op
		return nil
	})
	return
}
func (s *Store) PutReceipt(ctx context.Context, l data.Lease, r data.PreparationReceipt) error {
	return s.transact(ctx, true, func(d *document) error {
		if err := s.validLease(d, l); err != nil {
			return err
		}
		op := d.Operations[l.OperationID]
		if op.Target != r.Target || op.StageID != r.StageID || op.Input.Dataset != r.Dataset || op.Input.Scenario != r.Scenario || op.Principal.ActorID != r.RequesterID || r.ID == "" || r.Verification != nil {
			return data.Error(data.CodeConflict)
		}
		if existing, ok := d.Receipts[r.ID]; ok {
			if reflect.DeepEqual(existing, r) {
				return nil
			}
			return data.Error(data.CodeConflict)
		}
		d.Receipts[r.ID] = r
		d.RetainUntil[r.ID] = s.options.Now().Add(s.options.ReceiptRetention)
		return nil
	})
}
func (s *Store) GetReceipt(ctx context.Context, id string) (out data.PreparationReceipt, err error) {
	err = s.transact(ctx, false, func(d *document) error {
		var ok bool
		out, ok = d.Receipts[id]
		if !ok {
			return data.Error(data.CodeGone)
		}
		return nil
	})
	return
}

type receiptCursor struct {
	RetainUntil time.Time `json:"retain_until"`
	ID          string    `json:"id"`
}

func decodeReceiptCursor(query data.ReceiptQuery) (receiptCursor, error) {
	var cursor receiptCursor
	if query.Limit < 1 || query.Limit > 100 || len(query.Cursor) > 2048 {
		return cursor, data.Error(data.CodeInvalid)
	}
	if query.Cursor != "" {
		encoded, err := base64.RawURLEncoding.DecodeString(query.Cursor)
		if err != nil || json.Unmarshal(encoded, &cursor) != nil || cursor.ID == "" || cursor.RetainUntil.IsZero() {
			return cursor, data.Error(data.CodeInvalid)
		}
	}
	return cursor, nil
}

func receiptPageIDs(d *document, target data.TargetKey, cursor receiptCursor) []string {
	ids := []string{}
	for id, receipt := range d.Receipts {
		if receipt.Target != target {
			continue
		}
		until := d.RetainUntil[id]
		if cursor.ID != "" && (until.After(cursor.RetainUntil) || until.Equal(cursor.RetainUntil) && id <= cursor.ID) {
			continue
		}
		ids = append(ids, id)
	}
	// Newest retained work first, with an ID tie-breaker for equal store times.
	slices.SortFunc(ids, func(a, b string) int {
		if compared := d.RetainUntil[b].Compare(d.RetainUntil[a]); compared != 0 {
			return compared
		}
		return strings.Compare(a, b)
	})
	return ids
}

func (s *Store) ListReceipts(ctx context.Context, target data.TargetKey, query data.ReceiptQuery) (out data.ReceiptPage, err error) {
	out.Receipts = []data.PreparationReceipt{}
	cursor, err := decodeReceiptCursor(query)
	if err != nil {
		return out, err
	}
	err = s.transact(ctx, false, func(d *document) error {
		ids := receiptPageIDs(d, target, cursor)
		more := len(ids) > query.Limit
		if more {
			ids = ids[:query.Limit]
		}
		for _, id := range ids {
			out.Receipts = append(out.Receipts, d.Receipts[id])
		}
		if more {
			id := ids[len(ids)-1]
			encoded, encodeErr := json.Marshal(receiptCursor{RetainUntil: d.RetainUntil[id], ID: id})
			if encodeErr != nil {
				return encodeErr
			}
			out.NextCursor = base64.RawURLEncoding.EncodeToString(encoded)
		}
		return nil
	})
	return
}

func (s *Store) GetArtifact(ctx context.Context, provider, id string) (out data.ArtifactRef, err error) {
	err = s.transact(ctx, false, func(d *document) error {
		var ok bool
		out, ok = d.Artifacts[key(artifactKey{provider, id})]
		if !ok {
			return data.Error(data.CodeGone)
		}
		return nil
	})
	return
}

func (s *Store) PutVerification(ctx context.Context, l data.Lease, id string, contentRev uint64, v data.VerificationResult) (out data.PreparationReceipt, err error) {
	err = s.transact(ctx, true, func(d *document) error {
		if e := s.validLease(d, l); e != nil {
			return e
		}
		r, ok := d.Receipts[id]
		op := d.Operations[l.OperationID]
		if !ok || op.Input.ReceiptID != id || op.Target != r.Target || r.ContentRevision != contentRev || v.ContentRevision != contentRev {
			return data.Error(data.CodeConflict)
		}
		for _, artifact := range v.Artifacts {
			if artifact.Provider != r.Dataset.Provider || artifact.Target != r.Target || artifact.RequesterID != r.RequesterID {
				return data.Error(data.CodeConflict)
			}
			artifactID := key(artifactKey{artifact.Provider, artifact.ID})
			if existing, ok := d.Artifacts[artifactID]; ok && !reflect.DeepEqual(existing, artifact) {
				return data.Error(data.CodeConflict)
			}
			d.Artifacts[artifactID] = artifact
			if artifact.ExpiresAt.After(s.options.Now().Add(90 * 24 * time.Hour)) {
				return data.Error(data.CodeInvalid)
			}
			if artifact.ExpiresAt.After(d.RetainUntil[id]) {
				d.RetainUntil[id] = artifact.ExpiresAt
			}
		}
		r.Verification = &v
		d.Receipts[id] = r
		out = r
		return nil
	})
	return
}
func (s *Store) Target(ctx context.Context, target data.TargetKey) (out data.TargetState, err error) {
	err = s.transact(ctx, false, func(d *document) error { out = d.Targets[key(target)]; return nil })
	return
}
func (s *Store) BeginIntent(ctx context.Context, l data.Lease, intent data.Intent, revision uint64) error {
	return s.transact(ctx, true, func(d *document) error {
		if e := s.validLease(d, l); e != nil {
			return e
		}
		op, ok := d.Operations[l.OperationID]
		if !ok || !intentMatchesOperation(op, l, intent, revision) {
			return data.Error(data.CodeConflict)
		}
		state := d.Targets[key(l.Target)]
		if err := validateIntentGeneration(state, op, intent); err != nil {
			return err
		}
		if err := validateIntentReceipt(d.Receipts, intent); err != nil {
			return err
		}
		state.Pending = &intent
		d.Targets[key(l.Target)] = state
		return nil
	})
}
func intentMatchesOperation(op data.Operation, lease data.Lease, intent data.Intent, revision uint64) bool {
	return op.Result.Revision == revision && op.Result.State == data.Running && !op.CancelRequested &&
		intent.OperationID == lease.OperationID && intent.Target == lease.Target &&
		intent.Fence == lease.Fence && intent.ID != "" && op.Result.Kind == intent.Kind
}

func validateIntentGeneration(state data.TargetState, op data.Operation, intent data.Intent) error {
	if state.Pending != nil || state.RecoveryRequired {
		return data.Error(data.CodeRecovery)
	}
	if state.Activation != intent.Prior || op.Input.ExpectedGeneration == nil || *op.Input.ExpectedGeneration != state.Activation.Generation || intent.Next.Generation != state.Activation.Generation+1 {
		return data.Error(data.CodeStale)
	}
	return nil
}

func validateIntentReceipt(receipts map[string]data.PreparationReceipt, intent data.Intent) error {
	if intent.Kind == data.Activate {
		if intent.Receipt == nil || intent.Next.ReceiptID != intent.Receipt.ID || !intent.Next.Ready {
			return data.Error(data.CodeConflict)
		}
		r, ok := receipts[intent.Receipt.ID]
		if !ok || !reflect.DeepEqual(r, *intent.Receipt) || r.Verification == nil || !r.Verification.Passed() || r.Verification.ContentRevision != r.ContentRevision {
			return data.Error(data.CodeConflict)
		}
	} else if intent.Kind != data.Reset || intent.Next.ReceiptID != "" || intent.Next.Ready {
		return data.Error(data.CodeInvalid)
	}
	return nil
}

func (s *Store) ResolveIntent(ctx context.Context, l data.Lease, intent data.Intent, observation data.Observation, next data.Operation, rev uint64) (out data.Operation, err error) {
	err = s.transact(ctx, true, func(d *document) error {
		if e := s.validLease(d, l); e != nil {
			return e
		}
		state := d.Targets[key(l.Target)]
		old, ok := d.Operations[l.OperationID]
		if !ok || l.Target != intent.Target || l.OperationID != intent.OperationID || old.Result.Revision != rev || !immutable(old, next) || !reflect.DeepEqual(state.Pending, &intent) {
			return data.Error(data.CodeConflict)
		}
		var stateErr error
		state, stateErr = resolvedTargetState(state, intent, observation, next)
		if stateErr != nil {
			return stateErr
		}
		next.Result.Revision = old.Result.Revision + 1
		next.CancelRequested = old.CancelRequested
		next.CreatedAt = old.CreatedAt
		next.UpdatedAt = s.options.Now()
		d.Operations[l.OperationID] = next
		d.Targets[key(l.Target)] = state
		out = next
		return nil
	})
	return
}

func resolvedTargetState(state data.TargetState, intent data.Intent, observation data.Observation, next data.Operation) (data.TargetState, error) {
	switch observation.AuthoritativeRouting() {
	case data.RoutingNext:
		if next.Result.State != data.Succeeded || next.Result.Activation == nil || *next.Result.Activation != intent.Next {
			return state, data.Error(data.CodeInvalid)
		}
		state.Activation = intent.Next
		state.Pending = nil
		state.RecoveryRequired = false
	case data.RoutingPrior:
		if !next.Result.State.Terminal() || next.Result.State == data.Succeeded {
			return state, data.Error(data.CodeInvalid)
		}
		state.Pending = nil
		state.RecoveryRequired = false
	case data.RoutingUnknown:
		if next.Result.State != data.Running || next.Result.Phase != "recovering" {
			return state, data.Error(data.CodeInvalid)
		}
		state.RecoveryRequired = true
	default:
		return state, data.Error(data.CodeInvalid)
	}
	return state, nil
}

// Prune protects active/pending/rollback receipts and nonterminal operations. It
// never deletes target generations or fence counters. Expired operation claims
// retain tombstones through RetryWindow, preventing a duplicate effect on retry.
func (s *Store) Prune(ctx context.Context) error {
	return s.transact(ctx, true, func(d *document) error {
		now := s.options.Now()
		for id, artifact := range d.Artifacts {
			if !now.Before(artifact.ExpiresAt) {
				delete(d.Artifacts, id)
			}
		}
		protected, protectedOps := protectedRecords(d)
		for id, r := range d.Receipts {
			if protected[id] || now.Before(d.RetainUntil[id]) {
				protected[id] = true
				continue
			}
			delete(d.Receipts, id)
			delete(d.RetainUntil, id)
			_ = r
		}
		for id, op := range d.Operations {
			if protectedOps[id] || op.Result.Receipt != nil && protected[op.Result.Receipt.ID] {
				continue
			}
			if now.After(op.UpdatedAt.Add(s.options.ReceiptRetention)) {
				delete(d.Operations, id)
			}
		}
		for id, c := range d.Claims {
			if now.After(c.ExpiresAt) {
				if _, ok := d.Operations[c.OperationID]; !ok {
					delete(d.Claims, id)
				}
			}
		}
		return nil
	})
}

func protectedRecords(d *document) (map[string]bool, map[string]bool) {
	protected := map[string]bool{}
	protectedOps := map[string]bool{}
	for _, state := range d.Targets {
		if state.Activation.ReceiptID != "" {
			protected[state.Activation.ReceiptID] = true
		}
		if state.Pending != nil {
			protectedOps[state.Pending.OperationID] = true
			protected[state.Pending.Prior.ReceiptID] = true
			protected[state.Pending.Next.ReceiptID] = true
		}
	}
	for id, op := range d.Operations {
		if !op.Result.State.Terminal() {
			protectedOps[id] = true
			if op.Result.Receipt != nil {
				protected[op.Result.Receipt.ID] = true
			}
		}
	}
	return protected, protectedOps
}
