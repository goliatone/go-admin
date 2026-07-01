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

	navigation := mustAs[map[string]any](normalized["navigation"])
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

func TestNormalizeContentTypeCapabilitiesCanonicalizesNestedNavigationAliases(t *testing.T) {
	normalized, validation := NormalizeContentTypeCapabilities(map[string]any{
		"navigation": map[string]any{
			"enabled":               true,
			"eligibleLocations":     []string{"site.footer", "site.main"},
			"defaultLocations":      []string{"site.footer"},
			"defaultVisible":        false,
			"allowInstanceOverride": false,
		},
	})
	if len(validation) > 0 {
		t.Fatalf("expected no validation errors, got %+v", validation)
	}

	navigation := mustAs[map[string]any](normalized["navigation"])
	if navigation == nil {
		t.Fatalf("expected navigation contract")
	}
	if got, want := toStringSlice(navigation["eligible_locations"]), []string{"site.footer", "site.main"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("eligible locations mismatch: got %+v want %+v", got, want)
	}
	if got, want := toStringSlice(navigation["default_locations"]), []string{"site.footer"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("default locations mismatch: got %+v want %+v", got, want)
	}
	if toBool(navigation["default_visible"]) {
		t.Fatalf("expected default_visible=false, got %+v", navigation["default_visible"])
	}
	if toBool(navigation["allow_instance_override"]) {
		t.Fatalf("expected allow_instance_override=false, got %+v", navigation["allow_instance_override"])
	}
	for _, alias := range []string{"eligibleLocations", "defaultLocations", "defaultVisible", "allowInstanceOverride"} {
		if _, ok := navigation[alias]; ok {
			t.Fatalf("expected alias %q to be removed from canonical navigation contract: %+v", alias, navigation)
		}
	}
}

func TestNormalizeContentTypeCapabilitiesPreservesExplicitEmptyNavigationLocations(t *testing.T) {
	cases := map[string]map[string]any{
		"canonical_nested": {
			"navigation": map[string]any{
				"enabled":            true,
				"eligible_locations": []string{},
			},
		},
		"camel_nested": {
			"navigation": map[string]any{
				"enabled":           true,
				"eligibleLocations": []any{},
			},
		},
		"flat_alias": {
			"navigation_enabled":            true,
			"navigation_eligible_locations": []string{},
		},
	}

	for name, input := range cases {
		t.Run(name, func(t *testing.T) {
			normalized, validation := NormalizeContentTypeCapabilities(input)
			if len(validation) > 0 {
				t.Fatalf("expected no validation errors, got %+v", validation)
			}
			assertExplicitEmptyNavigationLocations(t, normalized)

			validated, err := ValidateAndNormalizeContentTypeCapabilities(input)
			if err != nil {
				t.Fatalf("validate and normalize failed: %v", err)
			}
			assertExplicitEmptyNavigationLocations(t, validated)

			contracts := ParseContentTypeCapabilityContracts(input)
			assertExplicitEmptyNavigationLocations(t, contracts.Normalized)
			if _, exists := contracts.Navigation["eligible_locations"]; !exists {
				t.Fatalf("expected navigation contract to keep explicit empty eligible_locations: %+v", contracts.Navigation)
			}
			if got := toStringSlice(contracts.Navigation["eligible_locations"]); len(got) != 0 {
				t.Fatalf("expected empty navigation contract eligible_locations, got %+v", got)
			}
			if _, exists := contracts.Navigation["default_locations"]; exists {
				t.Fatalf("expected synthesized default_locations to be removed from explicit empty policy: %+v", contracts.Navigation)
			}
		})
	}
}

func TestNormalizeContentTypeCapabilitiesPreservesStringNavigationLocations(t *testing.T) {
	cases := map[string]map[string]any{
		"canonical_nested": {
			"navigation": map[string]any{
				"enabled":            true,
				"eligible_locations": "site.main, site.footer",
				"default_locations":  "site.main",
			},
		},
		"camel_nested": {
			"navigation": map[string]any{
				"enabled":           true,
				"eligibleLocations": "site.main, site.footer",
				"defaultLocations":  "site.footer",
			},
		},
		"flat_alias": {
			"navigation_enabled":            true,
			"navigation_eligible_locations": "site.main, site.footer",
			"navigation_default_locations":  "site.footer",
		},
	}

	for name, input := range cases {
		t.Run(name, func(t *testing.T) {
			normalized, validation := NormalizeContentTypeCapabilities(input)
			if len(validation) > 0 {
				t.Fatalf("expected no validation errors, got %+v", validation)
			}
			navigation := extractMap(normalized["navigation"])
			if got, want := toStringSlice(navigation["eligible_locations"]), []string{"site.footer", "site.main"}; !reflect.DeepEqual(got, want) {
				t.Fatalf("eligible locations mismatch: got %+v want %+v", got, want)
			}
			if got := toStringSlice(navigation["default_locations"]); len(got) != 1 {
				t.Fatalf("expected one default location, got %+v", got)
			}
		})
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
	search := mustAs[map[string]any](normalized["search"])
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

func TestInMemoryContentTypeServicePreservesExplicitEmptyNavigationLocations(t *testing.T) {
	svc := NewInMemoryContentService()
	ctx := context.Background()

	created, err := svc.CreateContentType(ctx, CMSContentType{
		Name:   "News",
		Slug:   "news",
		Schema: map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}},
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled":           true,
				"eligibleLocations": []string{},
			},
		},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	assertExplicitEmptyNavigationLocations(t, created.Capabilities)

	updated, err := svc.UpdateContentType(ctx, CMSContentType{
		ID:                  created.ID,
		ReplaceCapabilities: true,
		Capabilities: map[string]any{
			"navigation_enabled":            true,
			"navigation_eligible_locations": []any{},
		},
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	assertExplicitEmptyNavigationLocations(t, updated.Capabilities)
}

func TestCMSContentTypeRepositoryPreservesExplicitEmptyNavigationLocations(t *testing.T) {
	repo := NewCMSContentTypeRepository(NewInMemoryContentService())

	created, err := repo.Create(context.Background(), map[string]any{
		"name": "Article",
		"slug": "article",
		"schema": map[string]any{
			"fields": []map[string]any{{"name": "title", "type": "string"}},
		},
		"capabilities": map[string]any{
			"navigation": map[string]any{
				"enabled":            true,
				"eligible_locations": []string{},
			},
		},
	})
	if err != nil {
		t.Fatalf("repository create failed: %v", err)
	}
	assertExplicitEmptyNavigationLocations(t, extractMap(created["capabilities"]))

	updated, err := repo.Update(context.Background(), "article", map[string]any{
		"replace_capabilities": true,
		"capabilities": map[string]any{
			"navigation": map[string]any{
				"enabled":           true,
				"eligibleLocations": []any{},
			},
		},
	})
	if err != nil {
		t.Fatalf("repository update failed: %v", err)
	}
	assertExplicitEmptyNavigationLocations(t, extractMap(updated["capabilities"]))
}

func TestCMSContentTypeRepositoryPreservesStringNavigationLocations(t *testing.T) {
	repo := NewCMSContentTypeRepository(NewInMemoryContentService())

	created, err := repo.Create(context.Background(), map[string]any{
		"name": "Article",
		"slug": "article",
		"schema": map[string]any{
			"fields": []map[string]any{{"name": "title", "type": "string"}},
		},
		"capabilities": map[string]any{
			"navigation": map[string]any{
				"enabled":            true,
				"eligible_locations": "site.main, site.footer",
				"default_locations":  "site.main",
			},
		},
	})
	if err != nil {
		t.Fatalf("repository create failed: %v", err)
	}
	navigation := extractMap(extractMap(created["capabilities"])["navigation"])
	if got, want := toStringSlice(navigation["eligible_locations"]), []string{"site.footer", "site.main"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("eligible locations mismatch: got %+v want %+v", got, want)
	}
	if got, want := toStringSlice(navigation["default_locations"]), []string{"site.main"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("default locations mismatch: got %+v want %+v", got, want)
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
	if delivery := extractMap(contracts.Delivery["menu"]); len(delivery) > 0 {
		t.Fatalf("expected delivery.menu removed from canonical contract, got %+v", delivery)
	}
	if got := toStringSlice(contracts.Navigation["default_locations"]); len(got) != 1 || got[0] != "site.footer" {
		t.Fatalf("expected default_locations=[site.footer], got %+v", contracts.Navigation["default_locations"])
	}
}

func TestBackfillContentTypeNavigationDefaultsPreservesExplicitEmptyNavigationLocations(t *testing.T) {
	svc := NewInMemoryContentService()
	svc.types[cmsScopedKey("", "ctype-1")] = CMSContentType{
		ID:     "ctype-1",
		Name:   "News",
		Slug:   "news",
		Schema: map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}},
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled":           true,
				"eligibleLocations": []string{},
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
	assertExplicitEmptyNavigationLocations(t, record.Capabilities)
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

	enContracts := mustAs[map[string]any](enRecord["capability_contracts"])
	esContracts := mustAs[map[string]any](esRecord["capability_contracts"])
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

func assertExplicitEmptyNavigationLocations(t *testing.T, capabilities map[string]any) {
	t.Helper()
	navigation := extractMap(capabilities["navigation"])
	if len(navigation) == 0 {
		t.Fatalf("expected navigation capability, got %+v", capabilities)
	}
	raw, exists := navigation["eligible_locations"]
	if !exists {
		t.Fatalf("expected explicit empty eligible_locations to be persisted, got %+v", navigation)
	}
	if got := toStringSlice(raw); len(got) != 0 {
		t.Fatalf("expected eligible_locations to be empty, got %+v", got)
	}
	if _, exists := navigation["default_locations"]; exists {
		t.Fatalf("expected synthesized default_locations to be absent, got %+v", navigation)
	}
}
