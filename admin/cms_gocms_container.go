package admin

import (
	"context"

	"github.com/goliatone/go-admin/admin/cms/gocmsutil"
	cms "github.com/goliatone/go-cms"
)

// BuildGoCMSContainer constructs a CMSContainer from go-cms configuration or module values.
func BuildGoCMSContainer(ctx context.Context, cfg Config) (CMSContainer, error) {
	if cfg.CMS.Container != nil {
		return cfg.CMS.Container, nil
	}
	if cfg.CMS.ContainerBuilder != nil {
		return cfg.CMS.ContainerBuilder(ctx, cfg)
	}
	raw := cfg.CMS.GoCMSConfig
	if raw == nil {
		raw = cfg.CMSConfig
	}
	return buildGoCMSContainerFromRaw(raw)
}

func buildGoCMSContainerFromRaw(raw any) (CMSContainer, error) {
	switch v := raw.(type) {
	case CMSContainer:
		return v, nil
	case *cms.Module:
		if v == nil {
			return nil, nil
		}
		return newStrictGoCMSContainerAdapter(v)
	case cms.Module:
		return newStrictGoCMSContainerAdapter(&v)
	case cms.Config:
		module, err := cms.New(v)
		if err != nil {
			return nil, err
		}
		return newStrictGoCMSContainerAdapter(module)
	case *cms.Config:
		if v == nil {
			return nil, nil
		}
		module, err := cms.New(*v)
		if err != nil {
			return nil, err
		}
		return newStrictGoCMSContainerAdapter(module)
	default:
		if raw != nil {
			if adapted, err := newStrictGoCMSContainerAdapter(raw); err != nil {
				return nil, err
			} else if adapted != nil {
				return adapted, nil
			}
		}
	}
	return nil, nil
}

func newStrictGoCMSContainerAdapter(container any) (*GoCMSContainerAdapter, error) {
	adapted := NewGoCMSContainerAdapter(container)
	if adapted == nil {
		return nil, nil
	}
	if err := validateGoCMSAdminServiceContracts(adapted); err != nil {
		return nil, err
	}
	return adapted, nil
}

func validateGoCMSAdminServiceContracts(container *GoCMSContainerAdapter) error {
	if container == nil || container.contentSvc == nil {
		return nil
	}
	content, ok := container.contentSvc.(*GoCMSContentAdapter)
	if !ok || content == nil {
		return nil
	}
	missing := make([]string, 0, 4)
	if content.adminRead == nil {
		missing = append(missing, "AdminContentRead")
	}
	if content.adminWrite == nil {
		missing = append(missing, "AdminContentWrite")
	}
	if content.adminBlocks == nil {
		missing = append(missing, "AdminBlockRead")
	}
	if content.adminBlockW == nil {
		missing = append(missing, "AdminBlockWrite")
	}
	if len(missing) == 0 {
		return nil
	}
	return serviceNotConfiguredDomainError("go-cms admin services", map[string]any{
		"missing": missing,
	})
}

// GoCMSContainerAdapter maps go-cms containers/modules into the admin CMSContainer contract.
type GoCMSContainerAdapter struct {
	menuSvc        CMSMenuService
	widgetSvc      CMSWidgetService
	contentSvc     CMSContentService
	contentTypeSvc CMSContentTypeService
	localeResolver gocmsutil.LocaleResolver
}

// NewGoCMSContainerAdapter inspects a go-cms module or container and wraps available services.
func NewGoCMSContainerAdapter(container any) *GoCMSContainerAdapter {
	localeResolver := resolveGoCMSLocaleResolver(container)
	menuSvc := resolveGoCMSMenuService(container)
	widgetSvc := resolveGoCMSWidgetService(container)
	contentSvc := resolveGoCMSContentService(container)
	contentTypeSvc := resolveGoCMSContentTypeService(container)
	if menuSvc == nil && widgetSvc == nil && contentSvc == nil && contentTypeSvc == nil && localeResolver == nil {
		return nil
	}
	return &GoCMSContainerAdapter{
		menuSvc:        menuSvc,
		widgetSvc:      widgetSvc,
		contentSvc:     contentSvc,
		contentTypeSvc: contentTypeSvc,
		localeResolver: localeResolver,
	}
}

func (c *GoCMSContainerAdapter) WidgetService() CMSWidgetService   { return c.widgetSvc }
func (c *GoCMSContainerAdapter) MenuService() CMSMenuService       { return c.menuSvc }
func (c *GoCMSContainerAdapter) ContentService() CMSContentService { return c.contentSvc }
func (c *GoCMSContainerAdapter) ContentTypeService() CMSContentTypeService {
	return c.contentTypeSvc
}

func (c *GoCMSContainerAdapter) ActiveLocales(ctx context.Context) ([]string, error) {
	if c == nil {
		return nil, nil
	}
	return gocmsutil.ResolveActiveLocaleCodes(ctx, c.localeResolver)
}

func resolveGoCMSMenuService(container any) CMSMenuService {
	if container == nil {
		return nil
	}
	if provider, ok := container.(interface{ MenuService() cms.MenuService }); ok {
		if adapted := NewGoCMSMenuAdapterFromAny(provider.MenuService()); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ Menus() cms.MenuService }); ok {
		if adapted := NewGoCMSMenuAdapterFromAny(provider.Menus()); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ MenuService() any }); ok {
		if adapted := NewGoCMSMenuAdapterFromAny(provider.MenuService()); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ Menus() any }); ok {
		if adapted := NewGoCMSMenuAdapterFromAny(provider.Menus()); adapted != nil {
			return adapted
		}
	}
	return resolveGoCMSMenuServiceFromContainer(container)
}

func resolveGoCMSContentService(container any) CMSContentService {
	if container == nil {
		return nil
	}
	localeResolver := resolveGoCMSLocaleResolver(container)
	adminRead := resolveGoCMSAdminContentReadService(container)
	adminWrite := resolveGoCMSAdminContentWriteService(container)
	adminBlocks := resolveGoCMSAdminBlockReadService(container)
	adminBlockWrite := resolveGoCMSAdminBlockWriteService(container)
	if svc, ok := container.(CMSContentService); ok && svc != nil {
		return svc
	}
	if adapted := resolveGoCMSContentAdapter(container, localeResolver, adminRead, adminWrite, adminBlocks, adminBlockWrite); adapted != nil {
		return adapted
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		inner := provider.Container()
		if adapted := resolveGoCMSContentService(inner); adapted != nil {
			return adapted
		}
	}
	return nil
}

func resolveGoCMSContentAdapter(container any, localeResolver gocmsutil.LocaleResolver, adminRead cms.AdminContentReadService, adminWrite cms.AdminContentWriteService, adminBlocks cms.AdminBlockReadService, adminBlockWrite cms.AdminBlockWriteService) CMSContentService {
	contentTypeSvc := resolveGoCMSContentTypeService(container)
	switch provider := container.(type) {
	case interface{ ContentService() cms.ContentService }:
		return newGoCMSContentAdapter(provider.ContentService(), resolveGoCMSBlockService(container), contentTypeSvc, localeResolver, adminRead, adminWrite, adminBlocks, adminBlockWrite)
	case interface{ Content() cms.ContentService }:
		return newGoCMSContentAdapter(provider.Content(), resolveGoCMSBlockService(container), contentTypeSvc, localeResolver, adminRead, adminWrite, adminBlocks, adminBlockWrite)
	case interface{ ContentService() any }:
		return newGoCMSContentAdapter(provider.ContentService(), resolveGoCMSBlockService(container), contentTypeSvc, localeResolver, adminRead, adminWrite, adminBlocks, adminBlockWrite)
	case interface{ Content() any }:
		return newGoCMSContentAdapter(provider.Content(), resolveGoCMSBlockService(container), contentTypeSvc, localeResolver, adminRead, adminWrite, adminBlocks, adminBlockWrite)
	default:
		return nil
	}
}

func resolveGoCMSBlockService(container any) any {
	switch provider := container.(type) {
	case interface{ BlockService() cms.BlockService }:
		return provider.BlockService()
	case interface{ Blocks() cms.BlockService }:
		return provider.Blocks()
	case interface{ Blocks() any }:
		return provider.Blocks()
	case interface{ BlockService() any }:
		return provider.BlockService()
	default:
		return nil
	}
}

func resolveGoCMSAdminContentReadService(container any) cms.AdminContentReadService {
	if container == nil {
		return nil
	}
	if provider, ok := container.(interface {
		AdminContentRead() cms.AdminContentReadService
	}); ok {
		if svc := provider.AdminContentRead(); svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		return resolveGoCMSAdminContentReadService(provider.Container())
	}
	return nil
}

func resolveGoCMSAdminContentWriteService(container any) cms.AdminContentWriteService {
	if container == nil {
		return nil
	}
	if provider, ok := container.(interface {
		AdminContentWrite() cms.AdminContentWriteService
	}); ok {
		if svc := provider.AdminContentWrite(); svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		return resolveGoCMSAdminContentWriteService(provider.Container())
	}
	return nil
}

func resolveGoCMSAdminBlockReadService(container any) cms.AdminBlockReadService {
	if container == nil {
		return nil
	}
	if provider, ok := container.(interface {
		AdminBlockRead() cms.AdminBlockReadService
	}); ok {
		if svc := provider.AdminBlockRead(); svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		return resolveGoCMSAdminBlockReadService(provider.Container())
	}
	return nil
}

func resolveGoCMSAdminBlockWriteService(container any) cms.AdminBlockWriteService {
	if container == nil {
		return nil
	}
	if provider, ok := container.(interface {
		AdminBlockWrite() cms.AdminBlockWriteService
	}); ok {
		if svc := provider.AdminBlockWrite(); svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		return resolveGoCMSAdminBlockWriteService(provider.Container())
	}
	return nil
}

func resolveGoCMSMenuServiceFromContainer(container any) CMSMenuService {
	inner, ok := goCMSInnerContainer(container)
	if !ok {
		return nil
	}
	if innerProvider, ok := inner.(interface{ MenuService() cms.MenuService }); ok {
		if adapted := NewGoCMSMenuAdapterFromAny(innerProvider.MenuService()); adapted != nil {
			return adapted
		}
	}
	if innerProvider, ok := inner.(interface{ MenuService() any }); ok {
		if adapted := NewGoCMSMenuAdapterFromAny(innerProvider.MenuService()); adapted != nil {
			return adapted
		}
	}
	return nil
}

func goCMSInnerContainer(container any) (any, bool) {
	provider, ok := container.(interface{ Container() any })
	if !ok {
		return nil, false
	}
	inner := provider.Container()
	if inner == nil {
		return nil, false
	}
	return inner, true
}

func resolveGoCMSContentTypeService(container any) CMSContentTypeService {
	if container == nil {
		return nil
	}
	if adapted := adaptGoCMSContentTypeService(container); adapted != nil {
		return adapted
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		if adapted := resolveGoCMSContentTypeService(provider.Container()); adapted != nil {
			return adapted
		}
	}
	for _, candidate := range goCMSContentTypeFallbackSources(container) {
		if adapted := NewGoCMSContentTypeAdapter(candidate); adapted != nil {
			return adapted
		}
	}
	return nil
}

func adaptGoCMSContentTypeService(container any) CMSContentTypeService {
	if svc, ok := container.(CMSContentTypeService); ok && svc != nil {
		return svc
	}
	for _, candidate := range goCMSContentTypeSources(container) {
		if adapted := NewGoCMSContentTypeAdapter(candidate); adapted != nil {
			return adapted
		}
	}
	return nil
}

func goCMSContentTypeSources(container any) []any {
	switch provider := container.(type) {
	case interface{ ContentTypes() cms.ContentTypeService }:
		return []any{provider.ContentTypes()}
	case interface{ ContentTypeService() cms.ContentTypeService }:
		return []any{provider.ContentTypeService()}
	case interface{ ContentTypeService() any }:
		return []any{provider.ContentTypeService()}
	case interface{ ContentTypes() any }:
		return []any{provider.ContentTypes()}
	default:
		return nil
	}
}

func goCMSContentTypeFallbackSources(container any) []any {
	switch provider := container.(type) {
	case interface{ ContentService() any }:
		return []any{provider.ContentService()}
	case interface{ Content() any }:
		return []any{provider.Content()}
	default:
		return nil
	}
}

func resolveGoCMSWidgetService(container any) CMSWidgetService {
	if container == nil {
		return nil
	}
	localeResolver := resolveGoCMSLocaleResolver(container)
	if adapted := newGoCMSWidgetAdapter(container, localeResolver); adapted != nil {
		return adapted
	}
	if provider, ok := container.(interface{ WidgetService() cms.WidgetService }); ok {
		if adapted := newGoCMSWidgetAdapter(provider.WidgetService(), localeResolver); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ Widgets() cms.WidgetService }); ok {
		if adapted := newGoCMSWidgetAdapter(provider.Widgets(), localeResolver); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ WidgetService() any }); ok {
		if adapted := newGoCMSWidgetAdapter(provider.WidgetService(), localeResolver); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ Widgets() any }); ok {
		if adapted := newGoCMSWidgetAdapter(provider.Widgets(), localeResolver); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		inner := provider.Container()
		if adapted := resolveGoCMSWidgetService(inner); adapted != nil {
			return adapted
		}
	}
	return nil
}

func resolveGoCMSLocaleResolver(container any) gocmsutil.LocaleResolver {
	if container == nil {
		return nil
	}
	if provider, ok := container.(interface{ Locales() cms.LocaleService }); ok {
		if svc := provider.Locales(); svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ Locales() any }); ok {
		if svc, ok := provider.Locales().(gocmsutil.LocaleResolver); ok && svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ LocaleService() cms.LocaleService }); ok {
		if svc := provider.LocaleService(); svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ LocaleService() any }); ok {
		if svc, ok := provider.LocaleService().(gocmsutil.LocaleResolver); ok && svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		return resolveGoCMSLocaleResolver(provider.Container())
	}
	return nil
}
