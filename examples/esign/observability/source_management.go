package observability

import (
	"context"
	"log/slog"
	"strings"
	"sync"
	"time"

	searchtypes "github.com/goliatone/go-search/pkg/types"
)

// SourceManagementMetricsSnapshot captures Phase 18 source-management telemetry.
type SourceManagementMetricsSnapshot struct {
	CommentSyncAttemptTotal       int64            `json:"comment_sync_attempt_total"`
	CommentSyncSuccessTotal       int64            `json:"comment_sync_success_total"`
	CommentSyncFailureTotal       int64            `json:"comment_sync_failure_total"`
	CommentSyncReplayTotal        int64            `json:"comment_sync_replay_total"`
	CommentSyncReplayFailureTotal int64            `json:"comment_sync_replay_failure_total"`
	CommentSyncByProvider         map[string]int64 `json:"comment_sync_by_provider"`
	CommentSyncFailureByCode      map[string]int64 `json:"comment_sync_failure_by_code"`

	QueueBacklog       int64            `json:"queue_backlog"`
	QueueBacklogByBand map[string]int64 `json:"queue_backlog_by_band"`

	SearchReindexTotal        int64            `json:"search_reindex_total"`
	SearchReindexFailureTotal int64            `json:"search_reindex_failure_total"`
	SearchReindexByTargetKind map[string]int64 `json:"search_reindex_by_target_kind"`

	SearchProvider            string            `json:"search_provider"`
	SearchHealthy             bool              `json:"search_healthy"`
	SearchCheckedAt           *time.Time        `json:"search_checked_at,omitempty"`
	SearchIndexReadyCount     int64             `json:"search_index_ready_count"`
	SearchIndexDocumentTotal  int64             `json:"search_index_document_total"`
	SearchProviderStatusByIdx map[string]string `json:"search_provider_status_by_index"`

	SearchFreshnessSuccessTotal int64            `json:"search_freshness_success_total"`
	SearchFreshnessFailureTotal int64            `json:"search_freshness_failure_total"`
	SearchFreshnessByTrigger    map[string]int64 `json:"search_freshness_by_trigger"`

	AgreementTitleRefreshTotal        int64 `json:"agreement_title_refresh_total"`
	AgreementTitleRefreshFailureTotal int64 `json:"agreement_title_refresh_failure_total"`

	ReviewActionTotal        int64            `json:"review_action_total"`
	ReviewActionFailureTotal int64            `json:"review_action_failure_total"`
	ReviewActionByAction     map[string]int64 `json:"review_action_by_action"`
}

type sourceManagementMetricsState struct {
	mu sync.Mutex

	commentSyncAttemptTotal       int64
	commentSyncSuccessTotal       int64
	commentSyncFailureTotal       int64
	commentSyncReplayTotal        int64
	commentSyncReplayFailureTotal int64
	commentSyncByProvider         map[string]int64
	commentSyncFailureByCode      map[string]int64

	queueBacklog       int64
	queueBacklogByBand map[string]int64

	searchReindexTotal        int64
	searchReindexFailureTotal int64
	searchReindexByTargetKind map[string]int64

	searchProvider            string
	searchHealthy             bool
	searchCheckedAt           *time.Time
	searchIndexReadyCount     int64
	searchIndexDocumentTotal  int64
	searchProviderStatusByIdx map[string]string

	searchFreshnessSuccessTotal int64
	searchFreshnessFailureTotal int64
	searchFreshnessByTrigger    map[string]int64

	agreementTitleRefreshTotal        int64
	agreementTitleRefreshFailureTotal int64

	reviewActionTotal        int64
	reviewActionFailureTotal int64
	reviewActionByAction     map[string]int64
}

func newSourceManagementMetricsState() *sourceManagementMetricsState {
	return &sourceManagementMetricsState{
		commentSyncByProvider:     map[string]int64{},
		commentSyncFailureByCode:  map[string]int64{},
		queueBacklogByBand:        map[string]int64{},
		searchReindexByTargetKind: map[string]int64{},
		searchProviderStatusByIdx: map[string]string{},
		searchFreshnessByTrigger:  map[string]int64{},
		reviewActionByAction:      map[string]int64{},
	}
}

func (s *sourceManagementMetricsState) snapshot() SourceManagementMetricsSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	return SourceManagementMetricsSnapshot{
		CommentSyncAttemptTotal:       s.commentSyncAttemptTotal,
		CommentSyncSuccessTotal:       s.commentSyncSuccessTotal,
		CommentSyncFailureTotal:       s.commentSyncFailureTotal,
		CommentSyncReplayTotal:        s.commentSyncReplayTotal,
		CommentSyncReplayFailureTotal: s.commentSyncReplayFailureTotal,
		CommentSyncByProvider:         cloneInt64Map(s.commentSyncByProvider),
		CommentSyncFailureByCode:      cloneInt64Map(s.commentSyncFailureByCode),
		QueueBacklog:                  s.queueBacklog,
		QueueBacklogByBand:            cloneInt64Map(s.queueBacklogByBand),
		SearchReindexTotal:            s.searchReindexTotal,
		SearchReindexFailureTotal:     s.searchReindexFailureTotal,
		SearchReindexByTargetKind:     cloneInt64Map(s.searchReindexByTargetKind),
		SearchProvider:                s.searchProvider,
		SearchHealthy:                 s.searchHealthy,
		SearchCheckedAt:               cloneSourceManagementTimePtr(s.searchCheckedAt),
		SearchIndexReadyCount:         s.searchIndexReadyCount,
		SearchIndexDocumentTotal:      s.searchIndexDocumentTotal,
		SearchProviderStatusByIdx:     cloneStringMap(s.searchProviderStatusByIdx),
		SearchFreshnessSuccessTotal:   s.searchFreshnessSuccessTotal,
		SearchFreshnessFailureTotal:   s.searchFreshnessFailureTotal,
		SearchFreshnessByTrigger:      cloneInt64Map(s.searchFreshnessByTrigger),
		AgreementTitleRefreshTotal:    s.agreementTitleRefreshTotal,
		AgreementTitleRefreshFailureTotal: s.agreementTitleRefreshFailureTotal,
		ReviewActionTotal:                 s.reviewActionTotal,
		ReviewActionFailureTotal:          s.reviewActionFailureTotal,
		ReviewActionByAction:              cloneInt64Map(s.reviewActionByAction),
	}
}

func (s *sourceManagementMetricsState) observeCommentSync(provider string, success bool, failureCode string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.commentSyncAttemptTotal++
	s.commentSyncByProvider[normalizeMetricKey(provider, "unknown")]++
	if success {
		s.commentSyncSuccessTotal++
		return
	}
	s.commentSyncFailureTotal++
	s.commentSyncFailureByCode[normalizeMetricKey(failureCode, "unknown")]++
}

func (s *sourceManagementMetricsState) observeCommentReplay(provider string, success bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.commentSyncReplayTotal++
	s.commentSyncByProvider[normalizeMetricKey(provider, "unknown")]++
	if !success {
		s.commentSyncReplayFailureTotal++
	}
}

func (s *sourceManagementMetricsState) observeQueueBacklog(total int, byBand map[string]int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.queueBacklog = int64(max(0, total))
	s.queueBacklogByBand = map[string]int64{}
	for band, count := range byBand {
		s.queueBacklogByBand[normalizeMetricKey(band, "unknown")] = int64(max(0, count))
	}
}

func (s *sourceManagementMetricsState) observeSearchReindex(targetKind string, success bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.searchReindexTotal++
	s.searchReindexByTargetKind[normalizeMetricKey(targetKind, "unknown")]++
	if !success {
		s.searchReindexFailureTotal++
	}
}

func (s *sourceManagementMetricsState) observeSearchProviderSnapshot(health searchtypes.HealthStatus, stats searchtypes.StatsResult) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.searchProvider = strings.TrimSpace(firstNonEmptyString(stats.Provider, health.Provider))
	s.searchHealthy = health.Healthy
	if !health.CheckedAt.IsZero() {
		checkedAt := health.CheckedAt.UTC()
		s.searchCheckedAt = &checkedAt
	}
	readyCount := int64(0)
	documentTotal := int64(0)
	statusByIndex := map[string]string{}
	for _, idx := range stats.Indexes {
		name := strings.TrimSpace(idx.Name)
		if name == "" {
			continue
		}
		statusByIndex[name] = normalizeMetricKey(idx.ProviderStatus, "unknown")
		documentTotal += int64(max(0, idx.Documents))
		if strings.EqualFold(strings.TrimSpace(idx.ProviderStatus), "ready") {
			readyCount++
		}
	}
	if len(statusByIndex) == 0 {
		for _, idx := range health.Indexes {
			name := strings.TrimSpace(idx.Name)
			if name == "" {
				continue
			}
			if idx.Ready {
				statusByIndex[name] = "ready"
				readyCount++
			} else {
				statusByIndex[name] = "not_ready"
			}
			documentTotal += int64(max(0, idx.Documents))
		}
	}
	s.searchIndexReadyCount = readyCount
	s.searchIndexDocumentTotal = documentTotal
	s.searchProviderStatusByIdx = statusByIndex
}

func (s *sourceManagementMetricsState) observeSearchFreshness(trigger string, success bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.searchFreshnessByTrigger[normalizeMetricKey(trigger, "unknown")]++
	if success {
		s.searchFreshnessSuccessTotal++
		return
	}
	s.searchFreshnessFailureTotal++
}

func (s *sourceManagementMetricsState) observeAgreementTitleRefresh(success bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.agreementTitleRefreshTotal++
	if !success {
		s.agreementTitleRefreshFailureTotal++
	}
}

func (s *sourceManagementMetricsState) observeReviewAction(action string, success bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.reviewActionTotal++
	s.reviewActionByAction[normalizeMetricKey(action, "unknown")]++
	if !success {
		s.reviewActionFailureTotal++
	}
}

func cloneSourceManagementTimePtr(value *time.Time) *time.Time {
	if value == nil || value.IsZero() {
		return nil
	}
	cloned := value.UTC()
	return &cloned
}

func cloneStringMap(values map[string]string) map[string]string {
	if len(values) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(values))
	for key, value := range values {
		out[key] = value
	}
	return out
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

var (
	defaultSourceManagementMetricsMu sync.RWMutex
	defaultSourceManagementMetrics   = newSourceManagementMetricsState()
)

func currentSourceManagementMetrics() *sourceManagementMetricsState {
	defaultSourceManagementMetricsMu.RLock()
	metrics := defaultSourceManagementMetrics
	defaultSourceManagementMetricsMu.RUnlock()
	if metrics == nil {
		return newSourceManagementMetricsState()
	}
	return metrics
}

// ResetSourceManagementMetrics resets package-level source-management telemetry.
func ResetSourceManagementMetrics() {
	defaultSourceManagementMetricsMu.Lock()
	defaultSourceManagementMetrics = newSourceManagementMetricsState()
	defaultSourceManagementMetricsMu.Unlock()
}

// SourceManagementSnapshot returns the current source-management telemetry read-model.
func SourceManagementSnapshot() SourceManagementMetricsSnapshot {
	return currentSourceManagementMetrics().snapshot()
}

func ObserveSourceCommentSync(ctx context.Context, provider string, success bool, failureCode string) {
	currentSourceManagementMetrics().observeCommentSync(provider, success, failureCode)
	LogOperation(ctx, sourceManagementLogLevel(success), "source_management", "comment_sync", sourceManagementOutcome(success), "", 0, nil, map[string]any{
		"provider":     normalizeMetricKey(provider, "unknown"),
		"failure_code": normalizeMetricKey(failureCode, "unknown"),
	})
}

func ObserveSourceCommentReplay(ctx context.Context, provider string, success bool) {
	currentSourceManagementMetrics().observeCommentReplay(provider, success)
	LogOperation(ctx, sourceManagementLogLevel(success), "source_management", "comment_replay", sourceManagementOutcome(success), "", 0, nil, map[string]any{
		"provider": normalizeMetricKey(provider, "unknown"),
	})
}

func ObserveSourceQueueBacklog(ctx context.Context, total int, byBand map[string]int) {
	currentSourceManagementMetrics().observeQueueBacklog(total, byBand)
	LogOperation(ctx, sourceManagementLogLevel(true), "source_management", "queue_backlog", "observed", "", 0, nil, map[string]any{
		"total": total,
	})
}

func ObserveSourceSearchReindex(ctx context.Context, targetKind string, success bool) {
	currentSourceManagementMetrics().observeSearchReindex(targetKind, success)
	LogOperation(ctx, sourceManagementLogLevel(success), "source_management", "search_reindex", sourceManagementOutcome(success), "", 0, nil, map[string]any{
		"target_kind": normalizeMetricKey(targetKind, "unknown"),
	})
}

func ObserveSourceSearchProviderSnapshot(ctx context.Context, health searchtypes.HealthStatus, stats searchtypes.StatsResult) {
	currentSourceManagementMetrics().observeSearchProviderSnapshot(health, stats)
	LogOperation(ctx, sourceManagementLogLevel(health.Healthy), "source_management", "search_provider_snapshot", sourceManagementOutcome(health.Healthy), "", 0, nil, map[string]any{
		"provider": strings.TrimSpace(firstNonEmptyString(stats.Provider, health.Provider)),
		"healthy":  health.Healthy,
		"indexes":  len(stats.Indexes),
	})
}

func ObserveSourceSearchFreshness(ctx context.Context, trigger string, success bool) {
	currentSourceManagementMetrics().observeSearchFreshness(trigger, success)
	LogOperation(ctx, sourceManagementLogLevel(success), "source_management", "search_freshness", sourceManagementOutcome(success), "", 0, nil, map[string]any{
		"trigger": normalizeMetricKey(trigger, "unknown"),
	})
}

func ObserveSourceAgreementTitleRefresh(ctx context.Context, success bool) {
	currentSourceManagementMetrics().observeAgreementTitleRefresh(success)
	LogOperation(ctx, sourceManagementLogLevel(success), "source_management", "agreement_title_refresh", sourceManagementOutcome(success), "", 0, nil, nil)
}

func ObserveSourceReviewAction(ctx context.Context, action string, success bool) {
	currentSourceManagementMetrics().observeReviewAction(action, success)
	LogOperation(ctx, sourceManagementLogLevel(success), "source_management", "review_action", sourceManagementOutcome(success), "", 0, nil, map[string]any{
		"action": normalizeMetricKey(action, "unknown"),
	})
}

func sourceManagementLogLevel(success bool) slog.Level {
	if success {
		return slog.LevelInfo
	}
	return slog.LevelWarn
}

func sourceManagementOutcome(success bool) string {
	if success {
		return "success"
	}
	return "error"
}
