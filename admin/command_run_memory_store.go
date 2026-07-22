package admin

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
)

var ErrInvalidCommandRunMemoryStoreConfig = errors.New("invalid command-run memory store configuration")

// CommandRunMemoryStoreConfig controls independent record and event-ID bounds.
type CommandRunMemoryStoreConfig struct {
	Retention      int
	DedupeLimit    int
	ContractLimits CommandRunContractLimits
}

// MemoryCommandRunStore is a bounded concurrency-safe current-state projection.
type MemoryCommandRunStore struct {
	mu sync.RWMutex

	retention      int
	dedupeLimit    int
	contractLimits CommandRunContractLimits
	records        map[commandRunRecordKey]CommandRunRecord
	recordOrder    []commandRunRecordKey
	seenEvents     map[string]struct{}
	eventOrder     []string
}

type commandRunRecordKey struct {
	scope CommandRunScope
	runID string
}

// NewMemoryCommandRunStore constructs a bounded default store.
func NewMemoryCommandRunStore(config CommandRunMemoryStoreConfig) (*MemoryCommandRunStore, error) {
	if config.Retention <= 0 {
		config.Retention = defaultCommandRunRetention
	}
	if config.DedupeLimit <= 0 {
		config.DedupeLimit = max(defaultCommandRunDedupeLimit, config.Retention)
	}
	if config.DedupeLimit < config.Retention {
		return nil, fmt.Errorf("%w: dedupe limit must be at least retention", ErrInvalidCommandRunMemoryStoreConfig)
	}
	return &MemoryCommandRunStore{
		retention:      config.Retention,
		dedupeLimit:    config.DedupeLimit,
		contractLimits: config.ContractLimits.normalized(),
		records:        make(map[commandRunRecordKey]CommandRunRecord, config.Retention),
		seenEvents:     make(map[string]struct{}, config.DedupeLimit),
	}, nil
}

// Apply validates and projects one update. Duplicate, stale, equal-revision,
// and terminal-regressing deliveries return changed=false.
func (s *MemoryCommandRunStore) Apply(ctx context.Context, update CommandRunUpdate) (CommandRunRecord, bool, error) {
	if s == nil {
		return CommandRunRecord{}, false, errors.New("command-run memory store is nil")
	}
	if err := commandRunContextError(ctx); err != nil {
		return CommandRunRecord{}, false, err
	}
	normalized, err := NormalizeCommandRunUpdate(update, s.contractLimits)
	if err != nil {
		return CommandRunRecord{}, false, err
	}
	key := commandRunRecordKey{scope: normalized.Scope, runID: normalized.RunID}

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, duplicate := s.seenEvents[normalized.EventID]; duplicate {
		return cloneCommandRunRecord(s.records[key]), false, nil
	}
	current, exists := s.records[key]
	if exists && normalized.CommandID != current.CommandID {
		return current.Clone(), false, commandRunUpdateError("command_id", "does not match existing run")
	}
	s.rememberEventLocked(normalized.EventID)
	if exists {
		if normalized.Revision <= current.Revision {
			return current.Clone(), false, nil
		}
		if current.Phase.Terminal() && !normalized.Phase.Terminal() {
			return current.Clone(), false, nil
		}
		current = mergeCommandRunRecord(current, normalized)
	} else {
		current = CommandRunRecord{
			CommandRunUpdate: normalized.Clone(),
			FirstOccurredAt:  normalized.OccurredAt,
			UpdatedAt:        normalized.OccurredAt,
		}
	}
	s.records[key] = current.Clone()
	s.touchRecordLocked(key)
	s.enforceRetentionLocked()
	return current.Clone(), true, nil
}

// List returns newest-first isolated rows authorized by the selector.
func (s *MemoryCommandRunStore) List(ctx context.Context, selector CommandRunSelector) ([]CommandRunRecord, error) {
	if s == nil {
		return nil, errors.New("command-run memory store is nil")
	}
	if err := commandRunContextError(ctx); err != nil {
		return nil, err
	}
	selector = selector.Normalize()
	if err := selector.Validate(); err != nil {
		return nil, err
	}
	s.mu.RLock()
	rows := make([]CommandRunRecord, 0, len(s.records))
	for _, record := range s.records {
		if selector.Matches(record.Scope) {
			rows = append(rows, record.Clone())
		}
	}
	s.mu.RUnlock()
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].UpdatedAt.Equal(rows[j].UpdatedAt) {
			return rows[i].RunID < rows[j].RunID
		}
		return rows[i].UpdatedAt.After(rows[j].UpdatedAt)
	})
	return rows, nil
}

// Clear removes only rows visible through the selector. Recent event IDs stay
// deduplicated so delayed redelivery does not resurrect a cleared row.
func (s *MemoryCommandRunStore) Clear(ctx context.Context, selector CommandRunSelector) error {
	if s == nil {
		return errors.New("command-run memory store is nil")
	}
	if err := commandRunContextError(ctx); err != nil {
		return err
	}
	selector = selector.Normalize()
	if err := selector.Validate(); err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if selector.Global {
		clear(s.records)
		s.recordOrder = nil
		return nil
	}
	for key, record := range s.records {
		if selector.Matches(record.Scope) {
			delete(s.records, key)
		}
	}
	s.compactRecordOrderLocked()
	return nil
}

// Count returns the current bounded projection size for diagnostics.
func (s *MemoryCommandRunStore) Count() int {
	if s == nil {
		return 0
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.records)
}

func (s *MemoryCommandRunStore) rememberEventLocked(eventID string) {
	s.seenEvents[eventID] = struct{}{}
	s.eventOrder = append(s.eventOrder, eventID)
	for len(s.eventOrder) > s.dedupeLimit {
		oldest := s.eventOrder[0]
		s.eventOrder[0] = ""
		s.eventOrder = s.eventOrder[1:]
		delete(s.seenEvents, oldest)
	}
}

func (s *MemoryCommandRunStore) touchRecordLocked(key commandRunRecordKey) {
	for i, existing := range s.recordOrder {
		if existing == key {
			copy(s.recordOrder[i:], s.recordOrder[i+1:])
			s.recordOrder = s.recordOrder[:len(s.recordOrder)-1]
			break
		}
	}
	s.recordOrder = append(s.recordOrder, key)
}

func (s *MemoryCommandRunStore) enforceRetentionLocked() {
	for len(s.records) > s.retention && len(s.recordOrder) > 0 {
		oldest := s.recordOrder[0]
		s.recordOrder[0] = commandRunRecordKey{}
		s.recordOrder = s.recordOrder[1:]
		delete(s.records, oldest)
	}
}

func (s *MemoryCommandRunStore) compactRecordOrderLocked() {
	order := s.recordOrder[:0]
	for _, key := range s.recordOrder {
		if _, exists := s.records[key]; exists {
			order = append(order, key)
		}
	}
	s.recordOrder = order
}

func mergeCommandRunRecord(record CommandRunRecord, update CommandRunUpdate) CommandRunRecord {
	record.SchemaVersion = update.SchemaVersion
	record.EventID = update.EventID
	record.Revision = update.Revision
	record.Phase = update.Phase
	record.OccurredAt = update.OccurredAt
	record.UpdatedAt = update.OccurredAt
	if update.DispatchID != "" {
		record.DispatchID = update.DispatchID
	}
	if update.CorrelationID != "" {
		record.CorrelationID = update.CorrelationID
	}
	if update.StartedAt != nil {
		record.StartedAt = cloneCommandRunTime(update.StartedAt)
	}
	if update.DurationMS != nil {
		record.DurationMS = cloneCommandRunInt64(update.DurationMS)
	}
	if update.Mode != "" {
		record.Mode = update.Mode
	}
	if update.Checkpoint != "" {
		record.Checkpoint = update.Checkpoint
	}
	if update.Message != "" {
		record.Message = update.Message
	}
	if update.Current != nil {
		record.Current = cloneCommandRunInt64(update.Current)
	}
	if update.Total != nil {
		record.Total = cloneCommandRunInt64(update.Total)
	}
	if update.Attempt > 0 {
		record.Attempt = update.Attempt
	}
	if update.MaxAttempts > 0 {
		record.MaxAttempts = update.MaxAttempts
	}
	if update.Failure != nil {
		failure := *update.Failure
		record.Failure = &failure
	} else if update.Phase == CommandRunPhaseSucceeded {
		record.Failure = nil
	}
	if len(update.Metadata) > 0 {
		if record.Metadata == nil {
			record.Metadata = make(map[string]any, len(update.Metadata))
		}
		for key, value := range update.Metadata {
			record.Metadata[key] = cloneCommandRunMetadataValue(value)
		}
	}
	return record.Clone()
}

func cloneCommandRunRecord(record CommandRunRecord) CommandRunRecord {
	if record.RunID == "" {
		return CommandRunRecord{}
	}
	return record.Clone()
}

func commandRunContextError(ctx context.Context) error {
	if ctx == nil {
		return nil
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
		return nil
	}
}

// CommandRunProjector validates updates before applying them to any store.
type CommandRunProjector struct {
	store  CommandRunStore
	limits CommandRunContractLimits
}

func NewCommandRunProjector(store CommandRunStore, limits CommandRunContractLimits) (*CommandRunProjector, error) {
	if store == nil {
		return nil, errors.New("command-run projector store is required")
	}
	return &CommandRunProjector{store: store, limits: limits.normalized()}, nil
}

func (p *CommandRunProjector) ProjectCommandRun(ctx context.Context, update CommandRunUpdate) (CommandRunRecord, bool, error) {
	if p == nil || p.store == nil {
		return CommandRunRecord{}, false, errors.New("command-run projector is not configured")
	}
	normalized, err := NormalizeCommandRunUpdate(update, p.limits)
	if err != nil {
		return CommandRunRecord{}, false, err
	}
	return p.store.Apply(ctx, normalized)
}

var _ CommandRunStore = (*MemoryCommandRunStore)(nil)
var _ CommandRunProjection = (*CommandRunProjector)(nil)
