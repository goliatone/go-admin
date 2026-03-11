package persistence

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	"github.com/uptrace/bun"
)

// StoreAdapter bridges runtime persistence bootstrap handles to the stores.Store contract.
// It uses SQL as the source of truth and hydrates a transaction-local in-memory projection
// only for executing the existing store business rules.
type StoreAdapter struct {
	sync    *runtimeRelationalStoreSync
	bunDB   *bun.DB
	dialect Dialect
}

var _ stores.Store = (*StoreAdapter)(nil)

// NewStoreAdapter creates the runtime store adapter backed by SQL transactions.
func NewStoreAdapter(bootstrap *BootstrapResult) (*StoreAdapter, func() error, error) {
	if bootstrap == nil {
		return nil, nil, fmt.Errorf("store adapter: bootstrap result is required")
	}
	if bootstrap.SQLDB == nil {
		return nil, nil, fmt.Errorf("store adapter: bootstrap sql db is required")
	}
	if bootstrap.BunDB == nil {
		return nil, nil, fmt.Errorf("store adapter: bootstrap bun db is required")
	}
	switch bootstrap.Dialect {
	case DialectSQLite, DialectPostgres:
	default:
		return nil, nil, fmt.Errorf("store adapter: unsupported runtime persistence dialect %q", bootstrap.Dialect)
	}

	sync, err := newRuntimeRelationalStoreSync(bootstrap)
	if err != nil {
		return nil, nil, err
	}
	return &StoreAdapter{
		sync:    sync,
		bunDB:   bootstrap.BunDB,
		dialect: bootstrap.Dialect,
	}, func() error { return nil }, nil
}

// WithTx executes fn inside a real SQL transaction and persists the row-level delta on commit.
func (s *StoreAdapter) WithTx(ctx context.Context, fn func(tx stores.TxStore) error) error {
	if fn == nil {
		return nil
	}
	if s == nil || s.sync == nil || s.bunDB == nil {
		return fmt.Errorf("store adapter: store is not configured")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	return s.bunDB.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if err := s.lockRuntimeTransaction(ctx, tx); err != nil {
			return err
		}
		before, err := s.sync.loadSnapshotWithIDB(ctx, tx)
		if err != nil {
			return fmt.Errorf("store adapter: load runtime snapshot: %w", err)
		}
		mem, err := inMemoryStoreFromRuntimeSnapshot(before)
		if err != nil {
			return fmt.Errorf("store adapter: hydrate runtime store: %w", err)
		}
		if err := fn(mem); err != nil {
			return err
		}
		after, err := runtimeSnapshotFromInMemoryStore(mem)
		if err != nil {
			return fmt.Errorf("store adapter: encode runtime snapshot: %w", err)
		}
		if err := validateRuntimeSnapshot(after); err != nil {
			return err
		}
		if err := s.sync.persistSnapshotDeltaTx(ctx, tx, before, after); err != nil {
			return err
		}
		return nil
	})
}

func (s *StoreAdapter) readStore(ctx context.Context) (*stores.InMemoryStore, error) {
	if s == nil || s.sync == nil {
		return nil, fmt.Errorf("store adapter: store is not configured")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	snapshot, err := s.sync.loadSnapshot(ctx)
	if err != nil {
		return nil, fmt.Errorf("store adapter: load runtime snapshot: %w", err)
	}
	return inMemoryStoreFromRuntimeSnapshot(snapshot)
}

func (s *StoreAdapter) readWithStore[T any](ctx context.Context, fn func(*stores.InMemoryStore) (T, error)) (T, error) {
	var zero T
	if fn == nil {
		return zero, nil
	}
	mem, err := s.readStore(ctx)
	if err != nil {
		return zero, err
	}
	return fn(mem)
}

func (s *StoreAdapter) writeWithTx[T any](ctx context.Context, fn func(stores.TxStore) (T, error)) (T, error) {
	var zero T
	if fn == nil {
		return zero, nil
	}
	var out T
	err := s.WithTx(ctx, func(tx stores.TxStore) error {
		var innerErr error
		out, innerErr = fn(tx)
		return innerErr
	})
	if err != nil {
		return zero, err
	}
	return out, nil
}

func (s *StoreAdapter) lockRuntimeTransaction(ctx context.Context, tx bun.Tx) error {
	if s == nil {
		return fmt.Errorf("store adapter: store is not configured")
	}
	if s.dialect != DialectPostgres {
		return nil
	}
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(937541221)`); err != nil {
		return fmt.Errorf("store adapter: acquire postgres runtime tx lock: %w", err)
	}
	return nil
}

func inMemoryStoreFromRuntimeSnapshot(snapshot runtimeStoreSnapshot) (*stores.InMemoryStore, error) {
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return nil, err
	}
	return stores.NewInMemoryStoreFromSnapshotPayload(payload)
}

func runtimeSnapshotFromInMemoryStore(mem *stores.InMemoryStore) (runtimeStoreSnapshot, error) {
	if mem == nil {
		return runtimeStoreSnapshot{}, fmt.Errorf("store adapter: tx store is not configured")
	}
	payload, err := mem.SnapshotPayload()
	if err != nil {
		return runtimeStoreSnapshot{}, err
	}
	snapshot := runtimeStoreSnapshot{}
	if err := json.Unmarshal(payload, &snapshot); err != nil {
		return runtimeStoreSnapshot{}, err
	}
	return snapshot, nil
}

// UpdateAuditEvent enforces append-only audit semantics at adapter boundary.
func (s *StoreAdapter) UpdateAuditEvent(ctx context.Context, scope stores.Scope, id string, patch stores.AuditEventRecord) error {
	if s == nil {
		return fmt.Errorf("store adapter: store is not configured")
	}
	return auditEventsAppendOnlyError()
}

// DeleteAuditEvent enforces append-only audit semantics at adapter boundary.
func (s *StoreAdapter) DeleteAuditEvent(ctx context.Context, scope stores.Scope, id string) error {
	if s == nil {
		return fmt.Errorf("store adapter: store is not configured")
	}
	return auditEventsAppendOnlyError()
}

func auditEventsAppendOnlyError() error {
	return goerrors.New("audit_events is append-only", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("AUDIT_EVENTS_APPEND_ONLY")
}
