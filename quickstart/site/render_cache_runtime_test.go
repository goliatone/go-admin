package site

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestRenderCacheRegisteredDeliveryMissThenHitShortCircuits(t *testing.T) {
	store := newTestRenderCacheStore()
	renderer := &testRenderCacheRenderer{}
	services := newRenderCacheDeliveryServices(t)
	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(
		server.Router(),
		nil,
		admin.Config{DefaultLocale: "en"},
		SiteConfig{Features: SiteFeatures{EnableI18N: new(false)}},
		WithDeliveryServices(services, services),
		WithRenderCache(store, RenderCachePolicy{
			Enabled:          true,
			FreshTTL:         time.Minute,
			DebugHeaders:     true,
			TemplateRenderer: renderer,
		}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	first := performSiteRequestRaw(t, server, "/about", "text/html")
	if first.Code != http.StatusOK {
		t.Fatalf("first request status=%d body=%s", first.Code, first.Body.String())
	}
	if got := first.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusMiss {
		t.Fatalf("expected first request cache miss, got %q headers=%v", got, first.Header())
	}
	if got := first.Header().Get("X-Site-Render-Cache-Key"); got != "" {
		t.Fatalf("expected cache key header to be hidden by default, got %q", got)
	}
	firstBody := first.Body.String()
	if services.contentsCalls == 0 || services.contentTypesCalls == 0 || renderer.calls == 0 {
		t.Fatalf("expected first request to resolve and render, services=%d/%d renderer=%d", services.contentsCalls, services.contentTypesCalls, renderer.calls)
	}
	contentCalls := services.contentsCalls
	contentTypeCalls := services.contentTypesCalls
	renderCalls := renderer.calls

	second := performSiteRequestRaw(t, server, "/about", "text/html")
	if second.Code != http.StatusOK {
		t.Fatalf("second request status=%d body=%s", second.Code, second.Body.String())
	}
	if got := second.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusHit {
		t.Fatalf("expected second request cache hit, got %q headers=%v", got, second.Header())
	}
	if second.Body.String() != firstBody {
		t.Fatalf("expected cached response body %q, got %q", firstBody, second.Body.String())
	}
	if services.contentsCalls != contentCalls || services.contentTypesCalls != contentTypeCalls || renderer.calls != renderCalls {
		t.Fatalf("expected cache hit to short-circuit, services %d/%d -> %d/%d renderer %d -> %d",
			contentCalls, contentTypeCalls, services.contentsCalls, services.contentTypesCalls, renderCalls, renderer.calls)
	}
	if len(store.tagsByKey) != 1 {
		t.Fatalf("expected stored tags for one key, got %+v", store.tagsByKey)
	}
	for _, tags := range store.tagsByKey {
		assertStringContains(t, tags, "site:render")
		assertStringContains(t, tags, "site:content:about")
		assertStringContains(t, tags, "site:content-type:page")
		assertStringContains(t, tags, "site:locale:en")
	}
}

func TestRenderCacheBypassScenarios(t *testing.T) {
	tests := []struct {
		name   string
		path   string
		policy RenderCachePolicy
		mutate func(*http.Request) *http.Request
		reason string
	}{
		{
			name: "unknown query",
			path: "/about?utm_source=test",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
			},
			reason: renderCacheReasonUnknownQuery,
		},
		{
			name: "preview token",
			path: "/about?preview_token=draft",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
			},
			reason: renderCacheReasonPreview,
		},
		{
			name: "json format",
			path: "/about?format=json",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
			},
			reason: renderCacheReasonJSON,
		},
		{
			name: "auth header",
			path: "/about",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
			},
			mutate: func(req *http.Request) *http.Request {
				req.Header.Set("Authorization", "Bearer token")
				return req
			},
			reason: renderCacheReasonAuth,
		},
		{
			name: "common session cookie",
			path: "/about",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
			},
			mutate: func(req *http.Request) *http.Request {
				req.AddCookie(&http.Cookie{Name: "session_id", Value: "session-123"})
				return req
			},
			reason: renderCacheReasonAuth,
		},
		{
			name: "common jwt cookie",
			path: "/about",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
			},
			mutate: func(req *http.Request) *http.Request {
				req.AddCookie(&http.Cookie{Name: "jwt", Value: "token"})
				return req
			},
			reason: renderCacheReasonAuth,
		},
		{
			name: "configured auth cookie",
			path: "/about",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
				AuthCookieNames:  []string{"go_auth_session"},
			},
			mutate: func(req *http.Request) *http.Request {
				req.AddCookie(&http.Cookie{Name: "go_auth_session", Value: "session"})
				return req
			},
			reason: renderCacheReasonAuth,
		},
		{
			name: "admin authenticated context",
			path: "/about",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
			},
			mutate: func(req *http.Request) *http.Request {
				return req.WithContext(admin.WithAuthenticatedRequest(req.Context()))
			},
			reason: renderCacheReasonAuth,
		},
		{
			name: "go-auth claims context",
			path: "/about",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
			},
			mutate: func(req *http.Request) *http.Request {
				claims := &auth.JWTClaims{RegisteredClaims: jwt.RegisteredClaims{Subject: "user-1"}}
				return req.WithContext(auth.WithClaimsContext(req.Context(), claims))
			},
			reason: renderCacheReasonAuth,
		},
		{
			name: "go-auth actor context",
			path: "/about",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
			},
			mutate: func(req *http.Request) *http.Request {
				return req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: "actor-1"}))
			},
			reason: renderCacheReasonAuth,
		},
		{
			name: "host bypass predicate",
			path: "/about",
			policy: RenderCachePolicy{
				Enabled:          true,
				FreshTTL:         time.Minute,
				DebugHeaders:     true,
				TemplateRenderer: &testRenderCacheRenderer{},
				BypassPredicates: []RenderCacheBypassPredicate{
					func(router.Context, RequestState) (bool, string) {
						return true, "tenant_personalized"
					},
				},
			},
			reason: "tenant_personalized",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newTestRenderCacheStore()
			services := newRenderCacheDeliveryServices(t)
			server := router.NewHTTPServer()
			if err := RegisterSiteRoutes(
				server.Router(),
				nil,
				admin.Config{DefaultLocale: "en"},
				SiteConfig{Features: SiteFeatures{EnableI18N: new(false)}},
				WithDeliveryServices(services, services),
				WithRenderCache(store, tt.policy),
			); err != nil {
				t.Fatalf("register site routes: %v", err)
			}
			req := httptestRequest(http.MethodGet, tt.path)
			req.Header.Set("Accept", "text/html")
			if tt.mutate != nil {
				req = tt.mutate(req)
			}
			rec := performRawRequest(t, server, req)
			if got := rec.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusBypass {
				t.Fatalf("expected bypass status, got %q headers=%v", got, rec.Header())
			}
			if got := rec.Header().Get("X-Site-Render-Cache-Reason"); got != tt.reason {
				t.Fatalf("expected bypass reason %q, got %q headers=%v", tt.reason, got, rec.Header())
			}
		})
	}
}

func TestRenderCacheReservedAndSearchRoutesBypass(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		renderCache: renderCacheConfig{
			store: newTestRenderCacheStore(),
			policy: normalizeRenderCachePolicy(RenderCachePolicy{
				Enabled:          true,
				TemplateRenderer: &testRenderCacheRenderer{},
			}),
		},
	}
	tests := []struct {
		name   string
		path   string
		reason string
	}{
		{name: "admin route", path: "/admin/users", reason: renderCacheReasonReservedRoute},
		{name: "api route", path: "/api/content", reason: renderCacheReasonReservedRoute},
		{name: "search route", path: "/search", reason: renderCacheReasonSearchRoute},
		{name: "search api route", path: "/api/search", reason: renderCacheReasonReservedRoute},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := router.NewMockContext()
			ctx.On("Context").Return(context.Background())
			ctx.On("Method").Return(http.MethodGet)
			ctx.On("Path").Return(tt.path)
			ctx.HeadersM["Accept"] = "text/html"

			decision := runtime.renderCacheBaseDecision(ctx, RequestState{})
			if decision.Cacheable {
				t.Fatalf("expected %s to bypass", tt.path)
			}
			if decision.Reason != tt.reason {
				t.Fatalf("expected reason %q, got %q", tt.reason, decision.Reason)
			}
		})
	}
}

func TestRenderCachePolicyDefaultsMaxCaptureBodySize(t *testing.T) {
	policy := normalizeRenderCachePolicy(RenderCachePolicy{Enabled: true})
	if policy.MaxCaptureBodySize != router.DefaultMaxCapturedBodySize {
		t.Fatalf("expected default max capture body size %d, got %d", router.DefaultMaxCapturedBodySize, policy.MaxCaptureBodySize)
	}
	policy = normalizeRenderCachePolicy(RenderCachePolicy{Enabled: true, MaxCaptureBodySize: -1})
	if policy.MaxCaptureBodySize != router.DefaultMaxCapturedBodySize {
		t.Fatalf("expected negative max capture body size to use default %d, got %d", router.DefaultMaxCapturedBodySize, policy.MaxCaptureBodySize)
	}
}

func TestRenderCacheConfigAllowsMissingOverrideForRouterCapture(t *testing.T) {
	decision := renderCacheConfigDecision(renderCacheConfig{
		store:  newTestRenderCacheStore(),
		policy: RenderCachePolicy{Enabled: true},
	}, normalizeRenderCachePolicy(RenderCachePolicy{Enabled: true}))
	if !decision.Cacheable {
		t.Fatalf("expected missing override not to block cache decision, reason=%q", decision.Reason)
	}
}

func TestRenderCacheRouterCaptureHTTPRouterWithoutOverride(t *testing.T) {
	views := &testRenderCacheViews{}
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, httptestRequest(http.MethodGet, "/about"), nil, views)

	result, err := renderSiteTemplateResponseCaptured(ctx, siteTemplateResponse{
		TemplateNames: []string{"site/page"},
		ViewContext: router.ViewContext{
			"record": map[string]any{"id": "about"},
		},
	}, RenderCachePolicy{Enabled: true})
	if err != nil {
		t.Fatalf("router capture failed: %v", err)
	}
	if result.TemplateName != "site/page" {
		t.Fatalf("expected captured template site/page, got %q", result.TemplateName)
	}
	if got := string(result.Rendered.Body); got != "template=site/page;record=about" {
		t.Fatalf("expected captured body from router renderer, got %q", got)
	}
	if got := result.Rendered.ContentType; got != "text/html; charset=utf-8" {
		t.Fatalf("expected default html content type, got %q", got)
	}
	if body := rec.Body.String(); body != "" {
		t.Fatalf("expected capture not to commit live HTTPRouter body, got %q", body)
	}
	if views.calls != 1 {
		t.Fatalf("expected one view render call, got %d", views.calls)
	}
}

func TestRenderCacheRouterCaptureFiberWithoutOverride(t *testing.T) {
	views := &testRenderCacheViews{}
	var result renderedSiteTemplateResult
	var captureErr error
	app := fiber.New(fiber.Config{Views: views})
	app.Get("/about", func(fc *fiber.Ctx) error {
		ctx := router.NewFiberContext(fc, nil)
		result, captureErr = renderSiteTemplateResponseCaptured(ctx, siteTemplateResponse{
			TemplateNames: []string{"site/page"},
			ViewContext: router.ViewContext{
				"record": map[string]any{"id": "about"},
			},
		}, RenderCachePolicy{Enabled: true})
		return fc.SendStatus(http.StatusNoContent)
	})
	resp, err := app.Test(httptestRequest(http.MethodGet, "/about"))
	if err != nil {
		t.Fatalf("fiber request failed: %v", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Errorf("closing response body: %v", closeErr)
		}
	}()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected no-content live response after capture, got %d", resp.StatusCode)
	}
	if captureErr != nil {
		t.Fatalf("fiber capture failed: %v", captureErr)
	}
	if got := string(result.Rendered.Body); got != "template=site/page;record=about" {
		t.Fatalf("expected captured body from fiber renderer, got %q", got)
	}
	if views.calls != 1 {
		t.Fatalf("expected one view render call, got %d", views.calls)
	}
}

func TestRenderCacheExplicitRendererOverrideTakesPrecedence(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.RenderBodyM = "router-render"
	override := &testRenderCacheRenderer{}

	result, err := renderSiteTemplateResponseCaptured(ctx, siteTemplateResponse{
		TemplateNames: []string{"site/page"},
		ViewContext: router.ViewContext{
			"record": map[string]any{"id": "about"},
		},
	}, RenderCachePolicy{
		Enabled:          true,
		TemplateRenderer: override,
	})
	if err != nil {
		t.Fatalf("override capture failed: %v", err)
	}
	if override.calls != 1 {
		t.Fatalf("expected explicit override to render once, got %d", override.calls)
	}
	if got := string(result.Rendered.Body); got != "template=site/page;record=about" {
		t.Fatalf("expected override body, got %q", got)
	}
	if body := ctx.ResponseBodyM; body != "" {
		t.Fatalf("expected explicit capture not to commit live body, got %q", body)
	}
}

func TestRenderCacheRouterCaptureUnsupportedCapabilityBypassesStorage(t *testing.T) {
	_, err := renderSiteTemplateResponseCaptured(nil, siteTemplateResponse{
		TemplateNames: []string{"site/page"},
	}, RenderCachePolicy{Enabled: true})
	var captureErr renderCacheCaptureError
	if !errors.As(err, &captureErr) {
		t.Fatalf("expected capture error, got %v", err)
	}
	if captureErr.Reason != renderCacheReasonUnsupportedRenderer {
		t.Fatalf("expected unsupported renderer reason, got %q", captureErr.Reason)
	}
}

func TestRenderCacheRouterCaptureOversizedBypassesWithoutPartialCommit(t *testing.T) {
	views := &testRenderCacheViews{body: strings.Repeat("x", 16)}
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, httptestRequest(http.MethodGet, "/about"), nil, views)
	_, err := renderSiteTemplateResponseCaptured(ctx, siteTemplateResponse{
		TemplateNames: []string{"site/page"},
	}, RenderCachePolicy{Enabled: true, MaxCaptureBodySize: 4})
	var captureErr renderCacheCaptureError
	if !errors.As(err, &captureErr) {
		t.Fatalf("expected capture error, got %v", err)
	}
	if captureErr.Reason != renderCacheReasonOversizedCapture {
		t.Fatalf("expected oversized capture reason, got %q", captureErr.Reason)
	}
	if body := rec.Body.String(); body != "" {
		t.Fatalf("expected oversized capture not to commit partial live body, got %q", body)
	}
}

func TestRenderCacheRouterCaptureStreamFailureReason(t *testing.T) {
	views := &testRenderCacheViews{err: router.ErrResponseCaptureStream}
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, httptestRequest(http.MethodGet, "/about"), nil, views)
	_, err := renderSiteTemplateResponseCaptured(ctx, siteTemplateResponse{
		TemplateNames: []string{"site/page"},
	}, RenderCachePolicy{Enabled: true})
	var captureErr renderCacheCaptureError
	if !errors.As(err, &captureErr) {
		t.Fatalf("expected capture error, got %v", err)
	}
	if captureErr.Reason != renderCacheReasonStreamCapture {
		t.Fatalf("expected stream capture reason, got %q", captureErr.Reason)
	}
}

func TestRenderCacheRejectsUnsafeCapturedHeaders(t *testing.T) {
	store := newTestRenderCacheStore()
	renderer := &testRenderCacheRenderer{headers: map[string][]string{"Set-Cookie": {"sid=1"}}}
	services := newRenderCacheDeliveryServices(t)
	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(
		server.Router(),
		nil,
		admin.Config{DefaultLocale: "en"},
		SiteConfig{Features: SiteFeatures{EnableI18N: new(false)}},
		WithDeliveryServices(services, services),
		WithRenderCache(store, RenderCachePolicy{
			Enabled:          true,
			FreshTTL:         time.Minute,
			DebugHeaders:     true,
			TemplateRenderer: renderer,
		}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}
	rec := performSiteRequestRaw(t, server, "/about", "text/html")
	if rec.Code != http.StatusOK {
		t.Fatalf("request status=%d body=%s", rec.Code, rec.Body.String())
	}
	headers := rec.Result().Header
	if got := headers.Get("X-Site-Render-Cache"); got != renderCacheStatusBypass {
		t.Fatalf("expected unsafe header bypass, got %q headers=%v", got, headers)
	}
	if got := headers.Get("X-Site-Render-Cache-Reason"); got != "unsafe_header" {
		t.Fatalf("expected unsafe_header reason, got %q headers=%v", got, headers)
	}
	if len(store.items) != 0 {
		t.Fatalf("expected unsafe response not to be stored, got %d items", len(store.items))
	}
}

func TestRenderCacheRenderErrorsBypassStorage(t *testing.T) {
	store := newTestRenderCacheStore()
	services := newRenderCacheDeliveryServices(t)
	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(
		server.Router(),
		nil,
		admin.Config{DefaultLocale: "en"},
		SiteConfig{Features: SiteFeatures{EnableI18N: new(false)}},
		WithDeliveryServices(services, services),
		WithRenderCache(store, RenderCachePolicy{
			Enabled:          true,
			FreshTTL:         time.Minute,
			DebugHeaders:     true,
			TemplateRenderer: &testRenderCacheRenderer{err: errors.New("render failed")},
		}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}
	rec := performSiteRequestRaw(t, server, "/about", "text/html")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("request status=%d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusBypass {
		t.Fatalf("expected render-error bypass, got %q headers=%v", got, rec.Header())
	}
	if got := rec.Header().Get("X-Site-Render-Cache-Reason"); got != renderCacheReasonRenderError {
		t.Fatalf("expected render_error reason, got %q headers=%v", got, rec.Header())
	}
	if len(store.items) != 0 {
		t.Fatalf("expected render error not to be stored, got %d items", len(store.items))
	}
}

func TestRenderCacheBackendErrorsAreObservable(t *testing.T) {
	tests := []struct {
		name       string
		failClosed bool
		wantStatus int
	}{
		{name: "fail open", wantStatus: http.StatusInternalServerError},
		{name: "fail closed", failClosed: true, wantStatus: http.StatusServiceUnavailable},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newTestRenderCacheStore()
			store.err = errors.New("cache unavailable")
			services := newRenderCacheDeliveryServices(t)
			server := router.NewHTTPServer()
			if err := RegisterSiteRoutes(
				server.Router(),
				nil,
				admin.Config{DefaultLocale: "en"},
				SiteConfig{Features: SiteFeatures{EnableI18N: new(false)}},
				WithDeliveryServices(services, services),
				WithRenderCache(store, RenderCachePolicy{
					Enabled:          true,
					FreshTTL:         time.Minute,
					DebugHeaders:     true,
					FailClosed:       tt.failClosed,
					TemplateRenderer: &testRenderCacheRenderer{},
				}),
			); err != nil {
				t.Fatalf("register site routes: %v", err)
			}
			rec := performSiteRequestRaw(t, server, "/about", "text/html")
			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d body=%s", tt.wantStatus, rec.Code, rec.Body.String())
			}
			if got := rec.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusBypass {
				t.Fatalf("expected bypass, got %q headers=%v", got, rec.Header())
			}
			if got := rec.Header().Get("X-Site-Render-Cache-Reason"); got != renderCacheReasonCacheReadError {
				t.Fatalf("expected cache_read_error, got %q headers=%v", got, rec.Header())
			}
		})
	}
}

func TestRenderCacheWriteErrorsAreObservableBeforeCommit(t *testing.T) {
	tests := []struct {
		name       string
		failClosed bool
		wantStatus int
		wantBody   bool
	}{
		{name: "fail open", wantStatus: http.StatusOK, wantBody: true},
		{name: "fail closed", failClosed: true, wantStatus: http.StatusServiceUnavailable},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newTestRenderCacheStore()
			store.setErr = errors.New("cache write failed")
			renderer := &testRenderCacheRenderer{}
			services := newRenderCacheDeliveryServices(t)
			server := router.NewHTTPServer()
			if err := RegisterSiteRoutes(
				server.Router(),
				nil,
				admin.Config{DefaultLocale: "en"},
				SiteConfig{Features: SiteFeatures{EnableI18N: new(false)}},
				WithDeliveryServices(services, services),
				WithRenderCache(store, RenderCachePolicy{
					Enabled:          true,
					FreshTTL:         time.Minute,
					DebugHeaders:     true,
					FailClosed:       tt.failClosed,
					TemplateRenderer: renderer,
				}),
			); err != nil {
				t.Fatalf("register site routes: %v", err)
			}
			rec := performSiteRequestRaw(t, server, "/about", "text/html")
			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d body=%s", tt.wantStatus, rec.Code, rec.Body.String())
			}
			if renderer.calls == 0 {
				t.Fatal("expected cache miss to render before Set failure")
			}
			headers := rec.Result().Header
			if got := headers.Get("X-Site-Render-Cache"); got != renderCacheStatusBypass {
				t.Fatalf("expected write-error bypass, got %q headers=%v", got, headers)
			}
			if got := headers.Get("X-Site-Render-Cache-Reason"); got != renderCacheReasonCacheWriteError {
				t.Fatalf("expected cache_write_error reason, got %q headers=%v", got, headers)
			}
			if tt.wantBody && !strings.Contains(rec.Body.String(), "record=about") {
				t.Fatalf("expected fail-open response body, got %q", rec.Body.String())
			}
			if !tt.wantBody && strings.Contains(rec.Body.String(), "record=about") {
				t.Fatalf("did not expect fail-closed page body, got %q", rec.Body.String())
			}
			if len(store.items) != 0 {
				t.Fatalf("expected failed Set not to store items, got %d", len(store.items))
			}
		})
	}
}

func TestRenderCacheCanonicalRedirectBypassesStorage(t *testing.T) {
	store := newTestRenderCacheStore()
	content := admin.NewInMemoryContentService()
	if _, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:     "post-type",
		Name:   "Post",
		Slug:   "post",
		Status: "published",
		Schema: map[string]any{"type": "object"},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "detail",
				"routes": map[string]any{
					"detail": "/posts/:slug",
				},
			},
		},
	}); err != nil {
		t.Fatalf("create content type: %v", err)
	}
	if _, err := content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "post-en",
		Title:           "Welcome",
		Slug:            "welcome",
		Locale:          "en",
		Status:          "published",
		ContentType:     "post",
		ContentTypeSlug: "post",
		Data:            map[string]any{"path": "/posts/welcome"},
	}); err != nil {
		t.Fatalf("create content: %v", err)
	}
	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(
		server.Router(),
		nil,
		admin.Config{DefaultLocale: "en"},
		SiteConfig{SupportedLocales: []string{"en", "es"}},
		WithDeliveryServices(content, content),
		WithRenderCache(store, RenderCachePolicy{
			Enabled:          true,
			FreshTTL:         time.Minute,
			DebugHeaders:     true,
			TemplateRenderer: &testRenderCacheRenderer{},
		}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}
	req := httptestRequest(http.MethodGet, "/es/posts/welcome")
	req.Header.Set("Accept", "text/html")
	req.AddCookie(&http.Cookie{Name: defaultLocaleCookieName, Value: "es"})
	rec := performRawRequest(t, server, req)
	if rec.Code != http.StatusPermanentRedirect {
		t.Fatalf("expected canonical redirect status, got %d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusBypass {
		t.Fatalf("expected canonical redirect bypass, got %q headers=%v", got, rec.Header())
	}
	if got := rec.Header().Get("X-Site-Render-Cache-Reason"); got != renderCacheReasonCanonicalRedirect {
		t.Fatalf("expected canonical_redirect reason, got %q headers=%v", got, rec.Header())
	}
	if len(store.items) != 0 {
		t.Fatalf("expected canonical redirect not to be stored, got %d items", len(store.items))
	}
}

func TestRenderCacheBypassesLocaleCookieMutation(t *testing.T) {
	store := newTestRenderCacheStore()
	services := newRenderCacheDeliveryServices(t)
	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(
		server.Router(),
		nil,
		admin.Config{DefaultLocale: "en"},
		SiteConfig{SupportedLocales: []string{"en", "es"}},
		WithDeliveryServices(services, services),
		WithRenderCache(store, RenderCachePolicy{
			Enabled:          true,
			FreshTTL:         time.Minute,
			DebugHeaders:     true,
			TemplateRenderer: &testRenderCacheRenderer{},
		}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}
	rec := performSiteRequestRaw(t, server, "/about?locale=es", "text/html")
	if got := rec.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusBypass {
		t.Fatalf("expected locale cookie mutation bypass, got %q headers=%v", got, rec.Header())
	}
	if got := rec.Header().Get("X-Site-Render-Cache-Reason"); got != renderCacheReasonLocaleCookieMutation {
		t.Fatalf("expected locale cookie mutation reason, got %q headers=%v", got, rec.Header())
	}
}

func TestRenderCacheRuntimeKeyVariesByRequestEnvironment(t *testing.T) {
	store := newTestRenderCacheStore()
	renderer := &testRenderCacheRenderer{}
	services := newRenderCacheDeliveryServices(t)
	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(
		server.Router(),
		nil,
		admin.Config{DefaultLocale: "en"},
		SiteConfig{Features: SiteFeatures{EnableI18N: new(false)}},
		WithDeliveryServices(services, services),
		WithRenderCache(store, RenderCachePolicy{
			Enabled:          true,
			FreshTTL:         time.Minute,
			DebugHeaders:     true,
			DebugKeys:        true,
			TemplateRenderer: renderer,
		}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}

	staging := performSiteRequestRaw(t, server, "/about?runtime_env=staging", "text/html")
	if got := staging.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusMiss {
		t.Fatalf("expected staging miss, got %q headers=%v", got, staging.Header())
	}
	stagingKey := staging.Header().Get("X-Site-Render-Cache-Key")
	if !strings.Contains(stagingKey, "env=staging") {
		t.Fatalf("expected staging key to include env=staging, got %q", stagingKey)
	}

	prod := performSiteRequestRaw(t, server, "/about?runtime_env=prod", "text/html")
	if got := prod.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusMiss {
		t.Fatalf("expected prod miss, got %q headers=%v", got, prod.Header())
	}
	prodKey := prod.Header().Get("X-Site-Render-Cache-Key")
	if !strings.Contains(prodKey, "env=prod") {
		t.Fatalf("expected prod key to include env=prod, got %q", prodKey)
	}
	if prodKey == stagingKey {
		t.Fatalf("expected request-derived environment to vary cache keys, both were %q", prodKey)
	}

	stagingAgain := performSiteRequestRaw(t, server, "/about?runtime_env=staging", "text/html")
	if got := stagingAgain.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusHit {
		t.Fatalf("expected staging repeat hit, got %q headers=%v", got, stagingAgain.Header())
	}
	if renderer.calls != 2 {
		t.Fatalf("expected two renders for two environment keys, got %d", renderer.calls)
	}
	if len(store.items) != 2 {
		t.Fatalf("expected two cached environment variants, got %d", len(store.items))
	}
}

func TestRenderCacheHeadHitReplaysHeadersWithoutBody(t *testing.T) {
	store := newTestRenderCacheStore()
	services := newRenderCacheDeliveryServices(t)
	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(
		server.Router(),
		nil,
		admin.Config{DefaultLocale: "en"},
		SiteConfig{Features: SiteFeatures{EnableI18N: new(false)}},
		WithDeliveryServices(services, services),
		WithRenderCache(store, RenderCachePolicy{
			Enabled:          true,
			FreshTTL:         time.Minute,
			DebugHeaders:     true,
			TemplateRenderer: &testRenderCacheRenderer{headers: map[string][]string{"ETag": {"abc"}}},
		}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}
	first := performSiteRequestRaw(t, server, "/about", "text/html")
	if first.Code != http.StatusOK {
		t.Fatalf("first request status=%d body=%s", first.Code, first.Body.String())
	}
	req := httptestRequest(http.MethodHead, "/about")
	req.Header.Set("Accept", "text/html")
	head := performRawRequest(t, server, req)
	if head.Code != http.StatusOK {
		t.Fatalf("head request status=%d body=%s", head.Code, head.Body.String())
	}
	if got := head.Header().Get("X-Site-Render-Cache"); got != renderCacheStatusHit {
		t.Fatalf("expected HEAD cache hit, got %q headers=%v", got, head.Header())
	}
	if body := head.Body.String(); body != "" {
		t.Fatalf("expected HEAD hit to omit body, got %q", body)
	}
	if got := head.Header().Get("ETag"); got != "abc" {
		t.Fatalf("expected replayed ETag abc, got %q headers=%v", got, head.Header())
	}
}

func TestRenderCacheDebugKeyHeaderRequiresExplicitOptIn(t *testing.T) {
	store := newTestRenderCacheStore()
	services := newRenderCacheDeliveryServices(t)
	server := router.NewHTTPServer()
	if err := RegisterSiteRoutes(
		server.Router(),
		nil,
		admin.Config{DefaultLocale: "en"},
		SiteConfig{Features: SiteFeatures{EnableI18N: new(false)}},
		WithDeliveryServices(services, services),
		WithRenderCache(store, RenderCachePolicy{
			Enabled:          true,
			FreshTTL:         time.Minute,
			DebugHeaders:     true,
			DebugKeys:        true,
			TemplateRenderer: &testRenderCacheRenderer{},
		}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}
	rec := performSiteRequestRaw(t, server, "/about", "text/html")
	if rec.Code != http.StatusOK {
		t.Fatalf("request status=%d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("X-Site-Render-Cache-Key"); got == "" {
		t.Fatalf("expected explicit debug key header, headers=%v", rec.Header())
	}
}

func TestRenderCacheKeyVariesByStateDimensions(t *testing.T) {
	policy := normalizeRenderCachePolicy(RenderCachePolicy{
		Enabled:              true,
		ApplicationNamespace: "app",
		EnvironmentNamespace: "staging",
		SiteNamespace:        "public",
		RenderVersion:        "42",
		TemplateRenderer:     &testRenderCacheRenderer{},
		CacheableMethods:     []string{http.MethodGet},
		CacheableStatuses:    []int{http.StatusOK},
		HeaderAllowlist:      []string{"Content-Type"},
		QueryAllowlist:       []string{"page"},
		FreshTTL:             time.Minute,
	})
	base := renderCacheKeyInput{
		Policy:      policy,
		RequestPath: "/about",
		State: RequestState{
			Locale:         "en",
			Environment:    "staging",
			ContentChannel: "default",
			ThemeName:      "docs",
			ThemeVariant:   "light",
		},
	}
	key := buildRenderCacheKey(base)
	variants := []renderCacheKeyInput{base, base, base, base, base}
	variants[0].State.Locale = "es"
	variants[1].State.ThemeVariant = "dark"
	variants[2].State.ContentChannel = "preview"
	variants[3].RequestPath = "/contact"
	variants[4].Policy.RenderVersion = "43"
	for _, variant := range variants {
		if got := buildRenderCacheKey(variant); got == key {
			t.Fatalf("expected key variation from %+v, got same key %q", variant, got)
		}
	}
}

type testRenderCacheStore struct {
	items     map[string]RenderedSiteResponse
	tagsByKey map[string][]string
	err       error
	setErr    error
}

func newTestRenderCacheStore() *testRenderCacheStore {
	return &testRenderCacheStore{
		items:     map[string]RenderedSiteResponse{},
		tagsByKey: map[string][]string{},
	}
}

func (s *testRenderCacheStore) Get(_ context.Context, key string) (RenderedSiteResponse, bool, error) {
	if s.err != nil {
		return RenderedSiteResponse{}, false, s.err
	}
	item, ok := s.items[key]
	return item, ok, nil
}

func (s *testRenderCacheStore) Set(_ context.Context, key string, value RenderedSiteResponse, _ time.Duration) error {
	if s.setErr != nil {
		return s.setErr
	}
	if s.err != nil {
		return s.err
	}
	s.items[key] = value
	return nil
}

func (s *testRenderCacheStore) Delete(_ context.Context, key string) error {
	delete(s.items, key)
	return nil
}

func (s *testRenderCacheStore) AddTagsForKey(_ context.Context, key string, tags []string) error {
	s.tagsByKey[key] = cloneStrings(tags)
	return nil
}

func (s *testRenderCacheStore) InvalidateTags(_ context.Context, tags []string) error {
	wanted := map[string]bool{}
	for _, tag := range tags {
		wanted[tag] = true
	}
	for key, existing := range s.tagsByKey {
		for _, tag := range existing {
			if wanted[tag] {
				delete(s.items, key)
				delete(s.tagsByKey, key)
				break
			}
		}
	}
	return nil
}

type testRenderCacheRenderer struct {
	calls   int
	headers map[string][]string
	err     error
}

func (r *testRenderCacheRenderer) RenderSiteTemplate(_ context.Context, templateName string, viewCtx router.ViewContext) (RenderedTemplate, error) {
	r.calls++
	if r.err != nil {
		return RenderedTemplate{}, r.err
	}
	record := anyMap(viewCtx["record"])
	body := "template=" + templateName + ";record=" + anyString(record["id"])
	return RenderedTemplate{
		ContentType: "text/html; charset=utf-8",
		Headers:     cloneHeaderMap(r.headers),
		Body:        []byte(body),
	}, nil
}

type testRenderCacheViews struct {
	calls int
	body  string
	err   error
}

func (v *testRenderCacheViews) Load() error {
	return nil
}

func (v *testRenderCacheViews) Render(w io.Writer, name string, bind any, _ ...string) error {
	v.calls++
	if v.err != nil {
		return v.err
	}
	viewCtx := anyMap(bind)
	record := anyMap(viewCtx["record"])
	body := v.body
	if body == "" {
		body = "template=" + name + ";record=" + anyString(record["id"])
	}
	_, err := io.WriteString(w, body)
	return err
}

type renderCacheDeliveryServices struct {
	admin.CMSContentService
	admin.CMSContentTypeService
	contentsCalls     int
	contentTypesCalls int
}

func newRenderCacheDeliveryServices(t *testing.T) *renderCacheDeliveryServices {
	t.Helper()
	content := admin.NewInMemoryContentService()
	if _, err := content.CreateContentType(t.Context(), admin.CMSContentType{
		ID:     "page-type",
		Name:   "Page",
		Slug:   "page",
		Status: "published",
		Schema: map[string]any{"type": "object"},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "page",
				"templates": map[string]any{
					"detail": "site/page",
				},
			},
		},
	}); err != nil {
		t.Fatalf("create content type: %v", err)
	}
	if _, err := content.CreateContent(t.Context(), admin.CMSContent{
		ID:              "about",
		Title:           "About",
		Slug:            "about",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data:            map[string]any{"path": "/about"},
	}); err != nil {
		t.Fatalf("create content: %v", err)
	}
	return &renderCacheDeliveryServices{CMSContentService: content, CMSContentTypeService: content}
}

func (s *renderCacheDeliveryServices) Contents(ctx context.Context, locale string) ([]admin.CMSContent, error) {
	s.contentsCalls++
	return s.CMSContentService.Contents(ctx, locale)
}

func (s *renderCacheDeliveryServices) ContentTypes(ctx context.Context) ([]admin.CMSContentType, error) {
	s.contentTypesCalls++
	return s.CMSContentTypeService.ContentTypes(ctx)
}

func cloneHeaderMap(input map[string][]string) map[string][]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string][]string, len(input))
	for key, values := range input {
		out[key] = append([]string{}, values...)
	}
	return out
}

func assertStringContains(t *testing.T, values []string, want string) {
	t.Helper()
	if slices.Contains(values, want) {
		return
	}
	t.Fatalf("expected %q in %v", want, values)
}

func httptestRequest(method, path string) *http.Request {
	req, err := http.NewRequestWithContext(context.Background(), method, path, nil)
	if err != nil {
		panic(err)
	}
	return req
}

func performRawRequest[T interface {
	ServeHTTP(http.ResponseWriter, *http.Request)
}](t *testing.T, server router.Server[T], req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rec, req)
	return rec
}
