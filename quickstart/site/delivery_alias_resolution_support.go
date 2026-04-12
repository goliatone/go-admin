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
	if len(identityToRecord) == 0 {
		return nil
	}

	matchedKeys := map[string]struct{}{}
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
	for _, locale := range localized.locales {
		for _, item := range localized.byLocale[locale] {
			if !pathsMatch(recordDeliveryPath(item, capability), requestPath) {
				continue
			}
			key := strings.TrimSpace(contentIdentityKey(item, capability))
			if key == "" {
				continue
			}
			if _, ok := identityToRecord[key]; !ok {
				continue
			}
			matchedKeys[key] = struct{}{}
		}
	}
	if len(matchedKeys) == 0 {
		return nil
	}

	keys := make([]string, 0, len(matchedKeys))
	for key := range matchedKeys {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	out := make([]admin.CMSContent, 0, len(keys))
	for _, key := range keys {
		out = append(out, identityToRecord[key])
	}
	return out
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

	matchedIdentityKeys := map[string]struct{}{}
	for _, locale := range localized.locales {
		for _, item := range localized.byLocale[locale] {
			matches := false
			if requestPath != "" && pathsMatch(recordDeliveryPath(item, capability), requestPath) {
				matches = true
			} else if slug != "" {
				matches = deliverySlugMatches(item, slug, capability)
			}
			if !matches {
				continue
			}
			key := strings.TrimSpace(contentIdentityKey(item, capability))
			if key == "" {
				continue
			}
			matchedIdentityKeys[key] = struct{}{}
		}
	}
	if len(matchedIdentityKeys) == 0 {
		return nil
	}

	seen := map[string]struct{}{}
	out := []admin.CMSContent{}
	for _, locale := range localized.locales {
		for _, item := range localized.byLocale[locale] {
			key := strings.TrimSpace(contentIdentityKey(item, capability))
			if _, ok := matchedIdentityKeys[key]; !ok {
				continue
			}
			uniqueKey := strings.TrimSpace(item.ID) + "|" + strings.ToLower(strings.TrimSpace(item.Locale))
			if uniqueKey == "|" {
				uniqueKey = key + "|" + strings.ToLower(strings.TrimSpace(recordDeliveryPath(item, capability)))
			}
			if _, ok := seen[uniqueKey]; ok {
				continue
			}
			seen[uniqueKey] = struct{}{}
			out = append(out, item)
		}
	}
	return out
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
