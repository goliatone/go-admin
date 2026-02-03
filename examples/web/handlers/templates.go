package handlers

import (
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/web/stores"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
)

// ListTemplates returns a handler that lists CMS templates for relationship selectors.
func ListTemplates(store *stores.TemplateStore) func(router.Context) error {
	return func(c router.Context) error {
		if err := guardResource(c, "admin.pages", "read"); err != nil {
			return err
		}
		if store == nil {
			return goerrors.New("template store unavailable", goerrors.CategoryInternal).
				WithCode(goerrors.CodeInternal).
				WithTextCode("TEMPLATE_STORE_UNAVAILABLE")
		}

		query := strings.TrimSpace(c.Query("q", ""))
		limit := parseOptionalInt(strings.TrimSpace(c.Query("limit", "")))
		ids := parseIDList(c.Query("id", ""), c.Query("ids", ""))

		templates, err := store.List(c.Context(), query, ids, limit)
		if err != nil {
			return err
		}

		return c.JSON(http.StatusOK, map[string]any{"data": templates})
	}
}

func parseIDList(primary, secondary string) []string {
	raw := strings.TrimSpace(primary)
	if raw == "" {
		raw = strings.TrimSpace(secondary)
	}
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}
