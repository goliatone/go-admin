package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"log/slog"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/web/handlers"
	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/jobs"
	"github.com/goliatone/go-admin/examples/web/search"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-crud"
	dashboardactivity "github.com/goliatone/go-dashboard/pkg/activity"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-export/export"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/goliatone/go-router"
	"github.com/goliatone/go-users/activity"
	userstypes "github.com/goliatone/go-users/pkg/types"
)

//go:embed openapi/*
var webFS embed.FS

func main() {
	defaultLocale := "en"

	cfg := quickstart.NewAdminConfig("/admin", "Enterprise Admin", defaultLocale,
		quickstart.WithNavMenuCode(setup.NavigationMenuCode),
		quickstart.WithThemeTokens(map[string]string{
			"primary": "#2563eb",
			"accent":  "#f59e0b",
		}),
		quickstart.WithFeatures(admin.Features{
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
			Users:         false,
			Tenants:       true,
			Organizations: true,
		}),
		quickstart.WithFeatureFlags(map[string]bool{
			setup.FeatureUserInvites:      true,
			setup.FeaturePasswordReset:    true,
			setup.FeatureSelfRegistration: false,
		}),
		quickstart.WithFeatureFlagsFromEnv(
			quickstart.EnvFlagOverride{Env: "USE_USER_INVITES", Key: setup.FeatureUserInvites},
			quickstart.EnvFlagOverride{Env: "USE_PASSWORD_RESET", Key: setup.FeaturePasswordReset},
			quickstart.EnvFlagOverride{Env: "USE_SELF_REGISTRATION", Key: setup.FeatureSelfRegistration},
		),
	)
	registrationCfg := setup.DefaultRegistrationConfig()
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

	isDev := strings.EqualFold(os.Getenv("GO_ENV"), "development") || strings.EqualFold(os.Getenv("ENV"), "development")

	debugEnabled := strings.EqualFold(os.Getenv("ADMIN_DEBUG"), "true")
	cfg.Debug.Enabled = debugEnabled
	cfg.Debug.ToolbarMode = debugEnabled
	cfg.Debug.ToolbarPanels = []string{"requests", "sql", "logs", "routes", "config", "template", "session"}
	cfg.Debug.CaptureSQL = debugEnabled
	cfg.Debug.CaptureLogs = debugEnabled
	if debugEnabled {
		if cfg.FeatureFlags == nil {
			cfg.FeatureFlags = map[string]bool{}
		}
		cfg.FeatureFlags["debug"] = true
		cfg.Debug.AllowedIPs = splitAndTrimCSV(os.Getenv("ADMIN_DEBUG_ALLOWED_IPS"))
	}

	if debugEnabled && isDev && strings.EqualFold(os.Getenv("ADMIN_DEBUG_REPL"), "true") {
		cfg.Debug.Repl.Enabled = true
		cfg.Debug.Repl.AppEnabled = true
		cfg.Debug.Repl.ShellEnabled = true
		if strings.EqualFold(os.Getenv("ADMIN_DEBUG_REPL_READONLY"), "false") {
			cfg.Debug.Repl.ReadOnly = admin.BoolPtr(false)
		}
		if len(cfg.Debug.Panels) == 0 {
			cfg.Debug.Panels = []string{
				admin.DebugPanelTemplate,
				admin.DebugPanelSession,
				admin.DebugPanelRequests,
				admin.DebugPanelSQL,
				admin.DebugPanelLogs,
				admin.DebugPanelConfig,
				admin.DebugPanelRoutes,
				admin.DebugPanelCustom,
			}
		}
		cfg.Debug.Panels = append(cfg.Debug.Panels, admin.DebugPanelConsole)
		cfg.Debug.Panels = append(cfg.Debug.Panels, admin.DebugPanelShell)
		cfg.Debug.ToolbarPanels = append(cfg.Debug.ToolbarPanels, admin.DebugPanelConsole, admin.DebugPanelShell)
		log.Printf("debug repl enabled panels=%v toolbar_panels=%v read_only=%t", cfg.Debug.Panels, cfg.Debug.ToolbarPanels, cfg.Debug.Repl.ReadOnlyEnabled())
	}

	var adm *admin.Admin
	var debugHookOpts []persistence.ClientOption
	if cfg.Debug.Enabled && cfg.Debug.CaptureSQL {
		debugHook := admin.NewDebugQueryHookProvider(func() *admin.DebugCollector {
			if adm == nil {
				return nil
			}
			return adm.Debug()
		})
		debugHookOpts = append(debugHookOpts, persistence.WithQueryHooks(debugHook))
		if cfg.Debug.StrictQueryHooks {
			debugHookOpts = append(debugHookOpts, persistence.WithQueryHookErrorHandler(persistence.PanicQueryHookErrorHandler))
		}
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

	usersDeps, usersService, onboardingNotifier, err := setup.SetupUsers(context.Background(), "", debugHookOpts...)
	if err != nil {
		log.Fatalf("failed to setup users: %v", err)
	}
	if usersService != nil {
		if err := usersService.HealthCheck(context.Background()); err != nil {
			log.Fatalf("users service not ready: %v", err)
		}
	}

	exportBundle := quickstart.NewExportBundle(
		quickstart.WithExportActorProvider(exportActorProvider{}),
		quickstart.WithExportGuard(exportGuard{}),
		quickstart.WithExportHistoryPath("exports-history"),
		quickstart.WithExportAsyncInProcess(10*time.Minute),
	)
	if cfg.Features.Export {
		exportTemplatesFS := client.Templates()
		if err := quickstart.ConfigureExportRenderers(
			exportBundle,
			exportTemplatesFS,
			quickstart.WithExportTemplateFuncs(quickstart.DefaultTemplateFuncs(helpers.TemplateFuncOptions()...)),
		); err != nil {
			log.Fatalf("failed to configure export renderers: %v", err)
		}
	}
	adminDeps := admin.Dependencies{
		ExportRegistry:  exportBundle.Registry,
		ExportRegistrar: exportBundle.Registrar,
		ExportMetadata:  exportBundle.Metadata,
	}
	if usersDeps.ActivityRepo != nil {
		adminDeps.ActivityRepository = usersDeps.ActivityRepo
		adminDeps.ActivityAccessPolicy = activity.NewDefaultAccessPolicy()
	}
	adm, adapterResult, err := quickstart.NewAdmin(
		cfg,
		adapterHooks,
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithAdminDependencies(adminDeps),
	)
	if err != nil {
		log.Fatalf("failed to construct admin: %v", err)
	}
	cfg = adapterResult.Config
	cmsBackend := adapterResult.CMSBackend
	settingsBackend := adapterResult.SettingsBackend
	activityBackend := adapterResult.ActivityBackend

	// Initialize data stores with seed data
	cmsContentSvc := admin.CMSContentService(admin.NewInMemoryContentService())
	if cfg.CMS.Container != nil {
		if svc := cfg.CMS.Container.ContentService(); svc != nil {
			cmsContentSvc = svc
		}
	}
	repoOptions := adm.DebugQueryHookOptions()
	dataStores, err := stores.InitializeWithOptions(cmsContentSvc, defaultLocale, usersDeps, stores.InitOptions{
		RepoOptions:        repoOptions,
		PersistenceOptions: debugHookOpts,
	})
	if err != nil {
		log.Fatalf("failed to initialize data stores: %v", err)
	}
	if cfg.Features.Export {
		if err := registerExampleExports(exportBundle, dataStores, adm.TenantService()); err != nil {
			log.Fatalf("failed to register exports: %v", err)
		}
	}

	// Wire dashboard activity hooks to admin activity system.
	dashboardHooks := dashboardactivity.Hooks{
		// Log activity events to console for demonstration.
		dashboardactivity.HookFunc(func(ctx context.Context, event dashboardactivity.Event) error {
			log.Printf("[Dashboard Activity] %s %s %s:%s (channel: %s)",
				event.ActorID, event.Verb, event.ObjectType, event.ObjectID, event.Channel)
			return nil
		}),
	}
	dashboardCfg := dashboardactivity.Config{
		Enabled: true,
		Channel: "admin",
	}

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

	// Create activity adapter that wraps the primary sink and also emits to dashboard hooks.
	compositeActivitySink := quickstart.NewCompositeActivitySink(primaryActivitySink, dashboardHooks, dashboardCfg)
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
	adm.WithRoleAssignmentLookup(admin.UUIDRoleAssignmentLookup{})
	if prefStore, err := setup.NewGoUsersPreferencesStore(usersDeps.PreferenceRepo); err == nil && adm.PreferencesService() != nil {
		adm.PreferencesService().WithStore(prefStore)
	}
	if usersDeps.ProfileRepo != nil && adm.ProfileService() != nil {
		adm.ProfileService().WithStore(admin.NewGoUsersProfileStore(usersDeps.ProfileRepo, scopeResolver))
	}

	var defaultTenantID string
	var defaultOrgID string
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
			defaultTenantID = tenant.ID
			if orgSvc := adm.OrganizationService(); orgSvc != nil && cfg.Features.Organizations {
				org, err := orgSvc.SaveOrganization(context.Background(), admin.OrganizationRecord{
					Name:     "Acme Engineering",
					Slug:     "acme-eng",
					Status:   "active",
					TenantID: tenant.ID,
					Members: []admin.OrganizationMember{
						{UserID: "admin", Roles: []string{"manager"}},
					},
				})
				if err == nil {
					defaultOrgID = org.ID
				}
			}
		}
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
	authn, _, auther, authCookieName := setup.SetupAuth(adm, dataStores, usersDeps, setup.WithDefaultScope(defaultTenantID, defaultOrgID))

	// Setup go-theme registry/selector so dashboard, CMS, and forms share the same theme.
	themeSelector, _, err := quickstart.NewThemeSelector(cfg.Theme, cfg.ThemeVariant, cfg.ThemeTokens,
		quickstart.WithThemeAssets(path.Join(cfg.BasePath, "assets"), map[string]string{
			"logo":    "logo.svg",
			"favicon": "logo.svg",
		}),
	)
	if err != nil {
		log.Fatalf("failed to register theme: %v", err)
	}
	adm.WithGoTheme(themeSelector)

	// Initialize form generator
	openapiFS := helpers.MustSubFS(webFS, "openapi")
	formTemplatesFS, err := fs.Sub(client.Templates(), "formgen/vanilla")
	if err != nil {
		log.Fatalf("failed to access form templates: %v", err)
	}
	formGenerator, err := quickstart.NewFormGenerator(openapiFS, formTemplatesFS)
	if err != nil {
		log.Fatalf("failed to initialize form generator: %v", err)
	}

	// Initialize view engine
	viewEngine, err := quickstart.NewViewEngine(
		client.FS(),
		quickstart.WithViewTemplateFuncs(quickstart.DefaultTemplateFuncs(helpers.TemplateFuncOptions()...)),
	)
	if err != nil {
		log.Fatalf("failed to initialize view engine: %v", err)
	}

	// Initialize Fiber server
	server, r := quickstart.NewFiberServer(viewEngine, cfg, adm, isDev)

	// Static assets
	// Prefer serving assets from disk when available (dev flow), and fall back to embedded assets.
	// This avoids 404s when the running binary was compiled without the latest generated assets
	// (e.g., output.css, assets/dist/*) and supports iterative frontend builds.
	diskAssetsDir := strings.TrimSpace(os.Getenv("ADMIN_ASSETS_DIR"))
	if diskAssetsDir != "" {
		if abs, err := filepath.Abs(diskAssetsDir); err == nil {
			diskAssetsDir = abs
		}
		if info, err := os.Stat(diskAssetsDir); err != nil || !info.IsDir() {
			log.Printf("warning: ADMIN_ASSETS_DIR %q not accessible: %v", diskAssetsDir, err)
			diskAssetsDir = ""
		}
	}
	if diskAssetsDir == "" {
		diskAssetsDir = quickstart.ResolveDiskAssetsDir(
			"output.css",
			path.Join("pkg", "client", "assets"),
			path.Join("..", "..", "pkg", "client", "assets"),
			path.Join("..", "pkg", "client", "assets"),
			"assets",
		)
		if diskAssetsDir == "" {
			diskAssetsDir = quickstart.ResolveDiskAssetsDir(
				path.Join("dist", "output.css"),
				path.Join("pkg", "client", "assets"),
				path.Join("..", "..", "pkg", "client", "assets"),
				path.Join("..", "pkg", "client", "assets"),
				"assets",
			)
		}
	}
	embeddedAssetsFS := client.Assets()
	quickstart.NewStaticAssets(r, cfg, embeddedAssetsFS, quickstart.WithDiskAssetsDir(diskAssetsDir))

	if debugEnabled {
		r.Use(func(next router.HandlerFunc) router.HandlerFunc {
			return func(c router.Context) error {
				if cfg.BasePath != "" && !strings.HasPrefix(c.Path(), cfg.BasePath) {
					return next(c)
				}
				collector := adm.Debug()
				if collector == nil {
					return next(c)
				}
				err := admin.DebugRequestMiddleware(collector)(next)(c)
				assetPath := path.Join(cfg.BasePath, "assets")
				if assetPath != "" && strings.HasPrefix(c.Path(), assetPath) {
					return err
				}
				session := helpers.FilterSessionUser(helpers.BuildSessionUser(c.Context()), cfg.Features)
				collector.CaptureSession(session.ToViewContext())
				return err
			}
		})
	}

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
	if debugEnabled {
		modules = append(modules, admin.NewDebugModule(cfg.Debug))
	}

	extraMenuItems := []admin.MenuItem{
		{
			ID:       setup.NavigationSectionShop,
			Type:     admin.MenuItemTypeItem,
			Label:    "My Shop",
			LabelKey: "menu.shop",
			Icon:     "shop",
			Position: admin.IntPtr(40),
			Target: map[string]any{
				"type": "url",
				"path": path.Join(cfg.BasePath, "shop"),
				"key":  "shop",
			},
			Menu:        cfg.NavMenuCode,
			ParentID:    setup.NavigationGroupMain,
			Collapsible: true,
		},
		{
			ID:       setup.NavigationSectionShop + ".products",
			Label:    "Products",
			LabelKey: "menu.shop.products",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(cfg.BasePath, "products"),
				"key":  "products",
			},
			Position: admin.IntPtr(1),
			Menu:     cfg.NavMenuCode,
			ParentID: setup.NavigationSectionShop,
		},
		{
			ID:       setup.NavigationSectionShop + ".orders",
			Label:    "Orders",
			LabelKey: "menu.shop.orders",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(cfg.BasePath, "orders"),
				"key":  "orders",
			},
			Position: admin.IntPtr(2),
			Menu:     cfg.NavMenuCode,
			ParentID: setup.NavigationSectionShop,
		},
		{
			ID:       setup.NavigationSectionShop + ".customers",
			Label:    "Customers",
			LabelKey: "menu.shop.customers",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(cfg.BasePath, "customers"),
				"key":  "customers",
			},
			Position: admin.IntPtr(3),
			Menu:     cfg.NavMenuCode,
			ParentID: setup.NavigationSectionShop,
		},
		{
			ID:       setup.NavigationGroupMain + ".analytics",
			Label:    "Analytics",
			LabelKey: "menu.analytics",
			Icon:     "stats-report",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(cfg.BasePath, "analytics"),
				"key":  "analytics",
			},
			Position: admin.IntPtr(60),
			Menu:     cfg.NavMenuCode,
			ParentID: setup.NavigationGroupMain,
		},
		{
			ID:       setup.NavigationGroupMain + ".separator",
			Type:     admin.MenuItemTypeSeparator,
			Position: admin.IntPtr(80),
			Menu:     cfg.NavMenuCode,
		},
		{
			ID:       setup.NavigationGroupOthers + ".help",
			Label:    "Help & Support",
			LabelKey: "menu.help",
			Icon:     "question-mark",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(cfg.BasePath, "help"),
				"key":  "help",
			},
			Position: admin.IntPtr(10),
			Menu:     cfg.NavMenuCode,
			ParentID: setup.NavigationGroupOthers,
		},
	}

	if err := quickstart.NewModuleRegistrar(adm, cfg, modules, isDev, quickstart.WithModuleMenuItems(extraMenuItems...)); err != nil {
		log.Fatalf("failed to register modules: %v", err)
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
	if debugEnabled {
		if collector := adm.Debug(); collector != nil {
			enableSlog := !strings.EqualFold(os.Getenv("ADMIN_DEBUG_SLOG"), "false") &&
				strings.TrimSpace(os.Getenv("ADMIN_DEBUG_SLOG")) != "0"
			if enableSlog {
				logWriter := log.Writer()
				delegate := slog.NewTextHandler(logWriter, &slog.HandlerOptions{Level: slog.LevelInfo})
				handler := admin.NewDebugLogHandler(collector, delegate)
				logger := slog.New(handler)
				slog.SetDefault(logger)
			}
		}
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
	userProfileController := crud.NewController(
		dataStores.UserProfiles.Repository(),
		crud.WithErrorEncoder[*stores.UserProfile](crudErrorEncoder),
		crud.WithScopeGuard[*stores.UserProfile](userProfilesCRUDScopeGuard()),
	)
	userProfileController.RegisterRoutes(crudAdapter)
	registerCrudAliases(crudAdapter, userProfileController, "user-profiles")
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

	r.Get(path.Join(cfg.BasePath, "api", "timezones"), authn.WrapHandler(handlers.ListTimezones))

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

	uploadsBase := path.Join(cfg.BasePath, "api", "uploads", "users")
	r.Post(path.Join(uploadsBase, "profile-picture"), authn.WrapHandler(handlers.ProfilePictureUploadHandler(cfg.BasePath, diskAssetsDir)))

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
	userProfileHandlers := handlers.NewUserProfileHandlers(dataStores.UserProfiles, formGenerator, adm, cfg, helpers.WithNav)
	pageHandlers := handlers.NewPageHandlers(dataStores.Pages, adm, cfg, helpers.WithNav)
	postHandlers := handlers.NewPostHandlers(dataStores.Posts, adm, cfg, helpers.WithNav)
	mediaHandlers := handlers.NewMediaHandlers(dataStores.Media, adm, cfg, helpers.WithNav)
	profileHandlers := handlers.NewProfileHandlers(adm, cfg, helpers.WithNav)
	var tenantHandlers *handlers.TenantHandlers
	if svc := adm.TenantService(); svc != nil {
		tenantHandlers = handlers.NewTenantHandlers(svc, formGenerator, adm, cfg, helpers.WithNav)
	}

	// Optional metadata endpoint for frontend DataGrid column definitions.
	r.Get(path.Join(cfg.BasePath, "api", "users", "columns"), authn.WrapHandler(userHandlers.Columns))
	r.Get(path.Join(cfg.BasePath, "api", "user-profiles", "columns"), authn.WrapHandler(userProfileHandlers.Columns))

	if err := quickstart.RegisterAdminUIRoutes(
		r,
		cfg,
		adm,
		authn,
		quickstart.WithUIDashboardActive(setup.NavigationSectionDashboard),
		quickstart.WithUINotificationsActive(setup.NavigationGroupOthers+".notifications"),
	); err != nil {
		log.Fatalf("failed to register admin UI routes: %v", err)
	}

	if err := quickstart.RegisterAuthUIRoutes(
		r,
		cfg,
		auther,
		authCookieName,
		quickstart.WithAuthUITitles("Login", "Password Reset"),
	); err != nil {
		log.Fatalf("failed to register auth UI routes: %v", err)
	}

	// Profile routes (self-service HTML)
	r.Get(path.Join(cfg.BasePath, "profile"), authn.WrapHandler(profileHandlers.Show))
	r.Post(path.Join(cfg.BasePath, "profile"), authn.WrapHandler(profileHandlers.Save))

	// User routes
	r.Get(path.Join(cfg.BasePath, "users"), authn.WrapHandler(userHandlers.List))
	r.Get(path.Join(cfg.BasePath, "users/new"), authn.WrapHandler(userHandlers.New))
	r.Post(path.Join(cfg.BasePath, "users"), authn.WrapHandler(userHandlers.Create))
	r.Get(path.Join(cfg.BasePath, "users/:id/edit"), authn.WrapHandler(userHandlers.Edit))
	r.Post(path.Join(cfg.BasePath, "users/:id"), authn.WrapHandler(userHandlers.Update))
	r.Get(path.Join(cfg.BasePath, "users/:id/tabs/:tab"), authn.WrapHandler(userHandlers.TabHTML))
	r.Get(path.Join(cfg.BasePath, "api", "users", ":id", "tabs", ":tab"), authn.WrapHandler(userHandlers.TabJSON))
	r.Get(path.Join(cfg.BasePath, "users/:id"), authn.WrapHandler(userHandlers.Detail))
	r.Post(path.Join(cfg.BasePath, "users/:id/delete"), authn.WrapHandler(userHandlers.Delete))

	// User Profiles routes
	r.Get(path.Join(cfg.BasePath, "user-profiles"), authn.WrapHandler(userProfileHandlers.List))
	r.Get(path.Join(cfg.BasePath, "user-profiles/new"), authn.WrapHandler(userProfileHandlers.New))
	r.Post(path.Join(cfg.BasePath, "user-profiles"), authn.WrapHandler(userProfileHandlers.Create))
	r.Get(path.Join(cfg.BasePath, "user-profiles/:id/edit"), authn.WrapHandler(userProfileHandlers.Edit))
	r.Post(path.Join(cfg.BasePath, "user-profiles/:id"), authn.WrapHandler(userProfileHandlers.Update))
	r.Get(path.Join(cfg.BasePath, "user-profiles/:id"), authn.WrapHandler(userProfileHandlers.Detail))
	r.Post(path.Join(cfg.BasePath, "user-profiles/:id/delete"), authn.WrapHandler(userProfileHandlers.Delete))

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

	listenAddr := resolveListenAddr()
	log.Printf("Enterprise Admin available at %s", urlForListenAddr(listenAddr))
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

	if err := server.Serve(listenAddr); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

func resolveListenAddr() string {
	if addr := strings.TrimSpace(os.Getenv("ADMIN_ADDR")); addr != "" {
		return addr
	}
	if port := strings.TrimSpace(os.Getenv("PORT")); port != "" {
		if strings.HasPrefix(port, ":") {
			return port
		}
		return ":" + port
	}
	return ":8080"
}

func urlForListenAddr(addr string) string {
	addr = strings.TrimSpace(addr)
	if addr == "" {
		return "http://localhost:8080/admin"
	}
	if strings.HasPrefix(addr, ":") {
		return "http://localhost" + addr + "/admin"
	}
	if idx := strings.LastIndex(addr, ":"); idx != -1 {
		return "http://localhost" + addr[idx:] + "/admin"
	}
	return "http://localhost:8080/admin"
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

func userProfilesCRUDScopeGuard() crud.ScopeGuardFunc[*stores.UserProfile] {
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

type exportActorProvider struct{}

func (exportActorProvider) FromContext(ctx context.Context) (export.Actor, error) {
	session := helpers.BuildSessionUser(ctx)
	if !session.IsAuthenticated {
		return export.Actor{}, export.NewError(export.KindAuthz, "actor not authenticated", nil)
	}

	actorID := strings.TrimSpace(session.ID)
	if actorID == "" {
		actorID = strings.TrimSpace(session.Subject)
	}
	if actorID == "" {
		return export.Actor{}, export.NewError(export.KindAuthz, "actor id missing", nil)
	}

	actor := export.Actor{
		ID: actorID,
		Scope: export.Scope{
			TenantID:    strings.TrimSpace(session.TenantID),
			WorkspaceID: strings.TrimSpace(session.OrganizationID),
		},
	}

	roles := []string{}
	if strings.TrimSpace(session.Role) != "" {
		roles = append(roles, strings.TrimSpace(session.Role))
	}
	if len(session.Scopes) > 0 {
		roles = append(roles, session.Scopes...)
	}
	if len(roles) > 0 {
		actor.Roles = roles
	}

	details := map[string]any{}
	if strings.TrimSpace(session.Subject) != "" {
		details["subject"] = strings.TrimSpace(session.Subject)
	}
	if strings.TrimSpace(session.Username) != "" {
		details["username"] = strings.TrimSpace(session.Username)
	}
	if strings.TrimSpace(session.Email) != "" {
		details["email"] = strings.TrimSpace(session.Email)
	}
	if strings.TrimSpace(session.Role) != "" {
		details["role"] = strings.TrimSpace(session.Role)
	}
	if len(session.ResourceRoles) > 0 {
		details["resource_roles"] = session.ResourceRoles
	}
	if len(session.Metadata) > 0 {
		details["metadata"] = session.Metadata
	}
	if len(session.Scopes) > 0 {
		details["scopes"] = session.Scopes
	}
	if len(details) > 0 {
		actor.Details = details
	}

	return actor, nil
}

type exportGuard struct{}

func (exportGuard) AuthorizeExport(ctx context.Context, actor export.Actor, req export.ExportRequest, def export.ResolvedDefinition) error {
	if strings.TrimSpace(actor.ID) == "" {
		return export.NewError(export.KindAuthz, "export actor missing", nil)
	}

	resource := strings.TrimSpace(def.Resource)
	if resource == "" {
		resource = strings.TrimSpace(def.Name)
	}
	if resource == "" {
		resource = strings.TrimSpace(req.Resource)
	}
	if resource == "" {
		resource = strings.TrimSpace(req.Definition)
	}

	if resource != "" {
		target := "admin." + resource
		if !authlib.Can(ctx, target, "read") {
			return export.NewError(export.KindAuthz, "export not authorized", nil)
		}
	}

	return nil
}

func (exportGuard) AuthorizeDownload(ctx context.Context, actor export.Actor, exportID string) error {
	_ = exportID
	if strings.TrimSpace(actor.ID) == "" {
		return export.NewError(export.KindAuthz, "export actor missing", nil)
	}
	if !authlib.Can(ctx, "admin", "read") {
		return export.NewError(export.KindAuthz, "export download not authorized", nil)
	}
	return nil
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

// setupJobs registers job commands. The admin orchestrator wires these command.CronCommand
// handlers into the go-job registry + go-command dispatcher so /api/jobs shows
// go-job schedules/status and triggers use the shared dispatcher path.
func setupJobs(adm *admin.Admin, dataStores *stores.DataStores) {
	registry := adm.Commands()
	if registry == nil {
		return
	}

	_, _ = admin.RegisterCommand(registry, jobs.NewDatabaseBackupJob())
	_, _ = admin.RegisterCommand(registry, jobs.NewCacheCleanupJob())
	_, _ = admin.RegisterCommand(registry, jobs.NewContentExportJob(dataStores))
	_, _ = admin.RegisterCommand(registry, jobs.NewInactiveUsersCleanupJob(dataStores.Users))
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
