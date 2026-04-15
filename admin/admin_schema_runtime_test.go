package admin

import (
	"context"
	"testing"
)

func TestAdminDecorateSchemaAppliesFeatureMetadataAndMediaHints(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureExport, FeatureBulk, FeatureMedia, FeatureCMS, FeatureCommands, FeatureJobs),
	})

	schema := &Schema{
		FormFields: []Field{
			{Name: "asset", Label: "Asset", Type: "media-picker"},
			{Name: "gallery", Label: "Gallery", Type: "media-gallery"},
		},
		FormSchema: map[string]any{
			"properties": map[string]any{
				"asset": map[string]any{
					"type": "string",
				},
				"gallery": map[string]any{
					"type": "array",
				},
			},
		},
	}

	adm.decorateSchema(schema, "items")

	if schema.Export == nil || schema.Export.Definition != "items" || schema.Export.Endpoint == "" {
		t.Fatalf("expected export metadata, got %+v", schema.Export)
	}
	if schema.Bulk == nil || schema.Bulk.Endpoint == "" {
		t.Fatalf("expected bulk metadata, got %+v", schema.Bulk)
	}
	if schema.Media == nil || schema.Media.LibraryPath == "" {
		t.Fatalf("expected media metadata, got %+v", schema.Media)
	}
	if schema.Media.ItemPath == "" || schema.Media.ResolvePath == "" || schema.Media.UploadPath == "" || schema.Media.PresignPath == "" || schema.Media.ConfirmPath == "" || schema.Media.CapabilitiesPath == "" {
		t.Fatalf("expected expanded media endpoints, got %+v", schema.Media)
	}
	if schema.Media.DefaultValueMode != MediaValueModeURL {
		t.Fatalf("expected default media value mode %q, got %q", MediaValueModeURL, schema.Media.DefaultValueMode)
	}

	props, _ := schema.FormSchema["properties"].(map[string]any)
	asset, _ := props["asset"].(map[string]any)
	adminMeta, _ := asset["x-admin"].(map[string]any)
	if got := adminMeta["media_library_path"]; got != schema.Media.LibraryPath {
		t.Fatalf("expected media hint path %q, got %v", schema.Media.LibraryPath, got)
	}
	if got := asset["x-formgen:widget"]; got != "media-picker" {
		t.Fatalf("expected media picker widget hint, got %v", got)
	}
	formgenMeta, _ := asset["x-formgen"].(map[string]any)
	componentOptions, _ := formgenMeta["componentOptions"].(map[string]any)
	if got := componentOptions["valueMode"]; got != string(MediaValueModeURL) {
		t.Fatalf("expected default media picker valueMode=url, got %v", got)
	}
	if got := componentOptions["itemEndpoint"]; got != schema.Media.ItemPath {
		t.Fatalf("expected media item endpoint %q, got %v", schema.Media.ItemPath, got)
	}
	adminMedia, _ := adminMeta["media"].(map[string]any)
	if got := adminMedia["capabilitiesPath"]; got != schema.Media.CapabilitiesPath {
		t.Fatalf("expected nested media capabilities path %q, got %v", schema.Media.CapabilitiesPath, got)
	}

	gallery, _ := props["gallery"].(map[string]any)
	if got := gallery["x-formgen:widget"]; got != "media-picker" {
		t.Fatalf("expected gallery media widget hint, got %v", got)
	}
	galleryFormgen, _ := gallery["x-formgen"].(map[string]any)
	galleryComponentOptions, _ := galleryFormgen["componentOptions"].(map[string]any)
	if got := galleryComponentOptions["multiple"]; got != true {
		t.Fatalf("expected gallery multiple=true, got %v", got)
	}
}

func TestAdminDecorateSchemaHonorsExplicitMediaValueModeWhenSupported(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureMedia),
	})

	schema := &Schema{
		FormFields: []Field{{Name: "asset", Label: "Asset", Type: "media"}},
		FormSchema: map[string]any{
			"properties": map[string]any{
				"asset": map[string]any{
					"type": "string",
					"x-formgen": map[string]any{
						"componentOptions": map[string]any{
							"valueMode": "id",
						},
					},
				},
			},
		},
	}

	adm.decorateSchema(schema, "items")

	props, _ := schema.FormSchema["properties"].(map[string]any)
	asset, _ := props["asset"].(map[string]any)
	formgenMeta, _ := asset["x-formgen"].(map[string]any)
	componentOptions, _ := formgenMeta["componentOptions"].(map[string]any)
	if got := componentOptions["valueMode"]; got != string(MediaValueModeID) {
		t.Fatalf("expected explicit media picker valueMode=id, got %v", got)
	}
}

func TestAdminDecorateSchemaForInjectsTabsAndTranslatesLabels(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	adm.WithAuthorizer(allowAll{})
	if err := adm.RegisterPanelTab("items", PanelTab{
		ID:       "activity",
		Label:    "Activity",
		LabelKey: "tabs.activity",
		Target:   PanelTabTarget{Type: "panel", Panel: "activity"},
	}); err != nil {
		t.Fatalf("register panel tab: %v", err)
	}

	schema := &Schema{
		ListFields: []Field{{
			Name:     "title",
			Label:    "Title",
			LabelKey: "fields.title",
			Options: []Option{{
				Value:    "draft",
				Label:    "Draft",
				LabelKey: "options.draft",
			}},
		}},
		Actions: []Action{{
			Name:     "edit",
			Label:    "Edit",
			LabelKey: "actions.edit",
		}},
	}

	err := adm.decorateSchemaFor(AdminContext{
		Context:    context.Background(),
		Locale:     "fr",
		Translator: captureTranslator{},
	}, schema, "items")
	if err != nil {
		t.Fatalf("decorate schema: %v", err)
	}

	if len(schema.Tabs) != 1 {
		t.Fatalf("expected one resolved tab, got %+v", schema.Tabs)
	}
	if got := schema.Tabs[0].Label; got != "tabs.activity:fr" {
		t.Fatalf("expected translated tab label, got %q", got)
	}
	if got := schema.ListFields[0].Label; got != "fields.title:fr" {
		t.Fatalf("expected translated field label, got %q", got)
	}
	if got := schema.ListFields[0].Options[0].Label; got != "options.draft:fr" {
		t.Fatalf("expected translated option label, got %q", got)
	}
	if got := schema.Actions[0].Label; got != "actions.edit:fr" {
		t.Fatalf("expected translated action label, got %q", got)
	}
}
