package translationqueue

import "slices"

import "testing"

func TestAssignmentFilterFromQueryNormalizesActorAndSort(t *testing.T) {
	values := map[string]string{
		"assignee_id": "__me__",
		"due_state":   "DUE_SOON",
		"sort_by":     "due_date",
		"direction":   "desc",
	}
	filter := AssignmentFilterFromQuery(func(key string) string {
		return values[key]
	}, "actor_1", "tenant_1", "org_1")

	if filter.AssigneeID != "actor_1" {
		t.Fatalf("expected actor substitution, got %+v", filter)
	}
	if filter.DueState != "due_soon" {
		t.Fatalf("expected normalized due state, got %+v", filter)
	}
	if filter.SortBy != "due_date" || !filter.SortDesc {
		t.Fatalf("expected due_date desc sort, got %+v", filter)
	}
	if filter.TenantID != "tenant_1" || filter.OrgID != "org_1" {
		t.Fatalf("expected scope fields populated, got %+v", filter)
	}
}

func TestAssignmentFilterFromQueryExpandsPreset(t *testing.T) {
	values := map[string]string{"preset": "open"}

	filter := AssignmentFilterFromQuery(func(key string) string {
		return values[key]
	}, "actor_1", "tenant_1", "org_1")

	if filter.Status != "open,assigned,in_progress,changes_requested" {
		t.Fatalf("expected open preset status expansion, got %+v", filter)
	}
	if filter.SortBy != "updated_at" || !filter.SortDesc {
		t.Fatalf("expected open preset sort expansion, got %+v", filter)
	}
}

func TestAssignmentFilterFromQueryExplicitValuesOverridePreset(t *testing.T) {
	values := map[string]string{
		"preset": "open",
		"status": "assigned",
		"sort":   "due_date",
		"order":  "asc",
	}

	filter := AssignmentFilterFromQuery(func(key string) string {
		return values[key]
	}, "actor_1", "tenant_1", "org_1")

	if filter.Status != "assigned" {
		t.Fatalf("expected explicit status to override preset, got %+v", filter)
	}
	if filter.SortBy != "due_date" || filter.SortDesc {
		t.Fatalf("expected explicit due_date asc sort, got %+v", filter)
	}
}

func TestAssignmentFilterFromQueryNormalizesEntityTypeAliases(t *testing.T) {
	tests := []struct {
		name   string
		values map[string]string
		want   string
	}{
		{name: "canonical", values: map[string]string{"entity_type": " Pages "}, want: "pages"},
		{name: "content type alias", values: map[string]string{"content_type": "Articles"}, want: "articles"},
		{name: "type alias", values: map[string]string{"type": "News"}, want: "news"},
		{name: "canonical wins", values: map[string]string{"entity_type": "Pages", "content_type": "Articles", "type": "News"}, want: "pages"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			filter := AssignmentFilterFromQuery(func(key string) string {
				return tc.values[key]
			}, "actor_1", "tenant_1", "org_1")
			if filter.EntityType != tc.want {
				t.Fatalf("expected entity type %q, got %+v", tc.want, filter)
			}
		})
	}
}

func TestSupportedFilterKeysIncludesEntityType(t *testing.T) {
	if slices.Contains(SupportedFilterKeys(), "entity_type") {
		return
	}
	t.Fatalf("expected supported filter keys to include entity_type, got %+v", SupportedFilterKeys())
}

func TestAssignmentFilterFromQueryExpandsActorPreset(t *testing.T) {
	values := map[string]string{"preset": "needs_review"}

	filter := AssignmentFilterFromQuery(func(key string) string {
		return values[key]
	}, "reviewer_1", "tenant_1", "org_1")

	if filter.Status != "in_review" {
		t.Fatalf("expected needs_review status expansion, got %+v", filter)
	}
	if filter.ReviewerID != "reviewer_1" {
		t.Fatalf("expected needs_review actor substitution, got %+v", filter)
	}
}

func TestSourceRecordOptionIncludesLocaleAndFamilyID(t *testing.T) {
	option := SourceRecordOption(map[string]any{
		"id":            "page_1",
		"title":         "Homepage",
		"source_locale": "EN",
		"family_id":     "fam_1",
	}, "pages")
	if option == nil {
		t.Fatalf("expected option")
	}
	if option["source_locale"] != "en" {
		t.Fatalf("expected normalized source locale, got %+v", option)
	}
	if option["family_id"] != "fam_1" {
		t.Fatalf("expected family id, got %+v", option)
	}
	if option["entity_type"] != "pages" {
		t.Fatalf("expected normalized entity type, got %+v", option)
	}
}

func TestAssigneeOptionAndSearchHelpers(t *testing.T) {
	option := AssigneeOption(map[string]any{
		"id":           "user_1",
		"display_name": "Jane Doe",
		"email":        "jane@example.com",
		"role":         "translator",
	})
	if option == nil {
		t.Fatalf("expected option")
	}
	if !OptionMatchesSearch(option, "translator") {
		t.Fatalf("expected search match against description")
	}
	filtered := FilterOptionsBySearch([]map[string]any{option}, "jane")
	if len(filtered) != 1 {
		t.Fatalf("expected filtered option match, got %+v", filtered)
	}
}
