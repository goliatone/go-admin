package admin

import (
	"context"
	"database/sql"
	"errors"
	"io/fs"
	"sort"
	"strings"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func setupWorkflowRuntimeBunDB(t *testing.T) *bun.DB {
	t.Helper()
	sqldb, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqldb.SetMaxOpenConns(1)
	sqldb.SetMaxIdleConns(1)

	db := bun.NewDB(sqldb, sqlitedialect.New())
	applyWorkflowRuntimeMigrations(t, db)
	return db
}

func applyWorkflowRuntimeMigrations(t *testing.T, db *bun.DB) {
	t.Helper()
	if db == nil {
		t.Fatalf("nil db")
	}
	migrations := GetWorkflowRuntimeMigrationsFS()
	paths := []string{}
	err := fs.WalkDir(migrations, ".", func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil || d.IsDir() {
			return walkErr
		}
		if strings.HasSuffix(strings.ToLower(path), ".up.sql") {
			paths = append(paths, path)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk migrations: %v", err)
	}
	sort.Strings(paths)
	for _, path := range paths {
		sqlBytes, readErr := fs.ReadFile(migrations, path)
		if readErr != nil {
			t.Fatalf("read migration %s: %v", path, readErr)
		}
		if _, execErr := db.ExecContext(context.Background(), string(sqlBytes)); execErr != nil {
			t.Fatalf("apply migration %s: %v", path, execErr)
		}
	}
}

func TestBunWorkflowDefinitionRepositoryCreateUpdateAndVersionLookup(t *testing.T) {
	db := setupWorkflowRuntimeBunDB(t)
	defer db.Close()
	ctx := context.Background()

	workflows := NewBunWorkflowDefinitionRepository(db)
	created, err := workflows.Create(ctx, PersistedWorkflow{
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
	updated, err := workflows.Update(ctx, created, created.Version)
	if err != nil {
		t.Fatalf("update workflow: %v", err)
	}
	if updated.Version != 2 {
		t.Fatalf("expected version 2, got %d", updated.Version)
	}

	// Ensure snapshots are actually persisted, not in-memory only.
	workflows = NewBunWorkflowDefinitionRepository(db)
	v1, err := workflows.GetVersion(ctx, created.ID, 1)
	if err != nil {
		t.Fatalf("get version 1: %v", err)
	}
	if v1.Status != WorkflowStatusDraft {
		t.Fatalf("expected version 1 status draft, got %q", v1.Status)
	}
}

func TestBunWorkflowBindingRepositoryCreateEnforcesActiveUniqueness(t *testing.T) {
	db := setupWorkflowRuntimeBunDB(t)
	defer db.Close()
	ctx := context.Background()

	workflows := NewBunWorkflowDefinitionRepository(db)
	_, err := workflows.Create(ctx, PersistedWorkflow{
		ID:     "editorial.default",
		Name:   "Editorial Default",
		Status: WorkflowStatusActive,
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

	bindings := NewBunWorkflowBindingRepository(db)
	first, err := bindings.Create(ctx, WorkflowBinding{
		ScopeType:  WorkflowBindingScopeTrait,
		ScopeRef:   "editorial",
		WorkflowID: "editorial.default",
		Priority:   10,
		Status:     WorkflowBindingStatusActive,
	})
	if err != nil {
		t.Fatalf("create first binding: %v", err)
	}

	_, err = bindings.Create(ctx, WorkflowBinding{
		ScopeType:  WorkflowBindingScopeTrait,
		ScopeRef:   "editorial",
		WorkflowID: "editorial.default",
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
