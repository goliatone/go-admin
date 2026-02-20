package setup

import (
	"log"
	"path"
	"strings"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-dashboard/components/dashboard"
)

type quickActionsWidgetConfig struct {
	Actions []QuickActionWidgetItem `json:"actions"`
}

type activityFeedWidgetConfig struct {
	Limit   int    `json:"limit"`
	Channel string `json:"channel"`
}

type userProfileOverviewWidgetConfig struct {
	Values map[string]any `json:"values"`
}

// SetupDashboard configures dashboard widgets for the admin panel
func SetupDashboard(adm *admin.Admin, dataStores *stores.DataStores, basePath string) {
	dash := adm.Dashboard()
	basePath = "/" + strings.Trim(strings.TrimSpace(basePath), "/")
	if basePath == "/" {
		basePath = "/admin"
	}

	// Override the default chart_sample widget to prevent old chart from showing
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code: admin.WidgetChartSample,
		Name: "Disabled Legacy Chart",
		// NO DefaultArea - prevents creating default instance
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			log.Printf("WARNING: Legacy chart_sample handler was called! This widget instance should have been removed. Config: %+v", cfg)
			_ = ctx
			// This provider should never be used, but contract stays canonical.
			return toWidgetPayload(LegacyChartSampleWidgetData{Disabled: true}), nil
		},
	})

	// User stats widget (override default, no DefaultArea to avoid duplicates)
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code: admin.WidgetUserStats,
		Name: "User Stats",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			stats := dataStores.Stats.GetUserStats()
			_ = ctx
			_ = cfg
			return toWidgetPayload(UserStatsWidgetData{
				Type:     "stat_card",
				StatType: "users",
				Total:    intFromAny(stats["total"]),
				Active:   intFromAny(stats["active"]),
				NewToday: intFromAny(stats["new_today"]),
				Trend:    "+12%",
				TrendUp:  true,
			}), nil
		},
	})

	// Content stats widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        admin.WidgetContentStats,
		Name:        "Content Stats",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			stats := dataStores.Stats.GetContentStats()
			_ = ctx
			_ = cfg
			return toWidgetPayload(ContentStatsWidgetData{
				Type:      "stat_card",
				StatType:  "content",
				Published: intFromAny(stats["published"]),
				Draft:     intFromAny(stats["draft"]),
				Scheduled: intFromAny(stats["scheduled"]),
			}), nil
		},
	})

	// Storage stats widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        admin.WidgetStorageStats,
		Name:        "Storage Stats",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			stats := dataStores.Stats.GetStorageStats()
			_ = ctx
			_ = cfg
			return toWidgetPayload(StorageStatsWidgetData{
				Type:       "stat_card",
				StatType:   "storage",
				Used:       chartString(stats["used"], ""),
				Total:      chartString(stats["total"], ""),
				Percentage: intFromAny(stats["percentage"]),
			}), nil
		},
	})

	// Quick actions widget (override default, no DefaultArea to avoid duplicates)
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code: admin.WidgetQuickActions,
		Name: "User Quick Actions",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			resolvedCfg, err := admin.DecodeWidgetConfig[quickActionsWidgetConfig](cfg)
			if err != nil {
				return admin.WidgetPayload{}, err
			}
			_ = ctx
			inviteURL := path.Join(basePath, "api", "onboarding", "invite")
			resetURL := path.Join(basePath, "api", "onboarding", "password", "reset", "request")
			lifecycleURL := path.Join(basePath, "api", "users") + "?status=suspended"
			defaultActions := []QuickActionWidgetItem{
				{
					Label:       "Invite user",
					URL:         inviteURL,
					Icon:        "user-plus",
					Method:      "POST",
					Description: "POST {email, role, status} to issue an invite token",
				},
				{
					Label:       "Request password reset",
					URL:         resetURL,
					Icon:        "key",
					Method:      "POST",
					Description: "POST {identifier} to send a reset token",
				},
				{
					Label:       "Review suspended users",
					URL:         lifecycleURL,
					Icon:        "shield-check",
					Method:      "GET",
					Description: "Open suspended accounts for lifecycle actions",
				},
			}

			actions := append([]QuickActionWidgetItem{}, defaultActions...)
			if len(resolvedCfg.Actions) > 0 {
				actions = append([]QuickActionWidgetItem{}, resolvedCfg.Actions...)
			}
			return toWidgetPayload(QuickActionsWidgetData{
				Actions: toCanonicalQuickActionItems(actions),
			}), nil
		},
	})

	// Activity widget focused on user channel
	activitySink := adm.ActivityFeed()
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code: admin.WidgetActivityFeed,
		Name: "User Activity",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			resolvedCfg, err := admin.DecodeWidgetConfig[activityFeedWidgetConfig](cfg)
			if err != nil {
				return admin.WidgetPayload{}, err
			}
			if activitySink == nil {
				return toWidgetPayload(ActivityFeedWidgetData{Entries: []admin.ActivityEntry{}}), nil
			}

			limit := resolvedCfg.Limit
			if limit <= 0 {
				limit = 5
			}

			channel := strings.TrimSpace(resolvedCfg.Channel)
			if channel == "" {
				channel = "users"
			}

			entries, err := activitySink.List(ctx.Context, limit, admin.ActivityFilter{Channel: channel})
			if err != nil {
				return admin.WidgetPayload{}, err
			}
			return toWidgetPayload(ActivityFeedWidgetData{Entries: entries}), nil
		},
	})

	registerUserDetailWidgets(dash, activitySink)

	// System health widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        admin.WidgetSystemHealth,
		Name:        "System Health",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return toWidgetPayload(SystemHealthWidgetData{
				Status:     "healthy",
				Uptime:     "7d 12h",
				APILatency: "45ms",
				DBStatus:   "connected",
			}), nil
		},
	})

	// Register ECharts chart widgets
	registerChartWidgets(dash, dataStores)
}

func registerUserDetailWidgets(dash *admin.Dashboard, activitySink admin.ActivitySink) {
	if dash == nil {
		return
	}
	dash.RegisterArea(admin.WidgetAreaDefinition{
		Code:  helpers.UserProfileAreaCode,
		Name:  "User Profile",
		Scope: helpers.UserDetailAreaScope,
	})
	dash.RegisterArea(admin.WidgetAreaDefinition{
		Code:  helpers.UserActivityAreaCode,
		Name:  "User Activity",
		Scope: helpers.UserDetailAreaScope,
	})
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        helpers.UserProfileWidgetCode,
		Name:        helpers.UserProfileWidgetLabel,
		DefaultArea: helpers.UserProfileAreaCode,
		DefaultConfig: map[string]any{
			"values": map[string]any{
				"Username": "",
				"Email":    "",
				"Role":     "",
				"Status":   "",
				"Created":  "",
			},
		},
		Handler: func(_ admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			resolvedCfg, err := admin.DecodeWidgetConfig[userProfileOverviewWidgetConfig](cfg)
			if err != nil {
				return admin.WidgetPayload{}, err
			}
			values := resolvedCfg.Values
			if values == nil {
				values = map[string]any{}
			}
			return toWidgetPayload(UserProfileOverviewWidgetData{Values: toStringMap(values)}), nil
		},
	})
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        helpers.UserActivityWidgetCode,
		Name:        helpers.UserActivityWidgetLabel,
		DefaultArea: helpers.UserActivityAreaCode,
		DefaultConfig: map[string]any{
			"limit":   5,
			"channel": "users",
		},
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			resolvedCfg, err := admin.DecodeWidgetConfig[activityFeedWidgetConfig](cfg)
			if err != nil {
				return admin.WidgetPayload{}, err
			}
			if activitySink == nil {
				return toWidgetPayload(ActivityFeedWidgetData{Entries: []admin.ActivityEntry{}}), nil
			}
			limit := resolvedCfg.Limit
			if limit <= 0 {
				limit = 5
			}
			channel := strings.TrimSpace(resolvedCfg.Channel)
			if channel == "" {
				channel = "users"
			}
			entries, err := activitySink.List(ctx.Context, limit, admin.ActivityFilter{Channel: channel})
			if err != nil {
				return admin.WidgetPayload{}, err
			}
			return toWidgetPayload(ActivityFeedWidgetData{Entries: entries}), nil
		},
	})
}

// registerChartWidgets sets up ECharts-based chart widgets
func registerChartWidgets(dash *admin.Dashboard, dataStores *stores.DataStores) {
	// Use go-dashboard's configured assets host for runtime chart hydration.
	cdnHost := dashboard.DefaultEChartsAssetsHost()

	// Bar chart widget - Monthly content creation
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        admin.WidgetBarChart,
		Name:        "Monthly Content",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return buildCanonicalChartPayload("bar", map[string]any{
				"title":    "Monthly Content Creation",
				"subtitle": "Posts and pages published",
				"x_axis":   []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun"},
				"series": []map[string]any{
					{"name": "Posts", "data": []float64{12, 19, 15, 22, 18, 25}},
					{"name": "Pages", "data": []float64{5, 7, 6, 9, 8, 11}},
				},
			}, cdnHost), nil
		},
	})

	// Line chart widget - User growth
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        admin.WidgetLineChart,
		Name:        "User Growth",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			stats := dataStores.Stats.GetUserStats()
			total := stats["total"].(int)

			// Generate growth data (simulated weekly growth)
			weeks := []string{"Week 1", "Week 2", "Week 3", "Week 4"}
			activeUsers := make([]float64, 4)
			newSignups := make([]float64, 4)

			for i := 0; i < 4; i++ {
				activeUsers[i] = float64(total) * (0.7 + float64(i)*0.075)
				newSignups[i] = float64(total) * (0.05 + float64(i)*0.015)
			}

			_ = ctx
			_ = cfg
			return buildCanonicalChartPayload("line", map[string]any{
				"title":  "User Growth Trend",
				"x_axis": weeks,
				"series": []map[string]any{
					{"name": "Active Users", "data": activeUsers},
					{"name": "New Signups", "data": newSignups},
				},
				"footer_note": "Data refreshed daily",
			}, cdnHost), nil
		},
	})

	// Pie chart widget - Content distribution
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        admin.WidgetPieChart,
		Name:        "Content Distribution",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			contentStats := dataStores.Stats.GetContentStats()
			_ = ctx
			_ = cfg
			return buildCanonicalChartPayload("pie", map[string]any{
				"title": "Content Status",
				"series": []map[string]any{
					{
						"name": "Content",
						"data": []map[string]any{
							{"name": "Published", "value": contentStats["published"]},
							{"name": "Draft", "value": contentStats["draft"]},
							{"name": "Scheduled", "value": contentStats["scheduled"]},
						},
					},
				},
			}, cdnHost), nil
		},
	})

	// Gauge chart widget - Storage usage
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        admin.WidgetGaugeChart,
		Name:        "Storage Usage",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			storageStats := dataStores.Stats.GetStorageStats()
			// Convert percentage to float64 (it comes as int)
			percentageVal := storageStats["percentage"]
			var percentage float64
			switch v := percentageVal.(type) {
			case int:
				percentage = float64(v)
			case float64:
				percentage = v
			default:
				percentage = 0
			}

			_ = ctx
			_ = cfg
			return buildCanonicalChartPayload("gauge", map[string]any{
				"title": "Storage Utilization",
				"series": []map[string]any{
					{"name": "Usage", "data": []float64{percentage}},
				},
				"theme": "wonderland",
			}, cdnHost), nil
		},
	})

	// Scatter chart widget - Correlation analysis
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        admin.WidgetScatterChart,
		Name:        "Engagement vs Retention",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (admin.WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return buildCanonicalChartPayload("scatter", map[string]any{
				"title":    "User Engagement vs Retention",
				"subtitle": "Weekly cohort analysis",
				"series": []map[string]any{
					{
						"name": "Week 1",
						"data": []map[string]any{
							{"name": "High Engagement", "x": 92, "y": 88},
							{"name": "Medium Engagement", "x": 75, "y": 72},
							{"name": "Low Engagement", "x": 45, "y": 38},
						},
					},
					{
						"name": "Week 2",
						"data": []map[string]any{
							{"name": "High Engagement", "x": 89, "y": 85},
							{"name": "Medium Engagement", "x": 72, "y": 68},
							{"name": "Low Engagement", "x": 42, "y": 35},
						},
					},
					{
						"name": "Week 3",
						"data": []map[string]any{
							{"name": "High Engagement", "x": 94, "y": 90},
							{"name": "Medium Engagement", "x": 78, "y": 74},
							{"name": "Low Engagement", "x": 48, "y": 40},
						},
					},
				},
				"footer_note": "Correlation coefficient: 0.94",
			}, cdnHost), nil
		},
	})
}

func buildCanonicalChartPayload(chartType string, cfg map[string]any, assetsHost string) admin.WidgetPayload {
	theme := chartString(cfg["theme"], "westeros")
	return toWidgetPayload(ChartWidgetData{
		ChartType:       strings.TrimSpace(strings.ToLower(chartType)),
		Title:           chartString(cfg["title"], "Chart"),
		Subtitle:        chartString(cfg["subtitle"], ""),
		Theme:           theme,
		ChartAssetsHost: ensureTrailingSlash(assetsHost),
		ChartOptions:    buildChartOptions(chartType, cfg),
		FooterNote:      chartString(cfg["footer_note"], ""),
	})
}

func buildChartOptions(chartType string, cfg map[string]any) map[string]any {
	kind := strings.TrimSpace(strings.ToLower(chartType))
	options := map[string]any{
		"title":   map[string]any{},
		"legend":  map[string]any{"show": true},
		"tooltip": map[string]any{"show": true},
		"toolbox": map[string]any{"show": true},
	}

	switch kind {
	case "bar", "line":
		options["series"] = buildCartesianSeries(kind, cfg["series"])
		options["xAxis"] = []map[string]any{
			{"data": toStringSlice(cfg["x_axis"])},
		}
		options["yAxis"] = []map[string]any{{}}
	case "pie":
		options["series"] = buildPieSeries(cfg["series"])
	case "gauge":
		options["series"] = buildGaugeSeries(cfg["series"])
	case "scatter":
		options["series"] = buildScatterSeries(cfg["series"])
		options["xAxis"] = []map[string]any{{}}
		options["yAxis"] = []map[string]any{{}}
	default:
		options["series"] = []map[string]any{}
	}

	return options
}

func buildCartesianSeries(kind string, raw any) []map[string]any {
	seriesCfg := toSeriesConfigSlice(raw)
	out := make([]map[string]any, 0, len(seriesCfg))
	for _, entry := range seriesCfg {
		values := []map[string]any{}
		for _, point := range toAnySlice(entry["data"]) {
			if pointMap, ok := point.(map[string]any); ok {
				if value, ok := toFloat64(pointMap["value"]); ok {
					values = append(values, map[string]any{"value": value})
					continue
				}
				if value, ok := toFloat64(pointMap["y"]); ok {
					values = append(values, map[string]any{"value": value})
					continue
				}
			}
			if value, ok := toFloat64(point); ok {
				values = append(values, map[string]any{"value": value})
			}
		}

		seriesItem := map[string]any{
			"name": chartString(entry["name"], "Series"),
			"type": kind,
			"data": values,
		}
		if kind == "line" {
			seriesItem["smooth"] = true
		}
		out = append(out, seriesItem)
	}
	return out
}

func buildPieSeries(raw any) []map[string]any {
	seriesCfg := toSeriesConfigSlice(raw)
	out := make([]map[string]any, 0, len(seriesCfg))
	for idx, entry := range seriesCfg {
		points := []map[string]any{}
		for _, point := range toAnySlice(entry["data"]) {
			pointMap, ok := point.(map[string]any)
			if !ok {
				continue
			}
			value, hasValue := toFloat64(pointMap["value"])
			if !hasValue {
				continue
			}
			points = append(points, map[string]any{
				"name":  chartString(pointMap["name"], "Slice"),
				"value": value,
			})
		}
		out = append(out, map[string]any{
			"name": chartString(entry["name"], "Series "+chartString(idx+1, "")),
			"type": "pie",
			"data": points,
		})
	}
	return out
}

func buildGaugeSeries(raw any) []map[string]any {
	seriesCfg := toSeriesConfigSlice(raw)
	out := make([]map[string]any, 0, len(seriesCfg))
	for _, entry := range seriesCfg {
		dataPoints := toAnySlice(entry["data"])
		if len(dataPoints) == 0 {
			continue
		}
		value, ok := toFloat64(dataPoints[0])
		if !ok {
			continue
		}
		name := chartString(entry["name"], "Usage")
		out = append(out, map[string]any{
			"name": name,
			"type": "gauge",
			"data": []map[string]any{
				{
					"name":  name,
					"value": value,
				},
			},
		})
	}
	return out
}

func buildScatterSeries(raw any) []map[string]any {
	seriesCfg := toSeriesConfigSlice(raw)
	out := make([]map[string]any, 0, len(seriesCfg))
	for _, entry := range seriesCfg {
		points := []map[string]any{}
		for _, point := range toAnySlice(entry["data"]) {
			pointMap, ok := point.(map[string]any)
			if !ok {
				continue
			}
			name := chartString(pointMap["name"], "")
			x, xOK := toFloat64(pointMap["x"])
			y, yOK := toFloat64(pointMap["y"])
			if !xOK || !yOK {
				pair := toAnySlice(pointMap["value"])
				if len(pair) >= 2 {
					x, xOK = toFloat64(pair[0])
					y, yOK = toFloat64(pair[1])
				}
			}
			if !xOK || !yOK {
				continue
			}
			points = append(points, map[string]any{
				"name":  name,
				"value": []float64{x, y},
			})
		}
		out = append(out, map[string]any{
			"name": chartString(entry["name"], "Series"),
			"type": "scatter",
			"data": points,
		})
	}
	return out
}

func toSeriesConfigSlice(raw any) []map[string]any {
	items := toAnySlice(raw)
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if value, ok := item.(map[string]any); ok {
			out = append(out, value)
		}
	}
	return out
}

func toAnySlice(raw any) []any {
	switch value := raw.(type) {
	case []any:
		return value
	case []map[string]any:
		out := make([]any, 0, len(value))
		for _, item := range value {
			out = append(out, item)
		}
		return out
	case []string:
		out := make([]any, 0, len(value))
		for _, item := range value {
			out = append(out, item)
		}
		return out
	case []float64:
		out := make([]any, 0, len(value))
		for _, item := range value {
			out = append(out, item)
		}
		return out
	case []int:
		out := make([]any, 0, len(value))
		for _, item := range value {
			out = append(out, item)
		}
		return out
	default:
		return nil
	}
}

func toStringSlice(raw any) []string {
	switch value := raw.(type) {
	case []string:
		return value
	case []any:
		out := make([]string, 0, len(value))
		for _, item := range value {
			text := chartString(item, "")
			if text != "" {
				out = append(out, text)
			}
		}
		return out
	default:
		return nil
	}
}

func toFloat64(raw any) (float64, bool) {
	switch value := raw.(type) {
	case float64:
		return value, true
	case float32:
		return float64(value), true
	case int:
		return float64(value), true
	case int8:
		return float64(value), true
	case int16:
		return float64(value), true
	case int32:
		return float64(value), true
	case int64:
		return float64(value), true
	case uint:
		return float64(value), true
	case uint8:
		return float64(value), true
	case uint16:
		return float64(value), true
	case uint32:
		return float64(value), true
	case uint64:
		return float64(value), true
	default:
		return 0, false
	}
}

func intFromAny(raw any) int {
	switch value := raw.(type) {
	case int:
		return value
	case int8:
		return int(value)
	case int16:
		return int(value)
	case int32:
		return int(value)
	case int64:
		return int(value)
	case uint:
		return int(value)
	case uint8:
		return int(value)
	case uint16:
		return int(value)
	case uint32:
		return int(value)
	case uint64:
		return int(value)
	case float32:
		return int(value)
	case float64:
		return int(value)
	default:
		return 0
	}
}

func toStringMap(raw map[string]any) map[string]string {
	if len(raw) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(raw))
	for key, value := range raw {
		out[key] = strings.TrimSpace(toString(value))
	}
	return out
}

func chartString(raw any, fallback string) string {
	text := strings.TrimSpace(toString(raw))
	if text == "" {
		return fallback
	}
	return text
}

func ensureTrailingSlash(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "/dashboard/assets/echarts/"
	}
	if strings.HasSuffix(trimmed, "/") {
		return trimmed
	}
	return trimmed + "/"
}
