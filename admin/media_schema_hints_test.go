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
	props := mustAs[map[string]any](schema["properties"])
	for _, key := range []string{"flat", "nested", "gallery", "adminMedia"} {
		prop := mustAs[map[string]any](props[key])
		formgen := mustAs[map[string]any](prop["x-formgen"])
		opts := mustAs[map[string]any](formgen["componentOptions"])
		if opts["libraryPath"] == "" || opts["capabilitiesEndpoint"] == "" {
			t.Fatalf("expected %s to receive media endpoints, got %+v", key, opts)
		}
		if opts["assetUrlTemplate"] == "" || opts["streamUrlTemplate"] == "" || opts["posterUrlTemplate"] == "" || opts["downloadUrlTemplate"] == "" {
			t.Fatalf("expected %s to receive delivery templates, got %+v", key, opts)
		}
		adminMeta := mustAs[map[string]any](prop["x-admin"])
		mediaMeta := mustAs[map[string]any](adminMeta["media"])
		if mediaMeta["libraryPath"] == "" || mediaMeta["capabilitiesPath"] == "" {
			t.Fatalf("expected %s to receive admin media hints, got %+v", key, mediaMeta)
		}
		if mediaMeta["assetUrlTemplate"] == "" || mediaMeta["streamUrlTemplate"] == "" || mediaMeta["posterUrlTemplate"] == "" || mediaMeta["downloadUrlTemplate"] == "" {
			t.Fatalf("expected %s to receive admin delivery hints, got %+v", key, mediaMeta)
		}
	}
	nested := mustAs[map[string]any](props["nested"])
	nestedFormgen := mustAs[map[string]any](nested["x-formgen"])
	nestedOpts := mustAs[map[string]any](nestedFormgen["componentOptions"])
	if nestedOpts["valueMode"] != "id" || nestedOpts["accept"] != "image/*" {
		t.Fatalf("expected explicit valueMode and accept to be preserved, got %+v", nestedOpts)
	}
	gallery := mustAs[map[string]any](props["gallery"])
	galleryFormgen := mustAs[map[string]any](gallery["x-formgen"])
	galleryOpts := mustAs[map[string]any](galleryFormgen["componentOptions"])
	if galleryOpts["multiple"] != true {
		t.Fatalf("expected gallery multiple=true, got %+v", galleryOpts)
	}
	if got := galleryOpts["variant"]; got != "media-gallery" {
		t.Fatalf("expected explicit gallery variant to be preserved, got %v", got)
	}
	if got := galleryOpts["acceptedKinds"]; got == nil {
		t.Fatalf("expected acceptedKinds to be preserved, got %+v", galleryOpts)
	}
	nestedObject := mustAs[map[string]any](props["nestedObject"])
	nestedProps := mustAs[map[string]any](nestedObject["properties"])
	hero := mustAs[map[string]any](nestedProps["hero"])
	heroFormgen := mustAs[map[string]any](hero["x-formgen"])
	heroOpts := mustAs[map[string]any](heroFormgen["componentOptions"])
	if heroOpts["libraryPath"] == "" {
		t.Fatalf("expected nested media field to be enriched, got %+v", heroOpts)
	}
}

func TestResolveMediaSchemaConfigPublishesDeliveryTemplates(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureMedia),
	})
	media := adm.resolveMediaSchemaConfig()
	if media == nil {
		t.Fatalf("expected media schema config")
	}
	expected := map[string]string{
		"asset":    "/admin/api/media/delivery/:id/asset",
		"stream":   "/admin/api/media/delivery/:id/stream",
		"poster":   "/admin/api/media/delivery/:id/poster",
		"download": "/admin/api/media/delivery/:id/download",
	}
	if media.AssetURLTemplate != expected["asset"] {
		t.Fatalf("expected asset template %q, got %q", expected["asset"], media.AssetURLTemplate)
	}
	if media.StreamURLTemplate != expected["stream"] {
		t.Fatalf("expected stream template %q, got %q", expected["stream"], media.StreamURLTemplate)
	}
	if media.PosterURLTemplate != expected["poster"] {
		t.Fatalf("expected poster template %q, got %q", expected["poster"], media.PosterURLTemplate)
	}
	if media.DownloadURLTemplate != expected["download"] {
		t.Fatalf("expected download template %q, got %q", expected["download"], media.DownloadURLTemplate)
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
	props := mustAs[map[string]any](schema["properties"])
	prop := mustAs[map[string]any](props["hero"])
	if _, ok := prop["x-admin"]; ok {
		t.Fatalf("did not expect active media hints when media is disabled, got %+v", prop["x-admin"])
	}
}

func TestApplyMediaSchemaHintsPreservesExistingComponentConfig(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureMedia),
	})
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"hero": map[string]any{
				"type": "string",
				"x-formgen": map[string]any{
					"component.config": map[string]any{
						"variant":       "media-picker",
						"valueMode":     "id",
						"acceptedKinds": []any{"image"},
						"maxSize":       12345,
					},
				},
			},
		},
	}

	if got := adm.ApplyMediaSchemaHints(schema); got != 1 {
		t.Fatalf("expected one enriched media field, got %d", got)
	}
	props := mustAs[map[string]any](schema["properties"])
	prop := mustAs[map[string]any](props["hero"])
	formgen := mustAs[map[string]any](prop["x-formgen"])
	componentOptions := mustAs[map[string]any](formgen["componentOptions"])
	componentConfig := mustAs[map[string]any](formgen["component.config"])
	for name, opts := range map[string]map[string]any{
		"componentOptions": componentOptions,
		"component.config": componentConfig,
	} {
		if opts["valueMode"] != "id" {
			t.Fatalf("expected %s valueMode=id, got %+v", name, opts)
		}
		if opts["acceptedKinds"] == nil || opts["maxSize"] != 12345 {
			t.Fatalf("expected %s to preserve existing component config, got %+v", name, opts)
		}
		if opts["itemEndpoint"] == "" || opts["capabilitiesEndpoint"] == "" {
			t.Fatalf("expected %s to receive media endpoints, got %+v", name, opts)
		}
	}
	componentOptions["valueMode"] = "url"
	if componentConfig["valueMode"] != "id" {
		t.Fatalf("componentOptions and component.config should not alias the same map")
	}
}

func TestApplyMediaSchemaHintsMirrorsGalleryMultipleIntoComponentConfig(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureMedia),
	})
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"gallery": map[string]any{
				"type": "string",
				"x-formgen": map[string]any{
					"component.config": map[string]any{
						"variant": "media-gallery",
					},
				},
			},
		},
	}

	if got := adm.ApplyMediaSchemaHints(schema); got != 1 {
		t.Fatalf("expected one enriched media field, got %d", got)
	}
	props := mustAs[map[string]any](schema["properties"])
	prop := mustAs[map[string]any](props["gallery"])
	formgen := mustAs[map[string]any](prop["x-formgen"])
	componentOptions := mustAs[map[string]any](formgen["componentOptions"])
	componentConfig := mustAs[map[string]any](formgen["component.config"])
	if componentOptions["multiple"] != true {
		t.Fatalf("expected componentOptions multiple=true, got %+v", componentOptions)
	}
	if componentConfig["multiple"] != true {
		t.Fatalf("expected component.config multiple=true, got %+v", componentConfig)
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
	props := mustAs[map[string]any](schema["properties"])
	blocks := mustAs[map[string]any](props["blocks"])
	blockItems := mustAs[map[string]any](blocks["items"])
	blockProps := mustAs[map[string]any](blockItems["properties"])
	blockImage := mustAs[map[string]any](blockProps["image"])
	if blockImage["x-admin"] == nil {
		t.Fatalf("expected block item image to be enriched")
	}
	tags := mustAs[map[string]any](props["tags"])
	tagItems := mustAs[map[string]any](tags["items"])
	if tagItems["x-admin"] != nil {
		t.Fatalf("did not expect array scalar item schema to be enriched, got %+v", tagItems)
	}
}
