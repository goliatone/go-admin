package admin

import (
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"

	delivery "github.com/goliatone/go-admin/admin/graphql"
	crud "github.com/goliatone/go-crud"
	repository "github.com/goliatone/go-repository-bun"
)

var errDeliveryReadOnly = errors.New("delivery service is read-only")

// DeliveryServices bundles CRUD-compatible services for GraphQL resolvers.
type DeliveryServices struct {
	Contents crud.Service[delivery.Content]
	Pages    crud.Service[delivery.Page]
	Menus    crud.Service[delivery.Menu]
}

// DeliveryOptions configures delivery adapters.
type DeliveryOptions struct {
	DefaultLocale string
}

// NewDeliveryServices builds read-only services backed by CMS adapters.
func NewDeliveryServices(container CMSContainer, opts DeliveryOptions) DeliveryServices {
	return DeliveryServices{
		Contents: NewDeliveryContentService(container, opts),
		Pages:    NewDeliveryPageService(container, opts),
		Menus:    NewDeliveryMenuService(container, opts),
	}
}

// DeliveryContentService adapts CMS content for delivery.
type DeliveryContentService struct {
	content       CMSContentService
	defaultLocale string
}

// NewDeliveryContentService constructs a delivery content service.
func NewDeliveryContentService(container CMSContainer, opts DeliveryOptions) *DeliveryContentService {
	var svc CMSContentService
	if container != nil {
		svc = container.ContentService()
	}
	return &DeliveryContentService{
		content:       svc,
		defaultLocale: strings.TrimSpace(opts.DefaultLocale),
	}
}

func (s *DeliveryContentService) Index(ctx crud.Context, _ []repository.SelectCriteria) ([]delivery.Content, int, error) {
	if s == nil || s.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := resolveDeliveryLocale(ctx, s.defaultLocale)
	records, err := s.content.Contents(ctx.UserContext(), locale)
	if err != nil {
		if locale != s.defaultLocale && s.defaultLocale != "" {
			records, err = s.content.Contents(ctx.UserContext(), s.defaultLocale)
		}
		if err != nil {
			return nil, 0, err
		}
	}
	filtered := make([]delivery.Content, 0, len(records))
	for _, record := range records {
		if !deliveryPublished(record.Status) {
			continue
		}
		filtered = append(filtered, mapDeliveryContent(record))
	}
	return filtered, len(filtered), nil
}

func (s *DeliveryContentService) Show(ctx crud.Context, id string, _ []repository.SelectCriteria) (delivery.Content, error) {
	if s == nil || s.content == nil {
		return delivery.Content{}, ErrNotFound
	}
	locale := resolveDeliveryLocale(ctx, s.defaultLocale)
	record, err := s.content.Content(ctx.UserContext(), id, locale)
	if err != nil && shouldFallbackDeliveryLocale(locale, s.defaultLocale) {
		record, err = s.content.Content(ctx.UserContext(), id, s.defaultLocale)
	}
	if err != nil {
		return delivery.Content{}, err
	}
	if !deliveryPublished(record.Status) {
		return delivery.Content{}, ErrNotFound
	}
	return mapDeliveryContent(*record), nil
}

func (s *DeliveryContentService) Create(crud.Context, delivery.Content) (delivery.Content, error) {
	return delivery.Content{}, errDeliveryReadOnly
}
func (s *DeliveryContentService) CreateBatch(crud.Context, []delivery.Content) ([]delivery.Content, error) {
	return nil, errDeliveryReadOnly
}
func (s *DeliveryContentService) Update(crud.Context, delivery.Content) (delivery.Content, error) {
	return delivery.Content{}, errDeliveryReadOnly
}
func (s *DeliveryContentService) UpdateBatch(crud.Context, []delivery.Content) ([]delivery.Content, error) {
	return nil, errDeliveryReadOnly
}
func (s *DeliveryContentService) Delete(crud.Context, delivery.Content) error {
	return errDeliveryReadOnly
}
func (s *DeliveryContentService) DeleteBatch(crud.Context, []delivery.Content) error {
	return errDeliveryReadOnly
}

// DeliveryPageService adapts CMS pages for delivery.
type DeliveryPageService struct {
	content       CMSContentService
	defaultLocale string
}

// NewDeliveryPageService constructs a delivery page service.
func NewDeliveryPageService(container CMSContainer, opts DeliveryOptions) *DeliveryPageService {
	var svc CMSContentService
	if container != nil {
		svc = container.ContentService()
	}
	return &DeliveryPageService{
		content:       svc,
		defaultLocale: strings.TrimSpace(opts.DefaultLocale),
	}
}

func (s *DeliveryPageService) Index(ctx crud.Context, _ []repository.SelectCriteria) ([]delivery.Page, int, error) {
	if s == nil || s.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := resolveDeliveryLocale(ctx, s.defaultLocale)
	records, err := s.content.Pages(ctx.UserContext(), locale)
	if err != nil {
		if locale != s.defaultLocale && s.defaultLocale != "" {
			records, err = s.content.Pages(ctx.UserContext(), s.defaultLocale)
		}
		if err != nil {
			return nil, 0, err
		}
	}
	filtered := make([]delivery.Page, 0, len(records))
	for _, record := range records {
		if !deliveryPublished(record.Status) {
			continue
		}
		filtered = append(filtered, mapDeliveryPage(record))
	}
	return filtered, len(filtered), nil
}

func (s *DeliveryPageService) Show(ctx crud.Context, id string, _ []repository.SelectCriteria) (delivery.Page, error) {
	if s == nil || s.content == nil {
		return delivery.Page{}, ErrNotFound
	}
	locale := resolveDeliveryLocale(ctx, s.defaultLocale)
	record, err := s.content.Page(ctx.UserContext(), id, locale)
	if err != nil && shouldFallbackDeliveryLocale(locale, s.defaultLocale) {
		record, err = s.content.Page(ctx.UserContext(), id, s.defaultLocale)
	}
	if err != nil {
		return delivery.Page{}, err
	}
	if !deliveryPublished(record.Status) {
		return delivery.Page{}, ErrNotFound
	}
	return mapDeliveryPage(*record), nil
}

func (s *DeliveryPageService) Create(crud.Context, delivery.Page) (delivery.Page, error) {
	return delivery.Page{}, errDeliveryReadOnly
}
func (s *DeliveryPageService) CreateBatch(crud.Context, []delivery.Page) ([]delivery.Page, error) {
	return nil, errDeliveryReadOnly
}
func (s *DeliveryPageService) Update(crud.Context, delivery.Page) (delivery.Page, error) {
	return delivery.Page{}, errDeliveryReadOnly
}
func (s *DeliveryPageService) UpdateBatch(crud.Context, []delivery.Page) ([]delivery.Page, error) {
	return nil, errDeliveryReadOnly
}
func (s *DeliveryPageService) Delete(crud.Context, delivery.Page) error {
	return errDeliveryReadOnly
}
func (s *DeliveryPageService) DeleteBatch(crud.Context, []delivery.Page) error {
	return errDeliveryReadOnly
}

// DeliveryMenuService adapts CMS menus for delivery.
type DeliveryMenuService struct {
	menus         CMSMenuService
	defaultLocale string
}

// NewDeliveryMenuService constructs a delivery menu service.
func NewDeliveryMenuService(container CMSContainer, opts DeliveryOptions) *DeliveryMenuService {
	var svc CMSMenuService
	if container != nil {
		svc = container.MenuService()
	}
	return &DeliveryMenuService{
		menus:         svc,
		defaultLocale: strings.TrimSpace(opts.DefaultLocale),
	}
}

func (s *DeliveryMenuService) Index(ctx crud.Context, _ []repository.SelectCriteria) ([]delivery.Menu, int, error) {
	if s == nil || s.menus == nil {
		return nil, 0, ErrNotFound
	}
	return []delivery.Menu{}, 0, nil
}

func (s *DeliveryMenuService) Show(ctx crud.Context, id string, _ []repository.SelectCriteria) (delivery.Menu, error) {
	if s == nil || s.menus == nil {
		return delivery.Menu{}, ErrNotFound
	}
	locale := resolveDeliveryLocale(ctx, s.defaultLocale)
	record, err := s.menus.MenuByLocation(ctx.UserContext(), id, locale)
	if err != nil && shouldFallbackDeliveryLocale(locale, s.defaultLocale) {
		record, err = s.menus.MenuByLocation(ctx.UserContext(), id, s.defaultLocale)
	}
	if err != nil {
		return delivery.Menu{}, err
	}
	return mapDeliveryMenu(*record), nil
}

func (s *DeliveryMenuService) Create(crud.Context, delivery.Menu) (delivery.Menu, error) {
	return delivery.Menu{}, errDeliveryReadOnly
}
func (s *DeliveryMenuService) CreateBatch(crud.Context, []delivery.Menu) ([]delivery.Menu, error) {
	return nil, errDeliveryReadOnly
}
func (s *DeliveryMenuService) Update(crud.Context, delivery.Menu) (delivery.Menu, error) {
	return delivery.Menu{}, errDeliveryReadOnly
}
func (s *DeliveryMenuService) UpdateBatch(crud.Context, []delivery.Menu) ([]delivery.Menu, error) {
	return nil, errDeliveryReadOnly
}
func (s *DeliveryMenuService) Delete(crud.Context, delivery.Menu) error {
	return errDeliveryReadOnly
}
func (s *DeliveryMenuService) DeleteBatch(crud.Context, []delivery.Menu) error {
	return errDeliveryReadOnly
}

func resolveDeliveryLocale(ctx crud.Context, fallback string) string {
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

func shouldFallbackDeliveryLocale(locale, fallback string) bool {
	fallback = strings.TrimSpace(fallback)
	return fallback != "" && locale != "" && locale != fallback
}

func deliveryPublished(status string) bool {
	return strings.EqualFold(strings.TrimSpace(status), "published")
}

func mapDeliveryContent(record CMSContent) delivery.Content {
	applyEmbeddedBlocksToContent(&record)
	contentType := strings.TrimSpace(record.ContentTypeSlug)
	if contentType == "" {
		contentType = strings.TrimSpace(record.ContentType)
	}
	return delivery.Content{
		ID:     record.ID,
		Type:   contentType,
		Slug:   record.Slug,
		Locale: record.Locale,
		Status: record.Status,
		Data:   primitives.CloneAnyMap(record.Data),
	}
}

func mapDeliveryPage(record CMSPage) delivery.Page {
	applyEmbeddedBlocksToPage(&record)
	return delivery.Page{
		ID:     record.ID,
		Title:  record.Title,
		Slug:   record.Slug,
		Locale: record.Locale,
		Status: record.Status,
		Data:   primitives.CloneAnyMap(record.Data),
	}
}

func mapDeliveryMenu(record Menu) delivery.Menu {
	return delivery.Menu{
		ID:       record.ID,
		Code:     record.Code,
		Location: record.Location,
		Items:    mapDeliveryMenuItems(record.Items),
	}
}

func mapDeliveryMenuItems(items []MenuItem) []delivery.MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]delivery.MenuItem, 0, len(items))
	for _, item := range items {
		target := primitives.CloneAnyMap(item.Target)
		url := ""
		if raw, ok := target["url"].(string); ok {
			url = strings.TrimSpace(raw)
		}
		out = append(out, delivery.MenuItem{
			ID:       item.ID,
			Type:     item.Type,
			Label:    item.Label,
			URL:      url,
			Target:   target,
			Children: mapDeliveryMenuItems(item.Children),
		})
	}
	return out
}
