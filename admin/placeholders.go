package admin

import (
	"context"
	"os"
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

// GoAuthAuthenticator adapts a go-auth RouteAuthenticator to the Authenticator contract.
type GoAuthAuthenticator struct {
	middleware       router.MiddlewareFunc
	routeAuth        *auth.RouteAuthenticator
	authConfig       auth.Config
	optionalAuth     bool
	authErrorHandler func(router.Context, error) error
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

func (c *resolvedPermissionsCache) snapshot() (perms []string, err error, ready bool, runs uint64) {
	if c == nil {
		return nil, nil, false, 0
	}
	c.mu.Lock()
	perms = clonePermissions(c.perms)
	err = c.err
	ready = c.ready
	runs = c.runs
	c.mu.Unlock()
	return perms, err, ready, runs
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
	cache, _ := ctx.Value(resolvedPermissionsCacheContextKey{}).(*resolvedPermissionsCache)
	return cache
}

// NewGoAuthAuthenticator builds an Authenticator that executes the protected go-auth middleware.
func NewGoAuthAuthenticator(routeAuth *auth.RouteAuthenticator, cfg auth.Config, opts ...GoAuthAuthenticatorOption) *GoAuthAuthenticator {
	if routeAuth == nil {
		return nil
	}
	authenticator := &GoAuthAuthenticator{
		routeAuth:  routeAuth,
		authConfig: cfg,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(authenticator)
		}
	}
	handler := authenticator.resolveErrorHandler()
	authenticator.middleware = routeAuth.ProtectedRoute(cfg, handler)
	return authenticator
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
		}
		return nil
	})(ctx)
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

// GoAuthAuthorizer adapts auth claims/resource roles to the admin Authorizer contract.
type GoAuthAuthorizer struct {
	defaultResource string
	debug           bool
	logger          Logger
	resolvePerms    PermissionResolverFunc
	strictResolver  bool
	warnOnce        sync.Once
	noCacheWarnOnce sync.Once

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
	Calls              uint64
	ResolverRuns       uint64
	CacheHits          uint64
	CacheMisses        uint64
	Errors             uint64
	ContextCacheAbsent uint64
}

// GoAuthAuthorizerConfig configures resource resolution.
type GoAuthAuthorizerConfig struct {
	DefaultResource    string
	Debug              bool
	Logger             Logger
	StrictResolver     bool
	ResolvePermissions PermissionResolverFunc
}

// NewGoAuthAuthorizer builds an Authorizer backed by go-auth claims.
func NewGoAuthAuthorizer(cfg GoAuthAuthorizerConfig) *GoAuthAuthorizer {
	authorizer := &GoAuthAuthorizer{
		defaultResource: cfg.DefaultResource,
		debug:           cfg.Debug || strings.EqualFold(os.Getenv("AUTH_DEBUG"), "true"),
		logger:          ensureLogger(cfg.Logger),
		strictResolver:  cfg.StrictResolver || strings.EqualFold(os.Getenv("ADMIN_AUTH_RESOLVER_STRICT"), "true"),
		resolvePerms:    cfg.ResolvePermissions,
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

// Can evaluates permission strings (admin.*.<action>) against go-auth claims.
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
		result, reason := a.permissionAllowed(ctx, permission, target, action)
		a.logDecision(permission, target, action, result, reason)
		return result
	}

	a.logDecision(permission, target, action, result, "")

	return result
}

// CanAll returns true when all permissions are allowed.
func (a *GoAuthAuthorizer) CanAll(ctx context.Context, resource string, permissions ...string) bool {
	if len(permissions) == 0 {
		return true
	}
	ctx = WithResolvedPermissionsCache(ctx)
	for _, permission := range permissions {
		if !a.Can(ctx, strings.TrimSpace(permission), resource) {
			return false
		}
	}
	return true
}

// CanAny returns true when at least one permission is allowed.
func (a *GoAuthAuthorizer) CanAny(ctx context.Context, resource string, permissions ...string) bool {
	if len(permissions) == 0 {
		return false
	}
	ctx = WithResolvedPermissionsCache(ctx)
	for _, permission := range permissions {
		if a.Can(ctx, strings.TrimSpace(permission), resource) {
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
	if cache := resolvedPermissionsCacheFromContext(ctx); cache != nil {
		_, _, readyBefore, _ := cache.snapshot()
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
		perms, err, _, runs := cache.snapshot()
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

func (a *GoAuthAuthorizer) permissionAllowed(ctx context.Context, permission, target, action string) (bool, string) {
	if a == nil {
		return false, "authorizer unavailable"
	}
	if a.resolvePerms == nil {
		a.warnOnce.Do(func() {
			ensureLogger(a.logger).Warn(
				"auth custom permission check without resolver; denying",
				"permission", permission,
				"target", target,
				"action", action,
			)
		})
		return false, "permission resolver not configured"
	}
	perms := a.ResolvedPermissions(ctx)
	if len(perms) == 0 {
		return false, "permission resolver returned empty set"
	}
	if permissionListed(perms, permission) {
		return true, ""
	}
	if target != "" && action != "" {
		alt := target + "." + action
		if alt != permission && permissionListed(perms, alt) {
			return true, ""
		}
	}
	return false, "permission not found"
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

func permissionListed(values []string, permission string) bool {
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return false
	}
	for _, value := range values {
		if strings.EqualFold(value, permission) {
			return true
		}
	}
	return false
}

// DashboardHandle and MenuHandle are kept for API compatibility and now alias real services.
type DashboardHandle = Dashboard
type MenuHandle = Navigation
