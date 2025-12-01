package admin

import (
	"context"
	"testing"
)

type allowAll struct{}

func (allowAll) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return true
}

func TestPanelListCreateUpdateDelete(t *testing.T) {
	repo := NewMemoryRepository()
	panel := &Panel{
		name:        "items",
		repo:        repo,
		authorizer:  allowAll{},
		permissions: PanelPermissions{View: "items.view", Create: "items.create", Edit: "items.edit", Delete: "items.delete"},
	}
	ctx := AdminContext{Context: context.Background()}

	created, err := panel.Create(ctx, map[string]any{"name": "A"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if created["id"] == "" {
		t.Fatalf("expected id assigned")
	}

	list, total, err := panel.List(ctx, ListOptions{Page: 1, PerPage: 10})
	if err != nil || total != 1 || len(list) != 1 {
		t.Fatalf("list unexpected: err=%v total=%d len=%d", err, total, len(list))
	}

	updated, err := panel.Update(ctx, created["id"].(string), map[string]any{"name": "B"})
	if err != nil || updated["name"] != "B" {
		t.Fatalf("update failed: %v", err)
	}

	if err := panel.Delete(ctx, created["id"].(string)); err != nil {
		t.Fatalf("delete: %v", err)
	}
}

func TestPanelHooksOrder(t *testing.T) {
	repo := NewMemoryRepository()
	order := []string{}
	panel := &Panel{
		name:       "hooks",
		repo:       repo,
		authorizer: allowAll{},
		hooks: PanelHooks{
			BeforeCreate: func(_ AdminContext, record map[string]any) error {
				order = append(order, "before_create")
				record["name"] = "hooked"
				return nil
			},
			AfterCreate: func(_ AdminContext, record map[string]any) error {
				order = append(order, "after_create")
				if record["name"] != "hooked" {
					t.Fatalf("record not mutated by before hook")
				}
				return nil
			},
		},
	}
	ctx := AdminContext{Context: context.Background()}
	if _, err := panel.Create(ctx, map[string]any{"name": "x"}); err != nil {
		t.Fatalf("create: %v", err)
	}
	if len(order) != 2 || order[0] != "before_create" || order[1] != "after_create" {
		t.Fatalf("unexpected hook order: %v", order)
	}
}

type denyAll struct{}

func (denyAll) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return false
}

func TestPanelPermissionDenied(t *testing.T) {
	repo := NewMemoryRepository()
	panel := &Panel{
		name:        "secure",
		repo:        repo,
		authorizer:  denyAll{},
		permissions: PanelPermissions{Create: "secure.create"},
	}
	ctx := AdminContext{Context: context.Background()}
	if _, err := panel.Create(ctx, map[string]any{"name": "x"}); err == nil {
		t.Fatalf("expected forbidden error")
	}
}

type commandCalled struct {
	called bool
}

func (c *commandCalled) Name() string { return "do.something" }
func (c *commandCalled) Execute(ctx context.Context) error {
	c.called = true
	_ = ctx
	return nil
}

func TestPanelActionDispatchesCommand(t *testing.T) {
	reg := NewCommandRegistry(true)
	cmd := &commandCalled{}
	reg.Register(cmd)

	panel := &Panel{
		name: "actions",
		actions: []Action{
			{Name: "run", CommandName: "do.something"},
		},
		commandBus: reg,
	}
	ctx := AdminContext{Context: context.Background()}
	if err := panel.RunAction(ctx, "run"); err != nil {
		t.Fatalf("action dispatch failed: %v", err)
	}
	if !cmd.called {
		t.Fatalf("command not executed")
	}
}

func TestPanelBulkActionDispatchesCommand(t *testing.T) {
	reg := NewCommandRegistry(true)
	cmd := &commandCalled{}
	reg.Register(cmd)

	panel := &Panel{
		name: "actions",
		bulkActions: []Action{
			{Name: "bulk_run", CommandName: "do.something"},
		},
		commandBus: reg,
	}
	ctx := AdminContext{Context: context.Background()}
	if err := panel.RunBulkAction(ctx, "bulk_run"); err != nil {
		t.Fatalf("bulk action dispatch failed: %v", err)
	}
	if !cmd.called {
		t.Fatalf("command not executed for bulk")
	}
}

func TestPanelSchemaIncludesFormSchema(t *testing.T) {
	panel := &Panel{
		name: "schema",
		formFields: []Field{
			{Name: "name", Label: "Name", Type: "text", Required: true, Validation: "min:1"},
			{Name: "count", Label: "Count", Type: "number"},
		},
		filters:     []Filter{{Name: "status", Type: "select"}},
		actions:     []Action{{Name: "approve", CommandName: "approve"}},
		bulkActions: []Action{{Name: "bulk_delete", CommandName: "delete"}},
		useBlocks:   true,
		useSEO:      true,
		treeView:    true,
		permissions: PanelPermissions{
			View: "view",
		},
	}

	schema := panel.Schema()
	if schema.FormSchema == nil {
		t.Fatalf("expected form schema")
	}
	props := schema.FormSchema["properties"].(map[string]any)
	if _, ok := props["name"]; !ok {
		t.Fatalf("expected name property in form schema")
	}
	req := schema.FormSchema["required"].([]string)
	if len(req) != 1 || req[0] != "name" {
		t.Fatalf("expected name to be required, got %v", req)
	}
	if !schema.UseBlocks || !schema.UseSEO || !schema.TreeView {
		t.Fatalf("expected flags set")
	}
	if len(schema.Filters) != 1 || len(schema.Actions) != 1 || len(schema.BulkActions) != 1 {
		t.Fatalf("expected filters/actions populated")
	}
}
