package admin

import (
	"sync"
	"time"

	router "github.com/goliatone/go-router"
)

const debugWebSocketReadInterruptRetry = 10 * time.Millisecond

// debugWebSocketJSONReader owns the lifetime of one WebSocket read goroutine.
// Its owner must call Stop before returning control to the router so adapter
// connection state cannot be reclaimed while ReadJSON is still in flight.
type debugWebSocketJSONReader[T any] struct {
	messages <-chan T
	errors   <-chan error
	done     <-chan struct{}
	stop     chan struct{}
	stopOnce sync.Once
}

func startDebugWebSocketJSONReader[T any](c router.WebSocketContext, capacity int, dropWhenFull bool) *debugWebSocketJSONReader[T] {
	if capacity < 0 {
		capacity = 0
	}
	messages := make(chan T, capacity)
	errors := make(chan error, 1)
	done := make(chan struct{})
	stop := make(chan struct{})
	reader := &debugWebSocketJSONReader[T]{
		messages: messages,
		errors:   errors,
		done:     done,
		stop:     stop,
	}

	go func() {
		defer close(done)
		defer close(messages)
		for {
			select {
			case <-stop:
				return
			default:
			}

			var message T
			if err := c.ReadJSON(&message); err != nil {
				select {
				case <-stop:
					return
				default:
				}
				errors <- err
				return
			}

			if dropWhenFull {
				select {
				case messages <- message:
				case <-stop:
					return
				default:
				}
				continue
			}

			select {
			case messages <- message:
			case <-stop:
				return
			}
		}
	}()

	return reader
}

// Stop prevents further message delivery, interrupts a blocked socket read,
// and waits until the reader goroutine no longer owns connection state.
func (r *debugWebSocketJSONReader[T]) Stop(c router.WebSocketContext) {
	if r == nil {
		return
	}
	r.stopOnce.Do(func() {
		close(r.stop)
	})

	select {
	case <-r.done:
		return
	default:
	}

	retry := time.NewTicker(debugWebSocketReadInterruptRetry)
	defer retry.Stop()
	for {
		if c != nil {
			_ = c.SetReadDeadline(time.Now()) //nolint:errcheck // retry plus the completion barrier remain authoritative.
		}
		select {
		case <-r.done:
			return
		case <-retry.C:
		}
	}
}

func closeDebugWebSocket(c router.WebSocketContext) {
	if c != nil {
		_ = c.Close() //nolint:errcheck // teardown must not replace the handler's primary result.
	}
}
