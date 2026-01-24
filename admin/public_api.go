package admin

import (
	"errors"

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

	menu, err := a.menuSvc.Menu(c.Context(), location, locale)
	if err != nil {
		return writeError(c, err)
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
