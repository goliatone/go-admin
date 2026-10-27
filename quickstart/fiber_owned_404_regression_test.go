package quickstart

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	fiber2 "github.com/gofiber/fiber/v2"
	fiber3 "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/valyala/fasthttp"
)

func TestFiberV3ServerDefaultErrorStatus(t *testing.T) {
	for _, logging := range []bool{false, true} {
		t.Run(fmt.Sprintf("logger=%t", logging), func(t *testing.T) {
			srv, r := NewFiberV3Server(nil, admin.Config{BasePath: "/admin"}, nil, false, WithFiberV3Logger(logging))
			r.Get("/admin/plain", func(c router.Context) error { return c.SendStatus(404) })
			r.Get("/admin/wrapped-miss", func(c router.Context) error {
				return fmt.Errorf("wrapped: %w", newFiberOwnedRouteMissError("GET", c.Path(), "admin_ui"))
			})
			r.Get("/admin/native", func(router.Context) error { return fmt.Errorf("wrapped: %w", fiber3.NewError(418, "teapot")) })
			r.Get("/admin/internal", func(router.Context) error { return errors.New("unexpected") })
			srv.Init()
			for _, probe := range []struct {
				method, path, body string
				status             int
			}{
				{"GET", "/admin/missing", "404 - Page not found", 404},
				{"HEAD", "/admin/api/missing", "", 404},
				{"GET", "/admin/api/missing", `"code":404`, 404},
				{"GET", "/outside", "404 - Page not found", 404},
				{"GET", "/admin/plain", "404 - Page not found", 404},
				{"GET", "/admin/wrapped-miss", "404 - Page not found", 404},
				{"GET", "/admin/native", "418 - Something went wrong", 418},
				{"GET", "/admin/internal", "500 - Something went wrong", 500},
			} {
				t.Run(probe.method+probe.path, func(t *testing.T) {
					res, err := srv.WrappedRouter().Test(httptest.NewRequestWithContext(t.Context(), probe.method, probe.path, nil))
					if err != nil {
						t.Fatal(err)
					}
					body, err := io.ReadAll(res.Body)
					closeResponseBody(t, res)
					if err != nil || res.StatusCode != probe.status || !strings.Contains(string(body), probe.body) || (probe.method == "HEAD" && len(body) != 0) {
						t.Fatalf("status=%d body=%q err=%v; want %d %q", res.StatusCode, body, err, probe.status, probe.body)
					}
				})
			}
		})
	}
}

func TestFiberServersOwnedMissPreservesResponseState(t *testing.T) {
	for _, backend := range []string{"v2", "v3"} {
		for _, disableNormalizing := range []bool{false, true} {
			for _, casing := range []string{"canonical", "lower", "mixed", "duplicates"} {
				t.Run(fmt.Sprintf("%s/disable-normalizing=%t/%s", backend, disableNormalizing, casing), func(t *testing.T) {
					testFiberOwnedMissResponseState(t, backend, disableNormalizing, func(key string) []string {
						return fiberOwnedMissTestHeaderNames(key, casing)
					})
				})
			}
		}
	}
}

func fiberOwnedMissTestHeaderNames(key, casing string) []string {
	mixed := []byte(strings.ToLower(key))
	for i := 0; i < len(mixed); i += 2 {
		if mixed[i] >= 'a' && mixed[i] <= 'z' {
			mixed[i] -= 'a' - 'A'
		}
	}
	switch casing {
	case "lower":
		return []string{strings.ToLower(key)}
	case "mixed":
		return []string{string(mixed)}
	case "duplicates":
		return []string{key, strings.ToLower(key), string(mixed)}
	default:
		return []string{key}
	}
}

func testFiberOwnedMissResponseState(t *testing.T, backend string, disableNormalizing bool, headerNames func(string) []string) {
	t.Helper()
	cfg := admin.Config{BasePath: "/admin"}
	preserved := map[string]string{
		"X-Request-ID": "request-1", "X-Correlation-ID": "correlation-1",
		"X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'",
		"Strict-Transport-Security": "max-age=31536000", "Access-Control-Allow-Origin": "https://example.test",
		"Cache-Control": "no-store", "Vary": "Origin",
		"X-Content-Digest": "middleware-only",
	}
	stale := map[string]string{
		"Content-Encoding": "gzip", "Content-Disposition": "attachment; filename=old.txt",
		"Content-Range": "bytes 0-8/9", "Content-Language": "old", "Content-Location": "/old",
		"Accept-Ranges": "bytes", "ETag": `"old"`, "Last-Modified": "Wed, 21 Oct 2015 07:28:00 GMT",
		"Content-MD5": "old", "Digest": "old", "Content-Digest": "old", "Repr-Digest": "old",
	}
	var captured error
	var responseContext context.Context
	var before http.Header
	var beforeTrailers []string
	fresh := map[string]string{
		"ETag": `"presented-error"`, "Content-Digest": "sha-256=:presented-error:",
		"Content-Disposition": "inline",
	}
	unrelatedTrailers := []string{"X-Trailer-Trace", "Server", "X-Trailer-Empty"}
	seedTrailers := func(path string, header *fasthttp.ResponseHeader) {
		if path != "/admin/trailers" && path != "/admin/only-trailers" {
			return
		}
		for _, field := range []string{"ETag", "Content-Digest", "Repr-Digest", "Content-Disposition"} {
			for _, key := range headerNames(field) {
				if err := header.AddTrailer(key); err != nil {
					t.Error(err)
				}
				header.Set(key, "discarded")
			}
		}
		if path == "/admin/trailers" {
			for _, field := range unrelatedTrailers {
				seen := make(map[string]bool)
				for _, key := range headerNames(field) {
					storedKey := key
					if !disableNormalizing {
						storedKey = http.CanonicalHeaderKey(key)
					}
					// Seed exactly two values per stored key; normalized casing
					// aliases are one key, while disabled normalization keeps each.
					if seen[storedKey] {
						continue
					}
					seen[storedKey] = true
					if err := header.AddTrailer(key); err != nil {
						t.Error(err)
					}
					if field != "X-Trailer-Empty" {
						header.Set(key, "first")
						header.Add(key, "second")
					}
				}
			}
		}
	}
	inspect := func(err error, ctx context.Context, header *fasthttp.ResponseHeader) {
		captured, responseContext = err, ctx
		before = make(http.Header)
		// The presenter must inherit the caller's normalization setting.
		header.Set("x-presenter-case", "current")
		wantPresenterKey := "X-Presenter-Case"
		if disableNormalizing {
			wantPresenterKey = "x-presenter-case"
		}
		for key, value := range header.All() {
			before.Add(string(key), string(value))
			if strings.EqualFold(string(key), "x-presenter-case") && string(key) != wantPresenterKey {
				t.Errorf("presenter key=%q; want %q", key, wantPresenterKey)
			}
		}
		beforeTrailers = nil
		for key := range header.Trailers() {
			beforeTrailers = append(beforeTrailers, string(key))
		}
		for key, value := range fresh {
			header.Set(key, value)
		}
	}
	var register func(string, router.HandlerFunc)
	var request func(*http.Request) (*http.Response, error)
	var initialize func()
	var native404 error
	if backend == "v2" {
		srv, r := NewFiberServer(nil, cfg, nil, false, WithFiberLogger(false),
			WithFiberConfig(func(c *fiber2.Config) { c.DisableHeaderNormalizing = disableNormalizing }),
			WithFiberMiddleware(func(c *fiber2.Ctx) error {
				seedTrailers(c.Path(), &c.Response().Header)
				for key, value := range preserved {
					for _, name := range headerNames(key) {
						c.Set(name, value)
					}
				}
				c.Cookie(&fiber2.Cookie{Name: "session", Value: "refreshed", HTTPOnly: true})
				c.Cookie(&fiber2.Cookie{Name: "csrf", Value: "rotated", Secure: true})
				c.SetUserContext(context.WithValue(c.UserContext(), fiberV3ProbeContextKey{}, "current"))
				return c.Next()
			}),
			WithFiberErrorHandler(func(c *fiber2.Ctx, err error) error {
				inspect(err, c.UserContext(), &c.Response().Header)
				return c.Status(404).SendString("presented error")
			}))
		register = func(path string, handler router.HandlerFunc) { r.Get(path, handler); r.Head(path, handler) }
		request = func(req *http.Request) (*http.Response, error) { return srv.WrappedRouter().Test(req) }
		initialize, native404 = srv.Init, fiber2.ErrNotFound
	} else {
		srv, r := NewFiberV3Server(nil, cfg, nil, false, WithFiberV3Logger(false),
			WithFiberV3Config(func(c *fiber3.Config) { c.DisableHeaderNormalizing = disableNormalizing }),
			WithFiberV3Middleware(func(c fiber3.Ctx) error {
				seedTrailers(c.Path(), &c.Response().Header)
				for key, value := range preserved {
					for _, name := range headerNames(key) {
						c.Set(name, value)
					}
				}
				c.Cookie(&fiber3.Cookie{Name: "session", Value: "refreshed", HTTPOnly: true})
				c.Cookie(&fiber3.Cookie{Name: "csrf", Value: "rotated", Secure: true})
				c.SetContext(context.WithValue(c.Context(), fiberV3ProbeContextKey{}, "current"))
				return c.Next()
			}),
			WithFiberV3ErrorHandler(func(c fiber3.Ctx, err error) error {
				inspect(err, c.Context(), &c.Response().Header)
				return c.Status(404).SendString("presented error")
			}))
		register = func(path string, handler router.HandlerFunc) { r.Get(path, handler); r.Head(path, handler) }
		request = func(req *http.Request) (*http.Response, error) { return srv.WrappedRouter().Test(req) }
		initialize, native404 = srv.Init, fiber3.ErrNotFound
	}
	for _, kind := range []string{"plain", "empty", "trailers", "only-trailers"} {
		register("/admin/"+kind, func(c router.Context) error {
			for key, value := range stale {
				for _, name := range headerNames(key) {
					c.SetHeader(name, value)
				}
			}
			for _, name := range headerNames("Content-Type") {
				c.SetHeader(name, "text/plain; charset=us-ascii")
			}
			for _, name := range headerNames("Content-Length") {
				c.SetHeader(name, "999")
			}
			if kind == "empty" {
				return c.Status(404).SendString("")
			}
			return c.SendStatus(404)
		})
	}
	register("/admin/json", func(c router.Context) error { return c.JSON(404, map[string]bool{"explicit": true}) })
	register("/admin/native", func(router.Context) error { return native404 })
	initialize()
	for _, path := range []string{"/admin/plain", "/admin/empty", "/admin/trailers", "/admin/only-trailers", "/admin/json", "/admin/native", "/admin/missing", "/outside"} {
		for _, method := range []string{"GET", "HEAD"} {
			t.Run(method+path, func(t *testing.T) {
				captured, responseContext, before = nil, nil, nil
				res, err := request(httptest.NewRequestWithContext(t.Context(), method, path, nil))
				if err != nil {
					t.Fatal(err)
				}
				body, err := io.ReadAll(res.Body)
				closeResponseBody(t, res)
				if err != nil || res.StatusCode != http.StatusNotFound {
					t.Fatalf("status=%d err=%v", res.StatusCode, err)
				}
				for key, value := range preserved {
					if got := res.Header.Get(key); got != value {
						t.Errorf("%s=%q; want %q", key, got, value)
					}
				}
				cookies := res.Cookies()
				if len(cookies) != 2 {
					t.Fatalf("cookies=%v", cookies)
				}
				for _, cookie := range cookies {
					if cookie.Name == "session" && (cookie.Value != "refreshed" || !cookie.HttpOnly) {
						t.Errorf("session cookie=%+v", cookie)
					}
					if cookie.Name == "csrf" && (cookie.Value != "rotated" || !cookie.Secure) {
						t.Errorf("csrf cookie=%+v", cookie)
					}
				}
				if path == "/admin/json" {
					if captured != nil || (method == "GET" && !strings.Contains(string(body), `"explicit":true`)) {
						t.Fatalf("explicit response changed: %q %v", body, captured)
					}
					return
				}
				var wantTrailers []string
				if path == "/admin/trailers" {
					seen := make(map[string]bool)
					for _, field := range unrelatedTrailers {
						for _, key := range headerNames(field) {
							if !disableNormalizing {
								key = http.CanonicalHeaderKey(key)
							}
							if !seen[key] {
								wantTrailers = append(wantTrailers, key)
								seen[key] = true
							}
						}
					}
				}
				slices.Sort(wantTrailers)
				slices.Sort(beforeTrailers)
				if !slices.Equal(beforeTrailers, wantTrailers) {
					t.Errorf("presenter trailer declarations=%q; want %q", beforeTrailers, wantTrailers)
				}
				for key, value := range fresh {
					if got := res.Header.Values(key); !slices.Equal(got, []string{value}) {
						t.Errorf("fresh header %s=%q; want %q", key, got, value)
					}
					if _, declared := res.Trailer[http.CanonicalHeaderKey(key)]; declared {
						t.Errorf("fresh %s was announced as a trailer", key)
					}
				}
				if path == "/admin/trailers" && method == "GET" {
					for _, field := range unrelatedTrailers {
						key := http.CanonicalHeaderKey(field)
						values, declared := res.Trailer[key]
						if !declared {
							t.Errorf("lost trailer declaration %s", field)
						}
						var wantValues []string
						if field != "X-Trailer-Empty" {
							for _, name := range wantTrailers {
								if strings.EqualFold(name, field) {
									wantValues = append(wantValues, "first", "second")
								}
							}
						}
						if !slices.Equal(values, wantValues) {
							t.Errorf("trailer %s=%q; want %q", field, values, wantValues)
						}
						if len(res.Header.Values(field)) != 0 {
							t.Errorf("trailer %s moved into ordinary headers", field)
						}
					}
				}
				if responseContext == nil || responseContext.Value(fiberV3ProbeContextKey{}) != "current" {
					t.Error("presentation lost current context")
				}
				if method == "GET" && string(body) != "presented error" {
					t.Errorf("body=%q", body)
				}
				if method == "HEAD" && len(body) != 0 {
					t.Errorf("HEAD body=%q", body)
				}
				wantLength := int64(len("presented error"))
				if path == "/admin/trailers" && method == "GET" {
					wantLength = -1
				}
				if res.ContentLength != wantLength {
					t.Errorf("content length=%d", res.ContentLength)
				}
				if path == "/admin/native" && !errors.Is(captured, native404) {
					t.Error("native cause lost")
				}
				if path == "/admin/plain" || path == "/admin/empty" || path == "/admin/trailers" || path == "/admin/only-trailers" {
					var miss *fiberOwnedRouteMissError
					if !errors.As(captured, &miss) || miss.metadata()["synthetic"] != true || miss.metadata()["path"] != path {
						t.Fatalf("missing route-miss metadata: %v", captured)
					}
					for key := range stale {
						if values := before.Values(key); len(values) != 0 {
							t.Errorf("%s reached presenter: %q", key, values)
						}
						if _, replaced := fresh[key]; !replaced {
							if values := res.Header.Values(key); len(values) != 0 {
								t.Errorf("%s remains on replacement body: %q", key, values)
							}
						}
					}
					if got := before.Get("Content-Type"); got != "text/plain; charset=utf-8" {
						t.Errorf("old content type reached presenter: %q", got)
					}
					if got := before.Get("Content-Length"); got != "" {
						t.Errorf("old content length reached presenter: %q", got)
					}
				}
			})
		}
	}
}

// Trailers are stored separately from ordinary response headers. Cleanup must
// remove old representation values there without discarding unrelated trailers.
func TestFiberOwnedMissRepresentationTrailers(t *testing.T) {
	for _, disableNormalizing := range []bool{false, true} {
		for _, casing := range []string{"canonical", "lower", "mixed", "duplicates"} {
			t.Run(fmt.Sprintf("disable-normalizing=%t/%s", disableNormalizing, casing), func(t *testing.T) {
				var response fasthttp.Response
				if disableNormalizing {
					response.Header.DisableNormalizing()
				}
				response.SetStatusCode(404)
				response.SetBodyString("Not Found")
				for _, field := range []string{"Content-Digest", "Repr-Digest", "ETag", "X-Trailer-Trace"} {
					for _, key := range fiberOwnedMissTestHeaderNames(field, casing) {
						if err := response.Header.AddTrailer(key); err != nil {
							t.Fatal(err)
						}
						value := "discarded"
						if field == "X-Trailer-Trace" {
							value = "kept"
						}
						response.Header.Set(key, value)
					}
				}
				resetFiberOwnedMissRepresentation(&response)
				response.SetBodyString("presented error")
				var wire bytes.Buffer
				if _, err := response.WriteTo(&wire); err != nil {
					t.Fatal(err)
				}
				res, err := http.ReadResponse(bufio.NewReader(&wire), httptest.NewRequestWithContext(t.Context(), "GET", "/admin/plain", nil))
				if err != nil {
					t.Fatal(err)
				}
				body, err := io.ReadAll(res.Body)
				closeResponseBody(t, res)
				if err != nil || string(body) != "presented error" {
					t.Fatalf("body=%q err=%v", body, err)
				}
				for _, key := range []string{"Content-Digest", "Repr-Digest", "ETag"} {
					if got := res.Header.Values(key); len(got) != 0 {
						t.Errorf("stale header %s=%q", key, got)
					}
					if _, declared := res.Trailer[http.CanonicalHeaderKey(key)]; declared {
						t.Errorf("stale trailer declaration %s", key)
					}
				}
				if got := res.Trailer.Get("X-Trailer-Trace"); got != "kept" {
					t.Errorf("unrelated trailer=%q", got)
				}
			})
		}
	}
}
