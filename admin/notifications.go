package admin

import (
	"context"
	"strconv"
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

// InMemoryNotificationService stores notifications in memory.
type InMemoryNotificationService struct {
	mu      sync.Mutex
	nextID  int
	entries []Notification
}

// NewInMemoryNotificationService builds an inbox service.
func NewInMemoryNotificationService() *InMemoryNotificationService {
	return &InMemoryNotificationService{nextID: 1}
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
	return nil
}
