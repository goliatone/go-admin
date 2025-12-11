package settings

import (
	"context"
	"testing"
)

func TestDefaultDefinitionsAndValues(t *testing.T) {
	cfg := BootstrapConfig{
		Title:            "Admin",
		DefaultLocale:    "en",
		Theme:            "light",
		DashboardEnabled: true,
		SearchEnabled:    false,
	}

	defs, values := DefaultDefinitions(cfg)
	if len(defs) != 5 {
		t.Fatalf("expected 5 default definitions, got %d", len(defs))
	}

	expectedDefaults := map[string]any{
		"admin.title":             "Admin",
		"admin.default_locale":    "en",
		"admin.theme":             "light",
		"admin.dashboard_enabled": true,
		"admin.search_enabled":    false,
	}
	for _, def := range defs {
		if expected, ok := expectedDefaults[def.Key]; ok && def.Default != expected {
			t.Fatalf("definition %s default mismatch: %v != %v", def.Key, def.Default, expected)
		}
	}

	for key, expected := range expectedDefaults {
		if got, ok := values[key]; !ok || got != expected {
			t.Fatalf("expected system value for %s to be %v, got %v", key, expected, got)
		}
	}
}

func TestBootstrapDefaultsInvokesHooks(t *testing.T) {
	cfg := BootstrapConfig{
		Title:            "Admin",
		DefaultLocale:    "en",
		Theme:            "light",
		DashboardEnabled: true,
		SearchEnabled:    true,
	}
	registered := []DefaultDefinition{}
	applied := map[string]any{}

	err := BootstrapDefaults(
		context.Background(),
		cfg,
		func(def DefaultDefinition) { registered = append(registered, def) },
		func(ctx context.Context, values map[string]any) error {
			for k, v := range values {
				applied[k] = v
			}
			return nil
		},
	)
	if err != nil {
		t.Fatalf("bootstrap defaults returned error: %v", err)
	}
	if len(registered) != 5 {
		t.Fatalf("expected 5 definitions registered, got %d", len(registered))
	}
	if len(applied) == 0 {
		t.Fatalf("expected system values applied")
	}
	if applied["admin.title"] != "Admin" || applied["admin.dashboard_enabled"] != true {
		t.Fatalf("unexpected applied values: %+v", applied)
	}
}
