package admin

import (
	"context"
	"testing"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestResolveAuthenticatedRequestIdentityUsesTrimmedFallbacks(t *testing.T) {
	actor := &auth.ActorContext{
		ActorID:        " actor-123 ",
		Subject:        " ",
		TenantID:       "",
		OrganizationID: "",
		Metadata: map[string]any{
			"tenant_id": " tenant-1 ",
		},
	}
	ctxWithActor := auth.WithActorContext(context.Background(), actor)

	mockCtx := router.NewMockContext()
	mockCtx.HeadersM["X-Request-ID"] = " req-123 "
	mockCtx.HeadersM["X-Trace-ID"] = " trace-321 "
	mockCtx.On("Context").Return(ctxWithActor)

	identity := ResolveAuthenticatedRequestIdentity(mockCtx, AuthenticatedRequestScopeDefaults{
		TenantID: " tenant-default ",
		OrgID:    " org-default ",
		Enabled:  true,
	})

	if got := identity.ActorID; got != "actor-123" {
		t.Fatalf("expected actor id actor-123, got %q", got)
	}
	if got := identity.Subject; got != "actor-123" {
		t.Fatalf("expected subject actor-123, got %q", got)
	}
	if got := identity.TenantID; got != "tenant-1" {
		t.Fatalf("expected tenant id tenant-1, got %q", got)
	}
	if got := identity.OrgID; got != "org-default" {
		t.Fatalf("expected org id org-default, got %q", got)
	}
	if got := identity.RequestID; got != "req-123" {
		t.Fatalf("expected request id req-123, got %q", got)
	}
	if got := identity.CorrelationID; got != "req-123" {
		t.Fatalf("expected correlation id fallback req-123, got %q", got)
	}
	if got := identity.TraceID; got != "trace-321" {
		t.Fatalf("expected trace id trace-321, got %q", got)
	}

	mockCtx.AssertExpectations(t)
}
