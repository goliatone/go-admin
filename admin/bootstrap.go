package admin

import (
	"context"
	"errors"

	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	settingsinternal "github.com/goliatone/go-admin/admin/internal/settings"
	"github.com/goliatone/go-command/registry"
	goerrors "github.com/goliatone/go-errors"
)

// Bootstrap initializes CMS seed data (CMS container, admin menu, settings defaults).
func (a *Admin) Bootstrap(ctx context.Context) error {
	if featureEnabled(a.featureGate, FeatureCMS) || featureEnabled(a.featureGate, FeatureDashboard) {
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

	if featureEnabled(a.featureGate, FeatureSettings) {
		if err := a.bootstrapSettingsDefaults(ctx); err != nil {
			return err
		}
	}

	// TODO: Configurable
	if featureEnabled(a.featureGate, FeatureNotifications) && a.notifications != nil {
		_, _ = a.notifications.Add(ctx, Notification{Title: "Welcome to go-admin", Message: "Notifications are wired", Read: false})
	}

	return nil
}

// Initialize attaches the router, bootstraps, and mounts base routes.
func (a *Admin) Initialize(r AdminRouter) error {
	if r == nil {
		return requiredFieldDomainError("router", map[string]any{"component": "bootstrap"})
	}
	a.router = r
	if err := a.runInitHooks(); err != nil {
		return err
	}
	return a.Boot()
}

// AddInitHook registers a hook that runs after Initialize sets the router.
func (a *Admin) AddInitHook(hook func(AdminRouter) error) {
	if a == nil || hook == nil {
		return
	}
	a.initHooks = append(a.initHooks, hook)
}

func (a *Admin) runInitHooks() error {
	if a == nil || a.initHooksRun {
		return nil
	}
	a.initHooksRun = true
	for _, hook := range a.initHooks {
		if hook == nil {
			continue
		}
		if err := hook(a.router); err != nil {
			return err
		}
	}
	return nil
}

// Prepare runs the pre-route initialization pipeline (bootstrap, module loading).
func (a *Admin) Prepare(ctx context.Context) error {
	if a.nav == nil {
		a.nav = NewNavigation(a.menuSvc, a.authorizer)
	}
	if a.nav != nil {
		a.nav.SetDefaultMenuCode(a.navMenuCode)
		a.nav.UseCMS(featureEnabled(a.featureGate, FeatureCMS))
	}
	if a.search == nil {
		a.search = NewSearchEngine(a.authorizer)
	}
	if a.search != nil {
		a.search.Enable(featureEnabled(a.featureGate, FeatureSearch))
	}
	if a.settings != nil {
		a.settings.Enable(featureEnabled(a.featureGate, FeatureSettings))
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
	if err := a.initializeCommandRegistry(ctx); err != nil {
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

func (a *Admin) initializeCommandRegistry(ctx context.Context) error {
	if a == nil || a.commandBus == nil || !a.commandBus.enabled {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := registry.Start(ctx); err != nil {
		var regErr *goerrors.Error
		if errors.As(err, &regErr) && regErr.TextCode == "REGISTRY_ALREADY_INITIALIZED" {
			return nil
		}
		return err
	}
	return nil
}

func (a *Admin) validateConfig() error {
	issues := []FeatureDependencyError{}
	require := func(feature FeatureKey, deps ...FeatureKey) {
		if !featureEnabled(a.featureGate, feature) {
			return
		}
		missing := []string{}
		for _, dep := range deps {
			if !featureEnabled(a.featureGate, dep) {
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
		if featureEnabled(a.featureGate, feature) && !featureEnabled(a.featureGate, FeatureCMS) {
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
	if a.nav == nil || !featureEnabled(a.featureGate, FeatureSettings) {
		return nil
	}
	settingsPath := resolveURLWith(a.urlManager, "admin", "settings", nil, nil)
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
		DashboardEnabled: featureEnabled(a.featureGate, FeatureDashboard),
		SearchEnabled:    featureEnabled(a.featureGate, FeatureSearch),
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
