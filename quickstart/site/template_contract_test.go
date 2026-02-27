package site

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSiteTemplateContractsForPhase14(t *testing.T) {
	baseTemplatePath := filepath.Join("..", "..", "pkg", "client", "templates", "site", "base.html")
	baseRaw, err := os.ReadFile(baseTemplatePath)
	if err != nil {
		t.Fatalf("read base template: %v", err)
	}
	base := string(baseRaw)
	mainMenuPartialPath := filepath.Join("..", "..", "pkg", "client", "templates", "site", "partials", "menu_main.html")
	mainMenuRaw, err := os.ReadFile(mainMenuPartialPath)
	if err != nil {
		t.Fatalf("read main menu partial: %v", err)
	}
	footerMenuPartialPath := filepath.Join("..", "..", "pkg", "client", "templates", "site", "partials", "menu_footer.html")
	footerMenuRaw, err := os.ReadFile(footerMenuPartialPath)
	if err != nil {
		t.Fatalf("read footer menu partial: %v", err)
	}
	navigationTemplates := base + "\n" + string(mainMenuRaw) + "\n" + string(footerMenuRaw)
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

	errorTemplatePath := filepath.Join("..", "..", "pkg", "client", "templates", "site", "error.html")
	errorRaw, err := os.ReadFile(errorTemplatePath)
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
		filepath.Join("..", "..", "pkg", "client", "templates", "site", "error", "404.html"),
		filepath.Join("..", "..", "pkg", "client", "templates", "site", "error", "missing_translation.html"),
		filepath.Join("..", "..", "pkg", "client", "templates", "site", "partials", "menu_main.html"),
		filepath.Join("..", "..", "pkg", "client", "templates", "site", "partials", "menu_footer.html"),
	} {
		if _, err := os.Stat(path); err != nil {
			t.Fatalf("expected default site template %s to exist: %v", path, err)
		}
	}

	searchTemplatePath := filepath.Join("..", "..", "pkg", "client", "templates", "site", "search.html")
	searchRaw, err := os.ReadFile(searchTemplatePath)
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
}
