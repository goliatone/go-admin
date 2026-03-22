package stores

import (
	"time"

	"github.com/uptrace/bun"
)

const (
	SourceDocumentStatusActive   = "active"
	SourceDocumentStatusArchived = "archived"
	SourceDocumentStatusMerged   = "merged"
)

const (
	SourceProviderKindGoogleDrive = "google_drive"
	SourceProviderKindOneDrive    = "onedrive"
	SourceProviderKindDropbox     = "dropbox"
	SourceProviderKindBox         = "box"
	SourceProviderKindLocal       = "local"
)

const (
	SourceHandleStatusActive             = "active"
	SourceHandleStatusSuperseded         = "superseded"
	SourceHandleStatusSuspectedDuplicate = "suspected_duplicate"
)

const (
	SourceArtifactKindSignablePDF  = "signable_pdf"
	SourceArtifactKindPreviewPDF   = "preview_pdf"
	SourceArtifactKindHTMLSnapshot = "html_snapshot"
	SourceArtifactKindTextExtract  = "text_extract"
)

const (
	SourceRelationshipTypeSameLogicalDoc  = "same_logical_doc"
	SourceRelationshipTypeCopiedFrom      = "copied_from"
	SourceRelationshipTypeTransferredFrom = "transferred_from"
	SourceRelationshipTypeForkedFrom      = "forked_from"
	SourceRelationshipTypePartialOverlap  = "partial_overlap"
)

const (
	SourceRelationshipStatusPendingReview = "pending_review"
	SourceRelationshipStatusConfirmed     = "confirmed"
	SourceRelationshipStatusRejected      = "rejected"
	SourceRelationshipStatusSuperseded    = "superseded"
)

const (
	LineageConfidenceBandExact  = "exact"
	LineageConfidenceBandHigh   = "high"
	LineageConfidenceBandMedium = "medium"
	LineageConfidenceBandLow    = "low"
	LineageConfidenceBandNone   = "none"
)

const (
	SourceExtractVersionPDFTextV1 = "v1_pdf_text"
)

const (
	SourceFingerprintStatusReady  = "ready"
	SourceFingerprintStatusFailed = "failed"
)

// SourceDocumentRecord stores canonical logical source identity.
type SourceDocumentRecord struct {
	bun.BaseModel     `bun:"table:source_documents,alias:sdoc"`
	ID                string    `json:"id"`
	TenantID          string    `json:"tenant_id"`
	OrgID             string    `json:"org_id"`
	ProviderKind      string    `json:"provider_kind"`
	CanonicalTitle    string    `json:"canonical_title"`
	Status            string    `json:"status"`
	LineageConfidence string    `json:"lineage_confidence"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// SourceHandleRecord stores observed provider handles for a canonical source.
type SourceHandleRecord struct {
	bun.BaseModel    `bun:"table:source_handles,alias:shdl"`
	ID               string     `json:"id"`
	TenantID         string     `json:"tenant_id"`
	OrgID            string     `json:"org_id"`
	SourceDocumentID string     `json:"source_document_id"`
	ProviderKind     string     `json:"provider_kind"`
	ExternalFileID   string     `json:"external_file_id"`
	AccountID        string     `json:"account_id"`
	DriveID          string     `json:"drive_id"`
	WebURL           string     `json:"web_url"`
	HandleStatus     string     `json:"handle_status"`
	ValidFrom        *time.Time `json:"valid_from"`
	ValidTo          *time.Time `json:"valid_to"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// SourceRevisionRecord stores a concrete upstream content state.
type SourceRevisionRecord struct {
	bun.BaseModel        `bun:"table:source_revisions,alias:srev"`
	ID                   string     `json:"id"`
	TenantID             string     `json:"tenant_id"`
	OrgID                string     `json:"org_id"`
	SourceDocumentID     string     `json:"source_document_id"`
	SourceHandleID       string     `json:"source_handle_id"`
	ProviderRevisionHint string     `json:"provider_revision_hint"`
	ModifiedTime         *time.Time `json:"modified_time"`
	ExportedAt           *time.Time `json:"exported_at"`
	ExportedByUserID     string     `json:"exported_by_user_id"`
	SourceMimeType       string     `json:"source_mime_type"`
	MetadataJSON         string     `json:"metadata_json"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

// SourceArtifactRecord stores an immutable artifact derived from a source revision.
type SourceArtifactRecord struct {
	bun.BaseModel       `bun:"table:source_artifacts,alias:sart"`
	ID                  string    `json:"id"`
	TenantID            string    `json:"tenant_id"`
	OrgID               string    `json:"org_id"`
	SourceRevisionID    string    `json:"source_revision_id"`
	ArtifactKind        string    `json:"artifact_kind"`
	ObjectKey           string    `json:"object_key"`
	SHA256              string    `json:"sha256"`
	PageCount           int       `json:"page_count"`
	SizeBytes           int64     `json:"size_bytes"`
	CompatibilityTier   string    `json:"compatibility_tier"`
	CompatibilityReason string    `json:"compatibility_reason"`
	NormalizationStatus string    `json:"normalization_status"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// SourceFingerprintRecord stores versioned exact and approximate evidence for reconciliation.
type SourceFingerprintRecord struct {
	bun.BaseModel          `bun:"table:source_fingerprints,alias:sfp"`
	ID                     string    `bun:"id" json:"id"`
	TenantID               string    `bun:"tenant_id" json:"tenant_id"`
	OrgID                  string    `bun:"org_id" json:"org_id"`
	SourceRevisionID       string    `bun:"source_revision_id" json:"source_revision_id"`
	ArtifactID             string    `bun:"artifact_id" json:"artifact_id"`
	ExtractVersion         string    `bun:"extract_version" json:"extract_version"`
	Status                 string    `bun:"status" json:"status"`
	RawSHA256              string    `bun:"raw_sha256" json:"raw_sha256"`
	NormalizedTextSHA256   string    `bun:"normalized_text_sha256" json:"normalized_text_sha256"`
	SimHash64              string    `bun:"simhash64" json:"simhash64"`
	MinHashJSON            string    `bun:"minhash_json" json:"minhash_json"`
	ChunkHashesJSON        string    `bun:"chunk_hashes_json" json:"chunk_hashes_json"`
	ExtractionMetadataJSON string    `bun:"extraction_metadata_json" json:"extraction_metadata_json"`
	ErrorCode              string    `bun:"error_code" json:"error_code"`
	ErrorMessage           string    `bun:"error_message" json:"error_message"`
	TokenCount             int       `bun:"token_count" json:"token_count"`
	CreatedAt              time.Time `bun:"created_at" json:"created_at"`
}

// SourceRelationshipRecord stores inferred or confirmed lineage relationships.
type SourceRelationshipRecord struct {
	bun.BaseModel               `bun:"table:source_relationships,alias:srel"`
	ID                          string    `json:"id"`
	TenantID                    string    `json:"tenant_id"`
	OrgID                       string    `json:"org_id"`
	LeftSourceDocumentID        string    `json:"left_source_document_id"`
	RightSourceDocumentID       string    `json:"right_source_document_id"`
	PredecessorSourceDocumentID string    `json:"predecessor_source_document_id"`
	SuccessorSourceDocumentID   string    `json:"successor_source_document_id"`
	RelationshipType            string    `json:"relationship_type"`
	ConfidenceBand              string    `json:"confidence_band"`
	ConfidenceScore             float64   `json:"confidence_score"`
	Status                      string    `json:"status"`
	EvidenceJSON                string    `json:"evidence_json"`
	CreatedByUserID             string    `json:"created_by_user_id"`
	CreatedAt                   time.Time `json:"created_at"`
	UpdatedAt                   time.Time `json:"updated_at"`
}
