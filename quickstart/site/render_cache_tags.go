package site

import (
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

func renderCacheTagsForResolution(siteCfg ResolvedSiteConfig, state RequestState, decision renderCacheDecision, resolution *deliveryResolution) []string {
	tags := []string{
		"site:render",
		"site:locale:" + strings.TrimSpace(firstNonEmpty(resolutionLocale(resolution), state.Locale, siteCfg.DefaultLocale)),
	}
	if channel := strings.TrimSpace(state.ContentChannel); channel != "" {
		tags = append(tags, "site:channel:"+channel)
	}
	if theme := strings.TrimSpace(state.ThemeName); theme != "" {
		tags = append(tags, "site:theme:"+theme)
	}
	if theme, variant := strings.TrimSpace(state.ThemeName), strings.TrimSpace(state.ThemeVariant); theme != "" && variant != "" {
		tags = append(tags, "site:theme:"+theme+":"+variant)
	}
	if resolution != nil {
		tags = append(tags, renderCacheTagsForDeliveryResolution(resolution)...)
	}
	if strings.TrimSpace(decision.Key) != "" {
		tags = append(tags, "site:key")
	}
	return primitives.NormalizeUniqueStringSliceEmpty(tags)
}

func renderCacheTagsForDeliveryResolution(resolution *deliveryResolution) []string {
	if resolution == nil {
		return nil
	}
	tags := make([]string, 0, 4)
	if typeSlug := strings.TrimSpace(resolution.Capability.TypeSlug); typeSlug != "" {
		tags = append(tags, "site:content-type:"+typeSlug)
	}
	if resolution.Record == nil {
		return tags
	}
	if id := strings.TrimSpace(resolution.Record.ID); id != "" {
		tags = append(tags, "site:content:"+id)
	}
	for _, location := range resolution.Record.EffectiveMenuLocations {
		location = strings.TrimSpace(location)
		if location != "" {
			tags = append(tags, "site:menu-location:"+location)
		}
	}
	return tags
}

func resolutionLocale(resolution *deliveryResolution) string {
	if resolution == nil {
		return ""
	}
	return firstNonEmpty(resolution.ResolvedLocale, resolution.RequestedLocale)
}
