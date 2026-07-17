package debug

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestPanelDefinitionLegacyRegistrationOmitsRichUI(t *testing.T) {
	registry := NewPanelRegistry()
	if err := registry.Register("cache", PanelConfig{
		Label:       "Cache",
		SnapshotKey: "cache_state",
		EventType:   "cache",
	}); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	def, ok := registry.Registration("cache")
	if !ok {
		t.Fatalf("expected panel registration")
	}

	payload, err := json.Marshal(def.Definition)
	if err != nil {
		t.Fatalf("marshal definition: %v", err)
	}
	if strings.Contains(string(payload), `"ui"`) {
		t.Fatalf("legacy definition should omit ui, got %s", payload)
	}
	if strings.Contains(string(payload), `"clear"`) || strings.Contains(string(payload), `"actions":{`) {
		t.Fatalf("definition should not serialize hooks, got %s", payload)
	}
}

func TestPanelDefinitionRichUINormalizesWireContract(t *testing.T) {
	handler := func(context.Context, PanelActionRequest) (PanelActionResult, error) {
		return PanelActionResult{OK: true}, nil
	}
	registry := NewPanelRegistry()
	err := registry.Register("Cache", PanelConfig{
		Label:       "Cache",
		SnapshotKey: "cache",
		EventTypes:  []string{"cache", " cache "},
		UI: &PanelUI{
			Views: PanelUIViews{
				Console: &PanelUIView{
					Renderer: " TABLE ",
					Title:    "Entries",
					Bind:     "$.items",
					Options: map[string]any{
						"columns": []any{
							map[string]any{"label": "Key", "bind": "key"},
							map[string]any{"label": "<script>", "bind": "bad"},
						},
						"unsafe": func() {},
					},
				},
				Toolbar: &PanelUIView{Renderer: "metrics", Bind: "summary"},
			},
			Count:   &PanelUICount{Bind: "$.items", Mode: "array_length", Label: "entries"},
			Filters: []PanelUIFilter{{ID: "Status", Label: "Status", Kind: "select", Bind: "status", Options: []string{"ok", "warn"}}},
			Events:  &PanelUIEventPolicy{Mode: "upsert", Bind: "items", Key: "id", MaxEntries: 50},
			ActionLayout: &PanelUIActionLayout{
				Mode:        " SELECT ",
				PickerLabel: "Command",
				EmptyText:   "Choose a command",
			},
			Actions: []PanelUIAction{
				{
					ID:          "Refresh",
					Label:       "Refresh",
					SubmitLabel: "Run refresh",
					Refresh:     true,
					Form: &PanelUIActionForm{
						Renderer: " formgen ", OperationID: "refresh.form", HTML: `<input name="safe">`, ModelVersion: " v1 ", Sensitive: true,
					},
					Fields: []PanelUIActionField{
						{
							Name:        "File_ID",
							Label:       "File ID",
							Kind:        "string",
							PayloadPath: "payload.file_id",
							Placeholder: "e.g. file-123",
							Description: "Stable file identifier.",
							Help:        "Copy this from the file details page.",
							Required:    true,
							Options:     []string{"legacy", " legacy ", ""},
							OptionItems: []PanelUIActionOption{
								{Value: "active", Label: "Active file", Description: "Available for processing", Metadata: map[string]any{"group": "current", "unsafe": func() {}}},
								{Value: "archived", Label: "Archived file", Disabled: true},
							},
							OptionSource: &PanelUIActionOptionSource{ID: " Catalog.Files ", Label: "Catalog files", Dynamic: true, CacheScope: " Request ", Params: map[string]any{"depends_on": []string{"kind"}, "unsafe": func() {}}},
							Default:      map[string]any{"value": "123", "unsafe": func() {}},
							DisplayHints: map[string]any{"section": "Scope", "unsafe": func() {}, "raw_html": "<b>bad</b>"},
						},
					},
				},
				{ID: "Refresh", Label: "Duplicate"},
				{ID: "Missing", Label: "Missing"},
			},
		},
		Actions: map[string]PanelActionHandler{
			"refresh": handler,
		},
	})
	if err != nil {
		t.Fatalf("register rich panel: %v", err)
	}

	registration, registrationFound := registry.Registration("cache")
	if !registrationFound {
		t.Fatalf("expected panel registration")
	}
	def := registration.Definition
	if def.UI == nil {
		t.Fatalf("expected normalized ui")
	}
	if def.UI.SchemaVersion != PanelUISchemaVersion {
		t.Fatalf("expected default schema version, got %q", def.UI.SchemaVersion)
	}
	if def.UI.Views.Console == nil || def.UI.Views.Console.Renderer != PanelRendererTable {
		t.Fatalf("expected table console renderer, got %+v", def.UI.Views.Console)
	}
	if def.UI.Views.Console.Bind != "items" {
		t.Fatalf("expected normalized bind, got %q", def.UI.Views.Console.Bind)
	}
	if _, exists := def.UI.Views.Console.Options["unsafe"]; exists {
		t.Fatalf("expected unsafe function option to be dropped")
	}
	if len(def.UI.Filters) != 1 || def.UI.Filters[0].ID != "status" {
		t.Fatalf("expected normalized filter, got %+v", def.UI.Filters)
	}
	if def.UI.Events == nil || def.UI.Events.Mode != PanelEventUpsert || def.UI.Events.Key != "id" {
		t.Fatalf("expected normalized event policy, got %+v", def.UI.Events)
	}
	if def.UI.ActionLayout == nil || def.UI.ActionLayout.Mode != PanelActionLayoutSelect || def.UI.ActionLayout.PickerLabel != "Command" {
		t.Fatalf("expected normalized action layout, got %+v", def.UI.ActionLayout)
	}
	if len(def.UI.Actions) != 1 || def.UI.Actions[0].ID != "refresh" {
		t.Fatalf("expected only handled unique action, got %+v", def.UI.Actions)
	}
	if def.UI.Actions[0].SubmitLabel != "Run refresh" {
		t.Fatalf("expected submit label to remain, got %+v", def.UI.Actions[0])
	}
	if len(def.UI.Actions[0].Fields) != 1 || def.UI.Actions[0].Fields[0].Name != "file_id" || def.UI.Actions[0].Fields[0].PayloadPath != "payload.file_id" {
		t.Fatalf("expected normalized action field, got %+v", def.UI.Actions[0].Fields)
	}
	field := def.UI.Actions[0].Fields[0]
	if field.Placeholder != "e.g. file-123" || field.Description != "Stable file identifier." || field.Help != "Copy this from the file details page." {
		t.Fatalf("expected field guidance to remain distinct, got %+v", field)
	}
	if len(field.Options) != 2 || field.Options[1] != "legacy" {
		t.Fatalf("expected legacy options to remain compatible, got %+v", field.Options)
	}
	if len(field.OptionItems) != 2 || field.OptionItems[0].Label != "Active file" || !field.OptionItems[1].Disabled {
		t.Fatalf("expected rich options to be normalized, got %+v", field.OptionItems)
	}
	if _, hasUnsafeMetadata := field.OptionItems[0].Metadata["unsafe"]; hasUnsafeMetadata {
		t.Fatalf("expected unsafe option metadata to be dropped, got %+v", field.OptionItems[0].Metadata)
	}
	if field.OptionSource == nil || field.OptionSource.ID != "catalog.files" || field.OptionSource.CacheScope != "request" || !field.OptionSource.Dynamic {
		t.Fatalf("expected option source to be normalized, got %+v", field.OptionSource)
	}
	if _, hasUnsafeParam := field.OptionSource.Params["unsafe"]; hasUnsafeParam {
		t.Fatalf("expected unsafe option-source params to be dropped, got %+v", field.OptionSource.Params)
	}
	if dependsOn, dependenciesOK := field.OptionSource.Params["depends_on"].([]any); !dependenciesOK || len(dependsOn) != 1 || dependsOn[0] != "kind" {
		t.Fatalf("expected typed option-source dependencies to survive normalization, got %+v", field.OptionSource.Params)
	}
	defaultValue, defaultOK := def.UI.Actions[0].Fields[0].Default.(map[string]any)
	if !defaultOK || defaultValue["value"] != "123" {
		t.Fatalf("expected JSON-safe field default, got %+v", def.UI.Actions[0].Fields[0].Default)
	}
	if _, hasUnsafeDefault := defaultValue["unsafe"]; hasUnsafeDefault {
		t.Fatalf("expected unsafe default value to be dropped, got %+v", def.UI.Actions[0].Fields[0].Default)
	}
	if got := def.UI.Actions[0].Fields[0].DisplayHints; got["section"] != "Scope" {
		t.Fatalf("expected JSON-safe field display hints, got %+v", got)
	}
	if _, hasUnsafeHint := def.UI.Actions[0].Fields[0].DisplayHints["unsafe"]; hasUnsafeHint {
		t.Fatalf("expected unsafe display hint to be dropped, got %+v", def.UI.Actions[0].Fields[0].DisplayHints)
	}
	if len(registration.Actions) != 1 || registration.Actions["refresh"] == nil {
		t.Fatalf("expected normalized handler storage, got %+v", registration.Actions)
	}
	if form := def.UI.Actions[0].Form; form == nil || form.Renderer != "formgen" || form.OperationID != "refresh.form" || form.HTML != `<input name="safe">` || form.ModelVersion != "v1" || !form.Sensitive {
		t.Fatalf("expected generated form descriptor to survive normalization, got %#v", form)
	}

	payload, err := json.Marshal(def)
	if err != nil {
		t.Fatalf("marshal rich definition: %v", err)
	}
	if strings.Contains(string(payload), "func") || strings.Contains(string(payload), `"actions":{`) {
		t.Fatalf("definition should not serialize hooks, got %s", payload)
	}
	if !strings.Contains(string(payload), `"ui"`) || !strings.Contains(string(payload), `"actions"`) {
		t.Fatalf("definition should serialize rich ui actions, got %s", payload)
	}
}

func TestPanelDefinitionSensitiveActionFieldOmitsDefault(t *testing.T) {
	registry := NewPanelRegistry()
	err := registry.Register("commands", PanelConfig{
		UI: &PanelUI{
			Views: PanelUIViews{Console: &PanelUIView{Renderer: PanelRendererJSON}},
			Actions: []PanelUIAction{{
				ID: "dispatch",
				Fields: []PanelUIActionField{{
					Name:      "api_token",
					Sensitive: true,
					Default:   "must-not-serialize",
				}},
			}},
		},
		Actions: map[string]PanelActionHandler{
			"dispatch": func(context.Context, PanelActionRequest) (PanelActionResult, error) {
				return PanelActionResult{OK: true}, nil
			},
		},
	})
	if err != nil {
		t.Fatalf("register panel: %v", err)
	}
	registration, ok := registry.Registration("commands")
	if !ok || registration.Definition.UI == nil || len(registration.Definition.UI.Actions) != 1 {
		t.Fatalf("expected normalized command action, got %#v", registration.Definition)
	}
	field := registration.Definition.UI.Actions[0].Fields[0]
	if !field.Sensitive || field.Default != nil {
		t.Fatalf("expected sensitive field without a serialized default, got %#v", field)
	}
	payload, err := json.Marshal(field)
	if err != nil {
		t.Fatalf("marshal field: %v", err)
	}
	if strings.Contains(string(payload), "must-not-serialize") || !strings.Contains(string(payload), `"sensitive":true`) {
		t.Fatalf("unexpected sensitive field wire contract: %s", payload)
	}
}

func TestPanelDefinitionsWithContextAppliesDefinitionFilter(t *testing.T) {
	type contextKey string
	const allowActionsKey contextKey = "allow-actions"
	handler := func(context.Context, PanelActionRequest) (PanelActionResult, error) {
		return PanelActionResult{OK: true}, nil
	}
	registry := NewPanelRegistry()
	err := registry.Register("commands", PanelConfig{
		UI: &PanelUI{
			Views: PanelUIViews{
				Console: &PanelUIView{Renderer: PanelRendererJSON},
			},
			Actions: []PanelUIAction{{ID: "run", Label: "Run", Payload: map[string]any{"command_id": "secret.command"}}},
		},
		Definition: func(ctx context.Context, definition PanelDefinition) PanelDefinition {
			if ctx.Value(allowActionsKey) == true {
				return definition
			}
			if definition.UI != nil {
				ui := *definition.UI
				ui.Actions = nil
				definition.UI = &ui
			}
			return definition
		},
		Actions: map[string]PanelActionHandler{"run": handler},
	})
	if err != nil {
		t.Fatalf("register panel: %v", err)
	}

	filtered, ok := registry.DefinitionForContext(context.Background(), "commands")
	if !ok {
		t.Fatalf("expected panel definition")
	}
	if filtered.UI == nil || len(filtered.UI.Actions) != 0 {
		t.Fatalf("expected filtered actions without context grant, got %+v", filtered.UI)
	}

	allowed, ok := registry.DefinitionForContext(context.WithValue(context.Background(), allowActionsKey, true), "commands")
	if !ok {
		t.Fatalf("expected panel definition")
	}
	if allowed.UI == nil || len(allowed.UI.Actions) != 1 {
		t.Fatalf("expected action with context grant, got %+v", allowed.UI)
	}
	if allowed.UI.Actions[0].Payload["command_id"] != "secret.command" {
		t.Fatalf("expected original action payload, got %+v", allowed.UI.Actions[0].Payload)
	}
}

func TestPanelRegistrationStoresHandlersForDynamicallyExposedActions(t *testing.T) {
	type contextKey string
	const exposeActionKey contextKey = "expose-action"
	handler := func(context.Context, PanelActionRequest) (PanelActionResult, error) {
		return PanelActionResult{OK: true}, nil
	}
	registry := NewPanelRegistry()
	err := registry.Register("commands", PanelConfig{
		UI: &PanelUI{
			Views: PanelUIViews{
				Console: JSONView(""),
			},
		},
		Definition: func(ctx context.Context, definition PanelDefinition) PanelDefinition {
			if ctx.Value(exposeActionKey) != true {
				return definition
			}
			filtered := definition
			ui := &PanelUI{SchemaVersion: PanelUISchemaVersion}
			if definition.UI != nil {
				copy := *definition.UI
				ui = &copy
			}
			ui.Actions = []PanelUIAction{{ID: "Dispatch_Test_Command", Label: "Dispatch test command"}}
			filtered.UI = ui
			return filtered
		},
		Actions: map[string]PanelActionHandler{"dispatch_test_command": handler},
	})
	if err != nil {
		t.Fatalf("register panel: %v", err)
	}

	registration, ok := registry.Registration("commands")
	if !ok {
		t.Fatalf("expected panel registration")
	}
	if registration.Actions["dispatch_test_command"] == nil {
		t.Fatalf("expected dynamic action handler to remain registered, got %+v", registration.Actions)
	}
	if PanelDefinitionHasAction(registration.DefinitionForContext(context.Background()), "dispatch_test_command") {
		t.Fatalf("expected action hidden without request-scoped exposure")
	}
	ctx := context.WithValue(context.Background(), exposeActionKey, true)
	if !PanelDefinitionHasAction(registration.DefinitionForContext(ctx), "dispatch_test_command") {
		t.Fatalf("expected request-scoped definition to expose dynamic action")
	}
}

func TestPanelDefinitionsWithContextDoesNotHoldLockDuringFilter(t *testing.T) {
	type registryContextKey string
	const registerLateKey registryContextKey = "register-late"
	registry := NewPanelRegistry()
	err := registry.Register("commands", PanelConfig{
		Definition: func(ctx context.Context, definition PanelDefinition) PanelDefinition {
			if ctx.Value(registerLateKey) == true {
				if err := registry.Register("late", PanelConfig{Label: "Late"}); err != nil {
					t.Errorf("register late panel: %v", err)
				}
			}
			return definition
		},
	})
	if err != nil {
		t.Fatalf("register panel: %v", err)
	}

	done := make(chan []PanelDefinition, 1)
	go func() {
		done <- registry.DefinitionsWithContext(context.WithValue(context.Background(), registerLateKey, true))
	}()

	select {
	case defs := <-done:
		if len(defs) != 1 || defs[0].ID != "commands" {
			t.Fatalf("expected snapshot definitions before reentrant registration, got %+v", defs)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("DefinitionsWithContext held registry lock while executing definition filter")
	}
	if _, ok := registry.Registration("late"); !ok {
		t.Fatal("expected definition filter to register late panel without deadlock")
	}
}

func TestPanelUINormalizationDropsUnsupportedSchemaParts(t *testing.T) {
	registry := NewPanelRegistry()
	err := registry.Register("unsafe", PanelConfig{
		UI: &PanelUI{
			Views: PanelUIViews{
				Console: &PanelUIView{Renderer: "html", Title: "<b>bad</b>"},
			},
			Filters: []PanelUIFilter{
				{ID: "empty-select", Kind: "select"},
				{ID: "bad", Kind: "script"},
			},
			Events: &PanelUIEventPolicy{Mode: "upsert"},
		},
	})
	if err != nil {
		t.Fatalf("register panel: %v", err)
	}

	registration, ok := registry.Registration("unsafe")
	if !ok {
		t.Fatalf("expected panel registration")
	}
	if registration.Definition.UI != nil {
		t.Fatalf("expected unsupported ui to be dropped, got %+v", registration.Definition.UI)
	}
}

func TestPanelUINormalizationDropsUnsupportedSchemaVersion(t *testing.T) {
	registry := NewPanelRegistry()
	err := registry.Register("future", PanelConfig{
		UI: &PanelUI{
			SchemaVersion: "999",
			Views: PanelUIViews{
				Console: JSONView(""),
			},
		},
	})
	if err != nil {
		t.Fatalf("register panel: %v", err)
	}

	registration, ok := registry.Registration("future")
	if !ok {
		t.Fatalf("expected panel registration")
	}
	if registration.Definition.UI == nil {
		t.Fatalf("expected future-version ui marker to remain")
	}
	if registration.Definition.UI.SchemaVersion != "999" {
		t.Fatalf("expected future schema version marker, got %+v", registration.Definition.UI)
	}
	if registration.Definition.UI.Views.Console != nil || registration.Definition.UI.Views.Toolbar != nil {
		t.Fatalf("expected unsupported schema views to be dropped, got %+v", registration.Definition.UI.Views)
	}
}

func TestPanelUINormalizationSanitizesMetadata(t *testing.T) {
	registry := NewPanelRegistry()
	err := registry.Register("metadata", PanelConfig{
		UI: &PanelUI{
			Views: PanelUIViews{
				Console: JSONView(""),
			},
			Metadata: map[string]any{
				"safe":   "ok",
				"unsafe": func() {},
				"markup": "<b>bad</b>",
			},
		},
	})
	if err != nil {
		t.Fatalf("register panel: %v", err)
	}

	registration, ok := registry.Registration("metadata")
	if !ok {
		t.Fatalf("expected panel registration")
	}
	metadata := registration.Definition.UI.Metadata
	if metadata["safe"] != "ok" {
		t.Fatalf("expected safe metadata to remain, got %+v", metadata)
	}
	if _, ok := metadata["unsafe"]; ok {
		t.Fatalf("expected unsafe metadata function to be dropped")
	}
	if metadata["markup"] != "" {
		t.Fatalf("expected unsafe metadata text to be sanitized, got %+v", metadata["markup"])
	}
	if _, err := json.Marshal(registration.Definition.UI); err != nil {
		t.Fatalf("metadata should remain JSON serializable: %v", err)
	}
}

func TestPanelUINormalizationDropsActionsWithoutHandlers(t *testing.T) {
	registry := NewPanelRegistry()
	err := registry.Register("actions", PanelConfig{
		UI: &PanelUI{
			Views: PanelUIViews{
				Console: JSONView(""),
			},
			Actions: []PanelUIAction{{ID: "refresh", Label: "Refresh"}},
		},
	})
	if err != nil {
		t.Fatalf("register panel: %v", err)
	}

	registration, ok := registry.Registration("actions")
	if !ok {
		t.Fatalf("expected panel registration")
	}
	if registration.Definition.UI == nil {
		t.Fatalf("expected ui view to remain")
	}
	if len(registration.Definition.UI.Actions) != 0 {
		t.Fatalf("expected unhandled actions to be dropped, got %+v", registration.Definition.UI.Actions)
	}
	if len(registration.Actions) != 0 {
		t.Fatalf("expected no handler storage, got %+v", registration.Actions)
	}
}
