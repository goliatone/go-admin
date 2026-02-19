package admin

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func TestBlockDefinitionDiagnosticsEndpointIncludesEnvironmentMetadata(t *testing.T) {
	server, content := setupBlockDefinitionTemplateServer(t, templateServerOptions{})

	seedCtx := context.Background()
	_, _ = content.CreateBlockDefinition(seedCtx, CMSBlockDefinition{
		ID:          "hero",
		Name:        "Hero",
		Slug:        "hero",
		Type:        "hero",
		Environment: "default",
		Schema:      map[string]any{"type": "object"},
	})
	_, _ = content.CreateBlockDefinition(seedCtx, CMSBlockDefinition{
		ID:          "rich_text",
		Name:        "Rich Text",
		Slug:        "rich_text",
		Type:        "rich_text",
		Environment: "default",
		Schema:      map[string]any{"type": "object"},
	})
	_, _ = content.CreateBlockDefinition(seedCtx, CMSBlockDefinition{
		ID:          "promo",
		Name:        "Promo",
		Slug:        "promo",
		Type:        "promo",
		Environment: "staging",
		Schema:      map[string]any{"type": "object"},
	})

	req := httptest.NewRequest("GET", "/admin/api/block_definitions_meta/diagnostics?env=staging", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}

	var payload struct {
		EffectiveEnvironment string   `json:"effective_environment"`
		RequestedEnvironment string   `json:"requested_environment"`
		TotalEffective       int      `json:"total_effective"`
		TotalDefault         int      `json:"total_default"`
		Available            []string `json:"available_environments"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if payload.EffectiveEnvironment != "staging" {
		t.Fatalf("expected effective staging, got %q", payload.EffectiveEnvironment)
	}
	if payload.RequestedEnvironment != "staging" {
		t.Fatalf("expected requested staging, got %q", payload.RequestedEnvironment)
	}
	if payload.TotalEffective != 1 {
		t.Fatalf("expected total_effective=1, got %d", payload.TotalEffective)
	}
	if payload.TotalDefault != 2 {
		t.Fatalf("expected total_default=2, got %d", payload.TotalDefault)
	}
	if len(payload.Available) < 2 || payload.Available[0] != "default" {
		t.Fatalf("expected available environments starting with default, got %v", payload.Available)
	}
}
