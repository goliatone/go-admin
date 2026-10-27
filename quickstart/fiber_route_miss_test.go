package quickstart

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	fiber2 "github.com/gofiber/fiber/v2"
	fiber3 "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestFiberRouteMissProvenance(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin", Errors: admin.ErrorConfig{DevMode: true, IncludeStackTrace: true}}
	fsys := fstest.MapFS{
		"admin-error.html": {Data: []byte(`{{ error_detail }}|{{ dev_context|tojson }}`)},
		"error.html":       {Data: []byte(`{{ error_detail }}|{{ dev_context|tojson }}`)},
	}
	for _, backend := range []string{"v2", "v3"} {
		t.Run(backend, func(t *testing.T) {
			var views router.Views
			var err error
			if backend == "v2" {
				views, err = NewViewEngine(fsys, WithViewReload(false))
			} else {
				views, err = NewFiberV3ViewEngine(fsys, WithViewReload(false))
			}
			if err != nil {
				t.Fatal(err)
			}
			for _, host := range []bool{false, true} {
				for _, source := range []string{"terminal", "middleware-direct", "middleware-wrapped", "middleware-custom", "middleware-native-message", "middleware-replaces-terminal", "matched-direct", "matched-wrapped", "later-route", "unmarked"} {
					if host && source == "unmarked" {
						continue
					}
					t.Run(fmt.Sprintf("host=%t/%s", host, source), func(t *testing.T) {
						var original error
						if backend == "v2" {
							original = fiber2.ErrNotFound
						} else {
							original = fiber3.ErrNotFound
						}
						if strings.Contains(source, "wrapped") {
							original = fmt.Errorf("access policy hid resource: %w", original)
						}
						if source == "middleware-custom" || source == "middleware-native-message" {
							message := "hidden by middleware"
							if source == "middleware-native-message" {
								message = "Cannot GET /admin/api/hidden"
							}
							if backend == "v2" {
								original = fiber2.NewError(404, message)
							} else {
								original = fiber3.NewError(404, message)
							}
						}
						var captured error
						var request func(*http.Request) (*http.Response, error)
						if backend == "v2" {
							present := NewFiberErrorHandler(nil, cfg, false)
							handler := func(c *fiber2.Ctx, err error) error { captured = err; return present(c, err) }
							middleware := func(c *fiber2.Ctx) error {
								c.Set("X-Request-ID", "sentinel-review")
								c.Cookie(&fiber2.Cookie{Name: "session", Value: "refreshed", HTTPOnly: true})
								if source == "middleware-replaces-terminal" {
									if nextErr := c.Next(); nextErr == nil {
										t.Error("expected terminal routing error before replacement")
									}
									return original
								}
								if strings.HasPrefix(source, "middleware-") {
									return original
								}
								return c.Next()
							}
							var app *fiber2.App
							if host {
								server, r := NewFiberServer(views, cfg, nil, false, WithFiberLogger(false), WithFiberErrorHandler(handler), WithFiberMiddleware(middleware))
								if strings.HasPrefix(source, "matched-") {
									r.Get("/admin/api/hidden", func(router.Context) error { return original })
									r.Get("/admin/hidden", func(router.Context) error { return original })
									r.Head("/admin/api/hidden", func(router.Context) error { return original })
									r.Head("/admin/hidden", func(router.Context) error { return original })
								}
								// WrappedRouter and repeated Init must install the fallback once and
								// after deferred application routes.
								app = server.WrappedRouter()
								server.Init()
								server.Init()
							} else {
								app = fiber2.New(fiber2.Config{Views: views, ErrorHandler: handler})
								app.Use(newFiberOwned404Middleware(newHostRouteDomainResolver(cfg), handler))
								app.Use(middleware)
								if strings.HasPrefix(source, "matched-") {
									app.All("/admin/api/hidden", func(*fiber2.Ctx) error { return original })
									app.All("/admin/hidden", func(*fiber2.Ctx) error { return original })
								}
								if source != "unmarked" {
									app.Use(NewFiberRouteMissHandler(cfg))
								}
							}
							if source == "later-route" {
								app.All("/admin/api/hidden", func(*fiber2.Ctx) error { return original })
								app.All("/admin/hidden", func(*fiber2.Ctx) error { return original })
								app.All("/public/hidden", func(*fiber2.Ctx) error { return original })
							}
							request = func(r *http.Request) (*http.Response, error) { return app.Test(r, -1) }
						} else {
							present := NewFiberV3ErrorHandler(nil, cfg, false)
							handler := func(c fiber3.Ctx, err error) error { captured = err; return present(c, err) }
							middleware := func(c fiber3.Ctx) error {
								c.Set("X-Request-ID", "sentinel-review")
								c.Cookie(&fiber3.Cookie{Name: "session", Value: "refreshed", HTTPOnly: true})
								if source == "middleware-replaces-terminal" {
									if nextErr := c.Next(); nextErr == nil {
										t.Error("expected terminal routing error before replacement")
									}
									return original
								}
								if strings.HasPrefix(source, "middleware-") {
									return original
								}
								return c.Next()
							}
							var app *fiber3.App
							if host {
								server, r := NewFiberV3Server(views, cfg, nil, false, WithFiberV3Logger(false), WithFiberV3ErrorHandler(handler), WithFiberV3Middleware(middleware))
								if strings.HasPrefix(source, "matched-") {
									r.Get("/admin/api/hidden", func(router.Context) error { return original })
									r.Get("/admin/hidden", func(router.Context) error { return original })
									r.Head("/admin/api/hidden", func(router.Context) error { return original })
									r.Head("/admin/hidden", func(router.Context) error { return original })
								}
								app = server.WrappedRouter()
								server.Init()
								server.Init()
							} else {
								app = fiber3.New(fiber3.Config{Views: views, ErrorHandler: handler})
								app.Use(newFiberV3Owned404Middleware(newHostRouteDomainResolver(cfg), handler))
								app.Use(middleware)
								if strings.HasPrefix(source, "matched-") {
									app.All("/admin/api/hidden", func(fiber3.Ctx) error { return original })
									app.All("/admin/hidden", func(fiber3.Ctx) error { return original })
								}
								if source != "unmarked" {
									app.Use(NewFiberV3RouteMissHandler(cfg))
								}
							}
							if source == "later-route" {
								app.All("/admin/api/hidden", func(fiber3.Ctx) error { return original })
								app.All("/admin/hidden", func(fiber3.Ctx) error { return original })
								app.All("/public/hidden", func(fiber3.Ctx) error { return original })
							}
							request = func(r *http.Request) (*http.Response, error) { return app.Test(r, fiber3.TestConfig{Timeout: 0}) }
						}
						for _, path := range []string{"/admin/api/hidden", "/admin/hidden", "/public/hidden"} {
							// A matched-handler case deliberately registers only owned routes.
							if strings.HasPrefix(source, "matched-") && strings.HasPrefix(path, "/public") {
								continue
							}
							for _, method := range []string{"GET", "HEAD"} {
								captured = nil
								res, body := presentationBody(t, request, httptest.NewRequestWithContext(t.Context(), method, path, nil))
								if res.StatusCode != http.StatusNotFound {
									t.Fatalf("%s %s: status=%d body=%s", method, path, res.StatusCode, body)
								}
								if res.Header.Get("X-Request-ID") != "sentinel-review" || len(res.Cookies()) != 1 || res.Cookies()[0].Value != "refreshed" {
									t.Fatal("middleware response state lost")
								}
								wantSynthetic := source == "terminal" && strings.HasPrefix(path, "/admin/")
								var miss *fiberOwnedRouteMissError
								if errors.As(captured, &miss) != wantSynthetic {
									t.Fatalf("%s %s: wrong provenance: %T %v", method, path, captured, captured)
								}
								if source != "terminal" && source != "unmarked" && captured != original { //nolint:errorlint // Assert exact identity; even an added wrapper violates the provenance contract.
									t.Fatalf("middleware/handler error identity lost: got %v want %v", captured, original)
								}
								if method == "HEAD" {
									if body != "" {
										t.Fatal("HEAD body")
									}
									continue
								}
								if wantSynthetic {
									if strings.Contains(body, `"stack_trace"`) || strings.Contains(body, "stack_frames") {
										t.Fatalf("terminal miss exposed stack: %s", body)
									}
								} else {
									if strings.Contains(body, `"synthetic":true`) {
										t.Fatalf("explicit error marked synthetic: %s", body)
									}
									if !strings.Contains(body, `"stack_trace"`) && !strings.Contains(body, "stack_frames") {
										t.Fatalf("diagnostic stack lost: %s", body)
									}
									if strings.Contains(source, "wrapped") && !strings.Contains(path, "/api/") && !strings.Contains(body, "access policy hid resource") {
										t.Fatalf("HTML cause lost: %s", body)
									}
								}
							}
						}
					})
				}
			}
		})
	}
}

func TestFiberRouteMissPreservesMethodNotAllowed(t *testing.T) {
	for _, backend := range []string{"v2", "v3"} {
		t.Run(backend, func(t *testing.T) {
			cfg := admin.Config{BasePath: "/admin"}
			var request func(*http.Request) (*http.Response, error)
			if backend == "v2" {
				server, r := NewFiberServer(nil, cfg, nil, false, WithFiberLogger(false))
				r.Get("/admin/exists", func(c router.Context) error { return c.SendString("exists") })
				request = func(r *http.Request) (*http.Response, error) { return server.WrappedRouter().Test(r, -1) }
			} else {
				server, r := NewFiberV3Server(nil, cfg, nil, false, WithFiberV3Logger(false))
				r.Get("/admin/exists", func(c router.Context) error { return c.SendString("exists") })
				request = func(r *http.Request) (*http.Response, error) {
					return server.WrappedRouter().Test(r, fiber3.TestConfig{Timeout: 0})
				}
			}
			res, body := presentationBody(t, request, httptest.NewRequestWithContext(t.Context(), "POST", "/admin/exists", nil))
			if res.StatusCode != http.StatusMethodNotAllowed {
				t.Fatalf("status=%d body=%s", res.StatusCode, body)
			}
			if !strings.Contains(res.Header.Get("Allow"), "GET") {
				t.Fatal("Allow header lost")
			}
		})
	}
}
