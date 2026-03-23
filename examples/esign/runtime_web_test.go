package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/modules"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	commandregistry "github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
)

var (
	esignRuntimeAppOnce sync.Once
	esignRuntimeApp     *fiber.App
	esignRuntimeAppErr  error
	esignRuntimeDSNSeq  uint64
)

type runtimeWebTestAuthorizer struct {
	allowed map[string]bool
}

func (a runtimeWebTestAuthorizer) Can(_ context.Context, action string, _ string) bool {
	return a.allowed[action]
}

type runtimeWebTestPassthroughAuthenticator struct{}

func (runtimeWebTestPassthroughAuthenticator) WrapHandler(handler router.HandlerFunc) router.HandlerFunc {
	if handler == nil {
		return func(c router.Context) error { return nil }
	}
	return handler
}

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

	assertRedirect(t, app, http.MethodGet, "/admin", "/admin/login")
	assertRedirect(t, app, http.MethodGet, "/admin/esign/documents", "/admin/login")
	assertRedirect(t, app, http.MethodGet, "/admin/esign/agreements", "/admin/login")
	assertRedirect(t, app, http.MethodGet, "/admin/esign/agreements/agreement-1/view", "/admin/login")
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

func TestRuntimeSignerRoutesExposeUnifiedSurfaceOnly(t *testing.T) {
	app, err := newESignRuntimeWebAppForTestsWithGoogleEnabled(false)
	if err != nil {
		t.Fatalf("setup e-sign runtime app: %v", err)
	}

	entryResp := doRequest(t, app, http.MethodGet, "/sign/token-mode-1", "", nil)
	defer entryResp.Body.Close()
	if entryResp.StatusCode == http.StatusNotFound {
		t.Fatalf("expected /sign/:token route to be registered, got 404")
	}
	if location := strings.TrimSpace(entryResp.Header.Get("Location")); strings.Contains(location, "flow=") {
		t.Fatalf("expected no flow-mode query redirects, got %q", location)
	}

	aliasResp := doRequest(t, app, http.MethodGet, "/esign/sign/token-mode-1", "", nil)
	defer aliasResp.Body.Close()
	if aliasResp.StatusCode == http.StatusNotFound {
		t.Fatalf("expected /esign/sign/:token alias route to be registered, got 404")
	}
	if location := strings.TrimSpace(aliasResp.Header.Get("Location")); strings.Contains(location, "flow=") {
		t.Fatalf("expected no flow-mode query redirects for alias, got %q", location)
	}

	reviewResp := doRequest(t, app, http.MethodGet, "/review/token-mode-1", "", nil)
	defer reviewResp.Body.Close()
	if reviewResp.StatusCode == http.StatusNotFound {
		t.Fatalf("expected /review/:token route to be registered, got 404")
	}

	legacyReviewResp := doRequest(t, app, http.MethodGet, "/sign/token-mode-1/review", "", nil)
	defer legacyReviewResp.Body.Close()
	if legacyReviewResp.StatusCode == http.StatusNotFound {
		t.Fatalf("expected legacy /sign/:token/review route to stay registered for compatibility, got 404")
	}

	legacyFieldsResp := doRequest(t, app, http.MethodGet, "/sign/token-mode-1/fields", "", nil)
	defer legacyFieldsResp.Body.Close()
	if legacyFieldsResp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected legacy /fields route to be removed, got %d", legacyFieldsResp.StatusCode)
	}

	legacyDiagResp := doRequest(t, app, http.MethodGet, "/api/v1/esign/signing/flow-diagnostics/token-mode-1", "", nil)
	defer legacyDiagResp.Body.Close()
	if legacyDiagResp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected legacy flow-diagnostics endpoint to be removed, got %d", legacyDiagResp.StatusCode)
	}
}

func TestRuntimeUnifiedReviewFailureEmitsViewerTelemetry(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	app, err := newESignRuntimeWebAppForTestsWithGoogleEnabled(false)
	if err != nil {
		t.Fatalf("setup e-sign runtime app: %v", err)
	}

	resp := doRequest(t, app, http.MethodGet, "/review/token-missing", "", nil)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected review error page status 200, got %d", resp.StatusCode)
	}

	snapshot := observability.Snapshot()
	if snapshot.UnifiedViewerFailureTotal == 0 {
		t.Fatalf("expected unified viewer failure telemetry, got %+v", snapshot)
	}
}

func TestRuntimeUnifiedReviewAppliesCSPAndCacheHeaders(t *testing.T) {
	app, err := newESignRuntimeWebAppForTestsWithGoogleEnabled(false)
	if err != nil {
		t.Fatalf("setup e-sign runtime app: %v", err)
	}

	resp := doRequest(t, app, http.MethodGet, "/review/token-csp", "", nil)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected review response status 200, got %d", resp.StatusCode)
	}
	if cacheControl := strings.ToLower(strings.TrimSpace(resp.Header.Get("Cache-Control"))); !strings.Contains(cacheControl, "no-store") {
		t.Fatalf("expected no-store cache-control header, got %q", resp.Header.Get("Cache-Control"))
	}
	if csp := strings.TrimSpace(resp.Header.Get("Content-Security-Policy")); csp == "" {
		t.Fatalf("expected csp header on unified review route")
	} else if !strings.Contains(csp, "https://cdn.jsdelivr.net") || !strings.Contains(csp, "https://cdnjs.cloudflare.com") {
		t.Fatalf("expected unified review csp to preserve external asset allowances, got %q", csp)
	}
}

func TestRuntimeSignerReviewRoutesRedirectToCanonicalTokenKindPath(t *testing.T) {
	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			StrictRouting:     false,
			EnablePrintRoutes: false,
		})
	})
	err := registerESignPublicSignerWebRoutes(server.Router(), SignerWebRouteConfig{
		PublicTokenValidator: runtimeWebTestPublicTokenValidator{
			tokens: map[string]services.PublicReviewToken{
				"sign-token": {
					Kind:         services.PublicReviewTokenKindSigning,
					SigningToken: &stores.SigningTokenRecord{ID: "sign-token"},
				},
				"review-token": {
					Kind:        services.PublicReviewTokenKindReview,
					ReviewToken: &stores.ReviewSessionTokenRecord{ID: "review-token"},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("register signer web routes: %v", err)
	}
	server.Init()
	app := server.WrappedRouter()

	reviewRedirectResp := doRequest(t, app, http.MethodGet, "/sign/review-token", "", nil)
	defer reviewRedirectResp.Body.Close()
	if reviewRedirectResp.StatusCode != http.StatusFound {
		t.Fatalf("expected review token on /sign/:token to redirect, got %d", reviewRedirectResp.StatusCode)
	}
	if location := strings.TrimSpace(reviewRedirectResp.Header.Get("Location")); location != "/review/review-token" {
		t.Fatalf("expected review token redirect to /review/:token, got %q", location)
	}

	signRedirectResp := doRequest(t, app, http.MethodGet, "/review/sign-token", "", nil)
	defer signRedirectResp.Body.Close()
	if signRedirectResp.StatusCode != http.StatusFound {
		t.Fatalf("expected signing token on /review/:token to redirect, got %d", signRedirectResp.StatusCode)
	}
	if location := strings.TrimSpace(signRedirectResp.Header.Get("Location")); location != "/sign/sign-token" {
		t.Fatalf("expected signing token redirect to /sign/:token, got %q", location)
	}

	legacyRedirectResp := doRequest(t, app, http.MethodGet, "/sign/sign-token/review?mode=legacy", "", nil)
	defer legacyRedirectResp.Body.Close()
	if legacyRedirectResp.StatusCode != http.StatusFound {
		t.Fatalf("expected legacy review path to redirect, got %d", legacyRedirectResp.StatusCode)
	}
	if location := strings.TrimSpace(legacyRedirectResp.Header.Get("Location")); location != "/sign/sign-token?mode=legacy" {
		t.Fatalf("expected legacy route redirect to preserve query string, got %q", location)
	}
}

func TestRuntimeSenderAgreementViewerPermissionDeniedRendersHTMLPage(t *testing.T) {
	_ = commandregistry.Stop(context.Background())
	t.Cleanup(func() { _ = commandregistry.Stop(context.Background()) })

	cfg := quickstart.NewAdminConfig("/admin", "E-Sign Test", "en")
	applyESignRuntimeDefaults(&cfg)
	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithAdminDependencies(coreadmin.Dependencies{
			Authorizer: runtimeWebTestAuthorizer{allowed: map[string]bool{}},
		}),
	)
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	viewEngine, err := newESignViewEngine(cfg, adm)
	if err != nil {
		t.Fatalf("new e-sign view engine: %v", err)
	}
	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			StrictRouting:     false,
			EnablePrintRoutes: false,
			Views:             viewEngine,
		})
	})

	routes := handlers.BuildRouteSet(nil, "/admin", "admin.api.v1")
	module := modules.NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode).WithStore(stores.NewInMemoryStore())
	if err := registerESignSenderAgreementViewerWebRoutes(server.Router(), adm, runtimeWebTestPassthroughAuthenticator{}, routes, cfg.BasePath, module); err != nil {
		t.Fatalf("register sender agreement viewer routes: %v", err)
	}
	server.Init()
	app := server.WrappedRouter()

	resp := doRequest(t, app, http.MethodGet, "/admin/esign/agreements/agreement-1/view", "", nil)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected sender viewer permission error page status 200, got %d body=%s", resp.StatusCode, body)
	}
	if contentType := strings.TrimSpace(resp.Header.Get("Content-Type")); !strings.Contains(contentType, "text/html") {
		t.Fatalf("expected html content type, got %q", contentType)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(body)
	if !strings.Contains(bodyText, "Viewer Unavailable") || !strings.Contains(bodyText, "VIEWER_FORBIDDEN") {
		t.Fatalf("expected rendered sender viewer error page, got %s", bodyText)
	}
	if strings.HasPrefix(strings.TrimSpace(bodyText), "{") {
		t.Fatalf("expected html error page, got json payload %s", bodyText)
	}
}

func TestRuntimeESignLegacyAliasesRedirectAfterLogin(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	assertRedirectWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign/documents", "/admin/content/esign_documents")
	assertRedirectWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign/documents/new?source=google", "/admin/content/esign_documents/new?source=google")
	assertRedirectWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign/agreements", "/admin/content/esign_agreements")
	assertRedirectWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign/users", "/admin/users")
	assertRedirectWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign/roles", "/admin/roles")
	assertRedirectWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign/profile", "/admin/profile")
	assertRedirectWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign/activity", "/admin/activity")
}

func TestRuntimeGoogleIntegrationUIRoutesFeatureGatedWhenDisabled(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	assertStatusWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign/integrations/google", http.StatusNotFound)
	assertStatusWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign/integrations/google/callback", http.StatusNotFound)
	assertStatusWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign/integrations/google/drive", http.StatusNotFound)
}

func TestRuntimeGoogleIntegrationUIRoutesRenderWhenEnabled(t *testing.T) {
	app, err := newESignRuntimeWebAppForTestsWithGoogleEnabled(true)
	if err != nil {
		t.Fatalf("setup e-sign runtime app with google enabled: %v", err)
	}

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	landingResp := doRequestWithCookie(t, app, http.MethodGet, "/admin", authCookie)
	defer landingResp.Body.Close()
	if landingResp.StatusCode != http.StatusOK {
		t.Fatalf("expected /admin status 200, got %d", landingResp.StatusCode)
	}
	landingBody, err := io.ReadAll(landingResp.Body)
	if err != nil {
		t.Fatalf("read /admin body: %v", err)
	}
	if !strings.Contains(string(landingBody), "/admin/esign/integrations/google") {
		t.Fatalf("expected google integration link on landing page when feature enabled")
	}

	integrationResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/esign/integrations/google", authCookie)
	defer integrationResp.Body.Close()
	if integrationResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(integrationResp.Body)
		t.Fatalf("expected /admin/esign/integrations/google status 200, got %d body=%s", integrationResp.StatusCode, strings.TrimSpace(string(body)))
	}
	integrationBody, err := io.ReadAll(integrationResp.Body)
	if err != nil {
		t.Fatalf("read integration response: %v", err)
	}
	if !strings.Contains(string(integrationBody), "Google Drive Integration") {
		t.Fatalf("expected integration page content in response body")
	}

	callbackResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/esign/integrations/google/callback", authCookie)
	defer callbackResp.Body.Close()
	if callbackResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(callbackResp.Body)
		t.Fatalf("expected /admin/esign/integrations/google/callback status 200, got %d body=%s", callbackResp.StatusCode, strings.TrimSpace(string(body)))
	}
	callbackBody, err := io.ReadAll(callbackResp.Body)
	if err != nil {
		t.Fatalf("read callback response: %v", err)
	}
	if !strings.Contains(string(callbackBody), "Google Authorization - E-Sign") {
		t.Fatalf("expected google callback page content in response body")
	}

	pickerResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/esign/integrations/google/drive", authCookie)
	defer pickerResp.Body.Close()
	if pickerResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(pickerResp.Body)
		t.Fatalf("expected /admin/esign/integrations/google/drive status 200, got %d body=%s", pickerResp.StatusCode, strings.TrimSpace(string(body)))
	}
	pickerBody, err := io.ReadAll(pickerResp.Body)
	if err != nil {
		t.Fatalf("read picker response: %v", err)
	}
	if !strings.Contains(string(pickerBody), "Import from Google Drive") {
		t.Fatalf("expected google drive picker page content in response body")
	}
}

func TestRuntimeGoogleIntegrationCallbackRouteAccessibleWithoutAuthCookie(t *testing.T) {
	app, err := newESignRuntimeWebAppForTestsWithGoogleEnabled(true)
	if err != nil {
		t.Fatalf("setup e-sign runtime app with google enabled: %v", err)
	}

	callbackResp := doRequest(t, app, http.MethodGet, "/admin/esign/integrations/google/callback?code=test-code", "", nil)
	defer callbackResp.Body.Close()
	if callbackResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(callbackResp.Body)
		t.Fatalf("expected public callback route status 200, got %d body=%s", callbackResp.StatusCode, strings.TrimSpace(string(body)))
	}
	callbackBody, err := io.ReadAll(callbackResp.Body)
	if err != nil {
		t.Fatalf("read callback response: %v", err)
	}
	if !strings.Contains(string(callbackBody), "Google Authorization - E-Sign") {
		t.Fatalf("expected google callback page content in response body")
	}
}

func TestRuntimeNewDocumentRouteInjectsGoogleIngestionFlagsWhenEnabled(t *testing.T) {
	app, err := newESignRuntimeWebAppForTestsWithGoogleEnabled(true)
	if err != nil {
		t.Fatalf("setup e-sign runtime app with google enabled: %v", err)
	}

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	initialResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_documents/new", authCookie)
	defer initialResp.Body.Close()
	if initialResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(initialResp.Body)
		t.Fatalf("expected /admin/content/esign_documents/new status 200, got %d body=%s", initialResp.StatusCode, strings.TrimSpace(string(body)))
	}
	initialBody, err := io.ReadAll(initialResp.Body)
	if err != nil {
		t.Fatalf("read new-document response body: %v", err)
	}
	initialMarkup := string(initialBody)
	if !strings.Contains(initialMarkup, `data-esign-page="admin.documents.ingestion"`) {
		t.Fatalf("expected page marker data-esign-page=admin.documents.ingestion in new-document template")
	}
	initialConfig := extractESignPageConfigFromHTML(t, initialMarkup)
	if got := strings.TrimSpace(fmt.Sprint(initialConfig["page"])); got != "admin.documents.ingestion" {
		t.Fatalf("expected page config page=admin.documents.ingestion, got %q", got)
	}
	if got := getESignConfigFeatureBool(initialConfig, "google_enabled"); !got {
		t.Fatalf("expected google_enabled=true in page config")
	}
	if got := getESignConfigFeatureBool(initialConfig, "google_connected"); got {
		t.Fatalf("expected google_connected=false before oauth connect")
	}

	connectReq := httptest.NewRequest(
		http.MethodPost,
		"/admin/api/v1/esign/integrations/google/connect?user_id="+url.QueryEscape(defaultESignDemoAdminID),
		strings.NewReader(`{"auth_code":"oauth-doc-form"}`),
	)
	connectReq.Header.Set("Content-Type", "application/json")
	connectReq.Header.Set("X-Forwarded-Proto", "https")
	connectReq.Host = "localhost:8082"
	connectReq.AddCookie(authCookie)
	connectResp, err := app.Test(connectReq, -1)
	if err != nil {
		t.Fatalf("google connect request failed: %v", err)
	}
	defer connectResp.Body.Close()
	if connectResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(connectResp.Body)
		t.Fatalf("expected google connect status 200, got %d body=%s", connectResp.StatusCode, strings.TrimSpace(string(body)))
	}

	connectedResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_documents/new?source=google", authCookie)
	defer connectedResp.Body.Close()
	if connectedResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(connectedResp.Body)
		t.Fatalf("expected connected new-document status 200, got %d body=%s", connectedResp.StatusCode, strings.TrimSpace(string(body)))
	}
	connectedBody, err := io.ReadAll(connectedResp.Body)
	if err != nil {
		t.Fatalf("read connected new-document response body: %v", err)
	}
	connectedConfig := extractESignPageConfigFromHTML(t, string(connectedBody))
	if got := getESignConfigFeatureBool(connectedConfig, "google_connected"); !got {
		t.Fatalf("expected google_connected=true after oauth connect")
	}
}

func TestRuntimeNewDocumentRouteConfigReflectsGoogleFeatureGateWhenDisabled(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	resp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_documents/new?source=google", authCookie)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected /admin/content/esign_documents/new status 200, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read new-document body: %v", err)
	}
	config := extractESignPageConfigFromHTML(t, string(body))
	if got := strings.TrimSpace(fmt.Sprint(config["page"])); got != "admin.documents.ingestion" {
		t.Fatalf("expected page config page=admin.documents.ingestion, got %q", got)
	}
	if got := getESignConfigFeatureBool(config, "google_enabled"); got {
		t.Fatalf("expected google_enabled=false when feature is disabled")
	}
	if got := getESignConfigFeatureBool(config, "google_connected"); got {
		t.Fatalf("expected google_connected=false when feature is disabled")
	}
}

func TestRuntimeMigratedPagesExposeValidatedESignModuleAssets(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	landingResp := doRequestWithCookie(t, app, http.MethodGet, "/admin", authCookie)
	defer landingResp.Body.Close()
	if landingResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(landingResp.Body)
		t.Fatalf("expected /admin status 200, got %d body=%s", landingResp.StatusCode, strings.TrimSpace(string(body)))
	}
	landingBody, err := io.ReadAll(landingResp.Body)
	if err != nil {
		t.Fatalf("read landing body: %v", err)
	}
	landingMarkup := string(landingBody)
	if !strings.Contains(landingMarkup, `data-esign-page="admin.landing"`) {
		t.Fatalf("expected landing page marker in response")
	}
	landingConfig := extractESignPageConfigFromHTML(t, landingMarkup)
	landingModulePath := getESignConfigModulePath(landingConfig)
	if landingModulePath != "/admin/assets/dist/esign/admin-landing.js" {
		t.Fatalf("expected landing module path contract, got %q", landingModulePath)
	}
	if !strings.Contains(landingMarkup, `src="`+landingModulePath+`"`) {
		t.Fatalf("expected landing module script src %q in markup", landingModulePath)
	}

	docResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_documents/new", authCookie)
	defer docResp.Body.Close()
	if docResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(docResp.Body)
		t.Fatalf("expected /admin/content/esign_documents/new status 200, got %d body=%s", docResp.StatusCode, strings.TrimSpace(string(body)))
	}
	docBody, err := io.ReadAll(docResp.Body)
	if err != nil {
		t.Fatalf("read document ingestion body: %v", err)
	}
	docMarkup := string(docBody)
	docConfig := extractESignPageConfigFromHTML(t, docMarkup)
	docModulePath := getESignConfigModulePath(docConfig)
	if docModulePath != "/admin/assets/dist/esign/document-form.js" {
		t.Fatalf("expected document ingestion module path contract, got %q", docModulePath)
	}
	if !strings.Contains(docMarkup, `src="`+docModulePath+`"`) {
		t.Fatalf("expected document-ingestion module script src %q in markup", docModulePath)
	}

	agreementResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_agreements/new", authCookie)
	defer agreementResp.Body.Close()
	if agreementResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(agreementResp.Body)
		t.Fatalf("expected /admin/content/esign_agreements/new status 200, got %d body=%s", agreementResp.StatusCode, strings.TrimSpace(string(body)))
	}
	agreementBody, err := io.ReadAll(agreementResp.Body)
	if err != nil {
		t.Fatalf("read agreement form body: %v", err)
	}
	agreementMarkup := string(agreementBody)
	if !strings.Contains(agreementMarkup, `data-esign-page="agreement-form"`) {
		t.Fatalf("expected agreement form marker in response")
	}
	agreementConfig := extractESignPageConfigFromHTML(t, agreementMarkup)
	agreementModulePath := getESignConfigModulePath(agreementConfig)
	if agreementModulePath != "/admin/assets/dist/esign/agreement-form.js" {
		t.Fatalf("expected agreement form module path contract, got %q", agreementModulePath)
	}
	if !strings.Contains(agreementMarkup, `src="`+agreementModulePath+`"`) {
		t.Fatalf("expected agreement form module script src %q in markup", agreementModulePath)
	}

	landingAssetResp := doRequest(t, app, http.MethodGet, landingModulePath, "", nil)
	defer landingAssetResp.Body.Close()
	if landingAssetResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(landingAssetResp.Body)
		t.Fatalf("expected landing module asset status 200, got %d body=%s", landingAssetResp.StatusCode, strings.TrimSpace(string(body)))
	}
	docAssetResp := doRequest(t, app, http.MethodGet, docModulePath, "", nil)
	defer docAssetResp.Body.Close()
	if docAssetResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(docAssetResp.Body)
		t.Fatalf("expected document-ingestion module asset status 200, got %d body=%s", docAssetResp.StatusCode, strings.TrimSpace(string(body)))
	}
	agreementAssetResp := doRequest(t, app, http.MethodGet, agreementModulePath, "", nil)
	defer agreementAssetResp.Body.Close()
	if agreementAssetResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(agreementAssetResp.Body)
		t.Fatalf("expected agreement-form module asset status 200, got %d body=%s", agreementAssetResp.StatusCode, strings.TrimSpace(string(body)))
	}
	syncCoreResp := doRequest(t, app, http.MethodGet, "/admin/sync-client/sync-core/index.js", "", nil)
	defer syncCoreResp.Body.Close()
	if syncCoreResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(syncCoreResp.Body)
		t.Fatalf("expected sync-core asset status 200, got %d body=%s", syncCoreResp.StatusCode, strings.TrimSpace(string(body)))
	}
	syncCoreBody, err := io.ReadAll(syncCoreResp.Body)
	if err != nil {
		t.Fatalf("read sync-core asset body: %v", err)
	}
	if !strings.Contains(string(syncCoreBody), "@goliatone/sync-core") {
		t.Fatalf("expected sync-core asset body to include runtime marker")
	}
}

func TestRuntimeAgreementEditPageConfigParsesWithPopulatedParticipantsAndFields(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("setup e-sign runtime fixture: %v", err)
	}
	app := fixture.App
	scope := fixture.Module.DefaultScope()
	query := fmt.Sprintf("tenant_id=%s&org_id=%s", url.QueryEscape(scope.TenantID), url.QueryEscape(scope.OrgID))

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	documentID := createPanelRecordWithCookie(t, app, authCookie, "/admin/api/v1/panels/esign_documents?"+query, map[string]any{
		"title":                fmt.Sprintf("Edit Page Config Doc %d", time.Now().UnixNano()),
		"source_original_name": "edit-page-config.pdf",
		"pdf_base64":           base64.StdEncoding.EncodeToString(services.GenerateDeterministicPDF(2)),
	})

	agreementID := createPanelRecordWithCookie(t, app, authCookie, "/admin/api/v1/panels/esign_agreements?"+query, map[string]any{
		"document_id": documentID,
		"title":       fmt.Sprintf("Edit Page Config Agreement %d", time.Now().UnixNano()),
		"message":     "Please review and sign.",
		"participants": []map[string]any{
			{
				"name":          "Config Tester",
				"email":         "config.tester@example.com",
				"role":          "signer",
				"notify":        true,
				"signing_stage": 1,
			},
		},
		"field_instances": []map[string]any{
			{
				"type":            "initials",
				"recipient_index": 0,
				"page":            1,
				"required":        true,
				"x":               144,
				"y":               96,
				"width":           80,
				"height":          40,
			},
			{
				"type":            "signature",
				"recipient_index": 0,
				"page":            2,
				"required":        true,
				"x":               220,
				"y":               420,
				"width":           180,
				"height":          48,
			},
		},
	})

	editResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_agreements/"+agreementID+"/edit?"+query, authCookie)
	defer editResp.Body.Close()
	if editResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(editResp.Body)
		t.Fatalf("expected agreement edit status 200, got %d body=%s", editResp.StatusCode, strings.TrimSpace(string(body)))
	}
	editBody, err := io.ReadAll(editResp.Body)
	if err != nil {
		t.Fatalf("read agreement edit body: %v", err)
	}
	markup := string(editBody)
	if !strings.Contains(markup, `data-esign-page="agreement-form"`) {
		t.Fatalf("expected agreement edit page marker in response")
	}

	config := extractESignPageConfigFromHTML(t, markup)
	context, ok := config["context"].(map[string]any)
	if !ok {
		t.Fatalf("expected agreement form context object in page config, got %#v", config["context"])
	}
	initialParticipants, ok := context["initial_participants"].([]any)
	if !ok {
		t.Fatalf("expected initial_participants array in config context, got %#v", context["initial_participants"])
	}
	if len(initialParticipants) != 1 {
		t.Fatalf("expected 1 initial participant in config context, got %d (%#v)", len(initialParticipants), context["initial_participants"])
	}
	initialFieldInstances, ok := context["initial_field_instances"].([]any)
	if !ok {
		t.Fatalf("expected initial_field_instances array in config context, got %#v", context["initial_field_instances"])
	}
	if len(initialFieldInstances) != 2 {
		t.Fatalf("expected 2 initial field instances in config context, got %d (%#v)", len(initialFieldInstances), context["initial_field_instances"])
	}
}

func TestRuntimeAgreementDetailReviewBootstrapParsesWithRecipientAndExternalReviewers(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("setup e-sign runtime fixture: %v", err)
	}
	app := fixture.App
	scope := fixture.Module.DefaultScope()
	query := fmt.Sprintf("tenant_id=%s&org_id=%s", url.QueryEscape(scope.TenantID), url.QueryEscape(scope.OrgID))

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	documentID := createPanelRecordWithCookie(t, app, authCookie, "/admin/api/v1/panels/esign_documents?"+query, map[string]any{
		"title":                fmt.Sprintf("Review Bootstrap Doc %d", time.Now().UnixNano()),
		"source_original_name": "review-bootstrap.pdf",
		"pdf_base64":           base64.StdEncoding.EncodeToString(services.GenerateDeterministicPDF(2)),
	})

	agreementID := createPanelRecordWithCookie(t, app, authCookie, "/admin/api/v1/panels/esign_agreements?"+query, map[string]any{
		"document_id": documentID,
		"title":       fmt.Sprintf("Review Bootstrap Agreement %d", time.Now().UnixNano()),
		"message":     "Please review this agreement.",
		"participants": []map[string]any{
			{
				"name":          "Bootstrap Reviewer",
				"email":         "bootstrap.reviewer@example.com",
				"role":          "signer",
				"notify":        false,
				"signing_stage": 1,
			},
		},
	})

	detailResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/api/v1/panels/esign_agreements/"+agreementID+"?"+query, authCookie)
	defer detailResp.Body.Close()
	if detailResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(detailResp.Body)
		t.Fatalf("expected agreement detail status 200, got %d body=%s", detailResp.StatusCode, strings.TrimSpace(string(body)))
	}
	detailPayload := map[string]any{}
	if err := json.NewDecoder(detailResp.Body).Decode(&detailPayload); err != nil {
		t.Fatalf("decode agreement detail payload: %v", err)
	}
	record, _ := detailPayload["record"].(map[string]any)
	if record == nil {
		record, _ = detailPayload["data"].(map[string]any)
	}
	if record == nil {
		record = detailPayload
	}
	recipientID := firstNestedID(record, "recipients")
	if recipientID == "" {
		t.Fatalf("expected recipient id in agreement detail payload: %+v", detailPayload)
	}

	requestReviewPayload := map[string]any{
		"gate":             "approve_before_send",
		"comments_enabled": true,
		"review_participants": []map[string]any{
			{
				"participant_type": "recipient",
				"recipient_id":     recipientID,
				"can_comment":      true,
				"can_approve":      true,
			},
			{
				"participant_type": "external",
				"email":            "external.reviewer@example.com",
				"display_name":     "External Reviewer",
				"can_comment":      true,
				"can_approve":      true,
			},
		},
	}
	requestReviewBody, err := json.Marshal(requestReviewPayload)
	if err != nil {
		t.Fatalf("marshal request review payload: %v", err)
	}
	requestReviewResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/api/v1/panels/esign_agreements/actions/request_review?id="+url.QueryEscape(agreementID)+"&"+query,
		"application/json",
		bytes.NewReader(requestReviewBody),
	)
	defer requestReviewResp.Body.Close()
	if requestReviewResp.StatusCode != http.StatusAccepted && requestReviewResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(requestReviewResp.Body)
		t.Fatalf("expected request review action status 200/202, got %d body=%s", requestReviewResp.StatusCode, strings.TrimSpace(string(body)))
	}

	pageResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_agreements/"+agreementID+"?"+query, authCookie)
	defer pageResp.Body.Close()
	if pageResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(pageResp.Body)
		t.Fatalf("expected agreement detail page status 200, got %d body=%s", pageResp.StatusCode, strings.TrimSpace(string(body)))
	}
	pageBody, err := io.ReadAll(pageResp.Body)
	if err != nil {
		t.Fatalf("read agreement detail page body: %v", err)
	}
	reviewBootstrap := extractJSONScriptPayloadFromHTML(t, string(pageBody), "agreement-review-bootstrap")
	participants, ok := reviewBootstrap["participants"].([]any)
	if !ok {
		t.Fatalf("expected participants array in review bootstrap, got %#v", reviewBootstrap["participants"])
	}
	if len(participants) != 2 {
		t.Fatalf("expected 2 review participants in bootstrap payload, got %d (%#v)", len(participants), reviewBootstrap["participants"])
	}

	var foundRecipient, foundExternal bool
	for _, entry := range participants {
		participant, ok := entry.(map[string]any)
		if !ok {
			t.Fatalf("expected review participant object, got %#v", entry)
		}
		participantType := strings.TrimSpace(fmt.Sprint(participant["participant_type"]))
		switch participantType {
		case "recipient":
			if got := strings.TrimSpace(fmt.Sprint(participant["recipient_id"])); got != recipientID {
				t.Fatalf("expected recipient reviewer recipient_id %q, got %q (%#v)", recipientID, got, participant)
			}
			foundRecipient = true
		case "external":
			if got := strings.TrimSpace(fmt.Sprint(participant["email"])); got != "external.reviewer@example.com" {
				t.Fatalf("expected external reviewer email %q, got %q (%#v)", "external.reviewer@example.com", got, participant)
			}
			foundExternal = true
		}
	}
	if !foundRecipient {
		t.Fatal("expected recipient reviewer in agreement review bootstrap payload")
	}
	if !foundExternal {
		t.Fatal("expected external reviewer in agreement review bootstrap payload")
	}
}

func TestRuntimeSeededLineageDetailAPIsExposeSlice4Contracts(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("setup e-sign runtime fixture: %v", err)
	}
	fixtureSet, _, err := seedESignRuntimeFixtures(context.Background(), "/admin", fixture.Module, fixture.Bootstrap)
	if err != nil {
		t.Fatalf("seed runtime fixtures: %v", err)
	}
	app := fixture.App
	scope := fixture.Module.DefaultScope()
	query := fmt.Sprintf("tenant_id=%s&org_id=%s", url.QueryEscape(scope.TenantID), url.QueryEscape(scope.OrgID))

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	documentResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/api/v1/panels/esign_documents/"+fixtureSet.ImportedDocumentID+"?"+query, authCookie)
	defer documentResp.Body.Close()
	if documentResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(documentResp.Body)
		t.Fatalf("expected document detail status 200, got %d body=%s", documentResp.StatusCode, strings.TrimSpace(string(body)))
	}
	documentPayload := map[string]any{}
	documentBody, _ := io.ReadAll(documentResp.Body)
	if err := json.Unmarshal(documentBody, &documentPayload); err != nil {
		t.Fatalf("decode document detail payload: %v body=%s", err, strings.TrimSpace(string(documentBody)))
	}
	if data, ok := documentPayload["data"].(map[string]any); ok && data != nil {
		documentPayload = data
	}
	documentLineage, ok := documentPayload["lineage"].(map[string]any)
	if !ok {
		t.Fatalf("expected document lineage payload, got %+v", documentPayload["lineage"])
	}
	for _, key := range []string{"source_document", "source_revision", "source_artifact", "google_source", "fingerprint_status", "candidate_warning_summary"} {
		if _, ok := documentLineage[key]; !ok {
			t.Fatalf("expected document lineage field %q, got %+v", key, documentLineage)
		}
	}

	agreementResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/api/v1/panels/esign_agreements/"+fixtureSet.ImportedAgreementID+"?"+query, authCookie)
	defer agreementResp.Body.Close()
	if agreementResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(agreementResp.Body)
		t.Fatalf("expected agreement detail status 200, got %d body=%s", agreementResp.StatusCode, strings.TrimSpace(string(body)))
	}
	agreementPayload := map[string]any{}
	agreementBody, _ := io.ReadAll(agreementResp.Body)
	if err := json.Unmarshal(agreementBody, &agreementPayload); err != nil {
		t.Fatalf("decode agreement detail payload: %v body=%s", err, strings.TrimSpace(string(agreementBody)))
	}
	if data, ok := agreementPayload["data"].(map[string]any); ok && data != nil {
		agreementPayload = data
	}
	agreementLineage, ok := agreementPayload["lineage"].(map[string]any)
	if !ok {
		t.Fatalf("expected agreement lineage payload, got %+v", agreementPayload["lineage"])
	}
	for _, key := range []string{"pinned_source_revision_id", "source_document", "source_revision", "linked_document_artifact", "google_source", "newer_source_exists", "newer_source_summary"} {
		if _, ok := agreementLineage[key]; !ok {
			t.Fatalf("expected agreement lineage field %q, got %+v", key, agreementLineage)
		}
	}
}

func TestRuntimeSeededLineageQAScenarioExposesCandidateWarningsAndNewerSourceStates(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("setup e-sign runtime fixture: %v", err)
	}
	fixtureSet, _, err := seedESignRuntimeFixtures(context.Background(), "/admin", fixture.Module, fixture.Bootstrap)
	if err != nil {
		t.Fatalf("seed runtime fixtures: %v", err)
	}
	app := fixture.App
	scope := fixture.Module.DefaultScope()
	query := fmt.Sprintf("tenant_id=%s&org_id=%s", url.QueryEscape(scope.TenantID), url.QueryEscape(scope.OrgID))

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	importedDocumentLineage := fetchPanelLineagePayload(t, app, authCookie, "/admin/api/v1/panels/esign_documents/"+fixtureSet.ImportedDocumentID+"?"+query)
	repeatedDocumentLineage := fetchPanelLineagePayload(t, app, authCookie, "/admin/api/v1/panels/esign_documents/"+fixtureSet.RepeatedImportDocumentID+"?"+query)
	importedAgreementLineage := fetchPanelLineagePayload(t, app, authCookie, "/admin/api/v1/panels/esign_agreements/"+fixtureSet.ImportedAgreementID+"?"+query)

	candidateWarnings, ok := importedDocumentLineage["candidate_warning_summary"].([]any)
	if !ok || len(candidateWarnings) == 0 {
		t.Fatalf("expected seeded imported document to expose candidate warnings, got %+v", importedDocumentLineage["candidate_warning_summary"])
	}

	importedSource, ok := importedDocumentLineage["source_document"].(map[string]any)
	if !ok {
		t.Fatalf("expected source_document payload on imported detail, got %+v", importedDocumentLineage["source_document"])
	}
	repeatedSource, ok := repeatedDocumentLineage["source_document"].(map[string]any)
	if !ok {
		t.Fatalf("expected source_document payload on repeated detail, got %+v", repeatedDocumentLineage["source_document"])
	}
	importedRevision, ok := importedDocumentLineage["source_revision"].(map[string]any)
	if !ok {
		t.Fatalf("expected source_revision payload on imported detail, got %+v", importedDocumentLineage["source_revision"])
	}
	repeatedRevision, ok := repeatedDocumentLineage["source_revision"].(map[string]any)
	if !ok {
		t.Fatalf("expected source_revision payload on repeated detail, got %+v", repeatedDocumentLineage["source_revision"])
	}
	if fmt.Sprint(importedSource["id"]) == "" || fmt.Sprint(importedSource["id"]) != fmt.Sprint(repeatedSource["id"]) {
		t.Fatalf("expected repeated import QA scenario to share the same source_document_id, imported=%+v repeated=%+v", importedSource, repeatedSource)
	}
	if fmt.Sprint(importedRevision["id"]) == "" || fmt.Sprint(importedRevision["id"]) == fmt.Sprint(repeatedRevision["id"]) {
		t.Fatalf("expected repeated import QA scenario to advance source_revision_id, imported=%+v repeated=%+v", importedRevision, repeatedRevision)
	}

	if newerSourceExists, ok := importedAgreementLineage["newer_source_exists"].(bool); !ok || !newerSourceExists {
		t.Fatalf("expected imported agreement to expose newer_source_exists, got %+v", importedAgreementLineage["newer_source_exists"])
	}
	newerSourceSummary, ok := importedAgreementLineage["newer_source_summary"].(map[string]any)
	if !ok {
		t.Fatalf("expected newer_source_summary payload, got %+v", importedAgreementLineage["newer_source_summary"])
	}
	if fmt.Sprint(newerSourceSummary["pinned_source_revision_id"]) == "" || fmt.Sprint(newerSourceSummary["latest_source_revision_id"]) == "" {
		t.Fatalf("expected newer source summary revision ids, got %+v", newerSourceSummary)
	}
	if fmt.Sprint(newerSourceSummary["pinned_source_revision_id"]) == fmt.Sprint(newerSourceSummary["latest_source_revision_id"]) {
		t.Fatalf("expected newer source summary to differentiate pinned and latest revisions, got %+v", newerSourceSummary)
	}
}

func TestRuntimeAgreementEditPageRedirectsNonDraftAgreementToDetail(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("setup e-sign runtime fixture: %v", err)
	}
	app := fixture.App
	scope := fixture.Module.DefaultScope()
	query := fmt.Sprintf("tenant_id=%s&org_id=%s", url.QueryEscape(scope.TenantID), url.QueryEscape(scope.OrgID))

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	documentID := createPanelRecordWithCookie(t, app, authCookie, "/admin/api/v1/panels/esign_documents?"+query, map[string]any{
		"title":                fmt.Sprintf("Edit Redirect Doc %d", time.Now().UnixNano()),
		"source_original_name": "edit-redirect.pdf",
		"pdf_base64":           base64.StdEncoding.EncodeToString(services.GenerateDeterministicPDF(1)),
	})

	agreementID := createPanelRecordWithCookie(t, app, authCookie, "/admin/api/v1/panels/esign_agreements?"+query, map[string]any{
		"document_id": documentID,
		"title":       fmt.Sprintf("Edit Redirect Agreement %d", time.Now().UnixNano()),
		"message":     "Please review and sign.",
		"participants": []map[string]any{
			{
				"name":          "Redirect Tester",
				"email":         "redirect.tester@example.com",
				"role":          "signer",
				"notify":        true,
				"signing_stage": 1,
			},
		},
		"field_instances": []map[string]any{
			{
				"type":            "signature",
				"recipient_index": 0,
				"page":            1,
				"required":        true,
				"x":               120,
				"y":               160,
				"width":           180,
				"height":          48,
			},
		},
	})

	sendResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/api/v1/panels/esign_agreements/actions/send?id="+url.QueryEscape(agreementID)+"&"+query,
		"application/json",
		strings.NewReader(`{"idempotency_key":"runtime-web-edit-redirect-send"}`),
	)
	defer sendResp.Body.Close()
	if sendResp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(sendResp.Body)
		t.Fatalf("expected send action status 202, got %d body=%s", sendResp.StatusCode, strings.TrimSpace(string(body)))
	}

	deadline := time.Now().Add(5 * time.Second)
	for {
		detailResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/api/v1/panels/esign_agreements/"+agreementID+"?"+query, authCookie)
		record := map[string]any{}
		if detailResp.StatusCode == http.StatusOK {
			payload := map[string]any{}
			_ = json.NewDecoder(detailResp.Body).Decode(&payload)
			record, _ = payload["data"].(map[string]any)
			if record == nil {
				record, _ = payload["record"].(map[string]any)
			}
		}
		detailResp.Body.Close()
		if strings.EqualFold(strings.TrimSpace(fmt.Sprint(record["status"])), stores.AgreementStatusSent) {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for agreement %s to reach sent status", agreementID)
		}
		time.Sleep(50 * time.Millisecond)
	}

	assertRedirectWithCookie(
		t,
		app,
		authCookie,
		http.MethodGet,
		"/admin/content/esign_agreements/"+agreementID+"/edit?"+query,
		"/admin/content/esign_agreements/"+agreementID+"?"+query,
	)
}

func TestRuntimeCoreAdminRoutesResolveAfterLogin(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	assertStatusWithCookie(t, app, authCookie, http.MethodGet, "/admin/users", http.StatusOK)
	assertStatusWithCookie(t, app, authCookie, http.MethodGet, "/admin/roles", http.StatusOK)
	assertStatusWithCookie(t, app, authCookie, http.MethodGet, "/admin/profile", http.StatusOK)
}

func TestRuntimeActivityAPIResolvesAfterLogin(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	assertStatusWithCookie(t, app, authCookie, http.MethodGet, "/admin/api/v1/activity", http.StatusOK)
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

	landingResp := doRequestWithCookie(t, app, http.MethodGet, "/admin", authCookie)
	defer landingResp.Body.Close()
	if landingResp.StatusCode != http.StatusOK {
		t.Fatalf("expected authenticated /admin status 200, got %d", landingResp.StatusCode)
	}
	body, err := io.ReadAll(landingResp.Body)
	if err != nil {
		t.Fatalf("read /admin body: %v", err)
	}
	if !strings.Contains(string(body), "E-Sign") {
		t.Fatalf("expected landing page content in response body")
	}
	assertRedirectWithCookie(t, app, authCookie, http.MethodGet, "/admin/dashboard", "/admin")
	assertRedirectWithCookie(t, app, authCookie, http.MethodGet, "/admin/esign", "/admin")

	documentsResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_documents", authCookie)
	defer documentsResp.Body.Close()
	if documentsResp.StatusCode != http.StatusOK {
		t.Fatalf("expected /admin/content/esign_documents status 200, got %d", documentsResp.StatusCode)
	}

	newDocumentResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_documents/new", authCookie)
	defer newDocumentResp.Body.Close()
	if newDocumentResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(newDocumentResp.Body)
		t.Fatalf("expected /admin/content/esign_documents/new status 200, got %d body=%s", newDocumentResp.StatusCode, strings.TrimSpace(string(body)))
	}

	agreementsResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_agreements", authCookie)
	defer agreementsResp.Body.Close()
	if agreementsResp.StatusCode != http.StatusOK {
		t.Fatalf("expected /admin/content/esign_agreements status 200, got %d", agreementsResp.StatusCode)
	}

	newAgreementResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_agreements/new", authCookie)
	defer newAgreementResp.Body.Close()
	if newAgreementResp.StatusCode != http.StatusOK {
		t.Fatalf("expected /admin/content/esign_agreements/new status 200, got %d", newAgreementResp.StatusCode)
	}
	newAgreementBody, err := io.ReadAll(newAgreementResp.Body)
	if err != nil {
		t.Fatalf("read /admin/content/esign_agreements/new body: %v", err)
	}
	if !strings.Contains(string(newAgreementBody), `action="/admin/content/esign_agreements"`) {
		t.Fatalf("expected agreement create form action to target /admin/content/esign_agreements")
	}

	statsReq := httptest.NewRequest(http.MethodGet, "https://localhost:8082/admin/api/v1/esign/agreements/stats", nil)
	statsReq.Host = "localhost:8082"
	if authCookie != nil {
		statsReq.AddCookie(authCookie)
	}
	statsResp, err := app.Test(statsReq, -1)
	if err != nil {
		t.Fatalf("request failed (GET /admin/api/v1/esign/agreements/stats): %v", err)
	}
	defer statsResp.Body.Close()
	if statsResp.StatusCode != http.StatusOK {
		t.Fatalf("expected /admin/api/v1/esign/agreements/stats status 200, got %d", statsResp.StatusCode)
	}

	dashboardAPIResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/api/v1/dashboard", authCookie)
	defer dashboardAPIResp.Body.Close()
	if dashboardAPIResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(dashboardAPIResp.Body)
		t.Fatalf("expected /admin/api/v1/dashboard status 200, got %d body=%s", dashboardAPIResp.StatusCode, strings.TrimSpace(string(body)))
	}
}

func TestRuntimeLandingRendersRecentAgreementsFromStoreData(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("setup e-sign runtime app fixture: %v", err)
	}
	app := fixture.App
	scope := fixture.Module.DefaultScope()
	query := fmt.Sprintf("tenant_id=%s&org_id=%s", url.QueryEscape(scope.TenantID), url.QueryEscape(scope.OrgID))

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	documentID := createPanelRecordWithCookie(t, app, authCookie, "/admin/api/v1/panels/esign_documents?"+query, map[string]any{
		"title":                fmt.Sprintf("Landing Recent Doc %d", time.Now().UnixNano()),
		"source_original_name": "landing-recent-doc.pdf",
		"pdf_base64":           base64.StdEncoding.EncodeToString(services.GenerateDeterministicPDF(1)),
	})
	agreementTitle := fmt.Sprintf("Landing Recent Agreement %d", time.Now().UnixNano())
	createPanelRecordWithCookie(t, app, authCookie, "/admin/api/v1/panels/esign_agreements?"+query, map[string]any{
		"document_id": documentID,
		"title":       agreementTitle,
		"message":     "Landing recent agreement verification",
	})

	landingResp := doRequestWithCookie(t, app, http.MethodGet, "/admin?"+query, authCookie)
	defer landingResp.Body.Close()
	if landingResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(landingResp.Body)
		t.Fatalf("expected /admin status 200, got %d body=%s", landingResp.StatusCode, strings.TrimSpace(string(body)))
	}
	landingBody, err := io.ReadAll(landingResp.Body)
	if err != nil {
		t.Fatalf("read /admin body: %v", err)
	}
	landingMarkup := string(landingBody)
	if !strings.Contains(landingMarkup, agreementTitle) {
		t.Fatalf("expected landing page recent agreements to contain %q", agreementTitle)
	}
	if strings.Contains(landingMarkup, "No agreements yet") {
		t.Fatalf("expected landing page to avoid empty-state recent agreements message when records exist")
	}
}

func TestRuntimeESignDocumentUploadEndpointStoresPDFAndReturnsObjectKey(t *testing.T) {
	app := setupESignRuntimeWebApp(t)

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	fileWriter, err := writer.CreateFormFile("file", "msa.pdf")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := fileWriter.Write(services.GenerateDeterministicPDF(1)); err != nil {
		t.Fatalf("write pdf payload: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/upload", &body)
	req.Host = "localhost:8082"
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.AddCookie(authCookie)

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("upload request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected upload status 200, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(payload)))
	}
	payload := map[string]any{}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode upload payload: %v", err)
	}
	objectKey := strings.TrimSpace(fmt.Sprint(payload["object_key"]))
	if objectKey == "" {
		t.Fatalf("expected object_key in upload response, got %+v", payload)
	}
	if matched, _ := regexp.MatchString(`^tenant/[^/]+/org/[^/]+/docs/`, objectKey); !matched {
		t.Fatalf("expected tenant/org scoped object key, got %q", objectKey)
	}
	if strings.TrimSpace(fmt.Sprint(payload["url"])) == "" {
		t.Fatalf("expected url in upload response, got %+v", payload)
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

func TestApplyESignRuntimeDefaultsSetsDebugAdminLayout(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "E-Sign Test", "en")
	applyESignRuntimeDefaults(&cfg)
	if cfg.Debug.LayoutMode != coreadmin.DebugLayoutAdmin {
		t.Fatalf("expected debug layout mode admin, got %q", cfg.Debug.LayoutMode)
	}

	cfg.Debug.LayoutMode = coreadmin.DebugLayoutStandalone
	applyESignRuntimeDefaults(&cfg)
	if cfg.Debug.LayoutMode != coreadmin.DebugLayoutStandalone {
		t.Fatalf("expected explicit debug layout mode to remain unchanged, got %q", cfg.Debug.LayoutMode)
	}
}

func TestLoadESignAuthSeedResolvesRelativeConfigPath(t *testing.T) {
	tempDir := t.TempDir()
	seedPath := path.Join(tempDir, "dev_seed.json")
	seedPayload := `{"auth":{"admin_id":"seed-admin-id","admin_email":"seed@example.com","admin_role":"admin","admin_password":"seed-password","signing_key":"seed-signing-key","context_key":"seed-context"}}`
	if err := os.WriteFile(seedPath, []byte(seedPayload), 0o600); err != nil {
		t.Fatalf("write seed file: %v", err)
	}

	runtimeCfg := appcfg.Defaults()
	runtimeCfg.ConfigPath = path.Join(tempDir, "app.json")
	runtimeCfg.Auth.SeedFile = "dev_seed.json"
	runtimeCfg.Auth.AdminID = ""
	runtimeCfg.Auth.AdminEmail = ""
	runtimeCfg.Auth.AdminPassword = ""
	runtimeCfg.Auth.SigningKey = ""
	runtimeCfg.Auth.ContextKey = ""

	seed, err := loadESignAuthSeed(runtimeCfg)
	if err != nil {
		t.Fatalf("load seed: %v", err)
	}
	if strings.TrimSpace(seed.AdminID) != "seed-admin-id" {
		t.Fatalf("expected seed admin id, got %q", seed.AdminID)
	}
	if strings.TrimSpace(seed.SigningKey) != "seed-signing-key" {
		t.Fatalf("expected seed signing key, got %q", seed.SigningKey)
	}
}

func TestRuntimeSignerWebE2ERecipientJourneyFromSignLinkToSubmit(t *testing.T) {
	jobs.ResetCapturedRecipientLinks()
	t.Cleanup(jobs.ResetCapturedRecipientLinks)

	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("setup e-sign runtime app fixture: %v", err)
	}
	app := fixture.App
	esignModule := fixture.Module
	scope := esignModule.DefaultScope()
	query := fmt.Sprintf("tenant_id=%s&org_id=%s", url.QueryEscape(scope.TenantID), url.QueryEscape(scope.OrgID))

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	var uploadBody bytes.Buffer
	uploadWriter := multipart.NewWriter(&uploadBody)
	fileWriter, err := uploadWriter.CreateFormFile("file", "e2e.pdf")
	if err != nil {
		t.Fatalf("create upload file: %v", err)
	}
	if _, err := fileWriter.Write(services.GenerateDeterministicPDF(1)); err != nil {
		t.Fatalf("write upload payload: %v", err)
	}
	if err := uploadWriter.Close(); err != nil {
		t.Fatalf("close upload writer: %v", err)
	}

	uploadReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/upload?"+query, &uploadBody)
	uploadReq.Host = "localhost:8082"
	uploadReq.Header.Set("Content-Type", uploadWriter.FormDataContentType())
	uploadReq.AddCookie(authCookie)
	uploadResp, err := app.Test(uploadReq, -1)
	if err != nil {
		t.Fatalf("upload request failed: %v", err)
	}
	defer uploadResp.Body.Close()
	if uploadResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(uploadResp.Body)
		t.Fatalf("expected upload status 200, got %d body=%s", uploadResp.StatusCode, strings.TrimSpace(string(body)))
	}
	uploadPayload := map[string]any{}
	if err := json.NewDecoder(uploadResp.Body).Decode(&uploadPayload); err != nil {
		t.Fatalf("decode upload payload: %v", err)
	}
	objectKey := strings.TrimSpace(fmt.Sprint(uploadPayload["object_key"]))
	if objectKey == "" {
		t.Fatalf("expected object_key in upload payload, got %+v", uploadPayload)
	}

	documentTitle := fmt.Sprintf("Signer Journey Document %d", time.Now().UnixNano())
	documentReqBody := url.Values{}
	documentReqBody.Set("title", documentTitle)
	documentReqBody.Set("source_object_key", objectKey)
	documentReqBody.Set("source_original_name", "signer-journey-document.pdf")
	createDocumentResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/content/esign_documents?"+query,
		"application/x-www-form-urlencoded",
		strings.NewReader(documentReqBody.Encode()),
	)
	defer createDocumentResp.Body.Close()
	if createDocumentResp.StatusCode != http.StatusFound {
		body, _ := io.ReadAll(createDocumentResp.Body)
		t.Fatalf("expected document create redirect 302, got %d body=%s", createDocumentResp.StatusCode, strings.TrimSpace(string(body)))
	}
	documentLocation := strings.TrimSpace(createDocumentResp.Header.Get("Location"))
	documentID := parseIDFromLocation("/admin/content/esign_documents/", documentLocation)
	if documentID == "" {
		t.Fatalf("expected document id in location header, got %q", documentLocation)
	}

	agreementTitle := fmt.Sprintf("Signer Journey Agreement %d", time.Now().UnixNano())
	agreementReqBody := url.Values{}
	agreementReqBody.Set("document_id", documentID)
	agreementReqBody.Set("title", agreementTitle)
	agreementReqBody.Set("message", "Please sign this agreement.")
	agreementReqBody.Set("recipients_present", "1")
	agreementReqBody.Set("fields_present", "1")
	agreementReqBody.Set("recipients[0].name", "Signer E2E")
	agreementReqBody.Set("recipients[0].email", "signer.e2e@example.com")
	agreementReqBody.Set("recipients[0].role", "signer")
	agreementReqBody.Set("fields[0].type", "signature")
	agreementReqBody.Set("fields[0].recipient_index", "0")
	agreementReqBody.Set("fields[0].page", "1")
	agreementReqBody.Set("fields[0].required", "on")

	createAgreementResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/content/esign_agreements?"+query,
		"application/x-www-form-urlencoded",
		strings.NewReader(agreementReqBody.Encode()),
	)
	defer createAgreementResp.Body.Close()
	if createAgreementResp.StatusCode != http.StatusFound {
		body, _ := io.ReadAll(createAgreementResp.Body)
		t.Fatalf("expected agreement create redirect 302, got %d body=%s", createAgreementResp.StatusCode, strings.TrimSpace(string(body)))
	}
	agreementLocation := strings.TrimSpace(createAgreementResp.Header.Get("Location"))
	agreementID := parseIDFromLocation("/admin/content/esign_agreements/", agreementLocation)
	if agreementID == "" {
		t.Fatalf("expected agreement id in location header, got %q", agreementLocation)
	}

	detailResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/api/v1/panels/esign_agreements/"+agreementID+"?"+query, authCookie)
	defer detailResp.Body.Close()
	if detailResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(detailResp.Body)
		t.Fatalf("expected agreement detail status 200, got %d body=%s", detailResp.StatusCode, strings.TrimSpace(string(body)))
	}
	detailPayload := map[string]any{}
	if err := json.NewDecoder(detailResp.Body).Decode(&detailPayload); err != nil {
		t.Fatalf("decode agreement detail payload: %v", err)
	}

	record, _ := detailPayload["record"].(map[string]any)
	if record == nil {
		record, _ = detailPayload["data"].(map[string]any)
	}
	if record == nil {
		record = detailPayload
	}
	recipientID := firstNestedID(record, "recipients")
	signatureFieldID := firstSignatureFieldID(record)
	if recipientID == "" {
		t.Fatalf("expected recipient id in agreement detail payload: %+v", detailPayload)
	}
	if signatureFieldID == "" {
		t.Fatalf("expected signature field id in agreement detail payload: %+v", detailPayload)
	}

	sendResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/api/v1/panels/esign_agreements/actions/send?id="+url.QueryEscape(agreementID)+"&"+query,
		"application/json",
		strings.NewReader(`{"idempotency_key":"runtime-web-e2e-send-1"}`),
	)
	defer sendResp.Body.Close()
	if sendResp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(sendResp.Body)
		t.Fatalf("expected send action status 202, got %d body=%s", sendResp.StatusCode, strings.TrimSpace(string(body)))
	}

	signerToken := waitForCapturedSignerToken(t, scope, agreementID, recipientID)

	reviewPageResp := doRequest(t, app, http.MethodGet, "/sign/"+url.PathEscape(signerToken), "", nil)
	defer reviewPageResp.Body.Close()
	if reviewPageResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(reviewPageResp.Body)
		t.Fatalf("expected signer review page status 200, got %d body=%s", reviewPageResp.StatusCode, strings.TrimSpace(string(body)))
	}
	reviewPageBody, err := io.ReadAll(reviewPageResp.Body)
	if err != nil {
		t.Fatalf("read signer review page body: %v", err)
	}
	reviewMarkup := string(reviewPageBody)
	if !strings.Contains(reviewMarkup, `/admin/assets/output.css`) {
		t.Fatalf("expected signer review page to reference /admin/assets/output.css, got %s", strings.TrimSpace(reviewMarkup))
	}
	if !strings.Contains(reviewMarkup, `/admin/assets/dist/toast/init.js`) {
		t.Fatalf("expected signer review page to reference /admin/assets/dist/toast/init.js, got %s", strings.TrimSpace(reviewMarkup))
	}
	if strings.Contains(reviewMarkup, `href="/assets/output.css"`) || strings.Contains(reviewMarkup, `src="/assets/dist/toast/init.js"`) {
		t.Fatalf("expected signer review page to avoid root /assets references, got %s", strings.TrimSpace(reviewMarkup))
	}

	assetsCSSResp := doRequest(t, app, http.MethodGet, "/admin/assets/output.css", "", nil)
	defer assetsCSSResp.Body.Close()
	if assetsCSSResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(assetsCSSResp.Body)
		t.Fatalf("expected /admin/assets/output.css status 200, got %d body=%s", assetsCSSResp.StatusCode, strings.TrimSpace(string(body)))
	}
	assetsToastResp := doRequest(t, app, http.MethodGet, "/admin/assets/dist/toast/init.js", "", nil)
	defer assetsToastResp.Body.Close()
	if assetsToastResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(assetsToastResp.Body)
		t.Fatalf("expected /admin/assets/dist/toast/init.js status 200, got %d body=%s", assetsToastResp.StatusCode, strings.TrimSpace(string(body)))
	}

	consentResp := doRequestWithBody(
		t,
		app,
		http.MethodPost,
		"/api/v1/esign/signing/consent/"+url.PathEscape(signerToken),
		"application/json",
		strings.NewReader(`{"accepted":true}`),
		map[string]string{"X-Forwarded-Proto": "https"},
	)
	defer consentResp.Body.Close()
	if consentResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(consentResp.Body)
		t.Fatalf("expected signer consent status 200, got %d body=%s", consentResp.StatusCode, strings.TrimSpace(string(body)))
	}

	signaturePayload := fmt.Sprintf(`{"field_instance_id":"%s","type":"typed","object_key":"tenant/%s/org/%s/agreements/%s/sig/runtime-e2e-signature.png","sha256":"%s","value_text":"Signer E2E"}`,
		signatureFieldID,
		scope.TenantID,
		scope.OrgID,
		agreementID,
		strings.Repeat("a", 64),
	)
	signatureResp := doRequestWithBody(
		t,
		app,
		http.MethodPost,
		"/api/v1/esign/signing/field-values/signature/"+url.PathEscape(signerToken),
		"application/json",
		strings.NewReader(signaturePayload),
		map[string]string{"X-Forwarded-Proto": "https"},
	)
	defer signatureResp.Body.Close()
	if signatureResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(signatureResp.Body)
		t.Fatalf("expected signer signature status 200, got %d body=%s", signatureResp.StatusCode, strings.TrimSpace(string(body)))
	}

	submitResp := doRequestWithBody(
		t,
		app,
		http.MethodPost,
		"/api/v1/esign/signing/submit/"+url.PathEscape(signerToken),
		"application/json",
		strings.NewReader(`{}`),
		map[string]string{
			"Idempotency-Key":   "runtime-web-e2e-submit-1",
			"X-Forwarded-Proto": "https",
		},
	)
	defer submitResp.Body.Close()
	if submitResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(submitResp.Body)
		t.Fatalf("expected signer submit status 200, got %d body=%s", submitResp.StatusCode, strings.TrimSpace(string(body)))
	}
	submitBody, err := io.ReadAll(submitResp.Body)
	if err != nil {
		t.Fatalf("read signer submit payload: %v", err)
	}
	if !strings.Contains(string(submitBody), `"completed":true`) {
		t.Fatalf("expected completed=true in submit payload, got %s", strings.TrimSpace(string(submitBody)))
	}

	completePageResp := doRequest(t, app, http.MethodGet, "/sign/"+url.PathEscape(signerToken)+"/complete", "", nil)
	defer completePageResp.Body.Close()
	if completePageResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(completePageResp.Body)
		t.Fatalf("expected signer complete page status 200, got %d body=%s", completePageResp.StatusCode, strings.TrimSpace(string(body)))
	}
	completeBody, err := io.ReadAll(completePageResp.Body)
	if err != nil {
		t.Fatalf("read complete page body: %v", err)
	}
	if !strings.Contains(strings.ToLower(string(completeBody)), "completed") {
		t.Fatalf("expected completion page body to mention completion, got %s", strings.TrimSpace(string(completeBody)))
	}
	completeMarkup := string(completeBody)
	if !strings.Contains(completeMarkup, "Download Copy") {
		t.Fatalf("expected completion page to expose downloadable action, got %s", strings.TrimSpace(completeMarkup))
	}
	expectedAssetURL := "/api/v1/esign/signing/assets/" + url.PathEscape(signerToken)
	if !strings.Contains(completeMarkup, expectedAssetURL) {
		t.Fatalf("expected completion page to include signer asset URL %q, got %s", expectedAssetURL, strings.TrimSpace(completeMarkup))
	}
}

func TestRuntimeSignerWebE2EUnifiedFlowConsentFieldSignatureSubmit(t *testing.T) {
	jobs.ResetCapturedRecipientLinks()
	t.Cleanup(jobs.ResetCapturedRecipientLinks)

	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("setup e-sign runtime app fixture: %v", err)
	}
	app := fixture.App
	esignModule := fixture.Module
	scope := esignModule.DefaultScope()
	query := fmt.Sprintf("tenant_id=%s&org_id=%s", url.QueryEscape(scope.TenantID), url.QueryEscape(scope.OrgID))

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}

	var uploadBody bytes.Buffer
	uploadWriter := multipart.NewWriter(&uploadBody)
	fileWriter, err := uploadWriter.CreateFormFile("file", "unified-e2e.pdf")
	if err != nil {
		t.Fatalf("create upload file: %v", err)
	}
	if _, err := fileWriter.Write(services.GenerateDeterministicPDF(1)); err != nil {
		t.Fatalf("write upload payload: %v", err)
	}
	if err := uploadWriter.Close(); err != nil {
		t.Fatalf("close upload writer: %v", err)
	}

	uploadReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/upload?"+query, &uploadBody)
	uploadReq.Host = "localhost:8082"
	uploadReq.Header.Set("Content-Type", uploadWriter.FormDataContentType())
	uploadReq.AddCookie(authCookie)
	uploadResp, err := app.Test(uploadReq, -1)
	if err != nil {
		t.Fatalf("upload request failed: %v", err)
	}
	defer uploadResp.Body.Close()
	if uploadResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(uploadResp.Body)
		t.Fatalf("expected upload status 200, got %d body=%s", uploadResp.StatusCode, strings.TrimSpace(string(body)))
	}
	uploadPayload := map[string]any{}
	if err := json.NewDecoder(uploadResp.Body).Decode(&uploadPayload); err != nil {
		t.Fatalf("decode upload payload: %v", err)
	}
	objectKey := strings.TrimSpace(fmt.Sprint(uploadPayload["object_key"]))
	if objectKey == "" {
		t.Fatalf("expected object_key in upload payload, got %+v", uploadPayload)
	}

	documentReqBody := url.Values{}
	documentReqBody.Set("title", fmt.Sprintf("Unified Journey Doc %d", time.Now().UnixNano()))
	documentReqBody.Set("source_object_key", objectKey)
	documentReqBody.Set("source_original_name", "unified-journey-document.pdf")
	createDocumentResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/content/esign_documents?"+query,
		"application/x-www-form-urlencoded",
		strings.NewReader(documentReqBody.Encode()),
	)
	defer createDocumentResp.Body.Close()
	if createDocumentResp.StatusCode != http.StatusFound {
		body, _ := io.ReadAll(createDocumentResp.Body)
		t.Fatalf("expected document create redirect 302, got %d body=%s", createDocumentResp.StatusCode, strings.TrimSpace(string(body)))
	}
	documentID := parseIDFromLocation("/admin/content/esign_documents/", strings.TrimSpace(createDocumentResp.Header.Get("Location")))
	if documentID == "" {
		t.Fatal("expected document id in create response location")
	}

	agreementReqBody := url.Values{}
	agreementReqBody.Set("document_id", documentID)
	agreementReqBody.Set("title", fmt.Sprintf("Unified Journey Agreement %d", time.Now().UnixNano()))
	agreementReqBody.Set("message", "Please sign this agreement.")
	agreementReqBody.Set("recipients_present", "1")
	agreementReqBody.Set("fields_present", "2")
	agreementReqBody.Set("recipients[0].name", "Unified Signer")
	agreementReqBody.Set("recipients[0].email", "unified.signer@example.com")
	agreementReqBody.Set("recipients[0].role", "signer")
	agreementReqBody.Set("fields[0].type", "signature")
	agreementReqBody.Set("fields[0].recipient_index", "0")
	agreementReqBody.Set("fields[0].page", "1")
	agreementReqBody.Set("fields[0].required", "on")
	agreementReqBody.Set("fields[0].x", "72")
	agreementReqBody.Set("fields[0].y", "120")
	agreementReqBody.Set("fields[0].width", "220")
	agreementReqBody.Set("fields[0].height", "42")
	agreementReqBody.Set("fields[1].type", "text")
	agreementReqBody.Set("fields[1].recipient_index", "0")
	agreementReqBody.Set("fields[1].page", "1")
	agreementReqBody.Set("fields[1].required", "on")
	agreementReqBody.Set("fields[1].x", "72")
	agreementReqBody.Set("fields[1].y", "180")
	agreementReqBody.Set("fields[1].width", "280")
	agreementReqBody.Set("fields[1].height", "32")

	createAgreementResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/content/esign_agreements?"+query,
		"application/x-www-form-urlencoded",
		strings.NewReader(agreementReqBody.Encode()),
	)
	defer createAgreementResp.Body.Close()
	if createAgreementResp.StatusCode != http.StatusFound {
		body, _ := io.ReadAll(createAgreementResp.Body)
		t.Fatalf("expected agreement create redirect 302, got %d body=%s", createAgreementResp.StatusCode, strings.TrimSpace(string(body)))
	}
	agreementID := parseIDFromLocation("/admin/content/esign_agreements/", strings.TrimSpace(createAgreementResp.Header.Get("Location")))
	if agreementID == "" {
		t.Fatal("expected agreement id in create response location")
	}

	detailResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/api/v1/panels/esign_agreements/"+agreementID+"?"+query, authCookie)
	defer detailResp.Body.Close()
	if detailResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(detailResp.Body)
		t.Fatalf("expected agreement detail status 200, got %d body=%s", detailResp.StatusCode, strings.TrimSpace(string(body)))
	}
	detailPayload := map[string]any{}
	if err := json.NewDecoder(detailResp.Body).Decode(&detailPayload); err != nil {
		t.Fatalf("decode agreement detail payload: %v", err)
	}
	record, _ := detailPayload["record"].(map[string]any)
	if record == nil {
		record, _ = detailPayload["data"].(map[string]any)
	}
	if record == nil {
		record = detailPayload
	}
	recipientID := firstNestedID(record, "recipients")
	textFieldID := firstFieldIDByType(record, "text")
	signatureFieldID := firstFieldIDByType(record, "signature")
	if recipientID == "" || textFieldID == "" || signatureFieldID == "" {
		t.Fatalf("expected recipient + text + signature field ids in detail payload, got %+v", detailPayload)
	}

	sendResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/api/v1/panels/esign_agreements/actions/send?id="+url.QueryEscape(agreementID)+"&"+query,
		"application/json",
		strings.NewReader(`{"idempotency_key":"runtime-web-unified-send-1"}`),
	)
	defer sendResp.Body.Close()
	if sendResp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(sendResp.Body)
		t.Fatalf("expected send action status 202, got %d body=%s", sendResp.StatusCode, strings.TrimSpace(string(body)))
	}

	signerToken := waitForCapturedSignerToken(t, scope, agreementID, recipientID)

	entryResp := doRequest(t, app, http.MethodGet, "/sign/"+url.PathEscape(signerToken), "", nil)
	defer entryResp.Body.Close()
	if entryResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(entryResp.Body)
		t.Fatalf("expected signer unified review page status 200, got %d body=%s", entryResp.StatusCode, strings.TrimSpace(string(body)))
	}
	if location := strings.TrimSpace(entryResp.Header.Get("Location")); location != "" {
		t.Fatalf("expected direct unified render on /sign/:token, got redirect %q", location)
	}
	reviewBody, err := io.ReadAll(entryResp.Body)
	if err != nil {
		t.Fatalf("read review page body: %v", err)
	}
	reviewMarkup := string(reviewBody)
	reviewConfig := extractJSONScriptPayloadFromHTML(t, reviewMarkup, "esign-signer-review-config")
	if got := strings.TrimSpace(fmt.Sprint(reviewConfig["flowMode"])); got != "unified" {
		t.Fatalf("expected unified flow mode in signer review config, got %q payload=%+v", got, reviewConfig)
	}
	if got := strings.TrimSpace(fmt.Sprint(reviewConfig["resourceBasePath"])); got != "/api/v1/esign/signing/session/"+url.PathEscape(signerToken) {
		t.Fatalf("expected resourceBasePath to match signer session route, got %q payload=%+v", got, reviewConfig)
	}
	if got := strings.TrimSpace(fmt.Sprint(reviewConfig["reviewApiPath"])); got != "/api/v1/esign/signing/session/"+url.PathEscape(signerToken)+"/review" {
		t.Fatalf("expected reviewApiPath to match signer review route, got %q payload=%+v", got, reviewConfig)
	}
	if got := strings.TrimSpace(fmt.Sprint(reviewConfig["assetContractPath"])); got != "/api/v1/esign/signing/assets/"+url.PathEscape(signerToken) {
		t.Fatalf("expected assetContractPath to match signer assets route, got %q payload=%+v", got, reviewConfig)
	}
	if got := strings.TrimSpace(fmt.Sprint(reviewConfig["telemetryPath"])); got != "/api/v1/esign/signing/telemetry/"+url.PathEscape(signerToken) {
		t.Fatalf("expected telemetryPath to match signer telemetry route, got %q payload=%+v", got, reviewConfig)
	}
	if _, exists := reviewConfig["documentUrl"]; exists {
		t.Fatalf("expected signer review config to omit documentUrl, got payload=%+v", reviewConfig)
	}
	if got := strings.TrimSpace(fmt.Sprint(reviewConfig["uiMode"])); got != services.SignerSessionUIModeSign {
		t.Fatalf("expected uiMode %q in signer review config, got %q payload=%+v", services.SignerSessionUIModeSign, got, reviewConfig)
	}
	if got := strings.TrimSpace(fmt.Sprint(reviewConfig["defaultTab"])); got != services.SignerSessionDefaultTabSign {
		t.Fatalf("expected defaultTab %q in signer review config, got %q payload=%+v", services.SignerSessionDefaultTabSign, got, reviewConfig)
	}
	if got, ok := reviewConfig["reviewMarkersVisible"].(bool); !ok || got {
		t.Fatalf("expected reviewMarkersVisible=false in signer review config, got %+v payload=%+v", reviewConfig["reviewMarkersVisible"], reviewConfig)
	}
	if got, ok := reviewConfig["reviewMarkersInteractive"].(bool); !ok || got {
		t.Fatalf("expected reviewMarkersInteractive=false in signer review config, got %+v payload=%+v", reviewConfig["reviewMarkersInteractive"], reviewConfig)
	}
	viewerCfg, ok := reviewConfig["viewer"].(map[string]any)
	if !ok {
		t.Fatalf("expected viewer config object, got %+v", reviewConfig["viewer"])
	}
	for _, key := range []string{"compatibilityTier", "compatibilityReason", "compatibilityMessage"} {
		if _, exists := viewerCfg[key]; !exists {
			t.Fatalf("expected signer review viewer config key %q, got %+v", key, viewerCfg)
		}
	}

	sessionResp := doRequestWithBody(
		t,
		app,
		http.MethodGet,
		"/api/v1/esign/signing/session/"+url.PathEscape(signerToken),
		"",
		nil,
		map[string]string{"X-Forwarded-Proto": "https"},
	)
	defer sessionResp.Body.Close()
	if sessionResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(sessionResp.Body)
		t.Fatalf("expected signer session API status 200, got %d body=%s", sessionResp.StatusCode, strings.TrimSpace(string(body)))
	}
	sessionPayload, err := io.ReadAll(sessionResp.Body)
	if err != nil {
		t.Fatalf("read signer session payload: %v", err)
	}
	sessionBody := string(sessionPayload)
	for _, key := range []string{"\"document_name\":", "\"page_count\":", "\"viewer\":", "\"recipient_id\":", "\"ui_mode\":\"sign\"", "\"default_tab\":\"sign\"", "\"review_markers_visible\":false", "\"review_markers_interactive\":false", "\"pos_x\":", "\"pos_y\":", "\"width\":", "\"height\":"} {
		if !strings.Contains(sessionBody, key) {
			t.Fatalf("expected key %s in signer session payload, got %s", key, sessionBody)
		}
	}

	consentResp := doRequestWithBody(
		t,
		app,
		http.MethodPost,
		"/api/v1/esign/signing/consent/"+url.PathEscape(signerToken),
		"application/json",
		strings.NewReader(`{"accepted":true}`),
		map[string]string{"X-Forwarded-Proto": "https"},
	)
	defer consentResp.Body.Close()
	if consentResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(consentResp.Body)
		t.Fatalf("expected signer consent status 200, got %d body=%s", consentResp.StatusCode, strings.TrimSpace(string(body)))
	}

	fieldValueResp := doRequestWithBody(
		t,
		app,
		http.MethodPost,
		"/api/v1/esign/signing/field-values/"+url.PathEscape(signerToken),
		"application/json",
		strings.NewReader(`{"field_instance_id":"`+textFieldID+`","value_text":"Unified Signer"}`),
		map[string]string{"X-Forwarded-Proto": "https"},
	)
	defer fieldValueResp.Body.Close()
	if fieldValueResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(fieldValueResp.Body)
		t.Fatalf("expected signer field-values status 200, got %d body=%s", fieldValueResp.StatusCode, strings.TrimSpace(string(body)))
	}

	signaturePayload := fmt.Sprintf(`{"field_instance_id":"%s","type":"typed","object_key":"tenant/%s/org/%s/agreements/%s/sig/runtime-unified-signature.png","sha256":"%s","value_text":"Unified Signer"}`,
		signatureFieldID,
		scope.TenantID,
		scope.OrgID,
		agreementID,
		strings.Repeat("c", 64),
	)
	signatureResp := doRequestWithBody(
		t,
		app,
		http.MethodPost,
		"/api/v1/esign/signing/field-values/signature/"+url.PathEscape(signerToken),
		"application/json",
		strings.NewReader(signaturePayload),
		map[string]string{"X-Forwarded-Proto": "https"},
	)
	defer signatureResp.Body.Close()
	if signatureResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(signatureResp.Body)
		t.Fatalf("expected signer signature status 200, got %d body=%s", signatureResp.StatusCode, strings.TrimSpace(string(body)))
	}

	submitResp := doRequestWithBody(
		t,
		app,
		http.MethodPost,
		"/api/v1/esign/signing/submit/"+url.PathEscape(signerToken),
		"application/json",
		strings.NewReader(`{}`),
		map[string]string{
			"Idempotency-Key":   "runtime-web-unified-submit-1",
			"X-Forwarded-Proto": "https",
		},
	)
	defer submitResp.Body.Close()
	if submitResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(submitResp.Body)
		t.Fatalf("expected signer submit status 200, got %d body=%s", submitResp.StatusCode, strings.TrimSpace(string(body)))
	}
	submitBody, err := io.ReadAll(submitResp.Body)
	if err != nil {
		t.Fatalf("read submit response body: %v", err)
	}
	if !strings.Contains(string(submitBody), `"completed":true`) {
		t.Fatalf("expected completed submit payload, got %s", strings.TrimSpace(string(submitBody)))
	}

	replayResp := doRequestWithBody(
		t,
		app,
		http.MethodPost,
		"/api/v1/esign/signing/submit/"+url.PathEscape(signerToken),
		"application/json",
		strings.NewReader(`{}`),
		map[string]string{
			"Idempotency-Key":   "runtime-web-unified-submit-1",
			"X-Forwarded-Proto": "https",
		},
	)
	defer replayResp.Body.Close()
	if replayResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(replayResp.Body)
		t.Fatalf("expected signer submit replay status 200, got %d body=%s", replayResp.StatusCode, strings.TrimSpace(string(body)))
	}
}

func TestBuildSignerReviewViewContextPinsClientEndpointsToBackendRoutes(t *testing.T) {
	session := services.SignerSessionContext{
		SessionKind:  "reviewer",
		AgreementID:  "agreement-1",
		DocumentName: "Agreement.pdf",
		PageCount:    2,
	}

	publicCtx := buildSignerReviewViewContext(
		"token-123",
		"/api/v1/esign/signing",
		"/review",
		"/api/v1/esign/signing/session/token-123",
		session,
	)
	if got := strings.TrimSpace(fmt.Sprint(publicCtx["review_api_path"])); got != "/api/v1/esign/signing/session/token-123/review" {
		t.Fatalf("expected public review_api_path, got %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(publicCtx["asset_contract_path"])); got != "/api/v1/esign/signing/assets/token-123" {
		t.Fatalf("expected public asset_contract_path, got %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(publicCtx["telemetry_path"])); got != "/api/v1/esign/signing/telemetry/token-123" {
		t.Fatalf("expected public telemetry_path, got %q", got)
	}
	if _, exists := publicCtx["document_url"]; exists {
		t.Fatalf("expected public signer review context to omit document_url, got %+v", publicCtx)
	}

	senderCtx := buildSignerReviewViewContext(
		"",
		"/admin/api/v1/esign",
		"/admin/esign/agreements",
		"/admin/api/v1/esign/agreements/agreement-1/viewer",
		session,
	)
	if got := strings.TrimSpace(fmt.Sprint(senderCtx["review_api_path"])); got != "/admin/api/v1/esign/agreements/agreement-1/viewer/review" {
		t.Fatalf("expected sender review_api_path, got %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(senderCtx["asset_contract_path"])); got != "/admin/api/v1/esign/agreements/agreement-1/viewer/assets" {
		t.Fatalf("expected sender asset_contract_path, got %q", got)
	}
	if got := strings.TrimSpace(fmt.Sprint(senderCtx["telemetry_path"])); got != "" {
		t.Fatalf("expected sender telemetry_path to be empty, got %q", got)
	}
	if _, exists := senderCtx["document_url"]; exists {
		t.Fatalf("expected sender signer review context to omit document_url, got %+v", senderCtx)
	}
}

func setupESignRuntimeWebApp(t *testing.T) *fiber.App {
	t.Helper()
	setESignRuntimeTestConfig(false)
	esignRuntimeAppOnce.Do(func() {
		esignRuntimeApp, esignRuntimeAppErr = newESignRuntimeWebAppForTests()
	})
	if esignRuntimeAppErr != nil {
		t.Fatalf("setup e-sign runtime app: %v", esignRuntimeAppErr)
	}
	return esignRuntimeApp
}

func newESignRuntimeWebAppForTests() (*fiber.App, error) {
	return newESignRuntimeWebAppForTestsWithGoogleEnabled(false)
}

func newESignRuntimeWebAppForTestsWithGoogleEnabled(googleEnabled bool) (*fiber.App, error) {
	setESignRuntimeTestConfig(googleEnabled)
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(nil, googleEnabled)
	if err != nil {
		return nil, err
	}
	return fixture.App, nil
}

func setESignRuntimeTestConfig(googleEnabled bool) {
	cfg := appcfg.Defaults()
	cfg.Features.ESignGoogle = googleEnabled
	cfg.Google.ProviderMode = services.GoogleProviderModeDeterministic
	cfg.Google.CredentialActiveKey = "test-google-active-key"
	cfg.Google.CredentialActiveKeyID = "v1"
	cfg.Public.BaseURL = "http://localhost:8082"
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.SQLite.DSN = fmt.Sprintf(
		"file:runtime-web-test-%d-%d?mode=memory&cache=shared&_busy_timeout=5000&_foreign_keys=on",
		os.Getpid(),
		atomic.AddUint64(&esignRuntimeDSNSeq, 1),
	)
	appcfg.SetActive(cfg)
}

type eSignRuntimeWebFixture struct {
	App       *fiber.App
	Module    *modules.ESignModule
	Bootstrap *esignpersistence.BootstrapResult
}

func newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t *testing.T, googleEnabled bool) (eSignRuntimeWebFixture, error) {
	return newESignRuntimeWebFixtureForTestsWithOptions(t, googleEnabled, eSignRuntimeWebFixtureOptions{})
}

type eSignRuntimeWebFixtureOptions struct {
	StoreWrap func(stores.Store) stores.Store
}

func newESignRuntimeWebFixtureForTestsWithOptions(t *testing.T, googleEnabled bool, opts eSignRuntimeWebFixtureOptions) (eSignRuntimeWebFixture, error) {
	if t != nil {
		t.Helper()
	}
	_ = commandregistry.Stop(context.Background())
	bootstrapResult, err := esignpersistence.Bootstrap(context.Background(), appcfg.Active())
	if err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("bootstrap persistence: %w", err)
	}
	if t != nil {
		t.Cleanup(func() { _ = bootstrapResult.Close() })
	}

	cfg := quickstart.NewAdminConfig("/admin", "E-Sign Test", "en")
	applyESignRuntimeDefaults(&cfg)
	cfg.URLs.Admin.APIPrefix = "api"
	cfg.URLs.Admin.APIVersion = "v1"
	cfg.URLs.Public.APIPrefix = "api"
	cfg.URLs.Public.APIVersion = "v1"
	cfg.EnablePublicAPI = true
	adminDeps, err := newESignActivityDependencies()
	if err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("new activity dependencies: %w", err)
	}
	authBundle, err := newESignAuthBundle(cfg)
	if err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("new auth bundle: %w", err)
	}
	adminDeps.Authenticator = authBundle.Authenticator
	adminDeps.Authorizer = authBundle.Authorizer

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithAdminDependencies(adminDeps),
		quickstart.WithFeatureDefaults(map[string]bool{
			"esign":                           true,
			"esign_google":                    googleEnabled,
			string(coreadmin.FeatureActivity): true,
		}),
	)
	if err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("new admin: %w", err)
	}

	bootstrapStore, storeCleanup, err := newESignRuntimeStore(bootstrapResult)
	if err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("new runtime store from bootstrap: %w", err)
	}
	if t != nil && storeCleanup != nil {
		t.Cleanup(func() { _ = storeCleanup() })
	}
	if opts.StoreWrap != nil {
		bootstrapStore = opts.StoreWrap(bootstrapStore)
	}
	esignModule := modules.NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode).
		WithUploadDir(resolveESignDiskAssetsDir()).
		WithStore(bootstrapStore)
	if t != nil {
		t.Cleanup(func() { esignModule.Close() })
		t.Cleanup(func() { _ = commandregistry.Stop(context.Background()) })
	}
	if err := adm.RegisterModule(esignModule); err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("register module: %w", err)
	}
	if shouldSeedESignRuntimeFixtures() {
		if _, _, err := seedESignRuntimeFixtures(context.Background(), cfg.BasePath, esignModule, bootstrapResult); err != nil {
			return eSignRuntimeWebFixture{}, fmt.Errorf("seed runtime fixtures: %w", err)
		}
	}

	if err := authBundle.Apply(adm); err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("apply auth bundle: %w", err)
	}
	authn := authBundle.Authenticator
	auther := authBundle.Auther
	cookieName := authBundle.CookieName

	viewEngine, err := newESignViewEngine(cfg, adm)
	if err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("new view engine: %w", err)
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
		return eSignRuntimeWebFixture{}, fmt.Errorf("initialize admin: %w", err)
	}
	routes := handlers.BuildRouteSet(adm.URLs(), adm.BasePath(), adm.AdminAPIGroup())
	if err := registerESignWebRoutes(server.Router(), cfg, adm, authn, auther, cookieName, routes, esignModule); err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("register web routes: %w", err)
	}
	if err := registerESignAgreementEventsRoute(server.Router(), adm, authn, esignModule, nil); err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("register agreement events route: %w", err)
	}
	server.Init()
	return eSignRuntimeWebFixture{
		App:       server.WrappedRouter(),
		Module:    esignModule,
		Bootstrap: bootstrapResult,
	}, nil
}

func waitForCapturedSignerToken(t *testing.T, scope stores.Scope, agreementID, recipientID string) string {
	t.Helper()

	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		captured, ok := jobs.LookupCapturedRecipientLink(scope, agreementID, recipientID, "signing_invitation")
		if ok {
			token := signerTokenFromLink(t, captured.SignURL)
			if token != "" {
				return token
			}
		}
		time.Sleep(25 * time.Millisecond)
	}

	t.Fatalf("expected captured signer link for agreement=%s recipient=%s", agreementID, recipientID)
	return ""
}

func signerTokenFromLink(t *testing.T, raw string) string {
	t.Helper()

	link := strings.TrimSpace(raw)
	if link == "" {
		t.Fatal("expected non-empty signer link")
	}
	parsed, err := url.Parse(link)
	if err != nil {
		t.Fatalf("parse signer link %q: %v", link, err)
	}
	trimmedPath := strings.Trim(strings.TrimSpace(parsed.Path), "/")
	parts := strings.Split(trimmedPath, "/")
	for idx := 0; idx < len(parts)-1; idx++ {
		if parts[idx] != "sign" {
			continue
		}
		token, err := url.PathUnescape(parts[idx+1])
		if err != nil {
			t.Fatalf("unescape signer token from %q: %v", link, err)
		}
		token = strings.TrimSpace(token)
		if token == "" {
			t.Fatalf("expected signer token in link %q", link)
		}
		return token
	}
	t.Fatalf("expected /sign/:token path in %q", link)
	return ""
}

type runtimeWebTestPublicTokenValidator struct {
	tokens map[string]services.PublicReviewToken
}

func (v runtimeWebTestPublicTokenValidator) Validate(_ context.Context, _ stores.Scope, rawToken string) (services.PublicReviewToken, error) {
	if token, ok := v.tokens[strings.TrimSpace(rawToken)]; ok {
		return token, nil
	}
	return services.PublicReviewToken{}, fmt.Errorf("token not found")
}

func extractESignPageConfigFromHTML(t *testing.T, html string) map[string]any {
	return extractJSONScriptPayloadFromHTML(t, html, "esign-page-config")
}

func extractJSONScriptPayloadFromHTML(t *testing.T, html string, scriptID string) map[string]any {
	t.Helper()
	scriptID = strings.TrimSpace(scriptID)
	re := regexp.MustCompile(`(?s)<script[^>]*id="` + regexp.QuoteMeta(scriptID) + `"[^>]*>(.*?)</script>`)
	matches := re.FindStringSubmatch(html)
	if len(matches) < 2 {
		t.Fatalf("expected %s script tag in html response", scriptID)
	}
	raw := strings.TrimSpace(matches[1])
	if raw == "" {
		t.Fatalf("expected %s payload in script tag", scriptID)
	}
	payload := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		t.Fatalf("unmarshal %s payload: %v", scriptID, err)
	}
	return payload
}

func getESignConfigFeatureBool(payload map[string]any, key string) bool {
	features, ok := payload["features"].(map[string]any)
	if !ok || features == nil {
		return false
	}
	value, ok := features[strings.TrimSpace(key)]
	if !ok {
		return false
	}
	boolVal, ok := value.(bool)
	return ok && boolVal
}

func getESignConfigModulePath(payload map[string]any) string {
	return strings.TrimSpace(fmt.Sprint(payload["module_path"]))
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

func assertRedirectWithCookie(t *testing.T, app *fiber.App, cookie *http.Cookie, method, endpoint, expectedLocation string) {
	t.Helper()
	resp := doRequestWithCookie(t, app, method, endpoint, cookie)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusFound {
		t.Fatalf("expected %s %s status 302, got %d", method, endpoint, resp.StatusCode)
	}
	location := strings.TrimSpace(resp.Header.Get("Location"))
	if location != expectedLocation {
		t.Fatalf("expected %s %s redirect to %q, got %q", method, endpoint, expectedLocation, location)
	}
}

func assertStatusWithCookie(t *testing.T, app *fiber.App, cookie *http.Cookie, method, endpoint string, expectedStatus int) {
	t.Helper()
	resp := doRequestWithCookie(t, app, method, endpoint, cookie)
	defer resp.Body.Close()
	if resp.StatusCode != expectedStatus {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected %s %s status %d, got %d body=%s", method, endpoint, expectedStatus, resp.StatusCode, strings.TrimSpace(string(body)))
	}
}

func doRequest(t *testing.T, app *fiber.App, method, endpoint, contentType string, body io.Reader) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, endpoint, body)
	prepareRuntimeTestRequest(req)
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
	prepareRuntimeTestRequest(req)
	if cookie != nil {
		req.AddCookie(cookie)
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed (%s %s): %v", method, endpoint, err)
	}
	return resp
}

func doRequestWithCookieAndBody(t *testing.T, app *fiber.App, cookie *http.Cookie, method, endpoint, contentType string, body io.Reader) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, endpoint, body)
	prepareRuntimeTestRequest(req)
	if cookie != nil {
		req.AddCookie(cookie)
	}
	if strings.TrimSpace(contentType) != "" {
		req.Header.Set("Content-Type", contentType)
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed (%s %s): %v", method, endpoint, err)
	}
	return resp
}

func doRequestWithBody(t *testing.T, app *fiber.App, method, endpoint, contentType string, body io.Reader, headers map[string]string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, endpoint, body)
	prepareRuntimeTestRequest(req)
	if strings.TrimSpace(contentType) != "" {
		req.Header.Set("Content-Type", contentType)
	}
	for key, value := range headers {
		if strings.TrimSpace(key) == "" || strings.TrimSpace(value) == "" {
			continue
		}
		req.Header.Set(key, value)
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed (%s %s): %v", method, endpoint, err)
	}
	return resp
}

func prepareRuntimeTestRequest(req *http.Request) {
	if req == nil {
		return
	}
	req.Host = "localhost:8082"
	req.RemoteAddr = "127.0.0.1:12345"
	if req.URL != nil {
		req.URL.Scheme = "https"
	}
	req.TLS = &tls.ConnectionState{}
}

func createPanelRecordWithCookie(t *testing.T, app *fiber.App, cookie *http.Cookie, endpoint string, payload map[string]any) string {
	t.Helper()
	body, _ := json.Marshal(payload)
	resp := doRequestWithCookieAndBody(
		t,
		app,
		cookie,
		http.MethodPost,
		endpoint,
		"application/json",
		bytes.NewReader(body),
	)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected create status 200, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}
	out := map[string]any{}
	rawBody, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(rawBody, &out); err != nil {
		t.Fatalf("decode create payload: %v body=%s", err, strings.TrimSpace(string(rawBody)))
	}
	id := strings.TrimSpace(fmt.Sprint(out["id"]))
	if id != "" {
		return id
	}
	if data, ok := out["data"].(map[string]any); ok && data != nil {
		id = strings.TrimSpace(fmt.Sprint(data["id"]))
	}
	if id == "" {
		t.Fatalf("expected id in create payload, got %+v", out)
	}
	return id
}

func fetchPanelLineagePayload(t *testing.T, app *fiber.App, cookie *http.Cookie, endpoint string) map[string]any {
	t.Helper()
	resp := doRequestWithCookie(t, app, http.MethodGet, endpoint, cookie)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected lineage detail status 200, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	payload := map[string]any{}
	rawBody, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		t.Fatalf("decode lineage detail payload: %v body=%s", err, strings.TrimSpace(string(rawBody)))
	}
	if data, ok := payload["data"].(map[string]any); ok && data != nil {
		payload = data
	}
	lineage, ok := payload["lineage"].(map[string]any)
	if !ok {
		t.Fatalf("expected lineage object, got %+v", payload["lineage"])
	}
	return lineage
}

func parseIDFromLocation(prefix, location string) string {
	location = strings.TrimSpace(location)
	if location == "" {
		return ""
	}
	location = strings.TrimPrefix(location, strings.TrimSpace(prefix))
	if idx := strings.Index(location, "?"); idx >= 0 {
		location = location[:idx]
	}
	location = strings.Trim(strings.TrimSpace(location), "/")
	if location == "" {
		return ""
	}
	segments := strings.Split(location, "/")
	return strings.TrimSpace(segments[0])
}

func firstNestedID(record map[string]any, key string) string {
	items, ok := record[key].([]any)
	if !ok || len(items) == 0 {
		return ""
	}
	first, ok := items[0].(map[string]any)
	if !ok {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(first["id"]))
}

func firstSignatureFieldID(record map[string]any) string {
	return firstFieldIDByType(record, "signature")
}

func firstFieldIDByType(record map[string]any, fieldType string) string {
	items, ok := record["fields"].([]any)
	if !ok || len(items) == 0 {
		return ""
	}
	fieldType = strings.ToLower(strings.TrimSpace(fieldType))
	for _, item := range items {
		field, ok := item.(map[string]any)
		if !ok {
			continue
		}
		currentType := strings.ToLower(strings.TrimSpace(fmt.Sprint(field["type"])))
		if currentType == fieldType {
			return strings.TrimSpace(fmt.Sprint(field["id"]))
		}
	}
	return ""
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
