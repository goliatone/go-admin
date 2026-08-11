package admin

import (
	"context"
	"database/sql"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type observingBunTranslationApplyLedger struct {
	*BunTranslationExchangeRuntimeStore
	reserveCalls chan struct{}
}

func (l *observingBunTranslationApplyLedger) ReserveApplyRecord(ctx context.Context, identity translationTransportIdentity, linkageKey, payloadHash string, now, leaseUntil time.Time) (translationExchangeApplyReservation, translationExchangeAppliedRecord, string, error) {
	reservation, record, state, err := l.BunTranslationExchangeRuntimeStore.ReserveApplyRecord(ctx, identity, linkageKey, payloadHash, now, leaseUntil)
	select {
	case l.reserveCalls <- struct{}{}:
	default:
	}
	return reservation, record, state, err
}

func setupTranslationExchangeClaimDB(t *testing.T) *bun.DB {
	t.Helper()
	dsn := "file:" + filepath.Join(t.TempDir(), "exchange-claims.db") + "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)"
	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(8)
	db := bun.NewDB(sqlDB, sqlitedialect.New())
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Errorf("close translation exchange claim database: %v", err)
		}
	})
	statements := []string{
		`CREATE TABLE exchange_jobs (
			job_id TEXT PRIMARY KEY, tenant_id TEXT, org_id TEXT, kind TEXT NOT NULL, status TEXT NOT NULL,
			created_by TEXT NOT NULL, permission TEXT, request_hash TEXT, request_json TEXT NOT NULL DEFAULT '{}',
			progress_json TEXT NOT NULL DEFAULT '{}', summary_json TEXT NOT NULL DEFAULT '{}', result_json TEXT NOT NULL DEFAULT '{}',
			retention_json TEXT NOT NULL DEFAULT '{}', error TEXT, request_id TEXT, trace_id TEXT, poll_endpoint TEXT,
			worker_id TEXT, started_at TEXT, completed_at TEXT, heartbeat_at TEXT, lease_expires_at TEXT, deleted_at TEXT,
			created_at TEXT NOT NULL, updated_at TEXT NOT NULL
		)`,
		`CREATE UNIQUE INDEX ux_exchange_jobs_active_scope_request_hash
			ON exchange_jobs(COALESCE(tenant_id, ''), COALESCE(org_id, ''), created_by, kind, request_hash)
			WHERE request_hash IS NOT NULL AND request_hash <> '' AND deleted_at IS NULL`,
		`CREATE TABLE translation_exchange_job_rows (
			job_id TEXT NOT NULL, row_index INTEGER NOT NULL, tenant_id TEXT, org_id TEXT, kind TEXT NOT NULL, status TEXT,
			input_json TEXT NOT NULL DEFAULT '{}', result_json TEXT NOT NULL DEFAULT '{}', linkage_key TEXT, payload_hash TEXT,
			seen_registered INTEGER NOT NULL DEFAULT 0, create_translation INTEGER NOT NULL DEFAULT 0, applied_at TEXT,
			created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (job_id, row_index)
		)`,
		`CREATE TABLE translation_exchange_job_artifacts (
			job_id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT, filename TEXT, content_type TEXT, content_bytes BLOB,
			created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (job_id, kind)
		)`,
		`CREATE TABLE translation_exchange_apply_ledger (
			ledger_id TEXT PRIMARY KEY, tenant_id TEXT, org_id TEXT, linkage_key TEXT NOT NULL, payload_hash TEXT NOT NULL,
			create_translation INTEGER NOT NULL DEFAULT 0, workflow_status TEXT, applied_at TEXT NOT NULL, request_json TEXT NOT NULL DEFAULT '{}',
			status TEXT NOT NULL DEFAULT 'applied', claim_token TEXT, lease_expires_at TEXT
		)`,
		`CREATE UNIQUE INDEX ux_translation_exchange_apply_ledger_scope_payload
			ON translation_exchange_apply_ledger(COALESCE(tenant_id, ''), COALESCE(org_id, ''), linkage_key, payload_hash)`,
	}
	for _, statement := range statements {
		if _, err := db.ExecContext(context.Background(), statement); err != nil {
			t.Fatal(err)
		}
	}
	return db
}

func TestBunTranslationExchangeRuntimeStoreCoalescesConcurrentApplyJobs(t *testing.T) {
	db := setupTranslationExchangeClaimDB(t)
	storeA := NewBunTranslationExchangeRuntimeStore(db)
	storeB := NewBunTranslationExchangeRuntimeStore(db)
	identity := translationTransportIdentity{ActorID: "actor-1", TenantID: "tenant-1", OrgID: "org-1"}
	job := translationExchangeAsyncJob{
		Kind: translationExchangeJobKindImportApply, Status: translationExchangeAsyncJobStatusRunning,
		CreatedBy: identity.ActorID, TenantID: identity.TenantID, OrgID: identity.OrgID, RequestHash: "request-hash",
	}
	rows := []TranslationExchangeRow{{Index: 0, Resource: "pages", EntityID: "1"}}
	stores := []*BunTranslationExchangeRuntimeStore{storeA, storeB}
	start := make(chan struct{})
	ids := make(chan string, len(stores))
	errs := make(chan error, len(stores))
	var wg sync.WaitGroup
	for _, store := range stores {
		wg.Add(1)
		go func(store *BunTranslationExchangeRuntimeStore) {
			defer wg.Done()
			<-start
			created, _, err := store.CreateOrGetApplyJob(context.Background(), identity, job, rows)
			errs <- err
			ids <- created.ID
		}(store)
	}
	close(start)
	wg.Wait()
	close(ids)
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	unique := map[string]struct{}{}
	for id := range ids {
		unique[id] = struct{}{}
	}
	if len(unique) != 1 {
		t.Fatalf("durable request hash created %d jobs: %v", len(unique), unique)
	}
	count, err := db.NewSelect().Table("translation_exchange_job_rows").Count(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("expected one durable job row, got %d", count)
	}
}

func TestBunTranslationExchangeApplyClaimCoalescesServiceInstances(t *testing.T) {
	db := setupTranslationExchangeClaimDB(t)
	key := TranslationExchangeLinkageKey{Resource: "pages", EntityID: "1", FamilyID: "family-1", TargetLocale: "es", FieldPath: "title"}
	store := &blockingTranslationExchangeStore{
		stubTranslationExchangeStore: stubTranslationExchangeStore{resolve: map[string]TranslationExchangeLinkage{
			key.String(): {Key: key, TargetExists: true},
		}},
		started: make(chan struct{}, 1), release: make(chan struct{}),
	}
	ledgerA := &observingBunTranslationApplyLedger{BunTranslationExchangeRuntimeStore: NewBunTranslationExchangeRuntimeStore(db), reserveCalls: make(chan struct{}, 8)}
	ledgerB := &observingBunTranslationApplyLedger{BunTranslationExchangeRuntimeStore: NewBunTranslationExchangeRuntimeStore(db), reserveCalls: make(chan struct{}, 8)}
	serviceA := NewTranslationExchangeService(store, WithTranslationExchangeApplyRecordStore(ledgerA))
	serviceB := NewTranslationExchangeService(store, WithTranslationExchangeApplyRecordStore(ledgerB))
	input := TranslationImportApplyInput{Rows: []TranslationExchangeRow{{
		Resource: "pages", EntityID: "1", FamilyID: "family-1", TargetLocale: "es", FieldPath: "title", TranslatedText: "Hola",
	}}}
	errs := make(chan error, 2)
	go func() { _, err := serviceA.ApplyImport(context.Background(), input); errs <- err }()
	select {
	case <-store.started:
	case <-time.After(time.Second):
		t.Fatal("first service did not reach apply boundary")
	}
	go func() { _, err := serviceB.ApplyImport(context.Background(), input); errs <- err }()
	select {
	case <-ledgerB.reserveCalls:
	case <-time.After(time.Second):
		t.Fatal("second service did not observe durable pending claim")
	}
	store.mu.Lock()
	count := len(store.apply)
	store.mu.Unlock()
	if count != 1 {
		t.Fatalf("durable pending claim allowed %d writes", count)
	}
	close(store.release)
	for range 2 {
		if err := <-errs; err != nil {
			t.Fatal(err)
		}
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	if len(store.apply) != 1 {
		t.Fatalf("durable claim executed %d writes", len(store.apply))
	}
}
