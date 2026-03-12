package admin

import "testing"

func TestBootTranslationFamiliesDisabledWhenFeatureOff(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	if binding := adm.BootTranslationFamilies(); binding != nil {
		t.Fatalf("expected nil family binding when feature is disabled")
	}
}

func TestBootTranslationFamiliesEnabledWhenFeatureOn(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	if binding := adm.BootTranslationFamilies(); binding == nil {
		t.Fatalf("expected family binding when feature is enabled")
	}
}
