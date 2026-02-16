package services

import (
	"sync"
	"time"
)

type idempotencyEntry struct {
	key       string
	hash      string
	status    int
	body      []byte
	createdAt time.Time
}

type idempotencyStore struct {
	ttl     time.Duration
	now     func() time.Time
	mu      sync.Mutex
	entries map[string]idempotencyEntry
}

func newIdempotencyStore(ttl time.Duration) *idempotencyStore {
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}
	return &idempotencyStore{
		ttl: ttl,
		now: func() time.Time {
			return time.Now().UTC()
		},
		entries: map[string]idempotencyEntry{},
	}
}

func (s *idempotencyStore) ReplayIfMatch(key string, hash string) (int, []byte, bool, bool) {
	if s == nil || key == "" {
		return 0, nil, false, false
	}
	now := s.now()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneLocked(now)
	entry, ok := s.entries[key]
	if !ok {
		return 0, nil, false, false
	}
	if entry.hash != hash {
		return 0, nil, false, true
	}
	body := append([]byte(nil), entry.body...)
	return entry.status, body, true, false
}

func (s *idempotencyStore) Store(key string, hash string, status int, body []byte) {
	if s == nil || key == "" || hash == "" {
		return
	}
	now := s.now()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneLocked(now)
	s.entries[key] = idempotencyEntry{
		key:       key,
		hash:      hash,
		status:    status,
		body:      append([]byte(nil), body...),
		createdAt: now,
	}
}

func (s *idempotencyStore) pruneLocked(now time.Time) {
	if s == nil || s.ttl <= 0 {
		return
	}
	for key, entry := range s.entries {
		if now.Sub(entry.createdAt) >= s.ttl {
			delete(s.entries, key)
		}
	}
}
