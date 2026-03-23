package services

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

type recordingSyncSearchService struct {
	reindexRevisionCalls int
	reindexDocumentCalls int
	reindexErr           error
}

func (s *recordingSyncSearchService) Search(context.Context, stores.Scope, SourceSearchQuery) (SourceSearchResults, error) {
	return SourceSearchResults{}, nil
}

func (s *recordingSyncSearchService) ReindexSourceDocument(context.Context, stores.Scope, string) (SourceSearchIndexResult, error) {
	s.reindexDocumentCalls++
	return SourceSearchIndexResult{}, s.reindexErr
}

func (s *recordingSyncSearchService) ReindexSourceRevision(_ context.Context, _ stores.Scope, sourceRevisionID string) (SourceSearchIndexResult, error) {
	s.reindexRevisionCalls++
	return SourceSearchIndexResult{TargetKind: SourceManagementSearchResultSourceRevision, TargetID: sourceRevisionID}, s.reindexErr
}

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
		AttemptedAt:      new(now),
		SyncedAt:         new(now),
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
			LastActivityAt: new(now),
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
					CreatedAt: new(now),
					UpdatedAt: new(now),
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
					CreatedAt: new(now.Add(5 * time.Minute)),
					UpdatedAt: new(now.Add(5 * time.Minute)),
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
	if sourceComments.Revision != nil {
		t.Fatalf("expected source-scoped comment page to avoid claiming a single revision, got %+v", sourceComments.Revision)
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
		HasComments:       new(true),
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
		HasComments: new(true),
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
		AttemptedAt:      new(now),
		SyncedAt:         new(now),
		Threads: []SourceCommentProviderThread{{
			ProviderCommentID: "provider-comment-1",
			ThreadID:          "thread-1",
			Status:            stores.SourceCommentThreadStatusResolved,
			BodyText:          "Replayable source comment",
			Author: SourceCommentProviderAuthor{
				DisplayName: "Source Reviewer",
				Type:        stores.SourceCommentAuthorTypeUser,
			},
			LastActivityAt: new(now),
			Messages: []SourceCommentProviderMessage{{
				ProviderMessageID: "provider-message-1",
				MessageKind:       stores.SourceCommentMessageKindComment,
				BodyText:          "Replayable source comment",
				CreatedAt:         new(now),
				UpdatedAt:         new(now),
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
		HasComments:       new(true),
	})
	if err != nil {
		t.Fatalf("Search after replay: %v", err)
	}
	if len(searchResults.Items) != 1 || searchResults.Items[0].Revision == nil || searchResults.Items[0].Revision.ID != fixtures.secondSourceRevisionID {
		t.Fatalf("expected replayed search result for %q, got %+v", fixtures.secondSourceRevisionID, searchResults.Items)
	}
}

func TestPhase13SourceCommentSyncReindexesOnceAndReturnsSearchRefreshErrors(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	search := &recordingSyncSearchService{reindexErr: fmt.Errorf("search refresh failed")}
	sync := NewDefaultSourceCommentSyncService(store, WithSourceCommentSyncSearchService(search))
	now := time.Date(2026, 3, 21, 17, 30, 0, 0, time.UTC)

	result, err := sync.SyncSourceRevisionComments(context.Background(), scope, SourceCommentSyncInput{
		SourceDocumentID: fixtures.sourceDocumentID,
		SourceRevisionID: fixtures.secondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		SyncStatus:       SourceManagementCommentSyncSynced,
		AttemptedAt:      new(now),
		SyncedAt:         new(now),
		Threads: []SourceCommentProviderThread{{
			ProviderCommentID: "provider-comment-1",
			ThreadID:          "thread-1",
			Status:            stores.SourceCommentThreadStatusOpen,
			BodyText:          "Search refresh failure fixture",
			Messages: []SourceCommentProviderMessage{{
				ProviderMessageID: "provider-message-1",
				MessageKind:       stores.SourceCommentMessageKindComment,
				BodyText:          "Search refresh failure fixture",
				CreatedAt:         new(now),
				UpdatedAt:         new(now),
			}},
		}},
	})
	if err == nil {
		t.Fatal("expected sync to surface search refresh failure")
	}
	if result.SourceRevisionID != fixtures.secondSourceRevisionID || result.Sync.Status != SourceManagementCommentSyncSynced {
		t.Fatalf("expected persisted sync result alongside search error, got result=%+v err=%v", result, err)
	}
	if search.reindexRevisionCalls != 1 || search.reindexDocumentCalls != 0 {
		t.Fatalf("expected exactly one revision reindex attempt, got revision=%d document=%d", search.reindexRevisionCalls, search.reindexDocumentCalls)
	}
}

func TestPhase13SourceCommentSyncFailurePreservesReplayablePayloadAndReplayRecovers(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	sync := NewDefaultSourceCommentSyncService(store)
	now := time.Date(2026, 3, 21, 18, 30, 0, 0, time.UTC)

	if _, err := sync.SyncSourceRevisionComments(context.Background(), scope, SourceCommentSyncInput{
		SourceDocumentID: fixtures.sourceDocumentID,
		SourceRevisionID: fixtures.secondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		SyncStatus:       SourceManagementCommentSyncSynced,
		AttemptedAt:      new(now),
		SyncedAt:         new(now),
		Threads: []SourceCommentProviderThread{{
			ProviderCommentID: "provider-comment-1",
			ThreadID:          "thread-1",
			Status:            stores.SourceCommentThreadStatusResolved,
			BodyText:          "Replay preserved source comment",
			Messages: []SourceCommentProviderMessage{{
				ProviderMessageID: "provider-message-1",
				MessageKind:       stores.SourceCommentMessageKindComment,
				BodyText:          "Replay preserved source comment",
				CreatedAt:         new(now),
				UpdatedAt:         new(now),
			}},
		}},
	}); err != nil {
		t.Fatalf("initial SyncSourceRevisionComments: %v", err)
	}

	if _, err := sync.RecordSourceRevisionCommentSyncFailure(context.Background(), scope, SourceCommentSyncFailureInput{
		SourceDocumentID: fixtures.sourceDocumentID,
		SourceRevisionID: fixtures.secondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		AttemptedAt:      new(now.Add(30 * time.Minute)),
		ErrorCode:        "google_comment_sync_failed",
		ErrorMessage:     "provider temporarily unavailable",
	}); err != nil {
		t.Fatalf("RecordSourceRevisionCommentSyncFailure: %v", err)
	}

	states, err := store.ListSourceCommentSyncStates(context.Background(), scope, stores.SourceCommentSyncStateQuery{
		SourceRevisionID: fixtures.secondSourceRevisionID,
	})
	if err != nil {
		t.Fatalf("ListSourceCommentSyncStates: %v", err)
	}
	if len(states) != 1 || states[0].SyncStatus != SourceManagementCommentSyncFailed || !sourceCommentSyncPayloadReplayable(states[0].PayloadJSON) {
		t.Fatalf("expected failed sync state to preserve replayable payload, got %+v", states)
	}

	replayed, err := sync.ReplaySourceRevisionCommentSync(context.Background(), scope, fixtures.secondSourceRevisionID)
	if err != nil {
		t.Fatalf("ReplaySourceRevisionCommentSync: %v", err)
	}
	if replayed.Sync.Status != SourceManagementCommentSyncSynced || len(replayed.Threads) != 1 {
		t.Fatalf("expected replay to recover from preserved payload, got %+v", replayed)
	}
}

func TestPhase13SourceCommentSyncReplayFailsWhenOnlyFailurePayloadExists(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	sync := NewDefaultSourceCommentSyncService(store)
	now := time.Date(2026, 3, 21, 19, 0, 0, 0, time.UTC)

	if _, err := sync.RecordSourceRevisionCommentSyncFailure(context.Background(), scope, SourceCommentSyncFailureInput{
		SourceDocumentID: fixtures.sourceDocumentID,
		SourceRevisionID: fixtures.secondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		AttemptedAt:      new(now),
		ErrorCode:        "google_comment_sync_failed",
		ErrorMessage:     "provider temporarily unavailable",
	}); err != nil {
		t.Fatalf("RecordSourceRevisionCommentSyncFailure: %v", err)
	}

	if _, err := sync.ReplaySourceRevisionCommentSync(context.Background(), scope, fixtures.secondSourceRevisionID); err == nil {
		t.Fatal("expected replay to fail when no replayable payload exists")
	}
}

func TestPhase13SourceCommentSyncResyncConvergesDeletedThreadsAndMessages(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	now := time.Date(2026, 3, 21, 18, 0, 0, 0, time.UTC)

	search := NewDefaultSourceSearchService(store)
	sync := NewDefaultSourceCommentSyncService(store, WithSourceCommentSyncSearchService(search))
	if _, err := sync.SyncSourceRevisionComments(context.Background(), scope, SourceCommentSyncInput{
		SourceDocumentID: fixtures.sourceDocumentID,
		SourceRevisionID: fixtures.secondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		SyncStatus:       SourceManagementCommentSyncSynced,
		AttemptedAt:      new(now),
		SyncedAt:         new(now),
		Threads: []SourceCommentProviderThread{{
			ProviderCommentID: "provider-comment-1",
			ThreadID:          "thread-1",
			Status:            stores.SourceCommentThreadStatusOpen,
			BodyText:          "Current provider thread",
			Author: SourceCommentProviderAuthor{
				DisplayName: "Source Reviewer",
				Type:        stores.SourceCommentAuthorTypeUser,
			},
			LastActivityAt: new(now),
			Messages: []SourceCommentProviderMessage{
				{
					ProviderMessageID: "provider-message-1",
					MessageKind:       stores.SourceCommentMessageKindComment,
					BodyText:          "Current provider thread",
					CreatedAt:         new(now),
					UpdatedAt:         new(now),
				},
				{
					ProviderMessageID:       "provider-message-2",
					ProviderParentMessageID: "provider-message-1",
					MessageKind:             stores.SourceCommentMessageKindReply,
					BodyText:                "Reply that should disappear",
					CreatedAt:               new(now.Add(time.Minute)),
					UpdatedAt:               new(now.Add(time.Minute)),
				},
			},
		}},
	}); err != nil {
		t.Fatalf("initial SyncSourceRevisionComments: %v", err)
	}

	if _, err := sync.SyncSourceRevisionComments(context.Background(), scope, SourceCommentSyncInput{
		SourceDocumentID: fixtures.sourceDocumentID,
		SourceRevisionID: fixtures.secondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		SyncStatus:       SourceManagementCommentSyncSynced,
		AttemptedAt:      new(now.Add(2 * time.Hour)),
		SyncedAt:         new(now.Add(2 * time.Hour)),
		Threads: []SourceCommentProviderThread{{
			ProviderCommentID: "provider-comment-1",
			ThreadID:          "thread-1",
			Status:            stores.SourceCommentThreadStatusResolved,
			BodyText:          "Current provider thread",
			Author: SourceCommentProviderAuthor{
				DisplayName: "Source Reviewer",
				Type:        stores.SourceCommentAuthorTypeUser,
			},
			LastActivityAt: new(now.Add(2 * time.Hour)),
			Messages: []SourceCommentProviderMessage{{
				ProviderMessageID: "provider-message-1",
				MessageKind:       stores.SourceCommentMessageKindComment,
				BodyText:          "Current provider thread",
				CreatedAt:         new(now),
				UpdatedAt:         new(now.Add(2 * time.Hour)),
			}},
		}},
	}); err != nil {
		t.Fatalf("resync SyncSourceRevisionComments: %v", err)
	}

	activeThreads, err := store.ListSourceCommentThreads(context.Background(), scope, stores.SourceCommentThreadQuery{
		SourceRevisionID: fixtures.secondSourceRevisionID,
	})
	if err != nil {
		t.Fatalf("ListSourceCommentThreads active: %v", err)
	}
	if len(activeThreads) != 1 || activeThreads[0].Status != stores.SourceCommentThreadStatusResolved {
		t.Fatalf("expected one active resolved thread after resync, got %+v", activeThreads)
	}
	activeMessages, err := store.ListSourceCommentMessages(context.Background(), scope, stores.SourceCommentMessageQuery{
		SourceCommentThreadID: activeThreads[0].ID,
	})
	if err != nil {
		t.Fatalf("ListSourceCommentMessages active: %v", err)
	}
	if len(activeMessages) != 1 || activeMessages[0].ProviderMessageID != "provider-message-1" {
		t.Fatalf("expected removed provider reply to be deleted on resync, got %+v", activeMessages)
	}

	if _, err := sync.SyncSourceRevisionComments(context.Background(), scope, SourceCommentSyncInput{
		SourceDocumentID: fixtures.sourceDocumentID,
		SourceRevisionID: fixtures.secondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		SyncStatus:       SourceManagementCommentSyncSynced,
		AttemptedAt:      new(now.Add(4 * time.Hour)),
		SyncedAt:         new(now.Add(4 * time.Hour)),
		Threads:          nil,
	}); err != nil {
		t.Fatalf("deletion SyncSourceRevisionComments: %v", err)
	}

	readModels := NewDefaultSourceReadModelService(store, store, store)
	sourceComments, err := readModels.ListSourceComments(context.Background(), scope, fixtures.sourceDocumentID, SourceCommentListQuery{})
	if err != nil {
		t.Fatalf("ListSourceComments after deletion: %v", err)
	}
	if len(sourceComments.Items) != 0 {
		t.Fatalf("expected deleted provider threads to disappear from default reads, got %+v", sourceComments.Items)
	}
	searchResults, err := search.Search(context.Background(), scope, SourceSearchQuery{
		ResultKind:  SourceManagementSearchResultSourceRevision,
		HasComments: new(true),
	})
	if err != nil {
		t.Fatalf("Search after deletion: %v", err)
	}
	if len(searchResults.Items) != 0 {
		t.Fatalf("expected deleted provider threads to disappear from default search, got %+v", searchResults.Items)
	}

	deletedThreads, err := store.ListSourceCommentThreads(context.Background(), scope, stores.SourceCommentThreadQuery{
		SourceRevisionID: fixtures.secondSourceRevisionID,
		Status:           stores.SourceCommentThreadStatusDeleted,
		IncludeDeleted:   true,
	})
	if err != nil {
		t.Fatalf("ListSourceCommentThreads deleted: %v", err)
	}
	if len(deletedThreads) != 1 {
		t.Fatalf("expected deleted thread history to remain available, got %+v", deletedThreads)
	}
}

func TestPhase13SourceSearchSupportsFilterOnlyQueriesAndRefreshesChangedSources(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	search := NewDefaultSourceSearchService(store)

	initialResults, err := search.Search(context.Background(), scope, SourceSearchQuery{
		Query: "fixture-google-file-2",
	})
	if err != nil {
		t.Fatalf("initial Search: %v", err)
	}
	if len(initialResults.Items) == 0 {
		t.Fatalf("expected initial bootstrap search results, got %+v", initialResults)
	}

	sync := NewDefaultSourceCommentSyncService(store, WithSourceCommentSyncSearchService(search))
	now := time.Date(2026, 3, 21, 19, 0, 0, 0, time.UTC)
	if _, err := sync.SyncSourceRevisionComments(context.Background(), scope, SourceCommentSyncInput{
		SourceDocumentID: fixtures.sourceDocumentID,
		SourceRevisionID: fixtures.secondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		SyncStatus:       SourceManagementCommentSyncSynced,
		AttemptedAt:      new(now),
		SyncedAt:         new(now),
		Threads: []SourceCommentProviderThread{{
			ProviderCommentID: "provider-comment-filter-only",
			ThreadID:          "thread-filter-only",
			Status:            stores.SourceCommentThreadStatusOpen,
			BodyText:          "Searchable thread",
			Author: SourceCommentProviderAuthor{
				DisplayName: "Search Reviewer",
				Type:        stores.SourceCommentAuthorTypeUser,
			},
			LastActivityAt: new(now),
			Messages: []SourceCommentProviderMessage{{
				ProviderMessageID: "provider-message-filter-only",
				MessageKind:       stores.SourceCommentMessageKindComment,
				BodyText:          "Searchable thread",
				CreatedAt:         new(now),
				UpdatedAt:         new(now),
			}},
		}},
	}); err != nil {
		t.Fatalf("SyncSourceRevisionComments for filter-only search: %v", err)
	}

	filterOnlyResults, err := search.Search(context.Background(), scope, SourceSearchQuery{
		ResultKind:        SourceManagementSearchResultSourceRevision,
		CommentSyncStatus: SourceManagementCommentSyncSynced,
		HasComments:       new(true),
	})
	if err != nil {
		t.Fatalf("filter-only Search: %v", err)
	}
	if len(filterOnlyResults.Items) == 0 {
		t.Fatalf("expected filter-only search to return matches, got %+v", filterOnlyResults)
	}

	sourceDocument, err := store.GetSourceDocument(context.Background(), scope, fixtures.sourceDocumentID)
	if err != nil {
		t.Fatalf("GetSourceDocument: %v", err)
	}
	sourceDocument.CanonicalTitle = "Refreshed Search Title"
	sourceDocument.UpdatedAt = time.Now().UTC().Add(time.Hour)
	if _, err := store.SaveSourceDocument(context.Background(), scope, sourceDocument); err != nil {
		t.Fatalf("SaveSourceDocument: %v", err)
	}

	refreshedResults, err := search.Search(context.Background(), scope, SourceSearchQuery{
		Query: "Refreshed Search Title",
	})
	if err != nil {
		t.Fatalf("refreshed Search: %v", err)
	}
	if len(refreshedResults.Items) == 0 {
		t.Fatalf("expected changed source title to trigger index refresh, got %+v", refreshedResults)
	}
}

func TestPhase13SourceSearchRevisionResultsStayPinnedToRevisionHandles(t *testing.T) {
	store, scope, fixtures := seedSourceReadModelFixtures(t)
	search := NewDefaultSourceSearchService(store)

	results, err := search.Search(context.Background(), scope, SourceSearchQuery{
		Query:      "fixture-google-file-1",
		ResultKind: SourceManagementSearchResultSourceRevision,
	})
	if err != nil {
		t.Fatalf("Search first revision handle: %v", err)
	}
	if len(results.Items) != 1 {
		t.Fatalf("expected exactly one first-revision result, got %+v", results.Items)
	}
	item := results.Items[0]
	if item.Revision == nil || item.Revision.ID != fixtures.firstSourceRevisionID {
		t.Fatalf("expected first handle search to resolve first revision %q, got %+v", fixtures.firstSourceRevisionID, item)
	}
	if item.Provider == nil || item.Provider.ExternalFileID != "fixture-google-file-1" {
		t.Fatalf("expected first handle search result to expose first revision provider handle, got %+v", item.Provider)
	}

	activeResults, err := search.Search(context.Background(), scope, SourceSearchQuery{
		Query:      "fixture-google-file-2",
		ResultKind: SourceManagementSearchResultSourceRevision,
	})
	if err != nil {
		t.Fatalf("Search second revision handle: %v", err)
	}
	if len(activeResults.Items) != 1 {
		t.Fatalf("expected exactly one second-revision result, got %+v", activeResults.Items)
	}
	activeItem := activeResults.Items[0]
	if activeItem.Revision == nil || activeItem.Revision.ID != fixtures.secondSourceRevisionID {
		t.Fatalf("expected second handle search to resolve second revision %q, got %+v", fixtures.secondSourceRevisionID, activeItem)
	}
	if activeItem.Provider == nil || activeItem.Provider.ExternalFileID != "fixture-google-file-2" {
		t.Fatalf("expected second handle search result to expose second revision provider handle, got %+v", activeItem.Provider)
	}
}

//go:fix inline
func timePtrPhase13(value time.Time) *time.Time {
	return new(value)
}

//go:fix inline
func boolPtrPhase13(value bool) *bool {
	return new(value)
}
