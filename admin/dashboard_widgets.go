package admin

import (
	"context"
	"strings"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
)

type userStatsWidgetConfig struct {
	Metric string `json:"metric"`
	Title  string `json:"title"`
}

type quickActionsWidgetConfig struct {
	Actions []QuickActionWidgetPayload `json:"actions"`
}

type chartSampleWidgetConfig struct {
	Title string `json:"title"`
	Type  string `json:"type"`
}

type settingsOverviewWidgetConfig struct {
	Keys []string `json:"keys"`
}

type limitWidgetConfig struct {
	Limit int `json:"limit"`
}

type activityWidgetConfig struct {
	Limit   int    `json:"limit"`
	Channel string `json:"channel"`
}

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
		nil,
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
				Code:          WidgetUserStats,
				Name:          "User Statistics",
				DefaultArea:   "admin.dashboard.main",
				DefaultConfig: map[string]any{"metric": "activity", "title": "Activity"},
				DefaultSpan:   4,
				Permission:    "",
				CommandName:   "dashboard.provider.user_stats",
				Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
					resolvedCfg, err := DecodeWidgetConfig[userStatsWidgetConfig](cfg)
					if err != nil {
						return WidgetPayload{}, err
					}
					metric := strings.TrimSpace(resolvedCfg.Metric)
					if metric == "" {
						metric = "activity"
					}
					title := strings.TrimSpace(resolvedCfg.Title)
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
					return WidgetPayloadOf(UserStatsWidgetPayload{
						Title:  title,
						Metric: metric,
						Value:  value,
					}), nil
				},
			}

			quickActionsSpec := DashboardProviderSpec{
				Code:          WidgetQuickActions,
				Name:          "Quick Actions",
				DefaultArea:   "admin.dashboard.sidebar",
				DefaultConfig: map[string]any{},
				Permission:    "admin.quick_actions.view",
				Handler: func(_ AdminContext, cfg map[string]any) (WidgetPayload, error) {
					resolvedCfg, err := DecodeWidgetConfig[quickActionsWidgetConfig](cfg)
					if err != nil {
						return WidgetPayload{}, err
					}
					actions := append([]QuickActionWidgetPayload{}, resolvedCfg.Actions...)
					if len(actions) == 0 {
						defaultActions := []QuickActionWidgetPayload{}
						if cmsURL := resolveURLWith(a.urlManager, "admin", "content", nil, nil); cmsURL != "" {
							defaultActions = append(defaultActions, QuickActionWidgetPayload{Label: "Go to CMS", URL: cmsURL, Icon: "file"})
						}
						if usersURL := resolveURLWith(a.urlManager, "admin", "users", nil, nil); usersURL != "" {
							defaultActions = append(defaultActions, QuickActionWidgetPayload{Label: "View Users", URL: usersURL, Icon: "users"})
						}
						if len(defaultActions) > 0 {
							actions = defaultActions
						}
					}
					return WidgetPayloadOf(QuickActionsWidgetPayload{Actions: actions}), nil
				},
			}

			chartSpec := DashboardProviderSpec{
				Code:          WidgetChartSample,
				Name:          "Sample Chart",
				DefaultArea:   "admin.dashboard.main",
				DefaultConfig: map[string]any{"title": "Weekly Totals", "type": "line"},
				Handler: func(_ AdminContext, cfg map[string]any) (WidgetPayload, error) {
					resolvedCfg, err := DecodeWidgetConfig[chartSampleWidgetConfig](cfg)
					if err != nil {
						return WidgetPayload{}, err
					}
					points := []map[string]any{
						{"label": "Mon", "value": 10},
						{"label": "Tue", "value": 15},
						{"label": "Wed", "value": 7},
						{"label": "Thu", "value": 20},
						{"label": "Fri", "value": 12},
					}
					chartPoints := make([]ChartPointWidgetPayload, 0, len(points))
					for _, point := range points {
						chartPoints = append(chartPoints, ChartPointWidgetPayload{
							Label: toString(point["label"]),
							Value: numericToInt(point["value"]),
						})
					}
					return WidgetPayloadOf(LegacyChartSampleWidgetPayload{
						Title: resolvedCfg.Title,
						Type:  resolvedCfg.Type,
						Data:  chartPoints,
					}), nil
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
	handler := func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
		if err := a.requirePermission(ctx, a.config.SettingsPermission, "settings"); err != nil {
			return WidgetPayload{}, err
		}
		values := a.settings.ResolveAll(ctx.UserID)
		resolvedCfg, err := DecodeWidgetConfig[settingsOverviewWidgetConfig](cfg)
		if err != nil {
			return WidgetPayload{}, err
		}
		keys := append([]string{}, resolvedCfg.Keys...)
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
		payload := map[string]SettingOverviewValuePayload{}
		for key, val := range values {
			if !shouldInclude(key) {
				continue
			}
			payload[key] = SettingOverviewValuePayload{
				Value:      val.Value,
				Provenance: val.Provenance,
			}
		}
		return WidgetPayloadOf(SettingsOverviewWidgetPayload{Values: payload}), nil
	}
	a.dashboard.RegisterProvider(DashboardProviderSpec{
		Code:          WidgetSettingsOverview,
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
	handler := func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
		resolvedCfg, err := DecodeWidgetConfig[limitWidgetConfig](cfg)
		if err != nil {
			return WidgetPayload{}, err
		}
		limit := resolvedCfg.Limit
		if limit <= 0 {
			limit = 5
		}
		items, err := a.notifications.List(ctx.Context)
		if err != nil {
			return WidgetPayload{}, err
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
		return WidgetPayloadOf(NotificationsWidgetPayload{
			Notifications: items,
			Unread:        unread,
		}), nil
	}
	a.dashboard.RegisterProvider(DashboardProviderSpec{
		Code:          WidgetNotifications,
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
	handler := func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
		resolvedCfg, err := DecodeWidgetConfig[activityWidgetConfig](cfg)
		if err != nil {
			return WidgetPayload{}, err
		}
		limit := resolvedCfg.Limit
		if limit <= 0 {
			limit = 5
		}
		filters := []ActivityFilter{}
		if channel := strings.TrimSpace(resolvedCfg.Channel); channel != "" {
			filters = append(filters, ActivityFilter{Channel: channel})
		}
		entries, err := a.activity.List(ctx.Context, limit, filters...)
		if err != nil {
			return WidgetPayload{}, err
		}
		return WidgetPayloadOf(ActivityFeedWidgetPayload{Entries: entries}), nil
	}
	a.dashboard.RegisterProvider(DashboardProviderSpec{
		Code:          WidgetActivityFeed,
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
