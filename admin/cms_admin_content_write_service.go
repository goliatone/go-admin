package admin

import (
	"context"
	"errors"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

// AdminContentWriteService provides admin-shaped write operations for CMS content.
type AdminContentWriteService interface {
	Create(ctx context.Context, record map[string]any) (map[string]any, error)
	Update(ctx context.Context, id string, record map[string]any) (map[string]any, error)
	Delete(ctx context.Context, id string) error
	CreateTranslation(ctx context.Context, input TranslationCreateInput) (map[string]any, error)
	CreateForContentType(ctx context.Context, contentType CMSContentType, record map[string]any) (map[string]any, error)
	UpdateForContentType(ctx context.Context, contentType CMSContentType, id string, record map[string]any) (map[string]any, error)
	DeleteForContentType(ctx context.Context, contentType CMSContentType, id string) error
	CreateTranslationForContentType(ctx context.Context, contentType CMSContentType, input TranslationCreateInput) (map[string]any, error)
}

type goCMSAdminContentWriteService struct {
	content      CMSContentService
	contentTypes CMSContentTypeService
}

// NewAdminContentWriteService builds the local admin content write-service boundary.
func NewAdminContentWriteService(content CMSContentService, contentTypes ...CMSContentTypeService) AdminContentWriteService {
	return newAdminContentWriteService(content, contentTypes...)
}

func newAdminContentWriteService(content CMSContentService, contentTypes ...CMSContentTypeService) goCMSAdminContentWriteService {
	service := goCMSAdminContentWriteService{content: content}
	if len(contentTypes) > 0 && contentTypes[0] != nil {
		service.contentTypes = contentTypes[0]
	} else if typed := resolveCMSContentTypeCapability(content); typed != nil {
		service.contentTypes = typed
	}
	return service
}

func (s goCMSAdminContentWriteService) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	if record == nil {
		record = map[string]any{}
	}
	contentTypeKey := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["content_type_slug"]),
		toString(record["content_type"]),
		toString(record["content_type_id"]),
	))
	if policy, ok := s.resolveContentNavigationPolicy(ctx, contentTypeKey); ok {
		if err := applyContentEntryNavigationWrite(record, policy, true); err != nil {
			return nil, err
		}
	}
	content := mapToCMSContent(record)
	if err := s.ensureUniqueLocalizedPath(ctx, content, ""); err != nil {
		return nil, err
	}
	created, err := s.content.CreateContent(ctx, content)
	if err != nil {
		return nil, err
	}
	result := cmsContentRecord(*created, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	})
	if policy, ok := s.resolveContentNavigationPolicy(ctx, primitives.FirstNonEmptyRaw(created.ContentTypeSlug, created.ContentType)); ok {
		result = applyContentEntryNavigationReadContract(result, policy)
	}
	return result, nil
}

func (s goCMSAdminContentWriteService) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	if record == nil {
		record = map[string]any{}
	}
	if err := s.ensureContentTranslationIntent(ctx, id, record); err != nil {
		return nil, err
	}
	content := mapToCMSContent(record)
	content.ID = id
	content.Locale = s.resolveUpdateContentLocale(ctx, id, content.Locale)
	existing := s.resolveExistingContentForUpdate(ctx, id, &content)
	content, err := s.applyUpdateNavigationPolicy(ctx, id, record, content, existing)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		content = mergeCMSContentUpdate(*existing, content, record)
	}
	if err := s.ensureUniqueLocalizedPath(ctx, content, id); err != nil {
		return nil, err
	}
	updated, err := s.content.UpdateContent(ctx, content)
	if err != nil {
		return nil, err
	}
	result := cmsContentRecord(*updated, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	})
	if policy, ok := s.resolveContentNavigationPolicy(ctx, primitives.FirstNonEmptyRaw(updated.ContentTypeSlug, updated.ContentType)); ok {
		result = applyContentEntryNavigationReadContract(result, policy)
	}
	return result, nil
}

func (s goCMSAdminContentWriteService) resolveUpdateContentLocale(ctx context.Context, id, locale string) string {
	locale = strings.TrimSpace(locale)
	if locale != "" {
		return locale
	}
	if resolved := localeFromContext(ctx); resolved != "" {
		locale = resolved
	}
	if resolved := s.resolveContentLocale(ctx, id); resolved != "" {
		locale = resolved
	}
	return locale
}

func (s goCMSAdminContentWriteService) resolveExistingContentForUpdate(ctx context.Context, id string, content *CMSContent) *CMSContent {
	if s.content == nil || content == nil {
		return nil
	}
	if current := s.lookupUpdateContent(ctx, id, content.Locale); current != nil {
		return current
	}
	fallbackLocale := s.resolveContentLocale(ctx, id)
	if fallbackLocale == "" || strings.EqualFold(fallbackLocale, content.Locale) {
		return nil
	}
	content.Locale = fallbackLocale
	return s.lookupUpdateContent(ctx, id, fallbackLocale)
}

func (s goCMSAdminContentWriteService) lookupUpdateContent(ctx context.Context, id, locale string) *CMSContent {
	if strings.TrimSpace(locale) == "" {
		return nil
	}
	current, err := s.content.Content(ctx, id, locale)
	if err != nil {
		return nil
	}
	return current
}

func (s goCMSAdminContentWriteService) applyUpdateNavigationPolicy(ctx context.Context, id string, record map[string]any, content CMSContent, existing *CMSContent) (CMSContent, error) {
	if existing == nil {
		return content, nil
	}
	contentTypeKey := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["content_type_slug"]),
		toString(record["content_type"]),
		toString(record["content_type_id"]),
		primitives.FirstNonEmptyRaw(existing.ContentTypeSlug, existing.ContentType),
	))
	policy, ok := s.resolveContentNavigationPolicy(ctx, contentTypeKey)
	if !ok {
		return content, nil
	}
	if err := applyContentEntryNavigationWrite(record, policy, false); err != nil {
		return content, err
	}
	content = mapToCMSContent(record)
	content.ID = id
	if strings.TrimSpace(content.Locale) == "" {
		content.Locale = existing.Locale
	}
	return content, nil
}

func (s goCMSAdminContentWriteService) Delete(ctx context.Context, id string) error {
	if s.content == nil {
		return ErrNotFound
	}
	return s.content.DeleteContent(ctx, id)
}

func (s goCMSAdminContentWriteService) CreateTranslation(ctx context.Context, input TranslationCreateInput) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	input = normalizeTranslationCreateInput(input)
	if input.SourceID == "" {
		return nil, validationDomainError("translation requires a single id", map[string]any{
			"field": "id",
		})
	}
	if input.Locale == "" {
		return nil, validationDomainError("translation locale required", map[string]any{
			"field": "locale",
		})
	}
	creator, ok := resolveCMSContentTranslationCreator(s.content)
	if !ok || creator == nil {
		return nil, ErrTranslationCreateUnsupported
	}
	if prepared, err := s.prepareTranslationCreateInput(ctx, input); err != nil {
		return nil, err
	} else {
		input = prepared
	}
	created, err := creator.CreateTranslation(ctx, input)
	if err != nil {
		return nil, err
	}
	if created == nil {
		return nil, ErrNotFound
	}
	return cmsContentRecord(*created, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	}), nil
}

func (s goCMSAdminContentWriteService) CreateForContentType(ctx context.Context, contentType CMSContentType, record map[string]any) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	if record == nil {
		record = map[string]any{}
	}
	typeKey := strings.TrimSpace(primitives.FirstNonEmptyRaw(contentType.Slug, contentType.Name, contentType.ID))
	if typeKey != "" {
		record["content_type"] = typeKey
		record["content_type_slug"] = typeKey
	}
	if err := applyContentEntryNavigationWrite(record, contentEntryNavigationPolicyFromContentType(contentType), true); err != nil {
		return nil, err
	}
	created, err := s.Create(ctx, record)
	if err != nil {
		return nil, err
	}
	return applyContentEntryNavigationReadContract(created, contentEntryNavigationPolicyFromContentType(contentType)), nil
}

func (s goCMSAdminContentWriteService) CreateTranslationForContentType(ctx context.Context, contentType CMSContentType, input TranslationCreateInput) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	input = normalizeTranslationCreateInput(input)
	if input.SourceID == "" {
		return nil, validationDomainError("translation requires a single id", map[string]any{
			"field": "id",
		})
	}
	if input.Locale == "" {
		return nil, validationDomainError("translation locale required", map[string]any{
			"field": "locale",
		})
	}
	creator, ok := resolveCMSContentTranslationCreator(s.content)
	if !ok || creator == nil {
		return nil, ErrTranslationCreateUnsupported
	}
	typeKey := strings.TrimSpace(primitives.FirstNonEmptyRaw(contentType.Slug, contentType.Name, contentType.ID))
	if typeKey != "" && input.ContentType == "" {
		input.ContentType = typeKey
	}
	if prepared, err := s.prepareTranslationCreateInput(ctx, input); err != nil {
		return nil, err
	} else {
		input = prepared
	}
	created, err := creator.CreateTranslation(ctx, input)
	if err != nil {
		return nil, err
	}
	if created == nil {
		return nil, ErrNotFound
	}
	normalizedTypeKey := strings.ToLower(strings.TrimSpace(typeKey))
	createdType := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(created.ContentTypeSlug, created.ContentType)))
	if normalizedTypeKey != "" && createdType != "" && createdType != normalizedTypeKey {
		return nil, ErrNotFound
	}
	return cmsContentRecord(*created, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	}), nil
}

func (s goCMSAdminContentWriteService) UpdateForContentType(ctx context.Context, contentType CMSContentType, id string, record map[string]any) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	if record == nil {
		record = map[string]any{}
	}
	typeKey := strings.TrimSpace(primitives.FirstNonEmptyRaw(contentType.Slug, contentType.Name, contentType.ID))
	if typeKey != "" {
		record["content_type"] = typeKey
		record["content_type_slug"] = typeKey
	}
	if err := applyContentEntryNavigationWrite(record, contentEntryNavigationPolicyFromContentType(contentType), false); err != nil {
		return nil, err
	}
	updated, err := s.Update(ctx, id, record)
	if err != nil {
		return nil, err
	}
	return applyContentEntryNavigationReadContract(updated, contentEntryNavigationPolicyFromContentType(contentType)), nil
}

func (s goCMSAdminContentWriteService) DeleteForContentType(ctx context.Context, contentType CMSContentType, id string) error {
	if s.content == nil {
		return ErrNotFound
	}
	record, err := newAdminContentReadService(s.content, s.contentTypes).GetForContentType(ctx, contentType, id)
	if err != nil {
		return err
	}
	if toString(record["id"]) == "" {
		return ErrNotFound
	}
	return s.content.DeleteContent(ctx, id)
}

func (s goCMSAdminContentWriteService) resolveContentLocale(ctx context.Context, id string) string {
	return resolveContentLocaleFromService(ctx, s.content, id)
}

func (s goCMSAdminContentWriteService) contentTypeService() CMSContentTypeService {
	return contentTypeServiceFromServices(s.content, s.contentTypes)
}

func (s goCMSAdminContentWriteService) resolveContentNavigationPolicy(ctx context.Context, contentTypeKey string) (contentEntryNavigationPolicy, bool) {
	return resolveContentEntryNavigationPolicy(ctx, s.contentTypeService(), contentTypeKey)
}

func (s goCMSAdminContentWriteService) ensureContentTranslationIntent(ctx context.Context, id string, record map[string]any) error {
	if s.content == nil {
		return ErrNotFound
	}
	if record == nil {
		return nil
	}
	requested := requestedLocaleFromPayload(record, localeFromContext(ctx))
	if requested == "" {
		return nil
	}
	missing, err := s.contentTranslationMissing(ctx, id, requested)
	if err != nil {
		return err
	}
	if missing {
		if !createTranslationRequested(record) {
			return translationCreateRequiredError(requested)
		}
		record["locale"] = requested
	}
	return nil
}

func (s goCMSAdminContentWriteService) contentTranslationMissing(ctx context.Context, id, requested string) (bool, error) {
	requested = strings.TrimSpace(requested)
	if requested == "" {
		return false, nil
	}
	content, err := s.content.Content(ctx, id, requested)
	if err != nil {
		return s.handleContentTranslationMissingError(ctx, id, err)
	}
	return contentMissingRequestedTranslation(content, requested)
}

func (s goCMSAdminContentWriteService) handleContentTranslationMissingError(ctx context.Context, id string, err error) (bool, error) {
	if IsTranslationMissing(err) {
		return true, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return false, err
	}
	existing, lookupErr := s.content.Content(ctx, id, "")
	if lookupErr == nil && existing != nil {
		return true, nil
	}
	if lookupErr != nil && !errors.Is(lookupErr, ErrNotFound) {
		return false, lookupErr
	}
	return false, ErrNotFound
}

func contentMissingRequestedTranslation(content *CMSContent, requested string) (bool, error) {
	if content == nil {
		return false, ErrNotFound
	}
	if content.MissingRequestedLocale {
		return true, nil
	}
	if strings.TrimSpace(content.Locale) == "" {
		return false, ErrNotFound
	}
	if !strings.EqualFold(content.Locale, requested) {
		return true, nil
	}
	if !cmsContentHasLocale(content.AvailableLocales, requested) {
		return len(content.AvailableLocales) > 0, nil
	}
	return false, nil
}

func cmsContentHasLocale(locales []string, requested string) bool {
	for _, loc := range locales {
		if strings.EqualFold(loc, requested) {
			return true
		}
	}
	return false
}

func (s goCMSAdminContentWriteService) prepareTranslationCreateInput(ctx context.Context, input TranslationCreateInput) (TranslationCreateInput, error) {
	if s.content == nil {
		return input, ErrNotFound
	}
	source, err := s.content.Content(ctx, input.SourceID, "")
	if err != nil {
		return input, err
	}
	if source == nil {
		return input, ErrNotFound
	}
	if strings.TrimSpace(input.RouteKey) == "" {
		input.RouteKey = strings.TrimSpace(primitives.FirstNonEmptyRaw(
			source.RouteKey,
			toString(source.Data["route_key"]),
			toString(source.Metadata["route_key"]),
		))
	}
	if strings.TrimSpace(input.ContentType) == "" {
		input.ContentType = strings.TrimSpace(primitives.FirstNonEmptyRaw(source.ContentTypeSlug, source.ContentType))
	}
	if strings.TrimSpace(input.Path) != "" {
		path := normalizeCMSLocalizedPath(input.Path)
		if path != "" {
			input.Path = path
		}
	}
	if err := s.ensureUniqueTranslationLocalizedPath(ctx, source, input); err != nil {
		return input, err
	}
	return normalizeTranslationCreateInput(input), nil
}

func (s goCMSAdminContentWriteService) ensureUniqueTranslationLocalizedPath(ctx context.Context, source *CMSContent, input TranslationCreateInput) error {
	if s.content == nil {
		return ErrNotFound
	}
	path := normalizeCMSLocalizedPath(input.Path)
	if path == "" {
		return nil
	}
	contentType := strings.TrimSpace(primitives.FirstNonEmptyRaw(input.ContentType, input.PolicyEntity))
	if source != nil {
		contentType = strings.TrimSpace(primitives.FirstNonEmptyRaw(contentType, source.ContentTypeSlug, source.ContentType))
	}
	contents, err := s.content.Contents(ctx, input.Locale)
	if err != nil {
		return err
	}
	for _, candidate := range contents {
		if strings.TrimSpace(candidate.ID) == strings.TrimSpace(input.SourceID) {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(candidate.Locale), strings.TrimSpace(input.Locale)) {
			continue
		}
		if contentType != "" && !strings.EqualFold(strings.TrimSpace(primitives.FirstNonEmptyRaw(candidate.ContentTypeSlug, candidate.ContentType)), contentType) {
			continue
		}
		candidatePath := normalizeCMSLocalizedPath(ExtractContentPath(candidate.Data, candidate.Metadata, ""))
		if candidatePath == "" || candidatePath != path {
			continue
		}
		return pathConflictDomainError(map[string]any{
			"path":      path,
			"candidate": candidate.ID,
			"locale":    input.Locale,
			"scope":     contentType,
			"source_id": input.SourceID,
		})
	}
	return nil
}

func (s goCMSAdminContentWriteService) ensureUniqueLocalizedPath(ctx context.Context, content CMSContent, skipID string) error {
	if s.content == nil {
		return ErrNotFound
	}
	path := normalizeCMSLocalizedPath(ExtractContentPath(content.Data, content.Metadata, ""))
	if path == "" {
		return nil
	}
	contentType := strings.TrimSpace(primitives.FirstNonEmptyRaw(content.ContentTypeSlug, content.ContentType))
	contents, err := s.content.Contents(ctx, content.Locale)
	if err != nil {
		return err
	}
	for _, candidate := range contents {
		if strings.TrimSpace(candidate.ID) == strings.TrimSpace(skipID) {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(candidate.Locale), strings.TrimSpace(content.Locale)) {
			continue
		}
		if contentType != "" && !strings.EqualFold(strings.TrimSpace(primitives.FirstNonEmptyRaw(candidate.ContentTypeSlug, candidate.ContentType)), contentType) {
			continue
		}
		candidatePath := normalizeCMSLocalizedPath(ExtractContentPath(candidate.Data, candidate.Metadata, ""))
		if candidatePath == "" || candidatePath != path {
			continue
		}
		return pathConflictDomainError(map[string]any{
			"path":      path,
			"skip_id":   skipID,
			"candidate": candidate.ID,
			"locale":    content.Locale,
			"scope":     contentType,
		})
	}
	return nil
}

func normalizeCMSLocalizedPath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}
	return "/" + strings.TrimLeft(path, "/")
}
