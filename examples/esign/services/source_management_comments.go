package services

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func (s DefaultSourceReadModelService) buildSourceCommentPage(ctx context.Context, scope stores.Scope, sourceDocumentID, sourceRevisionID string, query SourceCommentListQuery) (SourceCommentPage, error) {
	page := emptySourceCommentPage()
	page.AppliedQuery = query
	if s.lineage == nil {
		return page, domainValidationError("lineage_read_models", "lineage", "not configured")
	}
	if strings.TrimSpace(sourceDocumentID) == "" && strings.TrimSpace(sourceRevisionID) == "" {
		return page, domainValidationError("lineage_read_models", "source_document_id|source_revision_id", "required")
	}

	var sourceDocument stores.SourceDocumentRecord
	var revision stores.SourceRevisionRecord
	var err error
	if strings.TrimSpace(sourceRevisionID) != "" {
		revision, err = s.lineage.GetSourceRevision(ctx, scope, strings.TrimSpace(sourceRevisionID))
		if err != nil {
			return page, err
		}
		sourceDocument, err = s.lineage.GetSourceDocument(ctx, scope, revision.SourceDocumentID)
		if err != nil {
			return page, err
		}
	} else {
		sourceDocument, err = s.lineage.GetSourceDocument(ctx, scope, strings.TrimSpace(sourceDocumentID))
		if err != nil {
			return page, err
		}
	}
	resolved, err := s.resolveSourceManagementContext(ctx, scope, sourceDocument)
	if err != nil {
		return page, err
	}

	threadQuery := stores.SourceCommentThreadQuery{
		SourceDocumentID: sourceDocument.ID,
		SourceRevisionID: strings.TrimSpace(sourceRevisionID),
		Status:           strings.TrimSpace(query.Status),
		SyncStatus:       strings.TrimSpace(query.SyncStatus),
	}
	threads, err := s.lineage.ListSourceCommentThreads(ctx, scope, threadQuery)
	if err != nil {
		return page, err
	}
	sort.SliceStable(threads, func(i, j int) bool {
		left := commentThreadSortTime(threads[i])
		right := commentThreadSortTime(threads[j])
		if left.Equal(right) {
			return threads[i].ID < threads[j].ID
		}
		return left.After(right)
	})

	states, err := s.lineage.ListSourceCommentSyncStates(ctx, scope, stores.SourceCommentSyncStateQuery{
		SourceDocumentID: sourceDocument.ID,
		SourceRevisionID: strings.TrimSpace(sourceRevisionID),
	})
	if err != nil {
		return page, err
	}
	syncStatus := aggregateSourceCommentSyncStatus(states)
	syncSummary := aggregateSourceCommentSyncSummary(states)

	items := make([]SourceCommentThreadSummary, 0, len(threads))
	for _, thread := range threads {
		threadRevision := revision
		if strings.TrimSpace(thread.SourceRevisionID) != "" && strings.TrimSpace(thread.SourceRevisionID) != strings.TrimSpace(threadRevision.ID) {
			threadRevision, err = s.lineage.GetSourceRevision(ctx, scope, thread.SourceRevisionID)
			if err != nil {
				return page, err
			}
		}
		messages, err := s.lineage.ListSourceCommentMessages(ctx, scope, stores.SourceCommentMessageQuery{
			SourceCommentThreadID: thread.ID,
		})
		if err != nil {
			return page, err
		}
		items = append(items, buildSourceCommentThreadSummary(sourceDocument, threadRevision, thread, messages))
	}
	paged, pageInfo := paginateSourceManagement(items, query.Page, query.PageSize, sourceRevisionSortLatestDesc)

	page.Source = sourceLineageReference(sourceDocument)
	if strings.TrimSpace(revision.ID) != "" {
		page.Revision = sourceManagementRevisionSummary(revision, resolved)
	}
	page.Items = paged
	page.PageInfo = pageInfo
	page.SyncStatus = syncStatus
	if syncSummary != nil {
		page.Sync = syncSummary
	}
	if strings.TrimSpace(revision.ID) != "" {
		page.Links = sourceRevisionLinks(revision.ID, sourceDocument.ID)
	} else {
		page.Links = sourceLinksForDocument(sourceDocument.ID)
	}
	description := "No source comments were found for the current filters."
	if strings.TrimSpace(revision.ID) != "" && syncStatus == SourceManagementCommentSyncNotConfigured {
		description = "Source-level comment sync is not configured yet for this revision."
	} else if strings.TrimSpace(revision.ID) == "" && syncStatus == SourceManagementCommentSyncNotConfigured {
		description = "Source-level comment sync is not configured yet for this source."
	}
	page.EmptyState = LineageEmptyState{
		Kind:        emptyCommentStateKind(len(items), syncStatus),
		Title:       "No comments",
		Description: description,
	}
	return page, nil
}

func normalizeSourceCommentListQuery(query SourceCommentListQuery) SourceCommentListQuery {
	query.Status = strings.TrimSpace(query.Status)
	query.SyncStatus = strings.TrimSpace(query.SyncStatus)
	query.Page, query.PageSize = normalizeSourceManagementPage(query.Page, query.PageSize)
	return query
}

func emptyCommentStateKind(itemCount int, syncStatus string) string {
	if itemCount > 0 {
		return LineageEmptyStateNone
	}
	if strings.TrimSpace(syncStatus) == SourceManagementCommentSyncNotConfigured {
		return LineageEmptyStateNoComments
	}
	return LineageEmptyStateNoResults
}

func commentThreadSortTime(record stores.SourceCommentThreadRecord) time.Time {
	if record.LastActivityAt != nil {
		return record.LastActivityAt.UTC()
	}
	if record.LastSyncedAt != nil {
		return record.LastSyncedAt.UTC()
	}
	return record.UpdatedAt.UTC()
}

func aggregateSourceCommentSyncSummary(states []stores.SourceCommentSyncStateRecord) *SourceCommentSyncSummary {
	if len(states) == 0 {
		return &SourceCommentSyncSummary{Status: SourceManagementCommentSyncNotConfigured}
	}
	sortSourceCommentSyncStates(states)
	threadCount := 0
	messageCount := 0
	out := SourceCommentSyncSummary{Status: aggregateSourceCommentSyncStatus(states)}
	for _, state := range states {
		threadCount += state.ThreadCount
		messageCount += state.MessageCount
		if state.LastAttemptAt != nil && (out.LastAttemptAt == nil || state.LastAttemptAt.After(*out.LastAttemptAt)) {
			out.LastAttemptAt = cloneSourceTimePtr(state.LastAttemptAt)
		}
		if state.LastSyncedAt != nil && (out.LastSyncedAt == nil || state.LastSyncedAt.After(*out.LastSyncedAt)) {
			out.LastSyncedAt = cloneSourceTimePtr(state.LastSyncedAt)
		}
		if out.ErrorCode == "" && strings.TrimSpace(state.ErrorCode) != "" {
			out.ErrorCode = strings.TrimSpace(state.ErrorCode)
			out.ErrorMessage = strings.TrimSpace(state.ErrorMessage)
		}
	}
	out.ThreadCount = threadCount
	out.MessageCount = messageCount
	return &out
}
