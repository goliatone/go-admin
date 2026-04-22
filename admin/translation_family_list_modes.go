package admin

import (
	"context"
	"strings"
)

func translationFamilyRequestedLocaleFromListOptions(opts ListOptions) (string, bool) {
	if opts.Filters != nil {
		if loc, ok := opts.Filters["locale"].(string); ok && strings.TrimSpace(loc) != "" {
			return strings.TrimSpace(loc), true
		}
		if loc, ok := opts.Filters["Locale"].(string); ok && strings.TrimSpace(loc) != "" {
			return strings.TrimSpace(loc), true
		}
	}
	for _, predicate := range NormalizeListPredicates(opts) {
		if !strings.EqualFold(strings.TrimSpace(predicate.Field), "locale") {
			continue
		}
		if len(predicate.Values) == 0 {
			continue
		}
		return strings.TrimSpace(predicate.Values[0]), true
	}
	return "", false
}

func shouldExpandTranslationFamilyRows(opts ListOptions) bool {
	requestedLocale, hasLocaleFilter := translationFamilyRequestedLocaleFromListOptions(opts)
	if hasLocaleFilter && requestedLocale != "" && !isTranslationLocaleWildcard(requestedLocale) {
		return false
	}
	return isTranslationLocaleWildcard(requestedLocale) || listOptionsGroupByFamilyID(opts) || listOptionsHaveFamilyIDFilter(opts)
}

func shouldExpandTranslationFamilyRowsForContext(ctx context.Context, opts ListOptions) bool {
	if translationFamilyExpansionFromContext(ctx) {
		return true
	}
	return shouldExpandTranslationFamilyRows(opts)
}

func shouldExpandContentEntryTranslationFamilyRowsForContext(ctx context.Context, opts ListOptions) bool {
	if translationFamilyExpansionFromContext(ctx) {
		return true
	}
	if listOptionsGroupByFamilyID(opts) || listOptionsHaveFamilyIDFilter(opts) {
		return true
	}
	return shouldExpandTranslationFamilyRows(opts)
}

func listOptionsGroupByFamilyID(opts ListOptions) bool {
	if len(opts.Filters) > 0 {
		for key, value := range opts.Filters {
			field := key
			if parts := strings.SplitN(strings.TrimSpace(key), "__", 2); len(parts) > 0 {
				field = parts[0]
			}
			if !isListGroupByPredicateField(field) {
				continue
			}
			if strings.EqualFold(normalizeGroupByValue(groupByValuesFromAny(value)), listGroupByFamilyID) {
				return true
			}
		}
	}
	for _, predicate := range NormalizeListPredicates(opts) {
		if !isListGroupByPredicateField(predicate.Field) {
			continue
		}
		if strings.EqualFold(normalizeGroupByValue(predicate.Values), listGroupByFamilyID) {
			return true
		}
	}
	return false
}

func listOptionsHaveFamilyIDFilter(opts ListOptions) bool {
	if len(opts.Filters) > 0 {
		for key, value := range opts.Filters {
			field := key
			if parts := strings.SplitN(strings.TrimSpace(key), "__", 2); len(parts) > 0 {
				field = parts[0]
			}
			if strings.EqualFold(strings.TrimSpace(field), "family_id") && len(groupByValuesFromAny(value)) > 0 {
				return true
			}
		}
	}
	for _, predicate := range NormalizeListPredicates(opts) {
		if strings.EqualFold(strings.TrimSpace(predicate.Field), "family_id") && len(predicate.Values) > 0 {
			return true
		}
	}
	return false
}

func normalizeListOptionsForTranslationWildcard(opts ListOptions) ListOptions {
	normalized := cloneListOptions(opts)
	requestedLocale, hasLocaleFilter := translationFamilyRequestedLocaleFromListOptions(normalized)
	if !hasLocaleFilter || !isTranslationLocaleWildcard(requestedLocale) {
		return normalized
	}
	if len(normalized.Filters) > 0 {
		delete(normalized.Filters, "locale")
		delete(normalized.Filters, "Locale")
		if len(normalized.Filters) == 0 {
			normalized.Filters = nil
		}
	}
	if len(normalized.Predicates) > 0 {
		filtered := make([]ListPredicate, 0, len(normalized.Predicates))
		for _, predicate := range normalized.Predicates {
			if strings.EqualFold(strings.TrimSpace(predicate.Field), "locale") {
				continue
			}
			filtered = append(filtered, predicate)
		}
		normalized.Predicates = filtered
	}
	return normalized
}
