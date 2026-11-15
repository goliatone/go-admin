package quickstart

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	f2 "github.com/gofiber/fiber/v2"
	f3 "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type hostingTestCapabilities interface {
	router.StartupInitializer
	router.ManagedServer
	router.BoundedIngressServer
	router.BoundedIngressValidator
}

type hostingContextKey struct{}
type quickstartHostingProbe struct {
	host            hostingTestCapabilities
	init            func()
	serve           func(string) error
	shutdown        func(context.Context) error
	request         func(*http.Request) (*http.Response, error)
	register        func(router.HTTPMethod, string, router.HandlerFunc)
	static          func(string)
	miss            func(router.HTTPMethod, router.HandlerFunc)
	validate        func(string, func() error) error
	snapshot        func() router.RegistrationSnapshot
	count           func() int
	mount           func(*admin.Admin) error
	middlewareCalls atomic.Int32
}

func hostingProbeFor(t *testing.T, major string, immediate bool) *quickstartHostingProbe {
	t.Helper()
	p := &quickstartHostingProbe{}
	cfg := admin.Config{BasePath: "/admin"}
	adapterConfig := func(c *router.FiberAdapterConfig) {
		c.PreserveRegistrationOrder = immediate
		c.OrderRoutesBySpecificity = !immediate
		c.StrictRoutes = true
	}
	if major == "v2" {
		s, r := NewFiberServer(nil, cfg, nil, false, WithFiberLogger(false), WithFiberAdapterConfig(adapterConfig), WithFiberMiddleware(nil, func(c *f2.Ctx) error {
			p.middlewareCalls.Add(1)
			c.Set("X-Native", "v2")
			c.Set("X-Observed-ID", c.Get("X-Request-ID"))
			c.SetUserContext(context.WithValue(c.UserContext(), hostingContextKey{}, "native"))
			return c.Next()
		}))
		bindHostingProbe(t, p, s, r, cfg)
		p.request = func(req *http.Request) (*http.Response, error) { return s.WrappedRouter().Test(req, -1) }
		p.count = func() int {
			n := 0
			for _, routes := range s.WrappedRouter().Stack() {
				for _, route := range routes {
					n += len(route.Handlers)
				}
			}
			return n
		}
	} else {
		s, r := NewFiberV3Server(nil, cfg, nil, false, WithFiberV3Logger(false), WithFiberV3AdapterConfig(func(c *router.FiberV3AdapterConfig) {
			adapterConfig(&c.FiberAdapterConfig)
			c.ListenConfig.DisableStartupMessage = true
		}), WithFiberV3Middleware(nil, func(c f3.Ctx) error {
			p.middlewareCalls.Add(1)
			c.Set("X-Native", "v3")
			c.Set("X-Observed-ID", c.Get("X-Request-ID"))
			c.SetContext(context.WithValue(c.Context(), hostingContextKey{}, "native"))
			return c.Next()
		}))
		bindHostingProbe(t, p, s, r, cfg)
		p.request = func(req *http.Request) (*http.Response, error) {
			return s.WrappedRouter().Test(req, f3.TestConfig{Timeout: 0})
		}
		p.count = func() int {
			n := 0
			for _, routes := range s.WrappedRouter().Stack() {
				for _, route := range routes {
					n += len(route.Handlers)
				}
			}
			return n
		}
	}
	return p
}

func bindHostingProbe[T any](t *testing.T, p *quickstartHostingProbe, s router.Server[T], r router.Router[T], cfg admin.Config) {
	t.Helper()
	var ok bool
	p.host, ok = s.(hostingTestCapabilities)
	if !ok {
		t.Fatalf("returned server %T hides hosting/ingress capabilities", s)
	}
	p.init = s.Init
	p.serve = s.Serve
	p.shutdown = s.Shutdown
	p.register = func(m router.HTTPMethod, path string, h router.HandlerFunc) { r.Group("/admin/api").Handle(m, path, h) }
	p.static = func(dir string) { r.Group("/admin/api").Static("/assets", dir) }
	p.miss = func(m router.HTTPMethod, h router.HandlerFunc) { r.(router.MissHandlerRegistrar).HandleMiss(m, h) }
	p.validate = r.(router.StartupValidatorRegistrar).RegisterStartupValidator
	p.snapshot = r.(router.RegistrationInspector).RegistrationSnapshot
	p.mount = func(a *admin.Admin) error { return a.Initialize(NewHostRouter(r, cfg).Admin()) }
}

func hostingWait(t *testing.T, ch <-chan struct{}, what string) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(4 * time.Second):
		t.Fatalf("timeout: %s", what)
	}
}
func hostingStart(t *testing.T, p *quickstartHostingProbe, options router.ManagedOptions) router.ManagedRun {
	t.Helper()
	if options.Address == "" {
		options.Address = "127.0.0.1:0"
	}
	if options.DrainTimeout == 0 {
		options.DrainTimeout = time.Second
	}
	run, err := p.host.StartManaged(context.Background(), options)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
		defer cancel()
		if err := run.Stop(ctx); err != nil {
			t.Error(err)
		}
		if err := run.Wait(ctx); err != nil {
			t.Error(err)
		}
	})
	select {
	case <-run.Serving():
	case <-run.Done():
		t.Fatalf("failed before Serving: %v", run.Wait(context.Background()))
	case <-time.After(4 * time.Second):
		t.Fatal("Serving timeout")
	}
	return run
}

func TestFiberHostingCapabilitiesAndFinalization(t *testing.T) {
	for _, major := range []string{"v2", "v3"} {
		for _, immediate := range []bool{false, true} {
			for _, socket := range []bool{false, true} {
				for _, policy := range []string{"legacy", "native", "reject", "custom"} {
					t.Run(fmt.Sprintf("%s/immediate=%t/socket=%t/%s", major, immediate, socket, policy), func(t *testing.T) {
						p := hostingProbeFor(t, major, immediate)
						var strategies atomic.Int32
						if policy != "legacy" {
							options := router.BoundedIngressOptions{}
							switch policy {
							case "reject":
								options.UnknownMethod.Policy = router.UnknownMethodReject
							case "custom":
								options.UnknownMethod.Policy = router.UnknownMethodCustom
								options.UnknownMethod.Handler = router.UnknownMethodHandlerFunc(func(_ context.Context, r router.UnknownMethodRequest) (router.UnknownMethodDecision, error) {
									strategies.Add(1)
									if r.RequestID == "" || r.RequestID == "forged" {
										t.Error("untrusted strategy correlation")
									}
									return router.UnknownMethodDecision{Action: router.RejectUnknownMethod, Rejection: router.UnknownMethodRejection{Status: 422, Code: "CUSTOM_METHOD", Message: "unsupported"}}, nil
								})
							}
							if err := p.host.ValidateBoundedIngress(options); err != nil {
								t.Fatal(err)
							}
							if p.snapshot().State != router.RegistrationCollecting {
								t.Fatal("preflight finalized routes")
							}
							if err := p.host.ConfigureBoundedIngress(options); err != nil {
								t.Fatal(err)
							}
						}
						p.register(router.GET, "/health", func(c router.Context) error {
							if c.Context().Value(hostingContextKey{}) != "native" {
								t.Error("native context lost")
							}
							return c.SendString("healthy")
						})
						p.register(router.GET, "/panic", func(router.Context) error { panic("recovery probe") })
						p.miss(router.PUT, func(c router.Context) error { return c.Status(404).SendString("caller-miss") })
						dir := t.TempDir()
						if err := os.WriteFile(filepath.Join(dir, "probe.txt"), []byte("asset"), 0600); err != nil {
							t.Fatal(err)
						}
						p.static(dir)
						var validators atomic.Int32
						if err := p.validate("complete", func() error {
							validators.Add(1)
							if p.snapshot().State != router.RegistrationSealed {
								return errors.New("validator ran before sealing")
							}
							return nil
						}); err != nil {
							t.Fatal(err)
						}
						var wg sync.WaitGroup
						for range 4 {
							wg.Add(1)
							go func() {
								defer wg.Done()
								if err := p.host.Initialize(); err != nil {
									t.Error(err)
								}
							}()
						}
						wg.Wait()
						p.init()
						if validators.Load() != 1 {
							t.Fatalf("validators=%d", validators.Load())
						}
						request := p.request
						base := "http://example.test"
						if socket {
							run := hostingStart(t, p, router.ManagedOptions{})
							base = "http://" + run.Address()
							client := &http.Client{Timeout: 3 * time.Second}
							request = client.Do
						}
						// Create the token only after initialization/Serving, never from a whitelist.
						var random [12]byte
						if _, err := rand.Read(random[:]); err != nil {
							t.Fatal(err)
						}
						unknown := fmt.Sprintf("X-%x", random)
						unknownStatus := 400
						if major == "v3" {
							unknownStatus = 501
						}
						if policy == "reject" {
							unknownStatus = 501
						}
						if policy == "custom" {
							unknownStatus = 422
						}
						for _, probe := range []struct {
							method, path string
							status       int
							body         string
						}{{"GET", "/admin/api/health", 200, "healthy"}, {"GET", "/admin/api/assets/probe.txt", 200, "asset"}, {"PUT", "/admin/api/missing", 404, "caller-miss"}, {"GET", "/admin/api/missing", 404, ""}, {"GET", "/admin/api/panic", 500, ""}, {unknown, "/admin/api/health", unknownStatus, ""}} {
							req := httptest.NewRequestWithContext(t.Context(), probe.method, base+probe.path, nil)
							req.RequestURI = ""
							req.Header.Set("X-Request-ID", "forged")
							before := p.middlewareCalls.Load()
							resp, err := request(req)
							if err != nil {
								t.Fatal(err)
							}
							body, readErr := io.ReadAll(resp.Body)
							closeResponseBody(t, resp)
							if readErr != nil {
								t.Fatal(readErr)
							}
							if resp.StatusCode != probe.status || !strings.Contains(string(body), probe.body) {
								t.Fatalf("%s %s: %d %s", probe.method, probe.path, resp.StatusCode, body)
							}
							if probe.method != unknown {
								if p.middlewareCalls.Load() != before+1 || resp.Header.Get("X-Native") != major {
									t.Fatal("native stack duplicated or skipped")
								}
							}
							if policy != "legacy" {
								id := resp.Header.Get("X-Request-ID")
								if id == "" || id == "forged" {
									t.Fatalf("generated correlation missing: %q", id)
								}
								if probe.method != unknown && resp.Header.Get("X-Observed-ID") != id {
									t.Fatal("native context/header correlation differs")
								}
							}
							if probe.method == unknown && (policy == "reject" || policy == "custom") {
								var envelope router.IngressErrorEnvelope
								if err := json.Unmarshal(body, &envelope); err != nil {
									t.Fatal(err)
								}
								if len(body) > router.IngressMaxEnvelopeBytes || envelope.RequestID != resp.Header.Get("X-Request-ID") || p.middlewareCalls.Load() != before {
									t.Fatal("ingress rejection escaped selected policy")
								}
							}
						}
						want := int32(0)
						if policy == "custom" {
							want = 1
						}
						if strategies.Load() != want {
							t.Fatalf("strategy count=%d", strategies.Load())
						}
						if !socket {
							count := p.count()
							p.init()
							p.init()
							if p.count() != count {
								t.Fatal("terminal/native registration repeated")
							}
						}
						if err := p.validate("late", func() error { return nil }); !errors.Is(err, router.ErrRouterSealed) {
							t.Fatalf("late validator: %v", err)
						}
					})
				}
			}
		}
	}
}

func TestFiberHostingStartupBoundaries(t *testing.T) {
	for _, major := range []string{"v2", "v3"} {
		t.Run(major+"/pre-canceled", func(t *testing.T) {
			p := hostingProbeFor(t, major, false)
			var calls atomic.Int32
			if err := p.validate("must-not-run", func() error { calls.Add(1); return nil }); err != nil {
				t.Fatal(err)
			}
			ctx, cancel := context.WithCancel(context.Background())
			cancel()
			run, err := p.host.StartManaged(ctx, router.ManagedOptions{Address: "127.0.0.1:0", DrainTimeout: time.Second})
			if run != nil || !errors.Is(err, context.Canceled) || calls.Load() != 0 || p.snapshot().State != router.RegistrationCollecting {
				t.Fatalf("run=%v err=%v validators=%d", run, err, calls.Load())
			}
		})
		t.Run(major+"/raw-mixing", func(t *testing.T) {
			p := hostingProbeFor(t, major, false)
			p.count()
			run, err := p.host.StartManaged(context.Background(), router.ManagedOptions{Address: "127.0.0.1:0", DrainTimeout: time.Second})
			if run != nil || !errors.Is(err, router.ErrHostingMode) {
				t.Fatalf("run=%v err=%v", run, err)
			}
		})
		t.Run(major+"/sticky-validation", func(t *testing.T) {
			p := hostingProbeFor(t, major, false)
			sentinel := errors.New("startup sentinel")
			var calls atomic.Int32
			if err := p.validate("reject", func() error { calls.Add(1); return sentinel }); err != nil {
				t.Fatal(err)
			}
			for range 2 {
				err := p.host.Initialize()
				var typed *router.StartupValidationError
				if !errors.Is(err, sentinel) || !errors.As(err, &typed) {
					t.Fatalf("lost startup identity: %v", err)
				}
			}
			if err := p.serve("127.0.0.1:0"); !errors.Is(err, sentinel) {
				t.Fatal(err)
			}
			run, err := p.host.StartManaged(context.Background(), router.ManagedOptions{Address: "127.0.0.1:0", DrainTimeout: time.Second})
			if err != nil {
				t.Fatal(err)
			}
			hostingWait(t, run.Done(), "failed startup")
			if !errors.Is(run.Wait(context.Background()), sentinel) || calls.Load() != 1 {
				t.Fatal("failure replayed/lost")
			}
			select {
			case <-run.Bound():
				t.Fatal("bound despite validation failure")
			default:
			}
		})
		t.Run(major+"/stop-in-OnBound", func(t *testing.T) {
			for range 10 {
				p := hostingProbeFor(t, major, false)
				entered := make(chan struct{})
				release := make(chan struct{})
				unblock := sync.OnceFunc(func() { close(release) })
				t.Cleanup(unblock)
				run, err := p.host.StartManaged(context.Background(), router.ManagedOptions{Address: "127.0.0.1:0", DrainTimeout: time.Second, OnBound: func(ctx context.Context, _ string) error { close(entered); <-release; return ctx.Err() }})
				if err != nil {
					t.Fatal(err)
				}
				hostingWait(t, entered, "OnBound")
				ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
				err = run.Stop(ctx)
				cancel()
				unblock()
				if !errors.Is(err, context.DeadlineExceeded) {
					t.Fatalf("Stop during blocked OnBound: %v", err)
				}
				hostingWait(t, run.Done(), "stop completion")
				select {
				case <-run.Serving():
					t.Fatal("served after stop")
				default:
				}
				if err := run.Wait(context.Background()); err != nil && !errors.Is(err, context.Canceled) {
					t.Fatal(err)
				}
			}
		})
	}
}

func TestFiberHostingRPCFinalization(t *testing.T) {
	for _, major := range []string{"v2", "v3"} {
		t.Run(major, func(t *testing.T) {
			resetCommandRegistryForTest(t)
			t.Cleanup(func() { resetCommandRegistryForTest(t) })
			cfg := NewAdminConfig("/admin", "Admin", "en")
			cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
			adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithMinimalFeatures(), WithAdminDependencies(admin.Dependencies{Authenticator: &rpcTestAuthenticator{}, Authorizer: allowAllQuickstartAuthorizer{}}), WithRPCTransport(RPCTransportConfig{Enabled: true, DiscoveryEnabled: false}))
			if err != nil {
				t.Fatal(err)
			}
			p := hostingProbeFor(t, major, false)
			if err := p.mount(adm); err != nil {
				t.Fatal(err)
			}
			var validated atomic.Bool
			if err := p.validate("rpc-present", func() error {
				for _, route := range p.snapshot().DeclaredRoutes {
					if strings.Contains(route.Path, "rpc") {
						validated.Store(true)
					}
				}
				if !validated.Load() {
					return errors.New("RPC routes absent at validation")
				}
				return nil
			}); err != nil {
				t.Fatal(err)
			}
			run := hostingStart(t, p, router.ManagedOptions{})
			if !validated.Load() {
				t.Fatal("startup validator omitted")
			}
			if run.Address() == "" {
				t.Fatal("no managed address")
			}
		})
	}
}

func TestFiberHostingUnsupportedConfiguration(t *testing.T) {
	for _, major := range []string{"v2", "v3"} {
		t.Run(major, func(t *testing.T) {
			var host hostingTestCapabilities
			if major == "v2" {
				s, _ := NewFiberServer(nil, admin.Config{}, nil, false, WithFiberLogger(false), WithFiberConfig(func(c *f2.Config) { c.GETOnly = true }))
				host = s.(hostingTestCapabilities)
			} else {
				s, _ := NewFiberV3Server(nil, admin.Config{}, nil, false, WithFiberV3Logger(false), WithFiberV3Config(func(c *f3.Config) { c.GETOnly = true }))
				host = s.(hostingTestCapabilities)
			}
			for _, err := range []error{host.ValidateBoundedIngress(router.BoundedIngressOptions{}), host.ConfigureBoundedIngress(router.BoundedIngressOptions{})} {
				var typed *router.IngressConfigurationError
				if !errors.Is(err, router.ErrIngressConfiguration) || !errors.As(err, &typed) || typed.Field != "native.get_only" {
					t.Fatalf("unsupported config identity: %v", err)
				}
			}
			run, err := host.StartManaged(context.Background(), router.ManagedOptions{Address: "127.0.0.1:0", DrainTimeout: time.Second})
			if err != nil {
				t.Fatal(err)
			}
			hostingWait(t, run.Done(), "unsupported configuration")
			if !errors.Is(run.Wait(context.Background()), router.ErrIngressConfiguration) {
				t.Fatal("lost configuration failure")
			}
			select {
			case <-run.Bound():
				t.Fatal("bound unsupported configuration")
			default:
			}
		})
	}
}

func TestFiberHostingLegacyServe(t *testing.T) {
	for _, major := range []string{"v2", "v3"} {
		t.Run(major, func(t *testing.T) {
			p := hostingProbeFor(t, major, false)
			p.register(router.GET, "/health", func(c router.Context) error { return c.SendString("legacy") })
			listener, err := net.Listen("tcp", "127.0.0.1:0")
			if err != nil {
				t.Fatal(err)
			}
			address := listener.Addr().String()
			if err := listener.Close(); err != nil {
				t.Fatal(err)
			}
			finished := make(chan error, 1)
			go func() { finished <- p.serve(address) }()
			t.Cleanup(func() {
				ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
				defer cancel()
				if err := p.shutdown(ctx); err != nil {
					t.Error(err)
				}
				select {
				case err := <-finished:
					if err != nil {
						t.Error(err)
					}
				case <-ctx.Done():
					t.Error("legacy Serve did not stop")
				}
			})
			client := &http.Client{Timeout: time.Second}
			deadline := time.Now().Add(4 * time.Second)
			for {
				resp, err := client.Get("http://" + address + "/admin/api/health")
				if err == nil {
					body, err := io.ReadAll(resp.Body)
					closeResponseBody(t, resp)
					if err != nil || resp.StatusCode != 200 || string(body) != "legacy" {
						t.Fatalf("legacy response: %d %q %v", resp.StatusCode, body, err)
					}
					break
				}
				if time.Now().After(deadline) {
					t.Fatalf("legacy Serve unavailable: %v", err)
				}
				time.Sleep(10 * time.Millisecond)
			}
		})
	}
}
