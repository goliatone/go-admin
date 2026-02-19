package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"io"
	"strings"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	dashcmd "github.com/goliatone/go-dashboard/components/dashboard/commands"
	dashapi "github.com/goliatone/go-dashboard/components/dashboard/httpapi"
)

type dashboardComponents struct {
	service    *dashcmp.Service
	controller *dashcmp.Controller
	executor   dashapi.Executor
	broadcast  *dashcmp.BroadcastHook
	providers  dashcmp.ProviderRegistry
	specs      map[string]DashboardProviderSpec
}

func (d *Dashboard) setComponents(comp *dashboardComponents) {
	if d == nil {
		return
	}
	d.components = comp
}

type activityRecorderAdapter struct {
	sink ActivitySink
}

func (a activityRecorderAdapter) RecordWidgetEvent(ctx context.Context, action string, inst dashcmp.WidgetInstance) {
	if a.sink == nil {
		return
	}
	metadata := map[string]any{
		"widget_id":       inst.ID,
		"definition_id":   inst.DefinitionID,
		"area_code":       inst.AreaCode,
		"action":          action,
		"configuration":   inst.Configuration,
		"widget_metadata": inst.Metadata,
	}
	actor := actorFromContext(ctx)
	_ = a.sink.Record(ctx, ActivityEntry{
		Actor:    actor,
		Action:   "dashboard.widget." + strings.TrimSpace(action),
		Object:   inst.DefinitionID,
		Metadata: metadata,
	})
}

func (a *Admin) ensureDashboard(ctx context.Context) error {
	if !featureEnabled(a.featureGate, FeatureDashboard) {
		return nil
	}
	store := dashinternal.NewCMSWidgetStoreWithActivity(a.widgetServiceAdapter(), activityRecorderAdapter{sink: a.activity})
	if store == nil {
		return serviceNotConfiguredDomainError("dashboard cms widget service", map[string]any{"component": "dashboard"})
	}

	providerRegistry, specs := a.dashboard.buildDashboardProviders()
	authorizer := dashboardAuthorizerAdapter{
		authorizer: a.authorizer,
		specs:      specs,
	}
	prefStore := a.buildDashboardPreferenceStore(store)
	themeProvider := a.dashboardThemeProvider()
	refresh := dashcmp.NewBroadcastHook()

	renderer := a.dashboardRenderer()
	opts := dashcmp.Options{
		WidgetStore:     store,
		Authorizer:      authorizer,
		PreferenceStore: prefStore,
		Providers:       providerRegistry,
		RefreshHook:     refresh,
		ThemeProvider:   themeProvider,
		ThemeSelector: func(ctx context.Context, _ dashcmp.ViewerContext) dashcmp.ThemeSelector {
			selector := mergeSelector(ThemeSelector{
				Name:    a.config.Theme,
				Variant: a.config.ThemeVariant,
			}, ThemeSelectorFromContext(ctx))
			return dashcmp.ThemeSelector{Name: selector.Name, Variant: selector.Variant}
		},
	}
	service := dashcmp.NewService(opts)
	controller := dashcmp.NewController(dashcmp.ControllerOptions{
		Service:  service,
		Renderer: renderer,
		Template: "dashboard_ssr.html",
	})
	executor := serviceExecutor{svc: service}

	a.dash = &dashboardComponents{
		service:    service,
		controller: controller,
		executor:   executor,
		broadcast:  refresh,
		providers:  providerRegistry,
		specs:      specs,
	}
	a.dashboard.setComponents(a.dash)
	return nil
}

func (a *Admin) dashboardRenderer() dashcmp.Renderer {
	if a.dashboard != nil && a.dashboard.renderer != nil {
		return a.dashboard.renderer
	}
	return noopDashboardRenderer{}
}

func (d *Dashboard) buildDashboardProviders() (dashcmp.ProviderRegistry, map[string]DashboardProviderSpec) {
	registry := dashcmp.NewRegistry()
	specs := map[string]DashboardProviderSpec{}
	if d == nil {
		return registry, specs
	}
	for code, provider := range d.providers {
		spec := provider.spec
		specs[code] = spec
		def := dashcmp.WidgetDefinition{
			Code:   spec.Code,
			Name:   spec.Name,
			Schema: spec.Schema,
		}
		_ = registry.RegisterDefinition(def)
		handler := provider.handler
		defaultCfg := cloneAny(spec.DefaultConfig)
		_ = registry.RegisterProvider(spec.Code, dashcmp.ProviderFunc(func(ctx context.Context, meta dashcmp.WidgetContext) (dashcmp.WidgetData, error) {
			cfg := cloneAny(defaultCfg)
			if cfg == nil {
				cfg = map[string]any{}
			}
			for k, v := range meta.Instance.Configuration {
				cfg[k] = v
			}
			adminCtx := AdminContext{
				Context: ctx,
				UserID:  meta.Viewer.UserID,
				Locale:  meta.Viewer.Locale,
			}
			payload, err := handler(adminCtx, cfg)
			if err != nil {
				return nil, err
			}
			data, err := encodeWidgetPayload(payload)
			if err != nil {
				return nil, err
			}
			return dashcmp.WidgetData(data), nil
		}))
	}
	return registry, specs
}

func (a *Admin) buildDashboardPreferenceStore(store dashcmp.WidgetStore) dashcmp.PreferenceStore {
	if a.preferences == nil {
		return dashcmp.NewInMemoryPreferenceStore()
	}
	return &dashboardPreferenceStore{prefs: a.preferences, store: store}
}

func (a *Admin) dashboardThemeProvider() dashcmp.ThemeProvider {
	if a.themeProvider == nil && a.defaultTheme == nil {
		return nil
	}
	return dashboardThemeProviderAdapter{
		provider: a.themeProvider,
		fallback: a.defaultTheme,
	}
}

type noopDashboardRenderer struct{}

func (noopDashboardRenderer) Render(_ string, _ any, _ ...io.Writer) (string, error) {
	return "", nil
}

type serviceExecutor struct{ svc *dashcmp.Service }

func (e serviceExecutor) Assign(ctx context.Context, req dashcmp.AddWidgetRequest) error {
	if e.svc == nil {
		return serviceNotConfiguredDomainError("dashboard service", map[string]any{"component": "dashboard"})
	}
	return e.svc.AddWidget(ctx, req)
}

func (e serviceExecutor) Remove(ctx context.Context, input dashcmd.RemoveWidgetInput) error {
	if e.svc == nil {
		return serviceNotConfiguredDomainError("dashboard service", map[string]any{"component": "dashboard"})
	}
	ctx = dashcmp.ContextWithActivity(ctx, dashcmp.ActivityContext{
		ActorID:  input.ActorID,
		UserID:   input.UserID,
		TenantID: input.TenantID,
	})
	return e.svc.RemoveWidget(ctx, input.WidgetID)
}

func (e serviceExecutor) Reorder(ctx context.Context, input dashcmd.ReorderWidgetsInput) error {
	if e.svc == nil {
		return serviceNotConfiguredDomainError("dashboard service", map[string]any{"component": "dashboard"})
	}
	return e.svc.ReorderWidgets(ctx, input.AreaCode, input.WidgetIDs)
}

func (e serviceExecutor) Refresh(ctx context.Context, input dashcmd.RefreshWidgetInput) error {
	if e.svc == nil {
		return serviceNotConfiguredDomainError("dashboard service", map[string]any{"component": "dashboard"})
	}
	return e.svc.NotifyWidgetUpdated(ctx, input.Event)
}

func (e serviceExecutor) Preferences(ctx context.Context, input dashcmd.SaveLayoutPreferencesInput) error {
	if e.svc == nil {
		return serviceNotConfiguredDomainError("dashboard service", map[string]any{"component": "dashboard"})
	}
	overrides := dashcmp.LayoutOverrides{
		AreaOrder:     cloneStringSliceMap(input.AreaOrder),
		AreaRows:      convertLayoutRows(input.LayoutRows),
		HiddenWidgets: toHiddenWidgetMap(input.HiddenWidgets),
		Locale:        input.Viewer.Locale,
	}
	return e.svc.SavePreferences(ctx, input.Viewer, overrides)
}

type dashboardPreferenceStore struct {
	prefs *PreferencesService
	store dashcmp.WidgetStore
}

func (s *dashboardPreferenceStore) LayoutOverrides(ctx context.Context, viewer dashcmp.ViewerContext) (dashcmp.LayoutOverrides, error) {
	overrides := dashcmp.LayoutOverrides{
		Locale:        viewer.Locale,
		AreaOrder:     map[string][]string{},
		AreaRows:      map[string][]dashcmp.LayoutRow{},
		HiddenWidgets: map[string]bool{},
	}
	if s == nil || s.prefs == nil || viewer.UserID == "" {
		return overrides, nil
	}
	stored := s.prefs.DashboardOverrides(ctx, viewer.UserID)
	if stored.Locale != "" {
		overrides.Locale = stored.Locale
	}
	overrides.AreaOrder = cloneStringSliceMap(stored.AreaOrder)
	overrides.AreaRows = convertDashboardRows(stored.AreaRows)
	overrides.HiddenWidgets = cloneHiddenWidgetMap(stored.HiddenWidgets)
	return overrides, nil
}

func (s *dashboardPreferenceStore) SaveLayoutOverrides(ctx context.Context, viewer dashcmp.ViewerContext, overrides dashcmp.LayoutOverrides) error {
	if s == nil || s.prefs == nil {
		return nil
	}
	if viewer.UserID == "" {
		return requiredFieldDomainError("viewer user id", map[string]any{"scope": "dashboard_preferences"})
	}
	if overrides.Locale == "" {
		overrides.Locale = viewer.Locale
	}
	adminOverrides := DashboardLayoutOverrides{
		Locale:        overrides.Locale,
		AreaOrder:     cloneStringSliceMap(overrides.AreaOrder),
		AreaRows:      convertRowsToAdmin(overrides.AreaRows),
		HiddenWidgets: cloneHiddenWidgetMap(overrides.HiddenWidgets),
	}
	_, err := s.prefs.SaveDashboardOverrides(ctx, viewer.UserID, adminOverrides)
	if err != nil {
		return err
	}
	layout := s.buildLayoutFromOverrides(ctx, overrides, adminOverrides)
	if len(layout) > 0 {
		_, _ = s.prefs.SaveDashboardLayout(ctx, viewer.UserID, layout)
	}
	return nil
}

func (s *dashboardPreferenceStore) buildLayoutFromOverrides(ctx context.Context, overrides dashcmp.LayoutOverrides, adminOverrides DashboardLayoutOverrides) []DashboardWidgetInstance {
	if s == nil || s.store == nil {
		return nil
	}
	type slot struct {
		area     string
		id       string
		width    int
		position int
	}
	slots := []slot{}
	for area, rows := range overrides.AreaRows {
		for rowIdx, row := range rows {
			for colIdx, widget := range row.Widgets {
				id := strings.TrimSpace(widget.ID)
				if id == "" {
					continue
				}
				width := widget.Width
				if width <= 0 {
					width = 12
				}
				slots = append(slots, slot{
					area:     area,
					id:       id,
					width:    width,
					position: rowIdx*100 + colIdx,
				})
			}
		}
	}
	if len(slots) == 0 {
		for area, order := range overrides.AreaOrder {
			for idx, id := range order {
				id = strings.TrimSpace(id)
				if id == "" {
					continue
				}
				slots = append(slots, slot{
					area:     area,
					id:       id,
					position: idx,
				})
			}
		}
	}
	layout := []DashboardWidgetInstance{}
	for _, sl := range slots {
		inst, err := s.store.GetInstance(ctx, sl.id)
		if err != nil || inst.ID == "" {
			continue
		}
		layout = append(layout, DashboardWidgetInstance{
			ID:             inst.ID,
			DefinitionCode: inst.DefinitionID,
			AreaCode:       sl.area,
			Config:         cloneAny(inst.Configuration),
			Position:       sl.position,
			Span:           sl.width,
			Hidden:         adminOverrides.HiddenWidgets[inst.ID],
			Locale:         adminOverrides.Locale,
		})
	}
	return layout
}

type dashboardAuthorizerAdapter struct {
	authorizer Authorizer
	specs      map[string]DashboardProviderSpec
}

func (a dashboardAuthorizerAdapter) CanViewWidget(ctx context.Context, _ dashcmp.ViewerContext, instance dashcmp.WidgetInstance) bool {
	if a.authorizer == nil {
		return true
	}
	spec, ok := a.specs[instance.DefinitionID]
	if !ok {
		return true
	}
	perm := strings.TrimSpace(spec.Permission)
	if perm != "" && !a.authorizer.Can(ctx, perm, "dashboard") {
		return false
	}
	if len(spec.VisibilityRole) == 0 {
		return true
	}
	for _, role := range spec.VisibilityRole {
		role = strings.TrimSpace(role)
		if role == "" {
			continue
		}
		if a.authorizer.Can(ctx, "role:"+role, "dashboard") {
			return true
		}
	}
	return len(spec.VisibilityRole) == 0
}

type dashboardThemeProviderAdapter struct {
	provider ThemeProvider
	fallback *ThemeSelection
}

func (a dashboardThemeProviderAdapter) SelectTheme(ctx context.Context, selector dashcmp.ThemeSelector) (*dashcmp.ThemeSelection, error) {
	if a.provider != nil {
		if selector.Name != "" || selector.Variant != "" {
			ctx = WithThemeSelection(ctx, ThemeSelector{Name: selector.Name, Variant: selector.Variant})
		}
		adminTheme, err := a.provider(ctx, ThemeSelector{
			Name:    selector.Name,
			Variant: selector.Variant,
		})
		if err == nil && adminTheme != nil {
			return adaptTheme(adminTheme), nil
		}
		if err != nil && a.fallback == nil {
			return nil, err
		}
	}
	if a.fallback != nil {
		return adaptTheme(a.fallback), nil
	}
	return nil, nil
}

func adaptTheme(t *ThemeSelection) *dashcmp.ThemeSelection {
	if t == nil {
		return nil
	}
	return &dashcmp.ThemeSelection{
		Name:       t.Name,
		Variant:    t.Variant,
		Tokens:     primitives.CloneStringMapNilOnEmpty(t.Tokens),
		Templates:  primitives.CloneStringMapNilOnEmpty(t.Partials),
		ChartTheme: t.ChartTheme,
		Assets: dashcmp.ThemeAssets{
			Values: primitives.CloneStringMapNilOnEmpty(t.Assets),
			Prefix: t.AssetPrefix,
		},
	}
}

func cloneAny(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

func cloneStringSliceMap(in map[string][]string) map[string][]string {
	if in == nil {
		return map[string][]string{}
	}
	out := make(map[string][]string, len(in))
	for key, vals := range in {
		copied := make([]string, len(vals))
		copy(copied, vals)
		out[key] = copied
	}
	return out
}

func cloneHiddenWidgetMap(in map[string]bool) map[string]bool {
	if in == nil {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(in))
	for key, val := range in {
		if val {
			out[key] = true
		}
	}
	return out
}

func convertLayoutRows(rows map[string][]dashcmd.LayoutRowInput) map[string][]dashcmp.LayoutRow {
	out := map[string][]dashcmp.LayoutRow{}
	for area, areaRows := range rows {
		mapped := []dashcmp.LayoutRow{}
		for _, row := range areaRows {
			if len(row.Widgets) == 0 {
				continue
			}
			slots := []dashcmp.WidgetSlot{}
			for _, slot := range row.Widgets {
				if slot.ID == "" {
					continue
				}
				slots = append(slots, dashcmp.WidgetSlot{
					ID:    slot.ID,
					Width: slot.Width,
				})
			}
			if len(slots) > 0 {
				mapped = append(mapped, dashcmp.LayoutRow{Widgets: slots})
			}
		}
		if len(mapped) > 0 {
			out[area] = mapped
		}
	}
	return out
}

func convertDashboardRows(rows map[string][]DashboardLayoutRow) map[string][]dashcmp.LayoutRow {
	out := map[string][]dashcmp.LayoutRow{}
	for area, areaRows := range rows {
		converted := []dashcmp.LayoutRow{}
		for _, row := range areaRows {
			if len(row.Widgets) == 0 {
				continue
			}
			slots := []dashcmp.WidgetSlot{}
			for _, widget := range row.Widgets {
				if widget.ID == "" {
					continue
				}
				slots = append(slots, dashcmp.WidgetSlot{
					ID:    widget.ID,
					Width: widget.Width,
				})
			}
			if len(slots) > 0 {
				converted = append(converted, dashcmp.LayoutRow{Widgets: slots})
			}
		}
		if len(converted) > 0 {
			out[area] = converted
		}
	}
	return out
}

func convertRowsToAdmin(rows map[string][]dashcmp.LayoutRow) map[string][]DashboardLayoutRow {
	out := map[string][]DashboardLayoutRow{}
	for area, areaRows := range rows {
		converted := []DashboardLayoutRow{}
		for _, row := range areaRows {
			if len(row.Widgets) == 0 {
				continue
			}
			slots := []DashboardLayoutSlot{}
			for _, slot := range row.Widgets {
				if slot.ID == "" {
					continue
				}
				slots = append(slots, DashboardLayoutSlot{
					ID:    slot.ID,
					Width: slot.Width,
				})
			}
			if len(slots) > 0 {
				converted = append(converted, DashboardLayoutRow{Widgets: slots})
			}
		}
		if len(converted) > 0 {
			out[area] = converted
		}
	}
	return out
}

func toHiddenWidgetMap(ids []string) map[string]bool {
	out := map[string]bool{}
	for _, id := range ids {
		if id != "" {
			out[id] = true
		}
	}
	return out
}
