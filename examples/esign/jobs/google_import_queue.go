package jobs

import (
	"context"
	"errors"
)

const (
	defaultGoogleImportQueueWorkers  = 1
	defaultGoogleImportQueueCapacity = 64
)

var errGoogleImportQueueClosed = errors.New("google import queue closed")

// GoogleDriveImportQueue provides an in-process async queue for google drive import jobs.
type GoogleDriveImportQueue struct {
	handlers Handlers
	queue    chan GoogleDriveImportMsg
	closed   chan struct{}
}

// NewGoogleDriveImportQueue starts a bounded worker queue backed by ExecuteGoogleDriveImport.
func NewGoogleDriveImportQueue(handlers Handlers) (*GoogleDriveImportQueue, error) {
	if err := handlers.ValidateGoogleImportDeps(); err != nil {
		return nil, err
	}
	q := &GoogleDriveImportQueue{
		handlers: handlers,
		queue:    make(chan GoogleDriveImportMsg, defaultGoogleImportQueueCapacity),
		closed:   make(chan struct{}),
	}
	for i := 0; i < defaultGoogleImportQueueWorkers; i++ {
		go q.worker()
	}
	return q, nil
}

// Enqueue submits a message for asynchronous processing.
func (q *GoogleDriveImportQueue) Enqueue(ctx context.Context, msg GoogleDriveImportMsg) error {
	if q == nil {
		return errors.New("google import queue is not configured")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	select {
	case <-q.closed:
		return errGoogleImportQueueClosed
	default:
	}
	select {
	case <-q.closed:
		return errGoogleImportQueueClosed
	case <-ctx.Done():
		return ctx.Err()
	case q.queue <- msg:
		return nil
	}
}

// Close stops accepting new messages and terminates workers.
func (q *GoogleDriveImportQueue) Close() {
	if q == nil {
		return
	}
	select {
	case <-q.closed:
		return
	default:
		close(q.closed)
	}
}

func (q *GoogleDriveImportQueue) worker() {
	for {
		select {
		case <-q.closed:
			return
		case msg := <-q.queue:
			_, _ = q.handlers.ExecuteGoogleDriveImport(context.Background(), msg)
		}
	}
}
