package site

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSiteDeliveryPreviewFidelityThroughRegisteredRoutes(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	content := admin.NewInMemoryContentService()

	_, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:          "post-type",
		Name:        "Post",
		Slug:        "post",
		Environment: "default",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "hybrid",
				"routes": map[string]any{
					"list":   "/posts",
					"detail": "/posts/:slug",
				},
				"templates": map[string]any{
					"list":   "site/posts",
					"detail": "site/post",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}

	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "post-published",
		Title:           "Published",
		Slug:            "hello-world",
		Locale:          "en",
		Status:          "published",
		ContentType:     "post",
		ContentTypeSlug: "post",
		Data: map[string]any{
			"path": "/posts/hello-world",
		},
	})
	if err != nil {
		t.Fatalf("create published content: %v", err)
	}
	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "post-draft",
		Title:           "Draft",
		Slug:            "hello-world",
		Locale:          "en",
		Status:          "draft",
		ContentType:     "post",
		ContentTypeSlug: "post",
		Data: map[string]any{
			"path": "/posts/hello-world",
		},
	})
	if err != nil {
		t.Fatalf("create draft content: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	basePath := "/posts/hello-world?locale=en&format=json"
	initial := performSiteRequest(t, server, basePath)
	initialTemplate := nestedString(initial, "template")
	initialRecordID := nestedString(initial, "context", "record", "id")
	if initialRecordID != "post-published" {
		t.Fatalf("expected published record without preview token, got %q payload=%+v", initialRecordID, initial)
	}
	if nestedBool(initial, "context", "is_preview") {
		t.Fatalf("expected non-preview context by default, got %+v", initial["context"])
	}

	validToken, err := adm.Preview().Generate("posts", "post-draft", time.Minute)
	if err != nil {
		t.Fatalf("generate valid preview token: %v", err)
	}
	preview := performSiteRequest(t, server, basePath+"&preview_token="+validToken)
	if nestedString(preview, "template") != initialTemplate {
		t.Fatalf("expected preview to resolve through same template, initial=%q preview=%q", initialTemplate, nestedString(preview, "template"))
	}
	if recordID := nestedString(preview, "context", "record", "id"); recordID != "post-draft" {
		t.Fatalf("expected valid preview token to render draft record, got %q payload=%+v", recordID, preview)
	}
	if !nestedBool(preview, "context", "is_preview") {
		t.Fatalf("expected preview context flag true, got %+v", preview["context"])
	}
	switcherURL := localeSwitcherURLByLocale(preview, "es")
	parsedSwitcherURL, err := url.Parse(switcherURL)
	if err != nil {
		t.Fatalf("parse locale switcher URL %q: %v", switcherURL, err)
	}
	if parsedSwitcherURL.Path != "/es/posts/hello-world" {
		t.Fatalf("expected translated locale switcher path /es/posts/hello-world, got %q payload=%+v", parsedSwitcherURL.Path, preview)
	}
	if got := parsedSwitcherURL.Query().Get("preview_token"); got != validToken {
		t.Fatalf("expected locale switcher to forward decoded preview token, got %q payload=%+v", got, preview)
	}

	invalid := performSiteRequest(t, server, basePath+"&preview_token=not-a-valid-token")
	if recordID := nestedString(invalid, "context", "record", "id"); recordID != "post-published" {
		t.Fatalf("expected invalid preview token to avoid draft leak, got %q payload=%+v", recordID, invalid)
	}
	if nestedBool(invalid, "context", "is_preview") {
		t.Fatalf("expected invalid preview token to keep is_preview=false")
	}

	expiredToken, err := adm.Preview().Generate("posts", "post-draft", -1*time.Minute)
	if err != nil {
		t.Fatalf("generate expired preview token: %v", err)
	}
	expired := performSiteRequest(t, server, basePath+"&preview_token="+expiredToken)
	if recordID := nestedString(expired, "context", "record", "id"); recordID != "post-published" {
		t.Fatalf("expected expired preview token to avoid draft leak, got %q payload=%+v", recordID, expired)
	}
}

func TestSiteDeliveryLocaleFallbackPolicies(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	content := admin.NewInMemoryContentService()

	_, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:          "post-type",
		Name:        "Post",
		Slug:        "post",
		Environment: "default",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "detail",
				"routes": map[string]any{
					"detail": "/posts/:slug",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}
	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "post-en",
		Title:           "Published",
		Slug:            "welcome",
		Locale:          "en",
		Status:          "published",
		ContentType:     "post",
		ContentTypeSlug: "post",
		Data:            map[string]any{"path": "/posts/welcome"},
	})
	if err != nil {
		t.Fatalf("create content: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register fallback allowed routes: %v", err)
	}
	fallbackAllowed := performSiteRequest(t, server, "/posts/welcome?locale=es&format=json")
	if !nestedBool(fallbackAllowed, "context", "missing_requested_locale") {
		t.Fatalf("expected fallback-allowed request to mark missing_requested_locale=true, got %+v", fallbackAllowed["context"])
	}
	if got := nestedString(fallbackAllowed, "context", "resolved_locale"); got != "en" {
		t.Fatalf("expected fallback-allowed request to resolve en locale, got %q", got)
	}

	allow := false
	disabledServer := router.NewHTTPServer()
	if err := RegisterSiteRoutes(disabledServer.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales:    []string{"en", "es"},
		AllowLocaleFallback: &allow,
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register fallback disabled routes: %v", err)
	}
	fallbackDisabled := performSiteRequestWithStatus(t, disabledServer, "/posts/welcome?locale=es&format=json", http.StatusNotFound)
	if nestedString(fallbackDisabled, "error", "code") != siteErrorCodeTranslationMissing {
		t.Fatalf("expected translation_missing error code, got %+v", fallbackDisabled)
	}
	if nestedString(fallbackDisabled, "error", "requested_locale") != "es" {
		t.Fatalf("expected requested locale metadata in error payload, got %+v", fallbackDisabled)
	}
}

func TestSiteDeliveryFallbackCanonicalRedirectDefaultsToResolvedLocale(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	content := admin.NewInMemoryContentService()

	_, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:          "post-type",
		Name:        "Post",
		Slug:        "post",
		Environment: "default",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "detail",
				"routes": map[string]any{
					"detail": "/posts/:slug",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}

	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "post-en",
		Title:           "Published",
		Slug:            "welcome",
		Locale:          "en",
		Status:          "published",
		ContentType:     "post",
		ContentTypeSlug: "post",
		Data:            map[string]any{"path": "/posts/welcome"},
	})
	if err != nil {
		t.Fatalf("create content: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	rec := performSiteRequestRaw(t, server, "/es/posts/welcome", "text/html")
	if rec.Code != http.StatusPermanentRedirect {
		t.Fatalf("expected fallback canonical redirect status %d, got %d body=%s", http.StatusPermanentRedirect, rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Location"); got != "/posts/welcome" {
		t.Fatalf("expected fallback canonical redirect location /posts/welcome, got %q", got)
	}
}

func TestSiteDeliveryFallbackCanonicalRedirectCanPreserveRequestedLocale(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	content := admin.NewInMemoryContentService()

	_, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:          "post-type",
		Name:        "Post",
		Slug:        "post",
		Environment: "default",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "detail",
				"routes": map[string]any{
					"detail": "/posts/:slug",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}

	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "post-en",
		Title:           "Published",
		Slug:            "welcome",
		Locale:          "en",
		Status:          "published",
		ContentType:     "post",
		ContentTypeSlug: "post",
		Data:            map[string]any{"path": "/posts/welcome"},
	})
	if err != nil {
		t.Fatalf("create content: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		Features: SiteFeatures{
			CanonicalRedirectMode: CanonicalRedirectRequestedLocaleSticky,
		},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	rec := performSiteRequestRaw(t, server, "/es/posts/welcome", "text/html")
	if rec.Code == http.StatusPermanentRedirect {
		t.Fatalf("expected sticky fallback mode to avoid cross-locale redirect, got location=%q", rec.Header().Get("Location"))
	}
	if got := rec.Header().Get("Location"); got != "" {
		t.Fatalf("expected no Location header in sticky fallback mode, got %q", got)
	}
}

func TestSiteDeliveryRedirectsToCanonicalLocalizedPath(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	content := admin.NewInMemoryContentService()

	_, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:          "page-type",
		Name:        "Page",
		Slug:        "page",
		Environment: "default",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "page",
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}

	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "about-en",
		Title:           "About Us",
		Slug:            "about",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/about"},
	})
	if err != nil {
		t.Fatalf("create en content: %v", err)
	}
	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "about-es",
		Title:           "Sobre Nosotros",
		Slug:            "about",
		Locale:          "es",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/sobre-nosotros"},
	})
	if err != nil {
		t.Fatalf("create es content: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	rec := performSiteRequestRaw(t, server, "/es/about?foo=bar", "text/html")
	if rec.Code != http.StatusPermanentRedirect {
		t.Fatalf("expected canonical redirect status %d, got %d body=%s", http.StatusPermanentRedirect, rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Location"); got != "/es/sobre-nosotros?foo=bar" {
		t.Fatalf("expected canonical redirect location /es/sobre-nosotros?foo=bar, got %q", got)
	}
}

func TestSiteDeliveryPersistsLocaleCookieAndRedirectsUnscopedFallbackRequest(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	content := admin.NewInMemoryContentService()

	_, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:          "post-type",
		Name:        "Post",
		Slug:        "post",
		Environment: "default",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "detail",
				"routes": map[string]any{
					"detail": "/posts/:slug",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}

	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "post-en",
		Title:           "Welcome",
		Slug:            "welcome",
		Locale:          "en",
		Status:          "published",
		ContentType:     "post",
		ContentTypeSlug: "post",
		Data:            map[string]any{"path": "/posts/welcome"},
	})
	if err != nil {
		t.Fatalf("create en post: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		Features: SiteFeatures{
			CanonicalRedirectMode: CanonicalRedirectRequestedLocaleSticky,
		},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	first := performSiteRequestRaw(t, server, "/es/posts/welcome?format=json", "application/json")
	if first.Code != http.StatusOK {
		t.Fatalf("expected first localized request to render 200, got %d body=%s", first.Code, first.Body.String())
	}
	localeCookie := cookieHeaderValue(first.Result().Cookies(), defaultLocaleCookieName)
	if localeCookie != "es" {
		t.Fatalf("expected persisted locale cookie %q=%q, got %q", defaultLocaleCookieName, "es", localeCookie)
	}

	req := httptest.NewRequest(http.MethodGet, "/posts/welcome", nil)
	req.Header.Set("Accept", "text/html")
	req.Header.Set("Cookie", defaultLocaleCookieName+"="+localeCookie)
	rec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusPermanentRedirect {
		t.Fatalf("expected stale unscoped request to redirect, got status=%d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Location"); got != "/es/posts/welcome" {
		t.Fatalf("expected sticky locale redirect to /es/posts/welcome, got %q", got)
	}
}

func TestSiteLocaleSwitcherCanSwitchToDefaultLocaleWithLocaleCookie(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	content := admin.NewInMemoryContentService()

	_, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:          "page-type",
		Name:        "Page",
		Slug:        "page",
		Environment: "default",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "page",
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}

	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "contact-en",
		Title:           "Contact",
		Slug:            "contact",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/contact"},
	})
	if err != nil {
		t.Fatalf("create en contact: %v", err)
	}
	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "contact-fr",
		Title:           "Contact (FR)",
		Slug:            "contact",
		Locale:          "fr",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/contact"},
	})
	if err != nil {
		t.Fatalf("create fr contact: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "fr"},
		Features: SiteFeatures{
			CanonicalRedirectMode: CanonicalRedirectRequestedLocaleSticky,
		},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	firstPath := "/fr/contact?format=json"
	first := performSiteRequestRaw(t, server, firstPath, "application/json")
	if first.Code != http.StatusOK {
		t.Fatalf("expected fr request status 200, got %d body=%s", first.Code, first.Body.String())
	}
	localeCookie := cookieHeaderValue(first.Result().Cookies(), defaultLocaleCookieName)
	if localeCookie != "fr" {
		t.Fatalf("expected persisted locale cookie fr, got %q", localeCookie)
	}
	firstPayload := decodeSitePayload(t, firstPath, first)
	enURL := localeSwitcherURLByLocale(firstPayload, "en")
	if enURL == "" {
		t.Fatalf("expected locale switcher en URL, got payload=%+v", firstPayload)
	}
	if !strings.Contains(enURL, "locale=en") {
		t.Fatalf("expected default-locale switch URL to include locale=en, got %q", enURL)
	}

	req := httptest.NewRequest(http.MethodGet, enURL, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Cookie", defaultLocaleCookieName+"="+localeCookie)
	rec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected default locale switch request status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	switched := decodeSitePayload(t, enURL, rec)
	if got := nestedString(switched, "context", "requested_locale"); got != "en" {
		t.Fatalf("expected requested_locale en after switch, got %q payload=%+v", got, switched)
	}
	if got := nestedString(switched, "context", "resolved_locale"); got != "en" {
		t.Fatalf("expected resolved_locale en after switch, got %q payload=%+v", got, switched)
	}
}

func TestSiteDeliveryStrictLocalizedPathsDisablesAliasResolution(t *testing.T) {
	adm := mustAdminWithTheme(t, "admin", "light")
	content := admin.NewInMemoryContentService()

	_, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:          "page-type",
		Name:        "Page",
		Slug:        "page",
		Environment: "default",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "page",
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type: %v", err)
	}

	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "about-en",
		Title:           "About Us",
		Slug:            "about",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/about"},
	})
	if err != nil {
		t.Fatalf("create en content: %v", err)
	}
	_, err = content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "about-es",
		Title:           "Sobre Nosotros",
		Slug:            "about",
		Locale:          "es",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/sobre-nosotros"},
	})
	if err != nil {
		t.Fatalf("create es content: %v", err)
	}

	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(server.Router(), adm, admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		Features: SiteFeatures{
			StrictLocalizedPaths: coreBoolPtr(true),
		},
	}, WithDeliveryServices(content, content)); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	rec := performSiteRequestRaw(t, server, "/es/about", "text/html")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected strict localized path mismatch to return 404, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func coreBoolPtr(value bool) *bool {
	return &value
}

func performSiteRequest[T interface {
	ServeHTTP(http.ResponseWriter, *http.Request)
}](t *testing.T, server router.Server[T], path string) map[string]any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Accept", "application/json")
	rec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("request %q returned status %d body=%s", path, rec.Code, rec.Body.String())
	}
	return decodeSitePayload(t, path, rec)
}

func performSiteRequestWithStatus[T interface {
	ServeHTTP(http.ResponseWriter, *http.Request)
}](t *testing.T, server router.Server[T], path string, status int) map[string]any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Accept", "application/json")
	rec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)
	if rec.Code != status {
		t.Fatalf("request %q returned status %d body=%s", path, rec.Code, rec.Body.String())
	}
	return decodeSitePayload(t, path, rec)
}

func performSiteRequestRaw[T interface {
	ServeHTTP(http.ResponseWriter, *http.Request)
}](t *testing.T, server router.Server[T], path string, accept string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	if strings.TrimSpace(accept) != "" {
		req.Header.Set("Accept", accept)
	}
	rec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)
	return rec
}

func decodeSitePayload(t *testing.T, path string, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response %q: %v body=%s", path, err, rec.Body.String())
	}
	return payload
}

func cookieHeaderValue(cookies []*http.Cookie, name string) string {
	for _, cookie := range cookies {
		if cookie == nil {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(cookie.Name), strings.TrimSpace(name)) {
			return strings.TrimSpace(cookie.Value)
		}
	}
	return ""
}

func localeSwitcherURLByLocale(payload map[string]any, locale string) string {
	contextMap, ok := payload["context"].(map[string]any)
	if !ok || len(contextMap) == 0 {
		return ""
	}
	switcher, ok := contextMap["locale_switcher"].(map[string]any)
	if !ok || len(switcher) == 0 {
		return ""
	}
	items, ok := switcher["items"].([]any)
	if !ok || len(items) == 0 {
		return ""
	}
	target := strings.ToLower(strings.TrimSpace(locale))
	for _, raw := range items {
		item, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if strings.ToLower(strings.TrimSpace(anyString(item["locale"]))) != target {
			continue
		}
		return strings.TrimSpace(anyString(item["url"]))
	}
	return ""
}

func nestedString(payload map[string]any, keys ...string) string {
	current := any(payload)
	for _, key := range keys {
		object, ok := current.(map[string]any)
		if !ok {
			return ""
		}
		current = object[key]
	}
	value, ok := current.(string)
	if !ok {
		return ""
	}
	return value
}

func nestedBool(payload map[string]any, keys ...string) bool {
	current := any(payload)
	for _, key := range keys {
		object, ok := current.(map[string]any)
		if !ok {
			return false
		}
		current = object[key]
	}
	value, ok := current.(bool)
	return ok && value
}
