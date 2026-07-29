package admin

import (
	"context"
	"strings"

	router "github.com/goliatone/go-router"
)

// buildAdminLayoutViewContext injects common layout context used by admin templates.
// It is shared by module-owned pages that render layout.html directly.
func buildAdminLayoutViewContext(adm *Admin, c router.Context, view router.ViewContext, active string) router.ViewContext {
	if view == nil {
		view = router.ViewContext{}
	}
	basePath := resolveAdminLayoutBasePath(adm, view)
	applyAdminLayoutPathDefaults(view, basePath)
	applyAdminLayoutStringDefault(view, "active", strings.TrimSpace(active))
	applyAdminLayoutAPIBasePath(adm, view)
	applyAdminLayoutNavigationDefaults(adm, c, view, basePath)
	applyAdminLayoutThemeDefault(adm, c, view)
	applyAdminLayoutTranslationDefaults(adm, c, view)
	applyAdminLayoutUserImportDefaults(adm, c, view)
	return view
}

func resolveAdminLayoutBasePath(adm *Admin, view router.ViewContext) string {
	basePath := strings.TrimSpace(toString(view["base_path"]))
	if basePath == "" && adm != nil {
		basePath = strings.TrimSpace(adm.config.BasePath)
	}
	return basePath
}

func applyAdminLayoutPathDefaults(view router.ViewContext, basePath string) {
	applyAdminLayoutStringDefault(view, "base_path", basePath)
	applyAdminLayoutStringDefault(view, "asset_base_path", basePath)
}

func applyAdminLayoutStringDefault(view router.ViewContext, key, value string) {
	if _, ok := view[key]; ok || value == "" {
		return
	}
	view[key] = value
}

func applyAdminLayoutAPIBasePath(adm *Admin, view router.ViewContext) {
	if adm == nil {
		return
	}
	applyAdminLayoutStringDefault(view, "api_base_path", strings.TrimSpace(adminAPIBasePath(adm)))
}

func applyAdminLayoutNavigationDefaults(adm *Admin, c router.Context, view router.ViewContext, basePath string) {
	if _, ok := view["nav_items"]; !ok {
		view["nav_items"] = debugViewNavItems(adm, c, basePath)
	}
	if _, ok := view["nav_utility_items"]; !ok {
		view["nav_utility_items"] = debugViewUtilityNavItems(adm, c, basePath)
	}
	if _, ok := view["session_user"]; !ok {
		sessionUser := debugViewSessionUser(c, basePath)
		if adm != nil && adm.config.SidebarUseInitialsAvatar {
			sessionUser["avatar_url"] = ""
		}
		view["session_user"] = sessionUser
	}
	if _, ok := view["sidebar_hide_search"]; !ok && adm != nil {
		view["sidebar_hide_search"] = adm.config.SidebarHideSearch
	}
	if adm != nil {
		applyAdminSidebarCompositionDefaults(view, adm.config)
	}
	if _, ok := view["external_assets"]; !ok && adm != nil {
		resolved := adm.config.ExternalAssets.Resolve()
		view["external_assets"] = map[string]string{
			"iconoir_css":    resolved.IconoirCSS,
			"datatables_css": resolved.DataTablesCSS,
			"echarts_js":     resolved.EChartsJS,
		}
	}
}

func applyAdminSidebarCompositionDefaults(view router.ViewContext, cfg Config) {
	if _, ok := view["sidebar_collapse_placement"]; !ok {
		view["sidebar_collapse_placement"] = string(NormalizeSidebarCollapsePlacement(cfg.SidebarCollapsePlacement))
	}
	if _, ok := view["sidebar_compact_footer"]; !ok {
		view["sidebar_compact_footer"] = cfg.SidebarCompactFooter
	}
	if _, ok := view["sidebar_hide_presence"]; !ok {
		view["sidebar_hide_presence"] = cfg.SidebarHidePresence
	}
	if _, ok := view["sidebar_hide_user_menu_indicator"]; !ok {
		view["sidebar_hide_user_menu_indicator"] = cfg.SidebarHideUserMenuIndicator
	}
}

func applyAdminLayoutThemeDefault(adm *Admin, c router.Context, view router.ViewContext) {
	if _, ok := view["theme"]; !ok && adm != nil {
		view["theme"] = adm.themePayload(adminLayoutRequestContext(c))
	}
}

func applyAdminLayoutTranslationDefaults(adm *Admin, c router.Context, view router.ViewContext) {
	if _, ok := view["translation_capabilities"]; !ok {
		view["translation_capabilities"] = TranslationCapabilitiesForContext(adm, adminLayoutRequestContext(c))
	}
}

func applyAdminLayoutUserImportDefaults(adm *Admin, c router.Context, view router.ViewContext) {
	if _, ok := view["users_import_available"]; !ok {
		view["users_import_available"] = adm != nil && adm.UserImportEnabled()
	}
	if _, ok := view["users_import_enabled"]; !ok {
		view["users_import_enabled"] = adm != nil && adm.UserImportAllowed(adminLayoutRequestContext(c))
	}
}

func adminLayoutRequestContext(c router.Context) context.Context {
	if c != nil && c.Context() != nil {
		return c.Context()
	}
	return context.Background()
}
