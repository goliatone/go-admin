package persistence

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

import appcfg "github.com/goliatone/go-admin/examples/esign/config"
import "github.com/goliatone/go-admin/examples/esign/stores"

func newPostgresBootstrapForStoreAdapterTests(t *testing.T) *BootstrapResult {
	t.Helper()
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectPostgres
	cfg.Persistence.Postgres.DSN = requirePostgresTestDSN(t)
	cfg.Persistence.SQLite.DSN = ""

	result, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap postgres: %v", err)
	}
	t.Cleanup(func() { _ = result.Close() })
	return result
}

func TestStoreAdapterPostgresWithTxRollsBackOnCallbackError(t *testing.T) {
	bootstrap := newPostgresBootstrapForStoreAdapterTests(t)
	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter postgres: %v", err)
	}
	t.Cleanup(func() { _ = cleanup() })

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-postgres-rollback", OrgID: "org-postgres-rollback"}
	sentinel := errors.New("postgres rollback sentinel")

	err = adapter.WithTx(ctx, func(tx stores.TxStore) error {
		_, createErr := tx.Create(ctx, scope, stores.DocumentRecord{
			ID:                 "doc-postgres-rollback",
			CreatedByUserID:    "user-postgres-rollback",
			SourceObjectKey:    "tenant/tenant-postgres-rollback/org/org-postgres-rollback/docs/doc-postgres-rollback.pdf",
			SourceOriginalName: "source.pdf",
			SourceSHA256:       strings.Repeat("a", 64),
		})
		if createErr != nil {
			return createErr
		}
		return sentinel
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected callback error %v, got %v", sentinel, err)
	}

	docs, err := adapter.List(ctx, scope, stores.DocumentQuery{})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(docs) != 0 {
		t.Fatalf("expected rollback to keep zero docs, got %+v", docs)
	}
}

func TestStoreAdapterPostgresTxReadVisibilityAndRollbackForRelationalReads(t *testing.T) {
	bootstrap := newPostgresBootstrapForStoreAdapterTests(t)
	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter postgres: %v", err)
	}
	t.Cleanup(func() { _ = cleanup() })

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-postgres-read", OrgID: "org-postgres-read"}
	document, err := adapter.Create(ctx, scope, stores.DocumentRecord{
		ID:                 "doc-postgres-read",
		CreatedByUserID:    "user-postgres-read",
		SourceObjectKey:    "tenant/tenant-postgres-read/org/org-postgres-read/docs/doc-postgres-read.pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("c", 64),
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}

	sentinel := errors.New("postgres relational read rollback sentinel")
	dispatchID := "dispatch-postgres-read"

	err = adapter.WithTx(ctx, func(tx stores.TxStore) error {
		if _, err := tx.SaveRemediationDispatch(ctx, scope, stores.RemediationDispatchRecord{
			DispatchID:     dispatchID,
			DocumentID:     document.ID,
			IdempotencyKey: "idem-postgres-read",
			Mode:           "async",
			Accepted:       true,
			UpdatedAt:      time.Now().UTC(),
		}); err != nil {
			return err
		}
		record, err := tx.GetRemediationDispatchByIdempotencyKey(ctx, scope, "idem-postgres-read")
		if err != nil {
			return err
		}
		if record.DispatchID != dispatchID || !record.Accepted {
			t.Fatalf("unexpected tx remediation dispatch: %+v", record)
		}
		return sentinel
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected callback error %v, got %v", sentinel, err)
	}

	if _, err := adapter.GetRemediationDispatchByIdempotencyKey(ctx, scope, "idem-postgres-read"); !relationalIsNotFoundError(err) {
		t.Fatalf("expected remediation dispatch rollback to remove record, got %v", err)
	}
}

func TestStoreAdapterPostgresPreservesCommittedStateUnderConcurrentWithTx(t *testing.T) {
	bootstrap := newPostgresBootstrapForStoreAdapterTests(t)
	store, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter postgres: %v", err)
	}
	t.Cleanup(func() { _ = cleanup() })

	scope := stores.Scope{TenantID: "tenant-postgres-runtime", OrgID: "org-postgres-runtime"}
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

func TestStoreAdapterPostgresWithTxRollsBackOnPanic(t *testing.T) {
	bootstrap := newPostgresBootstrapForStoreAdapterTests(t)
	store, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter postgres: %v", err)
	}
	t.Cleanup(func() { _ = cleanup() })

	scope := stores.Scope{TenantID: "tenant-postgres-panic", OrgID: "org-postgres-panic"}
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
			ID:                 "doc-postgres-panic",
			CreatedByUserID:    "user-postgres-panic",
			SourceObjectKey:    "tenant/tenant-postgres-panic/org/org-postgres-panic/docs/doc-postgres-panic.pdf",
			SourceOriginalName: "source.pdf",
			SourceSHA256:       strings.Repeat("b", 64),
		}); err != nil {
			return err
		}
		panic("postgres panic sentinel")
	})
}
