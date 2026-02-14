package setup

import (
	"context"
	"fmt"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
)

func TestSetupPersistentWorkflowRuntimeAppliesMigrationsAndPersistsData(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", strings.ToLower(t.Name()))

	runtime, err := SetupPersistentWorkflowRuntime(ctx, dsn)
	if err != nil {
		t.Fatalf("setup persistent workflow runtime: %v", err)
	}

	created, err := runtime.CreateWorkflow(ctx, coreadmin.PersistedWorkflow{
		ID:     "editorial.default",
		Name:   "Editorial Default",
		Status: coreadmin.WorkflowStatusActive,
		Definition: coreadmin.WorkflowDefinition{
			EntityType:   "editorial.default",
			InitialState: "draft",
			Transitions: []coreadmin.WorkflowTransition{
				{Name: "publish", From: "draft", To: "published"},
			},
		},
	})
	if err != nil {
		t.Fatalf("create workflow: %v", err)
	}
	if created.Version != 1 {
		t.Fatalf("expected workflow version 1, got %d", created.Version)
	}

	if _, err := runtime.CreateBinding(ctx, coreadmin.WorkflowBinding{
		ScopeType:  coreadmin.WorkflowBindingScopeTrait,
		ScopeRef:   "editorial",
		WorkflowID: "editorial.default",
		Priority:   100,
		Status:     coreadmin.WorkflowBindingStatusActive,
	}); err != nil {
		t.Fatalf("create binding: %v", err)
	}

	// Simulate restart by creating a new runtime instance on the same DSN.
	reloaded, err := SetupPersistentWorkflowRuntime(ctx, dsn)
	if err != nil {
		t.Fatalf("setup reloaded persistent workflow runtime: %v", err)
	}
	workflows, total, err := reloaded.ListWorkflows(ctx, coreadmin.PersistedWorkflowListOptions{})
	if err != nil {
		t.Fatalf("list workflows: %v", err)
	}
	if total != 1 || len(workflows) != 1 || workflows[0].ID != "editorial.default" {
		t.Fatalf("expected reloaded workflow, got total=%d workflows=%+v", total, workflows)
	}
}
