package admin

import (
	"context"
	"testing"

	router "github.com/goliatone/go-router"
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

type featureGateAccessorAuthorizer map[string]bool

func (a featureGateAccessorAuthorizer) Can(_ context.Context, action, _ string) bool {
	return a[action]
}

func TestPreferencesAPIAvailableRequiresMountedPanelRoute(t *testing.T) {
	t.Run("feature disabled", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{}, Dependencies{})
		if adm.PreferencesAPIAvailable() {
			t.Fatal("expected preferences API unavailable without feature gate")
		}
	})

	t.Run("default module not available before boot", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{}, Dependencies{
			FeatureGate: featureGateFromKeys(FeaturePreferences),
		})
		if adm.PreferencesAPIAvailable() {
			t.Fatal("expected preferences API unavailable before panel routes are mounted")
		}
	})

	t.Run("default module available after boot", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{}, Dependencies{
			FeatureGate: featureGateFromKeys(FeaturePreferences),
		})
		adm.WithAuthorizer(allowAuthorizer{})
		if err := adm.Initialize(router.NewHTTPServer().Router()); err != nil {
			t.Fatalf("initialize: %v", err)
		}
		if !adm.PreferencesAPIAvailable() {
			t.Fatal("expected mounted preferences panel to advertise API")
		}
	})

	t.Run("default module disabled", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{
			DisabledDefaultModules: []DefaultModuleID{DefaultModulePreferences},
		}, Dependencies{
			FeatureGate: featureGateFromKeys(FeaturePreferences),
		})
		adm.WithAuthorizer(allowAuthorizer{})
		if err := adm.Initialize(router.NewHTTPServer().Router()); err != nil {
			t.Fatalf("initialize: %v", err)
		}
		if adm.PreferencesAPIAvailable() {
			t.Fatal("expected disabled default preferences module to suppress API capability")
		}
	})

	t.Run("canonical module ID without panel route", func(t *testing.T) {
		adm := mustNewAdmin(t, Config{
			DisabledDefaultModules: []DefaultModuleID{DefaultModulePreferences},
		}, Dependencies{
			FeatureGate: featureGateFromKeys(FeaturePreferences),
		})
		if err := adm.RegisterModule(&stubModule{id: preferencesModuleID}); err != nil {
			t.Fatalf("register custom preferences module: %v", err)
		}
		adm.WithAuthorizer(allowAuthorizer{})
		if err := adm.Initialize(router.NewHTTPServer().Router()); err != nil {
			t.Fatalf("initialize: %v", err)
		}
		if adm.PreferencesAPIAvailable() {
			t.Fatal("expected module ID without a mounted preferences panel to remain unavailable")
		}
	})
}

func TestPreferencesAPICapabilitiesUseRequestPermissions(t *testing.T) {
	tests := []struct {
		name         string
		allowed      featureGateAccessorAuthorizer
		wantReadable bool
		wantWritable bool
	}{
		{
			name:    "read denied",
			allowed: featureGateAccessorAuthorizer{},
		},
		{
			name: "read only",
			allowed: featureGateAccessorAuthorizer{
				PermAdminPreferencesView: true,
			},
			wantReadable: true,
		},
		{
			name: "read and write",
			allowed: featureGateAccessorAuthorizer{
				PermAdminPreferencesView: true,
				PermAdminPreferencesEdit: true,
			},
			wantReadable: true,
			wantWritable: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adm := mustNewAdmin(t, Config{}, Dependencies{
				FeatureGate: featureGateFromKeys(FeaturePreferences),
			})
			adm.WithAuthorizer(tt.allowed)
			if err := adm.Initialize(router.NewHTTPServer().Router()); err != nil {
				t.Fatalf("initialize: %v", err)
			}

			got := adm.PreferencesAPICapabilities(context.Background())
			if !got.Available {
				t.Fatal("expected mounted Preferences route to be available")
			}
			if got.Readable != tt.wantReadable || got.Writable != tt.wantWritable {
				t.Fatalf(
					"unexpected capabilities: got readable=%t writable=%t; want readable=%t writable=%t",
					got.Readable,
					got.Writable,
					tt.wantReadable,
					tt.wantWritable,
				)
			}
		})
	}
}

func TestPreferencesAPICapabilitiesUseMountedPanelGuard(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeaturePreferences),
	})
	adm.WithAuthorizer(featureGateAccessorAuthorizer{
		PermAdminPreferencesView: true,
		PermAdminPreferencesEdit: true,
	})
	if err := adm.Initialize(router.NewHTTPServer().Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	panel, err := adm.replacePanel(
		preferencesModuleID,
		adm.Panel(preferencesModuleID).
			WithRepository(NewMemoryRepository()).
			Permissions(PanelPermissions{
				View:   "custom.preferences.read",
				Create: "custom.preferences.write",
			}).
			WithAuthorizer(featureGateAccessorAuthorizer{
				"custom.preferences.read": true,
			}).
			WithUIRouteMode(PanelUIRouteModeCustom),
		true,
	)
	if err != nil || panel == nil {
		t.Fatalf("replace preferences panel: %v", err)
	}

	got := adm.PreferencesAPICapabilities(context.Background())
	if !got.Available || !got.Readable || got.Writable {
		t.Fatalf("expected custom panel guard to yield read-only capability, got %+v", got)
	}

	adm.WithAuthorizer(featureGateAccessorAuthorizer{
		PermAdminPreferencesView: true,
		PermAdminPreferencesEdit: true,
	})
	got = adm.PreferencesAPICapabilities(context.Background())
	if !got.Available || !got.Readable || got.Writable {
		t.Fatalf("expected explicit panel authorizer to remain authoritative, got %+v", got)
	}
}

func TestWithAuthorizerUpdatesInheritedPanelAuthorization(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeaturePreferences),
	})
	adm.WithAuthorizer(featureGateAccessorAuthorizer{
		PermAdminPreferencesView: true,
		PermAdminPreferencesEdit: true,
	})
	if err := adm.Initialize(router.NewHTTPServer().Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	initial := adm.PreferencesAPICapabilities(context.Background())
	if !initial.Readable || !initial.Writable {
		t.Fatalf("expected initial inherited authorization, got %+v", initial)
	}

	adm.WithAuthorizer(featureGateAccessorAuthorizer{})
	updated := adm.PreferencesAPICapabilities(context.Background())
	if updated.Readable || updated.Writable {
		t.Fatalf("expected replacement authorizer to update inherited panel guard, got %+v", updated)
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
