package admin

import (
	"context"
	"errors"
	"testing"
)

func TestInMemoryWorkflowDefinitionRepositoryCreateUpdateAndVersionLookup(t *testing.T) {
	repo := NewInMemoryWorkflowDefinitionRepository()
	ctx := context.Background()

	created, err := repo.Create(ctx, PersistedWorkflow{
		ID:     "editorial.default",
		Name:   "Editorial Default",
		Status: WorkflowStatusDraft,
		Definition: WorkflowDefinition{
			EntityType:   "editorial.default",
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "publish", From: "draft", To: "published"},
			},
		},
	})
	if err != nil {
		t.Fatalf("create workflow: %v", err)
	}
	if created.Version != 1 {
		t.Fatalf("expected version 1, got %d", created.Version)
	}

	created.Status = WorkflowStatusActive
	updated, err := repo.Update(ctx, created, created.Version)
	if err != nil {
		t.Fatalf("update workflow: %v", err)
	}
	if updated.Version != 2 {
		t.Fatalf("expected version 2, got %d", updated.Version)
	}

	v1, err := repo.GetVersion(ctx, created.ID, 1)
	if err != nil {
		t.Fatalf("get version 1: %v", err)
	}
	if v1.Status != WorkflowStatusDraft {
		t.Fatalf("expected version 1 status draft, got %q", v1.Status)
	}
}

func TestInMemoryWorkflowDefinitionRepositoryVersionConflict(t *testing.T) {
	repo := NewInMemoryWorkflowDefinitionRepository()
	ctx := context.Background()

	created, err := repo.Create(ctx, PersistedWorkflow{
		ID:     "editorial.default",
		Name:   "Editorial Default",
		Status: WorkflowStatusDraft,
		Definition: WorkflowDefinition{
			EntityType:   "editorial.default",
			InitialState: "draft",
			Transitions: []WorkflowTransition{
				{Name: "publish", From: "draft", To: "published"},
			},
		},
	})
	if err != nil {
		t.Fatalf("create workflow: %v", err)
	}

	created.Name = "Updated once"
	updated, err := repo.Update(ctx, created, created.Version)
	if err != nil {
		t.Fatalf("update workflow: %v", err)
	}

	created.Name = "Updated"
	_, err = repo.Update(ctx, created, created.Version)
	if err == nil {
		t.Fatalf("expected version conflict")
	}
	if !errors.Is(err, ErrWorkflowVersionConflict) {
		t.Fatalf("expected ErrWorkflowVersionConflict, got %v", err)
	}
	if updated.Version != 2 {
		t.Fatalf("expected intermediate version 2, got %d", updated.Version)
	}
}

func TestInMemoryWorkflowBindingRepositoryCreateEnforcesActiveUniqueness(t *testing.T) {
	repo := NewInMemoryWorkflowBindingRepository()
	ctx := context.Background()

	first, err := repo.Create(ctx, WorkflowBinding{
		ScopeType:  WorkflowBindingScopeTrait,
		ScopeRef:   "editorial",
		WorkflowID: "editorial.default",
		Priority:   10,
		Status:     WorkflowBindingStatusActive,
	})
	if err != nil {
		t.Fatalf("create first binding: %v", err)
	}

	_, err = repo.Create(ctx, WorkflowBinding{
		ScopeType:  WorkflowBindingScopeTrait,
		ScopeRef:   "editorial",
		WorkflowID: "editorial.news",
		Priority:   10,
		Status:     WorkflowBindingStatusActive,
	})
	if err == nil {
		t.Fatalf("expected conflict")
	}
	if !errors.Is(err, ErrWorkflowBindingConflict) {
		t.Fatalf("expected ErrWorkflowBindingConflict, got %v", err)
	}

	var conflict WorkflowBindingConflictError
	if !errors.As(err, &conflict) {
		t.Fatalf("expected WorkflowBindingConflictError, got %T", err)
	}
	if conflict.ExistingBindingID != first.ID {
		t.Fatalf("expected existing id %q, got %q", first.ID, conflict.ExistingBindingID)
	}
}

func TestInMemoryWorkflowBindingRepositoryListByScope(t *testing.T) {
	repo := NewInMemoryWorkflowBindingRepository()
	ctx := context.Background()

	_, _ = repo.Create(ctx, WorkflowBinding{
		ScopeType:   WorkflowBindingScopeTrait,
		ScopeRef:    "editorial",
		WorkflowID:  "editorial.default",
		Priority:    50,
		Status:      WorkflowBindingStatusActive,
		Environment: "",
	})
	_, _ = repo.Create(ctx, WorkflowBinding{
		ScopeType:   WorkflowBindingScopeTrait,
		ScopeRef:    "editorial",
		WorkflowID:  "editorial.news",
		Priority:    10,
		Status:      WorkflowBindingStatusActive,
		Environment: "production",
	})

	bindings, err := repo.ListByScope(ctx, WorkflowBindingScopeTrait, "editorial", WorkflowBindingStatusActive)
	if err != nil {
		t.Fatalf("list by scope: %v", err)
	}
	if len(bindings) != 2 {
		t.Fatalf("expected 2 bindings, got %d", len(bindings))
	}
	if bindings[0].WorkflowID != "editorial.news" {
		t.Fatalf("expected environment-specific lower-priority binding first, got %+v", bindings[0])
	}
}
