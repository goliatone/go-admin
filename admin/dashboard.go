package admin

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

// WidgetProvider produces data for a widget given viewer context/config.
type WidgetProvider func(ctx AdminContext, cfg map[string]any) (map[string]any, error)

// DashboardWidgetInstance represents a widget placed in an area.
type DashboardWidgetInstance = dashinternal.DashboardWidgetInstance

// DashboardProviderSpec captures provider metadata and behavior.
type DashboardProviderSpec struct {
	Code           string         `json:"code"`
	Name           string         `json:"name"`
	Schema         map[string]any `json:"schema,omitempty"`
	DefaultArea    string         `json:"default_area,omitempty"`
	DefaultConfig  map[string]any `json:"default_config,omitempty"`
	DefaultSpan    int            `json:"default_span,omitempty"`
	Permission     string         `json:"permission,omitempty"`
	Schedule       string         `json:"schedule,omitempty"`
	Description    string         `json:"description,omitempty"`
	CommandName    string         `json:"command_name,omitempty"`
	VisibilityRole []string       `json:"visibility_role,omitempty"`
	Handler        WidgetProvider `json:"-"`
}

// DashboardPreferences stores per-user layouts.
type DashboardPreferences = dashinternal.DashboardPreferences

// DashboardPreferencesWithContext allows contextual access to preferences (for activity/locale-aware stores).
type DashboardPreferencesWithContext = dashinternal.DashboardPreferencesWithContext

// InMemoryDashboardPreferences stores layouts in memory.
type InMemoryDashboardPreferences = dashinternal.InMemoryDashboardPreferences

// NewInMemoryDashboardPreferences constructs a preference store.
func NewInMemoryDashboardPreferences() *InMemoryDashboardPreferences {
	return dashinternal.NewInMemoryDashboardPreferences()
}

type registeredProvider struct {
	spec    DashboardProviderSpec
	handler WidgetProvider
}

// Dashboard orchestrates widget providers and instances.
type Dashboard struct {
	providers        map[string]registeredProvider
	defaultInstances []DashboardWidgetInstance
	widgetSvc        CMSWidgetService
	prefs            DashboardPreferences
	prefService      *PreferencesService
	authorizer       Authorizer
	commandBus       *CommandRegistry
	registry         *Registry
	activity         ActivitySink
	renderer         DashboardRenderer
	areas            map[string]WidgetAreaDefinition
	enforceAreas     bool
	components       *dashboardComponents
}

// NewDashboard constructs a dashboard registry with in-memory defaults.
func NewDashboard() *Dashboard {
	return &Dashboard{
		providers:        make(map[string]registeredProvider),
		defaultInstances: []DashboardWidgetInstance{},
		prefs:            NewInMemoryDashboardPreferences(),
		areas:            map[string]WidgetAreaDefinition{},
	}
}

// WithWidgetService wires a CMS widget service for definitions/instances.
func (d *Dashboard) WithWidgetService(svc CMSWidgetService) {
	d.widgetSvc = svc
	if d.widgetSvc == nil {
		return
	}
	d.components = nil
	if len(d.areas) > 0 {
		for _, area := range d.areas {
			_ = d.widgetSvc.RegisterAreaDefinition(context.Background(), area)
		}
	} else {
		for _, area := range d.widgetSvc.Areas() {
			d.storeArea(area)
		}
	}
}

// WithPreferences sets the preference store used for per-user layouts.
func (d *Dashboard) WithPreferences(store DashboardPreferences) {
	if store != nil {
		d.prefs = store
		d.components = nil
	}
}

// WithPreferenceService wires the PreferencesService used for go-dashboard overrides.
func (d *Dashboard) WithPreferenceService(service *PreferencesService) {
	if d != nil && service != nil {
		d.prefService = service
		d.components = nil
	}
}

// WithAuthorizer sets the authorizer for role/permission visibility.
func (d *Dashboard) WithAuthorizer(authz Authorizer) {
	d.authorizer = authz
	d.components = nil
}

// WithCommandBus wires the command registry so providers can expose commands.
func (d *Dashboard) WithCommandBus(bus *CommandRegistry) {
	d.commandBus = bus
}

// WithRegistry wires the shared registry for discovery/use by other transports.
func (d *Dashboard) WithRegistry(reg *Registry) {
	d.registry = reg
}

// WithActivitySink wires an activity sink for layout or widget changes.
func (d *Dashboard) WithActivitySink(sink ActivitySink) {
	if sink != nil {
		d.activity = sink
		d.components = nil
	}
}

// RegisterArea registers a dashboard widget area for provider/default-instance use.
func (d *Dashboard) RegisterArea(def WidgetAreaDefinition) {
	if d == nil {
		return
	}
	code := strings.TrimSpace(def.Code)
	if code == "" {
		return
	}
	def.Code = code
	d.storeArea(def)
	if d.widgetSvc != nil {
		_ = d.widgetSvc.RegisterAreaDefinition(context.Background(), def)
	}
}

// Areas returns known widget areas sorted by code.
func (d *Dashboard) Areas() []WidgetAreaDefinition {
	if d == nil {
		return nil
	}
	out := make([]WidgetAreaDefinition, 0, len(d.areas))
	for _, def := range d.areas {
		out = append(out, def)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Code < out[j].Code })
	return out
}

// EnforceKnownAreas toggles validation to prevent default instances from using unknown areas.
func (d *Dashboard) EnforceKnownAreas(enable bool) {
	if d != nil {
		d.enforceAreas = enable
	}
}

func (d *Dashboard) storeArea(def WidgetAreaDefinition) {
	if d.areas == nil {
		d.areas = map[string]WidgetAreaDefinition{}
	}
	d.areas[def.Code] = def
}

func (d *Dashboard) hasArea(code string) bool {
	if code == "" {
		return true
	}
	_, ok := d.areas[code]
	return ok
}

// WithRenderer sets the dashboard renderer for HTML generation.
// When set, enables server-side rendering of dashboard HTML.
func (d *Dashboard) WithRenderer(renderer DashboardRenderer) {
	d.renderer = renderer
	d.components = nil
}

// HasRenderer returns true if a renderer is configured.
func (d *Dashboard) HasRenderer() bool {
	return d.renderer != nil
}

// RegisterProvider registers a widget provider and optional default instance.
func (d *Dashboard) RegisterProvider(spec DashboardProviderSpec) {
	if d == nil || spec.Code == "" || spec.Handler == nil {
		return
	}

	// Replace existing provider and drop any previously registered default instances for the same code
	// so that overrides (e.g., app-specific providers without DefaultArea) do not leave stale defaults.
	filtered := d.defaultInstances[:0]
	for _, inst := range d.defaultInstances {
		if inst.DefinitionCode != spec.Code {
			filtered = append(filtered, inst)
		}
	}
	d.defaultInstances = filtered

	// Also clear persisted CMS widget instances for this definition when using a widget service.
	if d.widgetSvc != nil {
		if instances, err := d.widgetSvc.ListInstances(context.Background(), WidgetInstanceFilter{}); err == nil {
			for _, inst := range instances {
				if inst.DefinitionCode == spec.Code {
					_ = d.widgetSvc.DeleteInstance(context.Background(), inst.ID)
				}
			}
		}
	}

	d.providers[spec.Code] = registeredProvider{spec: spec, handler: spec.Handler}
	if d.registry != nil {
		d.registry.RegisterDashboardProvider(spec)
	}

	// Register widget definition with CMS widget service when available.
	if d.widgetSvc != nil && spec.Schema != nil {
		_ = d.widgetSvc.RegisterDefinition(context.Background(), WidgetDefinition{
			Code:   spec.Code,
			Name:   spec.Name,
			Schema: spec.Schema,
		})
	}

	// Register a command hook if requested.
	if d.commandBus != nil && spec.CommandName != "" {
		d.commandBus.Register(&dashboardProviderCommand{
			name:      spec.CommandName,
			dashboard: d,
			code:      spec.Code,
			cfg:       cloneAnyMap(spec.DefaultConfig),
		})
	}

	// Seed a default instance if provided.
	if spec.DefaultArea != "" {
		d.AddDefaultInstance(spec.DefaultArea, spec.Code, spec.DefaultConfig, spec.DefaultSpan, "")
	}
	d.components = nil
}

// RegisterManifest bulk registers providers (lightweight manifest discovery hook).
func (d *Dashboard) RegisterManifest(providers []DashboardProviderSpec) {
	for _, p := range providers {
		d.RegisterProvider(p)
	}
}

// AddDefaultInstance stores a default widget instance (used when no CMS/prefs are present).
func (d *Dashboard) AddDefaultInstance(area, defCode string, cfg map[string]any, span int, locale string) {
	area = strings.TrimSpace(area)
	if d.enforceAreas && area != "" && !d.hasArea(area) {
		return
	}
	if span <= 0 {
		span = 12
	}
	d.defaultInstances = append(d.defaultInstances, DashboardWidgetInstance{
		DefinitionCode: defCode,
		AreaCode:       area,
		Config:         cloneAnyMap(cfg),
		Span:           span,
		Hidden:         false,
		Locale:         locale,
	})
	if d.widgetSvc != nil {
		_, _ = d.widgetSvc.SaveInstance(context.Background(), WidgetInstance{
			DefinitionCode: defCode,
			Area:           area,
			Config:         cloneAnyMap(cfg),
			Span:           span,
			Locale:         locale,
		})
	}
}

// SetUserLayout stores per-user layout/preferences.
func (d *Dashboard) SetUserLayout(userID string, instances []DashboardWidgetInstance) {
	d.saveUserLayout(AdminContext{Context: context.Background(), UserID: userID}, instances)
}

// SetUserLayoutWithContext stores layouts with actor metadata for activity sinks.
func (d *Dashboard) SetUserLayoutWithContext(ctx AdminContext, instances []DashboardWidgetInstance) {
	d.saveUserLayout(ctx, instances)
}

func (d *Dashboard) saveUserLayout(ctx AdminContext, instances []DashboardWidgetInstance) {
	if d.prefService != nil && ctx.UserID != "" {
		_, _ = d.prefService.SaveDashboardLayout(ctx.Context, ctx.UserID, instances)
	}
	if prefCtx, ok := d.prefs.(DashboardPreferencesWithContext); ok {
		_ = prefCtx.SaveWithContext(ctx.Context, ctx.UserID, instances)
	} else if d.prefs != nil {
		_ = d.prefs.Save(ctx.UserID, instances)
	}
	d.recordActivity(ctx, "dashboard.layout.save", map[string]any{
		"widgets": len(instances),
		"user_id": ctx.UserID,
	})
}

func (d *Dashboard) recordActivity(ctx AdminContext, action string, metadata map[string]any) {
	if d == nil || d.activity == nil {
		return
	}
	actor := ctx.UserID
	if actor == "" {
		actor = actorFromContext(ctx.Context)
	}
	_ = d.activity.Record(ctx.Context, ActivityEntry{
		Actor:    actor,
		Action:   action,
		Object:   "dashboard",
		Metadata: metadata,
	})
}

func (d *Dashboard) ensureComponents(ctx context.Context) (*dashboardComponents, error) {
	if d == nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if d.components != nil {
		return d.components, nil
	}
	store := dashinternal.NewCMSWidgetStoreWithActivity(d.widgetServiceAdapter(), activityRecorderAdapter{sink: d.activity})
	if store == nil {
		return nil, fmt.Errorf("dashboard requires a CMS widget service")
	}
	registry, specs := d.buildDashboardProviders()
	var prefStore dashcmp.PreferenceStore
	if d.prefService != nil {
		prefStore = &dashboardPreferenceStore{prefs: d.prefService, store: store}
	} else {
		prefStore = dashcmp.NewInMemoryPreferenceStore()
	}
	refresh := dashcmp.NewBroadcastHook()
	renderer := d.renderer
	if renderer == nil {
		renderer = noopDashboardRenderer{}
	}
	opts := dashcmp.Options{
		WidgetStore:     store,
		Authorizer:      dashboardAuthorizerAdapter{authorizer: d.authorizer, specs: specs},
		PreferenceStore: prefStore,
		Providers:       registry,
		RefreshHook:     refresh,
	}
	service := dashcmp.NewService(opts)
	controller := dashcmp.NewController(dashcmp.ControllerOptions{
		Service:  service,
		Renderer: renderer,
		Template: "dashboard_ssr.html",
	})
	d.components = &dashboardComponents{
		service:    service,
		controller: controller,
		executor:   serviceExecutor{svc: service},
		broadcast:  refresh,
		providers:  registry,
		specs:      specs,
	}
	return d.components, nil
}

// Providers returns registered provider metadata.
func (d *Dashboard) Providers() []DashboardProviderSpec {
	out := []DashboardProviderSpec{}
	for _, p := range d.providers {
		out = append(out, p.spec)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Code < out[j].Code })
	return out
}

// Resolve returns widgets for a viewer, applying per-user preferences when present.
func (d *Dashboard) Resolve(ctx AdminContext) ([]map[string]any, error) {
	comp, err := d.ensureComponents(ctx.Context)
	if err != nil || comp == nil {
		return nil, err
	}
	viewer := viewerFromAdminContext(ctx)
	layout, err := comp.service.ConfigureLayout(ctx.Context, viewer)
	if err != nil {
		return nil, err
	}
	return flattenWidgets(layout), nil
}

// RenderLayout builds a DashboardLayout with resolved widgets grouped by area.
// This is used for server-side rendering via the configured DashboardRenderer.
func (d *Dashboard) RenderLayout(ctx AdminContext, theme *ThemeSelection, basePath string) (*DashboardLayout, error) {
	comp, err := d.ensureComponents(ctx.Context)
	if err != nil || comp == nil {
		return nil, err
	}
	viewer := viewerFromAdminContext(ctx)
	layout, err := comp.service.ConfigureLayout(ctx.Context, viewer)
	if err != nil {
		return nil, err
	}
	renderTheme := theme
	if layout.Theme != nil {
		renderTheme = convertDashboardTheme(layout.Theme)
	}
	return buildDashboardLayout(layout, renderTheme, basePath, viewer), nil
}

func (d *Dashboard) resolvedInstances(ctx AdminContext) []DashboardWidgetInstance {
	comp, err := d.ensureComponents(ctx.Context)
	if err != nil || comp == nil {
		return nil
	}
	viewer := viewerFromAdminContext(ctx)
	layout, err := comp.service.ConfigureLayout(ctx.Context, viewer)
	if err != nil {
		return nil
	}
	return instancesFromLayout(layout, viewer)
}

func cloneDashboardInstances(in []DashboardWidgetInstance) []DashboardWidgetInstance {
	return dashinternal.CloneDashboardInstances(in)
}

func viewerFromAdminContext(ctx AdminContext) dashcmp.ViewerContext {
	return dashcmp.ViewerContext{
		UserID: ctx.UserID,
		Locale: ctx.Locale,
	}
}

func orderedAreaCodes(areaMap map[string][]dashcmp.WidgetInstance) []string {
	preferred := []string{"admin.dashboard.main", "admin.dashboard.sidebar", "admin.dashboard.footer"}
	seen := map[string]bool{}
	order := []string{}
	for _, code := range preferred {
		if _, ok := areaMap[code]; ok {
			order = append(order, code)
			seen[code] = true
		}
	}
	extras := []string{}
	for code := range areaMap {
		if seen[code] {
			continue
		}
		extras = append(extras, code)
	}
	sort.Strings(extras)
	return append(order, extras...)
}

func flattenWidgets(layout dashcmp.Layout) []map[string]any {
	areas := orderedAreaCodes(layout.Areas)
	out := []map[string]any{}
	for _, code := range areas {
		for _, inst := range layout.Areas[code] {
			out = append(out, map[string]any{
				"definition": inst.DefinitionID,
				"area":       inst.AreaCode,
				"config":     cloneAny(inst.Configuration),
				"data":       extractWidgetData(inst.Metadata),
			})
		}
	}
	return out
}

func buildDashboardLayout(layout dashcmp.Layout, theme *ThemeSelection, basePath string, viewer dashcmp.ViewerContext) *DashboardLayout {
	areas := orderedAreaCodes(layout.Areas)
	resolvedAreas := make([]*WidgetArea, 0, len(areas))
	for _, code := range areas {
		widgets := layout.Areas[code]
		resolved := make([]*ResolvedWidget, 0, len(widgets))
		for idx, inst := range widgets {
			meta := inst.Metadata
			span := spanFromMetadata(meta)
			if span <= 0 {
				span = 12
			}
			order := orderFromMetadata(meta)
			if order < 0 {
				order = idx
			}
			resolved = append(resolved, &ResolvedWidget{
				ID:         inst.ID,
				Definition: inst.DefinitionID,
				Area:       inst.AreaCode,
				Data:       extractWidgetData(meta),
				Config:     cloneAny(inst.Configuration),
				Hidden:     hiddenFromMetadata(meta),
				Span:       span,
				Metadata: &WidgetMetadata{
					Layout: &WidgetLayout{Width: span},
					Order:  order,
				},
			})
		}
		resolvedAreas = append(resolvedAreas, &WidgetArea{
			Code:    code,
			Title:   code,
			Widgets: resolved,
		})
	}
	return &DashboardLayout{
		Areas:    resolvedAreas,
		Theme:    theme,
		BasePath: basePath,
		Metadata: map[string]any{
			"user_id": viewer.UserID,
			"locale":  viewer.Locale,
		},
	}
}

func instancesFromLayout(layout dashcmp.Layout, viewer dashcmp.ViewerContext) []DashboardWidgetInstance {
	areas := orderedAreaCodes(layout.Areas)
	out := []DashboardWidgetInstance{}
	position := 0
	for _, code := range areas {
		for _, inst := range layout.Areas[code] {
			meta := inst.Metadata
			order := orderFromMetadata(meta)
			if order < 0 {
				order = position
			}
			locale := localeFromMetadata(meta)
			if locale == "" {
				locale = viewer.Locale
			}
			out = append(out, DashboardWidgetInstance{
				ID:             inst.ID,
				DefinitionCode: inst.DefinitionID,
				AreaCode:       inst.AreaCode,
				Config:         cloneAny(inst.Configuration),
				Position:       order,
				Span:           spanFromMetadata(meta),
				Hidden:         hiddenFromMetadata(meta),
				Locale:         locale,
			})
			position++
		}
	}
	return out
}

func extractWidgetData(meta map[string]any) map[string]any {
	if meta == nil {
		return nil
	}
	switch data := meta["data"].(type) {
	case map[string]any:
		return data
	case dashcmp.WidgetData:
		return map[string]any(data)
	}
	return nil
}

func spanFromMetadata(meta map[string]any) int {
	if meta == nil {
		return 0
	}
	if layout, ok := meta["layout"].(map[string]any); ok {
		if width := numericToInt(layout["width"]); width > 0 {
			return width
		}
	}
	return numericToInt(meta["width"])
}

func hiddenFromMetadata(meta map[string]any) bool {
	if meta == nil {
		return false
	}
	if hidden, ok := meta["hidden"].(bool); ok {
		return hidden
	}
	return false
}

func orderFromMetadata(meta map[string]any) int {
	if meta == nil {
		return -1
	}
	return numericToInt(meta["order"])
}

func localeFromMetadata(meta map[string]any) string {
	if meta == nil {
		return ""
	}
	if locale, ok := meta["locale"].(string); ok {
		return locale
	}
	return ""
}

func numericToInt(val any) int {
	switch v := val.(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float32:
		if v == 0 {
			return 0
		}
		return int(v)
	case float64:
		if v == 0 {
			return 0
		}
		return int(v)
	case string:
		if strings.TrimSpace(v) == "" {
			return -1
		}
		if parsed, err := strconv.Atoi(strings.TrimSpace(v)); err == nil {
			return parsed
		}
	}
	return -1
}

func convertDashboardTheme(theme *dashcmp.ThemeSelection) *ThemeSelection {
	if theme == nil {
		return nil
	}
	assets := theme.Assets.Resolved()
	return &ThemeSelection{
		Name:        theme.Name,
		Variant:     theme.Variant,
		Tokens:      cloneStringMap(theme.Tokens),
		Assets:      cloneStringMap(assets),
		ChartTheme:  theme.ChartTheme,
		AssetPrefix: theme.Assets.Prefix,
	}
}

func (d *Dashboard) widgetServiceAdapter() dashinternal.WidgetService {
	if d == nil || d.widgetSvc == nil {
		return nil
	}
	if svc, ok := d.widgetSvc.(dashinternal.WidgetService); ok {
		return svc
	}
	return cmsWidgetServiceAdapter{svc: d.widgetSvc}
}

// DashboardProviderCommand allows fetching widget data via command bus.
type dashboardProviderCommand struct {
	name      string
	dashboard *Dashboard
	code      string
	cfg       map[string]any
}

func (c *dashboardProviderCommand) Name() string {
	return c.name
}

func (c *dashboardProviderCommand) Execute(ctx context.Context) error {
	if c.dashboard == nil {
		return errors.New("dashboard not set")
	}
	adminCtx := AdminContext{Context: ctx, UserID: "", Locale: "en"}
	provider, ok := c.dashboard.providers[c.code]
	if !ok || provider.handler == nil {
		return ErrNotFound
	}
	_, err := provider.handler(adminCtx, cloneAnyMap(c.cfg))
	return err
}
