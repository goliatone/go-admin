package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/handlers"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/jobs"
	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-admin/examples/web/search"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-crud"
	dashboardcmp "github.com/goliatone/go-dashboard/components/dashboard"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
	theme "github.com/goliatone/go-theme"
)

//go:embed assets/* templates/* openapi/*
var webFS embed.FS

// loginPayload adapts form/json login data to the go-auth LoginPayload interface.
type loginPayload struct {
	Identifier string `form:"identifier" json:"identifier"`
	Password   string `form:"password" json:"password"`
	Remember   bool   `form:"remember" json:"remember"`
}

func (l loginPayload) GetIdentifier() string    { return l.Identifier }
func (l loginPayload) GetPassword() string      { return l.Password }
func (l loginPayload) GetExtendedSession() bool { return l.Remember }

func main() {
	defaultLocale := "en"

	usePersistentCMS := strings.EqualFold(os.Getenv("USE_PERSISTENT_CMS"), "true")
	cmsBackend := "in-memory CMS"
	cmsOptions := admin.CMSOptions{}
	if usePersistentCMS {
		if persistent, err := setup.SetupPersistentCMS(context.Background(), defaultLocale, ""); err != nil {
			log.Printf("warning: USE_PERSISTENT_CMS enabled but persistent CMS unavailable: %v", err)
			cmsBackend = "in-memory CMS (fallback)"
		} else {
			cmsOptions = persistent
			cmsBackend = "go-cms (sqlite)"
		}
	}

	cfg := admin.Config{
		Title:         "Enterprise Admin",
		BasePath:      "/admin",
		DefaultLocale: defaultLocale,
		Theme:         "admin",
		ThemeVariant:  "light",
		NavMenuCode:   setup.NavigationMenuCode,
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
			Preferences:   true,
			Profile:       true,
			Tenants:       true,
			Organizations: true,
		},
		CMS: cmsOptions,
	}

	useGoOptions := strings.EqualFold(os.Getenv("USE_GO_OPTIONS"), "true")
	settingsBackend := "in-memory settings"
	if useGoOptions {
		settingsBackend = "go-options settings"
	}
	useGoUsersActivity := strings.EqualFold(os.Getenv("USE_GO_USERS_ACTIVITY"), "true")
	activityBackend := "in-memory activity feed"

	// Initialize data stores with seed data
	dataStores, err := stores.Initialize()
	if err != nil {
		log.Fatalf("failed to initialize data stores: %v", err)
	}

	adm := admin.New(cfg)

	// Wire dashboard activity hooks to admin activity system
	// This creates a bidirectional bridge:
	// 1. Admin activity events flow to dashboard hooks
	// 2. Command activity events (from pkg/activity) flow to dashboard hooks
	dashboardHook := activity.NewDashboardActivityHook(
		dashboardactivity.Hooks{
			// Log activity events to console for demonstration
			dashboardactivity.HookFunc(func(ctx context.Context, event dashboardactivity.Event) error {
				log.Printf("[Dashboard Activity] %s %s %s:%s (channel: %s)",
					event.ActorID, event.Verb, event.ObjectType, event.ObjectID, event.Channel)
				return nil
			}),
		},
		dashboardactivity.Config{
			Enabled: true,
			Channel: "admin",
		},
	)

	// Choose activity backend (go-users sink when flag is enabled)
	primaryActivitySink := adm.ActivityFeed()
	if useGoUsersActivity {
		if sink := setup.SetupActivityWithGoUsers(); sink != nil {
			primaryActivitySink = sink
			activityBackend = "go-users activity sink"
		} else {
			log.Printf("warning: USE_GO_USERS_ACTIVITY enabled but go-users sink unavailable; using in-memory feed")
		}
	}

	// Create activity adapter that wraps the primary sink and also emits to dashboard hooks
	compositeActivitySink := &compositeActivitySink{
		primary:  primaryActivitySink,
		hookSink: dashboardHook,
	}
	adm.WithActivitySink(compositeActivitySink)
	activitySink := adm.ActivityFeed()
	dataStores.Users.WithActivitySink(activitySink)
	dataStores.Pages.WithActivitySink(activitySink)
	dataStores.Posts.WithActivitySink(activitySink)
	dataStores.Media.WithActivitySink(activitySink)

	// Seed demo tenants/orgs for navigation/search coverage
	if svc := adm.TenantService(); svc != nil && cfg.Features.Tenants {
		tenant, err := svc.SaveTenant(context.Background(), admin.TenantRecord{
			Name:   "Acme Corp",
			Slug:   "acme",
			Status: "active",
			Domain: "acme.local",
			Members: []admin.TenantMember{
				{UserID: "admin", Roles: []string{"owner"}},
			},
		})
		if err == nil {
			if orgSvc := adm.OrganizationService(); orgSvc != nil && cfg.Features.Organizations {
				_, _ = orgSvc.SaveOrganization(context.Background(), admin.OrganizationRecord{
					Name:     "Acme Engineering",
					Slug:     "acme-eng",
					Status:   "active",
					TenantID: tenant.ID,
					Members: []admin.OrganizationMember{
						{UserID: "admin", Roles: []string{"manager"}},
					},
				})
			}
		}
	}

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

	if err := setup.SetupNavigation(context.Background(), adm.MenuService(), cfg.BasePath, cfg.NavMenuCode); err != nil {
		log.Printf("warning: failed to seed navigation: %v", err)
	}

	// Setup authentication and authorization
	authn, _, auther, authCookieName := setup.SetupAuth(adm, dataStores)

	// Setup go-theme registry/selector so dashboard, CMS, and forms share the same theme
	themeRegistry := theme.NewRegistry()
	manifest := &theme.Manifest{
		Name:        "admin",
		Version:     "1.0.0",
		Description: "Example admin theme",
		Tokens: map[string]string{
			"primary": "#2563eb",
			"accent":  "#f59e0b",
			"surface": "#1C1C1E",
			// Sidebar dimensions
			"sidebar-width":         "260px",
			"sidebar-padding-x":     "12px",
			"sidebar-padding-y":     "12px",
			"sidebar-item-height":   "36px",
			"sidebar-title-height":  "28px",
			"sidebar-gap-sections":  "24px",
			"sidebar-icon-size":     "20px",
			"sidebar-footer-height": "64px",
		},
		Assets: theme.Assets{
			Prefix: path.Join(cfg.BasePath, "assets"),
			Files: map[string]string{
				"logo":    "logo.svg",
				"favicon": "logo.svg",
			},
		},
		Variants: map[string]theme.Variant{
			"dark": {
				Tokens: map[string]string{
					"primary": "#0ea5e9",
					"accent":  "#fbbf24",
					"surface": "#0b1221",
				},
				Assets: theme.Assets{
					Prefix: path.Join(cfg.BasePath, "assets"),
					Files: map[string]string{
						"logo": "logo.svg",
					},
				},
			},
		},
	}
	if err := themeRegistry.Register(manifest); err != nil {
		log.Fatalf("failed to register theme: %v", err)
	}
	themeSelector := theme.Selector{Registry: themeRegistry, DefaultTheme: cfg.Theme, DefaultVariant: cfg.ThemeVariant}
	adm.WithGoTheme(themeSelector)

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
			ErrorHandler: func(c *fiber.Ctx, err error) error {
				// Return JSON errors for API routes
				apiPrefix := path.Join(cfg.BasePath, "api")
				if len(c.Path()) >= len(apiPrefix) && c.Path()[:len(apiPrefix)] == apiPrefix {
					code := fiber.StatusInternalServerError
					if e, ok := err.(*fiber.Error); ok {
						code = e.Code
					}
					return c.Status(code).JSON(fiber.Map{
						"error":  err.Error(),
						"status": code,
					})
				}
				// Default HTML error handling for non-API routes
				code := fiber.StatusInternalServerError
				if e, ok := err.(*fiber.Error); ok {
					code = e.Code
				}
				return c.Status(code).SendString(err.Error())
			},
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
	// Serve embedded go-dashboard ECharts assets at the default path used by chart widgets.
	echartsPrefix := strings.TrimSuffix(dashboardcmp.DefaultEChartsAssetsPath, "/")
	r.Static(echartsPrefix, ".", router.Static{
		FS:   httpFSAdapter{fs: dashboardcmp.EChartsAssetsFS()},
		Root: ".",
	})

	// Register modules
	modules := []admin.Module{
		&dashboardModule{menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationGroupMain},
		&usersModule{store: dataStores.Users, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationGroupMain},
		&pagesModule{store: dataStores.Pages, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationSectionContent},
		&postsModule{store: dataStores.Posts, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationSectionContent},
		&notificationsModule{menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationGroupOthers},
		&mediaModule{store: dataStores.Media, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationSectionContent},
		admin.NewProfileModule().WithMenuParent(setup.NavigationGroupOthers),
		admin.NewPreferencesModule().WithMenuParent(setup.NavigationGroupOthers),
	}
	if profiles := adm.ProfileService(); profiles != nil {
		if users, _, err := dataStores.Users.List(context.Background(), admin.ListOptions{PerPage: 1}); err == nil && len(users) > 0 {
			user := users[0]
			userID := fmt.Sprint(user["id"])
			if userID != "" {
				_, _ = profiles.Save(context.Background(), userID, admin.UserProfile{
					DisplayName: fmt.Sprint(user["username"]),
					Email:       fmt.Sprint(user["email"]),
					Locale:      cfg.DefaultLocale,
				})
			}
		}
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

	// Setup admin features AFTER initialization to override default widgets
	setup.SetupDashboard(adm, dataStores)
	if useGoOptions {
		setup.SetupSettingsWithOptions(adm)
	} else {
		setup.SetupSettings(adm)
	}
	setupSearch(adm, dataStores)
	setupJobs(adm, dataStores)

	// Seed notifications and activity
	seedNotificationsAndActivity(adm)

	// go-crud controller for users (JSON API)
	crudErrorEncoder := crud.ProblemJSONErrorEncoder(
		crud.WithProblemJSONStatusResolver(userCRUDStatusResolver),
	)
	userController := crud.NewController(
		dataStores.Users.Repository(),
		crud.WithErrorEncoder[*stores.User](crudErrorEncoder),
		crud.WithScopeGuard[*stores.User](userCRUDScopeGuard()),
	)
	crudAPI := r.Group(path.Join(cfg.BasePath, "crud"))
	crudAPI.Use(func(next router.HandlerFunc) router.HandlerFunc {
		return authn.WrapHandler(next)
	})
	crudAdapter := crud.NewGoRouterAdapter(crudAPI)
	userController.RegisterRoutes(crudAdapter)

	r.Get(path.Join(cfg.BasePath, "api/session"), authn.WrapHandler(func(c router.Context) error {
		session := helpers.BuildSessionUser(c.Context())
		return c.JSON(fiber.StatusOK, session)
	}))

	// HTML routes
	userHandlers := handlers.NewUserHandlers(dataStores.Users, formGenerator, adm, cfg, helpers.WithNav)
	var tenantHandlers *handlers.TenantHandlers
	if svc := adm.TenantService(); svc != nil {
		tenantHandlers = handlers.NewTenantHandlers(svc, formGenerator, adm, cfg, helpers.WithNav)
	}

	// Protected dashboard page: wrap with go-auth middleware
	r.Get(cfg.BasePath, authn.WrapHandler(func(c router.Context) error {
		viewCtx := router.ViewContext{
			"title":     cfg.Title,
			"base_path": cfg.BasePath,
		}
		viewCtx = helpers.WithNav(viewCtx, adm, cfg, "dashboard", c.Context())
		viewCtx = helpers.WithTheme(viewCtx, adm, c)
		return c.Render("admin", viewCtx)
	}))

	// Login routes (render and submit).
	r.Get(path.Join(cfg.BasePath, "login"), func(c router.Context) error {
		viewCtx := router.ViewContext{
			"title":     "Login",
			"base_path": cfg.BasePath,
		}
		return c.Render("login", viewCtx)
	})
	r.Post(path.Join(cfg.BasePath, "login"), func(c router.Context) error {
		payload := loginPayload{}
		_ = c.Bind(&payload)

		// Generate token manually so we can set an HTTP (non-secure) cookie for local dev.
		token, err := auther.Login(c.Context(), payload.Identifier, payload.Password)
		if err != nil {
			return err
		}

		c.Cookie(&router.Cookie{
			Name:     authCookieName,
			Value:    token,
			Path:     "/",
			HTTPOnly: true,
			SameSite: "Lax",
			Secure:   false, // allow http://localhost
		})

		return c.Redirect(cfg.BasePath, fiber.StatusFound)
	})

	r.Get(path.Join(cfg.BasePath, "notifications"), authn.WrapHandler(func(c router.Context) error {
		viewCtx := helpers.WithNav(router.ViewContext{
			"title":     cfg.Title,
			"base_path": cfg.BasePath,
		}, adm, cfg, "notifications", c.Context())
		viewCtx = helpers.WithTheme(viewCtx, adm, c)
		return c.Render("notifications", viewCtx)
	}))

	// User routes
	r.Get(path.Join(cfg.BasePath, "users"), authn.WrapHandler(userHandlers.List))
	r.Get(path.Join(cfg.BasePath, "users/new"), authn.WrapHandler(userHandlers.New))
	r.Post(path.Join(cfg.BasePath, "users"), authn.WrapHandler(userHandlers.Create))
	r.Get(path.Join(cfg.BasePath, "users/:id/edit"), authn.WrapHandler(userHandlers.Edit))
	r.Post(path.Join(cfg.BasePath, "users/:id"), authn.WrapHandler(userHandlers.Update))
	r.Get(path.Join(cfg.BasePath, "users/:id"), authn.WrapHandler(userHandlers.Detail))
	r.Post(path.Join(cfg.BasePath, "users/:id/delete"), authn.WrapHandler(userHandlers.Delete))

	if tenantHandlers != nil {
		r.Get(path.Join(cfg.BasePath, "tenants"), authn.WrapHandler(tenantHandlers.List))
		r.Get(path.Join(cfg.BasePath, "tenants/new"), authn.WrapHandler(tenantHandlers.New))
		r.Post(path.Join(cfg.BasePath, "tenants"), authn.WrapHandler(tenantHandlers.Create))
		r.Get(path.Join(cfg.BasePath, "tenants/:id"), authn.WrapHandler(tenantHandlers.Detail))
		r.Get(path.Join(cfg.BasePath, "tenants/:id/edit"), authn.WrapHandler(tenantHandlers.Edit))
		r.Post(path.Join(cfg.BasePath, "tenants/:id"), authn.WrapHandler(tenantHandlers.Update))
		r.Post(path.Join(cfg.BasePath, "tenants/:id/delete"), authn.WrapHandler(tenantHandlers.Delete))
	}

	log.Println("Enterprise Admin available at http://localhost:8080/admin")
	log.Println("  Dashboard: /admin/api/dashboard")
	log.Println("  Navigation: /admin/api/navigation")
	log.Println("  Users: /admin/api/users")
	log.Println("  Pages: /admin/api/pages")
	log.Println("  Posts: /admin/api/posts")
	log.Println("  Media: /admin/api/media")
	log.Println("  Settings: /admin/api/settings")
	log.Println("  Session: /admin/api/session")
	log.Printf("  Activity backend: %s (USE_GO_USERS_ACTIVITY=%t)", activityBackend, useGoUsersActivity)
	log.Printf("  CMS backend: %s (USE_PERSISTENT_CMS=%t)", cmsBackend, usePersistentCMS)
	log.Printf("  Settings backend: %s (USE_GO_OPTIONS=%t)", settingsBackend, useGoOptions)
	log.Println("  Search: /admin/api/search?query=...")

	if err := server.Serve(":8080"); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

// httpFSAdapter wraps an http.FileSystem to satisfy fs.FS for go-router static handlers.
type httpFSAdapter struct{ fs http.FileSystem }

func (h httpFSAdapter) Open(name string) (fs.File, error) {
	return h.fs.Open(name)
}

func userCRUDScopeGuard() crud.ScopeGuardFunc[*stores.User] {
	return func(ctx crud.Context, op crud.CrudOperation) (crud.ActorContext, crud.ScopeFilter, error) {
		actor := crud.ActorContext{}
		if authActor, ok := authlib.ActorFromContext(ctx.UserContext()); ok && authActor != nil {
			actor = adaptAuthActor(authActor)
		}

		claims, ok := authlib.GetClaims(ctx.UserContext())
		if !ok || claims == nil {
			return actor, crud.ScopeFilter{}, goerrors.New("missing or invalid token", goerrors.CategoryAuth).
				WithCode(goerrors.CodeUnauthorized).
				WithTextCode("UNAUTHORIZED")
		}

		action := crudOperationAction(op)
		if action == "" {
			return actor, crud.ScopeFilter{}, nil
		}

		if !authlib.Can(ctx.UserContext(), "admin.users", action) {
			return actor, crud.ScopeFilter{}, goerrors.New("forbidden", goerrors.CategoryAuthz).
				WithCode(goerrors.CodeForbidden).
				WithTextCode("FORBIDDEN")
		}

		return actor, crud.ScopeFilter{}, nil
	}
}

func crudOperationAction(op crud.CrudOperation) string {
	switch op {
	case crud.OpList, crud.OpRead:
		return "read"
	case crud.OpCreate, crud.OpCreateBatch:
		return "create"
	case crud.OpUpdate, crud.OpUpdateBatch:
		return "edit"
	case crud.OpDelete, crud.OpDeleteBatch:
		return "delete"
	default:
		return ""
	}
}

func adaptAuthActor(actor *authlib.ActorContext) crud.ActorContext {
	if actor == nil {
		return crud.ActorContext{}
	}
	return crud.ActorContext{
		ActorID:        actor.ActorID,
		Subject:        actor.Subject,
		Role:           actor.Role,
		ResourceRoles:  cloneStringMap(actor.ResourceRoles),
		TenantID:       actor.TenantID,
		OrganizationID: actor.OrganizationID,
		Metadata:       cloneAnyMap(actor.Metadata),
		ImpersonatorID: actor.ImpersonatorID,
		IsImpersonated: actor.IsImpersonated,
	}
}

func cloneStringMap(src map[string]string) map[string]string {
	if len(src) == 0 {
		return nil
	}
	dst := make(map[string]string, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func cloneAnyMap(src map[string]any) map[string]any {
	if len(src) == 0 {
		return nil
	}
	dst := make(map[string]any, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func userCRUDStatusResolver(err *goerrors.Error, _ crud.CrudOperation) int {
	if err == nil {
		return http.StatusInternalServerError
	}

	if err.Category == goerrors.CategoryValidation || err.Category == goerrors.CategoryBadInput {
		return http.StatusBadRequest
	}

	if err.Code > 0 {
		return err.Code
	}

	switch err.Category {
	case goerrors.CategoryAuth:
		return http.StatusUnauthorized
	case goerrors.CategoryAuthz:
		return http.StatusForbidden
	case goerrors.CategoryNotFound:
		return http.StatusNotFound
	case goerrors.CategoryConflict:
		return http.StatusConflict
	case goerrors.CategoryRateLimit:
		return http.StatusTooManyRequests
	case goerrors.CategoryMethodNotAllowed:
		return http.StatusMethodNotAllowed
	case goerrors.CategoryCommand:
		return http.StatusBadRequest
	case goerrors.CategoryExternal:
		return http.StatusBadGateway
	case goerrors.CategoryRouting:
		return http.StatusNotFound
	default:
		return http.StatusInternalServerError
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

// setupJobs registers job commands. The admin orchestrator wires these CommandWithCron
// handlers into the go-job registry + go-command dispatcher so /api/jobs shows
// go-job schedules/status and triggers use the shared dispatcher path.
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

// compositeActivitySink forwards activity records to both the primary sink and dashboard hooks
type compositeActivitySink struct {
	primary  admin.ActivitySink
	hookSink *activity.DashboardActivityHook
}

func (c *compositeActivitySink) Record(ctx context.Context, entry admin.ActivityEntry) error {
	// Record to primary sink (in-memory feed for UI)
	if err := c.primary.Record(ctx, entry); err != nil {
		return err
	}

	// Also emit to dashboard hooks (convert admin.ActivityEntry to activity.Event)
	if c.hookSink != nil {
		// Parse object to extract type and ID
		objectType := entry.Object
		objectID := ""
		if typ, id, ok := strings.Cut(entry.Object, ":"); ok {
			objectType = strings.TrimSpace(typ)
			objectID = strings.TrimSpace(id)
		}

		c.hookSink.Notify(ctx, activity.Event{
			Channel:    "admin",
			Verb:       entry.Action,
			ObjectType: objectType,
			ObjectID:   objectID,
			Data:       entry.Metadata,
		})
	}

	return nil
}

func (c *compositeActivitySink) List(ctx context.Context, limit int, filters ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	// Listing only supported by primary sink
	return c.primary.List(ctx, limit, filters...)
}
