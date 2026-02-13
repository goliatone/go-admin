package setup

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
)

type translationActionRepoStub struct{}

func (translationActionRepoStub) Seed() {}

func (translationActionRepoStub) WithActivitySink(admin.ActivitySink) {}

func (translationActionRepoStub) List(context.Context, admin.ListOptions) ([]map[string]any, int, error) {
	return nil, 0, nil
}

func (translationActionRepoStub) Get(context.Context, string) (map[string]any, error) {
	return nil, nil
}

func (translationActionRepoStub) Create(context.Context, map[string]any) (map[string]any, error) {
	return map[string]any{"id": "1"}, nil
}

func (translationActionRepoStub) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return map[string]any{"id": "1"}, nil
}

func (translationActionRepoStub) Delete(context.Context, string) error {
	return nil
}

func (translationActionRepoStub) Publish(context.Context, []string) ([]map[string]any, error) {
	return nil, nil
}

func (translationActionRepoStub) Unpublish(context.Context, []string) ([]map[string]any, error) {
	return nil, nil
}

func (translationActionRepoStub) Schedule(context.Context, []string, time.Time) ([]map[string]any, error) {
	return nil, nil
}

func (translationActionRepoStub) Archive(context.Context, []string) ([]map[string]any, error) {
	return nil, nil
}

var _ stores.PageRepository = translationActionRepoStub{}
var _ stores.PostRepository = translationActionRepoStub{}

func TestPagesAndPostsPanelsExposeCreateTranslationPayloadContract(t *testing.T) {
	repo := translationActionRepoStub{}
	cases := []struct {
		name    string
		builder *admin.PanelBuilder
	}{
		{name: "pages", builder: NewPagesPanelBuilder(repo)},
		{name: "posts", builder: NewPostsPanelBuilder(repo)},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			panel, err := tc.builder.Build()
			if err != nil {
				t.Fatalf("build panel: %v", err)
			}
			action, ok := findAction(panel.Schema().Actions, "create_translation")
			if !ok {
				t.Fatalf("expected create_translation action")
			}
			if len(action.PayloadRequired) != 1 || action.PayloadRequired[0] != "locale" {
				t.Fatalf("expected payload_required [locale], got %+v", action.PayloadRequired)
			}
			if action.PayloadSchema["type"] != "object" {
				t.Fatalf("expected payload_schema.type object, got %+v", action.PayloadSchema["type"])
			}
			required, ok := action.PayloadSchema["required"].([]string)
			if !ok || len(required) != 1 || required[0] != "locale" {
				t.Fatalf("expected payload_schema.required [locale], got %+v", action.PayloadSchema["required"])
			}
			additional, ok := action.PayloadSchema["additionalProperties"].(bool)
			if !ok || additional {
				t.Fatalf("expected payload_schema.additionalProperties=false, got %+v", action.PayloadSchema["additionalProperties"])
			}

			properties, ok := action.PayloadSchema["properties"].(map[string]any)
			if !ok {
				t.Fatalf("expected payload_schema.properties, got %+v", action.PayloadSchema)
			}
			localeSchema, ok := properties["locale"].(map[string]any)
			if !ok {
				t.Fatalf("expected locale schema, got %+v", properties["locale"])
			}
			enum, ok := localeSchema["enum"].([]string)
			if !ok || len(enum) != 3 {
				t.Fatalf("expected locale enum [en es fr], got %+v", localeSchema["enum"])
			}
			if enum[0] != "en" || enum[1] != "es" || enum[2] != "fr" {
				t.Fatalf("unexpected locale enum ordering/value: %+v", enum)
			}
			options, ok := localeSchema["x-options"].([]map[string]any)
			if !ok || len(options) != 3 {
				t.Fatalf("expected locale x-options, got %+v", localeSchema["x-options"])
			}
		})
	}
}

func TestPagesAndPostsPanelsExposeTranslationWorkflowActions(t *testing.T) {
	repo := translationActionRepoStub{}
	cases := []struct {
		name            string
		builder         *admin.PanelBuilder
		requiredActions []string
	}{
		{
			name:            "pages",
			builder:         NewPagesPanelBuilder(repo),
			requiredActions: []string{"view", "edit", "delete", "create_translation", "request_approval", "approve", "reject", "publish", "unpublish"},
		},
		{
			name:            "posts",
			builder:         NewPostsPanelBuilder(repo),
			requiredActions: []string{"view", "edit", "delete", "create_translation", "request_approval", "approve", "reject", "publish", "unpublish", "schedule"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			panel, err := tc.builder.Build()
			if err != nil {
				t.Fatalf("build panel: %v", err)
			}

			byName := map[string]admin.Action{}
			for _, action := range panel.Schema().Actions {
				byName[action.Name] = action
			}
			for _, name := range tc.requiredActions {
				action, ok := byName[name]
				if !ok {
					t.Fatalf("expected %q action in schema.actions", name)
				}
				if strings.TrimSpace(action.Label) == "" {
					t.Fatalf("expected %q action label to be non-empty", name)
				}
			}

			publish := byName["publish"]
			if strings.TrimSpace(publish.CommandName) == "" {
				t.Fatalf("expected publish action command_name")
			}
			unpublish := byName["unpublish"]
			if strings.TrimSpace(unpublish.CommandName) == "" {
				t.Fatalf("expected unpublish action command_name")
			}
			if tc.name == "posts" {
				schedule := byName["schedule"]
				if strings.TrimSpace(schedule.CommandName) == "" {
					t.Fatalf("expected schedule action command_name")
				}
			}
		})
	}
}

func TestPagesAndPostsPanelsExposeTranslationAwareListFields(t *testing.T) {
	repo := translationActionRepoStub{}
	cases := []struct {
		name           string
		builder        *admin.PanelBuilder
		requiredFields []string
	}{
		{
			name:    "pages",
			builder: NewPagesPanelBuilder(repo),
			requiredFields: []string{
				"locale",
				"translation_status",
				"available_locales",
				"translation_readiness",
				"missing_translations",
			},
		},
		{
			name:    "posts",
			builder: NewPostsPanelBuilder(repo),
			requiredFields: []string{
				"locale",
				"translation_status",
				"available_locales",
				"translation_readiness",
				"missing_translations",
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			panel, err := tc.builder.Build()
			if err != nil {
				t.Fatalf("build panel: %v", err)
			}

			byName := map[string]admin.Field{}
			for _, field := range panel.Schema().ListFields {
				byName[field.Name] = field
			}

			for _, name := range tc.requiredFields {
				field, ok := byName[name]
				if !ok {
					t.Fatalf("expected %q in list fields", name)
				}
				if strings.TrimSpace(field.Label) == "" {
					t.Fatalf("expected %q label to be non-empty", name)
				}
			}
		})
	}
}

func findAction(actions []admin.Action, name string) (admin.Action, bool) {
	for _, action := range actions {
		if action.Name == name {
			return action, true
		}
	}
	return admin.Action{}, false
}
