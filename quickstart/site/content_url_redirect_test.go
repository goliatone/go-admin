package site

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

func TestHistoricalContentURLRedirectRespondsForUnresolvedPath(t *testing.T) {
	store := &recordingContentURLRedirectStore{
		redirect: &ContentURLRedirect{
			SourcePath: "/old",
			TargetPath: "/new",
			StatusCode: http.StatusMovedPermanently,
			Active:     true,
		},
	}
	runtime := testContentURLRedirectRuntime(store)
	server := testContentURLRedirectServer(runtime)

	rec := performContentURLRedirectRequest(t, server, http.MethodGet, "/old?utm=1", "text/html")

	if rec.Code != http.StatusMovedPermanently {
		t.Fatalf("expected 301 redirect, got status=%d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Location"); got != "/new?utm=1" {
		t.Fatalf("expected query-preserving redirect to /new?utm=1, got %q", got)
	}
	if store.calls != 1 {
		t.Fatalf("expected one lookup call, got %d", store.calls)
	}
	if got := store.lastLookup.Path; got != "/old" {
		t.Fatalf("expected normalized lookup path /old, got %q", got)
	}
	if got := store.lastLookup.Method; got != http.MethodGet {
		t.Fatalf("expected lookup method GET, got %q", got)
	}
	if store.lastLookup.WantsJSON {
		t.Fatalf("expected HTML request lookup to have WantsJSON=false")
	}
	if got := store.lastLookup.SiteKey; got == "" {
		t.Fatalf("expected derived lookup site key")
	}
}

func TestHistoricalContentURLRedirectLookupUsesExplicitSiteKey(t *testing.T) {
	store := &recordingContentURLRedirectStore{
		redirect: &ContentURLRedirect{
			SourcePath: "/old",
			TargetPath: "/new",
			Active:     true,
		},
	}
	runtime := testContentURLRedirectRuntime(store)
	runtime.redirectSiteKey = "site-primary"
	server := testContentURLRedirectServer(runtime)

	rec := performContentURLRedirectRequest(t, server, http.MethodGet, "/old", "text/html")

	if rec.Code != http.StatusPermanentRedirect {
		t.Fatalf("expected redirect, got status=%d body=%s", rec.Code, rec.Body.String())
	}
	if got := store.lastLookup.SiteKey; got != "site-primary" {
		t.Fatalf("expected explicit site key, got %q", got)
	}
}

func TestHistoricalContentURLRedirectLookupUsesPublicRequestPathWithBaseAndLocale(t *testing.T) {
	store := &recordingContentURLRedirectStore{
		redirect: &ContentURLRedirect{
			SourcePath: "/site/es/old",
			TargetPath: "/site/es/new",
			Active:     true,
		},
	}
	enabled := true
	runtime := testContentURLRedirectRuntime(store)
	runtime.siteCfg = ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		BasePath:         "/site",
		SupportedLocales: []string{"en", "es"},
		LocalePrefixMode: LocalePrefixAlways,
		Features: SiteFeatures{
			EnableI18N: &enabled,
		},
	})
	server := testContentURLRedirectServer(runtime)

	rec := performContentURLRedirectRequest(t, server, http.MethodGet, "/site/es/old", "text/html")

	if rec.Code != http.StatusPermanentRedirect {
		t.Fatalf("expected redirect, got status=%d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Location"); got != "/site/es/new" {
		t.Fatalf("expected public redirect target /site/es/new, got %q", got)
	}
	if got := store.lastLookup.Path; got != "/site/es/old" {
		t.Fatalf("expected public lookup path /site/es/old, got %q", got)
	}
	if got := store.lastLookup.BasePath; got != "/site" {
		t.Fatalf("expected lookup base path /site, got %q", got)
	}
}

func TestHistoricalContentURLRedirectSkipsJSONAndNonGetRequests(t *testing.T) {
	for _, tt := range []struct {
		name   string
		method string
		accept string
		path   string
	}{
		{name: "json accept", method: http.MethodGet, accept: "application/json", path: "/old?format=json"},
		{name: "post", method: http.MethodPost, accept: "application/json", path: "/old?format=json"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			store := &recordingContentURLRedirectStore{
				redirect: &ContentURLRedirect{SourcePath: "/old", TargetPath: "/new", Active: true},
			}
			runtime := testContentURLRedirectRuntime(store)
			server := testContentURLRedirectServer(runtime)

			rec := performContentURLRedirectRequest(t, server, tt.method, tt.path, tt.accept)

			if rec.Code != http.StatusNotFound {
				t.Fatalf("expected skipped redirect to continue to 404, got status=%d body=%s", rec.Code, rec.Body.String())
			}
			if store.calls != 0 {
				t.Fatalf("expected skipped request to avoid lookup, got %d calls", store.calls)
			}
		})
	}
}

func TestHistoricalContentURLRedirectIgnoresUnsafeInactiveAndSelfTargets(t *testing.T) {
	for _, tt := range []struct {
		name     string
		redirect *ContentURLRedirect
	}{
		{
			name:     "inactive",
			redirect: &ContentURLRedirect{SourcePath: "/old", TargetPath: "/new"},
		},
		{
			name:     "self",
			redirect: &ContentURLRedirect{SourcePath: "/old", TargetPath: "/old", Active: true},
		},
		{
			name:     "external",
			redirect: &ContentURLRedirect{SourcePath: "/old", TargetPath: "https://other.example/new", Active: true},
		},
		{
			name:     "reserved",
			redirect: &ContentURLRedirect{SourcePath: "/old", TargetPath: "/admin/content", Active: true},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			store := &recordingContentURLRedirectStore{redirect: tt.redirect}
			runtime := testContentURLRedirectRuntime(store)
			server := testContentURLRedirectServer(runtime)

			rec := performContentURLRedirectRequest(t, server, http.MethodGet, "/old", "text/html")

			if rec.Code != http.StatusNotFound {
				t.Fatalf("expected invalid redirect to continue to 404, got status=%d location=%q body=%s", rec.Code, rec.Header().Get("Location"), rec.Body.String())
			}
			if got := rec.Header().Get("Location"); got != "" {
				t.Fatalf("expected no Location header for ignored redirect, got %q", got)
			}
		})
	}
}

func TestHistoricalContentURLRedirectStorageErrorReturnsServerError(t *testing.T) {
	store := &recordingContentURLRedirectStore{err: errors.New("redirect store offline")}
	runtime := testContentURLRedirectRuntime(store)
	server := testContentURLRedirectServer(runtime)

	rec := performContentURLRedirectRequest(t, server, http.MethodGet, "/old", "text/html")

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected storage error to return 503, got status=%d body=%s", rec.Code, rec.Body.String())
	}
	if store.calls != 1 {
		t.Fatalf("expected one lookup call, got %d", store.calls)
	}
}

func TestHistoricalContentURLRedirectWritesRenderCacheDebugBypass(t *testing.T) {
	store := &recordingContentURLRedirectStore{
		redirect: &ContentURLRedirect{
			SourcePath: "/old",
			TargetPath: "/new",
			Active:     true,
		},
	}
	runtime := testContentURLRedirectRuntime(store)
	cacheStore := newTestRenderCacheStore()
	runtime.renderCache = renderCacheConfig{
		store: cacheStore,
		policy: normalizeRenderCachePolicy(RenderCachePolicy{
			Enabled:      true,
			DebugHeaders: true,
			DebugKeys:    true,
		}),
	}
	server := testContentURLRedirectServer(runtime)

	rec := performContentURLRedirectRequest(t, server, http.MethodGet, "/old", "text/html")

	if rec.Code != http.StatusPermanentRedirect {
		t.Fatalf("expected default 308 redirect, got status=%d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusBypass {
		t.Fatalf("expected render cache bypass header, got %q headers=%v", got, rec.Header())
	}
	if got := rec.Header().Get("X-Site-Render-Cache-Reason"); got != renderCacheReasonHistoricalRedirect {
		t.Fatalf("expected historical redirect bypass reason, got %q headers=%v", got, rec.Header())
	}
	if got := rec.Header().Get("X-Site-Render-Cache-Key"); got == "" {
		t.Fatalf("expected debug cache key header, headers=%v", rec.Header())
	}
	if len(cacheStore.items) != 0 {
		t.Fatalf("expected historical redirect not to write rendered page cache entries, got %d", len(cacheStore.items))
	}
}

func TestContentURLRedirectStatusCodeValidation(t *testing.T) {
	for _, tt := range []struct {
		input    int
		expected int
	}{
		{input: 0, expected: http.StatusPermanentRedirect},
		{input: http.StatusMovedPermanently, expected: http.StatusMovedPermanently},
		{input: http.StatusFound, expected: http.StatusFound},
		{input: http.StatusTemporaryRedirect, expected: http.StatusTemporaryRedirect},
		{input: http.StatusPermanentRedirect, expected: http.StatusPermanentRedirect},
		{input: http.StatusTeapot, expected: http.StatusPermanentRedirect},
	} {
		if got := contentURLRedirectStatusCode(tt.input); got != tt.expected {
			t.Fatalf("contentURLRedirectStatusCode(%d)=%d, expected %d", tt.input, got, tt.expected)
		}
	}
}

func TestNormalizeContentURLRedirectTargetAllowsSameHostAbsoluteURL(t *testing.T) {
	target, targetPath, hasQuery, ok := normalizeContentURLRedirectTarget("https://example.com/new?x=1", "example.com")
	if !ok {
		t.Fatalf("expected same-host absolute URL to normalize")
	}
	if target != "/new?x=1" || targetPath != "/new" || !hasQuery {
		t.Fatalf("unexpected normalized target=%q path=%q hasQuery=%v", target, targetPath, hasQuery)
	}

	if _, _, _, ok = normalizeContentURLRedirectTarget("https://other.example/new", "example.com"); ok {
		t.Fatalf("expected external absolute URL to be rejected")
	}
}

func testContentURLRedirectRuntime(store ContentURLRedirectStore) *deliveryRuntime {
	return &deliveryRuntime{
		siteCfg:        ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		contentSvc:     admin.NewInMemoryContentService(),
		contentTypeSvc: admin.NewInMemoryContentService(),
		redirectStore:  store,
	}
}

func testContentURLRedirectServer(runtime *deliveryRuntime) router.Server[*httprouter.Router] {
	server := router.NewHTTPServer()
	handler := func(c router.Context) error {
		return runtime.respondDelivery(c)
	}
	server.Router().Get("/*path", handler)
	server.Router().Post("/*path", handler)
	return server
}

func performContentURLRedirectRequest[T interface {
	ServeHTTP(http.ResponseWriter, *http.Request)
}](t *testing.T, server router.Server[T], method, path, accept string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(context.Background(), method, path, nil)
	if accept != "" {
		req.Header.Set("Accept", accept)
	}
	rec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)
	return rec
}

type recordingContentURLRedirectStore struct {
	redirect   *ContentURLRedirect
	err        error
	calls      int
	lastLookup ContentURLRedirectLookup
}

func (s *recordingContentURLRedirectStore) LookupContentURLRedirect(_ context.Context, lookup ContentURLRedirectLookup) (*ContentURLRedirect, error) {
	s.calls++
	s.lastLookup = lookup
	if s.err != nil {
		return nil, s.err
	}
	return s.redirect, nil
}
