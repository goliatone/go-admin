package cmsboot

import (
	"context"
	"time"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
)

// CMSContainer abstracts CMS services used by admin.
type CMSContainer interface {
	WidgetService() CMSWidgetService
	MenuService() CMSMenuService
	ContentService() CMSContentService
	ContentTypeService() CMSContentTypeService
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
	MenuByLocation(ctx context.Context, location, locale string) (*Menu, error)
}

// CMSContentTypeService manages content type definitions.
type CMSContentTypeService interface {
	ContentTypes(ctx context.Context) ([]CMSContentType, error)
	ContentType(ctx context.Context, id string) (*CMSContentType, error)
	ContentTypeBySlug(ctx context.Context, slug string) (*CMSContentType, error)
	CreateContentType(ctx context.Context, contentType CMSContentType) (*CMSContentType, error)
	UpdateContentType(ctx context.Context, contentType CMSContentType) (*CMSContentType, error)
	DeleteContentType(ctx context.Context, id string) error
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
	BlockDefinitionVersions(ctx context.Context, id string) ([]CMSBlockDefinitionVersion, error)
	BlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error)
	SaveBlock(ctx context.Context, block CMSBlock) (*CMSBlock, error)
	DeleteBlock(ctx context.Context, id string) error
}

// WorkflowEngine coordinates lifecycle transitions for domain entities.
type WorkflowEngine interface {
	// Transition applies the named transition (or explicit state change) to the entity.
	Transition(ctx context.Context, input TransitionInput) (*TransitionResult, error)
	// AvailableTransitions lists the possible transitions from the supplied state.
	AvailableTransitions(ctx context.Context, entityType, state string) ([]WorkflowTransition, error)
}

// TransitionInput captures the data required to run a workflow transition.
type TransitionInput struct {
	EntityID     string
	EntityType   string
	CurrentState string
	Transition   string
	TargetState  string
	ActorID      string
	Metadata     map[string]any
}

// TransitionResult describes the outcome of a workflow transition.
type TransitionResult struct {
	EntityID    string
	EntityType  string
	Transition  string
	FromState   string
	ToState     string
	CompletedAt time.Time
	ActorID     string
	Metadata    map[string]any
}

// WorkflowTransition declares an allowed transition between two states.
type WorkflowTransition struct {
	Name        string
	Description string
	From        string
	To          string
	Guard       string
}

// WidgetAreaDefinition captures CMS widget area metadata.
type WidgetAreaDefinition = dashinternal.WidgetAreaDefinition

// WidgetDefinition captures admin widget metadata.
type WidgetDefinition = dashinternal.WidgetDefinition

// WidgetInstanceFilter narrows widget instance queries.
type WidgetInstanceFilter = dashinternal.WidgetInstanceFilter

// WidgetInstance links a widget definition to a specific area/page.
type WidgetInstance = dashinternal.WidgetInstance

// Menu represents a simple CMS menu tree.
type Menu = navinternal.Menu

// MenuItem describes a single navigation node.
type MenuItem = navinternal.MenuItem

// CMSPage represents a page managed by the CMS.
type CMSPage struct {
	ID                 string
	Title              string
	Slug               string
	TemplateID         string
	Locale             string
	TranslationGroupID string
	ParentID           string
	Blocks             []string
	EmbeddedBlocks     []map[string]any
	SchemaVersion      string
	SEO                map[string]any
	Status             string
	Data               map[string]any
	PreviewURL         string
}

// CMSContent represents structured content managed by the CMS.
type CMSContent struct {
	ID                 string
	Title              string
	Slug               string
	Locale             string
	TranslationGroupID string
	ContentType        string
	ContentTypeSlug    string
	Status             string
	Blocks             []string
	EmbeddedBlocks     []map[string]any
	SchemaVersion      string
	Data               map[string]any
}

// CMSContentType describes a content type definition.
type CMSContentType struct {
	ID           string
	Name         string
	Slug         string
	Description  string
	Schema       map[string]any
	UISchema     map[string]any
	Capabilities map[string]any
	Icon         string
	Status       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// CMSBlockDefinition describes a reusable block schema.
type CMSBlockDefinition struct {
	ID              string
	Name            string
	Slug            string
	Type            string
	Description     string
	Icon            string
	Category        string
	Status          string
	Schema          map[string]any
	UISchema        map[string]any
	SchemaVersion   string
	MigrationStatus string
	Locale          string
}

// CMSBlockDefinitionVersion captures a specific block definition schema version.
type CMSBlockDefinitionVersion struct {
	ID              string
	DefinitionID    string
	SchemaVersion   string
	Schema          map[string]any
	Defaults        map[string]any
	MigrationStatus string
	CreatedAt       time.Time
	UpdatedAt       time.Time
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
