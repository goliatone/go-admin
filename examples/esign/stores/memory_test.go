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

func boolPtr(value bool) *bool {
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

func TestInMemorySignatureArtifactAndFieldValueAttachment(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}

	agreement, err := store.CreateDraft(ctx, scope, AgreementRecord{
		DocumentID: "doc-1",
		Title:      "Signature Agreement",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	recipient, err := store.UpsertRecipientDraft(ctx, scope, agreement.ID, RecipientDraftPatch{
		Email:        strPtr("signer@example.com"),
		Role:         strPtr(RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	field, err := store.UpsertFieldDraft(ctx, scope, agreement.ID, FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        strPtr(FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	artifact, err := store.CreateSignatureArtifact(ctx, scope, SignatureArtifactRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		Type:        "typed",
		ObjectKey:   "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-1.png",
		SHA256:      strings.Repeat("a", 64),
	})
	if err != nil {
		t.Fatalf("CreateSignatureArtifact: %v", err)
	}
	if _, err := store.GetSignatureArtifact(ctx, scope, artifact.ID); err != nil {
		t.Fatalf("GetSignatureArtifact: %v", err)
	}

	value, err := store.UpsertFieldValue(ctx, scope, FieldValueRecord{
		AgreementID:         agreement.ID,
		RecipientID:         recipient.ID,
		FieldID:             field.ID,
		SignatureArtifactID: artifact.ID,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertFieldValue with signature artifact: %v", err)
	}
	if value.SignatureArtifactID != artifact.ID {
		t.Fatalf("expected signature artifact id %q, got %q", artifact.ID, value.SignatureArtifactID)
	}

	if _, err := store.UpsertFieldValue(ctx, scope, FieldValueRecord{
		AgreementID:         agreement.ID,
		RecipientID:         recipient.ID,
		FieldID:             field.ID,
		SignatureArtifactID: "missing-artifact-id",
	}, value.Version); err == nil {
		t.Fatal("expected missing signature artifact validation error")
	}
}

func TestInMemoryDeclineRecipient(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}

	agreement, err := store.CreateDraft(ctx, scope, AgreementRecord{
		DocumentID: "doc-1",
		Title:      "Decline Agreement",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	recipient, err := store.UpsertRecipientDraft(ctx, scope, agreement.ID, RecipientDraftPatch{
		Email:        strPtr("signer@example.com"),
		Role:         strPtr(RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	agreement, err = store.Transition(ctx, scope, agreement.ID, AgreementTransitionInput{
		ToStatus:        AgreementStatusSent,
		ExpectedVersion: agreement.Version,
	})
	if err != nil {
		t.Fatalf("Transition sent: %v", err)
	}

	declined, err := store.DeclineRecipient(ctx, scope, agreement.ID, recipient.ID, "I decline", time.Now(), recipient.Version)
	if err != nil {
		t.Fatalf("DeclineRecipient: %v", err)
	}
	if declined.DeclinedAt == nil {
		t.Fatal("expected recipient declined timestamp")
	}
	if declined.DeclineReason != "I decline" {
		t.Fatalf("expected decline reason persisted, got %q", declined.DeclineReason)
	}
}

func TestInMemoryTouchRecipientViewLifecycle(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}

	agreement, err := store.CreateDraft(ctx, scope, AgreementRecord{
		DocumentID: "doc-1",
		Title:      "View Lifecycle Agreement",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	recipient, err := store.UpsertRecipientDraft(ctx, scope, agreement.ID, RecipientDraftPatch{
		Email:        strPtr("signer@example.com"),
		Role:         strPtr(RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}

	firstSeen := time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)
	touched, err := store.TouchRecipientView(ctx, scope, agreement.ID, recipient.ID, firstSeen)
	if err != nil {
		t.Fatalf("TouchRecipientView first: %v", err)
	}
	if touched.FirstViewAt == nil || touched.LastViewAt == nil {
		t.Fatalf("expected first/last view timestamps after first touch, got %+v", touched)
	}
	if !touched.FirstViewAt.Equal(firstSeen) || !touched.LastViewAt.Equal(firstSeen) {
		t.Fatalf("expected first and last view to equal firstSeen, got first=%s last=%s", touched.FirstViewAt, touched.LastViewAt)
	}

	secondSeen := firstSeen.Add(20 * time.Minute)
	touched, err = store.TouchRecipientView(ctx, scope, agreement.ID, recipient.ID, secondSeen)
	if err != nil {
		t.Fatalf("TouchRecipientView second: %v", err)
	}
	if !touched.FirstViewAt.Equal(firstSeen) {
		t.Fatalf("expected first_view_at to remain %s, got %s", firstSeen, touched.FirstViewAt)
	}
	if !touched.LastViewAt.Equal(secondSeen) {
		t.Fatalf("expected last_view_at to update to %s, got %s", secondSeen, touched.LastViewAt)
	}
}

func TestInMemoryStorePersistsGoogleSourceMetadata(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}

	modifiedAt := time.Date(2026, 2, 10, 10, 30, 0, 0, time.UTC)
	exportedAt := time.Date(2026, 2, 10, 10, 35, 0, 0, time.UTC)

	doc, err := store.Create(ctx, scope, DocumentRecord{
		Title:                  "Imported Google Doc",
		SourceObjectKey:        "tenant/tenant-1/org/org-1/docs/google-import.pdf",
		SourceSHA256:           strings.Repeat("a", 64),
		SizeBytes:              1024,
		PageCount:              2,
		SourceType:             SourceTypeGoogleDrive,
		SourceGoogleFileID:     "file-123",
		SourceGoogleDocURL:     "https://docs.google.com/document/d/file-123/edit",
		SourceModifiedTime:     &modifiedAt,
		SourceExportedAt:       &exportedAt,
		SourceExportedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}
	if doc.SourceType != SourceTypeGoogleDrive {
		t.Fatalf("expected source_type=%s, got %q", SourceTypeGoogleDrive, doc.SourceType)
	}

	agreement, err := store.CreateDraft(ctx, scope, AgreementRecord{
		DocumentID:             doc.ID,
		Title:                  "Imported Agreement",
		SourceType:             SourceTypeGoogleDrive,
		SourceGoogleFileID:     "file-123",
		SourceGoogleDocURL:     "https://docs.google.com/document/d/file-123/edit",
		SourceModifiedTime:     &modifiedAt,
		SourceExportedAt:       &exportedAt,
		SourceExportedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	if agreement.SourceGoogleFileID != "file-123" {
		t.Fatalf("expected source_google_file_id persisted, got %q", agreement.SourceGoogleFileID)
	}
	if agreement.SourceModifiedTime == nil || !agreement.SourceModifiedTime.Equal(modifiedAt) {
		t.Fatalf("expected source_modified_time persisted, got %+v", agreement.SourceModifiedTime)
	}
	if agreement.SourceExportedAt == nil || !agreement.SourceExportedAt.Equal(exportedAt) {
		t.Fatalf("expected source_exported_at persisted, got %+v", agreement.SourceExportedAt)
	}
}

func TestInMemoryIntegrationCredentialScopedCRUD(t *testing.T) {
	store := NewInMemoryStore()
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	expiresAt := time.Date(2026, 2, 11, 9, 0, 0, 0, time.UTC)

	created, err := store.UpsertIntegrationCredential(ctx, scope, IntegrationCredentialRecord{
		UserID:                "user-1",
		Provider:              "google",
		EncryptedAccessToken:  "enc-access-1",
		EncryptedRefreshToken: "enc-refresh-1",
		Scopes:                []string{"https://www.googleapis.com/auth/drive.readonly"},
		ExpiresAt:             &expiresAt,
	})
	if err != nil {
		t.Fatalf("UpsertIntegrationCredential create: %v", err)
	}
	if created.ID == "" {
		t.Fatal("expected integration credential id")
	}

	fetched, err := store.GetIntegrationCredential(ctx, scope, "google", "user-1")
	if err != nil {
		t.Fatalf("GetIntegrationCredential: %v", err)
	}
	if fetched.EncryptedAccessToken != "enc-access-1" {
		t.Fatalf("expected encrypted access token persisted, got %q", fetched.EncryptedAccessToken)
	}
	if len(fetched.Scopes) != 1 || fetched.Scopes[0] != "https://www.googleapis.com/auth/drive.readonly" {
		t.Fatalf("expected scopes persisted, got %+v", fetched.Scopes)
	}

	updated, err := store.UpsertIntegrationCredential(ctx, scope, IntegrationCredentialRecord{
		UserID:                "user-1",
		Provider:              "google",
		EncryptedAccessToken:  "enc-access-2",
		EncryptedRefreshToken: "enc-refresh-2",
		Scopes: []string{
			"https://www.googleapis.com/auth/drive.readonly",
			"https://www.googleapis.com/auth/userinfo.email",
		},
	})
	if err != nil {
		t.Fatalf("UpsertIntegrationCredential update: %v", err)
	}
	if updated.ID != created.ID {
		t.Fatalf("expected update to preserve id %q, got %q", created.ID, updated.ID)
	}
	if updated.EncryptedAccessToken != "enc-access-2" {
		t.Fatalf("expected encrypted access token updated, got %q", updated.EncryptedAccessToken)
	}

	if err := store.DeleteIntegrationCredential(ctx, scope, "google", "user-1"); err != nil {
		t.Fatalf("DeleteIntegrationCredential: %v", err)
	}
	if _, err := store.GetIntegrationCredential(ctx, scope, "google", "user-1"); err == nil {
		t.Fatal("expected missing integration credential after delete")
	}
}
