package admin

import (
	"context"
	"reflect"
	"testing"

	command "github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
)

type readinessNoGrantAuthorizer struct{}

func (readinessNoGrantAuthorizer) Can(context.Context, string, string) bool {
	panic("readiness evaluated grants")
}
func (readinessNoGrantAuthorizer) ResolvedPermissions(context.Context) []string {
	panic("readiness resolved grants")
}

func TestRPCReadinessIntendedExposureAndDoctor(t *testing.T) {
	catalog := &mutableCommandLauncherTestCatalog{descriptors: []command.CommandDescriptor{{ID: "private.command"}, {ID: "exposed.command", ExposeInAdmin: true}}}
	adm := mustNewAdmin(t, Config{}, Dependencies{CommandCatalog: catalog, FeatureGate: featureGateFromKeys(FeatureCommands)})
	adm.WithAuthorizer(readinessNoGrantAuthorizer{})
	snapshot := router.RegistrationSnapshot{State: router.RegistrationSealed, MountedRoutes: []router.RouteDefinition{{Method: router.POST, Path: "/rpc"}}}
	adm.ConfigureRPCExposure(RPCExposureConfig{Enabled: true, InvokePath: "/rpc", Snapshot: func() (router.RegistrationSnapshot, bool) { return snapshot, true }})
	before := adm.Commands().CommandRegistration("exposed.command")
	report := adm.RPCExposureReadiness()
	found := false
	for _, issue := range report.Issues {
		if issue.Target == "private.command" {
			t.Fatal("unexposed catalog command invalidated readiness")
		}
		if issue.Code == "rpc_command_rule_gaps" && issue.Target == "exposed.command" {
			found = true
		}
	}
	if !found || report.Ready {
		t.Fatalf("report=%+v", report)
	}
	if after := adm.Commands().CommandRegistration("exposed.command"); after != before {
		t.Fatal("report changed registration")
	}
	if len(adm.config.Commands.RPC.Commands) != 0 {
		t.Fatal("report added allowlist rules")
	}
	RegisterRPCExposureDoctorCheck(adm)
	var doctorReport RPCExposureReport
	for _, check := range adm.DoctorChecks() {
		if check.ID == "rpc_exposure" {
			doctorReport = check.Run(context.Background(), adm).Metadata["report"].(RPCExposureReport)
		}
	}
	if !reflect.DeepEqual(report, doctorReport) {
		t.Fatal("Doctor diverged from startup report")
	}
	// Removing an explicit exposure declaration leaves the private catalog alone.
	catalog.descriptors = catalog.descriptors[:1]
	if next := adm.RPCExposureReadiness(); !next.Ready {
		t.Fatalf("private catalog: %+v", next)
	}
	report.Issues[0].Message = "caller edit"
	if next := adm.RPCExposureReadiness(); len(next.Issues) != 0 {
		t.Fatalf("report retained caller state: %+v", next)
	}
}

func TestRPCReadinessOpaqueSnapshotPanic(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{})
	adm.ConfigureRPCExposure(RPCExposureConfig{Enabled: true, Snapshot: func() (router.RegistrationSnapshot, bool) { panic("host") }})
	if report := adm.RPCExposureReadiness(); report.Ready || report.State != RPCReadinessUnverifiable {
		t.Fatal(report)
	}
}
