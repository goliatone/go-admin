package admin

import "testing"

func TestApplyMediaSchemaHintsDetectsPlainJSONSchemaMediaFields(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureMedia),
	})
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"flat": map[string]any{
				"type":             "string",
				"x-formgen:widget": "media-picker",
			},
			"nested": map[string]any{
				"type": "string",
				"x-formgen": map[string]any{
					"widget": "media-picker",
					"componentOptions": map[string]any{
						"valueMode": "id",
						"accept":    "image/*",
					},
				},
			},
			"gallery": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "string",
				},
				"x-formgen": map[string]any{
					"componentOptions": map[string]any{
						"variant":       "media-gallery",
						"acceptedKinds": []any{"image", "video"},
					},
				},
			},
			"adminMedia": map[string]any{
				"type": "string",
				"x-admin": map[string]any{
					"media": map[string]any{
						"valueMode": "url",
					},
				},
			},
			"nestedObject": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"hero": map[string]any{
						"type": "string",
						"x-formgen": map[string]any{
							"componentOptions": map[string]any{
								"variant": "media-picker",
							},
						},
					},
				},
			},
		},
	}

	if got := adm.ApplyMediaSchemaHints(schema); got != 5 {
		t.Fatalf("expected 5 enriched media fields, got %d", got)
	}
	props := schema["properties"].(map[string]any)
	for _, key := range []string{"flat", "nested", "gallery", "adminMedia"} {
		prop := props[key].(map[string]any)
		formgen := prop["x-formgen"].(map[string]any)
		opts := formgen["componentOptions"].(map[string]any)
		if opts["libraryPath"] == "" || opts["capabilitiesEndpoint"] == "" {
			t.Fatalf("expected %s to receive media endpoints, got %+v", key, opts)
		}
		adminMeta := prop["x-admin"].(map[string]any)
		mediaMeta := adminMeta["media"].(map[string]any)
		if mediaMeta["libraryPath"] == "" || mediaMeta["capabilitiesPath"] == "" {
			t.Fatalf("expected %s to receive admin media hints, got %+v", key, mediaMeta)
		}
	}
	nested := props["nested"].(map[string]any)
	nestedOpts := nested["x-formgen"].(map[string]any)["componentOptions"].(map[string]any)
	if nestedOpts["valueMode"] != "id" || nestedOpts["accept"] != "image/*" {
		t.Fatalf("expected explicit valueMode and accept to be preserved, got %+v", nestedOpts)
	}
	gallery := props["gallery"].(map[string]any)
	galleryOpts := gallery["x-formgen"].(map[string]any)["componentOptions"].(map[string]any)
	if galleryOpts["multiple"] != true {
		t.Fatalf("expected gallery multiple=true, got %+v", galleryOpts)
	}
	if got := galleryOpts["variant"]; got != "media-gallery" {
		t.Fatalf("expected explicit gallery variant to be preserved, got %v", got)
	}
	if got := galleryOpts["acceptedKinds"]; got == nil {
		t.Fatalf("expected acceptedKinds to be preserved, got %+v", galleryOpts)
	}
	nestedObject := props["nestedObject"].(map[string]any)
	nestedProps := nestedObject["properties"].(map[string]any)
	hero := nestedProps["hero"].(map[string]any)
	heroOpts := hero["x-formgen"].(map[string]any)["componentOptions"].(map[string]any)
	if heroOpts["libraryPath"] == "" {
		t.Fatalf("expected nested media field to be enriched, got %+v", heroOpts)
	}
}

func TestApplyMediaSchemaHintsSkipsWhenMediaUnavailable(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS),
	})
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"hero": map[string]any{
				"type":             "string",
				"x-formgen:widget": "media-picker",
			},
		},
	}
	if got := adm.ApplyMediaSchemaHints(schema); got != 0 {
		t.Fatalf("expected no enrichment when media feature is disabled, got %d", got)
	}
	prop := schema["properties"].(map[string]any)["hero"].(map[string]any)
	if _, ok := prop["x-admin"]; ok {
		t.Fatalf("did not expect active media hints when media is disabled, got %+v", prop["x-admin"])
	}
}

func TestApplyMediaSchemaHintsOnlyRecursesIntoArrayItemsWithProperties(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureMedia),
	})
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"blocks": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"image": map[string]any{
							"type":             "string",
							"x-formgen:widget": "media-picker",
						},
					},
				},
			},
			"tags": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type":             "string",
					"x-formgen:widget": "media-picker",
				},
			},
		},
	}
	if got := adm.ApplyMediaSchemaHints(schema); got != 1 {
		t.Fatalf("expected only explicit object item properties to be enriched, got %d", got)
	}
	props := schema["properties"].(map[string]any)
	blockImage := props["blocks"].(map[string]any)["items"].(map[string]any)["properties"].(map[string]any)["image"].(map[string]any)
	if blockImage["x-admin"] == nil {
		t.Fatalf("expected block item image to be enriched")
	}
	tagItems := props["tags"].(map[string]any)["items"].(map[string]any)
	if tagItems["x-admin"] != nil {
		t.Fatalf("did not expect array scalar item schema to be enriched, got %+v", tagItems)
	}
}
