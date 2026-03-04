package site

import (
	"io/fs"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

const (
	DefaultMainMenuLocation     = "site.main"
	DefaultFooterMenuLocation   = "site.footer"
	DefaultFallbackMenuCode     = "site_main"
	DefaultBaseTemplate         = "site/base"
	DefaultErrorTemplate        = "site/error"
	DefaultSearchRoute          = "/search"
	DefaultSearchEndpoint       = "/api/v1/site/search"
	DefaultSearchSuggestRoute   = "/api/v1/site/search/suggest"
	defaultLocaleCookieName     = "site_locale"
	defaultContentChannelCookie = "site_channel"
)

// LocalePrefixMode controls locale path prefix behavior.
type LocalePrefixMode string

const (
	LocalePrefixNonDefault LocalePrefixMode = "non_default"
	LocalePrefixAlways     LocalePrefixMode = "always"
)

// CanonicalRedirectMode controls which locale is used when computing canonical redirects.
type CanonicalRedirectMode string

const (
	// CanonicalRedirectResolvedLocale keeps existing behavior:
	// canonical URL locale follows the resolved record locale.
	CanonicalRedirectResolvedLocale CanonicalRedirectMode = "resolved_locale_canonical"
	// CanonicalRedirectRequestedLocaleSticky preserves the requested locale prefix
	// when fallback content is served.
	CanonicalRedirectRequestedLocaleSticky CanonicalRedirectMode = "requested_locale_sticky"
)

// SiteConfig controls quickstart/site registration behavior.
type SiteConfig struct {
	BasePath            string
	DefaultLocale       string
	SupportedLocales    []string
	AllowLocaleFallback *bool
	LocalePrefixMode    LocalePrefixMode
	Environment         string
	ContentChannel      string

	Navigation SiteNavigationConfig
	Views      SiteViewConfig
	Search     SiteSearchConfig
	Modules    []SiteModule
	Features   SiteFeatures
	Theme      SiteThemeConfig
}

// SiteNavigationConfig defines site menu defaults.
type SiteNavigationConfig struct {
	MainMenuLocation         string
	FooterMenuLocation       string
	FallbackMenuCode         string
	EnableGeneratedFallback  bool
	ContributionLocalePolicy string
}

const (
	ContributionLocalePolicyFallback = "fallback"
	ContributionLocalePolicyStrict   = "strict"
)

// SiteViewConfig controls template contract defaults.
type SiteViewConfig struct {
	TemplateFS []fs.FS

	BaseTemplate  string
	ErrorTemplate string

	ErrorTemplatesByStatus map[int]string
	ErrorTemplatesByCode   map[string]string

	AssetBasePath string

	Reload              *bool
	ReloadInDevelopment *bool
}

// SiteSearchConfig controls optional site search routes.
type SiteSearchConfig struct {
	Route       string
	Endpoint    string
	Collections []string
}

// SiteFeatures controls runtime feature gates.
type SiteFeatures struct {
	EnablePreview           *bool
	EnableI18N              *bool
	EnableSearch            *bool
	EnableTheme             *bool
	EnableMenuDraftPreview  *bool
	EnableCanonicalRedirect *bool
	CanonicalRedirectMode   CanonicalRedirectMode
	StrictLocalizedPaths    *bool
}

// SiteThemeConfig controls site-level theme defaults.
type SiteThemeConfig struct {
	Name    string
	Variant string
}

// ResolvedSiteConfig is a normalized SiteConfig with concrete defaults.
type ResolvedSiteConfig struct {
	BasePath            string
	DefaultLocale       string
	SupportedLocales    []string
	AllowLocaleFallback bool
	LocalePrefixMode    LocalePrefixMode
	Environment         string
	ContentChannel      string

	Navigation SiteNavigationConfig
	Views      ResolvedSiteViewConfig
	Search     SiteSearchConfig
	Modules    []SiteModule
	Features   ResolvedSiteFeatures
	Theme      SiteThemeConfig
}

// ResolvedSiteViewConfig contains normalized view/runtime defaults.
type ResolvedSiteViewConfig struct {
	TemplateFS []fs.FS

	BaseTemplate  string
	ErrorTemplate string

	ErrorTemplatesByStatus map[int]string
	ErrorTemplatesByCode   map[string]string

	AssetBasePath string

	Reload              bool
	ReloadInDevelopment bool
}

// ResolvedSiteFeatures contains concrete runtime feature flags.
type ResolvedSiteFeatures struct {
	EnablePreview           bool
	EnableI18N              bool
	EnableSearch            bool
	EnableTheme             bool
	EnableMenuDraftPreview  bool
	EnableCanonicalRedirect bool
	CanonicalRedirectMode   CanonicalRedirectMode
	StrictLocalizedPaths    bool
}

// ResolveSiteConfig normalizes runtime defaults for site registration.
func ResolveSiteConfig(cfg admin.Config, input SiteConfig) ResolvedSiteConfig {
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

	allowLocaleFallback := boolValue(input.AllowLocaleFallback, true)
	localePrefixMode := normalizeLocalePrefixMode(input.LocalePrefixMode)

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

	navCfg := SiteNavigationConfig{
		MainMenuLocation:         firstNonEmpty(input.Navigation.MainMenuLocation, DefaultMainMenuLocation),
		FooterMenuLocation:       firstNonEmpty(input.Navigation.FooterMenuLocation, DefaultFooterMenuLocation),
		FallbackMenuCode:         firstNonEmpty(input.Navigation.FallbackMenuCode, DefaultFallbackMenuCode),
		EnableGeneratedFallback:  input.Navigation.EnableGeneratedFallback,
		ContributionLocalePolicy: normalizeContributionLocalePolicy(input.Navigation.ContributionLocalePolicy),
	}

	views := ResolvedSiteViewConfig{
		TemplateFS:    compactFS(input.Views.TemplateFS),
		BaseTemplate:  firstNonEmpty(input.Views.BaseTemplate, DefaultBaseTemplate),
		ErrorTemplate: firstNonEmpty(input.Views.ErrorTemplate, DefaultErrorTemplate),
		ErrorTemplatesByStatus: mergeStatusTemplateMaps(
			map[int]string{404: "site/error/404"},
			cloneStatusTemplateMap(input.Views.ErrorTemplatesByStatus),
		),
		ErrorTemplatesByCode: mergeCodeTemplateMaps(
			map[string]string{siteErrorCodeTranslationMissing: "site/error/missing_translation"},
			cloneCodeTemplateMap(input.Views.ErrorTemplatesByCode),
		),
		AssetBasePath:       normalizeAssetPath(input.Views.AssetBasePath),
		Reload:              boolValue(input.Views.Reload, false),
		ReloadInDevelopment: boolValue(input.Views.ReloadInDevelopment, true),
	}

	search := SiteSearchConfig{
		Route:       normalizePathOrDefault(input.Search.Route, DefaultSearchRoute),
		Endpoint:    normalizePathOrDefault(input.Search.Endpoint, DefaultSearchEndpoint),
		Collections: cloneStrings(input.Search.Collections),
	}

	features := ResolvedSiteFeatures{
		EnablePreview:           boolValue(input.Features.EnablePreview, true),
		EnableI18N:              boolValue(input.Features.EnableI18N, true),
		EnableSearch:            boolValue(input.Features.EnableSearch, true),
		EnableTheme:             boolValue(input.Features.EnableTheme, true),
		EnableMenuDraftPreview:  boolValue(input.Features.EnableMenuDraftPreview, true),
		EnableCanonicalRedirect: boolValue(input.Features.EnableCanonicalRedirect, true),
		CanonicalRedirectMode:   normalizeCanonicalRedirectMode(input.Features.CanonicalRedirectMode),
		StrictLocalizedPaths:    boolValue(input.Features.StrictLocalizedPaths, false),
	}

	theme := SiteThemeConfig{
		Name:    strings.TrimSpace(input.Theme.Name),
		Variant: strings.TrimSpace(input.Theme.Variant),
	}

	return ResolvedSiteConfig{
		BasePath:            basePath,
		DefaultLocale:       defaultLocale,
		SupportedLocales:    supportedLocales,
		AllowLocaleFallback: allowLocaleFallback,
		LocalePrefixMode:    localePrefixMode,
		Environment:         environment,
		ContentChannel:      contentChannel,
		Navigation:          navCfg,
		Views:               views,
		Search:              search,
		Modules:             compactModules(input.Modules),
		Features:            features,
		Theme:               theme,
	}
}

func compactFS(items []fs.FS) []fs.FS {
	if len(items) == 0 {
		return nil
	}
	out := make([]fs.FS, 0, len(items))
	for _, item := range items {
		if item == nil {
			continue
		}
		out = append(out, item)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func compactModules(items []SiteModule) []SiteModule {
	if len(items) == 0 {
		return nil
	}
	out := make([]SiteModule, 0, len(items))
	for _, item := range items {
		if item == nil {
			continue
		}
		out = append(out, item)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func uniqueLocalesPreserveOrder(locales []string, fallback string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(locales)+1)
	appendLocale := func(value string) {
		value = strings.ToLower(strings.TrimSpace(value))
		if value == "" {
			return
		}
		if _, ok := seen[value]; ok {
			return
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	appendLocale(fallback)
	for _, locale := range locales {
		appendLocale(locale)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeLocalePrefixMode(mode LocalePrefixMode) LocalePrefixMode {
	switch strings.ToLower(strings.TrimSpace(string(mode))) {
	case "", string(LocalePrefixNonDefault):
		return LocalePrefixNonDefault
	case string(LocalePrefixAlways), "always_prefixed":
		return LocalePrefixAlways
	default:
		return LocalePrefixNonDefault
	}
}

func normalizeCanonicalRedirectMode(mode CanonicalRedirectMode) CanonicalRedirectMode {
	switch strings.ToLower(strings.TrimSpace(string(mode))) {
	case "", string(CanonicalRedirectResolvedLocale):
		return CanonicalRedirectResolvedLocale
	case string(CanonicalRedirectRequestedLocaleSticky):
		return CanonicalRedirectRequestedLocaleSticky
	default:
		return CanonicalRedirectResolvedLocale
	}
}

func normalizeContributionLocalePolicy(policy string) string {
	switch strings.ToLower(strings.TrimSpace(policy)) {
	case ContributionLocalePolicyStrict:
		return ContributionLocalePolicyStrict
	default:
		return ContributionLocalePolicyFallback
	}
}

func normalizeRuntimeEnvironment(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "default":
		return ""
	case "dev", "development", "local", "test":
		return "dev"
	case "staging", "stage":
		return "staging"
	case "prod", "production":
		return "prod"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func normalizeContentChannel(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "default":
		return "default"
	case "dev", "development", "local", "test":
		return "dev"
	case "staging", "stage":
		return "staging"
	case "prod", "production":
		return "prod"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func normalizePath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	return admin.NormalizeBasePath(trimmed)
}

func normalizePathOrDefault(path, fallback string) string {
	normalized := normalizePath(path)
	if normalized != "" {
		return normalized
	}
	return normalizePath(fallback)
}

func normalizeAssetPath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") || strings.HasPrefix(trimmed, "//") {
		return strings.TrimSuffix(trimmed, "/")
	}
	return normalizePath(trimmed)
}

func cloneStatusTemplateMap(in map[int]string) map[int]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[int]string, len(in))
	for key, value := range in {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneCodeTemplateMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	for key, value := range in {
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func mergeStatusTemplateMaps(parts ...map[int]string) map[int]string {
	out := map[int]string{}
	for _, part := range parts {
		for key, value := range part {
			value = strings.TrimSpace(value)
			if value == "" {
				continue
			}
			out[key] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func mergeCodeTemplateMaps(parts ...map[string]string) map[string]string {
	out := map[string]string{}
	for _, part := range parts {
		for key, value := range part {
			key = strings.TrimSpace(key)
			value = strings.TrimSpace(value)
			if key == "" || value == "" {
				continue
			}
			out[key] = value
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}

func boolValue(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}
