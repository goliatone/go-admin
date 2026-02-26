package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestSeedWorkflowRuntimeFromConfigCreatesCanonicalWorkflowsAndBindings(t *testing.T) {
	runtime := admin.NewWorkflowRuntimeService(admin.NewInMemoryWorkflowDefinitionRepository(), admin.NewInMemoryWorkflowBindingRepository())
	cfg := WorkflowConfig{
		SchemaVersion: 1,
		Workflows: map[string]WorkflowDefinitionSpec{
			"editorial.default": {
				MachineVersion: "9",
				InitialState:   "draft",
				Transitions: []WorkflowTransitionSpec{
					{Name: "publish", From: "draft", To: "published"},
				},
			},
		},
		TraitDefaults: map[string]string{
			"editorial": "editorial.default",
		},
	}

	if err := SeedWorkflowRuntimeFromConfig(context.Background(), runtime, cfg); err != nil {
		t.Fatalf("seed runtime: %v", err)
	}

	workflows, total, err := runtime.ListWorkflows(context.Background(), admin.PersistedWorkflowListOptions{})
	if err != nil {
		t.Fatalf("list workflows: %v", err)
	}
	if total != 1 || len(workflows) != 1 {
		t.Fatalf("expected one workflow, got total=%d workflows=%+v", total, workflows)
	}
	if workflows[0].MachineVersion != "9" {
		t.Fatalf("expected machine version 9, got %q", workflows[0].MachineVersion)
	}

	bindings, totalBindings, err := runtime.ListBindings(context.Background(), admin.WorkflowBindingListOptions{})
	if err != nil {
		t.Fatalf("list bindings: %v", err)
	}
	if totalBindings != 1 || len(bindings) != 1 {
		t.Fatalf("expected one trait binding from trait defaults, got total=%d bindings=%+v", totalBindings, bindings)
	}
	if bindings[0].ScopeType != admin.WorkflowBindingScopeTrait || bindings[0].ScopeRef != "editorial" {
		t.Fatalf("expected trait/editorial binding, got %+v", bindings[0])
	}
}
