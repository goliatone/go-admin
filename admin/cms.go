package admin

import "context"

// CMSContainer abstracts CMS services used by admin.
type CMSContainer interface {
	WidgetService() CMSWidgetService
	MenuService() CMSMenuService
}

// CMSWidgetService registers dashboard widget areas/definitions.
type CMSWidgetService interface {
	RegisterAreaDefinition(ctx context.Context, def WidgetAreaDefinition) error
	RegisterDefinition(ctx context.Context, def WidgetDefinition) error
	Areas() []WidgetAreaDefinition
	Definitions() []WidgetDefinition
}

// CMSMenuService manages CMS-backed menus.
type CMSMenuService interface {
	CreateMenu(ctx context.Context, code string) (*Menu, error)
	AddMenuItem(ctx context.Context, menuCode string, item MenuItem) error
	Menu(ctx context.Context, code, locale string) (*Menu, error)
}

// WidgetAreaDefinition captures CMS widget area metadata.
type WidgetAreaDefinition struct {
	Code  string
	Name  string
	Scope string
}

// WidgetDefinition captures admin widget metadata.
type WidgetDefinition struct {
	Code   string
	Name   string
	Schema map[string]any
}

// Menu represents a simple CMS menu tree.
type Menu struct {
	Code  string
	Items []MenuItem
}

// MenuItem describes a single navigation node.
type MenuItem struct {
	Label       string
	Target      map[string]any
	Icon        string
	Position    int
	Children    []MenuItem
	Locale      string
	Badge       map[string]any
	Permissions []string
	Menu        string
	Classes     []string
	Styles      map[string]string
}

// NoopCMSContainer returns in-memory services that satisfy the CMS contracts.
type NoopCMSContainer struct {
	widgets *InMemoryWidgetService
	menus   *InMemoryMenuService
}

// NewNoopCMSContainer builds a container with in-memory services.
func NewNoopCMSContainer() *NoopCMSContainer {
	return &NoopCMSContainer{
		widgets: NewInMemoryWidgetService(),
		menus:   NewInMemoryMenuService(),
	}
}

func (c *NoopCMSContainer) WidgetService() CMSWidgetService {
	return c.widgets
}

func (c *NoopCMSContainer) MenuService() CMSMenuService {
	return c.menus
}
