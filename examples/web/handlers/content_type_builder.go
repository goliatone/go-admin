package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/admin"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
)

// ContentTypeBuilderHandlers renders content type builder views.
type ContentTypeBuilderHandlers struct {
	Admin   *admin.Admin
	Config  admin.Config
	WithNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext
}

type panelReader interface {
	Get(ctx admin.AdminContext, id string) (map[string]any, error)
	Create(ctx admin.AdminContext, record map[string]any) (map[string]any, error)
	Update(ctx admin.AdminContext, id string, record map[string]any) (map[string]any, error)
}

func NewContentTypeBuilderHandlers(
	adm *admin.Admin,
	cfg admin.Config,
	withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext,
) *ContentTypeBuilderHandlers {
	return &ContentTypeBuilderHandlers{
		Admin:  adm,
		Config: cfg,
		WithNav: func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext {
			if withNav == nil {
				return ctx
			}
			return withNav(ctx, adm, cfg, active, reqCtx)
		},
	}
}

func (h *ContentTypeBuilderHandlers) ContentTypes(c router.Context) error {
	if err := guardResource(c, "admin", "read"); err != nil {
		return err
	}
	contentTypes, _, err := h.listPanelRecords(c, "content_types")
	if err != nil {
		return err
	}
	selectedID := strings.TrimSpace(c.Query("id"))
	if selectedID == "" {
		selectedID = strings.TrimSpace(c.Query("slug"))
	}
	if selectedID == "" {
		selectedID = strings.TrimSpace(c.Query("content_type"))
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":                      h.Config.Title,
		"base_path":                  h.Config.BasePath,
		"resource":                   "content_types",
		"content_types":              contentTypes,
		"selected_content_type_id":   selectedID,
		"selected_content_type_slug": selectedID,
	}, h.Admin, h.Config, "content_types", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/content-types/editor", viewCtx)
}

func (h *ContentTypeBuilderHandlers) BlockDefinitions(c router.Context) error {
	if err := guardResource(c, "admin", "read"); err != nil {
		return err
	}
	blockDefs, _, err := h.listPanelRecords(c, "block_definitions")
	if err != nil {
		return err
	}
	viewCtx := h.WithNav(router.ViewContext{
		"title":             h.Config.Title,
		"base_path":         h.Config.BasePath,
		"resource":          "block_definitions",
		"block_definitions": blockDefs,
	}, h.Admin, h.Config, "block_definitions", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/block-definitions/index", viewCtx)
}

func (h *ContentTypeBuilderHandlers) PublishContentType(c router.Context) error {
	return h.updateContentTypeStatus(c, "active")
}

func (h *ContentTypeBuilderHandlers) DeprecateContentType(c router.Context) error {
	return h.updateContentTypeStatus(c, "deprecated")
}

func (h *ContentTypeBuilderHandlers) CloneContentType(c router.Context) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	req := struct {
		Slug string `json:"slug"`
		Name string `json:"name"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	newSlug := strings.TrimSpace(req.Slug)
	if newSlug == "" {
		return goerrors.New("slug required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("SLUG_REQUIRED")
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	clone := map[string]any{}
	for k, v := range record {
		clone[k] = v
	}
	delete(clone, "id")
	delete(clone, "content_type_id")
	delete(clone, "created_at")
	delete(clone, "updated_at")
	delete(clone, "schema_version")
	clone["slug"] = newSlug
	clone["name"] = strings.TrimSpace(req.Name)
	if clone["name"] == "" {
		clone["name"] = fmt.Sprintf("%s Copy", strings.TrimSpace(anyToString(record["name"])))
	}
	clone["status"] = "draft"
	created, err := panel.Create(adminCtx, clone)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, created)
}

func (h *ContentTypeBuilderHandlers) ContentTypeCompatibility(c router.Context) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	payload := map[string]any{
		"compatible":             true,
		"breaking_changes":       []map[string]any{},
		"warnings":               []map[string]any{},
		"migration_required":     false,
		"affected_entries_count": 0,
	}
	return c.JSON(http.StatusOK, payload)
}

func (h *ContentTypeBuilderHandlers) ContentTypeVersions(c router.Context) error {
	if err := guardResource(c, "admin", "read"); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"versions": []map[string]any{}})
}

func (h *ContentTypeBuilderHandlers) PublishBlockDefinition(c router.Context) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	// Blocks do not persist status yet; respond ok so the UI can refresh.
	return c.JSON(http.StatusOK, map[string]any{"status": "active"})
}

func (h *ContentTypeBuilderHandlers) DeprecateBlockDefinition(c router.Context) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"status": "deprecated"})
}

func (h *ContentTypeBuilderHandlers) CloneBlockDefinition(c router.Context) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("block_definitions")
	if err != nil {
		return err
	}
	req := struct {
		Type string `json:"type"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	newType := strings.TrimSpace(req.Type)
	if newType == "" {
		return goerrors.New("type required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("TYPE_REQUIRED")
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("block id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	clone := map[string]any{}
	for k, v := range record {
		clone[k] = v
	}
	delete(clone, "id")
	delete(clone, "created_at")
	delete(clone, "updated_at")
	clone["type"] = newType
	if strings.TrimSpace(anyToString(clone["name"])) == "" {
		clone["name"] = fmt.Sprintf("%s Copy", strings.TrimSpace(anyToString(record["name"])))
	}
	created, err := panel.Create(adminCtx, clone)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, created)
}

func (h *ContentTypeBuilderHandlers) BlockDefinitionVersions(c router.Context) error {
	if err := guardResource(c, "admin", "read"); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{"versions": []map[string]any{}})
}

func (h *ContentTypeBuilderHandlers) BlockDefinitionCategories(c router.Context) error {
	if err := guardResource(c, "admin", "read"); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{
		"categories": []string{"content", "media", "layout", "interactive", "custom"},
	})
}

func (h *ContentTypeBuilderHandlers) listPanelRecords(c router.Context, panelName string) ([]map[string]any, int, error) {
	if h.Admin == nil || h.Admin.Registry() == nil {
		return nil, 0, nil
	}
	panel, ok := h.Admin.Registry().Panel(panelName)
	if !ok || panel == nil {
		return nil, 0, nil
	}
	search := strings.TrimSpace(c.Query("search"))
	opts := admin.ListOptions{
		PerPage: 200,
		Search:  search,
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	return panel.List(adminCtx, opts)
}

func (h *ContentTypeBuilderHandlers) panelFor(name string) (panelReader, error) {
	if h.Admin == nil || h.Admin.Registry() == nil {
		return nil, goerrors.New("admin not configured", goerrors.CategoryInternal).
			WithCode(http.StatusInternalServerError).
			WithTextCode("ADMIN_UNAVAILABLE")
	}
	panel, ok := h.Admin.Registry().Panel(name)
	if !ok || panel == nil {
		return nil, goerrors.New("panel not found", goerrors.CategoryInternal).
			WithCode(http.StatusNotFound).
			WithTextCode("PANEL_NOT_FOUND")
	}
	return panel, nil
}

func (h *ContentTypeBuilderHandlers) updateContentTypeStatus(c router.Context, status string) error {
	if err := guardResource(c, "admin", "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	if record, err := panel.Get(adminCtx, id); err == nil && record != nil {
		if actualID := strings.TrimSpace(anyToString(record["content_type_id"])); actualID != "" {
			id = actualID
		}
	}
	updated, err := panel.Update(adminCtx, id, map[string]any{
		"status": status,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func parseJSONBody(c router.Context, target any) error {
	if c == nil || target == nil {
		return nil
	}
	body := c.Body()
	if len(body) == 0 {
		return nil
	}
	if err := json.Unmarshal(body, target); err != nil {
		return goerrors.New("invalid json payload", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("INVALID_JSON")
	}
	return nil
}
