package site

import (
	"strings"

	router "github.com/goliatone/go-router"
)

func queryBoolValue(c router.Context, key string, fallback bool) bool {
	if c == nil {
		return fallback
	}
	value := strings.ToLower(strings.TrimSpace(c.Query(key)))
	if value == "" {
		return fallback
	}
	switch value {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func queryValue(c router.Context, key string) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(c.Query(key))
}

func navigationDebugEnabled(c router.Context) bool {
	return queryBoolValue(c, "nav_debug", false) || queryBoolValue(c, "debug_navigation", false)
}

func emptyResolvedMenu(location, code, activePath string) map[string]any {
	return map[string]any{
		"location":         strings.TrimSpace(location),
		"code":             strings.TrimSpace(code),
		"source":           "empty",
		"active_path":      normalizeNavigationPath(activePath),
		"items":            []map[string]any{},
		"include_drafts":   false,
		"include_preview":  false,
		"include_debug":    false,
		"include_fallback": false,
	}
}

func toMenuItemsContract(raw any) []map[string]any {
	items, ok := raw.([]map[string]any)
	if !ok || len(items) == 0 {
		return []map[string]any{}
	}
	return items
}
