package admin

// Core dashboard widget payloads.

type UserStatsWidgetPayload struct {
	Title  string `json:"title"`
	Metric string `json:"metric"`
	Value  int    `json:"value"`
}

type QuickActionWidgetPayload struct {
	Label       string `json:"label"`
	URL         string `json:"url"`
	Icon        string `json:"icon,omitempty"`
	Method      string `json:"method,omitempty"`
	Description string `json:"description,omitempty"`
}

type QuickActionsWidgetPayload struct {
	Actions []QuickActionWidgetPayload `json:"actions"`
}

type ChartPointWidgetPayload struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

type LegacyChartSampleWidgetPayload struct {
	Title string                    `json:"title"`
	Type  string                    `json:"type"`
	Data  []ChartPointWidgetPayload `json:"data"`
}

type SettingOverviewValuePayload struct {
	Value      any    `json:"value"`
	Provenance string `json:"provenance"`
}

type SettingsOverviewWidgetPayload struct {
	Values map[string]SettingOverviewValuePayload `json:"values"`
}

type NotificationsWidgetPayload struct {
	Notifications []Notification `json:"notifications"`
	Unread        int            `json:"unread"`
}

type ActivityFeedWidgetPayload struct {
	Entries []ActivityEntry `json:"entries"`
}

type DebugPanelWidgetPayload struct {
	Panel string `json:"panel"`
	Label string `json:"label"`
	Icon  string `json:"icon,omitempty"`
	Data  any    `json:"data"`
}

type TranslationSummaryWidgetPayload struct {
	Total    int `json:"total"`
	Active   int `json:"active"`
	Overdue  int `json:"overdue"`
	Review   int `json:"review"`
	Approved int `json:"approved"`
}

type TranslationLinkWidgetPayload struct {
	Label       string            `json:"label"`
	ResolverKey string            `json:"resolver_key,omitempty"`
	Group       string            `json:"group,omitempty"`
	Route       string            `json:"route,omitempty"`
	URL         string            `json:"url,omitempty"`
	Query       map[string]string `json:"query,omitempty"`
}

type TranslationProgressWidgetPayload struct {
	Summary      TranslationSummaryWidgetPayload `json:"summary"`
	StatusCounts map[string]int                  `json:"status_counts"`
	LocaleCounts map[string]int                  `json:"locale_counts"`
	UpdatedAt    string                          `json:"updated_at"`
	Links        []TranslationLinkWidgetPayload  `json:"links"`
}
