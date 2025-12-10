package boot

// DashboardProvidersStep registers built-in dashboard providers.
func DashboardProvidersStep(ctx BootCtx) error {
	if ctx == nil {
		return nil
	}
	return ctx.RegisterDashboardProviders()
}
