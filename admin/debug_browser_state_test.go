package admin

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/goliatone/go-admin/console"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func debugBrowserStateRequest(ctx context.Context) *router.MockContext {
	c := router.NewMockContext()
	c.On("Context").Return(ctx)
	return c
}

func TestDebugBrowserStateNamespaceKeepsLegacyKeysForUnscopedDebug(t *testing.T) {
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "alice"})
	if got := debugBrowserStateNamespace(DebugConfig{}, debugBrowserStateRequest(ctx)); got != "" {
		t.Fatalf("unscoped Debug must keep legacy browser keys, got %q", got)
	}
	if got := debugBrowserStateNamespace(DebugConfig{AppID: "app"}, nil); got != "" {
		t.Fatalf("missing request must not invent an identity, got %q", got)
	}
}

func TestDebugBrowserStateNamespaceUsesTrustedIdentity(t *testing.T) {
	cfg := DebugConfig{AppID: "crm", Environment: "staging"}
	alice := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "alice", TenantID: "t1", OrganizationID: "o1"})
	got := debugBrowserStateNamespace(cfg, debugBrowserStateRequest(alice))
	var identity console.Identity
	if err := json.Unmarshal([]byte(got), &identity); err != nil {
		t.Fatalf("namespace is not an encoded identity: %q (%v)", got, err)
	}
	want := console.Identity{ConsoleID: debugModuleID, ApplicationID: "crm", EnvironmentID: "staging", ActorID: "alice", ScopeKey: `["t1","o1"]`}
	if identity != want {
		t.Fatalf("namespace identity = %+v, want %+v", identity, want)
	}

	otherScope := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "alice", TenantID: "t2", OrganizationID: "o1"})
	otherActor := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "bob", TenantID: "t1", OrganizationID: "o1"})
	for name, ctx := range map[string]context.Context{"scope": otherScope, "actor": otherActor} {
		if debugBrowserStateNamespace(cfg, debugBrowserStateRequest(ctx)) == got {
			t.Fatalf("browser state crossed %s", name)
		}
	}
	if debugBrowserStateNamespace(DebugConfig{AppID: "crm", Environment: "prod"}, debugBrowserStateRequest(alice)) == got {
		t.Fatal("browser state crossed environment")
	}
}

func TestDebugBrowserStateNamespaceIgnoresUntrustedRequestIdentity(t *testing.T) {
	c := debugBrowserStateRequest(context.Background())
	c.HeadersM["X-User-ID"] = "spoofed"
	c.QueriesM[ScopeTenantIDKey] = "spoofed-tenant"
	got := debugBrowserStateNamespace(DebugConfig{AppID: "crm"}, c)
	var identity console.Identity
	if err := json.Unmarshal([]byte(got), &identity); err != nil {
		t.Fatalf("namespace is not an encoded identity: %q (%v)", got, err)
	}
	if identity.ActorID != "" || identity.ScopeKey != `["",""]` {
		t.Fatalf("request headers or query values leaked into identity: %+v", identity)
	}
}

func TestDebugViewContextPublishesBrowserStateNamespace(t *testing.T) {
	cfg := DebugConfig{AppID: "crm", LayoutMode: DebugLayoutStandalone}
	alice := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "alice"})
	view := buildDebugViewContext(nil, cfg, debugBrowserStateRequest(alice), router.ViewContext{})
	if view["debug_preferences_namespace"] != debugBrowserStateNamespace(cfg, debugBrowserStateRequest(alice)) {
		t.Fatalf("debug page context namespace = %v", view["debug_preferences_namespace"])
	}
	host := buildDebugViewContext(nil, cfg, debugBrowserStateRequest(alice), router.ViewContext{"debug_preferences_namespace": "host"})
	if host["debug_preferences_namespace"] != "host" {
		t.Fatal("host view context builders keep ownership of the namespace")
	}
}
