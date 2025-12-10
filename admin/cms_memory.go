package admin

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
)

func recordCMSActivity(ctx context.Context, sink ActivitySink, action, object string, meta map[string]any) {
	if sink == nil {
		return
	}
	_ = sink.Record(ctx, ActivityEntry{
		Actor:    actorFromContext(ctx),
		Action:   action,
		Object:   object,
		Metadata: meta,
	})
}

// InMemoryWidgetService stores widget areas/definitions/instances in memory.
type InMemoryWidgetService struct {
	mu          sync.Mutex
	areas       map[string]WidgetAreaDefinition
	definitions map[string]WidgetDefinition
	instances   map[string]WidgetInstance
	next        int
	activity    ActivitySink
}

// NewInMemoryWidgetService constructs a memory-backed widget service.
func NewInMemoryWidgetService() *InMemoryWidgetService {
	return &InMemoryWidgetService{
		areas:       make(map[string]WidgetAreaDefinition),
		definitions: make(map[string]WidgetDefinition),
		instances:   make(map[string]WidgetInstance),
		next:        1,
	}
}

// WithActivitySink wires activity emission for widget events.
func (s *InMemoryWidgetService) WithActivitySink(sink ActivitySink) {
	if s != nil && sink != nil {
		s.activity = sink
	}
}

// RegisterAreaDefinition saves/overwrites a widget area.
func (s *InMemoryWidgetService) RegisterAreaDefinition(ctx context.Context, def WidgetAreaDefinition) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.areas[def.Code] = def
	recordCMSActivity(ctx, s.activity, "cms.widget_area.register", "widget_area:"+def.Code, map[string]any{
		"name":  def.Name,
		"scope": def.Scope,
	})
	return nil
}

// RegisterDefinition saves/overwrites a widget definition.
func (s *InMemoryWidgetService) RegisterDefinition(ctx context.Context, def WidgetDefinition) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.definitions[def.Code] = def
	recordCMSActivity(ctx, s.activity, "cms.widget_definition.register", "widget_def:"+def.Code, map[string]any{
		"name": def.Name,
	})
	return nil
}

// DeleteDefinition removes a widget definition.
func (s *InMemoryWidgetService) DeleteDefinition(ctx context.Context, code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.definitions[code]; !ok {
		return ErrNotFound
	}
	delete(s.definitions, code)
	recordCMSActivity(ctx, s.activity, "cms.widget_definition.delete", "widget_def:"+code, nil)
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

// SaveInstance stores or updates a widget instance.
func (s *InMemoryWidgetService) SaveInstance(ctx context.Context, instance WidgetInstance) (*WidgetInstance, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if instance.ID == "" {
		instance.ID = strconv.Itoa(s.next)
		s.next++
	}
	if instance.Position == 0 {
		instance.Position = len(s.instances) + 1
	}
	instance.Config = cloneAnyMap(instance.Config)
	s.instances[instance.ID] = instance
	cp := cloneWidgetInstance(instance)
	recordCMSActivity(ctx, s.activity, "cms.widget_instance.save", "widget_instance:"+cp.ID, map[string]any{
		"area":       cp.Area,
		"definition": cp.DefinitionCode,
		"page_id":    cp.PageID,
		"locale":     cp.Locale,
		"position":   cp.Position,
	})
	return &cp, nil
}

// DeleteInstance removes a widget instance.
func (s *InMemoryWidgetService) DeleteInstance(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.instances[id]; !ok {
		return ErrNotFound
	}
	delete(s.instances, id)
	recordCMSActivity(ctx, s.activity, "cms.widget_instance.delete", "widget_instance:"+id, nil)
	return nil
}

// ListInstances returns widget instances filtered by area/page/locale.
func (s *InMemoryWidgetService) ListInstances(_ context.Context, filter WidgetInstanceFilter) ([]WidgetInstance, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []WidgetInstance{}
	for _, inst := range s.instances {
		if filter.Area != "" && inst.Area != filter.Area {
			continue
		}
		if filter.PageID != "" && inst.PageID != filter.PageID {
			continue
		}
		if filter.Locale != "" && inst.Locale != "" && inst.Locale != filter.Locale {
			continue
		}
		out = append(out, cloneWidgetInstance(inst))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Position == out[j].Position {
			return out[i].ID < out[j].ID
		}
		return out[i].Position < out[j].Position
	})
	return out, nil
}

func cloneWidgetInstance(in WidgetInstance) WidgetInstance {
	out := in
	out.Config = cloneAnyMap(in.Config)
	return out
}

type menuState struct {
	items          map[string]MenuItem
	next           int
	parentCounters map[string]int
	insertSeq      int
	slug           string
	id             string
}

// InMemoryMenuService stores menus in memory.
type InMemoryMenuService struct {
	mu        sync.Mutex
	menus     map[string]*menuState
	slugIndex map[string]string
	activity  ActivitySink
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// NewInMemoryMenuService constructs a memory-backed menu service.
func NewInMemoryMenuService() *InMemoryMenuService {
	return &InMemoryMenuService{
		menus:     make(map[string]*menuState),
		slugIndex: make(map[string]string),
	}
}

// WithActivitySink wires activity emission for menu operations.
func (s *InMemoryMenuService) WithActivitySink(sink ActivitySink) {
	if s != nil && sink != nil {
		s.activity = sink
	}
}

func (s *InMemoryMenuService) canonicalMenuSlug(code string) string {
	slug := NormalizeMenuSlug(code)
	if slug == "" {
		slug = strings.TrimSpace(code)
	}
	return slug
}

func (s *InMemoryMenuService) resolveMenuState(code string) (*menuState, string) {
	slug := s.canonicalMenuSlug(code)
	if slug == "" {
		return nil, ""
	}
	if key, ok := s.slugIndex[slug]; ok {
		if state, exists := s.menus[key]; exists {
			return state, key
		}
	}
	if state, ok := s.menus[slug]; ok {
		return state, slug
	}
	return nil, slug
}

// CreateMenu makes a menu entry if it does not exist.
func (s *InMemoryMenuService) CreateMenu(ctx context.Context, code string) (*Menu, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	slug := s.canonicalMenuSlug(code)
	if slug == "" {
		return nil, fmt.Errorf("menu code required")
	}
	if state, ok := s.menus[slug]; ok {
		recordCMSActivity(ctx, s.activity, "cms.menu.create", "menu:"+slug, map[string]any{
			"id":   state.id,
			"slug": state.slug,
		})
		return &Menu{Code: state.slug, Slug: state.slug, ID: state.id}, nil
	}
	state := &menuState{
		items:          map[string]MenuItem{},
		next:           1,
		parentCounters: map[string]int{},
		insertSeq:      0,
		slug:           slug,
		id:             MenuUUIDFromSlug(slug),
	}
	s.menus[slug] = state
	s.slugIndex[slug] = slug
	recordCMSActivity(ctx, s.activity, "cms.menu.create", "menu:"+slug, map[string]any{
		"id":   state.id,
		"slug": state.slug,
	})
	return &Menu{Code: slug, Slug: slug, ID: state.id}, nil
}

// ResetMenu removes all items for the given menu code (debug/reset helper).
func (s *InMemoryMenuService) ResetMenu(code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	slug := s.canonicalMenuSlug(code)
	delete(s.menus, slug)
	delete(s.slugIndex, slug)
}

// ResetMenuContext implements the MenuResetterWithContext interface used by quickstart helpers.
func (s *InMemoryMenuService) ResetMenuContext(ctx context.Context, code string) error {
	_ = ctx
	s.ResetMenu(code)
	return nil
}

// AddMenuItem appends an item to a menu identified by code.
func (s *InMemoryMenuService) AddMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	state, slug := s.resolveMenuState(menuCode)
	if slug == "" {
		return fmt.Errorf("menu code required")
	}
	if state == nil {
		state = &menuState{
			items:          map[string]MenuItem{},
			next:           1,
			parentCounters: map[string]int{},
			insertSeq:      0,
			slug:           slug,
			id:             MenuUUIDFromSlug(slug),
		}
		s.menus[slug] = state
		s.slugIndex[slug] = slug
	}
	if existing, ok := state.items[item.ID]; ok && strings.TrimSpace(item.ID) != "" {
		// Idempotent add-if-missing: skip when ID already present.
		_ = existing
		return nil
	}
	if item.ID == "" {
		item.ID = fmt.Sprintf("%s-%d", menuCode, state.next)
		state.next++
	}
	if strings.TrimSpace(item.Code) == "" {
		item.Code = strings.TrimSpace(item.ID)
	}
	if strings.TrimSpace(item.ParentCode) == "" {
		item.ParentCode = strings.TrimSpace(item.ParentID)
	}
	if item.Position == 0 {
		item.Position = state.parentCounters[item.ParentID] + 1
	}
	state.parentCounters[item.ParentID] = maxInt(state.parentCounters[item.ParentID], item.Position)
	if strings.TrimSpace(item.Type) == "" {
		item.Type = MenuItemTypeItem
	}
	state.insertSeq++
	item.order = state.insertSeq
	item.Menu = state.slug
	state.items[item.ID] = item
	recordCMSActivity(ctx, s.activity, "cms.menu_item.create", "menu_item:"+item.ID, map[string]any{
		"menu":   state.slug,
		"label":  item.Label,
		"locale": item.Locale,
	})
	return nil
}

// UpdateMenuItem updates an existing menu item.
func (s *InMemoryMenuService) UpdateMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	state, _ := s.resolveMenuState(menuCode)
	if state == nil {
		return ErrNotFound
	}
	existing, ok := state.items[item.ID]
	if !ok || item.ID == "" {
		return ErrNotFound
	}
	if item.Position == 0 {
		item.Position = existing.Position
	}
	if strings.TrimSpace(item.Code) == "" {
		item.Code = existing.Code
	}
	if strings.TrimSpace(item.ParentCode) == "" {
		if strings.TrimSpace(item.ParentID) != "" {
			item.ParentCode = strings.TrimSpace(item.ParentID)
		} else {
			item.ParentCode = existing.ParentCode
		}
	}
	if strings.TrimSpace(item.Type) == "" {
		item.Type = MenuItemTypeItem
	}
	item.order = existing.order
	item.Menu = state.slug
	state.items[item.ID] = item
	recordCMSActivity(ctx, s.activity, "cms.menu_item.update", "menu_item:"+item.ID, map[string]any{
		"menu":   state.slug,
		"label":  item.Label,
		"locale": item.Locale,
	})
	return nil
}

// DeleteMenuItem deletes an item and its children.
func (s *InMemoryMenuService) DeleteMenuItem(ctx context.Context, menuCode, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	state, _ := s.resolveMenuState(menuCode)
	if state == nil {
		return ErrNotFound
	}
	if _, ok := state.items[id]; !ok {
		return ErrNotFound
	}
	s.deleteChildren(state, id)
	delete(state.items, id)
	recordCMSActivity(ctx, s.activity, "cms.menu_item.delete", "menu_item:"+id, map[string]any{
		"menu": state.slug,
	})
	return nil
}

func (s *InMemoryMenuService) deleteChildren(state *menuState, id string) {
	for childID, item := range state.items {
		if item.ParentID == id {
			s.deleteChildren(state, childID)
			delete(state.items, childID)
		}
	}
}

// ReorderMenu applies a positional ordering to menu items.
func (s *InMemoryMenuService) ReorderMenu(ctx context.Context, menuCode string, orderedIDs []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	state, _ := s.resolveMenuState(menuCode)
	if state == nil {
		return ErrNotFound
	}
	for idx, id := range orderedIDs {
		item, ok := state.items[id]
		if !ok {
			continue
		}
		item.Position = idx + 1
		state.items[id] = item
	}
	recordCMSActivity(ctx, s.activity, "cms.menu.reorder", "menu:"+state.slug, map[string]any{
		"ordered_ids": append([]string{}, orderedIDs...),
	})
	return nil
}

// Menu returns a menu for a given locale. Items with locale match or empty locale are returned.
func (s *InMemoryMenuService) Menu(_ context.Context, code, locale string) (*Menu, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	state, slug := s.resolveMenuState(code)
	if state == nil {
		if slug == "" {
			return &Menu{}, nil
		}
		return &Menu{Code: slug, Slug: slug, ID: MenuUUIDFromSlug(slug)}, nil
	}
	items := []MenuItem{}
	for _, item := range state.items {
		if locale != "" && item.Locale != "" && item.Locale != locale {
			continue
		}
		item.Children = nil
		items = append(items, item)
	}
	tree := buildMenuTree(items)
	sortMenuChildren(&tree)
	return &Menu{Code: state.slug, Slug: state.slug, ID: state.id, Items: tree}, nil
}

func sortMenuChildren(children *[]MenuItem) {
	sort.Slice(*children, func(i, j int) bool {
		if (*children)[i].Position == (*children)[j].Position {
			if (*children)[i].order == (*children)[j].order {
				return (*children)[i].ID < (*children)[j].ID
			}
			return (*children)[i].order < (*children)[j].order
		}
		return (*children)[i].Position < (*children)[j].Position
	})
	for idx := range *children {
		sortMenuChildren(&(*children)[idx].Children)
	}
}

// InMemoryContentService stores CMS pages/content/blocks in memory for tests/demos.
type InMemoryContentService struct {
	mu         sync.Mutex
	pages      map[string]CMSPage
	contents   map[string]CMSContent
	blocks     map[string]CMSBlock
	blockDefs  map[string]CMSBlockDefinition
	nextPage   int
	nextCont   int
	nextBlock  int
	nextBlockD int
	activity   ActivitySink
}

// NewInMemoryContentService constructs a content service.
func NewInMemoryContentService() *InMemoryContentService {
	return &InMemoryContentService{
		pages:      make(map[string]CMSPage),
		contents:   make(map[string]CMSContent),
		blocks:     make(map[string]CMSBlock),
		blockDefs:  make(map[string]CMSBlockDefinition),
		nextPage:   1,
		nextCont:   1,
		nextBlock:  1,
		nextBlockD: 1,
	}
}

// WithActivitySink wires activity emission for CMS content changes.
func (s *InMemoryContentService) WithActivitySink(sink ActivitySink) {
	if s != nil && sink != nil {
		s.activity = sink
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
func (s *InMemoryContentService) CreatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if page.ID == "" {
		page.ID = strconv.Itoa(s.nextPage)
		s.nextPage++
	}
	if page.PreviewURL == "" {
		page.PreviewURL = page.Slug
	}
	s.pages[page.ID] = cloneCMSPage(page)
	cp := cloneCMSPage(page)
	recordCMSActivity(ctx, s.activity, "cms.page.create", "page:"+cp.ID, map[string]any{
		"title":     cp.Title,
		"slug":      cp.Slug,
		"locale":    cp.Locale,
		"parent_id": cp.ParentID,
	})
	return &cp, nil
}

// UpdatePage updates an existing page.
func (s *InMemoryContentService) UpdatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if page.ID == "" {
		return nil, ErrNotFound
	}
	if existing, ok := s.pages[page.ID]; ok {
		if page.PreviewURL == "" {
			page.PreviewURL = existing.PreviewURL
		}
	} else {
		return nil, ErrNotFound
	}
	s.pages[page.ID] = cloneCMSPage(page)
	cp := cloneCMSPage(page)
	recordCMSActivity(ctx, s.activity, "cms.page.update", "page:"+cp.ID, map[string]any{
		"title":     cp.Title,
		"slug":      cp.Slug,
		"locale":    cp.Locale,
		"parent_id": cp.ParentID,
	})
	return &cp, nil
}

// DeletePage removes a page.
func (s *InMemoryContentService) DeletePage(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.pages[id]; !ok {
		return ErrNotFound
	}
	delete(s.pages, id)
	recordCMSActivity(ctx, s.activity, "cms.page.delete", "page:"+id, nil)
	return nil
}

// Contents returns structured content filtered by locale.
func (s *InMemoryContentService) Contents(_ context.Context, locale string) ([]CMSContent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []CMSContent{}
	for _, content := range s.contents {
		if locale != "" && content.Locale != "" && content.Locale != locale {
			continue
		}
		out = append(out, cloneCMSContent(content))
	}
	return out, nil
}

// Content returns a content entry by id and locale.
func (s *InMemoryContentService) Content(_ context.Context, id, locale string) (*CMSContent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	content, ok := s.contents[id]
	if !ok {
		return nil, ErrNotFound
	}
	if locale != "" && content.Locale != "" && content.Locale != locale {
		return nil, ErrNotFound
	}
	cp := cloneCMSContent(content)
	return &cp, nil
}

// CreateContent inserts a content entry.
func (s *InMemoryContentService) CreateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if content.ID == "" {
		content.ID = strconv.Itoa(s.nextCont)
		s.nextCont++
	}
	if content.Status == "" {
		content.Status = "draft"
	}
	s.contents[content.ID] = cloneCMSContent(content)
	cp := cloneCMSContent(content)
	recordCMSActivity(ctx, s.activity, "cms.content.create", "content:"+cp.ID, map[string]any{
		"title":        cp.Title,
		"slug":         cp.Slug,
		"locale":       cp.Locale,
		"content_type": cp.ContentType,
		"status":       cp.Status,
	})
	return &cp, nil
}

// UpdateContent updates an existing content entry.
func (s *InMemoryContentService) UpdateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if content.ID == "" {
		return nil, ErrNotFound
	}
	if _, ok := s.contents[content.ID]; !ok {
		return nil, ErrNotFound
	}
	s.contents[content.ID] = cloneCMSContent(content)
	cp := cloneCMSContent(content)
	recordCMSActivity(ctx, s.activity, "cms.content.update", "content:"+cp.ID, map[string]any{
		"title":        cp.Title,
		"slug":         cp.Slug,
		"locale":       cp.Locale,
		"content_type": cp.ContentType,
		"status":       cp.Status,
	})
	return &cp, nil
}

// DeleteContent removes a content entry.
func (s *InMemoryContentService) DeleteContent(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.contents[id]; !ok {
		return ErrNotFound
	}
	delete(s.contents, id)
	recordCMSActivity(ctx, s.activity, "cms.content.delete", "content:"+id, nil)
	return nil
}

// BlockDefinitions returns registered block definitions.
func (s *InMemoryContentService) BlockDefinitions(_ context.Context) ([]CMSBlockDefinition, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []CMSBlockDefinition{}
	for _, def := range s.blockDefs {
		out = append(out, cloneCMSBlockDefinition(def))
	}
	return out, nil
}

// CreateBlockDefinition adds a block definition.
func (s *InMemoryContentService) CreateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if def.ID == "" {
		def.ID = fmt.Sprintf("block-%d", s.nextBlockD)
		s.nextBlockD++
	}
	s.blockDefs[def.ID] = cloneCMSBlockDefinition(def)
	cp := cloneCMSBlockDefinition(def)
	recordCMSActivity(ctx, s.activity, "cms.block_definition.create", "block_def:"+cp.ID, map[string]any{
		"name":   cp.Name,
		"type":   cp.Type,
		"locale": cp.Locale,
	})
	return &cp, nil
}

// UpdateBlockDefinition updates an existing block definition.
func (s *InMemoryContentService) UpdateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if def.ID == "" {
		return nil, ErrNotFound
	}
	if _, ok := s.blockDefs[def.ID]; !ok {
		return nil, ErrNotFound
	}
	s.blockDefs[def.ID] = cloneCMSBlockDefinition(def)
	cp := cloneCMSBlockDefinition(def)
	recordCMSActivity(ctx, s.activity, "cms.block_definition.update", "block_def:"+cp.ID, map[string]any{
		"name":   cp.Name,
		"type":   cp.Type,
		"locale": cp.Locale,
	})
	return &cp, nil
}

// DeleteBlockDefinition removes a block definition.
func (s *InMemoryContentService) DeleteBlockDefinition(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.blockDefs[id]; !ok {
		return ErrNotFound
	}
	delete(s.blockDefs, id)
	recordCMSActivity(ctx, s.activity, "cms.block_definition.delete", "block_def:"+id, nil)
	return nil
}

// BlocksForContent returns blocks attached to a content/page.
func (s *InMemoryContentService) BlocksForContent(_ context.Context, contentID, locale string) ([]CMSBlock, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []CMSBlock{}
	for _, block := range s.blocks {
		if block.ContentID != contentID {
			continue
		}
		if locale != "" && block.Locale != "" && block.Locale != locale {
			continue
		}
		out = append(out, cloneCMSBlock(block))
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Position == out[j].Position {
			return out[i].ID < out[j].ID
		}
		return out[i].Position < out[j].Position
	})
	return out, nil
}

// SaveBlock creates or updates a block.
func (s *InMemoryContentService) SaveBlock(ctx context.Context, block CMSBlock) (*CMSBlock, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if block.ID == "" {
		block.ID = fmt.Sprintf("blk-%d", s.nextBlock)
		s.nextBlock++
	}
	if block.Position == 0 {
		block.Position = len(s.blocks) + 1
	}
	s.blocks[block.ID] = cloneCMSBlock(block)
	cp := cloneCMSBlock(block)
	recordCMSActivity(ctx, s.activity, "cms.block.save", "block:"+cp.ID, map[string]any{
		"content_id": cp.ContentID,
		"locale":     cp.Locale,
		"region":     cp.Region,
		"position":   cp.Position,
	})
	return &cp, nil
}

// DeleteBlock removes a block.
func (s *InMemoryContentService) DeleteBlock(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.blocks[id]; !ok {
		return ErrNotFound
	}
	delete(s.blocks, id)
	recordCMSActivity(ctx, s.activity, "cms.block.delete", "block:"+id, nil)
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

func cloneCMSContent(in CMSContent) CMSContent {
	out := in
	if in.Blocks != nil {
		out.Blocks = append([]string{}, in.Blocks...)
	}
	if in.Data != nil {
		out.Data = make(map[string]any, len(in.Data))
		for k, v := range in.Data {
			out.Data[k] = v
		}
	}
	return out
}

func cloneCMSBlockDefinition(in CMSBlockDefinition) CMSBlockDefinition {
	out := in
	if in.Schema != nil {
		out.Schema = cloneAnyMap(in.Schema)
	}
	return out
}

func cloneCMSBlock(in CMSBlock) CMSBlock {
	out := in
	if in.Data != nil {
		out.Data = cloneAnyMap(in.Data)
	}
	return out
}
