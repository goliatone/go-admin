package quickstart

import (
	"context"
	"testing"

	"github.com/gofiber/fiber/v2"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type captureRouter struct {
	getHandlers  map[string]router.HandlerFunc
	postHandlers map[string]router.HandlerFunc
}

func newCaptureRouter() *captureRouter {
	return &captureRouter{
		getHandlers:  map[string]router.HandlerFunc{},
		postHandlers: map[string]router.HandlerFunc{},
	}
}

func (r *captureRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	switch method {
	case router.GET:
		return r.Get(path, handler, middlewares...)
	case router.POST:
		return r.Post(path, handler, middlewares...)
	case router.PUT:
		return r.Put(path, handler, middlewares...)
	case router.DELETE:
		return r.Delete(path, handler, middlewares...)
	case router.PATCH:
		return r.Patch(path, handler, middlewares...)
	case router.HEAD:
		return r.Head(path, handler, middlewares...)
	default:
		return nil
	}
}

func (r *captureRouter) Group(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *captureRouter) Mount(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *captureRouter) WithGroup(path string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	if cb != nil {
		cb(r)
	}
	_ = path
	return r
}

func (r *captureRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	_ = m
	return r
}

func (r *captureRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = mw
	r.getHandlers[path] = handler
	return nil
}

func (r *captureRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = mw
	r.postHandlers[path] = handler
	return nil
}

func (r *captureRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}

func (r *captureRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}

func (r *captureRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}

func (r *captureRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}

func (r *captureRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	_, _ = prefix, root
	_ = config
	return r
}

func (r *captureRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = path, config, handler
	return nil
}

func (r *captureRouter) Routes() []router.RouteDefinition { return nil }
func (r *captureRouter) PrintRoutes()                     {}
func (r *captureRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

type stubIdentityProvider struct{}

func (stubIdentityProvider) VerifyIdentity(ctx context.Context, identifier, password string) (auth.Identity, error) {
	_, _, _ = ctx, identifier, password
	return nil, nil
}

func (stubIdentityProvider) FindIdentityByIdentifier(ctx context.Context, identifier string) (auth.Identity, error) {
	_, _ = ctx, identifier
	return nil, nil
}

func TestAuthUIRoutesRespectPasswordResetGate(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	gate := stubFeatureGate{
		flags: map[string]bool{
			"users.password_reset": false,
			"users.signup":         true,
		},
	}
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})

	if err := RegisterAuthUIRoutes(r, cfg, auther, "auth", WithAuthUIFeatureGate(gate)); err != nil {
		t.Fatalf("register auth routes: %v", err)
	}
	handler := r.getHandlers["/admin/password-reset"]
	if handler == nil {
		t.Fatalf("expected password reset route")
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	err := handler(ctx)
	if err == nil {
		t.Fatalf("expected password reset disabled error")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) || typedErr.TextCode != "FEATURE_DISABLED" {
		t.Fatalf("expected FEATURE_DISABLED error, got %v", err)
	}

	gate.flags["users.password_reset"] = true
	ctx = router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	var rendered any
	ctx.On("Render", "password_reset", mock.Anything).Run(func(args mock.Arguments) {
		rendered = args.Get(1)
	}).Return(nil)
	if err := handler(ctx); err != nil {
		t.Fatalf("password reset handler error: %v", err)
	}
	viewCtx, ok := rendered.(router.ViewContext)
	if !ok {
		t.Fatalf("expected view context, got %v", rendered)
	}
	snapshot, ok := viewCtx["feature_snapshot"].(map[string]bool)
	if !ok || snapshot["users.password_reset"] != true {
		t.Fatalf("expected feature snapshot to include users.password_reset true, got %v", viewCtx["feature_snapshot"])
	}
}

func TestRegistrationUIRoutesRespectUsersSignupGate(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	gate := stubFeatureGate{
		flags: map[string]bool{
			"users.signup":         false,
			"users.password_reset": true,
		},
	}
	r := newCaptureRouter()

	if err := RegisterRegistrationUIRoutes(r, cfg, WithRegistrationUIFeatureGate(gate)); err != nil {
		t.Fatalf("register registration routes: %v", err)
	}
	handler := r.getHandlers["/admin/register"]
	if handler == nil {
		t.Fatalf("expected register route")
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	err := handler(ctx)
	if err == nil {
		t.Fatalf("expected registration disabled error")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) || typedErr.TextCode != "FEATURE_DISABLED" {
		t.Fatalf("expected FEATURE_DISABLED error, got %v", err)
	}

	gate.flags["users.signup"] = true
	ctx = router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	var rendered any
	ctx.On("Render", "register", mock.Anything).Run(func(args mock.Arguments) {
		rendered = args.Get(1)
	}).Return(nil)
	if err := handler(ctx); err != nil {
		t.Fatalf("register handler error: %v", err)
	}
	viewCtx, ok := rendered.(router.ViewContext)
	if !ok {
		t.Fatalf("expected view context, got %v", rendered)
	}
	snapshot, ok := viewCtx["feature_snapshot"].(map[string]bool)
	if !ok || snapshot["users.signup"] != true {
		t.Fatalf("expected feature snapshot to include users.signup true, got %v", viewCtx["feature_snapshot"])
	}
}
