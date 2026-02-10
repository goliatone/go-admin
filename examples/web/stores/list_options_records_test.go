package stores

import (
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
)

func TestApplyListOptionsToRecordsFiltersSortsAndPaginates(t *testing.T) {
	records := []map[string]any{
		{"id": "1", "title": "Zeta", "status": "draft"},
		{"id": "2", "title": "Alpha", "status": "published"},
		{"id": "3", "title": "Gamma", "status": "published"},
		{"id": "4", "title": "Beta", "status": "published"},
	}

	paged, total := applyListOptionsToRecords(records, admin.ListOptions{
		Page:     1,
		PerPage:  2,
		SortBy:   "title",
		SortDesc: false,
		Filters: map[string]any{
			"status": "published",
		},
	}, nil)

	if total != 3 {
		t.Fatalf("expected filtered total 3, got %d", total)
	}
	if len(paged) != 2 {
		t.Fatalf("expected 2 paged records, got %d", len(paged))
	}
	if got := asString(paged[0]["title"], ""); got != "Alpha" {
		t.Fatalf("expected first title Alpha, got %q", got)
	}
	if got := asString(paged[1]["title"], ""); got != "Beta" {
		t.Fatalf("expected second title Beta, got %q", got)
	}
}

func TestApplyListOptionsToRecordsSupportsILike(t *testing.T) {
	records := []map[string]any{
		{"id": "1", "title": "Hello World"},
		{"id": "2", "title": "HELLO Again"},
		{"id": "3", "title": "Goodbye"},
	}

	paged, total := applyListOptionsToRecords(records, admin.ListOptions{
		Filters: map[string]any{
			"title__ilike": "hello",
		},
	}, nil)

	if total != 2 {
		t.Fatalf("expected ilike total 2, got %d", total)
	}
	if len(paged) != 2 {
		t.Fatalf("expected 2 records, got %d", len(paged))
	}
}

func TestApplyListOptionsToRecordsSupportsDateComparators(t *testing.T) {
	records := []map[string]any{
		{"id": "1", "created_at": "2025-12-31T23:59:59Z"},
		{"id": "2", "created_at": "2026-01-10T08:00:00Z"},
	}

	paged, total := applyListOptionsToRecords(records, admin.ListOptions{
		Filters: map[string]any{
			"created_at__gte": "2026-01-01",
		},
	}, nil)

	if total != 1 {
		t.Fatalf("expected date comparator total 1, got %d", total)
	}
	if len(paged) != 1 {
		t.Fatalf("expected one record, got %d", len(paged))
	}
	if got := asString(paged[0]["id"], ""); got != "2" {
		t.Fatalf("expected id 2, got %q", got)
	}
}
