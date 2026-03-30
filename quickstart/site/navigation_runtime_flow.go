package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
)

func (r *navigationRuntime) context(c router.Context, state RequestState, activePath string) map[string]any {
	if r == nil {
		return map[string]any{
			"main_menu":          emptyResolvedMenu(DefaultMainMenuLocation, DefaultFallbackMenuCode, normalizeLocalePath(activePath)),
			"footer_menu":        emptyResolvedMenu(DefaultFooterMenuLocation, DefaultFallbackMenuCode, normalizeLocalePath(activePath)),
			"main_menu_items":    []map[string]any{},
			"footer_menu_items":  []map[string]any{},
			"navigation_debug":   false,
			"navigation_helpers": map[string]any{},
		}
	}

	opts := r.resolveReadOptions(c, state)
	activePath = normalizeLocalePath(activePath)
	debugMode := navigationDebugEnabled(c)

	main := r.resolveMenuForLocation(RequestContext(c), state, r.siteCfg.Navigation.MainMenuLocation, activePath, opts, debugMode)
	footer := r.resolveMenuForLocation(RequestContext(c), state, r.siteCfg.Navigation.FooterMenuLocation, activePath, opts, debugMode)

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

func (r *navigationRuntime) resolveReadOptions(c router.Context, state RequestState) navigationReadOptions {
	opts := navigationReadOptions{
		Locale:               strings.TrimSpace(state.Locale),
		IncludeContributions: queryBoolValue(c, "include_contributions", true),
		DedupPolicy:          normalizeDedupPolicy(strings.TrimSpace(primitives.FirstNonEmpty(queryValue(c, "menu_dedupe_policy"), queryValue(c, "dedupe_policy"), queryValue(c, "contribution_duplicate_policy")))),
		ContributionLocalePolicy: normalizeContributionLocalePolicy(strings.TrimSpace(primitives.FirstNonEmpty(
			queryValue(c, "contribution_locale_policy"),
			r.siteCfg.Navigation.ContributionLocalePolicy,
		))),
	}
	if opts.DedupPolicy == "" {
		opts.DedupPolicy = menuDedupByURL
	}

	if previewStateAllowsDraft(state) &&
		r.siteCfg.Features.EnableMenuDraftPreview &&
		previewEntityAllowsMenuDrafts(state.PreviewEntityType) {
		opts.IncludeDrafts = true
		opts.PreviewToken = strings.TrimSpace(state.PreviewToken)
	}

	if c != nil {
		opts.ViewProfile = strings.TrimSpace(c.Query("view_profile"))
	}

	return opts
}

func (r *navigationRuntime) resolveMenuForLocation(
	ctx context.Context,
	state RequestState,
	location string,
	activePath string,
	opts navigationReadOptions,
	debugMode bool,
) map[string]any {
	location = strings.TrimSpace(location)
	if location == "" {
		location = strings.TrimSpace(r.siteCfg.Navigation.MainMenuLocation)
	}

	menu, source, resolveErr := r.resolveRawMenu(ctx, state, location, opts)
	if resolveErr != nil && menu == nil {
		return map[string]any{
			"location":           location,
			"code":               strings.TrimSpace(r.siteCfg.Navigation.FallbackMenuCode),
			"source":             "error",
			"active_path":        normalizeLocalePath(activePath),
			"items":              []map[string]any{},
			"error":              resolveErr.Error(),
			"include_drafts":     opts.IncludeDrafts,
			"include_preview":    strings.TrimSpace(opts.PreviewToken) != "",
			"include_debug":      debugMode,
			"include_fallback":   r.siteCfg.Navigation.EnableGeneratedFallback,
			"requested_locale":   strings.TrimSpace(state.Locale),
			"resolved_locale":    strings.TrimSpace(state.Locale),
			"view_profile":       strings.TrimSpace(opts.ViewProfile),
			"include_dedup_mode": opts.DedupPolicy,
		}
	}
	if menu == nil {
		return emptyResolvedMenu(location, r.siteCfg.Navigation.FallbackMenuCode, activePath)
	}

	filtered := r.filterMenuItems(ctx, menu.Items)
	filtered = r.enforceContributionLocalePolicy(ctx, filtered, opts.Locale, opts.ContributionLocalePolicy)
	projected := r.projectMenuItems(filtered, activePath, opts.Locale, opts.DedupPolicy, debugMode)

	return map[string]any{
		"location":           strings.TrimSpace(primitives.FirstNonEmpty(menu.Location, location)),
		"code":               strings.TrimSpace(primitives.FirstNonEmpty(menu.Code, r.siteCfg.Navigation.FallbackMenuCode)),
		"source":             strings.TrimSpace(source),
		"active_path":        normalizeLocalePath(activePath),
		"items":              projected,
		"include_drafts":     opts.IncludeDrafts,
		"include_preview":    strings.TrimSpace(opts.PreviewToken) != "",
		"include_debug":      debugMode,
		"include_fallback":   r.siteCfg.Navigation.EnableGeneratedFallback,
		"requested_locale":   strings.TrimSpace(state.Locale),
		"resolved_locale":    strings.TrimSpace(state.Locale),
		"view_profile":       strings.TrimSpace(opts.ViewProfile),
		"include_dedup_mode": opts.DedupPolicy,
	}
}
