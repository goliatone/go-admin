package site

import (
	"context"
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestNavigationResolveReadOptionsDelegatesToRuntimeHelper(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				ContributionLocalePolicy: ContributionLocalePolicyFallback,
			},
			Features: SiteFeatures{
				EnableMenuDraftPreview: new(true),
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.QueriesM["include_contributions"] = "false"
	ctx.QueriesM["dedupe_policy"] = menuDedupByTarget
	ctx.QueriesM["contribution_locale_policy"] = ContributionLocalePolicyStrict
	ctx.QueriesM["view_profile"] = "compact"

	state := RequestState{
		Locale:              "es",
		IsPreview:           true,
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		PreviewToken:        "preview-token",
		PreviewEntityType:   "menu",
	}

	byMethod := runtime.resolveReadOptions(ctx, state)
	byHelper := resolveNavigationReadOptions(runtime, ctx, state)
	if !reflect.DeepEqual(byMethod, byHelper) {
		t.Fatalf("expected runtime read-options method to delegate to helper, got method=%+v helper=%+v", byMethod, byHelper)
	}
}

func TestNavigationResolveMenuForLocationDelegatesToResolutionHelper(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				MainMenuLocation:   "site.main",
				FooterMenuLocation: "site.footer",
				FallbackMenuCode:   "site_primary",
			},
		}),
		menuSvc: &siteNavigationMenuStub{
			byLocation: map[string]*admin.Menu{
				"site.main": {
					Code:     "main_code",
					Location: "site.main",
					Items: []admin.MenuItem{
						{ID: "home", Label: "Home", Position: new(1), Target: map[string]any{"url": "/home"}},
					},
				},
			},
		},
	}

	state := RequestState{Locale: "en"}
	opts := navigationReadOptions{
		Locale:               "en",
		IncludeContributions: true,
		DedupPolicy:          menuDedupByURL,
		ViewProfile:          "compact",
	}

	byMethod := runtime.resolveMenuForLocation(context.Background(), state, "site.main", "/home", opts, true)
	byHelper := resolveNavigationMenuForLocation(runtime, context.Background(), state, "site.main", "/home", opts, true)
	if !reflect.DeepEqual(byMethod, byHelper) {
		t.Fatalf("expected runtime method to delegate to helper, got method=%+v helper=%+v", byMethod, byHelper)
	}
}

func TestNavigationContextDelegatesToResolutionHelper(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				MainMenuLocation:   "site.main",
				FooterMenuLocation: "site.footer",
				FallbackMenuCode:   "site_primary",
			},
		}),
		menuSvc: &siteNavigationMenuStub{
			byLocation: map[string]*admin.Menu{
				"site.main": {
					Code:     "main_code",
					Location: "site.main",
					Items: []admin.MenuItem{
						{ID: "home", Label: "Home", Position: new(1), Target: map[string]any{"url": "/home"}},
					},
				},
				"site.footer": {
					Code:     "footer_code",
					Location: "site.footer",
					Items: []admin.MenuItem{
						{ID: "legal", Label: "Legal", Position: new(1), Target: map[string]any{"url": "/legal"}},
					},
				},
			},
		},
	}

	ctx := router.NewMockContext()
	ctx.QueriesM["nav_debug"] = "true"
	ctx.On("Context").Return(context.Background())

	byMethod := runtime.context(ctx, RequestState{Locale: "en"}, "/home")
	byHelper := resolveNavigationContext(runtime, ctx, RequestState{Locale: "en"}, "/home")
	if !reflect.DeepEqual(byMethod, byHelper) {
		t.Fatalf("expected runtime context method to delegate to helper, got method=%+v helper=%+v", byMethod, byHelper)
	}
}

type siteNavigationErrorMenuStub struct {
	err error
}

func (s siteNavigationErrorMenuStub) CreateMenu(context.Context, string) (*admin.Menu, error) {
	return nil, s.err
}

func (s siteNavigationErrorMenuStub) AddMenuItem(context.Context, string, admin.MenuItem) error {
	return s.err
}

func (s siteNavigationErrorMenuStub) UpdateMenuItem(context.Context, string, admin.MenuItem) error {
	return s.err
}

func (s siteNavigationErrorMenuStub) DeleteMenuItem(context.Context, string, string) error {
	return s.err
}

func (s siteNavigationErrorMenuStub) ReorderMenu(context.Context, string, []string) error {
	return s.err
}

func (s siteNavigationErrorMenuStub) Menu(context.Context, string, string) (*admin.Menu, error) {
	return nil, s.err
}

func (s siteNavigationErrorMenuStub) MenuByLocation(context.Context, string, string) (*admin.Menu, error) {
	return nil, s.err
}

func (s siteNavigationErrorMenuStub) MenuByLocationWithOptions(context.Context, string, string, admin.SiteMenuReadOptions) (*admin.Menu, error) {
	return nil, s.err
}
