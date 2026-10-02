package admin

import (
	"context"
	"slices"
	"sync"
	"time"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/console"
	router "github.com/goliatone/go-router"
)

// ConsoleHostConfig composes services and policy with an independent console.
// Page rendering remains an adapter so shared hosting never owns product markup.
type ConsoleHostConfig struct {
	ID, Title, FeatureKey string
	// RouteNamespace defaults to ID and isolates named routes from module identity.
	RouteNamespace       string
	Registry             *console.PanelRegistry
	Events               *console.EventStream
	Access               ConsoleAccess
	Enabled              func() bool
	RequestIdentity      func(router.Context) (console.Identity, error)
	Snapshot             console.SnapshotSource
	Lookup               console.LookupSource
	RenderPage           func(router.Context, console.Bootstrap) error
	PreferencesNamespace string
	LoadPreferences      func(context.Context, string) ([]string, error)
	SavePreferences      func(context.Context, string, []string) error
	RevalidateInterval   time.Duration
	SnapshotTimeout      time.Duration
	// Invalidated may be a broadcast host signal. Idle checks remain mandatory.
	Invalidated <-chan struct{}
}

// ConsoleHost owns delivery and lifecycle, not the router or application's bus.
// Routes are registered once at startup; Close denies handlers without unmounting.
type ConsoleHost struct {
	config         ConsoleHostConfig
	mu             sync.Mutex
	registered     bool
	routes         console.Routes
	ctx            context.Context
	cancel         context.CancelFunc
	ownEvents      bool
	dashboardAdmin *Admin
}

func NewConsoleHost(config ConsoleHostConfig) (*ConsoleHost, error) {
	if !consoleHostConfigValid(config) {
		return nil, validationDomainError("console requires identity, registry, gate, snapshot and current read policies", nil)
	}
	if config.RouteNamespace != "" && !consoleIdentifierValid(config.RouteNamespace) {
		return nil, validationDomainError("invalid console route namespace", nil)
	}
	if config.RevalidateInterval <= 0 {
		config.RevalidateInterval = 15 * time.Second
	}
	if config.RevalidateInterval > 30*time.Second {
		return nil, validationDomainError("console revalidation interval exceeds 30 seconds", nil)
	}
	if config.SnapshotTimeout <= 0 {
		config.SnapshotTimeout = 10 * time.Second
	}
	ctx, cancel := context.WithCancel(context.Background())
	host := &ConsoleHost{config: config, ctx: ctx, cancel: cancel, ownEvents: config.Events == nil}
	if host.config.Events == nil {
		host.config.Events = console.NewEventStream(config.ID, 1024)
	}
	if host.config.PreferencesNamespace == "" {
		host.config.PreferencesNamespace = "console"
	}
	return host, nil
}

func consoleHostConfigValid(config ConsoleHostConfig) bool {
	return consoleIdentifierValid(config.ID) && config.Registry != nil && config.Enabled != nil && config.RequestIdentity != nil && config.Access.Resolve != nil && config.Access.Read != nil && config.Access.Panel != nil && config.Access.Record != nil && config.Snapshot != nil
}

func consoleIdentifierValid(id string) bool {
	if id == "" {
		return false
	}
	for _, ch := range id {
		if (ch < 'a' || ch > 'z') && (ch < '0' || ch > '9') && ch != '-' && ch != '_' {
			return false
		}
	}
	return true
}

func (h *ConsoleHost) Manifest() ModuleManifest {
	flags := []string{}
	if h.config.FeatureKey != "" {
		flags = append(flags, h.config.FeatureKey)
	}
	return ModuleManifest{ID: h.config.ID, NameKey: "modules." + h.config.ID + ".name", FeatureFlags: flags}
}

func (h *ConsoleHost) RouteContract() routing.ModuleContract {
	prefix := h.routeNamespace()
	return routing.ModuleContract{Slug: h.config.ID, RouteNamePrefix: prefix, UIRouteDeclarations: map[string]routing.RouteDeclaration{
		h.config.ID + ".page":             {Method: router.GET, Path: "/"},
		h.config.ID + ".panels":           {Method: router.GET, Path: "api/panels"},
		h.config.ID + ".snapshot":         {Method: router.GET, Path: "api/snapshot"},
		h.config.ID + ".lookup":           {Method: router.GET, Path: "api/panels/:panel/records/:record"},
		h.config.ID + ".action":           {Method: router.POST, Path: "api/panels/:panel/actions/:action"},
		h.config.ID + ".preferences":      {Method: router.GET, Path: "api/preferences/panel-order"},
		h.config.ID + ".preferences.save": {Method: router.PUT, Path: "api/preferences/panel-order"},
		h.config.ID + ".live":             {Method: router.GET, Path: "ws"},
	}}
}

func (h *ConsoleHost) routeNamespace() string {
	if h.config.RouteNamespace != "" {
		return h.config.RouteNamespace
	}
	return h.config.ID
}

func (h *ConsoleHost) Register(ctx ModuleContext) error {
	if ctx.Admin == nil || ctx.ProtectedRouter == nil || ctx.AuthMiddleware == nil {
		return validationDomainError("console requires the protected module router and browser auth middleware", nil)
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.registered || h.closed() {
		return validationDomainError("console registration is startup-only", nil)
	}
	get := func(key string) string { return ctx.Routing.RoutePath(routing.SurfaceUI, h.config.ID+"."+key) }
	h.routes = console.Routes{Page: get("page"), Panels: get("panels"), Snapshot: get("snapshot"), Action: get("action"), Preferences: get("preferences"), Live: get("live"), Lookup: get("lookup")}
	if slices.Contains([]string{h.routes.Page, h.routes.Panels, h.routes.Snapshot, h.routes.Action, h.routes.Preferences, h.routes.Live, h.routes.Lookup}, "") {
		return validationDomainError("console route contract is unresolved", nil)
	}
	if h.config.RenderPage == nil {
		return validationDomainError("console requires a page renderer", nil)
	}
	// ProtectedRouter uses the package-managed browser CSRF/auth boundary.
	ctx.ProtectedRouter.Get(h.routes.Page, h.guard(h.handlePage))
	ctx.ProtectedRouter.Get(h.routes.Panels, h.guard(h.handlePanels))
	ctx.ProtectedRouter.Get(h.routes.Snapshot, h.guard(h.handleSnapshot))
	ctx.ProtectedRouter.Get(h.routes.Lookup, h.guard(h.handleLookup))
	ctx.ProtectedRouter.Post(h.routes.Action, h.guard(h.handleAction))
	ctx.ProtectedRouter.Get(h.routes.Preferences, h.guard(h.handlePreferences))
	ctx.ProtectedRouter.Put(h.routes.Preferences, h.guard(h.handlePreferencesSave))
	h.registerLive(ctx.Admin.router, ctx.AuthMiddleware)
	h.registered = true
	return nil
}

func (h *ConsoleHost) closed() bool {
	select {
	case <-h.ctx.Done():
		return true
	default:
		return false
	}
}
func (h *ConsoleHost) Close() error {
	if h == nil {
		return nil
	}
	h.cancel()
	if h.ownEvents {
		return h.config.Events.Close()
	}
	return nil
}

func (h *ConsoleHost) Events() *console.EventStream { return h.config.Events }

func (h *ConsoleHost) operationContext(ctx context.Context) (context.Context, context.CancelFunc) {
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithCancel(ctx)
	stop := context.AfterFunc(h.ctx, cancel)
	return ctx, func() { stop(); cancel() }
}

// compatibilityConsoleHost is used only by Debug's legacy route/wire adapters.
// It deliberately does not expose the authenticated neutral host registration API.
func compatibilityConsoleHost(id string, registry *console.PanelRegistry) *ConsoleHost {
	ctx, cancel := context.WithCancel(context.Background())
	return &ConsoleHost{config: ConsoleHostConfig{ID: id, Registry: registry}, ctx: ctx, cancel: cancel}
}

func (h *ConsoleHost) guard(handler router.HandlerFunc) router.HandlerFunc {
	return func(c router.Context) error {
		if h.closed() || c == nil {
			return writeError(c, ErrForbidden)
		}
		base := c.Context()
		if base == nil {
			base = context.Background()
		}
		ctx, cancel := context.WithCancel(base)
		defer cancel()
		stop := context.AfterFunc(h.ctx, cancel)
		defer stop()
		c.SetContext(ctx)
		return handler(c)
	}
}

func (h *ConsoleHost) bindSocket(c router.WebSocketContext) (func(), error) {
	if c == nil || h.closed() {
		return func() {}, ErrForbidden
	}
	stop := context.AfterFunc(h.ctx, func() { closeDebugWebSocket(c) })
	return func() { stop() }, nil
}

func (h *ConsoleHost) Snapshot(ctx context.Context, identity console.Identity) (console.Snapshot, error) {
	ctx, done := h.operationContext(ctx)
	defer done()
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return console.Snapshot{}, err
	}
	ctx, cancel := context.WithTimeout(ctx, h.config.SnapshotTimeout)
	defer cancel()
	snapshot := console.Snapshot{Identity: identity, Watermark: h.config.Events.Watermark(identity), Panels: []console.PanelSnapshot{}}
	for _, candidate := range h.config.Registry.DefinitionsWithContext(ctx) {
		def, allowed := h.panel(ctx, identity, candidate.ID)
		if !allowed {
			continue
		}
		records, snapshotErr := h.config.Snapshot(ctx, identity, def.ID)
		if snapshotErr != nil {
			return console.Snapshot{}, snapshotErr
		}
		panel := console.PanelSnapshot{PanelDefinition: def, Records: []console.Record{}}
		panel.Records = records
		snapshot.Panels = append(snapshot.Panels, panel)
	}
	// Reproject using newly resolved grants after slow providers finish.
	currentCtx, _, err := h.current(ctx, identity)
	if err != nil {
		return console.Snapshot{}, err
	}
	panels := []console.PanelSnapshot{}
	for _, panel := range snapshot.Panels {
		def, ok := h.panel(currentCtx, identity, panel.ID)
		if !ok {
			continue
		}
		records := []console.Record{}
		for _, record := range panel.Records {
			if projected, allowed := h.projectRecord(currentCtx, identity, panel.ID, record); allowed {
				records = append(records, projected)
			}
		}
		panels = append(panels, console.PanelSnapshot{PanelDefinition: def, Records: records})
	}
	snapshot.Panels = panels
	return snapshot, nil
}

func (h *ConsoleHost) RunAction(ctx context.Context, identity console.Identity, request console.PanelActionRequest) (console.PanelActionResult, error) {
	ctx, done := h.operationContext(ctx)
	defer done()
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return console.PanelActionResult{}, err
	}
	def, ok := h.panel(ctx, identity, request.PanelID)
	if !ok || !console.PanelDefinitionHasAction(def, request.ActionID) {
		return console.PanelActionResult{}, ErrNotFound
	}
	reg, _ := h.config.Registry.Registration(def.ID)
	handler := reg.ActionHandlerForContext(ctx, request.ActionID)
	if handler == nil {
		return console.PanelActionResult{}, ErrNotFound
	}
	request.PanelID = def.ID
	return handler(ctx, request)
}

func (h *ConsoleHost) Lookup(ctx context.Context, identity console.Identity, panelID, recordKey string) (console.Record, error) {
	ctx, done := h.operationContext(ctx)
	defer done()
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return console.Record{}, err
	}
	def, ok := h.panel(ctx, identity, panelID)
	if !ok || h.config.Lookup == nil {
		return console.Record{}, ErrNotFound
	}
	record, found, err := h.config.Lookup(ctx, identity, def.ID, recordKey)
	if err != nil || !found || record.Key != recordKey {
		return console.Record{}, ErrNotFound
	}
	ctx, _, err = h.current(ctx, identity)
	if err != nil {
		return console.Record{}, err
	}
	if _, ok := h.panel(ctx, identity, def.ID); !ok {
		return console.Record{}, ErrNotFound
	}
	if projected, ok := h.projectRecord(ctx, identity, def.ID, record); ok {
		return projected, nil
	}
	return console.Record{}, ErrNotFound
}
