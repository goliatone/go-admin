package admin

import (
	"context"
	"encoding/json"
	"errors"
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
	Service         *data.Service
	TargetID        string
	BasePath        string
	Enabled         func() bool
	ResolveIdentity func(context.Context) (console.Identity, error)
	MenuParent      string
}

// DataModule owns its console and command registrations, never the provider,
// target or operation store. Close it before closing those application resources.
type DataModule struct {
	config           DataModuleConfig
	host             *ConsoleHost
	commands         CommandRegistrationHandle
	bus              *CommandBus
	menuCode, locale string
	mu               sync.Mutex
	revision         uint64
}

func NewDataModule(cfg DataModuleConfig) (*DataModule, error) {
	if cfg.Service == nil || cfg.TargetID == "" || cfg.Enabled == nil || cfg.ResolveIdentity == nil {
		return nil, data.Error(data.CodeInvalid)
	}
	m := &DataModule{config: cfg}
	if m.config.BasePath == "" {
		m.config.BasePath = "/admin"
	}
	registry := console.NewPanelRegistry()
	if err := RegisterDataPanels(registry, DataPanelActions{Choices: m.choices, Dispatch: m.dispatch}); err != nil {
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
		Access:   m.access(),
		Snapshot: m.records,
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
func (m *DataModule) Console() *ConsoleHost                 { return m.host }
func (m *DataModule) RouteContract() routing.ModuleContract { return m.host.RouteContract() }

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
	m.bus = ctx.Admin.Commands()
	m.host.config.RenderPage = ConsolePageRenderer(ctx.Admin, DataPageTemplate, AdminPageChrome{})
	if err = m.host.Register(ctx); err != nil {
		m.bus = nil
		return errors.Join(err, handle.Close())
	}
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
	err := m.host.Close()
	if m.commands != nil {
		err = errors.Join(err, m.commands.Close())
	}
	return err
}

func (m *DataModule) dispatch(ctx context.Context, kind data.Kind, input data.Input) (data.Result, error) {
	if m.bus == nil || !m.config.Enabled() || m.host.closed() {
		return data.Result{}, data.Error(data.CodeDenied)
	}
	encoded, err := json.Marshal(input)
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
	return ConsoleAccess{Resolve: m.resolveConsole, Read: m.readConsole, Action: m.allowAction, Record: m.allowRecord,
		Panel: func(_ context.Context, _ console.Identity, def console.PanelDefinition) bool {
			return slices.Contains(DataPanelIDs(), def.ID)
		}}
}
func (m *DataModule) resolveConsole(ctx context.Context, identity console.Identity) (context.Context, console.Identity, error) {
	current, err := m.config.ResolveIdentity(ctx)
	if err != nil || current != identity || current.ConsoleID != "data" {
		return ctx, identity, ErrForbidden
	}
	return ctx, current, nil
}
func (m *DataModule) readConsole(ctx context.Context, _ console.Identity) error {
	if _, err := m.config.Service.Active(ctx, m.config.TargetID); err != nil {
		return ErrForbidden
	}
	return nil
}
func (m *DataModule) allowAction(ctx context.Context, _ console.Identity, _, action string) bool {
	choices, err := m.choices(ctx)
	if err != nil {
		return false
	}
	for _, choice := range choices {
		if dataActionID(choice) == action {
			return true
		}
	}
	return false
}
func (m *DataModule) allowRecord(ctx context.Context, _ console.Identity, panel string, record console.Record) bool {
	if record.TargetID != "" && record.TargetID != m.config.TargetID {
		return false
	}
	if panel == DataPanelOperations {
		op, err := m.config.Service.LookupOperation(ctx, record.Key)
		return err == nil && op.Target.TargetID == m.config.TargetID
	}
	_, err := m.config.Service.Active(ctx, m.config.TargetID)
	return err == nil
}

type dataModuleReadModel struct {
	catalog  []data.Descriptor
	state    data.ActiveState
	ops      []data.Operation
	receipts []*data.PreparationReceipt
}

func (m *DataModule) readModel(ctx context.Context) (dataModuleReadModel, error) {
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
	seen := map[string]bool{}
	for _, op := range model.ops {
		if r := op.Result.Receipt; r != nil && !seen[r.ID] {
			model.receipts = append(model.receipts, r)
			seen[r.ID] = true
		}
	}
	return model, nil
}
func (m *DataModule) permittedChoice(ctx context.Context, choice DataActionChoice, capabilities map[data.Kind]data.Capability) bool {
	capability := capabilities[choice.Kind]
	input := choice.Input
	input.IdempotencyKey = "permission-check"
	return capability.Supported && capability.Permitted && m.config.Service.AuthorizeInput(ctx, choice.Kind, input) == nil
}
func (m *DataModule) choices(ctx context.Context) ([]DataActionChoice, error) {
	model, err := m.readModel(ctx)
	if err != nil {
		return nil, err
	}
	out := []DataActionChoice{}
	for _, descriptor := range model.catalog {
		candidates := m.datasetChoices(descriptor, model)
		for _, choice := range candidates {
			if m.permittedChoice(ctx, choice, descriptor.Capabilities) {
				out = append(out, choice)
			}
		}
	}
	return out, nil
}
func (m *DataModule) datasetChoices(descriptor data.Descriptor, model dataModuleReadModel) []DataActionChoice {
	out := []DataActionChoice{}
	for _, scenario := range descriptor.Scenarios {
		input := data.Input{Dataset: descriptor.Dataset, Scenario: scenario, TargetID: m.config.TargetID}
		for _, kind := range []data.Kind{data.Validate, data.Prepare, data.Refresh} {
			out = append(out, DataActionChoice{Kind: kind, Label: dataKindLabel(kind) + " " + scenario.ID, Input: input})
		}
	}
	for _, receipt := range model.receipts {
		if receipt.Dataset != descriptor.Dataset {
			continue
		}
		input := data.Input{Dataset: receipt.Dataset, Scenario: receipt.Scenario, TargetID: m.config.TargetID, ReceiptID: receipt.ID}
		label := receipt.Scenario.ID + " (" + receipt.ID + ")"
		out = append(out, DataActionChoice{Kind: data.Verify, Label: "Verify " + label, Input: input})
		if receipt.Verification != nil && receipt.Verification.Passed() {
			generation := model.state.Activation.Generation
			input.ExpectedGeneration = &generation
			out = append(out, DataActionChoice{Kind: data.Activate, Label: "Activate " + label, Input: input})
		}
	}
	return out
}

func (m *DataModule) records(ctx context.Context, _ console.Identity, panel string) ([]console.Record, error) {
	model, err := m.readModel(ctx)
	if err != nil {
		return nil, err
	}
	// The host owns presentation revisions; a bounded operation window must
	// never make summary/catalog/scenario revisions decrease when rows expire.
	m.mu.Lock()
	if m.revision == console.MaxWireCounter {
		m.mu.Unlock()
		return nil, data.Error(data.CodeUnavailable)
	}
	m.revision++
	revision := m.revision
	m.mu.Unlock()
	out := []console.Record{}
	switch panel {
	case DataPanelOverview:
		out = append(out, DataOverviewRecord(model.overview(), revision))
	case DataPanelDatasets:
		for _, descriptor := range model.catalog {
			out = append(out, DataDatasetRecord(descriptor, revision))
		}
	case DataPanelScenarios:
		for _, descriptor := range model.catalog {
			for _, scenario := range descriptor.Scenarios {
				out = append(out, DataScenarioRecord(model.scenario(scenario, m.config.TargetID), revision))
			}
		}
	case DataPanelOperations:
		for _, op := range model.ops {
			out = append(out, DataOperationRecord(op))
		}
	case DataPanelVerification:
		out = model.checkRecords(revision)
	case DataPanelCoverage:
		out = model.coverageRecords(revision)
	}
	return out, nil
}
func (model dataModuleReadModel) overview() DataOverviewView {
	view := DataOverviewView{Targets: []DataTargetView{{State: model.state}}, Counts: DataOverviewCounts{Datasets: len(model.catalog)}}
	for _, receipt := range model.receipts {
		if receipt.ID == model.state.Activation.ReceiptID {
			view.Targets[0].Receipt = receipt
		}
	}
	if len(model.catalog) > 0 {
		view.Capabilities = model.catalog[0].Capabilities
	}
	for _, descriptor := range model.catalog {
		view.Counts.Scenarios += len(descriptor.Scenarios)
	}
	if len(model.ops) > 0 {
		view.LatestOperation = &model.ops[0]
	}
	for _, op := range model.ops {
		if op.Result.State == data.Running || op.Result.State == data.Queued {
			view.Counts.Running++
		}
		if op.Result.State == data.Failed {
			view.Counts.Failed++
		}
	}
	return view
}
func (model dataModuleReadModel) scenario(scenario data.ScenarioRef, target string) DataScenarioView {
	view := DataScenarioView{Scenario: scenario, TargetID: target}
	for _, receipt := range model.receipts {
		if receipt.Scenario == scenario && (view.Receipt == nil || receipt.ID == model.state.Activation.ReceiptID) {
			view.Receipt = receipt
			view.Active = receipt.ID == model.state.Activation.ReceiptID
			if view.Active {
				break
			}
		}
	}
	return view
}
func (model dataModuleReadModel) checkRecords(revision uint64) []console.Record {
	out := []console.Record{}
	for _, op := range model.ops {
		for _, check := range op.Result.Checks {
			out = append(out, DataCheckRecord(DataCheckView{Origin: op.Result.Kind, OperationID: op.Result.OperationID, DryRun: op.Result.DryRun, Check: check}, revision))
		}
	}
	for _, receipt := range model.receipts {
		if receipt.Verification == nil {
			continue
		}
		for _, check := range receipt.Verification.Checks {
			out = append(out, DataCheckRecord(DataCheckView{Origin: data.Verify, VerificationID: receipt.Verification.ID, ReceiptID: receipt.ID, Check: check}, revision))
		}
	}
	return out
}
func (model dataModuleReadModel) coverageRecords(revision uint64) []console.Record {
	out := []console.Record{}
	for _, receipt := range model.receipts {
		if receipt.Verification == nil {
			continue
		}
		for _, coverage := range receipt.Verification.Coverage {
			out = append(out, DataCoverageRecord(DataCoverageView{VerificationID: receipt.Verification.ID, ReceiptID: receipt.ID, Coverage: coverage}, revision))
		}
	}
	return out
}
