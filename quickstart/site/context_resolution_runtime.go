package site

import (
	"context"
	"maps"
	"sort"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func resolveRequestEnvironment(c router.Context, fallback string) string {
	if c == nil {
		return normalizeRuntimeEnvironment(fallback)
	}
	candidates := []string{
		c.Query("runtime_env"),
		c.Query("site_runtime_env"),
		c.Header("X-Site-Runtime-Environment"),
		c.Header("X-Site-Environment"),
		fallback,
	}
	for _, candidate := range candidates {
		if normalized := normalizeRuntimeEnvironment(candidate); normalized != "" {
			return normalized
		}
	}
	return "prod"
}

func resolveRequestContentChannel(c router.Context, fallback string) string {
	fallback = strings.TrimSpace(fallback)
	normalizedFallback := ""
	if fallback != "" {
		normalizedFallback = normalizeContentChannel(fallback)
	}
	if c == nil {
		if normalizedFallback != "" {
			return normalizedFallback
		}
		return "default"
	}
	candidates := []string{
		c.Query(admin.ContentChannelScopeQueryParam),
		c.Query("channel"),
		c.Query("content_channel"),
		c.Query("site_content_channel"),
		c.Header("X-Site-Content-Channel"),
		c.Header("X-Content-Channel"),
		c.Cookies(defaultContentChannelCookie),
	}
	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		if normalized := normalizeContentChannel(candidate); normalized != "" {
			return normalized
		}
	}
	if normalizedFallback != "" {
		return normalizedFallback
	}
	return "default"
}

func resolveRequestLocale(c router.Context, i18nEnabled bool, fallback string, supported []string) string {
	fallback = strings.ToLower(strings.TrimSpace(fallback))
	if fallback == "" {
		fallback = "en"
	}
	if !i18nEnabled || c == nil {
		return fallback
	}

	candidates := []string{
		c.Param("locale", ""),
		localeFromRequestPath(c, supported),
		c.Query("locale"),
		c.Cookies(defaultLocaleCookieName),
	}
	for _, candidate := range candidates {
		if locale := matchSupportedLocale(candidate, supported); locale != "" {
			return locale
		}
	}
	if headerLocale := matchAcceptedLanguage(c.Header("Accept-Language"), supported); headerLocale != "" {
		return headerLocale
	}
	if locale := matchSupportedLocale(fallback, supported); locale != "" {
		return locale
	}
	return fallback
}

func localeFromRequestPath(c router.Context, supported []string) string {
	if c == nil {
		return ""
	}
	pathCandidates := []string{
		c.Param("path", ""),
		c.Path(),
	}
	for _, candidate := range pathCandidates {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		if !strings.HasPrefix(candidate, "/") {
			candidate = "/" + strings.Trim(candidate, "/")
		}
		if _, locale := StripSupportedLocalePrefix(candidate, supported); locale != "" {
			return locale
		}
	}
	return ""
}

func matchAcceptedLanguage(header string, supported []string) string {
	header = strings.TrimSpace(header)
	if header == "" {
		return ""
	}
	type weightedLocale struct {
		locale string
		weight float64
		order  int
	}
	parts := strings.Split(header, ",")
	parsed := make([]weightedLocale, 0, len(parts))
	for index, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		locale := part
		weight := 1.0
		if strings.Contains(part, ";") {
			segments := strings.Split(part, ";")
			locale = strings.TrimSpace(segments[0])
			for _, segment := range segments[1:] {
				segment = strings.TrimSpace(segment)
				if !strings.HasPrefix(strings.ToLower(segment), "q=") {
					continue
				}
				if parsedWeight, err := strconv.ParseFloat(strings.TrimPrefix(strings.ToLower(segment), "q="), 64); err == nil {
					weight = parsedWeight
				}
			}
		}
		parsed = append(parsed, weightedLocale{locale: locale, weight: weight, order: index})
	}
	sort.SliceStable(parsed, func(i, j int) bool {
		if parsed[i].weight == parsed[j].weight {
			return parsed[i].order < parsed[j].order
		}
		return parsed[i].weight > parsed[j].weight
	})
	for _, candidate := range parsed {
		if locale := matchSupportedLocale(candidate.locale, supported); locale != "" {
			return locale
		}
	}
	return ""
}

func matchSupportedLocale(candidate string, supported []string) string {
	candidate = strings.ToLower(strings.TrimSpace(candidate))
	if candidate == "" {
		return ""
	}
	if len(supported) == 0 {
		return candidate
	}
	for _, locale := range supported {
		locale = strings.ToLower(strings.TrimSpace(locale))
		if locale == "" {
			continue
		}
		if candidate == locale {
			return locale
		}
	}
	if idx := strings.Index(candidate, "-"); idx > 0 {
		base := candidate[:idx]
		for _, locale := range supported {
			locale = strings.ToLower(strings.TrimSpace(locale))
			if base == locale {
				return locale
			}
		}
	}
	return ""
}

func resolveRequestTheme(c router.Context, requestCtx context.Context, siteCfg ResolvedSiteConfig, environment string) (context.Context, map[string]map[string]string, string, string) {
	if requestCtx == nil {
		requestCtx = context.Background()
	}
	if !siteCfg.Features.EnableTheme {
		return requestCtx, nil, "", ""
	}

	configured := SiteThemeSelector{
		Name:    strings.TrimSpace(siteCfg.Theme.Name),
		Variant: strings.TrimSpace(siteCfg.Theme.Variant),
	}
	requested := SiteThemeSelector{}
	selector := configured
	if c != nil && environmentAllowsThemeOverride(environment) {
		requested = SiteThemeSelector{
			Name:    strings.TrimSpace(c.Query("theme")),
			Variant: strings.TrimSpace(c.Query("variant")),
		}
		if siteCfg.Theme.AllowRequestNameOverride {
			if requested.Name != "" {
				selector.Name = requested.Name
			}
		}
		if siteCfg.Theme.AllowRequestVariantOverride {
			if requested.Variant != "" {
				selector.Variant = requested.Variant
			}
		}
	}

	themeCtx := WithSiteThemeSelection(requestCtx, selector)
	payload, selector := resolveSiteThemePayload(themeCtx, siteCfg.ThemeProvider, SiteThemeRequest{
		Configured: configured,
		Requested:  requested,
		Selector:   selector,
	})
	name := ""
	variant := ""
	if selection, ok := payload["selection"]; ok {
		name = strings.TrimSpace(selection["name"])
		variant = strings.TrimSpace(selection["variant"])
	}
	return themeCtx, payload, name, variant
}

func environmentAllowsThemeOverride(environment string) bool {
	environment = normalizeRuntimeEnvironment(environment)
	return environment != "prod"
}

func cloneThemePayload(input map[string]map[string]string) map[string]map[string]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]map[string]string, len(input))
	for key, values := range input {
		if len(values) == 0 {
			out[key] = map[string]string{}
			continue
		}
		dup := make(map[string]string, len(values))
		maps.Copy(dup, values)
		out[key] = dup
	}
	return out
}

func siteThemeSelectionPayload(selector SiteThemeSelector) map[string]map[string]string {
	selection := map[string]string{}
	if selector.Name != "" {
		selection["name"] = selector.Name
	}
	if selector.Variant != "" {
		selection["variant"] = selector.Variant
	}
	if len(selection) == 0 {
		return nil
	}
	return map[string]map[string]string{"selection": selection}
}

func ensureThemeSelectionPayload(payload map[string]map[string]string, selector SiteThemeSelector) map[string]map[string]string {
	if selector.Name == "" && selector.Variant == "" {
		return payload
	}
	if payload == nil {
		payload = map[string]map[string]string{}
	}
	selection := cloneThemePayloadSection(payload, "selection")
	if selection == nil {
		selection = map[string]string{}
	}
	if selector.Name != "" && strings.TrimSpace(selection["name"]) == "" {
		selection["name"] = selector.Name
	}
	if selector.Variant != "" && strings.TrimSpace(selection["variant"]) == "" {
		selection["variant"] = selector.Variant
	}
	payload["selection"] = selection
	return payload
}

func resolveSiteThemePayload(
	ctx context.Context,
	provider SiteThemeProvider,
	request SiteThemeRequest,
) (map[string]map[string]string, SiteThemeSelector) {
	if provider == nil {
		payload := siteThemeSelectionPayload(request.Selector)
		return ensureThemeSelectionPayload(payload, request.Selector), request.Selector
	}

	basePayload, baseSelector := resolveSiteThemeProviderSelection(ctx, provider, SiteThemeRequest{
		Configured: request.Configured,
		Requested:  request.Requested,
		Selector:   request.Configured,
	})
	if sameSiteThemeSelector(request.Selector, request.Configured) {
		return basePayload, baseSelector
	}

	requestedPayload, requestedSelector := resolveSiteThemeProviderSelection(ctx, provider, request)
	if len(requestedPayload) > 0 {
		return requestedPayload, requestedSelector
	}
	if len(basePayload) > 0 {
		return basePayload, baseSelector
	}
	payload := siteThemeSelectionPayload(request.Configured)
	if len(payload) == 0 {
		payload = siteThemeSelectionPayload(request.Selector)
	}
	return ensureThemeSelectionPayload(payload, request.Configured), request.Configured
}

func resolveSiteThemeProviderSelection(
	ctx context.Context,
	provider SiteThemeProvider,
	request SiteThemeRequest,
) (map[string]map[string]string, SiteThemeSelector) {
	selection, err := provider(ctx, request)
	if err != nil || selection == nil {
		return nil, SiteThemeSelector{}
	}
	resolved := request.Selector
	if name := strings.TrimSpace(selection.Name); name != "" {
		resolved.Name = name
	}
	if variant := strings.TrimSpace(selection.Variant); variant != "" {
		resolved.Variant = variant
	}
	payload := cloneThemePayload(selection.Payload())
	payload = ensureThemeSelectionPayload(payload, resolved)
	return payload, resolved
}

func sameSiteThemeSelector(left, right SiteThemeSelector) bool {
	return strings.TrimSpace(left.Name) == strings.TrimSpace(right.Name) &&
		strings.TrimSpace(left.Variant) == strings.TrimSpace(right.Variant)
}
