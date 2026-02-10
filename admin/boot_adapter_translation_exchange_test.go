package admin

import "testing"

func TestBootTranslationExchangeDisabledWhenFeatureOff(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	if binding := adm.BootTranslationExchange(); binding != nil {
		t.Fatalf("expected nil exchange binding when feature is disabled")
	}
}

func TestBootTranslationExchangeEnabledWhenFeatureOn(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureTranslationExchange),
	})
	if binding := adm.BootTranslationExchange(); binding == nil {
		t.Fatalf("expected exchange binding when feature is enabled")
	}
}
