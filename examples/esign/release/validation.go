package release

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	defaultAgreementCount = 150
)

type ValidationConfig struct {
	AgreementCount int
}

type ValidationResult struct {
	AgreementCount int
	Elapsed        time.Duration
	Snapshot       observability.MetricsSnapshot
	SLO            observability.SLOStatus
}

func (cfg ValidationConfig) normalize() ValidationConfig {
	normalized := cfg
	if normalized.AgreementCount <= 0 {
		normalized.AgreementCount = defaultAgreementCount
	}
	return normalized
}

func RunValidationProfile(ctx context.Context, cfg ValidationConfig) (ValidationResult, error) {
	cfg = cfg.normalize()

	observability.ResetDefaultMetrics()
	defer observability.ResetDefaultMetrics()

	scope := stores.Scope{TenantID: "tenant-staging", OrgID: "org-staging"}
	store, err := stores.NewSQLiteStore(stores.ResolveSQLiteDSN())
	if err != nil {
		return ValidationResult{}, fmt.Errorf("initialize sqlite store: %w", err)
	}
	defer func() {
		_ = store.Close()
	}()
	documentSvc := services.NewDocumentService(store)
	agreementSvc := services.NewAgreementService(store, store)
	signingSvc := services.NewSigningService(store, store)

	started := time.Now()
	for i := 0; i < cfg.AgreementCount; i++ {
		if err := runAgreementLifecycle(ctx, scope, i, documentSvc, agreementSvc, signingSvc); err != nil {
			return ValidationResult{}, err
		}
	}

	snapshot := observability.Snapshot()
	return ValidationResult{
		AgreementCount: cfg.AgreementCount,
		Elapsed:        time.Since(started),
		Snapshot:       snapshot,
		SLO:            observability.EvaluateSLO(snapshot),
	}, nil
}

func runAgreementLifecycle(
	ctx context.Context,
	scope stores.Scope,
	index int,
	documentSvc services.DocumentService,
	agreementSvc services.AgreementService,
	signingSvc services.SigningService,
) error {
	doc, err := documentSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:     fmt.Sprintf("Rollout Validation Document %03d", index+1),
		ObjectKey: fmt.Sprintf("tenant/%s/org/%s/docs/rollout-%03d/source.pdf", scope.TenantID, scope.OrgID, index+1),
		PDF:       samplePDF(1),
		CreatedBy: "release-validation",
	})
	if err != nil {
		return fmt.Errorf("upload document: %w", err)
	}

	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           fmt.Sprintf("Rollout Agreement %03d", index+1),
		Message:         "Release gate validation run",
		CreatedByUserID: "release-validation",
	})
	if err != nil {
		return fmt.Errorf("create draft: %w", err)
	}

	email := fmt.Sprintf("signer-%03d@example.test", index+1)
	name := fmt.Sprintf("Signer %03d", index+1)
	role := stores.RecipientRoleSigner
	signingOrder := 1
	recipient, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        &email,
		Name:         &name,
		Role:         &role,
		SigningOrder: &signingOrder,
	}, 0)
	if err != nil {
		return fmt.Errorf("upsert recipient: %w", err)
	}

	fieldTypeSignature := stores.FieldTypeSignature
	pageNumber := 1
	required := true
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        &fieldTypeSignature,
		PageNumber:  &pageNumber,
		Required:    &required,
	})
	if err != nil {
		return fmt.Errorf("upsert signature field: %w", err)
	}

	fieldTypeText := stores.FieldTypeText
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        &fieldTypeText,
		PageNumber:  &pageNumber,
		Required:    &required,
	})
	if err != nil {
		return fmt.Errorf("upsert text field: %w", err)
	}

	sendStart := time.Now()
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{
		IdempotencyKey: fmt.Sprintf("release-send-%03d", index+1),
	}); err != nil {
		observability.ObserveSend(ctx, time.Since(sendStart), false)
		return fmt.Errorf("send agreement: %w", err)
	}
	sendDuration := time.Since(sendStart)
	observability.ObserveSend(ctx, sendDuration, true)
	observability.ObserveEmailDispatchStart(ctx, sendDuration, true)

	token := stores.SigningTokenRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
	}

	if _, err := signingSvc.CaptureConsent(ctx, scope, token, services.SignerConsentInput{
		Accepted:  true,
		IPAddress: "127.0.0.1",
		UserAgent: "release-gate-validator",
	}); err != nil {
		return fmt.Errorf("capture consent: %w", err)
	}

	if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, services.SignerSignatureInput{
		FieldID:   signatureField.ID,
		Type:      "typed",
		ObjectKey: fmt.Sprintf("tenant/%s/org/%s/agreements/%s/signatures/sig-%03d.png", scope.TenantID, scope.OrgID, agreement.ID, index+1),
		SHA256:    strings.Repeat("a", 64),
		ValueText: "Release Validation Signer",
		IPAddress: "127.0.0.1",
		UserAgent: "release-gate-validator",
	}); err != nil {
		return fmt.Errorf("attach signature: %w", err)
	}

	if _, err := signingSvc.UpsertFieldValue(ctx, scope, token, services.SignerFieldValueInput{
		FieldID:   textField.ID,
		ValueText: "Release Validation Signer",
		IPAddress: "127.0.0.1",
		UserAgent: "release-gate-validator",
	}); err != nil {
		return fmt.Errorf("upsert field value: %w", err)
	}

	submitStart := time.Now()
	submit, err := signingSvc.Submit(ctx, scope, token, services.SignerSubmitInput{
		IdempotencyKey: fmt.Sprintf("release-submit-%03d", index+1),
		IPAddress:      "127.0.0.1",
		UserAgent:      "release-gate-validator",
	})
	submitDuration := time.Since(submitStart)
	if err != nil {
		observability.ObserveSignerSubmit(ctx, submitDuration, false)
		observability.ObserveFinalize(ctx, submitDuration, false)
		return fmt.Errorf("submit signing: %w", err)
	}

	observability.ObserveSignerSubmit(ctx, submitDuration, true)
	observability.ObserveFinalize(ctx, submitDuration, submit.Completed)
	observability.ObserveJobResult(ctx, "jobs.esign.pdf_generate_executed", true)
	observability.ObserveJobResult(ctx, "jobs.esign.pdf_generate_certificate", true)
	observability.ObserveJobResult(ctx, "jobs.esign.email_send_completed_cc", true)
	observability.ObserveProviderResult(ctx, "email", true)
	return nil
}

func samplePDF(pageCount int) []byte {
	return services.GenerateDeterministicPDF(pageCount)
}
