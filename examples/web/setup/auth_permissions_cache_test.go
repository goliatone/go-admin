package setup

import (
	"context"
	"os"
	"testing"
	"time"

	auth "github.com/goliatone/go-auth"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

type testRoleRegistry struct {
	assignments []userstypes.RoleAssignment
	roles       userstypes.RolePage
	listAssignN int
	listRolesN  int
}

func (r *testRoleRegistry) CreateRole(context.Context, userstypes.RoleMutation) (*userstypes.RoleDefinition, error) {
	return nil, nil
}

func (r *testRoleRegistry) UpdateRole(context.Context, uuid.UUID, userstypes.RoleMutation) (*userstypes.RoleDefinition, error) {
	return nil, nil
}

func (r *testRoleRegistry) DeleteRole(context.Context, uuid.UUID, userstypes.ScopeFilter, uuid.UUID) error {
	return nil
}

func (r *testRoleRegistry) AssignRole(context.Context, uuid.UUID, uuid.UUID, userstypes.ScopeFilter, uuid.UUID) error {
	return nil
}

func (r *testRoleRegistry) UnassignRole(context.Context, uuid.UUID, uuid.UUID, userstypes.ScopeFilter, uuid.UUID) error {
	return nil
}

func (r *testRoleRegistry) ListRoles(context.Context, userstypes.RoleFilter) (userstypes.RolePage, error) {
	r.listRolesN++
	return r.roles, nil
}

func (r *testRoleRegistry) GetRole(context.Context, uuid.UUID, userstypes.ScopeFilter) (*userstypes.RoleDefinition, error) {
	return nil, nil
}

func (r *testRoleRegistry) ListAssignments(context.Context, userstypes.RoleAssignmentFilter) ([]userstypes.RoleAssignment, error) {
	r.listAssignN++
	return append([]userstypes.RoleAssignment(nil), r.assignments...), nil
}

func TestApplySessionClaimsMetadataSetsPermissionsVersion(t *testing.T) {
	userID := uuid.New()
	roleID := uuid.New()
	registry := &testRoleRegistry{
		assignments: []userstypes.RoleAssignment{
			{UserID: userID, RoleID: roleID, AssignedAt: time.Now().UTC()},
		},
		roles: userstypes.RolePage{
			Roles: []userstypes.RoleDefinition{
				{
					ID:          roleID,
					RoleKey:     "owner",
					Permissions: []string{"admin.translations.export"},
					UpdatedAt:   time.Now().UTC(),
				},
			},
		},
	}
	claims := &auth.JWTClaims{
		UID: userID.String(),
		Metadata: map[string]any{
			"tenant_id":       uuid.NewString(),
			"organization_id": uuid.NewString(),
		},
	}

	err := applySessionClaimsMetadata(context.Background(), userIdentity{
		id:       userID.String(),
		username: "owner",
		role:     "owner",
		status:   auth.UserStatusActive,
	}, claims, authOptions{}, registry)
	if err != nil {
		t.Fatalf("applySessionClaimsMetadata: %v", err)
	}
	version := auth.PermissionsVersionFromClaims(claims)
	if version == "" {
		t.Fatalf("expected permissions_version to be populated in claims metadata")
	}
}

func TestNewRolePermissionResolverCachesByContextKey(t *testing.T) {
	userID := uuid.New()
	roleID := uuid.New()
	registry := &testRoleRegistry{
		assignments: []userstypes.RoleAssignment{
			{UserID: userID, RoleID: roleID, AssignedAt: time.Now().UTC()},
		},
		roles: userstypes.RolePage{
			Roles: []userstypes.RoleDefinition{
				{
					ID:          roleID,
					RoleKey:     "owner",
					Permissions: []string{"admin.translations.export"},
					UpdatedAt:   time.Now().UTC(),
				},
			},
		},
	}
	resolver := newRolePermissionResolver(authOptions{
		permissionResolverCacheTTL: time.Minute,
	}, registry)
	if resolver == nil {
		t.Fatalf("expected resolver")
	}

	claims := &auth.JWTClaims{
		UID:      userID.String(),
		UserRole: "owner",
		Metadata: map[string]any{
			auth.PermissionsVersionMetadataKey: "version-1",
		},
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	ctx = auth.WithActorContext(ctx, &auth.ActorContext{ActorID: userID.String(), Role: "owner"})

	first, err := resolver(ctx)
	if err != nil {
		t.Fatalf("first resolve: %v", err)
	}
	second, err := resolver(ctx)
	if err != nil {
		t.Fatalf("second resolve: %v", err)
	}
	if len(first) == 0 || len(second) == 0 {
		t.Fatalf("expected resolved permissions on repeated calls")
	}
	if registry.listAssignN != 1 || registry.listRolesN != 1 {
		t.Fatalf("expected one registry query cycle due cache, assignments=%d roles=%d", registry.listAssignN, registry.listRolesN)
	}
}

func TestNormalizeAuthOptionsRespectsExplicitZeroTTL(t *testing.T) {
	t.Setenv("ADMIN_PERMISSION_RESOLVER_CACHE_TTL", "45s")
	options := authOptions{
		permissionResolverCacheTTL: 0,
		permissionResolverCacheSet: true,
	}
	normalized := normalizeAuthOptions(options)
	if normalized.permissionResolverCacheTTL != 0 {
		t.Fatalf("expected explicit zero ttl to be preserved, got %s", normalized.permissionResolverCacheTTL)
	}
}

func TestNormalizeAuthOptionsLoadsZeroTTLFromEnv(t *testing.T) {
	t.Setenv("ADMIN_PERMISSION_RESOLVER_CACHE_TTL", "0s")
	normalized := normalizeAuthOptions(authOptions{})
	if normalized.permissionResolverCacheTTL != 0 {
		t.Fatalf("expected env ttl of 0s to disable cache, got %s", normalized.permissionResolverCacheTTL)
	}
}

func TestNormalizeAuthOptionsFallsBackWhenEnvInvalid(t *testing.T) {
	if err := os.Setenv("ADMIN_PERMISSION_RESOLVER_CACHE_TTL", "not-a-duration"); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() { _ = os.Unsetenv("ADMIN_PERMISSION_RESOLVER_CACHE_TTL") })
	normalized := normalizeAuthOptions(authOptions{})
	if normalized.permissionResolverCacheTTL != 30*time.Second {
		t.Fatalf("expected fallback ttl, got %s", normalized.permissionResolverCacheTTL)
	}
}
