package stores

import (
	"context"
	"time"
)

// DocumentStore defines document persistence with explicit tenant/org scope inputs.
type DocumentStore interface {
	Create(ctx context.Context, scope Scope, record DocumentRecord) (DocumentRecord, error)
	Get(ctx context.Context, scope Scope, id string) (DocumentRecord, error)
	List(ctx context.Context, scope Scope, query DocumentQuery) ([]DocumentRecord, error)
}

// AgreementStore defines agreement persistence with immutable-after-send and optimistic lock guards.
type AgreementStore interface {
	CreateDraft(ctx context.Context, scope Scope, record AgreementRecord) (AgreementRecord, error)
	GetAgreement(ctx context.Context, scope Scope, id string) (AgreementRecord, error)
	ListAgreements(ctx context.Context, scope Scope, query AgreementQuery) ([]AgreementRecord, error)
	UpdateDraft(ctx context.Context, scope Scope, id string, patch AgreementDraftPatch, expectedVersion int64) (AgreementRecord, error)
	Transition(ctx context.Context, scope Scope, id string, input AgreementTransitionInput) (AgreementRecord, error)
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

// SigningTokenStore defines persistence for hashed signer tokens.
type SigningTokenStore interface {
	CreateSigningToken(ctx context.Context, scope Scope, record SigningTokenRecord) (SigningTokenRecord, error)
	GetSigningTokenByHash(ctx context.Context, scope Scope, tokenHash string) (SigningTokenRecord, error)
	RevokeActiveSigningTokens(ctx context.Context, scope Scope, agreementID, recipientID string, revokedAt time.Time) (int, error)
}

// AuditEventStore defines append-only audit event persistence.
type AuditEventStore interface {
	Append(ctx context.Context, scope Scope, event AuditEventRecord) (AuditEventRecord, error)
	ListForAgreement(ctx context.Context, scope Scope, agreementID string, query AuditEventQuery) ([]AuditEventRecord, error)
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
}

// IntegrationCredentialStore defines encrypted provider credential persistence by scope/user.
type IntegrationCredentialStore interface {
	UpsertIntegrationCredential(ctx context.Context, scope Scope, record IntegrationCredentialRecord) (IntegrationCredentialRecord, error)
	GetIntegrationCredential(ctx context.Context, scope Scope, provider, userID string) (IntegrationCredentialRecord, error)
	DeleteIntegrationCredential(ctx context.Context, scope Scope, provider, userID string) error
}

// TxStore is the transactional store surface available inside a transaction scope.
type TxStore interface {
	DocumentStore
	AgreementStore
	SigningStore
	SignatureArtifactStore
	SigningTokenStore
	AuditEventStore
	AgreementArtifactStore
	EmailLogStore
	JobRunStore
	IntegrationCredentialStore
}

// TransactionManager defines transaction lifecycle coordination.
// Backend semantics (rollback/isolation guarantees) are implementation specific.
type TransactionManager interface {
	WithTx(ctx context.Context, fn func(tx TxStore) error) error
}

// Store is the root persistence contract used by e-sign services.
type Store interface {
	TxStore
	TransactionManager
}
