package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io/fs"
	"math"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	router "github.com/goliatone/go-router"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

// PostgreSQL tests use an explicitly supplied disposable database. Every test
// gets an isolated schema; they do not touch application schemas or data.
func settingsDocumentTestDBs(t *testing.T, run func(*testing.T, *bun.DB)) {
	t.Helper()
	t.Run("sqlite", func(t *testing.T) {
		db, err := newSettingsDB()
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() {
			if closeErr := db.Close(); closeErr != nil {
				t.Errorf("close settings db: %v", closeErr)
			}
		})
		run(t, db)
	})
	t.Run("postgres", func(t *testing.T) {
		dsn := os.Getenv("GOADMIN_SETTINGS_POSTGRES_DSN")
		if dsn == "" {
			t.Skip("GOADMIN_SETTINGS_POSTGRES_DSN not configured")
		}
		adminSQL, err := sql.Open("postgres", dsn)
		if err != nil {
			t.Fatal(err)
		}
		adminDB := bun.NewDB(adminSQL, pgdialect.New())
		t.Cleanup(func() {
			if closeErr := adminDB.Close(); closeErr != nil {
				t.Errorf("close postgres admin db: %v", closeErr)
			}
		})
		schema := "settings_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
		if _, execContextErr := adminDB.ExecContext(context.Background(), "CREATE SCHEMA ?", bun.Ident(schema)); execContextErr != nil {
			t.Fatal(execContextErr)
		}
		t.Cleanup(func() {
			if _, execContextErr := adminDB.ExecContext(context.Background(), "DROP SCHEMA ? CASCADE", bun.Ident(schema)); execContextErr != nil {
				t.Errorf("drop test schema: %v", execContextErr)
			}
		})
		scopedDSN := dsn + " options='-c search_path=" + schema + "'"
		if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
			parsed, parseErr := url.Parse(dsn)
			if parseErr != nil {
				t.Fatal(parseErr)
			}
			query := parsed.Query()
			query.Set("options", "-c search_path="+schema)
			parsed.RawQuery = query.Encode()
			scopedDSN = parsed.String()
		}
		sqlDB, err := sql.Open("postgres", scopedDSN)
		if err != nil {
			t.Fatal(err)
		}
		sqlDB.SetMaxOpenConns(8)
		db := bun.NewDB(sqlDB, pgdialect.New())
		t.Cleanup(func() {
			if closeErr := db.Close(); closeErr != nil {
				t.Errorf("close settings db: %v", closeErr)
			}
		})
		run(t, db)
	})
}

func settingsDocumentAdapter(t *testing.T, db *bun.DB) (*BunSettingsAdapter, *SettingsService) {
	t.Helper()
	if ensureSettingsDocumentSchemaErr := EnsureSettingsDocumentSchema(context.Background(), db); ensureSettingsDocumentSchemaErr != nil {
		t.Fatal(ensureSettingsDocumentSchemaErr)
	}
	adapter, err := NewBunSettingsAdapterWithConfig(db, BunSettingsAdapterConfig{SkipSchemaEnsure: true, DocumentMaxBytes: 16 << 10})
	if err != nil {
		t.Fatal(err)
	}
	svc := NewSettingsService()
	svc.UseAdapter(adapter)
	svc.RegisterDefinition(SettingDefinition{Key: "name", Default: "Default", Type: "string", ApplicationManaged: true, AllowedScopes: []SettingsScope{SettingsScopeSite, SettingsScopeSystem, SettingsScopeUser}})
	svc.RegisterDefinition(SettingDefinition{Key: "days", Default: 30, Type: "number"})
	return adapter, svc
}

func TestSettingsDocumentsLifecycle(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		_, svc := settingsDocumentAdapter(t, db)
		ctx := context.Background()
		target := SettingsDocumentTarget{Namespace: "crm.company", Scope: SettingsScopeSite}
		initial, err := svc.ReadDocument(ctx, target)
		if err != nil {
			t.Fatal(err)
		}
		if initial.Revision != 0 || len(initial.Overrides) != 0 || initial.Values["name"].Value != "Default" || initial.Values["name"].Scope != SettingsScopeDefault {
			t.Fatalf("initial %+v", initial)
		}
		saved, err := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: target, Values: map[string]any{"name": "Company", "days": 14}})
		if err != nil {
			t.Fatal(err)
		}
		if saved.Revision != 1 || saved.Identity == initial.Identity || saved.Values["name"].Provenance != "site" || strings.Join(saved.ChangedKeys, ",") != "days,name" {
			t.Fatalf("saved %+v", saved)
		}
		// A caller can mutate returned maps without changing persisted values.
		saved.Overrides["name"] = "Spoofed"
		saved.Values["name"] = ResolvedSetting{Value: "Spoofed"}
		reloaded, err := svc.ReadDocument(ctx, target)
		if err != nil {
			t.Fatal(err)
		}
		if reloaded.Values["name"].Value != "Company" {
			t.Fatalf("not detached %+v", reloaded)
		}
		unchanged, err := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: target, ExpectedRevision: 1, Values: map[string]any{"name": "Company", "days": 14}})
		if err != nil {
			t.Fatal(err)
		}
		if unchanged.Revision != 1 || unchanged.Identity != reloaded.Identity || len(unchanged.ChangedKeys) != 0 {
			t.Fatalf("no-op %+v", unchanged)
		}
		reset, err := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: target, ExpectedRevision: 1, Reset: []string{"name"}})
		if err != nil {
			t.Fatal(err)
		}
		if reset.Revision != 2 || reset.Values["name"].Value != "Default" || reset.Values["name"].Scope != SettingsScopeDefault || reset.Values["days"].Value != json.Number("14") {
			t.Fatalf("reset %+v", reset)
		}
		touched, err := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: target, ExpectedRevision: 2, Touch: true})
		if err != nil {
			t.Fatal(err)
		}
		if touched.Revision != 3 || touched.Identity == reset.Identity || len(touched.ChangedKeys) != 0 {
			t.Fatalf("touch %+v", touched)
		}
		for _, revision := range []int64{0, 1, 2, 4} {
			_, conflictErr := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: target, ExpectedRevision: revision, Touch: true})
			if _, ok := errors.AsType[*SettingsRevisionConflict](conflictErr); !ok {
				t.Fatalf("revision %d: %v", revision, conflictErr)
			}
		}
		// Different namespace and user target never see site document values.
		for _, other := range []SettingsDocumentTarget{{Namespace: "crm.email", Scope: SettingsScopeSite}, {Namespace: target.Namespace, Scope: SettingsScopeSystem}, {Namespace: target.Namespace, Scope: SettingsScopeUser, UserID: "staff-a"}, {Namespace: target.Namespace, Scope: SettingsScopeUser, UserID: "staff-b"}} {
			empty, readErr := svc.ReadDocument(ctx, other)
			if readErr != nil {
				t.Fatal(readErr)
			}
			if empty.Revision != 0 || len(empty.Overrides) != 0 {
				t.Fatalf("scope leak %+v", empty)
			}
			if _, applyDocumentErr := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: other, Values: map[string]any{"name": other.Namespace + other.UserID}}); applyDocumentErr != nil {
				t.Fatal(applyDocumentErr)
			}
		}
		// Defaults are part of the effective snapshot identity.
		svc.RegisterDefinition(SettingDefinition{Key: "name", Default: "New default", Type: "string", ApplicationManaged: true})
		defaults, err := svc.ReadDocument(ctx, target)
		if err != nil {
			t.Fatal(err)
		}
		if defaults.Identity == touched.Identity || defaults.Revision != 3 {
			t.Fatal("default identity failed")
		}
	})
}

func TestSettingsDocumentsHostTransaction(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		_, svc := settingsDocumentAdapter(t, db)
		ctx := context.Background()
		target := SettingsDocumentTarget{Namespace: "crm.company", Scope: SettingsScopeSite}
		sink := new(recordingSink)
		svc.WithActivitySink(sink)
		defer func() {
			if len(sink.entries) != 0 {
				t.Fatal("document path emitted best-effort activity")
			}
		}()
		for _, stmt := range []string{"CREATE TABLE host_audit (id TEXT PRIMARY KEY)", "CREATE TABLE host_replay (id TEXT PRIMARY KEY)"} {
			if _, execContextErr := db.ExecContext(ctx, stmt); execContextErr != nil {
				t.Fatal(execContextErr)
			}
		}
		hostFailure := errors.New("host replay failed")
		err := db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
			if _, applyDocumentTxErr := svc.ApplyDocumentTx(ctx, tx, SettingsDocumentMutation{Target: target, Values: map[string]any{"name": "Rolled back"}}); applyDocumentTxErr != nil {
				return applyDocumentTxErr
			}
			seen, err := svc.ReadDocumentWithDB(ctx, tx, target)
			if err != nil {
				return err
			}
			if seen.Revision != 1 {
				t.Fatal("read did not join transaction")
			}
			if _, execContextErr := tx.ExecContext(ctx, "INSERT INTO host_audit (id) VALUES ('first')"); execContextErr != nil {
				return execContextErr
			}
			return hostFailure
		})
		if !errors.Is(err, hostFailure) {
			t.Fatal(err)
		}
		after, err := svc.ReadDocument(ctx, target)
		if err != nil {
			t.Fatal(err)
		}
		if after.Revision != 0 {
			t.Fatal("settings escaped rollback")
		}
		var count int
		if scanErr := db.NewRaw("SELECT count(*) FROM host_audit").Scan(ctx, &count); scanErr != nil || count != 0 {
			t.Fatalf("audit escaped rollback: %d %v", count, scanErr)
		}
		if runInTxErr := db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
			if _, applyDocumentTxErr := svc.ApplyDocumentTx(ctx, tx, SettingsDocumentMutation{Target: target, Values: map[string]any{"name": "Committed"}}); applyDocumentTxErr != nil {
				return applyDocumentTxErr
			}
			if _, execContextErr := tx.ExecContext(ctx, "INSERT INTO host_audit (id) VALUES ('first')"); execContextErr != nil {
				return execContextErr
			}
			_, replayErr := tx.ExecContext(ctx, "INSERT INTO host_replay (id) VALUES ('first')")
			return replayErr
		}); runInTxErr != nil {
			t.Fatal(runInTxErr)
		}
		// A real downstream SQL failure rolls back the changed settings and new audit.
		err = db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
			if _, applyDocumentTxErr := svc.ApplyDocumentTx(ctx, tx, SettingsDocumentMutation{Target: target, ExpectedRevision: 1, Values: map[string]any{"name": "Must roll back"}}); applyDocumentTxErr != nil {
				return applyDocumentTxErr
			}
			if _, execContextErr := tx.ExecContext(ctx, "INSERT INTO host_audit (id) VALUES ('second')"); execContextErr != nil {
				return execContextErr
			}
			_, replayErr := tx.ExecContext(ctx, "INSERT INTO host_replay (id) VALUES ('first')")
			return replayErr
		})
		if err == nil {
			t.Fatal("expected replay duplicate failure")
		}
		after, err = svc.ReadDocument(ctx, target)
		if err != nil {
			t.Fatal(err)
		}
		if after.Revision != 1 || after.Values["name"].Value != "Committed" {
			t.Fatalf("failed host transaction persisted %+v", after)
		}
		if scanErr := db.NewRaw("SELECT count(*) FROM host_audit").Scan(ctx, &count); scanErr != nil || count != 1 {
			t.Fatalf("audit rollback: %d %v", count, scanErr)
		}
	})
}

func TestSettingsDocumentsValidationAndErrors(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		a, svc := settingsDocumentAdapter(t, db)
		ctx := context.Background()
		target := SettingsDocumentTarget{Namespace: "crm.company", Scope: SettingsScopeSite}
		for _, mutation := range []SettingsDocumentMutation{
			{Target: target, ExpectedRevision: -1}, {Target: target, ExpectedRevision: math.MaxInt64}, {Target: target, Values: map[string]any{"unknown": "x"}},
			{Target: target, Reset: []string{"unknown"}}, {Target: target, Reset: []string{"name", "name"}}, {Target: target, Values: map[string]any{"name": "x"}, Reset: []string{"name"}},
			{Target: target, Values: map[string]any{"days": "wrong"}}, {Target: target, Values: map[string]any{"name": strings.Repeat("x", 20<<10)}},
			{Target: SettingsDocumentTarget{Scope: SettingsScopeSite}}, {Target: SettingsDocumentTarget{Namespace: "x", Scope: SettingsScopeDefault}},
			{Target: SettingsDocumentTarget{Namespace: "x", Scope: SettingsScopeSite, UserID: "spoof"}}, {Target: SettingsDocumentTarget{Namespace: "x", Scope: SettingsScopeUser}},
		} {
			if _, applyDocumentErr := svc.ApplyDocument(ctx, mutation); applyDocumentErr == nil {
				t.Fatalf("accepted %+v", mutation)
			}
		}
		canceled, cancel := context.WithCancel(ctx)
		cancel()
		if _, readDocumentErr := svc.ReadDocument(canceled, target); !errors.Is(readDocumentErr, context.Canceled) {
			t.Fatal(readDocumentErr)
		}
		if _, applyDocumentErr := svc.ApplyDocument(canceled, SettingsDocumentMutation{Target: target}); !errors.Is(applyDocumentErr, context.Canceled) {
			t.Fatal(applyDocumentErr)
		}
		if _, applyDocumentTxErr := svc.ApplyDocumentTx(ctx, bun.Tx{}, SettingsDocumentMutation{Target: target}); applyDocumentTxErr == nil {
			t.Fatal("accepted missing tx")
		}
		if applyErr := svc.Apply(ctx, SettingsBundle{Values: map[string]any{"name": "bypass"}}); applyErr == nil {
			t.Fatal("generic service bypass")
		}
		if applyErr := a.Apply(ctx, SettingsBundle{Values: map[string]any{"name": "bypass"}}); applyErr == nil {
			t.Fatal("generic adapter bypass")
		}
		if _, execContextErr := db.ExecContext(ctx, "DROP TABLE admin_settings_documents"); execContextErr != nil {
			t.Fatal(execContextErr)
		}
		if _, readDocumentErr := svc.ReadDocument(ctx, target); readDocumentErr == nil {
			t.Fatal("database read silently became defaults")
		}
		if _, resolveAllContextErr := svc.ResolveAllContext(ctx, ""); resolveAllContextErr == nil {
			t.Fatal("legacy missing table error hidden")
		}
	})
}

func TestSettingsDocumentsExplicitMigrations(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		a, err := NewBunSettingsAdapterWithConfig(db, BunSettingsAdapterConfig{SkipSchemaEnsure: true})
		if err != nil {
			t.Fatal(err)
		}
		target := SettingsDocumentTarget{Namespace: "site", Scope: SettingsScopeSite}
		if _, readDocumentErr := a.ReadDocument(context.Background(), target); readDocumentErr == nil {
			t.Fatal("constructor ran DDL")
		}
		migrations := GetSettingsDocumentMigrationsFS()
		for _, path := range []string{"0001_settings_documents.up.sql", "0001_settings_documents.down.sql", "0001_settings_documents.up.sql"} {
			data, err := fs.ReadFile(migrations, path)
			if err != nil {
				t.Fatal(err)
			}
			if _, execContextErr := db.ExecContext(context.Background(), string(data)); execContextErr != nil {
				t.Fatal(execContextErr)
			}
		}
		if _, readDocumentErr := a.ReadDocument(context.Background(), target); readDocumentErr != nil {
			t.Fatal(readDocumentErr)
		}
		for _, stmt := range []string{
			"INSERT INTO admin_settings_documents VALUES ('x', 'site', '', -1, '{}', CURRENT_TIMESTAMP)",
			"INSERT INTO admin_settings_documents VALUES ('x', 'site', 'bad', 0, '{}', CURRENT_TIMESTAMP)",
		} {
			if _, execContextErr := db.ExecContext(context.Background(), stmt); execContextErr == nil {
				t.Fatal("schema accepted invalid record")
			}
		}
	})
}

func TestSettingsDocumentsConcurrentWriters(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		_, svc := settingsDocumentAdapter(t, db)
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		target := SettingsDocumentTarget{Namespace: "race", Scope: SettingsScopeSite}
		var barrier *settingsWriteBarrier
		if db.Dialect().Name() == dialect.PG {
			barrier = new(settingsWriteBarrier)
			db.AddQueryHook(barrier)
		}
		for _, expected := range []int64{0, 1} {
			if barrier != nil {
				barrier.mu.Lock()
				barrier.remaining = 8
				barrier.gate = make(chan struct{})
				barrier.mu.Unlock()
			}
			gate := make(chan struct{})
			results := make(chan error, 8)
			var wg sync.WaitGroup
			for range 8 {
				wg.Go(func() {
					<-gate
					_, err := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: target, ExpectedRevision: expected, Touch: true})
					results <- err
				})
			}
			close(gate)
			wg.Wait()
			close(results)
			success, conflict := 0, 0
			for err := range results {
				if err == nil {
					success++
				} else {
					if _, ok := errors.AsType[*SettingsRevisionConflict](err); ok {
						conflict++
					} else {
						t.Fatalf("unexpected race error: %v", err)
					}
				}
			}
			if success != 1 || conflict != 7 {
				t.Fatalf("race %d: success=%d conflict=%d", expected, success, conflict)
			}
		}
	})
}

func TestSettingsDocumentsRestart(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.sqlite")
	open := func() *bun.DB {
		sqldb, err := sql.Open(sqliteshim.ShimName, path)
		if err != nil {
			t.Fatal(err)
		}
		sqldb.SetMaxOpenConns(1)
		return bun.NewDB(sqldb, sqlitedialect.New())
	}
	db := open()
	_, svc := settingsDocumentAdapter(t, db)
	target := SettingsDocumentTarget{Namespace: "crm.company", Scope: SettingsScopeSite}
	before, err := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, Values: map[string]any{"name": "Durable"}})
	if err != nil {
		t.Fatal(err)
	}
	if closeErr := db.Close(); closeErr != nil {
		t.Fatal(closeErr)
	}
	db = open()
	t.Cleanup(func() {
		if closeErr := db.Close(); closeErr != nil {
			t.Errorf("close settings db: %v", closeErr)
		}
	})
	_, svc = settingsDocumentAdapter(t, db)
	after, err := svc.ReadDocument(context.Background(), target)
	if err != nil {
		t.Fatal(err)
	}
	if before.Identity != after.Identity || after.Values["name"].Value != "Durable" {
		t.Fatalf("restart %+v", after)
	}
}

func TestSettingsDocumentsExactNumbers(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		_, svc := settingsDocumentAdapter(t, db)
		target := SettingsDocumentTarget{Namespace: "exact", Scope: SettingsScopeSite}
		first, err := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, Values: map[string]any{"days": int64(9007199254740993)}})
		if err != nil {
			t.Fatal(err)
		}
		next, err := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, ExpectedRevision: first.Revision, Values: map[string]any{"name": "Changed"}})
		if err != nil {
			t.Fatal(err)
		}
		if next.Overrides["days"] != json.Number("9007199254740993") {
			t.Fatalf("precision lost: %v", next.Overrides["days"])
		}
		unchanged, err := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, ExpectedRevision: next.Revision, Values: map[string]any{"days": next.Overrides["days"]}})
		if err != nil {
			t.Fatal(err)
		}
		if unchanged.Revision != next.Revision {
			t.Fatal("number round trip changed revision")
		}
	})
}

// This hook forces all PostgreSQL transactions to read the same revision before
// any reaches its CAS statement, covering database arbitration (not just queued
// stale requests). SQLite's one-connection fixture covers serialized contention.
type settingsWriteBarrier struct {
	mu        sync.Mutex
	remaining int
	gate      chan struct{}
}

func (b *settingsWriteBarrier) BeforeQuery(ctx context.Context, event *bun.QueryEvent) context.Context {
	if !strings.HasPrefix(event.Query, "INSERT INTO \"admin_settings_documents\"") && !strings.HasPrefix(event.Query, "UPDATE \"admin_settings_documents\"") {
		return ctx
	}
	b.mu.Lock()
	b.remaining--
	gate := b.gate
	if b.remaining == 0 {
		close(gate)
	}
	b.mu.Unlock()
	select {
	case <-gate:
	case <-ctx.Done():
	}
	return ctx
}
func (*settingsWriteBarrier) AfterQuery(context.Context, *bun.QueryEvent) {}

func TestBunSettingsLegacyAtomicityAndUpdates(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		adapter, err := NewBunSettingsAdapter(db)
		if err != nil {
			t.Fatal(err)
		}
		svc := NewSettingsService()
		svc.UseAdapter(adapter)
		for _, key := range []string{"a", "z"} {
			svc.RegisterDefinition(SettingDefinition{Key: key, Type: "number", Default: 0})
		}
		ctx := context.Background()
		if applyErr := svc.Apply(ctx, SettingsBundle{Values: map[string]any{"a": 1}}); applyErr != nil {
			cause := applyErr
			for errors.Unwrap(cause) != nil {
				cause = errors.Unwrap(cause)
			}
			t.Fatalf("initial legacy write: %v; cause: %v", applyErr, cause)
		}
		for _, value := range []int{2, 3} {
			if applyErr := svc.Apply(ctx, SettingsBundle{Values: map[string]any{"a": value}}); applyErr != nil {
				t.Fatal(applyErr)
			}
		}
		var count int
		if scanErr := db.NewRaw("SELECT count(*) FROM admin_settings WHERE key = 'a' AND scope = 'site'").Scan(ctx, &count); scanErr != nil || count != 1 {
			t.Fatalf("duplicate null-user records %d %v", count, scanErr)
		}
		if db.Dialect().Name() == dialect.SQLite {
			if _, execContextErr := db.ExecContext(ctx, "UPDATE admin_settings SET value = 3 WHERE key = 'a'"); execContextErr != nil {
				t.Fatal(execContextErr)
			}
			old, readErr := svc.ResolveContext(ctx, "a", "")
			if readErr != nil || old.Value != float64(3) {
				t.Fatalf("existing numeric row: %+v %v", old, readErr)
			}
			if applyErr := svc.Apply(ctx, SettingsBundle{Values: map[string]any{"a": 3}}); applyErr != nil {
				t.Fatal(applyErr)
			}
		}
		sink := new(recordingSink)
		svc.WithActivitySink(sink)
		svc.RegisterDefinition(SettingDefinition{Key: "z", Type: "object", Default: 0})
		// JSON encoding fails after the first ordered write. Neither it nor activity
		// may survive: this reproduced partial persistence in the old adapter.
		if applyErr := svc.Apply(ctx, SettingsBundle{Values: map[string]any{"a": 4, "z": make(chan int)}}); applyErr == nil {
			t.Fatal("accepted invalid JSON value")
		}
		values, err := svc.ResolveAllContext(ctx, "")
		if err != nil {
			t.Fatal(err)
		}
		if values["a"].Value != float64(3) || values["z"].Value != 0 || len(sink.entries) != 0 {
			t.Fatalf("partial mutation or activity: %+v %+v", values, sink.entries)
		}
		canceled, cancel := context.WithCancel(ctx)
		cancel()
		if _, resolveContextErr := svc.ResolveContext(canceled, "a", ""); !errors.Is(resolveContextErr, context.Canceled) {
			t.Fatal(resolveContextErr)
		}
		if _, resolveContextErr := svc.ResolveContext(ctx, "missing", ""); resolveContextErr == nil {
			t.Fatal("missing key reported success")
		}
	})
}

func TestSettingsDocumentServiceCapabilities(t *testing.T) {
	svc := NewSettingsService()
	target := SettingsDocumentTarget{Namespace: "site", Scope: SettingsScopeSite}
	if _, readDocumentErr := svc.ReadDocument(context.Background(), target); readDocumentErr == nil {
		t.Fatal("memory service silently pretended to persist")
	}
	memory := NewGoOptionsSettingsAdapter()
	svc.UseAdapter(memory)
	svc.RegisterDefinition(SettingDefinition{Key: "managed", Type: "string", Default: "default", ApplicationManaged: true})
	if applyErr := svc.Apply(context.Background(), SettingsBundle{Values: map[string]any{"managed": "bypass"}}); applyErr == nil {
		t.Fatal("managed memory service bypass")
	}
	if applyErr := memory.Apply(context.Background(), SettingsBundle{Values: map[string]any{"managed": "bypass"}}); applyErr == nil {
		t.Fatal("managed memory adapter bypass")
	}
	if _, resolveContextErr := svc.ResolveContext(context.Background(), "managed", ""); resolveContextErr != nil {
		t.Fatal(resolveContextErr)
	}
	svc.Enable(false)
	if _, readDocumentErr := svc.ReadDocument(context.Background(), target); readDocumentErr == nil {
		t.Fatal("disabled document service accepted")
	}
	if _, resolveAllContextErr := svc.ResolveAllContext(context.Background(), ""); resolveAllContextErr == nil {
		t.Fatal("disabled reads accepted")
	}
}

func TestSettingsDocumentsGenericRouteRejectsManagedWrite(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureSettings)})
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()
	r := server.Router()
	adm.SettingsService().RegisterDefinition(SettingDefinition{Key: "crm.name", Default: "Default", Type: "string", ApplicationManaged: true})
	if initializeErr := adm.Initialize(r); initializeErr != nil {
		t.Fatal(initializeErr)
	}
	request := testHTTPRequest(http.MethodPost, "/admin/api/settings", strings.NewReader(`{"values":{"crm.name":"Bypassed"},"scope":"site"}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("managed route returned %d: %s", response.Code, response.Body.String())
	}
	if adm.SettingsService().Resolve("crm.name", "").Value != "Default" {
		t.Fatal("generic route changed application-managed value")
	}
}

func TestSettingsDocumentsConflictPresentation(t *testing.T) {
	original := &SettingsRevisionConflict{ExpectedRevision: 3}
	if _, ok := errors.AsType[*SettingsRevisionConflict](original); !ok {
		t.Fatal("typed conflict lost")
	}
	mapped, status := mapToGoError(original, nil)
	if status != http.StatusConflict || mapped.TextCode != TextCodeConflict {
		t.Fatalf("conflict presentation: %d %+v", status, mapped)
	}
}

func TestSettingsDocumentsPostgresReconnect(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		if db.Dialect().Name() != dialect.PG {
			t.Skip("SQLite file reopen is covered by Restart")
		}
		_, svc := settingsDocumentAdapter(t, db)
		target := SettingsDocumentTarget{Namespace: "reconnect", Scope: SettingsScopeSite}
		saved, err := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, Values: map[string]any{"name": "Durable"}})
		if err != nil {
			t.Fatal(err)
		}
		db.SetMaxIdleConns(0) // Close all idle connections; subsequent calls reconnect.
		adapter, err := NewBunSettingsAdapterWithConfig(db, BunSettingsAdapterConfig{SkipSchemaEnsure: true})
		if err != nil {
			t.Fatal(err)
		}
		adapter.RegisterDefinition(SettingDefinition{Key: "name", Type: "string", Default: "Default", ApplicationManaged: true})
		adapter.RegisterDefinition(SettingDefinition{Key: "days", Type: "number", Default: 30})
		fresh := NewSettingsService()
		fresh.UseAdapter(adapter)
		actual, err := fresh.ReadDocument(context.Background(), target)
		if err != nil {
			t.Fatal(err)
		}
		if actual.Identity != saved.Identity || actual.Revision != 1 || actual.Values["name"].Value != "Durable" {
			t.Fatalf("reconnect %+v", actual)
		}
	})
}
