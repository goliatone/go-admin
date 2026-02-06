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
	debugDefaultSessionCookieName  = "admin_debug_session"
	debugDefaultSessionInactivity  = 30 * time.Minute
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
	DebugPanelJSErrors = "jserrors"
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
	DebugPanelJSErrors,
}

var defaultToolbarPanels = []string{
	DebugPanelRequests,
	DebugPanelSQL,
	DebugPanelLogs,
	DebugPanelJSErrors,
	DebugPanelRoutes,
	DebugPanelConfig,
}

// DefaultDebugPanels returns the default debug panel IDs.
func DefaultDebugPanels() []string {
	return append([]string{}, defaultDebugPanels...)
}

// DefaultDebugToolbarPanels returns the default toolbar panel IDs.
func DefaultDebugToolbarPanels() []string {
	return append([]string{}, defaultToolbarPanels...)
}

// DebugConfig controls the debug module behavior and feature flags.
type DebugConfig struct {
	Enabled            bool
	CaptureSQL         bool
	CaptureLogs        bool
	CaptureRequestBody bool
	// CaptureJSErrors enables the global JS error collector on all pages.
	// When true, an inline script is injected into every page <head> that
	// captures uncaught exceptions, unhandled rejections, and console.error
	// calls, then reports them to the debug backend. This flag is independent
	// of ToolbarMode — the collector works in production without the toolbar.
	CaptureJSErrors  bool
	StrictQueryHooks bool
	MaxLogEntries    int
	MaxSQLQueries    int
	MaskFieldTypes   map[string]string
	MaskPlaceholder  string
	Panels           []string
	FeatureKey       string
	Permission       string
	BasePath         string
	// AppID identifies the running application instance for remote debug clients.
	AppID string
	// AppName is a human-friendly application name for remote debug clients.
	AppName string
	// Environment labels the current deployment (e.g., "staging", "prod").
	Environment string
	// RemoteEnabled toggles the remote debug identity/token endpoints.
	RemoteEnabled bool
	// TokenTTL overrides the default TTL for debug exchange tokens.
	TokenTTL time.Duration
	// AllowedOrigins restricts remote debug origins (identity/token/ws).
	AllowedOrigins []string
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
	// SessionTracking enables debug session tracking with optional cookie fallback.
	SessionTracking bool
	// SessionIncludeGlobalPanels controls whether global panels are included in session views.
	SessionIncludeGlobalPanels *bool
	// SessionCookieName controls the debug session cookie name.
	SessionCookieName string
	// SessionInactivityExpiry controls the TTL for session cookies and session registry expiry.
	SessionInactivityExpiry time.Duration
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
	cfg.AppID = strings.TrimSpace(cfg.AppID)
	cfg.AppName = strings.TrimSpace(cfg.AppName)
	cfg.Environment = strings.TrimSpace(cfg.Environment)
	cfg.AllowedOrigins = normalizeDebugOrigins(cfg.AllowedOrigins)
	if cfg.BasePath == "" {
		cfg.BasePath = joinBasePath(basePath, debugDefaultPathSuffix)
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
	cfg.SessionCookieName = strings.TrimSpace(cfg.SessionCookieName)
	if cfg.SessionCookieName == "" {
		cfg.SessionCookieName = debugDefaultSessionCookieName
	}
	if cfg.SessionInactivityExpiry <= 0 {
		cfg.SessionInactivityExpiry = debugDefaultSessionInactivity
	}
	if cfg.SessionIncludeGlobalPanels == nil {
		cfg.SessionIncludeGlobalPanels = BoolPtr(true)
	}
	return cfg
}

// SessionIncludeGlobalPanelsEnabled returns the effective session global panel toggle.
func (cfg DebugConfig) SessionIncludeGlobalPanelsEnabled() bool {
	if cfg.SessionIncludeGlobalPanels == nil {
		return true
	}
	return *cfg.SessionIncludeGlobalPanels
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

func normalizeDebugOrigins(origins []string) []string {
	if len(origins) == 0 {
		return nil
	}
	out := make([]string, 0, len(origins))
	for _, origin := range origins {
		if trimmed := strings.TrimSpace(origin); trimmed != "" {
			out = append(out, trimmed)
		}
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
