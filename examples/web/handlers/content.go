package handlers

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	"github.com/goliatone/go-router"
)

const (
	pageFormSource      = "pages.json"
	createPageOperation = "createPage"
	updatePageOperation = "updatePage"

	postFormSource      = "posts.json"
	createPostOperation = "createPost"
	updatePostOperation = "updatePost"
)

type PageHandlers struct {
	Store         stores.PageRepository
	FormGenerator *formgenorchestrator.Orchestrator
	Admin         *admin.Admin
	Config        admin.Config
	WithNav       func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext
}

func NewPageHandlers(store stores.PageRepository, formGen *formgenorchestrator.Orchestrator, adm *admin.Admin, cfg admin.Config, withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext) *PageHandlers {
	return &PageHandlers{Store: store, FormGenerator: formGen, Admin: adm, Config: cfg, WithNav: withNav}
}

func (h *PageHandlers) List(c router.Context) error {
	if err := guardResource(c, "admin.pages", "read"); err != nil {
		return err
	}
	ctx := c.Context()
	pages, total, err := h.Store.List(ctx, admin.ListOptions{})
	if err != nil {
		return err
	}

	routes := helpers.NewResourceRoutes(h.Config.BasePath, "pages")
	columns := pageDataGridColumns()
	for i := range pages {
		id := pages[i]["id"]
		pages[i]["actions"] = routes.ActionsMap(id)
	}

	bulkCtx := helpers.BuildBulkActionContext(h.Admin, "pages", h.Config.BasePath, c.Context())
	viewCtx := h.WithNav(router.ViewContext{
		"title":                 h.Config.Title,
		"base_path":             h.Config.BasePath,
		"resource":              "pages",
		"resource_label":        "Pages",
		"routes":                routes.RoutesMap(),
		"items":                 pages,
		"columns":               columns,
		"total":                 total,
		"export_config":         helpers.BuildExportConfig(h.Config, "pages", ""),
		"bulk_actions_primary":  bulkCtx.Primary,
		"bulk_actions_overflow": bulkCtx.Overflow,
		"bulk_base":             bulkCtx.BaseURL,
	}, h.Admin, h.Config, setup.NavigationSectionContent+".pages", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/pages/list", viewCtx)
}

func (h *PageHandlers) New(c router.Context) error {
	if err := guardResource(c, "admin.pages", "create"); err != nil {
		return err
	}
	opts := formgenrender.RenderOptions{
		Values: map[string]any{
			"locale": defaultLocale("", h.Config.DefaultLocale),
			"status": "draft",
		},
	}
	return h.renderPageForm(c, createPageOperation, opts, "")
}

func (h *PageHandlers) Create(c router.Context) error {
	if err := guardResource(c, "admin.pages", "create"); err != nil {
		return err
	}
	locale := resolveLocaleInput(c.FormValue("locale"), "", h.Config.DefaultLocale)
	record := map[string]any{
		"title":                c.FormValue("title"),
		"slug":                 c.FormValue("slug"),
		"path":                 c.FormValue("path"),
		"content":              c.FormValue("content"),
		"status":               c.FormValue("status"),
		"locale":               locale,
		"meta_title":           c.FormValue("meta_title"),
		"meta_description":     c.FormValue("meta_description"),
		"template_id":          c.FormValue("template_id"),
		"parent_id":            c.FormValue("parent_id"),
		"translation_group_id": c.FormValue("translation_group_id"),
	}
	if blocks := strings.TrimSpace(c.FormValue("blocks")); blocks != "" {
		record["blocks"] = blocks
	}
	panel, err := resolvePanel(h.Admin, "pages")
	if err != nil {
		return err
	}
	adminCtx := adminContextFromRequest(c, locale)
	if _, err := panel.Create(adminCtx, record); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "pages"))
}

func (h *PageHandlers) Detail(c router.Context) error {
	if err := guardResource(c, "admin.pages", "read"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	page, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "pages")
	fields := []map[string]any{
		{"label": "Title", "value": page["title"]},
		{"label": "Slug", "value": page["slug"]},
		{"label": "Status", "value": page["status"]},
		{"label": "Content", "value": page["content"]},
		{"label": "Meta Title", "value": page["meta_title"]},
		{"label": "Meta Description", "value": page["meta_description"]},
		{"label": "Updated", "value": page["updated_at"]},
	}
	page["actions"] = routes.ActionsMap(id)

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "pages",
		"resource_label": "Pages",
		"routes":         routes.RoutesMap(),
		"resource_item":  page,
		"fields":         fields,
	}, h.Admin, h.Config, setup.NavigationSectionContent+".pages", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/pages/detail", viewCtx)
}

func (h *PageHandlers) Edit(c router.Context) error {
	if err := guardResource(c, "admin.pages", "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	page, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	values := cloneRecord(page)
	if title := strings.TrimSpace(anyToString(values["title"])); title == "" {
		if data, ok := page["data"].(map[string]any); ok {
			title = strings.TrimSpace(anyToString(data["title"]))
		}
		if title == "" {
			title = strings.TrimSpace(anyToString(page["meta_title"]))
		}
		if title != "" {
			values["title"] = title
		}
	}
	if parentID := strings.TrimSpace(anyToString(page["parent_id"])); parentID != "" {
		values["parent_id"] = parentID
	}
	if templateID := strings.TrimSpace(anyToString(page["template_id"])); templateID != "" {
		values["template_id"] = templateID
	}
	if groupID := strings.TrimSpace(anyToString(page["translation_group_id"])); groupID != "" {
		values["translation_group_id"] = formgenrender.ValueWithProvenance{
			Value:    groupID,
			Readonly: true,
		}
	}
	previewURL := ""
	if token, err := previewToken(h.Admin, "pages", id); err == nil && token != "" {
		previewURL = buildPreviewURL(resolvePagePreviewPath(page), token)
	} else if err != nil {
		return err
	}
	return h.renderPageForm(c, updatePageOperation, formgenrender.RenderOptions{Values: values}, previewURL)
}

func (h *PageHandlers) Update(c router.Context) error {
	if err := guardResource(c, "admin.pages", "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	existing, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	locale := resolveLocaleInput(c.FormValue("locale"), anyToString(existing["locale"]), h.Config.DefaultLocale)
	targetStatus := strings.ToLower(strings.TrimSpace(c.FormValue("status")))
	updated := map[string]any{
		"title":                c.FormValue("title"),
		"slug":                 c.FormValue("slug"),
		"path":                 c.FormValue("path"),
		"content":              c.FormValue("content"),
		"status":               targetStatus,
		"locale":               locale,
		"meta_title":           c.FormValue("meta_title"),
		"meta_description":     c.FormValue("meta_description"),
		"template_id":          c.FormValue("template_id"),
		"parent_id":            c.FormValue("parent_id"),
		"translation_group_id": c.FormValue("translation_group_id"),
	}
	if blocks := strings.TrimSpace(c.FormValue("blocks")); blocks != "" {
		updated["blocks"] = blocks
	}
	applyWorkflowTransition(updated, strings.ToLower(anyToString(existing["status"])), targetStatus)
	panel, err := resolvePanel(h.Admin, "pages")
	if err != nil {
		return err
	}
	adminCtx := adminContextFromRequest(c, locale)
	if _, err := panel.Update(adminCtx, id, updated); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "pages"))
}

func (h *PageHandlers) Delete(c router.Context) error {
	if err := guardResource(c, "admin.pages", "delete"); err != nil {
		return err
	}
	id := c.Param("id")
	panel, err := resolvePanel(h.Admin, "pages")
	if err != nil {
		return err
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	if err := panel.Delete(adminCtx, id); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "pages"))
}

func (h *PageHandlers) Publish(c router.Context) error {
	if err := guardResource(c, "admin.pages", "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	existing, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	targetStatus := "published"
	update := map[string]any{"status": targetStatus}
	applyWorkflowTransition(update, strings.ToLower(anyToString(existing["status"])), targetStatus)
	panel, err := resolvePanel(h.Admin, "pages")
	if err != nil {
		return err
	}
	locale := resolveLocaleInput("", anyToString(existing["locale"]), h.Config.DefaultLocale)
	adminCtx := adminContextFromRequest(c, locale)
	if _, err := panel.Update(adminCtx, id, update); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "pages", id))
}

func (h *PageHandlers) Unpublish(c router.Context) error {
	if err := guardResource(c, "admin.pages", "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	existing, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	targetStatus := "draft"
	update := map[string]any{"status": targetStatus}
	applyWorkflowTransition(update, strings.ToLower(anyToString(existing["status"])), targetStatus)
	panel, err := resolvePanel(h.Admin, "pages")
	if err != nil {
		return err
	}
	locale := resolveLocaleInput("", anyToString(existing["locale"]), h.Config.DefaultLocale)
	adminCtx := adminContextFromRequest(c, locale)
	if _, err := panel.Update(adminCtx, id, update); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "pages", id))
}

type PostHandlers struct {
	Store         stores.PostRepository
	FormGenerator *formgenorchestrator.Orchestrator
	Admin         *admin.Admin
	Config        admin.Config
	WithNav       func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext
}

func NewPostHandlers(store stores.PostRepository, formGen *formgenorchestrator.Orchestrator, adm *admin.Admin, cfg admin.Config, withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext) *PostHandlers {
	return &PostHandlers{Store: store, FormGenerator: formGen, Admin: adm, Config: cfg, WithNav: withNav}
}

func (h *PostHandlers) List(c router.Context) error {
	if err := guardResource(c, "admin.posts", "read"); err != nil {
		return err
	}
	ctx := c.Context()
	posts, total, err := h.Store.List(ctx, admin.ListOptions{})
	if err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "posts")
	columns := postDataGridColumns()
	for i := range posts {
		id := posts[i]["id"]
		posts[i]["actions"] = routes.ActionsMap(id)
	}
	bulkCtx := helpers.BuildBulkActionContext(h.Admin, "posts", h.Config.BasePath, c.Context())
	viewCtx := h.WithNav(router.ViewContext{
		"title":                 h.Config.Title,
		"base_path":             h.Config.BasePath,
		"resource":              "posts",
		"resource_label":        "Posts",
		"routes":                routes.RoutesMap(),
		"items":                 posts,
		"columns":               columns,
		"total":                 total,
		"export_config":         helpers.BuildExportConfig(h.Config, "posts", ""),
		"bulk_actions_primary":  bulkCtx.Primary,
		"bulk_actions_overflow": bulkCtx.Overflow,
		"bulk_base":             bulkCtx.BaseURL,
	}, h.Admin, h.Config, setup.NavigationSectionContent+".posts", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/posts/list", viewCtx)
}

func (h *PostHandlers) New(c router.Context) error {
	if err := guardResource(c, "admin.posts", "create"); err != nil {
		return err
	}
	opts := formgenrender.RenderOptions{
		Values: map[string]any{
			"locale": defaultLocale("", h.Config.DefaultLocale),
			"status": "draft",
		},
	}
	return h.renderPostForm(c, createPostOperation, opts, "")
}

func (h *PostHandlers) Create(c router.Context) error {
	if err := guardResource(c, "admin.posts", "create"); err != nil {
		return err
	}
	locale := resolveLocaleInput(c.FormValue("locale"), "", h.Config.DefaultLocale)
	record := map[string]any{
		"title":                c.FormValue("title"),
		"slug":                 c.FormValue("slug"),
		"path":                 c.FormValue("path"),
		"content":              c.FormValue("content"),
		"excerpt":              c.FormValue("excerpt"),
		"author":               c.FormValue("author"),
		"category":             c.FormValue("category"),
		"status":               c.FormValue("status"),
		"featured_image":       c.FormValue("featured_image"),
		"tags":                 c.FormValue("tags"),
		"published_at":         c.FormValue("published_at"),
		"meta_title":           c.FormValue("meta_title"),
		"meta_description":     c.FormValue("meta_description"),
		"locale":               locale,
		"translation_group_id": c.FormValue("translation_group_id"),
	}
	if blocks := strings.TrimSpace(c.FormValue("blocks")); blocks != "" {
		record["blocks"] = blocks
	}
	panel, err := resolvePanel(h.Admin, "posts")
	if err != nil {
		return err
	}
	adminCtx := adminContextFromRequest(c, locale)
	if _, err := panel.Create(adminCtx, record); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "posts"))
}

func (h *PostHandlers) Detail(c router.Context) error {
	if err := guardResource(c, "admin.posts", "read"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	post, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "posts")
	fields := []map[string]any{
		{"label": "Title", "value": post["title"]},
		{"label": "Slug", "value": post["slug"]},
		{"label": "Author", "value": post["author"]},
		{"label": "Category", "value": post["category"]},
		{"label": "Status", "value": post["status"]},
		{"label": "Excerpt", "value": post["excerpt"]},
		{"label": "Content", "value": post["content"]},
		{"label": "Tags", "value": post["tags"]},
		{"label": "Featured Image", "value": post["featured_image"]},
		{"label": "Published At", "value": post["published_at"]},
	}
	post["actions"] = routes.ActionsMap(id)

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "posts",
		"resource_label": "Posts",
		"routes":         routes.RoutesMap(),
		"resource_item":  post,
		"fields":         fields,
	}, h.Admin, h.Config, setup.NavigationSectionContent+".posts", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/posts/detail", viewCtx)
}

func (h *PostHandlers) Edit(c router.Context) error {
	if err := guardResource(c, "admin.posts", "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	post, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	values := cloneRecord(post)
	if tags := tagsToCSV(post["tags"]); tags != "" {
		values["tags"] = tags
	}
	if groupID := strings.TrimSpace(anyToString(post["translation_group_id"])); groupID != "" {
		values["translation_group_id"] = formgenrender.ValueWithProvenance{
			Value:    groupID,
			Readonly: true,
		}
	}
	previewURL := ""
	if token, err := previewToken(h.Admin, "posts", id); err == nil && token != "" {
		previewURL = buildPreviewURL(resolvePostPreviewPath(post), token)
	} else if err != nil {
		return err
	}
	return h.renderPostForm(c, updatePostOperation, formgenrender.RenderOptions{Values: values}, previewURL)
}

func (h *PostHandlers) Update(c router.Context) error {
	if err := guardResource(c, "admin.posts", "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	existing, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	locale := resolveLocaleInput(c.FormValue("locale"), anyToString(existing["locale"]), h.Config.DefaultLocale)
	targetStatus := strings.ToLower(strings.TrimSpace(c.FormValue("status")))
	updated := map[string]any{
		"title":                c.FormValue("title"),
		"slug":                 c.FormValue("slug"),
		"path":                 c.FormValue("path"),
		"content":              c.FormValue("content"),
		"excerpt":              c.FormValue("excerpt"),
		"author":               c.FormValue("author"),
		"category":             c.FormValue("category"),
		"status":               targetStatus,
		"featured_image":       c.FormValue("featured_image"),
		"tags":                 c.FormValue("tags"),
		"published_at":         c.FormValue("published_at"),
		"meta_title":           c.FormValue("meta_title"),
		"meta_description":     c.FormValue("meta_description"),
		"locale":               locale,
		"translation_group_id": c.FormValue("translation_group_id"),
	}
	if blocks := strings.TrimSpace(c.FormValue("blocks")); blocks != "" {
		updated["blocks"] = blocks
	}
	applyWorkflowTransition(updated, strings.ToLower(anyToString(existing["status"])), targetStatus)
	panel, err := resolvePanel(h.Admin, "posts")
	if err != nil {
		return err
	}
	adminCtx := adminContextFromRequest(c, locale)
	if _, err := panel.Update(adminCtx, id, updated); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "posts"))
}

func (h *PostHandlers) Delete(c router.Context) error {
	if err := guardResource(c, "admin.posts", "delete"); err != nil {
		return err
	}
	id := c.Param("id")
	panel, err := resolvePanel(h.Admin, "posts")
	if err != nil {
		return err
	}
	adminCtx := adminContextFromRequest(c, h.Config.DefaultLocale)
	if err := panel.Delete(adminCtx, id); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "posts"))
}

func (h *PostHandlers) Publish(c router.Context) error {
	if err := guardResource(c, "admin.posts", "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	existing, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	targetStatus := "published"
	update := map[string]any{"status": targetStatus}
	applyWorkflowTransition(update, strings.ToLower(anyToString(existing["status"])), targetStatus)
	panel, err := resolvePanel(h.Admin, "posts")
	if err != nil {
		return err
	}
	locale := resolveLocaleInput("", anyToString(existing["locale"]), h.Config.DefaultLocale)
	adminCtx := adminContextFromRequest(c, locale)
	if _, err := panel.Update(adminCtx, id, update); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "posts", id))
}

func (h *PostHandlers) Archive(c router.Context) error {
	if err := guardResource(c, "admin.posts", "edit"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	existing, err := h.Store.Get(ctx, id)
	if err != nil {
		return err
	}
	targetStatus := "archived"
	update := map[string]any{"status": targetStatus}
	applyWorkflowTransition(update, strings.ToLower(anyToString(existing["status"])), targetStatus)
	panel, err := resolvePanel(h.Admin, "posts")
	if err != nil {
		return err
	}
	locale := resolveLocaleInput("", anyToString(existing["locale"]), h.Config.DefaultLocale)
	adminCtx := adminContextFromRequest(c, locale)
	if _, err := panel.Update(adminCtx, id, update); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "posts", id))
}

func (h *PageHandlers) renderPageForm(c router.Context, operationID string, opts formgenrender.RenderOptions, previewURL string) error {
	if h.FormGenerator == nil {
		return fmt.Errorf("form generator is not configured")
	}

	html, err := h.FormGenerator.Generate(c.Context(), formgenorchestrator.Request{
		Source:        formgenopenapi.SourceFromFS(pageFormSource),
		OperationID:   operationID,
		RenderOptions: opts,
	})
	if err != nil {
		return err
	}

	isEdit := operationID == updatePageOperation
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "pages")
	if isEdit {
		id := strings.TrimSpace(c.Param("id"))
		html = rewriteFormAction(html, h.Config.BasePath, "pages", id)
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "pages",
		"resource_label": "Pages",
		"routes":         routes.RoutesMap(),
		"is_edit":        isEdit,
		"form_html":      string(html),
		"preview_url":    previewURL,
	}, h.Admin, h.Config, setup.NavigationSectionContent+".pages", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/pages/form", viewCtx)
}

func (h *PostHandlers) renderPostForm(c router.Context, operationID string, opts formgenrender.RenderOptions, previewURL string) error {
	if h.FormGenerator == nil {
		return fmt.Errorf("form generator is not configured")
	}

	html, err := h.FormGenerator.Generate(c.Context(), formgenorchestrator.Request{
		Source:        formgenopenapi.SourceFromFS(postFormSource),
		OperationID:   operationID,
		RenderOptions: opts,
	})
	if err != nil {
		return err
	}

	isEdit := operationID == updatePostOperation
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "posts")
	if isEdit {
		id := strings.TrimSpace(c.Param("id"))
		html = rewriteFormAction(html, h.Config.BasePath, "posts", id)
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "posts",
		"resource_label": "Posts",
		"routes":         routes.RoutesMap(),
		"is_edit":        isEdit,
		"form_html":      string(html),
		"preview_url":    previewURL,
	}, h.Admin, h.Config, setup.NavigationSectionContent+".posts", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/posts/form", viewCtx)
}

type MediaHandlers struct {
	Store   *stores.MediaStore
	Admin   *admin.Admin
	Config  admin.Config
	WithNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext
}

func NewMediaHandlers(store *stores.MediaStore, adm *admin.Admin, cfg admin.Config, withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext) *MediaHandlers {
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
	}, h.Admin, h.Config, setup.NavigationSectionContent+".media", c.Context())
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
	}, h.Admin, h.Config, setup.NavigationSectionContent+".media", c.Context())
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
	}, h.Admin, h.Config, setup.NavigationSectionContent+".media", c.Context())
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
	}, h.Admin, h.Config, setup.NavigationSectionContent+".media", c.Context())
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
	if claims, ok := authlib.GetClaims(c.Context()); !ok || claims == nil {
		return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}
	if authlib.Can(c.Context(), resource, action) {
		return nil
	}
	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FORBIDDEN")
}

type panelCRUD interface {
	Create(ctx admin.AdminContext, record map[string]any) (map[string]any, error)
	Update(ctx admin.AdminContext, id string, record map[string]any) (map[string]any, error)
	Delete(ctx admin.AdminContext, id string) error
}

func resolvePanel(adm *admin.Admin, name string) (panelCRUD, error) {
	if adm == nil {
		return nil, goerrors.New("admin not configured", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("ADMIN_UNAVAILABLE")
	}
	panel, ok := adm.Registry().Panel(name)
	if !ok || panel == nil {
		return nil, goerrors.New("panel not found", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("PANEL_NOT_FOUND")
	}
	return panel, nil
}

func adminContextFromRequest(c router.Context, locale string) admin.AdminContext {
	if c == nil {
		return admin.AdminContext{Locale: locale}
	}
	ctx := c.Context()
	userID := strings.TrimSpace(c.Header("X-User-ID"))
	tenantID := ""
	orgID := ""
	if actor, ok := authlib.ActorFromRouterContext(c); ok && actor != nil {
		if actor.ActorID != "" {
			userID = actor.ActorID
		} else if actor.Subject != "" {
			userID = actor.Subject
		}
		if actor.TenantID != "" {
			tenantID = actor.TenantID
		}
		if actor.OrganizationID != "" {
			orgID = actor.OrganizationID
		}
		ctx = authlib.WithActorContext(ctx, actor)
	}
	return admin.AdminContext{
		Context:  ctx,
		UserID:   userID,
		TenantID: tenantID,
		OrgID:    orgID,
		Locale:   locale,
	}
}

func resolveLocaleInput(input, existing, fallback string) string {
	if loc := strings.TrimSpace(input); loc != "" {
		return loc
	}
	if loc := strings.TrimSpace(existing); loc != "" {
		return loc
	}
	if loc := strings.TrimSpace(fallback); loc != "" {
		return loc
	}
	return "en"
}

func applyWorkflowTransition(record map[string]any, current, target string) {
	if record == nil {
		return
	}
	current = strings.TrimSpace(strings.ToLower(current))
	target = strings.TrimSpace(strings.ToLower(target))
	if current == "" || target == "" || current == target {
		return
	}
	if transition := resolveWorkflowTransition(current, target); transition != "" {
		record["transition"] = transition
		return
	}
	record["_workflow_skip"] = true
}

func resolveWorkflowTransition(current, target string) string {
	switch {
	case current == "draft" && target == "pending_approval":
		return "request_approval"
	case current == "pending_approval" && target == "published":
		return "approve"
	case current == "pending_approval" && target == "draft":
		return "reject"
	case current == "published" && target == "archived":
		return "archive"
	default:
		return ""
	}
}

func previewToken(adm *admin.Admin, entityType, id string) (string, error) {
	if adm == nil || id == "" {
		return "", nil
	}
	svc := adm.Preview()
	if svc == nil {
		return "", nil
	}
	return svc.Generate(entityType, id, time.Hour)
}

func resolvePagePreviewPath(page map[string]any) string {
	if page == nil {
		return ""
	}
	if path := strings.TrimSpace(anyToString(page["path"])); path != "" {
		return normalizePreviewPath(path)
	}
	if path := strings.TrimSpace(anyToString(page["preview_url"])); path != "" {
		return normalizePreviewPath(path)
	}
	if slug := strings.TrimSpace(anyToString(page["slug"])); slug != "" {
		return normalizePreviewPath(slug)
	}
	return ""
}

func resolvePostPreviewPath(post map[string]any) string {
	if post == nil {
		return ""
	}
	if path := strings.TrimSpace(anyToString(post["path"])); path != "" {
		return normalizePreviewPath(path)
	}
	if slug := strings.TrimSpace(anyToString(post["slug"])); slug != "" {
		return normalizePreviewPath(path.Join("posts", slug))
	}
	return ""
}

func normalizePreviewPath(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if !strings.HasPrefix(trimmed, "/") {
		return "/" + trimmed
	}
	return trimmed
}

func buildPreviewURL(targetPath, token string) string {
	trimmed := strings.TrimSpace(targetPath)
	if trimmed == "" || token == "" {
		return ""
	}
	sep := "?"
	if strings.Contains(trimmed, "?") {
		sep = "&"
	}
	return trimmed + sep + "preview_token=" + url.QueryEscape(token)
}

func rewriteFormAction(html []byte, basePath, resource, id string) []byte {
	if id == "" {
		return html
	}
	action := path.Join(basePath, resource, id)
	rendered := strings.ReplaceAll(string(html), path.Join(basePath, resource, "{id}"), action)
	rendered = strings.ReplaceAll(rendered, "{id}", id)
	return []byte(rendered)
}

func tagsToCSV(value any) string {
	switch v := value.(type) {
	case []string:
		return strings.Join(v, ", ")
	case []any:
		parts := make([]string, 0, len(v))
		for _, item := range v {
			if str := strings.TrimSpace(anyToString(item)); str != "" {
				parts = append(parts, str)
			}
		}
		return strings.Join(parts, ", ")
	default:
		return strings.TrimSpace(anyToString(value))
	}
}

func cloneRecord(rec map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range rec {
		out[k] = v
	}
	return out
}
