package admin

import (
	"context"
	"encoding/json"
	"errors"
	"maps"
	"slices"
	"sync"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	gocommand "github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
)

// DataModuleConfig binds application-owned lifecycle adapters to the Data UI.
// ResolveIdentity must revalidate current account/session state on every call;
// Service must use the same trusted actor/scope and independently enforce policy.
// Enabled is a current Data feature gate, independent of Debug.
type DataModuleConfig struct {
	// Maintenance is opt-in. Hosts retain controller lifetime and domain adapters.
	Maintenance     *data.MaintenanceService
	PreviewSurfaces map[string]DataPreviewSurface
	Service         *data.Service
	TargetID        string
	BasePath        string
	Enabled         func() bool
	ResolveIdentity func(context.Context) (console.Identity, error)
	MenuParent      string
	// ReceiptLimit bounds overview/action evidence. Older retained receipts remain
	// usable through the explicit receipt controls; the active receipt is pinned.
	ReceiptLimit int
}

// DataModule owns its console and command registrations, never the provider,
// target or operation store. Close it before closing those application resources.
type DataModule struct {
	config              DataModuleConfig
	host                *ConsoleHost
	queries             CommandRegistrationHandle
	commands            CommandRegistrationHandle
	maintenanceCommands CommandRegistrationHandle
	bus                 *CommandBus
	menuCode, locale    string
	mu                  sync.Mutex
	revision            uint64
}

func NewDataModule(cfg DataModuleConfig) (*DataModule, error) {
	if cfg.Service == nil || cfg.TargetID == "" || cfg.Enabled == nil || cfg.ResolveIdentity == nil || len(cfg.PreviewSurfaces) > data.PreviewMaxSurfaces {
		return nil, data.Error(data.CodeInvalid)
	}
	surfaces := make(map[string]DataPreviewSurface, len(cfg.PreviewSurfaces))
	maps.Copy(surfaces, cfg.PreviewSurfaces)
	cfg.PreviewSurfaces = surfaces
	m := &DataModule{config: cfg}
	if m.config.ReceiptLimit == 0 {
		m.config.ReceiptLimit = 100
	}
	if m.config.ReceiptLimit < 1 || m.config.ReceiptLimit > 100 {
		return nil, data.Error(data.CodeInvalid)
	}
	if m.config.BasePath == "" {
		m.config.BasePath = "/admin"
	}
	registry := console.NewPanelRegistry()
	if err := RegisterDataPanels(registry, DataPanelActions{Choices: m.choices, Dispatch: m.dispatch, Options: m.receiptOptions, Requests: m.requestStatus}); err != nil {
		return nil, err
	}
	host, err := NewConsoleHost(ConsoleHostConfig{
		ID: "data", Title: "Data", FeatureKey: "data", RouteNamespace: "data_tools",
		Registry: registry, Enabled: cfg.Enabled, PreferencesNamespace: "admin.data",
		RequestIdentity: func(c router.Context) (console.Identity, error) {
			ctx := newAdminContextFromRouter(c, "").Context
			c.SetContext(ctx)
			return cfg.ResolveIdentity(ctx)
		},
		Access:          m.access(),
		Snapshot:        m.records,
		PrepareSnapshot: m.prepareSnapshot,
		PrepareLookup:   m.prepareSnapshot,
		Lookup: func(ctx context.Context, identity console.Identity, panel, key string) (console.Record, bool, error) {
			rows, err := m.records(ctx, identity, panel)
			for _, row := range rows {
				if row.Key == key {
					return row, true, err
				}
			}
			return console.Record{}, false, err
		},
	})
	if err != nil {
		return nil, err
	}
	m.host = host
	return m, nil
}

func (m *DataModule) Manifest() ModuleManifest { return m.host.Manifest() }

// Console exposes the instance host for authorized snapshots and dashboard adapters.
func (m *DataModule) Console() *ConsoleHost { return m.host }

// Maintenance exposes optional native status/commands for application chrome.
func (m *DataModule) Maintenance() *data.MaintenanceService { return m.config.Maintenance }
func (m *DataModule) RouteContract() routing.ModuleContract {
	return m.previewContract(m.explorationContract(m.host.RouteContract()))
}

func (m *DataModule) Register(ctx ModuleContext) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if ctx.Admin == nil || m.commands != nil || m.host.closed() {
		return data.Error(data.CodeInvalid)
	}
	handle, err := RegisterDataCommands(ctx.Admin.Commands(), m.config.Service)
	if err != nil {
		return err
	}
	urls, err := m.resolveExplorationRoutes(ctx)
	if err != nil {
		return errors.Join(err, handle.Close())
	}
	queries, err := RegisterDataExplorationQueries(ctx.Admin.Commands(), m.config.Service)
	if err != nil {
		return errors.Join(err, handle.Close())
	}
	previewURLs, err := m.resolvePreviewRoutes(ctx)
	if err != nil {
		return errors.Join(err, handle.Close(), queries.Close())
	}
	if m.config.Maintenance != nil {
		maintenance, maintenanceErr := RegisterDataMaintenanceCommands(ctx.Admin.Commands(), m.config.Maintenance)
		if maintenanceErr != nil {
			return errors.Join(maintenanceErr, handle.Close(), queries.Close())
		}
		m.maintenanceCommands = maintenance
	}
	m.bus = ctx.Admin.Commands()
	pageRenderer := m.explorationPageRenderer(ctx.Admin, urls)
	m.host.config.RenderPage = func(c router.Context, bootstrap console.Bootstrap) error {
		// The explorer renderer merges extensions below.
		if bootstrap.Extensions == nil {
			bootstrap.Extensions = map[string]any{}
		}
		bootstrap.Extensions["data_preview"] = previewURLs
		return pageRenderer(c, bootstrap)
	}
	if err = m.host.Register(ctx); err != nil {
		m.bus = nil
		return errors.Join(err, handle.Close(), queries.Close(), m.closeMaintenance())
	}
	m.registerExplorationRoutes(ctx, urls)
	m.registerPreviewRoutes(ctx, previewURLs)
	m.queries = queries
	m.commands = handle
	m.menuCode, m.locale = ctx.Admin.config.NavMenuCode, ctx.Locale
	return nil
}

func (m *DataModule) MenuItems(locale string) []MenuItem {
	if !m.config.Enabled() {
		return nil
	}
	if locale == "" {
		locale = m.locale
	}
	pagePath := m.host.routes.Page
	if pagePath == "" {
		pagePath = joinBasePath(m.config.BasePath, "data")
	}
	return []MenuItem{{ID: "data", Label: "Data", Icon: "database", Menu: m.menuCode, Locale: locale,
		ParentID: m.config.MenuParent, Position: new(95), Permissions: []string{"admin.data.view"},
		Target: map[string]any{"type": "url", "path": pagePath, "key": "data"}}}
}

func (m *DataModule) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	err := errors.Join(m.host.Close(), m.closeMaintenance())
	if m.queries != nil {
		err = errors.Join(err, m.queries.Close())
	}
	if m.commands != nil {
		err = errors.Join(err, m.commands.Close())
	}
	return err
}

func (m *DataModule) dispatch(ctx context.Context, kind data.Kind, input data.Input) (data.Result, error) {
	if m.bus == nil || !m.config.Enabled() || m.host.closed() {
		return data.Result{}, data.Error(data.CodeDenied)
	}
	if kind == data.Activate || kind == data.Reset {
		resolved, err := m.config.Service.ResolveRequestGeneration(ctx, kind, input)
		if err != nil {
			return data.Result{}, err
		}
		input = resolved
	}
	var message any = input
	if kind == data.Recover {
		message = data.RecoverRequest{TargetID: input.TargetID, OperationID: input.OperationID}
	}
	encoded, err := json.Marshal(message)
	if err != nil {
		return data.Result{}, err
	}
	var payload map[string]any
	if err = json.Unmarshal(encoded, &payload); err != nil {
		return data.Result{}, err
	}
	outcome, err := m.bus.DispatchByNameWithOutcome(ctx, kind.CommandID(), payload, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
	result, ok := outcome.Result.(data.Result)
	if err == nil && !ok {
		return data.Result{}, data.Error(data.CodeUnavailable)
	}
	// Invalidation contains no lifecycle data. Each delivery reloads authorized
	// projections, including fresh choices and generation preconditions.
	if identity, resolveErr := m.config.ResolveIdentity(ctx); resolveErr == nil {
		for _, panel := range DataPanelIDs() {
			if _, publishErr := m.host.Events().Publish(console.Event{Identity: identity, PanelID: panel, Record: console.Record{Key: "refresh"}, Kind: console.EventInvalidate}); publishErr != nil {
				// Actions refresh their authorized snapshot even if the bounded live
				// stream is full or closing. Delivery failure cannot undo an effect.
				break
			}
		}
	}
	return result, err
}

func (m *DataModule) access() ConsoleAccess {
	return ConsoleAccess{Resolve: m.resolveConsole, Read: m.readConsole, Action: m.allowAction, Record: m.allowRecord, Project: m.projectDataRecord, DeliverRecord: m.deliverDataRecord,
		Panel: func(_ context.Context, _ console.Identity, def console.PanelDefinition) bool {
			return slices.Contains(DataPanelIDs(), def.ID)
		}}
}
func (m *DataModule) resolveConsole(ctx context.Context, identity console.Identity) (context.Context, console.Identity, error) {
	current, err := m.config.ResolveIdentity(ctx)
	if ctx.Err() != nil {
		return ctx, identity, ctx.Err()
	}
	if err != nil {
		return ctx, identity, dataConsoleReadError(err)
	}
	if current != identity || current.ConsoleID != "data" {
		return ctx, identity, ErrForbidden
	}
	return ctx, current, nil
}
func (m *DataModule) readConsole(ctx context.Context, _ console.Identity) error {
	if err := m.config.Service.AuthorizeView(ctx, m.config.TargetID); err != nil {
		return dataConsoleReadError(err)
	}
	return nil
}
func (m *DataModule) allowRecord(ctx context.Context, _ console.Identity, panel string, record console.Record) bool {
	if m.projection(ctx) == nil {
		var err error
		ctx, err = m.prepareSnapshot(ctx, console.Identity{})
		if err != nil {
			return false
		}
	}
	allowed, err := m.authorizeProjectedRecord(ctx, m.projection(ctx).model, panel, record)
	return allowed && err == nil
}

type dataModuleReadModel struct {
	catalog  []data.Descriptor
	state    data.ActiveState
	ops      []data.Operation
	receipts []*data.PreparationReceipt
}

func (m *DataModule) readModel(ctx context.Context) (dataModuleReadModel, error) {
	if projection := m.projection(ctx); projection != nil {
		return projection.model, nil
	}
	var model dataModuleReadModel
	var err error
	model.catalog, err = m.config.Service.Catalog(ctx, m.config.TargetID, 100)
	if err != nil {
		return model, err
	}
	model.state, err = m.config.Service.Active(ctx, m.config.TargetID)
	if err != nil {
		return model, err
	}
	model.ops, err = m.config.Service.Operations(ctx, m.config.TargetID, 100)
	if err != nil {
		return model, err
	}
	// A pending handover must remain recoverable even after newer read-only
	// operations move it out of the history window.
	if id := model.state.PendingOperationID; id != "" && !slices.ContainsFunc(model.ops, func(op data.Operation) bool { return op.Result.OperationID == id }) {
		op, lookupErr := m.config.Service.LookupOperation(ctx, id)
		if lookupErr != nil && data.ErrorCode(lookupErr) != data.CodeGone {
			return model, lookupErr
		}
		if lookupErr == nil {
			model.ops = append(model.ops, op)
		}
	}
	page, err := m.config.Service.Receipts(ctx, m.config.TargetID, data.ReceiptQuery{Limit: m.config.ReceiptLimit})
	if err != nil {
		return model, err
	}
	for _, receipt := range page.Receipts {
		model.receipts = append(model.receipts, &receipt)
	}
	if err = m.pinModelReceipts(ctx, &model); err != nil {
		return model, err
	}
	return model, nil
}

func (m *DataModule) pinModelReceipts(ctx context.Context, model *dataModuleReadModel) error {
	for _, id := range []string{model.state.Activation.ReceiptID, model.state.PendingReceiptID} {
		if id == "" || slices.ContainsFunc(model.receipts, func(r *data.PreparationReceipt) bool { return r.ID == id }) {
			continue
		}
		receipt, lookupErr := m.config.Service.LookupReceipt(ctx, m.config.TargetID, id)
		if lookupErr != nil {
			if data.ErrorCode(lookupErr) == data.CodeGone {
				continue
			}
			return lookupErr
		}
		model.receipts = append(model.receipts, &receipt)
	}
	return nil
}

func (m *DataModule) closeMaintenance() error {
	if m.maintenanceCommands != nil {
		err := m.maintenanceCommands.Close()
		m.maintenanceCommands = nil
		return err
	}
	return nil
}
