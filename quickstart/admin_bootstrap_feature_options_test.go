package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestWithFeatureDefaultsMergesAgainstQuickstartDefaults(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureCMS): false,
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}

	if !featureEnabled(adm.FeatureGate(), string(admin.FeatureDashboard)) {
		t.Fatalf("expected dashboard to remain enabled when using feature overrides")
	}
	if featureEnabled(adm.FeatureGate(), string(admin.FeatureCMS)) {
		t.Fatalf("expected cms to be disabled by override")
	}
}

func TestWithFeatureSetReplacesQuickstartDefaults(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureSet(map[string]bool{
			string(admin.FeatureDashboard): true,
			string(admin.FeatureSearch):    true,
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}

	if !featureEnabled(adm.FeatureGate(), string(admin.FeatureDashboard)) {
		t.Fatalf("expected dashboard enabled")
	}
	if !featureEnabled(adm.FeatureGate(), string(admin.FeatureSearch)) {
		t.Fatalf("expected search enabled")
	}
	if featureEnabled(adm.FeatureGate(), string(admin.FeatureCMS)) {
		t.Fatalf("expected cms disabled when feature set replaces defaults")
	}
	if featureEnabled(adm.FeatureGate(), string(admin.FeatureBulk)) {
		t.Fatalf("expected bulk disabled when feature set replaces defaults")
	}
}

func TestWithMinimalFeaturesUsesMinimalBaseSet(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithMinimalFeatures(),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}

	if !featureEnabled(adm.FeatureGate(), string(admin.FeatureDashboard)) {
		t.Fatalf("expected dashboard enabled")
	}
	if !featureEnabled(adm.FeatureGate(), string(admin.FeatureCMS)) {
		t.Fatalf("expected cms enabled")
	}
	if featureEnabled(adm.FeatureGate(), string(admin.FeatureSearch)) {
		t.Fatalf("expected search disabled in minimal feature set")
	}
}
