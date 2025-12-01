package admin

import (
	"context"
	"errors"
)

// WidgetProvider produces data for a widget given viewer context/config.
type WidgetProvider func(ctx AdminContext, cfg map[string]any) (map[string]any, error)

// WidgetInstance represents a widget placed in an area.
type WidgetInstance struct {
	DefinitionCode string
	AreaCode       string
	Config         map[string]any
}

// Dashboard orchestrates widget providers and instances.
type Dashboard struct {
	providers   map[string]WidgetProvider
	instances   []WidgetInstance
	preferences map[string][]WidgetInstance // userID -> instances
}

// NewDashboard constructs a dashboard registry.
func NewDashboard() *Dashboard {
	return &Dashboard{
		providers:   make(map[string]WidgetProvider),
		instances:   []WidgetInstance{},
		preferences: make(map[string][]WidgetInstance),
	}
}

// RegisterProvider registers a widget data provider.
func (d *Dashboard) RegisterProvider(code string, provider WidgetProvider) {
	if code == "" || provider == nil {
		return
	}
	d.providers[code] = provider
}

// AddInstance places a widget in an area (global default).
func (d *Dashboard) AddInstance(area, defCode string, cfg map[string]any) {
	d.instances = append(d.instances, WidgetInstance{
		DefinitionCode: defCode,
		AreaCode:       area,
		Config:         cfg,
	})
}

// SetUserLayout stores per-user layout/preferences.
func (d *Dashboard) SetUserLayout(userID string, instances []WidgetInstance) {
	d.preferences[userID] = instances
}

// Resolve returns widgets for a viewer, applying per-user preferences when present.
func (d *Dashboard) Resolve(ctx AdminContext) ([]map[string]any, error) {
	inst := d.instances
	if userInst, ok := d.preferences[ctx.UserID]; ok && len(userInst) > 0 {
		inst = userInst
	}
	out := []map[string]any{}
	for _, wi := range inst {
		provider, ok := d.providers[wi.DefinitionCode]
		if !ok {
			continue
		}
		data, err := provider(ctx, wi.Config)
		if err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"definition": wi.DefinitionCode,
			"area":       wi.AreaCode,
			"config":     wi.Config,
			"data":       data,
		})
	}
	return out, nil
}

// DashboardProviderCommand allows fetching widget data via command bus.
type DashboardProviderCommand struct {
	Dashboard *Dashboard
	Code      string
}

func (c *DashboardProviderCommand) Name() string {
	return "dashboard.provider.fetch." + c.Code
}

func (c *DashboardProviderCommand) Execute(ctx context.Context) error {
	if c.Dashboard == nil {
		return errors.New("dashboard not set")
	}
	adminCtx := AdminContext{Context: ctx, UserID: "", Locale: "en"}
	_, err := c.Dashboard.Resolve(adminCtx)
	return err
}
