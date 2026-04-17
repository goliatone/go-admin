package admin

import "testing"

type menuLocalizationTranslatorStub struct {
	values map[string]string
}

func (s menuLocalizationTranslatorStub) Translate(locale, key string, args ...any) (string, error) {
	if s.values == nil {
		return key, nil
	}
	if value, ok := s.values[locale+":"+key]; ok {
		return value, nil
	}
	return key, nil
}

func TestLocalizeMenuTranslatesLabelsAndPreservesKeys(t *testing.T) {
	menu := &Menu{
		Code: "site.primary",
		Items: []MenuItem{
			{ID: "home", LabelKey: "menu.home"},
			{ID: "group", Label: "Section", GroupTitleKey: "menu.group"},
		},
	}

	localized := LocalizeMenu(menu, menuLocalizationTranslatorStub{
		values: map[string]string{
			"es:menu.home":  "Inicio",
			"es:menu.group": "Seccion",
		},
	}, "es")

	if localized == nil || len(localized.Items) != 2 {
		t.Fatalf("expected localized menu items, got %+v", localized)
	}
	if got := localized.Items[0].Label; got != "Inicio" {
		t.Fatalf("expected translated home label, got %q", got)
	}
	if got := localized.Items[0].LabelKey; got != "menu.home" {
		t.Fatalf("expected label key to be preserved, got %q", got)
	}
	if got := localized.Items[1].GroupTitle; got != "Seccion" {
		t.Fatalf("expected translated group title, got %q", got)
	}
}

func TestLocalizeMenuWithoutTranslatorDoesNotLeakRawKeys(t *testing.T) {
	menu := &Menu{
		Code: "site.primary",
		Items: []MenuItem{
			{ID: "home", LabelKey: "menu.home"},
			{ID: "about", Label: "About", LabelKey: "menu.about"},
		},
	}

	localized := LocalizeMenu(menu, nil, "en")
	if localized == nil || len(localized.Items) != 2 {
		t.Fatalf("expected localized menu clone, got %+v", localized)
	}
	if got := localized.Items[0].Label; got != "" {
		t.Fatalf("expected key-only label to stay empty without translator, got %q", got)
	}
	if got := localized.Items[1].Label; got != "About" {
		t.Fatalf("expected literal label to remain unchanged, got %q", got)
	}
}
