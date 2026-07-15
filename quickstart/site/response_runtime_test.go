package site

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
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

func TestRenderSiteTemplateResponseReportsSelectedTemplateProvenance(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{})
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/provenance", nil)
	req.Header.Set("Accept", "text/html")
	req.Header.Set(DeliveryProvenanceRequestHeader, "1")
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, req, nil, &siteResponseViews{successfulTemplate: "site/selected"})
	if err := renderSiteTemplateResponse(ctx, RequestState{}, cfg, siteTemplateResponse{
		TemplateNames: []string{"site/missing", "site/selected"},
		ViewContext:   router.ViewContext{},
		FallbackError: SiteRuntimeError{Status: 500},
		Provenance: DeliveryProvenance{
			RouteFamily:       "guide",
			Mode:              "collection",
			RequestedTemplate: "site/missing",
		},
	}); err != nil {
		t.Fatalf("render response: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected success, got %d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get(deliveryProvenanceSelectedTemplateHeader); got != "site/selected" {
		t.Fatalf("selected template header=%q", got)
	}
	if got := rec.Header().Get(deliveryProvenanceFallbackHeader); got != "true" {
		t.Fatalf("fallback header=%q", got)
	}
	var attempts []DeliveryTemplateAttempt
	if err := json.Unmarshal([]byte(rec.Header().Get(deliveryProvenanceTemplateAttemptsHeader)), &attempts); err != nil {
		t.Fatalf("decode attempts: %v", err)
	}
	if len(attempts) != 2 || attempts[0].Outcome != "failed" || attempts[1].Outcome != "selected" {
		t.Fatalf("unexpected attempts: %+v", attempts)
	}
}

func TestSiteTemplateRenderFailurePreservesStructuredCause(t *testing.T) {
	cause := errors.New("template syntax error")
	siteErr := siteTemplateRenderFailure(SiteRuntimeError{}, DeliveryProvenance{
		RouteFamily:       "guide",
		Mode:              "collection",
		RequestedTemplate: "site/guides/list",
		TemplateAttempts: []DeliveryTemplateAttempt{{
			Template: "site/guides/list",
			Outcome:  "failed",
		}},
	}, cause)
	if siteErr.Code != "public_template_render_failed" || siteErr.Status != http.StatusInternalServerError {
		t.Fatalf("unexpected site error: %+v", siteErr)
	}
	if !errors.Is(siteErr, cause) {
		t.Fatalf("expected wrapped cause compatibility, got %v", siteErr)
	}
	var structured *goerrors.Error
	if !errors.As(siteErr, &structured) || structured.TextCode != "PUBLIC_TEMPLATE_RENDER_FAILED" {
		t.Fatalf("expected structured template error, got %#v", structured)
	}
}

type siteResponseViews struct {
	successfulTemplate string
}

func (v *siteResponseViews) Load() error { return nil }

func (v *siteResponseViews) Render(out io.Writer, name string, _ any, _ ...string) error {
	if name != v.successfulTemplate {
		return errors.New("template not found")
	}
	_, err := out.Write([]byte("rendered"))
	return err
}

func TestSiteTemplateResponsePayloadPrefersExplicitResponseTemplateAlias(t *testing.T) {
	viewCtx := router.ViewContext{
		"site_response_template": "site/page",
		"site_content": map[string]any{
			"template_candidates": []string{"site/home/page", "site/page"},
		},
	}
	payload := siteTemplateResponsePayload("site/home/page", viewCtx, nil)
	if got := anyString(payload["template"]); got != "site/page" {
		t.Fatalf("expected response template alias site/page, got %q", got)
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

	jsonReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/json", nil)
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

	htmlReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/html-fallback", nil)
	htmlRec := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(htmlRec, htmlReq)
	if htmlRec.Code != 502 {
		t.Fatalf("expected HTML fallback status 502, got %d body=%s", htmlRec.Code, htmlRec.Body.String())
	}
}
