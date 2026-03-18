package cmsboot

import (
	"context"
	"strings"
	"time"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	"github.com/goliatone/go-command/flow"
)

// CMSContainer abstracts CMS services used by admin.
type CMSContainer interface {
	WidgetService() CMSWidgetService
	MenuService() CMSMenuService
	ContentService() CMSContentService
	ContentTypeService() CMSContentTypeService
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
	// ApplyEvent applies a workflow event to the entity and returns canonical FSM response envelope.
	ApplyEvent(ctx context.Context, input WorkflowApplyEventRequest) (*WorkflowApplyEventResponse, error)
	// Snapshot returns current state plus transition availability/rejections for the entity.
	Snapshot(ctx context.Context, input WorkflowSnapshotRequest) (*WorkflowSnapshot, error)
}

// WorkflowMessage captures workflow event payload used for guards/resolvers/hooks.
type WorkflowMessage struct {
	EntityID     string         `json:"entity_id"`
	EntityType   string         `json:"entity_type"`
	CurrentState string         `json:"current_state"`
	TargetState  string         `json:"target_state"`
	Event        string         `json:"event"`
	Payload      map[string]any `json:"payload"`
}

// Type implements command.Message.
func (m WorkflowMessage) Type() string {
	entityType := strings.ToLower(strings.TrimSpace(m.EntityType))
	if entityType == "" {
		return "admin.workflow"
	}
	return "admin.workflow." + entityType
}

// WorkflowExecutionContext aliases canonical FSM execution identity context.
type WorkflowExecutionContext = flow.ExecutionContext

// WorkflowApplyEventRequest aliases canonical FSM apply envelope.
type WorkflowApplyEventRequest = flow.ApplyEventRequest[WorkflowMessage]

// WorkflowApplyEventResponse aliases canonical FSM apply response envelope.
type WorkflowApplyEventResponse = flow.ApplyEventResponse[WorkflowMessage]

// WorkflowSnapshotRequest aliases canonical FSM snapshot request envelope.
type WorkflowSnapshotRequest = flow.SnapshotRequest[WorkflowMessage]

// WorkflowSnapshot aliases canonical FSM snapshot response envelope.
type WorkflowSnapshot = flow.Snapshot

// WorkflowTransitionInfo aliases canonical FSM transition snapshot metadata.
type WorkflowTransitionInfo = flow.TransitionInfo

// WorkflowGuardRejection aliases canonical FSM guard rejection diagnostics.
type WorkflowGuardRejection = flow.GuardRejection

// WorkflowTransitionResult aliases canonical FSM transition result.
type WorkflowTransitionResult = flow.TransitionResult[WorkflowMessage]

// WorkflowTransition declares an allowed transition between two states.
type WorkflowTransition struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	From        string         `json:"from"`
	To          string         `json:"to"`
	Guard       string         `json:"guard"`
	DynamicTo   string         `json:"dynamic_to"`
	Metadata    map[string]any `json:"metadata"`
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
	ID                     string            `json:"id"`
	Title                  string            `json:"title"`
	Slug                   string            `json:"slug"`
	TemplateID             string            `json:"template_id"`
	Locale                 string            `json:"locale"`
	FamilyID               string            `json:"family_id"`
	RequestedLocale        string            `json:"requested_locale"`
	ResolvedLocale         string            `json:"resolved_locale"`
	AvailableLocales       []string          `json:"available_locales"`
	MissingRequestedLocale bool              `json:"missing_requested_locale"`
	Navigation             map[string]string `json:"navigation"`
	EffectiveMenuLocations []string          `json:"effective_menu_locations"`
	ParentID               string            `json:"parent_id"`
	Blocks                 []string          `json:"blocks"`
	EmbeddedBlocks         []map[string]any  `json:"embedded_blocks"`
	SchemaVersion          string            `json:"schema_version"`
	SEO                    map[string]any    `json:"seo"`
	Status                 string            `json:"status"`
	Data                   map[string]any    `json:"data"`
	Metadata               map[string]any    `json:"metadata"`
	PreviewURL             string            `json:"preview_url"`
}

// CMSContent represents structured content managed by the CMS.
type CMSContent struct {
	ID                     string            `json:"id"`
	Title                  string            `json:"title"`
	Slug                   string            `json:"slug"`
	Locale                 string            `json:"locale"`
	FamilyID               string            `json:"family_id"`
	RequestedLocale        string            `json:"requested_locale"`
	ResolvedLocale         string            `json:"resolved_locale"`
	AvailableLocales       []string          `json:"available_locales"`
	MissingRequestedLocale bool              `json:"missing_requested_locale"`
	Navigation             map[string]string `json:"navigation"`
	EffectiveMenuLocations []string          `json:"effective_menu_locations"`
	ContentType            string            `json:"content_type"`
	ContentTypeSlug        string            `json:"content_type_slug"`
	Status                 string            `json:"status"`
	Blocks                 []string          `json:"blocks"`
	EmbeddedBlocks         []map[string]any  `json:"embedded_blocks"`
	SchemaVersion          string            `json:"schema_version"`
	Data                   map[string]any    `json:"data"`
	Metadata               map[string]any    `json:"metadata"`
}

// CMSContentType describes a content type definition.
type CMSContentType struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Slug           string `json:"slug"`
	Description    string `json:"description"`
	DescriptionSet bool   `json:"description_set"`
	Channel        string `json:"channel"`
	// Deprecated: use Channel for content scoping.
	Environment          string         `json:"environment"`
	Schema               map[string]any `json:"schema"`
	UISchema             map[string]any `json:"ui_schema"`
	Capabilities         map[string]any `json:"capabilities"`
	ReplaceCapabilities  bool           `json:"replace_capabilities"`
	Icon                 string         `json:"icon"`
	IconSet              bool           `json:"icon_set"`
	Status               string         `json:"status"`
	AllowBreakingChanges bool           `json:"allow_breaking_changes"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
}

// CMSBlockDefinition describes a reusable block schema.
type CMSBlockDefinition struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Slug           string `json:"slug"`
	Type           string `json:"type"`
	Description    string `json:"description"`
	DescriptionSet bool   `json:"description_set"`
	Icon           string `json:"icon"`
	IconSet        bool   `json:"icon_set"`
	Category       string `json:"category"`
	CategorySet    bool   `json:"category_set"`
	Status         string `json:"status"`
	Channel        string `json:"channel"`
	// Deprecated: use Channel for content scoping.
	Environment     string         `json:"environment"`
	Schema          map[string]any `json:"schema"`
	UISchema        map[string]any `json:"ui_schema"`
	SchemaVersion   string         `json:"schema_version"`
	MigrationStatus string         `json:"migration_status"`
	Locale          string         `json:"locale"`
}

// CMSBlockDefinitionVersion captures a specific block definition schema version.
type CMSBlockDefinitionVersion struct {
	ID              string         `json:"id"`
	DefinitionID    string         `json:"definition_id"`
	SchemaVersion   string         `json:"schema_version"`
	Schema          map[string]any `json:"schema"`
	Defaults        map[string]any `json:"defaults"`
	MigrationStatus string         `json:"migration_status"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

// CMSBlock represents a block instance attached to content/pages.
type CMSBlock struct {
	ID             string         `json:"id"`
	DefinitionID   string         `json:"definition_id"`
	ContentID      string         `json:"content_id"`
	Region         string         `json:"region"`
	Locale         string         `json:"locale"`
	Status         string         `json:"status"`
	Data           map[string]any `json:"data"`
	Position       int            `json:"position"`
	BlockType      string         `json:"block_type"`
	BlockSchemaKey string         `json:"block_schema_key"`
}
