package quickstart

import (
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestRegisterSettingsUIRoutesEnforcesEffectiveDefaultPermission(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	cfg.SettingsPermission = ""
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	r := newCaptureRouter()
	if err := RegisterSettingsUIRoutes(r, cfg, adm, nil); err != nil {
		t.Fatalf("RegisterSettingsUIRoutes: %v", err)
	}
	handler := r.getHandlers["/admin/settings"]
	if handler == nil {
		t.Fatal("expected settings GET handler")
	}
	if err := handler(nil); !errors.Is(err, admin.ErrForbidden) {
		t.Fatalf("expected blank caller config to enforce default permission, got %v", err)
	}
}

func TestGroupSettingsProducesTypedViewModel(t *testing.T) {
	values := map[string]admin.ResolvedSetting{
		"site.name": {
			Key:        "site.name",
			Value:      "My Site",
			Scope:      admin.SettingsScopeSystem,
			Provenance: "default",
			Definition: admin.SettingDefinition{
				Title:       "Site Name",
				Description: "Your website name",
				Group:       "general",
			},
		},
	}

	groups := groupSettings(values)
	if len(groups) != 1 {
		t.Fatalf("expected 1 group, got %d", len(groups))
	}
	group := groups[0]
	if group.Label == "" {
		t.Fatalf("expected group label to be populated: %#v", group)
	}
	if len(group.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(group.Items))
	}
	item := group.Items[0]
	if item.Title == "" {
		t.Fatalf("expected item title to be populated: %#v", item)
	}
	if item.Key == "" {
		t.Fatalf("expected item key to be populated: %#v", item)
	}
	if item.Value == "" {
		t.Fatalf("expected item value to be populated: %#v", item)
	}
	if item.Scope == "" {
		t.Fatalf("expected item scope to be populated: %#v", item)
	}
	if item.Provenance == "" {
		t.Fatalf("expected item provenance to be populated: %#v", item)
	}
}

func TestSettingsGroupsTemplateValueUsesSnakeCaseKeys(t *testing.T) {
	values := map[string]admin.ResolvedSetting{
		"site.name": {
			Key:        "site.name",
			Value:      "My Site",
			Scope:      admin.SettingsScopeSystem,
			Provenance: "default",
			Definition: admin.SettingDefinition{
				Title:       "Site Name",
				Description: "Your website name",
				Group:       "general",
			},
		},
	}

	groups := groupSettings(values)
	viewValue, err := settingsGroupsTemplateValue(groups)
	if err != nil {
		t.Fatalf("expected serialization to succeed, got %v", err)
	}

	groupList, ok := viewValue.([]any)
	if !ok || len(groupList) != 1 {
		t.Fatalf("expected serialized groups list, got %#v", viewValue)
	}
	group, ok := groupList[0].(map[string]any)
	if !ok {
		t.Fatalf("expected serialized group map, got %#v", groupList[0])
	}
	if group["label"] == "" {
		t.Fatalf("expected snake_case label key, got %#v", group)
	}
	if _, exists := group["Label"]; exists {
		t.Fatalf("did not expect PascalCase Label key, got %#v", group)
	}

	itemsAny, ok := group["items"].([]any)
	if !ok || len(itemsAny) != 1 {
		t.Fatalf("expected serialized items list, got %#v", group["items"])
	}
	item, ok := itemsAny[0].(map[string]any)
	if !ok {
		t.Fatalf("expected serialized item map, got %#v", itemsAny[0])
	}
	if item["title"] == "" || item["key"] == "" || item["value"] == "" {
		t.Fatalf("expected snake_case item keys, got %#v", item)
	}
	if _, exists := item["Title"]; exists {
		t.Fatalf("did not expect PascalCase Title key, got %#v", item)
	}
}
