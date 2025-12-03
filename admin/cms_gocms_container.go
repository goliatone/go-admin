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
	menuSvc    CMSMenuService
	widgetSvc  CMSWidgetService
	contentSvc CMSContentService
}

// NewGoCMSContainerAdapter inspects a go-cms module or container and wraps available services.
func NewGoCMSContainerAdapter(container any) *GoCMSContainerAdapter {
	menuSvc := resolveGoCMSMenuService(container)
	widgetSvc := resolveGoCMSWidgetService(container)
	contentSvc := resolveGoCMSContentService(container)
	if menuSvc == nil && widgetSvc == nil && contentSvc == nil {
		return nil
	}
	return &GoCMSContainerAdapter{menuSvc: menuSvc, widgetSvc: widgetSvc, contentSvc: contentSvc}
}

func (c *GoCMSContainerAdapter) WidgetService() CMSWidgetService   { return c.widgetSvc }
func (c *GoCMSContainerAdapter) MenuService() CMSMenuService       { return c.menuSvc }
func (c *GoCMSContainerAdapter) ContentService() CMSContentService { return c.contentSvc }

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
	if svc, ok := callMethod(container, "ContentService").(CMSContentService); ok && svc != nil {
		return svc
	}
	if svc, ok := callMethod(container, "Content").(CMSContentService); ok && svc != nil {
		return svc
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
