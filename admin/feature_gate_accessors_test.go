package admin

import (
	"context"
	"testing"

	userscommand "github.com/goliatone/go-users/command"
	usertypes "github.com/goliatone/go-users/pkg/types"
)

type featureGateAccessorActivityFeed struct{}

func (featureGateAccessorActivityFeed) Query(context.Context, usertypes.ActivityFilter) (usertypes.ActivityPage, error) {
	return usertypes.ActivityPage{}, nil
}

func TestActivityFeatureEnabledReflectsFeatureGate(t *testing.T) {
	disabled := mustNewAdmin(t, Config{}, Dependencies{})
	if disabled.ActivityFeatureEnabled() {
		t.Fatalf("expected activity feature disabled without gate")
	}

	enabled := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureActivity),
	})
	if !enabled.ActivityFeatureEnabled() {
		t.Fatalf("expected activity feature enabled when gate is configured")
	}
}

func TestActivityReadEnabledRequiresFeatureGateAndFeed(t *testing.T) {
	feedOnly := mustNewAdmin(t, Config{}, Dependencies{
		ActivityFeedQuery: featureGateAccessorActivityFeed{},
	})
	if feedOnly.ActivityReadEnabled() {
		t.Fatalf("expected activity read disabled without feature gate")
	}

	gateOnly := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureActivity),
	})
	if gateOnly.ActivityReadEnabled() {
		t.Fatalf("expected activity read disabled without activity feed")
	}

	enabled := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate:       featureGateFromKeys(FeatureActivity),
		ActivityFeedQuery: featureGateAccessorActivityFeed{},
	})
	if !enabled.ActivityReadEnabled() {
		t.Fatalf("expected activity read enabled when gate and feed are configured")
	}
}

func TestUserImportAllowedFailsClosedWithoutAuthorizer(t *testing.T) {
	adm := mustNewAdminWithoutAuthorizer(t, Config{}, Dependencies{
		BulkUserImport: &userscommand.BulkUserImportCommand{},
	})
	if adm.UserImportAllowed(context.Background()) {
		t.Fatalf("expected user import access denied without authorizer")
	}
}

func TestUserImportAllowedAllowsBlankPermissionWithoutAuthorizer(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		BulkUserImport: &userscommand.BulkUserImportCommand{},
	})
	adm.config.UsersImportPermission = ""
	if !adm.UserImportAllowed(context.Background()) {
		t.Fatalf("expected user import access allowed when permission is intentionally blank")
	}
}
