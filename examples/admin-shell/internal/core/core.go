package core

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/admin-shell/config"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	golifecycle "github.com/goliatone/go-admin/pkg/go-lifecycle"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-logger/glog"
	"github.com/goliatone/go-router"
)

// FeatureStatus is a display-ready feature flag tuple.
type FeatureStatus struct {
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}

// AdminLifecycleDiagnostics is a task-only view of admin contribution state.
// Application readiness and serving state belong to the host runtime.
type AdminLifecycleDiagnostics struct {
	StartedAt time.Time                  `json:"started_at"`
	UpdatedAt time.Time                  `json:"updated_at"`
	Tasks     []golifecycle.TaskSnapshot `json:"tasks"`
}

// Core is a lightweight dependency container for the admin shell.
type Core struct {
	Config         *config.AppConfig   `json:"config"`
	LoggerProvider glog.LoggerProvider `json:"logger_provider"`
	Logger         glog.Logger         `json:"logger"`
	StartedAt      time.Time           `json:"started_at"`

	Server router.Server[*fiber.App]         `json:"server"`
	Host   quickstart.HostRouter[*fiber.App] `json:"host"`

	Admin              *admin.Admin               `json:"admin"`
	Authenticator      *admin.GoAuthAuthenticator `json:"authenticator"`
	AuthCookieName     string                     `json:"auth_cookie_name"`
	FeatureGate        fggate.FeatureGate         `json:"feature_gate"`
	Auther             *auth.Auther               `json:"auther"`
	RouteAuthenticator *auth.RouteAuthenticator   `json:"route_authenticator"`
	DemoCredentials    []DemoCredential           `json:"demo_credentials"`
	DemoIdentity       DemoIdentity               `json:"demo_identity"`

	adminShutdownMu       sync.Mutex
	adminShutdownComplete bool
	adminLifecycle        *golifecycle.Runner
}

// RouteRegistrar declares host-owned routes before the server is sealed.
type RouteRegistrar func(*Core, quickstart.HostRouter[*fiber.App]) error

// AdminContribution registers host-owned modules, panels, navigation, or
// dashboard providers before Admin.Initialize.
type AdminContribution struct {
	Name     string
	Priority int
	Register func(*Core) error
}

// AdminModuleFactory constructs an admin module with the command-owned logger
// provider and its stable modules.<name> child logger.
type AdminModuleFactory func(glog.LoggerProvider, glog.Logger) (admin.Module, error)

type options struct {
	identityProvider   auth.IdentityProvider
	routeRegistrars    []RouteRegistrar
	adminContributions []AdminContribution
	loggerProvider     glog.LoggerProvider
}

// Option customizes starter composition without bypassing its lifecycle rules.
type Option func(*options)

// WithIdentityProvider supplies the production identity provider. It is
// required when demo auth is disabled.
func WithIdentityProvider(provider auth.IdentityProvider) Option {
	return func(opts *options) {
		if opts != nil {
			opts.identityProvider = provider
		}
	}
}

// WithRouteRegistrar adds host-owned routes to the pre-initialization phase.
func WithRouteRegistrar(registrar RouteRegistrar) Option {
	return func(opts *options) {
		if opts != nil && registrar != nil {
			opts.routeRegistrars = append(opts.routeRegistrars, registrar)
		}
	}
}

// WithAdminContribution adds a named pre-initialization contribution.
func WithAdminContribution(name string, register func(*Core) error) Option {
	return WithAdminContributionPriority(name, 0, register)
}

// WithAdminContributionPriority adds a contribution with explicit lifecycle
// priority. Higher priorities run first; ties retain option insertion order.
func WithAdminContributionPriority(name string, priority int, register func(*Core) error) Option {
	return func(opts *options) {
		if opts == nil {
			return
		}
		opts.adminContributions = append(opts.adminContributions, AdminContribution{
			Name:     strings.TrimSpace(name),
			Priority: priority,
			Register: register,
		})
	}
}

// WithAdminModule registers a logger-aware module factory.
func WithAdminModule(name string, factory AdminModuleFactory) Option {
	return WithAdminModulePriority(name, 0, factory)
}

// WithAdminModulePriority registers a logger-aware module factory with an
// explicit pre-bind priority.
func WithAdminModulePriority(name string, priority int, factory AdminModuleFactory) Option {
	return func(opts *options) {
		if opts == nil {
			return
		}
		opts.adminContributions = append(
			opts.adminContributions,
			newAdminModuleContribution(name, priority, factory),
		)
	}
}

// WithLoggerProvider supplies the command-owned logger root.
func WithLoggerProvider(provider glog.LoggerProvider) Option {
	return func(opts *options) {
		if opts != nil {
			opts.loggerProvider = provider
		}
	}
}

// New builds application dependencies and wires go-admin.
func New(ctx context.Context, cfg *config.AppConfig, optionFns ...Option) (*Core, error) {
	if cfg == nil {
		return nil, fmt.Errorf("config is required")
	}
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("validate config: %w", err)
	}
	if ctx == nil {
		ctx = context.Background()
	}
	opts := options{}
	for _, option := range optionFns {
		if option != nil {
			option(&opts)
		}
	}

	loggerProvider := opts.loggerProvider
	if loggerProvider == nil {
		loggerProvider = glog.ProviderFromLogger(glog.Nop())
	}
	logger := glog.Ensure(loggerProvider.GetLogger("core"))
	LogStartupConfig(logger, cfg, "configured")

	adminCfg := quickstart.NewAdminConfig(
		cfg.Admin.BasePath,
		cfg.Admin.Title,
		cfg.Admin.DefaultLocale,
	)
	adminCfg.Deployment = admin.DeploymentIdentityConfig{
		AppID:       cfg.Deployment.AppID,
		AppName:     cfg.Deployment.AppName,
		AppVersion:  cfg.Deployment.AppVersion,
		Environment: cfg.Env,
		Persona: admin.DeploymentPersonaConfig{
			Enabled: cfg.Deployment.PersonaEnabled,
		},
	}

	adminOptions := []quickstart.AdminOption{
		quickstart.WithAdminContext(ctx),
		quickstart.WithAdminDependencies(admin.Dependencies{
			LoggerProvider: loggerProvider,
			Logger:         glog.Ensure(loggerProvider.GetLogger("admin")),
		}),
	}
	profile := strings.ToLower(strings.TrimSpace(cfg.Features.Profile))
	if profile == "" {
		profile = "minimal"
	}
	switch profile {
	case "minimal":
		adminOptions = append(adminOptions, quickstart.WithMinimalFeatures())
	case "default", "full":
		// The complete quickstart feature catalog is the default base set.
	}
	if overrides := cfg.FeatureOverrides(); len(overrides) > 0 {
		adminOptions = append(adminOptions, quickstart.WithFeatureOverrides(overrides))
	}
	adm, _, err := quickstart.NewAdmin(
		adminCfg,
		quickstart.AdapterHooks{},
		adminOptions...,
	)
	if err != nil {
		return nil, fmt.Errorf("build admin: %w", err)
	}
	initialized := false
	var adminLifecycle *golifecycle.Runner
	defer func() {
		if !initialized {
			shutdownCtx, cancel := context.WithTimeout(
				context.Background(),
				configuredShutdownTimeout(cfg),
			)
			defer cancel()
			var lifecycleShutdown shutdownOperation
			if adminLifecycle != nil {
				lifecycleShutdown = adminLifecycle.Shutdown
			}
			_ = coordinateShutdown(
				shutdownCtx,
				nil,
				lifecycleShutdown,
				func(cleanupCtx context.Context) error {
					return stopAdminRuntime(cleanupCtx, adm)
				},
			)
		}
	}()
	featureGate := adm.FeatureGate()

	auther, routeAuth, authn, demoCredentials, demoIdentity, authCookieName, err := setupAuth(
		adm,
		cfg,
		opts.identityProvider,
		loggerProvider,
	)
	if err != nil {
		return nil, fmt.Errorf("setup auth: %w", err)
	}

	isDev := isDevelopmentEnv(cfg.Env)
	viewEngine, err := newAdminShellViewEngine(adminCfg, adm)
	if err != nil {
		return nil, fmt.Errorf("initialize view engine: %w", err)
	}

	server, r := quickstart.NewFiberServer(
		viewEngine,
		adminCfg,
		adm,
		isDev,
		adminShellFiberConfig(),
		quickstart.WithFiberLogger(false),
		quickstart.WithFiberMiddleware(
			newFiberAccessLogger(loggerProvider.GetLogger("http.access")),
		),
	)
	r = r.WithLogger(newRouterLogger(
		loggerProvider.GetLogger("router"),
		cfg.Server.PrintRoutes,
	))

	host := quickstart.NewHostRouter(r, adminCfg)
	appCore := &Core{
		Config:             cfg,
		LoggerProvider:     loggerProvider,
		Logger:             logger,
		StartedAt:          time.Now().UTC(),
		Server:             server,
		Host:               host,
		Admin:              adm,
		Authenticator:      authn,
		AuthCookieName:     authCookieName,
		FeatureGate:        featureGate,
		Auther:             auther,
		RouteAuthenticator: routeAuth,
		DemoCredentials:    demoCredentials,
		DemoIdentity:       demoIdentity,
	}

	adminLifecycle, err = newAdminLifecycleRunner(appCore, opts.adminContributions)
	if err != nil {
		return nil, err
	}
	appCore.adminLifecycle = adminLifecycle
	if err := adminLifecycle.RunPreBind(ctx); err != nil {
		return nil, fmt.Errorf("register admin contributions: %w", err)
	}

	// Static and host-owned routes must be declared before admin initialization;
	// WrappedRouter and Serve are the only sealing boundaries.
	quickstart.NewStaticAssets(host.Static(), adminCfg, client.Assets())
	for _, registrar := range opts.routeRegistrars {
		if err := registrar(appCore, host); err != nil {
			return nil, fmt.Errorf("register host routes: %w", err)
		}
	}
	if err := adm.Initialize(host.Admin()); err != nil {
		return nil, fmt.Errorf("initialize admin routes: %w", err)
	}
	visibleDemoCredentials := demoCredentials
	if !appCore.DemoCredentialsVisible() {
		visibleDemoCredentials = nil
	}
	if err := registerAdminShellUIRoutes(host.AdminUI(), adminCfg, adm, routeAuth, authn, visibleDemoCredentials); err != nil {
		return nil, err
	}

	initialized = true
	return appCore, nil
}

// GetLogger resolves a stable named child from the command-owned provider.
func (c *Core) GetLogger(name string) glog.Logger {
	if c == nil || c.LoggerProvider == nil {
		return glog.Nop()
	}
	name = strings.TrimSpace(name)
	if name == "" {
		name = "core"
	}
	return glog.Ensure(c.LoggerProvider.GetLogger(name))
}

func newAdminLifecycleRunner(
	appCore *Core,
	contributions []AdminContribution,
) (*golifecycle.Runner, error) {
	if appCore == nil || appCore.Admin == nil {
		return nil, fmt.Errorf("configure admin lifecycle: admin runtime is required")
	}
	registry := golifecycle.NewRegistry()
	for _, contribution := range contributions {
		name := strings.TrimSpace(contribution.Name)
		if name == "" {
			return nil, fmt.Errorf("configure admin lifecycle: contribution name is required")
		}
		if contribution.Register == nil {
			return nil, fmt.Errorf("configure admin lifecycle %q: callback is required", name)
		}
		current := contribution
		if err := registry.Register(golifecycle.Task{
			Name:     "admin.contribution." + name,
			Phase:    golifecycle.PhasePreBind,
			Priority: current.Priority,
			Policy:   golifecycle.ErrorPolicyFatal,
			Run: func(context.Context) error {
				if err := current.Register(appCore); err != nil {
					return fmt.Errorf("register admin contribution %q: %w", name, err)
				}
				return nil
			},
		}); err != nil {
			return nil, fmt.Errorf("configure admin lifecycle: %w", err)
		}
	}
	runner, err := golifecycle.NewRunner(registry)
	if err != nil {
		return nil, fmt.Errorf("configure admin lifecycle runner: %w", err)
	}
	return runner, nil
}

func newAdminModuleContribution(
	name string,
	priority int,
	factory AdminModuleFactory,
) AdminContribution {
	name = strings.TrimSpace(name)
	return AdminContribution{
		Name:     name,
		Priority: priority,
		Register: func(appCore *Core) error {
			if appCore == nil || appCore.Admin == nil {
				return fmt.Errorf("admin runtime is required")
			}
			if factory == nil {
				return fmt.Errorf("module factory is required")
			}
			module, err := factory(
				appCore.LoggerProvider,
				appCore.GetLogger("modules."+name),
			)
			if err != nil {
				return fmt.Errorf("build module: %w", err)
			}
			if module == nil {
				return fmt.Errorf("module factory returned nil")
			}
			return appCore.Admin.RegisterModule(module)
		},
	}
}

func isDevelopmentEnv(env string) bool {
	switch strings.ToLower(strings.TrimSpace(env)) {
	case "development", "dev", "local":
		return true
	default:
		return false
	}
}

func newAdminShellViewEngine(adminCfg admin.Config, adm *admin.Admin) (fiber.Views, error) {
	return quickstart.NewViewEngine(
		client.FS(),
		quickstart.WithViewTemplatesFS(adminShellTemplatesFS()),
		quickstart.WithViewTemplateFuncs(quickstart.DefaultTemplateFuncs(
			quickstart.WithTemplateURLResolver(adm.URLs()),
			quickstart.WithTemplateBasePath(adminCfg.BasePath),
			quickstart.WithTemplateFeatureGate(adm.FeatureGate()),
		)),
	)
}

func adminShellFiberConfig() quickstart.FiberServerOption {
	return quickstart.WithFiberConfig(func(fcfg *fiber.Config) {
		if fcfg != nil {
			// Route registration is emitted structurally by routerLogger when
			// server.print_routes is enabled.
			fcfg.EnablePrintRoutes = false
			fcfg.DisableStartupMessage = true
		}
	})
}

func registerAdminShellUIRoutes(
	r router.Router[*fiber.App],
	adminCfg admin.Config,
	adm *admin.Admin,
	routeAuth *auth.RouteAuthenticator,
	authn *admin.GoAuthAuthenticator,
	demoCredentials []DemoCredential,
) error {
	loginTemplate := "login"
	if len(demoCredentials) > 0 {
		loginTemplate = "login-demo"
	}
	if err := quickstart.RegisterAuthUIRoutes(
		r,
		adminCfg,
		routeAuth,
		quickstart.WithAuthUIFeatureGate(adm.FeatureGate()),
		quickstart.WithAuthUILogoutAuthenticator(authn),
		quickstart.WithAuthUITemplates(loginTemplate, "password_reset"),
		quickstart.WithAuthUIViewContextBuilder(func(ctx router.ViewContext, _ router.Context) router.ViewContext {
			ctx["demo_credentials"] = demoCredentialsView(demoCredentials)
			return ctx
		}),
	); err != nil {
		return fmt.Errorf("register auth UI routes: %w", err)
	}
	if err := quickstart.RegisterAdminUIRoutes(r, adminCfg, adm, authn); err != nil {
		return fmt.Errorf("register admin UI routes: %w", err)
	}
	return nil
}

// Serve starts the HTTP server.
func (c *Core) Serve() error {
	if c == nil || c.Server == nil || c.Config == nil {
		return fmt.Errorf("core server is not configured")
	}
	return c.Server.Serve(c.Config.Server.Address)
}

// Shutdown stops the HTTP server gracefully.
func (c *Core) Shutdown(ctx context.Context) error {
	if c == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	var serverShutdown shutdownOperation
	if c.Server != nil {
		serverShutdown = c.Server.Shutdown
	}
	var lifecycleShutdown shutdownOperation
	if c.adminLifecycle != nil {
		lifecycleShutdown = c.adminLifecycle.Shutdown
	}
	return coordinateShutdown(
		ctx,
		serverShutdown,
		lifecycleShutdown,
		c.shutdownAdminRuntime,
	)
}

// Run serves until the process context is canceled, then performs bounded
// graceful shutdown using server.shutdown_timeout_seconds.
func (c *Core) Run(ctx context.Context) error {
	if c == nil || c.Config == nil {
		return fmt.Errorf("core server is not configured")
	}
	if ctx == nil {
		ctx = context.Background()
	}

	serveErr := make(chan error, 1)
	go func() {
		serveErr <- c.Serve()
	}()

	select {
	case err := <-serveErr:
		shutdownCtx, cancel := context.WithTimeout(
			context.Background(),
			configuredShutdownTimeout(c.Config),
		)
		defer cancel()
		return errors.Join(
			normalizeServeError(err),
			c.Shutdown(shutdownCtx),
		)
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(
			context.Background(),
			configuredShutdownTimeout(c.Config),
		)
		defer cancel()
		if err := c.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("shutdown server: %w", err)
		}
		select {
		case err := <-serveErr:
			return normalizeServeError(err)
		case <-shutdownCtx.Done():
			return fmt.Errorf("wait for server shutdown: %w", shutdownCtx.Err())
		}
	}
}

// AdminLifecycleSnapshot returns a defensive task-only diagnostic snapshot.
func (c *Core) AdminLifecycleSnapshot() AdminLifecycleDiagnostics {
	if c == nil || c.adminLifecycle == nil {
		return AdminLifecycleDiagnostics{}
	}
	snapshot := c.adminLifecycle.Snapshot()
	return AdminLifecycleDiagnostics{
		StartedAt: snapshot.StartedAt,
		UpdatedAt: snapshot.UpdatedAt,
		Tasks:     append([]golifecycle.TaskSnapshot(nil), snapshot.Tasks...),
	}
}

// Features returns sorted feature flags for display.
func (c *Core) Features() []FeatureStatus {
	if c == nil || c.Config == nil || c.FeatureGate == nil {
		return nil
	}
	keys := quickstart.DefaultAdminFeatures()
	for key := range c.Config.FeatureOverrides() {
		keys[key] = false
	}
	out := make([]FeatureStatus, 0, len(keys))
	for key := range keys {
		enabled, err := c.FeatureGate.Enabled(context.Background(), key)
		if err != nil {
			enabled = false
		}
		out = append(out, FeatureStatus{Name: key, Enabled: enabled})
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Name < out[j].Name
	})
	return out
}

// DemoCredentialsVisible reports whether plaintext development credentials may
// be rendered or logged.
func (c *Core) DemoCredentialsVisible() bool {
	return c != nil && c.Config != nil && c.Config.Auth.DemoEnabled &&
		c.Config.Auth.ShowDemoCredentials && isDevelopmentEnv(c.Config.Env)
}

func normalizeServeError(err error) error {
	if err == nil || errors.Is(err, context.Canceled) {
		return nil
	}
	return err
}

func adminShellTemplatesFS() fs.FS {
	return embeddedTemplatesFS()
}

func demoCredentialsView(credentials []DemoCredential) []map[string]string {
	if len(credentials) == 0 {
		return nil
	}
	out := make([]map[string]string, 0, len(credentials))
	for _, credential := range credentials {
		out = append(out, map[string]string{
			"username": credential.Username,
			"email":    credential.Email,
			"password": credential.Password,
			"role":     credential.Role,
		})
	}
	return out
}
