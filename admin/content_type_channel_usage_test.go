package admin

import (
	"context"
	"testing"

	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
)

func TestInMemoryContentServiceContentTypesRespectEnvironmentWithInternalChannelHelper(t *testing.T) {
	content := NewInMemoryContentService()

	_, err := content.CreateContentType(WithEnvironment(context.Background(), "preview"), CMSContentType{
		Name:   "Article",
		Slug:   "article",
		Schema: map[string]any{"type": "object"},
	})
	if err != nil {
		t.Fatalf("create preview content type failed: %v", err)
	}
	_, err = content.CreateContentType(WithEnvironment(context.Background(), "staging"), CMSContentType{
		Name:   "News",
		Slug:   "news",
		Schema: map[string]any{"type": "object"},
	})
	if err != nil {
		t.Fatalf("create staging content type failed: %v", err)
	}

	previewTypes, err := content.ContentTypes(WithEnvironment(context.Background(), "preview"))
	if err != nil {
		t.Fatalf("preview content types failed: %v", err)
	}
	if len(previewTypes) != 1 {
		t.Fatalf("expected one preview content type, got %d", len(previewTypes))
	}
	if got := cmsadapter.ContentTypeChannel(previewTypes[0]); got != "preview" {
		t.Fatalf("expected preview channel, got %q", got)
	}
}

func TestResolveContentNavigationPanelUsesContentTypeChannelCandidate(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})

	record, err := adm.contentTypeSvc.CreateContentType(WithEnvironment(context.Background(), "preview"), CMSContentType{
		Name:   "Page",
		Slug:   "page",
		Schema: map[string]any{"fields": []map[string]any{{"name": "title", "type": "text"}}},
		Capabilities: map[string]any{
			"panel_slug": "pages",
		},
	})
	if err != nil {
		t.Fatalf("create content type failed: %v", err)
	}
	if record == nil {
		t.Fatalf("expected created content type")
	}

	repo := NewCMSContentTypeEntryRepository(adm.contentSvc, *record)
	if _, err := adm.RegisterPanel("pages@preview", adm.Panel("pages@preview").
		WithRepository(repo).
		ListFields(Field{Name: "title", Type: "text"}).
		DetailFields(Field{Name: "title", Type: "text"})); err != nil {
		t.Fatalf("register preview panel failed: %v", err)
	}

	name, panel, err := adm.resolveContentNavigationPanel(WithEnvironment(context.Background(), "preview"), "page")
	if err != nil {
		t.Fatalf("resolve content navigation panel failed: %v", err)
	}
	if panel == nil {
		t.Fatalf("expected resolved panel")
	}
	if name != "pages@preview" {
		t.Fatalf("expected pages@preview candidate, got %q", name)
	}
}

func TestCMSContentTypeChannelUsesInternalCompatibilityHelper(t *testing.T) {
	ct := CMSContentType{Environment: "preview"}
	if got := CMSContentTypeChannel(ct); got != "preview" {
		t.Fatalf("expected preview from exported compatibility helper, got %q", got)
	}
}

func TestInMemoryContentServiceBlockDefinitionsRespectEnvironmentWithInternalChannelHelper(t *testing.T) {
	content := NewInMemoryContentService()

	_, err := content.CreateBlockDefinition(WithEnvironment(context.Background(), "preview"), CMSBlockDefinition{
		Name:   "Hero",
		Slug:   "hero",
		Type:   "hero",
		Schema: map[string]any{"type": "object"},
	})
	if err != nil {
		t.Fatalf("create preview block definition failed: %v", err)
	}
	_, err = content.CreateBlockDefinition(WithEnvironment(context.Background(), "staging"), CMSBlockDefinition{
		Name:   "Sidebar",
		Slug:   "sidebar",
		Type:   "sidebar",
		Schema: map[string]any{"type": "object"},
	})
	if err != nil {
		t.Fatalf("create staging block definition failed: %v", err)
	}

	previewDefs, err := content.BlockDefinitions(WithEnvironment(context.Background(), "preview"))
	if err != nil {
		t.Fatalf("preview block definitions failed: %v", err)
	}
	if len(previewDefs) != 1 {
		t.Fatalf("expected one preview block definition, got %d", len(previewDefs))
	}
	if got := cmsadapter.BlockDefinitionChannel(previewDefs[0]); got != "preview" {
		t.Fatalf("expected preview channel, got %q", got)
	}
}
