package setup

import (
	"time"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-dashboard/components/dashboard"
)

// SetupDashboard configures dashboard widgets for the admin panel
func SetupDashboard(adm *admin.Admin, dataStores *stores.DataStores) {
	dash := adm.Dashboard()

	// User stats widget (override default, no DefaultArea to avoid duplicates)
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code: "admin.widget.user_stats",
		Name: "User Stats",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			stats := dataStores.Stats.GetUserStats()
			return map[string]any{
				"type":      "stat_card",
				"stat_type": "users",
				"total":     stats["total"],
				"active":    stats["active"],
				"new_today": stats["new_today"],
				"trend":     "+12%",
				"trend_up":  true,
			}, nil
		},
	})

	// Content stats widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.content_stats",
		Name:        "Content Stats",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			stats := dataStores.Stats.GetContentStats()
			return map[string]any{
				"type":      "stat_card",
				"stat_type": "content",
				"published": stats["published"],
				"draft":     stats["draft"],
				"scheduled": stats["scheduled"],
			}, nil
		},
	})

	// Storage stats widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.storage_stats",
		Name:        "Storage Stats",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			stats := dataStores.Stats.GetStorageStats()
			return map[string]any{
				"type":       "stat_card",
				"stat_type":  "storage",
				"used":       stats["used"],
				"total":      stats["total"],
				"percentage": stats["percentage"],
			}, nil
		},
	})

	// Quick actions widget (override default, no DefaultArea to avoid duplicates)
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code: "admin.widget.quick_actions",
		Name: "Quick Actions",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			actions := []map[string]any{
				{"label": "New Post", "url": "/admin/posts/new", "icon": "plus"},
				{"label": "New Page", "url": "/admin/pages/new", "icon": "file-plus"},
				{"label": "Upload Media", "url": "/admin/media/upload", "icon": "upload"},
				{"label": "View Settings", "url": "/admin/settings", "icon": "settings"},
			}
			return map[string]any{"actions": actions}, nil
		},
	})

	// System health widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.system_health",
		Name:        "System Health",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			return map[string]any{
				"status":      "healthy",
				"uptime":      "7d 12h",
				"api_latency": "45ms",
				"db_status":   "connected",
			}, nil
		},
	})

	// Register ECharts chart widgets
	registerChartWidgets(dash, dataStores)
}

// registerChartWidgets sets up ECharts-based chart widgets
func registerChartWidgets(dash *admin.Dashboard, dataStores *stores.DataStores) {
	// Configure ECharts providers with caching and CDN
	// Using go-echarts.github.io to avoid CORS/ORB issues with dynamic script injection
	cdnHost := "https://go-echarts.github.io/go-echarts-assets/assets/"
	chartCache := dashboard.NewChartCache(10 * time.Minute)

	// Bar chart widget - Monthly content creation
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.bar_chart",
		Name:        "Monthly Content",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			provider := dashboard.NewEChartsProvider(
				"bar",
				dashboard.WithChartCache(chartCache),
				dashboard.WithChartAssetsHost(cdnHost),
			)

			// Create widget context
			widgetCtx := dashboard.WidgetContext{
				Viewer: dashboard.ViewerContext{
					UserID: ctx.UserID,
					Locale: ctx.Locale,
				},
				Instance: dashboard.WidgetInstance{
					ID:           "content-bar-chart",
					DefinitionID: "admin.widget.bar_chart",
					Configuration: map[string]any{
						"title":    "Monthly Content Creation",
						"subtitle": "Posts and pages published",
						"x_axis":   []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun"},
						"series": []map[string]any{
							{"name": "Posts", "data": []float64{12, 19, 15, 22, 18, 25}},
							{"name": "Pages", "data": []float64{5, 7, 6, 9, 8, 11}},
						},
					},
				},
			}

			data, err := provider.Fetch(ctx.Context, widgetCtx)
			if err != nil {
				return nil, err
			}

			return map[string]any(data), nil
		},
	})

	// Line chart widget - User growth
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.line_chart",
		Name:        "User Growth",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			provider := dashboard.NewEChartsProvider(
				"line",
				dashboard.WithChartCache(chartCache),
				dashboard.WithChartAssetsHost(cdnHost),
			)

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

			widgetCtx := dashboard.WidgetContext{
				Viewer: dashboard.ViewerContext{
					UserID: ctx.UserID,
					Locale: ctx.Locale,
				},
				Instance: dashboard.WidgetInstance{
					ID:           "user-growth-chart",
					DefinitionID: "admin.widget.line_chart",
					Configuration: map[string]any{
						"title":  "User Growth Trend",
						"x_axis": weeks,
						"series": []map[string]any{
							{"name": "Active Users", "data": activeUsers},
							{"name": "New Signups", "data": newSignups},
						},
						"footer_note": "Data refreshed daily",
					},
				},
			}

			data, err := provider.Fetch(ctx.Context, widgetCtx)
			if err != nil {
				return nil, err
			}

			return map[string]any(data), nil
		},
	})

	// Pie chart widget - Content distribution
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.pie_chart",
		Name:        "Content Distribution",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			provider := dashboard.NewEChartsProvider(
				"pie",
				dashboard.WithChartCache(chartCache),
				dashboard.WithChartAssetsHost(cdnHost),
			)

			contentStats := dataStores.Stats.GetContentStats()

			widgetCtx := dashboard.WidgetContext{
				Viewer: dashboard.ViewerContext{
					UserID: ctx.UserID,
					Locale: ctx.Locale,
				},
				Instance: dashboard.WidgetInstance{
					ID:           "content-pie-chart",
					DefinitionID: "admin.widget.pie_chart",
					Configuration: map[string]any{
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
					},
				},
			}

			data, err := provider.Fetch(ctx.Context, widgetCtx)
			if err != nil {
				return nil, err
			}

			return map[string]any(data), nil
		},
	})

	// Gauge chart widget - Storage usage
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.gauge_chart",
		Name:        "Storage Usage",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			provider := dashboard.NewEChartsProvider(
				"gauge",
				dashboard.WithChartCache(chartCache),
				dashboard.WithChartAssetsHost(cdnHost),
			)

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

			widgetCtx := dashboard.WidgetContext{
				Viewer: dashboard.ViewerContext{
					UserID: ctx.UserID,
					Locale: ctx.Locale,
				},
				Instance: dashboard.WidgetInstance{
					ID:           "storage-gauge-chart",
					DefinitionID: "admin.widget.gauge_chart",
					Configuration: map[string]any{
						"title": "Storage Utilization",
						"series": []map[string]any{
							{"name": "Usage", "data": []float64{percentage}},
						},
						"theme": "wonderland",
					},
				},
			}

			data, err := provider.Fetch(ctx.Context, widgetCtx)
			if err != nil {
				return nil, err
			}

			return map[string]any(data), nil
		},
	})
}
