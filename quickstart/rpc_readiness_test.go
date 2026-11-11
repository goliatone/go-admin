package quickstart

import (
	"context"
	"errors"
	fiber3 "github.com/gofiber/fiber/v3"
	"reflect"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
	router "github.com/goliatone/go-router"
)

type readinessAuthorizer struct{}

func (readinessAuthorizer) Can(context.Context, string, string) bool {
	return false
}
func (readinessAuthorizer) ResolvedPermissions(context.Context) []string {
	panic("startup resolved actor permissions")
}

type opaqueReadinessEndpoint struct{ cmdrpc.EndpointDefinition }

func TestRPCExposureStrictStartup(t *testing.T) {
	for _, kind := range []string{"valid", "dangling", "handler_only", "no_authorizer", "no_exact_resolver", "missing_builtin_resolver", "mount_mismatch", "mount_conflict", "opaque_endpoint", "invalid_endpoint", "discovery_mismatch"} {
		t.Run(kind, func(t *testing.T) {
			resetCommandRegistryForTest(t)
			t.Cleanup(func() { resetCommandRegistryForTest(t) })
			cfg := NewAdminConfig("/admin", "Readiness", "en")
			var authz admin.Authorizer = readinessAuthorizer{}
			if kind == "no_authorizer" {
				authz = nil
			}
			if kind == "no_exact_resolver" {
				authz = rpcTestAuthorizer{}
			}
			if kind == "missing_builtin_resolver" {
				authz = admin.NewGoAuthAuthorizer(admin.GoAuthAuthorizerConfig{})
			}
			name := (quickstartRPCDispatchMessage{}).Type()
			adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithFeatureSet(map[string]bool{"commands": true}), WithAdminDependencies(admin.Dependencies{Authenticator: &rpcTestAuthenticator{}, Authorizer: authz}), WithRPCTransport(RPCTransportConfig{Enabled: true, StrictStartup: true, PermissionMode: admin.RPCCommandPermissionModeExact, CommandRules: map[string]admin.RPCCommandRule{name: {Permission: "probe.write"}}}))
			if err != nil {
				t.Fatal(err)
			}
			calls := 0
			if kind != "dangling" {
				_, err = admin.RegisterCommand(adm.Commands(), command.CommandFunc[quickstartRPCDispatchMessage](func(context.Context, quickstartRPCDispatchMessage) error { calls++; return nil }))
				if err != nil {
					t.Fatal(err)
				}
			}
			if kind != "dangling" && kind != "handler_only" {
				if err = admin.RegisterMessageFactory(adm.Commands(), name, func(map[string]any, []string) (quickstartRPCDispatchMessage, error) {
					calls++
					return quickstartRPCDispatchMessage{}, nil
				}); err != nil {
					t.Fatal(err)
				}
			}
			if kind == "opaque_endpoint" || kind == "invalid_endpoint" {
				var handler func(context.Context, cmdrpc.RequestEnvelope[string]) (cmdrpc.ResponseEnvelope[string], error)
				if kind == "opaque_endpoint" {
					handler = func(context.Context, cmdrpc.RequestEnvelope[string]) (cmdrpc.ResponseEnvelope[string], error) {
						calls++
						return cmdrpc.ResponseEnvelope[string]{}, nil
					}
				}
				var endpoint cmdrpc.EndpointDefinition = cmdrpc.NewEndpoint(cmdrpc.EndpointSpec{Method: "custom"}, handler)
				if kind == "opaque_endpoint" {
					endpoint = opaqueReadinessEndpoint{endpoint}
				}
				if err = adm.RPCServer().RegisterEndpoint(endpoint); err != nil {
					t.Fatal(err)
				}
			}
			server := router.NewFiberAdapter()
			rt := server.Router()
			invoke := adm.AdminAPIBasePath() + "/rpc"
			if kind == "mount_conflict" {
				rt.Post(invoke, func(c router.Context) error { return c.SendStatus(204) })
			}
			if kind == "mount_mismatch" {
				rt = rt.Group("/host")
			}
			if err = adm.Initialize(rt); err != nil {
				t.Fatal(err)
			}
			if kind == "discovery_mismatch" {
				rt.Get(invoke+"/endpoints", func(c router.Context) error { return c.SendStatus(204) })
			}
			before := server.Router().(router.RegistrationInspector).RegistrationSnapshot()
			report := adm.RPCExposureReadiness()
			if report.State != admin.RPCReadinessPending || report.Ready {
				t.Fatalf("early report=%+v", report)
			}
			if after := server.Router().(router.RegistrationInspector).RegistrationSnapshot(); after.Revision != before.Revision || after.State != before.State {
				t.Fatal("report mutated registration")
			}
			rt.Get("/late", func(c router.Context) error { return c.SendStatus(204) })
			var startup any
			func() { defer func() { startup = recover() }(); server.Init() }()
			report = adm.RPCExposureReadiness()
			if kind == "valid" {
				if startup != nil || !report.Ready {
					t.Fatalf("startup=%v report=%+v", startup, report)
				}
			} else {
				if startup == nil || report.Ready {
					t.Fatalf("accepted %s: %+v", kind, report)
				}
				if _, ok := startup.(*router.StartupValidationError); !ok {
					t.Fatalf("unexpected panic %T: %v", startup, startup)
				}
				wanted := map[string]string{"dangling": "command_registration_gaps", "handler_only": "command_registration_gaps", "no_authorizer": "rpc_authorizer_missing", "no_exact_resolver": "rpc_exact_permission_resolver_missing", "missing_builtin_resolver": "rpc_exact_permission_resolver_missing", "mount_mismatch": "rpc_mount_mismatch", "mount_conflict": "rpc_mount_conflict", "opaque_endpoint": "rpc_endpoint_endpoint_unverifiable", "invalid_endpoint": "rpc_endpoint_handler_required", "discovery_mismatch": "rpc_mount_mismatch"}[kind]
				found := false
				for _, issue := range report.Issues {
					if issue.Code == wanted {
						found = true
					}
				}
				if !found {
					t.Fatalf("missing %s in %+v", wanted, report)
				}
				if err := server.Serve("invalid-address"); err != startup {
					t.Fatalf("startup failure not sticky: %v", err)
				}
			}
			if calls != 0 {
				t.Fatalf("startup executed handler/factory %d times", calls)
			}
			if other := adm.RPCExposureReadiness(); !reflect.DeepEqual(report, other) {
				t.Fatal("report nondeterministic")
			}
		})
	}
}

func TestRPCExposureDefaultCompatibleAndDisabled(t *testing.T) {
	for _, enabled := range []bool{false, true} {
		resetCommandRegistryForTest(t)
		cfg := NewAdminConfig("/admin", "Readiness", "en")
		adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithAdminDependencies(admin.Dependencies{Authenticator: &rpcTestAuthenticator{}, Authorizer: rpcTestAuthorizer{}}), WithRPCTransport(RPCTransportConfig{Enabled: enabled, StrictStartup: false, CommandRules: map[string]admin.RPCCommandRule{"dangling": {Permission: "probe"}}}))
		if err != nil {
			t.Fatal(err)
		}
		server := router.NewFiberV3Adapter()
		if err = adm.Initialize(server.Router()); err != nil {
			t.Fatal(err)
		}
		server.Init()
		report := adm.RPCExposureReadiness()
		if enabled && report.State != admin.RPCReadinessInvalid {
			t.Fatalf("report=%+v", report)
		}
		if !enabled && report.State != admin.RPCReadinessDisabled {
			t.Fatalf("report=%+v", report)
		}
	}
	t.Cleanup(func() { resetCommandRegistryForTest(t) })
}

func TestRPCExposureStrictFiberV3HostSurface(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })
	server := router.NewFiberV3Adapter()
	surface := hostSurfaceRouter[any]{} // nil backing capability must fail explicitly.
	if err := surface.RegisterStartupValidator("probe", func() error { return nil }); err == nil {
		t.Fatal("opaque backing router accepted")
	}
	cfg := NewAdminConfig("/admin", "Readiness", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithAdminDependencies(admin.Dependencies{Authenticator: &rpcTestAuthenticator{}, Authorizer: readinessAuthorizer{}}), WithRPCTransport(RPCTransportConfig{Enabled: true, StrictStartup: true}))
	if err != nil {
		t.Fatal(err)
	}
	// The host surface forwards startup capability and physical snapshots.
	if err = adm.Initialize(&hostSurfaceRouter[*fiber3.App]{router: server.Router()}); err != nil {
		t.Fatal(err)
	}
	server.Init()
	if !adm.RPCExposureReadiness().Ready {
		t.Fatal(adm.RPCExposureReadiness())
	}
}

func TestRPCExposureUnverifiableMount(t *testing.T) {
	adm, _, err := NewAdmin(NewAdminConfig("/admin", "Readiness", "en"), AdapterHooks{})
	if err != nil {
		t.Fatal(err)
	}
	adm.ConfigureRPCExposure(admin.RPCExposureConfig{Enabled: true})
	report := adm.RPCExposureReadiness()
	if report.Ready || report.State != admin.RPCReadinessUnverifiable {
		t.Fatalf("report=%+v", report)
	}
	var failure *admin.RPCExposureError
	if !errors.As(adm.ValidateRPCExposure(), &failure) {
		t.Fatal("missing typed failure")
	}
	if !strings.Contains(failure.Error(), "rpc_mount_unverifiable") {
		t.Fatal(failure)
	}
}

func TestRPCExposureDenyAllDoesNotRequirePermissionResolver(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })
	adm, _, err := NewAdmin(NewAdminConfig("/admin", "Readiness", "en"), AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{Authenticator: &rpcTestAuthenticator{}}),
		WithRPCTransport(RPCTransportConfig{Enabled: true, StrictStartup: true, PermissionMode: admin.RPCCommandPermissionModeExact}))
	if err != nil {
		t.Fatal(err)
	}
	server := router.NewFiberAdapter()
	if err = adm.Initialize(server.Router()); err != nil {
		t.Fatal(err)
	}
	server.Init()
	if report := adm.RPCExposureReadiness(); !report.Ready {
		t.Fatalf("deny-all transport: %+v", report)
	}
}

func TestRPCExposureOwnedServerFailurePersists(t *testing.T) {
	t.Run("fiber2", func(t *testing.T) {
		server, _ := NewFiberServer(nil, admin.Config{}, nil, false, WithFiberLogger(false))
		assertOwnedStartupFailure(t, server)
	})
	t.Run("fiber3", func(t *testing.T) {
		server, _ := NewFiberV3Server(nil, admin.Config{}, nil, false, WithFiberV3Logger(false))
		assertOwnedStartupFailure(t, server)
	})
}
func assertOwnedStartupFailure[T any](t *testing.T, server router.Server[T]) {
	t.Helper()
	cause := errors.New("invalid RPC exposure")
	calls := 0
	err := server.Router().(router.StartupValidatorRegistrar).RegisterStartupValidator("rpc", func() error { calls++; return cause })
	if err != nil {
		t.Fatal(err)
	}
	first := server.(router.StartupInitializer).Initialize()
	if !errors.Is(first, cause) {
		t.Fatalf("Initialize=%v", first)
	}
	for range 3 {
		if err := server.Serve("invalid-address"); err != first {
			t.Fatalf("Serve=%v", err)
		}
		for _, start := range []func(){server.Init, func() { server.WrappedRouter() }} {
			func() {
				defer func() {
					if value := recover(); value != first {
						t.Errorf("startup panic=%v", value)
					}
				}()
				start()
				t.Error("startup accepted failure")
			}()
		}
	}
	if calls != 1 {
		t.Fatalf("validator called %d times", calls)
	}
}
