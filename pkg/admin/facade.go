package admin

import (
	"context"

	core "github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	cms "github.com/goliatone/go-cms"
	repository "github.com/goliatone/go-repository-bun"
	router "github.com/goliatone/go-router"
	users "github.com/goliatone/go-users/pkg/types"
)

func IntPtr(v int) *int { return &v }

type (
	Action               = core.Action
	ActivityEntry        = core.ActivityEntry
	ActivityFilter       = core.ActivityFilter
	ActivityLogger       = core.ActivityLogger
	ActivityRecord       = core.ActivityRecord
	ActivityRecordLister = core.ActivityRecordLister
	ActivitySink         = core.ActivitySink
	ActivitySinkAdapter  = core.ActivitySinkAdapter

	Admin        = core.Admin
	AdminContext = core.AdminContext
	AuthConfig   = core.AuthConfig
	Authorizer   = core.Authorizer

	BunRecordMapper[T any]      = core.BunRecordMapper[T]
	BunRepositoryAdapter[T any] = core.BunRepositoryAdapter[T]
	BunRepositoryOption[T any]  = core.BunRepositoryOption[T]

	CLIOptions = core.CLIOptions

	CMSBlock             = core.CMSBlock
	CMSBlockDefinition   = core.CMSBlockDefinition
	CMSContent           = core.CMSContent
	CMSContentRepository = core.CMSContentRepository
	CMSContentService    = core.CMSContentService
	CMSMenuService       = core.CMSMenuService
	CMSOptions           = core.CMSOptions
	CMSPage              = core.CMSPage
	CMSPageRepository    = core.CMSPageRepository
	CMSWidgetService     = core.CMSWidgetService

	Config       = core.Config
	Dependencies = core.Dependencies

	Dashboard             = core.Dashboard
	DashboardLayout       = core.DashboardLayout
	DashboardProviderSpec = core.DashboardProviderSpec
	DashboardRenderer     = core.DashboardRenderer

	FeatureGates = core.FeatureGates
	FeatureKey   = core.FeatureKey
	Features     = core.Features

	Field  = core.Field
	Filter = core.Filter

	GoAuthAuthenticator       = core.GoAuthAuthenticator
	GoAuthAuthenticatorOption = core.GoAuthAuthenticatorOption
	GoAuthAuthorizer          = core.GoAuthAuthorizer
	GoAuthAuthorizerConfig    = core.GoAuthAuthorizerConfig

	GoCMSContainerAdapter = core.GoCMSContainerAdapter
	GoCMSMenuAdapter      = core.GoCMSMenuAdapter

	GoUsersProfileStore   = core.GoUsersProfileStore
	GoUsersRoleRepository = core.GoUsersRoleRepository
	GoUsersUserRepository = core.GoUsersUserRepository

	InMemoryContentService = core.InMemoryContentService
	InMemoryMenuService    = core.InMemoryMenuService

	ListOptions = core.ListOptions

	MediaItem = core.MediaItem

	MemoryRepository = core.MemoryRepository

	MenuItem = core.MenuItem

	Module         = core.Module
	ModuleContext  = core.ModuleContext
	ModuleManifest = core.ModuleManifest

	Navigation     = core.Navigation
	NavigationItem = core.NavigationItem

	Notification        = core.Notification
	NotificationService = core.NotificationService

	Option = core.Option

	OrganizationMember = core.OrganizationMember
	OrganizationRecord = core.OrganizationRecord

	PanelBuilder     = core.PanelBuilder
	PanelPermissions = core.PanelPermissions

	PreferencesModule = core.PreferencesModule
	ProfileModule     = core.ProfileModule

	ResolvedWidget = core.ResolvedWidget

	RolePanelRepository = core.RolePanelRepository

	SearchResult = core.SearchResult

	SettingDefinition = core.SettingDefinition
	SettingOption     = core.SettingOption

	SettingsBundle = core.SettingsBundle
	SettingsScope  = core.SettingsScope

	TenantMember  = core.TenantMember
	TenantRecord  = core.TenantRecord
	TenantService = core.TenantService

	ThemeSelector = core.ThemeSelector
	Translator    = core.Translator

	UserProfile = core.UserProfile

	UserManagementService = core.UserManagementService

	WidgetArea     = core.WidgetArea
	WidgetLayout   = core.WidgetLayout
	WidgetMetadata = core.WidgetMetadata
)

var (
	ErrNotFound = core.ErrNotFound
)

const (
	FeatureDashboard     = core.FeatureDashboard
	FeatureSearch        = core.FeatureSearch
	FeatureCommands      = core.FeatureCommands
	FeatureNotifications = core.FeatureNotifications
	FeatureMedia         = core.FeatureMedia

	MenuItemTypeItem      = core.MenuItemTypeItem
	MenuItemTypeGroup     = core.MenuItemTypeGroup
	MenuItemTypeSeparator = core.MenuItemTypeSeparator

	SettingsScopeSystem = core.SettingsScopeSystem
	SettingsScopeSite   = core.SettingsScopeSite
)

func New(cfg Config, deps Dependencies) (*Admin, error) {
	return core.New(cfg, deps)
}

func CommandPayload(ctx context.Context) map[string]any {
	return core.CommandPayload(ctx)
}

func CommandIDs(ctx context.Context) []string {
	return core.CommandIDs(ctx)
}

func NewActivitySinkAdapter(logger ActivityLogger, lister ActivityRecordLister) *ActivitySinkAdapter {
	return core.NewActivitySinkAdapter(logger, lister)
}

func NewBunRepositoryAdapter[T any](repo repository.Repository[T], opts ...BunRepositoryOption[T]) *BunRepositoryAdapter[T] {
	return core.NewBunRepositoryAdapter[T](repo, opts...)
}

func WithBunSearchColumns[T any](columns ...string) BunRepositoryOption[T] {
	return core.WithBunSearchColumns[T](columns...)
}

func WithBunRecordMapper[T any](mapper BunRecordMapper[T]) BunRepositoryOption[T] {
	return core.WithBunRecordMapper[T](mapper)
}

func NewCMSContentRepository(content CMSContentService) *CMSContentRepository {
	return core.NewCMSContentRepository(content)
}

func NewCMSPageRepository(content CMSContentService) *CMSPageRepository {
	return core.NewCMSPageRepository(content)
}

func NewGoCMSContainerAdapter(container any) *GoCMSContainerAdapter {
	return core.NewGoCMSContainerAdapter(container)
}

func NewGoCMSMenuAdapter(service cms.MenuService) *GoCMSMenuAdapter {
	return core.NewGoCMSMenuAdapter(service)
}

func NewGoAuthAuthenticator(routeAuth *auth.RouteAuthenticator, cfg auth.Config, opts ...GoAuthAuthenticatorOption) *GoAuthAuthenticator {
	return core.NewGoAuthAuthenticator(routeAuth, cfg, opts...)
}

func WithAuthErrorHandler(handler func(router.Context, error) error) GoAuthAuthenticatorOption {
	return core.WithAuthErrorHandler(handler)
}

func NewGoAuthAuthorizer(cfg GoAuthAuthorizerConfig) *GoAuthAuthorizer {
	return core.NewGoAuthAuthorizer(cfg)
}

func NewGoUsersUserRepository(authRepo users.AuthRepository, inventory users.UserInventoryRepository, scopeResolver func(context.Context) users.ScopeFilter) *GoUsersUserRepository {
	return core.NewGoUsersUserRepository(authRepo, inventory, scopeResolver)
}

func NewGoUsersRoleRepository(registry users.RoleRegistry, scopeResolver func(context.Context) users.ScopeFilter) *GoUsersRoleRepository {
	return core.NewGoUsersRoleRepository(registry, scopeResolver)
}

func NewGoUsersProfileStore(repo users.ProfileRepository, scopeResolver func(context.Context) users.ScopeFilter) *GoUsersProfileStore {
	return core.NewGoUsersProfileStore(repo, scopeResolver)
}

func NewInMemoryMenuService() *InMemoryMenuService {
	return core.NewInMemoryMenuService()
}

func NewInMemoryContentService() *InMemoryContentService {
	return core.NewInMemoryContentService()
}

func NewMemoryRepository() *MemoryRepository {
	return core.NewMemoryRepository()
}

func NewNavigation(menuSvc CMSMenuService, authorizer Authorizer) *Navigation {
	return core.NewNavigation(menuSvc, authorizer)
}

func NewPreferencesModule() *PreferencesModule {
	return core.NewPreferencesModule()
}

func NewProfileModule() *ProfileModule {
	return core.NewProfileModule()
}

func NewRolePanelRepository(service *UserManagementService) *RolePanelRepository {
	return core.NewRolePanelRepository(service)
}

func WithThemeSelection(ctx context.Context, selector ThemeSelector) context.Context {
	return core.WithThemeSelection(ctx, selector)
}
