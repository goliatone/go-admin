package helpers

import (
	"context"
	"testing"

	authlib "github.com/goliatone/go-auth"
)

func TestBuildSessionUserAuthenticatedFallbackDisplayName(t *testing.T) {
	ctx := authlib.WithActorContext(context.Background(), &authlib.ActorContext{
		ActorID: "user-1",
	})

	session := BuildSessionUser(ctx)

	if !session.IsAuthenticated {
		t.Fatalf("expected authenticated session")
	}
	if session.DisplayName != "Authenticated User" {
		t.Fatalf("expected authenticated fallback display name, got %q", session.DisplayName)
	}
	if session.Initial != "A" {
		t.Fatalf("expected initial A, got %q", session.Initial)
	}
}

func TestBuildSessionUserPreservesExampleSubtitleFormatting(t *testing.T) {
	ctx := authlib.WithActorContext(context.Background(), &authlib.ActorContext{
		ActorID:  "user-1",
		Subject:  "subject-1",
		Role:     "admin",
		TenantID: "tenant-1",
		Metadata: map[string]any{
			"name":  "Alice",
			"email": "alice@example.com",
		},
	})

	session := BuildSessionUser(ctx)

	if session.Subtitle != "alice@example.com · admin · tenant-1" {
		t.Fatalf("unexpected subtitle %q", session.Subtitle)
	}
}
