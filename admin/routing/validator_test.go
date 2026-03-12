package routing

import (
	"errors"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestPlannerFailsFastOnURLKitRouteKeyConflicts(t *testing.T) {
	planner, err := NewPlanner(Config{
		Roots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
	}, stubURLKitAdapter{
		templates: map[string]string{
			"admin|translations.dashboard": "/admin/translations/existing",
		},
	})
	if err != nil {
		t.Fatalf("new planner: %v", err)
	}

	err = planner.RegisterModule(ModuleContract{
		Slug: "translations",
		UIRoutes: map[string]string{
			"translations.dashboard": "/dashboard",
		},
	})
	if err == nil {
		t.Fatalf("expected urlkit route conflict")
	}
	if !strings.Contains(err.Error(), `route conflict in group "admin"`) {
		t.Fatalf("expected route conflict error, got %v", err)
	}
}

func TestPlannerRejectsRouteNameConflictsAcrossModules(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
	})

	if err := planner.RegisterModule(ModuleContract{
		Slug:            "alpha",
		RouteNamePrefix: "shared",
		UIRoutes: map[string]string{
			"alpha.index": "/",
		},
	}); err != nil {
		t.Fatalf("register alpha: %v", err)
	}

	err := planner.RegisterModule(ModuleContract{
		Slug:            "beta",
		RouteNamePrefix: "shared",
		UIRoutes: map[string]string{
			"beta.index": "/",
		},
	})
	if err == nil {
		t.Fatalf("expected route-name conflict")
	}
}

func TestPlannerRejectsReservedRootClaims(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
		Modules: map[string]ModuleConfig{
			"translations": {
				Mount: ModuleMountOverride{
					UIBase: "/admin",
				},
			},
		},
	})

	err := planner.RegisterModule(ModuleContract{
		Slug: "translations",
		UIRoutes: map[string]string{
			"translations.dashboard": "/",
		},
	})
	if err == nil {
		t.Fatalf("expected reserved-root ownership violation")
	}
}

func TestValidatorDetectsMethodPathConflicts(t *testing.T) {
	validator := NewValidator(RootsConfig{})
	err := validator.PreflightRouter("module:alpha", "alpha", []router.RouteDefinition{
		{Name: "admin.alpha.index", Method: router.GET, Path: "/admin/alpha"},
		{Name: "admin.alpha.alt", Method: router.GET, Path: "/admin/alpha"},
	})
	if err == nil {
		t.Fatalf("expected method/path conflict")
	}
}

func TestValidatorDetectsRouterMismatchAgainstManifest(t *testing.T) {
	validator := NewValidator(RootsConfig{})
	manifest := Manifest{
		Entries: []ManifestEntry{
			{
				Owner:     "module:translations",
				Surface:   SurfaceAPI,
				RouteKey:  "translations.queue",
				RouteName: "admin.api.translations.queue",
				Path:      "/admin/api/translations/queue",
				GroupPath: "admin.api",
			},
		},
	}

	err := validator.ReconcileRouter(manifest, stubRouterAdapter{
		routes: []router.RouteDefinition{
			{Name: "admin.api.translations.queue", Method: router.GET, Path: "/admin/api/translations/wrong"},
		},
	})
	if err == nil {
		t.Fatalf("expected router mismatch")
	}
}

func TestPlannerFailFastLeavesInvalidModuleUnregistered(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
		Modules: map[string]ModuleConfig{
			"beta": {
				Mount: ModuleMountOverride{
					UIBase: "/outside",
				},
			},
		},
	})

	if err := planner.RegisterModule(ModuleContract{
		Slug: "alpha",
		UIRoutes: map[string]string{
			"alpha.index": "/",
		},
	}); err != nil {
		t.Fatalf("register alpha: %v", err)
	}

	err := planner.RegisterModule(ModuleContract{
		Slug: "beta",
		UIRoutes: map[string]string{
			"beta.index": "/",
		},
	})
	if err == nil {
		t.Fatalf("expected fail-fast ownership violation")
	}

	report := planner.Report()
	if len(report.Modules) != 1 || report.Modules[0].Slug != "alpha" {
		t.Fatalf("expected only alpha to remain registered, got %+v", report.Modules)
	}
}

type stubURLKitAdapter struct {
	templates map[string]string
	paths     map[string]string
}

func (s stubURLKitAdapter) EnsureGroup(path string) error {
	return nil
}

func (s stubURLKitAdapter) AddRoutes(path string, routes map[string]string) error {
	return nil
}

func (s stubURLKitAdapter) RoutePath(group, route string) (string, error) {
	if value, ok := s.paths[group+"|"+route]; ok {
		return value, nil
	}
	return "", errors.New("not found")
}

func (s stubURLKitAdapter) RouteTemplate(group, route string) (string, error) {
	if value, ok := s.templates[group+"|"+route]; ok {
		return value, nil
	}
	return "", errors.New("not found")
}

type stubRouterAdapter struct {
	routes      []router.RouteDefinition
	validateErr []error
}

func (s stubRouterAdapter) Routes() []router.RouteDefinition {
	return append([]router.RouteDefinition{}, s.routes...)
}

func (s stubRouterAdapter) ValidateRoutes() []error {
	return append([]error{}, s.validateErr...)
}
