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
	menuSvc          CMSMenuService
	widgetSvc        CMSWidgetService
	contentSvc       CMSContentService
	contentTypeSvc   CMSContentTypeService
	adminPageReadSvc AdminPageReadService
}

// NewGoCMSContainerAdapter inspects a go-cms module or container and wraps available services.
func NewGoCMSContainerAdapter(container any) *GoCMSContainerAdapter {
	menuSvc := resolveGoCMSMenuService(container)
	widgetSvc := resolveGoCMSWidgetService(container)
	contentSvc := resolveGoCMSContentService(container)
	contentTypeSvc := resolveGoCMSContentTypeService(container)
	pageReadSvc := resolveGoCMSAdminPageReadService(container)
	if menuSvc == nil && widgetSvc == nil && contentSvc == nil && contentTypeSvc == nil && pageReadSvc == nil {
		return nil
	}
	return &GoCMSContainerAdapter{
		menuSvc:          menuSvc,
		widgetSvc:        widgetSvc,
		contentSvc:       contentSvc,
		contentTypeSvc:   contentTypeSvc,
		adminPageReadSvc: pageReadSvc,
	}
}

func (c *GoCMSContainerAdapter) WidgetService() CMSWidgetService   { return c.widgetSvc }
func (c *GoCMSContainerAdapter) MenuService() CMSMenuService       { return c.menuSvc }
func (c *GoCMSContainerAdapter) ContentService() CMSContentService { return c.contentSvc }
func (c *GoCMSContainerAdapter) ContentTypeService() CMSContentTypeService {
	return c.contentTypeSvc
}
func (c *GoCMSContainerAdapter) AdminPageReadService() AdminPageReadService {
	return c.adminPageReadSvc
}

func resolveGoCMSMenuService(container any) CMSMenuService {
	if container == nil {
		return nil
	}
	if provider, ok := container.(GoCMSMenuProvider); ok {
		if svc := provider.GoCMSMenuService(); svc != nil {
			if adapted := NewGoCMSMenuAdapterFromAny(svc); adapted != nil {
				return adapted
			}
		}
	}

	// Some go-cms modules expose services on the internal container; prefer using the public
	// cms.MenuService facade when available (Menus/MenuService), which supports both navigation
	// resolution and path-based mutations.
	if inner := callMethod(container, "Container"); inner != nil {
		if adapted := NewGoCMSMenuAdapterFromAny(callMethod(inner, "MenuService")); adapted != nil {
			return adapted
		}
	}

	if adapted := NewGoCMSMenuAdapterFromAny(callMethod(container, "MenuService")); adapted != nil {
		return adapted
	}
	if adapted := NewGoCMSMenuAdapterFromAny(callMethod(container, "Menus")); adapted != nil {
		return adapted
	}
	return nil
}

func resolveGoCMSWidgetService(container any) CMSWidgetService {
	if container == nil {
		return nil
	}
	if adapted := NewGoCMSWidgetAdapter(callMethod(container, "WidgetService")); adapted != nil {
		return adapted
	}
	if adapted := NewGoCMSWidgetAdapter(callMethod(container, "Widgets")); adapted != nil {
		return adapted
	}
	return nil
}

func resolveGoCMSContentService(container any) CMSContentService {
	if container == nil {
		return nil
	}
	if svc, ok := container.(CMSContentService); ok && svc != nil {
		return svc
	}
	if svc, ok := callMethod(container, "ContentService").(CMSContentService); ok && svc != nil {
		return svc
	}
	if svc, ok := callMethod(container, "Content").(CMSContentService); ok && svc != nil {
		return svc
	}
	contentSvc := callMethod(container, "ContentService")
	if contentSvc == nil {
		contentSvc = callMethod(container, "Content")
	}
	pageSvc := callMethod(container, "Pages")
	if pageSvc == nil {
		pageSvc = callMethod(container, "PageService")
	}
	blockSvc := callMethod(container, "Blocks")
	if blockSvc == nil {
		blockSvc = callMethod(container, "BlockService")
	}
	if adapted := NewGoCMSContentAdapter(contentSvc, pageSvc, blockSvc, resolveGoCMSContentTypeService(container)); adapted != nil {
		return adapted
	}
	return nil
}

func resolveGoCMSAdminPageReadService(container any) AdminPageReadService {
	if container == nil {
		return nil
	}
	if svc, ok := container.(AdminPageReadService); ok && svc != nil {
		return svc
	}
	if provider, ok := container.(interface{ AdminPageReadService() AdminPageReadService }); ok {
		if svc := provider.AdminPageReadService(); svc != nil {
			return svc
		}
	}
	for _, name := range []string{
		"AdminPageReadService",
		"AdminPages",
		"AdminPageRead",
		"AdminPagesRead",
		"PagesAdmin",
		"PageAdminReadService",
		"PageAdminRead",
		"PageAdmin",
	} {
		if svc := callMethod(container, name); svc != nil {
			if readSvc, ok := svc.(AdminPageReadService); ok && readSvc != nil {
				return readSvc
			}
		}
	}
	if inner := callMethod(container, "Container"); inner != nil {
		if svc := resolveGoCMSAdminPageReadService(inner); svc != nil {
			return svc
		}
	}
	if svc := callMethod(container, "Pages"); svc != nil {
		if readSvc, ok := svc.(AdminPageReadService); ok && readSvc != nil {
			return readSvc
		}
	}
	if svc := callMethod(container, "PageService"); svc != nil {
		if readSvc, ok := svc.(AdminPageReadService); ok && readSvc != nil {
			return readSvc
		}
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
	if adapted := NewGoCMSContentTypeAdapter(callMethod(container, "ContentTypeService")); adapted != nil {
		return adapted
	}
	if inner := callMethod(container, "Container"); inner != nil {
		if adapted := NewGoCMSContentTypeAdapter(callMethod(inner, "ContentTypeService")); adapted != nil {
			return adapted
		}
	}
	if adapted := NewGoCMSContentTypeAdapter(callMethod(container, "ContentService")); adapted != nil {
		return adapted
	}
	if adapted := NewGoCMSContentTypeAdapter(callMethod(container, "Content")); adapted != nil {
		return adapted
	}
	return nil
}

func callMethod(target any, name string) any {
	if target == nil {
		return nil
	}
	method := reflect.ValueOf(target).MethodByName(name)
	if !method.IsValid() {
		return nil
	}
	results := method.Call(nil)
	if len(results) == 0 {
		return nil
	}
	return results[0].Interface()
}
