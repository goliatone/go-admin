package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
)

type commandLauncherTestCatalog struct {
	descriptors []command.CommandDescriptor
}

func mustCommandLauncherType[T any](t *testing.T, value any, label string) T {
	t.Helper()
	typed, ok := value.(T)
	if !ok {
		var zero T
		t.Fatalf("expected %s to be %T, got %T (%#v)", label, zero, value, value)
	}
	return typed
}

func (c commandLauncherTestCatalog) CommandDescriptors() []command.CommandDescriptor {
	return append([]command.CommandDescriptor(nil), c.descriptors...)
}

type commandLauncherTestOptionProvider struct {
	calls []command.CommandOptionRequest
	err   error
}

func (p *commandLauncherTestOptionProvider) CommandOptions(_ context.Context, req command.CommandOptionRequest) ([]command.CommandOption, error) {
	p.calls = append(p.calls, req)
	if p.err != nil {
		return nil, p.err
	}
	return []command.CommandOption{
		{Value: "entity-1", Label: "Entity 1", Description: "Primary entity"},
		{Value: "entity-2", Label: "Entity 2", Description: "Archived entity", Disabled: true, Metadata: map[string]any{"reason": "archived"}},
	}, nil
}

func commandLauncherTestAction(t *testing.T, actions []debugregistry.PanelUIAction, id string) debugregistry.PanelUIAction {
	t.Helper()
	for _, action := range actions {
		if action.ID == id {
			return action
		}
	}
	t.Fatalf("expected action %q, got %#v", id, actions)
	return debugregistry.PanelUIAction{}
}

func commandLauncherTestDescriptor() command.CommandDescriptor {
	return command.CommandDescriptor{
		ID:            "catalog.inspect",
		Label:         "Inspect catalog",
		ExposeInAdmin: true,
		Permissions:   []string{"admin.catalog.inspect"},
		ExecutionMode: command.ExecutionModeInline,
		Input: command.CommandInputSchema{
			Type: "object",
			Fields: []command.CommandInputField{
				{
					ID:       "entity_id",
					Name:     "entity_id",
					Path:     "entity_id",
					Label:    "Entity",
					Kind:     "select",
					Type:     "string",
					Required: true,
					OptionSource: &command.CommandOptionSourceRef{
						ID:         "catalog.entities",
						Dynamic:    true,
						CacheScope: "request",
					},
				},
			},
			Required: []string{"entity_id"},
			JSONSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"entity_id": map[string]any{"type": "string"},
				},
				"required": []string{"entity_id"},
			},
		},
	}
}

func TestCommandLauncherPanelSerializesExecutableActionsAndFormSchemas(t *testing.T) {
	options := &commandLauncherTestOptionProvider{}
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog:        commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{commandLauncherTestDescriptor()}},
		CommandOptionProvider: options,
		FeatureGate:           featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|commands":   true,
		}},
	})
	RegisterCommandLauncherDebugPanel(adm)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommands) })

	def, ok := debugregistry.PanelDefinitionForContext(context.Background(), DebugPanelCommands)
	if !ok {
		t.Fatalf("expected command launcher panel definition")
	}
	if def.UI == nil || def.UI.ActionLayout == nil || def.UI.ActionLayout.Mode != debugregistry.PanelActionLayoutSelect {
		t.Fatalf("expected selectable command launcher UI, got %#v", def.UI)
	}
	if len(def.UI.Actions) != 2 {
		t.Fatalf("expected executable and hidden option resolver actions, got %#v", def.UI.Actions)
	}
	action := commandLauncherTestAction(t, def.UI.Actions, "dispatch_catalog_inspect")
	resolver := commandLauncherTestAction(t, def.UI.Actions, commandLauncherResolveOptionsAction)
	if !resolver.Hidden || resolver.Kind != "command_options" {
		t.Fatalf("expected hidden option resolver action, got %#v", resolver)
	}
	if action.Payload["command_id"] != "catalog.inspect" {
		t.Fatalf("expected canonical command_id payload, got %#v", action.Payload)
	}
	optionsPayload := mustCommandLauncherType[map[string]any](t, action.Payload["options"], "action options payload")
	if optionsPayload["mode"] != command.ExecutionModeInline {
		t.Fatalf("expected dispatch options mode in action payload, got %#v", action.Payload)
	}
	if len(action.Fields) != 1 || action.Fields[0].PayloadPath != "payload.entity_id" {
		t.Fatalf("expected go-formgen-compatible payload path, got %#v", action.Fields)
	}
	if len(action.Fields[0].Options) != 2 || action.Fields[0].Options[0] != "entity-1" {
		t.Fatalf("expected request-scoped dynamic options, got %#v", action.Fields[0].Options)
	}
	if len(action.Fields[0].OptionItems) != 2 || action.Fields[0].OptionItems[0].Label != "Entity 1" || action.Fields[0].OptionItems[0].Description != "Primary entity" || !action.Fields[0].OptionItems[1].Disabled {
		t.Fatalf("expected rich request-scoped dynamic options, got %#v", action.Fields[0].OptionItems)
	}
	if action.Fields[0].OptionSource == nil || action.Fields[0].OptionSource.ID != "catalog.entities" || !action.Fields[0].OptionSource.Dynamic {
		t.Fatalf("expected dynamic option source metadata, got %#v", action.Fields[0].OptionSource)
	}
	if len(options.calls) != 1 || options.calls[0].CommandID != "catalog.inspect" || options.calls[0].Source.ID != "catalog.entities" {
		t.Fatalf("expected authorized dynamic option provider call, got %#v", options.calls)
	}

	schemas, ok := def.UI.Metadata["serialized_schemas"].(map[string]any)
	if !ok || schemas["catalog.inspect"] == nil {
		t.Fatalf("expected serialized form schema metadata, got %#v", def.UI.Metadata)
	}
	schema := mustCommandLauncherType[map[string]any](t, schemas["catalog.inspect"], "catalog.inspect schema")
	formgen := mustCommandLauncherType[map[string]any](t, schema["x-formgen"], "x-formgen metadata")
	if formgen["mode"] != "command-launcher" || formgen["payload_paths"] != true {
		t.Fatalf("expected command launcher formgen metadata, got %#v", formgen)
	}
}

func TestCommandLauncherPanelMissingDispatchShowsCatalogWithoutActions(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{commandLauncherTestDescriptor()}},
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":   true,
			"admin.catalog.inspect|commands": true,
		}},
	})
	RegisterCommandLauncherDebugPanel(adm)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommands) })

	def, ok := debugregistry.PanelDefinitionForContext(context.Background(), DebugPanelCommands)
	if !ok || def.UI == nil {
		t.Fatalf("expected command launcher panel definition")
	}
	if len(def.UI.Actions) != 0 {
		t.Fatalf("expected no executable actions without dispatch permission, got %#v", def.UI.Actions)
	}
	diagnostics := mustCommandLauncherType[[]CommandLauncherDiagnostic](t, def.UI.Metadata["diagnostics"], "diagnostics metadata")
	if len(diagnostics) != 1 || diagnostics[0].Code != "missing_command_dispatch" {
		t.Fatalf("expected missing dispatch diagnostic, got %#v", diagnostics)
	}

	reg, ok := debugregistry.Panel(DebugPanelCommands)
	if !ok || reg.Snapshot == nil {
		t.Fatalf("expected command launcher snapshot")
	}
	snapshot := mustCommandLauncherType[CommandLauncherSnapshot](t, reg.Snapshot(context.Background()), "command launcher snapshot")
	if len(snapshot.Commands) != 1 {
		t.Fatalf("expected visible command descriptor in snapshot, got %#v", snapshot.Commands)
	}
	if len(snapshot.Commands[0].Input.Fields) != 0 {
		t.Fatalf("snapshot must not serialize command form schema without executable action: %#v", snapshot.Commands[0].Input)
	}
}

func TestCommandLauncherPanelDoesNotLeakHiddenCommandSchemas(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{commandLauncherTestDescriptor()}},
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
		}},
	})
	RegisterCommandLauncherDebugPanel(adm)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommands) })

	def, ok := debugregistry.PanelDefinitionForContext(context.Background(), DebugPanelCommands)
	if !ok || def.UI == nil {
		t.Fatalf("expected command launcher panel definition")
	}
	if len(def.UI.Actions) != 0 {
		t.Fatalf("expected hidden command to produce no actions, got %#v", def.UI.Actions)
	}
	if schemas := def.UI.Metadata["serialized_schemas"]; schemas != nil {
		t.Fatalf("hidden command must not serialize schema or option source ids, got %#v", schemas)
	}
	diagnostics := mustCommandLauncherType[[]CommandLauncherDiagnostic](t, def.UI.Metadata["diagnostics"], "diagnostics metadata")
	if len(diagnostics) != 1 || diagnostics[0].Code != "command_specific_permission_gaps" {
		t.Fatalf("expected command-specific permission diagnostic, got %#v", diagnostics)
	}
}

func TestCommandLauncherPanelHonorsDescriptorResourceHint(t *testing.T) {
	descriptor := commandLauncherTestDescriptor()
	descriptor.DisplayHints = map[string]any{"resource": "catalog"}
	options := &commandLauncherTestOptionProvider{}
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog:        commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{descriptor}},
		CommandOptionProvider: options,
		FeatureGate:           featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|catalog":    true,
		}},
	})
	RegisterCommandLauncherDebugPanel(adm)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommands) })

	def, ok := debugregistry.PanelDefinitionForContext(context.Background(), DebugPanelCommands)
	if !ok || def.UI == nil {
		t.Fatalf("expected command launcher panel definition")
	}
	if len(def.UI.Actions) != 2 {
		t.Fatalf("expected descriptor to authorize against resource hint, got %#v", def.UI.Actions)
	}
	commandLauncherTestAction(t, def.UI.Actions, "dispatch_catalog_inspect")
}

func TestCommandLauncherActionFieldsSupportFormgenCompatibleFieldKinds(t *testing.T) {
	fields := commandLauncherActionFields(context.Background(), nil, command.CommandDescriptor{Input: command.CommandInputSchema{
		Type: "object",
		Fields: []command.CommandInputField{
			{Name: "enabled", Path: "enabled", Type: "boolean", Required: true},
			{Name: "limit", Path: "limit", Type: "integer"},
			{Name: "tags", Path: "filters.tags", Type: "array"},
			{Name: "metadata", Path: "metadata", Type: "object"},
			{Name: "status", Path: "filters.status", Kind: "select", Type: "string", StaticOptions: []command.CommandOption{
				{Value: "draft", Label: "Draft"},
				{Value: "published", Label: "Published"},
			}},
		},
	}}, nil)
	if len(fields) != 5 {
		t.Fatalf("expected five fields, got %#v", fields)
	}
	byName := map[string]debugregistry.PanelUIActionField{}
	for _, field := range fields {
		byName[field.Name] = field
	}
	if byName["enabled"].Kind != "boolean" || byName["enabled"].PayloadPath != "payload.enabled" || !byName["enabled"].Required {
		t.Fatalf("unexpected boolean field: %#v", byName["enabled"])
	}
	if byName["limit"].Kind != "number" || byName["limit"].PayloadPath != "payload.limit" {
		t.Fatalf("unexpected number field: %#v", byName["limit"])
	}
	if byName["tags"].Kind != "string_list" || byName["tags"].PayloadPath != "payload.filters.tags" {
		t.Fatalf("unexpected array field: %#v", byName["tags"])
	}
	if byName["metadata"].Kind != "json" || byName["metadata"].PayloadPath != "payload.metadata" {
		t.Fatalf("unexpected json field: %#v", byName["metadata"])
	}
	if byName["status"].Kind != "select" || len(byName["status"].Options) != 2 || len(byName["status"].OptionItems) != 2 || byName["status"].OptionItems[0].Label != "Draft" {
		t.Fatalf("unexpected select field: %#v", byName["status"])
	}
}

func TestCommandLauncherOptionResolverForwardsCurrentPayloadAndRichOptions(t *testing.T) {
	descriptor := commandLauncherTestDescriptor()
	descriptor.Input.Fields[0].OptionSource.Params = map[string]any{"depends_on": []string{"entity_kind"}}
	options := &commandLauncherTestOptionProvider{}
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog:        commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{descriptor}},
		CommandOptionProvider: options,
		FeatureGate:           featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|commands":   true,
		}},
	})

	result, err := runCommandLauncherOptionResolver(context.Background(), adm, map[string]any{
		"command_id": "catalog.inspect",
		"field_path": "entity_id",
		"source_id":  "catalog.entities",
		"payload": map[string]any{
			"entity_kind": "article",
		},
	})
	if err != nil {
		t.Fatalf("resolve command options: %v", err)
	}
	data := mustCommandLauncherType[map[string]any](t, result.Data, "option resolver data")
	if !result.OK || data["empty"] != false {
		t.Fatalf("expected successful non-empty option result, got %#v", result)
	}
	if len(options.calls) != 1 || options.calls[0].Payload["entity_kind"] != "article" {
		t.Fatalf("expected current form payload to reach provider, got %#v", options.calls)
	}
	items := mustCommandLauncherType[[]debugregistry.PanelUIActionOption](t, data["option_items"], "resolved option items")
	if len(items) != 2 || items[0].Description != "Primary entity" || !items[1].Disabled || items[1].Metadata["reason"] != "archived" {
		t.Fatalf("expected rich option result, got %#v", items)
	}
}

func TestCommandLauncherOptionResolverRejectsUnregisteredSource(t *testing.T) {
	options := &commandLauncherTestOptionProvider{}
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog:        commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{commandLauncherTestDescriptor()}},
		CommandOptionProvider: options,
		FeatureGate:           featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|commands":   true,
		}},
	})

	_, err := runCommandLauncherOptionResolver(context.Background(), adm, map[string]any{
		"command_id": "catalog.inspect",
		"field_path": "entity_id",
		"source_id":  "catalog.unregistered",
	})
	if err == nil {
		t.Fatal("expected mismatched source to be rejected")
	}
	if len(options.calls) != 0 {
		t.Fatalf("provider must not be called for an unregistered source, got %#v", options.calls)
	}
}

func TestCommandLauncherActionFieldsSerializePresentationHints(t *testing.T) {
	fields := commandLauncherActionFields(context.Background(), nil, command.CommandDescriptor{Input: command.CommandInputSchema{
		Type: "object",
		Fields: []command.CommandInputField{
			{
				Name:    "limit",
				Path:    "limit",
				Type:    "integer",
				Help:    "Maximum rows to scan",
				Default: 50,
				DisplayHints: map[string]any{
					"section":     "Scope",
					"advanced":    "true",
					"units":       "rows",
					"raw_html":    "<b>unsafe</b>",
					"unsupported": []any{func() {}},
				},
			},
		},
	}}, nil)
	if len(fields) != 1 {
		t.Fatalf("expected one field, got %#v", fields)
	}
	field := fields[0]
	if field.Default != 50 {
		t.Fatalf("expected default to round-trip, got %#v", field.Default)
	}
	if field.Description != "Maximum rows to scan" {
		t.Fatalf("expected help fallback in description, got %q", field.Description)
	}
	if got := field.DisplayHints; got["section"] != "Scope" || got["advanced"] != true || got["units"] != "rows" {
		t.Fatalf("expected sanitized display hints, got %#v", got)
	}
	if _, ok := field.DisplayHints["raw_html"]; ok {
		t.Fatalf("unexpected unsafe display hint: %#v", field.DisplayHints)
	}
	payload, err := json.Marshal(field)
	if err != nil {
		t.Fatalf("marshal field: %v", err)
	}
	if !json.Valid(payload) {
		t.Fatalf("expected JSON-safe field, got %s", payload)
	}
}

func TestCommandLauncherSerializedSchemasMirrorPresentationHints(t *testing.T) {
	descriptor := commandLauncherTestDescriptor()
	descriptor.Input.Fields[0].Help = "Pick an entity"
	descriptor.Input.Fields[0].Default = "entity-1"
	descriptor.Input.Fields[0].Sensitive = true
	descriptor.Input.Fields[0].OptionSource.Label = "Catalog entities"
	descriptor.Input.Fields[0].OptionSource.RedactionHint = "id-only"
	descriptor.Input.Fields[0].OptionSource.Params = map[string]any{
		"tenant": "default",
		"limit":  25,
	}
	descriptor.Input.Fields[0].Validation = map[string]any{
		"min_length": 3,
	}
	descriptor.Input.Fields[0].DisplayHints = map[string]any{
		"section":  "Scope",
		"advanced": false,
		"units":    "id",
		"onclick":  func() {},
	}
	descriptor.Input.Fields = append(descriptor.Input.Fields, command.CommandInputField{
		Name: "status",
		Path: "status",
		Type: "string",
		Kind: "select",
		StaticOptions: []command.CommandOption{
			{Value: "active", Label: "Active", Description: "Runnable entries"},
			{Value: "deleted", Label: "Deleted", Description: "Unavailable entries", Disabled: true, Metadata: map[string]any{"reason": "archived"}},
		},
	})
	schemas := commandLauncherFormSchemas([]command.CommandDescriptor{descriptor})
	schema := mustCommandLauncherType[map[string]any](t, schemas["catalog.inspect"], "catalog.inspect schema")
	fields := mustCommandLauncherType[[]map[string]any](t, schema["fields"], "schema fields")
	if len(fields) != 2 {
		t.Fatalf("expected two serialized fields, got %#v", fields)
	}
	byPath := map[string]map[string]any{}
	for _, field := range fields {
		path := mustCommandLauncherType[string](t, field["path"], fmt.Sprintf("field path for %#v", field))
		byPath[path] = field
	}
	field := byPath["entity_id"]
	if field["default"] != "entity-1" || field["help"] != "Pick an entity" {
		t.Fatalf("expected default/help in serialized schema, got %#v", field)
	}
	if field["sensitive"] != true {
		t.Fatalf("expected sensitive descriptor flag to round-trip, got %#v", field)
	}
	hints := mustCommandLauncherType[map[string]any](t, field["display_hints"], "field display hints")
	if hints["section"] != "Scope" || hints["advanced"] != false || hints["units"] != "id" {
		t.Fatalf("expected mirrored display hints, got %#v", hints)
	}
	if _, ok := hints["onclick"]; ok {
		t.Fatalf("unexpected unsafe display hint in schema: %#v", hints)
	}
	source := mustCommandLauncherType[map[string]any](t, field["option_source"], "field option source")
	if source["id"] != "catalog.entities" || source["label"] != "Catalog entities" || source["dynamic"] != true || source["cache_scope"] != "request" || source["redaction_hint"] != "id-only" {
		t.Fatalf("expected full option source descriptor, got %#v", source)
	}
	params := mustCommandLauncherType[map[string]any](t, source["params"], "option source params")
	if params["tenant"] != "default" || params["limit"] != 25 {
		t.Fatalf("expected option source params to round-trip, got %#v", params)
	}
	validation := mustCommandLauncherType[map[string]any](t, field["validation"], "field validation")
	if validation["min_length"] != 3 {
		t.Fatalf("expected validation metadata to round-trip, got %#v", validation)
	}
	status := byPath["status"]
	options := mustCommandLauncherType[[]map[string]any](t, status["static_options"], "status static options")
	if len(options) != 2 || options[0]["description"] != "Runnable entries" || options[1]["disabled"] != true {
		t.Fatalf("expected full static option descriptors, got %#v", options)
	}
	metadata := mustCommandLauncherType[map[string]any](t, options[1]["metadata"], "static option metadata")
	if metadata["reason"] != "archived" {
		t.Fatalf("expected static option metadata to round-trip, got %#v", metadata)
	}
	payload, err := json.Marshal(schemas)
	if err != nil {
		t.Fatalf("marshal schemas: %v", err)
	}
	if !json.Valid(payload) {
		t.Fatalf("expected JSON-safe schemas, got %s", payload)
	}
}

func TestCommandLauncherActionFieldsOmitAbsentPresentationHints(t *testing.T) {
	fields := commandLauncherActionFields(context.Background(), nil, command.CommandDescriptor{Input: command.CommandInputSchema{
		Type: "object",
		Fields: []command.CommandInputField{
			{Name: "query", Path: "query", Type: "string"},
		},
	}}, nil)
	if len(fields) != 1 {
		t.Fatalf("expected one field, got %#v", fields)
	}
	if fields[0].Default != nil {
		t.Fatalf("expected absent default to remain empty, got %#v", fields[0].Default)
	}
	if fields[0].DisplayHints != nil {
		t.Fatalf("expected absent display hints to remain empty, got %#v", fields[0].DisplayHints)
	}
}

func TestCommandLauncherActionFieldsSupportNoInputCommands(t *testing.T) {
	fields := commandLauncherActionFields(context.Background(), nil, command.CommandDescriptor{Input: command.CommandInputSchema{NoInput: true}}, nil)
	if len(fields) != 0 {
		t.Fatalf("expected no fields for no-input command, got %#v", fields)
	}
}

func TestCommandLauncherActionForwardsIDsAndDispatchOptions(t *testing.T) {
	descriptor := commandLauncherTestDescriptor()
	descriptor.ID = "rpc.dispatch.test"
	descriptor.Input = command.CommandInputSchema{NoInput: true}
	var policyInput RPCCommandPolicyInput
	var factoryIDs []string
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				MetadataAllowlist: []string{"source"},
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.test": {Permission: "admin.catalog.inspect"},
				},
			},
		},
	}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{descriptor}},
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|commands":   true,
		}},
		RPCCommandPolicyHook: func(_ context.Context, input RPCCommandPolicyInput) error {
			policyInput = input
			return nil
		},
	})
	if _, err := RegisterCommand(adm.Commands(), command.CommandFunc[rpcDispatchTestMessage](func(_ context.Context, _ rpcDispatchTestMessage) error {
		return nil
	})); err != nil {
		t.Fatalf("register command: %v", err)
	}
	if err := RegisterMessageFactory(adm.Commands(), "rpc.dispatch.test", func(payload map[string]any, ids []string) (rpcDispatchTestMessage, error) {
		factoryIDs = append([]string(nil), ids...)
		value, ok := payload["value"].(string)
		if !ok {
			return rpcDispatchTestMessage{}, fmt.Errorf("expected string value payload, got %T", payload["value"])
		}
		return rpcDispatchTestMessage{Value: value}, nil
	}); err != nil {
		t.Fatalf("register message factory: %v", err)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "debug-user", Subject: "debug-user"})
	result, err := runCommandLauncherAction(ctx, adm, "rpc.dispatch.test", map[string]any{
		"payload": map[string]any{"value": "ok"},
		"ids":     []any{"one", "two"},
		"options": map[string]any{
			"mode":            "inline",
			"idempotency_key": "idem-1",
			"dedup_policy":    "merge",
			"correlation_id":  "corr-1",
			"metadata":        map[string]any{"source": "debug-panel"},
		},
	})
	if err != nil {
		t.Fatalf("run command launcher action: %v", err)
	}
	if !result.OK {
		t.Fatalf("expected successful action result, got %#v", result)
	}
	if got := factoryIDs; len(got) != 2 || got[0] != "one" || got[1] != "two" {
		t.Fatalf("expected ids to reach command factory, got %#v", got)
	}
	if policyInput.Dispatch.Mode != command.ExecutionModeInline ||
		policyInput.Dispatch.IdempotencyKey != "idem-1" ||
		policyInput.Dispatch.DedupPolicy != command.DedupPolicyMerge ||
		policyInput.Dispatch.CorrelationID != "corr-1" ||
		policyInput.Dispatch.Metadata["source"] != "debug-panel" {
		t.Fatalf("expected dispatch options to reach policy hook, got %#v", policyInput.Dispatch)
	}
}

func TestCommandLauncherActionDispatchesThroughDebugCollector(t *testing.T) {
	descriptor := commandLauncherTestDescriptor()
	descriptor.ID = "rpc.dispatch.test"
	descriptor.Input = command.CommandInputSchema{NoInput: true}
	var policyInput RPCCommandPolicyInput
	var factoryIDs []string
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				MetadataAllowlist: []string{"source"},
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.test": {Permission: "admin.catalog.inspect"},
				},
			},
		},
	}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{descriptor}},
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|commands":   true,
		}},
		RPCCommandPolicyHook: func(_ context.Context, input RPCCommandPolicyInput) error {
			policyInput = input
			return nil
		},
	})
	if _, err := RegisterCommand(adm.Commands(), command.CommandFunc[rpcDispatchTestMessage](func(_ context.Context, _ rpcDispatchTestMessage) error {
		return nil
	})); err != nil {
		t.Fatalf("register command: %v", err)
	}
	if err := RegisterMessageFactory(adm.Commands(), "rpc.dispatch.test", func(payload map[string]any, ids []string) (rpcDispatchTestMessage, error) {
		factoryIDs = append([]string(nil), ids...)
		value, ok := payload["value"].(string)
		if !ok {
			return rpcDispatchTestMessage{}, fmt.Errorf("expected string value payload, got %T", payload["value"])
		}
		return rpcDispatchTestMessage{Value: value}, nil
	}); err != nil {
		t.Fatalf("register message factory: %v", err)
	}
	RegisterCommandLauncherDebugPanel(adm)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommands) })

	registration, ok := debugregistry.Panel(DebugPanelCommands)
	if !ok {
		t.Fatalf("expected command launcher panel registration")
	}
	if registration.Actions["dispatch_rpc_dispatch_test"] == nil {
		t.Fatalf("expected dynamic command launcher handler to be registered, got %+v", registration.Actions)
	}
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "debug-user", Subject: "debug-user"})
	if !debugregistry.PanelDefinitionHasAction(registration.DefinitionForContext(ctx), "dispatch_rpc_dispatch_test") {
		t.Fatalf("expected request-scoped command launcher definition to expose dispatch action")
	}

	collector := NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommands}})
	result, err := collector.RunPanelAction(ctx, debugregistry.PanelActionRequest{
		PanelID:  DebugPanelCommands,
		ActionID: "dispatch_rpc_dispatch_test",
		Payload: map[string]any{
			"payload": map[string]any{"value": "ok"},
			"ids":     []any{"one", "two"},
			"options": map[string]any{
				"mode":            "inline",
				"idempotency_key": "idem-1",
				"dedup_policy":    "merge",
				"correlation_id":  "corr-1",
				"metadata":        map[string]any{"source": "debug-panel"},
			},
		},
	})
	if err != nil {
		t.Fatalf("run collector command launcher action: %v", err)
	}
	if !result.OK {
		t.Fatalf("expected successful action result, got %#v", result)
	}
	if got := factoryIDs; len(got) != 2 || got[0] != "one" || got[1] != "two" {
		t.Fatalf("expected ids to reach command factory, got %#v", got)
	}
	if policyInput.Dispatch.Mode != command.ExecutionModeInline ||
		policyInput.Dispatch.IdempotencyKey != "idem-1" ||
		policyInput.Dispatch.DedupPolicy != command.DedupPolicyMerge ||
		policyInput.Dispatch.CorrelationID != "corr-1" ||
		policyInput.Dispatch.Metadata["source"] != "debug-panel" {
		t.Fatalf("expected dispatch options to reach policy hook, got %#v", policyInput.Dispatch)
	}
}

func TestCommandLauncherDoctorCheckReportsReadyAndPermissionGaps(t *testing.T) {
	options := &commandLauncherTestOptionProvider{}
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog:        commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{commandLauncherTestDescriptor()}},
		CommandOptionProvider: options,
		FeatureGate:           featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|commands":   true,
		}},
	})
	RegisterCommandLauncherDoctorCheck(adm)

	report := adm.RunDoctor(context.Background())
	check := commandLauncherDoctorResult(t, report)
	if check.Status != DoctorSeverityOK {
		t.Fatalf("expected ready command launcher check, got %+v", check)
	}
	if check.Metadata["executable_command_count"] != 1 {
		t.Fatalf("expected executable command count, got %#v", check.Metadata)
	}

	adm = mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{commandLauncherTestDescriptor()}},
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":   true,
			"admin.catalog.inspect|commands": true,
		}},
	})
	RegisterCommandLauncherDoctorCheck(adm)
	report = adm.RunDoctor(context.Background())
	check = commandLauncherDoctorResult(t, report)
	if check.Status != DoctorSeverityWarn {
		t.Fatalf("expected warning for missing dispatch, got %+v", check)
	}
	if len(check.Findings) != 1 || check.Findings[0].Code != "missing_command_dispatch" {
		t.Fatalf("expected missing dispatch finding, got %+v", check.Findings)
	}
}

func TestCommandLauncherDoctorCheckReportsMissingProvider(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands)})
	RegisterCommandLauncherDoctorCheck(adm)

	report := adm.RunDoctor(context.Background())
	check := commandLauncherDoctorResult(t, report)
	if check.Status != DoctorSeverityWarn {
		t.Fatalf("expected warning for missing provider, got %+v", check)
	}
	if len(check.Findings) != 1 || check.Findings[0].Code != "catalog_provider_unavailable" {
		t.Fatalf("expected provider unavailable finding, got %+v", check.Findings)
	}
}

func TestCommandLauncherDoctorCheckReportsDisabledCommandFeature(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{commandLauncherTestDescriptor()}},
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|commands":   true,
		}},
	})
	RegisterCommandLauncherDoctorCheck(adm)

	report := adm.RunDoctor(context.Background())
	check := commandLauncherDoctorResult(t, report)
	if check.Status != DoctorSeverityWarn {
		t.Fatalf("expected warning for disabled command feature, got %+v", check)
	}
	if len(check.Findings) != 1 || check.Findings[0].Code != "command_feature_disabled" {
		t.Fatalf("expected command feature disabled finding, got %+v", check.Findings)
	}
}

func TestCommandLauncherDoctorCheckReportsMissingDynamicOptionProvider(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{commandLauncherTestDescriptor()}},
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|commands":   true,
		}},
	})
	RegisterCommandLauncherDoctorCheck(adm)

	report := adm.RunDoctor(context.Background())
	check := commandLauncherDoctorResult(t, report)
	if check.Status != DoctorSeverityWarn {
		t.Fatalf("expected warning for missing dynamic option provider, got %+v", check)
	}
	if len(check.Findings) != 1 || check.Findings[0].Code != "option_provider_unavailable" {
		t.Fatalf("expected option provider finding, got %+v", check.Findings)
	}
}

func TestDebugModuleCommandLauncherDoctorRequiresPanelOrConfigFlag(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands)})
	if err := NewDebugModule(DebugConfig{Enabled: true}).Register(ModuleContext{Admin: adm}); err != nil {
		t.Fatalf("register debug module: %v", err)
	}
	report := adm.RunDoctor(context.Background())
	for _, check := range report.Checks {
		if check.ID == "command_launcher" {
			t.Fatalf("did not expect command launcher doctor check without provider or config flag")
		}
	}

	adm = mustNewAdmin(t, Config{}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands)})
	if err := NewDebugModule(DebugConfig{Enabled: true, CommandLauncherDoctorEnabled: true}).Register(ModuleContext{Admin: adm}); err != nil {
		t.Fatalf("register debug module with command launcher doctor flag: %v", err)
	}
	report = adm.RunDoctor(context.Background())
	check := commandLauncherDoctorResult(t, report)
	if check.Status != DoctorSeverityWarn {
		t.Fatalf("expected opt-in missing provider warning, got %+v", check)
	}
}

func commandLauncherDoctorResult(t *testing.T, report DoctorReport) DoctorCheckResult {
	t.Helper()
	for _, check := range report.Checks {
		if check.ID == "command_launcher" {
			return check
		}
	}
	t.Fatalf("expected command launcher doctor check in %+v", report.Checks)
	return DoctorCheckResult{}
}

func TestCommandLauncherPublishCommandStatusBroadcasts(t *testing.T) {
	// Enable the commands panel so command_status is gated open regardless of
	// global registry state.
	collector := NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommandLauncher}})
	adm := &Admin{debugCollector: collector}
	events := collector.Subscribe("status-client")
	if events == nil {
		t.Fatalf("expected subscription channel")
	}

	adm.PublishCommandStatus(CommandStatusEvent{
		CorrelationID: "corr-9",
		CommandID:     "demo.cmd",
		State:         "completed",
		Mode:          "queued",
	})

	select {
	case event := <-events:
		if event.Type != commandStatusEventType {
			t.Fatalf("expected %q event, got %q", commandStatusEventType, event.Type)
		}
		raw, err := json.Marshal(event.Payload)
		if err != nil {
			t.Fatalf("marshal payload: %v", err)
		}
		var got CommandStatusEvent
		if err := json.Unmarshal(raw, &got); err != nil {
			t.Fatalf("unmarshal payload: %v", err)
		}
		if got.CorrelationID != "corr-9" || got.State != "completed" || got.CommandID != "demo.cmd" {
			t.Fatalf("unexpected payload: %#v", got)
		}
		if got.At == "" {
			t.Fatalf("expected At to be stamped, got empty")
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatalf("expected command_status event")
	}
}

func TestCommandLauncherPublishCommandStatusIgnoresEmptyState(t *testing.T) {
	collector := NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommandLauncher}})
	adm := &Admin{debugCollector: collector}
	events := collector.Subscribe("status-empty")

	adm.PublishCommandStatus(CommandStatusEvent{CorrelationID: "c", State: ""})

	select {
	case event := <-events:
		t.Fatalf("did not expect an event for empty state, got %+v", event)
	case <-time.After(100 * time.Millisecond):
		// expected: no event published
	}
}
