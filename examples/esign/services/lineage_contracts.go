package services

import (
	"context"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	DefaultLineageDiagnosticsBasePath     = "/admin/debug/lineage"
	LineageEmptyStateNone                 = "none"
	LineageEmptyStateNoSource             = "no_source"
	LineageFingerprintStatusNotApplicable = "not_applicable"
	LineageFingerprintStatusUnknown       = "unknown"
	LineageFingerprintStatusPending       = "pending"
	LineageFingerprintStatusReady         = "ready"
	LineageFingerprintStatusFailed        = "failed"
	LineageWarningSeverityCritical        = "critical"
	LineageWarningSeverityWarning         = "warning"
	LineageWarningSeverityInfo            = "info"
	LineageWarningSeverityNone            = "none"
	LineageImportStatusQueued             = "queued"
	LineageImportStatusRunning            = "running"
	LineageImportStatusLinked             = "linked"
	LineageImportStatusNeedsReview        = "needs_review"
	LineageReviewVisibilityHidden         = "hidden"
	LineageReviewVisibilityAdminOnly      = "admin_debug_only"
)

const (
	SourceRelationshipActionConfirm   = "confirm"
	SourceRelationshipActionReject    = "reject"
	SourceRelationshipActionSupersede = "supersede"
)

// SourceMetadataBaseline captures the minimum provider metadata used for identity and reconciliation.
type SourceMetadataBaseline struct {
	AccountID           string     `json:"account_id"`
	ExternalFileID      string     `json:"external_file_id"`
	WebURL              string     `json:"web_url"`
	ModifiedTime        *time.Time `json:"modified_time,omitempty"`
	SourceVersionHint   string     `json:"source_version_hint"`
	SourceMimeType      string     `json:"source_mime_type"`
	SourceIngestionMode string     `json:"source_ingestion_mode"`
	TitleHint           string     `json:"title_hint"`
	PageCountHint       int        `json:"page_count_hint"`
	OwnerEmail          string     `json:"owner_email,omitempty"`
	ParentID            string     `json:"parent_id,omitempty"`
}

// LineageReference identifies a lineage entity without exposing storage details.
type LineageReference struct {
	ID    string `json:"id"`
	Label string `json:"label,omitempty"`
	URL   string `json:"url,omitempty"`
}

type SourceRevisionSummary struct {
	ID                   string     `json:"id"`
	ProviderRevisionHint string     `json:"provider_revision_hint,omitempty"`
	ModifiedTime         *time.Time `json:"modified_time,omitempty"`
	ExportedAt           *time.Time `json:"exported_at,omitempty"`
	ExportedByUserID     string     `json:"exported_by_user_id,omitempty"`
	SourceMimeType       string     `json:"source_mime_type,omitempty"`
}

type SourceArtifactSummary struct {
	ID                  string `json:"id"`
	ArtifactKind        string `json:"artifact_kind"`
	ObjectKey           string `json:"object_key,omitempty"`
	SHA256              string `json:"sha256,omitempty"`
	PageCount           int    `json:"page_count,omitempty"`
	SizeBytes           int64  `json:"size_bytes,omitempty"`
	CompatibilityTier   string `json:"compatibility_tier,omitempty"`
	CompatibilityReason string `json:"compatibility_reason,omitempty"`
	NormalizationStatus string `json:"normalization_status,omitempty"`
}

type FingerprintStatusSummary struct {
	Status            string `json:"status"`
	ExtractVersion    string `json:"extract_version,omitempty"`
	EvidenceAvailable bool   `json:"evidence_available"`
	ErrorMessage      string `json:"error_message,omitempty"`
	ErrorCode         string `json:"error_code,omitempty"`
}

type CandidateEvidenceSummary struct {
	Code    string `json:"code"`
	Label   string `json:"label"`
	Details string `json:"details,omitempty"`
}

type CandidateWarningSummary struct {
	ID                  string                     `json:"id"`
	RelationshipType    string                     `json:"relationship_type"`
	Status              string                     `json:"status"`
	ConfidenceBand      string                     `json:"confidence_band"`
	ConfidenceScore     float64                    `json:"confidence_score,omitempty"`
	Summary             string                     `json:"summary"`
	Evidence            []CandidateEvidenceSummary `json:"evidence,omitempty"`
	ReviewActionVisible string                     `json:"review_action_visible,omitempty"`
}

type LineagePresentationWarning struct {
	ID                  string                     `json:"id"`
	Type                string                     `json:"type"`
	Severity            string                     `json:"severity"`
	Title               string                     `json:"title"`
	Description         string                     `json:"description"`
	ActionLabel         string                     `json:"action_label,omitempty"`
	ActionURL           string                     `json:"action_url,omitempty"`
	ReviewActionVisible string                     `json:"review_action_visible,omitempty"`
	Evidence            []CandidateEvidenceSummary `json:"evidence,omitempty"`
}

type LineageEmptyState struct {
	Kind        string `json:"kind"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

// DocumentLineageDetail is the canonical backend-owned detail payload for document provenance.
type DocumentLineageDetail struct {
	DocumentID              string                       `json:"document_id"`
	SourceDocument          *LineageReference            `json:"source_document,omitempty"`
	SourceRevision          *SourceRevisionSummary       `json:"source_revision,omitempty"`
	SourceArtifact          *SourceArtifactSummary       `json:"source_artifact,omitempty"`
	GoogleSource            *SourceMetadataBaseline      `json:"google_source,omitempty"`
	FingerprintStatus       FingerprintStatusSummary     `json:"fingerprint_status"`
	CandidateWarningSummary []CandidateWarningSummary    `json:"candidate_warning_summary,omitempty"`
	PresentationWarnings    []LineagePresentationWarning `json:"presentation_warnings,omitempty"`
	DiagnosticsURL          string                       `json:"diagnostics_url,omitempty"`
	EmptyState              LineageEmptyState            `json:"empty_state"`
}

// AgreementLineageDetail is the canonical backend-owned detail payload for agreement provenance.
type AgreementLineageDetail struct {
	AgreementID             string                       `json:"agreement_id"`
	SourceRevision          *SourceRevisionSummary       `json:"source_revision,omitempty"`
	LinkedDocumentArtifact  *SourceArtifactSummary       `json:"linked_document_artifact,omitempty"`
	GoogleSource            *SourceMetadataBaseline      `json:"google_source,omitempty"`
	NewerSourceExists       bool                         `json:"newer_source_exists"`
	CandidateWarningSummary []CandidateWarningSummary    `json:"candidate_warning_summary,omitempty"`
	PresentationWarnings    []LineagePresentationWarning `json:"presentation_warnings,omitempty"`
	DiagnosticsURL          string                       `json:"diagnostics_url,omitempty"`
	EmptyState              LineageEmptyState            `json:"empty_state"`
}

// GoogleImportLineageStatus is the canonical backend-owned status payload for async imports.
type GoogleImportLineageStatus struct {
	ImportRunID        string                    `json:"import_run_id"`
	LineageStatus      string                    `json:"lineage_status"`
	SourceDocument     *LineageReference         `json:"source_document,omitempty"`
	SourceRevision     *SourceRevisionSummary    `json:"source_revision,omitempty"`
	SourceArtifact     *SourceArtifactSummary    `json:"source_artifact,omitempty"`
	FingerprintStatus  FingerprintStatusSummary  `json:"fingerprint_status"`
	CandidateStatus    []CandidateWarningSummary `json:"candidate_status,omitempty"`
	DocumentDetailURL  string                    `json:"document_detail_url,omitempty"`
	AgreementDetailURL string                    `json:"agreement_detail_url,omitempty"`
}

// LineagePresentationRules records backend-owned presentation decisions for current e-sign lineage surfaces.
type LineagePresentationRules struct {
	FrontendPresentationOnly  bool     `json:"frontend_presentation_only"`
	DiagnosticsOwnedByBackend bool     `json:"diagnostics_owned_by_backend"`
	WarningPrecedence         []string `json:"warning_precedence"`
	CandidateReviewVisibility string   `json:"candidate_review_visibility"`
}

// Phase1LineageContractFixtures exposes canonical example payloads for backend and frontend contract work.
type Phase1LineageContractFixtures struct {
	SchemaVersion     int                      `json:"schema_version"`
	PresentationRules LineagePresentationRules `json:"presentation_rules"`
	MetadataBaseline  SourceMetadataBaseline   `json:"metadata_baseline"`
	States            LineageFixtureStates     `json:"states"`
}

type LineageFixtureStates struct {
	DocumentNative  DocumentLineageDetail     `json:"document_native"`
	DocumentEmpty   DocumentLineageDetail     `json:"document_empty"`
	AgreementNative AgreementLineageDetail    `json:"agreement_native"`
	AgreementEmpty  AgreementLineageDetail    `json:"agreement_empty"`
	ImportRunning   GoogleImportLineageStatus `json:"import_running"`
	ImportLinked    GoogleImportLineageStatus `json:"import_linked"`
}

// SourceIdentityService owns canonical identity and revision resolution decisions.
type SourceIdentityService interface {
	ResolveSourceIdentity(ctx context.Context, scope stores.Scope, input SourceIdentityResolutionInput) (SourceIdentityResolution, error)
}

// SourceFingerprintService owns extraction and fingerprint evidence generation.
type SourceFingerprintService interface {
	BuildFingerprint(ctx context.Context, scope stores.Scope, input SourceFingerprintBuildInput) (SourceFingerprintBuildResult, error)
}

// SourceReconciliationService owns candidate creation and review-safe actions.
type SourceReconciliationService interface {
	EvaluateCandidates(ctx context.Context, scope stores.Scope, input SourceReconciliationInput) (SourceReconciliationResult, error)
	ApplyReviewAction(ctx context.Context, scope stores.Scope, input SourceRelationshipReviewInput) (CandidateWarningSummary, error)
	ListCandidateRelationships(ctx context.Context, scope stores.Scope, sourceDocumentID string) ([]stores.SourceRelationshipRecord, error)
}

type SourceLineageProcessingTrigger interface {
	EnqueueLineageProcessing(ctx context.Context, scope stores.Scope, input SourceLineageProcessingInput) error
}

// SourceReadModelService owns server-authored lineage DTOs for current UI surfaces.
type SourceReadModelService interface {
	GetDocumentLineageDetail(ctx context.Context, scope stores.Scope, documentID string) (DocumentLineageDetail, error)
	GetAgreementLineageDetail(ctx context.Context, scope stores.Scope, agreementID string) (AgreementLineageDetail, error)
	GetGoogleImportLineageStatus(ctx context.Context, scope stores.Scope, importRunID string) (GoogleImportLineageStatus, error)
	ListCandidateWarnings(ctx context.Context, scope stores.Scope, sourceDocumentID string) ([]CandidateWarningSummary, error)
}

type SourceIdentityResolutionInput struct {
	ProviderKind          string                 `json:"provider_kind"`
	ActorID               string                 `json:"actor_id"`
	CorrelationID         string                 `json:"correlation_id"`
	IdempotencyKey        string                 `json:"idempotency_key"`
	RevisionContentSHA256 string                 `json:"revision_content_sha256"`
	Metadata              SourceMetadataBaseline `json:"metadata"`
}

type SourceIdentityResolution struct {
	SourceDocument        stores.SourceDocumentRecord      `json:"source_document"`
	SourceHandle          stores.SourceHandleRecord        `json:"source_handle"`
	SourceRevision        stores.SourceRevisionRecord      `json:"source_revision"`
	ResolutionKind        string                           `json:"resolution_kind"`
	ConfidenceBand        string                           `json:"confidence_band"`
	CandidateRelationship *stores.SourceRelationshipRecord `json:"candidate_relationship,omitempty"`
}

type SourceFingerprintBuildInput struct {
	SourceRevisionID string                 `json:"source_revision_id"`
	ArtifactID       string                 `json:"artifact_id"`
	Metadata         SourceMetadataBaseline `json:"metadata"`
}

type SourceFingerprintBuildResult struct {
	Fingerprint stores.SourceFingerprintRecord `json:"fingerprint"`
	Status      FingerprintStatusSummary       `json:"status"`
}

type SourceReconciliationInput struct {
	SourceDocumentID string                 `json:"source_document_id"`
	SourceRevisionID string                 `json:"source_revision_id"`
	ArtifactID       string                 `json:"artifact_id"`
	Metadata         SourceMetadataBaseline `json:"metadata"`
}

type SourceReconciliationResult struct {
	PrimaryCandidate *CandidateWarningSummary  `json:"primary_candidate,omitempty"`
	Candidates       []CandidateWarningSummary `json:"candidates,omitempty"`
}

type SourceRelationshipReviewInput struct {
	RelationshipID string `json:"relationship_id"`
	Action         string `json:"action"`
	ActorID        string `json:"actor_id"`
	Reason         string `json:"reason,omitempty"`
}

type SourceLineageProcessingInput struct {
	ImportRunID      string                 `json:"import_run_id,omitempty"`
	SourceDocumentID string                 `json:"source_document_id,omitempty"`
	SourceRevisionID string                 `json:"source_revision_id"`
	ArtifactID       string                 `json:"artifact_id"`
	ActorID          string                 `json:"actor_id,omitempty"`
	CorrelationID    string                 `json:"correlation_id,omitempty"`
	DedupeKey        string                 `json:"dedupe_key,omitempty"`
	Metadata         SourceMetadataBaseline `json:"metadata"`
}
