package quickstart

import (
	"fmt"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// UIViewContextBuilder mutates the view context for UI routes.
type UIViewContextBuilder func(ctx router.ViewContext, active string, c router.Context) router.ViewContext

// UIRouteOption customizes the default UI route wiring.
type UIRouteOption func(*uiRouteOptions)

type uiRouteOptions struct {
	basePath              string
	dashboardPath         string
	notificationsPath     string
	activityPath          string
	featureFlagsPath      string
	dashboardTemplate     string
	notificationsTemplate string
	activityTemplate      string
	featureFlagsTemplate  string
	dashboardTitle        string
	notificationsTitle    string
	activityTitle         string
	featureFlagsTitle     string
	dashboardActive       string
	notificationsActive   string
	activityActive        string
	featureFlagsActive    string
	registerDashboard     bool
	registerNotifications bool
	registerActivity      bool
	registerFeatureFlags  bool
	viewContext           UIViewContextBuilder
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

// WithUIActivityRoute toggles the activity route registration.
func WithUIActivityRoute(enabled bool) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.registerActivity = enabled
		}
	}
}

// WithUIFeatureFlagsRoute toggles the feature flags route registration.
func WithUIFeatureFlagsRoute(enabled bool) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.registerFeatureFlags = enabled
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

// WithUIActivityPath overrides the activity route path.
func WithUIActivityPath(route string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.activityPath = strings.TrimSpace(route)
		}
	}
}

// WithUIFeatureFlagsPath overrides the feature flags route path.
func WithUIFeatureFlagsPath(route string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.featureFlagsPath = strings.TrimSpace(route)
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

// WithUIActivityTemplate overrides the activity template name.
func WithUIActivityTemplate(name string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.activityTemplate = strings.TrimSpace(name)
		}
	}
}

// WithUIFeatureFlagsTemplate overrides the feature flags template name.
func WithUIFeatureFlagsTemplate(name string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.featureFlagsTemplate = strings.TrimSpace(name)
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

// WithUIActivityTitle overrides the activity view title.
func WithUIActivityTitle(title string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.activityTitle = strings.TrimSpace(title)
		}
	}
}

// WithUIFeatureFlagsTitle overrides the feature flags view title.
func WithUIFeatureFlagsTitle(title string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.featureFlagsTitle = strings.TrimSpace(title)
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

// WithUIActivityActive sets the active menu key for the activity route.
func WithUIActivityActive(active string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.activityActive = strings.TrimSpace(active)
		}
	}
}

// WithUIFeatureFlagsActive sets the active menu key for the feature flags route.
func WithUIFeatureFlagsActive(active string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.featureFlagsActive = strings.TrimSpace(active)
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
		activityTemplate:      "resources/activity/list",
		featureFlagsTemplate:  "resources/feature-flags/index",
		dashboardTitle:        strings.TrimSpace(cfg.Title),
		notificationsTitle:    strings.TrimSpace(cfg.Title),
		activityTitle:         "Activity",
		featureFlagsTitle:     "Feature Flags",
		dashboardActive:       "dashboard",
		notificationsActive:   "notifications",
		activityActive:        "activity",
		featureFlagsActive:    "feature_flags",
		registerDashboard:     true,
		registerNotifications: true,
		registerActivity:      true,
		registerFeatureFlags:  true,
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
	if options.activityPath == "" {
		options.activityPath = path.Join(options.basePath, "activity")
	}
	if options.featureFlagsPath == "" {
		options.featureFlagsPath = path.Join(options.basePath, "feature-flags")
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

	if options.registerActivity {
		r.Get(options.activityPath, wrap(func(c router.Context) error {
			var urls urlkit.Resolver
			if adm != nil {
				urls = adm.URLs()
			}
			apiBase := resolveAdminAPIBasePath(urls, cfg, options.basePath)
			viewCtx := router.ViewContext{
				"title":             options.activityTitle,
				"base_path":         options.basePath,
				"activity_api_path": prefixBasePath(apiBase, "activity"),
			}
			viewCtx = options.viewContext(viewCtx, options.activityActive, c)
			return c.Render(options.activityTemplate, viewCtx)
		}))
	}

	if options.registerFeatureFlags {
		r.Get(options.featureFlagsPath, wrap(func(c router.Context) error {
			var urls urlkit.Resolver
			if adm != nil {
				urls = adm.URLs()
			}
			apiBase := resolveAdminAPIBasePath(urls, cfg, options.basePath)
			viewCtx := router.ViewContext{
				"title":                  options.featureFlagsTitle,
				"base_path":              options.basePath,
				"feature_flags_api_path": prefixBasePath(apiBase, "feature-flags"),
			}
			viewCtx = options.viewContext(viewCtx, options.featureFlagsActive, c)
			return c.Render(options.featureFlagsTemplate, viewCtx)
		}))
	}

	return nil
}

func defaultUIViewContextBuilder(adm *admin.Admin, cfg admin.Config) UIViewContextBuilder {
	return func(ctx router.ViewContext, active string, c router.Context) router.ViewContext {
		reqCtx := c.Context()
		ctx = WithNav(ctx, adm, cfg, active, reqCtx)
		ctx = WithThemeContext(ctx, adm, c)
		ctx = withAssignedRoles(ctx, adm, reqCtx)
		if _, ok := ctx["api_base_path"]; !ok {
			var urls urlkit.Resolver
			if adm != nil {
				urls = adm.URLs()
			}
			ctx["api_base_path"] = resolveAdminAPIBasePath(urls, cfg, cfg.BasePath)
		}
		labels := cfg.ActivityActionLabels
		if labels == nil {
			labels = map[string]string{}
		}
		ctx["activity_action_labels"] = labels
		return admin.CaptureViewContextForRequest(adm.Debug(), c, ctx)
	}
}
