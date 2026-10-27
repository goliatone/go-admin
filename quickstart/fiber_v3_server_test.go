package quickstart

import (
	"context"
	"errors"
	"fmt"
	"html"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	fiber "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type fiberV3ProbeViews struct{}

func (fiberV3ProbeViews) Load() error { return nil }
func (fiberV3ProbeViews) Render(w io.Writer, name string, data any, layouts ...string) error {
	_, err := fmt.Fprintf(w, "<p>%s</p>", html.EscapeString(name))
	return err
}

type fiberV3ProbeContextKey struct{}

func TestFiberV3ServerInjectedTransport(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	var captured error
	srv, r := NewFiberV3Server(fiberV3ProbeViews{}, cfg, nil, false, WithFiberV3Logger(false),
		WithFiberV3Middleware(func(c fiber.Ctx) error {
			c.SetContext(context.WithValue(c.Context(), fiberV3ProbeContextKey{}, "request"))
			return c.Next()
		}),
		WithFiberV3ErrorHandler(func(c fiber.Ctx, err error) error {
			captured = err
			status := 500
			if native, ok := errors.AsType[*fiber.Error](err); ok {
				status = native.Code
			}
			if _, ok := errors.AsType[*fiberOwnedRouteMissError](err); ok {
				status = 404
			}
			return c.Status(status).JSON(map[string]any{"handled": true})
		}))
	r.Get("/admin/view", func(c router.Context) error {
		if c.Context().Value(fiberV3ProbeContextKey{}) != "request" {
			return errors.New("missing context")
		}
		return c.Render("<probe>", router.ViewContext{})
	})
	r.Get("/admin/failure", func(c router.Context) error { return fmt.Errorf("wrapped: %w", fiber.NewError(418, "teapot")) })
	r.Get("/admin/returned", func(c router.Context) error { return fiber.ErrNotFound })
	r.Get("/admin/panic", func(c router.Context) error { panic("probe") })
	r.Get("/admin/explicit", func(c router.Context) error { return c.JSON(404, map[string]any{"explicit": true}) })
	srv.Init()
	for _, probe := range []struct {
		path   string
		status int
		body   string
	}{{"/admin/view", 200, "&lt;probe&gt;"}, {"/admin/failure", 418, "handled"}, {"/admin/panic", 500, "handled"}, {"/admin/missing", 404, "handled"}, {"/admin/api/missing", 404, "handled"}, {"/admin/explicit", 404, "explicit"}, {"/admin/returned", 404, "handled"}, {"/outside", 404, "handled"}} {
		t.Run(probe.path, func(t *testing.T) {
			captured = nil
			resp, err := srv.WrappedRouter().Test(httptest.NewRequest(http.MethodGet, probe.path, nil))
			if err != nil {
				t.Fatal(err)
			}
			body, err := io.ReadAll(resp.Body)
			closeResponseBody(t, resp)
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != probe.status || !strings.Contains(string(body), probe.body) {
				t.Fatalf("status=%d body=%s", resp.StatusCode, body)
			}
			if strings.HasSuffix(probe.path, "missing") {
				var miss *fiberOwnedRouteMissError
				if !errors.As(captured, &miss) {
					t.Fatalf("expected owned miss, got %v", captured)
				}
				if miss.metadata()["synthetic"] != true {
					t.Fatal("missing classification")
				}
			}
			if probe.path == "/admin/returned" || probe.path == "/outside" {
				if _, ok := errors.AsType[*fiberOwnedRouteMissError](captured); ok {
					t.Fatal("explicit/native external error reclassified")
				}
			}
			if probe.path == "/admin/explicit" && captured != nil {
				t.Fatal("explicit response rewritten")
			}
		})
	}
}

func TestFiberV3ServerStartupAndListenOptions(t *testing.T) {
	occupied, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer occupied.Close()
	srv, _ := NewFiberV3Server(nil, admin.Config{}, nil, false, WithFiberV3Logger(false))
	if err := srv.Serve(occupied.Addr().String()); err == nil {
		t.Fatal("occupied port error lost")
	}
	sentinel := errors.New("before serve")
	called := false
	srv, _ = NewFiberV3Server(nil, admin.Config{}, nil, false, WithFiberV3Logger(false), WithFiberV3AdapterConfig(func(c *router.FiberV3AdapterConfig) {
		c.ListenConfig = fiber.ListenConfig{DisableStartupMessage: true, BeforeServeFunc: func(*fiber.App) error { called = true; return sentinel }}
	}))
	if err := srv.Serve("127.0.0.1:0"); !errors.Is(err, sentinel) || !called {
		t.Fatalf("listen hook called=%v err=%v", called, err)
	}
	addresses := make(chan string, 1)
	srv, r := NewFiberV3Server(nil, admin.Config{}, nil, false, WithFiberV3Logger(false), WithFiberV3AdapterConfig(func(c *router.FiberV3AdapterConfig) {
		c.ListenConfig = fiber.ListenConfig{DisableStartupMessage: true, ListenerAddrFunc: func(a net.Addr) { addresses <- a.String() }}
	}))
	r.Get("/health", func(c router.Context) error { return c.SendString("ready") })
	done := make(chan error, 1)
	go func() { done <- srv.Serve("127.0.0.1:0") }()
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			t.Error(err)
		}
		select {
		case err := <-done:
			if err != nil {
				t.Error(err)
			}
		case <-time.After(3 * time.Second):
			t.Error("server did not exit")
		}
	}()
	var address string
	select {
	case address = <-addresses:
	case <-time.After(3 * time.Second):
		t.Fatal("listen address option not called")
	}
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://" + address + "/health")
	if err != nil {
		t.Fatal(err)
	}
	closeResponseBody(t, resp)
	if resp.StatusCode != 200 {
		t.Fatalf("status=%d", resp.StatusCode)
	}
}

func TestFiberV3RPCWrappedHostAndDebugRegistration(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })
	cfg := NewAdminConfig("/admin", "Admin", "en", WithDebugConfig(admin.DebugConfig{Enabled: true, LayoutMode: admin.DebugLayoutDashboard, AllowedIPs: []string{"0.0.0.0", "127.0.0.1", "::1"}}))
	authn := &rpcTestAuthenticator{}
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithMinimalFeatures(), WithAdminDependencies(admin.Dependencies{Authenticator: authn, Authorizer: allowAllQuickstartAuthorizer{}}), WithRPCTransport(RPCTransportConfig{Enabled: true, DiscoveryEnabled: true}))
	if err != nil {
		t.Fatal(err)
	}
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatal(err)
	}
	srv, r := NewFiberV3Server(fiberV3ProbeViews{}, cfg, adm, false, WithFiberV3Logger(false), WithFiberV3ErrorHandler(func(c fiber.Ctx, err error) error {
		mapped, status := admin.NewErrorPresenter(cfg.Errors).Present(err)
		return c.Status(status).JSON(mapped)
	}))
	host := NewHostRouter(r, cfg)
	if err := adm.Initialize(host.Admin()); err != nil {
		t.Fatal(err)
	}
	srv.Init()
	if resolveRPCFiberV3Router(rpcTransportUnderlyingRouterStub{underlying: host.Admin()}) == nil {
		t.Fatal("wrapped v3 router not found")
	}
	if resolveRPCFiberV3Router(rpcTransportLoopingUnderlyingRouterStub{}) != nil {
		t.Fatal("looping router resolved")
	}
	if resolveRPCFiberV3Router(router.NewFiberAdapter().Router()) != nil {
		t.Fatal("v2 router matched v3")
	}
	for _, probe := range []struct{ method, path, body string }{{"POST", adm.AdminAPIBasePath() + "/rpc", `{"method":"admin.commands.dispatch","params":{"data":{"name":"missing"}}}`}, {"GET", adm.AdminAPIBasePath() + "/rpc/endpoints", ""}} {
		req := httptest.NewRequest(probe.method, probe.path, strings.NewReader(probe.body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := srv.WrappedRouter().Test(req)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(resp.Body)
		closeResponseBody(t, resp)
		if resp.StatusCode != 200 {
			t.Fatalf("%s: status=%d body=%s", probe.path, resp.StatusCode, body)
		}
	}
	if authn.calls == 0 {
		t.Fatal("RPC authentication did not run")
	}
	found := false
	for _, route := range r.Routes() {
		if strings.Contains(route.Path, "debug") && strings.Contains(route.Path, "dashboard") {
			found = true
		}
	}
	if !found {
		t.Fatal("debug dashboard routes missing")
	}
}
