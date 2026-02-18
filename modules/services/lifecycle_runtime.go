package services

import (
	"context"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strings"
	"sync"
	"time"

	goadmin "github.com/goliatone/go-admin/admin"
	gocore "github.com/goliatone/go-services/core"
	sqlstore "github.com/goliatone/go-services/store/sql"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type activityRuntime struct {
	sink            gocore.ServicesActivitySink
	operationalSink *gocore.OperationalActivitySink
	retentionPolicy gocore.ActivityRetentionPolicy
	fallbackMemory  *memoryActivityFallbackSink

	mu                 sync.Mutex
	lastCleanupAt      *time.Time
	lastCleanupDeleted int
	lastCleanupError   string
}

type activityRuntimeStatus struct {
	Enabled            bool          `json:"enabled"`
	RetentionTTL       time.Duration `json:"retention_ttl"`
	RetentionRowCap    int           `json:"retention_row_cap"`
	FallbackWrites     int           `json:"fallback_writes"`
	FallbackBuffered   int           `json:"fallback_buffered"`
	FallbackBufferCap  int           `json:"fallback_buffer_cap"`
	LastFallbackAt     *time.Time    `json:"last_fallback_at,omitempty"`
	LastCleanupAt      *time.Time    `json:"last_cleanup_at,omitempty"`
	LastCleanupDeleted int           `json:"last_cleanup_deleted"`
	LastCleanupError   string        `json:"last_cleanup_error,omitempty"`
}

func buildActivityRuntime(cfg Config, repositoryFactory any) (*activityRuntime, error) {
	activityCfg := cfg.Lifecycle.Projectors.Activity
	if !activityCfg.Enabled {
		return nil, nil
	}

	primary := activityCfg.PrimarySink
	if primary == nil && repositoryFactory != nil {
		if provider, ok := repositoryFactory.(interface {
			ActivityStore() *sqlstore.ActivityStore
		}); ok {
			primary = provider.ActivityStore()
		}
	}
	if primary == nil {
		return nil, nil
	}

	fallback := activityCfg.FallbackSink
	fallbackMemory, _ := fallback.(*memoryActivityFallbackSink)
	if fallback == nil {
		fallbackMemory = newMemoryActivityFallbackSink(activityCfg.FallbackBufferSize)
		fallback = fallbackMemory
	}

	policy := gocore.ActivityRetentionPolicy{
		TTL:    activityCfg.RetentionTTL,
		RowCap: activityCfg.RetentionRowCap,
	}
	operationalSink, err := gocore.NewOperationalActivitySink(primary, fallback, policy, activityCfg.BufferSize)
	if err != nil {
		return nil, fmt.Errorf("modules/services: build activity runtime: %w", err)
	}

	return &activityRuntime{
		sink:            operationalSink,
		operationalSink: operationalSink,
		retentionPolicy: policy,
		fallbackMemory:  fallbackMemory,
	}, nil
}

func (r *activityRuntime) Sink() gocore.ServicesActivitySink {
	if r == nil {
		return nil
	}
	return r.sink
}

func (r *activityRuntime) EnforceRetention(ctx context.Context) (int, error) {
	if r == nil || r.operationalSink == nil {
		return 0, nil
	}
	deleted, err := r.operationalSink.EnforceRetention(ctx)
	now := time.Now().UTC()
	r.mu.Lock()
	defer r.mu.Unlock()
	r.lastCleanupAt = &now
	r.lastCleanupDeleted = deleted
	if err != nil {
		r.lastCleanupError = err.Error()
	} else {
		r.lastCleanupError = ""
	}
	return deleted, err
}

func (r *activityRuntime) Status() activityRuntimeStatus {
	if r == nil {
		return activityRuntimeStatus{}
	}
	status := activityRuntimeStatus{
		Enabled:         r.sink != nil,
		RetentionTTL:    r.retentionPolicy.TTL,
		RetentionRowCap: r.retentionPolicy.RowCap,
	}
	if r.fallbackMemory != nil {
		writes, buffered, capacity, lastAt := r.fallbackMemory.Stats()
		status.FallbackWrites = writes
		status.FallbackBuffered = buffered
		status.FallbackBufferCap = capacity
		status.LastFallbackAt = lastAt
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.lastCleanupAt != nil {
		tm := r.lastCleanupAt.UTC()
		status.LastCleanupAt = &tm
	}
	status.LastCleanupDeleted = r.lastCleanupDeleted
	status.LastCleanupError = strings.TrimSpace(r.lastCleanupError)
	return status
}

func (r *activityRuntime) Close() {
	if r == nil || r.operationalSink == nil {
		return
	}
	r.operationalSink.Close()
}

type memoryActivityFallbackSink struct {
	mu         sync.Mutex
	entries    []gocore.ServiceActivityEntry
	maxEntries int
	writes     int
	lastAt     *time.Time
}

func newMemoryActivityFallbackSink(maxEntries int) *memoryActivityFallbackSink {
	if maxEntries <= 0 {
		maxEntries = 1024
	}
	return &memoryActivityFallbackSink{maxEntries: maxEntries}
}

func (s *memoryActivityFallbackSink) Record(_ context.Context, entry gocore.ServiceActivityEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.writes++
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now().UTC()
	}
	timestamp := entry.CreatedAt.UTC()
	s.lastAt = &timestamp
	s.entries = append(s.entries, entry)
	if len(s.entries) > s.maxEntries {
		s.entries = append([]gocore.ServiceActivityEntry(nil), s.entries[len(s.entries)-s.maxEntries:]...)
	}
	return nil
}

func (s *memoryActivityFallbackSink) List(_ context.Context, filter gocore.ServicesActivityFilter) (gocore.ServicesActivityPage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	perPage := filter.PerPage
	if perPage <= 0 {
		perPage = 25
	}
	offset := (page - 1) * perPage
	if offset > len(s.entries) {
		offset = len(s.entries)
	}
	end := offset + perPage
	if end > len(s.entries) {
		end = len(s.entries)
	}
	items := append([]gocore.ServiceActivityEntry(nil), s.entries[offset:end]...)
	return gocore.ServicesActivityPage{
		Items:      items,
		Page:       page,
		PerPage:    perPage,
		Total:      len(s.entries),
		HasNext:    end < len(s.entries),
		NextCursor: fmt.Sprintf("%d", end),
	}, nil
}

func (s *memoryActivityFallbackSink) Stats() (writes int, buffered int, capacity int, lastAt *time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	writes = s.writes
	buffered = len(s.entries)
	capacity = s.maxEntries
	if s.lastAt != nil {
		tm := s.lastAt.UTC()
		lastAt = &tm
	}
	return writes, buffered, capacity, lastAt
}

func buildNotificationsProjector(
	cfg LifecycleNotificationsProjectorConfig,
	ledger *sqlstore.NotificationDispatchStore,
	db *bun.DB,
	adminApp *goadmin.Admin,
) *gocore.GoNotificationsProjector {
	if ledger == nil {
		return nil
	}

	definitionResolver := cfg.DefinitionResolver
	if definitionResolver == nil {
		definitionResolver = lifecycleDefinitionMapResolver{mapping: cfg.DefinitionMap}
	}
	recipientResolver := cfg.RecipientResolver
	if recipientResolver == nil {
		recipientResolver = defaultLifecycleRecipientResolver{}
	}
	sender := cfg.Sender
	if sender == nil && adminApp != nil {
		sender = adminNotificationSender{service: adminApp.NotificationService()}
	}
	if definitionResolver == nil || recipientResolver == nil || sender == nil {
		return nil
	}
	dispatchLedger := gocore.NotificationDispatchLedger(ledger)
	if db != nil {
		dispatchLedger = retryableNotificationLedger{
			db:       db,
			fallback: ledger,
		}
	}
	return gocore.NewGoNotificationsProjector(definitionResolver, recipientResolver, sender, dispatchLedger)
}

type lifecycleDefinitionMapResolver struct {
	mapping map[string]string
}

func (r lifecycleDefinitionMapResolver) Resolve(_ context.Context, event gocore.LifecycleEvent) (string, bool, error) {
	if len(r.mapping) == 0 {
		return "", false, nil
	}
	if raw, ok := event.Metadata["notification_definition"]; ok {
		if code := strings.TrimSpace(fmt.Sprint(raw)); code != "" {
			return code, true, nil
		}
	}
	candidates := []string{
		strings.TrimSpace(event.Name),
		strings.ToLower(strings.TrimSpace(event.Name)),
		strings.ReplaceAll(strings.ToLower(strings.TrimSpace(event.Name)), " ", "."),
	}
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if mapped := strings.TrimSpace(r.mapping[candidate]); mapped != "" {
			return mapped, true, nil
		}
	}
	return "", false, nil
}

type defaultLifecycleRecipientResolver struct{}

func (defaultLifecycleRecipientResolver) Resolve(_ context.Context, event gocore.LifecycleEvent) ([]gocore.Recipient, error) {
	items := make([]gocore.Recipient, 0)
	seen := map[string]bool{}
	appendRecipient := func(kind string, id string) {
		kind = strings.ToLower(strings.TrimSpace(kind))
		id = strings.TrimSpace(id)
		if kind == "" || id == "" {
			return
		}
		key := kind + ":" + id
		if seen[key] {
			return
		}
		seen[key] = true
		items = append(items, gocore.Recipient{Type: kind, ID: id})
	}

	if strings.EqualFold(strings.TrimSpace(event.ScopeType), "user") {
		appendRecipient("user", event.ScopeID)
	}
	if raw, ok := event.Metadata["recipient_ids"]; ok {
		for _, id := range toStringSlice(raw) {
			appendRecipient("user", id)
		}
	}
	if raw, ok := event.Metadata["recipient_user_ids"]; ok {
		for _, id := range toStringSlice(raw) {
			appendRecipient("user", id)
		}
	}
	if raw, ok := event.Metadata["recipient_org_ids"]; ok {
		for _, id := range toStringSlice(raw) {
			appendRecipient("org", id)
		}
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Type == items[j].Type {
			return items[i].ID < items[j].ID
		}
		return items[i].Type < items[j].Type
	})
	return items, nil
}

type adminNotificationSender struct {
	service goadmin.NotificationService
}

func (s adminNotificationSender) Send(ctx context.Context, req gocore.NotificationSendRequest) error {
	if s.service == nil {
		return fmt.Errorf("modules/services: notification service is not configured")
	}
	definition := strings.TrimSpace(req.DefinitionCode)
	if definition == "" {
		definition = "services.lifecycle.event"
	}
	title := strings.ReplaceAll(definition, ".", " ")
	title = strings.TrimSpace(title)
	message := strings.TrimSpace(req.Event.Name)
	if message == "" {
		message = "Services lifecycle event"
	}

	for _, recipient := range req.Recipients {
		notification := goadmin.Notification{
			Title:   title,
			Message: message,
			Read:    false,
			Metadata: map[string]any{
				"definition_code": definition,
				"event_id":        strings.TrimSpace(req.Event.ID),
				"event_name":      strings.TrimSpace(req.Event.Name),
				"provider_id":     strings.TrimSpace(req.Event.ProviderID),
				"scope_type":      strings.TrimSpace(req.Event.ScopeType),
				"scope_id":        strings.TrimSpace(req.Event.ScopeID),
				"connection_id":   strings.TrimSpace(req.Event.ConnectionID),
				"recipient_type":  strings.TrimSpace(recipient.Type),
				"recipient_id":    strings.TrimSpace(recipient.ID),
			},
		}
		if strings.EqualFold(strings.TrimSpace(recipient.Type), "user") {
			notification.UserID = strings.TrimSpace(recipient.ID)
		}
		for key, value := range req.Metadata {
			notification.Metadata[key] = value
		}
		if _, err := s.service.Add(ctx, notification); err != nil {
			return err
		}
	}
	return nil
}

type retryableNotificationLedger struct {
	db       *bun.DB
	fallback gocore.NotificationDispatchLedger
}

func (l retryableNotificationLedger) Seen(ctx context.Context, idempotencyKey string) (bool, error) {
	key := strings.TrimSpace(idempotencyKey)
	if key == "" {
		return false, fmt.Errorf("modules/services: idempotency key is required")
	}
	if l.db == nil {
		if l.fallback == nil {
			return false, nil
		}
		return l.fallback.Seen(ctx, key)
	}
	count, err := l.db.NewSelect().
		Table("service_notification_dispatches").
		Where("idempotency_key = ?", key).
		Where("status = ?", "sent").
		Count(ctx)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (l retryableNotificationLedger) Record(ctx context.Context, record gocore.NotificationDispatchRecord) error {
	key := strings.TrimSpace(record.IdempotencyKey)
	if key == "" {
		return fmt.Errorf("modules/services: idempotency key is required")
	}
	if l.db == nil {
		if l.fallback == nil {
			return nil
		}
		return l.fallback.Record(ctx, record)
	}
	now := time.Now().UTC()
	_, err := l.db.NewRaw(
		`INSERT INTO service_notification_dispatches (
			id, event_id, projector, definition_code, recipient_key, idempotency_key, status, error, metadata, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (idempotency_key)
		DO UPDATE SET
			status = EXCLUDED.status,
			error = EXCLUDED.error,
			metadata = EXCLUDED.metadata`,
		uuid.NewString(),
		strings.TrimSpace(record.EventID),
		strings.TrimSpace(record.Projector),
		strings.TrimSpace(record.DefinitionCode),
		strings.TrimSpace(record.RecipientKey),
		key,
		primitives.FirstNonEmpty(strings.TrimSpace(record.Status), "sent"),
		strings.TrimSpace(record.Error),
		copyAnyMap(record.Metadata),
		now,
	).Exec(ctx)
	return err
}

var _ gocore.ServicesActivitySink = (*memoryActivityFallbackSink)(nil)
var _ gocore.NotificationDefinitionResolver = lifecycleDefinitionMapResolver{}
var _ gocore.NotificationRecipientResolver = defaultLifecycleRecipientResolver{}
var _ gocore.NotificationSender = adminNotificationSender{}
var _ gocore.NotificationDispatchLedger = retryableNotificationLedger{}
