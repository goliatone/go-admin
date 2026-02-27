package quickstart

import "testing"

func TestSiteLocaleURL(t *testing.T) {
	switcher := map[string]any{
		"items": []map[string]any{
			{"locale": "en", "url": "/welcome", "active": true},
			{"locale": "es", "url": "/es/welcome", "active": false},
		},
	}

	if got := siteLocaleURL(switcher, "es"); got != "/es/welcome" {
		t.Fatalf("expected locale url /es/welcome, got %q", got)
	}
	if got := siteLocaleURL(switcher, ""); got != "/welcome" {
		t.Fatalf("expected active locale url /welcome, got %q", got)
	}
}

func TestSitePreviewState(t *testing.T) {
	preview := map[string]any{
		"enabled":       true,
		"is_preview":    true,
		"token_present": true,
		"token_valid":   true,
	}
	state := sitePreviewState(preview)
	if !siteAnyBool(state["active"]) {
		t.Fatalf("expected preview state active=true, got %+v", state)
	}
	if got := siteAnyString(state["status"]); got != "preview" {
		t.Fatalf("expected preview status=preview, got %q", got)
	}

	invalid := map[string]any{
		"enabled":       true,
		"is_preview":    false,
		"token_present": true,
		"token_valid":   false,
	}
	invalidState := sitePreviewState(invalid)
	if got := siteAnyString(invalidState["status"]); got != "invalid" {
		t.Fatalf("expected invalid preview status, got %q", got)
	}
}

func TestSiteMenuHelpers(t *testing.T) {
	menu := map[string]any{
		"items": []map[string]any{
			{
				"label":         "Docs",
				"active":        false,
				"active_ancestor": true,
				"children": []map[string]any{
					{"label": "API", "active": true},
				},
			},
		},
	}

	items := siteMenuItems(menu)
	if len(items) != 1 {
		t.Fatalf("expected one menu item, got %+v", items)
	}
	children := siteMenuChildren(items[0])
	if len(children) != 1 {
		t.Fatalf("expected one child item, got %+v", children)
	}
	if !siteMenuHasActive(menu) {
		t.Fatalf("expected menu active state to be detected")
	}
}

func TestDefaultTemplateFuncsExposeSiteHelpers(t *testing.T) {
	funcs := DefaultTemplateFuncs()
	required := []string{
		"siteLocaleItems",
		"siteLocaleItem",
		"siteLocaleURL",
		"sitePreviewState",
		"sitePreviewActive",
		"siteMenuItems",
		"siteMenuChildren",
		"siteMenuHasActive",
	}
	for _, key := range required {
		if _, ok := funcs[key]; !ok {
			t.Fatalf("expected template helper %q to be registered", key)
		}
	}
}
