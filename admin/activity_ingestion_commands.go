package admin

import (
	"context"
	command "github.com/goliatone/go-command"
	"github.com/goliatone/go-command/runner"
)

// ActivityIngestCommand validates the shared request and delegates all workflow
// decisions to Service. Use DispatchActivityIngestion for typed adapter calls;
// raw global queued dispatch is unsupported and is never a durable acceptance.
type ActivityIngestCommand struct{ Service *ActivityIngestionService }

// Run executes with current verified authority and returns the committed result.
func (c *ActivityIngestCommand) Run(ctx context.Context, msg ActivityIngestMsg) (ActivityIngestResult, error) {
	if err := checkActivityIngestionDispatch(ctx); err != nil {
		return ActivityIngestResult{}, err
	}
	if err := msg.Validate(); err != nil {
		return ActivityIngestResult{}, err
	}
	if c == nil || c.Service == nil {
		return ActivityIngestResult{}, ErrActivityIngestionUnavailable
	}
	return c.Service.Ingest(ctx, msg.Event)
}

// Execute publishes the same typed result/error to the command result collector.
func (c *ActivityIngestCommand) Execute(ctx context.Context, msg ActivityIngestMsg) error {
	result, err := c.Run(ctx, msg)
	if collector := command.ResultFromContext[ActivityIngestResult](ctx); collector != nil {
		if err != nil {
			collector.StoreError(err)
		} else {
			collector.Store(result)
		}
	}
	return err
}

// RegisterActivityIngestionCommand registers the handler and context-aware named
// factory, explicitly disabling run-once, max-run and automatic retry shortcuts.
// The factory rejects unsupported effective options before executor selection.
func RegisterActivityIngestionCommand(bus *CommandBus, service *ActivityIngestionService) (*ActivityIngestCommand, error) {
	if bus == nil || service == nil {
		return nil, ErrActivityIngestionUnavailable
	}
	bus.mu.RLock()
	enabled := bus.enabled
	bus.mu.RUnlock()
	if !enabled {
		return nil, ErrActivityIngestionUnavailable
	}
	handler := &ActivityIngestCommand{Service: service}
	if _, err := RegisterCommand(bus, handler, runner.WithRunOnce(false), runner.WithMaxRuns(0), runner.WithMaxRetries(0)); err != nil {
		return nil, err
	}
	if err := RegisterContextMessageResultFactory[ActivityIngestMsg, ActivityIngestResult](bus, ActivityIngestCommandName, func(ctx context.Context, payload map[string]any, ids []string) (ActivityIngestMsg, error) {
		if err := checkActivityIngestionDispatch(ctx); err != nil {
			return ActivityIngestMsg{}, err
		}
		if len(ids) != 0 {
			return ActivityIngestMsg{}, ErrActivityIngestionInvalid
		}
		if _, ok := ActivityProducerFromContext(ctx); !ok {
			return ActivityIngestMsg{}, ErrActivityIngestionUnauthenticated
		}
		raw, err := encodeActivityIngestionJSON(payload, service.config.MaxEnvelopeBytes, false)
		if err != nil {
			return ActivityIngestMsg{}, err
		}
		event, err := DecodeActivityIngestionEvent(raw)
		return ActivityIngestMsg{Event: event}, err
	}); err != nil {
		return nil, err
	}
	return handler, nil
}
