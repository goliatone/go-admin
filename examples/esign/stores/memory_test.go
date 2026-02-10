package stores

import (
	"context"
	"strings"
	"testing"
	"time"
)

func strPtr(value string) *string {
	return &value
}

func intPtr(value int) *int {
	return &value
}

func TestInMemoryStoreRequiresScope(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()

	if _, err := store.Create(ctx, Scope{}, DocumentRecord{SourceObjectKey: "source.pdf", SourceSHA256: strings.Repeat("a", 64)}); err == nil {
		t.Fatalf("expected scope validation error on document create")
	}
	if _, err := store.ListAgreements(ctx, Scope{}, AgreementQuery{}); err == nil {
		t.Fatalf("expected scope validation error on agreement list")
	}
	if _, err := store.ListForAgreement(ctx, Scope{}, "agreement-id", AuditEventQuery{}); err == nil {
		t.Fatalf("expected scope validation error on audit list")
	}
}

func TestInMemoryAgreementWriteGuardsAfterSend(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}

	agreement, err := store.CreateDraft(ctx, scope, AgreementRecord{
		DocumentID: "doc-1",
		Title:      "Draft Agreement",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	agreement, err = store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
		ToStatus:        AgreementStatusSent,
		ExpectedVersion: agreement.Version,
	})
	if err != nil {
		t.Fatalf("Transition: %v", err)
	}

	if _, err := store.UpdateDraft(ctx, scope, agreement.ID, AgreementDraftPatch{Title: strPtr("Updated")}, agreement.Version); err == nil {
		t.Fatalf("expected immutable-after-send guard")
	} else if !strings.Contains(err.Error(), string("AGREEMENT_IMMUTABLE")) {
		t.Fatalf("expected AGREEMENT_IMMUTABLE text code, got %v", err)
	}

	service := NewAgreementMutationService(store)
	if _, err := service.UpsertRecipientDraft(ctx, scope, agreement.ID, RecipientDraftPatch{
		Email:        strPtr("signer@example.com"),
		Role:         strPtr(RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0); err == nil {
		t.Fatalf("expected service immutable-after-send guard")
	}
}

func TestInMemoryAgreementTransitionVersionConflict(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}

	agreement, err := store.CreateDraft(ctx, scope, AgreementRecord{DocumentID: "doc-1"})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	if _, err := store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
		ToStatus:        AgreementStatusSent,
		ExpectedVersion: agreement.Version + 99,
	}); err == nil {
		t.Fatalf("expected version conflict")
	} else if !strings.Contains(err.Error(), "VERSION_CONFLICT") {
		t.Fatalf("expected VERSION_CONFLICT text code, got %v", err)
	}
}

func TestInMemoryAuditEventAppendOnlyServiceGuardrails(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}

	event, err := store.Append(ctx, scope, AuditEventRecord{
		AgreementID: "agreement-1",
		EventType:   "agreement.created",
		ActorType:   "user",
		ActorID:     "user-1",
	})
	if err != nil {
		t.Fatalf("Append: %v", err)
	}

	if err := store.UpdateAuditEvent(ctx, scope, event.ID, event); err == nil {
		t.Fatalf("expected update guard error")
	} else if !strings.Contains(err.Error(), "AUDIT_EVENTS_APPEND_ONLY") {
		t.Fatalf("expected AUDIT_EVENTS_APPEND_ONLY text code, got %v", err)
	}

	if err := store.DeleteAuditEvent(ctx, scope, event.ID); err == nil {
		t.Fatalf("expected delete guard error")
	} else if !strings.Contains(err.Error(), "AUDIT_EVENTS_APPEND_ONLY") {
		t.Fatalf("expected AUDIT_EVENTS_APPEND_ONLY text code, got %v", err)
	}
}

func TestInMemorySigningTokenLifecycle(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}

	created, err := store.CreateSigningToken(ctx, scope, SigningTokenRecord{
		AgreementID: "agreement-1",
		RecipientID: "recipient-1",
		TokenHash:   "hash-1",
		Status:      SigningTokenStatusActive,
		ExpiresAt:   time.Now().Add(15 * time.Minute),
	})
	if err != nil {
		t.Fatalf("CreateSigningToken: %v", err)
	}
	if created.TokenHash != "hash-1" {
		t.Fatalf("expected token hash persisted, got %q", created.TokenHash)
	}

	fetched, err := store.GetSigningTokenByHash(ctx, scope, "hash-1")
	if err != nil {
		t.Fatalf("GetSigningTokenByHash: %v", err)
	}
	if fetched.ID != created.ID {
		t.Fatalf("expected token id %q, got %q", created.ID, fetched.ID)
	}

	revoked, err := store.RevokeActiveSigningTokens(ctx, scope, "agreement-1", "recipient-1", time.Now())
	if err != nil {
		t.Fatalf("RevokeActiveSigningTokens: %v", err)
	}
	if revoked != 1 {
		t.Fatalf("expected 1 revoked token, got %d", revoked)
	}

	fetched, err = store.GetSigningTokenByHash(ctx, scope, "hash-1")
	if err != nil {
		t.Fatalf("GetSigningTokenByHash after revoke: %v", err)
	}
	if fetched.Status != SigningTokenStatusRevoked {
		t.Fatalf("expected revoked status, got %q", fetched.Status)
	}
	if fetched.RevokedAt == nil {
		t.Fatal("expected revoked timestamp")
	}
}

func TestInMemorySigningTokenScopeDenied(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()

	_, err := store.CreateSigningToken(ctx, Scope{TenantID: "tenant-1", OrgID: "org-1"}, SigningTokenRecord{
		AgreementID: "agreement-1",
		RecipientID: "recipient-1",
		TokenHash:   "hash-scope",
		Status:      SigningTokenStatusActive,
		ExpiresAt:   time.Now().Add(15 * time.Minute),
	})
	if err != nil {
		t.Fatalf("CreateSigningToken: %v", err)
	}

	_, err = store.GetSigningTokenByHash(ctx, Scope{TenantID: "tenant-2", OrgID: "org-1"}, "hash-scope")
	if err == nil {
		t.Fatal("expected scope denial error")
	}
	if !strings.Contains(err.Error(), string("SCOPE_DENIED")) {
		t.Fatalf("expected SCOPE_DENIED text code, got %v", err)
	}
}
