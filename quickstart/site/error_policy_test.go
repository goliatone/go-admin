package site

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestResolveSiteConfigComposesAndClonesErrorPolicy(t *testing.T) {
	input := SiteConfig{Views: SiteViewConfig{
		ErrorTemplate: "site/error",
		ErrorTemplatesByStatus: map[int]string{
			404: "site/error/legacy-404",
		},
		ErrorTemplatesByCode: map[string]string{
			" Translation_Missing ": "site/error/legacy-missing",
		},
		ErrorPolicy: SiteErrorTemplatePolicy{
			ByCode: map[string][]SiteTemplateRef{
				" Translation_Missing ": {{Template: "site/error/policy-missing"}},
			},
			ByStatus: map[int][]SiteTemplateRef{
				404: {{ThemeKey: "site.error.404_page", DefaultTemplate: "site/error/404"}},
			},
			Fallback: []SiteTemplateRef{{Template: "site/error/policy"}},
		},
	}}

	resolved := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, input)
	input.Views.ErrorPolicy.ByStatus[404][0] = SiteTemplateRef{Template: "mutated"}
	input.Views.ErrorPolicy.ByCode[" Translation_Missing "][0] = SiteTemplateRef{Template: "mutated"}
	input.Views.ErrorTemplatesByStatus[404] = "mutated"

	if got, want := resolved.Views.ErrorPolicy.ByCode[siteErrorCodeTranslationMissing], []SiteTemplateRef{
		{Template: "site/error/policy-missing"},
		{Template: "site/error/legacy-missing"},
	}; !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected code policy: got %#v want %#v", got, want)
	}
	if got, want := resolved.Views.ErrorPolicy.ByStatus[404], []SiteTemplateRef{
		{ThemeKey: "site.error.404_page", DefaultTemplate: "site/error/404"},
		{Template: "site/error/legacy-404"},
	}; !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected status policy: got %#v want %#v", got, want)
	}
	if got, want := resolved.Views.ErrorPolicy.Fallback, []SiteTemplateRef{
		{Template: "site/error/policy"},
		{Template: "site/error"},
	}; !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected fallback policy: got %#v want %#v", got, want)
	}
}

func TestSiteErrorTemplatePolicyJSONRoundTrip(t *testing.T) {
	want := SiteErrorTemplatePolicy{
		ByCode:   map[string][]SiteTemplateRef{"not_found": {{Template: "site/error/not-found"}}},
		ByStatus: map[int][]SiteTemplateRef{404: {{ThemeKey: "site.error.404_page", DefaultTemplate: "site/error/404"}}},
		Fallback: []SiteTemplateRef{{Template: "site/error"}},
	}
	raw, err := json.Marshal(want)
	if err != nil {
		t.Fatalf("marshal policy: %v", err)
	}
	var got SiteErrorTemplatePolicy
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatalf("unmarshal policy: %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("round trip mismatch: got %#v want %#v", got, want)
	}
}

func TestResolveSiteErrorTemplateCandidatesThemeAndFallbackOrder(t *testing.T) {
	cfg := ResolvedSiteViewConfig{ErrorPolicy: SiteErrorTemplatePolicy{
		ByCode: map[string][]SiteTemplateRef{
			siteErrorCodeTranslationMissing: {{Template: "site/error/missing-translation"}},
		},
		ByStatus: map[int][]SiteTemplateRef{
			404: {
				{ThemeKey: "site.error.invalid"},
				{ThemeKey: "site.error.404_page", DefaultTemplate: "site/error/404"},
				{ThemeKey: siteThemeTemplateKeyHomePage},
				{Template: "../unsafe"},
			},
		},
		Fallback: []SiteTemplateRef{{Template: "site/error"}, {Template: "site/error"}},
	}}
	view := router.ViewContext{"site_theme": map[string]any{
		"manifest_partials": map[string]string{
			"site.error.invalid":         "/templates/site/error/unsafe.html",
			"site.error.404_page":        "templates/site/error/branded.html",
			siteThemeTemplateKeyHomePage: "templates/site/home/page.html",
		},
		"partials": map[string]string{"home_page": "templates/site/home/alias.html"},
	}}

	got := ResolveSiteErrorTemplateCandidates(cfg, " Translation_Missing ", 404, view)
	want := []SiteErrorTemplateCandidate{
		{Template: "site/error/missing-translation", Source: "code"},
		{Template: "site/error/branded", Source: "status", ThemeKey: "site.error.404_page"},
		{Template: "site/home/page", Source: "status", ThemeKey: siteThemeTemplateKeyHomePage},
		{Template: "site/error", Source: "fallback", IsFallback: true},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected candidates:\n got %#v\nwant %#v", got, want)
	}
}

func TestResolveSiteErrorTemplateCandidatesInvalidThemeTargetAdvances(t *testing.T) {
	cfg := ResolvedSiteViewConfig{ErrorPolicy: SiteErrorTemplatePolicy{
		ByStatus: map[int][]SiteTemplateRef{404: {
			{ThemeKey: "site.error.invalid", DefaultTemplate: "site/error/wrong-default"},
			{Template: "site/error/safe"},
		}},
	}}
	view := router.ViewContext{"site_theme": map[string]any{
		"manifest_partials": map[string]string{"site.error.invalid": "../private/error.html"},
	}}

	got := ResolveSiteErrorTemplateCandidates(cfg, "", 404, view)
	want := []SiteErrorTemplateCandidate{{Template: "site/error/safe", Source: "status"}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("invalid target must advance to the next ref: got %#v want %#v", got, want)
	}
}

func TestResolveSiteErrorTemplateCandidatesUsesDefaultAndAlias(t *testing.T) {
	cfg := ResolvedSiteViewConfig{ErrorPolicy: SiteErrorTemplatePolicy{
		ByStatus: map[int][]SiteTemplateRef{404: {
			{ThemeKey: "site.error.missing", DefaultTemplate: "site/error/404"},
			{ThemeKey: siteThemeTemplateKeyHomePage},
		}},
	}}
	view := router.ViewContext{"site_theme": map[string]any{
		"partials": map[string]string{"home_page": "templates/site/home/alias.tmpl"},
	}}

	got := ResolveSiteErrorTemplateCandidates(cfg, "", 404, view)
	want := []SiteErrorTemplateCandidate{
		{Template: "site/error/404", Source: "status", ThemeKey: "site.error.missing"},
		{Template: "site/home/alias", Source: "status", ThemeKey: siteThemeTemplateKeyHomePage},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected candidates: got %#v want %#v", got, want)
	}
}

func TestResolveSiteErrorTemplateCandidatesComposesDirectLegacyResolvedConfig(t *testing.T) {
	cfg := ResolvedSiteViewConfig{
		ErrorTemplate:          "site/error",
		ErrorTemplatesByStatus: map[int]string{404: "site/error/404"},
		ErrorTemplatesByCode:   map[string]string{siteErrorCodeTranslationMissing: "site/error/missing"},
	}
	got := ResolveSiteErrorTemplateCandidates(cfg, siteErrorCodeTranslationMissing, 404, nil)
	want := []SiteErrorTemplateCandidate{
		{Template: "site/error/missing", Source: "code"},
		{Template: "site/error/404", Source: "status"},
		{Template: "site/error", Source: "fallback", IsFallback: true},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("direct legacy resolved config mismatch: got %#v want %#v", got, want)
	}
}
