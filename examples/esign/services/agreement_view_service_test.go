package services

import (
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestAgreementViewServiceGetSenderSessionDraftReviewMode(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("sender-view.signer@example.com"),
		Name:         new("Sender View Signer"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	_, openErr := agreementSvc.OpenReview(ctx, scope, agreement.ID, ReviewOpenInput{
		Gate:              stores.AgreementReviewGateApproveBeforeSend,
		CommentsEnabled:   true,
		ReviewerIDs:       []string{signer.ID},
		RequestedByUserID: "ops-user",
		ActorType:         "user",
		ActorID:           "ops-user",
	})
	if openErr != nil {
		t.Fatalf("OpenReview: %v", openErr)
	}

	viewer := NewAgreementViewService(NewSigningService(store), store)
	session, err := viewer.GetSenderSession(ctx, scope, agreement.ID, AgreementViewActor{
		ActorID:    "ops-user",
		CanComment: true,
	})
	if err != nil {
		t.Fatalf("GetSenderSession: %v", err)
	}
	if session.SessionKind != "sender" {
		t.Fatalf("expected sender session kind, got %+v", session)
	}
	if session.UIMode != SignerSessionUIModeReview {
		t.Fatalf("expected ui mode %q, got %+v", SignerSessionUIModeReview, session)
	}
	if session.DefaultTab != SignerSessionDefaultTabReview {
		t.Fatalf("expected default tab %q, got %+v", SignerSessionDefaultTabReview, session)
	}
	if session.CanSign {
		t.Fatalf("expected sender session to stay read-only for signing, got %+v", session)
	}
	if session.Review == nil {
		t.Fatal("expected aggregate review context in sender session")
	}
	if !session.Review.CanComment {
		t.Fatalf("expected sender comments to be enabled, got %+v", session.Review)
	}
	if session.Review.CanApprove || session.Review.CanRequestChanges || session.Review.CanSign {
		t.Fatalf("expected sender review decisions/signing to stay disabled, got %+v", session.Review)
	}
}

func TestAgreementViewServiceGetSenderSessionSentModeWithoutCommentPermission(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("sender-view.sent@example.com"),
		Name:         new("Sender View Sent"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	_, upsertErr := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	})
	if upsertErr != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", upsertErr)
	}
	_, openErr := agreementSvc.OpenReview(ctx, scope, agreement.ID, ReviewOpenInput{
		Gate:              stores.AgreementReviewGateApproveBeforeSend,
		CommentsEnabled:   true,
		ReviewerIDs:       []string{signer.ID},
		RequestedByUserID: "ops-user",
		ActorType:         "user",
		ActorID:           "ops-user",
	})
	if openErr != nil {
		t.Fatalf("OpenReview: %v", openErr)
	}
	_, approveErr := agreementSvc.ApproveReview(ctx, scope, agreement.ID, ReviewDecisionInput{
		RecipientID: signer.ID,
		ActorType:   "recipient",
		ActorID:     signer.ID,
	})
	if approveErr != nil {
		t.Fatalf("ApproveReview: %v", approveErr)
	}
	_, sendErr := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "sender-view-sent"})
	if sendErr != nil {
		t.Fatalf("Send: %v", sendErr)
	}

	viewer := NewAgreementViewService(NewSigningService(store), store)
	session, err := viewer.GetSenderSession(ctx, scope, agreement.ID, AgreementViewActor{
		ActorID:    "viewer-user",
		CanComment: false,
	})
	if err != nil {
		t.Fatalf("GetSenderSession: %v", err)
	}
	if session.AgreementStatus != stores.AgreementStatusSent {
		t.Fatalf("expected sent agreement status, got %+v", session)
	}
	if session.UIMode != SignerSessionUIModeSignAndReview {
		t.Fatalf("expected sign-and-review ui mode for sent agreement with review, got %+v", session)
	}
	if session.DefaultTab != SignerSessionDefaultTabSign {
		t.Fatalf("expected default sign tab, got %+v", session)
	}
	if session.Review == nil {
		t.Fatal("expected review context in sent sender session")
	}
	if session.Review.CanComment {
		t.Fatalf("expected sender comments to stay disabled without capability, got %+v", session.Review)
	}
}

func TestAgreementViewServiceGetSenderSessionHidesInProgressFieldValuesByDefault(t *testing.T) {
	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("sender-view.values@example.com"),
		Name:         new("Sender View Values"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	field, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeText),
		PageNumber:  new(1),
		Required:    new(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	_, upsertErr := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	})
	if upsertErr != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", upsertErr)
	}
	_, sendErr := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "sender-view-hide-values"})
	if sendErr != nil {
		t.Fatalf("Send: %v", sendErr)
	}
	_, upsertValueErr := store.UpsertFieldValue(ctx, scope, stores.FieldValueRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
		FieldID:     field.ID,
		ValueText:   "In Progress Value",
	}, 0)
	if upsertValueErr != nil {
		t.Fatalf("UpsertFieldValue: %v", upsertValueErr)
	}

	viewer := NewAgreementViewService(NewSigningService(store), store)
	session, err := viewer.GetSenderSession(ctx, scope, agreement.ID, AgreementViewActor{ActorID: "ops-user"})
	if err != nil {
		t.Fatalf("GetSenderSession: %v", err)
	}
	if session.ViewerMode != "sign" {
		t.Fatalf("expected sender view mode sign, got %+v", session)
	}
	if session.ViewerBanner != "sender_progress" {
		t.Fatalf("expected sender progress banner, got %+v", session)
	}
	if len(session.Fields) == 0 {
		t.Fatalf("expected sender session fields")
	}
	var gotValue string
	for _, sessionField := range session.Fields {
		if sessionField.ID == field.ID {
			gotValue = sessionField.ValueText
			break
		}
	}
	if gotValue != "" {
		t.Fatalf("expected in-progress field values hidden by default, got %q", gotValue)
	}
}

func TestAgreementViewServiceGetSenderSessionCanExposeInProgressFieldValuesWhenEnabled(t *testing.T) {
	t.Cleanup(appcfg.ResetActive)
	cfg := appcfg.Defaults()
	cfg.Signer.SenderViewer.ShowInProgressFieldValues = true
	appcfg.SetActive(cfg)

	ctx, scope, store, agreementSvc, agreement := setupDraftAgreement(t)

	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("sender-view.visible@example.com"),
		Name:         new("Sender View Visible"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	field, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeText),
		PageNumber:  new(1),
		Required:    new(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	_, upsertErr := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	})
	if upsertErr != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", upsertErr)
	}
	_, sendErr := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "sender-view-show-values"})
	if sendErr != nil {
		t.Fatalf("Send: %v", sendErr)
	}
	_, upsertValueErr := store.UpsertFieldValue(ctx, scope, stores.FieldValueRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
		FieldID:     field.ID,
		ValueText:   "Visible Value",
	}, 0)
	if upsertValueErr != nil {
		t.Fatalf("UpsertFieldValue: %v", upsertValueErr)
	}

	viewer := NewAgreementViewService(NewSigningService(store), store)
	session, err := viewer.GetSenderSession(ctx, scope, agreement.ID, AgreementViewActor{ActorID: "ops-user"})
	if err != nil {
		t.Fatalf("GetSenderSession: %v", err)
	}
	if len(session.Fields) == 0 {
		t.Fatalf("expected sender session fields")
	}
	var gotValue string
	for _, sessionField := range session.Fields {
		if sessionField.ID == field.ID {
			gotValue = sessionField.ValueText
			break
		}
	}
	if gotValue != "Visible Value" {
		t.Fatalf("expected in-progress field values visible when enabled, got %q", gotValue)
	}
}
