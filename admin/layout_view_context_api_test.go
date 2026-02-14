package admin

import (
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestEnrichLayoutViewContextIncludesAssetBasePath(t *testing.T) {
	view := EnrichLayoutViewContext(nil, nil, router.ViewContext{
		"base_path": "/admin",
	}, "")
	if got := view["asset_base_path"]; got != "/admin" {
		t.Fatalf("expected asset_base_path /admin, got %v", got)
	}
}

func TestEnrichLayoutViewContextPreservesActiveModule(t *testing.T) {
	view := EnrichLayoutViewContext(nil, nil, router.ViewContext{
		"base_path": "/admin",
	}, "users")
	if got := view["active"]; got != "users" {
		t.Fatalf("expected active users, got %v", got)
	}
}

func TestEnrichLayoutViewContextIncludesTranslationCapabilities(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin"}, Dependencies{
		FeatureGate: featureGateFromKeys(
			FeatureCMS,
			FeatureDashboard,
			FeatureTranslationExchange,
			FeatureTranslationQueue,
		),
	})

	view := EnrichLayoutViewContext(adm, nil, router.ViewContext{
		"base_path": "/admin",
	}, "")

	caps, ok := view["translation_capabilities"].(map[string]any)
	if !ok {
		t.Fatalf("expected translation_capabilities map, got %T", view["translation_capabilities"])
	}
	if profile, _ := caps["profile"].(string); profile != "full" {
		t.Fatalf("expected translation profile full, got %v", caps["profile"])
	}
	if schemaVersion, _ := caps["schema_version"].(int); schemaVersion != translationCapabilitiesSchemaVersionCurrent {
		t.Fatalf("expected schema version %d, got %v", translationCapabilitiesSchemaVersionCurrent, caps["schema_version"])
	}

	modules, _ := caps["modules"].(map[string]any)
	exchange, _ := modules["exchange"].(map[string]any)
	if enabled, _ := exchange["enabled"].(bool); !enabled {
		t.Fatalf("expected exchange module enabled")
	}
	queue, _ := modules["queue"].(map[string]any)
	if enabled, _ := queue["enabled"].(bool); !enabled {
		t.Fatalf("expected queue module enabled")
	}

	routes, _ := caps["routes"].(map[string]string)
	if strings.TrimSpace(routes["admin.translations.queue"]) == "" {
		t.Fatalf("expected admin.translations.queue route")
	}
	if strings.TrimSpace(routes["admin.translations.exchange"]) == "" {
		t.Fatalf("expected admin.translations.exchange route")
	}
}

func TestEnrichLayoutViewContextPreservesProvidedTranslationCapabilities(t *testing.T) {
	custom := map[string]any{
		"profile": "custom",
	}
	view := EnrichLayoutViewContext(nil, nil, router.ViewContext{
		"base_path":                "/admin",
		"translation_capabilities": custom,
	}, "")
	if got, _ := view["translation_capabilities"].(map[string]any); got["profile"] != "custom" {
		t.Fatalf("expected custom translation capabilities to be preserved, got %v", view["translation_capabilities"])
	}
}
