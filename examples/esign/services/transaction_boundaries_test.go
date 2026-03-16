package services

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

type txFailingStore struct {
	*stores.InMemoryStore
	withTxCalls int
	err         error
}

func newTxFailingStore(err error) *txFailingStore {
	return &txFailingStore{
		InMemoryStore: stores.NewInMemoryStore(),
		err:           err,
	}
}

func (s *txFailingStore) WithTx(_ context.Context, fn func(tx stores.TxStore) error) error {
	s.withTxCalls++
	if s.err != nil {
		return s.err
	}
	if fn == nil {
		return nil
	}
	return fn(s)
}

type txCommitErrorStore struct {
	*stores.InMemoryStore
	withTxCalls int
	err         error
}

func newTxCommitErrorStore() *txCommitErrorStore {
	return &txCommitErrorStore{
		InMemoryStore: stores.NewInMemoryStore(),
	}
}

func (s *txCommitErrorStore) WithTx(ctx context.Context, fn func(tx stores.TxStore) error) error {
	s.withTxCalls++
	if err := s.InMemoryStore.WithTx(ctx, fn); err != nil {
		return err
	}
	if s.err != nil {
		return s.err
	}
	return nil
}

func TestAgreementServiceSendUsesTransactionBoundary(t *testing.T) {
	txErr := errors.New("tx sentinel")
	store := newTxFailingStore(txErr)
	svc := NewAgreementService(store)

	_, err := svc.Send(context.Background(), stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}, "agreement-1", SendInput{IdempotencyKey: "send-tx"})
	if !errors.Is(err, txErr) {
		t.Fatalf("expected tx sentinel error, got %v", err)
	}
	if store.withTxCalls != 1 {
		t.Fatalf("expected WithTx called once, got %d", store.withTxCalls)
	}
}

func TestSigningServiceSubmitUsesTransactionBoundary(t *testing.T) {
	txErr := errors.New("tx sentinel")
	store := newTxFailingStore(txErr)
	svc := NewSigningService(store)

	_, err := svc.Submit(context.Background(), stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}, stores.SigningTokenRecord{
		AgreementID: "agreement-1",
		RecipientID: "recipient-1",
	}, SignerSubmitInput{IdempotencyKey: "submit-tx"})
	if !errors.Is(err, txErr) {
		t.Fatalf("expected tx sentinel error, got %v", err)
	}
	if store.withTxCalls != 1 {
		t.Fatalf("expected WithTx called once, got %d", store.withTxCalls)
	}
}

func TestAgreementServiceSendDoesNotRunPostCommitHooksWhenCommitFails(t *testing.T) {
	store := newTxCommitErrorStore()
	workflow := &stubAgreementEmailWorkflow{}
	dispatcher := &stubAgreementNotificationDispatchTrigger{}
	svc := NewAgreementService(store,
		WithAgreementEmailWorkflow(workflow),
		WithAgreementNotificationOutbox(store),
		WithAgreementNotificationDispatchTrigger(dispatcher),
	)

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Date(2026, 1, 12, 12, 0, 0, 0, time.UTC)
	docSvc := NewDocumentService(store, WithDocumentClock(func() time.Time { return now }))
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "tx-boundary-send",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/tx-boundary-send.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                samplePDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreement, err := svc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "TX Boundary Send",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signer, err := svc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	if _, err := svc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	txErr := errors.New("commit flush sentinel")
	store.err = txErr
	if _, err := svc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "tx-commit-fail-send"}); err != nil {
		t.Fatalf("Send should recover via idempotent replay despite commit sentinel: %v", err)
	}
	if workflow.sentCalls != 0 {
		t.Fatalf("expected post-commit email hook not to run, got %d calls", workflow.sentCalls)
	}
	if dispatcher.calls != 0 {
		t.Fatalf("expected outbox dispatcher not to run, got %d calls", dispatcher.calls)
	}
	outbox, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Topic: NotificationOutboxTopicEmailSendSigningRequest})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(outbox) != 1 {
		t.Fatalf("expected one committed outbox message after replay recovery, got %+v", outbox)
	}
}

func TestAgreementServiceWithSharedAuditStoreRebindsAuditsForTx(t *testing.T) {
	baseStore := stores.NewInMemoryStore()
	svc := NewAgreementService(baseStore, WithAgreementAuditStore(baseStore))
	if svc.customAudits {
		t.Fatal("expected shared audit store to remain tx-bindable")
	}

	txStore := stores.NewInMemoryStore()
	txSvc := svc.forTx(txStore)
	if !sameInstance(txSvc.audits, txStore) {
		t.Fatal("expected shared audit store to rebind to tx store")
	}
}

func TestAgreementServiceWithCustomAuditStorePreservesCustomAuditStoreAcrossTx(t *testing.T) {
	baseStore := stores.NewInMemoryStore()
	customAuditStore := stores.NewInMemoryStore()
	svc := NewAgreementService(baseStore, WithAgreementAuditStore(customAuditStore))
	if !svc.customAudits {
		t.Fatal("expected distinct audit store to remain custom")
	}

	txStore := stores.NewInMemoryStore()
	txSvc := svc.forTx(txStore)
	if !sameInstance(txSvc.audits, customAuditStore) {
		t.Fatal("expected custom audit store to remain unchanged across tx binding")
	}
}

func TestSigningServiceWithSharedAuditStoreRebindsAuditsForTx(t *testing.T) {
	baseStore := stores.NewInMemoryStore()
	svc := NewSigningService(baseStore, WithSigningAuditStore(baseStore))
	if svc.customAudits {
		t.Fatal("expected shared signing audit store to remain tx-bindable")
	}

	txStore := stores.NewInMemoryStore()
	txSvc := svc.forTx(txStore)
	if !sameInstance(txSvc.audits, txStore) {
		t.Fatal("expected shared signing audit store to rebind to tx store")
	}
}

func TestSigningServiceSubmitDoesNotRunPostCommitHooksWhenCommitFails(t *testing.T) {
	store := newTxCommitErrorStore()
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	now := time.Date(2026, 1, 13, 9, 0, 0, 0, time.UTC)
	docSvc := NewDocumentService(store, WithDocumentClock(func() time.Time { return now }))
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "tx-boundary-submit",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/tx-boundary-submit.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                samplePDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreementSvc := NewAgreementService(store, WithAgreementClock(func() time.Time { return now }))
	agreement, err := agreementSvc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "TX Boundary Submit",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  new(1),
		Required:    new(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "tx-boundary-send-ok"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	completionFlow := &capturingCompletionWorkflow{}
	signingSvc := NewSigningService(store, WithSigningCompletionWorkflow(completionFlow))
	token := stores.SigningTokenRecord{AgreementID: agreement.ID, RecipientID: signer.ID}
	if _, err := signingSvc.CaptureConsent(ctx, scope, token, SignerConsentInput{Accepted: true}); err != nil {
		t.Fatalf("CaptureConsent: %v", err)
	}
	if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "typed",
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/tx-boundary-submit/sig.png",
		SHA256:    strings.Repeat("c", 64),
		ValueText: "Signer Name",
	}); err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}

	txErr := errors.New("commit flush sentinel")
	store.err = txErr
	if _, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: "tx-commit-fail-submit"}); !errors.Is(err, txErr) {
		t.Fatalf("expected tx sentinel error, got %v", err)
	}
	if completionFlow.calls != 0 {
		t.Fatalf("expected post-commit completion hook not to run, got %d calls", completionFlow.calls)
	}
}

func TestArtifactPipelineGenerateExecutedUsesTransactionBoundary(t *testing.T) {
	txErr := errors.New("tx sentinel")
	store := newTxFailingStore(nil)
	ctx, scope, agreement := seedCompletedAgreementForArtifacts(t, store)
	objectStore := newRecordingArtifactObjectStore(t, nil)
	svc := NewArtifactPipelineService(store, NewDeterministicArtifactRenderer(), WithArtifactObjectStore(objectStore))
	initialWithTxCalls := store.withTxCalls
	store.err = txErr

	_, err := svc.GenerateExecutedArtifact(ctx, scope, agreement.ID, "corr-1")
	if !errors.Is(err, txErr) {
		t.Fatalf("expected tx sentinel error, got %v", err)
	}
	if store.withTxCalls-initialWithTxCalls != 1 {
		t.Fatalf("expected WithTx called once during finalize, got %d", store.withTxCalls-initialWithTxCalls)
	}
	if len(objectStore.uploads) != 1 {
		t.Fatalf("expected render/upload to complete before tx failure, got %+v", objectStore.uploads)
	}
}
