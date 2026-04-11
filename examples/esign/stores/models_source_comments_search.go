package stores

import (
	"strings"
	"time"

	"github.com/uptrace/bun"
)

const (
	SourceCommentThreadStatusOpen     = "open"
	SourceCommentThreadStatusResolved = "resolved"
	SourceCommentThreadStatusDeleted  = "deleted"
)

const (
	SourceCommentMessageKindComment = "comment"
	SourceCommentMessageKindReply   = "reply"
	SourceCommentMessageKindSystem  = "system"
)

const (
	SourceCommentAnchorKindDocument  = "document"
	SourceCommentAnchorKindPage      = "page"
	SourceCommentAnchorKindTextRange = "text_range"
)

const (
	SourceCommentAuthorTypeUser    = "user"
	SourceCommentAuthorTypeSystem  = "system"
	SourceCommentAuthorTypeUnknown = "unknown"
)

const (
	SourceCommentSyncStatusNotConfigured = "not_configured"
	SourceCommentSyncStatusPending       = "pending_sync"
	SourceCommentSyncStatusSynced        = "synced"
	SourceCommentSyncStatusFailed        = "failed"
	SourceCommentSyncStatusStale         = "stale"
)

const (
	SourceSearchResultKindSourceDocument = "source_document"
	SourceSearchResultKindSourceRevision = "source_revision"
)

// SourceCommentThreadRecord stores canonical provider-synced comment-thread state.
type SourceCommentThreadRecord struct {
	bun.BaseModel     `bun:"table:source_comment_threads,alias:sct"`
	ID                string     `json:"id"`
	TenantID          string     `json:"tenant_id"`
	OrgID             string     `json:"org_id"`
	SourceDocumentID  string     `json:"source_document_id"`
	SourceRevisionID  string     `json:"source_revision_id"`
	ProviderKind      string     `json:"provider_kind"`
	ProviderCommentID string     `json:"provider_comment_id"`
	ThreadID          string     `json:"thread_id"`
	Status            string     `json:"status"`
	AnchorKind        string     `json:"anchor_kind"`
	AnchorJSON        string     `json:"anchor_json"`
	AuthorJSON        string     `json:"author_json"`
	BodyPreview       string     `json:"body_preview"`
	MessageCount      int        `json:"message_count"`
	ReplyCount        int        `json:"reply_count"`
	SyncStatus        string     `json:"sync_status"`
	ResolvedAt        *time.Time `json:"resolved_at"`
	LastSyncedAt      *time.Time `json:"last_synced_at"`
	LastActivityAt    *time.Time `json:"last_activity_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// SourceCommentMessageRecord stores normalized comment-thread messages.
type SourceCommentMessageRecord struct {
	bun.BaseModel           `bun:"table:source_comment_messages,alias:scm"`
	ID                      string    `json:"id"`
	TenantID                string    `json:"tenant_id"`
	OrgID                   string    `json:"org_id"`
	SourceCommentThreadID   string    `json:"source_comment_thread_id"`
	SourceRevisionID        string    `json:"source_revision_id"`
	ProviderMessageID       string    `json:"provider_message_id"`
	ProviderParentMessageID string    `json:"provider_parent_message_id"`
	MessageKind             string    `json:"message_kind"`
	BodyText                string    `json:"body_text"`
	BodyPreview             string    `json:"body_preview"`
	AuthorJSON              string    `json:"author_json"`
	CreatedAt               time.Time `json:"created_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

// SourceCommentSyncStateRecord stores operational sync metadata per source revision.
type SourceCommentSyncStateRecord struct {
	bun.BaseModel    `bun:"table:source_comment_sync_states,alias:scss"`
	ID               string     `json:"id"`
	TenantID         string     `json:"tenant_id"`
	OrgID            string     `json:"org_id"`
	SourceDocumentID string     `json:"source_document_id"`
	SourceRevisionID string     `json:"source_revision_id"`
	ProviderKind     string     `json:"provider_kind"`
	SyncStatus       string     `json:"sync_status"`
	ThreadCount      int        `json:"thread_count"`
	MessageCount     int        `json:"message_count"`
	PayloadSHA256    string     `json:"payload_sha256"`
	PayloadJSON      string     `json:"payload_json"`
	LastAttemptAt    *time.Time `json:"last_attempt_at"`
	LastSyncedAt     *time.Time `json:"last_synced_at"`
	ErrorCode        string     `json:"error_code"`
	ErrorMessage     string     `json:"error_message"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// SourceSearchDocumentRecord stores provider-neutral search index state.
type SourceSearchDocumentRecord struct {
	bun.BaseModel     `bun:"table:source_search_documents,alias:ssd"`
	ID                string    `json:"id"`
	TenantID          string    `json:"tenant_id"`
	OrgID             string    `json:"org_id"`
	SourceDocumentID  string    `json:"source_document_id"`
	SourceRevisionID  string    `json:"source_revision_id"`
	ResultKind        string    `json:"result_kind"`
	ProviderKind      string    `json:"provider_kind"`
	CanonicalTitle    string    `json:"canonical_title"`
	RelationshipState string    `json:"relationship_state"`
	CommentSyncStatus string    `json:"comment_sync_status"`
	CommentCount      int       `json:"comment_count"`
	HasComments       bool      `json:"has_comments"`
	SearchText        string    `json:"search_text"`
	MetadataJSON      string    `json:"metadata_json"`
	IndexedAt         time.Time `json:"indexed_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func sourceCommentPreview(value string) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) <= 240 {
		return trimmed
	}
	return strings.TrimSpace(trimmed[:240])
}
