package admin

import (
	"context"
	"reflect"

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
	switch v := raw.(type) {
	case CMSContainer:
		return v, nil
	case *cms.Module:
		if v == nil {
			return nil, nil
		}
		return NewGoCMSContainerAdapter(v), nil
	case cms.Module:
		return NewGoCMSContainerAdapter(&v), nil
	case cms.Config:
		module, err := cms.New(v)
		if err != nil {
			return nil, err
		}
		return NewGoCMSContainerAdapter(module), nil
	case *cms.Config:
		if v == nil {
			return nil, nil
		}
		module, err := cms.New(*v)
		if err != nil {
			return nil, err
		}
		return NewGoCMSContainerAdapter(module), nil
	default:
		if raw != nil {
			if adapted := NewGoCMSContainerAdapter(raw); adapted != nil {
				return adapted, nil
			}
		}
	}
	return nil, nil
}

// GoCMSContainerAdapter maps go-cms containers/modules into the admin CMSContainer contract.
type GoCMSContainerAdapter struct {
	menuSvc        CMSMenuService
	widgetSvc      CMSWidgetService
	contentSvc     CMSContentService
	contentTypeSvc CMSContentTypeService
}

// NewGoCMSContainerAdapter inspects a go-cms module or container and wraps available services.
func NewGoCMSContainerAdapter(container any) *GoCMSContainerAdapter {
	menuSvc := resolveGoCMSMenuService(container)
	widgetSvc := resolveGoCMSWidgetService(container)
	contentSvc := resolveGoCMSContentService(container)
	contentTypeSvc := resolveGoCMSContentTypeService(container)
	if menuSvc == nil && widgetSvc == nil && contentSvc == nil && contentTypeSvc == nil {
		return nil
	}
	return &GoCMSContainerAdapter{
		menuSvc:        menuSvc,
		widgetSvc:      widgetSvc,
		contentSvc:     contentSvc,
		contentTypeSvc: contentTypeSvc,
	}
}

func (c *GoCMSContainerAdapter) WidgetService() CMSWidgetService   { return c.widgetSvc }
func (c *GoCMSContainerAdapter) MenuService() CMSMenuService       { return c.menuSvc }
func (c *GoCMSContainerAdapter) ContentService() CMSContentService { return c.contentSvc }
func (c *GoCMSContainerAdapter) ContentTypeService() CMSContentTypeService {
	return c.contentTypeSvc
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
	if provider, ok := container.(interface{ Container() any }); ok {
		inner := provider.Container()
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
	}
	return nil
}

func resolveGoCMSContentService(container any) CMSContentService {
	if container == nil {
		return nil
	}
	localeResolver := resolveGoCMSLocaleResolver(container)
	translationSvc := resolveGoCMSContentTranslationService(container)
	if svc, ok := container.(CMSContentService); ok && svc != nil {
		return svc
	}
	if provider, ok := container.(interface{ ContentService() cms.ContentService }); ok {
		contentSvc := provider.ContentService()
		var blockSvc any
		if blockProvider, ok := container.(interface{ BlockService() cms.BlockService }); ok {
			blockSvc = blockProvider.BlockService()
		}
		if blockSvc == nil {
			if blockProvider, ok := container.(interface{ Blocks() cms.BlockService }); ok {
				blockSvc = blockProvider.Blocks()
			}
		}
		if adapted := newGoCMSContentAdapter(contentSvc, translationSvc, blockSvc, resolveGoCMSContentTypeService(container), localeResolver); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ Content() cms.ContentService }); ok {
		contentSvc := provider.Content()
		var blockSvc any
		if blockProvider, ok := container.(interface{ Blocks() cms.BlockService }); ok {
			blockSvc = blockProvider.Blocks()
		}
		if blockSvc == nil {
			if blockProvider, ok := container.(interface{ BlockService() cms.BlockService }); ok {
				blockSvc = blockProvider.BlockService()
			}
		}
		if adapted := newGoCMSContentAdapter(contentSvc, translationSvc, blockSvc, resolveGoCMSContentTypeService(container), localeResolver); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ ContentService() any }); ok {
		contentSvc := provider.ContentService()
		var blockSvc any
		if blockProvider, ok := container.(interface{ Blocks() any }); ok {
			blockSvc = blockProvider.Blocks()
		}
		if blockSvc == nil {
			if blockProvider, ok := container.(interface{ BlockService() any }); ok {
				blockSvc = blockProvider.BlockService()
			}
		}
		if adapted := newGoCMSContentAdapter(contentSvc, translationSvc, blockSvc, resolveGoCMSContentTypeService(container), localeResolver); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ Content() any }); ok {
		contentSvc := provider.Content()
		var blockSvc any
		if blockProvider, ok := container.(interface{ Blocks() any }); ok {
			blockSvc = blockProvider.Blocks()
		}
		if blockSvc == nil {
			if blockProvider, ok := container.(interface{ BlockService() any }); ok {
				blockSvc = blockProvider.BlockService()
			}
		}
		if adapted := newGoCMSContentAdapter(contentSvc, translationSvc, blockSvc, resolveGoCMSContentTypeService(container), localeResolver); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		inner := provider.Container()
		if adapted := resolveGoCMSContentService(inner); adapted != nil {
			return adapted
		}
	}
	return nil
}

func resolveGoCMSContentTranslationService(container any) any {
	if container == nil {
		return nil
	}
	method := reflect.ValueOf(container).MethodByName("ContentTranslations")
	if method.IsValid() {
		signature := method.Type()
		if signature.NumIn() == 0 && signature.NumOut() >= 1 {
			results := method.Call(nil)
			if len(results) > 0 {
				result := results[0]
				if result.IsValid() {
					if result.Kind() == reflect.Pointer || result.Kind() == reflect.Interface {
						if !result.IsNil() {
							return result.Interface()
						}
					} else {
						return result.Interface()
					}
				}
			}
		}
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		return resolveGoCMSContentTranslationService(provider.Container())
	}
	return nil
}

func resolveGoCMSContentTypeService(container any) CMSContentTypeService {
	if container == nil {
		return nil
	}
	if svc, ok := container.(CMSContentTypeService); ok && svc != nil {
		return svc
	}
	if provider, ok := container.(interface{ ContentTypes() cms.ContentTypeService }); ok {
		if adapted := NewGoCMSContentTypeAdapter(provider.ContentTypes()); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ ContentTypeService() cms.ContentTypeService }); ok {
		if adapted := NewGoCMSContentTypeAdapter(provider.ContentTypeService()); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ ContentTypeService() any }); ok {
		if adapted := NewGoCMSContentTypeAdapter(provider.ContentTypeService()); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ ContentTypes() any }); ok {
		if adapted := NewGoCMSContentTypeAdapter(provider.ContentTypes()); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		inner := provider.Container()
		if adapted := resolveGoCMSContentTypeService(inner); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ ContentService() any }); ok {
		if adapted := NewGoCMSContentTypeAdapter(provider.ContentService()); adapted != nil {
			return adapted
		}
	}
	if provider, ok := container.(interface{ Content() any }); ok {
		if adapted := NewGoCMSContentTypeAdapter(provider.Content()); adapted != nil {
			return adapted
		}
	}
	return nil
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

func resolveGoCMSLocaleResolver(container any) goCMSLocaleResolver {
	if container == nil {
		return nil
	}
	if provider, ok := container.(interface{ Locales() cms.LocaleService }); ok {
		if svc := provider.Locales(); svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ Locales() any }); ok {
		if svc, ok := provider.Locales().(goCMSLocaleResolver); ok && svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ LocaleService() cms.LocaleService }); ok {
		if svc := provider.LocaleService(); svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ LocaleService() any }); ok {
		if svc, ok := provider.LocaleService().(goCMSLocaleResolver); ok && svc != nil {
			return svc
		}
	}
	if provider, ok := container.(interface{ Container() any }); ok {
		return resolveGoCMSLocaleResolver(provider.Container())
	}
	return nil
}
