package quickstart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	fiber2 "github.com/gofiber/fiber/v2"
	fiber3 "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// Each fixture constructs a native app, without quickstart server/default wiring.
func presentationErrorApp(backend string, adm *admin.Admin, cfg admin.Config, views router.Views, routeError func(string) error, opts ...FiberErrorHandlerOption) func(*http.Request) (*http.Response, error) {
	if backend == "v2" {
		app := fiber2.New(fiber2.Config{Views: views, ErrorHandler: NewFiberErrorHandler(adm, cfg, false, opts...)})
		app.Use(func(c *fiber2.Ctx) error {
			c.Set("X-Request-ID", "request-1")
			c.Cookie(&fiber2.Cookie{Name: "session", Value: "refreshed", HTTPOnly: true, Secure: true})
			c.SetUserContext(context.WithValue(c.UserContext(), viewPortContextKey{}, "current"))
			return c.Next()
		})
		for _, path := range []string{"/admin/fail", "/admin/api/fail", "/public/fail"} {
			app.All(path, func(c *fiber2.Ctx) error { return routeError(c.Path()) })
		}
		app.Use(NewFiberRouteMissHandler(cfg))
		return func(r *http.Request) (*http.Response, error) { return app.Test(r, -1) }
	}
	app := fiber3.New(fiber3.Config{Views: views, ErrorHandler: NewFiberV3ErrorHandler(adm, cfg, false, opts...)})
	app.Use(func(c fiber3.Ctx) error {
		c.Set("X-Request-ID", "request-1")
		c.Cookie(&fiber3.Cookie{Name: "session", Value: "refreshed", HTTPOnly: true, Secure: true})
		c.SetContext(context.WithValue(c.Context(), viewPortContextKey{}, "current"))
		return c.Next()
	})
	for _, path := range []string{"/admin/fail", "/admin/api/fail", "/public/fail"} {
		app.All(path, func(c fiber3.Ctx) error { return routeError(c.Path()) })
	}
	app.Use(NewFiberV3RouteMissHandler(cfg))
	return func(r *http.Request) (*http.Response, error) { return app.Test(r, fiber3.TestConfig{Timeout: 0}) }
}

func presentationBody(t *testing.T, request func(*http.Request) (*http.Response, error), req *http.Request) (*http.Response, string) {
	t.Helper()
	res, err := request(req)
	if err != nil {
		t.Fatal(err)
	}
	body, err := io.ReadAll(res.Body)
	closeResponseBody(t, res)
	if err != nil {
		t.Fatal(err)
	}
	return res, string(body)
}

func TestFiberPresentationErrorParity(t *testing.T) {
	for _, backend := range []string{"v2", "v3"} {
		t.Run(backend, func(t *testing.T) {
			cfg := admin.Config{BasePath: "/admin", Title: "Test admin"}
			adm, err := admin.New(cfg, admin.Dependencies{})
			if err != nil {
				t.Fatal(err)
			}
			adm.WithThemeProvider(func(ctx context.Context, selector admin.ThemeSelector) (*admin.ThemeSelection, error) {
				if ctx.Value(viewPortContextKey{}) != "current" {
					t.Error("theme lost request context")
				}
				return &admin.ThemeSelection{Variant: selector.Variant, Partials: map[string]string{admin.AdminPartialShellFooter: "themes/test/footer.html"}}, nil
			})
			overlay := fstest.MapFS{"themes/test/footer.html": {Data: []byte(`<footer data-presentation-footer>custom footer</footer>`)}}
			var views router.Views
			options := []ViewEngineOption{WithViewAdmin(adm), WithViewBasePath("/admin"), WithViewTemplatesFS(overlay), WithViewReload(false)}
			if backend == "v2" {
				views, err = NewViewEngine(client.Templates(), options...)
			} else {
				views, err = NewFiberV3ViewEngine(client.Templates(), options...)
			}
			if err != nil {
				t.Fatal(err)
			}
			for _, tc := range []struct {
				name   string
				status int
				err    func() error
			}{
				{"native-denied", 403, func() error {
					if backend == "v2" {
						return fmt.Errorf("wrapped: %w", fiber2.ErrForbidden)
					}
					return fmt.Errorf("wrapped: %w", fiber3.ErrForbidden)
				}},
				{"native-unavailable", 503, func() error {
					if backend == "v2" {
						return fiber2.ErrServiceUnavailable
					}
					return fiber3.ErrServiceUnavailable
				}},
				{"domain-missing", 404, func() error { return admin.ErrNotFound }},
				{"structured", 409, func() error {
					return goerrors.New("Conflict", goerrors.CategoryConflict).WithCode(409).WithTextCode("TEST_CONFLICT").WithRequestID("correlation-1")
				}},
				{"internal", 500, func() error { return errors.New("private-database-password") }},
			} {
				t.Run(tc.name, func(t *testing.T) {
					request := presentationErrorApp(backend, adm, cfg, views, func(string) error { return tc.err() })
					for _, path := range []string{"/admin/fail?variant=contrast", "/public/fail", "/admin/api/fail"} {
						for _, method := range []string{"GET", "HEAD"} {
							res, body := presentationBody(t, request, httptest.NewRequest(method, path, nil))
							if res.StatusCode != tc.status {
								t.Fatalf("%s %s status=%d body=%s", method, path, res.StatusCode, body)
							}
							cookies := res.Cookies()
							if len(cookies) != 1 || cookies[0].Name != "session" || cookies[0].Value != "refreshed" || !cookies[0].HttpOnly || !cookies[0].Secure {
								t.Fatalf("cookies=%v", cookies)
							}
							if res.Header.Get("X-Request-ID") != "request-1" {
								t.Fatal("correlation header lost")
							}
							if method == "HEAD" {
								if body != "" {
									t.Fatal("HEAD has body")
								}
								continue
							}
							if strings.Contains(body, "private-database-password") {
								t.Fatal("internal detail leaked")
							}
							if strings.HasPrefix(path, "/admin/api/") {
								var envelope admin.ErrorResponse
								if err := json.Unmarshal([]byte(body), &envelope); err != nil {
									t.Fatal(err)
								}
								if envelope.Error == nil || envelope.Error.Code != tc.status || envelope.Error.TextCode == "" {
									t.Fatalf("API error=%+v", envelope.Error)
								}
								if tc.name == "structured" && (envelope.Error.RequestID != "correlation-1" || envelope.Error.TextCode != "TEST_CONFLICT") {
									t.Fatalf("structured error=%+v", envelope.Error)
								}
								if !strings.Contains(res.Header.Get("Content-Type"), "application/json") {
									t.Fatal("API content type")
								}
							} else {
								if !strings.Contains(res.Header.Get("Content-Type"), "text/html") {
									t.Fatal("HTML content type")
								}
								if strings.Count(strings.ToLower(body), "<!doctype html>") != 1 {
									t.Fatal("expected one HTML document")
								}
								if strings.HasPrefix(path, "/admin/") {
									for _, marker := range []string{"data-admin-shell", "data-admin-error-page", "data-presentation-footer"} {
										if countRenderedHTMLAttribute(body, marker) != 1 {
											t.Fatalf("missing/duplicate %s", marker)
										}
									}
									if !strings.Contains(body, `data-theme="contrast"`) {
										t.Fatal("theme selection lost")
									}
								} else if strings.Contains(body, "data-admin-shell") {
									t.Fatal("public error acquired admin shell")
								}
							}
						}
					}
				})
			}
		})
	}
}

func TestFiberPresentationDiagnosticsAndMappers(t *testing.T) {
	sentinel := errors.New("custom-classified")
	for _, backend := range []string{"v2", "v3"} {
		t.Run(backend, func(t *testing.T) {
			cfg := admin.Config{BasePath: "/admin", Errors: admin.ErrorConfig{DevMode: true, ShowRequestHeaders: true, IncludeStackTrace: true}}
			fsys := fstest.MapFS{"admin-error.html": {Data: []byte(`{{ dev_context|tojson }}`)}}
			var views router.Views
			var err error
			if backend == "v2" {
				views, err = NewViewEngine(fsys)
			} else {
				views, err = NewFiberV3ViewEngine(fsys)
			}
			if err != nil {
				t.Fatal(err)
			}
			var original error
			request := presentationErrorApp(backend, nil, cfg, views, func(string) error { return fmt.Errorf("wrapped: %w", sentinel) }, WithFiberErrorMappers(func(err error) *goerrors.Error {
				if errors.Is(err, sentinel) {
					original = err
					return goerrors.New("Custom", goerrors.CategoryValidation).WithCode(422).WithTextCode("CUSTOM")
				}
				return nil
			}))
			res, body := presentationBody(t, request, httptest.NewRequest("GET", "/admin/api/fail", nil))
			if res.StatusCode != 422 || !strings.Contains(body, `"text_code":"CUSTOM"`) || !errors.Is(original, sentinel) {
				t.Fatalf("custom mapping: %d %s %v", res.StatusCode, body, original)
			}
			req := httptest.NewRequest("POST", "/admin/fail?search=safe", strings.NewReader("username=alice&password=form-secret&csrf_token=csrf-secret"))
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			req.Header.Set("Authorization", "Bearer header-secret")
			req.Header.Set("Cookie", "session=cookie-secret")
			req.Header.Set("X-Public", "visible")
			_, body = presentationBody(t, request, req)
			for _, secret := range []string{"form-secret", "csrf-secret", "header-secret", "cookie-secret"} {
				if strings.Contains(body, secret) {
					t.Fatalf("diagnostics exposed %s", secret)
				}
			}
			if !strings.Contains(body, "alice") || !strings.Contains(body, "visible") {
				t.Fatalf("safe request diagnostics missing: %s", body)
			}
			res, body = presentationBody(t, request, httptest.NewRequest("GET", "/admin/api/missing", nil))
			if res.StatusCode != 404 || !strings.Contains(body, `"synthetic":true`) || strings.Contains(body, `"stack_trace"`) {
				t.Fatalf("terminal miss: %d %s", res.StatusCode, body)
			}
		})
	}
}

type failingPresentationViews struct{}

func (failingPresentationViews) Load() error { return nil }
func (failingPresentationViews) Render(out io.Writer, _ string, _ any, _ ...string) error {
	io.WriteString(out, "private-partial")
	return errors.New("private-render-error")
}
func TestFiberPresentationRenderFailure(t *testing.T) {
	for _, backend := range []string{"v2", "v3"} {
		t.Run(backend, func(t *testing.T) {
			request := presentationErrorApp(backend, nil, admin.Config{BasePath: "/admin"}, failingPresentationViews{}, func(string) error { return admin.ErrForbidden })
			res, body := presentationBody(t, request, httptest.NewRequest("GET", "/admin/fail", nil))
			if res.StatusCode != 403 || body != "403 - Access denied" {
				t.Fatalf("fallback: %d %q", res.StatusCode, body)
			}
		})
	}
}

func TestFiberV3PresentationPreservesMatchedNativeMiss(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin", Errors: admin.ErrorConfig{DevMode: true, IncludeStackTrace: true}}
	request := presentationErrorApp("v3", nil, cfg, nil, func(path string) error { return fmt.Errorf("explicit: %w", fiber3.NewError(404, "Cannot GET "+path)) })
	res, body := presentationBody(t, request, httptest.NewRequest("GET", "/admin/api/fail", nil))
	if res.StatusCode != 404 || strings.Contains(body, `"synthetic":true`) || !strings.Contains(body, "Cannot GET /admin/api/fail") {
		t.Fatalf("matched native error changed: %d %s", res.StatusCode, body)
	}
}

func TestFiberPresentationRedirectStatus(t *testing.T) {
	for _, backend := range []string{"v2", "v3"} {
		t.Run(backend, func(t *testing.T) {
			var request func(*http.Request) (*http.Response, error)
			if backend == "v2" {
				app := fiber2.New()
				app.Post("/admin/submit", func(c *fiber2.Ctx) error { return c.Redirect("/admin/done", http.StatusSeeOther) })
				request = func(r *http.Request) (*http.Response, error) { return app.Test(r, -1) }
			} else {
				app := fiber3.New()
				app.Post("/admin/submit", func(c fiber3.Ctx) error { return c.Redirect().Status(http.StatusSeeOther).To("/admin/done") })
				request = func(r *http.Request) (*http.Response, error) { return app.Test(r, fiber3.TestConfig{Timeout: 0}) }
			}
			res, _ := presentationBody(t, request, httptest.NewRequest("POST", "/admin/submit", nil))
			if res.StatusCode != 303 || res.Header.Get("Location") != "/admin/done" {
				t.Fatalf("redirect: %d %q", res.StatusCode, res.Header.Get("Location"))
			}
		})
	}
}

type unsafePresentationLocal struct {
	Secret string
	calls  *int
}

func (l unsafePresentationLocal) Dynamic() any   { *l.calls++; return l.Secret }
func (l unsafePresentationLocal) String() string { *l.calls++; return l.Secret }
func TestFiberV3PresentationRejectsUnsafeLocals(t *testing.T) {
	views, err := NewFiberV3ViewEngine(fstest.MapFS{"page.html": {Data: []byte(`{{ model.Dynamic() }}`)}})
	if err != nil {
		t.Fatal(err)
	}
	calls := 0
	cfg := admin.Config{BasePath: "/admin"}
	var renderErr error
	handle := NewFiberV3ErrorHandler(nil, cfg, false)
	app := fiber3.New(fiber3.Config{Views: views, PassLocalsToViews: true, ErrorHandler: func(c fiber3.Ctx, err error) error { renderErr = err; return handle(c, err) }})
	app.Get("/admin/page", func(c fiber3.Ctx) error {
		c.Locals("model", unsafePresentationLocal{Secret: "private-local-secret", calls: &calls})
		return c.Render("page", fiber3.Map{})
	})
	request := func(req *http.Request) (*http.Response, error) { return app.Test(req, fiber3.TestConfig{Timeout: 0}) }
	res, body := presentationBody(t, request, httptest.NewRequest("GET", "/admin/page", nil))
	if res.StatusCode != 500 || renderErr == nil || calls != 0 || strings.Contains(body, "private-local-secret") || strings.Contains(renderErr.Error(), "private-local-secret") {
		t.Fatalf("unsafe local: status=%d calls=%d body=%q err=%v", res.StatusCode, calls, body, renderErr)
	}
}

func TestFiberV3PresentationPreservesMiddleware404(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin", Errors: admin.ErrorConfig{DevMode: true}}
	app := fiber3.New(fiber3.Config{ErrorHandler: NewFiberV3ErrorHandler(nil, cfg, false)})
	app.Use(func(fiber3.Ctx) error { return fiber3.NewError(404, "hidden by middleware") })
	request := func(req *http.Request) (*http.Response, error) { return app.Test(req, fiber3.TestConfig{Timeout: 0}) }
	res, body := presentationBody(t, request, httptest.NewRequest("GET", "/admin/api/fail", nil))
	if res.StatusCode != 404 || !strings.Contains(body, "hidden by middleware") || strings.Contains(body, `"synthetic":true`) {
		t.Fatalf("explicit middleware error changed: %d %s", res.StatusCode, body)
	}
}
