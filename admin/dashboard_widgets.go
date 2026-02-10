package admin

import (
	"context"
	"strings"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
)

func (a *Admin) registerWidgetAreas() error {
	if a == nil {
		return nil
	}
	features := dashinternal.FeatureFlags{
		CMS:       featureEnabled(a.featureGate, FeatureCMS),
		Dashboard: featureEnabled(a.featureGate, FeatureDashboard),
		Settings:  featureEnabled(a.featureGate, FeatureSettings),
	}
	return dashinternal.RegisterWidgetAreas(
		a.dashboardAreaAdapter(),
		a.widgetServiceAdapter(),
		features,
	)
}

func (a *Admin) registerDefaultWidgets() error {
	if a == nil {
		return nil
	}
	features := dashinternal.FeatureFlags{
		CMS:       featureEnabled(a.featureGate, FeatureCMS),
		Dashboard: featureEnabled(a.featureGate, FeatureDashboard),
		Settings:  featureEnabled(a.featureGate, FeatureSettings),
	}
	return dashinternal.RegisterDefaultWidgets(
		a.widgetServiceAdapter(),
		features,
		func() error { return a.registerDashboardProviders() },
	)
}

func (a *Admin) registerDashboardProviders() error {
	if a == nil || a.dashboard == nil {
		return nil
	}
	if a.commandBus != nil {
		a.dashboard.WithCommandBus(a.commandBus)
	}
	features := dashinternal.FeatureFlags{
		CMS:       featureEnabled(a.featureGate, FeatureCMS),
		Dashboard: featureEnabled(a.featureGate, FeatureDashboard),
		Settings:  featureEnabled(a.featureGate, FeatureSettings),
	}
	return dashinternal.RegisterProviders(
		a.providerHostAdapter(),
		a.widgetServiceAdapter(),
		a.authorizer,
		features,
		func() error {
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
						defaultActions := []any{}
						if cmsURL := resolveURLWith(a.urlManager, "admin", "content.panel", map[string]string{"panel": "pages"}, nil); cmsURL != "" {
							defaultActions = append(defaultActions, map[string]any{"label": "Go to CMS", "url": cmsURL, "icon": "file"})
						}
						if usersURL := resolveURLWith(a.urlManager, "admin", "users", nil, nil); usersURL != "" {
							defaultActions = append(defaultActions, map[string]any{"label": "View Users", "url": usersURL, "icon": "users"})
						}
						if len(defaultActions) > 0 {
							actions = defaultActions
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
			if queueStats := translationQueueStatsServiceFromAdmin(a); queueStats != nil {
				RegisterTranslationProgressWidget(a.dashboard, queueStats, a.urlManager)
			}
			return nil
		},
	)
}

func (a *Admin) registerSettingsWidget() error {
	if a == nil || a.dashboard == nil || a.settings == nil || !featureEnabled(a.featureGate, FeatureSettings) {
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
	if a == nil || a.dashboard == nil || a.notifications == nil || !featureEnabled(a.featureGate, FeatureDashboard) || !featureEnabled(a.featureGate, FeatureNotifications) {
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
	if a == nil || a.dashboard == nil || a.activity == nil || !featureEnabled(a.featureGate, FeatureDashboard) {
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

func (a *Admin) dashboardAreaAdapter() dashinternal.DashboardAreaRegistrar {
	if a == nil || a.dashboard == nil {
		return nil
	}
	return dashboardAreaAdapter{dash: a.dashboard}
}

func (a *Admin) widgetServiceAdapter() dashinternal.WidgetService {
	if a == nil || a.widgetSvc == nil {
		return nil
	}
	if svc, ok := a.widgetSvc.(dashinternal.WidgetService); ok {
		return svc
	}
	return cmsWidgetServiceAdapter{svc: a.widgetSvc}
}

func (a *Admin) providerHostAdapter() dashinternal.ProviderHost {
	if a == nil || a.dashboard == nil {
		return nil
	}
	return dashboardProviderHost{dash: a.dashboard}
}

type dashboardAreaAdapter struct {
	dash *Dashboard
}

func (d dashboardAreaAdapter) Areas() []dashinternal.WidgetAreaDefinition {
	if d.dash == nil {
		return nil
	}
	return d.dash.Areas()
}

func (d dashboardAreaAdapter) RegisterArea(def dashinternal.WidgetAreaDefinition) {
	if d.dash != nil {
		d.dash.RegisterArea(def)
	}
}

type cmsWidgetServiceAdapter struct {
	svc CMSWidgetService
}

func (w cmsWidgetServiceAdapter) RegisterAreaDefinition(ctx context.Context, def dashinternal.WidgetAreaDefinition) error {
	if w.svc == nil {
		return nil
	}
	return w.svc.RegisterAreaDefinition(ctx, def)
}

func (w cmsWidgetServiceAdapter) RegisterDefinition(ctx context.Context, def dashinternal.WidgetDefinition) error {
	if w.svc == nil {
		return nil
	}
	return w.svc.RegisterDefinition(ctx, def)
}

func (w cmsWidgetServiceAdapter) DeleteDefinition(ctx context.Context, code string) error {
	if w.svc == nil {
		return nil
	}
	return w.svc.DeleteDefinition(ctx, code)
}

func (w cmsWidgetServiceAdapter) Areas() []dashinternal.WidgetAreaDefinition {
	if w.svc == nil {
		return nil
	}
	return w.svc.Areas()
}

func (w cmsWidgetServiceAdapter) Definitions() []dashinternal.WidgetDefinition {
	if w.svc == nil {
		return nil
	}
	return w.svc.Definitions()
}

func (w cmsWidgetServiceAdapter) SaveInstance(ctx context.Context, instance dashinternal.WidgetInstance) (*dashinternal.WidgetInstance, error) {
	if w.svc == nil {
		return nil, nil
	}
	return w.svc.SaveInstance(ctx, instance)
}

func (w cmsWidgetServiceAdapter) DeleteInstance(ctx context.Context, id string) error {
	if w.svc == nil {
		return nil
	}
	return w.svc.DeleteInstance(ctx, id)
}

func (w cmsWidgetServiceAdapter) ListInstances(ctx context.Context, filter dashinternal.WidgetInstanceFilter) ([]dashinternal.WidgetInstance, error) {
	if w.svc == nil {
		return nil, nil
	}
	return w.svc.ListInstances(ctx, filter)
}

type widgetServiceBridge struct {
	svc dashinternal.WidgetService
}

func (w widgetServiceBridge) RegisterAreaDefinition(ctx context.Context, def WidgetAreaDefinition) error {
	if w.svc == nil {
		return nil
	}
	return w.svc.RegisterAreaDefinition(ctx, def)
}

func (w widgetServiceBridge) RegisterDefinition(ctx context.Context, def WidgetDefinition) error {
	if w.svc == nil {
		return nil
	}
	return w.svc.RegisterDefinition(ctx, def)
}

func (w widgetServiceBridge) DeleteDefinition(ctx context.Context, code string) error {
	if w.svc == nil {
		return nil
	}
	return w.svc.DeleteDefinition(ctx, code)
}

func (w widgetServiceBridge) Areas() []WidgetAreaDefinition {
	if w.svc == nil {
		return nil
	}
	return w.svc.Areas()
}

func (w widgetServiceBridge) Definitions() []WidgetDefinition {
	if w.svc == nil {
		return nil
	}
	return w.svc.Definitions()
}

func (w widgetServiceBridge) SaveInstance(ctx context.Context, instance WidgetInstance) (*WidgetInstance, error) {
	if w.svc == nil {
		return nil, nil
	}
	inst, err := w.svc.SaveInstance(ctx, instance)
	if err != nil || inst == nil {
		return inst, err
	}
	return inst, nil
}

func (w widgetServiceBridge) DeleteInstance(ctx context.Context, id string) error {
	if w.svc == nil {
		return nil
	}
	return w.svc.DeleteInstance(ctx, id)
}

func (w widgetServiceBridge) ListInstances(ctx context.Context, filter WidgetInstanceFilter) ([]WidgetInstance, error) {
	if w.svc == nil {
		return nil, nil
	}
	return w.svc.ListInstances(ctx, filter)
}

type dashboardProviderHost struct {
	dash *Dashboard
}

func (d dashboardProviderHost) WithWidgetService(svc dashinternal.WidgetService) {
	if d.dash == nil || svc == nil {
		return
	}
	if cmsSvc, ok := svc.(CMSWidgetService); ok {
		d.dash.WithWidgetService(cmsSvc)
		return
	}
	d.dash.WithWidgetService(widgetServiceBridge{svc: svc})
}

func (d dashboardProviderHost) WithAuthorizer(auth dashinternal.Authorizer) {
	if d.dash == nil || auth == nil {
		return
	}
	if az, ok := auth.(Authorizer); ok {
		d.dash.WithAuthorizer(az)
	}
}
