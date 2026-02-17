package quickstart

import (
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type uiRoutesCaptureRouter struct {
	getHandlers map[string]router.HandlerFunc
}

func newUIRoutesCaptureRouter() *uiRoutesCaptureRouter {
	return &uiRoutesCaptureRouter{
		getHandlers: map[string]router.HandlerFunc{},
	}
}

func (r *uiRoutesCaptureRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	switch method {
	case router.GET:
		return r.Get(path, handler, middlewares...)
	default:
		return nil
	}
}

func (r *uiRoutesCaptureRouter) Group(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *uiRoutesCaptureRouter) Mount(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *uiRoutesCaptureRouter) WithGroup(path string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	if cb != nil {
		cb(r)
	}
	_ = path
	return r
}

func (r *uiRoutesCaptureRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	_ = m
	return r
}

func (r *uiRoutesCaptureRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_ = mw
	r.getHandlers[path] = handler
	return nil
}

func (r *uiRoutesCaptureRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *uiRoutesCaptureRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *uiRoutesCaptureRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *uiRoutesCaptureRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *uiRoutesCaptureRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = path, handler, mw
	return nil
}

func (r *uiRoutesCaptureRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	_, _, _ = prefix, root, config
	return r
}

func (r *uiRoutesCaptureRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = path, config, handler
	return nil
}

func (r *uiRoutesCaptureRouter) Routes() []router.RouteDefinition { return nil }
func (r *uiRoutesCaptureRouter) ValidateRoutes() []error          { return nil }
func (r *uiRoutesCaptureRouter) PrintRoutes()                     {}
func (r *uiRoutesCaptureRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

func TestRegisterAdminUIRoutesTranslationExchangeRouteIsCapabilityGuarded(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	disabledRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(disabledRouter, cfg, adm, nil); err != nil {
		t.Fatalf("register ui routes (exchange disabled): %v", err)
	}
	if disabledRouter.getHandlers["/admin/translations/exchange"] != nil {
		t.Fatalf("expected translation exchange route to be absent when disabled")
	}

	forcedRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(
		forcedRouter,
		cfg,
		adm,
		nil,
		WithUITranslationExchangeRoute(true),
	); err != nil {
		t.Fatalf("register ui routes (exchange forced): %v", err)
	}
	if forcedRouter.getHandlers["/admin/translations/exchange"] != nil {
		t.Fatalf("expected translation exchange route to remain absent when capability is disabled")
	}
}

func TestRegisterAdminUIRoutesTranslationDashboardRouteIsCapabilityGuarded(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	disabledRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(disabledRouter, cfg, adm, nil); err != nil {
		t.Fatalf("register ui routes (dashboard disabled): %v", err)
	}
	if disabledRouter.getHandlers["/admin/translations/dashboard"] != nil {
		t.Fatalf("expected translation dashboard route to be absent when disabled")
	}

	forcedRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(
		forcedRouter,
		cfg,
		adm,
		nil,
		WithUITranslationDashboardRoute(true),
	); err != nil {
		t.Fatalf("register ui routes (dashboard forced): %v", err)
	}
	if forcedRouter.getHandlers["/admin/translations/dashboard"] != nil {
		t.Fatalf("expected translation dashboard route to remain absent when capability is disabled")
	}
}

func TestRegisterAdminUIRoutesTranslationRoutesEnabledByCapabilityDefaults(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureTranslationQueue):    true,
			string(admin.FeatureTranslationExchange): true,
		}),
	)
	if err != nil {
		t.Fatalf("create admin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	captureRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(captureRouter, cfg, adm, nil); err != nil {
		t.Fatalf("register ui routes: %v", err)
	}

	if captureRouter.getHandlers["/admin/translations/dashboard"] == nil {
		t.Fatalf("expected translation dashboard route handler by default when queue capability enabled")
	}
	if captureRouter.getHandlers["/admin/translations/exchange"] == nil {
		t.Fatalf("expected translation exchange route handler by default when exchange capability enabled")
	}
}
