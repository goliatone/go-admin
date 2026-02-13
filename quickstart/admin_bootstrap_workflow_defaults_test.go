package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestWithTraitWorkflowDefaultsNormalizesKeysAndValues(t *testing.T) {
	opts := &adminOptions{}
	WithTraitWorkflowDefaults(map[string]string{
		" Editorial ": " editorial.default ",
		"":            "ignored",
		"news":        "",
	})(opts)

	if got := opts.traitWorkflowDefaults["editorial"]; got != "editorial.default" {
		t.Fatalf("expected normalized trait workflow defaults, got %+v", opts.traitWorkflowDefaults)
	}
	if _, ok := opts.traitWorkflowDefaults[""]; ok {
		t.Fatalf("expected empty trait key removed, got %+v", opts.traitWorkflowDefaults)
	}
	if _, ok := opts.traitWorkflowDefaults["news"]; ok {
		t.Fatalf("expected empty workflow ID removed, got %+v", opts.traitWorkflowDefaults)
	}
}

func TestNewAdminAppliesTraitWorkflowDefaultsToDynamicPanelResolution(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Test", "en")

	workflow := admin.NewSimpleWorkflowEngine()
	workflow.RegisterWorkflow("editorial.default", admin.WorkflowDefinition{
		EntityType:   "editorial.default",
		InitialState: "draft",
		Transitions: []admin.WorkflowTransition{
			{Name: "submit_for_approval", From: "draft", To: "approval"},
			{Name: "publish", From: "approval", To: "published"},
		},
	})

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{Workflow: workflow}),
		WithTraitWorkflowDefaults(map[string]string{
			"editorial": "editorial.default",
		}),
	)
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}

	factory := admin.NewDynamicPanelFactory(adm)
	panel, err := factory.CreatePanelFromContentType(context.Background(), &admin.CMSContentType{
		ID:     "ct-news",
		Name:   "News",
		Slug:   "news",
		Status: "active",
		Schema: minimalQuickstartWorkflowSchema(),
		Capabilities: map[string]any{
			"panel_slug":   "news",
			"panel_traits": []any{"editorial"},
			"translations": true,
		},
	})
	if err != nil {
		t.Fatalf("create panel: %v", err)
	}

	if !hasActionNamed(panel.Schema().Actions, "submit_for_approval") || !hasActionNamed(panel.Schema().Actions, "publish") {
		t.Fatalf("expected workflow actions from trait defaults, got %+v", panel.Schema().Actions)
	}
}

func minimalQuickstartWorkflowSchema() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title": map[string]any{"type": "string"},
		},
	}
}

func hasActionNamed(actions []admin.Action, name string) bool {
	for _, action := range actions {
		if action.Name == name {
			return true
		}
	}
	return false
}
