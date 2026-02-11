package admin

import (
	"strings"
	"testing"

	goerrors "github.com/goliatone/go-errors"
)

type panelActionWiringMsg struct{}

func (panelActionWiringMsg) Type() string { return "items.refresh" }

func TestValidatePanelActionWiringFailsForMissingWorkflowTransition(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	workflow := NewSimpleWorkflowEngine()
	workflow.RegisterWorkflow("pages", WorkflowDefinition{
		EntityType:   "pages",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "request_approval", From: "draft", To: "pending_approval"},
		},
	})
	adm := mustNewAdmin(t, cfg, Dependencies{Workflow: workflow})
	builder := (&PanelBuilder{}).
		WithRepository(NewMemoryRepository()).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}).
		FormFields(Field{Name: "title", Label: "Title", Type: "text"}).
		Actions(Action{Name: "publish"})
	if _, err := adm.RegisterPanel("pages", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	err := adm.validatePanelActionWiring()
	if err == nil {
		t.Fatalf("expected wiring validation to fail")
	}
	if !panelActionWiringContainsReason(t, err, "workflow_transition_not_registered") {
		t.Fatalf("expected workflow_transition_not_registered issue, got %v", err)
	}
}

func TestValidatePanelActionWiringAcceptsWorkflowAliasActions(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	workflow := NewSimpleWorkflowEngine()
	workflow.RegisterWorkflow("pages", WorkflowDefinition{
		EntityType:   "pages",
		InitialState: "draft",
		Transitions: []WorkflowTransition{
			{Name: "request_approval", From: "draft", To: "pending_approval"},
			{Name: "approve", From: "pending_approval", To: "published"},
		},
	})
	adm := mustNewAdmin(t, cfg, Dependencies{Workflow: workflow})
	builder := (&PanelBuilder{}).
		WithRepository(NewMemoryRepository()).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}).
		FormFields(Field{Name: "title", Label: "Title", Type: "text"}).
		Actions(
			Action{Name: "submit_for_approval"},
			Action{Name: "publish"},
		)
	if _, err := adm.RegisterPanel("pages", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	if err := adm.validatePanelActionWiring(); err != nil {
		t.Fatalf("expected wiring validation to pass, got %v", err)
	}
}

func TestValidatePanelActionWiringFailsForMissingCommandFactory(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands)})
	defer adm.Commands().Reset()

	builder := (&PanelBuilder{}).
		WithRepository(NewMemoryRepository()).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}).
		FormFields(Field{Name: "title", Label: "Title", Type: "text"}).
		Actions(Action{Name: "refresh", CommandName: "items.refresh"})
	if _, err := adm.RegisterPanel("items", builder); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	err := adm.validatePanelActionWiring()
	if err == nil {
		t.Fatalf("expected wiring validation to fail")
	}
	if !panelActionWiringContainsReason(t, err, "command_factory_not_registered") {
		t.Fatalf("expected command_factory_not_registered issue, got %v", err)
	}

	if err := RegisterMessageFactory(adm.Commands(), "items.refresh", func(map[string]any, []string) (panelActionWiringMsg, error) {
		return panelActionWiringMsg{}, nil
	}); err != nil {
		t.Fatalf("register factory: %v", err)
	}
	if err := adm.validatePanelActionWiring(); err != nil {
		t.Fatalf("expected wiring validation after factory registration, got %v", err)
	}
}

func panelActionWiringContainsReason(t *testing.T, err error, reason string) bool {
	t.Helper()
	var typed *goerrors.Error
	if !goerrors.As(err, &typed) || typed == nil {
		t.Fatalf("expected typed domain error, got %T", err)
	}
	raw := typed.Metadata["issues"]
	switch issues := raw.(type) {
	case []map[string]any:
		for _, issue := range issues {
			if strings.EqualFold(strings.TrimSpace(toString(issue["reason"])), strings.TrimSpace(reason)) {
				return true
			}
		}
	case []any:
		for _, issue := range issues {
			issueMap, _ := issue.(map[string]any)
			if strings.EqualFold(strings.TrimSpace(toString(issueMap["reason"])), strings.TrimSpace(reason)) {
				return true
			}
		}
	}
	return false
}
