package admin

import (
	"fmt"
	"testing"
)

func TestResolveAdminConstructorStateBuildsRuntimeDefaults(t *testing.T) {
	state, err := resolveAdminConstructorState(Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}, Dependencies{})
	if err != nil {
		t.Fatalf("resolveAdminConstructorState: %v", err)
	}
	if state.registry == nil {
		t.Fatalf("expected registry")
	}
	if state.container == nil {
		t.Fatalf("expected cms container")
	}
	if state.urlManager == nil {
		t.Fatalf("expected url manager")
	}
	if state.routingPlanner == nil {
		t.Fatalf("expected routing planner")
	}
	if state.dashboard == nil {
		t.Fatalf("expected dashboard")
	}
	if state.iconService == nil {
		t.Fatalf("expected icon service")
	}
	if state.navMenuCode != "admin.main" {
		t.Fatalf("expected normalized default nav menu code, got %q", state.navMenuCode)
	}
	if state.defaultTheme == nil {
		t.Fatalf("expected default theme selection")
	}
	if state.defaultTheme.Name != "" {
		t.Fatalf("expected theme name to stay empty when config theme is unset, got %q", state.defaultTheme.Name)
	}
	if state.defaultTheme.ChartTheme != "default" {
		t.Fatalf("expected default chart theme variant, got %q", state.defaultTheme.ChartTheme)
	}
	if state.deploymentIdentity.InstanceID == "" || state.deploymentIdentity.InstanceName == "" {
		t.Fatalf("expected deployment identity to resolve during construction: %+v", state.deploymentIdentity)
	}
	if got := DefaultErrorPresenter().DeploymentIdentity(); got.InstanceID != state.deploymentIdentity.InstanceID {
		t.Fatalf("expected default presenter to share resolved identity: got=%+v want=%+v", got, state.deploymentIdentity)
	}
}

func TestNewAdminRetainsResolvedDeploymentIdentity(t *testing.T) {
	state, err := resolveAdminConstructorState(Config{
		Deployment: DeploymentIdentityConfig{
			AppID:        "admin-api",
			InstanceName: "steady-heron",
			InstanceID:   "instance-a",
		},
	}, Dependencies{})
	if err != nil {
		t.Fatalf("resolveAdminConstructorState: %v", err)
	}
	adm := newAdminFromConstructorState(state, Dependencies{})
	first := adm.DeploymentIdentity()
	second := adm.DeploymentIdentity()
	if first != second {
		t.Fatalf("expected stable identity copies: first=%+v second=%+v", first, second)
	}
	if first.AppID != "admin-api" || first.InstanceName != "steady-heron" || first.InstanceID != "instance-a" {
		t.Fatalf("unexpected retained identity: %+v", first)
	}

	otherState, err := resolveAdminConstructorState(Config{}, Dependencies{})
	if err != nil {
		t.Fatalf("resolve second state: %v", err)
	}
	other := newAdminFromConstructorState(otherState, Dependencies{}).DeploymentIdentity()
	if other.InstanceID == first.InstanceID {
		t.Fatalf("expected isolated admin identities, got %q", other.InstanceID)
	}
}

func TestResolveAdminConstructorStateCarriesThemeAssetOverrides(t *testing.T) {
	state, err := resolveAdminConstructorState(Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		ThemeAssets: map[string]string{
			"icon": "/brand/icon.svg",
		},
		LogoURL:    "/brand/logo.svg",
		FaviconURL: "/brand/favicon.svg",
	}, Dependencies{})
	if err != nil {
		t.Fatalf("resolveAdminConstructorState: %v", err)
	}
	if got := state.defaultTheme.Assets["logo"]; got != "/brand/logo.svg" {
		t.Fatalf("expected default theme logo override, got %q", got)
	}
	if got := state.defaultTheme.Assets["icon"]; got != "/brand/icon.svg" {
		t.Fatalf("expected default theme icon override, got %q", got)
	}
	if got := state.defaultTheme.Assets["favicon"]; got != "/brand/favicon.svg" {
		t.Fatalf("expected default theme favicon override, got %q", got)
	}
}

func TestInitializeConstructedAdminReturnsWorkflowBindErrors(t *testing.T) {
	state, err := resolveAdminConstructorState(Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}, Dependencies{})
	if err != nil {
		t.Fatalf("resolveAdminConstructorState: %v", err)
	}
	runtime := &failingWorkflowRuntime{bindErr: fmt.Errorf("bind failed")}
	deps := Dependencies{WorkflowRuntime: runtime}
	adm := newAdminFromConstructorState(state, deps)

	err = initializeConstructedAdmin(adm, state, deps)
	if err == nil || err.Error() != "bind failed" {
		t.Fatalf("expected bind failure to surface, got %v", err)
	}
	if runtime.bindCalls != 1 {
		t.Fatalf("expected one workflow bind call, got %d", runtime.bindCalls)
	}
}
