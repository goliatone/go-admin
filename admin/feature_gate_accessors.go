package admin

import (
	"context"
	"strings"

	fggate "github.com/goliatone/go-featuregate/gate"
)

// FeatureGate exposes the configured feature gate.
func (a *Admin) FeatureGate() fggate.FeatureGate {
	if a == nil {
		return nil
	}
	return a.featureGate
}

// ActivityFeatureEnabled reports whether the activity feature gate is enabled.
func (a *Admin) ActivityFeatureEnabled() bool {
	if a == nil {
		return false
	}
	return featureEnabled(a.featureGate, FeatureActivity)
}

// PanelAPIAvailable reports whether the boot pipeline successfully registered
// API routes for the named panel.
func (a *Admin) PanelAPIAvailable(panelName string) bool {
	if a == nil {
		return false
	}
	panelName = strings.ToLower(strings.TrimSpace(panelName))
	if panelName == "" {
		return false
	}
	a.panelRoutesMu.RLock()
	defer a.panelRoutesMu.RUnlock()
	_, available := a.mountedPanelRoutes[panelName]
	return available
}

// PreferencesAPIAvailable reports whether the Preferences service is enabled
// and its panel routes were successfully mounted.
func (a *Admin) PreferencesAPIAvailable() bool {
	if a == nil ||
		a.preferences == nil ||
		!featureEnabled(a.featureGate, FeaturePreferences) {
		return false
	}
	return a.PanelAPIAvailable(preferencesModuleID)
}

// PreferencesAPICapabilities describes route and request authorization for the
// shared Preferences panel.
type PreferencesAPICapabilities struct {
	Available bool `json:"available"`
	Readable  bool `json:"readable"`
	Writable  bool `json:"writable"`
}

// PreferencesAPICapabilities returns request-scoped Preferences API
// capabilities using the same configured permissions as the Preferences panel.
func (a *Admin) PreferencesAPICapabilities(ctx context.Context) PreferencesAPICapabilities {
	capabilities := PreferencesAPICapabilities{
		Available: a.PreferencesAPIAvailable(),
	}
	if !capabilities.Available {
		return capabilities
	}
	capabilities.Readable = permissionAllowed(
		a.authorizer,
		ctx,
		a.config.PreferencesPermission,
		preferencesModuleID,
	)
	capabilities.Writable = capabilities.Readable && permissionAllowed(
		a.authorizer,
		ctx,
		a.config.PreferencesUpdatePermission,
		preferencesModuleID,
	)
	return capabilities
}

// PreferencesAPIRequestCapabilities is a compatibility-friendly projection
// for consumers that need request-scoped read/write booleans without sharing
// the capability struct type.
func (a *Admin) PreferencesAPIRequestCapabilities(ctx context.Context) (readable, writable bool) {
	capabilities := a.PreferencesAPICapabilities(ctx)
	return capabilities.Readable, capabilities.Writable
}

// ActivityReadEnabled reports whether the activity read API is both enabled and wired.
func (a *Admin) ActivityReadEnabled() bool {
	if a == nil {
		return false
	}
	if !a.ActivityFeatureEnabled() {
		return false
	}
	return a.activityFeed != nil
}

// UserImportEnabled reports whether the users bulk-import backend is wired.
func (a *Admin) UserImportEnabled() bool {
	if a == nil {
		return false
	}
	return a.bulkUserImport != nil
}

// UserImportAllowed reports whether the current actor can access users import.
func (a *Admin) UserImportAllowed(ctx context.Context) bool {
	if !a.UserImportEnabled() {
		return false
	}
	permission := strings.TrimSpace(a.config.UsersImportPermission)
	return permissionAllowed(a.authorizer, ctx, permission, "users")
}
