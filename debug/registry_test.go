package debug

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
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
			Actions: []PanelUIAction{
				{ID: "Refresh", Label: "Refresh", Refresh: true},
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

	registration, ok := registry.Registration("cache")
	if !ok {
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
	if _, ok := def.UI.Views.Console.Options["unsafe"]; ok {
		t.Fatalf("expected unsafe function option to be dropped")
	}
	if len(def.UI.Filters) != 1 || def.UI.Filters[0].ID != "status" {
		t.Fatalf("expected normalized filter, got %+v", def.UI.Filters)
	}
	if def.UI.Events == nil || def.UI.Events.Mode != PanelEventUpsert || def.UI.Events.Key != "id" {
		t.Fatalf("expected normalized event policy, got %+v", def.UI.Events)
	}
	if len(def.UI.Actions) != 1 || def.UI.Actions[0].ID != "refresh" {
		t.Fatalf("expected only handled unique action, got %+v", def.UI.Actions)
	}
	if len(registration.Actions) != 1 || registration.Actions["refresh"] == nil {
		t.Fatalf("expected normalized handler storage, got %+v", registration.Actions)
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
