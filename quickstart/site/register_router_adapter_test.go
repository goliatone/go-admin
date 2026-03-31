package site

import (
	"testing"

	"github.com/gofiber/fiber/v2"
	router "github.com/goliatone/go-router"
)

func TestWrapSiteAdminRouterNilReturnsNil(t *testing.T) {
	if wrapSiteAdminRouter[*fiber.App](nil) != nil {
		t.Fatalf("expected nil wrapper for nil router")
	}
}

func TestSiteAdminRouterWrapsNestedRoutersAndCallbacks(t *testing.T) {
	recorder := &recordingRouter{}
	adapter := wrapSiteAdminRouter[*fiber.App](recorder)
	if adapter == nil {
		t.Fatalf("expected wrapped adapter")
	}

	group := adapter.Group("/group")
	if group == nil {
		t.Fatalf("expected grouped site router")
	}
	group.Get("/group-route", defaultNotFoundHandler)

	mounted := adapter.Mount("/mount")
	if mounted == nil {
		t.Fatalf("expected mounted site router")
	}
	mounted.Get("/mount-route", defaultNotFoundHandler)

	used := adapter.Use(func(next router.HandlerFunc) router.HandlerFunc {
		return next
	})
	if used == nil {
		t.Fatalf("expected use wrapper")
	}
	used.Get("/used-route", defaultNotFoundHandler)

	var callbackRouter SiteRouter
	withGroup := adapter.WithGroup("/nested", func(r SiteRouter) {
		callbackRouter = r
		if r == nil {
			t.Fatalf("expected callback router")
		}
		r.Get("/callback-route", defaultNotFoundHandler)
	})
	if withGroup == nil {
		t.Fatalf("expected withGroup wrapper")
	}
	if callbackRouter == nil {
		t.Fatalf("expected callback router to be assigned")
	}

	expected := []recordedRoute{
		{Method: "GET", Path: "/group-route"},
		{Method: "GET", Path: "/mount-route"},
		{Method: "GET", Path: "/used-route"},
		{Method: "GET", Path: "/callback-route"},
	}
	for _, route := range expected {
		if indexOfRoute(recorder.routes, route.Method, route.Path) == -1 {
			t.Fatalf("expected route %s %s, got %+v", route.Method, route.Path, recorder.routes)
		}
	}
	if len(recorder.middlewares) != 1 {
		t.Fatalf("expected use to forward middleware, got %d", len(recorder.middlewares))
	}
}

func TestSiteAdminRouterForwardsVerbAndHandleCalls(t *testing.T) {
	recorder := &recordingRouter{}
	adapter := wrapSiteAdminRouter[*fiber.App](recorder)

	adapter.Handle(router.GET, "/handled", defaultNotFoundHandler)
	adapter.Post("/posted", defaultNotFoundHandler)
	adapter.Put("/put", defaultNotFoundHandler)
	adapter.Delete("/deleted", defaultNotFoundHandler)
	adapter.Patch("/patched", defaultNotFoundHandler)
	adapter.Head("/head", defaultNotFoundHandler)

	expected := []recordedRoute{
		{Method: "GET", Path: "/handled"},
		{Method: "POST", Path: "/posted"},
		{Method: "PUT", Path: "/put"},
		{Method: "DELETE", Path: "/deleted"},
		{Method: "PATCH", Path: "/patched"},
		{Method: "HEAD", Path: "/head"},
	}
	for _, route := range expected {
		if indexOfRoute(recorder.routes, route.Method, route.Path) == -1 {
			t.Fatalf("expected forwarded route %s %s, got %+v", route.Method, route.Path, recorder.routes)
		}
	}
}
