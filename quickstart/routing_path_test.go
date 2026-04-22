package quickstart

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

type quickstartRoutingExampleModule struct {
	id   string
	slug string
}

func (m *quickstartRoutingExampleModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: strings.TrimSpace(m.id)}
}

func (m *quickstartRoutingExampleModule) RouteContract() adminrouting.ModuleContract {
	slug := strings.TrimSpace(m.slug)
	return adminrouting.ModuleContract{
		Slug: slug,
		UIRoutes: map[string]string{
			slug + ".index": "/",
		},
		APIRoutes: map[string]string{
			slug + ".ping": "/ping",
		},
	}
}

func (m *quickstartRoutingExampleModule) Register(ctx admin.ModuleContext) error {
	contract := m.RouteContract()
	if path := strings.TrimSpace(ctx.Routing.RoutePath(adminrouting.SurfaceUI, contract.Slug+".index")); path != "" {
		ctx.Router.Get(path, func(c router.Context) error {
			return c.SendString(contract.Slug + " ui")
		})
	}
	if path := strings.TrimSpace(ctx.Routing.RoutePath(adminrouting.SurfaceAPI, contract.Slug+".ping")); path != "" {
		ctx.ProtectedRouter.Get(path, func(c router.Context) error {
			return c.SendString(contract.Slug + " api")
		})
	}
	return nil
}

func TestQuickstartRoutingStartupReportLogsDoctorOutputAndOverrideMounts(t *testing.T) {
	resetCommandRegistryForTest(t)

	logger := &captureQuickstartLogger{}
	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithRoutingConfig(adminrouting.Config{
			Roots: adminrouting.RootsConfig{
				AdminRoot:     "/control",
				APIRoot:       "/control/api",
				PublicAPIRoot: "/public/api/v2",
			},
			Modules: map[string]adminrouting.ModuleConfig{
				"reports_tools": {
					Mount: adminrouting.ModuleMountOverride{
						UIBase: "/control/workbench/reports-tools",
					},
				},
				"partner_tools": {
					Mount: adminrouting.ModuleMountOverride{
						UIBase:  "/control/workbench/partner-tools",
						APIBase: "/control/api/integrations/partner-tools",
					},
				},
			},
		}),
	)
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(quickstartRoutingFeatureDefaults()),
		WithAdminDependencies(admin.Dependencies{Logger: logger}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	modules := []admin.Module{
		&quickstartRoutingExampleModule{id: "reports.tools", slug: "reports_tools"},
		&quickstartRoutingExampleModule{id: "partner.tools", slug: "partner_tools"},
	}
	if err := NewModuleRegistrar(adm, cfg, modules, false, WithSeedNavigation(false)); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	server, r := NewFiberServer(nil, cfg, adm, false, WithFiberLogger(false))
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("Initialize error: %v report=%+v", err, adm.RoutingReport())
	}
	server.Init()

	report := adm.RoutingReport()
	if report.EffectiveRoots.AdminRoot != "/control" {
		t.Fatalf("expected admin root /control, got %q", report.EffectiveRoots.AdminRoot)
	}
	if report.EffectiveRoots.APIRoot != "/control/api" {
		t.Fatalf("expected api root /control/api, got %q", report.EffectiveRoots.APIRoot)
	}

	reportsResolved, ok := adm.RoutingPlanner().ResolvedModule("reports_tools")
	if !ok {
		t.Fatalf("expected reports_tools module resolved")
	}
	if reportsResolved.UIMountBase != "/control/workbench/reports-tools" {
		t.Fatalf("expected reports_tools override mount, got %q", reportsResolved.UIMountBase)
	}

	partnerResolved, ok := adm.RoutingPlanner().ResolvedModule("partner_tools")
	if !ok {
		t.Fatalf("expected partner_tools module resolved")
	}
	if partnerResolved.UIMountBase != "/control/workbench/partner-tools" {
		t.Fatalf("expected partner_tools ui override mount, got %q", partnerResolved.UIMountBase)
	}
	if partnerResolved.APIMountBase != "/control/api/integrations/partner-tools" {
		t.Fatalf("expected partner_tools api override mount, got %q", partnerResolved.APIMountBase)
	}

	if got := ResolveAdminRoutePath(adm.URLs(), cfg.BasePath, "dashboard.page"); got != "/control/dashboard" {
		t.Fatalf("expected dashboard page to resolve under admin root override, got %q", got)
	}

	if got, err := adm.URLs().Resolve(reportsResolved.UIGroupPath, "reports_tools.index", nil, nil); err != nil || got != "/control/workbench/reports-tools" {
		t.Fatalf("expected reports_tools URLKit path /control/workbench/reports-tools, got %q err=%v", got, err)
	}
	if got, err := adm.URLs().Resolve(partnerResolved.UIGroupPath, "partner_tools.index", nil, nil); err != nil || got != "/control/workbench/partner-tools" {
		t.Fatalf("expected partner_tools UI path /control/workbench/partner-tools, got %q err=%v", got, err)
	}
	if got, err := adm.URLs().Resolve(partnerResolved.APIGroupPath, "partner_tools.ping", nil, nil); err != nil || got != "/control/api/integrations/partner-tools/ping" {
		t.Fatalf("expected partner_tools API path /control/api/integrations/partner-tools/ping, got %q err=%v", got, err)
	}

	paths := routeDefinitionPaths(r.Routes())
	for _, want := range []string{
		"/control/workbench/reports-tools",
		"/control/workbench/partner-tools",
		"/control/api/reports_tools/ping",
		"/control/api/integrations/partner-tools/ping",
	} {
		if !paths[want] {
			t.Fatalf("expected runtime route %q registered, got %v", want, sortedRoutePaths(paths))
		}
	}

	doctor := adm.RunDoctor(context.Background())
	check, ok := quickstartDoctorCheckResult(doctor, "quickstart.routing")
	if !ok {
		t.Fatalf("expected quickstart.routing doctor result, got %+v", doctor.Checks)
	}
	if check.Status == admin.DoctorSeverityError {
		t.Fatalf("expected routing doctor check to avoid error status, got %q", check.Status)
	}
	roots, _ := check.Metadata["roots"].(map[string]string)
	if roots == nil || roots["admin"] != "/control" || roots["api"] != "/control/api" {
		t.Fatalf("expected routing doctor roots metadata, got %#v", check.Metadata["roots"])
	}
	reportText := strings.TrimSpace(fmt.Sprint(check.Metadata["report_text"]))
	if !strings.Contains(reportText, "partner_tools") || !strings.Contains(reportText, "/control/workbench/reports-tools") {
		t.Fatalf("expected routing doctor report text to include mounts, got %q", reportText)
	}

	if logger.count("info", "routing startup report") == 0 {
		t.Fatalf("expected routing startup report log entry")
	}
	if !loggedRoutingReportContains(logger, "info", "/control/workbench/reports-tools") {
		t.Fatalf("expected routing startup report log to include reports_tools mount")
	}
	if !loggedRoutingReportContains(logger, "info", "/control/api/integrations/partner-tools") {
		t.Fatalf("expected routing startup report log to include partner_tools api mount")
	}
}

func TestQuickstartRoutingConflictFailsStartupEvenWhenFiberRuntimeOptionsRelaxConflicts(t *testing.T) {
	resetCommandRegistryForTest(t)

	logger := &captureQuickstartLogger{}
	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithRoutingConfig(adminrouting.Config{
			Modules: map[string]adminrouting.ModuleConfig{
				"alpha": {
					Mount: adminrouting.ModuleMountOverride{
						UIBase: "/admin/shared",
					},
				},
				"bravo": {
					Mount: adminrouting.ModuleMountOverride{
						UIBase: "/admin/shared",
					},
				},
			},
		}),
	)
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(quickstartRoutingFeatureDefaults()),
		WithAdminDependencies(admin.Dependencies{Logger: logger}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	if err = NewModuleRegistrar(
		adm,
		cfg,
		[]admin.Module{
			&quickstartRoutingExampleModule{id: "alpha.module", slug: "alpha"},
			&quickstartRoutingExampleModule{id: "bravo.module", slug: "bravo"},
		},
		false,
		WithSeedNavigation(false),
	); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	strictRoutes := false
	_, r := NewFiberServer(
		nil,
		cfg,
		adm,
		false,
		WithFiberLogger(false),
		WithFiberRuntimeConfig(FiberRuntimeConfig{
			StrictRoutes:        &strictRoutes,
			RouteConflictPolicy: "log_and_continue",
			PathConflictMode:    "prefer_static",
		}),
	)
	err = adm.Initialize(r)
	if err == nil {
		t.Fatalf("expected startup routing conflict failure")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "routing") {
		t.Fatalf("expected routing failure, got %v", err)
	}

	conflicts := adm.RoutingReport().Conflicts
	if len(conflicts) == 0 {
		t.Fatalf("expected routing report conflicts after startup failure")
	}
	if conflicts[0].Kind != adminrouting.ConflictKindPathConflict {
		t.Fatalf("expected path conflict, got %+v", conflicts)
	}
	if logger.count("error", "routing startup report") == 0 {
		t.Fatalf("expected routing startup report error log")
	}
}

func TestQuickstartExampleModulesCoverBuiltInAndExternalRouteContracts(t *testing.T) {
	builtIn, ok := any(admin.NewPreferencesModule()).(admin.RouteContractProvider)
	if !ok {
		t.Fatalf("expected built-in preferences module to expose RouteContractProvider")
	}
	builtInContract := builtIn.RouteContract()
	if builtInContract.Slug != "preferences" {
		t.Fatalf("expected built-in contract slug preferences, got %q", builtInContract.Slug)
	}
	if builtInContract.UIRoutes["preferences.index"] != "/" {
		t.Fatalf("expected built-in preferences UI route contract, got %+v", builtInContract.UIRoutes)
	}

	external, ok := any(&quickstartRoutingExampleModule{id: "partner.tools", slug: "partner_tools"}).(admin.RouteContractProvider)
	if !ok {
		t.Fatalf("expected external example module to expose RouteContractProvider")
	}
	externalContract := external.RouteContract()
	if externalContract.Slug != "partner_tools" {
		t.Fatalf("expected external contract slug partner_tools, got %q", externalContract.Slug)
	}
	if externalContract.APIRoutes["partner_tools.ping"] != "/ping" {
		t.Fatalf("expected external API route contract, got %+v", externalContract.APIRoutes)
	}
}

func TestQuickstartRoutingManifestRemainsCoherentWithRuntimeRoutes(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithRoutingConfig(adminrouting.Config{
			Roots: adminrouting.RootsConfig{
				AdminRoot: "/control",
				APIRoot:   "/control/api",
			},
			Modules: map[string]adminrouting.ModuleConfig{
				"reports_tools": {
					Mount: adminrouting.ModuleMountOverride{
						UIBase: "/control/workbench/reports-tools",
					},
				},
				"partner_tools": {
					Mount: adminrouting.ModuleMountOverride{
						UIBase:  "/control/workbench/partner-tools",
						APIBase: "/control/api/integrations/partner-tools",
					},
				},
			},
		}),
	)
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(quickstartRoutingFeatureDefaults()),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	t.Cleanup(adm.Commands().Reset)

	if err := NewModuleRegistrar(
		adm,
		cfg,
		[]admin.Module{
			&quickstartRoutingExampleModule{id: "reports.tools", slug: "reports_tools"},
			&quickstartRoutingExampleModule{id: "partner.tools", slug: "partner_tools"},
		},
		false,
		WithSeedNavigation(false),
	); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	server, r := NewFiberServer(nil, cfg, adm, false, WithFiberLogger(false))
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("Initialize error: %v report=%+v", err, adm.RoutingReport())
	}
	server.Init()

	manifest := adm.RoutingPlanner().Manifest()
	paths := routeDefinitionPaths(r.Routes())
	for _, entry := range manifest.Entries {
		if entry.Owner != "module:reports_tools" && entry.Owner != "module:partner_tools" {
			continue
		}
		resolved, err := adm.URLs().Resolve(entry.GroupPath, entry.RouteKey, nil, nil)
		if err != nil {
			t.Fatalf("resolve manifest route %s/%s: %v", entry.GroupPath, entry.RouteKey, err)
		}
		if resolved != entry.Path {
			t.Fatalf("expected manifest path %q for %s, got %q", entry.Path, entry.RouteKey, resolved)
		}
		if !paths[entry.Path] {
			t.Fatalf("expected runtime router to include manifest path %q for %s", entry.Path, entry.RouteKey)
		}
	}
}

func quickstartRoutingFeatureDefaults() map[string]bool {
	return map[string]bool{
		string(admin.FeatureDashboard):           true,
		string(admin.FeatureActivity):            false,
		string(admin.FeaturePreview):             false,
		string(admin.FeatureCMS):                 false,
		string(admin.FeatureCommands):            false,
		string(admin.FeatureSettings):            false,
		string(admin.FeatureSearch):              false,
		string(admin.FeatureNotifications):       false,
		string(admin.FeatureJobs):                false,
		string(admin.FeatureMedia):               false,
		string(admin.FeatureExport):              false,
		string(admin.FeatureBulk):                false,
		string(admin.FeaturePreferences):         false,
		string(admin.FeatureProfile):             false,
		string(admin.FeatureUsers):               false,
		string(admin.FeatureTenants):             false,
		string(admin.FeatureOrganizations):       false,
		string(admin.FeatureTranslationExchange): false,
		string(admin.FeatureTranslationQueue):    false,
	}
}

func quickstartDoctorCheckResult(report admin.DoctorReport, id string) (admin.DoctorCheckResult, bool) {
	id = strings.ToLower(strings.TrimSpace(id))
	for _, check := range report.Checks {
		if strings.ToLower(strings.TrimSpace(check.ID)) == id {
			return check, true
		}
	}
	return admin.DoctorCheckResult{}, false
}

func routeDefinitionPaths(routes []router.RouteDefinition) map[string]bool {
	paths := map[string]bool{}
	for _, route := range routes {
		path := strings.TrimSpace(route.Path)
		if path == "" {
			continue
		}
		paths[path] = true
	}
	return paths
}

func sortedRoutePaths(paths map[string]bool) []string {
	out := make([]string, 0, len(paths))
	for path := range paths {
		out = append(out, path)
	}
	sort.Strings(out)
	return out
}

func loggedRoutingReportContains(logger *captureQuickstartLogger, level, fragment string) bool {
	if logger == nil {
		return false
	}
	for _, entry := range logger.entries {
		if entry.level != level || entry.msg != "routing startup report" {
			continue
		}
		for _, arg := range entry.args {
			if strings.Contains(fmt.Sprint(arg), fragment) {
				return true
			}
		}
	}
	return false
}
