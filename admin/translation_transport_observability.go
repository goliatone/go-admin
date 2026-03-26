package admin

import (
	"context"
	"expvar"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
)

const translationAPIOperationCountMetric = "admin_translation_api_operation_count"

var translationAPIObservabilityMetrics = expvar.NewMap(translationAPIOperationCountMetric)

type translationAPIObservation struct {
	Operation string        `json:"operation"`
	Kind      string        `json:"kind"`
	RequestID string        `json:"request_id"`
	TraceID   string        `json:"trace_id"`
	TenantID  string        `json:"tenant_id"`
	OrgID     string        `json:"org_id"`
	Duration  time.Duration `json:"duration"`
	Err       error         `json:"err"`
}

func setTranslationTraceHeaders(c router.Context, ctx context.Context) {
	if c == nil || ctx == nil {
		return
	}
	if requestID := strings.TrimSpace(requestIDFromContext(ctx)); requestID != "" {
		c.SetHeader("X-Request-ID", requestID)
	}
	if correlationID := strings.TrimSpace(correlationIDFromContext(ctx)); correlationID != "" {
		c.SetHeader("X-Correlation-ID", correlationID)
	}
	if traceID := strings.TrimSpace(traceIDFromContext(ctx)); traceID != "" {
		c.SetHeader("X-Trace-ID", traceID)
	}
}

func recordTranslationAPIOperation(ctx context.Context, observation translationAPIObservation) {
	tags := map[string]string{
		"operation":  strings.TrimSpace(observation.Operation),
		"kind":       strings.TrimSpace(observation.Kind),
		"outcome":    "ok",
		"tenant_id":  strings.TrimSpace(observation.TenantID),
		"org_id":     strings.TrimSpace(observation.OrgID),
		"request_id": strings.TrimSpace(observation.RequestID),
		"trace_id":   strings.TrimSpace(observation.TraceID),
	}
	levelWarn := false
	if observation.Err != nil {
		tags["outcome"] = "error"
		levelWarn = true
	}
	if translationAPIObservabilityMetrics != nil {
		translationAPIObservabilityMetrics.Add(translationMetricTagsKey(tags), 1)
	}
	attrs := []any{
		"event", "translation.api.operation",
		"operation", tags["operation"],
		"kind", tags["kind"],
		"outcome", tags["outcome"],
		"duration_ms", observation.Duration.Milliseconds(),
		"tenant_id", tags["tenant_id"],
		"org_id", tags["org_id"],
		"request_id", tags["request_id"],
		"trace_id", tags["trace_id"],
	}
	if observation.Err != nil {
		attrs = append(attrs, "error", observation.Err.Error())
	}
	logger := translationObservabilityContextLogger(ctx)
	if levelWarn {
		logger.Warn("translation api operation", attrs...)
		return
	}
	logger.Info("translation api operation", attrs...)
}
