package admin

import (
	"context"
	"expvar"
	"strings"
	"time"
)

var (
	translationExchangeRowsProcessedMetric = expvar.NewMap("translation_exchange_rows_processed_total")
	translationExchangeJobDurationMetric   = expvar.NewMap("translation_exchange_job_duration_ms")
	translationExchangeConflictMetric      = expvar.NewMap("translation_exchange_conflicts_total")
)

func recordTranslationExchangeJobMetrics(ctx context.Context, kind, status string, duration time.Duration, rowCount int) {
	tags := map[string]string{
		"kind":   strings.TrimSpace(kind),
		"status": strings.TrimSpace(status),
	}
	if translationExchangeRowsProcessedMetric != nil && rowCount > 0 {
		translationExchangeRowsProcessedMetric.Add(translationMetricTagsKey(tags), int64(rowCount))
	}
	if translationExchangeJobDurationMetric != nil {
		translationExchangeJobDurationMetric.Add(translationMetricTagsKey(tags), duration.Milliseconds())
	}
}

func recordTranslationExchangeValidationDiagnostics(ctx context.Context, kind, format string, result TranslationExchangeResult) {
	tags := map[string]string{
		"kind":   strings.TrimSpace(kind),
		"format": strings.TrimSpace(format),
	}
	for conflictType, count := range result.Summary.ByConflict {
		if translationExchangeConflictMetric != nil && count > 0 {
			conflictTags := map[string]string{
				"kind":          tags["kind"],
				"format":        tags["format"],
				"conflict_type": strings.TrimSpace(conflictType),
			}
			translationExchangeConflictMetric.Add(translationMetricTagsKey(conflictTags), int64(count))
		}
	}
	attrs := []any{
		"event", "translation.exchange.validation.diagnostics",
		"kind", tags["kind"],
		"format", tags["format"],
		"processed", result.Summary.Processed,
		"succeeded", result.Summary.Succeeded,
		"failed", result.Summary.Failed,
		"conflicts", result.Summary.Conflicts,
		"request_id", strings.TrimSpace(requestIDFromContext(ctx)),
		"trace_id", strings.TrimSpace(traceIDFromContext(ctx)),
	}
	if len(result.Summary.ByConflict) > 0 {
		attrs = append(attrs, "by_conflict", result.Summary.ByConflict)
	}
	translationObservabilityContextLogger(ctx).Info("translation exchange validation diagnostics", attrs...)
}
