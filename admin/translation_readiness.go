package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"slices"
	"sort"
	"strings"

	"github.com/jinzhu/inflection"

	translationcore "github.com/goliatone/go-admin/translations/core"
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
	policyEntityLookupByKey map[string]string
}

type translationReadinessRequirementsCacheKey struct {
	entityType   string
	policyEntity string
	transition   string
	environment  string
}

type translationReadinessRequirementsCacheValue struct {
	locales          []string
	fields           map[string][]string
	resolved         bool
	defaultWorkScope string
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
	environment := translationReadinessEnvironment(ctx, filters)
	environmentKey := strings.ToLower(strings.TrimSpace(environment))

	requiredLocales := []string{}
	requiredFields := map[string][]string{}
	requirementsResolved := false
	requirements := TranslationRequirements{}
	if cache == nil {
		requiredLocales, requiredFields, requirementsResolved, requirements = resolveReadinessRequirements(ctx, policy, panelName, record, filters)
	} else {
		key := translationReadinessRequirementsCacheKey{
			entityType:   strings.ToLower(strings.TrimSpace(panelName)),
			policyEntity: translationReadinessPolicyEntityLookupKeyCached(translationPolicyEntity(panelName, record), cache),
			transition:   translationReadinessTransitionPublish,
			environment:  environmentKey,
		}
		if cache.valuesByKey == nil {
			cache.valuesByKey = map[translationReadinessRequirementsCacheKey]translationReadinessRequirementsCacheValue{}
		}
		if cached, ok := cache.valuesByKey[key]; ok {
			requiredLocales = append([]string{}, cached.locales...)
			requiredFields = cloneRequiredFields(cached.fields)
			requirementsResolved = cached.resolved
			requirements.DefaultWorkScope = cached.defaultWorkScope
		} else {
			requiredLocales, requiredFields, requirementsResolved, requirements = resolveReadinessRequirements(ctx, policy, panelName, record, filters)
			cache.valuesByKey[key] = translationReadinessRequirementsCacheValue{
				locales:          append([]string{}, requiredLocales...),
				fields:           cloneRequiredFields(requiredFields),
				resolved:         requirementsResolved,
				defaultWorkScope: strings.TrimSpace(requirements.DefaultWorkScope),
			}
		}
	}
	if !translationReadinessApplicable(record, requirementsResolved) {
		return nil
	}

	availableLocales := translationReadinessAvailableLocalesWithBatch(record, cache)
	missingLocales := translationReadinessMissingLocales(requiredLocales, availableLocales)
	missingFields := translationReadinessMissingFields(record, requiredFields, availableLocales)
	readinessState := translationReadinessState(missingLocales, missingFields)

	groupID := translationFamilyIDFromRecord(record)
	readyForPublish := readinessState == translationReadinessStateReady

	readiness := map[string]any{
		"family_id":                         groupID,
		"required_locales":                  requiredLocales,
		"available_locales":                 availableLocales,
		"missing_required_locales":          missingLocales,
		"recommended_locale":                translationReadinessRecommendedLocale(missingLocales, requiredLocales),
		"missing_required_fields_by_locale": missingFields,
		"readiness_state":                   readinessState,
		"ready_for_transition":              map[string]bool{translationReadinessTransitionPublish: readyForPublish},
		"evaluated_channel":                 environment,
		"requirements_resolved":             requirementsResolved,
	}
	quickCreate := translationReadinessQuickCreatePayload(record, requiredLocales, missingLocales, requirements, requirementsResolved)
	readiness["missing_locales"] = append([]string{}, quickCreate.MissingLocales...)
	readiness["recommended_locale"] = quickCreate.RecommendedLocale
	readiness["required_for_publish"] = append([]string{}, quickCreate.RequiredForPublish...)
	readiness["default_assignment"] = translationReadinessDefaultAssignmentPayload(quickCreate.DefaultAssignment)
	readiness["quick_create"] = translationReadinessQuickCreatePayloadMap(quickCreate)
	if localeMetadata := translationReadinessLocaleMetadata(record); len(localeMetadata) > 0 {
		readiness["locale_metadata"] = localeMetadata
	}
	return readiness
}

func translationReadinessApplicable(record map[string]any, requirementsResolved bool) bool {
	if requirementsResolved {
		return true
	}
	if len(record) == 0 {
		return false
	}
	if translationFamilyIDFromRecord(record) != "" {
		return true
	}
	if len(normalizedLocaleList(record["available_locales"])) > 0 {
		return true
	}
	if strings.TrimSpace(toString(record["requested_locale"])) != "" {
		return true
	}
	if strings.TrimSpace(toString(record["resolved_locale"])) != "" {
		return true
	}
	if toBool(record["missing_requested_locale"]) {
		return true
	}
	if toBool(record["fallback_used"]) {
		return true
	}
	if len(translationReadinessLocaleMetadata(record)) > 0 {
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
) ([]string, map[string][]string, bool, TranslationRequirements) {
	requiredLocales := []string{}
	requiredFields := map[string][]string{}
	provider, ok := policy.(translationRequirementsProvider)
	if !ok || provider == nil {
		return requiredLocales, requiredFields, false, TranslationRequirements{}
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
		return requiredLocales, requiredFields, false, TranslationRequirements{}
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
	return requiredLocales, requiredFields, true, req
}

func translationPolicyEntity(panelName string, record map[string]any) string {
	if value := strings.TrimSpace(toString(record["policy_entity"])); value != "" {
		return normalizePolicyEntityKey(value)
	}
	if value := strings.TrimSpace(toString(record["content_type_slug"])); value != "" {
		return normalizePolicyEntityKey(value)
	}
	if value := strings.TrimSpace(toString(record["content_type"])); value != "" {
		return normalizePolicyEntityKey(value)
	}
	panel := strings.TrimSpace(panelName)
	if panel == translationReadinessPolicyEntityFallbackPanels {
		if value := strings.TrimSpace(toString(record["panel"])); value != "" {
			return normalizePolicyEntityKey(value)
		}
	}
	return normalizePolicyEntityKey(panel)
}

func translationReadinessPolicyEntityLookupKey(value string) string {
	normalized := normalizePolicyEntityKey(value)
	if normalized == "" {
		return ""
	}
	singular := normalizePolicyEntityKey(inflection.Singular(normalized))
	if singular != "" {
		return singular
	}
	return normalized
}

func translationReadinessPolicyEntityLookupKeyCached(value string, cache *translationReadinessRequirementsCache) string {
	normalized := normalizePolicyEntityKey(value)
	if normalized == "" {
		return ""
	}
	if cache == nil {
		return translationReadinessPolicyEntityLookupKey(normalized)
	}
	if cache.policyEntityLookupByKey == nil {
		cache.policyEntityLookupByKey = map[string]string{}
	}
	if cached, ok := cache.policyEntityLookupByKey[normalized]; ok {
		return cached
	}
	resolved := translationReadinessPolicyEntityLookupKey(normalized)
	cache.policyEntityLookupByKey[normalized] = resolved
	return resolved
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
	locales := []string(nil)
	if cache != nil && len(cache.availableLocalesByGroup) > 0 {
		if grouped := cache.availableLocalesByGroup[translationReadinessGroupKey(record)]; len(grouped) > 0 {
			locales = append([]string{}, grouped...)
		}
	}
	if len(locales) == 0 {
		locales = translationReadinessLocaleList(normalizedLocaleList(record["available_locales"]))
	}
	recordLocale := strings.ToLower(strings.TrimSpace(toString(record["locale"])))
	if recordLocale == "" {
		return locales
	}
	if slices.Contains(locales, recordLocale) {
		return locales
	}
	locales = append(locales, recordLocale)
	return translationReadinessLocaleList(locales)
}

func translationReadinessGroupKey(record map[string]any) string {
	return strings.ToLower(strings.TrimSpace(translationFamilyIDFromRecord(record)))
}

func translationFamilyIDFromRecord(record map[string]any) string {
	if len(record) == 0 {
		return ""
	}
	return strings.TrimSpace(toString(record["family_id"]))
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
	grouped := map[string]map[string]struct{}{}
	for _, record := range records {
		key := translationReadinessGroupKey(record)
		if key == "" {
			continue
		}
		if grouped[key] == nil {
			grouped[key] = map[string]struct{}{}
		}
		for _, locale := range normalizedLocaleList(record["available_locales"]) {
			normalized := strings.ToLower(strings.TrimSpace(locale))
			if normalized == "" {
				continue
			}
			grouped[key][normalized] = struct{}{}
		}
		if locale := strings.TrimSpace(toString(record["locale"])); locale != "" {
			grouped[key][strings.ToLower(locale)] = struct{}{}
		}
	}
	if len(grouped) == 0 {
		return nil
	}
	out := make(map[string][]string, len(grouped))
	for key, values := range grouped {
		locales := make([]string, 0, len(values))
		for locale := range values {
			locales = append(locales, locale)
		}
		sort.Strings(locales)
		out[key] = locales
	}
	return out
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
			"updated_by": primitives.FirstNonEmptyRaw(
				toString(record["updated_by"]),
				toString(record["updated_by_id"]),
				toString(record["updated_by_name"]),
			),
			"updated_at": primitives.FirstNonEmptyRaw(
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

type translationQuickCreateDefaultAssignment struct {
	AutoCreateAssignment bool   `json:"auto_create_assignment"`
	WorkScope            string `json:"work_scope"`
	Priority             string `json:"priority"`
	AssigneeID           string `json:"assignee_id"`
	DueDate              string `json:"due_date"`
}

type translationQuickCreatePayload struct {
	Enabled            bool                                    `json:"enabled"`
	MissingLocales     []string                                `json:"missing_locales"`
	RecommendedLocale  string                                  `json:"recommended_locale"`
	RequiredForPublish []string                                `json:"required_for_publish"`
	DefaultAssignment  translationQuickCreateDefaultAssignment `json:"default_assignment"`
	DisabledReasonCode string                                  `json:"disabled_reason_code"`
	DisabledReason     string                                  `json:"disabled_reason"`
}

func translationReadinessQuickCreatePayload(
	record map[string]any,
	requiredLocales, missingLocales []string,
	req TranslationRequirements,
	requirementsResolved bool,
) translationQuickCreatePayload {
	quickCreateMissing := translationReadinessQuickCreateLocales(record, missingLocales)
	recommendedLocale := translationReadinessQuickCreateRecommendedLocale(record, quickCreateMissing, requiredLocales)
	enabled, reasonCode, reason := translationReadinessQuickCreateAvailability(quickCreateMissing, requirementsResolved)
	return translationQuickCreatePayload{
		Enabled:            enabled,
		MissingLocales:     append([]string{}, quickCreateMissing...),
		RecommendedLocale:  recommendedLocale,
		RequiredForPublish: translationReadinessLocaleList(requiredLocales),
		DefaultAssignment: translationQuickCreateDefaultAssignment{
			AutoCreateAssignment: false,
			WorkScope:            strings.TrimSpace(firstNonEmpty(req.DefaultWorkScope, translationcore.DefaultWorkScope)),
			Priority:             "normal",
			AssigneeID:           "",
			DueDate:              "",
		},
		DisabledReasonCode: reasonCode,
		DisabledReason:     reason,
	}
}

func translationReadinessQuickCreatePayloadMap(payload translationQuickCreatePayload) map[string]any {
	return map[string]any{
		"enabled":              payload.Enabled,
		"missing_locales":      append([]string{}, payload.MissingLocales...),
		"recommended_locale":   payload.RecommendedLocale,
		"required_for_publish": append([]string{}, payload.RequiredForPublish...),
		"default_assignment":   translationReadinessDefaultAssignmentPayload(payload.DefaultAssignment),
		"disabled_reason_code": payload.DisabledReasonCode,
		"disabled_reason":      payload.DisabledReason,
	}
}

func translationReadinessDefaultAssignmentPayload(payload translationQuickCreateDefaultAssignment) map[string]any {
	return map[string]any{
		"auto_create_assignment": payload.AutoCreateAssignment,
		"work_scope":             strings.TrimSpace(payload.WorkScope),
		"priority":               strings.TrimSpace(payload.Priority),
		"assignee_id":            strings.TrimSpace(payload.AssigneeID),
		"due_date":               strings.TrimSpace(payload.DueDate),
	}
}

func translationReadinessQuickCreateLocales(record map[string]any, missingLocales []string) []string {
	out := translationReadinessLocaleList(missingLocales)
	if !translationReadinessBoolField(record, []string{
		"missing_requested_locale",
	}) {
		return out
	}
	requestedLocale := translationReadinessStringField(record, []string{
		"requested_locale",
	})
	if requestedLocale == "" {
		return out
	}
	out = append(out, requestedLocale)
	return translationReadinessLocaleList(out)
}

func translationReadinessQuickCreateRecommendedLocale(record map[string]any, quickCreateLocales, requiredLocales []string) string {
	if translationReadinessBoolField(record, []string{
		"missing_requested_locale",
	}) {
		if requestedLocale := translationReadinessStringField(record, []string{
			"requested_locale",
		}); requestedLocale != "" {
			return strings.ToLower(strings.TrimSpace(requestedLocale))
		}
	}
	return translationReadinessRecommendedLocale(quickCreateLocales, requiredLocales)
}

func translationReadinessQuickCreateAvailability(locales []string, requirementsResolved bool) (bool, string, string) {
	if !requirementsResolved {
		return false, "policy_denied", "Policy currently blocks creating additional locale variants for this entry."
	}
	if len(locales) > 0 {
		return true, "", ""
	}
	return false, "no_missing_locales", "All requested and required locales already exist for this entry."
}

func translationReadinessStringField(record map[string]any, paths []string) string {
	for _, path := range paths {
		value := translationReadinessNestedValue(record, strings.Split(path, ".")...)
		if trimmed := strings.TrimSpace(toString(value)); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func translationReadinessBoolField(record map[string]any, paths []string) bool {
	for _, path := range paths {
		value := translationReadinessNestedValue(record, strings.Split(path, ".")...)
		switch typed := value.(type) {
		case bool:
			return typed
		case string:
			switch strings.ToLower(strings.TrimSpace(typed)) {
			case "true", "1", "yes", "on":
				return true
			case "false", "0", "no", "off":
				return false
			}
		}
	}
	return false
}
