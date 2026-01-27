package cmsboot

import (
	"context"
	"strings"
)

// EnsureOptions configure CMS container resolution.
type EnsureOptions struct {
	Container          CMSContainer
	WidgetService      CMSWidgetService
	MenuService        CMSMenuService
	ContentService     CMSContentService
	ContentTypeService CMSContentTypeService
	RequireCMS         bool
	BuildContainer     func(context.Context) (CMSContainer, error)
	FallbackContainer  func() CMSContainer
}

// EnsureResult returns resolved CMS container/services.
type EnsureResult struct {
	Container          CMSContainer
	WidgetService      CMSWidgetService
	MenuService        CMSMenuService
	ContentService     CMSContentService
	ContentTypeService CMSContentTypeService
}

// Ensure resolves a CMS container and required services, using builders or fallbacks when enabled.
func Ensure(ctx context.Context, opts EnsureOptions) (EnsureResult, error) {
	res := EnsureResult{
		Container:          opts.Container,
		WidgetService:      opts.WidgetService,
		MenuService:        opts.MenuService,
		ContentService:     opts.ContentService,
		ContentTypeService: opts.ContentTypeService,
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
		if res.ContentTypeService == nil {
			res.ContentTypeService = container.ContentTypeService()
		}
	}
	if res.ContentTypeService == nil && res.ContentService != nil {
		if svc, ok := res.ContentService.(CMSContentTypeService); ok {
			res.ContentTypeService = svc
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
	if err != nil {
		errMsg := strings.ToLower(err.Error())
		// Ignore duplicate menu errors - menu might already exist from previous runs or setup
		if strings.Contains(errMsg, "already exists") || strings.Contains(errMsg, "code already exists") {
			return nil
		}
		return err
	}
	return nil
}
