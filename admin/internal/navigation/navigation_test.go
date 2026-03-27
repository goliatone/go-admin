package navigation

import (
	"context"
	"testing"
)

type translatorStub struct{}

func (translatorStub) Translate(locale, key string, args ...any) (string, error) {
	return key + ":" + locale, nil
}

type allowAllAuthorizer struct{}

func (allowAllAuthorizer) Can(_ context.Context, _, _ string) bool { return true }

func TestNavigationFallbackFiltersSeparatorsAndEmptyNodes(t *testing.T) {
	nav := NewNavigation(nil, allowAllAuthorizer{})
	nav.SetTranslator(translatorStub{})
	nav.AddFallback(
		NavigationItem{Type: MenuItemTypeSeparator, Label: "---", Locale: "en", Position: new(0)},
		NavigationItem{Type: MenuItemTypeItem, Label: "A", Locale: "en", Position: new(1)},
		NavigationItem{Type: MenuItemTypeSeparator, Label: "---", Locale: "en", Position: new(2)},
		NavigationItem{Type: MenuItemTypeSeparator, Label: "---", Locale: "en", Position: new(2)},
		NavigationItem{Type: MenuItemTypeItem, Label: "B", Locale: "en", Position: new(3)},
		NavigationItem{Type: MenuItemTypeSeparator, Label: "---", Locale: "en", Position: new(4)},
		NavigationItem{Type: MenuItemTypeGroup, Label: "Empty Group", Locale: "en", Position: new(10)},
		NavigationItem{Type: MenuItemTypeItem, Label: "Collapsible Empty", Collapsible: true, Locale: "en", Position: new(11)},
	)

	items := nav.Resolve(context.Background(), "en")
	if len(items) != 3 {
		t.Fatalf("expected 3 items after filtering, got %+v", items)
	}
	if items[0].Label != "A" {
		t.Fatalf("expected first item A, got %q", items[0].Label)
	}
	if items[1].Type != MenuItemTypeSeparator {
		t.Fatalf("expected middle separator, got %+v", items[1])
	}
	if items[2].Label != "B" {
		t.Fatalf("expected last item B, got %q", items[2].Label)
	}
}

func TestConvertMenuItemsTranslatesLabelAndGroupTitle(t *testing.T) {
	items := ConvertMenuItems([]MenuItem{
		{ID: "one", Label: "Raw", LabelKey: "nav.one", Locale: "en"},
	}, translatorStub{}, "en")
	if len(items) != 1 {
		t.Fatalf("expected one item, got %+v", items)
	}
	if items[0].Label != "nav.one:en" {
		t.Fatalf("expected label translation, got %q", items[0].Label)
	}
	if items[0].GroupTitle != "nav.one:en" {
		t.Fatalf("expected group title translation, got %q", items[0].GroupTitle)
	}
}

func TestNavigationFailsClosedWithoutAuthorizerForPermissionedItems(t *testing.T) {
	nav := NewNavigation(nil, nil)
	nav.AddFallback(
		NavigationItem{ID: "public", Label: "Public", Locale: "en"},
		NavigationItem{ID: "protected", Label: "Protected", Locale: "en", Permissions: []string{"admin.settings.view"}},
	)

	items := nav.Resolve(context.Background(), "en")
	if len(items) != 1 {
		t.Fatalf("expected only unprotected item without authorizer, got %+v", items)
	}
	if items[0].ID != "public" {
		t.Fatalf("expected public item to remain visible, got %+v", items[0])
	}
}
