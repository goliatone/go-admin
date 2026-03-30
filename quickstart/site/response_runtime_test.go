package site

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSiteTemplateResponsePayloadIncludesTemplateAndClonedContext(t *testing.T) {
	viewCtx := router.ViewContext{"theme": "admin"}
	payload := siteTemplateResponsePayload("site/search", viewCtx, map[string]any{"mode": "detail"})
	if got := anyString(payload["template"]); got != "site/search" {
		t.Fatalf("expected template site/search, got %q", got)
	}
	if got := anyString(payload["mode"]); got != "detail" {
		t.Fatalf("expected mode detail, got %q", got)
	}
	contextMap, ok := payload["context"].(router.ViewContext)
	if !ok {
		if typed, fallbackOK := payload["context"].(map[string]any); fallbackOK {
			contextMap = router.ViewContext(typed)
		} else {
			t.Fatalf("expected context payload, got %#v", payload["context"])
		}
	}
	contextMap["theme"] = "mutated"
	if got := anyString(viewCtx["theme"]); got != "admin" {
		t.Fatalf("expected original view context unchanged, got %q", got)
	}
}

func TestRenderSiteTemplateResponseJSONAndHTMLFallback(t *testing.T) {
	server := router.NewHTTPServer()
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{})
	server.Router().Get("/json", func(c router.Context) error {
		return renderSiteTemplateResponse(c, RequestState{}, cfg, siteTemplateResponse{
			JSONStatus:    201,
			TemplateNames: []string{"site/search"},
			JSONPayload: siteTemplateResponsePayload("site/search", router.ViewContext{
				"ok": true,
			}, map[string]any{"mode": "detail"}),
			ViewContext: router.ViewContext{"ok": true},
			FallbackError: SiteRuntimeError{
				Status: 500,
			},
		})
	})
	server.Router().Get("/html-fallback", func(c router.Context) error {
		return renderSiteTemplateResponse(c, RequestState{}, cfg, siteTemplateResponse{
			TemplateStatus: 502,
			TemplateNames:  []string{"site/does-not-exist"},
			ViewContext:    router.ViewContext{"search_state": map[string]any{}},
			FallbackError: SiteRuntimeError{
				Code:    searchUnavailableErrorCode,
				Status:  502,
				Message: "search service unavailable",
			},
		})
	})

	jsonReq := httptest.NewRequest(http.MethodGet, "/json", nil)
	jsonReq.Header.Set("Accept", "application/json")
	jsonRec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(jsonRec, jsonReq)
	if jsonRec.Code != 201 {
		t.Fatalf("expected JSON status 201, got %d body=%s", jsonRec.Code, jsonRec.Body.String())
	}
	jsonPayload := decodeSitePayload(t, "/json", jsonRec)
	if got := nestedString(jsonPayload, "template"); got != "site/search" {
		t.Fatalf("expected JSON template site/search, got %q", got)
	}
	if got := anyBool(nestedAny(jsonPayload, "context", "ok")); !got {
		t.Fatalf("expected JSON context ok=true, got %+v", jsonPayload)
	}

	htmlReq := httptest.NewRequest(http.MethodGet, "/html-fallback", nil)
	htmlRec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(htmlRec, htmlReq)
	if htmlRec.Code != 502 {
		t.Fatalf("expected HTML fallback status 502, got %d body=%s", htmlRec.Code, htmlRec.Body.String())
	}
}
