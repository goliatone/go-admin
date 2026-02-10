package stores

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
)

var reservedListPredicateFields = map[string]struct{}{
	"_search":     {},
	"search":      {},
	"environment": {},
	"env":         {},
	"page":        {},
	"per_page":    {},
	"limit":       {},
	"offset":      {},
	"order":       {},
	"sort":        {},
	"sort_desc":   {},
}

type listPredicate struct {
	Field    string
	Operator string
	Values   []string
}

func applyListOptionsToRecords(records []map[string]any, opts admin.ListOptions, skipFields map[string]struct{}) ([]map[string]any, int) {
	predicates := normalizeListPredicates(opts)
	filtered := make([]map[string]any, 0, len(records))
	for _, record := range records {
		if !recordMatchesListPredicates(record, predicates, skipFields) {
			continue
		}
		filtered = append(filtered, record)
	}

	applyRecordSort(filtered, opts.SortBy, opts.SortDesc)
	total := len(filtered)
	return paginateRecordSlice(filtered, opts), total
}

func normalizeListPredicates(opts admin.ListOptions) []listPredicate {
	if len(opts.Predicates) > 0 {
		out := make([]listPredicate, 0, len(opts.Predicates))
		for _, predicate := range opts.Predicates {
			field := strings.TrimSpace(predicate.Field)
			if field == "" {
				continue
			}
			operator := strings.ToLower(strings.TrimSpace(predicate.Operator))
			if operator == "" {
				operator = "eq"
			}
			values := normalizeListPredicateValues(predicate.Values)
			if len(values) == 0 {
				continue
			}
			out = append(out, listPredicate{
				Field:    field,
				Operator: operator,
				Values:   values,
			})
		}
		return out
	}

	if len(opts.Filters) == 0 {
		return nil
	}
	out := make([]listPredicate, 0, len(opts.Filters))
	for key, raw := range opts.Filters {
		field, operator := parseListPredicateKey(key)
		if field == "" {
			continue
		}
		values := listValuesFromAny(raw)
		if len(values) == 0 {
			continue
		}
		out = append(out, listPredicate{
			Field:    field,
			Operator: operator,
			Values:   values,
		})
	}
	return out
}

func parseListPredicateKey(key string) (string, string) {
	parts := strings.SplitN(strings.TrimSpace(key), "__", 2)
	field := strings.TrimSpace(parts[0])
	operator := "eq"
	if len(parts) == 2 {
		if op := strings.ToLower(strings.TrimSpace(parts[1])); op != "" {
			operator = op
		}
	}
	return field, operator
}

func listValuesFromAny(raw any) []string {
	switch typed := raw.(type) {
	case nil:
		return nil
	case string:
		return normalizeListPredicateValues([]string{typed})
	case []string:
		return normalizeListPredicateValues(typed)
	case []any:
		out := make([]string, 0, len(typed))
		for _, value := range typed {
			out = append(out, normalizeListPredicateValues([]string{fmt.Sprintf("%v", value)})...)
		}
		return out
	default:
		return normalizeListPredicateValues([]string{fmt.Sprintf("%v", typed)})
	}
}

func recordMatchesListPredicates(record map[string]any, predicates []listPredicate, skipFields map[string]struct{}) bool {
	if len(predicates) == 0 {
		return true
	}
	for _, predicate := range predicates {
		field := strings.TrimSpace(predicate.Field)
		if field == "" {
			continue
		}
		if _, skip := reservedListPredicateFields[strings.ToLower(field)]; skip {
			continue
		}
		if _, skip := skipFields[field]; skip {
			continue
		}
		values := normalizeListPredicateValues(predicate.Values)
		if len(values) == 0 {
			continue
		}

		value, ok := lookupRecordValue(record, field)
		if !ok {
			return false
		}
		if !recordValueMatchesPredicate(value, strings.ToLower(strings.TrimSpace(predicate.Operator)), values) {
			return false
		}
	}
	return true
}

func lookupRecordValue(record map[string]any, field string) (any, bool) {
	if record == nil {
		return nil, false
	}
	if value, ok := record[field]; ok {
		return value, true
	}

	normalized := strings.ToLower(strings.TrimSpace(strings.ReplaceAll(field, "-", "_")))
	for key, value := range record {
		current := strings.ToLower(strings.TrimSpace(strings.ReplaceAll(key, "-", "_")))
		if current == normalized {
			return value, true
		}
	}
	return nil, false
}

func recordValueMatchesPredicate(value any, operator string, filterValues []string) bool {
	candidates := listPredicateCandidateValues(value)
	if len(candidates) == 0 {
		return false
	}

	switch operator {
	case "in":
		return listAnyEquals(candidates, filterValues)
	case "ilike", "like", "contains":
		return listAnyContains(candidates, filterValues)
	case "ne":
		return !listAnyEquals(candidates, filterValues)
	case "nin":
		return !listAnyEquals(candidates, filterValues)
	case "gt", "gte", "lt", "lte":
		return listAnyCompare(candidates, filterValues, operator)
	case "", "eq":
		fallthrough
	default:
		return listAnyEquals(candidates, filterValues)
	}
}

func listPredicateCandidateValues(value any) []string {
	switch typed := value.(type) {
	case nil:
		return nil
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			trimmed := strings.TrimSpace(item)
			if trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			trimmed := strings.TrimSpace(fmt.Sprintf("%v", item))
			if trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return out
	default:
		trimmed := strings.TrimSpace(fmt.Sprintf("%v", typed))
		if trimmed == "" {
			return nil
		}
		return []string{trimmed}
	}
}

func normalizeListPredicateValues(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		parts := strings.Split(value, ",")
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				out = append(out, trimmed)
			}
		}
	}
	return out
}

func listAnyEquals(candidates, accepted []string) bool {
	for _, candidate := range candidates {
		for _, expected := range accepted {
			if strings.EqualFold(strings.TrimSpace(candidate), strings.TrimSpace(expected)) {
				return true
			}
		}
	}
	return false
}

func listAnyContains(candidates, accepted []string) bool {
	for _, candidate := range candidates {
		current := strings.ToLower(strings.TrimSpace(candidate))
		for _, expected := range accepted {
			needle := strings.ToLower(strings.TrimSpace(expected))
			if needle != "" && strings.Contains(current, needle) {
				return true
			}
		}
	}
	return false
}

func listAnyCompare(candidates, accepted []string, operator string) bool {
	for _, candidate := range candidates {
		for _, expected := range accepted {
			comparison, ok := compareListValues(candidate, expected)
			if !ok {
				continue
			}
			switch operator {
			case "gt":
				if comparison > 0 {
					return true
				}
			case "gte":
				if comparison >= 0 {
					return true
				}
			case "lt":
				if comparison < 0 {
					return true
				}
			case "lte":
				if comparison <= 0 {
					return true
				}
			}
		}
	}
	return false
}

func compareListValues(left, right string) (int, bool) {
	if lf, err := strconv.ParseFloat(strings.TrimSpace(left), 64); err == nil {
		if rf, err := strconv.ParseFloat(strings.TrimSpace(right), 64); err == nil {
			switch {
			case lf < rf:
				return -1, true
			case lf > rf:
				return 1, true
			default:
				return 0, true
			}
		}
	}

	if lt, ok := parseListTime(left); ok {
		if rt, ok := parseListTime(right); ok {
			switch {
			case lt.Before(rt):
				return -1, true
			case lt.After(rt):
				return 1, true
			default:
				return 0, true
			}
		}
	}

	lowerLeft := strings.ToLower(strings.TrimSpace(left))
	lowerRight := strings.ToLower(strings.TrimSpace(right))
	switch {
	case lowerLeft < lowerRight:
		return -1, true
	case lowerLeft > lowerRight:
		return 1, true
	default:
		return 0, true
	}
}

func parseListTime(value string) (time.Time, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return time.Time{}, false
	}
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if ts, err := time.Parse(layout, trimmed); err == nil {
			return ts, true
		}
	}
	return time.Time{}, false
}

func applyRecordSort(records []map[string]any, sortBy string, sortDesc bool) {
	field := strings.TrimSpace(sortBy)
	if field == "" || len(records) < 2 {
		return
	}

	sort.SliceStable(records, func(i, j int) bool {
		left, leftOK := lookupRecordValue(records[i], field)
		right, rightOK := lookupRecordValue(records[j], field)
		if !leftOK && !rightOK {
			return false
		}
		if !leftOK {
			return false
		}
		if !rightOK {
			return true
		}

		comparison := compareRecordValues(left, right)
		if sortDesc {
			return comparison > 0
		}
		return comparison < 0
	})
}

func compareRecordValues(left, right any) int {
	leftText := strings.TrimSpace(fmt.Sprintf("%v", left))
	rightText := strings.TrimSpace(fmt.Sprintf("%v", right))

	if lf, err := strconv.ParseFloat(leftText, 64); err == nil {
		if rf, err := strconv.ParseFloat(rightText, 64); err == nil {
			switch {
			case lf < rf:
				return -1
			case lf > rf:
				return 1
			default:
				return 0
			}
		}
	}

	if lt, ok := parseListTime(leftText); ok {
		if rt, ok := parseListTime(rightText); ok {
			switch {
			case lt.Before(rt):
				return -1
			case lt.After(rt):
				return 1
			default:
				return 0
			}
		}
	}

	lowerLeft := strings.ToLower(leftText)
	lowerRight := strings.ToLower(rightText)
	switch {
	case lowerLeft < lowerRight:
		return -1
	case lowerLeft > lowerRight:
		return 1
	default:
		return 0
	}
}

func paginateRecordSlice(records []map[string]any, opts admin.ListOptions) []map[string]any {
	page := opts.Page
	if page <= 0 {
		page = 1
	}
	perPage := opts.PerPage
	if perPage <= 0 {
		perPage = 10
	}

	start := (page - 1) * perPage
	if start >= len(records) {
		return []map[string]any{}
	}
	end := start + perPage
	if end > len(records) {
		end = len(records)
	}
	return records[start:end]
}
