package navigation

import "testing"

func TestAllClassificationsAreCanonicalElevenStateVocabulary(t *testing.T) {
	got := AllClassifications()
	if len(got) != 11 {
		t.Fatalf("expected eleven classifications, got %d: %#v", len(got), got)
	}
	want := map[Classification]bool{
		ClassificationRendered:              true,
		ClassificationPersistedMissing:      true,
		ClassificationRawPresentNotRendered: true,
		ClassificationPermissionFiltered:    true,
		ClassificationCapabilityOmitted:     true,
		ClassificationRouteMissing:          true,
		ClassificationStaleFields:           true,
		ClassificationAmbiguousDuplicate:    true,
		ClassificationRetired:               true,
		ClassificationCustom:                true,
		ClassificationUnsafeBroadMatch:      true,
	}
	for _, item := range got {
		if !want[item] {
			t.Fatalf("unexpected classification %q in %#v", item, got)
		}
		delete(want, item)
	}
	if len(want) != 0 {
		t.Fatalf("missing classifications: %#v", want)
	}
}

func TestCleanTargetRemovesRequestScopedRenderState(t *testing.T) {
	target := CleanTarget(map[string]any{
		"type":                 "url",
		"path":                 "/admin/media",
		"enabled":              false,
		"disabled":             true,
		"aria_disabled":        true,
		"disabled_reason":      "Permission denied",
		"disabled_reason_code": "permission_denied",
		"missing_permission":   "admin.media.view",
	})

	if target["path"] != "/admin/media" {
		t.Fatalf("expected persistent path to remain, got %#v", target)
	}
	for _, key := range RequestScopedTargetKeys() {
		if _, ok := target[key]; ok {
			t.Fatalf("expected %q to be stripped from target %#v", key, target)
		}
	}
}

func TestMarkProgrammaticStampsOwnerIDFromTargetKey(t *testing.T) {
	item := MarkProgrammatic(Item{
		ID:     "admin_main.nav-group-others.feature_flags",
		Type:   "item",
		Target: map[string]any{"type": "url", "path": "/admin/feature-flags", "key": "feature_flags"},
	})

	if got := TargetString(item.Target, TargetProgrammaticOwnerKey); got != TargetProgrammaticOwner {
		t.Fatalf("expected programmatic owner, got %q in %#v", got, item.Target)
	}
	if got := TargetString(item.Target, TargetProgrammaticIDKey); got != "feature_flags" {
		t.Fatalf("expected owner id from target key, got %q in %#v", got, item.Target)
	}
}

func TestFindMatchPreservesUnsafeBroadModuleMatch(t *testing.T) {
	expected := MarkProgrammatic(Item{
		ID:          "admin_main.media",
		Type:        "item",
		Target:      map[string]any{"type": "url", "path": "/admin/media", "key": "media"},
		Permissions: []string{"admin.media.view"},
	})
	actual := []Item{{
		ID:          "custom.media",
		Target:      map[string]any{"type": "url", "path": "/custom/media", "key": "media"},
		Permissions: []string{"custom.media.view"},
	}}

	match := FindMatch(expected, actual, MatchPolicy{Owner: OwnerModule})
	if !match.UnsafeBroad || match.Matched {
		t.Fatalf("expected unsafe broad non-match, got %#v", match)
	}
}

func TestFindMatchRepairsLegacyModuleRowWithEquivalentIDAndDestination(t *testing.T) {
	expected := MarkProgrammatic(Item{
		ID:       "admin_main.nav-group-others.feature_flags",
		Type:     "item",
		Label:    "Feature Flags",
		LabelKey: "menu.feature_flags",
		ParentID: "admin_main.nav-group-others",
		Target:   map[string]any{"type": "url", "path": "/admin/feature-flags", "key": "feature_flags"},
	})
	actual := []Item{{
		ID:       "admin_main.nav-group-others.feature-flags",
		Type:     "item",
		Label:    "Feature Flags",
		LabelKey: "menu.feature_flags",
		ParentID: "admin_main.nav-group-others",
		Target:   map[string]any{"type": "url", "path": "/admin/feature-flags", "key": "feature_flags"},
	}}

	match := FindMatch(expected, actual, MatchPolicy{Owner: OwnerModule})
	if !match.Matched || match.UnsafeBroad || match.Ambiguous {
		t.Fatalf("expected legacy module row repair match, got %#v", match)
	}
	if match.Item.ID != "admin_main.nav-group-others.feature-flags" {
		t.Fatalf("expected existing legacy row to match, got %#v", match.Item)
	}
}

func TestFindMatchRepairsLegacyModuleRowWhenExistingLacksLabelKey(t *testing.T) {
	expected := MarkProgrammatic(Item{
		ID:       "admin_main.nav-group-others.feature_flags",
		Type:     "item",
		Label:    "Feature Flags",
		LabelKey: "menu.feature_flags",
		ParentID: "admin_main.nav-group-others",
		Target:   map[string]any{"type": "url", "path": "/admin/feature-flags", "key": "feature_flags"},
	})
	actual := []Item{{
		ID:       "admin_main.nav-group-others.feature-flags",
		Type:     "item",
		Label:    "Feature Flags",
		ParentID: "admin_main.nav-group-others",
		Target:   map[string]any{"type": "url", "path": "/admin/feature-flags", "key": "feature_flags"},
	}}

	match := FindMatch(expected, actual, MatchPolicy{Owner: OwnerModule})
	if !match.Matched || match.UnsafeBroad || match.Ambiguous {
		t.Fatalf("expected legacy module row repair match by label fallback, got %#v", match)
	}
}

func TestFindMatchDoesNotRepairEquivalentIDWithoutSameDestination(t *testing.T) {
	expected := MarkProgrammatic(Item{
		ID:       "admin_main.nav-group-others.feature_flags",
		Type:     "item",
		Label:    "Feature Flags",
		LabelKey: "menu.feature_flags",
		ParentID: "admin_main.nav-group-others",
		Target:   map[string]any{"type": "url", "path": "/admin/feature-flags", "key": "feature_flags"},
	})
	actual := []Item{{
		ID:       "admin_main.nav-group-others.feature-flags",
		Type:     "item",
		Label:    "Feature Flags",
		LabelKey: "menu.feature_flags",
		ParentID: "admin_main.nav-group-others",
		Target:   map[string]any{"type": "url", "path": "/custom/feature-flags", "key": "feature_flags"},
	}}

	match := FindMatch(expected, actual, MatchPolicy{Owner: OwnerModule})
	if !match.UnsafeBroad || match.Matched {
		t.Fatalf("expected divergent destination to remain unsafe broad, got %#v", match)
	}
}

func TestClassifyReportsRawPresentNotRenderedAndEngineStamp(t *testing.T) {
	expected := ExpectedItem{
		Owner: OwnerQuickstart,
		Item: Item{
			ID:     "admin_main.translations.queue",
			Type:   "item",
			Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.translations.queue", "type": "url", "path": "/admin/translations/queue"},
		},
	}
	raw := []Item{{
		ID:     "admin_main.translations.queue",
		Type:   "item",
		Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.translations.queue", "type": "url", "path": "/admin/translations/queue"},
	}}

	report := Classify([]ExpectedItem{expected}, nil, raw)
	if report.EngineIdentity != EngineIdentity || report.EngineVersion != EngineVersion {
		t.Fatalf("expected engine stamp, got %#v", report)
	}
	if len(report.Items) != 1 {
		t.Fatalf("expected one classification, got %#v", report.Items)
	}
	if report.Items[0].Classification != ClassificationRawPresentNotRendered {
		t.Fatalf("expected raw-present-not-rendered, got %#v", report.Items[0])
	}
}

func TestClassifyDriftFixtureStates(t *testing.T) {
	expected := []ExpectedItem{
		{Owner: OwnerModule, Item: Item{ID: "admin_main.rendered", Target: map[string]any{TargetProgrammaticOwnerKey: TargetProgrammaticOwner, TargetProgrammaticIDKey: "rendered", "key": "rendered"}}},
		{Owner: OwnerModule, Item: Item{ID: "admin_main.missing", Target: map[string]any{TargetProgrammaticOwnerKey: TargetProgrammaticOwner, TargetProgrammaticIDKey: "missing", "key": "missing"}}},
		{Owner: OwnerModule, Item: Item{ID: "admin_main.stale", Label: "New", Target: map[string]any{TargetProgrammaticOwnerKey: TargetProgrammaticOwner, TargetProgrammaticIDKey: "stale", "key": "stale"}}},
		{Owner: OwnerModule, Item: Item{ID: "admin_main.ambiguous", Target: map[string]any{TargetProgrammaticOwnerKey: TargetProgrammaticOwner, TargetProgrammaticIDKey: "ambiguous", "key": "ambiguous"}}},
		{Owner: OwnerModule, Item: Item{ID: "admin_main.route_missing", Target: map[string]any{"type": "url"}}, RouteMissing: true},
		{Owner: OwnerModule, Item: Item{ID: "admin_main.permission", Target: map[string]any{"key": "permission"}}, PermissionFiltered: true},
		{Owner: OwnerModule, Item: Item{ID: "admin_main.capability", Target: map[string]any{"key": "capability"}}, CapabilityOmitted: true},
		{Owner: OwnerModule, Item: Item{ID: "admin_main.retired_expected", Target: map[string]any{"key": "retired_expected"}}, Retired: true},
	}
	rendered := []Item{
		{ID: "admin_main.rendered", Target: map[string]any{TargetProgrammaticOwnerKey: TargetProgrammaticOwner, TargetProgrammaticIDKey: "rendered", "key": "rendered"}},
		{ID: "admin_main.stale", Label: "Old", Target: map[string]any{TargetProgrammaticOwnerKey: TargetProgrammaticOwner, TargetProgrammaticIDKey: "stale", "key": "stale"}},
		{ID: "admin_main.ambiguous.a", Target: map[string]any{TargetProgrammaticOwnerKey: TargetProgrammaticOwner, TargetProgrammaticIDKey: "ambiguous", "key": "ambiguous"}},
		{ID: "admin_main.ambiguous.b", Target: map[string]any{TargetProgrammaticOwnerKey: TargetProgrammaticOwner, TargetProgrammaticIDKey: "ambiguous", "key": "ambiguous"}},
		{ID: "custom.shortcut", Target: map[string]any{"key": "custom"}},
		{ID: "admin_main.retired_actual", Target: map[string]any{TargetProgrammaticOwnerKey: TargetProgrammaticOwner, TargetProgrammaticIDKey: "retired_actual", "key": "retired_actual"}},
	}

	report := Classify(expected, rendered, nil)
	byID := map[string]Classification{}
	for _, item := range report.Items {
		byID[item.CanonicalID] = item.Classification
	}
	assertClassifiedAs := func(id string, want Classification) {
		t.Helper()
		if got := byID[id]; got != want {
			t.Fatalf("expected %s classified as %s, got %s in %#v", id, want, got, report.Items)
		}
	}

	assertClassifiedAs("admin_main.rendered", ClassificationRendered)
	assertClassifiedAs("admin_main.missing", ClassificationPersistedMissing)
	assertClassifiedAs("admin_main.stale", ClassificationStaleFields)
	assertClassifiedAs("admin_main.ambiguous", ClassificationAmbiguousDuplicate)
	assertClassifiedAs("admin_main.route_missing", ClassificationRouteMissing)
	assertClassifiedAs("admin_main.permission", ClassificationPermissionFiltered)
	assertClassifiedAs("admin_main.capability", ClassificationCapabilityOmitted)
	assertClassifiedAs("admin_main.retired_expected", ClassificationRetired)
	assertClassifiedAs("custom.shortcut", ClassificationCustom)
	assertClassifiedAs("admin_main.retired_actual", ClassificationRetired)
}

func TestPlanConvergencePlansCreateUpdateNoopAndAmbiguous(t *testing.T) {
	expected := []Item{
		{ID: "admin_main.new", Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.new"}},
		{ID: "admin_main.same", Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.same"}},
		{ID: "admin_main.stale", Label: "New", Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.stale"}},
		{ID: "admin_main.ambiguous", Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.ambiguous"}},
	}
	actual := []Item{
		{ID: "admin_main.same", Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.same"}},
		{ID: "admin_main.stale", Label: "Old", Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.stale"}},
		{ID: "admin_main.ambiguous.a", Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.ambiguous"}},
		{ID: "admin_main.ambiguous.b", Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.ambiguous"}},
	}

	plan := PlanConvergence(expected, actual, ConvergenceOptions{MatchPolicy: MatchPolicy{Owner: OwnerQuickstart}})
	actions := map[string]ConvergenceAction{}
	for _, item := range plan.Items {
		actions[item.Expected.ID] = item.Action
	}
	if actions["admin_main.new"] != ConvergenceCreate {
		t.Fatalf("expected create action, got %#v", actions)
	}
	if actions["admin_main.same"] != ConvergenceNoop {
		t.Fatalf("expected noop action, got %#v", actions)
	}
	if actions["admin_main.stale"] != ConvergenceUpdate {
		t.Fatalf("expected update action, got %#v", actions)
	}
	if actions["admin_main.ambiguous"] != ConvergenceAmbiguous {
		t.Fatalf("expected ambiguous action, got %#v", actions)
	}
}

func TestPlanExpectedItemPreservesIDWhenNotApplyingDestructiveReplacement(t *testing.T) {
	expected := Item{ID: "admin_main.media", Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.media"}}
	actual := []Item{{ID: "media", Target: map[string]any{TargetGeneratedByKey: "quickstart", TargetGeneratedIDKey: "admin_main.media"}}}

	planned := PlanExpectedItem(expected, actual, ConvergenceOptions{MatchPolicy: MatchPolicy{Owner: OwnerQuickstart}})
	if !planned.DestructiveCandidate {
		t.Fatalf("expected destructive candidate, got %#v", planned)
	}
	if planned.Action != ConvergenceNoop || planned.Update.ID != "media" {
		t.Fatalf("expected preserved-id noop, got %#v", planned)
	}
}
