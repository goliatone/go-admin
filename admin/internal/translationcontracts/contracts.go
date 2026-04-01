package translationcontracts

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

const (
	QueueContentStateDraft    = "draft"
	QueueContentStateReview   = "review"
	QueueContentStateReady    = "ready"
	QueueContentStateArchived = "archived"
)

const (
	QueueDueStateOverdue = "overdue"
	QueueDueStateSoon    = "due_soon"
	QueueDueStateOnTrack = "on_track"
	QueueDueStateNone    = "none"
)

const (
	SourceTargetDriftKey                  = "source_target_drift"
	SourceTargetDriftSourceHashKey        = "source_hash"
	SourceTargetDriftSourceVersionKey     = "source_version"
	SourceTargetDriftChangedFieldsKey     = "changed_fields"
	SourceTargetDriftChangedSummaryKey    = "changed_fields_summary"
	SourceTargetDriftSummaryCountKey      = "count"
	SourceTargetDriftSummaryFieldsKey     = "fields"
	SourceTargetDriftCurrentSourceHashKey = "current_source_hash"
)

const (
	readinessStateReady                = "ready"
	readinessStateMissingLocales       = "missing_locales"
	readinessStateMissingFields        = "missing_fields"
	readinessStateMissingLocalesFields = "missing_locales_and_fields"
)

const (
	queueStateOpen             = "open"
	queueStateAssigned         = "assigned"
	queueStateInProgress       = "in_progress"
	queueStateInReview         = "in_review"
	queueStateChangesRequested = "changes_requested"
	queueStateApproved         = "approved"
	queueStateArchived         = "archived"
)

const (
	exchangeRowStatusSuccess  = "success"
	exchangeRowStatusError    = "error"
	exchangeRowStatusConflict = "conflict"
	exchangeRowStatusSkipped  = "skipped"
)

const (
	exchangeJobStatusRunning   = "running"
	exchangeJobStatusCompleted = "completed"
	exchangeJobStatusFailed    = "failed"
)

func StatusEnumContract() map[string]any {
	coreReadiness := CoreReadinessStates()
	queueStates := QueueStates()
	queueContentStates := QueueContentStates()
	queueDueStates := QueueDueStates()
	exchangeRowStates := ExchangeRowStates()
	exchangeJobStates := ExchangeJobStates()
	return map[string]any{
		"core": map[string]any{
			"readiness_state": coreReadiness,
		},
		"queue": map[string]any{
			"queue_state":   queueStates,
			"content_state": queueContentStates,
			"due_state":     queueDueStates,
		},
		"exchange": map[string]any{
			"row_status": exchangeRowStates,
			"job_status": exchangeJobStates,
		},
		"all": StatusUnion(
			coreReadiness,
			queueStates,
			queueContentStates,
			queueDueStates,
			exchangeRowStates,
			exchangeJobStates,
		),
	}
}

func SourceTargetDriftContract() map[string]any {
	return map[string]any{
		"key": SourceTargetDriftKey,
		"required_fields": []string{
			SourceTargetDriftSourceHashKey,
			SourceTargetDriftSourceVersionKey,
			SourceTargetDriftChangedSummaryKey,
		},
		"summary_fields": []string{
			SourceTargetDriftSummaryCountKey,
			SourceTargetDriftSummaryFieldsKey,
		},
	}
}

func CoreReadinessStates() []string {
	return []string{
		readinessStateReady,
		readinessStateMissingLocales,
		readinessStateMissingFields,
		readinessStateMissingLocalesFields,
	}
}

func QueueStates() []string {
	return []string{
		queueStateOpen,
		queueStateAssigned,
		queueStateInProgress,
		queueStateInReview,
		queueStateChangesRequested,
		queueStateApproved,
		queueStateArchived,
	}
}

func QueueContentStates() []string {
	return []string{
		QueueContentStateDraft,
		QueueContentStateReview,
		QueueContentStateReady,
		QueueContentStateArchived,
	}
}

func QueueDueStates() []string {
	return []string{
		QueueDueStateOverdue,
		QueueDueStateSoon,
		QueueDueStateOnTrack,
		QueueDueStateNone,
	}
}

func ExchangeRowStates() []string {
	return []string{
		exchangeRowStatusSuccess,
		exchangeRowStatusError,
		exchangeRowStatusConflict,
		exchangeRowStatusSkipped,
	}
}

func ExchangeJobStates() []string {
	return []string{
		exchangeJobStatusRunning,
		exchangeJobStatusCompleted,
		exchangeJobStatusFailed,
	}
}

func StatusUnion(groups ...[]string) []string {
	out := []string{}
	seen := map[string]struct{}{}
	for _, group := range groups {
		for _, raw := range group {
			value := strings.TrimSpace(raw)
			if value == "" {
				continue
			}
			key := strings.ToLower(value)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			out = append(out, value)
		}
	}
	return out
}

func NormalizeReadinessState(state string) string {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case readinessStateReady:
		return readinessStateReady
	case readinessStateMissingLocales:
		return readinessStateMissingLocales
	case readinessStateMissingFields:
		return readinessStateMissingFields
	case readinessStateMissingLocalesFields:
		return readinessStateMissingLocalesFields
	default:
		return readinessStateReady
	}
}

func NormalizeQueueState(state string) string {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case queueStateOpen:
		return queueStateOpen
	case queueStateAssigned:
		return queueStateAssigned
	case queueStateInProgress:
		return queueStateInProgress
	case queueStateInReview:
		return queueStateInReview
	case queueStateChangesRequested:
		return queueStateChangesRequested
	case queueStateApproved:
		return queueStateApproved
	case queueStateArchived:
		return queueStateArchived
	default:
		return queueStateOpen
	}
}

func NormalizeQueueDueState(state string) string {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case QueueDueStateOverdue:
		return QueueDueStateOverdue
	case QueueDueStateSoon:
		return QueueDueStateSoon
	case QueueDueStateOnTrack:
		return QueueDueStateOnTrack
	case QueueDueStateNone:
		return QueueDueStateNone
	default:
		return QueueDueStateNone
	}
}

func NormalizeExchangeRowStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case exchangeRowStatusSuccess:
		return exchangeRowStatusSuccess
	case exchangeRowStatusError:
		return exchangeRowStatusError
	case exchangeRowStatusConflict:
		return exchangeRowStatusConflict
	case exchangeRowStatusSkipped:
		return exchangeRowStatusSkipped
	default:
		return exchangeRowStatusError
	}
}

func NormalizeExchangeJobStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case exchangeJobStatusRunning:
		return exchangeJobStatusRunning
	case exchangeJobStatusCompleted:
		return exchangeJobStatusCompleted
	case exchangeJobStatusFailed:
		return exchangeJobStatusFailed
	default:
		return exchangeJobStatusFailed
	}
}

func ApplySourceTargetDriftContract(record map[string]any) {
	if len(record) == 0 {
		return
	}
	drift := SourceTargetDriftPayload(record)
	if len(drift) == 0 {
		return
	}
	record[SourceTargetDriftKey] = drift
}

func SourceTargetDriftPayload(record map[string]any) map[string]any {
	if len(record) == 0 || !HasSourceTargetDriftInput(record) {
		return nil
	}
	existing := mapFromAny(record[SourceTargetDriftKey])
	sourceHash := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		stringFromAny(existing[SourceTargetDriftSourceHashKey]),
		stringFromAny(record[SourceTargetDriftSourceHashKey]),
		stringFromAny(record[SourceTargetDriftCurrentSourceHashKey]),
	))
	sourceVersion := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		stringFromAny(existing[SourceTargetDriftSourceVersionKey]),
		stringFromAny(record[SourceTargetDriftSourceVersionKey]),
	))

	summary := primitives.CloneAnyMap(mapFromAny(existing[SourceTargetDriftChangedSummaryKey]))
	if len(summary) == 0 {
		summary = primitives.CloneAnyMap(mapFromAny(record[SourceTargetDriftChangedSummaryKey]))
	}
	if summary == nil {
		summary = map[string]any{}
	}

	changedFields := NormalizeDriftFields(
		stringSliceFromAny(existing[SourceTargetDriftChangedFieldsKey]),
		stringSliceFromAny(record[SourceTargetDriftChangedFieldsKey]),
		stringSliceFromAny(record["source_changed_fields"]),
		stringSliceFromAny(summary[SourceTargetDriftSummaryFieldsKey]),
		stringSliceFromAny(summary[SourceTargetDriftChangedFieldsKey]),
	)
	summary[SourceTargetDriftSummaryFieldsKey] = changedFields
	delete(summary, SourceTargetDriftChangedFieldsKey)
	count := max(intFromAny(summary[SourceTargetDriftSummaryCountKey]), len(changedFields))
	summary[SourceTargetDriftSummaryCountKey] = count

	return map[string]any{
		SourceTargetDriftSourceHashKey:     sourceHash,
		SourceTargetDriftSourceVersionKey:  sourceVersion,
		SourceTargetDriftChangedSummaryKey: summary,
	}
}

func HasSourceTargetDriftInput(record map[string]any) bool {
	if len(record) == 0 {
		return false
	}
	if len(mapFromAny(record[SourceTargetDriftKey])) > 0 {
		return true
	}
	if strings.TrimSpace(stringFromAny(record[SourceTargetDriftSourceHashKey])) != "" {
		return true
	}
	if strings.TrimSpace(stringFromAny(record[SourceTargetDriftCurrentSourceHashKey])) != "" {
		return true
	}
	if strings.TrimSpace(stringFromAny(record[SourceTargetDriftSourceVersionKey])) != "" {
		return true
	}
	if len(stringSliceFromAny(record[SourceTargetDriftChangedFieldsKey])) > 0 {
		return true
	}
	if len(stringSliceFromAny(record["source_changed_fields"])) > 0 {
		return true
	}
	return len(mapFromAny(record[SourceTargetDriftChangedSummaryKey])) > 0
}

func NormalizeDriftFields(groups ...[]string) []string {
	out := []string{}
	seen := map[string]struct{}{}
	for _, group := range groups {
		for _, raw := range group {
			field := strings.TrimSpace(raw)
			if field == "" {
				continue
			}
			key := strings.ToLower(field)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			out = append(out, field)
		}
	}
	sort.Strings(out)
	return out
}

func mapFromAny(value any) map[string]any {
	out, _ := value.(map[string]any)
	return out
}

func stringFromAny(value any) string {
	switch v := value.(type) {
	case string:
		return v
	case []byte:
		return string(v)
	case nil:
		return ""
	default:
		return strings.TrimSpace(fmt.Sprint(v))
	}
}

func stringSliceFromAny(value any) []string {
	switch v := value.(type) {
	case []string:
		return append([]string{}, v...)
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if str := strings.TrimSpace(stringFromAny(item)); str != "" {
				out = append(out, str)
			}
		}
		return out
	default:
		return nil
	}
}

func intFromAny(value any) int {
	switch v := value.(type) {
	case int:
		return v
	case int64:
		return int(v)
	case int32:
		return int(v)
	case float64:
		return int(v)
	case float32:
		return int(v)
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(v))
		if err != nil {
			return 0
		}
		return parsed
	default:
		return 0
	}
}

func max(left, right int) int {
	if left > right {
		return left
	}
	return right
}
