package setup

import (
	"strings"
	"testing"
)

func TestLocalizedSiteMenuSeedItemsUseCanonicalIDsAndLocalizedTranslations(t *testing.T) {
	items := localizedSiteMenuSeedItems("en", []string{"en", "es", "fr"})
	if len(items) == 0 {
		t.Fatalf("expected localized menu seed items")
	}

	var aboutFound bool
	for _, item := range items {
		id := strings.TrimSpace(item.Item.ID)
		if id == "" {
			t.Fatalf("expected non-empty canonical ID")
		}
		if strings.HasSuffix(id, ".en") || strings.HasSuffix(id, ".es") || strings.HasSuffix(id, ".fr") {
			t.Fatalf("expected stable canonical menu ID without locale suffix, got %q", id)
		}
		if id == "about" {
			aboutFound = true
			var esLabel string
			var esURL string
			for _, tr := range item.Translations {
				if strings.EqualFold(strings.TrimSpace(tr.Locale), "es") {
					esLabel = strings.TrimSpace(tr.Label)
					esURL = strings.TrimSpace(tr.URLOverride)
				}
			}
			if esLabel != "Sobre Nosotros" {
				t.Fatalf("expected es translation label Sobre Nosotros, got %q", esLabel)
			}
			if esURL != "/sobre-nosotros" {
				t.Fatalf("expected es URL override /sobre-nosotros, got %q", esURL)
			}
		}
	}

	if !aboutFound {
		t.Fatalf("expected canonical about item in localized site menu seeds")
	}
}
