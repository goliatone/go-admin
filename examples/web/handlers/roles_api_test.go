package handlers

import (
	"testing"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
)

func TestApplyRoleFiltersSupportsCommonOperators(t *testing.T) {
	now := time.Date(2026, 2, 6, 15, 0, 0, 0, time.UTC)
	records := []admin.RoleRecord{
		{
			ID:          "1",
			Name:        "Admin",
			RoleKey:     "admin",
			Description: "System owner role",
			Permissions: []string{"admin.users.view", "admin.roles.view"},
			IsSystem:    true,
			CreatedAt:   now,
		},
		{
			ID:          "2",
			Name:        "Editor",
			RoleKey:     "editor",
			Description: "Content editor role",
			Permissions: []string{"admin.content.view"},
			IsSystem:    false,
			CreatedAt:   now.Add(-24 * time.Hour),
		},
	}

	filters := map[string]string{
		"name__ilike":        "adm",
		"is_system":          "true",
		"permissions__ilike": "users",
	}
	filtered := applyRoleFilters(records, filters)
	if len(filtered) != 1 {
		t.Fatalf("expected 1 filtered role, got %d", len(filtered))
	}
	if filtered[0].RoleKey != "admin" {
		t.Fatalf("expected admin role, got %q", filtered[0].RoleKey)
	}

	dateFilters := map[string]string{"created_at__eq": "2026-02-06"}
	dateFiltered := applyRoleFilters(records, dateFilters)
	if len(dateFiltered) != 1 || dateFiltered[0].ID != "1" {
		t.Fatalf("expected created_at date filter to match role 1, got %+v", dateFiltered)
	}
}

func TestSortRoleRecordsAndPaginateBounds(t *testing.T) {
	records := []admin.RoleRecord{
		{Name: "Member", RoleKey: "member"},
		{Name: "Admin", RoleKey: "admin"},
		{Name: "Editor", RoleKey: "editor"},
	}

	sortRoleRecords(records, "role_key", true)
	if records[0].RoleKey != "member" || records[2].RoleKey != "admin" {
		t.Fatalf("unexpected sort order: %+v", records)
	}

	start, end := paginateBounds(1, 2, len(records))
	if start != 1 || end != 3 {
		t.Fatalf("expected bounds [1,3], got [%d,%d]", start, end)
	}

	start, end = paginateBounds(10, 2, len(records))
	if start != len(records) || end != len(records) {
		t.Fatalf("expected clamped bounds at end, got [%d,%d]", start, end)
	}
}
