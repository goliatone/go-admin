package admin

import (
	"context"
	"errors"
	"slices"
	"testing"

	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
)

type rpcDispatchTestMessage struct {
	Value string `json:"value"`
}

func (rpcDispatchTestMessage) Type() string { return "admin.rpc.dispatch.test" }

type rpcTestAuthorizer struct {
	allow map[string]bool
}

func (a rpcTestAuthorizer) Can(_ context.Context, action string, resource string) bool {
	if a.allow == nil {
		return false
	}
	if a.allow[action] {
		return true
	}
	return a.allow[action+"|"+resource]
}

func TestAdminRPCServerRegistersCoreEndpoints(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
	})
	server := adm.RPCServer()
	if server == nil {
		t.Fatalf("expected rpc server")
	}
	endpoints := server.EndpointsMeta()
	seen := map[string]bool{}
	for _, endpoint := range endpoints {
		seen[endpoint.Method] = true
	}
	if !seen[RPCMethodCommandDispatch] {
		t.Fatalf("expected %q endpoint, got %+v", RPCMethodCommandDispatch, endpoints)
	}
	if !seen[RPCMethodCommandList] {
		t.Fatalf("expected %q endpoint, got %+v", RPCMethodCommandList, endpoints)
	}
}

func TestAdminRPCDispatchEndpointRejectsCommandNotAllowlisted(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.dispatch|commands": true,
		}},
	})
	_, err := adm.RPCServer().Invoke(context.Background(), RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{Name: "rpc.dispatch.test"},
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for non-allowlisted command, got %v", err)
	}
}

func TestAdminRPCDispatchEndpointRoutesCommandBusWhenAuthorized(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.test": {Permission: "admin.commands.dispatch"},
				},
			},
		},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.dispatch|commands": true,
		}},
	})
	bus := adm.Commands()
	if bus == nil {
		t.Fatalf("expected command bus")
	}
	seenValue := ""
	if _, err := RegisterCommand(bus, command.CommandFunc[rpcDispatchTestMessage](func(_ context.Context, msg rpcDispatchTestMessage) error {
		seenValue = msg.Value
		return nil
	})); err != nil {
		t.Fatalf("register command: %v", err)
	}
	if err := RegisterMessageFactory(bus, "rpc.dispatch.test", func(payload map[string]any, ids []string) (rpcDispatchTestMessage, error) {
		_ = ids
		out := rpcDispatchTestMessage{}
		if value, ok := payload["value"].(string); ok {
			out.Value = value
		}
		return out, nil
	}); err != nil {
		t.Fatalf("register message factory: %v", err)
	}

	result, err := adm.RPCServer().Invoke(context.Background(), RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{
			Name:    "rpc.dispatch.test",
			Payload: map[string]any{"value": "ok"},
		},
	})
	if err != nil {
		t.Fatalf("invoke rpc dispatch: %v", err)
	}
	resp, ok := result.(cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse])
	if !ok {
		t.Fatalf("unexpected rpc response type %T", result)
	}
	if !resp.Data.Receipt.Accepted {
		t.Fatalf("expected accepted receipt, got %+v", resp.Data.Receipt)
	}
	if seenValue != "ok" {
		t.Fatalf("expected dispatched command payload, got %q", seenValue)
	}
}

func TestAdminRPCDispatchEndpointRequiresPermission(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.test": {Permission: "admin.commands.dispatch", Resource: "commands"},
				},
			},
		},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer:  rpcTestAuthorizer{allow: map[string]bool{}},
	})
	_, err := adm.RPCServer().Invoke(context.Background(), RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{Name: "rpc.dispatch.test"},
	})
	var denied PermissionDeniedError
	if !errors.As(err, &denied) {
		t.Fatalf("expected PermissionDeniedError, got %T (%v)", err, err)
	}
}

func TestAdminRPCDispatchEndpointRunsBusinessRuleHook(t *testing.T) {
	hookErr := errors.New("scope mismatch")
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.test": {Permission: "admin.commands.dispatch"},
				},
			},
		},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.dispatch|commands": true,
		}},
		RPCCommandPolicyHook: func(_ context.Context, input RPCCommandPolicyInput) error {
			if input.CommandName != "rpc.dispatch.test" {
				t.Fatalf("unexpected command name %q", input.CommandName)
			}
			return hookErr
		},
	})
	_, err := adm.RPCServer().Invoke(context.Background(), RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{Name: "rpc.dispatch.test"},
	})
	if !errors.Is(err, hookErr) {
		t.Fatalf("expected hook error, got %v", err)
	}
}

func TestAdminRPCDispatchEndpointSanitizesUntrustedMetadata(t *testing.T) {
	var captured command.DispatchOptions
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				Commands: map[string]RPCCommandRule{
					"rpc.meta.test": {Permission: "admin.commands.dispatch"},
				},
				MetadataAllowlist: []string{"custom_meta", "request_id", "correlation_id", "actor_id"},
			},
		},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.dispatch|commands": true,
		}},
	})
	bus := adm.Commands()
	if bus == nil {
		t.Fatalf("expected command bus")
	}
	bus.mu.Lock()
	bus.dispatchers["rpc.meta.test"] = func(_ context.Context, _ map[string]any, _ []string, opts command.DispatchOptions) (command.DispatchReceipt, error) {
		captured = opts
		return command.DispatchReceipt{Accepted: true, Mode: command.ExecutionModeInline}, nil
	}
	bus.mu.Unlock()

	ctx := context.Background()
	ctx = context.WithValue(ctx, requestIDContextKey, "req-context")
	ctx = context.WithValue(ctx, correlationIDContextKey, "corr-context")
	ctx = auth.WithActorContext(ctx, &auth.ActorContext{
		ActorID:        "actor-context",
		Subject:        "subject-context",
		TenantID:       "tenant-context",
		OrganizationID: "org-context",
	})

	_, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{
			Name: "rpc.meta.test",
			Options: command.DispatchOptions{
				CorrelationID: "corr-client",
				Metadata: map[string]any{
					"actor_id":       "spoofed",
					"roles":          []string{"admin"},
					"custom_meta":    "keep-me",
					"permissions":    []string{"admin.commands.dispatch"},
					"request_id":     "req-client",
					"correlation_id": "corr-client-meta",
				},
			},
		},
		Meta: cmdrpc.RequestMeta{
			ActorID:       "spoofed-meta",
			Tenant:        "tenant-meta",
			RequestID:     "req-meta",
			CorrelationID: "corr-meta",
			Roles:         []string{"owner"},
			Permissions:   []string{"admin.commands.dispatch"},
			Scope:         map[string]any{"tenant_id": "tenant-meta"},
		},
	})
	if err != nil {
		t.Fatalf("invoke rpc dispatch: %v", err)
	}

	if captured.Metadata["actor_id"] != "actor-context" {
		t.Fatalf("expected trusted actor_id, got %v", captured.Metadata["actor_id"])
	}
	if captured.Metadata["tenant_id"] != "tenant-context" {
		t.Fatalf("expected trusted tenant_id, got %v", captured.Metadata["tenant_id"])
	}
	if captured.Metadata["organization_id"] != "org-context" {
		t.Fatalf("expected trusted organization_id, got %v", captured.Metadata["organization_id"])
	}
	if captured.Metadata["custom_meta"] != "keep-me" {
		t.Fatalf("expected allowlisted metadata preserved, got %v", captured.Metadata["custom_meta"])
	}
	if _, ok := captured.Metadata["roles"]; ok {
		t.Fatalf("expected untrusted roles metadata removed")
	}
	if _, ok := captured.Metadata["permissions"]; ok {
		t.Fatalf("expected untrusted permissions metadata removed")
	}
	if got := captured.CorrelationID; got != "corr-context" {
		t.Fatalf("expected correlation id from trusted context, got %q", got)
	}
}

func TestAdminRPCListEndpointHiddenByDefault(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
	})
	_, err := adm.RPCServer().Invoke(context.Background(), RPCMethodCommandList, &cmdrpc.RequestEnvelope[map[string]any]{})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound when discovery disabled, got %v", err)
	}
}

func TestAdminRPCListEndpointRequiresPermissionWhenEnabled(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{RPC: RPCCommandConfig{DiscoveryEnabled: true}},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer:  rpcTestAuthorizer{allow: map[string]bool{}},
	})
	_, err := adm.RPCServer().Invoke(context.Background(), RPCMethodCommandList, &cmdrpc.RequestEnvelope[map[string]any]{})
	var denied PermissionDeniedError
	if !errors.As(err, &denied) {
		t.Fatalf("expected PermissionDeniedError, got %T (%v)", err, err)
	}
}

func TestAdminRPCListEndpointReturnsRegisteredCommandNamesWhenEnabled(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{RPC: RPCCommandConfig{DiscoveryEnabled: true}},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands": true,
		}},
	})
	bus := adm.Commands()
	if bus == nil {
		t.Fatalf("expected command bus")
	}
	if err := RegisterMessageFactory(bus, "rpc.list.test", func(payload map[string]any, ids []string) (rpcDispatchTestMessage, error) {
		_, _ = payload, ids
		return rpcDispatchTestMessage{}, nil
	}); err != nil {
		t.Fatalf("register message factory: %v", err)
	}
	result, err := adm.RPCServer().Invoke(context.Background(), RPCMethodCommandList, &cmdrpc.RequestEnvelope[map[string]any]{})
	if err != nil {
		t.Fatalf("invoke rpc list: %v", err)
	}
	resp, ok := result.(cmdrpc.ResponseEnvelope[RPCCommandListResponse])
	if !ok {
		t.Fatalf("unexpected rpc response type %T", result)
	}
	found := slices.Contains(resp.Data.Commands, "rpc.list.test")
	if !found {
		t.Fatalf("expected command list to include rpc.list.test, got %+v", resp.Data.Commands)
	}
}
