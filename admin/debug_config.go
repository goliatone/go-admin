package admin

import (
	"strings"
	"time"

	router "github.com/goliatone/go-router"
)

const (
	debugDefaultFeatureKey         = "debug"
	debugDefaultPermission         = "admin.debug.view"
	debugDefaultPathSuffix         = "debug"
	debugDefaultPageTemplate       = "resources/debug/index"
	debugDefaultAdminPageTemplate  = "resources/debug/index_admin"
	debugDefaultDashboardTemplate  = "dashboard_ssr.html"
	debugDefaultMaxLogEntries      = 500
	debugDefaultMaxSQLQueries      = 200
	debugDefaultSlowQueryThreshold = 50 * time.Millisecond
)

const (
	DebugPanelTemplate = "template"
	DebugPanelSession  = "session"
	DebugPanelRequests = "requests"
	DebugPanelSQL      = "sql"
	DebugPanelLogs     = "logs"
	DebugPanelConfig   = "config"
	DebugPanelRoutes   = "routes"
	DebugPanelCustom   = "custom"
	DebugPanelShell    = "shell"
	DebugPanelConsole  = "console"
)

// DebugLayoutMode controls how the debug UI is rendered.
type DebugLayoutMode string

const (
	DebugLayoutStandalone DebugLayoutMode = "standalone"
	DebugLayoutAdmin      DebugLayoutMode = "admin"
)

// DebugViewContextBuilder can augment the view context for debug templates.
type DebugViewContextBuilder func(adm *Admin, cfg DebugConfig, c router.Context, view router.ViewContext) router.ViewContext

var defaultDebugPanels = []string{
	DebugPanelTemplate,
	DebugPanelSession,
	DebugPanelRequests,
	DebugPanelSQL,
	DebugPanelLogs,
	DebugPanelConfig,
	DebugPanelRoutes,
	DebugPanelCustom,
}

var defaultToolbarPanels = []string{
	DebugPanelRequests,
	DebugPanelSQL,
	DebugPanelLogs,
	DebugPanelRoutes,
	DebugPanelConfig,
}

// DebugConfig controls the debug module behavior and feature flags.
type DebugConfig struct {
	Enabled            bool
	CaptureSQL         bool
	CaptureLogs        bool
	CaptureRequestBody bool
	StrictQueryHooks   bool
	MaxLogEntries      int
	MaxSQLQueries      int
	MaskFieldTypes     map[string]string
	MaskPlaceholder    string
	Panels             []string
	FeatureKey         string
	Permission         string
	BasePath           string
	// LayoutMode controls which debug template is rendered for the HTML route.
	LayoutMode DebugLayoutMode
	// PageTemplate is the primary debug template used for HTML rendering.
	PageTemplate string
	// StandaloneTemplate is used when forcing a standalone render via query param.
	StandaloneTemplate string
	// DashboardTemplate overrides the go-dashboard HTML template for debug routes.
	DashboardTemplate string
	// ViewContextBuilder can inject navigation/session data for admin-layout templates.
	ViewContextBuilder DebugViewContextBuilder
	SlowQueryThreshold time.Duration
	AllowedIPs         []string
	PersistLayout      bool
	Repl               DebugREPLConfig
	// ToolbarMode injects a debug toolbar at the bottom of all admin pages.
	// When true, the toolbar is shown in addition to the /admin/debug page.
	ToolbarMode bool
	// ToolbarPanels specifies which panels appear in the toolbar.
	// Defaults to ["requests", "sql", "logs", "routes", "config"] if empty.
	ToolbarPanels []string
	// ToolbarExcludePaths disables the toolbar on matching paths.
	// Use exact paths ("/admin/debug") or prefix wildcards ("/admin/debug/*").
	ToolbarExcludePaths []string
}

func normalizeDebugConfig(cfg DebugConfig, basePath string) DebugConfig {
	layoutMode := DebugLayoutMode(strings.ToLower(strings.TrimSpace(string(cfg.LayoutMode))))
	switch layoutMode {
	case DebugLayoutAdmin, DebugLayoutStandalone:
	default:
		layoutMode = DebugLayoutStandalone
	}
	cfg.LayoutMode = layoutMode
	cfg.FeatureKey = strings.TrimSpace(cfg.FeatureKey)
	if cfg.FeatureKey == "" {
		cfg.FeatureKey = debugDefaultFeatureKey
	}
	cfg.Permission = strings.TrimSpace(cfg.Permission)
	if cfg.Permission == "" {
		cfg.Permission = debugDefaultPermission
	}
	cfg.BasePath = strings.TrimSpace(cfg.BasePath)
	if cfg.BasePath == "" {
		cfg.BasePath = joinPath(basePath, debugDefaultPathSuffix)
	}
	cfg.StandaloneTemplate = strings.TrimSpace(cfg.StandaloneTemplate)
	if cfg.StandaloneTemplate == "" {
		cfg.StandaloneTemplate = debugDefaultPageTemplate
	}
	cfg.PageTemplate = strings.TrimSpace(cfg.PageTemplate)
	if cfg.PageTemplate == "" {
		if cfg.LayoutMode == DebugLayoutAdmin {
			cfg.PageTemplate = debugDefaultAdminPageTemplate
		} else {
			cfg.PageTemplate = cfg.StandaloneTemplate
		}
	}
	cfg.DashboardTemplate = strings.TrimSpace(cfg.DashboardTemplate)
	if cfg.DashboardTemplate == "" {
		cfg.DashboardTemplate = debugDefaultDashboardTemplate
	}
	if cfg.MaxLogEntries <= 0 {
		cfg.MaxLogEntries = debugDefaultMaxLogEntries
	}
	if cfg.MaxSQLQueries <= 0 {
		cfg.MaxSQLQueries = debugDefaultMaxSQLQueries
	}
	if cfg.SlowQueryThreshold <= 0 {
		cfg.SlowQueryThreshold = debugDefaultSlowQueryThreshold
	}
	if cfg.Panels == nil {
		cfg.Panels = append([]string{}, defaultDebugPanels...)
	}
	cfg.Panels = normalizePanelIDs(cfg.Panels)
	cfg.MaskFieldTypes = normalizeMaskFieldTypes(cfg.MaskFieldTypes)
	cfg.MaskPlaceholder = strings.TrimSpace(cfg.MaskPlaceholder)
	if cfg.MaskPlaceholder == "" {
		cfg.MaskPlaceholder = "***"
	}
	cfg.Repl = normalizeDebugREPLConfig(cfg.Repl)
	if cfg.ToolbarMode && len(cfg.ToolbarPanels) == 0 {
		cfg.ToolbarPanels = append([]string{}, defaultToolbarPanels...)
	}
	cfg.ToolbarPanels = normalizePanelIDs(cfg.ToolbarPanels)
	cfg.ToolbarExcludePaths = normalizeDebugToolbarExcludePaths(cfg.ToolbarExcludePaths, cfg.BasePath)
	return cfg
}

func normalizeDebugToolbarExcludePaths(paths []string, debugBasePath string) []string {
	if paths == nil {
		if strings.TrimSpace(debugBasePath) == "" {
			return nil
		}
		return []string{strings.TrimSpace(debugBasePath)}
	}
	out := make([]string, 0, len(paths))
	for _, path := range paths {
		path = strings.TrimSpace(path)
		if path == "" {
			continue
		}
		out = append(out, path)
	}
	if strings.TrimSpace(debugBasePath) != "" && !debugToolbarPathListed(out, debugBasePath) {
		out = append(out, strings.TrimSpace(debugBasePath))
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func debugConfigEnabled(cfg DebugConfig) bool {
	return cfg.Enabled && len(cfg.Panels) > 0
}

func normalizePanelID(panel string) string {
	return strings.ToLower(strings.TrimSpace(panel))
}

func normalizePanelIDs(panels []string) []string {
	if len(panels) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(panels))
	for _, panel := range panels {
		normalized := normalizePanelID(panel)
		if normalized == "" || seen[normalized] {
			continue
		}
		seen[normalized] = true
		out = append(out, normalized)
	}
	return out
}

func normalizeMaskFieldTypes(fields map[string]string) map[string]string {
	if len(fields) == 0 {
		return nil
	}
	out := make(map[string]string, len(fields))
	for field, maskType := range fields {
		field = strings.TrimSpace(field)
		if field == "" {
			continue
		}
		out[field] = strings.TrimSpace(maskType)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
