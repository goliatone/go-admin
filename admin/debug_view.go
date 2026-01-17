package admin

import (
	"context"
	"strings"

	router "github.com/goliatone/go-router"
)

const (
	debugLayoutQueryParam      = "debug_layout"
	debugLayoutStandaloneValue = "standalone"
)

func debugStandalonePath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	sep := "?"
	if strings.Contains(path, "?") {
		sep = "&"
	}
	return path + sep + debugLayoutQueryParam + "=" + debugLayoutStandaloneValue
}

func debugPageTemplate(cfg DebugConfig, c router.Context) string {
	template := strings.TrimSpace(cfg.PageTemplate)
	if template == "" {
		template = debugDefaultPageTemplate
	}
	if cfg.LayoutMode != DebugLayoutAdmin || c == nil {
		return template
	}
	if strings.EqualFold(strings.TrimSpace(c.Query(debugLayoutQueryParam)), debugLayoutStandaloneValue) {
		standalone := strings.TrimSpace(cfg.StandaloneTemplate)
		if standalone == "" {
			standalone = debugDefaultPageTemplate
		}
		return standalone
	}
	return template
}

func buildDebugViewContext(adm *Admin, cfg DebugConfig, c router.Context, view router.ViewContext) router.ViewContext {
	if view == nil {
		view = router.ViewContext{}
	}
	if cfg.ViewContextBuilder != nil {
		view = cfg.ViewContextBuilder(adm, cfg, c, view)
		if view == nil {
			view = router.ViewContext{}
		}
	}
	view["layout_mode"] = string(cfg.LayoutMode)
	if cfg.LayoutMode != DebugLayoutAdmin {
		return view
	}
	if _, ok := view["nav_items"]; !ok {
		view["nav_items"] = []map[string]any{}
	}
	if _, ok := view["session_user"]; !ok {
		view["session_user"] = map[string]any{
			"display_name": "Guest",
			"initial":      "?",
		}
	}
	if _, ok := view["theme"]; !ok && adm != nil {
		ctx := context.Background()
		if c != nil && c.Context() != nil {
			ctx = c.Context()
		}
		view["theme"] = adm.themePayload(ctx)
	}
	if _, ok := view["base_path"]; !ok && adm != nil {
		view["base_path"] = adm.config.BasePath
	}
	if _, ok := view["debug_standalone_path"]; !ok {
		if debugPath, ok := view["debug_path"].(string); ok && debugPath != "" {
			view["debug_standalone_path"] = debugStandalonePath(debugPath)
		}
	}
	if _, ok := view["debug_admin_path"]; !ok {
		if debugPath, ok := view["debug_path"].(string); ok && debugPath != "" {
			view["debug_admin_path"] = debugPath
		}
	}
	if cfg.ToolbarMode && c != nil && debugToolbarExcluded(cfg, c.Path()) {
		view["debug_toolbar_enabled"] = false
	}
	// Hide content header for admin layout since the iframe provides its own UI
	view["hide_content_header"] = true
	return view
}
