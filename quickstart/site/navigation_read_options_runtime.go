package site

import (
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
)

func resolveNavigationReadOptions(r *navigationRuntime, c router.Context, state RequestState) navigationReadOptions {
	opts := navigationReadOptions{
		Locale:                   strings.TrimSpace(state.Locale),
		IncludeContributions:     queryBoolValue(c, "include_contributions", true),
		DedupPolicy:              navigationReadOptionsDedupPolicy(c),
		ContributionLocalePolicy: navigationReadOptionsContributionLocalePolicy(r, c),
		ViewProfile:              navigationReadOptionsViewProfile(c),
	}

	applyNavigationPreviewReadOptions(r, state, &opts)
	return opts
}

func navigationReadOptionsDedupPolicy(c router.Context) string {
	policy := normalizeDedupPolicy(strings.TrimSpace(primitives.FirstNonEmpty(
		queryValue(c, "menu_dedupe_policy"),
		queryValue(c, "dedupe_policy"),
		queryValue(c, "contribution_duplicate_policy"),
	)))
	if policy == "" {
		return menuDedupByURL
	}
	return policy
}

func navigationReadOptionsContributionLocalePolicy(r *navigationRuntime, c router.Context) string {
	return normalizeContributionLocalePolicy(strings.TrimSpace(primitives.FirstNonEmpty(
		queryValue(c, "contribution_locale_policy"),
		r.siteCfg.Navigation.ContributionLocalePolicy,
	)))
}

func applyNavigationPreviewReadOptions(r *navigationRuntime, state RequestState, opts *navigationReadOptions) {
	if opts == nil {
		return
	}
	if previewStateAllowsDraft(state) &&
		r.siteCfg.Features.EnableMenuDraftPreview &&
		previewEntityAllowsMenuDrafts(state.PreviewEntityType) {
		opts.IncludeDrafts = true
		opts.PreviewToken = strings.TrimSpace(state.PreviewToken)
	}
}

func navigationReadOptionsViewProfile(c router.Context) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(c.Query("view_profile"))
}
