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
		path := deliveryRequestMatchPath(r.strictLocalizedPathsEnabled(), record, capability)
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
	candidates := []admin.CMSContent{}
	for _, record := range records {
		path := deliveryRequestMatchPath(r.strictLocalizedPathsEnabled(), record, capability)
		if path != "" && pathsMatch(path, requestPath) {
			candidates = append(candidates, record)
			continue
		}
		if slug != "" {
			if !deliverySlugMatches(record, slug, capability) {
				continue
			}
		} else if path == "" || !pathsMatch(path, requestPath) {
			continue
		}
		candidates = append(candidates, record)
	}
	if len(candidates) == 0 && !r.strictLocalizedPathsEnabled() {
		candidates = r.resolveDetailPathAliasCandidates(ctx, capability, state, requestPath, slug, cache)
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
		return nil, translationMissingSiteError(state.Locale, available, capability.TypeSlug, firstNonEmpty(slug, requestPath)), true
	}
	resolution := resolutionFromDetailRecord(capability, selected, state.Locale, available, fallbackUsed, candidates)
	return resolution, SiteRuntimeError{}, true
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
