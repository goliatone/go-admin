package admin

import (
	"context"
	"testing"

	"github.com/goliatone/go-command/registry"
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

type commandCalledMsg struct{}

func (commandCalledMsg) Type() string { return "do.something" }

func (c *commandCalled) Execute(ctx context.Context, _ commandCalledMsg) error {
	c.called = true
	_ = ctx
	return nil
}

type payloadCommand struct {
	called  bool
	payload map[string]any
}

type payloadCommandMsg struct {
	Payload map[string]any
}

func (payloadCommandMsg) Type() string { return "do.payload" }

func (c *payloadCommand) Execute(ctx context.Context, msg payloadCommandMsg) error {
	c.called = true
	c.payload = msg.Payload
	_ = ctx
	return nil
}

func TestPanelActionDispatchesCommand(t *testing.T) {
	registry.WithTestRegistry(func() {
		reg := NewCommandBus(true)
		defer reg.Reset()
		cmd := &commandCalled{}
		if _, err := RegisterCommand(reg, cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if err := RegisterMessageFactory(reg, "do.something", func(payload map[string]any, ids []string) (commandCalledMsg, error) {
			return commandCalledMsg{}, nil
		}); err != nil {
			t.Fatalf("register factory: %v", err)
		}

		panel := &Panel{
			name: "actions",
			actions: []Action{
				{Name: "run", CommandName: "do.something"},
			},
			commandBus: reg,
		}
		ctx := AdminContext{Context: context.Background()}
		if err := panel.RunAction(ctx, "run", nil, nil); err != nil {
			t.Fatalf("action dispatch failed: %v", err)
		}
		if !cmd.called {
			t.Fatalf("command not executed")
		}
	})
}

func TestPanelBulkActionDispatchesCommand(t *testing.T) {
	registry.WithTestRegistry(func() {
		reg := NewCommandBus(true)
		defer reg.Reset()
		cmd := &commandCalled{}
		if _, err := RegisterCommand(reg, cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if err := RegisterMessageFactory(reg, "do.something", func(payload map[string]any, ids []string) (commandCalledMsg, error) {
			return commandCalledMsg{}, nil
		}); err != nil {
			t.Fatalf("register factory: %v", err)
		}

		panel := &Panel{
			name: "actions",
			bulkActions: []Action{
				{Name: "bulk_run", CommandName: "do.something"},
			},
			commandBus: reg,
		}
		ctx := AdminContext{Context: context.Background()}
		if err := panel.RunBulkAction(ctx, "bulk_run", nil, nil); err != nil {
			t.Fatalf("bulk action dispatch failed: %v", err)
		}
		if !cmd.called {
			t.Fatalf("command not executed for bulk")
		}
	})
}

func TestPanelActionDispatchesPayload(t *testing.T) {
	registry.WithTestRegistry(func() {
		reg := NewCommandBus(true)
		defer reg.Reset()
		cmd := &payloadCommand{}
		if _, err := RegisterCommand(reg, cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if err := RegisterMessageFactory(reg, "do.payload", func(payload map[string]any, ids []string) (payloadCommandMsg, error) {
			return payloadCommandMsg{Payload: payload}, nil
		}); err != nil {
			t.Fatalf("register factory: %v", err)
		}

		panel := &Panel{
			name: "actions",
			actions: []Action{
				{Name: "run", CommandName: "do.payload"},
			},
			commandBus: reg,
		}
		ctx := AdminContext{Context: context.Background()}
		payload := map[string]any{"note": "hello"}
		if err := panel.RunAction(ctx, "run", payload, nil); err != nil {
			t.Fatalf("action dispatch failed: %v", err)
		}
		if !cmd.called {
			t.Fatalf("command not executed")
		}
		if cmd.payload["note"] != "hello" {
			t.Fatalf("payload not forwarded")
		}
	})
}

func TestPanelBulkActionDispatchesPayload(t *testing.T) {
	registry.WithTestRegistry(func() {
		reg := NewCommandBus(true)
		defer reg.Reset()
		cmd := &payloadCommand{}
		if _, err := RegisterCommand(reg, cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if err := RegisterMessageFactory(reg, "do.payload", func(payload map[string]any, ids []string) (payloadCommandMsg, error) {
			return payloadCommandMsg{Payload: payload}, nil
		}); err != nil {
			t.Fatalf("register factory: %v", err)
		}

		panel := &Panel{
			name: "actions",
			bulkActions: []Action{
				{Name: "bulk_run", CommandName: "do.payload"},
			},
			commandBus: reg,
		}
		ctx := AdminContext{Context: context.Background()}
		payload := map[string]any{"ids": []string{"a", "b"}}
		if err := panel.RunBulkAction(ctx, "bulk_run", payload, nil); err != nil {
			t.Fatalf("bulk action dispatch failed: %v", err)
		}
		if !cmd.called {
			t.Fatalf("command not executed for bulk")
		}
		if _, ok := cmd.payload["ids"]; !ok {
			t.Fatalf("payload not forwarded")
		}
	})
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
	nameProps := props["name"].(map[string]any)
	if val, ok := nameProps["read_only"].(bool); !ok || val {
		t.Fatalf("expected read_only flag in snake_case, got %v", nameProps["read_only"])
	}
	if val, ok := nameProps["readOnly"].(bool); !ok || val {
		t.Fatalf("expected readOnly preserved for JSON Schema, got %v", nameProps["readOnly"])
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
