package admin

import (
	"errors"
	"fmt"
	"strings"

	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	dashboardrouter "github.com/goliatone/go-dashboard/components/dashboard/gorouter"
	router "github.com/goliatone/go-router"
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
	Span  int
}

var debugPanelDefaults = map[string]debugPanelMeta{
	"template": {Label: "Template Context", Span: debugPanelDefaultSpan},
	"session":  {Label: "Session", Span: debugPanelDefaultSpan},
	"requests": {Label: "Requests", Span: debugPanelDefaultSpan},
	"sql":      {Label: "SQL Queries", Span: debugPanelDefaultSpan},
	"logs":     {Label: "Logs", Span: debugPanelDefaultSpan},
	"config":   {Label: "Config", Span: debugPanelDefaultSpan},
	"routes":   {Label: "Routes", Span: debugPanelDefaultSpan},
	"custom":   {Label: "Custom", Span: debugPanelDefaultSpan},
}

// DebugModule registers the debug dashboard integration and menu entry.
type DebugModule struct {
	collector     *DebugCollector
	config        DebugConfig
	basePath      string
	adminBasePath string
	menuCode      string
	locale        string
	permission    string
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
		return errors.New("admin is nil")
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
	ctx.Admin.debugCollector = m.collector
	m.captureConfigSnapshot(ctx.Admin)
	m.captureRoutesSnapshot(ctx.Admin)
	m.registerDashboardArea(ctx.Admin)
	m.registerDashboardProviders(ctx.Admin)
	m.registerDebugRoutes(ctx.Admin)
	m.registerDebugWebSocket(ctx.Admin)
	return nil
}

func (m *DebugModule) MenuItems(locale string) []MenuItem {
	if !debugConfigEnabled(m.config) {
		return nil
	}
	basePath := m.basePath
	if basePath == "" {
		basePath = normalizeDebugConfig(m.config, "").BasePath
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
			Position:    intPtr(999),
		},
	}
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
		label := meta.Label
		span := meta.Span
		if span <= 0 {
			span = debugPanelDefaultSpan
		}
		admin.Dashboard().RegisterProvider(DashboardProviderSpec{
			Code:        debugProviderCodePrefix + panelID,
			Name:        label,
			DefaultArea: debugWidgetAreaCode,
			DefaultSpan: span,
			Permission:  m.permission,
			Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
				_ = ctx
				_ = cfg
				snapshot := m.collector.Snapshot()
				return map[string]any{
					"panel": panelID,
					"label": label,
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
	captureRoutesSnapshotForCollector(a.debugCollector, a.router)
	basePath, routes := debugDashboardRouteConfig(a.config.BasePath, cfg.BasePath)
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
	if rt, ok := a.router.(router.Router[router.Context]); ok {
		group := rt.Group(basePath)
		if access != nil {
			group.Use(access)
		}
		if err := dashboardrouter.Register(dashboardrouter.Config[router.Context]{
			Router:         group,
			Controller:     a.dash.controller,
			API:            a.dash.executor,
			Broadcast:      nil,
			ViewerResolver: viewerResolver,
			BasePath:       "/",
			Routes:         routes,
		}); err == nil {
			registerDebugDashboardWebSocket(group, routes.WebSocket, a.dash.broadcast, authHandler)
			return nil
		}
	}
	if rt, ok := a.router.(router.Router[*httprouter.Router]); ok {
		group := rt.Group(basePath)
		if access != nil {
			group.Use(access)
		}
		if err := dashboardrouter.Register(dashboardrouter.Config[*httprouter.Router]{
			Router:         group,
			Controller:     a.dash.controller,
			API:            a.dash.executor,
			Broadcast:      nil,
			ViewerResolver: viewerResolver,
			BasePath:       "/",
			Routes:         routes,
		}); err == nil {
			registerDebugDashboardWebSocket(group, routes.WebSocket, a.dash.broadcast, authHandler)
			return nil
		}
	}
	return fmt.Errorf("router does not support go-dashboard routes")
}

func debugDashboardRouteConfig(adminBasePath, debugBasePath string) (string, dashboardrouter.RouteConfig) {
	adminBasePath = strings.TrimSpace(adminBasePath)
	debugBasePath = strings.TrimSpace(debugBasePath)
	if debugBasePath == "" {
		debugBasePath = joinPath(adminBasePath, debugDefaultPathSuffix)
	}

	basePath := adminBasePath
	routePrefix := ""
	relative := false
	if adminBasePath != "" {
		if debugBasePath == adminBasePath {
			routePrefix = "/"
			relative = true
		} else if strings.HasPrefix(debugBasePath, adminBasePath+"/") {
			routePrefix = strings.TrimPrefix(debugBasePath, adminBasePath)
			relative = true
		}
	}
	if !relative {
		basePath = debugBasePath
		routePrefix = "/"
	}
	if !strings.HasPrefix(routePrefix, "/") {
		routePrefix = "/" + routePrefix
	}

	return basePath, dashboardrouter.RouteConfig{
		HTML:        joinPath(routePrefix, "dashboard"),
		Layout:      joinPath(routePrefix, "api/dashboard"),
		Widgets:     joinPath(routePrefix, "api/dashboard/widgets"),
		WidgetID:    joinPath(routePrefix, "api/dashboard/widgets/:id"),
		Reorder:     joinPath(routePrefix, "api/dashboard/widgets/reorder"),
		Refresh:     joinPath(routePrefix, "api/dashboard/widgets/refresh"),
		Preferences: joinPath(routePrefix, "api/dashboard/preferences"),
		WebSocket:   joinPath(routePrefix, "api/dashboard/ws"),
	}
}

func debugPanelMetaFor(panelID string) debugPanelMeta {
	normalized := strings.ToLower(strings.TrimSpace(panelID))
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
