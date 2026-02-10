package stores

import (
	"context"
	"errors"
	"testing"
	"time"

	goerrors "github.com/goliatone/go-errors"
)

func TestTokenServiceIssueStoresHashOnly(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	service := NewTokenService(store, WithTokenPepper("unit-test-pepper"))

	issued, err := service.Issue(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if issued.Token == "" {
		t.Fatal("expected opaque token")
	}
	if issued.Record.TokenHash == issued.Token {
		t.Fatal("expected hash-only persistence, token hash matched raw token")
	}

	record, err := store.GetSigningTokenByHash(ctx, scope, issued.Record.TokenHash)
	if err != nil {
		t.Fatalf("GetSigningTokenByHash: %v", err)
	}
	if record.RecipientID != "recipient-1" {
		t.Fatalf("expected recipient-1, got %q", record.RecipientID)
	}

	validated, err := service.Validate(ctx, scope, issued.Token)
	if err != nil {
		t.Fatalf("Validate: %v", err)
	}
	if validated.ID != issued.Record.ID {
		t.Fatalf("expected token id %q, got %q", issued.Record.ID, validated.ID)
	}
}

func TestTokenServiceRotateRevokesPreviousToken(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	service := NewTokenService(store)

	issued, err := service.Issue(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	rotated, err := service.Rotate(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Rotate: %v", err)
	}
	if rotated.Token == issued.Token {
		t.Fatal("expected rotated token to differ from original token")
	}

	if _, err := service.Validate(ctx, scope, issued.Token); err == nil {
		t.Fatal("expected original token to be revoked")
	} else if textCode(err) != "TOKEN_REVOKED" {
		t.Fatalf("expected TOKEN_REVOKED, got %v", err)
	}

	if _, err := service.Validate(ctx, scope, rotated.Token); err != nil {
		t.Fatalf("expected rotated token to validate, got %v", err)
	}
}

func TestTokenServiceValidateReturnsExpiredAndRevokedTypedErrors(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	baseNow := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	service := NewTokenService(store,
		WithTokenTTL(time.Minute),
		WithTokenClock(func() time.Time { return baseNow }),
	)

	expired, err := service.Issue(ctx, scope, "agreement-expired", "recipient-expired")
	if err != nil {
		t.Fatalf("Issue expired token: %v", err)
	}
	revoked, err := service.Issue(ctx, scope, "agreement-revoked", "recipient-revoked")
	if err != nil {
		t.Fatalf("Issue revoked token: %v", err)
	}

	expiredSvc := NewTokenService(store, WithTokenClock(func() time.Time { return baseNow.Add(2 * time.Hour) }))
	if _, err := expiredSvc.Validate(ctx, scope, expired.Token); err == nil {
		t.Fatal("expected expired token error")
	} else if textCode(err) != "TOKEN_EXPIRED" {
		t.Fatalf("expected TOKEN_EXPIRED, got %v", err)
	}

	if err := service.Revoke(ctx, scope, "agreement-revoked", "recipient-revoked"); err != nil {
		t.Fatalf("Revoke: %v", err)
	}
	if _, err := service.Validate(ctx, scope, revoked.Token); err == nil {
		t.Fatal("expected revoked token error")
	} else if textCode(err) != "TOKEN_REVOKED" {
		t.Fatalf("expected TOKEN_REVOKED, got %v", err)
	}
}

func TestTokenServiceValidateScopeDenied(t *testing.T) {
	ctx := context.Background()
	store := NewInMemoryStore()
	service := NewTokenService(store)

	issued, err := service.Issue(ctx, Scope{TenantID: "tenant-1", OrgID: "org-1"}, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	if _, err := service.Validate(ctx, Scope{TenantID: "tenant-2", OrgID: "org-1"}, issued.Token); err == nil {
		t.Fatal("expected scope denial")
	} else if textCode(err) != "SCOPE_DENIED" {
		t.Fatalf("expected SCOPE_DENIED, got %v", err)
	}
}

func textCode(err error) string {
	if err == nil {
		return ""
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) {
		return coded.TextCode
	}
	return ""
}
