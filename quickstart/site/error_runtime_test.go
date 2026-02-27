package site

import "testing"

func TestResolveErrorTemplateCandidatesPriority(t *testing.T) {
	cfg := ResolvedSiteViewConfig{
		ErrorTemplate: "site/error",
		ErrorTemplatesByStatus: map[int]string{
			404: "site/error/404",
		},
		ErrorTemplatesByCode: map[string]string{
			siteErrorCodeTranslationMissing: "site/error/missing_translation",
		},
	}

	candidates := ResolveErrorTemplateCandidates(cfg, siteErrorCodeTranslationMissing, 404)
	if len(candidates) != 3 {
		t.Fatalf("expected three candidates, got %+v", candidates)
	}
	if candidates[0] != "site/error/missing_translation" {
		t.Fatalf("expected code template first, got %+v", candidates)
	}
	if candidates[1] != "site/error/404" {
		t.Fatalf("expected status template second, got %+v", candidates)
	}
	if candidates[2] != "site/error" {
		t.Fatalf("expected generic template last, got %+v", candidates)
	}
}

func TestResolveErrorTemplateFallbacks(t *testing.T) {
	cfg := ResolvedSiteViewConfig{
		ErrorTemplate: "site/error",
		ErrorTemplatesByStatus: map[int]string{
			404: "site/error/404",
		},
	}
	if got := ResolveErrorTemplate(cfg, siteErrorCodeTranslationMissing, 404); got != "site/error/404" {
		t.Fatalf("expected status fallback for missing code template, got %q", got)
	}
	if got := ResolveErrorTemplate(cfg, "", 500); got != "site/error" {
		t.Fatalf("expected generic fallback when no status template exists, got %q", got)
	}
}
