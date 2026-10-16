package quickstart

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	command "github.com/goliatone/go-command"
	delivery "github.com/goliatone/go-export/adapters/delivery"
	deliverybun "github.com/goliatone/go-export/adapters/delivery/bun"
	exportjob "github.com/goliatone/go-export/adapters/job"
	"github.com/goliatone/go-export/export"
	job "github.com/goliatone/go-job"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type legacyTestTxKey struct{}
type legacyFixture struct {
	t            *testing.T
	db           *bun.DB
	h            *DurableExportHost
	cfg          DurableExportHostConfig
	actor        export.Actor
	secret       string
	allowProfile bool
	allowTarget  bool
	rollback     bool
	sourceCalls  atomic.Int64
	accepts      atomic.Int64
	sends        atomic.Int64
}
type legacyGuard struct{ f *legacyFixture }

func (g legacyGuard) AuthorizeExport(ctx context.Context, a export.Actor, _ export.ExportRequest, _ export.ResolvedDefinition) error {
	return g.f.principal(ctx, a)
}
func (g legacyGuard) AuthorizeDownload(ctx context.Context, a export.Actor, id string) error {
	if e := g.f.principal(ctx, a); e != nil {
		return e
	}
	var owner string
	if e := g.f.sql(ctx).NewSelect().Table("legacy_test_resources").Column("actor_id").Where("id=?", id).Scan(ctx, &owner); e != nil {
		return e
	}
	if owner != a.ID {
		return durableExportDenied()
	}
	return nil
}
func (f *legacyFixture) sql(ctx context.Context) bun.IDB {
	if tx, ok := ctx.Value(legacyTestTxKey{}).(bun.Tx); ok {
		return tx
	}
	return f.db
}
func (f *legacyFixture) principal(ctx context.Context, a export.Actor) error {
	var enabled int
	if a.ID != "actor-a" || a.Scope != f.actor.Scope {
		return durableExportDenied()
	}
	if e := f.sql(ctx).NewSelect().Table("legacy_test_principals").Column("enabled").Where("id=?", a.ID).Scan(ctx, &enabled); e != nil {
		return e
	}
	if enabled != 1 {
		return durableExportDenied()
	}
	return nil
}

type legacySource struct{ f *legacyFixture }

func (s legacySource) Open(context.Context, export.RowSourceSpec) (export.RowIterator, error) {
	s.f.sourceCalls.Add(1)
	return &legacyIterator{}, nil
}

type legacyIterator struct{ done bool }

func (r *legacyIterator) Next(context.Context) (export.Row, error) {
	if r.done {
		return nil, io.EOF
	}
	r.done = true
	return export.Row{"Group A retained row"}, nil
}
func (*legacyIterator) Close() error { return nil }

type legacySender struct{ f *legacyFixture }

func (s legacySender) SendReceipt(context.Context, delivery.WebhookDelivery) error {
	s.f.sends.Add(1)
	return nil
}

func newLegacyFixture(t *testing.T) *legacyFixture {
	t.Helper()
	var db *bun.DB
	if dsn := os.Getenv("INT15_POSTGRES_DSN"); dsn != "" {
		if os.Getenv("INT15_POSTGRES_DISPOSABLE") != "1" {
			t.Fatal("PostgreSQL must be explicitly disposable")
		}
		raw, e := sql.Open("postgres", dsn)
		if e != nil {
			t.Fatal(e)
		}
		raw.SetMaxOpenConns(1)
		schema := "int15_" + strings.ReplaceAll(uuid.NewString(), "-", "")
		if _, e = raw.ExecContext(context.Background(), "CREATE SCHEMA "+schema); e != nil {
			t.Fatal(e)
		}
		if _, e = raw.ExecContext(context.Background(), "SET search_path TO "+schema); e != nil {
			t.Fatal(e)
		}
		db = bun.NewDB(raw, pgdialect.New())
		t.Cleanup(func() {
			defer adoptionRecoveryClose(t, db)
			adoptionRecoveryExec(t, db, "DROP SCHEMA "+schema+" CASCADE")
		})
	} else {
		db = newScopeDriftDoctorBunDB(t)
	}
	blob := "BLOB"
	if db.Dialect().Name() == dialect.PG {
		blob = "BYTEA"
	}
	sqlSchema := `CREATE TABLE export_records (id TEXT PRIMARY KEY, definition TEXT, format TEXT, state TEXT, requested_by_id TEXT, requested_by_tenant_id TEXT, requested_by_workspace_id TEXT, requested_by_roles ` + blob + `, requested_by_details ` + blob + `, scope_tenant_id TEXT, scope_workspace_id TEXT, counts_processed BIGINT, counts_total BIGINT, counts_errors BIGINT, bytes_written BIGINT, artifact_key TEXT, artifact_meta ` + blob + `, request_payload ` + blob + `, created_at TIMESTAMP, started_at TIMESTAMP, completed_at TIMESTAMP, expires_at TIMESTAMP)`
	for _, q := range []string{sqlSchema, `CREATE TABLE legacy_test_principals(id TEXT PRIMARY KEY, enabled INTEGER)`, `INSERT INTO legacy_test_principals VALUES ('actor-a',1)`, `CREATE TABLE legacy_test_resources(id TEXT PRIMARY KEY, actor_id TEXT, namespace TEXT, maintenance INTEGER)`, `CREATE TABLE legacy_test_delegations(id TEXT PRIMARY KEY, actor_id TEXT, enabled INTEGER)`} {
		if _, e := db.Exec(q); e != nil {
			t.Fatal(e)
		}
	}
	f := &legacyFixture{t: t, db: db, actor: export.Actor{ID: "actor-a", Scope: export.Scope{TenantID: "tenant-independent"}}, secret: "synthetic-credential-v2", allowProfile: true, allowTarget: true}
	f.cfg = DurableExportHostConfig{DB: db, ArtifactRoot: t.TempDir(), Guard: legacyGuard{f}, ActorProvider: durableTestActor{},
		Namespace: func(ctx context.Context, a export.Actor) (string, error) {
			if e := f.principal(ctx, a); e != nil {
				return "", e
			}
			return "Group A", nil
		},
		WithTransaction: func(ctx context.Context, a export.Actor, fn func(context.Context, bun.Tx) error) error {
			return f.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
				ctx = context.WithValue(ctx, legacyTestTxKey{}, tx)
				if e := f.principal(ctx, a); e != nil {
					return e
				}
				if e := fn(ctx, tx); e != nil {
					return e
				}
				if f.rollback {
					return errors.New("injected outer rollback")
				}
				return nil
			})
		},
		AuthorizeRecordTransaction: func(ctx context.Context, tx bun.Tx, a export.Actor, id string) error {
			if e := f.principal(ctx, a); e != nil {
				return e
			}
			var n int
			n, e := tx.NewSelect().TableExpr("admin_export_host_owners o").Join("JOIN legacy_test_delegations d ON d.id=o.export_id").Where("o.export_id=? AND o.actor_id=? AND o.namespace=? AND d.actor_id=? AND d.enabled=1", id, a.ID, "Group A", a.ID).Count(ctx)
			if e != nil {
				return e
			}
			if n != 1 {
				return durableExportDenied()
			}
			return nil
		},
		AcceptBackground: func(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord) error {
			f.accepts.Add(1)
			_, e := tx.ExecContext(ctx, "INSERT INTO legacy_test_delegations VALUES (?,?,1)", rec.ID, a.ID)
			return e
		},
		ResolveBackground: func(ctx context.Context, w ExportBackgroundWork) (context.Context, export.Actor, error) {
			var n int
			n, e := f.db.NewSelect().Table("legacy_test_delegations").Where("id=? AND enabled=1", w.ExportID).Count(ctx)
			if e != nil {
				return ctx, export.Actor{}, e
			}
			if n != 1 {
				return ctx, export.Actor{}, durableExportDenied()
			}
			return ctx, f.actor, nil
		},
		Webhooks: &DurableExportWebhookConfig{Sender: legacySender{f}, Select: func(context.Context, export.Actor, export.ExportRecord) (deliverybun.ScheduleRequest, error) {
			return deliverybun.ScheduleRequest{}, errors.New("new-export selector must not replace adopted plan")
		},
			AuthorizeTarget: func(context.Context, export.Actor, string, deliverybun.Target) error {
				if !f.allowTarget {
					return durableExportDenied()
				}
				return nil
			}, Link: func(r export.ExportRecord) (string, error) { return "/admin/exports/" + r.ID + "/download", nil }},
		LegacyAdoption: &LegacyExportAdoptionConfig{Authorize: func(ctx context.Context, tx bun.Tx, a export.Actor, id, profile string) error {
			if !f.allowProfile || (profile != "profile-v2" && profile != "profile-v3") {
				return durableExportDenied()
			}
			var owner, ns string
			var fence int
			if e := tx.NewSelect().Table("legacy_test_resources").Column("actor_id", "namespace", "maintenance").Where("id=?", id).Scan(ctx, &owner, &ns, &fence); e != nil {
				return e
			}
			if owner != a.ID || ns != "Group A" || fence != 1 {
				return durableExportDenied()
			}
			return nil
		}, Select: func(_ context.Context, _ bun.Tx, _ export.Actor, r export.ExportRecord, _ string) (deliverybun.ScheduleRequest, error) {
			return deliverybun.ScheduleRequest{ExportID: r.ID, Key: "reviewed-notify-" + r.ID, Targets: []deliverybun.Target{{ID: "receiver", URL: "https://receiver.invalid/v2", Headers: map[string]string{"Authorization": "Bearer " + f.secret}}}, Metadata: map[string]any{"integer": int64(9007199254740993)}}, nil
		}},
	}
	f.h = f.newHost()
	if e := f.h.Migrate(context.Background()); e != nil {
		t.Fatal(e)
	}
	return f
}
func (f *legacyFixture) newHost() *DurableExportHost {
	f.t.Helper()
	runner := export.NewRunner()
	adoptionRecoveryMust(f.t, runner.Definitions.Register(export.ExportDefinition{Name: "resources", RowSourceKey: "resources", Schema: export.Schema{Columns: []export.Column{{Name: "label"}}}, AllowedFormats: []export.Format{export.FormatCSV}, DefaultFilename: "retained.csv"}))
	adoptionRecoveryMust(f.t, runner.RowSources.Register("resources", func(export.ExportRequest, export.ResolvedDefinition) (export.RowSource, error) {
		return legacySource{f}, nil
	}))
	h, e := NewDurableExportHost(f.cfg, WithExportRunner(runner))
	if e != nil {
		f.t.Fatal(e)
	}
	return h
}
func (f *legacyFixture) record(id string, state export.ExportState) {
	f.t.Helper()
	rec := export.ExportRecord{ID: id, Definition: "resources", Format: export.FormatCSV, State: state, RequestedBy: export.Actor{ID: "untrusted-legacy-actor", Roles: []string{"superadmin"}}, Request: export.ExportRequest{Definition: "resources", Format: export.FormatCSV, Delivery: export.DeliveryAsync}, CreatedAt: time.Now().UTC().Truncate(time.Second)}
	if state == export.StateCompleted {
		ref, e := f.h.replay.Service.Store.Put(context.Background(), id, strings.NewReader("retained bytes\n"), export.ArtifactMeta{Filename: "retained.csv", ContentType: "text/csv", CreatedAt: rec.CreatedAt, ExpiresAt: time.Now().UTC().Add(time.Hour)})
		if e != nil {
			f.t.Fatal(e)
		}
		rec.Artifact = ref
		rec.BytesWritten = ref.Meta.Size
		rec.CompletedAt = rec.CreatedAt
	}
	if _, e := f.h.Tracker.Start(context.Background(), rec); e != nil {
		f.t.Fatal(e)
	}
	if _, e := f.db.Exec("INSERT INTO legacy_test_resources VALUES (?, 'actor-a','Group A',1)", id); e != nil {
		f.t.Fatal(e)
	}
}
func (f *legacyFixture) review(id string) LegacyExportAdoptionRequest {
	f.t.Helper()
	r, e := f.h.PreviewLegacyExport(context.Background(), f.actor, id, "profile-v2")
	if e != nil {
		f.t.Fatal(e)
	}
	return LegacyExportAdoptionRequest{ExportID: r.ExportID, ProfileRef: r.ProfileRef, RecordSHA256: r.RecordSHA256, PlanSHA256: r.PlanSHA256}
}
func (f *legacyFixture) count(table string) int {
	f.t.Helper()
	n, e := f.db.NewSelect().Table(table).Count(context.Background())
	if e != nil {
		f.t.Fatal(e)
	}
	return n
}
func (f *legacyFixture) noAdoption() {
	f.t.Helper()
	for _, table := range []string{"admin_export_host_owners", "legacy_test_delegations", "export_webhook_completion_plans", "export_webhook_targets", "export_webhook_operations", "queue_messages", "admin_export_legacy_adoptions"} {
		if n := f.count(table); n != 0 {
			f.t.Fatalf("partial writes %s=%d", table, n)
		}
	}
}
func (f *legacyFixture) apply(r LegacyExportAdoptionRequest) LegacyExportAdoptionResult {
	f.t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	out, e := f.h.AdoptLegacyExport(ctx, f.actor, r)
	if e != nil {
		f.t.Fatal(e)
	}
	return out
}

func TestLegacyExportAdoptionQueuedWorkerAndRestart(t *testing.T) {
	f := newLegacyFixture(t)
	f.record("queued", export.StateQueued)
	r := f.review("queued")
	f.noAdoption()
	raw := adoptionRecoveryJSON(t, AdoptLegacyExport{Actor: f.actor, Request: r})
	if strings.Contains(string(raw), "synthetic-credential") || strings.Contains(string(raw), "actor-a") {
		t.Fatal("command serialized credentials or trusted actor")
	}
	bus := admin.NewCommandBus(true)
	handler := &AdoptLegacyExportHandler{Service: f.h}
	if _, e := admin.RegisterCommand(bus, handler); e != nil {
		t.Fatal(e)
	}
	out, e := handler.Run(context.Background(), AdoptLegacyExport{Actor: f.actor, Request: r})
	if e != nil || out.Replayed {
		t.Fatal(out, e)
	}
	if f.count("queue_messages") != 1 || f.count("export_webhook_completion_plans") != 1 || f.accepts.Load() != 1 {
		t.Fatal("adoption not atomic")
	}
	var plan string
	if e = f.db.NewSelect().Table("export_webhook_completion_plans").Column("request").Scan(context.Background(), &plan); e != nil || !strings.Contains(plan, "9007199254740993") {
		t.Fatal("plan precision lost", e)
	}
	f.h = f.newHost()
	if out = f.apply(r); !out.Replayed || f.accepts.Load() != 1 {
		t.Fatal("restart renewed delegation")
	}
	m, receipt, e := f.h.Queue.Dequeue(context.Background())
	if e != nil {
		t.Fatal(e)
	}
	if m == nil {
		t.Fatal("generation not queued")
	}
	payload := adoptionRecoveryJSON(t, m)
	if strings.Contains(string(payload), "superadmin") || strings.Contains(string(payload), f.secret) {
		t.Fatal("queue copied legacy authority or profile credential")
	}
	if e = f.h.ExecuteMessage(context.Background(), m); e != nil {
		t.Fatal(e)
	}
	if e = f.h.Queue.Ack(context.Background(), receipt); e != nil {
		t.Fatal(e)
	}
	rec, e := f.h.Tracker.Status(context.Background(), "queued")
	if e != nil || rec.State != export.StateCompleted || f.sourceCalls.Load() != 1 {
		t.Fatal("native generation failed", e, rec.State)
	}
	if f.count("export_webhook_targets") != 1 {
		t.Fatal("completion not published")
	}
	f.apply(r)
	if f.sourceCalls.Load() != 1 || f.accepts.Load() != 1 || f.count("admin_export_legacy_adoptions") != 1 {
		t.Fatal("adoption replay repeated effects")
	}
}
func TestLegacyExportAdoptionCompletedPreservesBytes(t *testing.T) {
	f := newLegacyFixture(t)
	f.record("completed", export.StateCompleted)
	r := f.review("completed")
	f.noAdoption()
	f.apply(r)
	f.h = f.newHost()
	if !f.apply(r).Replayed {
		t.Fatal("completed replay not recognized")
	}
	rec, e := f.h.Tracker.Status(context.Background(), "completed")
	if e != nil {
		t.Fatal(e)
	}
	reader, _, e := f.h.replay.Service.Store.Open(context.Background(), rec.Artifact.Key)
	if e != nil {
		t.Fatal(e)
	}
	body, readErr := io.ReadAll(reader)
	adoptionRecoveryClose(t, reader)
	adoptionRecoveryMust(t, readErr)
	if string(body) != "retained bytes\n" || f.sourceCalls.Load() != 0 || f.count("queue_messages") != 1 || f.accepts.Load() != 1 {
		t.Fatal("completed bytes regenerated or work duplicated")
	}
	m, receipt, e := f.h.Queue.Dequeue(context.Background())
	if e != nil {
		t.Fatal(e)
	}
	f.allowTarget = false
	if e = f.h.ExecuteMessage(context.Background(), m); e == nil || f.sends.Load() != 0 {
		t.Fatal("revoked credential/target policy allowed external send")
	}
	f.allowTarget = true
	if e = f.h.ExecuteMessage(context.Background(), m); e != nil {
		t.Fatal(e)
	}
	if e = f.h.Queue.Ack(context.Background(), receipt); e != nil {
		t.Fatal(e)
	}
	f.apply(r)
	if f.sends.Load() != 1 || f.count("queue_messages") != 0 {
		t.Fatal("acknowledged delivery repeated")
	}
	if _, e = f.db.Exec("DELETE FROM export_webhook_targets"); e != nil {
		t.Fatal(e)
	}
	if _, e = f.h.AdoptLegacyExport(context.Background(), f.actor, r); e == nil {
		t.Fatal("pruned receipt recreated")
	}
}
func TestLegacyExportAdoptionRejectsReviewDrift(t *testing.T) {
	for _, name := range []string{"request", "request-precision", "credential", "endpoint", "profile", "foreign-owner", "unfenced", "account-disabled", "target-revoked", "unsupported", "no-request", "existing-plan", "artifact-missing", "artifact-metadata"} {
		t.Run(name, func(t *testing.T) {
			f := newLegacyFixture(t)
			state := export.StateQueued
			if strings.HasPrefix(name, "artifact") {
				state = export.StateCompleted
			}
			f.record("export", state)
			if name == "request-precision" {
				var payload []byte
				adoptionRecoveryMust(t, f.db.NewSelect().Table("export_records").Column("request_payload").Scan(context.Background(), &payload))
				payload = []byte(strings.Replace(string(payload), `"Query":null`, `"Query":{"number":9007199254740992}`, 1))
				if _, e := f.db.Exec("UPDATE export_records SET request_payload=?", payload); e != nil {
					t.Fatal(e)
				}
			}
			r := f.review("export")
			switch name {
			case "request":
				var payload []byte
				adoptionRecoveryMust(t, f.db.NewSelect().Table("export_records").Column("request_payload").Scan(context.Background(), &payload))
				payload = []byte(strings.Replace(string(payload), `"Query":null`, `"Query":{"number":9007199254740993}`, 1))
				adoptionRecoveryExec(t, f.db, "UPDATE export_records SET request_payload=?", payload)
			case "request-precision":
				var payload []byte
				adoptionRecoveryMust(t, f.db.NewSelect().Table("export_records").Column("request_payload").Scan(context.Background(), &payload))
				payload = []byte(strings.Replace(string(payload), "9007199254740992", "9007199254740993", 1))
				if _, e := f.db.Exec("UPDATE export_records SET request_payload=?", payload); e != nil {
					t.Fatal(e)
				}
			case "credential":
				f.secret = "changed-profile-content"
			case "endpoint":
				old := f.cfg.LegacyAdoption.Select
				f.h.cfg.LegacyAdoption.Select = func(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord, p string) (deliverybun.ScheduleRequest, error) {
					req, e := old(ctx, tx, a, rec, p)
					req.Targets[0].URL = "https://other.invalid"
					return req, e
				}
			case "profile":
				r.ProfileRef = "profile-v3"
			case "foreign-owner":
				adoptionRecoveryExec(t, f.db, "UPDATE legacy_test_resources SET actor_id='actor-b'")
			case "unfenced":
				adoptionRecoveryExec(t, f.db, "UPDATE legacy_test_resources SET maintenance=0")
			case "account-disabled":
				adoptionRecoveryExec(t, f.db, "UPDATE legacy_test_principals SET enabled=0")
			case "target-revoked":
				f.allowTarget = false
			case "unsupported":
				adoptionRecoveryExec(t, f.db, "UPDATE export_records SET state='running'")
			case "no-request":
				adoptionRecoveryExec(t, f.db, "UPDATE export_records SET request_payload=NULL")
				r = f.review("export")
			case "existing-plan":
				adoptionRecoveryExec(t, f.db, "INSERT INTO export_webhook_completion_plans (export_id,namespace,owner,request,digest) VALUES ('export','Group A','old','{}','old')")
			case "artifact-missing":
				adoptionRecoveryMust(t, f.h.replay.Service.Store.Delete(context.Background(), "export"))
			case "artifact-metadata":
				adoptionRecoveryExec(t, f.db, "UPDATE export_records SET artifact_meta=?", []byte(`{"filename":"wrong","size":15}`))
				r = f.review("export")
			}
			result, e := f.h.AdoptLegacyExport(context.Background(), f.actor, r)
			if e == nil || result.ExportID != "" {
				t.Fatalf("unsafe adoption acknowledged: %s %+v", name, result)
			}
			if name == "existing-plan" {
				if f.count("queue_messages") != 0 || f.count("admin_export_legacy_adoptions") != 0 {
					t.Fatal("existing intent modified")
				}
			} else {
				f.noAdoption()
			}
		})
	}
}
func TestLegacyExportAdoptionRollbackAndReceiptFault(t *testing.T) {
	for _, state := range []export.ExportState{export.StateQueued, export.StateCompleted} {
		for _, fault := range []string{"outer-rollback", "receipt-sql-fault"} {
			t.Run(string(state)+"/"+fault, func(t *testing.T) {
				f := newLegacyFixture(t)
				f.record("export", state)
				r := f.review("export")
				if fault == "outer-rollback" {
					f.rollback = true
				} else {
					if f.db.Dialect().Name() == dialect.PG {
						adoptionRecoveryExec(t, f.db, `CREATE FUNCTION reject_adoption() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'adoption-fault'; END $$`)
						adoptionRecoveryExec(t, f.db, `CREATE TRIGGER reject_adoption BEFORE INSERT ON admin_export_legacy_adoptions FOR EACH ROW EXECUTE FUNCTION reject_adoption()`)
					} else {
						adoptionRecoveryExec(t, f.db, `CREATE TRIGGER reject_adoption BEFORE INSERT ON admin_export_legacy_adoptions BEGIN SELECT RAISE(ABORT,'adoption-fault'); END`)
					}
				}
				result, e := f.h.AdoptLegacyExport(context.Background(), f.actor, r)
				if e == nil || result.ExportID != "" {
					t.Fatal("rollback acknowledged")
				}
				f.rollback = false
				f.noAdoption()
				if fault == "receipt-sql-fault" {
					if f.db.Dialect().Name() == dialect.PG {
						_, e = f.db.Exec("DROP TRIGGER reject_adoption ON admin_export_legacy_adoptions")
					} else {
						_, e = f.db.Exec("DROP TRIGGER reject_adoption")
					}
					if e != nil {
						t.Fatal(e)
					}
				}
				f.apply(r)
				if f.count("admin_export_legacy_adoptions") != 1 {
					t.Fatal("retry failed")
				}
			})
		}
	}
}
func TestLegacyExportAdoptionConcurrentAndRevokedReplay(t *testing.T) {
	f := newLegacyFixture(t)
	f.record("export", export.StateQueued)
	r := f.review("export")
	var wg sync.WaitGroup
	errs := make(chan error, 8)
	for range 8 {
		wg.Go(func() { ; _, e := f.h.AdoptLegacyExport(context.Background(), f.actor, r); errs <- e })
	}
	wg.Wait()
	close(errs)
	for e := range errs {
		if e != nil {
			t.Fatal(e)
		}
	}
	if f.accepts.Load() != 1 || f.count("queue_messages") != 1 {
		t.Fatal("concurrent adoption duplicated")
	}
	for _, name := range []string{"profile-content", "profile-revoked", "target-revoked", "delegation-revoked", "plan-missing"} {
		t.Run(name, func(t *testing.T) {
			switch name {
			case "profile-content":
				f.secret = "new-credential"
			case "profile-revoked":
				f.secret = "synthetic-credential-v2"
				f.allowProfile = false
			case "target-revoked":
				f.allowProfile = true
				f.allowTarget = false
			case "delegation-revoked":
				f.allowTarget = true
				adoptionRecoveryExec(t, f.db, "UPDATE legacy_test_delegations SET enabled=0")
			case "plan-missing":
				adoptionRecoveryExec(t, f.db, "UPDATE legacy_test_delegations SET enabled=1")
				adoptionRecoveryExec(t, f.db, "DELETE FROM export_webhook_completion_plans")
			}
			if _, e := f.h.AdoptLegacyExport(context.Background(), f.actor, r); e == nil {
				t.Fatal("revoked/corrupt replay permitted")
			}
		})
	}
	if f.accepts.Load() != 1 || f.count("queue_messages") != 1 {
		t.Fatal("replay renewed authority or work")
	}
}
func TestLegacyExportAdoptionDisabledAndCommandValidation(t *testing.T) {
	var h *DurableExportHost
	if _, e := h.PreviewLegacyExport(context.Background(), export.Actor{ID: "actor"}, "id", "profile"); e == nil {
		t.Fatal("nil host accepted")
	}
	f := newLegacyFixture(t)
	f.h.cfg.LegacyAdoption = nil
	if _, e := f.h.PreviewLegacyExport(context.Background(), f.actor, "id", "profile"); e == nil {
		t.Fatal("disabled migration accepted")
	}
	for name, m := range map[string]AdoptLegacyExport{"missing-actor": {}, "invalid-digests": {Actor: f.actor, Request: LegacyExportAdoptionRequest{ExportID: "id", ProfileRef: "p"}}, "oversized-profile": {Actor: f.actor, Request: LegacyExportAdoptionRequest{ExportID: "id", ProfileRef: strings.Repeat("x", 513), RecordSHA256: strings.Repeat("a", 64), PlanSHA256: strings.Repeat("b", 64)}}} {
		t.Run(name, func(t *testing.T) {
			if m.Validate() == nil {
				t.Fatal("invalid command accepted")
			}
		})
	}
	if (AdoptLegacyExport{}).Type() != AdoptLegacyExportCommand {
		t.Fatal("unstable command identity")
	}
	if _, e := (&AdoptLegacyExportHandler{}).Run(context.Background(), AdoptLegacyExport{Actor: f.actor, Request: LegacyExportAdoptionRequest{ExportID: "id", ProfileRef: "p", RecordSHA256: strings.Repeat("a", 64), PlanSHA256: strings.Repeat("b", 64)}}); e == nil {
		t.Fatal("missing service accepted")
	}
}

// Old queue messages are at-least-once transport, never background authority.
// Adoption adds one recoverable message, while native generation reuses the
// same export/artifact if a retained pre-plan message is delivered too.
func TestLegacyExportAdoptionRetainedQueueDelivery(t *testing.T) {
	f := newLegacyFixture(t)
	f.record("export", export.StateQueued)
	rec, e := f.h.Tracker.Status(context.Background(), "export")
	if e != nil {
		t.Fatal(e)
	}
	payload, e := json.Marshal(exportjob.Payload{ExportID: rec.ID, Actor: export.Actor{ID: "forged-admin", Roles: []string{"superadmin"}}, Request: rec.Request})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.h.Queue.Enqueue(context.Background(), &job.ExecutionMessage{JobID: exportjob.DefaultGenerateTaskID, ScriptPath: exportjob.DefaultGenerateTaskPath, IdempotencyKey: rec.ID, Parameters: map[string]any{"payload": json.RawMessage(payload)}}); e != nil {
		t.Fatal(e)
	}
	r := f.review("export")
	f.apply(r)
	for range 2 {
		m, receipt, e := f.h.Queue.Dequeue(context.Background())
		if e != nil || m == nil {
			t.Fatal(e)
		}
		if e = f.h.ExecuteMessage(context.Background(), m); e != nil {
			t.Fatal(e)
		}
		if e = f.h.Queue.Ack(context.Background(), receipt); e != nil {
			t.Fatal(e)
		}
	}
	if f.sourceCalls.Load() != 1 || f.count("export_webhook_targets") != 1 || f.accepts.Load() != 1 {
		t.Fatal("retained queue message repeated protected effects")
	}
}
func TestLegacyExportAdoptionStorageReopen(t *testing.T) {
	for _, state := range []export.ExportState{export.StateQueued, export.StateCompleted} {
		t.Run(string(state), func(t *testing.T) {
			f := newLegacyFixture(t)
			f.record("export", state)
			r := f.review("export")
			f.apply(r)
			var reopened *bun.DB
			if f.db.Dialect().Name() == dialect.PG {
				var schema string
				if e := f.db.QueryRow("SELECT current_schema()").Scan(&schema); e != nil {
					t.Fatal(e)
				}
				if !strings.HasPrefix(schema, "int15_") {
					t.Fatal("unexpected schema")
				}
				raw, e := sql.Open("postgres", os.Getenv("INT15_POSTGRES_DSN"))
				if e != nil {
					t.Fatal(e)
				}
				raw.SetMaxOpenConns(1)
				if _, e = raw.ExecContext(context.Background(), "SET search_path TO "+schema); e != nil {
					t.Fatal(e)
				}
				reopened = bun.NewDB(raw, pgdialect.New())
			} else {
				// Full native SQL snapshot includes the new receipt, private owner/delegation,
				// completion/delivery plan and pending queue state.
				backup := filepath.Join(t.TempDir(), "restored.db")
				if _, e := f.db.Exec("VACUUM INTO ?", backup); e != nil {
					t.Fatal(e)
				}
				raw, e := sql.Open(sqliteshim.ShimName, "file:"+backup+"?_fk=1")
				if e != nil {
					t.Fatal(e)
				}
				raw.SetMaxOpenConns(1)
				reopened = bun.NewDB(raw, sqlitedialect.New())
				newRoot := t.TempDir()
				e = filepath.WalkDir(f.cfg.ArtifactRoot, func(path string, d os.DirEntry, e error) error {
					if e != nil {
						return e
					}
					rel, e := filepath.Rel(f.cfg.ArtifactRoot, path)
					if e != nil {
						return e
					}
					dest := filepath.Join(newRoot, rel)
					if d.IsDir() {
						return os.MkdirAll(dest, 0700)
					}
					bytes, e := os.ReadFile(path)
					if e != nil {
						return e
					}
					return os.WriteFile(dest, bytes, 0600)
				})
				if e != nil {
					t.Fatal(e)
				}
				f.cfg.ArtifactRoot = newRoot
			}
			t.Cleanup(func() { adoptionRecoveryClose(t, reopened) })
			f.db = reopened
			f.cfg.DB = reopened
			f.h = f.newHost()
			if e := f.h.CheckReady(context.Background()); e != nil {
				t.Fatal(e)
			}
			if !f.apply(r).Replayed || f.accepts.Load() != 1 || f.count("queue_messages") != 1 {
				t.Fatal("reopen/restore lost adoption identity")
			}
		})
	}
}
func TestLegacyExportAdoptionCommandResultAndCurrentPolicy(t *testing.T) {
	f := newLegacyFixture(t)
	f.record("export", export.StateQueued)
	r := f.review("export")
	collector := &command.Result[LegacyExportAdoptionResult]{}
	ctx := command.ContextWithResult(context.Background(), collector)
	handler := &AdoptLegacyExportHandler{Service: f.h}
	if e := handler.Execute(ctx, AdoptLegacyExport{Actor: f.actor, Request: r}); e != nil {
		t.Fatal(e)
	}
	if f.count("admin_export_legacy_adoptions") != 1 {
		t.Fatal("typed command did not invoke service")
	}
	if value, ok := collector.Load(); !ok || value.ExportID != "export" || value.Replayed {
		t.Fatal("typed result not captured", value, ok)
	}
	if _, e := f.db.Exec("UPDATE legacy_test_principals SET enabled=0"); e != nil {
		t.Fatal(e)
	}
	if e := handler.Execute(ctx, AdoptLegacyExport{Actor: f.actor, Request: r}); e == nil {
		t.Fatal("typed replay bypassed current policy")
	}
	if f.accepts.Load() != 1 {
		t.Fatal("denied command renewed delegation")
	}
}
