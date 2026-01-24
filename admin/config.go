package admin

import (
	"context"

	urlkit "github.com/goliatone/go-urlkit"
)

// Config holds core admin settings and feature flags.
type Config struct {
	Title            string
	BasePath         string
	URLs             URLConfig
	DefaultLocale    string
	Theme            string
	ThemeVariant     string
	ThemeTokens      map[string]string
	ThemeAssetPrefix string
	PreviewSecret    string
	CMSConfig        any
	CMS              CMSOptions
	Debug            DebugConfig

	LogoURL    string
	FaviconURL string
	CustomCSS  string
	CustomJS   string

	SettingsPermission                string
	SettingsUpdatePermission          string
	FeatureFlagsViewPermission        string
	FeatureFlagsUpdatePermission      string
	SettingsThemeTokens               map[string]string
	NotificationsPermission           string
	NotificationsUpdatePermission     string
	ActivityPermission                string
	ActivityActionLabels              map[string]string
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
	UsersImportPermission             string
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

	FeatureFlagKeys    []string
	FeatureCatalogPath string
	EnablePublicAPI    bool
}

// URLConfig controls admin URL generation defaults.
type URLConfig struct {
	APIPrefix  string
	APIVersion string
	URLKit     *urlkit.Config
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
