package admin

import (
	"context"
	"errors"
	"strings"

	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

// GoCMSContentTypeAdapter maps go-cms content type service into CMSContentTypeService.
type GoCMSContentTypeAdapter struct {
	service cmscontent.ContentTypeService
}

// NewGoCMSContentTypeAdapter wraps a typed go-cms content type service.
func NewGoCMSContentTypeAdapter(service any) CMSContentTypeService {
	if service == nil {
		return nil
	}
	if svc, ok := service.(CMSContentTypeService); ok && svc != nil {
		return svc
	}
	typed, ok := service.(cmscontent.ContentTypeService)
	if !ok || typed == nil {
		return nil
	}
	return &GoCMSContentTypeAdapter{service: typed}
}

func (a *GoCMSContentTypeAdapter) ContentTypes(ctx context.Context) ([]CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	env := strings.TrimSpace(EnvironmentFromContext(ctx))
	items, err := a.service.List(ctx, env)
	if err != nil {
		return nil, normalizeContentTypeAdapterError(err)
	}
	out := make([]CMSContentType, 0, len(items))
	for _, item := range items {
		if item == nil {
			continue
		}
		converted := convertGoCMSContentType(item)
		if converted.Environment == "" {
			converted.Environment = env
		}
		out = append(out, converted)
	}
	return out, nil
}

func (a *GoCMSContentTypeAdapter) ContentType(ctx context.Context, id string) (*CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	uid := uuidFromString(id)
	if uid == uuid.Nil {
		return nil, ErrNotFound
	}
	record, err := a.service.Get(ctx, uid)
	if err != nil {
		return nil, normalizeContentTypeAdapterError(err)
	}
	if record == nil {
		return nil, ErrNotFound
	}
	converted := convertGoCMSContentType(record)
	if converted.Environment == "" {
		converted.Environment = strings.TrimSpace(EnvironmentFromContext(ctx))
	}
	if converted.ID == "" && converted.Slug == "" && converted.Name == "" {
		return nil, ErrNotFound
	}
	return &converted, nil
}

func (a *GoCMSContentTypeAdapter) ContentTypeBySlug(ctx context.Context, slug string) (*CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	env := strings.TrimSpace(EnvironmentFromContext(ctx))
	record, err := a.service.GetBySlug(ctx, strings.TrimSpace(slug), env)
	if err != nil {
		normalized := normalizeContentTypeAdapterError(err)
		if errors.Is(normalized, ErrNotFound) {
			return a.contentTypeByPanelSlug(ctx, slug)
		}
		return nil, normalized
	}
	if record == nil {
		return a.contentTypeByPanelSlug(ctx, slug)
	}
	converted := convertGoCMSContentType(record)
	if converted.Environment == "" {
		converted.Environment = env
	}
	if converted.ID == "" && converted.Slug == "" && converted.Name == "" {
		return a.contentTypeByPanelSlug(ctx, slug)
	}
	return &converted, nil
}

func (a *GoCMSContentTypeAdapter) contentTypeByPanelSlug(ctx context.Context, slug string) (*CMSContentType, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, ErrNotFound
	}
	types, err := a.ContentTypes(ctx)
	if err != nil {
		return nil, err
	}
	for _, ct := range types {
		panelSlug := capabilityString(ct.Capabilities, "panel_slug", "panelSlug", "panel-slug")
		if panelSlug != "" && strings.EqualFold(panelSlug, slug) {
			contentType := ct
			return &contentType, nil
		}
	}
	return nil, ErrNotFound
}

func (a *GoCMSContentTypeAdapter) CreateContentType(ctx context.Context, contentType CMSContentType) (*CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	req := cmscontent.CreateContentTypeRequest{
		Name:         strings.TrimSpace(contentType.Name),
		Slug:         strings.TrimSpace(contentType.Slug),
		Schema:       cloneAnyMap(contentType.Schema),
		UISchema:     cloneAnyMap(contentType.UISchema),
		Capabilities: cloneAnyMap(contentType.Capabilities),
		Status:       strings.TrimSpace(contentType.Status),
		CreatedBy:    actorUUID(ctx),
		UpdatedBy:    actorUUID(ctx),
	}
	if desc := strings.TrimSpace(contentType.Description); desc != "" || contentType.DescriptionSet {
		descCopy := contentType.Description
		req.Description = &descCopy
	}
	if icon := strings.TrimSpace(contentType.Icon); icon != "" || contentType.IconSet {
		iconCopy := contentType.Icon
		req.Icon = &iconCopy
	}
	if env := strings.TrimSpace(contentType.Environment); env != "" {
		req.EnvironmentKey = env
	}
	record, err := a.service.Create(ctx, req)
	if err != nil {
		return nil, normalizeContentTypeAdapterError(err)
	}
	if record == nil {
		return nil, ErrNotFound
	}
	converted := convertGoCMSContentType(record)
	return &converted, nil
}

func (a *GoCMSContentTypeAdapter) UpdateContentType(ctx context.Context, contentType CMSContentType) (*CMSContentType, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	req := cmscontent.UpdateContentTypeRequest{
		ID:                   uuidFromString(contentType.ID),
		Schema:               cloneAnyMap(contentType.Schema),
		UISchema:             cloneAnyMap(contentType.UISchema),
		Capabilities:         cloneAnyMap(contentType.Capabilities),
		AllowBreakingChanges: contentType.AllowBreakingChanges,
		UpdatedBy:            actorUUID(ctx),
	}
	if req.ID == uuid.Nil {
		return nil, ErrNotFound
	}
	if name := strings.TrimSpace(contentType.Name); name != "" {
		req.Name = &name
	}
	if slug := strings.TrimSpace(contentType.Slug); slug != "" {
		req.Slug = &slug
	}
	if desc := strings.TrimSpace(contentType.Description); desc != "" || contentType.DescriptionSet {
		descCopy := contentType.Description
		req.Description = &descCopy
	}
	if icon := strings.TrimSpace(contentType.Icon); icon != "" || contentType.IconSet {
		iconCopy := contentType.Icon
		req.Icon = &iconCopy
	}
	if status := strings.TrimSpace(contentType.Status); status != "" {
		req.Status = &status
	}
	if env := strings.TrimSpace(contentType.Environment); env != "" {
		req.EnvironmentKey = env
	}
	record, err := a.service.Update(ctx, req)
	if err != nil {
		return nil, normalizeContentTypeAdapterError(err)
	}
	if record == nil {
		return nil, ErrNotFound
	}
	converted := convertGoCMSContentType(record)
	return &converted, nil
}

func (a *GoCMSContentTypeAdapter) DeleteContentType(ctx context.Context, id string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	req := cmscontent.DeleteContentTypeRequest{
		ID:         uuidFromString(id),
		DeletedBy:  actorUUID(ctx),
		HardDelete: true,
	}
	if req.ID == uuid.Nil {
		return ErrNotFound
	}
	return normalizeContentTypeAdapterError(a.service.Delete(ctx, req))
}

func convertGoCMSContentType(value *cmscontent.ContentType) CMSContentType {
	if value == nil {
		return CMSContentType{}
	}
	contentType := CMSContentType{
		ID:           value.ID.String(),
		Name:         strings.TrimSpace(value.Name),
		Slug:         strings.TrimSpace(value.Slug),
		Schema:       cloneAnyMap(value.Schema),
		UISchema:     cloneAnyMap(value.UISchema),
		Capabilities: cloneAnyMap(value.Capabilities),
		Status:       strings.TrimSpace(value.Status),
		CreatedAt:    value.CreatedAt,
		UpdatedAt:    value.UpdatedAt,
	}
	if contentType.Schema == nil {
		contentType.Schema = map[string]any{}
	}
	if contentType.UISchema == nil {
		contentType.UISchema = map[string]any{}
	}
	if contentType.Capabilities == nil {
		contentType.Capabilities = map[string]any{}
	}
	if value.Description != nil {
		contentType.Description = strings.TrimSpace(*value.Description)
	}
	if value.Icon != nil {
		contentType.Icon = strings.TrimSpace(*value.Icon)
	}
	return contentType
}

func normalizeContentTypeAdapterError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, ErrNotFound) {
		return ErrNotFound
	}
	if isContentTypeNotFound(err) {
		return ErrNotFound
	}
	return err
}

func isContentTypeNotFound(err error) bool {
	if err == nil {
		return false
	}
	for current := err; current != nil; current = errors.Unwrap(current) {
		message := strings.ToLower(current.Error())
		if strings.Contains(message, "not found") &&
			(strings.Contains(message, "content_type") || strings.Contains(message, "content type")) {
			return true
		}
	}
	return false
}
