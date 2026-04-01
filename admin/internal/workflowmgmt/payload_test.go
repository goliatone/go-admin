package workflowmgmt

import (
	"testing"

	workflowcore "github.com/goliatone/go-admin/admin/internal/workflowcore"
	router "github.com/goliatone/go-router"
)

func testAtoiDefault(input string, fallback int) int {
	switch input {
	case "1":
		return 1
	case "2":
		return 2
	case "5":
		return 5
	case "9":
		return 9
	default:
		return fallback
	}
}

func testToString(input any) string {
	if s, ok := input.(string); ok {
		return s
	}
	return ""
}

func TestPersistedWorkflowFromPayloadSupportsCamelAndSnakeCase(t *testing.T) {
	workflow := PersistedWorkflowFromPayload("", map[string]any{
		"id":              "editorial.default",
		"machineId":       "editorial.machine",
		"machine_version": "9",
		"name":            "Editorial Default",
		"status":          "active",
		"env":             "preview",
		"version":         "2",
		"definition": map[string]any{
			"initialState":   "draft",
			"machineVersion": "7",
			"transitions": []any{
				map[string]any{
					"name":        "publish",
					"from":        "draft",
					"to":          "published",
					"dynamicTo":   "resolved",
					"guard_ref":   "can_publish",
					"description": "Publish",
					"metadata": map[string]any{
						"channel": "editorial",
					},
				},
			},
		},
	}, testAtoiDefault, testToString)

	if workflow.MachineID != "editorial.machine" || workflow.MachineVersion != "9" {
		t.Fatalf("expected machine aliases to be parsed, got %+v", workflow)
	}
	if workflow.Environment != "preview" || workflow.Version != 2 {
		t.Fatalf("expected env/version parsing, got %+v", workflow)
	}
	if workflow.Definition.InitialState != "draft" || workflow.Definition.MachineVersion != "7" {
		t.Fatalf("expected definition aliases to be parsed, got %+v", workflow.Definition)
	}
	if len(workflow.Definition.Transitions) != 1 || workflow.Definition.Transitions[0].Guard != "can_publish" {
		t.Fatalf("expected transition parsing, got %+v", workflow.Definition.Transitions)
	}
}

func TestWorkflowBindingFromPayloadAndVersionHelpers(t *testing.T) {
	body := map[string]any{
		"id":                  "binding-1",
		"scopeType":           "trait",
		"scope_ref":           "editorial",
		"workflowId":          "editorial.default",
		"priority":            "5",
		"status":              "active",
		"environment":         "preview",
		"expectedVersion":     "9",
		"rollback_to_version": "1",
	}
	binding := WorkflowBindingFromPayload("", body, testAtoiDefault, testToString)
	if binding.ScopeType != workflowcore.WorkflowBindingScopeTrait || binding.ScopeRef != "editorial" {
		t.Fatalf("expected scope aliases to be parsed, got %+v", binding)
	}
	if binding.Priority != 5 || binding.WorkflowID != "editorial.default" {
		t.Fatalf("expected binding fields parsed, got %+v", binding)
	}
	if got := ExpectedVersionFromPayload(body, testAtoiDefault, testToString); got != 9 {
		t.Fatalf("expected expected version 9, got %d", got)
	}
	if got := RollbackVersionFromPayload(body, testAtoiDefault, testToString); got != 1 {
		t.Fatalf("expected rollback version 1, got %d", got)
	}
}

func TestListOptionsFromContextNormalizeFilters(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["status"] = "ACTIVE"
	ctx.QueriesM["environment"] = "preview"
	ctx.QueriesM["scope_type"] = "TRAIT"
	ctx.QueriesM["scope_ref"] = "editorial"

	workflowOpts := WorkflowListOptionsFromContext(ctx)
	if workflowOpts.Status != workflowcore.WorkflowStatusActive || workflowOpts.Environment != "preview" {
		t.Fatalf("expected workflow list filters normalized, got %+v", workflowOpts)
	}

	bindingOpts := WorkflowBindingListOptionsFromContext(ctx)
	if bindingOpts.ScopeType != workflowcore.WorkflowBindingScopeTrait || bindingOpts.ScopeRef != "editorial" {
		t.Fatalf("expected binding list filters normalized, got %+v", bindingOpts)
	}
}
