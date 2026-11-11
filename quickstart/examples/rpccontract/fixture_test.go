package rpccontract

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
	"github.com/stretchr/testify/require"
)

type liveFixture struct {
	host   *Host
	url    string
	client *http.Client
	token  string
}

func live(t *testing.T) *liveFixture {
	t.Helper()
	h, err := New("test-ephemeral-signing-key-at-least-32-bytes")
	require.NoError(t, err)
	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	require.NoError(t, err)
	stop, done, err := h.Serve(listener)
	require.NoError(t, err)
	f := &liveFixture{host: h, url: "http://" + listener.Addr().String() + h.Admin.AdminAPIBasePath() + "/rpc", client: &http.Client{Timeout: 5 * time.Second}}
	f.token, err = h.Token("operator")
	require.NoError(t, err)
	t.Cleanup(func() {
		f.client.CloseIdleConnections()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		require.NoError(t, stop(ctx))
		require.NoError(t, <-done)
		h.Close()
	})
	return f
}
func (f *liveFixture) call(t *testing.T, method string, data any, token string) (int, map[string]any) {
	t.Helper()
	body, err := json.Marshal(map[string]any{"method": method, "params": map[string]any{"data": data, "meta": map[string]any{"actorId": "forged", "tenant": "forged", "correlationId": "envelope-correlation", "requestId": "envelope-request"}}})
	require.NoError(t, err)
	return f.callRaw(t, body, token)
}

func (f *liveFixture) callRaw(t *testing.T, body []byte, token string) (int, map[string]any) {
	t.Helper()
	req, err := http.NewRequestWithContext(t.Context(), "POST", f.url, bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("X-Correlation-ID", "transport-correlation")
	req.Header.Set("X-Request-ID", "transport-request")
	response, err := f.client.Do(req)
	require.NoError(t, err)
	defer response.Body.Close()
	raw, err := io.ReadAll(response.Body)
	require.NoError(t, err)
	var out map[string]any
	require.NoError(t, json.Unmarshal(raw, &out), string(raw))
	return response.StatusCode, out
}
func validInput() Input {
	return Input{ResourceID: "resource-a", DryRun: true, Resource: Resource{"nested"}, Count: Count(cmdrpc.MaxSafeInteger), Revision: ^uint64(0)}
}
func TestProtectedTypedFixture(t *testing.T) {
	f := live(t)
	in := validInput()
	opts := command.DispatchOptions{Mode: command.ExecutionModeInline, CorrelationID: "transport-correlation", IdempotencyKey: "hint", Metadata: map[string]any{"request_id": "transport-request", "correlation_id": "transport-correlation", "actor_id": "operator", "subject": "operator", "tenant": "tenant-a", "tenant_id": "tenant-a", "scope": map[string]any{"tenant_id": "tenant-a"}}}
	direct, err := f.host.Direct(TrustedContext(t.Context()), in, []string{"selected"}, opts)
	require.NoError(t, err)
	for _, method := range []string{admin.RPCMethodCommandDispatch, UpdateMethod} {
		var data any = in
		if method == admin.RPCMethodCommandDispatch {
			data = map[string]any{"command_id": CommandID, "name": "ignored", "payload": in, "ids": []string{"selected"}, "options": map[string]any{"IdempotencyKey": "hint", "CorrelationID": "forged", "Metadata": map[string]any{"actor_id": "forged"}}}
		}
		status, out := f.call(t, method, data, f.token)
		require.Equal(t, 200, status)
		require.NotContains(t, out, "error")
		result := out["data"]
		if method == admin.RPCMethodCommandDispatch {
			result = out["data"].(map[string]any)["result"]
		}
		expected, _ := json.Marshal(direct.Result)
		actual, _ := json.Marshal(result)
		require.JSONEq(t, string(expected), string(actual))
	}
	writes, observations := f.host.Service.Snapshot()
	require.Zero(t, writes)
	require.Len(t, observations, 3)
	for _, seen := range observations {
		require.Equal(t, "operator", seen.ActorID)
		require.Equal(t, "tenant-a", seen.TenantID)
		require.True(t, seen.Input.DryRun)
		require.Equal(t, ^uint64(0), seen.Input.Revision)
		require.Equal(t, "transport-correlation", seen.Options.CorrelationID)
	}
	require.Equal(t, observations[0].IDs, observations[1].IDs)
	require.Equal(t, observations[0].Options, observations[1].Options)
	q := Query{ResourceID: "resource-a"}
	directQuery, err := f.host.Query(TrustedContext(t.Context()), q)
	require.NoError(t, err)
	_, out := f.call(t, QueryMethod, q, f.token)
	require.NotContains(t, out, "error")
	require.Equal(t, float64(directQuery.Writes), out["data"].(map[string]any)["writes"])
	denied, err := f.host.Token("denied")
	require.NoError(t, err)
	for _, method := range []string{admin.RPCMethodCommandDispatch, UpdateMethod, QueryMethod} {
		for _, token := range []string{"", "invalid", denied} {
			var data any = in
			if method == admin.RPCMethodCommandDispatch {
				data = map[string]any{"command_id": CommandID, "payload": in}
			}
			if method == QueryMethod {
				data = q
			}
			status, out := f.call(t, method, data, token)
			if token == denied {
				require.Equal(t, 200, status)
				require.Equal(t, cmdrpc.CodeForbidden, out["error"].(map[string]any)["code"])
			} else {
				require.Equal(t, 401, status)
			}
		}
	}
	writes, after := f.host.Service.Snapshot()
	require.Zero(t, writes)
	require.Len(t, after, 3)
	_, err = f.host.Direct(context.Background(), in, nil, command.DispatchOptions{})
	require.ErrorIs(t, err, admin.ErrForbidden)
	_, err = f.host.Query(context.Background(), q)
	require.ErrorIs(t, err, admin.ErrForbidden)
}
func TestProtectedTypedMalformedInput(t *testing.T) {
	f := live(t)
	for _, payload := range []string{
		`{"resourceId":"resource-a","count":1.5}`, `{"resourceId":"resource-a","count":9007199254740992}`, `{"resourceId":"resource-a","count":9223372036854775808}`, `{"resourceId":"resource-a","revision":18446744073709551615}`, `{"resourceId":"resource-a","revision":"18446744073709551616"}`,
		`{"resourceId":"resource-a","actorId":"operator"}`, `{"resourceId":"resource-a","tenant_id":"tenant-a"}`, `{"resourceId":"resource-a","resource":{"roles":["admin"]}}`,
	} {
		for _, method := range []string{admin.RPCMethodCommandDispatch, UpdateMethod} {
			t.Run(method+payload, func(t *testing.T) {
				var data any = json.RawMessage(payload)
				if method == admin.RPCMethodCommandDispatch {
					data = map[string]any{"command_id": CommandID, "payload": data}
				}
				_, out := f.call(t, method, data, f.token)
				require.Equal(t, cmdrpc.CodeInvalidArgument, out["error"].(map[string]any)["code"])
			})
		}
	}
	writes, seen := f.host.Service.Snapshot()
	require.Zero(t, writes)
	require.Empty(t, seen)
	for _, method := range []string{admin.RPCMethodCommandDispatch, UpdateMethod} {
		payload := json.RawMessage(`{"resourceId":"resource-a","dryRun":true,"resource":{"displayName":"camel"},"count":0,"revision":"0","unknown":{"ignored":true}}`)
		var data any = payload
		if method == admin.RPCMethodCommandDispatch {
			data = map[string]any{"name": CommandID, "payload": payload}
		}
		_, out := f.call(t, method, data, f.token)
		require.NotContains(t, out, "error")
	}
}

func TestProtectedTypedOutcomesAndLifetime(t *testing.T) {
	f := live(t)
	other := live(t)
	input := validInput()
	input.DryRun = false
	request := func(id, mode string, input Input) any {
		return map[string]any{"command_id": id, "name": "not-selected", "payload": input, "ids": []string{"selected"}, "options": map[string]any{"Mode": mode, "IdempotencyKey": "hint", "DedupPolicy": "ignore"}}
	}
	_, queued := f.call(t, admin.RPCMethodCommandDispatch, request(CommandID, "queued", input), f.token)
	require.NotContains(t, queued, "error")
	data := queued["data"].(map[string]any)
	require.NotContains(t, data, "result")
	require.NotContains(t, data, "status_reference")
	require.NotContains(t, data, "validation_errors")
	_, touchQueue := f.call(t, admin.RPCMethodCommandDispatch, request(ReceiptCommandID, "queued", input), f.token)
	require.NotContains(t, touchQueue, "error")
	require.NotContains(t, touchQueue["data"], "result")
	receipt := data["receipt"].(map[string]any)
	require.Equal(t, "queued", receipt["Mode"])
	require.Equal(t, true, receipt["Accepted"])
	require.Equal(t, CommandID, receipt["CommandID"])
	require.Equal(t, "example-queue", receipt["DispatchID"])
	require.Equal(t, "2026-01-01T00:00:00Z", receipt["EnqueuedAt"])
	require.Equal(t, "transport-correlation", receipt["CorrelationID"])
	require.NotContains(t, receipt, "mode")
	writes, _ := f.host.Service.Snapshot()
	require.Zero(t, writes)
	_, noResult := f.call(t, admin.RPCMethodCommandDispatch, request(ReceiptCommandID, "inline", input), f.token)
	require.NotContains(t, noResult, "error")
	require.NotContains(t, noResult["data"], "result")
	writes, _ = f.host.Service.Snapshot()
	require.Equal(t, int32(1), writes)
	input.Scenario = "failure"
	_, failure := f.call(t, admin.RPCMethodCommandDispatch, request(CommandID, "inline", input), f.token)
	require.NotContains(t, failure, "error")
	require.Equal(t, true, failure["data"].(map[string]any)["result"].(map[string]any)["failed"])
	for scenario, code := range map[string]string{"cancel": cmdrpc.CodeCanceled, "conflict": cmdrpc.CodeConflict} {
		input.Scenario = scenario
		_, directErr := f.host.Direct(TrustedContext(t.Context()), input, nil, command.DispatchOptions{})
		require.Error(t, directErr)
		require.Equal(t, code, admin.DefaultRPCErrorMapper(t.Context(), directErr).Code)
		for _, method := range []string{admin.RPCMethodCommandDispatch, UpdateMethod} {
			var payload any = input
			if method == admin.RPCMethodCommandDispatch {
				payload = request(CommandID, "inline", input)
			}
			_, out := f.call(t, method, payload, f.token)
			require.Equal(t, code, out["error"].(map[string]any)["code"])
		}
	}
	canceled, cancel := context.WithCancel(TrustedContext(t.Context()))
	cancel()
	input.Scenario = ""
	_, err := f.host.Direct(canceled, input, nil, command.DispatchOptions{})
	require.Error(t, err)
	require.NoError(t, f.host.Register())
	_, err = f.host.Direct(TrustedContext(t.Context()), input, nil, command.DispatchOptions{})
	require.NoError(t, err)
	writes, _ = f.host.Service.Snapshot()
	require.Equal(t, int32(2), writes)
	otherWrites, _ := other.host.Service.Snapshot()
	require.Zero(t, otherWrites)
	f.host.Close()
	_, out := f.call(t, admin.RPCMethodCommandDispatch, request(CommandID, "inline", input), f.token)
	require.Equal(t, cmdrpc.CodeNotFound, out["error"].(map[string]any)["code"])
	_, err = other.host.Direct(TrustedContext(t.Context()), input, nil, command.DispatchOptions{})
	require.NoError(t, err)
}
func TestProtectedTypedWireAndLostResponse(t *testing.T) {
	f := live(t)
	cases := map[string]any{"null": nil, "false": false, "zero": float64(0), "empty": "", "array": []any{}, "object": map[string]any{}, "domain": map[string]any{"data": "business", "result": false}}
	for name, want := range cases {
		_, out := f.call(t, WireMethod, WireRequest{name}, f.token)
		value, present := out["data"]
		require.True(t, present, name)
		require.Equal(t, want, value, name)
	}
	_, absent := f.call(t, WireMethod, WireRequest{"absent"}, f.token)
	require.NotContains(t, absent, "data")
	_, status := f.call(t, WireMethod, WireRequest{"status"}, f.token)
	data := status["data"].(map[string]any)
	require.Equal(t, "jobs/status-example", data["status_reference"])
	require.NotContains(t, data, "result")
	require.Equal(t, "resource.displayName", data["validation_errors"].([]any)[0].(map[string]any)["path"])
	// Simulate a response lost only after the actual server has committed. No
	// retry/replay is attempted: the caller can classify only an unknown outcome.
	input := validInput()
	input.DryRun = false
	before, _ := f.host.Service.Snapshot()
	transport := &dropResponseTransport{base: http.DefaultTransport}
	client := &http.Client{Transport: transport, Timeout: 5 * time.Second}
	body, err := json.Marshal(map[string]any{"method": admin.RPCMethodCommandDispatch, "params": map[string]any{"data": map[string]any{"command_id": CommandID, "payload": input}}})
	require.NoError(t, err)
	req, err := http.NewRequestWithContext(t.Context(), "POST", f.url, bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+f.token)
	_, err = client.Do(req)
	require.Error(t, err)
	require.Equal(t, 1, transport.calls)
	after, _ := f.host.Service.Snapshot()
	require.Equal(t, before+1, after)
}

type dropResponseTransport struct {
	base  http.RoundTripper
	calls int
}

func (d *dropResponseTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	d.calls++
	response, err := d.base.RoundTrip(req)
	if err != nil {
		return nil, err
	}
	_, _ = io.Copy(io.Discard, response.Body)
	_ = response.Body.Close()
	return nil, io.ErrUnexpectedEOF
}

func TestProtectedTypedHostLegacyFactory(t *testing.T) {
	f := live(t)
	in := validInput()
	_, out := f.call(t, admin.RPCMethodCommandDispatch, map[string]any{"name": LegacyCommandID, "payload": in}, f.token)
	require.NotContains(t, out, "error")
	require.Equal(t, true, out["data"].(map[string]any)["result"].(map[string]any)["input"].(map[string]any)["dryRun"])
	writes, _ := f.host.Service.Snapshot()
	require.Zero(t, writes)
}

func TestProtectedTypedRejectsUnsafeEgress(t *testing.T) {
	f := live(t)
	in := validInput()
	in.Scenario = "unsafe-result"
	for _, method := range []string{admin.RPCMethodCommandDispatch, UpdateMethod} {
		var payload any = in
		if method == admin.RPCMethodCommandDispatch {
			payload = map[string]any{"command_id": CommandID, "payload": in}
		}
		_, out := f.call(t, method, payload, f.token)
		require.Equal(t, cmdrpc.CodeUnavailable, out["error"].(map[string]any)["code"])
		require.NotContains(t, out, "data")
	}
	writes, _ := f.host.Service.Snapshot()
	require.Zero(t, writes)
}

func TestProtectedTypedRepeatedWrappersDoNotMutate(t *testing.T) {
	f := live(t)
	for _, params := range []string{
		`{"data":{"command_id":"resources.update","payload":{"resourceId":"resource-a","dryRun":true},"payload":{"resourceId":"resource-a","count":2,"revision":"2"}}}`,
		`{"data":{"command_id":"resources.update","payload":{"actor_id":"forged"},"payload":{"resourceId":"resource-a","count":2,"revision":"2"}}}`,
		`{"data":{"command_id":"resources.update","payload":{"resourceId":"resource-a","dryRun":true},"PAYLOAD":{"resourceId":"resource-a","count":2,"revision":"2"}}}`,
		`{"data":{"command_id":"resources.update","payload":{"resourceId":"resource-a","dryRun":true}},"data":{"payload":{"resourceId":"resource-a","count":2,"revision":"2"}}}`,
		`{"data":{"command_id":"resources.update","payload":{"resourceId":"resource-a","dryRun":true}},"DATA":{"payload":{"resourceId":"resource-a","count":2,"revision":"2"}}}`,
	} {
		t.Run(params, func(t *testing.T) {
			body := []byte(`{"method":"admin.commands.dispatch","params":` + params + `}`)
			status, out := f.callRaw(t, body, f.token)
			require.Equal(t, http.StatusBadRequest, status)
			require.Equal(t, "RPC_INVALID_PARAMS", out["error"].(map[string]any)["code"])
			writes, seen := f.host.Service.Snapshot()
			require.Zero(t, writes)
			require.Empty(t, seen)
		})
	}
	// A subsequent normal request still decodes dryRun and uses the same service.
	_, out := f.call(t, admin.RPCMethodCommandDispatch, map[string]any{"command_id": CommandID, "payload": validInput()}, f.token)
	require.NotContains(t, out, "error")
	writes, seen := f.host.Service.Snapshot()
	require.Zero(t, writes)
	require.Len(t, seen, 1)
	require.True(t, seen[0].Input.DryRun)
}

func TestStrictReadinessLifecycle(t *testing.T) {
	h, err := New("test-ephemeral-signing-key-at-least-32-bytes")
	require.NoError(t, err)
	defer h.Close()
	require.Equal(t, admin.RPCReadinessPending, h.Admin.RPCExposureReadiness().State)
	writes, observations := h.Service.Snapshot()
	require.Zero(t, writes)
	require.Empty(t, observations)
	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	require.NoError(t, err)
	defer listener.Close()
	stop, done, err := h.Serve(listener)
	require.NoError(t, err)
	require.True(t, h.Admin.RPCExposureReadiness().Ready)
	writes, observations = h.Service.Snapshot()
	require.Zero(t, writes)
	require.Empty(t, observations)
	// Give the server one real request before shutdown so listener startup cannot
	// race the native server's shutdown initialization.
	response, err := http.Get("http://" + listener.Addr().String() + h.Admin.AdminAPIBasePath() + "/rpc/endpoints")
	require.NoError(t, err)
	response.Body.Close()
	require.Equal(t, http.StatusNotFound, response.StatusCode)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	require.NoError(t, stop(ctx))
	require.NoError(t, <-done)
}

func TestStrictReadinessRejectsClosedRegistrationBeforeServing(t *testing.T) {
	h, err := New("test-ephemeral-signing-key-at-least-32-bytes")
	require.NoError(t, err)
	defer h.Close()
	require.NoError(t, h.registration.Close())
	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	require.NoError(t, err)
	defer listener.Close()
	stop, done, err := h.Serve(listener)
	require.Error(t, err)
	require.Nil(t, stop)
	require.Nil(t, done)
	require.Equal(t, admin.RPCReadinessInvalid, h.Admin.RPCExposureReadiness().State)
	writes, observations := h.Service.Snapshot()
	require.Zero(t, writes)
	require.Empty(t, observations)
	// Restoring commands cannot bypass a rejected router startup attempt.
	require.NoError(t, h.Register())
	require.False(t, h.Admin.RPCExposureReadiness().Ready)
	_, _, again := h.Serve(listener)
	require.Same(t, err, again)
}
