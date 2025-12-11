package handlers

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
)

// SiteHandlers renders CMS-backed pages and posts for the public site.
type SiteHandlers struct {
	Admin         *admin.Admin
	Pages         stores.PageRepository
	Posts         stores.PostRepository
	Nav           *admin.Navigation
	DefaultLocale string
	MenuCode      string
	AssetBasePath string
	AdminBasePath string
	CMSEnabled    bool
}

// SiteNavItem is a minimal navigation node for site templates.
type SiteNavItem struct {
	Label    string
	Href     string
	Key      string
	Active   bool
	Children []SiteNavItem
}

type sitePage struct {
	ID              string
	Title           string
	Summary         string
	Content         string
	Path            string
	Status          string
	MetaTitle       string
	MetaDescription string
	UpdatedAt       *time.Time
	UpdatedAtText   string
}

type sitePost struct {
	ID              string
	Title           string
	Summary         string
	Content         string
	Path            string
	Status          string
	MetaTitle       string
	MetaDescription string
	PublishedAt     *time.Time
	UpdatedAt       *time.Time
	Tags            string
	PublishedAtText string
}

// NewSiteHandlers wires the dependencies needed to render CMS content.
func NewSiteHandlers(cfg SiteHandlersConfig) *SiteHandlers {
	menuCode := strings.TrimSpace(cfg.MenuCode)
	if menuCode == "" {
		menuCode = setup.SiteNavigationMenuCode
	}
	if cfg.AssetBasePath == "" {
		cfg.AssetBasePath = cfg.AdminBasePath
	}
	return &SiteHandlers{
		Admin:         cfg.Admin,
		Pages:         cfg.Pages,
		Posts:         cfg.Posts,
		Nav:           cfg.Nav,
		DefaultLocale: cfg.DefaultLocale,
		MenuCode:      menuCode,
		AssetBasePath: cfg.AssetBasePath,
		AdminBasePath: cfg.AdminBasePath,
		CMSEnabled:    cfg.CMSEnabled,
	}
}

// SiteHandlersConfig configures the site handlers.
type SiteHandlersConfig struct {
	Admin         *admin.Admin
	Pages         stores.PageRepository
	Posts         stores.PostRepository
	Nav           *admin.Navigation
	DefaultLocale string
	MenuCode      string
	AssetBasePath string
	AdminBasePath string
	CMSEnabled    bool
}

// Page renders CMS pages (or 404 when no matching page is found).
func (h *SiteHandlers) Page(c router.Context) error {
	if h == nil || h.Pages == nil {
		return goerrors.New("CMS content unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("CMS_UNAVAILABLE")
	}
	path := normalizeSitePath(c.Path())
	if h.shouldSkip(path) {
		return goerrors.New("not found", goerrors.CategoryNotFound).WithCode(goerrors.CodeNotFound)
	}
	locale := h.localeFromRequest(c)
	page, err := h.resolvePage(c.Context(), path, locale)
	if err != nil {
		if errors.Is(err, admin.ErrNotFound) {
			return goerrors.New("page not found", goerrors.CategoryNotFound).WithCode(goerrors.CodeNotFound)
		}
		return err
	}

	viewCtx := router.ViewContext{
		"title":          pageTitle(*page),
		"page":           page,
		"nav_items":      h.navItems(c.Context(), locale, path),
		"base_path":      h.AssetBasePath,
		"active_path":    path,
		"default_locale": h.DefaultLocale,
	}
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("site/page", viewCtx)
}

// PostsIndex renders a simple list of published posts.
func (h *SiteHandlers) PostsIndex(c router.Context) error {
	if h == nil || h.Posts == nil {
		return goerrors.New("CMS content unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("CMS_UNAVAILABLE")
	}
	path := normalizeSitePath(c.Path())
	if h.shouldSkip(path) {
		return goerrors.New("not found", goerrors.CategoryNotFound).WithCode(goerrors.CodeNotFound)
	}
	locale := h.localeFromRequest(c)
	posts, err := h.listPosts(c.Context(), locale)
	if err != nil {
		return err
	}

	viewCtx := router.ViewContext{
		"title":          "Posts",
		"posts":          posts,
		"nav_items":      h.navItems(c.Context(), locale, path),
		"base_path":      h.AssetBasePath,
		"active_path":    path,
		"default_locale": h.DefaultLocale,
	}
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("site/posts", viewCtx)
}

// PostDetail renders a post detail page when a matching slug/path is found.
func (h *SiteHandlers) PostDetail(c router.Context) error {
	if h == nil || h.Posts == nil {
		return goerrors.New("CMS content unavailable", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("CMS_UNAVAILABLE")
	}
	path := normalizeSitePath(c.Path())
	if h.shouldSkip(path) {
		return goerrors.New("not found", goerrors.CategoryNotFound).WithCode(goerrors.CodeNotFound)
	}
	locale := h.localeFromRequest(c)
	post, err := h.resolvePost(c.Context(), path, locale, c.Param("slug"))
	if err != nil {
		if errors.Is(err, admin.ErrNotFound) {
			return goerrors.New("post not found", goerrors.CategoryNotFound).WithCode(goerrors.CodeNotFound)
		}
		return err
	}

	viewCtx := router.ViewContext{
		"title":          pageTitle(sitePage{Title: post.Title, MetaTitle: post.MetaTitle}),
		"post":           post,
		"nav_items":      h.navItems(c.Context(), locale, path),
		"base_path":      h.AssetBasePath,
		"active_path":    path,
		"default_locale": h.DefaultLocale,
	}
	viewCtx = helpers.WithTheme(viewCtx, h.Admin, c)
	return c.Render("site/post", viewCtx)
}

func (h *SiteHandlers) resolvePage(ctx context.Context, requestPath, locale string) (*sitePage, error) {
	records, _, err := h.Pages.List(ctx, admin.ListOptions{Filters: map[string]any{"locale": locale}})
	if err != nil {
		return nil, err
	}
	target := normalizeSitePath(requestPath)
	for _, record := range records {
		page := mapToSitePage(record)
		if !isPublished(page.Status) {
			continue
		}
		if normalizeSitePath(page.Path) == target {
			return page, nil
		}
	}
	return nil, admin.ErrNotFound
}

func (h *SiteHandlers) resolvePost(ctx context.Context, requestPath, locale, slug string) (*sitePost, error) {
	posts, err := h.listPosts(ctx, locale)
	if err != nil {
		return nil, err
	}
	target := normalizeSitePath(requestPath)
	for _, post := range posts {
		if normalizeSitePath(post.Path) == target {
			return &post, nil
		}
		if slug != "" && strings.EqualFold(slug, strings.TrimPrefix(post.Path, "/posts/")) {
			return &post, nil
		}
	}
	return nil, admin.ErrNotFound
}

func (h *SiteHandlers) listPosts(ctx context.Context, locale string) ([]sitePost, error) {
	records, _, err := h.Posts.List(ctx, admin.ListOptions{Filters: map[string]any{"locale": locale}})
	if err != nil {
		return nil, err
	}
	out := []sitePost{}
	for _, record := range records {
		post := mapToSitePost(record)
		if !isPublished(post.Status) {
			continue
		}
		out = append(out, post)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].PublishedAt == nil || out[j].PublishedAt == nil {
			return out[i].Title < out[j].Title
		}
		return out[i].PublishedAt.After(*out[j].PublishedAt)
	})
	return out, nil
}

func (h *SiteHandlers) navItems(ctx context.Context, locale, activePath string) []SiteNavItem {
	if h.Nav != nil && h.CMSEnabled {
		entries := h.Nav.ResolveMenu(ctx, h.menuCode(), locale)
		return convertNavItems(entries, normalizeSitePath(activePath))
	}
	return h.fallbackNav(ctx, locale, activePath)
}

func (h *SiteHandlers) fallbackNav(ctx context.Context, locale, activePath string) []SiteNavItem {
	if h.Pages == nil {
		return nil
	}
	records, _, err := h.Pages.List(ctx, admin.ListOptions{Filters: map[string]any{"locale": locale}})
	if err != nil {
		return nil
	}
	active := normalizeSitePath(activePath)
	items := []SiteNavItem{}
	for _, record := range records {
		page := mapToSitePage(record)
		if !isPublished(page.Status) {
			continue
		}
		href := normalizeSitePath(page.Path)
		items = append(items, SiteNavItem{
			Label:  fallbackLabel(page.Title, href),
			Href:   href,
			Key:    href,
			Active: href == active,
		})
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].Label < items[j].Label
	})
	return items
}

func (h *SiteHandlers) menuCode() string {
	code := strings.TrimSpace(h.MenuCode)
	if code != "" {
		return code
	}
	return setup.SiteNavigationMenuCode
}

func (h *SiteHandlers) localeFromRequest(c router.Context) string {
	if c == nil {
		return h.DefaultLocale
	}
	locale := strings.TrimSpace(c.Query("locale"))
	if locale == "" {
		return h.DefaultLocale
	}
	return locale
}

func (h *SiteHandlers) shouldSkip(path string) bool {
	base := strings.TrimSpace(h.AdminBasePath)
	if base == "" {
		return false
	}
	base = normalizeSitePath(base)
	return base != "/" && strings.HasPrefix(path, base)
}

func convertNavItems(items []admin.NavigationItem, activePath string) []SiteNavItem {
	out := []SiteNavItem{}
	for _, item := range items {
		if strings.EqualFold(item.Type, admin.MenuItemTypeSeparator) {
			continue
		}
		href, key := navTarget(item.Target)
		children := convertNavItems(item.Children, activePath)
		childActive := anyChildActive(children)
		normalizedHref := normalizeSitePath(href)
		active := normalizedHref == activePath || childActive
		out = append(out, SiteNavItem{
			Label:    fallbackLabel(item.Label, href),
			Href:     normalizedHref,
			Key:      resolveKey(item, key),
			Active:   active,
			Children: children,
		})
	}
	return out
}

func anyChildActive(children []SiteNavItem) bool {
	for _, child := range children {
		if child.Active {
			return true
		}
	}
	return false
}

func navTarget(target map[string]any) (string, string) {
	if target == nil {
		return "/", ""
	}
	if path, ok := target["path"].(string); ok && strings.TrimSpace(path) != "" {
		return path, ""
	}
	if name, ok := target["name"].(string); ok && strings.TrimSpace(name) != "" {
		return "/" + strings.Trim(strings.TrimPrefix(name, "admin."), "/"), strings.TrimSpace(name)
	}
	if key, ok := target["key"].(string); ok && strings.TrimSpace(key) != "" {
		return "/" + strings.Trim(key, "/"), key
	}
	return "/", ""
}

func mapToSitePage(record map[string]any) *sitePage {
	if record == nil {
		return &sitePage{}
	}
	title := asString(record["title"], "")
	path := asString(record["path"], asString(record["slug"], "/"))
	summary := asString(record["summary"], "")
	content := asString(record["content"], "")
	metaTitle := asString(record["meta_title"], "")
	if metaTitle == "" {
		metaTitle = title
	}
	metaDescription := asString(record["meta_description"], "")
	updatedAt := parseTimePtr(record["updated_at"])
	return &sitePage{
		ID:              asString(record["id"], ""),
		Title:           title,
		Summary:         summary,
		Content:         content,
		Path:            path,
		Status:          strings.ToLower(asString(record["status"], "")),
		MetaTitle:       metaTitle,
		MetaDescription: metaDescription,
		UpdatedAt:       updatedAt,
		UpdatedAtText:   formatDate(updatedAt),
	}
}

func mapToSitePost(record map[string]any) sitePost {
	title := asString(record["title"], "")
	path := asString(record["path"], "/posts/"+strings.TrimPrefix(asString(record["slug"], ""), "/"))
	metaTitle := asString(record["meta_title"], "")
	if metaTitle == "" {
		metaTitle = title
	}
	publishedAt := parseTimePtr(record["published_at"])
	updatedAt := parseTimePtr(record["updated_at"])
	return sitePost{
		ID:              asString(record["id"], ""),
		Title:           title,
		Summary:         asString(record["excerpt"], ""),
		Content:         asString(record["content"], ""),
		Path:            path,
		Status:          strings.ToLower(asString(record["status"], "")),
		MetaTitle:       metaTitle,
		MetaDescription: asString(record["meta_description"], ""),
		PublishedAt:     publishedAt,
		UpdatedAt:       updatedAt,
		Tags:            asString(record["tags"], ""),
		PublishedAtText: formatDate(publishedAt),
	}
}

func parseTimePtr(val any) *time.Time {
	switch v := val.(type) {
	case time.Time:
		if v.IsZero() {
			return nil
		}
		cp := v
		return &cp
	case *time.Time:
		return v
	}
	return nil
}

func formatDate(val *time.Time) string {
	if val == nil || val.IsZero() {
		return ""
	}
	return val.Format("Jan 2, 2006")
}

func isPublished(status string) bool {
	return strings.EqualFold(strings.TrimSpace(status), "published")
}

func normalizeSitePath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return "/"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	path = "/" + strings.Trim(strings.ReplaceAll(path, "//", "/"), "/")
	if path == "" {
		return "/"
	}
	if path != "/" && strings.HasSuffix(path, "/") {
		path = strings.TrimSuffix(path, "/")
	}
	return path
}

func asString(val any, def string) string {
	if val == nil {
		return def
	}
	switch v := val.(type) {
	case string:
		if strings.TrimSpace(v) == "" {
			return def
		}
		return v
	case fmt.Stringer:
		return v.String()
	default:
		s := fmt.Sprint(v)
		if strings.TrimSpace(s) == "" {
			return def
		}
		return s
	}
}

func fallbackLabel(label, path string) string {
	label = strings.TrimSpace(label)
	if label != "" {
		return label
	}
	path = strings.Trim(path, "/")
	if path == "" {
		return "Home"
	}
	segments := strings.FieldsFunc(path, func(r rune) bool { return r == '/' })
	parts := []string{}
	for _, segment := range segments {
		words := strings.Fields(strings.ReplaceAll(segment, "-", " "))
		for i, word := range words {
			if len(word) == 0 {
				continue
			}
			runes := []rune(strings.ToLower(word))
			runes[0] = unicode.ToUpper(runes[0])
			words[i] = string(runes)
		}
		parts = append(parts, strings.Join(words, " "))
	}
	return strings.Join(parts, " ")
}

func resolveKey(item admin.NavigationItem, targetKey string) string {
	if targetKey != "" {
		return targetKey
	}
	if strings.TrimSpace(item.LabelKey) != "" {
		return item.LabelKey
	}
	if strings.TrimSpace(item.Label) != "" {
		return strings.ToLower(strings.ReplaceAll(item.Label, " ", "_"))
	}
	return strings.TrimSpace(item.ID)
}

func pageTitle(page sitePage) string {
	if strings.TrimSpace(page.MetaTitle) != "" {
		return page.MetaTitle
	}
	if strings.TrimSpace(page.Title) != "" {
		return page.Title
	}
	return "Page"
}
