package translationqueue

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
