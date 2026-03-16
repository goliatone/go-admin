package services

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

type txAwareArtifactStore struct {
	*stores.InMemoryStore
	withTxCalls int
	txActive    bool
}

func newTxAwareArtifactStore() *txAwareArtifactStore {
	return &txAwareArtifactStore{InMemoryStore: stores.NewInMemoryStore()}
}

func (s *txAwareArtifactStore) WithTx(_ context.Context, fn func(tx stores.TxStore) error) error {
	s.withTxCalls++
	s.txActive = true
	defer func() {
		s.txActive = false
	}()
	if fn == nil {
		return nil
	}
	return fn(s)
}

type txAwareArtifactRenderer struct {
	t                *testing.T
	store            *txAwareArtifactStore
	delegate         ArtifactRenderer
	executedCalls    int
	certificateCalls int
}

func (r *txAwareArtifactRenderer) RenderExecuted(ctx context.Context, input ExecutedRenderInput) (RenderedArtifact, error) {
	r.executedCalls++
	if r.store.txActive {
		r.t.Fatal("executed renderer invoked inside write transaction")
	}
	return r.delegate.RenderExecuted(ctx, input)
}

func (r *txAwareArtifactRenderer) RenderCertificate(ctx context.Context, input CertificateRenderInput) (RenderedArtifact, error) {
	r.certificateCalls++
	if r.store.txActive {
		r.t.Fatal("certificate renderer invoked inside write transaction")
	}
	return r.delegate.RenderCertificate(ctx, input)
}

type recordingArtifactObjectStore struct {
	t       *testing.T
	active  func() bool
	uploads []string
	files   map[string][]byte
}

func newRecordingArtifactObjectStore(t *testing.T, active func() bool) *recordingArtifactObjectStore {
	t.Helper()
	return &recordingArtifactObjectStore{
		t:      t,
		active: active,
		files:  map[string][]byte{},
	}
}

func (s *recordingArtifactObjectStore) UploadFile(_ context.Context, path string, content []byte, _ ...uploader.UploadOption) (string, error) {
	if s.active != nil && s.active() {
		s.t.Fatal("artifact upload invoked inside write transaction")
	}
	path = strings.TrimSpace(path)
	s.uploads = append(s.uploads, path)
	s.files[path] = append([]byte{}, content...)
	return path, nil
}

func (s *recordingArtifactObjectStore) GetFile(_ context.Context, path string) ([]byte, error) {
	if s.active != nil && s.active() {
		s.t.Fatal("artifact object-store verification invoked inside write transaction")
	}
	path = strings.TrimSpace(path)
	content, ok := s.files[path]
	if !ok {
		return nil, errors.New("artifact not found")
	}
	return append([]byte{}, content...), nil
}

type fixedArtifactRenderer struct {
	executed    RenderedArtifact
	certificate RenderedArtifact
}

func (r fixedArtifactRenderer) RenderExecuted(_ context.Context, _ ExecutedRenderInput) (RenderedArtifact, error) {
	return r.executed, nil
}

func (r fixedArtifactRenderer) RenderCertificate(_ context.Context, _ CertificateRenderInput) (RenderedArtifact, error) {
	return r.certificate, nil
}

func seedCompletedAgreementForArtifacts(t *testing.T, store stores.Store) (context.Context, stores.Scope, stores.AgreementRecord) {
	t.Helper()
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}

	docSvc := NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "Artifact Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/artifact-source.pdf",
		SourceOriginalName: "artifact-source.pdf",
		PDF:                samplePDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Artifact Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Name:         new("Signer"),
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
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeText),
		PageNumber:  new(1),
		Required:    new(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, SendInput{IdempotencyKey: "artifact-send"}); err != nil {
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
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/artifact/sig.png",
		SHA256:    strings.Repeat("a", 64),
		ValueText: "Signer",
	}); err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}
	if _, err := signingSvc.UpsertFieldValue(ctx, scope, token, SignerFieldValueInput{
		FieldID:   textField.ID,
		ValueText: "Approved",
	}); err != nil {
		t.Fatalf("UpsertFieldValue: %v", err)
	}
	submit, err := signingSvc.Submit(ctx, scope, token, SignerSubmitInput{IdempotencyKey: "artifact-submit"})
	if err != nil {
		t.Fatalf("Submit: %v", err)
	}
	if submit.Agreement.Status != stores.AgreementStatusCompleted {
		t.Fatalf("expected completed agreement, got %+v", submit.Agreement)
	}
	return ctx, scope, submit.Agreement
}

func TestArtifactPipelineGenerateExecutedRendersAndUploadsOutsideWriteTx(t *testing.T) {
	store := newTxAwareArtifactStore()
	ctx, scope, agreement := seedCompletedAgreementForArtifacts(t, store)
	renderer := &txAwareArtifactRenderer{
		t:        t,
		store:    store,
		delegate: NewDeterministicArtifactRenderer(),
	}
	objectStore := newRecordingArtifactObjectStore(t, func() bool { return store.txActive })
	svc := NewArtifactPipelineService(store, renderer, WithArtifactObjectStore(objectStore))

	record, err := svc.GenerateExecutedArtifact(ctx, scope, agreement.ID, "corr-executed")
	if err != nil {
		t.Fatalf("GenerateExecutedArtifact: %v", err)
	}
	if record.ExecutedObjectKey == "" || record.ExecutedSHA256 == "" {
		t.Fatalf("expected executed artifact metadata, got %+v", record)
	}
	if renderer.executedCalls != 1 {
		t.Fatalf("expected one executed render call, got %d", renderer.executedCalls)
	}
	if len(objectStore.uploads) != 1 {
		t.Fatalf("expected one executed upload, got %+v", objectStore.uploads)
	}
	if store.withTxCalls == 0 {
		t.Fatal("expected finalize write transaction")
	}
}

func TestArtifactPipelineGenerateCertificateRendersAndUploadsOutsideWriteTx(t *testing.T) {
	store := newTxAwareArtifactStore()
	ctx, scope, agreement := seedCompletedAgreementForArtifacts(t, store)
	renderer := &txAwareArtifactRenderer{
		t:        t,
		store:    store,
		delegate: NewDeterministicArtifactRenderer(),
	}
	objectStore := newRecordingArtifactObjectStore(t, func() bool { return store.txActive })
	svc := NewArtifactPipelineService(store, renderer, WithArtifactObjectStore(objectStore))

	if _, err := svc.GenerateExecutedArtifact(ctx, scope, agreement.ID, "corr-executed"); err != nil {
		t.Fatalf("GenerateExecutedArtifact: %v", err)
	}
	record, err := svc.GenerateCertificateArtifact(ctx, scope, agreement.ID, "corr-certificate")
	if err != nil {
		t.Fatalf("GenerateCertificateArtifact: %v", err)
	}
	if record.CertificateObjectKey == "" || record.CertificateSHA256 == "" {
		t.Fatalf("expected certificate artifact metadata, got %+v", record)
	}
	if renderer.certificateCalls != 1 {
		t.Fatalf("expected one certificate render call, got %d", renderer.certificateCalls)
	}
	if len(objectStore.uploads) != 2 {
		t.Fatalf("expected executed and certificate uploads, got %+v", objectStore.uploads)
	}
}

func TestArtifactPipelineGenerateExecutedFinalizeFailureLeavesMetadataUnchanged(t *testing.T) {
	store := stores.NewInMemoryStore()
	ctx, scope, agreement := seedCompletedAgreementForArtifacts(t, store)

	original, err := store.SaveAgreementArtifacts(ctx, scope, stores.AgreementArtifactRecord{
		AgreementID:       agreement.ID,
		ExecutedObjectKey: "tenant/tenant-1/org/org-1/agreements/original-executed.pdf",
		ExecutedSHA256:    strings.Repeat("a", 64),
		CorrelationID:     "original-corr",
	})
	if err != nil {
		t.Fatalf("SaveAgreementArtifacts original: %v", err)
	}

	renderer := fixedArtifactRenderer{
		executed: RenderedArtifact{
			ObjectKey: "tenant/tenant-1/org/org-1/agreements/conflicting-executed.pdf",
			SHA256:    strings.Repeat("b", 64),
			Payload:   GenerateDeterministicPDF(3),
		},
	}
	objectStore := newRecordingArtifactObjectStore(t, nil)
	svc := NewArtifactPipelineService(store, renderer, WithArtifactObjectStore(objectStore))

	if _, err := svc.GenerateExecutedArtifact(ctx, scope, agreement.ID, "corr-conflict"); err == nil {
		t.Fatal("expected immutable artifact finalize failure")
	}
	reloaded, err := store.GetAgreementArtifacts(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("GetAgreementArtifacts: %v", err)
	}
	if reloaded.ExecutedObjectKey != original.ExecutedObjectKey || reloaded.ExecutedSHA256 != original.ExecutedSHA256 {
		t.Fatalf("expected artifact metadata unchanged after finalize failure, got %+v", reloaded)
	}
	if len(objectStore.uploads) != 1 || objectStore.uploads[0] != renderer.executed.ObjectKey {
		t.Fatalf("expected uploaded conflicting blob before finalize failure, got %+v", objectStore.uploads)
	}
	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{SortDesc: false})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	for _, event := range events {
		if event.EventType == "artifact.executed_generated" {
			t.Fatalf("did not expect executed artifact audit after finalize failure: %+v", event)
		}
	}
}

func TestArtifactPipelineGenerateExecutedRetryAfterCommitErrorReusesDeterministicObjectKey(t *testing.T) {
	store := newTxCommitErrorStore()
	ctx, scope, agreement := seedCompletedAgreementForArtifacts(t, store)
	objectStore := newRecordingArtifactObjectStore(t, nil)
	svc := NewArtifactPipelineService(store, NewDeterministicArtifactRenderer(), WithArtifactObjectStore(objectStore))

	commitErr := errors.New("commit sentinel")
	store.err = commitErr
	if _, err := svc.GenerateExecutedArtifact(ctx, scope, agreement.ID, "corr-retry"); !errors.Is(err, commitErr) {
		t.Fatalf("expected commit sentinel, got %v", err)
	}
	first, err := store.GetAgreementArtifacts(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("GetAgreementArtifacts first: %v", err)
	}
	if first.ExecutedObjectKey == "" {
		t.Fatalf("expected executed artifact persisted despite surfaced commit error, got %+v", first)
	}

	store.err = nil
	second, err := svc.GenerateExecutedArtifact(ctx, scope, agreement.ID, "corr-retry")
	if err != nil {
		t.Fatalf("second GenerateExecutedArtifact: %v", err)
	}
	if second.ExecutedObjectKey != first.ExecutedObjectKey {
		t.Fatalf("expected deterministic object key reused on retry, first=%q second=%q", first.ExecutedObjectKey, second.ExecutedObjectKey)
	}
	if len(objectStore.uploads) < 2 {
		t.Fatalf("expected upload retried with same key, got %+v", objectStore.uploads)
	}
	if objectStore.uploads[0] != objectStore.uploads[1] {
		t.Fatalf("expected retry to upload same deterministic key, got %+v", objectStore.uploads)
	}
}
