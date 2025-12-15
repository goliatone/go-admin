package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
)

// ErrPathConflict signals a page path/slug collision.
var ErrPathConflict = errors.New("path conflict")

// CMSPageRepository adapts a CMSContentService to the admin Repository contract.
// It supports locale-aware listings, basic search, parent/child metadata for tree views,
// and slug uniqueness validation for preview links.
type CMSPageRepository struct {
	content CMSContentService
}

// NewCMSPageRepository builds a repository backed by a CMSContentService.
func NewCMSPageRepository(content CMSContentService) *CMSPageRepository {
	return &CMSPageRepository{content: content}
}

// List returns CMS pages filtered by locale and simple search.
func (r *CMSPageRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := extractLocale(opts, "")
	pages, err := r.content.Pages(ctx, locale)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	filtered := []CMSPage{}
	for _, page := range pages {
		if search != "" && !strings.Contains(strings.ToLower(page.Title), search) && !strings.Contains(strings.ToLower(page.Slug), search) {
			continue
		}
		filtered = append(filtered, page)
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, page := range sliced {
		out = append(out, map[string]any{
			"id":          page.ID,
			"title":       page.Title,
			"slug":        page.Slug,
			"template_id": page.TemplateID,
			"locale":      page.Locale,
			"parent_id":   page.ParentID,
			"blocks":      append([]string{}, page.Blocks...),
			"seo":         cloneAnyMap(page.SEO),
			"status":      page.Status,
			"data":        cloneAnyMap(page.Data),
			"preview_url": page.PreviewURL,
		})
	}
	return out, total, nil
}

// Get returns a page by id.
func (r *CMSPageRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	page, err := r.content.Page(ctx, id, localeFromContext(ctx))
	if err != nil && errors.Is(err, ErrNotFound) {
		if locale := r.resolvePageLocale(ctx, id); locale != "" {
			page, err = r.content.Page(ctx, id, locale)
		}
	}
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":          page.ID,
		"title":       page.Title,
		"slug":        page.Slug,
		"template_id": page.TemplateID,
		"locale":      page.Locale,
		"parent_id":   page.ParentID,
		"blocks":      append([]string{}, page.Blocks...),
		"seo":         cloneAnyMap(page.SEO),
		"status":      page.Status,
		"data":        cloneAnyMap(page.Data),
		"preview_url": page.PreviewURL,
	}, nil
}

// Create inserts a page with path collision checks.
func (r *CMSPageRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	page := mapToCMSPage(record)
	if err := r.ensureUniqueSlug(ctx, page.Slug, "", page.Locale); err != nil {
		return nil, err
	}
	if page.PreviewURL == "" {
		page.PreviewURL = page.Slug
	}
	created, err := r.content.CreatePage(ctx, page)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":          created.ID,
		"title":       created.Title,
		"slug":        created.Slug,
		"locale":      created.Locale,
		"parent_id":   created.ParentID,
		"blocks":      append([]string{}, created.Blocks...),
		"seo":         cloneAnyMap(created.SEO),
		"status":      created.Status,
		"data":        cloneAnyMap(created.Data),
		"preview_url": created.PreviewURL,
	}, nil
}

// Update modifies a page while preventing slug/path collisions.
func (r *CMSPageRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	page := mapToCMSPage(record)
	page.ID = id
	if strings.TrimSpace(page.Locale) == "" {
		if locale := localeFromContext(ctx); locale != "" {
			page.Locale = locale
		}
		if locale := r.resolvePageLocale(ctx, id); locale != "" {
			page.Locale = locale
		}
	}
	if err := r.ensureUniqueSlug(ctx, page.Slug, id, page.Locale); err != nil {
		return nil, err
	}
	if page.PreviewURL == "" {
		page.PreviewURL = page.Slug
	}
	updated, err := r.content.UpdatePage(ctx, page)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":          updated.ID,
		"title":       updated.Title,
		"slug":        updated.Slug,
		"locale":      updated.Locale,
		"parent_id":   updated.ParentID,
		"blocks":      append([]string{}, updated.Blocks...),
		"seo":         cloneAnyMap(updated.SEO),
		"status":      updated.Status,
		"data":        cloneAnyMap(updated.Data),
		"preview_url": updated.PreviewURL,
	}, nil
}

// Delete removes a page.
func (r *CMSPageRepository) Delete(ctx context.Context, id string) error {
	if r.content == nil {
		return ErrNotFound
	}
	return r.content.DeletePage(ctx, id)
}

func (r *CMSPageRepository) ensureUniqueSlug(ctx context.Context, slug, skipID, locale string) error {
	if slug == "" {
		return nil
	}
	pages, err := r.content.Pages(ctx, locale)
	if err != nil {
		return err
	}
	for _, page := range pages {
		if page.Slug == slug && page.ID != skipID {
			return ErrPathConflict
		}
	}
	return nil
}

// CMSContentRepository adapts CMSContentService for structured content entities.
type CMSContentRepository struct {
	content CMSContentService
}

// NewCMSContentRepository builds a content repository.
func NewCMSContentRepository(content CMSContentService) *CMSContentRepository {
	return &CMSContentRepository{content: content}
}

// List returns content filtered by locale and search query.
func (r *CMSContentRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := extractLocale(opts, "")
	contents, err := r.content.Contents(ctx, locale)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	filtered := []CMSContent{}
	for _, item := range contents {
		if search != "" && !strings.Contains(strings.ToLower(item.Title), search) && !strings.Contains(strings.ToLower(item.Slug), search) && !strings.Contains(strings.ToLower(item.ContentType), search) {
			continue
		}
		filtered = append(filtered, item)
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, item := range sliced {
		out = append(out, map[string]any{
			"id":           item.ID,
			"title":        item.Title,
			"slug":         item.Slug,
			"locale":       item.Locale,
			"content_type": item.ContentType,
			"status":       item.Status,
			"blocks":       append([]string{}, item.Blocks...),
			"data":         cloneAnyMap(item.Data),
		})
	}
	return out, total, nil
}

// Get retrieves content by id.
func (r *CMSContentRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	item, err := r.content.Content(ctx, id, localeFromContext(ctx))
	if err != nil && errors.Is(err, ErrNotFound) {
		if locale := r.resolveContentLocale(ctx, id); locale != "" {
			item, err = r.content.Content(ctx, id, locale)
		}
	}
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":           item.ID,
		"title":        item.Title,
		"slug":         item.Slug,
		"locale":       item.Locale,
		"content_type": item.ContentType,
		"status":       item.Status,
		"blocks":       append([]string{}, item.Blocks...),
		"data":         cloneAnyMap(item.Data),
	}, nil
}

// Create inserts new content.
func (r *CMSContentRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	content := mapToCMSContent(record)
	created, err := r.content.CreateContent(ctx, content)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":           created.ID,
		"title":        created.Title,
		"slug":         created.Slug,
		"locale":       created.Locale,
		"content_type": created.ContentType,
		"status":       created.Status,
		"blocks":       append([]string{}, created.Blocks...),
		"data":         cloneAnyMap(created.Data),
	}, nil
}

// Update modifies content.
func (r *CMSContentRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	content := mapToCMSContent(record)
	content.ID = id
	if strings.TrimSpace(content.Locale) == "" {
		if locale := localeFromContext(ctx); locale != "" {
			content.Locale = locale
		}
		if locale := r.resolveContentLocale(ctx, id); locale != "" {
			content.Locale = locale
		}
	}
	updated, err := r.content.UpdateContent(ctx, content)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":           updated.ID,
		"title":        updated.Title,
		"slug":         updated.Slug,
		"locale":       updated.Locale,
		"content_type": updated.ContentType,
		"status":       updated.Status,
		"blocks":       append([]string{}, updated.Blocks...),
		"data":         cloneAnyMap(updated.Data),
	}, nil
}

// Delete removes a content item.
func (r *CMSContentRepository) Delete(ctx context.Context, id string) error {
	if r.content == nil {
		return ErrNotFound
	}
	return r.content.DeleteContent(ctx, id)
}

// CMSBlockDefinitionRepository manages block definitions through CMSContentService.
type CMSBlockDefinitionRepository struct {
	content CMSContentService
}

// NewCMSBlockDefinitionRepository builds a block definition repository.
func NewCMSBlockDefinitionRepository(content CMSContentService) *CMSBlockDefinitionRepository {
	return &CMSBlockDefinitionRepository{content: content}
}

// List returns block definitions.
func (r *CMSBlockDefinitionRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.content == nil {
		return nil, 0, ErrNotFound
	}
	defs, err := r.content.BlockDefinitions(ctx)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	filtered := []CMSBlockDefinition{}
	for _, def := range defs {
		if search != "" && !strings.Contains(strings.ToLower(def.Name), search) && !strings.Contains(strings.ToLower(def.Type), search) {
			continue
		}
		filtered = append(filtered, def)
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, def := range sliced {
		out = append(out, map[string]any{
			"id":     def.ID,
			"name":   def.Name,
			"type":   def.Type,
			"schema": cloneAnyMap(def.Schema),
			"locale": def.Locale,
		})
	}
	return out, total, nil
}

// Get returns a single block definition.
func (r *CMSBlockDefinitionRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	list, _, err := r.List(ctx, ListOptions{PerPage: 1000})
	if err != nil {
		return nil, err
	}
	for _, def := range list {
		if def["id"] == id {
			return def, nil
		}
	}
	return nil, ErrNotFound
}

// Create adds a block definition.
func (r *CMSBlockDefinitionRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	def := mapToCMSBlockDefinition(record)
	created, err := r.content.CreateBlockDefinition(ctx, def)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":     created.ID,
		"name":   created.Name,
		"type":   created.Type,
		"schema": cloneAnyMap(created.Schema),
		"locale": created.Locale,
	}, nil
}

// Update modifies a block definition.
func (r *CMSBlockDefinitionRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	def := mapToCMSBlockDefinition(record)
	def.ID = id
	updated, err := r.content.UpdateBlockDefinition(ctx, def)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":     updated.ID,
		"name":   updated.Name,
		"type":   updated.Type,
		"schema": cloneAnyMap(updated.Schema),
		"locale": updated.Locale,
	}, nil
}

// Delete removes a block definition.
func (r *CMSBlockDefinitionRepository) Delete(ctx context.Context, id string) error {
	if r.content == nil {
		return ErrNotFound
	}
	return r.content.DeleteBlockDefinition(ctx, id)
}

// CMSBlockRepository manages blocks assigned to content/pages.
type CMSBlockRepository struct {
	content CMSContentService
}

// NewCMSBlockRepository builds a block repository.
func NewCMSBlockRepository(content CMSContentService) *CMSBlockRepository {
	return &CMSBlockRepository{content: content}
}

// List returns blocks for a content ID (or all when unspecified).
func (r *CMSBlockRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := extractLocale(opts, "")
	contentIDs := []string{}
	if opts.Filters != nil {
		if cid, ok := opts.Filters["content_id"].(string); ok && cid != "" {
			contentIDs = append(contentIDs, cid)
		}
	}
	if len(contentIDs) == 0 {
		if contents, err := r.content.Contents(ctx, ""); err == nil {
			for _, c := range contents {
				contentIDs = append(contentIDs, c.ID)
			}
		}
		if pages, err := r.content.Pages(ctx, ""); err == nil {
			for _, p := range pages {
				contentIDs = append(contentIDs, p.ID)
			}
		}
	}
	blocks := []CMSBlock{}
	for _, cid := range contentIDs {
		items, _ := r.content.BlocksForContent(ctx, cid, locale)
		blocks = append(blocks, items...)
	}
	search := strings.ToLower(extractSearch(opts))
	filtered := []CMSBlock{}
	for _, blk := range blocks {
		if search != "" && !strings.Contains(strings.ToLower(blk.BlockType), search) && !strings.Contains(strings.ToLower(blk.DefinitionID), search) {
			continue
		}
		filtered = append(filtered, blk)
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, blk := range sliced {
		out = append(out, map[string]any{
			"id":               blk.ID,
			"definition_id":    blk.DefinitionID,
			"content_id":       blk.ContentID,
			"region":           blk.Region,
			"locale":           blk.Locale,
			"status":           blk.Status,
			"position":         blk.Position,
			"data":             cloneAnyMap(blk.Data),
			"block_type":       blk.BlockType,
			"block_schema_key": blk.BlockSchemaKey,
		})
	}
	return out, total, nil
}

// Get returns a block by id.
func (r *CMSBlockRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	list, _, err := r.List(ctx, ListOptions{PerPage: 1000})
	if err != nil {
		return nil, err
	}
	for _, blk := range list {
		if blk["id"] == id {
			return blk, nil
		}
	}
	return nil, ErrNotFound
}

// Create saves a new block.
func (r *CMSBlockRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	block := mapToCMSBlock(record)
	created, err := r.content.SaveBlock(ctx, block)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":               created.ID,
		"definition_id":    created.DefinitionID,
		"content_id":       created.ContentID,
		"region":           created.Region,
		"locale":           created.Locale,
		"status":           created.Status,
		"position":         created.Position,
		"data":             cloneAnyMap(created.Data),
		"block_type":       created.BlockType,
		"block_schema_key": created.BlockSchemaKey,
	}, nil
}

// Update modifies an existing block.
func (r *CMSBlockRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	block := mapToCMSBlock(record)
	block.ID = id
	updated, err := r.content.SaveBlock(ctx, block)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":               updated.ID,
		"definition_id":    updated.DefinitionID,
		"content_id":       updated.ContentID,
		"region":           updated.Region,
		"locale":           updated.Locale,
		"status":           updated.Status,
		"position":         updated.Position,
		"data":             cloneAnyMap(updated.Data),
		"block_type":       updated.BlockType,
		"block_schema_key": updated.BlockSchemaKey,
	}, nil
}

// Delete removes a block.
func (r *CMSBlockRepository) Delete(ctx context.Context, id string) error {
	if r.content == nil {
		return ErrNotFound
	}
	return r.content.DeleteBlock(ctx, id)
}

// CMSMenuRepository manages menu items for CMS-backed navigation.
type CMSMenuRepository struct {
	menu     CMSMenuService
	menuCode string
}

// NewCMSMenuRepository builds a menu repository with a default menu code.
func NewCMSMenuRepository(menu CMSMenuService, defaultCode string) *CMSMenuRepository {
	return &CMSMenuRepository{menu: menu, menuCode: defaultCode}
}

// List returns menu items for a menu code and locale.
func (r *CMSMenuRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.menu == nil {
		return nil, 0, ErrNotFound
	}
	code := r.menuCode
	if opts.Filters != nil {
		if c, ok := opts.Filters["menu"].(string); ok && c != "" {
			code = c
		}
	}
	locale := extractLocale(opts, "")
	menu, err := r.menu.Menu(ctx, code, locale)
	if err != nil {
		return nil, 0, err
	}
	flat := flattenMenuItems(menu.Items, "")
	search := strings.ToLower(extractSearch(opts))
	filtered := []MenuItem{}
	for _, item := range flat {
		if search != "" && !strings.Contains(strings.ToLower(item.Label), search) && !strings.Contains(strings.ToLower(item.Icon), search) {
			continue
		}
		filtered = append(filtered, item)
	}
	sliced, total := paginateMenu(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, item := range sliced {
		out = append(out, map[string]any{
			"id":          item.ID,
			"label":       item.Label,
			"icon":        item.Icon,
			"position":    item.Position,
			"locale":      item.Locale,
			"menu":        code,
			"parent_id":   item.ParentID,
			"target":      item.Target,
			"badge":       cloneAnyMap(item.Badge),
			"permissions": append([]string{}, item.Permissions...),
			"classes":     append([]string{}, item.Classes...),
			"styles":      cloneStringMap(item.Styles),
		})
	}
	return out, total, nil
}

// Get returns a single menu item by id.
func (r *CMSMenuRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	list, _, err := r.List(ctx, ListOptions{PerPage: 1000})
	if err != nil {
		return nil, err
	}
	for _, item := range list {
		if item["id"] == id {
			return item, nil
		}
	}
	return nil, ErrNotFound
}

// Create inserts a menu item.
func (r *CMSMenuRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.menu == nil {
		return nil, ErrNotFound
	}
	item, menuCode := mapToMenuItem(record, r.menuCode)
	if err := r.menu.AddMenuItem(ctx, menuCode, item); err != nil {
		return nil, err
	}
	if item.ID == "" {
		menu, _ := r.menu.Menu(ctx, menuCode, "")
		for _, mi := range flattenMenuItems(menu.Items, "") {
			if mi.Label == item.Label && mi.Locale == item.Locale && mi.ParentID == item.ParentID {
				item.ID = mi.ID
				break
			}
		}
	}
	return r.Get(ctx, item.ID)
}

// Update modifies a menu item.
func (r *CMSMenuRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.menu == nil {
		return nil, ErrNotFound
	}
	item, menuCode := mapToMenuItem(record, r.menuCode)
	item.ID = id
	if err := r.menu.UpdateMenuItem(ctx, menuCode, item); err != nil {
		return nil, err
	}
	return r.Get(ctx, id)
}

// Delete removes a menu item.
func (r *CMSMenuRepository) Delete(ctx context.Context, id string) error {
	if r.menu == nil {
		return ErrNotFound
	}
	return r.menu.DeleteMenuItem(ctx, r.menuCode, id)
}

// WidgetDefinitionRepository manages widget definitions through CMSWidgetService.
type WidgetDefinitionRepository struct {
	widgets CMSWidgetService
}

// NewWidgetDefinitionRepository builds a widget definition repository.
func NewWidgetDefinitionRepository(widgets CMSWidgetService) *WidgetDefinitionRepository {
	return &WidgetDefinitionRepository{widgets: widgets}
}

// List returns widget definitions.
func (r *WidgetDefinitionRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.widgets == nil {
		return nil, 0, ErrNotFound
	}
	defs := r.widgets.Definitions()
	search := strings.ToLower(extractSearch(opts))
	filtered := []WidgetDefinition{}
	for _, def := range defs {
		if search != "" && !strings.Contains(strings.ToLower(def.Name), search) && !strings.Contains(strings.ToLower(def.Code), search) {
			continue
		}
		filtered = append(filtered, def)
	}
	sliced, total := paginateWidgetDefs(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, def := range sliced {
		out = append(out, map[string]any{
			"code":   def.Code,
			"name":   def.Name,
			"schema": cloneAnyMap(def.Schema),
		})
	}
	return out, total, nil
}

// Get returns a widget definition by code.
func (r *WidgetDefinitionRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	list, _, err := r.List(ctx, ListOptions{PerPage: 1000})
	if err != nil {
		return nil, err
	}
	for _, def := range list {
		if def["code"] == id {
			return def, nil
		}
	}
	return nil, ErrNotFound
}

// Create registers a widget definition.
func (r *WidgetDefinitionRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.widgets == nil {
		return nil, ErrNotFound
	}
	def := mapToWidgetDefinition(record)
	if err := r.widgets.RegisterDefinition(ctx, def); err != nil {
		return nil, err
	}
	return map[string]any{
		"code":   def.Code,
		"name":   def.Name,
		"schema": cloneAnyMap(def.Schema),
	}, nil
}

// Update updates a widget definition (overwrites).
func (r *WidgetDefinitionRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.widgets == nil {
		return nil, ErrNotFound
	}
	def := mapToWidgetDefinition(record)
	if def.Code == "" {
		def.Code = id
	}
	if err := r.widgets.RegisterDefinition(ctx, def); err != nil {
		return nil, err
	}
	return map[string]any{
		"code":   def.Code,
		"name":   def.Name,
		"schema": cloneAnyMap(def.Schema),
	}, nil
}

// Delete removes a widget definition.
func (r *WidgetDefinitionRepository) Delete(ctx context.Context, id string) error {
	if r.widgets == nil {
		return ErrNotFound
	}
	return r.widgets.DeleteDefinition(ctx, id)
}

// WidgetInstanceRepository manages widget instances.
type WidgetInstanceRepository struct {
	widgets CMSWidgetService
}

// NewWidgetInstanceRepository builds a widget instance repository.
func NewWidgetInstanceRepository(widgets CMSWidgetService) *WidgetInstanceRepository {
	return &WidgetInstanceRepository{widgets: widgets}
}

// List returns widget instances filtered by area/page/locale.
func (r *WidgetInstanceRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.widgets == nil {
		return nil, 0, ErrNotFound
	}
	filter := WidgetInstanceFilter{
		Area:   stringFromFilter(opts.Filters, "area"),
		PageID: stringFromFilter(opts.Filters, "page_id"),
		Locale: extractLocale(opts, ""),
	}
	instances, err := r.widgets.ListInstances(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	filtered := []WidgetInstance{}
	for _, inst := range instances {
		if search != "" && !strings.Contains(strings.ToLower(inst.DefinitionCode), search) && !strings.Contains(strings.ToLower(inst.Area), search) {
			continue
		}
		filtered = append(filtered, inst)
	}
	sliced, total := paginateWidgetInstances(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, inst := range sliced {
		out = append(out, map[string]any{
			"id":              inst.ID,
			"definition_code": inst.DefinitionCode,
			"area":            inst.Area,
			"page_id":         inst.PageID,
			"locale":          inst.Locale,
			"config":          cloneAnyMap(inst.Config),
			"position":        inst.Position,
		})
	}
	return out, total, nil
}

// Get returns a widget instance by id.
func (r *WidgetInstanceRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	list, _, err := r.List(ctx, ListOptions{PerPage: 1000})
	if err != nil {
		return nil, err
	}
	for _, inst := range list {
		if inst["id"] == id {
			return inst, nil
		}
	}
	return nil, ErrNotFound
}

// Create saves a widget instance.
func (r *WidgetInstanceRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.widgets == nil {
		return nil, ErrNotFound
	}
	instance := mapToWidgetInstance(record)
	created, err := r.widgets.SaveInstance(ctx, instance)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":              created.ID,
		"definition_code": created.DefinitionCode,
		"area":            created.Area,
		"page_id":         created.PageID,
		"locale":          created.Locale,
		"config":          cloneAnyMap(created.Config),
		"position":        created.Position,
	}, nil
}

// Update modifies a widget instance.
func (r *WidgetInstanceRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.widgets == nil {
		return nil, ErrNotFound
	}
	instance := mapToWidgetInstance(record)
	instance.ID = id
	updated, err := r.widgets.SaveInstance(ctx, instance)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":              updated.ID,
		"definition_code": updated.DefinitionCode,
		"area":            updated.Area,
		"page_id":         updated.PageID,
		"locale":          updated.Locale,
		"config":          cloneAnyMap(updated.Config),
		"position":        updated.Position,
	}, nil
}

// Delete removes a widget instance.
func (r *WidgetInstanceRepository) Delete(ctx context.Context, id string) error {
	if r.widgets == nil {
		return ErrNotFound
	}
	return r.widgets.DeleteInstance(ctx, id)
}

func mapToCMSPage(record map[string]any) CMSPage {
	page := CMSPage{
		Data: map[string]any{},
		SEO:  map[string]any{},
	}
	if record == nil {
		return page
	}
	if id, ok := record["id"].(string); ok {
		page.ID = id
	}
	if title, ok := record["title"].(string); ok {
		page.Title = title
	}
	if slug, ok := record["slug"].(string); ok {
		page.Slug = slug
	}
	if locale, ok := record["locale"].(string); ok {
		page.Locale = locale
	}
	if parentID, ok := record["parent_id"].(string); ok {
		page.ParentID = parentID
	}
	if status, ok := record["status"].(string); ok {
		page.Status = status
	}
	if blocks, ok := record["blocks"].([]string); ok {
		page.Blocks = append([]string{}, blocks...)
	} else if blocksAny, ok := record["blocks"].([]any); ok {
		for _, b := range blocksAny {
			if bs, ok := b.(string); ok {
				page.Blocks = append(page.Blocks, bs)
			}
		}
	}
	if seo, ok := record["seo"].(map[string]any); ok {
		page.SEO = cloneAnyMap(seo)
	}
	if data, ok := record["data"].(map[string]any); ok {
		page.Data = cloneAnyMap(data)
	}
	if preview, ok := record["preview_url"].(string); ok {
		page.PreviewURL = preview
	}
	if tpl, ok := record["template_id"].(string); ok {
		page.TemplateID = tpl
	}
	if tpl, ok := record["template"].(string); ok && page.TemplateID == "" {
		page.TemplateID = tpl
	}
	return page
}

func mapToCMSContent(record map[string]any) CMSContent {
	content := CMSContent{
		Data: map[string]any{},
	}
	if record == nil {
		return content
	}
	if id, ok := record["id"].(string); ok {
		content.ID = id
	}
	if title, ok := record["title"].(string); ok {
		content.Title = title
	}
	if slug, ok := record["slug"].(string); ok {
		content.Slug = slug
	}
	if locale, ok := record["locale"].(string); ok {
		content.Locale = locale
	}
	if status, ok := record["status"].(string); ok {
		content.Status = status
	}
	if ctype, ok := record["content_type"].(string); ok {
		content.ContentType = ctype
	}
	if blocks, ok := record["blocks"].([]string); ok {
		content.Blocks = append([]string{}, blocks...)
	} else if blocksAny, ok := record["blocks"].([]any); ok {
		for _, b := range blocksAny {
			if bs, ok := b.(string); ok {
				content.Blocks = append(content.Blocks, bs)
			}
		}
	}
	if data, ok := record["data"].(map[string]any); ok {
		content.Data = cloneAnyMap(data)
	}
	return content
}

func mapToCMSBlockDefinition(record map[string]any) CMSBlockDefinition {
	def := CMSBlockDefinition{}
	if record == nil {
		return def
	}
	if id, ok := record["id"].(string); ok {
		def.ID = id
	}
	if name, ok := record["name"].(string); ok {
		def.Name = name
	}
	if typ, ok := record["type"].(string); ok {
		def.Type = typ
	}
	if schema, ok := record["schema"].(map[string]any); ok {
		def.Schema = cloneAnyMap(schema)
	} else if raw, ok := record["schema"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			def.Schema = m
		}
	}
	if locale, ok := record["locale"].(string); ok {
		def.Locale = locale
	}
	return def
}

func mapToCMSBlock(record map[string]any) CMSBlock {
	block := CMSBlock{
		Data: map[string]any{},
	}
	if record == nil {
		return block
	}
	if id, ok := record["id"].(string); ok {
		block.ID = id
	}
	if defID, ok := record["definition_id"].(string); ok {
		block.DefinitionID = defID
	}
	if contentID, ok := record["content_id"].(string); ok {
		block.ContentID = contentID
	}
	if region, ok := record["region"].(string); ok {
		block.Region = region
	}
	if locale, ok := record["locale"].(string); ok {
		block.Locale = locale
	}
	if status, ok := record["status"].(string); ok {
		block.Status = status
	}
	if pos, ok := record["position"].(int); ok {
		block.Position = pos
	} else if posf, ok := record["position"].(float64); ok {
		block.Position = int(posf)
	}
	if data, ok := record["data"].(map[string]any); ok {
		block.Data = cloneAnyMap(data)
	} else if raw, ok := record["data"].(string); ok && raw != "" {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			block.Data = parsed
		}
	}
	if btype, ok := record["block_type"].(string); ok {
		block.BlockType = btype
	}
	if key, ok := record["block_schema_key"].(string); ok {
		block.BlockSchemaKey = key
	}
	return block
}

func mapToMenuItem(record map[string]any, defaultMenu string) (MenuItem, string) {
	item := MenuItem{}
	menuCode := defaultMenu
	if record == nil {
		return item, menuCode
	}
	if id, ok := record["id"].(string); ok {
		item.ID = id
	}
	if label, ok := record["label"].(string); ok {
		item.Label = label
	}
	if icon, ok := record["icon"].(string); ok {
		item.Icon = icon
	}
	if pos, ok := record["position"].(int); ok {
		item.Position = pos
	} else if posf, ok := record["position"].(float64); ok {
		item.Position = int(posf)
	}
	if locale, ok := record["locale"].(string); ok {
		item.Locale = locale
	}
	if parent, ok := record["parent_id"].(string); ok {
		item.ParentID = parent
	}
	if badge, ok := record["badge"].(map[string]any); ok {
		item.Badge = cloneAnyMap(badge)
	}
	if perms, ok := record["permissions"].([]string); ok {
		item.Permissions = append([]string{}, perms...)
	} else if permsAny, ok := record["permissions"].([]any); ok {
		for _, p := range permsAny {
			if ps, ok := p.(string); ok {
				item.Permissions = append(item.Permissions, ps)
			}
		}
	}
	if classes, ok := record["classes"].([]string); ok {
		item.Classes = append([]string{}, classes...)
	} else if classesAny, ok := record["classes"].([]any); ok {
		for _, c := range classesAny {
			if cs, ok := c.(string); ok {
				item.Classes = append(item.Classes, cs)
			}
		}
	}
	if styles, ok := record["styles"].(map[string]string); ok {
		item.Styles = cloneStringMap(styles)
	} else if stylesAny, ok := record["styles"].(map[string]any); ok {
		item.Styles = map[string]string{}
		for k, v := range stylesAny {
			if vs, ok := v.(string); ok {
				item.Styles[k] = vs
			}
		}
	}
	if target, ok := record["target"].(map[string]any); ok {
		item.Target = cloneAnyMap(target)
	}
	if menu, ok := record["menu"].(string); ok && menu != "" {
		menuCode = menu
	}
	item.Menu = menuCode
	return item, menuCode
}

func mapToWidgetDefinition(record map[string]any) WidgetDefinition {
	def := WidgetDefinition{}
	if record == nil {
		return def
	}
	if code, ok := record["code"].(string); ok {
		def.Code = code
	}
	if name, ok := record["name"].(string); ok {
		def.Name = name
	}
	if schema, ok := record["schema"].(map[string]any); ok {
		def.Schema = cloneAnyMap(schema)
	} else if raw, ok := record["schema"].(string); ok && raw != "" {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			def.Schema = parsed
		}
	}
	return def
}

func mapToWidgetInstance(record map[string]any) WidgetInstance {
	inst := WidgetInstance{Config: map[string]any{}}
	if record == nil {
		return inst
	}
	if id, ok := record["id"].(string); ok {
		inst.ID = id
	}
	if code, ok := record["definition_code"].(string); ok {
		inst.DefinitionCode = code
	}
	if area, ok := record["area"].(string); ok {
		inst.Area = area
	}
	if pageID, ok := record["page_id"].(string); ok {
		inst.PageID = pageID
	}
	if locale, ok := record["locale"].(string); ok {
		inst.Locale = locale
	}
	if pos, ok := record["position"].(int); ok {
		inst.Position = pos
	} else if posf, ok := record["position"].(float64); ok {
		inst.Position = int(posf)
	}
	if cfg, ok := record["config"].(map[string]any); ok {
		inst.Config = cloneAnyMap(cfg)
	} else if raw, ok := record["config"].(string); ok && raw != "" {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			inst.Config = parsed
		}
	}
	return inst
}

func extractLocale(opts ListOptions, fallback string) string {
	if opts.Filters != nil {
		if loc, ok := opts.Filters["locale"].(string); ok && loc != "" {
			return loc
		}
		if loc, ok := opts.Filters["Locale"].(string); ok && loc != "" {
			return loc
		}
	}
	if fallback != "" {
		return fallback
	}
	return ""
}

func (r *CMSContentRepository) resolveContentLocale(ctx context.Context, id string) string {
	if r == nil || r.content == nil || strings.TrimSpace(id) == "" {
		return ""
	}
	items, err := r.content.Contents(ctx, "")
	if err != nil {
		return ""
	}
	for _, item := range items {
		if item.ID == id {
			return item.Locale
		}
	}
	return ""
}

func (r *CMSPageRepository) resolvePageLocale(ctx context.Context, id string) string {
	if r == nil || r.content == nil || strings.TrimSpace(id) == "" {
		return ""
	}
	pages, err := r.content.Pages(ctx, "")
	if err != nil {
		return ""
	}
	for _, page := range pages {
		if page.ID == id {
			return page.Locale
		}
	}
	return ""
}

func extractSearch(opts ListOptions) string {
	if opts.Search != "" {
		return opts.Search
	}
	if opts.Filters != nil {
		if s, ok := opts.Filters["_search"].(string); ok {
			return s
		}
	}
	return ""
}

func paginateCMS[T any](items []T, opts ListOptions) ([]T, int) {
	total := len(items)
	pageNum := opts.Page
	if pageNum < 1 {
		pageNum = 1
	}
	per := opts.PerPage
	if per <= 0 {
		per = 10
	}
	start := (pageNum - 1) * per
	if start > total {
		return []T{}, total
	}
	end := start + per
	if end > total {
		end = total
	}
	return items[start:end], total
}

func paginateMenu(items []MenuItem, opts ListOptions) ([]MenuItem, int) {
	return paginateCMS(items, opts)
}

func paginateWidgetDefs(items []WidgetDefinition, opts ListOptions) ([]WidgetDefinition, int) {
	return paginateCMS(items, opts)
}

func paginateWidgetInstances(items []WidgetInstance, opts ListOptions) ([]WidgetInstance, int) {
	return paginateCMS(items, opts)
}

func flattenMenuItems(items []MenuItem, parent string) []MenuItem {
	out := []MenuItem{}
	for _, item := range items {
		item.ParentID = parent
		out = append(out, item)
		if len(item.Children) > 0 {
			out = append(out, flattenMenuItems(item.Children, item.ID)...)
		}
	}
	return out
}

func stringFromFilter(filters map[string]any, key string) string {
	if filters == nil {
		return ""
	}
	if v, ok := filters[key].(string); ok {
		return v
	}
	return ""
}

func cloneAnyMap(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}
