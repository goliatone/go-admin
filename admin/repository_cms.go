package admin

import (
	"context"
	"strings"
)

// CMSPageRepository adapts a CMSContentService to the admin Repository contract.
// It supports locale-aware listings, basic search, and parent/child metadata for tree views.
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
	locale := ""
	if opts.Filters != nil {
		if loc, ok := opts.Filters["locale"].(string); ok && loc != "" {
			locale = loc
		}
		if loc, ok := opts.Filters["Locale"].(string); ok && loc != "" {
			locale = loc
		}
	}
	pages, err := r.content.Pages(ctx, locale)
	if err != nil {
		return nil, 0, err
	}
	search := opts.Search
	if search == "" && opts.Filters != nil {
		if s, ok := opts.Filters["_search"].(string); ok {
			search = s
		}
	}
	search = strings.ToLower(search)
	filtered := []CMSPage{}
	for _, page := range pages {
		if search != "" && !strings.Contains(strings.ToLower(page.Title), search) && !strings.Contains(strings.ToLower(page.Slug), search) {
			continue
		}
		filtered = append(filtered, page)
	}

	// Simple pagination.
	pageNum := opts.Page
	if pageNum < 1 {
		pageNum = 1
	}
	per := opts.PerPage
	if per <= 0 {
		per = 10
	}
	start := (pageNum - 1) * per
	if start > len(filtered) {
		return []map[string]any{}, len(filtered), nil
	}
	end := start + per
	if end > len(filtered) {
		end = len(filtered)
	}

	out := make([]map[string]any, 0, end-start)
	for _, page := range filtered[start:end] {
		out = append(out, map[string]any{
			"id":        page.ID,
			"title":     page.Title,
			"slug":      page.Slug,
			"locale":    page.Locale,
			"parent_id": page.ParentID,
			"blocks":    append([]string{}, page.Blocks...),
			"seo":       cloneAnyMap(page.SEO),
			"status":    page.Status,
			"data":      cloneAnyMap(page.Data),
		})
	}
	return out, len(filtered), nil
}

// Get returns a page by id.
func (r *CMSPageRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	page, err := r.content.Page(ctx, id, "")
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":        page.ID,
		"title":     page.Title,
		"slug":      page.Slug,
		"locale":    page.Locale,
		"parent_id": page.ParentID,
		"blocks":    append([]string{}, page.Blocks...),
		"seo":       cloneAnyMap(page.SEO),
		"status":    page.Status,
		"data":      cloneAnyMap(page.Data),
	}, nil
}

// Create inserts a page.
func (r *CMSPageRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	page := mapToCMSPage(record)
	created, err := r.content.CreatePage(ctx, page)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":        created.ID,
		"title":     created.Title,
		"slug":      created.Slug,
		"locale":    created.Locale,
		"parent_id": created.ParentID,
		"blocks":    append([]string{}, created.Blocks...),
		"seo":       cloneAnyMap(created.SEO),
		"status":    created.Status,
		"data":      cloneAnyMap(created.Data),
	}, nil
}

// Update modifies a page.
func (r *CMSPageRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	page := mapToCMSPage(record)
	page.ID = id
	updated, err := r.content.UpdatePage(ctx, page)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":        updated.ID,
		"title":     updated.Title,
		"slug":      updated.Slug,
		"locale":    updated.Locale,
		"parent_id": updated.ParentID,
		"blocks":    append([]string{}, updated.Blocks...),
		"seo":       cloneAnyMap(updated.SEO),
		"status":    updated.Status,
		"data":      cloneAnyMap(updated.Data),
	}, nil
}

// Delete removes a page.
func (r *CMSPageRepository) Delete(ctx context.Context, id string) error {
	if r.content == nil {
		return ErrNotFound
	}
	return r.content.DeletePage(ctx, id)
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
	return page
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
