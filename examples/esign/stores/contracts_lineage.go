package stores

import "context"

// SourceDocumentStore defines canonical source-document persistence contracts.
type SourceDocumentStore interface {
	CreateSourceDocument(ctx context.Context, scope Scope, record SourceDocumentRecord) (SourceDocumentRecord, error)
	GetSourceDocument(ctx context.Context, scope Scope, id string) (SourceDocumentRecord, error)
	ListSourceDocuments(ctx context.Context, scope Scope, query SourceDocumentQuery) ([]SourceDocumentRecord, error)
	SaveSourceDocument(ctx context.Context, scope Scope, record SourceDocumentRecord) (SourceDocumentRecord, error)
}

// SourceHandleStore defines provider-handle persistence and active-handle lookup contracts.
type SourceHandleStore interface {
	CreateSourceHandle(ctx context.Context, scope Scope, record SourceHandleRecord) (SourceHandleRecord, error)
	GetSourceHandle(ctx context.Context, scope Scope, id string) (SourceHandleRecord, error)
	GetActiveSourceHandle(ctx context.Context, scope Scope, providerKind, externalFileID, accountID string) (SourceHandleRecord, error)
	ListSourceHandles(ctx context.Context, scope Scope, query SourceHandleQuery) ([]SourceHandleRecord, error)
	SaveSourceHandle(ctx context.Context, scope Scope, record SourceHandleRecord) (SourceHandleRecord, error)
}

// SourceRevisionStore defines source-revision persistence contracts.
type SourceRevisionStore interface {
	CreateSourceRevision(ctx context.Context, scope Scope, record SourceRevisionRecord) (SourceRevisionRecord, error)
	GetSourceRevision(ctx context.Context, scope Scope, id string) (SourceRevisionRecord, error)
	ListSourceRevisions(ctx context.Context, scope Scope, query SourceRevisionQuery) ([]SourceRevisionRecord, error)
	SaveSourceRevision(ctx context.Context, scope Scope, record SourceRevisionRecord) (SourceRevisionRecord, error)
}

// SourceArtifactStore defines immutable source-artifact persistence contracts.
type SourceArtifactStore interface {
	CreateSourceArtifact(ctx context.Context, scope Scope, record SourceArtifactRecord) (SourceArtifactRecord, error)
	GetSourceArtifact(ctx context.Context, scope Scope, id string) (SourceArtifactRecord, error)
	ListSourceArtifacts(ctx context.Context, scope Scope, query SourceArtifactQuery) ([]SourceArtifactRecord, error)
	SaveSourceArtifact(ctx context.Context, scope Scope, record SourceArtifactRecord) (SourceArtifactRecord, error)
}

// SourceFingerprintStore defines fingerprint-evidence persistence contracts.
type SourceFingerprintStore interface {
	CreateSourceFingerprint(ctx context.Context, scope Scope, record SourceFingerprintRecord) (SourceFingerprintRecord, error)
	GetSourceFingerprint(ctx context.Context, scope Scope, id string) (SourceFingerprintRecord, error)
	ListSourceFingerprints(ctx context.Context, scope Scope, query SourceFingerprintQuery) ([]SourceFingerprintRecord, error)
	SaveSourceFingerprint(ctx context.Context, scope Scope, record SourceFingerprintRecord) (SourceFingerprintRecord, error)
}

// SourceRelationshipStore defines reconciliation relationship persistence contracts.
type SourceRelationshipStore interface {
	CreateSourceRelationship(ctx context.Context, scope Scope, record SourceRelationshipRecord) (SourceRelationshipRecord, error)
	GetSourceRelationship(ctx context.Context, scope Scope, id string) (SourceRelationshipRecord, error)
	ListSourceRelationships(ctx context.Context, scope Scope, query SourceRelationshipQuery) ([]SourceRelationshipRecord, error)
	SaveSourceRelationship(ctx context.Context, scope Scope, record SourceRelationshipRecord) (SourceRelationshipRecord, error)
}

// LineageStore aggregates the Version 1 lineage persistence contracts.
type LineageStore interface {
	SourceDocumentStore
	SourceHandleStore
	SourceRevisionStore
	SourceArtifactStore
	SourceFingerprintStore
	SourceRelationshipStore
}

type SourceDocumentQuery struct {
	ProviderKind   string `json:"provider_kind"`
	CanonicalTitle string `json:"canonical_title"`
	Status         string `json:"status"`
}

type SourceHandleQuery struct {
	SourceDocumentID string `json:"source_document_id"`
	ProviderKind     string `json:"provider_kind"`
	ExternalFileID   string `json:"external_file_id"`
	AccountID        string `json:"account_id"`
	ActiveOnly       bool   `json:"active_only"`
}

type SourceRevisionQuery struct {
	SourceDocumentID     string `json:"source_document_id"`
	SourceHandleID       string `json:"source_handle_id"`
	ProviderRevisionHint string `json:"provider_revision_hint"`
}

type SourceArtifactQuery struct {
	SourceRevisionID string `json:"source_revision_id"`
	ArtifactKind     string `json:"artifact_kind"`
	SHA256           string `json:"sha256"`
}

type SourceFingerprintQuery struct {
	SourceRevisionID string `json:"source_revision_id"`
	ArtifactID       string `json:"artifact_id"`
	ExtractVersion   string `json:"extract_version"`
}

type SourceRelationshipQuery struct {
	SourceDocumentID string `json:"source_document_id"`
	RelationshipType string `json:"relationship_type"`
	Status           string `json:"status"`
}
