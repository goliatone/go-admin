package admin

import (
	"context"
	"strings"
	"testing"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestSyncTransportAdapterResolveUsesAuthenticatedIdentityAndCanonicalScope(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "claims-user-1",
		UserRole: string(auth.RoleAdmin),
		Metadata: map[string]any{
			"tenant_id": "tenant-1",
			"org_id":    "org-1",
		},
	}
	ctxWithClaims := auth.WithClaimsContext(context.Background(), claims)

	mockCtx := router.NewMockContext()
	mockCtx.HeadersM["X-User-ID"] = "spoofed-user"
	mockCtx.HeadersM["X-Request-ID"] = "req-sync-adapter-1"
	mockCtx.HeadersM["X-Correlation-ID"] = "corr-sync-adapter-1"
	mockCtx.HeadersM["X-Trace-ID"] = "trace-sync-adapter-1"
	mockCtx.On("Context").Return(ctxWithClaims)

	metadata, err := (SyncTransportAdapter{
		ResolveScope: func(_ router.Context, authenticated AuthenticatedRequestIdentity) (map[string]string, error) {
			if got := strings.TrimSpace(authenticated.ActorID); got != "claims-user-1" {
				t.Fatalf("expected authenticated actor claims-user-1, got %q", got)
			}
			return map[string]string{
				"tenant_id": "tenant-1",
				"org_id":    "org-1",
				"actor_id":  authenticated.ActorID,
			}, nil
		},
	}).Resolve(mockCtx)
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}

	if got := strings.TrimSpace(metadata.ActorID); got != "claims-user-1" {
		t.Fatalf("expected actor id claims-user-1, got %q", got)
	}
	if got := strings.TrimSpace(metadata.Scope["actor_id"]); got != "claims-user-1" {
		t.Fatalf("expected canonical scope actor_id claims-user-1, got %q", got)
	}
	if got := strings.TrimSpace(metadata.RequestID); got != "req-sync-adapter-1" {
		t.Fatalf("expected request id req-sync-adapter-1, got %q", got)
	}
	if got := strings.TrimSpace(metadata.CorrelationID); got != "corr-sync-adapter-1" {
		t.Fatalf("expected correlation id corr-sync-adapter-1, got %q", got)
	}
	if got := strings.TrimSpace(metadata.TraceID); got != "trace-sync-adapter-1" {
		t.Fatalf("expected trace id trace-sync-adapter-1, got %q", got)
	}
}

func TestSyncTransportAdapterResolveRejectsSpoofedActorHeaderWithoutAuthenticatedIdentity(t *testing.T) {
	mockCtx := router.NewMockContext()
	mockCtx.HeadersM["X-User-ID"] = "spoofed-user"
	mockCtx.On("Context").Return(context.Background())

	_, err := (SyncTransportAdapter{
		ResolveScope: func(_ router.Context, authenticated AuthenticatedRequestIdentity) (map[string]string, error) {
			return map[string]string{
				"tenant_id": "tenant-1",
				"org_id":    "org-1",
				"actor_id":  authenticated.ActorID,
			}, nil
		},
	}).Resolve(mockCtx)
	if err == nil {
		t.Fatal("expected Resolve to reject spoofed header without authenticated identity")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "authenticated actor is required") {
		t.Fatalf("expected authenticated actor error, got %v", err)
	}
}
