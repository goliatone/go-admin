package admin

import "strings"

const defaultRepositoryAdapterPerPage = 10

type normalizedRepositoryAdapterListQuery struct {
	Page       int
	PerPage    int
	SortBy     string
	SortDesc   bool
	Search     string
	Predicates []ListPredicate
}

func normalizeRepositoryAdapterListQuery(opts ListOptions) normalizedRepositoryAdapterListQuery {
	perPage := opts.PerPage
	if perPage <= 0 {
		perPage = defaultRepositoryAdapterPerPage
	}

	page := max(opts.Page, 1)
	predicates := NormalizeListPredicates(opts)
	search := strings.TrimSpace(opts.Search)
	if search == "" {
		search = repositoryAdapterListSearchTerm(predicates)
	}

	return normalizedRepositoryAdapterListQuery{
		Page:       page,
		PerPage:    perPage,
		SortBy:     strings.TrimSpace(opts.SortBy),
		SortDesc:   opts.SortDesc,
		Search:     search,
		Predicates: predicates,
	}
}

func (q normalizedRepositoryAdapterListQuery) FilterPredicates() []ListPredicate {
	if len(q.Predicates) == 0 {
		return nil
	}
	out := make([]ListPredicate, 0, len(q.Predicates))
	for _, predicate := range q.Predicates {
		field := strings.ToLower(strings.TrimSpace(predicate.Field))
		if field == "" || field == "_search" || field == "search" {
			continue
		}
		out = append(out, predicate)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func repositoryAdapterListSearchTerm(predicates []ListPredicate) string {
	for _, predicate := range predicates {
		field := strings.ToLower(strings.TrimSpace(predicate.Field))
		if field != "_search" && field != "search" {
			continue
		}
		values := normalizePredicateValues(predicate.Values)
		if len(values) == 0 {
			continue
		}
		if value := strings.TrimSpace(values[0]); value != "" {
			return value
		}
	}
	return ""
}
