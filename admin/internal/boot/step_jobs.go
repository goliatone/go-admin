package boot

import router "github.com/goliatone/go-router"

// JobsStep registers job routes.
func JobsStep(ctx BootCtx) error {
	binding := ctx.BootJobs()
	if binding == nil {
		return nil
	}
	return applyListActionRoutes(
		ctx,
		FeatureJobs,
		"jobs",
		"jobs.trigger",
		func(c router.Context) (any, error) { return binding.List(c) },
		func(c router.Context, body map[string]any) error { return binding.Trigger(c, body) },
	)
}
