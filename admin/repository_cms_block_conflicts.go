package admin

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
)

// CMSBlockConflictRepository reports mismatches between embedded and legacy blocks.
type CMSBlockConflictRepository struct {
	content CMSContentService
}

// NewCMSBlockConflictRepository builds a conflict repository.
func NewCMSBlockConflictRepository(content CMSContentService) *CMSBlockConflictRepository {
	return &CMSBlockConflictRepository{content: content}
}

type cmsBlockConflict struct {
	ID             string
	EntityID       string
	EntityType     string
	Title          string
	ContentType    string
	Locale         string
	EmbeddedBlocks []map[string]any
	LegacyBlocks   []CMSBlock
	EmbeddedTypes  []string
	LegacyTypes    []string
}

func (c cmsBlockConflict) summary() map[string]any {
	return map[string]any{
		"id":             c.ID,
		"entity_id":      c.EntityID,
		"entity_type":    c.EntityType,
		"title":          c.Title,
		"content_type":   c.ContentType,
		"locale":         c.Locale,
		"embedded_count": len(c.EmbeddedBlocks),
		"legacy_count":   len(c.LegacyBlocks),
		"embedded_types": strings.Join(c.EmbeddedTypes, ", "),
		"legacy_types":   strings.Join(c.LegacyTypes, ", "),
	}
}

func (c cmsBlockConflict) detail() map[string]any {
	payload := c.summary()
	payload["embedded_blocks"] = formatBlocksJSON(c.EmbeddedBlocks)
	payload["legacy_blocks"] = formatBlocksJSON(c.LegacyBlocks)
	return payload
}

func formatBlocksJSON(value any) string {
	if value == nil {
		return ""
	}
	payload, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(payload)
}

// List returns block conflicts.
func (r *CMSBlockConflictRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	conflicts, err := r.collectConflicts(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	sliced, total := paginateCMS(conflicts, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, conflict := range sliced {
		out = append(out, conflict.summary())
	}
	return out, total, nil
}

// Get returns conflict detail by id.
func (r *CMSBlockConflictRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	conflicts, err := r.collectConflicts(ctx, ListOptions{PerPage: 10000})
	if err != nil {
		return nil, err
	}
	for _, conflict := range conflicts {
		if conflict.ID == id {
			return conflict.detail(), nil
		}
	}
	return nil, ErrNotFound
}

// Create is not supported.
func (r *CMSBlockConflictRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return nil, ErrForbidden
}

// Update is not supported.
func (r *CMSBlockConflictRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	return nil, ErrForbidden
}

// Delete is not supported.
func (r *CMSBlockConflictRepository) Delete(ctx context.Context, id string) error {
	return ErrForbidden
}

func (r *CMSBlockConflictRepository) collectConflicts(ctx context.Context, opts ListOptions) ([]cmsBlockConflict, error) {
	if r == nil || r.content == nil {
		return nil, ErrNotFound
	}
	locale := extractLocale(opts, "")
	filters := opts.Filters
	if filters == nil {
		filters = map[string]any{}
	}
	entityFilter := strings.ToLower(strings.TrimSpace(toString(filters["entity_type"])))
	contentTypeFilter := strings.ToLower(strings.TrimSpace(toString(filters["content_type"])))
	if contentTypeFilter == "" {
		contentTypeFilter = strings.ToLower(strings.TrimSpace(toString(filters["content_type_slug"])))
	}
	if contentTypeFilter == "" {
		contentTypeFilter = strings.ToLower(strings.TrimSpace(toString(filters["content_type_id"])))
	}
	search := strings.ToLower(extractSearch(opts))
	conflicts := []cmsBlockConflict{}

	if entityFilter == "" || entityFilter == "content" {
		items, err := r.content.Contents(ctx, locale)
		if err != nil {
			return nil, err
		}
		for _, item := range items {
			contentType := firstNonEmpty(item.ContentTypeSlug, item.ContentType)
			if contentTypeFilter != "" && strings.ToLower(contentType) != contentTypeFilter {
				continue
			}
			if search != "" && !strings.Contains(strings.ToLower(item.Title), search) && !strings.Contains(strings.ToLower(item.Slug), search) {
				continue
			}
			conflict, ok, err := r.buildConflict(ctx, "content", item.ID, item.Title, contentType, item.Locale, item.EmbeddedBlocks, item.Data)
			if err != nil {
				return nil, err
			}
			if ok {
				conflicts = append(conflicts, conflict)
			}
		}
	}

	if entityFilter == "" || entityFilter == "page" {
		pages, err := r.content.Pages(ctx, locale)
		if err != nil {
			return nil, err
		}
		for _, page := range pages {
			if contentTypeFilter != "" && contentTypeFilter != "page" {
				continue
			}
			if search != "" && !strings.Contains(strings.ToLower(page.Title), search) && !strings.Contains(strings.ToLower(page.Slug), search) {
				continue
			}
			conflict, ok, err := r.buildConflict(ctx, "page", page.ID, page.Title, "page", page.Locale, page.EmbeddedBlocks, page.Data)
			if err != nil {
				return nil, err
			}
			if ok {
				conflicts = append(conflicts, conflict)
			}
		}
	}

	sort.SliceStable(conflicts, func(i, j int) bool {
		if conflicts[i].EntityType == conflicts[j].EntityType {
			return conflicts[i].Title < conflicts[j].Title
		}
		return conflicts[i].EntityType < conflicts[j].EntityType
	})
	return conflicts, nil
}

func (r *CMSBlockConflictRepository) buildConflict(ctx context.Context, entityType, entityID, title, contentType, locale string, embedded []map[string]any, data map[string]any) (cmsBlockConflict, bool, error) {
	embeddedBlocks, embeddedPresent := embeddedBlocksFromData(data)
	if !embeddedPresent && embedded != nil {
		embeddedBlocks = cloneEmbeddedBlocks(embedded)
		embeddedPresent = true
	}
	if !embeddedPresent {
		return cmsBlockConflict{}, false, nil
	}
	legacyBlocks, err := r.legacyBlocksForContent(ctx, entityID, locale)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return cmsBlockConflict{}, false, err
	}
	if len(legacyBlocks) == 0 {
		return cmsBlockConflict{}, false, nil
	}

	legacySorted := append([]CMSBlock{}, legacyBlocks...)
	sort.SliceStable(legacySorted, func(i, j int) bool {
		if legacySorted[i].Position == legacySorted[j].Position {
			return legacySorted[i].ID < legacySorted[j].ID
		}
		return legacySorted[i].Position < legacySorted[j].Position
	})

	embeddedTypes := blockTypesFromEmbedded(embeddedBlocks)
	legacyTypes := blockTypesFromLegacy(legacySorted)
	if !blocksConflict(embeddedBlocks, legacySorted, embeddedTypes, legacyTypes) {
		return cmsBlockConflict{}, false, nil
	}

	conflict := cmsBlockConflict{
		ID:             entityType + ":" + entityID,
		EntityID:       entityID,
		EntityType:     entityType,
		Title:          title,
		ContentType:    contentType,
		Locale:         locale,
		EmbeddedBlocks: embeddedBlocks,
		LegacyBlocks:   legacySorted,
		EmbeddedTypes:  embeddedTypes,
		LegacyTypes:    legacyTypes,
	}
	return conflict, true, nil
}

func blocksConflict(embedded []map[string]any, legacy []CMSBlock, embeddedTypes []string, legacyTypes []string) bool {
	if len(embedded) != len(legacy) {
		return true
	}
	if len(embeddedTypes) != len(legacyTypes) {
		return true
	}
	for idx := range embeddedTypes {
		if strings.ToLower(embeddedTypes[idx]) != strings.ToLower(legacyTypes[idx]) {
			return true
		}
	}
	return false
}

func (r *CMSBlockConflictRepository) legacyBlocksForContent(ctx context.Context, contentID, locale string) ([]CMSBlock, error) {
	if r == nil || r.content == nil {
		return nil, ErrNotFound
	}
	if legacy, ok := r.content.(CMSLegacyBlockService); ok {
		return legacy.LegacyBlocksForContent(ctx, contentID, locale)
	}
	return r.content.BlocksForContent(ctx, contentID, locale)
}
