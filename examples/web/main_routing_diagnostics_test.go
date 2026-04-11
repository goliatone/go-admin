package main

import (
	"context"
	"strings"
	"testing"

	adminrouting "github.com/goliatone/go-admin/admin/routing"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
	commandregistry "github.com/goliatone/go-command/registry"
)

func TestExampleRoutingDiagnosticsExposeFallbackOwnershipMetadata(t *testing.T) {
	if err := commandregistry.Stop(context.Background()); err != nil {
		t.Fatalf("stop command registry before test: %v", err)
	}
	t.Cleanup(func() {
		_ = commandregistry.Stop(context.Background())
	})

	runtimeCfg := appcfg.Defaults()
	runtimeCfg.Site.InternalOps.EnableHealthz = true
	runtimeCfg.Site.InternalOps.HealthzPath = "/readyz"
	runtimeCfg.Site.Fallback.Mode = string(quicksite.SiteFallbackModeExplicitPathsOnly)
	runtimeCfg.Site.Fallback.AllowRoot = true
	runtimeCfg.Site.Fallback.AllowedExactPaths = []string{"/search"}
	runtimeCfg.Site.Fallback.AllowedPathPrefixes = []string{"/posts"}

	cfg := quickstart.NewAdminConfig(runtimeCfg.Admin.BasePath, runtimeCfg.Admin.Title, runtimeCfg.Admin.DefaultLocale)
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	siteCfg := resolveSiteRuntimeConfig(cfg, runtimeCfg.Site, true)

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithFeatureDefaults(quickstart.DefaultMinimalFeatures()),
	)
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	if err := registerExampleRoutingOwnership(adm, cfg, runtimeCfg, siteCfg, exampleSearchProviderStub{}); err != nil {
		t.Fatalf("register routing ownership: %v", err)
	}

	server, r := quickstart.NewFiberServer(nil, cfg, adm, false, quickstart.WithFiberLogger(false))
	host := quickstart.NewHostRouter(r, cfg)
	if err := adm.Initialize(host.Admin()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}
	if _, err := registerExampleHostOwnedRoutes(host, runtimeCfg); err != nil {
		t.Fatalf("register host routes: %v", err)
	}
	if err := quicksite.RegisterSiteRoutes(
		host.PublicSite(),
		adm,
		cfg,
		siteCfg,
		quicksite.WithSearchProvider(exampleSearchProviderStub{}),
	); err != nil {
		t.Fatalf("register site routes: %v", err)
	}
	server.Init()

	report := adm.RefreshRoutingReport()
	if len(report.Fallbacks) != 1 {
		t.Fatalf("expected one fallback in routing report, got %+v", report.Fallbacks)
	}
	if !containsString(report.RouteSummary.Domains, adminrouting.RouteDomainPublicSite) {
		t.Fatalf("expected routing report domains to include public_site, got %+v", report.RouteSummary.Domains)
	}
	fallback := report.Fallbacks[0]
	if fallback.Mode != "explicit_paths_only" || !fallback.AllowRoot {
		t.Fatalf("expected explicit-path fallback with root enabled, got %+v", fallback)
	}
	if !containsString(fallback.ReservedPrefixes, "/readyz") || !containsString(fallback.ReservedPrefixes, "/api/v1") {
		t.Fatalf("expected reserved prefixes to include internal ops and public api root, got %+v", fallback.ReservedPrefixes)
	}
	reportText := adminrouting.FormatStartupReport(adm.RoutingReport())
	if !strings.Contains(reportText, "fallbacks:") {
		t.Fatalf("expected routing report text to include fallback section")
	}

	doctor := adm.RunDoctor(context.Background())
	var routingCheck admin.DoctorCheckResult
	found := false
	for _, check := range doctor.Checks {
		if strings.TrimSpace(check.ID) == "quickstart.routing" {
			routingCheck = check
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected quickstart.routing doctor check")
	}
	fallbacks, ok := routingCheck.Metadata["fallbacks"].([]map[string]any)
	if ok {
		if len(fallbacks) != 1 {
			t.Fatalf("expected one fallback metadata entry, got %+v", fallbacks)
		}
		return
	}
	raw, ok := routingCheck.Metadata["fallbacks"].([]any)
	if !ok || len(raw) != 1 {
		t.Fatalf("expected one fallback metadata entry, got %#v", routingCheck.Metadata["fallbacks"])
	}
	entry, _ := raw[0].(map[string]any)
	if strings.TrimSpace(entry["mode"].(string)) != "explicit_paths_only" {
		t.Fatalf("expected doctor fallback mode explicit_paths_only, got %#v", entry)
	}
}
