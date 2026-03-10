package persistence

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func newSQLiteBootstrapForStoreAdapterTests(t *testing.T) *BootstrapResult {
	t.Helper()
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Migrations.LocalOnly = true
	cfg.SQLite.DSN = "file:" + filepath.Join(t.TempDir(), "phase4-store-adapter.db") + "?_fk=1&_busy_timeout=5000"

	result, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}
	t.Cleanup(func() { _ = result.Close() })
	return result
}

func TestNewStoreAdapterSQLiteProvidesStoreAndCleanup(t *testing.T) {
	bootstrap := newSQLiteBootstrapForStoreAdapterTests(t)
	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter sqlite: %v", err)
	}
	if adapter == nil {
		t.Fatalf("expected store adapter instance")
	}
	if cleanup == nil {
		t.Fatalf("expected store adapter cleanup function")
	}
	if err := cleanup(); err != nil {
		t.Fatalf("store adapter cleanup: %v", err)
	}
}

func TestStoreAdapterWithTxRollsBackOnCallbackError(t *testing.T) {
	bootstrap := newSQLiteBootstrapForStoreAdapterTests(t)
	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	t.Cleanup(func() { _ = cleanup() })

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase4", OrgID: "org-phase4"}
	sentinel := errors.New("phase4 rollback sentinel")

	err = adapter.WithTx(ctx, func(tx stores.TxStore) error {
		_, createErr := tx.Create(ctx, scope, stores.DocumentRecord{
			ID:              "doc-rollback",
			SourceObjectKey: "tenant/tenant-phase4/org/org-phase4/docs/doc-rollback.pdf",
			SourceSHA256:    strings.Repeat("a", 64),
		})
		if createErr != nil {
			return createErr
		}
		return sentinel
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected callback error %v, got %v", sentinel, err)
	}

	docs, listErr := adapter.List(ctx, scope, stores.DocumentQuery{})
	if listErr != nil {
		t.Fatalf("List: %v", listErr)
	}
	if len(docs) != 0 {
		t.Fatalf("expected rollback to keep zero docs, got %d", len(docs))
	}
}

func TestStoreAdapterPreservesOptimisticLockVersionConflicts(t *testing.T) {
	bootstrap := newSQLiteBootstrapForStoreAdapterTests(t)
	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	t.Cleanup(func() { _ = cleanup() })

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase4-opt", OrgID: "org-phase4-opt"}

	agreement, err := adapter.CreateDraft(ctx, scope, stores.AgreementRecord{
		DocumentID: "doc-opt-lock",
		Title:      "Phase4 Optimistic Lock",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	_, err = adapter.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
		ToStatus:        stores.AgreementStatusSent,
		ExpectedVersion: agreement.Version + 99,
	})
	if err == nil {
		t.Fatalf("expected optimistic lock version conflict")
	}
	if !strings.Contains(err.Error(), "VERSION_CONFLICT") {
		t.Fatalf("expected VERSION_CONFLICT text code, got %v", err)
	}
}

func TestStoreAdapterAuditEventsRemainAppendOnly(t *testing.T) {
	bootstrap := newSQLiteBootstrapForStoreAdapterTests(t)
	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	t.Cleanup(func() { _ = cleanup() })

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase4-audit", OrgID: "org-phase4-audit"}

	event, err := adapter.Append(ctx, scope, stores.AuditEventRecord{
		AgreementID: "agreement-phase4",
		EventType:   "agreement.created",
		ActorType:   "user",
		ActorID:     "phase4-user",
	})
	if err != nil {
		t.Fatalf("Append: %v", err)
	}

	if err := adapter.UpdateAuditEvent(ctx, scope, event.ID, event); err == nil {
		t.Fatalf("expected append-only update rejection")
	} else if !strings.Contains(err.Error(), "AUDIT_EVENTS_APPEND_ONLY") {
		t.Fatalf("expected AUDIT_EVENTS_APPEND_ONLY text code, got %v", err)
	}

	if err := adapter.DeleteAuditEvent(ctx, scope, event.ID); err == nil {
		t.Fatalf("expected append-only delete rejection")
	} else if !strings.Contains(err.Error(), "AUDIT_EVENTS_APPEND_ONLY") {
		t.Fatalf("expected AUDIT_EVENTS_APPEND_ONLY text code, got %v", err)
	}
}
