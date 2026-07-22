package admin

import (
	"errors"
	"sync"

	router "github.com/goliatone/go-router"
)

var errDebugWebSocketReadInterruptionUnsupported = errors.New("websocket adapter does not support concurrency-safe read interruption")

// debugWebSocketJSONReader owns the lifetime of one WebSocket read goroutine.
// Its owner must call Stop before returning control to the router so adapter
// connection state cannot be reclaimed while ReadJSON is still in flight.
type debugWebSocketJSONReader[T any] struct {
	messages      <-chan T
	errors        <-chan error
	done          <-chan struct{}
	stop          chan struct{}
	interruptRead func() error
	stopOnce      sync.Once
	stopErr       error
}

func startDebugWebSocketJSONReader[T any](c router.WebSocketContext, capacity int, dropWhenFull bool) (*debugWebSocketJSONReader[T], error) {
	interrupter, ok := c.(router.WebSocketReadInterrupter)
	if !ok {
		return nil, errDebugWebSocketReadInterruptionUnsupported
	}
	if capacity < 0 {
		capacity = 0
	}
	messages := make(chan T, capacity)
	errors := make(chan error, 1)
	done := make(chan struct{})
	stop := make(chan struct{})
	reader := &debugWebSocketJSONReader[T]{
		messages:      messages,
		errors:        errors,
		done:          done,
		stop:          stop,
		interruptRead: interrupter.InterruptRead,
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

	return reader, nil
}

// Stop prevents further message delivery, interrupts a blocked socket read,
// and waits until the reader goroutine no longer owns connection state.
func (r *debugWebSocketJSONReader[T]) Stop() error {
	if r == nil {
		return nil
	}
	r.stopOnce.Do(func() {
		close(r.stop)
		select {
		case <-r.done:
			return
		default:
		}
		if r.interruptRead != nil {
			r.stopErr = r.interruptRead()
		}
		<-r.done
	})
	return r.stopErr
}

func preserveDebugWebSocketPrimaryError(primary, teardown error) error {
	if primary != nil {
		return primary
	}
	return teardown
}

func pendingDebugWebSocketReadError(errors <-chan error) (error, bool) {
	select {
	case err := <-errors:
		return err, true
	default:
		return nil, false
	}
}

func closeDebugWebSocket(c router.WebSocketContext) {
	if c != nil {
		_ = c.Close() //nolint:errcheck // teardown must not replace the handler's primary result.
	}
}
