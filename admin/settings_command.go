package admin

import (
	"context"
	"errors"
)

const settingsUpdateCommandName = "admin.settings.update"

type settingsBundleKey struct{}

// WithSettingsBundle injects a SettingsBundle into context for command execution.
func WithSettingsBundle(ctx context.Context, bundle SettingsBundle) context.Context {
	return context.WithValue(ctx, settingsBundleKey{}, bundle)
}

// SettingsBundleFromContext extracts a SettingsBundle from context.
func SettingsBundleFromContext(ctx context.Context) (SettingsBundle, bool) {
	bundle, ok := ctx.Value(settingsBundleKey{}).(SettingsBundle)
	return bundle, ok
}

// SettingsUpdateCommand wraps settings mutations in a go-command handler.
type SettingsUpdateCommand struct {
	Service    *SettingsService
	Permission string
}

// Name implements Command.
func (c *SettingsUpdateCommand) Name() string {
	return settingsUpdateCommandName
}

// Execute applies the bundle found in context.
func (c *SettingsUpdateCommand) Execute(ctx context.Context) error {
	if c.Service == nil {
		return errors.New("settings service not configured")
	}
	bundle, ok := SettingsBundleFromContext(ctx)
	if !ok {
		return errors.New("settings bundle missing")
	}
	return c.Service.Apply(ctx, bundle)
}

// CLIOptions exposes CLI metadata for the update command.
func (c *SettingsUpdateCommand) CLIOptions() *CLIOptions {
	return &CLIOptions{
		Path:        []string{"settings", "update"},
		Description: "Update settings bundle",
		Group:       "admin",
	}
}
