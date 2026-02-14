package jobs

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-uploader"
)

func strPtr(v string) *string { return &v }
func intPtr(v int) *int       { return &v }
func boolPtr(v bool) *bool    { return &v }

type flakyEmailProvider struct {
	failures map[string]int
}

func (p *flakyEmailProvider) Send(_ context.Context, input EmailSendInput) (string, error) {
	if p.failures == nil {
		p.failures = map[string]int{}
	}
	key := strings.Join([]string{input.TemplateCode, input.Recipient.ID}, "|")
	if p.failures[key] > 0 {
		p.failures[key]--
		return "", errors.New("provider transient error")
	}
	return "provider-" + input.Recipient.ID, nil
}

type alwaysFailEmailProvider struct{}

func (alwaysFailEmailProvider) Send(context.Context, EmailSendInput) (string, error) {
	return "", errors.New("provider permanent error")
}

type captureTemplateProvider struct {
	inputs []EmailSendInput
}

func (p *captureTemplateProvider) Send(_ context.Context, input EmailSendInput) (string, error) {
	p.inputs = append(p.inputs, input)
	return "provider-" + input.Recipient.ID, nil
}

func samplePDF() []byte {
	return services.GenerateDeterministicPDF(1)
}

func newTestArtifactPipeline(t *testing.T, store *stores.InMemoryStore) services.ArtifactPipelineService {
	t.Helper()
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	return services.NewArtifactPipelineService(store,
		services.NewDeterministicArtifactRenderer(),
		services.WithArtifactObjectStore(objectStore),
	)
}

func setupCompletedAgreement(t *testing.T) (context.Context, stores.Scope, *stores.InMemoryStore, stores.AgreementRecord, stores.RecipientRecord, stores.RecipientRecord) {
	t.Helper()
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := services.NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:     "Agreement Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		PDF:       samplePDF(),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Pipeline Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        strPtr("signer@example.com"),
		Name:         strPtr("Signer One"),
		Role:         strPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	cc, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        strPtr("cc@example.com"),
		Name:         strPtr("CC One"),
		Role:         strPtr(stores.RecipientRoleCC),
		SigningOrder: intPtr(2),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft cc: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        strPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        strPtr(stores.FieldTypeText),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft text: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "phase5-send"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingSvc := services.NewSigningService(store)
	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: signer.ID,
	}
	if _, err := signingSvc.CaptureConsent(ctx, scope, token, services.SignerConsentInput{Accepted: true}); err != nil {
		t.Fatalf("CaptureConsent: %v", err)
	}
	if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, services.SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "typed",
		ObjectKey: "tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-1.png",
		SHA256:    strings.Repeat("a", 64),
		ValueText: "Signer One",
	}); err != nil {
		t.Fatalf("AttachSignatureArtifact: %v", err)
	}
	if _, err := signingSvc.UpsertFieldValue(ctx, scope, token, services.SignerFieldValueInput{
		FieldID:   textField.ID,
		ValueText: "Approved",
	}); err != nil {
		t.Fatalf("UpsertFieldValue: %v", err)
	}
	submit, err := signingSvc.Submit(ctx, scope, token, services.SignerSubmitInput{IdempotencyKey: "phase5-submit"})
	if err != nil {
		t.Fatalf("Submit: %v", err)
	}
	if !submit.Completed || submit.Agreement.Status != stores.AgreementStatusCompleted {
		t.Fatalf("expected completed agreement, got %+v", submit)
	}
	return ctx, scope, store, submit.Agreement, signer, cc
}

func TestHandlersExecuteArtifactJobsWithDedupe(t *testing.T) {
	ctx, scope, store, agreement, _, _ := setupCompletedAgreement(t)
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	pipeline := services.NewArtifactPipelineService(store,
		services.NewDeterministicArtifactRenderer(),
		services.WithArtifactObjectStore(objectStore),
	)
	handlers := NewHandlers(HandlerDependencies{
		Agreements: store,
		Artifacts:  store,
		JobRuns:    store,
		EmailLogs:  store,
		Audits:     store,
		Pipeline:   pipeline,
	})

	if err := handlers.ExecutePDFRenderPages(ctx, PDFRenderPagesMsg{Scope: scope, AgreementID: agreement.ID, CorrelationID: "corr-a"}); err != nil {
		t.Fatalf("ExecutePDFRenderPages: %v", err)
	}
	if err := handlers.ExecutePDFGenerateExecuted(ctx, PDFGenerateExecutedMsg{Scope: scope, AgreementID: agreement.ID, CorrelationID: "corr-a"}); err != nil {
		t.Fatalf("ExecutePDFGenerateExecuted: %v", err)
	}
	if err := handlers.ExecutePDFGenerateCertificate(ctx, PDFGenerateCertificateMsg{Scope: scope, AgreementID: agreement.ID, CorrelationID: "corr-a"}); err != nil {
		t.Fatalf("ExecutePDFGenerateCertificate: %v", err)
	}
	artifacts, err := store.GetAgreementArtifacts(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("GetAgreementArtifacts: %v", err)
	}
	if artifacts.ExecutedObjectKey == "" || artifacts.ExecutedSHA256 == "" {
		t.Fatalf("expected executed artifact persisted, got %+v", artifacts)
	}
	if artifacts.CertificateObjectKey == "" || artifacts.CertificateSHA256 == "" {
		t.Fatalf("expected certificate artifact persisted, got %+v", artifacts)
	}
	executedBlob, err := objectStore.GetFile(ctx, artifacts.ExecutedObjectKey)
	if err != nil || len(executedBlob) == 0 {
		t.Fatalf("expected executed artifact blob in object store, err=%v", err)
	}
	if !strings.HasPrefix(string(executedBlob), "%PDF-") {
		t.Fatalf("expected executed artifact blob to be PDF payload")
	}
	certificateBlob, err := objectStore.GetFile(ctx, artifacts.CertificateObjectKey)
	if err != nil || len(certificateBlob) == 0 {
		t.Fatalf("expected certificate artifact blob in object store, err=%v", err)
	}
	if !strings.HasPrefix(string(certificateBlob), "%PDF-") {
		t.Fatalf("expected certificate artifact blob to be PDF payload")
	}

	if err := handlers.ExecutePDFGenerateExecuted(ctx, PDFGenerateExecutedMsg{
		Scope:         scope,
		AgreementID:   agreement.ID,
		CorrelationID: "corr-a",
		DedupeKey:     agreement.ID,
	}); err != nil {
		t.Fatalf("ExecutePDFGenerateExecuted dedupe replay: %v", err)
	}
	jobRun, err := store.GetJobRunByDedupe(ctx, scope, JobPDFGenerateExecuted, agreement.ID)
	if err != nil {
		t.Fatalf("GetJobRunByDedupe: %v", err)
	}
	if jobRun.Status != stores.JobRunStatusSucceeded || jobRun.AttemptCount != 1 {
		t.Fatalf("expected deduped succeeded run with 1 attempt, got %+v", jobRun)
	}
}

func TestHandlersRetryEmailAndExposeStatus(t *testing.T) {
	ctx, scope, store, agreement, signer, _ := setupCompletedAgreement(t)
	pipeline := newTestArtifactPipeline(t, store)
	currentTime := time.Date(2026, 2, 10, 12, 0, 0, 0, time.UTC)
	provider := &flakyEmailProvider{
		failures: map[string]int{defaultSigningRequestTemplate + "|" + signer.ID: 1},
	}
	handlers := NewHandlers(HandlerDependencies{
		Agreements:    store,
		Artifacts:     store,
		JobRuns:       store,
		EmailLogs:     store,
		Audits:        store,
		Pipeline:      pipeline,
		EmailProvider: provider,
		RetryPolicy: RetryPolicy{
			BaseDelay:   time.Second,
			MaxAttempts: 2,
		},
		Now: func() time.Time { return currentTime },
	})

	err := handlers.ExecuteEmailSendSigningRequest(ctx, EmailSendSigningRequestMsg{
		Scope:         scope,
		AgreementID:   agreement.ID,
		RecipientID:   signer.ID,
		CorrelationID: "corr-email",
		SignURL:       "https://example.test/sign/token-retry",
	})
	if err == nil {
		t.Fatal("expected first email attempt to fail")
	}
	detail, err := pipeline.AgreementDeliveryDetail(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("AgreementDeliveryDetail after failure: %v", err)
	}
	if detail.DistributionStatus != services.DeliveryStateRetrying {
		t.Fatalf("expected retrying distribution status, got %q", detail.DistributionStatus)
	}

	currentTime = currentTime.Add(2 * time.Second)
	if err := handlers.ExecuteEmailSendSigningRequest(ctx, EmailSendSigningRequestMsg{
		Scope:         scope,
		AgreementID:   agreement.ID,
		RecipientID:   signer.ID,
		CorrelationID: "corr-email",
		SignURL:       "https://example.test/sign/token-retry",
	}); err != nil {
		t.Fatalf("expected retry send success, got %v", err)
	}
	detail, err = pipeline.AgreementDeliveryDetail(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("AgreementDeliveryDetail after retry success: %v", err)
	}
	if detail.DistributionStatus != services.DeliveryStateSent {
		t.Fatalf("expected sent distribution status, got %q", detail.DistributionStatus)
	}
}

func TestRunCompletionWorkflowDistributesArtifactsToCC(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)
	ctx, scope, store, agreement, _, cc := setupCompletedAgreement(t)
	pipeline := newTestArtifactPipeline(t, store)
	handlers := NewHandlers(HandlerDependencies{
		Agreements: store,
		Artifacts:  store,
		JobRuns:    store,
		EmailLogs:  store,
		Audits:     store,
		Tokens:     stores.NewTokenService(store),
		Pipeline:   pipeline,
	})
	if err := handlers.RunCompletionWorkflow(ctx, scope, agreement.ID, "corr-complete-1"); err != nil {
		t.Fatalf("RunCompletionWorkflow: %v", err)
	}
	logs, err := store.ListEmailLogs(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListEmailLogs: %v", err)
	}
	foundCC := false
	for _, log := range logs {
		if log.RecipientID == cc.ID && log.TemplateCode == completionCCTemplate && log.Status == "sent" {
			foundCC = true
			break
		}
	}
	if !foundCC {
		t.Fatalf("expected sent completion cc email log, got %+v", logs)
	}
	detail, err := pipeline.AgreementDeliveryDetail(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("AgreementDeliveryDetail: %v", err)
	}
	if detail.ExecutedStatus != services.DeliveryStateReady {
		t.Fatalf("expected executed ready status, got %q", detail.ExecutedStatus)
	}
	if detail.CertificateStatus != services.DeliveryStateReady {
		t.Fatalf("expected certificate ready status, got %q", detail.CertificateStatus)
	}
	if detail.DistributionStatus != services.DeliveryStateSent {
		t.Fatalf("expected distribution sent status, got %q", detail.DistributionStatus)
	}
	if len(detail.CorrelationIDs) == 0 || detail.CorrelationIDs[0] == "" {
		t.Fatalf("expected correlation ids propagated, got %+v", detail.CorrelationIDs)
	}
	snapshot := observability.Snapshot()
	if snapshot.FinalizeSuccessTotal != 1 {
		t.Fatalf("expected finalize success metric increment, got %+v", snapshot)
	}
}

func TestRunCompletionWorkflowBuildsScopedCompletionLinks(t *testing.T) {
	ctx, scope, store, agreement, _, cc := setupCompletedAgreement(t)
	pipeline := newTestArtifactPipeline(t, store)
	tokenSvc := stores.NewTokenService(store)
	provider := &captureTemplateProvider{}
	handlers := NewHandlers(HandlerDependencies{
		Agreements:    store,
		Artifacts:     store,
		JobRuns:       store,
		EmailLogs:     store,
		Audits:        store,
		Tokens:        tokenSvc,
		Pipeline:      pipeline,
		EmailProvider: provider,
	})
	if err := handlers.RunCompletionWorkflow(ctx, scope, agreement.ID, "corr-complete-link"); err != nil {
		t.Fatalf("RunCompletionWorkflow: %v", err)
	}
	if len(provider.inputs) == 0 {
		t.Fatal("expected completion email provider input")
	}
	var completionInput EmailSendInput
	found := false
	for _, input := range provider.inputs {
		if input.TemplateCode == completionCCTemplate && input.Recipient.ID == cc.ID {
			completionInput = input
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected completion template input for cc recipient, got %+v", provider.inputs)
	}
	if completionInput.CompletionURL == "" {
		t.Fatal("expected completion URL in completion email payload")
	}
	if !strings.Contains(completionInput.CompletionURL, "/sign/") || !strings.Contains(completionInput.CompletionURL, "/complete") {
		t.Fatalf("expected completion URL to target user-facing completion route, got %q", completionInput.CompletionURL)
	}
	if strings.Contains(completionInput.CompletionURL, "/api/v1/esign/signing/assets/") {
		t.Fatalf("expected completion URL to use user-facing completion route, got %q", completionInput.CompletionURL)
	}
	if strings.Contains(completionInput.CompletionURL, "agreements/") || strings.Contains(completionInput.CompletionURL, "tenant/") {
		t.Fatalf("expected completion URL without raw object key exposure, got %q", completionInput.CompletionURL)
	}

	parsedURL, err := url.Parse(strings.TrimSpace(completionInput.CompletionURL))
	if err != nil {
		t.Fatalf("parse completion URL: %v", err)
	}
	segments := strings.Split(strings.Trim(parsedURL.Path, "/"), "/")
	token := ""
	if len(segments) >= 3 && segments[len(segments)-3] == "sign" && segments[len(segments)-1] == "complete" {
		token = strings.TrimSpace(segments[len(segments)-2])
	}
	if token == "" {
		t.Fatalf("expected tokenized completion URL, got %q", completionInput.CompletionURL)
	}
	record, err := tokenSvc.Validate(ctx, scope, token)
	if err != nil {
		t.Fatalf("Validate completion token: %v", err)
	}
	if record.RecipientID != cc.ID {
		t.Fatalf("expected completion token scoped to cc recipient %q, got %q", cc.ID, record.RecipientID)
	}
}

func TestExecuteTokenRotateJob(t *testing.T) {
	ctx, scope, store, agreement, signer, _ := setupCompletedAgreement(t)
	tokenSvc := stores.NewTokenService(store)
	handlers := NewHandlers(HandlerDependencies{
		Agreements: store,
		Artifacts:  store,
		JobRuns:    store,
		EmailLogs:  store,
		Audits:     store,
		Pipeline:   newTestArtifactPipeline(t, store),
		Tokens:     tokenSvc,
	})
	if err := handlers.ExecuteTokenRotate(ctx, TokenRotateMsg{
		Scope:         scope,
		AgreementID:   agreement.ID,
		RecipientID:   signer.ID,
		CorrelationID: "corr-rotate-1",
	}); err != nil {
		t.Fatalf("ExecuteTokenRotate: %v", err)
	}
	jobRun, err := store.GetJobRunByDedupe(ctx, scope, JobTokenRotate, agreement.ID+"|"+signer.ID)
	if err != nil {
		t.Fatalf("GetJobRunByDedupe token rotate: %v", err)
	}
	if jobRun.Status != stores.JobRunStatusSucceeded {
		t.Fatalf("expected token rotate job success, got %+v", jobRun)
	}
}

func TestExecuteGoogleDriveImportJobPersistsSourceMetadata(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	google := services.NewGoogleIntegrationService(
		store,
		services.NewDeterministicGoogleProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	if _, err := google.Connect(ctx, scope, services.GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "google-import-1",
	}); err != nil {
		t.Fatalf("Connect google integration: %v", err)
	}

	handlers := NewHandlers(HandlerDependencies{
		Agreements:     store,
		Artifacts:      store,
		JobRuns:        store,
		EmailLogs:      store,
		Audits:         store,
		Pipeline:       newTestArtifactPipeline(t, store),
		GoogleImporter: google,
	})
	result, err := handlers.ExecuteGoogleDriveImport(ctx, GoogleDriveImportMsg{
		Scope:          scope,
		UserID:         "ops-user",
		GoogleFileID:   "google-file-1",
		DocumentTitle:  "Imported Google NDA",
		AgreementTitle: "Imported Google NDA Agreement",
		CorrelationID:  "corr-google-import-1",
	})
	if err != nil {
		t.Fatalf("ExecuteGoogleDriveImport: %v", err)
	}
	if result.Document.SourceType != stores.SourceTypeGoogleDrive {
		t.Fatalf("expected source_type google_drive on document, got %q", result.Document.SourceType)
	}
	if result.Agreement.SourceGoogleFileID != "google-file-1" {
		t.Fatalf("expected source_google_file_id on agreement, got %q", result.Agreement.SourceGoogleFileID)
	}

	jobRun, err := store.GetJobRunByDedupe(ctx, scope, JobGoogleDriveImport, "ops-user|google-file-1")
	if err != nil {
		t.Fatalf("GetJobRunByDedupe google import: %v", err)
	}
	if jobRun.Status != stores.JobRunStatusSucceeded {
		t.Fatalf("expected google import job succeeded, got %+v", jobRun)
	}
}

func TestCompletedLifecycleEnforcesImmutabilityAndAppendOnlyAudit(t *testing.T) {
	ctx, scope, store, agreement, _, _ := setupCompletedAgreement(t)
	agreementSvc := services.NewAgreementService(store)

	title := "Mutated Title"
	if _, err := agreementSvc.UpdateDraft(ctx, scope, agreement.ID, stores.AgreementDraftPatch{Title: &title}, agreement.Version); err == nil {
		t.Fatal("expected immutable agreement update rejection after completion")
	} else if textCodeFromError(err) != "AGREEMENT_IMMUTABLE" {
		t.Fatalf("expected AGREEMENT_IMMUTABLE, got %q (%v)", textCodeFromError(err), err)
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	if len(events) == 0 {
		t.Fatal("expected audit events for completed lifecycle")
	}
	eventID := events[0].ID
	if err := store.UpdateAuditEvent(ctx, scope, eventID, stores.AuditEventRecord{}); err == nil {
		t.Fatal("expected append-only audit update rejection")
	} else if textCodeFromError(err) != "AUDIT_EVENTS_APPEND_ONLY" {
		t.Fatalf("expected AUDIT_EVENTS_APPEND_ONLY on update, got %q (%v)", textCodeFromError(err), err)
	}
	if err := store.DeleteAuditEvent(ctx, scope, eventID); err == nil {
		t.Fatal("expected append-only audit delete rejection")
	} else if textCodeFromError(err) != "AUDIT_EVENTS_APPEND_ONLY" {
		t.Fatalf("expected AUDIT_EVENTS_APPEND_ONLY on delete, got %q (%v)", textCodeFromError(err), err)
	}
}

func TestHandlersPermanentEmailFailureTransitionsToTerminalFailed(t *testing.T) {
	ctx, scope, store, agreement, signer, _ := setupCompletedAgreement(t)
	pipeline := newTestArtifactPipeline(t, store)
	currentTime := time.Date(2026, 2, 10, 15, 0, 0, 0, time.UTC)
	handlers := NewHandlers(HandlerDependencies{
		Agreements:    store,
		Artifacts:     store,
		JobRuns:       store,
		EmailLogs:     store,
		Audits:        store,
		Pipeline:      pipeline,
		EmailProvider: alwaysFailEmailProvider{},
		RetryPolicy: RetryPolicy{
			BaseDelay:   time.Second,
			MaxAttempts: 2,
		},
		Now: func() time.Time { return currentTime },
	})

	msg := EmailSendSigningRequestMsg{
		Scope:         scope,
		AgreementID:   agreement.ID,
		RecipientID:   signer.ID,
		CorrelationID: "corr-email-terminal",
		SignURL:       "https://example.test/sign/token-terminal",
	}
	if err := handlers.ExecuteEmailSendSigningRequest(ctx, msg); err == nil {
		t.Fatal("expected first permanent failure to return error")
	}
	currentTime = currentTime.Add(2 * time.Second)
	if err := handlers.ExecuteEmailSendSigningRequest(ctx, msg); err == nil {
		t.Fatal("expected second permanent failure to return error")
	}

	detail, err := pipeline.AgreementDeliveryDetail(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("AgreementDeliveryDetail: %v", err)
	}
	if detail.DistributionStatus != services.DeliveryStateFailed {
		t.Fatalf("expected failed distribution status, got %q", detail.DistributionStatus)
	}

	dedupeKey := strings.Join([]string{
		agreement.ID,
		signer.ID,
		defaultSigningRequestTemplate,
		string(services.NotificationSigningInvitation),
		"corr-email-terminal",
	}, "|")
	jobRun, err := store.GetJobRunByDedupe(ctx, scope, JobEmailSendSigningRequest, dedupeKey)
	if err != nil {
		t.Fatalf("GetJobRunByDedupe email send: %v", err)
	}
	if jobRun.Status != stores.JobRunStatusFailed {
		t.Fatalf("expected terminal failed job status, got %+v", jobRun)
	}
	if jobRun.AttemptCount != 2 {
		t.Fatalf("expected attempt count 2, got %+v", jobRun)
	}

	logs, err := store.ListEmailLogs(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("ListEmailLogs: %v", err)
	}
	if len(logs) == 0 {
		t.Fatal("expected email logs for permanent failures")
	}
	failed := logs[len(logs)-1]
	if failed.Status != stores.JobRunStatusFailed {
		t.Fatalf("expected terminal failed email log status, got %+v", failed)
	}
	if failed.NextRetryAt != nil {
		t.Fatalf("expected no next retry at terminal failure, got %+v", failed)
	}
}

func textCodeFromError(err error) string {
	if err == nil {
		return ""
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) {
		return strings.TrimSpace(coded.TextCode)
	}
	return ""
}
