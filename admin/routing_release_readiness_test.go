package admin

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
)

func TestRoutingDefaultTopologySnapshot(t *testing.T) {
	cfg := Config{
		Title:         "test admin",
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})

	report := adm.RoutingReport()
	payload := map[string]any{
		"effective_roots": map[string]string{
			"admin":      report.EffectiveRoots.AdminRoot,
			"api":        report.EffectiveRoots.APIRoot,
			"public_api": report.EffectiveRoots.PublicAPIRoot,
		},
		"module_mounts": map[string]map[string]string{
			"translations": routingModuleSnapshot(t, report, "translations"),
		},
		"routes": map[string]string{
			"admin|dashboard":                   resolveURLWith(adm.URLs(), "admin", "dashboard", nil, nil),
			"admin|translations.dashboard":      resolveURLWith(adm.URLs(), "admin", "translations.dashboard", nil, nil),
			"admin|translations.queue":          resolveURLWith(adm.URLs(), "admin", "translations.queue", nil, nil),
			"admin.api|errors":                  resolveURLWith(adm.URLs(), adminAPIGroupName(adm.config), "errors", nil, nil),
			"admin.api|translations.queue":      resolveURLWith(adm.URLs(), adminAPIGroupName(adm.config), "translations.queue", nil, nil),
			"public.api.v1|preview":             resolveURLWith(adm.URLs(), publicAPIGroupName(adm.config), "preview", map[string]string{"token": "token"}, nil),
			"public.api.v1|site.menus.location": resolveURLWith(adm.URLs(), publicAPIGroupName(adm.config), SiteRouteMenuByLocation, map[string]string{"location": "site.main"}, nil),
			"public.api.v1|site.menus.code":     resolveURLWith(adm.URLs(), publicAPIGroupName(adm.config), SiteRouteMenuByCode, map[string]string{"code": "primary"}, nil),
		},
	}

	assertRoutingReleaseReadinessSnapshot(t, payload, "testdata/routing_default_topology_snapshot.json")
}

func routingModuleSnapshot(t *testing.T, report routing.StartupReport, slug string) map[string]string {
	t.Helper()
	for _, module := range report.Modules {
		if strings.TrimSpace(module.Slug) != slug {
			continue
		}
		return map[string]string{
			"ui":         module.UIMountBase,
			"api":        module.APIMountBase,
			"public_api": module.PublicAPIMountBase,
			"ui_group":   module.UIGroupPath,
			"api_group":  module.APIGroupPath,
		}
	}
	t.Fatalf("expected module %q in routing report, got %+v", slug, report.Modules)
	return nil
}

func assertRoutingReleaseReadinessSnapshot(t *testing.T, payload map[string]any, snapshotPath string) {
	t.Helper()
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		t.Fatalf("marshal routing release snapshot: %v", err)
	}
	want, err := os.ReadFile(snapshotPath)
	if err != nil {
		t.Fatalf("read snapshot %q: %v", snapshotPath, err)
	}
	got := strings.TrimSpace(string(data))
	expected := strings.TrimSpace(string(want))
	if got != expected {
		t.Fatalf("routing release snapshot mismatch\nexpected:\n%s\n\ngot:\n%s", expected, got)
	}
}
