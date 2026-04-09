package site

import (
	"strings"
	"testing"
)

func TestBuildSiteThemeContractResolvesBundleURLsAndAliases(t *testing.T) {
	contract := buildSiteThemeContract(map[string]map[string]string{
		"selection": {
			"name":    "garchen-archive-site",
			"variant": "dark",
		},
		"tokens": {
			"color-bg-primary":           "#111827",
			"color-brand-solid":          "#c2410c",
			"color-text-brand-secondary": "#fb923c",
		},
		"css_vars": {
			"--color-bg-primary":           "#111827",
			"--color-text-primary":         "#f8fafc",
			"--color-brand-solid":          "#c2410c",
			"--color-text-brand-secondary": "#fb923c",
		},
		"assets": {
			"prefix":     "/static/themes/garchen-archive-site",
			"tokens.css": "static/tokens.css",
			"site.css":   "static/site.css",
			"site.js":    "static/site.js",
		},
		"partials": {
			siteThemeTemplateKeyHeader:        "templates/site/partials/header.html",
			siteThemeTemplateKeyMainNav:       "templates/site/partials/menu_main.html",
			siteThemeTemplateKeySearchPage:    "templates/site/search/page.html",
			siteThemeTemplateKeyContentDetail: "templates/site/content/detail.html",
		},
	}, "/site-assets")

	if anyString(contract["name"]) != "garchen-archive-site" {
		t.Fatalf("expected site theme name, got %+v", contract)
	}
	if anyString(contract["variant"]) != "dark" {
		t.Fatalf("expected site theme variant, got %+v", contract)
	}

	bundleURLs, ok := contract["bundle_urls"].(map[string]string)
	if !ok {
		t.Fatalf("expected bundle urls map, got %+v", contract["bundle_urls"])
	}
	if bundleURLs["site_css"] != "/static/themes/garchen-archive-site/static/site.css" {
		t.Fatalf("expected site_css bundle URL, got %+v", bundleURLs)
	}
	if bundleURLs["site_js"] != "/static/themes/garchen-archive-site/static/site.js" {
		t.Fatalf("expected site_js bundle URL, got %+v", bundleURLs)
	}

	partials, ok := contract["partials"].(map[string]string)
	if !ok {
		t.Fatalf("expected aliased partials map, got %+v", contract["partials"])
	}
	if partials["header"] != "site/partials/header.html" {
		t.Fatalf("expected header alias, got %+v", partials)
	}
	if partials["main_nav"] != "site/partials/menu_main.html" {
		t.Fatalf("expected main_nav alias, got %+v", partials)
	}
	if partials["search_page"] != "site/search/page.html" {
		t.Fatalf("expected search_page alias, got %+v", partials)
	}

	style := anyString(contract["css_vars_style"])
	if !strings.Contains(style, "--color-bg-primary: #111827;") || !strings.Contains(style, "--color-text-primary: #f8fafc;") {
		t.Fatalf("expected deterministic css vars style output, got %q", style)
	}

	shellVars, ok := contract["shell_vars"].(map[string]string)
	if !ok {
		t.Fatalf("expected shell_vars map, got %+v", contract["shell_vars"])
	}
	if shellVars["site_color_primary"] != "#c2410c" {
		t.Fatalf("expected site_color_primary from theme tokens, got %+v", shellVars)
	}
	if shellVars["site_color_accent"] != "#fb923c" {
		t.Fatalf("expected site_color_accent from theme tokens, got %+v", shellVars)
	}
	if shellVars["site_color_surface"] != "#111827" {
		t.Fatalf("expected site_color_surface from theme tokens, got %+v", shellVars)
	}
}
