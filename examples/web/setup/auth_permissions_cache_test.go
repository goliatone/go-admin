package setup

import (
	"context"
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

func TestNewSessionClaimsDecoratorCarriesTemporaryPasswordHints(t *testing.T) {
	issuedAt := time.Date(2026, 4, 23, 15, 0, 0, 0, time.UTC)
	expiresAt := issuedAt.Add(24 * time.Hour)
	claims := &auth.JWTClaims{}

	err := newSessionClaimsDecorator(authOptions{}, nil).Decorate(context.Background(), userIdentity{
		id:       uuid.NewString(),
		username: "bootstrap-admin",
		email:    "bootstrap@example.com",
		role:     "owner",
		status:   auth.UserStatusActive,
		metadata: map[string]any{
			auth.TemporaryPasswordMetadataKey:          true,
			auth.PasswordChangeRequiredMetadataKey:     true,
			auth.TemporaryPasswordIssuedAtMetadataKey:  issuedAt.Format(time.RFC3339Nano),
			auth.TemporaryPasswordExpiresAtMetadataKey: expiresAt.Format(time.RFC3339Nano),
		},
	}, claims)
	if err != nil {
		t.Fatalf("decorate session claims: %v", err)
	}

	if claims.Metadata[auth.TemporaryPasswordMetadataKey] != true {
		t.Fatalf("expected temporary password hint in claims metadata, got %#v", claims.Metadata)
	}
	if claims.Metadata[auth.PasswordChangeRequiredMetadataKey] != true {
		t.Fatalf("expected password change required hint in claims metadata, got %#v", claims.Metadata)
	}
	if claims.Metadata[auth.TemporaryPasswordIssuedAtMetadataKey] != issuedAt.Format(time.RFC3339Nano) {
		t.Fatalf("expected issued_at metadata, got %#v", claims.Metadata[auth.TemporaryPasswordIssuedAtMetadataKey])
	}
	if claims.Metadata[auth.TemporaryPasswordExpiresAtMetadataKey] != expiresAt.Format(time.RFC3339Nano) {
		t.Fatalf("expected expires_at metadata, got %#v", claims.Metadata[auth.TemporaryPasswordExpiresAtMetadataKey])
	}
	if claims.Metadata["username"] != "bootstrap-admin" {
		t.Fatalf("expected username metadata to be preserved, got %#v", claims.Metadata["username"])
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
	options := authOptions{
		permissionResolverCacheTTL: 0,
		permissionResolverCacheSet: true,
	}
	normalized := normalizeAuthOptions(options)
	if normalized.permissionResolverCacheTTL != 0 {
		t.Fatalf("expected explicit zero ttl to be preserved, got %s", normalized.permissionResolverCacheTTL)
	}
}

func TestNormalizeAuthOptionsLoadsTTLFromRuntimeConfig(t *testing.T) {
	original := runtimeConfig()
	t.Cleanup(func() { ConfigureRuntime(original) })
	override := original
	override.PermissionResolverCacheTTL = 45 * time.Second
	ConfigureRuntime(override)

	normalized := normalizeAuthOptions(authOptions{})
	if normalized.permissionResolverCacheTTL != 45*time.Second {
		t.Fatalf("expected runtime ttl of 45s, got %s", normalized.permissionResolverCacheTTL)
	}
}

func TestNormalizeAuthOptionsFallsBackWhenRuntimeTTLInvalid(t *testing.T) {
	original := runtimeConfig()
	t.Cleanup(func() { ConfigureRuntime(original) })
	override := original
	override.PermissionResolverCacheTTL = -1
	ConfigureRuntime(override)

	normalized := normalizeAuthOptions(authOptions{})
	if normalized.permissionResolverCacheTTL != 30*time.Second {
		t.Fatalf("expected fallback ttl, got %s", normalized.permissionResolverCacheTTL)
	}
}
