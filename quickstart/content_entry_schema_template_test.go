package quickstart

import (
	"bytes"
	"mime/multipart"
	"testing"
	"testing/fstest"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestContentTypeSchemaFallsBackToPanelFields(t *testing.T) {
	panel, err := newInMemoryPanelBuilder().
		FormFields(
			admin.Field{Name: "title", Type: "text", Required: true},
			admin.Field{Name: "page_count", Type: "integer"},
			admin.Field{Name: "is_public", Type: "boolean"},
		).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	schema := contentTypeSchema(nil, panel)
	if schema == nil {
		t.Fatalf("expected synthesized schema")
	}
	if schema["type"] != "object" {
		t.Fatalf("expected object schema type, got %v", schema["type"])
	}
	if schema["$schema"] != "https://json-schema.org/draft/2020-12/schema" {
		t.Fatalf("expected draft schema identifier, got %v", schema["$schema"])
	}

	props, ok := schema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("expected schema properties map, got %T", schema["properties"])
	}

	assertPropertyType := func(field, wantType string) {
		t.Helper()
		prop, ok := props[field].(map[string]any)
		if !ok {
			t.Fatalf("expected %s schema property map, got %T", field, props[field])
		}
		if got := prop["type"]; got != wantType {
			t.Fatalf("expected %s type %s, got %v", field, wantType, got)
		}
	}
	assertPropertyType("title", "string")
	assertPropertyType("page_count", "number")
	assertPropertyType("is_public", "boolean")

	required, ok := schema["required"].([]string)
	if !ok || len(required) != 1 || required[0] != "title" {
		t.Fatalf("expected title to be required, got %#v", schema["required"])
	}
}

func TestContentTypeSchemaReturnsNilForEmptyPanelFormSchema(t *testing.T) {
	panel, err := newInMemoryPanelBuilder().
		ListFields(admin.Field{Name: "status", Label: "Status", Type: "text"}).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	if schema := contentTypeSchema(nil, panel); schema != nil {
		t.Fatalf("expected nil schema for panel without form fields, got %#v", schema)
	}
}

func TestContentTypeSchemaAddsDefaultSchemaDialect(t *testing.T) {
	schema := contentTypeSchema(&admin.CMSContentType{
		Schema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"title": map[string]any{"type": "string", "readOnly": true, "read_only": true},
			},
		},
	}, nil)
	if schema == nil {
		t.Fatalf("expected schema")
	}
	if schema["$schema"] != "https://json-schema.org/draft/2020-12/schema" {
		t.Fatalf("expected default schema dialect, got %v", schema["$schema"])
	}

	properties, ok := schema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("expected schema properties map, got %T", schema["properties"])
	}
	titleProp, ok := properties["title"].(map[string]any)
	if !ok {
		t.Fatalf("expected title schema property map, got %T", properties["title"])
	}
	if _, exists := titleProp["readOnly"]; exists {
		t.Fatalf("expected unsupported readOnly keyword to be removed")
	}
	if _, exists := titleProp["read_only"]; exists {
		t.Fatalf("expected unsupported read_only keyword to be removed")
	}
}

func TestContentEntryPanelTemplateNormalizesPanelSlug(t *testing.T) {
	got := contentEntryPanelTemplate("esign_documents", "resources/content/form")
	if got != "resources/esign-documents/form" {
		t.Fatalf("expected panel template resources/esign-documents/form, got %q", got)
	}

	got = contentEntryPanelTemplate("pages@staging", "resources/content/list")
	if got != "resources/pages/list" {
		t.Fatalf("expected env suffix trimmed from panel slug, got %q", got)
	}
}

func TestTemplateExistsFromFSResolvesTemplatesByLogicalName(t *testing.T) {
	checker := templateExistsFromFS(fstest.MapFS{
		"templates/resources/content/list.html": {Data: []byte("list")},
	})
	if checker == nil {
		t.Fatalf("expected template checker")
	}
	if !checker("resources/content/list") {
		t.Fatalf("expected resources/content/list to resolve through .html suffix")
	}
	if !checker("resources/content/list.html") {
		t.Fatalf("expected resources/content/list.html to resolve directly")
	}
	if checker("resources/pages/list") {
		t.Fatalf("expected missing panel template to return false")
	}
}

func TestRenderTemplateUsesDeterministicFallbackWhenCustomTemplateMissing(t *testing.T) {
	viewCtx := router.ViewContext{"title": "Pages"}
	ctx := router.NewMockContext()
	ctx.On("Render", "resources/content/list", viewCtx).Return(nil).Once()

	h := &contentEntryHandlers{
		templateExists: func(name string) bool { return name == "resources/content/list" },
	}
	if err := h.renderTemplate(ctx, "pages", "resources/content/list", viewCtx); err != nil {
		t.Fatalf("render with deterministic fallback: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestRenderTemplateRendersPanelTemplateWhenAvailable(t *testing.T) {
	viewCtx := router.ViewContext{"title": "Pages"}
	ctx := router.NewMockContext()
	ctx.On("Render", "resources/pages/list", viewCtx).Return(nil).Once()

	h := &contentEntryHandlers{
		templateExists: func(name string) bool { return name == "resources/pages/list" },
	}
	if err := h.renderTemplate(ctx, "pages", "resources/content/list", viewCtx); err != nil {
		t.Fatalf("render with panel template: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestParseMultipartFormValuesReadsTextFieldsAndSkipsFiles(t *testing.T) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("title", "NDA"); err != nil {
		t.Fatalf("write title: %v", err)
	}
	if err := writer.WriteField("pdf_base64", "ZmFrZS1wZGY="); err != nil {
		t.Fatalf("write pdf field: %v", err)
	}
	filePart, err := writer.CreateFormFile("pdf_file", "nda.pdf")
	if err != nil {
		t.Fatalf("create file part: %v", err)
	}
	if _, err := filePart.Write([]byte("%PDF-1.4 fake")); err != nil {
		t.Fatalf("write file body: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.On("Body").Return(body.Bytes())
	ctx.HeadersM["Content-Type"] = writer.FormDataContentType()

	values, err := parseMultipartFormValues(ctx)
	if err != nil {
		t.Fatalf("parse multipart values: %v", err)
	}
	if got := values.Get("title"); got != "NDA" {
		t.Fatalf("expected title NDA, got %q", got)
	}
	if got := values.Get("pdf_base64"); got != "ZmFrZS1wZGY=" {
		t.Fatalf("expected pdf_base64 field, got %q", got)
	}
	if got := values.Get("pdf_file"); got != "" {
		t.Fatalf("expected file part to be skipped, got %q", got)
	}
}

func TestIsJSONRequestReadsContentTypeHeader(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.HeadersM["Content-Type"] = "application/json; charset=utf-8"

	if !isJSONRequest(ctx) {
		t.Fatalf("expected JSON request when Content-Type header is application/json")
	}
}

func TestRequestContentTypeReturnsHeaderValue(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.HeadersM["Content-Type"] = "multipart/form-data; boundary=abc123"

	if got := requestContentType(ctx); got != "multipart/form-data; boundary=abc123" {
		t.Fatalf("expected content type from header, got %q", got)
	}
}

func TestContentEntryNeedsBlocksChipsDetectsRenderer(t *testing.T) {
	tests := []struct {
		name     string
		columns  []map[string]any
		expected bool
	}{
		{
			name:     "nil columns",
			columns:  nil,
			expected: false,
		},
		{
			name:     "empty columns",
			columns:  []map[string]any{},
			expected: false,
		},
		{
			name: "no blocks_chips renderer",
			columns: []map[string]any{
				{"field": "title", "renderer": "_array"},
				{"field": "tags", "renderer": "_tags"},
			},
			expected: false,
		},
		{
			name: "has blocks_chips renderer",
			columns: []map[string]any{
				{"field": "title", "renderer": "_array"},
				{"field": "blocks", "renderer": "blocks_chips"},
			},
			expected: true,
		},
		{
			name: "blocks_chips with whitespace",
			columns: []map[string]any{
				{"field": "blocks", "renderer": "  blocks_chips  "},
			},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := contentEntryNeedsBlocksChips(tt.columns)
			if got != tt.expected {
				t.Errorf("contentEntryNeedsBlocksChips() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestContentEntryAttachBlocksIconMapMergesOptions(t *testing.T) {
	iconMap := map[string]string{
		"hero":    "iconoir:home",
		"text":    "iconoir:text",
		"gallery": "iconoir:image",
	}

	tests := []struct {
		name             string
		columns          []map[string]any
		expectIconMap    bool
		expectPreserved  bool
		preservedMapKeys []string
	}{
		{
			name: "attaches icon map to blocks_chips column",
			columns: []map[string]any{
				{"field": "blocks", "renderer": "blocks_chips"},
			},
			expectIconMap: true,
		},
		{
			name: "does not attach to other renderers",
			columns: []map[string]any{
				{"field": "tags", "renderer": "_array"},
			},
			expectIconMap: false,
		},
		{
			name: "preserves existing renderer_options",
			columns: []map[string]any{
				{
					"field":    "blocks",
					"renderer": "blocks_chips",
					"renderer_options": map[string]any{
						"max_visible": 5,
					},
				},
			},
			expectIconMap:   true,
			expectPreserved: true,
		},
		{
			name: "does not override user-provided block_icons_map",
			columns: []map[string]any{
				{
					"field":    "blocks",
					"renderer": "blocks_chips",
					"renderer_options": map[string]any{
						"block_icons_map": map[string]string{"custom": "custom-icon"},
					},
				},
			},
			expectIconMap:    false,
			preservedMapKeys: []string{"custom"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := contentEntryAttachBlocksIconMap(tt.columns, iconMap)

			for _, col := range result {
				renderer, _ := col["renderer"].(string)
				opts, _ := col["renderer_options"].(map[string]any)

				if renderer == "blocks_chips" {
					if tt.expectIconMap {
						attachedMap, ok := opts["block_icons_map"].(map[string]string)
						if !ok {
							t.Errorf("expected block_icons_map to be attached")
						}
						if _, exists := attachedMap["hero"]; !exists {
							t.Errorf("expected icon map to contain 'hero' key")
						}
					}
					if tt.expectPreserved {
						if val, ok := opts["max_visible"].(int); !ok || val != 5 {
							t.Errorf("expected existing options to be preserved")
						}
					}
					if len(tt.preservedMapKeys) > 0 {
						attachedMap, ok := opts["block_icons_map"].(map[string]string)
						if !ok {
							t.Errorf("expected block_icons_map to exist")
						}
						for _, key := range tt.preservedMapKeys {
							if _, exists := attachedMap[key]; !exists {
								t.Errorf("expected user-provided key %q to be preserved", key)
							}
						}
					}
				}
			}
		})
	}
}

func TestContentEntryBlockIconsMapReturnsNilForNilAdmin(t *testing.T) {
	ctx := admin.AdminContext{}
	result := contentEntryBlockIconsMap(ctx, nil)
	if result != nil {
		t.Errorf("expected nil for nil admin, got %v", result)
	}
}
