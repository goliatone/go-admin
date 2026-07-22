package admin

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"maps"
	"mime"
	"net/http"
	"strconv"
	"strings"
	"time"

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

	mediaAssetsListRouteKey       = "media.assets.list"
	mediaAssetsItemRouteKey       = "media.assets.item"
	mediaResolveRouteKey          = "media.resolve"
	mediaUploadRouteKey           = "media.upload"
	mediaPresignRouteKey          = "media.presign"
	mediaConfirmRouteKey          = "media.confirm"
	mediaCapabilitiesRouteKey     = "media.capabilities"
	mediaDeliveryAssetRouteKey    = "media.delivery.asset"
	mediaDeliveryStreamRouteKey   = "media.delivery.stream"
	mediaDeliveryPosterRouteKey   = "media.delivery.poster"
	mediaDeliveryDownloadRouteKey = "media.delivery.download"
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
	delivery      MediaDeliveryConfig
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
	m.delivery = normalizeMediaDeliveryConfig(m.delivery)
}

// RouteContract declares the UI and admin API routes owned by the media module.
func (m *MediaModule) RouteContract() routing.ModuleContract {
	delivery := normalizeMediaDeliveryConfig(m.delivery)
	contract := routing.ModuleContract{
		Slug: mediaModuleID,
		UIRoutes: map[string]string{
			mediaIndexRouteKey: "/",
			mediaListRouteKey:  "/list",
		},
		UIRouteDeclarations: map[string]routing.RouteDeclaration{
			mediaIndexRouteKey: {Method: router.GET, Path: "/"},
			mediaListRouteKey:  {Method: router.GET, Path: "/list"},
		},
		APIRoutes:            mediaAdminJSONRouteTable(),
		APIRouteDeclarations: mediaAdminJSONRouteDeclarations(),
	}
	if delivery.adminRoutesEnabled() {
		maps.Copy(contract.APIRoutes, mediaDeliveryRouteTable())
		maps.Copy(contract.APIRouteDeclarations, mediaDeliveryRouteDeclarations())
	}
	if delivery.publicRoutesEnabled() {
		contract.PublicAPIRoutes = mediaDeliveryRouteTable()
		contract.PublicAPIRouteDeclarations = mediaDeliveryRouteDeclarations()
	}
	return contract
}

func mediaAdminJSONRouteTable() map[string]string {
	return map[string]string{
		mediaAssetsListRouteKey:   "/assets",
		mediaAssetsItemRouteKey:   "/assets/:id",
		mediaResolveRouteKey:      "/resolve",
		mediaUploadRouteKey:       "/upload",
		mediaPresignRouteKey:      "/presign",
		mediaConfirmRouteKey:      "/confirm",
		mediaCapabilitiesRouteKey: "/capabilities",
	}
}

func mediaAdminJSONRouteDeclarations() map[string]routing.RouteDeclaration {
	return map[string]routing.RouteDeclaration{
		mediaAssetsListRouteKey:   {Method: router.GET, Path: "/assets"},
		mediaAssetsItemRouteKey:   {Method: router.GET, Path: "/assets/:id"},
		mediaResolveRouteKey:      {Method: router.POST, Path: "/resolve"},
		mediaUploadRouteKey:       {Method: router.POST, Path: "/upload"},
		mediaPresignRouteKey:      {Method: router.POST, Path: "/presign"},
		mediaConfirmRouteKey:      {Method: router.POST, Path: "/confirm"},
		mediaCapabilitiesRouteKey: {Method: router.GET, Path: "/capabilities"},
	}
}

func mediaDeliveryRouteTable() map[string]string {
	return map[string]string{
		mediaDeliveryAssetRouteKey:    "/delivery/:id/asset",
		mediaDeliveryStreamRouteKey:   "/delivery/:id/stream",
		mediaDeliveryPosterRouteKey:   "/delivery/:id/poster",
		mediaDeliveryDownloadRouteKey: "/delivery/:id/download",
	}
}

func mediaDeliveryRouteDeclarations() map[string]routing.RouteDeclaration {
	return map[string]routing.RouteDeclaration{
		mediaDeliveryAssetRouteKey:    {Method: router.GET, Path: "/delivery/:id/asset"},
		mediaDeliveryStreamRouteKey:   {Method: router.GET, Path: "/delivery/:id/stream"},
		mediaDeliveryPosterRouteKey:   {Method: router.GET, Path: "/delivery/:id/poster"},
		mediaDeliveryDownloadRouteKey: {Method: router.GET, Path: "/delivery/:id/download"},
	}
}

// WithDeliveryConfig configures route exposure before module route planning.
func (m *MediaModule) WithDeliveryConfig(cfg MediaDeliveryConfig) *MediaModule {
	if m == nil {
		return m
	}
	m.delivery = normalizeMediaDeliveryConfig(cfg)
	return m
}

// ValidateStartup rejects public delivery requests that cannot be authorized.
func (m *MediaModule) ValidateStartup(ctx context.Context) error {
	_ = ctx
	return normalizeMediaDeliveryConfig(m.delivery).validate()
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

	if path := m.adminAPIRoutePath(ctx, mediaAssetsListRouteKey); path != "" {
		ctx.ProtectedRouter.Get(path, m.mediaListHandler(responder, binding))
	}
	if path := m.adminAPIRoutePath(ctx, mediaAssetsItemRouteKey); path != "" {
		ctx.ProtectedRouter.Get(path, m.mediaGetHandler(responder, binding))
		ctx.ProtectedRouter.Patch(path, m.mediaUpdateHandler(responder, binding))
		ctx.ProtectedRouter.Delete(path, m.mediaDeleteHandler(responder, binding))
	}
	if path := m.adminAPIRoutePath(ctx, mediaResolveRouteKey); path != "" {
		ctx.ProtectedRouter.Post(path, m.mediaResolveHandler(responder, binding))
	}
	if path := m.adminAPIRoutePath(ctx, mediaUploadRouteKey); path != "" {
		ctx.ProtectedRouter.Post(path, m.mediaUploadHandler(responder, binding))
	}
	if path := m.adminAPIRoutePath(ctx, mediaPresignRouteKey); path != "" {
		ctx.ProtectedRouter.Post(path, m.mediaPresignHandler(responder, binding))
	}
	if path := m.adminAPIRoutePath(ctx, mediaConfirmRouteKey); path != "" {
		ctx.ProtectedRouter.Post(path, m.mediaConfirmHandler(responder, binding))
	}
	if path := m.adminAPIRoutePath(ctx, mediaCapabilitiesRouteKey); path != "" {
		ctx.ProtectedRouter.Get(path, m.mediaCapabilitiesHandler(responder, binding))
	}
	m.registerAdminDeliveryRoutes(ctx)
	m.registerPublicDeliveryRoutes(ctx)
}

func (m *MediaModule) registerAdminDeliveryRoutes(ctx ModuleContext) {
	if !normalizeMediaDeliveryConfig(m.delivery).adminRoutesEnabled() || ctx.ProtectedRouter == nil || ctx.Admin == nil {
		return
	}
	for routeKey, intent := range map[string]MediaDeliveryIntent{
		mediaDeliveryAssetRouteKey:    MediaDeliveryIntentAsset,
		mediaDeliveryStreamRouteKey:   MediaDeliveryIntentStream,
		mediaDeliveryPosterRouteKey:   MediaDeliveryIntentPoster,
		mediaDeliveryDownloadRouteKey: MediaDeliveryIntentDownload,
	} {
		path := m.adminAPIRoutePath(ctx, routeKey)
		if path == "" {
			continue
		}
		handler := m.mediaDeliveryHandler(ctx.Admin, intent)
		ctx.ProtectedRouter.Get(path, handler)
		ctx.ProtectedRouter.Head(path, handler)
	}
}

func (m *MediaModule) registerPublicDeliveryRoutes(ctx ModuleContext) {
	if !normalizeMediaDeliveryConfig(m.delivery).publicRoutesEnabled() || ctx.PublicRouter == nil || ctx.Admin == nil {
		return
	}
	for routeKey, intent := range map[string]MediaDeliveryIntent{
		mediaDeliveryAssetRouteKey:    MediaDeliveryIntentAsset,
		mediaDeliveryStreamRouteKey:   MediaDeliveryIntentStream,
		mediaDeliveryPosterRouteKey:   MediaDeliveryIntentPoster,
		mediaDeliveryDownloadRouteKey: MediaDeliveryIntentDownload,
	} {
		path := strings.TrimSpace(ctx.Routing.RoutePath(routing.SurfacePublicAPI, routeKey))
		if path == "" {
			continue
		}
		handler := m.mediaPublicDeliveryHandler(ctx.Admin, intent)
		ctx.PublicRouter.Get(path, handler)
		ctx.PublicRouter.Head(path, handler)
	}
}

func (m *MediaModule) adminAPIRoutePath(ctx ModuleContext, routeKey string) string {
	return strings.TrimSpace(ctx.Routing.RoutePath(routing.SurfaceAPI, routeKey))
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
				if closeErr := file.Reader.Close(); closeErr != nil {
					return
				}
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
		if unmarshalErr := json.Unmarshal([]byte(raw), &metadata); unmarshalErr != nil {
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

func (m *MediaModule) mediaDeliveryHandler(adm *Admin, intent MediaDeliveryIntent) router.HandlerFunc {
	return func(c router.Context) error {
		responder := responderAdapter{}
		if adm == nil {
			return responder.WriteError(c, ErrNotFound)
		}
		adminCtx := adm.adminContextFromRequest(c, adm.config.DefaultLocale)
		if err := adm.requirePermission(adminCtx, adm.config.MediaPermission, mediaModuleID); err != nil {
			return responder.WriteError(c, err)
		}
		return m.serveMediaDelivery(c, adm, adminCtx.Context, intent)
	}
}

func (m *MediaModule) mediaPublicDeliveryHandler(adm *Admin, intent MediaDeliveryIntent) router.HandlerFunc {
	return func(c router.Context) error {
		responder := responderAdapter{}
		if adm == nil {
			return responder.WriteError(c, ErrNotFound)
		}
		if err := m.authorizePublicMediaDelivery(c, intent); err != nil {
			return responder.WriteError(c, err)
		}
		return m.serveMediaDelivery(c, adm, c.Context(), intent)
	}
}

func (m *MediaModule) authorizePublicMediaDelivery(c router.Context, intent MediaDeliveryIntent) error {
	cfg := normalizeMediaDeliveryConfig(m.delivery).Public
	if !cfg.Enabled || !cfg.hasPolicy() {
		return ErrForbidden
	}
	httpReq := mediaHTTPDeliveryRequest(c)
	auth := MediaPublicDeliveryAuthorization{
		MediaID: strings.TrimSpace(c.Param("id")),
		Intent:  string(intent),
		Request: httpReq,
	}
	if cfg.TokenVerifier != nil {
		token := mediaPublicDeliveryTokenFromRequest(httpReq)
		if token == "" {
			return ErrForbidden
		}
		if err := cfg.TokenVerifier(c.Context(), token, auth); err != nil {
			return err
		}
	}
	if cfg.Authorizer != nil {
		if err := cfg.Authorizer(c.Context(), auth); err != nil {
			return err
		}
	}
	return nil
}

func (m *MediaModule) serveMediaDelivery(c router.Context, adm *Admin, ctx context.Context, intent MediaDeliveryIntent) error {
	responder := responderAdapter{}
	item, err := m.mediaDeliveryItem(ctx, adm, c.Param("id"))
	if err != nil {
		return responder.WriteError(c, err)
	}
	projector := adm.mediaDeliveryProjector
	if projector == nil {
		projector = DefaultMediaDeliveryReferenceProjector{}
	}
	reference, err := projector.ProjectMediaDeliveryReference(ctx, item)
	if err != nil {
		return responder.WriteError(c, err)
	}
	registry := adm.mediaDeliveryRegistry
	if registry == nil {
		registry = NewMediaDeliveryRegistry()
	}
	httpReq := mediaHTTPDeliveryRequest(c)
	response, err := registry.Resolve(ctx, MediaDeliveryRequest{
		Item:               item,
		Reference:          reference,
		Intent:             intent,
		Request:            httpReq,
		CredentialResolver: adm.mediaDeliveryCredentials,
	})
	if err != nil && response.Unavailable == nil {
		var unavailable MediaDeliveryUnavailableError
		if errors.As(err, &unavailable) {
			response = MediaDeliveryResponse{
				Mode: MediaDeliveryModeUnavailable,
				Unavailable: &MediaDeliveryUnavailable{
					State:  unavailable.State,
					Reason: unavailable.Reason,
					Code:   unavailable.Code,
				},
			}
		} else {
			return responder.WriteError(c, err)
		}
	}
	return writeMediaDeliveryResponse(c, intent, response)
}

func (m *MediaModule) mediaDeliveryItem(ctx context.Context, adm *Admin, id string) (MediaItem, error) {
	if adm == nil {
		return MediaItem{}, ErrNotFound
	}
	getter, ok := adm.mediaLibrary.(MediaGetter)
	if !ok {
		return MediaItem{}, serviceUnavailableDomainError("media getter not configured", map[string]any{
			"component": "media_delivery",
			"route":     mediaAssetsItemRouteKey,
		})
	}
	return getter.GetMedia(ctx, strings.TrimSpace(id))
}

func mediaHTTPDeliveryRequest(c router.Context) *http.Request {
	httpCtx, ok := c.(router.HTTPContext)
	if !ok {
		return nil
	}
	return httpCtx.Request()
}

func writeMediaDeliveryResponse(c router.Context, intent MediaDeliveryIntent, response MediaDeliveryResponse) error {
	httpCtx, ok := c.(router.HTTPContext)
	if !ok {
		return serviceUnavailableDomainError("http response writer not available", map[string]any{
			"component": "media_delivery",
		})
	}
	w := httpCtx.Response()
	r := httpCtx.Request()
	if w == nil || r == nil {
		return serviceUnavailableDomainError("http request/response not available", map[string]any{
			"component": "media_delivery",
		})
	}
	switch response.Mode {
	case MediaDeliveryModeRedirect:
		return writeMediaDeliveryRedirect(w, r, response.Redirect)
	case MediaDeliveryModeProxy:
		return writeMediaDeliveryProxy(w, r, intent, response.Proxy)
	case MediaDeliveryModeImported:
		return writeMediaDeliveryImported(w, r, intent, response.Imported)
	default:
		return writeMediaDeliveryUnavailable(w, response.Unavailable)
	}
}

func writeMediaDeliveryRedirect(w http.ResponseWriter, r *http.Request, redirect *MediaDeliveryRedirect) error {
	if redirect == nil || strings.TrimSpace(redirect.URL) == "" {
		return writeMediaDeliveryUnavailable(w, &MediaDeliveryUnavailable{
			State:  MediaDeliveryStateUnavailable,
			Reason: "media redirect unavailable",
			Code:   http.StatusServiceUnavailable,
		})
	}
	copyMediaDeliveryHeaders(w.Header(), redirect.Headers)
	if strings.TrimSpace(redirect.Cache) != "" {
		w.Header().Set("Cache-Control", strings.TrimSpace(redirect.Cache))
	}
	status := redirect.Status
	if status < 300 || status > 399 {
		status = http.StatusFound
	}
	http.Redirect(w, r, redirect.URL, status)
	return nil
}

func writeMediaDeliveryProxy(w http.ResponseWriter, r *http.Request, intent MediaDeliveryIntent, proxy *MediaDeliveryProxy) error {
	if proxy == nil || proxy.Reader == nil {
		return writeMediaDeliveryUnavailable(w, &MediaDeliveryUnavailable{
			State:  MediaDeliveryStateUnavailable,
			Reason: "media stream unavailable",
			Code:   http.StatusServiceUnavailable,
		})
	}
	defer func() {
		if closeErr := proxy.Reader.Close(); closeErr != nil {
			return
		}
	}()
	copyMediaDeliveryHeaders(w.Header(), proxy.Headers)
	if proxy.Range && proxy.ContentLength > 0 {
		w.Header().Set("Accept-Ranges", "bytes")
		if strings.TrimSpace(r.Header.Get("Range")) != "" {
			return writeMediaDeliveryProxyRange(w, r, intent, proxy)
		}
	}
	applyMediaDeliveryContentHeaders(w.Header(), intent, proxy.ContentType, proxy.ContentLength, proxy.FileName)
	if r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		return nil
	}
	_, err := io.Copy(w, proxy.Reader)
	return err
}

func writeMediaDeliveryProxyRange(w http.ResponseWriter, r *http.Request, intent MediaDeliveryIntent, proxy *MediaDeliveryProxy) error {
	size := proxy.ContentLength
	rng, ok, err := ParseMediaDeliveryRange(r.Header.Get("Range"), size)
	if err != nil {
		w.Header().Set("Content-Range", "bytes */"+strconv.FormatInt(size, 10))
		w.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
		return handledMediaDeliveryRangeError()
	}
	if !ok {
		applyMediaDeliveryContentHeaders(w.Header(), intent, proxy.ContentType, proxy.ContentLength, proxy.FileName)
		if r.Method == http.MethodHead {
			w.WriteHeader(http.StatusOK)
			return nil
		}
		_, copyErr := io.Copy(w, proxy.Reader)
		return copyErr
	}
	length := rng.End - rng.Start + 1
	applyMediaDeliveryContentHeaders(w.Header(), intent, proxy.ContentType, length, proxy.FileName)
	w.Header().Set("Content-Range", "bytes "+strconv.FormatInt(rng.Start, 10)+"-"+strconv.FormatInt(rng.End, 10)+"/"+strconv.FormatInt(size, 10))
	w.WriteHeader(http.StatusPartialContent)
	if r.Method == http.MethodHead {
		return nil
	}
	if rng.Start > 0 {
		if _, copyErr := io.CopyN(io.Discard, proxy.Reader, rng.Start); copyErr != nil {
			return copyErr
		}
	}
	_, err = io.CopyN(w, proxy.Reader, length)
	return err
}

func handledMediaDeliveryRangeError() error {
	return nil
}

func writeMediaDeliveryImported(w http.ResponseWriter, r *http.Request, intent MediaDeliveryIntent, imported *MediaDeliveryImported) error {
	if imported == nil || imported.Reader == nil {
		return writeMediaDeliveryUnavailable(w, &MediaDeliveryUnavailable{
			State:  MediaDeliveryStateUnavailable,
			Reason: "media content unavailable",
			Code:   http.StatusServiceUnavailable,
		})
	}
	if closer, ok := imported.Reader.(io.Closer); ok {
		defer func() {
			if closeErr := closer.Close(); closeErr != nil {
				return
			}
		}()
	}
	copyMediaDeliveryHeaders(w.Header(), imported.Headers)
	applyMediaDeliveryContentHeaders(w.Header(), intent, imported.ContentType, imported.ContentLength, imported.FileName)
	name := strings.TrimSpace(imported.FileName)
	if name == "" {
		name = "media"
	}
	modTime := imported.ModTime
	if modTime.IsZero() {
		modTime = time.Now()
	}
	http.ServeContent(w, r, name, modTime, imported.Reader)
	return nil
}

func writeMediaDeliveryUnavailable(w http.ResponseWriter, unavailable *MediaDeliveryUnavailable) error {
	if unavailable == nil {
		unavailable = &MediaDeliveryUnavailable{
			State:  MediaDeliveryStateUnavailable,
			Reason: "media delivery unavailable",
			Code:   http.StatusServiceUnavailable,
		}
	}
	status := unavailable.Code
	if status < 400 || status > 599 {
		status = http.StatusServiceUnavailable
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	payload := map[string]any{
		"error":  firstNonEmpty(unavailable.Reason, "media delivery unavailable"),
		"state":  NormalizeMediaDeliveryState(string(unavailable.State)),
		"status": status,
	}
	return json.NewEncoder(w).Encode(payload)
}

func copyMediaDeliveryHeaders(dst, src http.Header) {
	if dst == nil || len(src) == 0 {
		return
	}
	for key, values := range src {
		if strings.TrimSpace(key) == "" {
			continue
		}
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}

func applyMediaDeliveryContentHeaders(header http.Header, intent MediaDeliveryIntent, contentType string, contentLength int64, fileName string) {
	if header == nil {
		return
	}
	if strings.TrimSpace(contentType) != "" {
		header.Set("Content-Type", strings.TrimSpace(contentType))
	}
	if contentLength > 0 {
		header.Set("Content-Length", strconv.FormatInt(contentLength, 10))
	}
	if intent == MediaDeliveryIntentDownload {
		disposition := "attachment"
		if strings.TrimSpace(fileName) != "" {
			disposition = mime.FormatMediaType("attachment", map[string]string{"filename": strings.TrimSpace(fileName)})
		}
		header.Set("Content-Disposition", disposition)
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
			ID:          mediaModuleID,
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
		"title":                       adm.config.Title,
		"resource":                    mediaModuleID,
		"resource_label":              "Media",
		"media_view":                  normalizeMediaView(view),
		"media_gallery_path":          resolveMediaPagePath(m.urls, group, mediaIndexRouteKey, basePath),
		"media_list_path":             resolveMediaPagePath(m.urls, group, mediaListRouteKey, strings.TrimRight(basePath, "/")+"/list"),
		"media_library_path":          mediaCfg.LibraryPath,
		"media_item_path":             mediaCfg.ItemPath,
		"media_resolve_path":          mediaCfg.ResolvePath,
		"media_upload_path":           mediaCfg.UploadPath,
		"media_presign_path":          mediaCfg.PresignPath,
		"media_confirm_path":          mediaCfg.ConfirmPath,
		"media_capabilities_path":     mediaCfg.CapabilitiesPath,
		"media_asset_url_template":    mediaCfg.AssetURLTemplate,
		"media_stream_url_template":   mediaCfg.StreamURLTemplate,
		"media_poster_url_template":   mediaCfg.PosterURLTemplate,
		"media_download_url_template": mediaCfg.DownloadURLTemplate,
		"media_default_value_mode":    string(mediaCfg.DefaultValueMode),
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
