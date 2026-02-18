package admin

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	goerrors "github.com/goliatone/go-errors"
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
	s.areas[def.Code] = def
	activity := s.activity
	meta := map[string]any{
		"name":  def.Name,
		"scope": def.Scope,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.widget_area.register", "widget_area:"+def.Code, meta)
	return nil
}

// RegisterDefinition saves/overwrites a widget definition.
func (s *InMemoryWidgetService) RegisterDefinition(ctx context.Context, def WidgetDefinition) error {
	s.mu.Lock()
	s.definitions[def.Code] = def
	activity := s.activity
	meta := map[string]any{
		"name": def.Name,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.widget_definition.register", "widget_def:"+def.Code, meta)
	return nil
}

// DeleteDefinition removes a widget definition.
func (s *InMemoryWidgetService) DeleteDefinition(ctx context.Context, code string) error {
	s.mu.Lock()
	if _, ok := s.definitions[code]; !ok {
		s.mu.Unlock()
		return ErrNotFound
	}
	delete(s.definitions, code)
	activity := s.activity
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.widget_definition.delete", "widget_def:"+code, nil)
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
	activity := s.activity
	meta := map[string]any{
		"area":       cp.Area,
		"definition": cp.DefinitionCode,
		"page_id":    cp.PageID,
		"locale":     cp.Locale,
		"position":   cp.Position,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.widget_instance.save", "widget_instance:"+cp.ID, meta)
	return &cp, nil
}

// DeleteInstance removes a widget instance.
func (s *InMemoryWidgetService) DeleteInstance(ctx context.Context, id string) error {
	s.mu.Lock()
	if _, ok := s.instances[id]; !ok {
		s.mu.Unlock()
		return ErrNotFound
	}
	delete(s.instances, id)
	activity := s.activity
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.widget_instance.delete", "widget_instance:"+id, nil)
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

// HasInstanceForDefinition reports whether a widget instance exists for a definition.
func (s *InMemoryWidgetService) HasInstanceForDefinition(_ context.Context, definitionCode string, filter WidgetInstanceFilter) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	definitionCode = strings.TrimSpace(definitionCode)
	if definitionCode == "" {
		return false, nil
	}
	for _, inst := range s.instances {
		if inst.DefinitionCode != definitionCode {
			continue
		}
		if filter.Area != "" && inst.Area != filter.Area {
			continue
		}
		if filter.PageID != "" && inst.PageID != filter.PageID {
			continue
		}
		if filter.Locale != "" && inst.Locale != "" && inst.Locale != filter.Locale {
			continue
		}
		return true, nil
	}
	return false, nil
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
	location       string
}

// InMemoryMenuService stores menus in memory.
type InMemoryMenuService struct {
	mu            sync.Mutex
	menus         map[string]*menuState
	slugIndex     map[string]string
	locationIndex map[string]string
	activity      ActivitySink
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func intFromPtr(v *int) int {
	if v == nil {
		return 0
	}
	return *v
}

// NewInMemoryMenuService constructs a memory-backed menu service.
func NewInMemoryMenuService() *InMemoryMenuService {
	return &InMemoryMenuService{
		menus:         make(map[string]*menuState),
		slugIndex:     make(map[string]string),
		locationIndex: make(map[string]string),
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
	// Menu codes must be compatible with go-cms validation and safe to use as the first path segment.
	slug = strings.ReplaceAll(slug, ".", "_")
	slug = strings.Trim(slug, "-_")
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
	slug := s.canonicalMenuSlug(code)
	if slug == "" {
		s.mu.Unlock()
		return nil, requiredFieldDomainError("menu code", map[string]any{"component": "cms_menu"})
	}
	if state, ok := s.menus[slug]; ok {
		menu := &Menu{Code: state.slug, Slug: state.slug, ID: state.id}
		activity := s.activity
		meta := map[string]any{
			"id":   state.id,
			"slug": state.slug,
		}
		s.mu.Unlock()
		recordCMSActivity(ctx, activity, "cms.menu.create", "menu:"+slug, meta)
		return menu, nil
	}
	state := &menuState{
		items:          map[string]MenuItem{},
		next:           1,
		parentCounters: map[string]int{},
		insertSeq:      0,
		slug:           slug,
		id:             MenuUUIDFromSlug(slug),
		location:       slug,
	}
	s.menus[slug] = state
	s.slugIndex[slug] = slug
	s.locationIndex[slug] = slug
	menu := &Menu{Code: slug, Slug: slug, ID: state.id, Location: state.location}
	activity := s.activity
	meta := map[string]any{
		"id":   state.id,
		"slug": state.slug,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.menu.create", "menu:"+slug, meta)
	return menu, nil
}

// ResetMenu removes all items for the given menu code (debug/reset helper).
func (s *InMemoryMenuService) ResetMenu(code string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	slug := s.canonicalMenuSlug(code)
	if existing, ok := s.menus[slug]; ok {
		delete(s.locationIndex, existing.location)
	}
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
	state, slug := s.resolveMenuState(menuCode)
	if slug == "" {
		s.mu.Unlock()
		return requiredFieldDomainError("menu code", map[string]any{"component": "cms_menu"})
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
	if _, ok := state.items[item.ID]; ok && strings.TrimSpace(item.ID) != "" {
		// Idempotent add-if-missing: skip when ID already present.
		s.mu.Unlock()
		return nil
	}
	if item.ID == "" {
		item.ID = fmt.Sprintf("%s-%d", menuCode, state.next)
		state.next++
	}
	if err := validateMenuParentLink(item.ID, item.ParentID); err != nil {
		s.mu.Unlock()
		return err
	}
	if strings.TrimSpace(item.Code) == "" {
		item.Code = strings.TrimSpace(item.ID)
	}
	if strings.TrimSpace(item.ParentCode) == "" {
		item.ParentCode = strings.TrimSpace(item.ParentID)
	}
	if item.Position == nil {
		pos := state.parentCounters[item.ParentID] + 1
		item.Position = intPtr(pos)
	}
	state.parentCounters[item.ParentID] = maxInt(state.parentCounters[item.ParentID], intFromPtr(item.Position))
	if strings.TrimSpace(item.Type) == "" {
		item.Type = MenuItemTypeItem
	}
	state.insertSeq++
	navinternal.SetMenuItemOrder(&item, state.insertSeq)
	item.Menu = state.slug
	state.items[item.ID] = item
	activity := s.activity
	meta := map[string]any{
		"menu":   state.slug,
		"label":  item.Label,
		"locale": item.Locale,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.menu_item.create", "menu_item:"+item.ID, meta)
	return nil
}

// UpdateMenuItem updates an existing menu item.
func (s *InMemoryMenuService) UpdateMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	s.mu.Lock()
	state, _ := s.resolveMenuState(menuCode)
	if state == nil {
		s.mu.Unlock()
		return ErrNotFound
	}
	existing, ok := state.items[item.ID]
	if !ok || item.ID == "" {
		s.mu.Unlock()
		return ErrNotFound
	}
	if item.Position == nil {
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
	if err := validateMenuParentLink(item.ID, item.ParentID); err != nil {
		s.mu.Unlock()
		return err
	}
	if menuStateWouldCreateCycle(state.items, item.ID, item.ParentID) {
		s.mu.Unlock()
		return validationDomainError("menu hierarchy cycle detected", map[string]any{
			"id":        strings.TrimSpace(item.ID),
			"parent_id": strings.TrimSpace(item.ParentID),
		})
	}
	navinternal.SetMenuItemOrder(&item, navinternal.MenuItemOrder(existing))
	item.Menu = state.slug
	state.items[item.ID] = item
	activity := s.activity
	meta := map[string]any{
		"menu":   state.slug,
		"label":  item.Label,
		"locale": item.Locale,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.menu_item.update", "menu_item:"+item.ID, meta)
	return nil
}

// DeleteMenuItem deletes an item and its children.
func (s *InMemoryMenuService) DeleteMenuItem(ctx context.Context, menuCode, id string) error {
	s.mu.Lock()
	state, _ := s.resolveMenuState(menuCode)
	if state == nil {
		s.mu.Unlock()
		return ErrNotFound
	}
	if _, ok := state.items[id]; !ok {
		s.mu.Unlock()
		return ErrNotFound
	}
	s.deleteChildren(state, id)
	delete(state.items, id)
	activity := s.activity
	meta := map[string]any{
		"menu": state.slug,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.menu_item.delete", "menu_item:"+id, meta)
	return nil
}

func (s *InMemoryMenuService) deleteChildren(state *menuState, id string) {
	seen := map[string]bool{}
	s.deleteChildrenRecursive(state, id, seen)
}

func (s *InMemoryMenuService) deleteChildrenRecursive(state *menuState, id string, seen map[string]bool) {
	if seen[id] {
		return
	}
	seen[id] = true
	for childID, item := range state.items {
		if item.ParentID == id {
			s.deleteChildrenRecursive(state, childID, seen)
			delete(state.items, childID)
		}
	}
}

// ReorderMenu applies a positional ordering to menu items.
func (s *InMemoryMenuService) ReorderMenu(ctx context.Context, menuCode string, orderedIDs []string) error {
	s.mu.Lock()
	state, _ := s.resolveMenuState(menuCode)
	if state == nil {
		s.mu.Unlock()
		return ErrNotFound
	}
	for idx, id := range orderedIDs {
		item, ok := state.items[id]
		if !ok {
			continue
		}
		item.Position = intPtr(idx + 1)
		state.items[id] = item
	}
	activity := s.activity
	slug := state.slug
	orderedCopy := append([]string{}, orderedIDs...)
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.menu.reorder", "menu:"+slug, map[string]any{
		"ordered_ids": orderedCopy,
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
		return &Menu{Code: slug, Slug: slug, ID: MenuUUIDFromSlug(slug), Location: slug}, nil
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
	return &Menu{Code: state.slug, Slug: state.slug, ID: state.id, Location: state.location, Items: tree}, nil
}

// MenuByLocation returns a menu resolved by location.
func (s *InMemoryMenuService) MenuByLocation(ctx context.Context, location, locale string) (*Menu, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if location == "" {
		return &Menu{}, nil
	}
	if slug, ok := s.locationIndex[location]; ok {
		return s.Menu(ctx, slug, locale)
	}
	return s.Menu(ctx, location, locale)
}

func sortMenuChildren(children *[]MenuItem) {
	posKey := func(item MenuItem) int {
		if item.Position == nil {
			return int(^uint(0) >> 1)
		}
		return *item.Position
	}
	sort.Slice(*children, func(i, j int) bool {
		pi := posKey((*children)[i])
		pj := posKey((*children)[j])
		if pi == pj {
			leftOrder := navinternal.MenuItemOrder((*children)[i])
			rightOrder := navinternal.MenuItemOrder((*children)[j])
			if leftOrder == rightOrder {
				return (*children)[i].ID < (*children)[j].ID
			}
			return leftOrder < rightOrder
		}
		return pi < pj
	})
	for idx := range *children {
		sortMenuChildren(&(*children)[idx].Children)
	}
}

// InMemoryContentService stores CMS pages/content/blocks in memory for tests/demos.
type InMemoryContentService struct {
	mu               sync.Mutex
	pages            map[string]CMSPage
	contents         map[string]CMSContent
	blocks           map[string]CMSBlock
	blockDefs        map[string]CMSBlockDefinition
	blockDefVersions map[string][]CMSBlockDefinitionVersion
	types            map[string]CMSContentType
	typeSlugs        map[string]string
	nextPage         int
	nextCont         int
	nextBlock        int
	nextBlockD       int
	nextType         int
	activity         ActivitySink
}

func cmsEnvironment(ctx context.Context, fallback string) string {
	env := strings.TrimSpace(fallback)
	if env == "" {
		env = strings.TrimSpace(environmentFromContext(ctx))
	}
	return env
}

func cmsScopedKey(env, key string) string {
	key = strings.TrimSpace(key)
	if key == "" {
		return ""
	}
	env = strings.TrimSpace(env)
	if env == "" {
		return key
	}
	return env + "::" + key
}

// NewInMemoryContentService constructs a content service.
func NewInMemoryContentService() *InMemoryContentService {
	return &InMemoryContentService{
		pages:            make(map[string]CMSPage),
		contents:         make(map[string]CMSContent),
		blocks:           make(map[string]CMSBlock),
		blockDefs:        make(map[string]CMSBlockDefinition),
		blockDefVersions: make(map[string][]CMSBlockDefinitionVersion),
		types:            make(map[string]CMSContentType),
		typeSlugs:        make(map[string]string),
		nextPage:         1,
		nextCont:         1,
		nextBlock:        1,
		nextBlockD:       1,
		nextType:         1,
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
	if page.ID == "" {
		page.ID = strconv.Itoa(s.nextPage)
		s.nextPage++
	}
	if page.PreviewURL == "" {
		page.PreviewURL = page.Slug
	}
	s.pages[page.ID] = cloneCMSPage(page)
	cp := cloneCMSPage(page)
	activity := s.activity
	meta := map[string]any{
		"title":     cp.Title,
		"slug":      cp.Slug,
		"locale":    cp.Locale,
		"parent_id": cp.ParentID,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.page.create", "page:"+cp.ID, meta)
	return &cp, nil
}

// UpdatePage updates an existing page.
func (s *InMemoryContentService) UpdatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	s.mu.Lock()
	if page.ID == "" {
		s.mu.Unlock()
		return nil, ErrNotFound
	}
	if existing, ok := s.pages[page.ID]; ok {
		if page.PreviewURL == "" {
			page.PreviewURL = existing.PreviewURL
		}
	} else {
		s.mu.Unlock()
		return nil, ErrNotFound
	}
	s.pages[page.ID] = cloneCMSPage(page)
	cp := cloneCMSPage(page)
	activity := s.activity
	meta := map[string]any{
		"title":     cp.Title,
		"slug":      cp.Slug,
		"locale":    cp.Locale,
		"parent_id": cp.ParentID,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.page.update", "page:"+cp.ID, meta)
	return &cp, nil
}

// DeletePage removes a page.
func (s *InMemoryContentService) DeletePage(ctx context.Context, id string) error {
	s.mu.Lock()
	if _, ok := s.pages[id]; !ok {
		s.mu.Unlock()
		return ErrNotFound
	}
	delete(s.pages, id)
	activity := s.activity
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.page.delete", "page:"+id, nil)
	return nil
}

// ContentTypes returns all content type definitions.
func (s *InMemoryContentService) ContentTypes(ctx context.Context) ([]CMSContentType, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	env := cmsEnvironment(ctx, "")
	out := make([]CMSContentType, 0, len(s.types))
	for _, ct := range s.types {
		if env != "" {
			if !strings.EqualFold(strings.TrimSpace(ct.Environment), env) {
				continue
			}
		} else if strings.TrimSpace(ct.Environment) != "" {
			continue
		}
		out = append(out, cloneCMSContentType(ct))
	}
	return out, nil
}

// ContentType returns a content type by id.
func (s *InMemoryContentService) ContentType(ctx context.Context, id string) (*CMSContentType, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	env := cmsEnvironment(ctx, "")
	ct, ok := s.types[cmsScopedKey(env, id)]
	if !ok {
		return nil, ErrNotFound
	}
	cp := cloneCMSContentType(ct)
	return &cp, nil
}

// ContentTypeBySlug returns a content type by slug.
func (s *InMemoryContentService) ContentTypeBySlug(ctx context.Context, slug string) (*CMSContentType, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	env := cmsEnvironment(ctx, "")
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, ErrNotFound
	}
	if id, ok := s.typeSlugs[cmsScopedKey(env, slug)]; ok {
		if ct, found := s.types[cmsScopedKey(env, id)]; found {
			cp := cloneCMSContentType(ct)
			return &cp, nil
		}
	}
	return nil, ErrNotFound
}

// CreateContentType inserts a content type definition.
func (s *InMemoryContentService) CreateContentType(ctx context.Context, contentType CMSContentType) (*CMSContentType, error) {
	s.mu.Lock()
	env := cmsEnvironment(ctx, contentType.Environment)
	name := strings.TrimSpace(contentType.Name)
	slug := normalizeContentTypeSlug(name, contentType.Slug)
	fields := map[string]string{}
	if name == "" {
		fields["name"] = "required"
	}
	if contentType.Schema == nil || len(contentType.Schema) == 0 {
		fields["schema"] = "required"
	}
	if slug == "" {
		fields["slug"] = "required"
	} else if !isValidContentTypeSlug(slug) {
		fields["slug"] = "invalid"
	} else if existing, ok := s.typeSlugs[cmsScopedKey(env, slug)]; ok && existing != "" {
		fields["slug"] = "already exists"
	}
	if len(fields) > 0 {
		s.mu.Unlock()
		return nil, contentTypeValidationError(fields)
	}
	if contentType.ID == "" {
		contentType.ID = fmt.Sprintf("ctype-%d", s.nextType)
		s.nextType++
	}
	contentType.Name = name
	contentType.Slug = slug
	contentType.Environment = env
	contentType.Description = strings.TrimSpace(contentType.Description)
	contentType.Icon = strings.TrimSpace(contentType.Icon)
	if status := strings.TrimSpace(contentType.Status); status != "" {
		contentType.Status = status
	} else if contentType.Status == "" {
		contentType.Status = "draft"
	}
	contentType.Schema = cloneAnyMap(contentType.Schema)
	contentType.UISchema = cloneAnyMap(contentType.UISchema)
	contentType.Capabilities = cloneAnyMap(contentType.Capabilities)
	contentType.UpdatedAt = time.Now().UTC()
	if contentType.CreatedAt.IsZero() {
		contentType.CreatedAt = contentType.UpdatedAt
	}
	s.types[cmsScopedKey(env, contentType.ID)] = cloneCMSContentType(contentType)
	s.typeSlugs[cmsScopedKey(env, contentType.Slug)] = contentType.ID
	cp := cloneCMSContentType(contentType)
	activity := s.activity
	meta := map[string]any{
		"name": contentType.Name,
		"slug": contentType.Slug,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.content_type.create", "content_type:"+contentType.ID, meta)
	return &cp, nil
}

// UpdateContentType updates an existing content type definition.
func (s *InMemoryContentService) UpdateContentType(ctx context.Context, contentType CMSContentType) (*CMSContentType, error) {
	s.mu.Lock()
	env := cmsEnvironment(ctx, contentType.Environment)
	id := strings.TrimSpace(contentType.ID)
	if id == "" {
		if slug := strings.TrimSpace(contentType.Slug); slug != "" {
			if existingID, ok := s.typeSlugs[cmsScopedKey(env, slug)]; ok {
				id = existingID
			}
		}
	}
	if id == "" {
		s.mu.Unlock()
		return nil, ErrNotFound
	}
	existing, ok := s.types[cmsScopedKey(env, id)]
	if !ok {
		s.mu.Unlock()
		return nil, ErrNotFound
	}
	name := strings.TrimSpace(contentType.Name)
	if name != "" {
		existing.Name = name
	}
	if contentType.Schema != nil {
		existing.Schema = cloneAnyMap(contentType.Schema)
	}
	if contentType.UISchema != nil {
		existing.UISchema = cloneAnyMap(contentType.UISchema)
	}
	if contentType.ReplaceCapabilities {
		existing.Capabilities = cloneAnyMap(contentType.Capabilities)
	} else if contentType.Capabilities != nil {
		existing.Capabilities = mergeAnyMap(cloneAnyMap(existing.Capabilities), cloneAnyMap(contentType.Capabilities))
	}
	if contentType.DescriptionSet {
		existing.Description = contentType.Description
	} else if desc := strings.TrimSpace(contentType.Description); desc != "" {
		existing.Description = desc
	}
	if contentType.IconSet {
		existing.Icon = contentType.Icon
	} else if icon := strings.TrimSpace(contentType.Icon); icon != "" {
		existing.Icon = icon
	}
	if status := strings.TrimSpace(contentType.Status); status != "" {
		existing.Status = status
	}
	if env != "" {
		existing.Environment = env
	}
	if existing.Name == "" {
		s.mu.Unlock()
		return nil, contentTypeValidationError(map[string]string{"name": "required"})
	}
	if existing.Schema == nil || len(existing.Schema) == 0 {
		s.mu.Unlock()
		return nil, contentTypeValidationError(map[string]string{"schema": "required"})
	}
	newSlug := existing.Slug
	if slugInput := strings.TrimSpace(contentType.Slug); slugInput != "" {
		newSlug = normalizeContentTypeSlug(existing.Name, slugInput)
	}
	if newSlug == "" {
		s.mu.Unlock()
		return nil, contentTypeValidationError(map[string]string{"slug": "required"})
	}
	if !isValidContentTypeSlug(newSlug) {
		s.mu.Unlock()
		return nil, contentTypeValidationError(map[string]string{"slug": "invalid"})
	}
	if existingID, ok := s.typeSlugs[cmsScopedKey(env, newSlug)]; ok && existingID != "" && existingID != id {
		s.mu.Unlock()
		return nil, contentTypeValidationError(map[string]string{"slug": "already exists"})
	}
	if existing.Slug != newSlug {
		delete(s.typeSlugs, cmsScopedKey(env, existing.Slug))
		s.typeSlugs[cmsScopedKey(env, newSlug)] = id
		existing.Slug = newSlug
	}
	existing.UpdatedAt = time.Now().UTC()
	s.types[cmsScopedKey(env, id)] = cloneCMSContentType(existing)
	cp := cloneCMSContentType(existing)
	activity := s.activity
	meta := map[string]any{
		"name": existing.Name,
		"slug": existing.Slug,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.content_type.update", "content_type:"+id, meta)
	return &cp, nil
}

// DeleteContentType removes a content type definition.
func (s *InMemoryContentService) DeleteContentType(ctx context.Context, id string) error {
	s.mu.Lock()
	env := cmsEnvironment(ctx, "")
	ct, ok := s.types[cmsScopedKey(env, id)]
	if !ok {
		s.mu.Unlock()
		return ErrNotFound
	}
	delete(s.types, cmsScopedKey(env, id))
	if ct.Slug != "" {
		delete(s.typeSlugs, cmsScopedKey(env, ct.Slug))
	}
	activity := s.activity
	meta := map[string]any{
		"name": ct.Name,
		"slug": ct.Slug,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.content_type.delete", "content_type:"+id, meta)
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
	if content.ID == "" {
		content.ID = strconv.Itoa(s.nextCont)
		s.nextCont++
	}
	if content.Status == "" {
		content.Status = "draft"
	}
	if content.ContentTypeSlug == "" {
		content.ContentTypeSlug = strings.TrimSpace(content.ContentType)
	}
	if content.ContentType == "" {
		content.ContentType = content.ContentTypeSlug
	}
	s.contents[content.ID] = cloneCMSContent(content)
	cp := cloneCMSContent(content)
	activity := s.activity
	meta := map[string]any{
		"title":        cp.Title,
		"slug":         cp.Slug,
		"locale":       cp.Locale,
		"content_type": firstNonEmpty(cp.ContentTypeSlug, cp.ContentType),
		"status":       cp.Status,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.content.create", "content:"+cp.ID, meta)
	return &cp, nil
}

// UpdateContent updates an existing content entry.
func (s *InMemoryContentService) UpdateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	s.mu.Lock()
	if content.ID == "" {
		s.mu.Unlock()
		return nil, ErrNotFound
	}
	if _, ok := s.contents[content.ID]; !ok {
		s.mu.Unlock()
		return nil, ErrNotFound
	}
	if content.ContentTypeSlug == "" {
		content.ContentTypeSlug = strings.TrimSpace(content.ContentType)
	}
	if content.ContentType == "" {
		content.ContentType = content.ContentTypeSlug
	}
	s.contents[content.ID] = cloneCMSContent(content)
	cp := cloneCMSContent(content)
	activity := s.activity
	meta := map[string]any{
		"title":        cp.Title,
		"slug":         cp.Slug,
		"locale":       cp.Locale,
		"content_type": firstNonEmpty(cp.ContentTypeSlug, cp.ContentType),
		"status":       cp.Status,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.content.update", "content:"+cp.ID, meta)
	return &cp, nil
}

// DeleteContent removes a content entry.
func (s *InMemoryContentService) DeleteContent(ctx context.Context, id string) error {
	s.mu.Lock()
	if _, ok := s.contents[id]; !ok {
		s.mu.Unlock()
		return ErrNotFound
	}
	delete(s.contents, id)
	activity := s.activity
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.content.delete", "content:"+id, nil)
	return nil
}

// BlockDefinitions returns registered block definitions.
func (s *InMemoryContentService) BlockDefinitions(ctx context.Context) ([]CMSBlockDefinition, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	env := cmsEnvironment(ctx, "")
	out := []CMSBlockDefinition{}
	for _, def := range s.blockDefs {
		if env != "" {
			if !strings.EqualFold(strings.TrimSpace(def.Environment), env) {
				continue
			}
		} else if strings.TrimSpace(def.Environment) != "" {
			continue
		}
		out = append(out, cloneCMSBlockDefinition(def))
	}
	return out, nil
}

// CreateBlockDefinition adds a block definition.
func (s *InMemoryContentService) CreateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	s.mu.Lock()
	env := cmsEnvironment(ctx, def.Environment)
	if def.ID == "" {
		def.ID = fmt.Sprintf("block-%d", s.nextBlockD)
		s.nextBlockD++
	}
	if def.Name == "" {
		def.Name = def.ID
	}
	if def.Slug == "" {
		def.Slug = normalizeContentTypeSlug(def.Name, def.Slug)
	}
	if def.Status == "" {
		def.Status = "draft"
	}
	if def.SchemaVersion == "" {
		def.SchemaVersion = schemaVersionFromSchema(def.Schema)
	}
	if def.MigrationStatus == "" {
		def.MigrationStatus = blockDefinitionMigrationStatus(def)
	}
	def.Environment = env
	s.upsertBlockDefinitionVersionLocked(def)
	s.blockDefs[cmsScopedKey(env, def.ID)] = cloneCMSBlockDefinition(def)
	cp := cloneCMSBlockDefinition(def)
	activity := s.activity
	meta := map[string]any{
		"name":   cp.Name,
		"type":   cp.Type,
		"locale": cp.Locale,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.block_definition.create", "block_def:"+cp.ID, meta)
	return &cp, nil
}

// UpdateBlockDefinition updates an existing block definition.
func (s *InMemoryContentService) UpdateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	s.mu.Lock()
	env := cmsEnvironment(ctx, def.Environment)
	if def.ID == "" {
		s.mu.Unlock()
		return nil, ErrNotFound
	}
	existing, ok := s.blockDefs[cmsScopedKey(env, def.ID)]
	if !ok {
		s.mu.Unlock()
		return nil, ErrNotFound
	}
	if def.Name == "" {
		def.Name = existing.Name
	}
	if def.Slug == "" {
		def.Slug = existing.Slug
		if def.Slug == "" {
			def.Slug = normalizeContentTypeSlug(def.Name, def.Slug)
		}
	}
	if def.Type == "" {
		def.Type = existing.Type
	}
	if !def.DescriptionSet {
		def.Description = existing.Description
	}
	if !def.IconSet {
		def.Icon = existing.Icon
	}
	if !def.CategorySet {
		def.Category = existing.Category
	}
	if def.Status == "" {
		if existing.Status != "" {
			def.Status = existing.Status
		} else {
			def.Status = "draft"
		}
	}
	if def.Schema == nil {
		def.Schema = existing.Schema
	}
	if def.UISchema == nil {
		def.UISchema = existing.UISchema
	}
	if def.SchemaVersion == "" {
		def.SchemaVersion = existing.SchemaVersion
	}
	if def.SchemaVersion == "" {
		def.SchemaVersion = schemaVersionFromSchema(def.Schema)
	}
	if def.MigrationStatus == "" {
		def.MigrationStatus = existing.MigrationStatus
	}
	if def.MigrationStatus == "" {
		def.MigrationStatus = blockDefinitionMigrationStatus(def)
	}
	def.Environment = env
	s.upsertBlockDefinitionVersionLocked(def)
	s.blockDefs[cmsScopedKey(env, def.ID)] = cloneCMSBlockDefinition(def)
	cp := cloneCMSBlockDefinition(def)
	activity := s.activity
	meta := map[string]any{
		"name":   cp.Name,
		"type":   cp.Type,
		"locale": cp.Locale,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.block_definition.update", "block_def:"+cp.ID, meta)
	return &cp, nil
}

// DeleteBlockDefinition removes a block definition.
func (s *InMemoryContentService) DeleteBlockDefinition(ctx context.Context, id string) error {
	s.mu.Lock()
	env := cmsEnvironment(ctx, "")
	key := cmsScopedKey(env, id)
	if _, ok := s.blockDefs[key]; !ok {
		s.mu.Unlock()
		return ErrNotFound
	}
	delete(s.blockDefs, key)
	delete(s.blockDefVersions, key)
	activity := s.activity
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.block_definition.delete", "block_def:"+id, nil)
	return nil
}

// BlockDefinitionVersions returns the schema versions for a definition.
func (s *InMemoryContentService) BlockDefinitionVersions(ctx context.Context, id string) ([]CMSBlockDefinitionVersion, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	env := cmsEnvironment(ctx, "")
	versions := s.blockDefVersions[cmsScopedKey(env, id)]
	if len(versions) == 0 {
		return nil, nil
	}
	out := make([]CMSBlockDefinitionVersion, 0, len(versions))
	for _, entry := range versions {
		out = append(out, cloneCMSBlockDefinitionVersion(entry))
	}
	return out, nil
}

func (s *InMemoryContentService) upsertBlockDefinitionVersionLocked(def CMSBlockDefinition) {
	if def.ID == "" {
		return
	}
	key := cmsScopedKey(def.Environment, def.ID)
	if key == "" {
		return
	}
	version := strings.TrimSpace(def.SchemaVersion)
	if version == "" {
		version = schemaVersionFromSchema(def.Schema)
	}
	if version == "" {
		return
	}
	entries := s.blockDefVersions[key]
	now := time.Now().UTC()
	for i, entry := range entries {
		if entry.SchemaVersion != version {
			continue
		}
		entry.Schema = cloneAnyMap(def.Schema)
		entry.MigrationStatus = def.MigrationStatus
		entry.UpdatedAt = now
		entries[i] = entry
		s.blockDefVersions[key] = entries
		return
	}
	entry := CMSBlockDefinitionVersion{
		ID:              fmt.Sprintf("%s@%s", def.ID, version),
		DefinitionID:    def.ID,
		SchemaVersion:   version,
		Schema:          cloneAnyMap(def.Schema),
		Defaults:        nil,
		MigrationStatus: def.MigrationStatus,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	s.blockDefVersions[key] = append(entries, entry)
}

// BlocksForContent returns blocks attached to a content/page.
func (s *InMemoryContentService) BlocksForContent(_ context.Context, contentID, locale string) ([]CMSBlock, error) {
	s.mu.Lock()
	if page, ok := s.pages[contentID]; ok {
		embedded, present := embeddedBlocksFromData(page.Data)
		if !present && page.EmbeddedBlocks != nil {
			embedded = cloneEmbeddedBlocks(page.EmbeddedBlocks)
			present = true
		}
		if present {
			s.mu.Unlock()
			return embeddedBlocksToCMSBlocks(contentID, locale, embedded), nil
		}
	}
	if content, ok := s.contents[contentID]; ok {
		embedded, present := embeddedBlocksFromData(content.Data)
		if !present && content.EmbeddedBlocks != nil {
			embedded = cloneEmbeddedBlocks(content.EmbeddedBlocks)
			present = true
		}
		if present {
			s.mu.Unlock()
			return embeddedBlocksToCMSBlocks(contentID, locale, embedded), nil
		}
	}
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
	s.mu.Unlock()
	return out, nil
}

// LegacyBlocksForContent returns legacy block instances without embedded fallback.
func (s *InMemoryContentService) LegacyBlocksForContent(_ context.Context, contentID, locale string) ([]CMSBlock, error) {
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
	if block.ID == "" {
		block.ID = fmt.Sprintf("blk-%d", s.nextBlock)
		s.nextBlock++
	}
	if block.Position == 0 {
		block.Position = len(s.blocks) + 1
	}
	s.blocks[block.ID] = cloneCMSBlock(block)
	cp := cloneCMSBlock(block)
	activity := s.activity
	meta := map[string]any{
		"content_id": cp.ContentID,
		"locale":     cp.Locale,
		"region":     cp.Region,
		"position":   cp.Position,
	}
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.block.save", "block:"+cp.ID, meta)
	return &cp, nil
}

// DeleteBlock removes a block.
func (s *InMemoryContentService) DeleteBlock(ctx context.Context, id string) error {
	s.mu.Lock()
	if _, ok := s.blocks[id]; !ok {
		s.mu.Unlock()
		return ErrNotFound
	}
	delete(s.blocks, id)
	activity := s.activity
	s.mu.Unlock()
	recordCMSActivity(ctx, activity, "cms.block.delete", "block:"+id, nil)
	return nil
}

func cloneCMSPage(in CMSPage) CMSPage {
	out := in
	if in.AvailableLocales != nil {
		out.AvailableLocales = append([]string{}, in.AvailableLocales...)
	}
	if in.Blocks != nil {
		out.Blocks = append([]string{}, in.Blocks...)
	}
	if in.EmbeddedBlocks != nil {
		out.EmbeddedBlocks = cloneEmbeddedBlocks(in.EmbeddedBlocks)
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
	if in.Metadata != nil {
		out.Metadata = make(map[string]any, len(in.Metadata))
		for k, v := range in.Metadata {
			out.Metadata[k] = v
		}
	}
	return out
}

func cloneCMSContent(in CMSContent) CMSContent {
	out := in
	if in.AvailableLocales != nil {
		out.AvailableLocales = append([]string{}, in.AvailableLocales...)
	}
	if in.Blocks != nil {
		out.Blocks = append([]string{}, in.Blocks...)
	}
	if in.EmbeddedBlocks != nil {
		out.EmbeddedBlocks = cloneEmbeddedBlocks(in.EmbeddedBlocks)
	}
	if in.Data != nil {
		out.Data = make(map[string]any, len(in.Data))
		for k, v := range in.Data {
			out.Data[k] = v
		}
	}
	if in.Metadata != nil {
		out.Metadata = make(map[string]any, len(in.Metadata))
		for k, v := range in.Metadata {
			out.Metadata[k] = v
		}
	}
	return out
}

func cloneCMSContentType(in CMSContentType) CMSContentType {
	out := in
	if in.Schema != nil {
		out.Schema = cloneAnyMap(in.Schema)
	}
	if in.UISchema != nil {
		out.UISchema = cloneAnyMap(in.UISchema)
	}
	if in.Capabilities != nil {
		out.Capabilities = cloneAnyMap(in.Capabilities)
	}
	return out
}

func cloneCMSBlockDefinition(in CMSBlockDefinition) CMSBlockDefinition {
	out := in
	if in.Schema != nil {
		out.Schema = cloneAnyMap(in.Schema)
	}
	if in.UISchema != nil {
		out.UISchema = cloneAnyMap(in.UISchema)
	}
	return out
}

func cloneCMSBlockDefinitionVersion(in CMSBlockDefinitionVersion) CMSBlockDefinitionVersion {
	out := in
	if in.Schema != nil {
		out.Schema = cloneAnyMap(in.Schema)
	}
	if in.Defaults != nil {
		out.Defaults = cloneAnyMap(in.Defaults)
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

func normalizeContentTypeSlug(name, slug string) string {
	candidate := strings.TrimSpace(slug)
	if candidate == "" {
		candidate = strings.TrimSpace(name)
	}
	candidate = strings.ToLower(candidate)
	candidate = strings.ReplaceAll(candidate, " ", "-")
	candidate = strings.ReplaceAll(candidate, "_", "-")
	return strings.Trim(candidate, "-")
}

func isValidContentTypeSlug(slug string) bool {
	if slug == "" {
		return false
	}
	for _, r := range slug {
		if r >= 'a' && r <= 'z' {
			continue
		}
		if r >= '0' && r <= '9' {
			continue
		}
		if r == '-' {
			continue
		}
		return false
	}
	return true
}

func contentTypeValidationError(fields map[string]string) error {
	if len(fields) == 0 {
		return nil
	}
	err := goerrors.NewValidationFromMap("validation failed", fields).
		WithCode(http.StatusBadRequest).
		WithTextCode(TextCodeValidationError)
	err.Metadata = map[string]any{"fields": fields}
	return err
}
