package stores

import (
	"time"

	"github.com/goliatone/go-admin/admin/guardedeffects"
	"github.com/goliatone/go-admin/admin/txoutbox"
	"github.com/uptrace/bun"
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
	AgreementWorkflowKindStandard   = "standard"
	AgreementWorkflowKindCorrection = "correction"
	AgreementWorkflowKindAmendment  = "amendment"
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
	SigningTokenStatusPending    = "pending"
	SigningTokenStatusActive     = "active"
	SigningTokenStatusSuperseded = "superseded"
	SigningTokenStatusAborted    = "aborted"
	SigningTokenStatusRevoked    = "revoked"
	SigningTokenStatusExpired    = "expired"
)

const (
	AgreementDeliveryStatusPrepared     = guardedeffects.StatusPrepared
	AgreementDeliveryStatusDispatching  = guardedeffects.StatusDispatching
	AgreementDeliveryStatusGuardPending = guardedeffects.StatusGuardPending
	AgreementDeliveryStatusFinalized    = guardedeffects.StatusFinalized
	AgreementDeliveryStatusRetrying     = guardedeffects.StatusRetrying
	AgreementDeliveryStatusAborted      = guardedeffects.StatusAborted
	AgreementDeliveryStatusDeadLettered = guardedeffects.StatusDeadLettered
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
	AgreementReminderStatusActive   = "active"
	AgreementReminderStatusPaused   = "paused"
	AgreementReminderStatusTerminal = "terminal"
)

const (
	AgreementReminderTerminalReasonMaxCountReached = "max_count_reached"
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
	PlacementSourceAuto       = "auto"
	PlacementSourceManual     = "manual"
	PlacementSourceAutoLinked = "auto_linked"
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
	bun.BaseModel          `bun:"table:documents,alias:doc"`
	ID                     string     `json:"id"`
	TenantID               string     `json:"tenant_id"`
	OrgID                  string     `json:"org_id"`
	CreatedByUserID        string     `json:"created_by_user_id"`
	Title                  string     `json:"title"`
	SourceOriginalName     string     `json:"source_original_name"`
	SourceObjectKey        string     `json:"source_object_key"`
	NormalizedObjectKey    string     `json:"normalized_object_key"`
	SourceSHA256           string     `json:"source_sha256"`
	SourceType             string     `json:"source_type"`
	SourceGoogleFileID     string     `json:"source_google_file_id"`
	SourceGoogleDocURL     string     `json:"source_google_doc_url"`
	SourceModifiedTime     *time.Time `json:"source_modified_time"`
	SourceExportedAt       *time.Time `json:"source_exported_at"`
	SourceExportedByUserID string     `json:"source_exported_by_user_id"`
	SourceMimeType         string     `json:"source_mime_type"`
	SourceIngestionMode    string     `json:"source_ingestion_mode"`
	SourceDocumentID       string     `json:"source_document_id"`
	SourceRevisionID       string     `json:"source_revision_id"`
	SourceArtifactID       string     `json:"source_artifact_id"`
	PDFCompatibilityTier   string     `json:"pdf_compatibility_tier"`
	PDFCompatibilityReason string     `json:"pdf_compatibility_reason"`
	PDFNormalizationStatus string     `json:"pdf_normalization_status"`
	PDFAnalyzedAt          *time.Time `json:"pdf_analyzed_at"`
	PDFPolicyVersion       string     `json:"pdf_policy_version"`
	RemediationStatus      string     `json:"remediation_status"`
	RemediationActorID     string     `json:"remediation_actor_id"`
	RemediationCommandID   string     `json:"remediation_command_id"`
	RemediationDispatchID  string     `json:"remediation_dispatch_id"`
	RemediationExecMode    string     `json:"remediation_exec_mode"`
	RemediationCorrelation string     `json:"remediation_correlation"`
	RemediationFailure     string     `json:"remediation_failure"`
	RemediationOriginalKey string     `json:"remediation_original_key"`
	RemediationOutputKey   string     `json:"remediation_output_key"`
	RemediationRequestedAt *time.Time `json:"remediation_requested_at"`
	RemediationStartedAt   *time.Time `json:"remediation_started_at"`
	RemediationCompletedAt *time.Time `json:"remediation_completed_at"`
	SizeBytes              int64      `json:"size_bytes"`
	PageCount              int        `json:"page_count"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

// AgreementRecord captures draft/send lifecycle state with optimistic lock versioning.
type AgreementRecord struct {
	bun.BaseModel          `bun:"table:agreements,alias:agr"`
	ID                     string     `json:"id"`
	TenantID               string     `json:"tenant_id"`
	OrgID                  string     `json:"org_id"`
	DocumentID             string     `json:"document_id"`
	WorkflowKind           string     `json:"workflow_kind"`
	RootAgreementID        string     `json:"root_agreement_id"`
	ParentAgreementID      string     `json:"parent_agreement_id"`
	ParentExecutedSHA256   string     `json:"parent_executed_sha256"`
	ReviewStatus           string     `json:"review_status"`
	ReviewGate             string     `json:"review_gate"`
	CommentsEnabled        bool       `json:"comments_enabled"`
	SourceType             string     `json:"source_type"`
	SourceGoogleFileID     string     `json:"source_google_file_id"`
	SourceGoogleDocURL     string     `json:"source_google_doc_url"`
	SourceModifiedTime     *time.Time `json:"source_modified_time"`
	SourceExportedAt       *time.Time `json:"source_exported_at"`
	SourceExportedByUserID string     `json:"source_exported_by_user_id"`
	SourceMimeType         string     `json:"source_mime_type"`
	SourceIngestionMode    string     `json:"source_ingestion_mode"`
	SourceRevisionID       string     `json:"source_revision_id"`
	Status                 string     `json:"status"`
	Title                  string     `json:"title"`
	Message                string     `json:"message"`
	Version                int64      `json:"version"`
	SentAt                 *time.Time `json:"sent_at"`
	DeliveryStatus         string     `json:"delivery_status"`
	DeliveryEffectID       string     `json:"delivery_effect_id"`
	LastDeliveryError      string     `json:"last_delivery_error"`
	LastDeliveryAttemptAt  *time.Time `json:"last_delivery_attempt_at"`
	CompletedAt            *time.Time `json:"completed_at"`
	VoidedAt               *time.Time `json:"voided_at"`
	DeclinedAt             *time.Time `json:"declined_at"`
	ExpiredAt              *time.Time `json:"expired_at"`
	CreatedByUserID        string     `json:"created_by_user_id"`
	UpdatedByUserID        string     `json:"updated_by_user_id"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

// AgreementRevisionRequestRecord stores durable idempotency and replay state for correction/amendment bootstrap.
type AgreementRevisionRequestRecord struct {
	bun.BaseModel      `bun:"table:agreement_revision_requests,alias:arr"`
	ID                 string    `json:"id"`
	TenantID           string    `json:"tenant_id"`
	OrgID              string    `json:"org_id"`
	SourceAgreementID  string    `json:"source_agreement_id"`
	RevisionKind       string    `json:"revision_kind"`
	IdempotencyKey     string    `json:"idempotency_key"`
	RequestHash        string    `json:"request_hash"`
	ActorID            string    `json:"actor_id"`
	CreatedAgreementID string    `json:"created_agreement_id"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// AgreementRevisionRequestInput captures dedupe-aware revision bootstrap intent.
type AgreementRevisionRequestInput struct {
	SourceAgreementID string    `json:"source_agreement_id"`
	RevisionKind      string    `json:"revision_kind"`
	IdempotencyKey    string    `json:"idempotency_key"`
	RequestHash       string    `json:"request_hash"`
	ActorID           string    `json:"actor_id"`
	Now               time.Time `json:"now"`
}

// DraftRecord stores six-step agreement wizard progress for cross-session recovery.
type DraftRecord struct {
	bun.BaseModel   `bun:"table:esign_drafts,alias:drf"`
	ID              string    `json:"id"`
	WizardID        string    `json:"wizard_id"`
	TenantID        string    `json:"tenant_id"`
	OrgID           string    `json:"org_id"`
	CreatedByUserID string    `bun:"created_by" json:"created_by_user_id"`
	DocumentID      string    `bun:"document_id,nullzero" json:"document_id"`
	Title           string    `json:"title"`
	CurrentStep     int       `json:"current_step"`
	WizardStateJSON string    `json:"wizard_state_json"`
	Revision        int64     `json:"revision"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	ExpiresAt       time.Time `json:"expires_at"`
}

// RecipientRecord captures recipient routing and lifecycle telemetry.
type RecipientRecord struct {
	bun.BaseModel `bun:"table:recipients,alias:rec"`
	ID            string `json:"id"`
	TenantID      string `json:"tenant_id"`
	OrgID         string `json:"org_id"`
	AgreementID   string `json:"agreement_id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	Role          string `json:"role"`
	Notify        bool   `json:"notify"`

	SigningOrder  int        `json:"signing_order"`
	FirstViewAt   *time.Time `json:"first_view_at"`
	LastViewAt    *time.Time `json:"last_view_at"`
	DeclinedAt    *time.Time `json:"declined_at"`
	DeclineReason string     `json:"decline_reason"`
	CompletedAt   *time.Time `json:"completed_at"`
	Version       int64      `json:"version"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ParticipantRecord is the canonical v2 signer/cc routing entity.
type ParticipantRecord struct {
	bun.BaseModel `bun:"table:participants,alias:par"`
	ID            string     `json:"id"`
	TenantID      string     `json:"tenant_id"`
	OrgID         string     `json:"org_id"`
	AgreementID   string     `json:"agreement_id"`
	Email         string     `json:"email"`
	Name          string     `json:"name"`
	Role          string     `json:"role"`
	Notify        bool       `json:"notify"`
	SigningStage  int        `json:"signing_stage"`
	FirstViewAt   *time.Time `json:"first_view_at"`
	LastViewAt    *time.Time `json:"last_view_at"`
	DeclinedAt    *time.Time `json:"declined_at"`
	DeclineReason string     `json:"decline_reason"`
	CompletedAt   *time.Time `json:"completed_at"`
	Version       int64      `json:"version"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// SigningTokenRecord stores only hashed signer tokens.
type SigningTokenRecord struct {
	bun.BaseModel `bun:"table:signing_tokens,alias:tok"`
	ID            string     `json:"id"`
	TenantID      string     `json:"tenant_id"`
	OrgID         string     `json:"org_id"`
	AgreementID   string     `json:"agreement_id"`
	RecipientID   string     `json:"recipient_id"`
	TokenHash     string     `json:"token_hash"`
	Status        string     `json:"status"`
	ActivatedAt   *time.Time `json:"activated_at"`
	ExpiresAt     time.Time  `json:"expires_at"`
	RevokedAt     *time.Time `json:"revoked_at"`
	CreatedAt     time.Time  `json:"created_at"`
}

// GuardedEffectRecord stores a durable guarded external effect lifecycle row.
type GuardedEffectRecord struct {
	bun.BaseModel `bun:"table:guarded_effects,alias:gef"`
	guardedeffects.Record
}

// FieldRecord stores e-sign field placements and assignment.
type FieldRecord struct {
	bun.BaseModel     `bun:"table:fields,alias:fld"`
	ID                string    `json:"id"`
	FieldDefinitionID string    `json:"field_definition_id"`
	TenantID          string    `json:"tenant_id"`
	OrgID             string    `json:"org_id"`
	AgreementID       string    `json:"agreement_id"`
	RecipientID       string    `json:"recipient_id"`
	Type              string    `bun:"field_type" json:"type"`
	PageNumber        int       `json:"page_number"`
	PosX              float64   `bun:"pos_x" json:"pos_x"`
	PosY              float64   `bun:"pos_y" json:"pos_y"`
	Width             float64   `json:"width"`
	Height            float64   `json:"height"`
	PlacementSource   string    `json:"placement_source"`
	LinkGroupID       string    `json:"link_group_id"`
	LinkedFromFieldID string    `json:"linked_from_field_id"`
	IsUnlinked        bool      `json:"is_unlinked"`
	Required          bool      `json:"required"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// FieldDefinitionRecord is the canonical v2 logical field model.
type FieldDefinitionRecord struct {
	bun.BaseModel  `bun:"table:field_definitions,alias:fdef"`
	ID             string `json:"id"`
	TenantID       string `json:"tenant_id"`
	OrgID          string `json:"org_id"`
	AgreementID    string `json:"agreement_id"`
	ParticipantID  string `json:"participant_id"`
	Type           string `bun:"field_type" json:"type"`
	Required       bool   `json:"required"`
	ValidationJSON string `json:"validation_json"`
	// LinkGroupID groups field definitions for linked placement (Phase 3).
	// Fields in the same link group auto-place when any member is manually placed.
	LinkGroupID string    `json:"link_group_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// FieldInstanceRecord stores canonical v2 placement data for a field definition.
type FieldInstanceRecord struct {
	bun.BaseModel     `bun:"table:field_instances,alias:finst"`
	ID                string  `json:"id"`
	TenantID          string  `json:"tenant_id"`
	OrgID             string  `json:"org_id"`
	AgreementID       string  `json:"agreement_id"`
	FieldDefinitionID string  `json:"field_definition_id"`
	PageNumber        int     `json:"page_number"`
	X                 float64 `json:"x"`
	Y                 float64 `json:"y"`
	Width             float64 `json:"width"`
	Height            float64 `json:"height"`
	TabIndex          int     `json:"tab_index"`
	Label             string  `json:"label"`
	AppearanceJSON    string  `json:"appearance_json"`
	PlacementSource   string  `json:"placement_source"`
	ResolverID        string  `json:"resolver_id"`
	Confidence        float64 `json:"confidence"`
	PlacementRunID    string  `json:"placement_run_id"`
	ManualOverride    bool    `json:"manual_override"`
	// LinkGroupID denormalized from field definition for linked placement (Phase 3).
	LinkGroupID string `json:"link_group_id"`
	// LinkedFromFieldID is the source field that triggered this auto-linked placement.
	LinkedFromFieldID string `json:"linked_from_field_id"`
	// IsUnlinked indicates the field was manually unlinked from its group.
	IsUnlinked bool      `json:"is_unlinked"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// PlacementSuggestionRecord stores one suggestion emitted during a placement run.
type PlacementSuggestionRecord struct {
	ID                string  `json:"id"`
	FieldDefinitionID string  `json:"field_definition_id"`
	ResolverID        string  `json:"resolver_id"`
	Confidence        float64 `json:"confidence"`
	PageNumber        int     `json:"page_number"`
	X                 float64 `json:"x"`
	Y                 float64 `json:"y"`
	Width             float64 `json:"width"`
	Height            float64 `json:"height"`
	Label             string  `json:"label"`
	MetadataJSON      string  `json:"metadata_json"`
}

// PlacementResolverScore stores per-resolver ranking metadata for a placement run.
type PlacementResolverScore struct {
	ResolverID string  `json:"resolver_id"`
	Accuracy   float64 `json:"accuracy"`
	Cost       float64 `json:"cost"`
	Latency    float64 `json:"latency"`
	Score      float64 `json:"score"`
	Supported  bool    `json:"supported"`
	Reason     string  `json:"reason"`
}

// PlacementRunRecord stores placement-run execution and audit metadata.
type PlacementRunRecord struct {
	bun.BaseModel           `bun:"table:placement_runs,alias:prun"`
	ID                      string                      `json:"id"`
	TenantID                string                      `json:"tenant_id"`
	OrgID                   string                      `json:"org_id"`
	AgreementID             string                      `json:"agreement_id"`
	Status                  string                      `json:"status"`
	ReasonCode              string                      `json:"reason_code"`
	ResolverOrder           []string                    `bun:"resolver_order_json" json:"resolver_order"`
	ExecutedResolvers       []string                    `bun:"executed_resolvers_json" json:"executed_resolvers"`
	ResolverScores          []PlacementResolverScore    `bun:"resolver_scores_json" json:"resolver_scores"`
	Suggestions             []PlacementSuggestionRecord `bun:"suggestions_json" json:"suggestions"`
	SelectedSuggestionIDs   []string                    `bun:"selected_suggestion_ids_json" json:"selected_suggestion_i_ds"`
	UnresolvedDefinitionIDs []string                    `bun:"unresolved_definition_ids_json" json:"unresolved_definition_i_ds"`
	SelectedSource          string                      `json:"selected_source"`
	PolicyJSON              string                      `json:"policy_json"`
	MaxBudget               float64                     `json:"max_budget"`
	BudgetUsed              float64                     `json:"budget_used"`
	MaxTimeMS               int64                       `json:"max_time_ms"`
	ElapsedMS               int64                       `json:"elapsed_ms"`
	ManualOverrideCount     int                         `json:"manual_override_count"`
	CreatedByUserID         string                      `json:"created_by_user_id"`
	Version                 int64                       `json:"version"`
	CreatedAt               time.Time                   `json:"created_at"`
	UpdatedAt               time.Time                   `json:"updated_at"`
	CompletedAt             *time.Time                  `json:"completed_at"`
}

// FieldValueRecord stores signer-provided values for fields.
type FieldValueRecord struct {
	bun.BaseModel       `bun:"table:field_values,alias:fval"`
	ID                  string    `json:"id"`
	TenantID            string    `json:"tenant_id"`
	OrgID               string    `json:"org_id"`
	AgreementID         string    `json:"agreement_id"`
	RecipientID         string    `json:"recipient_id"`
	FieldID             string    `json:"field_id"`
	ValueText           string    `json:"value_text"`
	ValueBool           *bool     `json:"value_bool"`
	SignatureArtifactID string    `bun:"signature_artifact_id,nullzero" json:"signature_artifact_id"`
	Version             int64     `json:"version"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// SignatureArtifactRecord stores uploaded signature artifacts.
type SignatureArtifactRecord struct {
	bun.BaseModel `bun:"table:signature_artifacts,alias:sig"`
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	OrgID         string    `json:"org_id"`
	AgreementID   string    `json:"agreement_id"`
	RecipientID   string    `json:"recipient_id"`
	Type          string    `bun:"artifact_type" json:"type"`
	ObjectKey     string    `json:"object_key"`
	SHA256        string    `json:"sha256"`
	CreatedAt     time.Time `json:"created_at"`
}

// SignerProfileRecord stores signer profile fields for cross-agreement reuse.
type SignerProfileRecord struct {
	bun.BaseModel         `bun:"table:signer_profiles,alias:spf"`
	ID                    string    `json:"id"`
	TenantID              string    `json:"tenant_id"`
	OrgID                 string    `json:"org_id"`
	Subject               string    `json:"subject"`
	Key                   string    `bun:"profile_key" json:"key"`
	FullName              string    `json:"full_name"`
	Initials              string    `json:"initials"`
	TypedSignature        string    `json:"typed_signature"`
	DrawnSignatureDataURL string    `json:"drawn_signature_data_url"`
	DrawnInitialsDataURL  string    `json:"drawn_initials_data_url"`
	Remember              bool      `json:"remember"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
	ExpiresAt             time.Time `json:"expires_at"`
}

// SavedSignerSignatureRecord stores signer-scoped reusable signature/initials payloads.
type SavedSignerSignatureRecord struct {
	bun.BaseModel    `bun:"table:saved_signer_signatures,alias:sss"`
	ID               string    `json:"id"`
	TenantID         string    `json:"tenant_id"`
	OrgID            string    `json:"org_id"`
	Subject          string    `json:"subject"`
	Type             string    `bun:"signature_type" json:"type"`
	Label            string    `json:"label"`
	ObjectKey        string    `json:"object_key"`
	ThumbnailDataURL string    `json:"thumbnail_data_url"`
	CreatedAt        time.Time `json:"created_at"`
}

// DraftAuditEventRecord captures append-only draft lifecycle events before an agreement exists.
type DraftAuditEventRecord struct {
	bun.BaseModel `bun:"table:draft_audit_events,alias:dae"`
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	OrgID         string    `json:"org_id"`
	DraftID       string    `json:"draft_id"`
	EventType     string    `json:"event_type"`
	ActorType     string    `json:"actor_type"`
	ActorID       string    `json:"actor_id"`
	MetadataJSON  string    `json:"metadata_json"`
	CreatedAt     time.Time `json:"created_at"`
}

// AuditEventRecord represents append-only lifecycle and security events.
type AuditEventRecord struct {
	bun.BaseModel `bun:"table:audit_events,alias:aev"`
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	OrgID         string    `json:"org_id"`
	AgreementID   string    `json:"agreement_id"`
	EventType     string    `json:"event_type"`
	ActorType     string    `json:"actor_type"`
	ActorID       string    `json:"actor_id"`
	IPAddress     string    `json:"ip_address"`
	UserAgent     string    `json:"user_agent"`
	MetadataJSON  string    `json:"metadata_json"`
	CreatedAt     time.Time `json:"created_at"`
}

// EmailLogRecord captures outbound email attempts and provider outcomes.
type EmailLogRecord struct {
	bun.BaseModel     `bun:"table:email_logs,alias:elog"`
	ID                string     `json:"id"`
	TenantID          string     `json:"tenant_id"`
	OrgID             string     `json:"org_id"`
	AgreementID       string     `json:"agreement_id"`
	RecipientID       string     `bun:"recipient_id,nullzero" json:"recipient_id"`
	TemplateCode      string     `json:"template_code"`
	ProviderMessageID string     `json:"provider_message_id"`
	Status            string     `json:"status"`
	FailureReason     string     `json:"failure_reason"`
	AttemptCount      int        `json:"attempt_count"`
	MaxAttempts       int        `json:"max_attempts"`
	CorrelationID     string     `json:"correlation_id"`
	NextRetryAt       *time.Time `json:"next_retry_at"`
	SentAt            *time.Time `json:"sent_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// AgreementArtifactRecord stores immutable agreement-level executed/certificate artifact pointers.
type AgreementArtifactRecord struct {
	bun.BaseModel        `bun:"table:agreement_artifacts,alias:aart"`
	AgreementID          string    `json:"agreement_id"`
	TenantID             string    `json:"tenant_id"`
	OrgID                string    `json:"org_id"`
	ExecutedObjectKey    string    `json:"executed_object_key"`
	ExecutedSHA256       string    `json:"executed_sha256"`
	CertificateObjectKey string    `json:"certificate_object_key"`
	CertificateSHA256    string    `json:"certificate_sha256"`
	CorrelationID        string    `json:"correlation_id"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

// JobRunRecord stores async execution state with dedupe and retry metadata.
type JobRunRecord struct {
	bun.BaseModel `bun:"table:job_runs,alias:jrun"`
	ID            string     `json:"id"`
	TenantID      string     `json:"tenant_id"`
	OrgID         string     `json:"org_id"`
	JobName       string     `json:"job_name"`
	DedupeKey     string     `json:"dedupe_key"`
	AgreementID   string     `json:"agreement_id"`
	RecipientID   string     `json:"recipient_id"`
	CorrelationID string     `json:"correlation_id"`
	Status        string     `json:"status"`
	AttemptCount  int        `json:"attempt_count"`
	MaxAttempts   int        `json:"max_attempts"`
	LastError     string     `json:"last_error"`
	NextRetryAt   *time.Time `json:"next_retry_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// JobRunInput captures parameters for dedupe-aware async job execution.
type JobRunInput struct {
	JobName       string    `json:"job_name"`
	DedupeKey     string    `json:"dedupe_key"`
	AgreementID   string    `json:"agreement_id"`
	RecipientID   string    `json:"recipient_id"`
	CorrelationID string    `json:"correlation_id"`
	MaxAttempts   int       `json:"max_attempts"`
	AttemptedAt   time.Time `json:"attempted_at"`
}

// GoogleImportRunRecord stores async Google Drive import execution state and result payload.
type GoogleImportRunRecord struct {
	bun.BaseModel       `bun:"table:google_import_runs,alias:gir"`
	ID                  string     `json:"id"`
	TenantID            string     `json:"tenant_id"`
	OrgID               string     `json:"org_id"`
	UserID              string     `json:"user_id"`
	GoogleFileID        string     `json:"google_file_id"`
	SourceVersionHint   string     `json:"source_version_hint"`
	DedupeKey           string     `json:"dedupe_key"`
	DocumentTitle       string     `json:"document_title"`
	AgreementTitle      string     `json:"agreement_title"`
	CreatedByUserID     string     `json:"created_by_user_id"`
	CorrelationID       string     `json:"correlation_id"`
	Status              string     `json:"status"`
	DocumentID          string     `json:"document_id"`
	AgreementID         string     `json:"agreement_id"`
	SourceDocumentID    string     `json:"source_document_id"`
	SourceRevisionID    string     `json:"source_revision_id"`
	SourceArtifactID    string     `json:"source_artifact_id"`
	LineageStatus       string     `json:"lineage_status"`
	FingerprintStatus   string     `json:"fingerprint_status"`
	CandidateStatusJSON string     `json:"candidate_status_json"`
	DocumentDetailURL   string     `json:"document_detail_url"`
	AgreementDetailURL  string     `json:"agreement_detail_url"`
	SourceMimeType      string     `json:"source_mime_type"`
	IngestionMode       string     `json:"ingestion_mode"`
	ErrorCode           string     `json:"error_code"`
	ErrorMessage        string     `json:"error_message"`
	ErrorDetailsJSON    string     `json:"error_details_json"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	StartedAt           *time.Time `json:"started_at"`
	CompletedAt         *time.Time `json:"completed_at"`
}

// AgreementReminderStateRecord stores recipient-level reminder cadence state.
type AgreementReminderStateRecord struct {
	bun.BaseModel              `bun:"table:agreement_reminder_states,alias:ars"`
	ID                         string     `json:"id"`
	TenantID                   string     `json:"tenant_id"`
	OrgID                      string     `json:"org_id"`
	AgreementID                string     `json:"agreement_id"`
	RecipientID                string     `json:"recipient_id"`
	Status                     string     `json:"status"`
	TerminalReason             string     `json:"terminal_reason"`
	PolicyVersion              string     `json:"policy_version"`
	SentCount                  int        `json:"sent_count"`
	FirstSentAt                *time.Time `json:"first_sent_at"`
	LastSentAt                 *time.Time `json:"last_sent_at"`
	LastViewedAt               *time.Time `json:"last_viewed_at"`
	LastManualResendAt         *time.Time `json:"last_manual_resend_at"`
	NextDueAt                  *time.Time `json:"next_due_at"`
	LastReasonCode             string     `json:"last_reason_code"`
	LastErrorCode              string     `json:"last_error_code"`
	LastErrorInternalEncrypted string     `json:"last_error_internal_encrypted"`
	LastErrorInternalExpiresAt *time.Time `json:"last_error_internal_expires_at"`
	LeaseSeq                   int64      `json:"lease_seq"`
	ClaimedAt                  *time.Time `json:"claimed_at"`
	LastHeartbeatAt            *time.Time `json:"last_heartbeat_at"`
	SweepID                    string     `json:"sweep_id"`
	WorkerID                   string     `json:"worker_id"`
	LastEvaluatedAt            *time.Time `json:"last_evaluated_at"`
	LastAttemptedSendAt        *time.Time `json:"last_attempted_send_at"`
	CreatedAt                  time.Time  `json:"created_at"`
	UpdatedAt                  time.Time  `json:"updated_at"`
}

// GoogleImportRunInput captures dedupe-aware async Google import run submission.
type GoogleImportRunInput struct {
	UserID            string    `json:"user_id"`
	GoogleFileID      string    `json:"google_file_id"`
	SourceVersionHint string    `json:"source_version_hint"`
	DedupeKey         string    `json:"dedupe_key"`
	DocumentTitle     string    `json:"document_title"`
	AgreementTitle    string    `json:"agreement_title"`
	CreatedByUserID   string    `json:"created_by_user_id"`
	CorrelationID     string    `json:"correlation_id"`
	RequestedAt       time.Time `json:"requested_at"`
}

// GoogleImportRunSuccessInput captures terminal success payload for an import run.
type GoogleImportRunSuccessInput struct {
	DocumentID          string    `json:"document_id"`
	AgreementID         string    `json:"agreement_id"`
	SourceDocumentID    string    `json:"source_document_id"`
	SourceRevisionID    string    `json:"source_revision_id"`
	SourceArtifactID    string    `json:"source_artifact_id"`
	LineageStatus       string    `json:"lineage_status"`
	FingerprintStatus   string    `json:"fingerprint_status"`
	CandidateStatusJSON string    `json:"candidate_status_json"`
	DocumentDetailURL   string    `json:"document_detail_url"`
	AgreementDetailURL  string    `json:"agreement_detail_url"`
	SourceMimeType      string    `json:"source_mime_type"`
	IngestionMode       string    `json:"ingestion_mode"`
	CompletedAt         time.Time `json:"completed_at"`
}

// GoogleImportRunFailureInput captures terminal failure payload for an import run.
type GoogleImportRunFailureInput struct {
	ErrorCode        string    `json:"error_code"`
	ErrorMessage     string    `json:"error_message"`
	ErrorDetailsJSON string    `json:"error_details_json"`
	CompletedAt      time.Time `json:"completed_at"`
}

// GoogleImportRunQuery controls scoped import-run listing and pagination.
type GoogleImportRunQuery struct {
	UserID   string `json:"user_id"`
	Limit    int    `json:"limit"`
	Cursor   string `json:"cursor"`
	SortDesc bool   `json:"sort_desc"`
}

// OutboxMessageRecord stores durable side-effect events for post-commit dispatch.
type OutboxMessageRecord = txoutbox.Message

// OutboxClaimInput controls batched outbox claiming.
type OutboxClaimInput = txoutbox.ClaimInput

// AgreementReminderClaimInput controls batched due reminder state claims.
type AgreementReminderClaimInput struct {
	Now          time.Time `json:"now"`
	Limit        int       `json:"limit"`
	LeaseSeconds int       `json:"lease_seconds"`
	WorkerID     string    `json:"worker_id"`
	SweepID      string    `json:"sweep_id"`
}

type AgreementReminderLeaseToken struct {
	WorkerID string `json:"worker_id"`
	SweepID  string `json:"sweep_id"`
	LeaseSeq int64  `json:"lease_seq"`
}

type AgreementReminderClaim struct {
	State AgreementReminderStateRecord `json:"state"`
	Lease AgreementReminderLeaseToken  `json:"lease"`
}

type AgreementReminderLeaseRenewInput struct {
	Now          time.Time                   `json:"now"`
	LeaseSeconds int                         `json:"lease_seconds"`
	Lease        AgreementReminderLeaseToken `json:"lease"`
}

type AgreementReminderMarkInput struct {
	ReasonCode             string                      `json:"reason_code"`
	Failure                string                      `json:"failure"`
	OccurredAt             time.Time                   `json:"occurred_at"`
	NextDueAt              *time.Time                  `json:"next_due_at"`
	LeaseSeconds           int                         `json:"lease_seconds"`
	Lease                  AgreementReminderLeaseToken `json:"lease"`
	ErrorInternalEncrypted string                      `json:"error_internal_encrypted"`
	ErrorInternalExpiresAt *time.Time                  `json:"error_internal_expires_at"`
	TerminalReason         string                      `json:"terminal_reason"`
}

// IntegrationCredentialRecord stores encrypted provider credentials by scope and user.
type IntegrationCredentialRecord struct {
	bun.BaseModel         `bun:"table:integration_credentials,alias:icred"`
	ID                    string     `json:"id"`
	TenantID              string     `json:"tenant_id"`
	OrgID                 string     `json:"org_id"`
	UserID                string     `json:"user_id"`
	Provider              string     `json:"provider"`
	EncryptedAccessToken  string     `json:"encrypted_access_token"`
	EncryptedRefreshToken string     `json:"encrypted_refresh_token"`
	Scopes                []string   `bun:"scopes_json" json:"scopes"`
	ExpiresAt             *time.Time `json:"expires_at"`
	ProfileJSON           string     `json:"profile_json"` // OAuth profile data, e.g. {"email": "user@example.com"}
	LastUsedAt            *time.Time `json:"last_used_at"` // Last API call using this credential
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

// ExternalFieldRef is the canonical normalized field descriptor for an external provider schema.
type ExternalFieldRef struct {
	Object          string `json:"object"`
	Field           string `json:"field"`
	Type            string `json:"type"`
	Required        bool   `json:"required"`
	ConstraintsJSON string `json:"constraints_json"`
}

// ExternalSchema captures a provider-agnostic external object schema contract.
type ExternalSchema struct {
	ObjectType string             `json:"object_type"`
	Version    string             `json:"version"`
	Fields     []ExternalFieldRef `json:"fields"`
}

// MappingRule maps an external source field to an internal e-sign target attribute.
type MappingRule struct {
	SourceObject string `json:"source_object"`
	SourceField  string `json:"source_field"`
	TargetEntity string `json:"target_entity"`
	TargetPath   string `json:"target_path"`
	Required     bool   `json:"required"`
	DefaultValue string `json:"default_value"`
	Transform    string `json:"transform"`
}

// MappingSpecRecord stores a versioned provider-agnostic mapping contract.
type MappingSpecRecord struct {
	bun.BaseModel   `bun:"table:integration_mapping_specs,alias:ims"`
	ID              string         `json:"id"`
	TenantID        string         `json:"tenant_id"`
	OrgID           string         `json:"org_id"`
	Provider        string         `json:"provider"`
	Name            string         `json:"name"`
	Version         int64          `json:"version"`
	Status          string         `json:"status"`
	ExternalSchema  ExternalSchema `bun:"external_schema_json" json:"external_schema"`
	Rules           []MappingRule  `bun:"rules_json" json:"rules"`
	CompiledJSON    string         `json:"compiled_json"`
	CompiledHash    string         `json:"compiled_hash"`
	PublishedAt     *time.Time     `json:"published_at"`
	CreatedByUserID string         `json:"created_by_user_id"`
	UpdatedByUserID string         `json:"updated_by_user_id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

// IntegrationBindingRecord stores external-to-internal identity bindings with provenance.
type IntegrationBindingRecord struct {
	bun.BaseModel  `bun:"table:integration_bindings,alias:ibnd"`
	ID             string    `json:"id"`
	TenantID       string    `json:"tenant_id"`
	OrgID          string    `json:"org_id"`
	Provider       string    `json:"provider"`
	EntityKind     string    `json:"entity_kind"`
	ExternalID     string    `json:"external_id"`
	InternalID     string    `json:"internal_id"`
	ProvenanceJSON string    `json:"provenance_json"`
	Version        int64     `json:"version"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// IntegrationSyncRunRecord stores sync run lifecycle and resumable progress metadata.
type IntegrationSyncRunRecord struct {
	bun.BaseModel   `bun:"table:integration_sync_runs,alias:isr"`
	ID              string     `json:"id"`
	TenantID        string     `json:"tenant_id"`
	OrgID           string     `json:"org_id"`
	Provider        string     `json:"provider"`
	Direction       string     `json:"direction"`
	MappingSpecID   string     `json:"mapping_spec_id"`
	Status          string     `json:"status"`
	Cursor          string     `json:"cursor"`
	LastError       string     `json:"last_error"`
	AttemptCount    int        `json:"attempt_count"`
	Version         int64      `json:"version"`
	StartedAt       time.Time  `json:"started_at"`
	CompletedAt     *time.Time `json:"completed_at"`
	CreatedByUserID string     `json:"created_by_user_id"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// IntegrationCheckpointRecord stores resumable checkpoint markers for a sync run.
type IntegrationCheckpointRecord struct {
	bun.BaseModel `bun:"table:integration_checkpoints,alias:icp"`
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	OrgID         string    `json:"org_id"`
	RunID         string    `json:"run_id"`
	CheckpointKey string    `json:"checkpoint_key"`
	Cursor        string    `json:"cursor"`
	PayloadJSON   string    `json:"payload_json"`
	Version       int64     `json:"version"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// IntegrationConflictRecord stores explicit integration conflicts requiring operator action.
type IntegrationConflictRecord struct {
	bun.BaseModel    `bun:"table:integration_conflicts,alias:icf"`
	ID               string     `json:"id"`
	TenantID         string     `json:"tenant_id"`
	OrgID            string     `json:"org_id"`
	RunID            string     `json:"run_id"`
	BindingID        string     `bun:"binding_id,nullzero" json:"binding_id"`
	Provider         string     `json:"provider"`
	EntityKind       string     `json:"entity_kind"`
	ExternalID       string     `json:"external_id"`
	InternalID       string     `json:"internal_id"`
	Status           string     `json:"status"`
	Reason           string     `json:"reason"`
	PayloadJSON      string     `json:"payload_json"`
	ResolutionJSON   string     `json:"resolution_json"`
	ResolvedByUserID string     `json:"resolved_by_user_id"`
	ResolvedAt       *time.Time `json:"resolved_at"`
	Version          int64      `json:"version"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// IntegrationChangeEventRecord stores normalized outbound change envelopes.
type IntegrationChangeEventRecord struct {
	bun.BaseModel  `bun:"table:integration_change_events,alias:ice"`
	ID             string    `json:"id"`
	TenantID       string    `json:"tenant_id"`
	OrgID          string    `json:"org_id"`
	AgreementID    string    `json:"agreement_id"`
	Provider       string    `json:"provider"`
	EventType      string    `json:"event_type"`
	SourceEventID  string    `json:"source_event_id"`
	IdempotencyKey string    `json:"idempotency_key"`
	PayloadJSON    string    `json:"payload_json"`
	EmittedAt      time.Time `json:"emitted_at"`
	CreatedAt      time.Time `json:"created_at"`
}

type DocumentQuery struct {
	TitleContains   string `json:"title_contains"`
	CreatedByUserID string `json:"created_by_user_id"`
	SortBy          string `json:"sort_by"` // "created_at" or "updated_at"
	SortDesc        bool   `json:"sort_desc"`
	Limit           int    `json:"limit"`
	Offset          int    `json:"offset"`
}

// DocumentMetadataPatch updates derived PDF metadata fields while keeping source fields immutable.
type DocumentMetadataPatch struct {
	NormalizedObjectKey    string     `json:"normalized_object_key"`
	PDFCompatibilityTier   string     `json:"pdf_compatibility_tier"`
	PDFCompatibilityReason string     `json:"pdf_compatibility_reason"`
	PDFNormalizationStatus string     `json:"pdf_normalization_status"`
	PDFAnalyzedAt          *time.Time `json:"pdf_analyzed_at"`
	PDFPolicyVersion       string     `json:"pdf_policy_version"`
	RemediationStatus      string     `json:"remediation_status"`
	RemediationActorID     string     `json:"remediation_actor_id"`
	RemediationCommandID   string     `json:"remediation_command_id"`
	RemediationDispatchID  string     `json:"remediation_dispatch_id"`
	RemediationExecMode    string     `json:"remediation_exec_mode"`
	RemediationCorrelation string     `json:"remediation_correlation"`
	RemediationFailure     string     `json:"remediation_failure"`
	RemediationOriginalKey string     `json:"remediation_original_key"`
	RemediationOutputKey   string     `json:"remediation_output_key"`
	RemediationRequestedAt *time.Time `json:"remediation_requested_at"`
	RemediationStartedAt   *time.Time `json:"remediation_started_at"`
	RemediationCompletedAt *time.Time `json:"remediation_completed_at"`
	SizeBytes              int64      `json:"size_bytes"`
	PageCount              int        `json:"page_count"`
}

// DocumentRemediationLeaseAcquireInput controls document-scoped lease acquisition.
type DocumentRemediationLeaseAcquireInput struct {
	Now           time.Time     `json:"now"`
	TTL           time.Duration `json:"ttl"`
	WorkerID      string        `json:"worker_id"`
	CorrelationID string        `json:"correlation_id"`
}

// DocumentRemediationLeaseRenewInput controls lease heartbeat renewal.
type DocumentRemediationLeaseRenewInput struct {
	Now        time.Time                     `json:"now"`
	TTL        time.Duration                 `json:"ttl"`
	DocumentID string                        `json:"document_id"`
	Lease      DocumentRemediationLeaseToken `json:"lease"`
}

// DocumentRemediationLeaseReleaseInput controls lease release semantics.
type DocumentRemediationLeaseReleaseInput struct {
	Now   time.Time                     `json:"now"`
	Lease DocumentRemediationLeaseToken `json:"lease"`
}

// DocumentRemediationLeaseToken fences concurrent remediation workers.
type DocumentRemediationLeaseToken struct {
	WorkerID string `json:"worker_id"`
	LeaseSeq int64  `json:"lease_seq"`
}

// DocumentRemediationLeaseRecord captures persisted lease metadata.
type DocumentRemediationLeaseRecord struct {
	DocumentID      string     `json:"document_id"`
	TenantID        string     `json:"tenant_id"`
	OrgID           string     `json:"org_id"`
	WorkerID        string     `json:"worker_id"`
	LeaseSeq        int64      `json:"lease_seq"`
	CorrelationID   string     `json:"correlation_id"`
	AcquiredAt      *time.Time `json:"acquired_at"`
	LastHeartbeatAt *time.Time `json:"last_heartbeat_at"`
	ExpiresAt       *time.Time `json:"expires_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// DocumentRemediationLeaseClaim returns an acquired or renewed lease snapshot.
type DocumentRemediationLeaseClaim struct {
	Record DocumentRemediationLeaseRecord `json:"record"`
	Lease  DocumentRemediationLeaseToken  `json:"lease"`
}

// RemediationDispatchRecord captures durable command dispatch metadata for status/idempotency lookups.
type RemediationDispatchRecord struct {
	DispatchID     string     `json:"dispatch_id"`
	TenantID       string     `json:"tenant_id"`
	OrgID          string     `json:"org_id"`
	DocumentID     string     `json:"document_id"`
	IdempotencyKey string     `json:"idempotency_key"`
	Mode           string     `json:"mode"`
	CommandID      string     `json:"command_id"`
	CorrelationID  string     `json:"correlation_id"`
	Accepted       bool       `json:"accepted"`
	MaxAttempts    int        `json:"max_attempts"`
	EnqueuedAt     *time.Time `json:"enqueued_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type GuardedEffectQuery struct {
	SubjectType string `json:"subject_type"`
	SubjectID   string `json:"subject_id"`
	GroupType   string `json:"group_type"`
	GroupID     string `json:"group_id"`
	Kind        string `json:"kind"`
	Status      string `json:"status"`
	Limit       int    `json:"limit"`
	Offset      int    `json:"offset"`
	SortDesc    bool   `json:"sort_desc"`
}

type AgreementDeliveryStatePatch struct {
	DeliveryStatus        *string    `json:"delivery_status"`
	DeliveryEffectID      *string    `json:"delivery_effect_id"`
	LastDeliveryError     *string    `json:"last_delivery_error"`
	LastDeliveryAttemptAt *time.Time `json:"last_delivery_attempt_at"`
}

type AgreementQuery struct {
	Status   string `json:"status"`
	Limit    int    `json:"limit"`
	Offset   int    `json:"offset"`
	SortDesc bool   `json:"sort_desc"`
}

type DraftQuery struct {
	CreatedByUserID string `json:"created_by_user_id"`
	WizardID        string `json:"wizard_id"`
	Limit           int    `json:"limit"`
	Cursor          string `json:"cursor"`
	SortDesc        bool   `json:"sort_desc"`
}

type DraftAuditEventQuery struct {
	Limit    int  `json:"limit"`
	Offset   int  `json:"offset"`
	SortDesc bool `json:"sort_desc"`
}

type AuditEventQuery struct {
	Limit    int  `json:"limit"`
	Offset   int  `json:"offset"`
	SortDesc bool `json:"sort_desc"`
}

type OutboxQuery = txoutbox.Query

type AgreementDraftPatch struct {
	Title           *string `json:"title"`
	Message         *string `json:"message"`
	DocumentID      *string `json:"document_id"`
	ReviewStatus    *string `json:"review_status"`
	ReviewGate      *string `json:"review_gate"`
	CommentsEnabled *bool   `json:"comments_enabled"`
}

type AgreementReviewProjectionPatch struct {
	ReviewStatus    *string `json:"review_status"`
	ReviewGate      *string `json:"review_gate"`
	CommentsEnabled *bool   `json:"comments_enabled"`
}

type DraftPatch struct {
	WizardStateJSON *string    `json:"wizard_state_json"`
	Title           *string    `json:"title"`
	CurrentStep     *int       `json:"current_step"`
	DocumentID      *string    `json:"document_id"`
	ExpiresAt       *time.Time `json:"expires_at"`
	UpdatedAt       *time.Time `json:"updated_at"`
}

type RecipientDraftPatch struct {
	ID           string  `json:"id"`
	Email        *string `json:"email"`
	Name         *string `json:"name"`
	Role         *string `json:"role"`
	Notify       *bool   `json:"notify"`
	SigningOrder *int    `json:"signing_order"`
}

type ParticipantDraftPatch struct {
	ID           string  `json:"id"`
	Email        *string `json:"email"`
	Name         *string `json:"name"`
	Role         *string `json:"role"`
	Notify       *bool   `json:"notify"`
	SigningStage *int    `json:"signing_stage"`
}

type FieldDraftPatch struct {
	ID                string   `json:"id"`
	RecipientID       *string  `json:"recipient_id"`
	Type              *string  `json:"type"`
	PageNumber        *int     `json:"page_number"`
	PosX              *float64 `json:"pos_x"`
	PosY              *float64 `json:"pos_y"`
	Width             *float64 `json:"width"`
	Height            *float64 `json:"height"`
	PlacementSource   *string  `json:"placement_source"`
	LinkGroupID       *string  `json:"link_group_id"`
	LinkedFromFieldID *string  `json:"linked_from_field_id"`
	IsUnlinked        *bool    `json:"is_unlinked"`
	Required          *bool    `json:"required"`
}

type FieldDefinitionDraftPatch struct {
	ID             string  `json:"id"`
	ParticipantID  *string `json:"participant_id"`
	Type           *string `json:"type"`
	Required       *bool   `json:"required"`
	ValidationJSON *string `json:"validation_json"`
}

type FieldInstanceDraftPatch struct {
	ID                string   `json:"id"`
	FieldDefinitionID *string  `json:"field_definition_id"`
	PageNumber        *int     `json:"page_number"`
	X                 *float64 `json:"x"`
	Y                 *float64 `json:"y"`
	Width             *float64 `json:"width"`
	Height            *float64 `json:"height"`
	TabIndex          *int     `json:"tab_index"`
	Label             *string  `json:"label"`
	AppearanceJSON    *string  `json:"appearance_json"`
	PlacementSource   *string  `json:"placement_source"`
	ResolverID        *string  `json:"resolver_id"`
	Confidence        *float64 `json:"confidence"`
	PlacementRunID    *string  `json:"placement_run_id"`
	ManualOverride    *bool    `json:"manual_override"`
	LinkGroupID       *string  `json:"link_group_id"`
	LinkedFromFieldID *string  `json:"linked_from_field_id"`
	IsUnlinked        *bool    `json:"is_unlinked"`
}

type AgreementTransitionInput struct {
	ToStatus        string `json:"to_status"`
	ExpectedVersion int64  `json:"expected_version"`
}
