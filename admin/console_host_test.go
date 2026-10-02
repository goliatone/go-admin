package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
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
			if !errors.Is(err, ErrForbidden) || len(snapshot.Panels) != 0 {
				t.Fatalf("projection disclosed stale snapshot: %+v %v", snapshot, err)
			}
		})
	}
}
