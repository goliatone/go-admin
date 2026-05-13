package site

import "strings"

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
	if theme := strings.TrimSpace(state.ThemeName); theme != "" {
		if variant := strings.TrimSpace(state.ThemeVariant); variant != "" {
			tags = append(tags, "site:theme:"+theme+":"+variant)
		}
	}
	if resolution != nil {
		if typeSlug := strings.TrimSpace(resolution.Capability.TypeSlug); typeSlug != "" {
			tags = append(tags, "site:content-type:"+typeSlug)
		}
		if resolution.Record != nil {
			if id := strings.TrimSpace(resolution.Record.ID); id != "" {
				tags = append(tags, "site:content:"+id)
			}
			for _, location := range resolution.Record.EffectiveMenuLocations {
				location = strings.TrimSpace(location)
				if location != "" {
					tags = append(tags, "site:menu-location:"+location)
				}
			}
		}
	}
	if strings.TrimSpace(decision.Key) != "" {
		tags = append(tags, "site:key")
	}
	return normalizeStringList(tags)
}

func resolutionLocale(resolution *deliveryResolution) string {
	if resolution == nil {
		return ""
	}
	return firstNonEmpty(resolution.ResolvedLocale, resolution.RequestedLocale)
}
