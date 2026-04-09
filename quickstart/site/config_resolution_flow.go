package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

type resolvedSiteConfigInputs struct {
	BasePath            string
	DefaultLocale       string
	SupportedLocales    []string
	AllowLocaleFallback bool
	LocalePrefixMode    LocalePrefixMode
	Environment         string
	ContentChannel      string
}

type resolvedSiteLocaleDefaults struct {
	DefaultLocale       string
	SupportedLocales    []string
	AllowLocaleFallback bool
	LocalePrefixMode    LocalePrefixMode
}

type resolvedSiteRuntimeDefaults struct {
	BasePath       string
	Environment    string
	ContentChannel string
}

func resolveSiteConfigFlow(cfg admin.Config, input SiteConfig) ResolvedSiteConfig {
	localeDefaults := resolveSiteLocaleDefaults(cfg, input)
	runtimeDefaults := resolveSiteRuntimeDefaults(cfg, input)
	inputs := resolvedSiteConfigInputs{
		BasePath:            runtimeDefaults.BasePath,
		DefaultLocale:       localeDefaults.DefaultLocale,
		SupportedLocales:    localeDefaults.SupportedLocales,
		AllowLocaleFallback: localeDefaults.AllowLocaleFallback,
		LocalePrefixMode:    localeDefaults.LocalePrefixMode,
		Environment:         runtimeDefaults.Environment,
		ContentChannel:      runtimeDefaults.ContentChannel,
	}

	return ResolvedSiteConfig{
		BasePath:            inputs.BasePath,
		DefaultLocale:       inputs.DefaultLocale,
		SupportedLocales:    inputs.SupportedLocales,
		AllowLocaleFallback: inputs.AllowLocaleFallback,
		LocalePrefixMode:    inputs.LocalePrefixMode,
		Environment:         inputs.Environment,
		ContentChannel:      inputs.ContentChannel,
		Navigation:          resolveSiteNavigationConfig(input.Navigation),
		Views:               resolveSiteViewConfig(input.Views),
		Search:              resolveSiteSearchConfig(input.Search),
		Modules:             compactModules(input.Modules),
		Features:            resolveSiteFeatures(input.Features),
		Theme:               resolveSiteThemeConfig(input.Theme),
		Fallback:            ResolveSiteFallbackPolicy(input.Fallback),
	}
}

func resolveSiteLocaleDefaults(cfg admin.Config, input SiteConfig) resolvedSiteLocaleDefaults {
	defaultLocale := strings.TrimSpace(input.DefaultLocale)
	if defaultLocale == "" {
		defaultLocale = strings.TrimSpace(cfg.DefaultLocale)
	}
	if defaultLocale == "" {
		defaultLocale = "en"
	}

	supportedLocales := uniqueLocalesPreserveOrder(input.SupportedLocales, defaultLocale)
	if len(supportedLocales) == 0 {
		supportedLocales = []string{defaultLocale}
	}

	return resolvedSiteLocaleDefaults{
		DefaultLocale:       defaultLocale,
		SupportedLocales:    supportedLocales,
		AllowLocaleFallback: boolValue(input.AllowLocaleFallback, true),
		LocalePrefixMode:    normalizeLocalePrefixMode(input.LocalePrefixMode),
	}
}

func resolveSiteRuntimeDefaults(cfg admin.Config, input SiteConfig) resolvedSiteRuntimeDefaults {
	basePath := normalizePath(input.BasePath)
	if basePath == "" {
		basePath = "/"
	}

	environment := normalizeRuntimeEnvironment(input.Environment)
	if environment == "" {
		if cfg.Debug.Enabled {
			environment = "dev"
		} else {
			environment = "prod"
		}
	}

	contentChannel := ""
	if strings.TrimSpace(input.ContentChannel) != "" {
		contentChannel = normalizeContentChannel(input.ContentChannel)
	}
	if contentChannel == "" {
		contentChannel = "default"
	}

	return resolvedSiteRuntimeDefaults{
		BasePath:       basePath,
		Environment:    environment,
		ContentChannel: contentChannel,
	}
}

func resolveSiteNavigationConfig(input SiteNavigationConfig) SiteNavigationConfig {
	return SiteNavigationConfig{
		MainMenuLocation:         firstNonEmpty(input.MainMenuLocation, DefaultMainMenuLocation),
		FooterMenuLocation:       firstNonEmpty(input.FooterMenuLocation, DefaultFooterMenuLocation),
		FallbackMenuCode:         firstNonEmpty(input.FallbackMenuCode, DefaultFallbackMenuCode),
		EnableGeneratedFallback:  input.EnableGeneratedFallback,
		ContributionLocalePolicy: normalizeContributionLocalePolicy(input.ContributionLocalePolicy),
	}
}

func resolveSiteViewConfig(input SiteViewConfig) ResolvedSiteViewConfig {
	return ResolvedSiteViewConfig{
		TemplateFS:    compactFS(input.TemplateFS),
		BaseTemplate:  firstNonEmpty(input.BaseTemplate, DefaultBaseTemplate),
		ErrorTemplate: firstNonEmpty(input.ErrorTemplate, DefaultErrorTemplate),
		ErrorTemplatesByStatus: mergeStatusTemplateMaps(
			map[int]string{404: "site/error/404"},
			cloneStatusTemplateMap(input.ErrorTemplatesByStatus),
		),
		ErrorTemplatesByCode: mergeCodeTemplateMaps(
			map[string]string{siteErrorCodeTranslationMissing: "site/error/missing_translation"},
			cloneCodeTemplateMap(input.ErrorTemplatesByCode),
		),
		AssetBasePath:       normalizeAssetPath(input.AssetBasePath),
		Reload:              boolValue(input.Reload, false),
		ReloadInDevelopment: boolValue(input.ReloadInDevelopment, true),
	}
}

func resolveSiteSearchConfig(input SiteSearchConfig) SiteSearchConfig {
	indexes := normalizedSearchIndexes(input)
	return SiteSearchConfig{
		Route:       normalizePathOrDefault(input.Route, DefaultSearchRoute),
		Endpoint:    normalizePathOrDefault(input.Endpoint, DefaultSearchEndpoint),
		Indexes:     indexes,
		Collections: cloneStrings(indexes),
	}
}

func resolveSiteFeatures(input SiteFeatures) ResolvedSiteFeatures {
	return ResolvedSiteFeatures{
		EnablePreview:           boolValue(input.EnablePreview, true),
		EnableI18N:              boolValue(input.EnableI18N, true),
		EnableSearch:            boolValue(input.EnableSearch, true),
		EnableTheme:             boolValue(input.EnableTheme, true),
		EnableMenuDraftPreview:  boolValue(input.EnableMenuDraftPreview, true),
		EnableCanonicalRedirect: boolValue(input.EnableCanonicalRedirect, true),
		CanonicalRedirectMode:   normalizeCanonicalRedirectMode(input.CanonicalRedirectMode),
		StrictLocalizedPaths:    boolValue(input.StrictLocalizedPaths, false),
	}
}

func resolveSiteThemeConfig(input SiteThemeConfig) ResolvedSiteThemeConfig {
	return ResolvedSiteThemeConfig{
		Name:                        strings.TrimSpace(input.Name),
		Variant:                     strings.TrimSpace(input.Variant),
		AllowRequestNameOverride:    boolValue(input.AllowRequestNameOverride, true),
		AllowRequestVariantOverride: boolValue(input.AllowRequestVariantOverride, true),
	}
}
