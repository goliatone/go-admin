package admin

import "testing"

func TestApplyListOptionsToRecordMapsFiltersSortsAndPaginates(t *testing.T) {
	records := []map[string]any{
		{"id": "1", "title": "Zeta", "status": "draft"},
		{"id": "2", "title": "Alpha", "status": "published"},
		{"id": "3", "title": "Gamma", "status": "published"},
		{"id": "4", "title": "Beta", "status": "published"},
	}

	paged, total := applyListOptionsToRecordMaps(records, ListOptions{
		Page:    1,
		PerPage: 2,
		SortBy:  "title",
		Filters: map[string]any{
			"status": "published",
		},
	}, listRecordOptions{})

	if total != 3 {
		t.Fatalf("expected total 3, got %d", total)
	}
	if len(paged) != 2 {
		t.Fatalf("expected 2 records on page, got %d", len(paged))
	}
	if got := toString(paged[0]["title"]); got != "Alpha" {
		t.Fatalf("expected first title Alpha, got %q", got)
	}
	if got := toString(paged[1]["title"]); got != "Beta" {
		t.Fatalf("expected second title Beta, got %q", got)
	}
}

func TestApplyListOptionsToRecordMapsSupportsILikeAndComparators(t *testing.T) {
	records := []map[string]any{
		{"id": "1", "title": "Hello World", "created_at": "2025-12-31T23:59:59Z"},
		{"id": "2", "title": "HELLO Again", "created_at": "2026-01-10T08:00:00Z"},
		{"id": "3", "title": "Goodbye", "created_at": "2026-02-01T08:00:00Z"},
	}

	paged, total := applyListOptionsToRecordMaps(records, ListOptions{
		Filters: map[string]any{
			"title__ilike":     "hello",
			"created_at__gte":  "2026-01-01",
			"created_at__lt":   "2026-02-01T00:00:00Z",
			"environment":      "dev",
			"_search":          "",
			"sort_desc":        false,
			"unsupported__foo": "bar",
		},
	}, listRecordOptions{
		SkipFields: map[string]struct{}{
			"unsupported": {},
		},
	})

	if total != 1 {
		t.Fatalf("expected 1 record, got %d", total)
	}
	if len(paged) != 1 {
		t.Fatalf("expected one paged record, got %d", len(paged))
	}
	if got := toString(paged[0]["id"]); got != "2" {
		t.Fatalf("expected id 2, got %q", got)
	}
}
