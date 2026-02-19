package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"regexp"
	"sort"
	"strconv"
	"strings"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

// WidgetProvider produces data for a widget given viewer context/config.
// Providers must return a canonical WidgetPayload.
type WidgetProvider func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error)

var dashboardPayloadBlockedPattern = regexp.MustCompile(`(?is)<\s*(!doctype|html|head|body|script)\b`)

var dashboardPayloadBlockedKeys = map[string]struct{}{
	"chart_html":          {},
	"chart_html_fragment": {},
}

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

type widgetInstanceExistenceChecker interface {
	HasInstanceForDefinition(ctx context.Context, definitionCode string, filter WidgetInstanceFilter) (bool, error)
}

// Dashboard orchestrates widget providers and instances.
type Dashboard struct {
	providers        map[string]registeredProvider
	providerCommands map[string]string
	defaultInstances []DashboardWidgetInstance
	logger           Logger
	widgetSvc        CMSWidgetService
	prefs            DashboardPreferences
	prefService      *PreferencesService
	authorizer       Authorizer
	commandBus       *CommandBus
	registry         *Registry
	activity         ActivitySink
	renderer         DashboardRenderer
	areas            map[string]WidgetAreaDefinition
	enforceAreas     bool
	components       *dashboardComponents
	providerCmdReady bool
}

// NewDashboard constructs a dashboard registry with in-memory defaults.
func NewDashboard() *Dashboard {
	return &Dashboard{
		providers:        make(map[string]registeredProvider),
		providerCommands: make(map[string]string),
		defaultInstances: []DashboardWidgetInstance{},
		logger:           ensureLogger(nil),
		prefs:            NewInMemoryDashboardPreferences(),
		areas:            map[string]WidgetAreaDefinition{},
	}
}

// WithLogger sets the runtime logger used by dashboard internals.
func (d *Dashboard) WithLogger(logger Logger) {
	if d != nil {
		d.logger = ensureLogger(logger)
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

// WithCommandBus wires the command bus so providers can expose commands.
func (d *Dashboard) WithCommandBus(bus *CommandBus) {
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
	prev, had := d.areas[code]
	d.storeArea(def)
	if !had || prev != def {
		// Area list is baked into go-dashboard service options at initialization time.
		// Force a rebuild so newly registered areas are resolvable in subsequent layout renders.
		d.components = nil
	}
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
	spec.CommandName = strings.TrimSpace(spec.CommandName)
	previous, hadPrevious := d.providers[spec.Code]
	if hadPrevious {
		prevCommand := strings.TrimSpace(previous.spec.CommandName)
		if prevCommand != "" && prevCommand != spec.CommandName {
			delete(d.providerCommands, prevCommand)
		}
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

	// Track whether a persisted instance already exists for this definition.
	hasPersistedInstance := false
	if d.widgetSvc != nil {
		if checker, ok := d.widgetSvc.(widgetInstanceExistenceChecker); ok {
			exists, err := checker.HasInstanceForDefinition(context.Background(), spec.Code, WidgetInstanceFilter{})
			if err == nil {
				hasPersistedInstance = exists
			}
		}
		if !hasPersistedInstance {
			filter := WidgetInstanceFilter{}
			area := strings.TrimSpace(spec.DefaultArea)
			if area != "" {
				filter.Area = area
			}
			if instances, err := d.widgetSvc.ListInstances(context.Background(), filter); err == nil {
				for _, inst := range instances {
					if inst.DefinitionCode == spec.Code {
						hasPersistedInstance = true
						break
					}
				}
			}
		}
	}

	d.providers[spec.Code] = registeredProvider{spec: spec, handler: spec.Handler}
	if d.registry != nil {
		d.registry.RegisterDashboardProvider(spec)
	}
	if d.components != nil {
		d.logger.Warn("dashboard provider registered after initialization; updating live registry",
			"provider", spec.Code)
		d.registerProviderInComponents(spec, spec.Handler)
	}

	// Register widget definition with CMS widget service when available.
	// Some CMS backends require a non-empty schema, so default to an empty schema
	// to allow persistence/seed even for non-configurable widgets.
	if d.widgetSvc != nil {
		schema := primitives.CloneAnyMap(spec.Schema)
		if len(schema) == 0 {
			schema = map[string]any{"fields": []any{}}
		}
		name := strings.TrimSpace(spec.Name)
		if name == "" {
			name = spec.Code
		}
		_ = d.widgetSvc.RegisterDefinition(context.Background(), WidgetDefinition{
			Code:   spec.Code,
			Name:   name,
			Schema: schema,
		})
	}

	// Register a command hook if requested.
	if d.commandBus != nil && spec.CommandName != "" {
		if d.providerCommands == nil {
			d.providerCommands = map[string]string{}
		}
		if existingCode, exists := d.providerCommands[spec.CommandName]; exists {
			if existingCode != spec.Code {
				d.logger.Warn("dashboard command already mapped; skipping provider",
					"command", spec.CommandName,
					"existing_provider", existingCode,
					"provider", spec.Code)
			}
		} else {
			if !d.providerCmdReady {
				_, _ = RegisterCommand(d.commandBus, &dashboardProviderCommand{dashboard: d})
				d.providerCmdReady = true
			}
			if err := RegisterDashboardProviderFactory(d.commandBus, spec.CommandName, spec.Code, spec.DefaultConfig); err != nil {
				d.logger.Warn("failed to register dashboard command",
					"command", spec.CommandName,
					"error", err)
			} else {
				d.providerCommands[spec.CommandName] = spec.Code
			}
		}
	}

	// Seed a default instance if provided and no persisted instance already exists.
	if spec.DefaultArea != "" && !hasPersistedInstance {
		d.AddDefaultInstance(spec.DefaultArea, spec.Code, spec.DefaultConfig, spec.DefaultSpan, "")
	}
}

func (d *Dashboard) registerProviderInComponents(spec DashboardProviderSpec, handler WidgetProvider) {
	if d == nil || d.components == nil || d.components.providers == nil || handler == nil {
		return
	}
	def := dashcmp.WidgetDefinition{
		Code:   spec.Code,
		Name:   spec.Name,
		Schema: spec.Schema,
	}
	_ = d.components.providers.RegisterDefinition(def)
	_ = d.components.providers.RegisterProvider(spec.Code, dashcmp.ProviderFunc(func(ctx context.Context, meta dashcmp.WidgetContext) (dashcmp.WidgetData, error) {
		cfg := cloneAny(spec.DefaultConfig)
		if cfg == nil {
			cfg = map[string]any{}
		}
		for k, v := range meta.Instance.Configuration {
			cfg[k] = v
		}
		adminCtx := AdminContext{
			Context:    ctx,
			UserID:     meta.Viewer.UserID,
			Locale:     meta.Viewer.Locale,
			RenderMode: dashboardRenderModeFromContext(ctx),
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
	if d.components.specs != nil {
		d.components.specs[spec.Code] = spec
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
		Config:         primitives.CloneAnyMap(cfg),
		Span:           span,
		Hidden:         false,
		Locale:         locale,
	})
	if d.widgetSvc != nil {
		_ = d.widgetSvc.Definitions()
		if _, err := d.widgetSvc.SaveInstance(context.Background(), WidgetInstance{
			DefinitionCode: defCode,
			Area:           area,
			Config:         primitives.CloneAnyMap(cfg),
			Span:           span,
			Locale:         locale,
		}); err != nil {
			d.logger.Warn("failed to persist default widget instance",
				"definition", defCode,
				"area", area,
				"error", err)
		}
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
		return nil, serviceNotConfiguredDomainError("dashboard cms widget service", map[string]any{"component": "dashboard"})
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
	if areas := d.areaCodesForService(); len(areas) > 0 {
		opts.Areas = areas
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

func (d *Dashboard) areaCodesForService() []string {
	if d == nil {
		return nil
	}
	seen := map[string]struct{}{}
	out := []string{}
	for _, area := range d.Areas() {
		code := strings.TrimSpace(area.Code)
		if code == "" {
			continue
		}
		if _, ok := seen[code]; ok {
			continue
		}
		seen[code] = struct{}{}
		out = append(out, code)
	}
	if d.widgetSvc != nil {
		for _, area := range d.widgetSvc.Areas() {
			code := strings.TrimSpace(area.Code)
			if code == "" {
				continue
			}
			if _, ok := seen[code]; ok {
				continue
			}
			seen[code] = struct{}{}
			out = append(out, code)
		}
	}
	sort.Strings(out)
	return out
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
	ctx = normalizeAdminContextRenderMode(ctx, DashboardRenderModeClient)
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
	ctx = normalizeAdminContextRenderMode(ctx, DashboardRenderModeSSR)
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
	ctx = normalizeAdminContextRenderMode(ctx, DashboardRenderModeClient)
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

func normalizeAdminContextRenderMode(ctx AdminContext, fallback DashboardRenderMode) AdminContext {
	mode := normalizeDashboardRenderMode(ctx.RenderMode)
	if mode == "" {
		mode = dashboardRenderModeFromContext(ctx.Context)
	}
	if mode == "" {
		mode = fallback
	}
	ctx.RenderMode = mode
	ctx.Context = withDashboardRenderMode(ctx.Context, mode)
	return ctx
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
		Tokens:      primitives.CloneStringMapNilOnEmpty(theme.Tokens),
		Assets:      primitives.CloneStringMapNilOnEmpty(assets),
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
	dashboard *Dashboard
}

func (c *dashboardProviderCommand) Execute(ctx context.Context, msg DashboardProviderMsg) error {
	if c.dashboard == nil {
		return serviceNotConfiguredDomainError("dashboard", map[string]any{"component": "dashboard"})
	}
	code := strings.TrimSpace(msg.Code)
	if code == "" {
		code = c.dashboard.providerCodeForCommand(msg.CommandName)
	}
	adminCtx := AdminContext{
		Context:    ctx,
		UserID:     userIDFromContext(ctx),
		Locale:     localeFromContext(ctx),
		RenderMode: dashboardRenderModeFromContext(ctx),
	}
	if adminCtx.Locale == "" {
		adminCtx.Locale = "en"
	}
	provider, ok := c.dashboard.providers[code]
	if !ok || provider.handler == nil {
		return ErrNotFound
	}
	cfg := primitives.CloneAnyMap(msg.Config)
	if len(cfg) == 0 {
		cfg = primitives.CloneAnyMap(provider.spec.DefaultConfig)
	}
	payload, err := provider.handler(adminCtx, cfg)
	if err != nil {
		return err
	}
	_, err = encodeWidgetPayload(payload)
	return err
}

func (d *Dashboard) providerCodeForCommand(name string) string {
	if d == nil || name == "" {
		return ""
	}
	for code, provider := range d.providers {
		if provider.spec.CommandName == name {
			return code
		}
	}
	return ""
}

func sanitizeDashboardWidgetData(data map[string]any) map[string]any {
	if data == nil {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, value := range data {
		if _, blocked := dashboardPayloadBlockedKeys[strings.ToLower(strings.TrimSpace(key))]; blocked {
			continue
		}
		out[key] = sanitizeDashboardWidgetValue(value)
	}
	return out
}

func sanitizeDashboardWidgetValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return sanitizeDashboardWidgetData(typed)
	case []any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, sanitizeDashboardWidgetValue(item))
		}
		return out
	case []map[string]any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, sanitizeDashboardWidgetData(item))
		}
		return out
	case string:
		if dashboardPayloadBlockedPattern.MatchString(typed) {
			return ""
		}
		return typed
	default:
		return value
	}
}
