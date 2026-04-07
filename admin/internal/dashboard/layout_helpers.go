package dashboard

import (
	"encoding/json"
	"sort"
	"strconv"
	"strings"

	uiplacement "github.com/goliatone/go-admin/ui/placement"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

const widgetViewModelMetadataKey = "dashboard.widget.view_model"

// OrderedAreaCodes returns dashboard layout areas in preferred order with extras sorted.
func OrderedAreaCodes(areaMap map[string][]dashcmp.WidgetInstance) []string {
	preferred := uiplacement.PreferredDashboardAreaCodes()
	seen := map[string]bool{}
	order := []string{}
	for _, code := range preferred {
		if _, ok := areaMap[code]; ok {
			order = append(order, code)
			seen[code] = true
		}
	}
	extras := []string{}
	for code := range areaMap {
		if seen[code] {
			continue
		}
		extras = append(extras, code)
	}
	sort.Strings(extras)
	return append(order, extras...)
}

// ExtractWidgetData returns widget data from metadata in canonical map form.
func ExtractWidgetData(meta map[string]any) map[string]any {
	if meta == nil {
		return nil
	}
	if rawView, ok := meta[widgetViewModelMetadataKey]; ok {
		if view, ok := rawView.(dashcmp.WidgetViewModel); ok {
			serialized, err := view.Serialize()
			if err != nil {
				return nil
			}
			return normalizeWidgetData(serialized)
		}
		return normalizeWidgetData(rawView)
	}
	switch data := meta["data"].(type) {
	case map[string]any:
		return data
	case dashcmp.WidgetData:
		return map[string]any(data)
	}
	return nil
}

func normalizeWidgetData(data any) map[string]any {
	switch typed := data.(type) {
	case nil:
		return nil
	case map[string]any:
		return typed
	case dashcmp.WidgetData:
		return map[string]any(typed)
	}
	payload, err := json.Marshal(data)
	if err != nil {
		return nil
	}
	var decoded any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		return nil
	}
	mapped, _ := decoded.(map[string]any)
	return mapped
}

// SpanFromMetadata extracts the widget width/span from layout metadata.
func SpanFromMetadata(meta map[string]any) int {
	if meta == nil {
		return 0
	}
	if layout, ok := meta["layout"].(map[string]any); ok {
		if width := NumericToInt(layout["width"]); width > 0 {
			return width
		}
	}
	return NumericToInt(meta["width"])
}

// HiddenFromMetadata reports whether metadata marks the widget hidden.
func HiddenFromMetadata(meta map[string]any) bool {
	if meta == nil {
		return false
	}
	if hidden, ok := meta["hidden"].(bool); ok {
		return hidden
	}
	return false
}

// OrderFromMetadata extracts explicit widget ordering from metadata.
func OrderFromMetadata(meta map[string]any) int {
	if meta == nil {
		return -1
	}
	return NumericToInt(meta["order"])
}

// LocaleFromMetadata extracts an optional widget locale from metadata.
func LocaleFromMetadata(meta map[string]any) string {
	if meta == nil {
		return ""
	}
	if locale, ok := meta["locale"].(string); ok {
		return locale
	}
	return ""
}

// NumericToInt coerces numeric-ish values used in dashboard metadata.
func NumericToInt(val any) int {
	switch v := val.(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float32:
		if v == 0 {
			return 0
		}
		return int(v)
	case float64:
		if v == 0 {
			return 0
		}
		return int(v)
	case string:
		if strings.TrimSpace(v) == "" {
			return -1
		}
		if parsed, err := strconv.Atoi(strings.TrimSpace(v)); err == nil {
			return parsed
		}
	}
	return -1
}
