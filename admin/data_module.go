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
}

func NewDataModule(cfg DataModuleConfig) (*DataModule, error) {
	if cfg.Service == nil || cfg.TargetID == "" || cfg.Enabled == nil || cfg.ResolveIdentity == nil {
		return nil, data.Error(data.CodeInvalid)
	}
	m := &DataModule{config: cfg}
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
		Access: ConsoleAccess{
			Resolve: func(ctx context.Context, identity console.Identity) (context.Context, console.Identity, error) {
				current, err := cfg.ResolveIdentity(ctx)
				if err != nil || current != identity || current.ConsoleID != "data" {
					return ctx, identity, ErrForbidden
				}
				return ctx, current, nil
			},
			Read: func(ctx context.Context, _ console.Identity) error {
				_, err := cfg.Service.Active(ctx, cfg.TargetID)
				if err != nil {
					return ErrForbidden
				}
				return nil
			},
			Panel: func(_ context.Context, _ console.Identity, def console.PanelDefinition) bool {
				return slices.Contains(DataPanelIDs(), def.ID)
			},
			Action: func(ctx context.Context, _ console.Identity, _, action string) bool {
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
			},
			Record: func(ctx context.Context, _ console.Identity, panel string, record console.Record) bool {
				if record.TargetID != "" && record.TargetID != cfg.TargetID {
					return false
				}
				if panel == DataPanelOperations {
					op, err := cfg.Service.LookupOperation(ctx, record.Key)
					return err == nil && op.Target.TargetID == cfg.TargetID
				}
				_, err := cfg.Service.Active(ctx, cfg.TargetID)
				return err == nil
			},
		},
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
	return []MenuItem{{ID: "data", Label: "Data", Icon: "database", Menu: m.menuCode, Locale: locale,
		ParentID: m.config.MenuParent, Position: new(95), Permissions: []string{"admin.data.view"},
		Target: map[string]any{"type": "url", "path": m.host.routes.Page, "key": "data"}}}
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
	result, _ := outcome.Result.(data.Result)
	// Invalidation contains no lifecycle data. Each delivery reloads authorized
	// projections, including fresh choices and generation preconditions.
	if identity, resolveErr := m.config.ResolveIdentity(ctx); resolveErr == nil {
		for _, panel := range DataPanelIDs() {
			_, _ = m.host.Events().Publish(console.Event{Identity: identity, PanelID: panel, Record: console.Record{Key: "refresh"}, Kind: console.EventInvalidate})
		}
	}
	return result, err
}

func (m *DataModule) choices(ctx context.Context) ([]DataActionChoice, error) {
	catalog, err := m.config.Service.Catalog(ctx, m.config.TargetID, 100)
	if err != nil {
		return nil, err
	}
	state, err := m.config.Service.Active(ctx, m.config.TargetID)
	if err != nil {
		return nil, err
	}
	ops, err := m.config.Service.Operations(ctx, m.config.TargetID, 100)
	if err != nil {
		return nil, err
	}
	out := []DataActionChoice{}
	add := func(kind data.Kind, input data.Input, label string, capabilities map[data.Kind]data.Capability) {
		cap := capabilities[kind]
		input.IdempotencyKey = "permission-check"
		if cap.Supported && cap.Permitted && m.config.Service.AuthorizeInput(ctx, kind, input) == nil {
			input.IdempotencyKey = ""
			out = append(out, DataActionChoice{Kind: kind, Label: label, Input: input})
		}
	}
	for _, descriptor := range catalog {
		for _, scenario := range descriptor.Scenarios {
			input := data.Input{Dataset: descriptor.Dataset, Scenario: scenario, TargetID: m.config.TargetID}
			for _, kind := range []data.Kind{data.Validate, data.Prepare, data.Refresh} {
				add(kind, input, dataKindLabel(kind)+" "+scenario.ID, descriptor.Capabilities)
			}
		}
		seen := map[string]bool{}
		for _, op := range ops {
			receipt := op.Result.Receipt
			if receipt == nil || receipt.Dataset != descriptor.Dataset || seen[receipt.ID] {
				continue
			}
			seen[receipt.ID] = true
			input := data.Input{Dataset: receipt.Dataset, Scenario: receipt.Scenario, TargetID: m.config.TargetID, ReceiptID: receipt.ID}
			add(data.Verify, input, "Verify "+receipt.Scenario.ID+" ("+receipt.ID+")", descriptor.Capabilities)
			if receipt.Verification != nil && receipt.Verification.Passed() {
				generation := state.Activation.Generation
				input.ExpectedGeneration = &generation
				add(data.Activate, input, "Activate "+receipt.Scenario.ID+" ("+receipt.ID+")", descriptor.Capabilities)
			}
		}
	}
	return out, nil
}

func (m *DataModule) records(ctx context.Context, _ console.Identity, panel string) ([]console.Record, error) {
	catalog, err := m.config.Service.Catalog(ctx, m.config.TargetID, 100)
	if err != nil {
		return nil, err
	}
	state, err := m.config.Service.Active(ctx, m.config.TargetID)
	if err != nil {
		return nil, err
	}
	ops, err := m.config.Service.Operations(ctx, m.config.TargetID, 100)
	if err != nil {
		return nil, err
	}
	revision := uint64(1) + state.Activation.Generation
	for _, op := range ops {
		revision += op.Result.Revision
	}
	out := []console.Record{}
	receipts := map[string]*data.PreparationReceipt{}
	for _, op := range ops {
		if r := op.Result.Receipt; r != nil {
			if old := receipts[r.ID]; old == nil || (old.Verification == nil && r.Verification != nil) {
				receipts[r.ID] = r
			}
		}
	}
	switch panel {
	case DataPanelOverview:
		view := DataOverviewView{Targets: []DataTargetView{{State: state, Receipt: receipts[state.Activation.ReceiptID]}}, Counts: DataOverviewCounts{Datasets: len(catalog)}}
		if len(catalog) > 0 {
			view.Capabilities = catalog[0].Capabilities
		}
		for _, d := range catalog {
			view.Counts.Scenarios += len(d.Scenarios)
		}
		for i := range ops {
			if i == 0 {
				view.LatestOperation = &ops[i]
			}
			if ops[i].Result.State == data.Running || ops[i].Result.State == data.Queued {
				view.Counts.Running++
			}
			if ops[i].Result.State == data.Failed {
				view.Counts.Failed++
			}
		}
		out = append(out, DataOverviewRecord(view, revision))
	case DataPanelDatasets:
		for _, d := range catalog {
			out = append(out, DataDatasetRecord(d, revision))
		}
	case DataPanelScenarios:
		for _, d := range catalog {
			for _, scenario := range d.Scenarios {
				view := DataScenarioView{Scenario: scenario, TargetID: m.config.TargetID}
				for _, op := range ops {
					if r := op.Result.Receipt; r != nil && r.Scenario == scenario {
						view.Receipt = receipts[r.ID]
						view.Active = r.ID == state.Activation.ReceiptID
						break
					}
				}
				out = append(out, DataScenarioRecord(view, revision))
			}
		}
	case DataPanelOperations:
		for _, op := range ops {
			out = append(out, DataOperationRecord(op))
		}
	case DataPanelVerification:
		for _, op := range ops {
			for _, check := range op.Result.Checks {
				out = append(out, DataCheckRecord(DataCheckView{Origin: op.Result.Kind, OperationID: op.Result.OperationID, DryRun: op.Result.DryRun, Check: check}, revision))
			}
		}
		for _, op := range ops {
			r := op.Result.Receipt
			if r == nil || receipts[r.ID] == nil {
				continue
			}
			r = receipts[r.ID]
			delete(receipts, r.ID)
			if r.Verification != nil {
				for _, check := range r.Verification.Checks {
					out = append(out, DataCheckRecord(DataCheckView{Origin: data.Verify, VerificationID: r.Verification.ID, ReceiptID: r.ID, Check: check}, revision))
				}
			}
		}
	case DataPanelCoverage:
		for _, op := range ops {
			r := op.Result.Receipt
			if r == nil || receipts[r.ID] == nil {
				continue
			}
			r = receipts[r.ID]
			delete(receipts, r.ID)
			if r.Verification != nil {
				for _, coverage := range r.Verification.Coverage {
					out = append(out, DataCoverageRecord(DataCoverageView{VerificationID: r.Verification.ID, ReceiptID: r.ID, Coverage: coverage}, revision))
				}
			}
		}
	}
	return out, nil
}
