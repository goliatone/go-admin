package quickstart

import (
	"fmt"
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
	basePath                        string
	dashboardPath                   string
	notificationsPath               string
	activityPath                    string
	featureFlagsPath                string
	translationQueuePath            string
	translationFamilyDetailPath     string
	translationEditorPath           string
	translationMatrixPath           string
	translationDashboardPath        string
	translationExchangePath         string
	dashboardTemplate               string
	notificationsTemplate           string
	activityTemplate                string
	featureFlagsTemplate            string
	translationShellTemplate        string
	translationFamilyDetailTemplate string
	translationEditorTemplate       string
	translationMatrixTemplate       string
	translationDashboardTemplate    string
	translationExchangeTemplate     string
	dashboardTitle                  string
	notificationsTitle              string
	activityTitle                   string
	featureFlagsTitle               string
	translationQueueTitle           string
	translationFamilyDetailTitle    string
	translationEditorTitle          string
	translationMatrixTitle          string
	translationDashboardTitle       string
	translationExchangeTitle        string
	dashboardActive                 string
	notificationsActive             string
	activityActive                  string
	featureFlagsActive              string
	translationQueueActive          string
	translationFamilyDetailActive   string
	translationEditorActive         string
	translationMatrixActive         string
	translationDashboardActive      string
	translationExchangeActive       string
	registerDashboard               bool
	registerNotifications           bool
	registerActivity                bool
	registerFeatureFlags            bool
	registerTranslationQueue        bool
	registerTranslationFamilyDetail bool
	registerTranslationEditor       bool
	registerTranslationMatrix       bool
	registerTranslationDashboard    bool
	registerTranslationExchange     bool
	viewContext                     UIViewContextBuilder
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
		basePath:                        strings.TrimSpace(cfg.BasePath),
		dashboardTemplate:               "admin",
		notificationsTemplate:           "notifications",
		activityTemplate:                "resources/activity/list",
		featureFlagsTemplate:            "resources/feature-flags/index",
		translationShellTemplate:        "resources/translations/shell",
		translationFamilyDetailTemplate: "resources/translations/family-detail",
		translationEditorTemplate:       "resources/translations/editor",
		translationMatrixTemplate:       "resources/translations/matrix",
		translationDashboardTemplate:    "resources/translations/dashboard",
		translationExchangeTemplate:     "resources/translations/exchange",
		dashboardTitle:                  strings.TrimSpace(cfg.Title),
		notificationsTitle:              strings.TrimSpace(cfg.Title),
		activityTitle:                   "Activity",
		featureFlagsTitle:               "Feature Flags",
		translationQueueTitle:           "Translation Queue",
		translationFamilyDetailTitle:    "Translation Family",
		translationEditorTitle:          "Translation Editor",
		translationMatrixTitle:          "Translation Matrix",
		translationDashboardTitle:       "Translation Dashboard",
		translationExchangeTitle:        "Translation Exchange",
		dashboardActive:                 "dashboard",
		notificationsActive:             "notifications",
		activityActive:                  "activity",
		featureFlagsActive:              "feature_flags",
		translationQueueActive:          "translation_queue",
		translationFamilyDetailActive:   "translation_families",
		translationEditorActive:         "translation_editor",
		translationMatrixActive:         "translation_matrix",
		translationDashboardActive:      "translation_dashboard",
		translationExchangeActive:       "translation_exchange",
		registerDashboard:               true,
		registerNotifications:           true,
		registerActivity:                true,
		registerFeatureFlags:            true,
		registerTranslationQueue:        queueModuleEnabled,
		registerTranslationFamilyDetail: coreModuleEnabled,
		registerTranslationEditor:       queueModuleEnabled,
		registerTranslationMatrix:       coreModuleEnabled,
		registerTranslationDashboard:    queueModuleEnabled,
		registerTranslationExchange:     exchangeModuleEnabled,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	applyAdminUITranslationCapabilityGates(&options, queueModuleEnabled, coreModuleEnabled, exchangeModuleEnabled)
	options.basePath = normalizeQuickstartRouteBasePath(options.basePath)
	applyAdminUIRoutePathDefaults(&options)
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
	productized, _ := caps["productized"].(bool)
	return productized && !strings.EqualFold(strings.TrimSpace(fmt.Sprint(caps["profile"])), "none")
}

func applyAdminUITranslationCapabilityGates(options *uiRouteOptions, queueModuleEnabled, coreModuleEnabled, exchangeModuleEnabled bool) {
	if !queueModuleEnabled {
		options.registerTranslationQueue = false
		options.registerTranslationEditor = false
		options.registerTranslationDashboard = false
	}
	if !coreModuleEnabled {
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
	if options.translationFamilyDetailPath == "" {
		options.translationFamilyDetailPath = path.Join(options.basePath, "translations", "families", ":family_id")
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
	if options.registerTranslationDashboard {
		r.Get(options.translationDashboardPath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			return renderView(c, options.translationDashboardTemplate, options.translationDashboardTitle, options.translationDashboardActive, router.ViewContext{
				"translation_dashboard_api_path": prefixBasePath(apiBase, path.Join("translations", "dashboard")),
				"translation_queue_api_path":     prefixBasePath(apiBase, path.Join("translations", "queue")),
				"translation_families_api_path":  prefixBasePath(apiBase, path.Join("translations", "families")),
			})
		}))
	}

	if options.registerTranslationQueue {
		r.Get(options.translationQueuePath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			return renderView(c, options.translationShellTemplate, options.translationQueueTitle, options.translationQueueActive, router.ViewContext{
				"translation_shell_surface":          "queue",
				"translation_shell_title":            options.translationQueueTitle,
				"translation_shell_description":      "Assignment-centric queue with saved filters, keyboard row navigation, and inline claim/release actions.",
				"translation_shell_api_path":         prefixBasePath(apiBase, path.Join("translations", "assignments")),
				"translation_queue_editor_base_path": path.Join(options.basePath, "translations", "assignments"),
				"translation_queue_initial_preset":   "open",
			})
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
				CurrentLabel: fmt.Sprintf("Family %s", familyID),
			})
			return renderView(c, options.translationFamilyDetailTemplate, options.translationFamilyDetailTitle, options.translationFamilyDetailActive, view)
		}))
	}

	if options.registerTranslationEditor {
		r.Get(options.translationEditorPath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			assignmentID := strings.TrimSpace(c.Param("assignment_id"))
			view := WithBreadcrumbSpec(router.ViewContext{
				"translation_assignment_id":           assignmentID,
				"translation_editor_api_path":         prefixBasePath(apiBase, path.Join("translations", "assignments", assignmentID)),
				"translation_editor_variant_api_base": prefixBasePath(apiBase, path.Join("translations", "variants")),
				"translation_editor_action_api_base":  prefixBasePath(apiBase, path.Join("translations", "assignments")),
			}, BreadcrumbSpec{
				RootLabel:    "Dashboard",
				RootHref:     options.basePath,
				Trail:        []BreadcrumbItem{Breadcrumb(options.translationQueueTitle, options.translationQueuePath)},
				CurrentLabel: fmt.Sprintf("Assignment %s", assignmentID),
			})
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
			return renderView(c, options.translationMatrixTemplate, options.translationMatrixTitle, options.translationMatrixActive, view)
		}))
	}

	if options.registerTranslationExchange {
		r.Get(options.translationExchangePath, wrap(func(c router.Context) error {
			apiBase := resolveAPIBase()
			return renderView(c, options.translationExchangeTemplate, options.translationExchangeTitle, options.translationExchangeActive, router.ViewContext{
				"translation_exchange_api_path": prefixBasePath(apiBase, path.Join("translations", "exchange")),
			})
		}))
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
