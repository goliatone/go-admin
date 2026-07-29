package admin

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/goliatone/go-admin/admin/routing"
	urlkit "github.com/goliatone/go-urlkit"
)

// SidebarCollapsePlacement controls where the desktop collapse action renders.
// The empty value normalizes to the legacy header placement.
type SidebarCollapsePlacement string

const (
	SidebarCollapsePlacementHeader SidebarCollapsePlacement = "header"
	SidebarCollapsePlacementFooter SidebarCollapsePlacement = "footer"
)

// DefaultModuleID identifies a module registered automatically by Admin.
type DefaultModuleID string

const (
	DefaultModuleActivity      DefaultModuleID = "activity"
	DefaultModuleFeatureFlags  DefaultModuleID = "feature_flags"
	DefaultModuleMedia         DefaultModuleID = "media"
	DefaultModuleOrganizations DefaultModuleID = "organizations"
	DefaultModulePreferences   DefaultModuleID = "preferences"
	DefaultModuleProfile       DefaultModuleID = "profile"
	DefaultModuleTenants       DefaultModuleID = "tenants"
	DefaultModuleUsers         DefaultModuleID = "users"
)

// NormalizeSidebarCollapsePlacement returns a supported sidebar collapse
// placement while preserving the legacy header behavior for empty/unknown input.
func NormalizeSidebarCollapsePlacement(value SidebarCollapsePlacement) SidebarCollapsePlacement {
	switch SidebarCollapsePlacement(strings.ToLower(strings.TrimSpace(string(value)))) {
	case SidebarCollapsePlacementFooter:
		return SidebarCollapsePlacementFooter
	default:
		return SidebarCollapsePlacementHeader
	}
}

// Config holds core admin settings and feature flags.
type Config struct {
	Title               string            `json:"title"`
	BasePath            string            `json:"base_path"`
	URLs                URLConfig         `json:"urls"`
	DefaultLocale       string            `json:"default_locale"`
	Theme               string            `json:"theme"`
	ThemeVariant        string            `json:"theme_variant"`
	ThemeTokens         map[string]string `json:"theme_tokens"`
	ThemeTokenOverrides map[string]string `json:"theme_token_overrides,omitempty"`
	// ThemeAssets carries final resolved asset URLs/paths that override themed assets
	// after go-theme selection. Use reserved keys like "logo", "icon", and "favicon".
	ThemeAssets            map[string]string        `json:"theme_assets,omitempty"`
	ThemeAssetPrefix       string                   `json:"theme_asset_prefix"`
	PreviewSecret          string                   `json:"preview_secret"`
	PreviewURLAllowedHosts []string                 `json:"preview_url_allowed_hosts,omitempty"`
	CMSConfig              any                      `json:"cms_config"`
	CMS                    CMSOptions               `json:"cms"`
	Debug                  DebugConfig              `json:"debug"`
	Errors                 ErrorConfig              `json:"errors"`
	Deployment             DeploymentIdentityConfig `json:"deployment"`

	// LogoURL is the legacy override for the expanded/admin lockup asset.
	// Prefer ThemeAssets["logo"] for new integrations.
	LogoURL string `json:"logo_url"`
	// FaviconURL is the legacy override for the browser/app icon asset.
	// Prefer ThemeAssets["favicon"] for new integrations.
	FaviconURL string `json:"favicon_url"`
	CustomCSS  string `json:"custom_css"`
	CustomJS   string `json:"custom_js"`

	// SidebarHideSearch removes the sidebar search slot from the admin shell.
	// It defaults to false so existing consumers keep the search field; set it
	// when the approved navigation design has no search affordance.
	SidebarHideSearch bool `json:"sidebar_hide_search,omitempty"`
	// SidebarCollapsePlacement moves the existing desktop collapse action
	// without changing its interaction contract. Empty defaults to "header".
	SidebarCollapsePlacement SidebarCollapsePlacement `json:"sidebar_collapse_placement,omitempty"`
	// SidebarUseInitialsAvatar keeps an empty avatar URL so the shared template
	// renders the identity initials fallback instead of the packaged image.
	SidebarUseInitialsAvatar bool `json:"sidebar_use_initials_avatar,omitempty"`
	// SidebarHidePresence suppresses the optional online/presence indicator.
	SidebarHidePresence bool `json:"sidebar_hide_presence,omitempty"`
	// SidebarHideUserMenuIndicator suppresses the optional disclosure arrow.
	SidebarHideUserMenuIndicator bool `json:"sidebar_hide_user_menu_indicator,omitempty"`
	// SidebarCompactFooter enables the compact shared utility/identity layout.
	SidebarCompactFooter bool `json:"sidebar_compact_footer,omitempty"`
	// DisabledDefaultModules lets hosts omit built-in product surfaces that are
	// outside their approved application composition. Empty preserves all
	// legacy default-module behavior.
	DisabledDefaultModules []DefaultModuleID `json:"disabled_default_modules,omitempty"`

	// ExternalAssets overrides the packaged third-party stylesheets and scripts
	// the admin document loads. Empty fields use the pinned copies embedded in
	// go-admin, so the default shell has no public-CDN dependency.
	ExternalAssets ExternalAssetConfig `json:"external_assets,omitempty"`

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
	ActivityTabPermissionFailureMode     string                 `json:"activity_tab_permission_failure_mode"`
	ActivityActionLabels                 map[string]string      `json:"activity_action_labels"`
	JobsPermission                       string                 `json:"jobs_permission"`
	JobsTriggerPermission                string                 `json:"jobs_trigger_permission"`
	PreferencesPermission                string                 `json:"preferences_permission"`
	PreferencesUpdatePermission          string                 `json:"preferences_update_permission"`
	DashboardPreferencesPermission       string                 `json:"dashboard_preferences_permission"`
	DashboardPreferencesUpdatePermission string                 `json:"dashboard_preferences_update_permission"`
	PreferencesManageTenantPermission    string                 `json:"preferences_manage_tenant_permission"`
	PreferencesManageOrgPermission       string                 `json:"preferences_manage_org_permission"`
	PreferencesManageSystemPermission    string                 `json:"preferences_manage_system_permission"`
	ProfilePermission                    string                 `json:"profile_permission"`
	ProfileUpdatePermission              string                 `json:"profile_update_permission"`
	UsersPermission                      string                 `json:"users_permission"`
	UsersCreatePermission                string                 `json:"users_create_permission"`
	UsersImportPermission                string                 `json:"users_import_permission"`
	UsersUpdatePermission                string                 `json:"users_update_permission"`
	UsersDeletePermission                string                 `json:"users_delete_permission"`
	RolesPermission                      string                 `json:"roles_permission"`
	RolesCreatePermission                string                 `json:"roles_create_permission"`
	RolesUpdatePermission                string                 `json:"roles_update_permission"`
	RolesDeletePermission                string                 `json:"roles_delete_permission"`
	TenantsPermission                    string                 `json:"tenants_permission"`
	TenantsCreatePermission              string                 `json:"tenants_create_permission"`
	TenantsUpdatePermission              string                 `json:"tenants_update_permission"`
	TenantsDeletePermission              string                 `json:"tenants_delete_permission"`
	OrganizationsPermission              string                 `json:"organizations_permission"`
	OrganizationsCreatePermission        string                 `json:"organizations_create_permission"`
	OrganizationsUpdatePermission        string                 `json:"organizations_update_permission"`
	OrganizationsDeletePermission        string                 `json:"organizations_delete_permission"`
	MenuBuilderPermission                string                 `json:"menu_builder_permission"`
	MenuBuilderEditPermission            string                 `json:"menu_builder_edit_permission"`
	MenuBuilderPublishPermission         string                 `json:"menu_builder_publish_permission"`
	EntryNavigation                      EntryNavigationOptions `json:"entry_navigation"`
	MediaPermission                      string                 `json:"media_permission"`
	MediaCreatePermission                string                 `json:"media_create_permission"`
	MediaUpdatePermission                string                 `json:"media_update_permission"`
	MediaDeletePermission                string                 `json:"media_delete_permission"`
	MediaDelivery                        MediaDeliveryConfig    `json:"media_delivery"`

	AuthConfig *AuthConfig `json:"auth_config"`

	EnhancedActions EnhancedActionNegotiationConfig `json:"enhanced_actions"`

	NavMenuCode string `json:"nav_menu_code"`
	NavDebug    bool   `json:"nav_debug"`
	NavDebugLog bool   `json:"nav_debug_log"`
	// NavEnvironment scopes managed admin navigation convergence and diagnostics.
	// Empty values fall back to Debug.Environment, then "default".
	NavEnvironment string `json:"nav_environment"`
	// NavPermissionDeniedMode controls whether denied navigation entries are
	// hidden or retained as disabled diagnostics. Empty and unknown values
	// normalize to "hide".
	NavPermissionDeniedMode NavigationPermissionDeniedMode `json:"nav_permission_denied_mode"`
	// NavRouteMissingPolicy controls route-missing module menu behavior.
	// Empty auto mode is strict in dev/test-like environments and report-only
	// otherwise. Explicit "strict" and "report" override auto behavior.
	NavRouteMissingPolicy NavigationRouteMissingPolicy `json:"nav_route_missing_policy"`

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
	// AllowUnauthenticatedReads explicitly opts into anonymous public-site reads.
	// Leave false to require an authenticated actor for the public API surface.
	AllowUnauthenticatedReads bool `json:"allow_unauthenticated_reads,omitempty"`
	// Protected forces authenticated site reads even when anonymous reads would
	// otherwise be allowed by configuration.
	Protected bool `json:"protected"`
	// ReadPermission guards authenticated site endpoint reads.
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
	// AllowUnauthenticatedRoutes explicitly opts out of the default admin
	// route-auth requirement. Leave false to require an authenticator before
	// Initialize mounts the protected admin surface.
	AllowUnauthenticatedRoutes bool `json:"allow_unauthenticated_routes,omitempty"`
}

// ExternalAssetConfig points the admin document at specific copies of the
// third-party assets it renders with. Empty fields select the packaged default.
type ExternalAssetConfig struct {
	// IconoirCSS supplies the Iconoir icon stylesheet used by menu and control
	// glyphs that no theme asset role covers.
	IconoirCSS string `json:"iconoir_css,omitempty"`
	// DataTablesCSS supplies the simple-datatables stylesheet.
	DataTablesCSS string `json:"datatables_css,omitempty"`
	// EChartsJS supplies the ECharts runtime used by dashboard charts.
	EChartsJS string `json:"echarts_js,omitempty"`
}

// Default third-party asset paths are relative to the configured admin asset
// base and are rendered through asset_base_path in the shared templates.
const (
	DefaultIconoirCSSAssetPath    = "assets/dist/third-party/iconoir/iconoir.css"
	DefaultDataTablesCSSAssetPath = "assets/dist/third-party/simple-datatables/style.css"
	DefaultEChartsJSAssetPath     = "assets/dist/third-party/echarts/echarts.min.js"
)

// Resolve returns normalized explicit overrides. Empty fields intentionally
// remain empty so templates can resolve the packaged defaults against the
// request's base-path-aware asset_base_path.
func (c ExternalAssetConfig) Resolve() ExternalAssetConfig {
	return ExternalAssetConfig{
		IconoirCSS:    strings.TrimSpace(c.IconoirCSS),
		DataTablesCSS: strings.TrimSpace(c.DataTablesCSS),
		EChartsJS:     strings.TrimSpace(c.EChartsJS),
	}
}

// Validate rejects asset overrides that browsers could interpret as executable
// or scheme-relative URLs. Deployments may use an http(s) URL or a path
// relative to the current origin.
func (c ExternalAssetConfig) Validate() error {
	resolved := c.Resolve()
	for _, asset := range []struct {
		field string
		value string
	}{
		{field: "iconoir_css", value: resolved.IconoirCSS},
		{field: "datatables_css", value: resolved.DataTablesCSS},
		{field: "echarts_js", value: resolved.EChartsJS},
	} {
		if asset.value == "" {
			continue
		}
		if err := validateExternalAssetURL(asset.value); err != nil {
			return fmt.Errorf("%s: %w", asset.field, err)
		}
	}
	return nil
}

func validateExternalAssetURL(value string) error {
	if strings.ContainsAny(value, "\\\r\n\t") {
		return fmt.Errorf("asset URL contains disallowed characters")
	}
	parsed, err := url.Parse(value)
	if err != nil {
		return fmt.Errorf("invalid asset URL: %w", err)
	}
	if parsed.Scheme == "" {
		if parsed.Host != "" || strings.HasPrefix(value, "//") {
			return fmt.Errorf("scheme-relative asset URLs are not allowed")
		}
		if parsed.Path == "" {
			return fmt.Errorf("relative asset URL must include a path")
		}
		return nil
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("asset URL scheme %q is not allowed", parsed.Scheme)
	}
	if parsed.Host == "" {
		return fmt.Errorf("absolute asset URL must include a host")
	}
	if parsed.User != nil {
		return fmt.Errorf("asset URL credentials are not allowed")
	}
	return nil
}
