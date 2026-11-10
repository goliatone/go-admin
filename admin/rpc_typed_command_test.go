package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"testing"
	"time"

	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
	"github.com/stretchr/testify/require"
)

type typedRPCCount int64
type typedRPCNested struct {
	DisplayName string `json:"displayName"`
}
type typedRPCInput struct {
	DryRun bool           `json:"dryRun"`
	Nested typedRPCNested `json:"nested"`
	Count  typedRPCCount  `json:"count"`
	Wide   uint64         `json:"wide,string"`
}
type typedRPCResult struct {
	Input typedRPCInput `json:"input"`
	Count typedRPCCount `json:"count"`
}
type typedRPCMessage struct {
	Input typedRPCInput
	IDs   []string
	Actor string
}

func (typedRPCMessage) Type() string { return "typed.test" }

type typedRPCHandler struct {
	seen   []typedRPCMessage
	unsafe bool
}

func (h *typedRPCHandler) Execute(ctx context.Context, m typedRPCMessage) error {
	h.seen = append(h.seen, m)
	out := typedRPCResult{Input: m.Input, Count: m.Input.Count}
	if h.unsafe {
		out.Count = typedRPCCount(cmdrpc.MaxSafeInteger + 1)
	}
	command.ResultFromContext[typedRPCResult](ctx).Store(out)
	return nil
}
func typedRPCBinding(t *testing.T) *RPCCommandBinding[typedRPCInput, typedRPCResult] {
	t.Helper()
	b, err := NewRPCCommandBinding[typedRPCInput, typedRPCResult](cmdrpc.CommandContractFor[typedRPCInput, typedRPCResult]("typed.test"), cmdrpc.ExportOptions{Overrides: map[reflect.Type]cmdrpc.WireSchema{reflect.TypeFor[any](): {Kind: "json"}}, Bounds: map[reflect.Type]cmdrpc.IntegerBounds{reflect.TypeFor[time.Duration](): {Minimum: 0, Maximum: cmdrpc.MaxSafeInteger}, reflect.TypeFor[typedRPCCount](): {Minimum: 0, Maximum: cmdrpc.MaxSafeInteger}}})
	require.NoError(t, err)
	return b
}
func typedRPCAdmin(t *testing.T) *Admin {
	t.Helper()
	a := mustNewAdmin(t, Config{Commands: CommandConfig{RPC: RPCCommandConfig{Commands: map[string]RPCCommandRule{"typed.test": {AllowUnauthenticated: true}, "legacy.test": {AllowUnauthenticated: true}}}}}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCommands), Authorizer: rpcTestAuthorizer{allow: map[string]bool{"admin.commands.dispatch": true}}})
	t.Cleanup(a.Commands().Close)
	return a
}
func registerTypedRPC(t *testing.T, a *Admin, h *typedRPCHandler) CommandRegistrationHandle {
	t.Helper()
	set, err := a.Commands().NewRegistrationSet("typed-owner")
	require.NoError(t, err)
	require.NoError(t, RegisterSetCommand(set, h))
	require.NoError(t, RegisterSetTypedRPCCommand(set, typedRPCBinding(t), func(ctx context.Context, in typedRPCInput, ids []string) (typedRPCMessage, error) {
		actor, _ := auth.ActorFromContext(ctx)
		id := ""
		if actor != nil {
			id = actor.ActorID
		}
		return typedRPCMessage{in, ids, id}, nil
	}))
	handle, err := set.Commit()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, handle.Close()) })
	return handle
}
func invokeTypedRPC(t *testing.T, a *Admin, body string) (any, error) {
	t.Helper()
	req, err := a.RPCServer().NewRequestForMethod(RPCMethodCommandDispatch)
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal([]byte(body), req))
	return a.RPCServer().Invoke(context.Background(), RPCMethodCommandDispatch, req)
}
func TestTypedRPCOriginalInputAndCanonicalCallers(t *testing.T) {
	a := typedRPCAdmin(t)
	h := &typedRPCHandler{}
	registerTypedRPC(t, a, h)
	a.rpcCommandPolicyHook = func(_ context.Context, input RPCCommandPolicyInput) error {
		require.Equal(t, true, input.Payload["dry_run"])
		require.IsType(t, float64(0), input.Payload["count"])
		input.Payload["nested"].(map[string]any)["displayName"] = "policy-mutation"
		return nil
	}
	out, err := invokeTypedRPC(t, a, `{"data":{"command_id":"typed.test","name":"ignored","ids":["selection"],"payload":{"dryRun":true,"nested":{"displayName":"original"},"count":9007199254740991,"wide":"18446744073709551615","unknown":"ignored"}}}`)
	require.NoError(t, err)
	require.NotNil(t, out)
	require.Len(t, h.seen, 1)
	require.True(t, h.seen[0].Input.DryRun)
	require.Equal(t, "original", h.seen[0].Input.Nested.DisplayName)
	require.Equal(t, ^uint64(0), h.seen[0].Input.Wide)
	require.Equal(t, []string{"selection"}, h.seen[0].IDs)
	a.rpcCommandPolicyHook = nil
	canonical := cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{Data: RPCCommandDispatchRequest{Name: "typed.test", Payload: map[string]any{"dryRun": true, "count": float64(2), "wide": "5"}}}
	_, err = a.RPCServer().Invoke(context.Background(), RPCMethodCommandDispatch, canonical)
	require.NoError(t, err)
	require.True(t, h.seen[1].Input.DryRun)
	ep := commandDispatchRPCEndpoint(a)
	require.Equal(t, reflect.TypeFor[*cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]](), ep.RequestType())
}
func TestTypedRPCRejectsInvalidInputBeforeExecution(t *testing.T) {
	a := typedRPCAdmin(t)
	h := &typedRPCHandler{}
	registerTypedRPC(t, a, h)
	for _, payload := range []string{
		`{"count":1.5}`, `{"count":9007199254740992}`, `{"COUNT":9007199254740992}`, `{"count":9223372036854775808}`, `{"wide":18446744073709551615}`, `{"wide":"18446744073709551616"}`,
		`{"actor_id":"forged"}`, `{"ActorID":"forged"}`, `{"tenantId":"forged"}`, `{"nested":{"organization_id":"forged"}}`, `{"unknown":[{"roles":["admin"]}]}`, `{"unknown":{"actor":"forged"},"unknown":{}}`,
	} {
		t.Run(payload, func(t *testing.T) {
			_, err := invokeTypedRPC(t, a, `{"data":{"name":"typed.test","payload":`+payload+`}}`)
			require.Error(t, err)
			require.Empty(t, h.seen)
		})
	}
	_, err := invokeTypedRPC(t, a, `{"data":{"name":"typed.test","payload":{"count":0,"wide":"0","other":{"ordinary":true,"huge":1e400}}}}`)
	require.NoError(t, err)
}
func TestTypedRPCBindingDeclarationAndEgress(t *testing.T) {
	type authority struct {
		Actor string `json:"actorId"`
	}
	opts := cmdrpc.ExportOptions{Overrides: map[reflect.Type]cmdrpc.WireSchema{reflect.TypeFor[any](): {Kind: "json"}}, Bounds: map[reflect.Type]cmdrpc.IntegerBounds{reflect.TypeFor[time.Duration](): {Maximum: cmdrpc.MaxSafeInteger}}, Commands: []cmdrpc.CommandContract{cmdrpc.CommandContractFor[authority, string]("bad")}}
	_, err := ExportRPCContracts(opts)
	require.ErrorContains(t, err, "reserved authority")
	_, err = NewRPCCommandBinding[typedRPCInput, typedRPCResult](cmdrpc.CommandContractFor[authority, string]("bad"), cmdrpc.ExportOptions{})
	require.Error(t, err)
	b := typedRPCBinding(t)
	opts.Commands = []cmdrpc.CommandContract{b.Contract(), b.Contract()}
	opts.Bounds = map[reflect.Type]cmdrpc.IntegerBounds{reflect.TypeFor[time.Duration](): {Minimum: 0, Maximum: cmdrpc.MaxSafeInteger}, reflect.TypeFor[typedRPCCount](): {Maximum: cmdrpc.MaxSafeInteger}}
	_, err = ExportRPCContracts(opts)
	require.ErrorContains(t, err, "duplicate")
	a := typedRPCAdmin(t)
	h := &typedRPCHandler{unsafe: true}
	registerTypedRPC(t, a, h)
	_, err = invokeTypedRPC(t, a, `{"data":{"name":"typed.test","payload":{"count":0,"wide":"0"}}}`)
	require.Error(t, err)
}
func TestTypedRPCMixedHostsAndOwnedLifetime(t *testing.T) {
	a := typedRPCAdmin(t)
	b := typedRPCAdmin(t)
	first := &typedRPCHandler{}
	second := &typedRPCHandler{}
	other := &typedRPCHandler{}
	old := registerTypedRPC(t, a, first)
	registerTypedRPC(t, b, other)
	var legacy map[string]any
	require.NoError(t, a.Commands().RegisterFactory("legacy.test", func(payload map[string]any, _ []string) (command.Message, error) {
		legacy = payload
		return typedRPCMessage{}, nil
	}))
	_, err := invokeTypedRPC(t, a, `{"data":{"name":"legacy.test","payload":{"dryRun":true,"count":3,"actorId":"legacy"}}}`)
	require.Error(t, err)
	require.Equal(t, true, legacy["dry_run"])
	require.IsType(t, float64(0), legacy["count"])
	require.NoError(t, old.Close())
	latest := registerTypedRPC(t, a, second)
	require.NoError(t, old.Close())
	_, err = invokeTypedRPC(t, a, `{"data":{"name":"typed.test","payload":{"count":1,"wide":"0"}}}`)
	require.NoError(t, err)
	require.Empty(t, first.seen)
	require.Len(t, second.seen, 1)
	require.Empty(t, other.seen)
	require.NoError(t, latest.Close())
	req, err := a.RPCServer().NewRequestForMethod(RPCMethodCommandDispatch)
	require.NoError(t, err)
	require.IsType(t, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{}, req)
	_, err = a.Commands().DispatchByNameWithOutcome(context.Background(), "typed.test", nil, nil, command.DispatchOptions{})
	require.ErrorIs(t, err, ErrNotFound)
	_, err = invokeTypedRPC(t, b, `{"data":{"name":"typed.test","payload":{"count":1,"wide":"0"}}}`)
	require.NoError(t, err)
	require.Len(t, other.seen, 1)
}

func TestTypedRPCDeclarationConflictsAndOptions(t *testing.T) {
	a := typedRPCAdmin(t)
	binding := typedRPCBinding(t)
	set, err := a.Commands().NewRegistrationSet("duplicate")
	require.NoError(t, err)
	build := func(_ context.Context, input typedRPCInput, _ []string) (typedRPCMessage, error) {
		return typedRPCMessage{Input: input}, nil
	}
	require.Error(t, RegisterSetTypedRPCCommand(set, new(RPCCommandBinding[typedRPCInput, typedRPCResult]), build))
	require.NoError(t, RegisterSetTypedRPCCommand(set, binding, build))
	require.Error(t, RegisterSetTypedRPCCommand(set, binding, build))
	h := &typedRPCHandler{}
	registerTypedRPC(t, a, h)
	_, err = invokeTypedRPC(t, a, `{"data":{"command_id":"typed.test","payload":{"count":0,"wide":"0"},"options":{"Delay":9007199254740992}}}`)
	require.Error(t, err)
	require.Empty(t, h.seen)
}
func TestTypedRPCLegacyCanonicalCallerDoesNotRequireJSON(t *testing.T) {
	a := typedRPCAdmin(t)
	registerTypedRPC(t, a, &typedRPCHandler{})
	called := false
	require.NoError(t, a.Commands().RegisterFactory("legacy.test", func(payload map[string]any, _ []string) (command.Message, error) {
		called = true
		require.IsType(t, (func())(nil), payload["callback"])
		return typedRPCMessage{}, nil
	}))
	_, err := a.RPCServer().Invoke(context.Background(), RPCMethodCommandDispatch, cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{Data: RPCCommandDispatchRequest{Name: "legacy.test", Payload: map[string]any{"callback": func() {}}}})
	require.Error(t, err)
	require.True(t, called)
}

type typedRPCLabel string

func (v typedRPCLabel) MarshalJSON() ([]byte, error) { return json.Marshal(string(v)) }
func TestTypedRPCBindingSnapshotsPolicyAndRejectsScalarInput(t *testing.T) {
	type input struct {
		Label typedRPCLabel `json:"label"`
	}
	values := []string{"allowed"}
	opts := cmdrpc.ExportOptions{Bounds: map[reflect.Type]cmdrpc.IntegerBounds{reflect.TypeFor[time.Duration](): {Maximum: cmdrpc.MaxSafeInteger}}, Overrides: map[reflect.Type]cmdrpc.WireSchema{reflect.TypeFor[any](): {Kind: "json"}, reflect.TypeFor[typedRPCLabel](): {Kind: "enum", Values: values}}}
	binding, err := NewRPCCommandBinding[input, string](cmdrpc.CommandContractFor[input, string]("snapshot"), opts)
	require.NoError(t, err)
	values[0] = "changed"
	_, err = binding.Decode(json.RawMessage(`{"label":"allowed"}`))
	require.NoError(t, err)
	_, err = binding.Decode(json.RawMessage(`{"label":"changed"}`))
	require.Error(t, err)
	_, err = NewRPCCommandBinding[string, string](cmdrpc.CommandContractFor[string, string]("scalar"), opts)
	require.ErrorContains(t, err, "object")
}

func TestTypedRPCRejectsRepeatedWrappersWithoutExecution(t *testing.T) {
	a := typedRPCAdmin(t)
	h := &typedRPCHandler{}
	registerTypedRPC(t, a, h)
	policyCalls := 0
	a.rpcCommandPolicyHook = func(context.Context, RPCCommandPolicyInput) error {
		policyCalls++
		return nil
	}
	for _, body := range []string{
		`{"data":{"name":"typed.test","payload":{"dryRun":true},"payload":{"count":2,"wide":"0"}}}`,
		`{"data":{"name":"typed.test","payload":{"actor_id":"forged"},"payload":{"count":2,"wide":"0"}}}`,
		`{"data":{"name":"typed.test","payload":{"dryRun":true},"PAYLOAD":{"count":2,"wide":"0"}}}`,
		`{"data":{"name":"typed.test","payload":{"dryRun":true}},"data":{"payload":{"count":2,"wide":"0"}}}`,
		`{"data":{"name":"typed.test","payload":{"dryRun":true}},"DATA":{"payload":{"count":2,"wide":"0"}}}`,
		`{"data":{"name":"typed.test","payload":{"dryRun":true},"payload":null}}`,
		`{"data":{"name":"typed.test","payload":{"dryRun":true}},"data":null}`,
	} {
		t.Run(body, func(t *testing.T) {
			req, err := a.RPCServer().NewRequestForMethod(RPCMethodCommandDispatch)
			require.NoError(t, err)
			err = json.Unmarshal([]byte(body), req)
			require.ErrorContains(t, err, "repeated")
			require.Empty(t, h.seen)
			require.Zero(t, policyCalls)
		})
	}
}

func TestTypedRPCRepeatedDTOFieldsAndLegacyWrappersRemainCompatible(t *testing.T) {
	a := typedRPCAdmin(t)
	h := &typedRPCHandler{}
	registerTypedRPC(t, a, h)
	_, err := invokeTypedRPC(t, a, `{"DATA":{"name":"typed.test","PAYLOAD":{"dryRun":true,"nested":{"displayName":"kept"},"nested":{},"count":1,"count":2,"wide":"0"}}}`)
	require.NoError(t, err)
	require.Len(t, h.seen, 1)
	require.True(t, h.seen[0].Input.DryRun)
	require.Equal(t, "kept", h.seen[0].Input.Nested.DisplayName)
	require.Equal(t, typedRPCCount(2), h.seen[0].Input.Count)
	body := `{"data":{"name":"legacy.test","payload":{"dryRun":true}},"DATA":{"payload":{"count":2}}}`
	var canonical cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]
	require.NoError(t, json.Unmarshal([]byte(body), &canonical))
	req, err := a.RPCServer().NewRequestForMethod(RPCMethodCommandDispatch)
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal([]byte(body), req))
	require.Equal(t, canonical, req.(*rpcDispatchCarrier).RequestEnvelope)
}

func TestTypedRPCNestedCanonicalInvocationIsolation(t *testing.T) {
	for _, origin := range []string{"policy", "builder"} {
		for _, pointer := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/pointer=%t", origin, pointer), func(t *testing.T) {
				a := typedRPCAdmin(t)
				h := &typedRPCHandler{}
				set, err := a.Commands().NewRegistrationSet("nested")
				require.NoError(t, err)
				require.NoError(t, RegisterSetCommand(set, h))
				var downstream context.Context
				nested := func(ctx context.Context) {
					downstream = ctx
					actor, ok := auth.ActorFromContext(ctx)
					require.True(t, ok)
					require.Equal(t, "trusted-operator", actor.ActorID)
					req := cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{Data: RPCCommandDispatchRequest{Name: "typed.test", Payload: map[string]any{"dryRun": true, "count": 2, "wide": "7"}, IDs: []string{"inner"}}}
					var payload any = req
					if pointer {
						payload = &req
					}
					_, err := a.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, payload)
					require.NoError(t, err)
				}
				require.NoError(t, RegisterSetTypedRPCCommand(set, typedRPCBinding(t), func(ctx context.Context, input typedRPCInput, ids []string) (typedRPCMessage, error) {
					if origin == "builder" && len(ids) > 0 && ids[0] == "outer" {
						nested(ctx)
					}
					actor, _ := auth.ActorFromContext(ctx)
					return typedRPCMessage{Input: input, IDs: ids, Actor: actor.ActorID}, nil
				}))
				handle, err := set.Commit()
				require.NoError(t, err)
				t.Cleanup(func() { require.NoError(t, handle.Close()) })
				a.rpcCommandPolicyHook = func(ctx context.Context, input RPCCommandPolicyInput) error {
					if origin == "policy" && len(input.IDs) > 0 && input.IDs[0] == "outer" {
						nested(ctx)
					}
					return nil
				}
				req, err := a.RPCServer().NewRequestForMethod(RPCMethodCommandDispatch)
				require.NoError(t, err)
				require.NoError(t, json.Unmarshal([]byte(`{"data":{"name":"typed.test","ids":["outer"],"payload":{"dryRun":false,"count":1,"wide":"3"}}}`), req))
				ctx, cancel := context.WithCancel(auth.WithActorContext(t.Context(), &auth.ActorContext{ActorID: "trusted-operator"}))
				defer cancel()
				_, err = a.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, req)
				require.NoError(t, err)
				require.Len(t, h.seen, 2)
				require.Equal(t, typedRPCInput{DryRun: true, Count: 2, Wide: 7}, h.seen[0].Input)
				require.Equal(t, []string{"inner"}, h.seen[0].IDs)
				require.Equal(t, "trusted-operator", h.seen[0].Actor)
				require.Equal(t, typedRPCInput{Count: 1, Wide: 3}, h.seen[1].Input)
				cancel()
				require.ErrorIs(t, downstream.Err(), context.Canceled)
			})
		}
	}
}
