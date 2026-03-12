package routing

import "testing"

func TestDefaultConfigAppliesCanonicalDefaults(t *testing.T) {
	cfg := NormalizeConfig(Config{}, RootDerivationInput{})

	if !cfg.Enabled {
		t.Fatalf("expected routing enabled by default")
	}
	if !cfg.EnforceRouteNamePolicy {
		t.Fatalf("expected route-name policy enabled by default")
	}
	if !cfg.EnforceSlugPolicy {
		t.Fatalf("expected slug policy enabled by default")
	}
	if cfg.ConflictPolicy != ConflictPolicyError {
		t.Fatalf("expected conflict policy %q, got %q", ConflictPolicyError, cfg.ConflictPolicy)
	}
	if !cfg.Manifest.Enabled {
		t.Fatalf("expected manifest enabled by default")
	}
	if !cfg.Manifest.IncludeHostRoutes {
		t.Fatalf("expected host routes included by default")
	}
	if !cfg.Manifest.IncludeModuleRoutes {
		t.Fatalf("expected module routes included by default")
	}
	if cfg.Modules == nil {
		t.Fatalf("expected module config map initialized")
	}
}

func TestDeriveDefaultRootsPreservesCurrentTopology(t *testing.T) {
	cfg := DeriveDefaultRoots(RootDerivationInput{
		BasePath: "/admin",
		URLs: URLConfig{
			Admin: URLNamespaceConfig{
				APIPrefix: "api",
			},
			Public: URLNamespaceConfig{
				APIPrefix:  "api",
				APIVersion: "v1",
			},
		},
	})

	if cfg.AdminRoot != "/admin" {
		t.Fatalf("expected admin root /admin, got %q", cfg.AdminRoot)
	}
	if cfg.APIRoot != "/admin/api" {
		t.Fatalf("expected api root /admin/api, got %q", cfg.APIRoot)
	}
	if cfg.PublicAPIRoot != "/api/v1" {
		t.Fatalf("expected public api root /api/v1, got %q", cfg.PublicAPIRoot)
	}
}

func TestDeriveDefaultRootsUsesCanonicalURLOverrides(t *testing.T) {
	cfg := DeriveDefaultRoots(RootDerivationInput{
		BasePath: "/ignored",
		URLs: URLConfig{
			Admin: URLNamespaceConfig{
				BasePath:   "/console",
				APIPrefix:  "internal",
				APIVersion: "v2",
			},
			Public: URLNamespaceConfig{
				BasePath:   "/site",
				APIPrefix:  "gateway",
				APIVersion: "2026",
			},
		},
	})

	if cfg.AdminRoot != "/console" {
		t.Fatalf("expected admin root /console, got %q", cfg.AdminRoot)
	}
	if cfg.APIRoot != "/console/internal/v2" {
		t.Fatalf("expected api root /console/internal/v2, got %q", cfg.APIRoot)
	}
	if cfg.PublicAPIRoot != "/site/gateway/2026" {
		t.Fatalf("expected public api root /site/gateway/2026, got %q", cfg.PublicAPIRoot)
	}
}

func TestNormalizeRootsAndOverrides(t *testing.T) {
	roots := NormalizeRoots(RootsConfig{
		AdminRoot:     " admin/ ",
		APIRoot:       "/admin/api/",
		PublicAPIRoot: " /api/v1/ ",
	})

	if roots.AdminRoot != "/admin" {
		t.Fatalf("expected normalized admin root /admin, got %q", roots.AdminRoot)
	}
	if roots.APIRoot != "/admin/api" {
		t.Fatalf("expected normalized api root /admin/api, got %q", roots.APIRoot)
	}
	if roots.PublicAPIRoot != "/api/v1" {
		t.Fatalf("expected normalized public api root /api/v1, got %q", roots.PublicAPIRoot)
	}

	override := NormalizeMountOverride(ModuleMountOverride{
		UIBase:        "admin/translations/",
		APIBase:       "/api/translations/",
		PublicAPIBase: " /public/translations/ ",
	})

	if override.UIBase != "/admin/translations" {
		t.Fatalf("expected normalized ui base /admin/translations, got %q", override.UIBase)
	}
	if override.APIBase != "/api/translations" {
		t.Fatalf("expected normalized api base /api/translations, got %q", override.APIBase)
	}
	if override.PublicAPIBase != "/public/translations" {
		t.Fatalf("expected normalized public api base /public/translations, got %q", override.PublicAPIBase)
	}
}

func TestNormalizeRelativePathAndContractRoutes(t *testing.T) {
	if got := NormalizeRelativePath("dashboard"); got != "/dashboard" {
		t.Fatalf("expected /dashboard, got %q", got)
	}
	if got := NormalizeRelativePath("/queue/"); got != "/queue" {
		t.Fatalf("expected /queue, got %q", got)
	}
	if got := NormalizeRelativePath("/"); got != "/" {
		t.Fatalf("expected /, got %q", got)
	}

	contract := NormalizeModuleContract(ModuleContract{
		Slug: "translations",
		UIRoutes: map[string]string{
			"translations.dashboard": "dashboard/",
		},
		APIRoutes: map[string]string{
			"translations.queue": "/queue/",
		},
	})

	if contract.RouteNamePrefix != "translations" {
		t.Fatalf("expected default route name prefix translations, got %q", contract.RouteNamePrefix)
	}
	if contract.UIRoutes["translations.dashboard"] != "/dashboard" {
		t.Fatalf("expected normalized ui route /dashboard, got %q", contract.UIRoutes["translations.dashboard"])
	}
	if contract.APIRoutes["translations.queue"] != "/queue" {
		t.Fatalf("expected normalized api route /queue, got %q", contract.APIRoutes["translations.queue"])
	}
}

func TestValidateSlugAndReservedSlugs(t *testing.T) {
	valid := []string{"translations", "content_v2", "feature-flags"}
	for _, slug := range valid {
		if err := ValidateSlug(slug); err != nil {
			t.Fatalf("expected slug %q to be valid: %v", slug, err)
		}
	}

	invalid := []string{"", "Admin", "1translations", "a", "translations!"}
	for _, slug := range invalid {
		if err := ValidateSlug(slug); err == nil {
			t.Fatalf("expected slug %q to be invalid", slug)
		}
	}

	for _, slug := range ReservedSlugs() {
		if !IsReservedSlug(slug) {
			t.Fatalf("expected slug %q to be reserved", slug)
		}
		if err := ValidateSlug(slug); err == nil {
			t.Fatalf("expected reserved slug %q to fail validation", slug)
		}
	}
}

func TestRouteNamePrefixNormalizationAndOwnershipHelpers(t *testing.T) {
	if got := NormalizeRouteNamePrefix("", "translations"); got != "translations" {
		t.Fatalf("expected translations, got %q", got)
	}
	if got := NormalizeRouteNamePrefix(" translations.api. ", "translations"); got != "translations.api" {
		t.Fatalf("expected translations.api, got %q", got)
	}
	if got := RouteKeyOwnershipPrefix("translations"); got != "translations." {
		t.Fatalf("expected route key prefix translations., got %q", got)
	}
	if got := RouteNameOwnershipPrefix("translations.api", "translations"); got != "translations.api." {
		t.Fatalf("expected route name prefix translations.api., got %q", got)
	}
	if !OwnsRouteKey("translations", "translations.queue") {
		t.Fatalf("expected translations.queue to be owned by translations slug")
	}
	if OwnsRouteKey("translations", "admin.queue") {
		t.Fatalf("expected admin.queue not to be owned by translations slug")
	}
	if !OwnsRouteName("translations.api", "translations", "translations.api.queue") {
		t.Fatalf("expected translations.api.queue to be owned by translations.api")
	}
	if OwnsRouteName("translations.api", "translations", "translations.queue") {
		t.Fatalf("expected translations.queue not to be owned by translations.api")
	}
}
