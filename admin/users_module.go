package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"

	urlkit "github.com/goliatone/go-urlkit"
	"github.com/google/uuid"
)

const usersModuleID = "users"
const rolesPanelID = "roles"

// UserManagementModule registers user and role management panels and navigation.
type UserManagementModule struct {
	basePath      string
	menuCode      string
	defaultLocale string
	usersPerm     string
	rolesPerm     string
	menuParent    string
	urls          urlkit.Resolver
}

// NewUserManagementModule constructs the default user management module.
func NewUserManagementModule() *UserManagementModule {
	return &UserManagementModule{}
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
		return errors.New("admin is nil")
	}
	if ctx.Admin.users == nil {
		return FeatureDisabledError{Feature: string(FeatureUsers)}
	}
	if m.basePath == "" {
		m.basePath = ctx.Admin.config.BasePath
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

	if bus := ctx.Admin.Commands(); bus != nil {
		_, _ = RegisterCommand(bus, newUserActivateCommand(ctx.Admin.users))
		_, _ = RegisterCommand(bus, newUserSuspendCommand(ctx.Admin.users))
		_, _ = RegisterCommand(bus, newUserDisableCommand(ctx.Admin.users))
		_, _ = RegisterCommand(bus, newUserArchiveCommand(ctx.Admin.users))
	}

	lifecycleActions := []Action{
		{Name: "activate", CommandName: "users.activate", Permission: ctx.Admin.config.UsersUpdatePermission},
		{Name: "suspend", CommandName: "users.suspend", Permission: ctx.Admin.config.UsersUpdatePermission},
		{Name: "disable", CommandName: "users.disable", Permission: ctx.Admin.config.UsersUpdatePermission},
		{Name: "archive", CommandName: "users.archive", Permission: ctx.Admin.config.UsersDeletePermission},
	}
	userBuilder.Actions(lifecycleActions...)
	userBuilder.BulkActions(lifecycleActions...)

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

	if _, err := ctx.Admin.RegisterPanel(usersModuleID, userBuilder); err != nil {
		return err
	}
	if _, err := ctx.Admin.RegisterPanel(rolesPanelID, roleBuilder); err != nil {
		return err
	}

	if ctx.Admin.SearchService() != nil && featureEnabled(ctx.Admin.featureGate, FeatureSearch) {
		ctx.Admin.SearchService().Register(usersModuleID, &userSearchAdapter{
			service:    ctx.Admin.users,
			permission: ctx.Admin.config.UsersPermission,
			basePath:   m.basePath,
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
	return []MenuItem{
		{
			Label:       "Users",
			LabelKey:    "menu.users",
			Icon:        "users",
			Target:      map[string]any{"type": "url", "path": usersPath, "key": usersModuleID},
			Permissions: []string{m.usersPerm},
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    intPtr(40),
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
			Position:    intPtr(41),
			ParentID:    m.menuParent,
		},
	}
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

// User search adapter for global search/typeahead.
type userSearchAdapter struct {
	service    *UserManagementService
	permission string
	basePath   string
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
			URL:         firstNonEmpty(resolveURLWith(a.urls, "admin", "users.id", map[string]string{"id": user.ID}, nil), path.Join("/", a.basePath, usersModuleID, user.ID)),
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

func roleToRecord(role RoleRecord) map[string]any {
	record := map[string]any{
		"id":          role.ID,
		"name":        role.Name,
		"role_key":    role.RoleKey,
		"description": role.Description,
		"permissions": append([]string{}, role.Permissions...),
		"metadata":    cloneAnyMap(role.Metadata),
		"is_system":   role.IsSystem,
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
	perms := toStringSlice(record["permissions"])
	if len(perms) == 0 && record["permissions"] != nil {
		raw := toString(record["permissions"])
		if raw != "" {
			for _, part := range strings.FieldsFunc(raw, func(r rune) bool { return r == ',' || r == '\n' }) {
				if trimmed := strings.TrimSpace(part); trimmed != "" {
					perms = append(perms, trimmed)
				}
			}
		}
	}
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

func roleMetadata(value any) map[string]any {
	if value == nil {
		return nil
	}
	switch v := value.(type) {
	case map[string]any:
		return cloneAnyMap(v)
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
