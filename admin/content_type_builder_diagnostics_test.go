package admin

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func TestBlockDefinitionDiagnosticsEndpointIncludesChannelMetadata(t *testing.T) {
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

	req := httptest.NewRequest("GET", "/admin/api/block_definitions_meta/diagnostics?channel=staging", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}

	var payload struct {
		EffectiveChannel string   `json:"effective_channel"`
		RequestedChannel string   `json:"requested_channel"`
		TotalEffective   int      `json:"total_effective"`
		TotalDefault     int      `json:"total_default"`
		Available        []string `json:"available_channels"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if payload.EffectiveChannel != "staging" {
		t.Fatalf("expected effective staging, got %q", payload.EffectiveChannel)
	}
	if payload.RequestedChannel != "staging" {
		t.Fatalf("expected requested staging, got %q", payload.RequestedChannel)
	}
	if payload.TotalEffective != 1 {
		t.Fatalf("expected total_effective=1, got %d", payload.TotalEffective)
	}
	if payload.TotalDefault != 2 {
		t.Fatalf("expected total_default=2, got %d", payload.TotalDefault)
	}
	if len(payload.Available) < 2 || payload.Available[0] != "default" {
		t.Fatalf("expected available channels starting with default, got %v", payload.Available)
	}
}

func TestBlockDefinitionDiagnosticsEndpointFallsBackToLegacyEnvQuery(t *testing.T) {
	server, _ := setupBlockDefinitionTemplateServer(t, templateServerOptions{})

	req := httptest.NewRequest("GET", "/admin/api/block_definitions_meta/diagnostics?env=staging", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}

	var payload struct {
		RequestedChannel string `json:"requested_channel"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if payload.RequestedChannel != "staging" {
		t.Fatalf("expected legacy env query fallback to staging, got requested_channel=%q", payload.RequestedChannel)
	}
}
