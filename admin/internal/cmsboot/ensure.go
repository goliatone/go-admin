package cmsboot

import "context"

// EnsureOptions configure CMS container resolution.
type EnsureOptions struct {
	Container         CMSContainer
	WidgetService     CMSWidgetService
	MenuService       CMSMenuService
	ContentService    CMSContentService
	RequireCMS        bool
	BuildContainer    func(context.Context) (CMSContainer, error)
	FallbackContainer func() CMSContainer
}

// EnsureResult returns resolved CMS container/services.
type EnsureResult struct {
	Container      CMSContainer
	WidgetService  CMSWidgetService
	MenuService    CMSMenuService
	ContentService CMSContentService
}

// Ensure resolves a CMS container and required services, using builders or fallbacks when enabled.
func Ensure(ctx context.Context, opts EnsureOptions) (EnsureResult, error) {
	res := EnsureResult{
		Container:      opts.Container,
		WidgetService:  opts.WidgetService,
		MenuService:    opts.MenuService,
		ContentService: opts.ContentService,
	}
	if !opts.RequireCMS {
		return res, nil
	}

	container := opts.Container
	if (container == nil || opts.MenuService == nil || opts.WidgetService == nil) && opts.BuildContainer != nil {
		built, err := opts.BuildContainer(ctx)
		if err != nil {
			return res, err
		}
		if built != nil {
			container = built
		}
	}
	if container == nil && opts.FallbackContainer != nil {
		container = opts.FallbackContainer()
	}
	if container != nil {
		res.Container = container
		if res.WidgetService == nil {
			res.WidgetService = container.WidgetService()
		}
		if res.MenuService == nil {
			res.MenuService = container.MenuService()
		}
		if res.ContentService == nil {
			res.ContentService = container.ContentService()
		}
	}
	return res, nil
}

// BootstrapMenu ensures a menu exists for a given code.
func BootstrapMenu(ctx context.Context, svc CMSMenuService, code string) error {
	if svc == nil || code == "" {
		return nil
	}
	_, err := svc.CreateMenu(ctx, code)
	return err
}
