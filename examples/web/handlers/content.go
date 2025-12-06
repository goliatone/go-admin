package handlers

import (
	"context"
	"path"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/stores"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
)

type PageHandlers struct {
	Store   stores.PageRepository
	Admin   *admin.Admin
	Config  admin.Config
	WithNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext
}

func NewPageHandlers(store stores.PageRepository, adm *admin.Admin, cfg admin.Config, withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext) *PageHandlers {
	return &PageHandlers{Store: store, Admin: adm, Config: cfg, WithNav: withNav}
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
	columns := []map[string]string{
		{"key": "title", "label": "Title"},
		{"key": "slug", "label": "Slug"},
		{"key": "status", "label": "Status"},
		{"key": "updated_at", "label": "Updated"},
	}
	for i := range pages {
		id := pages[i]["id"]
		pages[i]["actions"] = routes.ActionsMap(id)
	}

	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "pages",
		"resource_label": "Pages",
		"routes":         routes.RoutesMap(),
		"items":          pages,
		"columns":        columns,
		"total":          total,
	}, h.Admin, h.Config, "pages", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/pages/list", viewCtx)
}

func (h *PageHandlers) New(c router.Context) error {
	if err := guardResource(c, "admin.pages", "create"); err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "pages")
	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "pages",
		"resource_label": "Pages",
		"routes":         routes.RoutesMap(),
		"is_edit":        false,
	}, h.Admin, h.Config, "pages", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/pages/form", viewCtx)
}

func (h *PageHandlers) Create(c router.Context) error {
	if err := guardResource(c, "admin.pages", "create"); err != nil {
		return err
	}
	ctx := c.Context()
	record := map[string]any{
		"title":            c.FormValue("title"),
		"slug":             c.FormValue("slug"),
		"content":          c.FormValue("content"),
		"status":           c.FormValue("status"),
		"meta_title":       c.FormValue("meta_title"),
		"meta_description": c.FormValue("meta_description"),
	}
	if _, err := h.Store.Create(ctx, record); err != nil {
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
	}, h.Admin, h.Config, "pages", c.Context())
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
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "pages")
	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "pages",
		"resource_label": "Pages",
		"routes":         routes.RoutesMap(),
		"is_edit":        true,
		"item":           page,
	}, h.Admin, h.Config, "pages", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/pages/form", viewCtx)
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
	updated := cloneRecord(existing)
	updated["title"] = c.FormValue("title")
	updated["slug"] = c.FormValue("slug")
	updated["content"] = c.FormValue("content")
	updated["status"] = c.FormValue("status")
	updated["meta_title"] = c.FormValue("meta_title")
	updated["meta_description"] = c.FormValue("meta_description")

	if _, err := h.Store.Update(ctx, id, updated); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "pages"))
}

func (h *PageHandlers) Delete(c router.Context) error {
	if err := guardResource(c, "admin.pages", "delete"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	if err := h.Store.Delete(ctx, id); err != nil {
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
	if _, err := h.Store.Publish(ctx, []string{id}); err != nil {
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
	if _, err := h.Store.Unpublish(ctx, []string{id}); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "pages", id))
}

type PostHandlers struct {
	Store   stores.PostRepository
	Admin   *admin.Admin
	Config  admin.Config
	WithNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext
}

func NewPostHandlers(store stores.PostRepository, adm *admin.Admin, cfg admin.Config, withNav func(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext) *PostHandlers {
	return &PostHandlers{Store: store, Admin: adm, Config: cfg, WithNav: withNav}
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
	columns := []map[string]string{
		{"key": "title", "label": "Title"},
		{"key": "author", "label": "Author"},
		{"key": "status", "label": "Status"},
		{"key": "published_at", "label": "Published"},
	}
	for i := range posts {
		id := posts[i]["id"]
		posts[i]["actions"] = routes.ActionsMap(id)
	}
	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "posts",
		"resource_label": "Posts",
		"routes":         routes.RoutesMap(),
		"items":          posts,
		"columns":        columns,
		"total":          total,
	}, h.Admin, h.Config, "posts", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/posts/list", viewCtx)
}

func (h *PostHandlers) New(c router.Context) error {
	if err := guardResource(c, "admin.posts", "create"); err != nil {
		return err
	}
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "posts")
	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "posts",
		"resource_label": "Posts",
		"routes":         routes.RoutesMap(),
		"is_edit":        false,
	}, h.Admin, h.Config, "posts", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/posts/form", viewCtx)
}

func (h *PostHandlers) Create(c router.Context) error {
	if err := guardResource(c, "admin.posts", "create"); err != nil {
		return err
	}
	ctx := c.Context()
	record := map[string]any{
		"title":          c.FormValue("title"),
		"slug":           c.FormValue("slug"),
		"content":        c.FormValue("content"),
		"excerpt":        c.FormValue("excerpt"),
		"author":         c.FormValue("author"),
		"category":       c.FormValue("category"),
		"status":         c.FormValue("status"),
		"featured_image": c.FormValue("featured_image"),
		"tags":           c.FormValue("tags"),
	}
	if _, err := h.Store.Create(ctx, record); err != nil {
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
	}, h.Admin, h.Config, "posts", c.Context())
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
	routes := helpers.NewResourceRoutes(h.Config.BasePath, "posts")
	viewCtx := h.WithNav(router.ViewContext{
		"title":          h.Config.Title,
		"base_path":      h.Config.BasePath,
		"resource":       "posts",
		"resource_label": "Posts",
		"routes":         routes.RoutesMap(),
		"is_edit":        true,
		"item":           post,
	}, h.Admin, h.Config, "posts", c.Context())
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("resources/posts/form", viewCtx)
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
	updated := cloneRecord(existing)
	updated["title"] = c.FormValue("title")
	updated["slug"] = c.FormValue("slug")
	updated["content"] = c.FormValue("content")
	updated["excerpt"] = c.FormValue("excerpt")
	updated["author"] = c.FormValue("author")
	updated["category"] = c.FormValue("category")
	updated["status"] = c.FormValue("status")
	updated["featured_image"] = c.FormValue("featured_image")
	updated["tags"] = c.FormValue("tags")

	if _, err := h.Store.Update(ctx, id, updated); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "posts"))
}

func (h *PostHandlers) Delete(c router.Context) error {
	if err := guardResource(c, "admin.posts", "delete"); err != nil {
		return err
	}
	id := c.Param("id")
	ctx := c.Context()
	if err := h.Store.Delete(ctx, id); err != nil {
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
	if _, err := h.Store.Publish(ctx, []string{id}); err != nil {
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
	if _, err := h.Store.Archive(ctx, []string{id}); err != nil {
		return err
	}
	return c.Redirect(path.Join(h.Config.BasePath, "posts", id))
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
	columns := []map[string]string{
		{"key": "filename", "label": "Filename"},
		{"key": "type", "label": "Type"},
		{"key": "size", "label": "Size"},
		{"key": "uploaded_by", "label": "Uploaded By"},
	}
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
	}, h.Admin, h.Config, "media", c.Context())
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
	}, h.Admin, h.Config, "media", c.Context())
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
	}, h.Admin, h.Config, "media", c.Context())
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
	}, h.Admin, h.Config, "media", c.Context())
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

func cloneRecord(rec map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range rec {
		out[k] = v
	}
	return out
}
