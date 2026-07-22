package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

var (
	// ErrCommandRunPublishFailed is the provider-neutral remote publish category.
	ErrCommandRunPublishFailed = errors.New("command-run publish failed")
	// ErrCommandRunSubscriptionFailed is the provider-neutral subscription category.
	ErrCommandRunSubscriptionFailed = errors.New("command-run subscription failed")
	// ErrCommandRunEnvelopeRejected identifies an untrusted transport envelope.
	ErrCommandRunEnvelopeRejected = errors.New("command-run envelope rejected")
	// ErrCommandRunScopeRejected identifies an identity or selector rejection.
	ErrCommandRunScopeRejected = errors.New("command-run scope rejected")
	// ErrCommandRunDeliveryDropped identifies a bounded delivery loss.
	ErrCommandRunDeliveryDropped = errors.New("command-run delivery dropped")
)

// CommandRunTransportDurability describes whether transport delivery survives
// process or broker interruption. Snapshot persistence remains a store concern.
type CommandRunTransportDurability string

const (
	CommandRunTransportDurabilityEphemeral CommandRunTransportDurability = "ephemeral"
	CommandRunTransportDurabilityDurable   CommandRunTransportDurability = "durable"
)

// CommandRunTransportCapabilities describes delivery semantics for validation
// and diagnostics without exposing provider-specific types.
type CommandRunTransportCapabilities struct {
	Name       string                        `json:"name"`
	Fanout     bool                          `json:"fanout"`
	Durability CommandRunTransportDurability `json:"durability"`
	Replay     bool                          `json:"replay"`
}

// DefaultLocalCommandRunTransportCapabilities describes the zero-service hub.
func DefaultLocalCommandRunTransportCapabilities() CommandRunTransportCapabilities {
	return CommandRunTransportCapabilities{
		Name:       "local",
		Fanout:     true,
		Durability: CommandRunTransportDurabilityEphemeral,
		Replay:     false,
	}
}

// Validate rejects incomplete or contradictory capability declarations.
func (c CommandRunTransportCapabilities) Validate() error {
	if strings.TrimSpace(c.Name) == "" {
		return fmt.Errorf("command-run transport capabilities: name is required")
	}
	switch c.Durability {
	case CommandRunTransportDurabilityEphemeral, CommandRunTransportDurabilityDurable:
	default:
		return fmt.Errorf("command-run transport capabilities: unsupported durability %q", c.Durability)
	}
	if c.Replay && c.Durability != CommandRunTransportDurabilityDurable {
		return fmt.Errorf("command-run transport capabilities: replay requires durable delivery")
	}
	return nil
}

// CommandRunHandler consumes one isolated update. Returning an error reports a
// delivery failure; publishers and command execution remain fail-open.
type CommandRunHandler func(context.Context, CommandRunUpdate) error

// CommandRunPublisher publishes canonical command-run updates.
type CommandRunPublisher interface {
	PublishCommandRun(context.Context, CommandRunUpdate) error
}

// CommandRunSubscriber creates scope-limited command-run subscriptions.
type CommandRunSubscriber interface {
	SubscribeCommandRuns(context.Context, CommandRunSelector, CommandRunHandler) (CommandRunSubscription, error)
}

// CommandRunTransport combines publishing, subscribing, and capability reporting.
type CommandRunTransport interface {
	CommandRunPublisher
	CommandRunSubscriber
	Capabilities() CommandRunTransportCapabilities
}

// CommandRunSubscription is owned by the runtime that creates it. Closing a
// subscription must not close an injected driver, router, or transport.
type CommandRunSubscription interface {
	Ready() <-chan struct{}
	Errors() <-chan error
	Close(context.Context) error
}
