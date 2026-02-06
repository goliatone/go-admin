package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestGroupSettingsProvidesTemplateKeys(t *testing.T) {
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
	if group["label"] == "" || group["Label"] == "" {
		t.Fatalf("expected group label to be populated: %#v", group)
	}

	itemsAny, ok := group["items"]
	if !ok {
		t.Fatalf("expected group items")
	}
	items, ok := itemsAny.([]map[string]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected 1 item, got %#v", itemsAny)
	}
	item := items[0]
	if item["title"] == "" || item["Title"] == "" {
		t.Fatalf("expected item title to be populated: %#v", item)
	}
	if item["key"] == "" || item["Key"] == "" {
		t.Fatalf("expected item key to be populated: %#v", item)
	}
	if item["value"] == "" || item["Value"] == "" {
		t.Fatalf("expected item value to be populated: %#v", item)
	}
	if item["scope"] == "" || item["Scope"] == "" {
		t.Fatalf("expected item scope to be populated: %#v", item)
	}
	if item["provenance"] == "" || item["Provenance"] == "" {
		t.Fatalf("expected item provenance to be populated: %#v", item)
	}
}
