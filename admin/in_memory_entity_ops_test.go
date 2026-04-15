package admin

import (
	"context"
	"testing"
)

func TestInMemoryTenantStoreCRUDUsesSharedEntityOps(t *testing.T) {
	store := NewInMemoryTenantStore()

	created, err := store.Create(context.Background(), TenantRecord{
		Name:   "Acme",
		Slug:   "acme",
		Status: "active",
		Domain: "acme.test",
		Members: []TenantMember{
			{UserID: "user-1", Roles: []string{"owner"}},
			{UserID: "", Roles: []string{"ignored"}},
		},
	})
	if err != nil {
		t.Fatalf("create tenant: %v", err)
	}
	if created.ID == "" {
		t.Fatalf("expected tenant id")
	}
	if len(created.Members) != 1 {
		t.Fatalf("expected normalized members, got %+v", created.Members)
	}

	list, total, err := store.List(context.Background(), ListOptions{Search: "acme"})
	if err != nil {
		t.Fatalf("list tenants: %v", err)
	}
	if total != 1 || len(list) != 1 {
		t.Fatalf("expected one tenant, got total=%d len=%d", total, len(list))
	}

	updated, err := store.Update(context.Background(), TenantRecord{
		ID:     created.ID,
		Domain: "admin.acme.test",
		Metadata: map[string]any{
			"region": "us",
		},
	})
	if err != nil {
		t.Fatalf("update tenant: %v", err)
	}
	if updated.Domain != "admin.acme.test" {
		t.Fatalf("expected updated domain, got %q", updated.Domain)
	}
	if got := toString(updated.Metadata["region"]); got != "us" {
		t.Fatalf("expected merged metadata, got %+v", updated.Metadata)
	}

	if err := store.Delete(context.Background(), created.ID); err != nil {
		t.Fatalf("delete tenant: %v", err)
	}
	if _, err := store.Get(context.Background(), created.ID); err == nil {
		t.Fatalf("expected deleted tenant lookup to fail")
	}
}

func TestInMemoryOrganizationStoreFiltersAndMergesThroughSharedEntityOps(t *testing.T) {
	store := NewInMemoryOrganizationStore()

	first, err := store.Create(context.Background(), OrganizationRecord{
		Name:     "North",
		Slug:     "north",
		Status:   "active",
		TenantID: "tenant-1",
	})
	if err != nil {
		t.Fatalf("create org: %v", err)
	}
	_, err = store.Create(context.Background(), OrganizationRecord{
		Name:     "South",
		Slug:     "south",
		Status:   "inactive",
		TenantID: "tenant-2",
	})
	if err != nil {
		t.Fatalf("create second org: %v", err)
	}

	filtered, total, err := store.List(context.Background(), ListOptions{
		Filters: map[string]any{"status": "active", "tenant_id": "tenant-1"},
	})
	if err != nil {
		t.Fatalf("list orgs: %v", err)
	}
	if total != 1 || len(filtered) != 1 || filtered[0].ID != first.ID {
		t.Fatalf("unexpected filtered orgs: total=%d records=%+v", total, filtered)
	}

	updated, err := store.Update(context.Background(), OrganizationRecord{
		ID:       first.ID,
		TenantID: "tenant-9",
		Metadata: map[string]any{"tier": "gold"},
	})
	if err != nil {
		t.Fatalf("update org: %v", err)
	}
	if updated.TenantID != "tenant-9" {
		t.Fatalf("expected tenant_id update, got %q", updated.TenantID)
	}
	if got := toString(updated.Metadata["tier"]); got != "gold" {
		t.Fatalf("expected merged org metadata, got %+v", updated.Metadata)
	}
}

func TestInMemoryUserStoreSharedEntityOpsPreserveAssignments(t *testing.T) {
	store := NewInMemoryUserStore()
	role, err := store.Create(context.Background(), RoleRecord{Name: "Admin", Permissions: []string{"admin.users.view"}})
	if err != nil {
		t.Fatalf("create role: %v", err)
	}

	created, err := store.CreateUser(context.Background(), UserRecord{
		Email: "test@example.com",
		Roles: []string{role.ID, role.ID},
	})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if len(created.Roles) != 1 {
		t.Fatalf("expected deduped roles on create, got %+v", created.Roles)
	}

	updated, err := store.UpdateUser(context.Background(), UserRecord{
		ID:    created.ID,
		Roles: []string{role.ID},
	})
	if err != nil {
		t.Fatalf("update user: %v", err)
	}
	if len(updated.Roles) != 1 || updated.Roles[0] != role.ID {
		t.Fatalf("expected preserved assignment, got %+v", updated.Roles)
	}

	got, err := store.GetUser(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	if len(got.Roles) != 1 || got.Roles[0] != role.ID {
		t.Fatalf("expected hydrated roles from assignments, got %+v", got.Roles)
	}

	results, err := store.Search(context.Background(), "test@example.com", 5)
	if err != nil {
		t.Fatalf("search users: %v", err)
	}
	if len(results) != 1 || results[0].ID != created.ID {
		t.Fatalf("expected search hit for created user, got %+v", results)
	}
}

func TestInMemoryUserStoreDeleteRoleUsesSharedDeleteHelper(t *testing.T) {
	store := NewInMemoryUserStore()
	systemRole, err := store.Create(context.Background(), RoleRecord{Name: "System", IsSystem: true})
	if err != nil {
		t.Fatalf("create system role: %v", err)
	}
	if deleteErr := store.Delete(context.Background(), systemRole.ID); deleteErr != ErrForbidden {
		t.Fatalf("expected ErrForbidden for system role delete, got %v", deleteErr)
	}

	regularRole, err := store.Create(context.Background(), RoleRecord{Name: "Editor"})
	if err != nil {
		t.Fatalf("create role: %v", err)
	}
	if err := store.Delete(context.Background(), regularRole.ID); err != nil {
		t.Fatalf("delete role: %v", err)
	}
	if _, err := store.Get(context.Background(), regularRole.ID); err == nil {
		t.Fatalf("expected deleted role lookup to fail")
	}
}
