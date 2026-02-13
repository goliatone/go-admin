package admin

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
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

type panelSubresourceResponderRepo struct {
	Repository
	calls int
	last  struct {
		id          string
		subresource string
		value       string
	}
}

func (r *panelSubresourceResponderRepo) ServePanelSubresource(_ AdminContext, _ router.Context, id, subresource, value string) error {
	r.calls++
	r.last.id = id
	r.last.subresource = subresource
	r.last.value = value
	return nil
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
	if len(schema.Filters) != 1 || len(schema.BulkActions) != 1 {
		t.Fatalf("expected filters/bulk actions populated")
	}
	if !containsActionName(schema.Actions, "approve") || !containsActionName(schema.Actions, "view") || !containsActionName(schema.Actions, "edit") {
		t.Fatalf("expected approve/view/edit actions in schema, got %+v", schema.Actions)
	}
}

func TestPanelSchemaIncludesActionPayloadContracts(t *testing.T) {
	panel := &Panel{
		name: "schema",
		actions: []Action{
			{
				Name:            "publish",
				CommandName:     "publish.command",
				PayloadRequired: []string{"publish_at"},
				PayloadSchema: map[string]any{
					"type": "object",
				},
			},
		},
		bulkActions: []Action{
			{
				Name:            "bulk_publish",
				CommandName:     "bulk.publish.command",
				PayloadRequired: []string{"ids"},
			},
		},
	}

	schema := panel.Schema()
	publish, ok := findPanelSchemaActionByName(schema.Actions, "publish")
	if !ok {
		t.Fatalf("expected publish action in schema, got %+v", schema.Actions)
	}
	if len(publish.PayloadRequired) != 1 || publish.PayloadRequired[0] != "publish_at" {
		t.Fatalf("expected payload_required to be preserved, got %v", publish.PayloadRequired)
	}
	if publish.PayloadSchema == nil || publish.PayloadSchema["type"] != "object" {
		t.Fatalf("expected payload_schema to be preserved, got %v", publish.PayloadSchema)
	}
	if len(schema.BulkActions) != 1 || len(schema.BulkActions[0].PayloadRequired) != 1 {
		t.Fatalf("expected bulk action payload contract to be preserved")
	}
	if !containsActionName(schema.Actions, "view") || !containsActionName(schema.Actions, "edit") {
		t.Fatalf("expected default view/edit actions to be included, got %+v", schema.Actions)
	}
}

func TestPanelBuilderBuildRequiresCreateUIContractForCanonicalRoute(t *testing.T) {
	_, err := (&PanelBuilder{}).
		WithRepository(NewMemoryRepository()).
		Permissions(PanelPermissions{Create: "items.create"}).
		Build()
	if err == nil {
		t.Fatalf("expected create-ui contract validation error")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "form fields") {
		t.Fatalf("expected form field validation error message, got %v", err)
	}
}

func TestPanelBuilderBuildAllowsCreatePermissionWithoutFormWhenCustomRoute(t *testing.T) {
	panel, err := (&PanelBuilder{}).
		WithRepository(NewMemoryRepository()).
		Permissions(PanelPermissions{Create: "items.create"}).
		WithUIRouteMode(PanelUIRouteModeCustom).
		Build()
	if err != nil {
		t.Fatalf("expected custom-route panel to skip create-ui contract, got %v", err)
	}
	if panel == nil {
		t.Fatalf("expected panel")
	}
}

func TestPanelBuilderBuildAllowsCreatePermissionWhenFormSchemaHasProperties(t *testing.T) {
	panel, err := (&PanelBuilder{}).
		WithRepository(NewMemoryRepository()).
		Permissions(PanelPermissions{Create: "items.create"}).
		FormSchema(map[string]any{
			"type": "object",
			"properties": map[string]any{
				"name": map[string]any{"type": "string"},
			},
		}).
		Build()
	if err != nil {
		t.Fatalf("expected form-schema contract to satisfy create-ui contract, got %v", err)
	}
	if panel == nil {
		t.Fatalf("expected panel")
	}
}

func TestPanelSchemaSynthesizesPayloadSchemaFromRequiredFields(t *testing.T) {
	panel := &Panel{
		name: "schema",
		actions: []Action{
			{
				Name:            "send",
				CommandName:     "send.command",
				PayloadRequired: []string{"idempotency_key", "reason"},
			},
		},
	}

	schema := panel.Schema()
	send, ok := findPanelSchemaActionByName(schema.Actions, "send")
	if !ok {
		t.Fatalf("expected send action in schema, got %+v", schema.Actions)
	}
	if send.PayloadSchema == nil {
		t.Fatalf("expected synthesized payload schema")
	}
	if got := toString(send.PayloadSchema["type"]); got != "object" {
		t.Fatalf("expected payload schema type object, got %q", got)
	}
	required, ok := send.PayloadSchema["required"].([]string)
	if !ok {
		t.Fatalf("expected []string required fields, got %T", send.PayloadSchema["required"])
	}
	if len(required) != 2 {
		t.Fatalf("expected 2 required fields, got %v", required)
	}
	props, ok := send.PayloadSchema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("expected payload schema properties map, got %T", send.PayloadSchema["properties"])
	}
	if _, ok := props["idempotency_key"]; !ok {
		t.Fatalf("expected idempotency_key property, got %+v", props)
	}
	if _, ok := props["reason"]; !ok {
		t.Fatalf("expected reason property, got %+v", props)
	}
}

func TestPanelSchemaSetsActionScopes(t *testing.T) {
	panel := &Panel{
		name: "schema",
		actions: []Action{
			{Name: "publish", CommandName: "publish.command"},
		},
		bulkActions: []Action{
			{Name: "bulk_publish", CommandName: "bulk.publish.command"},
		},
	}

	schema := panel.Schema()
	publish, ok := findPanelSchemaActionByName(schema.Actions, "publish")
	if !ok {
		t.Fatalf("expected publish action in schema, got %+v", schema.Actions)
	}
	if publish.Scope != ActionScopeRow {
		t.Fatalf("expected publish scope row, got %q", publish.Scope)
	}
	if len(schema.BulkActions) != 1 {
		t.Fatalf("expected 1 bulk action, got %d", len(schema.BulkActions))
	}
	if schema.BulkActions[0].Scope != ActionScopeBulk {
		t.Fatalf("expected bulk action scope bulk, got %q", schema.BulkActions[0].Scope)
	}
}

func TestPanelSchemaIncludesSubresources(t *testing.T) {
	panel := &Panel{
		name: "agreements",
		subresources: []PanelSubresource{
			{Name: "artifact", Method: "get", Permission: "agreements.download"},
			{Name: "artifact", Method: "post"},
			{Name: "  "},
		},
	}

	schema := panel.Schema()
	if len(schema.Subresources) != 1 {
		t.Fatalf("expected 1 normalized subresource, got %d", len(schema.Subresources))
	}
	if schema.Subresources[0].Name != "artifact" {
		t.Fatalf("expected subresource artifact, got %q", schema.Subresources[0].Name)
	}
	if schema.Subresources[0].Method != "GET" {
		t.Fatalf("expected method GET, got %q", schema.Subresources[0].Method)
	}
	if schema.Subresources[0].Permission != "agreements.download" {
		t.Fatalf("expected permission preserved, got %q", schema.Subresources[0].Permission)
	}
}

func TestPanelServeSubresourceUsesResponder(t *testing.T) {
	repo := &panelSubresourceResponderRepo{Repository: NewMemoryRepository()}
	panel := &Panel{
		name: "agreements",
		repo: repo,
		subresources: []PanelSubresource{
			{Name: "artifact", Method: "GET"},
		},
	}

	err := panel.ServeSubresource(AdminContext{Context: context.Background()}, router.NewMockContext(), "agreement-1", "artifact", "executed")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if repo.calls != 1 {
		t.Fatalf("expected responder call count 1, got %d", repo.calls)
	}
	if repo.last.id != "agreement-1" || repo.last.subresource != "artifact" || repo.last.value != "executed" {
		t.Fatalf("unexpected subresource payload: %+v", repo.last)
	}
}

func TestFilterActionsForScope(t *testing.T) {
	actions := []Action{
		{Name: "view", Scope: ActionScopeRow},
		{Name: "edit", Scope: ActionScopeDetail},
		{Name: "delete", Scope: ActionScopeAny},
	}
	filtered := filterActionsForScope(actions, ActionScopeRow)
	if len(filtered) != 2 {
		t.Fatalf("expected 2 actions for row scope, got %d", len(filtered))
	}
	if !containsActionName(filtered, "view") || !containsActionName(filtered, "delete") {
		t.Fatalf("expected view/delete actions for row scope, got %+v", filtered)
	}
}

func findPanelSchemaActionByName(actions []Action, name string) (Action, bool) {
	for _, action := range actions {
		if strings.EqualFold(strings.TrimSpace(action.Name), strings.TrimSpace(name)) {
			return action, true
		}
	}
	return Action{}, false
}

func containsActionName(actions []Action, name string) bool {
	_, ok := findPanelSchemaActionByName(actions, name)
	return ok
}
