package admin

import (
	"sort"
	"strings"
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
	keys := make([]string, 0, len(filters))
	for key := range filters {
		if strings.TrimSpace(key) != "" {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	out := make([]ListPredicate, 0, len(keys))
	for _, key := range keys {
		values := normalizePredicateValues(anyToPredicateValues(filters[key]))
		if len(values) == 0 {
			continue
		}
		field, op := ParseListPredicateKey(key)
		if field == "" {
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

// ParseListPredicateKey splits field operator keys like "status__in".
func ParseListPredicateKey(key string) (string, string) {
	parts := strings.SplitN(strings.TrimSpace(key), "__", 2)
	field := strings.TrimSpace(parts[0])
	operator := defaultListPredicateOperator
	if len(parts) == 2 {
		if op := strings.TrimSpace(parts[1]); op != "" {
			operator = strings.ToLower(op)
		}
	}
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

func anyToPredicateValues(value any) []string {
	switch typed := value.(type) {
	case nil:
		return nil
	case string:
		return []string{typed}
	case []string:
		return append([]string{}, typed...)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			out = append(out, toString(item))
		}
		return out
	default:
		return []string{toString(value)}
	}
}
