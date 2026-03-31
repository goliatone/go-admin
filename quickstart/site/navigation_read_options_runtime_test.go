package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestResolveNavigationReadOptionsIncludesPreviewDraftsAndPolicies(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				ContributionLocalePolicy: ContributionLocalePolicyFallback,
			},
			Features: SiteFeatures{
				EnableMenuDraftPreview: boolPtr(true),
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

	opts := resolveNavigationReadOptions(runtime, ctx, state)
	if opts.Locale != "es" {
		t.Fatalf("expected locale es, got %+v", opts)
	}
	if opts.IncludeContributions {
		t.Fatalf("expected include_contributions false, got %+v", opts)
	}
	if !opts.IncludeDrafts || opts.PreviewToken != "preview-token" {
		t.Fatalf("expected menu preview token to enable drafts, got %+v", opts)
	}
	if opts.ViewProfile != "compact" {
		t.Fatalf("expected view profile compact, got %+v", opts)
	}
	if opts.DedupPolicy != menuDedupByTarget {
		t.Fatalf("expected dedup policy %q, got %+v", menuDedupByTarget, opts)
	}
	if opts.ContributionLocalePolicy != ContributionLocalePolicyStrict {
		t.Fatalf("expected contribution locale policy strict, got %+v", opts)
	}
}

func TestResolveNavigationReadOptionsDefaultsDedupPolicyAndDisablesPreviewDrafts(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				ContributionLocalePolicy: ContributionLocalePolicyFallback,
			},
			Features: SiteFeatures{
				EnableMenuDraftPreview: boolPtr(false),
			},
		}),
	}

	ctx := router.NewMockContext()

	opts := resolveNavigationReadOptions(runtime, ctx, RequestState{
		Locale:            "en",
		IsPreview:         true,
		PreviewToken:      "preview-token",
		PreviewEntityType: "menu",
	})

	if opts.DedupPolicy != menuDedupByURL {
		t.Fatalf("expected default dedup policy %q, got %+v", menuDedupByURL, opts)
	}
	if opts.ContributionLocalePolicy != ContributionLocalePolicyFallback {
		t.Fatalf("expected fallback contribution locale policy, got %+v", opts)
	}
	if opts.IncludeDrafts || opts.PreviewToken != "" {
		t.Fatalf("expected preview drafts disabled when menu draft preview is off, got %+v", opts)
	}
	if opts.ViewProfile != "" {
		t.Fatalf("expected empty view profile by default, got %+v", opts)
	}
}
