package admin

import "context"

// CMSBootstrapHook runs after CMS services are prepared and before module loading.
type CMSBootstrapHook func(context.Context, *Admin) error

type dynamicCMSReconciler interface {
	reconcileDynamicCMS(context.Context, *Admin) error
}

type lifecycleBootCtx struct {
	*Admin
}

func (ctx lifecycleBootCtx) Prepare(lifecycle context.Context) error {
	return ctx.prepare(lifecycle)
}

func (ctx lifecycleBootCtx) ReconcileDynamicCMS(lifecycle context.Context) error {
	return ctx.reconcileDynamicCMS(lifecycle)
}

// AddCMSBootstrapHook registers a hook that can create or repair CMS content
// types before dynamic CMS reconciliation runs during admin initialization.
func (a *Admin) AddCMSBootstrapHook(hook CMSBootstrapHook) {
	if a == nil || hook == nil {
		return
	}
	a.lifecycleMu.Lock()
	defer a.lifecycleMu.Unlock()
	a.cmsBootstrapHooks = append(a.cmsBootstrapHooks, hook)
}

func (a *Admin) runCMSBootstrapHooks(ctx context.Context) error {
	if a == nil || len(a.cmsBootstrapHooks) == 0 {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	for _, hook := range a.cmsBootstrapHooks {
		if hook == nil {
			continue
		}
		if err := hook(ctx, a); err != nil {
			return err
		}
	}
	return nil
}

// ReconcileDynamicCMS synchronizes dynamic CMS-backed panels with the current
// content type snapshot after modules have been loaded.
func (a *Admin) ReconcileDynamicCMS(ctx context.Context) error {
	if a == nil {
		return nil
	}
	return a.runWithLifecycleContext(ctx, func(lifecycle context.Context) error {
		return a.reconcileDynamicCMS(lifecycle)
	})
}

func (a *Admin) reconcileDynamicCMS(ctx context.Context) error {
	if a == nil || a.registry == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	for _, module := range a.registry.Modules() {
		reconciler, ok := module.(dynamicCMSReconciler)
		if !ok || reconciler == nil {
			continue
		}
		if err := reconciler.reconcileDynamicCMS(ctx, a); err != nil {
			return err
		}
	}
	return nil
}
