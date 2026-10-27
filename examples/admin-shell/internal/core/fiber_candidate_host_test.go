package core

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"testing/fstest"
	"time"

	fiber2 "github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	lifecycle "github.com/goliatone/go-admin/pkg/go-lifecycle"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
	commandregistry "github.com/goliatone/go-command/registry"
	dashboard "github.com/goliatone/go-dashboard/components/dashboard"
	dashrouter "github.com/goliatone/go-dashboard/components/dashboard/gorouter"
	exporthttp "github.com/goliatone/go-export/adapters/http"
	exportrouter "github.com/goliatone/go-export/adapters/router"
	"github.com/goliatone/go-export/export"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-router/eventstream"
	"github.com/goliatone/go-router/ssefiber"
	"github.com/gorilla/websocket"
)

// This is a candidate host assembled from real package registrations. It calls
// the same shutdown coordinator as Core without changing Core's v2 API.
type candidateServer interface {
	Serve(string) error
	Shutdown(context.Context) error
}

type candidateHost struct {
	server                         candidateServer
	adm                            *admin.Admin
	runner                         *lifecycle.Runner
	client                         *http.Client
	base                           string
	cancelStreams                  context.CancelFunc
	stream                         eventstream.Stream
	broadcast                      *dashboard.BroadcastHook
	wsStarted, wsDone              chan struct{}
	requestStarted, releaseRequest chan struct{}
	releaseOnce                    sync.Once
	serveDone                      chan error
	served                         bool
	writes                         atomic.Int32
	resourcesClosed                atomic.Bool
}

type candidateIdentity struct{ DemoIdentity }

type candidateIdentityProvider struct{ attempts atomic.Int32 }

func (p *candidateIdentityProvider) VerifyIdentity(_ context.Context, name, password string) (auth.Identity, error) {
	p.attempts.Add(1)
	if name != "operator" || password != "fixture-password" {
		return nil, auth.ErrMismatchedHashAndPassword
	}
	return candidateIdentity{DemoIdentity{id: "operator-1", username: "operator", email: "operator@example.test", role: string(auth.RoleOwner)}}, nil
}
func (p *candidateIdentityProvider) FindIdentityByIdentifier(ctx context.Context, name string) (auth.Identity, error) {
	if name != "operator-1" && name != "operator" {
		return nil, auth.ErrIdentityNotFound
	}
	return candidateIdentity{DemoIdentity{id: "operator-1", username: "operator", email: "operator@example.test", role: string(auth.RoleOwner)}}, nil
}

type candidateAuthorizer struct{}

func (candidateAuthorizer) Can(ctx context.Context, _, _ string) bool {
	a, ok := auth.ActorFromContext(ctx)
	return ok && a.ActorID == "operator-1"
}

type candidateCommand struct{}

func (candidateCommand) Type() string { return "candidate.host.write" }

type candidateTrackedRouter[T any] struct {
	router.Router[T]
	started, done chan struct{}
}

func (r candidateTrackedRouter[T]) Group(prefix string) router.Router[T] {
	return candidateTrackedRouter[T]{r.Router.Group(prefix), r.started, r.done}
}
func (r candidateTrackedRouter[T]) WebSocket(path string, cfg router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	return r.Router.WebSocket(path, cfg, func(c router.WebSocketContext) error {
		close(r.started)
		defer close(r.done)
		return handler(c)
	})
}

type candidateLayout struct{}

func (candidateLayout) ConfigureLayout(context.Context, dashboard.ViewerContext) (dashboard.Layout, error) {
	return dashboard.Layout{Areas: map[string][]dashboard.WidgetInstance{}}, nil
}

func newCandidateHost(t *testing.T, backend string) (*candidateHost, *candidateIdentityProvider) {
	t.Helper()
	if err := commandregistry.Stop(context.Background()); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := commandregistry.Stop(context.Background()); err != nil {
			t.Error(err)
		}
	})
	cfg := quickstart.NewAdminConfig("/admin", "Candidate host", "en")
	cfg.PreviewSecret = "candidate-csrf-secret-0123456789abcdef"
	adm, _, err := quickstart.NewAdmin(cfg, quickstart.AdapterHooks{}, quickstart.WithRPCTransport(quickstart.RPCTransportConfig{
		Enabled: true, CommandRules: map[string]admin.RPCCommandRule{"candidate.host.write": {Permission: "candidate.write"}},
	}))
	if err != nil {
		t.Fatal(err)
	}
	provider := &candidateIdentityProvider{}
	ac := authRuntimeConfig{signingKey: "candidate-jwt-secret-0123456789abcdef", contextKey: "candidate_auth", issuer: "candidate", audience: []string{"candidate"}, rejectedRouteDefault: "/admin/login", adminCfg: cfg}
	auther := auth.NewAuthenticator(provider, ac)
	ra, err := auth.NewHTTPAuthenticator(auther, ac, auth.WithAuthCookieTemplate(router.Cookie{Path: "/", HTTPOnly: true, SameSite: router.CookieSameSiteLaxMode}))
	if err != nil {
		t.Fatal(err)
	}
	authn, _ := quickstart.WithGoAuth(adm, ra, ac, admin.GoAuthAuthorizerConfig{DefaultResource: "admin"}, &admin.AuthConfig{LoginPath: "/admin/login"}, admin.WithAuthErrorHandler(func(c router.Context, err error) error {
		return c.SendStatus(401)
	}))
	adm.WithAuthorizer(candidateAuthorizer{})
	root, cancel := context.WithCancel(context.Background())
	h := &candidateHost{adm: adm, cancelStreams: cancel, stream: eventstream.New(), broadcast: dashboard.NewBroadcastHook(), wsStarted: make(chan struct{}), wsDone: make(chan struct{}), requestStarted: make(chan struct{}), releaseRequest: make(chan struct{})}
	t.Cleanup(func() {
		h.release()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := h.shutdown(ctx); err != nil {
			t.Error(err)
		}
		h.join(t)
		if h.client != nil {
			h.client.CloseIdleConnections()
		}
	})
	registry := lifecycle.NewRegistry()
	if err := registry.Register(lifecycle.Task{Name: "release-admin", Phase: lifecycle.PhaseShutdown, Run: func(context.Context) error {
		select {
		case <-h.wsStarted:
			select {
			case <-h.wsDone:
			default:
				return errors.New("WS worker outlived shutdown")
			}
		default:
		}
		if h.stream.SnapshotStats().ActiveSubscribers != 0 {
			return errors.New("SSE subscription outlived shutdown")
		}
		return nil
	}}); err != nil {
		t.Fatal(err)
	}
	h.runner, err = lifecycle.NewRunner(registry)
	if err != nil {
		t.Fatal(err)
	}
	if err = h.runner.RunPreBind(t.Context()); err != nil {
		t.Fatal(err)
	}
	opts := []quickstart.ViewEngineOption{quickstart.WithViewAdmin(adm), quickstart.WithViewBasePath("/admin"), quickstart.WithViewReload(false)}
	if backend == "v2" {
		views, err := quickstart.NewViewEngine(client.Templates(), opts...)
		if err != nil {
			t.Fatal(err)
		}
		if err = quickstart.WithDefaultDashboardRenderer(adm, views, cfg); err != nil {
			t.Fatal(err)
		}
		srv, r := quickstart.NewFiberServer(views, cfg, adm, false, quickstart.WithFiberLogger(false), quickstart.WithFiberConfig(func(c *fiber2.Config) { c.DisableStartupMessage = true; c.EnablePrintRoutes = false }))
		h.server = srv
		mountCandidate(t, h, r, cfg, ra, authn, root)
	} else {
		views, err := quickstart.NewFiberV3ViewEngine(client.Templates(), opts...)
		if err != nil {
			t.Fatal(err)
		}
		if err = quickstart.WithDefaultFiberV3DashboardRenderer(adm, views, cfg); err != nil {
			t.Fatal(err)
		}
		srv, r := quickstart.NewFiberV3Server(views, cfg, adm, false, quickstart.WithFiberV3Logger(false), quickstart.WithFiberV3AdapterConfig(func(c *router.FiberV3AdapterConfig) { c.ListenConfig.DisableStartupMessage = true }))
		h.server = srv
		mountCandidate(t, h, r, cfg, ra, authn, root)
	}
	jar, _ := cookiejar.New(nil)
	h.client = &http.Client{Jar: jar, Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return h, provider
}

func mountCandidate[T any](t *testing.T, h *candidateHost, r router.Router[T], cfg admin.Config, ra *auth.RouteAuthenticator, authn *admin.GoAuthAuthenticator, streamRoot context.Context) {
	t.Helper()
	if _, err := admin.RegisterCommand(h.adm.Commands(), command.CommandFunc[candidateCommand](func(ctx context.Context, _ candidateCommand) error {
		actor, ok := auth.ActorFromContext(ctx)
		if !ok || actor.ActorID != "operator-1" {
			return errors.New("RPC lost actor")
		}
		h.writes.Add(1)
		return nil
	})); err != nil {
		t.Fatal(err)
	}
	if err := admin.RegisterMessageFactory(h.adm.Commands(), "candidate.host.write", func(map[string]any, []string) (candidateCommand, error) { return candidateCommand{}, nil }); err != nil {
		t.Fatal(err)
	}
	if err := quickstart.RegisterAuthUIRoutes(r, cfg, ra, quickstart.WithAuthUICSRFSecureKey([]byte(cfg.PreviewSecret))); err != nil {
		t.Fatal(err)
	}
	quickstart.NewStaticAssets(r, cfg, client.Assets(), quickstart.WithExtraAssetsFS(fstest.MapFS{"candidate.css": {Data: []byte(".candidate {color: green}")}}))
	if _, err := quickstart.RegisterLifecycleReadinessRoute(r, "/readyz", h.runner); err != nil {
		t.Fatal(err)
	}
	protect := func(next router.HandlerFunc) router.HandlerFunc {
		return authn.WrapHandler(func(c router.Context) error {
			actor, ok := auth.ActorFromContext(c.Context())
			if !ok {
				return errors.New("authenticated actor missing")
			}
			scoped := *actor
			scoped.TenantID = "tenant-1"
			scoped.OrganizationID = "org-1"
			c.SetContext(auth.WithActorContext(c.Context(), &scoped))
			return next(c)
		})
	}
	r.Get("/admin/api/context", func(c router.Context) error {
		actor, ok := auth.ActorFromContext(c.Context())
		if !ok {
			return errors.New("actor missing")
		}
		c.SetHeader("X-Request-ID", c.Header("X-Request-ID"))
		return c.JSON(200, map[string]any{"actor": actor.ActorID, "tenant": actor.TenantID, "organization": actor.OrganizationID})
	}, protect)
	r.Get("/admin/failure", func(router.Context) error { return errors.New("private-candidate-diagnostic") }, protect)
	r.Get("/admin/api/failure", func(router.Context) error { return errors.New("private-candidate-diagnostic") }, protect)
	r.Get("/hold", func(c router.Context) error {
		close(h.requestStarted)
		<-h.releaseRequest
		if h.resourcesClosed.Load() {
			return errors.New("resources released before request drained")
		}
		return c.SendString("drained")
	})
	lifetime := func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			ctx, cancel := context.WithCancel(c.Context())
			context.AfterFunc(streamRoot, cancel)
			c.SetContext(ctx)
			return next(c)
		}
	}
	streamRoutes := r.Group("")
	streamRoutes.Use(protect, lifetime)
	tracked := candidateTrackedRouter[T]{streamRoutes, h.wsStarted, h.wsDone}
	if err := dashrouter.Register(dashrouter.Config[T]{Router: tracked, Controller: dashboard.NewController(dashboard.ControllerOptions{Service: candidateLayout{}}), Broadcast: h.broadcast, BasePath: "/candidate-dashboard", AssetRegistration: dashrouter.AssetRegistrationModeExternal}); err != nil {
		t.Fatal(err)
	}
	if err := ssefiber.Mount(r, ssefiber.WithPath("/admin/events"), ssefiber.WithStream(h.stream), ssefiber.WithHeartbeatInterval(20*time.Millisecond), ssefiber.WithHeartbeatBounds(5*time.Millisecond, time.Second), ssefiber.WithMiddlewares(protect, lifetime), ssefiber.WithScopeResolver(func(c router.Context) (eventstream.Scope, error) {
		a, ok := auth.ActorFromContext(c.Context())
		if !ok {
			return nil, errors.New("actor missing")
		}
		return eventstream.Scope{"actor": a.ActorID}, nil
	})); err != nil {
		t.Fatal(err)
	}
	store := export.NewMemoryStore()
	tracker := export.NewMemoryTracker()
	runner := export.NewRunner()
	ref, err := store.Put(t.Context(), "candidate.csv", bytes.NewBufferString("id,name\n1,operator\n"), export.ArtifactMeta{Filename: "candidate.csv", ContentType: "text/csv"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = tracker.Start(t.Context(), export.ExportRecord{ID: "candidate", Definition: "users", Format: export.FormatCSV, State: export.StateCompleted, Artifact: ref}); err != nil {
		t.Fatal(err)
	}
	svc := export.NewService(export.ServiceConfig{Runner: runner, Tracker: tracker, Store: store})
	exportRoutes := r.Group("")
	exportRoutes.Use(protect)
	exportrouter.NewHandler(exportrouter.Config{Service: svc, Store: store, ActorProvider: exporthttp.StaticActorProvider{Actor: export.Actor{ID: "operator-1"}}}).RegisterRoutes(exportRoutes)
	host := quickstart.NewHostRouter(r, cfg)
	if err := h.adm.Initialize(host.Admin()); err != nil {
		t.Fatal(err)
	}
}

func (h *candidateHost) release() { h.releaseOnce.Do(func() { close(h.releaseRequest) }) }
func (h *candidateHost) shutdown(ctx context.Context) error {
	return coordinateShutdown(ctx, func(ctx context.Context) error {
		h.cancelStreams()
		select {
		case <-h.wsStarted:
			select {
			case <-h.wsDone:
			case <-ctx.Done():
				return ctx.Err()
			}
		default:
		}
		for h.stream.SnapshotStats().ActiveSubscribers != 0 {
			select {
			case <-time.After(time.Millisecond):
			case <-ctx.Done():
				return ctx.Err()
			}
		}
		if h.server == nil {
			return nil
		}
		return h.server.Shutdown(ctx)
	}, func(ctx context.Context) error {
		if h.runner == nil {
			return nil
		}
		return h.runner.Shutdown(ctx)
	}, func(context.Context) error {
		h.resourcesClosed.Store(true)
		if h.adm != nil {
			h.adm.Commands().Reset()
		}
		return nil
	})
}
func (h *candidateHost) join(t *testing.T) {
	t.Helper()
	if !h.served {
		return
	}
	select {
	case err := <-h.serveDone:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			t.Error(err)
		}
		h.served = false
	case <-time.After(5 * time.Second):
		t.Error("host listener did not stop")
	}
}
func (h *candidateHost) start(t *testing.T) {
	t.Helper()
	ln, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := ln.Addr().String()
	if err = ln.Close(); err != nil {
		t.Fatal(err)
	}
	h.base = "http://" + addr
	h.serveDone = make(chan error, 1)
	h.served = true
	go func() { h.serveDone <- h.server.Serve(addr) }()
	deadline := time.Now().Add(5 * time.Second)
	for {
		res, err := h.client.Get(h.base + "/readyz")
		if err == nil {
			io.Copy(io.Discard, res.Body)
			res.Body.Close()
			if res.StatusCode != 503 {
				t.Fatalf("readiness before Ready=%d", res.StatusCode)
			}
			break
		}
		if time.Now().After(deadline) {
			t.Fatal(err)
		}
		time.Sleep(5 * time.Millisecond)
	}
	h.runner.MarkServing()
	if err = h.runner.RunPostBind(t.Context()); err != nil {
		t.Fatal(err)
	}
	if err = h.runner.RunReady(t.Context()); err != nil {
		t.Fatal(err)
	}
}
func (h *candidateHost) request(t *testing.T, method, path, body string, headers map[string]string) (*http.Response, string) {
	t.Helper()
	req, err := http.NewRequestWithContext(t.Context(), method, h.base+path, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	res, err := h.client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	data, err := io.ReadAll(res.Body)
	res.Body.Close()
	if err != nil {
		t.Fatal(err)
	}
	return res, string(data)
}
func (h *candidateHost) login(t *testing.T, provider *candidateIdentityProvider) {
	t.Helper()
	res, body := h.request(t, "GET", "/admin/login", "", nil)
	if res.StatusCode != 200 {
		t.Fatalf("login page=%d %s", res.StatusCode, body)
	}
	match := regexp.MustCompile(`name="_token"[^>]*value="([^"]+)"`).FindStringSubmatch(body)
	if len(match) != 2 {
		t.Fatalf("missing csrf token: %s", body)
	}
	form := url.Values{"identifier": {"operator"}, "password": {"fixture-password"}, "_token": {match[1]}}
	headers := map[string]string{"Content-Type": "application/x-www-form-urlencoded", "Origin": h.base}
	// Missing CSRF and foreign origins must stop before credential verification.
	for _, mode := range []string{"missing-csrf", "foreign-origin"} {
		payload := form.Encode()
		if mode == "missing-csrf" {
			payload = "identifier=operator&password=fixture-password"
		} else {
			headers["Origin"] = "https://foreign.example"
		}
		denied, _ := h.request(t, "POST", "/admin/login", payload, headers)
		if (denied.StatusCode != http.StatusSeeOther && denied.StatusCode != http.StatusForbidden) || provider.attempts.Load() != 0 {
			t.Fatalf("%s reached credentials: status=%d attempts=%d", mode, denied.StatusCode, provider.attempts.Load())
		}
	}
	headers["Origin"] = h.base
	res, body = h.request(t, "POST", "/admin/login", form.Encode(), headers)
	if res.StatusCode != 302 {
		t.Fatalf("login=%d %s", res.StatusCode, body)
	}
	found := false
	for _, c := range res.Cookies() {
		if c.Name == "candidate_auth" {
			found = true
			if !c.HttpOnly || c.SameSite != http.SameSiteLaxMode || c.Path != "/" {
				t.Fatalf("cookie attributes=%+v", c)
			}
		}
	}
	if !found {
		t.Fatal("login session cookie missing")
	}
}

func TestFiberCandidateHostIntegration(t *testing.T) {
	for _, backend := range []string{"v2", "v3"} {
		t.Run(backend, func(t *testing.T) {
			h, provider := newCandidateHost(t, backend)
			h.start(t)
			rpcBody := `{"method":"admin.commands.dispatch","params":{"data":{"name":"candidate.host.write"}}}`
			res, _ := h.request(t, "POST", "/admin/api/rpc", rpcBody, map[string]string{"Content-Type": "application/json"})
			if res.StatusCode != 401 || h.writes.Load() != 0 {
				t.Fatalf("anonymous RPC=%d writes=%d", res.StatusCode, h.writes.Load())
			}
			h.login(t, provider)
			csrfToken := ""
			for _, tc := range []struct {
				path     string
				status   int
				contains string
			}{
				{"/readyz", 200, `"ready":true`}, {"/admin/api/context", 200, `"actor":"operator-1"`},
				{"/admin/dashboard", 200, "data-admin-shell"}, {"/admin/failure", 500, "Something went wrong"},
				{"/admin/api/failure", 500, `"code":500`}, {"/admin/missing", 404, "Page not found"},
				{"/admin/assets/candidate.css", 200, ".candidate"}, {"/admin/exports/candidate/download", 200, "id,name\n1,operator\n"},
			} {
				res, body := h.request(t, "GET", tc.path, "", map[string]string{"X-Request-ID": "candidate-request"})
				if res.StatusCode != tc.status || !strings.Contains(body, tc.contains) || strings.Contains(body, "private-candidate-diagnostic") {
					t.Fatalf("%s=%d body=%s", tc.path, res.StatusCode, body)
				}
				if tc.path == "/admin/dashboard" {
					csrfToken = res.Header.Get("X-CSRF-Token")
				}
				if tc.path == "/admin/api/context" {
					if res.Header.Get("X-Request-ID") != "candidate-request" || !strings.Contains(body, `"tenant":"tenant-1"`) || !strings.Contains(body, `"organization":"org-1"`) {
						t.Fatalf("context lost: %s headers=%v", body, res.Header)
					}
				}
			}
			denied, _ := h.request(t, "POST", "/admin/api/rpc", rpcBody, map[string]string{"Content-Type": "application/json"})
			if denied.StatusCode != 400 || h.writes.Load() != 0 {
				t.Fatalf("CSRF RPC denial=%d writes=%d", denied.StatusCode, h.writes.Load())
			}
			if csrfToken == "" {
				t.Fatal("dashboard omitted authenticated CSRF token")
			}
			res, body := h.request(t, "POST", "/admin/api/rpc", rpcBody, map[string]string{"Content-Type": "application/json", "X-CSRF-Token": csrfToken, "Origin": h.base})
			if res.StatusCode != 200 || !strings.Contains(body, `"Accepted":true`) || h.writes.Load() != 1 {
				t.Fatalf("RPC=%d %s writes=%d", res.StatusCode, body, h.writes.Load())
			}
			// Both long-lived transports stay open until the host, not the clients, closes them.
			baseURL, _ := url.Parse(h.base)
			headers := http.Header{}
			for _, c := range h.client.Jar.Cookies(baseURL) {
				headers.Add("Cookie", c.String())
			}
			headers.Set("Origin", h.base)
			ws, resp, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(h.base, "http")+"/candidate-dashboard/dashboard/ws", headers)
			if err != nil {
				t.Fatalf("WS: %v response=%v", err, resp)
			}
			defer ws.Close()
			select {
			case <-h.wsStarted:
			case <-time.After(3 * time.Second):
				t.Fatal("WS worker not started")
			}
			publishCtx, stopPublish := context.WithTimeout(t.Context(), 3*time.Second)
			publishDone := make(chan struct{})
			go func() {
				defer close(publishDone)
				tick := time.NewTicker(5 * time.Millisecond)
				defer tick.Stop()
				for {
					select {
					case <-publishCtx.Done():
						return
					case <-tick.C:
						_ = h.broadcast.WidgetUpdated(publishCtx, dashboard.WidgetEvent{})
					}
				}
			}()
			ws.SetReadDeadline(time.Now().Add(3 * time.Second))
			_, _, err = ws.ReadMessage()
			stopPublish()
			<-publishDone
			if err != nil {
				t.Fatal(err)
			}
			req, _ := http.NewRequestWithContext(t.Context(), "GET", h.base+"/admin/events", nil)
			sse, err := h.client.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer sse.Body.Close()
			if sse.StatusCode != 200 {
				t.Fatalf("SSE=%d", sse.StatusCode)
			}
			scanner := bufio.NewScanner(sse.Body)
			if !scanner.Scan() {
				t.Fatalf("SSE initial frame: %v", scanner.Err())
			}
			if h.stream.SnapshotStats().ActiveSubscribers != 1 {
				t.Fatal("SSE subscription missing")
			}
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			if err = h.shutdown(ctx); err != nil {
				t.Fatal(err)
			}
			if !h.resourcesClosed.Load() || h.stream.SnapshotStats().ActiveSubscribers != 0 {
				t.Fatal("host cleanup incomplete")
			}
			ws.SetReadDeadline(time.Now().Add(time.Second))
			for {
				if _, _, err = ws.ReadMessage(); err != nil {
					break
				}
			}
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				t.Fatal("WS remained open after host shutdown")
			}
			if _, err = io.Copy(io.Discard, sse.Body); err != nil {
				t.Fatalf("SSE did not end cleanly: %v", err)
			}
			h.join(t)
		})
	}
}

func TestFiberCandidateHostLifecycle(t *testing.T) {
	for _, backend := range []string{"v2", "v3"} {
		for _, deadline := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/deadline=%t", backend, deadline), func(t *testing.T) {
				h, _ := newCandidateHost(t, backend)
				h.start(t)
				requestDone := make(chan error, 1)
				go func() {
					res, err := h.client.Get(h.base + "/hold")
					if err == nil {
						b, e := io.ReadAll(res.Body)
						res.Body.Close()
						err = e
						if string(b) != "drained" {
							err = fmt.Errorf("drain response: %s", b)
						}
					}
					requestDone <- err
				}()
				select {
				case <-h.requestStarted:
				case <-time.After(3 * time.Second):
					t.Fatal("held request did not start")
				}
				timeout := 3 * time.Second
				if deadline {
					timeout = 80 * time.Millisecond
				}
				ctx, cancel := context.WithTimeout(context.Background(), timeout)
				defer cancel()
				done := make(chan error, 1)
				started := time.Now()
				go func() { done <- h.shutdown(ctx) }()
				if deadline {
					select {
					case err := <-done:
						if !errors.Is(err, context.DeadlineExceeded) {
							t.Fatalf("deadline error=%v", err)
						}
					case <-time.After(time.Second):
						t.Fatal("shutdown exceeded caller deadline")
					}
					if time.Since(started) > time.Second || h.resourcesClosed.Load() {
						t.Fatal("deadline released resources or exceeded bound")
					}
				} else {
					select {
					case err := <-done:
						t.Fatalf("shutdown returned before request drained: %v", err)
					case <-time.After(40 * time.Millisecond):
					}
				}
				h.release()
				select {
				case err := <-requestDone:
					if err != nil {
						t.Fatal(err)
					}
				case <-time.After(3 * time.Second):
					t.Fatal("held request did not finish")
				}
				if !deadline {
					select {
					case err := <-done:
						if err != nil {
							t.Fatal(err)
						}
					case <-time.After(4 * time.Second):
						t.Fatal("shutdown did not finish")
					}
				} else {
					retry, cancel := context.WithTimeout(context.Background(), 3*time.Second)
					defer cancel()
					if err := h.shutdown(retry); err != nil {
						t.Fatal(err)
					}
				}
				if !h.resourcesClosed.Load() {
					t.Fatal("runtime cleanup missing")
				}
				h.join(t)
			})
		}
	}
}

func TestFiberCandidateHostStartupFailure(t *testing.T) {
	for _, backend := range []string{"v2", "v3"} {
		t.Run(backend, func(t *testing.T) {
			h, _ := newCandidateHost(t, backend)
			listener, err := net.Listen("tcp4", "127.0.0.1:0")
			if err != nil {
				t.Fatal(err)
			}
			defer listener.Close()
			result := make(chan error, 1)
			go func() { result <- h.server.Serve(listener.Addr().String()) }()
			select {
			case err := <-result:
				if err == nil {
					t.Fatal("occupied listener accepted")
				}
			case <-time.After(3 * time.Second):
				t.Fatal("startup failure did not propagate")
			}
			ctx, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()
			if err = h.shutdown(ctx); err != nil {
				t.Fatal(err)
			}
			if !h.resourcesClosed.Load() {
				t.Fatal("startup failure left runtime resources open")
			}
		})
	}
}
