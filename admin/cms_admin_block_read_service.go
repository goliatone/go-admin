package admin

import (
	"context"
	"strings"

	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	"github.com/goliatone/go-admin/internal/primitives"
)

// AdminBlockReadService provides admin-shaped read operations for CMS blocks and block definitions.
type AdminBlockReadService interface {
	ListDefinitions(ctx context.Context, opts ListOptions) ([]map[string]any, int, error)
	GetDefinition(ctx context.Context, id string) (map[string]any, error)
	ListBlocks(ctx context.Context, opts ListOptions) ([]map[string]any, int, error)
	GetBlock(ctx context.Context, id string) (map[string]any, error)
}

type goCMSAdminBlockReadService struct {
	content CMSContentService
	types   CMSContentTypeService
}

// NewAdminBlockReadService builds the local admin block read-service boundary.
func NewAdminBlockReadService(content CMSContentService, types ...CMSContentTypeService) AdminBlockReadService {
	return newAdminBlockReadService(content, types...)
}

func newAdminBlockReadService(content CMSContentService, types ...CMSContentTypeService) goCMSAdminBlockReadService {
	service := goCMSAdminBlockReadService{content: content}
	if len(types) > 0 {
		service.types = types[0]
	}
	return service
}

func (s goCMSAdminBlockReadService) ListDefinitions(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if s.content == nil {
		return nil, 0, ErrNotFound
	}
	defs, err := s.content.BlockDefinitions(ctx)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	categoryFilter := ""
	statusFilter := ""
	channel := ""
	hasChannelFilter := false
	if opts.Filters != nil {
		categoryFilter = strings.ToLower(strings.TrimSpace(toString(opts.Filters["category"])))
		statusFilter = strings.ToLower(strings.TrimSpace(toString(opts.Filters["status"])))
		channel = strings.TrimSpace(primitives.FirstNonEmptyRaw(
			toString(opts.Filters[ContentChannelScopeQueryParam]),
			toString(opts.Filters["channel"]),
			toString(opts.Filters["content_channel"]),
			toString(opts.Filters["environment"]),
		))
	}
	if channel == "" {
		channel = cmsContentChannelFromContext(ctx, "")
	}
	if channel != "" {
		hasChannelFilter = true
	}
	filtered := []CMSBlockDefinition{}
	for _, def := range defs {
		if hasChannelFilter && !cmsadapter.ChannelsMatch(cmsadapter.BlockDefinitionChannel(def), channel) {
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
	if opts.Filters != nil && s.types != nil {
		contentTypeKey := strings.TrimSpace(toString(opts.Filters["content_type"]))
		if contentTypeKey == "" {
			contentTypeKey = strings.TrimSpace(toString(opts.Filters["content_type_slug"]))
		}
		if contentTypeKey == "" {
			contentTypeKey = strings.TrimSpace(toString(opts.Filters["content_type_id"]))
		}
		if contentTypeKey != "" {
			if ct := s.resolveContentType(ctx, contentTypeKey); ct != nil {
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
		out = append(out, adminBlockDefinitionRecord(def))
	}
	return out, total, nil
}

func (s goCMSAdminBlockReadService) GetDefinition(ctx context.Context, id string) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	target := strings.TrimSpace(id)
	if target == "" {
		return nil, ErrNotFound
	}
	defs, err := s.content.BlockDefinitions(ctx)
	if err != nil {
		return nil, err
	}
	channel := cmsContentChannelFromContext(ctx, "")
	hasChannelFilter := channel != ""
	for _, def := range defs {
		if hasChannelFilter && !cmsadapter.ChannelsMatch(cmsadapter.BlockDefinitionChannel(def), channel) {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(def.ID), target) ||
			strings.EqualFold(strings.TrimSpace(def.Slug), target) ||
			strings.EqualFold(strings.TrimSpace(def.Type), target) {
			return adminBlockDefinitionRecord(def), nil
		}
	}
	return nil, ErrNotFound
}

func (s goCMSAdminBlockReadService) ListBlocks(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	blocks, err := s.listBlocks(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	sliced, total := paginateCMS(blocks, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, blk := range sliced {
		out = append(out, cmsBlockRecord(blk))
	}
	return out, total, nil
}

func (s goCMSAdminBlockReadService) GetBlock(ctx context.Context, id string) (map[string]any, error) {
	blocks, err := s.listBlocks(ctx, ListOptions{})
	if err != nil {
		return nil, err
	}
	for _, blk := range blocks {
		if blk.ID == id {
			return cmsBlockRecord(blk), nil
		}
	}
	return nil, ErrNotFound
}

func (s goCMSAdminBlockReadService) listBlocks(ctx context.Context, opts ListOptions) ([]CMSBlock, error) {
	if err := ensureCMSContentService(s.content); err != nil {
		return nil, err
	}
	locale := extractLocale(opts, "")
	contentIDs := []string{}
	if opts.Filters != nil {
		if cid, ok := opts.Filters["content_id"].(string); ok && cid != "" {
			contentIDs = append(contentIDs, cid)
		}
	}
	if len(contentIDs) == 0 {
		if contents, err := s.content.Contents(ctx, ""); err == nil {
			for _, c := range contents {
				contentIDs = append(contentIDs, c.ID)
			}
		}
		if pages, err := s.content.Pages(ctx, ""); err == nil {
			for _, p := range pages {
				contentIDs = append(contentIDs, p.ID)
			}
		}
	}
	blocks := []CMSBlock{}
	for _, cid := range contentIDs {
		items, _ := s.content.BlocksForContent(ctx, cid, locale)
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
	return filtered, nil
}

func (s goCMSAdminBlockReadService) resolveContentType(ctx context.Context, key string) *CMSContentType {
	if s.types == nil || strings.TrimSpace(key) == "" {
		return nil
	}
	key = strings.TrimSpace(key)
	if ct, err := s.types.ContentTypeBySlug(ctx, key); err == nil && ct != nil {
		return ct
	}
	if ct, err := s.types.ContentType(ctx, key); err == nil && ct != nil {
		return ct
	}
	types, err := s.types.ContentTypes(ctx)
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

func adminBlockDefinitionRecord(def CMSBlockDefinition) map[string]any {
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
		"channel":          cmsadapter.BlockDefinitionChannel(def),
		"environment":      cmsadapter.BlockDefinitionChannel(def),
		"schema":           primitives.CloneAnyMap(def.Schema),
		"ui_schema":        primitives.CloneAnyMap(def.UISchema),
		"schema_version":   schemaVersion,
		"migration_status": migrationStatus,
		"locale":           def.Locale,
	}
}
