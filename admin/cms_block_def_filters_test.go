package admin

import "testing"

func TestBlockDefinitionTypePrefersSlug(t *testing.T) {
	def := CMSBlockDefinition{
		Slug: "hero-section",
		Type: "legacy-hero",
	}
	if got := blockDefinitionType(def); got != "hero-section" {
		t.Fatalf("expected slug to win, got %q", got)
	}
}

func TestBlockDefinitionTypeFallsBackToType(t *testing.T) {
	def := CMSBlockDefinition{
		Type: "hero",
	}
	if got := blockDefinitionType(def); got != "hero" {
		t.Fatalf("expected type fallback, got %q", got)
	}
}
