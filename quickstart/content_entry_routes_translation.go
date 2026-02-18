package quickstart

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
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
