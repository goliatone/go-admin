package services

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestIdempotencyStoreCoalescesConcurrentReservations(t *testing.T) {
	store := newIdempotencyStore(time.Hour)
	const callers = 32
	start := make(chan struct{})
	var owners atomic.Int32
	var wg sync.WaitGroup
	errs := make(chan error, callers)

	for range callers {
		wg.Go(func() {
			<-start
			reservation, status, body, replay, conflict, err := store.Reserve(context.Background(), "scope::key", "payload")
			if err != nil {
				errs <- err
				return
			}
			if conflict {
				errs <- errUnexpectedIdempotencyConflict{}
				return
			}
			if replay {
				if status != 201 || string(body) != `{"ok":true}` {
					errs <- errUnexpectedIdempotencyReplay{status: status, body: string(body)}
				}
				return
			}
			owners.Add(1)
			store.Commit(reservation, 201, []byte(`{"ok":true}`))
		})
	}
	close(start)
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Fatal(err)
	}
	if got := owners.Load(); got != 1 {
		t.Fatalf("concurrent reservations executed %d owners", got)
	}
}

func TestIdempotencyStoreReleaseAllowsRetry(t *testing.T) {
	store := newIdempotencyStore(time.Hour)
	reservation, _, _, replay, conflict, err := store.Reserve(context.Background(), "scope::key", "payload")
	if err != nil || replay || conflict {
		t.Fatalf("reserve owner: replay=%v conflict=%v err=%v", replay, conflict, err)
	}
	if !store.Release(reservation) {
		t.Fatal("expected owner release")
	}
	retry, _, _, replay, conflict, err := store.Reserve(context.Background(), "scope::key", "payload")
	if err != nil || replay || conflict || retry.token == 0 {
		t.Fatalf("reserve retry: reservation=%+v replay=%v conflict=%v err=%v", retry, replay, conflict, err)
	}
}

type errUnexpectedIdempotencyConflict struct{}

func (errUnexpectedIdempotencyConflict) Error() string { return "unexpected idempotency conflict" }

type errUnexpectedIdempotencyReplay struct {
	status int
	body   string
}

func (e errUnexpectedIdempotencyReplay) Error() string {
	return "unexpected idempotency replay"
}
