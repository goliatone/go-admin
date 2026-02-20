package setup

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
)

// Canonical widget payload view-models for example dashboard providers.
// These types keep server and client rendering contracts aligned.

type LegacyChartSampleWidgetData struct {
	Disabled bool `json:"disabled"`
}

type UserStatsWidgetData struct {
	Type     string `json:"type"`
	StatType string `json:"stat_type"`
	Total    int    `json:"total"`
	Active   int    `json:"active"`
	NewToday int    `json:"new_today"`
	Trend    string `json:"trend"`
	TrendUp  bool   `json:"trend_up"`
}

type ContentStatsWidgetData struct {
	Type      string `json:"type"`
	StatType  string `json:"stat_type"`
	Published int    `json:"published"`
	Draft     int    `json:"draft"`
	Scheduled int    `json:"scheduled"`
}

type StorageStatsWidgetData struct {
	Type       string `json:"type"`
	StatType   string `json:"stat_type"`
	Used       string `json:"used"`
	Total      string `json:"total"`
	Percentage int    `json:"percentage"`
}

type QuickActionWidgetItem struct {
	Label       string `json:"label"`
	URL         string `json:"url"`
	Icon        string `json:"icon,omitempty"`
	Method      string `json:"method,omitempty"`
	Description string `json:"description,omitempty"`
}

type QuickActionsWidgetData struct {
	Actions []QuickActionWidgetItem `json:"actions"`
}

type ActivityFeedWidgetData struct {
	Entries []admin.ActivityEntry `json:"entries"`
}

type UserProfileOverviewWidgetData struct {
	Values map[string]string `json:"values"`
}

type SystemHealthWidgetData struct {
	Status     string `json:"status"`
	Uptime     string `json:"uptime"`
	APILatency string `json:"api_latency"`
	DBStatus   string `json:"db_status"`
}

type ChartWidgetData struct {
	ChartType       string         `json:"chart_type"`
	Title           string         `json:"title"`
	Subtitle        string         `json:"subtitle,omitempty"`
	Theme           string         `json:"theme"`
	ChartAssetsHost string         `json:"chart_assets_host"`
	ChartOptions    map[string]any `json:"chart_options"`
	FooterNote      string         `json:"footer_note,omitempty"`
}

func toCanonicalWidgetPayload(model any) admin.WidgetPayload {
	if model == nil {
		return admin.EmptyWidgetPayload()
	}
	return admin.WidgetPayloadOf(model)
}

func toWidgetPayload(model any) admin.WidgetPayload {
	if model == nil {
		return admin.EmptyWidgetPayload()
	}
	return toCanonicalWidgetPayload(model)
}

func canonicalPayloadMap(model any) (map[string]any, error) {
	if model == nil {
		return map[string]any{}, nil
	}
	raw, err := json.Marshal(model)
	if err != nil {
		return nil, fmt.Errorf("marshal canonical payload: %w", err)
	}
	out := map[string]any{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("unmarshal canonical payload: %w", err)
	}
	return out, nil
}

func canonicalQuickAction(item map[string]any) QuickActionWidgetItem {
	return QuickActionWidgetItem{
		Label:       strings.TrimSpace(toString(item["label"])),
		URL:         strings.TrimSpace(toString(item["url"])),
		Icon:        strings.TrimSpace(toString(item["icon"])),
		Method:      strings.ToUpper(strings.TrimSpace(toString(item["method"]))),
		Description: strings.TrimSpace(toString(item["description"])),
	}
}

func toCanonicalQuickActions(items []map[string]any) []QuickActionWidgetItem {
	out := make([]QuickActionWidgetItem, 0, len(items))
	for _, item := range items {
		action := canonicalQuickAction(item)
		action = canonicalQuickActionItem(action)
		out = append(out, action)
	}
	return out
}

func canonicalQuickActionItem(item QuickActionWidgetItem) QuickActionWidgetItem {
	item.Label = strings.TrimSpace(item.Label)
	item.URL = strings.TrimSpace(item.URL)
	item.Icon = strings.TrimSpace(item.Icon)
	item.Method = strings.ToUpper(strings.TrimSpace(item.Method))
	item.Description = strings.TrimSpace(item.Description)
	if item.Label == "" {
		item.Label = "Action"
	}
	if item.URL == "" {
		item.URL = "#"
	}
	return item
}

func toCanonicalQuickActionItems(items []QuickActionWidgetItem) []QuickActionWidgetItem {
	out := make([]QuickActionWidgetItem, 0, len(items))
	for _, item := range items {
		action := canonicalQuickActionItem(item)
		out = append(out, action)
	}
	return out
}

func validateCanonicalWidgetModel(definition string, model any) error {
	payload, err := canonicalPayloadMap(model)
	if err != nil {
		return err
	}
	return validateCanonicalWidgetPayloadMap(definition, payload)
}

func validateCanonicalWidgetPayloadMap(definition string, payload map[string]any) error {
	def := strings.TrimSpace(definition)
	if payload == nil {
		return fmt.Errorf("widget payload is nil")
	}
	if containsDisallowedWidgetMarkup(payload) {
		return fmt.Errorf("widget payload contains disallowed markup")
	}

	switch def {
	case admin.WidgetChartSample:
		return requireWidgetKeys(payload, "disabled")
	case admin.WidgetUserStats:
		return requireWidgetKeys(payload, "type", "stat_type", "total", "active", "new_today")
	case admin.WidgetContentStats:
		return requireWidgetKeys(payload, "type", "stat_type", "published", "draft", "scheduled")
	case admin.WidgetStorageStats:
		return requireWidgetKeys(payload, "type", "stat_type", "used", "total", "percentage")
	case admin.WidgetQuickActions:
		if err := requireWidgetKeys(payload, "actions"); err != nil {
			return err
		}
		raw, ok := payload["actions"].([]any)
		if !ok {
			return fmt.Errorf("quick_actions.actions must be an array")
		}
		for _, item := range raw {
			action, ok := item.(map[string]any)
			if !ok {
				return fmt.Errorf("quick_actions item must be an object")
			}
			if err := requireWidgetKeys(action, "label", "url"); err != nil {
				return fmt.Errorf("quick_actions item contract: %w", err)
			}
		}
		return nil
	case admin.WidgetActivityFeed, admin.WidgetUserActivityFeed:
		return requireWidgetKeys(payload, "entries")
	case admin.WidgetUserProfileOverview:
		return requireWidgetKeys(payload, "values")
	case admin.WidgetSystemHealth:
		return requireWidgetKeys(payload, "status", "uptime", "api_latency", "db_status")
	case admin.WidgetBarChart,
		admin.WidgetLineChart,
		admin.WidgetPieChart,
		admin.WidgetGaugeChart,
		admin.WidgetScatterChart:
		if err := requireWidgetKeys(payload, "chart_type", "title", "theme", "chart_assets_host", "chart_options"); err != nil {
			return err
		}
		if _, hasLegacyHTML := payload["chart_html"]; hasLegacyHTML {
			return fmt.Errorf("chart payload must not include chart_html")
		}
		if _, hasLegacyFragment := payload["chart_html_fragment"]; hasLegacyFragment {
			return fmt.Errorf("chart payload must not include chart_html_fragment")
		}
		return nil
	default:
		return nil
	}
}

func requireWidgetKeys(payload map[string]any, keys ...string) error {
	for _, key := range keys {
		value, ok := payload[key]
		if !ok || value == nil {
			return fmt.Errorf("missing required key %q", key)
		}
	}
	return nil
}

func containsDisallowedWidgetMarkup(value any) bool {
	switch typed := value.(type) {
	case map[string]any:
		for _, item := range typed {
			if containsDisallowedWidgetMarkup(item) {
				return true
			}
		}
		return false
	case []any:
		for _, item := range typed {
			if containsDisallowedWidgetMarkup(item) {
				return true
			}
		}
		return false
	case string:
		lowered := strings.ToLower(strings.TrimSpace(typed))
		return strings.Contains(lowered, "<script") ||
			strings.Contains(lowered, "<!doctype") ||
			strings.Contains(lowered, "<html") ||
			strings.Contains(lowered, "<head") ||
			strings.Contains(lowered, "<body")
	default:
		return false
	}
}
