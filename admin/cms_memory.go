package admin

import (
	"context"
	"sync"
)

// InMemoryWidgetService stores widget areas/definitions in memory.
type InMemoryWidgetService struct {
	mu          sync.Mutex
	areas       map[string]WidgetAreaDefinition
	definitions map[string]WidgetDefinition
}

// NewInMemoryWidgetService constructs a memory-backed widget service.
func NewInMemoryWidgetService() *InMemoryWidgetService {
	return &InMemoryWidgetService{
		areas:       make(map[string]WidgetAreaDefinition),
		definitions: make(map[string]WidgetDefinition),
	}
}

// RegisterAreaDefinition saves/overwrites a widget area.
func (s *InMemoryWidgetService) RegisterAreaDefinition(_ context.Context, def WidgetAreaDefinition) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.areas[def.Code] = def
	return nil
}

// RegisterDefinition saves/overwrites a widget definition.
func (s *InMemoryWidgetService) RegisterDefinition(_ context.Context, def WidgetDefinition) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.definitions[def.Code] = def
	return nil
}

// Areas returns all registered areas.
func (s *InMemoryWidgetService) Areas() []WidgetAreaDefinition {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]WidgetAreaDefinition, 0, len(s.areas))
	for _, def := range s.areas {
		out = append(out, def)
	}
	return out
}

// Definitions returns all registered widget definitions.
func (s *InMemoryWidgetService) Definitions() []WidgetDefinition {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]WidgetDefinition, 0, len(s.definitions))
	for _, def := range s.definitions {
		out = append(out, def)
	}
	return out
}

// InMemoryMenuService stores menus in memory.
type InMemoryMenuService struct {
	mu    sync.Mutex
	menus map[string]*Menu
}

// NewInMemoryMenuService constructs a memory-backed menu service.
func NewInMemoryMenuService() *InMemoryMenuService {
	return &InMemoryMenuService{
		menus: make(map[string]*Menu),
	}
}

// CreateMenu makes a menu entry if it does not exist.
func (s *InMemoryMenuService) CreateMenu(_ context.Context, code string) (*Menu, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if menu, ok := s.menus[code]; ok {
		return menu, nil
	}
	menu := &Menu{Code: code}
	s.menus[code] = menu
	return menu, nil
}

// AddMenuItem appends an item to a menu identified by code.
func (s *InMemoryMenuService) AddMenuItem(_ context.Context, menuCode string, item MenuItem) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	menu, ok := s.menus[menuCode]
	if !ok {
		menu = &Menu{Code: menuCode}
		s.menus[menuCode] = menu
	}
	menu.Items = append(menu.Items, item)
	return nil
}

// Menu returns a menu for a given locale. Items with locale match or empty locale are returned.
func (s *InMemoryMenuService) Menu(_ context.Context, code, locale string) (*Menu, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	menu, ok := s.menus[code]
	if !ok {
		return &Menu{Code: code}, nil
	}
	filtered := &Menu{Code: menu.Code}
	for _, item := range menu.Items {
		if item.Locale == "" || item.Locale == locale {
			filtered.Items = append(filtered.Items, item)
		}
	}
	return filtered, nil
}
