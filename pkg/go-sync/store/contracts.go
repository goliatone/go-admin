package store

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/pkg/go-sync/core"
)

// ResourceStore loads and mutates authoritative resource snapshots.
type ResourceStore interface {
	Get(ctx context.Context, ref core.ResourceRef) (core.Snapshot, error)
	Mutate(ctx context.Context, input core.MutationInput) (core.Snapshot, error)
}

// IdempotencyStore stores prior mutation results for retry-safe replay.
type IdempotencyStore interface {
	Get(ctx context.Context, key string) (core.MutationResult, bool, error)
	Put(ctx context.Context, key string, result core.MutationResult, ttl time.Duration) error
}

// IdempotencyReservation is an opaque claim over a replay key while a mutation is in flight.
type IdempotencyReservation struct {
	Key   string
	Token string
}

// IdempotencyReserveResult describes whether a replay key can be used, replayed, or is still in flight.
type IdempotencyReserveResult struct {
	Reservation *IdempotencyReservation
	Result      *core.MutationResult
	Pending     bool
}

// ReservingIdempotencyStore coordinates replay keys safely across in-flight and completed mutations.
type ReservingIdempotencyStore interface {
	Reserve(ctx context.Context, key string, ttl time.Duration) (IdempotencyReserveResult, error)
	Commit(ctx context.Context, reservation IdempotencyReservation, result core.MutationResult, ttl time.Duration) error
	Release(ctx context.Context, reservation IdempotencyReservation) error
}

// CommitRecoveryStore can finalize replay state after a mutation has already applied but Commit failed.
type CommitRecoveryStore interface {
	RecoverCommit(ctx context.Context, reservation IdempotencyReservation, result core.MutationResult, ttl time.Duration) error
}

// MemoryResourceStore is a deterministic in-memory ResourceStore useful for tests.
type MemoryResourceStore struct {
	mu              sync.RWMutex
	snapshots       map[string]core.Snapshot
	Now             func() time.Time
	GetError        error
	MutateError     error
	GetCalls        int
	MutateCalls     int
	LastGetRef      core.ResourceRef
	LastMutateInput core.MutationInput
}

// NewMemoryResourceStore builds an in-memory store seeded with snapshots.
func NewMemoryResourceStore(snapshots ...core.Snapshot) *MemoryResourceStore {
	store := &MemoryResourceStore{
		snapshots: make(map[string]core.Snapshot, len(snapshots)),
		Now:       time.Now,
	}
	for _, snapshot := range snapshots {
		store.Seed(snapshot)
	}
	return store
}

// Seed inserts or replaces a snapshot in the store.
func (s *MemoryResourceStore) Seed(snapshot core.Snapshot) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.snapshots[resourceKey(snapshot.ResourceRef)] = cloneSnapshot(snapshot)
}

// Get returns the authoritative snapshot for the requested resource.
func (s *MemoryResourceStore) Get(_ context.Context, ref core.ResourceRef) (core.Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.LastGetRef = cloneResourceRef(ref)
	s.GetCalls++
	if s.GetError != nil {
		return core.Snapshot{}, s.GetError
	}

	snapshot, ok := s.snapshots[resourceKey(ref)]
	if !ok {
		return core.Snapshot{}, core.NewError(core.CodeNotFound, "resource not found", nil)
	}
	return cloneSnapshot(snapshot), nil
}

// Mutate performs compare-and-swap revision checks and updates the stored snapshot.
func (s *MemoryResourceStore) Mutate(_ context.Context, input core.MutationInput) (core.Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.LastMutateInput = cloneMutationInput(input)
	s.MutateCalls++
	if s.MutateError != nil {
		return core.Snapshot{}, s.MutateError
	}

	key := resourceKey(input.ResourceRef)
	current, ok := s.snapshots[key]
	if !ok {
		return core.Snapshot{}, core.NewError(core.CodeNotFound, "resource not found", nil)
	}
	if input.ExpectedRevision != current.Revision {
		latest := cloneSnapshot(current)
		return core.Snapshot{}, core.NewStaleRevisionError(current.Revision, &latest)
	}

	next := cloneSnapshot(current)
	if input.Payload != nil {
		next.Data = cloneBytes(input.Payload)
	}
	next.Revision = current.Revision + 1
	if s.Now != nil {
		next.UpdatedAt = s.Now().UTC()
	}
	if next.Metadata == nil {
		next.Metadata = make(map[string]any)
	}
	next.Metadata["operation"] = strings.TrimSpace(input.Operation)
	s.snapshots[key] = cloneSnapshot(next)

	return cloneSnapshot(next), nil
}

// MemoryIdempotencyStore is a deterministic in-memory IdempotencyStore useful for tests.
type MemoryIdempotencyStore struct {
	mu             sync.RWMutex
	entries        map[string]memoryIdempotencyEntry
	Now            func() time.Time
	GetError       error
	PutError       error
	ReserveError   error
	CommitError    error
	RecoverError   error
	ReleaseError   error
	LastGetKey     string
	LastPutKey     string
	LastReserveKey string
	LastCommitKey  string
	LastRecoverKey string
	LastReleaseKey string
	LastTTL        time.Duration
	counter        int64
}

type memoryIdempotencyEntry struct {
	result     core.MutationResult
	expiresAt  time.Time
	reservedAt time.Time
	pending    bool
	token      string
}

// NewMemoryIdempotencyStore builds an in-memory idempotency store.
func NewMemoryIdempotencyStore() *MemoryIdempotencyStore {
	return &MemoryIdempotencyStore{
		entries: make(map[string]memoryIdempotencyEntry),
		Now:     time.Now,
	}
}

// Get returns a previously stored mutation result when present and unexpired.
func (s *MemoryIdempotencyStore) Get(_ context.Context, key string) (core.MutationResult, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.LastGetKey = strings.TrimSpace(key)
	if s.GetError != nil {
		return core.MutationResult{}, false, s.GetError
	}

	entry, ok := s.entries[s.LastGetKey]
	if !ok {
		return core.MutationResult{}, false, nil
	}
	now := s.now()
	if !entry.expiresAt.IsZero() && now.After(entry.expiresAt) {
		delete(s.entries, s.LastGetKey)
		return core.MutationResult{}, false, nil
	}
	if entry.pending {
		return core.MutationResult{}, false, nil
	}
	return cloneMutationResult(entry.result), true, nil
}

// Put persists a mutation result until its TTL expires.
func (s *MemoryIdempotencyStore) Put(_ context.Context, key string, result core.MutationResult, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.LastPutKey = strings.TrimSpace(key)
	s.LastTTL = ttl
	if s.PutError != nil {
		return s.PutError
	}

	entry := memoryIdempotencyEntry{result: cloneMutationResult(result)}
	if ttl > 0 {
		entry.expiresAt = s.now().Add(ttl)
	}
	s.entries[s.LastPutKey] = entry
	return nil
}

// Reserve claims an idempotency key before a mutation executes.
func (s *MemoryIdempotencyStore) Reserve(_ context.Context, key string, ttl time.Duration) (IdempotencyReserveResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.LastReserveKey = strings.TrimSpace(key)
	s.LastTTL = ttl
	if s.ReserveError != nil {
		return IdempotencyReserveResult{}, s.ReserveError
	}

	if entry, ok := s.entries[s.LastReserveKey]; ok {
		if !entry.pending && !entry.expiresAt.IsZero() && s.now().After(entry.expiresAt) {
			delete(s.entries, s.LastReserveKey)
		} else if entry.pending {
			return IdempotencyReserveResult{Pending: true}, nil
		} else {
			result := cloneMutationResult(entry.result)
			return IdempotencyReserveResult{Result: &result}, nil
		}
	}

	s.counter++
	reservation := IdempotencyReservation{
		Key:   s.LastReserveKey,
		Token: "reservation_" + strconv.FormatInt(s.counter, 10),
	}
	entry := memoryIdempotencyEntry{
		pending:    true,
		token:      reservation.Token,
		reservedAt: s.now(),
	}
	if ttl > 0 {
		entry.expiresAt = s.now().Add(ttl)
	}
	s.entries[s.LastReserveKey] = entry

	return IdempotencyReserveResult{Reservation: &reservation}, nil
}

// Commit stores the final result for a reservation and converts it into a replayable record.
func (s *MemoryIdempotencyStore) Commit(_ context.Context, reservation IdempotencyReservation, result core.MutationResult, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.LastCommitKey = strings.TrimSpace(reservation.Key)
	s.LastTTL = ttl
	if s.CommitError != nil {
		return s.CommitError
	}

	entry, ok := s.entries[s.LastCommitKey]
	if !ok || !entry.pending || entry.token != reservation.Token {
		return core.NewError(core.CodeTemporaryFailure, "idempotency reservation not found", nil)
	}

	entry.pending = false
	entry.token = ""
	entry.result = cloneMutationResult(result)
	if ttl > 0 {
		entry.expiresAt = s.now().Add(ttl)
	} else {
		entry.expiresAt = time.Time{}
	}
	s.entries[s.LastCommitKey] = entry
	return nil
}

// RecoverCommit stores a replay result after the mutation has already applied but Commit failed.
func (s *MemoryIdempotencyStore) RecoverCommit(_ context.Context, reservation IdempotencyReservation, result core.MutationResult, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.LastRecoverKey = strings.TrimSpace(reservation.Key)
	s.LastTTL = ttl
	if s.RecoverError != nil {
		return s.RecoverError
	}

	entry := memoryIdempotencyEntry{
		result: cloneMutationResult(result),
	}
	if existing, ok := s.entries[s.LastRecoverKey]; ok {
		if existing.pending && existing.token != reservation.Token {
			return core.NewError(core.CodeTemporaryFailure, "idempotency reservation not found", nil)
		}
	}
	if ttl > 0 {
		entry.expiresAt = s.now().Add(ttl)
	}
	s.entries[s.LastRecoverKey] = entry
	return nil
}

// Release abandons an in-flight reservation when the mutation did not apply.
func (s *MemoryIdempotencyStore) Release(_ context.Context, reservation IdempotencyReservation) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.LastReleaseKey = strings.TrimSpace(reservation.Key)
	if s.ReleaseError != nil {
		return s.ReleaseError
	}

	entry, ok := s.entries[s.LastReleaseKey]
	if !ok {
		return nil
	}
	if entry.pending && entry.token == reservation.Token {
		delete(s.entries, s.LastReleaseKey)
	}
	return nil
}

func (s *MemoryIdempotencyStore) now() time.Time {
	if s.Now == nil {
		return time.Now()
	}
	return s.Now().UTC()
}

func resourceKey(ref core.ResourceRef) string {
	scopeParts := make([]string, 0, len(ref.Scope))
	for key, value := range ref.Scope {
		scopeParts = append(scopeParts, strings.TrimSpace(key)+"="+strings.TrimSpace(value))
	}
	sort.Strings(scopeParts)
	return strings.TrimSpace(ref.Kind) + "|" + strings.TrimSpace(ref.ID) + "|" + strings.Join(scopeParts, ",")
}

func cloneMutationResult(result core.MutationResult) core.MutationResult {
	return core.MutationResult{
		Snapshot: cloneSnapshot(result.Snapshot),
		Applied:  result.Applied,
		Replay:   result.Replay,
	}
}

func cloneMutationInput(input core.MutationInput) core.MutationInput {
	return core.MutationInput{
		ResourceRef:      cloneResourceRef(input.ResourceRef),
		Operation:        input.Operation,
		Payload:          cloneBytes(input.Payload),
		ExpectedRevision: input.ExpectedRevision,
		IdempotencyKey:   input.IdempotencyKey,
		ActorID:          input.ActorID,
		ClientID:         input.ClientID,
		CorrelationID:    input.CorrelationID,
		Metadata:         cloneAnyMap(input.Metadata),
	}
}

func cloneSnapshot(snapshot core.Snapshot) core.Snapshot {
	return core.Snapshot{
		ResourceRef: cloneResourceRef(snapshot.ResourceRef),
		Data:        cloneBytes(snapshot.Data),
		Revision:    snapshot.Revision,
		UpdatedAt:   snapshot.UpdatedAt,
		Metadata:    cloneAnyMap(snapshot.Metadata),
	}
}

func cloneResourceRef(ref core.ResourceRef) core.ResourceRef {
	return core.ResourceRef{
		Kind:  ref.Kind,
		ID:    ref.ID,
		Scope: cloneStringMap(ref.Scope),
	}
}

func cloneStringMap(input map[string]string) map[string]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]string, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func cloneAnyMap(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func cloneBytes(input []byte) []byte {
	if len(input) == 0 {
		return nil
	}
	out := make([]byte, len(input))
	copy(out, input)
	return out
}
