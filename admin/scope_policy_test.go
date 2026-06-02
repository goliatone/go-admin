package admin

import (
	"context"
	"testing"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestAdminEffectiveScopeDefaultsOnlyInSingleTenant(t *testing.T) {
	single := &Admin{config: Config{
		ScopeMode:       "single",
		DefaultTenantID: "tenant-default",
		DefaultOrgID:    "org-default",
	}}
	scope := single.EffectiveScope(context.Background(), ScopeInput{})
	if scope.TenantID != "tenant-default" || scope.OrgID != "org-default" {
		t.Fatalf("single scope = (%q, %q), want defaults", scope.TenantID, scope.OrgID)
	}

	multi := &Admin{config: Config{
		ScopeMode:       "multi",
		DefaultTenantID: "tenant-default",
		DefaultOrgID:    "org-default",
	}}
	scope = multi.EffectiveScope(context.Background(), ScopeInput{})
	if scope.TenantID != "" || scope.OrgID != "" {
		t.Fatalf("multi scope = (%q, %q), want blank", scope.TenantID, scope.OrgID)
	}
}

func TestAdminEffectiveScopePreservesExplicitAndFillsPartialSingleTenant(t *testing.T) {
	adm := &Admin{config: Config{
		ScopeMode:       "single",
		DefaultTenantID: "tenant-default",
		DefaultOrgID:    "org-default",
	}}

	scope := adm.EffectiveScope(context.Background(), ScopeInput{TenantID: "tenant-explicit"})

	if scope.TenantID != "tenant-explicit" {
		t.Fatalf("expected explicit tenant, got %q", scope.TenantID)
	}
	if scope.OrgID != "org-default" {
		t.Fatalf("expected default org, got %q", scope.OrgID)
	}
}

func TestAdminEffectiveScopeFromRequestIgnoresQueryScope(t *testing.T) {
	adm := &Admin{config: Config{
		ScopeMode:       "single",
		DefaultTenantID: "tenant-default",
		DefaultOrgID:    "org-default",
	}}
	ctx := router.NewMockContext()
	ctx.QueriesM["tenant_id"] = "tenant-query"
	ctx.QueriesM["org_id"] = "org-query"
	ctx.On("Context").Return(context.Background())

	scope := adm.EffectiveScopeFromRequest(ctx, ScopeInput{})

	if scope.TenantID != "tenant-default" || scope.OrgID != "org-default" {
		t.Fatalf("scope = (%q, %q), want single-tenant defaults", scope.TenantID, scope.OrgID)
	}
	ctx.AssertExpectations(t)
}

func TestAdminEffectiveScopeFromRequestPreservesTrustedActorScope(t *testing.T) {
	adm := &Admin{config: Config{
		ScopeMode:       "single",
		DefaultTenantID: "tenant-default",
		DefaultOrgID:    "org-default",
	}}
	requestCtx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID:        "actor-1",
		TenantID:       "tenant-actor",
		OrganizationID: "org-actor",
	})
	ctx := router.NewMockContext()
	ctx.QueriesM["tenant_id"] = "tenant-query"
	ctx.QueriesM["org_id"] = "org-query"
	ctx.On("Context").Return(requestCtx)

	scope := adm.EffectiveScopeFromRequest(ctx, ScopeInput{})

	if scope.TenantID != "tenant-actor" || scope.OrgID != "org-actor" {
		t.Fatalf("scope = (%q, %q), want actor scope", scope.TenantID, scope.OrgID)
	}
	ctx.AssertExpectations(t)
}

func TestAdminContextFromRequestUsesEffectiveScopeAndIgnoresQueryScope(t *testing.T) {
	adm := &Admin{config: Config{
		DefaultLocale:   "en",
		ScopeMode:       "single",
		DefaultTenantID: "tenant-default",
		DefaultOrgID:    "org-default",
	}}
	ctx := router.NewMockContext()
	ctx.HeadersM["X-User-ID"] = "actor-1"
	ctx.QueriesM["tenant_id"] = "tenant-query"
	ctx.QueriesM["org_id"] = "org-query"
	ctx.On("Context").Return(context.Background())
	ctx.On("IP").Return("")

	adminCtx := adm.adminContextFromRequest(ctx, "en")

	if adminCtx.TenantID != "tenant-default" || adminCtx.OrgID != "org-default" {
		t.Fatalf("admin context scope = (%q, %q), want defaults", adminCtx.TenantID, adminCtx.OrgID)
	}
	if got := tenantIDFromContext(adminCtx.Context); got != "tenant-default" {
		t.Fatalf("tenantIDFromContext = %q, want tenant-default", got)
	}
	if got := orgIDFromContext(adminCtx.Context); got != "org-default" {
		t.Fatalf("orgIDFromContext = %q, want org-default", got)
	}
	ctx.AssertExpectations(t)
}
