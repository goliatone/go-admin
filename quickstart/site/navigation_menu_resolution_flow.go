package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/internal/primitives"
)

func resolveNavigationMenuForLocation(
	r *navigationRuntime,
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
		return navigationResolvedMenuError(r, state, location, activePath, opts, debugMode, resolveErr)
	}
	if menu == nil {
		return emptyResolvedMenu(location, r.siteCfg.Navigation.FallbackMenuCode, activePath)
	}
	menu = admin.LocalizeMenu(menu, r.translator, opts.Locale)
	return navigationResolvedMenuPayload(r, ctx, state, location, activePath, opts, debugMode, menu, source)
}

func navigationResolvedMenuError(
	r *navigationRuntime,
	state RequestState,
	location string,
	activePath string,
	opts navigationReadOptions,
	debugMode bool,
	resolveErr error,
) map[string]any {
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

func navigationResolvedMenuPayload(
	r *navigationRuntime,
	ctx context.Context,
	state RequestState,
	location string,
	activePath string,
	opts navigationReadOptions,
	debugMode bool,
	menu *admin.Menu,
	source string,
) map[string]any {
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
