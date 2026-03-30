package site

import (
	"context"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func (r *deliveryRuntime) renderResolution(c router.Context, state RequestState, resolution *deliveryResolution, requestPath string, cache *siteContentCache) error {
	if target := r.canonicalRedirectTarget(c, resolution); target != "" {
		return c.Redirect(target, http.StatusPermanentRedirect)
	}

	viewCtx := newRuntimeViewContext(state)
	viewCtx = applyResolvedLocaleViewContext(
		viewCtx,
		resolution.RequestedLocale,
		resolution.ResolvedLocale,
		resolution.AvailableLocales,
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

	if r.navigation != nil {
		menus := r.navigation.context(c, state, requestPath)
		for key, value := range menus {
			viewCtx[key] = value
		}
	}

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
	}
	viewCtx = applyLocaleSwitcherViewContext(
		viewCtx,
		r.siteCfg,
		requestPath,
		resolution.RequestedLocale,
		resolution.ResolvedLocale,
		resolution.FamilyID,
		resolution.AvailableLocales,
		pathsByLocale,
		state,
	)

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

func (r *deliveryRuntime) resolveLocalizedPathsByLocale(
	ctx context.Context,
	state RequestState,
	capability deliveryCapability,
	record admin.CMSContent,
	existing map[string]string,
	cache *siteContentCache,
) map[string]string {
	out := cloneLocalizedPaths(existing)
	if r == nil || r.contentSvc == nil {
		if len(out) == 0 {
			return nil
		}
		return out
	}

	key := contentIdentityKey(record, capability)
	if strings.TrimSpace(key) == "" {
		if len(out) == 0 {
			return nil
		}
		return out
	}

	localized := r.localizedCapabilityRecords(
		ctx,
		capability,
		state,
		cache,
		state.SupportedLocales,
		[]string{state.Locale},
		[]string{state.DefaultLocale},
		record.AvailableLocales,
	)
	for _, locale := range localized.locales {
		if locale == "" {
			continue
		}
		if _, exists := out[locale]; exists {
			continue
		}
		for _, candidate := range localized.byLocale[locale] {
			if !strings.EqualFold(contentIdentityKey(candidate, capability), key) {
				continue
			}
			path := recordDeliveryPath(candidate, capability)
			if path == "" {
				break
			}
			out[locale] = normalizeLocalePath(path)
			break
		}
	}

	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneLocalizedPaths(input map[string]string) map[string]string {
	if len(input) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(input))
	for key, value := range input {
		key = strings.ToLower(strings.TrimSpace(key))
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			continue
		}
		out[key] = normalizeLocalePath(value)
	}
	if len(out) == 0 {
		return map[string]string{}
	}
	return out
}

func mapDeliveryRecord(record admin.CMSContent, capability deliveryCapability) map[string]any {
	data := cloneAnyMap(record.Data)
	path := recordDeliveryPath(record, capability)
	translationGroupID := strings.TrimSpace(firstNonEmpty(record.FamilyID, anyString(data["family_id"])))
	out := map[string]any{
		"id":                       strings.TrimSpace(record.ID),
		"title":                    strings.TrimSpace(record.Title),
		"slug":                     strings.TrimSpace(record.Slug),
		"path":                     path,
		"status":                   strings.TrimSpace(record.Status),
		"locale":                   strings.TrimSpace(record.Locale),
		"requested_locale":         strings.TrimSpace(record.RequestedLocale),
		"resolved_locale":          strings.TrimSpace(record.ResolvedLocale),
		"available_locales":        cloneStrings(record.AvailableLocales),
		"family_id":                translationGroupID,
		"missing_requested_locale": record.MissingRequestedLocale,
		"content_type":             strings.TrimSpace(firstNonEmpty(record.ContentType, capability.TypeSlug)),
		"content_type_slug":        strings.TrimSpace(firstNonEmpty(record.ContentTypeSlug, capability.TypeSlug)),
		"data":                     data,
	}
	if summary := strings.TrimSpace(firstNonEmpty(anyString(data["summary"]), anyString(data["excerpt"]))); summary != "" {
		out["summary"] = summary
	}
	if content := strings.TrimSpace(firstNonEmpty(anyString(data["content"]), anyString(data["body"]))); content != "" {
		out["content"] = content
	}
	if metaTitle := strings.TrimSpace(anyString(data["meta_title"])); metaTitle != "" {
		out["meta_title"] = metaTitle
	}
	if metaDescription := strings.TrimSpace(anyString(data["meta_description"])); metaDescription != "" {
		out["meta_description"] = metaDescription
	}
	if previewURL := strings.TrimSpace(anyString(data["preview_url"])); previewURL != "" {
		out["preview_url"] = previewURL
	}
	return out
}

func recordDeliveryPath(record admin.CMSContent, capability deliveryCapability) string {
	policy := effectiveDeliveryPathPolicy(capability)
	if value := strings.TrimSpace(admin.ResolveContentPath(record, "")); value != "" {
		if sanitized := sanitizeDeliveryPath(value, policy); sanitized != "" {
			return sanitized
		}
	}
	generated := generatedDeliveryPath(record, capability)
	if generated == "" {
		return ""
	}
	return sanitizeDeliveryPath(generated, policy)
}

func generatedDeliveryPath(record admin.CMSContent, capability deliveryCapability) string {
	slug := strings.Trim(strings.TrimSpace(record.Slug), "/")
	if slug == "" {
		return "/"
	}
	switch capability.normalizedKind() {
	case "page":
		return "/" + slug
	case "collection":
		return capability.listRoutePattern()
	default:
		pattern := capability.detailRoutePattern()
		if strings.Contains(pattern, ":slug") {
			return strings.Replace(pattern, ":slug", slug, 1)
		}
		return "/" + pluralTypeSlug(capability.TypeSlug) + "/" + slug
	}
}

func firstTemplate(candidates []string) string {
	for _, item := range candidates {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
