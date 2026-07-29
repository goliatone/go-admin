package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	urlkit "github.com/goliatone/go-urlkit"
)

type preferencesAPIHelperAuthorizer map[string]bool

func (a preferencesAPIHelperAuthorizer) Can(_ context.Context, action, _ string) bool {
	return a[action]
}

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

func TestResolveAdminPanelAPIBulkBasePathUsesURLKitPanelBulkRoute(t *testing.T) {
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
							"errors":     "/errors",
							"panel.bulk": "/panels/:panel/bulk/:action",
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
	got := resolveAdminPanelAPIBulkBasePath(manager, cfg, "/admin", "pages@staging")
	if got != "/admin/api/panels/pages/bulk" {
		t.Fatalf("expected /admin/api/panels/pages/bulk, got %q", got)
	}
}

func TestResolveAdminPanelAPIBulkBasePathFallsBackToCollectionBulkPath(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	got := resolveAdminPanelAPIBulkBasePath(nil, cfg, "/admin", "news")
	if got != "/admin/api/panels/news/bulk" {
		t.Fatalf("expected /admin/api/panels/news/bulk fallback, got %q", got)
	}
}

func TestResolveRoutePathDoesNotDoublePrefixBackfilledAdminAPIPaths(t *testing.T) {
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
							"errors":               "/errors",
							"translations.my_work": "/admin/api/translations/my-work",
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}

	if got := resolveRoutePath(manager, "admin.api", "translations.my_work"); got != "/admin/api/translations/my-work" {
		t.Fatalf("expected rooted backfill path without double prefix, got %q", got)
	}
}

func TestResolveAuthorizedAdminPreferencesAPICollectionPath(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin"}
	tests := []struct {
		name         string
		allowed      preferencesAPIHelperAuthorizer
		wantEndpoint string
		wantWritable bool
	}{
		{
			name:    "read denied",
			allowed: preferencesAPIHelperAuthorizer{},
		},
		{
			name: "read only",
			allowed: preferencesAPIHelperAuthorizer{
				admin.PermAdminPreferencesView: true,
			},
			wantEndpoint: "/admin/api/panels/preferences",
		},
		{
			name: "read and write",
			allowed: preferencesAPIHelperAuthorizer{
				admin.PermAdminPreferencesView: true,
				admin.PermAdminPreferencesEdit: true,
			},
			wantEndpoint: "/admin/api/panels/preferences",
			wantWritable: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adm, err := admin.New(cfg, admin.Dependencies{
				FeatureGate: buildFeatureGate(cfg, map[string]bool{
					string(admin.FeaturePreferences): true,
				}, nil),
			})
			if err != nil {
				t.Fatalf("new admin: %v", err)
			}
			adm.WithAuthorizer(tt.allowed)
			routeRecorder, ok := any(adm).(interface {
				RecordMountedPanelRoutes([]string)
			})
			if !ok {
				t.Skip("root module predates request-scoped Preferences route capabilities")
			}
			routeRecorder.RecordMountedPanelRoutes([]string{"preferences"})

			endpoint, writable := resolveAuthorizedAdminPreferencesAPICollectionPath(
				adm,
				cfg,
				cfg.BasePath,
				context.Background(),
			)
			if endpoint != tt.wantEndpoint || writable != tt.wantWritable {
				t.Fatalf(
					"got endpoint=%q writable=%t; want endpoint=%q writable=%t",
					endpoint,
					writable,
					tt.wantEndpoint,
					tt.wantWritable,
				)
			}
		})
	}
}
