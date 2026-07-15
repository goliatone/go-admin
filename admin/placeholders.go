package admin

import (
	"context"
	"strings"
	"sync"
	"sync/atomic"

	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// Authenticator wraps HTTP handlers with auth checks.
type Authenticator interface {
	Wrap(ctx router.Context) error
}

// HandlerAuthenticator can wrap handlers directly to preserve middleware semantics.
type HandlerAuthenticator interface {
	WrapHandler(handler router.HandlerFunc) router.HandlerFunc
}

// RequestAuthenticator performs request authentication without relying on
// browser-oriented redirect handlers. This is required for transports like
// WebSocket upgrades where redirects are not a valid auth response.
type RequestAuthenticator interface {
	AuthenticateRequest(c router.Context) error
}

// BrowserCSRFProtector exposes browser-session detection and CSRF enforcement
// for mutating routes that need browser-grade CSRF semantics without depending
// on a specific authenticator implementation.
type BrowserCSRFProtector interface {
	UsesBrowserSession(c router.Context) bool
	EnforceBrowserCSRF(c router.Context) error
}

type ProtectedSurfaceScope string

const (
	ProtectedSurfaceScopeAdmin        ProtectedSurfaceScope = "admin"
	ProtectedSurfaceScopeProtectedApp ProtectedSurfaceScope = "protected_app"
)

// GoAuthAuthenticator adapts a go-auth RouteAuthenticator to the Authenticator contract.
type GoAuthAuthenticator struct {
	middleware            router.MiddlewareFunc
	requestMiddleware     router.MiddlewareFunc
	routeAuth             *auth.RouteAuthenticator
	authConfig            auth.Config
	optionalAuth          bool
	authErrorHandler      func(router.Context, error) error
	protectedSurfaceScope ProtectedSurfaceScope
	browserRoots          []string
	apiRoots              []string
}

type resolvedPermissionsCacheContextKey struct{}

type resolvedPermissionsCache struct {
	once  sync.Once
	mu    sync.Mutex
	ready bool
	runs  uint64
	perms []string
	err   error
}

func (c *resolvedPermissionsCache) markResolved(perms []string, err error) {
	if c == nil {
		return
	}
	c.mu.Lock()
	c.perms = clonePermissions(perms)
	c.err = err
	c.ready = true
	c.runs++
	c.mu.Unlock()
}

func (c *resolvedPermissionsCache) snapshot() (perms []string, ready bool, runs uint64, err error) {
	if c == nil {
		return nil, false, 0, nil
	}
	c.mu.Lock()
	perms = clonePermissions(c.perms)
	err = c.err
	ready = c.ready
	runs = c.runs
	c.mu.Unlock()
	return perms, ready, runs, err
}

// WithResolvedPermissionsCache injects a request-scoped permission resolution cache into context.
func WithResolvedPermissionsCache(ctx context.Context) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if _, ok := ctx.Value(resolvedPermissionsCacheContextKey{}).(*resolvedPermissionsCache); ok {
		return ctx
	}
	return context.WithValue(ctx, resolvedPermissionsCacheContextKey{}, &resolvedPermissionsCache{})
}

func resolvedPermissionsCacheFromContext(ctx context.Context) *resolvedPermissionsCache {
	if ctx == nil {
		return nil
	}
	cache, _ := ctx.Value(resolvedPermissionsCacheContextKey{}).(*resolvedPermissionsCache) //nolint:errcheck // legacy dynamic payload keeps existing zero-value fallback behavior.
	return cache
}

// NewGoAuthAuthenticator builds an Authenticator that executes the protected go-auth middleware.
func NewGoAuthAuthenticator(routeAuth *auth.RouteAuthenticator, cfg auth.Config, opts ...GoAuthAuthenticatorOption) *GoAuthAuthenticator {
	return NewProtectedSurfaceAuthenticator(routeAuth, cfg, ProtectedSurfaceScopeAdmin, opts...)
}

// NewProtectedSurfaceAuthenticator builds an authenticator for a named protected surface.
func NewProtectedSurfaceAuthenticator(routeAuth *auth.RouteAuthenticator, cfg auth.Config, scope ProtectedSurfaceScope, opts ...GoAuthAuthenticatorOption) *GoAuthAuthenticator {
	if routeAuth == nil {
		return nil
	}
	authenticator := &GoAuthAuthenticator{
		routeAuth:             routeAuth,
		authConfig:            cfg,
		protectedSurfaceScope: normalizeProtectedSurfaceScope(scope),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(authenticator)
		}
	}
	authenticator.browserRoots, authenticator.apiRoots = resolveProtectedSurfaceRoots(authenticator)
	handler := authenticator.resolveErrorHandler()
	authenticator.middleware = resolveProtectedRouteMiddleware(authenticator, handler)
	authenticator.requestMiddleware = routeAuth.ProtectedRoute(cfg, authenticator.resolveRequestErrorHandler())
	return authenticator
}

func resolveProtectedRouteMiddleware(
	authenticator *GoAuthAuthenticator,
	handler func(router.Context, error) error,
) router.MiddlewareFunc {
	if authenticator == nil || authenticator.routeAuth == nil {
		return nil
	}
	protectedRoute := authenticator.routeAuth.ProtectedRoute(authenticator.authConfig, handler)
	protectedBrowserRoute := resolveProtectedBrowserRouteMiddleware(authenticator.routeAuth, authenticator.authConfig, handler)
	return func(next router.HandlerFunc) router.HandlerFunc {
		browserHandler := protectedBrowserRoute(next)
		routeHandler := protectedRoute(func(c router.Context) error {
			if err := enforceProtectedSurfaceAPIBrowserCSRF(c, authenticator.authConfig); err != nil {
				if c == nil {
					return err
				}
				return writeError(c, err)
			}
			return next(c)
		})
		return func(c router.Context) error {
			if c != nil {
				c.SetContext(WithResolvedPermissionsCache(c.Context()))
			}
			if authenticator.isProtectedAPIRequest(c) {
				return routeHandler(c)
			}
			return browserHandler(c)
		}
	}
}

func (a *GoAuthAuthenticator) isProtectedAPIRequest(c router.Context) bool {
	if c == nil {
		return false
	}
	for _, root := range a.apiRoots {
		if pathHasBase(c.Path(), root) {
			return true
		}
	}
	return false
}

func pathHasBase(path, base string) bool {
	path = normalizeBasePath(path)
	base = normalizeBasePath(base)
	if path == "" || base == "" {
		return false
	}
	return path == base || strings.HasPrefix(path, base+"/")
}

func resolveProtectedBrowserRouteMiddleware(
	routeAuth *auth.RouteAuthenticator,
	cfg auth.Config,
	handler func(router.Context, error) error,
) router.MiddlewareFunc {
	if routeAuth == nil {
		return nil
	}
	return routeAuth.ProtectedBrowserRoute(cfg, handler)
}

func resolveProtectedSurfaceRoots(authenticator *GoAuthAuthenticator) ([]string, []string) {
	if authenticator == nil {
		return nil, nil
	}

	browserRoots := normalizeProtectedSurfaceRootList(authenticator.browserRoots)
	apiRoots := normalizeProtectedSurfaceRootList(authenticator.apiRoots)
	roots := defaultProtectedSurfaceRoots(authenticator.authConfig, authenticator.protectedSurfaceScope)
	if len(browserRoots) == 0 {
		browserRoots = normalizeProtectedSurfaceRootList(roots.browser)
	}
	if len(apiRoots) == 0 {
		apiRoots = normalizeProtectedSurfaceRootList(roots.api)
	}
	return browserRoots, apiRoots
}

type protectedSurfaceRoots struct {
	browser []string
	api     []string
}

func defaultProtectedSurfaceRoots(cfg auth.Config, scope ProtectedSurfaceScope) protectedSurfaceRoots {
	scope = normalizeProtectedSurfaceScope(scope)
	if adminCfg, ok := cfg.(interface{ AdminConfig() Config }); ok {
		roots := effectiveRoutingRoots(adminCfg.AdminConfig())
		switch scope {
		case ProtectedSurfaceScopeProtectedApp:
			if normalizeBasePath(roots.ProtectedAppRoot) == "" && normalizeBasePath(roots.ProtectedAppAPIRoot) == "" {
				break
			}
			return protectedSurfaceRoots{
				browser: []string{roots.ProtectedAppRoot},
				api:     []string{roots.ProtectedAppAPIRoot},
			}
		default:
			if normalizeBasePath(roots.AdminRoot) == "" || normalizeBasePath(roots.APIRoot) == "" {
				break
			}
			return protectedSurfaceRoots{
				browser: []string{roots.AdminRoot},
				api:     []string{roots.APIRoot},
			}
		}
	}

	switch scope {
	case ProtectedSurfaceScopeProtectedApp:
		return protectedSurfaceRoots{}
	default:
		return protectedSurfaceRoots{
			browser: []string{"/admin"},
			api:     []string{"/admin/" + defaultAPIPrefix},
		}
	}
}

func normalizeProtectedSurfaceScope(scope ProtectedSurfaceScope) ProtectedSurfaceScope {
	switch strings.ToLower(strings.TrimSpace(string(scope))) {
	case string(ProtectedSurfaceScopeProtectedApp):
		return ProtectedSurfaceScopeProtectedApp
	default:
		return ProtectedSurfaceScopeAdmin
	}
}

func normalizeProtectedSurfaceRootList(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = normalizeBasePath(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// WrapHandler runs the go-auth middleware around the provided handler.
func (a *GoAuthAuthenticator) WrapHandler(handler router.HandlerFunc) router.HandlerFunc {
	if a == nil || a.middleware == nil {
		return handler
	}
	if handler == nil {
		handler = func(c router.Context) error { return nil }
	}
	return a.middleware(func(c router.Context) error {
		if c != nil {
			c.SetContext(WithResolvedPermissionsCache(c.Context()))
			markAuthenticatedRequest(c)
		}
		return handler(c)
	})
}

// Wrap runs the underlying go-auth middleware to enforce authentication.
func (a *GoAuthAuthenticator) Wrap(ctx router.Context) error {
	if a == nil || a.middleware == nil {
		return nil
	}
	return a.middleware(func(c router.Context) error {
		if c != nil {
			c.SetContext(WithResolvedPermissionsCache(c.Context()))
			markAuthenticatedRequest(c)
		}
		return nil
	})(ctx)
}

// AuthenticateRequest enforces authentication without browser redirects.
// This is suitable for websocket upgrades and other non-HTML transports.
func (a *GoAuthAuthenticator) AuthenticateRequest(ctx router.Context) error {
	if a == nil {
		return nil
	}
	if a.requestMiddleware == nil {
		return a.Wrap(ctx)
	}
	return a.requestMiddleware(func(c router.Context) error {
		if c != nil {
			c.SetContext(WithResolvedPermissionsCache(c.Context()))
			markAuthenticatedRequest(c)
		}
		return nil
	})(ctx)
}

func (a *GoAuthAuthenticator) UsesBrowserSession(c router.Context) bool {
	if a == nil || a.authConfig == nil {
		return false
	}
	return adminUsesCookieAuth(c, a.authConfig)
}

func (a *GoAuthAuthenticator) EnforceBrowserCSRF(c router.Context) error {
	if a == nil || a.authConfig == nil {
		return newAdminBrowserCSRFError(nil)
	}
	return validateAdminBrowserCSRF(c, a.authConfig)
}

func (a *GoAuthAuthenticator) resolveErrorHandler() func(router.Context, error) error {
	if a == nil || a.routeAuth == nil {
		return nil
	}
	var handler func(router.Context, error) error
	if a.authErrorHandler != nil {
		handler = a.authErrorHandler
	} else if a.optionalAuth {
		handler = a.routeAuth.MakeClientRouteAuthErrorHandler(true)
	} else {
		handler = a.routeAuth.MakeClientRouteAuthErrorHandler(false)
	}
	return func(ctx router.Context, err error) error {
		if handler == nil {
			return err
		}
		presenter := DefaultErrorPresenter()
		if err == nil {
			err = goerrors.New("unauthorized", goerrors.CategoryAuth).WithCode(goerrors.CodeUnauthorized)
		} else if mapped, _ := presenter.Present(err); mapped != nil {
			err = mapped
		} else {
			err = goerrors.New(err.Error(), goerrors.CategoryAuth).WithCode(goerrors.CodeUnauthorized)
		}
		return handler(ctx, err)
	}
}

func (a *GoAuthAuthenticator) resolveRequestErrorHandler() func(router.Context, error) error {
	if a == nil {
		return func(router.Context, error) error { return nil }
	}
	return func(_ router.Context, err error) error {
		return a.normalizeAuthError(err)
	}
}

func (a *GoAuthAuthenticator) normalizeAuthError(err error) error {
	presenter := DefaultErrorPresenter()
	if err == nil {
		return goerrors.New("unauthorized", goerrors.CategoryAuth).WithCode(goerrors.CodeUnauthorized)
	}
	if mapped, _ := presenter.Present(err); mapped != nil {
		// RequestAuthenticator is the non-redirecting protected-API contract.
		// Preserve the provider's diagnostic text code and metadata, but do not
		// expose token parsing failures as a client payload-validation status.
		return mapped.Clone().WithCode(goerrors.CodeUnauthorized)
	}
	return goerrors.New(err.Error(), goerrors.CategoryAuth).WithCode(goerrors.CodeUnauthorized)
}

// GoAuthAuthenticatorOption configures the go-auth authenticator adapter.
type GoAuthAuthenticatorOption func(*GoAuthAuthenticator)

// WithOptionalAuth allows requests without a valid token to proceed (client-side guards).
func WithOptionalAuth(optional bool) GoAuthAuthenticatorOption {
	return func(g *GoAuthAuthenticator) {
		if g != nil {
			g.optionalAuth = optional
		}
	}
}

// WithAuthErrorHandler overrides the error handler used by the wrapped go-auth middleware.
func WithAuthErrorHandler(handler func(router.Context, error) error) GoAuthAuthenticatorOption {
	return func(g *GoAuthAuthenticator) {
		if g != nil && handler != nil {
			g.authErrorHandler = handler
		}
	}
}

// WithProtectedSurfaceRoots overrides the browser and API roots used to choose
// protected-surface browser vs API auth behavior.
func WithProtectedSurfaceRoots(browserRoots, apiRoots []string) GoAuthAuthenticatorOption {
	return func(g *GoAuthAuthenticator) {
		if g == nil {
			return
		}
		g.browserRoots = append([]string{}, browserRoots...)
		g.apiRoots = append([]string{}, apiRoots...)
	}
}

// GoAuthAuthorizer adapts auth claims/resource roles to the admin Authorizer contract.
type GoAuthAuthorizer struct {
	defaultResource      string
	adminResourceAliases map[string]struct{}
	debug                bool
	logger               Logger
	resolvePerms         PermissionResolverFunc
	strictResolver       bool
	warnOnce             sync.Once
	noCacheWarnOnce      sync.Once

	resolverCalls              atomic.Uint64
	resolverRuns               atomic.Uint64
	resolverCacheHits          atomic.Uint64
	resolverCacheMisses        atomic.Uint64
	resolverErrors             atomic.Uint64
	resolverContextCacheAbsent atomic.Uint64
}

// PermissionResolverFunc resolves the effective permission set for a request context.
type PermissionResolverFunc func(context.Context) ([]string, error)

// PermissionResolverMetrics captures resolver/caching behavior counters.
type PermissionResolverMetrics struct {
	Calls              uint64 `json:"calls"`
	ResolverRuns       uint64 `json:"resolver_runs"`
	CacheHits          uint64 `json:"cache_hits"`
	CacheMisses        uint64 `json:"cache_misses"`
	Errors             uint64 `json:"errors"`
	ContextCacheAbsent uint64 `json:"context_cache_absent"`
}

// GoAuthAuthorizerConfig configures resource resolution.
type GoAuthAuthorizerConfig struct {
	DefaultResource      string                 `json:"default_resource"`
	AdminResourceAliases []string               `json:"admin_resource_aliases,omitempty"`
	Debug                bool                   `json:"debug"`
	Logger               Logger                 `json:"logger"`
	StrictResolver       bool                   `json:"strict_resolver"`
	ResolvePermissions   PermissionResolverFunc `json:"resolve_permissions"`
}

// NewGoAuthAuthorizer builds an Authorizer backed by go-auth claims.
func NewGoAuthAuthorizer(cfg GoAuthAuthorizerConfig) *GoAuthAuthorizer {
	authorizer := &GoAuthAuthorizer{
		defaultResource:      cfg.DefaultResource,
		adminResourceAliases: normalizeAdminResourceAliases(cfg.AdminResourceAliases),
		debug:                cfg.Debug,
		logger:               ensureLogger(cfg.Logger),
		strictResolver:       cfg.StrictResolver,
		resolvePerms:         cfg.ResolvePermissions,
	}
	if authorizer.resolvePerms == nil {
		if authorizer.strictResolver {
			panic("admin auth permission resolver is required in strict mode")
		}
		authorizer.logger.Warn(
			"auth permission resolver not configured; custom permissions will be denied",
			"default_resource", authorizer.defaultResource,
		)
	}
	return authorizer
}

// Can evaluates permission strings (admin.<resource>.<action>) against go-auth claims.
// It normalizes the action (e.g., "view" → "read") and checks if the user's
// resource role grants that capability using the AuthClaims interface methods.
func (a *GoAuthAuthorizer) Can(ctx context.Context, permission string, resource string) bool {
	if permission == "" {
		return true
	}
	action := normalizeAuthAction(permission)
	if action == "" {
		a.logDecision(permission, resource, "", false, "empty action")
		return false
	}
	target := strings.TrimSpace(resource)
	if target == "" {
		target = resourceFromPermission(permission)
	}
	if target == "" {
		target = a.defaultResource
	}
	if target == "" {
		a.logDecision(permission, resource, action, false, "no target")
		return false
	}

	// Get claims from context and use built-in capability checks
	claims, ok := auth.GetClaims(ctx)
	if !ok || claims == nil {
		a.logDecision(permission, target, action, false, "no claims")
		return false
	}

	if allowed, reason := a.resolvedPermissionGrantAllowed(ctx, permission, target, action); allowed {
		a.logDecision(permission, target, action, true, reason)
		return true
	}

	// Use AuthClaims methods which properly check resource roles
	var result bool
	switch action {
	case "read":
		result = claims.CanRead(target)
	case "edit":
		result = claims.CanEdit(target)
	case "create":
		result = claims.CanCreate(target)
	case "delete":
		result = claims.CanDelete(target)
	default:
		if a.resolvePerms == nil {
			a.warnOnce.Do(func() {
				ensureLogger(a.logger).Warn(
					"auth custom permission check without resolver; denying",
					"permission", permission,
					"target", target,
					"action", action,
				)
			})
			a.logDecision(permission, target, action, false, "permission resolver not configured")
			return false
		}
		a.logDecision(permission, target, action, false, "permission not found")
		return false
	}

	a.logDecision(permission, target, action, result, "")

	return result
}

// CanAll returns true when all permissions are allowed.
func (a *GoAuthAuthorizer) CanAll(ctx context.Context, resource string, permissions ...string) bool {
	filtered := compactPermissions(permissions...)
	if len(filtered) == 0 {
		return true
	}
	ctx = WithResolvedPermissionsCache(ctx)
	for _, permission := range filtered {
		if !a.Can(ctx, permission, resource) {
			return false
		}
	}
	return true
}

// CanAny returns true when at least one permission is allowed.
func (a *GoAuthAuthorizer) CanAny(ctx context.Context, resource string, permissions ...string) bool {
	filtered := compactPermissions(permissions...)
	if len(filtered) == 0 {
		return false
	}
	ctx = WithResolvedPermissionsCache(ctx)
	for _, permission := range filtered {
		if a.Can(ctx, permission, resource) {
			return true
		}
	}
	return false
}

// ResolvedPermissions returns the deduplicated permission set resolved for the request context.
func (a *GoAuthAuthorizer) ResolvedPermissions(ctx context.Context) []string {
	if a == nil || a.resolvePerms == nil {
		return nil
	}
	a.resolverCalls.Add(1)
	cache := resolvedPermissionsCacheFromContext(ctx)
	if cache == nil {
		return a.resolvePermissionsWithoutCache(ctx)
	}
	return a.resolvePermissionsWithCache(ctx, cache)
}

func (a *GoAuthAuthorizer) resolvePermissionsWithCache(ctx context.Context, cache *resolvedPermissionsCache) []string {
	_, readyBefore, _, _ := cache.snapshot() //nolint:errcheck // legacy best-effort call intentionally does not affect the primary result.
	if readyBefore {
		a.resolverCacheHits.Add(1)
	} else {
		a.resolverCacheMisses.Add(1)
	}
	cache.once.Do(func() {
		a.resolverRuns.Add(1)
		perms, err := a.resolvePerms(ctx)
		cache.markResolved(dedupePermissions(perms), err)
	})
	perms, _, runs, err := cache.snapshot()
	if runs > 1 {
		ensureLogger(a.logger).Warn("auth permission resolver executed more than once in request context", "runs", runs)
	}
	if err != nil {
		a.resolverErrors.Add(1)
		if a.debug {
			ensureLogger(a.logger).Debug("auth permission resolve failed", "error", err.Error())
		}
		return nil
	}
	return clonePermissions(perms)
}

func (a *GoAuthAuthorizer) resolvePermissionsWithoutCache(ctx context.Context) []string {
	a.resolverContextCacheAbsent.Add(1)
	a.resolverCacheMisses.Add(1)
	a.noCacheWarnOnce.Do(func() {
		ensureLogger(a.logger).Warn("auth permission resolver context cache missing; repeated checks may amplify queries")
	})
	a.resolverRuns.Add(1)
	perms, err := a.resolvePerms(ctx)
	if err != nil {
		a.resolverErrors.Add(1)
		if a.debug {
			ensureLogger(a.logger).Debug("auth permission resolve failed", "error", err.Error())
		}
		return nil
	}
	return clonePermissions(dedupePermissions(perms))
}

// PermissionResolverMetrics exposes resolver/caching runtime counters.
func (a *GoAuthAuthorizer) PermissionResolverMetrics() PermissionResolverMetrics {
	if a == nil {
		return PermissionResolverMetrics{}
	}
	return PermissionResolverMetrics{
		Calls:              a.resolverCalls.Load(),
		ResolverRuns:       a.resolverRuns.Load(),
		CacheHits:          a.resolverCacheHits.Load(),
		CacheMisses:        a.resolverCacheMisses.Load(),
		Errors:             a.resolverErrors.Load(),
		ContextCacheAbsent: a.resolverContextCacheAbsent.Load(),
	}
}

// ResolvedPermissionsFromAuthorizer extracts resolved permissions when supported by the authorizer implementation.
func ResolvedPermissionsFromAuthorizer(ctx context.Context, authorizer Authorizer) []string {
	if authorizer == nil {
		return nil
	}
	type resolvedPermissionProvider interface {
		ResolvedPermissions(context.Context) []string
	}
	provider, ok := authorizer.(resolvedPermissionProvider)
	if !ok || provider == nil {
		return nil
	}
	return dedupePermissions(provider.ResolvedPermissions(ctx))
}

func (a *GoAuthAuthorizer) logDecision(permission, target, action string, allowed bool, reason string) {
	if a == nil || !a.debug {
		return
	}
	logger := ensureLogger(a.logger)
	attrs := []any{
		"permission", permission,
		"target", target,
		"action", action,
		"allowed", allowed,
	}
	if reason != "" {
		attrs = append(attrs, "reason", reason)
		logger.Debug("auth decision", attrs...)
		return
	}
	logger.Debug("auth decision", attrs...)
}

func normalizeAuthAction(permission string) string {
	if permission == "" {
		return ""
	}
	candidate := strings.ToLower(strings.TrimSpace(permission))
	for _, sep := range []string{".", ":", "/"} {
		if strings.Contains(candidate, sep) {
			parts := strings.Split(candidate, sep)
			candidate = parts[len(parts)-1]
		}
	}
	switch candidate {
	case "view", "read", "list", "get", "search":
		return "read"
	case "edit", "update", "patch", "manage":
		return "edit"
	case "create", "add", "new", "import":
		return "create"
	case "delete", "remove", "destroy":
		return "delete"
	case "trigger", "run", "execute", "dispatch":
		return "edit"
	default:
		return candidate
	}
}

func resourceFromPermission(permission string) string {
	if permission == "" {
		return ""
	}
	parts := strings.FieldsFunc(permission, func(r rune) bool {
		return r == '.' || r == ':' || r == '/'
	})
	if len(parts) <= 1 {
		return strings.TrimSpace(permission)
	}
	return strings.Join(parts[:len(parts)-1], ".")
}

func (a *GoAuthAuthorizer) resolvedPermissionGrantAllowed(ctx context.Context, permission, target, action string) (bool, string) {
	if a == nil || a.resolvePerms == nil {
		return false, "permission resolver not configured"
	}
	perms := a.ResolvedPermissions(ctx)
	if len(perms) == 0 {
		return false, "permission resolver returned empty set"
	}
	for _, candidate := range permissionGrantCandidates(permission, target, action, a.defaultResource, a.adminResourceAliases) {
		if permissionGrantListed(perms, candidate) {
			return true, "resolved permission grant"
		}
	}
	return false, "permission not found"
}

func permissionGrantCandidates(permission, target, action, defaultResource string, adminResourceAliases map[string]struct{}) []string {
	rawPermission := strings.TrimSpace(permission)
	rawTarget := strings.TrimSpace(target)
	normalizedAction := strings.TrimSpace(action)
	rawAction := permissionActionToken(rawPermission)
	if rawAction == "" {
		rawAction = normalizedAction
	}
	if rawTarget == "" {
		rawTarget = resourceFromPermission(rawPermission)
	}
	if rawTarget == "" {
		rawTarget = strings.TrimSpace(defaultResource)
	}

	candidates := make([]string, 0, 6)
	add := func(value string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		for _, existing := range candidates {
			if strings.EqualFold(existing, value) {
				return
			}
		}
		candidates = append(candidates, value)
	}
	add(rawPermission)
	if rawTarget != "" {
		for _, token := range permissionActionCandidates(rawAction, normalizedAction) {
			add(rawTarget + "." + token)
			if shouldAddAdminNamespaceCandidate(rawPermission, rawTarget, defaultResource, adminResourceAliases) {
				add("admin." + rawTarget + "." + token)
			}
		}
	}
	return candidates
}

func permissionActionToken(permission string) string {
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return ""
	}
	for _, sep := range []string{".", ":", "/"} {
		if strings.Contains(permission, sep) {
			parts := strings.Split(permission, sep)
			return strings.TrimSpace(parts[len(parts)-1])
		}
	}
	return permission
}

func permissionActionCandidates(rawAction, normalizedAction string) []string {
	var candidates []string
	add := func(value string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		for _, existing := range candidates {
			if strings.EqualFold(existing, value) {
				return
			}
		}
		candidates = append(candidates, value)
	}
	add(rawAction)
	add(normalizedAction)
	switch strings.ToLower(strings.TrimSpace(normalizedAction)) {
	case "read":
		add("view")
	}
	return candidates
}

func shouldAddAdminNamespaceCandidate(permission, target, defaultResource string, adminResourceAliases map[string]struct{}) bool {
	target = strings.TrimSpace(target)
	if target == "" || strings.ContainsAny(target, ".:/") || strings.HasPrefix(strings.ToLower(target), "admin.") {
		return false
	}
	permission = strings.TrimSpace(permission)
	if strings.ContainsAny(permission, ".:/") && !strings.EqualFold(resourceFromPermission(permission), permission) {
		return false
	}
	if !strings.EqualFold(strings.TrimSpace(defaultResource), "admin") {
		return false
	}
	_, ok := adminResourceAliases[strings.ToLower(target)]
	return ok
}

func normalizeAdminResourceAliases(values []string) map[string]struct{} {
	aliases := map[string]struct{}{}
	for _, value := range defaultAdminResourceAliases() {
		value = strings.ToLower(strings.TrimSpace(value))
		if value != "" {
			aliases[value] = struct{}{}
		}
	}
	for _, value := range values {
		value = strings.ToLower(strings.TrimSpace(value))
		if value != "" && !strings.ContainsAny(value, ".:/") && !strings.HasPrefix(value, "admin.") {
			aliases[value] = struct{}{}
		}
	}
	return aliases
}

func defaultAdminResourceAliases() []string {
	return []string{
		"activity",
		"archive",
		"block_definitions",
		"commands",
		"content_modeling",
		"content_types",
		"dashboard",
		"debug",
		"feature_flags",
		"integrations",
		"jobs",
		"media",
		"menus",
		"notifications",
		"organizations",
		"pages",
		"posts",
		"preferences",
		"profile",
		"roles",
		"search",
		"settings",
		"site",
		"tenants",
		"transcripts",
		"translations",
		"users",
	}
}

func clonePermissions(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, len(values))
	copy(out, values)
	return out
}

func dedupePermissions(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		key := strings.ToLower(value)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func permissionGrantListed(values []string, permission string) bool {
	return permissionGrantCovering(values, permission) != ""
}

func permissionGrantCovering(values []string, permission string) string {
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return ""
	}
	for _, value := range values {
		if permissionGrantMatches(value, permission) {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func permissionGrantMatches(grant, permission string) bool {
	grant = strings.ToLower(strings.TrimSpace(grant))
	permission = strings.ToLower(strings.TrimSpace(permission))
	if grant == "" || permission == "" {
		return false
	}
	if grant == permission {
		return true
	}
	if !strings.HasSuffix(grant, ".*") {
		return false
	}
	prefix := strings.TrimSuffix(grant, "*")
	if !strings.HasPrefix(prefix, "admin.") {
		return false
	}
	return strings.HasPrefix(permission, prefix) && len(permission) > len(prefix)
}

// DashboardHandle and MenuHandle are kept for API compatibility and now alias real services.
type DashboardHandle = Dashboard
type MenuHandle = Navigation
