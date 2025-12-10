package boot

// SettingsWidgetStep registers dashboard providers tied to settings.
func SettingsWidgetStep(ctx BootCtx) error {
	if ctx == nil {
		return nil
	}
	return ctx.SettingsWidget()
}
