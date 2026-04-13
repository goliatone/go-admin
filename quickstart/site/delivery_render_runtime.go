package site

import (
	"maps"
	"net/http"
	"strings"

	router "github.com/goliatone/go-router"
)

func (r *deliveryRuntime) renderResolution(c router.Context, state RequestState, resolution *deliveryResolution, requestPath string, cache *siteContentCache) error {
	if target := r.canonicalRedirectTarget(c, resolution); target != "" {
		return c.Redirect(target, http.StatusPermanentRedirect)
	}

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

	viewCtx := newRuntimeViewContext(state)
	viewCtx = applyResolvedLocaleViewContext(
		viewCtx,
		resolution.RequestedLocale,
		resolution.ResolvedLocale,
		availableLocales,
		resolution.MissingRequested,
	)
	viewCtx = applyContentTypeViewContext(viewCtx, resolution.Capability.TypeSlug)

	switch strings.ToLower(strings.TrimSpace(resolution.Mode)) {
	case "collection":
		items := make([]map[string]any, 0, len(resolution.Records))
		for _, record := range resolution.Records {
			items = append(items, mapDeliveryRecord(record, resolution.Capability))
		}
		viewCtx["records"] = items
		viewCtx[pluralTypeSlug(resolution.Capability.TypeSlug)] = items
	default:
		recordMap := map[string]any{}
		if resolution.Record != nil {
			recordMap = mapDeliveryRecord(*resolution.Record, resolution.Capability)
			viewCtx["record"] = recordMap
			viewCtx[singularTypeSlug(resolution.Capability.TypeSlug)] = recordMap
			viewCtx["family_id"] = strings.TrimSpace(firstNonEmpty(
				anyString(recordMap["family_id"]),
				resolution.FamilyID,
			))
		}
	}
	viewCtx = mergeSiteContentViewContext(viewCtx, map[string]any{
		"kind":                deliveryResolutionContentKind(resolution),
		"mode":                strings.ToLower(strings.TrimSpace(resolution.Mode)),
		"family_id":           strings.TrimSpace(resolution.FamilyID),
		"template_candidates": cloneStrings(resolution.TemplateCandidates),
	})

	if r.navigation != nil {
		menus := r.navigation.context(c, state, requestPath)
		maps.Copy(viewCtx, menus)
	}

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
	viewCtx = applySiteContentAwareViewContext(viewCtx)

	return renderSiteTemplateResponse(c, state, r.siteCfg, siteTemplateResponse{
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
	})
}
