package admin

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-notifications/pkg/domain"
	"github.com/goliatone/go-notifications/pkg/interfaces/store"
	"github.com/google/uuid"
)

type notificationMemoryBase[T any] struct {
	mu      sync.RWMutex
	records map[uuid.UUID]T
	meta    func(*T) *domain.RecordMeta
}

func newNotificationMemoryBase[T any](meta func(*T) *domain.RecordMeta) notificationMemoryBase[T] {
	return notificationMemoryBase[T]{
		records: make(map[uuid.UUID]T),
		meta:    meta,
	}
}

func (b *notificationMemoryBase[T]) create(record *T) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	meta := b.meta(record)
	meta.EnsureID()
	now := time.Now().UTC()
	if meta.CreatedAt.IsZero() {
		meta.CreatedAt = now
	}
	meta.UpdatedAt = now
	b.records[meta.ID] = *record
	return nil
}

func (b *notificationMemoryBase[T]) update(record *T) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	meta := b.meta(record)
	if meta.ID == uuid.Nil {
		return store.ErrNotFound
	}
	if _, ok := b.records[meta.ID]; !ok {
		return store.ErrNotFound
	}
	meta.UpdatedAt = time.Now().UTC()
	b.records[meta.ID] = *record
	return nil
}

func (b *notificationMemoryBase[T]) getByID(id uuid.UUID, includeDeleted bool) (*T, error) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	record, ok := b.records[id]
	if !ok {
		return nil, store.ErrNotFound
	}
	meta := b.meta(&record)
	if !includeDeleted && !meta.DeletedAt.IsZero() {
		return nil, store.ErrNotFound
	}
	copy := record
	return &copy, nil
}

func (b *notificationMemoryBase[T]) list(opts store.ListOptions) (store.ListResult[T], error) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	filtered := make([]T, 0, len(b.records))
	for _, record := range b.records {
		meta := b.meta(&record)
		if !opts.IncludeSoftDeleted && !meta.DeletedAt.IsZero() {
			continue
		}
		if !opts.Since.IsZero() && meta.CreatedAt.Before(opts.Since) {
			continue
		}
		if !opts.Until.IsZero() && meta.CreatedAt.After(opts.Until) {
			continue
		}
		filtered = append(filtered, record)
	}
	sort.Slice(filtered, func(i, j int) bool {
		return b.meta(&filtered[i]).CreatedAt.Before(b.meta(&filtered[j]).CreatedAt)
	})
	total := len(filtered)
	start := opts.Offset
	if start > total {
		start = total
	}
	end := total
	if opts.Limit > 0 && start+opts.Limit < end {
		end = start + opts.Limit
	}
	return store.ListResult[T]{
		Items: filtered[start:end],
		Total: total,
	}, nil
}

func (b *notificationMemoryBase[T]) softDelete(id uuid.UUID) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	record, ok := b.records[id]
	if !ok {
		return store.ErrNotFound
	}
	meta := b.meta(&record)
	if meta.DeletedAt.IsZero() {
		meta.DeletedAt = time.Now().UTC()
	}
	b.records[id] = record
	return nil
}

type memoryDefinitionRepository struct {
	base notificationMemoryBase[domain.NotificationDefinition]
}

func newMemoryDefinitionRepository() *memoryDefinitionRepository {
	return &memoryDefinitionRepository{
		base: newNotificationMemoryBase(func(def *domain.NotificationDefinition) *domain.RecordMeta { return &def.RecordMeta }),
	}
}

func (r *memoryDefinitionRepository) Create(ctx context.Context, record *domain.NotificationDefinition) error {
	_ = ctx
	return r.base.create(record)
}

func (r *memoryDefinitionRepository) Update(ctx context.Context, record *domain.NotificationDefinition) error {
	_ = ctx
	return r.base.update(record)
}

func (r *memoryDefinitionRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NotificationDefinition, error) {
	_ = ctx
	return r.base.getByID(id, false)
}

func (r *memoryDefinitionRepository) List(ctx context.Context, opts store.ListOptions) (store.ListResult[domain.NotificationDefinition], error) {
	_ = ctx
	return r.base.list(opts)
}

func (r *memoryDefinitionRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_ = ctx
	return r.base.softDelete(id)
}

func (r *memoryDefinitionRepository) GetByCode(ctx context.Context, code string) (*domain.NotificationDefinition, error) {
	_ = ctx
	r.base.mu.RLock()
	defer r.base.mu.RUnlock()
	for _, def := range r.base.records {
		if strings.EqualFold(def.Code, code) {
			copy := def
			return &copy, nil
		}
	}
	return nil, store.ErrNotFound
}

type memoryTemplateRepository struct {
	base notificationMemoryBase[domain.NotificationTemplate]
}

func newMemoryTemplateRepository() *memoryTemplateRepository {
	return &memoryTemplateRepository{
		base: newNotificationMemoryBase(func(tpl *domain.NotificationTemplate) *domain.RecordMeta { return &tpl.RecordMeta }),
	}
}

func (r *memoryTemplateRepository) Create(ctx context.Context, record *domain.NotificationTemplate) error {
	_ = ctx
	return r.base.create(record)
}

func (r *memoryTemplateRepository) Update(ctx context.Context, record *domain.NotificationTemplate) error {
	_ = ctx
	return r.base.update(record)
}

func (r *memoryTemplateRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NotificationTemplate, error) {
	_ = ctx
	return r.base.getByID(id, false)
}

func (r *memoryTemplateRepository) List(ctx context.Context, opts store.ListOptions) (store.ListResult[domain.NotificationTemplate], error) {
	_ = ctx
	return r.base.list(opts)
}

func (r *memoryTemplateRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_ = ctx
	return r.base.softDelete(id)
}

func (r *memoryTemplateRepository) GetByCodeAndLocale(ctx context.Context, code, locale, channel string) (*domain.NotificationTemplate, error) {
	_ = ctx
	r.base.mu.RLock()
	defer r.base.mu.RUnlock()
	for _, tpl := range r.base.records {
		if strings.EqualFold(tpl.Code, code) && strings.EqualFold(tpl.Locale, locale) && strings.EqualFold(tpl.Channel, channel) {
			copy := tpl
			return &copy, nil
		}
	}
	return nil, store.ErrNotFound
}

func (r *memoryTemplateRepository) ListByCode(ctx context.Context, code string, opts store.ListOptions) (store.ListResult[domain.NotificationTemplate], error) {
	all, err := r.List(ctx, opts)
	if err != nil {
		return store.ListResult[domain.NotificationTemplate]{}, err
	}
	filtered := make([]domain.NotificationTemplate, 0, len(all.Items))
	for _, item := range all.Items {
		if strings.EqualFold(item.Code, code) {
			filtered = append(filtered, item)
		}
	}
	return store.ListResult[domain.NotificationTemplate]{Items: filtered, Total: len(filtered)}, nil
}

type memoryEventRepository struct {
	base notificationMemoryBase[domain.NotificationEvent]
}

func newMemoryEventRepository() *memoryEventRepository {
	return &memoryEventRepository{
		base: newNotificationMemoryBase(func(evt *domain.NotificationEvent) *domain.RecordMeta { return &evt.RecordMeta }),
	}
}

func (r *memoryEventRepository) Create(ctx context.Context, record *domain.NotificationEvent) error {
	_ = ctx
	return r.base.create(record)
}

func (r *memoryEventRepository) Update(ctx context.Context, record *domain.NotificationEvent) error {
	_ = ctx
	return r.base.update(record)
}

func (r *memoryEventRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NotificationEvent, error) {
	_ = ctx
	return r.base.getByID(id, false)
}

func (r *memoryEventRepository) List(ctx context.Context, opts store.ListOptions) (store.ListResult[domain.NotificationEvent], error) {
	_ = ctx
	return r.base.list(opts)
}

func (r *memoryEventRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_ = ctx
	return r.base.softDelete(id)
}

func (r *memoryEventRepository) ListPending(ctx context.Context, limit int) ([]domain.NotificationEvent, error) {
	opts := store.ListOptions{Limit: limit}
	result, err := r.List(ctx, opts)
	if err != nil {
		return nil, err
	}
	pending := make([]domain.NotificationEvent, 0, len(result.Items))
	for _, evt := range result.Items {
		if evt.Status == domain.EventStatusPending {
			pending = append(pending, evt)
		}
	}
	return pending, nil
}

func (r *memoryEventRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	record, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	record.Status = status
	return r.Update(ctx, record)
}

type memoryMessageRepository struct {
	base notificationMemoryBase[domain.NotificationMessage]
}

func newMemoryMessageRepository() *memoryMessageRepository {
	return &memoryMessageRepository{
		base: newNotificationMemoryBase(func(msg *domain.NotificationMessage) *domain.RecordMeta { return &msg.RecordMeta }),
	}
}

func (r *memoryMessageRepository) Create(ctx context.Context, record *domain.NotificationMessage) error {
	_ = ctx
	return r.base.create(record)
}

func (r *memoryMessageRepository) Update(ctx context.Context, record *domain.NotificationMessage) error {
	_ = ctx
	return r.base.update(record)
}

func (r *memoryMessageRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NotificationMessage, error) {
	_ = ctx
	return r.base.getByID(id, false)
}

func (r *memoryMessageRepository) List(ctx context.Context, opts store.ListOptions) (store.ListResult[domain.NotificationMessage], error) {
	_ = ctx
	return r.base.list(opts)
}

func (r *memoryMessageRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_ = ctx
	return r.base.softDelete(id)
}

func (r *memoryMessageRepository) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]domain.NotificationMessage, error) {
	opts := store.ListOptions{}
	result, err := r.List(ctx, opts)
	if err != nil {
		return nil, err
	}
	filtered := make([]domain.NotificationMessage, 0, len(result.Items))
	for _, msg := range result.Items {
		if msg.EventID == eventID {
			filtered = append(filtered, msg)
		}
	}
	return filtered, nil
}

type memoryAttemptRepository struct {
	base notificationMemoryBase[domain.DeliveryAttempt]
}

func newMemoryAttemptRepository() *memoryAttemptRepository {
	return &memoryAttemptRepository{
		base: newNotificationMemoryBase(func(attempt *domain.DeliveryAttempt) *domain.RecordMeta { return &attempt.RecordMeta }),
	}
}

func (r *memoryAttemptRepository) Create(ctx context.Context, record *domain.DeliveryAttempt) error {
	_ = ctx
	return r.base.create(record)
}

func (r *memoryAttemptRepository) Update(ctx context.Context, record *domain.DeliveryAttempt) error {
	_ = ctx
	return r.base.update(record)
}

func (r *memoryAttemptRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.DeliveryAttempt, error) {
	_ = ctx
	return r.base.getByID(id, false)
}

func (r *memoryAttemptRepository) List(ctx context.Context, opts store.ListOptions) (store.ListResult[domain.DeliveryAttempt], error) {
	_ = ctx
	return r.base.list(opts)
}

func (r *memoryAttemptRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_ = ctx
	return r.base.softDelete(id)
}

func (r *memoryAttemptRepository) ListByMessage(ctx context.Context, messageID uuid.UUID) ([]domain.DeliveryAttempt, error) {
	opts := store.ListOptions{}
	result, err := r.List(ctx, opts)
	if err != nil {
		return nil, err
	}
	filtered := make([]domain.DeliveryAttempt, 0, len(result.Items))
	for _, attempt := range result.Items {
		if attempt.MessageID == messageID {
			filtered = append(filtered, attempt)
		}
	}
	return filtered, nil
}

type memoryPreferenceRepository struct {
	base notificationMemoryBase[domain.NotificationPreference]
}

func newMemoryPreferenceRepository() *memoryPreferenceRepository {
	return &memoryPreferenceRepository{
		base: newNotificationMemoryBase(func(pref *domain.NotificationPreference) *domain.RecordMeta { return &pref.RecordMeta }),
	}
}

func (r *memoryPreferenceRepository) Create(ctx context.Context, record *domain.NotificationPreference) error {
	_ = ctx
	return r.base.create(record)
}

func (r *memoryPreferenceRepository) Update(ctx context.Context, record *domain.NotificationPreference) error {
	_ = ctx
	return r.base.update(record)
}

func (r *memoryPreferenceRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NotificationPreference, error) {
	_ = ctx
	return r.base.getByID(id, false)
}

func (r *memoryPreferenceRepository) List(ctx context.Context, opts store.ListOptions) (store.ListResult[domain.NotificationPreference], error) {
	_ = ctx
	return r.base.list(opts)
}

func (r *memoryPreferenceRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_ = ctx
	return r.base.softDelete(id)
}

func (r *memoryPreferenceRepository) GetBySubject(ctx context.Context, subjectType, subjectID, definitionCode string, channel string) (*domain.NotificationPreference, error) {
	_ = ctx
	r.base.mu.RLock()
	defer r.base.mu.RUnlock()
	for _, pref := range r.base.records {
		if strings.EqualFold(pref.SubjectType, subjectType) &&
			strings.EqualFold(pref.SubjectID, subjectID) &&
			strings.EqualFold(pref.DefinitionCode, definitionCode) &&
			strings.EqualFold(pref.Channel, channel) {
			copy := pref
			return &copy, nil
		}
	}
	return nil, store.ErrNotFound
}

type memoryInboxRepository struct {
	base notificationMemoryBase[domain.InboxItem]
}

func newMemoryInboxRepository() *memoryInboxRepository {
	return &memoryInboxRepository{
		base: newNotificationMemoryBase(func(item *domain.InboxItem) *domain.RecordMeta { return &item.RecordMeta }),
	}
}

func (r *memoryInboxRepository) Create(ctx context.Context, record *domain.InboxItem) error {
	_ = ctx
	return r.base.create(record)
}

func (r *memoryInboxRepository) Update(ctx context.Context, record *domain.InboxItem) error {
	_ = ctx
	return r.base.update(record)
}

func (r *memoryInboxRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.InboxItem, error) {
	_ = ctx
	return r.base.getByID(id, false)
}

func (r *memoryInboxRepository) List(ctx context.Context, opts store.ListOptions) (store.ListResult[domain.InboxItem], error) {
	_ = ctx
	return r.base.list(opts)
}

func (r *memoryInboxRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_ = ctx
	return r.base.softDelete(id)
}

func (r *memoryInboxRepository) ListByUser(ctx context.Context, userID string, opts store.ListOptions) (store.ListResult[domain.InboxItem], error) {
	result, err := r.List(ctx, opts)
	if err != nil {
		return store.ListResult[domain.InboxItem]{}, err
	}
	filtered := make([]domain.InboxItem, 0, len(result.Items))
	for _, item := range result.Items {
		if strings.EqualFold(item.UserID, userID) {
			filtered = append(filtered, item)
		}
	}
	return store.ListResult[domain.InboxItem]{Items: filtered, Total: len(filtered)}, nil
}

func (r *memoryInboxRepository) MarkRead(ctx context.Context, id uuid.UUID, read bool) error {
	item, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	item.Unread = !read
	if read {
		item.ReadAt = time.Now().UTC()
	} else {
		item.ReadAt = time.Time{}
	}
	return r.Update(ctx, item)
}

func (r *memoryInboxRepository) Snooze(ctx context.Context, id uuid.UUID, until time.Time) error {
	item, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	item.SnoozedUntil = until.UTC()
	return r.Update(ctx, item)
}

func (r *memoryInboxRepository) Dismiss(ctx context.Context, id uuid.UUID) error {
	item, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	item.DismissedAt = time.Now().UTC()
	item.Unread = false
	return r.Update(ctx, item)
}

func (r *memoryInboxRepository) CountUnread(ctx context.Context, userID string) (int, error) {
	_ = ctx
	r.base.mu.RLock()
	defer r.base.mu.RUnlock()
	count := 0
	for _, item := range r.base.records {
		if strings.EqualFold(item.UserID, userID) && item.Unread && item.DismissedAt.IsZero() {
			count++
		}
	}
	return count, nil
}
