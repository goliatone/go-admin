package site

import (
	"io/fs"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/client"
)

func TestSiteTemplateContractsForPhase14(t *testing.T) {
	templates := client.Templates()
	baseTemplatePath := "site/base.html"
	baseRaw, err := fs.ReadFile(templates, baseTemplatePath)
	if err != nil {
		t.Fatalf("read base template: %v", err)
	}
	base := string(baseRaw)
	headerTemplatePath := "site/partials/header.html"
	headerRaw, err := fs.ReadFile(templates, headerTemplatePath)
	if err != nil {
		t.Fatalf("read header partial: %v", err)
	}
	footerTemplatePath := "site/partials/footer.html"
	footerRaw, err := fs.ReadFile(templates, footerTemplatePath)
	if err != nil {
		t.Fatalf("read footer partial: %v", err)
	}
	mainMenuPartialPath := "site/partials/menu_main.html"
	mainMenuRaw, err := fs.ReadFile(templates, mainMenuPartialPath)
	if err != nil {
		t.Fatalf("read main menu partial: %v", err)
	}
	footerMenuPartialPath := "site/partials/menu_footer.html"
	footerMenuRaw, err := fs.ReadFile(templates, footerMenuPartialPath)
	if err != nil {
		t.Fatalf("read footer menu partial: %v", err)
	}
	navigationTemplates := base + "\n" + string(headerRaw) + "\n" + string(footerRaw) + "\n" + string(mainMenuRaw) + "\n" + string(footerMenuRaw)
	for _, required := range []string{
		"preview_banner",
		"locale_switcher",
		"locale_switcher.items",
		"main_menu",
		"main_menu.items",
		"footer_menu",
		"footer_menu.items",
		"navigation_debug",
		"active_match",
		"contribution_origin",
		"data-site-menu-item",
		"data-site-menu-children",
		"md:group-hover:flex",
		"md:group-focus-within:flex",
		"theme_name",
		"theme_variant",
		"base_path",
		"asset_base_path",
		"active_path",
		"supported_locales",
	} {
		if !strings.Contains(navigationTemplates, required) {
			t.Fatalf("expected site base/menu templates to include %q contract", required)
		}
	}

	errorTemplatePath := "site/error.html"
	errorRaw, err := fs.ReadFile(templates, errorTemplatePath)
	if err != nil {
		t.Fatalf("read generic error template: %v", err)
	}
	errorTemplate := string(errorRaw)
	for _, required := range []string{
		"error_code",
		"error_status",
		"requested_locale",
		"available_locales",
		"theme_name",
		"theme_variant",
		"base_path",
		"asset_base_path",
		"active_path",
		"supported_locales",
	} {
		if !strings.Contains(errorTemplate, required) {
			t.Fatalf("expected error template to include %q contract", required)
		}
	}

	for _, path := range []string{
		"site/error/404.html",
		"site/error/missing_translation.html",
		"site/home/page.html",
		"site/partials/menu_main.html",
		"site/partials/menu_footer.html",
	} {
		if _, err = fs.Stat(templates, path); err != nil {
			t.Fatalf("expected default site template %s to exist: %v", path, err)
		}
	}

	searchTemplatePath := "site/search.html"
	searchRaw, err := fs.ReadFile(templates, searchTemplatePath)
	if err != nil {
		t.Fatalf("read search template: %v", err)
	}
	searchTemplate := string(searchRaw)
	for _, required := range []string{
		"search_results",
		"search_facets",
		"search_filter_chips",
		"search_pagination",
		"search_sort_options",
		"search_state",
		"search_error",
		"theme_name",
		"theme_variant",
		"base_path",
		"asset_base_path",
		"active_path",
		"supported_locales",
	} {
		if !strings.Contains(searchTemplate, required) {
			t.Fatalf("expected search template to include %q contract", required)
		}
	}

	homepageTemplatePath := "site/home/page.html"
	homepageRaw, err := fs.ReadFile(templates, homepageTemplatePath)
	if err != nil {
		t.Fatalf("read homepage template: %v", err)
	}
	homepageTemplate := string(homepageRaw)
	for _, required := range []string{
		"data-site-homepage",
		"record.title",
		"record.summary",
		"record.data.content",
		"requested_locale",
		"resolved_locale",
	} {
		if !strings.Contains(homepageTemplate, required) {
			t.Fatalf("expected homepage template to include %q contract", required)
		}
	}
}
