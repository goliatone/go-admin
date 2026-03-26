package boot

import "context"

type preparer interface {
	Prepare(context.Context) error
}

// PrepareStep runs any host-provided pre-route initialization.
func PrepareStep(ctx BootCtx) error {
	if ctx == nil {
		return nil
	}
	p, ok := ctx.(preparer)
	if !ok {
		return nil
	}
	prepareCtx := ctx.LifecycleContext()
	if prepareCtx == nil {
		prepareCtx = context.Background()
	}
	return p.Prepare(prepareCtx)
}
