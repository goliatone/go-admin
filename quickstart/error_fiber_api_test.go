package quickstart

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
)

func TestFiberErrorHandlerUsesCanonicalShellOnlyForAdminUI(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin", Title: "Test Admin"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("construct admin: %v", err)
	}
	adm.WithThemeProvider(func(_ context.Context, selector admin.ThemeSelector) (*admin.ThemeSelection, error) {
		return &admin.ThemeSelection{
			Variant: selector.Variant,
			Partials: map[string]string{
				admin.AdminPartialShellFooter: "themes/test/footer.html",
			},
		}, nil
	})
	hostTemplates := fstest.MapFS{
		"templates/themes/test/footer.html": {Data: []byte(`<footer data-host-error-footer>Host error footer</footer>`)},
	}
	views, err := NewViewEngine(client.Templates(),
		WithViewTemplatesFS(hostTemplates),
		WithViewAdmin(adm),
		WithViewBasePath(cfg.BasePath),
	)
	if err != nil {
		t.Fatalf("construct view engine: %v", err)
	}
	app := fiber.New(fiber.Config{Views: views, ErrorHandler: NewFiberErrorHandler(adm, cfg, false)})
	app.Get("/admin/fail", func(*fiber.Ctx) error { return fiber.ErrNotFound })
	app.Get("/public/fail", func(*fiber.Ctx) error { return fiber.ErrNotFound })

	adminResp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/fail?variant=contrast", nil), -1)
	if err != nil {
		t.Fatalf("request admin error: %v", err)
	}
	defer closeResponseBody(t, adminResp)
	adminBody, err := io.ReadAll(adminResp.Body)
	if err != nil {
		t.Fatalf("read admin error: %v", err)
	}
	adminHTML := string(adminBody)
	for _, marker := range []string{`data-admin-shell`, `data-admin-page-header`, `data-admin-error-page`, `data-host-error-footer`} {
		if countRenderedHTMLAttribute(adminHTML, marker) != 1 {
			t.Fatalf("admin error marker %q count mismatch in body: %s", marker, adminHTML)
		}
	}
	if countRenderedHTMLAttribute(adminHTML, "data-theme") != 1 || !strings.Contains(adminHTML, `data-theme="contrast"`) {
		t.Fatalf("admin error did not render the selected contrast theme exactly once: %s", adminHTML)
	}
	if strings.Count(strings.ToLower(adminHTML), "<!doctype html>") != 1 {
		t.Fatalf("admin error must own exactly one document: %s", adminHTML)
	}

	publicResp, err := app.Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/public/fail", nil), -1)
	if err != nil {
		t.Fatalf("request public error: %v", err)
	}
	defer closeResponseBody(t, publicResp)
	publicBody, err := io.ReadAll(publicResp.Body)
	if err != nil {
		t.Fatalf("read public error: %v", err)
	}
	if strings.Contains(string(publicBody), "data-admin-shell") {
		t.Fatalf("public error unexpectedly rendered authenticated shell: %s", publicBody)
	}
	if strings.Count(strings.ToLower(string(publicBody)), "<!doctype html>") != 1 {
		t.Fatalf("public error must retain standalone document: %s", publicBody)
	}
}

func TestFiberErrorHandlerPreservesAPI404ForUnmatchedRoutes(t *testing.T) {
	cfg := admin.Config{
		BasePath: "/admin",
		Errors: admin.ErrorConfig{
			InternalMessage: "An unexpected error occurred",
		},
	}
	app := fiber.New(fiber.Config{
		ErrorHandler: NewFiberErrorHandler(nil, cfg, false),
	})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/v1/missing-route", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer closeResponseBody(t, resp)

	if resp.StatusCode != http.StatusNotFound {
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			t.Fatalf("read response body: %v", readErr)
		}
		t.Fatalf("expected status 404, got %d body=%s", resp.StatusCode, string(body))
	}

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode response payload: %v body=%s", err, string(raw))
	}
	errPayload, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error envelope, got %+v", payload)
	}
	if code := fmt.Sprint(errPayload["code"]); code != "404" {
		t.Fatalf("expected error code 404, got %q payload=%+v", code, errPayload)
	}
	if textCode := strings.TrimSpace(fmt.Sprint(errPayload["text_code"])); textCode != "NOT_FOUND" {
		t.Fatalf("expected text_code NOT_FOUND, got %q payload=%+v", textCode, errPayload)
	}
}

func TestErrorPresenterWithAdminIdentityUsesResolvedIdentity(t *testing.T) {
	adm, err := admin.New(admin.Config{
		Deployment: admin.DeploymentIdentityConfig{
			InstanceName: "calm-otter",
			InstanceID:   "instance-quickstart",
		},
	}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("construct admin: %v", err)
	}
	presenter := errorPresenterWithAdminIdentity(admin.NewErrorPresenter(admin.ErrorConfig{}), adm)
	if got := presenter.DeploymentIdentity(); got != adm.DeploymentIdentity() {
		t.Fatalf("presenter identity mismatch: got=%+v want=%+v", got, adm.DeploymentIdentity())
	}

	standalone := errorPresenterWithAdminIdentity(admin.NewErrorPresenter(admin.ErrorConfig{}), nil)
	if got := standalone.DeploymentIdentity(); got.InstanceID != "" {
		t.Fatalf("standalone presenter unexpectedly resolved identity: %+v", got)
	}
}
