package admin

import (
	"context"
	"slices"
	"strings"
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
	RouteNamespace  string
	Registry        *console.PanelRegistry
	Events          *console.EventStream
	Access          ConsoleAccess
	Enabled         func() bool
	RequestIdentity func(router.Context) (console.Identity, error)
	Snapshot        console.SnapshotSource
	// PrepareSnapshot optionally loads an invocation-owned projection shared by
	// panel sources and definition filters. It must preserve context cancellation.
	// Its context is never mutation authority or a cache of grants.
	PrepareSnapshot func(context.Context, console.Identity) (context.Context, error)
	// PrepareLookup supplies invocation-owned read data for lookup delivery.
	// Like PrepareSnapshot it must retain cancellation and never cache grants.
	PrepareLookup        func(context.Context, console.Identity) (context.Context, error)
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
	return consoleIdentifierValid(config.ID) && config.Registry != nil && config.Enabled != nil && config.RequestIdentity != nil && config.Access.Resolve != nil && config.Access.Read != nil && config.Access.Panel != nil && (config.Access.Record != nil || config.Access.DeliverRecord != nil) && config.Snapshot != nil
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
		h.config.ID + ".options":          {Method: router.GET, Path: "api/panels/:panel/actions/:action/options/:field"},
		h.config.ID + ".requests":         {Method: router.GET, Path: "api/panels/:panel/requests/:request"},
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
	h.routes = console.Routes{Page: get("page"), Panels: get("panels"), Snapshot: get("snapshot"), Action: get("action"), Preferences: get("preferences"), Live: get("live"), Lookup: get("lookup"),
		Options: get("options"), Requests: get("requests")}
	if slices.Contains([]string{h.routes.Page, h.routes.Panels, h.routes.Snapshot, h.routes.Action, h.routes.Preferences, h.routes.Live, h.routes.Lookup, h.routes.Options, h.routes.Requests}, "") {
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
	ctx.ProtectedRouter.Get(h.routes.Options, h.guard(h.handleOptions))
	ctx.ProtectedRouter.Get(h.routes.Requests, h.guard(h.handleRequestStatus))
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
	ctx, cancel := context.WithTimeout(ctx, h.config.SnapshotTimeout)
	defer cancel()
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return console.Snapshot{}, err
	}
	snapshot := console.Snapshot{Identity: identity, Watermark: h.config.Events.Watermark(identity), Panels: []console.PanelSnapshot{}}
	ctx, err = prepareConsoleRead(ctx, identity, h.config.PrepareSnapshot, "snapshot")
	if err != nil {
		return console.Snapshot{}, err
	}
	for _, candidate := range h.config.Registry.Registrations() {
		if ctx.Err() != nil {
			return console.Snapshot{}, ctx.Err()
		}
		def, allowed := h.panel(ctx, identity, candidate.Definition.ID)
		if !allowed {
			continue
		}
		records, snapshotErr := h.config.Snapshot(ctx, identity, def.ID)
		if snapshotErr != nil {
			if ctx.Err() != nil {
				return console.Snapshot{}, ctx.Err()
			}
			return console.Snapshot{}, snapshotErr
		}
		panel := console.PanelSnapshot{PanelDefinition: def, Records: []console.Record{}}
		panel.Records = records
		snapshot.Panels = append(snapshot.Panels, panel)
	}
	// Finish every masking callback before delivery authorization. A later
	// projector may observe/revoke grants for an earlier record or action.
	if err = h.prepareSnapshotPanels(ctx, identity, snapshot.Panels); err != nil {
		return console.Snapshot{}, err
	}
	// Re-resolve identity and filter exact declarations/records only after all
	// source and masking work. Delivery hooks are policy/redaction-only.
	currentCtx, _, err := h.current(ctx, identity)
	if err != nil {
		return console.Snapshot{}, err
	}
	panels, err := h.deliverSnapshotPanels(currentCtx, identity, snapshot.Panels)
	if err != nil {
		return console.Snapshot{}, err
	}
	// Projection can itself perform slow/current-policy reads. Never deliver a
	// partial success after its deadline, shutdown or principal revocation.
	if _, _, err = h.current(currentCtx, identity); err != nil {
		return console.Snapshot{}, err
	}
	snapshot.Panels = panels
	return snapshot, nil
}

// RunAction dispatches one executable declaration for the request's client.
// Unavailable, hidden, undeclared, withdrawn and foreign-panel actions are
// refused; capability-dependent work additionally needs an advertised client
// handshake, so a page served to stale cached assets cannot execute it.
func (h *ConsoleHost) RunAction(ctx context.Context, identity console.Identity, request console.PanelActionRequest) (console.PanelActionResult, error) {
	ctx, done := h.operationContext(ctx)
	defer done()
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return console.PanelActionResult{}, err
	}
	if caps := console.ClientCapabilitiesFromContext(ctx); caps.Mode == console.ClientCapabilitiesPage {
		// A page bootstrap is never an executing client.
		ctx = console.WithClientCapabilities(ctx, console.ParseClientCapabilities(""))
	}
	def, ok := h.panel(ctx, identity, request.PanelID)
	if !ok {
		return console.PanelActionResult{}, ErrNotFound
	}
	action, declared := console.PanelDefinitionAction(def, request.ActionID)
	if !declared || !action.Executable() {
		if h.requiresNewerClient(ctx, identity, def.ID, request.ActionID) {
			return console.PanelActionResult{}, consoleClientOutdatedError()
		}
		return console.PanelActionResult{}, ErrNotFound
	}
	if fields := consoleGeneratedFieldErrors(action, request.Payload); len(fields) > 0 {
		return console.PanelActionResult{OK: false, Code: TextCodeValidationError, Tone: console.PanelToneError,
			Message: "The request ID is missing or invalid. Reopen the form to start a new request.", Errors: fields}, nil
	}
	reg, _ := h.config.Registry.Registration(def.ID)
	handler := reg.ActionHandlerForContext(ctx, request.ActionID)
	if handler == nil {
		return console.PanelActionResult{}, ErrNotFound
	}
	request.PanelID = def.ID
	result, err := handler(ctx, request)
	if err != nil {
		return result, err
	}
	return console.NormalizePanelActionResult(result), nil
}

func consoleClientOutdatedError() error {
	return NewDomainError(TextCodeConsoleClientOutdated, consoleClientOutdatedMessage, map[string]any{"action": "reload"})
}

// consoleGeneratedFieldErrors requires a well-formed generated request ID for
// every generated field. IDs stay idempotency keys: this checks shape only.
func consoleGeneratedFieldErrors(action console.PanelUIAction, payload map[string]any) map[string]any {
	fields := map[string]any{}
	for _, field := range action.Fields {
		if field.Generate != console.PanelFieldGenerateRequestID {
			continue
		}
		path := field.PayloadPath
		if path == "" {
			path = field.Name
		}
		if value, ok := consolePayloadValue(payload, path).(string); !ok || !console.ValidRequestID(value) {
			fields[field.Name] = "Reopen the form to generate a new request ID."
		}
	}
	return fields
}

func consolePayloadValue(payload map[string]any, path string) any {
	var current any = payload
	for part := range strings.SplitSeq(path, ".") {
		object, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current = object[part]
	}
	return current
}

// Options serves one page of a paginated option source. The action must be
// executable for this actor and client, and the field must declare the source.
func (h *ConsoleHost) Options(ctx context.Context, identity console.Identity, query console.PanelOptionQuery) (console.PanelOptionPage, error) {
	ctx, done := h.operationContext(ctx)
	defer done()
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return console.PanelOptionPage{}, err
	}
	query = console.NormalizePanelOptionQuery(query)
	def, ok := h.panel(ctx, identity, query.PanelID)
	if !ok {
		return console.PanelOptionPage{}, ErrNotFound
	}
	action, declared := console.PanelDefinitionAction(def, query.ActionID)
	if !declared || !action.Executable() || !consoleFieldPaginated(action, query.Field) {
		return console.PanelOptionPage{}, ErrNotFound
	}
	reg, _ := h.config.Registry.Registration(def.ID)
	if reg.Options == nil {
		return console.PanelOptionPage{}, ErrNotFound
	}
	query.PanelID = def.ID
	page, err := reg.Options(ctx, query)
	if err != nil {
		return console.PanelOptionPage{}, err
	}
	// Never deliver options after revocation, shutdown or deadline.
	if _, _, err = h.current(ctx, identity); err != nil {
		return console.PanelOptionPage{}, err
	}
	return console.NormalizePanelOptionPage(page, query.Limit), nil
}

func consoleFieldPaginated(action console.PanelUIAction, field string) bool {
	for _, declared := range action.Fields {
		if declared.Name == field && declared.OptionSource != nil && declared.OptionSource.Paginated {
			return true
		}
	}
	return false
}

// RequestStatus looks up the current actor's own submitted request. It needs
// panel read access, not the action's current declaration, because a
// submitted request can outlive the choice that produced it.
func (h *ConsoleHost) RequestStatus(ctx context.Context, identity console.Identity, query console.PanelRequestQuery) (console.PanelRequestStatus, error) {
	ctx, done := h.operationContext(ctx)
	defer done()
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return console.PanelRequestStatus{}, err
	}
	query.ActionID = strings.ToLower(strings.TrimSpace(query.ActionID))
	query.RequestID = strings.TrimSpace(query.RequestID)
	query.Scope = strings.TrimSpace(query.Scope)
	if query.ActionID == "" || len(query.ActionID) > 160 || !console.ValidRequestID(query.RequestID) || len(query.Scope) > console.PanelRequestScopeMax {
		return console.PanelRequestStatus{}, validationDomainError("invalid console request lookup", nil)
	}
	def, ok := h.panel(ctx, identity, query.PanelID)
	if !ok {
		return console.PanelRequestStatus{}, ErrNotFound
	}
	reg, _ := h.config.Registry.Registration(def.ID)
	if reg.Requests == nil {
		return console.PanelRequestStatus{}, ErrNotFound
	}
	query.PanelID = def.ID
	status, err := reg.Requests(ctx, query)
	if err != nil {
		return console.PanelRequestStatus{}, err
	}
	if _, _, err = h.current(ctx, identity); err != nil {
		return console.PanelRequestStatus{}, err
	}
	return console.NormalizePanelRequestStatus(status), nil
}

func (h *ConsoleHost) Lookup(ctx context.Context, identity console.Identity, panelID, recordKey string) (console.Record, error) {
	ctx, done := h.operationContext(ctx)
	defer done()
	ctx, cancel := context.WithTimeout(ctx, h.config.SnapshotTimeout)
	defer cancel()
	ctx, identity, err := h.current(ctx, identity)
	if err != nil {
		return console.Record{}, err
	}
	if _, ok := h.config.Registry.Registration(panelID); !ok || h.config.Lookup == nil {
		return console.Record{}, ErrNotFound
	}
	ctx, err = prepareConsoleRead(ctx, identity, h.config.PrepareLookup, "lookup")
	if err != nil {
		return console.Record{}, err
	}
	def, ok := h.panel(ctx, identity, panelID)
	if ctx.Err() != nil {
		return console.Record{}, ctx.Err()
	}
	if !ok {
		return console.Record{}, ErrNotFound
	}
	record, found, err := h.config.Lookup(ctx, identity, def.ID, recordKey)
	if ctx.Err() != nil {
		return console.Record{}, ctx.Err()
	}
	if err != nil {
		return console.Record{}, err
	}
	if !found || record.Key != recordKey {
		return console.Record{}, ErrNotFound
	}
	ctx, _, err = h.current(ctx, identity)
	if err != nil {
		return console.Record{}, err
	}
	if _, ok := h.panel(ctx, identity, def.ID); !ok {
		return console.Record{}, ErrNotFound
	}
	projected, allowed, err := h.projectRecord(ctx, identity, def.ID, record)
	if err != nil {
		return console.Record{}, err
	}
	if allowed {
		return projected, nil
	}
	return console.Record{}, ErrNotFound
}

func (h *ConsoleHost) deliverSnapshotPanels(ctx context.Context, identity console.Identity, source []console.PanelSnapshot) ([]console.PanelSnapshot, error) {
	panels := []console.PanelSnapshot{}
	for _, panel := range source {
		def, ok := h.panel(ctx, identity, panel.ID)
		if !ok {
			continue
		}
		records := []console.Record{}
		for _, record := range panel.Records {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			projected, allowed, deliveryErr := h.deliverRecord(ctx, identity, panel.ID, record)
			if deliveryErr != nil {
				return nil, deliveryErr
			}
			if allowed {
				records = append(records, projected)
			}
		}
		panels = append(panels, console.PanelSnapshot{PanelDefinition: def, Records: records})
	}
	return panels, nil
}

func (h *ConsoleHost) prepareSnapshotPanels(ctx context.Context, identity console.Identity, panels []console.PanelSnapshot) error {
	for i := range panels {
		panel := &panels[i]
		prepared := []console.Record{}
		for _, record := range panel.Records {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			if projected, valid := h.prepareRecord(ctx, identity, panel.ID, record); valid {
				prepared = append(prepared, projected)
			}
		}
		panel.Records = prepared
	}
	return nil
}

func prepareConsoleRead(ctx context.Context, identity console.Identity, prepare func(context.Context, console.Identity) (context.Context, error), operation string) (context.Context, error) {
	if prepare == nil {
		return ctx, nil
	}
	prepared, err := prepare(ctx, identity)
	if ctx.Err() != nil {
		return ctx, ctx.Err()
	}
	if err != nil {
		return ctx, err
	}
	if prepared == nil {
		return ctx, validationDomainError("console "+operation+" preparer returned no context", nil)
	}
	return prepared, nil
}
