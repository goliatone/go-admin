package admin

import "context"

type debugCaptureSuppressionContextKey struct{}

// withDebugCaptureSuppressed marks work that is performed to build Debug
// state. Context-aware capture hooks must not feed that work back into the
// collector because the snapshot consumer cannot drain live events until the
// snapshot has completed.
func withDebugCaptureSuppressed(ctx context.Context) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if debugCaptureSuppressed(ctx) {
		return ctx
	}
	return context.WithValue(ctx, debugCaptureSuppressionContextKey{}, true)
}

func debugCaptureSuppressed(ctx context.Context) bool {
	if ctx == nil {
		return false
	}
	suppressed, _ := ctx.Value(debugCaptureSuppressionContextKey{}).(bool)
	return suppressed
}
