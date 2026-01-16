package admin

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
)

var ErrREPLSessionLimit = errors.New("repl session limit reached")

// DebugREPLSession tracks an active REPL session.
type DebugREPLSession struct {
	ID        string
	UserID    string
	Username  string
	IP        string
	UserAgent string
	Kind      string
	ReadOnly  bool
	StartedAt time.Time
	ExpiresAt time.Time
	ClosedAt  *time.Time
	Metadata  map[string]any
}

// DebugREPLSessionStore persists REPL sessions.
type DebugREPLSessionStore interface {
	Create(ctx context.Context, session DebugREPLSession) error
	Close(ctx context.Context, id string, closedAt time.Time) error
	Get(ctx context.Context, id string) (DebugREPLSession, bool, error)
	ListActive(ctx context.Context) ([]DebugREPLSession, error)
}

// InMemoryDebugREPLSessionStore keeps sessions in memory.
type InMemoryDebugREPLSessionStore struct {
	mu       sync.Mutex
	sessions map[string]DebugREPLSession
}

// NewInMemoryDebugREPLSessionStore constructs a memory-backed store.
func NewInMemoryDebugREPLSessionStore() *InMemoryDebugREPLSessionStore {
	return &InMemoryDebugREPLSessionStore{
		sessions: map[string]DebugREPLSession{},
	}
}

func (s *InMemoryDebugREPLSessionStore) Create(_ context.Context, session DebugREPLSession) error {
	if s == nil {
		return nil
	}
	if session.ID == "" {
		session.ID = uuid.NewString()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[session.ID] = cloneDebugREPLSession(session)
	return nil
}

func (s *InMemoryDebugREPLSessionStore) Close(_ context.Context, id string, closedAt time.Time) error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	session, ok := s.sessions[id]
	if !ok {
		return ErrNotFound
	}
	if session.ClosedAt == nil {
		closedAtCopy := closedAt
		session.ClosedAt = &closedAtCopy
	}
	s.sessions[id] = session
	return nil
}

func (s *InMemoryDebugREPLSessionStore) Get(_ context.Context, id string) (DebugREPLSession, bool, error) {
	if s == nil {
		return DebugREPLSession{}, false, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	session, ok := s.sessions[id]
	if !ok {
		return DebugREPLSession{}, false, nil
	}
	return cloneDebugREPLSession(session), true, nil
}

func (s *InMemoryDebugREPLSessionStore) ListActive(_ context.Context) ([]DebugREPLSession, error) {
	if s == nil {
		return nil, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	out := []DebugREPLSession{}
	for id, session := range s.sessions {
		if session.ClosedAt != nil {
			continue
		}
		if debugREPLSessionExpired(session, now) {
			delete(s.sessions, id)
			continue
		}
		out = append(out, cloneDebugREPLSession(session))
	}
	return out, nil
}

// DebugREPLSessionManager enforces REPL session lifecycle rules.
type DebugREPLSessionManager struct {
	store              DebugREPLSessionStore
	maxSessionsPerUser int
	maxSessionSeconds  int
	now                func() time.Time
}

// NewDebugREPLSessionManager constructs a lifecycle manager.
func NewDebugREPLSessionManager(store DebugREPLSessionStore, cfg DebugREPLConfig) *DebugREPLSessionManager {
	if store == nil {
		store = NewInMemoryDebugREPLSessionStore()
	}
	return &DebugREPLSessionManager{
		store:              store,
		maxSessionsPerUser: cfg.MaxSessionsPerUser,
		maxSessionSeconds:  cfg.MaxSessionSeconds,
		now:                time.Now,
	}
}

// Start creates a new session after enforcing limits.
func (m *DebugREPLSessionManager) Start(ctx context.Context, session DebugREPLSession) (DebugREPLSession, error) {
	if m == nil || m.store == nil {
		return DebugREPLSession{}, ErrForbidden
	}
	now := m.now()
	if session.ID == "" {
		session.ID = uuid.NewString()
	}
	if session.StartedAt.IsZero() {
		session.StartedAt = now
	}
	if session.ExpiresAt.IsZero() && m.maxSessionSeconds > 0 {
		session.ExpiresAt = session.StartedAt.Add(time.Duration(m.maxSessionSeconds) * time.Second)
	}
	if err := m.enforceLimit(ctx, session.UserID, now); err != nil {
		return DebugREPLSession{}, err
	}
	if err := m.store.Create(ctx, session); err != nil {
		return DebugREPLSession{}, err
	}
	return session, nil
}

// Close marks a session as closed.
func (m *DebugREPLSessionManager) Close(ctx context.Context, id string, closedAt time.Time) error {
	if m == nil || m.store == nil {
		return ErrForbidden
	}
	if closedAt.IsZero() {
		closedAt = m.now()
	}
	return m.store.Close(ctx, id, closedAt)
}

// Active returns sessions that are still active.
func (m *DebugREPLSessionManager) Active(ctx context.Context) ([]DebugREPLSession, error) {
	if m == nil || m.store == nil {
		return nil, nil
	}
	sessions, err := m.store.ListActive(ctx)
	if err != nil {
		return nil, err
	}
	if len(sessions) == 0 {
		return nil, nil
	}
	now := m.now()
	out := make([]DebugREPLSession, 0, len(sessions))
	for _, session := range sessions {
		if debugREPLSessionExpired(session, now) {
			continue
		}
		out = append(out, session)
	}
	if len(out) == 0 {
		return nil, nil
	}
	return out, nil
}

func (m *DebugREPLSessionManager) enforceLimit(ctx context.Context, userID string, now time.Time) error {
	if m.maxSessionsPerUser <= 0 {
		return nil
	}
	sessions, err := m.store.ListActive(ctx)
	if err != nil {
		return err
	}
	count := 0
	for _, session := range sessions {
		if debugREPLSessionExpired(session, now) {
			continue
		}
		if userID == "" || session.UserID == userID {
			count++
		}
	}
	if count >= m.maxSessionsPerUser {
		return ErrREPLSessionLimit
	}
	return nil
}

func debugREPLSessionExpired(session DebugREPLSession, now time.Time) bool {
	if session.ExpiresAt.IsZero() {
		return false
	}
	if now.IsZero() {
		now = time.Now()
	}
	return now.After(session.ExpiresAt)
}

func cloneDebugREPLSession(session DebugREPLSession) DebugREPLSession {
	clone := session
	if session.Metadata != nil {
		clone.Metadata = cloneAnyMap(session.Metadata)
	}
	if session.ClosedAt != nil {
		closedAt := *session.ClosedAt
		clone.ClosedAt = &closedAt
	}
	return clone
}
