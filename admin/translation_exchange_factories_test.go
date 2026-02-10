package admin

import (
	"context"
	"testing"

	"github.com/goliatone/go-command/registry"
)

func TestRegisterTranslationExchangeCommandFactoriesDispatchesExportByName(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()

		cmd := &capturingTranslationExportCommand{}
		if _, err := RegisterCommand(bus, cmd); err != nil {
			t.Fatalf("register export command: %v", err)
		}
		if err := RegisterTranslationExchangeCommandFactories(bus); err != nil {
			t.Fatalf("register exchange factories: %v", err)
		}
		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		err := bus.DispatchByName(context.Background(), translationExportCommandName, map[string]any{
			"filter": map[string]any{
				"resources":           []any{"pages"},
				"target_locales":      []any{"es"},
				"include_source_hash": true,
			},
		}, nil)
		if err != nil {
			t.Fatalf("dispatch by name: %v", err)
		}
		if cmd.calls != 1 {
			t.Fatalf("expected export command call, got %d", cmd.calls)
		}
		if len(cmd.last.Filter.Resources) != 1 || cmd.last.Filter.Resources[0] != "pages" {
			t.Fatalf("expected resources to be parsed, got %+v", cmd.last.Filter.Resources)
		}
		if !cmd.last.Filter.IncludeSourceHash {
			t.Fatalf("expected include_source_hash=true")
		}
	})
}

func TestRegisterTranslationExchangeCommandFactoriesDispatchesRunByName(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()

		cmd := &capturingTranslationImportRunMessageCommand{}
		if _, err := RegisterCommand(bus, cmd); err != nil {
			t.Fatalf("register run command: %v", err)
		}
		if err := RegisterTranslationExchangeCommandFactories(bus); err != nil {
			t.Fatalf("register exchange factories: %v", err)
		}
		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		err := bus.DispatchByName(context.Background(), translationImportRunCommandName, map[string]any{
			"validate": map[string]any{
				"rows": []map[string]any{
					{
						"resource":             "pages",
						"entity_id":            "page-1",
						"translation_group_id": "tg-1",
						"target_locale":        "es",
						"field_path":           "title",
					},
				},
			},
			"apply": map[string]any{
				"rows": []map[string]any{
					{
						"resource":             "pages",
						"entity_id":            "page-1",
						"translation_group_id": "tg-1",
						"target_locale":        "es",
						"field_path":           "title",
						"translated_text":      "Hola",
					},
				},
				"continue_on_error": true,
			},
			"dry_run": true,
		}, nil)
		if err != nil {
			t.Fatalf("dispatch by name: %v", err)
		}
		if cmd.calls != 1 {
			t.Fatalf("expected run command call, got %d", cmd.calls)
		}
		if len(cmd.last.ValidateInput.Rows) != 1 || len(cmd.last.ApplyInput.Rows) != 1 {
			t.Fatalf("expected rows forwarded to run input, got validate=%d apply=%d", len(cmd.last.ValidateInput.Rows), len(cmd.last.ApplyInput.Rows))
		}
		if !cmd.last.ApplyInput.ContinueOnError {
			t.Fatalf("expected continue_on_error=true")
		}
		if !cmd.last.ApplyInput.DryRun {
			t.Fatalf("expected dry_run=true")
		}
		if got := cmd.last.ApplyInput.Rows[0].TranslatedText; got != "Hola" {
			t.Fatalf("expected translated text forwarded, got %q", got)
		}
	})
}

type capturingTranslationExportCommand struct {
	calls int
	last  TranslationExportInput
}

func (c *capturingTranslationExportCommand) Execute(_ context.Context, msg TranslationExportInput) error {
	c.calls++
	c.last = msg
	return nil
}

type capturingTranslationImportRunMessageCommand struct {
	calls int
	last  TranslationImportRunInput
}

func (c *capturingTranslationImportRunMessageCommand) Execute(_ context.Context, msg TranslationImportRunInput) error {
	c.calls++
	c.last = msg
	return nil
}
