package admin

import (
	"context"
	"expvar"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strings"
)

const (
	translationBlockedTransitionCountMetric = "admin_translation_blocked_transition_count"
	translationCreateActionCountMetric      = "admin_translation_create_action_count"
	translationCreateLocaleCountMetric      = "admin_translation_create_locale_count"
	translationReviewActionCountMetric      = "admin_translation_review_action_count"
	translationQAOutcomeCountMetric         = "admin_translation_qa_outcome_count"
)

// TranslationMetrics captures counters for translation workflow observability.
type TranslationMetrics interface {
	IncrementBlockedTransition(ctx context.Context, tags map[string]string)
	IncrementCreateAction(ctx context.Context, tags map[string]string)
	IncrementCreateLocaleAction(ctx context.Context, tags map[string]string)
	IncrementReviewAction(ctx context.Context, tags map[string]string)
	IncrementQAOutcome(ctx context.Context, tags map[string]string)
}

var defaultTranslationMetrics TranslationMetrics = &expvarTranslationMetrics{
	blockedTransitions: expvar.NewMap(translationBlockedTransitionCountMetric),
	createActions:      expvar.NewMap(translationCreateActionCountMetric),
	createLocales:      expvar.NewMap(translationCreateLocaleCountMetric),
	reviewActions:      expvar.NewMap(translationReviewActionCountMetric),
	qaOutcomes:         expvar.NewMap(translationQAOutcomeCountMetric),
}

var translationObservabilityLogger = ensureLogger(nil)

func setTranslationObservabilityLogger(logger Logger) {
	translationObservabilityLogger = ensureLogger(logger)
}

func translationObservabilityContextLogger(ctx context.Context) Logger {
	logger := ensureLogger(translationObservabilityLogger)
	if ctx == nil {
		return logger
	}
	if withCtx := logger.WithContext(ctx); withCtx != nil {
		return withCtx
	}
	return logger
}

type expvarTranslationMetrics struct {
	blockedTransitions *expvar.Map
	createActions      *expvar.Map
	createLocales      *expvar.Map
	reviewActions      *expvar.Map
	qaOutcomes         *expvar.Map
}

func (m *expvarTranslationMetrics) IncrementBlockedTransition(_ context.Context, tags map[string]string) {
	if m == nil || m.blockedTransitions == nil {
		return
	}
	m.blockedTransitions.Add(translationMetricTagsKey(tags), 1)
}

func (m *expvarTranslationMetrics) IncrementCreateAction(_ context.Context, tags map[string]string) {
	if m == nil || m.createActions == nil {
		return
	}
	m.createActions.Add(translationMetricTagsKey(tags), 1)
}

func (m *expvarTranslationMetrics) IncrementCreateLocaleAction(_ context.Context, tags map[string]string) {
	if m == nil || m.createLocales == nil {
		return
	}
	m.createLocales.Add(translationMetricTagsKey(tags), 1)
}

func (m *expvarTranslationMetrics) IncrementReviewAction(_ context.Context, tags map[string]string) {
	if m == nil || m.reviewActions == nil {
		return
	}
	m.reviewActions.Add(translationMetricTagsKey(tags), 1)
}

func (m *expvarTranslationMetrics) IncrementQAOutcome(_ context.Context, tags map[string]string) {
	if m == nil || m.qaOutcomes == nil {
		return
	}
	m.qaOutcomes.Add(translationMetricTagsKey(tags), 1)
}

type translationCreateActionEvent struct {
	Entity       string `json:"entity"`
	EntityID     string `json:"entity_id"`
	SourceLocale string `json:"source_locale"`
	Locale       string `json:"locale"`
	Transition   string `json:"transition"`
	Environment  string `json:"environment"`
	Outcome      string `json:"outcome"`
	FamilyID     string `json:"family_id"`
	Err          error  `json:"err"`
}

type translationCreateLocaleEvent struct {
	ContentType string `json:"content_type"`
	FamilyID    string `json:"family_id"`
	Locale      string `json:"locale"`
	Environment string `json:"environment"`
	Outcome     string `json:"outcome"`
	Err         error  `json:"err"`
}

type translationReviewActionEvent struct {
	Action       string `json:"action"`
	Flow         string `json:"flow"`
	AssignmentID string `json:"assignment_id"`
	EntityType   string `json:"entity_type"`
	Locale       string `json:"locale"`
	Environment  string `json:"environment"`
	Outcome      string `json:"outcome"`
	ReasonCode   string `json:"reason_code"`
	Err          error  `json:"err"`
}

type translationQAOutcomeEvent struct {
	Trigger      string `json:"trigger"`
	AssignmentID string `json:"assignment_id"`
	EntityType   string `json:"entity_type"`
	Locale       string `json:"locale"`
	Environment  string `json:"environment"`
	Outcome      string `json:"outcome"`
	WarningCount int    `json:"warning_count"`
	BlockerCount int    `json:"blocker_count"`
}

func recordTranslationBlockedTransitionMetric(ctx context.Context, input TranslationPolicyInput, missing MissingTranslationsError) {
	if defaultTranslationMetrics == nil {
		return
	}
	tags := map[string]string{
		"entity":     primitives.FirstNonEmptyRaw(normalizePolicyEntityKey(input.PolicyEntity), normalizePolicyEntityKey(input.EntityType), normalizePolicyEntityKey(missing.PolicyEntity), normalizePolicyEntityKey(missing.EntityType), "unknown"),
		"locale":     primitives.FirstNonEmptyRaw(strings.TrimSpace(input.RequestedLocale), strings.TrimSpace(missing.RequestedLocale), "unknown"),
		"transition": primitives.FirstNonEmptyRaw(strings.TrimSpace(input.Transition), strings.TrimSpace(missing.Transition), "unknown"),
		"channel":    primitives.FirstNonEmptyRaw(strings.TrimSpace(input.Environment), strings.TrimSpace(missing.Environment), "unknown"),
	}
	defaultTranslationMetrics.IncrementBlockedTransition(ctx, tags)
	logTranslationBlockedTransition(ctx, input, missing, tags["entity"], tags["locale"], tags["transition"], tags["channel"])
}

func recordTranslationCreateActionMetric(ctx context.Context, event translationCreateActionEvent) {
	if defaultTranslationMetrics == nil {
		return
	}
	tags := map[string]string{
		"entity":     primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Entity), "unknown"),
		"locale":     primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Locale), "unknown"),
		"transition": primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Transition), "create_translation"),
		"channel":    primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Environment), "unknown"),
		"outcome":    primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Outcome), "unknown"),
	}
	defaultTranslationMetrics.IncrementCreateAction(ctx, tags)
	logTranslationCreateAction(ctx, event, tags)
}

func recordTranslationCreateLocaleMetric(ctx context.Context, event translationCreateLocaleEvent) {
	if defaultTranslationMetrics == nil {
		return
	}
	tags := map[string]string{
		"content_type": strings.TrimSpace(event.ContentType),
		"locale":       primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Locale), "unknown"),
		"channel":      primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Environment), "unknown"),
		"outcome":      primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Outcome), "unknown"),
	}
	defaultTranslationMetrics.IncrementCreateLocaleAction(ctx, tags)
	logTranslationCreateLocale(ctx, event, tags)
}

func recordTranslationReviewActionMetric(ctx context.Context, event translationReviewActionEvent) {
	if defaultTranslationMetrics == nil {
		return
	}
	tags := map[string]string{
		"action":      primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Action), "unknown"),
		"flow":        primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Flow), strings.TrimSpace(event.Action), "unknown"),
		"entity_type": primitives.FirstNonEmptyRaw(strings.TrimSpace(event.EntityType), "unknown"),
		"locale":      primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Locale), "unknown"),
		"channel":     primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Environment), "unknown"),
		"outcome":     primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Outcome), "unknown"),
	}
	if strings.TrimSpace(event.ReasonCode) != "" {
		tags["reason_code"] = strings.TrimSpace(event.ReasonCode)
	}
	defaultTranslationMetrics.IncrementReviewAction(ctx, tags)
	logTranslationReviewAction(ctx, event, tags)
}

func recordTranslationQAOutcomeMetric(ctx context.Context, event translationQAOutcomeEvent) {
	if defaultTranslationMetrics == nil {
		return
	}
	tags := map[string]string{
		"trigger":     primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Trigger), "unknown"),
		"entity_type": primitives.FirstNonEmptyRaw(strings.TrimSpace(event.EntityType), "unknown"),
		"locale":      primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Locale), "unknown"),
		"channel":     primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Environment), "unknown"),
		"outcome":     primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Outcome), "unknown"),
	}
	defaultTranslationMetrics.IncrementQAOutcome(ctx, tags)
	logTranslationQAOutcome(ctx, event, tags)
}

func translationMetricTagsKey(tags map[string]string) string {
	if len(tags) == 0 {
		return "total"
	}
	keys := make([]string, 0, len(tags))
	for key := range tags {
		if strings.TrimSpace(key) == "" {
			continue
		}
		keys = append(keys, key)
	}
	if len(keys) == 0 {
		return "total"
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		value := sanitizeMetricTag(tags[key])
		if value == "" {
			value = "unknown"
		}
		parts = append(parts, key+"="+value)
	}
	return strings.Join(parts, ",")
}

func sanitizeMetricTag(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	value = strings.ReplaceAll(value, ",", "_")
	value = strings.ReplaceAll(value, "=", "_")
	return value
}

func logTranslationBlockedTransition(ctx context.Context, input TranslationPolicyInput, missing MissingTranslationsError, entity, locale, transition, channel string) {
	logger := translationObservabilityContextLogger(ctx)
	attrs := []any{
		"event", "translation.transition.blocked",
		"entity", entity,
		"entity_id", primitives.FirstNonEmptyRaw(strings.TrimSpace(input.EntityID), strings.TrimSpace(missing.EntityID), "unknown"),
		"transition", transition,
		"locale", locale,
		"channel", channel,
		"missing_locales", normalizeLocaleList(missing.MissingLocales),
	}
	if fields := normalizeMissingFieldsByLocale(missing.MissingFieldsByLocale); len(fields) > 0 {
		attrs = append(attrs, "missing_fields_by_locale", fields)
	}
	logger.Warn("translation workflow transition blocked", attrs...)
}

func logTranslationCreateAction(ctx context.Context, event translationCreateActionEvent, tags map[string]string) {
	logger := translationObservabilityContextLogger(ctx)
	attrs := []any{
		"event", "translation.remediation.action",
		"action", tags["transition"],
		"outcome", tags["outcome"],
		"entity", tags["entity"],
		"entity_id", primitives.FirstNonEmptyRaw(strings.TrimSpace(event.EntityID), "unknown"),
		"source_locale", primitives.FirstNonEmptyRaw(strings.TrimSpace(event.SourceLocale), "unknown"),
		"target_locale", tags["locale"],
		"channel", tags["channel"],
		"family_id", primitives.FirstNonEmptyRaw(strings.TrimSpace(event.FamilyID), "unknown"),
	}
	if event.Err != nil {
		attrs = append(attrs, "error", event.Err.Error())
		logger.Warn("translation remediation action failed", attrs...)
		return
	}
	logger.Info("translation remediation action handled", attrs...)
}

func logTranslationCreateLocale(ctx context.Context, event translationCreateLocaleEvent, tags map[string]string) {
	logger := translationObservabilityContextLogger(ctx)
	attrs := []any{
		"event", "translation.family.create_locale",
		"outcome", tags["outcome"],
		"content_type", primitives.FirstNonEmptyRaw(tags["content_type"], "unknown"),
		"family_id", primitives.FirstNonEmptyRaw(strings.TrimSpace(event.FamilyID), "unknown"),
		"target_locale", tags["locale"],
		"channel", tags["channel"],
		"request_id", strings.TrimSpace(requestIDFromContext(ctx)),
		"trace_id", strings.TrimSpace(traceIDFromContext(ctx)),
	}
	if event.Err != nil {
		attrs = append(attrs, "error", event.Err.Error())
		logger.Warn("translation family create-locale failed", attrs...)
		return
	}
	logger.Info("translation family create-locale handled", attrs...)
}

func logTranslationReviewAction(ctx context.Context, event translationReviewActionEvent, tags map[string]string) {
	logger := translationObservabilityContextLogger(ctx)
	attrs := []any{
		"event", "translation.review.action",
		"action", tags["action"],
		"flow", tags["flow"],
		"outcome", tags["outcome"],
		"assignment_id", primitives.FirstNonEmptyRaw(strings.TrimSpace(event.AssignmentID), "unknown"),
		"entity_type", tags["entity_type"],
		"target_locale", tags["locale"],
		"channel", tags["channel"],
		"request_id", strings.TrimSpace(requestIDFromContext(ctx)),
		"trace_id", strings.TrimSpace(traceIDFromContext(ctx)),
	}
	if strings.TrimSpace(event.ReasonCode) != "" {
		attrs = append(attrs, "reason_code", strings.TrimSpace(event.ReasonCode))
	}
	if event.Err != nil {
		attrs = append(attrs, "error", event.Err.Error())
		logger.Warn("translation review action failed", attrs...)
		return
	}
	logger.Info("translation review action handled", attrs...)
}

func logTranslationQAOutcome(ctx context.Context, event translationQAOutcomeEvent, tags map[string]string) {
	logger := translationObservabilityContextLogger(ctx)
	attrs := []any{
		"event", "translation.qa.outcome",
		"trigger", tags["trigger"],
		"outcome", tags["outcome"],
		"assignment_id", primitives.FirstNonEmptyRaw(strings.TrimSpace(event.AssignmentID), "unknown"),
		"entity_type", tags["entity_type"],
		"target_locale", tags["locale"],
		"channel", tags["channel"],
		"warning_count", event.WarningCount,
		"blocker_count", event.BlockerCount,
		"request_id", strings.TrimSpace(requestIDFromContext(ctx)),
		"trace_id", strings.TrimSpace(traceIDFromContext(ctx)),
	}
	logger.Info("translation qa outcome recorded", attrs...)
}
