package main

import (
	"net/http"
	"strings"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/web/config"
)

func TestExamplePhase7ReservedAndFallbackOwnershipMatrix(t *testing.T) {
	app := newExamplePhase6SurfaceApp(t, func(cfg *appcfg.Config) {
		cfg.Site.InternalOps.EnableHealthz = true
		cfg.Site.InternalOps.EnableStatus = true
		cfg.Site.InternalOps.HealthzPath = "/healthz"
		cfg.Site.InternalOps.StatusPath = "/status"
	})

	assertExampleHandler(t, app, http.MethodGet, "/admin/debug", http.StatusOK, "admin_debug")
	assertExampleJSONStatus(t, app, http.MethodGet, "/healthz", http.StatusOK)
	assertExampleJSONStatus(t, app, http.MethodGet, "/status", http.StatusOK)
	assertExampleAppInfo(t, app, http.MethodGet, exampleAppInfoPath, http.StatusOK)
	assertExampleHandler(t, app, http.MethodGet, "/missing-page", http.StatusOK, "site")

	systemRec := performExampleRequest(t, app, http.MethodGet, "/.well-known/security.txt")
	if systemRec.Code != http.StatusNotFound {
		t.Fatalf("expected /.well-known/security.txt to remain host-owned, got %d body=%s", systemRec.Code, systemRec.Body.String())
	}
	if strings.Contains(systemRec.Body.String(), `"handler":"site"`) {
		t.Fatalf("expected /.well-known/security.txt to bypass site fallback, got body=%s", systemRec.Body.String())
	}

	adminRec := performExampleRequest(t, app, http.MethodGet, "/admin/missing")
	if adminRec.Code != http.StatusNotFound {
		t.Fatalf("expected unknown admin path to stay outside site fallback, got %d body=%s", adminRec.Code, adminRec.Body.String())
	}
	if strings.Contains(adminRec.Body.String(), `"handler":"site"`) {
		t.Fatalf("expected unknown admin path not to resolve through site fallback, got body=%s", adminRec.Body.String())
	}
}

func TestExamplePhase7HTMLSearchUsesSiteTemplatesWhileAdminAndSystemStayOutOfSite404(t *testing.T) {
	app := newExamplePhase6HTMLApp(t)

	searchStatus, searchBody := performExampleHTMLRequest(t, app, http.MethodGet, "/search")
	if searchStatus != http.StatusOK {
		t.Fatalf("expected search page 200, got %d body=%s", searchStatus, searchBody)
	}
	assertContainsAll(t, searchBody,
		`data-theme-name="garchen-archive-site"`,
		`/static/themes/garchen-archive-site/static/site.css`,
		`/static/themes/garchen-archive-site/static/site.js`,
	)
	assertDoesNotContainAny(t, searchBody, `/admin/assets/output.css`)

	admin404Status, admin404Body := performExampleHTMLRequest(t, app, http.MethodGet, "/admin/missing")
	if admin404Status != http.StatusNotFound {
		t.Fatalf("expected admin 404, got %d body=%s", admin404Status, admin404Body)
	}
	assertContainsAll(t, admin404Body, `/admin/assets/output.css`, `/admin/assets/dist/styles/error-page.css`)
	assertDoesNotContainAny(t, admin404Body, `data-theme-name="garchen-archive-site"`, `Not Found · Site Runtime`)

	system404Status, system404Body := performExampleHTMLRequest(t, app, http.MethodGet, "/.well-known/security.txt")
	if system404Status != http.StatusNotFound {
		t.Fatalf("expected system 404, got %d body=%s", system404Status, system404Body)
	}
	assertDoesNotContainAny(t, system404Body,
		`data-theme-name="garchen-archive-site"`,
		`/static/themes/garchen-archive-site/static/site.css`,
		`Not Found · Site Runtime`,
	)
}

func TestExamplePhase7ThemeIsolationUnderDifferentThemeSelections(t *testing.T) {
	app := newExamplePhase6HTMLApp(t)

	lightStatus, lightBody := performExampleHTMLRequest(t, app, http.MethodGet, "/search?variant=light")
	if lightStatus != http.StatusOK {
		t.Fatalf("expected light site search 200, got %d body=%s", lightStatus, lightBody)
	}
	assertContainsAll(t, lightBody,
		`data-theme-name="garchen-archive-site"`,
		`data-theme-variant="light"`,
		`/static/themes/garchen-archive-site/static/site.css`,
	)
	assertDoesNotContainAny(t, lightBody, `/admin/assets/output.css`)

	darkStatus, darkBody := performExampleHTMLRequest(t, app, http.MethodGet, "/search?variant=dark")
	if darkStatus != http.StatusOK {
		t.Fatalf("expected dark site search 200, got %d body=%s", darkStatus, darkBody)
	}
	assertContainsAll(t, darkBody,
		`data-theme-name="garchen-archive-site"`,
		`data-theme-variant="dark"`,
		`/static/themes/garchen-archive-site/static/site.css`,
	)
	assertDoesNotContainAny(t, darkBody, `/admin/assets/output.css`)

	adminStatus, adminBody := performExampleHTMLRequest(t, app, http.MethodGet, "/admin/missing?variant=dark")
	if adminStatus != http.StatusNotFound {
		t.Fatalf("expected admin 404 with site variant query, got %d body=%s", adminStatus, adminBody)
	}
	assertContainsAll(t, adminBody, `/admin/assets/output.css`, `/admin/assets/dist/styles/error-page.css`)
	assertDoesNotContainAny(t, adminBody,
		`data-theme-name="garchen-archive-site"`,
		`data-theme-variant="dark"`,
		`/static/themes/garchen-archive-site/static/site.css`,
	)
}
