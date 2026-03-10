package quickstart

import (
	"path"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestWithRPCTransportMountsFiberRPCRoutes(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithRPCTransport(RPCTransportConfig{
		Enabled: true,
	}))
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
	if !hasRoute(server.Router().Routes(), router.GET, endpointsPath) {
		t.Fatalf("expected rpc endpoints route %q", endpointsPath)
	}
}

func TestWithRPCTransportRequireFiberFailsForHTTPRouter(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithRPCTransport(RPCTransportConfig{
		Enabled:      true,
		RequireFiber: true,
	}))
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	server := router.NewHTTPServer()
	err = adm.Initialize(server.Router())
	if err == nil {
		t.Fatalf("expected initialize error when rpc transport requires fiber")
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

func TestAdminRPCEndpointsExposeCommandDispatchAndListMethods(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })

	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithRPCTransport(RPCTransportConfig{
		Enabled: true,
	}))
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	rpcServer := adm.RPCServer()
	if rpcServer == nil {
		t.Fatalf("expected rpc server")
	}
	endpoints := rpcServer.EndpointsMeta()
	methods := map[string]bool{}
	for _, endpoint := range endpoints {
		methods[endpoint.Method] = true
	}
	if !methods[admin.RPCMethodCommandDispatch] {
		t.Fatalf("expected endpoint %q", admin.RPCMethodCommandDispatch)
	}
	if !methods[admin.RPCMethodCommandList] {
		t.Fatalf("expected endpoint %q", admin.RPCMethodCommandList)
	}
}
