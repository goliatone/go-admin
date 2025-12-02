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
	if req.Metadata["use_blocks"] == nil || req.Metadata["use_seo"] == nil || req.Metadata["tree_view"] == nil {
		t.Fatalf("expected metadata flags populated")
	}
}
