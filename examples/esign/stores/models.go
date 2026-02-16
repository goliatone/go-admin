package stores

import (
	"time"

	"github.com/goliatone/go-admin/admin/txoutbox"
)

const (
	AgreementStatusDraft      = "draft"
	AgreementStatusSent       = "sent"
	AgreementStatusInProgress = "in_progress"
	AgreementStatusCompleted  = "completed"
	AgreementStatusVoided     = "voided"
	AgreementStatusDeclined   = "declined"
	AgreementStatusExpired    = "expired"
)

const (
	RecipientRoleSigner = "signer"
	RecipientRoleCC     = "cc"
)

const (
	FieldTypeSignature  = "signature"
	FieldTypeName       = "name"
	FieldTypeDateSigned = "date_signed"
	FieldTypeText       = "text"
	FieldTypeCheckbox   = "checkbox"
	FieldTypeInitials   = "initials"
)

const (
	SigningTokenStatusActive  = "active"
	SigningTokenStatusRevoked = "revoked"
	SigningTokenStatusExpired = "expired"
)

const (
	ArtifactStageExecuted    = "executed"
	ArtifactStageCertificate = "certificate"
)

const (
	JobRunStatusPending   = "pending"
	JobRunStatusRetrying  = "retrying"
	JobRunStatusSucceeded = "succeeded"
	JobRunStatusFailed    = "failed"
)

const (
	GoogleImportRunStatusQueued    = "queued"
	GoogleImportRunStatusRunning   = "running"
	GoogleImportRunStatusSucceeded = "succeeded"
	GoogleImportRunStatusFailed    = "failed"
)

const (
	OutboxMessageStatusPending    = txoutbox.OutboxStatusPending
	OutboxMessageStatusProcessing = txoutbox.OutboxStatusProcessing
	OutboxMessageStatusRetrying   = txoutbox.OutboxStatusRetrying
	OutboxMessageStatusSucceeded  = txoutbox.OutboxStatusSucceeded
	OutboxMessageStatusFailed     = txoutbox.OutboxStatusFailed
)

const (
	SourceTypeUpload      = "upload"
	SourceTypeGoogleDrive = "google_drive"
)

const (
	MappingSpecStatusDraft     = "draft"
	MappingSpecStatusPublished = "published"
)

const (
	IntegrationSyncRunStatusPending   = "pending"
	IntegrationSyncRunStatusRunning   = "running"
	IntegrationSyncRunStatusCompleted = "completed"
	IntegrationSyncRunStatusFailed    = "failed"
)

const (
	IntegrationConflictStatusPending  = "pending"
	IntegrationConflictStatusResolved = "resolved"
	IntegrationConflictStatusIgnored  = "ignored"
)

const (
	PlacementSourceAuto   = "auto"
	PlacementSourceManual = "manual"
)

const (
	PlacementRunStatusCompleted       = "completed"
	PlacementRunStatusPartial         = "partial"
	PlacementRunStatusBudgetExhausted = "budget_exhausted"
	PlacementRunStatusTimedOut        = "timed_out"
	PlacementRunStatusFailed          = "failed"
)

// DocumentRecord captures immutable source PDF metadata.
type DocumentRecord struct {
	ID                     string
	TenantID               string
	OrgID                  string
	Title                  string
	SourceObjectKey        string
	SourceSHA256           string
	SourceType             string
	SourceGoogleFileID     string
	SourceGoogleDocURL     string
	SourceModifiedTime     *time.Time
	SourceExportedAt       *time.Time
	SourceExportedByUserID string
	SourceMimeType         string
	SourceIngestionMode    string
	SizeBytes              int64
	PageCount              int
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

// AgreementRecord captures draft/send lifecycle state with optimistic lock versioning.
type AgreementRecord struct {
	ID                     string
	TenantID               string
	OrgID                  string
	DocumentID             string
	SourceType             string
	SourceGoogleFileID     string
	SourceGoogleDocURL     string
	SourceModifiedTime     *time.Time
	SourceExportedAt       *time.Time
	SourceExportedByUserID string
	SourceMimeType         string
	SourceIngestionMode    string
	Status                 string
	Title                  string
	Message                string
	Version                int64
	SentAt                 *time.Time
	CompletedAt            *time.Time
	VoidedAt               *time.Time
	DeclinedAt             *time.Time
	ExpiredAt              *time.Time
	CreatedByUserID        string
	UpdatedByUserID        string
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

// DraftRecord stores six-step agreement wizard progress for cross-session recovery.
type DraftRecord struct {
	ID              string
	WizardID        string
	TenantID        string
	OrgID           string
	CreatedByUserID string
	DocumentID      string
	Title           string
	CurrentStep     int
	WizardStateJSON string
	Revision        int64
	CreatedAt       time.Time
	UpdatedAt       time.Time
	ExpiresAt       time.Time
}

// RecipientRecord captures recipient routing and lifecycle telemetry.
type RecipientRecord struct {
	ID          string
	TenantID    string
	OrgID       string
	AgreementID string
	Email       string
	Name        string
	Role        string

	SigningOrder  int
	FirstViewAt   *time.Time
	LastViewAt    *time.Time
	DeclinedAt    *time.Time
	DeclineReason string
	CompletedAt   *time.Time
	Version       int64
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// ParticipantRecord is the canonical v2 signer/cc routing entity.
type ParticipantRecord struct {
	ID            string
	TenantID      string
	OrgID         string
	AgreementID   string
	Email         string
	Name          string
	Role          string
	SigningStage  int
	FirstViewAt   *time.Time
	LastViewAt    *time.Time
	DeclinedAt    *time.Time
	DeclineReason string
	CompletedAt   *time.Time
	Version       int64
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// SigningTokenRecord stores only hashed signer tokens.
type SigningTokenRecord struct {
	ID          string
	TenantID    string
	OrgID       string
	AgreementID string
	RecipientID string
	TokenHash   string
	Status      string
	ExpiresAt   time.Time
	RevokedAt   *time.Time
	CreatedAt   time.Time
}

// FieldRecord stores e-sign field placements and assignment.
type FieldRecord struct {
	ID                string
	FieldDefinitionID string
	TenantID          string
	OrgID             string
	AgreementID       string
	RecipientID       string
	Type              string
	PageNumber        int
	PosX              float64
	PosY              float64
	Width             float64
	Height            float64
	Required          bool
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// FieldDefinitionRecord is the canonical v2 logical field model.
type FieldDefinitionRecord struct {
	ID             string
	TenantID       string
	OrgID          string
	AgreementID    string
	ParticipantID  string
	Type           string
	Required       bool
	ValidationJSON string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// FieldInstanceRecord stores canonical v2 placement data for a field definition.
type FieldInstanceRecord struct {
	ID                string
	TenantID          string
	OrgID             string
	AgreementID       string
	FieldDefinitionID string
	PageNumber        int
	X                 float64
	Y                 float64
	Width             float64
	Height            float64
	TabIndex          int
	Label             string
	AppearanceJSON    string
	PlacementSource   string
	ResolverID        string
	Confidence        float64
	PlacementRunID    string
	ManualOverride    bool
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// PlacementSuggestionRecord stores one suggestion emitted during a placement run.
type PlacementSuggestionRecord struct {
	ID                string
	FieldDefinitionID string
	ResolverID        string
	Confidence        float64
	PageNumber        int
	X                 float64
	Y                 float64
	Width             float64
	Height            float64
	Label             string
	MetadataJSON      string
}

// PlacementResolverScore stores per-resolver ranking metadata for a placement run.
type PlacementResolverScore struct {
	ResolverID string
	Accuracy   float64
	Cost       float64
	Latency    float64
	Score      float64
	Supported  bool
	Reason     string
}

// PlacementRunRecord stores placement-run execution and audit metadata.
type PlacementRunRecord struct {
	ID                      string
	TenantID                string
	OrgID                   string
	AgreementID             string
	Status                  string
	ReasonCode              string
	ResolverOrder           []string
	ExecutedResolvers       []string
	ResolverScores          []PlacementResolverScore
	Suggestions             []PlacementSuggestionRecord
	SelectedSuggestionIDs   []string
	UnresolvedDefinitionIDs []string
	SelectedSource          string
	PolicyJSON              string
	MaxBudget               float64
	BudgetUsed              float64
	MaxTimeMS               int64
	ElapsedMS               int64
	ManualOverrideCount     int
	CreatedByUserID         string
	Version                 int64
	CreatedAt               time.Time
	UpdatedAt               time.Time
	CompletedAt             *time.Time
}

// FieldValueRecord stores signer-provided values for fields.
type FieldValueRecord struct {
	ID                  string
	TenantID            string
	OrgID               string
	AgreementID         string
	RecipientID         string
	FieldID             string
	ValueText           string
	ValueBool           *bool
	SignatureArtifactID string
	Version             int64
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

// SignatureArtifactRecord stores uploaded signature artifacts.
type SignatureArtifactRecord struct {
	ID          string
	TenantID    string
	OrgID       string
	AgreementID string
	RecipientID string
	Type        string
	ObjectKey   string
	SHA256      string
	CreatedAt   time.Time
}

// AuditEventRecord represents append-only lifecycle and security events.
type AuditEventRecord struct {
	ID           string
	TenantID     string
	OrgID        string
	AgreementID  string
	EventType    string
	ActorType    string
	ActorID      string
	IPAddress    string
	UserAgent    string
	MetadataJSON string
	CreatedAt    time.Time
}

// EmailLogRecord captures outbound email attempts and provider outcomes.
type EmailLogRecord struct {
	ID                string
	TenantID          string
	OrgID             string
	AgreementID       string
	RecipientID       string
	TemplateCode      string
	ProviderMessageID string
	Status            string
	FailureReason     string
	AttemptCount      int
	MaxAttempts       int
	CorrelationID     string
	NextRetryAt       *time.Time
	SentAt            *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// AgreementArtifactRecord stores immutable agreement-level executed/certificate artifact pointers.
type AgreementArtifactRecord struct {
	AgreementID          string
	TenantID             string
	OrgID                string
	ExecutedObjectKey    string
	ExecutedSHA256       string
	CertificateObjectKey string
	CertificateSHA256    string
	CorrelationID        string
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

// JobRunRecord stores async execution state with dedupe and retry metadata.
type JobRunRecord struct {
	ID            string
	TenantID      string
	OrgID         string
	JobName       string
	DedupeKey     string
	AgreementID   string
	RecipientID   string
	CorrelationID string
	Status        string
	AttemptCount  int
	MaxAttempts   int
	LastError     string
	NextRetryAt   *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// JobRunInput captures parameters for dedupe-aware async job execution.
type JobRunInput struct {
	JobName       string
	DedupeKey     string
	AgreementID   string
	RecipientID   string
	CorrelationID string
	MaxAttempts   int
	AttemptedAt   time.Time
}

// GoogleImportRunRecord stores async Google Drive import execution state and result payload.
type GoogleImportRunRecord struct {
	ID                string
	TenantID          string
	OrgID             string
	UserID            string
	GoogleFileID      string
	SourceVersionHint string
	DedupeKey         string
	DocumentTitle     string
	AgreementTitle    string
	CreatedByUserID   string
	CorrelationID     string
	Status            string
	DocumentID        string
	AgreementID       string
	SourceMimeType    string
	IngestionMode     string
	ErrorCode         string
	ErrorMessage      string
	ErrorDetailsJSON  string
	CreatedAt         time.Time
	UpdatedAt         time.Time
	StartedAt         *time.Time
	CompletedAt       *time.Time
}

// GoogleImportRunInput captures dedupe-aware async Google import run submission.
type GoogleImportRunInput struct {
	UserID            string
	GoogleFileID      string
	SourceVersionHint string
	DedupeKey         string
	DocumentTitle     string
	AgreementTitle    string
	CreatedByUserID   string
	CorrelationID     string
	RequestedAt       time.Time
}

// GoogleImportRunSuccessInput captures terminal success payload for an import run.
type GoogleImportRunSuccessInput struct {
	DocumentID     string
	AgreementID    string
	SourceMimeType string
	IngestionMode  string
	CompletedAt    time.Time
}

// GoogleImportRunFailureInput captures terminal failure payload for an import run.
type GoogleImportRunFailureInput struct {
	ErrorCode        string
	ErrorMessage     string
	ErrorDetailsJSON string
	CompletedAt      time.Time
}

// GoogleImportRunQuery controls scoped import-run listing and pagination.
type GoogleImportRunQuery struct {
	UserID   string
	Limit    int
	Cursor   string
	SortDesc bool
}

// OutboxMessageRecord stores durable side-effect events for post-commit dispatch.
type OutboxMessageRecord = txoutbox.Message

// OutboxClaimInput controls batched outbox claiming.
type OutboxClaimInput = txoutbox.ClaimInput

// IntegrationCredentialRecord stores encrypted provider credentials by scope and user.
type IntegrationCredentialRecord struct {
	ID                    string
	TenantID              string
	OrgID                 string
	UserID                string
	Provider              string
	EncryptedAccessToken  string
	EncryptedRefreshToken string
	Scopes                []string
	ExpiresAt             *time.Time
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

// ExternalFieldRef is the canonical normalized field descriptor for an external provider schema.
type ExternalFieldRef struct {
	Object          string
	Field           string
	Type            string
	Required        bool
	ConstraintsJSON string
}

// ExternalSchema captures a provider-agnostic external object schema contract.
type ExternalSchema struct {
	ObjectType string
	Version    string
	Fields     []ExternalFieldRef
}

// MappingRule maps an external source field to an internal e-sign target attribute.
type MappingRule struct {
	SourceObject string
	SourceField  string
	TargetEntity string
	TargetPath   string
	Required     bool
	DefaultValue string
	Transform    string
}

// MappingSpecRecord stores a versioned provider-agnostic mapping contract.
type MappingSpecRecord struct {
	ID              string
	TenantID        string
	OrgID           string
	Provider        string
	Name            string
	Version         int64
	Status          string
	ExternalSchema  ExternalSchema
	Rules           []MappingRule
	CompiledJSON    string
	CompiledHash    string
	PublishedAt     *time.Time
	CreatedByUserID string
	UpdatedByUserID string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// IntegrationBindingRecord stores external-to-internal identity bindings with provenance.
type IntegrationBindingRecord struct {
	ID             string
	TenantID       string
	OrgID          string
	Provider       string
	EntityKind     string
	ExternalID     string
	InternalID     string
	ProvenanceJSON string
	Version        int64
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// IntegrationSyncRunRecord stores sync run lifecycle and resumable progress metadata.
type IntegrationSyncRunRecord struct {
	ID              string
	TenantID        string
	OrgID           string
	Provider        string
	Direction       string
	MappingSpecID   string
	Status          string
	Cursor          string
	LastError       string
	AttemptCount    int
	Version         int64
	StartedAt       time.Time
	CompletedAt     *time.Time
	CreatedByUserID string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// IntegrationCheckpointRecord stores resumable checkpoint markers for a sync run.
type IntegrationCheckpointRecord struct {
	ID            string
	TenantID      string
	OrgID         string
	RunID         string
	CheckpointKey string
	Cursor        string
	PayloadJSON   string
	Version       int64
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// IntegrationConflictRecord stores explicit integration conflicts requiring operator action.
type IntegrationConflictRecord struct {
	ID               string
	TenantID         string
	OrgID            string
	RunID            string
	BindingID        string
	Provider         string
	EntityKind       string
	ExternalID       string
	InternalID       string
	Status           string
	Reason           string
	PayloadJSON      string
	ResolutionJSON   string
	ResolvedByUserID string
	ResolvedAt       *time.Time
	Version          int64
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// IntegrationChangeEventRecord stores normalized outbound change envelopes.
type IntegrationChangeEventRecord struct {
	ID             string
	TenantID       string
	OrgID          string
	AgreementID    string
	Provider       string
	EventType      string
	SourceEventID  string
	IdempotencyKey string
	PayloadJSON    string
	EmittedAt      time.Time
	CreatedAt      time.Time
}

type DocumentQuery struct {
	TitleContains string
	Limit         int
	Offset        int
}

type AgreementQuery struct {
	Status   string
	Limit    int
	Offset   int
	SortDesc bool
}

type DraftQuery struct {
	CreatedByUserID string
	WizardID        string
	Limit           int
	Cursor          string
	SortDesc        bool
}

type AuditEventQuery struct {
	Limit    int
	Offset   int
	SortDesc bool
}

type OutboxQuery = txoutbox.Query

type AgreementDraftPatch struct {
	Title      *string
	Message    *string
	DocumentID *string
}

type DraftPatch struct {
	WizardStateJSON *string
	Title           *string
	CurrentStep     *int
	DocumentID      *string
	ExpiresAt       *time.Time
	UpdatedAt       *time.Time
}

type RecipientDraftPatch struct {
	ID           string
	Email        *string
	Name         *string
	Role         *string
	SigningOrder *int
}

type ParticipantDraftPatch struct {
	ID           string
	Email        *string
	Name         *string
	Role         *string
	SigningStage *int
}

type FieldDraftPatch struct {
	ID          string
	RecipientID *string
	Type        *string
	PageNumber  *int
	PosX        *float64
	PosY        *float64
	Width       *float64
	Height      *float64
	Required    *bool
}

type FieldDefinitionDraftPatch struct {
	ID             string
	ParticipantID  *string
	Type           *string
	Required       *bool
	ValidationJSON *string
}

type FieldInstanceDraftPatch struct {
	ID                string
	FieldDefinitionID *string
	PageNumber        *int
	X                 *float64
	Y                 *float64
	Width             *float64
	Height            *float64
	TabIndex          *int
	Label             *string
	AppearanceJSON    *string
	PlacementSource   *string
	ResolverID        *string
	Confidence        *float64
	PlacementRunID    *string
	ManualOverride    *bool
}

type AgreementTransitionInput struct {
	ToStatus        string
	ExpectedVersion int64
}
