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
