package admin

import (
	"context"

	"github.com/goliatone/go-admin/admin/routing"
	urlkit "github.com/goliatone/go-urlkit"
)

// Config holds core admin settings and feature flags.
type Config struct {
	Title            string            `json:"title"`
	BasePath         string            `json:"base_path"`
	URLs             URLConfig         `json:"ur_ls"`
	DefaultLocale    string            `json:"default_locale"`
	Theme            string            `json:"theme"`
	ThemeVariant     string            `json:"theme_variant"`
	ThemeTokens      map[string]string `json:"theme_tokens"`
	ThemeAssetPrefix string            `json:"theme_asset_prefix"`
	PreviewSecret    string            `json:"preview_secret"`
	CMSConfig        any               `json:"cms_config"`
	CMS              CMSOptions        `json:"cms"`
	Debug            DebugConfig       `json:"debug"`
	Errors           ErrorConfig       `json:"errors"`

	LogoURL    string `json:"logo_url"`
	FaviconURL string `json:"favicon_url"`
	CustomCSS  string `json:"custom_css"`
	CustomJS   string `json:"custom_js"`

	SettingsPermission            string            `json:"settings_permission"`
	SettingsUpdatePermission      string            `json:"settings_update_permission"`
	FeatureFlagsViewPermission    string            `json:"feature_flags_view_permission"`
	FeatureFlagsUpdatePermission  string            `json:"feature_flags_update_permission"`
	SettingsThemeTokens           map[string]string `json:"settings_theme_tokens"`
	NotificationsPermission       string            `json:"notifications_permission"`
	NotificationsUpdatePermission string            `json:"notifications_update_permission"`
	ActivityPermission            string            `json:"activity_permission"`
	// ActivityTabPermissionFailureMode controls how users detail activity tab handles
	// activity permission failures. Supported values:
	// - "strict": return a 403 error
	// - "inline": render tab-level unavailable state
	// - "": auto mode (strict in dev, inline otherwise)
	ActivityTabPermissionFailureMode     string            `json:"activity_tab_permission_failure_mode"`
	ActivityActionLabels                 map[string]string `json:"activity_action_labels"`
	JobsPermission                       string            `json:"jobs_permission"`
	JobsTriggerPermission                string            `json:"jobs_trigger_permission"`
	PreferencesPermission                string            `json:"preferences_permission"`
	PreferencesUpdatePermission          string            `json:"preferences_update_permission"`
	DashboardPreferencesPermission       string            `json:"dashboard_preferences_permission"`
	DashboardPreferencesUpdatePermission string            `json:"dashboard_preferences_update_permission"`
	PreferencesManageTenantPermission    string            `json:"preferences_manage_tenant_permission"`
	PreferencesManageOrgPermission       string            `json:"preferences_manage_org_permission"`
	PreferencesManageSystemPermission    string            `json:"preferences_manage_system_permission"`
	ProfilePermission                    string            `json:"profile_permission"`
	ProfileUpdatePermission              string            `json:"profile_update_permission"`
	UsersPermission                      string            `json:"users_permission"`
	UsersCreatePermission                string            `json:"users_create_permission"`
	UsersImportPermission                string            `json:"users_import_permission"`
	UsersUpdatePermission                string            `json:"users_update_permission"`
	UsersDeletePermission                string            `json:"users_delete_permission"`
	RolesPermission                      string            `json:"roles_permission"`
	RolesCreatePermission                string            `json:"roles_create_permission"`
	RolesUpdatePermission                string            `json:"roles_update_permission"`
	RolesDeletePermission                string            `json:"roles_delete_permission"`
	TenantsPermission                    string            `json:"tenants_permission"`
	TenantsCreatePermission              string            `json:"tenants_create_permission"`
	TenantsUpdatePermission              string            `json:"tenants_update_permission"`
	TenantsDeletePermission              string            `json:"tenants_delete_permission"`
	OrganizationsPermission              string            `json:"organizations_permission"`
	OrganizationsCreatePermission        string            `json:"organizations_create_permission"`
	OrganizationsUpdatePermission        string            `json:"organizations_update_permission"`
	OrganizationsDeletePermission        string            `json:"organizations_delete_permission"`
	MenuBuilderPermission                string            `json:"menu_builder_permission"`
	MenuBuilderEditPermission            string            `json:"menu_builder_edit_permission"`
	MenuBuilderPublishPermission         string            `json:"menu_builder_publish_permission"`

	AuthConfig *AuthConfig `json:"auth_config"`

	NavMenuCode string `json:"nav_menu_code"`
	NavDebug    bool   `json:"nav_debug"`
	NavDebugLog bool   `json:"nav_debug_log"`

	FeatureFlagKeys    []string   `json:"feature_flag_keys"`
	FeatureCatalogPath string     `json:"feature_catalog_path"`
	EnablePublicAPI    bool       `json:"enable_public_api"`
	Site               SiteConfig `json:"site"`

	ScopeMode       string `json:"scope_mode"`
	DefaultTenantID string `json:"default_tenant_id"`
	DefaultOrgID    string `json:"default_org_id"`

	Commands CommandConfig  `json:"commands"`
	Routing  routing.Config `json:"routing"`
}

// SiteConfig controls public site API behavior exposed by go-admin.
type SiteConfig struct {
	// AllowLocaleFallback controls missing translation fallback behavior for site APIs.
	// Nil defaults to true.
	AllowLocaleFallback *bool `json:"allow_locale_fallback"`
	// Protected enables auth wrapping for site endpoints when an authenticator is configured.
	Protected bool `json:"protected"`
	// ReadPermission optionally guards site endpoint reads when Protected is enabled.
	ReadPermission string `json:"read_permission"`
	// DraftReadPermission optionally guards include_drafts access.
	DraftReadPermission string `json:"draft_read_permission"`
	// TrustPrivateNetworkDraftReads allows include_drafts reads from private/loopback
	// network origins without actor permission checks. Disabled by default to avoid
	// network-topology-based authorization.
	TrustPrivateNetworkDraftReads bool `json:"trust_private_network_draft_reads"`
	// ViewProfileOverridePermission optionally guards view_profile overrides.
	ViewProfileOverridePermission string `json:"view_profile_override_permission"`
}

// URLNamespaceConfig defines URL defaults for a namespace (admin or public).
type URLNamespaceConfig struct {
	BasePath     string            `json:"base_path"`
	APIPrefix    string            `json:"api_prefix"`
	APIVersion   string            `json:"api_version"`
	URLTemplate  string            `json:"url_template"`
	TemplateVars map[string]string `json:"template_vars"`
}

// URLConfig controls admin URL generation defaults.
type URLConfig struct {
	Admin  URLNamespaceConfig `json:"admin"`
	Public URLNamespaceConfig `json:"public"`
	URLKit *urlkit.Config     `json:"url_kit"`
}

// CMSOptions configures how the CMS container is resolved (in-memory, go-cms, or host-provided).
type CMSOptions struct {
	Container        CMSContainer        `json:"container"`
	ContainerBuilder CMSContainerBuilder `json:"container_builder"`
	GoCMSConfig      any                 `json:"go_cms_config"`
}

// CMSContainerBuilder constructs a CMSContainer from admin configuration.
type CMSContainerBuilder func(ctx context.Context, cfg Config) (CMSContainer, error)

// AuthConfig captures login/logout endpoints and redirect defaults.
type AuthConfig struct {
	LoginPath    string `json:"login_path"`
	LogoutPath   string `json:"logout_path"`
	RedirectPath string `json:"redirect_path"`
}
