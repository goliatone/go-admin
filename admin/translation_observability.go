package admin

import (
	"context"
	"expvar"
	"github.com/goliatone/go-admin/internal/primitives"
	"log/slog"
	"sort"
	"strings"
)

const (
	translationBlockedTransitionCountMetric = "admin_translation_blocked_transition_count"
	translationCreateActionCountMetric      = "admin_translation_create_action_count"
)

// TranslationMetrics captures counters for translation workflow observability.
type TranslationMetrics interface {
	IncrementBlockedTransition(ctx context.Context, tags map[string]string)
	IncrementCreateAction(ctx context.Context, tags map[string]string)
}

var defaultTranslationMetrics TranslationMetrics = &expvarTranslationMetrics{
	blockedTransitions: expvar.NewMap(translationBlockedTransitionCountMetric),
	createActions:      expvar.NewMap(translationCreateActionCountMetric),
}

var translationObservabilityLogger = slog.Default()

type expvarTranslationMetrics struct {
	blockedTransitions *expvar.Map
	createActions      *expvar.Map
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

type translationCreateActionEvent struct {
	Entity             string
	EntityID           string
	SourceLocale       string
	Locale             string
	Transition         string
	Environment        string
	Outcome            string
	TranslationGroupID string
	Err                error
}

func recordTranslationBlockedTransitionMetric(ctx context.Context, input TranslationPolicyInput, missing MissingTranslationsError) {
	if defaultTranslationMetrics == nil {
		return
	}
	tags := map[string]string{
		"entity":      primitives.FirstNonEmptyRaw(normalizePolicyEntityKey(input.PolicyEntity), normalizePolicyEntityKey(input.EntityType), normalizePolicyEntityKey(missing.PolicyEntity), normalizePolicyEntityKey(missing.EntityType), "unknown"),
		"locale":      primitives.FirstNonEmptyRaw(strings.TrimSpace(input.RequestedLocale), strings.TrimSpace(missing.RequestedLocale), "unknown"),
		"transition":  primitives.FirstNonEmptyRaw(strings.TrimSpace(input.Transition), strings.TrimSpace(missing.Transition), "unknown"),
		"environment": primitives.FirstNonEmptyRaw(strings.TrimSpace(input.Environment), strings.TrimSpace(missing.Environment), "unknown"),
	}
	defaultTranslationMetrics.IncrementBlockedTransition(ctx, tags)
	logTranslationBlockedTransition(ctx, input, missing, tags["entity"], tags["locale"], tags["transition"], tags["environment"])
}

func recordTranslationCreateActionMetric(ctx context.Context, event translationCreateActionEvent) {
	if defaultTranslationMetrics == nil {
		return
	}
	tags := map[string]string{
		"entity":      primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Entity), "unknown"),
		"locale":      primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Locale), "unknown"),
		"transition":  primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Transition), "create_translation"),
		"environment": primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Environment), "unknown"),
		"outcome":     primitives.FirstNonEmptyRaw(strings.TrimSpace(event.Outcome), "unknown"),
	}
	defaultTranslationMetrics.IncrementCreateAction(ctx, tags)
	logTranslationCreateAction(ctx, event, tags)
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

func logTranslationBlockedTransition(ctx context.Context, input TranslationPolicyInput, missing MissingTranslationsError, entity, locale, transition, environment string) {
	logger := translationObservabilityLogger
	if logger == nil {
		return
	}
	attrs := []any{
		"event", "translation.transition.blocked",
		"entity", entity,
		"entity_id", primitives.FirstNonEmptyRaw(strings.TrimSpace(input.EntityID), strings.TrimSpace(missing.EntityID), "unknown"),
		"transition", transition,
		"locale", locale,
		"environment", environment,
		"missing_locales", normalizeLocaleList(missing.MissingLocales),
	}
	if fields := normalizeMissingFieldsByLocale(missing.MissingFieldsByLocale); len(fields) > 0 {
		attrs = append(attrs, "missing_fields_by_locale", fields)
	}
	logger.WarnContext(ctx, "translation workflow transition blocked", attrs...)
}

func logTranslationCreateAction(ctx context.Context, event translationCreateActionEvent, tags map[string]string) {
	logger := translationObservabilityLogger
	if logger == nil {
		return
	}
	attrs := []any{
		"event", "translation.remediation.action",
		"action", tags["transition"],
		"outcome", tags["outcome"],
		"entity", tags["entity"],
		"entity_id", primitives.FirstNonEmptyRaw(strings.TrimSpace(event.EntityID), "unknown"),
		"source_locale", primitives.FirstNonEmptyRaw(strings.TrimSpace(event.SourceLocale), "unknown"),
		"target_locale", tags["locale"],
		"environment", tags["environment"],
		"translation_group_id", primitives.FirstNonEmptyRaw(strings.TrimSpace(event.TranslationGroupID), "unknown"),
	}
	if event.Err != nil {
		attrs = append(attrs, "error", event.Err.Error())
		logger.WarnContext(ctx, "translation remediation action failed", attrs...)
		return
	}
	logger.InfoContext(ctx, "translation remediation action handled", attrs...)
}
