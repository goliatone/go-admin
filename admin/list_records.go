package admin

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"
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

type listRecordPredicateMatcher func(record map[string]any, predicate ListPredicate) (matched bool, handled bool)
type listRecordSearchMatcher func(record map[string]any, term string) bool

type listRecordOptions struct {
	SkipFields       map[string]struct{}
	PredicateMatcher listRecordPredicateMatcher
	SearchMatcher    listRecordSearchMatcher
}

// applyListOptionsToRecordMaps applies a canonical list query pipeline:
// search -> predicates -> sort -> paginate.
func applyListOptionsToRecordMaps(records []map[string]any, opts ListOptions, options listRecordOptions) ([]map[string]any, int) {
	filtered := make([]map[string]any, 0, len(records))
	search := inMemoryListSearchTerm(opts)
	predicates := NormalizeListPredicates(opts)

	for _, record := range records {
		if !recordMatchesListQuery(record, search, predicates, options) {
			continue
		}
		filtered = append(filtered, record)
	}

	applyRecordMapSort(filtered, opts.SortBy, opts.SortDesc)
	return paginateInMemory(filtered, opts, 10)
}

func recordMatchesListQuery(record map[string]any, search string, predicates []ListPredicate, options listRecordOptions) bool {
	if search != "" {
		matchesSearch := false
		if options.SearchMatcher != nil {
			matchesSearch = options.SearchMatcher(record, search)
		} else {
			matchesSearch = listRecordMatchesSearch(record, search)
		}
		if !matchesSearch {
			return false
		}
	}

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
		if _, skip := options.SkipFields[field]; skip {
			continue
		}
		if len(predicate.Values) == 0 {
			continue
		}

		if options.PredicateMatcher != nil {
			if matched, handled := options.PredicateMatcher(record, predicate); handled {
				if !matched {
					return false
				}
				continue
			}
		}

		if !listRecordMatchesPredicate(record, predicate) {
			return false
		}
	}

	return true
}

func listRecordMatchesSearch(record map[string]any, term string) bool {
	if record == nil {
		return false
	}
	needle := strings.ToLower(strings.TrimSpace(term))
	if needle == "" {
		return true
	}
	for _, value := range record {
		for _, candidate := range listRecordCandidateValues(value) {
			if strings.Contains(strings.ToLower(strings.TrimSpace(candidate)), needle) {
				return true
			}
		}
	}
	return false
}

func listRecordMatchesPredicate(record map[string]any, predicate ListPredicate) bool {
	value, ok := lookupRecordMapValue(record, predicate.Field)
	if !ok {
		return false
	}
	candidates := listRecordCandidateValues(value)
	if len(candidates) == 0 {
		return false
	}

	values := normalizePredicateValues(predicate.Values)
	if len(values) == 0 {
		return true
	}

	switch strings.ToLower(strings.TrimSpace(predicate.Operator)) {
	case "in":
		return listAnyEquals(candidates, values)
	case "ilike", "like", "contains":
		return listAnyContains(candidates, values)
	case "ne", "nin":
		return !listAnyEquals(candidates, values)
	case "gt", "gte", "lt", "lte":
		return listAnyCompare(candidates, values, strings.ToLower(strings.TrimSpace(predicate.Operator)))
	case "", "eq":
		fallthrough
	default:
		return listAnyEquals(candidates, values)
	}
}

func lookupRecordMapValue(record map[string]any, field string) (any, bool) {
	if record == nil {
		return nil, false
	}
	if value, ok := record[field]; ok {
		return value, true
	}
	normalized := listRecordNormalizeField(field)
	for key, value := range record {
		if listRecordNormalizeField(key) == normalized {
			return value, true
		}
	}
	return nil, false
}

func listRecordNormalizeField(field string) string {
	current := strings.TrimSpace(strings.ToLower(field))
	current = strings.ReplaceAll(current, "-", "_")
	return current
}

func listRecordCandidateValues(value any) []string {
	switch typed := value.(type) {
	case nil:
		return nil
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if normalized := strings.TrimSpace(item); normalized != "" {
				out = append(out, normalized)
			}
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if normalized := strings.TrimSpace(fmt.Sprintf("%v", item)); normalized != "" {
				out = append(out, normalized)
			}
		}
		return out
	default:
		if normalized := strings.TrimSpace(fmt.Sprintf("%v", typed)); normalized != "" {
			return []string{normalized}
		}
	}
	return nil
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

func applyRecordMapSort(records []map[string]any, field string, desc bool) {
	field = strings.TrimSpace(field)
	if field == "" || len(records) <= 1 {
		return
	}

	sort.SliceStable(records, func(i, j int) bool {
		left, leftOk := lookupRecordMapValue(records[i], field)
		right, rightOk := lookupRecordMapValue(records[j], field)
		cmp := compareRecordValues(left, leftOk, right, rightOk)
		if desc {
			return cmp > 0
		}
		return cmp < 0
	})
}

func compareRecordValues(left any, leftOk bool, right any, rightOk bool) int {
	if !leftOk && !rightOk {
		return 0
	}
	if !leftOk {
		return 1
	}
	if !rightOk {
		return -1
	}

	leftValue := strings.TrimSpace(fmt.Sprintf("%v", left))
	rightValue := strings.TrimSpace(fmt.Sprintf("%v", right))

	if leftValue == "" && rightValue == "" {
		return 0
	}
	if leftValue == "" {
		return 1
	}
	if rightValue == "" {
		return -1
	}

	if cmp, ok := compareListValues(leftValue, rightValue); ok {
		return cmp
	}

	leftLower := strings.ToLower(leftValue)
	rightLower := strings.ToLower(rightValue)
	switch {
	case leftLower < rightLower:
		return -1
	case leftLower > rightLower:
		return 1
	default:
		return 0
	}
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

	return 0, false
}

func parseListTime(value string) (time.Time, bool) {
	candidates := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	trimmed := strings.TrimSpace(value)
	for _, layout := range candidates {
		if parsed, err := time.Parse(layout, trimmed); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}
