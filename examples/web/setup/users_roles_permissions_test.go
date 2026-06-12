package setup

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestSetupUsersSeededSuperadminRoleUsesWildcardGrant(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:users_role_seed_permissions_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())

	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	role, err := findSeedRole(ctx, deps.RoleRegistry, "superadmin")
	if err != nil {
		t.Fatalf("find superadmin role: %v", err)
	}
	if role == nil {
		t.Fatalf("expected seeded superadmin role")
	}
	if !permissionIncluded(role.Permissions, "admin.*") {
		t.Fatalf("expected superadmin permissions to include wildcard grant, got %v", role.Permissions)
	}
	for _, perm := range []string{
		"admin.translations.import.apply",
		"admin.pages.view",
		"admin.users.delete",
	} {
		if permissionIncluded(role.Permissions, perm) {
			t.Fatalf("expected fresh superadmin role to avoid explicit %q, got %v", perm, role.Permissions)
		}
	}
}

func TestSetupUsersSeededOwnerRoleKeepsExplicitTranslationOperationPermissions(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:users_owner_role_seed_permissions_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())

	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	role, err := findSeedRole(ctx, deps.RoleRegistry, "owner")
	if err != nil {
		t.Fatalf("find owner role: %v", err)
	}
	if role == nil {
		t.Fatalf("expected seeded owner role")
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
		if !permissionIncluded(role.Permissions, perm) {
			t.Fatalf("expected owner permissions to include %q, got %v", perm, role.Permissions)
		}
	}
}

func TestResolveRolePermissionsSuperadminIncludesWildcardGrant(t *testing.T) {
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

	if !permissionIncluded(perms, "admin.*") {
		t.Fatalf("expected superadmin resolved permissions to include wildcard grant, got %v", perms)
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

func TestResolveRolePermissionsSuperadminContentAccessUsesWildcardGrant(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:users_superadmin_content_permissions_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())

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

	if !permissionIncluded(perms, "admin.*") {
		t.Fatalf("expected superadmin resolved permissions to include wildcard grant, got %v", perms)
	}
}

func TestResolveRolePermissionsAdminIncludesContentNavigationPermissions(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:users_admin_content_permissions_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())

	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	user, err := deps.RepoManager.Users().GetByIdentifier(ctx, "admin")
	if err != nil || user == nil {
		t.Fatalf("get admin: err=%v user=%v", err, user)
	}

	perms, err := resolveRolePermissions(ctx, deps.RoleRegistry, userIdentity{
		id:       user.ID.String(),
		username: user.Username,
		email:    user.Email,
		role:     string(user.Role),
		status:   user.Status,
	}, seedScopeDefaults())
	if err != nil {
		t.Fatalf("resolve admin permissions: %v", err)
	}

	for _, perm := range []string{
		"admin.pages.view",
		"admin.posts.view",
		"admin.media.view",
		"admin.content_types.view",
		"admin.block_definitions.view",
	} {
		if !permissionIncluded(perms, perm) {
			t.Fatalf("expected admin permissions to include %q, got %v", perm, perms)
		}
	}
}

func TestResolveRolePermissionsEditorIncludesCoreContentViewPermissions(t *testing.T) {
	ctx := context.Background()
	dsn := fmt.Sprintf("file:users_editor_content_permissions_%d?mode=memory&cache=shared&_fk=1", time.Now().UnixNano())

	deps, _, _, err := SetupUsers(ctx, dsn)
	if err != nil {
		t.Fatalf("setup users: %v", err)
	}

	user, err := deps.RepoManager.Users().GetByIdentifier(ctx, "jane.smith")
	if err != nil || user == nil {
		t.Fatalf("get editor user: err=%v user=%v", err, user)
	}

	perms, err := resolveRolePermissions(ctx, deps.RoleRegistry, userIdentity{
		id:       user.ID.String(),
		username: user.Username,
		email:    user.Email,
		role:     string(user.Role),
		status:   user.Status,
	}, seedScopeDefaults())
	if err != nil {
		t.Fatalf("resolve editor permissions: %v", err)
	}

	for _, perm := range []string{
		"admin.pages.view",
		"admin.posts.view",
	} {
		if !permissionIncluded(perms, perm) {
			t.Fatalf("expected editor permissions to include %q, got %v", perm, perms)
		}
	}
}

func TestEnsureContentNavigationSeedPermissionsAddsOnlyWildcardForSuperadmin(t *testing.T) {
	roleID := uuid.New()
	registry := &testRoleRegistry{
		roles: userstypes.RolePage{Roles: []userstypes.RoleDefinition{
			{
				ID:          roleID,
				RoleKey:     "superadmin",
				Name:        "Super Admin",
				Permissions: []string{"admin.legacy.custom"},
				Scope:       seedScopeDefaults(),
			},
		}},
	}

	if err := ensureContentNavigationSeedPermissions(context.Background(), registry); err != nil {
		t.Fatalf("ensure content permissions: %v", err)
	}
	if len(registry.updates) != 1 {
		t.Fatalf("expected one superadmin update, got %d", len(registry.updates))
	}
	perms := registry.updates[0].Permissions
	if !permissionIncluded(perms, "admin.*") {
		t.Fatalf("expected superadmin repair to add wildcard, got %v", perms)
	}
	if !permissionIncluded(perms, "admin.legacy.custom") {
		t.Fatalf("expected superadmin repair to preserve unknown legacy grant, got %v", perms)
	}
	for _, perm := range []string{
		"admin.pages.view",
		"admin.posts.view",
		"admin.media.view",
		"admin.content_types.view",
		"admin.block_definitions.view",
	} {
		if permissionIncluded(perms, perm) {
			t.Fatalf("expected superadmin repair not to re-add explicit %q, got %v", perm, perms)
		}
	}
}

func TestEnsureTranslationExchangeSeedPermissionsDoesNotExpandWildcardSuperadmin(t *testing.T) {
	registry := &testRoleRegistry{
		roles: userstypes.RolePage{Roles: []userstypes.RoleDefinition{
			{
				ID:          uuid.New(),
				RoleKey:     "superadmin",
				Name:        "Super Admin",
				Permissions: []string{"admin.*", "admin.legacy.custom"},
				Scope:       seedScopeDefaults(),
			},
		}},
	}

	if err := ensureTranslationExchangeSeedPermissions(context.Background(), registry); err != nil {
		t.Fatalf("ensure translation permissions: %v", err)
	}
	if len(registry.updates) != 0 {
		t.Fatalf("expected wildcard superadmin not to be re-expanded, got updates %+v", registry.updates)
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
