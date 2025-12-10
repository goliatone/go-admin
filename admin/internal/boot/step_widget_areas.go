package boot

// WidgetAreasStep registers default dashboard widget areas.
func WidgetAreasStep(ctx BootCtx) error {
	if ctx == nil {
		return nil
	}
	return ctx.RegisterWidgetAreas()
}
