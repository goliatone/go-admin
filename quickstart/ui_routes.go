package quickstart

import (
	"fmt"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// UIViewContextBuilder mutates the view context for UI routes.
type UIViewContextBuilder func(ctx router.ViewContext, active string, c router.Context) router.ViewContext

// UIRouteOption customizes the default UI route wiring.
type UIRouteOption func(*uiRouteOptions)

type uiRouteOptions struct {
	basePath             string
	dashboardPath        string
	notificationsPath    string
	dashboardTemplate    string
	notificationsTemplate string
	dashboardTitle       string
	notificationsTitle   string
	dashboardActive      string
	notificationsActive  string
	registerDashboard    bool
	registerNotifications bool
	viewContext          UIViewContextBuilder
}

// WithUIBasePath overrides the base path used to build default routes.
func WithUIBasePath(basePath string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts == nil {
			return
		}
		opts.basePath = strings.TrimSpace(basePath)
	}
}

// WithUIDashboardRoute toggles the dashboard route registration.
func WithUIDashboardRoute(enabled bool) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.registerDashboard = enabled
		}
	}
}

// WithUINotificationsRoute toggles the notifications route registration.
func WithUINotificationsRoute(enabled bool) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.registerNotifications = enabled
		}
	}
}

// WithUIDashboardPath overrides the dashboard route path.
func WithUIDashboardPath(route string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.dashboardPath = strings.TrimSpace(route)
		}
	}
}

// WithUINotificationsPath overrides the notifications route path.
func WithUINotificationsPath(route string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.notificationsPath = strings.TrimSpace(route)
		}
	}
}

// WithUIDashboardTemplate overrides the dashboard template name.
func WithUIDashboardTemplate(name string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.dashboardTemplate = strings.TrimSpace(name)
		}
	}
}

// WithUINotificationsTemplate overrides the notifications template name.
func WithUINotificationsTemplate(name string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.notificationsTemplate = strings.TrimSpace(name)
		}
	}
}

// WithUIDashboardTitle overrides the dashboard view title.
func WithUIDashboardTitle(title string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.dashboardTitle = strings.TrimSpace(title)
		}
	}
}

// WithUINotificationsTitle overrides the notifications view title.
func WithUINotificationsTitle(title string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.notificationsTitle = strings.TrimSpace(title)
		}
	}
}

// WithUIDashboardActive sets the active menu key for the dashboard route.
func WithUIDashboardActive(active string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.dashboardActive = strings.TrimSpace(active)
		}
	}
}

// WithUINotificationsActive sets the active menu key for the notifications route.
func WithUINotificationsActive(active string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.notificationsActive = strings.TrimSpace(active)
		}
	}
}

// WithUIViewContextBuilder overrides the default view context builder.
func WithUIViewContextBuilder(builder UIViewContextBuilder) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil && builder != nil {
			opts.viewContext = builder
		}
	}
}

// RegisterAdminUIRoutes registers default UI routes (dashboard + notifications).
func RegisterAdminUIRoutes(r router.Router[*fiber.App], cfg admin.Config, adm *admin.Admin, auth admin.HandlerAuthenticator, opts ...UIRouteOption) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}

	options := uiRouteOptions{
		basePath:              strings.TrimSpace(cfg.BasePath),
		dashboardTemplate:     "admin",
		notificationsTemplate: "notifications",
		dashboardTitle:        strings.TrimSpace(cfg.Title),
		notificationsTitle:    strings.TrimSpace(cfg.Title),
		dashboardActive:       "dashboard",
		notificationsActive:   "notifications",
		registerDashboard:     true,
		registerNotifications: true,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if options.basePath == "" {
		options.basePath = "/"
	}
	if options.dashboardPath == "" {
		options.dashboardPath = options.basePath
	}
	if options.notificationsPath == "" {
		options.notificationsPath = path.Join(options.basePath, "notifications")
	}
	if options.viewContext == nil {
		options.viewContext = defaultUIViewContextBuilder(adm, cfg)
	}

	wrap := func(handler router.HandlerFunc) router.HandlerFunc {
		if auth != nil {
			return auth.WrapHandler(handler)
		}
		return handler
	}

	if options.registerDashboard {
		r.Get(options.dashboardPath, wrap(func(c router.Context) error {
			viewCtx := router.ViewContext{
				"title":     options.dashboardTitle,
				"base_path": options.basePath,
			}
			viewCtx = options.viewContext(viewCtx, options.dashboardActive, c)
			return c.Render(options.dashboardTemplate, viewCtx)
		}))
	}

	if options.registerNotifications {
		r.Get(options.notificationsPath, wrap(func(c router.Context) error {
			viewCtx := router.ViewContext{
				"title":     options.notificationsTitle,
				"base_path": options.basePath,
			}
			viewCtx = options.viewContext(viewCtx, options.notificationsActive, c)
			return c.Render(options.notificationsTemplate, viewCtx)
		}))
	}

	return nil
}

func defaultUIViewContextBuilder(adm *admin.Admin, cfg admin.Config) UIViewContextBuilder {
	return func(ctx router.ViewContext, active string, c router.Context) router.ViewContext {
		reqCtx := c.Context()
		ctx = WithNav(ctx, adm, cfg, active, reqCtx)
		return WithThemeContext(ctx, adm, c)
	}
}
