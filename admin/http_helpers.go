package admin

import (
	"encoding/json"
	"errors"
	"strconv"

	router "github.com/goliatone/go-router"
)

func writeJSON(c router.Context, payload any) error {
	return c.JSON(200, payload)
}

func writeError(c router.Context, err error) error {
	status := 500
	if errors.Is(err, ErrForbidden) {
		status = 403
	} else if errors.Is(err, ErrFeatureDisabled) {
		status = 404
	} else if errors.Is(err, ErrNotFound) {
		status = 404
	}
	c.Status(status)
	return c.JSON(status, map[string]any{"error": err.Error()})
}

func parseJSONBody(c router.Context) (map[string]any, error) {
	var body map[string]any
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return nil, err
	}
	return body, nil
}

// parseListOptions extracts pagination/sort/search/filter params from query string.
// Filters are collected from query parameters with the prefix "filter_".
func parseListOptions(c router.Context) ListOptions {
	page := atoiDefault(c.Query("page"), 1)
	per := atoiDefault(c.Query("per_page"), 10)
	sort := c.Query("sort")
	sortDesc := c.Query("sort_desc") == "true"
	search := c.Query("search")

	filters := map[string]any{}
	for key, val := range c.Queries() {
		if len(val) == 0 {
			continue
		}
		if len(key) > len("filter_") && key[:7] == "filter_" {
			filters[key[7:]] = val[0]
		}
	}

	return ListOptions{
		Page:     page,
		PerPage:  per,
		SortBy:   sort,
		SortDesc: sortDesc,
		Search:   search,
		Filters:  filters,
	}
}

func atoiDefault(val string, def int) int {
	if val == "" {
		return def
	}
	if n, err := strconv.Atoi(val); err == nil {
		return n
	}
	return def
}
