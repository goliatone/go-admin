package site

import (
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func resolveLocaleRecord(
	candidates []admin.CMSContent,
	state RequestState,
	capability deliveryCapability,
	allowFallback bool,
	defaultLocale string,
) (admin.CMSContent, bool, []string, bool) {
	if len(candidates) == 0 {
		return admin.CMSContent{}, false, nil, false
	}
	available := collectAvailableLocales(candidates)
	requestedLocale := normalizeRequestedLocale(state.Locale, defaultLocale, state.SupportedLocales)

	exact := filterByLocale(candidates, requestedLocale)
	if len(exact) > 0 {
		selected := pickPreferredRecord(exact, state, capability)
		return withResolvedLocaleMetadata(selected, requestedLocale, available, false), false, available, false
	}
	if !allowFallback {
		return admin.CMSContent{}, true, available, false
	}

	fallbackCandidates := candidates
	if locale := normalizeRequestedLocale(defaultLocale, requestedLocale, state.SupportedLocales); locale != "" {
		if preferred := filterByLocale(candidates, locale); len(preferred) > 0 {
			fallbackCandidates = preferred
		}
	}
	selected := pickPreferredRecord(fallbackCandidates, state, capability)
	if selected.ID == "" {
		selected = pickPreferredRecord(candidates, state, capability)
	}
	return withResolvedLocaleMetadata(selected, requestedLocale, available, true), false, available, true
}

func resolveLocaleRecordsForList(
	records []admin.CMSContent,
	state RequestState,
	capability deliveryCapability,
	allowFallback bool,
	defaultLocale string,
) []admin.CMSContent {
	if len(records) == 0 {
		return nil
	}
	groups := map[string][]admin.CMSContent{}
	for _, record := range records {
		key := contentIdentityKey(record, capability)
		groups[key] = append(groups[key], record)
	}

	keys := make([]string, 0, len(groups))
	for key := range groups {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	out := make([]admin.CMSContent, 0, len(groups))
	for _, key := range keys {
		selected, missing, available, fallbackUsed := resolveLocaleRecord(groups[key], state, capability, allowFallback, defaultLocale)
		if missing || selected.ID == "" {
			continue
		}
		selected = withResolvedLocaleMetadata(selected, state.Locale, available, fallbackUsed)
		out = append(out, selected)
	}
	sort.SliceStable(out, func(i, j int) bool {
		leftPath := recordDeliveryPath(out[i], capability)
		rightPath := recordDeliveryPath(out[j], capability)
		if leftPath == rightPath {
			return strings.TrimSpace(out[i].Title) < strings.TrimSpace(out[j].Title)
		}
		return leftPath < rightPath
	})
	return out
}

func collectAvailableLocales(records []admin.CMSContent) []string {
	values := map[string]struct{}{}
	for _, record := range records {
		for _, locale := range append([]string{record.Locale, record.ResolvedLocale}, record.AvailableLocales...) {
			locale = strings.ToLower(strings.TrimSpace(locale))
			if locale == "" {
				continue
			}
			values[locale] = struct{}{}
		}
	}
	return mapKeysSorted(values)
}

func withResolvedLocaleMetadata(
	record admin.CMSContent,
	requestedLocale string,
	availableLocales []string,
	missingRequestedLocale bool,
) admin.CMSContent {
	record.RequestedLocale = strings.TrimSpace(requestedLocale)
	if record.RequestedLocale == "" {
		record.RequestedLocale = strings.TrimSpace(record.Locale)
	}
	record.ResolvedLocale = strings.TrimSpace(firstNonEmpty(record.ResolvedLocale, record.Locale, record.RequestedLocale))
	record.AvailableLocales = cloneStrings(availableLocales)
	record.MissingRequestedLocale = missingRequestedLocale
	return record
}

func deliverySlugMatches(record admin.CMSContent, slug string, capability deliveryCapability) bool {
	slug = strings.Trim(strings.ToLower(strings.TrimSpace(slug)), "/")
	if slug == "" {
		return false
	}
	if strings.Trim(strings.ToLower(strings.TrimSpace(record.Slug)), "/") == slug {
		return true
	}
	path := strings.Trim(strings.ToLower(strings.TrimSpace(recordDeliveryPath(record, capability))), "/")
	if path == slug {
		return true
	}
	return false
}

func contentIdentityKey(record admin.CMSContent, capability deliveryCapability) string {
	recordData := record.Data
	if recordData == nil {
		recordData = map[string]any{}
	}
	if groupID := strings.TrimSpace(firstNonEmpty(record.FamilyID, anyString(recordData["family_id"]))); groupID != "" {
		return strings.ToLower(groupID)
	}
	if routeKey := recordRouteKey(record); routeKey != "" {
		return strings.ToLower(singularTypeSlug(capability.TypeSlug) + ":" + routeKey)
	}
	if slug := strings.TrimSpace(record.Slug); slug != "" {
		return strings.ToLower(singularTypeSlug(capability.TypeSlug) + ":" + slug)
	}
	// V1 compatibility fallback only: once route_key backfill is complete, path
	// should no longer be used as cross-locale identity.
	path := recordDeliveryPath(record, capability)
	if path != "" {
		return strings.ToLower(singularTypeSlug(capability.TypeSlug) + ":" + path)
	}
	return strings.ToLower(singularTypeSlug(capability.TypeSlug) + ":" + strings.TrimSpace(record.ID))
}

func recordRouteKey(record admin.CMSContent) string {
	if routeKey := strings.TrimSpace(record.RouteKey); routeKey != "" {
		return routeKey
	}
	if routeKey := strings.TrimSpace(anyString(record.Data["route_key"])); routeKey != "" {
		return routeKey
	}
	return strings.TrimSpace(anyString(record.Metadata["route_key"]))
}

func localizedPathsFromGroup(group []admin.CMSContent, capability deliveryCapability) map[string]string {
	if len(group) == 0 {
		return nil
	}
	byLocale := map[string]string{}
	for _, record := range group {
		locale := strings.ToLower(strings.TrimSpace(firstNonEmpty(record.Locale, record.ResolvedLocale)))
		if locale == "" {
			continue
		}
		if _, exists := byLocale[locale]; exists {
			continue
		}
		path := recordDeliveryPath(record, capability)
		if path == "" {
			continue
		}
		byLocale[locale] = path
	}
	if len(byLocale) == 0 {
		return nil
	}
	return byLocale
}
