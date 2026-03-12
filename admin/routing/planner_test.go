package routing

import (
	"testing"

	urlkit "github.com/goliatone/go-urlkit"
)

func TestPlannerResolvesDefaultMountsAndGroupPaths(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot:     "/admin",
			APIRoot:       "/admin/api",
			PublicAPIRoot: "/api/v1",
		},
	})

	err := planner.RegisterModule(ModuleContract{
		Slug: "translations",
		UIRoutes: map[string]string{
			"translations.dashboard": "/dashboard",
		},
		APIRoutes: map[string]string{
			"translations.queue": "/queue",
		},
		PublicAPIRoutes: map[string]string{
			"translations.feed": "/feed",
		},
	})
	if err != nil {
		t.Fatalf("register module: %v", err)
	}

	resolved, ok := planner.ResolvedModule("translations")
	if !ok {
		t.Fatalf("expected resolved module for translations")
	}
	if resolved.UIMountBase != "/admin/translations" {
		t.Fatalf("expected ui mount /admin/translations, got %q", resolved.UIMountBase)
	}
	if resolved.APIMountBase != "/admin/api/translations" {
		t.Fatalf("expected api mount /admin/api/translations, got %q", resolved.APIMountBase)
	}
	if resolved.PublicAPIMountBase != "/api/v1/translations" {
		t.Fatalf("expected public api mount /api/v1/translations, got %q", resolved.PublicAPIMountBase)
	}
	if resolved.UIGroupPath != "admin" {
		t.Fatalf("expected ui group path admin, got %q", resolved.UIGroupPath)
	}
	if resolved.APIGroupPath != "admin.api" {
		t.Fatalf("expected api group path admin.api, got %q", resolved.APIGroupPath)
	}
	if resolved.PublicAPIGroupPath != "public.api.v1" {
		t.Fatalf("expected public api group path public.api.v1, got %q", resolved.PublicAPIGroupPath)
	}

	manifest := planner.Manifest()
	if len(manifest.Entries) != 3 {
		t.Fatalf("expected 3 manifest entries, got %d", len(manifest.Entries))
	}

	wantPaths := map[string]string{
		"translations.dashboard": "/admin/translations/dashboard",
		"translations.queue":     "/admin/api/translations/queue",
		"translations.feed":      "/api/v1/translations/feed",
	}
	for _, entry := range manifest.Entries {
		if got := wantPaths[entry.RouteKey]; got != entry.Path {
			t.Fatalf("route %q: expected path %q, got %q", entry.RouteKey, got, entry.Path)
		}
	}

	report := planner.Report()
	if report.RouteSummary.TotalRoutes != 3 {
		t.Fatalf("expected total routes 3, got %d", report.RouteSummary.TotalRoutes)
	}
	if report.RouteSummary.ModuleRoutes != 3 {
		t.Fatalf("expected module routes 3, got %d", report.RouteSummary.ModuleRoutes)
	}
	if len(report.Modules) != 1 || report.Modules[0].Slug != "translations" {
		t.Fatalf("expected report to include translations module")
	}
}

func TestPlannerAppliesHostMountOverridesOverContractMounts(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot:     "/admin",
			APIRoot:       "/api",
			PublicAPIRoot: "/public/api",
		},
		Modules: map[string]ModuleConfig{
			"translations": {
				Mount: ModuleMountOverride{
					UIBase:        "/admin/localized",
					APIBase:       "/api/l10n",
					PublicAPIBase: "/public/api/l10n",
				},
			},
		},
	})

	err := planner.RegisterModule(ModuleContract{
		Slug: "translations",
		UIRoutes: map[string]string{
			"translations.dashboard": "/dashboard",
		},
		APIRoutes: map[string]string{
			"translations.queue": "/queue",
		},
		PublicAPIRoutes: map[string]string{
			"translations.feed": "/feed",
		},
		Mount: ModuleMountOverride{
			UIBase:        "/admin/translations-module",
			APIBase:       "/api/translations-module",
			PublicAPIBase: "/public/api/translations-module",
		},
	})
	if err != nil {
		t.Fatalf("register module: %v", err)
	}

	resolved, ok := planner.ResolvedModule("translations")
	if !ok {
		t.Fatalf("expected resolved module for translations")
	}
	if resolved.UIMountBase != "/admin/localized" {
		t.Fatalf("expected ui override /admin/localized, got %q", resolved.UIMountBase)
	}
	if resolved.APIMountBase != "/api/l10n" {
		t.Fatalf("expected api override /api/l10n, got %q", resolved.APIMountBase)
	}
	if resolved.PublicAPIMountBase != "/public/api/l10n" {
		t.Fatalf("expected public api override /public/api/l10n, got %q", resolved.PublicAPIMountBase)
	}
}

func TestPlannerOmitsUnusedSurfacesFromResolutionAndManifest(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot:     "/admin",
			APIRoot:       "/admin/api/v2",
			PublicAPIRoot: "/site/api/v3",
		},
	})

	err := planner.RegisterModule(ModuleContract{
		Slug: "audit",
		APIRoutes: map[string]string{
			"audit.index": "/",
			"audit.logs":  "/logs",
		},
	})
	if err != nil {
		t.Fatalf("register module: %v", err)
	}

	resolved, ok := planner.ResolvedModule("audit")
	if !ok {
		t.Fatalf("expected resolved module for audit")
	}
	if resolved.UIMountBase != "" || resolved.UIGroupPath != "" {
		t.Fatalf("expected ui surface to remain empty for api-only module: %+v", resolved)
	}
	if resolved.PublicAPIMountBase != "" || resolved.PublicAPIGroupPath != "" {
		t.Fatalf("expected public api surface to remain empty for api-only module: %+v", resolved)
	}
	if resolved.APIMountBase != "/admin/api/v2/audit" {
		t.Fatalf("expected api mount /admin/api/v2/audit, got %q", resolved.APIMountBase)
	}
	if resolved.APIGroupPath != "admin.api.v2" {
		t.Fatalf("expected versioned admin api group admin.api.v2, got %q", resolved.APIGroupPath)
	}

	manifest := planner.Manifest()
	if len(manifest.Entries) != 2 {
		t.Fatalf("expected 2 manifest entries, got %d", len(manifest.Entries))
	}
	for _, entry := range manifest.Entries {
		if entry.Surface != SurfaceAPI {
			t.Fatalf("expected only api entries, got surface %q", entry.Surface)
		}
	}
}

func TestMutationRoutePathStripsGroupRoots(t *testing.T) {
	roots := RootsConfig{
		AdminRoot:     "/admin",
		APIRoot:       "/admin/api",
		PublicAPIRoot: "/api/v1",
	}

	tests := []struct {
		group    string
		incoming string
		want     string
	}{
		{group: "admin", incoming: "/admin/translations/dashboard", want: "/translations/dashboard"},
		{group: "admin.api", incoming: "/admin/api/translations/my-work", want: "/translations/my-work"},
		{group: "public.api.v1", incoming: "/api/v1/esign/signing/session/:token", want: "/esign/signing/session/:token"},
		{group: "admin.api", incoming: "/queue", want: "/queue"},
	}

	for _, tc := range tests {
		if got := mutationRoutePath(tc.group, tc.incoming, roots); got != tc.want {
			t.Fatalf("group %q incoming %q: expected %q, got %q", tc.group, tc.incoming, tc.want, got)
		}
	}
}

func TestPlannerRejectsDuplicateSlugs(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
	})

	contract := ModuleContract{
		Slug: "translations",
		UIRoutes: map[string]string{
			"translations.dashboard": "/dashboard",
		},
	}

	if err := planner.RegisterModule(contract); err != nil {
		t.Fatalf("first registration failed: %v", err)
	}
	if err := planner.RegisterModule(contract); err == nil {
		t.Fatalf("expected duplicate slug rejection")
	}
}

func TestPlannerRejectsInvalidOverridesOutsideHostRoots(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
	})

	err := planner.RegisterModule(ModuleContract{
		Slug: "translations",
		UIRoutes: map[string]string{
			"translations.dashboard": "/dashboard",
		},
		Mount: ModuleMountOverride{
			UIBase: "/translations",
		},
	})
	if err == nil {
		t.Fatalf("expected ui override outside host root to fail")
	}
}

func TestPlannerAllowsRootLevelOverridesWhenRoutesStayBelowHostRoot(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
	})

	err := planner.RegisterModule(ModuleContract{
		Slug: "users",
		UIRoutes: map[string]string{
			"users.index": "/users",
			"users.roles": "/roles",
		},
		Mount: ModuleMountOverride{
			UIBase: "/admin",
		},
	})
	if err != nil {
		t.Fatalf("expected root-level override with nested routes to pass: %v", err)
	}

	manifest := planner.Manifest()
	if len(manifest.Entries) != 2 {
		t.Fatalf("expected 2 manifest entries, got %d", len(manifest.Entries))
	}
	want := map[string]string{
		"users.index": "/admin/users",
		"users.roles": "/admin/roles",
	}
	for _, entry := range manifest.Entries {
		if want[entry.RouteKey] != entry.Path {
			t.Fatalf("route %q: expected %q, got %q", entry.RouteKey, want[entry.RouteKey], entry.Path)
		}
	}
}

func TestPlannerRejectsMissingOrIncompleteContracts(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
	})

	cases := []ModuleContract{
		{},
		{
			Slug: "translations",
		},
		{
			Slug: "translations",
			UIRoutes: map[string]string{
				"dashboard": "/dashboard",
			},
		},
		{
			Slug: "translations",
			UIRoutes: map[string]string{
				"translations.dashboard": "",
			},
		},
	}

	for idx, contract := range cases {
		if err := planner.RegisterModule(contract); err == nil {
			t.Fatalf("case %d: expected contract rejection", idx)
		}
	}
}

func TestPlannerManifestAndReportOrderingIsDeterministic(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot:     "/admin",
			APIRoot:       "/admin/api",
			PublicAPIRoot: "/api/v1",
		},
	})

	contracts := []ModuleContract{
		{
			Slug: "zeta",
			APIRoutes: map[string]string{
				"zeta.index": "/",
			},
		},
		{
			Slug: "alpha",
			UIRoutes: map[string]string{
				"alpha.home": "/",
			},
			APIRoutes: map[string]string{
				"alpha.index": "/",
			},
		},
	}

	for _, contract := range contracts {
		if err := planner.RegisterModule(contract); err != nil {
			t.Fatalf("register module %q: %v", contract.Slug, err)
		}
	}

	report := planner.Report()
	if len(report.Modules) != 2 {
		t.Fatalf("expected 2 modules in report, got %d", len(report.Modules))
	}
	if report.Modules[0].Slug != "alpha" || report.Modules[1].Slug != "zeta" {
		t.Fatalf("expected modules sorted alphabetically, got %+v", report.Modules)
	}
	if report.RouteSummary.Modules[0] != "alpha" || report.RouteSummary.Modules[1] != "zeta" {
		t.Fatalf("expected summary modules sorted alphabetically, got %+v", report.RouteSummary.Modules)
	}

	manifest := planner.Manifest()
	if len(manifest.Entries) != 3 {
		t.Fatalf("expected 3 manifest entries, got %d", len(manifest.Entries))
	}
	gotOrder := []string{
		manifest.Entries[0].Owner + "|" + manifest.Entries[0].Surface + "|" + manifest.Entries[0].RouteKey,
		manifest.Entries[1].Owner + "|" + manifest.Entries[1].Surface + "|" + manifest.Entries[1].RouteKey,
		manifest.Entries[2].Owner + "|" + manifest.Entries[2].Surface + "|" + manifest.Entries[2].RouteKey,
	}
	wantOrder := []string{
		"module:alpha|ui|alpha.home",
		"module:alpha|api|alpha.index",
		"module:zeta|api|zeta.index",
	}
	for i := range wantOrder {
		if gotOrder[i] != wantOrder[i] {
			t.Fatalf("entry %d: expected %q, got %q", i, wantOrder[i], gotOrder[i])
		}
	}
}

func TestPlannerAdoptsIdenticalExistingHostRoutes(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/admin",
				Routes: map[string]string{
					"translations.dashboard":      "/translations/dashboard",
					"translations.exchange":       "/translations/exchange",
					"translations.families.id":    "/translations/families/:family_id",
					"translations.assignments.id": "/translations/assignments/:assignment_id",
				},
				Groups: []urlkit.GroupConfig{
					{
						Name: "api",
						Path: "/api",
						Routes: map[string]string{
							"translations.export":              "/translations/exchange/export",
							"translations.template":            "/translations/exchange/template",
							"translations.families":            "/translations/families",
							"translations.families.id":         "/translations/families/:family_id",
							"translations.families.variants":   "/translations/families/:family_id/variants",
							"translations.variants.id":         "/translations/variants/:variant_id",
							"translations.assignments":         "/translations/assignments",
							"translations.assignments.id":      "/translations/assignments/:assignment_id",
							"translations.assignments.actions": "/translations/assignments/:assignment_id/actions/:action",
							"translations.my_work":             "/translations/my-work",
							"translations.queue":               "/translations/queue",
							"translations.import.validate":     "/translations/exchange/import/validate",
							"translations.import.apply":        "/translations/exchange/import/apply",
							"translations.jobs.id":             "/translations/exchange/jobs/:job_id",
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}

	planner, err := NewPlanner(Config{
		Roots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
	}, urlKitTestAdapter{manager: manager})
	if err != nil {
		t.Fatalf("new planner: %v", err)
	}

	if err := planner.RegisterModule(ModuleContract{
		Slug: "translations",
		UIRoutes: map[string]string{
			"translations.dashboard":        "/dashboard",
			"translations.exchange":         "/exchange",
			"translations.families.id":      "/families/:family_id",
			"translations.assignments.id":   "/assignments/:assignment_id",
			"translations.assignments.edit": "/assignments/:assignment_id/edit",
		},
		APIRoutes: map[string]string{
			"translations.export":              "/exchange/export",
			"translations.template":            "/exchange/template",
			"translations.families":            "/families",
			"translations.families.id":         "/families/:family_id",
			"translations.families.variants":   "/families/:family_id/variants",
			"translations.variants.id":         "/variants/:variant_id",
			"translations.assignments":         "/assignments",
			"translations.assignments.id":      "/assignments/:assignment_id",
			"translations.assignments.actions": "/assignments/:assignment_id/actions/:action",
			"translations.my_work":             "/my-work",
			"translations.queue":               "/queue",
			"translations.import.validate":     "/exchange/import/validate",
			"translations.import.apply":        "/exchange/import/apply",
			"translations.jobs.id":             "/exchange/jobs/:job_id",
		},
	}); err != nil {
		t.Fatalf("expected identical host routes to be adopted, got %v", err)
	}

	if got, err := manager.RoutePath("admin", "translations.assignments.edit"); err != nil || got != "/admin/translations/assignments/:assignment_id/edit" {
		t.Fatalf("expected new route to be added for assignments.edit, got path=%q err=%v", got, err)
	}
}

func mustPlanner(t *testing.T, cfg Config) Planner {
	t.Helper()
	planner, err := NewPlanner(cfg, nil)
	if err != nil {
		t.Fatalf("new planner: %v", err)
	}
	return planner
}

type urlKitTestAdapter struct {
	manager *urlkit.RouteManager
}

func (a urlKitTestAdapter) EnsureGroup(path string) error {
	if a.manager == nil {
		return nil
	}
	_, err := a.manager.EnsureGroup(path)
	return err
}

func (a urlKitTestAdapter) AddRoutes(path string, routes map[string]string) error {
	if a.manager == nil {
		return nil
	}
	_, _, err := a.manager.AddRoutes(path, routes)
	return err
}

func (a urlKitTestAdapter) RoutePath(group, route string) (string, error) {
	if a.manager == nil {
		return "", nil
	}
	return a.manager.RoutePath(group, route)
}

func (a urlKitTestAdapter) RouteTemplate(group, route string) (string, error) {
	if a.manager == nil {
		return "", nil
	}
	return a.manager.RouteTemplate(group, route)
}
