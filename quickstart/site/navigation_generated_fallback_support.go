package site

import (
	"fmt"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/internal/primitives"
)

func generatedFallbackPageKinds(types []admin.CMSContentType) map[string]bool {
	if len(types) == 0 {
		return nil
	}
	out := map[string]bool{}
	for _, contentType := range types {
		capability, ok := capabilityFromContentType(contentType)
		if !ok {
			continue
		}
		if capability.normalizedKind() == "page" {
			out[singularTypeSlug(capability.TypeSlug)] = true
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func generatedFallbackGroups(records []admin.CMSContent, pageKinds map[string]bool, state RequestState) map[string][]admin.CMSContent {
	if len(records) == 0 {
		return nil
	}
	byIdentity := map[string][]admin.CMSContent{}
	for _, record := range records {
		if !generatedFallbackEligible(record, pageKinds) {
			continue
		}
		if !publishedStatus(record.Status) && !previewAllowsRecord(record, deliveryCapability{TypeSlug: firstNonEmpty(record.ContentTypeSlug, record.ContentType)}, state) {
			continue
		}
		key := generatedContentIdentity(record)
		byIdentity[key] = append(byIdentity[key], record)
	}
	if len(byIdentity) == 0 {
		return nil
	}
	return byIdentity
}

func generatedFallbackItems(menuCode, location string, byIdentity map[string][]admin.CMSContent, state RequestState) []admin.MenuItem {
	if len(byIdentity) == 0 {
		return nil
	}
	keys := make([]string, 0, len(byIdentity))
	for key := range byIdentity {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	items := make([]admin.MenuItem, 0, len(keys))
	for index, key := range keys {
		selected := pickGeneratedLocaleRecord(byIdentity[key], state)
		if strings.TrimSpace(selected.ID) == "" {
			continue
		}
		if !generatedRecordVisibleForLocation(selected, location) {
			continue
		}
		href := generatedFallbackRecordPath(selected)
		if href == "" {
			continue
		}
		label := generatedFallbackRecordLabel(selected, href)
		itemID := generatedFallbackItemID(menuCode, href, index)
		items = append(items, admin.MenuItem{
			ID:    itemID,
			Code:  itemID,
			Type:  "item",
			Label: label,
			Target: map[string]any{
				"type":                "content",
				"key":                 href,
				"url":                 href,
				"active_match":        "prefix",
				"origin":              "generated_fallback",
				"contribution":        true,
				"contribution_origin": "generated_fallback",
			},
		})
	}
	if len(items) == 0 {
		return nil
	}
	return items
}

func generatedFallbackEligible(record admin.CMSContent, pageKinds map[string]bool) bool {
	typeSlug := singularTypeSlug(firstNonEmpty(record.ContentTypeSlug, record.ContentType))
	if typeSlug == "page" {
		return true
	}
	if len(pageKinds) == 0 {
		return false
	}
	return pageKinds[typeSlug]
}

func generatedContentIdentity(record admin.CMSContent) string {
	group := strings.TrimSpace(record.FamilyID)
	if group == "" && record.Data != nil {
		group = strings.TrimSpace(anyString(record.Data["family_id"]))
	}
	if group != "" {
		return strings.ToLower(group)
	}
	if slug := strings.TrimSpace(record.Slug); slug != "" {
		return strings.ToLower(firstNonEmpty(record.ContentTypeSlug, record.ContentType) + ":" + slug)
	}
	return strings.ToLower(firstNonEmpty(record.ContentTypeSlug, record.ContentType) + ":" + strings.TrimSpace(record.ID))
}

func pickGeneratedLocaleRecord(group []admin.CMSContent, state RequestState) admin.CMSContent {
	if len(group) == 0 {
		return admin.CMSContent{}
	}
	requestedLocale := normalizeRequestedLocale(state.Locale, state.DefaultLocale, state.SupportedLocales)
	if requested := filterByLocale(group, requestedLocale); len(requested) > 0 {
		return requested[0]
	}
	if state.AllowLocaleFallback {
		defaultLocale := normalizeRequestedLocale(state.DefaultLocale, requestedLocale, state.SupportedLocales)
		if preferred := filterByLocale(group, defaultLocale); len(preferred) > 0 {
			return preferred[0]
		}
	}
	for _, record := range group {
		if publishedStatus(record.Status) {
			return record
		}
	}
	return group[0]
}

func generatedFallbackRecordPath(record admin.CMSContent) string {
	if record.Data != nil {
		for _, key := range []string{"path", "url", "href"} {
			if raw := strings.TrimSpace(anyString(record.Data[key])); raw != "" {
				return normalizeNavigationPath(raw)
			}
		}
	}
	if slug := strings.TrimSpace(record.Slug); slug != "" {
		return normalizeNavigationPath("/" + slug)
	}
	return ""
}

func generatedFallbackRecordLabel(record admin.CMSContent, href string) string {
	if title := strings.TrimSpace(record.Title); title != "" {
		return title
	}
	if record.Data != nil {
		for _, key := range []string{"title", "name", "label"} {
			if raw := strings.TrimSpace(anyString(record.Data[key])); raw != "" {
				return raw
			}
		}
	}
	if slug := strings.TrimSpace(record.Slug); slug != "" {
		return slug
	}
	if href == "/" {
		return "Home"
	}
	return strings.Trim(strings.TrimSpace(href), "/")
}

func generatedFallbackItemID(menuCode, href string, index int) string {
	candidate := strings.Trim(strings.ToLower(href), "/")
	if candidate == "" {
		candidate = "home"
	}
	candidate = strings.NewReplacer("/", ".", "-", "_", " ", "_").Replace(candidate)
	menuCode = strings.TrimSpace(menuCode)
	menuCode = strings.NewReplacer("-", "_", " ", "_").Replace(menuCode)
	if menuCode == "" {
		menuCode = "site_generated"
	}
	return fmt.Sprintf("%s.%s_%d", menuCode, candidate, index+1)
}

func generatedRecordVisibleForLocation(record admin.CMSContent, location string) bool {
	location = strings.TrimSpace(location)
	if location == "" {
		return true
	}

	effective := navigationVisibilityBoolMap(record.Data["effective_navigation_visibility"])
	if value, ok := effective[location]; ok {
		return value
	}

	override := navigationVisibilityStringMap(record.Navigation)
	for key, value := range navigationVisibilityStringMap(anyMap(record.Data["_navigation"])) {
		if override == nil {
			override = map[string]string{}
		}
		if _, exists := override[key]; !exists {
			override[key] = value
		}
	}
	if value, ok := override[location]; ok {
		switch value {
		case "show":
			return true
		case "hide":
			return false
		}
	}

	effectiveLocations := normalizedStringSet(record.EffectiveMenuLocations)
	for _, candidate := range stringSliceFromAny(record.Data["effective_menu_locations"]) {
		if effectiveLocations == nil {
			effectiveLocations = map[string]struct{}{}
		}
		effectiveLocations[candidate] = struct{}{}
	}
	if len(effectiveLocations) > 0 {
		_, ok := effectiveLocations[location]
		return ok
	}
	return true
}

func navigationVisibilityStringMap(raw any) map[string]string {
	out := map[string]string{}
	switch typed := raw.(type) {
	case map[string]string:
		for key, value := range typed {
			key = strings.TrimSpace(key)
			value = strings.ToLower(strings.TrimSpace(value))
			if key == "" || value == "" {
				continue
			}
			out[key] = value
		}
	case map[string]any:
		for key, value := range typed {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			text := strings.ToLower(strings.TrimSpace(anyString(value)))
			if text == "" {
				continue
			}
			out[key] = text
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func navigationVisibilityBoolMap(raw any) map[string]bool {
	out := map[string]bool{}
	switch typed := raw.(type) {
	case map[string]bool:
		for key, value := range typed {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			out[key] = value
		}
	case map[string]any:
		for key, value := range typed {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			switch v := value.(type) {
			case bool:
				out[key] = v
			case string:
				v = strings.ToLower(strings.TrimSpace(v))
				switch v {
				case "1", "true", "yes", "on", "show":
					out[key] = true
				case "0", "false", "no", "off", "hide":
					out[key] = false
				}
			}
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func stringSliceFromAny(raw any) []string {
	return normalizeStringSlice(primitives.StringSliceFromAny(raw))
}

func normalizeStringSlice(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizedStringSet(values []string) map[string]struct{} {
	if len(values) == 0 {
		return nil
	}
	out := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out[value] = struct{}{}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
