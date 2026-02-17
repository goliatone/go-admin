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

type translationReadinessRequirementsCache struct {
	valuesByKey             map[translationReadinessRequirementsCacheKey]translationReadinessRequirementsCacheValue
	availableLocalesByGroup map[string][]string
}

type translationReadinessRequirementsCacheKey struct {
	entityType   string
	policyEntity string
	transition   string
	environment  string
}

type translationReadinessRequirementsCacheValue struct {
	locales []string
	fields  map[string][]string
}

func buildRecordTranslationReadiness(
	ctx context.Context,
	policy TranslationPolicy,
	panelName string,
	record map[string]any,
	filters map[string]any,
) map[string]any {
	return buildRecordTranslationReadinessWithCache(ctx, policy, panelName, record, filters, nil)
}

func buildRecordTranslationReadinessWithCache(
	ctx context.Context,
	policy TranslationPolicy,
	panelName string,
	record map[string]any,
	filters map[string]any,
	cache *translationReadinessRequirementsCache,
) map[string]any {
	if len(record) == 0 {
		return nil
	}
	if !translationReadinessApplicable(panelName, record) {
		return nil
	}

	requiredLocales := []string{}
	requiredFields := map[string][]string{}
	if cache == nil {
		requiredLocales, requiredFields = resolveReadinessRequirements(ctx, policy, panelName, record, filters)
	} else {
		key := translationReadinessRequirementsCacheKey{
			entityType:   strings.ToLower(strings.TrimSpace(panelName)),
			policyEntity: strings.ToLower(strings.TrimSpace(translationPolicyEntity(panelName, record))),
			transition:   translationReadinessTransitionPublish,
			environment:  strings.ToLower(strings.TrimSpace(translationReadinessEnvironment(ctx, filters))),
		}
		if cache.valuesByKey == nil {
			cache.valuesByKey = map[translationReadinessRequirementsCacheKey]translationReadinessRequirementsCacheValue{}
		}
		if cached, ok := cache.valuesByKey[key]; ok {
			requiredLocales = append([]string{}, cached.locales...)
			requiredFields = cloneRequiredFields(cached.fields)
		} else {
			requiredLocales, requiredFields = resolveReadinessRequirements(ctx, policy, panelName, record, filters)
			cache.valuesByKey[key] = translationReadinessRequirementsCacheValue{
				locales: append([]string{}, requiredLocales...),
				fields:  cloneRequiredFields(requiredFields),
			}
		}
	}

	availableLocales := translationReadinessAvailableLocalesWithBatch(record, cache)
	missingLocales := translationReadinessMissingLocales(requiredLocales, availableLocales)
	missingFields := translationReadinessMissingFields(record, requiredFields, availableLocales)
	readinessState := translationReadinessState(missingLocales, missingFields)

	environment := translationReadinessEnvironment(ctx, filters)
	groupID := translationGroupIDFromRecord(record)
	readyForPublish := readinessState == translationReadinessStateReady

	readiness := map[string]any{
		"translation_group_id":              groupID,
		"required_locales":                  requiredLocales,
		"available_locales":                 availableLocales,
		"missing_required_locales":          missingLocales,
		"recommended_locale":                translationReadinessRecommendedLocale(missingLocales, requiredLocales),
		"missing_required_fields_by_locale": missingFields,
		"readiness_state":                   readinessState,
		"ready_for_transition":              map[string]bool{translationReadinessTransitionPublish: readyForPublish},
		"evaluated_environment":             environment,
	}
	if localeMetadata := translationReadinessLocaleMetadata(record); len(localeMetadata) > 0 {
		readiness["locale_metadata"] = localeMetadata
	}
	return readiness
}

func translationReadinessApplicable(panelName string, record map[string]any) bool {
	panelName = strings.ToLower(strings.TrimSpace(panelName))
	switch panelName {
	case "pages", "posts", translationReadinessPolicyEntityFallbackPanels:
		return true
	}
	if translationGroupIDFromRecord(record) != "" {
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
	return translationReadinessAvailableLocalesWithBatch(record, nil)
}

func translationReadinessAvailableLocalesWithBatch(record map[string]any, cache *translationReadinessRequirementsCache) []string {
	locales := translationReadinessLocaleList(normalizedLocaleList(record["available_locales"]))
	if cache != nil && len(cache.availableLocalesByGroup) > 0 {
		if grouped := cache.availableLocalesByGroup[translationReadinessGroupKey(record)]; len(grouped) > 0 {
			locales = append([]string{}, grouped...)
		}
	}
	recordLocale := strings.ToLower(strings.TrimSpace(toString(record["locale"])))
	if recordLocale == "" {
		return locales
	}
	locales = append(locales, recordLocale)
	return translationReadinessLocaleList(locales)
}

func translationReadinessGroupKey(record map[string]any) string {
	return strings.ToLower(strings.TrimSpace(translationGroupIDFromRecord(record)))
}

func translationGroupIDFromRecord(record map[string]any) string {
	if len(record) == 0 {
		return ""
	}
	if groupID := strings.TrimSpace(toString(record["translation_group_id"])); groupID != "" {
		return groupID
	}
	for _, path := range [][]string{
		{"translation", "meta", "translation_group_id"},
		{"content_translation", "meta", "translation_group_id"},
		{"translation_context", "translation_group_id"},
		{"translation_readiness", "translation_group_id"},
	} {
		if groupID := strings.TrimSpace(toString(translationReadinessNestedValue(record, path...))); groupID != "" {
			return groupID
		}
	}
	return ""
}

func translationReadinessNestedValue(record map[string]any, path ...string) any {
	if len(record) == 0 || len(path) == 0 {
		return nil
	}
	cursor := any(record)
	for _, part := range path {
		segment := strings.TrimSpace(part)
		if segment == "" {
			return nil
		}
		m, ok := cursor.(map[string]any)
		if !ok {
			return nil
		}
		next, ok := m[segment]
		if !ok {
			return nil
		}
		cursor = next
	}
	return cursor
}

func translationReadinessBatchAvailableLocales(records []map[string]any) map[string][]string {
	if len(records) == 0 {
		return nil
	}
	grouped := map[string][]string{}
	for _, record := range records {
		key := translationReadinessGroupKey(record)
		if key == "" {
			continue
		}
		combined := append([]string{}, grouped[key]...)
		combined = append(combined, normalizedLocaleList(record["available_locales"])...)
		if locale := strings.TrimSpace(toString(record["locale"])); locale != "" {
			combined = append(combined, locale)
		}
		grouped[key] = translationReadinessLocaleList(combined)
	}
	if len(grouped) == 0 {
		return nil
	}
	return grouped
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

func translationReadinessRecommendedLocale(missingLocales, requiredLocales []string) string {
	missing := translationReadinessLocaleList(missingLocales)
	if len(missing) > 0 {
		return missing[0]
	}
	required := translationReadinessLocaleList(requiredLocales)
	if len(required) > 0 {
		return required[0]
	}
	return ""
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

func translationReadinessLocaleMetadata(record map[string]any) map[string]map[string]any {
	out := map[string]map[string]any{}
	merge := func(locale string, metadata map[string]any) {
		normalizedLocale := strings.ToLower(strings.TrimSpace(locale))
		if normalizedLocale == "" || len(metadata) == 0 {
			return
		}
		cleaned := map[string]any{}
		if updatedBy := strings.TrimSpace(toString(metadata["updated_by"])); updatedBy != "" {
			cleaned["updated_by"] = updatedBy
		}
		if updatedAt := strings.TrimSpace(toString(metadata["updated_at"])); updatedAt != "" {
			cleaned["updated_at"] = updatedAt
		}
		if len(cleaned) == 0 {
			return
		}
		out[normalizedLocale] = cleaned
	}

	for _, key := range []string{"locale_metadata", "translation_locale_metadata"} {
		raw := extractMap(record[key])
		if len(raw) == 0 {
			continue
		}
		for locale, payload := range raw {
			merge(locale, extractMap(payload))
		}
	}

	recordLocale := strings.ToLower(strings.TrimSpace(toString(record["locale"])))
	if recordLocale != "" {
		recordMeta := map[string]any{
			"updated_by": firstNonEmpty(
				toString(record["updated_by"]),
				toString(record["updated_by_id"]),
				toString(record["updated_by_name"]),
			),
			"updated_at": firstNonEmpty(
				toString(record["updated_at"]),
				toString(record["translated_at"]),
				toString(record["last_translated_at"]),
			),
		}
		merge(recordLocale, recordMeta)
	}

	if len(out) == 0 {
		return nil
	}
	return out
}
