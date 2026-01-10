package admin

import (
	"context"
	"errors"

	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	settingsinternal "github.com/goliatone/go-admin/admin/internal/settings"
)

// Bootstrap initializes CMS seed data (CMS container, admin menu, settings defaults).
func (a *Admin) Bootstrap(ctx context.Context) error {
	if a.gates.Enabled(FeatureCMS) || a.gates.Enabled(FeatureDashboard) {
		if err := a.ensureCMS(ctx); err != nil {
			return err
		}
		if err := a.registerWidgetAreas(); err != nil {
			return err
		}
		if err := a.registerDefaultWidgets(); err != nil {
			return err
		}
	}

	if err := a.bootstrapAdminMenu(ctx); err != nil {
		return err
	}

	if a.gates.Enabled(FeatureSettings) {
		if err := a.bootstrapSettingsDefaults(ctx); err != nil {
			return err
		}
	}

	// TODO: Configurable
	if a.gates.Enabled(FeatureNotifications) && a.notifications != nil {
		_, _ = a.notifications.Add(ctx, Notification{Title: "Welcome to go-admin", Message: "Notifications are wired", Read: false})
	}

	return nil
}

// Initialize attaches the router, bootstraps, and mounts base routes.
func (a *Admin) Initialize(r AdminRouter) error {
	if r == nil {
		return errors.New("router cannot be nil")
	}
	a.router = r
	return a.Boot()
}

// Prepare runs the pre-route initialization pipeline (bootstrap, module loading).
func (a *Admin) Prepare(ctx context.Context) error {
	if a.nav == nil {
		a.nav = NewNavigation(a.menuSvc, a.authorizer)
	}
	if a.nav != nil {
		a.nav.SetDefaultMenuCode(a.navMenuCode)
		a.nav.UseCMS(a.gates.Enabled(FeatureCMS))
	}
	if a.search == nil {
		a.search = NewSearchEngine(a.authorizer)
	}
	if a.search != nil {
		a.search.Enable(a.gates.Enabled(FeatureSearch))
	}
	if a.settings != nil {
		a.settings.Enable(a.gates.Enabled(FeatureSettings))
	}
	if err := a.validateConfig(); err != nil {
		return err
	}
	if err := a.Bootstrap(ctx); err != nil {
		return err
	}
	if err := a.loadModules(ctx); err != nil {
		return err
	}
	if err := a.ensureDashboard(ctx); err != nil {
		return err
	}
	if a.jobs != nil {
		if err := a.jobs.Sync(ctx); err != nil {
			return err
		}
	}
	if err := a.ensureSettingsNavigation(ctx); err != nil {
		return err
	}
	return nil
}

func (a *Admin) validateConfig() error {
	issues := []FeatureDependencyError{}
	require := func(feature FeatureKey, deps ...FeatureKey) {
		if !a.gates.Enabled(feature) {
			return
		}
		missing := []string{}
		for _, dep := range deps {
			if !a.gates.Enabled(dep) {
				missing = append(missing, string(dep))
			}
		}
		if len(missing) > 0 {
			issues = append(issues, FeatureDependencyError{Feature: string(feature), Missing: missing})
		}
	}

	require(FeatureJobs, FeatureCommands)
	require(FeatureBulk, FeatureCommands, FeatureJobs)

	for _, feature := range []FeatureKey{FeatureMedia, FeatureExport, FeatureBulk} {
		if a.gates.Enabled(feature) && !a.gates.Enabled(FeatureCMS) {
			issues = append(issues, FeatureDependencyError{
				Feature: string(feature),
				Missing: []string{string(FeatureCMS)},
			})
		}
	}
	if len(issues) == 0 {
		return nil
	}
	return InvalidFeatureConfigError{Issues: issues}
}

func (a *Admin) ensureSettingsNavigation(ctx context.Context) error {
	if a.nav == nil || !a.gates.Enabled(FeatureSettings) {
		return nil
	}
	settingsPath := joinPath(a.config.BasePath, "settings")
	const targetKey = "settings"

	if a.menuSvc != nil {
		menu, err := a.menuSvc.Menu(ctx, a.navMenuCode, a.config.DefaultLocale)
		if err == nil && navinternal.MenuHasTarget(menu.Items, targetKey, settingsPath) {
			return nil
		}
	}
	if navinternal.NavigationHasTarget(a.nav.Fallback(), targetKey, settingsPath) {
		return nil
	}

	item := MenuItem{
		Label:       "Settings",
		Icon:        "settings",
		Target:      map[string]any{"type": "url", "path": settingsPath, "key": targetKey},
		Permissions: []string{a.config.SettingsPermission},
		Menu:        a.navMenuCode,
		Locale:      a.config.DefaultLocale,
		Position:    intPtr(80),
		ParentID:    "nav-group-main",
	}
	return a.addMenuItems(ctx, []MenuItem{item})
}

func (a *Admin) requirePermission(ctx AdminContext, permission string, resource string) error {
	if permission == "" || a.authorizer == nil {
		return nil
	}
	if !a.authorizer.Can(ctx.Context, permission, resource) {
		return permissionDenied(permission, resource)
	}
	return nil
}

func (a *Admin) bootstrapSettingsDefaults(ctx context.Context) error {
	if a.settings == nil {
		return nil
	}

	cfg := settingsinternal.BootstrapConfig{
		Title:            a.config.Title,
		DefaultLocale:    a.config.DefaultLocale,
		Theme:            a.config.Theme,
		DashboardEnabled: a.gates.Enabled(FeatureDashboard),
		SearchEnabled:    a.gates.Enabled(FeatureSearch),
	}
	return settingsinternal.BootstrapDefaults(
		ctx,
		cfg,
		func(def settingsinternal.DefaultDefinition) {
			a.settings.RegisterDefinition(SettingDefinition{
				Key:         def.Key,
				Title:       def.Title,
				Description: def.Description,
				Default:     def.Default,
				Type:        def.Type,
				Group:       def.Group,
			})
		},
		func(ctx context.Context, values map[string]any) error {
			if len(values) == 0 {
				return nil
			}
			return a.settings.Apply(ctx, SettingsBundle{Scope: SettingsScopeSystem, Values: values})
		},
	)
}
