package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestQuickstartDoctorBlockDefinitionsCheckPassesWhenRequiredSeedsExist(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}

	content := adm.ContentService()
	if content == nil {
		t.Fatalf("content service unavailable")
	}

	ctx := admin.WithEnvironment(context.Background(), defaultEnvironmentKey)
	if _, err := content.CreateBlockDefinition(ctx, admin.CMSBlockDefinition{
		ID:          "hero",
		Name:        "Hero",
		Slug:        "hero",
		Type:        "hero",
		Environment: defaultEnvironmentKey,
		Schema:      map[string]any{"type": "object"},
	}); err != nil {
		t.Fatalf("seed hero: %v", err)
	}
	if _, err := content.CreateBlockDefinition(ctx, admin.CMSBlockDefinition{
		ID:          "rich_text",
		Name:        "Rich Text",
		Slug:        "rich_text",
		Type:        "rich_text",
		Environment: defaultEnvironmentKey,
		Schema:      map[string]any{"type": "object"},
	}); err != nil {
		t.Fatalf("seed rich_text: %v", err)
	}

	output := quickstartDoctorBlockDefinitionsCheck().Run(context.Background(), adm)
	if len(output.Findings) != 0 {
		t.Fatalf("expected no findings, got %+v", output.Findings)
	}
}

func TestQuickstartDoctorBlockDefinitionsCheckReportsMissingSeeds(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}

	content := adm.ContentService()
	if content == nil {
		t.Fatalf("content service unavailable")
	}

	ctx := admin.WithEnvironment(context.Background(), defaultEnvironmentKey)
	if _, err := content.CreateBlockDefinition(ctx, admin.CMSBlockDefinition{
		ID:          "hero",
		Name:        "Hero",
		Slug:        "hero",
		Type:        "hero",
		Environment: defaultEnvironmentKey,
		Schema:      map[string]any{"type": "object"},
	}); err != nil {
		t.Fatalf("seed hero: %v", err)
	}

	output := quickstartDoctorBlockDefinitionsCheck().Run(context.Background(), adm)
	if len(output.Findings) == 0 {
		t.Fatalf("expected missing-seed findings")
	}
	if output.Findings[0].Code != "quickstart.blocks.seed_missing" {
		t.Fatalf("expected missing seed code, got %q", output.Findings[0].Code)
	}
}
