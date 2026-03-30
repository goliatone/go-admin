package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

type menuByLocationWithOptions interface {
	MenuByLocationWithOptions(ctx context.Context, location, locale string, opts admin.SiteMenuReadOptions) (*admin.Menu, error)
}

type menuByCodeWithOptions interface {
	MenuByCodeWithOptions(ctx context.Context, code, locale string, opts admin.SiteMenuReadOptions) (*admin.Menu, error)
}

func (r *navigationRuntime) resolveRawMenu(
	ctx context.Context,
	state RequestState,
	location string,
	opts navigationReadOptions,
) (*admin.Menu, string, error) {
	location = strings.TrimSpace(location)
	var lastErr error
	if r.menuSvc != nil && location != "" {
		menu, err := r.menuByLocation(ctx, location, opts)
		if err == nil && menu != nil && len(menu.Items) > 0 {
			return menu, "location", nil
		}
		if err != nil {
			lastErr = err
		}
		if err == nil && menu != nil && len(menu.Items) == 0 {
			lastErr = nil
		}
	}

	fallbackCode := strings.TrimSpace(r.siteCfg.Navigation.FallbackMenuCode)
	if r.menuSvc != nil && fallbackCode != "" {
		menu, err := r.menuByCode(ctx, fallbackCode, opts)
		if err == nil && menu != nil && len(menu.Items) > 0 {
			if strings.TrimSpace(menu.Location) == "" {
				menu.Location = location
			}
			return menu, "code", nil
		}
		if err != nil {
			lastErr = err
		}
		if err == nil && menu != nil && len(menu.Items) == 0 {
			lastErr = nil
		}
	}

	if generated := r.generatedFallbackMenu(ctx, state, location); generated != nil {
		return generated, "generated_fallback", nil
	}
	return &admin.Menu{
		Code:     fallbackCode,
		Location: location,
		Items:    []admin.MenuItem{},
	}, "empty", lastErr
}

func (r *navigationRuntime) menuByLocation(ctx context.Context, location string, opts navigationReadOptions) (*admin.Menu, error) {
	// In-memory menu service resolves locations by calling Menu while holding an
	// internal mutex; avoid that path for site runtime reads.
	if _, ok := r.menuSvc.(*admin.InMemoryMenuService); ok {
		return r.menuSvc.Menu(ctx, location, opts.Locale)
	}
	if withOpts, ok := r.menuSvc.(menuByLocationWithOptions); ok {
		return withOpts.MenuByLocationWithOptions(ctx, location, opts.Locale, opts.toSiteMenuReadOptions())
	}
	return r.menuSvc.MenuByLocation(ctx, location, opts.Locale)
}

func (r *navigationRuntime) menuByCode(ctx context.Context, code string, opts navigationReadOptions) (*admin.Menu, error) {
	if withOpts, ok := r.menuSvc.(menuByCodeWithOptions); ok {
		return withOpts.MenuByCodeWithOptions(ctx, code, opts.Locale, opts.toSiteMenuReadOptions())
	}
	return r.menuSvc.Menu(ctx, code, opts.Locale)
}
