package helpers

import (
	"context"
	"errors"
	"testing"

	authlib "github.com/goliatone/go-auth"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/goliatone/go-users/scope"
	"github.com/google/uuid"
)

func TestResolveScopeBackfillsTenantAndOrgFromContext(t *testing.T) {
	tenantID := uuid.New()
	orgID := uuid.New()
	ctx := authlib.WithActorContext(context.Background(), &authlib.ActorContext{
		TenantID:       tenantID.String(),
		OrganizationID: orgID.String(),
	})

	scope := ResolveScope(ctx, userstypes.ScopeFilter{})

	if scope.TenantID != tenantID {
		t.Fatalf("expected tenant %s, got %s", tenantID, scope.TenantID)
	}
	if scope.OrgID != orgID {
		t.Fatalf("expected org %s, got %s", orgID, scope.OrgID)
	}
}

func TestScopePolicyBlocksCrossTenantWithoutPermission(t *testing.T) {
	tenantID := uuid.New()
	otherTenant := uuid.New()
	userID := uuid.New()
	claims := &authlib.JWTClaims{
		UID:       userID.String(),
		UserRole:  string(authlib.RoleMember),
		Resources: map[string]string{"admin.tenants": string(authlib.RoleMember)},
		Metadata:  map[string]any{"tenant_id": tenantID.String()},
	}
	ctx := authlib.WithClaimsContext(context.Background(), claims)
	ctx = authlib.WithActorContext(ctx, &authlib.ActorContext{
		TenantID:      tenantID.String(),
		ResourceRoles: map[string]string{"admin.tenants": string(authlib.RoleMember)},
	})

	guard := scope.NewGuard(NewScopeResolver(), NewScopeAuthorizationPolicy())
	_, err := guard.Enforce(ctx, userstypes.ActorRef{ID: userID}, userstypes.ScopeFilter{TenantID: otherTenant}, userstypes.PolicyActionUsersRead, uuid.Nil)
	if !errors.Is(err, userstypes.ErrUnauthorizedScope) {
		t.Fatalf("expected unauthorized scope error, got %v", err)
	}
}

func TestScopePolicyAllowsCrossTenantWithAdminPermission(t *testing.T) {
	tenantID := uuid.New()
	targetTenant := uuid.New()
	userID := uuid.New()
	claims := &authlib.JWTClaims{
		UID:       userID.String(),
		UserRole:  string(authlib.RoleOwner),
		Resources: map[string]string{"admin.tenants": string(authlib.RoleOwner)},
		Metadata:  map[string]any{"tenant_id": tenantID.String()},
	}
	ctx := authlib.WithClaimsContext(context.Background(), claims)
	ctx = authlib.WithActorContext(ctx, &authlib.ActorContext{
		TenantID:      tenantID.String(),
		ResourceRoles: map[string]string{"admin.tenants": string(authlib.RoleOwner)},
	})

	guard := scope.NewGuard(NewScopeResolver(), NewScopeAuthorizationPolicy())
	resolved, err := guard.Enforce(ctx, userstypes.ActorRef{ID: userID}, userstypes.ScopeFilter{TenantID: targetTenant}, userstypes.PolicyActionUsersWrite, uuid.Nil)
	if err != nil {
		t.Fatalf("expected cross-tenant access to be allowed, got %v", err)
	}
	if resolved.TenantID != targetTenant {
		t.Fatalf("expected resolved tenant %s, got %s", targetTenant, resolved.TenantID)
	}
}

func TestScopePolicyAllowsWhenClaimsMissing(t *testing.T) {
	guard := scope.NewGuard(NewScopeResolver(), NewScopeAuthorizationPolicy())
	resolved, err := guard.Enforce(context.Background(), userstypes.ActorRef{}, userstypes.ScopeFilter{}, userstypes.PolicyActionUsersRead, uuid.Nil)
	if err != nil {
		t.Fatalf("expected no error without claims, got %v", err)
	}
	if resolved.TenantID != uuid.Nil || resolved.OrgID != uuid.Nil {
		t.Fatalf("expected empty scope for single-tenant path, got %+v", resolved)
	}
}
