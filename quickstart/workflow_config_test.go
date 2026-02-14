package quickstart

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestParseWorkflowConfigContentsYAML(t *testing.T) {
	raw := []byte(`
schema_version: 1
trait_defaults:
  Editorial: editorial.default
workflows:
  editorial.news:
    initial_state: draft
    transitions:
      - name: submit_for_approval
        from: draft
        to: approval
      - name: publish
        from: approval
        to: published
`)

	cfg, err := ParseWorkflowConfigContents(raw, ".yaml")
	if err != nil {
		t.Fatalf("parse workflow config yaml: %v", err)
	}
	if cfg.SchemaVersion != 1 {
		t.Fatalf("expected schema_version 1, got %d", cfg.SchemaVersion)
	}
	if got := cfg.TraitDefaults["editorial"]; got != "editorial.default" {
		t.Fatalf("expected normalized trait default, got %+v", cfg.TraitDefaults)
	}
	defs := WorkflowDefinitionsFromConfig(cfg)
	news, ok := defs["editorial.news"]
	if !ok {
		t.Fatalf("expected editorial.news workflow in definitions, got %+v", defs)
	}
	if news.EntityType != "editorial.news" || news.InitialState != "draft" {
		t.Fatalf("expected normalized workflow definition, got %+v", news)
	}
	if len(news.Transitions) != 2 {
		t.Fatalf("expected 2 transitions, got %+v", news.Transitions)
	}
}

func TestParseWorkflowConfigContentsJSONSupportsLegacyTraitDefaultsAlias(t *testing.T) {
	raw := []byte(`{
  "schema_version": 1,
  "trait_workflow_defaults": {
    "editorial": "editorial.default"
  },
  "trait_defaults": {
    "editorial": "editorial.news"
  },
  "workflows": {
    "editorial.news": {
      "initial_state": "draft",
      "transitions": [
        {"name":"publish","from":"draft","to":"published"}
      ]
    }
  }
}`)

	cfg, err := ParseWorkflowConfigContents(raw, ".json")
	if err != nil {
		t.Fatalf("parse workflow config json: %v", err)
	}
	if got := cfg.TraitDefaults["editorial"]; got != "editorial.news" {
		t.Fatalf("expected canonical trait_defaults to override legacy alias, got %+v", cfg.TraitDefaults)
	}
}

func TestNormalizeWorkflowConfigNormalizesWorkflowIDsAndTransitions(t *testing.T) {
	cfg := NormalizeWorkflowConfig(WorkflowConfig{
		SchemaVersion: 0,
		Workflows: map[string]WorkflowDefinitionSpec{
			" editorial.news ": {
				InitialState: " draft ",
				Transitions: []WorkflowTransitionSpec{
					{
						Name: " publish ",
						From: " draft ",
						To:   " published ",
					},
				},
			},
		},
		TraitDefaults: map[string]string{
			" Editorial ": " editorial.default ",
			"":            "ignored",
		},
	})

	if cfg.SchemaVersion != WorkflowConfigSchemaVersionCurrent {
		t.Fatalf("expected default schema version %d, got %d", WorkflowConfigSchemaVersionCurrent, cfg.SchemaVersion)
	}
	spec, ok := cfg.Workflows["editorial.news"]
	if !ok {
		t.Fatalf("expected normalized workflow id key, got %+v", cfg.Workflows)
	}
	if spec.ID != "editorial.news" || spec.InitialState != "draft" {
		t.Fatalf("expected normalized workflow spec, got %+v", spec)
	}
	if len(spec.Transitions) != 1 || spec.Transitions[0].Name != "publish" || spec.Transitions[0].From != "draft" || spec.Transitions[0].To != "published" {
		t.Fatalf("expected normalized transition, got %+v", spec.Transitions)
	}
	if got := cfg.TraitDefaults["editorial"]; got != "editorial.default" {
		t.Fatalf("expected normalized trait defaults, got %+v", cfg.TraitDefaults)
	}
}

func TestLoadWorkflowConfigFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "workflow.yaml")
	contents := []byte(`
workflows:
  editorial.news:
    initial_state: draft
    transitions:
      - name: publish
        from: draft
        to: published
trait_defaults:
  editorial: editorial.news
`)
	if err := os.WriteFile(path, contents, 0o600); err != nil {
		t.Fatalf("write workflow config fixture: %v", err)
	}

	cfg, err := LoadWorkflowConfigFile(path)
	if err != nil {
		t.Fatalf("load workflow config file: %v", err)
	}
	defs := WorkflowDefinitionsFromConfig(cfg)
	if _, ok := defs["editorial.news"]; !ok {
		t.Fatalf("expected workflow definitions from file, got %+v", defs)
	}
	defaults := WorkflowTraitDefaultsFromConfig(cfg)
	if got := defaults["editorial"]; got != "editorial.news" {
		t.Fatalf("expected trait defaults from file, got %+v", defaults)
	}
}

func TestParseWorkflowConfigContentsRejectsUnsupportedExtension(t *testing.T) {
	_, err := ParseWorkflowConfigContents([]byte(`{}`), ".toml")
	if err == nil {
		t.Fatalf("expected unsupported extension error")
	}
	if !errors.Is(err, ErrWorkflowConfig) {
		t.Fatalf("expected ErrWorkflowConfig, got %v", err)
	}
}

func TestValidateWorkflowConfigRejectsInvalidDefinitions(t *testing.T) {
	cfg := WorkflowConfig{
		SchemaVersion: 99,
		Workflows: map[string]WorkflowDefinitionSpec{
			"editorial.news": {
				InitialState: "",
				Transitions: []WorkflowTransitionSpec{
					{Name: "publish", From: "draft", To: "published"},
					{Name: "publish", From: "approval", To: "published"},
					{Name: "", From: "draft", To: ""},
				},
			},
		},
	}
	err := ValidateWorkflowConfig(cfg)
	if err == nil {
		t.Fatalf("expected validation error")
	}
	if !errors.Is(err, ErrWorkflowConfig) {
		t.Fatalf("expected ErrWorkflowConfig, got %v", err)
	}
	if !strings.Contains(err.Error(), "schema_version") || !strings.Contains(err.Error(), "initial_state") || !strings.Contains(err.Error(), "duplicate transition name") {
		t.Fatalf("expected actionable field-level issues, got %v", err)
	}
}

func TestMergeWorkflowConfigsOverrideWins(t *testing.T) {
	base := WorkflowConfig{
		Workflows: map[string]WorkflowDefinitionSpec{
			"editorial.default": {
				InitialState: "draft",
				Transitions: []WorkflowTransitionSpec{
					{Name: "publish", From: "draft", To: "published"},
				},
			},
		},
		TraitDefaults: map[string]string{
			"editorial": "editorial.default",
		},
	}
	override := WorkflowConfig{
		Workflows: map[string]WorkflowDefinitionSpec{
			"editorial.default": {
				InitialState: "created",
				Transitions: []WorkflowTransitionSpec{
					{Name: "submit_for_approval", From: "created", To: "approval"},
				},
			},
		},
		TraitDefaults: map[string]string{
			"editorial": "editorial.news",
		},
	}

	merged := MergeWorkflowConfigs(base, override)
	if got := merged.Workflows["editorial.default"].InitialState; got != "created" {
		t.Fatalf("expected override workflow definition, got %+v", merged.Workflows["editorial.default"])
	}
	if got := merged.TraitDefaults["editorial"]; got != "editorial.news" {
		t.Fatalf("expected override trait default, got %+v", merged.TraitDefaults)
	}
}

func TestValidateWorkflowTraitDefaultsReferencesRejectsUnknownWorkflow(t *testing.T) {
	engine := admin.NewSimpleWorkflowEngine()
	engine.RegisterWorkflow("editorial.default", admin.WorkflowDefinition{
		EntityType:   "editorial.default",
		InitialState: "draft",
		Transitions: []admin.WorkflowTransition{
			{Name: "publish", From: "draft", To: "published"},
		},
	})

	err := validateWorkflowTraitDefaultsReferences(
		map[string]string{"editorial": "editorial.news"},
		map[string]admin.WorkflowDefinition{},
		engine,
	)
	if err == nil {
		t.Fatalf("expected unknown workflow reference error")
	}
	if !errors.Is(err, ErrWorkflowConfig) {
		t.Fatalf("expected ErrWorkflowConfig, got %v", err)
	}
	if !strings.Contains(err.Error(), "trait_defaults.editorial") {
		t.Fatalf("expected actionable trait_defaults field path, got %v", err)
	}
}
