package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func (r *deliveryRuntime) resolvePageKind(
	ctx context.Context,
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
	cache *siteContentCache,
) (*deliveryResolution, SiteRuntimeError, bool) {
	candidates := []admin.CMSContent{}
	for _, record := range records {
		path := deliveryRequestMatchPath(r.strictLocalizedPathsEnabled(), record, capability, r.siteCfg.SupportedLocales)
		if path == "" {
			continue
		}
		if !pathsMatch(path, requestPath) {
			continue
		}
		candidates = append(candidates, record)
	}
	if len(candidates) == 0 && !r.strictLocalizedPathsEnabled() {
		candidates = r.resolvePagePathAliasCandidates(ctx, capability, records, state, requestPath, cache)
	}
	if len(candidates) == 0 {
		return nil, SiteRuntimeError{}, false
	}
	if ambiguousLocaleCandidates(candidates, state.Locale, r.siteCfg.DefaultLocale, state.SupportedLocales, capability) {
		return nil, SiteRuntimeError{Status: 404, RequestedLocale: state.Locale}, true
	}

	selected, missing, available, fallbackUsed := resolveLocaleRecord(candidates, state, capability, r.siteCfg.AllowLocaleFallback, r.siteCfg.DefaultLocale)
	if !missing && selected.ID == "" {
		return nil, SiteRuntimeError{}, false
	}
	if missing && !r.siteCfg.AllowLocaleFallback {
		return nil, translationMissingSiteError(state.Locale, available, capability.TypeSlug, requestPath), true
	}
	resolution := resolutionFromDetailRecord(capability, selected, state.Locale, available, fallbackUsed, candidates)
	if isHomepageRequestPath(requestPath) {
		resolution.Mode = "homepage"
		resolution.TemplateCandidates = capability.homeTemplateCandidates(state.SiteTheme)
	}
	return resolution, SiteRuntimeError{}, true
}

func (r *deliveryRuntime) resolveDetailKind(
	ctx context.Context,
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
	cache *siteContentCache,
) (*deliveryResolution, SiteRuntimeError, bool) {
	params, ok := matchRoutePattern(capability.detailRoutePattern(), requestPath)
	if !ok {
		return nil, SiteRuntimeError{}, false
	}
	slug := strings.TrimSpace(params["slug"])
	candidates := r.detailKindCandidates(ctx, capability, records, state, requestPath, slug, cache)
	if len(candidates) == 0 {
		return nil, SiteRuntimeError{}, false
	}
	if ambiguousLocaleCandidates(candidates, state.Locale, r.siteCfg.DefaultLocale, state.SupportedLocales, capability) {
		return nil, SiteRuntimeError{Status: 404, RequestedLocale: state.Locale}, true
	}

	selected, missing, available, fallbackUsed := resolveLocaleRecord(candidates, state, capability, r.siteCfg.AllowLocaleFallback, r.siteCfg.DefaultLocale)
	if !missing && selected.ID == "" {
		return nil, SiteRuntimeError{}, false
	}
	if missing && !r.siteCfg.AllowLocaleFallback {
		return nil, translationMissingSiteError(state.Locale, available, capability.TypeSlug, firstNonEmpty(slug, requestPath)), true
	}
	resolution := resolutionFromDetailRecord(capability, selected, state.Locale, available, fallbackUsed, candidates)
	return resolution, SiteRuntimeError{}, true
}

func (r *deliveryRuntime) detailKindCandidates(
	ctx context.Context,
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
	slug string,
	cache *siteContentCache,
) []admin.CMSContent {
	candidates := []admin.CMSContent{}
	for _, record := range records {
		if detailKindRecordMatches(r.strictLocalizedPathsEnabled(), record, capability, r.siteCfg.SupportedLocales, requestPath, slug) {
			candidates = append(candidates, record)
		}
	}
	if len(candidates) == 0 && !r.strictLocalizedPathsEnabled() {
		return r.resolveDetailPathAliasCandidates(ctx, capability, state, requestPath, slug, cache)
	}
	return candidates
}

func detailKindRecordMatches(strictLocalizedPaths bool, record admin.CMSContent, capability deliveryCapability, supportedLocales []string, requestPath string, slug string) bool {
	path := deliveryRequestMatchPath(strictLocalizedPaths, record, capability, supportedLocales)
	if path != "" && pathsMatch(path, requestPath) {
		return true
	}
	if slug != "" {
		return deliverySlugMatches(record, slug, capability)
	}
	return path != "" && pathsMatch(path, requestPath)
}

func (r *deliveryRuntime) resolveCollectionKind(
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
) (*deliveryResolution, bool) {
	if _, ok := matchRoutePattern(capability.listRoutePattern(), requestPath); !ok {
		return nil, false
	}

	selected := resolveLocaleRecordsForList(records, state, capability, r.siteCfg.AllowLocaleFallback, r.siteCfg.DefaultLocale)
	resolvedLocale := state.Locale
	available := collectAvailableLocales(records)
	if len(selected) > 0 {
		resolvedLocale = strings.TrimSpace(firstNonEmpty(selected[0].ResolvedLocale, selected[0].Locale, state.Locale))
	}
	return &deliveryResolution{
		Mode:               "collection",
		Capability:         capability,
		Records:            selected,
		RequestedLocale:    state.Locale,
		ResolvedLocale:     resolvedLocale,
		AvailableLocales:   available,
		TemplateCandidates: capability.listTemplateCandidates(),
	}, true
}

func isHomepageRequestPath(requestPath string) bool {
	return normalizeLocalePath(requestPath) == "/"
}
