package admin

import (
	"context"
	"errors"
	"testing"
)

var (
	_ CommandRunPublisher       = commandRunTransportStub{}
	_ CommandRunSubscriber      = commandRunTransportStub{}
	_ CommandRunTransport       = commandRunTransportStub{}
	_ CommandRunSubscription    = (*commandRunSubscriptionStub)(nil)
	_ CommandRunStore           = commandRunStoreStub{}
	_ CommandRunProjection      = CommandRunProjectionFunc(nil)
	_ CommandRunScopeResolver   = CommandRunScopeResolverFunc(nil)
	_ CommandRunScopeAuthorizer = CommandRunScopeAuthorizerFuncs{}
)

func TestNormalizeCommandRunRuntimeConfigMatrix(t *testing.T) {
	local, err := NormalizeCommandRunRuntimeConfig(CommandRunRuntimeConfig{Enabled: true})
	if err != nil {
		t.Fatalf("default local config: %v", err)
	}
	if local.Role != CommandRunRoleMonolith || local.Retention <= 0 || local.DedupeLimit < local.Retention {
		t.Fatalf("unexpected local defaults: %+v", local)
	}
	if local.Transport != nil || local.Store != nil {
		t.Fatal("normalization must not allocate runtime-owned local dependencies")
	}
	if _, err := NormalizeCommandRunRuntimeConfig(CommandRunRuntimeConfig{Enabled: true, RequireFanout: true}); err != nil {
		t.Fatalf("local transport should satisfy fanout: %v", err)
	}

	disabled, err := NormalizeCommandRunRuntimeConfig(CommandRunRuntimeConfig{
		Enabled: false, Role: CommandRunProcessRole(255), Retention: -1,
	})
	if err != nil || disabled.Enabled {
		t.Fatalf("disabled config = %+v, %v", disabled, err)
	}

	transport := commandRunTransportStub{capabilities: CommandRunTransportCapabilities{
		Name: "remote", Fanout: true, Durability: CommandRunTransportDurabilityDurable, Replay: true,
	}}
	for _, role := range []CommandRunProcessRole{CommandRunRolePublisher, CommandRunRoleGateway, CommandRunRoleMonolith} {
		t.Run(role.String(), func(t *testing.T) {
			config, err := NormalizeCommandRunRuntimeConfig(CommandRunRuntimeConfig{Enabled: true, Role: role, Transport: transport})
			if err != nil {
				t.Fatalf("normalize: %v", err)
			}
			if config.Role != role {
				t.Fatalf("role = %v, want %v", config.Role, role)
			}
		})
	}

	separate, err := NormalizeCommandRunRuntimeConfig(CommandRunRuntimeConfig{
		Enabled: true, Role: CommandRunRoleMonolith,
		Publisher: transport, Subscriber: transport,
	})
	if err != nil || separate.Publisher == nil || separate.Subscriber == nil {
		t.Fatalf("separate publisher/subscriber config = %+v, %v", separate, err)
	}
}

func TestCommandRunRuntimeConfigRejectsInvalidOwnershipAndCapabilities(t *testing.T) {
	durable := commandRunTransportStub{capabilities: CommandRunTransportCapabilities{
		Name: "durable", Fanout: true, Durability: CommandRunTransportDurabilityDurable, Replay: true,
	}}
	ephemeral := commandRunTransportStub{capabilities: CommandRunTransportCapabilities{
		Name: "ephemeral", Fanout: false, Durability: CommandRunTransportDurabilityEphemeral,
	}}
	tests := map[string]CommandRunRuntimeConfig{
		"unknown role": {Enabled: true, Role: 8},
		"ambiguous transport": {
			Enabled: true, Transport: durable, Publisher: durable,
		},
		"partial monolith split": {
			Enabled: true, Publisher: durable,
		},
		"fanout":     {Enabled: true, Transport: ephemeral, RequireFanout: true},
		"durability": {Enabled: true, Transport: ephemeral, RequireDurability: true},
		"replay":     {Enabled: true, Transport: ephemeral, RequireReplay: true},
		"requirements without capabilities": {
			Enabled: true, Publisher: commandRunPublisherStub{}, RequireReplay: true,
		},
	}
	for name, config := range tests {
		t.Run(name, func(t *testing.T) {
			if _, err := NormalizeCommandRunRuntimeConfig(config); !errors.Is(err, ErrInvalidCommandRunRuntimeConfig) {
				t.Fatalf("error = %v, want ErrInvalidCommandRunRuntimeConfig", err)
			}
		})
	}
}

func TestCommandRunTransportCapabilitiesValidation(t *testing.T) {
	tests := []CommandRunTransportCapabilities{
		{Durability: CommandRunTransportDurabilityEphemeral},
		{Name: "unknown"},
		{Name: "ephemeral-replay", Durability: CommandRunTransportDurabilityEphemeral, Replay: true},
	}
	for _, capabilities := range tests {
		if err := capabilities.Validate(); err == nil {
			t.Fatalf("capabilities %+v should fail validation", capabilities)
		}
	}
}

func TestCommandRunProcessRoles(t *testing.T) {
	if !CommandRunRoleMonolith.Has(CommandRunRolePublisher) || !CommandRunRoleMonolith.Has(CommandRunRoleGateway) {
		t.Fatal("monolith must include publisher and gateway roles")
	}
	if CommandRunRolePublisher.Has(CommandRunRoleGateway) || CommandRunProcessRole(0).Valid() {
		t.Fatal("role bitmask classification is incorrect")
	}
}

type commandRunTransportStub struct {
	capabilities CommandRunTransportCapabilities
}

func (s commandRunTransportStub) PublishCommandRun(context.Context, CommandRunUpdate) error {
	return nil
}

func (s commandRunTransportStub) SubscribeCommandRuns(context.Context, CommandRunSelector, CommandRunHandler) (CommandRunSubscription, error) {
	ready := make(chan struct{})
	close(ready)
	return &commandRunSubscriptionStub{ready: ready, errors: make(chan error)}, nil
}

func (s commandRunTransportStub) Capabilities() CommandRunTransportCapabilities {
	return s.capabilities
}

type commandRunPublisherStub struct{}

func (commandRunPublisherStub) PublishCommandRun(context.Context, CommandRunUpdate) error { return nil }

type commandRunSubscriptionStub struct {
	ready  chan struct{}
	errors chan error
}

func (s *commandRunSubscriptionStub) Ready() <-chan struct{} { return s.ready }
func (s *commandRunSubscriptionStub) Errors() <-chan error   { return s.errors }
func (s *commandRunSubscriptionStub) Close(context.Context) error {
	return nil
}

type commandRunStoreStub struct{}

func (commandRunStoreStub) Apply(context.Context, CommandRunUpdate) (CommandRunRecord, bool, error) {
	return CommandRunRecord{}, false, nil
}
func (commandRunStoreStub) List(context.Context, CommandRunSelector) ([]CommandRunRecord, error) {
	return nil, nil
}
func (commandRunStoreStub) Clear(context.Context, CommandRunSelector) error { return nil }
