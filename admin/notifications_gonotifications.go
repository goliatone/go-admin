package admin

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"

	i18n "github.com/goliatone/go-i18n"
	notifactivity "github.com/goliatone/go-notifications/pkg/activity"
	"github.com/goliatone/go-notifications/pkg/adapters"
	notifconfig "github.com/goliatone/go-notifications/pkg/config"
	"github.com/goliatone/go-notifications/pkg/domain"
	notifinbox "github.com/goliatone/go-notifications/pkg/inbox"
	notiflogger "github.com/goliatone/go-notifications/pkg/interfaces/logger"
	notifstore "github.com/goliatone/go-notifications/pkg/interfaces/store"
	"github.com/goliatone/go-notifications/pkg/notifier"
	notifpreferences "github.com/goliatone/go-notifications/pkg/preferences"
	notiftemplates "github.com/goliatone/go-notifications/pkg/templates"
	"github.com/google/uuid"
)

const defaultNotificationDefinition = "admin.notification"

type goNotificationsService struct {
	manager           *notifier.Manager
	inbox             *notifinbox.Service
	preferences       *notifpreferences.Service
	definitions       notifstore.NotificationDefinitionRepository
	defaultLocale     string
	defaultDefinition string
	defaultChannel    string
	activityHook      *notificationsActivityHook
}

func newGoNotificationsService(defaultLocale string, translator Translator, sink ActivitySink) (*goNotificationsService, error) {
	if strings.TrimSpace(defaultLocale) == "" {
		defaultLocale = "en"
	}

	defRepo := newMemoryDefinitionRepository()
	tplRepo := newMemoryTemplateRepository()
	eventRepo := newMemoryEventRepository()
	messageRepo := newMemoryMessageRepository()
	attemptRepo := newMemoryAttemptRepository()
	prefRepo := newMemoryPreferenceRepository()
	inboxRepo := newMemoryInboxRepository()

	i18nTranslator := notificationsTranslator(defaultLocale, translator)
	tplSvc, err := notiftemplates.New(notiftemplates.Dependencies{
		Repository:    tplRepo,
		Translator:    i18nTranslator,
		Fallbacks:     i18n.NewStaticFallbackResolver(),
		DefaultLocale: defaultLocale,
	})
	if err != nil {
		return nil, err
	}
	tplSvc.RegisterHelpers(map[string]any{"snake_case": toSnakeCase})

	prefSvc, err := notifpreferences.New(notifpreferences.Dependencies{
		Repository: prefRepo,
		Logger:     &notiflogger.Nop{},
	})
	if err != nil {
		return nil, err
	}
	activityHook := &notificationsActivityHook{}
	activityHook.SetSink(sink)
	inboxSvc, err := notifinbox.New(notifinbox.Dependencies{
		Repository: inboxRepo,
		Logger:     &notiflogger.Nop{},
		Activity:   notifactivity.Hooks{activityHook},
	})
	if err != nil {
		return nil, err
	}

	registry := adapters.NewRegistry()

	manager, err := notifier.New(notifier.Dependencies{
		Definitions: defRepo,
		Events:      eventRepo,
		Messages:    messageRepo,
		Attempts:    attemptRepo,
		Templates:   tplSvc,
		Adapters:    registry,
		Logger:      &notiflogger.Nop{},
		Config: notifconfig.DispatcherConfig{
			MaxWorkers: 4,
			MaxRetries: 3,
		},
		Preferences: prefSvc,
		Inbox:       inboxSvc,
		Activity:    notifactivity.Hooks{activityHook},
	})
	if err != nil {
		return nil, err
	}

	svc := &goNotificationsService{
		manager:           manager,
		inbox:             inboxSvc,
		preferences:       prefSvc,
		definitions:       defRepo,
		defaultDefinition: defaultNotificationDefinition,
		defaultChannel:    "inbox",
		defaultLocale:     defaultLocale,
		activityHook:      activityHook,
	}
	if err := svc.registerDefaults(tplSvc); err != nil {
		return nil, err
	}
	return svc, nil
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
	if err := s.manager.Send(ctx, notifier.Event{
		DefinitionCode: definition,
		Recipients:     []string{userID},
		Context:        payload,
		Channels:       []string{channel},
		ActorID:        actorFromContext(ctx),
		Locale:         locale,
	}); err != nil {
		return Notification{}, err
	}
	withUser := context.WithValue(ctx, userIDContextKey, userID)
	items, err := s.List(withUser)
	if err != nil || len(items) == 0 {
		return Notification{}, err
	}
	return items[0], nil
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
		_ = s.inbox.MarkRead(ctx, "system", parsed, read)
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
	if _, err := s.definitions.GetByCode(ctx, s.defaultDefinition); errors.Is(err, notifstore.ErrNotFound) {
		def := domain.NotificationDefinition{
			Code:        s.defaultDefinition,
			Name:        "Admin Notifications",
			Description: "Admin inbox notifications",
			Severity:    "info",
			Channels:    domain.StringList{s.defaultChannel},
			TemplateKeys: domain.StringList{
				s.defaultDefinition,
			},
			Metadata: domain.JSONMap{
				"source": "go-admin",
			},
		}
		_ = s.definitions.Create(ctx, &def)
	}
	if _, err := tplSvc.Get(ctx, s.defaultDefinition, s.defaultChannel, s.defaultLocale); errors.Is(err, notifstore.ErrNotFound) {
		_, tplErr := tplSvc.Create(ctx, notiftemplates.TemplateInput{
			Code:    s.defaultDefinition,
			Channel: s.defaultChannel,
			Locale:  s.defaultLocale,
			Subject: "{{ title }}",
			Body:    "{{ body }}",
			Format:  "text",
			Schema:  domain.TemplateSchema{Required: []string{"title", "body"}},
			Metadata: domain.JSONMap{
				"source": "go-admin",
			},
		})
		if tplErr != nil {
			return tplErr
		}
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
	_ = sink.Record(ctx, ActivityEntry{
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
	for k, v := range src {
		out[k] = v
	}
	return out
}

func toSnakeCase(input string) string {
	if input == "" {
		return ""
	}
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(input)), " ", "_")
}
