package persistence

import (
	"context"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestLegacyPersistentStoreFromMemoryAllowsStaleTxOverwrite(t *testing.T) {
	store, err := stores.NewPersistentStoreFromMemory(stores.NewInMemoryStore(), func(context.Context, []byte) error { return nil })
	if err != nil {
		t.Fatalf("NewPersistentStoreFromMemory: %v", err)
	}
	scope := stores.Scope{TenantID: "tenant-race", OrgID: "org-race"}
	ctx := context.Background()
	draft := createRuntimeDraft(t, ctx, store, scope)

	enteredMutating := make(chan struct{})
	enteredStale := make(chan struct{})
	releaseMutating := make(chan struct{})
	releaseStale := make(chan struct{})
	mutatingDone := make(chan error, 1)
	staleDone := make(chan error, 1)

	go func() {
		mutatingDone <- store.WithTx(ctx, func(tx stores.TxStore) error {
			close(enteredMutating)
			<-releaseMutating
			return applyDraftSendMutation(ctx, tx, scope, draft.ID)
		})
	}()
	go func() {
		staleDone <- store.WithTx(ctx, func(tx stores.TxStore) error {
			close(enteredStale)
			<-releaseStale
			return nil
		})
	}()

	<-enteredMutating
	<-enteredStale
	close(releaseMutating)
	if err := <-mutatingDone; err != nil {
		t.Fatalf("mutating tx: %v", err)
	}
	close(releaseStale)
	if err := <-staleDone; err != nil {
		t.Fatalf("stale tx: %v", err)
	}

	if _, err := store.GetDraftSession(ctx, scope, draft.ID); err != nil {
		t.Fatalf("expected stale draft overwrite to restore draft, got %v", err)
	}
	agreements, err := store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		t.Fatalf("ListAgreements: %v", err)
	}
	if len(agreements) != 0 {
		t.Fatalf("expected stale overwrite to remove agreements, got %+v", agreements)
	}
	emailLogs, err := store.ListEmailLogs(ctx, scope, "agreement-race")
	if err != nil {
		t.Fatalf("ListEmailLogs: %v", err)
	}
	if len(emailLogs) != 0 {
		t.Fatalf("expected stale overwrite to remove email logs, got %+v", emailLogs)
	}
	jobRuns, err := store.ListJobRuns(ctx, scope, "agreement-race")
	if err != nil {
		t.Fatalf("ListJobRuns: %v", err)
	}
	if len(jobRuns) != 0 {
		t.Fatalf("expected stale overwrite to remove job runs, got %+v", jobRuns)
	}
}

func TestStoreAdapterPreservesCommittedStateUnderConcurrentWithTx(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "runtime-store-concurrency.db") + "?_busy_timeout=5000&_foreign_keys=on"
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = dsn
	cfg.Persistence.Postgres.DSN = ""

	bootstrap, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}
	defer func() { _ = bootstrap.Close() }()

	store, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	defer func() {
		if cleanup != nil {
			_ = cleanup()
		}
	}()

	scope := stores.Scope{TenantID: "tenant-runtime", OrgID: "org-runtime"}
	ctx := context.Background()
	draft := createRuntimeDraft(t, ctx, store, scope)

	enteredMutating := make(chan struct{})
	releaseMutating := make(chan struct{})
	mutatingDone := make(chan error, 1)
	staleDone := make(chan error, 1)
	staleEntered := make(chan struct{})

	go func() {
		mutatingDone <- store.WithTx(ctx, func(tx stores.TxStore) error {
			close(enteredMutating)
			<-releaseMutating
			return applyDraftSendMutation(ctx, tx, scope, draft.ID)
		})
	}()
	<-enteredMutating

	go func() {
		staleDone <- store.WithTx(ctx, func(tx stores.TxStore) error {
			close(staleEntered)
			return nil
		})
	}()

	close(releaseMutating)
	if err := <-mutatingDone; err != nil {
		t.Fatalf("mutating tx: %v", err)
	}
	<-staleEntered
	if err := <-staleDone; err != nil {
		t.Fatalf("stale tx: %v", err)
	}

	if _, err := store.GetDraftSession(ctx, scope, draft.ID); err == nil {
		t.Fatalf("expected draft deletion to persist")
	}
	agreement, err := store.GetAgreement(ctx, scope, "agreement-race")
	if err != nil {
		t.Fatalf("GetAgreement: %v", err)
	}
	if strings.TrimSpace(agreement.ID) != "agreement-race" {
		t.Fatalf("expected committed agreement, got %+v", agreement)
	}
	emailLogs, err := store.ListEmailLogs(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListEmailLogs: %v", err)
	}
	if len(emailLogs) != 1 {
		t.Fatalf("expected one committed email log, got %+v", emailLogs)
	}
	jobRuns, err := store.ListJobRuns(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListJobRuns: %v", err)
	}
	if len(jobRuns) != 1 {
		t.Fatalf("expected one committed job run, got %+v", jobRuns)
	}
}

func createRuntimeDraft(t *testing.T, ctx context.Context, store stores.Store, scope stores.Scope) stores.DraftRecord {
	t.Helper()
	draft, replay, err := store.CreateDraftSession(ctx, scope, stores.DraftRecord{
		ID:              "draft-race",
		WizardID:        "wizard-race",
		CreatedByUserID: "user-race",
		Title:           "Draft Race",
		WizardStateJSON: `{}`,
		CurrentStep:     2,
		UpdatedAt:       time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("CreateDraftSession: %v", err)
	}
	if replay {
		t.Fatalf("expected fresh draft create")
	}
	return draft
}

func applyDraftSendMutation(ctx context.Context, tx stores.TxStore, scope stores.Scope, draftID string) error {
	if _, err := tx.Create(ctx, scope, stores.DocumentRecord{
		ID:                 "document-race",
		CreatedByUserID:    "user-race",
		SourceObjectKey:    "tenant/tenant-race/org/org-race/docs/document-race/source.pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("a", 64),
	}); err != nil {
		return err
	}
	if _, err := tx.CreateDraft(ctx, scope, stores.AgreementRecord{
		ID:              "agreement-race",
		DocumentID:      "document-race",
		Title:           "Agreement Race",
		CreatedByUserID: "user-race",
	}); err != nil {
		return err
	}
	if _, err := tx.CreateEmailLog(ctx, scope, stores.EmailLogRecord{
		ID:           "email-race",
		AgreementID:  "agreement-race",
		TemplateCode: "agreement.sent",
		Status:       "queued",
	}); err != nil {
		return err
	}
	if _, _, err := tx.BeginJobRun(ctx, scope, stores.JobRunInput{
		JobName:     "jobs.esign.send",
		DedupeKey:   "job-race",
		AgreementID: "agreement-race",
		AttemptedAt: time.Now().UTC(),
	}); err != nil {
		return err
	}
	return tx.DeleteDraftSession(ctx, scope, draftID)
}

func TestStoreAdapterWithTxRollsBackOnPanic(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "runtime-store-panic.db") + "?_busy_timeout=5000&_foreign_keys=on"
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = dsn
	cfg.Persistence.Postgres.DSN = ""

	bootstrap, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}
	defer func() { _ = bootstrap.Close() }()

	store, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	defer func() {
		if cleanup != nil {
			_ = cleanup()
		}
	}()

	scope := stores.Scope{TenantID: "tenant-panic", OrgID: "org-panic"}
	defer func() {
		if recovered := recover(); recovered == nil {
			t.Fatalf("expected panic to propagate")
		}
		docs, listErr := store.List(context.Background(), scope, stores.DocumentQuery{})
		if listErr != nil {
			t.Fatalf("List after panic: %v", listErr)
		}
		if len(docs) != 0 {
			t.Fatalf("expected rollback on panic, got %+v", docs)
		}
	}()

	_ = store.WithTx(context.Background(), func(tx stores.TxStore) error {
		if _, err := tx.Create(context.Background(), scope, stores.DocumentRecord{
			ID:                 "doc-panic",
			CreatedByUserID:    "user-panic",
			SourceObjectKey:    "tenant/tenant-panic/org/org-panic/docs/doc-panic/source.pdf",
			SourceOriginalName: "source.pdf",
			SourceSHA256:       strings.Repeat("b", 64),
		}); err != nil {
			t.Fatalf("Create in panic tx: %v", err)
		}
		panic("store adapter panic rollback")
	})
}

func TestStoreAdapterConcurrentWithTxDoesNotRaceOnEntry(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "runtime-store-entry.db") + "?_busy_timeout=5000&_foreign_keys=on"
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = dsn
	cfg.Persistence.Postgres.DSN = ""

	bootstrap, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}
	defer func() { _ = bootstrap.Close() }()

	store, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	defer func() {
		if cleanup != nil {
			_ = cleanup()
		}
	}()

	scope := stores.Scope{TenantID: "tenant-entry", OrgID: "org-entry"}
	var wg sync.WaitGroup
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			_, _ = store.Create(context.Background(), scope, stores.DocumentRecord{
				ID:                 "doc-entry-" + time.Now().UTC().Format("150405.000000") + "-" + string(rune('a'+idx)),
				CreatedByUserID:    "user-entry",
				SourceObjectKey:    "tenant/tenant-entry/org/org-entry/docs/doc-entry/source.pdf",
				SourceOriginalName: "source.pdf",
				SourceSHA256:       strings.Repeat("c", 64),
			})
		}(i)
	}
	wg.Wait()
}
