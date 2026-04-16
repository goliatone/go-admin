package stores

import (
	"context"
	"time"

	"github.com/goliatone/go-admin/admin/guardedeffects"
	"github.com/goliatone/go-admin/admin/txoutbox"
)

// DocumentStore defines document persistence with explicit tenant/org scope inputs.
type DocumentStore interface {
	Create(ctx context.Context, scope Scope, record DocumentRecord) (DocumentRecord, error)
	Get(ctx context.Context, scope Scope, id string) (DocumentRecord, error)
	List(ctx context.Context, scope Scope, query DocumentQuery) ([]DocumentRecord, error)
	SaveMetadata(ctx context.Context, scope Scope, id string, patch DocumentMetadataPatch) (DocumentRecord, error)
	Delete(ctx context.Context, scope Scope, id string) error
}

// DocumentRemediationLeaseStore defines distributed lease primitives for document-scoped remediation fencing.
type DocumentRemediationLeaseStore interface {
	AcquireDocumentRemediationLease(ctx context.Context, scope Scope, documentID string, input DocumentRemediationLeaseAcquireInput) (DocumentRemediationLeaseClaim, error)
	RenewDocumentRemediationLease(ctx context.Context, scope Scope, documentID string, input DocumentRemediationLeaseRenewInput) (DocumentRemediationLeaseClaim, error)
	ReleaseDocumentRemediationLease(ctx context.Context, scope Scope, documentID string, input DocumentRemediationLeaseReleaseInput) error
}

// RemediationDispatchStore defines durable remediation dispatch/index persistence.
type RemediationDispatchStore interface {
	SaveRemediationDispatch(ctx context.Context, scope Scope, record RemediationDispatchRecord) (RemediationDispatchRecord, error)
	GetRemediationDispatch(ctx context.Context, dispatchID string) (RemediationDispatchRecord, error)
	GetRemediationDispatchByIdempotencyKey(ctx context.Context, scope Scope, key string) (RemediationDispatchRecord, error)
}

// GuardedEffectStore defines durable guarded external effect persistence and lookup.
type GuardedEffectStore interface {
	SaveGuardedEffect(ctx context.Context, scope Scope, record guardedeffects.Record) (guardedeffects.Record, error)
	GetGuardedEffect(ctx context.Context, effectID string) (guardedeffects.Record, error)
	GetGuardedEffectByIdempotencyKey(ctx context.Context, scope Scope, key string) (guardedeffects.Record, error)
	ListGuardedEffects(ctx context.Context, scope Scope, query GuardedEffectQuery) ([]guardedeffects.Record, error)
}

// AgreementStore defines agreement persistence with immutable-after-send and optimistic lock guards.
type AgreementStore interface {
	CreateDraft(ctx context.Context, scope Scope, record AgreementRecord) (AgreementRecord, error)
	GetAgreement(ctx context.Context, scope Scope, id string) (AgreementRecord, error)
	ListAgreements(ctx context.Context, scope Scope, query AgreementQuery) ([]AgreementRecord, error)
	UpdateDraft(ctx context.Context, scope Scope, id string, patch AgreementDraftPatch, expectedVersion int64) (AgreementRecord, error)
	UpdateAgreementReviewProjection(ctx context.Context, scope Scope, id string, patch AgreementReviewProjectionPatch) (AgreementRecord, error)
	UpdateAgreementDeliveryState(ctx context.Context, scope Scope, id string, patch AgreementDeliveryStatePatch) (AgreementRecord, error)
	Transition(ctx context.Context, scope Scope, id string, input AgreementTransitionInput) (AgreementRecord, error)
	CreateAgreementReview(ctx context.Context, scope Scope, record AgreementReviewRecord) (AgreementReviewRecord, error)
	GetAgreementReviewByAgreementID(ctx context.Context, scope Scope, agreementID string) (AgreementReviewRecord, error)
	UpdateAgreementReview(ctx context.Context, scope Scope, record AgreementReviewRecord) (AgreementReviewRecord, error)
	ReplaceAgreementReviewParticipants(ctx context.Context, scope Scope, reviewID string, records []AgreementReviewParticipantRecord) error
	ListAgreementReviewParticipants(ctx context.Context, scope Scope, reviewID string) ([]AgreementReviewParticipantRecord, error)
	UpdateAgreementReviewParticipant(ctx context.Context, scope Scope, record AgreementReviewParticipantRecord) (AgreementReviewParticipantRecord, error)
	CreateAgreementCommentThread(ctx context.Context, scope Scope, record AgreementCommentThreadRecord) (AgreementCommentThreadRecord, error)
	GetAgreementCommentThread(ctx context.Context, scope Scope, threadID string) (AgreementCommentThreadRecord, error)
	UpdateAgreementCommentThread(ctx context.Context, scope Scope, record AgreementCommentThreadRecord) (AgreementCommentThreadRecord, error)
	ListAgreementCommentThreads(ctx context.Context, scope Scope, agreementID string, query AgreementCommentThreadQuery) ([]AgreementCommentThreadRecord, error)
	CreateAgreementCommentMessage(ctx context.Context, scope Scope, record AgreementCommentMessageRecord) (AgreementCommentMessageRecord, error)
	ListAgreementCommentMessages(ctx context.Context, scope Scope, threadID string) ([]AgreementCommentMessageRecord, error)
	UpsertParticipantDraft(ctx context.Context, scope Scope, agreementID string, patch ParticipantDraftPatch, expectedVersion int64) (ParticipantRecord, error)
	DeleteParticipantDraft(ctx context.Context, scope Scope, agreementID, participantID string) error
	ListParticipants(ctx context.Context, scope Scope, agreementID string) ([]ParticipantRecord, error)
	UpsertRecipientDraft(ctx context.Context, scope Scope, agreementID string, patch RecipientDraftPatch, expectedVersion int64) (RecipientRecord, error)
	DeleteRecipientDraft(ctx context.Context, scope Scope, agreementID, recipientID string) error
	ListRecipients(ctx context.Context, scope Scope, agreementID string) ([]RecipientRecord, error)
	TouchRecipientView(ctx context.Context, scope Scope, agreementID, recipientID string, viewedAt time.Time) (RecipientRecord, error)
	CompleteRecipient(ctx context.Context, scope Scope, agreementID, recipientID string, completedAt time.Time, expectedVersion int64) (RecipientRecord, error)
	DeclineRecipient(ctx context.Context, scope Scope, agreementID, recipientID, reason string, declinedAt time.Time, expectedVersion int64) (RecipientRecord, error)
	UpsertFieldDefinitionDraft(ctx context.Context, scope Scope, agreementID string, patch FieldDefinitionDraftPatch) (FieldDefinitionRecord, error)
	DeleteFieldDefinitionDraft(ctx context.Context, scope Scope, agreementID, fieldDefinitionID string) error
	ListFieldDefinitions(ctx context.Context, scope Scope, agreementID string) ([]FieldDefinitionRecord, error)
	UpsertFieldInstanceDraft(ctx context.Context, scope Scope, agreementID string, patch FieldInstanceDraftPatch) (FieldInstanceRecord, error)
	DeleteFieldInstanceDraft(ctx context.Context, scope Scope, agreementID, fieldInstanceID string) error
	ListFieldInstances(ctx context.Context, scope Scope, agreementID string) ([]FieldInstanceRecord, error)
	UpsertFieldDraft(ctx context.Context, scope Scope, agreementID string, patch FieldDraftPatch) (FieldRecord, error)
	DeleteFieldDraft(ctx context.Context, scope Scope, agreementID, fieldID string) error
	ListFields(ctx context.Context, scope Scope, agreementID string) ([]FieldRecord, error)
}

// AgreementRevisionRequestStore defines durable idempotency/replay persistence for revision bootstrap flows.
type AgreementRevisionRequestStore interface {
	BeginAgreementRevisionRequest(ctx context.Context, scope Scope, input AgreementRevisionRequestInput) (AgreementRevisionRequestRecord, bool, error)
	CompleteAgreementRevisionRequest(ctx context.Context, scope Scope, requestID, createdAgreementID string, updatedAt time.Time) (AgreementRevisionRequestRecord, error)
	GetAgreementRevisionRequest(ctx context.Context, scope Scope, id string) (AgreementRevisionRequestRecord, error)
}

// DraftStore defines six-step agreement wizard draft persistence with revision preconditions.
type DraftStore interface {
	CreateDraftSession(ctx context.Context, scope Scope, record DraftRecord) (DraftRecord, bool, error)
	GetDraftSession(ctx context.Context, scope Scope, id string) (DraftRecord, error)
	ListDraftSessions(ctx context.Context, scope Scope, query DraftQuery) ([]DraftRecord, string, error)
	UpdateDraftSession(ctx context.Context, scope Scope, id string, patch DraftPatch, expectedRevision int64) (DraftRecord, error)
	DeleteDraftSession(ctx context.Context, scope Scope, id string) error
	DeleteExpiredDraftSessions(ctx context.Context, before time.Time) (int, error)
}

// SigningStore defines field value persistence with scope and optimistic lock requirements.
type SigningStore interface {
	UpsertFieldValue(ctx context.Context, scope Scope, value FieldValueRecord, expectedVersion int64) (FieldValueRecord, error)
	ListFieldValuesByRecipient(ctx context.Context, scope Scope, agreementID, recipientID string) ([]FieldValueRecord, error)
}

// SignatureArtifactStore defines persistence for signer signature artifacts.
type SignatureArtifactStore interface {
	CreateSignatureArtifact(ctx context.Context, scope Scope, record SignatureArtifactRecord) (SignatureArtifactRecord, error)
	GetSignatureArtifact(ctx context.Context, scope Scope, id string) (SignatureArtifactRecord, error)
}

// SignerProfileStore defines persistence for signer profile preference snapshots.
type SignerProfileStore interface {
	UpsertSignerProfile(ctx context.Context, scope Scope, record SignerProfileRecord) (SignerProfileRecord, error)
	GetSignerProfile(ctx context.Context, scope Scope, subject, key string, now time.Time) (SignerProfileRecord, error)
	DeleteSignerProfile(ctx context.Context, scope Scope, subject, key string) error
}

// SavedSignerSignatureStore defines persistence for reusable signer signatures/initials.
type SavedSignerSignatureStore interface {
	CreateSavedSignerSignature(ctx context.Context, scope Scope, record SavedSignerSignatureRecord) (SavedSignerSignatureRecord, error)
	ListSavedSignerSignatures(ctx context.Context, scope Scope, subject, signatureType string) ([]SavedSignerSignatureRecord, error)
	CountSavedSignerSignatures(ctx context.Context, scope Scope, subject, signatureType string) (int, error)
	DeleteSavedSignerSignature(ctx context.Context, scope Scope, subject, id string) error
}

// SigningTokenStore defines persistence for hashed signer tokens.
type signingTokenLookupStore interface {
	CreateSigningToken(ctx context.Context, scope Scope, record SigningTokenRecord) (SigningTokenRecord, error)
	GetSigningToken(ctx context.Context, scope Scope, id string) (SigningTokenRecord, error)
	GetSigningTokenByHash(ctx context.Context, scope Scope, tokenHash string) (SigningTokenRecord, error)
}

type signingTokenMutationStore interface {
	ListSigningTokens(ctx context.Context, scope Scope, agreementID, recipientID string) ([]SigningTokenRecord, error)
	SaveSigningToken(ctx context.Context, scope Scope, record SigningTokenRecord) (SigningTokenRecord, error)
	RevokeActiveSigningTokens(ctx context.Context, scope Scope, agreementID, recipientID string, revokedAt time.Time) (int, error)
}

type SigningTokenStore interface {
	signingTokenLookupStore
	signingTokenMutationStore
}

type reviewSessionTokenLookupStore interface {
	CreateReviewSessionToken(ctx context.Context, scope Scope, record ReviewSessionTokenRecord) (ReviewSessionTokenRecord, error)
	GetReviewSessionToken(ctx context.Context, scope Scope, id string) (ReviewSessionTokenRecord, error)
	GetReviewSessionTokenByHash(ctx context.Context, scope Scope, tokenHash string) (ReviewSessionTokenRecord, error)
}

type reviewSessionTokenMutationStore interface {
	ListReviewSessionTokens(ctx context.Context, scope Scope, agreementID, participantID string) ([]ReviewSessionTokenRecord, error)
	SaveReviewSessionToken(ctx context.Context, scope Scope, record ReviewSessionTokenRecord) (ReviewSessionTokenRecord, error)
	RevokeActiveReviewSessionTokens(ctx context.Context, scope Scope, agreementID, participantID string, revokedAt time.Time) (int, error)
}

type ReviewSessionTokenStore interface {
	reviewSessionTokenLookupStore
	reviewSessionTokenMutationStore
}

type PublicSignerSessionTokenStore interface {
	CreatePublicSignerSessionToken(ctx context.Context, scope Scope, record PublicSignerSessionTokenRecord) (PublicSignerSessionTokenRecord, error)
	GetPublicSignerSessionToken(ctx context.Context, scope Scope, id string) (PublicSignerSessionTokenRecord, error)
	GetPublicSignerSessionTokenByHash(ctx context.Context, scope Scope, tokenHash string) (PublicSignerSessionTokenRecord, error)
	ListPublicSignerSessionTokens(ctx context.Context, scope Scope, agreementID, recipientID, participantID string) ([]PublicSignerSessionTokenRecord, error)
	SavePublicSignerSessionToken(ctx context.Context, scope Scope, record PublicSignerSessionTokenRecord) (PublicSignerSessionTokenRecord, error)
	RevokeActivePublicSignerSessionTokens(ctx context.Context, scope Scope, agreementID, recipientID, participantID string, revokedAt time.Time) (int, error)
}

// AuditEventStore defines append-only audit event persistence.
type AuditEventStore interface {
	Append(ctx context.Context, scope Scope, event AuditEventRecord) (AuditEventRecord, error)
	ListForAgreement(ctx context.Context, scope Scope, agreementID string, query AuditEventQuery) ([]AuditEventRecord, error)
}

// DraftAuditEventStore defines append-only draft lifecycle audit persistence.
type DraftAuditEventStore interface {
	AppendDraftEvent(ctx context.Context, scope Scope, event DraftAuditEventRecord) (DraftAuditEventRecord, error)
	ListDraftEvents(ctx context.Context, scope Scope, draftID string, query DraftAuditEventQuery) ([]DraftAuditEventRecord, error)
}

// AgreementArtifactStore defines immutable persistence for executed/certificate agreement artifacts.
type AgreementArtifactStore interface {
	SaveAgreementArtifacts(ctx context.Context, scope Scope, record AgreementArtifactRecord) (AgreementArtifactRecord, error)
	GetAgreementArtifacts(ctx context.Context, scope Scope, agreementID string) (AgreementArtifactRecord, error)
}

// EmailLogStore defines persistence for outbound email execution state and retry metadata.
type EmailLogStore interface {
	CreateEmailLog(ctx context.Context, scope Scope, record EmailLogRecord) (EmailLogRecord, error)
	UpdateEmailLog(ctx context.Context, scope Scope, id string, patch EmailLogRecord) (EmailLogRecord, error)
	ListEmailLogs(ctx context.Context, scope Scope, agreementID string) ([]EmailLogRecord, error)
}

// JobRunStore defines dedupe-aware async execution tracking for retryable jobs.
type JobRunStore interface {
	BeginJobRun(ctx context.Context, scope Scope, input JobRunInput) (JobRunRecord, bool, error)
	MarkJobRunSucceeded(ctx context.Context, scope Scope, id string, completedAt time.Time) (JobRunRecord, error)
	MarkJobRunFailed(ctx context.Context, scope Scope, id, failureReason string, nextRetryAt *time.Time, failedAt time.Time) (JobRunRecord, error)
	GetJobRunByDedupe(ctx context.Context, scope Scope, jobName, dedupeKey string) (JobRunRecord, error)
	ListJobRuns(ctx context.Context, scope Scope, agreementID string) ([]JobRunRecord, error)
	EnqueueJob(ctx context.Context, scope Scope, input JobRunEnqueueInput) (JobRunRecord, bool, error)
	ClaimDueJobs(ctx context.Context, scope Scope, input JobRunClaimInput) ([]JobRunRecord, error)
	RenewJobLease(ctx context.Context, scope Scope, id string, input JobRunLeaseRenewInput) (JobRunRecord, error)
	MarkJobSucceeded(ctx context.Context, scope Scope, id string, completedAt time.Time) (JobRunRecord, error)
	MarkJobFailed(ctx context.Context, scope Scope, id string, input JobRunFailureInput) (JobRunRecord, error)
	MarkJobStale(ctx context.Context, scope Scope, id, reason string, staleAt time.Time) (JobRunRecord, error)
	RequeueStaleJobs(ctx context.Context, scope Scope, input JobRunRequeueInput) (int, error)
	ListJobRunsByResource(ctx context.Context, scope Scope, resourceKind, resourceID string) ([]JobRunRecord, error)
}

// GoogleImportRunStore defines async Google import lifecycle persistence with scoped idempotent dedupe.
type GoogleImportRunStore interface {
	BeginGoogleImportRun(ctx context.Context, scope Scope, input GoogleImportRunInput) (GoogleImportRunRecord, bool, error)
	MarkGoogleImportRunRunning(ctx context.Context, scope Scope, id string, startedAt time.Time) (GoogleImportRunRecord, error)
	MarkGoogleImportRunSucceeded(ctx context.Context, scope Scope, id string, input GoogleImportRunSuccessInput) (GoogleImportRunRecord, error)
	MarkGoogleImportRunFailed(ctx context.Context, scope Scope, id string, input GoogleImportRunFailureInput) (GoogleImportRunRecord, error)
	GetGoogleImportRun(ctx context.Context, scope Scope, id string) (GoogleImportRunRecord, error)
	ListGoogleImportRuns(ctx context.Context, scope Scope, query GoogleImportRunQuery) ([]GoogleImportRunRecord, string, error)
}

// AgreementReminderStore defines persistence for recipient reminder cadence state.
type AgreementReminderStore interface {
	UpsertAgreementReminderState(ctx context.Context, scope Scope, record AgreementReminderStateRecord) (AgreementReminderStateRecord, error)
	GetAgreementReminderState(ctx context.Context, scope Scope, agreementID, recipientID string) (AgreementReminderStateRecord, error)
	ClaimDueAgreementReminders(ctx context.Context, scope Scope, input AgreementReminderClaimInput) ([]AgreementReminderClaim, error)
	RenewAgreementReminderLease(ctx context.Context, scope Scope, agreementID, recipientID string, input AgreementReminderLeaseRenewInput) (AgreementReminderClaim, error)
	MarkAgreementReminderSent(ctx context.Context, scope Scope, agreementID, recipientID string, input AgreementReminderMarkInput) (AgreementReminderStateRecord, error)
	MarkAgreementReminderSkipped(ctx context.Context, scope Scope, agreementID, recipientID string, input AgreementReminderMarkInput) (AgreementReminderStateRecord, error)
	MarkAgreementReminderFailed(ctx context.Context, scope Scope, agreementID, recipientID string, input AgreementReminderMarkInput) (AgreementReminderStateRecord, error)
	PauseAgreementReminder(ctx context.Context, scope Scope, agreementID, recipientID string, pausedAt time.Time) (AgreementReminderStateRecord, error)
	ResumeAgreementReminder(ctx context.Context, scope Scope, agreementID, recipientID string, resumedAt time.Time, nextDueAt *time.Time) (AgreementReminderStateRecord, error)
	CleanupAgreementReminderInternalErrors(ctx context.Context, scope Scope, now time.Time, limit int) (int, error)
}

// OutboxStore defines durable post-commit side-effect message persistence.
type OutboxStore interface {
	txoutbox.Store[Scope]
}

// IntegrationCredentialStore defines encrypted provider credential persistence by scope/user.
type IntegrationCredentialStore interface {
	UpsertIntegrationCredential(ctx context.Context, scope Scope, record IntegrationCredentialRecord) (IntegrationCredentialRecord, error)
	GetIntegrationCredential(ctx context.Context, scope Scope, provider, userID string) (IntegrationCredentialRecord, error)
	DeleteIntegrationCredential(ctx context.Context, scope Scope, provider, userID string) error
	// ListIntegrationCredentials returns all credentials for a provider, optionally filtered by base user ID prefix.
	// The baseUserIDPrefix filters credentials whose UserID starts with the given prefix (supports scoped user IDs).
	ListIntegrationCredentials(ctx context.Context, scope Scope, provider string, baseUserIDPrefix string) ([]IntegrationCredentialRecord, error)
}

// IntegrationFoundationStore defines provider-agnostic integration mapping/sync/conflict/event persistence.
type IntegrationFoundationStore interface {
	UpsertMappingSpec(ctx context.Context, scope Scope, record MappingSpecRecord) (MappingSpecRecord, error)
	GetMappingSpec(ctx context.Context, scope Scope, id string) (MappingSpecRecord, error)
	ListMappingSpecs(ctx context.Context, scope Scope, provider string) ([]MappingSpecRecord, error)
	PublishMappingSpec(ctx context.Context, scope Scope, id string, expectedVersion int64, publishedAt time.Time) (MappingSpecRecord, error)

	UpsertIntegrationBinding(ctx context.Context, scope Scope, record IntegrationBindingRecord) (IntegrationBindingRecord, error)
	GetIntegrationBindingByExternal(ctx context.Context, scope Scope, provider, entityKind, externalID string) (IntegrationBindingRecord, error)
	ListIntegrationBindings(ctx context.Context, scope Scope, provider, entityKind, internalID string) ([]IntegrationBindingRecord, error)

	CreateIntegrationSyncRun(ctx context.Context, scope Scope, record IntegrationSyncRunRecord) (IntegrationSyncRunRecord, error)
	UpdateIntegrationSyncRunStatus(ctx context.Context, scope Scope, id, status, lastError, cursor string, completedAt *time.Time, expectedVersion int64) (IntegrationSyncRunRecord, error)
	GetIntegrationSyncRun(ctx context.Context, scope Scope, id string) (IntegrationSyncRunRecord, error)
	ListIntegrationSyncRuns(ctx context.Context, scope Scope, provider string) ([]IntegrationSyncRunRecord, error)

	UpsertIntegrationCheckpoint(ctx context.Context, scope Scope, record IntegrationCheckpointRecord) (IntegrationCheckpointRecord, error)
	ListIntegrationCheckpoints(ctx context.Context, scope Scope, runID string) ([]IntegrationCheckpointRecord, error)

	CreateIntegrationConflict(ctx context.Context, scope Scope, record IntegrationConflictRecord) (IntegrationConflictRecord, error)
	GetIntegrationConflict(ctx context.Context, scope Scope, id string) (IntegrationConflictRecord, error)
	ListIntegrationConflicts(ctx context.Context, scope Scope, runID, status string) ([]IntegrationConflictRecord, error)
	ResolveIntegrationConflict(ctx context.Context, scope Scope, id, status, resolutionJSON, resolvedByUserID string, resolvedAt time.Time, expectedVersion int64) (IntegrationConflictRecord, error)

	AppendIntegrationChangeEvent(ctx context.Context, scope Scope, record IntegrationChangeEventRecord) (IntegrationChangeEventRecord, error)
	ListIntegrationChangeEvents(ctx context.Context, scope Scope, agreementID string) ([]IntegrationChangeEventRecord, error)

	ClaimIntegrationMutation(ctx context.Context, scope Scope, idempotencyKey string, firstSeenAt time.Time) (bool, error)
}

// PlacementRunStore defines placement-run persistence and retrieval contracts.
type PlacementRunStore interface {
	UpsertPlacementRun(ctx context.Context, scope Scope, record PlacementRunRecord) (PlacementRunRecord, error)
	GetPlacementRun(ctx context.Context, scope Scope, agreementID, runID string) (PlacementRunRecord, error)
	ListPlacementRuns(ctx context.Context, scope Scope, agreementID string) ([]PlacementRunRecord, error)
}

// TxStore is the transactional store surface available inside a transaction scope.
type TxStore interface {
	DocumentStore
	DocumentRemediationLeaseStore
	RemediationDispatchStore
	GuardedEffectStore
	AgreementStore
	AgreementRevisionRequestStore
	DraftStore
	SigningStore
	SignatureArtifactStore
	SignerProfileStore
	SavedSignerSignatureStore
	DraftAuditEventStore
	SigningTokenStore
	ReviewSessionTokenStore
	PublicSignerSessionTokenStore
	AuditEventStore
	AgreementArtifactStore
	EmailLogStore
	JobRunStore
	GoogleImportRunStore
	AgreementReminderStore
	OutboxStore
	IntegrationCredentialStore
	IntegrationFoundationStore
	PlacementRunStore
}

// TransactionManager defines transaction lifecycle coordination.
// Supported runtime stores must commit on success and roll back on error or panic.
type TransactionManager interface {
	WithTx(ctx context.Context, fn func(tx TxStore) error) error
}

// Store is the root persistence contract used by e-sign services.
type Store interface {
	TxStore
	TransactionManager
}
