package admin

import (
	"context"
	"strings"
	"sync"
	"time"
)

// DebugUserSession tracks an active user session for session-scoped debug views.
type DebugUserSession struct {
	SessionID    string         `json:"session_id"`
	UserID       string         `json:"user_id"`
	Username     string         `json:"username"`
	IP           string         `json:"ip"`
	UserAgent    string         `json:"user_agent"`
	CurrentPage  string         `json:"current_page"`
	StartedAt    time.Time      `json:"started_at"`
	LastActivity time.Time      `json:"last_activity"`
	RequestCount int            `json:"request_count"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

// DebugUserSessionStore persists active debug user sessions.
type DebugUserSessionStore interface {
	Upsert(ctx context.Context, session DebugUserSession) error
	Get(ctx context.Context, sessionID string) (DebugUserSession, bool, error)
	ListActive(ctx context.Context) ([]DebugUserSession, error)
	Expire(ctx context.Context, olderThan time.Duration) (int, error)
}

// InMemoryDebugUserSessionStore keeps sessions in memory.
type InMemoryDebugUserSessionStore struct {
	mu       sync.RWMutex
	sessions map[string]DebugUserSession
}

// NewInMemoryDebugUserSessionStore constructs a memory-backed store.
func NewInMemoryDebugUserSessionStore() *InMemoryDebugUserSessionStore {
	return &InMemoryDebugUserSessionStore{sessions: map[string]DebugUserSession{}}
}

// Upsert inserts or updates a session entry, deduping by user_id + session_id.
func (s *InMemoryDebugUserSessionStore) Upsert(_ context.Context, session DebugUserSession) error {
	if s == nil {
		return nil
	}
	session.SessionID = strings.TrimSpace(session.SessionID)
	session.UserID = strings.TrimSpace(session.UserID)
	if session.SessionID == "" {
		return nil
	}
	if session.LastActivity.IsZero() {
		session.LastActivity = time.Now().UTC()
	}
	if session.StartedAt.IsZero() {
		session.StartedAt = session.LastActivity
	}
	key := debugUserSessionKey(session.UserID, session.SessionID)

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.sessions == nil {
		s.sessions = map[string]DebugUserSession{}
	}
	if existing, ok := s.sessions[key]; ok {
		if !existing.StartedAt.IsZero() && (session.StartedAt.IsZero() || session.StartedAt.After(existing.StartedAt)) {
			session.StartedAt = existing.StartedAt
		}
		if !existing.LastActivity.IsZero() && session.LastActivity.Before(existing.LastActivity) {
			session.LastActivity = existing.LastActivity
		}
		if session.RequestCount <= 0 {
			session.RequestCount = existing.RequestCount
		} else {
			session.RequestCount += existing.RequestCount
		}
		if session.Username == "" {
			session.Username = existing.Username
		}
		if session.IP == "" {
			session.IP = existing.IP
		}
		if session.UserAgent == "" {
			session.UserAgent = existing.UserAgent
		}
		if session.CurrentPage == "" {
			session.CurrentPage = existing.CurrentPage
		}
		session.Metadata = mergeDebugUserSessionMetadata(existing.Metadata, session.Metadata)
	}
	s.sessions[key] = cloneDebugUserSession(session)
	return nil
}

// Get returns a session by session ID.
func (s *InMemoryDebugUserSessionStore) Get(_ context.Context, sessionID string) (DebugUserSession, bool, error) {
	if s == nil {
		return DebugUserSession{}, false, nil
	}
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return DebugUserSession{}, false, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, session := range s.sessions {
		if session.SessionID == sessionID {
			return cloneDebugUserSession(session), true, nil
		}
	}
	return DebugUserSession{}, false, nil
}

// ListActive returns active session snapshots.
func (s *InMemoryDebugUserSessionStore) ListActive(_ context.Context) ([]DebugUserSession, error) {
	if s == nil {
		return nil, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.sessions) == 0 {
		return nil, nil
	}
	out := make([]DebugUserSession, 0, len(s.sessions))
	for _, session := range s.sessions {
		out = append(out, cloneDebugUserSession(session))
	}
	return out, nil
}

// Expire removes sessions whose last activity is older than the threshold.
func (s *InMemoryDebugUserSessionStore) Expire(_ context.Context, olderThan time.Duration) (int, error) {
	if s == nil || olderThan <= 0 {
		return 0, nil
	}
	cutoff := time.Now().UTC().Add(-olderThan)
	removed := 0
	s.mu.Lock()
	for key, session := range s.sessions {
		last := session.LastActivity
		if last.IsZero() {
			last = session.StartedAt
		}
		if last.IsZero() {
			continue
		}
		if last.Before(cutoff) {
			delete(s.sessions, key)
			removed++
		}
	}
	s.mu.Unlock()
	return removed, nil
}

func debugUserSessionKey(userID, sessionID string) string {
	userID = strings.TrimSpace(userID)
	sessionID = strings.TrimSpace(sessionID)
	return userID + "::" + sessionID
}

func cloneDebugUserSession(session DebugUserSession) DebugUserSession {
	clone := session
	if session.Metadata != nil {
		clone.Metadata = cloneAnyMap(session.Metadata)
	}
	return clone
}

func mergeDebugUserSessionMetadata(base, next map[string]any) map[string]any {
	if len(base) == 0 && len(next) == 0 {
		return nil
	}
	out := cloneAnyMap(base)
	if out == nil {
		out = map[string]any{}
	}
	for key, value := range next {
		out[key] = value
	}
	return out
}
