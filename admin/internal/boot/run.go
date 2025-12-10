package boot

// Run executes steps sequentially until one fails.
func Run(ctx BootCtx, steps ...Step) error {
	if ctx == nil || len(steps) == 0 {
		return nil
	}
	for _, step := range steps {
		if step == nil {
			continue
		}
		if err := step(ctx); err != nil {
			return err
		}
	}
	return nil
}
