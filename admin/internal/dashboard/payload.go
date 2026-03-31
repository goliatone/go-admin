package dashboard

import (
	"regexp"
	"strings"
)

var widgetPayloadBlockedPattern = regexp.MustCompile(`(?is)<\s*(!doctype|html|head|body|script)\b`)

var widgetPayloadBlockedKeys = map[string]struct{}{
	"chart_html":          {},
	"chart_html_fragment": {},
}

// SanitizeWidgetData removes blocked payload fields and scrubs unsafe HTML-like values.
func SanitizeWidgetData(data map[string]any) map[string]any {
	if data == nil {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, value := range data {
		if _, blocked := widgetPayloadBlockedKeys[strings.ToLower(strings.TrimSpace(key))]; blocked {
			continue
		}
		out[key] = sanitizeWidgetValue(value)
	}
	return out
}

func sanitizeWidgetValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return SanitizeWidgetData(typed)
	case []any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, sanitizeWidgetValue(item))
		}
		return out
	case []map[string]any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, SanitizeWidgetData(item))
		}
		return out
	case string:
		if widgetPayloadBlockedPattern.MatchString(typed) {
			return ""
		}
		return typed
	default:
		return value
	}
}
