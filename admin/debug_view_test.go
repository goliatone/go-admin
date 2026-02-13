package admin

import (
	"context"
	"strings"
	"testing"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestBuildDebugViewContextAdminLayoutDerivesNavAndSession(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}
	adm, err := New(cfg, Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(
		NavigationItem{
			ID:    "admin.main.dashboard",
			Label: "Dashboard",
			Target: map[string]any{
				"path": "/admin",
				"key":  "dashboard",
			},
		},
		NavigationItem{
			ID:    "admin.main.debug",
			Label: "Debug",
			Target: map[string]any{
				"path": "/admin/debug",
				"key":  "debug",
			},
		},
	)

	actor := &auth.ActorContext{
		ActorID: "admin-1",
		Subject: "admin-1",
		Metadata: map[string]any{
			"display_name": "Admin User",
			"avatar_url":   "https://cdn.example/avatar.png",
		},
	}
	ctx := auth.WithActorContext(context.Background(), actor)
	req := newDebugViewMockContext(ctx, "/admin/debug")

	view := buildDebugViewContext(adm, DebugConfig{LayoutMode: DebugLayoutAdmin}, req, router.ViewContext{
		"debug_path": "/admin/debug",
	})

	navItems, ok := view["nav_items"].([]map[string]any)
	if !ok {
		t.Fatalf("expected nav_items []map[string]any, got %T", view["nav_items"])
	}
	if len(navItems) == 0 {
		t.Fatalf("expected nav_items to be populated")
	}
	if !containsActiveNavItem(navItems, "Debug") {
		t.Fatalf("expected debug nav item to be marked active")
	}

	sessionUser, ok := view["session_user"].(map[string]any)
	if !ok {
		t.Fatalf("expected session_user map[string]any, got %T", view["session_user"])
	}
	if got := sessionUser["display_name"]; got != "Admin User" {
		t.Fatalf("expected display_name Admin User, got %v", got)
	}
	if got := sessionUser["initial"]; got != "A" {
		t.Fatalf("expected initial A, got %v", got)
	}
	if got := sessionUser["avatar_url"]; got != "https://cdn.example/avatar.png" {
		t.Fatalf("expected avatar_url propagated, got %v", got)
	}
	if got, _ := sessionUser["is_authenticated"].(bool); !got {
		t.Fatalf("expected is_authenticated true")
	}

	caps, ok := view["translation_capabilities"].(map[string]any)
	if !ok {
		t.Fatalf("expected translation_capabilities map, got %T", view["translation_capabilities"])
	}
	if profile, _ := caps["profile"].(string); strings.TrimSpace(profile) == "" {
		t.Fatalf("expected translation_capabilities profile")
	}
}

func TestBuildDebugViewContextAdminLayoutGuestFallback(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}
	adm, err := New(cfg, Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(NavigationItem{
		ID:    "admin.main.dashboard",
		Label: "Dashboard",
		Target: map[string]any{
			"path": "/admin",
		},
	})

	req := newDebugViewMockContext(context.Background(), "/admin/debug")
	view := buildDebugViewContext(adm, DebugConfig{LayoutMode: DebugLayoutAdmin}, req, router.ViewContext{
		"debug_path": "/admin/debug",
	})

	sessionUser, ok := view["session_user"].(map[string]any)
	if !ok {
		t.Fatalf("expected session_user map[string]any, got %T", view["session_user"])
	}
	if got := sessionUser["display_name"]; got != "Guest" {
		t.Fatalf("expected Guest display_name, got %v", got)
	}
	if got := sessionUser["initial"]; got != "?" {
		t.Fatalf("expected guest initial ?, got %v", got)
	}
	if got, _ := sessionUser["is_authenticated"].(bool); got {
		t.Fatalf("expected is_authenticated false")
	}

	navItems, ok := view["nav_items"].([]map[string]any)
	if !ok {
		t.Fatalf("expected nav_items []map[string]any, got %T", view["nav_items"])
	}
	if len(navItems) == 0 {
		t.Fatalf("expected nav_items to be populated for admin layout")
	}
}

func newDebugViewMockContext(ctx context.Context, requestPath string) *router.MockContext {
	c := router.NewMockContext()
	c.On("Context").Return(ctx)
	c.On("Path").Return(requestPath)
	c.On("Query", "locale").Return("")
	c.On("Locals", "user").Return(nil)
	return c
}

func containsActiveNavItem(items []map[string]any, label string) bool {
	for _, item := range items {
		if item == nil {
			continue
		}
		if itemLabel, _ := item["label"].(string); itemLabel == label {
			if active, _ := item["active"].(bool); active {
				return true
			}
		}
		if children, ok := item["children"].([]map[string]any); ok && containsActiveNavItem(children, label) {
			return true
		}
	}
	return false
}
