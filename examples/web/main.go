package main

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"path"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-crud"
	"github.com/goliatone/go-formgen"
	formgenmodel "github.com/goliatone/go-formgen/pkg/model"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/goliatone/go-router"
	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

const (
	userFormSource      = "users.json"
	createUserOperation = "createUser"
	updateUserOperation = "updateUser"
)

//go:embed assets/* templates/* openapi/*
var webFS embed.FS

func main() {
	cfg := admin.Config{
		Title:         "Enterprise Admin",
		BasePath:      "/admin",
		DefaultLocale: "en",
		Theme:         "admin",
		ThemeVariant:  "light",
		ThemeTokens: map[string]string{
			"primary": "#2563eb",
			"accent":  "#f59e0b",
		},
		Features: admin.Features{
			Dashboard:     true,
			CMS:           true,
			Commands:      true,
			Settings:      true,
			Search:        true,
			Notifications: true,
			Jobs:          true,
			Media:         true,
		},
	}

	// Initialize data stores with seed data
	stores := initializeDataStores()

	adm := admin.New(cfg)

	// Setup translator
	adm.WithTranslator(&simpleTranslator{
		translations: map[string]map[string]string{
			"en": {
				"modules.dashboard.name":        "Dashboard Module",
				"modules.dashboard.description": "Main dashboard with widgets",
				"modules.dashboard.label":       "Dashboard",
				"modules.users.name":            "Users Module",
				"modules.users.description":     "User management",
				"modules.users.label":           "Users",
				"modules.pages.name":            "Pages Module",
				"modules.pages.description":     "Page management",
				"modules.pages.label":           "Pages",
				"modules.posts.name":            "Posts Module",
				"modules.posts.description":     "Blog post management",
				"modules.posts.label":           "Posts",
				"modules.media.name":            "Media Module",
				"modules.media.description":     "Media library",
				"modules.media.label":           "Media",
			},
		},
	})

	// Setup authentication and authorization
	setupAuth(adm, stores)

	// Setup theme provider
	adm.WithThemeProvider(func(ctx context.Context, selector admin.ThemeSelector) (*admin.ThemeSelection, error) {
		selection := &admin.ThemeSelection{
			Name:       selector.Name,
			Variant:    selector.Variant,
			Tokens:     map[string]string{"primary": "#2563eb", "accent": "#f59e0b"},
			Assets:     map[string]string{"logo": path.Join(cfg.BasePath, "assets/logo.svg")},
			ChartTheme: selector.Variant,
		}
		if selection.Name == "" {
			selection.Name = "admin"
		}
		return selection, nil
	})

	openapiFS := mustSubFS(webFS, "openapi")
	formGenerator := newUserFormGenerator(openapiFS)
	if formGenerator == nil {
		log.Fatalf("failed to initialize form generator")
	}

	viewCfg := newWebViewConfig(webFS)
	viewEngine, err := router.InitializeViewEngine(viewCfg)
	if err != nil {
		log.Fatalf("failed to initialize view engine: %v", err)
	}

	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		app := fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: true,
			StrictRouting:     false,
			PassLocalsToViews: true,
			Views:             viewEngine,
		})
		app.Use(fiberlogger.New())
		return app
	})
	r := server.Router()

	assetsFS := mustSubFS(webFS, "assets")

	// Static assets
	if assetsFS != nil {
		r.Static(path.Join(cfg.BasePath, "assets"), ".", router.Static{
			FS:   assetsFS,
			Root: ".",
		})
	}

	// Setup Dashboard
	setupDashboard(adm, stores)

	// Note: RegisterCMSDemoPanels() is commented out to avoid duplicate menu items.
	// Modules now contribute their own panels and menu items.
	// if err := adm.RegisterCMSDemoPanels(); err != nil {
	// 	log.Fatalf("failed to register CMS demo panels: %v", err)
	// }

	// Register modules (menus and panels are contributed from modules)
	modules := []admin.Module{
		&dashboardModule{menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
		&usersModule{store: stores.users, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
		&pagesModule{store: stores.pages, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
		&postsModule{store: stores.posts, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
		&notificationsModule{menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
		&mediaModule{store: stores.media, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
	}
	for _, mod := range modules {
		if err := adm.RegisterModule(mod); err != nil {
			log.Fatalf("failed to register module %s: %v", mod.Manifest().ID, err)
		}
	}

	// Setup Search
	setupSearch(adm, stores)

	// Setup Settings
	setupSettings(adm)

	// Setup Jobs
	setupJobs(adm, stores)

	if err := adm.Initialize(r); err != nil {
		log.Fatalf("failed to initialize admin: %v", err)
	}

	// Seed notifications and activity
	seedNotificationsAndActivity(adm, stores)

	// go-crud controller for users (JSON API)
	userController := crud.NewController(stores.users.repo)
	crudAPI := r.Group(path.Join(cfg.BasePath, "crud/users"))
	crudAdapter := crud.NewGoRouterAdapter(crudAPI)
	userController.RegisterRoutes(crudAdapter)

	// HTML routes
	// Dashboard
	r.Get(cfg.BasePath, func(c router.Context) error {
		ctx := router.ViewContext{
			"title":     cfg.Title,
			"base_path": cfg.BasePath,
		}
		return c.Render("admin", withNav(ctx, adm, cfg, "dashboard"))
	})

	// Notifications center
	r.Get(path.Join(cfg.BasePath, "notifications"), func(c router.Context) error {
		return c.Render("notifications", withNav(router.ViewContext{
			"title":     cfg.Title,
			"base_path": cfg.BasePath,
		}, adm, cfg, "notifications"))
	})

	// Users list
	r.Get(path.Join(cfg.BasePath, "users"), func(c router.Context) error {
		// Get users from store
		ctx := c.Context()
		users, total, err := stores.users.List(ctx, admin.ListOptions{})
		if err != nil {
			return err
		}

		return c.Render("users-list", withNav(router.ViewContext{
			"title":       cfg.Title,
			"base_path":   cfg.BasePath,
			"users":       users,
			"total_users": total,
		}, adm, cfg, "users"))
	})

	// User create form
	r.Get(path.Join(cfg.BasePath, "users/new"), func(c router.Context) error {
		return renderUserForm(c, formGenerator, createUserOperation, adm, cfg, cfg.Title, formgenrender.RenderOptions{
			HiddenFields: map[string]string{"_action": "create"},
		})
	})

	// User create POST
	r.Post(path.Join(cfg.BasePath, "users"), func(c router.Context) error {
		ctx := c.Context()

		// Parse form data
		record := map[string]any{
			"username": c.FormValue("username"),
			"email":    c.FormValue("email"),
			"role":     c.FormValue("role"),
			"status":   c.FormValue("status"),
		}

		if _, err := stores.users.Create(ctx, record); err != nil {
			return err
		}

		// Redirect to users list
		return c.Redirect(path.Join(cfg.BasePath, "users"))
	})

	// User edit form
	r.Get(path.Join(cfg.BasePath, "users/:id/edit"), func(c router.Context) error {
		id := c.Param("id")
		ctx := c.Context()

		user, err := stores.users.Get(ctx, id)
		if err != nil {
			return err
		}

		return renderUserForm(c, formGenerator, updateUserOperation, adm, cfg, cfg.Title, formgenrender.RenderOptions{
			Values: map[string]any{
				"username": user["username"],
				"email":    user["email"],
				"role":     user["role"],
				"status":   user["status"],
			},
			HiddenFields: map[string]string{
				"id": id,
			},
		})
	})

	// User update POST
	r.Post(path.Join(cfg.BasePath, "users/:id"), func(c router.Context) error {
		id := c.Param("id")
		ctx := c.Context()

		// Parse form data
		record := map[string]any{
			"username": c.FormValue("username"),
			"email":    c.FormValue("email"),
			"role":     c.FormValue("role"),
			"status":   c.FormValue("status"),
		}

		if _, err := stores.users.Update(ctx, id, record); err != nil {
			return err
		}

		// Redirect to users list
		return c.Redirect(path.Join(cfg.BasePath, "users"))
	})

	// User detail (placed after /users/new to avoid route conflict)
	r.Get(path.Join(cfg.BasePath, "users/:id"), func(c router.Context) error {
		id := c.Param("id")
		ctx := c.Context()

		user, err := stores.users.Get(ctx, id)
		if err != nil {
			return err
		}

		return c.Render("users-detail", withNav(router.ViewContext{
			"title":     cfg.Title,
			"base_path": cfg.BasePath,
			"user":      user,
		}, adm, cfg, "users"))
	})

	// User delete
	r.Post(path.Join(cfg.BasePath, "users/:id/delete"), func(c router.Context) error {
		id := c.Param("id")
		ctx := c.Context()

		if err := stores.users.Delete(ctx, id); err != nil {
			return err
		}

		// Redirect back to users list
		return c.Redirect(path.Join(cfg.BasePath, "users"))
	})

	log.Println("Enterprise Admin available at http://localhost:8080/admin")
	log.Println("  Dashboard: /admin/api/dashboard")
	log.Println("  Navigation: /admin/api/navigation")
	log.Println("  Users: /admin/api/users")
	log.Println("  Pages: /admin/api/pages")
	log.Println("  Posts: /admin/api/posts")
	log.Println("  Media: /admin/api/media")
	log.Println("  Settings: /admin/api/settings")
	log.Println("  Search: /admin/api/search?query=...")

	if err := server.Serve(":8080"); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

// DataStores holds all in-memory data
type DataStores struct {
	users *UserStore
	pages *PageStore
	posts *PostStore
	media *MediaStore
	stats *StatsStore
}

func initializeDataStores() *DataStores {
	userStore, err := NewUserStore()
	if err != nil {
		log.Fatalf("failed to initialize user store: %v", err)
	}

	stores := &DataStores{
		users: userStore,
		pages: NewPageStore(),
		posts: NewPostStore(),
		media: NewMediaStore(),
		stats: NewStatsStore(),
	}

	// Seed initial data
	stores.users.Seed()
	stores.pages.Seed()
	stores.posts.Seed()
	stores.media.Seed()
	stores.stats.Seed()

	return stores
}

// Authentication & Authorization
func setupAuth(adm *admin.Admin, stores *DataStores) {
	// Mock authenticator
	auth := &mockAuthenticator{userStore: stores.users}
	adm.WithAuth(auth, &admin.AuthConfig{
		LoginPath:    "/admin/login",
		LogoutPath:   "/admin/logout",
		RedirectPath: "/admin",
	})

	// Mock authorizer
	authz := &mockAuthorizer{userStore: stores.users}
	adm.WithAuthorizer(authz)
}

type mockAuthenticator struct {
	userStore *UserStore
}

func (a *mockAuthenticator) Wrap(c router.Context) error {
	// Mock: always authenticate as admin user
	// In real app, check session/token
	return nil
}

type mockAuthorizer struct {
	userStore *UserStore
}

func (a *mockAuthorizer) Can(ctx context.Context, permission string, resource string) bool {
	// Mock: admin has all permissions, editor has limited
	// In real app, check user role from context
	if strings.Contains(permission, "delete") && strings.Contains(permission, "user") {
		return false // Only super admin can delete users
	}
	return true
}

// Dashboard Setup
func setupDashboard(adm *admin.Admin, stores *DataStores) {
	dash := adm.DashboardService()

	// User stats widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.user_stats",
		Name:        "User Stats",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			stats := stores.stats.GetUserStats()
			return map[string]any{
				"total":     stats["total"],
				"active":    stats["active"],
				"new_today": stats["new_today"],
				"trend":     "+12%",
				"trend_up":  true,
			}, nil
		},
	})

	// Content stats widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.content_stats",
		Name:        "Content Stats",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			stats := stores.stats.GetContentStats()
			return map[string]any{
				"published": stats["published"],
				"draft":     stats["draft"],
				"scheduled": stats["scheduled"],
			}, nil
		},
	})

	// Storage stats widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.storage_stats",
		Name:        "Storage Stats",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			stats := stores.stats.GetStorageStats()
			return map[string]any{
				"used":       stats["used"],
				"total":      stats["total"],
				"percentage": stats["percentage"],
			}, nil
		},
	})

	// Quick actions widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.quick_actions",
		Name:        "Quick Actions",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			actions := []map[string]any{
				{"label": "New Post", "url": "/admin/posts/new", "icon": "plus"},
				{"label": "New Page", "url": "/admin/pages/new", "icon": "file-plus"},
				{"label": "Upload Media", "url": "/admin/media/upload", "icon": "upload"},
				{"label": "View Settings", "url": "/admin/settings", "icon": "settings"},
			}
			return map[string]any{"actions": actions}, nil
		},
	})

	// System health widget
	dash.RegisterProvider(admin.DashboardProviderSpec{
		Code:        "admin.widget.system_health",
		Name:        "System Health",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx admin.AdminContext, cfg map[string]any) (map[string]any, error) {
			return map[string]any{
				"status":      "healthy",
				"uptime":      "7d 12h",
				"api_latency": "45ms",
				"db_status":   "connected",
			}, nil
		},
	})
}

// User Panel Setup
func newUserPanelBuilder(store *UserStore) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store).
		ListFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "username", Label: "Username", Type: "text"},
			admin.Field{Name: "email", Label: "Email", Type: "email"},
			admin.Field{Name: "role", Label: "Role", Type: "select", Options: []admin.Option{
				{Value: "admin", Label: "Administrator"},
				{Value: "editor", Label: "Editor"},
				{Value: "viewer", Label: "Viewer"},
			}},
			admin.Field{Name: "status", Label: "Status", Type: "select", Options: []admin.Option{
				{Value: "active", Label: "Active"},
				{Value: "inactive", Label: "Inactive"},
			}},
			admin.Field{Name: "created_at", Label: "Created", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "username", Label: "Username", Type: "text", Required: true},
			admin.Field{Name: "email", Label: "Email", Type: "email", Required: true},
			admin.Field{Name: "role", Label: "Role", Type: "select", Required: true, Options: []admin.Option{
				{Value: "admin", Label: "Administrator"},
				{Value: "editor", Label: "Editor"},
				{Value: "viewer", Label: "Viewer"},
			}},
			admin.Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "active", Label: "Active"},
				{Value: "inactive", Label: "Inactive"},
			}},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "username", Label: "Username", Type: "text"},
			admin.Field{Name: "email", Label: "Email", Type: "email"},
			admin.Field{Name: "role", Label: "Role", Type: "text"},
			admin.Field{Name: "status", Label: "Status", Type: "text"},
			admin.Field{Name: "created_at", Label: "Created", Type: "datetime", ReadOnly: true},
			admin.Field{Name: "last_login", Label: "Last Login", Type: "datetime", ReadOnly: true},
		).
		Filters(
			admin.Filter{Name: "role", Type: "select"},
			admin.Filter{Name: "status", Type: "select"},
		).
		BulkActions(
			admin.Action{Name: "activate", CommandName: "users.activate", Permission: "admin.users.edit"},
			admin.Action{Name: "deactivate", CommandName: "users.deactivate", Permission: "admin.users.edit"},
		)
	return builder
}

func newPagesPanelBuilder(store *PageStore) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store).
		ListFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "slug", Label: "Slug", Type: "text"},
			admin.Field{Name: "status", Label: "Status", Type: "select", Options: []admin.Option{
				{Value: "published", Label: "Published"},
				{Value: "draft", Label: "Draft"},
			}},
			admin.Field{Name: "parent_id", Label: "Parent", Type: "text"},
			admin.Field{Name: "updated_at", Label: "Updated", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
			admin.Field{Name: "slug", Label: "Slug", Type: "text", Required: true},
			admin.Field{Name: "content", Label: "Content", Type: "textarea"},
			admin.Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "published", Label: "Published"},
				{Value: "draft", Label: "Draft"},
			}},
			admin.Field{Name: "parent_id", Label: "Parent Page", Type: "text"},
			admin.Field{Name: "meta_title", Label: "SEO Title", Type: "text"},
			admin.Field{Name: "meta_description", Label: "SEO Description", Type: "textarea"},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "slug", Label: "Slug", Type: "text"},
			admin.Field{Name: "content", Label: "Content", Type: "textarea"},
			admin.Field{Name: "status", Label: "Status", Type: "text"},
			admin.Field{Name: "created_at", Label: "Created", Type: "datetime", ReadOnly: true},
			admin.Field{Name: "updated_at", Label: "Updated", Type: "datetime", ReadOnly: true},
		).
		Filters(
			admin.Filter{Name: "status", Type: "select"},
		).
		Actions(
			admin.Action{Name: "publish", CommandName: "pages.publish", Permission: "admin.pages.publish"},
		).
		BulkActions(
			admin.Action{Name: "publish", CommandName: "pages.bulk_publish", Permission: "admin.pages.publish"},
			admin.Action{Name: "unpublish", CommandName: "pages.bulk_unpublish", Permission: "admin.pages.publish"},
		)
	return builder
}

func newPostsPanelBuilder(store *PostStore) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store).
		ListFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "author", Label: "Author", Type: "text"},
			admin.Field{Name: "category", Label: "Category", Type: "select", Options: []admin.Option{
				{Value: "news", Label: "News"},
				{Value: "blog", Label: "Blog"},
				{Value: "tutorial", Label: "Tutorial"},
			}},
			admin.Field{Name: "status", Label: "Status", Type: "select", Options: []admin.Option{
				{Value: "published", Label: "Published"},
				{Value: "draft", Label: "Draft"},
				{Value: "scheduled", Label: "Scheduled"},
			}},
			admin.Field{Name: "published_at", Label: "Published", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
			admin.Field{Name: "slug", Label: "Slug", Type: "text", Required: true},
			admin.Field{Name: "content", Label: "Content", Type: "textarea", Required: true},
			admin.Field{Name: "excerpt", Label: "Excerpt", Type: "textarea"},
			admin.Field{Name: "category", Label: "Category", Type: "select", Required: true, Options: []admin.Option{
				{Value: "news", Label: "News"},
				{Value: "blog", Label: "Blog"},
				{Value: "tutorial", Label: "Tutorial"},
			}},
			admin.Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "published", Label: "Published"},
				{Value: "draft", Label: "Draft"},
				{Value: "scheduled", Label: "Scheduled"},
			}},
			admin.Field{Name: "published_at", Label: "Publish Date", Type: "datetime"},
			admin.Field{Name: "featured_image", Label: "Featured Image", Type: "text"},
			admin.Field{Name: "tags", Label: "Tags", Type: "text"},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "content", Label: "Content", Type: "textarea"},
			admin.Field{Name: "author", Label: "Author", Type: "text", ReadOnly: true},
			admin.Field{Name: "status", Label: "Status", Type: "text"},
			admin.Field{Name: "created_at", Label: "Created", Type: "datetime", ReadOnly: true},
		).
		Filters(
			admin.Filter{Name: "category", Type: "select"},
			admin.Filter{Name: "status", Type: "select"},
			admin.Filter{Name: "author", Type: "text"},
		).
		BulkActions(
			admin.Action{Name: "publish", CommandName: "posts.bulk_publish", Permission: "admin.posts.publish"},
			admin.Action{Name: "archive", CommandName: "posts.bulk_archive", Permission: "admin.posts.edit"},
		)
	return builder
}

func newMediaPanelBuilder(store *MediaStore) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store).
		ListFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "filename", Label: "Filename", Type: "text"},
			admin.Field{Name: "type", Label: "Type", Type: "select", Options: []admin.Option{
				{Value: "image", Label: "Image"},
				{Value: "document", Label: "Document"},
				{Value: "video", Label: "Video"},
			}},
			admin.Field{Name: "size", Label: "Size", Type: "text"},
			admin.Field{Name: "uploaded_by", Label: "Uploaded By", Type: "text"},
			admin.Field{Name: "uploaded_at", Label: "Uploaded", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "filename", Label: "Filename", Type: "text", Required: true, ReadOnly: true},
			admin.Field{Name: "alt_text", Label: "Alt Text", Type: "text"},
			admin.Field{Name: "caption", Label: "Caption", Type: "textarea"},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "filename", Label: "Filename", Type: "text", ReadOnly: true},
			admin.Field{Name: "type", Label: "Type", Type: "text", ReadOnly: true},
			admin.Field{Name: "size", Label: "Size", Type: "text", ReadOnly: true},
			admin.Field{Name: "url", Label: "URL", Type: "text", ReadOnly: true},
			admin.Field{Name: "uploaded_at", Label: "Uploaded", Type: "datetime", ReadOnly: true},
		).
		Filters(
			admin.Filter{Name: "type", Type: "select"},
		).
		BulkActions(
			admin.Action{Name: "delete", CommandName: "media.bulk_delete", Permission: "admin.media.delete"},
		)
	return builder
}

// Pages Panel Setup
func setupPagesPanel(adm *admin.Admin, stores *DataStores) {
	// Deprecated: kept for reference; use pagesModule instead.
	builder := newPagesPanelBuilder(stores.pages)

	adm.Commands().Register(&pagePublishCommand{store: stores.pages})
	adm.Commands().Register(&pageBulkPublishCommand{store: stores.pages})
	adm.Commands().Register(&pageBulkUnpublishCommand{store: stores.pages})

	if _, err := adm.RegisterPanel("pages", builder); err != nil {
		log.Fatalf("failed to register pages panel: %v", err)
	}
}

// Posts Panel Setup
func setupPostsPanel(adm *admin.Admin, stores *DataStores) {
	// Deprecated: kept for reference; use postsModule instead.
	builder := newPostsPanelBuilder(stores.posts)

	adm.Commands().Register(&postBulkPublishCommand{store: stores.posts})
	adm.Commands().Register(&postBulkArchiveCommand{store: stores.posts})

	if _, err := adm.RegisterPanel("posts", builder); err != nil {
		log.Fatalf("failed to register posts panel: %v", err)
	}
}

// Media Panel Setup
func setupMediaPanel(adm *admin.Admin, stores *DataStores) {
	// Deprecated: kept for reference; use mediaModule instead.
	builder := newMediaPanelBuilder(stores.media)

	adm.Commands().Register(&mediaBulkDeleteCommand{store: stores.media})

	if _, err := adm.RegisterPanel("media", builder); err != nil {
		log.Fatalf("failed to register media panel: %v", err)
	}
}

// Search Setup
func setupSearch(adm *admin.Admin, stores *DataStores) {
	search := adm.SearchService()

	// Users search adapter
	search.Register("users", &usersSearchAdapter{store: stores.users})

	// Pages search adapter
	search.Register("pages", &pagesSearchAdapter{store: stores.pages})

	// Posts search adapter
	search.Register("posts", &postsSearchAdapter{store: stores.posts})

	// Media search adapter
	search.Register("media", &mediaSearchAdapter{store: stores.media})
}

// Settings Setup
func setupSettings(adm *admin.Admin) {
	settings := adm.SettingsService()

	// General settings
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "site.name",
		Title:       "Site Name",
		Description: "Your website name",
		Default:     "My Website",
		Type:        "string",
		Group:       "general",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "site.description",
		Title:       "Site Description",
		Description: "Brief description of your website",
		Default:     "",
		Type:        "textarea",
		Group:       "general",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "site.url",
		Title:       "Site URL",
		Description: "Full URL of your website",
		Default:     "https://example.com",
		Type:        "string",
		Group:       "general",
	})

	// Email settings
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "email.from_address",
		Title:       "From Email Address",
		Description: "Default sender email address",
		Default:     "noreply@example.com",
		Type:        "string",
		Group:       "email",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "email.from_name",
		Title:       "From Name",
		Description: "Default sender name",
		Default:     "My Website",
		Type:        "string",
		Group:       "email",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "email.smtp_host",
		Title:       "SMTP Host",
		Description: "SMTP server hostname",
		Default:     "smtp.example.com",
		Type:        "string",
		Group:       "email",
	})

	// Feature flags
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "features.comments_enabled",
		Title:       "Enable Comments",
		Description: "Allow users to comment on posts",
		Default:     true,
		Type:        "boolean",
		Group:       "features",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "features.registration_enabled",
		Title:       "Enable User Registration",
		Description: "Allow new users to register",
		Default:     true,
		Type:        "boolean",
		Group:       "features",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "features.maintenance_mode",
		Title:       "Maintenance Mode",
		Description: "Put site in maintenance mode",
		Default:     false,
		Type:        "boolean",
		Group:       "features",
	})

	// Performance settings
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "performance.cache_enabled",
		Title:       "Enable Caching",
		Description: "Enable response caching",
		Default:     true,
		Type:        "boolean",
		Group:       "performance",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "performance.cache_ttl",
		Title:       "Cache TTL (seconds)",
		Description: "How long to cache responses",
		Default:     3600,
		Type:        "number",
		Group:       "performance",
	})

	// Apply default system values
	settings.Apply(context.Background(), admin.SettingsBundle{
		Scope: admin.SettingsScopeSystem,
		Values: map[string]any{
			"site.name":                     "Enterprise Admin",
			"site.url":                      "https://admin.example.com",
			"features.comments_enabled":     true,
			"features.registration_enabled": true,
		},
	})
}

// Jobs Setup
func setupJobs(adm *admin.Admin, stores *DataStores) {
	// Database backup job
	adm.Commands().Register(&databaseBackupJob{})

	// Cache cleanup job
	adm.Commands().Register(&cacheCleanupJob{})

	// Content export job
	adm.Commands().Register(&contentExportJob{stores: stores})

	// Inactive users cleanup job
	adm.Commands().Register(&inactiveUsersCleanupJob{store: stores.users})
}

// Seed Notifications and Activity
func seedNotificationsAndActivity(adm *admin.Admin, stores *DataStores) {
	ctx := context.Background()

	if svc := adm.NotificationService(); svc != nil {
		svc.Add(ctx, admin.Notification{
			Title:   "New user registered",
			Message: "john.doe@example.com just created an account",
			Read:    false,
		})
		svc.Add(ctx, admin.Notification{
			Title:   "Post published",
			Message: "Getting Started with Go was published by jane.smith",
			Read:    false,
		})
		svc.Add(ctx, admin.Notification{
			Title:   "System update available",
			Message: "Version 2.1.0 is ready to install",
			Read:    false,
		})
		svc.Add(ctx, admin.Notification{
			Title:   "Backup completed",
			Message: "Database backup finished successfully",
			Read:    true,
		})
		svc.Add(ctx, admin.Notification{
			Title:   "Storage warning",
			Message: "Storage usage is at 85%",
			Read:    false,
		})
	}

	feed := adm.ActivityFeed()
	feed.Record(ctx, admin.ActivityEntry{Actor: "jane.smith", Action: "published", Object: "post: Getting Started with Go"})
	feed.Record(ctx, admin.ActivityEntry{Actor: "john.doe", Action: "created", Object: "page: About Us"})
	feed.Record(ctx, admin.ActivityEntry{Actor: "admin", Action: "updated", Object: "settings: email configuration"})
	feed.Record(ctx, admin.ActivityEntry{Actor: "system", Action: "completed", Object: "job: database backup"})
	feed.Record(ctx, admin.ActivityEntry{Actor: "jane.smith", Action: "uploaded", Object: "media: logo.png"})
	feed.Record(ctx, admin.ActivityEntry{Actor: "system", Action: "cleaned", Object: "cache entries"})
}

func renderUserForm(c router.Context, gen *formgenorchestrator.Orchestrator, operationID string, adm *admin.Admin, cfg admin.Config, title string, opts formgenrender.RenderOptions) error {
	if gen == nil {
		return fmt.Errorf("form generator is not configured")
	}

	html, err := gen.Generate(c.Context(), formgenorchestrator.Request{
		Source:        formgenopenapi.SourceFromFS(userFormSource),
		OperationID:   operationID,
		RenderOptions: opts,
	})
	if err != nil {
		return err
	}

	isEdit := operationID == updateUserOperation

	return c.Render("users-form", withNav(router.ViewContext{
		"title":     title,
		"base_path": cfg.BasePath,
		"is_edit":   isEdit,
		"form_html": string(html),
	}, adm, cfg, "users"))
}

func withNav(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	if _, ok := ctx["base_path"]; !ok {
		ctx["base_path"] = cfg.BasePath
	}
	ctx["nav_items"] = buildNavItems(adm, cfg)
	if active != "" {
		ctx["active"] = active
	}
	return ctx
}

func buildNavItems(adm *admin.Admin, cfg admin.Config) []map[string]any {
	menuSvc := adm.MenuService()
	if menuSvc == nil {
		return nil
	}
	menuCode := cfg.NavMenuCode
	if menuCode == "" {
		menuCode = "admin.main"
	}
	menu, err := menuSvc.Menu(context.Background(), menuCode, cfg.DefaultLocale)
	if err != nil {
		return nil
	}
	items := make([]map[string]any, 0, len(menu.Items))
	for _, item := range menu.Items {
		href := cfg.BasePath
		if targetPath, ok := item.Target["path"].(string); ok && targetPath != "" {
			href = targetPath
		} else if name, ok := item.Target["name"].(string); ok && name != "" {
			trimmed := strings.TrimPrefix(name, "admin.")
			href = path.Join(cfg.BasePath, trimmed)
		}
		key := ""
		if k, ok := item.Target["key"].(string); ok && k != "" {
			key = k
		} else if name, ok := item.Target["name"].(string); ok && name != "" {
			key = strings.TrimPrefix(name, "admin.")
		} else if href != "" {
			parts := strings.Split(strings.Trim(href, "/"), "/")
			if len(parts) > 0 {
				key = parts[len(parts)-1]
			}
		}
		pos := item.Position
		if p, ok := item.Target["position"].(int); ok && p != 0 {
			pos = p
		}
		items = append(items, map[string]any{
			"label":    item.Label,
			"icon":     item.Icon,
			"href":     href,
			"key":      key,
			"position": pos,
			"badge":    item.Badge,
			"classes":  item.Classes,
			"styles":   item.Styles,
		})
	}
	sort.SliceStable(items, func(i, j int) bool {
		ival, _ := items[i]["position"].(int)
		jval, _ := items[j]["position"].(int)
		return ival < jval
	})
	return items
}

func newUserFormGenerator(openapiFS fs.FS) *formgenorchestrator.Orchestrator {
	if openapiFS == nil {
		return nil
	}

	registry := formgenrender.NewRegistry()
	vanillaRenderer, err := vanilla.New(vanilla.WithDefaultStyles())
	if err != nil {
		log.Printf("failed to initialize form renderer: %v", err)
		return nil
	}
	registry.MustRegister(vanillaRenderer)

	loader := formgen.NewLoader(formgenopenapi.WithFileSystem(openapiFS))

	return formgen.NewOrchestrator(
		formgenorchestrator.WithLoader(loader),
		formgenorchestrator.WithParser(formgen.NewParser()),
		formgenorchestrator.WithModelBuilder(formgenmodel.NewBuilder()),
		formgenorchestrator.WithRegistry(registry),
		formgenorchestrator.WithDefaultRenderer(vanillaRenderer.Name()),
	)
}

type webViewConfig struct {
	templateFS []fs.FS
	assetsFS   fs.FS
	dirFS      string
	assetsDir  string
}

func newWebViewConfig(embedded fs.FS) *webViewConfig {
	cfg := &webViewConfig{
		templateFS: []fs.FS{embedded},
		assetsFS:   embedded,
		dirFS:      "templates",
		assetsDir:  "assets",
	}

	if sub, err := fs.Sub(embedded, "templates"); err == nil {
		cfg.templateFS = []fs.FS{sub}
		cfg.dirFS = "."
	}

	if sub, err := fs.Sub(embedded, "assets"); err == nil {
		cfg.assetsFS = sub
		cfg.assetsDir = "."
	}

	return cfg
}

func (c *webViewConfig) GetReload() bool                      { return true }
func (c *webViewConfig) GetDebug() bool                       { return true }
func (c *webViewConfig) GetEmbed() bool                       { return true }
func (c *webViewConfig) GetCSSPath() string                   { return "" }
func (c *webViewConfig) GetJSPath() string                    { return "" }
func (c *webViewConfig) GetDirFS() string                     { return c.dirFS }
func (c *webViewConfig) GetDirOS() string                     { return "" }
func (c *webViewConfig) GetURLPrefix() string                 { return "" }
func (c *webViewConfig) GetTemplateFunctions() map[string]any { return nil }
func (c *webViewConfig) GetExt() string                       { return ".html" }
func (c *webViewConfig) GetAssetsFS() fs.FS                   { return c.assetsFS }
func (c *webViewConfig) GetAssetsDir() string                 { return c.assetsDir }
func (c *webViewConfig) GetTemplatesFS() []fs.FS              { return c.templateFS }
func (c *webViewConfig) GetDevDir() string                    { return "" }

// mustSubFS returns a sub-FS or nil without failing the example.
func mustSubFS(fsys embed.FS, dir string) fs.FS {
	sub, err := fs.Sub(fsys, dir)
	if err != nil {
		log.Printf("failed to access %s: %v", dir, err)
		return nil
	}
	return sub
}

// Data Stores Implementation

// User model and store backed by go-crud repository (bun/sqlite).
type User struct {
	bun.BaseModel `bun:"table:users"`
	ID            uuid.UUID `bun:"id,pk,notnull" json:"id"`
	Username      string    `bun:"username,notnull" json:"username"`
	Email         string    `bun:"email,notnull" json:"email"`
	Role          string    `bun:"role,notnull" json:"role"`
	Status        string    `bun:"status,notnull" json:"status"`
	CreatedAt     time.Time `bun:"created_at,notnull" json:"created_at"`
	LastLogin     time.Time `bun:"last_login,notnull" json:"last_login"`
}

type UserStore struct {
	repo repository.Repository[*User]
}

func NewUserStore() (*UserStore, error) {
	db, err := sql.Open("sqlite3", "file:admin-users.db?cache=shared&mode=memory")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	bundb := bun.NewDB(db, sqlitedialect.New())
	// ensure table
	ctx := context.Background()
	if _, err := bundb.NewCreateTable().Model((*User)(nil)).IfNotExists().Exec(ctx); err != nil {
		return nil, fmt.Errorf("create users table: %w", err)
	}

	handlers := repository.ModelHandlers[*User]{
		NewRecord: func() *User { return &User{} },
		GetID:     func(u *User) uuid.UUID { return u.ID },
		SetID:     func(u *User, id uuid.UUID) { u.ID = id },
		GetIdentifier: func() string {
			return "Email"
		},
		GetIdentifierValue: func(u *User) string { return u.Email },
	}

	repo := repository.NewRepository(bundb, handlers)
	return &UserStore{repo: repo}, nil
}

func (s *UserStore) Seed() {
	ctx := context.Background()
	now := time.Now()
	users := []*User{
		{ID: uuid.New(), Username: "admin", Email: "admin@example.com", Role: "admin", Status: "active", CreatedAt: now.Add(-365 * 24 * time.Hour), LastLogin: now.Add(-2 * time.Hour)},
		{ID: uuid.New(), Username: "jane.smith", Email: "jane@example.com", Role: "editor", Status: "active", CreatedAt: now.Add(-180 * 24 * time.Hour), LastLogin: now.Add(-5 * time.Hour)},
		{ID: uuid.New(), Username: "john.doe", Email: "john@example.com", Role: "editor", Status: "active", CreatedAt: now.Add(-90 * 24 * time.Hour), LastLogin: now.Add(-24 * time.Hour)},
		{ID: uuid.New(), Username: "viewer", Email: "viewer@example.com", Role: "viewer", Status: "active", CreatedAt: now.Add(-30 * 24 * time.Hour), LastLogin: now.Add(-3 * 24 * time.Hour)},
		{ID: uuid.New(), Username: "inactive.user", Email: "inactive@example.com", Role: "viewer", Status: "inactive", CreatedAt: now.Add(-200 * 24 * time.Hour), LastLogin: now.Add(-120 * time.Hour)},
	}
	for _, u := range users {
		if _, err := s.repo.Create(ctx, u); err != nil {
			log.Printf("seed user %s failed: %v", u.Username, err)
		}
	}
}

func (s *UserStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	users, total, err := s.repo.List(ctx)
	if err != nil {
		return nil, 0, err
	}

	// Apply simple search filter locally for now.
	if search, ok := opts.Filters["_search"].(string); ok && strings.TrimSpace(search) != "" {
		searchLower := strings.ToLower(search)
		filtered := make([]*User, 0, len(users))
		for _, u := range users {
			if strings.Contains(strings.ToLower(u.Username), searchLower) || strings.Contains(strings.ToLower(u.Email), searchLower) {
				filtered = append(filtered, u)
			}
		}
		users = filtered
		total = len(filtered)
	}

	results := make([]map[string]any, 0, len(users))
	for _, u := range users {
		results = append(results, userToMap(u))
	}
	return results, total, nil
}

func (s *UserStore) Get(ctx context.Context, id string) (map[string]any, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return userToMap(user), nil
}

func (s *UserStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	user := mapToUser(record)
	user.ID = uuid.New()
	user.CreatedAt = time.Now()
	user.LastLogin = time.Now()

	user, err := s.repo.Create(ctx, user)
	if err != nil {
		return nil, err
	}
	return userToMap(user), nil
}

func (s *UserStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	user.Username = asString(record["username"], user.Username)
	user.Email = asString(record["email"], user.Email)
	user.Role = asString(record["role"], user.Role)
	user.Status = asString(record["status"], user.Status)

	updated, err := s.repo.Update(ctx, user)
	if err != nil {
		return nil, err
	}
	return userToMap(updated), nil
}

func (s *UserStore) Delete(ctx context.Context, id string) error {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, user)
}

func userToMap(u *User) map[string]any {
	return map[string]any{
		"id":         u.ID.String(),
		"username":   u.Username,
		"email":      u.Email,
		"role":       u.Role,
		"status":     u.Status,
		"created_at": u.CreatedAt.Format(time.RFC3339),
		"last_login": u.LastLogin.Format(time.RFC3339),
	}
}

func mapToUser(record map[string]any) *User {
	return &User{
		Username: asString(record["username"], ""),
		Email:    asString(record["email"], ""),
		Role:     asString(record["role"], "viewer"),
		Status:   asString(record["status"], "active"),
	}
}

func asString(val any, def string) string {
	if val == nil {
		return def
	}
	if s, ok := val.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", val)
}

// PageStore manages pages
type PageStore struct {
	mu     sync.RWMutex
	pages  []map[string]any
	nextID int
}

func NewPageStore() *PageStore {
	return &PageStore{pages: []map[string]any{}, nextID: 1}
}

func (s *PageStore) Seed() {
	now := time.Now()
	s.pages = []map[string]any{
		{
			"id":               "1",
			"title":            "Home",
			"slug":             "home",
			"content":          "Welcome to our website",
			"status":           "published",
			"parent_id":        "",
			"meta_title":       "Home - Enterprise Admin",
			"meta_description": "Welcome to Enterprise Admin",
			"created_at":       now.Add(-100 * 24 * time.Hour),
			"updated_at":       now.Add(-10 * 24 * time.Hour),
		},
		{
			"id":               "2",
			"title":            "About Us",
			"slug":             "about",
			"content":          "Learn more about our company",
			"status":           "published",
			"parent_id":        "",
			"meta_title":       "About Us",
			"meta_description": "Learn more about our company",
			"created_at":       now.Add(-90 * 24 * time.Hour),
			"updated_at":       now.Add(-5 * 24 * time.Hour),
		},
		{
			"id":               "3",
			"title":            "Our Team",
			"slug":             "team",
			"content":          "Meet our team members",
			"status":           "published",
			"parent_id":        "2",
			"meta_title":       "Our Team",
			"meta_description": "Meet our team",
			"created_at":       now.Add(-80 * 24 * time.Hour),
			"updated_at":       now.Add(-3 * 24 * time.Hour),
		},
		{
			"id":               "4",
			"title":            "Contact",
			"slug":             "contact",
			"content":          "Get in touch with us",
			"status":           "published",
			"parent_id":        "",
			"meta_title":       "Contact Us",
			"meta_description": "Get in touch",
			"created_at":       now.Add(-70 * 24 * time.Hour),
			"updated_at":       now.Add(-1 * 24 * time.Hour),
		},
		{
			"id":               "5",
			"title":            "Privacy Policy",
			"slug":             "privacy",
			"content":          "Our privacy policy",
			"status":           "draft",
			"parent_id":        "",
			"meta_title":       "Privacy Policy",
			"meta_description": "Our privacy policy",
			"created_at":       now.Add(-20 * 24 * time.Hour),
			"updated_at":       now.Add(-20 * 24 * time.Hour),
		},
	}
	s.nextID = 6
}

func (s *PageStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	filtered := s.pages
	if search, ok := opts.Filters["_search"].(string); ok && search != "" {
		filtered = []map[string]any{}
		for _, p := range s.pages {
			if strings.Contains(strings.ToLower(fmt.Sprintf("%v", p["title"])), strings.ToLower(search)) ||
				strings.Contains(strings.ToLower(fmt.Sprintf("%v", p["slug"])), strings.ToLower(search)) {
				filtered = append(filtered, p)
			}
		}
	}

	return filtered, len(filtered), nil
}

func (s *PageStore) Get(ctx context.Context, id string) (map[string]any, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, p := range s.pages {
		if fmt.Sprintf("%v", p["id"]) == id {
			return p, nil
		}
	}
	return nil, admin.ErrNotFound
}

func (s *PageStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record["id"] = fmt.Sprintf("%d", s.nextID)
	record["created_at"] = time.Now()
	record["updated_at"] = time.Now()
	s.nextID++
	s.pages = append(s.pages, record)
	return record, nil
}

func (s *PageStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, p := range s.pages {
		if fmt.Sprintf("%v", p["id"]) == id {
			record["id"] = id
			record["created_at"] = p["created_at"]
			record["updated_at"] = time.Now()
			s.pages[i] = record
			return record, nil
		}
	}
	return nil, admin.ErrNotFound
}

func (s *PageStore) Delete(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, p := range s.pages {
		if fmt.Sprintf("%v", p["id"]) == id {
			s.pages = append(s.pages[:i], s.pages[i+1:]...)
			return nil
		}
	}
	return admin.ErrNotFound
}

// PostStore manages blog posts
type PostStore struct {
	mu     sync.RWMutex
	posts  []map[string]any
	nextID int
}

func NewPostStore() *PostStore {
	return &PostStore{posts: []map[string]any{}, nextID: 1}
}

func (s *PostStore) Seed() {
	now := time.Now()
	s.posts = []map[string]any{
		{
			"id":             "1",
			"title":          "Getting Started with Go",
			"slug":           "getting-started-go",
			"content":        "Learn the basics of Go programming...",
			"excerpt":        "A beginner's guide to Go",
			"author":         "jane.smith",
			"category":       "tutorial",
			"status":         "published",
			"published_at":   now.Add(-30 * 24 * time.Hour),
			"featured_image": "/media/go-tutorial.jpg",
			"tags":           "go,programming,tutorial",
			"created_at":     now.Add(-31 * 24 * time.Hour),
			"updated_at":     now.Add(-30 * 24 * time.Hour),
		},
		{
			"id":             "2",
			"title":          "Building REST APIs",
			"slug":           "building-rest-apis",
			"content":        "How to build RESTful APIs in Go...",
			"excerpt":        "REST API development guide",
			"author":         "jane.smith",
			"category":       "tutorial",
			"status":         "published",
			"published_at":   now.Add(-20 * 24 * time.Hour),
			"featured_image": "/media/rest-api.jpg",
			"tags":           "go,api,rest",
			"created_at":     now.Add(-21 * 24 * time.Hour),
			"updated_at":     now.Add(-20 * 24 * time.Hour),
		},
		{
			"id":             "3",
			"title":          "Company News: Q4 2024",
			"slug":           "company-news-q4-2024",
			"content":        "Exciting updates from Q4...",
			"excerpt":        "Our Q4 achievements",
			"author":         "john.doe",
			"category":       "news",
			"status":         "published",
			"published_at":   now.Add(-10 * 24 * time.Hour),
			"featured_image": "/media/news.jpg",
			"tags":           "news,company",
			"created_at":     now.Add(-11 * 24 * time.Hour),
			"updated_at":     now.Add(-10 * 24 * time.Hour),
		},
		{
			"id":             "4",
			"title":          "Database Optimization Tips",
			"slug":           "database-optimization",
			"content":        "Tips for optimizing database queries...",
			"excerpt":        "Improve your database performance",
			"author":         "jane.smith",
			"category":       "blog",
			"status":         "draft",
			"published_at":   nil,
			"featured_image": "",
			"tags":           "database,optimization",
			"created_at":     now.Add(-5 * 24 * time.Hour),
			"updated_at":     now.Add(-1 * 24 * time.Hour),
		},
		{
			"id":             "5",
			"title":          "Upcoming Features in 2025",
			"slug":           "upcoming-features-2025",
			"content":        "What's coming in 2025...",
			"excerpt":        "Preview of 2025 features",
			"author":         "admin",
			"category":       "news",
			"status":         "scheduled",
			"published_at":   now.Add(7 * 24 * time.Hour),
			"featured_image": "/media/2025.jpg",
			"tags":           "news,roadmap",
			"created_at":     now.Add(-2 * 24 * time.Hour),
			"updated_at":     now.Add(-2 * 24 * time.Hour),
		},
	}
	s.nextID = 6
}

func (s *PostStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	filtered := s.posts
	if search, ok := opts.Filters["_search"].(string); ok && search != "" {
		filtered = []map[string]any{}
		for _, p := range s.posts {
			if strings.Contains(strings.ToLower(fmt.Sprintf("%v", p["title"])), strings.ToLower(search)) ||
				strings.Contains(strings.ToLower(fmt.Sprintf("%v", p["content"])), strings.ToLower(search)) {
				filtered = append(filtered, p)
			}
		}
	}

	return filtered, len(filtered), nil
}

func (s *PostStore) Get(ctx context.Context, id string) (map[string]any, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, p := range s.posts {
		if fmt.Sprintf("%v", p["id"]) == id {
			return p, nil
		}
	}
	return nil, admin.ErrNotFound
}

func (s *PostStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record["id"] = fmt.Sprintf("%d", s.nextID)
	record["created_at"] = time.Now()
	record["updated_at"] = time.Now()
	s.nextID++
	s.posts = append(s.posts, record)
	return record, nil
}

func (s *PostStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, p := range s.posts {
		if fmt.Sprintf("%v", p["id"]) == id {
			record["id"] = id
			record["created_at"] = p["created_at"]
			record["updated_at"] = time.Now()
			s.posts[i] = record
			return record, nil
		}
	}
	return nil, admin.ErrNotFound
}

func (s *PostStore) Delete(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, p := range s.posts {
		if fmt.Sprintf("%v", p["id"]) == id {
			s.posts = append(s.posts[:i], s.posts[i+1:]...)
			return nil
		}
	}
	return admin.ErrNotFound
}

// MediaStore manages media files
type MediaStore struct {
	mu     sync.RWMutex
	media  []map[string]any
	nextID int
}

func NewMediaStore() *MediaStore {
	return &MediaStore{media: []map[string]any{}, nextID: 1}
}

func (s *MediaStore) Seed() {
	now := time.Now()
	s.media = []map[string]any{
		{
			"id":          "1",
			"filename":    "logo.png",
			"type":        "image",
			"size":        "245 KB",
			"url":         "/uploads/logo.png",
			"uploaded_by": "admin",
			"uploaded_at": now.Add(-60 * 24 * time.Hour),
			"alt_text":    "Company Logo",
			"caption":     "",
		},
		{
			"id":          "2",
			"filename":    "banner.jpg",
			"type":        "image",
			"size":        "1.2 MB",
			"url":         "/uploads/banner.jpg",
			"uploaded_by": "jane.smith",
			"uploaded_at": now.Add(-45 * 24 * time.Hour),
			"alt_text":    "Homepage Banner",
			"caption":     "Main banner image",
		},
		{
			"id":          "3",
			"filename":    "guide.pdf",
			"type":        "document",
			"size":        "3.5 MB",
			"url":         "/uploads/guide.pdf",
			"uploaded_by": "jane.smith",
			"uploaded_at": now.Add(-30 * 24 * time.Hour),
			"alt_text":    "",
			"caption":     "User guide document",
		},
		{
			"id":          "4",
			"filename":    "demo.mp4",
			"type":        "video",
			"size":        "15.8 MB",
			"url":         "/uploads/demo.mp4",
			"uploaded_by": "john.doe",
			"uploaded_at": now.Add(-15 * 24 * time.Hour),
			"alt_text":    "",
			"caption":     "Product demo video",
		},
		{
			"id":          "5",
			"filename":    "screenshot.png",
			"type":        "image",
			"size":        "680 KB",
			"url":         "/uploads/screenshot.png",
			"uploaded_by": "admin",
			"uploaded_at": now.Add(-5 * 24 * time.Hour),
			"alt_text":    "Dashboard Screenshot",
			"caption":     "",
		},
	}
	s.nextID = 6
}

func (s *MediaStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	filtered := s.media
	if search, ok := opts.Filters["_search"].(string); ok && search != "" {
		filtered = []map[string]any{}
		for _, m := range s.media {
			if strings.Contains(strings.ToLower(fmt.Sprintf("%v", m["filename"])), strings.ToLower(search)) {
				filtered = append(filtered, m)
			}
		}
	}

	return filtered, len(filtered), nil
}

func (s *MediaStore) Get(ctx context.Context, id string) (map[string]any, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, m := range s.media {
		if fmt.Sprintf("%v", m["id"]) == id {
			return m, nil
		}
	}
	return nil, admin.ErrNotFound
}

func (s *MediaStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record["id"] = fmt.Sprintf("%d", s.nextID)
	record["uploaded_at"] = time.Now()
	s.nextID++
	s.media = append(s.media, record)
	return record, nil
}

func (s *MediaStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, m := range s.media {
		if fmt.Sprintf("%v", m["id"]) == id {
			record["id"] = id
			record["uploaded_at"] = m["uploaded_at"]
			s.media[i] = record
			return record, nil
		}
	}
	return nil, admin.ErrNotFound
}

func (s *MediaStore) Delete(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, m := range s.media {
		if fmt.Sprintf("%v", m["id"]) == id {
			s.media = append(s.media[:i], s.media[i+1:]...)
			return nil
		}
	}
	return admin.ErrNotFound
}

// StatsStore manages statistics
type StatsStore struct {
	mu sync.RWMutex
}

func NewStatsStore() *StatsStore {
	return &StatsStore{}
}

func (s *StatsStore) Seed() {
	// Stats are computed dynamically
}

func (s *StatsStore) GetUserStats() map[string]any {
	return map[string]any{
		"total":     5,
		"active":    4,
		"new_today": 1,
	}
}

func (s *StatsStore) GetContentStats() map[string]any {
	return map[string]any{
		"published": 7,
		"draft":     2,
		"scheduled": 1,
	}
}

func (s *StatsStore) GetStorageStats() map[string]any {
	return map[string]any{
		"used":       "21.4 GB",
		"total":      "100 GB",
		"percentage": 21,
	}
}

// Commands Implementation

type userActivateCommand struct {
	store *UserStore
}

func (c *userActivateCommand) Name() string { return "users.activate" }

func (c *userActivateCommand) Execute(ctx context.Context) error {
	log.Println("Activating users...")
	return nil
}

type userDeactivateCommand struct {
	store *UserStore
}

func (c *userDeactivateCommand) Name() string { return "users.deactivate" }

func (c *userDeactivateCommand) Execute(ctx context.Context) error {
	log.Println("Deactivating users...")
	return nil
}

type pagePublishCommand struct {
	store *PageStore
}

func (c *pagePublishCommand) Name() string { return "pages.publish" }

func (c *pagePublishCommand) Execute(ctx context.Context) error {
	log.Println("Publishing page...")
	return nil
}

type pageBulkPublishCommand struct {
	store *PageStore
}

func (c *pageBulkPublishCommand) Name() string { return "pages.bulk_publish" }

func (c *pageBulkPublishCommand) Execute(ctx context.Context) error {
	log.Println("Bulk publishing pages...")
	return nil
}

type pageBulkUnpublishCommand struct {
	store *PageStore
}

func (c *pageBulkUnpublishCommand) Name() string { return "pages.bulk_unpublish" }

func (c *pageBulkUnpublishCommand) Execute(ctx context.Context) error {
	log.Println("Bulk unpublishing pages...")
	return nil
}

type postBulkPublishCommand struct {
	store *PostStore
}

func (c *postBulkPublishCommand) Name() string { return "posts.bulk_publish" }

func (c *postBulkPublishCommand) Execute(ctx context.Context) error {
	log.Println("Bulk publishing posts...")
	return nil
}

type postBulkArchiveCommand struct {
	store *PostStore
}

func (c *postBulkArchiveCommand) Name() string { return "posts.bulk_archive" }

func (c *postBulkArchiveCommand) Execute(ctx context.Context) error {
	log.Println("Bulk archiving posts...")
	return nil
}

type mediaBulkDeleteCommand struct {
	store *MediaStore
}

func (c *mediaBulkDeleteCommand) Name() string { return "media.bulk_delete" }

func (c *mediaBulkDeleteCommand) Execute(ctx context.Context) error {
	log.Println("Bulk deleting media...")
	return nil
}

type databaseBackupJob struct {
	runCount int
}

func (j *databaseBackupJob) Name() string { return "jobs.database_backup" }

func (j *databaseBackupJob) Execute(ctx context.Context) error {
	j.runCount++
	log.Printf("Running database backup (run #%d)...", j.runCount)
	return nil
}

func (j *databaseBackupJob) CronSpec() string {
	return "@daily"
}

func (j *databaseBackupJob) CronHandler() func() error {
	return func() error { return j.Execute(context.Background()) }
}

type cacheCleanupJob struct{}

func (j *cacheCleanupJob) Name() string { return "jobs.cache_cleanup" }

func (j *cacheCleanupJob) Execute(ctx context.Context) error {
	log.Println("Cleaning up cache...")
	return nil
}

func (j *cacheCleanupJob) CronSpec() string {
	return "@hourly"
}

func (j *cacheCleanupJob) CronHandler() func() error {
	return func() error { return j.Execute(context.Background()) }
}

type contentExportJob struct {
	stores *DataStores
}

func (j *contentExportJob) Name() string { return "jobs.content_export" }

func (j *contentExportJob) Execute(ctx context.Context) error {
	log.Println("Exporting content...")
	return nil
}

func (j *contentExportJob) CronSpec() string {
	return "@weekly"
}

func (j *contentExportJob) CronHandler() func() error {
	return func() error { return j.Execute(context.Background()) }
}

type inactiveUsersCleanupJob struct {
	store *UserStore
}

func (j *inactiveUsersCleanupJob) Name() string { return "jobs.inactive_users_cleanup" }

func (j *inactiveUsersCleanupJob) Execute(ctx context.Context) error {
	log.Println("Cleaning up inactive users...")
	return nil
}

func (j *inactiveUsersCleanupJob) CronSpec() string {
	return "@monthly"
}

func (j *inactiveUsersCleanupJob) CronHandler() func() error {
	return func() error { return j.Execute(context.Background()) }
}

// Search Adapters

type usersSearchAdapter struct {
	store *UserStore
}

func (a *usersSearchAdapter) Search(ctx context.Context, query string, limit int) ([]admin.SearchResult, error) {
	results := []admin.SearchResult{}
	users, _, _ := a.store.List(ctx, admin.ListOptions{Filters: map[string]any{"_search": query}, PerPage: limit})
	for _, user := range users {
		results = append(results, admin.SearchResult{
			Type:        "users",
			ID:          fmt.Sprintf("%v", user["id"]),
			Title:       fmt.Sprintf("%v", user["username"]),
			Description: fmt.Sprintf("Email: %v", user["email"]),
			URL:         fmt.Sprintf("/admin/users/%v", user["id"]),
			Icon:        "user",
		})
	}
	return results, nil
}

func (a *usersSearchAdapter) Permission() string {
	return "admin.users.view"
}

type pagesSearchAdapter struct {
	store *PageStore
}

func (a *pagesSearchAdapter) Search(ctx context.Context, query string, limit int) ([]admin.SearchResult, error) {
	results := []admin.SearchResult{}
	pages, _, _ := a.store.List(ctx, admin.ListOptions{Filters: map[string]any{"_search": query}, PerPage: limit})
	for _, page := range pages {
		results = append(results, admin.SearchResult{
			Type:        "pages",
			ID:          fmt.Sprintf("%v", page["id"]),
			Title:       fmt.Sprintf("%v", page["title"]),
			Description: fmt.Sprintf("Slug: %v", page["slug"]),
			URL:         fmt.Sprintf("/admin/pages/%v", page["id"]),
			Icon:        "file",
		})
	}
	return results, nil
}

func (a *pagesSearchAdapter) Permission() string {
	return "admin.pages.view"
}

type postsSearchAdapter struct {
	store *PostStore
}

func (a *postsSearchAdapter) Search(ctx context.Context, query string, limit int) ([]admin.SearchResult, error) {
	results := []admin.SearchResult{}
	posts, _, _ := a.store.List(ctx, admin.ListOptions{Filters: map[string]any{"_search": query}, PerPage: limit})
	for _, post := range posts {
		results = append(results, admin.SearchResult{
			Type:        "posts",
			ID:          fmt.Sprintf("%v", post["id"]),
			Title:       fmt.Sprintf("%v", post["title"]),
			Description: fmt.Sprintf("By %v in %v", post["author"], post["category"]),
			URL:         fmt.Sprintf("/admin/posts/%v", post["id"]),
			Icon:        "file-text",
		})
	}
	return results, nil
}

func (a *postsSearchAdapter) Permission() string {
	return "admin.posts.view"
}

type mediaSearchAdapter struct {
	store *MediaStore
}

func (a *mediaSearchAdapter) Search(ctx context.Context, query string, limit int) ([]admin.SearchResult, error) {
	results := []admin.SearchResult{}
	media, _, _ := a.store.List(ctx, admin.ListOptions{Filters: map[string]any{"_search": query}, PerPage: limit})
	for _, m := range media {
		results = append(results, admin.SearchResult{
			Type:        "media",
			ID:          fmt.Sprintf("%v", m["id"]),
			Title:       fmt.Sprintf("%v", m["filename"]),
			Description: fmt.Sprintf("Type: %v, Size: %v", m["type"], m["size"]),
			URL:         fmt.Sprintf("/admin/media/%v", m["id"]),
			Icon:        "image",
			Thumbnail:   fmt.Sprintf("%v", m["url"]),
		})
	}
	return results, nil
}

func (a *mediaSearchAdapter) Permission() string {
	return "admin.media.view"
}

// simpleTranslator implements admin.Translator with a simple map-based lookup.
type simpleTranslator struct {
	translations map[string]map[string]string
}

func (t *simpleTranslator) Translate(key, locale string) string {
	if t.translations == nil {
		return key
	}
	if localeMap, ok := t.translations[locale]; ok {
		if translation, ok := localeMap[key]; ok {
			return translation
		}
	}
	// Fallback to English
	if localeMap, ok := t.translations["en"]; ok {
		if translation, ok := localeMap[key]; ok {
			return translation
		}
	}
	return key
}
