package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin/guardedeffects"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

//go:fix inline
func stringPtr(v string) *string { return new(v) }

//go:fix inline
func boolPtr(v bool) *bool { return new(v) }

//go:fix inline
func floatPtr(v float64) *float64 { return new(v) }

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

type stubAgreementNotificationDispatchTrigger struct {
	calls     int
	lastScope stores.Scope
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

func (c *capturingAgreementTokenService) IssuePending(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error) {
	issued, err := c.inner.IssuePending(ctx, scope, agreementID, recipientID)
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

func (c *capturingAgreementTokenService) PromotePending(ctx context.Context, scope stores.Scope, tokenID string) (stores.SigningTokenRecord, error) {
	return c.inner.PromotePending(ctx, scope, tokenID)
}

func (c *capturingAgreementTokenService) AbortPending(ctx context.Context, scope stores.Scope, tokenID string) (stores.SigningTokenRecord, error) {
	return c.inner.AbortPending(ctx, scope, tokenID)
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

func (s *stubAgreementNotificationDispatchTrigger) NotifyScope(scope stores.Scope) {
	s.calls++
	s.lastScope = scope
}

func setupDraftAgreement(t *testing.T) (context.Context, stores.Scope, *stores.InMemoryStore, AgreementService, stores.AgreementRecord) {
	t.Helper()
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	clock := time.Date(2026, 1, 10, 11, 0, 0, 0, time.UTC)
	docSvc := NewDocumentService(store, WithDocumentClock(func() time.Time { return clock }))
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "Master Services Agreement",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                samplePDF(2),
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
		Title:   new("Updated MSA"),
		Message: new("Updated message"),
	}, agreement.Version)
	if err != nil {
		t.Fatalf("UpdateDraft: %v", err)
	}
	if updated.Title != "Updated MSA" {
		t.Fatalf("expected updated title, got %q", updated.Title)
	}

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Name:         new("Signer One"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	cc, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("cc@example.com"),
		Name:         new("CC One"),
		Role:         new(stores.RecipientRoleCC),
		SigningOrder: new(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft cc: %v", err)
	}

	field, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
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
		Email:        new("cc-only@example.com"),
		Role:         new(stores.RecipientRoleCC),
		SigningOrder: new(1),
	}, 0); err == nil {
		t.Fatal("expected at least one signer constraint error")
	}

	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer-2@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(2),
	}, 0); err == nil {
		t.Fatal("expected sequential signer order constraint error")
	}

	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer-1@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0); err != nil {
		t.Fatalf("expected signer order 1 to pass, got %v", err)
	}
	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer-2@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(2),
	}, 0); err != nil {
		t.Fatalf("expected signer order 2 to pass, got %v", err)
	}
	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("cc@example.com"),
		Role:         new(stores.RecipientRoleCC),
		SigningOrder: new(3),
	}, 0); err != nil {
		t.Fatalf("expected optional cc to pass, got %v", err)
	}

	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer-3@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(3),
	}, 0); err != nil {
		t.Fatalf("expected additional signer in stage 3 to pass, got %v", err)
	}

	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer-4@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(4),
	}, 0); err != nil {
		t.Fatalf("expected arbitrary signer count support, got %v", err)
	}
}

func TestAgreementServiceDraftMutationsBlockedAfterSend(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	_, err = svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	sent, err := store.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{ToStatus: stores.AgreementStatusSent, ExpectedVersion: agreement.Version})
	if err != nil {
		t.Fatalf("Transition sent: %v", err)
	}

	if _, err := svc.UpdateDraft(ctx, scope, agreement.ID, stores.AgreementDraftPatch{Title: new("Blocked")}, sent.Version); err == nil {
		t.Fatal("expected immutable update error")
	}
	if _, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("another@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(2),
	}, 0); err == nil {
		t.Fatal("expected immutable recipient mutation error")
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		Type:       new(stores.FieldTypeText),
		PageNumber: new(1),
	}); err == nil {
		t.Fatal("expected immutable field mutation error")
	}
}

func TestAgreementServiceValidateBeforeSend(t *testing.T) {
	ctx, scope, _, svc, agreement := setupDraftAgreement(t)

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
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
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
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
		Email:        new("signer@example.com"),
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
		X:                 new(float64(10)),
		Y:                 new(float64(20)),
		Width:             new(float64(100)),
		Height:            new(float64(30)),
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
		Email:        new("signer@example.com"),
		Name:         new("Primary Signer"),
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
		PageNumber:        new(3),
		X:                 new(float64(10)),
		Y:                 new(float64(20)),
		Width:             new(float64(100)),
		Height:            new(float64(30)),
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
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
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
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-hook"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if workflow.sentCalls != 0 {
		t.Fatalf("expected direct email workflow path removed, got %d calls", workflow.sentCalls)
	}
	outbox, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 1 {
		t.Fatalf("expected one queued notification, got %+v", outbox)
	}
}

func TestAgreementServiceSendEnqueuesNotificationOutboxWhenConfigured(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	workflow := &stubAgreementEmailWorkflow{}
	dispatcher := &stubAgreementNotificationDispatchTrigger{}
	svc := NewAgreementService(store,
		WithAgreementEmailWorkflow(workflow),
		WithAgreementNotificationOutbox(store),
		WithAgreementNotificationDispatchTrigger(dispatcher),
	)

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-outbox"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if workflow.sentCalls != 0 {
		t.Fatalf("expected workflow bypassed when outbox is configured, got %d calls", workflow.sentCalls)
	}
	if dispatcher.calls != 1 {
		t.Fatalf("expected one async dispatch nudge, got %d", dispatcher.calls)
	}
	if dispatcher.lastScope != scope {
		t.Fatalf("expected dispatcher scope %+v, got %+v", scope, dispatcher.lastScope)
	}

	outbox, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 1 {
		t.Fatalf("expected one outbox message, got %+v", outbox)
	}
	var payload EmailSendSigningRequestOutboxPayload
	if err := json.Unmarshal([]byte(outbox[0].PayloadJSON), &payload); err != nil {
		t.Fatalf("Unmarshal outbox payload: %v", err)
	}
	if payload.AgreementID != agreement.ID {
		t.Fatalf("expected agreement %q, got %q", agreement.ID, payload.AgreementID)
	}
	if payload.RecipientID != signer.ID {
		t.Fatalf("expected recipient %q, got %q", signer.ID, payload.RecipientID)
	}
	if payload.Notification != string(NotificationSigningInvitation) {
		t.Fatalf("expected notification %q, got %q", NotificationSigningInvitation, payload.Notification)
	}
	if payload.CorrelationID != "send-outbox" {
		t.Fatalf("expected correlation send-outbox, got %q", payload.CorrelationID)
	}
	if payload.SignerToken == "" {
		t.Fatal("expected outbox payload to include signer token")
	}
}

func TestAgreementServiceSendPersistsSentStatusWhenEmailWorkflowFails(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	workflow := &stubAgreementEmailWorkflow{sentErr: errors.New("smtp unavailable")}
	svc := NewAgreementService(store, WithAgreementEmailWorkflow(workflow))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
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
	if workflow.sentCalls != 0 {
		t.Fatalf("expected workflow not called directly, got %d", workflow.sentCalls)
	}
	if sent.DeliveryStatus != guardedeffects.StatusPrepared {
		t.Fatalf("expected delivery status %q, got %q", guardedeffects.StatusPrepared, sent.DeliveryStatus)
	}
}

func TestAgreementServiceSendBlocksUnsupportedPDFCompatibility(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 7, 8, 0, 0, 0, time.UTC)
	document, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                     "doc-unsupported",
		Title:                  "Unsupported Source",
		SourceObjectKey:        "tenant/tenant-1/org/org-1/docs/doc-unsupported/original.pdf",
		SourceOriginalName:     "source.pdf",
		SourceSHA256:           strings.Repeat("a", 64),
		SourceType:             stores.SourceTypeUpload,
		PDFCompatibilityTier:   string(PDFCompatibilityTierUnsupported),
		PDFCompatibilityReason: PDFCompatibilityReasonPreviewFallbackDisabled,
		CreatedAt:              now,
		UpdatedAt:              now,
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}

	svc := NewAgreementService(store)
	agreement, err := svc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "Unsupported Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}

	_, err = svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-pdf-unsupported"})
	if err == nil {
		t.Fatalf("expected send to fail for unsupported PDF compatibility")
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) {
		t.Fatalf("expected coded error, got %T (%v)", err, err)
	}
	if strings.TrimSpace(coded.TextCode) != string(ErrorCodePDFUnsupported) {
		t.Fatalf("expected text code %q, got %q", ErrorCodePDFUnsupported, coded.TextCode)
	}
	if got := strings.TrimSpace(fmt.Sprint(coded.Metadata["tier"])); got != string(PDFCompatibilityTierUnsupported) {
		t.Fatalf("expected tier metadata %q, got %q", PDFCompatibilityTierUnsupported, got)
	}
}

func TestAgreementServiceSendAuditsLimitedPDFCompatibility(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 7, 9, 0, 0, 0, time.UTC)
	document, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                     "doc-limited",
		Title:                  "Limited Source",
		SourceObjectKey:        "tenant/tenant-1/org/org-1/docs/doc-limited/original.pdf",
		SourceOriginalName:     "source.pdf",
		SourceSHA256:           strings.Repeat("b", 64),
		SourceType:             stores.SourceTypeUpload,
		PDFCompatibilityTier:   string(PDFCompatibilityTierLimited),
		PDFCompatibilityReason: PDFCompatibilityReasonNormalizationFailed,
		CreatedAt:              now,
		UpdatedAt:              now,
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}

	policy := DefaultPDFPolicy()
	policy.PreviewFallbackEnabled = true
	svc := NewAgreementService(store, WithAgreementPDFService(NewPDFService(WithPDFPolicyResolver(NewStaticPDFPolicyResolver(policy)))))
	agreement, err := svc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "Limited Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-pdf-limited"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	foundSent := false
	foundLimited := false
	for _, event := range events {
		if event.EventType == "agreement.sent" {
			foundSent = true
			if !strings.Contains(event.MetadataJSON, "\"pdf_compatibility_tier\":\"limited\"") {
				t.Fatalf("expected agreement.sent metadata to include limited tier, got %s", event.MetadataJSON)
			}
		}
		if event.EventType == "agreement.send_degraded_preview" {
			foundLimited = true
		}
	}
	if !foundSent {
		t.Fatalf("expected agreement.sent event")
	}
	if !foundLimited {
		t.Fatalf("expected agreement.send_degraded_preview event")
	}
}

func TestAgreementServiceResendSequentialAndTokenRotation(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc := NewAgreementService(store, WithAgreementTokenService(tokenService))

	signerOne, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer-1@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer 1: %v", err)
	}
	signerTwo, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer-2@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer 2: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerOne.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer 1: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
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
		t.Fatal("expected resend token to remain pending until delivery finalizes")
	}
	if _, err := tokenService.Validate(ctx, scope, rotated.Token.Token); err == nil {
		t.Fatal("expected replacement resend token to remain pending until delivery finalizes")
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
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if _, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{IdempotencyKey: "resend-hook"}); err != nil {
		t.Fatalf("Resend: %v", err)
	}

	if workflow.resentCalls != 0 {
		t.Fatalf("expected direct resend workflow path removed, got %d calls", workflow.resentCalls)
	}
	outbox, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 2 {
		t.Fatalf("expected send+resend notifications queued, got %+v", outbox)
	}
}

func TestAgreementServiceResendEnqueuesNotificationOutboxWhenConfigured(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	workflow := &stubAgreementEmailWorkflow{}
	dispatcher := &stubAgreementNotificationDispatchTrigger{}
	svc := NewAgreementService(store,
		WithAgreementTokenService(tokenService),
		WithAgreementEmailWorkflow(workflow),
		WithAgreementNotificationOutbox(store),
		WithAgreementNotificationDispatchTrigger(dispatcher),
	)

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	resent, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{IdempotencyKey: "resend-outbox"})
	if err != nil {
		t.Fatalf("Resend: %v", err)
	}
	if strings.TrimSpace(resent.Token.Token) == "" {
		t.Fatal("expected resend result to include token")
	}
	if workflow.resentCalls != 0 {
		t.Fatalf("expected resend workflow bypassed when outbox is configured, got %d calls", workflow.resentCalls)
	}
	if dispatcher.calls != 2 {
		t.Fatalf("expected two async dispatch nudges, got %d", dispatcher.calls)
	}

	outbox, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 2 {
		t.Fatalf("expected two outbox messages, got %+v", outbox)
	}
	var payload EmailSendSigningRequestOutboxPayload
	if err := json.Unmarshal([]byte(outbox[1].PayloadJSON), &payload); err != nil {
		t.Fatalf("Unmarshal resend outbox payload: %v", err)
	}
	if payload.Notification != string(NotificationSigningReminder) {
		t.Fatalf("expected notification %q, got %q", NotificationSigningReminder, payload.Notification)
	}
	if payload.RecipientID != signer.ID {
		t.Fatalf("expected recipient %q, got %q", signer.ID, payload.RecipientID)
	}
	if payload.CorrelationID != "resend-outbox" {
		t.Fatalf("expected correlation resend-outbox, got %q", payload.CorrelationID)
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
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-key"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	resent, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{IdempotencyKey: "resend-with-email-error"})
	if err != nil {
		t.Fatalf("Resend: %v", err)
	}
	if strings.TrimSpace(resent.Token.Token) == "" {
		t.Fatal("expected resend result to include token")
	}
	if workflow.resentCalls != 0 {
		t.Fatalf("expected resend workflow to be queued instead of called directly, got %d direct calls", workflow.resentCalls)
	}

	updatedAgreement, err := store.GetAgreement(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("GetAgreement: %v", err)
	}
	if updatedAgreement.DeliveryStatus != guardedeffects.StatusPrepared {
		t.Fatalf("expected prepared delivery status after queued resend, got %q", updatedAgreement.DeliveryStatus)
	}
	if strings.TrimSpace(updatedAgreement.DeliveryEffectID) == "" {
		t.Fatal("expected resend to keep compatibility delivery effect id for single-recipient history")
	}
	if len(resent.Effects) != 1 {
		t.Fatalf("expected resend result to expose only the action effect, got %+v", resent.Effects)
	}
	if strings.TrimSpace(resent.Effects[0].EffectID) != strings.TrimSpace(updatedAgreement.DeliveryEffectID) {
		t.Fatalf("expected resend action effect to match compatibility effect id, agreement=%q action=%q", updatedAgreement.DeliveryEffectID, resent.Effects[0].EffectID)
	}
	effect, err := store.GetGuardedEffect(ctx, updatedAgreement.DeliveryEffectID)
	if err != nil {
		t.Fatalf("GetGuardedEffect: %v", err)
	}
	if effect.Status != guardedeffects.StatusPrepared {
		t.Fatalf("expected prepared guarded effect, got %q", effect.Status)
	}
}

func TestAgreementServiceSendQueuesGroupedEffectsForParallelSigners(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc := NewAgreementService(store,
		WithAgreementTokenService(tokenService),
		WithAgreementNotificationOutbox(store),
	)

	for _, email := range []string{"parallel-a@example.com", "parallel-b@example.com"} {
		signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
			Email:        new(email),
			Role:         new(stores.RecipientRoleSigner),
			SigningOrder: new(1),
		}, 0)
		if err != nil {
			t.Fatalf("UpsertRecipientDraft %s: %v", email, err)
		}
		if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
			RecipientID: &signer.ID,
			Type:        new(stores.FieldTypeSignature),
			PageNumber:  new(1),
			Required:    new(true),
		}); err != nil {
			t.Fatalf("UpsertFieldDraft %s: %v", signer.ID, err)
		}
	}

	sent, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "parallel-send"})
	if err != nil {
		t.Fatalf("Send: %v", err)
	}
	if sent.DeliveryStatus != guardedeffects.StatusPrepared {
		t.Fatalf("expected prepared delivery status, got %q", sent.DeliveryStatus)
	}
	effects, err := svc.ListAgreementNotificationEffects(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListAgreementNotificationEffects: %v", err)
	}
	if len(effects) != 2 {
		t.Fatalf("expected 2 notification effects, got %+v", effects)
	}
	for _, effect := range effects {
		if effect.GroupType != GuardedEffectGroupTypeAgreement || effect.GroupID != agreement.ID {
			t.Fatalf("expected grouped effect for agreement %q, got %+v", agreement.ID, effect)
		}
		if effect.Status != guardedeffects.StatusPrepared {
			t.Fatalf("expected prepared effect, got %+v", effect)
		}
	}
}

func TestAgreementNotificationRecoveryServiceResumeEffectReusesEffectIDAndRefreshesToken(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	initial, err := tokenService.IssuePending(ctx, scope, agreement.ID, "recipient-1")
	if err != nil {
		t.Fatalf("IssuePending: %v", err)
	}
	preparePayload, err := json.Marshal(agreementNotificationEffectPreparePayload{
		AgreementID:       agreement.ID,
		RecipientID:       "recipient-1",
		PendingTokenID:    initial.Record.ID,
		Notification:      string(NotificationSigningInvitation),
		FailureAuditEvent: AgreementSendNotificationFailedAuditEvent,
	})
	if err != nil {
		t.Fatalf("Marshal prepare payload: %v", err)
	}
	effect, err := store.SaveGuardedEffect(ctx, scope, guardedeffects.Record{
		EffectID:           "effect-dead-lettered",
		Kind:               GuardedEffectKindAgreementSendInvitation,
		GroupType:          GuardedEffectGroupTypeAgreement,
		GroupID:            agreement.ID,
		SubjectType:        "agreement_recipient_notification",
		SubjectID:          "recipient-1",
		Status:             guardedeffects.StatusDeadLettered,
		CorrelationID:      "corr-original",
		PreparePayloadJSON: string(preparePayload),
		ErrorJSON:          "provider failed permanently",
		CreatedAt:          time.Date(2026, 3, 1, 10, 0, 0, 0, time.UTC),
		UpdatedAt:          time.Date(2026, 3, 1, 10, 5, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("SaveGuardedEffect: %v", err)
	}
	recovery := NewAgreementNotificationRecoveryService(store, tokenService)

	result, err := recovery.ResumeEffect(ctx, scope, effect.EffectID, GuardedEffectResumeInput{
		ActorID:       "ops-user",
		CorrelationID: "corr-resume",
	})
	if err != nil {
		t.Fatalf("ResumeEffect: %v", err)
	}
	if result.Effect.EffectID != effect.EffectID {
		t.Fatalf("expected same effect id %q, got %+v", effect.EffectID, result)
	}
	if result.Effect.Status != guardedeffects.StatusPrepared {
		t.Fatalf("expected prepared resumed effect, got %+v", result.Effect)
	}
	resumed, err := store.GetGuardedEffect(ctx, effect.EffectID)
	if err != nil {
		t.Fatalf("GetGuardedEffect: %v", err)
	}
	payload := agreementNotificationPayload(resumed)
	if payload.PendingTokenID == "" || payload.PendingTokenID == initial.Record.ID {
		t.Fatalf("expected new pending token id, got %+v", payload)
	}
	initialRecord, err := store.GetSigningToken(ctx, scope, initial.Record.ID)
	if err != nil {
		t.Fatalf("GetSigningToken initial: %v", err)
	}
	if initialRecord.Status != stores.SigningTokenStatusAborted {
		t.Fatalf("expected initial token aborted, got %+v", initialRecord)
	}
	outbox, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 1 {
		t.Fatalf("expected one outbox message, got %+v", outbox)
	}
}

func TestAgreementServiceVoidRevokesSignerTokens(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc := NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
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
		Email:        new("stage1@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft stage one signer: %v", err)
	}
	signerStageTwo, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("stage2@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft stage two signer: %v", err)
	}
	for _, signer := range []stores.RecipientRecord{signerStageOne, signerStageTwo} {
		if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
			RecipientID: &signer.ID,
			Type:        new(stores.FieldTypeSignature),
			PageNumber:  new(1),
			Required:    new(true),
		}); err != nil {
			t.Fatalf("UpsertFieldDraft signer %s: %v", signer.ID, err)
		}
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-mixed-stage-void"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if len(capturingTokens.issued) != 1 {
		t.Fatalf("expected send to issue a pending token only for the active stage signer, got %d", len(capturingTokens.issued))
	}
	if capturingTokens.issued[0].Record.RecipientID != signerStageOne.ID {
		t.Fatalf("expected pending token for stage one signer, got %q", capturingTokens.issued[0].Record.RecipientID)
	}

	voided, err := svc.Void(ctx, scope, agreement.ID, VoidInput{RevokeTokens: true, Reason: "cancelled"})
	if err != nil {
		t.Fatalf("Void: %v", err)
	}
	if voided.Status != stores.AgreementStatusVoided {
		t.Fatalf("expected voided status, got %q", voided.Status)
	}

	stageOneTokens, err := store.ListSigningTokens(ctx, scope, agreement.ID, signerStageOne.ID)
	if err != nil {
		t.Fatalf("ListSigningTokens stage one: %v", err)
	}
	if len(stageOneTokens) != 1 {
		t.Fatalf("expected one stage-one token record, got %d", len(stageOneTokens))
	}
	if stageOneTokens[0].Status != stores.SigningTokenStatusAborted {
		t.Fatalf("expected stage-one pending token aborted after void, got %q", stageOneTokens[0].Status)
	}

	stageTwoTokens, err := store.ListSigningTokens(ctx, scope, agreement.ID, signerStageTwo.ID)
	if err != nil {
		t.Fatalf("ListSigningTokens stage two: %v", err)
	}
	if len(stageTwoTokens) != 0 {
		t.Fatalf("expected no stage-two tokens before first-stage completion, got %d", len(stageTwoTokens))
	}
}

func TestAgreementServiceEmitsCanonicalAuditEvents(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc = NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
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

func TestAgreementServiceCreateCorrectionRevisionCopiesAuthoringStateAndSendSupersedesParent(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc = NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Name:         new("Signer One"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	sent, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "source-send"})
	if err != nil {
		t.Fatalf("Send source agreement: %v", err)
	}

	parentRecipients, err := store.ListRecipients(ctx, scope, sent.ID)
	if err != nil {
		t.Fatalf("ListRecipients source: %v", err)
	}
	parentTokens, err := store.ListSigningTokens(ctx, scope, sent.ID, parentRecipients[0].ID)
	if err != nil {
		t.Fatalf("ListSigningTokens source: %v", err)
	}
	if len(parentTokens) != 1 {
		t.Fatalf("expected one active parent token, got %d", len(parentTokens))
	}

	revision, err := svc.CreateRevision(ctx, scope, CreateRevisionInput{
		SourceAgreementID: sent.ID,
		Kind:              AgreementRevisionKindCorrection,
		CreatedByUserID:   "editor-1",
		IPAddress:         "198.51.100.44",
	})
	if err != nil {
		t.Fatalf("CreateRevision correction: %v", err)
	}
	if revision.Status != stores.AgreementStatusDraft {
		t.Fatalf("expected revision draft status, got %+v", revision)
	}
	if revision.WorkflowKind != stores.AgreementWorkflowKindCorrection {
		t.Fatalf("expected correction workflow kind, got %+v", revision)
	}
	if revision.ParentAgreementID != sent.ID {
		t.Fatalf("expected parent agreement id %q, got %+v", sent.ID, revision)
	}
	if revision.RootAgreementID != sent.ID {
		t.Fatalf("expected root agreement id %q, got %+v", sent.ID, revision)
	}

	parentReloaded, err := store.GetAgreement(ctx, scope, sent.ID)
	if err != nil {
		t.Fatalf("GetAgreement parent after correction request: %v", err)
	}
	if parentReloaded.Status != stores.AgreementStatusVoided {
		t.Fatalf("expected parent voided immediately after correction request, got %+v", parentReloaded)
	}

	parentTokens, err = store.ListSigningTokens(ctx, scope, sent.ID, parentRecipients[0].ID)
	if err != nil {
		t.Fatalf("ListSigningTokens parent after correction request: %v", err)
	}
	if len(parentTokens) != 1 || parentTokens[0].RevokedAt == nil {
		t.Fatalf("expected parent token revoked immediately after correction request, got %+v", parentTokens)
	}

	revisionRecipients, err := store.ListRecipients(ctx, scope, revision.ID)
	if err != nil {
		t.Fatalf("ListRecipients revision: %v", err)
	}
	if len(revisionRecipients) != 1 {
		t.Fatalf("expected copied recipients on revision, got %+v", revisionRecipients)
	}
	if strings.TrimSpace(revisionRecipients[0].Email) != "signer@example.com" {
		t.Fatalf("expected copied recipient email, got %+v", revisionRecipients[0])
	}

	revisionFields, err := store.ListFields(ctx, scope, revision.ID)
	if err != nil {
		t.Fatalf("ListFields revision: %v", err)
	}
	if len(revisionFields) != 1 {
		t.Fatalf("expected copied fields on revision, got %+v", revisionFields)
	}

	revisionTokens, err := store.ListSigningTokens(ctx, scope, revision.ID, revisionRecipients[0].ID)
	if err != nil {
		t.Fatalf("ListSigningTokens revision: %v", err)
	}
	if len(revisionTokens) != 0 {
		t.Fatalf("expected no tokens copied to correction draft, got %+v", revisionTokens)
	}

	revisionEvents, err := store.ListForAgreement(ctx, scope, revision.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement revision: %v", err)
	}
	revisionSeen := map[string]bool{}
	for _, event := range revisionEvents {
		revisionSeen[event.EventType] = true
	}
	for _, eventType := range []string{"agreement.correction_draft_created", "agreement.corrected_from"} {
		if !revisionSeen[eventType] {
			t.Fatalf("expected child audit event %q in %+v", eventType, revisionSeen)
		}
	}

	corrected, err := svc.Send(ctx, scope, revision.ID, SendInput{IdempotencyKey: "revision-send", IPAddress: "198.51.100.45"})
	if err != nil {
		t.Fatalf("Send correction revision: %v", err)
	}
	if corrected.Status != stores.AgreementStatusSent {
		t.Fatalf("expected correction revision sent, got %+v", corrected)
	}

	parentReloaded, err = store.GetAgreement(ctx, scope, sent.ID)
	if err != nil {
		t.Fatalf("GetAgreement parent: %v", err)
	}
	if parentReloaded.Status != stores.AgreementStatusVoided {
		t.Fatalf("expected parent voided after correction send, got %+v", parentReloaded)
	}

	parentTokens, err = store.ListSigningTokens(ctx, scope, sent.ID, parentRecipients[0].ID)
	if err != nil {
		t.Fatalf("ListSigningTokens parent after supersession: %v", err)
	}
	if len(parentTokens) != 1 || parentTokens[0].RevokedAt == nil {
		t.Fatalf("expected parent token revoked after supersession, got %+v", parentTokens)
	}

	revisionRecipients, err = store.ListRecipients(ctx, scope, corrected.ID)
	if err != nil {
		t.Fatalf("ListRecipients corrected: %v", err)
	}
	revisionTokens, err = store.ListSigningTokens(ctx, scope, corrected.ID, revisionRecipients[0].ID)
	if err != nil {
		t.Fatalf("ListSigningTokens corrected: %v", err)
	}
	if len(revisionTokens) != 1 || revisionTokens[0].RevokedAt != nil {
		t.Fatalf("expected fresh active child token after correction send, got %+v", revisionTokens)
	}

	parentEvents, err := store.ListForAgreement(ctx, scope, sent.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement parent: %v", err)
	}
	parentSeen := map[string]bool{}
	for _, event := range parentEvents {
		parentSeen[event.EventType] = true
	}
	for _, eventType := range []string{"agreement.correction_requested", "agreement.voided", "agreement.superseded_by_correction"} {
		if !parentSeen[eventType] {
			t.Fatalf("expected parent audit event %q in %+v", eventType, parentSeen)
		}
	}
}

func TestAgreementServiceCreateAmendmentRevisionPersistsParentExecutedHash(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc = NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	sent, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "amendment-source-send"})
	if err != nil {
		t.Fatalf("Send source agreement: %v", err)
	}
	completed, err := store.Transition(ctx, scope, sent.ID, stores.AgreementTransitionInput{
		ToStatus:        stores.AgreementStatusCompleted,
		ExpectedVersion: sent.Version,
	})
	if err != nil {
		t.Fatalf("Transition completed: %v", err)
	}

	executedSHA := strings.Repeat("f", 64)
	if _, err := store.SaveAgreementArtifacts(ctx, scope, stores.AgreementArtifactRecord{
		AgreementID:       completed.ID,
		TenantID:          scope.TenantID,
		OrgID:             scope.OrgID,
		ExecutedObjectKey: "tenant/tenant-1/org/org-1/agreements/executed.pdf",
		ExecutedSHA256:    executedSHA,
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}); err != nil {
		t.Fatalf("SaveAgreementArtifacts: %v", err)
	}

	amendment, err := svc.CreateRevision(ctx, scope, CreateRevisionInput{
		SourceAgreementID: completed.ID,
		Kind:              AgreementRevisionKindAmendment,
		CreatedByUserID:   "editor-2",
		IPAddress:         "198.51.100.55",
	})
	if err != nil {
		t.Fatalf("CreateRevision amendment: %v", err)
	}
	if amendment.WorkflowKind != stores.AgreementWorkflowKindAmendment {
		t.Fatalf("expected amendment workflow kind, got %+v", amendment)
	}
	if amendment.ParentAgreementID != completed.ID || amendment.RootAgreementID != completed.ID {
		t.Fatalf("expected amendment lineage to reference source agreement, got %+v", amendment)
	}
	if amendment.ParentExecutedSHA256 != executedSHA {
		t.Fatalf("expected amendment parent executed sha %q, got %+v", executedSHA, amendment)
	}

	amendmentEvents, err := store.ListForAgreement(ctx, scope, amendment.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement amendment: %v", err)
	}
	seen := map[string]bool{}
	for _, event := range amendmentEvents {
		seen[event.EventType] = true
	}
	for _, eventType := range []string{"agreement.amendment_draft_created", "agreement.amended_from"} {
		if !seen[eventType] {
			t.Fatalf("expected amendment audit event %q in %+v", eventType, seen)
		}
	}
}

func TestAgreementServiceCreateRevisionIdempotencyPersistsAcrossServiceRestart(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc = NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	sent, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "revision-replay-source"})
	if err != nil {
		t.Fatalf("Send source agreement: %v", err)
	}

	input := CreateRevisionInput{
		SourceAgreementID: sent.ID,
		Kind:              AgreementRevisionKindCorrection,
		CreatedByUserID:   "editor-1",
		IdempotencyKey:    "revision-replay-key",
		IPAddress:         "198.51.100.90",
	}
	first, err := svc.CreateRevision(ctx, scope, input)
	if err != nil {
		t.Fatalf("CreateRevision first: %v", err)
	}

	restarted := NewAgreementService(store, WithAgreementTokenService(stores.NewTokenService(store)))
	second, err := restarted.CreateRevision(ctx, scope, input)
	if err != nil {
		t.Fatalf("CreateRevision replay: %v", err)
	}
	if first.ID != second.ID {
		t.Fatalf("expected replayed revision id %q, got %q", first.ID, second.ID)
	}

	agreements, err := store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		t.Fatalf("ListAgreements: %v", err)
	}
	revisionCount := 0
	for _, candidate := range agreements {
		if candidate.ParentAgreementID == sent.ID {
			revisionCount++
		}
	}
	if revisionCount != 1 {
		t.Fatalf("expected one persisted child revision after replay, got %d", revisionCount)
	}

	events, err := store.ListForAgreement(ctx, scope, sent.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement source: %v", err)
	}
	correctionRequested := 0
	for _, event := range events {
		if event.EventType == "agreement.correction_requested" {
			correctionRequested++
		}
	}
	if correctionRequested != 1 {
		t.Fatalf("expected one correction_requested audit event after replay, got %d", correctionRequested)
	}
}

func TestDiffComparableParticipantsDoesNotMisreportInsertionAsUpdate(t *testing.T) {
	source := []stores.ParticipantRecord{
		{ID: "p1", Email: "alpha@example.com", Name: "Alpha", Role: stores.RecipientRoleSigner, SigningStage: 1, Notify: true},
		{ID: "p2", Email: "beta@example.com", Name: "Beta", Role: stores.RecipientRoleSigner, SigningStage: 2, Notify: true},
	}
	target := []stores.ParticipantRecord{
		{ID: "p1-new", Email: "alpha@example.com", Name: "Alpha", Role: stores.RecipientRoleSigner, SigningStage: 1, Notify: true},
		{ID: "p3-new", Email: "charlie@example.com", Name: "Charlie", Role: stores.RecipientRoleSigner, SigningStage: 1, Notify: true},
		{ID: "p2-new", Email: "beta@example.com", Name: "Beta", Role: stores.RecipientRoleSigner, SigningStage: 2, Notify: true},
	}

	diff := diffComparableParticipants(source, target)
	added := diff["added"].([]map[string]any)
	removed := diff["removed"].([]map[string]any)
	updated := diff["updated"].([]map[string]any)
	if len(added) != 1 || strings.TrimSpace(fmt.Sprint(added[0]["email"])) != "charlie@example.com" {
		t.Fatalf("expected single added participant, got %+v", diff)
	}
	if len(removed) != 0 {
		t.Fatalf("expected no removed participants, got %+v", diff)
	}
	if len(updated) != 0 {
		t.Fatalf("expected no updated participants for pure insertion, got %+v", diff)
	}
}

func TestDiffComparableFieldsDoesNotMisreportInsertedFieldAsMove(t *testing.T) {
	sourceParticipants := []stores.ParticipantRecord{
		{ID: "participant-1", Email: "alpha@example.com", Name: "Alpha", Role: stores.RecipientRoleSigner, SigningStage: 1},
	}
	targetParticipants := []stores.ParticipantRecord{
		{ID: "participant-1-new", Email: "alpha@example.com", Name: "Alpha", Role: stores.RecipientRoleSigner, SigningStage: 1},
	}
	sourceDefinitions := []stores.FieldDefinitionRecord{
		{ID: "fd-1", ParticipantID: "participant-1", Type: stores.FieldTypeSignature, Required: true},
	}
	targetDefinitions := []stores.FieldDefinitionRecord{
		{ID: "fd-1-new", ParticipantID: "participant-1-new", Type: stores.FieldTypeSignature, Required: true},
		{ID: "fd-2-new", ParticipantID: "participant-1-new", Type: stores.FieldTypeText, Required: false},
	}
	sourceInstances := []stores.FieldInstanceRecord{
		{ID: "field-source", FieldDefinitionID: "fd-1", PageNumber: 1, X: 100, Y: 120, Width: 90, Height: 20, Label: "Signature", PlacementSource: stores.PlacementSourceManual},
	}
	targetInstances := []stores.FieldInstanceRecord{
		{ID: "field-source-new", FieldDefinitionID: "fd-1-new", PageNumber: 1, X: 100, Y: 120, Width: 90, Height: 20, Label: "Signature", PlacementSource: stores.PlacementSourceManual},
		{ID: "field-added-new", FieldDefinitionID: "fd-2-new", PageNumber: 1, X: 180, Y: 120, Width: 70, Height: 18, Label: "Notes", PlacementSource: stores.PlacementSourceManual},
	}

	diff := diffComparableFields(sourceParticipants, sourceDefinitions, sourceInstances, targetParticipants, targetDefinitions, targetInstances)
	added := diff["added"].([]string)
	removed := diff["removed"].([]string)
	moved := diff["moved"].([]map[string]any)
	updated := diff["updated"].([]map[string]any)
	if len(added) != 1 || strings.TrimSpace(added[0]) != "field-added-new" {
		t.Fatalf("expected single added field, got %+v", diff)
	}
	if len(removed) != 0 {
		t.Fatalf("expected no removed fields, got %+v", diff)
	}
	if len(moved) != 0 || len(updated) != 0 {
		t.Fatalf("expected insertion to avoid move/update noise, got %+v", diff)
	}
}

func TestAgreementServicePersistsIPAddressForLifecycleAuditEvents(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := NewDocumentService(store)
	document, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "IP Lifecycle Contract",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-ip/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                samplePDF(1),
	})
	if err != nil {
		t.Fatalf("upload source document: %v", err)
	}

	tokenService := stores.NewTokenService(store)
	svc := NewAgreementService(store, WithAgreementTokenService(tokenService))
	agreement, err := svc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "IP Lifecycle Agreement",
		CreatedByUserID: "user-1",
		IPAddress:       "198.51.100.10:443",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{
		IdempotencyKey: "send-ip-lifecycle",
		IPAddress:      "198.51.100.11",
	}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if _, err := svc.Resend(ctx, scope, agreement.ID, ResendInput{
		RotateToken: true,
		IPAddress:   "198.51.100.12",
	}); err != nil {
		t.Fatalf("Resend: %v", err)
	}
	if _, err := svc.Void(ctx, scope, agreement.ID, VoidInput{
		Reason:       "cancelled by sender",
		RevokeTokens: true,
		IPAddress:    "198.51.100.13",
	}); err != nil {
		t.Fatalf("Void: %v", err)
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	if len(events) == 0 {
		t.Fatal("expected audit events")
	}
	ipByType := map[string]string{}
	for _, event := range events {
		if _, exists := ipByType[event.EventType]; exists {
			continue
		}
		ipByType[event.EventType] = strings.TrimSpace(event.IPAddress)
	}
	expected := map[string]string{
		"agreement.created": "198.51.100.10",
		"agreement.sent":    "198.51.100.11",
		"agreement.resent":  "198.51.100.12",
		"agreement.voided":  "198.51.100.13",
	}
	for eventType, wantIP := range expected {
		gotIP := ipByType[eventType]
		if gotIP != wantIP {
			t.Fatalf("expected %s ip %q, got %q", eventType, wantIP, gotIP)
		}
	}
}

func TestAgreementServiceExpireRevokesTokens(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc := NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
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
		Email:        new("stage1@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft stage one signer: %v", err)
	}
	signerStageTwo, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("stage2@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft stage two signer: %v", err)
	}
	for _, signer := range []stores.RecipientRecord{signerStageOne, signerStageTwo} {
		if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
			RecipientID: &signer.ID,
			Type:        new(stores.FieldTypeSignature),
			PageNumber:  new(1),
			Required:    new(true),
		}); err != nil {
			t.Fatalf("UpsertFieldDraft signer %s: %v", signer.ID, err)
		}
	}

	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "send-mixed-stage-expire"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if len(capturingTokens.issued) != 1 {
		t.Fatalf("expected send to issue a pending token only for the active stage signer, got %d", len(capturingTokens.issued))
	}
	if capturingTokens.issued[0].Record.RecipientID != signerStageOne.ID {
		t.Fatalf("expected pending token for stage one signer, got %q", capturingTokens.issued[0].Record.RecipientID)
	}

	expired, err := svc.Expire(ctx, scope, agreement.ID, ExpireInput{Reason: "time window elapsed"})
	if err != nil {
		t.Fatalf("Expire: %v", err)
	}
	if expired.Status != stores.AgreementStatusExpired {
		t.Fatalf("expected expired status, got %q", expired.Status)
	}

	stageOneTokens, err := store.ListSigningTokens(ctx, scope, agreement.ID, signerStageOne.ID)
	if err != nil {
		t.Fatalf("ListSigningTokens stage one: %v", err)
	}
	if len(stageOneTokens) != 1 {
		t.Fatalf("expected one stage-one token record, got %d", len(stageOneTokens))
	}
	if stageOneTokens[0].Status != stores.SigningTokenStatusAborted {
		t.Fatalf("expected stage-one pending token aborted after expiry, got %q", stageOneTokens[0].Status)
	}

	stageTwoTokens, err := store.ListSigningTokens(ctx, scope, agreement.ID, signerStageTwo.ID)
	if err != nil {
		t.Fatalf("ListSigningTokens stage two: %v", err)
	}
	if len(stageTwoTokens) != 0 {
		t.Fatalf("expected no stage-two tokens before first-stage completion, got %d", len(stageTwoTokens))
	}
}

func TestAgreementServiceDateSignedFieldRules(t *testing.T) {
	ctx, scope, _, svc, agreement := setupDraftAgreement(t)
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}

	dateField, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeDateSigned),
		PageNumber:  new(1),
		Required:    new(false),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft date_signed: %v", err)
	}
	if !dateField.Required {
		t.Fatal("expected date_signed field to be system-enforced required")
	}

	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		Type:       new(stores.FieldTypeDateSigned),
		PageNumber: new(1),
	}); err == nil {
		t.Fatal("expected date_signed without signer recipient to be rejected")
	}
}

func TestAgreementServiceResolveFieldValueForSigner(t *testing.T) {
	ctx, scope, _, svc, agreement := setupDraftAgreement(t)
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	dateField, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeDateSigned),
		PageNumber:  new(1),
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

func TestAgreementServiceCompletionDeliveryUsesNotifyFlag(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	tokenService := stores.NewTokenService(store)
	svc := NewAgreementService(store, WithAgreementTokenService(tokenService))

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         new(stores.RecipientRoleSigner),
		Notify:       new(false),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	cc, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("cc@example.com"),
		Role:         new(stores.RecipientRoleCC),
		SigningOrder: new(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft cc: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
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
		t.Fatalf("expected no completion delivery recipients before completion, got %+v", delivery)
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
		t.Fatalf("expected only notify=true recipient for completion delivery, got %+v", delivery)
	}
}

func TestAgreementServiceValidateBeforeSendBlocksApproveBeforeSendReview(t *testing.T) {
	ctx, scope, _, svc, agreement := setupDraftAgreement(t)

	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("reviewer@example.com"),
		Name:         new("Reviewer"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer signature: %v", err)
	}

	summary, err := svc.OpenReview(ctx, scope, agreement.ID, ReviewOpenInput{
		Gate:              stores.AgreementReviewGateApproveBeforeSend,
		CommentsEnabled:   true,
		ReviewerIDs:       []string{signer.ID},
		RequestedByUserID: "user-1",
		ActorType:         "user",
		ActorID:           "user-1",
	})
	if err != nil {
		t.Fatalf("OpenReview: %v", err)
	}
	if summary.Status != stores.AgreementReviewStatusInReview {
		t.Fatalf("expected review status %q, got %q", stores.AgreementReviewStatusInReview, summary.Status)
	}

	validation, err := svc.ValidateBeforeSend(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ValidateBeforeSend: %v", err)
	}
	if validation.Valid {
		t.Fatalf("expected send validation to fail while review is pending")
	}
	found := false
	for _, issue := range validation.Issues {
		if issue.Field == "review_status" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected review_status validation issue, got %+v", validation.Issues)
	}

	summary, err = svc.ApproveReview(ctx, scope, agreement.ID, ReviewDecisionInput{
		RecipientID: signer.ID,
		ActorType:   "recipient",
		ActorID:     signer.ID,
	})
	if err != nil {
		t.Fatalf("ApproveReview: %v", err)
	}
	if summary.Status != stores.AgreementReviewStatusApproved {
		t.Fatalf("expected review status %q, got %q", stores.AgreementReviewStatusApproved, summary.Status)
	}

	validation, err = svc.ValidateBeforeSend(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ValidateBeforeSend after approval: %v", err)
	}
	if !validation.Valid {
		t.Fatalf("expected send validation to pass after review approval, got %+v", validation.Issues)
	}
}

func TestAgreementServiceOpenReviewEnqueuesReviewInvitationsForRecipientAndExternalReviewers(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	dispatcher := &stubAgreementNotificationDispatchTrigger{}
	svc := NewAgreementService(store,
		WithAgreementNotificationOutbox(store),
		WithAgreementNotificationDispatchTrigger(dispatcher),
	)

	reviewer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("reviewer@example.com"),
		Name:         new("Recipient Reviewer"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft reviewer: %v", err)
	}

	summary, err := svc.OpenReview(ctx, scope, agreement.ID, ReviewOpenInput{
		Gate:            stores.AgreementReviewGateApproveBeforeSend,
		CommentsEnabled: true,
		ReviewParticipants: []ReviewParticipantInput{
			{
				ParticipantType: stores.AgreementReviewParticipantTypeRecipient,
				RecipientID:     reviewer.ID,
				CanComment:      true,
				CanApprove:      true,
			},
			{
				ParticipantType: stores.AgreementReviewParticipantTypeExternal,
				Email:           "outside.reviewer@example.com",
				DisplayName:     "Outside Reviewer",
				CanComment:      true,
				CanApprove:      true,
			},
		},
		RequestedByUserID: "ops-user",
		ActorType:         "user",
		ActorID:           "ops-user",
		CorrelationID:     "review-open-corr",
	})
	if err != nil {
		t.Fatalf("OpenReview: %v", err)
	}
	if dispatcher.calls != 1 {
		t.Fatalf("expected one async review dispatch nudge, got %d", dispatcher.calls)
	}
	if summary.Status != stores.AgreementReviewStatusInReview {
		t.Fatalf("expected review status %q, got %q", stores.AgreementReviewStatusInReview, summary.Status)
	}

	outbox, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 2 {
		t.Fatalf("expected two queued review notifications, got %+v", outbox)
	}

	byNotificationSubject := map[string]EmailSendAgreementNotificationOutboxPayload{}
	for _, record := range outbox {
		var payload EmailSendAgreementNotificationOutboxPayload
		if err := json.Unmarshal([]byte(record.PayloadJSON), &payload); err != nil {
			t.Fatalf("Unmarshal outbox payload: %v", err)
		}
		if payload.Notification != string(NotificationReviewInvitation) {
			t.Fatalf("expected review invitation payload, got %+v", payload)
		}
		if strings.TrimSpace(payload.CorrelationID) != "review-open-corr" {
			t.Fatalf("expected correlation review-open-corr, got %+v", payload)
		}
		if strings.TrimSpace(payload.ReviewToken) == "" {
			t.Fatalf("expected review token in payload, got %+v", payload)
		}
		key := strings.TrimSpace(payload.RecipientID)
		if key == "" {
			key = strings.TrimSpace(payload.ReviewParticipantID)
		}
		byNotificationSubject[key] = payload
	}

	recipientPayload, ok := byNotificationSubject[reviewer.ID]
	if !ok {
		t.Fatalf("expected recipient reviewer payload, got %+v", byNotificationSubject)
	}
	if strings.TrimSpace(recipientPayload.RecipientEmail) != "reviewer@example.com" {
		t.Fatalf("expected recipient reviewer email, got %+v", recipientPayload)
	}

	foundExternal := false
	for _, participant := range summary.Participants {
		if strings.TrimSpace(participant.ParticipantType) != stores.AgreementReviewParticipantTypeExternal {
			continue
		}
		payload, ok := byNotificationSubject[participant.ID]
		if !ok {
			t.Fatalf("expected external participant payload keyed by participant id, got %+v", byNotificationSubject)
		}
		if strings.TrimSpace(payload.RecipientID) != "" {
			t.Fatalf("expected external reviewer payload to keep recipient_id empty, got %+v", payload)
		}
		if strings.TrimSpace(payload.RecipientEmail) != "outside.reviewer@example.com" {
			t.Fatalf("expected external reviewer email, got %+v", payload)
		}
		foundExternal = true
	}
	if !foundExternal {
		t.Fatalf("expected external review participant in %+v", summary.Participants)
	}
}

func TestAgreementServiceCloseReviewRevokesReviewSessionTokens(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	reviewTokenService := stores.NewReviewSessionTokenService(store)
	svc := NewAgreementService(store, WithAgreementReviewTokenService(reviewTokenService))

	reviewer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("reviewer@example.com"),
		Name:         new("Recipient Reviewer"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft reviewer: %v", err)
	}

	summary, err := svc.OpenReview(ctx, scope, agreement.ID, ReviewOpenInput{
		Gate:            stores.AgreementReviewGateApproveBeforeSend,
		CommentsEnabled: true,
		ReviewParticipants: []ReviewParticipantInput{
			{
				ParticipantType: stores.AgreementReviewParticipantTypeRecipient,
				RecipientID:     reviewer.ID,
				CanComment:      true,
				CanApprove:      true,
			},
		},
		RequestedByUserID: "ops-user",
		ActorType:         "user",
		ActorID:           "ops-user",
	})
	if err != nil {
		t.Fatalf("OpenReview: %v", err)
	}

	participants, err := store.ListAgreementReviewParticipants(ctx, scope, summary.Review.ID)
	if err != nil {
		t.Fatalf("ListAgreementReviewParticipants: %v", err)
	}
	if len(participants) != 1 {
		t.Fatalf("expected one review participant, got %+v", participants)
	}

	issued, err := reviewTokenService.Rotate(ctx, scope, agreement.ID, summary.Review.ID, participants[0].ID)
	if err != nil {
		t.Fatalf("Rotate review token: %v", err)
	}
	if _, err := reviewTokenService.Validate(ctx, scope, issued.Token); err != nil {
		t.Fatalf("Validate review token before close: %v", err)
	}

	closed, err := svc.CloseReview(ctx, scope, agreement.ID, "user", "ops-user", "203.0.113.44")
	if err != nil {
		t.Fatalf("CloseReview: %v", err)
	}
	if closed.Status != stores.AgreementReviewStatusClosed {
		t.Fatalf("expected closed review status, got %q", closed.Status)
	}
	if _, err := reviewTokenService.Validate(ctx, scope, issued.Token); err == nil {
		t.Fatalf("expected review token validation to fail after close")
	}
}

func TestAgreementServiceNotifyReviewersResendsOnlyPendingParticipants(t *testing.T) {
	ctx, scope, store, _, agreement := setupDraftAgreement(t)
	dispatcher := &stubAgreementNotificationDispatchTrigger{}
	svc := NewAgreementService(store,
		WithAgreementNotificationOutbox(store),
		WithAgreementNotificationDispatchTrigger(dispatcher),
	)

	reviewer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("reviewer@example.com"),
		Name:         new("Recipient Reviewer"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft reviewer: %v", err)
	}

	if _, err := svc.OpenReview(ctx, scope, agreement.ID, ReviewOpenInput{
		Gate:            stores.AgreementReviewGateApproveBeforeSend,
		CommentsEnabled: true,
		ReviewParticipants: []ReviewParticipantInput{
			{
				ParticipantType: stores.AgreementReviewParticipantTypeRecipient,
				RecipientID:     reviewer.ID,
				CanComment:      true,
				CanApprove:      true,
			},
			{
				ParticipantType: stores.AgreementReviewParticipantTypeExternal,
				Email:           "outside.reviewer@example.com",
				DisplayName:     "Outside Reviewer",
				CanComment:      true,
				CanApprove:      true,
			},
		},
		RequestedByUserID: "ops-user",
		ActorType:         "user",
		ActorID:           "ops-user",
		CorrelationID:     "review-open-corr",
	}); err != nil {
		t.Fatalf("OpenReview: %v", err)
	}

	if _, err := svc.ApproveReview(ctx, scope, agreement.ID, ReviewDecisionInput{
		RecipientID: reviewer.ID,
		ActorType:   "recipient",
		ActorID:     reviewer.ID,
		IPAddress:   "203.0.113.10",
	}); err != nil {
		t.Fatalf("ApproveReview: %v", err)
	}

	renotifySummary, err := svc.NotifyReviewers(ctx, scope, agreement.ID, ReviewNotifyInput{
		RequestedByID: "ops-user",
		ActorType:     "user",
		ActorID:       "ops-user",
		CorrelationID: "review-notify-corr",
	})
	if err != nil {
		t.Fatalf("NotifyReviewers: %v", err)
	}
	if dispatcher.calls != 2 {
		t.Fatalf("expected two async review dispatch nudges, got %d", dispatcher.calls)
	}
	if renotifySummary.Status != stores.AgreementReviewStatusInReview {
		t.Fatalf("expected review status to remain in_review, got %q", renotifySummary.Status)
	}

	outbox, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 3 {
		t.Fatalf("expected three queued review notifications after renotify, got %+v", outbox)
	}

	var renotifyPayloads []EmailSendAgreementNotificationOutboxPayload
	for _, record := range outbox {
		var payload EmailSendAgreementNotificationOutboxPayload
		if err := json.Unmarshal([]byte(record.PayloadJSON), &payload); err != nil {
			t.Fatalf("Unmarshal outbox payload: %v", err)
		}
		if strings.TrimSpace(payload.CorrelationID) == "review-notify-corr" {
			renotifyPayloads = append(renotifyPayloads, payload)
		}
	}
	if len(renotifyPayloads) != 1 {
		t.Fatalf("expected one renotify payload for the remaining pending reviewer, got %+v", renotifyPayloads)
	}
	if strings.TrimSpace(renotifyPayloads[0].RecipientEmail) != "outside.reviewer@example.com" {
		t.Fatalf("expected renotify payload for external pending reviewer, got %+v", renotifyPayloads[0])
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	var found bool
	for _, event := range events {
		if event.EventType != "agreement.review_notified" {
			continue
		}
		found = true
		break
	}
	if !found {
		t.Fatalf("expected agreement.review_notified audit event, got %+v", events)
	}

}

func TestAgreementServiceRequestReviewChangesRequiresCommentAndPersistsRationale(t *testing.T) {
	ctx, scope, store, svc, agreement := setupDraftAgreement(t)

	reviewer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("reviewer@example.com"),
		Name:         new("Reviewer"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft reviewer: %v", err)
	}

	if _, err := svc.OpenReview(ctx, scope, agreement.ID, ReviewOpenInput{
		Gate:              stores.AgreementReviewGateApproveBeforeSend,
		CommentsEnabled:   false,
		ReviewerIDs:       []string{reviewer.ID},
		RequestedByUserID: "user-1",
		ActorType:         "user",
		ActorID:           "user-1",
	}); err != nil {
		t.Fatalf("OpenReview: %v", err)
	}

	if _, err := svc.RequestReviewChanges(ctx, scope, agreement.ID, ReviewDecisionInput{
		RecipientID: reviewer.ID,
		ActorType:   "recipient",
		ActorID:     reviewer.ID,
		IPAddress:   "203.0.113.10",
		Comment:     " ",
	}); err == nil {
		t.Fatalf("expected missing comment validation error")
	}

	rationale := "Please update the indemnification clause before we proceed."
	summary, err := svc.RequestReviewChanges(ctx, scope, agreement.ID, ReviewDecisionInput{
		RecipientID: reviewer.ID,
		ActorType:   "recipient",
		ActorID:     reviewer.ID,
		IPAddress:   "203.0.113.10",
		Comment:     rationale,
	})
	if err != nil {
		t.Fatalf("RequestReviewChanges: %v", err)
	}
	if summary.Status != stores.AgreementReviewStatusChangesRequested {
		t.Fatalf("expected review status %q, got %q", stores.AgreementReviewStatusChangesRequested, summary.Status)
	}
	if len(summary.Threads) != 1 {
		t.Fatalf("expected 1 persisted decision thread, got %d", len(summary.Threads))
	}
	thread := summary.Threads[0]
	if thread.Thread.AnchorType != stores.AgreementCommentAnchorAgreement {
		t.Fatalf("expected agreement-anchored rationale thread, got %q", thread.Thread.AnchorType)
	}
	if thread.Thread.Visibility != stores.AgreementCommentVisibilityShared {
		t.Fatalf("expected shared rationale thread, got %q", thread.Thread.Visibility)
	}
	if len(thread.Messages) != 1 || strings.TrimSpace(thread.Messages[0].Body) != rationale {
		t.Fatalf("expected rationale message %q, got %+v", rationale, thread.Messages)
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	var found bool
	for _, event := range events {
		if event.EventType != "agreement.review_changes_requested" {
			continue
		}
		metadata := map[string]any{}
		if err := json.Unmarshal([]byte(event.MetadataJSON), &metadata); err != nil {
			t.Fatalf("Unmarshal metadata: %v", err)
		}
		if got := strings.TrimSpace(fmt.Sprint(metadata["decision_comment"])); got != rationale {
			t.Fatalf("expected decision_comment %q, got %q", rationale, got)
		}
		if got := strings.TrimSpace(fmt.Sprint(metadata["thread_id"])); got != thread.Thread.ID {
			t.Fatalf("expected thread_id %q, got %q", thread.Thread.ID, got)
		}
		found = true
		break
	}
	if !found {
		t.Fatalf("expected agreement.review_changes_requested audit event, got %+v", events)
	}
}

func TestAgreementServiceApproveReviewSupportsSentApproveBeforeSignAgreement(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-review-send", OrgID: "org-review-send"}
	store := stores.NewInMemoryStore()
	svc := NewAgreementService(store)

	docSvc := NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "Approve Before Sign",
		SourceOriginalName: "approve-before-sign.pdf",
		ObjectKey:          "tenant/tenant-review-send/org/org-review-send/docs/approve-before-sign/source.pdf",
		PDF:                GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreement, err := svc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Approve Before Sign",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	signerRole := stores.RecipientRoleSigner
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("review-signer@example.com"),
		Name:         new("Review Signer"),
		Role:         &signerRole,
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	if _, err := svc.OpenReview(ctx, scope, agreement.ID, ReviewOpenInput{
		Gate:              stores.AgreementReviewGateApproveBeforeSign,
		CommentsEnabled:   true,
		ReviewerIDs:       []string{signer.ID},
		RequestedByUserID: "user-1",
		ActorType:         "user",
		ActorID:           "user-1",
	}); err != nil {
		t.Fatalf("OpenReview: %v", err)
	}
	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "approve-before-sign-send"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	summary, err := svc.ApproveReview(ctx, scope, agreement.ID, ReviewDecisionInput{
		RecipientID: signer.ID,
		ActorType:   "recipient",
		ActorID:     signer.ID,
	})
	if err != nil {
		t.Fatalf("ApproveReview after send: %v", err)
	}
	if summary.Status != stores.AgreementReviewStatusApproved {
		t.Fatalf("expected review status %q, got %q", stores.AgreementReviewStatusApproved, summary.Status)
	}

	updated, err := store.GetAgreement(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("GetAgreement: %v", err)
	}
	if updated.ReviewStatus != stores.AgreementReviewStatusApproved {
		t.Fatalf("expected agreement review_status %q, got %q", stores.AgreementReviewStatusApproved, updated.ReviewStatus)
	}
}
