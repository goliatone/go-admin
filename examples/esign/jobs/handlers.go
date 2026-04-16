package jobs

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"maps"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin/guardedeffects"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-uploader"
)

const (
	defaultSigningRequestTemplate  = "esign.sign_request_invitation"
	defaultSigningReminderTemplate = "esign.sign_request_reminder"
	completionCCTemplate           = "esign.completed_delivery"
	reviewInvitationTemplate       = "esign.review_invitation"
)

type EmailSendInput struct {
	Scope         stores.Scope           `json:"scope"`
	Agreement     stores.AgreementRecord `json:"agreement"`
	Recipient     stores.RecipientRecord `json:"recipient"`
	TemplateCode  string                 `json:"template_code"`
	Notification  string                 `json:"notification"`
	CorrelationID string                 `json:"correlation_id"`
	SignURL       string                 `json:"sign_url"`
	ReviewURL     string                 `json:"review_url"`
	CompletionURL string                 `json:"completion_url"`
}

type EmailProvider interface {
	Send(ctx context.Context, input EmailSendInput) (string, error)
}

// DeterministicEmailProvider provides a stable, side-effect-free email provider for tests and local runtime.
type DeterministicEmailProvider struct{}

func (p DeterministicEmailProvider) Send(_ context.Context, input EmailSendInput) (string, error) {
	CaptureRecipientLink(input)
	payload := strings.Join([]string{
		strings.TrimSpace(input.TemplateCode),
		strings.TrimSpace(input.Agreement.ID),
		strings.TrimSpace(input.Recipient.ID),
		strings.TrimSpace(input.Recipient.Email),
		strings.TrimSpace(input.CorrelationID),
		strings.TrimSpace(input.Notification),
		strings.TrimSpace(input.SignURL),
		strings.TrimSpace(input.ReviewURL),
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
	BaseDelay   time.Duration `json:"base_delay"`
	MaxAttempts int           `json:"max_attempts"`
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
	Agreements       stores.AgreementStore                `json:"agreements"`
	Effects          stores.GuardedEffectStore            `json:"effects"`
	Artifacts        stores.AgreementArtifactStore        `json:"artifacts"`
	JobRuns          stores.JobRunStore                   `json:"job_runs"`
	GoogleImportRuns stores.GoogleImportRunStore          `json:"google_import_runs"`
	EmailLogs        stores.EmailLogStore                 `json:"email_logs"`
	Audits           stores.AuditEventStore               `json:"audits"`
	Documents        stores.DocumentStore                 `json:"documents"`
	ObjectStore      uploaderStore                        `json:"object_store"`
	Tokens           TokenService                         `json:"tokens"`
	Pipeline         services.ArtifactPipelineService     `json:"pipeline"`
	PDFService       services.PDFService                  `json:"pdf_service"`
	EmailProvider    EmailProvider                        `json:"email_provider"`
	GoogleImporter   GoogleImporter                       `json:"google_importer"`
	Fingerprints     services.SourceFingerprintService    `json:"fingerprints"`
	Reconciliation   services.SourceReconciliationService `json:"reconciliation"`
	Transactions     stores.TransactionManager            `json:"transactions"`
	RetryPolicy      RetryPolicy                          `json:"retry_policy"`
	Now              func() time.Time                     `json:"now"`
	AgreementChanges AgreementChangeNotifier              `json:"-"`
}

type AgreementChangeNotification struct {
	AgreementID   string         `json:"agreement_id"`
	CorrelationID string         `json:"correlation_id,omitempty"`
	Sections      []string       `json:"sections,omitempty"`
	Status        string         `json:"status,omitempty"`
	Message       string         `json:"message,omitempty"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

type AgreementChangeNotifier func(ctx context.Context, scope stores.Scope, notification AgreementChangeNotification) error

type Handlers struct {
	agreements       stores.AgreementStore
	effects          stores.GuardedEffectStore
	artifacts        stores.AgreementArtifactStore
	jobRuns          stores.JobRunStore
	googleImportRuns stores.GoogleImportRunStore
	emailLogs        stores.EmailLogStore
	audits           stores.AuditEventStore
	documents        stores.DocumentStore
	objectStore      uploaderStore
	tokens           TokenService
	pipeline         services.ArtifactPipelineService
	pdfs             services.PDFService
	emailProvider    EmailProvider
	googleImporter   GoogleImporter
	fingerprints     services.SourceFingerprintService
	reconciliation   services.SourceReconciliationService
	tx               stores.TransactionManager
	retryPolicy      RetryPolicy
	now              func() time.Time
	agreementChanges AgreementChangeNotifier
}

type emailSendSigningRequestExecution struct {
	emailInput        EmailSendInput
	emailLog          stores.EmailLogRecord
	dispatchDelay     time.Duration
	hasDispatchDelay  bool
	providerMessageID string
}

type uploaderStore interface {
	GetFile(ctx context.Context, path string) ([]byte, error)
	UploadFile(ctx context.Context, path string, content []byte, opts ...uploader.UploadOption) (string, error)
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
		agreements:       deps.Agreements,
		effects:          deps.Effects,
		artifacts:        deps.Artifacts,
		jobRuns:          deps.JobRuns,
		googleImportRuns: deps.GoogleImportRuns,
		emailLogs:        deps.EmailLogs,
		audits:           deps.Audits,
		documents:        deps.Documents,
		objectStore:      deps.ObjectStore,
		tokens:           deps.Tokens,
		pipeline:         deps.Pipeline,
		pdfs:             deps.PDFService,
		emailProvider:    provider,
		googleImporter:   deps.GoogleImporter,
		fingerprints:     deps.Fingerprints,
		reconciliation:   deps.Reconciliation,
		tx:               deps.Transactions,
		retryPolicy:      retryPolicy,
		now:              now,
		agreementChanges: deps.AgreementChanges,
	}
}

// ValidateGoogleImportDeps verifies required Google import runtime dependencies.
func (h Handlers) ValidateGoogleImportDeps() error {
	if h.googleImporter == nil {
		return fmt.Errorf("google import dependencies not configured: google importer is required")
	}
	return nil
}

func (h Handlers) ValidateSourceLineageProcessingDeps() error {
	if h.jobRuns == nil {
		return fmt.Errorf("source lineage job dependencies not configured: job runs are required")
	}
	if h.fingerprints == nil {
		return fmt.Errorf("source lineage job dependencies not configured: fingerprint service is required")
	}
	return nil
}

type guardedEffectStoreAdapter struct {
	store stores.GuardedEffectStore
}

func (a guardedEffectStoreAdapter) SaveGuardedEffect(ctx context.Context, scope guardedeffects.Scope, record guardedeffects.Record) (guardedeffects.Record, error) {
	return a.store.SaveGuardedEffect(ctx, stores.Scope{TenantID: scope.TenantID, OrgID: scope.OrgID}, record)
}

func (a guardedEffectStoreAdapter) GetGuardedEffect(ctx context.Context, effectID string) (guardedeffects.Record, error) {
	return a.store.GetGuardedEffect(ctx, effectID)
}

func (a guardedEffectStoreAdapter) GetGuardedEffectByIdempotencyKey(ctx context.Context, scope guardedeffects.Scope, key string) (guardedeffects.Record, error) {
	return a.store.GetGuardedEffectByIdempotencyKey(ctx, stores.Scope{TenantID: scope.TenantID, OrgID: scope.OrgID}, key)
}

type agreementNotificationEffectPayload struct {
	AgreementID         string `json:"agreement_id"`
	ReviewID            string `json:"review_id,omitempty"`
	RecipientID         string `json:"recipient_id,omitempty"`
	ReviewParticipantID string `json:"review_participant_id,omitempty"`
	PendingTokenID      string `json:"pending_token_id,omitempty"`
	Notification        string `json:"notification"`
	FailureAuditEvent   string `json:"failure_audit_event"`
}

type agreementNotificationEffectHandler struct {
	scope      stores.Scope
	agreements stores.AgreementStore
	effects    stores.GuardedEffectStore
	tokens     stores.SigningTokenStore
	audits     stores.AuditEventStore
	now        func() time.Time
	notify     AgreementChangeNotifier
}

func (h agreementNotificationEffectHandler) Finalize(ctx context.Context, effect guardedeffects.Record, _ guardedeffects.DispatchResult) error {
	var payload agreementNotificationEffectPayload
	if err := json.Unmarshal([]byte(effect.PreparePayloadJSON), &payload); err != nil {
		return err
	}
	if h.tokens != nil && strings.TrimSpace(payload.PendingTokenID) != "" {
		tokenSvc := stores.NewTokenService(h.tokens, stores.WithTokenClock(h.now))
		if _, err := tokenSvc.PromotePending(ctx, h.scope, payload.PendingTokenID); err != nil {
			return err
		}
	}
	now := h.now().UTC()
	if h.agreements != nil && h.effects != nil && strings.TrimSpace(payload.AgreementID) != "" {
		if _, _, err := services.ApplyAgreementNotificationSummary(ctx, h.agreements, h.effects, h.scope, payload.AgreementID); err != nil {
			return err
		}
	}
	if h.audits != nil && strings.TrimSpace(payload.AgreementID) != "" {
		metadata, _ := json.Marshal(map[string]any{
			"effect_id":             strings.TrimSpace(effect.EffectID),
			"recipient_id":          strings.TrimSpace(payload.RecipientID),
			"review_participant_id": strings.TrimSpace(payload.ReviewParticipantID),
			"notification":          strings.TrimSpace(payload.Notification),
			"guard_policy":          strings.TrimSpace(effect.GuardPolicy),
			"effect_status":         strings.TrimSpace(effect.Status),
		})
		_, _ = h.audits.Append(ctx, h.scope, stores.AuditEventRecord{
			AgreementID:  strings.TrimSpace(payload.AgreementID),
			EventType:    "agreement.notification_delivered",
			ActorType:    "system_job",
			MetadataJSON: string(metadata),
			CreatedAt:    now,
		})
	}
	notifyAgreementChange(ctx, h.notify, h.scope, AgreementChangeNotification{
		AgreementID:   strings.TrimSpace(payload.AgreementID),
		Sections:      sectionsForNotification(payload.Notification),
		Status:        "completed",
		Message:       "Notification delivered",
		Metadata:      map[string]any{"notification": strings.TrimSpace(payload.Notification), "effect_id": strings.TrimSpace(effect.EffectID)},
		CorrelationID: extractCorrelationIDFromDispatchPayload(effect.DispatchPayloadJSON),
	})
	return nil
}

func (h agreementNotificationEffectHandler) Pending(ctx context.Context, effect guardedeffects.Record, _ guardedeffects.DispatchResult) error {
	var payload agreementNotificationEffectPayload
	if err := json.Unmarshal([]byte(effect.PreparePayloadJSON), &payload); err != nil {
		return err
	}
	if h.agreements != nil && h.effects != nil && strings.TrimSpace(payload.AgreementID) != "" {
		if _, _, err := services.ApplyAgreementNotificationSummary(ctx, h.agreements, h.effects, h.scope, payload.AgreementID); err != nil {
			return err
		}
	}
	notifyAgreementChange(ctx, h.notify, h.scope, AgreementChangeNotification{
		AgreementID:   strings.TrimSpace(payload.AgreementID),
		Sections:      sectionsForNotification(payload.Notification),
		Status:        "accepted",
		Message:       "Notification delivery pending",
		Metadata:      map[string]any{"notification": strings.TrimSpace(payload.Notification), "effect_id": strings.TrimSpace(effect.EffectID)},
		CorrelationID: extractCorrelationIDFromDispatchPayload(effect.DispatchPayloadJSON),
	})
	return nil
}

func (h agreementNotificationEffectHandler) Fail(ctx context.Context, effect guardedeffects.Record, result guardedeffects.DispatchResult, nextRetryAt *time.Time) error {
	var payload agreementNotificationEffectPayload
	if err := json.Unmarshal([]byte(effect.PreparePayloadJSON), &payload); err != nil {
		return err
	}
	if nextRetryAt == nil && h.tokens != nil && strings.TrimSpace(payload.PendingTokenID) != "" {
		tokenSvc := stores.NewTokenService(h.tokens, stores.WithTokenClock(h.now))
		if _, err := tokenSvc.AbortPending(ctx, h.scope, payload.PendingTokenID); err != nil {
			return err
		}
	}
	if h.agreements != nil && h.effects != nil && strings.TrimSpace(payload.AgreementID) != "" {
		if _, _, err := services.ApplyAgreementNotificationSummary(ctx, h.agreements, h.effects, h.scope, payload.AgreementID); err != nil {
			return err
		}
	}
	status := "failed"
	message := "Notification delivery failed"
	metadata := map[string]any{
		"notification": strings.TrimSpace(payload.Notification),
		"effect_id":    strings.TrimSpace(effect.EffectID),
		"last_error":   strings.TrimSpace(result.MetadataJSON),
	}
	if nextRetryAt != nil {
		status = "accepted"
		message = "Notification retry scheduled"
		metadata["retrying"] = true
		metadata["next_retry_at"] = nextRetryAt.UTC().Format(time.RFC3339Nano)
	}
	notifyAgreementChange(ctx, h.notify, h.scope, AgreementChangeNotification{
		AgreementID:   strings.TrimSpace(payload.AgreementID),
		Sections:      sectionsForNotification(payload.Notification),
		Status:        status,
		Message:       message,
		Metadata:      metadata,
		CorrelationID: extractCorrelationIDFromDispatchPayload(effect.DispatchPayloadJSON),
	})
	return nil
}

func notifyAgreementChange(ctx context.Context, notify AgreementChangeNotifier, scope stores.Scope, notification AgreementChangeNotification) {
	if notify == nil {
		return
	}
	notification.AgreementID = strings.TrimSpace(notification.AgreementID)
	if notification.AgreementID == "" {
		return
	}
	if err := notify(ctx, scope, notification); err != nil {
		slog.WarnContext(ctx, "agreement change notification failed",
			"agreement_id", notification.AgreementID,
			"correlation_id", strings.TrimSpace(notification.CorrelationID),
			"error", err,
		)
	}
}

func extractCorrelationIDFromDispatchPayload(raw string) string {
	payload, err := decodeNotificationDispatchPayload(raw)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(payload.CorrelationID)
}

func sectionsForNotification(notification string) []string {
	switch strings.TrimSpace(notification) {
	case string(services.NotificationReviewInvitation):
		return []string{"review_status", "participants", "timeline"}
	case string(services.NotificationCompletionPackage):
		return []string{"delivery", "participants", "artifacts", "timeline"}
	default:
		return []string{"delivery", "participants", "timeline"}
	}
}

func isNotificationEffectTerminal(status string) bool {
	switch guardedeffects.NormalizeStatus(status) {
	case guardedeffects.StatusFinalized, guardedeffects.StatusAborted, guardedeffects.StatusDeadLettered:
		return true
	default:
		return false
	}
}

func decodeNotificationDispatchPayload(raw string) (services.EmailSendAgreementNotificationOutboxPayload, error) {
	var payload services.EmailSendAgreementNotificationOutboxPayload
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return payload, fmt.Errorf("missing guarded effect dispatch payload")
	}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return payload, err
	}
	return payload, nil
}

func notificationDispatchMatchesMessage(msg EmailSendSigningRequestMsg, payload services.EmailSendAgreementNotificationOutboxPayload) bool {
	return strings.TrimSpace(payload.AgreementID) == strings.TrimSpace(msg.AgreementID) &&
		strings.TrimSpace(payload.ReviewID) == strings.TrimSpace(msg.ReviewID) &&
		strings.TrimSpace(payload.RecipientID) == strings.TrimSpace(msg.RecipientID) &&
		strings.TrimSpace(payload.ReviewParticipantID) == strings.TrimSpace(msg.ReviewParticipantID) &&
		strings.TrimSpace(payload.RecipientEmail) == strings.TrimSpace(msg.RecipientEmail) &&
		strings.TrimSpace(payload.RecipientName) == strings.TrimSpace(msg.RecipientName) &&
		strings.TrimSpace(payload.EffectID) == strings.TrimSpace(msg.EffectID) &&
		strings.TrimSpace(payload.Notification) == strings.TrimSpace(msg.Notification) &&
		strings.TrimSpace(payload.SignerToken) == strings.TrimSpace(msg.SignerToken) &&
		strings.TrimSpace(payload.ReviewToken) == strings.TrimSpace(msg.ReviewToken) &&
		strings.TrimSpace(payload.CorrelationID) == strings.TrimSpace(msg.CorrelationID) &&
		strings.TrimSpace(payload.DedupeKey) == strings.TrimSpace(msg.DedupeKey)
}

func notificationSubjectID(msg EmailSendSigningRequestMsg) string {
	if participantID := strings.TrimSpace(msg.ReviewParticipantID); participantID != "" {
		return participantID
	}
	if recipientID := strings.TrimSpace(msg.RecipientID); recipientID != "" {
		return recipientID
	}
	return strings.TrimSpace(msg.RecipientEmail)
}

func (h Handlers) shouldExecuteNotificationEffectDispatch(
	ctx context.Context,
	msg EmailSendSigningRequestMsg,
) (bool, string, error) {
	effectID := strings.TrimSpace(msg.EffectID)
	if effectID == "" || h.effects == nil {
		return true, "", nil
	}
	record, err := h.effects.GetGuardedEffect(ctx, effectID)
	if err != nil {
		return false, "", err
	}
	if isNotificationEffectTerminal(record.Status) {
		return false, "effect_terminal_" + guardedeffects.NormalizeStatus(record.Status), nil
	}
	payload, err := decodeNotificationDispatchPayload(record.DispatchPayloadJSON)
	if err != nil {
		return false, "", err
	}
	if !notificationDispatchMatchesMessage(msg, payload) {
		return false, "stale_effect_dispatch_payload", nil
	}
	return true, "", nil
}

func resolveEmailSendSigningRequestDedupeKey(
	msg EmailSendSigningRequestMsg,
	notification, templateCode string,
) string {
	dedupeKey := strings.TrimSpace(msg.DedupeKey)
	if dedupeKey != "" {
		return dedupeKey
	}
	return strings.Join([]string{
		msg.AgreementID,
		notificationSubjectID(msg),
		templateCode,
		notification,
		strings.TrimSpace(msg.CorrelationID),
	}, "|")
}

func (h Handlers) beginEmailSendSigningRequestRun(
	ctx context.Context,
	msg EmailSendSigningRequestMsg,
	correlationID, dedupeKey string,
	attemptedAt, startedAt time.Time,
) (stores.JobRunRecord, bool, error) {
	run, shouldRun, err := h.jobRuns.BeginJobRun(ctx, msg.Scope, stores.JobRunInput{
		JobName:       JobEmailSendSigningRequest,
		DedupeKey:     dedupeKey,
		AgreementID:   msg.AgreementID,
		RecipientID:   msg.RecipientID,
		CorrelationID: correlationID,
		MaxAttempts:   h.retryPolicy.resolveMaxAttempts(msg.MaxAttempts),
		AttemptedAt:   attemptedAt,
	})
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "job", "email_send_signing_request", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"job_name":   JobEmailSendSigningRequest,
			"dedupe_key": dedupeKey,
		})
	}
	return run, shouldRun, err
}

func (h Handlers) markSkippedEmailSendSigningRequest(
	ctx context.Context,
	msg EmailSendSigningRequestMsg,
	run stores.JobRunRecord,
	notification, templateCode, dedupeKey, skipReason string,
	startedAt time.Time,
) error {
	now := h.now()
	if _, err := h.jobRuns.MarkJobRunSucceeded(ctx, msg.Scope, run.ID, now); err != nil {
		return err
	}
	observability.ObserveJobResult(ctx, JobEmailSendSigningRequest, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "email_send_signing_request", "success", run.CorrelationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":              JobEmailSendSigningRequest,
		"agreement_id":          strings.TrimSpace(msg.AgreementID),
		"recipient_id":          strings.TrimSpace(msg.RecipientID),
		"review_participant_id": strings.TrimSpace(msg.ReviewParticipantID),
		"effect_id":             strings.TrimSpace(msg.EffectID),
		"skip_reason":           strings.TrimSpace(skipReason),
		"attempt_count":         run.AttemptCount,
	})
	return h.appendJobAudit(ctx, msg.Scope, msg.AgreementID, "job.skipped", map[string]any{
		"job_name":              JobEmailSendSigningRequest,
		"agreement_id":          strings.TrimSpace(msg.AgreementID),
		"recipient_id":          strings.TrimSpace(msg.RecipientID),
		"review_participant_id": strings.TrimSpace(msg.ReviewParticipantID),
		"effect_id":             strings.TrimSpace(msg.EffectID),
		"notification":          strings.TrimSpace(notification),
		"template_code":         strings.TrimSpace(templateCode),
		"correlation_id":        strings.TrimSpace(run.CorrelationID),
		"dedupe_key":            strings.TrimSpace(dedupeKey),
		"skip_reason":           strings.TrimSpace(skipReason),
		"attempt_count":         run.AttemptCount,
	})
}

func (h Handlers) completeEmailSendSigningRequest(
	ctx context.Context,
	msg EmailSendSigningRequestMsg,
	run stores.JobRunRecord,
	execution emailSendSigningRequestExecution,
	notification, templateCode, dedupeKey string,
	isCompletionNotification bool,
	startedAt time.Time,
) error {
	now := h.now()
	if _, err := h.emailLogs.UpdateEmailLog(ctx, msg.Scope, execution.emailLog.ID, stores.EmailLogRecord{
		Status:            "sent",
		ProviderMessageID: execution.providerMessageID,
		AttemptCount:      run.AttemptCount,
		MaxAttempts:       run.MaxAttempts,
		CorrelationID:     run.CorrelationID,
		SentAt:            &now,
		UpdatedAt:         now,
	}); err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{"template_code": templateCode})
	}
	if err := h.finalizeNotificationEffect(ctx, msg.Scope, strings.TrimSpace(msg.EffectID), run, execution.providerMessageID); err != nil {
		return err
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
	if strings.TrimSpace(msg.EffectID) == "" {
		notifyAgreementChange(ctx, h.agreementChanges, msg.Scope, AgreementChangeNotification{
			AgreementID:   strings.TrimSpace(msg.AgreementID),
			CorrelationID: strings.TrimSpace(run.CorrelationID),
			Sections:      sectionsForNotification(notification),
			Status:        "completed",
			Message:       "Notification sent",
			Metadata: map[string]any{
				"job_name":            JobEmailSendSigningRequest,
				"notification":        strings.TrimSpace(notification),
				"template_code":       strings.TrimSpace(templateCode),
				"provider_message_id": strings.TrimSpace(execution.providerMessageID),
				"recipient_id":        strings.TrimSpace(msg.RecipientID),
				"participant_id":      strings.TrimSpace(msg.ReviewParticipantID),
			},
		})
	}
	return h.appendJobAudit(ctx, msg.Scope, msg.AgreementID, "job.succeeded", map[string]any{
		"job_name":       JobEmailSendSigningRequest,
		"dedupe_key":     dedupeKey,
		"template_code":  templateCode,
		"notification":   notification,
		"attempt_count":  run.AttemptCount,
		"correlation_id": run.CorrelationID,
	})
}

func (h Handlers) ExecuteEmailSendSigningRequest(ctx context.Context, msg EmailSendSigningRequestMsg) error {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.AgreementID, notificationSubjectID(msg), JobEmailSendSigningRequest)
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
	isReviewNotification := notification == string(services.NotificationReviewInvitation)
	dedupeKey := resolveEmailSendSigningRequestDedupeKey(msg, notification, templateCode)
	now := h.now()
	run, shouldRun, err := h.beginEmailSendSigningRequestRun(ctx, msg, correlationID, dedupeKey, now, startedAt)
	if err != nil || !shouldRun {
		return err
	}
	shouldDispatch, skipReason, err := h.shouldExecuteNotificationEffectDispatch(ctx, msg)
	if err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{
			"notification": strings.TrimSpace(msg.Notification),
		})
	}
	if !shouldDispatch {
		return h.markSkippedEmailSendSigningRequest(ctx, msg, run, notification, templateCode, dedupeKey, skipReason, startedAt)
	}
	execution, err := h.prepareEmailSendSigningRequest(ctx, msg, run, now, notification, templateCode, isReviewNotification, isCompletionNotification)
	if err != nil {
		return err
	}
	if err := h.sendEmailSendSigningRequest(ctx, msg, run, notification, templateCode, isCompletionNotification, &execution); err != nil {
		return err
	}
	return h.completeEmailSendSigningRequest(ctx, msg, run, execution, notification, templateCode, dedupeKey, isCompletionNotification, startedAt)
}

func (h Handlers) prepareEmailSendSigningRequest(
	ctx context.Context,
	msg EmailSendSigningRequestMsg,
	run stores.JobRunRecord,
	now time.Time,
	notification string,
	templateCode string,
	isReviewNotification bool,
	isCompletionNotification bool,
) (emailSendSigningRequestExecution, error) {
	agreement, err := h.agreements.GetAgreement(ctx, msg.Scope, msg.AgreementID)
	if err != nil {
		return emailSendSigningRequestExecution{}, h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{"template_code": templateCode})
	}
	dispatchDelay := time.Duration(0)
	hasDispatchDelay := agreement.SentAt != nil && !agreement.SentAt.IsZero()
	if hasDispatchDelay {
		dispatchDelay = now.Sub(agreement.SentAt.UTC())
	}
	recipient, err := h.resolveNotificationRecipient(ctx, msg.Scope, msg)
	if err != nil {
		return emailSendSigningRequestExecution{}, h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{"template_code": templateCode})
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
		return emailSendSigningRequestExecution{}, h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{"template_code": templateCode})
	}
	execution := emailSendSigningRequestExecution{
		emailInput: EmailSendInput{
			Scope:         msg.Scope,
			Agreement:     agreement,
			Recipient:     recipient,
			TemplateCode:  templateCode,
			Notification:  notification,
			CorrelationID: run.CorrelationID,
		},
		emailLog:         emailLog,
		dispatchDelay:    dispatchDelay,
		hasDispatchDelay: hasDispatchDelay,
	}
	if err := h.populateNotificationURLs(ctx, msg, run, notification, templateCode, isReviewNotification, isCompletionNotification, &execution.emailInput); err != nil {
		return emailSendSigningRequestExecution{}, err
	}
	return execution, nil
}

func (h Handlers) sendEmailSendSigningRequest(
	ctx context.Context,
	msg EmailSendSigningRequestMsg,
	run stores.JobRunRecord,
	notification string,
	templateCode string,
	isCompletionNotification bool,
	execution *emailSendSigningRequestExecution,
) error {
	if execution == nil {
		return nil
	}
	if err := h.markNotificationEffectDispatching(ctx, msg.Scope, strings.TrimSpace(msg.EffectID), run); err != nil {
		return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{"template_code": templateCode})
	}
	notifyAgreementChange(ctx, h.agreementChanges, msg.Scope, AgreementChangeNotification{
		AgreementID:   strings.TrimSpace(msg.AgreementID),
		CorrelationID: strings.TrimSpace(run.CorrelationID),
		Sections:      sectionsForNotification(notification),
		Status:        "accepted",
		Message:       "Notification dispatching",
		Metadata: map[string]any{
			"job_name":       JobEmailSendSigningRequest,
			"notification":   strings.TrimSpace(notification),
			"template_code":  strings.TrimSpace(templateCode),
			"effect_id":      strings.TrimSpace(msg.EffectID),
			"recipient_id":   strings.TrimSpace(msg.RecipientID),
			"participant_id": strings.TrimSpace(msg.ReviewParticipantID),
		},
	})
	providerMessageID, err := h.emailProvider.Send(ctx, execution.emailInput)
	if err != nil {
		observeEmailSendAttempt(ctx, execution.hasDispatchDelay, execution.dispatchDelay, isCompletionNotification, false)
		return h.failEmailJob(ctx, msg.Scope, run, execution.emailLog, strings.TrimSpace(msg.EffectID), err, msg.AgreementID, map[string]any{
			"template_code": templateCode,
		})
	}
	observeEmailSendAttempt(ctx, execution.hasDispatchDelay, execution.dispatchDelay, isCompletionNotification, true)
	execution.providerMessageID = providerMessageID
	return nil
}

func (h Handlers) populateNotificationURLs(
	ctx context.Context,
	msg EmailSendSigningRequestMsg,
	run stores.JobRunRecord,
	notification string,
	templateCode string,
	isReviewNotification bool,
	isCompletionNotification bool,
	emailInput *EmailSendInput,
) error {
	if emailInput == nil {
		return nil
	}
	if isSigningNotification(notification) {
		signURL, err := h.resolveSigningNotificationURL(ctx, msg)
		if err != nil {
			return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{
				"template_code": templateCode,
				"notification":  notification,
			})
		}
		emailInput.SignURL = signURL
	}
	if isReviewNotification {
		reviewURL := resolveReviewNotificationURL(msg)
		if reviewURL == "" {
			return h.failJob(ctx, msg.Scope, run, fmt.Errorf("missing review link for review notification"), msg.AgreementID, map[string]any{
				"template_code": templateCode,
				"notification":  notification,
			})
		}
		emailInput.ReviewURL = reviewURL
	}
	if isCompletionNotification {
		completionURL, err := h.resolveCompletionNotificationURL(ctx, msg)
		if err != nil {
			return h.failJob(ctx, msg.Scope, run, err, msg.AgreementID, map[string]any{
				"template_code": templateCode,
				"notification":  notification,
			})
		}
		emailInput.CompletionURL = completionURL
	}
	return nil
}

func (h Handlers) resolveSigningNotificationURL(ctx context.Context, msg EmailSendSigningRequestMsg) (string, error) {
	signURL := strings.TrimSpace(msg.SignURL)
	if signURL != "" {
		return signURL, nil
	}
	signerToken, err := h.issueEmailSignerToken(ctx, msg)
	if err != nil {
		return "", err
	}
	signURL = buildSignLink(signerToken)
	if signURL == "" {
		return "", fmt.Errorf("missing sign link for signing notification")
	}
	return signURL, nil
}

func resolveReviewNotificationURL(msg EmailSendSigningRequestMsg) string {
	reviewURL := strings.TrimSpace(msg.ReviewURL)
	if reviewURL != "" {
		return reviewURL
	}
	return buildReviewLink(strings.TrimSpace(msg.ReviewToken))
}

func (h Handlers) resolveCompletionNotificationURL(ctx context.Context, msg EmailSendSigningRequestMsg) (string, error) {
	completionURL := strings.TrimSpace(msg.CompletionURL)
	if completionURL != "" {
		return completionURL, nil
	}
	completionToken, err := h.issueEmailSignerToken(ctx, msg)
	if err != nil {
		return "", err
	}
	completionURL = buildCompletionLink(completionToken)
	if completionURL == "" {
		return "", fmt.Errorf("missing completion delivery link")
	}
	return completionURL, nil
}

func (h Handlers) issueEmailSignerToken(ctx context.Context, msg EmailSendSigningRequestMsg) (string, error) {
	existing := strings.TrimSpace(msg.SignerToken)
	if existing != "" {
		return existing, nil
	}
	if h.tokens == nil {
		return "", nil
	}
	issued, err := h.tokens.Issue(ctx, msg.Scope, msg.AgreementID, msg.RecipientID)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(issued.Token), nil
}

func observeEmailSendAttempt(
	ctx context.Context,
	hasDispatchDelay bool,
	dispatchDelay time.Duration,
	isCompletionNotification bool,
	succeeded bool,
) {
	if hasDispatchDelay {
		observability.ObserveEmailDispatchStart(ctx, dispatchDelay, succeeded)
	}
	if isCompletionNotification {
		observability.ObserveCompletionDelivery(ctx, succeeded)
	}
	observability.ObserveProviderResult(ctx, "email", succeeded)
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
	return h.executePDFArtifactGeneration(ctx, pdfArtifactGenerationInput{
		scope:         msg.Scope,
		agreementID:   msg.AgreementID,
		correlationID: msg.CorrelationID,
		dedupeKey:     msg.DedupeKey,
		maxAttempts:   msg.MaxAttempts,
		jobName:       JobPDFGenerateExecuted,
		operation:     "pdf_generate_executed",
		artifactType:  "executed",
		message:       "Executed artifact generated",
		generate:      h.pipeline.GenerateExecutedArtifact,
	})
}

func (h Handlers) ExecutePDFGenerateCertificate(ctx context.Context, msg PDFGenerateCertificateMsg) error {
	return h.executePDFArtifactGeneration(ctx, pdfArtifactGenerationInput{
		scope:         msg.Scope,
		agreementID:   msg.AgreementID,
		correlationID: msg.CorrelationID,
		dedupeKey:     msg.DedupeKey,
		maxAttempts:   msg.MaxAttempts,
		jobName:       JobPDFGenerateCertificate,
		operation:     "pdf_generate_certificate",
		artifactType:  "certificate",
		message:       "Certificate artifact generated",
		generate:      h.pipeline.GenerateCertificateArtifact,
	})
}

type pdfArtifactGenerationInput struct {
	scope         stores.Scope
	agreementID   string
	correlationID string
	dedupeKey     string
	maxAttempts   int
	jobName       string
	operation     string
	artifactType  string
	message       string
	generate      func(context.Context, stores.Scope, string, string) (stores.AgreementArtifactRecord, error)
}

func (h Handlers) executePDFArtifactGeneration(ctx context.Context, input pdfArtifactGenerationInput) error {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(input.correlationID, input.dedupeKey, input.agreementID, input.jobName)
	dedupeKey := strings.TrimSpace(input.dedupeKey)
	if dedupeKey == "" {
		dedupeKey = strings.TrimSpace(input.agreementID)
	}
	run, shouldRun, err := h.jobRuns.BeginJobRun(ctx, input.scope, stores.JobRunInput{
		JobName:       input.jobName,
		DedupeKey:     dedupeKey,
		AgreementID:   input.agreementID,
		CorrelationID: correlationID,
		MaxAttempts:   h.retryPolicy.resolveMaxAttempts(input.maxAttempts),
		AttemptedAt:   h.now(),
	})
	if err != nil || !shouldRun {
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "job", input.operation, "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
				"job_name":   input.jobName,
				"dedupe_key": dedupeKey,
			})
		}
		return err
	}
	if _, err := input.generate(ctx, input.scope, input.agreementID, correlationID); err != nil {
		return h.failJob(ctx, input.scope, run, err, input.agreementID, nil)
	}
	if _, err := h.jobRuns.MarkJobRunSucceeded(ctx, input.scope, run.ID, h.now()); err != nil {
		return err
	}
	observability.ObserveJobResult(ctx, input.jobName, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", input.operation, "success", run.CorrelationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":      input.jobName,
		"dedupe_key":    dedupeKey,
		"agreement_id":  strings.TrimSpace(input.agreementID),
		"attempt_count": run.AttemptCount,
	})
	notifyAgreementChange(ctx, h.agreementChanges, input.scope, AgreementChangeNotification{
		AgreementID:   strings.TrimSpace(input.agreementID),
		CorrelationID: strings.TrimSpace(run.CorrelationID),
		Sections:      []string{"delivery", "artifacts", "timeline"},
		Status:        "completed",
		Message:       input.message,
		Metadata:      map[string]any{"job_name": input.jobName, "artifact_type": input.artifactType},
	})
	return h.appendJobAudit(ctx, input.scope, input.agreementID, "job.succeeded", map[string]any{
		"job_name":       input.jobName,
		"dedupe_key":     dedupeKey,
		"correlation_id": run.CorrelationID,
	})
}

func (h Handlers) ExecutePDFBackfillDocuments(ctx context.Context, msg PDFBackfillDocumentsMsg) error {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.Scope.TenantID, msg.Scope.OrgID, JobPDFBackfillDocuments)
	if h.documents == nil || h.objectStore == nil || h.jobRuns == nil {
		err := fmt.Errorf("pdf backfill job dependencies not configured")
		observability.LogOperation(ctx, slog.LevelError, "job", "pdf_backfill_documents", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"job_name": JobPDFBackfillDocuments,
		})
		return err
	}

	dedupeKey := strings.TrimSpace(msg.DedupeKey)
	if dedupeKey == "" {
		dedupeKey = strings.Join([]string{
			msg.Scope.TenantID,
			msg.Scope.OrgID,
			fmt.Sprintf("dry_run=%t", msg.DryRun),
			fmt.Sprintf("allow_partial_failure=%t", msg.AllowPartialFailure),
			fmt.Sprintf("limit=%d", msg.Limit),
			fmt.Sprintf("offset=%d", msg.Offset),
		}, "|")
	}
	run, shouldRun, err := h.jobRuns.BeginJobRun(ctx, msg.Scope, stores.JobRunInput{
		JobName:       JobPDFBackfillDocuments,
		DedupeKey:     dedupeKey,
		CorrelationID: correlationID,
		MaxAttempts:   h.retryPolicy.resolveMaxAttempts(msg.MaxAttempts),
		AttemptedAt:   h.now(),
	})
	if err != nil || !shouldRun {
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "job", "pdf_backfill_documents", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
				"job_name":   JobPDFBackfillDocuments,
				"dedupe_key": dedupeKey,
			})
		}
		return err
	}

	backfill := services.NewPDFBackfillService(
		h.documents,
		h.objectStore,
		services.WithPDFBackfillPDFService(h.pdfs),
	)
	result, err := backfill.Run(ctx, msg.Scope, services.PDFBackfillInput{
		DryRun: msg.DryRun,
		Limit:  msg.Limit,
		Offset: msg.Offset,
	})
	if err != nil {
		return h.failJob(ctx, msg.Scope, run, err, "", map[string]any{
			"job_name": JobPDFBackfillDocuments,
		})
	}
	if result.Failed > 0 && !msg.AllowPartialFailure {
		return h.failJob(ctx, msg.Scope, run, fmt.Errorf("pdf backfill failed for %d documents", result.Failed), "", map[string]any{
			"job_name":    JobPDFBackfillDocuments,
			"scanned":     result.Scanned,
			"updated":     result.Updated,
			"skipped":     result.Skipped,
			"failed":      result.Failed,
			"failure_set": result.Failures,
		})
	}
	if _, err := h.jobRuns.MarkJobRunSucceeded(ctx, msg.Scope, run.ID, h.now()); err != nil {
		return err
	}
	observability.ObserveJobResult(ctx, JobPDFBackfillDocuments, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "pdf_backfill_documents", "success", run.CorrelationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":      JobPDFBackfillDocuments,
		"dedupe_key":    dedupeKey,
		"attempt_count": run.AttemptCount,
		"scanned":       result.Scanned,
		"updated":       result.Updated,
		"skipped":       result.Skipped,
		"failed":        result.Failed,
		"dry_run":       msg.DryRun,
	})
	return nil
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
	return h.performGoogleDriveImport(ctx, msg, true)
}

func (h Handlers) HandleGoogleDriveImportJob(ctx context.Context, scope stores.Scope, run stores.JobRunRecord) error {
	msg := GoogleDriveImportMsg{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(run.PayloadJSON)), &msg); err != nil {
		return err
	}
	msg.Scope = scope
	if strings.TrimSpace(msg.CorrelationID) == "" {
		msg.CorrelationID = strings.TrimSpace(run.CorrelationID)
	}
	if strings.TrimSpace(msg.DedupeKey) == "" {
		msg.DedupeKey = strings.TrimSpace(run.DedupeKey)
	}
	_, err := h.performGoogleDriveImport(ctx, msg, false)
	return err
}

func (h Handlers) performGoogleDriveImport(ctx context.Context, msg GoogleDriveImportMsg, trackAgreementJob bool) (services.GoogleImportResult, error) {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.GoogleFileID, msg.UserID, msg.GoogleAccountID, JobGoogleDriveImport)
	if h.googleImporter == nil {
		err := fmt.Errorf("google import dependencies not configured")
		importRunID := strings.TrimSpace(msg.ImportRunID)
		if h.googleImportRuns != nil && importRunID != "" {
			_, _ = h.googleImportRuns.MarkGoogleImportRunFailed(ctx, msg.Scope, importRunID, stores.GoogleImportRunFailureInput{
				ErrorCode:    string(services.ErrorCodeGoogleProviderDegraded),
				ErrorMessage: err.Error(),
				CompletedAt:  h.now(),
			})
		}
		observability.ObserveGoogleImport(ctx, false, "dependencies_not_configured")
		observability.LogOperation(ctx, slog.LevelError, "job", "google_drive_import", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"job_name": JobGoogleDriveImport,
		})
		return services.GoogleImportResult{}, err
	}
	dedupeKey := strings.TrimSpace(msg.DedupeKey)
	if dedupeKey == "" {
		parts := []string{
			strings.TrimSpace(msg.UserID),
			strings.TrimSpace(msg.GoogleFileID),
			strings.TrimSpace(msg.SourceVersionHint),
		}
		if accountID := strings.TrimSpace(msg.GoogleAccountID); accountID != "" {
			parts = append(parts, accountID)
		}
		dedupeKey = strings.Join(parts, "|")
	}

	importRunID := strings.TrimSpace(msg.ImportRunID)
	if replay, replayed, replayErr := h.loadCompletedGoogleImportResult(ctx, msg.Scope, importRunID); replayErr != nil {
		return services.GoogleImportResult{}, replayErr
	} else if replayed {
		observability.LogOperation(ctx, slog.LevelInfo, "job", "google_drive_import", "replay", correlationID, h.now().Sub(startedAt), nil, map[string]any{
			"job_name":       JobGoogleDriveImport,
			"import_run_id":  importRunID,
			"google_file_id": strings.TrimSpace(msg.GoogleFileID),
		})
		return replay, nil
	}
	h.markGoogleImportRunRunning(ctx, msg.Scope, importRunID, correlationID, startedAt)

	result, err := h.googleImporter.ImportDocument(ctx, msg.Scope, services.GoogleImportInput{
		ImportRunID:       importRunID,
		UserID:            strings.TrimSpace(msg.UserID),
		AccountID:         strings.TrimSpace(msg.GoogleAccountID),
		GoogleFileID:      strings.TrimSpace(msg.GoogleFileID),
		SourceVersionHint: strings.TrimSpace(msg.SourceVersionHint),
		DocumentTitle:     strings.TrimSpace(msg.DocumentTitle),
		AgreementTitle:    strings.TrimSpace(msg.AgreementTitle),
		CreatedByUserID:   strings.TrimSpace(msg.CreatedByUserID),
		CorrelationID:     correlationID,
		IdempotencyKey:    dedupeKey,
	})
	if err != nil {
		h.failGoogleDriveImport(ctx, msg.Scope, importRunID, correlationID, startedAt, strings.TrimSpace(msg.GoogleFileID), err)
		return services.GoogleImportResult{}, err
	}

	h.markGoogleImportRunSucceeded(ctx, msg.Scope, importRunID, result)
	h.trackGoogleImportAgreementJob(ctx, msg.Scope, trackAgreementJob, dedupeKey, correlationID, result)
	if h.audits != nil && strings.TrimSpace(result.Agreement.ID) != "" {
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
		"account_id":     strings.TrimSpace(msg.GoogleAccountID),
	})
	return result, nil
}

func (h Handlers) markGoogleImportRunRunning(
	ctx context.Context,
	scope stores.Scope,
	importRunID string,
	correlationID string,
	startedAt time.Time,
) {
	if h.googleImportRuns == nil || importRunID == "" {
		return
	}
	if _, err := h.googleImportRuns.MarkGoogleImportRunRunning(ctx, scope, importRunID, h.now()); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "job", "google_drive_import", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"job_name":      JobGoogleDriveImport,
			"import_run_id": importRunID,
		})
	}
}

func (h Handlers) failGoogleDriveImport(
	ctx context.Context,
	scope stores.Scope,
	importRunID string,
	correlationID string,
	startedAt time.Time,
	googleFileID string,
	err error,
) {
	if h.googleImportRuns != nil && importRunID != "" {
		code, message, details := googleImportFailureDetails(err)
		_, _ = h.googleImportRuns.MarkGoogleImportRunFailed(ctx, scope, importRunID, stores.GoogleImportRunFailureInput{
			ErrorCode:        code,
			ErrorMessage:     message,
			ErrorDetailsJSON: details,
			CompletedAt:      h.now(),
		})
	}
	observability.ObserveJobResult(ctx, JobGoogleDriveImport, false)
	observability.LogOperation(ctx, slog.LevelWarn, "job", "google_drive_import", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
		"job_name":       JobGoogleDriveImport,
		"google_file_id": googleFileID,
	})
}

func (h Handlers) markGoogleImportRunSucceeded(
	ctx context.Context,
	scope stores.Scope,
	importRunID string,
	result services.GoogleImportResult,
) {
	if h.googleImportRuns == nil || importRunID == "" {
		return
	}
	candidateStatusJSON := "[]"
	if encoded, err := json.Marshal(result.CandidateStatus); err == nil {
		candidateStatusJSON = string(encoded)
	}
	_, _ = h.googleImportRuns.MarkGoogleImportRunSucceeded(ctx, scope, importRunID, stores.GoogleImportRunSuccessInput{
		DocumentID:          strings.TrimSpace(result.Document.ID),
		AgreementID:         strings.TrimSpace(result.Agreement.ID),
		SourceDocumentID:    strings.TrimSpace(result.SourceDocumentID),
		SourceRevisionID:    strings.TrimSpace(result.SourceRevisionID),
		SourceArtifactID:    strings.TrimSpace(result.SourceArtifactID),
		LineageStatus:       strings.TrimSpace(result.LineageStatus),
		FingerprintStatus:   strings.TrimSpace(result.FingerprintStatus.Status),
		CandidateStatusJSON: candidateStatusJSON,
		DocumentDetailURL:   strings.TrimSpace(result.DocumentDetailURL),
		AgreementDetailURL:  strings.TrimSpace(result.AgreementDetailURL),
		SourceMimeType:      strings.TrimSpace(result.SourceMimeType),
		IngestionMode:       strings.TrimSpace(result.IngestionMode),
		CompletedAt:         h.now(),
	})
}

func (h Handlers) trackGoogleImportAgreementJob(
	ctx context.Context,
	scope stores.Scope,
	trackAgreementJob bool,
	dedupeKey string,
	correlationID string,
	result services.GoogleImportResult,
) {
	if !trackAgreementJob || h.jobRuns == nil || strings.TrimSpace(result.Agreement.ID) == "" {
		return
	}
	run, shouldRun, err := h.jobRuns.BeginJobRun(ctx, scope, stores.JobRunInput{
		JobName:       JobGoogleDriveImport,
		DedupeKey:     dedupeKey,
		AgreementID:   result.Agreement.ID,
		CorrelationID: correlationID,
		MaxAttempts:   h.retryPolicy.resolveMaxAttempts(1),
		AttemptedAt:   h.now(),
	})
	if err == nil && shouldRun {
		_, _ = h.jobRuns.MarkJobRunSucceeded(ctx, scope, run.ID, h.now())
	}
}

func (h Handlers) ExecuteSourceLineageProcessing(ctx context.Context, msg SourceLineageProcessingMsg) (services.SourceFingerprintBuildResult, services.SourceReconciliationResult, error) {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.SourceRevisionID, msg.ArtifactID, JobSourceLineageProcessing)
	if err := h.ValidateSourceLineageProcessingDeps(); err != nil {
		observability.LogOperation(ctx, slog.LevelError, "job", "source_lineage_processing", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"job_name": JobSourceLineageProcessing,
		})
		return services.SourceFingerprintBuildResult{}, services.SourceReconciliationResult{}, err
	}
	dedupeKey := strings.TrimSpace(msg.DedupeKey)
	if dedupeKey == "" {
		dedupeKey = strings.Join([]string{
			strings.TrimSpace(msg.ImportRunID),
			strings.TrimSpace(msg.SourceDocumentID),
			strings.TrimSpace(msg.SourceRevisionID),
			strings.TrimSpace(msg.ArtifactID),
			stores.SourceExtractVersionPDFTextV1,
		}, "|")
	}
	run, shouldRun, err := h.jobRuns.BeginJobRun(ctx, msg.Scope, stores.JobRunInput{
		JobName:       JobSourceLineageProcessing,
		DedupeKey:     dedupeKey,
		CorrelationID: correlationID,
		MaxAttempts:   h.retryPolicy.resolveMaxAttempts(msg.MaxAttempts),
		AttemptedAt:   h.now(),
	})
	if err != nil || !shouldRun {
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "job", "source_lineage_processing", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
				"job_name":   JobSourceLineageProcessing,
				"dedupe_key": dedupeKey,
			})
		}
		return services.SourceFingerprintBuildResult{}, services.SourceReconciliationResult{}, err
	}
	fingerprint, reconciliationResult, err := h.performSourceLineageProcessing(ctx, msg, run)
	if err != nil {
		return services.SourceFingerprintBuildResult{}, services.SourceReconciliationResult{}, h.failJob(ctx, msg.Scope, run, err, "", map[string]any{
			"source_document_id": strings.TrimSpace(msg.SourceDocumentID),
			"source_revision_id": strings.TrimSpace(msg.SourceRevisionID),
			"artifact_id":        strings.TrimSpace(msg.ArtifactID),
			"import_run_id":      strings.TrimSpace(msg.ImportRunID),
		})
	}

	if _, err := h.jobRuns.MarkJobRunSucceeded(ctx, msg.Scope, run.ID, h.now()); err != nil {
		return fingerprint, reconciliationResult, err
	}
	observability.ObserveJobResult(ctx, JobSourceLineageProcessing, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "source_lineage_processing", "success", correlationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":           JobSourceLineageProcessing,
		"dedupe_key":         dedupeKey,
		"source_document":    strings.TrimSpace(msg.SourceDocumentID),
		"source_revision":    strings.TrimSpace(msg.SourceRevisionID),
		"artifact_id":        strings.TrimSpace(msg.ArtifactID),
		"fingerprint_status": strings.TrimSpace(fingerprint.Status.Status),
		"candidate_count":    len(reconciliationResult.Candidates),
		"attempt_count":      run.AttemptCount,
	})
	return fingerprint, reconciliationResult, nil
}

func (h Handlers) HandleSourceLineageProcessingJob(ctx context.Context, scope stores.Scope, run stores.JobRunRecord) error {
	msg := SourceLineageProcessingMsg{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(run.PayloadJSON)), &msg); err != nil {
		return err
	}
	msg.Scope = scope
	if strings.TrimSpace(msg.CorrelationID) == "" {
		msg.CorrelationID = strings.TrimSpace(run.CorrelationID)
	}
	if strings.TrimSpace(msg.DedupeKey) == "" {
		msg.DedupeKey = strings.TrimSpace(run.DedupeKey)
	}
	_, _, err := h.performSourceLineageProcessing(ctx, msg, run)
	return err
}

func (h Handlers) performSourceLineageProcessing(ctx context.Context, msg SourceLineageProcessingMsg, run stores.JobRunRecord) (services.SourceFingerprintBuildResult, services.SourceReconciliationResult, error) {
	startedAt := h.now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.DedupeKey, msg.SourceRevisionID, msg.ArtifactID, JobSourceLineageProcessing)
	fingerprint, err := h.fingerprints.BuildFingerprint(ctx, msg.Scope, services.SourceFingerprintBuildInput{
		SourceRevisionID: strings.TrimSpace(msg.SourceRevisionID),
		ArtifactID:       strings.TrimSpace(msg.ArtifactID),
		Metadata:         msg.Metadata,
	})
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "job", "source_lineage_processing", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"job_name":           JobSourceLineageProcessing,
			"source_revision_id": strings.TrimSpace(msg.SourceRevisionID),
			"artifact_id":        strings.TrimSpace(msg.ArtifactID),
		})
		return services.SourceFingerprintBuildResult{}, services.SourceReconciliationResult{}, err
	}

	reconciliationResult := services.SourceReconciliationResult{}
	reconciliationApplied := false
	if h.reconciliation != nil &&
		strings.TrimSpace(msg.SourceDocumentID) != "" &&
		strings.TrimSpace(fingerprint.Status.Status) == services.LineageFingerprintStatusReady {
		reconciliationApplied = true
		reconciliationResult, err = h.reconciliation.EvaluateCandidates(ctx, msg.Scope, services.SourceReconciliationInput{
			SourceDocumentID: strings.TrimSpace(msg.SourceDocumentID),
			SourceRevisionID: strings.TrimSpace(msg.SourceRevisionID),
			ArtifactID:       strings.TrimSpace(msg.ArtifactID),
			ActorID:          strings.TrimSpace(msg.ActorID),
			Metadata:         msg.Metadata,
		})
		if err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "job", "source_lineage_processing", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
				"job_name":           JobSourceLineageProcessing,
				"source_document_id": strings.TrimSpace(msg.SourceDocumentID),
				"source_revision_id": strings.TrimSpace(msg.SourceRevisionID),
				"artifact_id":        strings.TrimSpace(msg.ArtifactID),
			})
			return fingerprint, services.SourceReconciliationResult{}, err
		}
	}

	if h.googleImportRuns != nil && strings.TrimSpace(msg.ImportRunID) != "" {
		if err := h.updateImportRunLineageState(ctx, msg.Scope, msg.ImportRunID, strings.TrimSpace(msg.SourceDocumentID), reconciliationApplied, fingerprint, reconciliationResult); err != nil {
			observability.LogOperation(ctx, slog.LevelWarn, "job", "source_lineage_processing", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
				"job_name":      JobSourceLineageProcessing,
				"import_run_id": strings.TrimSpace(msg.ImportRunID),
			})
			return fingerprint, reconciliationResult, err
		}
	}
	observability.ObserveJobResult(ctx, JobSourceLineageProcessing, true)
	observability.LogOperation(ctx, slog.LevelInfo, "job", "source_lineage_processing", "success", correlationID, h.now().Sub(startedAt), nil, map[string]any{
		"job_name":           JobSourceLineageProcessing,
		"dedupe_key":         strings.TrimSpace(run.DedupeKey),
		"source_document":    strings.TrimSpace(msg.SourceDocumentID),
		"source_revision":    strings.TrimSpace(msg.SourceRevisionID),
		"artifact_id":        strings.TrimSpace(msg.ArtifactID),
		"fingerprint_status": strings.TrimSpace(fingerprint.Status.Status),
		"candidate_count":    len(reconciliationResult.Candidates),
		"attempt_count":      run.AttemptCount,
	})
	return fingerprint, reconciliationResult, nil
}

func (h Handlers) updateImportRunLineageState(
	ctx context.Context,
	scope stores.Scope,
	importRunID string,
	sourceDocumentID string,
	reconciliationApplied bool,
	fingerprint services.SourceFingerprintBuildResult,
	reconciliation services.SourceReconciliationResult,
) error {
	run, err := h.googleImportRuns.GetGoogleImportRun(ctx, scope, strings.TrimSpace(importRunID))
	if err != nil {
		return err
	}
	lineageStatus := strings.TrimSpace(run.LineageStatus)
	candidateStatusJSON := strings.TrimSpace(run.CandidateStatusJSON)
	if candidateStatusJSON == "" {
		candidateStatusJSON = "[]"
	}
	if reconciliationApplied {
		candidateStatusJSON = "[]"
		if encoded, marshalErr := json.Marshal(reconciliation.Candidates); marshalErr == nil {
			candidateStatusJSON = string(encoded)
		}
		if len(reconciliation.Candidates) > 0 {
			lineageStatus = services.LineageImportStatusNeedsReview
		} else if lineageStatus == "" || lineageStatus == services.LineageImportStatusNeedsReview {
			lineageStatus = services.LineageImportStatusLinked
		}
	} else if lineageStatus == "" {
		lineageStatus = services.LineageImportStatusLinked
	}
	_, err = h.googleImportRuns.MarkGoogleImportRunSucceeded(ctx, scope, run.ID, stores.GoogleImportRunSuccessInput{
		DocumentID:          strings.TrimSpace(run.DocumentID),
		AgreementID:         strings.TrimSpace(run.AgreementID),
		SourceDocumentID:    firstNonEmpty(strings.TrimSpace(run.SourceDocumentID), strings.TrimSpace(sourceDocumentID)),
		SourceRevisionID:    firstNonEmpty(strings.TrimSpace(run.SourceRevisionID), strings.TrimSpace(fingerprint.Fingerprint.SourceRevisionID)),
		SourceArtifactID:    firstNonEmpty(strings.TrimSpace(run.SourceArtifactID), strings.TrimSpace(fingerprint.Fingerprint.ArtifactID)),
		LineageStatus:       lineageStatus,
		FingerprintStatus:   strings.TrimSpace(fingerprint.Status.Status),
		CandidateStatusJSON: candidateStatusJSON,
		DocumentDetailURL:   strings.TrimSpace(run.DocumentDetailURL),
		AgreementDetailURL:  strings.TrimSpace(run.AgreementDetailURL),
		SourceMimeType:      strings.TrimSpace(run.SourceMimeType),
		IngestionMode:       strings.TrimSpace(run.IngestionMode),
		CompletedAt:         h.now(),
	})
	return err
}

func (h Handlers) loadCompletedGoogleImportResult(ctx context.Context, scope stores.Scope, importRunID string) (services.GoogleImportResult, bool, error) {
	if h.googleImportRuns == nil || strings.TrimSpace(importRunID) == "" {
		return services.GoogleImportResult{}, false, nil
	}
	run, err := h.googleImportRuns.GetGoogleImportRun(ctx, scope, importRunID)
	if err != nil {
		if jobNotFound(err) {
			return services.GoogleImportResult{}, false, nil
		}
		return services.GoogleImportResult{}, false, err
	}
	if strings.TrimSpace(run.Status) != stores.GoogleImportRunStatusSucceeded {
		return services.GoogleImportResult{}, false, nil
	}

	result := services.GoogleImportResult{
		SourceDocumentID:   strings.TrimSpace(run.SourceDocumentID),
		SourceRevisionID:   strings.TrimSpace(run.SourceRevisionID),
		SourceArtifactID:   strings.TrimSpace(run.SourceArtifactID),
		LineageStatus:      strings.TrimSpace(run.LineageStatus),
		FingerprintStatus:  services.FingerprintStatusSummary{Status: firstNonEmpty(strings.TrimSpace(run.FingerprintStatus), services.LineageFingerprintStatusUnknown), EvidenceAvailable: false},
		DocumentDetailURL:  strings.TrimSpace(run.DocumentDetailURL),
		AgreementDetailURL: strings.TrimSpace(run.AgreementDetailURL),
		SourceMimeType:     strings.TrimSpace(run.SourceMimeType),
		IngestionMode:      strings.TrimSpace(run.IngestionMode),
	}
	if strings.TrimSpace(run.CandidateStatusJSON) != "" {
		_ = json.Unmarshal([]byte(run.CandidateStatusJSON), &result.CandidateStatus)
	}
	if err := h.populateCompletedGoogleImportDocument(ctx, scope, run, &result); err != nil {
		return services.GoogleImportResult{}, false, err
	}
	if err := h.populateCompletedGoogleImportAgreement(ctx, scope, run, &result); err != nil {
		return services.GoogleImportResult{}, false, err
	}
	return result, true, nil
}

func (h Handlers) populateCompletedGoogleImportDocument(
	ctx context.Context,
	scope stores.Scope,
	run stores.GoogleImportRunRecord,
	result *services.GoogleImportResult,
) error {
	if result == nil || h.documents == nil || strings.TrimSpace(run.DocumentID) == "" {
		return nil
	}
	document, err := h.documents.Get(ctx, scope, run.DocumentID)
	if err != nil {
		return err
	}
	result.Document = document
	if result.SourceDocumentID == "" {
		result.SourceDocumentID = strings.TrimSpace(document.SourceDocumentID)
	}
	if result.SourceRevisionID == "" {
		result.SourceRevisionID = strings.TrimSpace(document.SourceRevisionID)
	}
	if result.SourceArtifactID == "" {
		result.SourceArtifactID = strings.TrimSpace(document.SourceArtifactID)
	}
	return nil
}

func (h Handlers) populateCompletedGoogleImportAgreement(
	ctx context.Context,
	scope stores.Scope,
	run stores.GoogleImportRunRecord,
	result *services.GoogleImportResult,
) error {
	if result == nil || h.agreements == nil || strings.TrimSpace(run.AgreementID) == "" {
		return nil
	}
	agreement, err := h.agreements.GetAgreement(ctx, scope, run.AgreementID)
	if err != nil {
		return err
	}
	result.Agreement = agreement
	if result.SourceRevisionID == "" {
		result.SourceRevisionID = strings.TrimSpace(agreement.SourceRevisionID)
	}
	return nil
}

func jobNotFound(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) && coded != nil {
		return coded.Category == goerrors.CategoryNotFound || strings.EqualFold(strings.TrimSpace(coded.TextCode), "NOT_FOUND")
	}
	return false
}

func googleImportFailureDetails(err error) (string, string, string) {
	message := strings.TrimSpace(err.Error())
	if message == "" {
		message = "google import failed"
	}
	var coded *goerrors.Error
	if !errorsAsGoError(err, &coded) || coded == nil {
		return "", message, ""
	}
	details := map[string]any{}
	maps.Copy(details, coded.Metadata)
	if len(details) == 0 {
		return strings.TrimSpace(coded.TextCode), message, ""
	}
	raw, marshalErr := json.Marshal(details)
	if marshalErr != nil {
		return strings.TrimSpace(coded.TextCode), message, ""
	}
	return strings.TrimSpace(coded.TextCode), message, strings.TrimSpace(string(raw))
}

func errorsAsGoError(err error, target **goerrors.Error) bool {
	if err == nil || target == nil {
		return false
	}
	return errors.As(err, target)
}

func logCompletionWorkflowOutcome(
	ctx context.Context,
	startedAt time.Time,
	correlationID, agreementID string,
	level slog.Level,
	status string,
	err error,
) {
	duration := time.Since(startedAt)
	observability.ObserveFinalize(ctx, duration, err == nil)
	observability.LogOperation(ctx, level, "job", "completion_workflow", status, correlationID, duration, err, map[string]any{
		"agreement_id": strings.TrimSpace(agreementID),
	})
}

func (h Handlers) runCompletionArtifactGeneration(ctx context.Context, scope stores.Scope, agreementID, correlationID string) error {
	steps := []func() error{
		func() error {
			return h.ExecutePDFRenderPages(ctx, PDFRenderPagesMsg{
				Scope:         scope,
				AgreementID:   agreementID,
				CorrelationID: correlationID,
			})
		},
		func() error {
			return h.ExecutePDFGenerateExecuted(ctx, PDFGenerateExecutedMsg{
				Scope:         scope,
				AgreementID:   agreementID,
				CorrelationID: correlationID,
			})
		},
		func() error {
			return h.ExecutePDFGenerateCertificate(ctx, PDFGenerateCertificateMsg{
				Scope:         scope,
				AgreementID:   agreementID,
				CorrelationID: correlationID,
			})
		},
	}
	for _, step := range steps {
		if err := step(); err != nil {
			return err
		}
	}
	return nil
}

func (h Handlers) sendCompletionPackageNotifications(
	ctx context.Context,
	scope stores.Scope,
	agreementID, correlationID string,
) error {
	recipients, err := h.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		return err
	}
	var firstErr error
	for _, recipient := range recipients {
		if !recipient.Notify {
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
	return firstErr
}

// RunCompletionWorkflow executes render/generate/distribution jobs in completion order.
func (h Handlers) RunCompletionWorkflow(ctx context.Context, scope stores.Scope, agreementID, correlationID string) error {
	startedAt := h.now()
	correlationID = observability.ResolveCorrelationID(correlationID, agreementID, "completion_workflow")
	if h.agreements == nil {
		err := fmt.Errorf("completion workflow agreement store not configured")
		logCompletionWorkflowOutcome(ctx, startedAt, correlationID, agreementID, slog.LevelError, "error", err)
		return err
	}
	agreement, err := h.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		logCompletionWorkflowOutcome(ctx, startedAt, correlationID, agreementID, slog.LevelWarn, "error", err)
		return err
	}
	if agreement.Status != stores.AgreementStatusCompleted {
		statusErr := fmt.Errorf("completion workflow requires completed agreement")
		logCompletionWorkflowOutcome(ctx, startedAt, correlationID, agreementID, slog.LevelWarn, "error", statusErr)
		return statusErr
	}
	if err := h.runCompletionArtifactGeneration(ctx, scope, agreementID, correlationID); err != nil {
		logCompletionWorkflowOutcome(ctx, startedAt, correlationID, agreementID, slog.LevelWarn, "error", err)
		return err
	}
	if err := h.sendCompletionPackageNotifications(ctx, scope, agreementID, correlationID); err != nil {
		logCompletionWorkflowOutcome(ctx, startedAt, correlationID, agreementID, slog.LevelWarn, "error", err)
		return err
	}
	logCompletionWorkflowOutcome(ctx, startedAt, correlationID, agreementID, slog.LevelInfo, "success", nil)
	return nil
}

// RunStageActivationWorkflow dispatches invitations for signers that became active after stage progression.
func (h Handlers) RunStageActivationWorkflow(ctx context.Context, scope stores.Scope, agreementID string, recipientIDs []string, correlationID string) error {
	startedAt := h.now()
	correlationID = observability.ResolveCorrelationID(correlationID, agreementID, "stage_activation_workflow")
	if h.agreements == nil {
		err := fmt.Errorf("stage activation workflow agreement store not configured")
		observability.LogOperation(ctx, slog.LevelError, "job", "stage_activation_workflow", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
		})
		return err
	}
	agreement, err := h.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "job", "stage_activation_workflow", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
		})
		return err
	}
	switch strings.TrimSpace(agreement.Status) {
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
	default:
		return nil
	}

	targets := stageActivationRecipientTargets(recipientIDs)
	if len(targets) == 0 {
		return nil
	}

	recipients, err := h.agreements.ListRecipients(ctx, scope, agreementID)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "job", "stage_activation_workflow", "error", correlationID, h.now().Sub(startedAt), err, map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
		})
		return err
	}
	firstErr := h.dispatchStageActivationNotifications(ctx, scope, agreementID, correlationID, recipients, targets)
	if firstErr != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "job", "stage_activation_workflow", "error", correlationID, h.now().Sub(startedAt), firstErr, map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
		})
		return firstErr
	}
	observability.LogOperation(ctx, slog.LevelInfo, "job", "stage_activation_workflow", "success", correlationID, h.now().Sub(startedAt), nil, map[string]any{
		"agreement_id": strings.TrimSpace(agreementID),
	})
	return nil
}

func stageActivationRecipientTargets(recipientIDs []string) map[string]struct{} {
	targets := map[string]struct{}{}
	for _, recipientID := range recipientIDs {
		if trimmed := strings.TrimSpace(recipientID); trimmed != "" {
			targets[trimmed] = struct{}{}
		}
	}
	return targets
}

func (h Handlers) dispatchStageActivationNotifications(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	correlationID string,
	recipients []stores.RecipientRecord,
	targets map[string]struct{},
) error {
	var firstErr error
	for _, recipient := range recipients {
		if !shouldDispatchStageActivation(recipient, targets) {
			continue
		}
		err := h.ExecuteEmailSendSigningRequest(ctx, EmailSendSigningRequestMsg{
			Scope:         scope,
			AgreementID:   agreementID,
			RecipientID:   strings.TrimSpace(recipient.ID),
			Notification:  string(services.NotificationSigningInvitation),
			CorrelationID: correlationID,
			DedupeKey: strings.Join([]string{
				agreementID,
				strings.TrimSpace(recipient.ID),
				string(services.NotificationSigningInvitation),
				"stage_activation",
				correlationID,
			}, "|"),
		})
		if err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

func shouldDispatchStageActivation(recipient stores.RecipientRecord, targets map[string]struct{}) bool {
	recipientID := strings.TrimSpace(recipient.ID)
	if _, ok := targets[recipientID]; !ok {
		return false
	}
	if strings.TrimSpace(recipient.Role) != stores.RecipientRoleSigner {
		return false
	}
	return recipient.CompletedAt == nil && recipient.DeclinedAt == nil
}

func (h Handlers) finalizeNotificationEffect(
	ctx context.Context,
	scope stores.Scope,
	effectID string,
	run stores.JobRunRecord,
	providerMessageID string,
) error {
	effectID = strings.TrimSpace(effectID)
	if effectID == "" || h.effects == nil {
		return nil
	}
	complete := func(effectStore stores.GuardedEffectStore, agreementStore stores.AgreementStore, tokenStore stores.SigningTokenStore, audits stores.AuditEventStore) error {
		service := guardedeffects.NewService(guardedEffectStoreAdapter{store: effectStore}, h.now)
		_, err := service.Complete(
			ctx,
			guardedeffects.Scope{TenantID: scope.TenantID, OrgID: scope.OrgID},
			effectID,
			guardedeffects.SMTPAcceptedPolicy{},
			guardedeffects.DispatchResult{
				Outcome:           guardedeffects.OutcomeCompleted,
				DispatchID:        strings.TrimSpace(run.ID),
				ProviderMessageID: strings.TrimSpace(providerMessageID),
				MetadataJSON:      strings.TrimSpace(providerMessageID),
				OccurredAt:        h.now().UTC(),
			},
			nil,
			agreementNotificationEffectHandler{
				scope:      scope,
				agreements: agreementStore,
				effects:    effectStore,
				tokens:     tokenStore,
				audits:     audits,
				now:        h.now,
				notify:     h.agreementChanges,
			},
		)
		return err
	}
	if h.tx != nil {
		return h.tx.WithTx(ctx, func(tx stores.TxStore) error {
			return complete(tx, tx, tx, tx)
		})
	}
	if tokenStore, ok := h.effects.(stores.SigningTokenStore); ok {
		return complete(h.effects, h.agreements, tokenStore, h.audits)
	}
	return nil
}

func (h Handlers) failNotificationEffect(
	ctx context.Context,
	scope stores.Scope,
	effectID string,
	run stores.JobRunRecord,
	cause error,
) error {
	effectID = strings.TrimSpace(effectID)
	if effectID == "" || h.effects == nil {
		return nil
	}
	nextRetry := h.retryPolicy.nextRetry(run.AttemptCount, run.MaxAttempts, h.now())
	fail := func(effectStore stores.GuardedEffectStore, agreementStore stores.AgreementStore, tokenStore stores.SigningTokenStore, audits stores.AuditEventStore) error {
		service := guardedeffects.NewService(guardedEffectStoreAdapter{store: effectStore}, h.now)
		_, err := service.Complete(
			ctx,
			guardedeffects.Scope{TenantID: scope.TenantID, OrgID: scope.OrgID},
			effectID,
			guardedeffects.SMTPAcceptedPolicy{},
			guardedeffects.DispatchResult{
				Outcome:      guardedeffects.OutcomeFailed,
				DispatchID:   strings.TrimSpace(run.ID),
				MetadataJSON: strings.TrimSpace(cause.Error()),
				OccurredAt:   h.now().UTC(),
			},
			nextRetry,
			agreementNotificationEffectHandler{
				scope:      scope,
				agreements: agreementStore,
				effects:    effectStore,
				tokens:     tokenStore,
				audits:     audits,
				now:        h.now,
				notify:     h.agreementChanges,
			},
		)
		return err
	}
	if h.tx != nil {
		return h.tx.WithTx(ctx, func(tx stores.TxStore) error {
			return fail(tx, tx, tx, tx)
		})
	}
	if tokenStore, ok := h.effects.(stores.SigningTokenStore); ok {
		return fail(h.effects, h.agreements, tokenStore, h.audits)
	}
	return nil
}

func (h Handlers) markNotificationEffectDispatching(
	ctx context.Context,
	scope stores.Scope,
	effectID string,
	run stores.JobRunRecord,
) error {
	effectID = strings.TrimSpace(effectID)
	if effectID == "" || h.effects == nil {
		return nil
	}
	mark := func(effectStore stores.GuardedEffectStore) error {
		service := guardedeffects.NewService(guardedEffectStoreAdapter{store: effectStore}, h.now)
		_, err := service.MarkDispatching(
			ctx,
			guardedeffects.Scope{TenantID: scope.TenantID, OrgID: scope.OrgID},
			effectID,
			strings.TrimSpace(run.ID),
		)
		return err
	}
	if h.tx != nil {
		return h.tx.WithTx(ctx, func(tx stores.TxStore) error {
			return mark(tx)
		})
	}
	return mark(h.effects)
}

func (h Handlers) failEmailJob(
	ctx context.Context,
	scope stores.Scope,
	run stores.JobRunRecord,
	log stores.EmailLogRecord,
	effectID string,
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
	_ = h.failNotificationEffect(ctx, scope, effectID, run, cause)
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
	maps.Copy(jobMetadata, metadata)
	if nextRetry != nil {
		jobMetadata["next_retry_at"] = nextRetry.UTC().Format(time.RFC3339)
	}
	notification := strings.TrimSpace(fmt.Sprint(jobMetadata["notification"]))
	sections := sectionsForJob(run.JobName, notification)
	if len(sections) > 0 && strings.TrimSpace(agreementID) != "" {
		if strings.TrimSpace(run.JobName) == JobEmailSendSigningRequest && strings.TrimSpace(fmt.Sprint(jobMetadata["effect_id"])) != "" {
			sections = nil
		}
	}
	if len(sections) > 0 && strings.TrimSpace(agreementID) != "" {
		status := "failed"
		message := "Background job failed"
		if nextRetry != nil {
			status = "accepted"
			message = "Background job retry scheduled"
			jobMetadata["retrying"] = true
		}
		notifyAgreementChange(ctx, h.agreementChanges, scope, AgreementChangeNotification{
			AgreementID:   strings.TrimSpace(agreementID),
			CorrelationID: strings.TrimSpace(run.CorrelationID),
			Sections:      sections,
			Status:        status,
			Message:       message,
			Metadata:      jobMetadata,
		})
	}
	observability.LogOperation(ctx, slog.LevelWarn, "job", "execution", "error", run.CorrelationID, 0, cause, jobMetadata)
	_ = h.appendJobAudit(ctx, scope, agreementID, "job.failed", jobMetadata)
	return cause
}

func sectionsForJob(jobName, notification string) []string {
	switch strings.TrimSpace(jobName) {
	case JobEmailSendSigningRequest:
		return sectionsForNotification(notification)
	case JobPDFGenerateExecuted, JobPDFGenerateCertificate:
		return []string{"delivery", "artifacts", "timeline"}
	default:
		return nil
	}
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

func (h Handlers) resolveNotificationRecipient(ctx context.Context, scope stores.Scope, msg EmailSendSigningRequestMsg) (stores.RecipientRecord, error) {
	if recipient, ok, err := h.resolveDirectNotificationRecipient(ctx, scope, msg); err != nil {
		return stores.RecipientRecord{}, err
	} else if ok {
		return recipient, nil
	}
	if recipient, ok, err := h.resolveReviewParticipantNotificationRecipient(ctx, scope, msg); err != nil {
		return stores.RecipientRecord{}, err
	} else if ok {
		return recipient, nil
	}
	if email := strings.TrimSpace(msg.RecipientEmail); email != "" {
		return stores.RecipientRecord{
			ID:    strings.TrimSpace(notificationSubjectID(msg)),
			Email: email,
			Name:  strings.TrimSpace(msg.RecipientName),
		}, nil
	}
	return stores.RecipientRecord{}, fmt.Errorf("notification recipient not found")
}

func (h Handlers) resolveDirectNotificationRecipient(ctx context.Context, scope stores.Scope, msg EmailSendSigningRequestMsg) (stores.RecipientRecord, bool, error) {
	recipientID := strings.TrimSpace(msg.RecipientID)
	if recipientID == "" {
		return stores.RecipientRecord{}, false, nil
	}
	recipient, err := h.findRecipient(ctx, scope, msg.AgreementID, recipientID)
	if err != nil {
		return stores.RecipientRecord{}, false, nil
	}
	if strings.TrimSpace(msg.RecipientEmail) != "" {
		recipient.Email = strings.TrimSpace(msg.RecipientEmail)
	}
	if strings.TrimSpace(msg.RecipientName) != "" {
		recipient.Name = strings.TrimSpace(msg.RecipientName)
	}
	return recipient, true, nil
}

func (h Handlers) resolveReviewParticipantNotificationRecipient(ctx context.Context, scope stores.Scope, msg EmailSendSigningRequestMsg) (stores.RecipientRecord, bool, error) {
	participantID := strings.TrimSpace(msg.ReviewParticipantID)
	if participantID == "" {
		return stores.RecipientRecord{}, false, nil
	}
	participants, err := h.listNotificationReviewParticipants(ctx, scope, msg)
	if err != nil {
		return stores.RecipientRecord{}, false, err
	}
	for _, participant := range participants {
		if strings.TrimSpace(participant.ID) != participantID {
			continue
		}
		return h.notificationRecipientFromParticipant(ctx, scope, msg, participant)
	}
	return stores.RecipientRecord{}, false, fmt.Errorf("review participant not found for agreement")
}

func (h Handlers) listNotificationReviewParticipants(ctx context.Context, scope stores.Scope, msg EmailSendSigningRequestMsg) ([]stores.AgreementReviewParticipantRecord, error) {
	reviewID := strings.TrimSpace(msg.ReviewID)
	if reviewID == "" {
		review, err := h.agreements.GetAgreementReviewByAgreementID(ctx, scope, msg.AgreementID)
		if err != nil {
			return nil, err
		}
		reviewID = strings.TrimSpace(review.ID)
	}
	return h.agreements.ListAgreementReviewParticipants(ctx, scope, reviewID)
}

func (h Handlers) notificationRecipientFromParticipant(
	ctx context.Context,
	scope stores.Scope,
	msg EmailSendSigningRequestMsg,
	participant stores.AgreementReviewParticipantRecord,
) (stores.RecipientRecord, bool, error) {
	if recipientID := strings.TrimSpace(participant.RecipientID); recipientID != "" {
		recipient, err := h.findRecipient(ctx, scope, msg.AgreementID, recipientID)
		if err != nil {
			return stores.RecipientRecord{}, false, err
		}
		if strings.TrimSpace(participant.Email) != "" {
			recipient.Email = strings.TrimSpace(participant.Email)
		}
		if strings.TrimSpace(participant.DisplayName) != "" {
			recipient.Name = strings.TrimSpace(participant.DisplayName)
		}
		return recipient, true, nil
	}
	return stores.RecipientRecord{
		ID:    strings.TrimSpace(participant.ID),
		Email: strings.TrimSpace(firstNonEmpty(msg.RecipientEmail, participant.Email)),
		Name:  strings.TrimSpace(firstNonEmpty(msg.RecipientName, participant.DisplayName)),
	}, true, nil
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
	case string(services.NotificationReviewInvitation):
		return reviewInvitationTemplate
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
	case reviewInvitationTemplate:
		return string(services.NotificationReviewInvitation)
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

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
