package admin

import (
	"context"
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
	router "github.com/goliatone/go-router"
)

func TestDataAuthorizationBackendFailurePresentation(t *testing.T) {
	for _, source := range []string{"resolver", "policy", "capability", "delivery"} {
		t.Run(source, func(t *testing.T) {
			m, p, s, ctx, id := snapshotFixture(t, nil, snapshotPolicy{})
			var delivering atomic.Bool
			policy := snapshotPolicy{check: func(_ context.Context, _ data.Principal, a data.AccessRequest) error {
				if source == "policy" || source == "capability" && a.Action != "view" || source == "delivery" && delivering.Load() && a.Action != "view" {
					return fmt.Errorf("backend wrapper: %w", data.Error(data.CodeProvider))
				}
				return nil
			}}
			service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"sample": p}, Target: dataRegistrationTarget{}, Store: s, Policy: policy, Resolve: func(ctx context.Context) (data.Principal, error) {
				if source == "resolver" {
					return data.Principal{}, data.Error(data.CodeProvider)
				}
				return snapshotPrincipal(t, ctx), nil
			}})
			if err != nil {
				t.Fatal(err)
			}
			m.config.Service = service
			if source == "delivery" {
				m.host.config.Access.Project = func(_ context.Context, _ console.Identity, _ string, r console.Record) console.Record {
					delivering.Store(true)
					return r
				}
			}
			h := m.Console()
			h.config.RequestIdentity = func(router.Context) (console.Identity, error) { return id, nil }
			rt := router.NewHTTPServer()
			rt.Router().Get("/snapshot", func(c router.Context) error { c.SetContext(ctx); return h.handleSnapshot(c) })
			response := httptest.NewRecorder()
			rt.WrappedRouter().ServeHTTP(response, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/snapshot", nil))
			if response.Code != http.StatusServiceUnavailable {
				t.Fatalf("authorization backend failure became %d: %s", response.Code, response.Body.String())
			}
			if !strings.Contains(response.Body.String(), "CONSOLE_PROVIDER_FAILED") || strings.Contains(response.Body.String(), "FORBIDDEN") || strings.Contains(response.Body.String(), "panels") {
				t.Fatal("misleading failure or partial payload", response.Body.String())
			}
		})
	}
}

func TestDataSnapshotExecuteRevokedDuringProjection(t *testing.T) {
	var revoked atomic.Bool
	m, _, _, ctx, id := snapshotFixture(t, nil, snapshotPolicy{check: func(_ context.Context, _ data.Principal, a data.AccessRequest) error {
		if revoked.Load() && a.Action != "view" {
			return data.Error(data.CodeDenied)
		}
		return nil
	}})
	original := m.host.config.Access.Project
	m.host.config.Access.Project = func(ctx context.Context, id console.Identity, panel string, r console.Record) console.Record {
		r = original(ctx, id, panel, r)
		if panel == DataPanelOverview {
			revoked.Store(true)
		}
		return r
	}
	snap, err := m.Console().Snapshot(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if !revoked.Load() {
		t.Fatal("projection did not revoke")
	}
	for _, panel := range snap.Panels {
		raw := snapshotJSON(t, panel.Records)
		if strings.Contains(string(raw), `"availability":"Available"`) {
			t.Fatal("summary retained revoked capability", string(raw))
		}
		if panel.UI != nil {
			for _, a := range panel.UI.Actions {
				if a.Executable() {
					t.Fatalf("snapshot delivered revoked action %s in %s", a.ID, panel.ID)
				}
			}
		}
	}
}

func TestDataSnapshotRecordRevokedDuringProjection(t *testing.T) {
	var revoked atomic.Bool
	m, p, _, ctx, id := snapshotFixture(t, nil, snapshotPolicy{check: func(_ context.Context, _ data.Principal, a data.AccessRequest) error {
		if revoked.Load() && a.Operation != nil {
			return data.Error(data.CodeDenied)
		}
		return nil
	}})
	d := p.descriptor
	if _, err := m.config.Service.Run(ctx, data.Validate, data.Input{Dataset: d.Dataset, Scenario: d.Scenarios[0], TargetID: "preview", IdempotencyKey: "history"}); err != nil {
		t.Fatal(err)
	}
	original := m.host.config.Access.Project
	m.host.config.Access.Project = func(ctx context.Context, id console.Identity, panel string, r console.Record) console.Record {
		r = original(ctx, id, panel, r)
		if panel == DataPanelOverview {
			revoked.Store(true)
		}
		return r
	}
	snap, err := m.Console().Snapshot(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if !revoked.Load() {
		t.Fatal("projection did not revoke")
	}
	for _, panel := range snap.Panels {
		if panel.ID == DataPanelOperations && len(panel.Records) > 0 {
			t.Fatalf("snapshot delivered revoked operation: %+v", panel.Records[0])
		}
		if panel.ID == DataPanelOverview {
			raw := snapshotJSON(t, panel.Records)
			if strings.Contains(string(raw), "latest_operation") {
				t.Fatal("summary retained revoked history", string(raw))
			}
		}
	}
}

func TestDataLookupProjectionReadBudget(t *testing.T) {
	m, provider, store, ctx, id := snapshotFixture(t, nil, snapshotPolicy{})
	r, err := m.Console().Lookup(ctx, id, DataPanelOverview, "summary")
	if err != nil || r.Key != "summary" {
		t.Fatal(r, err)
	}
	if provider.catalogs.Load() != 1 || provider.describes.Load() != 1 || store.targets.Load() != 1 || store.operations.Load() != 1 || store.receipts.Load() != 1 || store.getOps.Load() != 0 || store.getReceipts.Load() != 0 {
		t.Fatal("lookup rebuilt the coherent projection", provider.catalogs.Load(), provider.describes.Load(), store.targets.Load(), store.operations.Load(), store.receipts.Load(), store.getOps.Load(), store.getReceipts.Load())
	}
}

func TestConsoleLookupSourceFailuresOverHTTP(t *testing.T) {
	for _, tc := range []struct {
		name   string
		cause  error
		status int
		code   string
	}{
		{"canceled", fmt.Errorf("provider: %w", context.Canceled), 408, "CONSOLE_CANCELED"},
		{"deadline", fmt.Errorf("provider: %w", context.DeadlineExceeded), 504, "CONSOLE_TIMEOUT"},
		{"joined deadline", errors.Join(data.Error(data.CodeDenied), context.DeadlineExceeded), 504, "CONSOLE_TIMEOUT"},
		{"unavailable", data.Error(data.CodeUnavailable), 503, data.CodeUnavailable},
		{"missing", ErrNotFound, 404, "NOT_FOUND"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var revoked, execute atomic.Bool
			h := consoleTestHost(t, "data", &revoked, &execute)
			h.config.Lookup = func(context.Context, console.Identity, string, string) (console.Record, bool, error) {
				return console.Record{Key: "visible", Revision: 1, Data: "must not be delivered"}, true, tc.cause
			}
			rt := router.NewHTTPServer()
			rt.Router().Get("/lookup/:panel/:record", h.handleLookup)
			res := httptest.NewRecorder()
			rt.WrappedRouter().ServeHTTP(res, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/lookup/operations/visible", nil))
			if res.Code != tc.status || !strings.Contains(res.Body.String(), tc.code) || strings.Contains(res.Body.String(), "must not be delivered") {
				t.Fatal(res.Code, res.Body.String())
			}
		})
	}
}

func TestDataDeliveryJoinedCancellationIsNotDenial(t *testing.T) {
	err := errors.Join(data.Error(data.CodeDenied), context.Canceled)
	allowed, cause := dataDisplayAccess(err)
	if allowed || !errors.Is(cause, context.Canceled) {
		t.Fatal("joined cancellation became hidden record", allowed, cause)
	}
}

func TestConsoleLookupCancellationAtProjectionAndPreparation(t *testing.T) {
	for _, stage := range []string{"preparation", "projection", "source", "record policy", "panel policy"} {
		t.Run(stage, func(t *testing.T) {
			var revoked, execute atomic.Bool
			h := consoleTestHost(t, "data", &revoked, &execute)
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			switch stage {
			case "preparation":
				h.config.SnapshotTimeout = 20 * time.Millisecond
				h.config.PrepareLookup = func(ctx context.Context, _ console.Identity) (context.Context, error) {
					<-ctx.Done()
					return ctx, ctx.Err()
				}
			case "projection":
				h.config.Access.Project = func(_ context.Context, _ console.Identity, _ string, r console.Record) console.Record {
					cancel()
					return r
				}
			case "source":
				h.config.Lookup = func(context.Context, console.Identity, string, string) (console.Record, bool, error) {
					cancel()
					return console.Record{}, false, ErrNotFound
				}
			case "record policy":
				h.config.Access.Record = func(context.Context, console.Identity, string, console.Record) bool {
					cancel()
					return false
				}
			case "panel policy":
				h.config.Access.Panel = func(context.Context, console.Identity, console.PanelDefinition) bool {
					cancel()
					return false
				}
			}
			start := time.Now()
			r, err := h.Lookup(ctx, consoleTestIdentity("data"), "operations", "visible")
			want := context.Canceled
			if stage == "preparation" {
				want = context.DeadlineExceeded
			}
			if !errors.Is(err, want) || r.Key != "" || time.Since(start) > time.Second {
				t.Fatal(r, err, time.Since(start))
			}
		})
	}
}

func TestConsoleLookupRechecksPanelAfterProjection(t *testing.T) {
	var revoked, execute, panelRevoked atomic.Bool
	h := consoleTestHost(t, "data", &revoked, &execute)
	h.config.Access.Panel = func(context.Context, console.Identity, console.PanelDefinition) bool { return !panelRevoked.Load() }
	h.config.Access.Project = func(_ context.Context, _ console.Identity, _ string, r console.Record) console.Record {
		panelRevoked.Store(true)
		return r
	}
	r, err := h.Lookup(t.Context(), consoleTestIdentity("data"), "operations", "visible")
	if !errors.Is(err, ErrNotFound) || r.Key != "" {
		t.Fatal("projection bypassed current panel policy", r, err)
	}
}

func TestDataLookupReceiptRevokedAfterLoad(t *testing.T) {
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "data.db"), nil)
	f.prepareVerified(t)
	var revoked atomic.Bool
	service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"kitchen-sink": f.runtime}, Target: f.target, Store: f.runtime.Store, Policy: snapshotPolicy{check: func(_ context.Context, p data.Principal, a data.AccessRequest) error {
		if a.Receipt != nil && (revoked.Load() || a.Receipt.RequesterID != p.ActorID) {
			return data.Error(data.CodeDenied)
		}
		return nil
	}}, Resolve: f.principal, WritesEnabled: true})
	if err != nil {
		t.Fatal(err)
	}
	f.module.config.Service = service
	snap := f.snapshot(t, "operator")
	key := ""
	for _, p := range snap.Panels {
		if p.ID == DataPanelCoverage && len(p.Records) > 0 {
			key = p.Records[0].Key
		}
	}
	if key == "" {
		t.Fatal("no coverage")
	}
	path := "/admin/data/api/panels/coverage/records/" + key
	if res := f.request(t, http.MethodGet, path, "operator", nil); res.Code != 200 {
		t.Fatal("authorized receipt lookup failed", res.Code, res.Body.String())
	}
	if res := f.request(t, http.MethodGet, path, "other", nil); res.Code != 404 {
		t.Fatal("foreign receipt lookup disclosed evidence", res.Code, res.Body.String())
	}
	originalProject := f.module.host.config.Access.Project
	f.module.host.config.Access.Project = func(ctx context.Context, id console.Identity, panel string, record console.Record) console.Record {
		record = originalProject(ctx, id, panel, record)
		if panel == DataPanelCoverage {
			row, ok := record.Data.(map[string]any)
			if !ok {
				t.Fatal("coverage has no data row")
			}
			delete(row, "receipt_id")
		}
		return record
	}
	original := f.module.host.config.Lookup
	f.module.host.config.Lookup = func(ctx context.Context, id console.Identity, panel, key string) (console.Record, bool, error) {
		r, found, lookupErr := original(ctx, id, panel, key)
		revoked.Store(true)
		return r, found, lookupErr
	}
	id := console.Identity{ConsoleID: "data", ApplicationID: "test", EnvironmentID: "dev", ActorID: "operator", ScopeKey: "demo"}
	r, err := f.module.Console().Lookup(t.Context(), id, DataPanelCoverage, key)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("lookup delivered revoked receipt evidence: record=%+v error=%v", r, err)
	}
	if res := f.request(t, http.MethodGet, path, "operator", nil); res.Code != 404 || strings.Contains(res.Body.String(), "evidence_ref") {
		t.Fatal("revoked HTTP receipt lookup disclosed evidence", res.Code, res.Body.String())
	}
}

func TestConsoleLookupPreservesSourceFailures(t *testing.T) {
	for _, cause := range []error{context.Canceled, context.DeadlineExceeded, data.Error(data.CodeProvider)} {
		t.Run(cause.Error(), func(t *testing.T) {
			var revoked, execute atomic.Bool
			h := consoleTestHost(t, "data", &revoked, &execute)
			h.config.Lookup = func(context.Context, console.Identity, string, string) (console.Record, bool, error) {
				return console.Record{}, false, cause
			}
			_, err := h.Lookup(t.Context(), consoleTestIdentity("data"), "operations", "visible")
			if !errors.Is(err, cause) {
				t.Fatalf("lookup lost cancellation: got %v, want %v", err, cause)
			}
		})
	}
}
