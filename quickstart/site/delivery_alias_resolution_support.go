package site

import (
	"context"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func (r *deliveryRuntime) localizedCapabilityRecords(
	ctx context.Context,
	capability deliveryCapability,
	state RequestState,
	cache *siteContentCache,
	localeGroups ...[]string,
) localizedCapabilityRecordSet {
	if r == nil || r.contentSvc == nil || !r.siteCfg.Features.EnableI18N {
		return localizedCapabilityRecordSet{}
	}

	locales := uniqueLocaleOrder(localeGroups...)
	if len(locales) == 0 {
		return localizedCapabilityRecordSet{}
	}

	out := localizedCapabilityRecordSet{
		locales:  locales,
		byLocale: make(map[string][]admin.CMSContent, len(locales)),
	}
	for _, locale := range locales {
		items, err := r.listSiteContentsCached(ctx, locale, cache)
		if err != nil || len(items) == 0 {
			continue
		}

		localeState := state
		localeState.Locale = locale
		filtered := make([]admin.CMSContent, 0, len(items))
		for _, item := range items {
			if !matchesCapabilityType(item, capability.TypeSlug) {
				continue
			}
			if !recordVisibleForRequest(item, capability, localeState) {
				continue
			}
			filtered = append(filtered, item)
		}
		if len(filtered) == 0 {
			continue
		}
		out.byLocale[locale] = filtered
	}
	return out
}

func (r *deliveryRuntime) resolvePagePathAliasCandidates(
	ctx context.Context,
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
	cache *siteContentCache,
) []admin.CMSContent {
	if r == nil || r.contentSvc == nil || len(records) == 0 || !r.siteCfg.Features.EnableI18N {
		return nil
	}

	identityToRecord := contentIdentityRecordMap(records, capability)
	if len(identityToRecord) == 0 {
		return nil
	}

	requestPath = normalizeLocalePath(requestPath)
	localized := r.localizedCapabilityRecords(
		ctx,
		capability,
		state,
		cache,
		state.SupportedLocales,
		[]string{state.Locale},
		[]string{state.DefaultLocale},
		[]string{r.siteCfg.DefaultLocale},
	)
	matchedKeys := matchedPageAliasIdentityKeys(localized, capability, requestPath, identityToRecord)
	if len(matchedKeys) == 0 {
		return nil
	}

	keys := sortedStringSetKeys(matchedKeys)
	out := make([]admin.CMSContent, 0, len(keys))
	for _, key := range keys {
		out = append(out, identityToRecord[key])
	}
	return out
}

func contentIdentityRecordMap(records []admin.CMSContent, capability deliveryCapability) map[string]admin.CMSContent {
	identityToRecord := map[string]admin.CMSContent{}
	for _, record := range records {
		key := strings.TrimSpace(contentIdentityKey(record, capability))
		if key == "" {
			continue
		}
		if _, exists := identityToRecord[key]; exists {
			continue
		}
		identityToRecord[key] = record
	}
	return identityToRecord
}

func matchedPageAliasIdentityKeys(
	localized localizedCapabilityRecordSet,
	capability deliveryCapability,
	requestPath string,
	identityToRecord map[string]admin.CMSContent,
) map[string]struct{} {
	matchedKeys := map[string]struct{}{}
	for _, locale := range localized.locales {
		for _, item := range localized.byLocale[locale] {
			key := pageAliasIdentityKey(item, capability, requestPath, identityToRecord)
			if key != "" {
				matchedKeys[key] = struct{}{}
			}
		}
	}
	return matchedKeys
}

func pageAliasIdentityKey(item admin.CMSContent, capability deliveryCapability, requestPath string, identityToRecord map[string]admin.CMSContent) string {
	if !pathsMatch(recordDeliveryPath(item, capability), requestPath) {
		return ""
	}
	key := strings.TrimSpace(contentIdentityKey(item, capability))
	if key == "" {
		return ""
	}
	if _, ok := identityToRecord[key]; !ok {
		return ""
	}
	return key
}

func sortedStringSetKeys(set map[string]struct{}) []string {
	keys := make([]string, 0, len(set))
	for key := range set {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func (r *deliveryRuntime) resolveDetailPathAliasCandidates(
	ctx context.Context,
	capability deliveryCapability,
	state RequestState,
	requestPath string,
	slug string,
	cache *siteContentCache,
) []admin.CMSContent {
	if r == nil || r.contentSvc == nil || !r.siteCfg.Features.EnableI18N {
		return nil
	}

	requestPath = normalizeLocalePath(requestPath)
	localized := r.localizedCapabilityRecords(
		ctx,
		capability,
		state,
		cache,
		state.SupportedLocales,
		[]string{state.Locale},
		[]string{state.DefaultLocale},
		[]string{r.siteCfg.DefaultLocale},
	)
	if len(localized.locales) == 0 {
		return nil
	}

	matchedIdentityKeys := matchedDetailAliasIdentityKeys(localized, capability, requestPath, slug)
	if len(matchedIdentityKeys) == 0 {
		return nil
	}

	return uniqueDetailAliasCandidates(localized, capability, matchedIdentityKeys)
}

func matchedDetailAliasIdentityKeys(localized localizedCapabilityRecordSet, capability deliveryCapability, requestPath string, slug string) map[string]struct{} {
	matchedIdentityKeys := map[string]struct{}{}
	for _, locale := range localized.locales {
		for _, item := range localized.byLocale[locale] {
			if !detailAliasItemMatches(item, capability, requestPath, slug) {
				continue
			}
			key := strings.TrimSpace(contentIdentityKey(item, capability))
			if key != "" {
				matchedIdentityKeys[key] = struct{}{}
			}
		}
	}
	return matchedIdentityKeys
}

func detailAliasItemMatches(item admin.CMSContent, capability deliveryCapability, requestPath string, slug string) bool {
	if requestPath != "" && pathsMatch(recordDeliveryPath(item, capability), requestPath) {
		return true
	}
	return slug != "" && deliverySlugMatches(item, slug, capability)
}

func uniqueDetailAliasCandidates(
	localized localizedCapabilityRecordSet,
	capability deliveryCapability,
	matchedIdentityKeys map[string]struct{},
) []admin.CMSContent {
	seen := map[string]struct{}{}
	out := []admin.CMSContent{}
	for _, locale := range localized.locales {
		for _, item := range localized.byLocale[locale] {
			key := strings.TrimSpace(contentIdentityKey(item, capability))
			if _, ok := matchedIdentityKeys[key]; !ok {
				continue
			}
			uniqueKey := detailAliasUniqueKey(item, capability, key)
			if _, ok := seen[uniqueKey]; ok {
				continue
			}
			seen[uniqueKey] = struct{}{}
			out = append(out, item)
		}
	}
	return out
}

func detailAliasUniqueKey(item admin.CMSContent, capability deliveryCapability, identityKey string) string {
	uniqueKey := strings.TrimSpace(item.ID) + "|" + strings.ToLower(strings.TrimSpace(item.Locale))
	if uniqueKey != "|" {
		return uniqueKey
	}
	return identityKey + "|" + strings.ToLower(strings.TrimSpace(recordDeliveryPath(item, capability)))
}

func resolutionFromDetailRecord(
	capability deliveryCapability,
	record admin.CMSContent,
	requestedLocale string,
	availableLocales []string,
	fallbackUsed bool,
	group []admin.CMSContent,
) *deliveryResolution {
	record = withResolvedLocaleMetadata(record, requestedLocale, availableLocales, fallbackUsed)
	recordData := record.Data
	if recordData == nil {
		recordData = map[string]any{}
	}
	resolvedLocale := strings.TrimSpace(firstNonEmpty(record.ResolvedLocale, record.Locale, requestedLocale))
	return &deliveryResolution{
		Mode:               "detail",
		Capability:         capability,
		Record:             &record,
		RequestedLocale:    strings.TrimSpace(requestedLocale),
		ResolvedLocale:     resolvedLocale,
		AvailableLocales:   availableLocales,
		MissingRequested:   fallbackUsed,
		FamilyID:           strings.TrimSpace(firstNonEmpty(record.FamilyID, anyString(recordData["family_id"]))),
		PathsByLocale:      localizedPathsFromGroup(group, capability),
		TemplateCandidates: capability.detailTemplateCandidates(),
	}
}
