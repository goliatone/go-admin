package services

import (
	"context"
	"fmt"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

type failingGoogleCommentsProvider struct {
	*DeterministicGoogleProvider
	err error
}

func (p failingGoogleCommentsProvider) ListComments(context.Context, string, string) ([]GoogleDriveComment, error) {
	if p.err != nil {
		return nil, p.err
	}
	if p.DeterministicGoogleProvider == nil {
		return nil, nil
	}
	return p.DeterministicGoogleProvider.ListComments(context.Background(), "", "")
}

func TestGoogleIntegrationImportDocumentSyncsSourceCommentsAndSearchWhenConfigured(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-google-source-comments", OrgID: "org-google-source-comments"}
	store := stores.NewInMemoryStore()
	search, err := NewGoSearchSourceSearchService(GoSearchSourceSearchConfig{Lineage: store})
	if err != nil {
		t.Fatalf("NewGoSearchSourceSearchService: %v", err)
	}
	commentSync := NewDefaultSourceCommentSyncService(store, WithSourceCommentSyncSearchService(search))
	service := NewGoogleIntegrationService(
		store,
		NewDeterministicGoogleProvider(),
		NewDocumentService(store),
		NewAgreementService(store),
		WithGoogleLineageStore(store),
		WithGoogleSourceCommentSyncService(commentSync),
	)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "sync-user",
		AuthCode: "sync-comments",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	imported, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:          "sync-user",
		GoogleFileID:    "google-file-1",
		DocumentTitle:   "Imported Comment Sync Fixture",
		AgreementTitle:  "Imported Comment Sync Agreement",
		CreatedByUserID: "fixture-user",
	})
	if err != nil {
		t.Fatalf("ImportDocument: %v", err)
	}
	if imported.SourceRevisionID == "" || imported.SourceDocumentID == "" {
		t.Fatalf("expected imported lineage ids, got %+v", imported)
	}

	readModels := NewDefaultSourceReadModelService(store, store, store, WithSourceReadModelSearchService(search))
	comments, err := readModels.ListSourceRevisionComments(ctx, scope, imported.SourceRevisionID, SourceCommentListQuery{
		Page:     1,
		PageSize: 10,
	})
	if err != nil {
		t.Fatalf("ListSourceRevisionComments: %v", err)
	}
	if comments.SyncStatus != SourceManagementCommentSyncSynced || len(comments.Items) == 0 || len(comments.Items[0].Messages) < 2 {
		t.Fatalf("expected synced Google comments after import, got %+v", comments)
	}

	states, err := store.ListSourceCommentSyncStates(ctx, scope, stores.SourceCommentSyncStateQuery{
		SourceRevisionID: imported.SourceRevisionID,
	})
	if err != nil {
		t.Fatalf("ListSourceCommentSyncStates: %v", err)
	}
	if len(states) != 1 || states[0].SyncStatus != SourceManagementCommentSyncSynced {
		t.Fatalf("expected one synced comment state, got %+v", states)
	}

	hasComments := true
	results, err := search.Search(ctx, scope, SourceSearchQuery{
		Query:       "Need legal approval",
		ResultKind:  SourceManagementSearchResultSourceRevision,
		HasComments: &hasComments,
		Page:        1,
		PageSize:    10,
	})
	if err != nil {
		t.Fatalf("Search comment text: %v", err)
	}
	if len(results.Items) == 0 || results.Items[0].Revision == nil || results.Items[0].Revision.ID != imported.SourceRevisionID {
		t.Fatalf("expected comment-driven search result for %q, got %+v", imported.SourceRevisionID, results.Items)
	}
}

func TestGoogleIntegrationSyncSourceRevisionCommentsPersistsFailureStateOnProviderError(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-google-comment-failure", OrgID: "org-google-comment-failure"}
	store := stores.NewInMemoryStore()
	baseProvider := NewDeterministicGoogleProvider()
	baseService := NewGoogleIntegrationService(
		store,
		baseProvider,
		NewDocumentService(store),
		NewAgreementService(store),
		WithGoogleLineageStore(store),
	)

	if _, err := baseService.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "sync-user",
		AuthCode: "sync-comments-failure",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	imported, err := baseService.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:          "sync-user",
		GoogleFileID:    "google-file-1",
		DocumentTitle:   "Imported Failure Fixture",
		AgreementTitle:  "Imported Failure Agreement",
		CreatedByUserID: "fixture-user",
	})
	if err != nil {
		t.Fatalf("ImportDocument: %v", err)
	}

	commentSync := NewDefaultSourceCommentSyncService(store)
	failingService := NewGoogleIntegrationService(
		store,
		failingGoogleCommentsProvider{
			DeterministicGoogleProvider: baseProvider,
			err:                         fmt.Errorf("google comments unavailable"),
		},
		nil,
		nil,
		WithGoogleLineageStore(store),
		WithGoogleSourceCommentSyncService(commentSync),
	)

	if _, err := failingService.SyncSourceRevisionComments(ctx, scope, imported.SourceRevisionID); err == nil {
		t.Fatal("expected SyncSourceRevisionComments to fail when provider comments fail")
	}

	states, err := store.ListSourceCommentSyncStates(ctx, scope, stores.SourceCommentSyncStateQuery{
		SourceRevisionID: imported.SourceRevisionID,
	})
	if err != nil {
		t.Fatalf("ListSourceCommentSyncStates: %v", err)
	}
	if len(states) != 1 {
		t.Fatalf("expected one failed sync state, got %+v", states)
	}
	if states[0].SyncStatus != SourceManagementCommentSyncFailed || states[0].ErrorCode != "google_comment_sync_failed" {
		t.Fatalf("expected failed Google comment sync state, got %+v", states[0])
	}
	if states[0].PayloadJSON == "" || states[0].LastAttemptAt == nil {
		t.Fatalf("expected failed sync state to persist replayable payload and attempt timestamp, got %+v", states[0])
	}

	replay := NewDefaultSourceManagementReplayService(commentSync, nil)
	if _, err := replay.ReplaySourceRevisionCommentSync(ctx, scope, imported.SourceRevisionID); err == nil {
		t.Fatal("expected replay to fail when the only persisted sync state has no replayable payload")
	}
}
