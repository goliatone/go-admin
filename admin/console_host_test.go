package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/console"
	router "github.com/goliatone/go-router"
)

func consoleTestIdentity(id string) console.Identity {
	return console.Identity{ConsoleID: id, ApplicationID: "app", EnvironmentID: "dev", ActorID: "alice", ScopeKey: "org"}
}

func consoleTestHost(t *testing.T, id string, revoked *atomic.Bool, execute *atomic.Bool) *ConsoleHost {
	t.Helper()
	registry := console.NewPanelRegistry()
	if err := registry.Register("operations", console.PanelConfig{
		UI: &console.PanelUI{Views: console.PanelUIViews{Console: console.TableView("")}, Actions: []console.PanelUIAction{{ID: "run", Label: "Run"}}},
		Actions: map[string]console.PanelActionHandler{"run": func(context.Context, console.PanelActionRequest) (console.PanelActionResult, error) {
			return console.PanelActionResult{OK: true}, nil
		}},
	}); err != nil {
		t.Fatal(err)
	}
	h, err := NewConsoleHost(ConsoleHostConfig{ID: id, Registry: registry, Enabled: func() bool { return true }, RevalidateInterval: 10 * time.Millisecond,
		RequestIdentity: func(router.Context) (console.Identity, error) { return consoleTestIdentity(id), nil },
		Access: ConsoleAccess{
			Resolve: func(ctx context.Context, identity console.Identity) (context.Context, console.Identity, error) {
				if revoked.Load() {
					return ctx, identity, ErrForbidden
				}
				return ctx, identity, nil
			},
			Read:   func(context.Context, console.Identity) error { return nil },
			Panel:  func(context.Context, console.Identity, console.PanelDefinition) bool { return true },
			Action: func(context.Context, console.Identity, string, string) bool { return execute.Load() },
			Record: func(_ context.Context, _ console.Identity, _ string, record console.Record) bool {
				return record.Key != "hidden"
			},
		},
		Snapshot: func(context.Context, console.Identity, string) ([]console.Record, error) {
			return []console.Record{{Key: "visible", Revision: 1, Data: "safe"}, {Key: "hidden", Revision: 1, Data: "secret"}}, nil
		},
		Lookup: func(_ context.Context, _ console.Identity, _ string, key string) (console.Record, bool, error) {
			return console.Record{Key: key, Revision: 1, Data: "secret"}, true, nil
		},
		RenderPage: func(router.Context, console.Bootstrap) error { return nil },
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := h.Close(); closeErr != nil {
			t.Errorf("close console host: %v", closeErr)
		}
	})
	return h
}

func TestConsoleReadPolicyIndependentOfActionAndLookup(t *testing.T) {
	var revoked, execute atomic.Bool
	h := consoleTestHost(t, "data", &revoked, &execute)
	i := consoleTestIdentity("data")
	snapshot, err := h.Snapshot(context.Background(), i)
	if err != nil || len(snapshot.Panels) != 1 || len(snapshot.Panels[0].Records) != 1 || len(snapshot.Panels[0].UI.Actions) != 0 {
		t.Fatalf("read-only snapshot: %+v %v", snapshot, err)
	}
	if _, err := h.RunAction(context.Background(), i, console.PanelActionRequest{PanelID: "operations", ActionID: "run"}); !errors.Is(err, ErrNotFound) {
		t.Fatal("hidden control authorized action")
	}
	execute.Store(true)
	if result, err := h.RunAction(context.Background(), i, console.PanelActionRequest{PanelID: "operations", ActionID: "run"}); err != nil || !result.OK {
		t.Fatal(result, err)
	}
	if _, err := h.Lookup(context.Background(), i, "operations", "hidden"); !errors.Is(err, ErrNotFound) {
		t.Fatal("lookup disclosed hidden record")
	}
	if _, err := h.Snapshot(context.Background(), consoleTestIdentity("debug")); !errors.Is(err, ErrForbidden) {
		t.Fatal("foreign console read")
	}
	other := i
	other.ActorID = "bob"
	if h.preferenceKey(i) == h.preferenceKey(other) {
		t.Fatal("preference identity bleed")
	}
	revoked.Store(true)
	if _, err := h.Snapshot(context.Background(), i); !errors.Is(err, ErrForbidden) {
		t.Fatal("revoked snapshot")
	}
}

func TestConsoleWatchIdleRevocationAndHostClose(t *testing.T) {
	for _, closeHost := range []bool{false, true} {
		t.Run(map[bool]string{false: "revoked", true: "closed"}[closeHost], func(t *testing.T) {
			var revoked, execute atomic.Bool
			h := consoleTestHost(t, "data", &revoked, &execute)
			messages := make(chan any, 16)
			result := make(chan error, 1)
			go func() {
				result <- h.Watch(context.Background(), consoleTestIdentity("data"), []string{"operations"}, func(value any) error { messages <- value; return nil })
			}()
			select {
			case value := <-messages:
				if _, ok := value.(console.Snapshot); !ok {
					t.Fatalf("initial value %T", value)
				}
			case <-time.After(time.Second):
				t.Fatal("missing snapshot")
			}
			if closeHost {
				if closeErr := h.Close(); closeErr != nil {
					t.Fatal(closeErr)
				}
			} else {
				revoked.Store(true)
			}
			select {
			case err := <-result:
				if !closeHost && !errors.Is(err, ErrForbidden) {
					t.Fatal(err)
				}
			case <-time.After(time.Second):
				t.Fatal("idle stream did not close")
			}
			if closeHost {
				if _, err := h.Snapshot(context.Background(), consoleTestIdentity("data")); !errors.Is(err, ErrForbidden) {
					t.Fatal("closed host serves requests")
				}
			}
		})
	}
}

func TestConsoleWatchRestoresRequestedPanelsAfterRegrant(t *testing.T) {
	for _, initialGrant := range []bool{false, true} {
		t.Run(map[bool]string{false: "initially-denied", true: "revoked"}[initialGrant], func(t *testing.T) {
			var revoked, execute, allowed atomic.Bool
			allowed.Store(initialGrant)
			h := consoleTestHost(t, "data", &revoked, &execute)
			h.config.RevalidateInterval = 100 * time.Millisecond
			h.config.Access.Panel = func(context.Context, console.Identity, console.PanelDefinition) bool { return allowed.Load() }
			var revision atomic.Uint64
			revision.Store(1)
			h.config.Snapshot = func(context.Context, console.Identity, string) ([]console.Record, error) {
				return []console.Record{{Key: "visible", Revision: revision.Load(), Data: "state"}}, nil
			}
			ctx, cancel := context.WithCancel(context.Background())
			messages := make(chan any, 64)
			result := make(chan error, 1)
			go func() {
				result <- h.Watch(ctx, consoleTestIdentity("data"), []string{" Operations ", "unknown"}, func(value any) error { messages <- value; return nil })
			}()
			defer func() {
				cancel()
				select {
				case <-result:
				case <-time.After(time.Second):
					t.Error("watch failed to stop")
				}
			}()
			waitSnapshot := func(present bool) {
				t.Helper()
				timer := time.NewTimer(time.Second)
				defer timer.Stop()
				for {
					select {
					case value := <-messages:
						if snap, ok := value.(console.Snapshot); ok && (len(snap.Panels) > 0) == present {
							return
						}
					case <-timer.C:
						t.Fatal("missing expected policy snapshot")
					}
				}
			}
			waitSnapshot(initialGrant)
			if initialGrant {
				allowed.Store(false)
				revision.Store(2)
				if _, err := h.Events().Publish(console.Event{Identity: consoleTestIdentity("data"), PanelID: "operations", Kind: console.EventUpsert, Record: console.Record{Key: "visible", Revision: 2, Data: "denied"}}); err != nil {
					t.Fatal(err)
				}
				waitSnapshot(false)
			}
			allowed.Store(true)
			waitSnapshot(true)
			revision.Store(3)
			if _, err := h.Events().Publish(console.Event{Identity: consoleTestIdentity("data"), PanelID: "operations", Kind: console.EventUpsert, Record: console.Record{Key: "visible", Revision: 3, Data: "granted"}}); err != nil {
				t.Fatal(err)
			}
			timer := time.NewTimer(time.Second)
			defer timer.Stop()
			for {
				select {
				case value := <-messages:
					if event, ok := value.(console.Event); ok && event.Kind == console.EventUpsert && event.Revision == 3 {
						return
					}
				case <-timer.C:
					t.Fatal("authorized panel returned but live events did not")
				}
			}
		})
	}
}

func TestConsoleWatchSubscribesBeforeSnapshotAndDefaultsToNoEvents(t *testing.T) {
	for _, subscribed := range []bool{false, true} {
		t.Run(map[bool]string{false: "empty", true: "selected"}[subscribed], func(t *testing.T) {
			var revoked, execute atomic.Bool
			h := consoleTestHost(t, "data", &revoked, &execute)
			h.config.RevalidateInterval = time.Hour
			var published atomic.Bool
			h.config.Snapshot = func(context.Context, console.Identity, string) ([]console.Record, error) {
				if published.CompareAndSwap(false, true) {
					_, err := h.Events().Publish(console.Event{Identity: consoleTestIdentity("data"), PanelID: "operations", Record: console.Record{Key: "visible", Data: "during-snapshot"}, Kind: console.EventUpsert})
					if err != nil {
						t.Error(err)
					}
				}
				return []console.Record{}, nil
			}
			messages := make(chan any, 16)
			result := make(chan error, 1)
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			panels := []string{}
			if subscribed {
				panels = []string{"operations"}
			}
			go func() {
				result <- h.Watch(ctx, consoleTestIdentity("data"), panels, func(value any) error { messages <- value; return nil })
			}()
			select {
			case <-messages:
			case <-time.After(time.Second):
				t.Fatal("missing initial snapshot")
			}
			if subscribed {
				select {
				case value := <-messages:
					if event, ok := value.(console.Event); !ok || event.Sequence != 1 {
						t.Fatal(value)
					}
				case <-time.After(time.Second):
					t.Fatal("event lost during snapshot")
				}
			} else {
				select {
				case value := <-messages:
					t.Fatalf("empty subscription delivered %T", value)
				case <-time.After(30 * time.Millisecond):
				}
			}
			cancel()
			select {
			case <-result:
			case <-time.After(time.Second):
				t.Fatal("subscriber leaked")
			}
		})
	}
}

func TestConsoleRouteNamespacesAndStartupRegistration(t *testing.T) {
	var revoked, execute atomic.Bool
	a, b := consoleTestHost(t, "alpha", &revoked, &execute), consoleTestHost(t, "beta", &revoked, &execute)
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{})
	rt := &stubWebSocketRouter{}
	adm.router = rt
	for _, h := range []*ConsoleHost{a, b} {
		contract := h.RouteContract()
		resolved := routing.ResolvedModule{Slug: h.config.ID, UIMountBase: "/admin/" + h.config.ID}
		ctx := ModuleContext{Admin: adm, ProtectedRouter: rt, AuthMiddleware: func(next router.HandlerFunc) router.HandlerFunc { return next }, Routing: routing.BuildModuleContext(contract, resolved)}
		if err := h.Register(ctx); err != nil {
			t.Fatal(err)
		}
		if err := h.Register(ctx); err == nil {
			t.Fatal("dynamic re-registration allowed")
		}
	}
	if a.routes.Snapshot == b.routes.Snapshot || a.routes.Live == b.routes.Live || rt.routeForPath(a.routes.Live) == nil || rt.routeForPath(b.routes.Live) == nil {
		t.Fatal("routes crossed consoles")
	}
}

func TestConsoleModulesServeIndependentRoutesWithDebugDisabled(t *testing.T) {
	var revoked, execute atomic.Bool
	adm := mustNewAdmin(t, Config{BasePath: "/admin", Debug: DebugConfig{Enabled: false}}, Dependencies{})
	adm.WithAuth(headerDebugAuthenticator{}, nil)
	adm.WithAuthorizer(allowAllDebugAuthorizer{})
	for _, id := range []string{"alpha", "beta"} {
		h := consoleTestHost(t, id, &revoked, &execute)
		if err := adm.RegisterModule(h); err != nil {
			t.Fatal(err)
		}
	}
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %#v", err)
	}
	for _, id := range []string{"alpha", "beta"} {
		request := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/"+id+"/api/snapshot", nil)
		response := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(response, request)
		if response.Code != http.StatusOK {
			t.Fatalf("%s: %d %s", id, response.Code, response.Body.String())
		}
		var snapshot console.Snapshot
		if err := json.Unmarshal(response.Body.Bytes(), &snapshot); err != nil {
			t.Fatal(err)
		}
		if snapshot.ConsoleID != id || len(snapshot.Panels) != 1 || len(snapshot.Panels[0].Records) != 1 {
			t.Fatalf("foreign data: %+v", snapshot)
		}
	}
	if adm.debugCollector != nil {
		t.Fatal("independent console enabled Debug")
	}
}

func TestConsoleLookupUsesGrantsReloadedAfterProvider(t *testing.T) {
	type grantKey struct{}
	for _, revokePanel := range []bool{false, true} {
		t.Run(map[bool]string{false: "record", true: "panel"}[revokePanel], func(t *testing.T) {
			var revoked, execute, loaded atomic.Bool
			h := consoleTestHost(t, "data", &revoked, &execute)
			h.config.Access.Resolve = func(ctx context.Context, identity console.Identity) (context.Context, console.Identity, error) {
				return context.WithValue(ctx, grantKey{}, !loaded.Load()), identity, nil
			}
			h.config.Access.Panel = func(ctx context.Context, _ console.Identity, _ console.PanelDefinition) bool {
				return !revokePanel || ctx.Value(grantKey{}) == true
			}
			h.config.Access.Record = func(ctx context.Context, _ console.Identity, _ string, _ console.Record) bool {
				return revokePanel || ctx.Value(grantKey{}) == true
			}
			h.config.Lookup = func(context.Context, console.Identity, string, string) (console.Record, bool, error) {
				loaded.Store(true)
				return console.Record{Key: "visible", Revision: 1, Data: "secret"}, true, nil
			}
			if _, err := h.Lookup(context.Background(), consoleTestIdentity("data"), "operations", "visible"); !errors.Is(err, ErrNotFound) {
				t.Fatalf("revoked grants disclosed lookup: %v", err)
			}
		})
	}
}

func TestConsoleCloseCancelsInFlightProvider(t *testing.T) {
	var revoked, execute atomic.Bool
	h := consoleTestHost(t, "data", &revoked, &execute)
	started := make(chan struct{})
	h.config.Snapshot = func(ctx context.Context, _ console.Identity, _ string) ([]console.Record, error) {
		close(started)
		<-ctx.Done()
		return nil, ctx.Err()
	}
	result := make(chan error, 1)
	go func() { _, err := h.Snapshot(context.Background(), consoleTestIdentity("data")); result <- err }()
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("provider did not start")
	}
	if closeErr := h.Close(); closeErr != nil {
		t.Fatal(closeErr)
	}
	select {
	case err := <-result:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("provider cancellation: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("Close did not cancel in-flight provider")
	}
}

func TestConsoleSnapshotRejectsRevocationDuringProjection(t *testing.T) {
	for _, cancelRequest := range []bool{false, true} {
		t.Run(map[bool]string{false: "revoked", true: "canceled"}[cancelRequest], func(t *testing.T) {
			var revoked, execute atomic.Bool
			h := consoleTestHost(t, "data", &revoked, &execute)
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			h.config.Access.Project = func(_ context.Context, _ console.Identity, _ string, record console.Record) console.Record {
				if cancelRequest {
					cancel()
				} else {
					revoked.Store(true)
				}
				return record
			}
			snapshot, err := h.Snapshot(ctx, consoleTestIdentity("data"))
			want := ErrForbidden
			if cancelRequest {
				want = context.Canceled
			}
			if !errors.Is(err, want) || len(snapshot.Panels) != 0 {
				t.Fatalf("projection disclosed stale snapshot: %+v %v", snapshot, err)
			}
		})
	}
}

// consoleHostTestModule mounts a bare ConsoleHost as an admin module.
type consoleHostTestModule struct{ host *ConsoleHost }

func (m consoleHostTestModule) Manifest() ModuleManifest              { return m.host.Manifest() }
func (m consoleHostTestModule) RouteContract() routing.ModuleContract { return m.host.RouteContract() }
func (m consoleHostTestModule) Register(ctx ModuleContext) error      { return m.host.Register(ctx) }

type consoleWorkflowFixture struct {
	host      *ConsoleHost
	handler   http.Handler
	execute   atomic.Bool
	dispatch  atomic.Int32
	payloads  chan map[string]any
	options   chan console.PanelOptionQuery
	requests  chan console.PanelRequestQuery
	bootstrap chan console.Bootstrap
}

const consoleWorkflowCapabilities = "action_availability.v1,action_drawer.v1,request_id.v1,secondary_submit.v1,rich_views.v1"

func newConsoleWorkflowFixture(t *testing.T) *consoleWorkflowFixture {
	t.Helper()
	f := &consoleWorkflowFixture{payloads: make(chan map[string]any, 8), options: make(chan console.PanelOptionQuery, 8),
		requests: make(chan console.PanelRequestQuery, 8), bootstrap: make(chan console.Bootstrap, 2)}
	f.execute.Store(true)
	handler := func(_ context.Context, request console.PanelActionRequest) (console.PanelActionResult, error) {
		f.dispatch.Add(1)
		f.payloads <- request.Payload
		return console.PanelActionResult{OK: true, Message: "Accepted.", Tone: "INFO", Code: "accepted", Record: &console.PanelUIRecordRef{PanelID: "tasks", RecordKey: "op-1"}}, nil
	}
	minimum := 1.0
	registry := console.NewPanelRegistry()
	if err := registry.Register("tasks", console.PanelConfig{
		UI: &console.PanelUI{
			Views:        console.PanelUIViews{Console: &console.PanelUIView{Renderer: console.PanelRendererList, Empty: "Nothing waiting."}},
			ActionLayout: &console.PanelUIActionLayout{Mode: console.PanelActionLayoutDrawer},
			Actions: []console.PanelUIAction{
				{ID: "plain", Label: "Plain"},
				{ID: "plan", Label: "Refresh", RequestScope: "refresh:preview", Fields: []console.PanelUIActionField{
					{Name: "request_id", Generate: console.PanelFieldGenerateRequestID, Advanced: true},
					{Name: "dry_run", Kind: console.PanelFieldKindHidden, Default: false},
					{Name: "receipt", Kind: "select", OptionSource: &console.PanelUIActionOptionSource{ID: "receipts", Paginated: true, Searchable: true}},
					{Name: "batch_limit", Kind: "integer", Min: &minimum},
				}, Secondary: &console.PanelUIActionSubmit{Label: "Preview plan", Field: "dry_run", Value: true}},
				{ID: "reset", Label: "Reset", Availability: console.PanelActionUnsupported, Reason: "This target has no safe reset."},
			},
		},
		Actions: map[string]console.PanelActionHandler{"plain": handler, "plan": handler},
		Options: func(_ context.Context, query console.PanelOptionQuery) (console.PanelOptionPage, error) {
			f.options <- query
			items := []console.PanelUIActionOption{}
			for index := range 150 {
				items = append(items, console.PanelUIActionOption{Value: fmt.Sprintf("r%03d", index), Label: fmt.Sprintf("Receipt %d", index)})
			}
			return console.PanelOptionPage{Items: append(items, console.PanelUIActionOption{Value: "<x>"}), NextCursor: "page-2",
				Selected: []console.PanelUIActionOption{{Value: "r-old", Label: "Older retained receipt"}}}, nil
		},
		Requests: func(_ context.Context, query console.PanelRequestQuery) (console.PanelRequestStatus, error) {
			f.requests <- query
			return console.PanelRequestStatus{Status: "CLAIMED", RetryUntil: "2026-10-03T10:00:00Z",
				Result: &console.PanelActionResult{OK: true, Message: "Refresh accepted.", Tone: "neon"}}, nil
		},
	}); err != nil {
		t.Fatal(err)
	}
	host, err := NewConsoleHost(ConsoleHostConfig{ID: "work", Title: "Work", Registry: registry, Enabled: func() bool { return true },
		RequestIdentity: func(router.Context) (console.Identity, error) { return consoleTestIdentity("work"), nil },
		Access: ConsoleAccess{
			Resolve: func(ctx context.Context, identity console.Identity) (context.Context, console.Identity, error) {
				return ctx, identity, nil
			},
			Read:   func(context.Context, console.Identity) error { return nil },
			Panel:  func(context.Context, console.Identity, console.PanelDefinition) bool { return true },
			Action: func(context.Context, console.Identity, string, string) bool { return f.execute.Load() },
			Record: func(context.Context, console.Identity, string, console.Record) bool { return true },
		},
		Snapshot: func(context.Context, console.Identity, string) ([]console.Record, error) {
			return []console.Record{{Key: "op-1", Revision: 1, Data: map[string]any{"title": "Refresh"}}}, nil
		},
		RenderPage: func(_ router.Context, bootstrap console.Bootstrap) error { f.bootstrap <- bootstrap; return nil },
	})
	if err != nil {
		t.Fatal(err)
	}
	f.host = host
	t.Cleanup(func() {
		if closeErr := host.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	adm := mustNewAdmin(t, Config{BasePath: "/admin", Debug: DebugConfig{Enabled: false}}, Dependencies{})
	adm.WithAuth(headerDebugAuthenticator{}, nil)
	adm.WithAuthorizer(allowAllDebugAuthorizer{})
	if err = adm.RegisterModule(consoleHostTestModule{host}); err != nil {
		t.Fatal(err)
	}
	server := router.NewHTTPServer()
	if err = adm.Initialize(server.Router()); err != nil {
		t.Fatal(err)
	}
	f.handler = server.WrappedRouter()
	return f
}

func (f *consoleWorkflowFixture) do(t *testing.T, method, path, capabilities string, payload any) *httptest.ResponseRecorder {
	t.Helper()
	var body io.Reader
	if payload != nil {
		encoded, err := json.Marshal(payload)
		if err != nil {
			t.Fatal(err)
		}
		body = bytes.NewReader(encoded)
	}
	req := httptest.NewRequestWithContext(t.Context(), method, path, body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", "alice")
	if capabilities != "" {
		req.Header.Set(console.ClientCapabilitiesHeader, capabilities)
	}
	res := httptest.NewRecorder()
	f.handler.ServeHTTP(res, req)
	return res
}

func (f *consoleWorkflowFixture) actions(t *testing.T, capabilities string) map[string]console.PanelUIAction {
	t.Helper()
	res := f.do(t, http.MethodGet, "/admin/work/api/snapshot", capabilities, nil)
	if res.Code != http.StatusOK {
		t.Fatalf("snapshot: %d %s", res.Code, res.Body.String())
	}
	var snapshot console.Snapshot
	if err := json.Unmarshal(res.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	out := map[string]console.PanelUIAction{}
	for _, action := range snapshot.Panels[0].UI.Actions {
		out[action.ID] = action
	}
	return out
}

func consoleActionIDs(actions map[string]console.PanelUIAction) string {
	ids := make([]string, 0, len(actions))
	for id := range actions {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return strings.Join(ids, ",")
}

func TestConsoleClientHandshakeGatesWorkflowDeclarationsAndDispatch(t *testing.T) {
	f := newConsoleWorkflowFixture(t)
	if got := consoleActionIDs(f.actions(t, "")); got != "plain" {
		t.Fatalf("legacy clients must not receive capability-dependent or unavailable declarations: %s", got)
	}
	full := f.actions(t, consoleWorkflowCapabilities)
	if got := consoleActionIDs(full); got != "plain,plan,reset" {
		t.Fatalf("advertised client declarations = %s", got)
	}
	if full["reset"].Availability != console.PanelActionUnsupported || full["plan"].Secondary == nil || full["plan"].RequestScope != "refresh:preview" {
		t.Fatalf("workflow metadata lost in delivery: %+v", full)
	}
	partial := f.actions(t, console.ClientCapabilityActionAvailability)
	if plan := partial["plan"]; plan.Executable() || plan.Reason != consoleClientOutdatedMessage || plan.Fields != nil || plan.Secondary != nil {
		t.Fatalf("an under-capable client must receive a disabled declaration with reload guidance: %+v", plan)
	}

	res := f.do(t, http.MethodGet, "/admin/work", "", nil)
	if res.Code != http.StatusOK {
		t.Fatalf("page: %d %s", res.Code, res.Body.String())
	}
	bootstrap := <-f.bootstrap
	if bootstrap.URLs.Options != "/admin/work/api/panels/:panel/actions/:action/options/:field" || bootstrap.URLs.Requests != "/admin/work/api/panels/:panel/requests/:request" {
		t.Fatalf("bootstrap routes = %+v", bootstrap.URLs)
	}
	if got := len(bootstrap.Snapshot.Panels[0].UI.Actions); got != 3 {
		t.Fatalf("the page bootstrap carries every declaration for client-side gating, got %d", got)
	}

	const requestID = "0b7e2c4a-1f3d-4c5e-9a8b-7c6d5e4f3a2b"
	res = f.do(t, http.MethodPost, "/admin/work/api/panels/tasks/actions/plan", "", map[string]any{"request_id": requestID})
	if res.Code != http.StatusConflict || !strings.Contains(res.Body.String(), TextCodeConsoleClientOutdated) || !strings.Contains(res.Body.String(), `"action":"reload"`) {
		t.Fatalf("stale assets must not execute workflow forms: %d %s", res.Code, res.Body.String())
	}
	res = f.do(t, http.MethodPost, "/admin/work/api/panels/tasks/actions/plan", console.ClientCapabilityActionAvailability, map[string]any{"request_id": requestID})
	if res.Code != http.StatusConflict {
		t.Fatalf("an under-capable client must not execute: %d %s", res.Code, res.Body.String())
	}
	for _, payload := range []map[string]any{{}, {"request_id": "typed-by-hand"}, {"request_id": 42}} {
		res = f.do(t, http.MethodPost, "/admin/work/api/panels/tasks/actions/plan", consoleWorkflowCapabilities, payload)
		var result console.PanelActionResult
		if res.Code != http.StatusOK || json.Unmarshal(res.Body.Bytes(), &result) != nil || result.OK || result.Errors["request_id"] == nil {
			t.Fatalf("malformed generated IDs must fail as field errors: %d %s", res.Code, res.Body.String())
		}
	}
	if f.dispatch.Load() != 0 {
		t.Fatal("refused requests reached the handler")
	}
	res = f.do(t, http.MethodPost, "/admin/work/api/panels/tasks/actions/plan", consoleWorkflowCapabilities, map[string]any{"request_id": requestID, "dry_run": true})
	var accepted console.PanelActionResult
	if res.Code != http.StatusOK || json.Unmarshal(res.Body.Bytes(), &accepted) != nil || !accepted.OK || accepted.Tone != console.PanelToneInfo || accepted.Record == nil {
		t.Fatalf("plan dispatch: %d %s", res.Code, res.Body.String())
	}
	if payload := <-f.payloads; payload["request_id"] != requestID || payload["dry_run"] != true {
		t.Fatalf("handler payload = %+v", payload)
	}
	res = f.do(t, http.MethodPost, "/admin/work/api/panels/tasks/actions/plain", "", map[string]any{})
	if res.Code != http.StatusOK {
		t.Fatalf("schema-v1 actions keep working for legacy clients: %d %s", res.Code, res.Body.String())
	}
	<-f.payloads
	res = f.do(t, http.MethodPost, "/admin/work/api/panels/tasks/actions/reset", consoleWorkflowCapabilities, map[string]any{})
	if res.Code != http.StatusNotFound {
		t.Fatalf("unavailable declarations never dispatch: %d %s", res.Code, res.Body.String())
	}

	f.execute.Store(false)
	if got := consoleActionIDs(f.actions(t, consoleWorkflowCapabilities)); got != "reset" {
		t.Fatalf("without execute grants only display metadata remains: %s", got)
	}
	res = f.do(t, http.MethodPost, "/admin/work/api/panels/tasks/actions/plan", "", map[string]any{"request_id": requestID})
	if res.Code != http.StatusNotFound {
		t.Fatalf("a revoked grant is not reported as an outdated client: %d %s", res.Code, res.Body.String())
	}
}

func TestConsoleOptionsAndPendingRequestRoutes(t *testing.T) {
	f := newConsoleWorkflowFixture(t)
	path := "/admin/work/api/panels/tasks/actions/plan/options/receipt?limit=500&q=ready&cursor=page-1&value=r-old&value=%3Cx%3E"
	res := f.do(t, http.MethodGet, path, consoleWorkflowCapabilities, nil)
	if res.Code != http.StatusOK {
		t.Fatalf("options: %d %s", res.Code, res.Body.String())
	}
	query := <-f.options
	if query.PanelID != "tasks" || query.ActionID != "plan" || query.Field != "receipt" || query.Limit != console.PanelOptionPageMax ||
		query.Search != "ready" || query.Cursor != "page-1" || strings.Join(query.Values, ",") != "r-old" {
		t.Fatalf("normalized option query = %+v", query)
	}
	var page console.PanelOptionPage
	if err := json.Unmarshal(res.Body.Bytes(), &page); err != nil || len(page.Items) != console.PanelOptionPageMax || page.NextCursor != "page-2" || len(page.Selected) != 1 {
		t.Fatalf("option page = %d items, cursor %q, selected %d (%v)", len(page.Items), page.NextCursor, len(page.Selected), err)
	}
	for _, refused := range []struct{ path, capabilities string }{
		{"/admin/work/api/panels/tasks/actions/plan/options/receipt", ""},
		{"/admin/work/api/panels/tasks/actions/plan/options/batch_limit", consoleWorkflowCapabilities},
		{"/admin/work/api/panels/tasks/actions/reset/options/receipt", consoleWorkflowCapabilities},
		{"/admin/work/api/panels/tasks/actions/missing/options/receipt", consoleWorkflowCapabilities},
	} {
		if res = f.do(t, http.MethodGet, refused.path, refused.capabilities, nil); res.Code != http.StatusNotFound {
			t.Fatalf("%s (%q) must be refused: %d", refused.path, refused.capabilities, res.Code)
		}
	}

	f.execute.Store(false)
	res = f.do(t, http.MethodGet, "/admin/work/api/panels/tasks/requests/0b7e2c4a-1f3d-4c5e-9a8b-7c6d5e4f3a2b?action=Plan&scope=refresh:preview&submitted_at=2026-10-02T09:00:00%2B02:00", consoleWorkflowCapabilities, nil)
	if res.Code != http.StatusOK {
		t.Fatalf("request status: %d %s", res.Code, res.Body.String())
	}
	lookup := <-f.requests
	if lookup.PanelID != "tasks" || lookup.ActionID != "plan" || lookup.Scope != "refresh:preview" || lookup.RequestID != "0b7e2c4a-1f3d-4c5e-9a8b-7c6d5e4f3a2b" ||
		!lookup.SubmittedAt.Equal(time.Date(2026, 10, 2, 7, 0, 0, 0, time.UTC)) {
		t.Fatalf("request query = %+v", lookup)
	}
	var status console.PanelRequestStatus
	if err := json.Unmarshal(res.Body.Bytes(), &status); err != nil || status.Status != console.PanelRequestClaimed || status.Result == nil || status.Result.Tone != "" || status.RetryUntil != "2026-10-03T10:00:00Z" {
		t.Fatalf("request status = %+v (%v)", status, err)
	}
	if res = f.do(t, http.MethodGet, "/admin/work/api/panels/tasks/requests/not-a-uuid?action=plan", consoleWorkflowCapabilities, nil); res.Code != http.StatusBadRequest {
		t.Fatalf("malformed request IDs are rejected: %d %s", res.Code, res.Body.String())
	}
	res = f.do(t, http.MethodGet, "/admin/work/api/panels/tasks/requests/0b7e2c4a-1f3d-4c5e-9a8b-7c6d5e4f3a2b?action=plan&submitted_at=2999-01-01T00:00:00Z", consoleWorkflowCapabilities, nil)
	if res.Code != http.StatusOK || !(<-f.requests).SubmittedAt.IsZero() {
		t.Fatalf("a future submission time is ignored: %d %s", res.Code, res.Body.String())
	}
}

func TestConsoleWatchProjectsDeclarationsForTheAdvertisedClient(t *testing.T) {
	f := newConsoleWorkflowFixture(t)
	for _, tc := range []struct {
		capabilities string
		want         string
	}{{"", "plain"}, {consoleWorkflowCapabilities, "plain,plan,reset"}} {
		ctx, cancel := context.WithCancel(console.WithClientCapabilities(t.Context(), console.ParseClientCapabilities(tc.capabilities)))
		messages := make(chan any, 4)
		done := make(chan error, 1)
		go func() {
			done <- f.host.Watch(ctx, consoleTestIdentity("work"), []string{"tasks"}, func(value any) error { messages <- value; return nil })
		}()
		select {
		case value := <-messages:
			snapshot, ok := value.(console.Snapshot)
			if !ok {
				t.Fatalf("first live frame %T", value)
			}
			got := map[string]console.PanelUIAction{}
			for _, action := range snapshot.Panels[0].UI.Actions {
				got[action.ID] = action
			}
			if ids := consoleActionIDs(got); ids != tc.want {
				t.Fatalf("live declarations for %q = %s", tc.capabilities, ids)
			}
		case <-time.After(time.Second):
			t.Fatal("missing live snapshot")
		}
		cancel()
		<-done
	}
}

func TestConsoleSnapshotPreparerPreservesEventWatermark(t *testing.T) {
	var revoked, execute atomic.Bool
	h := consoleTestHost(t, "data", &revoked, &execute)
	id := consoleTestIdentity("data")
	h.config.PrepareSnapshot = func(ctx context.Context, _ console.Identity) (context.Context, error) {
		_, err := h.Events().Publish(console.Event{Identity: id, PanelID: "records", Record: console.Record{Key: "during-load", Revision: 1}, Kind: console.EventInvalidate})
		return ctx, err
	}
	snap, err := h.Snapshot(t.Context(), id)
	if err != nil || snap.Watermark != 0 || h.Events().Watermark(id) != 1 {
		t.Fatal("preparation swallowed concurrent events", snap, err)
	}
}
