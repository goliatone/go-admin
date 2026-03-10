package quickstart

import (
	"context"
	"net/http"
	"net/http/httptest"
	"path"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
	router "github.com/goliatone/go-router"
)

type quickstartRPCDispatchMessage struct{}

func (quickstartRPCDispatchMessage) Type() string { return "quickstart.rpc.dispatch.test" }

type rpcTestAuthenticator struct {
	calls int
}

func (a *rpcTestAuthenticator) Wrap(ctx router.Context) error {
	if ctx == nil {
		return nil
	}
	a.calls++
	ctx.SetContext(auth.WithActorContext(ctx.Context(), &auth.ActorContext{
		ActorID:        "rpc-user",
		Subject:        "rpc-user",
		TenantID:       "tenant-1",
		OrganizationID: "org-1",
	}))
	return nil
}

func (a *rpcTestAuthenticator) WrapHandler(handler router.HandlerFunc) router.HandlerFunc {
	if handler == nil {
		handler = func(c router.Context) error { return nil }
	}
	return func(c router.Context) error {
		a.calls++
		if c != nil {
			c.SetContext(auth.WithActorContext(c.Context(), &auth.ActorContext{
				ActorID:        "rpc-user",
				Subject:        "rpc-user",
				TenantID:       "tenant-1",
				OrganizationID: "org-1",
			}))
		}
		return handler(c)
	}
}

type rpcTestAuthorizer struct {
	allow map[string]bool
}

func (a rpcTestAuthorizer) Can(_ context.Context, action string, resource string) bool {
	if a.allow == nil {
		return false
	}
	if a.allow[action] {
		return true
	}
	return a.allow[action+"|"+resource]
}

func TestWithRPCTransportRequiresAuthenticatorByDefault(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	cfg := NewAdminConfig("/admin", "Admin", "en")
	_, _, err := NewAdmin(cfg, AdapterHooks{}, WithRPCTransport(RPCTransportConfig{Enabled: true}))
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "authenticator") {
		t.Fatalf("expected authenticator startup failure, got %v", err)
	}
}

func TestWithRPCTransportMountsInvokeRouteAndHidesDiscoveryByDefault(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	authn := &rpcTestAuthenticator{}
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{
			Authenticator: authn,
			Authorizer: rpcTestAuthorizer{allow: map[string]bool{
				"admin.commands.dispatch|commands": true,
			}},
		}),
		WithRPCTransport(RPCTransportConfig{Enabled: true}),
	)
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	server := router.NewFiberAdapter()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}

	invokePath := path.Join(adm.AdminAPIBasePath(), "rpc")
	endpointsPath := path.Join(invokePath, "endpoints")
	if !hasRoute(server.Router().Routes(), router.POST, invokePath) {
		t.Fatalf("expected rpc invoke route %q", invokePath)
	}
	if hasRoute(server.Router().Routes(), router.GET, endpointsPath) {
		t.Fatalf("did not expect rpc discovery route by default: %q", endpointsPath)
	}

	resp := testFiberRequest(t, server.WrappedRouter(), http.MethodPost, invokePath, `{"method":"admin.commands.dispatch","params":{"data":{"name":"missing"}}}`)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected invoke response status 200, got %d", resp.StatusCode)
	}
	if authn.calls == 0 {
		t.Fatalf("expected authenticator middleware to run for invoke route")
	}
}

func TestWithRPCTransportCanEnableDiscoveryRoute(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{
			Authenticator: &rpcTestAuthenticator{},
			Authorizer: rpcTestAuthorizer{allow: map[string]bool{
				"admin.commands.read|commands": true,
			}},
		}),
		WithRPCTransport(RPCTransportConfig{
			Enabled:          true,
			DiscoveryEnabled: true,
		}),
	)
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	server := router.NewFiberAdapter()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}
	invokePath := path.Join(adm.AdminAPIBasePath(), "rpc")
	endpointsPath := path.Join(invokePath, "endpoints")
	if !hasRoute(server.Router().Routes(), router.GET, endpointsPath) {
		t.Fatalf("expected rpc endpoints route %q", endpointsPath)
	}
}

func TestWithRPCTransportFailsForHTTPRouter(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{
			Authenticator: &rpcTestAuthenticator{},
		}),
		WithRPCTransport(RPCTransportConfig{Enabled: true}),
	)
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	server := router.NewHTTPServer()
	err = adm.Initialize(server.Router())
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "fiber") {
		t.Fatalf("expected fiber startup error, got %v", err)
	}
}

func TestWithRPCTransportAppliesCommandRulesAndPolicyHook(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	hookCalls := 0
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{
			Authenticator: &rpcTestAuthenticator{},
			Authorizer: rpcTestAuthorizer{allow: map[string]bool{
				"admin.rpc.custom|commands": true,
			}},
		}),
		WithRPCTransport(RPCTransportConfig{
			Enabled: true,
			CommandRules: map[string]admin.RPCCommandRule{
				"rpc.transport.test": {Permission: "admin.rpc.custom"},
			},
			Authorize: func(_ context.Context, input admin.RPCCommandPolicyInput) error {
				hookCalls++
				if input.CommandName != "rpc.transport.test" {
					t.Fatalf("unexpected command name %q", input.CommandName)
				}
				return nil
			},
		}),
	)
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}

	bus := adm.Commands()
	if bus == nil {
		t.Fatalf("expected command bus")
	}
	if _, err := admin.RegisterCommand(bus, command.CommandFunc[quickstartRPCDispatchMessage](func(_ context.Context, _ quickstartRPCDispatchMessage) error {
		return nil
	})); err != nil {
		t.Fatalf("register command: %v", err)
	}
	if err := admin.RegisterMessageFactory(bus, "rpc.transport.test", func(payload map[string]any, ids []string) (quickstartRPCDispatchMessage, error) {
		_, _ = payload, ids
		return quickstartRPCDispatchMessage{}, nil
	}); err != nil {
		t.Fatalf("register message factory: %v", err)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user", TenantID: "tenant-1", OrganizationID: "org-1"})
	result, err := adm.RPCServer().Invoke(ctx, admin.RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[admin.RPCCommandDispatchRequest]{
		Data: admin.RPCCommandDispatchRequest{Name: "rpc.transport.test"},
	})
	if err != nil {
		t.Fatalf("invoke rpc dispatch: %v", err)
	}
	if hookCalls == 0 {
		t.Fatalf("expected policy hook to run")
	}
	resp, ok := result.(cmdrpc.ResponseEnvelope[admin.RPCCommandDispatchResponse])
	if !ok || !resp.Data.Receipt.Accepted {
		t.Fatalf("expected accepted dispatch response, got %#v", result)
	}
}

func hasRoute(routes []router.RouteDefinition, method router.HTTPMethod, path string) bool {
	for _, route := range routes {
		if route.Method == method && route.Path == path {
			return true
		}
	}
	return false
}

func testFiberRequest(t *testing.T, app interface {
	Test(req *http.Request, msTimeout ...int) (*http.Response, error)
}, method, target, body string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("test request failed: %v", err)
	}
	return resp
}
