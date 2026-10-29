package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io/fs"
	"net/url"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	users "github.com/goliatone/go-users"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

// Each dialect uses the same contract. Custom adapters can reuse these cases
// with a store factory, including independent connections and reopen semantics.
func ingestionTestDatabase(t *testing.T, postgres bool) (*bun.DB, func() *bun.DB) {
	t.Helper()
	ctx := context.Background()
	driver := "sqlite3"
	dsn := "file:" + filepath.Join(t.TempDir(), "activity.db") + "?_busy_timeout=5000&_journal_mode=WAL&_foreign_keys=on"
	if postgres {
		driver = "postgres"
		dsn = os.Getenv("GO_ADMIN_TEST_POSTGRES_DSN")
		if dsn == "" {
			t.Skip("set GO_ADMIN_TEST_POSTGRES_DSN to a disposable PostgreSQL database")
		}
		base, err := sql.Open(driver, dsn)
		if err != nil {
			t.Fatal(err)
		}
		schema := "activity_ingestion_" + uuid.New().String()
		schema = stringsForSchema(schema)
		if _, err = base.ExecContext(ctx, `CREATE SCHEMA "`+schema+`"`); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { _, _ = base.ExecContext(ctx, `DROP SCHEMA "`+schema+`" CASCADE`); _ = base.Close() })
		parsed, err := url.Parse(dsn)
		if err != nil {
			t.Fatal(err)
		}
		q := parsed.Query()
		q.Set("search_path", schema)
		parsed.RawQuery = q.Encode()
		dsn = parsed.String()
	}
	open := func() *bun.DB {
		raw, err := sql.Open(driver, dsn)
		if err != nil {
			t.Fatal(err)
		}
		raw.SetMaxOpenConns(8)
		var db *bun.DB
		if postgres {
			db = bun.NewDB(raw, pgdialect.New())
		} else {
			db = bun.NewDB(raw, sqlitedialect.New())
		}
		t.Cleanup(func() { _ = db.Close() })
		return db
	}
	db := open()
	store, _ := NewBunActivityIngestionStore(db)
	if store.CheckReady(ctx) == nil {
		t.Fatal("missing schema reported ready")
	}
	prefix := "data/sql/migrations/"
	if !postgres {
		prefix += "sqlite/"
	}
	for _, name := range []string{"00004_user_activity.up.sql", "00011_activity_scopes.tx.up.sql"} {
		raw, err := fs.ReadFile(users.GetMigrationsFS(), prefix+name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = db.ExecContext(ctx, string(raw)); err != nil {
			t.Fatal(err)
		}
	}
	if err := EnsureActivityIngestionSchema(ctx, db); err != nil {
		t.Fatal(err)
	}
	if err := store.CheckReady(ctx); err != nil {
		t.Fatal(err)
	}
	return db, open
}
func stringsForSchema(s string) string {
	out := []byte(s)
	for i, c := range out {
		if c == '-' {
			out[i] = '_'
		}
	}
	return string(out)
}
func ingestionTestReceipt(id string) (ActivityIngestionReceipt, types.ActivityRecord) {
	e := ingestionTestEvent()
	e.EventID = id
	now := time.Now().UTC().Truncate(time.Microsecond)
	aid := uuid.New()
	fp, _ := ActivityIngestionFingerprint(e, 1)
	r := ActivityIngestionReceipt{ProducerID: "billing", EventID: id, Scope: e.Scope, FingerprintVersion: 1, Fingerprint: fp, ResultVersion: 1, Result: ActivityIngestResult{ActivityID: aid, EventID: id, Scope: e.Scope, OccurredAt: e.OccurredAt, ReceivedAt: now}, ActorKind: "user", Attribution: "producer_attested", ActorID: uuid.MustParse(ingestActor)}
	record := types.ActivityRecord{ID: aid, ActorID: r.ActorID, TenantID: uuid.MustParse(ingestTenant), OrgID: uuid.MustParse(ingestOrg), Verb: e.Action, ObjectType: e.Object.Type, ObjectID: e.Object.ID, Channel: e.Channel, OccurredAt: e.OccurredAt, Data: map[string]any{"large": json.Number("9007199254740993"), "amount": json.Number("123.000000000000000001")}}
	return r, record
}
func runActivityIngestionStoreContract(t *testing.T, postgres bool) {
	db, reopen := ingestionTestDatabase(t, postgres)
	s, _ := NewBunActivityIngestionStore(db)
	ctx := context.Background()
	receipt, record := ingestionTestReceipt("store-event")
	err := s.WithinTransaction(ctx, func(tx ActivityIngestionTransaction) error {
		ok, err := tx.Reserve(ctx, receipt)
		if err != nil {
			return err
		}
		if !ok {
			t.Fatal("first reservation lost")
		}
		return tx.Append(ctx, record)
	})
	if err != nil {
		t.Fatal(err)
	}
	second, _ := NewBunActivityIngestionStore(reopen())
	binding, err := second.Binding(ctx, "billing", "store-event")
	if err != nil || binding == nil || *binding != receipt.Scope {
		t.Fatal("restart binding", binding, err)
	}
	err = second.WithinTransaction(ctx, func(tx ActivityIngestionTransaction) error {
		ok, err := tx.Reserve(ctx, receipt)
		if err != nil {
			return err
		}
		if ok {
			t.Fatal("replay reserved twice")
		}
		got, err := tx.Receipt(ctx, "billing", "store-event", receipt.Scope)
		if err != nil {
			return err
		}
		if got == nil || got.Result != receipt.Result || got.Fingerprint != receipt.Fingerprint || got.Attribution != receipt.Attribution {
			t.Fatalf("unstable receipt %+v", got)
		}
		wrong := receipt.Scope
		wrong.OrgID = ingestActor
		denied, err := tx.Receipt(ctx, "billing", "store-event", wrong)
		if err != nil {
			return err
		}
		if denied != nil {
			t.Fatal("cross-scope receipt disclosed")
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	scope := types.ScopeFilter{TenantID: record.TenantID, OrgID: record.OrgID}
	page, err := s.repository.ListActivity(ctx, types.ActivityFilter{Scope: scope})
	if err != nil {
		t.Fatal(err)
	}
	if len(page.Records) != 1 {
		t.Fatalf("want one record, got %d", len(page.Records))
	}
	data := page.Records[0].Data
	if data["large"] != json.Number("9007199254740993") || data["amount"] != json.Number("123.000000000000000001") {
		t.Fatal("numbers rounded", data)
	}
	identities, err := s.ResolveActivityReadIdentities(ctx, ActivityReadContext{Scope: scope}, []types.ActivityRecord{record})
	if err != nil || identities[record.ID].ActorKind != "user" {
		t.Fatal("identity", identities, err)
	}
	changed := record
	changed.UserID = uuid.New()
	if _, err = s.ResolveActivityReadIdentities(ctx, ActivityReadContext{Scope: scope}, []types.ActivityRecord{changed}); err == nil {
		t.Fatal("identity mismatch accepted")
	}
	for _, name := range []string{"callback-rollback", "append-rollback", "cancel-rollback"} {
		r, entry := ingestionTestReceipt(name)
		sentinel := errors.New("rollback")
		err = s.WithinTransaction(ctx, func(tx ActivityIngestionTransaction) error {
			ok, err := tx.Reserve(ctx, r)
			if err != nil {
				return err
			}
			if !ok {
				t.Fatal("reservation failed")
			}
			if name == "append-rollback" {
				entry.ID = record.ID
				return tx.Append(ctx, entry)
			}
			if err = tx.Append(ctx, entry); err != nil {
				return err
			}
			if name == "cancel-rollback" {
				return context.Canceled
			}
			return sentinel
		})
		if err == nil {
			t.Fatal("rollback returned success")
		}
		binding, err = s.Binding(ctx, r.ProducerID, r.EventID)
		if err != nil || binding != nil {
			t.Fatal("orphan receipt", binding, err)
		}
	}
	// A deferred database constraint fails at commit after both writes succeed.
	if _, err = db.ExecContext(ctx, "CREATE TABLE ingestion_commit_parent (id INTEGER PRIMARY KEY); CREATE TABLE ingestion_commit_child (id INTEGER REFERENCES ingestion_commit_parent(id) DEFERRABLE INITIALLY DEFERRED)"); err != nil {
		t.Fatal(err)
	}
	failedReceipt, failedEntry := ingestionTestReceipt("commit-rollback")
	err = s.WithinTransaction(ctx, func(tx ActivityIngestionTransaction) error {
		if _, err := tx.Reserve(ctx, failedReceipt); err != nil {
			return err
		}
		if err := tx.Append(ctx, failedEntry); err != nil {
			return err
		}
		_, err := tx.(*bunActivityIngestionTx).tx.ExecContext(ctx, "INSERT INTO ingestion_commit_child(id) VALUES (123)")
		return err
	})
	if err == nil {
		t.Fatal("failed commit returned success")
	}
	if binding, err := s.Binding(ctx, failedReceipt.ProducerID, failedReceipt.EventID); err != nil || binding != nil {
		t.Fatal("commit failure retained receipt", binding, err)
	}
	var failedCount int
	if err := db.NewSelect().Table("user_activity").ColumnExpr("count(*)").Where("id = ?", failedEntry.ID).Scan(ctx, &failedCount); err != nil || failedCount != 0 {
		t.Fatal("commit failure retained activity", failedCount, err)
	}
	// Different casing remains a distinct opaque producer-wide event identity.
	r, entry := ingestionTestReceipt("Store-event")
	if err = s.WithinTransaction(ctx, func(tx ActivityIngestionTransaction) error {
		ok, err := tx.Reserve(ctx, r)
		if err != nil {
			return err
		}
		if !ok {
			t.Fatal("case folded")
		}
		return tx.Append(ctx, entry)
	}); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	var winners atomic.Int32
	errs := make(chan error, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			other, _ := NewBunActivityIngestionStore(reopen())
			r, entry := ingestionTestReceipt("concurrent")
			if i%2 == 1 {
				r.Scope.OrgID = ingestActor
				r.Result.Scope = r.Scope
				entry.OrgID = uuid.MustParse(ingestActor)
			}
			for attempts := 0; attempts < 3; attempts++ {
				err := other.WithinTransaction(ctx, func(tx ActivityIngestionTransaction) error {
					ok, err := tx.Reserve(ctx, r)
					if err != nil {
						return err
					}
					if !ok {
						return nil
					}
					if err = tx.Append(ctx, entry); err != nil {
						return err
					}
					winners.Add(1)
					return nil
				})
				if errors.Is(err, ErrActivityIngestionContention) {
					continue
				}
				errs <- err
				return
			}
			errs <- ErrActivityIngestionContention
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	if winners.Load() != 1 {
		t.Fatal("concurrent winners", winners.Load())
	}
	if _, err = db.NewDelete().Table("user_activity").Where("id = ?", record.ID).Exec(ctx); err != nil {
		t.Fatal(err)
	}
	binding, err = s.Binding(ctx, "billing", "store-event")
	if err != nil || binding == nil {
		t.Fatal("receipt deleted with activity")
	}
	canceled, cancel := context.WithCancel(ctx)
	cancel()
	if err = s.WithinTransaction(canceled, func(ActivityIngestionTransaction) error { return nil }); err == nil {
		t.Fatal("canceled transaction succeeded")
	}
}
func TestActivityIngestionStoreSQLite(t *testing.T)   { runActivityIngestionStoreContract(t, false) }
func TestActivityIngestionStorePostgres(t *testing.T) { runActivityIngestionStoreContract(t, true) }
