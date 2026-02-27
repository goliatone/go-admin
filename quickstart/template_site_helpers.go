package quickstart

import "strings"

func siteLocaleItems(localeSwitcher any) []map[string]any {
	switcher := siteAnyMap(localeSwitcher)
	if len(switcher) == 0 {
		return []map[string]any{}
	}
	items := siteAnyMapSlice(switcher["items"])
	if len(items) == 0 {
		return []map[string]any{}
	}
	return items
}

func siteLocaleItem(localeSwitcher any, locale string) map[string]any {
	locale = strings.ToLower(strings.TrimSpace(locale))
	items := siteLocaleItems(localeSwitcher)
	if len(items) == 0 {
		return map[string]any{}
	}
	for _, item := range items {
		itemLocale := strings.ToLower(strings.TrimSpace(siteAnyString(item["locale"])))
		if locale != "" && itemLocale == locale {
			return item
		}
	}
	if locale == "" {
		for _, item := range items {
			if siteAnyBool(item["active"]) {
				return item
			}
		}
	}
	return map[string]any{}
}

func siteLocaleURL(localeSwitcher any, locale string) string {
	item := siteLocaleItem(localeSwitcher, locale)
	if len(item) == 0 {
		return ""
	}
	return strings.TrimSpace(siteAnyString(item["url"]))
}

func sitePreviewState(preview any) map[string]any {
	payload := siteAnyMap(preview)

	tokenPresent := siteAnyBool(payload["token_present"]) || siteAnyBool(payload["enabled"])
	tokenValid := siteAnyBool(payload["token_valid"])
	isPreview := siteAnyBool(payload["is_preview"])

	state := map[string]any{
		"token_present": tokenPresent,
		"token_valid":   tokenValid,
		"is_preview":    isPreview,
		"active":        isPreview,
		"status":        "inactive",
		"message":       "",
	}
	if isPreview {
		state["status"] = "preview"
		state["message"] = "Preview mode active"
		return state
	}
	if tokenPresent && !tokenValid {
		state["status"] = "invalid"
		state["message"] = "Preview token detected but invalid"
	}
	return state
}

func sitePreviewActive(preview any) bool {
	state := sitePreviewState(preview)
	return siteAnyBool(state["active"])
}

func siteMenuItems(menu any) []map[string]any {
	menuMap := siteAnyMap(menu)
	if len(menuMap) == 0 {
		if items := siteAnyMapSlice(menu); len(items) > 0 {
			return items
		}
		return []map[string]any{}
	}
	items := siteAnyMapSlice(menuMap["items"])
	if len(items) == 0 {
		return []map[string]any{}
	}
	return items
}

func siteMenuChildren(item any) []map[string]any {
	itemMap := siteAnyMap(item)
	if len(itemMap) == 0 {
		return []map[string]any{}
	}
	children := siteAnyMapSlice(itemMap["children"])
	if len(children) == 0 {
		return []map[string]any{}
	}
	return children
}

func siteMenuHasActive(menu any) bool {
	for _, item := range siteMenuItems(menu) {
		if siteAnyBool(item["active"]) || siteAnyBool(item["active_self"]) || siteAnyBool(item["active_ancestor"]) {
			return true
		}
		if siteMenuHasActive(item["children"]) {
			return true
		}
	}
	return false
}

func siteAnyMap(raw any) map[string]any {
	switch typed := raw.(type) {
	case map[string]any:
		return typed
	case map[string]string:
		out := map[string]any{}
		for key, value := range typed {
			out[key] = value
		}
		return out
	default:
		return map[string]any{}
	}
}

func siteAnyMapSlice(raw any) []map[string]any {
	switch typed := raw.(type) {
	case []map[string]any:
		return typed
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			asMap := siteAnyMap(item)
			if len(asMap) == 0 {
				continue
			}
			out = append(out, asMap)
		}
		return out
	default:
		return []map[string]any{}
	}
}

func siteAnyString(raw any) string {
	switch typed := raw.(type) {
	case string:
		return typed
	default:
		return ""
	}
}

func siteAnyBool(raw any) bool {
	switch typed := raw.(type) {
	case bool:
		return typed
	case string:
		value := strings.ToLower(strings.TrimSpace(typed))
		return value == "true" || value == "1" || value == "yes" || value == "on"
	default:
		return false
	}
}
