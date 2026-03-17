package admin

import (
	"context"
	"errors"
	"expvar"
	"log/slog"
	"maps"
	"sync"
	"testing"

	router "github.com/goliatone/go-router"
)

type capturingTranslationMetrics struct {
	blockedTags      []map[string]string
	createTags       []map[string]string
	createLocaleTags []map[string]string
	reviewActionTags []map[string]string
	qaOutcomeTags    []map[string]string
}

func (m *capturingTranslationMetrics) IncrementBlockedTransition(_ context.Context, tags map[string]string) {
	m.blockedTags = append(m.blockedTags, cloneTagsMap(tags))
}

func (m *capturingTranslationMetrics) IncrementCreateAction(_ context.Context, tags map[string]string) {
	m.createTags = append(m.createTags, cloneTagsMap(tags))
}

func (m *capturingTranslationMetrics) IncrementCreateLocaleAction(_ context.Context, tags map[string]string) {
	m.createLocaleTags = append(m.createLocaleTags, cloneTagsMap(tags))
}

func (m *capturingTranslationMetrics) IncrementReviewAction(_ context.Context, tags map[string]string) {
	m.reviewActionTags = append(m.reviewActionTags, cloneTagsMap(tags))
}

func (m *capturingTranslationMetrics) IncrementQAOutcome(_ context.Context, tags map[string]string) {
	m.qaOutcomeTags = append(m.qaOutcomeTags, cloneTagsMap(tags))
}

func TestApplyTranslationPolicyRecordsBlockedTransitionMetric(t *testing.T) {
	metrics := &capturingTranslationMetrics{}
	original := defaultTranslationMetrics
	originalLogger := translationObservabilityLogger
	logCapture := &capturingSlogHandler{}
	defaultTranslationMetrics = metrics
	translationObservabilityLogger = slog.New(logCapture)
	t.Cleanup(func() {
		defaultTranslationMetrics = original
		translationObservabilityLogger = originalLogger
	})

	err := applyTranslationPolicy(context.Background(), TranslationPolicyFunc(func(_ context.Context, input TranslationPolicyInput) error {
		return MissingTranslationsError{
			EntityType:      input.EntityType,
			PolicyEntity:    input.PolicyEntity,
			EntityID:        input.EntityID,
			Transition:      input.Transition,
			Environment:     input.Environment,
			RequestedLocale: input.RequestedLocale,
			MissingLocales:  []string{"es"},
		}
	}), TranslationPolicyInput{
		EntityType:      "pages",
		EntityID:        "page_123",
		Transition:      "publish",
		Environment:     "production",
		PolicyEntity:    "pages",
		RequestedLocale: "en",
	})
	if !errors.Is(err, ErrMissingTranslations) {
		t.Fatalf("expected missing translations error, got %v", err)
	}
	if len(metrics.blockedTags) != 1 {
		t.Fatalf("expected exactly one blocked transition metric, got %d", len(metrics.blockedTags))
	}
	tags := metrics.blockedTags[0]
	if tags["entity"] != "pages" {
		t.Fatalf("expected entity=pages, got %q", tags["entity"])
	}
	if tags["locale"] != "en" {
		t.Fatalf("expected locale=en, got %q", tags["locale"])
	}
	if tags["transition"] != "publish" {
		t.Fatalf("expected transition=publish, got %q", tags["transition"])
	}
	if tags["environment"] != "production" {
		t.Fatalf("expected environment=production, got %q", tags["environment"])
	}
	records := logCapture.Records()
	if len(records) != 1 {
		t.Fatalf("expected one blocker log entry, got %d", len(records))
	}
	attrs := slogRecordAttrs(records[0])
	if attrs["event"] != "translation.transition.blocked" {
		t.Fatalf("expected blocker event tag, got %+v", attrs)
	}
	if attrs["entity"] != "pages" || attrs["transition"] != "publish" || attrs["locale"] != "en" || attrs["environment"] != "production" {
		t.Fatalf("unexpected blocker log attrs: %+v", attrs)
	}
}

func TestPanelBindingCreateTranslationRecordsMetricOutcomes(t *testing.T) {
	t.Run("created", func(t *testing.T) {
		metrics := &capturingTranslationMetrics{}
		original := defaultTranslationMetrics
		originalLogger := translationObservabilityLogger
		logCapture := &capturingSlogHandler{}
		defaultTranslationMetrics = metrics
		translationObservabilityLogger = slog.New(logCapture)
		t.Cleanup(func() {
			defaultTranslationMetrics = original
			translationObservabilityLogger = originalLogger
		})

		repo := &translationActionRepoStub{
			records: map[string]map[string]any{
				"page_123": {
					"id":                "page_123",
					"locale":            "en",
					"family_id":         "tg_123",
					"available_locales": []string{"en"},
				},
			},
		}
		panel := &Panel{name: "pages", repo: repo}
		binding := &panelBinding{
			admin: &Admin{config: Config{DefaultLocale: "en"}},
			name:  "pages",
			panel: panel,
		}
		c := router.NewMockContext()
		c.On("Context").Return(context.Background())
		c.On("IP").Return("").Maybe()

		_, err := binding.Action(c, "en", "create_translation", map[string]any{
			"id":          "page_123",
			"locale":      "es",
			"environment": "production",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(metrics.createTags) != 1 {
			t.Fatalf("expected one create metric, got %d", len(metrics.createTags))
		}
		tags := metrics.createTags[0]
		if tags["entity"] != "pages" || tags["locale"] != "es" || tags["transition"] != "create_translation" || tags["environment"] != "production" || tags["outcome"] != "created" {
			t.Fatalf("unexpected create metric tags: %+v", tags)
		}
		records := logCapture.Records()
		if len(records) != 1 {
			t.Fatalf("expected one create log entry, got %d", len(records))
		}
		attrs := slogRecordAttrs(records[0])
		if attrs["event"] != "translation.remediation.action" || attrs["outcome"] != "created" || attrs["target_locale"] != "es" {
			t.Fatalf("unexpected create log attrs: %+v", attrs)
		}
	})

	t.Run("duplicate", func(t *testing.T) {
		metrics := &capturingTranslationMetrics{}
		original := defaultTranslationMetrics
		originalLogger := translationObservabilityLogger
		logCapture := &capturingSlogHandler{}
		defaultTranslationMetrics = metrics
		translationObservabilityLogger = slog.New(logCapture)
		t.Cleanup(func() {
			defaultTranslationMetrics = original
			translationObservabilityLogger = originalLogger
		})

		repo := &translationActionRepoStub{
			records: map[string]map[string]any{
				"page_123": {
					"id":                "page_123",
					"locale":            "en",
					"family_id":         "tg_123",
					"available_locales": []string{"en", "es"},
				},
			},
		}
		panel := &Panel{name: "pages", repo: repo}
		binding := &panelBinding{
			admin: &Admin{config: Config{DefaultLocale: "en"}},
			name:  "pages",
			panel: panel,
		}
		c := router.NewMockContext()
		c.On("Context").Return(context.Background())
		c.On("IP").Return("").Maybe()

		_, err := binding.Action(c, "en", "create_translation", map[string]any{
			"id":          "page_123",
			"locale":      "es",
			"environment": "staging",
		})
		if err == nil {
			t.Fatalf("expected duplicate error")
		}
		if len(metrics.createTags) != 1 {
			t.Fatalf("expected one create metric, got %d", len(metrics.createTags))
		}
		tags := metrics.createTags[0]
		if tags["entity"] != "pages" || tags["locale"] != "es" || tags["transition"] != "create_translation" || tags["environment"] != "staging" || tags["outcome"] != "duplicate" {
			t.Fatalf("unexpected duplicate metric tags: %+v", tags)
		}
		records := logCapture.Records()
		if len(records) != 1 {
			t.Fatalf("expected one duplicate log entry, got %d", len(records))
		}
		attrs := slogRecordAttrs(records[0])
		if attrs["event"] != "translation.remediation.action" || attrs["outcome"] != "duplicate" || attrs["target_locale"] != "es" {
			t.Fatalf("unexpected duplicate log attrs: %+v", attrs)
		}
	})
}

func TestRecordTranslationCreateLocaleMetricCapturesOutcomesAndTraceContext(t *testing.T) {
	metrics := &capturingTranslationMetrics{}
	original := defaultTranslationMetrics
	originalLogger := translationObservabilityLogger
	logCapture := &capturingSlogHandler{}
	defaultTranslationMetrics = metrics
	translationObservabilityLogger = slog.New(logCapture)
	t.Cleanup(func() {
		defaultTranslationMetrics = original
		translationObservabilityLogger = originalLogger
	})

	ctx := context.Background()
	ctx = context.WithValue(ctx, requestIDContextKey, "req-create-locale-1")
	ctx = context.WithValue(ctx, traceIDContextKey, "trace-create-locale-1")

	recordTranslationCreateLocaleMetric(ctx, translationCreateLocaleEvent{
		ContentType: "pages",
		FamilyID:    "tg-page-1",
		Locale:      "fr",
		Environment: "production",
		Outcome:     "success",
	})
	recordTranslationCreateLocaleMetric(ctx, translationCreateLocaleEvent{
		ContentType: "pages",
		FamilyID:    "tg-page-1",
		Locale:      "fr",
		Environment: "production",
		Outcome:     "duplicate",
		Err:         errors.New("translation already exists"),
	})

	if len(metrics.createLocaleTags) != 2 {
		t.Fatalf("expected two create-locale metric events, got %d", len(metrics.createLocaleTags))
	}
	if metrics.createLocaleTags[0]["outcome"] != "success" || metrics.createLocaleTags[0]["content_type"] != "pages" {
		t.Fatalf("unexpected success metric tags: %+v", metrics.createLocaleTags[0])
	}
	if metrics.createLocaleTags[1]["outcome"] != "duplicate" {
		t.Fatalf("unexpected duplicate metric tags: %+v", metrics.createLocaleTags[1])
	}

	records := logCapture.Records()
	if len(records) != 2 {
		t.Fatalf("expected two create-locale log entries, got %d", len(records))
	}
	firstAttrs := slogRecordAttrs(records[0])
	if firstAttrs["event"] != "translation.family.create_locale" || firstAttrs["outcome"] != "success" {
		t.Fatalf("unexpected create-locale log attrs: %+v", firstAttrs)
	}
	if firstAttrs["request_id"] != "req-create-locale-1" || firstAttrs["trace_id"] != "trace-create-locale-1" {
		t.Fatalf("expected request/trace ids on create-locale log, got %+v", firstAttrs)
	}
	secondAttrs := slogRecordAttrs(records[1])
	if secondAttrs["outcome"] != "duplicate" || secondAttrs["target_locale"] != "fr" {
		t.Fatalf("unexpected duplicate create-locale attrs: %+v", secondAttrs)
	}
}

func cloneTagsMap(values map[string]string) map[string]string {
	if len(values) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(values))
	maps.Copy(out, values)
	return out
}

func TestRecordTranslationAPIOperationLogsTraceCorrelation(t *testing.T) {
	originalLogger := translationObservabilityLogger
	logCapture := &capturingSlogHandler{}
	translationObservabilityLogger = slog.New(logCapture)
	originalMetrics := translationAPIObservabilityMetrics
	translationAPIObservabilityMetrics = expvar.NewMap("test_translation_api_operation_count")
	t.Cleanup(func() {
		translationObservabilityLogger = originalLogger
		translationAPIObservabilityMetrics = originalMetrics
	})

	ctx := context.Background()
	ctx = context.WithValue(ctx, requestIDContextKey, "req-telemetry-1")
	ctx = context.WithValue(ctx, traceIDContextKey, "trace-telemetry-1")
	ctx = context.WithValue(ctx, tenantIDContextKey, "tenant-1")
	ctx = context.WithValue(ctx, orgIDContextKey, "org-1")

	recordTranslationAPIOperation(ctx, translationAPIObservation{
		Operation: "translations.queue.list",
		Kind:      "read",
		RequestID: requestIDFromContext(ctx),
		TraceID:   traceIDFromContext(ctx),
		TenantID:  tenantIDFromContext(ctx),
		OrgID:     orgIDFromContext(ctx),
	})

	records := logCapture.Records()
	if len(records) != 1 {
		t.Fatalf("expected one api operation log entry, got %d", len(records))
	}
	attrs := slogRecordAttrs(records[0])
	if attrs["event"] != "translation.api.operation" {
		t.Fatalf("expected api operation event, got %+v", attrs)
	}
	if attrs["request_id"] != "req-telemetry-1" || attrs["trace_id"] != "trace-telemetry-1" {
		t.Fatalf("expected request/trace correlation attrs, got %+v", attrs)
	}
}

func TestRecordTranslationReviewActionMetricCapturesApproveAndRequestChanges(t *testing.T) {
	metrics := &capturingTranslationMetrics{}
	original := defaultTranslationMetrics
	originalLogger := translationObservabilityLogger
	logCapture := &capturingSlogHandler{}
	defaultTranslationMetrics = metrics
	translationObservabilityLogger = slog.New(logCapture)
	t.Cleanup(func() {
		defaultTranslationMetrics = original
		translationObservabilityLogger = originalLogger
	})

	ctx := context.Background()
	ctx = context.WithValue(ctx, requestIDContextKey, "req-review-1")
	ctx = context.WithValue(ctx, traceIDContextKey, "trace-review-1")

	recordTranslationReviewActionMetric(ctx, translationReviewActionEvent{
		Action:       "approve",
		Flow:         "approve",
		AssignmentID: "asg-review-1",
		EntityType:   "pages",
		Locale:       "fr",
		Environment:  "production",
		Outcome:      "success",
	})
	recordTranslationReviewActionMetric(ctx, translationReviewActionEvent{
		Action:       "reject",
		Flow:         "request_changes",
		AssignmentID: "asg-review-2",
		EntityType:   "pages",
		Locale:       "fr",
		Environment:  "production",
		Outcome:      "error",
		Err:          errors.New("reviewer guard"),
	})

	if len(metrics.reviewActionTags) != 2 {
		t.Fatalf("expected two review action metrics, got %d", len(metrics.reviewActionTags))
	}
	if metrics.reviewActionTags[0]["action"] != "approve" || metrics.reviewActionTags[0]["flow"] != "approve" || metrics.reviewActionTags[0]["outcome"] != "success" {
		t.Fatalf("unexpected approve review metric tags: %+v", metrics.reviewActionTags[0])
	}
	if metrics.reviewActionTags[1]["action"] != "reject" || metrics.reviewActionTags[1]["flow"] != "request_changes" || metrics.reviewActionTags[1]["outcome"] != "error" {
		t.Fatalf("unexpected request-changes review metric tags: %+v", metrics.reviewActionTags[1])
	}

	records := logCapture.Records()
	if len(records) != 2 {
		t.Fatalf("expected two review action log entries, got %d", len(records))
	}
	firstAttrs := slogRecordAttrs(records[0])
	if firstAttrs["event"] != "translation.review.action" || firstAttrs["flow"] != "approve" || firstAttrs["request_id"] != "req-review-1" {
		t.Fatalf("unexpected approve review log attrs: %+v", firstAttrs)
	}
	secondAttrs := slogRecordAttrs(records[1])
	if secondAttrs["flow"] != "request_changes" || secondAttrs["outcome"] != "error" || secondAttrs["trace_id"] != "trace-review-1" {
		t.Fatalf("unexpected request-changes review log attrs: %+v", secondAttrs)
	}
}

func TestRecordTranslationQAOutcomeMetricCapturesSaveAndSubmitStates(t *testing.T) {
	metrics := &capturingTranslationMetrics{}
	original := defaultTranslationMetrics
	originalLogger := translationObservabilityLogger
	logCapture := &capturingSlogHandler{}
	defaultTranslationMetrics = metrics
	translationObservabilityLogger = slog.New(logCapture)
	t.Cleanup(func() {
		defaultTranslationMetrics = original
		translationObservabilityLogger = originalLogger
	})

	ctx := context.Background()
	ctx = context.WithValue(ctx, requestIDContextKey, "req-qa-1")
	ctx = context.WithValue(ctx, traceIDContextKey, "trace-qa-1")

	recordTranslationQAOutcomeMetric(ctx, translationQAOutcomeEvent{
		Trigger:      "save",
		AssignmentID: "asg-editor-1",
		EntityType:   "pages",
		Locale:       "fr",
		Environment:  "production",
		Outcome:      "warnings",
		WarningCount: 2,
	})
	recordTranslationQAOutcomeMetric(ctx, translationQAOutcomeEvent{
		Trigger:      "submit_review",
		AssignmentID: "asg-editor-1",
		EntityType:   "pages",
		Locale:       "fr",
		Environment:  "production",
		Outcome:      "blocked",
		WarningCount: 1,
		BlockerCount: 2,
	})

	if len(metrics.qaOutcomeTags) != 2 {
		t.Fatalf("expected two qa outcome metrics, got %d", len(metrics.qaOutcomeTags))
	}
	if metrics.qaOutcomeTags[0]["trigger"] != "save" || metrics.qaOutcomeTags[0]["outcome"] != "warnings" {
		t.Fatalf("unexpected save qa metric tags: %+v", metrics.qaOutcomeTags[0])
	}
	if metrics.qaOutcomeTags[1]["trigger"] != "submit_review" || metrics.qaOutcomeTags[1]["outcome"] != "blocked" {
		t.Fatalf("unexpected submit qa metric tags: %+v", metrics.qaOutcomeTags[1])
	}

	records := logCapture.Records()
	if len(records) != 2 {
		t.Fatalf("expected two qa outcome log entries, got %d", len(records))
	}
	firstAttrs := slogRecordAttrs(records[0])
	if firstAttrs["event"] != "translation.qa.outcome" || firstAttrs["warning_count"] != int64(2) {
		t.Fatalf("unexpected save qa log attrs: %+v", firstAttrs)
	}
	secondAttrs := slogRecordAttrs(records[1])
	if secondAttrs["trigger"] != "submit_review" || secondAttrs["blocker_count"] != int64(2) || secondAttrs["request_id"] != "req-qa-1" {
		t.Fatalf("unexpected submit qa log attrs: %+v", secondAttrs)
	}
}

type capturingSlogHandler struct {
	mu      sync.Mutex
	records []slog.Record
}

func (h *capturingSlogHandler) Enabled(context.Context, slog.Level) bool {
	return true
}

func (h *capturingSlogHandler) Handle(_ context.Context, record slog.Record) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.records = append(h.records, record.Clone())
	return nil
}

func (h *capturingSlogHandler) WithAttrs(_ []slog.Attr) slog.Handler {
	return h
}

func (h *capturingSlogHandler) WithGroup(string) slog.Handler {
	return h
}

func (h *capturingSlogHandler) Records() []slog.Record {
	h.mu.Lock()
	defer h.mu.Unlock()
	out := make([]slog.Record, len(h.records))
	copy(out, h.records)
	return out
}

func slogRecordAttrs(record slog.Record) map[string]any {
	attrs := map[string]any{}
	record.Attrs(func(attr slog.Attr) bool {
		attrs[attr.Key] = attr.Value.Any()
		return true
	})
	return attrs
}
