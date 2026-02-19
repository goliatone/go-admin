package admin

import (
	"context"
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
)

// CMSContentTypeRepository adapts CMSContentTypeService for content type definitions.
type CMSContentTypeRepository struct {
	types CMSContentTypeService
}

// NewCMSContentTypeRepository builds a repository backed by a CMSContentTypeService.
func NewCMSContentTypeRepository(types CMSContentTypeService) *CMSContentTypeRepository {
	return &CMSContentTypeRepository{types: types}
}

// List returns content types filtered by search query.
func (r *CMSContentTypeRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.types == nil {
		return nil, 0, ErrNotFound
	}
	types, err := r.types.ContentTypes(ctx)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	environment := ""
	hasEnvironmentFilter := false
	if opts.Filters != nil {
		environment = strings.TrimSpace(toString(opts.Filters["environment"]))
	}
	if environment == "" {
		environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	if environment != "" {
		hasEnvironmentFilter = true
	}
	filtered := make([]CMSContentType, 0, len(types))
	for _, ct := range types {
		if hasEnvironmentFilter && !cmsEnvironmentMatches(ct.Environment, environment) {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(ct.Name), search) &&
			!strings.Contains(strings.ToLower(ct.Slug), search) &&
			!strings.Contains(strings.ToLower(ct.Description), search) {
			continue
		}
		filtered = append(filtered, ct)
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, ct := range sliced {
		out = append(out, mapFromCMSContentType(ct))
	}
	return out, total, nil
}

// Get returns a single content type by slug (preferred) or id.
func (r *CMSContentTypeRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	ct, err := r.resolveContentType(ctx, id)
	if err != nil {
		return nil, err
	}
	return mapFromCMSContentType(*ct), nil
}

// Create inserts a content type.
func (r *CMSContentTypeRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.types == nil {
		return nil, ErrNotFound
	}
	ct := mapToCMSContentType(record)
	if ct.Environment == "" {
		ct.Environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	if ct.Slug == "" {
		ct.Slug = strings.TrimSpace(ct.ID)
	}
	created, err := r.types.CreateContentType(ctx, ct)
	if err != nil {
		return nil, err
	}
	return mapFromCMSContentType(*created), nil
}

// Update modifies a content type (slug preferred, id fallback).
func (r *CMSContentTypeRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.types == nil {
		return nil, ErrNotFound
	}
	schemaProvided := recordHasKey(record, "schema")
	uiSchemaProvided := recordHasKey(record, "ui_schema") || recordHasKey(record, "uiSchema")
	capsProvided := recordHasKey(record, "capabilities")
	replaceCapabilities := capabilitiesReplaceRequested(record)
	ct := mapToCMSContentType(record)
	if ct.Environment == "" {
		ct.Environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	if ct.ID == "" {
		ct.ID = id
	}
	existing, err := r.resolveContentType(ctx, id)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return nil, err
	}
	if (existing == nil || errors.Is(err, ErrNotFound)) && record != nil {
		slug := strings.TrimSpace(toString(record["slug"]))
		if slug == "" {
			slug = strings.TrimSpace(toString(record["content_type_slug"]))
		}
		if slug != "" && slug != id {
			if resolved, resolveErr := r.resolveContentType(ctx, slug); resolveErr == nil && resolved != nil {
				existing = resolved
			} else if resolveErr != nil && !errors.Is(resolveErr, ErrNotFound) {
				return nil, resolveErr
			}
		}
	}
	if existing != nil {
		if existing.ID != "" {
			ct.ID = existing.ID
		}
		if ct.Slug == "" {
			ct.Slug = existing.Slug
		}
		if ct.Environment == "" {
			ct.Environment = existing.Environment
		}
		if strings.TrimSpace(ct.Name) == "" {
			ct.Name = existing.Name
		}
		if !ct.DescriptionSet {
			ct.Description = existing.Description
		}
		if !ct.IconSet {
			ct.Icon = existing.Icon
		}
		if strings.TrimSpace(ct.Status) == "" {
			ct.Status = existing.Status
		}
		if ct.Schema == nil && schemaProvided {
			ct.Schema = existing.Schema
		}
		if ct.UISchema == nil && uiSchemaProvided {
			ct.UISchema = existing.UISchema
		}
		if !capsProvided {
			ct.Capabilities = existing.Capabilities
		} else if !replaceCapabilities {
			ct.Capabilities = mergeAnyMap(primitives.CloneAnyMap(existing.Capabilities), primitives.CloneAnyMap(ct.Capabilities))
		}
	}
	if existing != nil && schemaProvided && ct.Schema != nil {
		ct.Schema = mergeCMSContentTypeSchema(existing.Schema, ct.Schema)
	}
	updated, err := r.types.UpdateContentType(ctx, ct)
	if err != nil {
		return nil, err
	}
	return mapFromCMSContentType(*updated), nil
}

// Delete removes a content type.
func (r *CMSContentTypeRepository) Delete(ctx context.Context, id string) error {
	if r.types == nil {
		return ErrNotFound
	}
	if existing, err := r.resolveContentType(ctx, id); err == nil && existing != nil && existing.ID != "" {
		return r.types.DeleteContentType(ctx, existing.ID)
	}
	return r.types.DeleteContentType(ctx, id)
}

func (r *CMSContentTypeRepository) resolveContentType(ctx context.Context, id string) (*CMSContentType, error) {
	if r.types == nil {
		return nil, ErrNotFound
	}
	slug := strings.TrimSpace(id)
	if slug != "" {
		ct, err := r.types.ContentTypeBySlug(ctx, slug)
		if err == nil && ct != nil {
			return ct, nil
		}
		if err != nil && !errors.Is(err, ErrNotFound) {
			return nil, err
		}
	}
	return r.types.ContentType(ctx, id)
}

func mapFromCMSContentType(ct CMSContentType) map[string]any {
	id := strings.TrimSpace(ct.ID)
	if id == "" {
		id = strings.TrimSpace(ct.Slug)
	}
	out := map[string]any{
		"id":           id,
		"name":         ct.Name,
		"slug":         ct.Slug,
		"description":  ct.Description,
		"environment":  ct.Environment,
		"schema":       primitives.CloneAnyMap(ct.Schema),
		"ui_schema":    primitives.CloneAnyMap(ct.UISchema),
		"capabilities": primitives.CloneAnyMap(ct.Capabilities),
		"icon":         ct.Icon,
		"status":       ct.Status,
	}
	if ct.ID != "" {
		out["content_type_id"] = ct.ID
	}
	if !ct.CreatedAt.IsZero() {
		out["created_at"] = ct.CreatedAt
	}
	if !ct.UpdatedAt.IsZero() {
		out["updated_at"] = ct.UpdatedAt
	}
	return out
}
