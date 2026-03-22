package services

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestPhase13SourceCommentSyncSearchAndReadModelsRemainDistinctFromAgreementComments(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	now := time.Date(2026, 3, 21, 16, 0, 0, 0, time.UTC)

	review, err := store.CreateAgreementReview(context.Background(), scope, stores.AgreementReviewRecord{
		ID:                "agreement-review-phase13",
		AgreementID:       fixtures.importedAgreementID,
		Status:            stores.AgreementReviewStatusInReview,
		Gate:              stores.AgreementReviewGateApproveBeforeSend,
		RequestedByUserID: "fixture-user",
		OpenedAt:          &now,
		LastActivityAt:    &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateAgreementReview: %v", err)
	}
	if _, err := store.CreateAgreementCommentThread(context.Background(), scope, stores.AgreementCommentThreadRecord{
		ID:             "agreement-thread-phase13",
		AgreementID:    fixtures.importedAgreementID,
		ReviewID:       review.ID,
		DocumentID:     fixtures.importedDocumentID,
		Visibility:     stores.AgreementCommentVisibilityShared,
		AnchorType:     stores.AgreementCommentAnchorAgreement,
		Status:         stores.AgreementCommentThreadStatusOpen,
		CreatedByType:  "user",
		CreatedByID:    "fixture-user",
		LastActivityAt: &now,
		CreatedAt:      now,
		UpdatedAt:      now,
	}); err != nil {
		t.Fatalf("CreateAgreementCommentThread: %v", err)
	}
	if _, err := store.CreateAgreementCommentMessage(context.Background(), scope, stores.AgreementCommentMessageRecord{
		ID:            "agreement-message-phase13",
		ThreadID:      "agreement-thread-phase13",
		Body:          "Agreement-only comment",
		MessageKind:   stores.AgreementCommentMessageKindComment,
		CreatedByType: "user",
		CreatedByID:   "fixture-user",
		CreatedAt:     now,
	}); err != nil {
		t.Fatalf("CreateAgreementCommentMessage: %v", err)
	}

	search := NewDefaultSourceSearchService(store)
	sync := NewDefaultSourceCommentSyncService(store, WithSourceCommentSyncSearchService(search))
	result, err := sync.SyncSourceRevisionComments(context.Background(), scope, SourceCommentSyncInput{
		SourceDocumentID: fixtures.sourceDocumentID,
		SourceRevisionID: fixtures.secondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		SyncStatus:       SourceManagementCommentSyncSynced,
		AttemptedAt:      timePtrPhase13(now),
		SyncedAt:         timePtrPhase13(now),
		Threads: []SourceCommentProviderThread{{
			ProviderCommentID: "provider-comment-1",
			ThreadID:          "thread-1",
			Status:            stores.SourceCommentThreadStatusOpen,
			Anchor: SourceCommentProviderAnchor{
				Kind:  stores.SourceCommentAnchorKindPage,
				Label: "Page 2",
			},
			Author: SourceCommentProviderAuthor{
				DisplayName: "Source Reviewer",
				Email:       "reviewer@example.com",
				Type:        stores.SourceCommentAuthorTypeUser,
			},
			BodyText:       "Need legal approval",
			LastActivityAt: timePtrPhase13(now),
			Messages: []SourceCommentProviderMessage{
				{
					ProviderMessageID: "provider-message-1",
					MessageKind:       stores.SourceCommentMessageKindComment,
					BodyText:          "Need legal approval",
					Author: SourceCommentProviderAuthor{
						DisplayName: "Source Reviewer",
						Email:       "reviewer@example.com",
						Type:        stores.SourceCommentAuthorTypeUser,
					},
					CreatedAt: timePtrPhase13(now),
					UpdatedAt: timePtrPhase13(now),
				},
				{
					ProviderMessageID:       "provider-message-2",
					ProviderParentMessageID: "provider-message-1",
					MessageKind:             stores.SourceCommentMessageKindReply,
					BodyText:                "Acknowledged by ops",
					Author: SourceCommentProviderAuthor{
						DisplayName: "Ops Reviewer",
						Email:       "ops@example.com",
						Type:        stores.SourceCommentAuthorTypeUser,
					},
					CreatedAt: timePtrPhase13(now.Add(5 * time.Minute)),
					UpdatedAt: timePtrPhase13(now.Add(5 * time.Minute)),
				},
			},
		}},
	})
	if err != nil {
		t.Fatalf("SyncSourceRevisionComments: %v", err)
	}
	if result.Sync.Status != SourceManagementCommentSyncSynced || result.Sync.ThreadCount != 1 || result.Sync.MessageCount != 2 {
		t.Fatalf("expected synced source comment result, got %+v", result.Sync)
	}

	service := NewDefaultSourceReadModelService(store, store, store)
	sourceComments, err := service.ListSourceComments(context.Background(), scope, fixtures.sourceDocumentID, SourceCommentListQuery{})
	if err != nil {
		t.Fatalf("ListSourceComments: %v", err)
	}
	if sourceComments.SyncStatus != SourceManagementCommentSyncSynced || len(sourceComments.Items) != 1 {
		t.Fatalf("expected source-scoped synced comments, got %+v", sourceComments)
	}
	if sourceComments.Items[0].Revision == nil || sourceComments.Items[0].Revision.ID != fixtures.secondSourceRevisionID {
		t.Fatalf("expected source comment revision %q, got %+v", fixtures.secondSourceRevisionID, sourceComments.Items[0])
	}

	revisionComments, err := service.ListSourceRevisionComments(context.Background(), scope, fixtures.secondSourceRevisionID, SourceCommentListQuery{
		Status:     stores.SourceCommentThreadStatusOpen,
		SyncStatus: SourceManagementCommentSyncSynced,
	})
	if err != nil {
		t.Fatalf("ListSourceRevisionComments: %v", err)
	}
	if len(revisionComments.Items) != 1 || len(revisionComments.Items[0].Messages) != 2 {
		t.Fatalf("expected revision-scoped comment thread with two messages, got %+v", revisionComments)
	}
	if !strings.Contains(revisionComments.Items[0].BodyPreview, "Need legal approval") {
		t.Fatalf("expected source comment preview to remain intact, got %+v", revisionComments.Items[0])
	}

	searchResults, err := search.Search(context.Background(), scope, SourceSearchQuery{
		Query:             "Need legal approval",
		ResultKind:        SourceManagementSearchResultSourceRevision,
		CommentSyncStatus: SourceManagementCommentSyncSynced,
		RevisionHint:      "v2",
		HasComments:       boolPtrPhase13(true),
	})
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if len(searchResults.Items) != 1 {
		t.Fatalf("expected one source revision search result, got %+v", searchResults)
	}
	if searchResults.Items[0].Revision == nil || searchResults.Items[0].Revision.ID != fixtures.secondSourceRevisionID {
		t.Fatalf("expected source search result for revision %q, got %+v", fixtures.secondSourceRevisionID, searchResults.Items[0])
	}
	if !searchResults.Items[0].HasComments || searchResults.Items[0].CommentCount != 1 {
		t.Fatalf("expected comment metadata on search result, got %+v", searchResults.Items[0])
	}

	agreementCommentResults, err := search.Search(context.Background(), scope, SourceSearchQuery{
		Query:       "Agreement-only comment",
		HasComments: boolPtrPhase13(true),
	})
	if err != nil {
		t.Fatalf("Search agreement-only comment text: %v", err)
	}
	if len(agreementCommentResults.Items) != 0 {
		t.Fatalf("expected agreement-review comments to stay out of source search index, got %+v", agreementCommentResults.Items)
	}

	agreementThreads, err := store.ListAgreementCommentThreads(context.Background(), scope, fixtures.importedAgreementID, stores.AgreementCommentThreadQuery{ReviewID: review.ID})
	if err != nil {
		t.Fatalf("ListAgreementCommentThreads: %v", err)
	}
	if len(agreementThreads) != 1 {
		t.Fatalf("expected agreement-review thread to remain isolated, got %+v", agreementThreads)
	}
	sourceThreads, err := store.ListSourceCommentThreads(context.Background(), scope, stores.SourceCommentThreadQuery{SourceRevisionID: fixtures.secondSourceRevisionID})
	if err != nil {
		t.Fatalf("ListSourceCommentThreads: %v", err)
	}
	if len(sourceThreads) != 1 {
		t.Fatalf("expected one source comment thread, got %+v", sourceThreads)
	}
}

func TestPhase13SourceManagementReplayReplaysCommentSyncAndReindexesWithoutDuplication(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	now := time.Date(2026, 3, 21, 17, 0, 0, 0, time.UTC)

	search := NewDefaultSourceSearchService(store)
	sync := NewDefaultSourceCommentSyncService(store, WithSourceCommentSyncSearchService(search))
	if _, err := sync.SyncSourceRevisionComments(context.Background(), scope, SourceCommentSyncInput{
		SourceDocumentID: fixtures.sourceDocumentID,
		SourceRevisionID: fixtures.secondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		SyncStatus:       SourceManagementCommentSyncSynced,
		AttemptedAt:      timePtrPhase13(now),
		SyncedAt:         timePtrPhase13(now),
		Threads: []SourceCommentProviderThread{{
			ProviderCommentID: "provider-comment-1",
			ThreadID:          "thread-1",
			Status:            stores.SourceCommentThreadStatusResolved,
			BodyText:          "Replayable source comment",
			Author: SourceCommentProviderAuthor{
				DisplayName: "Source Reviewer",
				Type:        stores.SourceCommentAuthorTypeUser,
			},
			LastActivityAt: timePtrPhase13(now),
			Messages: []SourceCommentProviderMessage{{
				ProviderMessageID: "provider-message-1",
				MessageKind:       stores.SourceCommentMessageKindComment,
				BodyText:          "Replayable source comment",
				CreatedAt:         timePtrPhase13(now),
				UpdatedAt:         timePtrPhase13(now),
			}},
		}},
	}); err != nil {
		t.Fatalf("initial SyncSourceRevisionComments: %v", err)
	}

	replay := NewDefaultSourceManagementReplayService(sync, search)
	if err := store.DeleteSourceSearchDocuments(context.Background(), scope, stores.SourceSearchDocumentQuery{SourceDocumentID: fixtures.sourceDocumentID}); err != nil {
		t.Fatalf("DeleteSourceSearchDocuments: %v", err)
	}

	reindexResult, err := replay.ReindexSourceRevision(context.Background(), scope, fixtures.secondSourceRevisionID)
	if err != nil {
		t.Fatalf("ReindexSourceRevision: %v", err)
	}
	if reindexResult.IndexedCount == 0 || reindexResult.CommentSyncStatus != SourceManagementCommentSyncSynced {
		t.Fatalf("expected replay reindex to rebuild comment-aware search docs, got %+v", reindexResult)
	}

	replayed, err := replay.ReplaySourceRevisionCommentSync(context.Background(), scope, fixtures.secondSourceRevisionID)
	if err != nil {
		t.Fatalf("ReplaySourceRevisionCommentSync: %v", err)
	}
	if replayed.Sync.Status != SourceManagementCommentSyncSynced {
		t.Fatalf("expected replayed sync status synced, got %+v", replayed.Sync)
	}

	threads, err := store.ListSourceCommentThreads(context.Background(), scope, stores.SourceCommentThreadQuery{SourceRevisionID: fixtures.secondSourceRevisionID})
	if err != nil {
		t.Fatalf("ListSourceCommentThreads: %v", err)
	}
	messages, err := store.ListSourceCommentMessages(context.Background(), scope, stores.SourceCommentMessageQuery{SourceRevisionID: fixtures.secondSourceRevisionID})
	if err != nil {
		t.Fatalf("ListSourceCommentMessages: %v", err)
	}
	states, err := store.ListSourceCommentSyncStates(context.Background(), scope, stores.SourceCommentSyncStateQuery{SourceRevisionID: fixtures.secondSourceRevisionID})
	if err != nil {
		t.Fatalf("ListSourceCommentSyncStates: %v", err)
	}
	if len(threads) != 1 || len(messages) != 1 || len(states) != 1 {
		t.Fatalf("expected replay to upsert in place, got threads=%d messages=%d states=%d", len(threads), len(messages), len(states))
	}

	searchResults, err := search.Search(context.Background(), scope, SourceSearchQuery{
		Query:             "Replayable source comment",
		ResultKind:        SourceManagementSearchResultSourceRevision,
		CommentSyncStatus: SourceManagementCommentSyncSynced,
		HasComments:       boolPtrPhase13(true),
	})
	if err != nil {
		t.Fatalf("Search after replay: %v", err)
	}
	if len(searchResults.Items) != 1 || searchResults.Items[0].Revision == nil || searchResults.Items[0].Revision.ID != fixtures.secondSourceRevisionID {
		t.Fatalf("expected replayed search result for %q, got %+v", fixtures.secondSourceRevisionID, searchResults.Items)
	}
}

func timePtrPhase13(value time.Time) *time.Time {
	return &value
}

func boolPtrPhase13(value bool) *bool {
	return &value
}
