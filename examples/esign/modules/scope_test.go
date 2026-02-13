package modules

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
	auth "github.com/goliatone/go-auth"
)

func TestResolveScopeFromContextUsesActorMetadataFallback(t *testing.T) {
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		Metadata: map[string]any{
			"tenant_id":       "tenant-meta-1",
			"organization_id": "org-meta-1",
		},
	})

	scope, err := resolveScopeFromContext(ctx, stores.Scope{TenantID: "tenant-fallback", OrgID: "org-fallback"})
	if err != nil {
		t.Fatalf("resolveScopeFromContext: %v", err)
	}
	if scope.TenantID != "tenant-meta-1" {
		t.Fatalf("expected tenant from actor metadata, got %q", scope.TenantID)
	}
	if scope.OrgID != "org-meta-1" {
		t.Fatalf("expected org from actor metadata, got %q", scope.OrgID)
	}
}

func TestResolveScopeFromContextFallsBackToConfiguredScope(t *testing.T) {
	scope, err := resolveScopeFromContext(context.Background(), stores.Scope{TenantID: "tenant-fallback", OrgID: "org-fallback"})
	if err != nil {
		t.Fatalf("resolveScopeFromContext: %v", err)
	}
	if scope.TenantID != "tenant-fallback" {
		t.Fatalf("expected fallback tenant, got %q", scope.TenantID)
	}
	if scope.OrgID != "org-fallback" {
		t.Fatalf("expected fallback org, got %q", scope.OrgID)
	}
}
