package admin

import (
	"context"
	"testing"
)

func TestPanelFormAdapterBuildsSchemaWithTheme(t *testing.T) {
	pb := &PanelBuilder{}
	pb.WithRepository(NewMemoryRepository())
	pb.ListFields(Field{Name: "id", Label: "ID", Type: "text"})
	pb.FormFields(Field{Name: "name", Label: "Name", Type: "text"})
	panel, err := pb.Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}
	adapter := &PanelFormAdapter{
		ThemeResolver: func(ctx context.Context) *ThemeSelection {
			return &ThemeSelection{Tokens: map[string]string{"primary": "#000"}}
		},
	}
	req := adapter.Build(panel, AdminContext{Context: context.Background(), Locale: "en"}, nil, nil)
	if len(req.Schema.Theme) == 0 || len(req.Theme) == 0 {
		t.Fatalf("expected theme payload in schema and theme field")
	}
	if req.Locale != "en" {
		t.Fatalf("expected locale propagated")
	}
	if req.RenderTheme == nil {
		t.Fatal("expected typed go-formgen theme config")
	}
	if got := req.RenderTheme.SemanticTokens["color.action.primary"]; got != "#000" {
		t.Fatalf("expected portable semantic alias in form config, got %q", got)
	}
	if req.Metadata["use_blocks"] == nil || req.Metadata["use_seo"] == nil || req.Metadata["tree_view"] == nil {
		t.Fatalf("expected metadata flags populated")
	}
}

func TestAdminFormThemeReturnsRequestScopedDefensiveProjection(t *testing.T) {
	adm := mustNewAdmin(t, Config{Theme: "brand"}, Dependencies{})
	adm.WithThemeProvider(func(_ context.Context, selector ThemeSelector) (*ThemeSelection, error) {
		return &ThemeSelection{
			Name: selector.Name,
			Tokens: map[string]string{
				"color.action.primary": "#171717",
			},
			Assets: map[string]string{"logo": "logo.svg"},
		}, nil
	})

	ctx := WithThemeSelection(context.Background(), ThemeSelector{Name: "preview"})
	first := adm.FormTheme(ctx)
	if first == nil {
		t.Fatal("expected typed form theme")
	}
	if first.Theme != "preview" {
		t.Fatalf("theme = %q, want preview", first.Theme)
	}
	if got := first.SemanticTokens["color.action.primary"]; got != "#171717" {
		t.Fatalf("semantic primary = %q", got)
	}
	first.SemanticTokens["color.action.primary"] = "#ffffff"

	second := adm.FormTheme(ctx)
	if got := second.SemanticTokens["color.action.primary"]; got != "#171717" {
		t.Fatalf("form theme maps were not cloned, got %q", got)
	}
}

func TestNilAdminFormThemeIsNil(t *testing.T) {
	var adm *Admin
	if got := adm.FormTheme(context.Background()); got != nil {
		t.Fatalf("nil admin form theme = %+v, want nil", got)
	}
}

func TestPanelSchemaMergesHiddenFormFieldsIntoExplicitFormSchema(t *testing.T) {
	pb := &PanelBuilder{}
	pb.WithRepository(NewMemoryRepository())
	pb.FormFields(
		Field{Name: "title", Label: "Title", Type: "text", Required: true},
		hiddenRouteKeyField(),
	)
	pb.FormSchema(map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title": map[string]any{"type": "string"},
		},
		"required": []any{"title"},
	})
	panel, err := pb.Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}
	schema := panel.Schema().FormSchema
	props, ok := schema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("expected form schema properties, got %+v", schema)
	}
	routeKey, ok := props["route_key"].(map[string]any)
	if !ok {
		t.Fatalf("expected route_key property merged into form schema, got %+v", props)
	}
	if !toBool(routeKey["x-hidden"]) {
		t.Fatalf("expected route_key property to stay hidden, got %+v", routeKey)
	}
}
