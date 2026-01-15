package dashboard

import "context"

// FeatureFlags captures the minimal flags needed for dashboard helpers.
type FeatureFlags struct {
	CMS       bool
	Dashboard bool
	Settings  bool
}

// DashboardAreaRegistrar exposes minimal area registration hooks.
type DashboardAreaRegistrar interface {
	Areas() []WidgetAreaDefinition
	RegisterArea(def WidgetAreaDefinition)
}

// ProviderHost exposes wiring hooks needed before registering providers.
type ProviderHost interface {
	WithWidgetService(WidgetService)
	WithAuthorizer(Authorizer)
}

// Authorizer determines whether a subject can perform an action on a resource.
type Authorizer interface {
	Can(ctx context.Context, action string, resource string) bool
}

// RegisterWidgetAreas seeds default widget areas into the dashboard or widget service.
func RegisterWidgetAreas(registrar DashboardAreaRegistrar, widgetSvc WidgetService, features FeatureFlags) error {
	if registrar == nil && widgetSvc == nil {
		return nil
	}
	if !features.CMS && !features.Dashboard {
		return nil
	}
	if registrar != nil && len(registrar.Areas()) > 0 {
		return nil
	}
	if widgetSvc != nil {
		if areas := widgetSvc.Areas(); len(areas) > 0 {
			return nil
		}
	}
	areas := []WidgetAreaDefinition{
		{Code: "admin.dashboard.main", Name: "Main Dashboard Area", Scope: "global"},
		{Code: "admin.dashboard.sidebar", Name: "Dashboard Sidebar", Scope: "global"},
		{Code: "admin.dashboard.footer", Name: "Dashboard Footer", Scope: "global"},
	}
	for _, area := range areas {
		if registrar != nil {
			registrar.RegisterArea(area)
		} else if widgetSvc != nil {
			if err := widgetSvc.RegisterAreaDefinition(context.Background(), area); err != nil {
				return err
			}
		}
	}
	return nil
}

// RegisterDefaultWidgets seeds default widget definitions and optionally invokes a provider registration callback.
func RegisterDefaultWidgets(widgetSvc WidgetService, features FeatureFlags, registerProviders func() error) error {
	if widgetSvc == nil {
		return nil
	}
	ctx := context.Background()
	if defs := widgetSvc.Definitions(); len(defs) > 0 {
		return nil
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
	if features.Settings {
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
		if err := widgetSvc.RegisterDefinition(ctx, def); err != nil {
			return err
		}
	}
	return nil
}

// RegisterProviders wires dashboard dependencies before invoking the provided registration callback.
func RegisterProviders(host ProviderHost, widgetSvc WidgetService, auth Authorizer, features FeatureFlags, register func() error) error {
	if host == nil {
		return nil
	}
	if !features.Dashboard {
		return nil
	}
	if widgetSvc != nil {
		host.WithWidgetService(widgetSvc)
	}
	if auth != nil {
		host.WithAuthorizer(auth)
	}
	if register != nil {
		return register()
	}
	return nil
}
