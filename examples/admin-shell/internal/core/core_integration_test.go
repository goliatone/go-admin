package core_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"regexp"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/examples/admin-shell/config"
	"github.com/goliatone/go-admin/examples/admin-shell/internal/core"
	apphttp "github.com/goliatone/go-admin/examples/admin-shell/internal/http"
	"github.com/goliatone/go-admin/pkg/admin"
	golifecycle "github.com/goliatone/go-admin/pkg/go-lifecycle"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-logger/glog"
)

type recordingLoggerProvider struct {
	mu    sync.Mutex
	names []string
}

func (p *recordingLoggerProvider) GetLogger(name string) glog.Logger {
	p.mu.Lock()
	p.names = append(p.names, name)
	p.mu.Unlock()
	return glog.Nop()
}

func (p *recordingLoggerProvider) requested(name string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return slices.Contains(p.names, name)
}

type loggerProbeModule struct {
	registered *atomic.Bool
}

func (m loggerProbeModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: "logger-probe"}
}

type lifecycleProbeModule struct {
	shutdownStarted chan struct{}
	shutdownRuns    atomic.Int32
}

func (*lifecycleProbeModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: "lifecycle-probe"}
}

func (*lifecycleProbeModule) Register(admin.ModuleContext) error {
	return nil
}

func (*lifecycleProbeModule) RouteContract() adminrouting.ModuleContract {
	return adminrouting.ModuleContract{
		Slug: "lifecycle_probe",
		UIRoutes: map[string]string{
			"lifecycle_probe.index": "/lifecycle-probe",
		},
	}
}

func (m *lifecycleProbeModule) Shutdown(ctx context.Context) error {
	if m.shutdownRuns.Add(1) == 1 {
		close(m.shutdownStarted)
		<-ctx.Done()
		return ctx.Err()
	}
	return nil
}

func (m loggerProbeModule) Register(admin.ModuleContext) error {
	m.registered.Store(true)
	return nil
}

func (m loggerProbeModule) RouteContract() adminrouting.ModuleContract {
	return adminrouting.ModuleContract{
		Slug: "logger_probe",
		UIRoutes: map[string]string{
			"logger_probe.index": "/logger-probe",
		},
	}
}

func TestStarterBuildsAndServesCompleteRouteGraph(t *testing.T) {
	cfg := config.Defaults()
	cfg.Server.PrintRoutes = false

	appCore, err := core.New(
		context.Background(),
		&cfg,
		core.WithRouteRegistrar(apphttp.Register),
	)
	if err != nil {
		t.Fatalf("build starter: %v", err)
	}
	t.Cleanup(func() {
		if shutdownErr := appCore.Shutdown(context.Background()); shutdownErr != nil {
			t.Errorf("shutdown starter: %v", shutdownErr)
		}
	})

	app := appCore.Server.WrappedRouter()
	cases := []struct {
		path       string
		wantStatus int
		wantBody   string
	}{
		{path: "/", wantStatus: http.StatusOK, wantBody: "Demo auth"},
		{path: "/healthz", wantStatus: http.StatusOK, wantBody: `"ok":true`},
		{path: "/readyz", wantStatus: http.StatusOK, wantBody: `"ready":true`},
		{path: "/admin/login", wantStatus: http.StatusOK, wantBody: "admin.pwd"},
		{path: "/admin/api/dashboard", wantStatus: http.StatusUnauthorized, wantBody: "unauthorized"},
		{path: "/admin/assets/output.css", wantStatus: http.StatusOK},
	}
	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			response, err := app.Test(
				httptest.NewRequestWithContext(context.Background(), http.MethodGet, tc.path, nil),
				-1,
			)
			if err != nil {
				t.Fatalf("request %s: %v", tc.path, err)
			}
			defer func() {
				if closeErr := response.Body.Close(); closeErr != nil {
					t.Errorf("close %s response: %v", tc.path, closeErr)
				}
			}()
			body, err := io.ReadAll(response.Body)
			if err != nil {
				t.Fatalf("read %s: %v", tc.path, err)
			}
			if response.StatusCode != tc.wantStatus {
				t.Fatalf("%s status=%d body=%s", tc.path, response.StatusCode, body)
			}
			if tc.wantBody != "" && !strings.Contains(string(body), tc.wantBody) {
				t.Fatalf("%s body does not contain %q", tc.path, tc.wantBody)
			}
		})
	}
}

func TestDemoCredentialVisibilityUsesCanonicalEnvironmentPolicy(t *testing.T) {
	cfg := config.Defaults()
	cfg.Env = "test"
	appCore := &core.Core{Config: &cfg}
	if !appCore.DemoCredentialsVisible() {
		t.Fatal("test environment passed validation but runtime hid demo credentials")
	}
}

func TestStarterUsesCompleteQuickstartFeatureCatalog(t *testing.T) {
	cfg := config.Defaults()
	cfg.Server.PrintRoutes = false

	appCore, err := core.New(context.Background(), &cfg, core.WithRouteRegistrar(apphttp.Register))
	if err != nil {
		t.Fatalf("build starter: %v", err)
	}
	t.Cleanup(func() {
		if shutdownErr := appCore.Shutdown(context.Background()); shutdownErr != nil {
			t.Errorf("shutdown starter: %v", shutdownErr)
		}
	})
	if _, ok := appCore.FeatureGate.(fggate.MutableFeatureGate); !ok {
		t.Fatalf("quickstart feature gate does not retain runtime override support")
	}

	statuses := appCore.Features()
	if len(statuses) != 21 {
		t.Fatalf("expected all 21 quickstart feature keys, got %d: %+v", len(statuses), statuses)
	}
	features := make(map[string]bool, len(statuses))
	for _, status := range statuses {
		features[status.Name] = status.Enabled
	}
	for _, key := range []string{"dashboard", "cms", "search"} {
		if !features[key] {
			t.Fatalf("expected %s enabled by minimal profile plus overrides", key)
		}
	}
	if features["activity"] {
		t.Fatalf("expected activity disabled by the minimal profile")
	}
}

func TestAdminContributionsUseLifecycleOrderingAndTaskOnlyDiagnostics(t *testing.T) {
	cfg := config.Defaults()
	cfg.Server.PrintRoutes = false
	order := make([]string, 0, 4)

	appCore, err := core.New(
		context.Background(),
		&cfg,
		core.WithAdminContributionPriority("low", -10, func(context.Context, *core.Core) error {
			order = append(order, "low")
			return nil
		}),
		core.WithAdminContributionPriority("high", 20, func(context.Context, *core.Core) error {
			order = append(order, "high")
			return nil
		}),
		core.WithAdminContributionPriority("tie.first", 10, func(context.Context, *core.Core) error {
			order = append(order, "tie.first")
			return nil
		}),
		core.WithAdminContributionPriority("tie.second", 10, func(context.Context, *core.Core) error {
			order = append(order, "tie.second")
			return nil
		}),
		core.WithRouteRegistrar(func(*core.Core, quickstart.HostRouter[*fiber.App]) error {
			want := []string{"high", "tie.first", "tie.second", "low"}
			if !slices.Equal(order, want) {
				return fmt.Errorf("route registration preceded ordered contributions: %v", order)
			}
			return nil
		}),
	)
	if err != nil {
		t.Fatalf("build starter: %v", err)
	}
	t.Cleanup(func() {
		if shutdownErr := appCore.Shutdown(context.Background()); shutdownErr != nil {
			t.Errorf("shutdown starter: %v", shutdownErr)
		}
	})

	snapshot := appCore.AdminLifecycleSnapshot()
	if snapshot.StartedAt.IsZero() || snapshot.UpdatedAt.IsZero() {
		t.Fatalf("lifecycle diagnostics omitted timestamps: %+v", snapshot)
	}
	taskStates := make(map[string]golifecycle.State, len(snapshot.Tasks))
	for _, task := range snapshot.Tasks {
		taskStates[task.Name] = task.State
		if task.Phase != golifecycle.PhasePreBind ||
			task.Policy != golifecycle.ErrorPolicyFatal {
			t.Fatalf("unexpected lifecycle task contract: %+v", task)
		}
	}
	for _, name := range []string{
		"admin.contribution.high",
		"admin.contribution.tie.first",
		"admin.contribution.tie.second",
		"admin.contribution.low",
	} {
		if taskStates[name] != golifecycle.StateSucceeded {
			t.Fatalf("lifecycle task %q state = %q", name, taskStates[name])
		}
	}
	encoded, err := json.Marshal(snapshot)
	if err != nil {
		t.Fatalf("marshal lifecycle diagnostics: %v", err)
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(encoded, &fields); err != nil {
		t.Fatalf("decode lifecycle diagnostics: %v", err)
	}
	for _, misleading := range []string{"ready", "serving"} {
		if _, exists := fields[misleading]; exists {
			t.Fatalf("task-only diagnostics exposed %q: %s", misleading, encoded)
		}
	}
}

func TestAdminContributionOptionsRejectInvalidRegistrations(t *testing.T) {
	cfg := config.Defaults()
	cfg.Server.PrintRoutes = false

	tests := []struct {
		name       string
		options    []core.Option
		wantDetail string
	}{
		{
			name:       "nil contribution callback",
			options:    []core.Option{core.WithAdminContribution("missing-callback", nil)},
			wantDetail: `configure admin lifecycle "missing-callback": callback is required`,
		},
		{
			name:       "nil module factory",
			options:    []core.Option{core.WithAdminModule("missing-factory", nil)},
			wantDetail: `configure admin lifecycle "missing-factory": module factory is required`,
		},
		{
			name: "duplicate contribution",
			options: []core.Option{
				core.WithAdminContribution("duplicate", func(context.Context, *core.Core) error { return nil }),
				core.WithAdminContribution("duplicate", func(context.Context, *core.Core) error { return nil }),
			},
			wantDetail: `task "admin.contribution.duplicate" already registered`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := core.New(context.Background(), &cfg, tc.options...)
			if err == nil || !strings.Contains(err.Error(), tc.wantDetail) {
				t.Fatalf("New() error = %v, want detail %q", err, tc.wantDetail)
			}
		})
	}
}

func TestAdminContributionFailureStopsPreBindComposition(t *testing.T) {
	cfg := config.Defaults()
	cfg.Server.PrintRoutes = false
	contributionErr := errors.New("contribution failed")
	var laterContributionRan atomic.Bool

	_, err := core.New(
		context.Background(),
		&cfg,
		core.WithAdminContributionPriority("failing", 20, func(context.Context, *core.Core) error {
			return contributionErr
		}),
		core.WithAdminContributionPriority("later", 10, func(context.Context, *core.Core) error {
			laterContributionRan.Store(true)
			return nil
		}),
	)
	if !errors.Is(err, contributionErr) {
		t.Fatalf("New() error = %v, want contribution failure", err)
	}
	if laterContributionRan.Load() {
		t.Fatal("fatal pre-bind failure did not stop later contributions")
	}
}

func TestAdminLifecycleCallbacksReceiveStartupCancellation(t *testing.T) {
	cfg := config.Defaults()
	cfg.Server.PrintRoutes = false
	const lifecycleCallbackTimeout = 10 * time.Second

	tests := []struct {
		name   string
		option func(started chan<- struct{}) core.Option
	}{
		{
			name: "contribution",
			option: func(started chan<- struct{}) core.Option {
				return core.WithAdminContribution("cancellable", func(ctx context.Context, _ *core.Core) error {
					close(started)
					<-ctx.Done()
					return ctx.Err()
				})
			},
		},
		{
			name: "module factory",
			option: func(started chan<- struct{}) core.Option {
				return core.WithAdminModule("cancellable", func(
					ctx context.Context,
					_ glog.LoggerProvider,
					_ glog.Logger,
				) (admin.Module, error) {
					close(started)
					<-ctx.Done()
					return nil, ctx.Err()
				})
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			startupCtx, cancel := context.WithCancel(context.Background())
			started := make(chan struct{})
			result := make(chan error, 1)
			go func() {
				_, err := core.New(startupCtx, &cfg, tc.option(started))
				result <- err
			}()

			select {
			case <-started:
			case <-time.After(lifecycleCallbackTimeout):
				t.Fatal("lifecycle callback did not start")
			}
			cancel()
			select {
			case err := <-result:
				if !errors.Is(err, context.Canceled) {
					t.Fatalf("New() error = %v, want context cancellation", err)
				}
			case <-time.After(lifecycleCallbackTimeout):
				t.Fatal("lifecycle callback ignored startup cancellation")
			}
		})
	}
}

func TestLifecycleManagedAdminModuleShutdownIsBoundedAndRetryable(t *testing.T) {
	cfg := config.Defaults()
	cfg.Server.PrintRoutes = false
	module := &lifecycleProbeModule{
		shutdownStarted: make(chan struct{}),
	}

	appCore, err := core.New(
		context.Background(),
		&cfg,
		core.WithAdminModule("lifecycle-probe", func(
			context.Context,
			glog.LoggerProvider,
			glog.Logger,
		) (admin.Module, error) {
			return module, nil
		}),
	)
	if err != nil {
		t.Fatalf("build starter: %v", err)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	err = appCore.Shutdown(shutdownCtx)
	var incomplete *golifecycle.ShutdownIncompleteError
	if !errors.As(err, &incomplete) {
		t.Fatalf("shutdown error = %v, want ShutdownIncompleteError", err)
	}
	select {
	case <-module.shutdownStarted:
	case <-time.After(time.Second):
		t.Fatal("module shutdown did not start")
	}

	retryCtx, retryCancel := context.WithTimeout(context.Background(), time.Second)
	defer retryCancel()
	if err := appCore.Shutdown(retryCtx); err != nil {
		t.Fatalf("retry shutdown: %v", err)
	}
	if runs := module.shutdownRuns.Load(); runs != 2 {
		t.Fatalf("module shutdown runs = %d, want 2", runs)
	}
	taskStates := map[string]golifecycle.State{}
	for _, task := range appCore.AdminLifecycleSnapshot().Tasks {
		taskStates[task.Name] = task.State
	}
	for _, taskName := range []string{
		"admin.module.lifecycle-probe.start",
		"admin.module.lifecycle-probe.stop",
	} {
		if taskStates[taskName] != golifecycle.StateSucceeded {
			t.Fatalf("lifecycle task %q state = %q", taskName, taskStates[taskName])
		}
	}
}

func TestRootLoggerProviderPropagatesToFrameworkAndModuleFactory(t *testing.T) {
	cfg := config.Defaults()
	cfg.Server.PrintRoutes = false
	provider := &recordingLoggerProvider{}
	var moduleRegistered atomic.Bool
	factoryRan := false

	appCore, err := core.New(
		context.Background(),
		&cfg,
		core.WithLoggerProvider(provider),
		core.WithAdminModule("logger-probe", func(
			_ context.Context,
			gotProvider glog.LoggerProvider,
			logger glog.Logger,
		) (admin.Module, error) {
			factoryRan = true
			if gotProvider != provider {
				return nil, errors.New("module received a different logger provider")
			}
			if logger == nil {
				return nil, errors.New("module logger is nil")
			}
			return loggerProbeModule{registered: &moduleRegistered}, nil
		}),
	)
	if err != nil {
		t.Fatalf("build starter: %v", err)
	}
	t.Cleanup(func() {
		if err := appCore.Shutdown(context.Background()); err != nil {
			t.Errorf("shutdown starter: %v", err)
		}
	})

	if !factoryRan || !moduleRegistered.Load() {
		t.Fatalf("module lifecycle incomplete: factory=%v registered=%v", factoryRan, moduleRegistered.Load())
	}
	if appCore.LoggerProvider != provider || appCore.Admin.LoggerProvider() == nil {
		t.Fatal("root logger provider was not retained by core and go-admin")
	}
	for _, name := range []string{
		"core",
		"admin",
		"auth",
		"auth.http",
		"auth.authorization",
		"router",
		"http.access",
		"modules.logger-probe",
	} {
		if !provider.requested(name) {
			t.Errorf("logger provider did not receive child request %q", name)
		}
	}
}

func TestProductionLoginLoggingRedactsCSRFAndUsesRootAccessLogger(t *testing.T) {
	cfg := config.Defaults()
	cfg.Env = "production"
	cfg.Server.PrintRoutes = false
	cfg.Auth.DemoEnabled = false
	cfg.Auth.ShowDemoCredentials = false
	cfg.Auth.SigningKey = strings.Repeat("p", 32)
	cfg.Logging.Format = "json"

	var output bytes.Buffer
	root := core.NewRootLogger(&output)
	root.Configure(&cfg)
	appCore, err := core.New(
		context.Background(),
		&cfg,
		core.WithLoggerProvider(root),
		core.WithIdentityProvider(unconfiguredIdentityProvider{}),
	)
	if err != nil {
		t.Fatalf("build production starter: %v", err)
	}
	t.Cleanup(func() {
		if shutdownErr := appCore.Shutdown(context.Background()); shutdownErr != nil {
			t.Errorf("shutdown starter: %v", shutdownErr)
		}
	})

	response, err := appCore.Server.WrappedRouter().Test(
		httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/login", nil),
		-1,
	)
	if err != nil {
		t.Fatalf("request login: %v", err)
	}
	body, readErr := io.ReadAll(response.Body)
	closeErr := response.Body.Close()
	if readErr != nil {
		t.Fatalf("read login: %v", readErr)
	}
	if closeErr != nil {
		t.Fatalf("close login response: %v", closeErr)
	}
	match := regexp.MustCompile(`name="_token" value="([^"]+)"`).FindSubmatch(body)
	if len(match) != 2 {
		t.Fatalf("login response omitted CSRF token")
	}
	logged := output.String()
	if bytes.Contains([]byte(logged), match[1]) {
		t.Fatalf("application logs exposed rendered CSRF token")
	}
	for _, forbidden := range []string{`"local_value"`, `"view_value"`} {
		if strings.Contains(logged, forbidden) {
			t.Fatalf("application logs exposed render values via %s", forbidden)
		}
	}
	for _, expected := range []string{
		`"logger":"http.access"`,
		`"msg":"http request"`,
		`"path":"/admin/login"`,
		`"values_redacted":true`,
	} {
		if !strings.Contains(logged, expected) {
			t.Fatalf("application log missing %s", expected)
		}
	}
}

func TestProductionCompositionRequiresProviderAndNeverExposesDemoSecrets(t *testing.T) {
	cfg := config.Defaults()
	cfg.Env = "production"
	cfg.Server.PrintRoutes = false
	cfg.Auth.DemoEnabled = false
	cfg.Auth.ShowDemoCredentials = false
	cfg.Auth.SigningKey = strings.Repeat("p", 32)

	if _, err := core.New(context.Background(), &cfg, core.WithRouteRegistrar(apphttp.Register)); err == nil ||
		!strings.Contains(err.Error(), "identity provider is required") {
		t.Fatalf("expected missing production identity provider error, got %v", err)
	}

	appCore, err := core.New(
		context.Background(),
		&cfg,
		core.WithIdentityProvider(unconfiguredIdentityProvider{}),
		core.WithRouteRegistrar(apphttp.Register),
	)
	if err != nil {
		t.Fatalf("build production starter: %v", err)
	}
	t.Cleanup(func() {
		if err := appCore.Shutdown(context.Background()); err != nil {
			t.Errorf("shutdown starter: %v", err)
		}
	})
	app := appCore.Server.WrappedRouter()
	for _, requestPath := range []string{"/", "/admin/login"} {
		response, err := app.Test(
			httptest.NewRequestWithContext(context.Background(), http.MethodGet, requestPath, nil),
			-1,
		)
		if err != nil {
			t.Fatalf("request production path %s: %v", requestPath, err)
		}
		body, readErr := io.ReadAll(response.Body)
		closeErr := response.Body.Close()
		if readErr != nil {
			t.Fatalf("read production path %s: %v", requestPath, readErr)
		}
		if closeErr != nil {
			t.Fatalf("close production path %s response: %v", requestPath, closeErr)
		}
		for _, secret := range []string{"Demo auth", "admin.pwd", "superadmin.pwd", "bearer token"} {
			if strings.Contains(string(body), secret) {
				t.Fatalf("production path %s exposed %q", requestPath, secret)
			}
		}
	}
}

type unconfiguredIdentityProvider struct{}

func (unconfiguredIdentityProvider) VerifyIdentity(context.Context, string, string) (auth.Identity, error) {
	return nil, auth.ErrIdentityNotFound
}

func (unconfiguredIdentityProvider) FindIdentityByIdentifier(context.Context, string) (auth.Identity, error) {
	return nil, auth.ErrIdentityNotFound
}
