package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/internal/primitives"
)

func (r *navigationRuntime) enforceContributionLocalePolicy(ctx context.Context, items []admin.MenuItem, locale, policy string) []admin.MenuItem {
	return r.enforceContributionLocalePolicyWithCache(ctx, items, locale, policy, newSiteContentCache(), map[string]bool{})
}

func (r *navigationRuntime) enforceContributionLocalePolicyWithCache(
	ctx context.Context,
	items []admin.MenuItem,
	locale, policy string,
	contentCache *siteContentCache,
	matchCache map[string]bool,
) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	if r == nil || r.contentSvc == nil || normalizeContributionLocalePolicy(policy) != ContributionLocalePolicyStrict {
		return items
	}
	locale = strings.ToLower(strings.TrimSpace(locale))
	if locale == "" {
		return items
	}
	if contentCache == nil {
		contentCache = newSiteContentCache()
	}
	if matchCache == nil {
		matchCache = map[string]bool{}
	}
	filtered := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		item.Children = r.enforceContributionLocalePolicyWithCache(ctx, item.Children, locale, policy, contentCache, matchCache)
		if !menuItemMatchesRequestedLocale(ctx, r.contentSvc, item, locale, contentCache, matchCache) {
			continue
		}
		filtered = append(filtered, item)
	}
	if len(filtered) == 0 {
		return nil
	}
	return filtered
}

func menuItemMatchesRequestedLocale(
	ctx context.Context,
	contentSvc admin.CMSContentService,
	item admin.MenuItem,
	locale string,
	contentCache *siteContentCache,
	matchCache map[string]bool,
) bool {
	target := item.Target
	if len(target) == 0 {
		return true
	}
	targetType := strings.ToLower(strings.TrimSpace(anyString(target["type"])))
	if targetType != "content" {
		return true
	}
	contentID := strings.TrimSpace(anyString(target["content_id"]))
	if contentID == "" {
		return true
	}
	if contentCache == nil {
		contentCache = newSiteContentCache()
	}
	if matchCache == nil {
		matchCache = map[string]bool{}
	}
	cacheKey := siteContentRecordCacheKey(contentID, locale)
	if cached, ok := matchCache[cacheKey]; ok {
		return cached
	}
	record, err := contentCache.Content(ctx, contentSvc, contentID, locale)
	if err != nil || record == nil {
		matchCache[cacheKey] = false
		return false
	}
	resolvedLocale := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmpty(
		record.ResolvedLocale,
		record.Locale,
		anyString(record.Data["resolved_locale"]),
		anyString(record.Data["locale"]),
	)))
	missingRequested := record.MissingRequestedLocale || targetBool(record.Data, "missing_requested_locale")
	match := resolvedLocale == locale && !missingRequested
	matchCache[cacheKey] = match
	return match
}
