package setup

import (
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/stores"
)

// SetupDashboard configures dashboard widgets for the admin panel
func SetupDashboard(adm *admin.Admin, dataStores *stores.DataStores) {
	dash := adm.DashboardService()

	// User stats widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.user_stats",
		Name:        "User Stats",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			stats := dataStores.Stats.GetUserStats()
			return map[string]any{
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
				"used":       stats["used"],
				"total":      stats["total"],
				"percentage": stats["percentage"],
			}, nil
		},
	})

	// Quick actions widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.quick_actions",
		Name:        "Quick Actions",
		DefaultArea: "admin.dashboard.main",
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
}
