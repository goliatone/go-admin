package services

import (
	"context"
	"sync"
	"time"
)

type idempotencyEntry struct {
	key       string
	hash      string
	status    int
	body      []byte
	createdAt time.Time
	completed bool
	token     uint64
	done      chan struct{}
}

type idempotencyReservation struct {
	key   string
	token uint64
}

type idempotencyStore struct {
	ttl     time.Duration
	now     func() time.Time
	mu      sync.Mutex
	entries map[string]idempotencyEntry
	next    uint64
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

func (s *idempotencyStore) Reserve(ctx context.Context, key string, hash string) (idempotencyReservation, int, []byte, bool, bool, error) {
	if s == nil || key == "" {
		return idempotencyReservation{}, 0, nil, false, false, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	for {
		now := s.now()
		s.mu.Lock()
		s.pruneLocked(now)
		entry, ok := s.entries[key]
		if !ok {
			s.next++
			reservation := idempotencyReservation{key: key, token: s.next}
			s.entries[key] = idempotencyEntry{
				key:       key,
				hash:      hash,
				createdAt: now,
				token:     reservation.token,
				done:      make(chan struct{}),
			}
			s.mu.Unlock()
			return reservation, 0, nil, false, false, nil
		}
		if entry.hash != hash {
			s.mu.Unlock()
			return idempotencyReservation{}, 0, nil, false, true, nil
		}
		if entry.completed {
			body := append([]byte(nil), entry.body...)
			s.mu.Unlock()
			return idempotencyReservation{}, entry.status, body, true, false, nil
		}
		done := entry.done
		s.mu.Unlock()
		select {
		case <-ctx.Done():
			return idempotencyReservation{}, 0, nil, false, false, ctx.Err()
		case <-done:
		}
	}
}

func (s *idempotencyStore) Commit(reservation idempotencyReservation, status int, body []byte) bool {
	if s == nil || reservation.key == "" || reservation.token == 0 {
		return false
	}
	now := s.now()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pruneLocked(now)
	entry, ok := s.entries[reservation.key]
	if !ok || entry.token != reservation.token || entry.completed {
		return false
	}
	entry.status = status
	entry.body = append([]byte(nil), body...)
	entry.createdAt = now
	entry.completed = true
	s.entries[reservation.key] = entry
	close(entry.done)
	return true
}

func (s *idempotencyStore) Release(reservation idempotencyReservation) bool {
	if s == nil || reservation.key == "" || reservation.token == 0 {
		return false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.entries[reservation.key]
	if !ok || entry.token != reservation.token || entry.completed {
		return false
	}
	delete(s.entries, reservation.key)
	close(entry.done)
	return true
}

func (s *idempotencyStore) pruneLocked(now time.Time) {
	if s == nil || s.ttl <= 0 {
		return
	}
	for key, entry := range s.entries {
		if entry.completed && now.Sub(entry.createdAt) >= s.ttl {
			delete(s.entries, key)
		}
	}
}
