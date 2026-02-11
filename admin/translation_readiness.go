package admin

import (
	"context"
	"sort"
	"strings"
)

const (
	translationReadinessStateReady                 = "ready"
	translationReadinessStateMissingLocales        = "missing_locales"
	translationReadinessStateMissingFields         = "missing_fields"
	translationReadinessStateMissingLocalesFields  = "missing_locales_and_fields"
	translationReadinessTransitionPublish          = "publish"
	translationReadinessPolicyEntityFallbackPanels = "content"
)

type translationRequirementsProvider interface {
	Requirements(ctx context.Context, input TranslationPolicyInput) (TranslationRequirements, bool, error)
}

func buildRecordTranslationReadiness(
	ctx context.Context,
	policy TranslationPolicy,
	panelName string,
	record map[string]any,
	filters map[string]any,
) map[string]any {
	if len(record) == 0 {
		return nil
	}
	if !translationReadinessApplicable(panelName, record) {
		return nil
	}

	requiredLocales, requiredFields := resolveReadinessRequirements(ctx, policy, panelName, record, filters)
	availableLocales := translationReadinessAvailableLocales(record)
	missingLocales := translationReadinessMissingLocales(requiredLocales, availableLocales)
	missingFields := translationReadinessMissingFields(record, requiredFields, availableLocales)
	readinessState := translationReadinessState(missingLocales, missingFields)

	environment := translationReadinessEnvironment(ctx, filters)
	groupID := strings.TrimSpace(toString(record["translation_group_id"]))
	readyForPublish := readinessState == translationReadinessStateReady

	return map[string]any{
		"translation_group_id":              groupID,
		"required_locales":                  requiredLocales,
		"available_locales":                 availableLocales,
		"missing_required_locales":          missingLocales,
		"missing_required_fields_by_locale": missingFields,
		"readiness_state":                   readinessState,
		"ready_for_transition":              map[string]bool{translationReadinessTransitionPublish: readyForPublish},
		"evaluated_environment":             environment,
	}
}

func translationReadinessApplicable(panelName string, record map[string]any) bool {
	panelName = strings.ToLower(strings.TrimSpace(panelName))
	switch panelName {
	case "pages", "posts", translationReadinessPolicyEntityFallbackPanels:
		return true
	}
	if strings.TrimSpace(toString(record["translation_group_id"])) != "" {
		return true
	}
	if len(normalizedLocaleList(record["available_locales"])) > 0 {
		return true
	}
	return false
}

func resolveReadinessRequirements(
	ctx context.Context,
	policy TranslationPolicy,
	panelName string,
	record map[string]any,
	filters map[string]any,
) ([]string, map[string][]string) {
	requiredLocales := []string{}
	requiredFields := map[string][]string{}
	provider, ok := policy.(translationRequirementsProvider)
	if !ok || provider == nil {
		return requiredLocales, requiredFields
	}
	input := TranslationPolicyInput{
		EntityType:      strings.TrimSpace(panelName),
		EntityID:        strings.TrimSpace(toString(record["id"])),
		Transition:      translationReadinessTransitionPublish,
		Environment:     translationReadinessEnvironment(ctx, filters),
		PolicyEntity:    translationPolicyEntity(panelName, record),
		RequestedLocale: requestedLocaleFromPayload(record, localeFromContext(ctx)),
	}
	req, found, err := provider.Requirements(ctx, input)
	if err != nil || !found {
		return requiredLocales, requiredFields
	}
	requiredLocales = translationReadinessLocaleList(req.Locales)
	if len(requiredLocales) == 0 {
		requiredLocales = translationReadinessLocaleList(translationReadinessRequiredLocalesFromFields(req.RequiredFields))
	}
	if len(req.RequiredFields) > 0 {
		requiredFields = map[string][]string{}
		for locale, fields := range req.RequiredFields {
			normalizedLocale := strings.ToLower(strings.TrimSpace(locale))
			if normalizedLocale == "" {
				continue
			}
			requiredFields[normalizedLocale] = normalizeRequiredFieldNames(fields)
		}
	}
	return requiredLocales, requiredFields
}

func translationPolicyEntity(panelName string, record map[string]any) string {
	if value := strings.TrimSpace(toString(record["policy_entity"])); value != "" {
		return value
	}
	if value := strings.TrimSpace(toString(record["content_type_slug"])); value != "" {
		return value
	}
	if value := strings.TrimSpace(toString(record["content_type"])); value != "" {
		return value
	}
	panel := strings.TrimSpace(panelName)
	if panel == translationReadinessPolicyEntityFallbackPanels {
		if value := strings.TrimSpace(toString(record["panel"])); value != "" {
			return value
		}
	}
	return panel
}

func translationReadinessEnvironment(ctx context.Context, filters map[string]any) string {
	env := environmentFromContext(ctx)
	if len(filters) > 0 {
		env = resolvePolicyEnvironment(filters, env)
	}
	return strings.TrimSpace(env)
}

func translationReadinessLocaleList(locales []string) []string {
	if len(locales) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := []string{}
	for _, locale := range locales {
		normalized := strings.ToLower(strings.TrimSpace(locale))
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	sort.Strings(out)
	return out
}

func translationReadinessAvailableLocales(record map[string]any) []string {
	locales := translationReadinessLocaleList(normalizedLocaleList(record["available_locales"]))
	recordLocale := strings.ToLower(strings.TrimSpace(toString(record["locale"])))
	if recordLocale == "" {
		return locales
	}
	locales = append(locales, recordLocale)
	return translationReadinessLocaleList(locales)
}

func translationReadinessMissingLocales(required, available []string) []string {
	if len(required) == 0 {
		return nil
	}
	availableSet := map[string]struct{}{}
	for _, locale := range translationReadinessLocaleList(available) {
		availableSet[locale] = struct{}{}
	}
	missing := []string{}
	for _, locale := range translationReadinessLocaleList(required) {
		if _, ok := availableSet[locale]; ok {
			continue
		}
		missing = append(missing, locale)
	}
	return translationReadinessLocaleList(missing)
}

func translationReadinessMissingFields(record map[string]any, required map[string][]string, available []string) map[string][]string {
	if len(required) == 0 || len(available) == 0 {
		return map[string][]string{}
	}
	availableSet := map[string]struct{}{}
	for _, locale := range translationReadinessLocaleList(available) {
		availableSet[locale] = struct{}{}
	}
	recordLocale := strings.ToLower(strings.TrimSpace(toString(record["locale"])))
	out := map[string][]string{}
	for locale, fields := range required {
		normalizedLocale := strings.ToLower(strings.TrimSpace(locale))
		if normalizedLocale == "" {
			continue
		}
		if _, ok := availableSet[normalizedLocale]; !ok {
			continue
		}
		// We can only evaluate field-level readiness for the active record locale.
		if recordLocale != "" && !strings.EqualFold(recordLocale, normalizedLocale) {
			continue
		}
		missing := []string{}
		for _, field := range normalizeRequiredFieldNames(fields) {
			if translationReadinessHasFieldValue(record, field) {
				continue
			}
			missing = append(missing, field)
		}
		if len(missing) > 0 {
			out[normalizedLocale] = missing
		}
	}
	if len(out) == 0 {
		return map[string][]string{}
	}
	return out
}

func translationReadinessHasFieldValue(record map[string]any, field string) bool {
	field = strings.TrimSpace(field)
	if field == "" || len(record) == 0 {
		return false
	}
	if value, ok := record[field]; ok && translationReadinessValuePresent(value) {
		return true
	}
	if data := extractMap(record["data"]); len(data) > 0 {
		if value, ok := data[field]; ok && translationReadinessValuePresent(value) {
			return true
		}
	}
	return false
}

func translationReadinessValuePresent(value any) bool {
	switch typed := value.(type) {
	case nil:
		return false
	case string:
		return strings.TrimSpace(typed) != ""
	case []any:
		return len(typed) > 0
	case []string:
		return len(typed) > 0
	default:
		return true
	}
}

func translationReadinessState(missingLocales []string, missingFields map[string][]string) string {
	hasMissingLocales := len(missingLocales) > 0
	hasMissingFields := len(missingFields) > 0
	switch {
	case hasMissingLocales && hasMissingFields:
		return translationReadinessStateMissingLocalesFields
	case hasMissingLocales:
		return translationReadinessStateMissingLocales
	case hasMissingFields:
		return translationReadinessStateMissingFields
	default:
		return translationReadinessStateReady
	}
}

func translationReadinessRequiredLocalesFromFields(fields map[string][]string) []string {
	if len(fields) == 0 {
		return nil
	}
	out := make([]string, 0, len(fields))
	for locale := range fields {
		trimmed := strings.TrimSpace(locale)
		if trimmed == "" {
			continue
		}
		out = append(out, trimmed)
	}
	return out
}
