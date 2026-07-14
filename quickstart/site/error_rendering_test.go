package site

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type errorRenderTestViews struct {
	calls []string
}

type candidateIsolationTestViews struct{}

func (*candidateIsolationTestViews) Load() error { return nil }
func (*candidateIsolationTestViews) Render(w io.Writer, name string, bind any, _ ...string) error {
	host := anyMap(anyMap(bind)["host"])
	items, ok := host["items"].([]any)
	if !ok || len(items) == 0 {
		return errors.New("host items missing")
	}
	item := anyMap(items[0])
	switch name {
	case "site/error/mutating-failure":
		item["label"] = "failed-candidate-mutation"
		if _, err := io.WriteString(w, "LEAKED-MUTATION"); err != nil {
			return err
		}
		return errors.New("candidate failed after mutating its view")
	case "site/error/isolated-success":
		_, err := io.WriteString(w, anyString(item["label"]))
		return err
	default:
		return errors.New("template not found")
	}
}

func (v *errorRenderTestViews) Load() error { return nil }
func (v *errorRenderTestViews) Render(w io.Writer, name string, bind any, _ ...string) error {
	v.calls = append(v.calls, name)
	switch name {
	case "site/error/partial":
		if _, err := io.WriteString(w, "LEAKED-PARTIAL"); err != nil {
			return err
		}
		return errors.New("nested include failed")
	case "site/error/success":
		model := anyMap(anyMap(bind)["site_error"])
		_, err := io.WriteString(w, "selected:"+anyString(model["code"]))
		return err
	default:
		return errors.New("template not found")
	}
}

func atomicErrorRenderConfig(modules ...SiteModule) ResolvedSiteConfig {
	return ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "bo"},
		Modules:          modules,
		Views: SiteViewConfig{ErrorPolicy: SiteErrorTemplatePolicy{
			ByStatus: map[int][]SiteTemplateRef{404: {
				{Template: "site/error/partial"},
				{Template: "site/error/success"},
			}},
		}},
	})
}

func TestRenderSiteErrorHTMLHTTPRouterAtomicFallbackAndDiagnostics(t *testing.T) {
	observer := &errorContextTestModule{id: "observer"}
	cfg := atomicErrorRenderConfig(observer)
	views := &errorRenderTestViews{}
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/missing", nil), nil, views)

	result, err := RenderSiteErrorHTML(ctx, cfg, SiteErrorRenderRequest{
		Error: SiteRuntimeError{Code: " Not_Found ", Status: http.StatusNotFound},
		State: RequestState{Locale: "bo", ViewContext: router.ViewContext{
			"safe_host_field": "value",
		}},
	})
	if err != nil {
		t.Fatalf("render site error: %v", err)
	}
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status=%d body=%q", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "selected:not_found" || strings.Contains(got, "LEAKED") {
		t.Fatalf("atomic fallback committed unexpected body %q", got)
	}
	if result.Template != "site/error/success" || result.Source != "status" || result.Attempts != 2 {
		t.Fatalf("unexpected render result: %#v", result)
	}
	if len(observer.observed) != 2 || observer.observed[0].Outcome != "failed" || observer.observed[1].Outcome != "selected" {
		t.Fatalf("unexpected observer events: %#v", observer.observed)
	}
	if !observer.observed[1].IsFallback {
		t.Fatalf("second selected candidate should be marked as fallback: %#v", observer.observed[1])
	}
	if strings.Contains(rec.Body.String(), "site/error") || strings.Contains(rec.Body.String(), "status") {
		t.Fatalf("diagnostic provenance leaked into visitor body: %q", rec.Body.String())
	}
}

func TestRenderSiteErrorHTMLAllFailuresSendStatusWithoutBody(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{
			ErrorTemplate:          "site/error/missing",
			ErrorTemplatesByStatus: map[int]string{404: "site/error/also-missing"},
		},
	})
	views := &errorRenderTestViews{}
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/missing", nil), nil, views)

	result, err := RenderSiteErrorHTML(ctx, cfg, SiteErrorRenderRequest{Error: SiteRuntimeError{Status: 404}})
	if err != nil {
		t.Fatalf("render all failures: %v", err)
	}
	if rec.Code != http.StatusNotFound || rec.Body.Len() != 0 {
		t.Fatalf("all failures should return status only: status=%d body=%q", rec.Code, rec.Body.String())
	}
	if result.Template != "" || result.Attempts == 0 {
		t.Fatalf("unexpected all-failure result: %#v", result)
	}
}

func TestRenderSiteErrorHTMLHeadSuppressesBody(t *testing.T) {
	cfg := atomicErrorRenderConfig()
	views := &errorRenderTestViews{}
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, httptest.NewRequestWithContext(context.Background(), http.MethodHead, "/missing", nil), nil, views)

	result, err := RenderSiteErrorHTML(ctx, cfg, SiteErrorRenderRequest{Error: SiteRuntimeError{Status: 404}})
	if err != nil {
		t.Fatalf("render HEAD error: %v", err)
	}
	if rec.Code != http.StatusNotFound || rec.Body.Len() != 0 || result.Template != "site/error/success" {
		t.Fatalf("unexpected HEAD response: status=%d body=%q result=%#v", rec.Code, rec.Body.String(), result)
	}
}

func TestRenderSiteErrorHTMLFiberAtomicFallback(t *testing.T) {
	cfg := atomicErrorRenderConfig()
	views := &errorRenderTestViews{}
	app := fiber.New(fiber.Config{Views: views})
	var result SiteErrorRenderResult
	var renderErr error
	app.Get("/missing", func(fc *fiber.Ctx) error {
		result, renderErr = RenderSiteErrorHTML(router.NewFiberContext(fc, nil), cfg, SiteErrorRenderRequest{
			Error: SiteRuntimeError{Code: "not_found", Status: 404},
		})
		return renderErr
	})

	resp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/missing", nil))
	if err != nil {
		t.Fatalf("fiber request: %v", err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Errorf("close response body: %v", closeErr)
		}
	}()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read fiber body: %v", err)
	}
	if renderErr != nil || resp.StatusCode != http.StatusNotFound || string(body) != "selected:not_found" || result.Attempts != 2 {
		t.Fatalf("unexpected fiber response: status=%d body=%q result=%#v err=%v", resp.StatusCode, body, result, renderErr)
	}
}

func TestRenderSiteErrorHTMLIsolatesMutableContextBetweenCandidates(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		Views: SiteViewConfig{ErrorPolicy: SiteErrorTemplatePolicy{
			ByStatus: map[int][]SiteTemplateRef{404: {
				{Template: "site/error/mutating-failure"},
				{Template: "site/error/isolated-success"},
			}},
		}},
	})
	baseItem := map[string]any{"label": "original"}
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/missing", nil), nil, &candidateIsolationTestViews{})

	result, err := RenderSiteErrorHTML(ctx, cfg, SiteErrorRenderRequest{
		Error: SiteRuntimeError{Status: 404},
		ViewContext: router.ViewContext{
			"host": map[string]any{"items": []any{baseItem}},
		},
	})
	if err != nil {
		t.Fatalf("render isolated candidates: %v", err)
	}
	if rec.Code != 404 || rec.Body.String() != "original" || result.Attempts != 2 {
		t.Fatalf("candidate mutation leaked into fallback: status=%d body=%q result=%#v", rec.Code, rec.Body.String(), result)
	}
	if baseItem["label"] != "original" {
		t.Fatalf("candidate mutation leaked into caller context: %#v", baseItem)
	}
}
