package quickstart

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
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

func TestRegisterAdminUIRoutesTranslationExchangeRouteIsOptIn(t *testing.T) {
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

	enabledRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(
		enabledRouter,
		cfg,
		adm,
		nil,
		WithUITranslationExchangeRoute(true),
	); err != nil {
		t.Fatalf("register ui routes (exchange enabled): %v", err)
	}
	handler := enabledRouter.getHandlers["/admin/translations/exchange"]
	if handler == nil {
		t.Fatalf("expected translation exchange route handler when enabled")
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	rendered := router.ViewContext{}
	ctx.On("Render", "resources/translations/exchange", mock.Anything).Run(func(args mock.Arguments) {
		view, _ := args.Get(1).(router.ViewContext)
		rendered = view
	}).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("translation exchange route handler error: %v", err)
	}
	if strings.TrimSpace(fmt.Sprint(rendered["translation_exchange_api_path"])) != "/admin/api/translations" {
		t.Fatalf("expected translation_exchange_api_path=/admin/api/translations, got %v", rendered["translation_exchange_api_path"])
	}
}

func TestRegisterAdminUIRoutesTranslationDashboardRouteIsOptIn(t *testing.T) {
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

	enabledRouter := newUIRoutesCaptureRouter()
	if err := RegisterAdminUIRoutes(
		enabledRouter,
		cfg,
		adm,
		nil,
		WithUITranslationDashboardRoute(true),
	); err != nil {
		t.Fatalf("register ui routes (dashboard enabled): %v", err)
	}
	handler := enabledRouter.getHandlers["/admin/translations/dashboard"]
	if handler == nil {
		t.Fatalf("expected translation dashboard route handler when enabled")
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	rendered := router.ViewContext{}
	ctx.On("Render", "resources/translations/dashboard", mock.Anything).Run(func(args mock.Arguments) {
		view, _ := args.Get(1).(router.ViewContext)
		rendered = view
	}).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("translation dashboard route handler error: %v", err)
	}
	if strings.TrimSpace(fmt.Sprint(rendered["translation_dashboard_api_path"])) != "/admin/api/translations/my-work" {
		t.Fatalf("expected translation_dashboard_api_path=/admin/api/translations/my-work, got %v", rendered["translation_dashboard_api_path"])
	}
	if strings.TrimSpace(fmt.Sprint(rendered["translation_queue_api_path"])) != "/admin/api/translations/queue" {
		t.Fatalf("expected translation_queue_api_path=/admin/api/translations/queue, got %v", rendered["translation_queue_api_path"])
	}
	if strings.TrimSpace(fmt.Sprint(rendered["translation_panels_base_path"])) != "/admin/content" {
		t.Fatalf("expected translation_panels_base_path=/admin/content, got %v", rendered["translation_panels_base_path"])
	}
}
