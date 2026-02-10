package services

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

type capturingCompletionWorkflow struct {
	calls        int
	agreementIDs []string
	correlations []string
}

func (c *capturingCompletionWorkflow) RunCompletionWorkflow(_ context.Context, _ stores.Scope, agreementID, correlationID string) error {
	c.calls++
	c.agreementIDs = append(c.agreementIDs, strings.TrimSpace(agreementID))
	c.correlations = append(c.correlations, strings.TrimSpace(correlationID))
	return nil
}

func anyToString(value any) string {
	if value == nil {
		return ""
	}
	if out, ok := value.(string); ok {
		return out
	}
	return ""
}

func TestSigningServiceGetSessionSequentialState(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signerOne, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-1@example.com"),
		Name:         stringPtr("Signer One"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer one: %v", err)
	}
	signerTwo, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-2@example.com"),
		Name:         stringPtr("Signer Two"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer two: %v", err)
	}

	fieldOne, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerOne.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signer one: %v", err)
	}
	fieldTwo, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(2),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signer two: %v", err)
	}

	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-session"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	if _, err := store.UpsertFieldValue(ctx, scope, stores.FieldValueRecord{
		AgreementID: agreement.ID,
		RecipientID: signerTwo.ID,
		FieldID:     fieldTwo.ID,
		ValueText:   "Signer Two",
	}, 0); err != nil {
		t.Fatalf("UpsertFieldValue signer two: %v", err)
	}

	signingSvc := NewSigningService(store, store)

	activeSession, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signerOne.ID,
	})
	if err != nil {
		t.Fatalf("GetSession active signer: %v", err)
	}
	if activeSession.State != SignerSessionStateActive {
		t.Fatalf("expected active state, got %q", activeSession.State)
	}
	if activeSession.ActiveRecipientID != signerOne.ID {
		t.Fatalf("expected active recipient id %q, got %q", signerOne.ID, activeSession.ActiveRecipientID)
	}
	if len(activeSession.Fields) != 1 || activeSession.Fields[0].ID != fieldOne.ID {
		t.Fatalf("expected signer one field context, got %+v", activeSession.Fields)
	}

	waitingSession, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signerTwo.ID,
	})
	if err != nil {
		t.Fatalf("GetSession waiting signer: %v", err)
	}
	if waitingSession.State != SignerSessionStateWaiting {
		t.Fatalf("expected waiting state, got %q", waitingSession.State)
	}
	if waitingSession.WaitingForRecipient != signerOne.ID {
		t.Fatalf("expected waiting for %q, got %q", signerOne.ID, waitingSession.WaitingForRecipient)
	}
	if len(waitingSession.Fields) != 1 || waitingSession.Fields[0].ID != fieldTwo.ID {
		t.Fatalf("expected signer two field context, got %+v", waitingSession.Fields)
	}
	if waitingSession.Fields[0].ValueText != "Signer Two" {
		t.Fatalf("expected signer two value snapshot, got %+v", waitingSession.Fields[0])
	}
}

func TestSigningServiceTracksRecipientViewLifecycle(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-view"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	viewTime := time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)
	signingSvc := NewSigningService(store, store, WithSigningClock(func() time.Time {
		return viewTime
	}))

	if _, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}); err != nil {
		t.Fatalf("GetSession first view: %v", err)
	}
	recipients, err := store.ListRecipients(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListRecipients after first view: %v", err)
	}
	if len(recipients) != 1 || recipients[0].FirstViewAt == nil || recipients[0].LastViewAt == nil {
		t.Fatalf("expected first/last view timestamps after first session, got %+v", recipients)
	}
	if !recipients[0].FirstViewAt.Equal(viewTime) {
		t.Fatalf("expected first_view_at %s, got %s", viewTime, recipients[0].FirstViewAt)
	}

	viewTime = viewTime.Add(15 * time.Minute)
	if _, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}); err != nil {
		t.Fatalf("GetSession second view: %v", err)
	}
	recipients, err = store.ListRecipients(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListRecipients after second view: %v", err)
	}
	if !recipients[0].FirstViewAt.Equal(time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)) {
		t.Fatalf("expected stable first_view_at, got %s", recipients[0].FirstViewAt)
	}
	if !recipients[0].LastViewAt.Equal(viewTime) {
		t.Fatalf("expected last_view_at %s, got %s", viewTime, recipients[0].LastViewAt)
	}
}

func TestSigningServiceCaptureConsentAndUpsertFieldValue(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Name:         stringPtr("Signer"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	requiredTextField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-consent-upsert"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store, store)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}

	consent, err := signingSvc.CaptureConsent(ctx, scope, token, SignerConsentInput{Accepted: true})
	if err != nil {
		t.Fatalf("CaptureConsent: %v", err)
	}
	if consent.AcceptedAt.IsZero() {
		t.Fatal("expected consent timestamp")
	}

	if _, err := signingSvc.UpsertFieldValue(ctx, scope, token, SignerFieldValueInput{
		FieldID:   requiredTextField.ID,
		ValueText: "   ",
	}); err == nil {
		t.Fatal("expected required field value validation error")
	} else if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS error code, got %v", err)
	}

	created, err := signingSvc.UpsertFieldValue(ctx, scope, token, SignerFieldValueInput{
		FieldID:   requiredTextField.ID,
		ValueText: "Signed Name",
	})
	if err != nil {
		t.Fatalf("UpsertFieldValue create: %v", err)
	}
	if created.Version != 1 {
		t.Fatalf("expected version 1, got %d", created.Version)
	}

	updated, err := signingSvc.UpsertFieldValue(ctx, scope, token, SignerFieldValueInput{
		FieldID:   requiredTextField.ID,
		ValueText: "Updated Signed Name",
	})
	if err != nil {
		t.Fatalf("UpsertFieldValue update: %v", err)
	}
	if updated.Version != 2 {
		t.Fatalf("expected version 2, got %d", updated.Version)
	}
	if updated.ID != created.ID {
		t.Fatalf("expected stable field value id %q, got %q", created.ID, updated.ID)
	}
}

func TestSigningServiceRejectsWaitingSignerConsentAndFieldUpsert(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signerOne, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-1@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer one: %v", err)
	}
	signerTwo, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-2@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer two: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerOne.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer one signature: %v", err)
	}
	waitingField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signer two text: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer two signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-waiting"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store, store)
	waitingToken := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signerTwo.ID,
	}

	if _, err := signingSvc.CaptureConsent(ctx, scope, waitingToken, SignerConsentInput{Accepted: true}); err == nil {
		t.Fatal("expected waiting signer consent rejection")
	} else if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS error code, got %v", err)
	}

	if _, err := signingSvc.UpsertFieldValue(ctx, scope, waitingToken, SignerFieldValueInput{
		FieldID:   waitingField.ID,
		ValueText: "Should fail",
	}); err == nil {
		t.Fatal("expected waiting signer field upsert rejection")
	} else if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS error code, got %v", err)
	}
}

func TestSigningServiceAttachSignatureArtifact(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-signature-attach"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store, store)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}

	result, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "typed",
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-1.png",
		SHA256:    strings.Repeat("a", 64),
		ValueText: "Signer Name",
	})
	if err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}
	if result.Artifact.ID == "" {
		t.Fatal("expected signature artifact id")
	}
	if result.Artifact.Type != "typed" {
		t.Fatalf("expected typed artifact, got %q", result.Artifact.Type)
	}
	if result.FieldValue.SignatureArtifactID != result.Artifact.ID {
		t.Fatalf("expected field value signature id %q, got %q", result.Artifact.ID, result.FieldValue.SignatureArtifactID)
	}
	if result.FieldValue.FieldID != signatureField.ID {
		t.Fatalf("expected signature field id %q, got %q", signatureField.ID, result.FieldValue.FieldID)
	}
	if _, err := store.GetSignatureArtifact(ctx, scope, result.Artifact.ID); err != nil {
		t.Fatalf("GetSignatureArtifact: %v", err)
	}

	if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "unknown",
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-2.png",
		SHA256:    strings.Repeat("b", 64),
	}); err == nil {
		t.Fatal("expected invalid signature type error")
	} else if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS error code, got %v", err)
	}
}

func TestSigningServiceSubmitWithIdempotencyAndCAS(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-submit"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store, store)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}
	if _, err := signingSvc.CaptureConsent(ctx, scope, token, SignerConsentInput{Accepted: true}); err != nil {
		t.Fatalf("CaptureConsent: %v", err)
	}
	if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "typed",
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-submit.png",
		SHA256:    strings.Repeat("c", 64),
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}
	if _, err := signingSvc.UpsertFieldValue(ctx, scope, token, SignerFieldValueInput{
		FieldID:   textField.ID,
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("UpsertFieldValue: %v", err)
	}

	first, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: "submit-key-1"})
	if err != nil {
		t.Fatalf("Submit first: %v", err)
	}
	if !first.Completed {
		t.Fatal("expected single-signer submit to complete agreement")
	}
	if first.Agreement.Status != stores.AgreementStatusCompleted {
		t.Fatalf("expected completed agreement status, got %q", first.Agreement.Status)
	}
	if first.Recipient.CompletedAt == nil {
		t.Fatal("expected recipient completion timestamp")
	}

	second, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: "submit-key-1"})
	if err != nil {
		t.Fatalf("Submit idempotent replay: %v", err)
	}
	if second.Agreement.Version != first.Agreement.Version {
		t.Fatalf("expected idempotent agreement version %d, got %d", first.Agreement.Version, second.Agreement.Version)
	}

	if _, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{}); err == nil {
		t.Fatal("expected submit idempotency key requirement error")
	} else if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS error code, got %v", err)
	}
}

func TestSigningServiceSubmitTriggersCompletionWorkflowOnFinalSigner(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase5-submit-trigger"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	completionFlow := &capturingCompletionWorkflow{}
	signingSvc := NewSigningService(store, store, WithSigningCompletionWorkflow(completionFlow))
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}
	if _, err := signingSvc.CaptureConsent(ctx, scope, token, SignerConsentInput{Accepted: true}); err != nil {
		t.Fatalf("CaptureConsent: %v", err)
	}
	if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "typed",
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-submit-trigger.png",
		SHA256:    strings.Repeat("f", 64),
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}
	if _, err := signingSvc.UpsertFieldValue(ctx, scope, token, SignerFieldValueInput{
		FieldID:   textField.ID,
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("UpsertFieldValue: %v", err)
	}
	if _, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: "submit-trigger-key-1"}); err != nil {
		t.Fatalf("Submit: %v", err)
	}
	if completionFlow.calls != 1 {
		t.Fatalf("expected completion workflow once, got %d", completionFlow.calls)
	}
	if len(completionFlow.agreementIDs) != 1 || completionFlow.agreementIDs[0] != agreement.ID {
		t.Fatalf("expected workflow agreement id %q, got %+v", agreement.ID, completionFlow.agreementIDs)
	}
	if len(completionFlow.correlations) != 1 || completionFlow.correlations[0] != "submit-trigger-key-1" {
		t.Fatalf("expected workflow correlation id submit-trigger-key-1, got %+v", completionFlow.correlations)
	}
}

func TestSigningServiceDeclineFlow(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-decline"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store, store)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}
	if _, err := signingSvc.Decline(ctx, scope, token, SignerDeclineInput{}); err == nil {
		t.Fatal("expected decline reason validation error")
	} else if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS error code, got %v", err)
	}

	declined, err := signingSvc.Decline(ctx, scope, token, SignerDeclineInput{Reason: "I decline to sign"})
	if err != nil {
		t.Fatalf("Decline: %v", err)
	}
	if declined.Agreement.Status != stores.AgreementStatusDeclined {
		t.Fatalf("expected declined agreement status, got %q", declined.Agreement.Status)
	}
	if declined.Agreement.DeclinedAt == nil {
		t.Fatal("expected agreement declined timestamp")
	}
	if declined.Recipient.DeclinedAt == nil {
		t.Fatal("expected recipient declined timestamp")
	}
	if declined.Recipient.DeclineReason != "I decline to sign" {
		t.Fatalf("expected decline reason to persist, got %q", declined.Recipient.DeclineReason)
	}

	if _, err := signingSvc.Decline(ctx, scope, token, SignerDeclineInput{Reason: "retry"}); err == nil {
		t.Fatal("expected second decline to fail once agreement is terminal")
	}
}

func TestSigningServiceSignerAuditEventsIncludeActorMetadata(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-audit"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store, store)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}
	actorIP := "203.0.113.10"
	actorUA := "esign-tests/1.0"

	if _, err := signingSvc.GetSession(ctx, scope, token); err != nil {
		t.Fatalf("GetSession for view snapshot: %v", err)
	}
	if _, err := signingSvc.CaptureConsent(ctx, scope, token, SignerConsentInput{Accepted: true, IPAddress: actorIP, UserAgent: actorUA}); err != nil {
		t.Fatalf("CaptureConsent: %v", err)
	}
	if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "typed",
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-audit.png",
		SHA256:    strings.Repeat("e", 64),
		ValueText: "Signer Name",
		IPAddress: actorIP,
		UserAgent: actorUA,
	}); err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}
	if _, err := signingSvc.UpsertFieldValue(ctx, scope, token, SignerFieldValueInput{
		FieldID:   textField.ID,
		ValueText: "Signer Name",
		IPAddress: actorIP,
		UserAgent: actorUA,
	}); err != nil {
		t.Fatalf("UpsertFieldValue: %v", err)
	}
	if _, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{
		IdempotencyKey: "submit-audit-key-1",
		IPAddress:      actorIP,
		UserAgent:      actorUA,
	}); err != nil {
		t.Fatalf("Submit: %v", err)
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	required := map[string]bool{
		"signer.consent_captured":     false,
		"signer.signature_attached":   false,
		"signer.field_value_upserted": false,
		"signer.submitted":            false,
	}
	for _, event := range events {
		if _, ok := required[event.EventType]; !ok {
			continue
		}
		required[event.EventType] = true
		if event.ActorType != "signer_token" {
			t.Fatalf("expected signer_token actor type for %s, got %q", event.EventType, event.ActorType)
		}
		if event.ActorID != signer.ID {
			t.Fatalf("expected actor id %q for %s, got %q", signer.ID, event.EventType, event.ActorID)
		}
		if event.IPAddress != actorIP {
			t.Fatalf("expected ip %q for %s, got %q", actorIP, event.EventType, event.IPAddress)
		}
		if event.UserAgent != actorUA {
			t.Fatalf("expected user agent %q for %s, got %q", actorUA, event.EventType, event.UserAgent)
		}
		if event.EventType == "signer.submitted" {
			var metadata map[string]any
			if err := json.Unmarshal([]byte(event.MetadataJSON), &metadata); err != nil {
				t.Fatalf("unmarshal submitted metadata: %v", err)
			}
			rawSnapshot, ok := metadata["signer_identity_snapshot"]
			if !ok {
				t.Fatalf("expected signer_identity_snapshot metadata, got %+v", metadata)
			}
			snapshot, ok := rawSnapshot.(map[string]any)
			if !ok {
				t.Fatalf("expected snapshot object, got %#v", rawSnapshot)
			}
			if snapshot["recipient_id"] != signer.ID {
				t.Fatalf("expected snapshot recipient_id %q, got %#v", signer.ID, snapshot["recipient_id"])
			}
			if snapshot["email"] != signer.Email {
				t.Fatalf("expected snapshot email %q, got %#v", signer.Email, snapshot["email"])
			}
			if strings.TrimSpace(anyToString(snapshot["first_view_at"])) == "" {
				t.Fatalf("expected first_view_at in snapshot, got %#v", snapshot["first_view_at"])
			}
			if strings.TrimSpace(anyToString(snapshot["last_view_at"])) == "" {
				t.Fatalf("expected last_view_at in snapshot, got %#v", snapshot["last_view_at"])
			}
		}
	}
	for eventType, seen := range required {
		if !seen {
			t.Fatalf("expected audit event %q, got events %+v", eventType, events)
		}
	}
}
