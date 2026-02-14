package admin

import (
	"context"
	"testing"
)

func TestWorkflowRuntimeServiceResolveBindingPrecedence(t *testing.T) {
	ctx := context.Background()
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())

	createWorkflow := func(id string) {
		_, err := runtime.CreateWorkflow(ctx, PersistedWorkflow{
			ID:     id,
			Name:   id,
			Status: WorkflowStatusActive,
			Definition: WorkflowDefinition{
				InitialState: "draft",
				Transitions: []WorkflowTransition{
					{Name: "publish", From: "draft", To: "published"},
				},
			},
		})
		if err != nil {
			t.Fatalf("create workflow %s: %v", id, err)
		}
	}
	createWorkflow("editorial.global")
	createWorkflow("editorial.trait")
	createWorkflow("editorial.news")

	_, _ = runtime.CreateBinding(ctx, WorkflowBinding{
		ScopeType:  WorkflowBindingScopeGlobal,
		WorkflowID: "editorial.global",
		Priority:   100,
		Status:     WorkflowBindingStatusActive,
	})
	_, _ = runtime.CreateBinding(ctx, WorkflowBinding{
		ScopeType:  WorkflowBindingScopeTrait,
		ScopeRef:   "editorial",
		WorkflowID: "editorial.trait",
		Priority:   20,
		Status:     WorkflowBindingStatusActive,
	})
	_, _ = runtime.CreateBinding(ctx, WorkflowBinding{
		ScopeType:  WorkflowBindingScopeContentType,
		ScopeRef:   "news",
		WorkflowID: "editorial.news",
		Priority:   10,
		Status:     WorkflowBindingStatusActive,
	})

	resolved, err := runtime.ResolveBinding(ctx, WorkflowBindingResolveInput{
		ContentType: "news",
		Traits:      []string{"editorial"},
	})
	if err != nil {
		t.Fatalf("resolve binding: %v", err)
	}
	if resolved.WorkflowID != "editorial.news" {
		t.Fatalf("expected content_type workflow, got %q", resolved.WorkflowID)
	}

	resolved, err = runtime.ResolveBinding(ctx, WorkflowBindingResolveInput{
		ContentType: "other",
		Traits:      []string{"editorial"},
	})
	if err != nil {
		t.Fatalf("resolve trait binding: %v", err)
	}
	if resolved.WorkflowID != "editorial.trait" {
		t.Fatalf("expected trait workflow, got %q", resolved.WorkflowID)
	}

	resolved, err = runtime.ResolveBinding(ctx, WorkflowBindingResolveInput{
		ContentType: "other",
	})
	if err != nil {
		t.Fatalf("resolve global binding: %v", err)
	}
	if resolved.WorkflowID != "editorial.global" {
		t.Fatalf("expected global workflow, got %q", resolved.WorkflowID)
	}
}

func TestWorkflowRuntimeServiceCreateBindingRejectsUnknownWorkflow(t *testing.T) {
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())

	_, err := runtime.CreateBinding(context.Background(), WorkflowBinding{
		ScopeType:  WorkflowBindingScopeTrait,
		ScopeRef:   "editorial",
		WorkflowID: "missing.workflow",
		Priority:   10,
		Status:     WorkflowBindingStatusActive,
	})
	if err == nil {
		t.Fatalf("expected validation error")
	}
	typed, ok := err.(WorkflowValidationErrors)
	if !ok {
		t.Fatalf("expected WorkflowValidationErrors, got %T", err)
	}
	if typed.Fields["workflow_id"] == "" {
		t.Fatalf("expected workflow_id validation error, got %+v", typed.Fields)
	}
}

func TestWorkflowRuntimeServiceRollbackRestoresPriorVersion(t *testing.T) {
	ctx := context.Background()
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())

	created, err := runtime.CreateWorkflow(ctx, PersistedWorkflow{
		ID:     "editorial.default",
		Name:   "Editorial Default",
		Status: WorkflowStatusDraft,
		Definition: WorkflowDefinition{
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "publish", From: "draft", To: "published"},
			},
		},
	})
	if err != nil {
		t.Fatalf("create workflow: %v", err)
	}

	created.Name = "Editorial Default v2"
	created.Status = WorkflowStatusActive
	updated, err := runtime.UpdateWorkflow(ctx, created, created.Version)
	if err != nil {
		t.Fatalf("update workflow: %v", err)
	}
	if updated.Version != 2 {
		t.Fatalf("expected version 2, got %d", updated.Version)
	}

	rolledBack, err := runtime.RollbackWorkflow(ctx, created.ID, 1, updated.Version)
	if err != nil {
		t.Fatalf("rollback workflow: %v", err)
	}
	if rolledBack.Name != "Editorial Default" {
		t.Fatalf("expected rollback to restore original name, got %q", rolledBack.Name)
	}
	if rolledBack.Version != 3 {
		t.Fatalf("expected rollback to create version 3, got %d", rolledBack.Version)
	}
}

func TestWorkflowRuntimeServiceBindWorkflowEngineSyncsActiveDefinitions(t *testing.T) {
	ctx := context.Background()
	runtime := NewWorkflowRuntimeService(NewInMemoryWorkflowDefinitionRepository(), NewInMemoryWorkflowBindingRepository())

	_, err := runtime.CreateWorkflow(ctx, PersistedWorkflow{
		ID:     "editorial.default",
		Name:   "Editorial Default",
		Status: WorkflowStatusActive,
		Definition: WorkflowDefinition{
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "publish", From: "draft", To: "published"},
			},
		},
	})
	if err != nil {
		t.Fatalf("create workflow: %v", err)
	}

	engine := NewSimpleWorkflowEngine()
	if err := runtime.BindWorkflowEngine(engine); err != nil {
		t.Fatalf("bind workflow engine: %v", err)
	}
	if !engine.HasWorkflow("editorial.default") {
		t.Fatalf("expected active workflow to be registered in engine")
	}
}
