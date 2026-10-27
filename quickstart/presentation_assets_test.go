package quickstart

import (
	"io/fs"
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

func TestFiberPresentationAssetParity(t *testing.T) {
	base := fstest.MapFS{
		"templates/page.html": {Data: []byte(`<link rel="stylesheet" href="{{ adminURL("assets/main.css") }}"><link rel="stylesheet" href="{{ adminURL("assets/extra.css") }}"><script src="{{ adminURL("assets/app.js") }}"></script>`)},
		"assets/main.css":     {Data: []byte(".base {color: red}")},
		"assets/app.js":       {Data: []byte("window.preview = true;")},
	}
	extra := fstest.MapFS{"main.css": {Data: []byte(".wrong {color: blue}")}, "extra.css": {Data: []byte(".extra {display: block}")}}
	baseAssets, err := fs.Sub(base, "assets")
	if err != nil {
		t.Fatal(err)
	}
	cfg := admin.Config{BasePath: "/admin"}
	var pages [2]string
	for i, backend := range []string{"v2", "v3"} {
		t.Run(backend, func(t *testing.T) {
			opts := []ViewEngineOption{WithViewBasePath("/admin"), WithViewAssetsFS(extra), WithViewReload(false)}
			var request func(*http.Request) (*http.Response, error)
			if backend == "v2" {
				views, err := NewViewEngine(base, opts...)
				if err != nil {
					t.Fatal(err)
				}
				server := router.NewFiberAdapter(func(*fiber2.App) *fiber2.App { return fiber2.New(fiber2.Config{Views: views}) })
				NewStaticAssets(server.Router(), cfg, baseAssets, WithExtraAssetsFS(extra))
				server.Router().Get("/page", func(c router.Context) error { return RenderTemplateView(c, "page", nil) })
				server.Init()
				request = func(r *http.Request) (*http.Response, error) { return server.WrappedRouter().Test(r, -1) }
			} else {
				views, err := NewFiberV3ViewEngine(base, opts...)
				if err != nil {
					t.Fatal(err)
				}
				server := router.NewFiberV3Adapter(func(*fiber3.App) *fiber3.App { return fiber3.New(fiber3.Config{Views: views}) })
				NewStaticAssets(server.Router(), cfg, baseAssets, WithExtraAssetsFS(extra))
				server.Router().Get("/page", func(c router.Context) error { return RenderTemplateView(c, "page", nil) })
				server.Init()
				request = func(r *http.Request) (*http.Response, error) {
					return server.WrappedRouter().Test(r, fiber3.TestConfig{Timeout: 0})
				}
			}
			pageRes, page := presentationBody(t, request, httptest.NewRequestWithContext(t.Context(), "GET", "/page", nil))
			if pageRes.StatusCode != http.StatusOK {
				t.Fatalf("page: %d %s", pageRes.StatusCode, page)
			}
			pages[i] = page
			for _, tc := range []struct{ name, body, kind string }{{"main.css", ".base {color: red}", "text/css"}, {"extra.css", ".extra {display: block}", "text/css"}, {"app.js", "window.preview = true;", "javascript"}} {
				path := "/admin/assets/" + tc.name
				if !strings.Contains(page, path) {
					t.Fatalf("helper omitted asset %s: %s", path, page)
				}
				for _, method := range []string{"GET", "HEAD"} {
					res, body := presentationBody(t, request, httptest.NewRequestWithContext(t.Context(), method, path, nil))
					want := tc.body
					if method == "HEAD" {
						want = ""
					}
					if res.StatusCode != http.StatusOK || body != want || !strings.Contains(res.Header.Get("Content-Type"), tc.kind) {
						t.Fatalf("%s %s: %d %q %s", method, path, res.StatusCode, body, res.Header.Get("Content-Type"))
					}
				}
			}
			res, _ := presentationBody(t, request, httptest.NewRequestWithContext(t.Context(), "GET", "/admin/assets/missing.css", nil))
			if res.StatusCode != http.StatusNotFound {
				t.Fatalf("missing asset status=%d", res.StatusCode)
			}
		})
	}
	if pages[0] != pages[1] {
		t.Fatalf("asset helper parity: v2=%s v3=%s", pages[0], pages[1])
	}
}
