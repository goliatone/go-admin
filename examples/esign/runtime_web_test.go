package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/modules"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
)

var (
	esignRuntimeAppOnce sync.Once
	esignRuntimeApp     *fiber.App
	esignRuntimeAppErr  error
)

func TestRuntimeRegistersWebEntrypointAndAuthRoutes(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	assertRedirect(t, app, http.MethodGet, "/", "/admin")
	assertRedirect(t, app, http.MethodGet, "/admin", "/admin/login")
	assertRedirect(t, app, http.MethodGet, "/admin/", "/admin/login")

	loginResp := doRequest(t, app, http.MethodGet, "/admin/login", "", nil)
	defer loginResp.Body.Close()
	if loginResp.StatusCode != http.StatusOK {
		t.Fatalf("expected /admin/login status 200, got %d", loginResp.StatusCode)
	}

	apiResp := doRequest(t, app, http.MethodGet, "/admin/api/v1/esign/status", "", nil)
	defer apiResp.Body.Close()
	if apiResp.StatusCode == http.StatusNotFound {
		t.Fatalf("expected /admin/api/v1/esign/status to be registered, got 404")
	}
}

func TestRuntimeAdminUIRoutesRequireLoginButSignerRouteStaysPublic(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	assertRedirect(t, app, http.MethodGet, "/admin/esign", "/admin/login")
	assertRedirect(t, app, http.MethodGet, "/admin/content/esign_documents", "/admin/login")

	signerResp := doRequest(t, app, http.MethodGet, "/api/v1/esign/signing/session/public-token", "", nil)
	defer signerResp.Body.Close()
	if signerResp.StatusCode == http.StatusNotFound {
		t.Fatalf("expected signer session route to be registered, got 404")
	}
	if signerResp.StatusCode == http.StatusFound {
		location := strings.TrimSpace(signerResp.Header.Get("Location"))
		if location == "/admin/login" {
			t.Fatalf("expected signer route to stay public, got redirect to %q", location)
		}
	}
}

func TestRuntimeLoginUnlocksAdminShellAndLandingRoute(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	if loginResp.StatusCode != http.StatusFound {
		t.Fatalf("expected login redirect status 302, got %d", loginResp.StatusCode)
	}
	if location := strings.TrimSpace(loginResp.Header.Get("Location")); location != "/admin" {
		t.Fatalf("expected login redirect to /admin, got %q", location)
	}

	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	adminResp := doRequestWithCookie(t, app, http.MethodGet, "/admin", authCookie)
	defer adminResp.Body.Close()
	if adminResp.StatusCode != http.StatusOK {
		t.Fatalf("expected authenticated /admin status 200, got %d", adminResp.StatusCode)
	}

	landingResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/esign", authCookie)
	defer landingResp.Body.Close()
	if landingResp.StatusCode != http.StatusOK {
		t.Fatalf("expected authenticated /admin/esign status 200, got %d", landingResp.StatusCode)
	}
	body, err := io.ReadAll(landingResp.Body)
	if err != nil {
		t.Fatalf("read /admin/esign body: %v", err)
	}
	if !strings.Contains(string(body), "E-Sign") {
		t.Fatalf("expected landing page content in response body")
	}
}

func TestRuntimeLoginFailureStaysOnLoginWithErrorMessage(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	form := url.Values{}
	form.Set("identifier", "admin@example.com")
	form.Set("password", "wrong-password")
	form.Set("remember", "1")
	resp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusFound {
		t.Fatalf("expected failed login to redirect, got %d", resp.StatusCode)
	}
	location := strings.TrimSpace(resp.Header.Get("Location"))
	if !strings.HasPrefix(location, "/admin/login?") {
		t.Fatalf("expected failed login redirect to /admin/login with query, got %q", location)
	}
	if !strings.Contains(location, "error=invalid_credentials") {
		t.Fatalf("expected error code in redirect location, got %q", location)
	}

	loginResp := doRequest(t, app, http.MethodGet, location, "", nil)
	defer loginResp.Body.Close()
	if loginResp.StatusCode != http.StatusOK {
		t.Fatalf("expected login page status 200, got %d", loginResp.StatusCode)
	}
	body, err := io.ReadAll(loginResp.Body)
	if err != nil {
		t.Fatalf("read login response: %v", err)
	}
	if !strings.Contains(string(body), "Invalid credentials. Please check your identifier and password.") {
		t.Fatalf("expected inline login error message in response body")
	}
}

func setupESignRuntimeWebApp(t *testing.T) *fiber.App {
	t.Helper()
	esignRuntimeAppOnce.Do(func() {
		esignRuntimeApp, esignRuntimeAppErr = newESignRuntimeWebAppForTests()
	})
	if esignRuntimeAppErr != nil {
		t.Fatalf("setup e-sign runtime app: %v", esignRuntimeAppErr)
	}
	return esignRuntimeApp
}

func newESignRuntimeWebAppForTests() (*fiber.App, error) {
	cfg := quickstart.NewAdminConfig("/admin", "E-Sign Test", "en")
	cfg.URLs.Admin.APIPrefix = "api"
	cfg.URLs.Admin.APIVersion = "v1"
	cfg.URLs.Public.APIPrefix = "api"
	cfg.URLs.Public.APIVersion = "v1"
	cfg.EnablePublicAPI = true

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithFeatureDefaults(map[string]bool{
			"esign":        true,
			"esign_google": false,
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("new admin: %w", err)
	}

	if err := adm.RegisterModule(modules.NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode)); err != nil {
		return nil, fmt.Errorf("register module: %w", err)
	}

	authn, auther, cookieName, err := configureESignAuth(adm, cfg)
	if err != nil {
		return nil, fmt.Errorf("configure auth: %w", err)
	}

	viewEngine, err := newESignViewEngine(cfg, adm)
	if err != nil {
		return nil, fmt.Errorf("new view engine: %w", err)
	}

	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			StrictRouting:     false,
			EnablePrintRoutes: false,
			PassLocalsToViews: true,
			Views:             viewEngine,
		})
	})
	quickstart.NewStaticAssets(server.Router(), cfg, client.Assets(), quickstart.WithDiskAssetsDir(resolveESignDiskAssetsDir()))
	if err := adm.Initialize(server.Router()); err != nil {
		return nil, fmt.Errorf("initialize admin: %w", err)
	}
	routes := handlers.BuildRouteSet(adm.URLs(), adm.BasePath(), adm.AdminAPIGroup())
	if err := registerESignWebRoutes(server.Router(), cfg, adm, authn, auther, cookieName, routes); err != nil {
		return nil, fmt.Errorf("register web routes: %w", err)
	}
	server.Init()
	return server.WrappedRouter(), nil
}

func assertRedirect(t *testing.T, app *fiber.App, method, endpoint, expectedLocation string) {
	t.Helper()
	resp := doRequest(t, app, method, endpoint, "", nil)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusFound {
		t.Fatalf("expected %s %s status 302, got %d", method, endpoint, resp.StatusCode)
	}
	location := strings.TrimSpace(resp.Header.Get("Location"))
	if location != expectedLocation {
		t.Fatalf("expected %s %s redirect to %q, got %q", method, endpoint, expectedLocation, location)
	}
}

func doRequest(t *testing.T, app *fiber.App, method, endpoint, contentType string, body io.Reader) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, endpoint, body)
	if strings.TrimSpace(contentType) != "" {
		req.Header.Set("Content-Type", contentType)
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed (%s %s): %v", method, endpoint, err)
	}
	return resp
}

func doRequestWithCookie(t *testing.T, app *fiber.App, method, endpoint string, cookie *http.Cookie) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, endpoint, nil)
	if cookie != nil {
		req.AddCookie(cookie)
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed (%s %s): %v", method, endpoint, err)
	}
	return resp
}

func firstAuthCookie(resp *http.Response) *http.Cookie {
	if resp == nil {
		return nil
	}
	for _, cookie := range resp.Cookies() {
		if cookie == nil || strings.TrimSpace(cookie.Name) == "" || strings.TrimSpace(cookie.Value) == "" {
			continue
		}
		return cookie
	}
	return nil
}
