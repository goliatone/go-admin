package admin

import "testing"

func TestNewAppliesPermissionAndFeatureDefaults(t *testing.T) {
	adm, err := New(Config{}, Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	if adm.config.DefaultLocale != "en" {
		t.Fatalf("expected default locale 'en', got %q", adm.config.DefaultLocale)
	}
	if adm.config.ThemeVariant != "default" {
		t.Fatalf("expected default theme variant 'default', got %q", adm.config.ThemeVariant)
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
	if adm.config.URLs.APIPrefix != "api" {
		t.Fatalf("expected URL API prefix default, got %q", adm.config.URLs.APIPrefix)
	}
	if adm.config.URLs.APIVersion != "" {
		t.Fatalf("expected URL API version to default empty, got %q", adm.config.URLs.APIVersion)
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
	if adm.config.ThemeTokens == nil || adm.config.SettingsThemeTokens == nil {
		t.Fatalf("expected theme token maps to be initialized")
	}

	adm2, err := New(Config{}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands)})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	if !featureEnabled(adm2.featureGate, FeatureCommands) {
		t.Fatalf("expected feature gate to enable commands")
	}
}
