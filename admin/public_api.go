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

func (a *Admin) handlePublicContent(c router.Context) error {
	if a.contentSvc == nil {
		return writeError(c, serviceUnavailableDomainError("content service not available", map[string]any{
			"service": "content",
		}))
	}
	locale := publicLocale(a, c)
	contentType := publicContentType(c)
	slug := c.Param("slug", "")
	if slug == "" {
		slug = c.Query("slug")
	}
	if slug == "" {
		return writeError(c, validationDomainError("content slug required", map[string]any{
			"field": "slug",
		}))
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
		return writeError(c, serviceUnavailableDomainError("content service not available", map[string]any{
			"service": "content",
		}))
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

func (a *Admin) handlePublicMenu(c router.Context) error {
	location := c.Param("location", "")
	locale := publicLocale(a, c)

	if a.menuSvc == nil {
		return writeError(c, serviceUnavailableDomainError("menu service not available", map[string]any{
			"service": "menu",
		}))
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
		return writeError(c, serviceUnavailableDomainError("preview service not available", map[string]any{
			"service": "preview",
		}))
	}

	token, err := a.preview.Validate(tokenString)
	if err != nil {
		return writeError(c, err)
	}

	if a.contentSvc == nil {
		return writeError(c, serviceUnavailableDomainError("content service not available", map[string]any{
			"service": "content",
		}))
	}

	locale := publicLocale(a, c)
	_, env := splitPreviewEntityType(token.EntityType)
	ctx := c.Context()
	if env != "" {
		ctx = WithEnvironment(ctx, env)
	}

	content, err := a.contentSvc.Content(ctx, token.ContentID, locale)
	if err == nil && content != nil {
		applyEmbeddedBlocksToContent(content)
		return writeJSON(c, content)
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
		return writeJSON(c, page)
	}
	return writeError(c, ErrNotFound)
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
							item.Target["url"] = ensureLeadingSlashPath(strings.TrimSpace(path))
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
	return ensureLeadingSlashPath(strings.TrimSpace(segment + "/" + strings.TrimLeft(slug, "/")))
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
