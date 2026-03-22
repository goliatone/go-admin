package stores

import (
	"strings"
	"time"
)

var validSourceCommentThreadStatuses = map[string]struct{}{
	SourceCommentThreadStatusOpen:     {},
	SourceCommentThreadStatusResolved: {},
	SourceCommentThreadStatusDeleted:  {},
}

var validSourceCommentMessageKinds = map[string]struct{}{
	SourceCommentMessageKindComment: {},
	SourceCommentMessageKindReply:   {},
	SourceCommentMessageKindSystem:  {},
}

var validSourceCommentAnchorKinds = map[string]struct{}{
	SourceCommentAnchorKindDocument:  {},
	SourceCommentAnchorKindPage:      {},
	SourceCommentAnchorKindTextRange: {},
}

var validSourceCommentAuthorTypes = map[string]struct{}{
	SourceCommentAuthorTypeUser:    {},
	SourceCommentAuthorTypeSystem:  {},
	SourceCommentAuthorTypeUnknown: {},
}

var validSourceCommentSyncStatuses = map[string]struct{}{
	SourceCommentSyncStatusNotConfigured: {},
	SourceCommentSyncStatusPending:       {},
	SourceCommentSyncStatusSynced:        {},
	SourceCommentSyncStatusFailed:        {},
	SourceCommentSyncStatusStale:         {},
}

var validSourceSearchResultKinds = map[string]struct{}{
	SourceSearchResultKindSourceDocument: {},
	SourceSearchResultKindSourceRevision: {},
}

func PrepareSourceCommentThreadRecord(record SourceCommentThreadRecord, current *SourceCommentThreadRecord) (SourceCommentThreadRecord, error) {
	record.ID = strings.TrimSpace(record.ID)
	record.SourceDocumentID = strings.TrimSpace(coalesceLineageString(record.SourceDocumentID, currentString(current, func(v SourceCommentThreadRecord) string { return v.SourceDocumentID })))
	record.SourceRevisionID = strings.TrimSpace(coalesceLineageString(record.SourceRevisionID, currentString(current, func(v SourceCommentThreadRecord) string { return v.SourceRevisionID })))
	if record.SourceDocumentID == "" || record.SourceRevisionID == "" {
		return SourceCommentThreadRecord{}, invalidRecordError("source_comment_threads", "source_document_id|source_revision_id", "required")
	}
	record.ProviderKind = normalizeLineageEnum(coalesceLineageString(record.ProviderKind, currentString(current, func(v SourceCommentThreadRecord) string { return v.ProviderKind })), validSourceProviderKinds)
	if record.ProviderKind == "" {
		return SourceCommentThreadRecord{}, invalidRecordError("source_comment_threads", "provider_kind", "unsupported provider kind")
	}
	record.ProviderCommentID = strings.TrimSpace(coalesceLineageString(record.ProviderCommentID, currentString(current, func(v SourceCommentThreadRecord) string { return v.ProviderCommentID })))
	if record.ProviderCommentID == "" {
		return SourceCommentThreadRecord{}, invalidRecordError("source_comment_threads", "provider_comment_id", "required")
	}
	record.ThreadID = strings.TrimSpace(coalesceLineageString(record.ThreadID, currentString(current, func(v SourceCommentThreadRecord) string { return v.ThreadID })))
	if record.ThreadID == "" {
		record.ThreadID = record.ProviderCommentID
	}
	record.Status = normalizeLineageEnum(coalesceLineageString(record.Status, currentString(current, func(v SourceCommentThreadRecord) string { return v.Status })), validSourceCommentThreadStatuses)
	if record.Status == "" {
		record.Status = SourceCommentThreadStatusOpen
	}
	record.AnchorKind = normalizeLineageEnum(coalesceLineageString(record.AnchorKind, currentString(current, func(v SourceCommentThreadRecord) string { return v.AnchorKind })), validSourceCommentAnchorKinds)
	if record.AnchorKind == "" {
		record.AnchorKind = SourceCommentAnchorKindDocument
	}
	record.AnchorJSON = strings.TrimSpace(coalesceLineageString(record.AnchorJSON, currentString(current, func(v SourceCommentThreadRecord) string { return v.AnchorJSON })))
	if record.AnchorJSON == "" {
		record.AnchorJSON = "{}"
	}
	record.AuthorJSON = strings.TrimSpace(coalesceLineageString(record.AuthorJSON, currentString(current, func(v SourceCommentThreadRecord) string { return v.AuthorJSON })))
	if record.AuthorJSON == "" {
		record.AuthorJSON = "{}"
	}
	record.BodyPreview = sourceCommentPreview(coalesceLineageString(record.BodyPreview, currentString(current, func(v SourceCommentThreadRecord) string { return v.BodyPreview })))
	if record.MessageCount < 0 || record.ReplyCount < 0 {
		return SourceCommentThreadRecord{}, invalidRecordError("source_comment_threads", "message_count|reply_count", "must be non-negative")
	}
	record.SyncStatus = normalizeLineageEnum(coalesceLineageString(record.SyncStatus, currentString(current, func(v SourceCommentThreadRecord) string { return v.SyncStatus })), validSourceCommentSyncStatuses)
	if record.SyncStatus == "" {
		record.SyncStatus = SourceCommentSyncStatusSynced
	}
	record.ResolvedAt = cloneLineageRecordTime(record.ResolvedAt)
	record.LastSyncedAt = cloneLineageRecordTime(record.LastSyncedAt)
	record.LastActivityAt = cloneLineageRecordTime(record.LastActivityAt)
	record.CreatedAt = normalizeLineageRecordCreatedAt(record.CreatedAt, currentTime(current, func(v SourceCommentThreadRecord) time.Time { return v.CreatedAt }))
	record.UpdatedAt = normalizeLineageRecordUpdatedAt(record.UpdatedAt, record.CreatedAt)
	return record, nil
}

func PrepareSourceCommentMessageRecord(record SourceCommentMessageRecord, current *SourceCommentMessageRecord) (SourceCommentMessageRecord, error) {
	record.ID = strings.TrimSpace(record.ID)
	record.SourceCommentThreadID = strings.TrimSpace(coalesceLineageString(record.SourceCommentThreadID, currentString(current, func(v SourceCommentMessageRecord) string { return v.SourceCommentThreadID })))
	record.SourceRevisionID = strings.TrimSpace(coalesceLineageString(record.SourceRevisionID, currentString(current, func(v SourceCommentMessageRecord) string { return v.SourceRevisionID })))
	if record.SourceCommentThreadID == "" || record.SourceRevisionID == "" {
		return SourceCommentMessageRecord{}, invalidRecordError("source_comment_messages", "source_comment_thread_id|source_revision_id", "required")
	}
	record.ProviderMessageID = strings.TrimSpace(coalesceLineageString(record.ProviderMessageID, currentString(current, func(v SourceCommentMessageRecord) string { return v.ProviderMessageID })))
	if record.ProviderMessageID == "" {
		return SourceCommentMessageRecord{}, invalidRecordError("source_comment_messages", "provider_message_id", "required")
	}
	record.ProviderParentMessageID = strings.TrimSpace(coalesceLineageString(record.ProviderParentMessageID, currentString(current, func(v SourceCommentMessageRecord) string { return v.ProviderParentMessageID })))
	record.MessageKind = normalizeLineageEnum(coalesceLineageString(record.MessageKind, currentString(current, func(v SourceCommentMessageRecord) string { return v.MessageKind })), validSourceCommentMessageKinds)
	if record.MessageKind == "" {
		record.MessageKind = SourceCommentMessageKindComment
	}
	record.BodyText = strings.TrimSpace(coalesceLineageString(record.BodyText, currentString(current, func(v SourceCommentMessageRecord) string { return v.BodyText })))
	if record.BodyText == "" {
		return SourceCommentMessageRecord{}, invalidRecordError("source_comment_messages", "body_text", "required")
	}
	record.BodyPreview = sourceCommentPreview(coalesceLineageString(record.BodyPreview, record.BodyText))
	record.AuthorJSON = strings.TrimSpace(coalesceLineageString(record.AuthorJSON, currentString(current, func(v SourceCommentMessageRecord) string { return v.AuthorJSON })))
	if record.AuthorJSON == "" {
		record.AuthorJSON = "{}"
	}
	record.CreatedAt = normalizeLineageRecordCreatedAt(record.CreatedAt, currentTime(current, func(v SourceCommentMessageRecord) time.Time { return v.CreatedAt }))
	record.UpdatedAt = normalizeLineageRecordUpdatedAt(record.UpdatedAt, record.CreatedAt)
	return record, nil
}

func PrepareSourceCommentSyncStateRecord(record SourceCommentSyncStateRecord, current *SourceCommentSyncStateRecord) (SourceCommentSyncStateRecord, error) {
	record.ID = strings.TrimSpace(record.ID)
	record.SourceDocumentID = strings.TrimSpace(coalesceLineageString(record.SourceDocumentID, currentString(current, func(v SourceCommentSyncStateRecord) string { return v.SourceDocumentID })))
	record.SourceRevisionID = strings.TrimSpace(coalesceLineageString(record.SourceRevisionID, currentString(current, func(v SourceCommentSyncStateRecord) string { return v.SourceRevisionID })))
	if record.SourceDocumentID == "" || record.SourceRevisionID == "" {
		return SourceCommentSyncStateRecord{}, invalidRecordError("source_comment_sync_states", "source_document_id|source_revision_id", "required")
	}
	record.ProviderKind = normalizeLineageEnum(coalesceLineageString(record.ProviderKind, currentString(current, func(v SourceCommentSyncStateRecord) string { return v.ProviderKind })), validSourceProviderKinds)
	if record.ProviderKind == "" {
		return SourceCommentSyncStateRecord{}, invalidRecordError("source_comment_sync_states", "provider_kind", "unsupported provider kind")
	}
	record.SyncStatus = normalizeLineageEnum(coalesceLineageString(record.SyncStatus, currentString(current, func(v SourceCommentSyncStateRecord) string { return v.SyncStatus })), validSourceCommentSyncStatuses)
	if record.SyncStatus == "" {
		record.SyncStatus = SourceCommentSyncStatusPending
	}
	if record.ThreadCount < 0 || record.MessageCount < 0 {
		return SourceCommentSyncStateRecord{}, invalidRecordError("source_comment_sync_states", "thread_count|message_count", "must be non-negative")
	}
	record.PayloadSHA256 = strings.TrimSpace(coalesceLineageString(record.PayloadSHA256, currentString(current, func(v SourceCommentSyncStateRecord) string { return v.PayloadSHA256 })))
	record.PayloadJSON = strings.TrimSpace(coalesceLineageString(record.PayloadJSON, currentString(current, func(v SourceCommentSyncStateRecord) string { return v.PayloadJSON })))
	if record.PayloadJSON == "" {
		record.PayloadJSON = "{}"
	}
	record.LastAttemptAt = cloneLineageRecordTime(record.LastAttemptAt)
	record.LastSyncedAt = cloneLineageRecordTime(record.LastSyncedAt)
	record.ErrorCode = strings.TrimSpace(coalesceLineageString(record.ErrorCode, currentString(current, func(v SourceCommentSyncStateRecord) string { return v.ErrorCode })))
	record.ErrorMessage = strings.TrimSpace(coalesceLineageString(record.ErrorMessage, currentString(current, func(v SourceCommentSyncStateRecord) string { return v.ErrorMessage })))
	record.CreatedAt = normalizeLineageRecordCreatedAt(record.CreatedAt, currentTime(current, func(v SourceCommentSyncStateRecord) time.Time { return v.CreatedAt }))
	record.UpdatedAt = normalizeLineageRecordUpdatedAt(record.UpdatedAt, record.CreatedAt)
	return record, nil
}

func PrepareSourceSearchDocumentRecord(record SourceSearchDocumentRecord, current *SourceSearchDocumentRecord) (SourceSearchDocumentRecord, error) {
	record.ID = strings.TrimSpace(record.ID)
	record.SourceDocumentID = strings.TrimSpace(coalesceLineageString(record.SourceDocumentID, currentString(current, func(v SourceSearchDocumentRecord) string { return v.SourceDocumentID })))
	if record.SourceDocumentID == "" {
		return SourceSearchDocumentRecord{}, invalidRecordError("source_search_documents", "source_document_id", "required")
	}
	record.ResultKind = normalizeLineageEnum(coalesceLineageString(record.ResultKind, currentString(current, func(v SourceSearchDocumentRecord) string { return v.ResultKind })), validSourceSearchResultKinds)
	if record.ResultKind == "" {
		record.ResultKind = SourceSearchResultKindSourceDocument
	}
	record.SourceRevisionID = strings.TrimSpace(coalesceLineageString(record.SourceRevisionID, currentString(current, func(v SourceSearchDocumentRecord) string { return v.SourceRevisionID })))
	if record.ResultKind == SourceSearchResultKindSourceRevision && record.SourceRevisionID == "" {
		return SourceSearchDocumentRecord{}, invalidRecordError("source_search_documents", "source_revision_id", "required for source_revision results")
	}
	record.ProviderKind = normalizeLineageEnum(coalesceLineageString(record.ProviderKind, currentString(current, func(v SourceSearchDocumentRecord) string { return v.ProviderKind })), validSourceProviderKinds)
	if record.ProviderKind == "" {
		return SourceSearchDocumentRecord{}, invalidRecordError("source_search_documents", "provider_kind", "unsupported provider kind")
	}
	record.CanonicalTitle = strings.TrimSpace(coalesceLineageString(record.CanonicalTitle, currentString(current, func(v SourceSearchDocumentRecord) string { return v.CanonicalTitle })))
	record.RelationshipState = strings.TrimSpace(coalesceLineageString(record.RelationshipState, currentString(current, func(v SourceSearchDocumentRecord) string { return v.RelationshipState })))
	record.CommentSyncStatus = normalizeLineageEnum(coalesceLineageString(record.CommentSyncStatus, currentString(current, func(v SourceSearchDocumentRecord) string { return v.CommentSyncStatus })), validSourceCommentSyncStatuses)
	if record.CommentSyncStatus == "" {
		record.CommentSyncStatus = SourceCommentSyncStatusNotConfigured
	}
	if record.CommentCount < 0 {
		return SourceSearchDocumentRecord{}, invalidRecordError("source_search_documents", "comment_count", "must be non-negative")
	}
	record.SearchText = strings.TrimSpace(coalesceLineageString(record.SearchText, currentString(current, func(v SourceSearchDocumentRecord) string { return v.SearchText })))
	if record.SearchText == "" {
		record.SearchText = record.CanonicalTitle
	}
	record.MetadataJSON = strings.TrimSpace(coalesceLineageString(record.MetadataJSON, currentString(current, func(v SourceSearchDocumentRecord) string { return v.MetadataJSON })))
	if record.MetadataJSON == "" {
		record.MetadataJSON = "{}"
	}
	record.IndexedAt = normalizeLineageRecordCreatedAt(record.IndexedAt, currentTime(current, func(v SourceSearchDocumentRecord) time.Time { return v.IndexedAt }))
	record.UpdatedAt = normalizeLineageRecordUpdatedAt(record.UpdatedAt, record.IndexedAt)
	return record, nil
}
