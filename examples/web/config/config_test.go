package config

import "testing"

func TestDefaultsEnableFullTranslationProfileForReleaseQA(t *testing.T) {
	cfg := Defaults()
	if cfg.Translation.Profile != "full" {
		t.Fatalf("expected default translation profile full, got %q", cfg.Translation.Profile)
	}
}
