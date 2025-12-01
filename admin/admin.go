package admin

import (
	"context"
	"errors"
	"path"

	router "github.com/goliatone/go-router"
)

// Admin orchestrates CMS-backed admin features and adapters.
type Admin struct {
	config          Config
	registry        *Registry
	cms             CMSContainer
	widgetSvc       CMSWidgetService
	menuSvc         CMSMenuService
	authenticator   Authenticator
	router          AdminRouter
	commandRegistry *CommandRegistry
	dashboard       *Dashboard
	nav             *Navigation
	search          *SearchEngine
	panels          map[string]*Panel
	authorizer      Authorizer
	settings        *SettingsService
	settingsForm    *SettingsFormAdapter
	settingsCommand *SettingsUpdateCommand
}

// New constructs an Admin orchestrator with default in-memory services.
func New(cfg Config) *Admin {
	if cfg.SettingsPermission == "" {
		cfg.SettingsPermission = "admin.settings.view"
	}
	if cfg.SettingsUpdatePermission == "" {
		cfg.SettingsUpdatePermission = "admin.settings.edit"
	}
	if cfg.SettingsThemeTokens == nil {
		cfg.SettingsThemeTokens = map[string]string{}
	}
	if cfg.BasePath != "" {
		cfg.SettingsThemeTokens["base_path"] = cfg.BasePath
	}
	if cfg.Theme != "" {
		cfg.SettingsThemeTokens["theme"] = cfg.Theme
	}

	container := NewNoopCMSContainer()
	cmdReg := NewCommandRegistry(cfg.EnableCommands || cfg.EnableSettings)
	settingsSvc := NewSettingsService()
	settingsForm := NewSettingsFormAdapter(settingsSvc, cfg.Theme, cfg.SettingsThemeTokens)
	settingsCmd := &SettingsUpdateCommand{Service: settingsSvc, Permission: cfg.SettingsUpdatePermission}
	if cfg.EnableSettings {
		cmdReg.Register(settingsCmd)
	}
	return &Admin{
		config:          cfg,
		registry:        NewRegistry(),
		cms:             container,
		widgetSvc:       container.WidgetService(),
		menuSvc:         container.MenuService(),
		commandRegistry: cmdReg,
		dashboard:       NewDashboard(),
		nav:             NewNavigation(container.MenuService(), nil),
		search:          NewSearchEngine(nil),
		panels:          make(map[string]*Panel),
		settings:        settingsSvc,
		settingsForm:    settingsForm,
		settingsCommand: settingsCmd,
	}
}

// WithAuth attaches an authenticator for route protection.
func (a *Admin) WithAuth(auth Authenticator, cfg *AuthConfig) *Admin {
	a.authenticator = auth
	if cfg != nil {
		a.config.AuthConfig = cfg
	}
	return a
}

// WithAuthorizer sets an authorizer for panel permissions.
func (a *Admin) WithAuthorizer(authz Authorizer) *Admin {
	a.authorizer = authz
	if a.nav != nil {
		a.nav.authorizer = authz
	}
	if a.search != nil {
		a.search.authorizer = authz
	}
	return a
}

// Panel returns a placeholder panel builder hook.
// Detailed behaviors are delivered in later phases.
func (a *Admin) Panel(_ string) *PanelBuilder {
	return &PanelBuilder{commandBus: a.commandRegistry}
}

// Dashboard returns a placeholder dashboard handle.
func (a *Admin) Dashboard() *DashboardHandle {
	return &DashboardHandle{}
}

// Menu returns a placeholder navigation handle.
func (a *Admin) Menu() *MenuHandle {
	return &MenuHandle{}
}

// Commands exposes the go-command registry hook.
func (a *Admin) Commands() *CommandRegistry {
	return a.commandRegistry
}

// DashboardService exposes the dashboard orchestration.
func (a *Admin) DashboardService() *Dashboard {
	return a.dashboard
}

// RegisterPanel registers a built panel with the admin.
func (a *Admin) RegisterPanel(name string, builder *PanelBuilder) (*Panel, error) {
	if builder == nil {
		return nil, errors.New("panel builder is nil")
	}
	builder.name = name
	builder.commandBus = a.commandRegistry
	if builder.authorizer == nil {
		builder.authorizer = a.authorizer
	}
	panel, err := builder.Build()
	if err != nil {
		return nil, err
	}
	a.panels[name] = panel
	return panel, nil
}

// Bootstrap initializes CMS seed data (widget areas, admin menu, default widgets).
func (a *Admin) Bootstrap(ctx context.Context) error {
	if a.config.EnableCMS || a.config.EnableDashboard {
		if err := a.ensureCMS(ctx); err != nil {
			return err
		}
		if err := a.bootstrapWidgetAreas(ctx); err != nil {
			return err
		}
		if err := a.registerDefaultWidgets(ctx); err != nil {
			return err
		}
	}
	if err := a.bootstrapAdminMenu(ctx); err != nil {
		return err
	}
	return nil
}

func joinPath(basePath, suffix string) string {
	return path.Join("/", basePath, suffix)
}

// Initialize attaches the router, bootstraps, and mounts base routes.
func (a *Admin) Initialize(r AdminRouter) error {
	if r == nil {
		return errors.New("router cannot be nil")
	}
	a.router = r
	if a.nav == nil {
		a.nav = NewNavigation(a.menuSvc, a.authorizer)
	}
	if a.search == nil {
		a.search = NewSearchEngine(a.authorizer)
	}
	if err := a.Bootstrap(context.Background()); err != nil {
		return err
	}
	a.registerHealthRoute()
	a.registerPanelRoutes()
	a.registerDashboardRoute()
	a.registerNavigationRoute()
	a.registerSearchRoute()
	return nil
}

func (a *Admin) ensureCMS(ctx context.Context) error {
	if !a.config.EnableCMS && !a.config.EnableDashboard {
		// Already using in-memory defaults.
		return nil
	}
	// Future: instantiate a real CMS container using a.config.CMSConfig.
	if a.cms == nil {
		container := NewNoopCMSContainer()
		a.cms = container
		a.widgetSvc = container.WidgetService()
		a.menuSvc = container.MenuService()
	}
	_ = ctx
	return nil
}

func (a *Admin) registerHealthRoute() {
	if a.router == nil {
		return
	}
	path := joinPath(a.config.BasePath, "health")
	a.router.Get(path, func(c router.Context) error {
		if a.authenticator != nil {
			if err := a.authenticator.Wrap(c); err != nil {
				return err
			}
		}
		return c.JSON(200, map[string]string{"status": "ok"})
	})
}

func (a *Admin) registerPanelRoutes() {
	if a.router == nil {
		return
	}
	for name, panel := range a.panels {
		base := joinPath(a.config.BasePath, "api/"+name)

		// List
		a.router.Get(base, func(c router.Context) error {
			locale := c.Query("locale")
			if locale == "" {
				locale = a.config.DefaultLocale
			}
			ctx := newAdminContextFromRouter(c, locale)
			opts := parseListOptions(c)
			if opts.Search != "" {
				if opts.Filters == nil {
					opts.Filters = map[string]any{}
				}
				opts.Filters["_search"] = opts.Search
			}
			records, total, err := panel.List(ctx, opts)
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]any{
				"total":   total,
				"records": records,
				"schema":  panel.Schema(),
			})
		})

		// Create
		a.router.Post(base, func(c router.Context) error {
			ctx := newAdminContextFromRouter(c, a.config.DefaultLocale)
			record, err := parseJSONBody(c)
			if err != nil {
				return writeError(c, err)
			}
			created, err := panel.Create(ctx, record)
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, created)
		})

		// Delete (basic: expects ?id=)
		a.router.Delete(base, func(c router.Context) error {
			ctx := newAdminContextFromRouter(c, a.config.DefaultLocale)
			id := c.Query("id")
			if id == "" {
				return writeError(c, errors.New("missing id"))
			}
			if err := panel.Delete(ctx, id); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]string{"status": "deleted"})
		})
	}
}

func (a *Admin) registerDashboardRoute() {
	if a.router == nil || a.dashboard == nil {
		return
	}
	path := joinPath(a.config.BasePath, "api/dashboard")
	a.router.Get(path, func(c router.Context) error {
		ctx := newAdminContextFromRouter(c, a.config.DefaultLocale)
		widgets, err := a.dashboard.Resolve(ctx)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{
			"widgets": widgets,
		})
	})
}

func (a *Admin) registerNavigationRoute() {
	if a.router == nil || a.nav == nil {
		return
	}
	path := joinPath(a.config.BasePath, "api/navigation")
	a.router.Get(path, func(c router.Context) error {
		locale := c.Query("locale")
		if locale == "" {
			locale = a.config.DefaultLocale
		}
		ctx := c.Context()
		items := a.nav.Resolve(ctx, locale)
		return writeJSON(c, map[string]any{"items": items})
	})
}

func (a *Admin) registerSearchRoute() {
	if a.router == nil || a.search == nil {
		return
	}
	path := joinPath(a.config.BasePath, "api/search")
	a.router.Get(path, func(c router.Context) error {
		query := c.Query("query")
		if query == "" {
			return writeError(c, errors.New("query required"))
		}
		limit := atoiDefault(c.Query("limit"), 10)
		locale := c.Query("locale")
		if locale == "" {
			locale = a.config.DefaultLocale
		}
		ctx := newAdminContextFromRouter(c, locale)
		results, err := a.search.Query(ctx, query, limit)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"results": results})
	})
}

func (a *Admin) bootstrapWidgetAreas(ctx context.Context) error {
	if a.widgetSvc == nil {
		return nil
	}
	areas := []WidgetAreaDefinition{
		{Code: "admin.dashboard.main", Name: "Main Dashboard Area", Scope: "global"},
		{Code: "admin.dashboard.sidebar", Name: "Dashboard Sidebar", Scope: "global"},
		{Code: "admin.dashboard.footer", Name: "Dashboard Footer", Scope: "global"},
	}
	for _, area := range areas {
		if err := a.widgetSvc.RegisterAreaDefinition(ctx, area); err != nil {
			return err
		}
	}
	return nil
}

func (a *Admin) registerDefaultWidgets(ctx context.Context) error {
	if a.widgetSvc == nil {
		return nil
	}
	definitions := []WidgetDefinition{
		{
			Code: "admin.widget.user_stats",
			Name: "User Statistics",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"title": map[string]any{"type": "string"},
					"metric": map[string]any{
						"type": "string",
						"enum": []string{"total", "active", "new"},
					},
				},
			},
		},
		{
			Code: "admin.widget.recent_activity",
			Name: "Recent Activity Feed",
			Schema: map[string]any{
				"type":       "object",
				"properties": map[string]any{"limit": map[string]any{"type": "integer", "default": 10}},
			},
		},
		{
			Code: "admin.widget.quick_actions",
			Name: "Quick Actions",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"actions": map[string]any{
						"type": "array",
						"items": map[string]any{
							"type": "object",
							"properties": map[string]any{
								"label": map[string]any{"type": "string"},
								"url":   map[string]any{"type": "string"},
								"icon":  map[string]any{"type": "string"},
							},
						},
					},
				},
			},
		},
	}
	for _, def := range definitions {
		if err := a.widgetSvc.RegisterDefinition(ctx, def); err != nil {
			return err
		}
	}
	return nil
}

func (a *Admin) bootstrapAdminMenu(ctx context.Context) error {
	if a.menuSvc == nil {
		return nil
	}
	menu, err := a.menuSvc.CreateMenu(ctx, "admin.main")
	if err != nil {
		return err
	}
	if len(menu.Items) > 0 {
		return nil
	}
	items := []MenuItem{
		{Label: "Dashboard", Target: map[string]any{"type": "route", "name": "admin.dashboard"}, Icon: "home", Position: 0, Locale: a.config.DefaultLocale},
		{Label: "Content", Target: map[string]any{"type": "route", "name": "admin.content"}, Icon: "file-text", Position: 1, Locale: a.config.DefaultLocale},
		{Label: "Pages", Target: map[string]any{"type": "route", "name": "admin.pages"}, Icon: "file", Position: 2, Locale: a.config.DefaultLocale},
		{Label: "Menus", Target: map[string]any{"type": "route", "name": "admin.menus"}, Icon: "menu", Position: 3, Locale: a.config.DefaultLocale},
		{Label: "Settings", Target: map[string]any{"type": "route", "name": "admin.settings"}, Icon: "settings", Position: 4, Locale: a.config.DefaultLocale},
	}
	for _, item := range items {
		if err := a.menuSvc.AddMenuItem(ctx, menu.Code, item); err != nil {
			return err
		}
	}
	return nil
}
