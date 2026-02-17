package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	urlkit "github.com/goliatone/go-urlkit"
)

func TestResolveAdminPanelAPICollectionPathUsesURLKitPanelRoute(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/admin",
				Groups: []urlkit.GroupConfig{
					{
						Name: "api",
						Path: "/api",
						Routes: map[string]string{
							"errors": "/errors",
							"panel":  "/panels/:panel",
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}

	cfg := admin.Config{BasePath: "/admin"}
	got := resolveAdminPanelAPICollectionPath(manager, cfg, "/admin", "pages@staging")
	if got != "/admin/api/panels/pages" {
		t.Fatalf("expected /admin/api/panels/pages, got %q", got)
	}
}

func TestResolveAdminPanelAPIDetailPathUsesURLKitPanelRoute(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/admin",
				Groups: []urlkit.GroupConfig{
					{
						Name: "api",
						Path: "/api",
						Routes: map[string]string{
							"errors":   "/errors",
							"panel.id": "/panels/:panel/:id",
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}

	cfg := admin.Config{BasePath: "/admin"}
	got := resolveAdminPanelAPIDetailPath(manager, cfg, "/admin", "roles", "role_1")
	if got != "/admin/api/panels/roles/role_1" {
		t.Fatalf("expected /admin/api/panels/roles/role_1, got %q", got)
	}
}

func TestResolveAdminPanelAPICollectionPathFallsBackToCanonicalPanelsPath(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	got := resolveAdminPanelAPICollectionPath(nil, cfg, "/admin", "news")
	if got != "/admin/api/panels/news" {
		t.Fatalf("expected /admin/api/panels/news fallback, got %q", got)
	}
}
