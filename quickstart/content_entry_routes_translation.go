package quickstart

import (
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

func contentEntryPanelSupportsTranslationUX(panel *admin.Panel) bool {
	if panel == nil {
		return false
	}
	schema := panel.Schema()
	for _, action := range schema.Actions {
		if strings.EqualFold(strings.TrimSpace(action.Name), admin.CreateTranslationKey) {
			return true
		}
	}
	for _, field := range schema.ListFields {
		if strings.EqualFold(strings.TrimSpace(field.Name), "translation_group_id") {
			return true
		}
	}
	return false
}

func contentEntryTranslationDefaultViewMode(enabled bool) string {
	if enabled {
		return "grouped"
	}
	return ""
}

func contentEntryTranslationGroupByField(enabled bool) string {
	if enabled {
		return "translation_group_id"
	}
	return ""
}

type contentEntryTranslationState struct {
	RequestedLocale        string
	ResolvedLocale         string
	MissingRequestedLocale bool
	FallbackUsed           bool
	InFallbackMode         bool
}

func contentEntryTranslationStateFromRecord(record map[string]any) contentEntryTranslationState {
	state := contentEntryTranslationState{}
	if len(record) == 0 {
		return state
	}
	state.RequestedLocale = contentEntryStringField(record, []string{
		"requested_locale",
		"translation.meta.requested_locale",
		"content_translation.meta.requested_locale",
	})
	state.ResolvedLocale = contentEntryStringField(record, []string{
		"resolved_locale",
		"locale",
		"translation.meta.resolved_locale",
		"content_translation.meta.resolved_locale",
	})
	state.MissingRequestedLocale = contentEntryBoolField(record, []string{
		"missing_requested_locale",
		"translation.meta.missing_requested_locale",
		"content_translation.meta.missing_requested_locale",
	})
	state.FallbackUsed = contentEntryBoolField(record, []string{
		"fallback_used",
		"translation.meta.fallback_used",
		"content_translation.meta.fallback_used",
	})
	if !state.FallbackUsed && state.RequestedLocale != "" && state.ResolvedLocale != "" &&
		!strings.EqualFold(state.RequestedLocale, state.ResolvedLocale) {
		state.FallbackUsed = true
	}
	if !state.MissingRequestedLocale && state.FallbackUsed {
		state.MissingRequestedLocale = true
	}
	state.InFallbackMode = state.FallbackUsed || state.MissingRequestedLocale
	return state
}

func contentEntryTranslationGroupID(record map[string]any) string {
	return contentEntryStringField(record, []string{
		"translation_group_id",
		"translation.meta.translation_group_id",
		"content_translation.meta.translation_group_id",
	})
}

func contentEntryTranslationFamilyURL(urls urlkit.Resolver, groupID string) string {
	groupID = strings.TrimSpace(groupID)
	if groupID == "" {
		return ""
	}
	return strings.TrimSpace(resolveRouteURL(urls, "admin", "translations.families.id", map[string]string{
		"family_id": groupID,
	}, nil))
}

func contentEntryAttachTranslationFamilyLink(record map[string]any, urls urlkit.Resolver, enabled bool) map[string]any {
	if len(record) == 0 || !enabled {
		return record
	}
	groupID := contentEntryTranslationGroupID(record)
	familyURL := contentEntryTranslationFamilyURL(urls, groupID)
	if groupID == "" || familyURL == "" {
		return record
	}
	out := cloneAnyMap(record)
	out["translation_family_id"] = groupID
	out["translation_family_url"] = familyURL
	links, _ := out["links"].(map[string]any)
	linked := cloneAnyMap(links)
	if linked == nil {
		linked = map[string]any{}
	}
	linked["translation_family"] = map[string]any{
		"href":      familyURL,
		"family_id": groupID,
	}
	out["links"] = linked
	return out
}

func contentEntryAttachTranslationLocaleLinks(record map[string]any, routes contentEntryRoutes, editMode bool, enabled bool) map[string]any {
	if len(record) == 0 || !enabled {
		return record
	}
	recordID := strings.TrimSpace(anyToString(record["id"]))
	if recordID == "" {
		return record
	}
	locales := contentEntryTranslationLocales(record)
	if len(locales) == 0 {
		return record
	}

	links := map[string]any{}
	for _, locale := range locales {
		if locale == "" {
			continue
		}
		target := routes.show(recordID)
		if editMode {
			target = routes.edit(recordID)
		}
		links[locale] = appendQueryParam(target, "locale", locale)
	}
	if len(links) == 0 {
		return record
	}

	out := cloneAnyMap(record)
	out["translation_locale_urls"] = links
	nested, _ := out["links"].(map[string]any)
	linked := cloneAnyMap(nested)
	if linked == nil {
		linked = map[string]any{}
	}
	linked["translation_locales"] = links
	out["links"] = linked
	return out
}

func contentEntryRequestedLocale(c router.Context, fallback string) string {
	if c != nil {
		if locale := strings.TrimSpace(c.Query("locale")); locale != "" {
			return locale
		}
		if locale := strings.TrimSpace(c.Query("requested_locale")); locale != "" {
			return locale
		}
	}
	return strings.TrimSpace(fallback)
}

func contentEntryStringField(record map[string]any, paths []string) string {
	for _, path := range paths {
		value := contentEntryNestedValue(record, path)
		if value == nil {
			continue
		}
		if trimmed := strings.TrimSpace(anyToString(value)); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func contentEntryBoolField(record map[string]any, paths []string) bool {
	for _, path := range paths {
		value := contentEntryNestedValue(record, path)
		switch typed := value.(type) {
		case bool:
			return typed
		case string:
			switch strings.ToLower(strings.TrimSpace(typed)) {
			case "true", "1", "yes", "on":
				return true
			case "false", "0", "no", "off":
				return false
			}
		}
	}
	return false
}

func contentEntryTranslationLocales(record map[string]any) []string {
	set := map[string]struct{}{}
	for _, path := range []string{
		"available_locales",
		"translation_readiness.available_locales",
		"translation.meta.available_locales",
		"content_translation.meta.available_locales",
	} {
		for _, locale := range contentEntryStringSliceField(record, path) {
			normalized := strings.TrimSpace(strings.ToLower(locale))
			if normalized != "" {
				set[normalized] = struct{}{}
			}
		}
	}
	out := make([]string, 0, len(set))
	for locale := range set {
		out = append(out, locale)
	}
	sort.Strings(out)
	return out
}

func contentEntryStringSliceField(record map[string]any, lookupPath string) []string {
	value := contentEntryNestedValue(record, lookupPath)
	raw, ok := value.([]any)
	if !ok {
		if typed, ok := value.([]string); ok {
			out := make([]string, 0, len(typed))
			for _, entry := range typed {
				if normalized := strings.TrimSpace(entry); normalized != "" {
					out = append(out, normalized)
				}
			}
			return out
		}
		return nil
	}
	out := make([]string, 0, len(raw))
	for _, entry := range raw {
		if normalized := strings.TrimSpace(anyToString(entry)); normalized != "" {
			out = append(out, normalized)
		}
	}
	return out
}

func contentEntryNestedValue(record map[string]any, lookupPath string) any {
	lookupPath = strings.TrimSpace(lookupPath)
	if len(record) == 0 || lookupPath == "" {
		return nil
	}
	parts := strings.Split(lookupPath, ".")
	var current any = record
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			return nil
		}
		currentMap, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		next, exists := currentMap[part]
		if !exists {
			return nil
		}
		current = next
	}
	return current
}
