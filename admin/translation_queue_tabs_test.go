package admin

import "testing"

func TestRegisterTranslationQueueTabsRegistersTranslationCapablePanelTabs(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	registerPanel := func(name string, actions ...Action) {
		t.Helper()
		builder := (&PanelBuilder{}).
			WithRepository(NewMemoryRepository()).
			Actions(actions...)
		if _, err := adm.RegisterPanel(name, builder); err != nil {
			t.Fatalf("register panel %s: %v", name, err)
		}
	}
	registerPanel("articles", Action{Name: CreateTranslationKey, CommandName: "articles.create_translation"})
	registerPanel("catalog", Action{Name: "publish", CommandName: "catalog.publish"})
	if _, err := adm.RegisterPanel(translationQueuePanelID, (&PanelBuilder{}).WithRepository(NewMemoryRepository())); err != nil {
		t.Fatalf("register queue panel: %v", err)
	}

	if err := RegisterTranslationQueueTabs(adm); err != nil {
		t.Fatalf("register queue tabs: %v", err)
	}

	tabs := adm.registry.PanelTabs("articles")
	if len(tabs) != 1 {
		t.Fatalf("expected one queue tab for articles, got %d", len(tabs))
	}
	tab := tabs[0]
	if tab.Target.Type != "panel" || tab.Target.Panel != translationQueuePanelID {
		t.Fatalf("unexpected tab target for articles: %+v", tab.Target)
	}
	if tab.Permission != PermAdminTranslationsView {
		t.Fatalf("expected translation view permission for articles tab, got %q", tab.Permission)
	}
	if tab.Filters["translation_group_id"] != "{{record.translation_group_id}}" {
		t.Fatalf("expected translation_group_id filter placeholder for articles, got %+v", tab.Filters)
	}
	if tab.Query["entity_type"] != "{{panel.name}}" {
		t.Fatalf("expected entity_type query placeholder for articles, got %+v", tab.Query)
	}
	if got := len(adm.registry.PanelTabs("catalog")); got != 0 {
		t.Fatalf("expected no queue tabs for non-translation panel, got %d", got)
	}
}

func TestRegisterTranslationQueueTabsRequiresAdmin(t *testing.T) {
	if err := RegisterTranslationQueueTabs(nil); err == nil {
		t.Fatalf("expected error for nil admin")
	}
}
