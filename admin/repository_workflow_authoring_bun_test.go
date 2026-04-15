package admin

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-command/flow"
)

func TestBunWorkflowAuthoringStoreSaveLoadAndVersionHistory(t *testing.T) {
	db := setupWorkflowRuntimeBunDB(t)
	defer mustClose(t, "db", db)
	ctx := context.Background()

	store := NewBunWorkflowAuthoringStore(db)
	first, err := store.Save(ctx, &flow.AuthoringMachineRecord{
		MachineID: "editorial.default",
		Name:      "Editorial",
		Version:   "1",
		Draft: flow.DraftMachineDocument{
			Definition: &flow.MachineDefinition{
				ID:      "editorial.default",
				Name:    "Editorial",
				Version: "1",
				States: []flow.StateDefinition{
					{Name: "draft", Initial: true},
					{Name: "published"},
				},
				Transitions: []flow.TransitionDefinition{
					{ID: "publish", Event: "publish", From: "draft", To: "published"},
				},
			},
			DraftState: flow.DraftState{IsDraft: true, LastSavedAt: time.Now().UTC()},
		},
	}, "")
	if err != nil {
		t.Fatalf("save first: %v", err)
	}
	if first == nil || first.Version != "1" {
		t.Fatalf("expected version 1 save, got %+v", first)
	}

	secondDraft := *first
	secondDraft.Version = "2"
	secondDraft.Draft.DraftState.IsDraft = false
	secondDraft.PublishedAt = ptrTime(time.Now().UTC())
	secondDraft.PublishedDefinition = secondDraft.Draft.Definition
	second, err := store.Save(ctx, &secondDraft, first.Version)
	if err != nil {
		t.Fatalf("save second: %v", err)
	}
	if second == nil || second.Version != "2" {
		t.Fatalf("expected version 2 save, got %+v", second)
	}

	loaded, err := store.Load(ctx, "editorial.default")
	if err != nil {
		t.Fatalf("load machine: %v", err)
	}
	if loaded == nil || loaded.Version != "2" {
		t.Fatalf("expected latest version 2, got %+v", loaded)
	}

	versions, hasMore, err := store.ListVersions(ctx, "editorial.default", 10, 0)
	if err != nil {
		t.Fatalf("list versions: %v", err)
	}
	if hasMore {
		t.Fatalf("expected no more pages for 2 versions")
	}
	if len(versions) < 2 {
		t.Fatalf("expected 2 versions, got %+v", versions)
	}

	v1, err := store.LoadVersion(ctx, "editorial.default", "1")
	if err != nil {
		t.Fatalf("load version 1: %v", err)
	}
	if v1 == nil || v1.Version != "1" {
		t.Fatalf("expected version 1 record, got %+v", v1)
	}
}

func TestEnsureWorkflowAuthoringCutoverMigratesLegacyRowsAndWritesMarker(t *testing.T) {
	db := setupWorkflowRuntimeBunDB(t)
	defer mustClose(t, "db", db)
	ctx := context.Background()

	workflows := NewBunWorkflowDefinitionRepository(db)
	created, err := workflows.Create(ctx, PersistedWorkflow{
		ID:     "editorial.default",
		Name:   "Editorial",
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
		t.Fatalf("seed workflow: %v", err)
	}
	created.Status = WorkflowStatusActive
	if _, updateErr := workflows.Update(ctx, created, created.Version); updateErr != nil {
		t.Fatalf("publish workflow: %v", updateErr)
	}

	bindings := NewBunWorkflowBindingRepository(db)
	if _, createErr := bindings.Create(ctx, WorkflowBinding{
		ScopeType:  WorkflowBindingScopeTrait,
		ScopeRef:   "editorial",
		WorkflowID: "editorial.default",
		Priority:   100,
		Status:     WorkflowBindingStatusActive,
	}); createErr != nil {
		t.Fatalf("seed binding: %v", createErr)
	}

	if cutoverErr := EnsureWorkflowAuthoringCutover(ctx, db); cutoverErr != nil {
		t.Fatalf("run cutover: %v", cutoverErr)
	}

	markerExists, err := workflowCutoverMarkerExists(ctx, db)
	if err != nil {
		t.Fatalf("marker exists: %v", err)
	}
	if !markerExists {
		t.Fatalf("expected cutover marker row")
	}

	store := NewBunWorkflowAuthoringStore(db)
	loaded, err := store.Load(ctx, "editorial.default")
	if err != nil {
		t.Fatalf("load migrated authoring machine: %v", err)
	}
	if loaded == nil {
		t.Fatalf("expected migrated authoring machine")
	}
	if loaded.PublishedDefinition == nil {
		t.Fatalf("expected migrated published definition")
	}
	versions, _, err := store.ListVersions(ctx, "editorial.default", 20, 0)
	if err != nil {
		t.Fatalf("list migrated versions: %v", err)
	}
	if len(versions) < 2 {
		t.Fatalf("expected migrated version history, got %+v", versions)
	}
}

func ptrTime(value time.Time) *time.Time {
	out := value.UTC()
	return &out
}
