package handlers

import (
	"context"
	"path"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
)

type MediaHandlers struct {
	Store   *stores.MediaStore
	Admin   *admin.Admin
	Config  admin.Config
	WithNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context, c router.Context) router.ViewContext
}

func NewMediaHandlers(store *stores.MediaStore, adm *admin.Admin, cfg admin.Config, withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context, c router.Context) router.ViewContext) *MediaHandlers {
	return &MediaHandlers{Store: store, Admin: adm, Config: cfg, WithNav: withNav}
}

func (h *MediaHandlers) List(c router.Context) error {
	if err := guardResource(c, "admin.media", "read"); err != nil {
		return err
	}
	ctx := c.Context()
	items, total, err := h.Store.List(ctx, admin.ListOptions{})
	if err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "media")
	columns := mediaDataGridColumns()
	for i := range items {
		id := items[i]["id"]
		items[i]["actions"] = routes.ActionsMap(id)
	}
	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "media",
		"resource_label": "Media",
		"routes":         routes.RoutesMap(),
		"items":          items,
		"columns":        columns,
		"total":          total,
		"export_config":  helpers.BuildExportConfig(h.Config, "media", ""),
	}, h.Admin, h.Config, setup.NavigationSectionContent+".media", c.Context(), c)
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/media/list", viewCtx)
}

func (h *MediaHandlers) New(c router.Context) error {
	if err := guardResource(c, "admin.media", "create"); err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "media")
	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "media",
		"resource_label": "Media",
		"routes":         routes.RoutesMap(),
		"is_edit":        false,
	}, h.Admin, h.Config, setup.NavigationSectionContent+".media", c.Context(), c)
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/media/form", viewCtx)
}

func (h *MediaHandlers) Create(c router.Context) error {
	if err := guardResource(c, "admin.media", "create"); err != nil {
		return err
	}
	ctx := c.Context()
	record := map[string]any{
		"filename":    c.FormValue("filename"),
		"type":        c.FormValue("type"),
		"size":        c.FormValue("size"),
		"url":         c.FormValue("url"),
		"uploaded_by": c.FormValue("uploaded_by"),
		"alt_text":    c.FormValue("alt_text"),
		"caption":     c.FormValue("caption"),
	}
	if _, err := h.Store.Create(ctx, record); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "media"))
}

func (h *MediaHandlers) Detail(c router.Context) error {
	if err := guardResource(c, "admin.media", "read"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	item, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "media")
	fields := []map[string]any{
		{"label": "Filename", "value": item["filename"]},
		{"label": "Type", "value": item["type"]},
		{"label": "Size", "value": item["size"]},
		{"label": "URL", "value": item["url"]},
		{"label": "Uploaded By", "value": item["uploaded_by"]},
		{"label": "Alt Text", "value": item["alt_text"]},
		{"label": "Caption", "value": item["caption"]},
	}
	item["actions"] = routes.ActionsMap(id)

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "media",
		"resource_label": "Media",
		"routes":         routes.RoutesMap(),
		"resource_item":  item,
		"fields":         fields,
	}, h.Admin, h.Config, setup.NavigationSectionContent+".media", c.Context(), c)
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/media/detail", viewCtx)
}

func (h *MediaHandlers) Edit(c router.Context) error {
	if err := guardResource(c, "admin.media", "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	item, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "media")
	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "media",
		"resource_label": "Media",
		"routes":         routes.RoutesMap(),
		"is_edit":        true,
		"item":           item,
	}, h.Admin, h.Config, setup.NavigationSectionContent+".media", c.Context(), c)
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/media/form", viewCtx)
}

func (h *MediaHandlers) Update(c router.Context) error {
	if err := guardResource(c, "admin.media", "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	existing, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	updated := cloneRecord(existing)
	updated["filename"] = c.FormValue("filename")
	updated["type"] = c.FormValue("type")
	updated["size"] = c.FormValue("size")
	updated["url"] = c.FormValue("url")
	updated["uploaded_by"] = c.FormValue("uploaded_by")
	updated["alt_text"] = c.FormValue("alt_text")
	updated["caption"] = c.FormValue("caption")

	if _, err := h.Store.Update(ctx, id, updated); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "media"))
}

func (h *MediaHandlers) Delete(c router.Context) error {
	if err := guardResource(c, "admin.media", "delete"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	if err := h.Store.Delete(ctx, id); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "media"))
}

func guardResource(c router.Context, resource, action string) error {
	if c == nil {
		return goerrors.New("missing context", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}
	claims, ok := authlib.GetClaims(c.Context())
	if !ok || claims == nil {
		return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}
	if action == "delete" {
		if claims.HasRole(string(authlib.RoleAdmin)) || claims.IsAtLeast(string(authlib.RoleAdmin)) {
			return nil
		}
	}
	if authlib.Can(c.Context(), resource, action) {
		return nil
	}
	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FORBIDDEN")
}

func cloneRecord(rec map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range rec {
		out[k] = v
	}
	return out
}
