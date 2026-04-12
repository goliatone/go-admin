package boot

import "context"

type dynamicCMSReconciler interface {
	ReconcileDynamicCMS(context.Context) error
}

// DynamicCMSReconcileStep synchronizes dynamic CMS-backed panels before panel
// routes and downstream route snapshots are materialized.
func DynamicCMSReconcileStep(ctx BootCtx) error {
	if ctx == nil {
		return nil
	}
	reconciler, ok := ctx.(dynamicCMSReconciler)
	if !ok {
		return nil
	}
	lifecycle := ctx.LifecycleContext()
	if lifecycle == nil {
		lifecycle = context.Background()
	}
	return reconciler.ReconcileDynamicCMS(lifecycle)
}
