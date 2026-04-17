package dashboard

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
)

// WidgetAreaDefinition captures CMS widget area metadata.
type WidgetAreaDefinition struct {
	Code  string `json:"code"`
	Name  string `json:"name"`
	Scope string `json:"scope"`
}

// WidgetDefinition captures admin widget metadata.
type WidgetDefinition struct {
	Code   string         `json:"code"`
	Name   string         `json:"name"`
	Schema map[string]any `json:"schema"`
}

type WidgetDefinitionSyncStatus string

const (
	WidgetDefinitionSyncStatusCreated   WidgetDefinitionSyncStatus = "created"
	WidgetDefinitionSyncStatusUpdated   WidgetDefinitionSyncStatus = "updated"
	WidgetDefinitionSyncStatusUnchanged WidgetDefinitionSyncStatus = "unchanged"
)

type WidgetDefinitionSyncResult struct {
	Definition WidgetDefinition           `json:"definition"`
	Status     WidgetDefinitionSyncStatus `json:"status"`
}

// WidgetInstanceFilter narrows widget instance queries.
type WidgetInstanceFilter struct {
	Area   string `json:"area"`
	PageID string `json:"page_id"`
	Locale string `json:"locale"`
}

// WidgetInstance links a widget definition to a specific area/page.
type WidgetInstance struct {
	ID             string         `json:"id"`
	DefinitionCode string         `json:"definition_code"`
	Area           string         `json:"area"`
	PageID         string         `json:"page_id"`
	Locale         string         `json:"locale"`
	Config         map[string]any `json:"config"`
	Position       int            `json:"position"`
	Span           int            `json:"span"`
	Hidden         bool           `json:"hidden"`
}

// WidgetService registers dashboard widget areas/definitions and instances.
type WidgetService interface {
	RegisterAreaDefinition(ctx context.Context, def WidgetAreaDefinition) error
	RegisterDefinition(ctx context.Context, def WidgetDefinition) error
	SyncDefinition(ctx context.Context, def WidgetDefinition) (*WidgetDefinitionSyncResult, error)
	DeleteDefinition(ctx context.Context, code string) error
	Areas() []WidgetAreaDefinition
	Definitions() []WidgetDefinition
	SaveInstance(ctx context.Context, instance WidgetInstance) (*WidgetInstance, error)
	DeleteInstance(ctx context.Context, id string) error
	ListInstances(ctx context.Context, filter WidgetInstanceFilter) ([]WidgetInstance, error)
}

// DashboardWidgetInstance represents a widget placed in an area.
type DashboardWidgetInstance struct {
	ID             string         `json:"id,omitempty"`
	DefinitionCode string         `json:"definition"`
	AreaCode       string         `json:"area"`
	Config         map[string]any `json:"config,omitempty"`
	Position       int            `json:"position,omitempty"`
	Span           int            `json:"span,omitempty"`
	Hidden         bool           `json:"hidden,omitempty"`
	Locale         string         `json:"locale,omitempty"`
}

// DashboardPreferences stores per-user layouts.
type DashboardPreferences interface {
	ForUser(userID string) []DashboardWidgetInstance
	Save(userID string, layout []DashboardWidgetInstance) error
}

// DashboardPreferencesWithContext allows contextual access to preferences (for activity/locale-aware stores).
type DashboardPreferencesWithContext interface {
	DashboardPreferences
	ForUserWithContext(ctx context.Context, userID string) []DashboardWidgetInstance
	SaveWithContext(ctx context.Context, userID string, layout []DashboardWidgetInstance) error
}

// InMemoryDashboardPreferences stores layouts in memory.
type InMemoryDashboardPreferences struct {
	byUser map[string][]DashboardWidgetInstance
}

// NewInMemoryDashboardPreferences constructs a preference store.
func NewInMemoryDashboardPreferences() *InMemoryDashboardPreferences {
	return &InMemoryDashboardPreferences{byUser: map[string][]DashboardWidgetInstance{}}
}

// ForUser returns the saved layout for a user.
func (p *InMemoryDashboardPreferences) ForUser(userID string) []DashboardWidgetInstance {
	if p == nil {
		return nil
	}
	if layout, ok := p.byUser[userID]; ok {
		return CloneDashboardInstances(layout)
	}
	return nil
}

// Save stores a user layout.
func (p *InMemoryDashboardPreferences) Save(userID string, layout []DashboardWidgetInstance) error {
	if p == nil {
		return nil
	}
	p.byUser[userID] = CloneDashboardInstances(layout)
	return nil
}

// CloneDashboardInstances copies widget instances.
func CloneDashboardInstances(in []DashboardWidgetInstance) []DashboardWidgetInstance {
	out := make([]DashboardWidgetInstance, 0, len(in))
	for _, inst := range in {
		out = append(out, DashboardWidgetInstance{
			ID:             inst.ID,
			DefinitionCode: inst.DefinitionCode,
			AreaCode:       inst.AreaCode,
			Config:         primitives.CloneAnyMap(inst.Config),
			Position:       inst.Position,
			Span:           inst.Span,
			Hidden:         inst.Hidden,
			Locale:         inst.Locale,
		})
	}
	return out
}
