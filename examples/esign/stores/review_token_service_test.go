package stores

import (
	"context"
	"testing"
	"time"
)

func TestReviewSessionTokenServiceIssueAndValidate(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	service := NewReviewSessionTokenService(store, WithReviewSessionTokenPepper("review-test-pepper"))

	issued, err := service.Issue(ctx, scope, "agreement-1", "review-1", "participant-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if issued.Token == "" {
		t.Fatal("expected opaque token")
	}
	if issued.Record.TokenHash == issued.Token {
		t.Fatal("expected hash-only persistence")
	}

	validated, err := service.Validate(ctx, scope, issued.Token)
	if err != nil {
		t.Fatalf("Validate: %v", err)
	}
	if validated.ID != issued.Record.ID {
		t.Fatalf("expected token id %q, got %q", issued.Record.ID, validated.ID)
	}
}

func TestReviewSessionTokenServiceRotateRevokesPreviousToken(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	service := NewReviewSessionTokenService(store)

	issued, err := service.Issue(ctx, scope, "agreement-1", "review-1", "participant-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	rotated, err := service.Rotate(ctx, scope, "agreement-1", "review-1", "participant-1")
	if err != nil {
		t.Fatalf("Rotate: %v", err)
	}
	if rotated.Token == issued.Token {
		t.Fatal("expected rotated token to differ")
	}
	if _, err := service.Validate(ctx, scope, issued.Token); err == nil {
		t.Fatal("expected original token to be revoked")
	} else if textCode(err) != "TOKEN_REVOKED" {
		t.Fatalf("expected TOKEN_REVOKED, got %v", err)
	}
}

func TestReviewSessionTokenServiceValidateReturnsExpiredError(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	baseNow := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	service := NewReviewSessionTokenService(store,
		WithReviewSessionTokenTTL(time.Minute),
		WithReviewSessionTokenClock(func() time.Time { return baseNow }),
	)

	issued, err := service.Issue(ctx, scope, "agreement-1", "review-1", "participant-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	expired := NewReviewSessionTokenService(store, WithReviewSessionTokenClock(func() time.Time { return baseNow.Add(2 * time.Hour) }))
	if _, err := expired.Validate(ctx, scope, issued.Token); err == nil {
		t.Fatal("expected TOKEN_EXPIRED")
	} else if textCode(err) != "TOKEN_EXPIRED" {
		t.Fatalf("expected TOKEN_EXPIRED, got %v", err)
	}
}
