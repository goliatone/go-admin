package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNewSearchRuntimeReturnsNilWithoutProvider(t *testing.T) {
	if runtime := newSearchRuntime(ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}), nil, nil); runtime != nil {
		t.Fatalf("expected nil runtime without provider, got %+v", runtime)
	}
}

func TestNewSearchRuntimeBuildsCompactedBootstrapState(t *testing.T) {
	provider := &recordingSiteSearchProvider{}
	runtime := newSearchRuntime(
		ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			BasePath: "/site",
			Search: SiteSearchConfig{
				Route: "/discover",
			},
		}),
		provider,
		[]SiteModule{nil, searchFilterInjectorModule{}},
	)
	if runtime == nil {
		t.Fatal("expected runtime")
	}
	if runtime.provider != provider {
		t.Fatalf("expected provider to be preserved")
	}
	if runtime.baseRoute != "/site/discover" {
		t.Fatalf("expected base route /site/discover, got %q", runtime.baseRoute)
	}
	if len(runtime.modules) != 1 {
		t.Fatalf("expected compacted module list with one module, got %+v", runtime.modules)
	}
	if runtime.modules[0].ID() != "search-filter-injector" {
		t.Fatalf("expected compacted module to preserve injector, got %+v", runtime.modules[0])
	}
}
