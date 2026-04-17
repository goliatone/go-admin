package quickstart

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func templateTranslationArgs(defaultLocale string, args []any) (string, []any) {
	if len(args) == 0 {
		return strings.TrimSpace(defaultLocale), nil
	}
	if locale, ok := templateLocaleFromSubject(args[0], defaultLocale); ok {
		return locale, args[1:]
	}
	return strings.TrimSpace(defaultLocale), args
}

func templateTranslate(translator admin.Translator, locale string, keyRaw any, args ...any) string {
	key := strings.TrimSpace(fmt.Sprint(keyRaw))
	if key == "" {
		return ""
	}
	if translator == nil {
		return key
	}
	translated, err := translator.Translate(strings.TrimSpace(locale), key, args...)
	if err != nil {
		return key
	}
	translated = strings.TrimSpace(translated)
	if translated == "" {
		return key
	}
	return translated
}

func templateTranslateCount(translator admin.Translator, locale string, keyRaw any, countRaw any, args ...any) string {
	key := strings.TrimSpace(fmt.Sprint(keyRaw))
	if key == "" {
		return ""
	}
	count, ok := templateIntValue(countRaw)
	if !ok {
		return templateTranslate(translator, locale, key, append([]any{countRaw}, args...)...)
	}
	if countTranslator, ok := translator.(admin.CountTranslator); ok && countTranslator != nil {
		translated, err := countTranslator.TranslateCount(strings.TrimSpace(locale), key, count, args...)
		if err == nil {
			translated = strings.TrimSpace(translated)
			if translated != "" {
				return translated
			}
		}
	}
	return templateTranslate(translator, locale, key, append([]any{count}, args...)...)
}

func templateLocaleFromSubject(subject any, defaultLocale string) (string, bool) {
	switch typed := subject.(type) {
	case nil:
		return strings.TrimSpace(defaultLocale), false
	case map[string]any:
		if locale := localeFromTemplateMap(typed); locale != "" {
			return locale, true
		}
	case map[string]string:
		candidate := strings.TrimSpace(firstNonEmptyMapString(typed, "current_locale", "resolved_locale", "locale", "default_locale"))
		if candidate != "" {
			return candidate, true
		}
	}
	return strings.TrimSpace(defaultLocale), false
}

func localeFromTemplateMap(values map[string]any) string {
	for _, key := range []string{"current_locale", "resolved_locale", "locale", "default_locale"} {
		if locale := strings.TrimSpace(siteAnyString(values[key])); locale != "" {
			return locale
		}
	}
	if runtime := siteAnyMap(values["site_runtime"]); len(runtime) > 0 {
		for _, key := range []string{"locale", "resolved_locale", "current_locale", "default_locale"} {
			if locale := strings.TrimSpace(siteAnyString(runtime[key])); locale != "" {
				return locale
			}
		}
	}
	return ""
}

func firstNonEmptyMapString(values map[string]string, keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(values[key]); value != "" {
			return value
		}
	}
	return ""
}

func templateIntValue(raw any) (int, bool) {
	switch typed := raw.(type) {
	case int:
		return typed, true
	case int8:
		return int(typed), true
	case int16:
		return int(typed), true
	case int32:
		return int(typed), true
	case int64:
		return int(typed), true
	case uint:
		return int(typed), true
	case uint8:
		return int(typed), true
	case uint16:
		return int(typed), true
	case uint32:
		return int(typed), true
	case uint64:
		return int(typed), true
	case float32:
		return int(typed), true
	case float64:
		return int(typed), true
	case string:
		value := strings.TrimSpace(typed)
		if value == "" {
			return 0, false
		}
		parsed, err := strconv.Atoi(value)
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}
