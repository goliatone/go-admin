package admin

import (
	"reflect"
	"testing"
)

func TestEntryNavigationPolicyFromContentTypeExportsCapabilityContract(t *testing.T) {
	policy := EntryNavigationPolicyFromContentType(CMSContentType{
		Slug: "page",
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled":                 true,
				"eligible_locations":      []any{"site.footer", "site.main", "site.main"},
				"default_locations":       []any{"site.main"},
				"default_visible":         true,
				"allow_instance_override": false,
			},
		},
	})

	if !policy.Enabled {
		t.Fatalf("expected navigation policy to be enabled")
	}
	if got, want := policy.EligibleLocations, []string{"site.footer", "site.main"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("eligible locations mismatch: got %+v want %+v", got, want)
	}
	if got, want := policy.DefaultLocations, []string{"site.main"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("default locations mismatch: got %+v want %+v", got, want)
	}
	if policy.AllowInstanceOverride {
		t.Fatalf("expected allow_instance_override=false")
	}
}

func TestEvaluateEntryNavigationTriStateVisibility(t *testing.T) {
	policy := EntryNavigationPolicy{
		Enabled:               true,
		EligibleLocations:     []string{"site.main", "site.footer", "site.utility"},
		DefaultLocations:      []string{"site.footer"},
		DefaultVisible:        true,
		AllowInstanceOverride: true,
	}

	eval, err := EvaluateEntryNavigation(map[string]any{
		"site.main":    "show",
		"site.footer":  "hide",
		"site.utility": "inherit",
	}, policy, true)
	if err != nil {
		t.Fatalf("evaluate navigation: %v", err)
	}

	if got := eval.Overrides["site.main"]; got != NavigationOverrideShow {
		t.Fatalf("expected site.main show override, got %q", got)
	}
	if got := eval.Overrides["site.footer"]; got != NavigationOverrideHide {
		t.Fatalf("expected site.footer hide override, got %q", got)
	}
	if got, want := eval.EffectiveLocations, []string{"site.main"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("effective locations mismatch: got %+v want %+v", got, want)
	}
	if !eval.EffectiveVisibility["site.main"] || eval.EffectiveVisibility["site.footer"] || eval.EffectiveVisibility["site.utility"] {
		t.Fatalf("effective visibility mismatch: %+v", eval.EffectiveVisibility)
	}
}

func TestEvaluateEntryNavigationRejectsInvalidValuesAndDisabledPolicy(t *testing.T) {
	policy := EntryNavigationPolicy{
		Enabled:               true,
		EligibleLocations:     []string{"site.main"},
		DefaultLocations:      []string{"site.main"},
		DefaultVisible:        true,
		AllowInstanceOverride: true,
	}
	if _, err := EvaluateEntryNavigation(map[string]any{"site.main": "sometimes"}, policy, true); err == nil {
		t.Fatalf("expected invalid override value to fail")
	}
	if _, err := EvaluateEntryNavigation(map[string]any{"site.footer": "show"}, policy, true); err == nil {
		t.Fatalf("expected invalid location to fail in strict mode")
	}

	disabled := policy
	disabled.Enabled = false
	if _, err := EvaluateEntryNavigation(map[string]any{"site.main": "show"}, disabled, true); err == nil {
		t.Fatalf("expected disabled policy with overrides to fail in strict mode")
	}
}

func TestApplyEntryNavigationWriteContractHandlesDisabledOverrides(t *testing.T) {
	policy := EntryNavigationPolicy{
		Enabled:               true,
		EligibleLocations:     []string{"site.main", "site.footer"},
		DefaultLocations:      []string{"site.main"},
		DefaultVisible:        true,
		AllowInstanceOverride: false,
	}
	record := map[string]any{
		"_navigation": map[string]any{
			"site.main":   "hide",
			"site.footer": "show",
		},
	}

	if err := ApplyEntryNavigationWriteContract(record, policy, true); err != nil {
		t.Fatalf("apply write contract: %v", err)
	}
	if nav := extractMap(record["_navigation"]); len(nav) != 0 {
		t.Fatalf("expected overrides to be dropped when instance overrides are disabled, got %+v", nav)
	}
	if got, want := toStringSlice(record["effective_menu_locations"]), []string{"site.main"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("effective locations mismatch: got %+v want %+v", got, want)
	}
	visibility := extractMap(record["effective_navigation_visibility"])
	if !toBool(visibility["site.main"]) || toBool(visibility["site.footer"]) {
		t.Fatalf("effective visibility mismatch: %+v", visibility)
	}
}

func TestEntryNavigationPolicyOptionsPreserveDefaultCapabilityBehavior(t *testing.T) {
	contentType := CMSContentType{
		Slug: "page",
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled":                 true,
				"eligible_locations":      []string{"site.main", "site.footer"},
				"default_locations":       []string{"site.footer"},
				"default_visible":         true,
				"allow_instance_override": true,
			},
		},
	}

	got := EntryNavigationPolicyFromOptions(contentType, EntryNavigationOptions{})
	want := EntryNavigationPolicyFromContentType(contentType)
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("default options changed capability behavior: got %+v want %+v", got, want)
	}
}

func TestEntryNavigationPolicyOptionsExcludeContentTypeLast(t *testing.T) {
	contentType := CMSContentType{
		ID:   "ct-page",
		Slug: "page",
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled":                 true,
				"eligible_locations":      []string{"site.main"},
				"default_locations":       []string{"site.main"},
				"allow_instance_override": true,
			},
		},
	}

	got := EntryNavigationPolicyFromOptions(contentType, EntryNavigationOptions{
		EligibleLocations:    []string{"site.main", "site.footer"},
		ExcludedContentTypes: []string{"PAGE"},
	})
	if !got.Excluded || got.Enabled || got.AllowInstanceOverride || len(got.EligibleLocations) != 0 {
		t.Fatalf("expected excluded content type to force hidden/non-editable policy, got %+v", got)
	}
}

func TestEntryNavigationPolicyOptionsNarrowPerTypeLocationsAndPermissions(t *testing.T) {
	disableOverrides := false
	contentType := CMSContentType{
		Slug: "post",
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled":                 true,
				"eligible_locations":      []string{"site.main", "site.footer", "site.utility"},
				"default_locations":       []string{"site.main", "site.utility"},
				"default_visible":         true,
				"allow_instance_override": true,
			},
		},
	}

	got := EntryNavigationPolicyFromOptions(contentType, EntryNavigationOptions{
		ViewPermission:     "admin.entry_navigation.view",
		EditPermission:     "admin.entry_navigation.edit",
		PermissionResource: "content_navigation",
		ContentTypes: map[string]EntryNavigationTypeOptions{
			"post": {
				EligibleLocations:     []string{"site.footer", "site.unknown", "site.main"},
				DefaultLocations:      []string{"site.footer", "site.utility"},
				AllowInstanceOverride: &disableOverrides,
			},
		},
	})

	if got.AllowInstanceOverride {
		t.Fatalf("expected per-type allow_instance_override=false to narrow policy")
	}
	if got.ViewPermission != "admin.entry_navigation.view" || got.EditPermission != "admin.entry_navigation.edit" || got.PermissionResource != "content_navigation" {
		t.Fatalf("permission metadata mismatch: %+v", got)
	}
	if got.ActivityAction != DefaultEntryNavigationActivityAction {
		t.Fatalf("expected default activity action, got %q", got.ActivityAction)
	}
	if want := []string{"site.footer", "site.main"}; !reflect.DeepEqual(got.EligibleLocations, want) {
		t.Fatalf("eligible locations mismatch: got %+v want %+v", got.EligibleLocations, want)
	}
	if want := []string{"site.footer"}; !reflect.DeepEqual(got.DefaultLocations, want) {
		t.Fatalf("default locations mismatch: got %+v want %+v", got.DefaultLocations, want)
	}
}

func TestEntryNavigationPolicyOptionsGlobalDefaultsWhenCapabilitiesMissing(t *testing.T) {
	enabled := true
	defaultVisible := false
	got := EntryNavigationPolicyFromOptions(CMSContentType{Slug: "news"}, EntryNavigationOptions{
		Enabled:               &enabled,
		EligibleLocations:     []string{"site.main", "site.footer"},
		DefaultLocations:      []string{"site.footer", "site.unknown"},
		DefaultVisible:        &defaultVisible,
		AllowInstanceOverride: &enabled,
		ActivityAction:        "content.navigation.custom",
	})

	if !got.Enabled || !got.AllowInstanceOverride || got.DefaultVisible {
		t.Fatalf("global option booleans mismatch: %+v", got)
	}
	if want := []string{"site.footer"}; !reflect.DeepEqual(got.DefaultLocations, want) {
		t.Fatalf("global defaults were not filtered: got %+v want %+v", got.DefaultLocations, want)
	}
	if got.ActivityAction != "content.navigation.custom" {
		t.Fatalf("custom activity action mismatch: %q", got.ActivityAction)
	}
}

func TestEntryNavigationPolicyOptionsExplicitDisabledCapabilityOverridesGlobalDefaults(t *testing.T) {
	enabled := true
	got := EntryNavigationPolicyFromOptions(CMSContentType{
		Slug: "page",
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled": false,
			},
		},
	}, EntryNavigationOptions{
		Enabled:           &enabled,
		EligibleLocations: []string{"site.main"},
		DefaultLocations:  []string{"site.main"},
	})

	if got.Enabled || len(got.EligibleLocations) != 0 || len(got.DefaultLocations) != 0 {
		t.Fatalf("expected explicit disabled capability to override global defaults, got %+v", got)
	}
}
