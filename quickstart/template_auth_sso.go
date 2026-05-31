package quickstart

import (
	"net/url"
	"strings"
)

func authSSOProviders(value any) []map[string]any {
	return normalizeAuthSSOProviders(value)
}

func normalizeAuthSSOProviders(value any) []map[string]any {
	items := authSSOProviderItems(value)
	if len(items) == 0 {
		return nil
	}

	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		label := strings.TrimSpace(authSSOProviderString(item, "label"))
		if label == "" {
			continue
		}

		disabledReason := strings.TrimSpace(authSSOProviderString(item, "disabled_reason"))
		loginURL := strings.TrimSpace(authSSOProviderString(item, "login_url"))
		if disabledReason == "" && !isUsableAuthSSOLoginURL(loginURL) {
			continue
		}
		if disabledReason != "" {
			loginURL = ""
		}

		out = append(out, map[string]any{
			"key":             strings.TrimSpace(authSSOProviderString(item, "key")),
			"label":           label,
			"login_url":       loginURL,
			"icon_class":      strings.TrimSpace(authSSOProviderString(item, "icon_class")),
			"icon_url":        strings.TrimSpace(authSSOProviderString(item, "icon_url")),
			"disabled_reason": disabledReason,
			"disabled":        disabledReason != "",
		})
	}
	return out
}

func authSSOProviderItems(value any) []map[string]any {
	switch typed := value.(type) {
	case nil:
		return nil
	case []map[string]any:
		return typed
	case []map[string]string:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, stringMapToAnyMap(item))
		}
		return out
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			if normalized := authSSOProviderMap(item); normalized != nil {
				out = append(out, normalized)
			}
		}
		return out
	default:
		if normalized := authSSOProviderMap(typed); normalized != nil {
			return []map[string]any{normalized}
		}
	}
	return nil
}

func authSSOProviderMap(value any) map[string]any {
	switch typed := value.(type) {
	case map[string]any:
		return typed
	case map[string]string:
		return stringMapToAnyMap(typed)
	case map[any]any:
		out := make(map[string]any, len(typed))
		for key, val := range typed {
			name := strings.TrimSpace(anyToString(key))
			if name != "" {
				out[name] = val
			}
		}
		return out
	default:
		return nil
	}
}

func stringMapToAnyMap(in map[string]string) map[string]any {
	out := make(map[string]any, len(in))
	for key, val := range in {
		out[key] = val
	}
	return out
}

func authSSOProviderString(item map[string]any, key string) string {
	if item == nil {
		return ""
	}
	return anyToString(item[key])
}

func isUsableAuthSSOLoginURL(raw string) bool {
	raw = strings.TrimSpace(raw)
	if raw == "" || strings.ContainsAny(raw, "\x00\r\n\t") {
		return false
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	if parsed.Scheme == "" {
		return true
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		return true
	default:
		return false
	}
}
