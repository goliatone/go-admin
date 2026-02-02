package admin

import (
	"context"
	"log"
	"os"
	"strings"

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
	return a.middleware(handler)
}

// Wrap runs the underlying go-auth middleware to enforce authentication.
func (a *GoAuthAuthenticator) Wrap(ctx router.Context) error {
	if a == nil || a.middleware == nil {
		return nil
	}
	return a.middleware(func(c router.Context) error { return nil })(ctx)
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
	logger          func(format string, args ...any)
}

// GoAuthAuthorizerConfig configures resource resolution.
type GoAuthAuthorizerConfig struct {
	DefaultResource string
	Debug           bool
	Logger          func(format string, args ...any)
}

// NewGoAuthAuthorizer builds an Authorizer backed by go-auth claims.
func NewGoAuthAuthorizer(cfg GoAuthAuthorizerConfig) *GoAuthAuthorizer {
	return &GoAuthAuthorizer{
		defaultResource: cfg.DefaultResource,
		debug:           cfg.Debug || strings.EqualFold(os.Getenv("AUTH_DEBUG"), "true"),
		logger:          cfg.Logger,
	}
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
		result = permissionAllowed(ctx, permission, target, action)
		reason := ""
		if !result {
			reason = "permission not found"
		}
		a.logDecision(permission, target, action, result, reason)
		return result
	}

	a.logDecision(permission, target, action, result, "")

	return result
}

func (a *GoAuthAuthorizer) logDecision(permission, target, action string, allowed bool, reason string) {
	if !a.debug {
		return
	}
	logger := a.logger
	if logger == nil {
		logger = log.Printf
	}
	if reason != "" {
		logger("[auth] perm=%s target=%s action=%s allowed=%t reason=%s", permission, target, action, allowed, reason)
		return
	}
	logger("[auth] perm=%s target=%s action=%s allowed=%t", permission, target, action, allowed)
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

func permissionAllowed(ctx context.Context, permission, target, action string) bool {
	perms := permissionsFromContext(ctx)
	if len(perms) == 0 {
		return false
	}
	if permissionListed(perms, permission) {
		return true
	}
	if target != "" && action != "" {
		alt := target + "." + action
		if alt != permission && permissionListed(perms, alt) {
			return true
		}
	}
	return false
}

func permissionsFromContext(ctx context.Context) []string {
	if ctx == nil {
		return nil
	}
	if claims, ok := auth.GetClaims(ctx); ok && claims != nil {
		if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok && carrier != nil {
			if perms := normalizePermissionList(carrier.ClaimsMetadata()["permissions"]); len(perms) > 0 {
				return perms
			}
		}
	}
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if perms := normalizePermissionList(actor.Metadata["permissions"]); len(perms) > 0 {
			return perms
		}
	}
	return nil
}

func normalizePermissionList(value any) []string {
	switch v := value.(type) {
	case []string:
		return dedupePermissions(v)
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if str, ok := item.(string); ok && strings.TrimSpace(str) != "" {
				out = append(out, strings.TrimSpace(str))
			}
		}
		return dedupePermissions(out)
	case string:
		raw := strings.TrimSpace(v)
		if raw == "" {
			return nil
		}
		parts := strings.FieldsFunc(raw, func(r rune) bool {
			return r == ',' || r == ';' || r == ' '
		})
		return dedupePermissions(parts)
	default:
		return nil
	}
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
