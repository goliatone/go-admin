package admin

import (
	"context"
	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	command "github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
	"testing"
	"time"
)

type maintenanceRegistrationHost struct {
	data.MaintenanceBackend
	record  data.MaintenanceRecord
	denied  bool
	effects int
}

func (h *maintenanceRegistrationHost) Authorize(context.Context, bool) (data.Principal, error) {
	if h.denied {
		return data.Principal{}, data.Error(data.CodeDenied)
	}
	return data.Principal{ActorID: "owner"}, nil
}
func (h *maintenanceRegistrationHost) AuthorizePolicy(context.Context, data.MaintenanceRecord) error {
	return nil
}
func (h *maintenanceRegistrationHost) Load(context.Context) (data.MaintenanceRecord, data.TargetState, error) {
	return h.record, data.TargetState{}, nil
}
func (h *maintenanceRegistrationHost) Profile(context.Context) (data.MaintenanceProfile, error) {
	return data.MaintenanceProfile{Digest: "profile", Principal: "delegate"}, nil
}
func (h *maintenanceRegistrationHost) Configure(_ context.Context, _ data.Principal, in data.MaintenanceConfigureRequest, next data.MaintenanceRecord) (data.MaintenanceRecord, error) {
	if in.ExpectedRevision != h.record.Revision {
		return h.record, data.Error(data.CodeStale)
	}
	h.effects++
	h.record = next
	return next, nil
}

type registrationNoLifecycle struct{ data.MaintenanceLifecycle }

func TestMaintenanceNativeRegistrationRejectsAuthorityAndCloses(t *testing.T) {
	host := &maintenanceRegistrationHost{}
	service, e := data.NewMaintenanceService(host, registrationNoLifecycle{}, time.Now)
	if e != nil {
		t.Fatal(e)
	}
	bus := NewCommandBus(true)
	handle, e := RegisterDataMaintenanceCommands(bus, service)
	if e != nil {
		t.Fatal(e)
	}
	defer handle.Close()
	payload := map[string]any{"enabled": true, "expected_revision": 0, "request_key": "configure", "dry_run": true}
	outcome, e := bus.DispatchByNameWithOutcome(context.Background(), data.MaintenanceConfigureCommandID, payload, nil, command.DispatchOptions{Mode: command.ExecutionModeInline})
	result, ok := outcome.Result.(data.MaintenanceResult)
	if e != nil || !ok || !result.DryRun || host.effects != 0 {
		t.Fatal(outcome, e)
	}
	payload["actor_id"] = "spoof"
	if _, e = bus.DispatchByNameWithOutcome(context.Background(), data.MaintenanceConfigureCommandID, payload, nil, command.DispatchOptions{Mode: command.ExecutionModeInline}); data.ErrorCode(e) != data.CodeInvalid {
		t.Fatal("caller authority accepted", e)
	}
	delete(payload, "actor_id")
	host.denied = true
	if _, e = bus.DispatchByNameWithOutcome(context.Background(), data.MaintenanceConfigureCommandID, payload, nil, command.DispatchOptions{Mode: command.ExecutionModeInline}); data.ErrorCode(e) != data.CodeDenied {
		t.Fatal("revocation ignored", e)
	}
	host.denied = false
	if e = handle.Close(); e != nil {
		t.Fatal(e)
	}
	if _, e = bus.DispatchByNameWithOutcome(context.Background(), data.MaintenanceConfigureCommandID, payload, nil, command.DispatchOptions{Mode: command.ExecutionModeInline}); e == nil {
		t.Fatal("closed handler dispatched")
	}
}

func TestMaintenanceDataModuleRegistersAndClosesOptionalCommands(t *testing.T) {
	lifecycle, _, ctx := dataRegistrationServiceWithChecks(t, nil)
	host := &maintenanceRegistrationHost{}
	service, e := data.NewMaintenanceService(host, registrationNoLifecycle{}, time.Now)
	if e != nil {
		t.Fatal(e)
	}
	p := ctx.Value(dataRegistrationPrincipalKey{}).(data.Principal)
	m, e := NewDataModule(DataModuleConfig{Service: lifecycle, Maintenance: service, TargetID: "preview", BasePath: "/control", Enabled: func() bool { return true }, ResolveIdentity: func(context.Context) (console.Identity, error) {
		return console.Identity{ConsoleID: "data", ApplicationID: "test", EnvironmentID: "dev", ActorID: p.ActorID, ScopeKey: p.ScopeKey}, nil
	}})
	if e != nil {
		t.Fatal(e)
	}
	adm := mustNewAdmin(t, Config{BasePath: "/control", Debug: DebugConfig{Enabled: false}}, Dependencies{})
	adm.commandBus = NewCommandBus(true)
	rt := &stubWebSocketRouter{}
	adm.router = rt
	contract := m.RouteContract()
	moduleCtx := ModuleContext{Admin: adm, ProtectedRouter: rt, AuthMiddleware: func(next router.HandlerFunc) router.HandlerFunc { return next }, Routing: routing.BuildModuleContext(contract, routing.ResolvedModule{Slug: "data", UIMountBase: "/control/data"})}
	if e = m.Register(moduleCtx); e != nil {
		t.Fatal(e)
	}
	defer m.Close()
	if m.Maintenance() != service {
		t.Fatal("native service not bound")
	}
	payload := map[string]any{"enabled": true, "expected_revision": 0, "request_key": "module-dry", "dry_run": true}
	out, e := adm.Commands().DispatchByNameWithOutcome(ctx, data.MaintenanceConfigureCommandID, payload, nil, command.DispatchOptions{Mode: command.ExecutionModeInline})
	if e != nil || !out.Result.(data.MaintenanceResult).DryRun || host.effects != 0 {
		t.Fatal(out, e)
	}
	if e = m.Close(); e != nil {
		t.Fatal(e)
	}
	if _, e = adm.Commands().DispatchByNameWithOutcome(ctx, data.MaintenanceConfigureCommandID, payload, nil, command.DispatchOptions{Mode: command.ExecutionModeInline}); e == nil {
		t.Fatal("module retained native commands")
	}
}
