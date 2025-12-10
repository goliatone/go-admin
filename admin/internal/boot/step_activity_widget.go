package boot

// ActivityWidgetStep registers the activity dashboard provider.
func ActivityWidgetStep(ctx BootCtx) error {
	if ctx == nil {
		return nil
	}
	return ctx.ActivityWidget()
}
