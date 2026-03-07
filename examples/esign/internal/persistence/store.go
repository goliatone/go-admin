package persistence

import (
	"context"
	"fmt"
	"net/http"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

// StoreAdapter bridges runtime persistence bootstrap handles to the stores.Store contract.
type StoreAdapter struct {
	stores.Store
}

var _ stores.Store = (*StoreAdapter)(nil)

// NewStoreAdapter creates the phase-4 runtime store adapter.
func NewStoreAdapter(bootstrap *BootstrapResult) (*StoreAdapter, func() error, error) {
	if bootstrap == nil {
		return nil, nil, fmt.Errorf("store adapter: bootstrap result is required")
	}

	switch bootstrap.Dialect {
	case DialectSQLite:
		sqliteStore, err := stores.NewSQLiteStore(bootstrap.DSN)
		if err != nil {
			return nil, nil, fmt.Errorf("store adapter: open sqlite store from bootstrap dsn: %w", err)
		}
		return &StoreAdapter{
			Store: sqliteStore,
		}, sqliteStore.Close, nil
	case DialectPostgres:
		return nil, nil, fmt.Errorf("postgres runtime requires injected Bun-backed stores.Store; sqlite fallback is disabled")
	default:
		return nil, nil, fmt.Errorf("store adapter: unsupported runtime persistence dialect %q", bootstrap.Dialect)
	}
}

// WithTx delegates to the underlying store transaction semantics.
func (s *StoreAdapter) WithTx(ctx context.Context, fn func(tx stores.TxStore) error) error {
	if fn == nil {
		return nil
	}
	if s == nil || s.Store == nil {
		return fmt.Errorf("store adapter: store is not configured")
	}
	return s.Store.WithTx(ctx, fn)
}

// UpdateAuditEvent enforces append-only audit semantics at adapter boundary.
func (s *StoreAdapter) UpdateAuditEvent(ctx context.Context, scope stores.Scope, id string, patch stores.AuditEventRecord) error {
	if s == nil || s.Store == nil {
		return fmt.Errorf("store adapter: store is not configured")
	}
	mutator, ok := s.Store.(interface {
		UpdateAuditEvent(context.Context, stores.Scope, string, stores.AuditEventRecord) error
	})
	if !ok {
		return auditEventsAppendOnlyError()
	}
	return mutator.UpdateAuditEvent(ctx, scope, id, patch)
}

// DeleteAuditEvent enforces append-only audit semantics at adapter boundary.
func (s *StoreAdapter) DeleteAuditEvent(ctx context.Context, scope stores.Scope, id string) error {
	if s == nil || s.Store == nil {
		return fmt.Errorf("store adapter: store is not configured")
	}
	mutator, ok := s.Store.(interface {
		DeleteAuditEvent(context.Context, stores.Scope, string) error
	})
	if !ok {
		return auditEventsAppendOnlyError()
	}
	return mutator.DeleteAuditEvent(ctx, scope, id)
}

func auditEventsAppendOnlyError() error {
	return goerrors.New("audit_events is append-only", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("AUDIT_EVENTS_APPEND_ONLY")
}
