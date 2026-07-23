package admin

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"
)

func TestDeploymentDebugPanelDefaultsAndScopedSnapshots(t *testing.T) {
	if !containsDeploymentPanel(DefaultDebugPanels(), DebugPanelDeployment) {
		t.Fatal("deployment panel is not enabled by default")
	}
	if !containsDeploymentPanel(DefaultDebugToolbarPanels(), DebugPanelDeployment) {
		t.Fatal("deployment toolbar panel is not enabled by default")
	}

	start := time.Date(2026, 7, 23, 10, 0, 0, 0, time.UTC)
	first := newDeploymentPanelTestAdmin("first", start)
	second := newDeploymentPanelTestAdmin("second", start)
	RegisterDeploymentDebugPanel(first)
	RegisterDeploymentDebugPanel(second)

	firstSnapshot := first.debugCollector.SnapshotWithContext(context.Background())
	secondSnapshot := second.debugCollector.SnapshotWithContext(context.Background())
	assertDeploymentPanelInstance(t, firstSnapshot, "first")
	assertDeploymentPanelInstance(t, secondSnapshot, "second")

	definitions := first.debugCollector.PanelDefinitions()
	found := false
	for _, definition := range definitions {
		if definition.ID != DebugPanelDeployment {
			continue
		}
		found = true
		if !definition.SupportsToolbar || definition.UI == nil || definition.UI.Views.Console == nil || definition.UI.Views.Toolbar == nil {
			t.Fatalf("incomplete deployment panel definition: %+v", definition)
		}
	}
	if !found {
		t.Fatal("deployment panel definition not found")
	}
}

func TestDeploymentDebugPanelDisabled(t *testing.T) {
	adm := &Admin{
		deploymentIdentity: DeploymentIdentity{InstanceName: "hidden", InstanceID: "hidden"},
		debugCollector:     NewDebugCollector(DebugConfig{Enabled: true, Panels: []string{DebugPanelRequests}}),
	}
	RegisterDeploymentDebugPanel(adm)
	if _, ok := adm.debugCollector.Snapshot()[DebugPanelDeployment]; ok {
		t.Fatal("disabled deployment panel was exposed")
	}
}

func TestDeploymentIdentityMatchesDebugAndDevelopmentErrorSurfaces(t *testing.T) {
	state, err := resolveAdminConstructorState(Config{
		Deployment: DeploymentIdentityConfig{
			AppID:        "cross-surface",
			Environment:  "staging",
			InstanceName: "steady-raven",
			InstanceID:   "instance-cross-surface",
			CommitSHA:    "abcdef0123456789",
		},
		Errors: ErrorConfig{DevMode: true, ShowEnvironment: true},
	}, Dependencies{})
	if err != nil {
		t.Fatalf("resolve admin state: %v", err)
	}
	adm := newAdminFromConstructorState(state, Dependencies{})
	adm.debugCollector = NewDebugCollector(DebugConfig{Enabled: true, Panels: []string{DebugPanelDeployment}})
	RegisterDeploymentDebugPanel(adm)

	snapshot := adm.debugCollector.Snapshot()
	panel := snapshot[DebugPanelDeployment].(map[string]any)
	runtimeData := panel["runtime"].(map[string]any)
	buildData := panel["build"].(map[string]any)
	errorContext := adm.ErrorPresenter().BuildDevErrorContext(errors.New("boom"), nil)
	if errorContext == nil || errorContext.EnvironmentInfo == nil || errorContext.EnvironmentInfo.Deployment == nil {
		t.Fatalf("missing development error deployment context: %+v", errorContext)
	}
	errorIdentity := errorContext.EnvironmentInfo.Deployment
	resolved := adm.DeploymentIdentity()
	if runtimeData["instance_name"] != resolved.InstanceName ||
		runtimeData["instance_id"] != resolved.InstanceID ||
		buildData["commit_sha"] != resolved.CommitSHA ||
		errorIdentity.InstanceName != resolved.InstanceName ||
		errorIdentity.InstanceID != resolved.InstanceID ||
		errorIdentity.CommitSHA != resolved.CommitSHA {
		t.Fatalf("cross-surface identity mismatch: resolved=%+v debug=%+v error=%+v", resolved, panel, errorIdentity)
	}
}

func newDeploymentPanelTestAdmin(instance string, startedAt time.Time) *Admin {
	collector := NewDebugCollector(DebugConfig{Enabled: true, Panels: []string{DebugPanelDeployment}})
	adm := &Admin{
		deploymentIdentity: DeploymentIdentity{
			AppID: "app", Environment: "staging", EnvironmentColor: defaultStagingColor,
			InstanceName: instance, InstanceID: "id-" + instance, CommitSHA: "abcdef0",
			CommitShort: "abcdef0", StartedAt: startedAt,
		},
		debugCollector: collector,
	}
	return adm
}

func assertDeploymentPanelInstance(t *testing.T, snapshot map[string]any, want string) {
	t.Helper()
	panel, ok := snapshot[DebugPanelDeployment].(map[string]any)
	if !ok {
		t.Fatalf("missing deployment snapshot: %+v", snapshot)
	}
	runtime, ok := panel["runtime"].(map[string]any)
	if !ok || runtime["instance_name"] != want {
		t.Fatalf("unexpected runtime identity: %+v", panel)
	}
}

func containsDeploymentPanel(values []string, expected string) bool {
	return slices.Contains(values, expected)
}
