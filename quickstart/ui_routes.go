package quickstart

import (
	"fmt"
	"net/url"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// UIViewContextBuilder mutates the view context for UI routes.
type UIViewContextBuilder func(ctx router.ViewContext, active string, c router.Context) router.ViewContext

// UIRouteOption customizes the default UI route wiring.
type UIRouteOption func(*uiRouteOptions)

type uiRouteOptions struct {
	basePath                             string
	dashboardPath                        string
	notificationsPath                    string
	activityPath                         string
	featureFlagsPath                     string
	translationQueuePath                 string
	translationFamilyListPath            string
	translationFamilyDetailPath          string
	translationFamilyAssignmentsPath     string
	translationEditorPath                string
	translationMatrixPath                string
	translationDashboardPath             string
	translationExchangePath              string
	dashboardTemplate                    string
	notificationsTemplate                string
	activityTemplate                     string
	featureFlagsTemplate                 string
	translationShellTemplate             string
	translationFamilyListTemplate        string
	translationFamilyDetailTemplate      string
	translationFamilyAssignmentsTemplate string
	translationEditorTemplate            string
	translationMatrixTemplate            string
	translationDashboardTemplate         string
	translationExchangeTemplate          string
	dashboardTitle                       string
	notificationsTitle                   string
	activityTitle                        string
	featureFlagsTitle                    string
	translationQueueTitle                string
	translationFamilyListTitle           string
	translationFamilyDetailTitle         string
	translationFamilyAssignmentsTitle    string
	translationEditorTitle               string
	translationMatrixTitle               string
	translationDashboardTitle            string
	translationExchangeTitle             string
	dashboardActive                      string
	notificationsActive                  string
	activityActive                       string
	featureFlagsActive                   string
	translationQueueActive               string
	translationFamilyListActive          string
	translationFamilyDetailActive        string
	translationFamilyAssignmentsActive   string
	translationEditorActive              string
	translationMatrixActive              string
	translationDashboardActive           string
	translationExchangeActive            string
	registerDashboard                    bool
	registerNotifications                bool
	registerActivity                     bool
	registerFeatureFlags                 bool
	registerTranslationQueue             bool
	registerTranslationFamilyList        bool
	registerTranslationFamilyDetail      bool
	registerTranslationFamilyAssignments bool
	registerTranslationEditor            bool
	registerTranslationMatrix            bool
	registerTranslationDashboard         bool
	registerTranslationExchange          bool
	translationExchangeUIConfig          TranslationExchangeUIConfig
	translationSSRPresenter              admin.TranslationSSRPresenter
	enhancedActionRuntime                admin.EnhancedActionRuntimeOptions
	translationQueueUI                   admin.TranslationQueueUIOptions
	viewContext                          UIViewContextBuilder
}

// WithUIBasePath overrides the base path used to build default routes.
func WithUIBasePath(basePath string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts == nil {
			return
		}
		opts.basePath = strings.TrimSpace(basePath)
	}
}

// WithUIDashboardRoute toggles the dashboard route registration.
func WithUIDashboardRoute(enabled bool) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.registerDashboard = enabled
		}
	}
}

// WithUINotificationsRoute toggles the notifications route registration.
func WithUINotificationsRoute(enabled bool) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.registerNotifications = enabled
		}
	}
}

// WithUIActivityRoute toggles the activity route registration.
func WithUIActivityRoute(enabled bool) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.registerActivity = enabled
		}
	}
}

// WithUIFeatureFlagsRoute toggles the feature flags route registration.
func WithUIFeatureFlagsRoute(enabled bool) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.registerFeatureFlags = enabled
		}
	}
}

// WithUITranslationDashboardRoute toggles the translation dashboard route registration.
func WithUITranslationDashboardRoute(enabled bool) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.registerTranslationDashboard = enabled
		}
	}
}

// WithUITranslationExchangeRoute toggles the translation exchange route registration.
func WithUITranslationExchangeRoute(enabled bool) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.registerTranslationExchange = enabled
		}
	}
}

// WithUIDashboardPath overrides the dashboard route path.
func WithUIDashboardPath(route string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.dashboardPath = strings.TrimSpace(route)
		}
	}
}

// WithUINotificationsPath overrides the notifications route path.
func WithUINotificationsPath(route string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.notificationsPath = strings.TrimSpace(route)
		}
	}
}

// WithUIActivityPath overrides the activity route path.
func WithUIActivityPath(route string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.activityPath = strings.TrimSpace(route)
		}
	}
}

// WithUIFeatureFlagsPath overrides the feature flags route path.
func WithUIFeatureFlagsPath(route string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.featureFlagsPath = strings.TrimSpace(route)
		}
	}
}

// WithUITranslationDashboardPath overrides the translation dashboard route path.
func WithUITranslationDashboardPath(route string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.translationDashboardPath = strings.TrimSpace(route)
		}
	}
}

// WithUITranslationExchangePath overrides the translation exchange route path.
func WithUITranslationExchangePath(route string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.translationExchangePath = strings.TrimSpace(route)
		}
	}
}

// WithUIDashboardTemplate overrides the dashboard template name.
func WithUIDashboardTemplate(name string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.dashboardTemplate = strings.TrimSpace(name)
		}
	}
}

// WithUINotificationsTemplate overrides the notifications template name.
func WithUINotificationsTemplate(name string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.notificationsTemplate = strings.TrimSpace(name)
		}
	}
}

// WithUIActivityTemplate overrides the activity template name.
func WithUIActivityTemplate(name string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.activityTemplate = strings.TrimSpace(name)
		}
	}
}

// WithUIFeatureFlagsTemplate overrides the feature flags template name.
func WithUIFeatureFlagsTemplate(name string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.featureFlagsTemplate = strings.TrimSpace(name)
		}
	}
}

// WithUITranslationDashboardTemplate overrides the translation dashboard template name.
func WithUITranslationDashboardTemplate(name string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.translationDashboardTemplate = strings.TrimSpace(name)
		}
	}
}

// WithUITranslationExchangeTemplate overrides the translation exchange template name.
func WithUITranslationExchangeTemplate(name string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.translationExchangeTemplate = strings.TrimSpace(name)
		}
	}
}

// WithUIDashboardTitle overrides the dashboard view title.
func WithUIDashboardTitle(title string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.dashboardTitle = strings.TrimSpace(title)
		}
	}
}

// WithUINotificationsTitle overrides the notifications view title.
func WithUINotificationsTitle(title string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.notificationsTitle = strings.TrimSpace(title)
		}
	}
}

// WithUIActivityTitle overrides the activity view title.
func WithUIActivityTitle(title string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.activityTitle = strings.TrimSpace(title)
		}
	}
}

// WithUIFeatureFlagsTitle overrides the feature flags view title.
func WithUIFeatureFlagsTitle(title string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.featureFlagsTitle = strings.TrimSpace(title)
		}
	}
}

// WithUITranslationDashboardTitle overrides the translation dashboard view title.
func WithUITranslationDashboardTitle(title string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.translationDashboardTitle = strings.TrimSpace(title)
		}
	}
}

// WithUITranslationExchangeTitle overrides the translation exchange view title.
func WithUITranslationExchangeTitle(title string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.translationExchangeTitle = strings.TrimSpace(title)
		}
	}
}

// WithUIDashboardActive sets the active menu key for the dashboard route.
func WithUIDashboardActive(active string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.dashboardActive = strings.TrimSpace(active)
		}
	}
}

// WithUINotificationsActive sets the active menu key for the notifications route.
func WithUINotificationsActive(active string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.notificationsActive = strings.TrimSpace(active)
		}
	}
}

// WithUIActivityActive sets the active menu key for the activity route.
func WithUIActivityActive(active string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.activityActive = strings.TrimSpace(active)
		}
	}
}

// WithUIFeatureFlagsActive sets the active menu key for the feature flags route.
func WithUIFeatureFlagsActive(active string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.featureFlagsActive = strings.TrimSpace(active)
		}
	}
}

// WithUITranslationDashboardActive sets the active menu key for the translation dashboard route.
func WithUITranslationDashboardActive(active string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.translationDashboardActive = strings.TrimSpace(active)
		}
	}
}

// WithUITranslationExchangeActive sets the active menu key for the translation exchange route.
func WithUITranslationExchangeActive(active string) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.translationExchangeActive = strings.TrimSpace(active)
		}
	}
}

// WithUIViewContextBuilder overrides the default view context builder.
func WithUIViewContextBuilder(builder UIViewContextBuilder) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil && builder != nil {
			opts.viewContext = builder
		}
	}
}

// WithUITranslationSSRPresenter overrides translation SSR hydration for route tests or custom hosts.
func WithUITranslationSSRPresenter(presenter admin.TranslationSSRPresenter) UIRouteOption {
	return func(opts *uiRouteOptions) {
		if opts != nil {
			opts.translationSSRPresenter = presenter
		}
	}
}

// RegisterAdminUIRoutes registers default UI routes (dashboard + notifications).
func RegisterAdminUIRoutes[T any](r router.Router[T], cfg admin.Config, adm *admin.Admin, auth admin.HandlerAuthenticator, opts ...UIRouteOption) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}
	options := resolveAdminUIRouteOptions(cfg, adm, opts)
	wrap := wrapQuickstartRouteAuth(auth)
	renderView := func(c router.Context, template, title, active string, extra router.ViewContext) error {
		return renderQuickstartUIView(c, template, title, active, options.basePath, options.viewContext, extra)
	}
	resolveAPIBase := func() string {
		return resolveQuickstartAdminAPIBase(adm, cfg, options.basePath)
	}

	registerAdminUIStandardRoutes(r, options, wrap, renderView, resolveAPIBase)
	registerAdminUITranslationRoutes(r, options, wrap, renderView, resolveAPIBase)
	return nil
}

func resolveAdminUIRouteOptions(cfg admin.Config, adm *admin.Admin, opts []UIRouteOption) uiRouteOptions {
	exposure := resolveTranslationModuleExposureSnapshot(adm, nil)
	queueModuleEnabled := exposure.Queue.CapabilityEnabled
	exchangeModuleEnabled := exposure.Exchange.CapabilityEnabled
	coreModuleEnabled := translationCoreModuleEnabled(adm)

	options := uiRouteOptions{
		basePath:                             strings.TrimSpace(cfg.BasePath),
		dashboardTemplate:                    "admin",
		notificationsTemplate:                "notifications",
		activityTemplate:                     "resources/activity/list",
		featureFlagsTemplate:                 "resources/feature-flags/index",
		translationShellTemplate:             "resources/translations/shell",
		translationFamilyListTemplate:        "resources/translations/families",
		translationFamilyDetailTemplate:      "resources/translations/family-detail",
		translationFamilyAssignmentsTemplate: "resources/translations/family-assignments",
		translationEditorTemplate:            "resources/translations/editor",
		translationMatrixTemplate:            "resources/translations/matrix",
		translationDashboardTemplate:         "resources/translations/dashboard",
		translationExchangeTemplate:          "resources/translations/exchange",
		dashboardTitle:                       strings.TrimSpace(cfg.Title),
		notificationsTitle:                   strings.TrimSpace(cfg.Title),
		activityTitle:                        "Activity",
		featureFlagsTitle:                    "Feature Flags",
		translationQueueTitle:                "Translation Queue",
		translationFamilyListTitle:           "Translation Families",
		translationFamilyDetailTitle:         "Translation Family",
		translationFamilyAssignmentsTitle:    "Family Assignments",
		translationEditorTitle:               "Translation Editor",
		translationMatrixTitle:               "Translation Matrix",
		translationDashboardTitle:            "Translation Dashboard",
		translationExchangeTitle:             "Translation Exchange",
		dashboardActive:                      "dashboard",
		notificationsActive:                  "notifications",
		activityActive:                       "activity",
		featureFlagsActive:                   "feature_flags",
		translationQueueActive:               "translation_queue",
		translationFamilyListActive:          "translation_families",
		translationFamilyDetailActive:        "translation_families",
		translationFamilyAssignmentsActive:   "translation_queue",
		translationEditorActive:              "translation_editor",
		translationMatrixActive:              "translation_matrix",
		translationDashboardActive:           "translation_dashboard",
		translationExchangeActive:            "translation_exchange",
		registerDashboard:                    true,
		registerNotifications:                true,
		registerActivity:                     true,
		registerFeatureFlags:                 true,
		registerTranslationQueue:             queueModuleEnabled,
		registerTranslationFamilyList:        coreModuleEnabled,
		registerTranslationFamilyDetail:      coreModuleEnabled,
		registerTranslationFamilyAssignments: queueModuleEnabled,
		registerTranslationEditor:            queueModuleEnabled,
		registerTranslationMatrix:            coreModuleEnabled,
		registerTranslationDashboard:         queueModuleEnabled,
		registerTranslationExchange:          exchangeModuleEnabled,
		translationExchangeUIConfig:          translationExchangeUIConfigForAdmin(adm),
		enhancedActionRuntime:                adm.EnhancedActionRuntimeOptions(),
		translationQueueUI:                   translationQueueUIOptionsForAdmin(adm),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	applyAdminUITranslationCapabilityGates(&options, queueModuleEnabled, coreModuleEnabled, exchangeModuleEnabled)
	options.basePath = normalizeQuickstartRouteBasePath(options.basePath)
	applyAdminUIRoutePathDefaults(&options)
	if options.translationSSRPresenter == nil {
		options.translationSSRPresenter = admin.NewTranslationSSRPresenter(adm)
	}
	options.viewContext = resolveQuickstartUIViewContextBuilder(adm, cfg, options.viewContext)
	return options
}

func translationCoreModuleEnabled(adm *admin.Admin) bool {
	if _, ok := translationCapabilitiesStore.Load(adm); !ok {
		return false
	}
	caps := translationCapabilitiesForAdmin(adm)
	if len(caps) == 0 {
		return false
	}
	productized, ok := caps["productized"].(bool)
	if !ok {
		return false
	}
	return productized && !strings.EqualFold(strings.TrimSpace(fmt.Sprint(caps["profile"])), "none")
}

func applyAdminUITranslationCapabilityGates(options *uiRouteOptions, queueModuleEnabled, coreModuleEnabled, exchangeModuleEnabled bool) {
	if !queueModuleEnabled {
		options.registerTranslationQueue = false
		options.registerTranslationEditor = false
		options.registerTranslationDashboard = false
		options.registerTranslationFamilyAssignments = false
	}
	if !coreModuleEnabled {
		options.registerTranslationFamilyList = false
		options.registerTranslationFamilyDetail = false
		options.registerTranslationMatrix = false
	}
	if !exchangeModuleEnabled {
		options.registerTranslationExchange = false
	}
}

func applyAdminUIRoutePathDefaults(options *uiRouteOptions) {
	if options.dashboardPath == "" {
		options.dashboardPath = options.basePath
	}
	if options.notificationsPath == "" {
		options.notificationsPath = path.Join(options.basePath, "notifications")
	}
	if options.activityPath == "" {
		options.activityPath = path.Join(options.basePath, "activity")
	}
	if options.featureFlagsPath == "" {
		options.featureFlagsPath = path.Join(options.basePath, "feature-flags")
	}
	if options.translationDashboardPath == "" {
		options.translationDashboardPath = path.Join(options.basePath, "translations", "dashboard")
	}
	if options.translationQueuePath == "" {
		options.translationQueuePath = path.Join(options.basePath, "translations", "queue")
	}
	if options.translationFamilyListPath == "" {
		options.translationFamilyListPath = path.Join(options.basePath, "translations", "families")
	}
	if options.translationFamilyDetailPath == "" {
		options.translationFamilyDetailPath = path.Join(options.basePath, "translations", "families", ":family_id")
	}
	if options.translationFamilyAssignmentsPath == "" {
		options.translationFamilyAssignmentsPath = path.Join(options.basePath, "translations", "families", ":family_id", "assignments")
	}
	if options.translationEditorPath == "" {
		options.translationEditorPath = path.Join(options.basePath, "translations", "assignments", ":assignment_id", "edit")
	}
	if options.translationMatrixPath == "" {
		options.translationMatrixPath = path.Join(options.basePath, "translations", "matrix")
	}
	if options.translationExchangePath == "" {
		options.translationExchangePath = path.Join(options.basePath, "translations", "exchange")
	}
}

func registerAdminUIStandardRoutes[T any](
	r router.Router[T],
	options uiRouteOptions,
	wrap func(router.HandlerFunc) router.HandlerFunc,
	renderView func(router.Context, string, string, string, router.ViewContext) error,
	resolveAPIBase func() string,
) {
	if options.registerDashboard {
		r.Get(options.dashboardPath, wrap(func(c router.Context) error {
			return renderView(c, options.dashboardTemplate, options.dashboardTitle, options.dashboardActive, nil)
		}))
	}

	if options.registerNotifications {
		r.Get(options.notificationsPath, wrap(func(c router.Context) error {
			return renderView(c, options.notificationsTemplate, options.notificationsTitle, options.notificationsActive, nil)
		}))
	}

	if options.registerActivity {
		r.Get(options.activityPath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			return renderView(c, options.activityTemplate, options.activityTitle, options.activityActive, router.ViewContext{
				"activity_api_path": prefixBasePath(apiBase, "activity"),
			})
		}))
	}

	if options.registerFeatureFlags {
		r.Get(options.featureFlagsPath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			return renderView(c, options.featureFlagsTemplate, options.featureFlagsTitle, options.featureFlagsActive, router.ViewContext{
				"feature_flags_api_path": prefixBasePath(apiBase, "feature-flags"),
			})
		}))
	}
}

func registerAdminUITranslationRoutes[T any](
	r router.Router[T],
	options uiRouteOptions,
	wrap func(router.HandlerFunc) router.HandlerFunc,
	renderView func(router.Context, string, string, string, router.ViewContext) error,
	resolveAPIBase func() string,
) {
	registerAdminUITranslationOverviewRoutes(r, options, wrap, renderView, resolveAPIBase)
	registerAdminUITranslationDetailRoutes(r, options, wrap, renderView, resolveAPIBase)
}

func registerAdminUITranslationOverviewRoutes[T any](
	r router.Router[T],
	options uiRouteOptions,
	wrap func(router.HandlerFunc) router.HandlerFunc,
	renderView func(router.Context, string, string, string, router.ViewContext) error,
	resolveAPIBase func() string,
) {
	if options.registerTranslationDashboard {
		r.Get(options.translationDashboardPath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			view := router.ViewContext{
				"translation_dashboard_api_path": prefixBasePath(apiBase, path.Join("translations", "dashboard")),
				"translation_queue_api_path":     prefixBasePath(apiBase, path.Join("translations", "queue")),
				"translation_families_api_path":  prefixBasePath(apiBase, path.Join("translations", "families")),
			}
			input := translationSSRInput(c, options, apiBase)
			if !options.registerTranslationQueue {
				input.QueuePath = ""
			}
			if !options.registerTranslationFamilyList {
				input.FamilyListPath = ""
			}
			view = withTranslationSSRView(c, view, options, input, options.translationSSRPresenter.Dashboard, "translation_dashboard_ssr")
			return renderView(c, options.translationDashboardTemplate, options.translationDashboardTitle, options.translationDashboardActive, view)
		}))
	}

	if options.registerTranslationQueue {
		r.Get(options.translationQueuePath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			initialPresetID := translationSSRQueueInitialPreset(c)
			view := router.ViewContext{
				"translation_shell_surface":              "queue",
				"translation_shell_title":                options.translationQueueTitle,
				"translation_shell_description":          "Assignment-centric queue with saved filters, keyboard row navigation, and inline claim/release actions.",
				"translation_shell_api_path":             prefixBasePath(apiBase, path.Join("translations", "assignments")),
				"translation_assignment_action_api_path": translationAssignmentActionAPIBasePath(c, apiBase),
				"translation_queue_bulk_action_api_path": prefixBasePath(apiBase, path.Join("translations", "assignment-actions", "bulk")),
				"translation_queue_editor_base_path":     path.Join(options.basePath, "translations", "assignments"),
				"translation_queue_initial_preset":       initialPresetID,
			}
			input := translationSSRInput(c, options, apiBase)
			input.InitialPresetID = initialPresetID
			view = withTranslationSSRView(c, view, options, input, options.translationSSRPresenter.Queue, "translation_queue_ssr")
			return renderView(c, options.translationShellTemplate, options.translationQueueTitle, options.translationQueueActive, view)
		}))
	}
}

//nolint:funlen // Route registration keeps the translation detail endpoints together for generic router wiring.
func registerAdminUITranslationDetailRoutes[T any](
	r router.Router[T],
	options uiRouteOptions,
	wrap func(router.HandlerFunc) router.HandlerFunc,
	renderView func(router.Context, string, string, string, router.ViewContext) error,
	resolveAPIBase func() string,
) {
	if options.registerTranslationFamilyList {
		r.Get(options.translationFamilyListPath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			matrixPath := ""
			if options.registerTranslationMatrix {
				matrixPath = options.translationMatrixPath
			}
			queuePath := ""
			if options.registerTranslationQueue {
				queuePath = options.translationQueuePath
			}
			view := WithBreadcrumbSpec(router.ViewContext{
				"translation_families_api_path": prefixBasePath(apiBase, path.Join("translations", "families")),
				"translation_family_base_path":  path.Join(options.basePath, "translations", "families"),
				"translation_matrix_path":       matrixPath,
				"translation_queue_path":        queuePath,
			}, BreadcrumbSpec{
				RootLabel:    "Dashboard",
				RootHref:     options.basePath,
				Trail:        []BreadcrumbItem{Breadcrumb(options.translationDashboardTitle, options.translationDashboardPath)},
				CurrentLabel: options.translationFamilyListTitle,
			})
			input := translationSSRInput(c, options, apiBase)
			input.MatrixPath = matrixPath
			input.QueuePath = queuePath
			view = withTranslationSSRView(c, view, options, input, options.translationSSRPresenter.FamilyList, "translation_families_ssr")
			return renderView(c, options.translationFamilyListTemplate, options.translationFamilyListTitle, options.translationFamilyListActive, view)
		}))
	}

	if options.registerTranslationFamilyAssignments {
		r.Get(options.translationFamilyAssignmentsPath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			familyID := strings.TrimSpace(c.Param("family_id"))
			familyDetailHref := path.Join(options.basePath, "translations", "families", familyID)
			view := WithBreadcrumbSpec(router.ViewContext{
				"translation_family_id":                   familyID,
				"translation_family_assignments_api_path": prefixBasePath(apiBase, path.Join("translations", "families", familyID, "assignments")),
				"translation_assignment_action_api_path":  translationAssignmentActionAPIBasePath(c, apiBase),
				"translation_family_detail_path":          familyDetailHref,
				"translation_queue_path":                  options.translationQueuePath,
				"translation_queue_editor_base_path":      path.Join(options.basePath, "translations", "assignments"),
			}, BreadcrumbSpec{
				RootLabel: "Dashboard",
				RootHref:  options.basePath,
				Trail: []BreadcrumbItem{
					Breadcrumb(options.translationDashboardTitle, options.translationDashboardPath),
					Breadcrumb(options.translationQueueTitle, options.translationQueuePath),
					Breadcrumb(fmt.Sprintf("Family %s", shortIdentifier(familyID)), familyDetailHref),
				},
				CurrentLabel: "Assignments",
			})
			input := translationSSRInput(c, options, apiBase)
			input.FamilyID = familyID
			view = withTranslationSSRView(c, view, options, input, options.translationSSRPresenter.FamilyAssignments, "translation_family_assignments_ssr")
			return renderView(c, options.translationFamilyAssignmentsTemplate, options.translationFamilyAssignmentsTitle, options.translationFamilyAssignmentsActive, view)
		}))
	}

	if options.registerTranslationFamilyDetail {
		r.Get(options.translationFamilyDetailPath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			familyID := strings.TrimSpace(c.Param("family_id"))
			view := WithBreadcrumbSpec(router.ViewContext{
				"translation_family_id":       familyID,
				"translation_family_api_path": prefixBasePath(apiBase, path.Join("translations", "families", familyID)),
				"translation_content_base":    path.Join(options.basePath, "content"),
			}, BreadcrumbSpec{
				RootLabel:    "Dashboard",
				RootHref:     options.basePath,
				Trail:        []BreadcrumbItem{Breadcrumb(options.translationDashboardTitle, options.translationDashboardPath)},
				CurrentLabel: fmt.Sprintf("Family %s", shortIdentifier(familyID)),
			})
			input := translationSSRInput(c, options, apiBase)
			input.FamilyID = familyID
			view = withTranslationSSRView(c, view, options, input, options.translationSSRPresenter.FamilyDetail, "translation_family_detail_ssr")
			return renderView(c, options.translationFamilyDetailTemplate, options.translationFamilyDetailTitle, options.translationFamilyDetailActive, view)
		}))
	}

	if options.registerTranslationEditor {
		r.Get(options.translationEditorPath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			assignmentID := strings.TrimSpace(c.Param("assignment_id"))
			channel := resolveContentChannel(c)
			editorAPIPath := translationEditorAPIPathWithChannel(
				prefixBasePath(apiBase, path.Join("translations", "assignments", assignmentID)),
				channel,
			)
			view := WithBreadcrumbSpec(router.ViewContext{
				"translation_assignment_id":                assignmentID,
				"translation_editor_api_path":              editorAPIPath,
				"translation_editor_action_api_base":       prefixBasePath(apiBase, path.Join("translations", "assignments")),
				"translation_editor_sync_api_base":         prefixBasePath(apiBase, "translations"),
				"translation_editor_sync_client_base_path": ResolveSyncClientAssetsPrefix(admin.Config{BasePath: options.basePath}),
				"translation_editor_channel":               channel,
			}, BreadcrumbSpec{
				RootLabel:    "Dashboard",
				RootHref:     options.basePath,
				Trail:        []BreadcrumbItem{Breadcrumb(options.translationQueueTitle, options.translationQueuePath)},
				CurrentLabel: fmt.Sprintf("Assignment %s", assignmentID),
			})
			input := translationSSRInput(c, options, apiBase)
			input.AssignmentID = assignmentID
			input.Channel = channel
			view = withTranslationSSRView(c, view, options, input, options.translationSSRPresenter.Editor, "translation_editor_ssr")
			return renderView(c, options.translationEditorTemplate, options.translationEditorTitle, options.translationEditorActive, view)
		}))
	}

	if options.registerTranslationMatrix {
		r.Get(options.translationMatrixPath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			view := WithBreadcrumbSpec(router.ViewContext{
				"translation_matrix_api_path": prefixBasePath(apiBase, path.Join("translations", "matrix")),
			}, BreadcrumbSpec{
				RootLabel:    "Dashboard",
				RootHref:     options.basePath,
				Trail:        []BreadcrumbItem{Breadcrumb(options.translationDashboardTitle, options.translationDashboardPath)},
				CurrentLabel: "Matrix",
			})
			input := translationSSRInput(c, options, apiBase)
			view = withTranslationSSRView(c, view, options, input, options.translationSSRPresenter.Matrix, "translation_matrix_ssr")
			return renderView(c, options.translationMatrixTemplate, options.translationMatrixTitle, options.translationMatrixActive, view)
		}))
	}

	if options.registerTranslationExchange {
		r.Get(options.translationExchangePath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			view := WithBreadcrumbSpec(router.ViewContext{
				"translation_exchange_api_path":  prefixBasePath(apiBase, path.Join("translations", "exchange")),
				"translation_exchange_ui_config": options.translationExchangeUIConfig,
			}, BreadcrumbSpec{
				RootLabel:    "Dashboard",
				RootHref:     options.basePath,
				Trail:        []BreadcrumbItem{Breadcrumb(options.translationDashboardTitle, options.translationDashboardPath)},
				CurrentLabel: "Exchange",
			})
			input := translationSSRInput(c, options, apiBase)
			view = withTranslationSSRView(c, view, options, input, options.translationSSRPresenter.Exchange, "translation_exchange_ssr")
			return renderView(c, options.translationExchangeTemplate, options.translationExchangeTitle, options.translationExchangeActive, view)
		}))
	}
}

type translationSSRHydrator func(router.Context, admin.TranslationSSRPresenterInput) (admin.TranslationSSRPage, error)

func translationSSRInput(c router.Context, options uiRouteOptions, apiBase string) admin.TranslationSSRPresenterInput {
	channel := resolveContentChannel(c)
	return admin.TranslationSSRPresenterInput{
		BasePath:           options.basePath,
		APIBasePath:        apiBase,
		DashboardPath:      options.translationDashboardPath,
		QueuePath:          options.translationQueuePath,
		FamilyListPath:     options.translationFamilyListPath,
		FamilyBasePath:     path.Join(options.basePath, "translations", "families"),
		MatrixPath:         options.translationMatrixPath,
		ExchangePath:       options.translationExchangePath,
		EditorBasePath:     path.Join(options.basePath, "translations", "assignments"),
		ContentBasePath:    path.Join(options.basePath, "content"),
		MatrixAPIPath:      prefixBasePath(apiBase, path.Join("translations", "matrix")),
		ExchangeAPIPath:    prefixBasePath(apiBase, path.Join("translations", "exchange")),
		BulkActionAPIPath:  prefixBasePath(apiBase, path.Join("translations", "assignment-actions", "bulk")),
		Channel:            channel,
		Query:              translationSSRQueryValues(c),
		ExchangeUIConfig:   options.translationExchangeUIConfig,
		SyncClientBasePath: ResolveSyncClientAssetsPrefix(admin.Config{BasePath: options.basePath}),
		EnhancedAction:     options.enhancedActionRuntime,
		QueueUI:            options.translationQueueUI,
	}
}

func translationSSRQueueInitialPreset(c router.Context) string {
	if c != nil {
		if preset := strings.TrimSpace(c.Query("preset")); preset != "" {
			return preset
		}
	}
	return "open"
}

func translationSSRQueryValues(c router.Context) map[string]string {
	if c == nil {
		return nil
	}
	keys := []string{
		"assignee_id",
		"blocker_code",
		"content_type",
		"due_state",
		"entity_type",
		"family_id",
		"group_by",
		"group_strategy",
		"include_examples",
		"kind",
		"locale",
		"locales",
		"locale_limit",
		"locale_offset",
		"missing_locale",
		"order",
		"page",
		"per_page",
		"preset",
		"priority",
		"readiness_state",
		"review_state",
		"reviewer_id",
		"sort_by",
		"sort",
		"status",
		"target_locale",
		"type",
		admin.ScopeTenantIDKey,
		admin.ScopeOrgIDKey,
	}
	values := map[string]string{}
	for _, key := range keys {
		if value := strings.TrimSpace(c.Query(key)); value != "" {
			values[key] = value
		}
	}
	if len(values) == 0 {
		return nil
	}
	return values
}

func translationAssignmentActionAPIBasePath(c router.Context, apiBase string) string {
	endpoint := prefixBasePath(apiBase, path.Join("translations", "assignments"))
	if c == nil {
		return endpoint
	}
	for _, key := range []string{admin.ScopeTenantIDKey, admin.ScopeOrgIDKey} {
		if value := strings.TrimSpace(c.Query(key)); value != "" {
			endpoint = appendQueryParam(endpoint, key, value)
		}
	}
	return endpoint
}

func withTranslationSSRView(
	c router.Context,
	view router.ViewContext,
	options uiRouteOptions,
	input admin.TranslationSSRPresenterInput,
	hydrate translationSSRHydrator,
	key string,
) router.ViewContext {
	if view == nil {
		view = router.ViewContext{}
	}
	if options.translationSSRPresenter == nil || hydrate == nil || strings.TrimSpace(key) == "" {
		return view
	}
	page, err := safeHydrateTranslationSSR(c, input, hydrate)
	if err != nil {
		page = admin.TranslationSSRPage{
			Surface: inputSurfaceForSSRKey(key),
			ErrorState: map[string]any{
				"title":       "Translation data unavailable",
				"description": err.Error(),
			},
			Enhancement: map[string]any{
				"api_base_path": strings.TrimRight(input.APIBasePath, "/"),
				"base_path":     strings.TrimRight(input.BasePath, "/"),
				"channel":       strings.TrimSpace(input.Channel),
			},
		}
		view["translation_ssr_error"] = err.Error()
	}
	pageView := translationSSRPageView(page)
	view["translation_ssr"] = pageView
	view[key] = pageView
	view[key+"_page"] = page
	return view
}

func translationSSRPageView(page admin.TranslationSSRPage) router.ViewContext {
	return router.ViewContext{
		"Surface":      page.Surface,
		"Title":        page.Title,
		"Data":         page.Data,
		"Meta":         page.Meta,
		"DataGrid":     page.DataGrid,
		"Actions":      page.Actions,
		"Links":        page.Links,
		"Enhancement":  page.Enhancement,
		"Assignee":     page.Assignee,
		"EmptyState":   page.EmptyState,
		"ErrorState":   page.ErrorState,
		"ResourceName": page.ResourceName,
	}
}

func safeHydrateTranslationSSR(c router.Context, input admin.TranslationSSRPresenterInput, hydrate translationSSRHydrator) (page admin.TranslationSSRPage, err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			err = fmt.Errorf("translation SSR hydration failed: %v", recovered)
		}
	}()
	return hydrate(c, input)
}

func inputSurfaceForSSRKey(key string) string {
	switch key {
	case "translation_dashboard_ssr":
		return admin.TranslationSSRSurfaceDashboard
	case "translation_families_ssr":
		return admin.TranslationSSRSurfaceFamilyList
	case "translation_family_detail_ssr":
		return admin.TranslationSSRSurfaceFamilyDetail
	case "translation_family_assignments_ssr":
		return admin.TranslationSSRSurfaceFamilyAssignments
	case "translation_queue_ssr":
		return admin.TranslationSSRSurfaceQueue
	case "translation_editor_ssr":
		return admin.TranslationSSRSurfaceEditor
	case "translation_matrix_ssr":
		return admin.TranslationSSRSurfaceMatrix
	case "translation_exchange_ssr":
		return admin.TranslationSSRSurfaceExchange
	default:
		return strings.TrimPrefix(strings.TrimSpace(key), "translation_")
	}
}

func translationEditorAPIPathWithChannel(endpoint, channel string) string {
	channel = strings.TrimSpace(channel)
	if strings.TrimSpace(endpoint) == "" || channel == "" {
		return endpoint
	}
	parsed, err := url.Parse(endpoint)
	if err != nil {
		separator := "?"
		if strings.Contains(endpoint, "?") {
			separator = "&"
		}
		return endpoint + separator + "channel=" + url.QueryEscape(channel)
	}
	query := parsed.Query()
	if strings.TrimSpace(query.Get("channel")) == "" {
		query.Set("channel", channel)
		parsed.RawQuery = query.Encode()
	}
	return parsed.String()
}

func translationExchangeUIConfigForAdmin(adm *admin.Admin) TranslationExchangeUIConfig {
	caps := TranslationCapabilities(adm)
	raw, ok := caps["exchange_ui_config"]
	if !ok {
		return TranslationExchangeUIConfig{}
	}
	switch typed := raw.(type) {
	case TranslationExchangeUIConfig:
		return typed
	case *TranslationExchangeUIConfig:
		if typed == nil {
			return TranslationExchangeUIConfig{}
		}
		return *typed
	default:
		return TranslationExchangeUIConfig{}
	}
}

func defaultUIViewContextBuilder(adm *admin.Admin, cfg admin.Config) UIViewContextBuilder {
	return func(ctx router.ViewContext, active string, c router.Context) router.ViewContext {
		reqCtx := c.Context()
		ctx = WithNav(ctx, adm, cfg, active, reqCtx)
		ctx = WithThemeContext(ctx, adm, c)
		ctx = withAssignedRoles(ctx, adm, reqCtx)
		if _, ok := ctx["dashboard_ssr_path"]; !ok {
			if adm != nil && adm.Dashboard() != nil && adm.Dashboard().HasRenderer() {
				basePath := strings.TrimSpace(cfg.BasePath)
				if basePath == "" {
					basePath = "/"
				}
				ctx["dashboard_ssr_path"] = path.Join(basePath, "dashboard")
			}
		}
		if _, ok := ctx["api_base_path"]; !ok {
			var urls urlkit.Resolver
			if adm != nil {
				urls = adm.URLs()
			}
			ctx["api_base_path"] = resolveAdminAPIBasePath(urls, cfg, cfg.BasePath)
		}
		if _, ok := ctx["preferences_api_path"]; !ok {
			var urls urlkit.Resolver
			if adm != nil {
				urls = adm.URLs()
			}
			ctx["preferences_api_path"] = resolveAdminPreferencesAPICollectionPath(urls, cfg, cfg.BasePath)
		}
		labels := cfg.ActivityActionLabels
		if labels == nil {
			labels = map[string]string{}
		}
		ctx["activity_action_labels"] = labels
		ctx = withUIFeatureContext(ctx, adm, active, reqCtx)
		return admin.CaptureViewContextForRequest(adm.Debug(), c, ctx)
	}
}
