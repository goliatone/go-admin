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

// SourceRevisionUsageStore defines aggregate document/agreement pin usage for tracked source revisions.
type SourceRevisionUsageStore interface {
	ListSourceRevisionUsage(ctx context.Context, scope Scope, query SourceRevisionUsageQuery) ([]SourceRevisionUsageRecord, error)
}

// SourceCommentThreadStore defines canonical provider-synced source-comment thread persistence.
type SourceCommentThreadStore interface {
	CreateSourceCommentThread(ctx context.Context, scope Scope, record SourceCommentThreadRecord) (SourceCommentThreadRecord, error)
	GetSourceCommentThread(ctx context.Context, scope Scope, id string) (SourceCommentThreadRecord, error)
	ListSourceCommentThreads(ctx context.Context, scope Scope, query SourceCommentThreadQuery) ([]SourceCommentThreadRecord, error)
	SaveSourceCommentThread(ctx context.Context, scope Scope, record SourceCommentThreadRecord) (SourceCommentThreadRecord, error)
}

// SourceCommentMessageStore defines normalized source-comment message persistence.
type SourceCommentMessageStore interface {
	CreateSourceCommentMessage(ctx context.Context, scope Scope, record SourceCommentMessageRecord) (SourceCommentMessageRecord, error)
	GetSourceCommentMessage(ctx context.Context, scope Scope, id string) (SourceCommentMessageRecord, error)
	ListSourceCommentMessages(ctx context.Context, scope Scope, query SourceCommentMessageQuery) ([]SourceCommentMessageRecord, error)
	SaveSourceCommentMessage(ctx context.Context, scope Scope, record SourceCommentMessageRecord) (SourceCommentMessageRecord, error)
	DeleteSourceCommentMessages(ctx context.Context, scope Scope, query SourceCommentMessageQuery) error
}

// SourceCommentSyncStateStore defines comment sync-state persistence per source revision.
type SourceCommentSyncStateStore interface {
	CreateSourceCommentSyncState(ctx context.Context, scope Scope, record SourceCommentSyncStateRecord) (SourceCommentSyncStateRecord, error)
	GetSourceCommentSyncState(ctx context.Context, scope Scope, id string) (SourceCommentSyncStateRecord, error)
	ListSourceCommentSyncStates(ctx context.Context, scope Scope, query SourceCommentSyncStateQuery) ([]SourceCommentSyncStateRecord, error)
	SaveSourceCommentSyncState(ctx context.Context, scope Scope, record SourceCommentSyncStateRecord) (SourceCommentSyncStateRecord, error)
}

// SourceSearchDocumentStore defines provider-neutral source-search index persistence.
type SourceSearchDocumentStore interface {
	CreateSourceSearchDocument(ctx context.Context, scope Scope, record SourceSearchDocumentRecord) (SourceSearchDocumentRecord, error)
	GetSourceSearchDocument(ctx context.Context, scope Scope, id string) (SourceSearchDocumentRecord, error)
	ListSourceSearchDocuments(ctx context.Context, scope Scope, query SourceSearchDocumentQuery) ([]SourceSearchDocumentRecord, error)
	SaveSourceSearchDocument(ctx context.Context, scope Scope, record SourceSearchDocumentRecord) (SourceSearchDocumentRecord, error)
	DeleteSourceSearchDocuments(ctx context.Context, scope Scope, query SourceSearchDocumentQuery) error
}

// LineageStore aggregates the lineage persistence contracts.
type LineageStore interface {
	SourceDocumentStore
	SourceHandleStore
	SourceRevisionStore
	SourceArtifactStore
	SourceFingerprintStore
	SourceRelationshipStore
	SourceCommentThreadStore
	SourceCommentMessageStore
	SourceCommentSyncStateStore
	SourceSearchDocumentStore
}

type SourceDocumentQuery struct {
	ProviderKind   string `json:"provider_kind"`
	CanonicalTitle string `json:"canonical_title"`
	Status         string `json:"status"`
}

type SourceHandleQuery struct {
	SourceDocumentID  string   `json:"source_document_id"`
	SourceDocumentIDs []string `json:"source_document_ids"`
	ProviderKind      string   `json:"provider_kind"`
	ExternalFileID    string   `json:"external_file_id"`
	AccountID         string   `json:"account_id"`
	ActiveOnly        bool     `json:"active_only"`
}

type SourceRevisionQuery struct {
	SourceDocumentID     string   `json:"source_document_id"`
	SourceDocumentIDs    []string `json:"source_document_ids"`
	SourceHandleID       string   `json:"source_handle_id"`
	ProviderRevisionHint string   `json:"provider_revision_hint"`
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
	SourceDocumentID  string   `json:"source_document_id"`
	SourceDocumentIDs []string `json:"source_document_ids"`
	RelationshipType  string   `json:"relationship_type"`
	Status            string   `json:"status"`
}

type SourceRevisionUsageQuery struct {
	SourceDocumentIDs []string `json:"source_document_ids"`
	SourceRevisionIDs []string `json:"source_revision_ids"`
}

type SourceRevisionUsageRecord struct {
	SourceDocumentID     string `json:"source_document_id"`
	SourceRevisionID     string `json:"source_revision_id"`
	PinnedDocumentCount  int    `json:"pinned_document_count"`
	PinnedAgreementCount int    `json:"pinned_agreement_count"`
}

type SourceCommentThreadQuery struct {
	SourceDocumentID string `json:"source_document_id"`
	SourceRevisionID string `json:"source_revision_id"`
	ThreadID         string `json:"thread_id"`
	ProviderKind     string `json:"provider_kind"`
	SyncStatus       string `json:"sync_status"`
	Status           string `json:"status"`
	IncludeDeleted   bool   `json:"include_deleted"`
}

type SourceCommentMessageQuery struct {
	SourceCommentThreadID string `json:"source_comment_thread_id"`
	SourceRevisionID      string `json:"source_revision_id"`
	ProviderMessageID     string `json:"provider_message_id"`
}

type SourceCommentSyncStateQuery struct {
	SourceDocumentID string `json:"source_document_id"`
	SourceRevisionID string `json:"source_revision_id"`
	ProviderKind     string `json:"provider_kind"`
	SyncStatus       string `json:"sync_status"`
}

type SourceSearchDocumentQuery struct {
	SourceDocumentID  string `json:"source_document_id"`
	SourceRevisionID  string `json:"source_revision_id"`
	ResultKind        string `json:"result_kind"`
	ProviderKind      string `json:"provider_kind"`
	RelationshipState string `json:"relationship_state"`
	CommentSyncStatus string `json:"comment_sync_status"`
	CanonicalTitle    string `json:"canonical_title"`
	HasComments       *bool  `json:"has_comments,omitempty"`
}
