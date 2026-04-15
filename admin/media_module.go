package admin

import (
	"strings"

	"github.com/goliatone/go-admin/admin/routing"
	templateview "github.com/goliatone/go-admin/internal/templateview"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

const (
	mediaModuleID       = "media"
	mediaIndexRouteKey  = "media.index"
	mediaListRouteKey   = "media.list"
	mediaDefaultMenuPos = 35
)

// MediaModule exposes the media library as a module-owned admin page.
type MediaModule struct {
	basePath      string
	menuCode      string
	defaultLocale string
	permission    string
	menuParent    string
	menuPosition  int
	uiGroupPath   string
	urls          urlkit.Resolver
}

// NewMediaModule constructs the default media module.
func NewMediaModule() *MediaModule {
	return &MediaModule{menuPosition: mediaDefaultMenuPos}
}

// Manifest describes the module metadata.
func (m *MediaModule) Manifest() ModuleManifest {
	return ModuleManifest{
		ID:             mediaModuleID,
		NameKey:        "modules.media.name",
		DescriptionKey: "modules.media.description",
		FeatureFlags:   []string{string(FeatureMedia)},
	}
}

// Register wires the module-owned gallery and list pages.
func (m *MediaModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "media_module"})
	}
	m.applyDefaults(ctx)

	indexPath := ctx.Routing.RoutePath(routing.SurfaceUI, mediaIndexRouteKey)
	if strings.TrimSpace(indexPath) == "" {
		indexPath = resolveURLWith(ctx.Admin.URLs(), routing.DefaultUIGroupPath(), mediaIndexRouteKey, nil, nil)
	}
	listPath := ctx.Routing.RoutePath(routing.SurfaceUI, mediaListRouteKey)
	if strings.TrimSpace(listPath) == "" {
		listPath = resolveURLWith(ctx.Admin.URLs(), routing.DefaultUIGroupPath(), mediaListRouteKey, nil, nil)
	}

	ctx.ProtectedRouter.Get(indexPath, func(c router.Context) error {
		return m.renderPage(ctx.Admin, c, "grid")
	})
	ctx.ProtectedRouter.Get(listPath, func(c router.Context) error {
		return m.renderPage(ctx.Admin, c, "list")
	})
	return nil
}

func (m *MediaModule) applyDefaults(ctx ModuleContext) {
	if m.basePath == "" {
		m.basePath = ctx.Admin.config.BasePath
	}
	if m.menuCode == "" {
		m.menuCode = ctx.Admin.navMenuCode
	}
	if m.defaultLocale == "" {
		m.defaultLocale = ctx.Admin.config.DefaultLocale
	}
	if m.permission == "" {
		m.permission = ctx.Admin.config.MediaPermission
	}
	if m.urls == nil {
		m.urls = ctx.Admin.URLs()
	}
	if strings.TrimSpace(ctx.Routing.Resolved.UIGroupPath) != "" {
		m.uiGroupPath = strings.TrimSpace(ctx.Routing.Resolved.UIGroupPath)
	}
	if path := ctx.Routing.RoutePath(routing.SurfaceUI, mediaIndexRouteKey); path != "" {
		m.basePath = path
	}
	if m.menuPosition <= 0 {
		m.menuPosition = mediaDefaultMenuPos
	}
}

// RouteContract declares the UI routes owned by the media module.
func (m *MediaModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug: mediaModuleID,
		UIRoutes: map[string]string{
			mediaIndexRouteKey: "/",
			mediaListRouteKey:  "/list",
		},
	}
}

// MenuItems contributes navigation for the media module.
func (m *MediaModule) MenuItems(locale string) []MenuItem {
	if locale == "" {
		locale = m.defaultLocale
	}
	group := strings.TrimSpace(m.uiGroupPath)
	if group == "" {
		group = routing.DefaultUIGroupPath()
	}
	path := resolveURLWith(m.urls, group, mediaIndexRouteKey, nil, nil)
	if strings.TrimSpace(path) == "" {
		path = strings.TrimSpace(m.basePath)
	}
	permissions := []string{}
	if m.permission != "" {
		permissions = []string{m.permission}
	}
	return []MenuItem{
		{
			Label:       "Media",
			LabelKey:    "menu.media",
			Icon:        "media-image-list",
			Target:      map[string]any{"type": "url", "path": path, "key": mediaModuleID},
			Permissions: permissions,
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    new(m.menuPosition),
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests the media navigation under a parent menu item ID.
func (m *MediaModule) WithMenuParent(parent string) *MediaModule {
	m.menuParent = strings.TrimSpace(parent)
	return m
}

// WithMenuPosition sets the media navigation sort position.
func (m *MediaModule) WithMenuPosition(position int) *MediaModule {
	m.menuPosition = position
	return m
}

func (m *MediaModule) renderPage(adm *Admin, c router.Context, view string) error {
	if adm == nil || c == nil {
		return ErrNotFound
	}
	if !featureEnabled(adm.featureGate, FeatureMedia) {
		return FeatureDisabledError{Feature: string(FeatureMedia)}
	}
	if adm.mediaLibrary == nil {
		return FeatureDisabledError{Feature: string(FeatureMedia)}
	}
	adminCtx := adm.adminContextFromRequest(c, adm.config.DefaultLocale)
	if err := adm.requirePermission(adminCtx, adm.config.MediaPermission, mediaModuleID); err != nil {
		return err
	}

	group := strings.TrimSpace(m.uiGroupPath)
	if group == "" {
		group = routing.DefaultUIGroupPath()
	}
	basePath := mediaModuleBasePath(adm, m)

	mediaCfg := adm.resolveMediaSchemaConfig()
	viewCtx := router.ViewContext{
		"title":                    adm.config.Title,
		"resource":                 mediaModuleID,
		"resource_label":           "Media",
		"media_view":               normalizeMediaView(view),
		"media_gallery_path":       resolveMediaPagePath(m.urls, group, mediaIndexRouteKey, basePath),
		"media_list_path":          resolveMediaPagePath(m.urls, group, mediaListRouteKey, strings.TrimRight(basePath, "/")+"/list"),
		"media_library_path":       mediaCfg.LibraryPath,
		"media_item_path":          mediaCfg.ItemPath,
		"media_resolve_path":       mediaCfg.ResolvePath,
		"media_upload_path":        mediaCfg.UploadPath,
		"media_presign_path":       mediaCfg.PresignPath,
		"media_confirm_path":       mediaCfg.ConfirmPath,
		"media_capabilities_path":  mediaCfg.CapabilitiesPath,
		"media_default_value_mode": string(mediaCfg.DefaultValueMode),
	}
	viewCtx = EnrichLayoutViewContext(adm, c, viewCtx, mediaModuleID)
	viewCtx = CaptureViewContextForRequest(adm.Debug(), c, viewCtx)

	templateName := "resources/media/gallery"
	if normalizeMediaView(view) == "list" {
		templateName = "resources/media/list"
	}
	return templateview.RenderTemplateView(c, templateName, viewCtx)
}

func normalizeMediaView(view string) string {
	if strings.EqualFold(strings.TrimSpace(view), "list") {
		return "list"
	}
	return "grid"
}

func resolveMediaPagePath(urls urlkit.Resolver, group, routeKey, fallback string) string {
	if path := resolveURLWith(urls, group, routeKey, nil, nil); strings.TrimSpace(path) != "" {
		return path
	}
	return strings.TrimSpace(fallback)
}

func mediaModuleBasePath(adm *Admin, module *MediaModule) string {
	if module != nil && strings.TrimSpace(module.basePath) != "" {
		return strings.TrimRight(strings.TrimSpace(module.basePath), "/")
	}
	if adm == nil {
		return ""
	}
	basePath := strings.TrimRight(strings.TrimSpace(adm.config.BasePath), "/")
	if basePath == "" {
		return "/" + mediaModuleID
	}
	return basePath + "/" + mediaModuleID
}
