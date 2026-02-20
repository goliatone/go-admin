package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"time"

	urlkit "github.com/goliatone/go-urlkit"
	"github.com/google/uuid"
)

const (
	usersModuleID                   = "users"
	rolesPanelID                    = "roles"
	userProfilesPanelID             = "user-profiles"
	roleDebugPermissionPrefix       = "admin.debug."
	roleTranslationPermissionPrefix = "admin.translations."
)

var defaultRolePermissionMatrixResources = []string{
	"admin.dashboard",
	"admin.settings",
	"admin.users",
	"admin.roles",
	"admin.activity",
	"admin.jobs",
	"admin.search",
	"admin.preferences",
	"admin.profile",
	"admin.debug",
}

var defaultRolePermissionMatrixActions = []string{
	"view",
	"create",
	"import",
	"edit",
	"delete",
}

var defaultRoleDebugPermissionMatrixActions = []string{
	"repl",
	"repl.exec",
}

var defaultRoleTranslationPermissionMatrixActions = []string{
	"view",
	"edit",
	"manage",
	"assign",
	"approve",
	"claim",
	"export",
	"import.view",
	"import.validate",
	"import.apply",
}

// UserManagementModule registers user and role management panels and navigation.
type UserManagementModule struct {
	menuCode      string
	defaultLocale string
	usersPerm     string
	rolesPerm     string
	menuParent    string
	urls          urlkit.Resolver
	userTabs      []PanelTab

	usersPanelConfigurer        func(*PanelBuilder) *PanelBuilder
	rolesPanelConfigurer        func(*PanelBuilder) *PanelBuilder
	userProfilesPanelConfigurer func(*PanelBuilder) *PanelBuilder
	enableUserProfilesPanel     bool
	usersMenuPosition           *int
	rolesMenuPosition           *int
}

// UserManagementModuleOption configures a UserManagementModule.
type UserManagementModuleOption func(*UserManagementModule)

// NewUserManagementModule constructs the default user management module.
func NewUserManagementModule(opts ...UserManagementModuleOption) *UserManagementModule {
	module := &UserManagementModule{}
	for _, opt := range opts {
		if opt != nil {
			opt(module)
		}
	}
	return module
}

// WithUsersPanelConfigurer customizes the users panel builder after defaults are set.
func WithUsersPanelConfigurer(fn func(*PanelBuilder) *PanelBuilder) UserManagementModuleOption {
	return func(m *UserManagementModule) {
		m.usersPanelConfigurer = fn
	}
}

// WithRolesPanelConfigurer customizes the roles panel builder after defaults are set.
func WithRolesPanelConfigurer(fn func(*PanelBuilder) *PanelBuilder) UserManagementModuleOption {
	return func(m *UserManagementModule) {
		m.rolesPanelConfigurer = fn
	}
}

// WithUserPanelTabs appends tabs to the users panel.
func WithUserPanelTabs(tabs ...PanelTab) UserManagementModuleOption {
	return func(m *UserManagementModule) {
		m.userTabs = append(m.userTabs, tabs...)
	}
}

// WithUserProfilesPanel enables the managed user profiles panel.
func WithUserProfilesPanel() UserManagementModuleOption {
	return func(m *UserManagementModule) {
		m.enableUserProfilesPanel = true
	}
}

// WithUserProfilesPanelConfigurer customizes the user profiles panel builder when enabled.
func WithUserProfilesPanelConfigurer(fn func(*PanelBuilder) *PanelBuilder) UserManagementModuleOption {
	return func(m *UserManagementModule) {
		m.userProfilesPanelConfigurer = fn
	}
}

// WithUserMenuParent nests menu items under the provided parent ID.
func WithUserMenuParent(parent string) UserManagementModuleOption {
	return func(m *UserManagementModule) {
		m.menuParent = parent
	}
}

// WithMenuPositions overrides menu positions for users and roles.
func WithMenuPositions(usersPos, rolesPos *int) UserManagementModuleOption {
	return func(m *UserManagementModule) {
		m.usersMenuPosition = usersPos
		m.rolesMenuPosition = rolesPos
	}
}

// Manifest describes the module metadata.
func (m *UserManagementModule) Manifest() ModuleManifest {
	return ModuleManifest{
		ID:             usersModuleID,
		NameKey:        "modules.users.name",
		DescriptionKey: "modules.users.description",
		FeatureFlags:   []string{string(FeatureUsers)},
	}
}

// Register wires the users and roles panels, search adapter, and permissions.
func (m *UserManagementModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceNotConfiguredDomainError("admin", nil)
	}
	if ctx.Admin.users == nil {
		return FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	if m.menuCode == "" {
		m.menuCode = ctx.Admin.navMenuCode
	}
	if m.defaultLocale == "" {
		m.defaultLocale = ctx.Admin.config.DefaultLocale
	}
	if m.usersPerm == "" {
		m.usersPerm = ctx.Admin.config.UsersPermission
	}
	if m.rolesPerm == "" {
		m.rolesPerm = ctx.Admin.config.RolesPermission
	}
	if m.urls == nil {
		m.urls = ctx.Admin.URLs()
	}

	userRepo := NewUserPanelRepository(ctx.Admin.users)
	roleRepo := NewRolePanelRepository(ctx.Admin.users)

	userBuilder := ctx.Admin.Panel(usersModuleID).
		WithRepository(userRepo).
		ListFields(
			Field{Name: "email", Label: "Email", Type: "email"},
			Field{Name: "username", Label: "Username", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "role", Label: "Role", Type: "text"},
		).
		Filters(
			Filter{Name: "status", Type: "select"},
			Filter{Name: "role", Type: "select"},
		).
		FormFields(
			Field{Name: "email", Label: "Email", Type: "email", Required: true},
			Field{Name: "username", Label: "Username", Type: "text", Required: true},
			Field{Name: "first_name", Label: "First Name", Type: "text"},
			Field{Name: "last_name", Label: "Last Name", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "select", Options: statusOptions()},
			Field{Name: "role", Label: "Primary Role", Type: "select", Options: m.roleOptions(ctx.Admin)},
			Field{Name: "roles", Label: "Roles", Type: "select", Options: m.roleOptions(ctx.Admin)},
			Field{Name: "permissions", Label: "Permissions", Type: "textarea"},
		).
		DetailFields(
			Field{Name: "email", Label: "Email", Type: "email"},
			Field{Name: "username", Label: "Username", Type: "text"},
			Field{Name: "first_name", Label: "First Name", Type: "text"},
			Field{Name: "last_name", Label: "Last Name", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "roles", Label: "Roles", Type: "text"},
			Field{Name: "permissions", Label: "Permissions", Type: "text"},
		).
		Permissions(PanelPermissions{
			View:   ctx.Admin.config.UsersPermission,
			Create: ctx.Admin.config.UsersCreatePermission,
			Edit:   ctx.Admin.config.UsersUpdatePermission,
			Delete: ctx.Admin.config.UsersDeletePermission,
		})
	if m.usersPanelConfigurer != nil {
		if configured := m.usersPanelConfigurer(userBuilder); configured != nil {
			userBuilder = configured
		}
	}

	if bus := ctx.Admin.Commands(); bus != nil {
		_, _ = RegisterCommand(bus, newUserActivateCommand(ctx.Admin.users))
		_, _ = RegisterCommand(bus, newUserSuspendCommand(ctx.Admin.users))
		_, _ = RegisterCommand(bus, newUserDisableCommand(ctx.Admin.users))
		_, _ = RegisterCommand(bus, newUserArchiveCommand(ctx.Admin.users))
		_, _ = RegisterCommand(bus, newUserBulkAssignRoleCommand(ctx.Admin.users))
		_, _ = RegisterCommand(bus, newUserBulkUnassignRoleCommand(ctx.Admin.users))
	}

	lifecycleActions := []Action{
		{Name: "activate", CommandName: "users.activate", Permission: ctx.Admin.config.UsersUpdatePermission},
		{Name: "suspend", CommandName: "users.suspend", Permission: ctx.Admin.config.UsersUpdatePermission},
		{Name: "disable", CommandName: "users.disable", Permission: ctx.Admin.config.UsersUpdatePermission},
		{Name: "archive", CommandName: "users.archive", Permission: ctx.Admin.config.UsersDeletePermission},
	}
	roleActions := []Action{
		{
			Name:            "assign-role",
			Label:           "Assign Role",
			CommandName:     userBulkAssignRoleCommandName,
			Permission:      ctx.Admin.config.UsersUpdatePermission,
			PayloadRequired: []string{"role_id"},
		},
		{
			Name:            "unassign-role",
			Label:           "Unassign Role",
			CommandName:     userBulkUnassignRoleCommandName,
			Permission:      ctx.Admin.config.UsersUpdatePermission,
			PayloadRequired: []string{"role_id"},
		},
	}
	userBuilder.Actions(lifecycleActions...)
	userBuilder.BulkActions(append(lifecycleActions, roleActions...)...)

	roleBuilder := ctx.Admin.Panel(rolesPanelID).
		WithRepository(roleRepo).
		ListFields(
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "role_key", Label: "Role Key", Type: "text"},
			Field{Name: "description", Label: "Description", Type: "text"},
			Field{Name: "permissions", Label: "Permissions", Type: "text"},
			Field{Name: "is_system", Label: "System Role", Type: "boolean"},
		).
		FormFields(
			Field{Name: "name", Label: "Name", Type: "text", Required: true},
			Field{Name: "role_key", Label: "Role Key", Type: "text"},
			Field{Name: "description", Label: "Description", Type: "textarea"},
			Field{Name: "permissions", Label: "Permissions", Type: "textarea"},
			Field{Name: "metadata", Label: "Metadata", Type: "textarea"},
			Field{Name: "is_system", Label: "System Role", Type: "boolean"},
		).
		FormSchema(defaultRolesPanelFormSchema()).
		DetailFields(
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "role_key", Label: "Role Key", Type: "text"},
			Field{Name: "description", Label: "Description", Type: "text"},
			Field{Name: "permissions", Label: "Permissions", Type: "text"},
			Field{Name: "metadata", Label: "Metadata", Type: "text"},
			Field{Name: "is_system", Label: "System Role", Type: "boolean"},
		).
		Permissions(PanelPermissions{
			View:   ctx.Admin.config.RolesPermission,
			Create: ctx.Admin.config.RolesCreatePermission,
			Edit:   ctx.Admin.config.RolesUpdatePermission,
			Delete: ctx.Admin.config.RolesDeletePermission,
		})
	if m.rolesPanelConfigurer != nil {
		if configured := m.rolesPanelConfigurer(roleBuilder); configured != nil {
			roleBuilder = configured
		}
	}

	if _, err := ctx.Admin.RegisterPanel(usersModuleID, userBuilder); err != nil {
		return err
	}
	if _, err := ctx.Admin.RegisterPanel(rolesPanelID, roleBuilder); err != nil {
		return err
	}
	for _, tab := range m.userTabs {
		if err := ctx.Admin.RegisterPanelTab(usersModuleID, tab); err != nil {
			return err
		}
	}

	if m.enableUserProfilesPanel {
		profileStore := ProfileStore(nil)
		if ctx.Admin.profile != nil {
			profileStore = ctx.Admin.profile.Store()
		}
		profilesRepo := NewUserProfilesPanelRepository(ctx.Admin.users, profileStore, m.defaultLocale)
		profilesBuilder := ctx.Admin.Panel(userProfilesPanelID).
			WithRepository(profilesRepo).
			ListFields(
				Field{Name: "id", Label: "User ID", Type: "text"},
				Field{Name: profileKeyDisplayName, Label: "Display Name", Type: "text"},
				Field{Name: profileKeyEmail, Label: "Email", Type: "email"},
				Field{Name: profileKeyLocale, Label: "Locale", Type: "text"},
				Field{Name: profileKeyTimezone, Label: "Timezone", Type: "text"},
			).
			FormFields(
				Field{Name: "id", Label: "User ID", Type: "text", Required: true},
				Field{Name: profileKeyDisplayName, Label: "Display Name", Type: "text", Required: true},
				Field{Name: profileKeyEmail, Label: "Email", Type: "email"},
				Field{Name: profileKeyAvatarURL, Label: "Avatar URL", Type: "text"},
				Field{Name: profileKeyLocale, Label: "Locale", Type: "text"},
				Field{Name: profileKeyTimezone, Label: "Timezone", Type: "text"},
				Field{Name: profileKeyBio, Label: "Bio", Type: "textarea"},
			).
			DetailFields(
				Field{Name: "id", Label: "User ID", Type: "text", ReadOnly: true},
				Field{Name: profileKeyDisplayName, Label: "Display Name", Type: "text"},
				Field{Name: profileKeyEmail, Label: "Email", Type: "email"},
				Field{Name: profileKeyAvatarURL, Label: "Avatar URL", Type: "text"},
				Field{Name: profileKeyLocale, Label: "Locale", Type: "text"},
				Field{Name: profileKeyTimezone, Label: "Timezone", Type: "text"},
				Field{Name: profileKeyBio, Label: "Bio", Type: "textarea"},
			).
			Filters(
				Filter{Name: profileKeyDisplayName, Label: "Display Name", Type: "text"},
				Filter{Name: profileKeyEmail, Label: "Email", Type: "text"},
				Filter{Name: profileKeyLocale, Label: "Locale", Type: "text"},
				Filter{Name: profileKeyTimezone, Label: "Timezone", Type: "text"},
			).
			Permissions(PanelPermissions{
				View:   ctx.Admin.config.UsersPermission,
				Create: ctx.Admin.config.UsersCreatePermission,
				Edit:   ctx.Admin.config.UsersUpdatePermission,
				Delete: ctx.Admin.config.UsersDeletePermission,
			})
		if m.userProfilesPanelConfigurer != nil {
			if configured := m.userProfilesPanelConfigurer(profilesBuilder); configured != nil {
				profilesBuilder = configured
			}
		}
		if _, err := ctx.Admin.RegisterPanel(userProfilesPanelID, profilesBuilder); err != nil {
			return err
		}
	}

	if ctx.Admin.SearchService() != nil && featureEnabled(ctx.Admin.featureGate, FeatureSearch) {
		ctx.Admin.SearchService().Register(usersModuleID, &userSearchAdapter{
			service:    ctx.Admin.users,
			permission: ctx.Admin.config.UsersPermission,
			urls:       m.urls,
		})
	}
	return nil
}

// MenuItems contributes navigation for users and roles.
func (m *UserManagementModule) MenuItems(locale string) []MenuItem {
	if locale == "" {
		locale = m.defaultLocale
	}
	usersPath := resolveURLWith(m.urls, "admin", usersModuleID, nil, nil)
	rolesPath := resolveURLWith(m.urls, "admin", rolesPanelID, nil, nil)
	items := []MenuItem{
		{
			Label:       "Users",
			LabelKey:    "menu.users",
			Icon:        "group",
			Target:      map[string]any{"type": "url", "path": usersPath, "key": usersModuleID},
			Permissions: []string{m.usersPerm},
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    menuPosition(m.usersMenuPosition, 40),
			ParentID:    m.menuParent,
		},
		{
			Label:       "Roles",
			LabelKey:    "menu.roles",
			Icon:        "shield",
			Target:      map[string]any{"type": "url", "path": rolesPath, "key": rolesPanelID},
			Permissions: []string{m.rolesPerm},
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    menuPosition(m.rolesMenuPosition, 41),
			ParentID:    m.menuParent,
		},
	}
	if m.enableUserProfilesPanel {
		profilesPath := resolveURLWith(m.urls, "admin", "user_profiles", nil, nil)
		items = append(items, MenuItem{
			Label:       "User Profiles",
			LabelKey:    "menu.user_profiles",
			Icon:        "user-circle",
			Target:      map[string]any{"type": "url", "path": profilesPath, "key": userProfilesPanelID},
			Permissions: []string{m.usersPerm},
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    menuPosition(nil, 42),
			ParentID:    m.menuParent,
		})
	}
	return items
}

func menuPosition(pos *int, fallback int) *int {
	if pos != nil {
		return primitives.Int(*pos)
	}
	return primitives.Int(fallback)
}

// WithMenuParent nests the module navigation under a parent menu item ID.
func (m *UserManagementModule) WithMenuParent(parent string) *UserManagementModule {
	m.menuParent = parent
	return m
}

func (m *UserManagementModule) roleOptions(admin *Admin) []Option {
	if admin == nil || admin.users == nil {
		return nil
	}
	ctx := context.WithValue(context.Background(), userIDContextKey, uuid.NewString())
	roles, _, err := admin.users.ListRoles(ctx, ListOptions{PerPage: 50})
	if err != nil {
		return nil
	}
	out := []Option{}
	for _, role := range roles {
		out = append(out, Option{Value: role.ID, Label: role.Name})
	}
	return out
}

func statusOptions() []Option {
	return []Option{
		{Value: "pending", Label: "Pending"},
		{Value: "active", Label: "Active"},
		{Value: "suspended", Label: "Suspended"},
		{Value: "disabled", Label: "Disabled"},
		{Value: "archived", Label: "Archived"},
	}
}

// UserPanelRepository adapts UserManagementService to the panel Repository contract.
type UserPanelRepository struct {
	service *UserManagementService
}

// NewUserPanelRepository constructs a new panel repository.
func NewUserPanelRepository(service *UserManagementService) *UserPanelRepository {
	return &UserPanelRepository{service: service}
}

// List returns user records.
func (r *UserPanelRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.service == nil {
		return nil, 0, FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	users, total, err := r.service.ListUsers(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]map[string]any, 0, len(users))
	for _, user := range users {
		out = append(out, userToRecord(user))
	}
	return out, total, nil
}

// Get fetches a single user record.
func (r *UserPanelRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	user, err := r.service.GetUser(ctx, id)
	if err != nil {
		return nil, err
	}
	return userToRecord(user), nil
}

// Create adds a user.
func (r *UserPanelRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.Update(ctx, "", record)
}

// Update modifies a user.
func (r *UserPanelRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	user := recordToUser(record, id)
	saved, err := r.service.SaveUser(ctx, user)
	if err != nil {
		return nil, err
	}
	return userToRecord(saved), nil
}

// Delete removes a user.
func (r *UserPanelRepository) Delete(ctx context.Context, id string) error {
	if r.service == nil {
		return FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	return r.service.DeleteUser(ctx, id)
}

// RolePanelRepository adapts roles to the panel Repository contract.
type RolePanelRepository struct {
	service *UserManagementService
}

// NewRolePanelRepository constructs a repository backed by UserManagementService roles.
func NewRolePanelRepository(service *UserManagementService) *RolePanelRepository {
	return &RolePanelRepository{service: service}
}

// List returns roles.
func (r *RolePanelRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.service == nil {
		return nil, 0, FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	roles, total, err := r.service.ListRoles(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]map[string]any, 0, len(roles))
	for _, role := range roles {
		out = append(out, roleToRecord(role))
	}
	return out, total, nil
}

// Get returns a role.
func (r *RolePanelRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	role, err := r.service.roles.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return roleToRecord(role), nil
}

// Create adds a role.
func (r *RolePanelRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.Update(ctx, "", record)
}

// Update modifies a role.
func (r *RolePanelRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	role := recordToRole(record, id)
	saved, err := r.service.SaveRole(ctx, role)
	if err != nil {
		return nil, err
	}
	return roleToRecord(saved), nil
}

// Delete removes a role.
func (r *RolePanelRepository) Delete(ctx context.Context, id string) error {
	if r.service == nil {
		return FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	return r.service.DeleteRole(ctx, id)
}

// UserProfilesPanelRepository adapts ProfileStore to managed user profile panels.
type UserProfilesPanelRepository struct {
	users         *UserManagementService
	profiles      ProfileStore
	defaultLocale string
}

// NewUserProfilesPanelRepository constructs a repository backed by UserManagementService and ProfileStore.
func NewUserProfilesPanelRepository(users *UserManagementService, profiles ProfileStore, defaultLocale string) *UserProfilesPanelRepository {
	return &UserProfilesPanelRepository{
		users:         users,
		profiles:      profiles,
		defaultLocale: defaultLocale,
	}
}

// List returns user profiles for managed users.
func (r *UserProfilesPanelRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.users == nil {
		return nil, 0, FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	if r.profiles == nil {
		return nil, 0, serviceNotConfiguredDomainError("profile store", nil)
	}
	users, total, err := r.users.ListUsers(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]map[string]any, 0, len(users))
	for _, user := range users {
		profile, err := r.profiles.Get(ctx, user.ID)
		if err != nil {
			return nil, 0, err
		}
		if profile.UserID == "" {
			profile.UserID = user.ID
		}
		out = append(out, r.recordFromProfile(r.applyDefaults(profile)))
	}
	return out, total, nil
}

// Get fetches a single user profile.
func (r *UserProfilesPanelRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.users == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	if r.profiles == nil {
		return nil, serviceNotConfiguredDomainError("profile store", nil)
	}
	if id == "" {
		return nil, ErrForbidden
	}
	if _, err := r.users.GetUser(ctx, id); err != nil {
		return nil, err
	}
	profile, err := r.profiles.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if profile.UserID == "" {
		profile.UserID = id
	}
	return r.recordFromProfile(r.applyDefaults(profile)), nil
}

// Create adds a user profile.
func (r *UserProfilesPanelRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.Update(ctx, "", record)
}

// Update modifies a user profile.
func (r *UserProfilesPanelRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.users == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	if r.profiles == nil {
		return nil, serviceNotConfiguredDomainError("profile store", nil)
	}
	if id == "" {
		id = toString(record["id"])
	}
	if id == "" {
		return nil, ErrForbidden
	}
	if _, err := r.users.GetUser(ctx, id); err != nil {
		return nil, err
	}
	profile := r.profileFromRecord(record)
	profile.UserID = id
	updated, err := r.profiles.Save(ctx, profile)
	if err != nil {
		return nil, err
	}
	if updated.UserID == "" {
		updated.UserID = id
	}
	return r.recordFromProfile(r.applyDefaults(updated)), nil
}

// Delete removes a user profile if supported by the backing store.
func (r *UserProfilesPanelRepository) Delete(ctx context.Context, id string) error {
	if r.users == nil {
		return FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	if r.profiles == nil {
		return serviceNotConfiguredDomainError("profile store", nil)
	}
	if id == "" {
		return ErrForbidden
	}
	type profileDeleter interface {
		Delete(ctx context.Context, userID string) error
	}
	if deleter, ok := r.profiles.(profileDeleter); ok {
		return deleter.Delete(ctx, id)
	}
	return ErrForbidden
}

func (r *UserProfilesPanelRepository) applyDefaults(profile UserProfile) UserProfile {
	return applyUserProfileDefaults(profile, r.defaultLocale)
}

func (r *UserProfilesPanelRepository) recordFromProfile(profile UserProfile) map[string]any {
	return userProfileToRecord(profile)
}

func (r *UserProfilesPanelRepository) profileFromRecord(record map[string]any) UserProfile {
	return userProfileFromRecord(record)
}

// User search adapter for global search/typeahead.
type userSearchAdapter struct {
	service    *UserManagementService
	permission string
	urls       urlkit.Resolver
}

// Search queries users by keyword.
func (a *userSearchAdapter) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	if a == nil || a.service == nil {
		return nil, nil
	}
	users, err := a.service.SearchUsers(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	results := make([]SearchResult, 0, len(users))
	for _, user := range users {
		status := user.Status
		if status == "" {
			status = "active"
		}
		descParts := []string{titleCase(status)}
		if len(user.Roles) > 0 {
			descParts = append(descParts, strings.Join(user.Roles, ","))
		}
		results = append(results, SearchResult{
			Type:        usersModuleID,
			ID:          user.ID,
			Title:       fmt.Sprintf("%s (%s)", user.Username, user.Email),
			Description: strings.TrimSpace(strings.Join(descParts, " ")),
			URL:         resolveURLWith(a.urls, "admin", "users.id", map[string]string{"id": user.ID}, nil),
			Icon:        "user",
		})
	}
	return results, nil
}

// Permission returns the permission required to use this adapter.
func (a *userSearchAdapter) Permission() string {
	if a == nil {
		return ""
	}
	return a.permission
}

func userToRecord(user UserRecord) map[string]any {
	record := map[string]any{
		"id":           user.ID,
		"email":        user.Email,
		"username":     user.Username,
		"first_name":   user.FirstName,
		"last_name":    user.LastName,
		"status":       user.Status,
		"role":         user.Role,
		"roles":        append([]string{}, user.Roles...),
		"permissions":  append([]string{}, user.Permissions...),
		"display_name": strings.TrimSpace(strings.Join([]string{user.FirstName, user.LastName}, " ")),
	}
	if len(user.RoleLabels) > 0 {
		record["role_assignments"] = append([]string{}, user.RoleLabels...)
	}
	if trimmed := strings.TrimSpace(user.RoleDisplay); trimmed != "" {
		record["role_display"] = trimmed
	}
	if !user.CreatedAt.IsZero() {
		record["created_at"] = user.CreatedAt.Format(time.RFC3339)
	}
	if !user.UpdatedAt.IsZero() {
		record["updated_at"] = user.UpdatedAt.Format(time.RFC3339)
	}
	return record
}

func userRoles(record map[string]any) []string {
	roles := []string{}
	if val, ok := record["roles"]; ok {
		roles = append(roles, toStringSlice(val)...)
	}
	if role := toString(record["role"]); role != "" {
		roles = append(roles, role)
	}
	return dedupeStrings(roles)
}

func userPermissions(record map[string]any) []string {
	perms := []string{}
	if val, ok := record["permissions"]; ok {
		perms = append(perms, toStringSlice(val)...)
	}
	raw := toString(record["permissions"])
	if raw != "" && len(perms) == 0 {
		for _, part := range strings.FieldsFunc(raw, func(r rune) bool { return r == ',' || r == '\n' }) {
			if strings.TrimSpace(part) != "" {
				perms = append(perms, strings.TrimSpace(part))
			}
		}
	}
	return dedupeStrings(perms)
}

func recordToUser(record map[string]any, id string) UserRecord {
	if record == nil {
		record = map[string]any{}
	}
	if id == "" {
		id = toString(record["id"])
	}
	return UserRecord{
		ID:          id,
		Email:       toString(record["email"]),
		Username:    toString(record["username"]),
		FirstName:   toString(record["first_name"]),
		LastName:    toString(record["last_name"]),
		Status:      strings.ToLower(toString(record["status"])),
		Role:        toString(record["role"]),
		Roles:       userRoles(record),
		Permissions: userPermissions(record),
	}
}

func defaultRolesPanelFormSchema() map[string]any {
	mainConfig := map[string]any{
		"resources": append([]string{}, defaultRolePermissionMatrixResources...),
		"actions":   append([]string{}, defaultRolePermissionMatrixActions...),
		"extraIgnorePrefixes": []string{
			roleDebugPermissionPrefix,
			roleTranslationPermissionPrefix,
		},
	}
	debugConfig := map[string]any{
		"showExtra": false,
		"resources": []string{"admin.debug"},
		"actions":   append([]string{}, defaultRoleDebugPermissionMatrixActions...),
	}
	translationConfig := map[string]any{
		"showExtra": false,
		"resources": []string{"admin.translations"},
		"actions":   append([]string{}, defaultRoleTranslationPermissionMatrixActions...),
	}
	return map[string]any{
		"type":     "object",
		"required": []string{"name"},
		"properties": map[string]any{
			"name": map[string]any{
				"type":  "string",
				"title": "Name",
			},
			"role_key": map[string]any{
				"type":  "string",
				"title": "Role Key",
			},
			"description": map[string]any{
				"type":  "string",
				"title": "Description",
				"x-formgen": map[string]any{
					"widget": "textarea",
				},
			},
			"permissions": map[string]any{
				"type":  "string",
				"title": "Permissions",
				"x-formgen": map[string]any{
					"widget":         "permission-matrix",
					"component.name": "permission-matrix",
					"component.config": map[string]any{
						"resources":           mainConfig["resources"],
						"actions":             mainConfig["actions"],
						"extraIgnorePrefixes": mainConfig["extraIgnorePrefixes"],
					},
				},
			},
			"permissions_debug": map[string]any{
				"type":  "string",
				"title": "Debug Permissions",
				"x-formgen": map[string]any{
					"widget":         "permission-matrix",
					"component.name": "permission-matrix",
					"component.config": map[string]any{
						"showExtra": debugConfig["showExtra"],
						"resources": debugConfig["resources"],
						"actions":   debugConfig["actions"],
					},
				},
			},
			"permissions_translation": map[string]any{
				"type":  "string",
				"title": "Translation Permissions",
				"x-formgen": map[string]any{
					"widget":         "permission-matrix",
					"component.name": "permission-matrix",
					"component.config": map[string]any{
						"showExtra": translationConfig["showExtra"],
						"resources": translationConfig["resources"],
						"actions":   translationConfig["actions"],
					},
				},
			},
			"metadata": map[string]any{
				"type":  "string",
				"title": "Metadata",
				"x-formgen": map[string]any{
					"widget": "textarea",
				},
			},
			"is_system": map[string]any{
				"type":  "boolean",
				"title": "System Role",
			},
		},
	}
}

func roleToRecord(role RoleRecord) map[string]any {
	permissions := dedupeStrings(append([]string{}, role.Permissions...))
	record := map[string]any{
		"id":          role.ID,
		"name":        role.Name,
		"role_key":    role.RoleKey,
		"description": role.Description,
		"permissions": permissions,
		"metadata":    primitives.CloneAnyMap(role.Metadata),
		"is_system":   role.IsSystem,
	}
	if debugPermissions := rolePermissionsWithPrefix(permissions, roleDebugPermissionPrefix); len(debugPermissions) > 0 {
		record["permissions_debug"] = debugPermissions
	}
	if translationPermissions := rolePermissionsWithPrefix(permissions, roleTranslationPermissionPrefix); len(translationPermissions) > 0 {
		record["permissions_translation"] = translationPermissions
	}
	if !role.CreatedAt.IsZero() {
		record["created_at"] = role.CreatedAt.Format(time.RFC3339)
	}
	if !role.UpdatedAt.IsZero() {
		record["updated_at"] = role.UpdatedAt.Format(time.RFC3339)
	}
	return record
}

func recordToRole(record map[string]any, id string) RoleRecord {
	if record == nil {
		record = map[string]any{}
	}
	if id == "" {
		id = toString(record["id"])
	}
	perms := rolePermissionsFromRecordField(record["permissions"])
	debugPerms := rolePermissionsFromRecordField(record["permissions_debug"])
	if len(debugPerms) > 0 {
		perms = append(perms, debugPerms...)
	}
	translationPerms := rolePermissionsFromRecordField(record["permissions_translation"])
	if len(translationPerms) > 0 {
		perms = append(perms, translationPerms...)
	}
	perms = dedupeStrings(perms)
	return RoleRecord{
		ID:          id,
		Name:        toString(record["name"]),
		RoleKey:     toString(record["role_key"]),
		Description: toString(record["description"]),
		Permissions: perms,
		Metadata:    roleMetadata(record["metadata"]),
		IsSystem:    toBool(record["is_system"]),
	}
}

func rolePermissionsFromRecordField(value any) []string {
	perms := permissionStrings(value)
	if len(perms) == 0 {
		perms = toStringSlice(value)
	}
	return dedupeStrings(perms)
}

func rolePermissionsWithPrefix(perms []string, prefix string) []string {
	if len(perms) == 0 {
		return nil
	}
	needle := strings.TrimSpace(prefix)
	if needle == "" {
		return nil
	}
	filtered := []string{}
	for _, perm := range perms {
		trimmed := strings.TrimSpace(perm)
		if trimmed == "" {
			continue
		}
		if strings.HasPrefix(trimmed, needle) {
			filtered = append(filtered, trimmed)
		}
	}
	return dedupeStrings(filtered)
}

func roleMetadata(value any) map[string]any {
	if value == nil {
		return nil
	}
	switch v := value.(type) {
	case map[string]any:
		return primitives.CloneAnyMap(v)
	case map[string]string:
		out := map[string]any{}
		for key, val := range v {
			out[key] = val
		}
		return out
	case string:
		raw := strings.TrimSpace(v)
		if raw == "" {
			return nil
		}
		out := map[string]any{}
		if err := json.Unmarshal([]byte(raw), &out); err == nil {
			return out
		}
	}
	return nil
}

func toBool(val any) bool {
	switch v := val.(type) {
	case bool:
		return v
	case string:
		switch strings.ToLower(strings.TrimSpace(v)) {
		case "true", "1", "yes", "y", "on":
			return true
		}
	}
	return false
}

func toStringSlice(val any) []string {
	switch v := val.(type) {
	case []string:
		return dedupeStrings(v)
	case []any:
		out := []string{}
		for _, item := range v {
			if s := toString(item); s != "" {
				out = append(out, s)
			}
		}
		return dedupeStrings(out)
	}
	return nil
}
