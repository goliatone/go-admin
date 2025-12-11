package admin

import cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"

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

// CMSBlockDefinition describes a reusable block schema.
type CMSBlockDefinition = cmsboot.CMSBlockDefinition

// CMSBlock represents a block instance attached to content/pages.
type CMSBlock = cmsboot.CMSBlock

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
