package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
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

type agreementStatusCheckingCompletionWorkflow struct {
	store  stores.AgreementStore
	calls  int
	status string
}

func (c *agreementStatusCheckingCompletionWorkflow) RunCompletionWorkflow(ctx context.Context, scope stores.Scope, agreementID, _ string) error {
	c.calls++
	if c.store == nil {
		return nil
	}
	agreement, err := c.store.GetAgreement(ctx, scope, strings.TrimSpace(agreementID))
	if err != nil {
		return err
	}
	c.status = strings.TrimSpace(agreement.Status)
	if c.status != stores.AgreementStatusCompleted {
		return fmt.Errorf("completion workflow requires completed agreement, got %q", c.status)
	}
	return nil
}

type failingCompletionWorkflow struct {
	calls int
	err   error
}

func (c *failingCompletionWorkflow) RunCompletionWorkflow(_ context.Context, _ stores.Scope, _ string, _ string) error {
	c.calls++
	if c.err != nil {
		return c.err
	}
	return fmt.Errorf("completion workflow unavailable")
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

func hasRecipientID(recipientIDs []string, candidate string) bool {
	candidate = strings.TrimSpace(candidate)
	if candidate == "" {
		return false
	}
	for _, recipientID := range recipientIDs {
		if strings.TrimSpace(recipientID) == candidate {
			return true
		}
	}
	return false
}

func TestSigningServiceGetSessionSequentialState(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signerOne, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-1@example.com"),
		Name:         stringPtr("Signer One"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer one: %v", err)
	}
	signerTwo, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-2@example.com"),
		Name:         stringPtr("Signer Two"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer two: %v", err)
	}

	fieldOne, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerOne.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signer one: %v", err)
	}
	fieldTwo, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(2),
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

	signingSvc := NewSigningService(store)

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

func TestSigningServiceGetSessionStageParallelState(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signerOne, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage1-signer-1@example.com"),
		Name:         stringPtr("Stage One A"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer one: %v", err)
	}
	signerTwo, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage1-signer-2@example.com"),
		Name:         stringPtr("Stage One B"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer two: %v", err)
	}
	signerThree, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage2-signer@example.com"),
		Name:         stringPtr("Stage Two"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer three: %v", err)
	}

	for _, signer := range []stores.RecipientRecord{signerOne, signerTwo, signerThree} {
		if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
			RecipientID: &signer.ID,
			Type:        stringPtr(stores.FieldTypeSignature),
			PageNumber:  primitives.Int(1),
			Required:    boolPtr(true),
		}); err != nil {
			t.Fatalf("UpsertFieldDraft signer %s: %v", signer.ID, err)
		}
	}

	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase24-session-stage-parallel"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)

	firstSession, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signerOne.ID,
	})
	if err != nil {
		t.Fatalf("GetSession signer one: %v", err)
	}
	if firstSession.State != SignerSessionStateActive {
		t.Fatalf("expected signer one active state, got %q", firstSession.State)
	}
	if firstSession.ActiveStage != 1 {
		t.Fatalf("expected active stage 1, got %d", firstSession.ActiveStage)
	}
	if len(firstSession.ActiveRecipientIDs) != 2 {
		t.Fatalf("expected two active signer ids, got %+v", firstSession.ActiveRecipientIDs)
	}
	if !hasRecipientID(firstSession.ActiveRecipientIDs, signerOne.ID) || !hasRecipientID(firstSession.ActiveRecipientIDs, signerTwo.ID) {
		t.Fatalf("expected stage-one signer ids in active set, got %+v", firstSession.ActiveRecipientIDs)
	}

	secondSession, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signerTwo.ID,
	})
	if err != nil {
		t.Fatalf("GetSession signer two: %v", err)
	}
	if secondSession.State != SignerSessionStateActive {
		t.Fatalf("expected signer two active state, got %q", secondSession.State)
	}

	thirdSession, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signerThree.ID,
	})
	if err != nil {
		t.Fatalf("GetSession signer three: %v", err)
	}
	if thirdSession.State != SignerSessionStateWaiting {
		t.Fatalf("expected signer three waiting state, got %q", thirdSession.State)
	}
	if thirdSession.ActiveStage != 1 || thirdSession.RecipientStage != 2 {
		t.Fatalf("expected stage metadata active=1 recipient=2, got active=%d recipient=%d", thirdSession.ActiveStage, thirdSession.RecipientStage)
	}
	if len(thirdSession.WaitingForRecipientIDs) != 2 {
		t.Fatalf("expected two waiting-for signer ids, got %+v", thirdSession.WaitingForRecipientIDs)
	}
	if !hasRecipientID(thirdSession.WaitingForRecipientIDs, signerOne.ID) || !hasRecipientID(thirdSession.WaitingForRecipientIDs, signerTwo.ID) {
		t.Fatalf("expected waiting-for ids to include stage-one signers, got %+v", thirdSession.WaitingForRecipientIDs)
	}
}

func TestSigningServiceSubmitProgressesBySigningStage(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signerOne, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage1-signer-1@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer one: %v", err)
	}
	signerTwo, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage1-signer-2@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer two: %v", err)
	}
	signerThree, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage2-signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer three: %v", err)
	}

	signatureFields := map[string]string{}
	for _, signer := range []stores.RecipientRecord{signerOne, signerTwo, signerThree} {
		field, upsertErr := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
			RecipientID: &signer.ID,
			Type:        stringPtr(stores.FieldTypeSignature),
			PageNumber:  primitives.Int(1),
			Required:    boolPtr(true),
		})
		if upsertErr != nil {
			t.Fatalf("UpsertFieldDraft signer %s: %v", signer.ID, upsertErr)
		}
		signatureFields[signer.ID] = field.ID
	}

	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase24-submit-stage-progression"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
	signStage := func(recipient stores.RecipientRecord, objectKeySuffix, digest, submitKey string) SignerSubmitResult {
		t.Helper()
		token := stores.SigningTokenRecord{
			AgreementID: agreement.ID,
			RecipientID: recipient.ID,
		}
		if _, err := signingSvc.CaptureConsent(ctx, scope, token, SignerConsentInput{Accepted: true}); err != nil {
			t.Fatalf("CaptureConsent %s: %v", recipient.ID, err)
		}
		if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
			FieldID:   signatureFields[recipient.ID],
			Type:      "typed",
			ObjectKey: "tenant/tenant-1/org/org-1/agreements/" + agreement.ID + "/sig/" + objectKeySuffix + ".png",
			SHA256:    digest,
			ValueText: "Signed",
		}); err != nil {
			t.Fatalf("AttachSignatureArtifact %s: %v", recipient.ID, err)
		}
		submit, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: submitKey})
		if err != nil {
			t.Fatalf("Submit %s: %v", recipient.ID, err)
		}
		return submit
	}

	firstSubmit := signStage(signerOne, "stage1-a", strings.Repeat("1", 64), "submit-stage1-a")
	if firstSubmit.Completed {
		t.Fatal("expected stage one first signer submit to keep agreement open")
	}
	if firstSubmit.NextStage != 1 {
		t.Fatalf("expected next stage 1 after first stage-one submit, got %d", firstSubmit.NextStage)
	}
	if !hasRecipientID(firstSubmit.NextRecipientIDs, signerTwo.ID) {
		t.Fatalf("expected remaining active signer in stage one, got %+v", firstSubmit.NextRecipientIDs)
	}

	stageTwoWaiting, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signerThree.ID,
	})
	if err != nil {
		t.Fatalf("GetSession stage-two waiting: %v", err)
	}
	if stageTwoWaiting.State != SignerSessionStateWaiting {
		t.Fatalf("expected stage-two signer waiting after first stage submit, got %q", stageTwoWaiting.State)
	}

	secondSubmit := signStage(signerTwo, "stage1-b", strings.Repeat("2", 64), "submit-stage1-b")
	if secondSubmit.Completed {
		t.Fatal("expected stage transition to stage two before completion")
	}
	if secondSubmit.NextStage != 2 {
		t.Fatalf("expected next stage 2, got %d", secondSubmit.NextStage)
	}
	if !hasRecipientID(secondSubmit.NextRecipientIDs, signerThree.ID) {
		t.Fatalf("expected stage-two signer activation, got %+v", secondSubmit.NextRecipientIDs)
	}

	stageTwoActive, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signerThree.ID,
	})
	if err != nil {
		t.Fatalf("GetSession stage-two active: %v", err)
	}
	if stageTwoActive.State != SignerSessionStateActive {
		t.Fatalf("expected stage-two signer active after stage-one completion, got %q", stageTwoActive.State)
	}
	if stageTwoActive.ActiveStage != 2 {
		t.Fatalf("expected active stage 2, got %d", stageTwoActive.ActiveStage)
	}

	finalSubmit := signStage(signerThree, "stage2", strings.Repeat("3", 64), "submit-stage2-final")
	if !finalSubmit.Completed {
		t.Fatal("expected final stage submit to complete agreement")
	}
	if finalSubmit.Agreement.Status != stores.AgreementStatusCompleted {
		t.Fatalf("expected completed agreement status, got %q", finalSubmit.Agreement.Status)
	}
}

func TestSigningServiceDeclineMixedStageTerminalBehavior(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signerOne, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage1-signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer one: %v", err)
	}
	signerTwo, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage2-signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer two: %v", err)
	}
	for _, signer := range []stores.RecipientRecord{signerOne, signerTwo} {
		if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
			RecipientID: &signer.ID,
			Type:        stringPtr(stores.FieldTypeSignature),
			PageNumber:  primitives.Int(1),
			Required:    boolPtr(true),
		}); err != nil {
			t.Fatalf("UpsertFieldDraft signer %s: %v", signer.ID, err)
		}
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase24-decline-mixed-stage"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
	waitingToken := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signerTwo.ID,
	}
	if _, err := signingSvc.Decline(ctx, scope, waitingToken, SignerDeclineInput{Reason: "too early"}); err == nil {
		t.Fatal("expected stage-two signer decline to be blocked while waiting")
	} else if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected typed waiting error, got %v", err)
	}

	activeToken := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signerOne.ID,
	}
	declined, err := signingSvc.Decline(ctx, scope, activeToken, SignerDeclineInput{Reason: "decline at stage one"})
	if err != nil {
		t.Fatalf("Decline active stage signer: %v", err)
	}
	if declined.Agreement.Status != stores.AgreementStatusDeclined {
		t.Fatalf("expected declined agreement status, got %q", declined.Agreement.Status)
	}

	if _, err := signingSvc.GetSession(ctx, scope, waitingToken); err == nil {
		t.Fatal("expected signer token access to be rejected after agreement decline")
	} else if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected invalid agreement status token error, got %v", err)
	}
}

func TestSigningServiceGetSessionIncludesUnifiedGeometryAndBootstrapMetadata(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Name:         stringPtr("Signer One"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}

	posX := 72.5
	posY := 180.25
	width := 220.0
	height := 42.0
	field, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(2),
		PosX:        &posX,
		PosY:        &posY,
		Width:       &width,
		Height:      &height,
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase18-session-bootstrap"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
	session, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	})
	if err != nil {
		t.Fatalf("GetSession: %v", err)
	}

	if session.DocumentName != "Master Services Agreement" {
		t.Fatalf("expected document name Master Services Agreement, got %q", session.DocumentName)
	}
	if session.PageCount != 2 {
		t.Fatalf("expected page count 2, got %d", session.PageCount)
	}
	if session.Viewer.CoordinateSpace != "pdf_points" {
		t.Fatalf("expected coordinate space pdf_points, got %q", session.Viewer.CoordinateSpace)
	}
	if session.Viewer.ContractVersion != "pdf_page_space_v1" {
		t.Fatalf("expected contract version pdf_page_space_v1, got %q", session.Viewer.ContractVersion)
	}
	if session.Viewer.Unit != "pt" || session.Viewer.Origin != "top_left" || session.Viewer.YAxisDirection != "down" {
		t.Fatalf("expected canonical viewer metadata, got %+v", session.Viewer)
	}
	if len(session.Viewer.Pages) != 2 {
		t.Fatalf("expected 2 viewer pages, got %+v", session.Viewer.Pages)
	}
	if session.Viewer.Pages[1].Page != 2 {
		t.Fatalf("expected viewer page index 2 at position 2, got %+v", session.Viewer.Pages)
	}

	if len(session.Fields) != 1 {
		t.Fatalf("expected one signer field, got %+v", session.Fields)
	}
	got := session.Fields[0]
	if got.ID != field.ID {
		t.Fatalf("expected field id %q, got %q", field.ID, got.ID)
	}
	if got.RecipientID != signer.ID {
		t.Fatalf("expected recipient binding %q, got %q", signer.ID, got.RecipientID)
	}
	if got.Page != 2 || got.PosX != posX || got.PosY != posY || got.Width != width || got.Height != height {
		t.Fatalf("expected geometry page=2 pos=(%v,%v) size=(%v,%v), got %+v", posX, posY, width, height, got)
	}
	if got.PageWidth != 612 || got.PageHeight != 792 || got.PageRotation != 0 {
		t.Fatalf("expected page metadata width=612 height=792 rotation=0, got %+v", got)
	}
	if got.TabIndex != 1 {
		t.Fatalf("expected first field tab index 1, got %d", got.TabIndex)
	}
}

func TestSigningServiceGetSessionNormalizesFieldGeometryToCanonicalPageSpace(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	negativePosX := -20.0
	negativePosY := -12.0
	oversizeWidth := 2000.0
	oversizeHeight := 1600.0
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(2),
		PosX:        &negativePosX,
		PosY:        &negativePosY,
		Width:       &oversizeWidth,
		Height:      &oversizeHeight,
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase19-coordinate-normalization"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
	session, err := signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	})
	if err != nil {
		t.Fatalf("GetSession: %v", err)
	}
	if len(session.Fields) != 1 {
		t.Fatalf("expected one field, got %+v", session.Fields)
	}
	field := session.Fields[0]
	if field.Page <= 0 {
		t.Fatalf("expected positive page index, got %+v", field)
	}
	if field.PosX < 0 || field.PosY < 0 {
		t.Fatalf("expected non-negative normalized position, got %+v", field)
	}
	if field.Width > field.PageWidth || field.Height > field.PageHeight {
		t.Fatalf("expected size within page bounds, got %+v", field)
	}
}

func TestSigningServiceTracksRecipientViewLifecycle(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-view"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	viewTime := time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)
	signingSvc := NewSigningService(store, WithSigningClock(func() time.Time {
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
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	requiredTextField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-consent-upsert"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
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
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer one: %v", err)
	}
	signerTwo, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-2@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer two: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerOne.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer one signature: %v", err)
	}
	waitingField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signer two text: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer two signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-waiting"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
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
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-signature-attach"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
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

func TestSigningServiceIssueSignatureUploadBootstrap(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase19-signature-upload-bootstrap"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	now := time.Date(2026, 2, 12, 9, 0, 0, 0, time.UTC)
	signingSvc := NewSigningService(store, WithSigningClock(func() time.Time {
		return now
	}))
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}

	contract, err := signingSvc.IssueSignatureUpload(ctx, scope, token, SignerSignatureUploadInput{
		FieldID:     signatureField.ID,
		SHA256:      strings.Repeat("a", 64),
		ContentType: "image/png",
		SizeBytes:   1024,
	})
	if err != nil {
		t.Fatalf("IssueSignatureUpload: %v", err)
	}
	if strings.TrimSpace(contract.UploadToken) == "" {
		t.Fatalf("expected upload token in contract, got %+v", contract)
	}
	if strings.TrimSpace(contract.ObjectKey) == "" {
		t.Fatalf("expected object key in contract, got %+v", contract)
	}
	if contract.Method != "PUT" {
		t.Fatalf("expected upload method PUT, got %q", contract.Method)
	}
	if contract.UploadURL != "/api/v1/esign/signing/signature-upload/object" {
		t.Fatalf("expected upload url /api/v1/esign/signing/signature-upload/object, got %q", contract.UploadURL)
	}
	if strings.TrimSpace(anyToString(contract.Headers["X-ESign-Upload-Token"])) == "" {
		t.Fatalf("expected upload token header in contract, got %+v", contract.Headers)
	}
	if contract.ContentType != "image/png" {
		t.Fatalf("expected content type image/png, got %q", contract.ContentType)
	}
	if !contract.ExpiresAt.After(now) {
		t.Fatalf("expected expiry after issue time, got %s", contract.ExpiresAt)
	}
}

func TestSigningServiceIssueSignatureUploadRespectsConfiguredTTLPolicy(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase19-signature-upload-ttl-policy"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	now := time.Date(2026, 2, 12, 11, 0, 0, 0, time.UTC)
	ttl := 2 * time.Minute
	signingSvc := NewSigningService(store,
		WithSigningClock(func() time.Time { return now }),
		WithSignatureUploadConfig(ttl, "phase19-upload-secret"),
	)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}

	contract, err := signingSvc.IssueSignatureUpload(ctx, scope, token, SignerSignatureUploadInput{
		FieldID:     signatureField.ID,
		SHA256:      strings.Repeat("a", 64),
		ContentType: "image/png",
		SizeBytes:   512,
	})
	if err != nil {
		t.Fatalf("IssueSignatureUpload: %v", err)
	}
	expectedExpiry := now.Add(ttl)
	if !contract.ExpiresAt.Equal(expectedExpiry) {
		t.Fatalf("expected ttl policy expiry %s, got %s", expectedExpiry, contract.ExpiresAt)
	}
}

func TestSigningServiceIssueAndAttachDrawnInitials(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	initialsField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeInitials),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft initials: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase19-initials-drawn"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}
	uploadPayload := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x09, 0x08, 0x07, 0x06}
	digest := sha256.Sum256(uploadPayload)
	uploadSHA := hex.EncodeToString(digest[:])

	contract, err := signingSvc.IssueSignatureUpload(ctx, scope, token, SignerSignatureUploadInput{
		FieldID:     initialsField.ID,
		SHA256:      uploadSHA,
		ContentType: "image/png",
		SizeBytes:   int64(len(uploadPayload)),
	})
	if err != nil {
		t.Fatalf("IssueSignatureUpload initials: %v", err)
	}
	if _, err := signingSvc.ConfirmSignatureUpload(ctx, scope, SignerSignatureUploadCommitInput{
		UploadToken: contract.UploadToken,
		ObjectKey:   contract.ObjectKey,
		SHA256:      uploadSHA,
		ContentType: "image/png",
		SizeBytes:   int64(len(uploadPayload)),
		Payload:     uploadPayload,
	}); err != nil {
		t.Fatalf("ConfirmSignatureUpload initials: %v", err)
	}
	result, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:     initialsField.ID,
		Type:        "drawn",
		ObjectKey:   contract.ObjectKey,
		SHA256:      uploadSHA,
		UploadToken: contract.UploadToken,
		ValueText:   "[Drawn Initials]",
	})
	if err != nil {
		t.Fatalf("AttachSignatureArtifact initials: %v", err)
	}
	if result.Artifact.Type != "drawn" {
		t.Fatalf("expected drawn artifact, got %q", result.Artifact.Type)
	}
	if result.FieldValue.FieldID != initialsField.ID {
		t.Fatalf("expected field value bound to initials field %q, got %q", initialsField.ID, result.FieldValue.FieldID)
	}
}

func TestSigningServiceAttachSignatureArtifactDrawnRequiresUploadBootstrap(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase19-signature-upload-required"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}

	if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "drawn",
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/signer-1/drawn.png",
		SHA256:    strings.Repeat("d", 64),
	}); err == nil {
		t.Fatal("expected drawn signature attach to require upload bootstrap token")
	}
}

func TestSigningServiceAttachSignatureArtifactDrawnVerifiesBootstrapAndRetries(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase19-signature-upload-verify"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}
	contract, err := signingSvc.IssueSignatureUpload(ctx, scope, token, SignerSignatureUploadInput{
		FieldID:     signatureField.ID,
		SHA256:      strings.Repeat("a", 64),
		ContentType: "image/png",
		SizeBytes:   512,
	})
	if err != nil {
		t.Fatalf("IssueSignatureUpload: %v", err)
	}
	if _, err := signingSvc.ConfirmSignatureUpload(ctx, scope, SignerSignatureUploadCommitInput{
		UploadToken: contract.UploadToken,
		ObjectKey:   contract.ObjectKey,
		SHA256:      contract.SHA256,
		ContentType: contract.ContentType,
		SizeBytes:   contract.SizeBytes,
	}); err != nil {
		t.Fatalf("ConfirmSignatureUpload: %v", err)
	}

	first, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:     signatureField.ID,
		Type:        "drawn",
		ObjectKey:   contract.ObjectKey,
		SHA256:      contract.SHA256,
		UploadToken: contract.UploadToken,
	})
	if err != nil {
		t.Fatalf("AttachSignatureArtifact first: %v", err)
	}

	replay, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:     signatureField.ID,
		Type:        "drawn",
		ObjectKey:   contract.ObjectKey,
		SHA256:      contract.SHA256,
		UploadToken: contract.UploadToken,
	})
	if err != nil {
		t.Fatalf("AttachSignatureArtifact replay: %v", err)
	}
	if replay.Artifact.ID != first.Artifact.ID {
		t.Fatalf("expected replay artifact id %q, got %q", first.Artifact.ID, replay.Artifact.ID)
	}
	if replay.FieldValue.ID != first.FieldValue.ID {
		t.Fatalf("expected replay field value id %q, got %q", first.FieldValue.ID, replay.FieldValue.ID)
	}

	if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:     signatureField.ID,
		Type:        "drawn",
		ObjectKey:   contract.ObjectKey,
		SHA256:      strings.Repeat("b", 64),
		UploadToken: contract.UploadToken,
	}); err == nil {
		t.Fatal("expected digest mismatch validation error")
	}
}

func TestSigningServiceConfirmSignatureUploadPersistsPayloadToObjectStore(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase19-signature-upload-persist"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	manager := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	signingSvc := NewSigningService(store, WithSigningObjectStore(manager))
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}
	uploadPayload := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x01, 0x02, 0x03}
	digest := sha256.Sum256(uploadPayload)
	uploadSHA := hex.EncodeToString(digest[:])
	contract, err := signingSvc.IssueSignatureUpload(ctx, scope, token, SignerSignatureUploadInput{
		FieldID:     signatureField.ID,
		SHA256:      uploadSHA,
		ContentType: "image/png",
		SizeBytes:   int64(len(uploadPayload)),
	})
	if err != nil {
		t.Fatalf("IssueSignatureUpload: %v", err)
	}
	receipt, err := signingSvc.ConfirmSignatureUpload(ctx, scope, SignerSignatureUploadCommitInput{
		UploadToken: contract.UploadToken,
		ObjectKey:   contract.ObjectKey,
		SHA256:      uploadSHA,
		ContentType: "image/png",
		SizeBytes:   int64(len(uploadPayload)),
		Payload:     uploadPayload,
	})
	if err != nil {
		t.Fatalf("ConfirmSignatureUpload: %v", err)
	}
	if receipt.ObjectKey != contract.ObjectKey {
		t.Fatalf("expected receipt object key %q, got %q", contract.ObjectKey, receipt.ObjectKey)
	}
	if receipt.SHA256 != uploadSHA {
		t.Fatalf("expected receipt sha256 %q, got %q", uploadSHA, receipt.SHA256)
	}
	persisted, err := manager.GetFile(ctx, contract.ObjectKey)
	if err != nil {
		t.Fatalf("GetFile: %v", err)
	}
	if !bytes.Equal(persisted, uploadPayload) {
		t.Fatalf("expected persisted signature upload payload to match source bytes")
	}
}

func TestSigningServiceAttachSignatureArtifactDrawnRecoversReceiptFromAudit(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase19-signature-upload-audit-recovery"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvcA := NewSigningService(store)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}
	contract, err := signingSvcA.IssueSignatureUpload(ctx, scope, token, SignerSignatureUploadInput{
		FieldID:     signatureField.ID,
		SHA256:      strings.Repeat("a", 64),
		ContentType: "image/png",
		SizeBytes:   512,
	})
	if err != nil {
		t.Fatalf("IssueSignatureUpload: %v", err)
	}
	if _, err := signingSvcA.ConfirmSignatureUpload(ctx, scope, SignerSignatureUploadCommitInput{
		UploadToken: contract.UploadToken,
		ObjectKey:   contract.ObjectKey,
		SHA256:      contract.SHA256,
		ContentType: contract.ContentType,
		SizeBytes:   contract.SizeBytes,
	}); err != nil {
		t.Fatalf("ConfirmSignatureUpload: %v", err)
	}

	// Simulate service state loss between upload confirm and attach.
	signingSvcB := NewSigningService(store)
	result, err := signingSvcB.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:     signatureField.ID,
		Type:        "drawn",
		ObjectKey:   contract.ObjectKey,
		SHA256:      contract.SHA256,
		UploadToken: contract.UploadToken,
	})
	if err != nil {
		t.Fatalf("AttachSignatureArtifact after restart: %v", err)
	}
	if result.Artifact.ID == "" {
		t.Fatal("expected recovered attach to persist signature artifact")
	}
}

func TestSigningServiceAttachSignatureArtifactDrawnRecoversReceiptFromObjectStore(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase19-signature-upload-object-recovery"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	manager := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	signingSvcA := NewSigningService(store, WithSigningObjectStore(manager))
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}
	uploadPayload := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0xAA, 0xBB, 0xCC, 0xDD}
	digest := sha256.Sum256(uploadPayload)
	uploadSHA := hex.EncodeToString(digest[:])

	contract, err := signingSvcA.IssueSignatureUpload(ctx, scope, token, SignerSignatureUploadInput{
		FieldID:     signatureField.ID,
		SHA256:      uploadSHA,
		ContentType: "image/png",
		SizeBytes:   int64(len(uploadPayload)),
	})
	if err != nil {
		t.Fatalf("IssueSignatureUpload: %v", err)
	}
	if _, err := signingSvcA.ConfirmSignatureUpload(ctx, scope, SignerSignatureUploadCommitInput{
		UploadToken: contract.UploadToken,
		ObjectKey:   contract.ObjectKey,
		SHA256:      uploadSHA,
		ContentType: "image/png",
		SizeBytes:   int64(len(uploadPayload)),
		Payload:     uploadPayload,
	}); err != nil {
		t.Fatalf("ConfirmSignatureUpload: %v", err)
	}

	// Simulate service restart where in-memory receipt cache is empty.
	signingSvcB := NewSigningService(store, WithSigningObjectStore(manager))
	result, err := signingSvcB.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:     signatureField.ID,
		Type:        "drawn",
		ObjectKey:   contract.ObjectKey,
		SHA256:      uploadSHA,
		UploadToken: contract.UploadToken,
	})
	if err != nil {
		t.Fatalf("AttachSignatureArtifact after restart: %v", err)
	}
	if result.Artifact.ID == "" {
		t.Fatal("expected recovered attach to persist signature artifact")
	}
}

func TestSigningServiceSubmitWithIdempotencyAndCAS(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-submit"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
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
	if second.Replay != true {
		t.Fatalf("expected idempotent replay result, got replay=%v", second.Replay)
	}

	if _, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{}); err == nil {
		t.Fatal("expected submit idempotency key requirement error")
	} else if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS error code, got %v", err)
	}
}

func TestSigningServiceSubmitAllowsConsentCapturedBeforeServiceRestart(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase-v2-consent-restart"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	token := stores.SigningTokenRecord{AgreementID: agreement.ID, RecipientID: signer.ID}
	firstService := NewSigningService(store)
	if _, err := firstService.CaptureConsent(ctx, scope, token, SignerConsentInput{Accepted: true}); err != nil {
		t.Fatalf("CaptureConsent: %v", err)
	}
	if _, err := firstService.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "typed",
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-consent-restart.png",
		SHA256:    strings.Repeat("a", 64),
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}
	if _, err := firstService.UpsertFieldValue(ctx, scope, token, SignerFieldValueInput{
		FieldID:   textField.ID,
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("UpsertFieldValue: %v", err)
	}

	// Simulate a restart/new instance: consent replay must be discovered from audit, not in-memory state.
	secondService := NewSigningService(store)
	result, err := secondService.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: "submit-after-restart"})
	if err != nil {
		t.Fatalf("Submit after restart: %v", err)
	}
	if !result.Completed {
		t.Fatal("expected submit after restart to complete")
	}
}

func TestSigningServiceSubmitReplayPersistsAcrossServiceRestart(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase-v2-submit-replay"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	token := stores.SigningTokenRecord{AgreementID: agreement.ID, RecipientID: signer.ID}
	firstService := NewSigningService(store)
	if _, err := firstService.CaptureConsent(ctx, scope, token, SignerConsentInput{Accepted: true}); err != nil {
		t.Fatalf("CaptureConsent: %v", err)
	}
	if _, err := firstService.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "typed",
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-submit-replay.png",
		SHA256:    strings.Repeat("b", 64),
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}
	if _, err := firstService.UpsertFieldValue(ctx, scope, token, SignerFieldValueInput{
		FieldID:   textField.ID,
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("UpsertFieldValue: %v", err)
	}
	first, err := firstService.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: "submit-replay-key"})
	if err != nil {
		t.Fatalf("Submit first: %v", err)
	}
	if !first.Completed {
		t.Fatal("expected first submit to complete agreement")
	}

	// Simulate restart/new node and replay with same idempotency key.
	secondService := NewSigningService(store)
	replay, err := secondService.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: "submit-replay-key"})
	if err != nil {
		t.Fatalf("Submit replay after restart: %v", err)
	}
	if !replay.Replay {
		t.Fatalf("expected replay=true after restart replay, got %v", replay.Replay)
	}
	if replay.Agreement.Status != stores.AgreementStatusCompleted {
		t.Fatalf("expected completed agreement on replay, got %q", replay.Agreement.Status)
	}
}

func TestSigningServiceSignerTokenRejectedForDraftAgreement(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}

	signingSvc := NewSigningService(store)
	_, err = signingSvc.GetSession(ctx, scope, stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	})
	if err == nil {
		t.Fatal("expected signer session to reject draft agreement token")
	}
	if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected validation error code for invalid agreement status, got %v", err)
	}
}

func TestSigningServiceSubmitTriggersCompletionWorkflowOnFinalSigner(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase5-submit-trigger"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	completionFlow := &capturingCompletionWorkflow{}
	signingSvc := NewSigningService(store, WithSigningCompletionWorkflow(completionFlow))
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

func TestSigningServiceSubmitCompletionWorkflowSeesCommittedAgreementStatus(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase5-submit-commit-order"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	completionFlow := &agreementStatusCheckingCompletionWorkflow{store: store}
	signingSvc := NewSigningService(store, WithSigningCompletionWorkflow(completionFlow))
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
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-submit-commit-order.png",
		SHA256:    strings.Repeat("a", 64),
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}
	if _, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: "submit-commit-order-key-1"}); err != nil {
		t.Fatalf("Submit: %v", err)
	}

	if completionFlow.calls != 1 {
		t.Fatalf("expected completion workflow once, got %d", completionFlow.calls)
	}
	if completionFlow.status != stores.AgreementStatusCompleted {
		t.Fatalf("expected completion workflow to observe completed agreement, got %q", completionFlow.status)
	}
}

func TestSigningServiceSubmitPersistsWhenCompletionWorkflowFails(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase5-submit-failing-workflow"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	completionFlow := &failingCompletionWorkflow{err: fmt.Errorf("job bus unavailable")}
	signingSvc := NewSigningService(store, WithSigningCompletionWorkflow(completionFlow))
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
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-submit-workflow-fail.png",
		SHA256:    strings.Repeat("b", 64),
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}

	submit, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: "submit-workflow-fail-key-1"})
	if err != nil {
		t.Fatalf("Submit should succeed despite completion workflow failure: %v", err)
	}
	if !submit.Completed {
		t.Fatal("expected final signer submit to complete agreement")
	}
	if completionFlow.calls != 1 {
		t.Fatalf("expected completion workflow once, got %d", completionFlow.calls)
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	found := false
	for _, event := range events {
		if event.EventType == "signer.completion_workflow_failed" {
			found = true
			if !strings.Contains(event.MetadataJSON, "job bus unavailable") {
				t.Fatalf("expected workflow failure metadata to include cause, got %s", event.MetadataJSON)
			}
			break
		}
	}
	if !found {
		t.Fatalf("expected signer.completion_workflow_failed audit event in %+v", events)
	}
}

func TestSigningServiceDeclineFlow(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-decline"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
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
		SigningOrder: primitives.Int(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  primitives.Int(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "phase4-audit"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := NewSigningService(store)
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
