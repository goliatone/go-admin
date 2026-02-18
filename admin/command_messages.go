package admin

import (
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
)

const (
	bulkCommandName                 = "admin.bulk"
	userActivateCommandName         = "users.activate"
	userSuspendCommandName          = "users.suspend"
	userDisableCommandName          = "users.disable"
	userArchiveCommandName          = "users.archive"
	userBulkAssignRoleCommandName   = "users.bulk_assign_role"
	userBulkUnassignRoleCommandName = "users.bulk_unassign_role"
	dashboardProviderCommandName    = "admin.dashboard.provider"
)

// SettingsUpdateMsg updates settings via the command bus.
type SettingsUpdateMsg struct {
	Bundle SettingsBundle
}

func (SettingsUpdateMsg) Type() string { return settingsUpdateCommandName }

func (m SettingsUpdateMsg) Validate() error {
	if m.Bundle.Values == nil {
		return validationDomainError("settings values required", map[string]any{
			"field": "values",
		})
	}
	return nil
}

// NotificationMarkMsg toggles notification read state.
type NotificationMarkMsg struct {
	IDs  []string
	Read bool
}

func (NotificationMarkMsg) Type() string { return NotificationMarkCommandName }

func (m NotificationMarkMsg) Validate() error {
	if len(m.IDs) == 0 {
		return validationDomainError("notification ids required", map[string]any{
			"field": "ids",
		})
	}
	return nil
}

// BulkStartMsg triggers a bulk job.
type BulkStartMsg struct {
	Name    string
	Action  string
	Total   int
	Payload map[string]any
}

func (BulkStartMsg) Type() string { return bulkCommandName }

func (m BulkStartMsg) Validate() error {
	if m.Name == "" {
		return validationDomainError("bulk name required", map[string]any{
			"field": "name",
		})
	}
	return nil
}

// UserActivateMsg updates users to active state.
type UserActivateMsg struct {
	IDs []string
}

func (UserActivateMsg) Type() string { return userActivateCommandName }

func (m UserActivateMsg) Validate() error { return requireIDs(m.IDs, "user ids required") }

// UserSuspendMsg updates users to suspended state.
type UserSuspendMsg struct {
	IDs []string
}

func (UserSuspendMsg) Type() string { return userSuspendCommandName }

func (m UserSuspendMsg) Validate() error { return requireIDs(m.IDs, "user ids required") }

// UserDisableMsg updates users to disabled state.
type UserDisableMsg struct {
	IDs []string
}

func (UserDisableMsg) Type() string { return userDisableCommandName }

func (m UserDisableMsg) Validate() error { return requireIDs(m.IDs, "user ids required") }

// UserArchiveMsg updates users to archived state.
type UserArchiveMsg struct {
	IDs []string
}

func (UserArchiveMsg) Type() string { return userArchiveCommandName }

func (m UserArchiveMsg) Validate() error { return requireIDs(m.IDs, "user ids required") }

// UserBulkAssignRoleMsg assigns a role for multiple users.
type UserBulkAssignRoleMsg struct {
	IDs     []string
	RoleID  string
	Replace bool
}

func (UserBulkAssignRoleMsg) Type() string { return userBulkAssignRoleCommandName }

func (m UserBulkAssignRoleMsg) Validate() error {
	if err := requireIDs(m.IDs, "user ids required"); err != nil {
		return err
	}
	if m.RoleID == "" {
		return validationDomainError("role id required", map[string]any{
			"field": "role_id",
		})
	}
	return nil
}

// UserBulkUnassignRoleMsg unassigns a role for multiple users.
type UserBulkUnassignRoleMsg struct {
	IDs    []string
	RoleID string
}

func (UserBulkUnassignRoleMsg) Type() string { return userBulkUnassignRoleCommandName }

func (m UserBulkUnassignRoleMsg) Validate() error {
	if err := requireIDs(m.IDs, "user ids required"); err != nil {
		return err
	}
	if m.RoleID == "" {
		return validationDomainError("role id required", map[string]any{
			"field": "role_id",
		})
	}
	return nil
}

// DashboardProviderMsg routes dashboard provider commands.
type DashboardProviderMsg struct {
	CommandName string
	Code        string
	Config      map[string]any
}

func (DashboardProviderMsg) Type() string { return dashboardProviderCommandName }

func (m DashboardProviderMsg) Validate() error {
	if m.CommandName == "" && m.Code == "" {
		return validationDomainError("dashboard command name required", map[string]any{
			"field": "command_name",
		})
	}
	return nil
}

// RegisterCoreCommandFactories installs factories for built-in commands.
func RegisterCoreCommandFactories(bus *CommandBus) error {
	if err := RegisterMessageFactory(bus, settingsUpdateCommandName, buildSettingsUpdateMsg); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, NotificationMarkCommandName, buildNotificationMarkMsg); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, bulkCommandName, buildBulkStartMsg); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, userActivateCommandName, buildUserActivateMsg); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, userSuspendCommandName, buildUserSuspendMsg); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, userDisableCommandName, buildUserDisableMsg); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, userArchiveCommandName, buildUserArchiveMsg); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, userBulkAssignRoleCommandName, buildUserBulkAssignRoleMsg); err != nil {
		return err
	}
	if err := RegisterMessageFactory(bus, userBulkUnassignRoleCommandName, buildUserBulkUnassignRoleMsg); err != nil {
		return err
	}
	return nil
}

func buildSettingsUpdateMsg(payload map[string]any, _ []string) (SettingsUpdateMsg, error) {
	if payload == nil {
		return SettingsUpdateMsg{}, validationDomainError("payload required", map[string]any{
			"field": "payload",
		})
	}
	values, ok := payload["values"].(map[string]any)
	if !ok {
		return SettingsUpdateMsg{}, validationDomainError("values must be an object", map[string]any{
			"field": "values",
		})
	}
	scope := SettingsScopeSite
	if raw, ok := payload["scope"].(string); ok && raw != "" {
		scope = SettingsScope(raw)
	}
	bundle := SettingsBundle{
		Scope:  scope,
		UserID: toString(payload["user_id"]),
		Values: values,
	}
	return SettingsUpdateMsg{Bundle: bundle}, nil
}

func buildNotificationMarkMsg(payload map[string]any, ids []string) (NotificationMarkMsg, error) {
	parsed := NotificationMarkMsg{Read: true}
	parsed.IDs = commandIDsFromPayload(ids, payload)
	if payload != nil {
		if raw, ok := payload["read"]; ok {
			parsed.Read = toBool(raw)
		}
	}
	if len(parsed.IDs) == 0 {
		return parsed, validationDomainError("notification ids required", map[string]any{
			"field": "ids",
		})
	}
	return parsed, nil
}

func buildBulkStartMsg(payload map[string]any, _ []string) (BulkStartMsg, error) {
	if payload == nil {
		return BulkStartMsg{}, validationDomainError("payload required", map[string]any{
			"field": "payload",
		})
	}
	total := atoiDefault(toString(payload["total"]), 0)
	name := toString(payload["name"])
	action := toString(payload["action"])
	if name == "" && action != "" {
		name = action
	}
	msg := BulkStartMsg{
		Name:    name,
		Action:  action,
		Total:   total,
		Payload: primitives.CloneAnyMap(payload),
	}
	if msg.Name == "" {
		return msg, validationDomainError("bulk name required", map[string]any{
			"field": "name",
		})
	}
	return msg, nil
}

func buildUserActivateMsg(payload map[string]any, ids []string) (UserActivateMsg, error) {
	userIDs := commandIDsFromPayload(ids, payload)
	if len(userIDs) == 0 {
		return UserActivateMsg{}, validationDomainError("user ids required", map[string]any{
			"field": "ids",
		})
	}
	return UserActivateMsg{IDs: userIDs}, nil
}

func buildUserSuspendMsg(payload map[string]any, ids []string) (UserSuspendMsg, error) {
	userIDs := commandIDsFromPayload(ids, payload)
	if len(userIDs) == 0 {
		return UserSuspendMsg{}, validationDomainError("user ids required", map[string]any{
			"field": "ids",
		})
	}
	return UserSuspendMsg{IDs: userIDs}, nil
}

func buildUserDisableMsg(payload map[string]any, ids []string) (UserDisableMsg, error) {
	userIDs := commandIDsFromPayload(ids, payload)
	if len(userIDs) == 0 {
		return UserDisableMsg{}, validationDomainError("user ids required", map[string]any{
			"field": "ids",
		})
	}
	return UserDisableMsg{IDs: userIDs}, nil
}

func buildUserArchiveMsg(payload map[string]any, ids []string) (UserArchiveMsg, error) {
	userIDs := commandIDsFromPayload(ids, payload)
	if len(userIDs) == 0 {
		return UserArchiveMsg{}, validationDomainError("user ids required", map[string]any{
			"field": "ids",
		})
	}
	return UserArchiveMsg{IDs: userIDs}, nil
}

func buildUserBulkAssignRoleMsg(payload map[string]any, ids []string) (UserBulkAssignRoleMsg, error) {
	userIDs := commandIDsFromPayload(ids, payload)
	roleID, replace, err := parseBulkRolePayload(payload)
	if err != nil {
		return UserBulkAssignRoleMsg{}, err
	}
	return UserBulkAssignRoleMsg{
		IDs:     userIDs,
		RoleID:  roleID,
		Replace: replace,
	}, nil
}

func buildUserBulkUnassignRoleMsg(payload map[string]any, ids []string) (UserBulkUnassignRoleMsg, error) {
	userIDs := commandIDsFromPayload(ids, payload)
	roleID, _, err := parseBulkRolePayload(payload)
	if err != nil {
		return UserBulkUnassignRoleMsg{}, err
	}
	return UserBulkUnassignRoleMsg{
		IDs:    userIDs,
		RoleID: roleID,
	}, nil
}

func parseBulkRolePayload(payload map[string]any) (string, bool, error) {
	if payload == nil {
		return "", false, validationDomainError("payload required", map[string]any{
			"field": "payload",
		})
	}
	roleID := strings.TrimSpace(toString(payload["role_id"]))
	if roleID == "" {
		return "", false, validationDomainError("role id required", map[string]any{
			"field": "role_id",
		})
	}
	return roleID, toBool(payload["replace"]), nil
}

func buildDashboardProviderMsg(commandName, code string, payload map[string]any) DashboardProviderMsg {
	cfg := map[string]any{}
	if payload != nil {
		if config, ok := payload["config"].(map[string]any); ok {
			cfg = primitives.CloneAnyMap(config)
		} else {
			cfg = primitives.CloneAnyMap(payload)
		}
	}
	return DashboardProviderMsg{
		CommandName: commandName,
		Code:        code,
		Config:      cfg,
	}
}

// RegisterDashboardProviderFactory registers a factory for a dashboard provider command name.
func RegisterDashboardProviderFactory(bus *CommandBus, commandName, code string, defaultConfig map[string]any) error {
	cfg := primitives.CloneAnyMap(defaultConfig)
	return RegisterMessageFactory(bus, commandName, func(payload map[string]any, _ []string) (DashboardProviderMsg, error) {
		msg := buildDashboardProviderMsg(commandName, code, payload)
		if len(msg.Config) == 0 && len(cfg) > 0 {
			msg.Config = primitives.CloneAnyMap(cfg)
		}
		return msg, nil
	})
}

func commandIDsFromPayload(ids []string, payload map[string]any) []string {
	if len(ids) == 0 && payload != nil {
		if id := toString(payload["id"]); id != "" {
			ids = append(ids, id)
		}
		ids = append(ids, toStringSlice(payload["ids"])...)
	}
	return dedupeStrings(ids)
}

func requireIDs(ids []string, msg string) error {
	if len(ids) == 0 {
		return validationDomainError(msg, map[string]any{
			"field": "ids",
		})
	}
	return nil
}
