package core

import (
	"context"
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
	goconfig "github.com/goliatone/go-config/config"
	"github.com/goliatone/go-featuregate/adapters/configadapter"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-featuregate/resolver"
	"github.com/goliatone/go-router"
)

// FeatureStatus is a display-ready feature flag tuple.
type FeatureStatus struct {
	Name    string
	Enabled bool
}

// Core is a lightweight dependency container for the admin shell.
type Core struct {
	Config          *config.AppConfig
	ConfigContainer *goconfig.Container[*config.AppConfig]
	Logger          *slog.Logger
	StartedAt       time.Time

	Server router.Server[*fiber.App]
	Router router.Router[*fiber.App]
	Fiber  *fiber.App

	Admin              *admin.Admin
	Authenticator      *admin.GoAuthAuthenticator
	AuthCookieName     string
	FeatureGate        fggate.FeatureGate
	Auther             *auth.Auther
	RouteAuthenticator *auth.RouteAuthenticator
	DemoCredentials    []DemoCredential
	DemoIdentity       DemoIdentity
	DemoToken          string
}

// New builds application dependencies and wires go-admin.
func New(ctx context.Context, cfg *config.AppConfig, container *goconfig.Container[*config.AppConfig]) (*Core, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if cfg == nil {
		return nil, fmt.Errorf("config is required")
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	featureGate := featureGateFromDefaults(cfg.Features)

	adminCfg := quickstart.NewAdminConfig(
		cfg.Admin.BasePath,
		cfg.Admin.Title,
		cfg.Admin.DefaultLocale,
		quickstart.WithScopeFromEnv(),
	)

	adm, _, err := quickstart.NewAdmin(
		adminCfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminDependencies(admin.Dependencies{FeatureGate: featureGate}),
	)
	if err != nil {
		return nil, fmt.Errorf("build admin: %w", err)
	}

	auther, routeAuth, authn, demoCredentials, demoIdentity, demoToken, authCookieName, err := setupAuth(adm, cfg, logger)
	if err != nil {
		return nil, fmt.Errorf("setup auth: %w", err)
	}

	isDev := strings.EqualFold(strings.TrimSpace(cfg.Env), "development") ||
		strings.EqualFold(strings.TrimSpace(cfg.Env), "dev") ||
		strings.EqualFold(strings.TrimSpace(cfg.Env), "local")

	viewEngine, err := quickstart.NewViewEngine(
		client.FS(),
		quickstart.WithViewTemplatesFS(adminShellTemplatesFS()),
		quickstart.WithViewTemplateFuncs(quickstart.DefaultTemplateFuncs(
			quickstart.WithTemplateURLResolver(adm.URLs()),
			quickstart.WithTemplateBasePath(adminCfg.BasePath),
			quickstart.WithTemplateFeatureGate(adm.FeatureGate()),
		)),
		quickstart.WithViewDebug(isDev),
	)
	if err != nil {
		return nil, fmt.Errorf("initialize view engine: %w", err)
	}

	server, r := quickstart.NewFiberServer(
		viewEngine,
		adminCfg,
		adm,
		isDev,
		quickstart.WithFiberConfig(func(fcfg *fiber.Config) {
			if fcfg == nil {
				return
			}
			fcfg.EnablePrintRoutes = cfg.Server.PrintRoutes
		}),
	)

	if err := adm.Initialize(r); err != nil {
		return nil, fmt.Errorf("initialize admin routes: %w", err)
	}
	quickstart.NewStaticAssets(r, adminCfg, client.Assets())

	if err := quickstart.RegisterAuthUIRoutes(
		r,
		adminCfg,
		auther,
		authCookieName,
		quickstart.WithAuthUIFeatureGate(adm.FeatureGate()),
		quickstart.WithAuthUITemplates("login-demo", "password_reset"),
		quickstart.WithAuthUIViewContextBuilder(func(ctx router.ViewContext, _ router.Context) router.ViewContext {
			ctx["demo_credentials"] = demoCredentialsView(demoCredentials)
			return ctx
		}),
	); err != nil {
		return nil, fmt.Errorf("register auth UI routes: %w", err)
	}

	if err := quickstart.RegisterAdminUIRoutes(r, adminCfg, adm, authn); err != nil {
		return nil, fmt.Errorf("register admin UI routes: %w", err)
	}

	return &Core{
		Config:             cfg,
		ConfigContainer:    container,
		Logger:             logger,
		StartedAt:          time.Now().UTC(),
		Server:             server,
		Router:             r,
		Fiber:              server.WrappedRouter(),
		Admin:              adm,
		Authenticator:      authn,
		AuthCookieName:     authCookieName,
		FeatureGate:        featureGate,
		Auther:             auther,
		RouteAuthenticator: routeAuth,
		DemoCredentials:    demoCredentials,
		DemoIdentity:       demoIdentity,
		DemoToken:          demoToken,
	}, nil
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
	if c == nil || c.Server == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	return c.Server.Shutdown(ctx)
}

// Features returns sorted feature flags for display.
func (c *Core) Features() []FeatureStatus {
	if c == nil || len(c.Config.Features) == 0 {
		return nil
	}
	out := make([]FeatureStatus, 0, len(c.Config.Features))
	for key, value := range c.Config.Features {
		out = append(out, FeatureStatus{Name: key, Enabled: value})
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Name < out[j].Name
	})
	return out
}

func featureGateFromDefaults(defaults map[string]bool) fggate.FeatureGate {
	if len(defaults) == 0 {
		defaults = map[string]bool{}
	}
	return resolver.New(resolver.WithDefaults(configadapter.NewDefaultsFromBools(defaults)))
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
