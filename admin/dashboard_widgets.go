package admin

import (
	"context"
	"strings"
)

func (a *Admin) registerWidgetAreas() error {
	if a == nil {
		return nil
	}
	if !a.gates.Enabled(FeatureCMS) && !a.gates.Enabled(FeatureDashboard) {
		return nil
	}
	ctx := context.Background()
	if a.dashboard != nil && len(a.dashboard.Areas()) > 0 {
		return nil
	}
	if a.widgetSvc != nil {
		if areas := a.widgetSvc.Areas(); len(areas) > 0 {
			return nil
		}
	}
	areas := []WidgetAreaDefinition{
		{Code: "admin.dashboard.main", Name: "Main Dashboard Area", Scope: "global"},
		{Code: "admin.dashboard.sidebar", Name: "Dashboard Sidebar", Scope: "global"},
		{Code: "admin.dashboard.footer", Name: "Dashboard Footer", Scope: "global"},
	}
	for _, area := range areas {
		if a.dashboard != nil {
			a.dashboard.RegisterArea(area)
		} else if a.widgetSvc != nil {
			if err := a.widgetSvc.RegisterAreaDefinition(ctx, area); err != nil {
				return err
			}
		}
	}
	return nil
}

func (a *Admin) registerDefaultWidgets() error {
	if a == nil || a.widgetSvc == nil {
		return nil
	}
	ctx := context.Background()
	if defs := a.widgetSvc.Definitions(); len(defs) > 0 {
		return a.registerDashboardProviders()
	}
	definitions := []WidgetDefinition{
		{
			Code: "admin.widget.user_stats",
			Name: "User Statistics",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"title": map[string]any{"type": "string"},
					"metric": map[string]any{
						"type": "string",
						"enum": []string{"activity", "notifications", "custom"},
					},
				},
			},
		},
		{
			Code: "admin.widget.activity_feed",
			Name: "Activity Feed",
			Schema: map[string]any{
				"type":       "object",
				"properties": map[string]any{"limit": map[string]any{"type": "integer", "default": 10}},
			},
		},
		{
			Code: "admin.widget.quick_actions",
			Name: "Quick Actions",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"actions": map[string]any{
						"type": "array",
						"items": map[string]any{
							"type": "object",
							"properties": map[string]any{
								"label": map[string]any{"type": "string"},
								"url":   map[string]any{"type": "string"},
								"icon":  map[string]any{"type": "string"},
							},
						},
					},
				},
			},
		},
		{
			Code: "admin.widget.chart_sample",
			Name: "Sample Chart",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"title": map[string]any{"type": "string"},
					"type":  map[string]any{"type": "string", "enum": []string{"line", "bar", "pie"}},
				},
			},
		},
	}
	if a.gates.Enabled(FeatureSettings) {
		definitions = append(definitions, WidgetDefinition{
			Code: "admin.widget.settings_overview",
			Name: "Settings Overview",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"keys": map[string]any{
						"type":  "array",
						"items": map[string]any{"type": "string"},
					},
				},
			},
		})
	}
	for _, def := range definitions {
		if err := a.widgetSvc.RegisterDefinition(ctx, def); err != nil {
			return err
		}
	}
	return a.registerDashboardProviders()
}

func (a *Admin) registerDashboardProviders() error {
	if a == nil || a.dashboard == nil || !a.gates.Enabled(FeatureDashboard) {
		return nil
	}
	a.dashboard.WithWidgetService(a.widgetSvc)
	a.dashboard.WithCommandBus(a.commandRegistry)
	a.dashboard.WithAuthorizer(a.authorizer)

	statsSpec := DashboardProviderSpec{
		Code:          "admin.widget.user_stats",
		Name:          "User Statistics",
		DefaultArea:   "admin.dashboard.main",
		DefaultConfig: map[string]any{"metric": "activity", "title": "Activity"},
		DefaultSpan:   4,
		Permission:    "",
		CommandName:   "dashboard.provider.user_stats",
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			metric := toString(cfg["metric"])
			if metric == "" {
				metric = "activity"
			}
			title := toString(cfg["title"])
			if title == "" {
				title = "Statistic"
			}
			value := 0
			switch metric {
			case "notifications":
				if a.notifications != nil {
					items, _ := a.notifications.List(ctx.Context)
					value = len(items)
				}
			case "activity":
				if a.activity != nil {
					items, _ := a.activity.List(ctx.Context, 100)
					value = len(items)
				}
			default:
				if a.settings != nil {
					values := a.settings.ResolveAll(ctx.UserID)
					if v, ok := values[metric]; ok && v.Value != nil {
						if iv, ok := v.Value.(int); ok {
							value = iv
						}
					}
				}
			}
			return map[string]any{"title": title, "metric": metric, "value": value}, nil
		},
	}

	quickActionsSpec := DashboardProviderSpec{
		Code:          "admin.widget.quick_actions",
		Name:          "Quick Actions",
		DefaultArea:   "admin.dashboard.sidebar",
		DefaultConfig: map[string]any{},
		Permission:    "admin.quick_actions.view",
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			if cfg == nil {
				cfg = map[string]any{}
			}
			actions, _ := cfg["actions"].([]any)
			if len(actions) == 0 {
				actions = []any{
					map[string]any{"label": "Go to CMS", "url": "/admin/pages", "icon": "file"},
					map[string]any{"label": "View Users", "url": "/admin/users", "icon": "users"},
				}
			}
			return map[string]any{"actions": actions}, nil
		},
	}

	chartSpec := DashboardProviderSpec{
		Code:          "admin.widget.chart_sample",
		Name:          "Sample Chart",
		DefaultArea:   "admin.dashboard.main",
		DefaultConfig: map[string]any{"title": "Weekly Totals", "type": "line"},
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			points := []map[string]any{
				{"label": "Mon", "value": 10},
				{"label": "Tue", "value": 15},
				{"label": "Wed", "value": 7},
				{"label": "Thu", "value": 20},
				{"label": "Fri", "value": 12},
			}
			return map[string]any{
				"title": toString(cfg["title"]),
				"type":  toString(cfg["type"]),
				"data":  points,
			}, nil
		},
	}

	a.dashboard.RegisterProvider(statsSpec)
	a.dashboard.RegisterProvider(quickActionsSpec)
	a.dashboard.RegisterProvider(chartSpec)
	return nil
}

func (a *Admin) registerSettingsWidget() error {
	if a == nil || a.dashboard == nil || a.settings == nil || !a.gates.Enabled(FeatureSettings) {
		return nil
	}
	handler := func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
		if err := a.requirePermission(ctx, a.config.SettingsPermission, "settings"); err != nil {
			return nil, err
		}
		values := a.settings.ResolveAll(ctx.UserID)
		keys := []string{}
		if raw, ok := cfg["keys"]; ok {
			switch v := raw.(type) {
			case []string:
				keys = append(keys, v...)
			case []any:
				for _, item := range v {
					if s, ok := item.(string); ok {
						keys = append(keys, s)
					}
				}
			}
		}
		shouldInclude := func(key string) bool {
			if len(keys) == 0 {
				return true
			}
			for _, k := range keys {
				if k == key {
					return true
				}
			}
			return false
		}
		payload := map[string]any{}
		for key, val := range values {
			if !shouldInclude(key) {
				continue
			}
			payload[key] = map[string]any{
				"value":      val.Value,
				"provenance": val.Provenance,
			}
		}
		return map[string]any{"values": payload}, nil
	}
	a.dashboard.RegisterProvider(DashboardProviderSpec{
		Code:          "admin.widget.settings_overview",
		Name:          "Settings Overview",
		DefaultArea:   "admin.dashboard.sidebar",
		DefaultConfig: map[string]any{"keys": []string{"admin.title", "admin.default_locale"}},
		Permission:    a.config.SettingsPermission,
		Handler:       handler,
	})
	return nil
}

func (a *Admin) registerNotificationsWidget() error {
	if a == nil || a.dashboard == nil || a.notifications == nil || !a.gates.Enabled(FeatureDashboard) || !a.gates.Enabled(FeatureNotifications) {
		return nil
	}
	handler := func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
		limit := 5
		if raw, ok := cfg["limit"].(int); ok && raw > 0 {
			limit = raw
		} else if rawf, ok := cfg["limit"].(float64); ok && rawf > 0 {
			limit = int(rawf)
		}
		items, err := a.notifications.List(ctx.Context)
		if err != nil {
			return nil, err
		}
		unread := 0
		if limit > 0 && len(items) > limit {
			items = items[:limit]
		}
		for _, item := range items {
			if !item.Read {
				unread++
			}
		}
		return map[string]any{
			"notifications": items,
			"unread":        unread,
		}, nil
	}
	a.dashboard.RegisterProvider(DashboardProviderSpec{
		Code:          "admin.widget.notifications",
		Name:          "Notifications",
		DefaultArea:   "admin.dashboard.sidebar",
		DefaultConfig: map[string]any{"limit": 5},
		Handler:       handler,
	})
	return nil
}

func (a *Admin) registerActivityWidget() error {
	if a == nil || a.dashboard == nil || a.activity == nil || !a.gates.Enabled(FeatureDashboard) {
		return nil
	}
	handler := func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
		limit := 5
		if raw, ok := cfg["limit"].(int); ok && raw > 0 {
			limit = raw
		} else if rawf, ok := cfg["limit"].(float64); ok && rawf > 0 {
			limit = int(rawf)
		}
		filters := []ActivityFilter{}
		if channel, ok := cfg["channel"].(string); ok && strings.TrimSpace(channel) != "" {
			filters = append(filters, ActivityFilter{Channel: strings.TrimSpace(channel)})
		}
		entries, err := a.activity.List(ctx.Context, limit, filters...)
		if err != nil {
			return nil, err
		}
		return map[string]any{"entries": entries}, nil
	}
	a.dashboard.RegisterProvider(DashboardProviderSpec{
		Code:          "admin.widget.activity_feed",
		Name:          "Recent Activity",
		DefaultArea:   "admin.dashboard.main",
		DefaultConfig: map[string]any{"limit": 5},
		Permission:    "",
		Handler:       handler,
	})
	return nil
}
