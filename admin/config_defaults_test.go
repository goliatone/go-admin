package admin

import (
	"testing"

	"github.com/goliatone/go-command"
)

func TestEffectiveViewPermissionsMatchConfigDefaults(t *testing.T) {
	cfg := Config{}
	if got := EffectiveSettingsPermission(cfg); got != PermAdminSettingsView {
		t.Fatalf("expected default settings permission, got %q", got)
	}
	if got := EffectivePreferencesPermission(cfg); got != PermAdminPreferencesView {
		t.Fatalf("expected default preferences permission, got %q", got)
	}
	if got := EffectiveProfilePermission(cfg); got != PermAdminProfileView {
		t.Fatalf("expected default profile permission, got %q", got)
	}

	cfg.SettingsPermission = " custom.settings.view "
	cfg.PreferencesPermission = " custom.preferences.view "
	cfg.ProfilePermission = " custom.profile.view "
	if got := EffectiveSettingsPermission(cfg); got != "custom.settings.view" {
		t.Fatalf("expected trimmed custom settings permission, got %q", got)
	}
	if got := EffectivePreferencesPermission(cfg); got != "custom.preferences.view" {
		t.Fatalf("expected trimmed custom preferences permission, got %q", got)
	}
	if got := EffectiveProfilePermission(cfg); got != "custom.profile.view" {
		t.Fatalf("expected trimmed custom profile permission, got %q", got)
	}
}

func TestNewAppliesPermissionAndFeatureDefaults(t *testing.T) {
	adm, err := New(Config{BasePath: "/admin"}, Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	if adm.config.DefaultLocale != "en" {
		t.Fatalf("expected default locale 'en', got %q", adm.config.DefaultLocale)
	}
	if adm.config.ThemeVariant != "default" {
		t.Fatalf("expected default theme variant 'default', got %q", adm.config.ThemeVariant)
	}
	if adm.config.ThemeAssets == nil {
		t.Fatalf("expected theme assets map to be initialized")
	}
	if adm.config.SettingsPermission != "admin.settings.view" {
		t.Fatalf("expected settings permission default, got %q", adm.config.SettingsPermission)
	}
	if adm.config.SettingsUpdatePermission != "admin.settings.edit" {
		t.Fatalf("expected settings update permission default, got %q", adm.config.SettingsUpdatePermission)
	}
	if adm.config.FeatureFlagsViewPermission != "admin.feature_flags.view" {
		t.Fatalf("expected feature flags view permission default, got %q", adm.config.FeatureFlagsViewPermission)
	}
	if adm.config.FeatureFlagsUpdatePermission != "admin.feature_flags.update" {
		t.Fatalf("expected feature flags update permission default, got %q", adm.config.FeatureFlagsUpdatePermission)
	}
	if adm.config.URLs.Admin.APIPrefix != "api" {
		t.Fatalf("expected admin URL API prefix default, got %q", adm.config.URLs.Admin.APIPrefix)
	}
	if adm.config.URLs.Admin.APIVersion != "" {
		t.Fatalf("expected admin URL API version to default empty, got %q", adm.config.URLs.Admin.APIVersion)
	}
	if adm.config.URLs.Public.APIPrefix != "api" {
		t.Fatalf("expected public URL API prefix default, got %q", adm.config.URLs.Public.APIPrefix)
	}
	if adm.config.URLs.Public.APIVersion != "v1" {
		t.Fatalf("expected public URL API version default, got %q", adm.config.URLs.Public.APIVersion)
	}
	if !adm.config.Routing.Enabled {
		t.Fatalf("expected routing enabled by default")
	}
	if adm.config.Routing.Roots.AdminRoot != "/admin" {
		t.Fatalf("expected routing admin root /admin, got %q", adm.config.Routing.Roots.AdminRoot)
	}
	if adm.config.Routing.Roots.APIRoot != "/admin/api" {
		t.Fatalf("expected routing api root /admin/api, got %q", adm.config.Routing.Roots.APIRoot)
	}
	if adm.config.Routing.Roots.PublicAPIRoot != "/api/v1" {
		t.Fatalf("expected routing public api root /api/v1, got %q", adm.config.Routing.Roots.PublicAPIRoot)
	}
	if adm.config.Routing.Modules[debugRoutingSlug].Mount.UIBase != "/admin/debug" {
		t.Fatalf("expected routing debug root /admin/debug, got %q", adm.config.Routing.Modules[debugRoutingSlug].Mount.UIBase)
	}
	if adm.config.Site.AllowLocaleFallback == nil || !*adm.config.Site.AllowLocaleFallback {
		t.Fatalf("expected site locale fallback default true")
	}
	if adm.config.Site.AllowUnauthenticatedReads {
		t.Fatalf("expected anonymous site reads to default false")
	}
	if adm.config.Site.ReadPermission != "admin.site.read" {
		t.Fatalf("expected site read permission default, got %q", adm.config.Site.ReadPermission)
	}
	if adm.config.Site.DraftReadPermission != "admin.site.read_drafts" {
		t.Fatalf("expected site draft read permission default, got %q", adm.config.Site.DraftReadPermission)
	}
	if adm.config.Site.TrustPrivateNetworkDraftReads {
		t.Fatalf("expected private-network draft read trust to default false")
	}
	if adm.config.Site.ViewProfileOverridePermission != "admin.site.view_profile_override" {
		t.Fatalf("expected site view profile override permission default, got %q", adm.config.Site.ViewProfileOverridePermission)
	}
	if len(adm.config.PreviewURLAllowedHosts) != 0 {
		t.Fatalf("expected preview URL allowed hosts to default empty, got %v", adm.config.PreviewURLAllowedHosts)
	}
	if adm.config.PreferencesPermission != "admin.preferences.view" {
		t.Fatalf("expected preferences permission default, got %q", adm.config.PreferencesPermission)
	}
	if adm.config.ActivityPermission != "admin.activity.view" {
		t.Fatalf("expected activity permission default, got %q", adm.config.ActivityPermission)
	}
	if adm.config.PreferencesUpdatePermission != "admin.preferences.edit" {
		t.Fatalf("expected preferences update permission default, got %q", adm.config.PreferencesUpdatePermission)
	}
	if adm.config.DashboardPreferencesPermission != "admin.preferences.view" {
		t.Fatalf("expected dashboard preferences permission default, got %q", adm.config.DashboardPreferencesPermission)
	}
	if adm.config.DashboardPreferencesUpdatePermission != "admin.preferences.edit" {
		t.Fatalf("expected dashboard preferences update permission default, got %q", adm.config.DashboardPreferencesUpdatePermission)
	}
	if adm.config.PreferencesManageTenantPermission != "admin.preferences.manage_tenant" {
		t.Fatalf("expected preferences manage tenant permission default, got %q", adm.config.PreferencesManageTenantPermission)
	}
	if adm.config.PreferencesManageOrgPermission != "admin.preferences.manage_org" {
		t.Fatalf("expected preferences manage org permission default, got %q", adm.config.PreferencesManageOrgPermission)
	}
	if adm.config.PreferencesManageSystemPermission != "admin.preferences.manage_system" {
		t.Fatalf("expected preferences manage system permission default, got %q", adm.config.PreferencesManageSystemPermission)
	}
	if adm.config.ProfilePermission != "admin.profile.view" {
		t.Fatalf("expected profile permission default, got %q", adm.config.ProfilePermission)
	}
	if adm.config.ProfileUpdatePermission != "admin.profile.edit" {
		t.Fatalf("expected profile update permission default, got %q", adm.config.ProfileUpdatePermission)
	}
	if adm.config.UsersPermission != "admin.users.view" {
		t.Fatalf("expected users view permission default, got %q", adm.config.UsersPermission)
	}
	if adm.config.UsersCreatePermission != "admin.users.create" {
		t.Fatalf("expected users create permission default, got %q", adm.config.UsersCreatePermission)
	}
	if adm.config.UsersImportPermission != "admin.users.import" {
		t.Fatalf("expected users import permission default, got %q", adm.config.UsersImportPermission)
	}
	if adm.config.UsersUpdatePermission != "admin.users.edit" {
		t.Fatalf("expected users update permission default, got %q", adm.config.UsersUpdatePermission)
	}
	if adm.config.UsersDeletePermission != "admin.users.delete" {
		t.Fatalf("expected users delete permission default, got %q", adm.config.UsersDeletePermission)
	}
	if adm.config.MenuBuilderPermission != "admin.menus.view" {
		t.Fatalf("expected menu builder view permission default, got %q", adm.config.MenuBuilderPermission)
	}
	if adm.config.MenuBuilderEditPermission != "admin.menus.edit" {
		t.Fatalf("expected menu builder edit permission default, got %q", adm.config.MenuBuilderEditPermission)
	}
	if adm.config.MenuBuilderPublishPermission != "admin.menus.publish" {
		t.Fatalf("expected menu builder publish permission default, got %q", adm.config.MenuBuilderPublishPermission)
	}
	if adm.config.MediaPermission != "admin.media.view" {
		t.Fatalf("expected media view permission default, got %q", adm.config.MediaPermission)
	}
	if adm.config.MediaCreatePermission != "admin.media.create" {
		t.Fatalf("expected media create permission default, got %q", adm.config.MediaCreatePermission)
	}
	if adm.config.MediaUpdatePermission != "admin.media.edit" {
		t.Fatalf("expected media update permission default, got %q", adm.config.MediaUpdatePermission)
	}
	if adm.config.MediaDeletePermission != "admin.media.delete" {
		t.Fatalf("expected media delete permission default, got %q", adm.config.MediaDeletePermission)
	}
	if adm.config.ThemeTokens == nil || adm.config.SettingsThemeTokens == nil {
		t.Fatalf("expected theme token maps to be initialized")
	}
	if adm.config.Commands.Execution.DefaultMode != command.ExecutionModeInline {
		t.Fatalf("expected commands.execution.default_mode inline, got %q", adm.config.Commands.Execution.DefaultMode)
	}
	if adm.config.Commands.Execution.PerCommand == nil {
		t.Fatalf("expected commands.execution.per_command map initialized")
	}
	if adm.config.Commands.RPC.Commands == nil {
		t.Fatalf("expected commands.rpc.commands map initialized")
	}
	if adm.config.Commands.RPC.DiscoveryEnabled {
		t.Fatalf("expected commands.rpc.discovery_enabled default false")
	}
	if len(adm.config.Commands.RPC.MetadataAllowlist) == 0 {
		t.Fatalf("expected commands.rpc.metadata_allowlist defaults")
	}

	adm2, err := New(Config{BasePath: "/admin"}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands)})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if !featureEnabled(adm2.featureGate, FeatureCommands) {
		t.Fatalf("expected feature gate to enable commands")
	}

	adm3, err := New(Config{
		BasePath: "/admin",
		Debug: DebugConfig{
			BasePath: "/control/tools/debug",
		},
	}, Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if adm3.config.Routing.Modules[debugRoutingSlug].Mount.UIBase != "/control/tools/debug" {
		t.Fatalf("expected custom routing debug root /control/tools/debug, got %q", adm3.config.Routing.Modules[debugRoutingSlug].Mount.UIBase)
	}
}

func TestPreviewURLAllowedHostsNormalizeAndUpdateAtRuntime(t *testing.T) {
	adm, err := New(Config{
		BasePath: "/admin",
		PreviewURLAllowedHosts: []string{
			" https://preview.example.test/root ",
			"PREVIEW.EXAMPLE.TEST",
			"",
		},
	}, Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if got := adm.PreviewURLAllowedHosts(); len(got) != 1 || got[0] != "preview.example.test" {
		t.Fatalf("expected normalized preview host, got %v", got)
	}
	if got := adm.BuildSitePreviewURL("https://preview.example.test/about", "token-123"); got != "https://preview.example.test/about?preview_token=token-123" {
		t.Fatalf("expected allowed absolute preview URL, got %q", got)
	}
	if got := adm.BuildSitePreviewURL("https://evil.example.test/about", "token-123"); got != "" {
		t.Fatalf("expected unlisted absolute preview URL denied, got %q", got)
	}

	adm.AddPreviewURLAllowedHost("https://second.example.test/path")
	if got := adm.BuildSitePreviewURL("https://second.example.test/about", "token-123"); got != "https://second.example.test/about?preview_token=token-123" {
		t.Fatalf("expected runtime-added preview host allowed, got %q", got)
	}
	adm.RemovePreviewURLAllowedHost("second.example.test")
	if got := adm.BuildSitePreviewURL("https://second.example.test/about", "token-123"); got != "" {
		t.Fatalf("expected runtime-removed preview host denied, got %q", got)
	}

	adm.WithPreviewURLAllowedHosts("third.example.test")
	if got := adm.BuildSitePreviewURL("https://third.example.test/about", "token-123"); got != "https://third.example.test/about?preview_token=token-123" {
		t.Fatalf("expected replaced preview host allowed, got %q", got)
	}
	if got := adm.BuildSitePreviewURL("https://preview.example.test/about", "token-123"); got != "" {
		t.Fatalf("expected replaced preview host to remove previous host, got %q", got)
	}
}

func TestNewRejectsInvalidCommandExecutionPolicy(t *testing.T) {
	_, err := New(Config{
		Commands: CommandConfig{
			Execution: CommandExecutionPolicy{
				DefaultMode: command.ExecutionMode("invalid"),
			},
		},
	}, Dependencies{})
	if err == nil {
		t.Fatalf("expected invalid command execution policy error")
	}
}
