package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
)

type commandLauncherTestCatalog struct {
	descriptors []command.CommandDescriptor
}

type mutableCommandLauncherTestCatalog struct {
	descriptors []command.CommandDescriptor
}

func (c *mutableCommandLauncherTestCatalog) CommandDescriptors() []command.CommandDescriptor {
	if c == nil {
		return nil
	}
	return append([]command.CommandDescriptor(nil), c.descriptors...)
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

func commandLauncherNoInputTestDescriptor(id string) command.CommandDescriptor {
	return command.CommandDescriptor{
		ID:            id,
		Label:         id,
		ExposeInAdmin: true,
		ExecutionMode: command.ExecutionModeInline,
		Input:         command.CommandInputSchema{NoInput: true},
	}
}

func TestCommandLauncherActionIDsPreserveDistinctCommandIdentity(t *testing.T) {
	commandIDs := []string{"foo.bar", "foo-bar", "foo/bar", "foo:bar", "FOO.BAR"}
	descriptors := make([]command.CommandDescriptor, 0, len(commandIDs))
	for _, commandID := range commandIDs {
		descriptors = append(descriptors, commandLauncherNoInputTestDescriptor(commandID))
	}
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: descriptors},
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
		}},
	})
	RegisterCommandLauncherDebugPanel(adm)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommands) })

	registration, ok := debugregistry.Panel(DebugPanelCommands)
	if !ok {
		t.Fatal("expected command launcher panel registration")
	}
	definition := registration.DefinitionForContext(context.Background())
	if definition.UI == nil || len(definition.UI.Actions) != len(commandIDs) {
		t.Fatalf("expected one action per distinct command, got %#v", definition.UI)
	}
	seen := map[string]string{}
	for _, action := range definition.UI.Actions {
		commandID := mustCommandLauncherType[string](t, action.Payload["command_id"], "command ID")
		if commandID == "" {
			t.Fatalf("expected canonical command payload, got %#v", action.Payload)
		}
		if previous, exists := seen[action.ID]; exists {
			t.Fatalf("command %q collides with %q at action %q", commandID, previous, action.ID)
		}
		seen[action.ID] = commandID
		if action.ID != commandLauncherActionID(commandID) {
			t.Fatalf("action %q does not preserve command identity %q", action.ID, commandID)
		}
		if registration.Actions[action.ID] == nil {
			t.Fatalf("action %q has no matching handler", action.ID)
		}
	}
}

func TestCommandLauncherDuplicateCommandIdentityFailsClosed(t *testing.T) {
	descriptors := []command.CommandDescriptor{
		commandLauncherNoInputTestDescriptor("catalog.duplicate"),
		commandLauncherNoInputTestDescriptor("catalog.duplicate"),
	}
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: descriptors},
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
		}},
	})
	RegisterCommandLauncherDebugPanel(adm)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommands) })

	registration, ok := debugregistry.Panel(DebugPanelCommands)
	if !ok {
		t.Fatal("expected command launcher panel registration")
	}
	actionID := commandLauncherActionID("catalog.duplicate")
	if registration.Actions[actionID] != nil {
		t.Fatalf("duplicate command action %q must not have a handler", actionID)
	}
	definition := registration.DefinitionForContext(context.Background())
	if definition.UI == nil {
		t.Fatal("expected command launcher panel UI")
	}
	if debugregistry.PanelDefinitionHasAction(definition, actionID) {
		t.Fatalf("duplicate command action %q must not be exposed", actionID)
	}
	diagnostics := mustCommandLauncherType[[]CommandLauncherDiagnostic](t, definition.UI.Metadata["diagnostics"], "diagnostics")
	for _, diagnostic := range diagnostics {
		if diagnostic.Code == "duplicate_command_action_id" && diagnostic.Metadata["action_id"] == actionID && diagnostic.Metadata["descriptor_count"] == 2 {
			return
		}
	}
	t.Fatalf("expected duplicate command action diagnostic, got %#v", diagnostics)
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
	action := commandLauncherTestAction(t, def.UI.Actions, commandLauncherActionID("catalog.inspect"))
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
	if len(action.Fields) != 0 {
		t.Fatalf("legacy launcher fields must not accompany generated forms, got %#v", action.Fields)
	}
	if action.Form == nil || action.Form.Renderer != "formgen" || action.Form.OperationID == "" {
		t.Fatalf("expected typed formgen descriptor, got %#v", action.Form)
	}
	if !strings.Contains(action.Form.HTML, `name="entity_id"`) || !strings.Contains(action.Form.HTML, commandLauncherOptionEndpointScheme+"catalog.inspect/entity_id") {
		t.Fatalf("expected generated dynamic field HTML, got %s", action.Form.HTML)
	}
	if len(options.calls) != 0 {
		t.Fatalf("definition rendering must not invoke request-scoped option providers, got %#v", options.calls)
	}

	if schemas := def.UI.Metadata["serialized_schemas"]; schemas != nil {
		t.Fatalf("legacy serialized schemas must not accompany generated forms, got %#v", schemas)
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
	if resolver := def.UI.Metadata["option_resolver_action"]; resolver != nil {
		t.Fatalf("option resolver metadata must not be exposed without its protected action, got %#v", resolver)
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

func TestCommandLauncherPanelWithoutOptionProviderDoesNotAdvertiseResolver(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{commandLauncherTestDescriptor()}},
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|commands":   true,
		}},
	})
	RegisterCommandLauncherDebugPanel(adm)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommands) })

	def, ok := debugregistry.PanelDefinitionForContext(context.Background(), DebugPanelCommands)
	if !ok || def.UI == nil {
		t.Fatal("expected command launcher panel definition")
	}
	if len(def.UI.Actions) != 1 || def.UI.Actions[0].ID != commandLauncherActionID("catalog.inspect") {
		t.Fatalf("expected only the command action, got %#v", def.UI.Actions)
	}
	if resolver := def.UI.Metadata["option_resolver_action"]; resolver != nil {
		t.Fatalf("option resolver metadata must not be advertised without a provider, got %#v", resolver)
	}
}

func TestCommandLauncherPanelKeepsCatalogWhenOneFormCannotRender(t *testing.T) {
	valid := commandLauncherTestDescriptor()
	invalid := commandLauncherTestDescriptor()
	invalid.ID = "catalog.invalid"
	invalid.MessageType = invalid.ID
	invalid.Input.JSONSchema = map[string]any{"type": "string"}
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog: commandLauncherTestCatalog{descriptors: []command.CommandDescriptor{valid, invalid}},
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
			"admin.catalog.inspect|commands":   true,
			"admin.catalog.invalid|commands":   true,
		}},
	})
	RegisterCommandLauncherDebugPanel(adm)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommands) })

	def, ok := debugregistry.PanelDefinitionForContext(context.Background(), DebugPanelCommands)
	if !ok || def.UI == nil {
		t.Fatal("expected command launcher panel definition")
	}
	if len(def.UI.Actions) != 1 || def.UI.Actions[0].ID != commandLauncherActionID("catalog.inspect") {
		t.Fatalf("expected only valid command action, got %#v", def.UI.Actions)
	}
	diagnostics := mustCommandLauncherType[[]CommandLauncherDiagnostic](t, def.UI.Metadata["diagnostics"], "diagnostics")
	found := false
	for _, diagnostic := range diagnostics {
		if diagnostic.Code == "formgen_schema_conflict" && diagnostic.Metadata["command_id"] == "catalog.invalid" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected invalid form diagnostic, got %#v", diagnostics)
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
	commandLauncherTestAction(t, def.UI.Actions, commandLauncherActionID("catalog.inspect"))
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

func TestCommandLauncherOptionResolverRejectsMissingSource(t *testing.T) {
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
	})
	if err == nil {
		t.Fatal("expected missing source to be rejected")
	}
	if len(options.calls) != 0 {
		t.Fatalf("provider must not be called without exact source identity, got %#v", options.calls)
	}
}

func TestCommandLauncherOptionResolverReturnsProviderFailure(t *testing.T) {
	options := &commandLauncherTestOptionProvider{err: fmt.Errorf("catalog unavailable")}
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
		"source_id":  "catalog.entities",
	})
	if err == nil || !strings.Contains(err.Error(), "catalog unavailable") {
		t.Fatalf("expected provider failure to retain actionable cause, got %v", err)
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
	actionID := commandLauncherActionID("rpc.dispatch.test")
	if registration.Actions[actionID] == nil {
		t.Fatalf("expected dynamic command launcher handler to be registered, got %+v", registration.Actions)
	}
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "debug-user", Subject: "debug-user"})
	definition := registration.DefinitionForContext(ctx)
	if !debugregistry.PanelDefinitionHasAction(definition, actionID) {
		t.Fatalf("expected request-scoped command launcher definition to expose dispatch action, got %#v", definition.UI)
	}

	collector := NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommands}})
	result, err := collector.RunPanelAction(ctx, debugregistry.PanelActionRequest{
		PanelID:  DebugPanelCommands,
		ActionID: actionID,
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

func TestCommandLauncherResolvesCatalogActionsAddedAfterPanelRegistration(t *testing.T) {
	const commandID = "rpc.dispatch.late"
	catalog := &mutableCommandLauncherTestCatalog{}
	adm := mustNewAdmin(t, Config{}, Dependencies{
		CommandCatalog: catalog,
		FeatureGate:    featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands":     true,
			"admin.commands.dispatch|commands": true,
		}},
	})
	RegisterCommandLauncherDebugPanel(adm)
	t.Cleanup(func() { debugregistry.UnregisterPanel(DebugPanelCommands) })

	registration, ok := debugregistry.Panel(DebugPanelCommands)
	if !ok {
		t.Fatal("expected command launcher panel registration")
	}
	actionID := commandLauncherActionID(commandID)
	if registration.Actions[actionID] != nil {
		t.Fatalf("did not expect late action in bootstrap handler snapshot: %+v", registration.Actions)
	}

	catalog.descriptors = []command.CommandDescriptor{commandLauncherNoInputTestDescriptor(commandID)}
	dispatched := false
	if _, err := RegisterCommand(adm.Commands(), command.CommandFunc[rpcDispatchTestMessage](func(_ context.Context, _ rpcDispatchTestMessage) error {
		dispatched = true
		return nil
	})); err != nil {
		t.Fatalf("register command: %v", err)
	}
	if err := RegisterMessageFactory(adm.Commands(), commandID, func(map[string]any, []string) (rpcDispatchTestMessage, error) {
		return rpcDispatchTestMessage{Value: "late"}, nil
	}); err != nil {
		t.Fatalf("register message factory: %v", err)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "debug-user", Subject: "debug-user"})
	definition := registration.DefinitionForContext(ctx)
	if !debugregistry.PanelDefinitionHasAction(definition, actionID) {
		t.Fatalf("expected current catalog action in request-scoped definition, got %#v", definition.UI)
	}
	collector := NewDebugCollector(DebugConfig{Panels: []string{DebugPanelCommands}})
	result, err := collector.RunPanelAction(ctx, debugregistry.PanelActionRequest{
		PanelID:  DebugPanelCommands,
		ActionID: actionID,
		Payload: map[string]any{
			"command_id": commandID,
			"payload":    map[string]any{},
			"options":    map[string]any{"mode": command.ExecutionModeInline},
		},
	})
	if err != nil {
		t.Fatalf("dispatch late catalog action: %v", err)
	}
	if !result.OK || !dispatched {
		t.Fatalf("expected late action dispatch, result=%#v dispatched=%t", result, dispatched)
	}

	catalog.descriptors = nil
	if _, err := collector.RunPanelAction(ctx, debugregistry.PanelActionRequest{PanelID: DebugPanelCommands, ActionID: actionID}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected removed catalog action to fail closed, got %v", err)
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
