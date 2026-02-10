package boot

import (
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

const (
	FeatureDashboard           = "dashboard"
	FeatureSearch              = "search"
	FeatureExport              = "export"
	FeatureBulk                = "bulk"
	FeatureMedia               = "media"
	FeatureNotifications       = "notifications"
	FeatureJobs                = "jobs"
	FeatureSettings            = "settings"
	FeatureCMS                 = "cms"
	FeatureTranslationExchange = "translations.exchange"
	FeatureTranslationQueue    = "translations.queue"
)

// HandlerWrapper wraps router handlers with auth or middleware.
type HandlerWrapper func(router.HandlerFunc) router.HandlerFunc

// Router is the minimal router surface needed for boot steps.
type Router interface {
	Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
	Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo
}

// RouteSpec describes a route to register.
type RouteSpec struct {
	Method  string
	Path    string
	Handler router.HandlerFunc
}

// FeatureGates exposes feature checks.
type FeatureGates interface {
	Enabled(key string) bool
	Require(key string) error
}

// Responder centralizes response helpers.
type Responder interface {
	WriteJSON(router.Context, any) error
	WriteHTML(router.Context, string) error
	WriteError(router.Context, error) error
}

// ListOptions holds pagination and filtering input for bindings.
type ListOptions struct {
	Page       int
	PerPage    int
	SortBy     string
	SortDesc   bool
	Filters    map[string]any
	Predicates []ListPredicate
	Search     string
}

// ListPredicate defines an operator-aware list filter predicate for boot bindings.
type ListPredicate struct {
	Field    string
	Operator string
	Values   []string
}

// PanelBinding exposes panel CRUD/action handlers for routes.
type PanelBinding interface {
	Name() string
	List(router.Context, string, ListOptions) ([]map[string]any, int, any, any, error)
	Detail(router.Context, string, string) (map[string]any, error)
	Create(router.Context, string, map[string]any) (map[string]any, error)
	Update(router.Context, string, string, map[string]any) (map[string]any, error)
	Delete(router.Context, string, string) error
	Action(router.Context, string, string, map[string]any) (map[string]any, error)
	Bulk(router.Context, string, string, map[string]any) error
	Preview(router.Context, string, string) (map[string]any, error)
}

// DashboardBinding exposes dashboard handlers.
type DashboardBinding interface {
	Enabled() bool
	HasRenderer() bool
	RenderHTML(router.Context, string) (string, error)
	Widgets(router.Context, string) (map[string]any, error)
	Preferences(router.Context, string) (map[string]any, error)
	SavePreferences(router.Context, map[string]any) (map[string]any, error)
	Diagnostics(router.Context, string) (map[string]any, error)
}

// NavigationBinding exposes navigation resolution.
type NavigationBinding interface {
	Resolve(router.Context, string, string) (items any, theme map[string]map[string]string)
}

// SearchBinding exposes search queries.
type SearchBinding interface {
	Query(router.Context, string, string, int) ([]any, error)
}

// ExportRouteOptions configures export route registration.
type ExportRouteOptions struct {
	BasePath string
	Wrap     HandlerWrapper
}

// ExportRegistrar registers export HTTP endpoints on the router.
type ExportRegistrar interface {
	Register(Router, ExportRouteOptions) error
}

// BulkBinding exposes bulk operations.
type BulkBinding interface {
	List(router.Context) (map[string]any, error)
	Start(router.Context, map[string]any) (map[string]any, error)
	Rollback(router.Context, string, map[string]any) (map[string]any, error)
}

// MediaBinding exposes media operations.
type MediaBinding interface {
	List(router.Context) (map[string]any, error)
	Add(router.Context, map[string]any) (any, error)
}

// UserImportBinding exposes user import operations.
type UserImportBinding interface {
	ImportUsers(router.Context) error
	ImportTemplate(router.Context) error
}

// TranslationExchangeBinding exposes translation exchange transport operations.
type TranslationExchangeBinding interface {
	Export(router.Context) (any, error)
	Template(router.Context) error
	ImportValidate(router.Context) (any, error)
	ImportApply(router.Context) (any, error)
}

// NotificationsBinding exposes notifications operations.
type NotificationsBinding interface {
	List(router.Context) (map[string]any, error)
	Mark(router.Context, map[string]any) error
}

// ActivityBinding exposes activity operations.
type ActivityBinding interface {
	List(router.Context) (map[string]any, error)
}

// JobsBinding exposes job operations.
type JobsBinding interface {
	List(router.Context) (map[string]any, error)
	Trigger(router.Context, map[string]any) error
}

// SettingsBinding exposes settings operations.
type SettingsBinding interface {
	Values(router.Context) (map[string]any, error)
	Form(router.Context) (any, error)
	Save(router.Context, map[string]any) (map[string]any, error)
}

// SchemaRegistryBinding exposes schema registry payloads for UI consumers.
type SchemaRegistryBinding interface {
	List(router.Context) (any, error)
	Get(router.Context, string) (any, error)
}

// FeatureOverridesBinding exposes feature override mutations.
type FeatureOverridesBinding interface {
	List(router.Context) (map[string]any, error)
	Set(router.Context, map[string]any) (map[string]any, error)
	Unset(router.Context, map[string]any) (map[string]any, error)
}

// BootCtx exposes the surface needed by boot steps.
type BootCtx interface {
	Router() Router
	AuthWrapper() HandlerWrapper
	BasePath() string
	AdminAPIGroup() string
	URLs() urlkit.Resolver
	DefaultLocale() string
	NavMenuCode() string
	Gates() FeatureGates
	Responder() Responder
	ParseBody(router.Context) (map[string]any, error)

	Panels() []PanelBinding
	BootDashboard() DashboardBinding
	BootNavigation() NavigationBinding
	BootSearch() SearchBinding
	ExportRegistrar() ExportRegistrar
	BootBulk() BulkBinding
	BootMedia() MediaBinding
	BootUserImport() UserImportBinding
	BootTranslationExchange() TranslationExchangeBinding
	BootNotifications() NotificationsBinding
	BootActivity() ActivityBinding
	BootJobs() JobsBinding
	BootSettings() SettingsBinding
	BootSchemaRegistry() SchemaRegistryBinding
	BootFeatureOverrides() FeatureOverridesBinding

	SettingsWidget() error
	ActivityWidget() error
	NotificationsWidget() error
	RegisterWidgetAreas() error
	RegisterWidgetDefinitions() error
	RegisterDashboardProviders() error
}

// Step is a boot step executed during admin initialization.
type Step func(BootCtx) error
