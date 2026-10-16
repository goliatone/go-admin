package quickstart

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
	"time"

	delivery "github.com/goliatone/go-export/adapters/delivery"
	deliverybun "github.com/goliatone/go-export/adapters/delivery/bun"
	"github.com/goliatone/go-export/export"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

// This coordinator is reference verification tooling. The test has no concurrent
// writers; a manifest or boolean cannot establish a distributed production fence.
type adoptionRecoverySet struct {
	Version                                 int
	ID, Dialect, HostSchema, ReceiverSchema string
	Files, HostState, ReceiverState         map[string]string
}

func adoptionRecoveryHash(b []byte) string { s := sha256.Sum256(b); return hex.EncodeToString(s[:]) }
func adoptionRecoveryMust(t *testing.T, e error) {
	t.Helper()
	if e != nil {
		t.Fatal(e)
	}
}
func adoptionRecoveryClose(t *testing.T, closer io.Closer) {
	t.Helper()
	if err := closer.Close(); err != nil {
		t.Error(err)
	}
}
func adoptionRecoveryExec(t *testing.T, db interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}, query string, args ...any) {
	t.Helper()
	_, err := db.ExecContext(context.Background(), query, args...)
	adoptionRecoveryMust(t, err)
}
func adoptionRecoveryJSON(t *testing.T, value any) []byte {
	t.Helper()
	encoded, err := json.Marshal(value)
	adoptionRecoveryMust(t, err)
	return encoded
}
func adoptionRecoveryFile(path string) (string, error) {
	b, e := os.ReadFile(path)
	return adoptionRecoveryHash(b), e
}
func adoptionRecoverySchema(t *testing.T, db *bun.DB) string {
	t.Helper()
	if db.Dialect().Name() != dialect.PG {
		return "main"
	}
	var s string
	adoptionRecoveryMust(t, db.QueryRow("SELECT current_schema()").Scan(&s))
	return s
}
func adoptionRecoveryState(db *bun.DB) (map[string]string, error) {
	tables, err := adoptionRecoveryTables(db)
	if err != nil {
		return nil, err
	}
	out := map[string]string{}
	for _, table := range tables {
		digest, tableErr := adoptionRecoveryTable(db, table)
		if tableErr != nil {
			return nil, tableErr
		}
		out[table] = digest
	}
	return out, nil
}

func adoptionRecoveryTables(db *bun.DB) (tables []string, err error) {
	query := `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
	if db.Dialect().Name() == dialect.PG {
		query = `SELECT tablename FROM pg_tables WHERE schemaname=current_schema() ORDER BY tablename`
	}
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer func() { err = errors.Join(err, rows.Close()) }()
	for rows.Next() {
		var name string
		if err = rows.Scan(&name); err != nil {
			return nil, err
		}
		tables = append(tables, name)
	}
	return tables, rows.Err()
}

func adoptionRecoveryTable(db *bun.DB, table string) (digest string, err error) {
	if strings.ContainsAny(table, `";`) {
		return "", errors.New("unsafe SQL identifier")
	}
	rows, err := db.Query(`SELECT * FROM "` + table + `"`)
	if err != nil {
		return "", err
	}
	defer func() { err = errors.Join(err, rows.Close()) }()
	columns, err := rows.Columns()
	if err != nil {
		return "", err
	}
	values := []string{}
	for rows.Next() {
		value := make([]any, len(columns))
		pointers := make([]any, len(columns))
		for i := range value {
			pointers[i] = &value[i]
		}
		if err = rows.Scan(pointers...); err != nil {
			return "", err
		}
		encoded, marshalErr := json.Marshal(value)
		if marshalErr != nil {
			return "", marshalErr
		}
		values = append(values, string(encoded))
	}
	if err = rows.Err(); err != nil {
		return "", err
	}
	sort.Strings(values)
	encoded, err := json.Marshal(struct{ Columns, Rows []string }{columns, values})
	if err != nil {
		return "", err
	}
	return adoptionRecoveryHash(encoded), nil
}

func adoptionRecoveryDump(t *testing.T, db *bun.DB, path string) error {
	t.Helper()
	if db.Dialect().Name() != dialect.PG {
		_, e := db.Exec("VACUUM INTO ?", path)
		return e
	}
	container := os.Getenv("INT16_PG_CONTAINER")
	if container == "" || os.Getenv("INT15_POSTGRES_DISPOSABLE") != "1" {
		return errors.New("owned disposable PostgreSQL required")
	}
	u, e := url.Parse(os.Getenv("INT15_POSTGRES_DSN"))
	if e != nil {
		return e
	}
	b, e := exec.CommandContext(t.Context(), "docker", "exec", container, "pg_dump", "-U", u.User.Username(), "--no-owner", "--no-acl", "--schema="+adoptionRecoverySchema(t, db), strings.TrimPrefix(u.Path, "/")).Output()
	if e != nil {
		return e
	}
	return os.WriteFile(path, b, 0600)
}
func adoptionRecoveryOpen(t *testing.T, path, schema string, pg bool) *bun.DB {
	t.Helper()
	if !pg {
		b, e := os.ReadFile(path)
		adoptionRecoveryMust(t, e)
		restored := filepath.Join(t.TempDir(), "restored.sqlite")
		adoptionRecoveryMust(t, os.WriteFile(restored, b, 0600))
		raw, e := sql.Open(sqliteshim.ShimName, "file:"+restored+"?_fk=1")
		adoptionRecoveryMust(t, e)
		raw.SetMaxOpenConns(1)
		db := bun.NewDB(raw, sqlitedialect.New())
		t.Cleanup(func() { adoptionRecoveryClose(t, db) })
		return db
	}
	if os.Getenv("INT15_POSTGRES_DISPOSABLE") != "1" {
		t.Fatal("disposable database required")
	}
	// Restore unchanged schema-qualified dumps into unused databases, never an
	// existing host or a renamed-text approximation of a PostgreSQL backup.
	u, e := url.Parse(os.Getenv("INT15_POSTGRES_DSN"))
	adoptionRecoveryMust(t, e)
	admin, e := sql.Open("postgres", u.String())
	adoptionRecoveryMust(t, e)
	admin.SetMaxOpenConns(1)
	name := "int16_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	_, e = admin.ExecContext(context.Background(), "CREATE DATABASE "+name)
	adoptionRecoveryMust(t, e)
	u.Path = "/" + name
	raw, e := sql.Open("postgres", u.String())
	adoptionRecoveryMust(t, e)
	raw.SetMaxOpenConns(1)
	db := bun.NewDB(raw, pgdialect.New())
	t.Cleanup(func() {
		adoptionRecoveryClose(t, db)
		_, dropErr := admin.ExecContext(context.Background(), "DROP DATABASE "+name)
		if dropErr != nil {
			t.Error(dropErr)
		}
		adoptionRecoveryClose(t, admin)
	})
	b, e := os.ReadFile(path)
	adoptionRecoveryMust(t, e)
	cmd := exec.CommandContext(t.Context(), "docker", "exec", "-i", os.Getenv("INT16_PG_CONTAINER"), "psql", "-X", "-U", u.User.Username(), "--set", "ON_ERROR_STOP=1", "--single-transaction", "--dbname", name)
	cmd.Stdin = strings.NewReader(string(b))
	out, e := cmd.CombinedOutput()
	if e != nil {
		t.Fatalf("restore: %v: %s", e, out)
	}
	_, e = db.Exec("SET search_path TO " + schema)
	adoptionRecoveryMust(t, e)
	return db
}
func adoptionRecoveryReceiver(t *testing.T, pg bool) *bun.DB {
	t.Helper()
	if !pg {
		return newScopeDriftDoctorBunDB(t)
	}
	raw, e := sql.Open("postgres", os.Getenv("INT15_POSTGRES_DSN"))
	adoptionRecoveryMust(t, e)
	raw.SetMaxOpenConns(1)
	schema := "int16_receiver_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	_, e = raw.ExecContext(context.Background(), "CREATE SCHEMA "+schema)
	adoptionRecoveryMust(t, e)
	_, e = raw.ExecContext(context.Background(), "SET search_path TO "+schema)
	adoptionRecoveryMust(t, e)
	db := bun.NewDB(raw, pgdialect.New())
	t.Cleanup(func() {
		defer adoptionRecoveryClose(t, db)
		adoptionRecoveryExec(t, db, "DROP SCHEMA "+schema+" CASCADE")
	})
	return db
}

type adoptionRecoverySender struct {
	db           *bun.DB
	loseResponse bool
	attempts     int
}

func (s *adoptionRecoverySender) SendReceipt(ctx context.Context, d delivery.WebhookDelivery) error {
	s.attempts++
	if delivery.PayloadDigest(d.Body) != d.SHA256 {
		return errors.New("receiver body digest mismatch")
	}
	e := (&deliverybun.Receiver{DB: s.db}).Receive(ctx, "trusted-sender", d.ID, d.SHA256, d.Body, func(ctx context.Context, tx bun.Tx, body json.RawMessage) error {
		// A repeated Apply is an error: native inbox replay must skip the effect.
		_, e := tx.ExecContext(ctx, "INSERT INTO receiver_effects(id,value) VALUES (?,?)", d.ID, string(body))
		return e
	})
	if e != nil {
		return e
	}
	if s.loseResponse {
		return errors.New("injected response loss after receiver commit")
	}
	return nil
}
func adoptionRecoveryNewSender(t *testing.T, pg bool) *adoptionRecoverySender {
	db := adoptionRecoveryReceiver(t, pg)
	adoptionRecoveryMust(t, deliverybun.MigrateReceiver(context.Background(), db))
	for _, q := range []string{"CREATE TABLE receiver_effects(id TEXT PRIMARY KEY,value TEXT NOT NULL)"} {
		_, e := db.Exec(q)
		adoptionRecoveryMust(t, e)
	}
	return &adoptionRecoverySender{db: db}
}

// The reference host owns these policy/delegation tables. Validate retained
// acceptance closure before capture; hashing an already-pruned database is unsafe.
func adoptionRecoveryRetained(f *legacyFixture, s *adoptionRecoverySender, review LegacyExportAdoptionRequest) error {
	ctx := context.Background()
	var row legacyExportReceipt
	if e := f.db.NewSelect().Model(&row).Where("export_id=?", review.ExportID).Scan(ctx); e != nil {
		return e
	}
	if row.ExportID != review.ExportID || row.ProfileRef != review.ProfileRef || row.RecordSHA256 != review.RecordSHA256 || row.PlanSHA256 != review.PlanSHA256 || row.ActorID != f.actor.ID || row.Namespace != "Group A" || row.TenantID != f.actor.Scope.TenantID || row.WorkspaceID != f.actor.Scope.WorkspaceID || row.AdoptedAt.IsZero() {
		return errors.New("retained adoption identity mismatch")
	}
	var owner durableExportOwner
	if e := f.db.NewSelect().Model(&owner).Where("export_id=?", row.ExportID).Scan(ctx); e != nil {
		return e
	}
	if owner.ActorID != row.ActorID || owner.Namespace != row.Namespace || owner.TenantID != row.TenantID || owner.WorkspaceID != row.WorkspaceID {
		return errors.New("retained owner mismatch")
	}
	var actor string
	if e := f.db.NewSelect().Table("legacy_test_delegations").Column("actor_id").Where("id=?", row.ExportID).Scan(ctx, &actor); e != nil {
		return e
	}
	if actor != row.ActorID {
		return errors.New("retained delegation missing")
	}
	rec, e := f.h.Tracker.Status(ctx, row.ExportID)
	if e != nil {
		return e
	}
	if rec.State == export.StateCompleted {
		if e = f.h.legacyArtifact(ctx, rec); e != nil {
			return e
		}
	}
	switch row.State {
	case export.StateQueued:
		var body string
		if e = f.db.NewSelect().Table("export_webhook_completion_plans").Column("request").Where("export_id=?", row.ExportID).Scan(ctx, &body); e != nil {
			return e
		}
		digest, digestErr := legacyProfileDigest(row.ProfileRef, delivery.PayloadDigest([]byte(body)))
		if digestErr != nil {
			return digestErr
		}
		if digest != row.PlanSHA256 {
			return errors.New("retained completion plan mismatch")
		}
	case export.StateCompleted:
		var ids []string
		if e = json.Unmarshal([]byte(row.ReceiptIDs), &ids); e != nil || len(ids) == 0 {
			return errors.New("retained target identity missing")
		}
		seen := map[string]bool{}
		for _, id := range ids {
			if seen[id] || id == "" {
				return errors.New("invalid retained target identities")
			}
			seen[id] = true
		}
		n, countErr := f.db.NewSelect().Table("export_webhook_targets").Where("export_id=? AND id IN (?)", row.ExportID, bun.List(ids)).Count(ctx)
		if countErr != nil {
			return countErr
		}
		if n != len(ids) {
			return errors.New("retained targets missing")
		}
	default:
		return errors.New("invalid adoption state")
	}
	var inbox []struct{ Namespace, Key, Digest string }
	if e = s.db.NewSelect().Table("export_webhook_inbox").Column("namespace", "key", "digest").Scan(ctx, &inbox); e != nil {
		return e
	}
	for _, r := range inbox {
		var target struct{ Digest, Body string }
		if e = f.db.NewSelect().Table("export_webhook_targets").Column("digest", "body").Where("id=?", r.Key).Scan(ctx, &target); e != nil {
			return e
		}
		if r.Namespace != "trusted-sender" || r.Digest != target.Digest || r.Digest != delivery.PayloadDigest([]byte(target.Body)) {
			return errors.New("receiver sender identity mismatch")
		}
		var effect string
		if e = s.db.NewSelect().Table("receiver_effects").Column("value").Where("id=?", r.Key).Scan(ctx, &effect); e != nil {
			return e
		}
		if effect != target.Body {
			return errors.New("receiver effect mismatch")
		}
	}
	n, e := s.db.NewSelect().Table("receiver_effects").Count(ctx)
	if e != nil {
		return e
	}
	if n != len(inbox) {
		return errors.New("orphaned receiver effect")
	}
	var delivered []string
	if e = f.db.NewSelect().Table("export_webhook_targets").Column("id").Where("delivered_at IS NOT NULL").Scan(ctx, &delivered); e != nil {
		return e
	}
	for _, id := range delivered {
		found := false
		for _, r := range inbox {
			if r.Key == id {
				found = true
			}
		}
		if !found {
			return errors.New("sender ACK without retained receiver receipt")
		}
	}
	return nil
}
func adoptionRecoveryCapture(t *testing.T, f *legacyFixture, s *adoptionRecoverySender, root string, quiescent bool, review LegacyExportAdoptionRequest) (string, error) {
	t.Helper()
	if !quiescent {
		return "", errors.New("all writers must be stopped")
	}
	if e := adoptionRecoveryRetained(f, s, review); e != nil {
		return "", e
	}
	if e := os.Mkdir(root, 0700); e != nil {
		return "", e
	}
	host, e := adoptionRecoveryState(f.db)
	if e != nil {
		return "", e
	}
	receiver, e := adoptionRecoveryState(s.db)
	if e != nil {
		return "", e
	}
	if host["admin_export_legacy_adoptions"] == "" {
		return "", errors.New("adoption receipt table required")
	}
	m := adoptionRecoverySet{Version: 1, ID: uuid.NewString(), Dialect: f.db.Dialect().Name().String(), HostSchema: adoptionRecoverySchema(t, f.db), ReceiverSchema: adoptionRecoverySchema(t, s.db), HostState: host, ReceiverState: receiver, Files: map[string]string{}}
	if e = adoptionRecoveryDump(t, f.db, filepath.Join(root, "host.sql")); e != nil {
		return "", e
	}
	if e = adoptionRecoveryDump(t, s.db, filepath.Join(root, "receiver.sql")); e != nil {
		return "", e
	}
	if e = os.CopyFS(filepath.Join(root, "artifacts"), os.DirFS(f.cfg.ArtifactRoot)); e != nil {
		return "", e
	}
	for _, kind := range []string{"host", "receiver", "artifacts"} {
		b := adoptionRecoveryJSON(t, struct{ SetID, Kind string }{m.ID, kind})
		if e = os.WriteFile(filepath.Join(root, kind+".component.json"), b, 0600); e != nil {
			return "", e
		}
	}
	e = filepath.WalkDir(root, func(p string, d fs.DirEntry, e error) error {
		if e != nil {
			return e
		}
		if d.Type()&os.ModeSymlink != 0 {
			return errors.New("snapshot symlink")
		}
		if d.IsDir() {
			return nil
		}
		rel, e := filepath.Rel(root, p)
		if e != nil {
			return e
		}
		sum, e := adoptionRecoveryFile(p)
		m.Files[filepath.ToSlash(rel)] = sum
		return e
	})
	if e != nil {
		return "", e
	}
	b, e := json.MarshalIndent(m, "", "  ")
	if e != nil {
		return "", e
	}
	e = os.WriteFile(filepath.Join(root, "recovery-set.json"), b, 0600)
	return adoptionRecoveryHash(b), e
}
func adoptionRecoveryVerify(root, digest string) (adoptionRecoverySet, error) {
	var m adoptionRecoverySet
	st, e := os.Lstat(root)
	if e != nil || !st.IsDir() || st.Mode()&os.ModeSymlink != 0 {
		return m, errors.New("regular recovery directory required")
	}
	p := filepath.Join(root, "recovery-set.json")
	st, e = os.Lstat(p)
	if e != nil || !st.Mode().IsRegular() {
		return m, errors.New("regular manifest required")
	}
	b, e := os.ReadFile(p)
	if e != nil {
		return m, e
	}
	if adoptionRecoveryHash(b) != digest {
		return m, errors.New("trusted catalog mismatch")
	}
	if e = json.Unmarshal(b, &m); e != nil {
		return m, e
	}
	if m.Version != 1 || m.ID == "" || (m.Dialect != "sqlite" && m.Dialect != "pg") || len(m.HostState) == 0 || len(m.ReceiverState) == 0 || m.HostState["admin_export_legacy_adoptions"] == "" {
		return m, errors.New("unsupported or incomplete recovery identity")
	}
	for _, kind := range []string{"host", "receiver", "artifacts"} {
		if m.Files[kind+".component.json"] == "" {
			return m, errors.New("component missing")
		}
	}
	for _, kind := range []string{"host.sql", "receiver.sql"} {
		if m.Files[kind] == "" {
			return m, errors.New("SQL snapshot missing")
		}
	}
	// Walk first so no file read can traverse a nested symlink directory.
	e = filepath.WalkDir(root, func(p string, d fs.DirEntry, e error) error {
		if e != nil {
			return e
		}
		if d.Type()&os.ModeSymlink != 0 {
			return errors.New("snapshot symlink")
		}
		if d.IsDir() {
			return nil
		}
		rel, e := filepath.Rel(root, p)
		if e != nil {
			return e
		}
		rel = filepath.ToSlash(rel)
		if rel != "recovery-set.json" && m.Files[rel] == "" {
			return errors.New("unlisted component")
		}
		return nil
	})
	if e != nil {
		return m, e
	}
	for n, want := range m.Files {
		if filepath.IsAbs(n) || filepath.ToSlash(filepath.Clean(n)) != n || n == ".." || strings.HasPrefix(n, "../") {
			return m, errors.New("unsafe recovery path")
		}
		st, e := os.Lstat(filepath.Join(root, n))
		if e != nil || !st.Mode().IsRegular() {
			return m, errors.New("nonregular or missing component")
		}
		got, e := adoptionRecoveryFile(filepath.Join(root, n))
		if e != nil || got != want {
			return m, errors.New("component digest mismatch")
		}
	}
	for _, kind := range []string{"host", "receiver", "artifacts"} {
		var c struct{ SetID, Kind string }
		b, e := os.ReadFile(filepath.Join(root, kind+".component.json"))
		if e != nil {
			return m, e
		}
		if json.Unmarshal(b, &c) != nil || c.SetID != m.ID || c.Kind != kind {
			return m, errors.New("mixed recovery set")
		}
	}
	return m, nil
}
func adoptionRecoveryCompare(db *bun.DB, want map[string]string) error {
	got, e := adoptionRecoveryState(db)
	if e != nil {
		return e
	}
	if !reflect.DeepEqual(got, want) {
		return errors.New("restored full canonical state mismatch")
	}
	return nil
}
func adoptionRecoveryRestore(t *testing.T, f *legacyFixture, s *adoptionRecoverySender, root, digest string) {
	t.Helper()
	m, e := adoptionRecoveryVerify(root, digest)
	adoptionRecoveryMust(t, e)
	host := adoptionRecoveryOpen(t, filepath.Join(root, "host.sql"), m.HostSchema, m.Dialect == "pg")
	receiver := adoptionRecoveryOpen(t, filepath.Join(root, "receiver.sql"), m.ReceiverSchema, m.Dialect == "pg")
	adoptionRecoveryMust(t, adoptionRecoveryCompare(host, m.HostState))
	adoptionRecoveryMust(t, adoptionRecoveryCompare(receiver, m.ReceiverState))
	dest := filepath.Join(t.TempDir(), "artifacts")
	adoptionRecoveryMust(t, os.CopyFS(dest, os.DirFS(filepath.Join(root, "artifacts"))))
	// Verify copied artifact bytes before constructing a host or enabling workers.
	for n, want := range m.Files {
		if after, ok := strings.CutPrefix(n, "artifacts/"); ok {
			got, e := adoptionRecoveryFile(filepath.Join(dest, after))
			adoptionRecoveryMust(t, e)
			if got != want {
				t.Fatal("restored artifact mismatch")
			}
		}
	}
	f.db = host
	f.cfg.DB = host
	f.cfg.ArtifactRoot = dest
	s.db = receiver
	f.h = f.newHost()
	adoptionRecoveryMust(t, f.h.CheckReady(context.Background()))
}
func adoptionRecoveryExecute(t *testing.T, f *legacyFixture, ack bool) error {
	t.Helper()
	m, r, e := f.h.Queue.Dequeue(context.Background())
	if e != nil {
		return e
	}
	if m == nil {
		return errors.New("pending delivery missing")
	}
	if e = f.h.ExecuteMessage(context.Background(), m); e != nil {
		return e
	}
	if ack {
		return f.h.Queue.Ack(context.Background(), r)
	}
	return nil
}
func adoptionRecoveryCount(t *testing.T, db *bun.DB, table string) int {
	t.Helper()
	n, e := db.NewSelect().Table(table).Count(context.Background())
	adoptionRecoveryMust(t, e)
	return n
}

func TestDurableExportRecoveryAdoptionBoundaries(t *testing.T) {
	for _, boundary := range []string{"queued", "completed", "generated", "receiver-uncertain", "acknowledged"} {
		t.Run(boundary, func(t *testing.T) {
			f := newLegacyFixture(t)
			now := time.Now().UTC()
			f.cfg.Now = func() time.Time { return now }
			s := adoptionRecoveryNewSender(t, f.db.Dialect().Name() == dialect.PG)
			f.cfg.Webhooks.Sender = s
			f.h = f.newHost()
			state := export.StateCompleted
			if boundary == "queued" || boundary == "generated" {
				state = export.StateQueued
			}
			f.record("retained", state)
			r := f.review("retained")
			f.apply(r)
			if boundary == "generated" {
				adoptionRecoveryMust(t, adoptionRecoveryExecute(t, f, true))
			}
			if boundary == "receiver-uncertain" {
				s.loseResponse = true
				if e := adoptionRecoveryExecute(t, f, false); e == nil {
					t.Fatal("lost receiver response accepted")
				}
				s.loseResponse = false
			}
			if boundary == "acknowledged" {
				adoptionRecoveryMust(t, adoptionRecoveryExecute(t, f, true))
			}
			root := filepath.Join(t.TempDir(), "set")
			digest, e := adoptionRecoveryCapture(t, f, s, root, true, r)
			adoptionRecoveryMust(t, e)
			generationBefore := f.sourceCalls.Load()
			delegationsBefore := f.accepts.Load()
			adoptionRecoveryRestore(t, f, s, root, digest)
			if !f.apply(r).Replayed || f.accepts.Load() != delegationsBefore {
				t.Fatal("restore renewed adoption/delegation")
			}
			// Reclaim retained unacknowledged leases through the native clock, not an ACK.
			if boundary == "receiver-uncertain" {
				now = now.Add(10 * time.Minute)
			}
			for i := 0; i < 3 && f.count("queue_messages") > 0; i++ {
				adoptionRecoveryMust(t, adoptionRecoveryExecute(t, f, true))
			}
			if f.count("queue_messages") != 0 || f.count("admin_export_legacy_adoptions") != 1 || adoptionRecoveryCount(t, s.db, "export_webhook_inbox") != 1 || adoptionRecoveryCount(t, s.db, "receiver_effects") != 1 {
				t.Fatal("restore lost retained identity or duplicated receiver effect")
			}
			want := generationBefore
			if boundary == "queued" {
				want++
			}
			if f.sourceCalls.Load() != want {
				t.Fatal("restored completed export regenerated")
			}
			if !f.apply(r).Replayed || f.accepts.Load() != delegationsBefore {
				t.Fatal("final replay changed delegation")
			}
		})
	}
}

func TestDurableExportRecoveryAdoptionRejectsIncompleteSet(t *testing.T) {
	for _, fault := range []string{"unfenced", "catalog", "missing-receipt-table", "host-corrupt", "receiver-missing", "artifact-corrupt", "unlisted", "mixed", "path", "symlink", "manifest-symlink"} {
		t.Run(fault, func(t *testing.T) {
			f := newLegacyFixture(t)
			s := adoptionRecoveryNewSender(t, f.db.Dialect().Name() == dialect.PG)
			f.record("retained", export.StateCompleted)
			r := f.review("retained")
			f.apply(r)
			root := filepath.Join(t.TempDir(), "set")
			digest, e := adoptionRecoveryCapture(t, f, s, root, fault != "unfenced", r)
			if fault == "unfenced" {
				if e == nil {
					t.Fatal("unfenced capture allowed")
				}
				return
			}
			adoptionRecoveryMust(t, e)
			manifest := filepath.Join(root, "recovery-set.json")
			b, e := os.ReadFile(manifest)
			adoptionRecoveryMust(t, e)
			var m adoptionRecoverySet
			adoptionRecoveryMust(t, json.Unmarshal(b, &m))
			resign := false
			switch fault {
			case "catalog":
				digest = strings.Repeat("0", 64)
			case "missing-receipt-table":
				delete(m.HostState, "admin_export_legacy_adoptions")
				resign = true
			case "host-corrupt":
				adoptionRecoveryMust(t, os.WriteFile(filepath.Join(root, "host.sql"), []byte("corrupt"), 0600))
			case "receiver-missing":
				adoptionRecoveryMust(t, os.Remove(filepath.Join(root, "receiver.sql")))
			case "artifact-corrupt":
				for n := range m.Files {
					if strings.HasPrefix(n, "artifacts/") {
						adoptionRecoveryMust(t, os.WriteFile(filepath.Join(root, n), []byte("corrupt"), 0600))
						break
					}
				}
			case "unlisted":
				adoptionRecoveryMust(t, os.WriteFile(filepath.Join(root, "extra"), []byte("unlisted"), 0600))
			case "mixed":
				p := filepath.Join(root, "receiver.component.json")
				adoptionRecoveryMust(t, os.WriteFile(p, []byte(`{"SetID":"other","Kind":"receiver"}`), 0600))
				m.Files["receiver.component.json"], e = adoptionRecoveryFile(p)
				adoptionRecoveryMust(t, e)
				resign = true
			case "path":
				m.Files["../outside"] = strings.Repeat("0", 64)
				resign = true
			case "symlink":
				p := filepath.Join(root, "receiver.sql")
				adoptionRecoveryMust(t, os.Remove(p))
				adoptionRecoveryMust(t, os.Symlink(filepath.Join(root, "host.sql"), p))
			case "manifest-symlink":
				p := filepath.Join(t.TempDir(), "manifest")
				adoptionRecoveryMust(t, os.WriteFile(p, b, 0600))
				adoptionRecoveryMust(t, os.Remove(manifest))
				adoptionRecoveryMust(t, os.Symlink(p, manifest))
			}
			if resign {
				b, e = json.Marshal(m)
				adoptionRecoveryMust(t, e)
				adoptionRecoveryMust(t, os.WriteFile(manifest, b, 0600))
				digest = adoptionRecoveryHash(b)
			}
			if _, e = adoptionRecoveryVerify(root, digest); e == nil {
				t.Fatal("invalid recovery set accepted")
			}
		})
	}
}
func TestDurableExportRecoveryAdoptionDetectsPrunedState(t *testing.T) {
	for _, table := range []string{"admin_export_legacy_adoptions", "admin_export_host_owners", "legacy_test_delegations", "export_webhook_targets", "queue_messages", "export_webhook_inbox", "receiver_effects"} {
		t.Run(table, func(t *testing.T) {
			f := newLegacyFixture(t)
			s := adoptionRecoveryNewSender(t, f.db.Dialect().Name() == dialect.PG)
			f.cfg.Webhooks.Sender = s
			f.h = f.newHost()
			f.record("retained", export.StateCompleted)
			r := f.review("retained")
			f.apply(r)
			s.loseResponse = true
			if e := adoptionRecoveryExecute(t, f, false); e == nil {
				t.Fatal("lost response not injected")
			}
			s.loseResponse = false
			root := filepath.Join(t.TempDir(), "set")
			digest, e := adoptionRecoveryCapture(t, f, s, root, true, r)
			adoptionRecoveryMust(t, e)
			m, e := adoptionRecoveryVerify(root, digest)
			adoptionRecoveryMust(t, e)
			adoptionRecoveryRestore(t, f, s, root, digest)
			db, want := f.db, m.HostState
			if table == "export_webhook_inbox" || table == "receiver_effects" {
				db, want = s.db, m.ReceiverState
			}
			_, e = db.Exec("DELETE FROM " + table)
			adoptionRecoveryMust(t, e)
			if e = adoptionRecoveryCompare(db, want); e == nil {
				t.Fatal("pruned recovery state accepted")
			}
		})
	}
}
func TestDurableExportRecoveryAdoptionCurrentPolicyBeforeReplay(t *testing.T) {
	for _, policy := range []string{"account", "delegation", "target", "profile"} {
		t.Run(policy, func(t *testing.T) {
			f := newLegacyFixture(t)
			s := adoptionRecoveryNewSender(t, f.db.Dialect().Name() == dialect.PG)
			f.cfg.Webhooks.Sender = s
			f.h = f.newHost()
			f.record("retained", export.StateCompleted)
			r := f.review("retained")
			f.apply(r)
			root := filepath.Join(t.TempDir(), "set")
			digest, e := adoptionRecoveryCapture(t, f, s, root, true, r)
			adoptionRecoveryMust(t, e)
			adoptionRecoveryRestore(t, f, s, root, digest)
			// Explicit host-owned post-snapshot reconciliation, before enabling replay.
			switch policy {
			case "account":
				_, e = f.db.Exec("UPDATE legacy_test_principals SET enabled=0")
			case "delegation":
				_, e = f.db.Exec("UPDATE legacy_test_delegations SET enabled=0")
			case "target":
				f.allowTarget = false
			case "profile":
				f.secret = "synthetic-revoked-profile"
			}
			adoptionRecoveryMust(t, e)
			if _, e = f.h.AdoptLegacyExport(context.Background(), f.actor, r); e == nil {
				t.Fatal("stale adoption authority accepted")
			}
			if policy != "profile" {
				if e = adoptionRecoveryExecute(t, f, false); e == nil {
					t.Fatal("revoked authority sent webhook")
				}
			}
			if s.attempts != 0 || adoptionRecoveryCount(t, s.db, "receiver_effects") != 0 || f.accepts.Load() != 1 {
				t.Fatal("denied restored work produced effects or renewed authority")
			}
		})
	}
}

func TestDurableExportRecoveryAdoptionRejectsPruningBeforeCapture(t *testing.T) {
	for _, fault := range []string{"receipt", "owner", "delegation", "plan", "plan-drift", "target", "inbox", "effect", "receiver-digest", "artifact"} {
		t.Run(fault, func(t *testing.T) {
			f := newLegacyFixture(t)
			s := adoptionRecoveryNewSender(t, f.db.Dialect().Name() == dialect.PG)
			f.cfg.Webhooks.Sender = s
			f.h = f.newHost()
			state := export.StateCompleted
			if fault == "plan" || fault == "plan-drift" {
				state = export.StateQueued
			}
			f.record("retained", state)
			r := f.review("retained")
			f.apply(r)
			if fault == "inbox" || fault == "effect" || fault == "receiver-digest" {
				s.loseResponse = true
				if e := adoptionRecoveryExecute(t, f, false); e == nil {
					t.Fatal("receiver response loss not injected")
				}
				s.loseResponse = false
			}
			var e error
			switch fault {
			case "receipt":
				_, e = f.db.Exec("DELETE FROM admin_export_legacy_adoptions")
			case "owner":
				_, e = f.db.Exec("UPDATE admin_export_host_owners SET namespace='foreign'")
			case "delegation":
				_, e = f.db.Exec("DELETE FROM legacy_test_delegations")
			case "plan":
				_, e = f.db.Exec("DELETE FROM export_webhook_completion_plans")
			case "plan-drift":
				_, e = f.db.Exec("UPDATE export_webhook_completion_plans SET request='{}'")
			case "target":
				_, e = f.db.Exec("DELETE FROM export_webhook_targets")
			case "inbox":
				_, e = s.db.Exec("DELETE FROM export_webhook_inbox")
			case "effect":
				_, e = s.db.Exec("DELETE FROM receiver_effects")
			case "receiver-digest":
				_, e = s.db.Exec("UPDATE export_webhook_inbox SET digest=?", strings.Repeat("0", 64))
			case "artifact":
				e = os.RemoveAll(f.cfg.ArtifactRoot)
			}
			adoptionRecoveryMust(t, e)
			if _, e = adoptionRecoveryCapture(t, f, s, filepath.Join(t.TempDir(), "set"), true, r); e == nil {
				t.Fatal("unsafe retained state captured")
			}
		})
	}
}
