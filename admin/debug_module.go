package admin

import (
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"

	"github.com/gofiber/fiber/v2"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	dashboardrouter "github.com/goliatone/go-dashboard/components/dashboard/gorouter"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
	"github.com/julienschmidt/httprouter"
)

const (
	debugModuleID           = "debug"
	debugWidgetAreaCode     = "admin.debug"
	debugWidgetAreaName     = "Debug Console"
	debugProviderCodePrefix = "debug."
	debugPanelDefaultSpan   = 12
)

type debugPanelMeta struct {
	Label string
	Icon  string
	Span  int
}

var debugPanelDefaults = map[string]debugPanelMeta{
	DebugPanelTemplate:    {Label: "Template Context", Span: debugPanelDefaultSpan},
	DebugPanelSession:     {Label: "Session", Span: debugPanelDefaultSpan},
	DebugPanelRequests:    {Label: "Requests", Span: debugPanelDefaultSpan},
	DebugPanelSQL:         {Label: "SQL Queries", Span: debugPanelDefaultSpan},
	DebugPanelLogs:        {Label: "Logs", Span: debugPanelDefaultSpan},
	DebugPanelConfig:      {Label: "Config", Span: debugPanelDefaultSpan},
	DebugPanelRoutes:      {Label: "Routes", Span: debugPanelDefaultSpan},
	DebugPanelCustom:      {Label: "Custom", Span: debugPanelDefaultSpan},
	DebugPanelJSErrors:    {Label: "JS Errors", Icon: "iconoir-warning-triangle", Span: debugPanelDefaultSpan},
	DebugPanelPermissions: {Label: "Permissions", Icon: "iconoir-shield-check", Span: debugPanelDefaultSpan},
}

// DebugModule registers the debug dashboard integration and menu entry.
type DebugModule struct {
	collector     *DebugCollector
	config        DebugConfig
	basePath      string
	adminBasePath string
	urls          urlkit.Resolver
	menuCode      string
	locale        string
	permission    string
	menuParent    string
	sessionStore  DebugUserSessionStore
}

// NewDebugModule constructs a debug module with the provided configuration.
func NewDebugModule(config DebugConfig) *DebugModule {
	return &DebugModule{config: config}
}

func (m *DebugModule) Manifest() ModuleManifest {
	featureKey := strings.TrimSpace(m.config.FeatureKey)
	if featureKey == "" {
		featureKey = debugDefaultFeatureKey
	}
	return ModuleManifest{
		ID:             debugModuleID,
		NameKey:        "modules.debug.name",
		DescriptionKey: "modules.debug.description",
		FeatureFlags:   []string{featureKey},
	}
}

func (m *DebugModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "debug_module"})
	}

	cfg := normalizeDebugConfig(m.config, ctx.Admin.BasePath())
	m.config = cfg
	if !debugConfigEnabled(cfg) {
		return nil
	}

	if m.basePath == "" {
		m.basePath = cfg.BasePath
	}
	if m.adminBasePath == "" {
		m.adminBasePath = ctx.Admin.BasePath()
	}
	if m.menuCode == "" {
		m.menuCode = ctx.Admin.NavMenuCode()
	}
	if m.locale == "" {
		m.locale = ctx.Admin.DefaultLocale()
	}
	if m.permission == "" {
		m.permission = cfg.Permission
	}
	if m.collector == nil {
		m.collector = NewDebugCollector(cfg)
	}
	m.collector.WithURLs(ctx.Admin.URLs())
	if m.sessionStore == nil {
		m.sessionStore = ctx.Admin.DebugUserSessions()
	}
	if m.sessionStore != nil {
		m.collector.WithSessionStore(m.sessionStore)
	}
	if m.urls == nil {
		m.urls = ctx.Admin.URLs()
	}
	ctx.Admin.debugCollector = m.collector
	m.captureConfigSnapshot(ctx.Admin)
	m.captureRoutesSnapshot(ctx.Admin)
	m.registerDashboardArea(ctx.Admin)
	m.registerDashboardProviders(ctx.Admin)
	m.registerDebugRoutes(ctx.Admin)
	m.registerDebugWebSocket(ctx.Admin)
	m.registerDebugSessionWebSocket(ctx.Admin)
	m.registerDebugREPLShellWebSocket(ctx.Admin)
	m.registerDebugREPLAppWebSocket(ctx.Admin)
	RegisterPermissionsDebugPanel(ctx.Admin)
	return nil
}

func (m *DebugModule) MenuItems(locale string) []MenuItem {
	if !debugConfigEnabled(m.config) {
		return nil
	}
	basePath := m.basePath
	if basePath == "" {
		basePath = normalizeDebugConfig(m.config, m.adminBasePath).BasePath
	}
	if m.urls != nil {
		if resolved := debugRoutePathWithBase(m.urls, basePath, "admin.debug", "index"); resolved != "" {
			basePath = resolved
		}
	}
	if locale == "" {
		locale = m.locale
	}
	permissions := []string{}
	if m.permission != "" {
		permissions = []string{m.permission}
	}
	return []MenuItem{
		{
			Label:       "Debug",
			LabelKey:    "menu.debug",
			Icon:        "bug",
			Target:      map[string]any{"type": "url", "path": basePath, "key": debugModuleID},
			Permissions: permissions,
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    primitives.Int(999),
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests the debug navigation under a parent menu item ID.
func (m *DebugModule) WithMenuParent(parent string) *DebugModule {
	m.menuParent = parent
	return m
}

func (m *DebugModule) registerDashboardArea(admin *Admin) {
	if admin == nil {
		return
	}
	admin.RegisterWidgetArea(WidgetAreaDefinition{
		Code:  debugWidgetAreaCode,
		Name:  debugWidgetAreaName,
		Scope: "admin",
	})
}

func (m *DebugModule) registerDashboardProviders(admin *Admin) {
	if admin == nil || m.collector == nil {
		return
	}
	for _, panelID := range m.config.Panels {
		panelID := panelID
		meta := debugPanelMetaFor(panelID)
		if collectorMeta, ok := m.collector.panelMeta(panelID); ok {
			if collectorMeta.Label != "" {
				meta.Label = collectorMeta.Label
			}
			if collectorMeta.Icon != "" {
				meta.Icon = collectorMeta.Icon
			}
			if collectorMeta.Span > 0 {
				meta.Span = collectorMeta.Span
			}
		}
		panelLabel := meta.Label
		panelSpan := meta.Span
		panelIcon := meta.Icon
		if panelSpan <= 0 {
			panelSpan = debugPanelDefaultSpan
		}
		admin.Dashboard().RegisterProvider(DashboardProviderSpec{
			Code:        debugProviderCodePrefix + panelID,
			Name:        panelLabel,
			DefaultArea: debugWidgetAreaCode,
			DefaultSpan: panelSpan,
			Permission:  m.permission,
			Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
				_ = ctx
				_ = cfg
				snapshot := m.collector.Snapshot()
				return map[string]any{
					"panel": panelID,
					"label": panelLabel,
					"icon":  panelIcon,
					"data":  snapshot[panelID],
				}, nil
			},
		})
	}
}

func (a *Admin) registerDebugDashboardRoutes() error {
	if a == nil || a.router == nil || a.dash == nil || a.debugCollector == nil {
		return nil
	}
	cfg := a.debugCollector.config
	if !debugConfigEnabled(cfg) {
		return nil
	}
	basePath, routes := debugDashboardRouteConfig(a, cfg)
	defaultLocale := a.config.DefaultLocale
	viewerResolver := func(c router.Context) dashcmp.ViewerContext {
		locale := strings.TrimSpace(c.Query("locale"))
		if locale == "" {
			locale = defaultLocale
		}
		adminCtx := a.adminContextFromRequest(c, locale)
		if c != nil {
			c.SetContext(adminCtx.Context)
		}
		return dashcmp.ViewerContext{
			UserID: adminCtx.UserID,
			Locale: locale,
		}
	}
	access := debugAccessMiddleware(a, cfg, cfg.Permission)
	authHandler := debugAuthHandler(a, cfg, cfg.Permission)
	registerFallback := func() error {
		debugPath := debugRoutePath(a, cfg, "admin.debug", "index")
		if debugPath == "" {
			debugPath = debugBasePath(a, cfg)
		}
		adminBase := strings.TrimSpace(adminBasePath(a.config))
		handler := func(c router.Context) error {
			viewCtx := router.ViewContext{
				"title":                   "Debug Console",
				"base_path":               adminBase,
				"debug_path":              debugPath,
				"panels":                  cfg.Panels,
				"repl_commands":           debugREPLCommandsForRequest(a, cfg, c),
				"max_log_entries":         cfg.MaxLogEntries,
				"max_sql_queries":         cfg.MaxSQLQueries,
				"slow_query_threshold_ms": cfg.SlowQueryThreshold.Milliseconds(),
			}
			viewCtx = buildDebugViewContext(a, cfg, c, viewCtx)
			return c.Render(debugPageTemplate(cfg, c), viewCtx)
		}
		if access != nil {
			a.router.Get(debugPath, handler, access)
		} else {
			a.router.Get(debugPath, handler)
		}
		return nil
	}
	if _, ok := a.router.(router.Router[*fiber.App]); ok {
		if err := registerFallback(); err != nil {
			return err
		}
		return nil
	}
	captureRoutesSnapshotForCollector(a.debugCollector, a.router)
	controller := a.dash.controller
	if cfg.DashboardTemplate != "" && cfg.DashboardTemplate != debugDefaultDashboardTemplate && a.dash.service != nil {
		controller = dashcmp.NewController(dashcmp.ControllerOptions{
			Service:  a.dash.service,
			Renderer: a.dashboardRenderer(),
			Template: cfg.DashboardTemplate,
		})
	}
	registered, err := registerDashboardRoutesByRouterType(a.router, dashboardRouteRegistrars{
		HTTP: func(rt router.Router[*httprouter.Router]) error {
			group := rt.Group(basePath)
			if access != nil {
				group.Use(access)
			}
			if err := dashboardrouter.Register(dashboardrouter.Config[*httprouter.Router]{
				Router:         group,
				Controller:     controller,
				API:            a.dash.executor,
				Broadcast:      nil,
				ViewerResolver: viewerResolver,
				BasePath:       "/",
				Routes:         routes,
			}); err != nil {
				return err
			}
			registerDebugDashboardWebSocket(group, routes.WebSocket, a.dash.broadcast, authHandler)
			return nil
		},
	})
	if err != nil {
		return err
	}
	if registered {
		return nil
	}
	if err := registerFallback(); err != nil {
		return err
	}
	return nil
}

func debugDashboardRouteConfig(admin *Admin, cfg DebugConfig) (string, dashboardrouter.RouteConfig) {
	if admin == nil {
		return "", dashboardrouter.RouteConfig{}
	}
	adminBase := strings.TrimSpace(adminBasePath(admin.config))
	debugBase := strings.TrimSpace(debugBasePath(admin, cfg))
	if debugBase == "" {
		debugBase = strings.TrimSpace(debugRoutePath(admin, cfg, "admin.debug", "index"))
	}

	basePath := adminBase
	relative := false
	if adminBase != "" {
		if debugBase == adminBase {
			relative = true
		} else if strings.HasPrefix(debugBase, adminBase+"/") {
			relative = true
		}
	}
	if !relative {
		basePath = debugBase
	}

	htmlPath := debugRoutePath(admin, cfg, "admin.debug", "index")
	layoutPath := debugAPIRoutePath(admin, cfg, "dashboard")
	widgetsPath := debugAPIRoutePath(admin, cfg, "dashboard.widgets")
	widgetIDPath := debugAPIRoutePath(admin, cfg, "dashboard.widget")
	reorderPath := debugAPIRoutePath(admin, cfg, "dashboard.widgets.reorder")
	refreshPath := debugAPIRoutePath(admin, cfg, "dashboard.widgets.refresh")
	prefsPath := debugAPIRoutePath(admin, cfg, "dashboard.preferences")
	wsPath := debugAPIRoutePath(admin, cfg, "dashboard.ws")

	return basePath, dashboardrouter.RouteConfig{
		HTML:        relativeRoutePath(basePath, htmlPath),
		Layout:      relativeRoutePath(basePath, layoutPath),
		Widgets:     relativeRoutePath(basePath, widgetsPath),
		WidgetID:    relativeRoutePath(basePath, widgetIDPath),
		Reorder:     relativeRoutePath(basePath, reorderPath),
		Refresh:     relativeRoutePath(basePath, refreshPath),
		Preferences: relativeRoutePath(basePath, prefsPath),
		WebSocket:   relativeRoutePath(basePath, wsPath),
	}
}

func relativeRoutePath(basePath, fullPath string) string {
	fullPath = strings.TrimSpace(fullPath)
	if fullPath == "" {
		return ""
	}
	basePath = normalizeBasePath(basePath)
	fullPath = ensureLeadingSlashPath(fullPath)
	if basePath == "" || basePath == "/" {
		return fullPath
	}
	if fullPath == basePath {
		return "/"
	}
	if strings.HasPrefix(fullPath, basePath+"/") {
		return strings.TrimPrefix(fullPath, basePath)
	}
	return fullPath
}

func debugPanelMetaFor(panelID string) debugPanelMeta {
	normalized := normalizePanelID(panelID)
	if meta, ok := debugPanelDefaults[normalized]; ok {
		if meta.Span <= 0 {
			meta.Span = debugPanelDefaultSpan
		}
		return meta
	}
	return debugPanelMeta{
		Label: debugPanelLabel(panelID),
		Span:  debugPanelDefaultSpan,
	}
}

func debugPanelLabel(panelID string) string {
	trimmed := strings.TrimSpace(panelID)
	if trimmed == "" {
		return ""
	}
	replacer := strings.NewReplacer("-", " ", "_", " ", ".", " ", "/", " ")
	parts := strings.Fields(replacer.Replace(trimmed))
	for i, part := range parts {
		lower := strings.ToLower(part)
		switch lower {
		case "sql":
			parts[i] = "SQL"
		case "id":
			parts[i] = "ID"
		default:
			parts[i] = titleCase(lower)
		}
	}
	if len(parts) == 0 {
		return titleCase(trimmed)
	}
	return strings.Join(parts, " ")
}
