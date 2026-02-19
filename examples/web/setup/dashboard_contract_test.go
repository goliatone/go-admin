package setup

import (
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
)

func TestValidateCanonicalWidgetPayload_Definitions(t *testing.T) {
	cases := []struct {
		name       string
		definition string
		payload    map[string]any
	}{
			{
				name:       "legacy chart sample",
				definition: admin.WidgetChartSample,
			payload:    toWidgetPayloadMap(LegacyChartSampleWidgetData{Disabled: true}),
		},
			{
				name:       "user stats",
				definition: admin.WidgetUserStats,
			payload: toWidgetPayloadMap(UserStatsWidgetData{
				Type:     "stat_card",
				StatType: "users",
				Total:    10,
				Active:   6,
				NewToday: 2,
				Trend:    "+12%",
				TrendUp:  true,
			}),
		},
			{
				name:       "content stats",
				definition: admin.WidgetContentStats,
			payload: toWidgetPayloadMap(ContentStatsWidgetData{
				Type:      "stat_card",
				StatType:  "content",
				Published: 7,
				Draft:     2,
				Scheduled: 1,
			}),
		},
			{
				name:       "storage stats",
				definition: admin.WidgetStorageStats,
			payload: toWidgetPayloadMap(StorageStatsWidgetData{
				Type:       "stat_card",
				StatType:   "storage",
				Used:       "21.4 GB",
				Total:      "100 GB",
				Percentage: 21,
			}),
		},
			{
				name:       "quick actions",
				definition: admin.WidgetQuickActions,
			payload: toWidgetPayloadMap(QuickActionsWidgetData{
				Actions: []QuickActionWidgetItem{{Label: "Invite", URL: "/admin/api/onboarding/invite", Method: "POST"}},
			}),
		},
			{
				name:       "activity feed",
				definition: admin.WidgetActivityFeed,
			payload:    toWidgetPayloadMap(ActivityFeedWidgetData{Entries: []admin.ActivityEntry{}}),
		},
			{
				name:       "user profile",
				definition: admin.WidgetUserProfileOverview,
			payload:    toWidgetPayloadMap(UserProfileOverviewWidgetData{Values: map[string]any{"Username": "superadmin"}}),
		},
			{
				name:       "system health",
				definition: admin.WidgetSystemHealth,
			payload: toWidgetPayloadMap(SystemHealthWidgetData{
				Status:     "healthy",
				Uptime:     "7d 12h",
				APILatency: "45ms",
				DBStatus:   "connected",
			}),
		},
			{
				name:       "chart",
				definition: admin.WidgetBarChart,
			payload: toWidgetPayloadMap(ChartWidgetData{
				ChartType:       "bar",
				Title:           "Monthly Content Creation",
				Theme:           "westeros",
				ChartAssetsHost: "/dashboard/assets/echarts/",
				ChartOptions: buildChartOptions("bar", map[string]any{
					"title":  "Monthly Content Creation",
					"x_axis": []string{"Jan", "Feb"},
					"series": []map[string]any{{"name": "Posts", "data": []float64{1, 2}}},
				}),
			}),
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if err := validateCanonicalWidgetPayload(tc.definition, tc.payload); err != nil {
				t.Fatalf("expected canonical payload to validate for %s: %v", tc.definition, err)
			}
		})
	}
}

func TestValidateCanonicalWidgetPayload_RejectsLegacyMarkup(t *testing.T) {
	payload := map[string]any{
		"chart_type":        "bar",
		"title":             "Bad payload",
		"theme":             "westeros",
		"chart_assets_host": "/dashboard/assets/echarts/",
		"chart_options":     map[string]any{"series": []any{}},
		"chart_html":        "<html><body><script>alert(1)</script></body></html>",
	}

	if err := validateCanonicalWidgetPayload(admin.WidgetBarChart, payload); err == nil {
		t.Fatalf("expected canonical validator to reject legacy chart_html payload")
	}
}
