package quickstart

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	cmdrpc "github.com/goliatone/go-command/rpc"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRPCTransportErrorMapper(t *testing.T) {
	for _, backend := range []string{"v2", "v3"} {
		for _, mode := range []string{"legacy", "admin", "custom", "decline"} {
			t.Run(backend+"/"+mode, func(t *testing.T) {
				resetCommandRegistryForTest(t)
				t.Cleanup(func() { resetCommandRegistryForTest(t) })
				original := admin.NewDomainError(admin.TextCodeConflict, "private-sentinel", map[string]any{"secret": "private-sentinel"})
				after, invoked, mapped := 0, 0, 0
				cfg := RPCTransportConfig{Enabled: true, AfterInvoke: func(_ router.Context, _ string, _ any, err error) {
					after++
					assert.Same(t, original, err)
				}}
				want := "RPC_INVOKE_FAILED"
				switch mode {
				case "admin":
					cfg.ErrorMapper, want = admin.DefaultRPCErrorMapper, cmdrpc.CodeConflict
				case "custom", "decline":
					cfg.ErrorMapper = func(ctx context.Context, err error) *cmdrpc.Error {
						mapped++
						assert.Same(t, original, err)
						actor, ok := auth.ActorFromContext(ctx)
						require.True(t, ok)
						assert.Equal(t, "rpc-user", actor.ActorID)
						if mode == "decline" {
							return nil
						}
						return &cmdrpc.Error{Code: "HOST_CONFLICT", Message: "Conflict.", Details: map[string]any{"field": "revision"}}
					}
					want = "HOST_CONFLICT"
					if mode == "decline" {
						want = cmdrpc.CodeConflict
					}
				}
				encoded, err := json.Marshal(cfg)
				require.NoError(t, err)
				assert.NotContains(t, string(encoded), "ErrorMapper")
				adm, _, err := NewAdmin(NewAdminConfig("/admin", "Admin", "en"), AdapterHooks{},
					WithAdminDependencies(admin.Dependencies{Authenticator: &rpcTestAuthenticator{}}), WithRPCTransport(cfg))
				require.NoError(t, err)
				require.NoError(t, adm.RPCServer().RegisterEndpoint(cmdrpc.NewEndpoint[map[string]any, map[string]any](
					cmdrpc.EndpointSpec{Method: "mapper.test", Kind: cmdrpc.MethodKindCommand},
					func(context.Context, cmdrpc.RequestEnvelope[map[string]any]) (cmdrpc.ResponseEnvelope[map[string]any], error) {
						invoked++
						return cmdrpc.ResponseEnvelope[map[string]any]{}, original
					})))
				req := httptest.NewRequest(http.MethodPost, path.Join(adm.AdminAPIBasePath(), "rpc"), strings.NewReader(`{"method":"mapper.test","params":{"data":{}}}`))
				req.Header.Set("Content-Type", "application/json")
				var resp *http.Response
				if backend == "v2" {
					server := router.NewFiberAdapter()
					require.NoError(t, adm.Initialize(server.Router()))
					resp, err = server.WrappedRouter().Test(req)
				} else {
					server := router.NewFiberV3Adapter()
					require.NoError(t, adm.Initialize(server.Router()))
					resp, err = server.WrappedRouter().Test(req)
				}
				require.NoError(t, err)
				defer closeResponseBody(t, resp)
				assert.Equal(t, http.StatusOK, resp.StatusCode)
				body, err := io.ReadAll(resp.Body)
				require.NoError(t, err)
				assert.NotContains(t, string(body), "private-sentinel")
				var out cmdrpc.ResponseEnvelope[any]
				require.NoError(t, json.Unmarshal(body, &out))
				require.NotNil(t, out.Error)
				assert.Equal(t, want, out.Error.Code)
				assert.Equal(t, 1, invoked)
				assert.Equal(t, 1, after)
				if mode == "custom" || mode == "decline" {
					assert.Equal(t, 1, mapped)
				}
				if mode == "custom" {
					assert.Equal(t, "revision", out.Error.Details["field"])
				} else if mode != "legacy" {
					assert.Empty(t, out.Error.Details)
				}
			})
		}
	}
}
