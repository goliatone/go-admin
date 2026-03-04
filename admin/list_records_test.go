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

func TestApplyListOptionsToRecordMapsProjectsRequestedFields(t *testing.T) {
	records := []map[string]any{
		{"id": "1", "title": "Alpha", "status": "published", "slug": "/alpha"},
		{"id": "2", "title": "Beta", "status": "draft", "slug": "/beta"},
	}

	paged, total := applyListOptionsToRecordMaps(records, ListOptions{
		Page:    1,
		PerPage: 10,
		Fields:  []string{"title", "status"},
	}, listRecordOptions{})

	if total != 2 {
		t.Fatalf("expected total 2, got %d", total)
	}
	if len(paged) != 2 {
		t.Fatalf("expected 2 records, got %d", len(paged))
	}
	if _, ok := paged[0]["id"]; !ok {
		t.Fatalf("expected id to remain present in projected record, got %+v", paged[0])
	}
	if _, ok := paged[0]["slug"]; ok {
		t.Fatalf("expected slug to be omitted from projected record, got %+v", paged[0])
	}
	if got := toString(paged[0]["title"]); got != "Alpha" {
		t.Fatalf("expected projected title Alpha, got %q", got)
	}
}

func TestApplyListOptionsToRecordMapsIgnoresDollarChannelScopeFilters(t *testing.T) {
	records := []map[string]any{
		{"id": "1", "title": "Alpha", "status": "published", "channel": "default"},
		{"id": "2", "title": "Beta", "status": "published", "channel": "preview"},
	}

	paged, total := applyListOptionsToRecordMaps(records, ListOptions{
		Filters: map[string]any{
			"status":          "published",
			"$channel":        "staging",
			"content_channel": "preview",
		},
	}, listRecordOptions{})

	if total != 2 {
		t.Fatalf("expected channel scope filters to be ignored, got total=%d", total)
	}
	if len(paged) != 2 {
		t.Fatalf("expected 2 records, got %d", len(paged))
	}
}

func TestApplyListOptionsToRecordMapsSupportsPlainChannelFieldFilters(t *testing.T) {
	records := []map[string]any{
		{"id": "1", "title": "Alpha", "channel": "default"},
		{"id": "2", "title": "Beta", "channel": "preview"},
	}

	paged, total := applyListOptionsToRecordMaps(records, ListOptions{
		Filters: map[string]any{
			"channel": "preview",
		},
	}, listRecordOptions{})

	if total != 1 {
		t.Fatalf("expected plain channel field filter to match one record, got total=%d", total)
	}
	if len(paged) != 1 {
		t.Fatalf("expected one record, got %d", len(paged))
	}
	if got := toString(paged[0]["id"]); got != "2" {
		t.Fatalf("expected id 2 after channel filter, got %q", got)
	}
}
