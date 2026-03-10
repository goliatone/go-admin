package admin

import (
	"context"
	"testing"

	"github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
)

type rpcDispatchTestMessage struct {
	Value string `json:"value"`
}

func (rpcDispatchTestMessage) Type() string { return "admin.rpc.dispatch.test" }

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

func TestAdminRPCDispatchEndpointRoutesCommandBus(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
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
		Meta: cmdrpc.RequestMeta{
			CorrelationID: "corr-rpc-dispatch",
			RequestID:     "req-rpc-dispatch",
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

func TestAdminRPCListEndpointReturnsRegisteredCommandNames(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
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
	found := false
	for _, name := range resp.Data.Commands {
		if name == "rpc.list.test" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected command list to include rpc.list.test, got %+v", resp.Data.Commands)
	}
}
