package quickstart

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type doctorBlocksListRepoStub struct {
	visible int
}

func (r *doctorBlocksListRepoStub) List(_ context.Context, _ admin.ListOptions) ([]map[string]any, int, error) {
	if r.visible < 0 {
		r.visible = 0
	}
	items := make([]map[string]any, 0, r.visible)
	for i := 0; i < r.visible; i++ {
		items = append(items, map[string]any{
			"id":   i,
			"name": "stub",
		})
	}
	return items, r.visible, nil
}

func (r *doctorBlocksListRepoStub) Get(_ context.Context, _ string) (map[string]any, error) {
	return nil, admin.ErrNotFound
}

func (r *doctorBlocksListRepoStub) Create(_ context.Context, _ map[string]any) (map[string]any, error) {
	return nil, admin.ErrNotFound
}

func (r *doctorBlocksListRepoStub) Update(_ context.Context, _ string, _ map[string]any) (map[string]any, error) {
	return nil, admin.ErrNotFound
}

func (r *doctorBlocksListRepoStub) Delete(_ context.Context, _ string) error {
	return admin.ErrNotFound
}

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

func TestQuickstartDoctorBlockDefinitionsCheckReportsVisibilityMismatch(t *testing.T) {
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

	if err := adm.UnregisterPanel("block_definitions"); err != nil && !errors.Is(err, admin.ErrNotFound) {
		t.Fatalf("unregister block_definitions panel: %v", err)
	}
	if _, err := adm.RegisterPanel("block_definitions", adm.Panel("block_definitions").WithRepository(&doctorBlocksListRepoStub{visible: 0})); err != nil {
		t.Fatalf("register block_definitions mismatch panel: %v", err)
	}

	output := quickstartDoctorBlockDefinitionsCheck().Run(context.Background(), adm)
	for _, finding := range output.Findings {
		if finding.Code == "quickstart.blocks.visibility_mismatch" {
			return
		}
	}
	t.Fatalf("expected visibility mismatch finding, got %+v", output.Findings)
}
