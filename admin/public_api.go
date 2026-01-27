package admin

import (
	"context"
	"errors"
	"strings"

	router "github.com/goliatone/go-router"
)

// RegisterPublicAPI registers read-only endpoints for content delivery.
func (a *Admin) RegisterPublicAPI(r router.Router[router.Context]) {
	base := "/api/v1"

	r.Get(joinPath(base, "content/pages/:slug"), a.handlePublicPage)
	r.Get(joinPath(base, "content/posts"), a.handlePublicPosts)
	r.Get(joinPath(base, "menus/:location"), a.handlePublicMenu)
	r.Get(joinPath(base, "preview/:token"), a.handlePublicPreview)
}

func (a *Admin) registerPreviewRoutes() {
	if a == nil || a.preview == nil || a.router == nil {
		return
	}
	path := joinPath(a.config.BasePath, "api/preview/:token")
	a.router.Get(path, a.handlePublicPreview)
}

func (a *Admin) handlePublicPage(c router.Context) error {
	slug := c.Param("slug", "")
	locale := c.Query("locale")
	if locale == "" {
		locale = a.config.DefaultLocale
	}

	if a.contentSvc == nil {
		return writeError(c, errors.New("content service not available"))
	}

	// This is a simplified implementation. A real one would query by slug and locale.
	pages, err := a.contentSvc.Pages(c.Context(), locale)
	if err != nil {
		return writeError(c, err)
	}

	for _, p := range pages {
		if p.Slug == slug && p.Status == "published" {
			return writeJSON(c, p)
		}
	}

	return writeError(c, ErrNotFound)
}

func (a *Admin) handlePublicPosts(c router.Context) error {
	category := c.Query("category")
	locale := c.Query("locale")
	if locale == "" {
		locale = a.config.DefaultLocale
	}

	if a.contentSvc == nil {
		return writeError(c, errors.New("content service not available"))
	}

	contents, err := a.contentSvc.Contents(c.Context(), locale)
	if err != nil {
		return writeError(c, err)
	}

	out := []CMSContent{}
	for _, cnt := range contents {
		if cnt.Status != "published" {
			continue
		}
		if category != "" {
			if cat, ok := cnt.Data["category"].(string); !ok || cat != category {
				continue
			}
		}
		out = append(out, cnt)
	}

	return writeJSON(c, out)
}

func (a *Admin) handlePublicMenu(c router.Context) error {
	location := c.Param("location", "")
	locale := c.Query("locale")
	if locale == "" {
		locale = a.config.DefaultLocale
	}

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

	locale := c.Query("locale")
	if locale == "" {
		locale = a.config.DefaultLocale
	}

	if token.EntityType == "pages" {
		page, err := a.contentSvc.Page(c.Context(), token.ContentID, locale)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, page)
	}

	if token.EntityType == "posts" {
		content, err := a.contentSvc.Content(c.Context(), token.ContentID, locale)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, content)
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
