package core

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/admin-shell/internal/config"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	commandregistry "github.com/goliatone/go-command/registry"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-router"
)

// FeatureStatus is a display-ready feature flag tuple.
type FeatureStatus struct {
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}

// Core is a lightweight dependency container for the admin shell.
type Core struct {
	Config    *config.AppConfig `json:"config"`
	Logger    *slog.Logger      `json:"logger"`
	StartedAt time.Time         `json:"started_at"`

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
}

// RouteRegistrar declares host-owned routes before the server is sealed.
type RouteRegistrar func(*Core, quickstart.HostRouter[*fiber.App]) error

type options struct {
	identityProvider auth.IdentityProvider
	routeRegistrars  []RouteRegistrar
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

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

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

	adminOptions := []quickstart.AdminOption{quickstart.WithAdminContext(ctx)}
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
	defer func() {
		if !initialized {
			_ = stopAdminRuntime(context.Background(), adm)
		}
	}()
	featureGate := adm.FeatureGate()

	auther, routeAuth, authn, demoCredentials, demoIdentity, authCookieName, err := setupAuth(adm, cfg, opts.identityProvider)
	if err != nil {
		return nil, fmt.Errorf("setup auth: %w", err)
	}

	isDev := isDevelopmentEnv(cfg.Env)
	viewEngine, err := newAdminShellViewEngine(adminCfg, adm, isDev)
	if err != nil {
		return nil, fmt.Errorf("initialize view engine: %w", err)
	}

	server, r := quickstart.NewFiberServer(
		viewEngine,
		adminCfg,
		adm,
		isDev,
		printRoutesFiberConfig(cfg.Server.PrintRoutes),
	)

	host := quickstart.NewHostRouter(r, adminCfg)
	appCore := &Core{
		Config:             cfg,
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

func isDevelopmentEnv(env string) bool {
	switch strings.ToLower(strings.TrimSpace(env)) {
	case "development", "dev", "local":
		return true
	default:
		return false
	}
}

func newAdminShellViewEngine(adminCfg admin.Config, adm *admin.Admin, isDev bool) (fiber.Views, error) {
	return quickstart.NewViewEngine(
		client.FS(),
		quickstart.WithViewTemplatesFS(adminShellTemplatesFS()),
		quickstart.WithViewTemplateFuncs(quickstart.DefaultTemplateFuncs(
			quickstart.WithTemplateURLResolver(adm.URLs()),
			quickstart.WithTemplateBasePath(adminCfg.BasePath),
			quickstart.WithTemplateFeatureGate(adm.FeatureGate()),
		)),
		quickstart.WithViewDebug(isDev),
	)
}

func printRoutesFiberConfig(enabled bool) quickstart.FiberServerOption {
	return quickstart.WithFiberConfig(func(fcfg *fiber.Config) {
		if fcfg != nil {
			fcfg.EnablePrintRoutes = enabled
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
	var shutdownErr error
	if c.Server != nil {
		shutdownErr = c.Server.Shutdown(ctx)
	}
	return errors.Join(shutdownErr, stopAdminRuntime(ctx, c.Admin))
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
		return errors.Join(normalizeServeError(err), stopAdminRuntime(context.Background(), c.Admin))
	case <-ctx.Done():
		timeout := time.Duration(c.Config.Server.ShutdownTimeoutSeconds) * time.Second
		shutdownCtx, cancel := context.WithTimeout(context.Background(), timeout)
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

func stopAdminRuntime(ctx context.Context, adm *admin.Admin) error {
	if adm != nil && adm.Commands() != nil {
		adm.Commands().Reset()
	}
	if ctx == nil {
		ctx = context.Background()
	}
	return commandregistry.Stop(ctx)
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
