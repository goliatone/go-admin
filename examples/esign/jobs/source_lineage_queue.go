package jobs

import (
	"context"
	"errors"
	"sync"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	defaultSourceLineageQueueWorkers  = 1
	defaultSourceLineageQueueCapacity = 64
)

var errSourceLineageQueueClosed = errors.New("source lineage queue closed")

type SourceLineageQueue struct {
	handlers  Handlers
	queue     chan SourceLineageProcessingMsg
	closed    chan struct{}
	closeOnce sync.Once
	workers   sync.WaitGroup
}

func NewSourceLineageQueue(handlers Handlers) (*SourceLineageQueue, error) {
	if err := handlers.ValidateSourceLineageProcessingDeps(); err != nil {
		return nil, err
	}
	q := &SourceLineageQueue{
		handlers: handlers,
		queue:    make(chan SourceLineageProcessingMsg, defaultSourceLineageQueueCapacity),
		closed:   make(chan struct{}),
	}
	for range defaultSourceLineageQueueWorkers {
		q.workers.Add(1)
		go q.worker()
	}
	return q, nil
}

func (q *SourceLineageQueue) Enqueue(ctx context.Context, msg SourceLineageProcessingMsg) error {
	if q == nil {
		return errors.New("source lineage queue is not configured")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	select {
	case <-q.closed:
		return errSourceLineageQueueClosed
	default:
	}
	select {
	case <-q.closed:
		return errSourceLineageQueueClosed
	case <-ctx.Done():
		return ctx.Err()
	case q.queue <- msg:
		return nil
	}
}

func (q *SourceLineageQueue) Close() {
	if q == nil {
		return
	}
	q.closeOnce.Do(func() {
		close(q.closed)
	})
	q.workers.Wait()
}

func (q *SourceLineageQueue) worker() {
	defer q.workers.Done()
	for {
		select {
		case <-q.closed:
			return
		case msg := <-q.queue:
			_, _, _ = q.handlers.ExecuteSourceLineageProcessing(context.Background(), msg)
		}
	}
}

type SourceLineageProcessingEnqueuer struct {
	enqueue func(context.Context, SourceLineageProcessingMsg) error
}

func NewSourceLineageProcessingEnqueuer(enqueue func(context.Context, SourceLineageProcessingMsg) error) SourceLineageProcessingEnqueuer {
	return SourceLineageProcessingEnqueuer{enqueue: enqueue}
}

func (e SourceLineageProcessingEnqueuer) EnqueueLineageProcessing(ctx context.Context, scope stores.Scope, input services.SourceLineageProcessingInput) error {
	if e.enqueue == nil {
		return errors.New("source lineage enqueue is not configured")
	}
	return e.enqueue(ctx, SourceLineageProcessingMsg{
		Scope:            scope,
		ImportRunID:      input.ImportRunID,
		SourceDocumentID: input.SourceDocumentID,
		SourceRevisionID: input.SourceRevisionID,
		ArtifactID:       input.ArtifactID,
		ActorID:          input.ActorID,
		Metadata:         input.Metadata,
		CorrelationID:    input.CorrelationID,
		DedupeKey:        input.DedupeKey,
	})
}
