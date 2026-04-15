package jobs

import (
	"context"
	"slices"
	"sync"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

type captureEmailProvider struct {
	mu     sync.Mutex
	inputs []EmailSendInput
}

func (p *captureEmailProvider) Send(_ context.Context, input EmailSendInput) (string, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.inputs = append(p.inputs, input)
	return "provider-" + input.Recipient.ID, nil
}

func (p *captureEmailProvider) Snapshot() []EmailSendInput {
	if p == nil {
		return nil
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	return slices.Clone(p.inputs)
}

func setupSentAgreementForWorkflow(t *testing.T) (context.Context, stores.Scope, *stores.InMemoryStore, stores.AgreementRecord, stores.RecipientRecord, stores.RecipientRecord) {
	t.Helper()
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	docSvc := services.NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Agreement Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                samplePDF(),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Workflow Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	signerOne, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer-one@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer one: %v", err)
	}
	signerTwo, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer-two@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: intPtr(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer two: %v", err)
	}
	_, upsertErr := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerOne.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    new(true),
	})
	if upsertErr != nil {
		t.Fatalf("UpsertFieldDraft signer one: %v", upsertErr)
	}
	_, upsertErr = agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    new(true),
	})
	if upsertErr != nil {
		t.Fatalf("UpsertFieldDraft signer two: %v", upsertErr)
	}

	sent, err := agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "workflow-send"})
	if err != nil {
		t.Fatalf("Send: %v", err)
	}
	return ctx, scope, store, sent, signerOne, signerTwo
}

func TestAgreementWorkflowOnAgreementSentDispatchesActiveSigner(t *testing.T) {
	ctx, scope, store, agreement, signerOne, _ := setupSentAgreementForWorkflow(t)
	provider := &captureEmailProvider{}
	workflow := NewAgreementWorkflow(NewHandlers(HandlerDependencies{
		Agreements:    store,
		JobRuns:       store,
		EmailLogs:     store,
		EmailProvider: provider,
	}))

	if err := workflow.OnAgreementSent(ctx, scope, services.AgreementNotification{
		AgreementID:   agreement.ID,
		RecipientID:   signerOne.ID,
		CorrelationID: "corr-send",
		Type:          services.NotificationSigningInvitation,
		Token:         stores.IssuedSigningToken{Token: "token-invite-1"},
	}); err != nil {
		t.Fatalf("OnAgreementSent: %v", err)
	}
	inputs := provider.Snapshot()
	if len(inputs) != 1 {
		t.Fatalf("expected 1 outbound email, got %d", len(inputs))
	}
	if inputs[0].Recipient.ID != signerOne.ID {
		t.Fatalf("expected active signer %q, got %q", signerOne.ID, inputs[0].Recipient.ID)
	}
	if inputs[0].SignURL == "" {
		t.Fatal("expected sign URL in invitation payload")
	}
	if inputs[0].Notification != string(services.NotificationSigningInvitation) {
		t.Fatalf("expected invitation notification type, got %q", inputs[0].Notification)
	}
}

func TestAgreementWorkflowOnAgreementResentDispatchesTargetRecipient(t *testing.T) {
	ctx, scope, store, agreement, _, signerTwo := setupSentAgreementForWorkflow(t)
	provider := &captureEmailProvider{}
	workflow := NewAgreementWorkflow(NewHandlers(HandlerDependencies{
		Agreements:    store,
		JobRuns:       store,
		EmailLogs:     store,
		EmailProvider: provider,
	}))

	if err := workflow.OnAgreementResent(ctx, scope, services.AgreementNotification{
		AgreementID:   agreement.ID,
		RecipientID:   signerTwo.ID,
		CorrelationID: "corr-resend",
		Type:          services.NotificationSigningReminder,
		Token:         stores.IssuedSigningToken{Token: "token-reminder-1"},
	}); err != nil {
		t.Fatalf("OnAgreementResent: %v", err)
	}
	inputs := provider.Snapshot()
	if len(inputs) != 1 {
		t.Fatalf("expected 1 outbound email, got %d", len(inputs))
	}
	if inputs[0].Recipient.ID != signerTwo.ID {
		t.Fatalf("expected recipient %q, got %q", signerTwo.ID, inputs[0].Recipient.ID)
	}
	if inputs[0].SignURL == "" {
		t.Fatal("expected sign URL in resend payload")
	}
	if inputs[0].Notification != string(services.NotificationSigningReminder) {
		t.Fatalf("expected reminder notification type, got %q", inputs[0].Notification)
	}
}

func TestAgreementWorkflowRunStageActivationWorkflowDispatchesNewlyActiveSigners(t *testing.T) {
	ctx, scope, store, agreement, _, signerTwo := setupSentAgreementForWorkflow(t)
	provider := &captureEmailProvider{}
	workflow := NewAgreementWorkflow(NewHandlers(HandlerDependencies{
		Agreements:    store,
		JobRuns:       store,
		EmailLogs:     store,
		EmailProvider: provider,
		Tokens:        stores.NewTokenService(store),
	}))

	if err := workflow.RunStageActivationWorkflow(ctx, scope, agreement.ID, []string{signerTwo.ID}, "corr-stage-activation"); err != nil {
		t.Fatalf("RunStageActivationWorkflow: %v", err)
	}
	inputs := provider.Snapshot()
	if len(inputs) != 1 {
		t.Fatalf("expected 1 outbound stage activation email, got %d", len(inputs))
	}
	if inputs[0].Recipient.ID != signerTwo.ID {
		t.Fatalf("expected stage-two recipient %q, got %q", signerTwo.ID, inputs[0].Recipient.ID)
	}
	if inputs[0].SignURL == "" {
		t.Fatal("expected sign URL in stage activation payload")
	}
	if inputs[0].Notification != string(services.NotificationSigningInvitation) {
		t.Fatalf("expected invitation notification type, got %q", inputs[0].Notification)
	}
}
