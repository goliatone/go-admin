package site

import router "github.com/goliatone/go-router"

func resolveNavigationContext(r *navigationRuntime, c router.Context, state RequestState, activePath string) map[string]any {
	if r == nil {
		return emptyNavigationContext(activePath)
	}

	opts := r.resolveReadOptions(c, state)
	activePath = normalizeLocalePath(activePath)
	debugMode := navigationDebugEnabled(c)

	main := r.resolveMenuForLocation(RequestContext(c), state, r.siteCfg.Navigation.MainMenuLocation, activePath, opts, debugMode)
	footer := r.resolveMenuForLocation(RequestContext(c), state, r.siteCfg.Navigation.FooterMenuLocation, activePath, opts, debugMode)

	return navigationContextPayload(r, activePath, debugMode, main, footer)
}

func emptyNavigationContext(activePath string) map[string]any {
	activePath = normalizeLocalePath(activePath)
	return map[string]any{
		"main_menu":          emptyResolvedMenu(DefaultMainMenuLocation, DefaultFallbackMenuCode, activePath),
		"footer_menu":        emptyResolvedMenu(DefaultFooterMenuLocation, DefaultFallbackMenuCode, activePath),
		"main_menu_items":    []map[string]any{},
		"footer_menu_items":  []map[string]any{},
		"navigation_debug":   false,
		"navigation_helpers": map[string]any{},
	}
}

func navigationContextPayload(
	r *navigationRuntime,
	activePath string,
	debugMode bool,
	main map[string]any,
	footer map[string]any,
) map[string]any {
	mainItems := toMenuItemsContract(main["items"])
	footerItems := toMenuItemsContract(footer["items"])

	return map[string]any{
		"main_menu":         main,
		"footer_menu":       footer,
		"main_menu_items":   mainItems,
		"footer_menu_items": footerItems,
		"navigation_debug":  debugMode,
		// Keep legacy contract for templates that still bind a single nav list.
		"nav_items": mainItems,
		"navigation_helpers": map[string]any{
			"main": map[string]any{
				"location": r.siteCfg.Navigation.MainMenuLocation,
				"items":    mainItems,
				"active":   activePath,
			},
			"footer": map[string]any{
				"location": r.siteCfg.Navigation.FooterMenuLocation,
				"items":    footerItems,
				"active":   activePath,
			},
		},
	}
}
