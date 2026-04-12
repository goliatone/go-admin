package main

import (
	"context"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
)

type exampleContentRouteCaptureRouter struct {
	prefix string
	paths  map[string]bool
}

func newExampleContentRouteCaptureRouter() *exampleContentRouteCaptureRouter {
	return &exampleContentRouteCaptureRouter{paths: map[string]bool{}}
}

func examplePrefixBasePath(basePath, suffix string) string {
	basePath = strings.TrimSpace(basePath)
	suffix = strings.TrimSpace(suffix)
	switch {
	case basePath == "":
		return suffix
	case suffix == "":
		return basePath
	case strings.HasSuffix(basePath, "/"):
		return strings.TrimRight(basePath, "/") + "/" + strings.TrimLeft(suffix, "/")
	default:
		return basePath + "/" + strings.TrimLeft(suffix, "/")
	}
}

func (r *exampleContentRouteCaptureRouter) fullPath(routePath string) string {
	return examplePrefixBasePath(strings.TrimSpace(r.prefix), strings.TrimSpace(routePath))
}

func (r *exampleContentRouteCaptureRouter) record(routePath string) {
	if r == nil {
		return
	}
	r.paths[r.fullPath(routePath)] = true
}

func (r *exampleContentRouteCaptureRouter) Handle(method router.HTTPMethod, routePath string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _, _ = method, routePath, handler, middlewares
	r.record(routePath)
	return nil
}

func (r *exampleContentRouteCaptureRouter) Group(prefix string) router.Router[*fiber.App] {
	return &exampleContentRouteCaptureRouter{
		prefix: r.fullPath(prefix),
		paths:  r.paths,
	}
}

func (r *exampleContentRouteCaptureRouter) Mount(prefix string) router.Router[*fiber.App] {
	return r.Group(prefix)
}

func (r *exampleContentRouteCaptureRouter) WithGroup(groupPath string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	group := r.Group(groupPath)
	if cb != nil {
		cb(group)
	}
	return group
}

func (r *exampleContentRouteCaptureRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	_ = m
	return r
}

func (r *exampleContentRouteCaptureRouter) Get(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = handler, mw
	r.record(routePath)
	return nil
}

func (r *exampleContentRouteCaptureRouter) Post(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = handler, mw
	r.record(routePath)
	return nil
}

func (r *exampleContentRouteCaptureRouter) Put(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = routePath, handler, mw
	return nil
}

func (r *exampleContentRouteCaptureRouter) Delete(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = routePath, handler, mw
	return nil
}

func (r *exampleContentRouteCaptureRouter) Patch(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = routePath, handler, mw
	return nil
}

func (r *exampleContentRouteCaptureRouter) Head(routePath string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = routePath, handler, mw
	return nil
}

func (r *exampleContentRouteCaptureRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	_, _, _ = prefix, root, config
	return r
}

func (r *exampleContentRouteCaptureRouter) WebSocket(routePath string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = routePath, config, handler
	return nil
}

func (r *exampleContentRouteCaptureRouter) Routes() []router.RouteDefinition { return nil }
func (r *exampleContentRouteCaptureRouter) ValidateRoutes() []error          { return nil }
func (r *exampleContentRouteCaptureRouter) PrintRoutes()                     {}
func (r *exampleContentRouteCaptureRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

func TestWebExampleCMSBootstrapHookMakesDynamicPanelsAvailableBeforeUIBinding(t *testing.T) {
	registry.WithTestRegistry(func() {
		cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
		cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}

		adm, _, err := quickstart.NewAdmin(
			cfg,
			quickstart.AdapterHooks{},
			quickstart.WithFeatureDefaults(map[string]bool{
				string(admin.FeatureCMS):      true,
				string(admin.FeatureCommands): true,
			}),
		)
		if err != nil {
			t.Fatalf("quickstart.NewAdmin: %v", err)
		}
		defer adm.Commands().Reset()
		adm.UseCMS(admin.NewNoopCMSContainer())
		if err := adm.RegisterModule(quickstart.NewContentTypeBuilderModule(cfg, setup.NavigationSectionContent)); err != nil {
			t.Fatalf("register content type builder module: %v", err)
		}

		adm.AddCMSBootstrapHook(func(ctx context.Context, adm *admin.Admin) error {
			for _, item := range []admin.CMSContentType{
				{
					Name:   "Page",
					Slug:   "page",
					Status: "active",
					Schema: map[string]any{
						"$schema":    "https://json-schema.org/draft/2020-12/schema",
						"type":       "object",
						"properties": map[string]any{"title": map[string]any{"type": "string"}},
					},
					Capabilities: map[string]any{"panel_slug": "pages"},
				},
				{
					Name:   "Quote",
					Slug:   "quote",
					Status: "active",
					Schema: map[string]any{
						"$schema":    "https://json-schema.org/draft/2020-12/schema",
						"type":       "object",
						"properties": map[string]any{"title": map[string]any{"type": "string"}},
					},
					Capabilities: map[string]any{"panel_slug": "quotes"},
				},
				{
					Name:   "News",
					Slug:   "news",
					Status: "active",
					Schema: map[string]any{
						"$schema":    "https://json-schema.org/draft/2020-12/schema",
						"type":       "object",
						"properties": map[string]any{"title": map[string]any{"type": "string"}},
					},
					Capabilities: map[string]any{"panel_slug": "news"},
				},
			} {
				if _, err := adm.ContentTypeService().CreateContentType(ctx, item); err != nil {
					return err
				}
			}
			return nil
		})

		if err := adm.Initialize(newExampleContentRouteCaptureRouter()); err != nil {
			t.Fatalf("initialize: %v", err)
		}

		capture := newExampleContentRouteCaptureRouter()
		if err := quickstart.RegisterContentEntryUIRoutes(capture, cfg, adm, nil); err != nil {
			t.Fatalf("RegisterContentEntryUIRoutes: %v", err)
		}

		for _, path := range []string{"/admin/quotes", "/admin/news"} {
			if !capture.paths[path] {
				t.Fatalf("expected canonical route %q to be registered, got %+v", path, capture.paths)
			}
		}
	})
}
