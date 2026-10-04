package admin

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/data/examples/sqlitestore"
	router "github.com/goliatone/go-router"
)

type moduleCatalogProvider struct{ dataRegistrationProvider }

func (p *moduleCatalogProvider) Catalog(context.Context, data.Principal, data.TargetKey, int) ([]data.DatasetRef, error) {
	return []data.DatasetRef{p.descriptor.Dataset}, nil
}

type moduleDataPolicy struct{ view, execute *atomic.Bool }

func (p moduleDataPolicy) Authorize(_ context.Context, _ data.Principal, request data.AccessRequest) error {
	if !p.view.Load() || (request.Action != "view" && !p.execute.Load()) {
		return data.Error(data.CodeDenied)
	}
	return nil
}

func TestDataModuleBindsRoutesActionsAndIndependentCurrentPolicy(t *testing.T) {
	var enabled, view, execute atomic.Bool
	enabled.Store(true)
	view.Store(true)
	store, err := sqlitestore.Open(filepath.Join(t.TempDir(), "data.db"), sqlitestore.Options{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := store.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	hash := strings.Repeat("a", 64)
	descriptor := data.Descriptor{Dataset: data.DatasetRef{Provider: "sample", ID: "a", Version: "1"}, SourceContractHash: hash, SourceContractVersion: "1", PolicyHash: hash, Capabilities: map[data.Kind]data.Capability{data.Validate: {Supported: true}, data.Prepare: {Supported: true}}}
	descriptor.Scenarios = []data.ScenarioRef{{Dataset: descriptor.Dataset, ID: "ready", Version: "1", ProfileHash: hash}}
	descriptor.Dataset.Digest, err = descriptor.CompositeDigest()
	if err != nil {
		t.Fatal(err)
	}
	descriptor.Scenarios[0].Dataset = descriptor.Dataset
	principal := data.Principal{ActorID: "operator", ExecutionID: "operator", ScopeKey: "org", ModuleHash: hash, PolicyHash: hash, PermissionHash: hash}
	ctx := dataTestClientContext(context.WithValue(t.Context(), dataRegistrationPrincipalKey{}, principal))
	service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"sample": &moduleCatalogProvider{dataRegistrationProvider{descriptor: descriptor}}}, Target: dataRegistrationTarget{}, Store: store, Policy: moduleDataPolicy{&view, &execute}, Resolve: func(ctx context.Context) (data.Principal, error) {
		p, ok := ctx.Value(dataRegistrationPrincipalKey{}).(data.Principal)
		if !ok {
			return data.Principal{}, data.Error(data.CodeDenied)
		}
		return p, nil
	}})
	if err != nil {
		t.Fatal(err)
	}
	identity := console.Identity{ConsoleID: "data", ApplicationID: "test", EnvironmentID: "dev", ActorID: principal.ActorID, ScopeKey: principal.ScopeKey}
	module, err := NewDataModule(DataModuleConfig{Service: service, TargetID: "preview", Enabled: enabled.Load, ResolveIdentity: func(ctx context.Context) (console.Identity, error) {
		p, ok := ctx.Value(dataRegistrationPrincipalKey{}).(data.Principal)
		if !ok || p != principal {
			return console.Identity{}, ErrForbidden
		}
		return identity, nil
	}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := module.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	adm := mustNewAdmin(t, Config{BasePath: "/control", Debug: DebugConfig{Enabled: false}}, Dependencies{})
	adm.commandBus = NewCommandBus(true)
	rt := &stubWebSocketRouter{}
	adm.router = rt
	contract := module.RouteContract()
	planner, err := routing.NewPlanner(routing.Config{Roots: routing.RootsConfig{AdminRoot: "/control", APIRoot: "/control/api", PublicAPIRoot: "/api"}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if err = planner.RegisterModule(contract); err != nil {
		t.Fatal("Data route contract rejected at startup", err)
	}
	moduleContext := ModuleContext{Admin: adm, ProtectedRouter: rt, AuthMiddleware: func(next router.HandlerFunc) router.HandlerFunc { return next }, Routing: routing.BuildModuleContext(contract, routing.ResolvedModule{Slug: "data", UIMountBase: "/control/data"})}
	if err = module.Register(moduleContext); err != nil {
		t.Fatal(err)
	}
	if module.Manifest().ID != "data" || module.host.routes.Page != "/control/data" || contract.UIRouteDeclarations["data.action"].Method != router.POST || contract.RouteNamePrefix != "data_tools" {
		t.Fatal("incorrect Data contract", contract, module.host.routes)
	}
	if adm.Debug() != nil {
		t.Fatal("Data enabled Debug")
	}
	snapshot, err := module.Console().Snapshot(ctx, identity)
	findPanel := func(snapshot console.Snapshot, id string) console.PanelSnapshot {
		for _, panel := range snapshot.Panels {
			if panel.ID == id {
				return panel
			}
		}
		t.Fatal("missing panel", id)
		return console.PanelSnapshot{}
	}
	executable := func(panel console.PanelSnapshot) []console.PanelUIAction {
		out := []console.PanelUIAction{}
		for _, action := range panel.UI.Actions {
			if action.Executable() {
				out = append(out, action)
			}
		}
		return out
	}
	// A viewer sees the declared work disabled with its reason, never executable.
	if err != nil || len(snapshot.Panels) != len(DataPanelIDs()) || len(executable(findPanel(snapshot, DataPanelOverview))) != 0 || len(findPanel(snapshot, DataPanelExplore).Records) != 1 {
		t.Fatal("viewer lost read access", snapshot, err)
	}
	for _, action := range findPanel(snapshot, DataPanelScenarios).UI.Actions {
		if action.Availability != console.PanelActionNotPermitted || action.Reason == "" {
			t.Fatal("viewer declaration is not a disabled not-permitted affordance", action)
		}
	}
	execute.Store(true)
	snapshot, err = module.Console().Snapshot(ctx, identity)
	if err != nil || len(executable(findPanel(snapshot, DataPanelOverview))) != 1 {
		t.Fatal("operator actions not bound", snapshot, err)
	}
	action := executable(findPanel(snapshot, DataPanelOverview))[0]
	result, err := module.Console().RunAction(ctx, identity, console.PanelActionRequest{PanelID: DataPanelOverview, ActionID: action.ID, Payload: map[string]any{"idempotency_key": dataTestKey("validate"), "actor_id": "forged", "target_id": "other"}})
	if err != nil || !result.OK {
		t.Fatal("typed Data action failed", result, err)
	}
	ops, err := service.Operations(ctx, "preview", 10)
	if err != nil || len(ops) != 1 || ops[0].Principal != principal || ops[0].Target.TargetID != "preview" {
		t.Fatal("browser forged trusted metadata", ops, err)
	}
	if _, err = module.Console().Lookup(ctx, identity, DataPanelOperations, ops[0].Result.OperationID); err != nil {
		t.Fatal(err)
	}
	execute.Store(false)
	if _, err = module.Console().RunAction(ctx, identity, console.PanelActionRequest{PanelID: DataPanelOverview, ActionID: action.ID, Payload: map[string]any{"idempotency_key": dataTestKey("forbidden")}}); !errors.Is(err, ErrNotFound) {
		t.Fatal("revoked action ran", err)
	}
	view.Store(false)
	if _, err = module.Console().Snapshot(ctx, identity); !errors.Is(err, ErrForbidden) {
		t.Fatal("revoked view returned data", err)
	}
	view.Store(true)
	enabled.Store(false)
	if _, err = module.Console().Snapshot(ctx, identity); !errors.Is(err, ErrForbidden) {
		t.Fatal("disabled Data returned data", err)
	}
	enabled.Store(true)
	if err = module.Close(); err != nil {
		t.Fatal(err)
	}
	if adm.Commands().CommandRegistration(data.Validate.CommandID()).CanDispatch() {
		t.Fatal("closed module retained commands")
	}
	if _, err = module.Console().Snapshot(ctx, identity); !errors.Is(err, ErrForbidden) {
		t.Fatal("closed Data returned data", err)
	}
}
