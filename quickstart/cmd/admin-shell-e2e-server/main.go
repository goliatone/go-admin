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
	quickstart.NewStaticAssets(routes, cfg, client.Assets(), quickstart.WithExtraAssetsFS(fstest.MapFS{
		"dist/product/gallery.css": {Data: []byte(`[data-component-gallery]{padding:2rem;overflow:auto}.gallery-section{margin-bottom:1.5rem}`)},
	}))
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
	routes.Get("/admin/activity", func(c router.Context) error {
		view := shellViewContext(adm, c, "Activity", "activity")
		view["activity_api_path"] = "/admin/api/activity"
		return c.Render("resources/activity/list", view)
	})
	routes.Get("/admin/feature-flags", func(c router.Context) error {
		view := shellViewContext(adm, c, "Feature Flags", "feature-flags")
		view["feature_flags_api_path"] = "/admin/api/feature-flags"
		return c.Render("resources/feature-flags/index", view)
	})
	routes.Get("/admin/translations", func(c router.Context) error {
		view := shellViewContext(adm, c, "Translation Dashboard", "translations")
		view["translation_dashboard_ssr"] = map[string]any{
			"ErrorState": map[string]any{"title": "Fixture data", "description": "Browser contract host"},
		}
		return c.Render("resources/translations/dashboard", view)
	})
	routes.Get("/admin/extensions/reports", func(c router.Context) error {
		view := shellViewContext(adm, c, "Reports", "reports")
		return c.Render("e2e/downstream", view)
	})
	routes.Get("/admin/component-gallery", componentGalleryHandler(adm))
	routes.Get("/admin/dashboard", dashboardHandler(adm, cfg, dashboardRenderer))

	address := listenAddress()
	log.Printf("admin shell E2E host listening on http://%s", address)
	if err := server.WrappedRouter().Listen(address); err != nil {
		log.Fatal(err)
	}
}

func componentGalleryHandler(adm *admin.Admin) router.HandlerFunc {
	return func(c router.Context) error {
		view := shellViewContext(adm, c, "Component Gallery", "component-gallery")
		view["gallery_actions"] = []map[string]any{
			{"key": "view", "label": "View", "href": "/admin/component-gallery"},
			{"divider": true},
			{"key": "delete", "label": "Delete", "variant": "danger", "disabled": true, "disabled_reason": "Fixture disabled"},
		}
		view["gallery_filters"] = []map[string]any{
			{"name": "query", "label": "Query", "type": "text", "current_value": ""},
			{"name": "status", "label": "Status", "type": "select", "options": []map[string]any{{"value": "active", "label": "Active"}}},
		}
		view["gallery_quick_filters"] = []map[string]any{
			{"value": "", "label": "All", "href": "/admin/component-gallery", "tone": "neutral", "count": 4},
			{"value": "ready", "label": "Ready", "href": "/admin/component-gallery?state=ready", "tone": "success", "count": 2},
			{"value": "waiting", "label": "Waiting", "href": "/admin/component-gallery?state=waiting", "tone": "warning", "count": 3},
			{"value": "noted", "label": "Noted", "href": "/admin/component-gallery?state=noted", "tone": "info", "count": 5},
			{"value": "blocked", "label": "Blocked", "href": "/admin/component-gallery?state=blocked", "tone": "error", "count": 1},
			{"value": "danger", "label": "Danger", "href": "/admin/component-gallery?state=danger", "tone": "danger", "count": 1},
		}
		view["gallery_active"] = strings.TrimSpace(c.Query("state"))
		return c.Render("e2e/component-gallery", view)
	}
}

func dashboardHandler(adm *admin.Admin, cfg admin.Config, dashboardRenderer admin.DashboardRenderer) router.HandlerFunc {
	return func(c router.Context) error {
		ctx := selectedThemeContext(c)
		partials := adm.StructuralPartials(ctx)
		page := admin.AdminDashboardPage{
			Dashboard: dashcmp.Page{
				Title: "Dashboard",
				Areas: []dashcmp.PageArea{{Slot: "main", Code: "admin.dashboard.main", Title: "Main"}},
			},
			Chrome: admin.AdminChromeState{
				Page: admin.AdminPageChrome{
					Header: admin.AdminPageHeader{
						Title:       "Dashboard",
						Subtitle:    "Renderer-owned dashboard shell",
						Breadcrumbs: []admin.AdminPageHeaderBreadcrumb{{Label: "Dashboard", Current: true}},
					},
					Active: "dashboard",
				},
				BasePath:      cfg.BasePath,
				AssetBasePath: cfg.BasePath,
				Theme:         adm.ThemePayload(ctx),
				AdminPartials: partials,
				NavItems:      []any{map[string]any{"label": "Dashboard", "href": "/admin/dashboard", "active": true}},
				SessionUser:   map[string]any{"name": "E2E Reviewer", "initials": "ER"},
			},
		}
		html, err := dashboardRenderer.RenderPage("dashboard_ssr.html", page)
		if err != nil {
			return err
		}
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString(html)
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
		"e2e/downstream.html":                  {Data: []byte(`{% extends "layout.html" %}{% block content %}<div class="admin-page-content flex-1 overflow-y-auto p-8" data-route-family="downstream"><p>Typed downstream extension</p></div>{% endblock %}`)},
		"e2e/component-gallery.html": {Data: []byte(`{% extends "layout.html" %}
{% block head_extra %}<link rel="stylesheet" href="{{ asset_base_path }}/assets/dist/product/gallery.css" data-product-styles>{% endblock %}
{% block content %}
<main class="admin-page-content" data-component-gallery>
  <section class="gallery-section" data-gallery-modal><h2>Modal</h2><button id="gallery-open-modal" class="btn btn-primary">Open modal</button></section>
  <section class="gallery-section" data-gallery-action-menu><h2>Action menu</h2>{% include "partials/action-menu.html" with actions=gallery_actions trigger_label="Gallery actions" %}</section>
  <section class="gallery-section" data-gallery-status><h2>Status</h2>{% include "partials/status-badge.html" with badge_status="active" %}{% include "partials/status-badge.html" with badge_status="blocked" %}</section>
  <section class="gallery-section" data-gallery-filter-panel><h2>Filter panel</h2>{% include "partials/filter-panel.html" with filters=gallery_filters form_action="/admin/component-gallery" clear_url="/admin/component-gallery" trigger_label="Gallery filters" open=true %}</section>
  <section class="gallery-section" data-gallery-quick-filters><h2>Quick filters</h2>{% include "partials/quick-filters.html" with filters=gallery_quick_filters active_value=gallery_active label="Gallery states" %}</section>
  <section class="gallery-section" data-gallery-buttons><button class="btn btn-primary">Primary</button><button class="btn btn-secondary">Secondary</button><button class="btn btn-primary" disabled>Disabled</button></section>
</main>
{% endblock %}
{% block scripts %}<script type="module">
import { Modal } from '{{ asset_base_path }}/assets/dist/components/modal.js';
import { initActionMenus } from '{{ asset_base_path }}/assets/dist/shared/action-menu.js';
initActionMenus(document);
class GalleryModal extends Modal {
  renderContent() { return '<div class="go-admin-modal__body"><button type="button" data-modal-focus>Focusable content</button></div>'; }
  bindContentEvents() {}
}
const modal = new GalleryModal({ ariaLabel: 'Gallery dialog', initialFocus: '[data-modal-focus]' });
document.querySelector('#gallery-open-modal')?.addEventListener('click', () => modal.show());
</script>{% endblock %}`)},
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
	if variant != "default" && variant != "light" && variant != "dark" && variant != "contrast" {
		variant = "default"
	}
	header := "#ffffff"
	shell := "#f9fafb"
	text := "#1e293b"
	ring := "#2563eb"
	if variant == "dark" {
		header = "#111827"
		shell = "#0f172a"
		text = "#e2e8f0"
		ring = "#60a5fa"
	}
	if variant == "contrast" {
		header = "#1f2937"
		shell = "#111827"
		text = "#f9fafb"
		ring = "#fbbf24"
	}
	breadcrumbVariant := "default"
	if variant == "contrast" {
		breadcrumbVariant = "contrast"
	}
	tokens := map[string]string{
		"admin.header.background":      header,
		"admin.shell.background":       shell,
		"admin.modal.surface":          header,
		"admin.modal.radius":           "18px",
		"admin.modal.shadow":           "0 20px 40px rgba(0, 0, 0, 0.35)",
		"admin.modal.padding-block":    "18px",
		"admin.modal.padding-inline":   "24px",
		"admin.modal.viewport-padding": "12px",
		"admin.modal.max-height":       "70vh",
		"admin.modal.width":            "40rem",
		"admin.action-menu.surface":    header,
		"admin.filter.surface":         shell,
		"admin.status.surface":         shell,
	}
	if strings.TrimSpace(selector.Name) != "portable-defaults" {
		tokens["admin.quick-filter.surface"] = shell
		tokens["admin.quick-filter.text"] = text
		tokens["admin.quick-filter.ring"] = ring
	}
	return &admin.ThemeSelection{
		Name:    "e2e-host",
		Variant: variant,
		Tokens:  tokens,
		Partials: map[string]string{
			admin.AdminPartialPageBreadcrumbs: fmt.Sprintf("themes/e2e/%s-breadcrumbs.html", breadcrumbVariant),
			admin.AdminPartialShellFooter:     "themes/e2e/footer.html",
		},
	}, nil
}

func shellViewContext(adm *admin.Admin, c router.Context, title, active string) router.ViewContext {
	view := router.ViewContext{
		"title": "Shell Contract Host",
		"nav_items": []map[string]any{
			{"label": "Dashboard", "href": "/admin/dashboard", "active": active == "dashboard"},
			{"label": "Users", "href": "/admin/users", "active": active == "users"},
			{"label": "Media", "href": "/admin/media", "active": active == "media"},
			{"label": "Activity", "href": "/admin/activity", "active": active == "activity"},
			{"label": "Feature Flags", "href": "/admin/feature-flags", "active": active == "feature-flags"},
			{"label": "Translations", "href": "/admin/translations", "active": active == "translations"},
			{"label": "Components", "href": "/admin/component-gallery", "active": active == "component-gallery"},
		},
		"nav_utility_items": []map[string]any{},
		"session_user":      map[string]any{"name": "E2E Reviewer", "initials": "ER"},
	}
	view = admin.EnrichLayoutViewContextWithChrome(adm, c, view, admin.AdminPageChrome{
		Header: admin.AdminPageHeader{
			Title:       title,
			Subtitle:    "Rendered by the quickstart host view engine",
			Breadcrumbs: []admin.AdminPageHeaderBreadcrumb{{Label: "Dashboard", Href: "/admin/dashboard"}, {Label: title, Current: true}},
		},
		Active: active,
	})
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
