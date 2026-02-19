package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
)

// CMSBlockDefinitionRepository manages block definitions through CMSContentService.
type CMSBlockDefinitionRepository struct {
	content CMSContentService
	types   CMSContentTypeService
}

// NewCMSBlockDefinitionRepository builds a block definition repository.
func NewCMSBlockDefinitionRepository(content CMSContentService, types CMSContentTypeService) *CMSBlockDefinitionRepository {
	return &CMSBlockDefinitionRepository{content: content, types: types}
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
	categoryFilter := ""
	statusFilter := ""
	environment := ""
	hasEnvironmentFilter := false
	if opts.Filters != nil {
		categoryFilter = strings.ToLower(strings.TrimSpace(toString(opts.Filters["category"])))
		statusFilter = strings.ToLower(strings.TrimSpace(toString(opts.Filters["status"])))
		environment = strings.TrimSpace(toString(opts.Filters["environment"]))
	}
	if environment == "" {
		environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	if environment != "" {
		hasEnvironmentFilter = true
	}
	filtered := []CMSBlockDefinition{}
	for _, def := range defs {
		if hasEnvironmentFilter && !cmsEnvironmentMatches(def.Environment, environment) {
			continue
		}
		if search != "" &&
			!strings.Contains(strings.ToLower(def.Name), search) &&
			!strings.Contains(strings.ToLower(def.Type), search) &&
			!strings.Contains(strings.ToLower(def.Slug), search) {
			continue
		}
		if categoryFilter != "" && strings.ToLower(strings.TrimSpace(def.Category)) != categoryFilter {
			continue
		}
		if statusFilter != "" && strings.ToLower(strings.TrimSpace(def.Status)) != statusFilter {
			continue
		}
		filtered = append(filtered, def)
	}
	allowedTypes := map[string]struct{}{}
	restricted := false
	if opts.Filters != nil && r.types != nil {
		contentTypeKey := strings.TrimSpace(toString(opts.Filters["content_type"]))
		if contentTypeKey == "" {
			contentTypeKey = strings.TrimSpace(toString(opts.Filters["content_type_slug"]))
		}
		if contentTypeKey == "" {
			contentTypeKey = strings.TrimSpace(toString(opts.Filters["content_type_id"]))
		}
		if contentTypeKey != "" {
			if ct := r.resolveContentType(ctx, contentTypeKey); ct != nil {
				if types, ok := blockTypesFromContentType(*ct); ok {
					restricted = true
					for _, t := range types {
						for _, candidate := range blockTypeAliasCandidates(strings.ToLower(strings.TrimSpace(t))) {
							trimmed := strings.ToLower(strings.TrimSpace(candidate))
							if trimmed == "" {
								continue
							}
							allowedTypes[trimmed] = struct{}{}
						}
					}
				}
			}
		}
	}
	if restricted {
		filteredDefs := make([]CMSBlockDefinition, 0, len(filtered))
		for _, def := range filtered {
			if len(allowedTypes) == 0 {
				break
			}
			if blockDefinitionMatchesAllowedTypes(def, allowedTypes) {
				filteredDefs = append(filteredDefs, def)
			}
		}
		filtered = filteredDefs
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, def := range sliced {
		slug := strings.TrimSpace(def.Slug)
		if slug == "" {
			slug = strings.TrimSpace(schemaSlugFromSchema(def.Schema))
		}
		typ := strings.TrimSpace(def.Type)
		if typ == "" {
			typ = strings.TrimSpace(schemaBlockTypeFromSchema(def.Schema))
		}
		if typ == "" {
			typ = strings.TrimSpace(primitives.FirstNonEmptyRaw(slug, def.ID, def.Name))
		}
		if slug == "" {
			slug = typ
		}
		category := strings.TrimSpace(def.Category)
		if category == "" {
			category = strings.TrimSpace(schemaCategoryFromSchema(def.Schema))
		}
		if category == "" {
			category = "custom"
		}
		status := strings.TrimSpace(def.Status)
		if status == "" {
			status = strings.TrimSpace(schemaStatusFromSchema(def.Schema))
		}
		if status == "" {
			status = "draft"
		}
		schemaVersion := blockDefinitionSchemaVersion(def)
		migrationStatus := blockDefinitionMigrationStatus(def)
		out = append(out, map[string]any{
			"id":               def.ID,
			"name":             def.Name,
			"slug":             slug,
			"type":             typ,
			"description":      def.Description,
			"icon":             def.Icon,
			"category":         category,
			"status":           status,
			"environment":      def.Environment,
			"schema":           primitives.CloneAnyMap(def.Schema),
			"ui_schema":        primitives.CloneAnyMap(def.UISchema),
			"schema_version":   schemaVersion,
			"migration_status": migrationStatus,
			"locale":           def.Locale,
		})
	}
	return out, total, nil
}

// Get returns a single block definition.
func (r *CMSBlockDefinitionRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	target := strings.TrimSpace(id)
	if target == "" {
		return nil, ErrNotFound
	}
	defs, err := r.content.BlockDefinitions(ctx)
	if err != nil {
		return nil, err
	}
	environment := strings.TrimSpace(environmentFromContext(ctx))
	hasEnvironmentFilter := environment != ""
	for _, def := range defs {
		if hasEnvironmentFilter && !cmsEnvironmentMatches(def.Environment, environment) {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(def.ID), target) ||
			strings.EqualFold(strings.TrimSpace(def.Slug), target) ||
			strings.EqualFold(strings.TrimSpace(def.Type), target) {
			slug := strings.TrimSpace(def.Slug)
			if slug == "" {
				slug = strings.TrimSpace(schemaSlugFromSchema(def.Schema))
			}
			typ := strings.TrimSpace(def.Type)
			if typ == "" {
				typ = strings.TrimSpace(schemaBlockTypeFromSchema(def.Schema))
			}
			if typ == "" {
				typ = strings.TrimSpace(primitives.FirstNonEmptyRaw(slug, def.ID, def.Name))
			}
			if slug == "" {
				slug = typ
			}
			category := strings.TrimSpace(def.Category)
			if category == "" {
				category = strings.TrimSpace(schemaCategoryFromSchema(def.Schema))
			}
			if category == "" {
				category = "custom"
			}
			status := strings.TrimSpace(def.Status)
			if status == "" {
				status = strings.TrimSpace(schemaStatusFromSchema(def.Schema))
			}
			if status == "" {
				status = "draft"
			}
			schemaVersion := blockDefinitionSchemaVersion(def)
			migrationStatus := blockDefinitionMigrationStatus(def)
			return map[string]any{
				"id":               def.ID,
				"name":             def.Name,
				"slug":             slug,
				"type":             typ,
				"description":      def.Description,
				"icon":             def.Icon,
				"category":         category,
				"status":           status,
				"environment":      def.Environment,
				"schema":           primitives.CloneAnyMap(def.Schema),
				"ui_schema":        primitives.CloneAnyMap(def.UISchema),
				"schema_version":   schemaVersion,
				"migration_status": migrationStatus,
				"locale":           def.Locale,
			}, nil
		}
	}
	return nil, ErrNotFound
}

func (r *CMSBlockDefinitionRepository) findBlockDefinition(ctx context.Context, id, environment string) (*CMSBlockDefinition, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	target := strings.TrimSpace(id)
	if target == "" {
		return nil, ErrNotFound
	}
	defs, err := r.content.BlockDefinitions(ctx)
	if err != nil {
		return nil, err
	}
	env := strings.TrimSpace(environment)
	hasEnvironmentFilter := env != ""
	for _, def := range defs {
		if hasEnvironmentFilter && !cmsEnvironmentMatches(def.Environment, env) {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(def.ID), target) ||
			strings.EqualFold(strings.TrimSpace(def.Slug), target) ||
			strings.EqualFold(strings.TrimSpace(def.Type), target) {
			copy := def
			return &copy, nil
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
	if def.Environment == "" {
		def.Environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	applyBlockDefinitionDefaults(&def)
	created, err := r.content.CreateBlockDefinition(ctx, def)
	if err != nil {
		return nil, err
	}
	schemaVersion := blockDefinitionSchemaVersion(*created)
	migrationStatus := blockDefinitionMigrationStatus(*created)
	return map[string]any{
		"id":               created.ID,
		"name":             created.Name,
		"slug":             created.Slug,
		"type":             created.Type,
		"description":      created.Description,
		"icon":             created.Icon,
		"category":         created.Category,
		"status":           created.Status,
		"environment":      created.Environment,
		"schema":           primitives.CloneAnyMap(created.Schema),
		"ui_schema":        primitives.CloneAnyMap(created.UISchema),
		"schema_version":   schemaVersion,
		"migration_status": migrationStatus,
		"locale":           created.Locale,
	}, nil
}

// Update modifies a block definition.
func (r *CMSBlockDefinitionRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	def := mapToCMSBlockDefinition(record)
	if def.Environment == "" {
		def.Environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	def.ID = id
	if existing, err := r.findBlockDefinition(ctx, id, def.Environment); err == nil && existing != nil {
		if strings.TrimSpace(def.Name) == "" {
			def.Name = existing.Name
		}
		if strings.TrimSpace(def.Slug) == "" {
			def.Slug = existing.Slug
		}
		if strings.TrimSpace(def.Type) == "" {
			def.Type = existing.Type
		}
		if strings.TrimSpace(def.Status) == "" {
			def.Status = existing.Status
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
		if def.Schema == nil {
			def.Schema = existing.Schema
		}
		if def.UISchema == nil {
			def.UISchema = existing.UISchema
		}
	}
	applyBlockDefinitionDefaults(&def)
	updated, err := r.content.UpdateBlockDefinition(ctx, def)
	if err != nil {
		return nil, err
	}
	schemaVersion := blockDefinitionSchemaVersion(*updated)
	migrationStatus := blockDefinitionMigrationStatus(*updated)
	return map[string]any{
		"id":               updated.ID,
		"name":             updated.Name,
		"slug":             updated.Slug,
		"type":             updated.Type,
		"description":      updated.Description,
		"icon":             updated.Icon,
		"category":         updated.Category,
		"status":           updated.Status,
		"environment":      updated.Environment,
		"schema":           primitives.CloneAnyMap(updated.Schema),
		"ui_schema":        primitives.CloneAnyMap(updated.UISchema),
		"schema_version":   schemaVersion,
		"migration_status": migrationStatus,
		"locale":           updated.Locale,
	}, nil
}

// Delete removes a block definition.
func (r *CMSBlockDefinitionRepository) Delete(ctx context.Context, id string) error {
	if r.content == nil {
		return ErrNotFound
	}
	return r.content.DeleteBlockDefinition(ctx, id)
}

func (r *CMSBlockDefinitionRepository) resolveContentType(ctx context.Context, key string) *CMSContentType {
	if r == nil || r.types == nil || strings.TrimSpace(key) == "" {
		return nil
	}
	key = strings.TrimSpace(key)
	if ct, err := r.types.ContentTypeBySlug(ctx, key); err == nil && ct != nil {
		return ct
	}
	if ct, err := r.types.ContentType(ctx, key); err == nil && ct != nil {
		return ct
	}
	types, err := r.types.ContentTypes(ctx)
	if err != nil {
		return nil
	}
	needle := strings.ToLower(key)
	for _, ct := range types {
		if strings.ToLower(ct.Slug) == needle || strings.ToLower(ct.Name) == needle || strings.ToLower(ct.ID) == needle {
			copy := ct
			return &copy
		}
	}
	return nil
}

func blockDefinitionMatchesAllowedTypes(def CMSBlockDefinition, allowed map[string]struct{}) bool {
	if len(allowed) == 0 {
		return false
	}
	candidates := []string{
		strings.TrimSpace(blockDefinitionType(def)),
		strings.TrimSpace(def.Slug),
		strings.TrimSpace(def.Type),
		strings.TrimSpace(def.ID),
		strings.TrimSpace(def.Name),
		strings.TrimSpace(schemaBlockTypeFromSchema(def.Schema)),
	}
	for _, value := range candidates {
		if value == "" {
			continue
		}
		for _, alias := range blockTypeAliasCandidates(strings.ToLower(strings.TrimSpace(value))) {
			key := strings.ToLower(strings.TrimSpace(alias))
			if key == "" {
				continue
			}
			if _, ok := allowed[key]; ok {
				return true
			}
		}
	}
	return false
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
	if err := ensureCMSContentService(r.content); err != nil {
		return nil, 0, err
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
		out = append(out, cmsBlockRecord(blk))
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
	if err := ensureCMSContentService(r.content); err != nil {
		return nil, err
	}
	block := mapToCMSBlock(record)
	created, err := r.content.SaveBlock(ctx, block)
	if err != nil {
		return nil, err
	}
	return cmsBlockRecord(*created), nil
}

// Update modifies an existing block.
func (r *CMSBlockRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if err := ensureCMSContentService(r.content); err != nil {
		return nil, err
	}
	block := mapToCMSBlock(record)
	block.ID = id
	updated, err := r.content.SaveBlock(ctx, block)
	if err != nil {
		return nil, err
	}
	return cmsBlockRecord(*updated), nil
}

// Delete removes a block.
func (r *CMSBlockRepository) Delete(ctx context.Context, id string) error {
	if err := ensureCMSContentService(r.content); err != nil {
		return err
	}
	return r.content.DeleteBlock(ctx, id)
}
