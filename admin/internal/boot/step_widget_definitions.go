package boot

// WidgetDefinitionsStep registers default widget definitions.
func WidgetDefinitionsStep(ctx BootCtx) error {
	if ctx == nil {
		return nil
	}
	return ctx.RegisterWidgetDefinitions()
}
