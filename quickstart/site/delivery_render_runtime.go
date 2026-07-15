package site

import (
	"errors"
	"maps"
	"net/http"
	"strings"

	router "github.com/goliatone/go-router"
)

func (r *deliveryRuntime) renderResolution(c router.Context, state RequestState, resolution *deliveryResolution, requestPath string, cache *siteContentCache) error {
	return r.renderResolutionWithCache(c, state, resolution, requestPath, cache, renderCacheDecision{})
}

func (r *deliveryRuntime) renderResolutionWithCache(
	c router.Context,
	state RequestState,
	resolution *deliveryResolution,
	requestPath string,
	cache *siteContentCache,
	cacheDecision renderCacheDecision,
) error {
	if target := r.canonicalRedirectTarget(c, resolution); target != "" {
		if cacheDecision.Cacheable {
			r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonCanonicalRedirect, cacheDecision.Key)
		}
		return c.Redirect(target, http.StatusPermanentRedirect)
	}

	availableLocales, pathsByLocale := r.prepareLocalizedResolution(c, state, resolution, cache)
	viewCtx := r.resolutionViewContext(c, state, resolution, requestPath, availableLocales, pathsByLocale)
	response := siteTemplateResponse{
		JSONStatus:    200,
		TemplateNames: resolution.TemplateCandidates,
		JSONPayload: siteTemplateResponsePayload(firstTemplate(resolution.TemplateCandidates), viewCtx, map[string]any{
			"mode": resolution.Mode,
		}),
		ViewContext: viewCtx,
		FallbackError: SiteRuntimeError{
			Status:          500,
			Message:         "no site template could render the requested view",
			RequestedLocale: resolution.RequestedLocale,
			AvailableLocales: cloneStrings(
				resolution.AvailableLocales,
			),
		},
		Provenance: deliveryProvenanceForResolution(
			resolution,
			map[bool]string{true: renderCacheStatusMiss, false: renderCacheStatusBypass}[cacheDecision.Cacheable],
			r.renderCache.policy.RenderVersion,
		),
	}
	if cacheDecision.Cacheable {
		result, err := renderSiteTemplateResponseCaptured(c, response, r.renderCache.policy)
		if err != nil {
			var captureErr renderCacheCaptureError
			if errors.As(err, &captureErr) && captureErr.Reason != renderCacheReasonRenderError {
				r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, captureErr.Reason, cacheDecision.Key)
				return renderSiteTemplateResponse(c, state, r.siteCfg, response)
			}
			r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonRenderError, cacheDecision.Key)
			return renderSiteRuntimeError(c, state, r.siteCfg, response.FallbackError)
		}
		if result.Status <= 0 || strings.TrimSpace(result.TemplateName) == "" {
			r.writeRenderCacheDebugHeaders(c, renderCacheStatusBypass, renderCacheReasonRenderError, cacheDecision.Key)
			return renderSiteRuntimeError(c, state, r.siteCfg, siteTemplateRenderFailure(response.FallbackError, result.Provenance, result.LastError))
		}
		return r.writeCapturedRenderCacheResponse(c, state, cacheDecision, result, resolution)
	}
	return renderSiteTemplateResponse(c, state, r.siteCfg, response)
}

func (r *deliveryRuntime) prepareLocalizedResolution(
	c router.Context,
	state RequestState,
	resolution *deliveryResolution,
	cache *siteContentCache,
) ([]string, map[string]string) {
	availableLocales := cloneStrings(resolution.AvailableLocales)
	pathsByLocale := resolution.PathsByLocale
	if resolution.Record != nil {
		pathsByLocale = r.resolveLocalizedPathsByLocale(
			c.Context(),
			state,
			resolution.Capability,
			*resolution.Record,
			pathsByLocale,
			cache,
		)
		availableLocales = localizedAvailableLocales(availableLocales, pathsByLocale, state.SupportedLocales)
		record := *resolution.Record
		record.AvailableLocales = cloneStrings(availableLocales)
		resolution.Record = &record
	}
	resolution.AvailableLocales = cloneStrings(availableLocales)
	return availableLocales, pathsByLocale
}

func (r *deliveryRuntime) resolutionViewContext(
	c router.Context,
	state RequestState,
	resolution *deliveryResolution,
	requestPath string,
	availableLocales []string,
	pathsByLocale map[string]string,
) map[string]any {
	viewCtx := newRuntimeViewContext(state)
	viewCtx = applyResolvedLocaleViewContext(
		viewCtx,
		resolution.RequestedLocale,
		resolution.ResolvedLocale,
		availableLocales,
		resolution.MissingRequested,
	)
	viewCtx = applyContentTypeViewContext(viewCtx, resolution.Capability.TypeSlug)
	viewCtx = applyResolutionModeViewContext(viewCtx, resolution)
	viewCtx = mergeSiteContentViewContext(viewCtx, map[string]any{
		"kind":                deliveryResolutionContentKind(resolution),
		"mode":                strings.ToLower(strings.TrimSpace(resolution.Mode)),
		"family_id":           strings.TrimSpace(resolution.FamilyID),
		"template_candidates": cloneStrings(resolution.TemplateCandidates),
	})
	viewCtx = r.applyResolutionNavigationContext(c, state, viewCtx, requestPath)
	viewCtx = applyLocaleSwitcherViewContext(
		viewCtx,
		r.siteCfg,
		requestPath,
		resolution.RequestedLocale,
		resolution.ResolvedLocale,
		resolution.FamilyID,
		availableLocales,
		pathsByLocale,
		state,
	)
	if len(r.modules) > 0 {
		viewCtx = applyRequestStateModuleViewContext(c.Context(), viewCtx, r.modules)
	}
	return applySiteContentAwareViewContext(viewCtx)
}

func applyResolutionModeViewContext(viewCtx map[string]any, resolution *deliveryResolution) map[string]any {
	switch strings.ToLower(strings.TrimSpace(resolution.Mode)) {
	case "collection":
		items := make([]map[string]any, 0, len(resolution.Records))
		for _, record := range resolution.Records {
			items = append(items, mapDeliveryRecord(record, resolution.Capability))
		}
		viewCtx["records"] = items
		viewCtx[pluralTypeSlug(resolution.Capability.TypeSlug)] = items
	default:
		if resolution.Record != nil {
			recordMap := mapDeliveryRecord(*resolution.Record, resolution.Capability)
			viewCtx["record"] = recordMap
			viewCtx[singularTypeSlug(resolution.Capability.TypeSlug)] = recordMap
			viewCtx["family_id"] = strings.TrimSpace(firstNonEmpty(
				anyString(recordMap["family_id"]),
				resolution.FamilyID,
			))
		}
	}
	return viewCtx
}

func (r *deliveryRuntime) applyResolutionNavigationContext(c router.Context, state RequestState, viewCtx map[string]any, requestPath string) map[string]any {
	if r.navigation != nil {
		menus := r.navigation.context(c, state, requestPath)
		maps.Copy(viewCtx, menus)
	}
	return viewCtx
}
