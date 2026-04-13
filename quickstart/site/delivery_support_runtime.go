package site

import (
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func matchRoutePattern(pattern, requestPath string) (map[string]string, bool) {
	pattern = normalizeLocalePath(pattern)
	requestPath = normalizeLocalePath(requestPath)
	if pattern == "/" && requestPath == "/" {
		return map[string]string{}, true
	}
	patternSegments := splitPathSegments(pattern)
	requestSegments := splitPathSegments(requestPath)
	if len(patternSegments) != len(requestSegments) {
		return nil, false
	}
	params := map[string]string{}
	for i, segment := range patternSegments {
		value := requestSegments[i]
		if after, ok := strings.CutPrefix(segment, ":"); ok {
			key := after
			if key == "" {
				return nil, false
			}
			params[key] = value
			continue
		}
		if !strings.EqualFold(segment, value) {
			return nil, false
		}
	}
	return params, true
}

func splitPathSegments(path string) []string {
	path = normalizeLocalePath(path)
	if path == "/" {
		return nil
	}
	trimmed := strings.Trim(path, "/")
	if trimmed == "" {
		return nil
	}
	return strings.Split(trimmed, "/")
}

func pathsMatch(left, right string) bool {
	return normalizeLocalePath(left) == normalizeLocalePath(right)
}

func matchesCapabilityType(record admin.CMSContent, typeSlug string) bool {
	target := strings.ToLower(strings.TrimSpace(typeSlug))
	if target == "" {
		return false
	}
	candidates := []string{
		record.ContentTypeSlug,
		record.ContentType,
	}
	for _, candidate := range candidates {
		candidate = strings.ToLower(strings.TrimSpace(candidate))
		if candidate == "" {
			continue
		}
		if candidate == target {
			return true
		}
		if singularTypeSlug(candidate) == singularTypeSlug(target) {
			return true
		}
	}
	return false
}

func recordVisibleForRequest(record admin.CMSContent, capability deliveryCapability, state RequestState) bool {
	if publishedStatus(record.Status) {
		return true
	}
	return previewAllowsRecord(record, capability, state)
}

func publishedStatus(status string) bool {
	return strings.EqualFold(strings.TrimSpace(status), "published")
}

func filterByLocale(records []admin.CMSContent, locale string) []admin.CMSContent {
	locale = strings.ToLower(strings.TrimSpace(locale))
	if locale == "" {
		return records
	}
	out := make([]admin.CMSContent, 0, len(records))
	for _, record := range records {
		recordLocale := strings.ToLower(strings.TrimSpace(firstNonEmpty(record.ResolvedLocale, record.Locale)))
		if recordLocale == locale {
			out = append(out, record)
		}
	}
	return out
}

func pickPreferredRecord(records []admin.CMSContent, state RequestState, capability deliveryCapability) admin.CMSContent {
	if len(records) == 0 {
		return admin.CMSContent{}
	}
	if state.PreviewTokenValid {
		for _, record := range records {
			if strings.TrimSpace(record.ID) == strings.TrimSpace(state.PreviewContentID) &&
				previewRecordMatchesEntityType(state.PreviewEntityType, capability, record) {
				return record
			}
		}
	}
	for _, record := range records {
		if publishedStatus(record.Status) {
			return record
		}
	}
	sort.SliceStable(records, func(i, j int) bool {
		return strings.TrimSpace(records[i].ID) < strings.TrimSpace(records[j].ID)
	})
	return records[0]
}

func uniqueLocaleOrder(groups ...[]string) []string {
	if len(groups) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := []string{}
	for _, group := range groups {
		for _, locale := range group {
			locale = strings.ToLower(strings.TrimSpace(locale))
			if locale == "" {
				continue
			}
			if _, ok := seen[locale]; ok {
				continue
			}
			seen[locale] = struct{}{}
			out = append(out, locale)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func deliveryRequestMatchPath(strict bool, record admin.CMSContent, capability deliveryCapability, supportedLocales []string) string {
	if strict {
		return recordStoredDeliveryPath(record, capability)
	}
	path := recordDeliveryPath(record, capability)
	if canonical, locale := StripSupportedLocalePrefix(path, supportedLocales); locale != "" {
		return canonical
	}
	return path
}

func ambiguousLocaleCandidates(candidates []admin.CMSContent, requestedLocale, defaultLocale string, supported []string, capability deliveryCapability) bool {
	if len(candidates) < 2 {
		return false
	}
	targets := []admin.CMSContent{}
	requestedLocale = normalizeRequestedLocale(requestedLocale, defaultLocale, supported)
	if requestedLocale != "" {
		targets = filterByLocale(candidates, requestedLocale)
	}
	if len(targets) == 0 {
		fallbackLocale := normalizeRequestedLocale(defaultLocale, requestedLocale, supported)
		if fallbackLocale != "" {
			targets = filterByLocale(candidates, fallbackLocale)
		}
	}
	if len(targets) == 0 {
		targets = candidates
	}
	identities := map[string]struct{}{}
	for _, candidate := range targets {
		key := strings.TrimSpace(contentIdentityKey(candidate, capability))
		if key == "" {
			key = strings.TrimSpace(candidate.ID)
		}
		if key == "" {
			continue
		}
		identities[key] = struct{}{}
		if len(identities) > 1 {
			return true
		}
	}
	return false
}
