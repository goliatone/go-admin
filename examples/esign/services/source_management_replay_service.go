package services

import (
	"context"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

type DefaultSourceManagementReplayService struct {
	comments SourceCommentSyncService
	search   SourceSearchService
}

func NewDefaultSourceManagementReplayService(comments SourceCommentSyncService, search SourceSearchService) DefaultSourceManagementReplayService {
	return DefaultSourceManagementReplayService{
		comments: comments,
		search:   search,
	}
}

func (s DefaultSourceManagementReplayService) ReplaySourceRevisionCommentSync(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceCommentSyncResult, error) {
	if s.comments == nil {
		return SourceCommentSyncResult{}, domainValidationError("source_management_replay", "comments", "not configured")
	}
	return s.comments.ReplaySourceRevisionCommentSync(ctx, scope, sourceRevisionID)
}

func (s DefaultSourceManagementReplayService) ReindexSourceDocument(ctx context.Context, scope stores.Scope, sourceDocumentID string) (SourceSearchIndexResult, error) {
	if s.search == nil {
		return SourceSearchIndexResult{}, domainValidationError("source_management_replay", "search", "not configured")
	}
	return s.search.ReindexSourceDocument(ctx, scope, sourceDocumentID)
}

func (s DefaultSourceManagementReplayService) ReindexSourceRevision(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceSearchIndexResult, error) {
	if s.search == nil {
		return SourceSearchIndexResult{}, domainValidationError("source_management_replay", "search", "not configured")
	}
	return s.search.ReindexSourceRevision(ctx, scope, sourceRevisionID)
}
