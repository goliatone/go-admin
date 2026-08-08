package admin

import (
	"context"
	"errors"
	"maps"
	"sort"
	"strings"
	"sync"

	i18n "github.com/goliatone/go-i18n"
	notifactivity "github.com/goliatone/go-notifications/pkg/activity"
	notifconfig "github.com/goliatone/go-notifications/pkg/config"
	"github.com/goliatone/go-notifications/pkg/deliveries"
	"github.com/goliatone/go-notifications/pkg/domain"
	"github.com/goliatone/go-notifications/pkg/events"
	notifinbox "github.com/goliatone/go-notifications/pkg/inbox"
	notiflogger "github.com/goliatone/go-notifications/pkg/interfaces/logger"
	notifstore "github.com/goliatone/go-notifications/pkg/interfaces/store"
	"github.com/goliatone/go-notifications/pkg/notifier"
	"github.com/goliatone/go-notifications/pkg/privacy"
	"github.com/goliatone/go-notifications/pkg/retention"
	notifstorage "github.com/goliatone/go-notifications/pkg/storage"
	notiftemplates "github.com/goliatone/go-notifications/pkg/templates"
	"github.com/google/uuid"
)

const defaultNotificationDefinition = "admin.notification"

// go-template/pongo2 registers filters in a process-global map while a
// notification module is constructed. Serialize that narrow initialization
// boundary; runtime use and persistent seed reconciliation remain concurrent.
var notificationModuleInitMu sync.Mutex

type goNotificationsService struct {
	dispatchMu        sync.Mutex
	module            *notifier.Module
	manager           *notifier.Manager
	inbox             *notifinbox.Service
	definitions       notifstore.NotificationDefinitionRepository
	defaultLocale     string
	defaultDefinition string
	defaultChannel    string
	activityHook      *notificationsActivityHook
	metrics           notifstorage.MetricsCollector
}

func newGoNotificationsService(defaultLocale string, translator Translator, sink ActivitySink) (*goNotificationsService, error) {
	return newGoNotificationsServiceWithProviders(defaultLocale, translator, sink, notifstorage.NewMemoryProviders())
}

func newGoNotificationsServiceWithProviders(defaultLocale string, translator Translator, sink ActivitySink, providers notifstorage.Providers) (*goNotificationsService, error) {
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}
	if err := validateNotificationProviders(providers); err != nil {
		return nil, err
	}
	providers.Metrics = normalizeNotificationMetrics(providers.Metrics)
	activityHook := &notificationsActivityHook{}
	activityHook.SetSink(sink)
	moduleConfig := notifconfig.Defaults()
	moduleConfig.Localization.DefaultLocale = defaultLocale
	notificationModuleInitMu.Lock()
	module, err := notifier.NewModule(notifier.ModuleOptions{
		Config:     moduleConfig,
		Storage:    providers,
		Logger:     &notiflogger.Nop{},
		Translator: notificationsTranslator(defaultLocale, translator),
		Fallbacks:  i18n.NewStaticFallbackResolver(),
		Activity:   notifactivity.Hooks{activityHook},
	})
	if err != nil {
		notificationModuleInitMu.Unlock()
		return nil, err
	}
	module.Templates().RegisterHelpers(map[string]any{"snake_case": toSnakeCase})
	notificationModuleInitMu.Unlock()

	svc := &goNotificationsService{
		module:            module,
		manager:           module.Manager(),
		inbox:             module.Inbox(),
		definitions:       providers.Definitions,
		defaultDefinition: defaultNotificationDefinition,
		defaultChannel:    "inbox",
		defaultLocale:     defaultLocale,
		activityHook:      activityHook,
		metrics:           normalizeNotificationMetrics(providers.Metrics),
	}
	if err := svc.registerDefaults(module.Templates()); err != nil {
		return nil, err
	}
	return svc, nil
}

func (s *goNotificationsService) notificationMetrics() notifstorage.MetricsCollector {
	if s == nil {
		return nil
	}
	return normalizeNotificationMetrics(s.metrics)
}

func (s *goNotificationsService) List(ctx context.Context) ([]Notification, error) {
	if s == nil || s.inbox == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureNotifications)}
	}
	userID := s.resolveUserID(ctx, "")
	result, err := s.inbox.List(ctx, userID, notifstore.ListOptions{}, notifinbox.ListFilters{})
	if err != nil {
		return nil, err
	}
	allItems := append([]domain.InboxItem{}, result.Items...)
	if userID != "system" {
		if sys, err := s.inbox.List(ctx, "system", notifstore.ListOptions{}, notifinbox.ListFilters{}); err == nil {
			allItems = append(allItems, sys.Items...)
		}
	}
	seen := map[string]bool{}
	items := make([]Notification, 0, len(allItems))
	for _, item := range allItems {
		if seen[item.ID.String()] {
			continue
		}
		seen[item.ID.String()] = true
		items = append(items, mapInboxItem(item))
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	return items, nil
}

func (s *goNotificationsService) Add(ctx context.Context, n Notification) (Notification, error) {
	if s == nil || s.manager == nil || s.inbox == nil {
		return Notification{}, FeatureDisabledError{Feature: string(FeatureNotifications)}
	}
	userID := s.resolveUserID(ctx, n.UserID)
	locale := strings.TrimSpace(n.Locale)
	if locale == "" {
		locale = s.defaultLocale
	}
	definition := s.defaultDefinition
	channel := s.defaultChannel
	payload := domain.JSONMap{
		"title": n.Title,
		"body":  n.Message,
	}
	if locale != "" {
		payload["locale"] = locale
	}
	if n.ActionURL != "" {
		payload["action_url"] = n.ActionURL
	}
	if len(n.Metadata) > 0 {
		payload["metadata"] = cloneNotificationMap(n.Metadata)
	}
	receipt, err := s.sendWithReceipt(ctx, notifier.Event{
		DefinitionCode: definition,
		Recipients:     []string{userID},
		Context:        payload,
		Channels:       []string{channel},
		ActorID:        actorFromContext(ctx),
		TenantID:       tenantIDFromContext(ctx),
		Locale:         locale,
	})
	if err != nil {
		return Notification{}, err
	}
	messageID, err := notificationInboxMessageID(receipt, userID, channel)
	if err != nil {
		return Notification{}, err
	}
	return s.notificationForInboxMessage(ctx, userID, messageID)
}

func (s *goNotificationsService) notificationForInboxMessage(ctx context.Context, userID string, messageID uuid.UUID) (Notification, error) {
	result, err := s.inbox.List(ctx, userID, notifstore.ListOptions{}, notifinbox.ListFilters{})
	if err != nil {
		return Notification{}, err
	}
	for _, item := range result.Items {
		if item.MessageID == messageID {
			return mapInboxItem(item), nil
		}
	}
	return Notification{}, serviceUnavailableDomainError(
		"notification inbox item unavailable",
		map[string]any{"component": "notifications", "capability": "inbox"},
	)
}

func (s *goNotificationsService) sendWithReceipt(ctx context.Context, event notifier.Event) (events.DispatchReceipt, error) {
	// go-notifications v0.16.1 registers a loaded template in the same
	// in-memory registry it renders from. Keep render-capable module operations
	// serialized until the dependency provides an internally synchronized
	// registry.
	s.dispatchMu.Lock()
	defer s.dispatchMu.Unlock()
	return s.manager.SendWithReceipt(ctx, event)
}

func notificationInboxMessageID(receipt events.DispatchReceipt, userID, channel string) (uuid.UUID, error) {
	safeSubjectID := privacy.DefaultPolicy{}.SafeSubjectID(userID)
	for _, outcome := range receipt.Outcomes {
		if outcome.MessageID == uuid.Nil || !strings.EqualFold(strings.TrimSpace(outcome.Channel), strings.TrimSpace(channel)) {
			continue
		}
		if outcome.SubjectID != "" && outcome.SubjectID != safeSubjectID {
			continue
		}
		return outcome.MessageID, nil
	}
	return uuid.Nil, serviceUnavailableDomainError(
		"notification dispatch outcome unavailable",
		map[string]any{"component": "notifications", "capability": "inbox_receipt"},
	)
}

func (s *goNotificationsService) DispatchWithReceipt(ctx context.Context, event notifier.Event) (events.DispatchReceipt, error) {
	if s == nil || s.manager == nil {
		return events.DispatchReceipt{}, NotificationCapabilityUnavailableError{Capability: "events"}
	}
	return s.sendWithReceipt(ctx, event)
}

func (s *goNotificationsService) RetryWithReceipt(ctx context.Context, request events.RetryRequest) (events.DispatchReceipt, error) {
	if s == nil || s.module == nil {
		return events.DispatchReceipt{}, NotificationCapabilityUnavailableError{Capability: "events"}
	}
	s.dispatchMu.Lock()
	defer s.dispatchMu.Unlock()
	return s.module.RetryWithReceipt(ctx, request)
}

func (s *goNotificationsService) RecoverPending(ctx context.Context, limit int) error {
	if s == nil || s.module == nil {
		return NotificationCapabilityUnavailableError{Capability: "events"}
	}
	s.dispatchMu.Lock()
	defer s.dispatchMu.Unlock()
	return s.module.RecoverPending(ctx, limit)
}

func (s *goNotificationsService) LookupReceipt(ctx context.Context, lookup events.ReceiptLookup) (events.DispatchReceipt, error) {
	if s == nil || s.module == nil {
		return events.DispatchReceipt{}, NotificationCapabilityUnavailableError{Capability: "receipts"}
	}
	if strings.TrimSpace(lookup.IdempotencyScope) == "" {
		return events.DispatchReceipt{}, privacy.SafeError{
			Category: "validation", Code: "idempotency_scope_required", Message: "idempotency scope is required",
		}
	}
	return s.module.LookupReceipt(ctx, lookup)
}

func (s *goNotificationsService) GetDelivery(ctx context.Context, query deliveries.GetQuery) (deliveries.View, error) {
	if s == nil || s.module == nil || s.module.Deliveries() == nil {
		return deliveries.View{}, NotificationCapabilityUnavailableError{Capability: "delivery_inspection"}
	}
	return s.module.Deliveries().Get(ctx, query)
}

func (s *goNotificationsService) ListDeliveries(ctx context.Context, query deliveries.ListQuery) (deliveries.Page, error) {
	if s == nil || s.module == nil || s.module.Deliveries() == nil {
		return deliveries.Page{}, NotificationCapabilityUnavailableError{Capability: "delivery_inspection"}
	}
	return s.module.Deliveries().List(ctx, query)
}

func (s *goNotificationsService) Purge(ctx context.Context, request retention.Request) (retention.Result, error) {
	if s == nil || s.module == nil || s.module.Retention() == nil {
		return retention.Result{}, NotificationCapabilityUnavailableError{Capability: "retention"}
	}
	return s.module.Retention().Purge(ctx, request)
}

func (s *goNotificationsService) Mark(ctx context.Context, ids []string, read bool) error {
	if s == nil || s.inbox == nil {
		return FeatureDisabledError{Feature: string(FeatureNotifications)}
	}
	if len(ids) == 0 {
		return requiredFieldDomainError("notification ids", map[string]any{"component": "notifications"})
	}
	userID := s.resolveUserID(ctx, "")
	parsed := []string{}
	for _, raw := range ids {
		id, err := uuid.Parse(raw)
		if err != nil {
			return err
		}
		parsed = append(parsed, id.String())
	}
	if err := s.inbox.MarkRead(ctx, userID, parsed, read); err != nil && !errors.Is(err, notifstore.ErrNotFound) {
		return err
	}
	if userID != "system" {
		_ = s.inbox.MarkRead(ctx, "system", parsed, read) //nolint:errcheck // legacy best-effort call intentionally does not affect the primary result.
	}
	return nil
}

func (s *goNotificationsService) WithActivitySink(sink ActivitySink) {
	if s == nil || s.activityHook == nil {
		return
	}
	s.activityHook.SetSink(sink)
}

func (s *goNotificationsService) resolveUserID(ctx context.Context, explicit string) string {
	if strings.TrimSpace(explicit) != "" {
		return strings.TrimSpace(explicit)
	}
	if ctx != nil {
		if id := userIDFromContext(ctx); id != "" {
			return id
		}
		if actor := actorFromContext(ctx); actor != "" {
			return actor
		}
	}
	return "system"
}

func (s *goNotificationsService) registerDefaults(tplSvc *notiftemplates.Service) error {
	if s == nil || s.definitions == nil || tplSvc == nil {
		return nil
	}
	ctx := context.Background()
	if err := s.ensureDefaultDefinition(ctx); err != nil {
		return err
	}
	return s.ensureDefaultTemplate(ctx, tplSvc)
}

func (s *goNotificationsService) ensureDefaultDefinition(ctx context.Context) error {
	if _, err := s.definitions.GetByCode(ctx, s.defaultDefinition); err == nil {
		return nil
	} else if !errors.Is(err, notifstore.ErrNotFound) {
		return err
	}
	definition := domain.NotificationDefinition{
		Code: s.defaultDefinition, Name: "Admin Notifications", Description: "Admin inbox notifications",
		Severity: "info", Channels: domain.StringList{s.defaultChannel},
		TemplateKeys: domain.StringList{s.defaultDefinition}, Metadata: domain.JSONMap{"source": "go-admin"},
	}
	if err := s.definitions.Create(ctx, &definition); err != nil {
		if _, rereadErr := s.definitions.GetByCode(ctx, s.defaultDefinition); rereadErr == nil {
			return nil
		}
		return err
	}
	return nil
}

func (s *goNotificationsService) ensureDefaultTemplate(ctx context.Context, tplSvc *notiftemplates.Service) error {
	if _, err := tplSvc.Get(ctx, s.defaultDefinition, s.defaultChannel, s.defaultLocale); err == nil {
		return nil
	} else if !errors.Is(err, notifstore.ErrNotFound) {
		return err
	}
	input := notiftemplates.TemplateInput{
		Code: s.defaultDefinition, Channel: s.defaultChannel, Locale: s.defaultLocale,
		Subject: "{{ title }}", Body: "{{ body }}", Format: "text",
		Schema:   domain.TemplateSchema{Required: []string{"title", "body"}},
		Metadata: domain.JSONMap{"source": "go-admin"},
	}
	if _, err := tplSvc.Create(ctx, input); err != nil {
		if _, rereadErr := tplSvc.Get(ctx, s.defaultDefinition, s.defaultChannel, s.defaultLocale); rereadErr == nil {
			return nil
		}
		return err
	}
	return nil
}

type notificationsActivityHook struct {
	mu   sync.RWMutex
	sink ActivitySink
}

func (h *notificationsActivityHook) Notify(ctx context.Context, evt notifactivity.Event) {
	h.mu.RLock()
	sink := h.sink
	h.mu.RUnlock()
	if sink == nil {
		return
	}
	object := evt.ObjectType
	if evt.ObjectID != "" {
		object = object + ":" + evt.ObjectID
	}
	_ = sink.Record(ctx, ActivityEntry{ //nolint:errcheck // best-effort telemetry must not fail the primary operation.
		Actor:    evt.ActorID,
		Action:   evt.Verb,
		Object:   object,
		Channel:  "notifications",
		Metadata: evt.Metadata,
	})
}

func (h *notificationsActivityHook) SetSink(sink ActivitySink) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.sink = sink
}

func notificationsTranslator(defaultLocale string, t Translator) i18n.Translator {
	if t == nil {
		if translator, err := i18n.NewSimpleTranslator(i18n.NewStaticStore(nil), i18n.WithTranslatorDefaultLocale(defaultLocale)); err == nil {
			return translator
		}
	}
	return translatorAdapter{translator: t, defaultLocale: defaultLocale}
}

type translatorAdapter struct {
	translator    Translator
	defaultLocale string
}

func (t translatorAdapter) Translate(locale, key string, args ...any) (string, error) {
	if t.translator == nil {
		return key, nil
	}
	if locale == "" {
		locale = t.defaultLocale
	}
	return t.translator.Translate(locale, key, args...)
}

func mapInboxItem(item domain.InboxItem) Notification {
	return Notification{
		ID:        item.ID.String(),
		Title:     item.Title,
		Message:   item.Body,
		Locale:    item.Locale,
		ActionURL: item.ActionURL,
		Metadata:  cloneNotificationMap(item.Metadata),
		Read:      !item.Unread,
		CreatedAt: item.CreatedAt,
		UserID:    item.UserID,
	}
}

func cloneNotificationMap(src map[string]any) map[string]any {
	if len(src) == 0 {
		return nil
	}
	out := make(map[string]any, len(src))
	maps.Copy(out, src)
	return out
}

func toSnakeCase(input string) string {
	if input == "" {
		return ""
	}
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(input)), " ", "_")
}
