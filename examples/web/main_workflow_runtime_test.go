package main

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
)

func TestSeedWorkflowRuntimeFromConfigSeedsDefinitionsAndBindingsIdempotently(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "workflow.yaml")
	if err := os.WriteFile(configPath, []byte(`
schema_version: 1
trait_defaults:
  editorial: editorial.default
workflows:
  editorial.default:
    initial_state: draft
    transitions:
      - name: publish
        from: draft
        to: published
`), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	runtime := coreadmin.NewWorkflowRuntimeService(
		coreadmin.NewInMemoryWorkflowDefinitionRepository(),
		coreadmin.NewInMemoryWorkflowBindingRepository(),
	)

	ctx := context.Background()
	if err := seedWorkflowRuntimeFromConfig(ctx, runtime, configPath); err != nil {
		t.Fatalf("seed runtime (first pass): %v", err)
	}
	if err := seedWorkflowRuntimeFromConfig(ctx, runtime, configPath); err != nil {
		t.Fatalf("seed runtime (second pass): %v", err)
	}

	workflows, total, err := runtime.ListWorkflows(ctx, coreadmin.PersistedWorkflowListOptions{})
	if err != nil {
		t.Fatalf("list workflows: %v", err)
	}
	if total != 1 || len(workflows) != 1 {
		t.Fatalf("expected one workflow, got total=%d workflows=%+v", total, workflows)
	}
	if workflows[0].ID != "editorial.default" || workflows[0].Status != coreadmin.WorkflowStatusActive {
		t.Fatalf("unexpected seeded workflow: %+v", workflows[0])
	}
	if workflows[0].Version != 1 {
		t.Fatalf("expected idempotent seed to keep version=1, got %d", workflows[0].Version)
	}

	bindings, bindingTotal, err := runtime.ListBindings(ctx, coreadmin.WorkflowBindingListOptions{
		Status: coreadmin.WorkflowBindingStatusActive,
	})
	if err != nil {
		t.Fatalf("list bindings: %v", err)
	}
	if bindingTotal != 1 || len(bindings) != 1 {
		t.Fatalf("expected one binding, got total=%d bindings=%+v", bindingTotal, bindings)
	}
	if bindings[0].ScopeType != coreadmin.WorkflowBindingScopeTrait || bindings[0].ScopeRef != "editorial" || bindings[0].WorkflowID != "editorial.default" {
		t.Fatalf("unexpected seeded binding: %+v", bindings[0])
	}
}
