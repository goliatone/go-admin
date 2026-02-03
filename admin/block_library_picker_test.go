package admin

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
)

func testRenderChild(input any) (string, error) {
	ri, ok := input.(blockLibraryRenderInput)
	if !ok {
		return "<rendered/>", nil
	}
	return "<rendered slug=\"" + ri.Slug + "\"/>", nil
}

func seedBlockDefinitions(t *testing.T, content *InMemoryContentService) {
	t.Helper()
	ctx := context.Background()
	defs := []CMSBlockDefinition{
		{
			ID:       "hero-1",
			Name:     "Hero Section",
			Slug:     "hero_section",
			Type:     "hero_section",
			Icon:     "layout",
			Category: "layout",
			Status:   "active",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"title": map[string]any{"type": "string"},
					"image": map[string]any{"type": "string"},
				},
				"required": []any{"title", "image", "_type", "_schema"},
				"metadata": map[string]any{
					"schema_version": "hero_section@v1.0.0",
				},
			},
			UISchema: map[string]any{
				"title": map[string]any{"ui:widget": "textarea"},
			},
			SchemaVersion: "hero_section@v1.0.0",
		},
		{
			ID:       "rich-1",
			Name:     "Rich Text",
			Slug:     "rich_text",
			Type:     "rich_text",
			Icon:     "text",
			Category: "content",
			Status:   "active",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"body": map[string]any{"type": "string"},
				},
				"required": []any{"body"},
			},
			SchemaVersion: "rich_text@v1.0.0",
		},
		{
			ID:       "cta-1",
			Name:     "Call To Action",
			Slug:     "cta",
			Type:     "cta",
			Icon:     "megaphone",
			Category: "marketing",
			Status:   "draft",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"label": map[string]any{"type": "string"},
					"url":   map[string]any{"type": "string"},
				},
				"required": []any{"label"},
			},
			SchemaVersion: "cta@v0.1.0",
		},
		{
			ID:       "deprecated-1",
			Name:     "Old Banner",
			Slug:     "old_banner",
			Type:     "old_banner",
			Category: "layout",
			Status:   "inactive",
			Schema: map[string]any{
				"type":       "object",
				"properties": map[string]any{},
			},
		},
	}
	for _, def := range defs {
		if _, err := content.CreateBlockDefinition(ctx, def); err != nil {
			t.Fatalf("seed block definition %s: %v", def.ID, err)
		}
	}
}

func TestBlockDefinitionsFromLibrary_ActiveOnly(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		nil,
		testRenderChild,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Only active definitions should be returned.
	if len(defs) != 2 {
		t.Fatalf("expected 2 active definitions, got %d", len(defs))
	}
	slugs := map[string]bool{}
	for _, d := range defs {
		slugs[d.Type] = true
		if d.Status != "active" {
			t.Errorf("expected status active, got %q for %s", d.Status, d.Type)
		}
	}
	if !slugs["hero_section"] || !slugs["rich_text"] {
		t.Fatalf("expected hero_section and rich_text, got %v", slugs)
	}
}

func TestBlockDefinitionsFromLibrary_IncludeInactive(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		nil,
		testRenderChild,
		true,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// All definitions should be returned regardless of status.
	if len(defs) != 4 {
		t.Fatalf("expected 4 definitions, got %d", len(defs))
	}
	statusSeen := map[string]bool{}
	for _, d := range defs {
		statusSeen[d.Status] = true
	}
	if !statusSeen["active"] || !statusSeen["draft"] || !statusSeen["inactive"] {
		t.Fatalf("expected multiple statuses, got %v", statusSeen)
	}
}

func TestBlockDefinitionsFromLibrary_SlugFiltering(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		[]string{"hero_section", "rich_text"},
		testRenderChild,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(defs) != 2 {
		t.Fatalf("expected 2 definitions, got %d", len(defs))
	}
	for _, d := range defs {
		if d.Type != "hero_section" && d.Type != "rich_text" {
			t.Errorf("unexpected slug %q", d.Type)
		}
	}
}

func TestBlockDefinitionsFromLibrary_SlugFilteringSingleMatch(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		[]string{"hero_section"},
		testRenderChild,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(defs) != 1 {
		t.Fatalf("expected 1 definition, got %d", len(defs))
	}
	if defs[0].Type != "hero_section" {
		t.Errorf("expected hero_section, got %q", defs[0].Type)
	}
}

func TestBlockDefinitionsFromLibrary_EmptySlugsReturnsAll(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		[]string{},
		testRenderChild,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Empty slug list means return all active.
	if len(defs) != 2 {
		t.Fatalf("expected 2 active definitions with empty slugs, got %d", len(defs))
	}
}

func TestBlockDefinitionsFromLibrary_NilSlugsReturnsAll(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		nil,
		testRenderChild,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(defs) != 2 {
		t.Fatalf("expected 2 active definitions with nil slugs, got %d", len(defs))
	}
}

func TestBlockDefinitionsFromLibrary_RequiredFieldsDerivation(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		[]string{"hero_section"},
		testRenderChild,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(defs) != 1 {
		t.Fatalf("expected 1 definition, got %d", len(defs))
	}

	hero := defs[0]
	// required in schema: ["title", "image", "_type", "_schema"]
	// Expected after filtering: ["title", "image"] (_type and _schema excluded)
	if len(hero.RequiredFields) != 2 {
		t.Fatalf("expected 2 required fields, got %d: %v", len(hero.RequiredFields), hero.RequiredFields)
	}
	reqSet := map[string]bool{}
	for _, f := range hero.RequiredFields {
		reqSet[f] = true
	}
	if !reqSet["title"] || !reqSet["image"] {
		t.Errorf("expected title and image in required fields, got %v", hero.RequiredFields)
	}
	if reqSet["_type"] || reqSet["_schema"] {
		t.Errorf("_type and _schema should be excluded, got %v", hero.RequiredFields)
	}
}

func TestBlockDefinitionsFromLibrary_RequiredFieldsNoRequired(t *testing.T) {
	content := NewInMemoryContentService()
	ctx := context.Background()
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{
		ID:     "no-req",
		Name:   "No Required",
		Slug:   "no_required",
		Type:   "no_required",
		Status: "active",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{"title": map[string]any{"type": "string"}},
		},
	})
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(ctx, repo, []string{"no_required"}, testRenderChild, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(defs) != 1 {
		t.Fatalf("expected 1, got %d", len(defs))
	}
	if defs[0].RequiredFields != nil {
		t.Errorf("expected nil required fields, got %v", defs[0].RequiredFields)
	}
}

func TestBlockDefinitionsFromLibrary_OverlayApplication(t *testing.T) {
	content := NewInMemoryContentService()
	ctx := context.Background()
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{
		ID:     "overlay-test",
		Name:   "Overlay Test",
		Slug:   "overlay_test",
		Type:   "overlay_test",
		Status: "active",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{"title": map[string]any{"type": "string"}},
		},
		UISchema: map[string]any{
			"title": map[string]any{"ui:widget": "textarea"},
		},
	})
	repo := NewCMSBlockDefinitionRepository(content, content)

	var capturedInput blockLibraryRenderInput
	capturingRenderChild := func(input any) (string, error) {
		if ri, ok := input.(blockLibraryRenderInput); ok {
			capturedInput = ri
		}
		return "<rendered/>", nil
	}

	defs, err := blockDefinitionsFromLibrary(ctx, repo, []string{"overlay_test"}, capturingRenderChild, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(defs) != 1 {
		t.Fatalf("expected 1, got %d", len(defs))
	}

	// Verify overlay was prepared.
	if capturedInput.Overlay == nil {
		t.Fatal("expected overlay bytes to be set")
	}

	// Verify overlay contains $schema marker.
	var overlayMap map[string]any
	if err := json.Unmarshal(capturedInput.Overlay, &overlayMap); err != nil {
		t.Fatalf("overlay unmarshal failed: %v", err)
	}
	if overlayMap["$schema"] != "x-ui-overlay/v1" {
		t.Errorf("expected $schema to be x-ui-overlay/v1, got %v", overlayMap["$schema"])
	}
	// Original UI widget should be preserved.
	if titleUI, ok := overlayMap["title"].(map[string]any); !ok || titleUI["ui:widget"] != "textarea" {
		t.Errorf("expected UI schema content preserved, got %v", overlayMap)
	}
}

func TestBlockDefinitionsFromLibrary_OverlayPreservesExistingSchemaMarker(t *testing.T) {
	content := NewInMemoryContentService()
	ctx := context.Background()
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{
		ID:     "overlay-marker",
		Name:   "Overlay Marker",
		Slug:   "overlay_marker",
		Type:   "overlay_marker",
		Status: "active",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		UISchema: map[string]any{
			"$schema": "x-ui-overlay/v1",
			"title":   map[string]any{"ui:widget": "input"},
		},
	})
	repo := NewCMSBlockDefinitionRepository(content, content)

	var capturedInput blockLibraryRenderInput
	capturingRenderChild := func(input any) (string, error) {
		if ri, ok := input.(blockLibraryRenderInput); ok {
			capturedInput = ri
		}
		return "<rendered/>", nil
	}

	_, err := blockDefinitionsFromLibrary(ctx, repo, []string{"overlay_marker"}, capturingRenderChild, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var overlayMap map[string]any
	if err := json.Unmarshal(capturedInput.Overlay, &overlayMap); err != nil {
		t.Fatalf("overlay unmarshal failed: %v", err)
	}
	// Should preserve existing $schema, not overwrite.
	if overlayMap["$schema"] != "x-ui-overlay/v1" {
		t.Errorf("expected preserved $schema, got %v", overlayMap["$schema"])
	}
}

func TestBlockDefinitionsFromLibrary_NoOverlayWhenNoUISchema(t *testing.T) {
	content := NewInMemoryContentService()
	ctx := context.Background()
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{
		ID:     "no-ui",
		Name:   "No UI",
		Slug:   "no_ui",
		Type:   "no_ui",
		Status: "active",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
	})
	repo := NewCMSBlockDefinitionRepository(content, content)

	var capturedInput blockLibraryRenderInput
	capturingRenderChild := func(input any) (string, error) {
		if ri, ok := input.(blockLibraryRenderInput); ok {
			capturedInput = ri
		}
		return "<rendered/>", nil
	}

	_, err := blockDefinitionsFromLibrary(ctx, repo, []string{"no_ui"}, capturingRenderChild, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedInput.Overlay != nil {
		t.Errorf("expected nil overlay when no ui_schema, got %s", string(capturedInput.Overlay))
	}
}

func TestBlockDefinitionsFromLibrary_CategoryStatusMapping(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		nil,
		testRenderChild,
		true,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	defMap := map[string]blockDefinition{}
	for _, d := range defs {
		defMap[d.Type] = d
	}

	// Hero Section: category=layout, status=active
	if hero, ok := defMap["hero_section"]; ok {
		if hero.Category != "layout" {
			t.Errorf("hero_section: expected category layout, got %q", hero.Category)
		}
		if hero.Status != "active" {
			t.Errorf("hero_section: expected status active, got %q", hero.Status)
		}
		if hero.Label != "Hero Section" {
			t.Errorf("hero_section: expected label 'Hero Section', got %q", hero.Label)
		}
		if hero.Icon != "layout" {
			t.Errorf("hero_section: expected icon 'layout', got %q", hero.Icon)
		}
		if hero.Schema != "hero_section@v1.0.0" {
			t.Errorf("hero_section: expected schema version hero_section@v1.0.0, got %q", hero.Schema)
		}
	} else {
		t.Error("hero_section not found")
	}

	// Rich Text: category=content, status=active
	if rt, ok := defMap["rich_text"]; ok {
		if rt.Category != "content" {
			t.Errorf("rich_text: expected category content, got %q", rt.Category)
		}
		if rt.Status != "active" {
			t.Errorf("rich_text: expected status active, got %q", rt.Status)
		}
	} else {
		t.Error("rich_text not found")
	}

	// CTA: category=marketing, status=draft
	if cta, ok := defMap["cta"]; ok {
		if cta.Category != "marketing" {
			t.Errorf("cta: expected category marketing, got %q", cta.Category)
		}
		if cta.Status != "draft" {
			t.Errorf("cta: expected status draft, got %q", cta.Status)
		}
	} else {
		t.Error("cta not found")
	}

	// Old Banner: category=layout, status=inactive
	if banner, ok := defMap["old_banner"]; ok {
		if banner.Category != "layout" {
			t.Errorf("old_banner: expected category layout, got %q", banner.Category)
		}
		if banner.Status != "inactive" {
			t.Errorf("old_banner: expected status inactive, got %q", banner.Status)
		}
	} else {
		t.Error("old_banner not found")
	}
}

func TestBlockDefinitionsFromLibrary_CategoryFallbackToCustom(t *testing.T) {
	content := NewInMemoryContentService()
	ctx := context.Background()
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{
		ID:     "no-cat",
		Name:   "No Category",
		Slug:   "no_category",
		Type:   "no_category",
		Status: "active",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
	})
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(ctx, repo, []string{"no_category"}, testRenderChild, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(defs) != 1 {
		t.Fatalf("expected 1, got %d", len(defs))
	}
	// When no category is set, the repo defaults to "custom".
	if defs[0].Category != "custom" {
		t.Errorf("expected fallback category 'custom', got %q", defs[0].Category)
	}
}

func TestBlockDefinitionsFromLibrary_HTMLRendered(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		[]string{"hero_section"},
		testRenderChild,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(defs) != 1 {
		t.Fatalf("expected 1, got %d", len(defs))
	}
	if defs[0].HTML != `<rendered slug="hero_section"/>` {
		t.Errorf("expected rendered HTML, got %q", defs[0].HTML)
	}
}

func TestBlockDefinitionsFromLibrary_NilRenderChild(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		[]string{"hero_section"},
		nil,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(defs) != 1 {
		t.Fatalf("expected 1, got %d", len(defs))
	}
	if defs[0].HTML != "" {
		t.Errorf("expected empty HTML with nil renderChild, got %q", defs[0].HTML)
	}
}

func TestBlockDefinitionsFromLibrary_NilRepo(t *testing.T) {
	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		nil,
		nil,
		testRenderChild,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if defs != nil {
		t.Errorf("expected nil definitions for nil repo, got %v", defs)
	}
}

func TestBlockDefinitionsFromLibrary_SlugFilteringCaseInsensitive(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)

	defs, err := blockDefinitionsFromLibrary(
		context.Background(),
		repo,
		[]string{"HERO_SECTION", "Rich_Text"},
		testRenderChild,
		false,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(defs) != 2 {
		t.Fatalf("expected 2 definitions with case-insensitive slugs, got %d", len(defs))
	}
}

func TestDeriveBlockRequiredFields(t *testing.T) {
	tests := []struct {
		name     string
		schema   map[string]any
		expected []string
	}{
		{
			name:     "nil schema",
			schema:   nil,
			expected: nil,
		},
		{
			name:     "no required key",
			schema:   map[string]any{"type": "object"},
			expected: nil,
		},
		{
			name:     "empty required array",
			schema:   map[string]any{"required": []any{}},
			expected: nil,
		},
		{
			name:     "basic fields",
			schema:   map[string]any{"required": []any{"title", "body"}},
			expected: []string{"title", "body"},
		},
		{
			name:     "excludes _type and _schema",
			schema:   map[string]any{"required": []any{"title", "_type", "_schema", "body"}},
			expected: []string{"title", "body"},
		},
		{
			name:     "only metadata keys",
			schema:   map[string]any{"required": []any{"_type", "_schema"}},
			expected: nil,
		},
		{
			name:     "trims whitespace",
			schema:   map[string]any{"required": []any{" title ", "  body  "}},
			expected: []string{"title", "body"},
		},
		{
			name:     "skips empty strings",
			schema:   map[string]any{"required": []any{"", "  ", "title"}},
			expected: []string{"title"},
		},
		{
			name:     "skips non-string items",
			schema:   map[string]any{"required": []any{42, true, "title"}},
			expected: []string{"title"},
		},
		{
			name:     "wrong type for required",
			schema:   map[string]any{"required": "title"},
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := deriveBlockRequiredFields(tt.schema)
			if tt.expected == nil {
				if result != nil {
					t.Errorf("expected nil, got %v", result)
				}
				return
			}
			if len(result) != len(tt.expected) {
				t.Fatalf("expected %d fields, got %d: %v", len(tt.expected), len(result), result)
			}
			for i, exp := range tt.expected {
				if result[i] != exp {
					t.Errorf("index %d: expected %q, got %q", i, exp, result[i])
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Phase 2: Template API Integration Tests
// ---------------------------------------------------------------------------

func TestBlockDefinitionsToResponse_ActiveItemsNotDisabled(t *testing.T) {
	defs := []blockDefinition{
		{Type: "hero", Label: "Hero", Status: "active", Schema: "hero@v1"},
		{Type: "text", Label: "Text", Status: "active", Schema: "text@v1"},
	}
	items := blockDefinitionsToResponse(defs)
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	for _, item := range items {
		if item.Disabled {
			t.Errorf("%s: expected disabled=false for active item", item.Slug)
		}
	}
}

func TestBlockDefinitionsToResponse_InactiveItemsDisabled(t *testing.T) {
	defs := []blockDefinition{
		{Type: "hero", Label: "Hero", Status: "active"},
		{Type: "draft_block", Label: "Draft", Status: "draft"},
		{Type: "old_block", Label: "Old", Status: "inactive"},
	}
	items := blockDefinitionsToResponse(defs)
	if len(items) != 3 {
		t.Fatalf("expected 3 items, got %d", len(items))
	}

	itemMap := map[string]blockDefinitionTemplateItem{}
	for _, item := range items {
		itemMap[item.Slug] = item
	}

	if itemMap["hero"].Disabled {
		t.Error("hero: expected disabled=false")
	}
	if !itemMap["draft_block"].Disabled {
		t.Error("draft_block: expected disabled=true for status=draft")
	}
	if !itemMap["old_block"].Disabled {
		t.Error("old_block: expected disabled=true for status=inactive")
	}
}

func TestBlockDefinitionsToResponse_NilRequiredFieldsBecomesEmptySlice(t *testing.T) {
	defs := []blockDefinition{
		{Type: "test", Label: "Test", Status: "active", RequiredFields: nil},
	}
	items := blockDefinitionsToResponse(defs)
	if items[0].RequiredFields == nil {
		t.Error("expected non-nil RequiredFields (empty slice), got nil")
	}
	if len(items[0].RequiredFields) != 0 {
		t.Errorf("expected empty RequiredFields, got %v", items[0].RequiredFields)
	}
}

func TestBlockDefinitionsToResponse_FullResponseShape(t *testing.T) {
	defs := []blockDefinition{
		{
			Type:           "hero_section",
			Label:          "Hero Section",
			Icon:           "layout",
			Category:       "layout",
			Status:         "active",
			Schema:         "hero_section@v1.0.0",
			RequiredFields: []string{"title", "image"},
			HTML:           "<div>hero form</div>",
		},
	}
	items := blockDefinitionsToResponse(defs)
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}

	item := items[0]
	if item.Slug != "hero_section" {
		t.Errorf("slug: expected hero_section, got %q", item.Slug)
	}
	if item.Label != "Hero Section" {
		t.Errorf("label: expected Hero Section, got %q", item.Label)
	}
	if item.Icon != "layout" {
		t.Errorf("icon: expected layout, got %q", item.Icon)
	}
	if item.Category != "layout" {
		t.Errorf("category: expected layout, got %q", item.Category)
	}
	if item.SchemaVersion != "hero_section@v1.0.0" {
		t.Errorf("schema_version: expected hero_section@v1.0.0, got %q", item.SchemaVersion)
	}
	if item.Status != "active" {
		t.Errorf("status: expected active, got %q", item.Status)
	}
	if item.Disabled {
		t.Error("disabled: expected false for active")
	}
	if len(item.RequiredFields) != 2 || item.RequiredFields[0] != "title" || item.RequiredFields[1] != "image" {
		t.Errorf("required_fields: expected [title image], got %v", item.RequiredFields)
	}
	if item.HTML != "<div>hero form</div>" {
		t.Errorf("html: expected rendered html, got %q", item.HTML)
	}
}

func TestBlockDefinitionsToResponse_JSONSerialization(t *testing.T) {
	defs := []blockDefinition{
		{
			Type:           "hero",
			Label:          "Hero",
			Icon:           "star",
			Category:       "content",
			Status:         "active",
			Schema:         "hero@v1",
			RequiredFields: []string{"title"},
			HTML:           "<p>form</p>",
		},
	}
	items := blockDefinitionsToResponse(defs)
	payload := map[string]any{"items": items}
	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("json marshal failed: %v", err)
	}

	var result map[string]any
	if err := json.Unmarshal(raw, &result); err != nil {
		t.Fatalf("json unmarshal failed: %v", err)
	}

	arr, ok := result["items"].([]any)
	if !ok || len(arr) != 1 {
		t.Fatalf("expected items array with 1 element, got %v", result["items"])
	}
	obj, ok := arr[0].(map[string]any)
	if !ok {
		t.Fatal("expected item to be a map")
	}

	// Verify snake_case JSON keys.
	expectedKeys := []string{"slug", "label", "icon", "category", "schema_version", "status", "disabled", "required_fields", "html"}
	for _, key := range expectedKeys {
		if _, ok := obj[key]; !ok {
			t.Errorf("expected JSON key %q missing", key)
		}
	}

	if obj["disabled"] != false {
		t.Errorf("expected disabled=false, got %v", obj["disabled"])
	}
}

func TestBlockLibraryRenderFunc_InvalidInput(t *testing.T) {
	renderChild := blockLibraryRenderFunc(context.Background(), nil)
	_, err := renderChild("not a blockLibraryRenderInput")
	if err == nil {
		t.Fatal("expected error for invalid input type")
	}
}

func TestBlockLibraryRenderFunc_NilValidator(t *testing.T) {
	renderChild := blockLibraryRenderFunc(context.Background(), nil)
	_, err := renderChild(blockLibraryRenderInput{
		Schema: map[string]any{"type": "object", "properties": map[string]any{}},
		Slug:   "test",
	})
	if err == nil {
		t.Fatal("expected error for nil validator")
	}
}

func TestBlockDefinitionTemplateFlow_SingleActiveSlug(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)
	ctx := context.Background()

	defs, err := blockDefinitionsFromLibrary(ctx, repo, []string{"hero_section"}, testRenderChild, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	items := blockDefinitionsToResponse(defs)
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].Slug != "hero_section" {
		t.Errorf("expected slug hero_section, got %q", items[0].Slug)
	}
	if items[0].Disabled {
		t.Error("active slug should not be disabled")
	}
	if items[0].HTML == "" {
		t.Error("expected non-empty HTML")
	}
}

func TestBlockDefinitionTemplateFlow_InactiveSlugFilteredWhenNotIncluded(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)
	ctx := context.Background()

	// Without includeInactive, the inactive slug should not appear.
	defs, err := blockDefinitionsFromLibrary(ctx, repo, []string{"old_banner"}, testRenderChild, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	items := blockDefinitionsToResponse(defs)
	if len(items) != 0 {
		t.Fatalf("expected 0 items for inactive slug without include_inactive, got %d", len(items))
	}
}

func TestBlockDefinitionTemplateFlow_IncludeInactiveReturnsDisabled(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)
	ctx := context.Background()

	defs, err := blockDefinitionsFromLibrary(ctx, repo, []string{"old_banner"}, testRenderChild, true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	items := blockDefinitionsToResponse(defs)
	if len(items) != 1 {
		t.Fatalf("expected 1 item with include_inactive, got %d", len(items))
	}
	if !items[0].Disabled {
		t.Error("inactive slug should have disabled=true")
	}
	if items[0].Status != "inactive" {
		t.Errorf("expected status inactive, got %q", items[0].Status)
	}
}

func TestBlockDefinitionTemplateFlow_BatchSlugsActiveAndInactive(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)
	ctx := context.Background()

	// With includeInactive, should get both active and inactive.
	defs, err := blockDefinitionsFromLibrary(ctx, repo, []string{"hero_section", "old_banner"}, testRenderChild, true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	items := blockDefinitionsToResponse(defs)
	if len(items) != 2 {
		t.Fatalf("expected 2 items in batch, got %d", len(items))
	}

	itemMap := map[string]blockDefinitionTemplateItem{}
	for _, item := range items {
		itemMap[item.Slug] = item
	}

	if hero, ok := itemMap["hero_section"]; ok {
		if hero.Disabled {
			t.Error("hero_section should not be disabled")
		}
	} else {
		t.Error("hero_section not found in batch")
	}

	if banner, ok := itemMap["old_banner"]; ok {
		if !banner.Disabled {
			t.Error("old_banner should be disabled")
		}
	} else {
		t.Error("old_banner not found in batch")
	}
}

func TestBlockDefinitionTemplateFlow_NonexistentSlugOmitted(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)
	ctx := context.Background()

	defs, err := blockDefinitionsFromLibrary(ctx, repo, []string{"hero_section", "nonexistent_block"}, testRenderChild, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	items := blockDefinitionsToResponse(defs)
	// Only hero_section should be returned; nonexistent slug silently omitted.
	if len(items) != 1 {
		t.Fatalf("expected 1 item (nonexistent omitted), got %d", len(items))
	}
	if items[0].Slug != "hero_section" {
		t.Errorf("expected hero_section, got %q", items[0].Slug)
	}
}

func TestBlockDefinitionTemplateFlow_OnlyActiveWithoutIncludeInactive(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)
	ctx := context.Background()

	// Without includeInactive, batch with all slugs should return only active.
	defs, err := blockDefinitionsFromLibrary(ctx, repo, nil, testRenderChild, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	items := blockDefinitionsToResponse(defs)
	for _, item := range items {
		if item.Status != "active" {
			t.Errorf("expected only active items, got status %q for %s", item.Status, item.Slug)
		}
		if item.Disabled {
			t.Errorf("expected disabled=false for active item %s", item.Slug)
		}
	}
}

func TestBlockDefinitionTemplateFlow_RenderChildError(t *testing.T) {
	content := NewInMemoryContentService()
	seedBlockDefinitions(t, content)
	repo := NewCMSBlockDefinitionRepository(content, content)
	ctx := context.Background()

	failingRenderChild := func(input any) (string, error) {
		return "", errors.New("render failed")
	}

	_, err := blockDefinitionsFromLibrary(ctx, repo, []string{"hero_section"}, failingRenderChild, false)
	if err == nil {
		t.Fatal("expected error from failing renderChild")
	}
	if err.Error() != "render failed" {
		t.Errorf("expected 'render failed', got %q", err.Error())
	}
}
