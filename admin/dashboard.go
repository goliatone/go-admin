package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strings"
	"sync"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

// WidgetProvider produces data for a widget given viewer context/config.
// Providers must return a canonical WidgetPayload.
type WidgetProvider func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error)

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

type widgetInstanceExistenceChecker interface {
	HasInstanceForDefinition(ctx context.Context, definitionCode string, filter WidgetInstanceFilter) (bool, error)
}

// Dashboard orchestrates widget providers and instances.
type Dashboard struct {
	mu               sync.RWMutex
	providers        map[string]DashboardProviderSpec
	providerRegistry *dashcmp.Registry
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

func cloneDashboardProviderSpec(spec DashboardProviderSpec) DashboardProviderSpec {
	spec.Schema = primitives.CloneAnyMap(spec.Schema)
	spec.DefaultConfig = primitives.CloneAnyMap(spec.DefaultConfig)
	if len(spec.VisibilityRole) > 0 {
		spec.VisibilityRole = append([]string{}, spec.VisibilityRole...)
	}
	return spec
}

// NewDashboard constructs a dashboard registry with in-memory defaults.
func NewDashboard() *Dashboard {
	return &Dashboard{
		providers:        make(map[string]DashboardProviderSpec),
		providerRegistry: dashcmp.NewRegistry(),
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
		d.mu.Lock()
		defer d.mu.Unlock()
		d.logger = ensureLogger(logger)
	}
}

// WithWidgetService wires a CMS widget service for definitions/instances.
func (d *Dashboard) WithWidgetService(svc CMSWidgetService) {
	if d == nil {
		return
	}
	d.mu.Lock()
	d.widgetSvc = svc
	d.components = nil
	areas := make([]WidgetAreaDefinition, 0, len(d.areas))
	for _, area := range d.areas {
		areas = append(areas, area)
	}
	d.mu.Unlock()
	if svc == nil {
		return
	}
	if len(areas) > 0 {
		for _, area := range areas {
			_ = svc.RegisterAreaDefinition(context.Background(), area)
		}
	} else {
		for _, area := range svc.Areas() {
			d.mu.Lock()
			if _, exists := d.areas[area.Code]; !exists {
				d.storeArea(area)
			}
			d.mu.Unlock()
		}
	}
}

// WithPreferences sets the preference store used for per-user layouts.
func (d *Dashboard) WithPreferences(store DashboardPreferences) {
	if d != nil && store != nil {
		d.mu.Lock()
		defer d.mu.Unlock()
		d.prefs = store
		d.components = nil
	}
}

// WithPreferenceService wires the PreferencesService used for go-dashboard overrides.
func (d *Dashboard) WithPreferenceService(service *PreferencesService) {
	if d != nil && service != nil {
		d.mu.Lock()
		defer d.mu.Unlock()
		d.prefService = service
		d.components = nil
	}
}

// WithAuthorizer sets the authorizer for role/permission visibility.
func (d *Dashboard) WithAuthorizer(authz Authorizer) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	d.authorizer = authz
	d.components = nil
}

// WithCommandBus wires the command bus so providers can expose commands.
func (d *Dashboard) WithCommandBus(bus *CommandBus) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	d.commandBus = bus
}

// WithRegistry wires the shared registry for discovery/use by other transports.
func (d *Dashboard) WithRegistry(reg *Registry) {
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	d.registry = reg
}

// WithActivitySink wires an activity sink for layout or widget changes.
func (d *Dashboard) WithActivitySink(sink ActivitySink) {
	if d != nil && sink != nil {
		d.mu.Lock()
		defer d.mu.Unlock()
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
	d.mu.Lock()
	prev, had := d.areas[code]
	d.storeArea(def)
	if !had || prev != def {
		// Area list is baked into go-dashboard service options at initialization time.
		// Force a rebuild so newly registered areas are resolvable in subsequent layout renders.
		d.components = nil
	}
	widgetSvc := d.widgetSvc
	d.mu.Unlock()
	if widgetSvc != nil {
		_ = widgetSvc.RegisterAreaDefinition(context.Background(), def)
	}
}

// Areas returns known widget areas sorted by code.
func (d *Dashboard) Areas() []WidgetAreaDefinition {
	if d == nil {
		return nil
	}
	d.mu.RLock()
	defer d.mu.RUnlock()
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
		d.mu.Lock()
		defer d.mu.Unlock()
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
	if d == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	d.renderer = renderer
	d.components = nil
}

// HasRenderer returns true if a renderer is configured.
func (d *Dashboard) HasRenderer() bool {
	if d == nil {
		return false
	}
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.renderer != nil
}

// RegisterProvider registers a widget provider and optional default instance.
func (d *Dashboard) RegisterProvider(spec DashboardProviderSpec) {
	if d == nil || spec.Code == "" || spec.Handler == nil {
		return
	}
	spec = cloneDashboardProviderSpec(spec)
	spec.CommandName = strings.TrimSpace(spec.CommandName)
	d.mu.Lock()
	logger := ensureLogger(d.logger)
	widgetSvc := d.widgetSvc
	reg := d.registry
	providerRegistry := d.providerRegistry
	hadComponents := d.components != nil
	enforceAreas := d.enforceAreas
	hasArea := d.hasArea(strings.TrimSpace(spec.DefaultArea))
	d.releaseProviderCommand(spec)
	d.removeDefaultInstancesForCode(spec.Code)
	d.providers[spec.Code] = spec
	if hadComponents {
		d.components = nil
	}
	d.mu.Unlock()

	hasPersistedInstance := dashboardHasPersistedInstance(widgetSvc, spec)
	registerDashboardProviderWithRegistry(providerRegistry, spec)
	if reg != nil {
		reg.RegisterDashboardProvider(spec)
	}
	if hadComponents {
		logger.Warn("dashboard provider registered after initialization; invalidating dashboard components for rebuild",
			"provider", spec.Code)
	}
	registerDashboardWidgetDefinition(widgetSvc, logger, spec)
	if !d.registerProviderCommandUnlocked(spec, logger) {
		return
	}
	d.seedDefaultProviderInstanceUnlocked(widgetSvc, logger, spec, hasPersistedInstance, enforceAreas, hasArea)
}

func (d *Dashboard) releaseProviderCommand(spec DashboardProviderSpec) {
	previous, hadPrevious := d.providers[spec.Code]
	if !hadPrevious {
		return
	}
	prevCommand := strings.TrimSpace(previous.CommandName)
	if prevCommand == "" || prevCommand == spec.CommandName {
		return
	}
	delete(d.providerCommands, prevCommand)
}

func (d *Dashboard) removeDefaultInstancesForCode(code string) {
	filtered := d.defaultInstances[:0]
	for _, inst := range d.defaultInstances {
		if inst.DefinitionCode != code {
			filtered = append(filtered, inst)
		}
	}
	d.defaultInstances = filtered
}

func dashboardHasPersistedInstance(widgetSvc CMSWidgetService, spec DashboardProviderSpec) bool {
	if widgetSvc == nil {
		return false
	}
	if checker, ok := widgetSvc.(widgetInstanceExistenceChecker); ok {
		exists, err := checker.HasInstanceForDefinition(context.Background(), spec.Code, WidgetInstanceFilter{})
		if err == nil && exists {
			return true
		}
	}
	filter := WidgetInstanceFilter{}
	if area := strings.TrimSpace(spec.DefaultArea); area != "" {
		filter.Area = area
	}
	instances, err := widgetSvc.ListInstances(context.Background(), filter)
	if err != nil {
		return false
	}
	for _, inst := range instances {
		if inst.DefinitionCode == spec.Code {
			return true
		}
	}
	return false
}

func registerDashboardWidgetDefinition(widgetSvc CMSWidgetService, logger Logger, spec DashboardProviderSpec) {
	if widgetSvc == nil {
		return
	}
	schema := primitives.CloneAnyMap(spec.Schema)
	if len(schema) == 0 {
		schema = map[string]any{"fields": []any{}}
	}
	name := strings.TrimSpace(spec.Name)
	if name == "" {
		name = spec.Code
	}
	if err := widgetSvc.RegisterDefinition(context.Background(), WidgetDefinition{
		Code:   spec.Code,
		Name:   name,
		Schema: schema,
	}); err != nil {
		logger.Warn("failed to register dashboard widget definition",
			"definition", spec.Code,
			"error", err)
	}
}

func (d *Dashboard) registerProviderCommandUnlocked(spec DashboardProviderSpec, logger Logger) bool {
	if d == nil {
		return true
	}
	if strings.TrimSpace(spec.CommandName) == "" {
		return true
	}
	d.mu.Lock()
	commandBus := d.commandBus
	if commandBus == nil {
		d.mu.Unlock()
		return true
	}
	if d.providerCommands == nil {
		d.providerCommands = map[string]string{}
	}
	if existingCode, exists := d.providerCommands[spec.CommandName]; exists {
		d.mu.Unlock()
		if existingCode != spec.Code {
			logger.Warn("dashboard command already mapped; skipping provider",
				"command", spec.CommandName,
				"existing_provider", existingCode,
				"provider", spec.Code)
		}
		return true
	}
	needsCommandRegistration := !d.providerCmdReady
	d.providerCommands[spec.CommandName] = spec.Code
	d.mu.Unlock()

	if needsCommandRegistration {
		if _, err := RegisterCommand(commandBus, &dashboardProviderCommand{dashboard: d}); err != nil {
			d.mu.Lock()
			delete(d.providerCommands, spec.CommandName)
			d.mu.Unlock()
			logger.Warn("failed to register dashboard provider command",
				"command", dashboardProviderCommandName,
				"error", err)
			return false
		}
		d.mu.Lock()
		d.providerCmdReady = true
		d.mu.Unlock()
	}
	if err := RegisterDashboardProviderFactory(commandBus, spec.CommandName, spec.Code, spec.DefaultConfig); err != nil {
		d.mu.Lock()
		delete(d.providerCommands, spec.CommandName)
		d.mu.Unlock()
		logger.Warn("failed to register dashboard command",
			"command", spec.CommandName,
			"error", err)
		return true
	}
	return true
}

func (d *Dashboard) seedDefaultProviderInstanceUnlocked(widgetSvc CMSWidgetService, logger Logger, spec DashboardProviderSpec, hasPersistedInstance bool, enforceAreas bool, hasArea bool) {
	area := strings.TrimSpace(spec.DefaultArea)
	if area == "" || hasPersistedInstance {
		return
	}
	if enforceAreas && !hasArea {
		return
	}
	span := spec.DefaultSpan
	if span <= 0 {
		span = 12
	}
	d.mu.Lock()
	d.defaultInstances = append(d.defaultInstances, DashboardWidgetInstance{
		DefinitionCode: spec.Code,
		AreaCode:       area,
		Config:         primitives.CloneAnyMap(spec.DefaultConfig),
		Span:           span,
		Hidden:         false,
		Locale:         "",
	})
	d.mu.Unlock()
	if widgetSvc == nil {
		return
	}
	_ = widgetSvc.Definitions()
	if _, err := widgetSvc.SaveInstance(context.Background(), WidgetInstance{
		DefinitionCode: spec.Code,
		Area:           area,
		Config:         primitives.CloneAnyMap(spec.DefaultConfig),
		Span:           span,
		Locale:         "",
	}); err != nil {
		logger.Warn("failed to persist default widget instance",
			"definition", spec.Code,
			"area", area,
			"error", err)
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
	if d == nil {
		return
	}
	area = strings.TrimSpace(area)
	d.mu.Lock()
	if d.enforceAreas && area != "" && !d.hasArea(area) {
		d.mu.Unlock()
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
	widgetSvc := d.widgetSvc
	logger := ensureLogger(d.logger)
	d.mu.Unlock()
	if widgetSvc != nil {
		_ = widgetSvc.Definitions()
		if _, err := widgetSvc.SaveInstance(context.Background(), WidgetInstance{
			DefinitionCode: defCode,
			Area:           area,
			Config:         primitives.CloneAnyMap(cfg),
			Span:           span,
			Locale:         locale,
		}); err != nil {
			logger.Warn("failed to persist default widget instance",
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
	if d == nil {
		return
	}
	d.mu.RLock()
	prefService := d.prefService
	prefs := d.prefs
	activity := d.activity
	logger := d.logger
	d.mu.RUnlock()
	persisted := false
	failed := false
	persisted, failed = d.persistDashboardLayout(ctx, instances, prefService, prefs, logger, persisted, failed)
	if failed || !persisted {
		return
	}
	if activity != nil {
		actor := ctx.UserID
		if actor == "" {
			actor = actorFromContext(ctx.Context)
		}
		_ = activity.Record(ctx.Context, ActivityEntry{
			Actor:  actor,
			Action: "dashboard.layout.save",
			Object: "dashboard",
			Metadata: map[string]any{
				"widgets": len(instances),
				"user_id": ctx.UserID,
			},
		})
	}
}

func (d *Dashboard) persistDashboardLayout(ctx AdminContext, instances []DashboardWidgetInstance, prefService *PreferencesService, prefs DashboardPreferences, logger Logger, persisted, failed bool) (bool, bool) {
	if prefService != nil && ctx.UserID != "" {
		if _, err := prefService.SaveDashboardLayout(ctx.Context, ctx.UserID, instances); err != nil {
			logger.Warn("failed to persist dashboard layout",
				"backend", "preferences_service",
				"user_id", ctx.UserID,
				"error", err)
			failed = true
		} else {
			persisted = true
		}
	}
	if prefCtx, ok := prefs.(DashboardPreferencesWithContext); ok {
		return d.persistDashboardLayoutWithContext(ctx, instances, prefCtx, logger, persisted, failed)
	}
	if prefs == nil {
		return persisted, failed
	}
	if err := prefs.Save(ctx.UserID, instances); err != nil {
		logger.Warn("failed to persist dashboard layout",
			"backend", "dashboard_preferences",
			"user_id", ctx.UserID,
			"error", err)
		return persisted, true
	}
	return true, failed
}

func (d *Dashboard) persistDashboardLayoutWithContext(ctx AdminContext, instances []DashboardWidgetInstance, prefs DashboardPreferencesWithContext, logger Logger, persisted, failed bool) (bool, bool) {
	if err := prefs.SaveWithContext(ctx.Context, ctx.UserID, instances); err != nil {
		logger.Warn("failed to persist dashboard layout",
			"backend", "dashboard_preferences_context",
			"user_id", ctx.UserID,
			"error", err)
		return persisted, true
	}
	return true, failed
}

func (d *Dashboard) ensureComponents(ctx context.Context) (*dashboardComponents, error) {
	return d.ensureComponentsWithHostOptions(dashboardRuntimeHostOptions{})
}

func (d *Dashboard) ensureComponentsWithHostOptions(host dashboardRuntimeHostOptions) (*dashboardComponents, error) {
	if d == nil {
		return nil, nil
	}
	d.mu.RLock()
	if d.components != nil && (!host.configured() || d.components.hostConfigured) {
		comp := d.components
		d.mu.RUnlock()
		return comp, nil
	}
	d.mu.RUnlock()
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.components != nil && (!host.configured() || d.components.hostConfigured) {
		return d.components, nil
	}
	components, err := d.buildComponentsLocked(host)
	if err != nil {
		return nil, err
	}
	d.components = components
	return d.components, nil
}

func (d *Dashboard) buildComponentsLocked(host dashboardRuntimeHostOptions) (*dashboardComponents, error) {
	store := dashinternal.NewCMSWidgetStoreWithActivity(widgetServiceAdapterFor(d.widgetSvc), activityRecorderAdapter{sink: d.activity})
	if store == nil {
		return nil, serviceNotConfiguredDomainError("dashboard cms widget service", map[string]any{"component": "dashboard"})
	}
	registry, specs := d.providerSnapshotLocked()
	var prefStore dashcmp.PreferenceStore
	if d.prefService != nil {
		prefStore = newDashboardPreferenceStore(d.prefService, store)
	} else {
		prefStore = dashcmp.NewInMemoryPreferenceStore()
	}
	return &dashboardComponents{
		runtime: dashcmp.NewRuntime(buildDashboardRuntimeOptions(dashboardRuntimeBuildOptions{
			store:         store,
			authorizer:    dashboardAuthorizerAdapter{authorizer: d.authorizer, specs: specs},
			preferences:   prefStore,
			providers:     registry,
			renderer:      adaptDashboardRenderer(d.renderer),
			template:      dashboardSSRTemplateName,
			areas:         d.areaCodesForServiceLocked(),
			themeProvider: host.themeProvider,
			themeSelector: host.themeSelector,
			pageDecorator: host.pageDecorator,
		})),
		specs:          specs,
		hostConfigured: host.configured(),
	}, nil
}

func (d *Dashboard) areaCodesForServiceLocked() []string {
	areas := make([]WidgetAreaDefinition, 0, len(d.areas))
	for _, area := range d.areas {
		areas = append(areas, area)
	}
	return dashboardAreaCodesForService(areas, d.widgetSvc)
}

func dashboardAreaCodesForService(areas []WidgetAreaDefinition, widgetSvc CMSWidgetService) []string {
	seen := map[string]struct{}{}
	out := []string{}
	for _, area := range areas {
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
	if widgetSvc != nil {
		for _, area := range widgetSvc.Areas() {
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
	if d == nil {
		return nil
	}
	d.mu.RLock()
	defer d.mu.RUnlock()
	out := []DashboardProviderSpec{}
	for _, spec := range d.providers {
		out = append(out, cloneDashboardProviderSpec(spec))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Code < out[j].Code })
	return out
}

// HasProvider reports whether a provider with the given code is already registered.
func (d *Dashboard) HasProvider(code string) bool {
	if d == nil {
		return false
	}
	code = strings.TrimSpace(code)
	if code == "" {
		return false
	}
	d.mu.RLock()
	defer d.mu.RUnlock()
	_, ok := d.providers[code]
	return ok
}

// Resolve returns widgets for a viewer, applying per-user preferences when present.
func (d *Dashboard) Resolve(ctx AdminContext) ([]map[string]any, error) {
	comp, err := d.ensureComponents(ctx.Context)
	if err != nil || comp == nil {
		return nil, err
	}
	viewer := viewerFromAdminContext(ctx)
	layout, err := comp.runtime.Service.ConfigureLayout(ctx.Context, viewer)
	if err != nil {
		return nil, err
	}
	return flattenWidgets(layout), nil
}

// Page resolves the canonical typed dashboard page for the current viewer.
func (d *Dashboard) Page(ctx AdminContext) (dashcmp.Page, error) {
	comp, err := d.ensureComponents(ctx.Context)
	if err != nil || comp == nil {
		return dashcmp.Page{}, err
	}
	viewer := viewerFromAdminContext(ctx)
	if comp.runtime == nil || comp.runtime.Controller == nil {
		return dashcmp.Page{}, nil
	}
	return comp.runtime.Controller.Page(ctx.Context, viewer)
}

func cloneDashboardInstances(in []DashboardWidgetInstance) []DashboardWidgetInstance {
	return dashinternal.CloneDashboardInstances(in)
}

func viewerFromAdminContext(ctx AdminContext) dashcmp.ViewerContext {
	return dashcmp.ViewerContext{
		UserID:          ctx.UserID,
		Locale:          ctx.Locale,
		FallbackLocales: append([]string{}, ctx.FallbackLocales...),
	}
}

func flattenWidgets(layout dashcmp.Layout) []map[string]any {
	areas := dashinternal.OrderedAreaCodes(layout.Areas)
	out := []map[string]any{}
	for _, code := range areas {
		for _, inst := range layout.Areas[code] {
			out = append(out, map[string]any{
				"definition": inst.DefinitionID,
				"area":       inst.AreaCode,
				"config":     cloneAny(inst.Configuration),
				"data":       dashinternal.ExtractWidgetData(inst.Metadata),
			})
		}
	}
	return out
}

func widgetServiceAdapterFor(svc CMSWidgetService) dashinternal.WidgetService {
	if svc == nil {
		return nil
	}
	if svc, ok := svc.(dashinternal.WidgetService); ok {
		return svc
	}
	return cmsWidgetServiceAdapter{svc: svc}
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
		Context: ctx,
		UserID:  userIDFromContext(ctx),
		Locale:  localeFromContext(ctx),
	}
	if adminCtx.Locale == "" {
		adminCtx.Locale = "en"
	}
	spec, provider, ok := c.dashboard.provider(code)
	if !ok || provider == nil {
		return ErrNotFound
	}
	cfg := primitives.CloneAnyMap(msg.Config)
	if len(cfg) == 0 {
		cfg = primitives.CloneAnyMap(spec.DefaultConfig)
	}
	_, err := provider.Fetch(ctx, dashcmp.WidgetContext{
		Instance: dashcmp.WidgetInstance{
			ID:            code,
			DefinitionID:  code,
			AreaCode:      spec.DefaultArea,
			Configuration: cfg,
		},
		Viewer: dashcmp.ViewerContext{
			UserID:          adminCtx.UserID,
			Locale:          adminCtx.Locale,
			FallbackLocales: append([]string{}, adminCtx.FallbackLocales...),
		},
	})
	return err
}

func (d *Dashboard) providerCodeForCommand(name string) string {
	if d == nil || name == "" {
		return ""
	}
	d.mu.RLock()
	if code := d.providerCommands[name]; code != "" {
		d.mu.RUnlock()
		return code
	}
	for code, provider := range d.providers {
		if provider.CommandName == name {
			d.mu.RUnlock()
			return code
		}
	}
	d.mu.RUnlock()
	return ""
}

func (d *Dashboard) provider(code string) (DashboardProviderSpec, dashcmp.Provider, bool) {
	if d == nil {
		return DashboardProviderSpec{}, nil, false
	}
	code = strings.TrimSpace(code)
	d.mu.RLock()
	defer d.mu.RUnlock()
	spec, ok := d.providers[code]
	if !ok || d.providerRegistry == nil {
		return DashboardProviderSpec{}, nil, false
	}
	provider, ok := d.providerRegistry.Provider(code)
	if !ok {
		return DashboardProviderSpec{}, nil, false
	}
	return cloneDashboardProviderSpec(spec), provider, true
}
