package admin

import (
	"errors"
	"strings"

	admingraphql "github.com/goliatone/go-admin/admin/graphql"
	crud "github.com/goliatone/go-crud"
	repository "github.com/goliatone/go-repository-bun"
)

var errManagementReadOnly = errors.New("management service is read-only")

// ManagementServices bundles CRUD-compatible services for management GraphQL.
type ManagementServices struct {
	Contents     crud.Service[admingraphql.Content]
	Pages        crud.Service[admingraphql.Page]
	ContentTypes crud.Service[admingraphql.ContentType]
}

// NewManagementServices builds management services backed by CMS adapters.
func NewManagementServices(container CMSContainer, opts DeliveryOptions) ManagementServices {
	return ManagementServices{
		Contents:     NewManagementContentService(container, opts),
		Pages:        NewManagementPageService(container, opts),
		ContentTypes: NewManagementContentTypeService(container),
	}
}

// ManagementContentService adapts CMS content for management APIs.
type ManagementContentService struct {
	content       CMSContentService
	defaultLocale string
}

func NewManagementContentService(container CMSContainer, opts DeliveryOptions) *ManagementContentService {
	var svc CMSContentService
	if container != nil {
		svc = container.ContentService()
	}
	return &ManagementContentService{
		content:       svc,
		defaultLocale: strings.TrimSpace(opts.DefaultLocale),
	}
}

func (s *ManagementContentService) Index(ctx crud.Context, _ []repository.SelectCriteria) ([]admingraphql.Content, int, error) {
	if s == nil || s.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := resolveManagementLocale(ctx, s.defaultLocale)
	records, err := s.content.Contents(ctx.UserContext(), locale)
	if err != nil && shouldFallbackDeliveryLocale(locale, s.defaultLocale) {
		records, err = s.content.Contents(ctx.UserContext(), s.defaultLocale)
	}
	if err != nil {
		return nil, 0, err
	}
	filtered := applyStatusFilter(ctx, records)
	out := make([]admingraphql.Content, 0, len(filtered))
	for _, record := range filtered {
		out = append(out, mapManagementContent(record))
	}
	return out, len(out), nil
}

func (s *ManagementContentService) Show(ctx crud.Context, id string, _ []repository.SelectCriteria) (admingraphql.Content, error) {
	if s == nil || s.content == nil {
		return admingraphql.Content{}, ErrNotFound
	}
	locale := resolveManagementLocale(ctx, s.defaultLocale)
	record, err := s.content.Content(ctx.UserContext(), id, locale)
	if err != nil && shouldFallbackDeliveryLocale(locale, s.defaultLocale) {
		record, err = s.content.Content(ctx.UserContext(), id, s.defaultLocale)
	}
	if err != nil {
		return admingraphql.Content{}, err
	}
	if !allowStatus(ctx, record.Status) {
		return admingraphql.Content{}, ErrNotFound
	}
	return mapManagementContent(*record), nil
}

func (s *ManagementContentService) Create(ctx crud.Context, record admingraphql.Content) (admingraphql.Content, error) {
	if s == nil || s.content == nil {
		return admingraphql.Content{}, ErrNotFound
	}
	content := mapManagementContentToCMS(record)
	if strings.TrimSpace(content.Locale) == "" {
		content.Locale = resolveManagementLocale(ctx, s.defaultLocale)
	}
	created, err := s.content.CreateContent(ctx.UserContext(), content)
	if err != nil {
		return admingraphql.Content{}, err
	}
	return mapManagementContent(*created), nil
}

func (s *ManagementContentService) CreateBatch(ctx crud.Context, records []admingraphql.Content) ([]admingraphql.Content, error) {
	return nil, errManagementReadOnly
}

func (s *ManagementContentService) Update(ctx crud.Context, record admingraphql.Content) (admingraphql.Content, error) {
	if s == nil || s.content == nil {
		return admingraphql.Content{}, ErrNotFound
	}
	content := mapManagementContentToCMS(record)
	if strings.TrimSpace(content.Locale) == "" {
		content.Locale = resolveManagementLocale(ctx, s.defaultLocale)
	}
	updated, err := s.content.UpdateContent(ctx.UserContext(), content)
	if err != nil {
		return admingraphql.Content{}, err
	}
	return mapManagementContent(*updated), nil
}

func (s *ManagementContentService) UpdateBatch(ctx crud.Context, records []admingraphql.Content) ([]admingraphql.Content, error) {
	return nil, errManagementReadOnly
}

func (s *ManagementContentService) Delete(ctx crud.Context, record admingraphql.Content) error {
	if s == nil || s.content == nil {
		return ErrNotFound
	}
	return s.content.DeleteContent(ctx.UserContext(), record.ID)
}

func (s *ManagementContentService) DeleteBatch(ctx crud.Context, records []admingraphql.Content) error {
	return errManagementReadOnly
}

// ManagementPageService adapts CMS pages for management APIs.
type ManagementPageService struct {
	content       CMSContentService
	defaultLocale string
}

func NewManagementPageService(container CMSContainer, opts DeliveryOptions) *ManagementPageService {
	var svc CMSContentService
	if container != nil {
		svc = container.ContentService()
	}
	return &ManagementPageService{
		content:       svc,
		defaultLocale: strings.TrimSpace(opts.DefaultLocale),
	}
}

func (s *ManagementPageService) Index(ctx crud.Context, _ []repository.SelectCriteria) ([]admingraphql.Page, int, error) {
	if s == nil || s.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := resolveManagementLocale(ctx, s.defaultLocale)
	records, err := s.content.Pages(ctx.UserContext(), locale)
	if err != nil && shouldFallbackDeliveryLocale(locale, s.defaultLocale) {
		records, err = s.content.Pages(ctx.UserContext(), s.defaultLocale)
	}
	if err != nil {
		return nil, 0, err
	}
	filtered := applyPageStatusFilter(ctx, records)
	out := make([]admingraphql.Page, 0, len(filtered))
	for _, record := range filtered {
		out = append(out, mapManagementPage(record))
	}
	return out, len(out), nil
}

func (s *ManagementPageService) Show(ctx crud.Context, id string, _ []repository.SelectCriteria) (admingraphql.Page, error) {
	if s == nil || s.content == nil {
		return admingraphql.Page{}, ErrNotFound
	}
	locale := resolveManagementLocale(ctx, s.defaultLocale)
	record, err := s.content.Page(ctx.UserContext(), id, locale)
	if err != nil && shouldFallbackDeliveryLocale(locale, s.defaultLocale) {
		record, err = s.content.Page(ctx.UserContext(), id, s.defaultLocale)
	}
	if err != nil {
		return admingraphql.Page{}, err
	}
	if !allowStatus(ctx, record.Status) {
		return admingraphql.Page{}, ErrNotFound
	}
	return mapManagementPage(*record), nil
}

func (s *ManagementPageService) Create(ctx crud.Context, record admingraphql.Page) (admingraphql.Page, error) {
	if s == nil || s.content == nil {
		return admingraphql.Page{}, ErrNotFound
	}
	page := mapManagementPageToCMS(record)
	if strings.TrimSpace(page.Locale) == "" {
		page.Locale = resolveManagementLocale(ctx, s.defaultLocale)
	}
	created, err := s.content.CreatePage(ctx.UserContext(), page)
	if err != nil {
		return admingraphql.Page{}, err
	}
	return mapManagementPage(*created), nil
}

func (s *ManagementPageService) CreateBatch(ctx crud.Context, records []admingraphql.Page) ([]admingraphql.Page, error) {
	return nil, errManagementReadOnly
}

func (s *ManagementPageService) Update(ctx crud.Context, record admingraphql.Page) (admingraphql.Page, error) {
	if s == nil || s.content == nil {
		return admingraphql.Page{}, ErrNotFound
	}
	page := mapManagementPageToCMS(record)
	if strings.TrimSpace(page.Locale) == "" {
		page.Locale = resolveManagementLocale(ctx, s.defaultLocale)
	}
	updated, err := s.content.UpdatePage(ctx.UserContext(), page)
	if err != nil {
		return admingraphql.Page{}, err
	}
	return mapManagementPage(*updated), nil
}

func (s *ManagementPageService) UpdateBatch(ctx crud.Context, records []admingraphql.Page) ([]admingraphql.Page, error) {
	return nil, errManagementReadOnly
}

func (s *ManagementPageService) Delete(ctx crud.Context, record admingraphql.Page) error {
	if s == nil || s.content == nil {
		return ErrNotFound
	}
	return s.content.DeletePage(ctx.UserContext(), record.ID)
}

func (s *ManagementPageService) DeleteBatch(ctx crud.Context, records []admingraphql.Page) error {
	return errManagementReadOnly
}

// ManagementContentTypeService adapts CMS content types for management APIs.
type ManagementContentTypeService struct {
	types CMSContentTypeService
}

func NewManagementContentTypeService(container CMSContainer) *ManagementContentTypeService {
	var svc CMSContentTypeService
	if container != nil {
		svc = container.ContentTypeService()
	}
	return &ManagementContentTypeService{types: svc}
}

func (s *ManagementContentTypeService) Index(ctx crud.Context, _ []repository.SelectCriteria) ([]admingraphql.ContentType, int, error) {
	if s == nil || s.types == nil {
		return nil, 0, ErrNotFound
	}
	records, err := s.types.ContentTypes(ctx.UserContext())
	if err != nil {
		return nil, 0, err
	}
	out := make([]admingraphql.ContentType, 0, len(records))
	for _, record := range records {
		out = append(out, mapContentType(record))
	}
	return out, len(out), nil
}

func (s *ManagementContentTypeService) Show(ctx crud.Context, id string, _ []repository.SelectCriteria) (admingraphql.ContentType, error) {
	if s == nil || s.types == nil {
		return admingraphql.ContentType{}, ErrNotFound
	}
	record, err := s.types.ContentType(ctx.UserContext(), id)
	if err != nil {
		return admingraphql.ContentType{}, err
	}
	return mapContentType(*record), nil
}

func (s *ManagementContentTypeService) Create(ctx crud.Context, record admingraphql.ContentType) (admingraphql.ContentType, error) {
	if s == nil || s.types == nil {
		return admingraphql.ContentType{}, ErrNotFound
	}
	created, err := s.types.CreateContentType(ctx.UserContext(), mapContentTypeToCMS(record))
	if err != nil {
		return admingraphql.ContentType{}, err
	}
	return mapContentType(*created), nil
}

func (s *ManagementContentTypeService) CreateBatch(ctx crud.Context, records []admingraphql.ContentType) ([]admingraphql.ContentType, error) {
	return nil, errManagementReadOnly
}

func (s *ManagementContentTypeService) Update(ctx crud.Context, record admingraphql.ContentType) (admingraphql.ContentType, error) {
	if s == nil || s.types == nil {
		return admingraphql.ContentType{}, ErrNotFound
	}
	updated, err := s.types.UpdateContentType(ctx.UserContext(), mapContentTypeToCMS(record))
	if err != nil {
		return admingraphql.ContentType{}, err
	}
	return mapContentType(*updated), nil
}

func (s *ManagementContentTypeService) UpdateBatch(ctx crud.Context, records []admingraphql.ContentType) ([]admingraphql.ContentType, error) {
	return nil, errManagementReadOnly
}

func (s *ManagementContentTypeService) Delete(ctx crud.Context, record admingraphql.ContentType) error {
	if s == nil || s.types == nil {
		return ErrNotFound
	}
	return s.types.DeleteContentType(ctx.UserContext(), record.ID)
}

func (s *ManagementContentTypeService) DeleteBatch(ctx crud.Context, records []admingraphql.ContentType) error {
	return errManagementReadOnly
}

func resolveManagementLocale(ctx crud.Context, fallback string) string {
	fallback = strings.TrimSpace(fallback)
	if ctx == nil {
		return fallback
	}
	if locale := strings.TrimSpace(LocaleFromContext(ctx.UserContext())); locale != "" {
		return locale
	}
	if locale := strings.TrimSpace(ctx.Query("locale")); locale != "" {
		return locale
	}
	return fallback
}

func applyStatusFilter(ctx crud.Context, records []CMSContent) []CMSContent {
	if len(records) == 0 {
		return records
	}
	status := strings.TrimSpace(strings.ToLower(getQueryFlag(ctx, "status")))
	if status == "" || isPreviewRequest(ctx) {
		return records
	}
	filtered := make([]CMSContent, 0, len(records))
	for _, record := range records {
		if strings.EqualFold(record.Status, status) {
			filtered = append(filtered, record)
		}
	}
	return filtered
}

func applyPageStatusFilter(ctx crud.Context, records []CMSPage) []CMSPage {
	if len(records) == 0 {
		return records
	}
	status := strings.TrimSpace(strings.ToLower(getQueryFlag(ctx, "status")))
	if status == "" || isPreviewRequest(ctx) {
		return records
	}
	filtered := make([]CMSPage, 0, len(records))
	for _, record := range records {
		if strings.EqualFold(record.Status, status) {
			filtered = append(filtered, record)
		}
	}
	return filtered
}

func allowStatus(ctx crud.Context, status string) bool {
	if isPreviewRequest(ctx) {
		return true
	}
	desired := strings.TrimSpace(strings.ToLower(getQueryFlag(ctx, "status")))
	if desired == "" {
		return true
	}
	return strings.EqualFold(status, desired)
}

func isPreviewRequest(ctx crud.Context) bool {
	return isTrue(getQueryFlag(ctx, "preview")) || isTrue(getQueryFlag(ctx, "include_drafts"))
}

func getQueryFlag(ctx crud.Context, name string) string {
	if ctx == nil {
		return ""
	}
	return strings.TrimSpace(ctx.Query(name))
}

func isTrue(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "true", "1", "yes", "y", "on":
		return true
	default:
		return false
	}
}

func mapManagementContent(record CMSContent) admingraphql.Content {
	contentType := strings.TrimSpace(record.ContentTypeSlug)
	if contentType == "" {
		contentType = strings.TrimSpace(record.ContentType)
	}
	return admingraphql.Content{
		ID:     record.ID,
		Type:   contentType,
		Slug:   record.Slug,
		Locale: record.Locale,
		Status: record.Status,
		Data:   cloneAnyMap(record.Data),
	}
}

func mapManagementContentToCMS(record admingraphql.Content) CMSContent {
	return CMSContent{
		ID:              record.ID,
		ContentType:     record.Type,
		ContentTypeSlug: record.Type,
		Slug:            record.Slug,
		Locale:          record.Locale,
		Status:          record.Status,
		Data:            cloneAnyMap(record.Data),
	}
}

func mapManagementPage(record CMSPage) admingraphql.Page {
	return admingraphql.Page{
		ID:     record.ID,
		Title:  record.Title,
		Slug:   record.Slug,
		Locale: record.Locale,
		Status: record.Status,
		Data:   cloneAnyMap(record.Data),
	}
}

func mapManagementPageToCMS(record admingraphql.Page) CMSPage {
	return CMSPage{
		ID:     record.ID,
		Title:  record.Title,
		Slug:   record.Slug,
		Locale: record.Locale,
		Status: record.Status,
		Data:   cloneAnyMap(record.Data),
	}
}

func mapContentType(record CMSContentType) admingraphql.ContentType {
	return admingraphql.ContentType{
		ID:           record.ID,
		Name:         record.Name,
		Slug:         record.Slug,
		Description:  record.Description,
		Schema:       cloneAnyMap(record.Schema),
		Capabilities: cloneAnyMap(record.Capabilities),
		Icon:         record.Icon,
	}
}

func mapContentTypeToCMS(record admingraphql.ContentType) CMSContentType {
	return CMSContentType{
		ID:           record.ID,
		Name:         record.Name,
		Slug:         record.Slug,
		Description:  record.Description,
		Schema:       cloneAnyMap(record.Schema),
		Capabilities: cloneAnyMap(record.Capabilities),
		Icon:         record.Icon,
	}
}
