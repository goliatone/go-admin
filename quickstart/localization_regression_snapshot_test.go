package quickstart

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestQuickstartLocalizationRegressionSnapshot(t *testing.T) {
	funcs := DefaultTemplateFuncs(
		WithTemplateTranslator(templateTranslatorStub{
			values: map[string]string{
				"en:menu.home": "Home",
				"es:menu.home": "Inicio",
			},
			countValues: map[string]string{
				"es:items.count:2": "2 articulos",
			},
		}),
		WithTemplateDefaultLocale("en"),
	)

	translate := funcs["translate"].(func(...any) string)
	translateCount := funcs["translate_count"].(func(...any) string)
	currentLocale := funcs["current_locale"].(func(...any) string)

	snapshot := map[string]any{
		"current_locale_default":  currentLocale(),
		"current_locale_scoped":   currentLocale(map[string]any{"site_runtime": map[string]any{"locale": "es"}}),
		"translated_default":      translate("menu.home"),
		"translated_scoped":       translate(map[string]any{"resolved_locale": "es"}, "menu.home"),
		"translated_count_scoped": translateCount(map[string]any{"locale": "es"}, "items.count", 2),
	}

	assertQuickstartLocalizationSnapshot(t, snapshot, filepath.Join("testdata", "localization_regression_snapshot.json"))
}

func assertQuickstartLocalizationSnapshot(t *testing.T, payload map[string]any, snapshotPath string) {
	t.Helper()
	got, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		t.Fatalf("marshal quickstart localization snapshot: %v", err)
	}
	want, err := os.ReadFile(snapshotPath)
	if err != nil {
		t.Fatalf("read snapshot %q: %v", snapshotPath, err)
	}
	if !bytes.Equal(bytes.TrimSpace(got), bytes.TrimSpace(want)) {
		t.Fatalf("quickstart localization snapshot mismatch\nexpected:\n%s\n\ngot:\n%s", string(want), string(got))
	}
}
