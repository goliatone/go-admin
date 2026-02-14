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
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	debugregistry "github.com/goliatone/go-admin/debug"
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
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
	"github.com/goliatone/go-i18n"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/goliatone/go-router"
	gotheme "github.com/goliatone/go-theme"
	"github.com/goliatone/go-users/activity"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/goliatone/go-users/preferences"
	"github.com/google/uuid"
)

//go:embed openapi/* templates/**
var webFS embed.FS

const (
	exportPipelinePanelID         = "export_pipeline"
	exportPipelineSnapshotLimit   = 25
	exportPipelinePublishInterval = 750 * time.Millisecond
	authzPreflightDefaultRolesCSV = "superadmin,owner"
)

func main() {
	defaultLocale := "en"

	cfg := quickstart.NewAdminConfig("/admin", "Enterprise Admin", defaultLocale,
		quickstart.WithNavMenuCode(setup.NavigationMenuCode),
		quickstart.WithThemeTokens(map[string]string{
			"primary": "#2563eb",
			"accent":  "#f59e0b",
		}),
		quickstart.WithDebugFromEnv(),
		quickstart.WithErrorsFromEnv(),
		quickstart.WithScopeFromEnv(),
	)
	cfg.ActivityActionLabels = map[string]string{
		"debug.repl.eval":       "Execute REPL",
		"debug.repl.open":       "Opened REPL",
		"debug.repl.close":      "Closed REPL",
		"created":               "Created",
		"tenant.create":         "Created",
		"dashboard.layout.save": "Saved",
		"preferences.update":    "Updated",
	}
	cfg.EnablePublicAPI = true
	if value, ok := os.LookupEnv("ADMIN_PUBLIC_API"); ok {
		if parsed, err := strconv.ParseBool(strings.TrimSpace(value)); err == nil {
			cfg.EnablePublicAPI = parsed
		}
	}
	if value := strings.TrimSpace(os.Getenv("ADMIN_PREVIEW_SECRET")); value != "" {
		cfg.PreviewSecret = value
	}
	if value, ok := os.LookupEnv("ADMIN_API_VERSION"); ok {
		cfg.URLs.Admin.APIVersion = strings.TrimSpace(value)
	}
	if value, ok := os.LookupEnv("ADMIN_API_PREFIX"); ok {
		cfg.URLs.Admin.APIPrefix = strings.TrimSpace(value)
	}
	cfg.FeatureCatalogPath = resolveFeatureCatalogPath()
	featureDefaults := map[string]bool{
		"dashboard":                   true,
		"cms":                         true,
		"commands":                    true,
		"settings":                    true,
		"search":                      true,
		"notifications":               true,
		"jobs":                        true,
		"media":                       true,
		"export":                      true,
		"bulk":                        true,
		"preferences":                 true,
		"profile":                     true,
		"users":                       true,
		"tenants":                     false,
		"organizations":               false,
		setup.FeatureUserInvites:      true,
		setup.FeaturePasswordReset:    true,
		setup.FeatureSelfRegistration: false,
	}
	applyFeatureFlagFromEnv(featureDefaults, "USE_USER_INVITES", setup.FeatureUserInvites)
	applyFeatureFlagFromEnv(featureDefaults, "USE_PASSWORD_RESET", setup.FeaturePasswordReset)
	applyFeatureFlagFromEnv(featureDefaults, "USE_SELF_REGISTRATION", setup.FeatureSelfRegistration)
	registrationCfg := setup.DefaultRegistrationConfig()
	if mode := strings.TrimSpace(os.Getenv("REGISTRATION_MODE")); mode != "" {
		if parsed := parseRegistrationMode(mode, registrationCfg.Mode); parsed != "" {
			registrationCfg.Mode = parsed
			if parsed == setup.RegistrationOpen || parsed == setup.RegistrationAllowlist {
				featureDefaults[setup.FeatureSelfRegistration] = true
			}
		}
	}
	if allowlist := strings.TrimSpace(os.Getenv("REGISTRATION_ALLOWLIST")); allowlist != "" {
		registrationCfg.Allowlist = splitAndTrimCSV(allowlist)
	}

	isDev := isDevelopmentEnv()

	debugEnabled := cfg.Debug.Enabled
	scopeDebugEnabled := quickstart.ScopeDebugEnabledFromEnv()
	var scopeDebugBuffer *quickstart.ScopeDebugBuffer
	if scopeDebugEnabled {
		scopeDebugBuffer = quickstart.NewScopeDebugBuffer(quickstart.ScopeDebugLimitFromEnv())
	}
	if debugEnabled {
		cfg.Debug.ViewContextBuilder = func(adm *admin.Admin, _ admin.DebugConfig, c router.Context, view router.ViewContext) router.ViewContext {
			return helpers.WithNav(view, adm, cfg, "debug", c.Context(), c)
		}
	}
	if cfg.Debug.Repl.Enabled && !isDev {
		cfg.Debug.Repl.Enabled = false
		cfg.Debug.Repl.AppEnabled = false
		cfg.Debug.Repl.ShellEnabled = false
	}

	var adm *admin.Admin
	var exportBundle *quickstart.ExportBundle
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
	adapterFlags := quickstart.ResolveAdapterFlags()
	adapterFlags.UsePersistentCMS = true

	usersDeps, usersService, onboardingNotifier, err := setup.SetupUsersWithMigrations(
		context.Background(),
		"",
		setup.QuickstartUserMigrations(),
		debugHookOpts...,
	)
	if err != nil {
		log.Fatalf("failed to setup users: %v", err)
	}
	if usersService != nil {
		if err := usersService.HealthCheck(context.Background()); err != nil {
			log.Fatalf("users service not ready: %v", err)
		}
	}
	scopeResolver := quickstart.ScopeBuilder(cfg)

	exportTracker := newExportPipelineTracker(
		export.NewMemoryTracker(),
		func() *quickstart.ExportBundle { return exportBundle },
		func() *admin.DebugCollector {
			if adm == nil {
				return nil
			}
			return adm.Debug()
		},
	)
	exportBundle = quickstart.NewExportBundle(
		quickstart.WithExportActorProvider(exportActorProvider{}),
		quickstart.WithExportGuard(exportGuard{}),
		quickstart.WithExportHistoryPath("exports-history"),
		quickstart.WithExportAsyncInProcess(10*time.Minute),
		quickstart.WithExportTracker(exportTracker),
	)
	if featureDefaults["export"] {
		exportTemplatesFS := client.Templates()
		if err := quickstart.ConfigureExportRenderers(
			exportBundle,
			exportTemplatesFS,
			quickstart.WithExportTemplateFuncs(quickstart.DefaultTemplateFuncs(helpers.TemplateFuncOptions()...)),
		); err != nil {
			log.Fatalf("failed to configure export renderers: %v", err)
		}
	}
	if debugEnabled && featureDefaults["export"] {
		quickstart.AddDebugPanels(&cfg, exportPipelinePanelID)
	}
	debugPanelCatalog := quickstart.DefaultDebugPanelCatalog()
	debugPanelCatalog[exportPipelinePanelID] = func(_ *admin.Config, _ quickstart.DebugPanelDeps) {
		registerExportPipelinePanel(exportBundle)
	}
	quickstart.ConfigureDebugPanels(
		&cfg,
		quickstart.DebugPanelDeps{ScopeBuffer: scopeDebugBuffer},
		debugPanelCatalog,
	)
	adminDeps := admin.Dependencies{
		ExportRegistry:  exportBundle.Registry,
		ExportRegistrar: exportBundle.Registrar,
		ExportMetadata:  exportBundle.Metadata,
	}
	if usersDeps.ActivityRepo != nil {
		adminDeps.ActivityRepository = usersDeps.ActivityRepo
		adminDeps.ActivityAccessPolicy = activity.NewDefaultAccessPolicy()
	}
	translationPolicyCfg := quickstart.DefaultContentTranslationPolicyConfig()
	validationResult, err := quickstart.ValidateTranslationPolicyConfig(
		translationPolicyCfg,
		quickstart.DefaultTranslationPolicyValidationCatalog(),
	)
	if err != nil {
		log.Fatalf("invalid translation policy config: %v", err)
	}
	for _, warning := range validationResult.Warnings {
		log.Printf("warning: translation policy config: %s", warning)
	}

	// Resolve translation profile and module wiring from environment.
	// Profile sets defaults; module env vars override profile defaults.
	var exchangeContentService coreadmin.CMSContentService
	exchangeStore := newExampleTranslationExchangeStore(func() coreadmin.CMSContentService {
		return exchangeContentService
	})
	queueRepository := coreadmin.NewInMemoryTranslationAssignmentRepository()
	translationProductCfg := buildTranslationProductConfig(resolveTranslationProfile(), exchangeStore, queueRepository)
	workflowConfigPath := resolveWorkflowConfigPath()
	var workflowRuntime coreadmin.WorkflowRuntime = coreadmin.NewWorkflowRuntimeService(
		coreadmin.NewInMemoryWorkflowDefinitionRepository(),
		coreadmin.NewInMemoryWorkflowBindingRepository(),
	)
	if adapterFlags.UsePersistentCMS {
		workflowRuntime, err = setup.SetupPersistentWorkflowRuntime(context.Background(), "")
		if err != nil {
			log.Fatalf("failed to setup persistent workflow runtime: %v", err)
		}
	}
	if err := seedWorkflowRuntimeFromConfig(context.Background(), workflowRuntime, workflowConfigPath); err != nil {
		log.Fatalf("failed to seed workflow runtime from config: %v", err)
	}

	adm, adapterResult, err := quickstart.NewAdmin(
		cfg,
		adapterHooks,
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithAdminDependencies(adminDeps),
		quickstart.WithWorkflowConfigFile(workflowConfigPath),
		quickstart.WithWorkflowRuntime(workflowRuntime),
		quickstart.WithTranslationPolicyConfig(translationPolicyCfg),
		quickstart.WithTranslationProductConfig(translationProductCfg),
		quickstart.WithAdapterFlags(adapterFlags),
		quickstart.WithGoUsersUserManagement(quickstart.GoUsersUserManagementConfig{
			AuthRepo:      usersDeps.AuthRepo,
			InventoryRepo: usersDeps.InventoryRepo,
			RoleRegistry:  usersDeps.RoleRegistry,
			ProfileRepo:   usersDeps.ProfileRepo,
			ScopeResolver: scopeResolver,
		}),
		quickstart.WithGoUsersPreferencesRepositoryFactory(func() (userstypes.PreferenceRepository, error) {
			if usersDeps.DB == nil {
				return nil, fmt.Errorf("preferences repository db not configured")
			}
			return preferences.NewRepository(
				preferences.RepositoryConfig{DB: usersDeps.DB},
				preferences.WithCache(true),
			)
		}),
		quickstart.WithFeatureDefaults(featureDefaults),
	)
	if err != nil {
		log.Fatalf("failed to construct admin: %v", err)
	}
	if caps := quickstart.TranslationCapabilities(adm); len(caps) > 0 {
		log.Printf(
			"translation.capabilities.startup profile=%v schema_version=%v modules=%v features=%v routes=%v panels=%v resolver_keys=%v warnings=%v",
			caps["profile"],
			caps["schema_version"],
			caps["modules"],
			caps["features"],
			caps["routes"],
			caps["panels"],
			caps["resolver_keys"],
			caps["warnings"],
		)
	}
	cfg = adapterResult.Config
	cmsBackend := adapterResult.CMSBackend
	settingsBackend := adapterResult.SettingsBackend
	activityBackend := adapterResult.ActivityBackend
	preflightReport, err := runTranslationAuthzPreflight(context.Background(), adm, cfg, usersDeps.RoleRegistry, isDev)
	if err != nil {
		log.Fatalf("authorization preflight failed: %v", err)
	}
	if preflightReport.Mode != authzPreflightModeOff && len(preflightReport.RequiredPermissions) > 0 && len(preflightReport.Issues) == 0 {
		log.Printf(
			"authz.preflight passed mode=%s modules=%v roles=%v permissions=%v",
			preflightReport.Mode,
			preflightReport.Modules,
			preflightReport.RoleKeys,
			preflightReport.RequiredPermissions,
		)
	}

	// Initialize data stores (CMS-backed only)
	cmsContentSvc := admin.CMSContentService(nil)
	if cfg.CMS.Container != nil {
		cmsContentSvc = cfg.CMS.Container.ContentService()
	}
	if cmsContentSvc == nil && adm != nil {
		cmsContentSvc = adm.ContentService()
	}
	if adapterResult.Flags.UsePersistentCMS && !adapterResult.PersistentCMSSet {
		log.Printf(
			"warning: persistent CMS requested but setup did not complete; using fallback content service (backend=%s)",
			cmsBackend,
		)
	}
	if cmsContentSvc == nil {
		log.Fatalf("cms content service is required")
	}
	exchangeContentService = cmsContentSvc
	if featureEnabled(adm.FeatureGate(), string(coreadmin.FeatureTranslationQueue)) {
		if err := seedExampleTranslationQueueFixture(context.Background(), queueRepository, cmsContentSvc); err != nil {
			log.Printf("warning: failed to seed translation queue fixture: %v", err)
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
	if featureEnabled(adm.FeatureGate(), "export") {
		if err := registerExampleExports(exportBundle, dataStores, adm.TenantService(), adm.UserService()); err != nil {
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
	dataStores.Pages.Seed()
	dataStores.Posts.Seed()

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
	makeMessage := func(locale, id, template string) i18n.Message {
		return i18n.Message{
			MessageMetadata: i18n.MessageMetadata{
				ID:     id,
				Locale: locale,
			},
			Variants: map[i18n.PluralCategory]i18n.MessageVariant{
				i18n.PluralOther: {Template: template},
			},
		}
	}
	i18nStore := i18n.NewStaticStore(i18n.Translations{
		"en": {
			Locale: i18n.Locale{Code: "en"},
			Messages: map[string]i18n.Message{
				"menu.content":       makeMessage("en", "menu.content", "Content"),
				"menu.content.pages": makeMessage("en", "menu.content.pages", "Pages"),
				"menu.content.posts": makeMessage("en", "menu.content.posts", "Posts"),
				"menu.media":         makeMessage("en", "menu.media", "Media"),
				"menu.users":         makeMessage("en", "menu.users", "Users"),
				"menu.roles":         makeMessage("en", "menu.roles", "Roles"),
				"menu.dashboard":     makeMessage("en", "menu.dashboard", "Dashboard"),
			},
		},
	})
	translator, _ := i18n.NewSimpleTranslator(i18nStore, i18n.WithTranslatorDefaultLocale(defaultLocale))
	adm.WithTranslator(translator)

	// Setup workflow engine
	workflow := coreadmin.NewSimpleWorkflowEngine()
	workflow.RegisterWorkflow("pages", coreadmin.WorkflowDefinition{
		EntityType:   "pages",
		InitialState: "draft",
		Transitions: []coreadmin.WorkflowTransition{
			{Name: "submit_for_approval", Description: "Submit for review", From: "draft", To: "pending_approval"},
			{Name: "request_approval", Description: "Submit for review", From: "draft", To: "pending_approval"},
			{Name: "publish", Description: "Publish content", From: "draft", To: "published"},
			{Name: "publish", Description: "Publish content", From: "pending_approval", To: "published"},
			{Name: "approve", Description: "Approve content", From: "pending_approval", To: "published"},
			{Name: "reject", Description: "Reject content", From: "pending_approval", To: "draft"},
			{Name: "unpublish", Description: "Move back to draft", From: "published", To: "draft"},
		},
	})
	workflow.RegisterWorkflow("posts", coreadmin.WorkflowDefinition{
		EntityType:   "posts",
		InitialState: "draft",
		Transitions: []coreadmin.WorkflowTransition{
			{Name: "submit_for_approval", Description: "Submit for review", From: "draft", To: "pending_approval"},
			{Name: "request_approval", Description: "Submit for review", From: "draft", To: "pending_approval"},
			{Name: "publish", Description: "Publish content", From: "draft", To: "published"},
			{Name: "publish", Description: "Publish content", From: "pending_approval", To: "published"},
			{Name: "approve", Description: "Approve content", From: "pending_approval", To: "published"},
			{Name: "reject", Description: "Reject content", From: "pending_approval", To: "draft"},
			{Name: "unpublish", Description: "Move back to draft", From: "published", To: "draft"},
			{Name: "archive", Description: "Archive post", From: "published", To: "archived"},
		},
	})
	workflow.RegisterWorkflow("block_definitions", coreadmin.WorkflowDefinition{
		EntityType:   "block_definitions",
		InitialState: "draft",
		Transitions: []coreadmin.WorkflowTransition{
			{Name: "publish", Description: "Publish block definition", From: "draft", To: "active"},
			{Name: "deprecate", Description: "Deprecate block definition", From: "active", To: "deprecated"},
			{Name: "republish", Description: "Republish block definition", From: "deprecated", To: "active"},
		},
	})
	workflow.RegisterWorkflow("content_types", coreadmin.WorkflowDefinition{
		EntityType:   "content_types",
		InitialState: "draft",
		Transitions: []coreadmin.WorkflowTransition{
			{Name: "publish", Description: "Publish content type", From: "draft", To: "active"},
			{Name: "deprecate", Description: "Deprecate content type", From: "active", To: "deprecated"},
			{Name: "republish", Description: "Republish content type", From: "deprecated", To: "active"},
		},
	})
	adm.WithWorkflow(workflow)

	// Allow dev workflows to fully rebuild navigation even when we're not running the
	// explicit seed path. Navigation is seeded once modules are assembled so we can
	// converge parent scaffolding + module contributions deterministically across
	// both in-memory and persistent go-cms backends.

	// Setup authentication and authorization
	scopeCfg := quickstart.ScopeConfigFromAdmin(cfg)
	authOptions := []setup.AuthOption{}
	if scopeCfg.Mode == quickstart.ScopeModeSingle {
		authOptions = append(authOptions, setup.WithDefaultScope(scopeCfg.DefaultTenantID, scopeCfg.DefaultOrgID))
	}
	authn, _, auther, authCookieName := setup.SetupAuth(adm, dataStores, usersDeps, authOptions...)
	wrapAuthed := authn.WrapHandler
	if scopeDebugEnabled {
		wrapAuthed = quickstart.ScopeDebugWrap(authn, &cfg, scopeDebugBuffer)
	}

	// Setup go-theme registry/selector so dashboard, CMS, and forms share the same theme.
	// Assets support light/dark variants: icon.light.svg, icon.dark.svg, logo.light.svg, logo.dark.svg
	themeAssetPrefix := path.Join(cfg.BasePath, "assets")
	themeSelector, _, err := quickstart.NewThemeSelector(cfg.Theme, cfg.ThemeVariant, cfg.ThemeTokens,
		quickstart.WithThemeAssets(themeAssetPrefix, map[string]string{
			"logo":    "logo.light.svg", // Default to light variant
			"icon":    "icon.light.svg",
			"favicon": "logo.svg",
		}),
		quickstart.WithThemeVariants(map[string]gotheme.Variant{
			"light": {
				Assets: gotheme.Assets{
					Prefix: themeAssetPrefix,
					Files: map[string]string{
						"logo": "logo.light.svg",
						"icon": "icon.light.svg",
					},
				},
			},
			"dark": {
				Tokens: map[string]string{
					"primary": "#0ea5e9",
					"accent":  "#fbbf24",
					"surface": "#0b1221",
				},
				Assets: gotheme.Assets{
					Prefix: themeAssetPrefix,
					Files: map[string]string{
						"logo": "logo.dark.svg",
						"icon": "icon.dark.svg",
					},
				},
			},
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
	componentRegistry := components.New()
	adminAPIBasePath := strings.TrimSpace(quickstart.ResolveAdminAPIBasePath(adm.URLs(), cfg, cfg.BasePath))
	if adminAPIBasePath == "" && adm != nil {
		adminAPIBasePath = strings.TrimSpace(adm.AdminAPIBasePath())
	}
	if adminAPIBasePath == "" {
		adminAPIBasePath = path.Join(cfg.BasePath, "api")
	}
	componentRegistry.MustRegister("block-library-picker", coreadmin.BlockLibraryPickerDescriptorWithAPIBase(cfg.BasePath, adminAPIBasePath))
	formGenerator, err := quickstart.NewFormGenerator(
		openapiFS,
		formTemplatesFS,
		quickstart.WithComponentRegistryMergeDefaults(componentRegistry),
	)
	if err != nil {
		log.Fatalf("failed to initialize form generator: %v", err)
	}

	// Initialize view engine
	viewEngine, err := quickstart.NewViewEngine(
		client.FS(),
		quickstart.WithViewTemplateFuncs(quickstart.DefaultTemplateFuncs(
			append(
				helpers.TemplateFuncOptions(),
				quickstart.WithTemplateURLResolver(adm.URLs()),
				quickstart.WithTemplateBasePath(cfg.BasePath),
				quickstart.WithTemplateFeatureGate(adm.FeatureGate()),
			)...,
		)),
		quickstart.WithViewTemplatesFS(webFS),
	)
	if err != nil {
		log.Fatalf("failed to initialize view engine: %v", err)
	}

	// Initialize Fiber server
	server, r := quickstart.NewFiberServer(
		viewEngine,
		cfg,
		adm,
		isDev,
		quickstart.WithFiberAdapterConfig(func(adapterCfg *router.FiberAdapterConfig) {
			if adapterCfg == nil {
				return
			}
			policy := router.HTTPRouterConflictLogAndContinue
			adapterCfg.ConflictPolicy = &policy
		}),
	)

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
				session := helpers.FilterSessionUser(helpers.BuildSessionUser(c.Context()), adm.FeatureGate())
				collector.CaptureSession(session.ToViewContext())
				return err
			}
		})
	}

	preferencesSchemaPath := strings.TrimSpace(os.Getenv("ADMIN_PREFERENCES_SCHEMA"))
	preferencesJSONStrict := strings.EqualFold(strings.TrimSpace(os.Getenv("ADMIN_PREFERENCES_JSON_STRICT")), "true")

	// Register modules
	blockWorkflowAuth := coreadmin.NewRoleWorkflowAuthorizer(
		string(authlib.RoleAdmin),
		coreadmin.WithWorkflowExtraCheck(func(ctx context.Context, _ coreadmin.TransitionInput) bool {
			return authlib.Can(ctx, "admin", "edit")
		}),
	)
	usersModule := quickstart.NewUsersModule(
		admin.WithUserMenuParent(setup.NavigationGroupMain),
		admin.WithUsersPanelConfigurer(func(builder *admin.PanelBuilder) *admin.PanelBuilder {
			if builder == nil {
				return nil
			}
			// Users HTML routes are owned by examples/web/handlers/users.go.
			return builder.WithUIRouteMode(admin.PanelUIRouteModeCustom)
		}),
		admin.WithUserProfilesPanel(),
		admin.WithUserPanelTabs(
			admin.PanelTab{
				ID:         "profile",
				Label:      "Profile",
				Icon:       "user-circle",
				Position:   10,
				Scope:      admin.PanelTabScopeDetail,
				Permission: cfg.UsersPermission,
				Target:     admin.PanelTabTarget{Type: "panel", Panel: "user-profiles"},
				Filters:    map[string]string{"user_id": "{{record.id}}"},
			},
			admin.PanelTab{
				ID:         "activity",
				Label:      "Activity",
				Icon:       "clock",
				Position:   20,
				Scope:      admin.PanelTabScopeDetail,
				Permission: cfg.UsersPermission,
				Target:     admin.PanelTabTarget{Type: "path", Path: path.Join(cfg.BasePath, "activity")},
				Query:      map[string]string{"user_id": "{{record.id}}"},
			},
		),
	)
	modules := []admin.Module{
		&dashboardModule{menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationGroupMain},
		usersModule,
		quickstart.NewContentTypeBuilderModule(cfg, setup.NavigationSectionContent,
			coreadmin.WithContentTypeBuilderWorkflowAuthorizer(blockWorkflowAuth),
		),
		&mediaModule{store: dataStores.Media, menuCode: cfg.NavMenuCode, defaultLoc: cfg.DefaultLocale, basePath: cfg.BasePath, parentID: setup.NavigationSectionContent},
		admin.NewProfileModule().WithSkipMenu(true),
		quickstart.NewPreferencesModule(
			cfg,
			"",
			quickstart.WithPreferencesSchemaPath(preferencesSchemaPath),
			quickstart.WithPreferencesJSONEditorStrict(preferencesJSONStrict),
			func(mod *admin.PreferencesModule) {
				mod.WithSkipMenu(true)
				mod.WithViewContextBuilder(func(adm *admin.Admin, c router.Context, view router.ViewContext, active string) router.ViewContext {
					view = helpers.WithNav(view, adm, cfg, active, c.Context(), c)
					view = helpers.WithTheme(view, adm, c)
					return view
				})
			},
		),
		coreadmin.NewActivityModule().WithMenuParent(setup.NavigationGroupOthers),
		coreadmin.NewFeatureFlagsModule().WithMenuParent(setup.NavigationGroupOthers),
	}
	if debugEnabled {
		modules = append(modules, admin.NewDebugModule(cfg.Debug).WithMenuParent(setup.NavigationGroupOthers))
	}

	if err := quickstart.NewModuleRegistrar(
		adm,
		cfg,
		modules,
		isDev,
		quickstart.WithTranslationCapabilityMenuMode(quickstart.TranslationCapabilityMenuModeTools),
	); err != nil {
		log.Fatalf("failed to register modules: %v", err)
	}
	if err := ensureCoreContentPanels(adm, dataStores.Pages, dataStores.Posts); err != nil {
		log.Fatalf("failed to ensure core content panels: %v", err)
	}

	// Ensure Dashboard renders before Content in the Main Menu group.
	if err := setup.EnsureDashboardFirst(context.Background(), adm.MenuService(), cfg.BasePath, cfg.NavMenuCode, cfg.DefaultLocale); err != nil {
		log.Printf("warning: failed to fix dashboard ordering: %v", err)
	}
	if err := setup.EnsureContentParentPermissions(context.Background(), adm.MenuService(), cfg.NavMenuCode, cfg.DefaultLocale); err != nil {
		log.Printf("warning: failed to reconcile content parent permissions: %v", err)
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
		return wrapAuthed(next)
	})
	crudAdapter := crud.NewGoRouterAdapter(crudAPI)
	userController.RegisterRoutes(crudAdapter)
	userProfileController := crud.NewController(
		dataStores.UserProfiles.Repository(),
		crud.WithErrorEncoder[*stores.UserProfile](crudErrorEncoder),
		crud.WithScopeGuard[*stores.UserProfile](userProfilesCRUDScopeGuard()),
	)
	userProfileController.RegisterRoutes(crudAdapter)
	registerLegacyUserProfileCRUDRoutes(crudAdapter, userProfileController)
	mediaController := crud.NewController(
		dataStores.MediaRecords,
		crud.WithErrorEncoder[*stores.MediaRecord](crudErrorEncoder),
		crud.WithScopeGuard[*stores.MediaRecord](contentCRUDScopeGuard[*stores.MediaRecord]("admin.media")),
	)
	mediaController.RegisterRoutes(crudAdapter)

	r.Get(path.Join(adminAPIBasePath, "session"), wrapAuthed(func(c router.Context) error {
		session := helpers.FilterSessionUser(helpers.BuildSessionUser(c.Context()), adm.FeatureGate())
		return c.JSON(fiber.StatusOK, session)
	}))
	r.Get(path.Join(adminAPIBasePath, "debug", "permissions"), wrapAuthed(permissionDiagnosticsHandler(adm)))
	if scopeDebugEnabled {
		r.Get(path.Join(adminAPIBasePath, "debug", "scope"), wrapAuthed(quickstart.ScopeDebugHandler(scopeDebugBuffer)))
	}

	// Test error route for dev error page testing (only in dev mode)
	if isDev {
		r.Get(path.Join(cfg.BasePath, "test-error"), func(c router.Context) error {
			errorType := c.Query("type", "internal")
			return triggerTestError(errorType)
		})
		r.Get(path.Join(cfg.BasePath, "test-error/:type"), func(c router.Context) error {
			errorType := c.Param("type")
			if errorType == "" {
				errorType = "internal"
			}
			return triggerTestError(errorType)
		})
	}

	r.Get(path.Join(adminAPIBasePath, "timezones"), wrapAuthed(handlers.ListTimezones))
	r.Get(path.Join(adminAPIBasePath, "templates"), wrapAuthed(handlers.ListTemplates(dataStores.Templates)))

	onboardingHandlers := handlers.OnboardingHandlers{
		UsersService: usersService,
		AuthRepo:     usersDeps.AuthRepo,
		FeatureGate:  adm.FeatureGate(),
		Registration: registrationCfg,
		Notifier:     onboardingNotifier,
		Config:       cfg,
		SecureLinks:  usersDeps.SecureLinks,
		TokenRepo:    usersDeps.UserTokenRepo,
		ResetRepo:    usersDeps.ResetRepo,
	}

	onboardingBase := path.Join(adminAPIBasePath, "onboarding")
	r.Post(path.Join(onboardingBase, "invite"), wrapAuthed(onboardingHandlers.Invite))
	r.Get(path.Join(onboardingBase, "invite", "verify"), onboardingHandlers.VerifyInvite)
	r.Post(path.Join(onboardingBase, "invite", "accept"), onboardingHandlers.AcceptInvite)
	r.Post(path.Join(onboardingBase, "register"), onboardingHandlers.SelfRegister)
	r.Post(path.Join(onboardingBase, "register", "confirm"), onboardingHandlers.ConfirmRegistration)
	r.Post(path.Join(onboardingBase, "password", "reset", "request"), onboardingHandlers.RequestPasswordReset)
	r.Post(path.Join(onboardingBase, "password", "reset", "confirm"), onboardingHandlers.ConfirmPasswordReset)
	r.Get(path.Join(onboardingBase, "token", "metadata"), onboardingHandlers.TokenMetadata)

	uploadsBase := path.Join(adminAPIBasePath, "uploads", "users")
	r.Post(path.Join(uploadsBase, "profile-picture"), wrapAuthed(handlers.ProfilePictureUploadHandler(cfg.BasePath, diskAssetsDir)))
	uploadsMediaBase := path.Join(adminAPIBasePath, "uploads", "media")
	r.Post(path.Join(uploadsMediaBase, "featured-image"), wrapAuthed(handlers.FeaturedImageUploadHandler(cfg.BasePath, diskAssetsDir)))

	userActions := &handlers.UserActionHandlers{
		Service:     usersService,
		Roles:       usersDeps.RoleRegistry,
		AuthRepo:    usersDeps.AuthRepo,
		FeatureGate: adm.FeatureGate(),
	}
	for _, base := range []string{path.Join(adminAPIBasePath, "users"), path.Join(cfg.BasePath, "crud", "users")} {
		r.Post(path.Join(base, ":id", "activate"), wrapAuthed(userActions.Lifecycle(userstypes.LifecycleStateActive)))
		r.Post(path.Join(base, ":id", "suspend"), wrapAuthed(userActions.Lifecycle(userstypes.LifecycleStateSuspended)))
		r.Post(path.Join(base, ":id", "disable"), wrapAuthed(userActions.Lifecycle(userstypes.LifecycleStateDisabled)))
		r.Post(path.Join(base, ":id", "archive"), wrapAuthed(userActions.Lifecycle(userstypes.LifecycleStateArchived)))
		r.Post(path.Join(base, ":id", "reset-password"), wrapAuthed(userActions.ResetPassword))
		r.Post(path.Join(base, ":id", "invite"), wrapAuthed(userActions.InviteByID))

	}

	// HTML routes
	userHandlers := handlers.NewUserHandlers(dataStores.Users, formGenerator, adm, cfg, helpers.WithNav)
	userProfileHandlers := handlers.NewUserProfileHandlers(dataStores.UserProfiles, formGenerator, adm, cfg, helpers.WithNav)
	usersBase := path.Join(cfg.BasePath, "users")

	// Optional metadata endpoint for frontend DataGrid column definitions.
	r.Get(path.Join(adminAPIBasePath, "users", "columns"), wrapAuthed(userHandlers.Columns))
	r.Get(path.Join(adminAPIBasePath, "user-profiles", "columns"), wrapAuthed(userProfileHandlers.Columns))
	// Users UI routes are custom and intentionally separate from generic content-entry handlers.
	r.Get(usersBase, wrapAuthed(userHandlers.List))
	r.Get(path.Join(usersBase, "new"), wrapAuthed(userHandlers.New))
	r.Post(usersBase, wrapAuthed(userHandlers.Create))
	r.Get(path.Join(usersBase, ":id"), wrapAuthed(userHandlers.Detail))
	r.Get(path.Join(usersBase, ":id", "edit"), wrapAuthed(userHandlers.Edit))
	r.Post(path.Join(usersBase, ":id"), wrapAuthed(userHandlers.Update))
	r.Post(path.Join(usersBase, ":id", "delete"), wrapAuthed(userHandlers.Delete))
	// Build UI route options with conditional translation module routes.
	// When translation exchange is enabled via feature gate (profile or explicit toggle),
	// register the translation exchange UI route for import/export operations.
	uiRouteOpts := []quickstart.UIRouteOption{
		quickstart.WithUIDashboardActive(setup.NavigationSectionDashboard),
	}
	if featureEnabled(adm.FeatureGate(), string(coreadmin.FeatureTranslationExchange)) {
		uiRouteOpts = append(uiRouteOpts, quickstart.WithUITranslationExchangeRoute(true))
		log.Printf("Translation exchange UI route enabled (/admin/translations/exchange)")
	}
	if err := quickstart.RegisterAdminUIRoutes(
		r,
		cfg,
		adm,
		authn,
		uiRouteOpts...,
	); err != nil {
		log.Fatalf("failed to register admin UI routes: %v", err)
	}
	if err := quickstart.RegisterSettingsUIRoutes(r, cfg, adm, authn); err != nil {
		log.Fatalf("failed to register settings UI routes: %v", err)
	}
	if err := quickstart.RegisterContentTypeBuilderUIRoutes(r, cfg, adm, authn); err != nil {
		log.Fatalf("failed to register content type builder UI routes: %v", err)
	}
	if err := quickstart.RegisterContentTypeBuilderAPIRoutes(r, cfg, adm, authn); err != nil {
		log.Fatalf("failed to register content type builder API routes: %v", err)
	}
	if err := quickstart.RegisterContentEntryUIRoutes(
		r,
		cfg,
		adm,
		authn,
		quickstart.WithContentEntryUITemplateFS(client.FS(), webFS),
		quickstart.WithContentEntryRecommendedDefaults(),
	); err != nil {
		log.Fatalf("failed to register content entry UI routes: %v", err)
	}

	secureLinkUI := setup.SecureLinkUIConfigFromEnv()
	passwordPolicyHints := setup.PasswordPolicyHints()
	registerPath := path.Join(cfg.BasePath, "register")
	passwordResetPath := path.Join(cfg.BasePath, "password-reset")
	passwordResetConfirmPath := path.Join(passwordResetPath, "confirm")
	tokenMetadataPath := path.Join(adminAPIBasePath, "onboarding", "token", "metadata")
	authUIViewContext := func(ctx router.ViewContext, _ router.Context) router.ViewContext {
		ctx["password_policy_hints"] = passwordPolicyHints
		ctx["token_metadata_path"] = tokenMetadataPath
		ctx["token_query_key"] = secureLinkUI.QueryKey
		ctx["token_as_query"] = secureLinkUI.AsQuery
		ctx["register_path"] = registerPath
		ctx["password_reset_confirm_path"] = passwordResetConfirmPath
		return ctx
	}
	registerTemplate := strings.TrimSpace(os.Getenv("ADMIN_REGISTER_TEMPLATE"))
	if registerTemplate == "" {
		registerTemplate = "register"
	}

	// Auth pages use light variant icons (white fill) for the dark container background
	authThemeAssets := map[string]string{
		"logo":    "logo.light.svg", // Rectangular logo with brand name (white fill for dark bg)
		"icon":    "icon.light.svg", // Square icon only (white fill for dark bg)
		"favicon": "logo.svg",
	}
	authThemeAssetPrefix := path.Join(cfg.BasePath, "assets")

	if err := quickstart.RegisterAuthUIRoutes(
		r,
		cfg,
		auther,
		authCookieName,
		quickstart.WithAuthUITitles("Login", "Password Reset"),
		quickstart.WithAuthUITemplates("login-demo", "password_reset"),
		quickstart.WithAuthUIPasswordResetConfirmPath(passwordResetConfirmPath),
		quickstart.WithAuthUIRegisterPath(registerPath),
		quickstart.WithAuthUIFeatureGate(adm.FeatureGate()),
		quickstart.WithAuthUIThemeAssets(authThemeAssetPrefix, authThemeAssets),
		quickstart.WithAuthUIViewContextBuilder(authUIViewContext),
	); err != nil {
		log.Fatalf("failed to register auth UI routes: %v", err)
	}

	r.Get(registerPath, func(c router.Context) error {
		if !featureEnabled(adm.FeatureGate(), setup.FeatureSelfRegistration) {
			return goerrors.New("registration disabled", goerrors.CategoryAuthz).
				WithCode(fiber.StatusForbidden).
				WithTextCode("FEATURE_DISABLED")
		}
		featureSnapshot := map[string]bool{
			setup.FeaturePasswordReset:    featureEnabled(adm.FeatureGate(), setup.FeaturePasswordReset),
			setup.FeatureSelfRegistration: featureEnabled(adm.FeatureGate(), setup.FeatureSelfRegistration),
		}
		viewCtx := router.ViewContext{
			"title":                       cfg.Title,
			"base_path":                   cfg.BasePath,
			"password_reset_path":         passwordResetPath,
			"password_reset_confirm_path": passwordResetConfirmPath,
			"register_path":               registerPath,
			"registration_mode":           registrationCfg.Mode,
		}
		viewCtx = quickstart.WithAuthUIViewThemeAssets(viewCtx, authThemeAssets, authThemeAssetPrefix)
		viewCtx = quickstart.WithFeatureTemplateContext(viewCtx, c.Context(), fggate.ScopeChain{{Kind: fggate.ScopeSystem}}, featureSnapshot)
		viewCtx = authUIViewContext(viewCtx, c)
		return c.Render(registerTemplate, viewCtx)
	})

	// User tab routes are custom and not part of canonical panel route wiring.
	r.Get(path.Join(cfg.BasePath, "users/:id/tabs/:tab"), wrapAuthed(userHandlers.TabHTML))
	r.Get(path.Join(adminAPIBasePath, "users", ":id", "tabs", ":tab"), wrapAuthed(userHandlers.TabJSON))

	siteHandlers := handlers.NewSiteHandlers(handlers.SiteHandlersConfig{
		Admin:         adm,
		Pages:         dataStores.Pages,
		Posts:         dataStores.Posts,
		Nav:           adm.Navigation(),
		DefaultLocale: cfg.DefaultLocale,
		MenuCode:      setup.SiteNavigationMenuCode,
		AssetBasePath: cfg.BasePath,
		AdminBasePath: cfg.BasePath,
		CMSEnabled:    featureEnabled(adm.FeatureGate(), "cms") && adm.MenuService() != nil,
	})
	r.Get("/", siteHandlers.Page)
	r.Get("/posts", siteHandlers.PostsIndex)
	r.Get("/posts/:slug", siteHandlers.PostDetail)
	r.Get("/*", siteHandlers.Page)

	listenAddr := resolveListenAddr()
	log.Printf("Enterprise Admin available at %s", urlForListenAddr(listenAddr))
	log.Printf("  Dashboard API: %s", path.Join(adminAPIBasePath, "dashboard"))
	log.Printf("  Navigation API: %s", path.Join(adminAPIBasePath, "navigation"))
	log.Printf("  Users API: %s", path.Join(adminAPIBasePath, "users"))
	log.Printf("  Panel API (content): %s", path.Join(adminAPIBasePath, "content"))
	log.Printf("  Panel API (media): %s", path.Join(adminAPIBasePath, "media"))
	log.Printf("  Settings API: %s", path.Join(adminAPIBasePath, "settings"))
	log.Printf("  Session API: %s", path.Join(adminAPIBasePath, "session"))
	log.Println("  Content UI (Pages): /admin/content/pages (alias: /admin/pages)")
	log.Println("  Content UI (Posts): /admin/content/posts (alias: /admin/posts)")
	log.Printf("  Dashboard: go-dashboard (persistent, requires CMS)")
	log.Printf("  Activity backend: %s (USE_GO_USERS_ACTIVITY=%t)", activityBackend, adapterResult.Flags.UseGoUsersActivity)
	log.Printf("  CMS backend: %s (USE_PERSISTENT_CMS=%t)", cmsBackend, adapterResult.Flags.UsePersistentCMS)
	log.Printf("  Settings backend: %s (USE_GO_OPTIONS=%t)", settingsBackend, adapterResult.Flags.UseGoOptions)
	log.Printf("  Search API: %s?query=...", path.Join(adminAPIBasePath, "search"))

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

// resolveTranslationProfile reads the translation capability profile from environment.
// Supported profiles: none, core, core+exchange, core+queue, full
// Default: "core" (will be auto-selected for CMS-enabled apps when omitted)
func resolveTranslationProfile() quickstart.TranslationProfile {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_TRANSLATION_PROFILE")))
	switch value {
	case "none":
		return quickstart.TranslationProfileNone
	case "core":
		return quickstart.TranslationProfileCore
	case "core+exchange", "exchange":
		return quickstart.TranslationProfileCoreExchange
	case "core+queue", "queue":
		return quickstart.TranslationProfileCoreQueue
	case "full":
		return quickstart.TranslationProfileFull
	default:
		// Empty/unset defaults to "core" for CMS-enabled apps; quickstart resolves this.
		return quickstart.TranslationProfile(value)
	}
}

func buildTranslationProductConfig(
	profile quickstart.TranslationProfile,
	exchangeStore coreadmin.TranslationExchangeStore,
	queueRepository coreadmin.TranslationAssignmentRepository,
) quickstart.TranslationProductConfig {
	cfg := quickstart.TranslationProductConfig{
		SchemaVersion: quickstart.TranslationProductSchemaVersionCurrent,
		Profile:       profile,
	}

	exchangeEnabled, queueEnabled := translationProfileModuleDefaults(profile)
	exchangeOverride := false
	queueOverride := false
	if enabled, ok := envBool("ADMIN_TRANSLATION_EXCHANGE"); ok {
		exchangeEnabled = enabled
		exchangeOverride = true
	}
	if enabled, ok := envBool("ADMIN_TRANSLATION_QUEUE"); ok {
		queueEnabled = enabled
		queueOverride = true
	}

	if exchangeEnabled || exchangeOverride {
		cfg.Exchange = &quickstart.TranslationExchangeConfig{
			Enabled: exchangeEnabled,
			Store:   exchangeStore,
		}
	}
	if queueEnabled || queueOverride {
		cfg.Queue = &quickstart.TranslationQueueConfig{
			Enabled:    queueEnabled,
			Repository: queueRepository,
		}
	}

	return cfg
}

func translationProfileModuleDefaults(profile quickstart.TranslationProfile) (exchangeEnabled, queueEnabled bool) {
	switch strings.ToLower(strings.TrimSpace(string(profile))) {
	case string(quickstart.TranslationProfileCoreExchange):
		return true, false
	case string(quickstart.TranslationProfileCoreQueue):
		return false, true
	case string(quickstart.TranslationProfileFull):
		return true, true
	default:
		return false, false
	}
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

func featureEnabled(gate fggate.FeatureGate, feature string) bool {
	if gate == nil || strings.TrimSpace(feature) == "" {
		return false
	}
	enabled, err := gate.Enabled(context.Background(), feature, fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
	return err == nil && enabled
}

func applyFeatureFlagFromEnv(flags map[string]bool, envKey, featureKey string) {
	if flags == nil {
		return
	}
	envKey = strings.TrimSpace(envKey)
	featureKey = strings.TrimSpace(featureKey)
	if envKey == "" || featureKey == "" {
		return
	}
	value, ok := envBool(envKey)
	if !ok {
		return
	}
	flags[featureKey] = value
}

func resolveFeatureCatalogPath() string {
	if value := strings.TrimSpace(os.Getenv("ADMIN_FEATURE_CATALOG")); value != "" {
		return value
	}
	candidates := []string{
		"feature_catalog.yaml",
		filepath.Join("examples", "web", "feature_catalog.yaml"),
		"feature_catalog.yml",
		filepath.Join("examples", "web", "feature_catalog.yml"),
	}
	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return ""
}

func resolveWorkflowConfigPath() string {
	if value := strings.TrimSpace(os.Getenv("ADMIN_WORKFLOW_CONFIG")); value != "" {
		return value
	}
	candidates := []string{
		"workflow_config.yaml",
		filepath.Join("examples", "web", "workflow_config.yaml"),
		"workflow_config.yml",
		filepath.Join("examples", "web", "workflow_config.yml"),
	}
	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return ""
}

func seedWorkflowRuntimeFromConfig(ctx context.Context, runtime coreadmin.WorkflowRuntime, configPath string) error {
	if ctx == nil || runtime == nil {
		return nil
	}
	configPath = strings.TrimSpace(configPath)
	if configPath == "" {
		return nil
	}
	cfg, err := quickstart.LoadWorkflowConfigFile(configPath)
	if err != nil {
		return err
	}

	definitions := quickstart.WorkflowDefinitionsFromConfig(cfg)
	if err := upsertWorkflowDefinitions(ctx, runtime, definitions); err != nil {
		return err
	}
	return upsertTraitDefaultBindings(ctx, runtime, quickstart.WorkflowTraitDefaultsFromConfig(cfg))
}

func upsertWorkflowDefinitions(
	ctx context.Context,
	runtime coreadmin.WorkflowRuntime,
	definitions map[string]coreadmin.WorkflowDefinition,
) error {
	if runtime == nil || len(definitions) == 0 {
		return nil
	}
	existingList, _, err := runtime.ListWorkflows(ctx, coreadmin.PersistedWorkflowListOptions{})
	if err != nil {
		return err
	}
	existingByID := map[string]coreadmin.PersistedWorkflow{}
	for _, workflow := range existingList {
		existingByID[workflow.ID] = workflow
	}

	ids := make([]string, 0, len(definitions))
	for id := range definitions {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	for _, id := range ids {
		definition := definitions[id]
		desired := coreadmin.PersistedWorkflow{
			ID:         strings.TrimSpace(id),
			Name:       strings.TrimSpace(id),
			Definition: definition,
			Status:     coreadmin.WorkflowStatusActive,
		}
		if _, ok := existingByID[desired.ID]; ok {
			continue
		}
		if _, err := runtime.CreateWorkflow(ctx, desired); err != nil {
			return err
		}
	}
	return nil
}

func upsertTraitDefaultBindings(ctx context.Context, runtime coreadmin.WorkflowRuntime, defaults map[string]string) error {
	if runtime == nil || len(defaults) == 0 {
		return nil
	}
	existing, _, err := runtime.ListBindings(ctx, coreadmin.WorkflowBindingListOptions{
		Status: coreadmin.WorkflowBindingStatusActive,
	})
	if err != nil {
		return err
	}

	traits := make([]string, 0, len(defaults))
	for trait := range defaults {
		traits = append(traits, trait)
	}
	sort.Strings(traits)

	for _, rawTrait := range traits {
		trait := strings.ToLower(strings.TrimSpace(rawTrait))
		workflowID := strings.TrimSpace(defaults[rawTrait])
		if trait == "" || workflowID == "" {
			continue
		}
		_, found := activeTraitBindingForSeed(existing, trait)
		if found {
			continue
		}
		if _, err := runtime.CreateBinding(ctx, coreadmin.WorkflowBinding{
			ID:         workflowSeedBindingID(trait),
			ScopeType:  coreadmin.WorkflowBindingScopeTrait,
			ScopeRef:   trait,
			WorkflowID: workflowID,
			Priority:   100,
			Status:     coreadmin.WorkflowBindingStatusActive,
		}); err != nil {
			return err
		}
	}
	return nil
}

func activeTraitBindingForSeed(bindings []coreadmin.WorkflowBinding, trait string) (coreadmin.WorkflowBinding, bool) {
	trait = strings.ToLower(strings.TrimSpace(trait))
	if trait == "" {
		return coreadmin.WorkflowBinding{}, false
	}
	for _, binding := range bindings {
		if binding.ScopeType != coreadmin.WorkflowBindingScopeTrait {
			continue
		}
		if binding.Status != coreadmin.WorkflowBindingStatusActive {
			continue
		}
		if strings.ToLower(strings.TrimSpace(binding.ScopeRef)) != trait {
			continue
		}
		if strings.TrimSpace(binding.Environment) != "" {
			continue
		}
		if binding.Priority != 100 {
			continue
		}
		return binding, true
	}
	return coreadmin.WorkflowBinding{}, false
}

func workflowSeedBindingID(trait string) string {
	trait = strings.ToLower(strings.TrimSpace(trait))
	if trait == "" {
		return ""
	}
	replacer := strings.NewReplacer(" ", "_", "-", "_", ".", "_", "/", "_")
	trait = replacer.Replace(trait)
	return "wfb_trait_" + trait
}

func envBool(key string) (bool, bool) {
	value, ok := os.LookupEnv(key)
	if !ok {
		return false, false
	}
	parsed, err := strconv.ParseBool(strings.TrimSpace(value))
	if err != nil {
		return false, false
	}
	return parsed, true
}

type authzPreflightMode string

const (
	authzPreflightModeOff    authzPreflightMode = "off"
	authzPreflightModeWarn   authzPreflightMode = "warn"
	authzPreflightModeStrict authzPreflightMode = "strict"
)

type translationAuthzPreflightIssue struct {
	RoleKey            string   `json:"role_key"`
	Issue              string   `json:"issue"`
	Scope              string   `json:"scope,omitempty"`
	MissingPermissions []string `json:"missing_permissions,omitempty"`
}

type translationAuthzPreflightReport struct {
	Mode                authzPreflightMode               `json:"mode"`
	Modules             map[string]bool                  `json:"modules"`
	RoleKeys            []string                         `json:"role_keys"`
	RequiredPermissions []string                         `json:"required_permissions"`
	Issues              []translationAuthzPreflightIssue `json:"issues,omitempty"`
}

func runTranslationAuthzPreflight(
	ctx context.Context,
	adm *admin.Admin,
	cfg admin.Config,
	roleRegistry userstypes.RoleRegistry,
	isDev bool,
) (translationAuthzPreflightReport, error) {
	mode := resolveAuthzPreflightMode(isDev)
	required, modules := translationOperationRequiredPermissions(nil)
	if adm != nil {
		required, modules = translationOperationRequiredPermissions(adm.FeatureGate())
	}
	report := translationAuthzPreflightReport{
		Mode:                mode,
		Modules:             modules,
		RoleKeys:            resolveAuthzPreflightRoleKeys(),
		RequiredPermissions: required,
	}
	if mode == authzPreflightModeOff || len(required) == 0 {
		return report, nil
	}
	if roleRegistry == nil {
		report.Issues = append(report.Issues, translationAuthzPreflightIssue{
			RoleKey:            "*",
			Issue:              "role_registry_unavailable",
			MissingPermissions: append([]string{}, required...),
		})
		return finalizeTranslationAuthzPreflight(report)
	}

	scopes := authzPreflightScopeCandidates(cfg)
	for _, roleKey := range report.RoleKeys {
		role, scope, err := findRoleByKey(ctx, roleRegistry, roleKey, scopes)
		if err != nil {
			return report, err
		}
		if role == nil {
			report.Issues = append(report.Issues, translationAuthzPreflightIssue{
				RoleKey:            roleKey,
				Issue:              "role_missing",
				MissingPermissions: append([]string{}, required...),
			})
			continue
		}
		missing := missingPermissions(required, role.Permissions)
		if len(missing) > 0 {
			report.Issues = append(report.Issues, translationAuthzPreflightIssue{
				RoleKey:            roleKey,
				Issue:              "permissions_missing",
				Scope:              formatScope(scope),
				MissingPermissions: missing,
			})
		}
	}
	return finalizeTranslationAuthzPreflight(report)
}

func finalizeTranslationAuthzPreflight(report translationAuthzPreflightReport) (translationAuthzPreflightReport, error) {
	if len(report.Issues) == 0 {
		return report, nil
	}
	for _, issue := range report.Issues {
		log.Printf(
			"warning: authz.preflight issue=%s role=%s scope=%s missing=%s",
			issue.Issue,
			issue.RoleKey,
			strings.TrimSpace(issue.Scope),
			strings.Join(issue.MissingPermissions, ","),
		)
	}
	if report.Mode != authzPreflightModeStrict {
		return report, nil
	}
	failures := make([]string, 0, len(report.Issues))
	for _, issue := range report.Issues {
		failures = append(failures, fmt.Sprintf("%s[%s]:%s", issue.RoleKey, issue.Issue, strings.Join(issue.MissingPermissions, ",")))
	}
	return report, fmt.Errorf("translation authz preflight failed (%s)", strings.Join(failures, "; "))
}

func resolveAuthzPreflightMode(isDev bool) authzPreflightMode {
	raw := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_AUTHZ_PREFLIGHT")))
	switch raw {
	case "off", "false", "0", "disabled", "none":
		return authzPreflightModeOff
	case "strict", "fail", "fatal", "error":
		return authzPreflightModeStrict
	case "warn", "warning", "on", "true", "1":
		return authzPreflightModeWarn
	case "":
		if isDev {
			return authzPreflightModeWarn
		}
		return authzPreflightModeOff
	default:
		if isDev {
			log.Printf("warning: unknown ADMIN_AUTHZ_PREFLIGHT=%q, defaulting to warn", raw)
			return authzPreflightModeWarn
		}
		return authzPreflightModeOff
	}
}

func resolveAuthzPreflightRoleKeys() []string {
	raw := strings.TrimSpace(os.Getenv("ADMIN_AUTHZ_PREFLIGHT_ROLES"))
	if raw == "" {
		raw = authzPreflightDefaultRolesCSV
	}
	values := splitAndTrimCSV(raw)
	if len(values) == 0 {
		return []string{"superadmin", "owner"}
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		key := strings.ToLower(strings.TrimSpace(value))
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, key)
	}
	sort.Strings(out)
	return out
}

func translationOperationRequiredPermissions(gate fggate.FeatureGate) ([]string, map[string]bool) {
	modules := map[string]bool{
		"exchange": featureEnabled(gate, string(coreadmin.FeatureTranslationExchange)),
		"queue":    featureEnabled(gate, string(coreadmin.FeatureTranslationQueue)),
	}
	required := []string{}
	if modules["exchange"] {
		required = append(required,
			coreadmin.PermAdminTranslationsExport,
			coreadmin.PermAdminTranslationsImportView,
			coreadmin.PermAdminTranslationsImportValidate,
			coreadmin.PermAdminTranslationsImportApply,
		)
	}
	if modules["queue"] {
		required = append(required,
			coreadmin.PermAdminTranslationsView,
			coreadmin.PermAdminTranslationsAssign,
			coreadmin.PermAdminTranslationsEdit,
			coreadmin.PermAdminTranslationsApprove,
			coreadmin.PermAdminTranslationsManage,
			coreadmin.PermAdminTranslationsClaim,
		)
	}
	return dedupeSortedStrings(required), modules
}

func authzPreflightScopeCandidates(cfg admin.Config) []userstypes.ScopeFilter {
	candidates := []userstypes.ScopeFilter{}
	primary := quickstart.ScopeConfigFromAdmin(cfg)
	if primary.Mode == quickstart.ScopeModeSingle {
		candidates = append(candidates, userstypes.ScopeFilter{
			TenantID: parseScopeUUID(primary.DefaultTenantID),
			OrgID:    parseScopeUUID(primary.DefaultOrgID),
		})
	}
	seed := quickstart.DefaultScopeConfig()
	candidates = append(candidates, userstypes.ScopeFilter{
		TenantID: parseScopeUUID(seed.DefaultTenantID),
		OrgID:    parseScopeUUID(seed.DefaultOrgID),
	})
	candidates = append(candidates, userstypes.ScopeFilter{})

	seen := map[string]bool{}
	out := make([]userstypes.ScopeFilter, 0, len(candidates))
	for _, candidate := range candidates {
		key := formatScope(candidate)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, candidate)
	}
	return out
}

func parseScopeUUID(raw string) uuid.UUID {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return uuid.Nil
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil
	}
	return id
}

func formatScope(scope userstypes.ScopeFilter) string {
	tenant := "-"
	org := "-"
	if scope.TenantID != uuid.Nil {
		tenant = scope.TenantID.String()
	}
	if scope.OrgID != uuid.Nil {
		org = scope.OrgID.String()
	}
	return "tenant=" + tenant + ",org=" + org
}

func findRoleByKey(
	ctx context.Context,
	registry userstypes.RoleRegistry,
	roleKey string,
	scopes []userstypes.ScopeFilter,
) (*userstypes.RoleDefinition, userstypes.ScopeFilter, error) {
	if registry == nil {
		return nil, userstypes.ScopeFilter{}, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	roleKey = strings.TrimSpace(roleKey)
	for _, scope := range scopes {
		page, err := registry.ListRoles(ctx, userstypes.RoleFilter{
			RoleKey:       roleKey,
			IncludeSystem: true,
			Scope:         scope,
		})
		if err != nil {
			return nil, scope, err
		}
		if len(page.Roles) == 0 {
			continue
		}
		role := page.Roles[0]
		return &role, scope, nil
	}
	return nil, userstypes.ScopeFilter{}, nil
}

func missingPermissions(required, granted []string) []string {
	if len(required) == 0 {
		return nil
	}
	grantedSet := map[string]bool{}
	for _, permission := range granted {
		key := strings.ToLower(strings.TrimSpace(permission))
		if key != "" {
			grantedSet[key] = true
		}
	}
	missing := make([]string, 0, len(required))
	for _, permission := range required {
		key := strings.ToLower(strings.TrimSpace(permission))
		if key == "" || grantedSet[key] {
			continue
		}
		missing = append(missing, permission)
	}
	sort.Strings(missing)
	return missing
}

func dedupeSortedStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		key := strings.ToLower(value)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}

func permissionDiagnosticsHandler(adm *admin.Admin) router.HandlerFunc {
	return func(c router.Context) error {
		payload := permissionDiagnosticsSnapshot(adm, c.Context())
		return c.JSON(fiber.StatusOK, payload)
	}
}

func permissionDiagnosticsSnapshot(adm *admin.Admin, ctx context.Context) map[string]any {
	gate := fggate.FeatureGate(nil)
	if adm != nil {
		gate = adm.FeatureGate()
	}
	session := helpers.FilterSessionUser(helpers.BuildSessionUser(ctx), gate)
	granted := permissionListFromAny(session.Metadata["permissions"])
	payload := buildPermissionDiagnosticsPayload(adm, ctx, granted)
	payload["user"] = session
	return payload
}

func buildPermissionDiagnosticsPayload(adm *admin.Admin, ctx context.Context, granted []string) map[string]any {
	if ctx == nil {
		ctx = context.Background()
	}
	gate := fggate.FeatureGate(nil)
	if adm != nil {
		gate = adm.FeatureGate()
	}
	required, modules := translationOperationRequiredPermissions(gate)
	granted = dedupeSortedStrings(granted)
	missing := missingPermissions(required, granted)

	checks := map[string]bool{}
	if adm != nil && adm.Authorizer() != nil {
		for _, permission := range required {
			checks[permission] = adm.Authorizer().Can(ctx, permission, "translations")
		}
	}

	hints := []string{}
	if len(missing) > 0 {
		hints = append(hints, "Grant missing permissions to the current role.")
		hints = append(hints, "Sign out and sign back in to refresh JWT permission claims.")
	}

	return map[string]any{
		"timestamp":            time.Now().UTC(),
		"modules":              modules,
		"enabled_modules":      enabledModuleKeys(modules),
		"required_permissions": required,
		"claims_permissions":   granted,
		"granted_permissions":  granted,
		"missing_permissions":  missing,
		"permission_checks":    checks,
		"preflight_mode":       resolveAuthzPreflightMode(isDevelopmentEnv()),
		"hints":                hints,
	}
}

func enabledModuleKeys(modules map[string]bool) []string {
	if len(modules) == 0 {
		return nil
	}
	enabled := make([]string, 0, len(modules))
	for key, value := range modules {
		if value {
			enabled = append(enabled, strings.TrimSpace(key))
		}
	}
	sort.Strings(enabled)
	return enabled
}

func permissionListFromAny(value any) []string {
	switch typed := value.(type) {
	case []string:
		return dedupeSortedStrings(typed)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if str, ok := item.(string); ok {
				out = append(out, str)
			}
		}
		return dedupeSortedStrings(out)
	case string:
		raw := strings.TrimSpace(typed)
		if raw == "" {
			return nil
		}
		parts := strings.FieldsFunc(raw, func(r rune) bool {
			return r == ',' || r == ';' || r == ' '
		})
		return dedupeSortedStrings(parts)
	default:
		return nil
	}
}

func isDevelopmentEnv() bool {
	return strings.EqualFold(os.Getenv("GO_ENV"), "development") || strings.EqualFold(os.Getenv("ENV"), "development")
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

type exportPipelineTracker struct {
	next              export.ProgressTracker
	bundleProvider    func() *quickstart.ExportBundle
	collectorProvider func() *admin.DebugCollector
	panelID           string
	publishInterval   time.Duration
	mu                sync.Mutex
	lastPublish       time.Time
}

func newExportPipelineTracker(
	next export.ProgressTracker,
	bundleProvider func() *quickstart.ExportBundle,
	collectorProvider func() *admin.DebugCollector,
) *exportPipelineTracker {
	return &exportPipelineTracker{
		next:              next,
		bundleProvider:    bundleProvider,
		collectorProvider: collectorProvider,
		panelID:           exportPipelinePanelID,
		publishInterval:   exportPipelinePublishInterval,
	}
}

func (t *exportPipelineTracker) Start(ctx context.Context, record export.ExportRecord) (string, error) {
	id, err := t.next.Start(ctx, record)
	if err == nil {
		t.publishSnapshot(ctx, true)
	}
	return id, err
}

func (t *exportPipelineTracker) Advance(ctx context.Context, id string, delta export.ProgressDelta, meta map[string]any) error {
	err := t.next.Advance(ctx, id, delta, meta)
	if err == nil {
		t.publishSnapshot(ctx, false)
	}
	return err
}

func (t *exportPipelineTracker) SetState(ctx context.Context, id string, state export.ExportState, meta map[string]any) error {
	err := t.next.SetState(ctx, id, state, meta)
	if err == nil {
		t.publishSnapshot(ctx, true)
	}
	return err
}

func (t *exportPipelineTracker) Fail(ctx context.Context, id string, err error, meta map[string]any) error {
	failErr := t.next.Fail(ctx, id, err, meta)
	if failErr == nil {
		t.publishSnapshot(ctx, true)
	}
	return failErr
}

func (t *exportPipelineTracker) Complete(ctx context.Context, id string, meta map[string]any) error {
	err := t.next.Complete(ctx, id, meta)
	if err == nil {
		t.publishSnapshot(ctx, true)
	}
	return err
}

func (t *exportPipelineTracker) Status(ctx context.Context, id string) (export.ExportRecord, error) {
	return t.next.Status(ctx, id)
}

func (t *exportPipelineTracker) List(ctx context.Context, filter export.ProgressFilter) ([]export.ExportRecord, error) {
	return t.next.List(ctx, filter)
}

func (t *exportPipelineTracker) SetArtifact(ctx context.Context, id string, ref export.ArtifactRef) error {
	tracker, ok := t.next.(export.ArtifactTracker)
	if !ok {
		return nil
	}
	err := tracker.SetArtifact(ctx, id, ref)
	if err == nil {
		t.publishSnapshot(ctx, true)
	}
	return err
}

func (t *exportPipelineTracker) Update(ctx context.Context, record export.ExportRecord) error {
	updater, ok := t.next.(export.RecordUpdater)
	if !ok {
		return nil
	}
	err := updater.Update(ctx, record)
	if err == nil {
		t.publishSnapshot(ctx, true)
	}
	return err
}

func (t *exportPipelineTracker) Delete(ctx context.Context, id string) error {
	deleter, ok := t.next.(export.RecordDeleter)
	if !ok {
		return nil
	}
	err := deleter.Delete(ctx, id)
	if err == nil {
		t.publishSnapshot(ctx, true)
	}
	return err
}

func (t *exportPipelineTracker) publishSnapshot(ctx context.Context, force bool) {
	if t == nil || t.next == nil {
		return
	}
	collector := t.collectorProvider()
	if collector == nil {
		return
	}
	bundle := t.bundleProvider()
	if bundle == nil {
		return
	}
	now := time.Now()
	if !force && t.publishInterval > 0 {
		t.mu.Lock()
		if !t.lastPublish.IsZero() && now.Sub(t.lastPublish) < t.publishInterval {
			t.mu.Unlock()
			return
		}
		t.lastPublish = now
		t.mu.Unlock()
	} else {
		t.mu.Lock()
		t.lastPublish = now
		t.mu.Unlock()
	}
	snapshot := buildExportPipelineSnapshot(ctx, bundle, t.next)
	collector.PublishPanel(t.panelID, snapshot)
}

type exportPipelineDefinition struct {
	Name         string   `json:"name"`
	Label        string   `json:"label"`
	Variants     []string `json:"variants,omitempty"`
	Formats      []string `json:"formats,omitempty"`
	ColumnCount  int      `json:"column_count,omitempty"`
	ColumnSample []string `json:"column_sample,omitempty"`
}

type exportPipelineRecord struct {
	ID           string              `json:"id"`
	Definition   string              `json:"definition"`
	Format       string              `json:"format"`
	State        export.ExportState  `json:"state"`
	RequestedBy  string              `json:"requested_by,omitempty"`
	Scope        export.Scope        `json:"scope,omitempty"`
	Counts       export.ExportCounts `json:"counts,omitempty"`
	BytesWritten int64               `json:"bytes_written,omitempty"`
	ArtifactKey  string              `json:"artifact_key,omitempty"`
	CreatedAt    time.Time           `json:"created_at"`
	StartedAt    time.Time           `json:"started_at,omitempty"`
	CompletedAt  time.Time           `json:"completed_at,omitempty"`
	ExpiresAt    time.Time           `json:"expires_at,omitempty"`
	DurationMs   int64               `json:"duration_ms,omitempty"`
	ProgressPct  float64             `json:"progress_pct,omitempty"`
}

type exportPipelineSnapshot struct {
	UpdatedAt      time.Time                  `json:"updated_at"`
	LatestExportAt time.Time                  `json:"latest_export_at,omitempty"`
	Summary        map[string]int             `json:"summary"`
	Definitions    []exportPipelineDefinition `json:"definitions,omitempty"`
	Recent         []exportPipelineRecord     `json:"recent,omitempty"`
}

func registerExportPipelinePanel(bundle *quickstart.ExportBundle) {
	if bundle == nil {
		return
	}
	_ = debugregistry.RegisterPanel(exportPipelinePanelID, debugregistry.PanelConfig{
		Label:           "Export Pipeline",
		Icon:            "download",
		SnapshotKey:     exportPipelinePanelID,
		EventType:       exportPipelinePanelID,
		SupportsToolbar: admin.BoolPtr(false),
		Category:        "data",
		Order:           80,
		Snapshot: func(ctx context.Context) any {
			tracker := bundle.Runner
			if tracker == nil || tracker.Tracker == nil {
				return exportPipelineSnapshot{
					UpdatedAt: time.Now(),
					Summary:   exportPipelineSummary(),
				}
			}
			return buildExportPipelineSnapshot(ctx, bundle, tracker.Tracker)
		},
	})
}

func buildExportPipelineSnapshot(
	ctx context.Context,
	bundle *quickstart.ExportBundle,
	tracker export.ProgressTracker,
) exportPipelineSnapshot {
	snapshot := exportPipelineSnapshot{
		UpdatedAt: time.Now(),
		Summary:   exportPipelineSummary(),
	}
	if bundle == nil {
		return snapshot
	}
	if defs, err := bundle.Registry.ListDefinitions(ctx); err == nil {
		snapshot.Definitions = buildExportPipelineDefinitions(ctx, bundle, defs)
	}
	if tracker == nil {
		return snapshot
	}
	records, err := tracker.List(ctx, export.ProgressFilter{})
	if err != nil || len(records) == 0 {
		return snapshot
	}
	sort.Slice(records, func(i, j int) bool {
		return records[i].CreatedAt.After(records[j].CreatedAt)
	})
	snapshot.Summary["total"] = len(records)
	for _, record := range records {
		snapshot.Summary[string(record.State)]++
	}
	snapshot.Summary["active"] = snapshot.Summary["queued"] + snapshot.Summary["running"] + snapshot.Summary["publishing"]
	snapshot.LatestExportAt = records[0].CreatedAt
	limit := exportPipelineSnapshotLimit
	if len(records) < limit {
		limit = len(records)
	}
	now := snapshot.UpdatedAt
	snapshot.Recent = make([]exportPipelineRecord, 0, limit)
	for i := 0; i < limit; i++ {
		snapshot.Recent = append(snapshot.Recent, buildExportPipelineRecord(records[i], now))
	}
	return snapshot
}

func buildExportPipelineDefinitions(
	ctx context.Context,
	bundle *quickstart.ExportBundle,
	defs []coreadmin.ExportDefinition,
) []exportPipelineDefinition {
	if bundle == nil || len(defs) == 0 {
		return nil
	}
	definitions := make([]exportPipelineDefinition, 0, len(defs))
	for _, def := range defs {
		label := strings.TrimSpace(def.Label)
		if label == "" {
			label = def.Name
		}
		definition := exportPipelineDefinition{
			Name:     def.Name,
			Label:    label,
			Variants: def.Variants,
		}
		if bundle.Metadata != nil {
			meta, err := bundle.Metadata.ExportMetadata(ctx, def.Name, "")
			if err == nil {
				definition.Formats = meta.Formats
				definition.ColumnCount = len(meta.Columns)
				definition.ColumnSample = exportPipelineColumnSample(meta.Columns, 8)
			}
		}
		definitions = append(definitions, definition)
	}
	return definitions
}

func exportPipelineColumnSample(columns []coreadmin.ExportColumn, max int) []string {
	if len(columns) == 0 || max <= 0 {
		return nil
	}
	count := len(columns)
	if count > max {
		count = max
	}
	out := make([]string, 0, count)
	for i := 0; i < count; i++ {
		key := strings.TrimSpace(columns[i].Key)
		if key == "" {
			continue
		}
		out = append(out, key)
	}
	return out
}

func buildExportPipelineRecord(record export.ExportRecord, now time.Time) exportPipelineRecord {
	entry := exportPipelineRecord{
		ID:           record.ID,
		Definition:   record.Definition,
		Format:       string(record.Format),
		State:        record.State,
		RequestedBy:  strings.TrimSpace(record.RequestedBy.ID),
		Scope:        record.Scope,
		Counts:       record.Counts,
		BytesWritten: record.BytesWritten,
		ArtifactKey:  strings.TrimSpace(record.Artifact.Key),
		CreatedAt:    record.CreatedAt,
		StartedAt:    record.StartedAt,
		CompletedAt:  record.CompletedAt,
		ExpiresAt:    record.ExpiresAt,
	}
	if record.Counts.Total > 0 {
		entry.ProgressPct = (float64(record.Counts.Processed) / float64(record.Counts.Total)) * 100
	}
	if !record.StartedAt.IsZero() {
		end := record.CompletedAt
		if end.IsZero() {
			end = now
		}
		entry.DurationMs = end.Sub(record.StartedAt).Milliseconds()
	}
	return entry
}

func exportPipelineSummary() map[string]int {
	return map[string]int{
		"total":      0,
		"queued":     0,
		"running":    0,
		"publishing": 0,
		"completed":  0,
		"failed":     0,
		"canceled":   0,
		"deleted":    0,
		"active":     0,
	}
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

// triggerTestError generates test errors for dev error page testing.
// Usage: /admin/test-error?type=internal (or /admin/test-error/internal)
// Types: internal, notfound, forbidden, validation, panic, nested
func triggerTestError(errorType string) error {
	switch errorType {
	case "notfound", "404":
		return goerrors.New("requested resource does not exist", goerrors.CategoryNotFound).
			WithCode(fiber.StatusNotFound).
			WithTextCode("NOT_FOUND").
			WithMetadata(map[string]any{
				"resource_type": "example",
				"resource_id":   "test-123",
			})
	case "forbidden", "403":
		return goerrors.New("you do not have permission to access this resource", goerrors.CategoryAuthz).
			WithCode(fiber.StatusForbidden).
			WithTextCode("FORBIDDEN").
			WithMetadata(map[string]any{
				"required_permission": "admin.test.access",
			})
	case "validation", "400":
		return goerrors.New("validation failed", goerrors.CategoryValidation).
			WithCode(fiber.StatusBadRequest).
			WithTextCode("VALIDATION_ERROR").
			WithMetadata(map[string]any{
				"fields": map[string]string{
					"email":    "invalid email format",
					"username": "username must be at least 3 characters",
				},
			})
	case "panic":
		panic("intentional panic for error page testing")
	case "nested":
		return nestedErrorExample()
	case "template":
		return goerrors.New("failed to render: template error on line 42", goerrors.CategoryInternal).
			WithCode(fiber.StatusInternalServerError).
			WithTextCode("TEMPLATE_ERROR").
			WithMetadata(map[string]any{
				"template": "users/detail.html",
				"line":     42,
			})
	default:
		return goerrors.New("this is a test internal server error for dev error page testing", goerrors.CategoryInternal).
			WithCode(fiber.StatusInternalServerError).
			WithTextCode("INTERNAL_ERROR").
			WithMetadata(map[string]any{
				"test_type": errorType,
				"timestamp": time.Now().Format(time.RFC3339),
			})
	}
}

func nestedErrorExample() error {
	return fmt.Errorf("outer error: %w",
		fmt.Errorf("middle error: %w",
			goerrors.New("root cause: database connection failed", goerrors.CategoryExternal).
				WithCode(fiber.StatusInternalServerError).
				WithTextCode("DB_CONNECTION_ERROR").
				WithMetadata(map[string]any{
					"host":     "localhost:5432",
					"database": "example_db",
				})))
}
