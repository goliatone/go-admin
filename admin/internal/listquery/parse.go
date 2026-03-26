package listquery

import (
	"sort"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
)

// Predicate describes a single parsed operator-aware filter.
type Predicate struct {
	Field    string   `json:"field"`
	Operator string   `json:"operator"`
	Values   []string `json:"values"`
}

// Result captures normalized list query options.
type Result struct {
	Page       int            `json:"page"`
	PerPage    int            `json:"per_page"`
	SortBy     string         `json:"sort_by"`
	SortDesc   bool           `json:"sort_desc"`
	Search     string         `json:"search"`
	Filters    map[string]any `json:"filters"`
	Predicates []Predicate    `json:"predicates"`
	Fields     []string       `json:"fields"`
}

// Options projects Result into consumer-specific predicate types.
// The field layout intentionally mirrors admin and boot list option structs.
type Options[T any] struct {
	Page       int            `json:"page"`
	PerPage    int            `json:"per_page"`
	SortBy     string         `json:"sort_by"`
	SortDesc   bool           `json:"sort_desc"`
	Filters    map[string]any `json:"filters"`
	Predicates []T            `json:"predicates"`
	Fields     []string       `json:"fields"`
	Search     string         `json:"search"`
}

// ParseContext extracts list query options from a router context.
func ParseContext(c router.Context, defaultPage, defaultPerPage int) Result {
	page := AtoiDefault(c.Query("page"), 0)
	perPage := AtoiDefault(c.Query("per_page"), 0)
	if perPage <= 0 {
		perPage = AtoiDefault(c.Query("limit"), 0)
	}
	if page <= 0 && perPage > 0 {
		offset := AtoiDefault(c.Query("offset"), 0)
		page = (offset / perPage) + 1
	}
	if page <= 0 {
		page = defaultPage
		if page <= 0 {
			page = 1
		}
	}
	if perPage <= 0 {
		perPage = defaultPerPage
		if perPage <= 0 {
			perPage = 10
		}
	}

	sortBy := strings.TrimSpace(c.Query("sort"))
	sortDesc := strings.EqualFold(strings.TrimSpace(c.Query("sort_desc")), "true")
	search := strings.TrimSpace(c.Query("search"))
	if search == "" {
		search = strings.TrimSpace(c.Query("q"))
	}
	fields := ValuesFromAny(c.Query("fields"))

	if sortBy == "" {
		order := strings.TrimSpace(c.Query("order"))
		if order != "" {
			first := strings.Split(order, ",")[0]
			parts := strings.Fields(first)
			if len(parts) > 0 {
				sortBy = strings.TrimSpace(parts[0])
				if len(parts) > 1 {
					sortDesc = strings.EqualFold(strings.TrimSpace(parts[1]), "desc")
				}
			}
		}
	}

	filters := map[string]any{}
	reserved := map[string]struct{}{
		"page":                  {},
		"per_page":              {},
		"sort":                  {},
		"sort_desc":             {},
		"search":                {},
		"q":                     {},
		"limit":                 {},
		"offset":                {},
		"order":                 {},
		"fields":                {},
		"$channel":              {},
		"content_channel":       {},
		"site_content_channel":  {},
		"env":                   {},
		"environment":           {},
		"locale":                {},
		"include_drafts":        {},
		"include_contributions": {},
		"preview_token":         {},
		"view_profile":          {},
	}
	for key, value := range c.Queries() {
		rawKey := strings.TrimSpace(key)
		if rawKey == "" {
			continue
		}
		if strings.HasPrefix(rawKey, "$") {
			continue
		}
		if strings.TrimSpace(value) == "" {
			continue
		}
		if _, isReserved := reserved[rawKey]; isReserved {
			continue
		}
		targetKey := rawKey
		if after, ok := strings.CutPrefix(targetKey, "filter_"); ok {
			targetKey = after
		} else if after, ok := strings.CutPrefix(targetKey, "filter."); ok {
			targetKey = after
		}
		targetKey = strings.TrimSpace(targetKey)
		if targetKey == "" {
			continue
		}
		if _, exists := filters[targetKey]; exists {
			continue
		}
		filters[targetKey] = value
	}

	if _, ok := filters["environment"]; !ok {
		if env := strings.TrimSpace(c.Query("env")); env != "" {
			filters["environment"] = env
		} else if env := strings.TrimSpace(c.Query("environment")); env != "" {
			filters["environment"] = env
		}
	}

	predicates := PredicatesFromFilters(filters)

	return Result{
		Page:       page,
		PerPage:    perPage,
		SortBy:     sortBy,
		SortDesc:   sortDesc,
		Search:     search,
		Filters:    filters,
		Predicates: predicates,
		Fields:     fields,
	}
}

// ParseOptions parses list query params and maps predicates into consumer-specific types.
func ParseOptions[T any](c router.Context, defaultPage, defaultPerPage int, mapper func(Predicate) T) Options[T] {
	parsed := ParseContext(c, defaultPage, defaultPerPage)
	return Options[T]{
		Page:       parsed.Page,
		PerPage:    parsed.PerPage,
		SortBy:     parsed.SortBy,
		SortDesc:   parsed.SortDesc,
		Filters:    parsed.Filters,
		Predicates: MapPredicates(parsed.Predicates, mapper),
		Fields:     append([]string{}, parsed.Fields...),
		Search:     parsed.Search,
	}
}

// ParsePanelOptions parses list query params using the canonical go-admin panel defaults.
func ParsePanelOptions[T any](c router.Context, mapper func(Predicate) T) Options[T] {
	return ParseOptions(c, 1, 10, mapper)
}

// ParsePredicateKey splits filter keys like "title__ilike".
func ParsePredicateKey(key string) (string, string) {
	parts := strings.SplitN(strings.TrimSpace(key), "__", 2)
	field := strings.TrimSpace(parts[0])
	operator := "eq"
	if len(parts) == 2 {
		if op := strings.TrimSpace(parts[1]); op != "" {
			operator = strings.ToLower(op)
		}
	}
	if operator == "" {
		operator = "eq"
	}
	return field, operator
}

// PredicatesFromFilters converts a filter map into normalized predicates.
func PredicatesFromFilters(filters map[string]any) []Predicate {
	if len(filters) == 0 {
		return nil
	}
	keys := make([]string, 0, len(filters))
	for key := range filters {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make([]Predicate, 0, len(keys))
	for _, key := range keys {
		field, operator := ParsePredicateKey(key)
		if field == "" {
			continue
		}
		values := ValuesFromAny(filters[key])
		if len(values) == 0 {
			continue
		}
		out = append(out, Predicate{
			Field:    field,
			Operator: operator,
			Values:   values,
		})
	}
	return out
}

// ValuesFromAny normalizes scalar/array filter values into a string slice.
func ValuesFromAny(raw any) []string {
	return primitives.CSVStringSliceFromAny(raw)
}

// AtoiDefault converts a string to int and returns def on parse failure.
func AtoiDefault(val string, def int) int {
	if val == "" {
		return def
	}
	if n, err := strconv.Atoi(val); err == nil {
		return n
	}
	return def
}

// ToString converts common scalar values into string.
func ToString(v any) string {
	return primitives.StringFromAny(v)
}

// MapPredicates projects parsed predicates into consumer-specific predicate types.
func MapPredicates[T any](predicates []Predicate, mapper func(Predicate) T) []T {
	if len(predicates) == 0 || mapper == nil {
		return nil
	}
	out := make([]T, 0, len(predicates))
	for _, predicate := range predicates {
		out = append(out, mapper(predicate))
	}
	return out
}

// Legacy wrappers retained for same-package tests/helpers.
func toString(v any) string { return ToString(v) }
