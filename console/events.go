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
	if !event.Identity.Valid() || event.ConsoleID != s.consoleID || event.Sequence != 0 || event.PanelID == "" || event.Key == "" {
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
	if err := json.Unmarshal(encoded, &event); err != nil {
		return Event{}, ErrInvalidEvent
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return Event{}, ErrClosed
	}
	key := eventRecordKey{event.Identity, event.PanelID, event.TargetID, event.Key}
	prior, exists := s.revisions[key]
	if event.Revision > MaxWireCounter || event.Generation > MaxWireCounter || prior.Revision == MaxWireCounter || s.watermarks[event.Identity] == MaxWireCounter {
		return Event{}, ErrInvalidEvent
	}
	if event.Generation < prior.Generation {
		return Event{}, ErrInvalidEvent
	}
	if !exists && len(s.revisions) >= s.capacity {
		return Event{}, ErrCapacity
	}
	if _, exists := s.watermarks[event.Identity]; !exists && len(s.watermarks) >= s.capacity {
		return Event{}, ErrCapacity
	}
	if event.Revision == 0 {
		event.Revision = prior.Revision + 1
	}
	if event.Revision <= prior.Revision {
		return Event{}, ErrInvalidEvent
	}
	event.Sequence = s.watermarks[event.Identity] + 1
	s.revisions[key] = eventRevision{event.Generation, event.Revision}
	s.watermarks[event.Identity] = event.Sequence
	if event.Kind != EventUpsert {
		event.Data = nil
	}
	for sub := range s.subscribers {
		if sub.identity != event.Identity {
			continue
		}
		// Each consumer gets a detached payload. On overflow, drop pending events
		// and deliver recovery rather than silently leaving a stale cache.
		copyEvent := cloneEvent(event)
		select {
		case sub.events <- copyEvent:
		default:
		drain:
			for {
				select {
				case <-sub.events:
				default:
					break drain
				}
			}
			sub.events <- Event{Identity: event.Identity, Sequence: event.Sequence, Kind: EventInvalidate}
		}
	}
	return cloneEvent(event), nil
}

func cloneEvent(event Event) Event {
	data, _ := json.Marshal(event)
	var copyEvent Event
	_ = json.Unmarshal(data, &copyEvent)
	return copyEvent
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
