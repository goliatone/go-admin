package observability

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"

	gosyncobservability "github.com/goliatone/go-admin/pkg/go-sync/observability"
)

// SyncMetricsSnapshot captures example-level sync telemetry emitted by the embedded go-sync runtime.
type SyncMetricsSnapshot struct {
	ReadSampleTotal      int64            `json:"read_sample_total"`
	ReadSuccessTotal     int64            `json:"read_success_total"`
	ReadFailureTotal     int64            `json:"read_failure_total"`
	MutationSampleTotal  int64            `json:"mutation_sample_total"`
	MutationSuccessTotal int64            `json:"mutation_success_total"`
	MutationFailureTotal int64            `json:"mutation_failure_total"`
	ConflictTotal        int64            `json:"conflict_total"`
	ReplayTotal          int64            `json:"replay_total"`
	RetryTotal           int64            `json:"retry_total"`
	ReadByKind           map[string]int64 `json:"read_by_kind"`
	MutationByOperation  map[string]int64 `json:"mutation_by_operation"`
	ConflictByOperation  map[string]int64 `json:"conflict_by_operation"`
	ReplayByOperation    map[string]int64 `json:"replay_by_operation"`
	RetryByOperation     map[string]int64 `json:"retry_by_operation"`
	RetryByCode          map[string]int64 `json:"retry_by_code"`
}

type syncMetricsState struct {
	mu sync.Mutex

	readSampleTotal      int64
	readSuccessTotal     int64
	readFailureTotal     int64
	mutationSampleTotal  int64
	mutationSuccessTotal int64
	mutationFailureTotal int64
	conflictTotal        int64
	replayTotal          int64
	retryTotal           int64
	readByKind           map[string]int64
	mutationByOperation  map[string]int64
	conflictByOperation  map[string]int64
	replayByOperation    map[string]int64
	retryByOperation     map[string]int64
	retryByCode          map[string]int64
}

func newSyncMetricsState() *syncMetricsState {
	return &syncMetricsState{
		readByKind:          map[string]int64{},
		mutationByOperation: map[string]int64{},
		conflictByOperation: map[string]int64{},
		replayByOperation:   map[string]int64{},
		retryByOperation:    map[string]int64{},
		retryByCode:         map[string]int64{},
	}
}

func (s *syncMetricsState) observeRead(attrs map[string]string, success bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.readSampleTotal++
	if success {
		s.readSuccessTotal++
	} else {
		s.readFailureTotal++
	}
	s.readByKind[normalizeSyncAttr(attrs, "kind", "unknown")]++
}

func (s *syncMetricsState) observeMutation(attrs map[string]string, success bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.mutationSampleTotal++
	if success {
		s.mutationSuccessTotal++
	} else {
		s.mutationFailureTotal++
	}
	s.mutationByOperation[normalizeSyncAttr(attrs, "operation", "unknown")]++
}

func (s *syncMetricsState) incrementConflict(attrs map[string]string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.conflictTotal++
	s.conflictByOperation[normalizeSyncAttr(attrs, "operation", "unknown")]++
}

func (s *syncMetricsState) incrementReplay(attrs map[string]string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.replayTotal++
	s.replayByOperation[normalizeSyncAttr(attrs, "operation", "unknown")]++
}

func (s *syncMetricsState) incrementRetry(attrs map[string]string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.retryTotal++
	s.retryByOperation[normalizeSyncAttr(attrs, "operation", "unknown")]++
	s.retryByCode[normalizeSyncAttr(attrs, "code", "unknown")]++
}

func (s *syncMetricsState) snapshot() SyncMetricsSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	return SyncMetricsSnapshot{
		ReadSampleTotal:      s.readSampleTotal,
		ReadSuccessTotal:     s.readSuccessTotal,
		ReadFailureTotal:     s.readFailureTotal,
		MutationSampleTotal:  s.mutationSampleTotal,
		MutationSuccessTotal: s.mutationSuccessTotal,
		MutationFailureTotal: s.mutationFailureTotal,
		ConflictTotal:        s.conflictTotal,
		ReplayTotal:          s.replayTotal,
		RetryTotal:           s.retryTotal,
		ReadByKind:           cloneInt64Map(s.readByKind),
		MutationByOperation:  cloneInt64Map(s.mutationByOperation),
		ConflictByOperation:  cloneInt64Map(s.conflictByOperation),
		ReplayByOperation:    cloneInt64Map(s.replayByOperation),
		RetryByOperation:     cloneInt64Map(s.retryByOperation),
		RetryByCode:          cloneInt64Map(s.retryByCode),
	}
}

func normalizeSyncAttr(attrs map[string]string, key, fallback string) string {
	if len(attrs) == 0 {
		return fallback
	}
	return normalizeMetricKey(attrs[key], fallback)
}

var (
	defaultSyncMetricsMu sync.RWMutex
	defaultSyncMetrics   = newSyncMetricsState()
)

func currentSyncMetrics() *syncMetricsState {
	defaultSyncMetricsMu.RLock()
	metrics := defaultSyncMetrics
	defaultSyncMetricsMu.RUnlock()
	if metrics == nil {
		return newSyncMetricsState()
	}
	return metrics
}

// ResetSyncMetrics resets package-level sync telemetry to a clean slate.
func ResetSyncMetrics() {
	defaultSyncMetricsMu.Lock()
	defaultSyncMetrics = newSyncMetricsState()
	defaultSyncMetricsMu.Unlock()
}

// SyncSnapshot returns the current example-level sync telemetry read-model.
func SyncSnapshot() SyncMetricsSnapshot {
	return currentSyncMetrics().snapshot()
}

// SyncKernelObserver bridges pkg/go-sync metrics/logging into e-sign observability.
type SyncKernelObserver struct{}

var (
	_ gosyncobservability.Metrics = SyncKernelObserver{}
	_ gosyncobservability.Logger  = SyncKernelObserver{}
)

// NewSyncKernelObserver returns the telemetry adapter used by the example's embedded sync service.
func NewSyncKernelObserver() SyncKernelObserver {
	return SyncKernelObserver{}
}

func (SyncKernelObserver) ObserveRead(ctx context.Context, duration time.Duration, success bool, attrs map[string]string) {
	currentSyncMetrics().observeRead(attrs, success)
	LogOperation(ctx, syncLogLevel(success), "sync", "read", syncOutcome(success), syncCorrelationID(attrs), duration, nil, syncLogFields(attrs, map[string]any{
		"metric":      "esign_sync_read_total",
		"success":     success,
		"duration_ms": duration.Milliseconds(),
	}))
}

func (SyncKernelObserver) ObserveMutation(ctx context.Context, duration time.Duration, success bool, attrs map[string]string) {
	currentSyncMetrics().observeMutation(attrs, success)
	LogOperation(ctx, syncLogLevel(success), "sync", "mutation", syncOutcome(success), syncCorrelationID(attrs), duration, nil, syncLogFields(attrs, map[string]any{
		"metric":      "esign_sync_mutation_total",
		"success":     success,
		"duration_ms": duration.Milliseconds(),
	}))
}

func (SyncKernelObserver) IncrementConflict(ctx context.Context, attrs map[string]string) {
	currentSyncMetrics().incrementConflict(attrs)
	LogOperation(ctx, slog.LevelWarn, "sync", "conflict", "conflict", syncCorrelationID(attrs), 0, nil, syncLogFields(attrs, map[string]any{
		"metric": "esign_sync_conflict_total",
	}))
}

func (SyncKernelObserver) IncrementReplay(ctx context.Context, attrs map[string]string) {
	currentSyncMetrics().incrementReplay(attrs)
	LogOperation(ctx, slog.LevelInfo, "sync", "replay", "replay", syncCorrelationID(attrs), 0, nil, syncLogFields(attrs, map[string]any{
		"metric": "esign_sync_replay_total",
	}))
}

func (SyncKernelObserver) IncrementRetry(ctx context.Context, attrs map[string]string) {
	currentSyncMetrics().incrementRetry(attrs)
	LogOperation(ctx, slog.LevelWarn, "sync", "retry", "retry", syncCorrelationID(attrs), 0, nil, syncLogFields(attrs, map[string]any{
		"metric": "esign_sync_retry_total",
	}))
}

func (SyncKernelObserver) Log(ctx context.Context, level slog.Level, msg string, args ...any) {
	fields := keyValueArgsToMap(args...)
	operation := normalizeSyncOperation(msg, fields)
	outcome := normalizeSyncOutcome(fields)
	correlationID := strings.TrimSpace(toStringValue(fields["correlation_id"]))
	LogOperation(ctx, level, "sync", operation, outcome, correlationID, 0, nil, fields)
}

func syncLogLevel(success bool) slog.Level {
	if success {
		return slog.LevelInfo
	}
	return slog.LevelWarn
}

func syncOutcome(success bool) string {
	if success {
		return "success"
	}
	return "error"
}

func syncCorrelationID(attrs map[string]string) string {
	if len(attrs) == 0 {
		return ""
	}
	return strings.TrimSpace(attrs["correlation_id"])
}

func syncLogFields(attrs map[string]string, extra map[string]any) map[string]any {
	fields := make(map[string]any, len(attrs)+len(extra))
	for key, value := range attrs {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey == "" {
			continue
		}
		fields[trimmedKey] = strings.TrimSpace(value)
	}
	for key, value := range extra {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey == "" {
			continue
		}
		fields[trimmedKey] = value
	}
	return fields
}

func keyValueArgsToMap(args ...any) map[string]any {
	if len(args) == 0 {
		return map[string]any{}
	}
	fields := make(map[string]any, len(args)/2)
	for i := 0; i < len(args); i += 2 {
		key := strings.TrimSpace(toStringValue(args[i]))
		if key == "" {
			continue
		}
		if i+1 < len(args) {
			fields[key] = args[i+1]
		} else {
			fields[key] = ""
		}
	}
	return fields
}

func normalizeSyncOperation(msg string, fields map[string]any) string {
	if event := strings.TrimSpace(toStringValue(fields["event"])); event != "" {
		if trimmed, ok := strings.CutPrefix(event, "go_sync."); ok {
			return normalizeMetricKey(trimmed, "event")
		}
		return normalizeMetricKey(event, "event")
	}
	msg = strings.TrimSpace(strings.ToLower(msg))
	msg = strings.TrimPrefix(msg, "go-sync ")
	msg = strings.ReplaceAll(msg, " ", "_")
	return normalizeMetricKey(msg, "event")
}

func normalizeSyncOutcome(fields map[string]any) string {
	switch {
	case toBoolValue(fields["replay"]):
		return "replay"
	case toBoolValue(fields["pending"]):
		return "retry"
	case toBoolValue(fields["applied"]):
		return "success"
	}
	if code := strings.TrimSpace(toStringValue(fields["error_code"])); code != "" {
		return normalizeMetricKey(code, "error")
	}
	return "info"
}

func toStringValue(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case fmt.Stringer:
		return typed.String()
	case []string:
		copied := append([]string(nil), typed...)
		sort.Strings(copied)
		return strings.Join(copied, ",")
	default:
		return fmt.Sprint(value)
	}
}

func toBoolValue(value any) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		return strings.EqualFold(strings.TrimSpace(typed), "true")
	default:
		return false
	}
}
