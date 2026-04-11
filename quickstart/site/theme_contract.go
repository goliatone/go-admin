package site

import (
	"maps"
	"sort"
	"strings"
)

const (
	siteThemeTemplateKeyBase          = "site.layout.base"
	siteThemeTemplateKeyHeader        = "site.layout.header"
	siteThemeTemplateKeyFooter        = "site.layout.footer"
	siteThemeTemplateKeyMainNav       = "site.nav.main"
	siteThemeTemplateKeyFooterNav     = "site.nav.footer"
	siteThemeTemplateKeyHomePage      = "site.home.page"
	siteThemeTemplateKeySearchPage    = "site.search.page"
	siteThemeTemplateKeyContentList   = "site.content.list"
	siteThemeTemplateKeyContentDetail = "site.content.detail"
)

func buildSiteThemeContract(themePayload map[string]map[string]string, assetBasePath string) map[string]any {
	if len(themePayload) == 0 {
		return nil
	}

	selection := cloneThemePayloadSection(themePayload, "selection")
	tokens := cloneThemePayloadSection(themePayload, "tokens")
	cssVars := cloneThemePayloadSection(themePayload, "css_vars")
	assets := cloneThemePayloadSection(themePayload, "assets")
	rawPartials := cloneThemePayloadSection(themePayload, "partials")

	assetPrefix := ""
	if len(assets) > 0 {
		assetPrefix = strings.TrimSpace(assets["prefix"])
	}

	out := map[string]any{
		"name":           strings.TrimSpace(selection["name"]),
		"variant":        strings.TrimSpace(selection["variant"]),
		"selection":      selection,
		"tokens":         tokens,
		"css_vars":       cssVars,
		"css_vars_style": buildSiteThemeCSSVarsStyle(cssVars),
		"shell_vars":     buildSiteThemeShellVars(tokens, cssVars),
		"assets":         assets,
		"asset_prefix":   assetPrefix,
		"asset_urls":     buildSiteThemeAssetURLs(assets, assetPrefix, assetBasePath),
		"bundle_urls":    buildSiteThemeBundleURLs(assets, assetPrefix, assetBasePath),
		"partials":       buildSiteThemePartialAliases(rawPartials),
	}
	if len(rawPartials) > 0 {
		out["manifest_partials"] = rawPartials
	}
	return out
}

func cloneThemePayloadSection(payload map[string]map[string]string, key string) map[string]string {
	if len(payload) == 0 {
		return nil
	}
	values := payload[key]
	if len(values) == 0 {
		return nil
	}
	out := make(map[string]string, len(values))
	maps.Copy(out, values)
	return out
}

func buildSiteThemeCSSVarsStyle(cssVars map[string]string) string {
	if len(cssVars) == 0 {
		return ""
	}
	keys := make([]string, 0, len(cssVars))
	for key := range cssVars {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	lines := make([]string, 0, len(keys))
	for _, key := range keys {
		value := strings.TrimSpace(cssVars[key])
		if value == "" {
			continue
		}
		lines = append(lines, "      "+key+": "+value+";")
	}
	return strings.Join(lines, "\n")
}

func buildSiteThemeShellVars(tokens, cssVars map[string]string) map[string]string {
	out := map[string]string{}

	if value := resolveSiteThemeTokenValue(tokens, cssVars,
		"--site-color-primary",
		"site-color-primary",
		"--primary",
		"primary",
		"--color-brand-solid",
		"color-brand-solid",
		"--color-border-brand",
		"color-border-brand",
		"--color-text-brand-secondary",
		"color-text-brand-secondary",
	); value != "" {
		out["site_color_primary"] = value
	}

	if value := resolveSiteThemeTokenValue(tokens, cssVars,
		"--site-color-accent",
		"site-color-accent",
		"--accent",
		"accent",
		"--color-text-brand-secondary",
		"color-text-brand-secondary",
		"--color-border-brand",
		"color-border-brand",
		"--color-utility-amber-text",
		"color-utility-amber-text",
		"--color-brand-solid",
		"color-brand-solid",
	); value != "" {
		out["site_color_accent"] = value
	}

	if value := resolveSiteThemeTokenValue(tokens, cssVars,
		"--site-color-surface",
		"site-color-surface",
		"--surface",
		"surface",
		"--color-bg-primary",
		"color-bg-primary",
		"--color-surface-primary",
		"color-surface-primary",
		"--color-bg-secondary",
		"color-bg-secondary",
	); value != "" {
		out["site_color_surface"] = value
	}

	if len(out) == 0 {
		return nil
	}
	return out
}

func resolveSiteThemeTokenValue(tokens, cssVars map[string]string, keys ...string) string {
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if strings.HasPrefix(key, "--") {
			if value := strings.TrimSpace(cssVars[key]); value != "" {
				return value
			}
			key = strings.TrimPrefix(key, "--")
		}
		if value := strings.TrimSpace(tokens[key]); value != "" {
			return value
		}
		if value := strings.TrimSpace(cssVars["--"+key]); value != "" {
			return value
		}
	}
	return ""
}

func buildSiteThemeAssetURLs(assets map[string]string, assetPrefix, assetBasePath string) map[string]string {
	if len(assets) == 0 {
		return nil
	}
	out := map[string]string{}
	for key, value := range assets {
		key = strings.TrimSpace(key)
		if key == "" || key == "prefix" {
			continue
		}
		resolved := resolveSiteThemeAssetURL(value, assetPrefix, assetBasePath)
		if resolved == "" {
			continue
		}
		out[sanitizeSiteThemeKey(key)] = resolved
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func buildSiteThemeBundleURLs(assets map[string]string, assetPrefix, assetBasePath string) map[string]string {
	if len(assets) == 0 {
		return nil
	}
	keys := []string{"tokens.css", "site.css", "site.js"}
	out := map[string]string{}
	for _, key := range keys {
		resolved := resolveSiteThemeAssetURL(assets[key], assetPrefix, assetBasePath)
		if resolved == "" {
			continue
		}
		out[sanitizeSiteThemeKey(key)] = resolved
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func buildSiteThemePartialAliases(raw map[string]string) map[string]string {
	if len(raw) == 0 {
		return nil
	}
	out := map[string]string{}
	for alias, rawKey := range siteThemeTemplateAliases() {
		value := normalizeSiteThemeTemplatePath(raw[rawKey])
		if value != "" {
			out[alias] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func resolveSiteThemeAssetURL(assetPath, assetPrefix, assetBasePath string) string {
	assetPath = strings.TrimSpace(assetPath)
	if assetPath == "" {
		return ""
	}
	if strings.HasPrefix(assetPath, "http://") || strings.HasPrefix(assetPath, "https://") || strings.HasPrefix(assetPath, "/") {
		return assetPath
	}
	assetPrefix = strings.TrimSpace(assetPrefix)
	if assetPrefix != "" {
		return strings.TrimRight(assetPrefix, "/") + "/" + strings.TrimLeft(assetPath, "/")
	}
	assetBasePath = strings.TrimSpace(assetBasePath)
	if assetBasePath != "" {
		return strings.TrimRight(assetBasePath, "/") + "/" + strings.TrimLeft(assetPath, "/")
	}
	return assetPath
}

func sanitizeSiteThemeKey(key string) string {
	key = strings.TrimSpace(key)
	if key == "" {
		return ""
	}
	replacer := strings.NewReplacer(".", "_", "-", "_")
	return replacer.Replace(key)
}

func normalizeSiteThemeTemplatePath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	path = strings.TrimPrefix(path, "./")
	path = strings.TrimPrefix(path, "templates/")
	return strings.TrimPrefix(path, "/")
}

func siteThemeTemplateAliases() map[string]string {
	return map[string]string{
		"base":           siteThemeTemplateKeyBase,
		"header":         siteThemeTemplateKeyHeader,
		"footer":         siteThemeTemplateKeyFooter,
		"main_nav":       siteThemeTemplateKeyMainNav,
		"footer_nav":     siteThemeTemplateKeyFooterNav,
		"home_page":      siteThemeTemplateKeyHomePage,
		"search_page":    siteThemeTemplateKeySearchPage,
		"content_list":   siteThemeTemplateKeyContentList,
		"content_detail": siteThemeTemplateKeyContentDetail,
	}
}

func siteThemeTemplateAlias(key string) string {
	for alias, templateKey := range siteThemeTemplateAliases() {
		if strings.EqualFold(strings.TrimSpace(templateKey), strings.TrimSpace(key)) {
			return alias
		}
	}
	return ""
}

func buildSiteThemeBaselineContract(baselineVariant *string, selectedVariant string) map[string]any {
	if baselineVariant == nil {
		return nil
	}
	baseline := strings.TrimSpace(*baselineVariant)
	selected := strings.TrimSpace(selectedVariant)
	matches := selected == baseline

	out := map[string]any{
		"baseline_variant": baseline,
		"selected_variant": selected,
		"matches_baseline": matches,
	}
	if warning := siteThemeBaselineWarning(selected, baseline); warning != "" {
		out["warning"] = warning
	}
	return out
}

func siteThemeBaselineWarning(selectedVariant, baselineVariant string) string {
	selectedVariant = strings.TrimSpace(selectedVariant)
	baselineVariant = strings.TrimSpace(baselineVariant)
	if selectedVariant == baselineVariant {
		return ""
	}
	selectedLabel := "base"
	if selectedVariant != "" {
		selectedLabel = selectedVariant
	}
	baselineLabel := "base"
	if baselineVariant != "" {
		baselineLabel = baselineVariant
	}
	return "selected public-site variant does not match the configured baseline: selected=" + selectedLabel + " baseline=" + baselineLabel
}

func cloneSiteThemeContract(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		switch typed := value.(type) {
		case map[string]string:
			dup := make(map[string]string, len(typed))
			maps.Copy(dup, typed)
			out[key] = dup
		case map[string]any:
			dup := make(map[string]any, len(typed))
			maps.Copy(dup, typed)
			out[key] = dup
		case []string:
			out[key] = cloneStrings(typed)
		default:
			out[key] = value
		}
	}
	return out
}
