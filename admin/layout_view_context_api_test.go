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
	if profile := mustAs[string](caps["profile"]); profile != "full" {
		t.Fatalf("expected translation profile full, got %v", caps["profile"])
	}
	if schemaVersion := mustAs[int](caps["schema_version"]); schemaVersion != translationCapabilitiesSchemaVersionCurrent {
		t.Fatalf("expected schema version %d, got %v", translationCapabilitiesSchemaVersionCurrent, caps["schema_version"])
	}

	modules := mustAs[map[string]any](caps["modules"])
	exchange := mustAs[map[string]any](modules["exchange"])
	if enabled := mustAs[bool](exchange["enabled"]); !enabled {
		t.Fatalf("expected exchange module enabled")
	}
	queue := mustAs[map[string]any](modules["queue"])
	if enabled := mustAs[bool](queue["enabled"]); !enabled {
		t.Fatalf("expected queue module enabled")
	}

	routes := mustAs[map[string]string](caps["routes"])
	if strings.TrimSpace(routes["admin.translations.queue"]) == "" {
		t.Fatalf("expected admin.translations.queue route")
	}
	if strings.TrimSpace(routes["admin.translations.dashboard"]) == "" {
		t.Fatalf("expected admin.translations.dashboard route")
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
	if got := mustAs[map[string]any](view["translation_capabilities"]); got["profile"] != "custom" {
		t.Fatalf("expected custom translation capabilities to be preserved, got %v", view["translation_capabilities"])
	}
}
