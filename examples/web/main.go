package main

import (
	"context"
	"embed"
	"fmt"
	"log"
	"path"

	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/handlers"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/jobs"
	"github.com/goliatone/go-admin/examples/web/search"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-crud"
	"github.com/goliatone/go-router"
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
			Export:        true,
			Bulk:          true,
		},
	}

	// Initialize data stores with seed data
	dataStores, err := stores.Initialize()
	if err != nil {
		log.Fatalf("failed to initialize data stores: %v", err)
	}

	adm := admin.New(cfg)

	// Seed export/media adapters with store data
	if svc := adm.ExportService(); svc != nil {
		users, _, _ := dataStores.Users.List(context.Background(), admin.ListOptions{})
		svc.Seed("users", users)
		posts, _, _ := dataStores.Posts.List(context.Background(), admin.ListOptions{})
		svc.Seed("posts", posts)
	}
	if lib := adm.MediaLibrary(); lib != nil {
		mediaItems, _, _ := dataStores.Media.List(context.Background(), admin.ListOptions{})
		for _, item := range mediaItems {
			_, _ = lib.Add(context.Background(), admin.MediaItem{
				Name:      fmt.Sprintf("%v", item["filename"]),
				URL:       fmt.Sprintf("%v", item["url"]),
				Thumbnail: fmt.Sprintf("%v", item["url"]),
				Metadata: map[string]any{
					"type":        item["type"],
					"uploaded_by": item["uploaded_by"],
				},
			})
		}
	}

	// Setup translator
	translator := helpers.NewSimpleTranslator()
	adm.WithTranslator(translator)

	// Setup authentication and authorization
	setup.SetupAuth(adm, dataStores)

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

	// Initialize form generator
	openapiFS := helpers.MustSubFS(webFS, "openapi")
	formGenerator := helpers.NewUserFormGenerator(openapiFS)
	if formGenerator == nil {
		log.Fatalf("failed to initialize form generator")
	}

	// Initialize view engine
	viewCfg := helpers.NewWebViewConfig(webFS)
	viewEngine, err := router.InitializeViewEngine(viewCfg)
	if err != nil {
		log.Fatalf("failed to initialize view engine: %v", err)
	}

	// Initialize Fiber server
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

	// Static assets
	assetsFS := helpers.MustSubFS(webFS, "assets")
	if assetsFS != nil {
		r.Static(path.Join(cfg.BasePath, "assets"), ".", router.Static{
			FS:   assetsFS,
			Root: ".",
		})
	}

	// Setup admin features
	setup.SetupDashboard(adm, dataStores)
	setup.SetupSettings(adm)
	setupSearch(adm, dataStores)
	setupJobs(adm, dataStores)

	// Register modules
	modules := []admin.Module{
		&dashboardModule{menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
		&usersModule{store: dataStores.Users, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
		&pagesModule{store: dataStores.Pages, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
		&postsModule{store: dataStores.Posts, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
		&notificationsModule{menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
		&mediaModule{store: dataStores.Media, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath},
	}
	for _, mod := range modules {
		if err := adm.RegisterModule(mod); err != nil {
			log.Fatalf("failed to register module %s: %v", mod.Manifest().ID, err)
		}
	}

	// Initialize admin
	if err := adm.Initialize(r); err != nil {
		log.Fatalf("failed to initialize admin: %v", err)
	}

	// Seed notifications and activity
	seedNotificationsAndActivity(adm)

	// go-crud controller for users (JSON API)
	userController := crud.NewController(dataStores.Users.Repository())
	crudAPI := r.Group(path.Join(cfg.BasePath, "crud/users"))
	crudAdapter := crud.NewGoRouterAdapter(crudAPI)
	userController.RegisterRoutes(crudAdapter)

	// HTML routes
	userHandlers := handlers.NewUserHandlers(dataStores.Users, formGenerator, adm, cfg, helpers.WithNav)

	r.Get(cfg.BasePath, func(c router.Context) error {
		ctx := router.ViewContext{
			"title":     cfg.Title,
			"base_path": cfg.BasePath,
		}
		return c.Render("admin", helpers.WithNav(ctx, adm, cfg, "dashboard"))
	})

	r.Get(path.Join(cfg.BasePath, "notifications"), func(c router.Context) error {
		return c.Render("notifications", helpers.WithNav(router.ViewContext{
			"title":     cfg.Title,
			"base_path": cfg.BasePath,
		}, adm, cfg, "notifications"))
	})

	// User routes
	r.Get(path.Join(cfg.BasePath, "users"), userHandlers.List)
	r.Get(path.Join(cfg.BasePath, "users/new"), userHandlers.New)
	r.Post(path.Join(cfg.BasePath, "users"), userHandlers.Create)
	r.Get(path.Join(cfg.BasePath, "users/:id/edit"), userHandlers.Edit)
	r.Post(path.Join(cfg.BasePath, "users/:id"), userHandlers.Update)
	r.Get(path.Join(cfg.BasePath, "users/:id"), userHandlers.Detail)
	r.Post(path.Join(cfg.BasePath, "users/:id/delete"), userHandlers.Delete)

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

// setupSearch registers search adapters
func setupSearch(adm *admin.Admin, dataStores *stores.DataStores) {
	engine := adm.SearchService()
	if engine == nil {
		return
	}

	engine.Register("users", search.NewUsersSearchAdapter(dataStores.Users))
	engine.Register("pages", search.NewPagesSearchAdapter(dataStores.Pages))
	engine.Register("posts", search.NewPostsSearchAdapter(dataStores.Posts))
	engine.Register("media", search.NewMediaSearchAdapter(dataStores.Media))
}

// setupJobs registers job commands
func setupJobs(adm *admin.Admin, dataStores *stores.DataStores) {
	registry := adm.Commands()
	if registry == nil {
		return
	}

	registry.Register(jobs.NewDatabaseBackupJob())
	registry.Register(jobs.NewCacheCleanupJob())
	registry.Register(jobs.NewContentExportJob(dataStores))
	registry.Register(jobs.NewInactiveUsersCleanupJob(dataStores.Users))
}

// seedNotificationsAndActivity adds sample data for notifications and activity feed
func seedNotificationsAndActivity(adm *admin.Admin) {
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
