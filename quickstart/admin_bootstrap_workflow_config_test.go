package quickstart

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestAdminBootstrapLoadsWorkflowConfigAndRegistersDefinitions(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Test", "en")
	workflowCfg := WorkflowConfig{
		SchemaVersion: 1,
		Workflows: map[string]WorkflowDefinitionSpec{
			"editorial.default": {
				InitialState: "draft",
				Transitions: []WorkflowTransitionSpec{
					{Name: "publish", From: "draft", To: "published"},
				},
			},
			"editorial.news": {
				InitialState: "draft",
				Transitions: []WorkflowTransitionSpec{
					{Name: "submit_for_approval", From: "draft", To: "approval"},
					{Name: "publish", From: "approval", To: "published"},
				},
			},
		},
		TraitDefaults: map[string]string{
			"editorial": "editorial.default",
		},
	}

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithWorkflowConfig(workflowCfg),
	)
	if err != nil {
		t.Fatalf("new admin with workflow config: %v", err)
	}

	factory := admin.NewDynamicPanelFactory(adm)
	defaultPanel, err := factory.CreatePanelFromContentType(context.Background(), &admin.CMSContentType{
		ID:     "ct-default",
		Name:   "Default",
		Slug:   "default",
		Status: "active",
		Schema: minimalQuickstartWorkflowSchema(),
		Capabilities: map[string]any{
			"panel_slug":   "default",
			"panel_traits": []any{"editorial"},
			"translations": true,
		},
	})
	if err != nil {
		t.Fatalf("create default panel: %v", err)
	}
	if !hasActionNamed(defaultPanel.Schema().Actions, "publish") {
		t.Fatalf("expected publish action from trait default workflow, got %+v", defaultPanel.Schema().Actions)
	}
	if hasActionNamed(defaultPanel.Schema().Actions, "submit_for_approval") {
		t.Fatalf("did not expect submit_for_approval for editorial.default workflow, got %+v", defaultPanel.Schema().Actions)
	}

	newsPanel, err := factory.CreatePanelFromContentType(context.Background(), &admin.CMSContentType{
		ID:     "ct-news",
		Name:   "News",
		Slug:   "news",
		Status: "active",
		Schema: minimalQuickstartWorkflowSchema(),
		Capabilities: map[string]any{
			"panel_slug":   "news",
			"panel_traits": []any{"editorial"},
			"translations": true,
			"workflow_id":  "editorial.news",
		},
	})
	if err != nil {
		t.Fatalf("create news panel: %v", err)
	}
	if !hasActionNamed(newsPanel.Schema().Actions, "submit_for_approval") {
		t.Fatalf("expected submit_for_approval from explicit editorial.news workflow_id, got %+v", newsPanel.Schema().Actions)
	}
}

func TestAdminBootstrapWorkflowConfigFileOverridesInlineDefaults(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Test", "en")
	inline := WorkflowConfig{
		SchemaVersion: 1,
		Workflows: map[string]WorkflowDefinitionSpec{
			"editorial.default": {
				InitialState: "draft",
				Transitions: []WorkflowTransitionSpec{
					{Name: "publish", From: "draft", To: "published"},
				},
			},
		},
		TraitDefaults: map[string]string{
			"editorial": "editorial.default",
		},
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "workflow.yaml")
	fileCfg := []byte(`
schema_version: 1
trait_defaults:
  editorial: editorial.news
workflows:
  editorial.news:
    initial_state: draft
    transitions:
      - name: submit_for_approval
        from: draft
        to: approval
      - name: publish
        from: approval
        to: published
`)
	if err := os.WriteFile(path, fileCfg, 0o600); err != nil {
		t.Fatalf("write workflow config fixture: %v", err)
	}

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithWorkflowConfig(inline),
		WithWorkflowConfigFile(path),
	)
	if err != nil {
		t.Fatalf("new admin with workflow config file: %v", err)
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
	if !hasActionNamed(panel.Schema().Actions, "submit_for_approval") {
		t.Fatalf("expected file-configured trait default to override inline defaults, got %+v", panel.Schema().Actions)
	}
}

func TestAdminBootstrapFailsFastOnUnknownWorkflowTraitReference(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Test", "en")
	_, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithWorkflowConfig(WorkflowConfig{
			SchemaVersion: 1,
			Workflows: map[string]WorkflowDefinitionSpec{
				"editorial.default": {
					InitialState: "draft",
					Transitions: []WorkflowTransitionSpec{
						{Name: "publish", From: "draft", To: "published"},
					},
				},
			},
			TraitDefaults: map[string]string{
				"editorial": "editorial.news",
			},
		}),
	)
	if err == nil {
		t.Fatalf("expected fail-fast error for unknown trait default workflow")
	}
	if !errors.Is(err, ErrWorkflowConfig) {
		t.Fatalf("expected ErrWorkflowConfig, got %v", err)
	}
	if !strings.Contains(err.Error(), "trait_defaults.editorial") {
		t.Fatalf("expected actionable trait default field in error, got %v", err)
	}
}

func TestAdminBootstrapFailsFastWhenWorkflowEngineCannotRegisterDefinitions(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Test", "en")
	_, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithAdminDependencies(admin.Dependencies{
			Workflow: nonRegistrarWorkflowEngine{},
		}),
		WithWorkflowConfig(WorkflowConfig{
			SchemaVersion: 1,
			Workflows: map[string]WorkflowDefinitionSpec{
				"editorial.default": {
					InitialState: "draft",
					Transitions: []WorkflowTransitionSpec{
						{Name: "publish", From: "draft", To: "published"},
					},
				},
			},
		}),
	)
	if err == nil {
		t.Fatalf("expected fail-fast error when workflow engine cannot register definitions")
	}
	if !errors.Is(err, ErrWorkflowConfig) {
		t.Fatalf("expected ErrWorkflowConfig, got %v", err)
	}
	if !strings.Contains(strings.ToLower(err.Error()), "does not support registration") {
		t.Fatalf("expected actionable workflow engine registration error, got %v", err)
	}
}

type nonRegistrarWorkflowEngine struct{}

func (nonRegistrarWorkflowEngine) Transition(context.Context, admin.TransitionInput) (*admin.TransitionResult, error) {
	return nil, nil
}

func (nonRegistrarWorkflowEngine) AvailableTransitions(context.Context, string, string) ([]admin.WorkflowTransition, error) {
	return nil, nil
}
