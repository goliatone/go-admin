package console

import (
	"encoding/json"
	"errors"
	"sync"
)

var (
	ErrClosed       = errors.New("console closed")
	ErrInvalidEvent = errors.New("invalid console event")
	ErrCapacity     = errors.New("console stream capacity reached")
)

// MaxWireCounter keeps counters exactly representable by browser JSON numbers.
const MaxWireCounter uint64 = 1<<53 - 1

type eventRecordKey struct {
	Identity           Identity
	Panel, Target, Key string
}
type eventRevision struct{ Generation, Revision uint64 }
type eventSubscriber struct {
	identity Identity
	events   chan Event
}

// EventStream is a bounded, instance-owned fanout. Providers publish complete
// actor/scope projections, never unscoped broadcasts. It assigns revisions and
// watermarks, retaining tombstones to reject old-generation resurrection.
type EventStream struct {
	mu          sync.Mutex
	consoleID   string
	capacity    int
	closed      bool
	watermarks  map[Identity]uint64
	revisions   map[eventRecordKey]eventRevision
	subscribers map[*eventSubscriber]struct{}
}

func NewEventStream(consoleID string, capacity int) *EventStream {
	if capacity <= 0 {
		capacity = 1024
	}
	return &EventStream{consoleID: consoleID, capacity: capacity,
		watermarks: make(map[Identity]uint64), revisions: make(map[eventRecordKey]eventRevision),
		subscribers: make(map[*eventSubscriber]struct{})}
}

func (s *EventStream) Watermark(identity Identity) uint64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.watermarks[identity]
}

// Publish assigns Sequence. Revision may be supplied by a trusted service's
// canonical store, or assigned here when the stream is the revision authority.
// Data is detached as JSON so retained/delivered records cannot alias providers.
func (s *EventStream) Publish(event Event) (Event, error) {
	event, err := s.prepareEvent(event)
	if err != nil {
		return Event{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return Event{}, ErrClosed
	}
	if err := s.advanceEvent(&event); err != nil {
		return Event{}, err
	}
	if event.Kind != EventUpsert {
		event.Data = nil
	}
	for sub := range s.subscribers {
		if sub.identity == event.Identity {
			deliverConsoleEvent(sub.events, event)
		}
	}
	return cloneEvent(event), nil
}

func (s *EventStream) prepareEvent(event Event) (Event, error) {
	if !event.Valid() || event.ConsoleID != s.consoleID || event.Sequence != 0 || event.PanelID == "" || event.Key == "" {
		return Event{}, ErrInvalidEvent
	}
	switch event.Kind {
	case EventUpsert, EventDelete, EventInvalidate:
	default:
		return Event{}, ErrInvalidEvent
	}
	encoded, err := json.Marshal(event)
	if err != nil || len(encoded) > 1<<20 {
		return Event{}, ErrInvalidEvent
	}
	var detached Event
	if err := json.Unmarshal(encoded, &detached); err != nil {
		return Event{}, ErrInvalidEvent
	}
	return detached, nil
}

// advanceEvent runs under the stream lock and commits only valid revisions.
func (s *EventStream) advanceEvent(event *Event) error {
	key := eventRecordKey{event.Identity, event.PanelID, event.TargetID, event.Key}
	prior, exists := s.revisions[key]
	if event.Revision > MaxWireCounter || event.Generation > MaxWireCounter || prior.Revision == MaxWireCounter || s.watermarks[event.Identity] == MaxWireCounter {
		return ErrInvalidEvent
	}
	if event.Generation < prior.Generation {
		return ErrInvalidEvent
	}
	if !exists && len(s.revisions) >= s.capacity {
		return ErrCapacity
	}
	if _, exists := s.watermarks[event.Identity]; !exists && len(s.watermarks) >= s.capacity {
		return ErrCapacity
	}
	if event.Revision == 0 {
		event.Revision = prior.Revision + 1
	}
	if event.Revision <= prior.Revision {
		return ErrInvalidEvent
	}
	event.Sequence = s.watermarks[event.Identity] + 1
	s.revisions[key] = eventRevision{event.Generation, event.Revision}
	s.watermarks[event.Identity] = event.Sequence
	return nil
}

func deliverConsoleEvent(events chan Event, event Event) {
	// Each consumer gets a detached payload. On overflow, drop pending events
	// and deliver recovery rather than silently leaving a stale cache.
	select {
	case events <- cloneEvent(event):
		return
	default:
	}
	for {
		select {
		case <-events:
		default:
			events <- Event{Identity: event.Identity, Sequence: event.Sequence, Kind: EventInvalidate}
			return
		}
	}
}

func cloneEvent(event Event) Event {
	// prepareEvent already decoded into a fresh Event, so Data contains only
	// JSON maps, arrays and immutable scalar values; no provider callbacks remain.
	event.Data = cloneEventData(event.Data)
	return event
}

func cloneEventData(data any) any {
	switch value := data.(type) {
	case map[string]any:
		copyData := make(map[string]any, len(value))
		for key, item := range value {
			copyData[key] = cloneEventData(item)
		}
		return copyData
	case []any:
		copyData := make([]any, len(value))
		for i, item := range value {
			copyData[i] = cloneEventData(item)
		}
		return copyData
	default:
		return value
	}
}

func (s *EventStream) Subscribe(identity Identity, buffer int) (<-chan Event, func(), error) {
	if !identity.Valid() || identity.ConsoleID != s.consoleID {
		return nil, nil, ErrInvalidEvent
	}
	if buffer <= 0 {
		buffer = 64
	}
	if buffer > s.capacity {
		buffer = s.capacity
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return nil, nil, ErrClosed
	}
	if len(s.subscribers) >= s.capacity {
		return nil, nil, ErrCapacity
	}
	sub := &eventSubscriber{identity: identity, events: make(chan Event, buffer)}
	s.subscribers[sub] = struct{}{}
	cancel := func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		if _, ok := s.subscribers[sub]; ok {
			delete(s.subscribers, sub)
			close(sub.events)
		}
	}
	return sub.events, cancel, nil
}

func (s *EventStream) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return nil
	}
	s.closed = true
	for sub := range s.subscribers {
		close(sub.events)
		delete(s.subscribers, sub)
	}
	clear(s.watermarks)
	clear(s.revisions)
	return nil
}
