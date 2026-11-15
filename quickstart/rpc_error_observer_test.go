package quickstart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-router/rpcfiber"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type rpcDiagnosticModeKey struct{}

// Stateless so concurrent requests cannot share an actor or authenticator counter.
type rpcDiagnosticAuthenticator struct{}

func (rpcDiagnosticAuthenticator) Wrap(c router.Context) error {
	c.SetContext(auth.WithActorContext(context.WithValue(c.Context(), rpcDiagnosticModeKey{}, c.Header("X-Test-Mode")), &auth.ActorContext{
		ActorID: c.Header("X-Test-Actor"), TenantID: "trusted-tenant",
	}))
	return nil
}
func (a rpcDiagnosticAuthenticator) WrapHandler(next router.HandlerFunc) router.HandlerFunc {
	return func(c router.Context) error {
		if c.Header("Authorization") != "Bearer test" {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		}
		if err := a.Wrap(c); err != nil {
			return err
		}
		return next(c)
	}
}

type rpcDiagnosticSnapshot struct {
	Before, Invoke, After, Mapped int
	Stages                        []rpcfiber.FailureStage
	Causes                        []string
	Actor                         string
}

// QH04 uses actual quickstart constructors, with both native Test and managed
// sockets. Parallel requests mix successful, denied and failing boundaries on
// the same mount. Only owned values are retained, never pooled router contexts.
func TestRPCTransportErrorObserverHosting(t *testing.T) {
	for _, major := range []string{"v2", "v3"} {
		for _, socket := range []bool{false, true} {
			for _, observe := range []bool{false, true} {
				t.Run(fmt.Sprintf("%s/socket=%t/observer=%t", major, socket, observe), func(t *testing.T) {
					resetCommandRegistryForTest(t)
					t.Cleanup(func() { resetCommandRegistryForTest(t) })
					p := hostingProbeFor(t, major, false)
					var mu sync.Mutex
					records := map[string]*rpcDiagnosticSnapshot{}
					ingress := map[string][]router.IngressEvent{}
					record := func(ctx context.Context, update func(*rpcDiagnosticSnapshot)) {
						id, ok := router.IngressRequestIDFromContext(ctx)
						assert.True(t, ok)
						actor, ok := auth.ActorFromContext(ctx)
						assert.True(t, ok)
						if actor == nil {
							return
						}
						mu.Lock()
						defer mu.Unlock()
						if records[id] == nil {
							records[id] = &rpcDiagnosticSnapshot{Actor: strings.Clone(actor.ActorID)}
						}
						assert.Equal(t, records[id].Actor, actor.ActorID)
						update(records[id])
					}
					private := func(ctx context.Context) error {
						actor, _ := auth.ActorFromContext(ctx)
						return errors.New("private-diagnostic-" + actor.ActorID)
					}
					mode := func(ctx context.Context) string { s, _ := ctx.Value(rpcDiagnosticModeKey{}).(string); return s }
					require.NoError(t, p.host.ConfigureBoundedIngress(router.BoundedIngressOptions{
						Observer: func(_ router.IngressCancellation, e router.IngressEvent) error {
							mu.Lock()
							defer mu.Unlock()
							ingress[e.RequestID] = append(ingress[e.RequestID], e)
							return nil
						},
					}))
					cfg := RPCTransportConfig{Enabled: true, DiscoveryEnabled: observe,
						MetaExtractor: func(c router.Context, m *cmdrpc.RequestMeta) {
							if mode(c.Context()) == "metadata_panic" {
								panic(private(c.Context()))
							}
							actor, _ := auth.ActorFromContext(c.Context())
							m.ActorID, m.Tenant = actor.ActorID, actor.TenantID
							m.RequestID, _ = router.IngressRequestIDFromContext(c.Context())
							m.CorrelationID = m.RequestID
						},
						BeforeInvoke: func(c router.Context, _ string, _ any) error {
							record(c.Context(), func(r *rpcDiagnosticSnapshot) { r.Before++ })
							switch mode(c.Context()) {
							case "before_error":
								return private(c.Context())
							case "before_panic":
								panic(private(c.Context()))
							}
							return nil
						},
						AfterInvoke: func(c router.Context, _ string, _ any, err error) {
							record(c.Context(), func(r *rpcDiagnosticSnapshot) { r.After++ })
							if mode(c.Context()) == "after_panic" {
								panic(private(c.Context()))
							}
							if mode(c.Context()) == "error" {
								assert.EqualError(t, err, private(c.Context()).Error())
							}
						},
						ErrorMapper: func(ctx context.Context, err error) *cmdrpc.Error {
							record(ctx, func(r *rpcDiagnosticSnapshot) { r.Mapped++ })
							assert.ErrorContains(t, err, private(ctx).Error())
							switch mode(ctx) {
							case "mapper_panic":
								panic(private(ctx))
							case "mapper_invalid":
								return &cmdrpc.Error{Code: "SAFE", Message: "Safe.", Details: map[string]any{"invalid": make(chan int)}}
							}
							return &cmdrpc.Error{Code: "HOST_REJECTED", Message: "Request rejected."}
						},
					}
					if observe {
						cfg.ErrorObserver = func(c router.Context, e rpcfiber.FailureEvent) {
							record(c.Context(), func(r *rpcDiagnosticSnapshot) {
								r.Stages = append(r.Stages, e.Stage)
								cause := ""
								if e.Err != nil {
									cause = e.Err.Error()
								}
								if e.Panic != nil {
									cause = fmt.Sprint(e.Panic)
								}
								r.Causes = append(r.Causes, cause)
								if e.Stage != rpcfiber.FailureStageParse && e.Stage != rpcfiber.FailureStageResolve {
									assert.Equal(t, "diagnostic.test", e.Method)
								}
							})
							if mode(c.Context()) == "observer_panic" {
								panic(private(c.Context()))
							}
						}
					}
					encoded, err := json.Marshal(cfg)
					require.NoError(t, err)
					assert.NotContains(t, string(encoded), "ErrorObserver")
					assert.NotContains(t, string(encoded), "ErrorMapper")
					adm, _, err := NewAdmin(NewAdminConfig("/admin", "Admin", "en"), AdapterHooks{}, WithMinimalFeatures(),
						WithAdminDependencies(admin.Dependencies{Authenticator: rpcDiagnosticAuthenticator{}, Authorizer: allowAllQuickstartAuthorizer{}}), WithRPCTransport(cfg))
					require.NoError(t, err)
					require.NoError(t, adm.RPCServer().RegisterEndpoint(cmdrpc.NewEndpoint[map[string]any, map[string]any](
						cmdrpc.EndpointSpec{Method: "diagnostic.test", Kind: cmdrpc.MethodKindCommand},
						func(ctx context.Context, req cmdrpc.RequestEnvelope[map[string]any]) (cmdrpc.ResponseEnvelope[map[string]any], error) {
							record(ctx, func(r *rpcDiagnosticSnapshot) { r.Invoke++ })
							actor, _ := auth.ActorFromContext(ctx)
							id, _ := router.IngressRequestIDFromContext(ctx)
							assert.Equal(t, actor.ActorID, req.Meta.ActorID)
							assert.Equal(t, actor.TenantID, req.Meta.Tenant)
							assert.Equal(t, id, req.Meta.RequestID)
							assert.Equal(t, id, req.Meta.CorrelationID)
							switch mode(ctx) {
							case "invoke_panic":
								panic(private(ctx))
							case "error", "mapper_panic", "mapper_invalid", "observer_panic":
								return cmdrpc.ResponseEnvelope[map[string]any]{}, private(ctx)
							}
							return cmdrpc.ResponseEnvelope[map[string]any]{Data: map[string]any{"actor": actor.ActorID, "id": id}}, nil
						})))
					require.NoError(t, p.mount(adm))
					base := "http://quickstart.test"
					request := p.request
					if socket {
						run := hostingStart(t, p, router.ManagedOptions{})
						base = "http://" + run.Address()
						transport := http.DefaultTransport.(*http.Transport).Clone()
						t.Cleanup(transport.CloseIdleConnections)
						client := &http.Client{Transport: transport, Timeout: 4 * time.Second}
						request = client.Do
					}
					cases := []struct {
						name, code                            string
						status, before, invoke, after, mapped int
						stages                                []rpcfiber.FailureStage
					}{
						{name: "success", status: 200, before: 1, invoke: 1, after: 1},
						{name: "error", status: 200, code: "HOST_REJECTED", before: 1, invoke: 1, after: 1, mapped: 1, stages: []rpcfiber.FailureStage{rpcfiber.FailureStageInvoke}},
						{name: "invoke_panic", status: 200, code: "HOST_REJECTED", before: 1, invoke: 1, after: 1, mapped: 1, stages: []rpcfiber.FailureStage{rpcfiber.FailureStageInvoke}},
						{name: "before_error", status: 400, code: "HOST_REJECTED", before: 1, mapped: 1, stages: []rpcfiber.FailureStage{rpcfiber.FailureStageBeforeInvoke}},
						{name: "before_panic", status: 400, code: cmdrpc.CodeInternal, before: 1, stages: []rpcfiber.FailureStage{rpcfiber.FailureStageBeforeInvoke}},
						{name: "metadata_panic", status: 400, code: cmdrpc.CodeInternal, stages: []rpcfiber.FailureStage{rpcfiber.FailureStageMetadata}},
						{name: "after_panic", status: 200, before: 1, invoke: 1, after: 1, stages: []rpcfiber.FailureStage{rpcfiber.FailureStageAfterInvoke}},
						{name: "mapper_panic", status: 200, code: cmdrpc.CodeInternal, before: 1, invoke: 1, after: 1, mapped: 1, stages: []rpcfiber.FailureStage{rpcfiber.FailureStageInvoke, rpcfiber.FailureStageMapping}},
						{name: "mapper_invalid", status: 200, code: cmdrpc.CodeInternal, before: 1, invoke: 1, after: 1, mapped: 1, stages: []rpcfiber.FailureStage{rpcfiber.FailureStageInvoke, rpcfiber.FailureStageMapping}},
						{name: "observer_panic", status: 200, code: "HOST_REJECTED", before: 1, invoke: 1, after: 1, mapped: 1, stages: []rpcfiber.FailureStage{rpcfiber.FailureStageInvoke}},
						{name: "parse", status: 400, code: "RPC_INVALID_REQUEST", stages: []rpcfiber.FailureStage{rpcfiber.FailureStageParse}},
						{name: "decode", status: 400, code: "RPC_INVALID_PARAMS", stages: []rpcfiber.FailureStage{rpcfiber.FailureStageDecode}},
						{name: "missing", status: 404, code: "RPC_METHOD_NOT_FOUND", stages: []rpcfiber.FailureStage{rpcfiber.FailureStageResolve}},
						{name: "auth_denied", status: 401},
						{name: "discovery", status: 200},
						{name: "discovery_denied", status: 401},
					}
					for _, tc := range cases {
						t.Run(tc.name, func(t *testing.T) {
							t.Parallel()
							body := `{"method":"diagnostic.test","params":{"data":{},"meta":{"actorId":"forged","tenant":"forged","requestId":"forged","correlationId":"forged"}}}`
							method, url := http.MethodPost, base+adm.AdminAPIBasePath()+"/rpc"
							switch tc.name {
							case "parse":
								body = "{"
							case "decode":
								body = `{"method":"diagnostic.test","params":{"data":42}}`
							case "missing":
								body = `{"method":"missing.test","params":{}}`
							case "discovery", "discovery_denied":
								method, url = http.MethodGet, url+"/endpoints"
							}
							req := httptest.NewRequest(method, url, strings.NewReader(body))
							req.RequestURI = ""
							req.Header.Set("Content-Type", "application/json")
							req.Header.Set("X-Test-Mode", tc.name)
							req.Header.Set("X-Test-Actor", tc.name)
							req.Header.Set("X-Request-ID", "forged")
							req.Header.Set("X-Correlation-ID", "forged")
							if tc.name != "auth_denied" && tc.name != "discovery_denied" {
								req.Header.Set("Authorization", "Bearer test")
							}
							resp, err := request(req)
							require.NoError(t, err)
							defer closeResponseBody(t, resp)
							raw, err := io.ReadAll(resp.Body)
							require.NoError(t, err)
							status := tc.status
							if strings.HasPrefix(tc.name, "discovery") && !observe {
								status = 404
							}
							assert.Equal(t, status, resp.StatusCode, string(raw))
							assert.NotContains(t, string(raw), "private-diagnostic-")
							assert.NotContains(t, fmt.Sprint(resp.Header), "private-diagnostic-")
							require.Less(t, len(raw), 32*1024)
							id := resp.Header.Get("X-Request-ID")
							require.NotEmpty(t, id)
							assert.NotEqual(t, "forged", id)
							assert.Equal(t, id, resp.Header.Get("X-Observed-ID"))
							// A single valid JSON value also rules out an appended fallback response.
							if status != 404 || tc.name == "missing" {
								var out map[string]any
								require.NoError(t, json.Unmarshal(raw, &out))
								if tc.code != "" {
									public, ok := out["error"].(map[string]any)
									require.True(t, ok, string(raw))
									assert.Equal(t, tc.code, public["code"])
								} else if tc.name == "success" || tc.name == "after_panic" {
									data, ok := out["data"].(map[string]any)
									require.True(t, ok, string(raw))
									assert.Equal(t, tc.name, data["actor"])
									assert.Equal(t, id, data["id"])
								} else if tc.name == "discovery" && observe {
									assert.Contains(t, string(raw), "diagnostic.test")
								}
							}
							require.Eventually(t, func() bool { mu.Lock(); defer mu.Unlock(); return len(ingress[id]) > 0 }, time.Second, time.Millisecond)
							mu.Lock()
							defer mu.Unlock()
							require.Len(t, ingress[id], 1)
							assert.EqualValues(t, 1, ingress[id][0].Dispatches)
							safe, err := json.Marshal(ingress[id])
							require.NoError(t, err)
							assert.NotContains(t, string(safe), "private-diagnostic-")
							got := records[id]
							if got == nil {
								got = &rpcDiagnosticSnapshot{}
							}
							assert.Equal(t, tc.before, got.Before)
							assert.Equal(t, tc.invoke, got.Invoke)
							assert.Equal(t, tc.after, got.After)
							assert.Equal(t, tc.mapped, got.Mapped)
							if observe {
								assert.Equal(t, tc.stages, got.Stages)
								for i, stage := range got.Stages {
									if stage != rpcfiber.FailureStageParse && stage != rpcfiber.FailureStageResolve && stage != rpcfiber.FailureStageDecode && !(stage == rpcfiber.FailureStageMapping && tc.name == "mapper_invalid") {
										if tc.name == "invoke_panic" {
											assert.Equal(t, `rpc invoke panic for method "diagnostic.test": private-diagnostic-invoke_panic`, got.Causes[i])
										} else {
											assert.Equal(t, "private-diagnostic-"+tc.name, got.Causes[i])
										}
									}
								}
							} else {
								assert.Empty(t, got.Stages)
							}
							if records[id] != nil {
								assert.Equal(t, tc.name, got.Actor)
							}
						})
					}
				})
			}
		}
	}
}

func TestRPCTransportErrorObserverCommandPolicy(t *testing.T) {
	for _, major := range []string{"v2", "v3"} {
		for _, socket := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/socket=%t", major, socket), func(t *testing.T) {
				resetCommandRegistryForTest(t)
				t.Cleanup(func() { resetCommandRegistryForTest(t) })
				var invoked, authorized, observed atomic.Int32
				adm, _, err := NewAdmin(NewAdminConfig("/admin", "Admin", "en"), AdapterHooks{}, WithMinimalFeatures(),
					WithAdminDependencies(admin.Dependencies{Authenticator: rpcDiagnosticAuthenticator{}, Authorizer: allowAllQuickstartAuthorizer{}}),
					WithRPCTransport(RPCTransportConfig{Enabled: true,
						CommandRules: map[string]admin.RPCCommandRule{"rpc.transport.test": {Permission: "admin.rpc.custom"}},
						Authorize: func(ctx context.Context, input admin.RPCCommandPolicyInput) error {
							authorized.Add(1)
							assert.Equal(t, "rpc.transport.test", input.CommandName)
							actor, _ := auth.ActorFromContext(ctx)
							if actor.ActorID == "denied" {
								return admin.NewDomainError(admin.TextCodeForbidden, "private-policy-denial", nil)
							}
							return nil
						},
						ErrorMapper: admin.DefaultRPCErrorMapper,
						ErrorObserver: func(c router.Context, event rpcfiber.FailureEvent) {
							observed.Add(1)
							assert.Equal(t, rpcfiber.FailureStageInvoke, event.Stage)
							assert.Equal(t, admin.RPCMethodCommandDispatch, event.Method)
							assert.ErrorContains(t, event.Err, "FORBIDDEN")
							actor, _ := auth.ActorFromContext(c.Context())
							assert.Equal(t, "denied", actor.ActorID)
						},
					}))
				require.NoError(t, err)
				_, err = admin.RegisterCommand(adm.Commands(), command.CommandFunc[quickstartRPCDispatchMessage](func(context.Context, quickstartRPCDispatchMessage) error { invoked.Add(1); return nil }))
				require.NoError(t, err)
				require.NoError(t, admin.RegisterMessageFactory(adm.Commands(), "rpc.transport.test", func(map[string]any, []string) (quickstartRPCDispatchMessage, error) {
					return quickstartRPCDispatchMessage{}, nil
				}))
				p := hostingProbeFor(t, major, false)
				require.NoError(t, p.mount(adm))
				base := "http://quickstart.test"
				request := p.request
				if socket {
					run := hostingStart(t, p, router.ManagedOptions{})
					base = "http://" + run.Address()
					transport := http.DefaultTransport.(*http.Transport).Clone()
					t.Cleanup(transport.CloseIdleConnections)
					request = (&http.Client{Transport: transport, Timeout: 4 * time.Second}).Do
				}
				for _, actor := range []string{"allowed", "denied"} {
					t.Run(actor, func(t *testing.T) {
						payload, err := json.Marshal(map[string]any{"method": admin.RPCMethodCommandDispatch, "params": map[string]any{"data": map[string]any{"name": "rpc.transport.test"}}})
						require.NoError(t, err)
						req := httptest.NewRequest(http.MethodPost, base+adm.AdminAPIBasePath()+"/rpc", strings.NewReader(string(payload)))
						req.RequestURI = ""
						req.Header.Set("Authorization", "Bearer test")
						req.Header.Set("X-Test-Actor", actor)
						req.Header.Set("Content-Type", "application/json")
						resp, err := request(req)
						require.NoError(t, err)
						defer closeResponseBody(t, resp)
						body, err := io.ReadAll(resp.Body)
						require.NoError(t, err)
						assert.Equal(t, 200, resp.StatusCode)
						assert.NotContains(t, string(body), "private-policy-denial")
						var out cmdrpc.ResponseEnvelope[admin.RPCCommandDispatchResponse]
						require.NoError(t, json.Unmarshal(body, &out))
						if actor == "allowed" {
							require.Nil(t, out.Error)
							assert.True(t, out.Data.Receipt.Accepted)
						} else {
							require.NotNil(t, out.Error)
							assert.Equal(t, cmdrpc.CodeForbidden, out.Error.Code)
						}
					})
				}
				assert.EqualValues(t, 1, invoked.Load())
				assert.EqualValues(t, 2, authorized.Load())
				assert.EqualValues(t, 1, observed.Load())
			})
		}
	}
}
