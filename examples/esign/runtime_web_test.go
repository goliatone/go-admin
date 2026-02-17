package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/modules"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	commandregistry "github.com/goliatone/go-command/registry"
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
	assertRedirect(t, app, http.MethodGet, "/admin/esign/documents", "/admin/login")
	assertRedirect(t, app, http.MethodGet, "/admin/esign/agreements", "/admin/login")
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

	reviewResp := doRequest(t, app, http.MethodGet, "/sign/token-mode-1/review", "", nil)
	defer reviewResp.Body.Close()
	if reviewResp.StatusCode == http.StatusNotFound {
		t.Fatalf("expected unified review route to be registered, got 404")
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

	resp := doRequest(t, app, http.MethodGet, "/sign/token-missing/review", "", nil)
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

	resp := doRequest(t, app, http.MethodGet, "/sign/token-csp/review", "", nil)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected review response status 200, got %d", resp.StatusCode)
	}
	if cacheControl := strings.ToLower(strings.TrimSpace(resp.Header.Get("Cache-Control"))); !strings.Contains(cacheControl, "no-store") {
		t.Fatalf("expected no-store cache-control header, got %q", resp.Header.Get("Cache-Control"))
	}
	if csp := strings.TrimSpace(resp.Header.Get("Content-Security-Policy")); csp == "" {
		t.Fatalf("expected csp header on unified review route")
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
	t.Setenv("ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY", "test-google-active-key")
	t.Setenv("ESIGN_GOOGLE_PROVIDER_MODE", "deterministic")
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

	landingResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/esign", authCookie)
	defer landingResp.Body.Close()
	if landingResp.StatusCode != http.StatusOK {
		t.Fatalf("expected /admin/esign status 200, got %d", landingResp.StatusCode)
	}
	landingBody, err := io.ReadAll(landingResp.Body)
	if err != nil {
		t.Fatalf("read /admin/esign body: %v", err)
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

func TestRuntimeNewDocumentRouteInjectsGoogleIngestionFlagsWhenEnabled(t *testing.T) {
	t.Setenv("ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY", "test-google-active-key")
	t.Setenv("ESIGN_GOOGLE_PROVIDER_MODE", "deterministic")
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

	landingResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/esign", authCookie)
	defer landingResp.Body.Close()
	if landingResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(landingResp.Body)
		t.Fatalf("expected /admin/esign status 200, got %d body=%s", landingResp.StatusCode, strings.TrimSpace(string(body)))
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
	if landingModulePath != "/admin/assets/dist/esign/index.js" {
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
	if docModulePath != "/admin/assets/dist/esign/index.js" {
		t.Fatalf("expected document ingestion module path contract, got %q", docModulePath)
	}
	if !strings.Contains(docMarkup, `src="`+docModulePath+`"`) {
		t.Fatalf("expected document-ingestion module script src %q in markup", docModulePath)
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

	statsResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/api/v1/esign/agreements/stats", authCookie)
	defer statsResp.Body.Close()
	if statsResp.StatusCode != http.StatusOK {
		t.Fatalf("expected /admin/api/v1/esign/agreements/stats status 200, got %d", statsResp.StatusCode)
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

	req := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/upload?tenant_id=tenant-runtime&org_id=org-runtime", &body)
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
	if !strings.HasPrefix(objectKey, "tenant/tenant-runtime/org/org-runtime/docs/") {
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

func TestRuntimeSignerWebE2ERecipientJourneyFromSignLinkToSubmit(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(false)
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
	if sendResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(sendResp.Body)
		t.Fatalf("expected send action status 200, got %d body=%s", sendResp.StatusCode, strings.TrimSpace(string(body)))
	}

	tokenSvc := esignModule.TokenService()
	if tokenSvc == nil {
		t.Fatal("expected module token service")
	}
	issued, err := tokenSvc.Issue(context.Background(), scope, agreementID, recipientID)
	if err != nil {
		t.Fatalf("issue signer token: %v", err)
	}
	signerToken := strings.TrimSpace(issued.Token)
	if signerToken == "" {
		t.Fatal("expected issued signer token")
	}

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
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(false)
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
	if sendResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(sendResp.Body)
		t.Fatalf("expected send action status 200, got %d body=%s", sendResp.StatusCode, strings.TrimSpace(string(body)))
	}

	tokenSvc := esignModule.TokenService()
	if tokenSvc == nil {
		t.Fatal("expected module token service")
	}
	issued, err := tokenSvc.Issue(context.Background(), scope, agreementID, recipientID)
	if err != nil {
		t.Fatalf("issue signer token: %v", err)
	}
	signerToken := strings.TrimSpace(issued.Token)
	if signerToken == "" {
		t.Fatal("expected issued signer token")
	}

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
	if !strings.Contains(reviewMarkup, "flowMode: 'unified'") {
		t.Fatalf("expected unified flow marker in review markup, got %s", strings.TrimSpace(reviewMarkup))
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
	for _, key := range []string{"\"document_name\":", "\"page_count\":", "\"viewer\":", "\"recipient_id\":", "\"pos_x\":", "\"pos_y\":", "\"width\":", "\"height\":"} {
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
	return newESignRuntimeWebAppForTestsWithGoogleEnabled(false)
}

func newESignRuntimeWebAppForTestsWithGoogleEnabled(googleEnabled bool) (*fiber.App, error) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(googleEnabled)
	if err != nil {
		return nil, err
	}
	return fixture.App, nil
}

type eSignRuntimeWebFixture struct {
	App    *fiber.App
	Module *modules.ESignModule
}

func newESignRuntimeWebFixtureForTestsWithGoogleEnabled(googleEnabled bool) (eSignRuntimeWebFixture, error) {
	_ = commandregistry.Stop(context.Background())

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

	esignModule := modules.NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode).
		WithUploadDir(resolveESignDiskAssetsDir())
	if err := adm.RegisterModule(esignModule); err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("register module: %w", err)
	}

	authn, auther, cookieName, err := configureESignAuth(adm, cfg)
	if err != nil {
		return eSignRuntimeWebFixture{}, fmt.Errorf("configure auth: %w", err)
	}

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
	server.Init()
	return eSignRuntimeWebFixture{
		App:    server.WrappedRouter(),
		Module: esignModule,
	}, nil
}

func extractESignPageConfigFromHTML(t *testing.T, html string) map[string]any {
	t.Helper()
	re := regexp.MustCompile(`(?s)<script[^>]*id="esign-page-config"[^>]*>(.*?)</script>`)
	matches := re.FindStringSubmatch(html)
	if len(matches) < 2 {
		t.Fatalf("expected esign page config script tag in html response")
	}
	raw := strings.TrimSpace(matches[1])
	if raw == "" {
		t.Fatalf("expected esign page config payload in script tag")
	}
	payload := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		t.Fatalf("unmarshal esign page config payload: %v", err)
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

func doRequestWithCookieAndBody(t *testing.T, app *fiber.App, cookie *http.Cookie, method, endpoint, contentType string, body io.Reader) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, endpoint, body)
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
