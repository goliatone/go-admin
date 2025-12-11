package admin

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Notification represents an inbox item.
type Notification struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"created_at"`
}

// NotificationService manages inbox items.
type NotificationService interface {
	List(ctx context.Context) ([]Notification, error)
	Add(ctx context.Context, n Notification) (Notification, error)
	Mark(ctx context.Context, ids []string, read bool) error
}

// NotificationMarkCommandName is the registered command for marking notifications read/unread.
const NotificationMarkCommandName = "notifications.mark"

type notificationContextKey string

const (
	notificationIDsKey  notificationContextKey = "notification_ids"
	notificationReadKey notificationContextKey = "notification_read"
)

// NotificationMarkCommand toggles read state for notifications via the command bus.
type NotificationMarkCommand struct {
	Service NotificationService
}

func (c *NotificationMarkCommand) Name() string { return NotificationMarkCommandName }

func (c *NotificationMarkCommand) Execute(ctx context.Context) error {
	if c == nil || c.Service == nil {
		return FeatureDisabledError{Feature: string(FeatureNotifications)}
	}
	ids := notificationIDsFromContext(ctx)
	if len(ids) == 0 {
		return errors.New("notification ids required")
	}
	read := notificationReadFromContext(ctx)
	return c.Service.Mark(ctx, ids, read)
}

// InMemoryNotificationService stores notifications in memory.
type InMemoryNotificationService struct {
	mu       sync.Mutex
	nextID   int
	entries  []Notification
	activity ActivitySink
}

// NewInMemoryNotificationService builds an inbox service.
func NewInMemoryNotificationService() *InMemoryNotificationService {
	return &InMemoryNotificationService{nextID: 1}
}

// WithActivitySink wires an activity sink for notification events.
func (s *InMemoryNotificationService) WithActivitySink(sink ActivitySink) {
	if s != nil && sink != nil {
		s.activity = sink
	}
}

// List returns all notifications newest first.
func (s *InMemoryNotificationService) List(ctx context.Context) ([]Notification, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]Notification, len(s.entries))
	copy(out, s.entries)
	return out, nil
}

// Add stores a notification.
func (s *InMemoryNotificationService) Add(ctx context.Context, n Notification) (Notification, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	if n.ID == "" {
		n.ID = strconv.Itoa(s.nextID)
		s.nextID++
	}
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now()
	}
	s.entries = append([]Notification{n}, s.entries...)
	s.recordActivity(ctx, "notification.create", n.ID, map[string]any{
		"title":   n.Title,
		"message": n.Message,
	})
	return n, nil
}

// Mark toggles read state for ids.
func (s *InMemoryNotificationService) Mark(ctx context.Context, ids []string, read bool) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, n := range s.entries {
		for _, id := range ids {
			if n.ID == id {
				s.entries[i].Read = read
				break
			}
		}
	}
	if len(ids) > 0 {
		s.recordActivity(ctx, "notification.mark", strings.Join(ids, ","), map[string]any{
			"ids":  append([]string{}, ids...),
			"read": read,
		})
	}
	return nil
}

// DisabledNotificationService returns explicit errors when notifications are disabled.
type DisabledNotificationService struct{}

func (DisabledNotificationService) List(ctx context.Context) ([]Notification, error) {
	_ = ctx
	return nil, FeatureDisabledError{Feature: string(FeatureNotifications)}
}

func (DisabledNotificationService) Add(ctx context.Context, n Notification) (Notification, error) {
	_ = ctx
	_ = n
	return Notification{}, FeatureDisabledError{Feature: string(FeatureNotifications)}
}

func (DisabledNotificationService) Mark(ctx context.Context, ids []string, read bool) error {
	_ = ctx
	_ = ids
	_ = read
	return FeatureDisabledError{Feature: string(FeatureNotifications)}
}

func (s *InMemoryNotificationService) recordActivity(ctx context.Context, action, object string, meta map[string]any) {
	if s == nil || s.activity == nil {
		return
	}
	_ = s.activity.Record(ctx, ActivityEntry{
		Actor:    actorFromContext(ctx),
		Action:   action,
		Object:   "notification:" + object,
		Metadata: meta,
	})
}

func notificationIDsFromContext(ctx context.Context) []string {
	if ctx == nil {
		return nil
	}
	if ids, ok := ctx.Value(notificationIDsKey).([]string); ok {
		return ids
	}
	return nil
}

func notificationReadFromContext(ctx context.Context) bool {
	if ctx == nil {
		return true
	}
	if read, ok := ctx.Value(notificationReadKey).(bool); ok {
		return read
	}
	return true
}

func withNotificationContext(ctx context.Context, ids []string, read bool) context.Context {
	ctx = context.WithValue(ctx, notificationIDsKey, ids)
	ctx = context.WithValue(ctx, notificationReadKey, read)
	return ctx
}
