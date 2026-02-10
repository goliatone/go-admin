package admin

import (
	"context"
	"testing"
)

func TestUserManagementServiceBulkRoleChangeAssignsRoleAndHydratesDisplay(t *testing.T) {
	svc := NewUserManagementService(nil, nil)
	ctx := context.Background()

	role, err := svc.SaveRole(ctx, RoleRecord{Name: "Administrators"})
	if err != nil {
		t.Fatalf("save role: %v", err)
	}
	user, err := svc.SaveUser(ctx, UserRecord{
		Email:    "bulk@example.com",
		Username: "bulk-user",
		Status:   "active",
	})
	if err != nil {
		t.Fatalf("save user: %v", err)
	}

	out, err := svc.BulkRoleChange(ctx, BulkRoleChangeRequest{
		UserIDs: []string{user.ID},
		RoleID:  role.ID,
		Assign:  true,
	})
	if err != nil {
		t.Fatalf("bulk role change: %v", err)
	}
	if out.Summary.Processed != 1 || out.Summary.Succeeded != 1 || out.Summary.Failed != 0 {
		t.Fatalf("unexpected summary: %+v", out.Summary)
	}
	if out.Action != "assign" {
		t.Fatalf("expected assign action, got %q", out.Action)
	}

	updated, err := svc.GetUser(ctx, user.ID)
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	if len(updated.Roles) != 1 || updated.Roles[0] != role.ID {
		t.Fatalf("expected role IDs [%s], got %v", role.ID, updated.Roles)
	}
	if updated.RoleDisplay != "Administrators" {
		t.Fatalf("expected role display %q, got %q", "Administrators", updated.RoleDisplay)
	}
	if len(updated.RoleLabels) != 1 || updated.RoleLabels[0] != "Administrators" {
		t.Fatalf("expected role labels [Administrators], got %v", updated.RoleLabels)
	}
}

func TestUserManagementServiceBulkRoleChangeReplaceRemovesExistingRoles(t *testing.T) {
	svc := NewUserManagementService(nil, nil)
	ctx := context.Background()

	firstRole, err := svc.SaveRole(ctx, RoleRecord{Name: "Editors"})
	if err != nil {
		t.Fatalf("save first role: %v", err)
	}
	secondRole, err := svc.SaveRole(ctx, RoleRecord{Name: "Owners"})
	if err != nil {
		t.Fatalf("save second role: %v", err)
	}
	user, err := svc.SaveUser(ctx, UserRecord{
		Email:    "replace@example.com",
		Username: "replace-user",
		Status:   "active",
	})
	if err != nil {
		t.Fatalf("save user: %v", err)
	}
	if err := svc.AssignRole(ctx, user.ID, firstRole.ID); err != nil {
		t.Fatalf("assign first role: %v", err)
	}
	if err := svc.AssignRole(ctx, user.ID, secondRole.ID); err != nil {
		t.Fatalf("assign second role: %v", err)
	}

	out, err := svc.BulkRoleChange(ctx, BulkRoleChangeRequest{
		UserIDs: []string{user.ID},
		RoleID:  secondRole.ID,
		Assign:  true,
		Replace: true,
	})
	if err != nil {
		t.Fatalf("bulk role change replace: %v", err)
	}
	if out.Summary.Succeeded != 1 || out.Summary.Failed != 0 {
		t.Fatalf("unexpected summary: %+v", out.Summary)
	}

	roles, err := svc.RolesForUser(ctx, user.ID)
	if err != nil {
		t.Fatalf("roles for user: %v", err)
	}
	if len(roles) != 1 || roles[0].ID != secondRole.ID {
		t.Fatalf("expected only role %s after replace, got %+v", secondRole.ID, roles)
	}
}
