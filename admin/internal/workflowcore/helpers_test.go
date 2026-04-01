package workflowcore

import (
	"errors"
	"testing"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
)

func TestNormalizePersistedWorkflowCanonicalizesMachineFieldsAndTransitions(t *testing.T) {
	normalized := NormalizePersistedWorkflow(PersistedWorkflow{
		ID:          " editorial.default ",
		Name:        " Editorial ",
		Status:      PersistedWorkflowStatus(" ACTIVE "),
		Environment: " Production ",
		Version:     2,
		Definition: WorkflowDefinition{
			EntityType:     "",
			MachineVersion: "",
			InitialState:   " draft ",
			Transitions: []cmsboot.WorkflowTransition{
				{Name: " publish ", Description: " Publish ", From: " draft ", To: " published ", Guard: " guard ", DynamicTo: " dynamic "},
			},
		},
	})

	if normalized.MachineID != "editorial.default" {
		t.Fatalf("expected canonical machine id from workflow id, got %q", normalized.MachineID)
	}
	if normalized.MachineVersion != "2" {
		t.Fatalf("expected version-derived machine version, got %q", normalized.MachineVersion)
	}
	if normalized.Status != WorkflowStatusActive {
		t.Fatalf("expected normalized status active, got %q", normalized.Status)
	}
	if normalized.Environment != "production" {
		t.Fatalf("expected normalized environment, got %q", normalized.Environment)
	}
	transition := normalized.Definition.Transitions[0]
	if transition.Name != "publish" || transition.From != "draft" || transition.To != "published" || transition.Guard != "guard" || transition.DynamicTo != "dynamic" {
		t.Fatalf("expected normalized transition fields, got %+v", transition)
	}
}

func TestWorkflowBindingHelpersSortAndFilterByEnvironment(t *testing.T) {
	bindings := []WorkflowBinding{
		{ID: "global", ScopeType: WorkflowBindingScopeGlobal, ScopeRef: "global", WorkflowID: "wf-global", Priority: 100, Status: WorkflowBindingStatusActive},
		{ID: "trait-generic", ScopeType: WorkflowBindingScopeTrait, ScopeRef: "editorial", WorkflowID: "wf-trait", Priority: 50, Status: WorkflowBindingStatusActive},
		{ID: "trait-prod", ScopeType: WorkflowBindingScopeTrait, ScopeRef: "editorial", WorkflowID: "wf-trait-prod", Priority: 10, Status: WorkflowBindingStatusActive, Environment: "production"},
	}

	candidates := BindingCandidates(bindings, WorkflowBindingScopeTrait, "editorial", "production")
	if len(candidates) != 2 {
		t.Fatalf("expected 2 candidates, got %d", len(candidates))
	}
	SortWorkflowBindingsForResolution(candidates)
	if candidates[0].ID != "trait-prod" {
		t.Fatalf("expected environment-specific binding first, got %+v", candidates)
	}
	if !BindingMatchesEnvironment(candidates[0], "production") {
		t.Fatalf("expected environment-specific binding to match requested environment")
	}
	if BindingMatchesEnvironment(candidates[0], "") {
		t.Fatalf("expected environment-specific binding not to match blank environment")
	}
}

func TestCanonicalMachineHelpersPreferExplicitFields(t *testing.T) {
	workflow := PersistedWorkflow{
		ID:             "wf-1",
		MachineID:      "machine.explicit",
		MachineVersion: "9",
		Definition: WorkflowDefinition{
			EntityType:     "definition.entity",
			MachineVersion: "4",
		},
		Version: 2,
	}
	if got := CanonicalMachineIDForWorkflow(workflow); got != "machine.explicit" {
		t.Fatalf("expected explicit machine id, got %q", got)
	}
	if got := CanonicalMachineVersionForWorkflow(workflow); got != "9" {
		t.Fatalf("expected explicit machine version, got %q", got)
	}
}

func TestWorkflowConflictErrorsUnwrapToSentinels(t *testing.T) {
	if !errors.Is(WorkflowVersionConflictError{}, ErrWorkflowVersionConflict) {
		t.Fatalf("expected workflow version conflict error to unwrap to sentinel")
	}
	if !errors.Is(WorkflowBindingConflictError{}, ErrWorkflowBindingConflict) {
		t.Fatalf("expected workflow binding conflict error to unwrap to sentinel")
	}
	if !errors.Is(WorkflowBindingVersionConflictError{}, ErrWorkflowBindingVersionConflict) {
		t.Fatalf("expected workflow binding version conflict error to unwrap to sentinel")
	}
}
