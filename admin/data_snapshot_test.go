package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/data/examples/sqlitestore"
	router "github.com/goliatone/go-router"
)

type snapshotProvider struct {
	moduleCatalogProvider
	catalogs, describes atomic.Int64
	before              func(context.Context) error
	empty               bool
}

func (p *snapshotProvider) Catalog(ctx context.Context, principal data.Principal, key data.TargetKey, limit int) ([]data.DatasetRef, error) {
	p.catalogs.Add(1)
	if p.empty {
		return nil, nil
	}
	if p.before != nil {
		if err := p.before(ctx); err != nil {
			return nil, err
		}
	}
	return p.moduleCatalogProvider.Catalog(ctx, principal, key, limit)
}
func (p *snapshotProvider) Describe(ctx context.Context, principal data.Principal, ref data.DatasetRef) (data.Descriptor, error) {
	p.describes.Add(1)
	return p.moduleCatalogProvider.Describe(ctx, principal, ref)
}

type snapshotStore struct {
	data.OperationStore
	targets, operations, receipts, getOps, getReceipts atomic.Int64
}

func (s *snapshotStore) Target(ctx context.Context, k data.TargetKey) (data.TargetState, error) {
	s.targets.Add(1)
	return s.OperationStore.Target(ctx, k)
}
func (s *snapshotStore) ListOperations(ctx context.Context, k data.TargetKey, l int) ([]data.Operation, error) {
	s.operations.Add(1)
	return s.OperationStore.ListOperations(ctx, k, l)
}
func (s *snapshotStore) ListReceipts(ctx context.Context, k data.TargetKey, q data.ReceiptQuery) (data.ReceiptPage, error) {
	s.receipts.Add(1)
	return s.OperationStore.ListReceipts(ctx, k, q)
}
func (s *snapshotStore) GetOperation(ctx context.Context, id string) (data.Operation, error) {
	s.getOps.Add(1)
	return s.OperationStore.GetOperation(ctx, id)
}
func (s *snapshotStore) GetReceipt(ctx context.Context, id string) (data.PreparationReceipt, error) {
	s.getReceipts.Add(1)
	return s.OperationStore.GetReceipt(ctx, id)
}

type snapshotPolicy struct {
	check func(context.Context, data.Principal, data.AccessRequest) error
}

func (p snapshotPolicy) Authorize(ctx context.Context, principal data.Principal, request data.AccessRequest) error {
	if p.check != nil {
		return p.check(ctx, principal, request)
	}
	return nil
}
func snapshotFixture(t *testing.T, before func(context.Context) error, policy snapshotPolicy) (*DataModule, *snapshotProvider, *snapshotStore, context.Context, console.Identity) {
	t.Helper()
	store, err := sqlitestore.Open(filepath.Join(t.TempDir(), "snapshot.db"), sqlitestore.Options{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := store.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	wrapped := &snapshotStore{OperationStore: store}
	hash := strings.Repeat("a", 64)
	d := data.Descriptor{Dataset: data.DatasetRef{Provider: "sample", ID: "a", Version: "1"}, SourceContractHash: hash, SourceContractVersion: "1", PolicyHash: hash, Capabilities: map[data.Kind]data.Capability{data.Validate: {Supported: true}, data.Prepare: {Supported: true}}}
	d.Scenarios = []data.ScenarioRef{{Dataset: d.Dataset, ID: "ready", Version: "1", ProfileHash: hash}}
	d.Dataset.Digest, err = d.CompositeDigest()
	if err != nil {
		t.Fatal(err)
	}
	d.Scenarios[0].Dataset = d.Dataset
	provider := &snapshotProvider{moduleCatalogProvider: moduleCatalogProvider{dataRegistrationProvider{descriptor: d}}, before: before}
	principal := data.Principal{ActorID: "operator", ExecutionID: "operator", ScopeKey: "org", ModuleHash: hash, PolicyHash: hash, PermissionHash: hash}
	ctx := context.WithValue(t.Context(), dataRegistrationPrincipalKey{}, principal)
	service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"sample": provider}, Target: dataRegistrationTarget{}, Store: wrapped, Policy: policy, Resolve: func(ctx context.Context) (data.Principal, error) {
		p, ok := ctx.Value(dataRegistrationPrincipalKey{}).(data.Principal)
		if !ok {
			return p, data.Error(data.CodeDenied)
		}
		return p, nil
	}})
	if err != nil {
		t.Fatal(err)
	}
	identity := console.Identity{ConsoleID: "data", ApplicationID: "test", EnvironmentID: "dev", ActorID: principal.ActorID, ScopeKey: principal.ScopeKey}
	m, err := NewDataModule(DataModuleConfig{Service: service, TargetID: "preview", Enabled: func() bool { return true }, ResolveIdentity: func(ctx context.Context) (console.Identity, error) {
		p, ok := ctx.Value(dataRegistrationPrincipalKey{}).(data.Principal)
		if !ok {
			return console.Identity{}, ErrForbidden
		}
		out := identity
		out.ActorID = p.ActorID
		out.ScopeKey = p.ScopeKey
		return out, nil
	}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := m.Close(); err != nil {
			t.Error(err)
		}
	})
	return m, provider, wrapped, ctx, identity
}
func TestDataSnapshotProjectionReadBudget(t *testing.T) {
	m, p, s, ctx, id := snapshotFixture(t, nil, snapshotPolicy{})
	start := time.Now()
	snap, err := m.Console().Snapshot(ctx, id)
	t.Logf("elapsed=%s catalog=%d describe=%d active=%d operations=%d receipts=%d pinned_operation=%d pinned_receipt=%d", time.Since(start), p.catalogs.Load(), p.describes.Load(), s.targets.Load(), s.operations.Load(), s.receipts.Load(), s.getOps.Load(), s.getReceipts.Load())
	if err != nil || len(snap.Panels) != len(DataPanelIDs()) {
		t.Fatal(snap, err)
	}
	if p.catalogs.Load() != 1 || p.describes.Load() != 1 || s.targets.Load() != 1 || s.operations.Load() != 1 || s.receipts.Load() != 1 {
		t.Fatal("snapshot rebuilt its projection")
	}
}

func TestDataSnapshotConcurrentIsolationAndCancellation(t *testing.T) {
	started := make(chan struct{})
	var block atomic.Bool
	block.Store(true)
	m, p, _, ctx, id := snapshotFixture(t, func(ctx context.Context) error {
		principal := snapshotPrincipal(t, ctx)
		if principal.ActorID == "operator" && block.Load() {
			close(started)
			<-ctx.Done()
			return ctx.Err()
		}
		return nil
	}, snapshotPolicy{})
	slow, cancel := context.WithCancel(ctx)
	result := make(chan error, 1)
	go func() { _, err := m.Console().Snapshot(slow, id); result <- err }()
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("snapshot did not start")
	}
	other := snapshotPrincipal(t, ctx)
	other.ActorID = "other"
	other.ExecutionID = "other"
	other.ScopeKey = "another-org"
	otherCtx := context.WithValue(ctx, dataRegistrationPrincipalKey{}, other)
	otherID := id
	otherID.ActorID = other.ActorID
	otherID.ScopeKey = other.ScopeKey
	snap, err := m.Console().Snapshot(otherCtx, otherID)
	if err != nil || snap.Identity != otherID || len(snap.Panels) != len(DataPanelIDs()) {
		t.Fatal("slow snapshot serialized another actor", snap, err)
	}
	cancel()
	select {
	case snapshotErr := <-result:
		if !errors.Is(snapshotErr, context.Canceled) || errors.Is(snapshotErr, ErrForbidden) {
			t.Fatal("cancellation became denial", snapshotErr)
		}
	case <-time.After(time.Second):
		t.Fatal("canceled provider leaked work")
	}
	block.Store(false)
	snap, err = m.Console().Snapshot(ctx, id)
	if err != nil || snap.Identity != id || p.catalogs.Load() != 3 {
		t.Fatal("request projection crossed actors or survived cancellation", snap, err)
	}
}

func TestDataSnapshotFreshGrantsAfterConstruction(t *testing.T) {
	for _, what := range []string{"view", "execute", "scope"} {
		t.Run(what, func(t *testing.T) {
			var revoked atomic.Bool
			m, _, _, ctx, id := snapshotFixture(t, nil, snapshotPolicy{check: func(_ context.Context, _ data.Principal, a data.AccessRequest) error {
				if revoked.Load() && (what == "view" || what == "execute" && a.Action != "view") {
					return data.Error(data.CodeDenied)
				}
				return nil
			}})
			original := m.host.config.Snapshot
			m.host.config.Snapshot = func(ctx context.Context, id console.Identity, panel string) ([]console.Record, error) {
				rows, err := original(ctx, id, panel)
				revoked.Store(true)
				return rows, err
			}
			if what == "scope" {
				resolve := m.config.ResolveIdentity
				m.config.ResolveIdentity = func(ctx context.Context) (console.Identity, error) {
					current, err := resolve(ctx)
					if revoked.Load() {
						current.ScopeKey = "another-org"
					}
					return current, err
				}
			}
			snap, err := m.Console().Snapshot(ctx, id)
			if what != "execute" {
				if !errors.Is(err, ErrForbidden) || len(snap.Panels) != 0 {
					t.Fatal("stale read identity delivered", snap, err)
				}
				return
			}
			if err != nil || len(snap.Panels) != len(DataPanelIDs()) {
				t.Fatal("execute denial removed viewer access", snap, err)
			}
			for _, panel := range snap.Panels {
				if panel.UI != nil && len(panel.UI.Actions) > 0 {
					t.Fatal("cached grants exposed revoked controls", panel)
				}
			}
			overview := snap.Panels[0] // find by ID, independent of host sorting
			for _, panel := range snap.Panels {
				if panel.ID == DataPanelOverview {
					overview = panel
				}
			}
			encoded := snapshotJSON(t, overview.Records)
			if strings.Contains(string(encoded), `"availability":"Available"`) {
				t.Fatal("capability summary retained revoked grant", string(encoded))
			}
		})
	}
}

func TestDataSnapshotReadBudgetAndDetachmentAcrossRequests(t *testing.T) {
	m, p, s, ctx, id := snapshotFixture(t, nil, snapshotPolicy{})
	first, err := m.Console().Snapshot(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	for _, panel := range first.Panels {
		for _, row := range panel.Records {
			if data, ok := row.Data.(map[string]any); ok {
				data["label"] = "MUTATED"
			}
		}
	}
	second, err := m.Console().Snapshot(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	raw := snapshotJSON(t, second)
	if strings.Contains(string(raw), "MUTATED") || p.catalogs.Load() != 2 || s.targets.Load() != 2 || s.operations.Load() != 2 || s.receipts.Load() != 2 {
		t.Fatal("projection cached across requests or shared mutable data", string(raw))
	}
}

func TestDataSnapshotBoundedWorkAndErrorPresentation(t *testing.T) {
	for _, mode := range []string{"bounded", "deadline", "canceled", "provider", "denied"} {
		t.Run(mode, func(t *testing.T) {
			var count atomic.Int64
			m, _, s, ctx, id := snapshotFixture(t, func(ctx context.Context) error {
				count.Add(1)
				switch mode {
				case "bounded":
					select {
					case <-time.After(15 * time.Millisecond):
						return nil
					case <-ctx.Done():
						return ctx.Err()
					}
				case "deadline", "canceled":
					<-ctx.Done()
					return ctx.Err()
				case "provider":
					return data.Error(data.CodeProvider)
				case "denied":
					return data.Error(data.CodeDenied)
				}
				return nil
			}, snapshotPolicy{})
			m.host.config.SnapshotTimeout = 100 * time.Millisecond
			if mode == "canceled" {
				var cancel context.CancelFunc
				ctx, cancel = context.WithCancel(ctx)
				cancel()
			}
			start := time.Now()
			snap, err := m.Console().Snapshot(ctx, id)
			if mode == "bounded" {
				if err != nil || len(snap.Panels) != len(DataPanelIDs()) || count.Load() != 1 {
					t.Fatal("bounded snapshot rebuilt providers", snap, err, count.Load())
				}
				return
			}
			if len(snap.Panels) != 0 || err == nil || s.receipts.Load() != 0 {
				t.Fatal("failed snapshot delivered partial data or continued work", snap, err)
			}
			if time.Since(start) > time.Second {
				t.Fatal("cancellation did not bound work")
			}
			wantStatus := http.StatusServiceUnavailable
			wantCode := "CONSOLE_PROVIDER_FAILED"
			switch mode {
			case "deadline":
				wantStatus = http.StatusGatewayTimeout
				wantCode = "CONSOLE_TIMEOUT"
				if !errors.Is(err, context.DeadlineExceeded) {
					t.Fatal(err)
				}
			case "canceled":
				wantStatus = http.StatusRequestTimeout
				wantCode = "CONSOLE_CANCELED"
				if !errors.Is(err, context.Canceled) {
					t.Fatal(err)
				}
			case "denied":
				wantStatus = http.StatusForbidden
				wantCode = "FORBIDDEN"
			}
			// Exercise the production HTTP snapshot handler, including its presenter.
			h := m.Console()
			h.config.RequestIdentity = func(router.Context) (console.Identity, error) { return id, nil }
			rt := router.NewHTTPServer()
			rt.Router().Get("/snapshot", func(c router.Context) error { c.SetContext(ctx); return h.handleSnapshot(c) })
			response := httptest.NewRecorder()
			rt.WrappedRouter().ServeHTTP(response, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/snapshot", nil))
			if response.Code != wantStatus || mode != "denied" && !strings.Contains(response.Body.String(), wantCode) {
				t.Fatalf("misleading error: %d %s; expected %d %s", response.Code, response.Body.String(), wantStatus, wantCode)
			}
		})
	}
}

func TestDataSnapshotOperationActorAndScopeIsolation(t *testing.T) {
	m, _, s, ctx, id := snapshotFixture(t, nil, snapshotPolicy{check: func(_ context.Context, p data.Principal, a data.AccessRequest) error {
		if a.Operation != nil && a.Operation.Principal.ActorID != p.ActorID {
			return data.Error(data.CodeDenied)
		}
		return nil
	}})
	d, err := m.config.Service.Catalog(ctx, "preview", 100)
	if err != nil {
		t.Fatal(err)
	}
	result, err := m.config.Service.Run(ctx, data.Validate, data.Input{Dataset: d[0].Dataset, Scenario: d[0].Scenarios[0], TargetID: "preview", IdempotencyKey: "actor-op"})
	if err != nil {
		t.Fatal(err)
	}
	s.getOps.Store(0)
	for _, scope := range []string{"org", "foreign-org"} {
		p := snapshotPrincipal(t, ctx)
		p.ActorID = "other"
		p.ExecutionID = "other"
		p.ScopeKey = scope
		actorCtx := context.WithValue(ctx, dataRegistrationPrincipalKey{}, p)
		actorID := id
		actorID.ActorID = p.ActorID
		actorID.ScopeKey = scope
		snap, snapshotErr := m.Console().Snapshot(actorCtx, actorID)
		if snapshotErr != nil {
			t.Fatal(snapshotErr)
		}
		raw := snapshotJSON(t, snap)
		if strings.Contains(string(raw), result.OperationID) {
			t.Fatal("foreign operation leaked", string(raw))
		}
	}
	own, err := m.Console().Snapshot(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	raw := snapshotJSON(t, own)
	if !strings.Contains(string(raw), result.OperationID) {
		t.Fatal("original actor lost operation")
	}
	if s.getOps.Load() != 0 {
		t.Fatal("delivery reread projected operations", s.getOps.Load())
	}
}

type snapshotLifecycleProvider struct {
	data.Provider
	catalog             data.CatalogProvider
	catalogs, describes atomic.Int64
}

func (p *snapshotLifecycleProvider) Catalog(ctx context.Context, principal data.Principal, key data.TargetKey, limit int) ([]data.DatasetRef, error) {
	p.catalogs.Add(1)
	return p.catalog.Catalog(ctx, principal, key, limit)
}
func (p *snapshotLifecycleProvider) Describe(ctx context.Context, principal data.Principal, ref data.DatasetRef) (data.Descriptor, error) {
	p.describes.Add(1)
	return p.Provider.Describe(ctx, principal, ref)
}

func TestDataSnapshotRetainedReceiptAndHistoryReadBudget(t *testing.T) {
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "data.db"), nil)
	input := f.prepareVerified(t)
	if result, err := f.service.Run(t.Context(), data.Activate, input); err != nil || !result.Active {
		t.Fatal(result, err)
	}
	for i := range 2 {
		in := f.input
		in.IdempotencyKey = fmt.Sprintf("another-receipt-%d", i)
		if _, err := f.service.Run(t.Context(), data.Prepare, in); err != nil {
			t.Fatal(err)
		}
	}
	for i := range 101 {
		in := f.input
		in.IdempotencyKey = fmt.Sprintf("history-budget-%d", i)
		if _, err := f.service.Run(t.Context(), data.Validate, in); err != nil {
			t.Fatal(err)
		}
	}
	f.module.config.ReceiptLimit = 1
	store := &snapshotStore{OperationStore: f.runtime.Store}
	provider := &snapshotLifecycleProvider{Provider: f.runtime, catalog: f.runtime}
	service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"kitchen-sink": provider}, Target: f.target, Store: store, Policy: dataModulePolicy{&f.view, &f.execute, &f.recover}, Resolve: f.principal, WritesEnabled: true})
	if err != nil {
		t.Fatal(err)
	}
	f.module.config.Service = service
	start := time.Now()
	snap := f.snapshot(t, "operator")
	t.Logf("retained/history snapshot elapsed=%s catalog=%d describe=%d active=%d operations=%d receipts=%d pinned_operation=%d pinned_receipt=%d", time.Since(start), provider.catalogs.Load(), provider.describes.Load(), store.targets.Load(), store.operations.Load(), store.receipts.Load(), store.getOps.Load(), store.getReceipts.Load())
	if provider.catalogs.Load() != 1 || provider.describes.Load() != 1 || store.targets.Load() != 1 || store.operations.Load() != 1 || store.receipts.Load() != 1 || store.getOps.Load() != 0 || store.getReceipts.Load() != 1 {
		t.Fatal("history, evidence or choices repeated lifecycle reads")
	}
	raw := snapshotJSON(t, snap)
	if !strings.Contains(string(raw), input.ReceiptID) {
		t.Fatal("active receipt outside receipt/history windows was not pinned")
	}
	own := dataModuleAction(t, snap, data.Activate, input.ReceiptID)
	foreign := f.snapshot(t, "other")
	for _, panel := range foreign.Panels {
		if panel.UI != nil {
			for _, action := range panel.UI.Actions {
				if action.ID == own.ID {
					t.Fatal("foreign actor received active receipt mutation choice")
				}
			}
		}
	}
	if store.getReceipts.Load() != 2 {
		t.Fatal("receipt pin was not bounded per actor", store.getReceipts.Load())
	}
}

func TestDataSnapshotProviderCancellationIsNotDenial(t *testing.T) {
	for _, cause := range []error{context.Canceled, context.DeadlineExceeded} {
		m, _, _, ctx, id := snapshotFixture(t, func(context.Context) error { return cause }, snapshotPolicy{})
		snap, err := m.Console().Snapshot(ctx, id)
		if !errors.Is(err, cause) || errors.Is(err, ErrForbidden) || len(snap.Panels) != 0 {
			t.Fatal("provider cancellation lost its cause", snap, err)
		}
	}
}

func TestDataSnapshotRecordRevocationAfterLoad(t *testing.T) {
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "data.db"), nil)
	input := f.prepareVerified(t)
	if _, err := f.service.Run(t.Context(), data.Activate, input); err != nil {
		t.Fatal(err)
	}
	var revoked atomic.Bool
	service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"kitchen-sink": f.runtime}, Target: f.target, Store: f.runtime.Store, Policy: snapshotPolicy{check: func(_ context.Context, _ data.Principal, a data.AccessRequest) error {
		if revoked.Load() && (a.Receipt != nil || a.Operation != nil) {
			return data.Error(data.CodeDenied)
		}
		return nil
	}}, Resolve: f.principal, WritesEnabled: true})
	if err != nil {
		t.Fatal(err)
	}
	f.module.config.Service = service
	original := f.module.host.config.Snapshot
	f.module.host.config.Snapshot = func(ctx context.Context, id console.Identity, panel string) ([]console.Record, error) {
		rows, err := original(ctx, id, panel)
		revoked.Store(true)
		return rows, err
	}
	snap := f.snapshot(t, "operator")
	for _, panel := range snap.Panels {
		if panel.ID == DataPanelOperations || panel.ID == DataPanelVerification || panel.ID == DataPanelCoverage {
			if len(panel.Records) != 0 {
				t.Fatal("record policy cached across delivery", panel)
			}
		}
		if panel.UI != nil {
			for _, action := range panel.UI.Actions {
				if strings.Contains(action.Label, input.ReceiptID) {
					t.Fatal("revoked receipt still actionable", action)
				}
			}
		}
		if panel.ID == DataPanelOverview {
			raw := snapshotJSON(t, panel.Records)
			if strings.Contains(string(raw), "latest_operation") || strings.Contains(string(raw), "dataset_label") {
				t.Fatal("overview leaked revoked record details", string(raw))
			}
		}
	}
	// On a later request, an inaccessible pinned receipt is omitted. A target
	// viewer keeps state access, without learning protected receipt details.
	snap = f.snapshot(t, "operator")
	if len(snap.Panels) != len(DataPanelIDs()) {
		t.Fatal("inaccessible pin removed target view")
	}
}

func TestDataSnapshotEmptyCatalogRedactsRevokedHistory(t *testing.T) {
	var revoked atomic.Bool
	m, p, _, ctx, id := snapshotFixture(t, nil, snapshotPolicy{check: func(_ context.Context, _ data.Principal, a data.AccessRequest) error {
		if revoked.Load() && a.Operation != nil {
			return data.Error(data.CodeDenied)
		}
		return nil
	}})
	d := p.descriptor
	if _, err := m.config.Service.Run(ctx, data.Validate, data.Input{Dataset: d.Dataset, Scenario: d.Scenarios[0], TargetID: "preview", IdempotencyKey: "old-history"}); err != nil {
		t.Fatal(err)
	}
	p.empty = true
	original := m.host.config.Snapshot
	m.host.config.Snapshot = func(ctx context.Context, id console.Identity, panel string) ([]console.Record, error) {
		rows, err := original(ctx, id, panel)
		revoked.Store(true)
		return rows, err
	}
	snap, err := m.Console().Snapshot(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	for _, panel := range snap.Panels {
		if panel.ID == DataPanelOverview {
			raw := snapshotJSON(t, panel.Records)
			if strings.Contains(string(raw), "latest_operation") {
				t.Fatal("empty catalog bypassed current history policy", string(raw))
			}
		}
	}
}

func snapshotPrincipal(t *testing.T, ctx context.Context) data.Principal {
	t.Helper()
	principal, ok := ctx.Value(dataRegistrationPrincipalKey{}).(data.Principal)
	if !ok {
		t.Fatal("snapshot context has no Data principal")
	}
	return principal
}

func snapshotJSON(t *testing.T, value any) []byte {
	t.Helper()
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("encode snapshot: %v", err)
	}
	return encoded
}
