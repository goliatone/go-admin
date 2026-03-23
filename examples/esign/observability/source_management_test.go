package observability

import (
	"context"
	"testing"
	"time"

	searchtypes "github.com/goliatone/go-search/pkg/types"
)

func TestSourceManagementMetricsCapturePhase18Signals(t *testing.T) {
	ResetSourceManagementMetrics()

	ctx := context.Background()
	checkedAt := time.Date(2026, 3, 22, 18, 0, 0, 0, time.UTC)
	lastIndexedAt := checkedAt.Add(-2 * time.Minute)

	ObserveSourceCommentSync(ctx, "google_drive", true, "")
	ObserveSourceCommentSync(ctx, "google_drive", false, "google_access_revoked")
	ObserveSourceCommentReplay(ctx, "google_drive", false)
	ObserveSourceQueueBacklog(ctx, 3, map[string]int{
		"medium": 2,
		"high":   1,
	})
	ObserveSourceSearchReindex(ctx, "source_document", true)
	ObserveSourceSearchProviderSnapshot(ctx, searchtypes.HealthStatus{
		Provider:  "memory",
		Healthy:   true,
		CheckedAt: checkedAt,
		Indexes: []searchtypes.IndexHealth{{
			Name:      "esign_source_management",
			Ready:     true,
			Documents: 5,
		}},
	}, searchtypes.StatsResult{
		Provider: "memory",
		Indexes: []searchtypes.IndexStats{{
			Name:           "esign_source_management",
			Documents:      5,
			ProviderStatus: "ready",
			LastIndexedAt:  &lastIndexedAt,
		}},
	})
	ObserveSourceSearchFreshness(ctx, "agreement_title", true)
	ObserveSourceAgreementTitleRefresh(ctx, true)
	ObserveSourceReviewAction(ctx, "merge_source_documents", true)

	snapshot := SourceManagementSnapshot()
	if snapshot.CommentSyncAttemptTotal != 2 || snapshot.CommentSyncSuccessTotal != 1 || snapshot.CommentSyncFailureTotal != 1 {
		t.Fatalf("expected comment sync counters, got %+v", snapshot)
	}
	if snapshot.CommentSyncReplayTotal != 1 || snapshot.CommentSyncReplayFailureTotal != 1 {
		t.Fatalf("expected replay counters, got %+v", snapshot)
	}
	if snapshot.CommentSyncFailureByCode["google_access_revoked"] != 1 {
		t.Fatalf("expected failure code metric, got %+v", snapshot.CommentSyncFailureByCode)
	}
	if snapshot.QueueBacklog != 3 || snapshot.QueueBacklogByBand["medium"] != 2 || snapshot.QueueBacklogByBand["high"] != 1 {
		t.Fatalf("expected queue backlog gauges, got %+v", snapshot)
	}
	if snapshot.SearchReindexTotal != 1 || snapshot.SearchReindexFailureTotal != 0 || snapshot.SearchReindexByTargetKind["source_document"] != 1 {
		t.Fatalf("expected search reindex metrics, got %+v", snapshot)
	}
	if snapshot.SearchProvider != "memory" || !snapshot.SearchHealthy || snapshot.SearchIndexReadyCount != 1 || snapshot.SearchIndexDocumentTotal != 5 {
		t.Fatalf("expected search provider snapshot, got %+v", snapshot)
	}
	if snapshot.SearchProviderStatusByIdx["esign_source_management"] != "ready" {
		t.Fatalf("expected search provider status by index, got %+v", snapshot.SearchProviderStatusByIdx)
	}
	if snapshot.SearchFreshnessSuccessTotal != 1 || snapshot.SearchFreshnessByTrigger["agreement_title"] != 1 {
		t.Fatalf("expected freshness metrics, got %+v", snapshot)
	}
	if snapshot.AgreementTitleRefreshTotal != 1 || snapshot.AgreementTitleRefreshFailureTotal != 0 {
		t.Fatalf("expected agreement title refresh metrics, got %+v", snapshot)
	}
	if snapshot.ReviewActionTotal != 1 || snapshot.ReviewActionFailureTotal != 0 || snapshot.ReviewActionByAction["merge_source_documents"] != 1 {
		t.Fatalf("expected review action metrics, got %+v", snapshot)
	}
}
