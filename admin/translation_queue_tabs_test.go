package admin

import "testing"

func TestRegisterTranslationQueueTabsRegistersPagesAndPostsTabs(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	if err := RegisterTranslationQueueTabs(adm); err != nil {
		t.Fatalf("register queue tabs: %v", err)
	}

	for _, panelName := range []string{"pages", "posts"} {
		tabs := adm.registry.PanelTabs(panelName)
		if len(tabs) != 1 {
			t.Fatalf("expected one queue tab for %s, got %d", panelName, len(tabs))
		}
		tab := tabs[0]
		if tab.Target.Type != "panel" || tab.Target.Panel != translationQueuePanelID {
			t.Fatalf("unexpected tab target for %s: %+v", panelName, tab.Target)
		}
		if tab.Permission != PermAdminTranslationsView {
			t.Fatalf("expected translation view permission for %s tab, got %q", panelName, tab.Permission)
		}
		if tab.Filters["translation_group_id"] != "{{record.translation_group_id}}" {
			t.Fatalf("expected translation_group_id filter placeholder for %s, got %+v", panelName, tab.Filters)
		}
		if tab.Query["entity_type"] != "{{panel.name}}" {
			t.Fatalf("expected entity_type query placeholder for %s, got %+v", panelName, tab.Query)
		}
	}
}

func TestRegisterTranslationQueueTabsRequiresAdmin(t *testing.T) {
	if err := RegisterTranslationQueueTabs(nil); err == nil {
		t.Fatalf("expected error for nil admin")
	}
}
