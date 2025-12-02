package admin

import (
	"context"
	"strconv"
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

// InMemoryContentService stores CMS pages in memory for tests/demos.
type InMemoryContentService struct {
	mu    sync.Mutex
	pages map[string]CMSPage
	next  int
}

// NewInMemoryContentService constructs a content service.
func NewInMemoryContentService() *InMemoryContentService {
	return &InMemoryContentService{
		pages: make(map[string]CMSPage),
		next:  1,
	}
}

// Pages returns all pages for a locale (or all when locale empty).
func (s *InMemoryContentService) Pages(_ context.Context, locale string) ([]CMSPage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []CMSPage{}
	for _, page := range s.pages {
		if locale != "" && page.Locale != "" && page.Locale != locale {
			continue
		}
		out = append(out, cloneCMSPage(page))
	}
	return out, nil
}

// Page returns a page by id and locale.
func (s *InMemoryContentService) Page(_ context.Context, id, locale string) (*CMSPage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	page, ok := s.pages[id]
	if !ok {
		return nil, ErrNotFound
	}
	if locale != "" && page.Locale != "" && page.Locale != locale {
		return nil, ErrNotFound
	}
	cp := cloneCMSPage(page)
	return &cp, nil
}

// CreatePage inserts a page.
func (s *InMemoryContentService) CreatePage(_ context.Context, page CMSPage) (*CMSPage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if page.ID == "" {
		page.ID = strconv.Itoa(s.next)
		s.next++
	}
	s.pages[page.ID] = cloneCMSPage(page)
	cp := cloneCMSPage(page)
	return &cp, nil
}

// UpdatePage updates an existing page.
func (s *InMemoryContentService) UpdatePage(_ context.Context, page CMSPage) (*CMSPage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if page.ID == "" {
		return nil, ErrNotFound
	}
	if _, ok := s.pages[page.ID]; !ok {
		return nil, ErrNotFound
	}
	s.pages[page.ID] = cloneCMSPage(page)
	cp := cloneCMSPage(page)
	return &cp, nil
}

// DeletePage removes a page.
func (s *InMemoryContentService) DeletePage(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.pages[id]; !ok {
		return ErrNotFound
	}
	delete(s.pages, id)
	return nil
}

func cloneCMSPage(in CMSPage) CMSPage {
	out := in
	if in.Blocks != nil {
		out.Blocks = append([]string{}, in.Blocks...)
	}
	if in.SEO != nil {
		out.SEO = make(map[string]any, len(in.SEO))
		for k, v := range in.SEO {
			out.SEO[k] = v
		}
	}
	if in.Data != nil {
		out.Data = make(map[string]any, len(in.Data))
		for k, v := range in.Data {
			out.Data[k] = v
		}
	}
	return out
}
