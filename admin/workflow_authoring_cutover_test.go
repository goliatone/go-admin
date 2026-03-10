package admin

import (
	"context"
	"database/sql"
	"strings"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func TestAdminNewFailsWhenWorkflowAuthoringCutoverSchemaMissing(t *testing.T) {
	sqldb, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = sqldb.Close() })
	db := bun.NewDB(sqldb, sqlitedialect.New())
	t.Cleanup(func() { _ = db.Close() })

	runtime := NewWorkflowRuntimeService(NewBunWorkflowDefinitionRepository(db), NewBunWorkflowBindingRepository(db))
	_, err = New(Config{}, Dependencies{
		WorkflowRuntime: runtime,
	})
	if err == nil {
		t.Fatalf("expected startup failure when authoring cutover schema is missing")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "cutover schema missing") {
		t.Fatalf("expected cutover schema error, got %v", err)
	}
}

func TestAdminNewSucceedsWhenWorkflowAuthoringCutoverSchemaReady(t *testing.T) {
	db := setupWorkflowRuntimeBunDB(t)
	defer db.Close()
	runtime := NewWorkflowRuntimeService(NewBunWorkflowDefinitionRepository(db), NewBunWorkflowBindingRepository(db))

	if _, err := New(Config{}, Dependencies{
		WorkflowRuntime: runtime,
	}); err != nil {
		t.Fatalf("expected startup success with workflow authoring schema ready, got %v", err)
	}

	done, err := workflowCutoverMarkerExists(context.Background(), db)
	if err != nil {
		t.Fatalf("check cutover marker: %v", err)
	}
	if !done {
		t.Fatalf("expected cutover marker written during startup")
	}
}
