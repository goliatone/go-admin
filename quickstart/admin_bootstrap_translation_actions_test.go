package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNewAdminConfiguresCreateTranslationActionLocalesFromPolicy(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Test", "en")
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationPolicyConfig(DefaultContentTranslationPolicyConfig()),
	)
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	if adm == nil {
		t.Fatal("expected admin instance")
	}

	workflow := admin.NewSimpleWorkflowEngine()
	admin.RegisterDefaultCMSWorkflows(workflow)
	workflow.RegisterWorkflow("posts", admin.WorkflowDefinition{
		EntityType:   "posts",
		InitialState: "draft",
		Transitions: []admin.WorkflowTransition{
			{Name: "submit_for_approval", From: "draft", To: "approval"},
			{Name: "publish", From: "approval", To: "published"},
		},
	})
	adm.WithWorkflow(workflow)

	factory := admin.NewDynamicPanelFactory(adm)
	panel, err := factory.CreatePanelFromContentType(context.Background(), &admin.CMSContentType{
		ID:     "ct-post",
		Name:   "Post",
		Slug:   "post",
		Status: "active",
		Schema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"title": map[string]any{"type": "string"},
			},
		},
		Capabilities: map[string]any{
			"panel_slug":   "posts",
			"workflow":     "posts",
			"panel_traits": []any{"editorial"},
			"translations": true,
		},
	})
	if err != nil {
		t.Fatalf("create panel from content type: %v", err)
	}

	action, ok := findSchemaAction(panel.Schema().Actions, admin.CreateTranslationKey)
	if !ok {
		t.Fatalf("expected %s action", admin.CreateTranslationKey)
	}
	if len(action.PayloadRequired) != 1 || action.PayloadRequired[0] != "locale" {
		t.Fatalf("expected payload required [locale], got %+v", action.PayloadRequired)
	}

	props, ok := action.PayloadSchema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("expected payload schema properties map, got %T", action.PayloadSchema["properties"])
	}
	localeSchema, ok := props["locale"].(map[string]any)
	if !ok {
		t.Fatalf("expected locale payload schema, got %T", props["locale"])
	}
	enumValues := anyToStringSlice(localeSchema["enum"])
	if len(enumValues) < 3 {
		t.Fatalf("expected locale enum values, got %+v", localeSchema["enum"])
	}
	if !containsString(enumValues, "en") || !containsString(enumValues, "es") || !containsString(enumValues, "fr") {
		t.Fatalf("expected locale enum to include en/es/fr, got %+v", enumValues)
	}
	options := anyToOptionValues(localeSchema["x-options"])
	if len(options) < 3 {
		t.Fatalf("expected x-options entries, got %+v", localeSchema["x-options"])
	}
	if !containsString(options, "en") || !containsString(options, "es") || !containsString(options, "fr") {
		t.Fatalf("expected x-options to include en/es/fr, got %+v", options)
	}
}

func findSchemaAction(actions []admin.Action, name string) (admin.Action, bool) {
	for _, action := range actions {
		if action.Name == name {
			return action, true
		}
	}
	return admin.Action{}, false
}

func anyToStringSlice(value any) []string {
	switch typed := value.(type) {
	case []string:
		return append([]string{}, typed...)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if str, ok := item.(string); ok && str != "" {
				out = append(out, str)
			}
		}
		return out
	default:
		return nil
	}
}

func anyToOptionValues(value any) []string {
	switch typed := value.(type) {
	case []map[string]any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if v, ok := item["value"].(string); ok && v != "" {
				out = append(out, v)
			}
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, raw := range typed {
			item, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			if v, ok := item["value"].(string); ok && v != "" {
				out = append(out, v)
			}
		}
		return out
	default:
		return nil
	}
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
