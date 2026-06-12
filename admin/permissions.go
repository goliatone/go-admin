package admin

const (
	PermAdminWildcard = "admin.*"

	PermAdminDashboardView = "admin.dashboard.view"

	PermAdminUsersView   = "admin.users.view"
	PermAdminUsersCreate = "admin.users.create"
	PermAdminUsersImport = "admin.users.import"
	PermAdminUsersEdit   = "admin.users.edit"
	PermAdminUsersDelete = "admin.users.delete"

	PermAdminRolesView   = "admin.roles.view"
	PermAdminRolesCreate = "admin.roles.create"
	PermAdminRolesEdit   = "admin.roles.edit"
	PermAdminRolesDelete = "admin.roles.delete"

	PermAdminTenantsView   = "admin.tenants.view"
	PermAdminTenantsCreate = "admin.tenants.create"
	PermAdminTenantsEdit   = "admin.tenants.edit"
	PermAdminTenantsDelete = "admin.tenants.delete"

	PermAdminOrganizationsView   = "admin.organizations.view"
	PermAdminOrganizationsCreate = "admin.organizations.create"
	PermAdminOrganizationsEdit   = "admin.organizations.edit"
	PermAdminOrganizationsDelete = "admin.organizations.delete"

	PermAdminMediaView   = "admin.media.view"
	PermAdminMediaCreate = "admin.media.create"
	PermAdminMediaEdit   = "admin.media.edit"
	PermAdminMediaDelete = "admin.media.delete"

	PermAdminActivityView = "admin.activity.view"

	PermAdminSettingsView = "admin.settings.view"
	PermAdminSettingsEdit = "admin.settings.edit"

	PermAdminFeatureFlagsView   = "admin.feature_flags.view"
	PermAdminFeatureFlagsUpdate = "admin.feature_flags.update"

	PermAdminNotificationsView   = "admin.notifications.view"
	PermAdminNotificationsUpdate = "admin.notifications.update"

	PermAdminJobsView    = "admin.jobs.view"
	PermAdminJobsEdit    = "admin.jobs.edit"
	PermAdminJobsTrigger = "admin.jobs.trigger"

	PermAdminSearchView = "admin.search.view"

	PermAdminPreferencesView         = "admin.preferences.view"
	PermAdminPreferencesEdit         = "admin.preferences.edit"
	PermAdminPreferencesManageTenant = "admin.preferences.manage_tenant"
	PermAdminPreferencesManageOrg    = "admin.preferences.manage_org"
	PermAdminPreferencesManageSystem = "admin.preferences.manage_system"

	PermAdminProfileView = "admin.profile.view"
	PermAdminProfileEdit = "admin.profile.edit"

	PermAdminDebugView          = "admin.debug.view"
	PermAdminDebugRepl          = "admin.debug.repl"
	PermAdminDebugReplExec      = "admin.debug.repl.exec"
	PermAdminDebugSessionView   = "admin.debug.session.view"
	PermAdminDebugSessionAttach = "admin.debug.session.attach"

	PermAdminMenusView    = "admin.menus.view"
	PermAdminMenusEdit    = "admin.menus.edit"
	PermAdminMenusPublish = "admin.menus.publish"

	PermAdminSiteRead                = "admin.site.read"
	PermAdminSiteReadDrafts          = "admin.site.read_drafts"
	PermAdminSiteViewProfileOverride = "admin.site.view_profile_override"

	PermAdminPagesView    = "admin.pages.view"
	PermAdminPagesCreate  = "admin.pages.create"
	PermAdminPagesEdit    = "admin.pages.edit"
	PermAdminPagesDelete  = "admin.pages.delete"
	PermAdminPagesPublish = "admin.pages.publish"

	PermAdminPostsView    = "admin.posts.view"
	PermAdminPostsCreate  = "admin.posts.create"
	PermAdminPostsEdit    = "admin.posts.edit"
	PermAdminPostsDelete  = "admin.posts.delete"
	PermAdminPostsPublish = "admin.posts.publish"

	PermAdminContentTypesView      = "admin.content_types.view"
	PermAdminBlockDefinitionsView  = "admin.block_definitions.view"
	PermAdminContentModelingManage = "admin.content_modeling.manage"

	PermAdminIntegrationsManage = "admin.integrations.manage"
	PermAdminTranscriptsIngest  = "admin.transcripts.ingest"

	PermAdminArchiveView     = "admin.archive.view"
	PermAdminArchiveCreate   = "admin.archive.create"
	PermAdminArchiveEdit     = "admin.archive.edit"
	PermAdminArchiveDelete   = "admin.archive.delete"
	PermAdminArchivePublish  = "admin.archive.publish"
	PermAdminArchiveDiagnose = "admin.archive.diagnose"
)
