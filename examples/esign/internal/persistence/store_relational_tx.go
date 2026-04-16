package persistence

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin/guardedeffects"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

const relationalDefaultDraftTTL = 7 * 24 * time.Hour

const (
	relationalDefaultReminderLeaseSeconds = 120
	relationalDefaultReminderPolicy       = "r1"
	relationalDefaultOutboxMaxAttempts    = 5
	relationalDefaultOutboxClaimLimit     = 25
	relationalDefaultOutboxClaimLockTTL   = 5 * time.Minute
)

type relationalTxStore struct {
	adapter *StoreAdapter
	tx      bun.Tx
}

type relationalDocumentRemediationLeaseModel struct {
	bun.BaseModel `bun:"table:document_remediation_leases,alias:drl"`
	stores.DocumentRemediationLeaseRecord
}

type relationalRemediationDispatchModel struct {
	bun.BaseModel `bun:"table:remediation_dispatches,alias:rdd"`
	stores.RemediationDispatchRecord
}

type relationalGuardedEffectModel struct {
	bun.BaseModel `bun:"table:guarded_effects,alias:gef"`
	stores.GuardedEffectRecord
}

var _ stores.TxStore = (*relationalTxStore)(nil)

func newRelationalTxStore(adapter *StoreAdapter, tx bun.Tx) *relationalTxStore {
	return &relationalTxStore{adapter: adapter, tx: tx}
}

func normalizeRelationalID(id string) string {
	return strings.TrimSpace(id)
}

func cloneRelationalTimePtr(src *time.Time) *time.Time {
	if src == nil {
		return nil
	}
	out := src.UTC()
	return &out
}

func relationalTimeOrNow(value time.Time) time.Time {
	if value.IsZero() {
		return time.Now().UTC()
	}
	return value.UTC()
}

func relationalIsNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	return errors.As(err, &coded) && coded != nil && coded.Category == goerrors.CategoryNotFound
}

func normalizeRelationalReminderStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "", stores.AgreementReminderStatusActive:
		return stores.AgreementReminderStatusActive
	case stores.AgreementReminderStatusPaused:
		return stores.AgreementReminderStatusPaused
	case stores.AgreementReminderStatusTerminal:
		return stores.AgreementReminderStatusTerminal
	default:
		return ""
	}
}

func normalizeRelationalReminderPolicyVersion(version string) string {
	version = strings.TrimSpace(version)
	if version == "" {
		return relationalDefaultReminderPolicy
	}
	return version
}

func normalizeRelationalReminderReasonCode(reasonCode string) string {
	reason := strings.TrimSpace(strings.ToLower(reasonCode))
	if reason == "" {
		return ""
	}
	for _, ch := range reason {
		if (ch < 'a' || ch > 'z') && (ch < '0' || ch > '9') && ch != '_' {
			return "failed"
		}
	}
	return reason
}

func cloneRelationalReminderStateRecord(record stores.AgreementReminderStateRecord) stores.AgreementReminderStateRecord {
	record.Status = strings.ToLower(strings.TrimSpace(record.Status))
	record.TerminalReason = strings.TrimSpace(record.TerminalReason)
	record.PolicyVersion = strings.TrimSpace(record.PolicyVersion)
	record.LastReasonCode = strings.TrimSpace(record.LastReasonCode)
	record.LastErrorCode = strings.TrimSpace(record.LastErrorCode)
	record.LastErrorInternalEncrypted = strings.TrimSpace(record.LastErrorInternalEncrypted)
	record.SweepID = strings.TrimSpace(record.SweepID)
	record.WorkerID = strings.TrimSpace(record.WorkerID)
	record.FirstSentAt = cloneRelationalTimePtr(record.FirstSentAt)
	record.LastSentAt = cloneRelationalTimePtr(record.LastSentAt)
	record.LastViewedAt = cloneRelationalTimePtr(record.LastViewedAt)
	record.LastManualResendAt = cloneRelationalTimePtr(record.LastManualResendAt)
	record.NextDueAt = cloneRelationalTimePtr(record.NextDueAt)
	record.LastErrorInternalExpiresAt = cloneRelationalTimePtr(record.LastErrorInternalExpiresAt)
	record.ClaimedAt = cloneRelationalTimePtr(record.ClaimedAt)
	record.LastHeartbeatAt = cloneRelationalTimePtr(record.LastHeartbeatAt)
	record.LastEvaluatedAt = cloneRelationalTimePtr(record.LastEvaluatedAt)
	record.LastAttemptedSendAt = cloneRelationalTimePtr(record.LastAttemptedSendAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record
}

func cloneRelationalOutboxMessageRecord(record stores.OutboxMessageRecord) stores.OutboxMessageRecord {
	record.Topic = strings.TrimSpace(record.Topic)
	record.MessageKey = strings.TrimSpace(record.MessageKey)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	record.HeadersJSON = strings.TrimSpace(record.HeadersJSON)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.Status = strings.TrimSpace(record.Status)
	record.LastError = strings.TrimSpace(record.LastError)
	record.LockedAt = cloneRelationalTimePtr(record.LockedAt)
	record.LockedBy = strings.TrimSpace(record.LockedBy)
	record.PublishedAt = cloneRelationalTimePtr(record.PublishedAt)
	if !record.CreatedAt.IsZero() {
		record.CreatedAt = record.CreatedAt.UTC()
	}
	if !record.UpdatedAt.IsZero() {
		record.UpdatedAt = record.UpdatedAt.UTC()
	}
	if !record.AvailableAt.IsZero() {
		record.AvailableAt = record.AvailableAt.UTC()
	}
	return record
}

func reminderLeaseHeartbeat(record stores.AgreementReminderStateRecord) *time.Time {
	if record.LastHeartbeatAt != nil && !record.LastHeartbeatAt.IsZero() {
		return record.LastHeartbeatAt
	}
	if record.ClaimedAt != nil && !record.ClaimedAt.IsZero() {
		return record.ClaimedAt
	}
	return nil
}

func reminderLeaseIsActive(record stores.AgreementReminderStateRecord, now time.Time, leaseSeconds int) bool {
	if strings.TrimSpace(record.WorkerID) == "" || record.LeaseSeq <= 0 {
		return false
	}
	hb := reminderLeaseHeartbeat(record)
	if hb == nil || hb.IsZero() {
		return false
	}
	if leaseSeconds <= 0 {
		leaseSeconds = relationalDefaultReminderLeaseSeconds
	}
	return hb.Add(time.Duration(leaseSeconds) * time.Second).After(now.UTC())
}

func normalizeReminderLeaseToken(token stores.AgreementReminderLeaseToken) stores.AgreementReminderLeaseToken {
	token.WorkerID = strings.TrimSpace(token.WorkerID)
	token.SweepID = strings.TrimSpace(token.SweepID)
	if token.LeaseSeq < 0 {
		token.LeaseSeq = 0
	}
	return token
}

func relationalReminderLeaseConflictError(agreementID, recipientID, workerID string, expectedSeq, actualSeq int64) error {
	return goerrors.New("reminder lease conflict", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("REMINDER_LEASE_CONFLICT").
		WithMetadata(map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
			"recipient_id": strings.TrimSpace(recipientID),
			"worker_id":    strings.TrimSpace(workerID),
			"expected_seq": expectedSeq,
			"actual_seq":   actualSeq,
		})
}

func relationalReminderLeaseLostError(agreementID, recipientID, workerID string) error {
	return goerrors.New("reminder lease lost", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("REMINDER_LEASE_LOST").
		WithMetadata(map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
			"recipient_id": strings.TrimSpace(recipientID),
			"worker_id":    strings.TrimSpace(workerID),
		})
}

func relationalReminderStateInvariantError(field, reason string) error {
	return goerrors.New("reminder state invariant violation", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("REMINDER_STATE_INVARIANT_VIOLATION").
		WithMetadata(map[string]any{
			"field":  strings.TrimSpace(field),
			"reason": strings.TrimSpace(reason),
		})
}

func validateReminderLease(record stores.AgreementReminderStateRecord, token stores.AgreementReminderLeaseToken, asOf time.Time, leaseSeconds int) error {
	token = normalizeReminderLeaseToken(token)
	if token.WorkerID == "" {
		return relationalInvalidRecordError("agreement_reminder_states", "worker_id", "required")
	}
	if token.SweepID == "" {
		return relationalInvalidRecordError("agreement_reminder_states", "sweep_id", "required")
	}
	if token.LeaseSeq <= 0 {
		return relationalInvalidRecordError("agreement_reminder_states", "lease_seq", "required")
	}
	if strings.TrimSpace(record.WorkerID) == "" || record.LeaseSeq <= 0 {
		return relationalReminderLeaseLostError(record.AgreementID, record.RecipientID, token.WorkerID)
	}
	if strings.TrimSpace(record.WorkerID) != token.WorkerID || strings.TrimSpace(record.SweepID) != token.SweepID {
		return relationalReminderLeaseLostError(record.AgreementID, record.RecipientID, token.WorkerID)
	}
	if record.LeaseSeq != token.LeaseSeq {
		return relationalReminderLeaseConflictError(record.AgreementID, record.RecipientID, token.WorkerID, token.LeaseSeq, record.LeaseSeq)
	}
	if !reminderLeaseIsActive(record, asOf.UTC(), leaseSeconds) {
		return relationalReminderLeaseLostError(record.AgreementID, record.RecipientID, token.WorkerID)
	}
	return nil
}

func clearReminderLease(record *stores.AgreementReminderStateRecord) {
	if record == nil {
		return
	}
	record.WorkerID = ""
	record.SweepID = ""
	record.ClaimedAt = nil
	record.LastHeartbeatAt = nil
}

func reminderLeaseTokenFromRecord(record stores.AgreementReminderStateRecord) stores.AgreementReminderLeaseToken {
	return normalizeReminderLeaseToken(stores.AgreementReminderLeaseToken{
		WorkerID: record.WorkerID,
		SweepID:  record.SweepID,
		LeaseSeq: record.LeaseSeq,
	})
}

func reminderLeaseTokenMatchesRecord(record stores.AgreementReminderStateRecord, token stores.AgreementReminderLeaseToken) bool {
	token = normalizeReminderLeaseToken(token)
	current := reminderLeaseTokenFromRecord(record)
	if token.WorkerID == "" || token.SweepID == "" || token.LeaseSeq <= 0 {
		return false
	}
	return current.WorkerID == token.WorkerID && current.SweepID == token.SweepID && current.LeaseSeq == token.LeaseSeq
}

func reminderClaimFromRecord(record stores.AgreementReminderStateRecord) stores.AgreementReminderClaim {
	record = cloneRelationalReminderStateRecord(record)
	return stores.AgreementReminderClaim{
		State: record,
		Lease: stores.AgreementReminderLeaseToken{
			WorkerID: record.WorkerID,
			SweepID:  record.SweepID,
			LeaseSeq: record.LeaseSeq,
		},
	}
}

func loadOutboxMessageRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.OutboxMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.OutboxMessageRecord{}, relationalInvalidRecordError("outbox_messages", "id", "required")
	}
	record := OutboxMessageRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.OutboxMessageRecord{}, mapSQLNotFound(err, "outbox_messages", id)
	}
	return cloneRelationalOutboxMessageRecord(record.Message), nil
}

func updateReminderStateRecord(ctx context.Context, idb bun.IDB, record stores.AgreementReminderStateRecord, expectedUpdatedAt *time.Time) (int64, error) {
	record = cloneRelationalReminderStateRecord(record)
	query := idb.NewUpdate().
		Model(&record).
		Column(
			"id",
			"status",
			"terminal_reason",
			"policy_version",
			"sent_count",
			"first_sent_at",
			"last_sent_at",
			"last_viewed_at",
			"last_manual_resend_at",
			"next_due_at",
			"last_reason_code",
			"last_error_code",
			"last_error_internal_encrypted",
			"last_error_internal_expires_at",
			"lease_seq",
			"claimed_at",
			"last_heartbeat_at",
			"sweep_id",
			"worker_id",
			"last_evaluated_at",
			"last_attempted_send_at",
			"created_at",
			"updated_at",
		).
		Where("tenant_id = ?", strings.TrimSpace(record.TenantID)).
		Where("org_id = ?", strings.TrimSpace(record.OrgID)).
		Where("agreement_id = ?", strings.TrimSpace(record.AgreementID)).
		Where("recipient_id = ?", strings.TrimSpace(record.RecipientID))
	if expectedUpdatedAt != nil && !expectedUpdatedAt.IsZero() {
		query = query.Where("updated_at = ?", expectedUpdatedAt.UTC())
	}
	result, err := query.Exec(ctx)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func normalizeRelationalReminderTarget(scope stores.Scope, agreementID, recipientID string) (stores.Scope, string, string, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.Scope{}, "", "", err
	}
	agreementID = normalizeRelationalID(agreementID)
	recipientID = normalizeRelationalID(recipientID)
	if agreementID == "" {
		return stores.Scope{}, "", "", relationalInvalidRecordError("agreement_reminder_states", "agreement_id", "required")
	}
	if recipientID == "" {
		return stores.Scope{}, "", "", relationalInvalidRecordError("agreement_reminder_states", "recipient_id", "required")
	}
	return scope, agreementID, recipientID, nil
}

func normalizeRelationalReminderMarkInput(input stores.AgreementReminderMarkInput) stores.AgreementReminderMarkInput {
	if input.OccurredAt.IsZero() {
		input.OccurredAt = time.Now().UTC()
	}
	input.OccurredAt = input.OccurredAt.UTC()
	input.Lease = normalizeReminderLeaseToken(input.Lease)
	if input.LeaseSeconds <= 0 {
		input.LeaseSeconds = relationalDefaultReminderLeaseSeconds
	}
	input.NextDueAt = cloneRelationalTimePtr(input.NextDueAt)
	input.ErrorInternalEncrypted = strings.TrimSpace(input.ErrorInternalEncrypted)
	input.ErrorInternalExpiresAt = cloneRelationalTimePtr(input.ErrorInternalExpiresAt)
	return input
}

func (s *relationalTxStore) mutateAgreementReminderState(
	ctx context.Context,
	scope stores.Scope,
	agreementID, recipientID string,
	input stores.AgreementReminderMarkInput,
	mutate func(*stores.AgreementReminderStateRecord, stores.AgreementReminderMarkInput) error,
) (stores.AgreementReminderStateRecord, error) {
	record, err := loadAgreementReminderStateRecord(ctx, s.tx, scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	previousUpdatedAt := record.UpdatedAt
	validateErr := validateReminderLease(record, input.Lease, input.OccurredAt, input.LeaseSeconds)
	if validateErr != nil {
		return stores.AgreementReminderStateRecord{}, validateErr
	}
	mutateErr := mutate(&record, input)
	if mutateErr != nil {
		return stores.AgreementReminderStateRecord{}, mutateErr
	}
	clearReminderLease(&record)
	record.UpdatedAt = input.OccurredAt
	rows, err := updateReminderStateRecord(ctx, s.tx, record, &previousUpdatedAt)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	if rows == 0 {
		current, loadErr := loadAgreementReminderStateRecord(ctx, s.tx, scope, agreementID, recipientID)
		if loadErr != nil {
			return stores.AgreementReminderStateRecord{}, loadErr
		}
		return stores.AgreementReminderStateRecord{}, relationalReminderLeaseConflictError(
			agreementID,
			recipientID,
			input.Lease.WorkerID,
			input.Lease.LeaseSeq,
			current.LeaseSeq,
		)
	}
	return cloneRelationalReminderStateRecord(record), nil
}

func applyRelationalReminderSent(record *stores.AgreementReminderStateRecord, input stores.AgreementReminderMarkInput) error {
	record.Status = stores.AgreementReminderStatusActive
	record.TerminalReason = ""
	record.SentCount++
	if record.FirstSentAt == nil {
		record.FirstSentAt = cloneRelationalTimePtr(&input.OccurredAt)
	}
	record.LastSentAt = cloneRelationalTimePtr(&input.OccurredAt)
	record.LastAttemptedSendAt = cloneRelationalTimePtr(&input.OccurredAt)
	record.LastEvaluatedAt = cloneRelationalTimePtr(&input.OccurredAt)
	record.LastReasonCode = input.ReasonCode
	record.LastErrorCode = ""
	record.LastErrorInternalEncrypted = ""
	record.LastErrorInternalExpiresAt = nil
	record.NextDueAt = cloneRelationalTimePtr(input.NextDueAt)
	if record.NextDueAt == nil {
		return relationalReminderStateInvariantError("next_due_at", "active_requires_next_due_at")
	}
	return nil
}

func applyRelationalReminderSkipped(record *stores.AgreementReminderStateRecord, input stores.AgreementReminderMarkInput) error {
	terminalReason := input.TerminalReason
	if terminalReason == "" && input.ReasonCode == stores.AgreementReminderTerminalReasonMaxCountReached {
		terminalReason = stores.AgreementReminderTerminalReasonMaxCountReached
	}
	record.LastReasonCode = input.ReasonCode
	record.LastEvaluatedAt = cloneRelationalTimePtr(&input.OccurredAt)
	record.LastErrorCode = ""
	record.LastErrorInternalEncrypted = ""
	record.LastErrorInternalExpiresAt = nil
	if terminalReason != "" {
		record.Status = stores.AgreementReminderStatusTerminal
		record.TerminalReason = terminalReason
		record.NextDueAt = nil
		return nil
	}
	if record.Status != stores.AgreementReminderStatusPaused {
		record.Status = stores.AgreementReminderStatusActive
	}
	record.TerminalReason = ""
	record.NextDueAt = cloneRelationalTimePtr(input.NextDueAt)
	if record.Status == stores.AgreementReminderStatusActive && record.NextDueAt == nil {
		return relationalReminderStateInvariantError("next_due_at", "active_requires_next_due_at")
	}
	return nil
}

func applyRelationalReminderFailed(record *stores.AgreementReminderStateRecord, input stores.AgreementReminderMarkInput) error {
	if record.Status != stores.AgreementReminderStatusPaused {
		record.Status = stores.AgreementReminderStatusActive
	}
	record.TerminalReason = ""
	record.LastReasonCode = input.ReasonCode
	record.LastErrorCode = input.ReasonCode
	record.LastErrorInternalEncrypted = input.ErrorInternalEncrypted
	record.LastErrorInternalExpiresAt = cloneRelationalTimePtr(input.ErrorInternalExpiresAt)
	record.LastAttemptedSendAt = cloneRelationalTimePtr(&input.OccurredAt)
	record.LastEvaluatedAt = cloneRelationalTimePtr(&input.OccurredAt)
	record.NextDueAt = cloneRelationalTimePtr(input.NextDueAt)
	if record.Status == stores.AgreementReminderStatusActive && record.NextDueAt == nil {
		return relationalReminderStateInvariantError("next_due_at", "active_requires_next_due_at")
	}
	return nil
}

func trimRelationalIntegrationCredentialScopes(scopes []string) []string {
	out := make([]string, 0, len(scopes))
	for _, scopeValue := range scopes {
		if scopeText := strings.TrimSpace(scopeValue); scopeText != "" {
			out = append(out, scopeText)
		}
	}
	return out
}

func normalizeRelationalIntegrationCredentialRecord(scope stores.Scope, record stores.IntegrationCredentialRecord) (stores.IntegrationCredentialRecord, error) {
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.UserID = normalizeRelationalID(record.UserID)
	record.EncryptedAccessToken = strings.TrimSpace(record.EncryptedAccessToken)
	record.EncryptedRefreshToken = strings.TrimSpace(record.EncryptedRefreshToken)
	record.ProfileJSON = strings.TrimSpace(record.ProfileJSON)
	if record.Provider == "" {
		return stores.IntegrationCredentialRecord{}, relationalInvalidRecordError("integration_credentials", "provider", "required")
	}
	if record.UserID == "" {
		return stores.IntegrationCredentialRecord{}, relationalInvalidRecordError("integration_credentials", "user_id", "required")
	}
	if record.EncryptedAccessToken == "" {
		return stores.IntegrationCredentialRecord{}, relationalInvalidRecordError("integration_credentials", "encrypted_access_token", "required")
	}
	record.Scopes = trimRelationalIntegrationCredentialScopes(record.Scopes)
	record.ExpiresAt = cloneRelationalTimePtr(record.ExpiresAt)
	record.LastUsedAt = cloneRelationalTimePtr(record.LastUsedAt)
	if record.ID = normalizeRelationalID(record.ID); record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record, nil
}

func applyRelationalIntegrationCredentialExisting(
	record *stores.IntegrationCredentialRecord,
	existing stores.IntegrationCredentialRecord,
	now time.Time,
) {
	record.ID = existing.ID
	record.CreatedAt = existing.CreatedAt
	record.UpdatedAt = now
}

func normalizeRelationalDocumentCreateRecord(scope stores.Scope, record stores.DocumentRecord) (stores.DocumentRecord, error) {
	if strings.TrimSpace(record.SourceObjectKey) == "" {
		return stores.DocumentRecord{}, relationalInvalidRecordError("documents", "source_object_key", "required")
	}
	record, err := normalizeRelationalDocumentCreateSource(record)
	if err != nil {
		return stores.DocumentRecord{}, err
	}
	record = normalizeRelationalDocumentCreateMetadata(record)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record, nil
}

func normalizeRelationalDocumentCreateSource(record stores.DocumentRecord) (stores.DocumentRecord, error) {
	record.SourceOriginalName = strings.TrimSpace(record.SourceOriginalName)
	if record.SourceOriginalName == "" {
		return stores.DocumentRecord{}, relationalInvalidRecordError("documents", "source_original_name", "required")
	}
	record.SourceSHA256 = strings.TrimSpace(record.SourceSHA256)
	if record.SourceSHA256 == "" {
		return stores.DocumentRecord{}, relationalInvalidRecordError("documents", "source_sha256", "required")
	}
	record.NormalizedObjectKey = strings.TrimSpace(record.NormalizedObjectKey)
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.SourceType = strings.TrimSpace(record.SourceType)
	if record.SourceType == "" {
		record.SourceType = stores.SourceTypeUpload
	}
	if record.SourceType != stores.SourceTypeUpload && record.SourceType != stores.SourceTypeGoogleDrive {
		return stores.DocumentRecord{}, relationalInvalidRecordError("documents", "source_type", "unsupported source type")
	}
	record.SourceGoogleFileID = strings.TrimSpace(record.SourceGoogleFileID)
	record.SourceGoogleDocURL = strings.TrimSpace(record.SourceGoogleDocURL)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	record.SourceModifiedTime = cloneRelationalTimePtr(record.SourceModifiedTime)
	record.SourceExportedAt = cloneRelationalTimePtr(record.SourceExportedAt)
	record.SourceExportedByUserID = normalizeRelationalID(record.SourceExportedByUserID)
	record.SourceMimeType = strings.TrimSpace(record.SourceMimeType)
	record.SourceIngestionMode = strings.TrimSpace(record.SourceIngestionMode)
	return record, nil
}

func normalizeRelationalDocumentCreateMetadata(record stores.DocumentRecord) stores.DocumentRecord {
	record.PDFCompatibilityTier = strings.TrimSpace(record.PDFCompatibilityTier)
	record.PDFCompatibilityReason = strings.TrimSpace(record.PDFCompatibilityReason)
	record.PDFNormalizationStatus = strings.TrimSpace(record.PDFNormalizationStatus)
	record.PDFAnalyzedAt = cloneRelationalTimePtr(record.PDFAnalyzedAt)
	record.PDFPolicyVersion = strings.TrimSpace(record.PDFPolicyVersion)
	record.RemediationStatus = strings.TrimSpace(record.RemediationStatus)
	record.RemediationActorID = normalizeRelationalID(record.RemediationActorID)
	record.RemediationCommandID = strings.TrimSpace(record.RemediationCommandID)
	record.RemediationDispatchID = strings.TrimSpace(record.RemediationDispatchID)
	record.RemediationExecMode = strings.TrimSpace(record.RemediationExecMode)
	record.RemediationCorrelation = strings.TrimSpace(record.RemediationCorrelation)
	record.RemediationFailure = strings.TrimSpace(record.RemediationFailure)
	record.RemediationOriginalKey = strings.TrimSpace(record.RemediationOriginalKey)
	record.RemediationOutputKey = strings.TrimSpace(record.RemediationOutputKey)
	record.RemediationRequestedAt = cloneRelationalTimePtr(record.RemediationRequestedAt)
	record.RemediationStartedAt = cloneRelationalTimePtr(record.RemediationStartedAt)
	record.RemediationCompletedAt = cloneRelationalTimePtr(record.RemediationCompletedAt)
	return record
}

type relationalDocumentRemediationLeaseAcquireParams struct {
	scope         stores.Scope
	documentID    string
	workerID      string
	correlationID string
	now           time.Time
	ttl           time.Duration
}

func normalizeRelationalDocumentRemediationLeaseAcquireParams(
	scope stores.Scope,
	documentID string,
	input stores.DocumentRemediationLeaseAcquireInput,
) (relationalDocumentRemediationLeaseAcquireParams, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return relationalDocumentRemediationLeaseAcquireParams{}, err
	}
	documentID = normalizeRelationalID(documentID)
	if documentID == "" {
		return relationalDocumentRemediationLeaseAcquireParams{}, relationalInvalidRecordError("document_remediation_leases", "document_id", "required")
	}
	workerID := strings.TrimSpace(input.WorkerID)
	if workerID == "" {
		return relationalDocumentRemediationLeaseAcquireParams{}, relationalInvalidRecordError("document_remediation_leases", "worker_id", "required")
	}
	return relationalDocumentRemediationLeaseAcquireParams{
		scope:         scope,
		documentID:    documentID,
		workerID:      workerID,
		correlationID: strings.TrimSpace(input.CorrelationID),
		now:           relationalTimeOrNow(input.Now),
		ttl:           normalizeRelationalDocumentRemediationLeaseTTL(input.TTL),
	}, nil
}

func buildRelationalDocumentRemediationLeaseRecord(params relationalDocumentRemediationLeaseAcquireParams, leaseSeq int64) stores.DocumentRemediationLeaseRecord {
	acquiredAt := params.now
	expiresAt := params.now.Add(params.ttl)
	return stores.DocumentRemediationLeaseRecord{
		DocumentID:      params.documentID,
		TenantID:        params.scope.TenantID,
		OrgID:           params.scope.OrgID,
		WorkerID:        params.workerID,
		LeaseSeq:        leaseSeq,
		CorrelationID:   params.correlationID,
		AcquiredAt:      cloneRelationalTimePtr(&acquiredAt),
		LastHeartbeatAt: cloneRelationalTimePtr(&acquiredAt),
		ExpiresAt:       cloneRelationalTimePtr(&expiresAt),
		UpdatedAt:       params.now,
	}
}

func (s *relationalTxStore) loadOrCreateDocumentRemediationLeaseRecord(
	ctx context.Context,
	params relationalDocumentRemediationLeaseAcquireParams,
) (stores.DocumentRemediationLeaseRecord, bool, error) {
	record, err := loadDocumentRemediationLeaseRecord(ctx, s.tx, params.scope, params.documentID)
	if err == nil {
		return record, false, nil
	}
	if !relationalIsNotFoundError(err) {
		return stores.DocumentRemediationLeaseRecord{}, false, err
	}
	record = buildRelationalDocumentRemediationLeaseRecord(params, 1)
	_, insertErr := s.tx.NewInsert().Model(&relationalDocumentRemediationLeaseModel{DocumentRemediationLeaseRecord: record}).Exec(ctx)
	if insertErr == nil {
		return record, true, nil
	}
	if !relationalIsUniqueConstraintError(insertErr) {
		return stores.DocumentRemediationLeaseRecord{}, false, insertErr
	}
	record, err = loadDocumentRemediationLeaseRecord(ctx, s.tx, params.scope, params.documentID)
	if err != nil {
		return stores.DocumentRemediationLeaseRecord{}, false, err
	}
	return record, false, nil
}

func (s *relationalTxStore) claimExistingDocumentRemediationLeaseRecord(
	ctx context.Context,
	params relationalDocumentRemediationLeaseAcquireParams,
	record stores.DocumentRemediationLeaseRecord,
) (stores.DocumentRemediationLeaseClaim, error) {
	if relationalDocumentRemediationLeaseIsActive(record, params.now) {
		return stores.DocumentRemediationLeaseClaim{}, relationalDocumentRemediationLeaseConflictError(
			params.documentID,
			params.workerID,
			record.LeaseSeq+1,
			record.LeaseSeq,
		)
	}
	expectedUpdatedAt := record.UpdatedAt
	record = buildRelationalDocumentRemediationLeaseRecord(params, record.LeaseSeq+1)
	rows, err := updateDocumentRemediationLeaseRecord(ctx, s.tx, record, &expectedUpdatedAt)
	if err != nil {
		return stores.DocumentRemediationLeaseClaim{}, err
	}
	if rows == 0 {
		current, loadErr := loadDocumentRemediationLeaseRecord(ctx, s.tx, params.scope, params.documentID)
		if loadErr != nil {
			return stores.DocumentRemediationLeaseClaim{}, loadErr
		}
		if relationalDocumentRemediationLeaseIsActive(current, params.now) {
			return stores.DocumentRemediationLeaseClaim{}, relationalDocumentRemediationLeaseConflictError(
				params.documentID,
				params.workerID,
				record.LeaseSeq,
				current.LeaseSeq,
			)
		}
		return stores.DocumentRemediationLeaseClaim{}, relationalVersionConflictError(
			"document_remediation_leases",
			params.documentID,
			record.LeaseSeq,
			current.LeaseSeq,
		)
	}
	return relationalDocumentRemediationLeaseClaimFromRecord(record), nil
}

func updateOutboxMessageRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, record stores.OutboxMessageRecord, expectedUpdatedAt *time.Time) (int64, error) {
	record = cloneRelationalOutboxMessageRecord(record)
	wrapped := OutboxMessageRecord{Message: record}
	query := idb.NewUpdate().
		Model(&wrapped).
		Column(
			"topic",
			"message_key",
			"payload_json",
			"headers_json",
			"correlation_id",
			"status",
			"attempt_count",
			"max_attempts",
			"last_error",
			"available_at",
			"locked_at",
			"locked_by",
			"published_at",
			"created_at",
			"updated_at",
		).
		Where("tenant_id = ?", strings.TrimSpace(scope.TenantID)).
		Where("org_id = ?", strings.TrimSpace(scope.OrgID)).
		Where("id = ?", strings.TrimSpace(record.ID))
	if expectedUpdatedAt != nil && !expectedUpdatedAt.IsZero() {
		query = query.Where("updated_at = ?", expectedUpdatedAt.UTC())
	}
	result, err := query.Exec(ctx)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func relationalParticipantToRecipient(record stores.ParticipantRecord) stores.RecipientRecord {
	return stores.RecipientRecord{
		ID:            record.ID,
		TenantID:      record.TenantID,
		OrgID:         record.OrgID,
		AgreementID:   record.AgreementID,
		Email:         record.Email,
		Name:          record.Name,
		Role:          record.Role,
		Notify:        record.Notify,
		SigningOrder:  record.SigningStage,
		FirstViewAt:   cloneRelationalTimePtr(record.FirstViewAt),
		LastViewAt:    cloneRelationalTimePtr(record.LastViewAt),
		DeclinedAt:    cloneRelationalTimePtr(record.DeclinedAt),
		DeclineReason: record.DeclineReason,
		CompletedAt:   cloneRelationalTimePtr(record.CompletedAt),
		Version:       record.Version,
		CreatedAt:     record.CreatedAt,
		UpdatedAt:     record.UpdatedAt,
	}
}

func relationalVersionConflictError(entity, id string, expected, actual int64) error {
	return goerrors.New("version conflict", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("VERSION_CONFLICT").
		WithMetadata(map[string]any{
			"entity":   entity,
			"id":       strings.TrimSpace(id),
			"expected": expected,
			"actual":   actual,
		})
}

func relationalImmutableAgreementError(agreementID, status string) error {
	return goerrors.New("agreement is immutable after send", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("AGREEMENT_IMMUTABLE").
		WithMetadata(map[string]any{
			"agreement_id": strings.TrimSpace(agreementID),
			"status":       strings.TrimSpace(status),
		})
}

func relationalInvalidSignerStateError(message string) error {
	return goerrors.New("invalid signer state: "+strings.TrimSpace(message), goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("INVALID_SIGNER_STATE")
}

func relationalUniqueConstraintError(err error, entity, field string) error {
	if err == nil {
		return nil
	}
	text := strings.ToLower(err.Error())
	if strings.Contains(text, "unique constraint") ||
		strings.Contains(text, "duplicate key") ||
		strings.Contains(text, "23505") {
		return relationalInvalidRecordError(entity, field, "already exists")
	}
	return err
}

func relationalMergeImmutableArtifactValue(existing, incoming, field string) (string, error) {
	existing = strings.TrimSpace(existing)
	incoming = strings.TrimSpace(incoming)
	if incoming == "" {
		return existing, nil
	}
	if existing != "" && existing != incoming {
		return "", relationalInvalidRecordError("agreement_artifacts", field, "immutable once set")
	}
	return incoming, nil
}

func updateScopedModelByID(ctx context.Context, idb bun.IDB, model any, tenantID, orgID, id string) error {
	_, err := idb.NewUpdate().
		Model(model).
		Where("tenant_id = ?", strings.TrimSpace(tenantID)).
		Where("org_id = ?", strings.TrimSpace(orgID)).
		Where("id = ?", strings.TrimSpace(id)).
		Exec(ctx)
	return err
}

func normalizeRelationalRemediationDispatchRecord(record stores.RemediationDispatchRecord) stores.RemediationDispatchRecord {
	record.DispatchID = strings.TrimSpace(record.DispatchID)
	record.DocumentID = normalizeRelationalID(record.DocumentID)
	record.IdempotencyKey = strings.TrimSpace(record.IdempotencyKey)
	record.Mode = strings.TrimSpace(record.Mode)
	record.CommandID = strings.TrimSpace(record.CommandID)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.EnqueuedAt = cloneRelationalTimePtr(record.EnqueuedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record
}

func loadRemediationDispatchRecordByField(ctx context.Context, idb bun.IDB, scope stores.Scope, field, value string) (stores.RemediationDispatchRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.RemediationDispatchRecord{}, err
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return stores.RemediationDispatchRecord{}, relationalInvalidRecordError("remediation_dispatches", field, "required")
	}
	model := relationalRemediationDispatchModel{}
	if err := idb.NewSelect().
		Model(&model).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where(field+" = ?", value).
		Scan(ctx); err != nil {
		return stores.RemediationDispatchRecord{}, mapSQLNotFound(err, "remediation_dispatches", value)
	}
	return normalizeRelationalRemediationDispatchRecord(model.RemediationDispatchRecord), nil
}

func (s *relationalTxStore) revokeActiveScopedTokens(
	ctx context.Context,
	scope stores.Scope,
	entity, agreementField, agreementID, subjectField, subjectID, revokedStatus, activeStatus string,
	model any,
	revokedAt time.Time,
) (int, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return 0, err
	}
	agreementID = normalizeRelationalID(agreementID)
	subjectID = normalizeRelationalID(subjectID)
	if agreementID == "" {
		return 0, relationalInvalidRecordError(entity, agreementField, "required")
	}
	if subjectID == "" {
		return 0, relationalInvalidRecordError(entity, subjectField, "required")
	}
	if revokedAt.IsZero() {
		revokedAt = time.Now().UTC()
	}
	result, err := s.tx.NewUpdate().
		Model(model).
		Set("status = ?", revokedStatus).
		Set("revoked_at = ?", revokedAt.UTC()).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where(agreementField+" = ?", agreementID).
		Where(subjectField+" = ?", subjectID).
		Where("status = ?", activeStatus).
		Exec(ctx)
	if err != nil {
		return 0, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return int(rows), nil
}

func deleteScopedModelByID(ctx context.Context, idb bun.IDB, model any, tenantID, orgID, id string) error {
	_, err := idb.NewDelete().
		Model(model).
		Where("tenant_id = ?", strings.TrimSpace(tenantID)).
		Where("org_id = ?", strings.TrimSpace(orgID)).
		Where("id = ?", strings.TrimSpace(id)).
		Exec(ctx)
	return err
}

func updateScopedAgreementArtifact(ctx context.Context, idb bun.IDB, model any, tenantID, orgID, agreementID string) error {
	_, err := idb.NewUpdate().
		Model(model).
		Where("tenant_id = ?", strings.TrimSpace(tenantID)).
		Where("org_id = ?", strings.TrimSpace(orgID)).
		Where("agreement_id = ?", strings.TrimSpace(agreementID)).
		Exec(ctx)
	return err
}

func relationalIsUniqueConstraintError(err error) bool {
	if err == nil {
		return false
	}
	text := strings.ToLower(err.Error())
	return strings.Contains(text, "unique constraint") ||
		strings.Contains(text, "duplicate key") ||
		strings.Contains(text, "23505")
}

func relationalNormalizePositiveVersion(input int64) int64 {
	if input > 0 {
		return input
	}
	return 1
}

func relationalNormalizeProviderAndEntity(provider, entityKind string) (string, string) {
	return strings.ToLower(strings.TrimSpace(provider)), strings.ToLower(strings.TrimSpace(entityKind))
}

func relationalNormalizeSyncRunStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case stores.IntegrationSyncRunStatusPending,
		stores.IntegrationSyncRunStatusRunning,
		stores.IntegrationSyncRunStatusCompleted,
		stores.IntegrationSyncRunStatusFailed:
		return strings.ToLower(strings.TrimSpace(status))
	default:
		return stores.IntegrationSyncRunStatusPending
	}
}

func relationalNormalizeConflictStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case stores.IntegrationConflictStatusPending,
		stores.IntegrationConflictStatusResolved,
		stores.IntegrationConflictStatusIgnored:
		return strings.ToLower(strings.TrimSpace(status))
	default:
		return stores.IntegrationConflictStatusPending
	}
}

func relationalNormalizeMappingStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case stores.MappingSpecStatusDraft, stores.MappingSpecStatusPublished:
		return strings.ToLower(strings.TrimSpace(status))
	default:
		return stores.MappingSpecStatusDraft
	}
}

func relationalNormalizePlacementRunStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case stores.PlacementRunStatusCompleted,
		stores.PlacementRunStatusPartial,
		stores.PlacementRunStatusBudgetExhausted,
		stores.PlacementRunStatusTimedOut,
		stores.PlacementRunStatusFailed:
		return strings.ToLower(strings.TrimSpace(status))
	default:
		return stores.PlacementRunStatusFailed
	}
}

func relationalSanitizePlacementResolverIDs(in []string) []string {
	seen := make(map[string]bool, len(in))
	out := make([]string, 0, len(in))
	for _, resolverID := range in {
		resolverID = strings.ToLower(strings.TrimSpace(resolverID))
		if resolverID == "" || seen[resolverID] {
			continue
		}
		seen[resolverID] = true
		out = append(out, resolverID)
	}
	return out
}

func relationalClonePlacementSuggestionRecords(in []stores.PlacementSuggestionRecord) []stores.PlacementSuggestionRecord {
	if len(in) == 0 {
		return []stores.PlacementSuggestionRecord{}
	}
	out := make([]stores.PlacementSuggestionRecord, 0, len(in))
	for _, suggestion := range in {
		suggestion.ID = normalizeRelationalID(suggestion.ID)
		suggestion.FieldDefinitionID = normalizeRelationalID(suggestion.FieldDefinitionID)
		suggestion.ResolverID = strings.ToLower(strings.TrimSpace(suggestion.ResolverID))
		suggestion.Label = strings.TrimSpace(suggestion.Label)
		suggestion.MetadataJSON = strings.TrimSpace(suggestion.MetadataJSON)
		if suggestion.Confidence < 0 {
			suggestion.Confidence = 0
		}
		if suggestion.Confidence > 1 {
			suggestion.Confidence = 1
		}
		out = append(out, suggestion)
	}
	return out
}

func relationalClonePlacementResolverScores(in []stores.PlacementResolverScore) []stores.PlacementResolverScore {
	if len(in) == 0 {
		return []stores.PlacementResolverScore{}
	}
	out := make([]stores.PlacementResolverScore, 0, len(in))
	for _, score := range in {
		score.ResolverID = strings.ToLower(strings.TrimSpace(score.ResolverID))
		score.Reason = strings.TrimSpace(score.Reason)
		out = append(out, score)
	}
	return out
}

func relationalIntegrationMutationClaimID(scope stores.Scope, idempotencyKey string) string {
	return strings.Join([]string{
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(idempotencyKey),
	}, "|")
}

const relationalDefaultDocumentRemediationLeaseTTL = 60 * time.Second

func normalizeRelationalDocumentRemediationLeaseToken(token stores.DocumentRemediationLeaseToken) stores.DocumentRemediationLeaseToken {
	token.WorkerID = strings.TrimSpace(token.WorkerID)
	if token.LeaseSeq < 0 {
		token.LeaseSeq = 0
	}
	return token
}

func normalizeRelationalDocumentRemediationLeaseTTL(ttl time.Duration) time.Duration {
	if ttl <= 0 {
		return relationalDefaultDocumentRemediationLeaseTTL
	}
	return ttl
}

func relationalDocumentRemediationLeaseIsActive(record stores.DocumentRemediationLeaseRecord, now time.Time) bool {
	return strings.TrimSpace(record.WorkerID) != "" &&
		record.LeaseSeq > 0 &&
		record.ExpiresAt != nil &&
		record.ExpiresAt.After(now.UTC())
}

func relationalDocumentRemediationLeaseConflictError(documentID, workerID string, expectedSeq, actualSeq int64) error {
	return goerrors.New("document remediation lease conflict", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("DOCUMENT_REMEDIATION_LEASE_CONFLICT").
		WithMetadata(map[string]any{
			"document_id":  strings.TrimSpace(documentID),
			"worker_id":    strings.TrimSpace(workerID),
			"expected_seq": expectedSeq,
			"actual_seq":   actualSeq,
		})
}

func relationalDocumentRemediationLeaseLostError(documentID, workerID string) error {
	return goerrors.New("document remediation lease lost", goerrors.CategoryConflict).
		WithCode(http.StatusConflict).
		WithTextCode("DOCUMENT_REMEDIATION_LEASE_LOST").
		WithMetadata(map[string]any{
			"document_id": strings.TrimSpace(documentID),
			"worker_id":   strings.TrimSpace(workerID),
		})
}

func validateRelationalDocumentRemediationLease(record stores.DocumentRemediationLeaseRecord, token stores.DocumentRemediationLeaseToken, now time.Time) error {
	token = normalizeRelationalDocumentRemediationLeaseToken(token)
	if token.WorkerID == "" {
		return relationalInvalidRecordError("document_remediation_leases", "worker_id", "required")
	}
	if token.LeaseSeq <= 0 {
		return relationalInvalidRecordError("document_remediation_leases", "lease_seq", "required")
	}
	if strings.TrimSpace(record.WorkerID) == "" || record.LeaseSeq <= 0 || record.ExpiresAt == nil {
		return relationalDocumentRemediationLeaseLostError(record.DocumentID, token.WorkerID)
	}
	if strings.TrimSpace(record.WorkerID) != token.WorkerID {
		return relationalDocumentRemediationLeaseLostError(record.DocumentID, token.WorkerID)
	}
	if record.LeaseSeq != token.LeaseSeq {
		return relationalDocumentRemediationLeaseConflictError(record.DocumentID, token.WorkerID, token.LeaseSeq, record.LeaseSeq)
	}
	if !record.ExpiresAt.After(now.UTC()) {
		return relationalDocumentRemediationLeaseLostError(record.DocumentID, token.WorkerID)
	}
	return nil
}

func clearRelationalDocumentRemediationLease(record *stores.DocumentRemediationLeaseRecord, now time.Time) {
	if record == nil {
		return
	}
	record.WorkerID = ""
	record.CorrelationID = ""
	record.AcquiredAt = nil
	record.LastHeartbeatAt = nil
	record.ExpiresAt = nil
	record.UpdatedAt = now.UTC()
}

func relationalDocumentRemediationLeaseClaimFromRecord(record stores.DocumentRemediationLeaseRecord) stores.DocumentRemediationLeaseClaim {
	record.WorkerID = strings.TrimSpace(record.WorkerID)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.AcquiredAt = cloneRelationalTimePtr(record.AcquiredAt)
	record.LastHeartbeatAt = cloneRelationalTimePtr(record.LastHeartbeatAt)
	record.ExpiresAt = cloneRelationalTimePtr(record.ExpiresAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return stores.DocumentRemediationLeaseClaim{
		Record: record,
		Lease: stores.DocumentRemediationLeaseToken{
			WorkerID: record.WorkerID,
			LeaseSeq: record.LeaseSeq,
		},
	}
}

func loadDocumentRemediationLeaseRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, documentID string) (stores.DocumentRemediationLeaseRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.DocumentRemediationLeaseRecord{}, err
	}
	documentID = normalizeRelationalID(documentID)
	if documentID == "" {
		return stores.DocumentRemediationLeaseRecord{}, relationalInvalidRecordError("document_remediation_leases", "document_id", "required")
	}
	model := relationalDocumentRemediationLeaseModel{}
	if err := idb.NewSelect().
		Model(&model).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("document_id = ?", documentID).
		Scan(ctx); err != nil {
		return stores.DocumentRemediationLeaseRecord{}, mapSQLNotFound(err, "document_remediation_leases", documentID)
	}
	record := model.DocumentRemediationLeaseRecord
	record.WorkerID = strings.TrimSpace(record.WorkerID)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.AcquiredAt = cloneRelationalTimePtr(record.AcquiredAt)
	record.LastHeartbeatAt = cloneRelationalTimePtr(record.LastHeartbeatAt)
	record.ExpiresAt = cloneRelationalTimePtr(record.ExpiresAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record, nil
}

func updateDocumentRemediationLeaseRecord(ctx context.Context, idb bun.IDB, record stores.DocumentRemediationLeaseRecord, expectedUpdatedAt *time.Time) (int64, error) {
	record.WorkerID = strings.TrimSpace(record.WorkerID)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.AcquiredAt = cloneRelationalTimePtr(record.AcquiredAt)
	record.LastHeartbeatAt = cloneRelationalTimePtr(record.LastHeartbeatAt)
	record.ExpiresAt = cloneRelationalTimePtr(record.ExpiresAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	model := relationalDocumentRemediationLeaseModel{DocumentRemediationLeaseRecord: record}
	query := idb.NewUpdate().
		Model(&model).
		Column(
			"worker_id",
			"lease_seq",
			"correlation_id",
			"acquired_at",
			"last_heartbeat_at",
			"expires_at",
			"updated_at",
		).
		Where("tenant_id = ?", strings.TrimSpace(record.TenantID)).
		Where("org_id = ?", strings.TrimSpace(record.OrgID)).
		Where("document_id = ?", strings.TrimSpace(record.DocumentID))
	if expectedUpdatedAt != nil && !expectedUpdatedAt.IsZero() {
		query = query.Where("updated_at = ?", expectedUpdatedAt.UTC())
	}
	result, err := query.Exec(ctx)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func loadRemediationDispatchRecordDirect(ctx context.Context, idb bun.IDB, scope stores.Scope, dispatchID string) (stores.RemediationDispatchRecord, error) {
	return loadRemediationDispatchRecordByField(ctx, idb, scope, "dispatch_id", dispatchID)
}

func findRemediationDispatchByIdempotencyKeyDirect(ctx context.Context, idb bun.IDB, scope stores.Scope, key string) (stores.RemediationDispatchRecord, error) {
	return loadRemediationDispatchRecordByField(ctx, idb, scope, "idempotency_key", key)
}

func loadGoogleImportRunRecordDirect(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.GoogleImportRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.GoogleImportRunRecord{}, relationalInvalidRecordError("google_import_runs", "id", "required")
	}
	record := stores.GoogleImportRunRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.GoogleImportRunRecord{}, mapSQLNotFound(err, "google_import_runs", id)
	}
	record.UserID = normalizeRelationalID(record.UserID)
	record.GoogleFileID = strings.TrimSpace(record.GoogleFileID)
	record.SourceVersionHint = strings.TrimSpace(record.SourceVersionHint)
	record.DedupeKey = strings.TrimSpace(record.DedupeKey)
	record.DocumentTitle = strings.TrimSpace(record.DocumentTitle)
	record.AgreementTitle = strings.TrimSpace(record.AgreementTitle)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.Status = strings.ToLower(strings.TrimSpace(record.Status))
	record.DocumentID = normalizeRelationalID(record.DocumentID)
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.SourceMimeType = strings.TrimSpace(record.SourceMimeType)
	record.IngestionMode = strings.TrimSpace(record.IngestionMode)
	record.ErrorCode = strings.TrimSpace(record.ErrorCode)
	record.ErrorMessage = strings.TrimSpace(record.ErrorMessage)
	record.ErrorDetailsJSON = strings.TrimSpace(record.ErrorDetailsJSON)
	record.StartedAt = cloneRelationalTimePtr(record.StartedAt)
	record.CompletedAt = cloneRelationalTimePtr(record.CompletedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record, nil
}

func findGoogleImportRunByDedupeRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, dedupeKey string) (stores.GoogleImportRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	dedupeKey = strings.TrimSpace(dedupeKey)
	if dedupeKey == "" {
		return stores.GoogleImportRunRecord{}, relationalInvalidRecordError("google_import_runs", "dedupe_key", "required")
	}
	record := stores.GoogleImportRunRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("dedupe_key = ?", dedupeKey).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.GoogleImportRunRecord{}, mapSQLNotFound(err, "google_import_runs", dedupeKey)
	}
	return loadGoogleImportRunRecordDirect(ctx, idb, scope, record.ID)
}

func loadIntegrationCredentialByProviderUserRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, provider, userID string) (stores.IntegrationCredentialRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationCredentialRecord{}, err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	userID = normalizeRelationalID(userID)
	if provider == "" {
		return stores.IntegrationCredentialRecord{}, relationalInvalidRecordError("integration_credentials", "provider", "required")
	}
	if userID == "" {
		return stores.IntegrationCredentialRecord{}, relationalInvalidRecordError("integration_credentials", "user_id", "required")
	}
	record := stores.IntegrationCredentialRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("provider = ?", provider).
		Where("user_id = ?", userID).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.IntegrationCredentialRecord{}, mapSQLNotFound(err, "integration_credentials", provider+"|"+userID)
	}
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.UserID = normalizeRelationalID(record.UserID)
	record.EncryptedAccessToken = strings.TrimSpace(record.EncryptedAccessToken)
	record.EncryptedRefreshToken = strings.TrimSpace(record.EncryptedRefreshToken)
	record.ProfileJSON = strings.TrimSpace(record.ProfileJSON)
	record.Scopes = append([]string{}, record.Scopes...)
	record.ExpiresAt = cloneRelationalTimePtr(record.ExpiresAt)
	record.LastUsedAt = cloneRelationalTimePtr(record.LastUsedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record, nil
}

func loadMappingSpecRecordDirect(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.MappingSpecRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.MappingSpecRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.MappingSpecRecord{}, relationalInvalidRecordError("integration_mapping_specs", "id", "required")
	}
	record := stores.MappingSpecRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.MappingSpecRecord{}, mapSQLNotFound(err, "integration_mapping_specs", id)
	}
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.Name = strings.TrimSpace(record.Name)
	record.Status = relationalNormalizeMappingStatus(record.Status)
	record.CompiledJSON = strings.TrimSpace(record.CompiledJSON)
	record.CompiledHash = strings.TrimSpace(record.CompiledHash)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	record.UpdatedByUserID = normalizeRelationalID(record.UpdatedByUserID)
	record.PublishedAt = cloneRelationalTimePtr(record.PublishedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record, nil
}

func loadIntegrationBindingByExternalRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, provider, entityKind, externalID string) (stores.IntegrationBindingRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationBindingRecord{}, err
	}
	provider, entityKind = relationalNormalizeProviderAndEntity(provider, entityKind)
	externalID = normalizeRelationalID(externalID)
	if provider == "" || entityKind == "" || externalID == "" {
		return stores.IntegrationBindingRecord{}, relationalInvalidRecordError("integration_bindings", "provider|entity_kind|external_id", "required")
	}
	record := stores.IntegrationBindingRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("provider = ?", provider).
		Where("entity_kind = ?", entityKind).
		Where("external_id = ?", externalID).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.IntegrationBindingRecord{}, mapSQLNotFound(err, "integration_bindings", externalID)
	}
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.EntityKind = strings.ToLower(strings.TrimSpace(record.EntityKind))
	record.ExternalID = normalizeRelationalID(record.ExternalID)
	record.InternalID = normalizeRelationalID(record.InternalID)
	record.ProvenanceJSON = strings.TrimSpace(record.ProvenanceJSON)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record, nil
}

func loadIntegrationSyncRunRecordDirect(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.IntegrationSyncRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.IntegrationSyncRunRecord{}, relationalInvalidRecordError("integration_sync_runs", "id", "required")
	}
	record := stores.IntegrationSyncRunRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.IntegrationSyncRunRecord{}, mapSQLNotFound(err, "integration_sync_runs", id)
	}
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.Direction = strings.ToLower(strings.TrimSpace(record.Direction))
	record.MappingSpecID = normalizeRelationalID(record.MappingSpecID)
	record.Status = relationalNormalizeSyncRunStatus(record.Status)
	record.Cursor = strings.TrimSpace(record.Cursor)
	record.LastError = strings.TrimSpace(record.LastError)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	record.CompletedAt = cloneRelationalTimePtr(record.CompletedAt)
	record.StartedAt = relationalTimeOrNow(record.StartedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record, nil
}

func loadIntegrationCheckpointByKeyRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, runID, checkpointKey string) (stores.IntegrationCheckpointRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationCheckpointRecord{}, err
	}
	runID = normalizeRelationalID(runID)
	checkpointKey = strings.TrimSpace(checkpointKey)
	if runID == "" {
		return stores.IntegrationCheckpointRecord{}, relationalInvalidRecordError("integration_checkpoints", "run_id", "required")
	}
	if checkpointKey == "" {
		return stores.IntegrationCheckpointRecord{}, relationalInvalidRecordError("integration_checkpoints", "checkpoint_key", "required")
	}
	record := stores.IntegrationCheckpointRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("run_id = ?", runID).
		Where("checkpoint_key = ?", checkpointKey).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.IntegrationCheckpointRecord{}, mapSQLNotFound(err, "integration_checkpoints", checkpointKey)
	}
	record.RunID = normalizeRelationalID(record.RunID)
	record.CheckpointKey = strings.TrimSpace(record.CheckpointKey)
	record.Cursor = strings.TrimSpace(record.Cursor)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record, nil
}

func loadIntegrationConflictRecordDirect(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.IntegrationConflictRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationConflictRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.IntegrationConflictRecord{}, relationalInvalidRecordError("integration_conflicts", "id", "required")
	}
	record := stores.IntegrationConflictRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.IntegrationConflictRecord{}, mapSQLNotFound(err, "integration_conflicts", id)
	}
	record.RunID = normalizeRelationalID(record.RunID)
	record.BindingID = normalizeRelationalID(record.BindingID)
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.EntityKind = strings.ToLower(strings.TrimSpace(record.EntityKind))
	record.ExternalID = normalizeRelationalID(record.ExternalID)
	record.InternalID = normalizeRelationalID(record.InternalID)
	record.Status = relationalNormalizeConflictStatus(record.Status)
	record.Reason = strings.TrimSpace(record.Reason)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	record.ResolutionJSON = strings.TrimSpace(record.ResolutionJSON)
	record.ResolvedByUserID = normalizeRelationalID(record.ResolvedByUserID)
	record.ResolvedAt = cloneRelationalTimePtr(record.ResolvedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record, nil
}

func findIntegrationChangeEventByDedupeRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, provider, idempotencyKey string) (stores.IntegrationChangeEventRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationChangeEventRecord{}, err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if provider == "" || idempotencyKey == "" {
		return stores.IntegrationChangeEventRecord{}, relationalInvalidRecordError("integration_change_events", "provider|idempotency_key", "required")
	}
	record := stores.IntegrationChangeEventRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("provider = ?", provider).
		Where("idempotency_key = ?", idempotencyKey).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.IntegrationChangeEventRecord{}, mapSQLNotFound(err, "integration_change_events", idempotencyKey)
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.EventType = strings.TrimSpace(record.EventType)
	record.SourceEventID = strings.TrimSpace(record.SourceEventID)
	record.IdempotencyKey = strings.TrimSpace(record.IdempotencyKey)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	record.EmittedAt = relationalTimeOrNow(record.EmittedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	return record, nil
}

func loadPlacementRunRecordDirect(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.PlacementRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.PlacementRunRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.PlacementRunRecord{}, relationalInvalidRecordError("placement_runs", "id", "required")
	}
	record := stores.PlacementRunRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.PlacementRunRecord{}, mapSQLNotFound(err, "placement_runs", id)
	}
	record.ID = normalizeRelationalID(record.ID)
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.Status = strings.ToLower(strings.TrimSpace(record.Status))
	record.ReasonCode = strings.TrimSpace(record.ReasonCode)
	record.ResolverOrder = append([]string{}, record.ResolverOrder...)
	record.ExecutedResolvers = append([]string{}, record.ExecutedResolvers...)
	record.ResolverScores = relationalClonePlacementResolverScores(record.ResolverScores)
	record.Suggestions = relationalClonePlacementSuggestionRecords(record.Suggestions)
	record.SelectedSuggestionIDs = append([]string{}, record.SelectedSuggestionIDs...)
	record.UnresolvedDefinitionIDs = append([]string{}, record.UnresolvedDefinitionIDs...)
	record.SelectedSource = strings.TrimSpace(record.SelectedSource)
	record.PolicyJSON = strings.TrimSpace(record.PolicyJSON)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	record.CompletedAt = cloneRelationalTimePtr(record.CompletedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record, nil
}

func loadSignerProfileBySubjectKeyRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, subject, key string) (stores.SignerProfileRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SignerProfileRecord{}, err
	}
	subject = strings.ToLower(strings.TrimSpace(subject))
	key = strings.TrimSpace(key)
	if subject == "" {
		return stores.SignerProfileRecord{}, relationalInvalidRecordError("signer_profiles", "subject", "required")
	}
	if key == "" {
		return stores.SignerProfileRecord{}, relationalInvalidRecordError("signer_profiles", "key", "required")
	}
	record := stores.SignerProfileRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("subject = ?", subject).
		Where("profile_key = ?", key).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.SignerProfileRecord{}, mapSQLNotFound(err, "signer_profiles", subject+"|"+key)
	}
	record.Subject = strings.ToLower(strings.TrimSpace(record.Subject))
	record.Key = strings.TrimSpace(record.Key)
	record.FullName = strings.TrimSpace(record.FullName)
	record.Initials = strings.TrimSpace(record.Initials)
	record.TypedSignature = strings.TrimSpace(record.TypedSignature)
	record.DrawnSignatureDataURL = strings.TrimSpace(record.DrawnSignatureDataURL)
	record.DrawnInitialsDataURL = strings.TrimSpace(record.DrawnInitialsDataURL)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	record.ExpiresAt = relationalTimeOrNow(record.ExpiresAt)
	return record, nil
}

func loadSavedSignerSignatureRecordDirect(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SavedSignerSignatureRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SavedSignerSignatureRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.SavedSignerSignatureRecord{}, relationalInvalidRecordError("saved_signatures", "id", "required")
	}
	record := stores.SavedSignerSignatureRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SavedSignerSignatureRecord{}, mapSQLNotFound(err, "saved_signatures", id)
	}
	record.Subject = strings.ToLower(strings.TrimSpace(record.Subject))
	record.Type = strings.ToLower(strings.TrimSpace(record.Type))
	record.Label = strings.TrimSpace(record.Label)
	record.ObjectKey = strings.TrimSpace(record.ObjectKey)
	record.ThumbnailDataURL = strings.TrimSpace(record.ThumbnailDataURL)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	return record, nil
}

func loadDocumentRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.DocumentRecord, error) {
	return relationalLoadRecord[stores.DocumentRecord](ctx, idb, scope, "documents", "id", normalizeRelationalID(id))
}

func loadParticipantRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, participantID string) (stores.ParticipantRecord, error) {
	return relationalLoadRequiredPairRecord[stores.ParticipantRecord](
		ctx,
		idb,
		scope,
		"participants",
		"agreement_id",
		normalizeRelationalID(agreementID),
		"id",
		normalizeRelationalID(participantID),
		normalizeRelationalID(participantID),
	)
}

func loadFieldDefinitionRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, definitionID string) (stores.FieldDefinitionRecord, error) {
	return relationalLoadRequiredPairRecord[stores.FieldDefinitionRecord](
		ctx,
		idb,
		scope,
		"field_definitions",
		"agreement_id",
		normalizeRelationalID(agreementID),
		"id",
		normalizeRelationalID(definitionID),
		normalizeRelationalID(definitionID),
	)
}

func loadFieldInstanceRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, instanceID string) (stores.FieldInstanceRecord, error) {
	return relationalLoadRequiredPairRecord[stores.FieldInstanceRecord](
		ctx,
		idb,
		scope,
		"field_instances",
		"agreement_id",
		normalizeRelationalID(agreementID),
		"id",
		normalizeRelationalID(instanceID),
		normalizeRelationalID(instanceID),
	)
}

func loadEmailLogRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.EmailLogRecord, error) {
	return relationalLoadRecord[stores.EmailLogRecord](ctx, idb, scope, "email_logs", "id", normalizeRelationalID(id))
}

func loadJobRunRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.JobRunRecord, error) {
	return relationalLoadRecord[stores.JobRunRecord](ctx, idb, scope, "job_runs", "id", normalizeRelationalID(id))
}

func findDraftByWizardRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, createdByUserID, wizardID string) (stores.DraftRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.DraftRecord{}, err
	}
	createdByUserID = normalizeRelationalID(createdByUserID)
	wizardID = strings.TrimSpace(wizardID)
	if createdByUserID == "" || wizardID == "" {
		return stores.DraftRecord{}, relationalInvalidRecordError("drafts", "created_by_user_id|wizard_id", "required")
	}
	record := stores.DraftRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("created_by = ?", createdByUserID).
		Where("wizard_id = ?", wizardID).
		OrderExpr("created_at DESC, id DESC").
		Limit(1).
		Scan(ctx)
	if err != nil {
		return stores.DraftRecord{}, mapSQLNotFound(err, "drafts", wizardID)
	}
	return record, nil
}

func listDocumentRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.DocumentQuery) ([]stores.DocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	records := make([]stores.DocumentRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if titleFilter := strings.TrimSpace(query.TitleContains); titleFilter != "" {
		sel = sel.Where("LOWER(title) LIKE ?", "%"+strings.ToLower(titleFilter)+"%")
	}
	if createdBy := normalizeRelationalID(query.CreatedByUserID); createdBy != "" {
		sel = sel.Where("created_by = ?", createdBy)
	}
	switch strings.ToLower(strings.TrimSpace(query.SortBy)) {
	case "updated_at":
		if query.SortDesc {
			sel = sel.OrderExpr("updated_at DESC, id DESC")
		} else {
			sel = sel.OrderExpr("updated_at ASC, id ASC")
		}
	default:
		if query.SortDesc {
			sel = sel.OrderExpr("created_at DESC, id DESC")
		} else {
			sel = sel.OrderExpr("created_at ASC, id ASC")
		}
	}
	if query.Limit > 0 {
		sel = sel.Limit(query.Limit)
	}
	if query.Offset > 0 {
		sel = sel.Offset(query.Offset)
	}
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func findFieldValueByLogicalKey(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, recipientID, fieldID string) (stores.FieldValueRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	record := stores.FieldValueRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("recipient_id = ?", recipientID).
		Where("field_id = ?", fieldID).
		Limit(1).
		Scan(ctx)
	if err != nil {
		return stores.FieldValueRecord{}, mapSQLNotFound(err, "field_values", fieldID)
	}
	return record, nil
}

func findJobRunByDedupeRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, jobName, dedupeKey string) (stores.JobRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.JobRunRecord{}, err
	}
	record := stores.JobRunRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("job_name = ?", jobName).
		Where("dedupe_key = ?", dedupeKey).
		Limit(1).
		Scan(ctx)
	if err != nil {
		return stores.JobRunRecord{}, mapSQLNotFound(err, "job_runs", dedupeKey)
	}
	return record, nil
}

func (s *relationalTxStore) Get(ctx context.Context, scope stores.Scope, id string) (stores.DocumentRecord, error) {
	return loadDocumentRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) List(ctx context.Context, scope stores.Scope, query stores.DocumentQuery) ([]stores.DocumentRecord, error) {
	return listDocumentRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) GetRemediationDispatch(ctx context.Context, dispatchID string) (stores.RemediationDispatchRecord, error) {
	return loadRemediationDispatchRecord(ctx, s.tx, dispatchID)
}

func (s *relationalTxStore) GetRemediationDispatchByIdempotencyKey(ctx context.Context, scope stores.Scope, key string) (stores.RemediationDispatchRecord, error) {
	return loadRemediationDispatchByIdempotencyKeyRecord(ctx, s.tx, scope, key)
}

func (s *relationalTxStore) GetGuardedEffect(ctx context.Context, effectID string) (guardedeffects.Record, error) {
	return loadGuardedEffectRecord(ctx, s.tx, effectID)
}

func (s *relationalTxStore) GetGuardedEffectByIdempotencyKey(ctx context.Context, scope stores.Scope, key string) (guardedeffects.Record, error) {
	return loadGuardedEffectByIdempotencyKeyRecord(ctx, s.tx, scope, key)
}

func (s *relationalTxStore) ListGuardedEffects(ctx context.Context, scope stores.Scope, query stores.GuardedEffectQuery) ([]guardedeffects.Record, error) {
	return listGuardedEffectRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) GetAgreement(ctx context.Context, scope stores.Scope, id string) (stores.AgreementRecord, error) {
	return loadAgreementRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListAgreements(ctx context.Context, scope stores.Scope, query stores.AgreementQuery) ([]stores.AgreementRecord, error) {
	return listAgreementRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) ListParticipants(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.ParticipantRecord, error) {
	return listParticipantRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) ListRecipients(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.RecipientRecord, error) {
	return listRecipientRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) ListFieldDefinitions(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldDefinitionRecord, error) {
	return listFieldDefinitionRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) ListFieldInstances(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldInstanceRecord, error) {
	return listFieldInstanceRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) ListFields(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldRecord, error) {
	return listFieldRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) GetDraftSession(ctx context.Context, scope stores.Scope, id string) (stores.DraftRecord, error) {
	return loadDraftRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListDraftSessions(ctx context.Context, scope stores.Scope, query stores.DraftQuery) ([]stores.DraftRecord, string, error) {
	return listDraftRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) ListFieldValuesByRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID string) ([]stores.FieldValueRecord, error) {
	return listFieldValueRecordsByRecipient(ctx, s.tx, scope, agreementID, recipientID)
}

func (s *relationalTxStore) GetSignatureArtifact(ctx context.Context, scope stores.Scope, id string) (stores.SignatureArtifactRecord, error) {
	return loadSignatureArtifactRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) GetSignerProfile(ctx context.Context, scope stores.Scope, subject, key string, now time.Time) (stores.SignerProfileRecord, error) {
	return loadSignerProfileRecord(ctx, s.tx, scope, subject, key, now)
}

func (s *relationalTxStore) ListSavedSignerSignatures(ctx context.Context, scope stores.Scope, subject, signatureType string) ([]stores.SavedSignerSignatureRecord, error) {
	return listSavedSignerSignatureRecords(ctx, s.tx, scope, subject, signatureType)
}

func (s *relationalTxStore) CountSavedSignerSignatures(ctx context.Context, scope stores.Scope, subject, signatureType string) (int, error) {
	return countSavedSignerSignatureRecords(ctx, s.tx, scope, subject, signatureType)
}

func (s *relationalTxStore) GetSigningTokenByHash(ctx context.Context, scope stores.Scope, tokenHash string) (stores.SigningTokenRecord, error) {
	return loadSigningTokenByHashRecord(ctx, s.tx, scope, tokenHash)
}

func (s *relationalTxStore) GetSigningToken(ctx context.Context, scope stores.Scope, id string) (stores.SigningTokenRecord, error) {
	return loadSigningTokenRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListSigningTokens(ctx context.Context, scope stores.Scope, agreementID, recipientID string) ([]stores.SigningTokenRecord, error) {
	return listSigningTokenRecords(ctx, s.tx, scope, agreementID, recipientID)
}

func (s *relationalTxStore) ListForAgreement(ctx context.Context, scope stores.Scope, agreementID string, query stores.AuditEventQuery) ([]stores.AuditEventRecord, error) {
	return listAuditEventRecords(ctx, s.tx, scope, agreementID, query)
}

func (s *relationalTxStore) GetAgreementArtifacts(ctx context.Context, scope stores.Scope, agreementID string) (stores.AgreementArtifactRecord, error) {
	return loadAgreementArtifactRecord(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) ListEmailLogs(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.EmailLogRecord, error) {
	return listEmailLogRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) GetJobRunByDedupe(ctx context.Context, scope stores.Scope, jobName, dedupeKey string) (stores.JobRunRecord, error) {
	return findJobRunByDedupeRecord(ctx, s.tx, scope, strings.TrimSpace(jobName), strings.TrimSpace(dedupeKey))
}

func (s *relationalTxStore) ListJobRuns(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.JobRunRecord, error) {
	return listJobRunRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) GetGoogleImportRun(ctx context.Context, scope stores.Scope, id string) (stores.GoogleImportRunRecord, error) {
	return loadGoogleImportRunRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListGoogleImportRuns(ctx context.Context, scope stores.Scope, query stores.GoogleImportRunQuery) ([]stores.GoogleImportRunRecord, string, error) {
	return listGoogleImportRunRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) GetAgreementReminderState(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error) {
	return loadAgreementReminderStateRecord(ctx, s.tx, scope, agreementID, recipientID)
}

func (s *relationalTxStore) ListOutboxMessages(ctx context.Context, scope stores.Scope, query stores.OutboxQuery) ([]stores.OutboxMessageRecord, error) {
	return listOutboxMessageRecords(ctx, s.tx, scope, query)
}

func (s *relationalTxStore) GetIntegrationCredential(ctx context.Context, scope stores.Scope, provider, userID string) (stores.IntegrationCredentialRecord, error) {
	return loadIntegrationCredentialRecord(ctx, s.tx, scope, provider, userID)
}

func (s *relationalTxStore) ListIntegrationCredentials(ctx context.Context, scope stores.Scope, provider string, baseUserIDPrefix string) ([]stores.IntegrationCredentialRecord, error) {
	return listIntegrationCredentialRecords(ctx, s.tx, scope, provider, baseUserIDPrefix)
}

func (s *relationalTxStore) GetMappingSpec(ctx context.Context, scope stores.Scope, id string) (stores.MappingSpecRecord, error) {
	return loadMappingSpecRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListMappingSpecs(ctx context.Context, scope stores.Scope, provider string) ([]stores.MappingSpecRecord, error) {
	return listMappingSpecRecords(ctx, s.tx, scope, provider)
}

func (s *relationalTxStore) GetIntegrationBindingByExternal(ctx context.Context, scope stores.Scope, provider, entityKind, externalID string) (stores.IntegrationBindingRecord, error) {
	return loadIntegrationBindingByExternalRecord(ctx, s.tx, scope, provider, entityKind, externalID)
}

func (s *relationalTxStore) ListIntegrationBindings(ctx context.Context, scope stores.Scope, provider, entityKind, internalID string) ([]stores.IntegrationBindingRecord, error) {
	return listIntegrationBindingRecords(ctx, s.tx, scope, provider, entityKind, internalID)
}

func (s *relationalTxStore) GetIntegrationSyncRun(ctx context.Context, scope stores.Scope, id string) (stores.IntegrationSyncRunRecord, error) {
	return loadIntegrationSyncRunRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListIntegrationSyncRuns(ctx context.Context, scope stores.Scope, provider string) ([]stores.IntegrationSyncRunRecord, error) {
	return listIntegrationSyncRunRecords(ctx, s.tx, scope, provider)
}

func (s *relationalTxStore) ListIntegrationCheckpoints(ctx context.Context, scope stores.Scope, runID string) ([]stores.IntegrationCheckpointRecord, error) {
	return listIntegrationCheckpointRecords(ctx, s.tx, scope, runID)
}

func (s *relationalTxStore) GetIntegrationConflict(ctx context.Context, scope stores.Scope, id string) (stores.IntegrationConflictRecord, error) {
	return loadIntegrationConflictRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) ListIntegrationConflicts(ctx context.Context, scope stores.Scope, runID, status string) ([]stores.IntegrationConflictRecord, error) {
	return listIntegrationConflictRecords(ctx, s.tx, scope, runID, status)
}

func (s *relationalTxStore) ListIntegrationChangeEvents(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.IntegrationChangeEventRecord, error) {
	return listIntegrationChangeEventRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) GetPlacementRun(ctx context.Context, scope stores.Scope, agreementID, runID string) (stores.PlacementRunRecord, error) {
	return loadPlacementRunRecord(ctx, s.tx, scope, agreementID, runID)
}

func (s *relationalTxStore) ListPlacementRuns(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.PlacementRunRecord, error) {
	return listPlacementRunRecords(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) Create(ctx context.Context, scope stores.Scope, record stores.DocumentRecord) (stores.DocumentRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.DocumentRecord{}, err
	}
	record, err = normalizeRelationalDocumentCreateRecord(scope, record)
	if err != nil {
		return stores.DocumentRecord{}, err
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.DocumentRecord{}, relationalUniqueConstraintError(err, "documents", "id")
	}
	return record, nil
}

func (s *relationalTxStore) SaveMetadata(ctx context.Context, scope stores.Scope, id string, patch stores.DocumentMetadataPatch) (stores.DocumentRecord, error) {
	record, err := loadDocumentRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.DocumentRecord{}, err
	}
	next := record
	next.NormalizedObjectKey = strings.TrimSpace(patch.NormalizedObjectKey)
	next.PDFCompatibilityTier = strings.TrimSpace(patch.PDFCompatibilityTier)
	next.PDFCompatibilityReason = strings.TrimSpace(patch.PDFCompatibilityReason)
	next.PDFNormalizationStatus = strings.TrimSpace(patch.PDFNormalizationStatus)
	next.PDFAnalyzedAt = cloneRelationalTimePtr(patch.PDFAnalyzedAt)
	next.PDFPolicyVersion = strings.TrimSpace(patch.PDFPolicyVersion)
	next.RemediationStatus = strings.TrimSpace(patch.RemediationStatus)
	next.RemediationActorID = normalizeRelationalID(patch.RemediationActorID)
	next.RemediationCommandID = strings.TrimSpace(patch.RemediationCommandID)
	next.RemediationDispatchID = strings.TrimSpace(patch.RemediationDispatchID)
	next.RemediationExecMode = strings.TrimSpace(patch.RemediationExecMode)
	next.RemediationCorrelation = strings.TrimSpace(patch.RemediationCorrelation)
	next.RemediationFailure = strings.TrimSpace(patch.RemediationFailure)
	next.RemediationOriginalKey = strings.TrimSpace(patch.RemediationOriginalKey)
	next.RemediationOutputKey = strings.TrimSpace(patch.RemediationOutputKey)
	next.RemediationRequestedAt = cloneRelationalTimePtr(patch.RemediationRequestedAt)
	next.RemediationStartedAt = cloneRelationalTimePtr(patch.RemediationStartedAt)
	next.RemediationCompletedAt = cloneRelationalTimePtr(patch.RemediationCompletedAt)
	next.SizeBytes = patch.SizeBytes
	next.PageCount = patch.PageCount
	next.UpdatedAt = time.Now().UTC()
	if err := updateScopedModelByID(ctx, s.tx, &next, next.TenantID, next.OrgID, next.ID); err != nil {
		return stores.DocumentRecord{}, err
	}
	return next, nil
}

func (s *relationalTxStore) Delete(ctx context.Context, scope stores.Scope, id string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return relationalInvalidRecordError("documents", "id", "required")
	}
	_, loadErr := loadDocumentRecord(ctx, s.tx, scope, id)
	if loadErr != nil {
		return loadErr
	}
	count, err := s.tx.NewSelect().
		Model((*stores.AgreementRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("document_id = ?", id).
		Count(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		return relationalInvalidRecordError("documents", "id", "in use by agreements")
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.DocumentRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Exec(ctx); err != nil {
		return err
	}
	return nil
}

func (s *relationalTxStore) AcquireDocumentRemediationLease(ctx context.Context, scope stores.Scope, documentID string, input stores.DocumentRemediationLeaseAcquireInput) (stores.DocumentRemediationLeaseClaim, error) {
	params, err := normalizeRelationalDocumentRemediationLeaseAcquireParams(scope, documentID, input)
	if err != nil {
		return stores.DocumentRemediationLeaseClaim{}, err
	}
	if _, loadErr := loadDocumentRecord(ctx, s.tx, params.scope, params.documentID); loadErr != nil {
		return stores.DocumentRemediationLeaseClaim{}, loadErr
	}
	record, inserted, err := s.loadOrCreateDocumentRemediationLeaseRecord(ctx, params)
	if err != nil {
		return stores.DocumentRemediationLeaseClaim{}, err
	}
	if inserted {
		return relationalDocumentRemediationLeaseClaimFromRecord(record), nil
	}
	return s.claimExistingDocumentRemediationLeaseRecord(ctx, params, record)
}

func (s *relationalTxStore) RenewDocumentRemediationLease(ctx context.Context, scope stores.Scope, documentID string, input stores.DocumentRemediationLeaseRenewInput) (stores.DocumentRemediationLeaseClaim, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.DocumentRemediationLeaseClaim{}, err
	}
	documentID = normalizeRelationalID(documentID)
	if documentID == "" {
		return stores.DocumentRemediationLeaseClaim{}, relationalInvalidRecordError("document_remediation_leases", "document_id", "required")
	}
	now := relationalTimeOrNow(input.Now)
	ttl := normalizeRelationalDocumentRemediationLeaseTTL(input.TTL)
	input.Lease = normalizeRelationalDocumentRemediationLeaseToken(input.Lease)

	record, err := loadDocumentRemediationLeaseRecord(ctx, s.tx, scope, documentID)
	if err != nil {
		return stores.DocumentRemediationLeaseClaim{}, err
	}
	validateErr := validateRelationalDocumentRemediationLease(record, input.Lease, now)
	if validateErr != nil {
		return stores.DocumentRemediationLeaseClaim{}, validateErr
	}

	expectedUpdatedAt := record.UpdatedAt
	record.LeaseSeq++
	record.UpdatedAt = now
	heartbeat := now
	expiresAt := now.Add(ttl)
	record.LastHeartbeatAt = cloneRelationalTimePtr(&heartbeat)
	record.ExpiresAt = cloneRelationalTimePtr(&expiresAt)
	rows, err := updateDocumentRemediationLeaseRecord(ctx, s.tx, record, &expectedUpdatedAt)
	if err != nil {
		return stores.DocumentRemediationLeaseClaim{}, err
	}
	if rows == 0 {
		current, loadErr := loadDocumentRemediationLeaseRecord(ctx, s.tx, scope, documentID)
		if loadErr != nil {
			return stores.DocumentRemediationLeaseClaim{}, loadErr
		}
		if err := validateRelationalDocumentRemediationLease(current, input.Lease, now); err != nil {
			return stores.DocumentRemediationLeaseClaim{}, err
		}
		return stores.DocumentRemediationLeaseClaim{}, relationalVersionConflictError("document_remediation_leases", documentID, record.LeaseSeq, current.LeaseSeq)
	}
	return relationalDocumentRemediationLeaseClaimFromRecord(record), nil
}

func (s *relationalTxStore) ReleaseDocumentRemediationLease(ctx context.Context, scope stores.Scope, documentID string, input stores.DocumentRemediationLeaseReleaseInput) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	documentID = normalizeRelationalID(documentID)
	if documentID == "" {
		return relationalInvalidRecordError("document_remediation_leases", "document_id", "required")
	}
	now := relationalTimeOrNow(input.Now)
	input.Lease = normalizeRelationalDocumentRemediationLeaseToken(input.Lease)

	record, err := loadDocumentRemediationLeaseRecord(ctx, s.tx, scope, documentID)
	if err != nil {
		if relationalIsNotFoundError(err) {
			return nil
		}
		return err
	}
	validateErr := validateRelationalDocumentRemediationLease(record, input.Lease, now)
	if validateErr != nil {
		return validateErr
	}
	expectedUpdatedAt := record.UpdatedAt
	clearRelationalDocumentRemediationLease(&record, now)
	rows, err := updateDocumentRemediationLeaseRecord(ctx, s.tx, record, &expectedUpdatedAt)
	if err != nil {
		return err
	}
	if rows == 0 {
		current, loadErr := loadDocumentRemediationLeaseRecord(ctx, s.tx, scope, documentID)
		if loadErr != nil {
			if relationalIsNotFoundError(loadErr) {
				return nil
			}
			return loadErr
		}
		if err := validateRelationalDocumentRemediationLease(current, input.Lease, now); err != nil {
			return err
		}
		return relationalVersionConflictError("document_remediation_leases", documentID, record.LeaseSeq, current.LeaseSeq)
	}
	return nil
}

func (s *relationalTxStore) SaveRemediationDispatch(ctx context.Context, scope stores.Scope, record stores.RemediationDispatchRecord) (stores.RemediationDispatchRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.RemediationDispatchRecord{}, err
	}
	record.DispatchID = strings.TrimSpace(record.DispatchID)
	if record.DispatchID == "" {
		return stores.RemediationDispatchRecord{}, relationalInvalidRecordError("remediation_dispatches", "dispatch_id", "required")
	}
	record.DocumentID = normalizeRelationalID(record.DocumentID)
	if record.DocumentID == "" {
		return stores.RemediationDispatchRecord{}, relationalInvalidRecordError("remediation_dispatches", "document_id", "required")
	}
	record.IdempotencyKey = strings.TrimSpace(record.IdempotencyKey)
	record.Mode = strings.TrimSpace(record.Mode)
	record.CommandID = strings.TrimSpace(record.CommandID)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.EnqueuedAt = cloneRelationalTimePtr(record.EnqueuedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)

	current, err := loadRemediationDispatchRecordDirect(ctx, s.tx, scope, record.DispatchID)
	if err != nil && !relationalIsNotFoundError(err) {
		return stores.RemediationDispatchRecord{}, err
	}
	if err == nil {
		record = mergeRelationalRemediationDispatchRecord(record, current)
		if err := updateRelationalRemediationDispatchRecord(ctx, s.tx, scope, record); err != nil {
			return stores.RemediationDispatchRecord{}, err
		}
		return record, nil
	}

	if _, err := s.tx.NewInsert().Model(&relationalRemediationDispatchModel{RemediationDispatchRecord: record}).Exec(ctx); err != nil {
		if !relationalIsUniqueConstraintError(err) {
			return stores.RemediationDispatchRecord{}, err
		}
		existing, loadErr := findRemediationDispatchByIdempotencyKeyDirect(ctx, s.tx, scope, record.IdempotencyKey)
		if loadErr != nil {
			return stores.RemediationDispatchRecord{}, loadErr
		}
		record = mergeRelationalRemediationDispatchRecord(record, existing)
		record.DispatchID = existing.DispatchID
		if err := updateRelationalRemediationDispatchRecord(ctx, s.tx, scope, record); err != nil {
			return stores.RemediationDispatchRecord{}, err
		}
		return record, nil
	}
	return record, nil
}

func mergeRelationalRemediationDispatchRecord(record, existing stores.RemediationDispatchRecord) stores.RemediationDispatchRecord {
	if existing.DocumentID != "" && record.DocumentID == "" {
		record.DocumentID = existing.DocumentID
	}
	if existing.IdempotencyKey != "" && record.IdempotencyKey == "" {
		record.IdempotencyKey = existing.IdempotencyKey
	}
	if existing.Mode != "" && record.Mode == "" {
		record.Mode = existing.Mode
	}
	if existing.CommandID != "" && record.CommandID == "" {
		record.CommandID = existing.CommandID
	}
	if existing.CorrelationID != "" && record.CorrelationID == "" {
		record.CorrelationID = existing.CorrelationID
	}
	if existing.EnqueuedAt != nil && record.EnqueuedAt == nil {
		record.EnqueuedAt = cloneRelationalTimePtr(existing.EnqueuedAt)
	}
	if existing.MaxAttempts > record.MaxAttempts {
		record.MaxAttempts = existing.MaxAttempts
	}
	record.Accepted = record.Accepted || existing.Accepted
	return record
}

func updateRelationalRemediationDispatchRecord(ctx context.Context, tx bun.IDB, scope stores.Scope, record stores.RemediationDispatchRecord) error {
	_, err := tx.NewUpdate().
		Model(&relationalRemediationDispatchModel{RemediationDispatchRecord: record}).
		Column("document_id", "idempotency_key", "mode", "command_id", "correlation_id", "accepted", "max_attempts", "enqueued_at", "updated_at").
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("dispatch_id = ?", record.DispatchID).
		Exec(ctx)
	return err
}

func (s *relationalTxStore) SaveGuardedEffect(ctx context.Context, scope stores.Scope, record guardedeffects.Record) (guardedeffects.Record, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return guardedeffects.Record{}, err
	}
	record.EffectID = normalizeRelationalID(record.EffectID)
	if record.EffectID == "" {
		record.EffectID = uuid.NewString()
	}
	record.Kind = strings.TrimSpace(record.Kind)
	record.GroupType = strings.TrimSpace(record.GroupType)
	record.GroupID = normalizeRelationalID(record.GroupID)
	record.SubjectType = strings.TrimSpace(record.SubjectType)
	record.SubjectID = normalizeRelationalID(record.SubjectID)
	if record.Kind == "" {
		return guardedeffects.Record{}, relationalInvalidRecordError("guarded_effects", "kind", "required")
	}
	if record.SubjectType == "" {
		return guardedeffects.Record{}, relationalInvalidRecordError("guarded_effects", "subject_type", "required")
	}
	if record.SubjectID == "" {
		return guardedeffects.Record{}, relationalInvalidRecordError("guarded_effects", "subject_id", "required")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Status = guardedeffects.NormalizeStatus(record.Status)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	record.DispatchedAt = cloneRelationalTimePtr(record.DispatchedAt)
	record.FinalizedAt = cloneRelationalTimePtr(record.FinalizedAt)
	record.AbortedAt = cloneRelationalTimePtr(record.AbortedAt)
	record.RetryAt = cloneRelationalTimePtr(record.RetryAt)

	current, err := loadGuardedEffectRecord(ctx, s.tx, record.EffectID)
	if err != nil && !relationalIsNotFoundError(err) {
		return guardedeffects.Record{}, err
	}
	if err == nil {
		record = mergeRelationalGuardedEffectRecord(record, current)
		if err := updateRelationalGuardedEffectRecord(ctx, s.tx, scope, record); err != nil {
			return guardedeffects.Record{}, err
		}
		return record, nil
	}

	if _, err := s.tx.NewInsert().Model(&relationalGuardedEffectModel{GuardedEffectRecord: stores.GuardedEffectRecord{Record: record}}).Exec(ctx); err != nil {
		if !relationalIsUniqueConstraintError(err) {
			return guardedeffects.Record{}, err
		}
		existing, loadErr := loadGuardedEffectByIdempotencyKeyRecord(ctx, s.tx, scope, record.IdempotencyKey)
		if loadErr != nil {
			return guardedeffects.Record{}, loadErr
		}
		record.EffectID = existing.EffectID
		return s.SaveGuardedEffect(ctx, scope, record)
	}
	return record, nil
}

func mergeRelationalGuardedEffectRecord(record, current guardedeffects.Record) guardedeffects.Record {
	record = mergeRelationalGuardedEffectScalarFields(record, current)
	record = mergeRelationalGuardedEffectTimeFields(record, current)
	if record.CreatedAt.IsZero() {
		record.CreatedAt = current.CreatedAt
	}
	return record
}

func mergeRelationalGuardedEffectScalarFields(record, current guardedeffects.Record) guardedeffects.Record {
	if record.IdempotencyKey == "" {
		record.IdempotencyKey = current.IdempotencyKey
	}
	if record.CorrelationID == "" {
		record.CorrelationID = current.CorrelationID
	}
	if record.GuardPolicy == "" {
		record.GuardPolicy = current.GuardPolicy
	}
	if record.GroupType == "" {
		record.GroupType = current.GroupType
	}
	if record.GroupID == "" {
		record.GroupID = current.GroupID
	}
	if record.DispatchID == "" {
		record.DispatchID = current.DispatchID
	}
	if record.PreparePayloadJSON == "" {
		record.PreparePayloadJSON = current.PreparePayloadJSON
	}
	if record.DispatchPayloadJSON == "" {
		record.DispatchPayloadJSON = current.DispatchPayloadJSON
	}
	if record.ResultPayloadJSON == "" {
		record.ResultPayloadJSON = current.ResultPayloadJSON
	}
	if record.ErrorJSON == "" {
		record.ErrorJSON = current.ErrorJSON
	}
	if record.AttemptCount < current.AttemptCount {
		record.AttemptCount = current.AttemptCount
	}
	if record.MaxAttempts < current.MaxAttempts {
		record.MaxAttempts = current.MaxAttempts
	}
	return record
}

func mergeRelationalGuardedEffectTimeFields(record, current guardedeffects.Record) guardedeffects.Record {
	if record.DispatchedAt == nil {
		record.DispatchedAt = cloneRelationalTimePtr(current.DispatchedAt)
	}
	if record.FinalizedAt == nil {
		record.FinalizedAt = cloneRelationalTimePtr(current.FinalizedAt)
	}
	if record.AbortedAt == nil {
		record.AbortedAt = cloneRelationalTimePtr(current.AbortedAt)
	}
	if record.RetryAt == nil {
		record.RetryAt = cloneRelationalTimePtr(current.RetryAt)
	}
	return record
}

func updateRelationalGuardedEffectRecord(ctx context.Context, tx bun.IDB, scope stores.Scope, record guardedeffects.Record) error {
	_, err := tx.NewUpdate().
		Model(&relationalGuardedEffectModel{GuardedEffectRecord: stores.GuardedEffectRecord{Record: record}}).
		Column("kind", "group_type", "group_id", "subject_type", "subject_id", "idempotency_key", "correlation_id", "status", "attempt_count", "max_attempts", "guard_policy", "prepare_payload_json", "dispatch_payload_json", "result_payload_json", "error_json", "dispatch_id", "created_at", "updated_at", "dispatched_at", "finalized_at", "aborted_at", "retry_at").
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("effect_id = ?", record.EffectID).
		Exec(ctx)
	return err
}

func findAgreementRevisionRequestByDedupeRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, sourceAgreementID, revisionKind, idempotencyKey string) (stores.AgreementRevisionRequestRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementRevisionRequestRecord{}, err
	}
	sourceAgreementID = normalizeRelationalID(sourceAgreementID)
	revisionKind = strings.ToLower(strings.TrimSpace(revisionKind))
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if sourceAgreementID == "" {
		return stores.AgreementRevisionRequestRecord{}, relationalInvalidRecordError("agreement_revision_requests", "source_agreement_id", "required")
	}
	if revisionKind == "" {
		return stores.AgreementRevisionRequestRecord{}, relationalInvalidRecordError("agreement_revision_requests", "revision_kind", "required")
	}
	if idempotencyKey == "" {
		return stores.AgreementRevisionRequestRecord{}, relationalInvalidRecordError("agreement_revision_requests", "idempotency_key", "required")
	}
	record := stores.AgreementRevisionRequestRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("source_agreement_id = ?", sourceAgreementID).
		Where("revision_kind = ?", revisionKind).
		Where("idempotency_key = ?", idempotencyKey).
		Scan(ctx)
	if err != nil {
		return stores.AgreementRevisionRequestRecord{}, mapSQLNotFound(err, "agreement_revision_requests", idempotencyKey)
	}
	return record, nil
}

func (s *relationalTxStore) CreateDraft(ctx context.Context, scope stores.Scope, record stores.AgreementRecord) (stores.AgreementRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	record = normalizeRelationalAgreementDraftRecord(scope, record)
	if err := validateRelationalAgreementDraftRecord(record); err != nil {
		return stores.AgreementRecord{}, err
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.AgreementRecord{}, relationalUniqueConstraintError(err, "agreements", "id")
	}
	return record, nil
}

func normalizeRelationalAgreementDraftRecord(scope stores.Scope, record stores.AgreementRecord) stores.AgreementRecord {
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.DocumentID = normalizeRelationalID(record.DocumentID)
	record.WorkflowKind = strings.TrimSpace(record.WorkflowKind)
	if record.WorkflowKind == "" {
		record.WorkflowKind = stores.AgreementWorkflowKindStandard
	}
	record.RootAgreementID = normalizeRelationalID(record.RootAgreementID)
	if record.RootAgreementID == "" {
		record.RootAgreementID = record.ID
	}
	record.ParentAgreementID = normalizeRelationalID(record.ParentAgreementID)
	record.ParentExecutedSHA256 = strings.TrimSpace(record.ParentExecutedSHA256)
	record.ReviewStatus = stores.NormalizeAgreementReviewStatus(record.ReviewStatus)
	record.ReviewGate = stores.NormalizeAgreementReviewGate(record.ReviewGate)
	record.SourceType = strings.TrimSpace(record.SourceType)
	if record.SourceType == "" {
		record.SourceType = stores.SourceTypeUpload
	}
	record.SourceGoogleFileID = strings.TrimSpace(record.SourceGoogleFileID)
	record.SourceGoogleDocURL = strings.TrimSpace(record.SourceGoogleDocURL)
	record.SourceModifiedTime = cloneRelationalTimePtr(record.SourceModifiedTime)
	record.SourceExportedAt = cloneRelationalTimePtr(record.SourceExportedAt)
	record.SourceExportedByUserID = normalizeRelationalID(record.SourceExportedByUserID)
	record.SourceMimeType = strings.TrimSpace(record.SourceMimeType)
	record.SourceIngestionMode = strings.TrimSpace(record.SourceIngestionMode)
	if record.Status == "" {
		record.Status = stores.AgreementStatusDraft
	}
	if record.Version <= 0 {
		record.Version = 1
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	return record
}

func validateRelationalAgreementDraftRecord(record stores.AgreementRecord) error {
	if record.DocumentID == "" {
		return relationalInvalidRecordError("agreements", "document_id", "required")
	}
	if err := validateRelationalAgreementWorkflowKind(record.WorkflowKind); err != nil {
		return err
	}
	if err := validateRelationalAgreementReviewState(record); err != nil {
		return err
	}
	if err := validateRelationalAgreementSourceType(record.SourceType); err != nil {
		return err
	}
	if record.Status != stores.AgreementStatusDraft {
		return relationalInvalidRecordError("agreements", "status", "must start in draft")
	}
	return nil
}

func validateRelationalAgreementWorkflowKind(workflowKind string) error {
	switch workflowKind {
	case stores.AgreementWorkflowKindStandard, stores.AgreementWorkflowKindCorrection, stores.AgreementWorkflowKindAmendment:
		return nil
	default:
		return relationalInvalidRecordError("agreements", "workflow_kind", "unsupported workflow kind")
	}
}

func validateRelationalAgreementReviewState(record stores.AgreementRecord) error {
	if record.ReviewStatus == "" {
		return relationalInvalidRecordError("agreements", "review_status", "unsupported review status")
	}
	if record.ReviewGate == "" {
		return relationalInvalidRecordError("agreements", "review_gate", "unsupported review gate")
	}
	return nil
}

func validateRelationalAgreementSourceType(sourceType string) error {
	if sourceType == stores.SourceTypeUpload || sourceType == stores.SourceTypeGoogleDrive {
		return nil
	}
	return relationalInvalidRecordError("agreements", "source_type", "unsupported source type")
}

func (s *relationalTxStore) BeginAgreementRevisionRequest(ctx context.Context, scope stores.Scope, input stores.AgreementRevisionRequestInput) (stores.AgreementRevisionRequestRecord, bool, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementRevisionRequestRecord{}, false, err
	}
	record := stores.AgreementRevisionRequestRecord{
		ID:                uuid.NewString(),
		TenantID:          scope.TenantID,
		OrgID:             scope.OrgID,
		SourceAgreementID: normalizeRelationalID(input.SourceAgreementID),
		RevisionKind:      strings.ToLower(strings.TrimSpace(input.RevisionKind)),
		IdempotencyKey:    strings.TrimSpace(input.IdempotencyKey),
		RequestHash:       strings.TrimSpace(input.RequestHash),
		ActorID:           normalizeRelationalID(input.ActorID),
		CreatedAt:         relationalTimeOrNow(input.Now),
		UpdatedAt:         relationalTimeOrNow(input.Now),
	}
	if record.SourceAgreementID == "" {
		return stores.AgreementRevisionRequestRecord{}, false, relationalInvalidRecordError("agreement_revision_requests", "source_agreement_id", "required")
	}
	if record.RevisionKind == "" {
		return stores.AgreementRevisionRequestRecord{}, false, relationalInvalidRecordError("agreement_revision_requests", "revision_kind", "required")
	}
	if record.IdempotencyKey == "" {
		return stores.AgreementRevisionRequestRecord{}, false, relationalInvalidRecordError("agreement_revision_requests", "idempotency_key", "required")
	}
	if record.RequestHash == "" {
		return stores.AgreementRevisionRequestRecord{}, false, relationalInvalidRecordError("agreement_revision_requests", "request_hash", "required")
	}
	result, err := s.tx.NewInsert().
		Model(&record).
		On("CONFLICT (tenant_id, org_id, source_agreement_id, revision_kind, idempotency_key) DO NOTHING").
		Exec(ctx)
	if err != nil {
		return stores.AgreementRevisionRequestRecord{}, false, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return stores.AgreementRevisionRequestRecord{}, false, err
	}
	if rows == 0 {
		existing, loadErr := findAgreementRevisionRequestByDedupeRecord(ctx, s.tx, scope, record.SourceAgreementID, record.RevisionKind, record.IdempotencyKey)
		if loadErr != nil {
			return stores.AgreementRevisionRequestRecord{}, false, loadErr
		}
		if existing.RequestHash != "" && existing.RequestHash != record.RequestHash {
			return stores.AgreementRevisionRequestRecord{}, false, relationalVersionConflictError("agreement_revision_requests", existing.ID, 0, 0)
		}
		return existing, false, nil
	}
	return record, true, nil
}

func (s *relationalTxStore) CompleteAgreementRevisionRequest(ctx context.Context, scope stores.Scope, requestID, createdAgreementID string, updatedAt time.Time) (stores.AgreementRevisionRequestRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementRevisionRequestRecord{}, err
	}
	requestID = normalizeRelationalID(requestID)
	createdAgreementID = normalizeRelationalID(createdAgreementID)
	if requestID == "" {
		return stores.AgreementRevisionRequestRecord{}, relationalInvalidRecordError("agreement_revision_requests", "id", "required")
	}
	if createdAgreementID == "" {
		return stores.AgreementRevisionRequestRecord{}, relationalInvalidRecordError("agreement_revision_requests", "created_agreement_id", "required")
	}
	record, err := loadAgreementRevisionRequestRecord(ctx, s.tx, scope, requestID)
	if err != nil {
		return stores.AgreementRevisionRequestRecord{}, err
	}
	if record.CreatedAgreementID != "" && record.CreatedAgreementID != createdAgreementID {
		return stores.AgreementRevisionRequestRecord{}, relationalVersionConflictError("agreement_revision_requests", requestID, 0, 0)
	}
	record.CreatedAgreementID = createdAgreementID
	record.UpdatedAt = relationalTimeOrNow(updatedAt)
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.AgreementRevisionRequestRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) GetAgreementRevisionRequest(ctx context.Context, scope stores.Scope, id string) (stores.AgreementRevisionRequestRecord, error) {
	return loadAgreementRevisionRequestRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) UpdateDraft(ctx context.Context, scope stores.Scope, id string, patch stores.AgreementDraftPatch, expectedVersion int64) (stores.AgreementRecord, error) {
	record, err := loadAgreementRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	if record.Status != stores.AgreementStatusDraft {
		return stores.AgreementRecord{}, relationalImmutableAgreementError(record.ID, record.Status)
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.AgreementRecord{}, relationalVersionConflictError("agreements", id, expectedVersion, record.Version)
	}
	if patch.Title != nil {
		record.Title = strings.TrimSpace(*patch.Title)
	}
	if patch.Message != nil {
		record.Message = strings.TrimSpace(*patch.Message)
	}
	if patch.DocumentID != nil {
		record.DocumentID = normalizeRelationalID(*patch.DocumentID)
		if record.DocumentID == "" {
			return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "document_id", "required")
		}
	}
	if patch.ReviewStatus != nil {
		record.ReviewStatus = stores.NormalizeAgreementReviewStatus(*patch.ReviewStatus)
		if record.ReviewStatus == "" {
			return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "review_status", "unsupported review status")
		}
	}
	if patch.ReviewGate != nil {
		record.ReviewGate = stores.NormalizeAgreementReviewGate(*patch.ReviewGate)
		if record.ReviewGate == "" {
			return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "review_gate", "unsupported review gate")
		}
	}
	if patch.CommentsEnabled != nil {
		record.CommentsEnabled = *patch.CommentsEnabled
	}
	record.Version++
	record.UpdatedAt = time.Now().UTC()
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.AgreementRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) UpdateAgreementReviewProjection(ctx context.Context, scope stores.Scope, id string, patch stores.AgreementReviewProjectionPatch) (stores.AgreementRecord, error) {
	record, err := loadAgreementRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	if patch.ReviewStatus != nil {
		record.ReviewStatus = stores.NormalizeAgreementReviewStatus(*patch.ReviewStatus)
		if record.ReviewStatus == "" {
			return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "review_status", "unsupported review status")
		}
	}
	if patch.ReviewGate != nil {
		record.ReviewGate = stores.NormalizeAgreementReviewGate(*patch.ReviewGate)
		if record.ReviewGate == "" {
			return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "review_gate", "unsupported review gate")
		}
	}
	if patch.CommentsEnabled != nil {
		record.CommentsEnabled = *patch.CommentsEnabled
	}
	record.Version++
	record.UpdatedAt = time.Now().UTC()
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.AgreementRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) UpdateAgreementDeliveryState(ctx context.Context, scope stores.Scope, id string, patch stores.AgreementDeliveryStatePatch) (stores.AgreementRecord, error) {
	record, err := loadAgreementRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	if patch.DeliveryStatus != nil {
		record.DeliveryStatus = strings.TrimSpace(*patch.DeliveryStatus)
	}
	if patch.DeliveryEffectID != nil {
		record.DeliveryEffectID = normalizeRelationalID(*patch.DeliveryEffectID)
	}
	if patch.LastDeliveryError != nil {
		record.LastDeliveryError = strings.TrimSpace(*patch.LastDeliveryError)
	}
	if patch.LastDeliveryAttemptAt != nil {
		record.LastDeliveryAttemptAt = cloneRelationalTimePtr(patch.LastDeliveryAttemptAt)
	}
	record.UpdatedAt = time.Now().UTC()
	if _, err := s.tx.NewUpdate().
		Model(&record).
		Column("delivery_status", "delivery_effect_id", "last_delivery_error", "last_delivery_attempt_at", "updated_at").
		Where("tenant_id = ?", record.TenantID).
		Where("org_id = ?", record.OrgID).
		Where("id = ?", record.ID).
		Exec(ctx); err != nil {
		return stores.AgreementRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) Transition(ctx context.Context, scope stores.Scope, id string, input stores.AgreementTransitionInput) (stores.AgreementRecord, error) {
	record, err := loadAgreementRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	toStatus := strings.TrimSpace(input.ToStatus)
	if toStatus == "" {
		return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "status", "required")
	}
	if input.ExpectedVersion > 0 && record.Version != input.ExpectedVersion {
		return stores.AgreementRecord{}, relationalVersionConflictError("agreements", id, input.ExpectedVersion, record.Version)
	}
	now := time.Now().UTC()
	record.Status = toStatus
	record.UpdatedAt = now
	record.Version++
	switch toStatus {
	case stores.AgreementStatusSent:
		record.SentAt = cloneRelationalTimePtr(&now)
	case stores.AgreementStatusCompleted:
		record.CompletedAt = cloneRelationalTimePtr(&now)
	case stores.AgreementStatusVoided:
		record.VoidedAt = cloneRelationalTimePtr(&now)
	case stores.AgreementStatusDeclined:
		record.DeclinedAt = cloneRelationalTimePtr(&now)
	case stores.AgreementStatusExpired:
		record.ExpiredAt = cloneRelationalTimePtr(&now)
	}
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.AgreementRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) UpsertParticipantDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.ParticipantDraftPatch, expectedVersion int64) (stores.ParticipantRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.ParticipantRecord{}, err
	}
	agreementID = normalizeRelationalID(agreementID)
	if agreementID == "" {
		return stores.ParticipantRecord{}, relationalInvalidRecordError("participants", "agreement_id", "required")
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return stores.ParticipantRecord{}, err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return stores.ParticipantRecord{}, relationalImmutableAgreementError(agreement.ID, agreement.Status)
	}

	participantID := normalizeRelationalID(patch.ID)
	if participantID == "" {
		participantID = uuid.NewString()
	}

	record, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, participantID)
	exists := err == nil
	if err != nil && !relationalIsNotFoundError(err) {
		return stores.ParticipantRecord{}, err
	}
	if !exists {
		record = newRelationalParticipantDraftRecord(scope, agreementID, participantID)
	} else if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.ParticipantRecord{}, relationalVersionConflictError("participants", participantID, expectedVersion, record.Version)
	}

	applyRelationalParticipantDraftPatch(&record, patch)
	if err := validateRelationalParticipantDraftRecord(record); err != nil {
		return stores.ParticipantRecord{}, err
	}
	record.UpdatedAt = time.Now().UTC()
	if exists {
		record.Version++
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.ParticipantRecord{}, err
		}
		return record, nil
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.ParticipantRecord{}, relationalUniqueConstraintError(err, "participants", "id")
	}
	return record, nil
}

func newRelationalParticipantDraftRecord(scope stores.Scope, agreementID, participantID string) stores.ParticipantRecord {
	return stores.ParticipantRecord{
		ID:           participantID,
		TenantID:     scope.TenantID,
		OrgID:        scope.OrgID,
		AgreementID:  agreementID,
		Role:         stores.RecipientRoleSigner,
		Notify:       true,
		SigningStage: 1,
		Version:      1,
		CreatedAt:    time.Now().UTC(),
	}
}

func applyRelationalParticipantDraftPatch(record *stores.ParticipantRecord, patch stores.ParticipantDraftPatch) {
	if patch.Email != nil {
		record.Email = strings.TrimSpace(*patch.Email)
	}
	if patch.Name != nil {
		record.Name = strings.TrimSpace(*patch.Name)
	}
	if patch.Role != nil {
		record.Role = strings.ToLower(strings.TrimSpace(*patch.Role))
	}
	if patch.Notify != nil {
		record.Notify = *patch.Notify
	}
	if patch.SigningStage != nil {
		record.SigningStage = *patch.SigningStage
	}
	if record.Role == "" {
		record.Role = stores.RecipientRoleSigner
	}
}

func validateRelationalParticipantDraftRecord(record stores.ParticipantRecord) error {
	if record.Email == "" {
		return relationalInvalidRecordError("participants", "email", "required")
	}
	if record.Role != stores.RecipientRoleSigner && record.Role != stores.RecipientRoleCC {
		return relationalInvalidRecordError("participants", "role", "must be signer or cc")
	}
	if record.SigningStage <= 0 {
		return relationalInvalidRecordError("participants", "signing_stage", "must be positive")
	}
	return nil
}

func (s *relationalTxStore) DeleteParticipantDraft(ctx context.Context, scope stores.Scope, agreementID, participantID string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return relationalImmutableAgreementError(agreementID, agreement.Status)
	}
	_, loadErr := loadParticipantRecord(ctx, s.tx, scope, agreementID, participantID)
	if loadErr != nil {
		return loadErr
	}
	if err := s.deleteParticipantFieldDefinitions(ctx, scope, agreementID, participantID); err != nil {
		return err
	}
	if err := s.deleteParticipantFieldValues(ctx, scope, agreementID, participantID); err != nil {
		return err
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.ParticipantRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("id = ?", participantID).
		Exec(ctx); err != nil {
		return err
	}
	return nil
}

func (s *relationalTxStore) deleteParticipantFieldDefinitions(ctx context.Context, scope stores.Scope, agreementID, participantID string) error {
	definitions, err := listFieldDefinitionRecords(ctx, s.tx, scope, agreementID)
	if err != nil {
		return err
	}
	for _, definition := range definitions {
		if normalizeRelationalID(definition.ParticipantID) != normalizeRelationalID(participantID) {
			continue
		}
		if err := s.deleteFieldDefinitionArtifacts(ctx, scope, agreementID, definition.ID); err != nil {
			return err
		}
	}
	return nil
}

func (s *relationalTxStore) deleteParticipantFieldValues(ctx context.Context, scope stores.Scope, agreementID, participantID string) error {
	if _, err := s.tx.NewDelete().
		Model((*stores.FieldValueRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("recipient_id = ?", participantID).
		Exec(ctx); err != nil {
		return err
	}
	return nil
}

func (s *relationalTxStore) UpsertRecipientDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.RecipientDraftPatch, expectedVersion int64) (stores.RecipientRecord, error) {
	participantPatch := stores.ParticipantDraftPatch{
		ID:     patch.ID,
		Email:  patch.Email,
		Name:   patch.Name,
		Role:   patch.Role,
		Notify: patch.Notify,
	}
	if patch.SigningOrder != nil {
		participantPatch.SigningStage = patch.SigningOrder
	}
	record, err := s.UpsertParticipantDraft(ctx, scope, agreementID, participantPatch, expectedVersion)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	return relationalParticipantToRecipient(record), nil
}

func (s *relationalTxStore) DeleteRecipientDraft(ctx context.Context, scope stores.Scope, agreementID, recipientID string) error {
	return s.DeleteParticipantDraft(ctx, scope, agreementID, recipientID)
}

func (s *relationalTxStore) TouchRecipientView(ctx context.Context, scope stores.Scope, agreementID, recipientID string, viewedAt time.Time) (stores.RecipientRecord, error) {
	if viewedAt.IsZero() {
		viewedAt = time.Now().UTC()
	}
	record, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, recipientID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if _, err := loadAgreementRecord(ctx, s.tx, scope, agreementID); err != nil {
		return stores.RecipientRecord{}, err
	}
	if record.FirstViewAt == nil {
		record.FirstViewAt = cloneRelationalTimePtr(&viewedAt)
	}
	record.LastViewAt = cloneRelationalTimePtr(&viewedAt)
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.RecipientRecord{}, err
	}
	return relationalParticipantToRecipient(record), nil
}

func (s *relationalTxStore) CompleteRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID string, completedAt time.Time, expectedVersion int64) (stores.RecipientRecord, error) {
	if completedAt.IsZero() {
		completedAt = time.Now().UTC()
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
		return stores.RecipientRecord{}, relationalInvalidSignerStateError("recipient completion requires sent or in_progress agreement status")
	}
	record, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, recipientID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.RecipientRecord{}, relationalVersionConflictError("participants", recipientID, expectedVersion, record.Version)
	}
	record.CompletedAt = cloneRelationalTimePtr(&completedAt)
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.RecipientRecord{}, err
	}
	return relationalParticipantToRecipient(record), nil
}

func (s *relationalTxStore) DeclineRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID, reason string, declinedAt time.Time, expectedVersion int64) (stores.RecipientRecord, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return stores.RecipientRecord{}, relationalInvalidRecordError("participants", "decline_reason", "required")
	}
	if declinedAt.IsZero() {
		declinedAt = time.Now().UTC()
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if agreement.Status != stores.AgreementStatusSent && agreement.Status != stores.AgreementStatusInProgress {
		return stores.RecipientRecord{}, relationalInvalidSignerStateError("recipient decline requires sent or in_progress agreement status")
	}
	record, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, recipientID)
	if err != nil {
		return stores.RecipientRecord{}, err
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.RecipientRecord{}, relationalVersionConflictError("participants", recipientID, expectedVersion, record.Version)
	}
	record.DeclinedAt = cloneRelationalTimePtr(&declinedAt)
	record.DeclineReason = reason
	record.UpdatedAt = time.Now().UTC()
	record.Version++
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.RecipientRecord{}, err
	}
	return relationalParticipantToRecipient(record), nil
}

func (s *relationalTxStore) UpsertFieldDefinitionDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldDefinitionDraftPatch) (stores.FieldDefinitionRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.FieldDefinitionRecord{}, err
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return stores.FieldDefinitionRecord{}, err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return stores.FieldDefinitionRecord{}, relationalImmutableAgreementError(agreementID, agreement.Status)
	}
	definitionID := normalizeRelationalID(patch.ID)
	if definitionID == "" {
		definitionID = uuid.NewString()
	}
	record, err := loadFieldDefinitionRecord(ctx, s.tx, scope, agreementID, definitionID)
	exists := err == nil
	if err != nil && !relationalIsNotFoundError(err) {
		return stores.FieldDefinitionRecord{}, err
	}
	if !exists {
		record = newRelationalFieldDefinitionDraftRecord(scope, agreementID, definitionID)
	}
	applyRelationalFieldDefinitionDraftPatch(&record, patch)
	if validationErr := validateRelationalFieldDefinitionDraftRecord(record); validationErr != nil {
		return stores.FieldDefinitionRecord{}, validationErr
	}
	participant, err := loadParticipantRecord(ctx, s.tx, scope, agreementID, record.ParticipantID)
	if err != nil {
		return stores.FieldDefinitionRecord{}, err
	}
	if participant.Role != stores.RecipientRoleSigner {
		return stores.FieldDefinitionRecord{}, relationalInvalidSignerStateError("field definitions cannot target cc participants")
	}
	record.UpdatedAt = time.Now().UTC()
	if exists {
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.FieldDefinitionRecord{}, err
		}
		return record, nil
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.FieldDefinitionRecord{}, relationalUniqueConstraintError(err, "field_definitions", "id")
	}
	return record, nil
}

func newRelationalFieldDefinitionDraftRecord(scope stores.Scope, agreementID, definitionID string) stores.FieldDefinitionRecord {
	return stores.FieldDefinitionRecord{
		ID:             definitionID,
		TenantID:       scope.TenantID,
		OrgID:          scope.OrgID,
		AgreementID:    agreementID,
		Type:           stores.FieldTypeText,
		Required:       false,
		ValidationJSON: "",
		CreatedAt:      time.Now().UTC(),
	}
}

func applyRelationalFieldDefinitionDraftPatch(record *stores.FieldDefinitionRecord, patch stores.FieldDefinitionDraftPatch) {
	if patch.ParticipantID != nil {
		record.ParticipantID = normalizeRelationalID(*patch.ParticipantID)
	}
	if patch.Type != nil {
		record.Type = strings.TrimSpace(*patch.Type)
	}
	if patch.Required != nil {
		record.Required = *patch.Required
	}
	if patch.ValidationJSON != nil {
		record.ValidationJSON = strings.TrimSpace(*patch.ValidationJSON)
	}
	if record.Type == stores.FieldTypeDateSigned {
		record.Required = true
	}
}

func validateRelationalFieldDefinitionDraftRecord(record stores.FieldDefinitionRecord) error {
	if !isSupportedRelationalFieldType(record.Type) {
		return relationalInvalidRecordError("field_definitions", "field_type", "unsupported type")
	}
	if record.ParticipantID == "" {
		return relationalInvalidRecordError("field_definitions", "participant_id", "required")
	}
	return nil
}

func isSupportedRelationalFieldType(fieldType string) bool {
	switch strings.TrimSpace(fieldType) {
	case stores.FieldTypeSignature,
		stores.FieldTypeName,
		stores.FieldTypeDateSigned,
		stores.FieldTypeText,
		stores.FieldTypeCheckbox,
		stores.FieldTypeInitials:
		return true
	default:
		return false
	}
}

func (s *relationalTxStore) DeleteFieldDefinitionDraft(ctx context.Context, scope stores.Scope, agreementID, fieldDefinitionID string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return relationalImmutableAgreementError(agreementID, agreement.Status)
	}
	if _, err := loadFieldDefinitionRecord(ctx, s.tx, scope, agreementID, fieldDefinitionID); err != nil {
		return err
	}
	return s.deleteFieldDefinitionArtifacts(ctx, scope, agreementID, fieldDefinitionID)
}

func (s *relationalTxStore) deleteFieldDefinitionArtifacts(ctx context.Context, scope stores.Scope, agreementID, fieldDefinitionID string) error {
	if _, err := s.tx.NewDelete().
		Model((*stores.FieldValueRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("field_id IN (SELECT id FROM field_instances WHERE tenant_id = ? AND org_id = ? AND agreement_id = ? AND field_definition_id = ?)", scope.TenantID, scope.OrgID, agreementID, fieldDefinitionID).
		Exec(ctx); err != nil {
		return err
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.FieldInstanceRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("field_definition_id = ?", fieldDefinitionID).
		Exec(ctx); err != nil {
		return err
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.FieldDefinitionRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("id = ?", fieldDefinitionID).
		Exec(ctx); err != nil {
		return err
	}
	return nil
}

func (s *relationalTxStore) UpsertFieldInstanceDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldInstanceDraftPatch) (stores.FieldInstanceRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return stores.FieldInstanceRecord{}, relationalImmutableAgreementError(agreementID, agreement.Status)
	}
	instanceID := normalizeRelationalID(patch.ID)
	if instanceID == "" {
		instanceID = uuid.NewString()
	}
	record, err := loadFieldInstanceRecord(ctx, s.tx, scope, agreementID, instanceID)
	exists := err == nil
	if err != nil && !relationalIsNotFoundError(err) {
		return stores.FieldInstanceRecord{}, err
	}
	if !exists {
		record = newRelationalFieldInstanceDraftRecord(scope, agreementID, instanceID)
	}
	applyRelationalFieldInstanceLinkPatch(&record, patch)
	applyRelationalFieldInstanceGeometryPatch(&record, patch)
	applyRelationalFieldInstancePlacementPatch(&record, patch)
	if validationErr := validateRelationalFieldInstanceDraftRecord(&record); validationErr != nil {
		return stores.FieldInstanceRecord{}, validationErr
	}
	definition, err := loadFieldDefinitionRecord(ctx, s.tx, scope, agreementID, record.FieldDefinitionID)
	if err != nil {
		return stores.FieldInstanceRecord{}, err
	}
	mergeRelationalFieldInstanceLinkGroup(&record, definition)
	record.UpdatedAt = time.Now().UTC()
	if exists {
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.FieldInstanceRecord{}, err
		}
		return record, nil
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.FieldInstanceRecord{}, relationalUniqueConstraintError(err, "field_instances", "id")
	}
	return record, nil
}

func newRelationalFieldInstanceDraftRecord(scope stores.Scope, agreementID, instanceID string) stores.FieldInstanceRecord {
	return stores.FieldInstanceRecord{
		ID:              instanceID,
		TenantID:        scope.TenantID,
		OrgID:           scope.OrgID,
		AgreementID:     agreementID,
		PageNumber:      1,
		Width:           150,
		Height:          32,
		TabIndex:        0,
		PlacementSource: stores.PlacementSourceManual,
		CreatedAt:       time.Now().UTC(),
	}
}

func applyRelationalFieldInstanceLinkPatch(record *stores.FieldInstanceRecord, patch stores.FieldInstanceDraftPatch) {
	if patch.FieldDefinitionID != nil {
		record.FieldDefinitionID = normalizeRelationalID(*patch.FieldDefinitionID)
	}
	if patch.LinkGroupID != nil {
		record.LinkGroupID = strings.TrimSpace(*patch.LinkGroupID)
	}
	if patch.LinkedFromFieldID != nil {
		record.LinkedFromFieldID = normalizeRelationalID(*patch.LinkedFromFieldID)
	}
	if patch.IsUnlinked != nil {
		record.IsUnlinked = *patch.IsUnlinked
	}
}

func applyRelationalFieldInstanceGeometryPatch(record *stores.FieldInstanceRecord, patch stores.FieldInstanceDraftPatch) {
	if patch.PageNumber != nil {
		record.PageNumber = *patch.PageNumber
	}
	if patch.X != nil {
		record.X = *patch.X
	}
	if patch.Y != nil {
		record.Y = *patch.Y
	}
	if patch.Width != nil {
		record.Width = *patch.Width
	}
	if patch.Height != nil {
		record.Height = *patch.Height
	}
	if patch.TabIndex != nil {
		record.TabIndex = *patch.TabIndex
	}
}

func applyRelationalFieldInstancePlacementPatch(record *stores.FieldInstanceRecord, patch stores.FieldInstanceDraftPatch) {
	if patch.Label != nil {
		record.Label = strings.TrimSpace(*patch.Label)
	}
	if patch.AppearanceJSON != nil {
		record.AppearanceJSON = strings.TrimSpace(*patch.AppearanceJSON)
	}
	if patch.PlacementSource != nil {
		record.PlacementSource = strings.ToLower(strings.TrimSpace(*patch.PlacementSource))
	}
	if patch.ResolverID != nil {
		record.ResolverID = strings.ToLower(strings.TrimSpace(*patch.ResolverID))
	}
	if patch.Confidence != nil {
		record.Confidence = *patch.Confidence
	}
	if patch.PlacementRunID != nil {
		record.PlacementRunID = normalizeRelationalID(*patch.PlacementRunID)
	}
	if patch.ManualOverride != nil {
		record.ManualOverride = *patch.ManualOverride
	}
}

func validateRelationalFieldInstanceDraftRecord(record *stores.FieldInstanceRecord) error {
	if record.FieldDefinitionID == "" {
		return relationalInvalidRecordError("field_instances", "field_definition_id", "required")
	}
	if record.PageNumber <= 0 {
		return relationalInvalidRecordError("field_instances", "page_number", "must be positive")
	}
	if record.Width <= 0 || record.Height <= 0 {
		return relationalInvalidRecordError("field_instances", "width|height", "must be positive")
	}
	if record.PlacementSource == "" {
		record.PlacementSource = stores.PlacementSourceManual
	}
	if record.PlacementSource != stores.PlacementSourceAuto &&
		record.PlacementSource != stores.PlacementSourceManual &&
		record.PlacementSource != stores.PlacementSourceAutoLinked {
		return relationalInvalidRecordError("field_instances", "placement_source", "must be auto, manual, or auto_linked")
	}
	if record.Confidence < 0 {
		record.Confidence = 0
	}
	if record.Confidence > 1 {
		record.Confidence = 1
	}
	return nil
}

func mergeRelationalFieldInstanceLinkGroup(record *stores.FieldInstanceRecord, definition stores.FieldDefinitionRecord) {
	if strings.TrimSpace(record.LinkGroupID) == "" {
		record.LinkGroupID = strings.TrimSpace(definition.LinkGroupID)
	}
}

func (s *relationalTxStore) DeleteFieldInstanceDraft(ctx context.Context, scope stores.Scope, agreementID, fieldInstanceID string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	if err != nil {
		return err
	}
	if agreement.Status != stores.AgreementStatusDraft {
		return relationalImmutableAgreementError(agreementID, agreement.Status)
	}
	instance, err := loadFieldInstanceRecord(ctx, s.tx, scope, agreementID, fieldInstanceID)
	if err != nil {
		return err
	}
	_, deleteErr := s.tx.NewDelete().
		Model((*stores.FieldValueRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("field_id = ?", fieldInstanceID).
		Exec(ctx)
	if deleteErr != nil {
		return deleteErr
	}
	_, deleteErr = s.tx.NewDelete().
		Model((*stores.FieldInstanceRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("id = ?", fieldInstanceID).
		Exec(ctx)
	if deleteErr != nil {
		return deleteErr
	}
	remaining, err := s.tx.NewSelect().
		Model((*stores.FieldInstanceRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("field_definition_id = ?", instance.FieldDefinitionID).
		Count(ctx)
	if err != nil {
		return err
	}
	if remaining == 0 {
		if _, err := s.tx.NewDelete().
			Model((*stores.FieldDefinitionRecord)(nil)).
			Where("tenant_id = ?", scope.TenantID).
			Where("org_id = ?", scope.OrgID).
			Where("agreement_id = ?", agreementID).
			Where("id = ?", instance.FieldDefinitionID).
			Exec(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (s *relationalTxStore) UpsertFieldDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldDraftPatch) (stores.FieldRecord, error) {
	fieldID := normalizeRelationalID(patch.ID)
	definitionID := fieldID
	if fieldID != "" {
		instances, err := listFieldInstanceRecords(ctx, s.tx, scope, agreementID)
		if err == nil {
			for _, instance := range instances {
				if instance.ID == fieldID {
					definitionID = instance.FieldDefinitionID
					break
				}
			}
		}
	}
	definition, err := s.UpsertFieldDefinitionDraft(ctx, scope, agreementID, stores.FieldDefinitionDraftPatch{
		ID:            definitionID,
		ParticipantID: patch.RecipientID,
		Type:          patch.Type,
		Required:      patch.Required,
	})
	if err != nil {
		return stores.FieldRecord{}, err
	}
	instance, err := s.UpsertFieldInstanceDraft(ctx, scope, agreementID, stores.FieldInstanceDraftPatch{
		ID:                fieldID,
		FieldDefinitionID: &definition.ID,
		PageNumber:        patch.PageNumber,
		X:                 patch.PosX,
		Y:                 patch.PosY,
		Width:             patch.Width,
		Height:            patch.Height,
		PlacementSource:   patch.PlacementSource,
		LinkGroupID:       patch.LinkGroupID,
		LinkedFromFieldID: patch.LinkedFromFieldID,
		IsUnlinked:        patch.IsUnlinked,
	})
	if err != nil {
		return stores.FieldRecord{}, err
	}
	return stores.FieldRecord{
		ID:                instance.ID,
		FieldDefinitionID: definition.ID,
		TenantID:          scope.TenantID,
		OrgID:             scope.OrgID,
		AgreementID:       agreementID,
		RecipientID:       definition.ParticipantID,
		Type:              definition.Type,
		PageNumber:        instance.PageNumber,
		PosX:              instance.X,
		PosY:              instance.Y,
		Width:             instance.Width,
		Height:            instance.Height,
		PlacementSource:   instance.PlacementSource,
		LinkGroupID:       instance.LinkGroupID,
		LinkedFromFieldID: instance.LinkedFromFieldID,
		IsUnlinked:        instance.IsUnlinked,
		Required:          definition.Required,
		CreatedAt:         instance.CreatedAt,
		UpdatedAt:         instance.UpdatedAt,
	}, nil
}

func (s *relationalTxStore) DeleteFieldDraft(ctx context.Context, scope stores.Scope, agreementID, fieldID string) error {
	return s.DeleteFieldInstanceDraft(ctx, scope, agreementID, fieldID)
}

func (s *relationalTxStore) CreateDraftSession(ctx context.Context, scope stores.Scope, record stores.DraftRecord) (stores.DraftRecord, bool, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.DraftRecord{}, false, err
	}
	record, err = prepareRelationalDraftRecord(scope, record)
	if err != nil {
		return stores.DraftRecord{}, false, err
	}
	existing, found, err := s.findReusableDraftSession(ctx, scope, record.CreatedByUserID, record.WizardID, record.UpdatedAt)
	if err != nil {
		return stores.DraftRecord{}, false, err
	}
	if found {
		existing.UpdatedAt = record.UpdatedAt
		existing.ExpiresAt = record.ExpiresAt
		if err := updateScopedModelByID(ctx, s.tx, &existing, existing.TenantID, existing.OrgID, existing.ID); err != nil {
			return stores.DraftRecord{}, false, err
		}
		return existing, true, nil
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		if replayed, ok := s.reloadDraftSessionOnInsertConflict(ctx, scope, record, err); ok {
			return replayed, true, nil
		}
		return stores.DraftRecord{}, false, relationalUniqueConstraintError(err, "drafts", "id")
	}
	return record, false, nil
}

func prepareRelationalDraftRecord(scope stores.Scope, record stores.DraftRecord) (stores.DraftRecord, error) {
	record.WizardID = strings.TrimSpace(record.WizardID)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	if record.WizardID == "" {
		return stores.DraftRecord{}, relationalInvalidRecordError("drafts", "wizard_id", "required")
	}
	if record.CreatedByUserID == "" {
		return stores.DraftRecord{}, relationalInvalidRecordError("drafts", "created_by_user_id", "required")
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.DocumentID = normalizeRelationalID(record.DocumentID)
	record.Title = strings.TrimSpace(record.Title)
	record.WizardStateJSON = strings.TrimSpace(record.WizardStateJSON)
	if record.WizardStateJSON == "" {
		record.WizardStateJSON = "{}"
	}
	if record.CurrentStep <= 0 {
		record.CurrentStep = 1
	}
	if record.CurrentStep > 6 {
		return stores.DraftRecord{}, relationalInvalidRecordError("drafts", "current_step", "must be between 1 and 6")
	}
	if record.Revision <= 0 {
		record.Revision = 1
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	if record.ExpiresAt.IsZero() {
		record.ExpiresAt = record.UpdatedAt.Add(relationalDefaultDraftTTL).UTC()
	} else {
		record.ExpiresAt = record.ExpiresAt.UTC()
	}
	return record, nil
}

func (s *relationalTxStore) findReusableDraftSession(ctx context.Context, scope stores.Scope, createdByUserID, wizardID string, referenceNow time.Time) (stores.DraftRecord, bool, error) {
	existing, err := findDraftByWizardRecord(ctx, s.tx, scope, createdByUserID, wizardID)
	if relationalIsNotFoundError(err) {
		return stores.DraftRecord{}, false, nil
	}
	if err != nil {
		return stores.DraftRecord{}, false, err
	}
	if existing.ExpiresAt.IsZero() || existing.ExpiresAt.After(referenceNow) {
		return existing, true, nil
	}
	if err := deleteScopedModelByID(ctx, s.tx, &existing, existing.TenantID, existing.OrgID, existing.ID); err != nil {
		return stores.DraftRecord{}, false, err
	}
	return stores.DraftRecord{}, false, nil
}

func (s *relationalTxStore) reloadDraftSessionOnInsertConflict(ctx context.Context, scope stores.Scope, record stores.DraftRecord, insertErr error) (stores.DraftRecord, bool) {
	if relationalUniqueConstraintError(insertErr, "drafts", "id") == insertErr {
		return stores.DraftRecord{}, false
	}
	replayed, err := findDraftByWizardRecord(ctx, s.tx, scope, record.CreatedByUserID, record.WizardID)
	if err != nil {
		return stores.DraftRecord{}, false
	}
	return replayed, true
}

func (s *relationalTxStore) UpdateDraftSession(ctx context.Context, scope stores.Scope, id string, patch stores.DraftPatch, expectedRevision int64) (stores.DraftRecord, error) {
	record, err := loadDraftRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.DraftRecord{}, err
	}
	if expectedRevision <= 0 {
		return stores.DraftRecord{}, relationalInvalidRecordError("drafts", "expected_revision", "required")
	}
	if record.Revision != expectedRevision {
		return stores.DraftRecord{}, relationalVersionConflictError("drafts", id, expectedRevision, record.Revision)
	}
	if err := applyRelationalDraftPatch(&record, patch); err != nil {
		return stores.DraftRecord{}, err
	}
	record.Revision++
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.DraftRecord{}, err
	}
	return record, nil
}

func applyRelationalDraftPatch(record *stores.DraftRecord, patch stores.DraftPatch) error {
	if patch.WizardStateJSON != nil {
		record.WizardStateJSON = strings.TrimSpace(*patch.WizardStateJSON)
		if record.WizardStateJSON == "" {
			record.WizardStateJSON = "{}"
		}
	}
	if patch.Title != nil {
		record.Title = strings.TrimSpace(*patch.Title)
	}
	if patch.CurrentStep != nil {
		if *patch.CurrentStep <= 0 || *patch.CurrentStep > 6 {
			return relationalInvalidRecordError("drafts", "current_step", "must be between 1 and 6")
		}
		record.CurrentStep = *patch.CurrentStep
	}
	if patch.DocumentID != nil {
		record.DocumentID = normalizeRelationalID(*patch.DocumentID)
	}
	if patch.UpdatedAt != nil && !patch.UpdatedAt.IsZero() {
		record.UpdatedAt = patch.UpdatedAt.UTC()
	} else {
		record.UpdatedAt = time.Now().UTC()
	}
	if patch.ExpiresAt != nil && !patch.ExpiresAt.IsZero() {
		record.ExpiresAt = patch.ExpiresAt.UTC()
	} else if record.ExpiresAt.IsZero() {
		record.ExpiresAt = record.UpdatedAt.Add(relationalDefaultDraftTTL).UTC()
	}
	return nil
}

func (s *relationalTxStore) DeleteDraftSession(ctx context.Context, scope stores.Scope, id string) error {
	record, err := loadDraftRecord(ctx, s.tx, scope, id)
	if err != nil {
		return err
	}
	if err := deleteScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return err
	}
	return nil
}

func (s *relationalTxStore) DeleteExpiredDraftSessions(ctx context.Context, before time.Time) (int, error) {
	if before.IsZero() {
		before = time.Now().UTC()
	}
	result, err := s.tx.NewDelete().
		Model((*stores.DraftRecord)(nil)).
		Where("expires_at <= ?", before.UTC()).
		Exec(ctx)
	if err != nil {
		return 0, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return int(rows), nil
}

func (s *relationalTxStore) UpsertFieldValue(ctx context.Context, scope stores.Scope, value stores.FieldValueRecord, expectedVersion int64) (stores.FieldValueRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	value = normalizeRelationalFieldValueRecord(scope, value)
	if validationErr := validateRelationalFieldValueRecord(value); validationErr != nil {
		return stores.FieldValueRecord{}, validationErr
	}
	existingByField, hasByField, err := s.findExistingFieldValueByLogicalKey(ctx, scope, value)
	if err != nil {
		return stores.FieldValueRecord{}, err
	}
	if hasByField && value.ID != existingByField.ID {
		value.ID = existingByField.ID
	}
	if err := s.validateFieldValueArtifact(ctx, scope, value); err != nil {
		return stores.FieldValueRecord{}, err
	}
	if hasByField {
		return s.updateExistingFieldValue(ctx, value, existingByField, expectedVersion)
	}
	return s.insertFieldValue(ctx, scope, value)
}

func normalizeRelationalFieldValueRecord(scope stores.Scope, value stores.FieldValueRecord) stores.FieldValueRecord {
	value.AgreementID = normalizeRelationalID(value.AgreementID)
	value.RecipientID = normalizeRelationalID(value.RecipientID)
	value.FieldID = normalizeRelationalID(value.FieldID)
	value.SignatureArtifactID = normalizeRelationalID(value.SignatureArtifactID)
	value.ID = normalizeRelationalID(value.ID)
	if value.ID == "" {
		value.ID = uuid.NewString()
	}
	value.TenantID = scope.TenantID
	value.OrgID = scope.OrgID
	return value
}

func validateRelationalFieldValueRecord(value stores.FieldValueRecord) error {
	if value.AgreementID == "" {
		return relationalInvalidRecordError("field_values", "agreement_id", "required")
	}
	if value.RecipientID == "" {
		return relationalInvalidRecordError("field_values", "recipient_id", "required")
	}
	if value.FieldID == "" {
		return relationalInvalidRecordError("field_values", "field_id", "required")
	}
	return nil
}

func (s *relationalTxStore) findExistingFieldValueByLogicalKey(ctx context.Context, scope stores.Scope, value stores.FieldValueRecord) (stores.FieldValueRecord, bool, error) {
	existing, err := findFieldValueByLogicalKey(ctx, s.tx, scope, value.AgreementID, value.RecipientID, value.FieldID)
	if relationalIsNotFoundError(err) {
		return stores.FieldValueRecord{}, false, nil
	}
	if err != nil {
		return stores.FieldValueRecord{}, false, err
	}
	return existing, true, nil
}

func (s *relationalTxStore) validateFieldValueArtifact(ctx context.Context, scope stores.Scope, value stores.FieldValueRecord) error {
	if value.SignatureArtifactID == "" {
		return nil
	}
	artifact, err := s.GetSignatureArtifact(ctx, scope, value.SignatureArtifactID)
	if err != nil {
		return err
	}
	if artifact.AgreementID != value.AgreementID || artifact.RecipientID != value.RecipientID {
		return relationalInvalidRecordError("field_values", "signature_artifact_id", "artifact does not belong to signer agreement scope")
	}
	return nil
}

func (s *relationalTxStore) updateExistingFieldValue(ctx context.Context, value, existing stores.FieldValueRecord, expectedVersion int64) (stores.FieldValueRecord, error) {
	if expectedVersion > 0 && existing.Version != expectedVersion {
		return stores.FieldValueRecord{}, relationalVersionConflictError("field_values", value.ID, expectedVersion, existing.Version)
	}
	value.CreatedAt = existing.CreatedAt
	value.Version = existing.Version + 1
	value.UpdatedAt = time.Now().UTC()
	if err := updateScopedModelByID(ctx, s.tx, &value, value.TenantID, value.OrgID, value.ID); err != nil {
		return stores.FieldValueRecord{}, err
	}
	return value, nil
}

func (s *relationalTxStore) insertFieldValue(ctx context.Context, scope stores.Scope, value stores.FieldValueRecord) (stores.FieldValueRecord, error) {
	if value.Version <= 0 {
		value.Version = 1
	}
	value.CreatedAt = relationalTimeOrNow(value.CreatedAt)
	value.UpdatedAt = time.Now().UTC()
	if _, err := s.tx.NewInsert().Model(&value).Exec(ctx); err != nil {
		if reloaded, ok := s.reloadFieldValueOnInsertConflict(ctx, scope, value, err); ok {
			return reloaded, nil
		}
		return stores.FieldValueRecord{}, relationalUniqueConstraintError(err, "field_values", "id")
	}
	return value, nil
}

func (s *relationalTxStore) reloadFieldValueOnInsertConflict(ctx context.Context, scope stores.Scope, value stores.FieldValueRecord, insertErr error) (stores.FieldValueRecord, bool) {
	if relationalUniqueConstraintError(insertErr, "field_values", "id") == insertErr {
		return stores.FieldValueRecord{}, false
	}
	reloaded, err := findFieldValueByLogicalKey(ctx, s.tx, scope, value.AgreementID, value.RecipientID, value.FieldID)
	if err != nil {
		return stores.FieldValueRecord{}, false
	}
	return reloaded, true
}

func (s *relationalTxStore) CreateSignatureArtifact(ctx context.Context, scope stores.Scope, record stores.SignatureArtifactRecord) (stores.SignatureArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SignatureArtifactRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.RecipientID = normalizeRelationalID(record.RecipientID)
	record.Type = strings.TrimSpace(record.Type)
	record.ObjectKey = strings.TrimSpace(record.ObjectKey)
	record.SHA256 = strings.TrimSpace(record.SHA256)
	if record.AgreementID == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "agreement_id", "required")
	}
	if record.RecipientID == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "recipient_id", "required")
	}
	if record.Type == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "type", "required")
	}
	if record.ObjectKey == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "object_key", "required")
	}
	if record.SHA256 == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "sha256", "required")
	}
	_, loadErr := loadAgreementRecord(ctx, s.tx, scope, record.AgreementID)
	if loadErr != nil {
		return stores.SignatureArtifactRecord{}, loadErr
	}
	participant, err := loadParticipantRecord(ctx, s.tx, scope, record.AgreementID, record.RecipientID)
	if err != nil {
		return stores.SignatureArtifactRecord{}, err
	}
	if participant.AgreementID != record.AgreementID {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "recipient_id", "recipient does not belong to agreement")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SignatureArtifactRecord{}, relationalUniqueConstraintError(err, "signature_artifacts", "id")
	}
	return record, nil
}

func (s *relationalTxStore) CreateSigningToken(ctx context.Context, scope stores.Scope, record stores.SigningTokenRecord) (stores.SigningTokenRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SigningTokenRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.RecipientID = normalizeRelationalID(record.RecipientID)
	record.TokenHash = strings.TrimSpace(record.TokenHash)
	if record.AgreementID == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "agreement_id", "required")
	}
	if record.RecipientID == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "recipient_id", "required")
	}
	if record.TokenHash == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "token_hash", "required")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	if record.Status == "" {
		record.Status = stores.SigningTokenStatusActive
	}
	record.ActivatedAt = cloneRelationalTimePtr(record.ActivatedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SigningTokenRecord{}, relationalUniqueConstraintError(err, "signing_tokens", "id|token_hash")
	}
	return record, nil
}

func (s *relationalTxStore) SaveSigningToken(ctx context.Context, scope stores.Scope, record stores.SigningTokenRecord) (stores.SigningTokenRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SigningTokenRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "id", "required")
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.RecipientID = normalizeRelationalID(record.RecipientID)
	record.TokenHash = strings.TrimSpace(record.TokenHash)
	if record.AgreementID == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "agreement_id", "required")
	}
	if record.RecipientID == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "recipient_id", "required")
	}
	if record.TokenHash == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "token_hash", "required")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.ActivatedAt = cloneRelationalTimePtr(record.ActivatedAt)
	record.RevokedAt = cloneRelationalTimePtr(record.RevokedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.SigningTokenRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) RevokeActiveSigningTokens(ctx context.Context, scope stores.Scope, agreementID, recipientID string, revokedAt time.Time) (int, error) {
	return s.revokeActiveScopedTokens(
		ctx,
		scope,
		"signing_tokens",
		"agreement_id",
		agreementID,
		"recipient_id",
		recipientID,
		stores.SigningTokenStatusRevoked,
		stores.SigningTokenStatusActive,
		(*stores.SigningTokenRecord)(nil),
		revokedAt,
	)
}

func (s *relationalTxStore) CreateReviewSessionToken(ctx context.Context, scope stores.Scope, record stores.ReviewSessionTokenRecord) (stores.ReviewSessionTokenRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.ReviewSessionTokenRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.ReviewID = normalizeRelationalID(record.ReviewID)
	record.ParticipantID = normalizeRelationalID(record.ParticipantID)
	record.TokenHash = strings.TrimSpace(record.TokenHash)
	if record.AgreementID == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "agreement_id", "required")
	}
	if record.ReviewID == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "review_id", "required")
	}
	if record.ParticipantID == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "participant_id", "required")
	}
	if record.TokenHash == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "token_hash", "required")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Status = stores.NormalizeReviewSessionTokenStatus(record.Status)
	if record.Status == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "status", "unsupported review session token status")
	}
	record.RevokedAt = cloneRelationalTimePtr(record.RevokedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.ReviewSessionTokenRecord{}, relationalUniqueConstraintError(err, "review_session_tokens", "id|token_hash")
	}
	return record, nil
}

func (s *relationalTxStore) GetReviewSessionToken(ctx context.Context, scope stores.Scope, id string) (stores.ReviewSessionTokenRecord, error) {
	return loadReviewSessionTokenRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) GetReviewSessionTokenByHash(ctx context.Context, scope stores.Scope, tokenHash string) (stores.ReviewSessionTokenRecord, error) {
	return loadReviewSessionTokenByHashRecord(ctx, s.tx, scope, tokenHash)
}

func (s *relationalTxStore) ListReviewSessionTokens(ctx context.Context, scope stores.Scope, agreementID, participantID string) ([]stores.ReviewSessionTokenRecord, error) {
	return listReviewSessionTokenRecords(ctx, s.tx, scope, agreementID, participantID)
}

func (s *relationalTxStore) SaveReviewSessionToken(ctx context.Context, scope stores.Scope, record stores.ReviewSessionTokenRecord) (stores.ReviewSessionTokenRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.ReviewSessionTokenRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "id", "required")
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.ReviewID = normalizeRelationalID(record.ReviewID)
	record.ParticipantID = normalizeRelationalID(record.ParticipantID)
	record.TokenHash = strings.TrimSpace(record.TokenHash)
	if record.AgreementID == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "agreement_id", "required")
	}
	if record.ReviewID == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "review_id", "required")
	}
	if record.ParticipantID == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "participant_id", "required")
	}
	if record.TokenHash == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "token_hash", "required")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Status = stores.NormalizeReviewSessionTokenStatus(record.Status)
	if record.Status == "" {
		return stores.ReviewSessionTokenRecord{}, relationalInvalidRecordError("review_session_tokens", "status", "unsupported review session token status")
	}
	record.RevokedAt = cloneRelationalTimePtr(record.RevokedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.ReviewSessionTokenRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) RevokeActiveReviewSessionTokens(ctx context.Context, scope stores.Scope, agreementID, participantID string, revokedAt time.Time) (int, error) {
	return s.revokeActiveScopedTokens(
		ctx,
		scope,
		"review_session_tokens",
		"agreement_id",
		agreementID,
		"participant_id",
		participantID,
		stores.ReviewSessionTokenStatusRevoked,
		stores.ReviewSessionTokenStatusActive,
		(*stores.ReviewSessionTokenRecord)(nil),
		revokedAt,
	)
}

func (s *relationalTxStore) CreatePublicSignerSessionToken(ctx context.Context, scope stores.Scope, record stores.PublicSignerSessionTokenRecord) (stores.PublicSignerSessionTokenRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.PublicSignerSessionTokenRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.SubjectKind = stores.NormalizePublicSignerSessionSubjectKind(record.SubjectKind)
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.RecipientID = normalizeRelationalID(record.RecipientID)
	record.ReviewID = normalizeRelationalID(record.ReviewID)
	record.ParticipantID = normalizeRelationalID(record.ParticipantID)
	record.SigningTokenID = normalizeRelationalID(record.SigningTokenID)
	record.ReviewTokenID = normalizeRelationalID(record.ReviewTokenID)
	record.TokenHash = strings.TrimSpace(record.TokenHash)
	if record.SubjectKind == "" {
		return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "subject_kind", "required")
	}
	if record.AgreementID == "" {
		return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "agreement_id", "required")
	}
	if record.TokenHash == "" {
		return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "token_hash", "required")
	}
	switch record.SubjectKind {
	case stores.PublicSignerSessionSubjectKindSigning:
		if record.RecipientID == "" {
			return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "recipient_id", "required")
		}
		if record.SigningTokenID == "" {
			return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "signing_token_id", "required")
		}
	case stores.PublicSignerSessionSubjectKindReview:
		if record.ReviewID == "" {
			return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "review_id", "required")
		}
		if record.ParticipantID == "" {
			return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "participant_id", "required")
		}
		if record.ReviewTokenID == "" {
			return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "review_token_id", "required")
		}
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Status = stores.NormalizePublicSignerSessionTokenStatus(record.Status)
	if record.Status == "" {
		return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "status", "unsupported public signer session token status")
	}
	record.RevokedAt = cloneRelationalTimePtr(record.RevokedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.PublicSignerSessionTokenRecord{}, relationalUniqueConstraintError(err, "public_signer_session_tokens", "id|token_hash")
	}
	return record, nil
}

func (s *relationalTxStore) GetPublicSignerSessionToken(ctx context.Context, scope stores.Scope, id string) (stores.PublicSignerSessionTokenRecord, error) {
	return loadPublicSignerSessionTokenRecord(ctx, s.tx, scope, id)
}

func (s *relationalTxStore) GetPublicSignerSessionTokenByHash(ctx context.Context, scope stores.Scope, tokenHash string) (stores.PublicSignerSessionTokenRecord, error) {
	return loadPublicSignerSessionTokenByHashRecord(ctx, s.tx, scope, tokenHash)
}

func (s *relationalTxStore) ListPublicSignerSessionTokens(ctx context.Context, scope stores.Scope, agreementID, recipientID, participantID string) ([]stores.PublicSignerSessionTokenRecord, error) {
	return listPublicSignerSessionTokenRecords(ctx, s.tx, scope, agreementID, recipientID, participantID)
}

func (s *relationalTxStore) SavePublicSignerSessionToken(ctx context.Context, scope stores.Scope, record stores.PublicSignerSessionTokenRecord) (stores.PublicSignerSessionTokenRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.PublicSignerSessionTokenRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	record.SubjectKind = stores.NormalizePublicSignerSessionSubjectKind(record.SubjectKind)
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.RecipientID = normalizeRelationalID(record.RecipientID)
	record.ReviewID = normalizeRelationalID(record.ReviewID)
	record.ParticipantID = normalizeRelationalID(record.ParticipantID)
	record.SigningTokenID = normalizeRelationalID(record.SigningTokenID)
	record.ReviewTokenID = normalizeRelationalID(record.ReviewTokenID)
	record.TokenHash = strings.TrimSpace(record.TokenHash)
	if record.ID == "" {
		return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "id", "required")
	}
	if record.SubjectKind == "" {
		return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "subject_kind", "required")
	}
	if record.AgreementID == "" {
		return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "agreement_id", "required")
	}
	if record.TokenHash == "" {
		return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "token_hash", "required")
	}
	switch record.SubjectKind {
	case stores.PublicSignerSessionSubjectKindSigning:
		if record.RecipientID == "" {
			return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "recipient_id", "required")
		}
		if record.SigningTokenID == "" {
			return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "signing_token_id", "required")
		}
	case stores.PublicSignerSessionSubjectKindReview:
		if record.ReviewID == "" {
			return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "review_id", "required")
		}
		if record.ParticipantID == "" {
			return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "participant_id", "required")
		}
		if record.ReviewTokenID == "" {
			return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "review_token_id", "required")
		}
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Status = stores.NormalizePublicSignerSessionTokenStatus(record.Status)
	if record.Status == "" {
		return stores.PublicSignerSessionTokenRecord{}, relationalInvalidRecordError("public_signer_session_tokens", "status", "unsupported public signer session token status")
	}
	record.RevokedAt = cloneRelationalTimePtr(record.RevokedAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.PublicSignerSessionTokenRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) RevokeActivePublicSignerSessionTokens(ctx context.Context, scope stores.Scope, agreementID, recipientID, participantID string, revokedAt time.Time) (int, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return 0, err
	}
	agreementID = normalizeRelationalID(agreementID)
	recipientID = normalizeRelationalID(recipientID)
	participantID = normalizeRelationalID(participantID)
	if agreementID == "" {
		return 0, relationalInvalidRecordError("public_signer_session_tokens", "agreement_id", "required")
	}
	if recipientID == "" && participantID == "" {
		return 0, relationalInvalidRecordError("public_signer_session_tokens", "recipient_id|participant_id", "required")
	}
	if revokedAt.IsZero() {
		revokedAt = time.Now().UTC()
	}
	query := s.tx.NewUpdate().
		Model((*stores.PublicSignerSessionTokenRecord)(nil)).
		Set("status = ?", stores.PublicSignerSessionTokenStatusRevoked).
		Set("revoked_at = ?", revokedAt.UTC()).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("status = ?", stores.PublicSignerSessionTokenStatusActive)
	if recipientID != "" {
		query = query.Where("recipient_id = ?", recipientID)
	}
	if participantID != "" {
		query = query.Where("participant_id = ?", participantID)
	}
	result, err := query.Exec(ctx)
	if err != nil {
		return 0, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return int(rows), nil
}

func appendScopedAuditEventRecord[T any](
	ctx context.Context,
	idb bun.IDB,
	scope stores.Scope,
	event T,
	table string,
	initialize func(stores.Scope, T) T,
	validate func(T) error,
) (T, error) {
	record, err := relationalCreatePreparedRecord(
		ctx,
		idb,
		scope,
		event,
		func(_ context.Context, _ bun.IDB, scope stores.Scope, event T) (T, error) {
			return initialize(scope, event), nil
		},
		func(event T, _ *T) (T, error) {
			return event, nil
		},
		func(_ context.Context, _ bun.IDB, _ stores.Scope, event T) error {
			return validate(event)
		},
	)
	if err != nil {
		var zero T
		return zero, relationalUniqueConstraintError(err, table, "id")
	}
	return record, nil
}

func initializeDraftAuditEventRecord(scope stores.Scope, event stores.DraftAuditEventRecord) stores.DraftAuditEventRecord {
	event.ID, event.TenantID, event.OrgID = relationalInitializeScopedID(event.ID, scope)
	event.DraftID = normalizeRelationalID(event.DraftID)
	event.CreatedAt = relationalTimeOrNow(event.CreatedAt)
	return event
}

func validateDraftAuditEventRecord(event stores.DraftAuditEventRecord) error {
	if event.DraftID == "" {
		return relationalInvalidRecordError("draft_audit_events", "draft_id", "required")
	}
	if strings.TrimSpace(event.EventType) == "" {
		return relationalInvalidRecordError("draft_audit_events", "event_type", "required")
	}
	return nil
}

func initializeAuditEventRecord(scope stores.Scope, event stores.AuditEventRecord) stores.AuditEventRecord {
	event.ID, event.TenantID, event.OrgID = relationalInitializeScopedID(event.ID, scope)
	event.AgreementID = normalizeRelationalID(event.AgreementID)
	event.CreatedAt = relationalTimeOrNow(event.CreatedAt)
	return event
}

func validateAuditEventRecord(event stores.AuditEventRecord) error {
	if event.AgreementID == "" {
		return relationalInvalidRecordError("audit_events", "agreement_id", "required")
	}
	if strings.TrimSpace(event.EventType) == "" {
		return relationalInvalidRecordError("audit_events", "event_type", "required")
	}
	return nil
}

func (s *relationalTxStore) AppendDraftEvent(ctx context.Context, scope stores.Scope, event stores.DraftAuditEventRecord) (stores.DraftAuditEventRecord, error) {
	return appendScopedAuditEventRecord(
		ctx,
		s.tx,
		scope,
		event,
		"draft_audit_events",
		initializeDraftAuditEventRecord,
		validateDraftAuditEventRecord,
	)
}

func (s *relationalTxStore) ListDraftEvents(ctx context.Context, scope stores.Scope, draftID string, query stores.DraftAuditEventQuery) ([]stores.DraftAuditEventRecord, error) {
	return listDraftAuditEventRecords(ctx, s.tx, scope, draftID, query)
}

func (s *relationalTxStore) Append(ctx context.Context, scope stores.Scope, event stores.AuditEventRecord) (stores.AuditEventRecord, error) {
	return appendScopedAuditEventRecord(
		ctx,
		s.tx,
		scope,
		event,
		"audit_events",
		initializeAuditEventRecord,
		validateAuditEventRecord,
	)
}

func (s *relationalTxStore) SaveAgreementArtifacts(ctx context.Context, scope stores.Scope, record stores.AgreementArtifactRecord) (stores.AgreementArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	input, err := normalizeRelationalAgreementArtifactInput(record)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	if _, loadErr := loadAgreementRecord(ctx, s.tx, scope, input.agreementID); loadErr != nil {
		return stores.AgreementArtifactRecord{}, loadErr
	}
	now := time.Now().UTC()
	current, exists, err := loadCurrentAgreementArtifact(ctx, s.tx, scope, input.agreementID, now)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	if err := applyRelationalAgreementArtifactInput(&current, input); err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	current.UpdatedAt = now
	if exists {
		if err := updateScopedAgreementArtifact(ctx, s.tx, &current, current.TenantID, current.OrgID, current.AgreementID); err != nil {
			return stores.AgreementArtifactRecord{}, err
		}
		return current, nil
	}
	if _, err := s.tx.NewInsert().Model(&current).Exec(ctx); err != nil {
		return stores.AgreementArtifactRecord{}, relationalUniqueConstraintError(err, "agreement_artifacts", "agreement_id")
	}
	return current, nil
}

type relationalAgreementArtifactInput struct {
	agreementID   string
	executedKey   string
	executedSHA   string
	certKey       string
	certSHA       string
	correlationID string
}

func normalizeRelationalAgreementArtifactInput(record stores.AgreementArtifactRecord) (relationalAgreementArtifactInput, error) {
	input := relationalAgreementArtifactInput{
		agreementID:   normalizeRelationalID(record.AgreementID),
		executedKey:   strings.TrimSpace(record.ExecutedObjectKey),
		executedSHA:   strings.TrimSpace(record.ExecutedSHA256),
		certKey:       strings.TrimSpace(record.CertificateObjectKey),
		certSHA:       strings.TrimSpace(record.CertificateSHA256),
		correlationID: strings.TrimSpace(record.CorrelationID),
	}
	if input.agreementID == "" {
		return relationalAgreementArtifactInput{}, relationalInvalidRecordError("agreement_artifacts", "agreement_id", "required")
	}
	if (input.executedKey == "") != (input.executedSHA == "") {
		return relationalAgreementArtifactInput{}, relationalInvalidRecordError("agreement_artifacts", "executed_object_key|executed_sha256", "must both be set")
	}
	if (input.certKey == "") != (input.certSHA == "") {
		return relationalAgreementArtifactInput{}, relationalInvalidRecordError("agreement_artifacts", "certificate_object_key|certificate_sha256", "must both be set")
	}
	return input, nil
}

func loadCurrentAgreementArtifact(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string, now time.Time) (stores.AgreementArtifactRecord, bool, error) {
	current := stores.AgreementArtifactRecord{}
	err := idb.NewSelect().
		Model(&current).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Scan(ctx)
	if err == nil {
		return current, true, nil
	}
	if mapped := mapSQLNotFound(err, "agreement_artifacts", agreementID); !relationalIsNotFoundError(mapped) {
		return stores.AgreementArtifactRecord{}, false, err
	}
	return stores.AgreementArtifactRecord{
		AgreementID: agreementID,
		TenantID:    scope.TenantID,
		OrgID:       scope.OrgID,
		CreatedAt:   now,
	}, false, nil
}

func applyRelationalAgreementArtifactInput(current *stores.AgreementArtifactRecord, input relationalAgreementArtifactInput) error {
	var err error
	if current.ExecutedObjectKey, err = relationalMergeImmutableArtifactValue(current.ExecutedObjectKey, input.executedKey, "executed_object_key"); err != nil {
		return err
	}
	if current.ExecutedSHA256, err = relationalMergeImmutableArtifactValue(current.ExecutedSHA256, input.executedSHA, "executed_sha256"); err != nil {
		return err
	}
	if current.CertificateObjectKey, err = relationalMergeImmutableArtifactValue(current.CertificateObjectKey, input.certKey, "certificate_object_key"); err != nil {
		return err
	}
	if current.CertificateSHA256, err = relationalMergeImmutableArtifactValue(current.CertificateSHA256, input.certSHA, "certificate_sha256"); err != nil {
		return err
	}
	if input.correlationID != "" {
		current.CorrelationID = input.correlationID
	}
	return nil
}

func (s *relationalTxStore) CreateEmailLog(ctx context.Context, scope stores.Scope, record stores.EmailLogRecord) (stores.EmailLogRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.EmailLogRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.RecipientID = normalizeRelationalID(record.RecipientID)
	record.TemplateCode = strings.TrimSpace(record.TemplateCode)
	record.ProviderMessageID = strings.TrimSpace(record.ProviderMessageID)
	record.Status = strings.TrimSpace(record.Status)
	if record.AgreementID == "" {
		return stores.EmailLogRecord{}, relationalInvalidRecordError("email_logs", "agreement_id", "required")
	}
	if record.TemplateCode == "" {
		return stores.EmailLogRecord{}, relationalInvalidRecordError("email_logs", "template_code", "required")
	}
	if record.Status == "" {
		record.Status = "queued"
	}
	if record.AttemptCount <= 0 {
		record.AttemptCount = 1
	}
	if record.MaxAttempts <= 0 {
		record.MaxAttempts = 3
	}
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.NextRetryAt = cloneRelationalTimePtr(record.NextRetryAt)
	record.SentAt = cloneRelationalTimePtr(record.SentAt)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	if _, err := loadAgreementRecord(ctx, s.tx, scope, record.AgreementID); err != nil {
		return stores.EmailLogRecord{}, err
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.EmailLogRecord{}, relationalUniqueConstraintError(err, "email_logs", "id")
	}
	return record, nil
}

func (s *relationalTxStore) UpdateEmailLog(ctx context.Context, scope stores.Scope, id string, patch stores.EmailLogRecord) (stores.EmailLogRecord, error) {
	record, err := loadEmailLogRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.EmailLogRecord{}, err
	}
	applyRelationalEmailLogMetadataPatch(&record, patch)
	applyRelationalEmailLogTimePatch(&record, patch)
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.EmailLogRecord{}, err
	}
	return record, nil
}

func applyRelationalEmailLogMetadataPatch(record *stores.EmailLogRecord, patch stores.EmailLogRecord) {
	if status := strings.TrimSpace(patch.Status); status != "" {
		record.Status = status
	}
	if providerMessageID := strings.TrimSpace(patch.ProviderMessageID); providerMessageID != "" {
		record.ProviderMessageID = providerMessageID
	}
	if patch.AttemptCount > 0 {
		record.AttemptCount = patch.AttemptCount
	}
	if patch.MaxAttempts > 0 {
		record.MaxAttempts = patch.MaxAttempts
	}
	if correlationID := strings.TrimSpace(patch.CorrelationID); correlationID != "" {
		record.CorrelationID = correlationID
	}
	if patch.FailureReason != "" || record.Status == "failed" || record.Status == "retrying" {
		record.FailureReason = strings.TrimSpace(patch.FailureReason)
	}
	if record.Status == "sent" {
		record.FailureReason = ""
	}
}

func applyRelationalEmailLogTimePatch(record *stores.EmailLogRecord, patch stores.EmailLogRecord) {
	if patch.NextRetryAt != nil {
		record.NextRetryAt = cloneRelationalTimePtr(patch.NextRetryAt)
	} else if record.Status == "sent" || record.Status == "failed" {
		record.NextRetryAt = nil
	}
	if patch.SentAt != nil {
		record.SentAt = cloneRelationalTimePtr(patch.SentAt)
	} else if record.Status == "sent" && record.SentAt == nil {
		now := time.Now().UTC()
		record.SentAt = cloneRelationalTimePtr(&now)
	}
	if patch.UpdatedAt.IsZero() {
		record.UpdatedAt = time.Now().UTC()
	} else {
		record.UpdatedAt = patch.UpdatedAt.UTC()
	}
}

func normalizeBeginJobRunInput(input stores.JobRunInput) (stores.JobRunInput, error) {
	input.JobName = strings.TrimSpace(input.JobName)
	input.DedupeKey = strings.TrimSpace(input.DedupeKey)
	input.AgreementID = normalizeRelationalID(input.AgreementID)
	input.RecipientID = normalizeRelationalID(input.RecipientID)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.JobName == "" {
		return stores.JobRunInput{}, relationalInvalidRecordError("job_runs", "job_name", "required")
	}
	if input.DedupeKey == "" {
		return stores.JobRunInput{}, relationalInvalidRecordError("job_runs", "dedupe_key", "required")
	}
	if input.MaxAttempts <= 0 {
		input.MaxAttempts = 3
	}
	if input.AttemptedAt.IsZero() {
		input.AttemptedAt = time.Now().UTC()
	}
	input.AttemptedAt = input.AttemptedAt.UTC()
	return input, nil
}

func normalizeEnqueueJobInput(input stores.JobRunEnqueueInput) (stores.JobRunEnqueueInput, time.Time, *time.Time, error) {
	input.JobName = strings.TrimSpace(input.JobName)
	input.DedupeKey = strings.TrimSpace(input.DedupeKey)
	input.AgreementID = normalizeRelationalID(input.AgreementID)
	input.RecipientID = normalizeRelationalID(input.RecipientID)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	input.PayloadJSON = strings.TrimSpace(input.PayloadJSON)
	input.ResourceKind = strings.TrimSpace(input.ResourceKind)
	input.ResourceID = strings.TrimSpace(input.ResourceID)
	if input.JobName == "" {
		return stores.JobRunEnqueueInput{}, time.Time{}, nil, relationalInvalidRecordError("job_runs", "job_name", "required")
	}
	if input.DedupeKey == "" {
		return stores.JobRunEnqueueInput{}, time.Time{}, nil, relationalInvalidRecordError("job_runs", "dedupe_key", "required")
	}
	if input.MaxAttempts <= 0 {
		input.MaxAttempts = 3
	}
	requestedAt := relationalTimeOrNow(input.RequestedAt)
	availableAt := cloneRelationalTimePtr(input.AvailableAt)
	if availableAt == nil {
		availableAt = &requestedAt
	} else {
		ts := availableAt.UTC()
		availableAt = &ts
	}
	return input, requestedAt, availableAt, nil
}

func (s *relationalTxStore) ensureJobRunAgreementExists(ctx context.Context, scope stores.Scope, agreementID string) error {
	if agreementID == "" {
		return nil
	}
	_, err := loadAgreementRecord(ctx, s.tx, scope, agreementID)
	return err
}

func prepareExistingBeginJobRunRecord(record stores.JobRunRecord, input stores.JobRunInput) (stores.JobRunRecord, bool) {
	if record.Status == stores.JobRunStatusSucceeded {
		return record, false
	}
	if record.Status == stores.JobRunStatusRetrying && record.NextRetryAt != nil && input.AttemptedAt.Before(record.NextRetryAt.UTC()) {
		return record, false
	}
	if record.AttemptCount >= record.MaxAttempts && record.Status == stores.JobRunStatusFailed {
		return record, false
	}
	record.AttemptCount++
	record.Status = stores.JobRunStatusPending
	record.LastError = ""
	record.NextRetryAt = nil
	if input.CorrelationID != "" {
		record.CorrelationID = input.CorrelationID
	}
	record.UpdatedAt = input.AttemptedAt
	return record, true
}

func buildPendingJobRunRecord(scope stores.Scope, input stores.JobRunInput) stores.JobRunRecord {
	return stores.JobRunRecord{
		ID:            uuid.NewString(),
		TenantID:      scope.TenantID,
		OrgID:         scope.OrgID,
		JobName:       input.JobName,
		DedupeKey:     input.DedupeKey,
		AgreementID:   input.AgreementID,
		RecipientID:   input.RecipientID,
		CorrelationID: input.CorrelationID,
		Status:        stores.JobRunStatusPending,
		AttemptCount:  1,
		MaxAttempts:   input.MaxAttempts,
		CreatedAt:     input.AttemptedAt,
		UpdatedAt:     input.AttemptedAt,
	}
}

func prepareExistingQueuedJobRunRecord(record stores.JobRunRecord, input stores.JobRunEnqueueInput, requestedAt time.Time, availableAt *time.Time) (stores.JobRunRecord, bool) {
	terminal := record.Status == stores.JobRunStatusSucceeded || record.Status == stores.JobRunStatusFailed || record.Status == stores.JobRunStatusStale
	if !input.ReplaceTerminal || !terminal {
		return record, false
	}
	record.Status = stores.JobRunStatusQueued
	record.AttemptCount = 0
	record.PayloadJSON = input.PayloadJSON
	record.AvailableAt = availableAt
	record.StartedAt = nil
	record.CompletedAt = nil
	record.ClaimedAt = nil
	record.LeaseExpiresAt = nil
	record.WorkerID = ""
	record.ResourceKind = input.ResourceKind
	record.ResourceID = input.ResourceID
	record.LastErrorCode = ""
	record.LastError = ""
	record.NextRetryAt = nil
	if input.CorrelationID != "" {
		record.CorrelationID = input.CorrelationID
	}
	record.UpdatedAt = requestedAt
	return record, true
}

func buildQueuedJobRunRecord(scope stores.Scope, input stores.JobRunEnqueueInput, requestedAt time.Time, availableAt *time.Time) stores.JobRunRecord {
	return stores.JobRunRecord{
		ID:            uuid.NewString(),
		TenantID:      scope.TenantID,
		OrgID:         scope.OrgID,
		JobName:       input.JobName,
		DedupeKey:     input.DedupeKey,
		AgreementID:   input.AgreementID,
		RecipientID:   input.RecipientID,
		CorrelationID: input.CorrelationID,
		Status:        stores.JobRunStatusQueued,
		AttemptCount:  0,
		MaxAttempts:   input.MaxAttempts,
		PayloadJSON:   input.PayloadJSON,
		AvailableAt:   availableAt,
		ResourceKind:  input.ResourceKind,
		ResourceID:    input.ResourceID,
		CreatedAt:     requestedAt,
		UpdatedAt:     requestedAt,
	}
}

func insertJobRunRecord(ctx context.Context, tx bun.IDB, scope stores.Scope, record stores.JobRunRecord, uniqueFields string) (stores.JobRunRecord, error) {
	if _, err := tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		if relationalUniqueConstraintError(err, "job_runs", "dedupe_key") != err {
			reloaded, reloadErr := findJobRunByDedupeRecord(ctx, tx, scope, record.JobName, record.DedupeKey)
			if reloadErr == nil {
				return reloaded, nil
			}
		}
		return stores.JobRunRecord{}, relationalUniqueConstraintError(err, "job_runs", uniqueFields)
	}
	return record, nil
}

func (s *relationalTxStore) BeginJobRun(ctx context.Context, scope stores.Scope, input stores.JobRunInput) (stores.JobRunRecord, bool, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.JobRunRecord{}, false, err
	}
	input, err = normalizeBeginJobRunInput(input)
	if err != nil {
		return stores.JobRunRecord{}, false, err
	}
	err = s.ensureJobRunAgreementExists(ctx, scope, input.AgreementID)
	if err != nil {
		return stores.JobRunRecord{}, false, err
	}

	record, err := findJobRunByDedupeRecord(ctx, s.tx, scope, input.JobName, input.DedupeKey)
	if err == nil {
		var started bool
		record, started = prepareExistingBeginJobRunRecord(record, input)
		if !started {
			return record, false, nil
		}
		err = updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID)
		if err != nil {
			return stores.JobRunRecord{}, false, err
		}
		return record, true, nil
	}
	if !relationalIsNotFoundError(err) {
		return stores.JobRunRecord{}, false, err
	}
	record = buildPendingJobRunRecord(scope, input)
	record, err = insertJobRunRecord(ctx, s.tx, scope, record, "id|dedupe_key")
	if err != nil {
		return stores.JobRunRecord{}, false, err
	}
	return record, true, nil
}

func (s *relationalTxStore) MarkJobRunSucceeded(ctx context.Context, scope stores.Scope, id string, completedAt time.Time) (stores.JobRunRecord, error) {
	return s.MarkJobSucceeded(ctx, scope, id, completedAt)
}

func (s *relationalTxStore) MarkJobRunFailed(ctx context.Context, scope stores.Scope, id, failureReason string, nextRetryAt *time.Time, failedAt time.Time) (stores.JobRunRecord, error) {
	return s.MarkJobFailed(ctx, scope, id, stores.JobRunFailureInput{
		FailureReason:   failureReason,
		NextAvailableAt: nextRetryAt,
		FailedAt:        failedAt,
	})
}

func (s *relationalTxStore) EnqueueJob(ctx context.Context, scope stores.Scope, input stores.JobRunEnqueueInput) (stores.JobRunRecord, bool, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.JobRunRecord{}, false, err
	}
	input, requestedAt, availableAt, err := normalizeEnqueueJobInput(input)
	if err != nil {
		return stores.JobRunRecord{}, false, err
	}
	err = s.ensureJobRunAgreementExists(ctx, scope, input.AgreementID)
	if err != nil {
		return stores.JobRunRecord{}, false, err
	}

	record, err := findJobRunByDedupeRecord(ctx, s.tx, scope, input.JobName, input.DedupeKey)
	if err == nil {
		var started bool
		record, started = prepareExistingQueuedJobRunRecord(record, input, requestedAt, availableAt)
		if !started {
			return record, false, nil
		}
		err = updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID)
		if err != nil {
			return stores.JobRunRecord{}, false, err
		}
		return record, true, nil
	}
	if !relationalIsNotFoundError(err) {
		return stores.JobRunRecord{}, false, err
	}
	record = buildQueuedJobRunRecord(scope, input, requestedAt, availableAt)
	record, err = insertJobRunRecord(ctx, s.tx, scope, record, "id|dedupe_key")
	if err != nil {
		return stores.JobRunRecord{}, false, err
	}
	return record, true, nil
}

func (s *relationalTxStore) ClaimDueJobs(ctx context.Context, scope stores.Scope, input stores.JobRunClaimInput) ([]stores.JobRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	if input.Limit <= 0 {
		input.Limit = 25
	}
	now := relationalTimeOrNow(input.Now)
	if input.LeaseDuration <= 0 {
		input.LeaseDuration = 30 * time.Second
	}
	workerID := strings.TrimSpace(input.WorkerID)
	if workerID == "" {
		return nil, relationalInvalidRecordError("job_runs", "worker_id", "required")
	}
	jobNames := make([]string, 0, len(input.JobNames))
	for _, name := range input.JobNames {
		name = strings.TrimSpace(name)
		if name != "" {
			jobNames = append(jobNames, name)
		}
	}
	records := make([]stores.JobRunRecord, 0)
	query := s.tx.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("status IN (?)", bun.List([]string{stores.JobRunStatusQueued, stores.JobRunStatusRetrying})).
		Where("COALESCE(available_at, next_retry_at, created_at) <= ?", now).
		OrderExpr("COALESCE(available_at, next_retry_at, created_at) ASC, updated_at ASC, id ASC").
		Limit(input.Limit)
	if len(jobNames) > 0 {
		query = query.Where("job_name IN (?)", bun.List(jobNames))
	}
	if err := query.Scan(ctx); err != nil {
		return nil, err
	}
	claimed := make([]stores.JobRunRecord, 0, len(records))
	for _, record := range records {
		record.AttemptCount++
		record.Status = stores.JobRunStatusRunning
		record.StartedAt = cloneRelationalTimePtr(&now)
		record.ClaimedAt = cloneRelationalTimePtr(&now)
		leaseExpiresAt := now.Add(input.LeaseDuration)
		record.LeaseExpiresAt = cloneRelationalTimePtr(&leaseExpiresAt)
		record.WorkerID = workerID
		record.UpdatedAt = now
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return nil, err
		}
		claimed = append(claimed, record)
	}
	return claimed, nil
}

func (s *relationalTxStore) RenewJobLease(ctx context.Context, scope stores.Scope, id string, input stores.JobRunLeaseRenewInput) (stores.JobRunRecord, error) {
	record, err := loadJobRunRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.JobRunRecord{}, err
	}
	workerID := strings.TrimSpace(input.WorkerID)
	if workerID == "" {
		return stores.JobRunRecord{}, relationalInvalidRecordError("job_runs", "worker_id", "required")
	}
	if strings.TrimSpace(record.Status) != stores.JobRunStatusRunning {
		return stores.JobRunRecord{}, relationalInvalidRecordError("job_runs", "status", "lease renewal requires running job")
	}
	if strings.TrimSpace(record.WorkerID) != "" && strings.TrimSpace(record.WorkerID) != workerID {
		return stores.JobRunRecord{}, relationalInvalidRecordError("job_runs", "worker_id", "lease held by another worker")
	}
	renewedAt := relationalTimeOrNow(input.RenewedAt)
	if input.LeaseDuration <= 0 {
		input.LeaseDuration = 30 * time.Second
	}
	record.WorkerID = workerID
	record.ClaimedAt = cloneRelationalTimePtr(&renewedAt)
	leaseExpiresAt := renewedAt.Add(input.LeaseDuration)
	record.LeaseExpiresAt = cloneRelationalTimePtr(&leaseExpiresAt)
	record.UpdatedAt = renewedAt
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.JobRunRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) MarkJobSucceeded(ctx context.Context, scope stores.Scope, id string, completedAt time.Time) (stores.JobRunRecord, error) {
	record, err := loadJobRunRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.JobRunRecord{}, err
	}
	completedAt = relationalTimeOrNow(completedAt)
	record.Status = stores.JobRunStatusSucceeded
	record.CompletedAt = cloneRelationalTimePtr(&completedAt)
	record.ClaimedAt = nil
	record.LeaseExpiresAt = nil
	record.WorkerID = ""
	record.LastErrorCode = ""
	record.LastError = ""
	record.NextRetryAt = nil
	record.AvailableAt = nil
	record.UpdatedAt = completedAt
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.JobRunRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) MarkJobFailed(ctx context.Context, scope stores.Scope, id string, input stores.JobRunFailureInput) (stores.JobRunRecord, error) {
	record, err := loadJobRunRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.JobRunRecord{}, err
	}
	failedAt := relationalTimeOrNow(input.FailedAt)
	failureReason := strings.TrimSpace(input.FailureReason)
	if failureReason == "" {
		failureReason = "job failed"
	}
	record.LastErrorCode = strings.TrimSpace(input.ErrorCode)
	record.LastError = failureReason
	record.ClaimedAt = nil
	record.LeaseExpiresAt = nil
	record.WorkerID = ""
	if input.NextAvailableAt != nil && record.AttemptCount < record.MaxAttempts {
		next := input.NextAvailableAt.UTC()
		record.Status = stores.JobRunStatusRetrying
		record.NextRetryAt = &next
		record.AvailableAt = &next
		record.CompletedAt = nil
	} else {
		record.Status = stores.JobRunStatusFailed
		record.NextRetryAt = nil
		record.AvailableAt = nil
		record.CompletedAt = cloneRelationalTimePtr(&failedAt)
	}
	record.UpdatedAt = failedAt
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.JobRunRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) MarkJobStale(ctx context.Context, scope stores.Scope, id, reason string, staleAt time.Time) (stores.JobRunRecord, error) {
	record, err := loadJobRunRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.JobRunRecord{}, err
	}
	staleAt = relationalTimeOrNow(staleAt)
	reason = strings.TrimSpace(reason)
	if reason == "" {
		reason = "job marked stale"
	}
	record.Status = stores.JobRunStatusStale
	if strings.TrimSpace(record.LastErrorCode) == "" {
		record.LastErrorCode = "STALE"
	}
	record.LastError = reason
	record.ClaimedAt = nil
	record.LeaseExpiresAt = nil
	record.WorkerID = ""
	record.NextRetryAt = nil
	record.AvailableAt = nil
	record.CompletedAt = cloneRelationalTimePtr(&staleAt)
	record.UpdatedAt = staleAt
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.JobRunRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) RequeueStaleJobs(ctx context.Context, scope stores.Scope, input stores.JobRunRequeueInput) (int, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return 0, err
	}
	now := relationalTimeOrNow(input.Now)
	jobNames := make([]string, 0, len(input.JobNames))
	for _, name := range input.JobNames {
		name = strings.TrimSpace(name)
		if name != "" {
			jobNames = append(jobNames, name)
		}
	}
	records := make([]stores.JobRunRecord, 0)
	query := s.tx.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("status = ?", stores.JobRunStatusRunning).
		Where("lease_expires_at IS NOT NULL").
		Where("lease_expires_at <= ?", now).
		OrderExpr("lease_expires_at ASC, id ASC")
	if input.Limit > 0 {
		query = query.Limit(input.Limit)
	}
	if len(jobNames) > 0 {
		query = query.Where("job_name IN (?)", bun.List(jobNames))
	}
	if err := query.Scan(ctx); err != nil {
		return 0, err
	}
	updated := 0
	for _, record := range records {
		record.LastErrorCode = "LEASE_EXPIRED"
		record.LastError = "job lease expired"
		record.ClaimedAt = nil
		record.LeaseExpiresAt = nil
		record.WorkerID = ""
		if record.AttemptCount < record.MaxAttempts {
			record.Status = stores.JobRunStatusRetrying
			record.NextRetryAt = cloneRelationalTimePtr(&now)
			record.AvailableAt = cloneRelationalTimePtr(&now)
		} else {
			record.Status = stores.JobRunStatusStale
			record.NextRetryAt = nil
			record.AvailableAt = nil
			record.CompletedAt = cloneRelationalTimePtr(&now)
		}
		record.UpdatedAt = now
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return updated, err
		}
		updated++
	}
	return updated, nil
}

func (s *relationalTxStore) ListJobRunsByResource(ctx context.Context, scope stores.Scope, resourceKind, resourceID string) ([]stores.JobRunRecord, error) {
	return listJobRunRecordsByResource(ctx, s.tx, scope, resourceKind, resourceID)
}

func (s *relationalTxStore) BeginGoogleImportRun(ctx context.Context, scope stores.Scope, input stores.GoogleImportRunInput) (stores.GoogleImportRunRecord, bool, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.GoogleImportRunRecord{}, false, err
	}
	input.UserID = normalizeRelationalID(input.UserID)
	input.GoogleFileID = strings.TrimSpace(input.GoogleFileID)
	input.SourceVersionHint = strings.TrimSpace(input.SourceVersionHint)
	input.DedupeKey = strings.TrimSpace(input.DedupeKey)
	input.DocumentTitle = strings.TrimSpace(input.DocumentTitle)
	input.AgreementTitle = strings.TrimSpace(input.AgreementTitle)
	input.CreatedByUserID = normalizeRelationalID(input.CreatedByUserID)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.UserID == "" {
		return stores.GoogleImportRunRecord{}, false, relationalInvalidRecordError("google_import_runs", "user_id", "required")
	}
	if input.GoogleFileID == "" {
		return stores.GoogleImportRunRecord{}, false, relationalInvalidRecordError("google_import_runs", "google_file_id", "required")
	}
	if input.DedupeKey == "" {
		input.DedupeKey = strings.Join([]string{input.UserID, input.GoogleFileID, input.SourceVersionHint}, "|")
	}
	requestedAt := relationalTimeOrNow(input.RequestedAt)
	if existing, err := findGoogleImportRunByDedupeRecord(ctx, s.tx, scope, input.DedupeKey); err == nil {
		return existing, false, nil
	} else if !relationalIsNotFoundError(err) {
		return stores.GoogleImportRunRecord{}, false, err
	}
	record := stores.GoogleImportRunRecord{
		ID:                uuid.NewString(),
		TenantID:          scope.TenantID,
		OrgID:             scope.OrgID,
		UserID:            input.UserID,
		GoogleFileID:      input.GoogleFileID,
		SourceVersionHint: input.SourceVersionHint,
		DedupeKey:         input.DedupeKey,
		DocumentTitle:     input.DocumentTitle,
		AgreementTitle:    input.AgreementTitle,
		CreatedByUserID:   input.CreatedByUserID,
		CorrelationID:     input.CorrelationID,
		Status:            stores.GoogleImportRunStatusQueued,
		CreatedAt:         requestedAt,
		UpdatedAt:         requestedAt,
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		if !relationalIsUniqueConstraintError(err) {
			return stores.GoogleImportRunRecord{}, false, err
		}
		existing, loadErr := findGoogleImportRunByDedupeRecord(ctx, s.tx, scope, input.DedupeKey)
		if loadErr != nil {
			return stores.GoogleImportRunRecord{}, false, loadErr
		}
		return existing, false, nil
	}
	return record, true, nil
}

func (s *relationalTxStore) MarkGoogleImportRunRunning(ctx context.Context, scope stores.Scope, id string, startedAt time.Time) (stores.GoogleImportRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.GoogleImportRunRecord{}, relationalInvalidRecordError("google_import_runs", "id", "required")
	}
	startedAt = relationalTimeOrNow(startedAt)
	record, err := loadGoogleImportRunRecordDirect(ctx, s.tx, scope, id)
	if err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	if record.Status == stores.GoogleImportRunStatusSucceeded || record.Status == stores.GoogleImportRunStatusFailed {
		return record, nil
	}
	record.Status = stores.GoogleImportRunStatusRunning
	record.StartedAt = cloneRelationalTimePtr(&startedAt)
	record.UpdatedAt = startedAt
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) MarkGoogleImportRunSucceeded(ctx context.Context, scope stores.Scope, id string, input stores.GoogleImportRunSuccessInput) (stores.GoogleImportRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.GoogleImportRunRecord{}, relationalInvalidRecordError("google_import_runs", "id", "required")
	}
	completedAt := relationalTimeOrNow(input.CompletedAt)
	record, err := loadGoogleImportRunRecordDirect(ctx, s.tx, scope, id)
	if err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	record.Status = stores.GoogleImportRunStatusSucceeded
	record.DocumentID = normalizeRelationalID(input.DocumentID)
	record.AgreementID = normalizeRelationalID(input.AgreementID)
	record.SourceDocumentID = normalizeRelationalID(input.SourceDocumentID)
	record.SourceRevisionID = normalizeRelationalID(input.SourceRevisionID)
	record.SourceArtifactID = normalizeRelationalID(input.SourceArtifactID)
	record.LineageStatus = strings.TrimSpace(input.LineageStatus)
	record.FingerprintStatus = strings.TrimSpace(input.FingerprintStatus)
	record.CandidateStatusJSON = strings.TrimSpace(input.CandidateStatusJSON)
	record.DocumentDetailURL = strings.TrimSpace(input.DocumentDetailURL)
	record.AgreementDetailURL = strings.TrimSpace(input.AgreementDetailURL)
	record.SourceMimeType = strings.TrimSpace(input.SourceMimeType)
	record.IngestionMode = strings.TrimSpace(input.IngestionMode)
	record.ErrorCode = ""
	record.ErrorMessage = ""
	record.ErrorDetailsJSON = ""
	record.CompletedAt = cloneRelationalTimePtr(&completedAt)
	if record.StartedAt == nil {
		record.StartedAt = cloneRelationalTimePtr(&completedAt)
	}
	record.UpdatedAt = completedAt
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) MarkGoogleImportRunFailed(ctx context.Context, scope stores.Scope, id string, input stores.GoogleImportRunFailureInput) (stores.GoogleImportRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.GoogleImportRunRecord{}, relationalInvalidRecordError("google_import_runs", "id", "required")
	}
	completedAt := relationalTimeOrNow(input.CompletedAt)
	record, err := loadGoogleImportRunRecordDirect(ctx, s.tx, scope, id)
	if err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	record.Status = stores.GoogleImportRunStatusFailed
	record.ErrorCode = strings.TrimSpace(input.ErrorCode)
	record.ErrorMessage = strings.TrimSpace(input.ErrorMessage)
	record.ErrorDetailsJSON = strings.TrimSpace(input.ErrorDetailsJSON)
	record.CompletedAt = cloneRelationalTimePtr(&completedAt)
	if record.StartedAt == nil {
		record.StartedAt = cloneRelationalTimePtr(&completedAt)
	}
	record.UpdatedAt = completedAt
	if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) UpsertAgreementReminderState(ctx context.Context, scope stores.Scope, record stores.AgreementReminderStateRecord) (stores.AgreementReminderStateRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	record, err = normalizeRelationalAgreementReminderStateRecord(record)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	now := time.Now().UTC()
	existing, exists, err := loadExistingRelationalAgreementReminderState(ctx, s.tx, scope, record.AgreementID, record.RecipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	preserveRelationalReminderLease(&record, existing, exists, now)
	record = finalizeRelationalAgreementReminderStateRecord(scope, record, existing, exists, now)
	record = cloneRelationalReminderStateRecord(record)
	if !exists {
		_, insertErr := s.tx.NewInsert().Model(&record).Exec(ctx)
		if insertErr != nil {
			return stores.AgreementReminderStateRecord{}, insertErr
		}
		return record, nil
	}
	rows, err := updateReminderStateRecord(ctx, s.tx, record, &existing.UpdatedAt)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	if rows == 0 {
		current, loadErr := loadAgreementReminderStateRecord(ctx, s.tx, scope, record.AgreementID, record.RecipientID)
		if loadErr != nil {
			return stores.AgreementReminderStateRecord{}, loadErr
		}
		return current, relationalReminderLeaseConflictError(record.AgreementID, record.RecipientID, record.WorkerID, existing.LeaseSeq, current.LeaseSeq)
	}
	return record, nil
}

func normalizeRelationalAgreementReminderStateRecord(record stores.AgreementReminderStateRecord) (stores.AgreementReminderStateRecord, error) {
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.RecipientID = normalizeRelationalID(record.RecipientID)
	if record.AgreementID == "" {
		return stores.AgreementReminderStateRecord{}, relationalInvalidRecordError("agreement_reminder_states", "agreement_id", "required")
	}
	if record.RecipientID == "" {
		return stores.AgreementReminderStateRecord{}, relationalInvalidRecordError("agreement_reminder_states", "recipient_id", "required")
	}
	status := normalizeRelationalReminderStatus(record.Status)
	if status == "" {
		return stores.AgreementReminderStateRecord{}, relationalInvalidRecordError("agreement_reminder_states", "status", "invalid status")
	}
	record.Status = status
	record.PolicyVersion = normalizeRelationalReminderPolicyVersion(record.PolicyVersion)
	record.LastReasonCode = normalizeRelationalReminderReasonCode(record.LastReasonCode)
	record.LastErrorCode = normalizeRelationalReminderReasonCode(record.LastErrorCode)
	record.TerminalReason = normalizeRelationalReminderReasonCode(record.TerminalReason)
	record.SweepID = strings.TrimSpace(record.SweepID)
	record.WorkerID = normalizeRelationalID(record.WorkerID)
	if record.LeaseSeq < 0 {
		record.LeaseSeq = 0
	}
	record.LastErrorInternalEncrypted = strings.TrimSpace(record.LastErrorInternalEncrypted)
	record.LastErrorInternalExpiresAt = cloneRelationalTimePtr(record.LastErrorInternalExpiresAt)
	record.ClaimedAt = cloneRelationalTimePtr(record.ClaimedAt)
	record.LastHeartbeatAt = cloneRelationalTimePtr(record.LastHeartbeatAt)
	record.NextDueAt = cloneRelationalTimePtr(record.NextDueAt)
	if record.Status == stores.AgreementReminderStatusActive && record.NextDueAt == nil {
		return stores.AgreementReminderStateRecord{}, relationalReminderStateInvariantError("next_due_at", "active_requires_next_due_at")
	}
	if record.Status != stores.AgreementReminderStatusTerminal {
		record.TerminalReason = ""
	}
	if record.Status != stores.AgreementReminderStatusActive {
		record.NextDueAt = nil
		clearReminderLease(&record)
	}
	if record.SentCount < 0 {
		record.SentCount = 0
	}
	return record, nil
}

func loadExistingRelationalAgreementReminderState(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, bool, error) {
	record, err := loadAgreementReminderStateRecord(ctx, idb, scope, agreementID, recipientID)
	if relationalIsNotFoundError(err) {
		return stores.AgreementReminderStateRecord{}, false, nil
	}
	if err != nil {
		return stores.AgreementReminderStateRecord{}, false, err
	}
	return record, true, nil
}

func preserveRelationalReminderLease(record *stores.AgreementReminderStateRecord, existing stores.AgreementReminderStateRecord, exists bool, now time.Time) {
	if !exists || record.Status != stores.AgreementReminderStatusActive {
		return
	}
	if !reminderLeaseIsActive(existing, now, relationalDefaultReminderLeaseSeconds) {
		return
	}
	if reminderLeaseTokenMatchesRecord(existing, reminderLeaseTokenFromRecord(*record)) {
		return
	}
	record.WorkerID = existing.WorkerID
	record.SweepID = existing.SweepID
	record.LeaseSeq = existing.LeaseSeq
	record.ClaimedAt = cloneRelationalTimePtr(existing.ClaimedAt)
	record.LastHeartbeatAt = cloneRelationalTimePtr(existing.LastHeartbeatAt)
}

func finalizeRelationalAgreementReminderStateRecord(scope stores.Scope, record, existing stores.AgreementReminderStateRecord, exists bool, now time.Time) stores.AgreementReminderStateRecord {
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		if exists && strings.TrimSpace(existing.ID) != "" {
			record.ID = existing.ID
		} else {
			record.ID = uuid.NewString()
		}
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	if exists && record.LeaseSeq == 0 {
		record.LeaseSeq = existing.LeaseSeq
	}
	if record.CreatedAt.IsZero() {
		if exists && !existing.CreatedAt.IsZero() {
			record.CreatedAt = existing.CreatedAt.UTC()
		} else {
			record.CreatedAt = now
		}
	} else {
		record.CreatedAt = record.CreatedAt.UTC()
	}
	if record.UpdatedAt.IsZero() {
		record.UpdatedAt = now
	} else {
		record.UpdatedAt = record.UpdatedAt.UTC()
	}
	return record
}

func (s *relationalTxStore) ClaimDueAgreementReminders(ctx context.Context, scope stores.Scope, input stores.AgreementReminderClaimInput) ([]stores.AgreementReminderClaim, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	input, err = normalizeRelationalAgreementReminderClaimInput(input)
	if err != nil {
		return nil, err
	}
	candidates, err := listRelationalClaimableReminderCandidates(ctx, s.tx, scope, input)
	if err != nil {
		return nil, err
	}
	return claimRelationalReminderCandidates(ctx, s.tx, scope, input, candidates)
}

func normalizeRelationalAgreementReminderClaimInput(input stores.AgreementReminderClaimInput) (stores.AgreementReminderClaimInput, error) {
	input.WorkerID = normalizeRelationalID(input.WorkerID)
	input.SweepID = strings.TrimSpace(input.SweepID)
	if input.WorkerID == "" {
		return stores.AgreementReminderClaimInput{}, relationalInvalidRecordError("agreement_reminder_states", "worker_id", "required")
	}
	if input.SweepID == "" {
		return stores.AgreementReminderClaimInput{}, relationalInvalidRecordError("agreement_reminder_states", "sweep_id", "required")
	}
	if input.Now.IsZero() {
		input.Now = time.Now().UTC()
	}
	input.Now = input.Now.UTC()
	if input.Limit <= 0 {
		input.Limit = 100
	}
	if input.Limit > 500 {
		input.Limit = 500
	}
	if input.LeaseSeconds <= 0 {
		input.LeaseSeconds = relationalDefaultReminderLeaseSeconds
	}
	return input, nil
}

func listRelationalClaimableReminderCandidates(ctx context.Context, idb bun.IDB, scope stores.Scope, input stores.AgreementReminderClaimInput) ([]stores.AgreementReminderStateRecord, error) {
	candidates := make([]stores.AgreementReminderStateRecord, 0)
	if err := idb.NewSelect().
		Model(&candidates).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("status = ?", stores.AgreementReminderStatusActive).
		Where("next_due_at IS NOT NULL").
		Where("next_due_at <= ?", input.Now).
		OrderExpr("next_due_at ASC, updated_at ASC, id ASC").
		Limit(input.Limit).
		Scan(ctx); err != nil {
		return nil, err
	}
	return candidates, nil
}

func claimRelationalReminderCandidates(ctx context.Context, idb bun.IDB, scope stores.Scope, input stores.AgreementReminderClaimInput, candidates []stores.AgreementReminderStateRecord) ([]stores.AgreementReminderClaim, error) {
	out := make([]stores.AgreementReminderClaim, 0, len(candidates))
	for _, candidate := range candidates {
		if reminderLeaseIsActive(candidate, input.Now, input.LeaseSeconds) {
			continue
		}
		updated := applyRelationalReminderClaim(candidate, input)
		rows, err := updateReminderStateRecord(ctx, idb, updated, &candidate.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if rows == 0 {
			continue
		}
		out = append(out, reminderClaimFromRecord(updated))
	}
	return out, nil
}

func applyRelationalReminderClaim(record stores.AgreementReminderStateRecord, input stores.AgreementReminderClaimInput) stores.AgreementReminderStateRecord {
	record.WorkerID = input.WorkerID
	record.SweepID = input.SweepID
	record.LeaseSeq++
	record.ClaimedAt = cloneRelationalTimePtr(&input.Now)
	record.LastHeartbeatAt = cloneRelationalTimePtr(&input.Now)
	record.UpdatedAt = input.Now
	return record
}

func (s *relationalTxStore) RenewAgreementReminderLease(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderLeaseRenewInput) (stores.AgreementReminderClaim, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementReminderClaim{}, err
	}
	agreementID = normalizeRelationalID(agreementID)
	recipientID = normalizeRelationalID(recipientID)
	if agreementID == "" {
		return stores.AgreementReminderClaim{}, relationalInvalidRecordError("agreement_reminder_states", "agreement_id", "required")
	}
	if recipientID == "" {
		return stores.AgreementReminderClaim{}, relationalInvalidRecordError("agreement_reminder_states", "recipient_id", "required")
	}
	if input.Now.IsZero() {
		input.Now = time.Now().UTC()
	}
	input.Now = input.Now.UTC()
	if input.LeaseSeconds <= 0 {
		input.LeaseSeconds = relationalDefaultReminderLeaseSeconds
	}
	input.Lease = normalizeReminderLeaseToken(input.Lease)
	record, err := loadAgreementReminderStateRecord(ctx, s.tx, scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderClaim{}, err
	}
	validateErr := validateReminderLease(record, input.Lease, input.Now, input.LeaseSeconds)
	if validateErr != nil {
		return stores.AgreementReminderClaim{}, validateErr
	}
	previousUpdatedAt := record.UpdatedAt
	record.LeaseSeq++
	record.LastHeartbeatAt = cloneRelationalTimePtr(&input.Now)
	if record.ClaimedAt == nil {
		record.ClaimedAt = cloneRelationalTimePtr(&input.Now)
	}
	record.UpdatedAt = input.Now
	rows, err := updateReminderStateRecord(ctx, s.tx, record, &previousUpdatedAt)
	if err != nil {
		return stores.AgreementReminderClaim{}, err
	}
	if rows == 0 {
		current, loadErr := loadAgreementReminderStateRecord(ctx, s.tx, scope, agreementID, recipientID)
		if loadErr != nil {
			return stores.AgreementReminderClaim{}, loadErr
		}
		return stores.AgreementReminderClaim{}, relationalReminderLeaseConflictError(agreementID, recipientID, input.Lease.WorkerID, input.Lease.LeaseSeq, current.LeaseSeq)
	}
	return reminderClaimFromRecord(record), nil
}

func (s *relationalTxStore) MarkAgreementReminderSent(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderMarkInput) (stores.AgreementReminderStateRecord, error) {
	scope, agreementID, recipientID, err := normalizeRelationalReminderTarget(scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	input = normalizeRelationalReminderMarkInput(input)
	input.ReasonCode = normalizeRelationalReminderReasonCode(input.ReasonCode)
	return s.mutateAgreementReminderState(ctx, scope, agreementID, recipientID, input, applyRelationalReminderSent)
}

func (s *relationalTxStore) MarkAgreementReminderSkipped(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderMarkInput) (stores.AgreementReminderStateRecord, error) {
	scope, agreementID, recipientID, err := normalizeRelationalReminderTarget(scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	input = normalizeRelationalReminderMarkInput(input)
	input.ReasonCode = normalizeRelationalReminderReasonCode(input.ReasonCode)
	input.TerminalReason = normalizeRelationalReminderReasonCode(input.TerminalReason)
	return s.mutateAgreementReminderState(ctx, scope, agreementID, recipientID, input, applyRelationalReminderSkipped)
}

func (s *relationalTxStore) MarkAgreementReminderFailed(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderMarkInput) (stores.AgreementReminderStateRecord, error) {
	scope, agreementID, recipientID, err := normalizeRelationalReminderTarget(scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	input = normalizeRelationalReminderMarkInput(input)
	input.ReasonCode = normalizeRelationalReminderReasonCode(input.ReasonCode)
	if input.ReasonCode == "" {
		input.ReasonCode = "failed"
	}
	return s.mutateAgreementReminderState(ctx, scope, agreementID, recipientID, input, applyRelationalReminderFailed)
}

func (s *relationalTxStore) PauseAgreementReminder(ctx context.Context, scope stores.Scope, agreementID, recipientID string, pausedAt time.Time) (stores.AgreementReminderStateRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	agreementID = normalizeRelationalID(agreementID)
	recipientID = normalizeRelationalID(recipientID)
	if agreementID == "" {
		return stores.AgreementReminderStateRecord{}, relationalInvalidRecordError("agreement_reminder_states", "agreement_id", "required")
	}
	if recipientID == "" {
		return stores.AgreementReminderStateRecord{}, relationalInvalidRecordError("agreement_reminder_states", "recipient_id", "required")
	}
	if pausedAt.IsZero() {
		pausedAt = time.Now().UTC()
	}
	pausedAt = pausedAt.UTC()
	record, err := loadAgreementReminderStateRecord(ctx, s.tx, scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	previousUpdatedAt := record.UpdatedAt
	if record.Status == stores.AgreementReminderStatusTerminal {
		return stores.AgreementReminderStateRecord{}, relationalReminderStateInvariantError("status", "cannot_pause_terminal")
	}
	record.Status = stores.AgreementReminderStatusPaused
	record.TerminalReason = ""
	record.LastReasonCode = "paused"
	record.LastErrorCode = ""
	record.LastErrorInternalEncrypted = ""
	record.LastErrorInternalExpiresAt = nil
	record.NextDueAt = nil
	clearReminderLease(&record)
	record.UpdatedAt = pausedAt
	rows, err := updateReminderStateRecord(ctx, s.tx, record, &previousUpdatedAt)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	if rows == 0 {
		current, loadErr := loadAgreementReminderStateRecord(ctx, s.tx, scope, agreementID, recipientID)
		if loadErr != nil {
			return stores.AgreementReminderStateRecord{}, loadErr
		}
		return stores.AgreementReminderStateRecord{}, relationalReminderLeaseConflictError(agreementID, recipientID, record.WorkerID, record.LeaseSeq, current.LeaseSeq)
	}
	return cloneRelationalReminderStateRecord(record), nil
}

func (s *relationalTxStore) ResumeAgreementReminder(ctx context.Context, scope stores.Scope, agreementID, recipientID string, resumedAt time.Time, nextDueAt *time.Time) (stores.AgreementReminderStateRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	agreementID = normalizeRelationalID(agreementID)
	recipientID = normalizeRelationalID(recipientID)
	if agreementID == "" {
		return stores.AgreementReminderStateRecord{}, relationalInvalidRecordError("agreement_reminder_states", "agreement_id", "required")
	}
	if recipientID == "" {
		return stores.AgreementReminderStateRecord{}, relationalInvalidRecordError("agreement_reminder_states", "recipient_id", "required")
	}
	if resumedAt.IsZero() {
		resumedAt = time.Now().UTC()
	}
	resumedAt = resumedAt.UTC()
	nextDueAt = cloneRelationalTimePtr(nextDueAt)
	if nextDueAt == nil {
		return stores.AgreementReminderStateRecord{}, relationalReminderStateInvariantError("next_due_at", "active_requires_next_due_at")
	}
	record, err := loadAgreementReminderStateRecord(ctx, s.tx, scope, agreementID, recipientID)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	previousUpdatedAt := record.UpdatedAt
	if record.Status == stores.AgreementReminderStatusTerminal {
		return stores.AgreementReminderStateRecord{}, relationalReminderStateInvariantError("status", "cannot_resume_terminal")
	}
	record.Status = stores.AgreementReminderStatusActive
	record.TerminalReason = ""
	record.PolicyVersion = normalizeRelationalReminderPolicyVersion(record.PolicyVersion)
	record.LastReasonCode = "resumed"
	record.LastErrorCode = ""
	record.LastErrorInternalEncrypted = ""
	record.LastErrorInternalExpiresAt = nil
	record.NextDueAt = cloneRelationalTimePtr(nextDueAt)
	clearReminderLease(&record)
	record.UpdatedAt = resumedAt
	rows, err := updateReminderStateRecord(ctx, s.tx, record, &previousUpdatedAt)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	if rows == 0 {
		current, loadErr := loadAgreementReminderStateRecord(ctx, s.tx, scope, agreementID, recipientID)
		if loadErr != nil {
			return stores.AgreementReminderStateRecord{}, loadErr
		}
		return stores.AgreementReminderStateRecord{}, relationalReminderLeaseConflictError(agreementID, recipientID, record.WorkerID, record.LeaseSeq, current.LeaseSeq)
	}
	return cloneRelationalReminderStateRecord(record), nil
}

func (s *relationalTxStore) CleanupAgreementReminderInternalErrors(ctx context.Context, scope stores.Scope, now time.Time, limit int) (int, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return 0, err
	}
	if now.IsZero() {
		now = time.Now().UTC()
	}
	now = now.UTC()
	if limit <= 0 {
		limit = 1000
	}
	records := make([]stores.AgreementReminderStateRecord, 0)
	if err := s.tx.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("last_error_internal_encrypted <> ''").
		Where("last_error_internal_expires_at IS NOT NULL").
		Where("last_error_internal_expires_at <= ?", now).
		OrderExpr("updated_at ASC, id ASC").
		Limit(limit).
		Scan(ctx); err != nil {
		return 0, err
	}
	cleared := 0
	for _, record := range records {
		previousUpdatedAt := record.UpdatedAt
		record.LastErrorInternalEncrypted = ""
		record.LastErrorInternalExpiresAt = nil
		record.UpdatedAt = now
		rows, err := updateReminderStateRecord(ctx, s.tx, record, &previousUpdatedAt)
		if err != nil {
			return 0, err
		}
		if rows > 0 {
			cleared++
		}
	}
	return cleared, nil
}

func (s *relationalTxStore) EnqueueOutboxMessage(ctx context.Context, scope stores.Scope, record stores.OutboxMessageRecord) (stores.OutboxMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.Topic = strings.ToLower(strings.TrimSpace(record.Topic))
	record.MessageKey = strings.TrimSpace(record.MessageKey)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	record.HeadersJSON = strings.TrimSpace(record.HeadersJSON)
	record.CorrelationID = strings.TrimSpace(record.CorrelationID)
	record.Status = strings.ToLower(strings.TrimSpace(record.Status))
	if record.Topic == "" {
		return stores.OutboxMessageRecord{}, relationalInvalidRecordError("outbox_messages", "topic", "required")
	}
	if record.PayloadJSON == "" {
		return stores.OutboxMessageRecord{}, relationalInvalidRecordError("outbox_messages", "payload_json", "required")
	}
	now := time.Now().UTC()
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	if record.AttemptCount < 0 {
		record.AttemptCount = 0
	}
	if record.MaxAttempts <= 0 {
		record.MaxAttempts = relationalDefaultOutboxMaxAttempts
	}
	if record.Status == "" {
		record.Status = stores.OutboxMessageStatusPending
	}
	switch record.Status {
	case stores.OutboxMessageStatusPending,
		stores.OutboxMessageStatusRetrying,
		stores.OutboxMessageStatusProcessing,
		stores.OutboxMessageStatusSucceeded,
		stores.OutboxMessageStatusFailed:
	default:
		return stores.OutboxMessageRecord{}, relationalInvalidRecordError("outbox_messages", "status", "invalid status")
	}
	if record.CreatedAt.IsZero() {
		record.CreatedAt = now
	} else {
		record.CreatedAt = record.CreatedAt.UTC()
	}
	if record.UpdatedAt.IsZero() {
		record.UpdatedAt = record.CreatedAt
	} else {
		record.UpdatedAt = record.UpdatedAt.UTC()
	}
	if record.AvailableAt.IsZero() {
		record.AvailableAt = record.CreatedAt
	} else {
		record.AvailableAt = record.AvailableAt.UTC()
	}
	record.LockedAt = cloneRelationalTimePtr(record.LockedAt)
	record.PublishedAt = cloneRelationalTimePtr(record.PublishedAt)
	record = cloneRelationalOutboxMessageRecord(record)
	wrapped := OutboxMessageRecord{Message: record}
	if _, err := s.tx.NewInsert().Model(&wrapped).Exec(ctx); err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) ClaimOutboxMessages(ctx context.Context, scope stores.Scope, input stores.OutboxClaimInput) ([]stores.OutboxMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	input.Consumer = normalizeRelationalID(input.Consumer)
	input.Topic = strings.ToLower(strings.TrimSpace(input.Topic))
	if input.Consumer == "" {
		return nil, relationalInvalidRecordError("outbox_messages", "consumer", "required")
	}
	if input.Now.IsZero() {
		input.Now = time.Now().UTC()
	}
	input.Now = input.Now.UTC()
	if input.Limit <= 0 {
		input.Limit = relationalDefaultOutboxClaimLimit
	}
	lockUntil := cloneRelationalTimePtr(input.LockUntil)
	if lockUntil == nil || lockUntil.IsZero() {
		defaultLock := input.Now.Add(relationalDefaultOutboxClaimLockTTL).UTC()
		lockUntil = &defaultLock
	} else {
		lock := lockUntil.UTC()
		lockUntil = &lock
	}
	candidates := make([]OutboxMessageRecord, 0)
	query := s.tx.NewSelect().
		Model(&candidates).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("available_at <= ?", input.Now).
		Where("(locked_at IS NULL OR locked_at <= ?)", input.Now).
		Where("attempt_count < max_attempts").
		Where("status IN (?, ?, ?)",
			stores.OutboxMessageStatusPending,
			stores.OutboxMessageStatusRetrying,
			stores.OutboxMessageStatusProcessing,
		)
	if input.Topic != "" {
		query = query.Where("topic = ?", input.Topic)
	}
	if err := query.
		OrderExpr("available_at ASC, created_at ASC, id ASC").
		Limit(input.Limit).
		Scan(ctx); err != nil {
		return nil, err
	}
	out := make([]stores.OutboxMessageRecord, 0, len(candidates))
	for _, candidate := range candidates {
		record := cloneRelationalOutboxMessageRecord(candidate.Message)
		record.Status = stores.OutboxMessageStatusProcessing
		record.AttemptCount++
		record.LockedBy = input.Consumer
		record.LockedAt = cloneRelationalTimePtr(lockUntil)
		record.UpdatedAt = input.Now
		rows, err := updateOutboxMessageRecord(ctx, s.tx, scope, record, &candidate.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if rows == 0 {
			continue
		}
		out = append(out, record)
	}
	return out, nil
}

func (s *relationalTxStore) MarkOutboxMessageSucceeded(ctx context.Context, scope stores.Scope, id string, publishedAt time.Time) (stores.OutboxMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.OutboxMessageRecord{}, relationalInvalidRecordError("outbox_messages", "id", "required")
	}
	if publishedAt.IsZero() {
		publishedAt = time.Now().UTC()
	}
	publishedAt = publishedAt.UTC()
	record, err := loadOutboxMessageRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	previousUpdatedAt := record.UpdatedAt
	record.Status = stores.OutboxMessageStatusSucceeded
	record.LastError = ""
	record.LockedBy = ""
	record.LockedAt = nil
	record.AvailableAt = publishedAt
	record.PublishedAt = cloneRelationalTimePtr(&publishedAt)
	record.UpdatedAt = publishedAt
	rows, err := updateOutboxMessageRecord(ctx, s.tx, scope, record, &previousUpdatedAt)
	if err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	if rows == 0 {
		return stores.OutboxMessageRecord{}, relationalVersionConflictError("outbox_messages", id, 0, 0)
	}
	return cloneRelationalOutboxMessageRecord(record), nil
}

func (s *relationalTxStore) MarkOutboxMessageFailed(ctx context.Context, scope stores.Scope, id, failureReason string, nextAttemptAt *time.Time, failedAt time.Time) (stores.OutboxMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.OutboxMessageRecord{}, relationalInvalidRecordError("outbox_messages", "id", "required")
	}
	failureReason = strings.TrimSpace(failureReason)
	if failureReason == "" {
		failureReason = "dispatch failed"
	}
	if failedAt.IsZero() {
		failedAt = time.Now().UTC()
	}
	failedAt = failedAt.UTC()
	record, err := loadOutboxMessageRecord(ctx, s.tx, scope, id)
	if err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	previousUpdatedAt := record.UpdatedAt
	record.LastError = failureReason
	record.LockedAt = nil
	record.LockedBy = ""
	record.UpdatedAt = failedAt
	if nextAttemptAt != nil && record.AttemptCount < record.MaxAttempts {
		next := nextAttemptAt.UTC()
		record.Status = stores.OutboxMessageStatusRetrying
		record.AvailableAt = next
	} else {
		record.Status = stores.OutboxMessageStatusFailed
		record.AvailableAt = failedAt
	}
	rows, err := updateOutboxMessageRecord(ctx, s.tx, scope, record, &previousUpdatedAt)
	if err != nil {
		return stores.OutboxMessageRecord{}, err
	}
	if rows == 0 {
		return stores.OutboxMessageRecord{}, relationalVersionConflictError("outbox_messages", id, 0, 0)
	}
	return cloneRelationalOutboxMessageRecord(record), nil
}

func (s *relationalTxStore) UpsertIntegrationCredential(ctx context.Context, scope stores.Scope, record stores.IntegrationCredentialRecord) (stores.IntegrationCredentialRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationCredentialRecord{}, err
	}
	record, err = normalizeRelationalIntegrationCredentialRecord(scope, record)
	if err != nil {
		return stores.IntegrationCredentialRecord{}, err
	}
	now := time.Now().UTC()
	existing, err := loadIntegrationCredentialByProviderUserRecord(ctx, s.tx, scope, record.Provider, record.UserID)
	if err == nil {
		applyRelationalIntegrationCredentialExisting(&record, existing, now)
		updateErr := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID)
		if updateErr != nil {
			return stores.IntegrationCredentialRecord{}, updateErr
		}
		return record, nil
	}
	if !relationalIsNotFoundError(err) {
		return stores.IntegrationCredentialRecord{}, err
	}
	record.CreatedAt = now
	record.UpdatedAt = now
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		if !relationalIsUniqueConstraintError(err) {
			return stores.IntegrationCredentialRecord{}, err
		}
		existing, loadErr := loadIntegrationCredentialByProviderUserRecord(ctx, s.tx, scope, record.Provider, record.UserID)
		if loadErr != nil {
			return stores.IntegrationCredentialRecord{}, loadErr
		}
		applyRelationalIntegrationCredentialExisting(&record, existing, now)
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.IntegrationCredentialRecord{}, err
		}
	}
	return record, nil
}

func (s *relationalTxStore) DeleteIntegrationCredential(ctx context.Context, scope stores.Scope, provider, userID string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	userID = normalizeRelationalID(userID)
	if provider == "" {
		return relationalInvalidRecordError("integration_credentials", "provider", "required")
	}
	if userID == "" {
		return relationalInvalidRecordError("integration_credentials", "user_id", "required")
	}
	record, err := loadIntegrationCredentialByProviderUserRecord(ctx, s.tx, scope, provider, userID)
	if err != nil {
		return err
	}
	return deleteScopedModelByID(ctx, s.tx, (*stores.IntegrationCredentialRecord)(nil), record.TenantID, record.OrgID, record.ID)
}

func (s *relationalTxStore) UpsertMappingSpec(ctx context.Context, scope stores.Scope, record stores.MappingSpecRecord) (stores.MappingSpecRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.MappingSpecRecord{}, err
	}
	record, err = normalizeRelationalMappingSpecRecord(scope, record)
	if err != nil {
		return stores.MappingSpecRecord{}, err
	}
	now := time.Now().UTC()
	existing, exists, err := loadExistingRelationalMappingSpec(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.MappingSpecRecord{}, err
	}
	if exists {
		record, err = updateRelationalMappingSpecRecord(record, existing)
		if err != nil {
			return stores.MappingSpecRecord{}, err
		}
	} else {
		record = createRelationalMappingSpecRecord(record, now)
	}
	record = finalizeRelationalMappingSpecRecord(record, now)
	if exists {
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.MappingSpecRecord{}, err
		}
		return record, nil
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.MappingSpecRecord{}, relationalUniqueConstraintError(err, "integration_mapping_specs", "id")
	}
	return record, nil
}

func normalizeRelationalMappingSpecRecord(scope stores.Scope, record stores.MappingSpecRecord) (stores.MappingSpecRecord, error) {
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.Name = strings.TrimSpace(record.Name)
	record.Status = relationalNormalizeMappingStatus(record.Status)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	record.UpdatedByUserID = normalizeRelationalID(record.UpdatedByUserID)
	record.ExternalSchema.ObjectType = strings.TrimSpace(record.ExternalSchema.ObjectType)
	record.ExternalSchema.Version = strings.TrimSpace(record.ExternalSchema.Version)
	record.ExternalSchema.Fields = append([]stores.ExternalFieldRef{}, record.ExternalSchema.Fields...)
	for i := range record.ExternalSchema.Fields {
		record.ExternalSchema.Fields[i].Object = strings.TrimSpace(record.ExternalSchema.Fields[i].Object)
		record.ExternalSchema.Fields[i].Field = strings.TrimSpace(record.ExternalSchema.Fields[i].Field)
		record.ExternalSchema.Fields[i].Type = strings.TrimSpace(record.ExternalSchema.Fields[i].Type)
		record.ExternalSchema.Fields[i].ConstraintsJSON = strings.TrimSpace(record.ExternalSchema.Fields[i].ConstraintsJSON)
	}
	record.Rules = append([]stores.MappingRule{}, record.Rules...)
	for i := range record.Rules {
		record.Rules[i].SourceObject = strings.TrimSpace(record.Rules[i].SourceObject)
		record.Rules[i].SourceField = strings.TrimSpace(record.Rules[i].SourceField)
		record.Rules[i].TargetEntity = strings.TrimSpace(record.Rules[i].TargetEntity)
		record.Rules[i].TargetPath = strings.TrimSpace(record.Rules[i].TargetPath)
		record.Rules[i].DefaultValue = strings.TrimSpace(record.Rules[i].DefaultValue)
		record.Rules[i].Transform = strings.TrimSpace(record.Rules[i].Transform)
	}
	record.CompiledJSON = strings.TrimSpace(record.CompiledJSON)
	record.CompiledHash = strings.TrimSpace(record.CompiledHash)
	if record.Provider == "" {
		return stores.MappingSpecRecord{}, relationalInvalidRecordError("integration_mapping_specs", "provider", "required")
	}
	if record.Name == "" {
		return stores.MappingSpecRecord{}, relationalInvalidRecordError("integration_mapping_specs", "name", "required")
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record, nil
}

func loadExistingRelationalMappingSpec(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.MappingSpecRecord, bool, error) {
	record, err := loadMappingSpecRecordDirect(ctx, idb, scope, id)
	if relationalIsNotFoundError(err) {
		return stores.MappingSpecRecord{}, false, nil
	}
	if err != nil {
		return stores.MappingSpecRecord{}, false, err
	}
	return record, true, nil
}

func updateRelationalMappingSpecRecord(record, existing stores.MappingSpecRecord) (stores.MappingSpecRecord, error) {
	if record.Version > 0 && record.Version != existing.Version {
		return stores.MappingSpecRecord{}, relationalVersionConflictError("integration_mapping_specs", record.ID, record.Version, existing.Version)
	}
	record.Version = existing.Version + 1
	record.CreatedAt = existing.CreatedAt
	record.PublishedAt = cloneRelationalTimePtr(existing.PublishedAt)
	if existing.Status == stores.MappingSpecStatusPublished && record.Status == stores.MappingSpecStatusDraft {
		record.Status = existing.Status
	}
	return record, nil
}

func createRelationalMappingSpecRecord(record stores.MappingSpecRecord, now time.Time) stores.MappingSpecRecord {
	record.Version = relationalNormalizePositiveVersion(record.Version)
	record.CreatedAt = now
	return record
}

func finalizeRelationalMappingSpecRecord(record stores.MappingSpecRecord, now time.Time) stores.MappingSpecRecord {
	if record.Status == stores.MappingSpecStatusPublished {
		if record.PublishedAt == nil {
			record.PublishedAt = cloneRelationalTimePtr(&now)
		} else {
			record.PublishedAt = cloneRelationalTimePtr(record.PublishedAt)
		}
	} else {
		record.PublishedAt = nil
	}
	record.UpdatedAt = now
	return record
}

func (s *relationalTxStore) PublishMappingSpec(ctx context.Context, scope stores.Scope, id string, expectedVersion int64, publishedAt time.Time) (stores.MappingSpecRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.MappingSpecRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.MappingSpecRecord{}, relationalInvalidRecordError("integration_mapping_specs", "id", "required")
	}
	publishedAt = relationalTimeOrNow(publishedAt)
	record, err := loadMappingSpecRecordDirect(ctx, s.tx, scope, id)
	if err != nil {
		return stores.MappingSpecRecord{}, err
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.MappingSpecRecord{}, relationalVersionConflictError("integration_mapping_specs", id, expectedVersion, record.Version)
	}
	record.Status = stores.MappingSpecStatusPublished
	record.PublishedAt = cloneRelationalTimePtr(&publishedAt)
	record.Version++
	record.UpdatedAt = publishedAt
	result, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Where("version = ?", record.Version-1).
		Exec(ctx)
	if err != nil {
		return stores.MappingSpecRecord{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return stores.MappingSpecRecord{}, err
	}
	if rows == 0 {
		current, loadErr := loadMappingSpecRecordDirect(ctx, s.tx, scope, id)
		if loadErr != nil {
			return stores.MappingSpecRecord{}, loadErr
		}
		return stores.MappingSpecRecord{}, relationalVersionConflictError("integration_mapping_specs", id, expectedVersion, current.Version)
	}
	return record, nil
}

func (s *relationalTxStore) UpsertIntegrationBinding(ctx context.Context, scope stores.Scope, record stores.IntegrationBindingRecord) (stores.IntegrationBindingRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationBindingRecord{}, err
	}
	record, err = normalizeRelationalIntegrationBindingRecord(scope, record)
	if err != nil {
		return stores.IntegrationBindingRecord{}, err
	}
	now := time.Now().UTC()
	existing, exists, err := loadExistingRelationalIntegrationBinding(ctx, s.tx, scope, record.Provider, record.EntityKind, record.ExternalID)
	if err != nil {
		return stores.IntegrationBindingRecord{}, err
	}
	if exists {
		record, err = updateRelationalIntegrationBindingRecord(record, existing, now)
		if err != nil {
			return stores.IntegrationBindingRecord{}, err
		}
		return updateRelationalIntegrationBinding(ctx, s.tx, scope, record, existing.Version)
	}
	record = createRelationalIntegrationBindingRecord(record, now)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		if !relationalIsUniqueConstraintError(err) {
			return stores.IntegrationBindingRecord{}, err
		}
		existing, loadErr := loadIntegrationBindingByExternalRecord(ctx, s.tx, scope, record.Provider, record.EntityKind, record.ExternalID)
		if loadErr != nil {
			return stores.IntegrationBindingRecord{}, loadErr
		}
		return stores.IntegrationBindingRecord{}, relationalVersionConflictError("integration_bindings", existing.ID, record.Version, existing.Version)
	}
	return record, nil
}

func normalizeRelationalIntegrationBindingRecord(scope stores.Scope, record stores.IntegrationBindingRecord) (stores.IntegrationBindingRecord, error) {
	record.Provider, record.EntityKind = relationalNormalizeProviderAndEntity(record.Provider, record.EntityKind)
	record.ExternalID = normalizeRelationalID(record.ExternalID)
	record.InternalID = normalizeRelationalID(record.InternalID)
	record.ProvenanceJSON = strings.TrimSpace(record.ProvenanceJSON)
	if record.Provider == "" {
		return stores.IntegrationBindingRecord{}, relationalInvalidRecordError("integration_bindings", "provider", "required")
	}
	if record.EntityKind == "" {
		return stores.IntegrationBindingRecord{}, relationalInvalidRecordError("integration_bindings", "entity_kind", "required")
	}
	if record.ExternalID == "" {
		return stores.IntegrationBindingRecord{}, relationalInvalidRecordError("integration_bindings", "external_id", "required")
	}
	if record.InternalID == "" {
		return stores.IntegrationBindingRecord{}, relationalInvalidRecordError("integration_bindings", "internal_id", "required")
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record, nil
}

func loadExistingRelationalIntegrationBinding(ctx context.Context, idb bun.IDB, scope stores.Scope, provider, entityKind, externalID string) (stores.IntegrationBindingRecord, bool, error) {
	record, err := loadIntegrationBindingByExternalRecord(ctx, idb, scope, provider, entityKind, externalID)
	if relationalIsNotFoundError(err) {
		return stores.IntegrationBindingRecord{}, false, nil
	}
	if err != nil {
		return stores.IntegrationBindingRecord{}, false, err
	}
	return record, true, nil
}

func updateRelationalIntegrationBindingRecord(record, existing stores.IntegrationBindingRecord, now time.Time) (stores.IntegrationBindingRecord, error) {
	if record.Version > 0 && record.Version != existing.Version {
		return stores.IntegrationBindingRecord{}, relationalVersionConflictError("integration_bindings", existing.ID, record.Version, existing.Version)
	}
	record.ID = existing.ID
	record.Version = existing.Version + 1
	record.CreatedAt = existing.CreatedAt
	record.UpdatedAt = now
	return record, nil
}

func createRelationalIntegrationBindingRecord(record stores.IntegrationBindingRecord, now time.Time) stores.IntegrationBindingRecord {
	record.Version = relationalNormalizePositiveVersion(record.Version)
	record.CreatedAt = now
	record.UpdatedAt = now
	return record
}

func updateRelationalIntegrationBinding(ctx context.Context, idb bun.IDB, scope stores.Scope, record stores.IntegrationBindingRecord, expectedVersion int64) (stores.IntegrationBindingRecord, error) {
	result, err := idb.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Where("version = ?", expectedVersion).
		Exec(ctx)
	if err != nil {
		return stores.IntegrationBindingRecord{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return stores.IntegrationBindingRecord{}, err
	}
	if rows == 0 {
		current, loadErr := loadIntegrationBindingByExternalRecord(ctx, idb, scope, record.Provider, record.EntityKind, record.ExternalID)
		if loadErr != nil {
			return stores.IntegrationBindingRecord{}, loadErr
		}
		return stores.IntegrationBindingRecord{}, relationalVersionConflictError("integration_bindings", record.ID, expectedVersion, current.Version)
	}
	return record, nil
}

func (s *relationalTxStore) CreateIntegrationSyncRun(ctx context.Context, scope stores.Scope, record stores.IntegrationSyncRunRecord) (stores.IntegrationSyncRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, err
	}
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.Direction = strings.ToLower(strings.TrimSpace(record.Direction))
	record.MappingSpecID = normalizeRelationalID(record.MappingSpecID)
	record.Status = relationalNormalizeSyncRunStatus(record.Status)
	record.Cursor = strings.TrimSpace(record.Cursor)
	record.LastError = strings.TrimSpace(record.LastError)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	if record.Provider == "" {
		return stores.IntegrationSyncRunRecord{}, relationalInvalidRecordError("integration_sync_runs", "provider", "required")
	}
	if record.Direction == "" {
		return stores.IntegrationSyncRunRecord{}, relationalInvalidRecordError("integration_sync_runs", "direction", "required")
	}
	if record.ID = normalizeRelationalID(record.ID); record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.StartedAt = relationalTimeOrNow(record.StartedAt)
	if record.AttemptCount <= 0 {
		record.AttemptCount = 1
	}
	record.Version = relationalNormalizePositiveVersion(record.Version)
	if record.CreatedAt.IsZero() {
		record.CreatedAt = record.StartedAt
	} else {
		record.CreatedAt = record.CreatedAt.UTC()
	}
	if record.UpdatedAt.IsZero() {
		record.UpdatedAt = record.StartedAt
	} else {
		record.UpdatedAt = record.UpdatedAt.UTC()
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.IntegrationSyncRunRecord{}, relationalUniqueConstraintError(err, "integration_sync_runs", "id")
	}
	return record, nil
}

func (s *relationalTxStore) UpdateIntegrationSyncRunStatus(ctx context.Context, scope stores.Scope, id, status, lastError, cursor string, completedAt *time.Time, expectedVersion int64) (stores.IntegrationSyncRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.IntegrationSyncRunRecord{}, relationalInvalidRecordError("integration_sync_runs", "id", "required")
	}
	status = relationalNormalizeSyncRunStatus(status)
	lastError = strings.TrimSpace(lastError)
	cursor = strings.TrimSpace(cursor)
	record, err := loadIntegrationSyncRunRecordDirect(ctx, s.tx, scope, id)
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, err
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.IntegrationSyncRunRecord{}, relationalVersionConflictError("integration_sync_runs", id, expectedVersion, record.Version)
	}
	record.Status = status
	record.LastError = lastError
	if cursor != "" {
		record.Cursor = cursor
	}
	if completedAt != nil {
		record.CompletedAt = cloneRelationalTimePtr(completedAt)
	} else if status == stores.IntegrationSyncRunStatusCompleted || status == stores.IntegrationSyncRunStatusFailed {
		now := time.Now().UTC()
		record.CompletedAt = cloneRelationalTimePtr(&now)
	}
	record.Version++
	record.UpdatedAt = time.Now().UTC()
	result, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Where("version = ?", record.Version-1).
		Exec(ctx)
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, err
	}
	if rows == 0 {
		current, loadErr := loadIntegrationSyncRunRecordDirect(ctx, s.tx, scope, id)
		if loadErr != nil {
			return stores.IntegrationSyncRunRecord{}, loadErr
		}
		return stores.IntegrationSyncRunRecord{}, relationalVersionConflictError("integration_sync_runs", id, expectedVersion, current.Version)
	}
	return record, nil
}

func (s *relationalTxStore) UpsertIntegrationCheckpoint(ctx context.Context, scope stores.Scope, record stores.IntegrationCheckpointRecord) (stores.IntegrationCheckpointRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationCheckpointRecord{}, err
	}
	record, err = normalizeRelationalIntegrationCheckpointRecord(scope, record)
	if err != nil {
		return stores.IntegrationCheckpointRecord{}, err
	}
	now := time.Now().UTC()
	if _, loadErr := loadIntegrationSyncRunRecordDirect(ctx, s.tx, scope, record.RunID); loadErr != nil {
		return stores.IntegrationCheckpointRecord{}, loadErr
	}
	existing, exists, err := loadExistingRelationalIntegrationCheckpoint(ctx, s.tx, scope, record.RunID, record.CheckpointKey)
	if err != nil {
		return stores.IntegrationCheckpointRecord{}, err
	}
	if exists {
		record, err = updateRelationalIntegrationCheckpointRecord(record, existing, now)
		if err != nil {
			return stores.IntegrationCheckpointRecord{}, err
		}
		return updateRelationalIntegrationCheckpoint(ctx, s.tx, scope, record, existing.Version)
	}
	record = createRelationalIntegrationCheckpointRecord(record, now)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		if !relationalIsUniqueConstraintError(err) {
			return stores.IntegrationCheckpointRecord{}, err
		}
		existing, loadErr := loadIntegrationCheckpointByKeyRecord(ctx, s.tx, scope, record.RunID, record.CheckpointKey)
		if loadErr != nil {
			return stores.IntegrationCheckpointRecord{}, loadErr
		}
		return stores.IntegrationCheckpointRecord{}, relationalVersionConflictError("integration_checkpoints", existing.ID, record.Version, existing.Version)
	}
	return record, nil
}

func normalizeRelationalIntegrationCheckpointRecord(scope stores.Scope, record stores.IntegrationCheckpointRecord) (stores.IntegrationCheckpointRecord, error) {
	record.RunID = normalizeRelationalID(record.RunID)
	record.CheckpointKey = strings.TrimSpace(record.CheckpointKey)
	record.Cursor = strings.TrimSpace(record.Cursor)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	if record.RunID == "" {
		return stores.IntegrationCheckpointRecord{}, relationalInvalidRecordError("integration_checkpoints", "run_id", "required")
	}
	if record.CheckpointKey == "" {
		return stores.IntegrationCheckpointRecord{}, relationalInvalidRecordError("integration_checkpoints", "checkpoint_key", "required")
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	return record, nil
}

func loadExistingRelationalIntegrationCheckpoint(ctx context.Context, idb bun.IDB, scope stores.Scope, runID, checkpointKey string) (stores.IntegrationCheckpointRecord, bool, error) {
	record, err := loadIntegrationCheckpointByKeyRecord(ctx, idb, scope, runID, checkpointKey)
	if relationalIsNotFoundError(err) {
		return stores.IntegrationCheckpointRecord{}, false, nil
	}
	if err != nil {
		return stores.IntegrationCheckpointRecord{}, false, err
	}
	return record, true, nil
}

func updateRelationalIntegrationCheckpointRecord(record, existing stores.IntegrationCheckpointRecord, now time.Time) (stores.IntegrationCheckpointRecord, error) {
	if record.Version > 0 && record.Version != existing.Version {
		return stores.IntegrationCheckpointRecord{}, relationalVersionConflictError("integration_checkpoints", existing.ID, record.Version, existing.Version)
	}
	record.ID = existing.ID
	record.Version = existing.Version + 1
	record.CreatedAt = existing.CreatedAt
	record.UpdatedAt = now
	return record, nil
}

func createRelationalIntegrationCheckpointRecord(record stores.IntegrationCheckpointRecord, now time.Time) stores.IntegrationCheckpointRecord {
	record.Version = relationalNormalizePositiveVersion(record.Version)
	record.CreatedAt = now
	record.UpdatedAt = now
	return record
}

func updateRelationalIntegrationCheckpoint(ctx context.Context, idb bun.IDB, scope stores.Scope, record stores.IntegrationCheckpointRecord, expectedVersion int64) (stores.IntegrationCheckpointRecord, error) {
	result, err := idb.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Where("version = ?", expectedVersion).
		Exec(ctx)
	if err != nil {
		return stores.IntegrationCheckpointRecord{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return stores.IntegrationCheckpointRecord{}, err
	}
	if rows == 0 {
		current, loadErr := loadIntegrationCheckpointByKeyRecord(ctx, idb, scope, record.RunID, record.CheckpointKey)
		if loadErr != nil {
			return stores.IntegrationCheckpointRecord{}, loadErr
		}
		return stores.IntegrationCheckpointRecord{}, relationalVersionConflictError("integration_checkpoints", record.ID, expectedVersion, current.Version)
	}
	return record, nil
}

func (s *relationalTxStore) CreateIntegrationConflict(ctx context.Context, scope stores.Scope, record stores.IntegrationConflictRecord) (stores.IntegrationConflictRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationConflictRecord{}, err
	}
	record.RunID = normalizeRelationalID(record.RunID)
	record.BindingID = normalizeRelationalID(record.BindingID)
	record.Provider, record.EntityKind = relationalNormalizeProviderAndEntity(record.Provider, record.EntityKind)
	record.ExternalID = normalizeRelationalID(record.ExternalID)
	record.InternalID = normalizeRelationalID(record.InternalID)
	record.Status = relationalNormalizeConflictStatus(record.Status)
	record.Reason = strings.TrimSpace(record.Reason)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	record.ResolutionJSON = strings.TrimSpace(record.ResolutionJSON)
	record.ResolvedByUserID = normalizeRelationalID(record.ResolvedByUserID)
	if record.Provider == "" {
		return stores.IntegrationConflictRecord{}, relationalInvalidRecordError("integration_conflicts", "provider", "required")
	}
	if record.EntityKind == "" {
		return stores.IntegrationConflictRecord{}, relationalInvalidRecordError("integration_conflicts", "entity_kind", "required")
	}
	if record.ExternalID == "" {
		return stores.IntegrationConflictRecord{}, relationalInvalidRecordError("integration_conflicts", "external_id", "required")
	}
	if record.Reason == "" {
		return stores.IntegrationConflictRecord{}, relationalInvalidRecordError("integration_conflicts", "reason", "required")
	}
	if record.ID = normalizeRelationalID(record.ID); record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Version = relationalNormalizePositiveVersion(record.Version)
	now := time.Now().UTC()
	record.CreatedAt = now
	record.UpdatedAt = now
	record.ResolvedAt = cloneRelationalTimePtr(record.ResolvedAt)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.IntegrationConflictRecord{}, relationalUniqueConstraintError(err, "integration_conflicts", "id")
	}
	return record, nil
}

func (s *relationalTxStore) ResolveIntegrationConflict(ctx context.Context, scope stores.Scope, id, status, resolutionJSON, resolvedByUserID string, resolvedAt time.Time, expectedVersion int64) (stores.IntegrationConflictRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationConflictRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.IntegrationConflictRecord{}, relationalInvalidRecordError("integration_conflicts", "id", "required")
	}
	status = strings.ToLower(strings.TrimSpace(status))
	if status != stores.IntegrationConflictStatusResolved && status != stores.IntegrationConflictStatusIgnored {
		return stores.IntegrationConflictRecord{}, relationalInvalidRecordError("integration_conflicts", "status", "must be resolved or ignored")
	}
	resolutionJSON = strings.TrimSpace(resolutionJSON)
	resolvedByUserID = normalizeRelationalID(resolvedByUserID)
	resolvedAt = relationalTimeOrNow(resolvedAt)
	record, err := loadIntegrationConflictRecordDirect(ctx, s.tx, scope, id)
	if err != nil {
		return stores.IntegrationConflictRecord{}, err
	}
	if expectedVersion > 0 && record.Version != expectedVersion {
		return stores.IntegrationConflictRecord{}, relationalVersionConflictError("integration_conflicts", id, expectedVersion, record.Version)
	}
	record.Status = status
	record.ResolutionJSON = resolutionJSON
	record.ResolvedByUserID = resolvedByUserID
	record.ResolvedAt = cloneRelationalTimePtr(&resolvedAt)
	record.Version++
	record.UpdatedAt = resolvedAt
	result, err := s.tx.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Where("version = ?", record.Version-1).
		Exec(ctx)
	if err != nil {
		return stores.IntegrationConflictRecord{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return stores.IntegrationConflictRecord{}, err
	}
	if rows == 0 {
		current, loadErr := loadIntegrationConflictRecordDirect(ctx, s.tx, scope, id)
		if loadErr != nil {
			return stores.IntegrationConflictRecord{}, loadErr
		}
		return stores.IntegrationConflictRecord{}, relationalVersionConflictError("integration_conflicts", id, expectedVersion, current.Version)
	}
	return record, nil
}

func (s *relationalTxStore) AppendIntegrationChangeEvent(ctx context.Context, scope stores.Scope, record stores.IntegrationChangeEventRecord) (stores.IntegrationChangeEventRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationChangeEventRecord{}, err
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.Provider = strings.ToLower(strings.TrimSpace(record.Provider))
	record.EventType = strings.TrimSpace(record.EventType)
	record.SourceEventID = strings.TrimSpace(record.SourceEventID)
	record.IdempotencyKey = strings.TrimSpace(record.IdempotencyKey)
	record.PayloadJSON = strings.TrimSpace(record.PayloadJSON)
	if record.Provider == "" {
		return stores.IntegrationChangeEventRecord{}, relationalInvalidRecordError("integration_change_events", "provider", "required")
	}
	if record.EventType == "" {
		return stores.IntegrationChangeEventRecord{}, relationalInvalidRecordError("integration_change_events", "event_type", "required")
	}
	if record.IdempotencyKey == "" {
		return stores.IntegrationChangeEventRecord{}, relationalInvalidRecordError("integration_change_events", "idempotency_key", "required")
	}
	if record.ID = normalizeRelationalID(record.ID); record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.EmittedAt = relationalTimeOrNow(record.EmittedAt)
	if record.CreatedAt.IsZero() {
		record.CreatedAt = record.EmittedAt
	} else {
		record.CreatedAt = record.CreatedAt.UTC()
	}
	result, err := s.tx.NewInsert().
		Model(&record).
		On("CONFLICT (tenant_id, org_id, provider, idempotency_key) DO NOTHING").
		Exec(ctx)
	if err != nil {
		return stores.IntegrationChangeEventRecord{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return stores.IntegrationChangeEventRecord{}, err
	}
	if rows == 0 {
		existing, loadErr := findIntegrationChangeEventByDedupeRecord(ctx, s.tx, scope, record.Provider, record.IdempotencyKey)
		if loadErr != nil {
			return stores.IntegrationChangeEventRecord{}, loadErr
		}
		return existing, nil
	}
	return record, nil
}

func (s *relationalTxStore) ClaimIntegrationMutation(ctx context.Context, scope stores.Scope, idempotencyKey string, firstSeenAt time.Time) (bool, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return false, err
	}
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" {
		return false, relationalInvalidRecordError("integration_mutation_claims", "idempotency_key", "required")
	}
	firstSeenAt = relationalTimeOrNow(firstSeenAt)
	record := IntegrationMutationClaimRecord{
		ID:             relationalIntegrationMutationClaimID(scope, idempotencyKey),
		TenantID:       scope.TenantID,
		OrgID:          scope.OrgID,
		IdempotencyKey: idempotencyKey,
		FirstSeenAt:    firstSeenAt,
		CreatedAt:      firstSeenAt,
	}
	result, err := s.tx.NewInsert().
		Model(&record).
		On("CONFLICT (tenant_id, org_id, idempotency_key) DO NOTHING").
		Exec(ctx)
	if err != nil {
		return false, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows > 0, nil
}

func (s *relationalTxStore) UpsertPlacementRun(ctx context.Context, scope stores.Scope, record stores.PlacementRunRecord) (stores.PlacementRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.PlacementRunRecord{}, err
	}
	record, err = normalizeRelationalPlacementRunRecord(record)
	if err != nil {
		return stores.PlacementRunRecord{}, err
	}
	now := time.Now().UTC()
	if _, loadErr := loadAgreementRecord(ctx, s.tx, scope, record.AgreementID); loadErr != nil {
		return stores.PlacementRunRecord{}, loadErr
	}
	existing, exists, err := loadExistingRelationalPlacementRun(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.PlacementRunRecord{}, err
	}
	if exists {
		record, err = updateRelationalPlacementRunRecord(record, existing)
		if err != nil {
			return stores.PlacementRunRecord{}, err
		}
	} else {
		record = createRelationalPlacementRunRecord(record, now)
	}
	record = finalizeRelationalPlacementRunRecord(scope, record, now)
	if exists {
		return updateRelationalPlacementRun(ctx, s.tx, scope, record)
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.PlacementRunRecord{}, relationalUniqueConstraintError(err, "placement_runs", "id")
	}
	return record, nil
}

func normalizeRelationalPlacementRunRecord(record stores.PlacementRunRecord) (stores.PlacementRunRecord, error) {
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	if record.AgreementID == "" {
		return stores.PlacementRunRecord{}, relationalInvalidRecordError("placement_runs", "agreement_id", "required")
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.Status = relationalNormalizePlacementRunStatus(record.Status)
	record.ReasonCode = strings.TrimSpace(record.ReasonCode)
	record.CreatedByUserID = normalizeRelationalID(record.CreatedByUserID)
	record.PolicyJSON = strings.TrimSpace(record.PolicyJSON)
	record.ResolverOrder = relationalSanitizePlacementResolverIDs(record.ResolverOrder)
	record.ExecutedResolvers = relationalSanitizePlacementResolverIDs(record.ExecutedResolvers)
	record.ResolverScores = relationalClonePlacementResolverScores(record.ResolverScores)
	record.Suggestions = relationalClonePlacementSuggestionRecords(record.Suggestions)
	record.SelectedSuggestionIDs = append([]string{}, record.SelectedSuggestionIDs...)
	record.UnresolvedDefinitionIDs = append([]string{}, record.UnresolvedDefinitionIDs...)
	record.SelectedSource = strings.TrimSpace(record.SelectedSource)
	if record.MaxBudget < 0 {
		record.MaxBudget = 0
	}
	if record.BudgetUsed < 0 {
		record.BudgetUsed = 0
	}
	if record.MaxTimeMS < 0 {
		record.MaxTimeMS = 0
	}
	if record.ElapsedMS < 0 {
		record.ElapsedMS = 0
	}
	if record.ManualOverrideCount < 0 {
		record.ManualOverrideCount = 0
	}
	return record, nil
}

func loadExistingRelationalPlacementRun(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.PlacementRunRecord, bool, error) {
	record, err := loadPlacementRunRecordDirect(ctx, idb, scope, id)
	if relationalIsNotFoundError(err) {
		return stores.PlacementRunRecord{}, false, nil
	}
	if err != nil {
		return stores.PlacementRunRecord{}, false, err
	}
	return record, true, nil
}

func updateRelationalPlacementRunRecord(record, existing stores.PlacementRunRecord) (stores.PlacementRunRecord, error) {
	if record.Version > 0 && record.Version != existing.Version {
		return stores.PlacementRunRecord{}, relationalVersionConflictError("placement_runs", record.ID, record.Version, existing.Version)
	}
	record.Version = existing.Version + 1
	record.CreatedAt = existing.CreatedAt
	return record, nil
}

func createRelationalPlacementRunRecord(record stores.PlacementRunRecord, now time.Time) stores.PlacementRunRecord {
	record.Version = relationalNormalizePositiveVersion(record.Version)
	record.CreatedAt = now
	return record
}

func finalizeRelationalPlacementRunRecord(scope stores.Scope, record stores.PlacementRunRecord, now time.Time) stores.PlacementRunRecord {
	if record.CompletedAt != nil {
		record.CompletedAt = cloneRelationalTimePtr(record.CompletedAt)
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.UpdatedAt = now
	return record
}

func updateRelationalPlacementRun(ctx context.Context, idb bun.IDB, scope stores.Scope, record stores.PlacementRunRecord) (stores.PlacementRunRecord, error) {
	result, err := idb.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Where("version = ?", record.Version-1).
		Exec(ctx)
	if err != nil {
		return stores.PlacementRunRecord{}, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return stores.PlacementRunRecord{}, err
	}
	if rows == 0 {
		current, loadErr := loadPlacementRunRecordDirect(ctx, idb, scope, record.ID)
		if loadErr != nil {
			return stores.PlacementRunRecord{}, loadErr
		}
		return stores.PlacementRunRecord{}, relationalVersionConflictError("placement_runs", record.ID, record.Version-1, current.Version)
	}
	return record, nil
}

func (s *relationalTxStore) UpsertSignerProfile(ctx context.Context, scope stores.Scope, record stores.SignerProfileRecord) (stores.SignerProfileRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SignerProfileRecord{}, err
	}
	record, err = normalizeRelationalSignerProfileRecord(scope, record)
	if err != nil {
		return stores.SignerProfileRecord{}, err
	}
	now := time.Now().UTC()
	existing, exists, err := loadExistingRelationalSignerProfile(ctx, s.tx, scope, record.Subject, record.Key)
	if err != nil {
		return stores.SignerProfileRecord{}, err
	}
	if exists {
		record = updateRelationalSignerProfileRecord(record, existing, now)
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.SignerProfileRecord{}, err
		}
		return record, nil
	}
	record = createRelationalSignerProfileRecord(record, now)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		if !relationalIsUniqueConstraintError(err) {
			return stores.SignerProfileRecord{}, err
		}
		recovered, loadErr := loadSignerProfileBySubjectKeyRecord(ctx, s.tx, scope, record.Subject, record.Key)
		if loadErr != nil {
			return stores.SignerProfileRecord{}, loadErr
		}
		record = updateRelationalSignerProfileRecord(record, recovered, now)
		if err := updateScopedModelByID(ctx, s.tx, &record, record.TenantID, record.OrgID, record.ID); err != nil {
			return stores.SignerProfileRecord{}, err
		}
	}
	return record, nil
}

func normalizeRelationalSignerProfileRecord(scope stores.Scope, record stores.SignerProfileRecord) (stores.SignerProfileRecord, error) {
	record.Subject = strings.ToLower(strings.TrimSpace(record.Subject))
	record.Key = strings.TrimSpace(record.Key)
	record.FullName = strings.TrimSpace(record.FullName)
	record.Initials = strings.TrimSpace(record.Initials)
	record.TypedSignature = strings.TrimSpace(record.TypedSignature)
	record.DrawnSignatureDataURL = strings.TrimSpace(record.DrawnSignatureDataURL)
	record.DrawnInitialsDataURL = strings.TrimSpace(record.DrawnInitialsDataURL)
	if record.Subject == "" {
		return stores.SignerProfileRecord{}, relationalInvalidRecordError("signer_profiles", "subject", "required")
	}
	if record.Key == "" {
		return stores.SignerProfileRecord{}, relationalInvalidRecordError("signer_profiles", "key", "required")
	}
	if record.ExpiresAt.IsZero() {
		return stores.SignerProfileRecord{}, relationalInvalidRecordError("signer_profiles", "expires_at", "required")
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.ExpiresAt = record.ExpiresAt.UTC()
	return record, nil
}

func loadExistingRelationalSignerProfile(ctx context.Context, idb bun.IDB, scope stores.Scope, subject, key string) (stores.SignerProfileRecord, bool, error) {
	record, err := loadSignerProfileBySubjectKeyRecord(ctx, idb, scope, subject, key)
	if relationalIsNotFoundError(err) {
		return stores.SignerProfileRecord{}, false, nil
	}
	if err != nil {
		return stores.SignerProfileRecord{}, false, err
	}
	return record, true, nil
}

func updateRelationalSignerProfileRecord(record, existing stores.SignerProfileRecord, now time.Time) stores.SignerProfileRecord {
	record.ID = existing.ID
	record.CreatedAt = existing.CreatedAt
	if record.UpdatedAt.IsZero() {
		record.UpdatedAt = now
	} else {
		record.UpdatedAt = record.UpdatedAt.UTC()
	}
	if record.UpdatedAt.Before(record.CreatedAt) {
		record.UpdatedAt = record.CreatedAt
	}
	return record
}

func createRelationalSignerProfileRecord(record stores.SignerProfileRecord, now time.Time) stores.SignerProfileRecord {
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	if record.CreatedAt.IsZero() {
		record.CreatedAt = now
	} else {
		record.CreatedAt = record.CreatedAt.UTC()
	}
	if record.UpdatedAt.IsZero() {
		record.UpdatedAt = record.CreatedAt
	} else {
		record.UpdatedAt = record.UpdatedAt.UTC()
	}
	if record.UpdatedAt.Before(record.CreatedAt) {
		record.UpdatedAt = record.CreatedAt
	}
	return record
}

func (s *relationalTxStore) DeleteSignerProfile(ctx context.Context, scope stores.Scope, subject, key string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	subject = strings.ToLower(strings.TrimSpace(subject))
	key = strings.TrimSpace(key)
	if subject == "" {
		return relationalInvalidRecordError("signer_profiles", "subject", "required")
	}
	if key == "" {
		return relationalInvalidRecordError("signer_profiles", "key", "required")
	}
	record, err := loadSignerProfileBySubjectKeyRecord(ctx, s.tx, scope, subject, key)
	if err != nil {
		return err
	}
	return deleteScopedModelByID(ctx, s.tx, (*stores.SignerProfileRecord)(nil), record.TenantID, record.OrgID, record.ID)
}

func (s *relationalTxStore) CreateSavedSignerSignature(ctx context.Context, scope stores.Scope, record stores.SavedSignerSignatureRecord) (stores.SavedSignerSignatureRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SavedSignerSignatureRecord{}, err
	}
	record.Subject = strings.ToLower(strings.TrimSpace(record.Subject))
	record.Type = strings.ToLower(strings.TrimSpace(record.Type))
	record.Label = strings.TrimSpace(record.Label)
	record.ObjectKey = strings.TrimSpace(record.ObjectKey)
	record.ThumbnailDataURL = strings.TrimSpace(record.ThumbnailDataURL)
	if record.Subject == "" {
		return stores.SavedSignerSignatureRecord{}, relationalInvalidRecordError("saved_signatures", "subject", "required")
	}
	if record.Type == "" {
		return stores.SavedSignerSignatureRecord{}, relationalInvalidRecordError("saved_signatures", "type", "required")
	}
	if record.ThumbnailDataURL == "" {
		return stores.SavedSignerSignatureRecord{}, relationalInvalidRecordError("saved_signatures", "thumbnail_data_url", "required")
	}
	if record.ID = normalizeRelationalID(record.ID); record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.SavedSignerSignatureRecord{}, relationalUniqueConstraintError(err, "saved_signatures", "id")
	}
	return record, nil
}

func (s *relationalTxStore) DeleteSavedSignerSignature(ctx context.Context, scope stores.Scope, subject, id string) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	subject = strings.ToLower(strings.TrimSpace(subject))
	id = normalizeRelationalID(id)
	if subject == "" {
		return relationalInvalidRecordError("saved_signatures", "subject", "required")
	}
	if id == "" {
		return relationalInvalidRecordError("saved_signatures", "id", "required")
	}
	record, err := loadSavedSignerSignatureRecordDirect(ctx, s.tx, scope, id)
	if err != nil {
		return err
	}
	if record.Subject != subject {
		return relationalNotFoundError("saved_signatures", id)
	}
	return deleteScopedModelByID(ctx, s.tx, (*stores.SavedSignerSignatureRecord)(nil), scope.TenantID, scope.OrgID, id)
}
