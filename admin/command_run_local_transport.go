package admin

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

var (
	ErrCommandRunTransportClosed       = errors.New("command-run transport is closed")
	ErrCommandRunTransportBackpressure = errors.New("command-run transport backpressure")
	ErrCommandRunHandlerFailed         = errors.New("command-run handler failed")
)

// LocalCommandRunTransportConfig controls bounded in-process delivery.
type LocalCommandRunTransportConfig struct {
	BufferSize     int
	ErrorBuffer    int
	PublishTimeout time.Duration
	ContractLimits CommandRunContractLimits
}

// LocalCommandRunTransport is a concurrency-safe ephemeral fanout hub.
type LocalCommandRunTransport struct {
	mu sync.RWMutex

	closed         bool
	closeDone      chan struct{}
	nextID         uint64
	subscriptions  map[uint64]*localCommandRunSubscription
	bufferSize     int
	errorBuffer    int
	publishTimeout time.Duration
	limits         CommandRunContractLimits
}

// NewLocalCommandRunTransport constructs the zero-service transport.
func NewLocalCommandRunTransport(config LocalCommandRunTransportConfig) *LocalCommandRunTransport {
	if config.BufferSize <= 0 {
		config.BufferSize = defaultCommandRunBufferSize
	}
	if config.ErrorBuffer <= 0 {
		config.ErrorBuffer = 8
	}
	if config.PublishTimeout <= 0 {
		config.PublishTimeout = defaultCommandRunPublishTimeout
	}
	return &LocalCommandRunTransport{
		subscriptions:  make(map[uint64]*localCommandRunSubscription),
		closeDone:      make(chan struct{}),
		bufferSize:     config.BufferSize,
		errorBuffer:    config.ErrorBuffer,
		publishTimeout: config.PublishTimeout,
		limits:         config.ContractLimits.normalized(),
	}
}

func (t *LocalCommandRunTransport) Capabilities() CommandRunTransportCapabilities {
	return DefaultLocalCommandRunTransportCapabilities()
}

func (t *LocalCommandRunTransport) PublishCommandRun(ctx context.Context, update CommandRunUpdate) error {
	if t == nil {
		return ErrCommandRunTransportClosed
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	normalized, err := NormalizeCommandRunUpdate(update, t.limits)
	if err != nil {
		return err
	}
	publishCtx, cancel := context.WithTimeout(ctx, t.publishTimeout)
	defer cancel()

	t.mu.RLock()
	defer t.mu.RUnlock()
	if t.closed {
		return ErrCommandRunTransportClosed
	}
	for _, subscription := range t.subscriptions {
		if !subscription.selector.Matches(normalized.Scope) {
			continue
		}
		select {
		case subscription.updates <- normalized.Clone():
		case <-subscription.ctx.Done():
			continue
		case <-publishCtx.Done():
			if err := ctx.Err(); err != nil {
				return err
			}
			return fmt.Errorf("%w: publish timed out after %s", ErrCommandRunTransportBackpressure, t.publishTimeout)
		}
	}
	return nil
}

func (t *LocalCommandRunTransport) SubscribeCommandRuns(
	ctx context.Context,
	selector CommandRunSelector,
	handler CommandRunHandler,
) (CommandRunSubscription, error) {
	if t == nil {
		return nil, ErrCommandRunTransportClosed
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	selector = selector.Normalize()
	if err := selector.Validate(); err != nil {
		return nil, err
	}
	if handler == nil {
		return nil, errors.New("command-run handler is required")
	}

	subscriptionCtx, cancel := context.WithCancel(ctx)
	ready := make(chan struct{})
	close(ready)
	subscription := &localCommandRunSubscription{
		hub:      t,
		selector: selector,
		handler:  handler,
		ctx:      subscriptionCtx,
		cancel:   cancel,
		ready:    ready,
		errors:   make(chan error, t.errorBuffer),
		updates:  make(chan CommandRunUpdate, t.bufferSize),
		stopped:  make(chan struct{}),
	}

	t.mu.Lock()
	if t.closed {
		t.mu.Unlock()
		cancel()
		return nil, ErrCommandRunTransportClosed
	}
	t.nextID++
	subscription.id = t.nextID
	t.subscriptions[subscription.id] = subscription
	t.mu.Unlock()
	go subscription.run()
	return subscription, nil
}

// Close stops local subscriptions. It is idempotent and owns no external driver.
func (t *LocalCommandRunTransport) Close(ctx context.Context) error {
	if t == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	t.mu.Lock()
	firstClose := !t.closed
	var subscriptions []*localCommandRunSubscription
	if firstClose {
		t.closed = true
		subscriptions = make([]*localCommandRunSubscription, 0, len(t.subscriptions))
		for id, subscription := range t.subscriptions {
			subscriptions = append(subscriptions, subscription)
			delete(t.subscriptions, id)
		}
	}
	t.mu.Unlock()

	if firstClose {
		for _, subscription := range subscriptions {
			subscription.requestStop()
		}
		go func() {
			for _, subscription := range subscriptions {
				<-subscription.stopped
			}
			close(t.closeDone)
		}()
	}
	select {
	case <-t.closeDone:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

type localCommandRunSubscription struct {
	hub      *LocalCommandRunTransport
	id       uint64
	selector CommandRunSelector
	handler  CommandRunHandler
	ctx      context.Context
	cancel   context.CancelFunc
	ready    chan struct{}
	errors   chan error
	updates  chan CommandRunUpdate
	stopped  chan struct{}
	stopOnce sync.Once
}

func (s *localCommandRunSubscription) Ready() <-chan struct{} { return s.ready }
func (s *localCommandRunSubscription) Errors() <-chan error   { return s.errors }

func (s *localCommandRunSubscription) Close(ctx context.Context) error {
	if s == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	s.requestStop()
	s.hub.removeSubscription(s)
	select {
	case <-s.stopped:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (s *localCommandRunSubscription) requestStop() {
	s.stopOnce.Do(s.cancel)
}

func (s *localCommandRunSubscription) run() {
	defer close(s.stopped)
	defer close(s.errors)
	defer s.hub.removeSubscription(s)
	for {
		select {
		case <-s.ctx.Done():
			return
		case update := <-s.updates:
			if err := s.handler(s.ctx, update.Clone()); err != nil {
				s.reportError(ErrCommandRunHandlerFailed)
			}
		}
	}
}

func (s *localCommandRunSubscription) reportError(err error) {
	if err == nil {
		return
	}
	select {
	case s.errors <- err:
	default:
	}
}

func (t *LocalCommandRunTransport) removeSubscription(subscription *localCommandRunSubscription) {
	if t == nil || subscription == nil {
		return
	}
	t.mu.Lock()
	if current, exists := t.subscriptions[subscription.id]; exists && current == subscription {
		delete(t.subscriptions, subscription.id)
	}
	t.mu.Unlock()
}

var _ CommandRunTransport = (*LocalCommandRunTransport)(nil)
var _ CommandRunSubscription = (*localCommandRunSubscription)(nil)
