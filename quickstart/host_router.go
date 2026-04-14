package quickstart

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"os"
	"path"
	"path/filepath"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

// HostRouter exposes explicit route-registration surfaces for host-owned,
// admin-owned, public API, site, and static routes.
type HostRouter[T any] interface {
	System() router.Router[T]
	InternalOps() router.Router[T]
	AdminUI() router.Router[T]
	AdminAPI() router.Router[T]
	PublicAPI() router.Router[T]
	PublicSite() router.Router[T]
	Static() router.Router[T]
	Admin() coreadmin.AdminRouter
}

type hostRouter[T any] struct {
	router       router.Router[T]
	routeDomains hostRouteDomainResolver
	system       *hostSurfaceRouter[T]
	internalOps  *hostSurfaceRouter[T]
	adminUI      *hostSurfaceRouter[T]
	adminAPI     *hostSurfaceRouter[T]
	publicAPI    *hostSurfaceRouter[T]
	publicSite   *hostSiteSurfaceRouter[T]
	static       *hostSurfaceRouter[T]
	admin        *hostAdminRouter[T]
}

type hostRouteOperation string

const (
	hostRouteStandard hostRouteOperation = "route"
	hostRouteStatic   hostRouteOperation = "static"
	hostRouteWebSock  hostRouteOperation = "websocket"
)

type hostRouteValidator func(path string, op hostRouteOperation)

type hostSurfaceRouter[T any] struct {
	router      router.Router[T]
	scopePrefix string
	validator   hostRouteValidator
	middlewares []router.MiddlewareFunc
}

type hostSiteSurfaceRouter[T any] struct {
	hostSurfaceRouter[T]
	publicAPIRouter router.Router[T]
}

type hostAdminRouter[T any] struct {
	surface *hostSurfaceRouter[T]
}

// NewHostRouter returns explicit route-registration surfaces backed by the
// provided router.
func NewHostRouter[T any](r router.Router[T], cfg coreadmin.Config) HostRouter[T] {
	host := &hostRouter[T]{
		router:       r,
		routeDomains: newHostRouteDomainResolver(cfg),
	}
	host.system = host.newSurface(r.Group(""), host.validateSystemRoute)
	host.internalOps = host.newSurface(r.Group(""), nil)
	host.adminUI = host.newSurface(r.Group(""), host.validateAdminUIRoute)
	host.adminAPI = host.newSurface(r.Group(""), host.validateAdminAPIRoute)
	host.publicAPI = host.newSurface(r.Group(""), host.validatePublicAPIRoute)
	host.publicSite = host.newSiteSurface(r.Group(""), host.validatePublicSiteRoute, host.publicAPI)
	host.static = host.newSurface(r.Group(""), nil)
	host.admin = &hostAdminRouter[T]{
		surface: host.newSurface(r.Group(""), host.validateAdminRoute),
	}
	return host
}

func (h *hostRouter[T]) System() router.Router[T] {
	return h.system
}

func (h *hostRouter[T]) InternalOps() router.Router[T] {
	return h.internalOps
}

func (h *hostRouter[T]) AdminUI() router.Router[T] {
	return h.adminUI
}

func (h *hostRouter[T]) AdminAPI() router.Router[T] {
	return h.adminAPI
}

func (h *hostRouter[T]) PublicAPI() router.Router[T] {
	return h.publicAPI
}

func (h *hostRouter[T]) PublicSite() router.Router[T] {
	return h.publicSite
}

func (h *hostRouter[T]) Static() router.Router[T] {
	return h.static
}

func (h *hostRouter[T]) Admin() coreadmin.AdminRouter {
	return h.admin
}

func (h *hostRouter[T]) newSurface(backing router.Router[T], validator hostRouteValidator) *hostSurfaceRouter[T] {
	return &hostSurfaceRouter[T]{
		router:    backing,
		validator: validator,
	}
}

func (h *hostRouter[T]) newSiteSurface(backing router.Router[T], validator hostRouteValidator, publicAPI router.Router[T]) *hostSiteSurfaceRouter[T] {
	return &hostSiteSurfaceRouter[T]{
		hostSurfaceRouter: *h.newSurface(backing, validator),
		publicAPIRouter:   publicAPI,
	}
}

func (h *hostRouter[T]) validateSystemRoute(path string, op hostRouteOperation) {
	if h.classify(path, op) == adminrouting.RouteDomainSystem {
		return
	}
	panic(fmt.Sprintf("quickstart host router: system surface cannot register %q", path))
}

func (h *hostRouter[T]) validateAdminUIRoute(path string, op hostRouteOperation) {
	if h.classify(path, op) == adminrouting.RouteDomainAdminUI {
		return
	}
	panic(fmt.Sprintf("quickstart host router: admin UI surface cannot register %q", path))
}

func (h *hostRouter[T]) validateAdminAPIRoute(path string, op hostRouteOperation) {
	if h.classify(path, op) == adminrouting.RouteDomainAdminAPI {
		return
	}
	panic(fmt.Sprintf("quickstart host router: admin API surface cannot register %q", path))
}

func (h *hostRouter[T]) validatePublicAPIRoute(path string, op hostRouteOperation) {
	if h.classify(path, op) == adminrouting.RouteDomainPublicAPI {
		return
	}
	panic(fmt.Sprintf("quickstart host router: public API surface cannot register %q", path))
}

func (h *hostRouter[T]) validatePublicSiteRoute(path string, op hostRouteOperation) {
	switch h.classify(path, op) {
	case adminrouting.RouteDomainPublicSite:
		return
	default:
		panic(fmt.Sprintf("quickstart host router: public site surface cannot register %q", path))
	}
}

func (h *hostRouter[T]) validateAdminRoute(path string, op hostRouteOperation) {
	switch h.classify(path, op) {
	case adminrouting.RouteDomainAdminUI, adminrouting.RouteDomainAdminAPI, adminrouting.RouteDomainPublicAPI:
		return
	default:
		panic(fmt.Sprintf("quickstart host router: admin surface cannot register %q", path))
	}
}

func (h *hostRouter[T]) classify(candidate string, op hostRouteOperation) string {
	return h.routeDomains.classify(candidate, op)
}

func resolveHostRouterRoots(cfg coreadmin.Config) adminrouting.RootsConfig {
	defaults := adminrouting.DeriveDefaultRoots(adminrouting.RootDerivationInput{
		BasePath: cfg.BasePath,
		URLs: adminrouting.URLConfig{
			Admin: adminrouting.URLNamespaceConfig{
				BasePath:   cfg.URLs.Admin.BasePath,
				APIPrefix:  cfg.URLs.Admin.APIPrefix,
				APIVersion: cfg.URLs.Admin.APIVersion,
			},
			Public: adminrouting.URLNamespaceConfig{
				BasePath:   cfg.URLs.Public.BasePath,
				APIPrefix:  cfg.URLs.Public.APIPrefix,
				APIVersion: cfg.URLs.Public.APIVersion,
			},
		},
	})
	return adminrouting.MergeRoots(defaults, adminrouting.NormalizeRoots(cfg.Routing.Roots))
}

func resolveHostStaticPrefixes(cfg coreadmin.Config) []string {
	return uniqueHostPrefixes(append([]string{"/static"}, ResolveStaticAssetPrefixes(cfg)...))
}

func uniqueHostPrefixes(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = normalizeHostRoutePath(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func (r hostSurfaceRouter[T]) UnderlyingRouter() any {
	return r.router
}

func (r hostSiteSurfaceRouter[T]) PublicSiteRouter() router.Router[T] {
	return &r.hostSurfaceRouter
}

func (r hostSiteSurfaceRouter[T]) PublicAPIRouter() router.Router[T] {
	if r.publicAPIRouter == nil {
		return &r.hostSurfaceRouter
	}
	return r.publicAPIRouter
}

func (r hostSiteSurfaceRouter[T]) Group(prefix string) router.Router[T] {
	return &hostSiteSurfaceRouter[T]{
		hostSurfaceRouter: hostSurfaceRouter[T]{
			router:      r.hostSurfaceRouter.router.Group(prefix),
			scopePrefix: joinHostScopePrefix(r.scopePrefix, prefix),
			validator:   r.validator,
			middlewares: append([]router.MiddlewareFunc{}, r.middlewares...),
		},
		publicAPIRouter: r.publicAPIRouter,
	}
}

func (r hostSiteSurfaceRouter[T]) Mount(prefix string) router.Router[T] {
	return &hostSiteSurfaceRouter[T]{
		hostSurfaceRouter: hostSurfaceRouter[T]{
			router:      r.hostSurfaceRouter.router.Mount(prefix),
			scopePrefix: joinHostScopePrefix(r.scopePrefix, prefix),
			validator:   r.validator,
			middlewares: append([]router.MiddlewareFunc{}, r.middlewares...),
		},
		publicAPIRouter: r.publicAPIRouter,
	}
}

func (r hostSiteSurfaceRouter[T]) WithGroup(groupPath string, cb func(router.Router[T])) router.Router[T] {
	group := r.Group(groupPath)
	if cb != nil {
		cb(group)
	}
	return group
}

func (r *hostSiteSurfaceRouter[T]) Use(m ...router.MiddlewareFunc) router.Router[T] {
	r.hostSurfaceRouter.router = r.hostSurfaceRouter.router.Use(m...)
	r.hostSurfaceRouter.middlewares = append(r.hostSurfaceRouter.middlewares, m...)
	return r
}

func (r hostSurfaceRouter[T]) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.validate(path, hostRouteStandard)
	return r.router.Handle(method, path, handler, mw...)
}

func (r hostSurfaceRouter[T]) Group(prefix string) router.Router[T] {
	return &hostSurfaceRouter[T]{
		router:      r.router.Group(prefix),
		scopePrefix: joinHostScopePrefix(r.scopePrefix, prefix),
		validator:   r.validator,
		middlewares: append([]router.MiddlewareFunc{}, r.middlewares...),
	}
}

func (r hostSurfaceRouter[T]) Mount(prefix string) router.Router[T] {
	return &hostSurfaceRouter[T]{
		router:      r.router.Mount(prefix),
		scopePrefix: joinHostScopePrefix(r.scopePrefix, prefix),
		validator:   r.validator,
		middlewares: append([]router.MiddlewareFunc{}, r.middlewares...),
	}
}

func (r hostSurfaceRouter[T]) WithGroup(groupPath string, cb func(router.Router[T])) router.Router[T] {
	group := r.Group(groupPath)
	if cb != nil {
		cb(group)
	}
	return group
}

func (r *hostSurfaceRouter[T]) Use(m ...router.MiddlewareFunc) router.Router[T] {
	r.router = r.router.Use(m...)
	r.middlewares = append(r.middlewares, m...)
	return r
}

func (r hostSurfaceRouter[T]) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.validate(path, hostRouteStandard)
	return r.router.Get(path, handler, mw...)
}

func (r hostSurfaceRouter[T]) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.validate(path, hostRouteStandard)
	return r.router.Post(path, handler, mw...)
}

func (r hostSurfaceRouter[T]) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.validate(path, hostRouteStandard)
	return r.router.Put(path, handler, mw...)
}

func (r hostSurfaceRouter[T]) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.validate(path, hostRouteStandard)
	return r.router.Delete(path, handler, mw...)
}

func (r hostSurfaceRouter[T]) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.validate(path, hostRouteStandard)
	return r.router.Patch(path, handler, mw...)
}

func (r hostSurfaceRouter[T]) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.validate(path, hostRouteStandard)
	return r.router.Head(path, handler, mw...)
}

func (r hostSurfaceRouter[T]) Static(prefix, root string, config ...router.Static) router.Router[T] {
	r.validate(prefix, hostRouteStatic)
	if len(r.middlewares) != 0 {
		r.registerStaticWithSurfaceMiddleware(prefix, root, config...)
		return &hostSurfaceRouter[T]{
			router:      r.router,
			scopePrefix: r.scopePrefix,
			validator:   r.validator,
			middlewares: append([]router.MiddlewareFunc{}, r.middlewares...),
		}
	}
	return &hostSurfaceRouter[T]{
		router:      r.router.Static(prefix, root, config...),
		scopePrefix: r.scopePrefix,
		validator:   r.validator,
		middlewares: append([]router.MiddlewareFunc{}, r.middlewares...),
	}
}

func (r hostSurfaceRouter[T]) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	r.validate(path, hostRouteWebSock)
	return r.router.WebSocket(path, config, handler)
}

func (r hostSurfaceRouter[T]) Routes() []router.RouteDefinition {
	return r.router.Routes()
}

func (r hostSurfaceRouter[T]) ValidateRoutes() []error {
	return r.router.ValidateRoutes()
}

func (r hostSurfaceRouter[T]) PrintRoutes() {
	r.router.PrintRoutes()
}

func (r hostSurfaceRouter[T]) WithLogger(logger router.Logger) router.Router[T] {
	return &hostSurfaceRouter[T]{
		router:      r.router.WithLogger(logger),
		scopePrefix: r.scopePrefix,
		validator:   r.validator,
		middlewares: append([]router.MiddlewareFunc{}, r.middlewares...),
	}
}

func (r hostSiteSurfaceRouter[T]) WithLogger(logger router.Logger) router.Router[T] {
	return &hostSiteSurfaceRouter[T]{
		hostSurfaceRouter: hostSurfaceRouter[T]{
			router:      r.hostSurfaceRouter.router.WithLogger(logger),
			scopePrefix: r.scopePrefix,
			validator:   r.validator,
			middlewares: append([]router.MiddlewareFunc{}, r.middlewares...),
		},
		publicAPIRouter: r.publicAPIRouter,
	}
}

func (r hostSurfaceRouter[T]) HandleMiss(method router.HTTPMethod, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) {
	if registrar, ok := any(r.router).(router.MissHandlerRegistrar); ok {
		registrar.HandleMiss(method, chainHostHandler(handler, r.routeMiddlewares(middlewares)))
	}
}

func (r hostSurfaceRouter[T]) validate(path string, op hostRouteOperation) {
	if r.validator == nil {
		return
	}
	r.validator(joinHostScopePrefix(r.scopePrefix, path), op)
}

func (r hostSurfaceRouter[T]) routeMiddlewares(extra []router.MiddlewareFunc) []router.MiddlewareFunc {
	if len(r.middlewares) == 0 {
		return extra
	}
	out := make([]router.MiddlewareFunc, 0, len(r.middlewares)+len(extra))
	out = append(out, r.middlewares...)
	out = append(out, extra...)
	return out
}

func chainHostHandler(handler router.HandlerFunc, middlewares []router.MiddlewareFunc) router.HandlerFunc {
	if handler == nil || len(middlewares) == 0 {
		return handler
	}
	wrapped := handler
	for i := len(middlewares) - 1; i >= 0; i-- {
		if middlewares[i] == nil {
			continue
		}
		wrapped = middlewares[i](wrapped)
	}
	return wrapped
}

func (r hostSurfaceRouter[T]) registerStaticWithSurfaceMiddleware(prefix, root string, config ...router.Static) {
	cfg := mergeHostStaticConfig(router.Static{
		Root:  root,
		Index: "index.html",
	}, config...)
	fileSystem, fsErr := prepareHostStaticFilesystem(cfg)
	if fsErr != nil {
		r.registerStaticErrorHandlers(prefix, fsErr)
		return
	}

	fullPrefix := normalizeHostRoutePath(joinHostScopePrefix(r.scopePrefix, prefix))
	if fullPrefix == "" {
		fullPrefix = "/"
	}
	handler := hostStaticHandler(fullPrefix, fileSystem, cfg)
	exactPath, wildcardPath := hostStaticRoutePaths(r.router, prefix)
	r.router.Get(exactPath, handler)
	r.router.Head(exactPath, handler)
	if wildcardPath != "" && wildcardPath != exactPath {
		r.router.Get(wildcardPath, handler)
		r.router.Head(wildcardPath, handler)
	}
}

func (r hostSurfaceRouter[T]) registerStaticErrorHandlers(prefix string, err error) {
	handler := func(c router.Context) error {
		return c.Status(500).SendString(err.Error())
	}
	exactPath, wildcardPath := hostStaticRoutePaths(r.router, prefix)
	r.router.Get(exactPath, handler)
	r.router.Head(exactPath, handler)
	if wildcardPath != "" && wildcardPath != exactPath {
		r.router.Get(wildcardPath, handler)
		r.router.Head(wildcardPath, handler)
	}
}

func hostStaticRoutePaths[T any](backing router.Router[T], prefix string) (string, string) {
	prefix = normalizeHostRoutePath(prefix)
	if prefix == "" {
		prefix = "/"
	}
	switch hostUnwrapRouterAdapter(any(backing)).(type) {
	case *router.FiberRouter:
		if prefix == "/" {
			return "/", "/*"
		}
		return prefix, prefix + "/*"
	default:
		if prefix == "/" {
			return "/", "/*filepath"
		}
		return prefix, prefix + "/*filepath"
	}
}

func hostStaticHandler(prefix string, fileSystem fs.FS, cfg router.Static) router.HandlerFunc {
	prefix = normalizeHostRoutePath(prefix)
	if prefix == "" {
		prefix = "/"
	}
	indexFile := strings.TrimSpace(cfg.Index)
	if indexFile == "" {
		indexFile = "index.html"
	}

	return func(c router.Context) error {
		reqPath := c.Path()
		filePath := strings.TrimPrefix(reqPath, prefix)
		filePath = strings.TrimPrefix(filePath, "/")

		if filePath == "" && cfg.Browse {
			filePath = "."
		} else if filePath == "" {
			filePath = indexFile
		}
		filePath = path.Clean(filePath)
		if filePath == "/" {
			filePath = "."
		}

		f, err := fileSystem.Open(filePath)
		if err != nil {
			if errors.Is(err, fs.ErrNotExist) {
				return c.Status(404).SendString("Not Found")
			}
			return c.Status(500).SendString(err.Error())
		}
		defer f.Close()

		stat, err := f.Stat()
		if err != nil {
			return c.Status(500).SendString(err.Error())
		}
		if stat.IsDir() {
			if cfg.Browse {
				return c.Status(404).SendString("Not Found")
			}
			indexPath := path.Join(filePath, indexFile)
			indexFileHandle, indexErr := fileSystem.Open(indexPath)
			if indexErr != nil {
				if errors.Is(indexErr, fs.ErrNotExist) {
					return c.Status(404).SendString("Not Found")
				}
				return c.Status(500).SendString(indexErr.Error())
			}
			defer indexFileHandle.Close()
			f = indexFileHandle
			filePath = indexPath
		}

		if cfg.MaxAge > 0 {
			c.SetHeader("Cache-Control", fmt.Sprintf("public, max-age=%d", cfg.MaxAge))
		}
		if mimeType := mime.TypeByExtension(path.Ext(filePath)); mimeType != "" {
			c.SetHeader("Content-Type", mimeType)
		}
		if cfg.Download {
			c.SetHeader("Content-Disposition", "attachment; filename="+path.Base(filePath))
		}
		if cfg.ModifyResponse != nil {
			if err := cfg.ModifyResponse(c); err != nil {
				return err
			}
		}

		content, err := io.ReadAll(f)
		if err != nil {
			return c.Status(500).SendString(err.Error())
		}
		return c.Send(content)
	}
}

func mergeHostStaticConfig(base router.Static, overrides ...router.Static) router.Static {
	if base.Index == "" {
		base.Index = "index.html"
	}
	if base.Root == "" {
		base.Root = "."
	}
	if len(overrides) == 0 {
		return base
	}
	o := overrides[0]
	if o.FS != nil {
		base.FS = o.FS
	}
	if strings.TrimSpace(o.Root) != "" {
		base.Root = o.Root
	}
	if o.Browse {
		base.Browse = true
	}
	if strings.TrimSpace(o.Index) != "" {
		base.Index = o.Index
	}
	if o.MaxAge > 0 {
		base.MaxAge = o.MaxAge
	}
	if o.Download {
		base.Download = true
	}
	if o.Compress {
		base.Compress = true
	}
	if o.ModifyResponse != nil {
		base.ModifyResponse = o.ModifyResponse
	}
	return base
}

func prepareHostStaticFilesystem(cfg router.Static) (fs.FS, error) {
	if cfg.FS != nil {
		root := normalizeHostStaticRoot(cfg.Root)
		fsToUse := cfg.FS
		if root != "." {
			if _, err := fs.Stat(cfg.FS, root); err != nil {
				return nil, fmt.Errorf("filesystem root validation failed for %q: %w", root, err)
			}
			sub, err := fs.Sub(cfg.FS, root)
			if err != nil {
				return nil, fmt.Errorf("failed to resolve filesystem root %q: %w", root, err)
			}
			fsToUse = sub
		}
		return fsToUse, nil
	}

	localRoot := cfg.Root
	if strings.TrimSpace(localRoot) == "" {
		localRoot = "."
	}
	cleaned := filepath.Clean(localRoot)
	info, err := os.Stat(cleaned)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("static root %q must be a directory", cleaned)
	}
	return os.DirFS(cleaned), nil
}

func normalizeHostStaticRoot(root string) string {
	root = strings.TrimSpace(root)
	if root == "" || root == "/" {
		return "."
	}
	root = path.Clean(root)
	root = strings.TrimPrefix(root, "/")
	if root == "" {
		return "."
	}
	return root
}

type hostRouterAdapterUnwrapper interface {
	UnderlyingRouter() any
}

func hostUnwrapRouterAdapter(value any) any {
	for value != nil {
		unwrapper, ok := value.(hostRouterAdapterUnwrapper)
		if !ok {
			return value
		}
		next := unwrapper.UnderlyingRouter()
		if next == nil || next == value {
			return value
		}
		value = next
	}
	return nil
}

func joinHostScopePrefix(scopePrefix, routePath string) string {
	scopePrefix = strings.TrimSpace(scopePrefix)
	routePath = strings.TrimSpace(routePath)
	switch {
	case routePath == "":
		return scopePrefix
	case scopePrefix == "":
		return routePath
	default:
		return prefixBasePath(scopePrefix, routePath)
	}
}

func (r hostAdminRouter[T]) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.surface.Handle(method, path, handler, mw...)
}

func (r hostAdminRouter[T]) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.surface.Get(path, handler, mw...)
}

func (r hostAdminRouter[T]) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.surface.Post(path, handler, mw...)
}

func (r hostAdminRouter[T]) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.surface.Put(path, handler, mw...)
}

func (r hostAdminRouter[T]) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.surface.Delete(path, handler, mw...)
}

func (r hostAdminRouter[T]) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.surface.Patch(path, handler, mw...)
}

func (r hostAdminRouter[T]) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.surface.Head(path, handler, mw...)
}

func (r hostAdminRouter[T]) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	return r.surface.WebSocket(path, config, handler)
}
