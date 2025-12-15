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
	"github.com/goliatone/go-admin/examples/web/handlers"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/jobs"
	"github.com/goliatone/go-admin/examples/web/pkg/activity"
	"github.com/goliatone/go-admin/examples/web/search"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-crud"
	dashboardcmp "github.com/goliatone/go-dashboard/components/dashboard"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
	theme "github.com/goliatone/go-theme"
	userstypes "github.com/goliatone/go-users/pkg/types"
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
		FeatureFlags: map[string]bool{
			setup.FeatureUserInvites:      true,
			setup.FeaturePasswordReset:    true,
			setup.FeatureSelfRegistration: false,
		},
	}
	registrationCfg := setup.DefaultRegistrationConfig()
	cfg.FeatureFlags[setup.FeatureUserInvites] = flagFromEnv("USE_USER_INVITES", cfg.FeatureFlags[setup.FeatureUserInvites])
	cfg.FeatureFlags[setup.FeaturePasswordReset] = flagFromEnv("USE_PASSWORD_RESET", cfg.FeatureFlags[setup.FeaturePasswordReset])
	cfg.FeatureFlags[setup.FeatureSelfRegistration] = flagFromEnv("USE_SELF_REGISTRATION", cfg.FeatureFlags[setup.FeatureSelfRegistration])
	if mode := strings.TrimSpace(os.Getenv("REGISTRATION_MODE")); mode != "" {
		if parsed := parseRegistrationMode(mode, registrationCfg.Mode); parsed != "" {
			registrationCfg.Mode = parsed
			if parsed == setup.RegistrationOpen || parsed == setup.RegistrationAllowlist {
				cfg.FeatureFlags[setup.FeatureSelfRegistration] = true
			}
		}
	}
	if allowlist := strings.TrimSpace(os.Getenv("REGISTRATION_ALLOWLIST")); allowlist != "" {
		registrationCfg.Allowlist = splitAndTrimCSV(allowlist)
	}

	adapterHooks := quickstart.AdapterHooks{
		PersistentCMS: func(ctx context.Context, locale string) (admin.CMSOptions, string, error) {
			opts, err := setup.SetupPersistentCMS(ctx, locale, "")
			return opts, "go-cms (sqlite)", err
		},
		GoOptions: func(adm *admin.Admin) (string, error) {
			setup.SetupSettingsWithOptions(adm)
			return "go-options settings", nil
		},
		GoUsersActivity: setup.SetupActivityWithGoUsers,
	}
	cfg, adapterResult := quickstart.ConfigureAdapters(context.Background(), cfg, adapterHooks)
	cmsBackend := adapterResult.CMSBackend
	settingsBackend := adapterResult.SettingsBackend
	activityBackend := adapterResult.ActivityBackend

	usersDeps, usersService, onboardingNotifier, err := setup.SetupUsers(context.Background(), "")
	if err != nil {
		log.Fatalf("failed to setup users: %v", err)
	}
	if usersService != nil {
		if err := usersService.HealthCheck(context.Background()); err != nil {
			log.Fatalf("users service not ready: %v", err)
		}
	}

	// Initialize data stores with seed data
	cmsContentSvc := admin.CMSContentService(admin.NewInMemoryContentService())
	if cfg.CMS.Container != nil {
		if svc := cfg.CMS.Container.ContentService(); svc != nil {
			cmsContentSvc = svc
		}
	}
	dataStores, err := stores.Initialize(cmsContentSvc, defaultLocale, usersDeps)
	if err != nil {
		log.Fatalf("failed to initialize data stores: %v", err)
	}

	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		log.Fatalf("failed to construct admin: %v", err)
	}
	quickstart.ApplyAdapterIntegrations(adm, &adapterResult, adapterHooks)

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
	goUsersActivitySink := setup.NewGoUsersActivityAdapter(usersDeps.ActivitySink, usersDeps.ActivityRepo)
	primaryActivitySink := goUsersActivitySink
	if primaryActivitySink == nil {
		primaryActivitySink = adapterResult.ActivitySink
	}
	if primaryActivitySink == nil {
		primaryActivitySink = adm.ActivityFeed()
	}
	if goUsersActivitySink != nil {
		activityBackend = "go-users (sqlite)"
	}

	// Create activity adapter that wraps the primary sink and also emits to dashboard hooks
	compositeActivitySink := &compositeActivitySink{
		primary:  primaryActivitySink,
		hookSink: dashboardHook,
	}
	adm.WithActivitySink(compositeActivitySink)
	if onboardingNotifier != nil {
		onboardingNotifier.Notifications = adm.NotificationService()
	}
	activitySink := adm.ActivityFeed()
	dataStores.Users.WithActivitySink(activitySink)
	dataStores.Pages.WithActivitySink(activitySink)
	dataStores.Posts.WithActivitySink(activitySink)
	dataStores.Media.WithActivitySink(activitySink)

	scopeResolver := helpers.ScopeBuilder()
	adm.WithUserManagement(
		admin.NewGoUsersUserRepository(usersDeps.AuthRepo, usersDeps.InventoryRepo, scopeResolver),
		admin.NewGoUsersRoleRepository(usersDeps.RoleRegistry, scopeResolver),
	)
	if prefStore, err := setup.NewGoUsersPreferencesStore(usersDeps.PreferenceRepo); err == nil && adm.PreferencesService() != nil {
		adm.PreferencesService().WithStore(prefStore)
	}
	if usersDeps.ProfileRepo != nil && adm.ProfileService() != nil {
		adm.ProfileService().WithStore(admin.NewGoUsersProfileStore(usersDeps.ProfileRepo, scopeResolver))
	}

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

	// Allow dev workflows to fully rebuild navigation even when we're not running the
	// explicit seed path. Navigation is seeded once modules are assembled so we can
	// converge parent scaffolding + module contributions deterministically across
	// both in-memory and persistent go-cms backends.

	// Setup authentication and authorization
	authn, _, auther, authCookieName := setup.SetupAuth(adm, dataStores, usersDeps)

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
	if qsTemplates := quickstart.SidebarTemplatesFS(); qsTemplates != nil {
		viewCfg.AddTemplatesFS(qsTemplates)
	}
	if qsAssets := quickstart.SidebarAssetsFS(); qsAssets != nil {
		viewCfg.AddAssetsFS(qsAssets)
	}
	viewEngine, err := router.InitializeViewEngine(viewCfg)
	if err != nil {
		log.Fatalf("failed to initialize view engine: %v", err)
	}

	// Initialize Fiber server
	isDev := strings.EqualFold(os.Getenv("GO_ENV"), "development") || strings.EqualFold(os.Getenv("ENV"), "development")
	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		app := fiber.New(fiber.Config{
			UnescapePath:      true,
			EnablePrintRoutes: true,
			StrictRouting:     false,
			PassLocalsToViews: true,
			Views:             viewEngine,
			ErrorHandler:      quickstart.NewFiberErrorHandler(adm, cfg, isDev),
		})
		app.Use(fiberlogger.New())
		return app
	})
	r := server.Router()

	// Static assets
	assetsFS := helpers.MustSubFS(webFS, "assets")

	// Prefer serving assets from disk when available (dev flow), and fall back to embedded assets.
	// This avoids 404s when the running binary was compiled without the latest generated assets
	// (e.g., output.css, assets/dist/*) and supports iterative frontend builds.
	var diskAssetsDir string
	if _, err := os.Stat(path.Join("assets", "output.css")); err == nil {
		diskAssetsDir = "assets"
	} else if _, err := os.Stat(path.Join("examples", "web", "assets", "output.css")); err == nil {
		diskAssetsDir = path.Join("examples", "web", "assets")
	}

	var diskAssetsFS fs.FS
	if diskAssetsDir != "" {
		diskAssetsFS = os.DirFS(diskAssetsDir)
	}

	var staticFS fs.FS
	if diskAssetsFS != nil {
		staticFS = helpers.WithFallbackFS(diskAssetsFS, assetsFS)
	} else {
		staticFS = assetsFS
	}
	if qsAssets := quickstart.SidebarAssetsFS(); qsAssets != nil {
		staticFS = helpers.WithFallbackFS(staticFS, qsAssets)
	}
	r.Static(path.Join(cfg.BasePath, "assets"), ".", router.Static{
		FS:   staticFS,
		Root: ".",
	})
	// Serve embedded go-dashboard ECharts assets at the default path used by chart widgets.
	echartsPrefix := strings.TrimSuffix(dashboardcmp.DefaultEChartsAssetsPath, "/")
	r.Static(echartsPrefix, ".", router.Static{
		FS:   httpFSAdapter{fs: dashboardcmp.EChartsAssetsFS()},
		Root: ".",
	})

	// Register modules
	modules := []admin.Module{
		&dashboardModule{menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationGroupMain},
		&usersModule{store: dataStores.Users, service: usersService, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationGroupMain},
		&pagesModule{store: dataStores.Pages, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationSectionContent},
		&postsModule{store: dataStores.Posts, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationSectionContent},
		&notificationsModule{menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationGroupOthers},
		&mediaModule{store: dataStores.Media, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationSectionContent},
		admin.NewProfileModule().WithMenuParent(setup.NavigationGroupOthers),
		admin.NewPreferencesModule().WithMenuParent(setup.NavigationGroupOthers),
	}

	if err := setup.SeedAdminNavigation(context.Background(), adm.MenuService(), cfg, modules, adm.Gates(), isDev); err != nil {
		log.Printf("warning: failed to seed admin navigation: %v", err)
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

	// Wire dashboard renderer for server-side rendering
	dashboardRenderer, err := setup.NewDashboardRenderer()
	if err != nil {
		log.Printf("warning: failed to initialize dashboard renderer (falling back to JSON API): %v", err)
	} else {
		if dashboard := adm.Dashboard(); dashboard != nil {
			dashboard.WithRenderer(dashboardRenderer)
			log.Println("Dashboard SSR enabled")
		}
	}

	// Initialize admin
	if err := adm.Initialize(r); err != nil {
		log.Fatalf("failed to initialize admin: %v", err)
	}

	// Setup admin features AFTER initialization to override default widgets
	setup.SetupDashboard(adm, dataStores, cfg.BasePath)
	if adapterResult.Flags.UseGoOptions {
		// Settings already wired via adapter hook
		if adapterResult.SettingsBackend == "" {
			adapterResult.SettingsBackend = "go-options settings"
		}
	} else {
		setup.SetupSettings(adm)
		adapterResult.SettingsBackend = "in-memory settings"
	}
	settingsBackend = adapterResult.SettingsBackend
	activityBackend = adapterResult.ActivityBackend
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
	pageController := crud.NewController(
		dataStores.PageRecords,
		crud.WithErrorEncoder[*stores.PageRecord](crudErrorEncoder),
		crud.WithScopeGuard[*stores.PageRecord](contentCRUDScopeGuard[*stores.PageRecord]("admin.pages")),
		crud.WithService[*stores.PageRecord](stores.NewPageCRUDService(dataStores.PageRecords, dataStores.Pages)),
	)
	pageController.RegisterRoutes(crudAdapter)
	registerCrudAliases(crudAdapter, pageController, "pages")
	postController := crud.NewController(
		dataStores.PostRecords,
		crud.WithErrorEncoder[*stores.PostRecord](crudErrorEncoder),
		crud.WithScopeGuard[*stores.PostRecord](contentCRUDScopeGuard[*stores.PostRecord]("admin.posts")),
		crud.WithService[*stores.PostRecord](stores.NewPostCRUDService(dataStores.PostRecords, dataStores.Posts)),
	)
	postController.RegisterRoutes(crudAdapter)
	registerCrudAliases(crudAdapter, postController, "posts")
	mediaController := crud.NewController(
		dataStores.MediaRecords,
		crud.WithErrorEncoder[*stores.MediaRecord](crudErrorEncoder),
		crud.WithScopeGuard[*stores.MediaRecord](contentCRUDScopeGuard[*stores.MediaRecord]("admin.media")),
	)
	mediaController.RegisterRoutes(crudAdapter)
	registerCrudAliases(crudAdapter, mediaController, "media")

	r.Get(path.Join(cfg.BasePath, "api/session"), authn.WrapHandler(func(c router.Context) error {
		session := helpers.FilterSessionUser(helpers.BuildSessionUser(c.Context()), cfg.Features)
		return c.JSON(fiber.StatusOK, session)
	}))

	onboardingHandlers := handlers.OnboardingHandlers{
		UsersService: usersService,
		AuthRepo:     usersDeps.AuthRepo,
		UserRepo:     usersDeps.RepoManager.Users(),
		FeatureFlags: cfg.FeatureFlags,
		Registration: registrationCfg,
		Notifier:     onboardingNotifier,
		Config:       cfg,
	}

	onboardingBase := path.Join(cfg.BasePath, "api", "onboarding")
	r.Post(path.Join(onboardingBase, "invite"), authn.WrapHandler(onboardingHandlers.Invite))
	r.Get(path.Join(onboardingBase, "invite", "verify"), onboardingHandlers.VerifyInvite)
	r.Post(path.Join(onboardingBase, "invite", "accept"), onboardingHandlers.AcceptInvite)
	r.Post(path.Join(onboardingBase, "register"), onboardingHandlers.SelfRegister)
	r.Post(path.Join(onboardingBase, "password", "reset", "request"), onboardingHandlers.RequestPasswordReset)
	r.Post(path.Join(onboardingBase, "password", "reset", "confirm"), onboardingHandlers.ConfirmPasswordReset)

	userActions := &handlers.UserActionHandlers{
		Service:      usersService,
		Roles:        usersDeps.RoleRegistry,
		AuthRepo:     usersDeps.AuthRepo,
		FeatureFlags: cfg.FeatureFlags,
	}
	for _, base := range []string{path.Join(cfg.BasePath, "api", "users"), path.Join(cfg.BasePath, "crud", "users")} {
		r.Post(path.Join(base, ":id", "activate"), authn.WrapHandler(userActions.Lifecycle(userstypes.LifecycleStateActive)))
		r.Post(path.Join(base, ":id", "suspend"), authn.WrapHandler(userActions.Lifecycle(userstypes.LifecycleStateSuspended)))
		r.Post(path.Join(base, ":id", "disable"), authn.WrapHandler(userActions.Lifecycle(userstypes.LifecycleStateDisabled)))
		r.Post(path.Join(base, ":id", "archive"), authn.WrapHandler(userActions.Lifecycle(userstypes.LifecycleStateArchived)))
		r.Post(path.Join(base, ":id", "reset-password"), authn.WrapHandler(userActions.ResetPassword))
		r.Post(path.Join(base, ":id", "invite"), authn.WrapHandler(userActions.InviteByID))

		r.Post(path.Join(base, "bulk", "activate"), authn.WrapHandler(userActions.BulkLifecycle(userstypes.LifecycleStateActive)))
		r.Post(path.Join(base, "bulk", "suspend"), authn.WrapHandler(userActions.BulkLifecycle(userstypes.LifecycleStateSuspended)))
		r.Post(path.Join(base, "bulk", "disable"), authn.WrapHandler(userActions.BulkLifecycle(userstypes.LifecycleStateDisabled)))
		r.Post(path.Join(base, "bulk", "archive"), authn.WrapHandler(userActions.BulkLifecycle(userstypes.LifecycleStateArchived)))
		r.Post(path.Join(base, "bulk", "assign-role"), authn.WrapHandler(userActions.BulkAssignRole))
		r.Post(path.Join(base, "bulk", "unassign-role"), authn.WrapHandler(userActions.BulkUnassignRole))
	}

	// HTML routes
	userHandlers := handlers.NewUserHandlers(dataStores.Users, formGenerator, adm, cfg, helpers.WithNav)
	pageHandlers := handlers.NewPageHandlers(dataStores.Pages, adm, cfg, helpers.WithNav)
	postHandlers := handlers.NewPostHandlers(dataStores.Posts, adm, cfg, helpers.WithNav)
	mediaHandlers := handlers.NewMediaHandlers(dataStores.Media, adm, cfg, helpers.WithNav)
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
		viewCtx = helpers.WithNav(viewCtx, adm, cfg, setup.NavigationSectionDashboard, c.Context())
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
	r.Get(path.Join(cfg.BasePath, "password-reset"), func(c router.Context) error {
		if !cfg.FeatureFlags[setup.FeaturePasswordReset] {
			return goerrors.New("password reset disabled", goerrors.CategoryAuthz).
				WithCode(fiber.StatusForbidden).
				WithTextCode("FEATURE_DISABLED")
		}
		viewCtx := router.ViewContext{
			"title":     "Password Reset",
			"base_path": cfg.BasePath,
		}
		return c.Render("password_reset", viewCtx)
	})
	r.Get(path.Join(cfg.BasePath, "logout"), func(c router.Context) error {
		// Clear the auth cookie
		c.Cookie(&router.Cookie{
			Name:     authCookieName,
			Value:    "",
			Path:     "/",
			HTTPOnly: true,
			SameSite: "Lax",
			Secure:   false,
			MaxAge:   -1,
		})
		return c.Redirect(path.Join(cfg.BasePath, "login"), fiber.StatusFound)
	})

	r.Get(path.Join(cfg.BasePath, "notifications"), authn.WrapHandler(func(c router.Context) error {
		viewCtx := helpers.WithNav(router.ViewContext{
			"title":     cfg.Title,
			"base_path": cfg.BasePath,
		}, adm, cfg, setup.NavigationGroupOthers+".notifications", c.Context())
		viewCtx = helpers.WithTheme(viewCtx, adm, c)
		return c.Render("notifications", viewCtx)
	}))

	// Export handlers
	exportHandlers := handlers.NewExportHandlers(dataStores.Users, cfg)

	// User routes
	r.Get(path.Join(cfg.BasePath, "users"), authn.WrapHandler(userHandlers.List))
	r.Get(path.Join(cfg.BasePath, "users/new"), authn.WrapHandler(userHandlers.New))
	r.Post(path.Join(cfg.BasePath, "users"), authn.WrapHandler(userHandlers.Create))
	r.Get(path.Join(cfg.BasePath, "users/:id/edit"), authn.WrapHandler(userHandlers.Edit))
	r.Post(path.Join(cfg.BasePath, "users/:id"), authn.WrapHandler(userHandlers.Update))
	r.Get(path.Join(cfg.BasePath, "users/:id"), authn.WrapHandler(userHandlers.Detail))
	r.Post(path.Join(cfg.BasePath, "users/:id/delete"), authn.WrapHandler(userHandlers.Delete))

	// Export action (custom action endpoint for go-crud compatibility)
	r.Get(path.Join(cfg.BasePath, "crud/users/actions/export"), authn.WrapHandler(exportHandlers.ExportUsers))

	// Page routes
	r.Get(path.Join(cfg.BasePath, "pages"), authn.WrapHandler(pageHandlers.List))
	r.Get(path.Join(cfg.BasePath, "pages/new"), authn.WrapHandler(pageHandlers.New))
	r.Post(path.Join(cfg.BasePath, "pages"), authn.WrapHandler(pageHandlers.Create))
	r.Get(path.Join(cfg.BasePath, "pages/:id"), authn.WrapHandler(pageHandlers.Detail))
	r.Get(path.Join(cfg.BasePath, "pages/:id/edit"), authn.WrapHandler(pageHandlers.Edit))
	r.Post(path.Join(cfg.BasePath, "pages/:id"), authn.WrapHandler(pageHandlers.Update))
	r.Post(path.Join(cfg.BasePath, "pages/:id/delete"), authn.WrapHandler(pageHandlers.Delete))
	r.Post(path.Join(cfg.BasePath, "pages/:id/publish"), authn.WrapHandler(pageHandlers.Publish))
	r.Post(path.Join(cfg.BasePath, "pages/:id/unpublish"), authn.WrapHandler(pageHandlers.Unpublish))

	// Post routes
	r.Get(path.Join(cfg.BasePath, "posts"), authn.WrapHandler(postHandlers.List))
	r.Get(path.Join(cfg.BasePath, "posts/new"), authn.WrapHandler(postHandlers.New))
	r.Post(path.Join(cfg.BasePath, "posts"), authn.WrapHandler(postHandlers.Create))
	r.Get(path.Join(cfg.BasePath, "posts/:id"), authn.WrapHandler(postHandlers.Detail))
	r.Get(path.Join(cfg.BasePath, "posts/:id/edit"), authn.WrapHandler(postHandlers.Edit))
	r.Post(path.Join(cfg.BasePath, "posts/:id"), authn.WrapHandler(postHandlers.Update))
	r.Post(path.Join(cfg.BasePath, "posts/:id/delete"), authn.WrapHandler(postHandlers.Delete))
	r.Post(path.Join(cfg.BasePath, "posts/:id/publish"), authn.WrapHandler(postHandlers.Publish))
	r.Post(path.Join(cfg.BasePath, "posts/:id/archive"), authn.WrapHandler(postHandlers.Archive))

	// Media routes
	r.Get(path.Join(cfg.BasePath, "media"), authn.WrapHandler(mediaHandlers.List))
	r.Get(path.Join(cfg.BasePath, "media/new"), authn.WrapHandler(mediaHandlers.New))
	r.Post(path.Join(cfg.BasePath, "media"), authn.WrapHandler(mediaHandlers.Create))
	r.Get(path.Join(cfg.BasePath, "media/:id"), authn.WrapHandler(mediaHandlers.Detail))
	r.Get(path.Join(cfg.BasePath, "media/:id/edit"), authn.WrapHandler(mediaHandlers.Edit))
	r.Post(path.Join(cfg.BasePath, "media/:id"), authn.WrapHandler(mediaHandlers.Update))
	r.Post(path.Join(cfg.BasePath, "media/:id/delete"), authn.WrapHandler(mediaHandlers.Delete))

	if tenantHandlers != nil {
		r.Get(path.Join(cfg.BasePath, "tenants"), authn.WrapHandler(tenantHandlers.List))
		r.Get(path.Join(cfg.BasePath, "tenants/new"), authn.WrapHandler(tenantHandlers.New))
		r.Post(path.Join(cfg.BasePath, "tenants"), authn.WrapHandler(tenantHandlers.Create))
		r.Get(path.Join(cfg.BasePath, "tenants/:id"), authn.WrapHandler(tenantHandlers.Detail))
		r.Get(path.Join(cfg.BasePath, "tenants/:id/edit"), authn.WrapHandler(tenantHandlers.Edit))
		r.Post(path.Join(cfg.BasePath, "tenants/:id"), authn.WrapHandler(tenantHandlers.Update))
		r.Post(path.Join(cfg.BasePath, "tenants/:id/delete"), authn.WrapHandler(tenantHandlers.Delete))
	}

	siteHandlers := handlers.NewSiteHandlers(handlers.SiteHandlersConfig{
		Admin:         adm,
		Pages:         dataStores.Pages,
		Posts:         dataStores.Posts,
		Nav:           adm.Navigation(),
		DefaultLocale: cfg.DefaultLocale,
		MenuCode:      setup.SiteNavigationMenuCode,
		AssetBasePath: cfg.BasePath,
		AdminBasePath: cfg.BasePath,
		CMSEnabled:    cfg.Features.CMS && adm.MenuService() != nil,
	})
	r.Get("/", siteHandlers.Page)
	r.Get("/posts", siteHandlers.PostsIndex)
	r.Get("/posts/:slug", siteHandlers.PostDetail)
	r.Get("/*", siteHandlers.Page)

	log.Println("Enterprise Admin available at http://localhost:8080/admin")
	log.Println("  Dashboard: /admin/api/dashboard")
	log.Println("  Navigation: /admin/api/navigation")
	log.Println("  Users: /admin/api/users")
	log.Println("  Pages: /admin/api/pages")
	log.Println("  Posts: /admin/api/posts")
	log.Println("  Media: /admin/api/media")
	log.Println("  Settings: /admin/api/settings")
	log.Println("  Session: /admin/api/session")
	log.Printf("  Dashboard: go-dashboard (persistent, requires CMS)")
	log.Printf("  Activity backend: %s (USE_GO_USERS_ACTIVITY=%t)", activityBackend, adapterResult.Flags.UseGoUsersActivity)
	log.Printf("  CMS backend: %s (USE_PERSISTENT_CMS=%t)", cmsBackend, adapterResult.Flags.UsePersistentCMS)
	log.Printf("  Settings backend: %s (USE_GO_OPTIONS=%t)", settingsBackend, adapterResult.Flags.UseGoOptions)
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
		scope := helpers.ScopeFromContext(ctx.UserContext())
		scopeFilter := crud.ScopeFilter{
			Raw: map[string]any{
				"scope": scope,
			},
		}

		claims, ok := authlib.GetClaims(ctx.UserContext())
		if !ok || claims == nil {
			return actor, scopeFilter, goerrors.New("missing or invalid token", goerrors.CategoryAuth).
				WithCode(goerrors.CodeUnauthorized).
				WithTextCode("UNAUTHORIZED")
		}

		action := crudOperationAction(op)
		if action == "" {
			return actor, scopeFilter, nil
		}

		if !authlib.Can(ctx.UserContext(), "admin.users", action) {
			return actor, scopeFilter, goerrors.New("forbidden", goerrors.CategoryAuthz).
				WithCode(goerrors.CodeForbidden).
				WithTextCode("FORBIDDEN")
		}

		return actor, scopeFilter, nil
	}
}

func contentCRUDScopeGuard[T any](resource string) crud.ScopeGuardFunc[T] {
	return func(ctx crud.Context, op crud.CrudOperation) (crud.ActorContext, crud.ScopeFilter, error) {
		actor := crud.ActorContext{}
		if authActor, ok := authlib.ActorFromContext(ctx.UserContext()); ok && authActor != nil {
			actor = adaptAuthActor(authActor)
		}
		scope := helpers.ScopeFromContext(ctx.UserContext())
		scopeFilter := crud.ScopeFilter{
			Raw: map[string]any{
				"scope": scope,
			},
		}

		claims, ok := authlib.GetClaims(ctx.UserContext())
		if !ok || claims == nil {
			return actor, scopeFilter, goerrors.New("missing or invalid token", goerrors.CategoryAuth).
				WithCode(goerrors.CodeUnauthorized).
				WithTextCode("UNAUTHORIZED")
		}

		action := crudOperationAction(op)
		if action == "" {
			return actor, scopeFilter, nil
		}

		target := strings.TrimSpace(resource)
		if target == "" {
			target = "admin"
		}
		if action == "delete" {
			if claims.HasRole(string(authlib.RoleAdmin)) || claims.IsAtLeast(string(authlib.RoleAdmin)) {
				return actor, scopeFilter, nil
			}
		}
		if !authlib.Can(ctx.UserContext(), target, action) {
			return actor, scopeFilter, goerrors.New("forbidden", goerrors.CategoryAuthz).
				WithCode(goerrors.CodeForbidden).
				WithTextCode("FORBIDDEN")
		}

		return actor, scopeFilter, nil
	}
}

func flagFromEnv(envVar string, current bool) bool {
	val := strings.TrimSpace(os.Getenv(envVar))
	switch strings.ToLower(val) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return current
	}
}

func parseRegistrationMode(raw string, fallback setup.RegistrationMode) setup.RegistrationMode {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "open":
		return setup.RegistrationOpen
	case "allowlist", "allow", "whitelist":
		return setup.RegistrationAllowlist
	case "closed", "off", "disabled":
		return setup.RegistrationClosed
	default:
		return fallback
	}
}

func splitAndTrimCSV(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.FieldsFunc(raw, func(r rune) bool { return r == ',' || r == ';' })
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
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
	feed.Record(ctx, admin.ActivityEntry{Actor: "jane.smith", Action: "published", Object: "post: Getting Started with Go", Channel: "posts"})
	feed.Record(ctx, admin.ActivityEntry{Actor: "john.doe", Action: "created", Object: "page: About Us", Channel: "pages"})
	feed.Record(ctx, admin.ActivityEntry{Actor: "admin", Action: "updated", Object: "settings: email configuration", Channel: "settings"})
	feed.Record(ctx, admin.ActivityEntry{Actor: "system", Action: "completed", Object: "job: database backup", Channel: "jobs"})
	feed.Record(ctx, admin.ActivityEntry{Actor: "jane.smith", Action: "uploaded", Object: "media: logo.png", Channel: "media"})
	feed.Record(ctx, admin.ActivityEntry{Actor: "system", Action: "cleaned", Object: "cache entries", Channel: "admin"})
	feed.Record(ctx, admin.ActivityEntry{
		Actor:   "admin",
		Action:  "user.invite",
		Object:  "user: editor",
		Channel: "users",
		Metadata: map[string]any{
			"email":      "editor@example.com",
			"expires_at": "1h",
		},
	})
	feed.Record(ctx, admin.ActivityEntry{
		Actor:   "admin",
		Action:  "status.activated",
		Object:  "user: viewer",
		Channel: "users",
	})
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

		channel := strings.TrimSpace(entry.Channel)
		if channel == "" {
			channel = "admin"
		}

		c.hookSink.Notify(ctx, activity.Event{
			Channel:    channel,
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

// getErrorContext maps HTTP status codes to user-friendly headlines and messages.
func getErrorContext(code int) (headline string, message string) {
	switch code {
	case fiber.StatusBadRequest:
		return "Bad Request", "The request could not be understood or was missing required parameters."
	case fiber.StatusUnauthorized:
		return "Unauthorized", "You need to be logged in to access this resource."
	case fiber.StatusForbidden:
		return "Access Denied", "You don't have permission to access this resource."
	case fiber.StatusNotFound:
		return "Page Not Found", "The page you're looking for doesn't exist or has been moved."
	case fiber.StatusMethodNotAllowed:
		return "Method Not Allowed", "The request method is not supported for this resource."
	case fiber.StatusInternalServerError:
		return "Internal Server Error", "Something went wrong on our end. We're working to fix it."
	case fiber.StatusServiceUnavailable:
		return "Service Unavailable", "The service is temporarily unavailable. Please try again later."
	default:
		return "Error", "An unexpected error occurred. Please try again or contact support if the problem persists."
	}
}
