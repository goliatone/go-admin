package admin

import (
	"context"
	"log/slog"

	core "github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	cms "github.com/goliatone/go-cms"
	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	"github.com/goliatone/go-command/runner"
	crud "github.com/goliatone/go-crud"
	goerrors "github.com/goliatone/go-errors"
	repository "github.com/goliatone/go-repository-bun"
	router "github.com/goliatone/go-router"
	users "github.com/goliatone/go-users/pkg/types"
)

func IntPtr(v int) *int    { return &v }
func BoolPtr(v bool) *bool { return core.BoolPtr(v) }
func WithStack(err error) error {
	return core.WithStack(err)
}
func AttachErrorContext(err error, mapped *goerrors.Error) *goerrors.Error {
	return core.AttachErrorContext(err, mapped)
}
func NewErrorPresenter(cfg ErrorConfig, mappers ...goerrors.ErrorMapper) ErrorPresenter {
	return core.NewErrorPresenter(cfg, mappers...)
}
func DefaultErrorPresenter() ErrorPresenter {
	return core.DefaultErrorPresenter()
}
func SetDefaultErrorPresenter(presenter ErrorPresenter) {
	core.SetDefaultErrorPresenter(presenter)
}
func DomainErrorCodes() []DomainErrorCode {
	return core.DomainErrorCodes()
}
func RegisterDomainErrorCodes(codes ...DomainErrorCode) {
	core.RegisterDomainErrorCodes(codes...)
}
func DomainErrorCodeFor(code string) (DomainErrorCode, bool) {
	return core.DomainErrorCodeFor(code)
}
func NewDomainError(code, message string, meta map[string]any) *goerrors.Error {
	return core.NewDomainError(code, message, meta)
}
func EnvironmentFromContext(ctx context.Context) string {
	return core.EnvironmentFromContext(ctx)
}
func LocaleFromContext(ctx context.Context) string {
	return core.LocaleFromContext(ctx)
}
func WithEnvironment(ctx context.Context, environment string) context.Context {
	return core.WithEnvironment(ctx, environment)
}
func WithLocale(ctx context.Context, locale string) context.Context {
	return core.WithLocale(ctx, locale)
}
func NewCRUDContext(ctx context.Context) crud.Context {
	return core.NewCRUDContext(ctx)
}
func WithTranslations() CMSContentListOption {
	return core.WithTranslations()
}
func WithDerivedFields() CMSContentListOption {
	return core.WithDerivedFields()
}

const (
	TextCodeValidationError           = core.TextCodeValidationError
	TextCodeInvalidFeatureConfig      = core.TextCodeInvalidFeatureConfig
	TextCodeForbidden                 = core.TextCodeForbidden
	TextCodeNotFound                  = core.TextCodeNotFound
	TextCodeFeatureDisabled           = core.TextCodeFeatureDisabled
	TextCodeReplSessionLimit          = core.TextCodeReplSessionLimit
	TextCodeWorkflowNotFound          = core.TextCodeWorkflowNotFound
	TextCodeWorkflowInvalidTransition = core.TextCodeWorkflowInvalidTransition
	TextCodeFeatureEnabledRequired    = core.TextCodeFeatureEnabledRequired
	TextCodeFeatureAliasDisabled      = core.TextCodeFeatureAliasDisabled
	TextCodeMissingPanel              = core.TextCodeMissingPanel
	TextCodeRawUINotSupported         = core.TextCodeRawUINotSupported
	TextCodeClearKeysNotSupported     = core.TextCodeClearKeysNotSupported
	TextCodeReplDebugDisabled         = core.TextCodeReplDebugDisabled
	TextCodeReplShellDisabled         = core.TextCodeReplShellDisabled
	TextCodeReplAppDisabled           = core.TextCodeReplAppDisabled
	TextCodeReplDisabled              = core.TextCodeReplDisabled
	TextCodeReplOverrideDenied        = core.TextCodeReplOverrideDenied
	TextCodeReplRoleDenied            = core.TextCodeReplRoleDenied
	TextCodeReplPermissionDenied      = core.TextCodeReplPermissionDenied
	TextCodeReplExecPermissionDenied  = core.TextCodeReplExecPermissionDenied
	TextCodeReplReadOnly              = core.TextCodeReplReadOnly
	TextCodeReplIPDenied              = core.TextCodeReplIPDenied

	CreateTranslationKey = core.CreateTranslationKey
)

type (
	CMSContentListOption = core.CMSContentListOption
	Action               = core.Action
	ActivityEntry        = core.ActivityEntry
	ActivityFilter       = core.ActivityFilter
	ActivityLogger       = core.ActivityLogger
	ActivityRecord       = core.ActivityRecord
	ActivityRecordLister = core.ActivityRecordLister
	ActivitySink         = core.ActivitySink
	ActivitySinkAdapter  = core.ActivitySinkAdapter

	AdminPageGetOptions      = core.AdminPageGetOptions
	AdminPageListOptions     = core.AdminPageListOptions
	AdminPageReadService     = core.AdminPageReadService
	AdminPageRecord          = core.AdminPageRecord
	AdminPageWriteService    = core.AdminPageWriteService
	DefaultPageMapper        = core.DefaultPageMapper
	TranslationMeta          = core.TranslationMeta
	TranslationBundle[T any] = core.TranslationBundle[T]
	PageTranslation          = core.PageTranslation
	ContentTranslation       = core.ContentTranslation
	TranslationCreateInput   = core.TranslationCreateInput

	Admin        = core.Admin
	AdminContext = core.AdminContext
	AuthConfig   = core.AuthConfig
	Authorizer   = core.Authorizer

	BunRecordMapper[T any]      = core.BunRecordMapper[T]
	BunRepositoryAdapter[T any] = core.BunRepositoryAdapter[T]
	BunRepositoryOption[T any]  = core.BunRepositoryOption[T]

	CLIConfig = core.CLIConfig
	CLIGroup  = core.CLIGroup

	CommandBus = core.CommandBus

	CMSBlock                     = core.CMSBlock
	CMSBlockDefinition           = core.CMSBlockDefinition
	CMSBlockDefinitionVersion    = core.CMSBlockDefinitionVersion
	CMSContent                   = core.CMSContent
	CMSContentRepository         = core.CMSContentRepository
	CMSContentService            = core.CMSContentService
	CMSContentTranslationCreator = core.CMSContentTranslationCreator
	CMSContentTypeService        = core.CMSContentTypeService
	CMSMenuService               = core.CMSMenuService
	CMSOptions                   = core.CMSOptions
	CMSPage                      = core.CMSPage
	CMSPageRepository            = core.CMSPageRepository
	CMSWidgetService             = core.CMSWidgetService
	WidgetDefinition             = core.WidgetDefinition
	PageApplicationService       = core.PageApplicationService
	PageGetOptions               = core.PageGetOptions
	PageIncludeDefaults          = core.PageIncludeDefaults
	PageListOptions              = core.PageListOptions
	PageMapper                   = core.PageMapper
	PageReadDefaults             = core.PageReadDefaults
	PageReadOptions              = core.PageReadOptions

	Config         = core.Config
	ErrorConfig    = core.ErrorConfig
	Dependencies   = core.Dependencies
	Logger         = core.Logger
	LoggerProvider = core.LoggerProvider
	FieldsLogger   = core.FieldsLogger

	ExportColumn           = core.ExportColumn
	ExportDefinition       = core.ExportDefinition
	ExportHTTPRegistrar    = core.ExportHTTPRegistrar
	ExportMetadata         = core.ExportMetadata
	ExportMetadataProvider = core.ExportMetadataProvider
	ExportRegistry         = core.ExportRegistry
	ExportRouteOptions     = core.ExportRouteOptions
	ExportRouteWrapper     = core.ExportRouteWrapper

	ErrorPresenter  = core.ErrorPresenter
	DomainErrorCode = core.DomainErrorCode

	Dashboard             = core.Dashboard
	DashboardLayout       = core.DashboardLayout
	DashboardProviderSpec = core.DashboardProviderSpec
	DashboardRenderer     = core.DashboardRenderer

	DebugCollector                = core.DebugCollector
	DebugConfig                   = core.DebugConfig
	DebugLayoutMode               = core.DebugLayoutMode
	DebugLogHandler               = core.DebugLogHandler
	DebugModule                   = core.DebugModule
	DebugQueryHook                = core.DebugQueryHook
	DebugREPLConfig               = core.DebugREPLConfig
	DebugREPLRequest              = core.DebugREPLRequest
	DebugREPLOverrideStrategy     = core.DebugREPLOverrideStrategy
	DebugViewContextBuilder       = core.DebugViewContextBuilder
	DebugREPLSession              = core.DebugREPLSession
	DebugREPLSessionManager       = core.DebugREPLSessionManager
	DebugREPLSessionStore         = core.DebugREPLSessionStore
	DebugUserSession              = core.DebugUserSession
	DebugUserSessionStore         = core.DebugUserSessionStore
	DenyAllStrategy               = core.DenyAllStrategy
	InMemoryDebugREPLSessionStore = core.InMemoryDebugREPLSessionStore
	InMemoryDebugUserSessionStore = core.InMemoryDebugUserSessionStore
	SignedTokenStrategy           = core.SignedTokenStrategy
	StaticKeyStrategy             = core.StaticKeyStrategy

	FeatureKey = core.FeatureKey

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

	UserRecord = core.UserRecord
	RoleRecord = core.RoleRecord

	ListOptions = core.ListOptions

	MediaItem = core.MediaItem

	MemoryRepository = core.MemoryRepository

	MenuItem = core.MenuItem

	NoopCLIHandler = core.NoopCLIHandler

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

	PanelBuilder                 = core.PanelBuilder
	RepositoryTranslationCreator = core.RepositoryTranslationCreator
	PanelPermissions             = core.PanelPermissions
	PanelTab                     = core.PanelTab
	PanelTabCollisionHandler     = core.PanelTabCollisionHandler
	PanelTabPermissionEvaluator  = core.PanelTabPermissionEvaluator
	PanelTabScope                = core.PanelTabScope
	PanelTabTarget               = core.PanelTabTarget
	PanelEntryMode               = core.PanelEntryMode
	PanelUIRouteMode             = core.PanelUIRouteMode

	PreviewService = core.PreviewService
	PreviewToken   = core.PreviewToken

	PreferenceLevel         = core.PreferenceLevel
	PreferenceScope         = core.PreferenceScope
	PreferenceSnapshot      = core.PreferenceSnapshot
	PreferenceTrace         = core.PreferenceTrace
	PreferenceTraceLayer    = core.PreferenceTraceLayer
	PreferencesDeleteInput  = core.PreferencesDeleteInput
	PreferencesResolveInput = core.PreferencesResolveInput
	PreferencesStore        = core.PreferencesStore
	PreferencesUpsertInput  = core.PreferencesUpsertInput

	PreferencesModule = core.PreferencesModule
	ProfileModule     = core.ProfileModule

	ResolvedWidget = core.ResolvedWidget

	RolePanelRepository      = core.RolePanelRepository
	RoleAssignmentLookup     = core.RoleAssignmentLookup
	RoleRepositoryLookup     = core.RoleRepositoryLookup
	UUIDRoleAssignmentLookup = core.UUIDRoleAssignmentLookup

	SearchResult = core.SearchResult

	SettingDefinition = core.SettingDefinition
	SettingOption     = core.SettingOption

	SettingsBundle  = core.SettingsBundle
	SettingsScope   = core.SettingsScope
	ResolvedSetting = core.ResolvedSetting

	FeatureDisabledError = core.FeatureDisabledError

	TenantMember  = core.TenantMember
	TenantRecord  = core.TenantRecord
	TenantService = core.TenantService

	ThemeSelector = core.ThemeSelector
	Translator    = core.Translator

	TranslationImportRunInput          = core.TranslationImportRunInput
	TranslationImportRunResult         = core.TranslationImportRunResult
	TranslationImportRunTriggerInput   = core.TranslationImportRunTriggerInput
	TranslationImportRunTriggerCommand = core.TranslationImportRunTriggerCommand

	TransitionInput    = core.TransitionInput
	TransitionResult   = core.TransitionResult
	WorkflowDefinition = core.WorkflowDefinition
	WorkflowEngine     = core.WorkflowEngine
	WorkflowAuthorizer = core.WorkflowAuthorizer
	WorkflowTransition = core.WorkflowTransition

	UserActivateMsg = core.UserActivateMsg
	UserSuspendMsg  = core.UserSuspendMsg
	UserDisableMsg  = core.UserDisableMsg
	UserArchiveMsg  = core.UserArchiveMsg

	UserProfile = core.UserProfile

	UserManagementService      = core.UserManagementService
	UserManagementModule       = core.UserManagementModule
	UserManagementModuleOption = core.UserManagementModuleOption

	WidgetArea           = core.WidgetArea
	WidgetAreaDefinition = core.WidgetAreaDefinition
	WidgetLayout         = core.WidgetLayout
	WidgetMetadata       = core.WidgetMetadata
)

var (
	ErrNotFound                     = core.ErrNotFound
	ErrTranslationCreateUnsupported = core.ErrTranslationCreateUnsupported
)

const (
	FeatureDashboard     = core.FeatureDashboard
	FeatureSearch        = core.FeatureSearch
	FeatureCommands      = core.FeatureCommands
	FeatureNotifications = core.FeatureNotifications
	FeatureMedia         = core.FeatureMedia

	PreferenceLevelSystem = core.PreferenceLevelSystem
	PreferenceLevelTenant = core.PreferenceLevelTenant
	PreferenceLevelOrg    = core.PreferenceLevelOrg
	PreferenceLevelUser   = core.PreferenceLevelUser

	MenuItemTypeItem      = core.MenuItemTypeItem
	MenuItemTypeGroup     = core.MenuItemTypeGroup
	MenuItemTypeSeparator = core.MenuItemTypeSeparator

	PanelTabScopeList               = core.PanelTabScopeList
	PanelTabScopeDetail             = core.PanelTabScopeDetail
	PanelTabScopeForm               = core.PanelTabScopeForm
	PanelEntryModeList              = core.PanelEntryModeList
	PanelEntryModeDetailCurrentUser = core.PanelEntryModeDetailCurrentUser
	PanelUIRouteModeCanonical       = core.PanelUIRouteModeCanonical
	PanelUIRouteModeCustom          = core.PanelUIRouteModeCustom

	SettingsScopeSystem = core.SettingsScopeSystem
	SettingsScopeSite   = core.SettingsScopeSite

	DebugLayoutStandalone = core.DebugLayoutStandalone
	DebugLayoutAdmin      = core.DebugLayoutAdmin

	DebugPanelTemplate = core.DebugPanelTemplate
	DebugPanelSession  = core.DebugPanelSession
	DebugPanelRequests = core.DebugPanelRequests
	DebugPanelSQL      = core.DebugPanelSQL
	DebugPanelLogs     = core.DebugPanelLogs
	DebugPanelConfig   = core.DebugPanelConfig
	DebugPanelRoutes   = core.DebugPanelRoutes
	DebugPanelCustom   = core.DebugPanelCustom
	DebugPanelConsole  = core.DebugPanelConsole
	DebugPanelShell    = core.DebugPanelShell
	DebugPanelJSErrors = core.DebugPanelJSErrors
)

func New(cfg Config, deps Dependencies) (*Admin, error) {
	return core.New(cfg, deps)
}

func RegisterCommand[T any](bus *CommandBus, cmd command.Commander[T], runnerOpts ...runner.Option) (dispatcher.Subscription, error) {
	return core.RegisterCommand(bus, cmd, runnerOpts...)
}

func CaptureViewContext(collector *DebugCollector, viewCtx router.ViewContext) router.ViewContext {
	return core.CaptureViewContext(collector, viewCtx)
}

func CaptureViewContextForRequest(collector *DebugCollector, c router.Context, viewCtx router.ViewContext) router.ViewContext {
	return core.CaptureViewContextForRequest(collector, c, viewCtx)
}

func DebugRequestMiddleware(collector *DebugCollector) router.MiddlewareFunc {
	return core.DebugRequestMiddleware(collector)
}

func NewDebugLogHandler(collector *DebugCollector, next slog.Handler) *DebugLogHandler {
	return core.NewDebugLogHandler(collector, next)
}

func NewDebugModule(config DebugConfig) *DebugModule {
	return core.NewDebugModule(config)
}

func NewDebugQueryHook(collector *DebugCollector) *DebugQueryHook {
	return core.NewDebugQueryHook(collector)
}

func NewDebugQueryHookProvider(provider func() *DebugCollector) *DebugQueryHook {
	return core.NewDebugQueryHookProvider(provider)
}

func RegisterMessageFactory[T any](bus *CommandBus, name string, build func(payload map[string]any, ids []string) (T, error)) error {
	return core.RegisterMessageFactory(bus, name, build)
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

func WithBunPatchAllowedFields[T any](fields ...string) BunRepositoryOption[T] {
	return core.WithBunPatchAllowedFields[T](fields...)
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

func WithUserMenuParent(parent string) UserManagementModuleOption {
	return core.WithUserMenuParent(parent)
}

func WithUserProfilesPanel() UserManagementModuleOption {
	return core.WithUserProfilesPanel()
}

func WithUserPanelTabs(tabs ...PanelTab) UserManagementModuleOption {
	return core.WithUserPanelTabs(tabs...)
}

func WithUsersPanelConfigurer(fn func(*PanelBuilder) *PanelBuilder) UserManagementModuleOption {
	return core.WithUsersPanelConfigurer(fn)
}

func WithRolesPanelConfigurer(fn func(*PanelBuilder) *PanelBuilder) UserManagementModuleOption {
	return core.WithRolesPanelConfigurer(fn)
}

func WithUserProfilesPanelConfigurer(fn func(*PanelBuilder) *PanelBuilder) UserManagementModuleOption {
	return core.WithUserProfilesPanelConfigurer(fn)
}
