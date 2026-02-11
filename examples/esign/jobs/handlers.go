package jobs

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	defaultSigningRequestTemplate  = "esign.sign_request_invitation"
	defaultSigningReminderTemplate = "esign.sign_request_reminder"
	completionCCTemplate           = "esign.completed_delivery"
)

type EmailSendInput struct {
	Scope         stores.Scope
	Agreement     stores.AgreementRecord
	Recipient     stores.RecipientRecord
	TemplateCode  string
	Notification  string
	CorrelationID string
	SignURL       string
	CompletionURL string
}

type EmailProvider interface {
	Send(ctx context.Context, input EmailSendInput) (string, error)
}

// DeterministicEmailProvider provides a stable, side-effect-free email provider for tests and local runtime.
type DeterministicEmailProvider struct{}

func (p DeterministicEmailProvider) Send(_ context.Context, input EmailSendInput) (string, error) {
	payload := strings.Join([]string{
		strings.TrimSpace(input.TemplateCode),
		strings.TrimSpace(input.Agreement.ID),
		strings.TrimSpace(input.Recipient.ID),
		strings.TrimSpace(input.Recipient.Email),
		strings.TrimSpace(input.CorrelationID),
		strings.TrimSpace(input.Notification),
		strings.TrimSpace(input.SignURL),
		strings.TrimSpace(input.CompletionURL),
	}, "|")
	sum := sha256.Sum256([]byte(payload))
	return "msg_" + hex.EncodeToString(sum[:8]), nil
}

type TokenService interface {
	Issue(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error)
	Rotate(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error)
}

type GoogleImporter interface {
	ImportDocument(ctx context.Context, scope stores.Scope, input services.GoogleImportInput) (services.GoogleImportResult, error)
}

type RetryPolicy struct {
	BaseDelay   time.Duration
	MaxAttempts int
}

func DefaultRetryPolicy() RetryPolicy {
	return RetryPolicy{
		BaseDelay:   2 * time.Second,
		MaxAttempts: 3,
	}
}

func (p RetryPolicy) resolveMaxAttempts(override int) int {
	if override > 0 {
		return override
	}
	if p.MaxAttempts > 0 {
		return p.MaxAttempts
	}
	return 3
}

func (p RetryPolicy) nextRetry(attempt, maxAttempts int, now time.Time) *time.Time {
	if attempt >= maxAttempts {
		return nil
	}
	base := p.BaseDelay
	if base <= 0 {
		base = 2 * time.Second
	}
	delay := base * time.Duration(1<<(attempt-1))
	next := now.UTC().Add(delay)
	return &next
}

type HandlerDependencies struct {
	Agreements     stores.AgreementStore
	Artifacts      stores.AgreementArtifactStore
	JobRuns        stores.JobRunStore
	EmailLogs      stores.EmailLogStore
	Audits         stores.AuditEventStore
	Tokens         TokenService
	Pipeline       services.ArtifactPipelineService
	EmailProvider  EmailProvider
	GoogleImporter GoogleImporter
	RetryPolicy    RetryPolicy
	Now            func() time.Time
}

type Handlers struct {
	agreements     stores.AgreementStore
	artifacts      stores.AgreementArtifactStore
	jobRuns        stores.JobRunStore
	emailLogs      stores.EmailLogStore
	audits         stores.AuditEventStore
	tokens         TokenService
	pipeline       services.ArtifactPipelineService
	emailProvider  EmailProvider
	googleImporter GoogleImporter
	retryPolicy    RetryPolicy
	now            func() time.Time
}

func NewHandlers(deps HandlerDependencies) Handlers {
	now := deps.Now
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	provider := deps.EmailProvider
	if provider == nil {
		provider = DeterministicEmailProvider{}
	}
	retryPolicy := deps.RetryPolicy
	if retryPolicy.BaseDelay <= 0 {
		retryPolicy.BaseDelay = DefaultRetryPolicy().BaseDelay
	}
	if retryPolicy.MaxAttempts <= 0 {
		retryPolicy.MaxAttempts = DefaultRetryPolicy().MaxAttempts
	}
	return Handlers{
		agreements:     deps.Agreements,
		artifacts:      deps.Artifacts,
		jobRuns:        deps.JobRuns,
		emailLogs:      deps.EmailLogs,
		audits:         deps.Audits,
		tokens:         deps.Tokens,
		pipeline:       deps.Pipeline,
		emailProvider:  provider,
		googleImporter: deps.GoogleImporter,
		retryPolicy:    retryPolicy,
		now:            now,
	}
}

func (h Handlers) ExecuteEmailSendSigningRequest(ctx context.Context, msg EmailSendSigningRequestMsg) error {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.AgreementID, msg.RecipientID, JobEmailSendSigningRequest)
	if h.agreements == nil || h.jobRuns == nil || h.emailLogs == nil {
		err := fmt.Errorf("email job dependencies not configured")
		observability.LogOperation(ctx, slog.LevelError, "job", "email_send_signing_request", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"job_name": JobEmailSendSigningRequest,
		})
		return err
	}
	notification := resolveNotificationType(msg.Notification, msg.TemplateCode)
	templateCode := resolveTemplateCode(msg.TemplateCode, notification)
	isCompletionNotification := notification == string(services.NotificationCompletionPackage)
	dedupeKey := strings.TrimSpace(msg.DedupeKey)
	if dedupeKey == "" {
		dedupeKey = strings.Join([]string{msg.AgreementID, msg.RecipientID, templateCode, notification, strings.TrimSpace(msg.CorrelationID)}, "|")
	}
	now := h.now()
	run, shouldRun, err := h.jobRuns.BeginJobRun(ctx, msg.Scope, stores.JobRunInput{
		JobName:       JobEmailSendSigningRequest,
		DedupeKey:     dedupeKey,
		AgreementID:   msg.AgreementID,
		RecipientID:   msg.RecipientID,
		CorrelationID: correlationID,
		MaxAttempts:   h.retryPolicy.resolveMaxAttempts(msg.MaxAttempts),
		AttemptedAt:   now,
	})
	if err != nil || !shouldRun {
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "job", "email_send_signing_request", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
				"job_name":   JobEmailSendSigningRequest,
				"dedupe_key": dedupeKey,
			})
		}
		return err
	}
	agreement, err := h.agreements.GetAgreement(ctx, msg.Scope, msg.AgreementID)
	if err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{"template_code": templateCode})
	}
	dispatchDelay := time.Duration(0)
	hasDispatchDelay := agreement.SentAt != nil && !agreement.SentAt.IsZero()
	if hasDispatchDelay {
		dispatchDelay = now.Sub(agreement.SentAt.UTC())
	}
	recipient, err := h.findRecipient(ctx, msg.Scope, msg.AgreementID, msg.RecipientID)
	if err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{"template_code": templateCode})
	}

	emailLog, err := h.emailLogs.CreateEmailLog(ctx, msg.Scope, stores.EmailLogRecord{
		AgreementID:   msg.AgreementID,
		RecipientID:   msg.RecipientID,
		TemplateCode:  templateCode,
		Status:        "queued",
		AttemptCount:  run.AttemptCount,
		MaxAttempts:   run.MaxAttempts,
		CorrelationID: run.CorrelationID,
		CreatedAt:     now,
		UpdatedAt:     now,
	})
	if err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{"template_code": templateCode})
	}

	emailInput := EmailSendInput{
		Scope:         msg.Scope,
		Agreement:     agreement,
		Recipient:     recipient,
		TemplateCode:  templateCode,
		Notification:  notification,
		CorrelationID: run.CorrelationID,
	}
	if isSigningNotification(notification) {
		signURL := strings.TrimSpace(msg.SignURL)
		if signURL == "" {
			signURL = buildSignLink(msg.SignerToken)
		}
		if signURL == "" {
			return h.failJob(ctx, msg.Scope, run, fmt.Errorf("missing sign link for signing notification"), msg.AgreementID, map[string]any{
				"template_code": templateCode,
				"notification":  notification,
			})
		}
		emailInput.SignURL = signURL
	}
	if isCompletionNotification {
		completionURL := strings.TrimSpace(msg.CompletionURL)
		completionToken := strings.TrimSpace(msg.SignerToken)
		if completionToken == "" && h.tokens != nil {
			issued, issueErr := h.tokens.Issue(ctx, msg.Scope, msg.AgreementID, msg.RecipientID)
			if issueErr != nil {
				return h.failJob(ctx, msg.Scope, run, issueErr, msg.AgreementID, map[string]any{
					"template_code": templateCode,
					"notification":  notification,
				})
			}
			completionToken = strings.TrimSpace(issued.Token)
		}
		if completionURL == "" {
			completionURL = buildAssetContractLink(completionToken)
		}
		if completionURL == "" {
			return h.failJob(ctx, msg.Scope, run, fmt.Errorf("missing completion delivery link"), msg.AgreementID, map[string]any{
				"template_code": templateCode,
				"notification":  notification,
			})
		}
		emailInput.CompletionURL = completionURL
	}

	providerMessageID, sendErr := h.emailProvider.Send(ctx, emailInput)
	if sendErr != nil {
		if hasDispatchDelay {
			observability.ObserveEmailDispatchStart(ctx, dispatchDelay, false)
		}
		if isCompletionNotification {
			observability.ObserveCompletionDelivery(ctx, false)
		}
		observability.ObserveProviderResult(ctx, "email", false)
		return h.failEmailJob(ctx, msg.Scope, run, emailLog, sendErr, msg.AgreementID, map[string]any{
			"template_code": templateCode,
		})
	}
	if hasDispatchDelay {
		observability.ObserveEmailDispatchStart(ctx, dispatchDelay, true)
	}
	if isCompletionNotification {
		observability.ObserveCompletionDelivery(ctx, true)
	}
	observability.ObserveProviderResult(ctx, "email", true)
	if _, err := h.emailLogs.UpdateEmailLog(ctx, msg.Scope, emailLog.ID, stores.EmailLogRecord{
		Status:            "sent",
		ProviderMessageID: providerMessageID,
		AttemptCount:      run.AttemptCount,
		MaxAttempts:       run.MaxAttempts,
		CorrelationID:     run.CorrelationID,
		SentAt:            &now,
		UpdatedAt:         now,
	}); err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{"template_code": templateCode})
	}
	if _, err := h.jobRuns.MarkJobRunSucceeded(ctx, msg.Scope, run.ID, now); err != nil {
		return err
	}
	observability.ObserveJobResult(ctx, JobEmailSendSigningRequest, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "email_send_signing_request", "success", run.CorrelationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":      JobEmailSendSigningRequest,
		"agreement_id":  strings.TrimSpace(msg.AgreementID),
		"recipient_id":  strings.TrimSpace(msg.RecipientID),
		"template_code": templateCode,
		"notification":  notification,
		"attempt_count": run.AttemptCount,
	})
	return h.appendJobAudit(ctx, msg.Scope, msg.AgreementID, "job.succeeded", map[string]any{
		"job_name":       JobEmailSendSigningRequest,
		"dedupe_key":     dedupeKey,
		"template_code":  templateCode,
		"notification":   notification,
		"attempt_count":  run.AttemptCount,
		"correlation_id": run.CorrelationID,
	})
}

func (h Handlers) ExecutePDFRenderPages(ctx context.Context, msg PDFRenderPagesMsg) error {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.AgreementID, JobPDFRenderPages)
	dedupeKey := strings.TrimSpace(msg.DedupeKey)
	if dedupeKey == "" {
		dedupeKey = strings.TrimSpace(msg.AgreementID)
	}
	run, shouldRun, err := h.jobRuns.BeginJobRun(ctx, msg.Scope, stores.JobRunInput{
		JobName:       JobPDFRenderPages,
		DedupeKey:     dedupeKey,
		AgreementID:   msg.AgreementID,
		CorrelationID: correlationID,
		MaxAttempts:   h.retryPolicy.resolveMaxAttempts(msg.MaxAttempts),
		AttemptedAt:   h.now(),
	})
	if err != nil || !shouldRun {
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "job", "pdf_render_pages", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
				"job_name":   JobPDFRenderPages,
				"dedupe_key": dedupeKey,
			})
		}
		return err
	}
	if err := h.pipeline.RenderPages(ctx, msg.Scope, msg.AgreementID, correlationID); err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, nil)
	}
	if _, err := h.jobRuns.MarkJobRunSucceeded(ctx, msg.Scope, run.ID, h.now()); err != nil {
		return err
	}
	observability.ObserveJobResult(ctx, JobPDFRenderPages, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "pdf_render_pages", "success", run.CorrelationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":      JobPDFRenderPages,
		"dedupe_key":    dedupeKey,
		"agreement_id":  strings.TrimSpace(msg.AgreementID),
		"attempt_count": run.AttemptCount,
	})
	return h.appendJobAudit(ctx, msg.Scope, msg.AgreementID, "job.succeeded", map[string]any{
		"job_name":       JobPDFRenderPages,
		"dedupe_key":     dedupeKey,
		"correlation_id": run.CorrelationID,
	})
}

func (h Handlers) ExecutePDFGenerateExecuted(ctx context.Context, msg PDFGenerateExecutedMsg) error {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.AgreementID, JobPDFGenerateExecuted)
	dedupeKey := strings.TrimSpace(msg.DedupeKey)
	if dedupeKey == "" {
		dedupeKey = strings.TrimSpace(msg.AgreementID)
	}
	run, shouldRun, err := h.jobRuns.BeginJobRun(ctx, msg.Scope, stores.JobRunInput{
		JobName:       JobPDFGenerateExecuted,
		DedupeKey:     dedupeKey,
		AgreementID:   msg.AgreementID,
		CorrelationID: correlationID,
		MaxAttempts:   h.retryPolicy.resolveMaxAttempts(msg.MaxAttempts),
		AttemptedAt:   h.now(),
	})
	if err != nil || !shouldRun {
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "job", "pdf_generate_executed", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
				"job_name":   JobPDFGenerateExecuted,
				"dedupe_key": dedupeKey,
			})
		}
		return err
	}
	if _, err := h.pipeline.GenerateExecutedArtifact(ctx, msg.Scope, msg.AgreementID, correlationID); err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, nil)
	}
	if _, err := h.jobRuns.MarkJobRunSucceeded(ctx, msg.Scope, run.ID, h.now()); err != nil {
		return err
	}
	observability.ObserveJobResult(ctx, JobPDFGenerateExecuted, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "pdf_generate_executed", "success", run.CorrelationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":      JobPDFGenerateExecuted,
		"dedupe_key":    dedupeKey,
		"agreement_id":  strings.TrimSpace(msg.AgreementID),
		"attempt_count": run.AttemptCount,
	})
	return h.appendJobAudit(ctx, msg.Scope, msg.AgreementID, "job.succeeded", map[string]any{
		"job_name":       JobPDFGenerateExecuted,
		"dedupe_key":     dedupeKey,
		"correlation_id": run.CorrelationID,
	})
}

func (h Handlers) ExecutePDFGenerateCertificate(ctx context.Context, msg PDFGenerateCertificateMsg) error {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.AgreementID, JobPDFGenerateCertificate)
	dedupeKey := strings.TrimSpace(msg.DedupeKey)
	if dedupeKey == "" {
		dedupeKey = strings.TrimSpace(msg.AgreementID)
	}
	run, shouldRun, err := h.jobRuns.BeginJobRun(ctx, msg.Scope, stores.JobRunInput{
		JobName:       JobPDFGenerateCertificate,
		DedupeKey:     dedupeKey,
		AgreementID:   msg.AgreementID,
		CorrelationID: correlationID,
		MaxAttempts:   h.retryPolicy.resolveMaxAttempts(msg.MaxAttempts),
		AttemptedAt:   h.now(),
	})
	if err != nil || !shouldRun {
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "job", "pdf_generate_certificate", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
				"job_name":   JobPDFGenerateCertificate,
				"dedupe_key": dedupeKey,
			})
		}
		return err
	}
	if _, err := h.pipeline.GenerateCertificateArtifact(ctx, msg.Scope, msg.AgreementID, correlationID); err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, nil)
	}
	if _, err := h.jobRuns.MarkJobRunSucceeded(ctx, msg.Scope, run.ID, h.now()); err != nil {
		return err
	}
	observability.ObserveJobResult(ctx, JobPDFGenerateCertificate, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "pdf_generate_certificate", "success", run.CorrelationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":      JobPDFGenerateCertificate,
		"dedupe_key":    dedupeKey,
		"agreement_id":  strings.TrimSpace(msg.AgreementID),
		"attempt_count": run.AttemptCount,
	})
	return h.appendJobAudit(ctx, msg.Scope, msg.AgreementID, "job.succeeded", map[string]any{
		"job_name":       JobPDFGenerateCertificate,
		"dedupe_key":     dedupeKey,
		"correlation_id": run.CorrelationID,
	})
}

func (h Handlers) ExecuteTokenRotate(ctx context.Context, msg TokenRotateMsg) error {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.AgreementID, msg.RecipientID, JobTokenRotate)
	if h.tokens == nil || h.jobRuns == nil {
		err := fmt.Errorf("token rotate job dependencies not configured")
		observability.LogOperation(ctx, slog.LevelError, "job", "token_rotate", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"job_name": JobTokenRotate,
		})
		return err
	}
	dedupeKey := strings.TrimSpace(msg.DedupeKey)
	if dedupeKey == "" {
		dedupeKey = strings.Join([]string{msg.AgreementID, msg.RecipientID}, "|")
	}
	run, shouldRun, err := h.jobRuns.BeginJobRun(ctx, msg.Scope, stores.JobRunInput{
		JobName:       JobTokenRotate,
		DedupeKey:     dedupeKey,
		AgreementID:   msg.AgreementID,
		RecipientID:   msg.RecipientID,
		CorrelationID: correlationID,
		MaxAttempts:   h.retryPolicy.resolveMaxAttempts(msg.MaxAttempts),
		AttemptedAt:   h.now(),
	})
	if err != nil || !shouldRun {
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "job", "token_rotate", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
				"job_name":   JobTokenRotate,
				"dedupe_key": dedupeKey,
			})
		}
		return err
	}
	issued, err := h.tokens.Rotate(ctx, msg.Scope, msg.AgreementID, msg.RecipientID)
	if err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, nil)
	}
	if _, err := h.jobRuns.MarkJobRunSucceeded(ctx, msg.Scope, run.ID, h.now()); err != nil {
		return err
	}
	observability.ObserveJobResult(ctx, JobTokenRotate, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "token_rotate", "success", run.CorrelationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":      JobTokenRotate,
		"dedupe_key":    dedupeKey,
		"agreement_id":  strings.TrimSpace(msg.AgreementID),
		"recipient_id":  strings.TrimSpace(msg.RecipientID),
		"attempt_count": run.AttemptCount,
	})
	return h.appendJobAudit(ctx, msg.Scope, msg.AgreementID, "job.succeeded", map[string]any{
		"job_name":       JobTokenRotate,
		"dedupe_key":     dedupeKey,
		"recipient_id":   msg.RecipientID,
		"token_id":       issued.Record.ID,
		"correlation_id": run.CorrelationID,
	})
}

func (h Handlers) ExecuteGoogleDriveImport(ctx context.Context, msg GoogleDriveImportMsg) (services.GoogleImportResult, error) {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.GoogleFileID, msg.UserID, JobGoogleDriveImport)
	if h.googleImporter == nil {
		err := fmt.Errorf("google import dependencies not configured")
		observability.ObserveGoogleImport(ctx, false, "dependencies_not_configured")
		observability.LogOperation(ctx, slog.LevelError, "job", "google_drive_import", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"job_name": JobGoogleDriveImport,
		})
		return services.GoogleImportResult{}, err
	}
	dedupeKey := strings.TrimSpace(msg.DedupeKey)
	if dedupeKey == "" {
		dedupeKey = strings.Join([]string{
			strings.TrimSpace(msg.UserID),
			strings.TrimSpace(msg.GoogleFileID),
		}, "|")
	}
	if h.jobRuns != nil {
		existing, err := h.jobRuns.GetJobRunByDedupe(ctx, msg.Scope, JobGoogleDriveImport, dedupeKey)
		if err == nil && existing.Status == stores.JobRunStatusSucceeded {
			return services.GoogleImportResult{}, nil
		}
	}

	result, err := h.googleImporter.ImportDocument(ctx, msg.Scope, services.GoogleImportInput{
		UserID:          strings.TrimSpace(msg.UserID),
		GoogleFileID:    strings.TrimSpace(msg.GoogleFileID),
		DocumentTitle:   strings.TrimSpace(msg.DocumentTitle),
		AgreementTitle:  strings.TrimSpace(msg.AgreementTitle),
		CreatedByUserID: strings.TrimSpace(msg.CreatedByUserID),
	})
	if err != nil {
		observability.ObserveJobResult(ctx, JobGoogleDriveImport, false)
		observability.LogOperation(ctx, slog.LevelWarn, "job", "google_drive_import", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"job_name":       JobGoogleDriveImport,
			"google_file_id": strings.TrimSpace(msg.GoogleFileID),
		})
		return services.GoogleImportResult{}, err
	}

	if h.jobRuns != nil {
		run, shouldRun, runErr := h.jobRuns.BeginJobRun(ctx, msg.Scope, stores.JobRunInput{
			JobName:       JobGoogleDriveImport,
			DedupeKey:     dedupeKey,
			AgreementID:   result.Agreement.ID,
			CorrelationID: correlationID,
			MaxAttempts:   h.retryPolicy.resolveMaxAttempts(1),
			AttemptedAt:   h.now(),
		})
		if runErr == nil && shouldRun {
			_, _ = h.jobRuns.MarkJobRunSucceeded(ctx, msg.Scope, run.ID, h.now())
		}
	}
	if h.audits != nil {
		_ = h.appendJobAudit(ctx, msg.Scope, result.Agreement.ID, "google.import.completed", map[string]any{
			"job_name":       JobGoogleDriveImport,
			"google_file_id": strings.TrimSpace(msg.GoogleFileID),
			"correlation_id": correlationID,
		})
	}
	observability.ObserveJobResult(ctx, JobGoogleDriveImport, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "google_drive_import", "success", correlationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":       JobGoogleDriveImport,
		"google_file_id": strings.TrimSpace(msg.GoogleFileID),
		"user_id":        strings.TrimSpace(msg.UserID),
	})
	return result, nil
}

// RunCompletionWorkflow executes render/generate/distribution jobs in completion order.
func (h Handlers) RunCompletionWorkflow(ctx context.Context, scope stores.Scope, agreementID, correlationID string) error {
	startedAt := h.now()
	correlationID = observability.ResolveCorrelationID(correlationID, agreementID, "completion_workflow")
	if h.agreements == nil {
		err := fmt.Errorf("completion workflow agreement store not configured")
		observability.ObserveFinalize(ctx, h.now().Sub(startedAt), false)
		observability.LogOperation(ctx, slog.LevelError, "job", "completion_workflow", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
		})
		return err
	}
	agreement, err := h.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		observability.ObserveFinalize(ctx, h.now().Sub(startedAt), false)
		observability.LogOperation(ctx, slog.LevelWarn, "job", "completion_workflow", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
		})
		return err
	}
	if agreement.Status != stores.AgreementStatusCompleted {
		err := fmt.Errorf("completion workflow requires completed agreement")
		observability.ObserveFinalize(ctx, h.now().Sub(startedAt), false)
		observability.LogOperation(ctx, slog.LevelWarn, "job", "completion_workflow", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
		})
		return err
	}
	if err := h.ExecutePDFRenderPages(ctx, PDFRenderPagesMsg{
		Scope:         scope,
		AgreementID:   agreementID,
		CorrelationID: correlationID,
	}); err != nil {
		observability.ObserveFinalize(ctx, h.now().Sub(startedAt), false)
		return err
	}
	if err := h.ExecutePDFGenerateExecuted(ctx, PDFGenerateExecutedMsg{
		Scope:         scope,
		AgreementID:   agreementID,
		CorrelationID: correlationID,
	}); err != nil {
		observability.ObserveFinalize(ctx, h.now().Sub(startedAt), false)
		return err
	}
	if err := h.ExecutePDFGenerateCertificate(ctx, PDFGenerateCertificateMsg{
		Scope:         scope,
		AgreementID:   agreementID,
		CorrelationID: correlationID,
	}); err != nil {
		observability.ObserveFinalize(ctx, h.now().Sub(startedAt), false)
		return err
	}
	recipients, err := h.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		observability.ObserveFinalize(ctx, h.now().Sub(startedAt), false)
		return err
	}
	var firstErr error
	for _, recipient := range recipients {
		if recipient.Role != stores.RecipientRoleCC {
			continue
		}
		err := h.ExecuteEmailSendSigningRequest(ctx, EmailSendSigningRequestMsg{
			Scope:         scope,
			AgreementID:   agreementID,
			RecipientID:   recipient.ID,
			Notification:  string(services.NotificationCompletionPackage),
			TemplateCode:  completionCCTemplate,
			CorrelationID: correlationID,
			DedupeKey:     strings.Join([]string{agreementID, recipient.ID, completionCCTemplate, correlationID}, "|"),
		})
		if err != nil && firstErr == nil {
			firstErr = err
		}
	}
	if firstErr != nil {
		observability.ObserveFinalize(ctx, h.now().Sub(startedAt), false)
		observability.LogOperation(ctx, slog.LevelWarn, "job", "completion_workflow", "error", correlationID, h.now().Sub(startedAt), firstErr, map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
		})
		return firstErr
	}
	observability.ObserveFinalize(ctx, h.now().Sub(startedAt), true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "completion_workflow", "success", correlationID, h.now().Sub(startedAt), nil, map[string]any{
		"agreement_id": strings.TrimSpace(agreementID),
	})
	return nil
}

func (h Handlers) failEmailJob(
	ctx context.Context,
	scope stores.Scope,
	run stores.JobRunRecord,
	log stores.EmailLogRecord,
	cause error,
	agreementID string,
	metadata map[string]any,
) error {
	nextRetry := h.retryPolicy.nextRetry(run.AttemptCount, run.MaxAttempts, h.now())
	status := stores.JobRunStatusFailed
	if nextRetry != nil {
		status = stores.JobRunStatusRetrying
	}
	_, _ = h.emailLogs.UpdateEmailLog(ctx, scope, log.ID, stores.EmailLogRecord{
		Status:        status,
		FailureReason: strings.TrimSpace(cause.Error()),
		AttemptCount:  run.AttemptCount,
		MaxAttempts:   run.MaxAttempts,
		CorrelationID: run.CorrelationID,
		NextRetryAt:   nextRetry,
		UpdatedAt:     h.now(),
	})
	return h.failJob(ctx, scope, run, cause, agreementID, metadata)
}

func (h Handlers) failJob(
	ctx context.Context,
	scope stores.Scope,
	run stores.JobRunRecord,
	cause error,
	agreementID string,
	metadata map[string]any,
) error {
	now := h.now()
	nextRetry := h.retryPolicy.nextRetry(run.AttemptCount, run.MaxAttempts, now)
	if _, err := h.jobRuns.MarkJobRunFailed(ctx, scope, run.ID, cause.Error(), nextRetry, now); err != nil {
		return err
	}
	observability.ObserveJobResult(ctx, run.JobName, false)
	jobMetadata := map[string]any{
		"job_name":       run.JobName,
		"dedupe_key":     run.DedupeKey,
		"attempt_count":  run.AttemptCount,
		"last_error":     strings.TrimSpace(cause.Error()),
		"correlation_id": run.CorrelationID,
	}
	for key, value := range metadata {
		jobMetadata[key] = value
	}
	if nextRetry != nil {
		jobMetadata["next_retry_at"] = nextRetry.UTC().Format(time.RFC3339)
	}
	observability.LogOperation(ctx, slog.LevelWarn, "job", "execution", "error", run.CorrelationID, 0, cause, jobMetadata)
	_ = h.appendJobAudit(ctx, scope, agreementID, "job.failed", jobMetadata)
	return cause
}

func (h Handlers) appendJobAudit(ctx context.Context, scope stores.Scope, agreementID, eventType string, metadata map[string]any) error {
	if h.audits == nil {
		return nil
	}
	payload := metadata
	if payload == nil {
		payload = map[string]any{}
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = h.audits.Append(ctx, scope, stores.AuditEventRecord{
		AgreementID:  strings.TrimSpace(agreementID),
		EventType:    strings.TrimSpace(eventType),
		ActorType:    "system_job",
		MetadataJSON: string(encoded),
		CreatedAt:    h.now(),
	})
	return err
}

func (h Handlers) findRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.RecipientRecord, error) {
	recipients, err := h.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	recipientID = strings.TrimSpace(recipientID)
	for _, recipient := range recipients {
		if strings.TrimSpace(recipient.ID) == recipientID {
			return recipient, nil
		}
	}
	return stores.RecipientRecord{}, fmt.Errorf("recipient not found for agreement")
}

func resolveTemplateCode(templateCode, notification string) string {
	templateCode = strings.TrimSpace(templateCode)
	if templateCode != "" {
		return templateCode
	}
	switch strings.TrimSpace(notification) {
	case string(services.NotificationSigningReminder):
		return defaultSigningReminderTemplate
	case string(services.NotificationCompletionPackage):
		return completionCCTemplate
	default:
		return defaultSigningRequestTemplate
	}
}

func resolveNotificationType(notification, templateCode string) string {
	notification = strings.TrimSpace(notification)
	if notification != "" {
		return notification
	}
	switch strings.TrimSpace(templateCode) {
	case completionCCTemplate:
		return string(services.NotificationCompletionPackage)
	case defaultSigningReminderTemplate:
		return string(services.NotificationSigningReminder)
	case defaultSigningRequestTemplate:
		return string(services.NotificationSigningInvitation)
	default:
		return string(services.NotificationSigningInvitation)
	}
}

func isSigningNotification(notification string) bool {
	switch strings.TrimSpace(notification) {
	case string(services.NotificationSigningInvitation), string(services.NotificationSigningReminder):
		return true
	default:
		return false
	}
}
