package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNavigationReadOptionsToSiteMenuReadOptionsTrimsAndPreservesFlags(t *testing.T) {
	opts := navigationReadOptions{
		Locale:               " es ",
		IncludeContributions: true,
		IncludeDrafts:        true,
		PreviewToken:         " preview-token ",
		ViewProfile:          " compact ",
	}

	got := opts.toSiteMenuReadOptions()
	if got.Locale != "es" || !got.IncludeContributions || !got.IncludeDrafts || got.PreviewToken != "preview-token" || got.ViewProfile != "compact" {
		t.Fatalf("expected trimmed site menu options with flags preserved, got %+v", got)
	}
}

func TestNewNavigationRuntimeUsesAdminFallbackServicesWhenExplicitServicesAreNil(t *testing.T) {
	menuSvc := &siteNavigationMenuStub{}
	contentSvc := admin.NewInMemoryContentService()
	contentTypeSvc := admin.NewInMemoryContentService()
	authorizer := siteAuthorizerStub{allowed: map[string]bool{"nav.read": true}}

	adm := mustAdminWithTheme(t, "admin", "light")
	adm.WithAuthorizer(authorizer)
	adm.UseCMS(&siteNavigationCMSContainer{
		widgets: admin.NewInMemoryWidgetService(),
		menu:    menuSvc,
		content: contentSvc,
		types:   contentTypeSvc,
	})

	runtime := newNavigationRuntime(ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}), adm, nil, nil)
	if runtime == nil {
		t.Fatalf("expected runtime from admin fallback services")
	}
	if runtime.menuSvc != menuSvc || runtime.contentSvc != contentSvc || runtime.contentType != contentTypeSvc {
		t.Fatalf("expected runtime to use admin fallback services, got %+v", runtime)
	}
	if runtime.authorizer == nil {
		t.Fatalf("expected authorizer to be wired from admin")
	}
}

func TestNewNavigationRuntimePrefersExplicitServicesOverAdminFallbacks(t *testing.T) {
	adminMenuSvc := &siteNavigationMenuStub{}
	adminContentSvc := admin.NewInMemoryContentService()
	adminContentTypeSvc := admin.NewInMemoryContentService()
	adm := mustAdminWithTheme(t, "admin", "light")
	adm.UseCMS(&siteNavigationCMSContainer{
		widgets: admin.NewInMemoryWidgetService(),
		menu:    adminMenuSvc,
		content: adminContentSvc,
		types:   adminContentTypeSvc,
	})

	explicitContentSvc := admin.NewInMemoryContentService()
	explicitContentTypeSvc := admin.NewInMemoryContentService()
	runtime := newNavigationRuntime(ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}), adm, explicitContentSvc, explicitContentTypeSvc)
	if runtime == nil {
		t.Fatalf("expected runtime with explicit services")
	}
	if runtime.menuSvc != adminMenuSvc {
		t.Fatalf("expected menu service to keep admin menu service, got %T", runtime.menuSvc)
	}
	if runtime.contentSvc != explicitContentSvc || runtime.contentType != explicitContentTypeSvc {
		t.Fatalf("expected explicit content services to override admin fallbacks, got %+v", runtime)
	}
}

func TestNewNavigationRuntimeReturnsNilWithoutMenuServiceWhenGeneratedFallbackDisabled(t *testing.T) {
	runtime := newNavigationRuntime(
		ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				EnableGeneratedFallback: false,
			},
		}),
		nil,
		nil,
		nil,
	)
	if runtime != nil {
		t.Fatalf("expected nil runtime when no menu service and generated fallback disabled, got %+v", runtime)
	}
}

func TestNewNavigationRuntimeAllowsGeneratedFallbackWithoutMenuService(t *testing.T) {
	contentSvc := admin.NewInMemoryContentService()
	contentTypeSvc := admin.NewInMemoryContentService()
	runtime := newNavigationRuntime(
		ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				EnableGeneratedFallback: true,
			},
		}),
		nil,
		contentSvc,
		contentTypeSvc,
	)
	if runtime == nil {
		t.Fatalf("expected runtime when generated fallback is enabled")
	}
	if runtime.menuSvc != nil {
		t.Fatalf("expected nil menu service when none provided, got %T", runtime.menuSvc)
	}
	if runtime.contentSvc != contentSvc || runtime.contentType != contentTypeSvc {
		t.Fatalf("expected explicit services to be preserved for generated fallback runtime, got %+v", runtime)
	}
}
