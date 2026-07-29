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

// PreferencesAPIAvailable reports whether the preferences service and module
// route are available to browser clients.
//
// Before module loading, the typed default-module policy is authoritative.
// After loading starts, registry membership also supports a host-provided
// replacement module with the canonical preferences ID.
func (a *Admin) PreferencesAPIAvailable() bool {
	if a == nil ||
		a.preferences == nil ||
		!featureEnabled(a.featureGate, FeaturePreferences) {
		return false
	}
	if a.registry != nil {
		if _, registered := a.registry.Module(preferencesModuleID); registered {
			return true
		}
	}
	return !a.modulesLoaded && a.defaultModuleEnabled(preferencesModuleID)
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
