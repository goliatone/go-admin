package setup

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	userstypes "github.com/goliatone/go-users/pkg/types"
)

func TestSetupUsersSeededPrivilegedRolesIncludeTranslationOperationPermissions(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:users_role_seed_permissions_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())

	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	required := []string{
		"admin.translations.view",
		"admin.translations.edit",
		"admin.translations.manage",
		"admin.translations.assign",
		"admin.translations.approve",
		"admin.translations.claim",
		"admin.translations.export",
		"admin.translations.import.view",
		"admin.translations.import.validate",
		"admin.translations.import.apply",
	}

	for _, roleKey := range []string{"superadmin", "owner"} {
		role, err := findSeedRole(ctx, deps.RoleRegistry, roleKey)
		if err != nil {
			t.Fatalf("find role %q: %v", roleKey, err)
		}
		if role == nil {
			t.Fatalf("expected seeded role %q", roleKey)
		}

		for _, perm := range required {
			if !permissionIncluded(role.Permissions, perm) {
				t.Fatalf("expected role %q permissions to include %q, got %v", roleKey, perm, role.Permissions)
			}
		}
	}
}

func TestResolveRolePermissionsSuperadminIncludesTranslationOperationPermissions(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:users_superadmin_permissions_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())

	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	user, err := deps.RepoManager.Users().GetByIdentifier(ctx, "superadmin")
	if err != nil || user == nil {
		t.Fatalf("get superadmin: err=%v user=%v", err, user)
	}

	perms, err := resolveRolePermissions(ctx, deps.RoleRegistry, userIdentity{
		id:       user.ID.String(),
		username: user.Username,
		email:    user.Email,
		role:     string(user.Role),
		status:   user.Status,
	}, seedScopeDefaults())
	if err != nil {
		t.Fatalf("resolve superadmin permissions: %v", err)
	}

	required := []string{
		"admin.translations.view",
		"admin.translations.edit",
		"admin.translations.manage",
		"admin.translations.assign",
		"admin.translations.approve",
		"admin.translations.claim",
		"admin.translations.export",
		"admin.translations.import.view",
		"admin.translations.import.validate",
		"admin.translations.import.apply",
	}
	for _, perm := range required {
		if !permissionIncluded(perms, perm) {
			t.Fatalf("expected superadmin permissions to include %q, got %v", perm, perms)
		}
	}
}

func TestResolveRolePermissionsViewerExcludesTranslationOperationPermissions(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:users_viewer_permissions_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())

	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	user, err := deps.RepoManager.Users().GetByIdentifier(ctx, "viewer")
	if err != nil || user == nil {
		t.Fatalf("get viewer: err=%v user=%v", err, user)
	}

	perms, err := resolveRolePermissions(ctx, deps.RoleRegistry, userIdentity{
		id:       user.ID.String(),
		username: user.Username,
		email:    user.Email,
		role:     string(user.Role),
		status:   user.Status,
	}, seedScopeDefaults())
	if err != nil {
		t.Fatalf("resolve viewer permissions: %v", err)
	}

	for _, perm := range []string{
		"admin.translations.view",
		"admin.translations.edit",
		"admin.translations.manage",
		"admin.translations.assign",
		"admin.translations.approve",
		"admin.translations.claim",
		"admin.translations.export",
		"admin.translations.import.view",
		"admin.translations.import.validate",
		"admin.translations.import.apply",
	} {
		if permissionIncluded(perms, perm) {
			t.Fatalf("expected viewer to be denied %q, got permissions %v", perm, perms)
		}
	}
}

func findSeedRole(ctx context.Context, registry userstypes.RoleRegistry, roleKey string) (*userstypes.RoleDefinition, error) {
	if registry == nil {
		return nil, nil
	}
	page, err := registry.ListRoles(ctx, userstypes.RoleFilter{
		RoleKey:       strings.TrimSpace(roleKey),
		IncludeSystem: true,
		Scope:         seedScopeDefaults(),
	})
	if err != nil {
		return nil, err
	}
	if len(page.Roles) == 0 {
		return nil, nil
	}
	role := page.Roles[0]
	return &role, nil
}

func permissionIncluded(perms []string, permission string) bool {
	target := strings.ToLower(strings.TrimSpace(permission))
	if target == "" {
		return false
	}
	for _, perm := range perms {
		if strings.ToLower(strings.TrimSpace(perm)) == target {
			return true
		}
	}
	return false
}
