package admin

import "strings"

func inMemoryListSearchTerm(opts ListOptions) string {
	search := strings.ToLower(strings.TrimSpace(opts.Search))
	if search != "" {
		return search
	}
	if opts.Filters == nil {
		return ""
	}
	if term, ok := opts.Filters["_search"].(string); ok {
		return strings.ToLower(strings.TrimSpace(term))
	}
	return ""
}

func paginateInMemory[T any](items []T, opts ListOptions, defaultPerPage int) ([]T, int) {
	total := len(items)
	page := opts.Page
	if page <= 0 {
		page = 1
	}
	perPage := opts.PerPage
	if perPage <= 0 {
		perPage = defaultPerPage
	}
	if perPage <= 0 {
		perPage = 10
	}
	start := (page - 1) * perPage
	if start > total {
		start = total
	}
	end := start + perPage
	if end > total {
		end = total
	}
	return items[start:end], total
}

func listOptionsForSearch(query string, limit int, fallback int) ListOptions {
	perPage := limit
	if perPage <= 0 {
		perPage = fallback
	}
	if perPage <= 0 {
		perPage = 5
	}
	return ListOptions{Search: query, Page: 1, PerPage: perPage}
}

func mergeMapInto(base map[string]any, updates map[string]any) map[string]any {
	if updates == nil {
		return base
	}
	if base == nil {
		base = map[string]any{}
	}
	for key, value := range updates {
		base[key] = value
	}
	return base
}

func normalizeScopedMembers[T any](members []T, userIDFn func(T) string, normalizeFn func(T) T) []T {
	out := make([]T, 0, len(members))
	for _, member := range members {
		if strings.TrimSpace(userIDFn(member)) == "" {
			continue
		}
		out = append(out, normalizeFn(member))
	}
	return out
}

func cloneScopedMembers[T any](members []T, cloneFn func(T) T) []T {
	out := make([]T, 0, len(members))
	for _, member := range members {
		out = append(out, cloneFn(member))
	}
	return out
}
