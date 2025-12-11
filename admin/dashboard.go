package admin

import (
	"context"
	"errors"
	"sort"
	"strings"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
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
	authorizer       Authorizer
	commandBus       *CommandRegistry
	registry         *Registry
	activity         ActivitySink
	renderer         DashboardRenderer
	areas            map[string]WidgetAreaDefinition
	enforceAreas     bool
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
	}
}

// WithAuthorizer sets the authorizer for role/permission visibility.
func (d *Dashboard) WithAuthorizer(authz Authorizer) {
	d.authorizer = authz
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
	inst := d.resolvedInstances(ctx)
	out := []map[string]any{}
	for _, wi := range inst {
		provider, ok := d.providers[wi.DefinitionCode]
		if !ok {
			continue
		}
		// Skip explicitly disabled/legacy providers (e.g., chart_sample override) even if old instances linger.
		if strings.EqualFold(provider.spec.Code, "admin.widget.chart_sample") && strings.Contains(strings.ToLower(provider.spec.Name), "disabled") {
			continue
		}
		if !d.isVisible(ctx, provider.spec) {
			continue
		}
		data, err := provider.handler(ctx, wi.Config)
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

// RenderLayout builds a DashboardLayout with resolved widgets grouped by area.
// This is used for server-side rendering via the configured DashboardRenderer.
func (d *Dashboard) RenderLayout(ctx AdminContext, theme *ThemeSelection, basePath string) (*DashboardLayout, error) {
	inst := d.resolvedInstances(ctx)

	// Group widgets by area
	areaMap := make(map[string][]*ResolvedWidget)

	for _, wi := range inst {
		provider, ok := d.providers[wi.DefinitionCode]
		if !ok {
			continue
		}
		// Skip explicitly disabled/legacy providers
		if strings.EqualFold(provider.spec.Code, "admin.widget.chart_sample") && strings.Contains(strings.ToLower(provider.spec.Name), "disabled") {
			continue
		}
		if !d.isVisible(ctx, provider.spec) {
			continue
		}

		data, err := provider.handler(ctx, wi.Config)
		if err != nil {
			return nil, err
		}

		span := wi.Span
		if span <= 0 {
			span = 12
		}

		resolved := &ResolvedWidget{
			ID:         wi.ID,
			Definition: wi.DefinitionCode,
			Area:       wi.AreaCode,
			Data:       data,
			Config:     wi.Config,
			Hidden:     wi.Hidden,
			Span:       span,
			Metadata: &WidgetMetadata{
				Layout: &WidgetLayout{
					Width: span,
				},
				Order: wi.Position,
			},
		}

		areaMap[wi.AreaCode] = append(areaMap[wi.AreaCode], resolved)
	}

	// Build areas slice
	areas := []*WidgetArea{}
	for areaCode, widgets := range areaMap {
		// Sort widgets by position
		sort.Slice(widgets, func(i, j int) bool {
			if widgets[i].Metadata != nil && widgets[j].Metadata != nil {
				return widgets[i].Metadata.Order < widgets[j].Metadata.Order
			}
			return false
		})

		areas = append(areas, &WidgetArea{
			Code:    areaCode,
			Title:   areaCode,
			Widgets: widgets,
		})
	}

	// Sort areas for consistent output
	sort.Slice(areas, func(i, j int) bool {
		return areas[i].Code < areas[j].Code
	})

	return &DashboardLayout{
		Areas:    areas,
		Theme:    theme,
		BasePath: basePath,
		Metadata: map[string]any{
			"user_id": ctx.UserID,
			"locale":  ctx.Locale,
		},
	}, nil
}

func (d *Dashboard) resolvedInstances(ctx AdminContext) []DashboardWidgetInstance {
	if d.prefs != nil && ctx.UserID != "" {
		if prefCtx, ok := d.prefs.(DashboardPreferencesWithContext); ok && ctx.Context != nil {
			if layout := prefCtx.ForUserWithContext(ctx.Context, ctx.UserID); len(layout) > 0 {
				return d.filterInstances(layout)
			}
		}
		if layout := d.prefs.ForUser(ctx.UserID); len(layout) > 0 {
			return d.filterInstances(layout)
		}
	}
	if d.widgetSvc != nil {
		insts, err := d.widgetSvc.ListInstances(ctx.Context, WidgetInstanceFilter{Locale: ctx.Locale})
		if err == nil && len(insts) > 0 {
			out := []DashboardWidgetInstance{}
			for _, inst := range insts {
				out = append(out, DashboardWidgetInstance{
					ID:             inst.ID,
					DefinitionCode: inst.DefinitionCode,
					AreaCode:       inst.Area,
					Config:         cloneAnyMap(inst.Config),
					Position:       inst.Position,
					Span:           inst.Span,
					Hidden:         inst.Hidden,
					Locale:         inst.Locale,
				})
			}
			sort.Slice(out, func(i, j int) bool {
				if out[i].Position == out[j].Position {
					return out[i].DefinitionCode < out[j].DefinitionCode
				}
				return out[i].Position < out[j].Position
			})
			return d.filterInstances(out)
		}
	}
	return d.filterInstances(cloneDashboardInstances(d.defaultInstances))
}

func (d *Dashboard) filterInstances(instances []DashboardWidgetInstance) []DashboardWidgetInstance {
	if !d.enforceAreas {
		return instances
	}
	out := []DashboardWidgetInstance{}
	for _, inst := range instances {
		if inst.AreaCode != "" && !d.hasArea(inst.AreaCode) {
			continue
		}
		out = append(out, inst)
	}
	return out
}

func (d *Dashboard) isVisible(ctx AdminContext, spec DashboardProviderSpec) bool {
	if spec.Permission == "" && len(spec.VisibilityRole) == 0 {
		return true
	}
	if d.authorizer == nil {
		return true
	}
	if spec.Permission != "" && !d.authorizer.Can(ctx.Context, spec.Permission, "dashboard") {
		return false
	}
	if len(spec.VisibilityRole) == 0 {
		return true
	}
	for _, role := range spec.VisibilityRole {
		if strings.TrimSpace(role) == "" {
			continue
		}
		if d.authorizer.Can(ctx.Context, "role:"+role, "dashboard") {
			return true
		}
	}
	return len(spec.VisibilityRole) == 0
}

func cloneDashboardInstances(in []DashboardWidgetInstance) []DashboardWidgetInstance {
	return dashinternal.CloneDashboardInstances(in)
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
