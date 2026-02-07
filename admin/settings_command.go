package admin

import (
	"context"

	"github.com/goliatone/go-command"
)

const settingsUpdateCommandName = "admin.settings.update"

// SettingsUpdateCommand wraps settings mutations in a go-command handler.
type SettingsUpdateCommand struct {
	Service    *SettingsService
	Permission string
}

// Execute applies the bundle found in the message.
func (c *SettingsUpdateCommand) Execute(ctx context.Context, msg SettingsUpdateMsg) error {
	if c.Service == nil {
		return serviceNotConfiguredDomainError("settings service", map[string]any{"component": "settings_command"})
	}
	return c.Service.Apply(ctx, msg.Bundle)
}

// CLIOptions exposes CLI metadata for the update command.
func (c *SettingsUpdateCommand) CLIHandler() any {
	return &NoopCLIHandler{}
}

// CLIOptions exposes CLI metadata for the update command.
func (c *SettingsUpdateCommand) CLIOptions() command.CLIConfig {
	return command.CLIConfig{
		Path:        []string{"settings", "update"},
		Description: "Update settings bundle",
		Group:       "admin",
	}
}
