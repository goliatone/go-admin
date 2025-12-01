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
	notifications   NotificationService
	activity        ActivitySink
	jobs            *JobRegistry
	settings        *SettingsService
	settingsForm    *SettingsFormAdapter
	settingsCommand *SettingsUpdateCommand
	themeProvider   ThemeProvider
	defaultTheme    *ThemeSelection
}

// New constructs an Admin orchestrator with default in-memory services.
func New(cfg Config) *Admin {
	if cfg.ThemeVariant == "" {
		cfg.ThemeVariant = "default"
	}
	if cfg.SettingsPermission == "" {
		cfg.SettingsPermission = "admin.settings.view"
	}
	if cfg.SettingsUpdatePermission == "" {
		cfg.SettingsUpdatePermission = "admin.settings.edit"
	}
	if cfg.SettingsThemeTokens == nil {
		cfg.SettingsThemeTokens = map[string]string{}
	}
	if cfg.ThemeTokens == nil {
		cfg.ThemeTokens = map[string]string{}
	}
	if cfg.BasePath != "" {
		cfg.SettingsThemeTokens["base_path"] = cfg.BasePath
		cfg.ThemeTokens["base_path"] = cfg.BasePath
	}
	if cfg.Theme != "" {
		cfg.SettingsThemeTokens["theme"] = cfg.Theme
		if _, ok := cfg.ThemeTokens["theme"]; !ok {
			cfg.ThemeTokens["theme"] = cfg.Theme
		}
	}
	for k, v := range cfg.SettingsThemeTokens {
		if _, ok := cfg.ThemeTokens[k]; !ok {
			cfg.ThemeTokens[k] = v
		}
	}

	container := NewNoopCMSContainer()
	cmdReg := NewCommandRegistry(cfg.EnableCommands || cfg.EnableSettings)
	settingsSvc := NewSettingsService()
	settingsForm := NewSettingsFormAdapter(settingsSvc, cfg.Theme, cfg.ThemeTokens)
	settingsCmd := &SettingsUpdateCommand{Service: settingsSvc, Permission: cfg.SettingsUpdatePermission}
	if cfg.EnableSettings {
		cmdReg.Register(settingsCmd)
	}
	var notifSvc NotificationService
	if cfg.EnableNotifications {
		notifSvc = NewInMemoryNotificationService()
	}
	activityFeed := NewActivityFeed()
	jobReg := NewJobRegistry(cmdReg)
	defaultTheme := &ThemeSelection{
		Name:        cfg.Theme,
		Variant:     cfg.ThemeVariant,
		Tokens:      cloneStringMap(cfg.ThemeTokens),
		Assets:      map[string]string{},
		ChartTheme:  cfg.ThemeVariant,
		AssetPrefix: cfg.ThemeAssetPrefix,
	}
	if cfg.LogoURL != "" {
		defaultTheme.Assets["logo"] = cfg.LogoURL
	}
	if cfg.FaviconURL != "" {
		defaultTheme.Assets["favicon"] = cfg.FaviconURL
	}

	adm := &Admin{
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
		notifications:   notifSvc,
		activity:        activityFeed,
		jobs:            jobReg,
		settings:        settingsSvc,
		settingsForm:    settingsForm,
		settingsCommand: settingsCmd,
		defaultTheme:    defaultTheme,
	}
	settingsForm.WithThemeResolver(adm.resolveTheme)
	return adm
}

// WithAuth attaches an authenticator for route protection.
func (a *Admin) WithAuth(auth Authenticator, cfg *AuthConfig) *Admin {
	a.authenticator = auth
	if cfg != nil {
		a.config.AuthConfig = cfg
	}
	return a
}

// WithThemeProvider wires a theme selector/registry to downstream renderers.
func (a *Admin) WithThemeProvider(provider ThemeProvider) *Admin {
	a.themeProvider = provider
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

func (a *Admin) resolveTheme(ctx context.Context) *ThemeSelection {
	base := cloneThemeSelection(a.defaultTheme)
	if a.themeProvider != nil {
		selection, err := a.themeProvider(ctx, ThemeSelector{Name: a.config.Theme, Variant: a.config.ThemeVariant})
		if err == nil && selection != nil {
			base = mergeThemeSelections(base, selection)
		}
	}
	if base.ChartTheme == "" && base.Variant != "" {
		base.ChartTheme = base.Variant
	}
	return base
}

func (a *Admin) themePayload(ctx context.Context) map[string]map[string]string {
	return a.resolveTheme(ctx).payload()
}

func (a *Admin) withTheme(ctx AdminContext) AdminContext {
	if ctx.Theme == nil {
		ctx.Theme = a.resolveTheme(ctx.Context)
	}
	return ctx
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

// SearchService exposes the search engine.
func (a *Admin) SearchService() *SearchEngine {
	return a.search
}

// SettingsService exposes the settings resolver.
func (a *Admin) SettingsService() *SettingsService {
	return a.settings
}

// NotificationService returns the inbox service.
func (a *Admin) NotificationService() NotificationService {
	return a.notifications
}

// ActivityFeed returns the activity sink.
func (a *Admin) ActivityFeed() ActivitySink {
	return a.activity
}

// Jobs exposes the job registry.
func (a *Admin) Jobs() *JobRegistry {
	return a.jobs
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
	if a.config.EnableSettings {
		if err := a.bootstrapSettingsDefaults(ctx); err != nil {
			return err
		}
	}
	if a.config.EnableNotifications && a.notifications != nil {
		_, _ = a.notifications.Add(ctx, Notification{Title: "Welcome to go-admin", Message: "Notifications are wired", Read: false})
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
	a.registerSettingsWidget()
	a.registerActivityWidget()
	a.registerDashboardRoute()
	a.registerNavigationRoute()
	a.registerSearchRoute()
	a.registerNotificationsRoute()
	a.registerActivityRoute()
	a.registerJobsRoute()
	a.registerSettingsRoutes()
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
		p := panel
		base := joinPath(a.config.BasePath, "api/"+name)

		// List
		a.router.Get(base, func(c router.Context) error {
			locale := c.Query("locale")
			if locale == "" {
				locale = a.config.DefaultLocale
			}
			ctx := a.withTheme(newAdminContextFromRouter(c, locale))
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
			schema := p.SchemaWithTheme(a.themePayload(ctx.Context))
			return writeJSON(c, map[string]any{
				"total":   total,
				"records": records,
				"schema":  schema,
			})
		})

		// Detail
		a.router.Get(joinPath(base, ":id"), func(c router.Context) error {
			ctx := a.withTheme(newAdminContextFromRouter(c, a.config.DefaultLocale))
			id := c.Param("id", "")
			if id == "" {
				return writeError(c, errors.New("missing id"))
			}
			rec, err := p.Get(ctx, id)
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, rec)
		})

		// Create
		a.router.Post(base, func(c router.Context) error {
			ctx := a.withTheme(newAdminContextFromRouter(c, a.config.DefaultLocale))
			record, err := parseJSONBody(c)
			if err != nil {
				return writeError(c, err)
			}
			created, err := p.Create(ctx, record)
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, created)
		})

		// Update
		a.router.Put(joinPath(base, ":id"), func(c router.Context) error {
			ctx := a.withTheme(newAdminContextFromRouter(c, a.config.DefaultLocale))
			id := c.Param("id", "")
			if id == "" {
				return writeError(c, errors.New("missing id"))
			}
			record, err := parseJSONBody(c)
			if err != nil {
				return writeError(c, err)
			}
			updated, err := p.Update(ctx, id, record)
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, updated)
		})

		// Delete (basic: expects ?id=)
		a.router.Delete(base, func(c router.Context) error {
			ctx := a.withTheme(newAdminContextFromRouter(c, a.config.DefaultLocale))
			id := c.Query("id")
			if id == "" {
				id = c.Param("id", "")
			}
			if id == "" {
				return writeError(c, errors.New("missing id"))
			}
			if err := p.Delete(ctx, id); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]string{"status": "deleted"})
		})

		a.router.Delete(joinPath(base, ":id"), func(c router.Context) error {
			ctx := a.withTheme(newAdminContextFromRouter(c, a.config.DefaultLocale))
			id := c.Param("id", "")
			if id == "" {
				return writeError(c, errors.New("missing id"))
			}
			if err := p.Delete(ctx, id); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]string{"status": "deleted"})
		})

		// Actions
		a.router.Post(joinPath(base, "actions/:action"), func(c router.Context) error {
			ctx := a.withTheme(newAdminContextFromRouter(c, a.config.DefaultLocale))
			actionName := c.Param("action", "")
			if actionName == "" {
				return writeError(c, errors.New("action required"))
			}
			if err := p.RunAction(ctx, actionName); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]string{"status": "ok"})
		})

		// Bulk actions
		a.router.Post(joinPath(base, "bulk/:action"), func(c router.Context) error {
			ctx := a.withTheme(newAdminContextFromRouter(c, a.config.DefaultLocale))
			actionName := c.Param("action", "")
			if actionName == "" {
				return writeError(c, errors.New("action required"))
			}
			if err := p.RunBulkAction(ctx, actionName); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]string{"status": "ok"})
		})
	}
}

func (a *Admin) registerDashboardRoute() {
	if a.router == nil || a.dashboard == nil {
		return
	}
	path := joinPath(a.config.BasePath, "api/dashboard")
	a.router.Get(path, func(c router.Context) error {
		ctx := a.withTheme(newAdminContextFromRouter(c, a.config.DefaultLocale))
		widgets, err := a.dashboard.Resolve(ctx)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{
			"widgets": widgets,
			"theme":   a.themePayload(ctx.Context),
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
		return writeJSON(c, map[string]any{
			"items": items,
			"theme": a.themePayload(ctx),
		})
	})
}

func (a *Admin) registerSearchRoute() {
	if a.router == nil || a.search == nil {
		return
	}
	if !a.config.EnableSearch {
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
		ctx := a.withTheme(newAdminContextFromRouter(c, locale))
		results, err := a.search.Query(ctx, query, limit)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"results": results})
	})

	typeaheadPath := joinPath(a.config.BasePath, "api/search/typeahead")
	a.router.Get(typeaheadPath, func(c router.Context) error {
		query := c.Query("query")
		if query == "" {
			return writeError(c, errors.New("query required"))
		}
		limit := atoiDefault(c.Query("limit"), 5)
		locale := c.Query("locale")
		if locale == "" {
			locale = a.config.DefaultLocale
		}
		ctx := a.withTheme(newAdminContextFromRouter(c, locale))
		results, err := a.search.Query(ctx, query, limit)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"results": results})
	})
}

func (a *Admin) registerSettingsWidget() {
	if a.dashboard == nil || a.settings == nil || !a.config.EnableSettings {
		return
	}
	a.dashboard.RegisterProvider("admin.widget.settings_overview", func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
		if err := a.requirePermission(ctx, a.config.SettingsPermission, "settings"); err != nil {
			return nil, err
		}
		values := a.settings.ResolveAll(ctx.UserID)
		keys := []string{}
		if raw, ok := cfg["keys"]; ok {
			switch v := raw.(type) {
			case []string:
				keys = append(keys, v...)
			case []any:
				for _, item := range v {
					if s, ok := item.(string); ok {
						keys = append(keys, s)
					}
				}
			}
		}
		shouldInclude := func(key string) bool {
			if len(keys) == 0 {
				return true
			}
			for _, k := range keys {
				if k == key {
					return true
				}
			}
			return false
		}
		payload := map[string]any{}
		for key, val := range values {
			if !shouldInclude(key) {
				continue
			}
			payload[key] = map[string]any{
				"value":      val.Value,
				"provenance": val.Provenance,
			}
		}
		return map[string]any{"values": payload}, nil
	})
	a.dashboard.AddInstance("admin.dashboard.sidebar", "admin.widget.settings_overview", map[string]any{
		"keys": []string{"admin.title", "admin.default_locale"},
	})
}

func (a *Admin) registerNotificationsRoute() {
	if a.router == nil || a.notifications == nil || !a.config.EnableNotifications {
		return
	}
	base := joinPath(a.config.BasePath, "api/notifications")
	a.router.Get(base, func(c router.Context) error {
		items, err := a.notifications.List(c.Context())
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"notifications": items})
	})
	a.router.Post(joinPath(base, "read"), func(c router.Context) error {
		payload, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		rawIDs, ok := payload["ids"].([]any)
		if !ok {
			return writeError(c, errors.New("ids must be array"))
		}
		read := true
		if r, ok := payload["read"].(bool); ok {
			read = r
		}
		ids := []string{}
		for _, v := range rawIDs {
			if s, ok := v.(string); ok {
				ids = append(ids, s)
			}
		}
		if err := a.notifications.Mark(c.Context(), ids, read); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]string{"status": "ok"})
	})
}

func (a *Admin) registerActivityWidget() {
	if a.dashboard == nil || a.activity == nil {
		return
	}
	a.dashboard.RegisterProvider("admin.widget.activity_feed", func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
		limit := 5
		if raw, ok := cfg["limit"].(int); ok && raw > 0 {
			limit = raw
		} else if rawf, ok := cfg["limit"].(float64); ok && rawf > 0 {
			limit = int(rawf)
		}
		entries, err := a.activity.List(ctx.Context, limit)
		if err != nil {
			return nil, err
		}
		return map[string]any{"entries": entries}, nil
	})
	a.dashboard.AddInstance("admin.dashboard.main", "admin.widget.activity_feed", map[string]any{"limit": 5})
}

func (a *Admin) registerActivityRoute() {
	if a.router == nil || a.activity == nil {
		return
	}
	path := joinPath(a.config.BasePath, "api/activity")
	a.router.Get(path, func(c router.Context) error {
		limit := atoiDefault(c.Query("limit"), 10)
		entries, err := a.activity.List(c.Context(), limit)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"entries": entries})
	})
}

func (a *Admin) registerJobsRoute() {
	if a.router == nil || a.jobs == nil || !a.config.EnableJobs {
		return
	}
	path := joinPath(a.config.BasePath, "api/jobs")
	a.router.Get(path, func(c router.Context) error {
		return writeJSON(c, map[string]any{"jobs": a.jobs.List()})
	})
	a.router.Post(joinPath(path, "trigger"), func(c router.Context) error {
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		name, _ := body["name"].(string)
		if name == "" {
			return writeError(c, errors.New("name required"))
		}
		if err := a.jobs.Trigger(c.Context(), name); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]string{"status": "ok"})
	})
}

func (a *Admin) registerSettingsRoutes() {
	if a.router == nil || a.settings == nil || !a.config.EnableSettings {
		return
	}
	base := joinPath(a.config.BasePath, "api/settings")

	a.router.Get(base, func(c router.Context) error {
		ctx := a.withTheme(newAdminContextFromRouter(c, a.config.DefaultLocale))
		if err := a.requirePermission(ctx, a.config.SettingsPermission, "settings"); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{
			"values": a.settings.ResolveAll(ctx.UserID),
		})
	})

	a.router.Get(joinPath(a.config.BasePath, "api/settings/form"), func(c router.Context) error {
		ctx := newAdminContextFromRouter(c, a.config.DefaultLocale)
		ctx = a.withTheme(ctx)
		if err := a.requirePermission(ctx, a.config.SettingsPermission, "settings"); err != nil {
			return writeError(c, err)
		}
		form := a.settingsForm.FormWithContext(c.Context(), ctx.UserID)
		return writeJSON(c, form)
	})

	a.router.Post(base, func(c router.Context) error {
		ctx := a.withTheme(newAdminContextFromRouter(c, a.config.DefaultLocale))
		if err := a.requirePermission(ctx, a.config.SettingsUpdatePermission, "settings"); err != nil {
			return writeError(c, err)
		}
		payload, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		valuesRaw, ok := payload["values"].(map[string]any)
		if !ok {
			return writeError(c, errors.New("values must be an object"))
		}
		scope := SettingsScopeSite
		if s, ok := payload["scope"].(string); ok && s != "" {
			scope = SettingsScope(s)
		}
		bundle := SettingsBundle{
			Scope:  scope,
			UserID: ctx.UserID,
			Values: valuesRaw,
		}
		cmdCtx := WithSettingsBundle(ctx.Context, bundle)
		if err := a.commandRegistry.Dispatch(cmdCtx, settingsUpdateCommandName); err != nil {
			var validation SettingsValidationErrors
			if errors.As(err, &validation) {
				c.Status(400)
				return c.JSON(400, map[string]any{
					"error":  "validation failed",
					"fields": validation.Fields,
				})
			}
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{
			"status": "ok",
			"values": a.settings.ResolveAll(ctx.UserID),
		})
	})
}

func (a *Admin) requirePermission(ctx AdminContext, permission string, resource string) error {
	if permission == "" || a.authorizer == nil {
		return nil
	}
	if !a.authorizer.Can(ctx.Context, permission, resource) {
		return ErrForbidden
	}
	return nil
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
	if a.config.EnableSettings {
		definitions = append(definitions, WidgetDefinition{
			Code: "admin.widget.settings_overview",
			Name: "Settings Overview",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"keys": map[string]any{
						"type":  "array",
						"items": map[string]any{"type": "string"},
					},
				},
			},
		})
		definitions = append(definitions, WidgetDefinition{
			Code: "admin.widget.activity_feed",
			Name: "Activity Feed",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"limit": map[string]any{"type": "integer", "default": 5},
				},
			},
		})
	}
	for _, def := range definitions {
		if err := a.widgetSvc.RegisterDefinition(ctx, def); err != nil {
			return err
		}
	}
	return nil
}

func (a *Admin) bootstrapSettingsDefaults(ctx context.Context) error {
	if a.settings == nil {
		return nil
	}
	definitions := []SettingDefinition{
		{Key: "admin.title", Title: "Admin Title", Description: "Displayed in headers", Default: a.config.Title, Type: "string", Group: "admin"},
		{Key: "admin.default_locale", Title: "Default Locale", Description: "Locale fallback for navigation and CMS content", Default: a.config.DefaultLocale, Type: "string", Group: "admin"},
		{Key: "admin.theme", Title: "Theme", Description: "Theme selection for admin UI", Default: a.config.Theme, Type: "string", Group: "appearance"},
		{Key: "admin.dashboard_enabled", Title: "Dashboard Enabled", Description: "Toggle dashboard widgets", Default: a.config.EnableDashboard, Type: "boolean", Group: "features"},
		{Key: "admin.search_enabled", Title: "Search Enabled", Description: "Toggle global search", Default: a.config.EnableSearch, Type: "boolean", Group: "features"},
	}
	for _, def := range definitions {
		a.settings.RegisterDefinition(def)
	}
	systemValues := map[string]any{}
	if a.config.Title != "" {
		systemValues["admin.title"] = a.config.Title
	}
	if a.config.DefaultLocale != "" {
		systemValues["admin.default_locale"] = a.config.DefaultLocale
	}
	if a.config.Theme != "" {
		systemValues["admin.theme"] = a.config.Theme
	}
	systemValues["admin.dashboard_enabled"] = a.config.EnableDashboard
	systemValues["admin.search_enabled"] = a.config.EnableSearch

	if len(systemValues) > 0 {
		_ = a.settings.Apply(ctx, SettingsBundle{Scope: SettingsScopeSystem, Values: systemValues})
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
	}
	if a.config.EnableSettings {
		permissions := []string{}
		if a.config.SettingsPermission != "" {
			permissions = append(permissions, a.config.SettingsPermission)
		}
		items = append(items, MenuItem{
			Label:       "Settings",
			Target:      map[string]any{"type": "route", "name": "admin.settings"},
			Icon:        "settings",
			Position:    4,
			Locale:      a.config.DefaultLocale,
			Permissions: permissions,
		})
	}
	for _, item := range items {
		if err := a.menuSvc.AddMenuItem(ctx, menu.Code, item); err != nil {
			return err
		}
	}
	return nil
}
