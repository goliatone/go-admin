package handlers

import (
	"testing"

	urlkit "github.com/goliatone/go-urlkit"
)

func TestBuildRouteSetUsesResolverNamespaces(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/suite",
				Routes: map[string]string{
					"dashboard": "/",
				},
				Groups: []urlkit.GroupConfig{
					{
						Name: "api",
						Path: "/api",
						Groups: []urlkit.GroupConfig{
							{
								Name: "v9",
								Path: "/v9",
								Routes: map[string]string{
									"errors": "/errors",
								},
							},
						},
					},
				},
			},
			{
				Name: "public",
				Groups: []urlkit.GroupConfig{
					{
						Name: "api",
						Path: "/api",
						Groups: []urlkit.GroupConfig{
							{
								Name: "v3",
								Path: "/v3",
								Routes: map[string]string{
									"preview": "/preview/:token",
								},
							},
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}

	routes := BuildRouteSet(manager, "/admin-fallback", "admin.api.v9")

	if routes.AdminStatus != "/suite/esign" {
		t.Fatalf("expected admin route /suite/esign, got %q", routes.AdminStatus)
	}
	if routes.AdminAPIStatus != "/suite/api/v9/esign/status" {
		t.Fatalf("expected admin api route /suite/api/v9/esign/status, got %q", routes.AdminAPIStatus)
	}
	if routes.SignerSession != "/api/v1/esign/signing/session/:token" {
		t.Fatalf("expected signer route fallback /api/v1/esign/signing/session/:token, got %q", routes.SignerSession)
	}
}

func TestBuildRouteSetFallbacksWhenResolverMissing(t *testing.T) {
	routes := BuildRouteSet(nil, "/admin", "admin.api.v1")

	if routes.AdminStatus != "/admin/esign" {
		t.Fatalf("expected /admin/esign, got %q", routes.AdminStatus)
	}
	if routes.AdminAPIStatus != "/admin/api/v1/esign/status" {
		t.Fatalf("expected /admin/api/v1/esign/status, got %q", routes.AdminAPIStatus)
	}
	if routes.SignerSession != "/api/v1/esign/signing/session/:token" {
		t.Fatalf("expected /api/v1/esign/signing/session/:token, got %q", routes.SignerSession)
	}
}
