package admin

import (
	"testing"

	router "github.com/goliatone/go-router"
)

func TestEnrichLayoutViewContextIncludesAssetBasePath(t *testing.T) {
	view := EnrichLayoutViewContext(nil, nil, router.ViewContext{
		"base_path": "/admin",
	}, "")
	if got := view["asset_base_path"]; got != "/admin" {
		t.Fatalf("expected asset_base_path /admin, got %v", got)
	}
}

func TestEnrichLayoutViewContextPreservesActiveModule(t *testing.T) {
	view := EnrichLayoutViewContext(nil, nil, router.ViewContext{
		"base_path": "/admin",
	}, "users")
	if got := view["active"]; got != "users" {
		t.Fatalf("expected active users, got %v", got)
	}
}
