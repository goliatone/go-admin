package admin

import (
	"context"
	"errors"
	"strings"

	router "github.com/goliatone/go-router"
)

// RegisterPublicAPI registers read-only endpoints for content delivery.
func (a *Admin) RegisterPublicAPI(r AdminRouter) {
	if r == nil {
		return
	}
	register := func(route string, handler router.HandlerFunc) {
		path := publicAPIRoutePath(a, route)
		if path == "" {
			return
		}
		r.Get(path, handler)
	}

	register("pages", a.handlePublicPages)
	register("page", a.handlePublicPage)
	register("content", a.handlePublicContentList)
	register("content.type", a.handlePublicContentList)
	register("content.item", a.handlePublicContent)
	// Legacy CMS demo routes.
	register("menu", a.handlePublicMenu)
	register("preview", a.handlePublicPreview)
}

func (a *Admin) registerPreviewRoutes() {
	if a == nil || a.preview == nil || a.router == nil {
		return
	}
	path := adminAPIRoutePath(a, "preview")
	if path == "" {
		return
	}
	a.router.Get(path, a.handlePublicPreview)
}

func (a *Admin) handlePublicPage(c router.Context) error {
	slug := c.Param("slug", "")
	path := c.Query("path")
	if slug == "" {
		slug = c.Query("slug")
	}

	if a.contentSvc == nil {
		return writeError(c, errors.New("content service not available"))
	}

	locale := publicLocale(a, c)
	page, err := a.findPublicPage(c.Context(), locale, slug, path, false)
	if err != nil {
		return writeError(c, err)
	}
	if page != nil {
		return writeJSON(c, page)
	}

	return writeError(c, ErrNotFound)
}

func (a *Admin) handlePublicPages(c router.Context) error {
	if a.contentSvc == nil {
		return writeError(c, errors.New("content service not available"))
	}
	locale := publicLocale(a, c)
	slug := c.Query("slug")
	path := c.Query("path")

	pages, err := a.listPublicPages(c.Context(), locale, false)
	if err != nil {
		return writeError(c, err)
	}
	if slug != "" || path != "" {
		for i := range pages {
			if matchesPageQuery(&pages[i], slug, path) {
				return writeJSON(c, pages[i])
			}
		}
		return writeError(c, ErrNotFound)
	}
	return writeJSON(c, pages)
}

func (a *Admin) handlePublicContent(c router.Context) error {
	if a.contentSvc == nil {
		return writeError(c, errors.New("content service not available"))
	}
	locale := publicLocale(a, c)
	contentType := publicContentType(c)
	slug := c.Param("slug", "")
	if slug == "" {
		slug = c.Query("slug")
	}
	if slug == "" {
		return writeError(c, errors.New("content slug required"))
	}
	content, err := a.findPublicContent(c.Context(), locale, contentType, slug, "", false)
	if err != nil {
		return writeError(c, err)
	}
	if content != nil {
		return writeJSON(c, content)
	}
	return writeError(c, ErrNotFound)
}

func (a *Admin) handlePublicContentList(c router.Context) error {
	if a.contentSvc == nil {
		return writeError(c, errors.New("content service not available"))
	}

	locale := publicLocale(a, c)
	contentType := publicContentType(c)
	category := c.Query("category")
	slug := c.Query("slug")

	contents, err := a.listPublicContents(c.Context(), locale, contentType, category, false)
	if err != nil {
		return writeError(c, err)
	}

	if slug != "" {
		for i := range contents {
			if matchesSlug(contents[i].Slug, slug) {
				return writeJSON(c, contents[i])
			}
		}
		return writeError(c, ErrNotFound)
	}
	return writeJSON(c, contents)
}

func (a *Admin) handlePublicPosts(c router.Context) error {
	if a.contentSvc == nil {
		return writeError(c, errors.New("content service not available"))
	}
	locale := publicLocale(a, c)
	category := c.Query("category")
	contents, err := a.listPublicContents(c.Context(), locale, "posts", category, false)
	if err != nil {
		return writeError(c, err)
	}
	return writeJSON(c, contents)
}

func (a *Admin) handlePublicMenu(c router.Context) error {
	location := c.Param("location", "")
	locale := publicLocale(a, c)

	if a.menuSvc == nil {
		return writeError(c, errors.New("menu service not available"))
	}

	menu, err := a.menuSvc.MenuByLocation(c.Context(), location, locale)
	if err != nil {
		return writeError(c, err)
	}
	if menu != nil && a.contentSvc != nil {
		a.resolveMenuTargets(c.Context(), menu.Items, locale)
	}

	return writeJSON(c, menu)
}

func (a *Admin) handlePublicPreview(c router.Context) error {
	tokenString := c.Param("token", "")
	if a.preview == nil {
		return writeError(c, errors.New("preview service not available"))
	}

	token, err := a.preview.Validate(tokenString)
	if err != nil {
		return writeError(c, err)
	}

	if a.contentSvc == nil {
		return writeError(c, errors.New("content service not available"))
	}

	locale := publicLocale(a, c)
	entityType, env := splitPreviewEntityType(token.EntityType)
	ctx := c.Context()
	if env != "" {
		ctx = WithEnvironment(ctx, env)
	}

	if isPageEntityType(entityType) {
		content, err := a.contentSvc.Content(ctx, token.ContentID, locale)
		if err == nil && content != nil {
			page := pageFromContent(*content)
			applyEmbeddedBlocksToPage(&page)
			return writeJSON(c, page)
		}
		if err != nil && !errors.Is(err, ErrNotFound) {
			return writeError(c, err)
		}
		page, err := a.contentSvc.Page(ctx, token.ContentID, locale)
		if err != nil {
			return writeError(c, err)
		}
		if page != nil {
			applyEmbeddedBlocksToPage(page)
		}
		return writeJSON(c, page)
	}

	content, err := a.contentSvc.Content(ctx, token.ContentID, locale)
	if err != nil {
		return writeError(c, err)
	}
	if content != nil {
		applyEmbeddedBlocksToContent(content)
	}
	return writeJSON(c, content)
}

func (a *Admin) resolveMenuTargets(ctx context.Context, items []MenuItem, locale string) {
	for i := range items {
		item := &items[i]
		if item.Target != nil {
			if rawURL, ok := item.Target["url"].(string); !ok || strings.TrimSpace(rawURL) == "" {
				if pageID, ok := item.Target["page_id"].(string); ok && pageID != "" {
					if page, err := a.contentSvc.Page(ctx, pageID, locale); err == nil && page != nil {
						path := extractPathFromData(page.Data, page.Slug)
						if path != "" {
							item.Target["url"] = ensureLeadingSlash(path)
						}
					}
				}
				if contentID, ok := item.Target["content_id"].(string); ok && contentID != "" {
					if content, err := a.contentSvc.Content(ctx, contentID, locale); err == nil && content != nil {
						if url := buildContentURL(content); url != "" {
							item.Target["url"] = url
						}
					}
				}
			}
		}
		if len(item.Children) > 0 {
			a.resolveMenuTargets(ctx, item.Children, locale)
		}
	}
}

func extractPathFromData(data map[string]any, fallback string) string {
	if data == nil {
		return strings.TrimSpace(fallback)
	}
	if raw, ok := data["path"]; ok {
		if path := strings.TrimSpace(toString(raw)); path != "" {
			return path
		}
	}
	return strings.TrimSpace(fallback)
}

func buildContentURL(content *CMSContent) string {
	if content == nil {
		return ""
	}
	slug := strings.TrimSpace(content.Slug)
	if slug == "" {
		return ""
	}
	segment := strings.Trim(firstNonEmpty(content.ContentTypeSlug, content.ContentType), "/")
	if segment == "" {
		segment = "content"
	}
	return ensureLeadingSlash(segment + "/" + strings.TrimLeft(slug, "/"))
}

func ensureLeadingSlash(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "/") {
		return trimmed
	}
	return "/" + trimmed
}

func publicLocale(a *Admin, c router.Context) string {
	if a == nil {
		return ""
	}
	locale := strings.TrimSpace(c.Query("locale"))
	if locale == "" {
		locale = a.config.DefaultLocale
	}
	return locale
}

func publicContentType(c router.Context) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(firstNonEmpty(
		c.Param("type", ""),
		c.Query("type"),
		c.Query("content_type"),
	))
}

func splitPreviewEntityType(raw string) (string, string) {
	entityType := strings.ToLower(strings.TrimSpace(raw))
	if entityType == "" {
		return "", ""
	}
	if idx := strings.LastIndex(entityType, "@"); idx > 0 && idx+1 < len(entityType) {
		env := strings.TrimSpace(entityType[idx+1:])
		entityType = strings.TrimSpace(entityType[:idx])
		return entityType, env
	}
	return entityType, ""
}

func isPageEntityType(entityType string) bool {
	switch strings.ToLower(strings.TrimSpace(entityType)) {
	case "page", "pages":
		return true
	default:
		return false
	}
}

func (a *Admin) listPublicContents(ctx context.Context, locale, contentType, category string, includeDrafts bool) ([]CMSContent, error) {
	contents, err := a.contentSvc.Contents(ctx, locale)
	if err != nil {
		return nil, err
	}
	out := make([]CMSContent, 0, len(contents))
	for _, cnt := range contents {
		if !allowPublicStatus(cnt.Status, includeDrafts) {
			continue
		}
		if contentType != "" && !matchesContentType(cnt, contentType) {
			continue
		}
		if category != "" {
			if cat, ok := cnt.Data["category"].(string); !ok || cat != category {
				continue
			}
		}
		applyEmbeddedBlocksToContent(&cnt)
		out = append(out, cnt)
	}
	return out, nil
}

func (a *Admin) findPublicContent(ctx context.Context, locale, contentType, slug, category string, includeDrafts bool) (*CMSContent, error) {
	contents, err := a.listPublicContents(ctx, locale, contentType, category, includeDrafts)
	if err != nil {
		return nil, err
	}
	for i := range contents {
		if matchesSlug(contents[i].Slug, slug) {
			return &contents[i], nil
		}
	}
	return nil, nil
}

func (a *Admin) listPublicPages(ctx context.Context, locale string, includeDrafts bool) ([]CMSPage, error) {
	pages, err := a.contentSvc.Pages(ctx, locale)
	if err != nil {
		return nil, err
	}
	out := make([]CMSPage, 0, len(pages))
	for _, page := range pages {
		if !allowPublicStatus(page.Status, includeDrafts) {
			continue
		}
		applyEmbeddedBlocksToPage(&page)
		out = append(out, page)
	}
	return out, nil
}

func (a *Admin) findPublicPage(ctx context.Context, locale, slug, path string, includeDrafts bool) (*CMSPage, error) {
	pages, err := a.listPublicPages(ctx, locale, includeDrafts)
	if err != nil {
		return nil, err
	}
	for i := range pages {
		if matchesPageQuery(&pages[i], slug, path) {
			return &pages[i], nil
		}
	}
	return nil, nil
}

func allowPublicStatus(status string, includeDrafts bool) bool {
	if includeDrafts {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(status), "published")
}

func matchesContentType(content CMSContent, contentType string) bool {
	filter := strings.TrimSpace(contentType)
	if filter == "" {
		return true
	}
	if strings.EqualFold(content.ContentTypeSlug, filter) || strings.EqualFold(content.ContentType, filter) {
		return true
	}
	if strings.HasSuffix(filter, "s") {
		filter = strings.TrimSuffix(filter, "s")
		if strings.EqualFold(content.ContentTypeSlug, filter) || strings.EqualFold(content.ContentType, filter) {
			return true
		}
	}
	if strings.HasSuffix(content.ContentTypeSlug, "s") && strings.EqualFold(strings.TrimSuffix(content.ContentTypeSlug, "s"), filter) {
		return true
	}
	if strings.HasSuffix(content.ContentType, "s") && strings.EqualFold(strings.TrimSuffix(content.ContentType, "s"), filter) {
		return true
	}
	return false
}

func matchesPageQuery(page *CMSPage, slug, path string) bool {
	if page == nil {
		return false
	}
	slug = strings.TrimSpace(slug)
	path = strings.TrimSpace(path)
	if slug != "" && matchesSlug(page.Slug, slug) {
		return true
	}
	if slug != "" && strings.Contains(slug, "/") && matchesPath(page, slug) {
		return true
	}
	if path != "" && matchesPath(page, path) {
		return true
	}
	return false
}

func matchesPath(page *CMSPage, path string) bool {
	if page == nil {
		return false
	}
	normalized := normalizePath(path)
	if normalized == "" {
		return false
	}
	pagePath := normalizePath(extractPathFromData(page.Data, page.Slug))
	return pagePath != "" && strings.EqualFold(pagePath, normalized)
}

func matchesSlug(value, slug string) bool {
	value = strings.TrimSpace(value)
	slug = strings.TrimSpace(slug)
	if value == "" || slug == "" {
		return false
	}
	if strings.EqualFold(value, slug) {
		return true
	}
	return strings.EqualFold(strings.Trim(value, "/"), strings.Trim(slug, "/"))
}

func normalizePath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	if trimmed != "/" {
		trimmed = strings.TrimRight(trimmed, "/")
	}
	if !strings.HasPrefix(trimmed, "/") {
		trimmed = "/" + trimmed
	}
	return trimmed
}
