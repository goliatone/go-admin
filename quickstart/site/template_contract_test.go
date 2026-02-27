package site

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSiteTemplateContractsForPhase8(t *testing.T) {
	baseTemplatePath := filepath.Join("..", "..", "pkg", "client", "templates", "site", "base.html")
	baseRaw, err := os.ReadFile(baseTemplatePath)
	if err != nil {
		t.Fatalf("read base template: %v", err)
	}
	base := string(baseRaw)
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
	} {
		if !strings.Contains(base, required) {
			t.Fatalf("expected base template to include %q contract", required)
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
	} {
		if !strings.Contains(errorTemplate, required) {
			t.Fatalf("expected error template to include %q contract", required)
		}
	}

	for _, path := range []string{
		filepath.Join("..", "..", "pkg", "client", "templates", "site", "error", "404.html"),
		filepath.Join("..", "..", "pkg", "client", "templates", "site", "error", "missing_translation.html"),
	} {
		if _, err := os.Stat(path); err != nil {
			t.Fatalf("expected default error template %s to exist: %v", path, err)
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
	} {
		if !strings.Contains(searchTemplate, required) {
			t.Fatalf("expected search template to include %q contract", required)
		}
	}
}
