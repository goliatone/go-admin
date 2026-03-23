package admin

import (
	"context"
	"reflect"
	"testing"
)

func TestNormalizeContentTypeCapabilitiesMigratesLegacyDeliveryMenu(t *testing.T) {
	normalized, validation := NormalizeContentTypeCapabilities(map[string]any{
		"delivery": map[string]any{
			"enabled": true,
			"kind":    "page",
			"menu": map[string]any{
				"location":  "site.footer",
				"label_key": "menu.news",
			},
		},
	})
	if len(validation) > 0 {
		t.Fatalf("expected no validation errors, got %+v", validation)
	}

	navigation, _ := normalized["navigation"].(map[string]any)
	if navigation == nil {
		t.Fatalf("expected navigation contract to be synthesized from delivery.menu")
	}
	if enabled, ok := navigation["enabled"].(bool); !ok || !enabled {
		t.Fatalf("expected navigation.enabled=true, got %+v", navigation["enabled"])
	}
	if got := toStringSlice(navigation["eligible_locations"]); len(got) != 1 || got[0] != "site.footer" {
		t.Fatalf("expected eligible_locations=[site.footer], got %+v", navigation["eligible_locations"])
	}
	if got := toStringSlice(navigation["default_locations"]); len(got) != 1 || got[0] != "site.footer" {
		t.Fatalf("expected default_locations=[site.footer], got %+v", navigation["default_locations"])
	}
}

func TestNormalizeContentTypeCapabilitiesValidatesNavigationDefaultsSubset(t *testing.T) {
	_, validation := NormalizeContentTypeCapabilities(map[string]any{
		"navigation": map[string]any{
			"enabled":            true,
			"eligible_locations": []string{"site.main"},
			"default_locations":  []string{"site.footer"},
		},
	})
	if validation["capabilities.navigation.default_locations"] == "" {
		t.Fatalf("expected default_locations subset validation error, got %+v", validation)
	}
}

func TestValidateAndNormalizeContentTypeCapabilitiesRejectsInvalidBooleanTypes(t *testing.T) {
	_, err := ValidateAndNormalizeContentTypeCapabilities(map[string]any{
		"navigation": map[string]any{
			"allow_instance_override": "not-a-bool",
		},
	})
	if err == nil {
		t.Fatalf("expected validation error for invalid allow_instance_override type")
	}
}

func TestNormalizeContentTypeCapabilitiesUsesCMSCanonicalSearchIndex(t *testing.T) {
	normalized, validation := NormalizeContentTypeCapabilities(map[string]any{
		"search_collection": "legacy_articles",
		"search_index":      "documents",
	})
	if len(validation) > 0 {
		t.Fatalf("expected no validation errors, got %+v", validation)
	}
	search, _ := normalized["search"].(map[string]any)
	if search == nil {
		t.Fatalf("expected search capability")
	}
	if search["index"] != "documents" {
		t.Fatalf("expected canonical search.index=document, got %+v", search["index"])
	}
	if _, ok := search["collection"]; ok {
		t.Fatalf("expected collection alias removed, got %+v", search)
	}
}

func TestBackfillContentTypeNavigationDefaults(t *testing.T) {
	svc := NewInMemoryContentService()
	svc.types[cmsScopedKey("", "ctype-1")] = CMSContentType{
		ID:     "ctype-1",
		Name:   "News",
		Slug:   "news",
		Schema: map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"menu": map[string]any{
					"location": "site.footer",
				},
			},
		},
	}
	svc.typeSlugs[cmsScopedKey("", "news")] = "ctype-1"

	updated, err := BackfillContentTypeNavigationDefaults(context.Background(), svc)
	if err != nil {
		t.Fatalf("backfill failed: %v", err)
	}
	if updated != 1 {
		t.Fatalf("expected one updated content type, got %d", updated)
	}

	record, err := svc.ContentTypeBySlug(context.Background(), "news")
	if err != nil {
		t.Fatalf("lookup failed: %v", err)
	}
	contracts := ReadContentTypeCapabilityContracts(*record)
	if contracts.MigratedDeliveryMenu {
		t.Fatalf("expected stored canonical payload to not require legacy migration marker")
	}
	if delivery, _ := contracts.Delivery["menu"].(map[string]any); len(delivery) > 0 {
		t.Fatalf("expected delivery.menu removed from canonical contract, got %+v", delivery)
	}
	if got := toStringSlice(contracts.Navigation["default_locations"]); len(got) != 1 || got[0] != "site.footer" {
		t.Fatalf("expected default_locations=[site.footer], got %+v", contracts.Navigation["default_locations"])
	}
}

func TestContentTypeCapabilityContractsStableAcrossLocaleContexts(t *testing.T) {
	repo := NewCMSContentTypeRepository(NewInMemoryContentService())
	created, err := repo.Create(context.Background(), map[string]any{
		"name": "Article",
		"slug": "article",
		"schema": map[string]any{
			"fields": []map[string]any{{"name": "title", "type": "string"}},
		},
		"capabilities": map[string]any{
			"delivery": map[string]any{
				"kind": "hybrid",
				"routes": map[string]any{
					"list":   "/news",
					"detail": "/news/:slug",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	id := toString(created["id"])
	if id == "" {
		t.Fatalf("expected content type id")
	}

	enRecord, err := repo.Get(WithLocale(context.Background(), "en"), id)
	if err != nil {
		t.Fatalf("get(en) failed: %v", err)
	}
	esRecord, err := repo.Get(WithLocale(context.Background(), "es"), id)
	if err != nil {
		t.Fatalf("get(es) failed: %v", err)
	}

	enContracts, _ := enRecord["capability_contracts"].(map[string]any)
	esContracts, _ := esRecord["capability_contracts"].(map[string]any)
	if !reflect.DeepEqual(enContracts, esContracts) {
		t.Fatalf("expected locale-stable capability contracts, en=%+v es=%+v", enContracts, esContracts)
	}
	if len(extractMap(enContracts["navigation_defaults_editor"])) == 0 {
		t.Fatalf("expected navigation defaults editor contract in capability_contracts")
	}
	overrideContract := extractMap(enContracts["entry_navigation_overrides"])
	valueEnum := toStringSlice(overrideContract["value_enum"])
	if len(valueEnum) != 3 || valueEnum[0] != NavigationOverrideInherit || valueEnum[1] != NavigationOverrideShow || valueEnum[2] != NavigationOverrideHide {
		t.Fatalf("expected entry navigation override tri-state contract, got %+v", valueEnum)
	}
	if len(extractMap(enContracts["entry_navigation_examples"])) == 0 {
		t.Fatalf("expected entry navigation examples contract")
	}
	if len(extractMap(enContracts["entry_navigation_validation"])) == 0 {
		t.Fatalf("expected entry navigation validation contract")
	}
}
