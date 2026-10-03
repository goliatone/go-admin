// Package datamodule is the kitchen sink's synthetic dataset provider and
// managed target. It owns only data_example_* tables in a dedicated SQLite file.
// The generic lifecycle service owns operations, receipts and generations.
package datamodule

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/url"
	"path/filepath"
	"reflect"
	"strconv"
	"sync"
	"time"

	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/data/examples/sqlitestore"
)

const TargetID = "kitchen-sink"

type Record struct {
	ID       string `json:"id"`
	Amount   int    `json:"amount"`
	LocalDay string `json:"local_day"`
}

// Runtime is both the provider and target adapter. SQLite immediate transactions
// serialize physical effects with the management store's lease acquisition in
// the same database. CheckLease runs after taking that write lock, so a newer
// management fence cannot commit between checking authority and writing rows.
type Runtime struct {
	explorationSecret [32]byte
	db                *sql.DB
	Store             *sqlitestore.Store
	descriptor        data.Descriptor
	fixtures          map[string][]Record
	cleanupCancel     context.CancelFunc
	cleanupDone       chan struct{}
	closeOnce         sync.Once
	closeErr          error
}

func Hash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func Open(filename string) (*Runtime, error) {
	return OpenWithOptions(filename, RuntimeOptions{})
}

func OpenWithOptions(filename string, options RuntimeOptions) (*Runtime, error) {
	if err := options.normalize(); err != nil {
		return nil, err
	}
	filename, err := filepath.Abs(filename)
	if err != nil {
		return nil, err
	}
	store, err := sqlitestore.Open(filename, options.Store)
	if err != nil {
		return nil, err
	}
	query := url.Values{}
	for _, pragma := range []string{"journal_mode(WAL)", "synchronous(FULL)", "busy_timeout(5000)"} {
		query.Add("_pragma", pragma)
	}
	db, err := sql.Open("sqlite", (&url.URL{Scheme: "file", Path: filename, RawQuery: query.Encode()}).String())
	if err != nil {
		return nil, errors.Join(err, store.Close())
	}
	db.SetMaxOpenConns(4)
	r := &Runtime{db: db, Store: store, fixtures: map[string][]Record{
		"ready": {{ID: "order-1", Amount: 120, LocalDay: "2026-01-01"}, {ID: "order-2", Amount: 80, LocalDay: "2026-01-01"}, {ID: "order-3", Amount: 50, LocalDay: "2026-01-01"}},
		"quiet": {},
	}}
	if _, err = rand.Read(r.explorationSecret[:]); err != nil {
		return nil, errors.Join(err, r.Close())
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	for _, statement := range []string{
		`CREATE TABLE IF NOT EXISTS data_example_catalog (dataset TEXT NOT NULL, version TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(dataset,version))`,
		`CREATE TABLE IF NOT EXISTS data_example_stages (id TEXT PRIMARY KEY, scope TEXT NOT NULL, target TEXT NOT NULL, operation TEXT NOT NULL, receipt TEXT)`,
		`CREATE TABLE IF NOT EXISTS data_example_records (stage TEXT NOT NULL, id TEXT NOT NULL, amount INTEGER NOT NULL, local_day TEXT NOT NULL, PRIMARY KEY(stage,id))`,
		`CREATE TABLE IF NOT EXISTS data_example_routes (scope TEXT NOT NULL, target TEXT NOT NULL, stage TEXT NOT NULL, intent TEXT NOT NULL, fence INTEGER NOT NULL, PRIMARY KEY(scope,target))`,
	} {
		if _, err = db.ExecContext(ctx, statement); err != nil {
			return nil, errors.Join(err, r.Close())
		}
	}
	if err = r.buildDescriptor(); err != nil {
		return nil, errors.Join(err, r.Close())
	}
	ref := r.descriptor.Dataset
	if _, err = db.ExecContext(ctx, `INSERT OR IGNORE INTO data_example_catalog(dataset,version,digest) VALUES(?,?,?)`, ref.ID, ref.Version, ref.Digest); err != nil {
		return nil, errors.Join(err, r.Close())
	}
	var registeredDigest string
	if err = db.QueryRowContext(ctx, `SELECT digest FROM data_example_catalog WHERE dataset=? AND version=?`, ref.ID, ref.Version).Scan(&registeredDigest); err != nil {
		return nil, errors.Join(err, r.Close())
	}
	if registeredDigest != ref.Digest {
		return nil, errors.Join(data.Error(data.CodeConflict), r.Close())
	}
	if err = r.PrunePreviews(ctx, data.PreviewMaxPrune); err != nil {
		return nil, errors.Join(err, r.Close())
	}
	r.startPreviewCleanup(options.PreviewCleanupInterval)
	return r, nil
}

func (r *Runtime) Close() error {
	r.closeOnce.Do(func() {
		if r.cleanupCancel != nil {
			r.cleanupCancel()
			<-r.cleanupDone
		}
		r.closeErr = errors.Join(r.db.Close(), r.Store.Close())
	})
	return r.closeErr
}

func (r *Runtime) buildDescriptor() error {
	payload, err := json.Marshal(r.fixtures)
	if err != nil {
		return err
	}
	d := data.Descriptor{
		Dataset:            data.DatasetRef{Provider: "kitchen-sink", ID: "synthetic-orders", Version: "1"},
		Components:         []data.Component{{Path: "orders.json", Digest: Hash(string(payload))}},
		SourceContractHash: Hash("synthetic-orders-v1"), SourceContractVersion: "1", PolicyHash: Hash("isolated-synthetic-orders-v1"),
		Synthetic: true, Attribution: []string{"Kitchen sink synthetic fixture; no production policy approval"}, Timezone: "UTC",
		Samples: []data.SamplePeriod{{LocalDay: "2026-01-01", Timezone: "UTC", EvidenceRef: "synthetic-orders-v1"}},
		Counts:  map[string]uint64{"orders": 3}, Prerequisites: []string{"isolated SQLite target"},
		Capabilities: map[data.Kind]data.Capability{},
	}
	for _, kind := range []data.Kind{data.Validate, data.Prepare, data.Refresh, data.Verify, data.Activate} {
		d.Capabilities[kind] = data.Capability{Supported: true}
	}
	for _, kind := range []data.Kind{data.Reset, data.Generate, data.Cancel} {
		d.Capabilities[kind] = data.Capability{Reason: "not implemented by this bounded demo"}
	}
	for _, scenario := range []string{"ready", "quiet"} {
		d.Scenarios = append(d.Scenarios, data.ScenarioRef{Dataset: d.Dataset, ID: scenario, Version: "1", ProfileHash: Hash("orders-" + scenario + "-v1")})
	}
	d.Dataset.Digest, err = d.CompositeDigest()
	if err != nil {
		return err
	}
	for i := range d.Scenarios {
		d.Scenarios[i].Dataset = d.Dataset
	}
	r.descriptor = d
	return d.ValidateIdentity()
}

func (r *Runtime) Catalog(_ context.Context, _ data.Principal, target data.TargetKey, limit int) ([]data.DatasetRef, error) {
	if target.TargetID != TargetID || limit < 1 {
		return nil, data.Error(data.CodeDenied)
	}
	return []data.DatasetRef{r.descriptor.Dataset}, nil
}

func (r *Runtime) Describe(_ context.Context, _ data.Principal, ref data.DatasetRef) (data.Descriptor, error) {
	if ref != r.descriptor.Dataset {
		return data.Descriptor{}, data.Error(data.CodeGone)
	}
	// Detach slices/maps: the service projects capabilities for the current actor.
	encoded, err := json.Marshal(r.descriptor)
	if err != nil {
		return data.Descriptor{}, err
	}
	var descriptor data.Descriptor
	err = json.Unmarshal(encoded, &descriptor)
	return descriptor, err
}

func (r *Runtime) Validate(ctx context.Context, _ data.Principal, input data.Input) ([]data.Check, error) {
	if input.TargetID != TargetID || input.Dataset != r.descriptor.Dataset {
		return nil, data.Error(data.CodeInvalid)
	}
	valid := false
	for _, scenario := range r.descriptor.Scenarios {
		valid = valid || input.Scenario == scenario
	}
	if !valid {
		return nil, data.Error(data.CodeInvalid)
	}
	if err := r.db.PingContext(ctx); err != nil {
		return []data.Check{{ID: "sqlite", Status: data.CheckUnavailable, Expected: "available", Actual: "unavailable"}}, data.Error(data.CodeUnavailable)
	}
	return []data.Check{{ID: "source-identity", Status: data.CheckPassed, Expected: input.Dataset.Digest, Actual: r.descriptor.Dataset.Digest}, {ID: "sqlite", Status: data.CheckPassed, Expected: "available", Actual: "available"}}, nil
}

func (r *Runtime) Plan(ctx context.Context, p data.Principal, kind data.Kind, input data.Input) ([]data.Check, error) {
	if _, err := r.Validate(ctx, p, input); err != nil {
		return nil, err
	}
	return []data.Check{{ID: string(kind) + "-plan", Status: data.CheckPlanned, Expected: strconv.Itoa(len(r.fixtures[input.Scenario.ID])) + " synthetic orders", Actual: "no target effects"}}, nil
}

func (*Runtime) Capabilities() data.TargetCapabilities {
	return data.TargetCapabilities{Recovery: true, Fencing: true}
}

func (r *Runtime) effect(ctx context.Context, work data.Work, apply func(*sql.Conn) error) (err error) {
	if err = data.RejectPreviewEffects(ctx); err != nil {
		return err
	}
	if work.OperationID != work.Lease.OperationID || work.Lease.Target.ScopeKey != work.Principal.ScopeKey || work.Lease.Target.TargetID != work.Input.TargetID || work.Input.TargetID != TargetID {
		return data.Error(data.CodeDenied)
	}
	if err = work.BeforeEffects(ctx); err != nil {
		return err
	}
	conn, err := r.db.Conn(ctx)
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, conn.Close()) }()
	if _, err = conn.ExecContext(ctx, "BEGIN IMMEDIATE"); err != nil {
		return err
	}
	defer func() {
		_, rollbackErr := conn.ExecContext(context.WithoutCancel(ctx), "ROLLBACK")
		if rollbackErr != nil && err != nil {
			err = errors.Join(err, rollbackErr)
		}
	}()
	if err = r.Store.CheckLease(ctx, work.Lease); err != nil {
		return err
	}
	if err = apply(conn); err != nil {
		return err
	}
	_, err = conn.ExecContext(ctx, "COMMIT")
	return err
}

func (r *Runtime) Allocate(ctx context.Context, work data.Work) error {
	return r.effect(ctx, work, func(conn *sql.Conn) error {
		_, err := conn.ExecContext(ctx, `INSERT OR IGNORE INTO data_example_stages(id,scope,target,operation) VALUES(?,?,?,?)`, work.StageID, work.Principal.ScopeKey, work.Input.TargetID, work.OperationID)
		if err != nil {
			return err
		}
		var scope, target, operation string
		if err = conn.QueryRowContext(ctx, `SELECT scope,target,operation FROM data_example_stages WHERE id=?`, work.StageID).Scan(&scope, &target, &operation); err != nil {
			return err
		}
		if scope != work.Principal.ScopeKey || target != work.Input.TargetID || operation != work.OperationID {
			return data.Error(data.CodeConflict)
		}
		return nil
	})
}

func (r *Runtime) Prepare(ctx context.Context, work data.Work) (data.PreparationReceipt, error) {
	if _, err := r.Validate(ctx, work.Principal, work.Input); err != nil {
		return data.PreparationReceipt{}, err
	}
	rows := r.fixtures[work.Input.Scenario.ID]
	payload, err := json.Marshal(rows)
	if err != nil {
		return data.PreparationReceipt{}, err
	}
	receipt := data.PreparationReceipt{
		ID: "receipt-" + work.StageID, Target: work.Lease.Target, StageID: work.StageID, Dataset: work.Input.Dataset, Scenario: work.Input.Scenario,
		ModuleHash: work.Principal.ModuleHash, PolicyHash: work.Principal.PolicyHash, PermissionHash: work.Principal.PermissionHash,
		ContentRevision: 1, SourceCheckpoint: work.Input.Dataset.Digest, DerivedCheckpoint: Hash(string(payload)), RequesterID: work.Principal.ActorID,
	}
	encoded, err := json.Marshal(receipt)
	if err != nil {
		return data.PreparationReceipt{}, err
	}
	err = r.effect(ctx, work, func(conn *sql.Conn) error {
		var prior sql.NullString
		if e := conn.QueryRowContext(ctx, `SELECT receipt FROM data_example_stages WHERE id=? AND scope=? AND target=? AND operation=?`, work.StageID, work.Lease.Target.ScopeKey, work.Lease.Target.TargetID, work.OperationID).Scan(&prior); e != nil {
			return e
		}
		if prior.Valid {
			if prior.String != string(encoded) {
				return data.Error(data.CodeConflict)
			}
			return nil
		}
		for _, row := range rows {
			if _, e := conn.ExecContext(ctx, `INSERT INTO data_example_records(stage,id,amount,local_day) VALUES(?,?,?,?)`, work.StageID, row.ID, row.Amount, row.LocalDay); e != nil {
				return e
			}
		}
		_, e := conn.ExecContext(ctx, `UPDATE data_example_stages SET receipt=? WHERE id=?`, string(encoded), work.StageID)
		return e
	})
	if err != nil {
		return data.PreparationReceipt{}, err
	}
	if err = work.Progress(ctx, data.Progress{Stage: "synthetic-orders", Completed: uint64(len(rows)), Total: uint64(len(rows))}); err != nil {
		return data.PreparationReceipt{}, err
	}
	return receipt, nil
}

func (r *Runtime) Refresh(ctx context.Context, work data.Work) (data.PreparationReceipt, error) {
	return r.Prepare(ctx, work)
}

func queryRecords(ctx context.Context, db interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}, stage string) ([]Record, error) {
	result, err := db.QueryContext(ctx, `SELECT id,amount,local_day FROM data_example_records WHERE stage=? ORDER BY id LIMIT 101`, stage)
	if err != nil {
		return nil, err
	}
	defer result.Close()
	rows := []Record{}
	for result.Next() {
		var row Record
		if err = result.Scan(&row.ID, &row.Amount, &row.LocalDay); err != nil {
			return nil, err
		}
		rows = append(rows, row)
	}
	return rows, result.Err()
}

func (r *Runtime) InspectReceipt(ctx context.Context, receipt data.PreparationReceipt) error {
	return inspectReceipt(ctx, r.db, receipt)
}

func inspectReceipt(ctx context.Context, db interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}, receipt data.PreparationReceipt) error {
	var encoded string
	if err := db.QueryRowContext(ctx, `SELECT receipt FROM data_example_stages WHERE id=? AND scope=? AND target=?`, receipt.StageID, receipt.Target.ScopeKey, receipt.Target.TargetID).Scan(&encoded); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return data.Error(data.CodeGone)
		}
		return err
	}
	var stored data.PreparationReceipt
	if err := json.Unmarshal([]byte(encoded), &stored); err != nil {
		return err
	}
	receipt.Verification = nil
	if !reflect.DeepEqual(stored, receipt) {
		return data.Error(data.CodeConflict)
	}
	rows, err := queryRecords(ctx, db, receipt.StageID)
	if err != nil {
		return err
	}
	payload, err := json.Marshal(rows)
	if err != nil {
		return err
	}
	if Hash(string(payload)) != receipt.DerivedCheckpoint {
		return data.Error(data.CodeConflict)
	}
	return nil
}

func (r *Runtime) Verify(ctx context.Context, work data.Work, receipt data.PreparationReceipt) (data.VerificationResult, error) {
	if err := work.BeforeEffects(ctx); err != nil {
		return data.VerificationResult{}, err
	}
	if err := r.InspectReceipt(ctx, receipt); err != nil {
		return data.VerificationResult{}, err
	}
	var count, total, sampleCount int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*),COALESCE(SUM(amount),0),COALESCE(SUM(CASE WHEN local_day='2026-01-01' THEN 1 ELSE 0 END),0) FROM data_example_records WHERE stage=?`, receipt.StageID).Scan(&count, &total, &sampleCount); err != nil {
		return data.VerificationResult{}, err
	}
	expectedTotal := 0
	for _, row := range r.fixtures[receipt.Scenario.ID] {
		expectedTotal += row.Amount
	}
	check := func(id string, expected, actual int) data.Check {
		status := data.CheckPassed
		if expected != actual {
			status = data.CheckFailed
		}
		return data.Check{ID: id, Status: status, Expected: strconv.Itoa(expected), Actual: strconv.Itoa(actual), EvidenceRef: "sqlite-stage-query"}
	}
	coverage := "covered"
	if sampleCount == 0 {
		coverage = "covered_empty"
	}
	return data.VerificationResult{ID: "verification-" + work.OperationID, ContentRevision: receipt.ContentRevision,
		Checks:   []data.Check{check("order-count", len(r.fixtures[receipt.Scenario.ID]), count), check("order-total", expectedTotal, total), check("sample-count", count, sampleCount)},
		Coverage: []data.Coverage{{Status: coverage, Sample: data.SamplePeriod{LocalDay: "2026-01-01", Timezone: "UTC", EvidenceRef: "sqlite-stage-query"}}}}, nil
}

func (r *Runtime) Commit(ctx context.Context, work data.Work, intent data.Intent) error {
	if intent.Kind != data.Activate || intent.Receipt == nil || intent.OperationID != work.OperationID || intent.Target != work.Lease.Target || intent.Fence != work.Lease.Fence {
		return data.Error(data.CodeInvalid)
	}
	return r.effect(ctx, work, func(conn *sql.Conn) error {
		if err := inspectReceipt(ctx, conn, *intent.Receipt); err != nil {
			return err
		}
		var stage, previousIntent string
		var fence uint64
		err := conn.QueryRowContext(ctx, `SELECT stage,intent,fence FROM data_example_routes WHERE scope=? AND target=?`, intent.Target.ScopeKey, intent.Target.TargetID).Scan(&stage, &previousIntent, &fence)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if fence > work.Lease.Fence {
			return data.Error(data.CodeLeaseLost)
		}
		if previousIntent == intent.ID {
			if stage != intent.Receipt.StageID {
				return data.Error(data.CodeConflict)
			}
			return nil
		}
		_, err = conn.ExecContext(ctx, `INSERT INTO data_example_routes(scope,target,stage,intent,fence) VALUES(?,?,?,?,?) ON CONFLICT(scope,target) DO UPDATE SET stage=excluded.stage,intent=excluded.intent,fence=excluded.fence`, intent.Target.ScopeKey, intent.Target.TargetID, intent.Receipt.StageID, intent.ID, work.Lease.Fence)
		return err
	})
}

func (r *Runtime) InspectIntent(ctx context.Context, intent data.Intent) (data.Observation, error) {
	var stage, committed string
	err := r.db.QueryRowContext(ctx, `SELECT stage,intent FROM data_example_routes WHERE scope=? AND target=?`, intent.Target.ScopeKey, intent.Target.TargetID).Scan(&stage, &committed)
	if errors.Is(err, sql.ErrNoRows) && intent.Prior.ReceiptID == "" {
		return data.Observation{Routing: data.RoutingPrior, Ready: true}, nil
	}
	if err != nil {
		return data.Observation{Routing: data.RoutingUnknown}, err
	}
	if committed == intent.ID && intent.Receipt != nil && stage == intent.Receipt.StageID {
		return data.Observation{Routing: data.RoutingNext, Ready: r.InspectReceipt(ctx, *intent.Receipt) == nil}, nil
	}
	prior, err := r.Store.GetReceipt(ctx, intent.Prior.ReceiptID)
	if err == nil && stage == prior.StageID {
		return data.Observation{Routing: data.RoutingPrior, Ready: r.InspectReceipt(ctx, prior) == nil}, nil
	}
	return data.Observation{Routing: data.RoutingUnknown}, nil
}

func (r *Runtime) DrainCleanup(ctx context.Context, work data.Work, stage string) error {
	return r.effect(ctx, work, func(conn *sql.Conn) error {
		if err := r.Store.CheckCleanup(ctx, work.Lease, stage); err != nil {
			return err
		}
		var active int
		if err := conn.QueryRowContext(ctx, `SELECT COUNT(*) FROM data_example_routes WHERE stage=?`, stage).Scan(&active); err != nil {
			return err
		}
		if active != 0 {
			return data.Error(data.CodeConflict)
		}
		var operation string
		if err := conn.QueryRowContext(ctx, `SELECT operation FROM data_example_stages WHERE id=? AND scope=? AND target=?`, stage, work.Lease.Target.ScopeKey, work.Lease.Target.TargetID).Scan(&operation); errors.Is(err, sql.ErrNoRows) {
			return nil
		} else if err != nil {
			return err
		}
		if operation != work.OperationID {
			return data.Error(data.CodeDenied)
		}
		if _, err := conn.ExecContext(ctx, `DELETE FROM data_example_records WHERE stage=?`, stage); err != nil {
			return err
		}
		_, err := conn.ExecContext(ctx, `DELETE FROM data_example_stages WHERE id=?`, stage)
		return err
	})
}

// ActiveRecords is an application read of the physical route, useful to prove
// a scenario switch changes the query result rather than only the console label.
func (r *Runtime) ActiveRecords(ctx context.Context, target data.TargetKey) ([]Record, error) {
	if err := data.RejectPreviewEffects(ctx); err != nil {
		return nil, err
	}
	var stage string
	err := r.db.QueryRowContext(ctx, `SELECT stage FROM data_example_routes WHERE scope=? AND target=?`, target.ScopeKey, target.TargetID).Scan(&stage)
	if errors.Is(err, sql.ErrNoRows) {
		return []Record{}, nil
	}
	if err != nil {
		return nil, err
	}
	return queryRecords(ctx, r.db, stage)
}
