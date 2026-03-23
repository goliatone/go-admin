package services

import (
	"context"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	DefaultSourceManagementBasePath            = "/admin/api/v1/esign"
	DefaultLineageDiagnosticsBasePath          = "/admin/debug/lineage"
	LineageEmptyStateNone                      = "none"
	LineageEmptyStateNoSource                  = "no_source"
	LineageEmptyStateNoResults                 = "no_results"
	LineageEmptyStateNoComments                = "no_comments"
	LineageFingerprintStatusNotApplicable      = "not_applicable"
	LineageFingerprintStatusUnknown            = "unknown"
	LineageFingerprintStatusPending            = "pending"
	LineageFingerprintStatusReady              = "ready"
	LineageFingerprintStatusFailed             = "failed"
	LineageFingerprintProcessingNotApplicable  = "not_applicable"
	LineageFingerprintProcessingQueued         = "queued"
	LineageFingerprintProcessingRunning        = "running"
	LineageFingerprintProcessingRetrying       = "retrying"
	LineageFingerprintProcessingReady          = "ready"
	LineageFingerprintProcessingFailed         = "failed"
	LineageFingerprintProcessingStale          = "stale"
	LineageFingerprintProcessingUnknown        = "unknown"
	LineageWarningSeverityCritical             = "critical"
	LineageWarningSeverityWarning              = "warning"
	LineageWarningSeverityInfo                 = "info"
	LineageWarningSeverityNone                 = "none"
	LineageImportStatusQueued                  = "queued"
	LineageImportStatusRunning                 = "running"
	LineageImportStatusLinked                  = "linked"
	LineageImportStatusNeedsReview             = "needs_review"
	LineageReviewVisibilityHidden              = "hidden"
	LineageReviewVisibilityAdminOnly           = "admin_debug_only"
	SourceManagementPaginationModePage         = "page"
	SourceManagementLinkVisibilityAdminView    = "admin_view"
	SourceManagementCommentSyncNotConfigured   = "not_configured"
	SourceManagementCommentSyncPending         = "pending_sync"
	SourceManagementCommentSyncSynced          = "synced"
	SourceManagementCommentSyncFailed          = "failed"
	SourceManagementCommentSyncStale           = "stale"
	SourceManagementSearchResultSourceDocument = "source_document"
	SourceManagementSearchResultSourceRevision = "source_revision"
	SourceRevisionHistoryLabelLatest           = "latest"
	SourceRevisionHistoryLabelPinned           = "pinned"
	SourceRevisionHistoryLabelSuperseded       = "superseded"
	SourceRevisionHistoryLabelHistorical       = "historical"
	SourceRelationshipKindContinuity           = "continuity"
	SourceRelationshipKindCopy                 = "copy"
	SourceRelationshipKindTransfer             = "transfer"
	SourceRelationshipKindFork                 = "fork"
	SourceRelationshipKindPartialOverlap       = "partial_overlap"
	SourceRelationshipRolePredecessor          = "predecessor"
	SourceRelationshipRoleSuccessor            = "successor"
	SourceRelationshipRoleRelated              = "related"
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
	DriveID             string     `json:"drive_id,omitempty"`
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
	HistoryLabels        []string   `json:"history_labels,omitempty"`
	PinnedDocumentCount  int        `json:"pinned_document_count,omitempty"`
	PinnedAgreementCount int        `json:"pinned_agreement_count,omitempty"`
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

type FingerprintProcessingSummary struct {
	State            string     `json:"state"`
	StatusLabel      string     `json:"status_label,omitempty"`
	StartedAt        *time.Time `json:"started_at,omitempty"`
	CompletedAt      *time.Time `json:"completed_at,omitempty"`
	LastAttemptAt    *time.Time `json:"last_attempt_at,omitempty"`
	AttemptCount     int        `json:"attempt_count,omitempty"`
	LastErrorCode    string     `json:"last_error_code,omitempty"`
	LastErrorMessage string     `json:"last_error_message,omitempty"`
	Retryable        bool       `json:"retryable"`
	Stale            bool       `json:"stale"`
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

type NewerSourceSummary struct {
	Exists                 bool   `json:"exists"`
	PinnedSourceRevisionID string `json:"pinned_source_revision_id,omitempty"`
	LatestSourceRevisionID string `json:"latest_source_revision_id,omitempty"`
	Summary                string `json:"summary,omitempty"`
}

type SourceManagementLinks struct {
	Self          string `json:"self,omitempty"`
	Source        string `json:"source,omitempty"`
	Revisions     string `json:"revisions,omitempty"`
	Relationships string `json:"relationships,omitempty"`
	Handles       string `json:"handles,omitempty"`
	Diagnostics   string `json:"diagnostics,omitempty"`
	Provider      string `json:"provider,omitempty"`
	Artifacts     string `json:"artifacts,omitempty"`
	Comments      string `json:"comments,omitempty"`
}

type SourceManagementPermissions struct {
	CanViewDiagnostics   bool `json:"can_view_diagnostics"`
	CanOpenProviderLinks bool `json:"can_open_provider_links"`
	CanReviewCandidates  bool `json:"can_review_candidates"`
	CanViewComments      bool `json:"can_view_comments"`
}

type SourceProviderExtensionEnvelope struct {
	Schema string         `json:"schema"`
	Values map[string]any `json:"values,omitempty"`
}

type SourceProviderSummary struct {
	Kind           string                           `json:"kind"`
	Label          string                           `json:"label"`
	ExternalFileID string                           `json:"external_file_id,omitempty"`
	AccountID      string                           `json:"account_id,omitempty"`
	DriveID        string                           `json:"drive_id,omitempty"`
	WebURL         string                           `json:"web_url,omitempty"`
	Extension      *SourceProviderExtensionEnvelope `json:"extension,omitempty"`
}

type SourceManagementPageInfo struct {
	Mode       string `json:"mode"`
	Page       int    `json:"page"`
	PageSize   int    `json:"page_size"`
	TotalCount int    `json:"total_count"`
	HasMore    bool   `json:"has_more"`
	Sort       string `json:"sort,omitempty"`
}

type SourceHandleSummary struct {
	ID             string                `json:"id"`
	ProviderKind   string                `json:"provider_kind"`
	ExternalFileID string                `json:"external_file_id"`
	AccountID      string                `json:"account_id,omitempty"`
	DriveID        string                `json:"drive_id,omitempty"`
	WebURL         string                `json:"web_url,omitempty"`
	HandleStatus   string                `json:"handle_status"`
	ValidFrom      *time.Time            `json:"valid_from,omitempty"`
	ValidTo        *time.Time            `json:"valid_to,omitempty"`
	Links          SourceManagementLinks `json:"links"`
}

type SourceRevisionListItem struct {
	Revision              *SourceRevisionSummary       `json:"revision,omitempty"`
	Provider              *SourceProviderSummary       `json:"provider,omitempty"`
	PrimaryArtifact       *SourceArtifactSummary       `json:"primary_artifact,omitempty"`
	FingerprintStatus     FingerprintStatusSummary     `json:"fingerprint_status"`
	FingerprintProcessing FingerprintProcessingSummary `json:"fingerprint_processing"`
	IsLatest              bool                         `json:"is_latest"`
	Links                 SourceManagementLinks        `json:"links"`
}

type SourceRelationshipSummary struct {
	ID                  string                     `json:"id"`
	RelationshipType    string                     `json:"relationship_type"`
	RelationshipKind    string                     `json:"relationship_kind,omitempty"`
	Status              string                     `json:"status"`
	CounterpartRole     string                     `json:"counterpart_role,omitempty"`
	ConfidenceBand      string                     `json:"confidence_band"`
	ConfidenceScore     float64                    `json:"confidence_score,omitempty"`
	Summary             string                     `json:"summary"`
	LeftSource          *LineageReference          `json:"left_source,omitempty"`
	RightSource         *LineageReference          `json:"right_source,omitempty"`
	CounterpartSource   *LineageReference          `json:"counterpart_source,omitempty"`
	ReviewActionVisible string                     `json:"review_action_visible,omitempty"`
	Evidence            []CandidateEvidenceSummary `json:"evidence,omitempty"`
	Links               SourceManagementLinks      `json:"links"`
}

type SourceCommentAnchorSummary struct {
	Kind  string `json:"kind,omitempty"`
	Label string `json:"label,omitempty"`
}

type SourceCommentAuthorSummary struct {
	DisplayName string `json:"display_name,omitempty"`
	Email       string `json:"email,omitempty"`
	Type        string `json:"type,omitempty"`
}

type SourceCommentMessageSummary struct {
	ID                string                      `json:"id"`
	ProviderMessageID string                      `json:"provider_message_id,omitempty"`
	MessageKind       string                      `json:"message_kind,omitempty"`
	BodyPreview       string                      `json:"body_preview,omitempty"`
	Author            *SourceCommentAuthorSummary `json:"author,omitempty"`
	CreatedAt         *time.Time                  `json:"created_at,omitempty"`
}

type SourceCommentSyncSummary struct {
	Status        string     `json:"status"`
	ThreadCount   int        `json:"thread_count,omitempty"`
	MessageCount  int        `json:"message_count,omitempty"`
	LastAttemptAt *time.Time `json:"last_attempt_at,omitempty"`
	LastSyncedAt  *time.Time `json:"last_synced_at,omitempty"`
	ErrorCode     string     `json:"error_code,omitempty"`
	ErrorMessage  string     `json:"error_message,omitempty"`
}

type SourceCommentThreadSummary struct {
	ID                string                        `json:"id"`
	ProviderCommentID string                        `json:"provider_comment_id,omitempty"`
	ThreadID          string                        `json:"thread_id,omitempty"`
	Status            string                        `json:"status,omitempty"`
	Source            *LineageReference             `json:"source,omitempty"`
	Revision          *SourceRevisionSummary        `json:"revision,omitempty"`
	Anchor            *SourceCommentAnchorSummary   `json:"anchor,omitempty"`
	AuthorName        string                        `json:"author_name,omitempty"`
	Author            *SourceCommentAuthorSummary   `json:"author,omitempty"`
	BodyPreview       string                        `json:"body_preview,omitempty"`
	MessageCount      int                           `json:"message_count"`
	ReplyCount        int                           `json:"reply_count"`
	Messages          []SourceCommentMessageSummary `json:"messages,omitempty"`
	ResolvedAt        *time.Time                    `json:"resolved_at,omitempty"`
	LastSyncedAt      *time.Time                    `json:"last_synced_at,omitempty"`
	SyncStatus        string                        `json:"sync_status,omitempty"`
	Links             SourceManagementLinks         `json:"links"`
}

type SourceSearchResultSummary struct {
	ResultKind        string                 `json:"result_kind"`
	Source            *LineageReference      `json:"source,omitempty"`
	Revision          *SourceRevisionSummary `json:"revision,omitempty"`
	Provider          *SourceProviderSummary `json:"provider,omitempty"`
	RelationshipState string                 `json:"relationship_state,omitempty"`
	CommentSyncStatus string                 `json:"comment_sync_status,omitempty"`
	CommentCount      int                    `json:"comment_count,omitempty"`
	HasComments       bool                   `json:"has_comments"`
	ArtifactHash      string                 `json:"artifact_hash,omitempty"`
	MatchedFields     []string               `json:"matched_fields,omitempty"`
	Summary           string                 `json:"summary,omitempty"`
	Links             SourceManagementLinks  `json:"links"`
}

type SourceListItem struct {
	Source                *LineageReference           `json:"source,omitempty"`
	Status                string                      `json:"status"`
	LineageConfidence     string                      `json:"lineage_confidence"`
	Provider              *SourceProviderSummary      `json:"provider,omitempty"`
	LatestRevision        *SourceRevisionSummary      `json:"latest_revision,omitempty"`
	ActiveHandle          *SourceHandleSummary        `json:"active_handle,omitempty"`
	RevisionCount         int                         `json:"revision_count"`
	HandleCount           int                         `json:"handle_count"`
	RelationshipCount     int                         `json:"relationship_count"`
	PendingCandidateCount int                         `json:"pending_candidate_count"`
	Permissions           SourceManagementPermissions `json:"permissions"`
	Links                 SourceManagementLinks       `json:"links"`
}

type SourceListQuery struct {
	Query                string `json:"query,omitempty"`
	ProviderKind         string `json:"provider_kind,omitempty"`
	Status               string `json:"status,omitempty"`
	HasPendingCandidates *bool  `json:"has_pending_candidates,omitempty"`
	Sort                 string `json:"sort,omitempty"`
	Page                 int    `json:"page,omitempty"`
	PageSize             int    `json:"page_size,omitempty"`
}

type SourceRevisionListQuery struct {
	Sort     string `json:"sort,omitempty"`
	Page     int    `json:"page,omitempty"`
	PageSize int    `json:"page_size,omitempty"`
}

type SourceRelationshipListQuery struct {
	Status           string `json:"status,omitempty"`
	RelationshipType string `json:"relationship_type,omitempty"`
	Sort             string `json:"sort,omitempty"`
	Page             int    `json:"page,omitempty"`
	PageSize         int    `json:"page_size,omitempty"`
}

type SourceSearchQuery struct {
	Query             string `json:"query"`
	ProviderKind      string `json:"provider_kind,omitempty"`
	Status            string `json:"status,omitempty"`
	ResultKind        string `json:"result_kind,omitempty"`
	RelationshipState string `json:"relationship_state,omitempty"`
	CommentSyncStatus string `json:"comment_sync_status,omitempty"`
	RevisionHint      string `json:"revision_hint,omitempty"`
	Sort              string `json:"sort,omitempty"`
	Page              int    `json:"page,omitempty"`
	PageSize          int    `json:"page_size,omitempty"`
	HasComments       *bool  `json:"has_comments,omitempty"`
}

type SourceCommentListQuery struct {
	Status     string `json:"status,omitempty"`
	SyncStatus string `json:"sync_status,omitempty"`
	Page       int    `json:"page,omitempty"`
	PageSize   int    `json:"page_size,omitempty"`
}

type SourceListPage struct {
	Items        []SourceListItem            `json:"items"`
	PageInfo     SourceManagementPageInfo    `json:"page_info"`
	AppliedQuery SourceListQuery             `json:"applied_query"`
	Permissions  SourceManagementPermissions `json:"permissions"`
	EmptyState   LineageEmptyState           `json:"empty_state"`
	Links        SourceManagementLinks       `json:"links"`
}

type SourceDetail struct {
	Source                *LineageReference           `json:"source,omitempty"`
	Status                string                      `json:"status"`
	LineageConfidence     string                      `json:"lineage_confidence"`
	Provider              *SourceProviderSummary      `json:"provider,omitempty"`
	ActiveHandle          *SourceHandleSummary        `json:"active_handle,omitempty"`
	LatestRevision        *SourceRevisionSummary      `json:"latest_revision,omitempty"`
	RevisionCount         int                         `json:"revision_count"`
	HandleCount           int                         `json:"handle_count"`
	RelationshipCount     int                         `json:"relationship_count"`
	PendingCandidateCount int                         `json:"pending_candidate_count"`
	Permissions           SourceManagementPermissions `json:"permissions"`
	Links                 SourceManagementLinks       `json:"links"`
	EmptyState            LineageEmptyState           `json:"empty_state"`
}

type SourceRevisionPage struct {
	Source       *LineageReference           `json:"source,omitempty"`
	Items        []SourceRevisionListItem    `json:"items"`
	PageInfo     SourceManagementPageInfo    `json:"page_info"`
	AppliedQuery SourceRevisionListQuery     `json:"applied_query"`
	Permissions  SourceManagementPermissions `json:"permissions"`
	EmptyState   LineageEmptyState           `json:"empty_state"`
	Links        SourceManagementLinks       `json:"links"`
}

type SourceRelationshipPage struct {
	Source       *LineageReference           `json:"source,omitempty"`
	Items        []SourceRelationshipSummary `json:"items"`
	PageInfo     SourceManagementPageInfo    `json:"page_info"`
	AppliedQuery SourceRelationshipListQuery `json:"applied_query"`
	Permissions  SourceManagementPermissions `json:"permissions"`
	EmptyState   LineageEmptyState           `json:"empty_state"`
	Links        SourceManagementLinks       `json:"links"`
}

type SourceHandlePage struct {
	Source      *LineageReference           `json:"source,omitempty"`
	Items       []SourceHandleSummary       `json:"items"`
	PageInfo    SourceManagementPageInfo    `json:"page_info"`
	Permissions SourceManagementPermissions `json:"permissions"`
	EmptyState  LineageEmptyState           `json:"empty_state"`
	Links       SourceManagementLinks       `json:"links"`
}

type SourceRevisionDetail struct {
	Source                *LineageReference            `json:"source,omitempty"`
	Revision              *SourceRevisionSummary       `json:"revision,omitempty"`
	Provider              *SourceProviderSummary       `json:"provider,omitempty"`
	FingerprintStatus     FingerprintStatusSummary     `json:"fingerprint_status"`
	FingerprintProcessing FingerprintProcessingSummary `json:"fingerprint_processing"`
	Permissions           SourceManagementPermissions  `json:"permissions"`
	Links                 SourceManagementLinks        `json:"links"`
	EmptyState            LineageEmptyState            `json:"empty_state"`
}

type SourceArtifactPage struct {
	Revision    *SourceRevisionSummary      `json:"revision,omitempty"`
	Items       []SourceArtifactSummary     `json:"items"`
	PageInfo    SourceManagementPageInfo    `json:"page_info"`
	Permissions SourceManagementPermissions `json:"permissions"`
	EmptyState  LineageEmptyState           `json:"empty_state"`
	Links       SourceManagementLinks       `json:"links"`
}

type SourceCommentPage struct {
	Source       *LineageReference            `json:"source,omitempty"`
	Revision     *SourceRevisionSummary       `json:"revision,omitempty"`
	Items        []SourceCommentThreadSummary `json:"items"`
	AppliedQuery SourceCommentListQuery       `json:"applied_query"`
	PageInfo     SourceManagementPageInfo     `json:"page_info"`
	Permissions  SourceManagementPermissions  `json:"permissions"`
	EmptyState   LineageEmptyState            `json:"empty_state"`
	SyncStatus   string                       `json:"sync_status"`
	Sync         *SourceCommentSyncSummary    `json:"sync,omitempty"`
	Links        SourceManagementLinks        `json:"links"`
}

type SourceSearchResults struct {
	Items        []SourceSearchResultSummary `json:"items"`
	PageInfo     SourceManagementPageInfo    `json:"page_info"`
	AppliedQuery SourceSearchQuery           `json:"applied_query"`
	Permissions  SourceManagementPermissions `json:"permissions"`
	EmptyState   LineageEmptyState           `json:"empty_state"`
	Links        SourceManagementLinks       `json:"links"`
}

type SourceManagementContractRules struct {
	FrontendPresentationOnly   bool     `json:"frontend_presentation_only"`
	PaginationMode             string   `json:"pagination_mode"`
	DefaultPageSize            int      `json:"default_page_size"`
	MaxPageSize                int      `json:"max_page_size"`
	SupportedSourceSorts       []string `json:"supported_source_sorts"`
	SupportedRevisionSorts     []string `json:"supported_revision_sorts"`
	SupportedRelationshipSorts []string `json:"supported_relationship_sorts"`
	SupportedSearchSorts       []string `json:"supported_search_sorts"`
	ProviderLinkVisibility     string   `json:"provider_link_visibility"`
	DiagnosticsVisibility      string   `json:"diagnostics_visibility"`
	CandidateReviewVisibility  string   `json:"candidate_review_visibility"`
}

type Phase11SourceManagementQueryFixtures struct {
	ListSources       SourceListQuery             `json:"list_sources"`
	ListRevisions     SourceRevisionListQuery     `json:"list_revisions"`
	ListRelationships SourceRelationshipListQuery `json:"list_relationships"`
	Search            SourceSearchQuery           `json:"search"`
}

type Phase11SourceManagementFixtureStates struct {
	SourceListEmpty           SourceListPage         `json:"source_list_empty"`
	SourceListSingle          SourceListPage         `json:"source_list_single"`
	SourceDetailRepeated      SourceDetail           `json:"source_detail_repeated"`
	SourceHandlesMulti        SourceHandlePage       `json:"source_handles_multi"`
	SourceRevisionsRepeated   SourceRevisionPage     `json:"source_revisions_repeated"`
	SourceRelationshipsReview SourceRelationshipPage `json:"source_relationships_review"`
	SourceRevisionDetail      SourceRevisionDetail   `json:"source_revision_detail"`
	SourceArtifacts           SourceArtifactPage     `json:"source_artifacts"`
	SourceCommentsEmpty       SourceCommentPage      `json:"source_comments_empty"`
	SourceSearchResults       SourceSearchResults    `json:"source_search_results"`
	SourceDetailMerged        SourceDetail           `json:"source_detail_merged"`
	SourceDetailArchived      SourceDetail           `json:"source_detail_archived"`
}

type Phase11SourceManagementContractFixtures struct {
	SchemaVersion int                                  `json:"schema_version"`
	Rules         SourceManagementContractRules        `json:"rules"`
	Queries       Phase11SourceManagementQueryFixtures `json:"queries"`
	States        Phase11SourceManagementFixtureStates `json:"states"`
}

// DocumentLineageDetail is the canonical backend-owned detail payload for document provenance.
type DocumentLineageDetail struct {
	DocumentID              string                       `json:"document_id"`
	SourceDocument          *LineageReference            `json:"source_document,omitempty"`
	SourceRevision          *SourceRevisionSummary       `json:"source_revision,omitempty"`
	SourceArtifact          *SourceArtifactSummary       `json:"source_artifact,omitempty"`
	GoogleSource            *SourceMetadataBaseline      `json:"google_source,omitempty"`
	FingerprintStatus       FingerprintStatusSummary     `json:"fingerprint_status"`
	FingerprintProcessing   FingerprintProcessingSummary `json:"fingerprint_processing"`
	CandidateWarningSummary []CandidateWarningSummary    `json:"candidate_warning_summary,omitempty"`
	PresentationWarnings    []LineagePresentationWarning `json:"presentation_warnings,omitempty"`
	DiagnosticsURL          string                       `json:"diagnostics_url,omitempty"`
	EmptyState              LineageEmptyState            `json:"empty_state"`
}

// AgreementLineageDetail is the canonical backend-owned detail payload for agreement provenance.
type AgreementLineageDetail struct {
	AgreementID             string                       `json:"agreement_id"`
	PinnedSourceRevisionID  string                       `json:"pinned_source_revision_id,omitempty"`
	SourceDocument          *LineageReference            `json:"source_document,omitempty"`
	SourceRevision          *SourceRevisionSummary       `json:"source_revision,omitempty"`
	LinkedDocumentArtifact  *SourceArtifactSummary       `json:"linked_document_artifact,omitempty"`
	GoogleSource            *SourceMetadataBaseline      `json:"google_source,omitempty"`
	FingerprintProcessing   FingerprintProcessingSummary `json:"fingerprint_processing"`
	NewerSourceExists       bool                         `json:"newer_source_exists"`
	NewerSourceSummary      *NewerSourceSummary          `json:"newer_source_summary,omitempty"`
	CandidateWarningSummary []CandidateWarningSummary    `json:"candidate_warning_summary,omitempty"`
	PresentationWarnings    []LineagePresentationWarning `json:"presentation_warnings,omitempty"`
	DiagnosticsURL          string                       `json:"diagnostics_url,omitempty"`
	EmptyState              LineageEmptyState            `json:"empty_state"`
}

// GoogleImportLineageStatus is the canonical backend-owned status payload for async imports.
type GoogleImportLineageStatus struct {
	ImportRunID           string                       `json:"import_run_id"`
	LineageStatus         string                       `json:"lineage_status"`
	SourceDocument        *LineageReference            `json:"source_document,omitempty"`
	SourceRevision        *SourceRevisionSummary       `json:"source_revision,omitempty"`
	SourceArtifact        *SourceArtifactSummary       `json:"source_artifact,omitempty"`
	FingerprintStatus     FingerprintStatusSummary     `json:"fingerprint_status"`
	FingerprintProcessing FingerprintProcessingSummary `json:"fingerprint_processing"`
	CandidateStatus       []CandidateWarningSummary    `json:"candidate_status,omitempty"`
	DocumentDetailURL     string                       `json:"document_detail_url,omitempty"`
	AgreementDetailURL    string                       `json:"agreement_detail_url,omitempty"`
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
	ListSources(ctx context.Context, scope stores.Scope, query SourceListQuery) (SourceListPage, error)
	GetSourceDetail(ctx context.Context, scope stores.Scope, sourceDocumentID string) (SourceDetail, error)
	ListSourceRevisions(ctx context.Context, scope stores.Scope, sourceDocumentID string, query SourceRevisionListQuery) (SourceRevisionPage, error)
	ListSourceRelationships(ctx context.Context, scope stores.Scope, sourceDocumentID string, query SourceRelationshipListQuery) (SourceRelationshipPage, error)
	ListSourceHandles(ctx context.Context, scope stores.Scope, sourceDocumentID string) (SourceHandlePage, error)
	GetSourceRevisionDetail(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceRevisionDetail, error)
	ListSourceRevisionArtifacts(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceArtifactPage, error)
	ListSourceComments(ctx context.Context, scope stores.Scope, sourceDocumentID string, query SourceCommentListQuery) (SourceCommentPage, error)
	ListSourceRevisionComments(ctx context.Context, scope stores.Scope, sourceRevisionID string, query SourceCommentListQuery) (SourceCommentPage, error)
	SearchSources(ctx context.Context, scope stores.Scope, query SourceSearchQuery) (SourceSearchResults, error)
}

type SourceCommentProviderAuthor struct {
	ID          string `json:"id,omitempty"`
	DisplayName string `json:"display_name,omitempty"`
	Email       string `json:"email,omitempty"`
	Type        string `json:"type,omitempty"`
}

type SourceCommentProviderAnchor struct {
	Kind       string         `json:"kind,omitempty"`
	Label      string         `json:"label,omitempty"`
	PageNumber int            `json:"page_number,omitempty"`
	TextQuote  string         `json:"text_quote,omitempty"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

type SourceCommentProviderMessage struct {
	ProviderMessageID       string                      `json:"provider_message_id"`
	ProviderParentMessageID string                      `json:"provider_parent_message_id,omitempty"`
	MessageKind             string                      `json:"message_kind,omitempty"`
	BodyText                string                      `json:"body_text"`
	Author                  SourceCommentProviderAuthor `json:"author"`
	CreatedAt               *time.Time                  `json:"created_at,omitempty"`
	UpdatedAt               *time.Time                  `json:"updated_at,omitempty"`
}

type SourceCommentProviderThread struct {
	ProviderCommentID string                         `json:"provider_comment_id"`
	ThreadID          string                         `json:"thread_id,omitempty"`
	Status            string                         `json:"status,omitempty"`
	Anchor            SourceCommentProviderAnchor    `json:"anchor"`
	Author            SourceCommentProviderAuthor    `json:"author"`
	BodyText          string                         `json:"body_text"`
	ResolvedAt        *time.Time                     `json:"resolved_at,omitempty"`
	LastActivityAt    *time.Time                     `json:"last_activity_at,omitempty"`
	Messages          []SourceCommentProviderMessage `json:"messages,omitempty"`
}

type SourceCommentSyncInput struct {
	SourceDocumentID string                        `json:"source_document_id"`
	SourceRevisionID string                        `json:"source_revision_id"`
	ProviderKind     string                        `json:"provider_kind"`
	SyncStatus       string                        `json:"sync_status,omitempty"`
	AttemptedAt      *time.Time                    `json:"attempted_at,omitempty"`
	SyncedAt         *time.Time                    `json:"synced_at,omitempty"`
	ErrorCode        string                        `json:"error_code,omitempty"`
	ErrorMessage     string                        `json:"error_message,omitempty"`
	Threads          []SourceCommentProviderThread `json:"threads,omitempty"`
}

type SourceCommentSyncResult struct {
	SourceDocumentID string                       `json:"source_document_id"`
	SourceRevisionID string                       `json:"source_revision_id"`
	Sync             SourceCommentSyncSummary     `json:"sync"`
	Threads          []SourceCommentThreadSummary `json:"threads,omitempty"`
}

type SourceSearchIndexResult struct {
	TargetKind        string     `json:"target_kind"`
	TargetID          string     `json:"target_id"`
	IndexedCount      int        `json:"indexed_count"`
	DeletedCount      int        `json:"deleted_count"`
	IndexedAt         *time.Time `json:"indexed_at,omitempty"`
	CommentSyncStatus string     `json:"comment_sync_status,omitempty"`
}

type SourceCommentSyncService interface {
	SyncSourceRevisionComments(ctx context.Context, scope stores.Scope, input SourceCommentSyncInput) (SourceCommentSyncResult, error)
	ReplaySourceRevisionCommentSync(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceCommentSyncResult, error)
}

type SourceSearchService interface {
	Search(ctx context.Context, scope stores.Scope, query SourceSearchQuery) (SourceSearchResults, error)
	ReindexSourceDocument(ctx context.Context, scope stores.Scope, sourceDocumentID string) (SourceSearchIndexResult, error)
	ReindexSourceRevision(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceSearchIndexResult, error)
}

type SourceManagementReplayService interface {
	ReplaySourceRevisionCommentSync(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceCommentSyncResult, error)
	ReindexSourceDocument(ctx context.Context, scope stores.Scope, sourceDocumentID string) (SourceSearchIndexResult, error)
	ReindexSourceRevision(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceSearchIndexResult, error)
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
	ActorID          string                 `json:"actor_id,omitempty"`
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
