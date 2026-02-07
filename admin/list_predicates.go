package admin

import (
	"strings"

	"github.com/goliatone/go-admin/admin/internal/listquery"
)

const defaultListPredicateOperator = "eq"

// NormalizeListPredicates returns operator-aware predicates for list filtering.
// It prefers explicit opts.Predicates and falls back to legacy opts.Filters.
func NormalizeListPredicates(opts ListOptions) []ListPredicate {
	if len(opts.Predicates) > 0 {
		return normalizePredicates(opts.Predicates)
	}
	return predicatesFromFilterMap(opts.Filters)
}

func normalizePredicates(predicates []ListPredicate) []ListPredicate {
	out := make([]ListPredicate, 0, len(predicates))
	for _, predicate := range predicates {
		field := strings.TrimSpace(predicate.Field)
		if field == "" {
			continue
		}
		op := normalizePredicateOperator(predicate.Operator)
		values := normalizePredicateValues(predicate.Values)
		if len(values) == 0 {
			continue
		}
		out = append(out, ListPredicate{
			Field:    field,
			Operator: op,
			Values:   values,
		})
	}
	return out
}

func predicatesFromFilterMap(filters map[string]any) []ListPredicate {
	if len(filters) == 0 {
		return nil
	}
	parsed := listquery.PredicatesFromFilters(filters)
	out := make([]ListPredicate, 0, len(parsed))
	for _, predicate := range parsed {
		field := strings.TrimSpace(predicate.Field)
		if field == "" || len(predicate.Values) == 0 {
			continue
		}
		out = append(out, ListPredicate{
			Field:    field,
			Operator: normalizePredicateOperator(predicate.Operator),
			Values:   normalizePredicateValues(predicate.Values),
		})
	}
	return out
}

// ParseListPredicateKey splits field operator keys like "status__in".
func ParseListPredicateKey(key string) (string, string) {
	field, operator := listquery.ParsePredicateKey(key)
	return field, normalizePredicateOperator(operator)
}

func normalizePredicateOperator(operator string) string {
	op := strings.ToLower(strings.TrimSpace(operator))
	if op == "" {
		return defaultListPredicateOperator
	}
	return op
}

func normalizePredicateValues(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		parts := strings.Split(value, ",")
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed == "" {
				continue
			}
			out = append(out, trimmed)
		}
	}
	return out
}
