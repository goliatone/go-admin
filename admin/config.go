package admin

import "context"

// Config holds core admin settings and feature flags.
type Config struct {
	Title            string
	BasePath         string
	DefaultLocale    string
	Theme            string
	ThemeVariant     string
	ThemeTokens      map[string]string
	ThemeAssetPrefix string
	CMSConfig        any
	CMS              CMSOptions
	Features         Features

	LogoURL    string
	FaviconURL string
	CustomCSS  string
	CustomJS   string

	SettingsPermission                string
	SettingsUpdatePermission          string
	SettingsThemeTokens               map[string]string
	NotificationsPermission           string
	NotificationsUpdatePermission     string
	JobsPermission                    string
	JobsTriggerPermission             string
	PreferencesPermission             string
	PreferencesUpdatePermission       string
	PreferencesManageTenantPermission string
	PreferencesManageOrgPermission    string
	PreferencesManageSystemPermission string
	ProfilePermission                 string
	ProfileUpdatePermission           string
	UsersPermission                   string
	UsersCreatePermission             string
	UsersUpdatePermission             string
	UsersDeletePermission             string
	RolesPermission                   string
	RolesCreatePermission             string
	RolesUpdatePermission             string
	RolesDeletePermission             string
	TenantsPermission                 string
	TenantsCreatePermission           string
	TenantsUpdatePermission           string
	TenantsDeletePermission           string
	OrganizationsPermission           string
	OrganizationsCreatePermission     string
	OrganizationsUpdatePermission     string
	OrganizationsDeletePermission     string

	AuthConfig *AuthConfig

	NavMenuCode string

	FeatureFlags map[string]bool
}

// CMSOptions configures how the CMS container is resolved (in-memory, go-cms, or host-provided).
type CMSOptions struct {
	Container        CMSContainer
	ContainerBuilder CMSContainerBuilder
	GoCMSConfig      any
}

// CMSContainerBuilder constructs a CMSContainer from admin configuration.
type CMSContainerBuilder func(ctx context.Context, cfg Config) (CMSContainer, error)

// AuthConfig captures login/logout endpoints and redirect defaults.
type AuthConfig struct {
	LoginPath    string
	LogoutPath   string
	RedirectPath string
}

func (cfg *Config) normalizeFeatures() {
	if cfg == nil {
		return
	}
	if cfg.CMS.GoCMSConfig == nil && cfg.CMSConfig != nil {
		cfg.CMS.GoCMSConfig = cfg.CMSConfig
	}
	merged := cfg.Features.applyLegacy(*cfg)
	cfg.Features = merged

	if cfg.FeatureFlags == nil {
		cfg.FeatureFlags = map[string]bool{}
	}
	cfg.FeatureFlags = merged.mergedFlags(cfg.FeatureFlags)
}
