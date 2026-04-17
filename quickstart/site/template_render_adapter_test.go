package site

import (
	"testing"

	router "github.com/goliatone/go-router"
)

func TestSiteTemplateContextAddsRuntimeContract(t *testing.T) {
	view := router.ViewContext{
		"theme_name":    "site",
		"theme_variant": "light",
		"site_theme": map[string]any{
			"name": "site",
			"bundle_urls": map[string]string{
				"site_css": "/themes/site/site.css",
			},
		},
		"base_path":             "/site",
		"asset_base_path":       "/assets",
		"active_path":           "/site/search",
		"locale":                "en",
		"default_locale":        "en",
		"supported_locales":     []string{"en", "es"},
		"is_preview":            true,
		"preview_token_present": true,
		"preview_token_valid":   true,
	}

	out := siteTemplateContext(nil, view)
	runtime, ok := out["site_runtime"].(map[string]any)
	if !ok {
		t.Fatalf("expected site_runtime context map, got %+v", out["site_runtime"])
	}

	if got := anyString(runtime["theme_name"]); got != "site" {
		t.Fatalf("expected theme_name=site, got %q", got)
	}
	if got := anyString(runtime["asset_base_path"]); got != "/assets" {
		t.Fatalf("expected asset_base_path=/assets, got %q", got)
	}
	if !anyBool(runtime["is_preview"]) || !anyBool(runtime["preview_token_present"]) {
		t.Fatalf("expected preview flags in runtime context, got %+v", runtime)
	}
	if got := anyString(runtime["content_kind"]); got != "search" {
		t.Fatalf("expected content_kind=search, got %q", got)
	}
	if got := anyString(out["current_locale"]); got != "en" {
		t.Fatalf("expected current_locale=en, got %q", got)
	}
	if got := anyString(runtime["page_kind"]); got != "search" {
		t.Fatalf("expected page_kind=search, got %q", got)
	}

	siteTheme, ok := out["site_theme"].(map[string]any)
	if !ok {
		t.Fatalf("expected site_theme context map, got %+v", out["site_theme"])
	}
	bundles, ok := siteTheme["bundle_urls"].(map[string]string)
	if !ok {
		t.Fatalf("expected typed site_theme bundle_urls map, got %+v", siteTheme["bundle_urls"])
	}
	if bundles["site_css"] != "/themes/site/site.css" {
		t.Fatalf("expected site theme bundle url to be preserved, got %+v", bundles)
	}

	siteContent, ok := out["site_content"].(map[string]any)
	if !ok {
		t.Fatalf("expected site_content context map, got %+v", out["site_content"])
	}
	if got := anyString(siteContent["kind"]); got != "search" {
		t.Fatalf("expected site_content.kind=search, got %q", got)
	}

	sitePage, ok := out["site_page"].(map[string]any)
	if !ok {
		t.Fatalf("expected site_page context map, got %+v", out["site_page"])
	}
	if got := anyString(sitePage["body_class"]); got != "site-page site-page--search" {
		t.Fatalf("expected generic search page body class, got %q", got)
	}
	if got := anyString(sitePage["main_class"]); got != "site-page__main site-page__main--search" {
		t.Fatalf("expected generic search page main class, got %q", got)
	}
}

func TestSiteTemplateContextPromotesRootTemplateCandidatesFromViewContext(t *testing.T) {
	view := router.ViewContext{
		"site_template_candidates": []string{"site/home/page", "site/page"},
	}

	out := siteTemplateContext(nil, view)
	sitePage, ok := out["site_page"].(map[string]any)
	if !ok {
		t.Fatalf("expected site_page context map, got %+v", out["site_page"])
	}

	candidates, ok := sitePage["template_candidates"].([]string)
	if !ok {
		t.Fatalf("expected page template candidates, got %+v", sitePage["template_candidates"])
	}
	if len(candidates) != 2 || candidates[0] != "site/home/page" || candidates[1] != "site/page" {
		t.Fatalf("expected root template candidates promoted into page context, got %+v", candidates)
	}
}

func TestSiteTemplateContextPrefersResolvedLocaleSwitcherOverRequestFallback(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.LocalsMock[viewContextLocalsKey] = router.ViewContext{
		"locale_switcher": map[string]any{
			"items": []any{
				map[string]any{"locale": "en", "url": "/zh/about?locale=en"},
				map[string]any{"locale": "bo", "url": "/bo/zh/about"},
				map[string]any{"locale": "zh", "url": "/zh/zh/about"},
			},
		},
	}

	out := siteTemplateContext(ctx, router.ViewContext{
		"locale_switcher": map[string]any{
			"items": []any{
				map[string]any{"locale": "en", "url": "/about?locale=en"},
				map[string]any{"locale": "bo", "url": "/bo/about"},
				map[string]any{"locale": "zh", "url": "/zh/about"},
			},
		},
	})

	switcher, ok := out["locale_switcher"].(map[string]any)
	if !ok {
		t.Fatalf("expected locale_switcher map, got %#v", out["locale_switcher"])
	}
	items, ok := switcher["items"].([]any)
	if !ok || len(items) != 3 {
		t.Fatalf("expected locale switcher items, got %#v", switcher["items"])
	}
	for idx, want := range []string{"/about?locale=en", "/bo/about", "/zh/about"} {
		item, ok := items[idx].(map[string]any)
		if !ok {
			t.Fatalf("expected locale switcher item map, got %#v", items[idx])
		}
		if got := anyString(item["url"]); got != want {
			t.Fatalf("expected locale switcher item %d to keep resolved URL %q, got %q", idx, want, got)
		}
	}
}
