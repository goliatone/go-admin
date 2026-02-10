package stores

import "time"

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
	SourceTypeUpload      = "upload"
	SourceTypeGoogleDrive = "google_drive"
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
	ID          string
	TenantID    string
	OrgID       string
	AgreementID string
	RecipientID string
	Type        string
	PageNumber  int
	PosX        float64
	PosY        float64
	Width       float64
	Height      float64
	Required    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
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

type AuditEventQuery struct {
	Limit    int
	Offset   int
	SortDesc bool
}

type AgreementDraftPatch struct {
	Title      *string
	Message    *string
	DocumentID *string
}

type RecipientDraftPatch struct {
	ID           string
	Email        *string
	Name         *string
	Role         *string
	SigningOrder *int
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

type AgreementTransitionInput struct {
	ToStatus        string
	ExpectedVersion int64
}
