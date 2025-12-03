package admin

import "context"

// CMSContainer abstracts CMS services used by admin.
type CMSContainer interface {
	WidgetService() CMSWidgetService
	MenuService() CMSMenuService
	ContentService() CMSContentService
}

// GoCMSMenuProvider exposes a raw go-cms menu service for adapter wiring.
type GoCMSMenuProvider interface {
	GoCMSMenuService() any
}

// CMSWidgetService registers dashboard widget areas/definitions.
type CMSWidgetService interface {
	RegisterAreaDefinition(ctx context.Context, def WidgetAreaDefinition) error
	RegisterDefinition(ctx context.Context, def WidgetDefinition) error
	DeleteDefinition(ctx context.Context, code string) error
	Areas() []WidgetAreaDefinition
	Definitions() []WidgetDefinition
	SaveInstance(ctx context.Context, instance WidgetInstance) (*WidgetInstance, error)
	DeleteInstance(ctx context.Context, id string) error
	ListInstances(ctx context.Context, filter WidgetInstanceFilter) ([]WidgetInstance, error)
}

// CMSMenuService manages CMS-backed menus.
type CMSMenuService interface {
	CreateMenu(ctx context.Context, code string) (*Menu, error)
	AddMenuItem(ctx context.Context, menuCode string, item MenuItem) error
	UpdateMenuItem(ctx context.Context, menuCode string, item MenuItem) error
	DeleteMenuItem(ctx context.Context, menuCode, id string) error
	ReorderMenu(ctx context.Context, menuCode string, orderedIDs []string) error
	Menu(ctx context.Context, code, locale string) (*Menu, error)
}

// CMSContentService manages pages/blocks backed by the CMS.
type CMSContentService interface {
	Pages(ctx context.Context, locale string) ([]CMSPage, error)
	Page(ctx context.Context, id, locale string) (*CMSPage, error)
	CreatePage(ctx context.Context, page CMSPage) (*CMSPage, error)
	UpdatePage(ctx context.Context, page CMSPage) (*CMSPage, error)
	DeletePage(ctx context.Context, id string) error
	Contents(ctx context.Context, locale string) ([]CMSContent, error)
	Content(ctx context.Context, id, locale string) (*CMSContent, error)
	CreateContent(ctx context.Context, content CMSContent) (*CMSContent, error)
	UpdateContent(ctx context.Context, content CMSContent) (*CMSContent, error)
	DeleteContent(ctx context.Context, id string) error
	BlockDefinitions(ctx context.Context) ([]CMSBlockDefinition, error)
	CreateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error)
	UpdateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error)
	DeleteBlockDefinition(ctx context.Context, id string) error
	BlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error)
	SaveBlock(ctx context.Context, block CMSBlock) (*CMSBlock, error)
	DeleteBlock(ctx context.Context, id string) error
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

// WidgetInstanceFilter narrows widget instance queries.
type WidgetInstanceFilter struct {
	Area   string
	PageID string
	Locale string
}

// WidgetInstance links a widget definition to a specific area/page.
type WidgetInstance struct {
	ID             string
	DefinitionCode string
	Area           string
	PageID         string
	Locale         string
	Config         map[string]any
	Position       int
}

// Menu represents a simple CMS menu tree.
type Menu struct {
	Code  string
	Items []MenuItem
}

// MenuItem describes a single navigation node.
type MenuItem struct {
	ID          string
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
	ParentID    string
}

// CMSPage represents a page managed by the CMS.
type CMSPage struct {
	ID         string
	Title      string
	Slug       string
	Locale     string
	ParentID   string
	Blocks     []string
	SEO        map[string]any
	Status     string
	Data       map[string]any
	PreviewURL string
}

// CMSContent represents structured content managed by the CMS.
type CMSContent struct {
	ID          string
	Title       string
	Slug        string
	Locale      string
	ContentType string
	Status      string
	Blocks      []string
	Data        map[string]any
}

// CMSBlockDefinition describes a reusable block schema.
type CMSBlockDefinition struct {
	ID     string
	Name   string
	Type   string
	Schema map[string]any
	Locale string
}

// CMSBlock represents a block instance attached to content/pages.
type CMSBlock struct {
	ID             string
	DefinitionID   string
	ContentID      string
	Region         string
	Locale         string
	Status         string
	Data           map[string]any
	Position       int
	BlockType      string
	BlockSchemaKey string
}

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
