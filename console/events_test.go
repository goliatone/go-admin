package console

import (
	"errors"
	"testing"
	"time"
)

func eventIdentity(actor string) Identity {
	return Identity{ConsoleID: "data", ApplicationID: "app", EnvironmentID: "dev", ActorID: actor, ScopeKey: "org"}
}

func TestEventStreamOverflowWithConcurrentConsumerDoesNotBlock(t *testing.T) {
	s := NewEventStream("data", 1)
	events, cancel, err := s.Subscribe(eventIdentity("alice"), 1)
	if err != nil {
		t.Fatal(err)
	}
	defer cancel()
	consumerDone := make(chan struct{})
	go func() {
		defer close(consumerDone)
		for range events {
		}
	}()
	published := make(chan error, 1)
	go func() {
		for range 5000 {
			if _, err := s.Publish(Event{Identity: eventIdentity("alice"), PanelID: "operations", Record: Record{Key: "one"}, Kind: EventUpsert}); err != nil {
				published <- err
				return
			}
		}
		published <- nil
	}()
	select {
	case err := <-published:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("overflow drain blocked on concurrent consumer")
	}
	if closeErr := s.Close(); closeErr != nil {
		t.Fatal(closeErr)
	}
	<-consumerDone
}

func TestEventStreamOrderingIsolationOverflowAndClose(t *testing.T) {
	s := NewEventStream("data", 4)
	a, b := eventIdentity("alice"), eventIdentity("bob")
	aEvents, cancel, err := s.Subscribe(a, 1)
	if err != nil {
		t.Fatal(err)
	}
	defer cancel()
	bEvents, cancelB, err := s.Subscribe(b, 1)
	if err != nil {
		t.Fatal(err)
	}
	defer cancelB()
	data := map[string]any{"state": "running"}
	first, err := s.Publish(Event{Identity: a, PanelID: "operations", Record: Record{Key: "op", Generation: 2, Data: data}, Kind: EventUpsert})
	if err != nil || first.Sequence != 1 || first.Revision != 1 {
		t.Fatalf("first: %+v %v", first, err)
	}
	data["state"] = "mutated"
	received := <-aEvents
	receivedData, ok := received.Data.(map[string]any)
	if !ok || receivedData["state"] != "running" {
		t.Fatal("provider mutated retained event")
	}
	select {
	case <-bEvents:
		t.Fatal("event crossed actor")
	default:
	}
	deleted, err := s.Publish(Event{Identity: a, PanelID: "operations", Record: Record{Key: "op", Generation: 2}, Kind: EventDelete})
	if err != nil || deleted.Sequence != 2 || deleted.Revision != 2 {
		t.Fatalf("delete: %+v %v", deleted, err)
	}
	if _, publishErr := s.Publish(Event{Identity: a, PanelID: "operations", Record: Record{Key: "op", Generation: 1}, Kind: EventUpsert}); !errors.Is(publishErr, ErrInvalidEvent) {
		t.Fatal("old generation resurrected tombstone")
	}
	_, err = s.Publish(Event{Identity: a, PanelID: "operations", Record: Record{Key: "op", Generation: 3}, Kind: EventUpsert})
	if err != nil {
		t.Fatal(err)
	}
	if gap := <-aEvents; gap.Kind != EventInvalidate || gap.Sequence != 3 {
		t.Fatalf("overflow did not force recovery: %+v", gap)
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	if _, ok := <-aEvents; ok {
		t.Fatal("Close retained subscriber")
	}
	if _, err := s.Publish(Event{Identity: a, PanelID: "operations", Record: Record{Key: "op"}, Kind: EventUpsert}); !errors.Is(err, ErrClosed) {
		t.Fatalf("closed publication: %v", err)
	}
}

func TestEventStreamRejectsForeignIdentityAndUnboundedKeys(t *testing.T) {
	s := NewEventStream("data", 1)
	event := Event{Identity: eventIdentity("alice"), PanelID: "operations", Record: Record{Key: "one"}, Kind: EventUpsert}
	if _, err := s.Publish(event); err != nil {
		t.Fatal(err)
	}
	event.Key = "two"
	if _, err := s.Publish(event); !errors.Is(err, ErrCapacity) {
		t.Fatal("unbounded revision retention")
	}
	event.ConsoleID = "debug"
	if _, err := s.Publish(event); !errors.Is(err, ErrInvalidEvent) {
		t.Fatal("foreign console accepted")
	}
}
