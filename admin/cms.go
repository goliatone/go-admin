package admin

import (
	"context"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
)

// CMSContainer abstracts CMS services used by admin.
type CMSContainer = cmsboot.CMSContainer

// GoCMSMenuProvider exposes a raw go-cms menu service for adapter wiring.
type GoCMSMenuProvider = cmsboot.GoCMSMenuProvider

// CMSWidgetService registers dashboard widget areas/definitions.
type CMSWidgetService = cmsboot.CMSWidgetService

// CMSMenuService manages CMS-backed menus.
type CMSMenuService = cmsboot.CMSMenuService

// CMSContentService manages pages/blocks backed by the CMS.
type CMSContentService = cmsboot.CMSContentService

// CMSContentTypeService manages content type definitions.
type CMSContentTypeService = cmsboot.CMSContentTypeService

// WidgetAreaDefinition captures CMS widget area metadata.
type WidgetAreaDefinition = cmsboot.WidgetAreaDefinition

// WidgetDefinition captures admin widget metadata.
type WidgetDefinition = cmsboot.WidgetDefinition

// WidgetInstanceFilter narrows widget instance queries.
type WidgetInstanceFilter = cmsboot.WidgetInstanceFilter

// WidgetInstance links a widget definition to a specific area/page.
type WidgetInstance = cmsboot.WidgetInstance

// Menu represents a simple CMS menu tree.
type Menu = cmsboot.Menu

// MenuItem describes a single navigation node.
type MenuItem = cmsboot.MenuItem

// CMSPage represents a page managed by the CMS.
type CMSPage = cmsboot.CMSPage

// CMSContent represents structured content managed by the CMS.
type CMSContent = cmsboot.CMSContent

// CMSContentType represents a content type definition.
type CMSContentType = cmsboot.CMSContentType

// CMSBlockDefinition describes a reusable block schema.
type CMSBlockDefinition = cmsboot.CMSBlockDefinition

// CMSBlock represents a block instance attached to content/pages.
type CMSBlock = cmsboot.CMSBlock

// CMSBlockDefinitionVersion captures a block definition schema version.
type CMSBlockDefinitionVersion = cmsboot.CMSBlockDefinitionVersion

// WorkflowEngine coordinates lifecycle transitions for domain entities.
type WorkflowEngine = cmsboot.WorkflowEngine

// TransitionInput captures the data required to run a workflow transition.
type TransitionInput = cmsboot.TransitionInput

// TransitionResult describes the outcome of a workflow transition.
type TransitionResult = cmsboot.TransitionResult

// WorkflowTransition declares an allowed transition between two states.
type WorkflowTransition = cmsboot.WorkflowTransition

// NoopCMSContainer returns in-memory services that satisfy the CMS contracts.
type NoopCMSContainer struct {
	widgets *InMemoryWidgetService
	menus   *InMemoryMenuService
	content *InMemoryContentService
}

// NewNoopCMSContainer builds a container with in-memory services.
func NewNoopCMSContainer() *NoopCMSContainer {
	return &NoopCMSContainer{
		widgets: NewInMemoryWidgetService(),
		menus:   NewInMemoryMenuService(),
		content: NewInMemoryContentService(),
	}
}

func (c *NoopCMSContainer) WidgetService() CMSWidgetService {
	return c.widgets
}

func (c *NoopCMSContainer) MenuService() CMSMenuService {
	return c.menus
}

func (c *NoopCMSContainer) ContentService() CMSContentService {
	return c.content
}

func (c *NoopCMSContainer) ContentTypeService() CMSContentTypeService {
	return c.content
}

// UseCMS overrides the default CMS container (menu/widget services).
// Call before Initialize to wire a real go-cms container.
func (a *Admin) UseCMS(container CMSContainer) *Admin {
	if container == nil {
		return a
	}
	a.cms = container
	prevWidget := a.widgetSvc
	prevMenu := a.menuSvc
	prevContent := a.contentSvc
	prevContentTypes := a.contentTypeSvc
	a.widgetSvc = container.WidgetService()
	if a.widgetSvc == nil {
		a.widgetSvc = prevWidget
	}
	menuSvc := container.MenuService()
	if provider, ok := container.(GoCMSMenuProvider); ok {
		if svc := provider.GoCMSMenuService(); svc != nil {
			menuSvc = NewGoCMSMenuAdapterFromAny(svc)
		}
	}
	if menuSvc == nil {
		menuSvc = prevMenu
	}
	a.menuSvc = menuSvc
	a.contentSvc = container.ContentService()
	if a.contentSvc == nil {
		a.contentSvc = prevContent
	}
	a.contentTypeSvc = container.ContentTypeService()
	if a.contentTypeSvc == nil {
		if svc, ok := a.contentSvc.(CMSContentTypeService); ok && svc != nil {
			a.contentTypeSvc = svc
		} else {
			a.contentTypeSvc = prevContentTypes
		}
	}
	if a.nav != nil {
		a.nav.SetMenuService(a.menuSvc)
		a.nav.UseCMS(featureEnabled(a.featureGate, FeatureCMS))
	}
	if a.dashboard != nil {
		a.dashboard.WithWidgetService(a.widgetSvc)
	}
	a.applyActivitySink(a.activity)
	return a
}

// MenuService exposes the configured CMS menu service for host seeding.
func (a *Admin) MenuService() CMSMenuService {
	return a.menuSvc
}

// ContentService exposes the configured CMS content service.
func (a *Admin) ContentService() CMSContentService {
	return a.contentSvc
}

// ContentTypeService exposes the configured CMS content type service.
func (a *Admin) ContentTypeService() CMSContentTypeService {
	return a.contentTypeSvc
}

func (a *Admin) ensureCMS(ctx context.Context) error {
	requireCMS := featureEnabled(a.featureGate, FeatureCMS) || featureEnabled(a.featureGate, FeatureDashboard)
	if !requireCMS {
		return nil
	}
	builder := a.config.CMS.ContainerBuilder
	if builder == nil {
		builder = func(ctx context.Context, cfg Config) (CMSContainer, error) {
			return BuildGoCMSContainer(ctx, cfg)
		}
	}
	resolved, err := cmsboot.Ensure(ctx, cmsboot.EnsureOptions{
		Container:          a.cms,
		WidgetService:      a.widgetSvc,
		MenuService:        a.menuSvc,
		ContentService:     a.contentSvc,
		ContentTypeService: a.contentTypeSvc,
		RequireCMS:         requireCMS,
		FallbackContainer:  func() cmsboot.CMSContainer { return NewNoopCMSContainer() },
		BuildContainer: func(ctx context.Context) (cmsboot.CMSContainer, error) {
			return builder(ctx, a.config)
		},
	})
	if err != nil {
		return err
	}
	if resolved.Container != nil {
		a.UseCMS(resolved.Container)
	} else {
		if resolved.WidgetService != nil {
			a.widgetSvc = resolved.WidgetService
		}
		if resolved.MenuService != nil {
			a.menuSvc = resolved.MenuService
			if a.nav != nil {
				a.nav.SetMenuService(a.menuSvc)
				a.nav.UseCMS(featureEnabled(a.featureGate, FeatureCMS))
			}
		}
		if resolved.ContentService != nil {
			a.contentSvc = resolved.ContentService
		}
		if resolved.ContentTypeService != nil {
			a.contentTypeSvc = resolved.ContentTypeService
		} else if a.contentTypeSvc == nil {
			if svc, ok := a.contentSvc.(CMSContentTypeService); ok && svc != nil {
				a.contentTypeSvc = svc
			}
		}
	}
	if featureEnabled(a.featureGate, FeatureDashboard) && a.widgetSvc == nil {
		return serviceNotConfiguredDomainError("dashboard cms widget service", map[string]any{"component": "cms"})
	}
	return nil
}

func (a *Admin) bootstrapAdminMenu(ctx context.Context) error {
	return cmsboot.BootstrapMenu(ctx, a.menuSvc, a.navMenuCode)
}
