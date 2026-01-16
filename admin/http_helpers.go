package admin

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

func writeJSON(c router.Context, payload any) error {
	return c.JSON(200, payload)
}

func writeHTML(c router.Context, html string) error {
	c.SetHeader("Content-Type", "text/html; charset=utf-8")
	c.Status(200)
	return c.Send([]byte(html))
}

func writeError(c router.Context, err error) error {
	mapped, status := mapErrorForResponse(c, err)
	if mapped == nil {
		mapped = goerrors.New("unknown error", goerrors.CategoryInternal).WithCode(status)
	}
	c.Status(status)
	return c.JSON(status, mapped.ToErrorResponse(false, nil))
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

	// Also support go-crud style "order" parameter (e.g., "role asc" or "role desc")
	if sort == "" {
		if order := c.Query("order"); order != "" {
			parts := strings.Fields(order)
			if len(parts) > 0 {
				sort = parts[0]
				if len(parts) > 1 {
					sortDesc = strings.ToLower(parts[1]) == "desc"
				}
			}
		}
	}

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

func parseCommandIDs(body map[string]any, queryID string, queryIDs string) []string {
	ids := []string{}
	ids = append(ids, splitIDs(queryID)...)
	ids = append(ids, splitIDs(queryIDs)...)

	if len(body) > 0 {
		ids = append(ids, toString(body["id"]))
		ids = append(ids, toStringSlice(body["ids"])...)

		if selection := extractMap(body["selection"]); len(selection) > 0 {
			ids = append(ids, toString(selection["id"]))
			ids = append(ids, toStringSlice(selection["ids"])...)
		}
		if record := extractMap(body["record"]); len(record) > 0 {
			ids = append(ids, toString(record["id"]))
		}
	}

	return dedupeStrings(ids)
}

func splitIDs(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.FieldsFunc(value, func(r rune) bool {
		return r == ',' || r == ';'
	})
	out := []string{}
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
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

func extractMap(val any) map[string]any {
	if m, ok := val.(map[string]any); ok {
		return m
	}
	return map[string]any{}
}

func mapErrorForResponse(c router.Context, err error) (*goerrors.Error, int) {
	mapped, status := toGoError(err)
	if mapped == nil {
		mapped = goerrors.New("internal error", goerrors.CategoryInternal).WithCode(http.StatusInternalServerError)
		status = http.StatusInternalServerError
	}
	if mapped.Metadata == nil {
		mapped.Metadata = map[string]any{}
	}
	if c != nil {
		mapped.Metadata["path"] = c.Path()
		mapped.Metadata["method"] = c.Method()
	}
	if mapped.Timestamp.IsZero() {
		mapped.Timestamp = time.Now()
	}
	return mapped, status
}

func toGoError(err error) (*goerrors.Error, int) {
	status := http.StatusInternalServerError
	if err == nil {
		return goerrors.New("unknown error", goerrors.CategoryInternal).WithCode(status), status
	}

	var mapped *goerrors.Error
	var validation SettingsValidationErrors
	var invalid InvalidFeatureConfigError
	var permission PermissionDeniedError

	switch {
	case errors.As(err, &validation):
		mapped = goerrors.New("validation failed", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("VALIDATION_ERROR").
			WithMetadata(map[string]any{
				"fields": validation.Fields,
				"scope":  validation.Scope,
			})
		status = http.StatusBadRequest
	case errors.As(err, &invalid):
		mapped = goerrors.Wrap(err, goerrors.CategoryValidation, err.Error()).
			WithCode(http.StatusBadRequest).
			WithTextCode("INVALID_FEATURE_CONFIG")
		issues := []map[string]any{}
		for _, issue := range invalid.Issues {
			issues = append(issues, map[string]any{
				"feature": issue.Feature,
				"missing": issue.Missing,
			})
		}
		mapped.Metadata = map[string]any{
			"issues": issues,
		}
		status = http.StatusBadRequest
	case errors.As(err, &permission):
		mapped = goerrors.Wrap(err, goerrors.CategoryAuthz, err.Error()).
			WithCode(http.StatusForbidden).
			WithTextCode("FORBIDDEN")
		meta := map[string]any{}
		if permission.Permission != "" {
			meta["permission"] = permission.Permission
		}
		if permission.Resource != "" {
			meta["resource"] = permission.Resource
		}
		if len(meta) > 0 {
			mapped.Metadata = meta
		}
		status = http.StatusForbidden
	case errors.Is(err, ErrForbidden):
		mapped = goerrors.Wrap(err, goerrors.CategoryAuthz, err.Error()).
			WithCode(http.StatusForbidden).
			WithTextCode("FORBIDDEN")
		status = http.StatusForbidden
	case errors.Is(err, ErrREPLSessionLimit):
		mapped = goerrors.Wrap(err, goerrors.CategoryRateLimit, err.Error()).
			WithCode(http.StatusTooManyRequests).
			WithTextCode("REPL_SESSION_LIMIT")
		status = http.StatusTooManyRequests
	case errors.Is(err, ErrFeatureDisabled):
		mapped = goerrors.Wrap(err, goerrors.CategoryNotFound, err.Error()).
			WithCode(http.StatusNotFound).
			WithTextCode("FEATURE_DISABLED")
		status = http.StatusNotFound
	case errors.Is(err, ErrNotFound):
		mapped = goerrors.Wrap(err, goerrors.CategoryNotFound, err.Error()).
			WithCode(http.StatusNotFound).
			WithTextCode("NOT_FOUND")
		status = http.StatusNotFound
	}

	if mapped == nil {
		if errors.As(err, &mapped) && mapped != nil {
			if mapped.Code != 0 {
				status = mapped.Code
			}
		} else {
			mapped = goerrors.MapToError(err, goerrors.DefaultErrorMappers())
			if mapped != nil && mapped.Code != 0 {
				status = mapped.Code
			}
		}
	}

	if mapped == nil {
		return goerrors.New(err.Error(), goerrors.CategoryInternal).WithCode(status), status
	}

	if mapped.Code == 0 {
		mapped.Code = status
	}
	if mapped.TextCode == "" {
		mapped.TextCode = goerrors.HTTPStatusToTextCode(mapped.Code)
	}
	if mapped.Category == "" {
		mapped.Category = goerrors.CategoryInternal
	}
	return mapped, status
}
