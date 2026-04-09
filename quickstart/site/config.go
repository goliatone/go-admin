package site

import (
	"io/fs"

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
	BasePath            string           `json:"base_path"`
	DefaultLocale       string           `json:"default_locale"`
	SupportedLocales    []string         `json:"supported_locales"`
	AllowLocaleFallback *bool            `json:"allow_locale_fallback"`
	LocalePrefixMode    LocalePrefixMode `json:"locale_prefix_mode"`
	Environment         string           `json:"environment"`
	ContentChannel      string           `json:"content_channel"`

	Navigation SiteNavigationConfig `json:"navigation"`
	Views      SiteViewConfig       `json:"views"`
	Search     SiteSearchConfig     `json:"search"`
	Modules    []SiteModule         `json:"modules"`
	Features   SiteFeatures         `json:"features"`
	Theme      SiteThemeConfig      `json:"theme"`
	Fallback   SiteFallbackPolicy   `json:"fallback"`
}

// SiteNavigationConfig defines site menu defaults.
type SiteNavigationConfig struct {
	MainMenuLocation         string `json:"main_menu_location"`
	FooterMenuLocation       string `json:"footer_menu_location"`
	FallbackMenuCode         string `json:"fallback_menu_code"`
	EnableGeneratedFallback  bool   `json:"enable_generated_fallback"`
	ContributionLocalePolicy string `json:"contribution_locale_policy"`
}

const (
	ContributionLocalePolicyFallback = "fallback"
	ContributionLocalePolicyStrict   = "strict"
)

// SiteViewConfig controls template contract defaults.
type SiteViewConfig struct {
	// TemplateFS contains overlay/override template filesystems. The host application's
	// base template filesystem is still passed separately to quickstart.NewViewEngine.
	TemplateFS []fs.FS `json:"template_fs"`

	BaseTemplate  string `json:"base_template"`
	ErrorTemplate string `json:"error_template"`

	ErrorTemplatesByStatus map[int]string    `json:"error_templates_by_status"`
	ErrorTemplatesByCode   map[string]string `json:"error_templates_by_code"`

	AssetBasePath string `json:"asset_base_path"`

	Reload              *bool `json:"reload"`
	ReloadInDevelopment *bool `json:"reload_in_development"`
}

// SiteSearchConfig controls optional site search routes.
type SiteSearchConfig struct {
	Route       string   `json:"route"`
	Endpoint    string   `json:"endpoint"`
	Indexes     []string `json:"indexes,omitempty"`
	Collections []string `json:"collections"`
}

// SiteFeatures controls runtime feature gates.
type SiteFeatures struct {
	EnablePreview           *bool                 `json:"enable_preview"`
	EnableI18N              *bool                 `json:"enable_i18_n"`
	EnableSearch            *bool                 `json:"enable_search"`
	EnableTheme             *bool                 `json:"enable_theme"`
	EnableMenuDraftPreview  *bool                 `json:"enable_menu_draft_preview"`
	EnableCanonicalRedirect *bool                 `json:"enable_canonical_redirect"`
	CanonicalRedirectMode   CanonicalRedirectMode `json:"canonical_redirect_mode"`
	StrictLocalizedPaths    *bool                 `json:"strict_localized_paths"`
}

// SiteThemeConfig controls site-level theme defaults.
type SiteThemeConfig struct {
	Name                        string `json:"name"`
	Variant                     string `json:"variant"`
	AllowRequestNameOverride    *bool  `json:"allow_request_name_override"`
	AllowRequestVariantOverride *bool  `json:"allow_request_variant_override"`
}

// ResolvedSiteThemeConfig contains normalized site theme defaults and request
// override policy.
type ResolvedSiteThemeConfig struct {
	Name                        string `json:"name"`
	Variant                     string `json:"variant"`
	AllowRequestNameOverride    bool   `json:"allow_request_name_override"`
	AllowRequestVariantOverride bool   `json:"allow_request_variant_override"`
}

// ResolvedSiteConfig is a normalized SiteConfig with concrete defaults.
type ResolvedSiteConfig struct {
	BasePath            string           `json:"base_path"`
	DefaultLocale       string           `json:"default_locale"`
	SupportedLocales    []string         `json:"supported_locales"`
	AllowLocaleFallback bool             `json:"allow_locale_fallback"`
	LocalePrefixMode    LocalePrefixMode `json:"locale_prefix_mode"`
	Environment         string           `json:"environment"`
	ContentChannel      string           `json:"content_channel"`

	Navigation SiteNavigationConfig    `json:"navigation"`
	Views      ResolvedSiteViewConfig  `json:"views"`
	Search     SiteSearchConfig        `json:"search"`
	Modules    []SiteModule            `json:"modules"`
	Features   ResolvedSiteFeatures    `json:"features"`
	Theme      ResolvedSiteThemeConfig `json:"theme"`
	Fallback   SiteFallbackPolicy      `json:"fallback"`
}

// ResolvedSiteViewConfig contains normalized view/runtime defaults.
type ResolvedSiteViewConfig struct {
	// TemplateFS contains overlay/override template filesystems with higher
	// precedence than the base host template filesystem when building a view engine.
	TemplateFS []fs.FS `json:"template_fs"`

	BaseTemplate  string `json:"base_template"`
	ErrorTemplate string `json:"error_template"`

	ErrorTemplatesByStatus map[int]string    `json:"error_templates_by_status"`
	ErrorTemplatesByCode   map[string]string `json:"error_templates_by_code"`

	AssetBasePath string `json:"asset_base_path"`

	Reload              bool `json:"reload"`
	ReloadInDevelopment bool `json:"reload_in_development"`
}

// ResolvedSiteFeatures contains concrete runtime feature flags.
type ResolvedSiteFeatures struct {
	EnablePreview           bool                  `json:"enable_preview"`
	EnableI18N              bool                  `json:"enable_i18_n"`
	EnableSearch            bool                  `json:"enable_search"`
	EnableTheme             bool                  `json:"enable_theme"`
	EnableMenuDraftPreview  bool                  `json:"enable_menu_draft_preview"`
	EnableCanonicalRedirect bool                  `json:"enable_canonical_redirect"`
	CanonicalRedirectMode   CanonicalRedirectMode `json:"canonical_redirect_mode"`
	StrictLocalizedPaths    bool                  `json:"strict_localized_paths"`
}

// ResolveSiteConfig normalizes runtime defaults for site registration.
func ResolveSiteConfig(cfg admin.Config, input SiteConfig) ResolvedSiteConfig {
	return resolveSiteConfigFlow(cfg, input)
}
