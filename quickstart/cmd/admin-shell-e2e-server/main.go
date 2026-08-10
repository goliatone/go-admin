package main

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"os"
	"strings"
	"testing/fstest"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	router "github.com/goliatone/go-router"
)

const defaultListenAddress = "127.0.0.1:4179"

func main() {
	cfg := admin.Config{BasePath: "/admin", Title: "Shell Contract Host", DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		log.Fatalf("construct admin: %v", err)
	}
	adm.WithThemeProvider(e2eThemeProvider)

	hostTemplates := e2eHostTemplates()
	views, err := quickstart.NewViewEngine(
		client.Templates(),
		quickstart.WithViewTemplatesFS(hostTemplates),
		quickstart.WithViewAdmin(adm),
		quickstart.WithViewBasePath(cfg.BasePath),
		quickstart.WithViewReload(false),
	)
	if err != nil {
		log.Fatalf("construct view engine: %v", err)
	}
	dashboardRenderer := mustDashboardRenderer(hostTemplates)

	server, routes := quickstart.NewFiberServer(views, cfg, adm, false, quickstart.WithFiberLogger(false))
	quickstart.NewStaticAssets(routes, cfg, client.Assets())
	routes.Get("/healthz", func(c router.Context) error { return c.SendString("ok") })
	routes.Get("/admin/users", func(c router.Context) error {
		view := shellViewContext(adm, c, "Users", "users")
		view["resource"] = "users"
		view["resource_label"] = "Users"
		view["routes"] = map[string]any{"index": "/admin/users", "new": "/admin/users/new"}
		view["items"] = userRows(48)
		view["total"] = 48
		view["columns"] = []map[string]any{
			{"field": "name", "label": "Name", "sortable": true},
			{"field": "email", "label": "Email", "sortable": true},
			{"field": "status", "label": "Status", "sortable": true},
		}
		view["export_config"] = map[string]any{"endpoint": "/admin/exports", "definition": "users"}
		return c.Render("resources/users/list", view)
	})
	routes.Get("/admin/crud/users", func(c router.Context) error {
		return c.JSON(200, map[string]any{"data": userRows(10), "total": 48})
	})
	routes.Get("/admin/media", func(c router.Context) error {
		view := shellViewContext(adm, c, "Media", "media")
		view["media_items"] = []map[string]any{}
		view["items"] = []map[string]any{}
		view["routes"] = map[string]any{"new": "/admin/media/new"}
		return c.Render("resources/media/list", view)
	})
	routes.Get("/admin/dashboard", func(c router.Context) error {
		ctx := selectedThemeContext(c)
		partials := adm.StructuralPartials(ctx)
		page := admin.AdminDashboardPage{
			Dashboard: dashcmp.Page{
				Title: "Dashboard",
				Areas: []dashcmp.PageArea{{Slot: "main", Code: "admin.dashboard.main", Title: "Main"}},
			},
			Chrome: admin.AdminChromeState{
				Title:         "Dashboard",
				BasePath:      cfg.BasePath,
				AssetBasePath: cfg.BasePath,
				Active:        "dashboard",
				Theme:         adm.ThemePayload(ctx),
				AdminPartials: partials,
				PageHeader: admin.AdminPageHeader{
					Title:       "Dashboard",
					Subtitle:    "Renderer-owned dashboard shell",
					Breadcrumbs: []admin.AdminPageHeaderBreadcrumb{{Label: "Dashboard", Current: true}},
				},
				NavItems:    []any{map[string]any{"label": "Dashboard", "href": "/admin/dashboard", "active": true}},
				SessionUser: map[string]any{"name": "E2E Reviewer", "initials": "ER"},
			},
		}
		html, err := dashboardRenderer.RenderPage("dashboard_ssr.html", page)
		if err != nil {
			return err
		}
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString(html)
	})

	address := listenAddress()
	log.Printf("admin shell E2E host listening on http://%s", address)
	if err := server.WrappedRouter().Listen(address); err != nil {
		log.Fatal(err)
	}
}

func listenAddress() string {
	if address := strings.TrimSpace(os.Getenv("ADMIN_SHELL_E2E_ADDR")); address != "" {
		return address
	}
	return defaultListenAddress
}

func e2eHostTemplates() fstest.MapFS {
	return fstest.MapFS{
		"themes/e2e/default-breadcrumbs.html":  {Data: []byte(`<nav aria-label="Breadcrumb" class="admin-breadcrumbs" data-host-breadcrumbs="default"><ol class="admin-breadcrumbs__list"><li><a href="/admin/dashboard">Dashboard</a></li><li aria-current="page">{{ page_title|default:title }}</li></ol></nav>`)},
		"themes/e2e/contrast-breadcrumbs.html": {Data: []byte(`<nav aria-label="Breadcrumb" class="admin-breadcrumbs" data-host-breadcrumbs="contrast"><ol class="admin-breadcrumbs__list"><li><a href="/admin/dashboard">Operations</a></li><li aria-current="page">{{ page_title|default:title }}</li></ol></nav>`)},
		"themes/e2e/footer.html":               {Data: []byte(`<footer class="admin-shell-footer border-t px-8 py-3" data-admin-shell-footer data-host-footer>Host contract footer</footer>`)},
	}
}

func mustDashboardRenderer(templates fs.FS) admin.DashboardRenderer {
	renderer, err := quickstart.NewDashboardTemplateRenderer(quickstart.WithDashboardTemplatesFS(templates))
	if err != nil {
		log.Fatalf("construct dashboard renderer: %v", err)
	}
	return renderer
}

func e2eThemeProvider(_ context.Context, selector admin.ThemeSelector) (*admin.ThemeSelection, error) {
	variant := strings.TrimSpace(selector.Variant)
	if variant == "" {
		variant = "default"
	}
	if variant != "default" && variant != "contrast" {
		variant = "default"
	}
	header := "#ffffff"
	shell := "#f9fafb"
	if variant == "contrast" {
		header = "#1f2937"
		shell = "#111827"
	}
	return &admin.ThemeSelection{
		Name:    "e2e-host",
		Variant: variant,
		Tokens: map[string]string{
			"admin.header.background": header,
			"admin.shell.background":  shell,
		},
		Partials: map[string]string{
			admin.AdminPartialPageBreadcrumbs: fmt.Sprintf("themes/e2e/%s-breadcrumbs.html", variant),
			admin.AdminPartialShellFooter:     "themes/e2e/footer.html",
		},
	}, nil
}

func shellViewContext(adm *admin.Admin, c router.Context, title, active string) router.ViewContext {
	view := router.ViewContext{
		"title":         "Shell Contract Host",
		"page_title":    title,
		"page_subtitle": "Rendered by the quickstart host view engine",
		"breadcrumbs":   []map[string]any{{"label": "Dashboard", "href": "/admin/dashboard"}, {"label": title, "current": true}},
		"nav_items": []map[string]any{
			{"label": "Dashboard", "href": "/admin/dashboard", "active": active == "dashboard"},
			{"label": "Users", "href": "/admin/users", "active": active == "users"},
			{"label": "Media", "href": "/admin/media", "active": active == "media"},
		},
		"nav_utility_items": []map[string]any{},
		"session_user":      map[string]any{"name": "E2E Reviewer", "initials": "ER"},
	}
	view = admin.EnrichLayoutViewContext(adm, c, view, active)
	return quickstart.WithThemeContext(view, adm, c)
}

func selectedThemeContext(c router.Context) context.Context {
	ctx := context.Background()
	if c != nil && c.Context() != nil {
		ctx = c.Context()
	}
	if c == nil {
		return ctx
	}
	selector := admin.ThemeSelector{Name: strings.TrimSpace(c.Query("theme")), Variant: strings.TrimSpace(c.Query("variant"))}
	if selector.Name == "" {
		selector.Name = strings.TrimSpace(c.Header("X-Admin-Theme"))
	}
	if selector.Variant == "" {
		selector.Variant = strings.TrimSpace(c.Header("X-Admin-Theme-Variant"))
	}
	return admin.WithThemeSelection(ctx, selector)
}

func userRows(count int) []map[string]any {
	rows := make([]map[string]any, 0, count)
	for index := range count {
		rows = append(rows, map[string]any{
			"id":         fmt.Sprintf("user-%02d", index+1),
			"email":      fmt.Sprintf("reviewer-%02d@example.test", index+1),
			"name":       fmt.Sprintf("Reviewer %02d", index+1),
			"status":     "active",
			"created_at": "2026-08-10",
		})
	}
	return rows
}
