package admin

import (
	"encoding/json"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/boot"
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

	mediaLibraryRouteKey      = "media.library"
	mediaItemRouteKey         = "media.item"
	mediaResolveRouteKey      = "media.resolve"
	mediaUploadRouteKey       = "media.upload"
	mediaPresignRouteKey      = "media.presign"
	mediaConfirmRouteKey      = "media.confirm"
	mediaCapabilitiesRouteKey = "media.capabilities"
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
	m.registerAdminAPIRoutes(ctx)
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

// RouteContract declares the UI and admin API routes owned by the media module.
func (m *MediaModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug: mediaModuleID,
		UIRoutes: map[string]string{
			mediaIndexRouteKey: "/",
			mediaListRouteKey:  "/list",
		},
		APIRoutes: map[string]string{
			mediaLibraryRouteKey:      "/library",
			mediaItemRouteKey:         "/library/:id",
			mediaResolveRouteKey:      "/resolve",
			mediaUploadRouteKey:       "/upload",
			mediaPresignRouteKey:      "/presign",
			mediaConfirmRouteKey:      "/confirm",
			mediaCapabilitiesRouteKey: "/capabilities",
		},
	}
}

func (m *MediaModule) registerAdminAPIRoutes(ctx ModuleContext) {
	if ctx.ProtectedRouter == nil || ctx.Admin == nil {
		return
	}
	binding := newMediaBinding(ctx.Admin)
	if binding == nil {
		return
	}
	responder := responderAdapter{}

	ctx.ProtectedRouter.Get(m.apiRoutePath(ctx, mediaLibraryRouteKey), m.mediaListHandler(responder, binding))
	ctx.ProtectedRouter.Get(m.apiRoutePath(ctx, mediaItemRouteKey), m.mediaGetHandler(responder, binding))
	ctx.ProtectedRouter.Patch(m.apiRoutePath(ctx, mediaItemRouteKey), m.mediaUpdateHandler(responder, binding))
	ctx.ProtectedRouter.Delete(m.apiRoutePath(ctx, mediaItemRouteKey), m.mediaDeleteHandler(responder, binding))
	ctx.ProtectedRouter.Post(m.apiRoutePath(ctx, mediaResolveRouteKey), m.mediaResolveHandler(responder, binding))
	ctx.ProtectedRouter.Post(m.apiRoutePath(ctx, mediaUploadRouteKey), m.mediaUploadHandler(responder, binding))
	ctx.ProtectedRouter.Post(m.apiRoutePath(ctx, mediaPresignRouteKey), m.mediaPresignHandler(responder, binding))
	ctx.ProtectedRouter.Post(m.apiRoutePath(ctx, mediaConfirmRouteKey), m.mediaConfirmHandler(responder, binding))
	ctx.ProtectedRouter.Get(m.apiRoutePath(ctx, mediaCapabilitiesRouteKey), m.mediaCapabilitiesHandler(responder, binding))
}

func (m *MediaModule) apiRoutePath(ctx ModuleContext, routeKey string) string {
	if path := ctx.Routing.RoutePath(routing.SurfaceAPI, routeKey); strings.TrimSpace(path) != "" {
		return path
	}
	group := adminAPIGroupName(ctx.Admin.config)
	return resolveURLWith(ctx.Admin.URLs(), group, routeKey, nil, nil)
}

func (m *MediaModule) mediaListHandler(responder responderAdapter, binding boot.MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		payload, err := binding.List(c)
		return mediaModuleWriteJSONOrError(responder, c, payload, err)
	}
}

func (m *MediaModule) mediaGetHandler(responder responderAdapter, binding boot.MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		payload, err := binding.Get(c, c.Param("id"))
		return mediaModuleWriteJSONOrError(responder, c, payload, err)
	}
}

func (m *MediaModule) mediaUpdateHandler(responder responderAdapter, binding boot.MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		body, err := parseJSONBody(c)
		if err != nil {
			return responder.WriteError(c, err)
		}
		payload, err := binding.Update(c, c.Param("id"), body)
		return mediaModuleWriteJSONOrError(responder, c, payload, err)
	}
}

func (m *MediaModule) mediaDeleteHandler(responder responderAdapter, binding boot.MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		if err := binding.Delete(c, c.Param("id")); err != nil {
			return responder.WriteError(c, err)
		}
		return responder.WriteJSON(c, map[string]any{"status": "ok"})
	}
}

func (m *MediaModule) mediaResolveHandler(responder responderAdapter, binding boot.MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		body, err := parseJSONBody(c)
		if err != nil {
			return responder.WriteError(c, err)
		}
		payload, err := binding.Resolve(c, body)
		return mediaModuleWriteJSONOrError(responder, c, payload, err)
	}
}

func (m *MediaModule) mediaUploadHandler(responder responderAdapter, binding boot.MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		body, file, err := parseMediaModuleUploadRequest(c)
		if err != nil {
			return responder.WriteError(c, err)
		}
		if file.Reader != nil {
			defer func() {
				_ = file.Reader.Close()
			}()
		}
		payload, err := binding.Upload(c, body, file)
		return mediaModuleWriteJSONOrError(responder, c, payload, err)
	}
}

func (m *MediaModule) mediaPresignHandler(responder responderAdapter, binding boot.MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		body, err := parseJSONBody(c)
		if err != nil {
			return responder.WriteError(c, err)
		}
		payload, err := binding.Presign(c, body)
		return mediaModuleWriteJSONOrError(responder, c, payload, err)
	}
}

func (m *MediaModule) mediaConfirmHandler(responder responderAdapter, binding boot.MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		body, err := parseJSONBody(c)
		if err != nil {
			return responder.WriteError(c, err)
		}
		payload, err := binding.Confirm(c, body)
		return mediaModuleWriteJSONOrError(responder, c, payload, err)
	}
}

func (m *MediaModule) mediaCapabilitiesHandler(responder responderAdapter, binding boot.MediaBinding) router.HandlerFunc {
	return func(c router.Context) error {
		payload, err := binding.Capabilities(c)
		return mediaModuleWriteJSONOrError(responder, c, payload, err)
	}
}

func mediaModuleWriteJSONOrError(responder responderAdapter, c router.Context, payload any, err error) error {
	if err != nil {
		return responder.WriteError(c, err)
	}
	return responder.WriteJSON(c, payload)
}

func parseMediaModuleUploadRequest(c router.Context) (map[string]any, boot.MultipartFile, error) {
	header, err := c.FormFile("file")
	if err != nil || header == nil {
		return nil, boot.MultipartFile{}, validationDomainError("file required", map[string]any{
			"field": "file",
		})
	}

	body := map[string]any{}
	if value := strings.TrimSpace(c.FormValue("name")); value != "" {
		body["name"] = value
	}
	if value := strings.TrimSpace(c.FormValue("file_name")); value != "" {
		body["file_name"] = value
	}
	if value := strings.TrimSpace(c.FormValue("content_type")); value != "" {
		body["content_type"] = value
	}
	if raw := strings.TrimSpace(c.FormValue("metadata")); raw != "" {
		var metadata map[string]any
		if err := json.Unmarshal([]byte(raw), &metadata); err != nil {
			return nil, boot.MultipartFile{}, validationDomainError("metadata must be valid JSON", map[string]any{
				"field": "metadata",
			})
		}
		body["metadata"] = metadata
	}

	file, err := header.Open()
	if err != nil {
		return nil, boot.MultipartFile{}, validationDomainError("file required", map[string]any{
			"field": "file",
		})
	}

	contentType := strings.TrimSpace(header.Header.Get("Content-Type"))
	if contentType == "" {
		contentType = strings.TrimSpace(toString(body["content_type"]))
	}

	return body, boot.MultipartFile{
		FileName:    header.Filename,
		ContentType: contentType,
		Size:        header.Size,
		Reader:      file,
	}, nil
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
