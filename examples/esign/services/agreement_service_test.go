package services

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func stringPtr(v string) *string  { return &v }
func intPtr(v int) *int           { return &v }
func boolPtr(v bool) *bool        { return &v }
func floatPtr(v float64) *float64 { return &v }

type stubAgreementEmailWorkflow struct {
	sentCalls       int
	resentCalls     int
	lastScope       stores.Scope
	lastAgreement   string
	lastRecipient   string
	lastCorrelation string
	lastType        AgreementNotificationType
	lastToken       string
	sentErr         error
	resentErr       error
}

type capturingAgreementTokenService struct {
	inner   AgreementTokenService
	issued  []stores.IssuedSigningToken
	rotated []stores.IssuedSigningToken
}

func (c *capturingAgreementTokenService) Issue(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error) {
	issued, err := c.inner.Issue(ctx, scope, agreementID, recipientID)
	if err == nil {
		c.issued = append(c.issued, issued)
	}
	return issued, err
}

func (c *capturingAgreementTokenService) Rotate(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error) {
	issued, err := c.inner.Rotate(ctx, scope, agreementID, recipientID)
	if err == nil {
		c.rotated = append(c.rotated, issued)
	}
	return issued, err
}

func (c *capturingAgreementTokenService) Revoke(ctx context.Context, scope stores.Scope, agreementID, recipientID string) error {
	return c.inner.Revoke(ctx, scope, agreementID, recipientID)
}

func (c *capturingAgreementTokenService) ForTx(tx stores.TxStore) AgreementTokenService {
	if c == nil || tx == nil {
		return c
	}
	switch inner := c.inner.(type) {
	case stores.TokenService:
		c.inner = inner.ForTx(tx)
	case *stores.TokenService:
		c.inner = inner.ForTx(tx)
	case interface {
		ForTx(tx stores.TxStore) AgreementTokenService
	}:
		c.inner = inner.ForTx(tx)
	}
	return c
}

func (s *stubAgreementEmailWorkflow) OnAgreementSent(_ context.Context, scope stores.Scope, notification AgreementNotification) error {
	s.sentCalls++
	s.lastScope = scope
	s.lastAgreement = notification.AgreementID
	s.lastRecipient = notification.RecipientID
	s.lastCorrelation = notification.CorrelationID
	s.lastType = notification.Type
	s.lastToken = strings.TrimSpace(notification.Token.Token)
	return s.sentErr
}

func (s *stubAgreementEmailWorkflow) OnAgreementResent(_ context.Context, scope stores.Scope, notification AgreementNotification) error {
	s.resentCalls++
	s.lastScope = scope
	s.lastAgreement = notification.AgreementID
	s.lastRecipient = notification.RecipientID
	s.lastCorrelation = notification.CorrelationID
	s.lastType = notification.Type
	s.lastToken = strings.TrimSpace(notification.Token.Token)
	return s.resentErr
}

func setupDraftAgreement(t *testing.T) (context.Context, stores.Scope, *stores.InMemoryStore, AgreementService, stores.AgreementRecord) {
	t.Helper()
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	clock := time.Date(2026, 1, 10, 11, 0, 0, 0, time.UTC)
	docSvc := NewDocumentService(store, WithDocumentClock(func() time.Time { return clock }))
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Master Services Agreement",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		PDF:       samplePDF(2),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreementSvc := NewAgreementService(store, WithAgreementClock(func() time.Time { return clock }))
	agreement, err := agreementSvc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "MSA",
		Message:         "Please review",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	return ctx, scope, store, agreementSvc, agreement
}

func TestAgreementServiceDraftLifecycleRecipientsAndFields(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)

	updated, err := svc.UpdateDraft(ctx, scope, agreement.ID, stores.AgreementDraftPatch{
		Title:   stringPtr("Updated MSA"),
		Message: stringPtr("Updated message"),
	}, agreement.Version)
	if err != nil {
		t.Fatalf("UpdateDraft: %v", err)
	}
	if updated.Title != "Updated MSA" {
		t.Fatalf("expected updated title, got %q", updated.Title)
	}

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Name:         stringPtr("Signer One"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	cc, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("cc@example.com"),
		Name:         stringPtr("CC One"),
		Role:         stringPtr(stores.RecipientRoleCC),
		SigningOrder: intPtr(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft cc: %v", err)
	}

	field, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	if field.RecipientID != signer.ID {
		t.Fatalf("expected signer field recipient id %q, got %q", signer.ID, field.RecipientID)
	}

	fields, err := store.ListFields(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListFields: %v", err)
	}
	if len(fields) != 1 {
		t.Fatalf("expected 1 field, got %d", len(fields))
	}

	if err := svc.DeleteFieldDraft(ctx, scope, agreement.ID, field.ID); err != nil {
		t.Fatalf("DeleteFieldDraft: %v", err)
	}
	fields, err = store.ListFields(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListFields after delete: %v", err)
	}
	if len(fields) != 0 {
		t.Fatalf("expected no fields after delete, got %d", len(fields))
	}

	if err := svc.RemoveRecipientDraft(ctx, scope, agreement.ID, cc.ID); err != nil {
		t.Fatalf("RemoveRecipientDraft: %v", err)
	}
	recipients, err := store.ListRecipients(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListRecipients: %v", err)
	}
	if len(recipients) != 1 || recipients[0].Role != stores.RecipientRoleSigner {
		t.Fatalf("expected only signer remaining, got %+v", recipients)
	}
}

func TestAgreementServiceRecipientConstraints(t *testing.T) {
	ctx, scope, _, svc, agreement := setupDraftAgreement(t)

	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("cc-only@example.com"),
		Role:         stringPtr(stores.RecipientRoleCC),
		SigningOrder: intPtr(1),
	}, 0); err == nil {
		t.Fatal("expected at least one signer constraint error")
	}

	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-2@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(2),
	}, 0); err == nil {
		t.Fatal("expected sequential signer order constraint error")
	}

	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-1@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0); err != nil {
		t.Fatalf("expected signer order 1 to pass, got %v", err)
	}
	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-2@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(2),
	}, 0); err != nil {
		t.Fatalf("expected signer order 2 to pass, got %v", err)
	}
	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("cc@example.com"),
		Role:         stringPtr(stores.RecipientRoleCC),
		SigningOrder: intPtr(3),
	}, 0); err != nil {
		t.Fatalf("expected optional cc to pass, got %v", err)
	}

	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-3@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(3),
	}, 0); err != nil {
		t.Fatalf("expected additional signer in stage 3 to pass, got %v", err)
	}

	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-4@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(4),
	}, 0); err != nil {
		t.Fatalf("expected arbitrary signer count support, got %v", err)
	}
}

func TestAgreementServiceDraftMutationsBlockedAfterSend(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	_, err = svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	sent, err := store.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{ToStatus: stores.AgreementStatusSent, ExpectedVersion: agreement.Version})
	if err != nil {
		t.Fatalf("Transition sent: %v", err)
	}

	if _, err := svc.UpdateDraft(ctx, scope, agreement.ID, stores.AgreementDraftPatch{Title: stringPtr("Blocked")}, sent.Version); err == nil {
		t.Fatal("expected immutable update error")
	}
	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("another@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(2),
	}, 0); err == nil {
		t.Fatal("expected immutable recipient mutation error")
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		Type:       stringPtr(stores.FieldTypeText),
		PageNumber: intPtr(1),
	}); err == nil {
		t.Fatal("expected immutable field mutation error")
	}
}

func TestAgreementServiceValidateBeforeSend(t *testing.T) {
	ctx, scope, _, svc, agreement := setupDraftAgreement(t)

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}

	invalid, err := svc.ValidateBeforeSend(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ValidateBeforeSend invalid: %v", err)
	}
	if invalid.Valid {
		t.Fatal("expected validation to fail without required signature field")
	}
	if len(invalid.Issues) == 0 {
		t.Fatal("expected validation issues")
	}

	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}

	valid, err := svc.ValidateBeforeSend(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ValidateBeforeSend valid: %v", err)
	}
	if !valid.Valid {
		t.Fatalf("expected validation success, got issues %+v", valid.Issues)
	}
}

func TestAgreementServiceValidateBeforeSendFlagsOutOfBoundsPagePlacements(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)

	signerRole := stores.RecipientRoleSigner
	stage := 1
	signer, err := store.UpsertParticipantDraft(ctx, scope, agreement.ID, stores.ParticipantDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         &signerRole,
		SigningStage: &stage,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertParticipantDraft: %v", err)
	}
	definitionType := stores.FieldTypeSignature
	required := true
	definition, err := store.UpsertFieldDefinitionDraft(ctx, scope, agreement.ID, stores.FieldDefinitionDraftPatch{
		ParticipantID: &signer.ID,
		Type:          &definitionType,
		Required:      &required,
	})
	if err != nil {
		t.Fatalf("UpsertFieldDefinitionDraft: %v", err)
	}
	pageNumber := 3 // Source document has 2 pages in setup fixture.
	if _, err := store.UpsertFieldInstanceDraft(ctx, scope, agreement.ID, stores.FieldInstanceDraftPatch{
		FieldDefinitionID: &definition.ID,
		PageNumber:        &pageNumber,
		X:                 floatPtr(10),
		Y:                 floatPtr(20),
		Width:             floatPtr(100),
		Height:            floatPtr(30),
	}); err != nil {
		t.Fatalf("UpsertFieldInstanceDraft: %v", err)
	}

	validation, err := svc.ValidateBeforeSend(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ValidateBeforeSend: %v", err)
	}
	if validation.Valid {
		t.Fatal("expected validation to fail for out-of-document page placement")
	}
	found := false
	for _, issue := range validation.Issues {
		if issue.Field == "field_instances.page_number" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected page_number validation issue, got %+v", validation.Issues)
	}
}

func TestAgreementServiceV2AuthoringCRUDAndGeometryBounds(t *testing.T) {
	ctx, scope, _, svc, agreement := setupDraftAgreement(t)

	signerRole := stores.RecipientRoleSigner
	stage := 1
	participant, err := svc.UpsertParticipantDraft(ctx, scope, agreement.ID, stores.ParticipantDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Name:         stringPtr("Primary Signer"),
		Role:         &signerRole,
		SigningStage: &stage,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertParticipantDraft: %v", err)
	}

	definitionType := stores.FieldTypeSignature
	required := true
	definition, err := svc.UpsertFieldDefinitionDraft(ctx, scope, agreement.ID, stores.FieldDefinitionDraftPatch{
		ParticipantID: &participant.ID,
		Type:          &definitionType,
		Required:      &required,
	})
	if err != nil {
		t.Fatalf("UpsertFieldDefinitionDraft: %v", err)
	}

	page := 1
	x := 22.5
	y := 33.5
	width := 120.0
	height := 28.0
	tabIndex := 1
	instance, err := svc.UpsertFieldInstanceDraft(ctx, scope, agreement.ID, stores.FieldInstanceDraftPatch{
		FieldDefinitionID: &definition.ID,
		PageNumber:        &page,
		X:                 &x,
		Y:                 &y,
		Width:             &width,
		Height:            &height,
		TabIndex:          &tabIndex,
	})
	if err != nil {
		t.Fatalf("UpsertFieldInstanceDraft: %v", err)
	}
	if instance.TabIndex != tabIndex {
		t.Fatalf("expected tab_index %d, got %d", tabIndex, instance.TabIndex)
	}

	if _, err := svc.UpsertFieldInstanceDraft(ctx, scope, agreement.ID, stores.FieldInstanceDraftPatch{
		FieldDefinitionID: &definition.ID,
		PageNumber:        intPtr(3),
		X:                 floatPtr(10),
		Y:                 floatPtr(20),
		Width:             floatPtr(100),
		Height:            floatPtr(30),
	}); err == nil {
		t.Fatal("expected out-of-bounds page_number to be rejected")
	}

	participants, err := svc.ListParticipants(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListParticipants: %v", err)
	}
	if len(participants) != 1 {
		t.Fatalf("expected 1 participant, got %d", len(participants))
	}

	definitions, err := svc.ListFieldDefinitions(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListFieldDefinitions: %v", err)
	}
	if len(definitions) != 1 {
		t.Fatalf("expected 1 definition, got %d", len(definitions))
	}

	instances, err := svc.ListFieldInstances(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListFieldInstances: %v", err)
	}
	if len(instances) != 1 {
		t.Fatalf("expected 1 instance, got %d", len(instances))
	}

	if err := svc.DeleteFieldInstanceDraft(ctx, scope, agreement.ID, instance.ID); err != nil {
		t.Fatalf("DeleteFieldInstanceDraft: %v", err)
	}
	if err := svc.DeleteParticipantDraft(ctx, scope, agreement.ID, participant.ID); err != nil {
		t.Fatalf("DeleteParticipantDraft: %v", err)
	}
}

func TestAgreementServiceSendIdempotency(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}

	first, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key-1"})
	if err != nil {
		t.Fatalf("Send first: %v", err)
	}
	if first.Status != stores.AgreementStatusSent {
		t.Fatalf("expected sent status, got %q", first.Status)
	}

	restarted := NewAgreementService(store)
	second, err := restarted.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key-1"})
	if err != nil {
		t.Fatalf("Send second idempotent: %v", err)
	}
	if second.Version != first.Version {
		t.Fatalf("expected idempotent send version %d, got %d", first.Version, second.Version)
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key-2"}); err == nil {
		t.Fatal("expected second unique key send to be rejected once already sent")
	}
}

func TestAgreementServiceSendDispatchesEmailWorkflow(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	workflow := &stubAgreementEmailWorkflow{}
	svc := NewAgreementService(store, WithAgreementEmailWorkflow(workflow))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-hook"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if workflow.sentCalls != 1 {
		t.Fatalf("expected 1 email workflow send call, got %d", workflow.sentCalls)
	}
	if workflow.lastScope != scope {
		t.Fatalf("expected scope %+v, got %+v", scope, workflow.lastScope)
	}
	if workflow.lastAgreement != agreement.ID {
		t.Fatalf("expected agreement %q, got %q", agreement.ID, workflow.lastAgreement)
	}
	if workflow.lastCorrelation != "send-hook" {
		t.Fatalf("expected correlation send-hook, got %q", workflow.lastCorrelation)
	}
	if workflow.lastType != NotificationSigningInvitation {
		t.Fatalf("expected notification type %q, got %q", NotificationSigningInvitation, workflow.lastType)
	}
	if workflow.lastToken == "" {
		t.Fatal("expected send workflow notification to include issued token")
	}
}

func TestAgreementServiceSendPersistsSentStatusWhenEmailWorkflowFails(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	workflow := &stubAgreementEmailWorkflow{sentErr: errors.New("smtp unavailable")}
	svc := NewAgreementService(store, WithAgreementEmailWorkflow(workflow))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}

	sent, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-with-email-error"})
	if err != nil {
		t.Fatalf("Send should succeed despite email workflow failure: %v", err)
	}
	if sent.Status != stores.AgreementStatusSent {
		t.Fatalf("expected agreement status sent, got %q", sent.Status)
	}
	if workflow.sentCalls != 1 {
		t.Fatalf("expected 1 email workflow send call, got %d", workflow.sentCalls)
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	found := false
	for _, event := range events {
		if event.EventType == "agreement.send_notification_failed" {
			found = true
			if !strings.Contains(event.MetadataJSON, "smtp unavailable") {
				t.Fatalf("expected failure metadata to include cause, got %s", event.MetadataJSON)
			}
			break
		}
	}
	if !found {
		t.Fatalf("expected agreement.send_notification_failed audit event in %+v", events)
	}
}

func TestAgreementServiceResendSequentialAndTokenRotation(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc := NewAgreementService(store, WithAgreementTokenService(tokenService))

	signerOne, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-1@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer 1: %v", err)
	}
	signerTwo, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-2@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer 2: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerOne.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer 1: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer 2: %v", err)
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	if _, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{RecipientID: signerTwo.ID}); err == nil {
		t.Fatal("expected sequential resend guard for out-of-order signer")
	}

	first, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{})
	if err != nil {
		t.Fatalf("Resend first active signer: %v", err)
	}
	if first.Recipient.ID != signerOne.ID {
		t.Fatalf("expected signer one as active target, got %q", first.Recipient.ID)
	}

	rotated, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{
		RecipientID: signerOne.ID,
		RotateToken: true,
	})
	if err != nil {
		t.Fatalf("Resend rotate token: %v", err)
	}
	if rotated.Token.Token == first.Token.Token {
		t.Fatal("expected rotated token to change")
	}

	if _, err := tokenService.Validate(ctx, scope, first.Token.Token); err == nil {
		t.Fatal("expected original token to be revoked after rotation")
	}
	if _, err := tokenService.Validate(ctx, scope, rotated.Token.Token); err != nil {
		t.Fatalf("expected rotated token to validate: %v", err)
	}
}

func TestAgreementServiceResendDispatchesEmailWorkflow(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	workflow := &stubAgreementEmailWorkflow{}
	svc := NewAgreementService(store,
		WithAgreementTokenService(tokenService),
		WithAgreementEmailWorkflow(workflow),
	)

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if _, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{IdempotencyKey: "resend-hook"}); err != nil {
		t.Fatalf("Resend: %v", err)
	}

	if workflow.resentCalls != 1 {
		t.Fatalf("expected 1 email workflow resend call, got %d", workflow.resentCalls)
	}
	if workflow.lastScope != scope {
		t.Fatalf("expected scope %+v, got %+v", scope, workflow.lastScope)
	}
	if workflow.lastAgreement != agreement.ID {
		t.Fatalf("expected agreement %q, got %q", agreement.ID, workflow.lastAgreement)
	}
	if workflow.lastRecipient != signer.ID {
		t.Fatalf("expected recipient %q, got %q", signer.ID, workflow.lastRecipient)
	}
	if workflow.lastCorrelation != "resend-hook" {
		t.Fatalf("expected correlation resend-hook, got %q", workflow.lastCorrelation)
	}
	if workflow.lastType != NotificationSigningReminder {
		t.Fatalf("expected notification type %q, got %q", NotificationSigningReminder, workflow.lastType)
	}
	if workflow.lastToken == "" {
		t.Fatal("expected resend workflow notification to include issued token")
	}
}

func TestAgreementServiceResendPersistsWhenEmailWorkflowFails(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	workflow := &stubAgreementEmailWorkflow{resentErr: errors.New("mail provider unavailable")}
	svc := NewAgreementService(store,
		WithAgreementTokenService(tokenService),
		WithAgreementEmailWorkflow(workflow),
	)

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	resent, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{IdempotencyKey: "resend-with-email-error"})
	if err != nil {
		t.Fatalf("Resend should succeed despite email workflow failure: %v", err)
	}
	if strings.TrimSpace(resent.Token.Token) == "" {
		t.Fatal("expected resend result to include token")
	}
	if workflow.resentCalls != 1 {
		t.Fatalf("expected 1 email workflow resend call, got %d", workflow.resentCalls)
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	found := false
	for _, event := range events {
		if event.EventType == "agreement.resend_notification_failed" {
			found = true
			if !strings.Contains(event.MetadataJSON, "mail provider unavailable") {
				t.Fatalf("expected failure metadata to include cause, got %s", event.MetadataJSON)
			}
			break
		}
	}
	if !found {
		t.Fatalf("expected agreement.resend_notification_failed audit event in %+v", events)
	}
}

func TestAgreementServiceVoidRevokesSignerTokens(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc := NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer: %v", err)
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	resent, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{})
	if err != nil {
		t.Fatalf("Resend: %v", err)
	}

	voided, err := svc.Void(ctx, scope, agreement.ID, VoidInput{RevokeTokens: true, Reason: "sender requested"})
	if err != nil {
		t.Fatalf("Void: %v", err)
	}
	if voided.Status != stores.AgreementStatusVoided {
		t.Fatalf("expected voided status, got %q", voided.Status)
	}

	if _, err := tokenService.Validate(ctx, scope, resent.Token.Token); err == nil {
		t.Fatal("expected resend token revoked after void")
	}
}

func TestAgreementServiceVoidRevokesMixedStageTokens(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	capturingTokens := &capturingAgreementTokenService{inner: tokenService}
	svc := NewAgreementService(store, WithAgreementTokenService(capturingTokens))

	signerStageOne, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage1@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft stage one signer: %v", err)
	}
	signerStageTwo, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage2@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft stage two signer: %v", err)
	}
	for _, signer := range []stores.RecipientRecord{signerStageOne, signerStageTwo} {
		if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
			RecipientID: &signer.ID,
			Type:        stringPtr(stores.FieldTypeSignature),
			PageNumber:  intPtr(1),
			Required:    boolPtr(true),
		}); err != nil {
			t.Fatalf("UpsertFieldDraft signer %s: %v", signer.ID, err)
		}
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-mixed-stage-void"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if len(capturingTokens.issued) != 2 {
		t.Fatalf("expected send to issue tokens for both mixed-stage signers, got %d", len(capturingTokens.issued))
	}

	voided, err := svc.Void(ctx, scope, agreement.ID, VoidInput{RevokeTokens: true, Reason: "cancelled"})
	if err != nil {
		t.Fatalf("Void: %v", err)
	}
	if voided.Status != stores.AgreementStatusVoided {
		t.Fatalf("expected voided status, got %q", voided.Status)
	}

	for _, issued := range capturingTokens.issued {
		if _, err := tokenService.Validate(ctx, scope, issued.Token); err == nil {
			t.Fatalf("expected token %q to be revoked after void", issued.Token)
		}
	}
}

func TestAgreementServiceEmitsCanonicalAuditEvents(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc = NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if _, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{RotateToken: true}); err != nil {
		t.Fatalf("Resend: %v", err)
	}
	if _, err := svc.Void(ctx, scope, agreement.ID, VoidInput{RevokeTokens: true}); err != nil {
		t.Fatalf("Void: %v", err)
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	if len(events) == 0 {
		t.Fatal("expected audit events")
	}

	seen := map[string]bool{}
	for _, event := range events {
		seen[event.EventType] = true
	}
	required := []string{
		"agreement.created",
		"agreement.recipient_upserted",
		"agreement.field_upserted",
		"agreement.sent",
		"agreement.resent",
		"agreement.voided",
	}
	for _, eventType := range required {
		if !seen[eventType] {
			t.Fatalf("missing audit event type %q in %+v", eventType, seen)
		}
	}
}

func TestAgreementServiceExpireRevokesTokens(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc := NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer: %v", err)
	}
	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	resent, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{})
	if err != nil {
		t.Fatalf("Resend: %v", err)
	}

	expired, err := svc.Expire(ctx, scope, agreement.ID, ExpireInput{Reason: "ttl elapsed"})
	if err != nil {
		t.Fatalf("Expire: %v", err)
	}
	if expired.Status != stores.AgreementStatusExpired {
		t.Fatalf("expected expired status, got %q", expired.Status)
	}
	if _, err := tokenService.Validate(ctx, scope, resent.Token.Token); err == nil {
		t.Fatal("expected token revoked after expiry")
	}

	if _, err := svc.Expire(ctx, scope, agreement.ID, ExpireInput{Reason: "repeat"}); err == nil {
		t.Fatal("expected second expiry call to be rejected")
	}
}

func TestAgreementServiceExpireRevokesMixedStageTokens(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	capturingTokens := &capturingAgreementTokenService{inner: tokenService}
	svc := NewAgreementService(store, WithAgreementTokenService(capturingTokens))

	signerStageOne, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage1@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft stage one signer: %v", err)
	}
	signerStageTwo, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("stage2@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft stage two signer: %v", err)
	}
	for _, signer := range []stores.RecipientRecord{signerStageOne, signerStageTwo} {
		if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
			RecipientID: &signer.ID,
			Type:        stringPtr(stores.FieldTypeSignature),
			PageNumber:  intPtr(1),
			Required:    boolPtr(true),
		}); err != nil {
			t.Fatalf("UpsertFieldDraft signer %s: %v", signer.ID, err)
		}
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-mixed-stage-expire"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if len(capturingTokens.issued) != 2 {
		t.Fatalf("expected send to issue tokens for both mixed-stage signers, got %d", len(capturingTokens.issued))
	}

	expired, err := svc.Expire(ctx, scope, agreement.ID, ExpireInput{Reason: "time window elapsed"})
	if err != nil {
		t.Fatalf("Expire: %v", err)
	}
	if expired.Status != stores.AgreementStatusExpired {
		t.Fatalf("expected expired status, got %q", expired.Status)
	}

	for _, issued := range capturingTokens.issued {
		if _, err := tokenService.Validate(ctx, scope, issued.Token); err == nil {
			t.Fatalf("expected token %q to be revoked after expiry", issued.Token)
		}
	}
}

func TestAgreementServiceDateSignedFieldRules(t *testing.T) {
	ctx, scope, _, svc, agreement := setupDraftAgreement(t)
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}

	dateField, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeDateSigned),
		PageNumber:  intPtr(1),
		Required:    boolPtr(false),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft date_signed: %v", err)
	}
	if !dateField.Required {
		t.Fatal("expected date_signed field to be system-enforced required")
	}

	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		Type:       stringPtr(stores.FieldTypeDateSigned),
		PageNumber: intPtr(1),
	}); err == nil {
		t.Fatal("expected date_signed without signer recipient to be rejected")
	}
}

func TestAgreementServiceResolveFieldValueForSigner(t *testing.T) {
	ctx, scope, _, svc, agreement := setupDraftAgreement(t)
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	dateField, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeDateSigned),
		PageNumber:  intPtr(1),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft date_signed: %v", err)
	}
	stampedAt := time.Date(2026, 1, 11, 14, 15, 16, 0, time.UTC)
	resolved, err := svc.ResolveFieldValueForSigner(dateField, "1999-01-01", stampedAt)
	if err != nil {
		t.Fatalf("ResolveFieldValueForSigner date_signed: %v", err)
	}
	if resolved != stampedAt.Format(time.RFC3339) {
		t.Fatalf("expected system-managed timestamp %q, got %q", stampedAt.Format(time.RFC3339), resolved)
	}

	textField := stores.FieldRecord{Type: stores.FieldTypeText}
	resolved, err = svc.ResolveFieldValueForSigner(textField, "  hello  ", time.Time{})
	if err != nil {
		t.Fatalf("ResolveFieldValueForSigner text: %v", err)
	}
	if resolved != "hello" {
		t.Fatalf("expected trimmed text value, got %q", resolved)
	}
}

func TestAgreementServiceCCRoleSemantics(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc := NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	cc, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("cc@example.com"),
		Role:         stringPtr(stores.RecipientRoleCC),
		SigningOrder: intPtr(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft cc: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer signature: %v", err)
	}

	sent, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key"})
	if err != nil {
		t.Fatalf("Send: %v", err)
	}
	if _, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{RecipientID: cc.ID}); err == nil {
		t.Fatal("expected resend to cc recipient to be rejected")
	}
	delivery, err := svc.CompletionDeliveryRecipients(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("CompletionDeliveryRecipients before completion: %v", err)
	}
	if len(delivery) != 0 {
		t.Fatalf("expected no cc delivery recipients before completion, got %+v", delivery)
	}

	if _, err := store.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
		ToStatus:        stores.AgreementStatusCompleted,
		ExpectedVersion: sent.Version,
	}); err != nil {
		t.Fatalf("Transition completed: %v", err)
	}

	delivery, err = svc.CompletionDeliveryRecipients(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("CompletionDeliveryRecipients completed: %v", err)
	}
	if len(delivery) != 1 || delivery[0].ID != cc.ID {
		t.Fatalf("expected only cc recipient for completion delivery, got %+v", delivery)
	}
}
