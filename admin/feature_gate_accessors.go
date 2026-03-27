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
