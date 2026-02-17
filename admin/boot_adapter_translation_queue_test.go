package admin

import "testing"

func TestBootTranslationQueueDisabledWhenFeatureOff(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	if binding := adm.BootTranslationQueue(); binding != nil {
		t.Fatalf("expected nil queue binding when feature is disabled")
	}
}

func TestBootTranslationQueueEnabledWhenFeatureOn(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureTranslationQueue),
	})
	if binding := adm.BootTranslationQueue(); binding == nil {
		t.Fatalf("expected queue binding when feature is enabled")
	}
}
