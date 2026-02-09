package admin

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/listquery"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
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
	presenter := DefaultErrorPresenter()
	mapped, status := presenter.PresentWithContext(c, err)
	if mapped == nil {
		mapped = goerrors.New("unknown error", goerrors.CategoryInternal).WithCode(status)
	}
	c.Status(status)
	includeStack := presenter.IncludeStackTrace()
	return c.JSON(status, mapped.ToErrorResponse(includeStack, mapped.StackTrace))
}

func parseJSONBody(c router.Context) (map[string]any, error) {
	var body map[string]any
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return nil, err
	}
	return body, nil
}

// parseListOptions extracts pagination/sort/search/filter params from query string.
// Filters preserve operator-qualified keys (for example status__in, title__ilike).
func parseListOptions(c router.Context) ListOptions {
	opts := listquery.ParseOptions(c, 1, 10, func(predicate listquery.Predicate) ListPredicate {
		return ListPredicate{
			Field:    predicate.Field,
			Operator: predicate.Operator,
			Values:   append([]string{}, predicate.Values...),
		}
	})
	return ListOptions(opts)
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

func collectJSONSchemaFields(err *jsonschema.ValidationError, fields map[string]string) {
	if err == nil || fields == nil {
		return
	}
	if len(err.Causes) == 0 {
		field := jsonSchemaFieldName(err.InstanceLocation)
		message := strings.TrimSpace(err.Message)
		if message == "" {
			message = strings.TrimSpace(err.Error())
		}
		if existing, ok := fields[field]; ok && existing != "" {
			fields[field] = existing + "; " + message
		} else {
			fields[field] = message
		}
		return
	}
	for _, cause := range err.Causes {
		collectJSONSchemaFields(cause, fields)
	}
}

func jsonSchemaFieldName(location string) string {
	trimmed := strings.TrimSpace(location)
	trimmed = strings.TrimPrefix(trimmed, "/")
	trimmed = strings.TrimPrefix(trimmed, "#")
	trimmed = strings.TrimPrefix(trimmed, "/")
	trimmed = strings.ReplaceAll(trimmed, "/", ".")
	if trimmed == "" {
		return "schema"
	}
	return trimmed
}

func isSchemaValidationMessage(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "schema validation failed") ||
		strings.Contains(msg, "schema invalid") ||
		strings.Contains(msg, "schema does not validate")
}
