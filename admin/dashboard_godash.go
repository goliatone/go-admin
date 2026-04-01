package admin

import (
	"context"
	"encoding/json"
	"github.com/goliatone/go-admin/internal/primitives"
	"io"
	"strings"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

type dashboardComponents struct {
	runtime *dashcmp.Runtime
	specs   map[string]DashboardProviderSpec
}

type dashboardRuntimeBuildOptions struct {
	store         dashcmp.WidgetStore
	authorizer    dashcmp.Authorizer
	preferences   dashcmp.PreferenceStore
	providers     *dashcmp.Registry
	renderer      dashcmp.Renderer
	template      string
	areas         []string
	themeProvider dashcmp.ThemeProvider
	themeSelector func(context.Context, dashcmp.ViewerContext) dashcmp.ThemeSelector
	decorator     dashcmp.PayloadDecorator
}

func (d *Dashboard) setComponents(comp *dashboardComponents) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	d.components = comp
}

func buildDashboardRuntimeOptions(opts dashboardRuntimeBuildOptions) dashcmp.RuntimeOptions {
	refresh := dashcmp.NewBroadcastHook()
	renderer := opts.renderer
	if renderer == nil {
		renderer = noopDashboardRenderer{}
	}
	template := strings.TrimSpace(opts.template)
	if template == "" {
		template = "dashboard_ssr.html"
	}
	serviceOpts := dashcmp.Options{
		WidgetStore:     opts.store,
		Authorizer:      opts.authorizer,
		PreferenceStore: opts.preferences,
		Providers:       opts.providers,
		RefreshHook:     refresh,
		ThemeProvider:   opts.themeProvider,
		ThemeSelector:   opts.themeSelector,
	}
	if len(opts.areas) > 0 {
		serviceOpts.Areas = append([]string{}, opts.areas...)
	}
	return dashcmp.RuntimeOptions{
		Service:   serviceOpts,
		Broadcast: refresh,
		Controller: dashcmp.ControllerOptions{
			Renderer:         renderer,
			Template:         template,
			PayloadDecorator: opts.decorator,
		},
	}
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

	providerRegistry, specs := a.dashboard.providerSnapshot()
	authorizer := dashboardAuthorizerAdapter{
		authorizer: a.authorizer,
		specs:      specs,
	}
	prefStore := a.buildDashboardPreferenceStore(store)
	themeProvider := a.dashboardThemeProvider()
	renderer := a.dashboardRenderer()
	runtime := dashcmp.NewRuntime(buildDashboardRuntimeOptions(dashboardRuntimeBuildOptions{
		store:         store,
		authorizer:    authorizer,
		preferences:   prefStore,
		providers:     providerRegistry,
		renderer:      renderer,
		template:      "dashboard_ssr.html",
		themeProvider: themeProvider,
		themeSelector: func(ctx context.Context, _ dashcmp.ViewerContext) dashcmp.ThemeSelector {
			selector := mergeSelector(ThemeSelector{
				Name:    a.config.Theme,
				Variant: a.config.ThemeVariant,
			}, ThemeSelectorFromContext(ctx))
			return dashcmp.ThemeSelector{Name: selector.Name, Variant: selector.Variant}
		},
		decorator: decorateDashboardControllerPayload,
	}))
	components := &dashboardComponents{runtime: runtime, specs: specs}
	a.dash = components
	a.dashboard.setComponents(a.dash)
	return nil
}

func (a *Admin) dashboardRenderer() dashcmp.Renderer {
	if a.dashboard != nil && a.dashboard.renderer != nil {
		return a.dashboard.renderer
	}
	return noopDashboardRenderer{}
}

func (d *Dashboard) providerSnapshot() (*dashcmp.Registry, map[string]DashboardProviderSpec) {
	if d == nil {
		return dashcmp.NewRegistry(), map[string]DashboardProviderSpec{}
	}
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.providerSnapshotLocked()
}

func (d *Dashboard) providerSnapshotLocked() (*dashcmp.Registry, map[string]DashboardProviderSpec) {
	if d == nil {
		return dashcmp.NewRegistry(), map[string]DashboardProviderSpec{}
	}
	registry := dashcmp.NewRegistry()
	if d.providerRegistry != nil {
		if snapshot := d.providerRegistry.Clone(); snapshot != nil {
			registry = snapshot
		}
	}
	specs := map[string]DashboardProviderSpec{}
	for code, spec := range d.providers {
		specs[code] = cloneDashboardProviderSpec(spec)
	}
	return registry, specs
}

func registerDashboardProviderWithRegistry(registry *dashcmp.Registry, spec DashboardProviderSpec) {
	if registry == nil || spec.Code == "" || spec.Handler == nil {
		return
	}
	name := strings.TrimSpace(spec.Name)
	if name == "" {
		name = spec.Code
	}
	_ = registry.RegisterDefinition(dashcmp.WidgetDefinition{
		Code:   spec.Code,
		Name:   name,
		Schema: primitives.CloneAnyMap(spec.Schema),
	})
	defaultCfg := cloneAny(spec.DefaultConfig)
	_ = registry.RegisterProvider(spec.Code, dashcmp.ProviderFunc(func(ctx context.Context, meta dashcmp.WidgetContext) (dashcmp.WidgetData, error) {
		cfg := cloneAny(defaultCfg)
		if cfg == nil {
			cfg = map[string]any{}
		}
		if meta.Instance.Configuration != nil {
			for key, val := range meta.Instance.Configuration {
				cfg[key] = val
			}
		}
		adminCtx := AdminContext{
			Context: ctx,
			UserID:  meta.Viewer.UserID,
			Locale:  meta.Viewer.Locale,
		}
		payload, err := spec.Handler(adminCtx, cfg)
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

func (a *Admin) buildDashboardPreferenceStore(store dashcmp.WidgetStore) dashcmp.PreferenceStore {
	if a.preferences == nil {
		return dashcmp.NewInMemoryPreferenceStore()
	}
	return newDashboardPreferenceStore(a.preferences, store)
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

type dashboardPreferenceBackend struct {
	prefs *PreferencesService
}

func newDashboardPreferenceStore(prefs *PreferencesService, store dashcmp.WidgetStore) dashcmp.PreferenceStore {
	if prefs == nil {
		return dashcmp.NewInMemoryPreferenceStore()
	}
	return dashinternal.NewGoDashPreferenceStore(
		dashboardPreferenceBackend{prefs: prefs},
		store,
		dashinternal.WithMissingViewerUserIDError(func() error {
			return requiredFieldDomainError("viewer user id", map[string]any{"scope": "dashboard_preferences"})
		}),
	)
}

func (b dashboardPreferenceBackend) LoadDashboardLayoutOverrides(ctx context.Context, userID string) dashinternal.StoredLayoutOverrides {
	if b.prefs == nil || userID == "" {
		return dashinternal.StoredLayoutOverrides{}
	}
	stored := b.prefs.DashboardOverrides(ctx, userID)
	areaOrder := map[string][]string{}
	for area, ids := range stored.AreaOrder {
		copied := make([]string, len(ids))
		copy(copied, ids)
		areaOrder[area] = copied
	}
	hiddenWidgets := map[string]bool{}
	for id, hidden := range stored.HiddenWidgets {
		if hidden {
			hiddenWidgets[id] = true
		}
	}
	areaRows := map[string][]dashinternal.StoredLayoutRow{}
	for area, rows := range stored.AreaRows {
		converted := make([]dashinternal.StoredLayoutRow, 0, len(rows))
		for _, row := range rows {
			if len(row.Widgets) == 0 {
				continue
			}
			slots := make([]dashinternal.StoredLayoutSlot, 0, len(row.Widgets))
			for _, slot := range row.Widgets {
				if slot.ID == "" {
					continue
				}
				slots = append(slots, dashinternal.StoredLayoutSlot{
					ID:    slot.ID,
					Width: slot.Width,
				})
			}
			if len(slots) > 0 {
				converted = append(converted, dashinternal.StoredLayoutRow{Widgets: slots})
			}
		}
		if len(converted) > 0 {
			areaRows[area] = converted
		}
	}
	return dashinternal.StoredLayoutOverrides{
		Locale:        stored.Locale,
		AreaOrder:     areaOrder,
		AreaRows:      areaRows,
		HiddenWidgets: hiddenWidgets,
	}
}

func (b dashboardPreferenceBackend) SaveDashboardLayoutOverrides(ctx context.Context, userID string, overrides dashinternal.StoredLayoutOverrides) error {
	if b.prefs == nil || userID == "" {
		return nil
	}
	areaOrder := map[string][]string{}
	for area, ids := range overrides.AreaOrder {
		copied := make([]string, len(ids))
		copy(copied, ids)
		areaOrder[area] = copied
	}
	hiddenWidgets := map[string]bool{}
	for id, hidden := range overrides.HiddenWidgets {
		if hidden {
			hiddenWidgets[id] = true
		}
	}
	areaRows := map[string][]DashboardLayoutRow{}
	for area, rows := range overrides.AreaRows {
		converted := make([]DashboardLayoutRow, 0, len(rows))
		for _, row := range rows {
			if len(row.Widgets) == 0 {
				continue
			}
			slots := make([]DashboardLayoutSlot, 0, len(row.Widgets))
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
			areaRows[area] = converted
		}
	}
	_, err := b.prefs.SaveDashboardOverrides(ctx, userID, DashboardLayoutOverrides{
		Locale:        overrides.Locale,
		AreaOrder:     areaOrder,
		AreaRows:      areaRows,
		HiddenWidgets: hiddenWidgets,
	})
	return err
}

func (b dashboardPreferenceBackend) SaveDashboardLayout(ctx context.Context, userID string, layout []dashinternal.DashboardWidgetInstance) error {
	if b.prefs == nil || userID == "" {
		return nil
	}
	_, err := b.prefs.SaveDashboardLayout(ctx, userID, layout)
	return err
}

type dashboardAuthorizerAdapter struct {
	authorizer Authorizer
	specs      map[string]DashboardProviderSpec
}

func (a dashboardAuthorizerAdapter) CanViewWidget(ctx context.Context, _ dashcmp.ViewerContext, instance dashcmp.WidgetInstance) bool {
	spec, ok := a.specs[instance.DefinitionID]
	if !ok {
		return true
	}
	perm := strings.TrimSpace(spec.Permission)
	if perm != "" && !permissionAllowed(a.authorizer, ctx, perm, "dashboard") {
		return false
	}
	if len(spec.VisibilityRole) == 0 {
		return true
	}
	if a.authorizer == nil {
		return false
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
	for key, val := range m {
		out[key] = val
	}
	return out
}

type dashboardPayloadContextKey struct{}

func withDashboardPayloadMetadata(ctx context.Context, metadata map[string]any) context.Context {
	if len(metadata) == 0 {
		return ctx
	}
	return context.WithValue(ctx, dashboardPayloadContextKey{}, cloneAny(metadata))
}

func dashboardPayloadMetadataFromContext(ctx context.Context) map[string]any {
	if ctx == nil {
		return nil
	}
	raw, _ := ctx.Value(dashboardPayloadContextKey{}).(map[string]any)
	return cloneAny(raw)
}

func decorateDashboardControllerPayload(ctx context.Context, _ dashcmp.ViewerContext, payload map[string]any) (map[string]any, error) {
	metadata := dashboardPayloadMetadataFromContext(ctx)
	if len(metadata) == 0 {
		return payload, nil
	}
	ordered := orderedDashboardAreasPayload(payload["ordered_areas"])
	if len(ordered) > 0 {
		payload["areas"] = ordered
		if _, ok := metadata["layout_json"]; !ok {
			raw, err := json.Marshal(map[string]any{"areas": ordered})
			if err != nil {
				return nil, err
			}
			metadata["layout_json"] = string(raw)
		}
	}
	for key, val := range metadata {
		if val != nil {
			payload[key] = val
		}
	}
	return payload, nil
}

func orderedDashboardAreasPayload(raw any) []map[string]any {
	switch typed := raw.(type) {
	case []map[string]any:
		return typed
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			if mapped, ok := item.(map[string]any); ok {
				out = append(out, mapped)
			}
		}
		return out
	default:
		return nil
	}
}
