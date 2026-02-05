package boot

// ExportRegistrarStep registers export routes provided by the host registrar.
func ExportRegistrarStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	registrar := ctx.ExportRegistrar()
	if registrar == nil {
		return nil
	}
	gates := ctx.Gates()
	if gates != nil && !gates.Enabled(FeatureExport) {
		return nil
	}
	opts := ExportRouteOptions{
		BasePath: adminBasePath(ctx),
		Wrap:     safeWrapper(ctx.AuthWrapper()),
	}
	return registrar.Register(ctx.Router(), opts)
}
