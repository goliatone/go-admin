package quickstart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"path"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	cmdrpc "github.com/goliatone/go-command/rpc"
	gerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Host-owned selection/grants/resources are synthetic; JWT signing and protected
// HTTP middleware are real go-auth. Native Group persistence is tested upstream.
type guardedHTTPIdentity struct {
	protectedAppTestIdentity
	status auth.UserStatus
}

func (i guardedHTTPIdentity) Status() auth.UserStatus { return i.status }

type guardedHTTPIdentityProvider struct {
	identities map[string]guardedHTTPIdentity
	lookupErr  error
	lookups    []string
}

func (p *guardedHTTPIdentityProvider) VerifyIdentity(context.Context, string, string) (auth.Identity, error) {
	// This fixture authenticates signed tokens, never passwords.
	return nil, auth.ErrIdentityNotFound
}

func (p *guardedHTTPIdentityProvider) FindIdentityByIdentifier(_ context.Context, identifier string) (auth.Identity, error) {
	p.lookups = append(p.lookups, identifier)
	if p.lookupErr != nil {
		return nil, p.lookupErr
	}
	identity, ok := p.identities[identifier]
	if !ok {
		return nil, auth.ErrIdentityNotFound
	}
	return identity, nil
}

type guardedHTTPPolicy struct {
	groups     map[string]string
	grants     map[string][]string
	owners     map[string]string
	operations int
}

func (p *guardedHTTPPolicy) Can(context.Context, string, string) bool { return true }
func (p *guardedHTTPPolicy) ResolvedPermissions(ctx context.Context) []string {
	actor, ok := auth.ActorFromContext(ctx)
	if !ok {
		return nil
	}
	return slices.Clone(p.grants[actor.ActorID])
}
func (p *guardedHTTPPolicy) check(ctx context.Context, msg guardedHTTPMessage) error {
	actor, ok := auth.ActorFromContext(ctx)
	if !ok || actor.ActorID == "" {
		return admin.ErrForbidden
	}
	selected := p.groups[actor.ActorID]
	if selected == "" || selected != msg.Group || p.owners[msg.Resource] != selected || !slices.Contains(p.grants[actor.ActorID], "resources.operate") {
		return admin.ErrForbidden
	}
	return nil
}
func (p *guardedHTTPPolicy) operate(ctx context.Context, msg guardedHTTPMessage) error {
	if err := p.check(ctx, msg); err != nil {
		return err
	}
	p.operations++
	return nil
}

type guardedHTTPMessage struct{ Resource, Group string }

func (guardedHTTPMessage) Type() string { return "resources.http.operate" }
func guardedHTTPPayload(payload map[string]any) guardedHTTPMessage {
	resource, resourceOK := payload["resource_id"].(string)
	group, groupOK := payload["group_id"].(string)
	if !resourceOK || !groupOK {
		return guardedHTTPMessage{}
	}
	return guardedHTTPMessage{resource, group}
}

type guardedHTTPModule struct {
	policy     *guardedHTTPPolicy
	registered bool
}

func (*guardedHTTPModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{Slug: "guarded-resources", APIRoutes: map[string]string{"guarded-resources.ping": "/ping"}}
}

func (*guardedHTTPModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: "guarded_resources"}
}
func (m *guardedHTTPModule) Register(ctx admin.ModuleContext) error {
	m.registered = true
	ctx.ProtectedRouter.Get(ctx.Routing.RoutePath(routing.SurfaceAPI, "guarded-resources.ping"), func(c router.Context) error { return c.JSON(http.StatusOK, map[string]any{"ready": true}) })
	if _, err := admin.RegisterCommand(ctx.Admin.Commands(), command.CommandFunc[guardedHTTPMessage](m.policy.operate)); err != nil {
		return err
	}
	return admin.RegisterMessageFactory(ctx.Admin.Commands(), "resources.http.operate", func(payload map[string]any, _ []string) (guardedHTTPMessage, error) {
		return guardedHTTPPayload(payload), nil
	})
}

func TestGuardedCommandAuthenticatedHTTPModule(t *testing.T) {
	for _, scenario := range []string{
		"authorized A", "authorized B", "missing token", "invalid signature",
		"deleted identity", "disabled identity", "mismatched identity", "identity provider unavailable",
		"missing dispatch permission", "missing exact permission", "cross group resource",
		"forged group", "revoked grant", "reassigned resource",
	} {
		t.Run(scenario, func(t *testing.T) {
			resetCommandRegistryForTest(t)
			t.Cleanup(func() { resetCommandRegistryForTest(t) })
			policy := &guardedHTTPPolicy{
				groups: map[string]string{"user-a": "group-a", "user-b": "group-b"},
				grants: map[string][]string{"user-a": {"admin.commands.dispatch", "resources.operate"}, "user-b": {"admin.commands.dispatch", "resources.operate"}},
				owners: map[string]string{"resource-a": "group-a", "resource-b": "group-b"},
			}
			actor, resource, group := "user-a", "resource-a", "group-a"
			if scenario == "authorized B" {
				actor, resource, group = "user-b", "resource-b", "group-b"
			}
			provider := &guardedHTTPIdentityProvider{identities: map[string]guardedHTTPIdentity{
				"user-a": {protectedAppTestIdentity: protectedAppTestIdentity{id: "user-a", role: "member"}, status: auth.UserStatusActive},
				"user-b": {protectedAppTestIdentity: protectedAppTestIdentity{id: "user-b", role: "member"}, status: auth.UserStatusActive},
			}}
			authCfg := stubAuthConfig{}
			auther := auth.NewAuthenticator(provider, authCfg)
			routeAuth, err := auth.NewHTTPAuthenticator(auther, authCfg)
			if err != nil {
				t.Fatal(err)
			}
			var authErr error
			authn := admin.NewGoAuthAuthenticator(routeAuth, authCfg, admin.WithAuthErrorHandler(func(c router.Context, err error) error {
				authErr = err
				// The host chooses API authentication failures instead of login redirects.
				return c.JSON(http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
			}))
			hookCalls := 0
			adm, _, err := NewAdmin(NewAdminConfig("/admin", "Admin", "en"), AdapterHooks{},
				WithAdminDependencies(admin.Dependencies{Authenticator: authn, Authorizer: policy}),
				WithRPCTransport(RPCTransportConfig{Enabled: true, PermissionMode: admin.RPCCommandPermissionModeExact,
					CommandRules: map[string]admin.RPCCommandRule{"resources.http.operate": {Permission: "resources.operate", Resource: "resources"}},
					Authorize: func(ctx context.Context, input admin.RPCCommandPolicyInput) error {
						hookCalls++
						return policy.check(ctx, guardedHTTPPayload(input.Payload))
					},
				}),
			)
			if err != nil {
				t.Fatal(err)
			}
			module := &guardedHTTPModule{policy: policy}
			if registerErr := adm.RegisterModule(module); registerErr != nil {
				t.Fatal(registerErr)
			}
			server := router.NewFiberAdapter()
			if initErr := adm.Initialize(server.Router()); initErr != nil {
				t.Fatal(initErr)
			}
			if !module.registered {
				t.Fatal("host module did not register during startup")
			}
			t.Cleanup(adm.Commands().Reset)
			// Mint from an existing active account, then change current provider state
			// to prove the HTTP boundary rechecks identity after JWT validation.
			token, err := auther.TokenService().Generate(provider.identities[actor], nil)
			if err != nil {
				t.Fatal(err)
			}
			allowed := scenario == "authorized A" || scenario == "authorized B"
			// go-router's RPC transport encodes invocation failures in an HTTP 200
			// error envelope. Authorization is asserted below, including zero writes.
			wantStatus := http.StatusOK
			var wantAuthErr error
			switch scenario {
			case "missing token", "invalid signature":
				wantStatus = http.StatusUnauthorized
			case "deleted identity":
				delete(provider.identities, actor)
				wantAuthErr = auth.ErrIdentityNotFound
			case "disabled identity":
				identity := provider.identities[actor]
				identity.status = auth.UserStatusDisabled
				provider.identities[actor] = identity
				wantAuthErr = auth.ErrUserDisabled
			case "mismatched identity":
				provider.identities[actor] = provider.identities["user-b"]
				wantAuthErr = auth.ErrIdentityNotFound
			case "identity provider unavailable":
				provider.lookupErr = errors.New("identity store unavailable")
				wantAuthErr = provider.lookupErr
			case "missing dispatch permission":
				policy.grants[actor] = []string{"resources.operate"}
			case "missing exact permission":
				policy.grants[actor] = []string{"admin.commands.dispatch"}
			case "cross group resource":
				resource = "resource-b"
			case "forged group":
				group = "group-b"
			case "revoked grant":
				policy.grants[actor] = nil
			case "reassigned resource":
				policy.owners[resource] = "group-b"
			}
			if wantAuthErr != nil {
				wantStatus = http.StatusUnauthorized
			}
			if scenario == "invalid signature" {
				token = token[:strings.LastIndex(token, ".")+1] + "invalid"
			}
			payload, err := json.Marshal(map[string]any{"method": admin.RPCMethodCommandDispatch, "params": map[string]any{"data": map[string]any{"name": "resources.http.operate", "payload": map[string]any{"resource_id": resource, "group_id": group}}}})
			if err != nil {
				t.Fatal(err)
			}
			req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, path.Join(adm.AdminAPIBasePath(), "rpc"), strings.NewReader(string(payload)))
			req.Header.Set("Content-Type", "application/json")
			if scenario != "missing token" {
				req.Header.Set("Authorization", "Bearer "+token)
			}
			resp, err := server.WrappedRouter().Test(req)
			if err != nil {
				t.Fatal(err)
			}
			defer closeResponseBody(t, resp)
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != wantStatus {
				t.Fatalf("status=%d want=%d auth_error=%v body=%s", resp.StatusCode, wantStatus, authErr, body)
			}
			if wantAuthErr != nil && !errors.Is(authErr, wantAuthErr) {
				t.Fatalf("auth_error=%v want=%v", authErr, wantAuthErr)
			}
			if wantStatus == http.StatusUnauthorized {
				if authErr == nil || hookCalls != 0 {
					t.Fatalf("authentication denial: auth_error=%v hook_calls=%d", authErr, hookCalls)
				}
				var envelope map[string]string
				if err := json.Unmarshal(body, &envelope); err != nil {
					t.Fatal(err)
				}
				if len(envelope) != 1 || envelope["error"] != "unauthorized" {
					t.Fatalf("expected generic authentication error, body=%s", body)
				}
			} else if authErr != nil {
				t.Fatalf("unexpected authentication failure: %v", authErr)
			}
			var wantLookups []string
			if scenario != "missing token" && scenario != "invalid signature" {
				wantLookups = []string{actor}
			}
			if !slices.Equal(provider.lookups, wantLookups) {
				t.Fatalf("identity lookups=%v want=%v", provider.lookups, wantLookups)
			}
			if resp.Header.Get("Location") != "" {
				t.Fatalf("unexpected auth redirect: %q", resp.Header.Get("Location"))
			}
			if wantStatus == http.StatusOK {
				var envelope struct {
					Error *struct {
						Code string `json:"code"`
					} `json:"error"`
					Data struct {
						Receipt struct {
							Accepted bool `json:"accepted"`
						} `json:"receipt"`
					} `json:"data"`
				}
				if err := json.Unmarshal(body, &envelope); err != nil {
					t.Fatal(err)
				}
				if allowed && (envelope.Error != nil || !envelope.Data.Receipt.Accepted) {
					t.Fatalf("expected accepted receipt, body=%s", body)
				}
				if !allowed && (envelope.Error == nil || envelope.Error.Code != "RPC_INVOKE_FAILED" || envelope.Data.Receipt.Accepted) {
					t.Fatalf("expected denial envelope, body=%s", body)
				}
			}
			wantOperations := 0
			if allowed {
				wantOperations = 1
			}
			if policy.operations != wantOperations {
				t.Fatalf("operations=%d want=%d", policy.operations, wantOperations)
			}
			if allowed && hookCalls != 1 {
				t.Fatalf("hook calls=%d", hookCalls)
			}
		})
	}
}

// These fixtures exercise public registration and real protected HTTP. The queue
// is a recording host executor: acceptance is tested, not worker delivery.
const rpcParityCommand = "resources.rpc.parity"

type rpcParityInput struct {
	Resource string `json:"resource_id"`
	Group    string `json:"group_id"`
	Scenario string `json:"scenario"`
	Actor    string `json:"actor_id,omitempty"` // Untrusted and never used for authorization.
}

func (rpcParityInput) Type() string { return rpcParityCommand }

type rpcParityResult struct {
	Value   string `json:"value"`
	Failed  bool   `json:"failed"`
	Failure error  `json:"-"`
}

func (r rpcParityResult) CommandResultFailure() error { return r.Failure }

type rpcParityObservation struct {
	Actor auth.ActorContext
	Opts  command.DispatchOptions
	IDs   []string
}

type rpcParityService struct {
	policy                    *guardedHTTPPolicy
	mu                        sync.Mutex
	attempts, effects, queued int
	seen                      rpcParityObservation
}

func (s *rpcParityService) check(ctx context.Context, msg rpcParityInput) error {
	actor, ok := auth.ActorFromContext(ctx)
	if !ok || actor == nil || actor.TenantID != "tenant-"+actor.ActorID || actor.OrganizationID != "org-"+actor.ActorID {
		return admin.ErrForbidden
	}
	return s.policy.check(ctx, guardedHTTPMessage{Resource: msg.Resource, Group: msg.Group})
}

func (s *rpcParityService) snapshot() (int, int, int, rpcParityObservation) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.attempts, s.effects, s.queued, s.seen
}

func (s *rpcParityService) Execute(ctx context.Context, msg rpcParityInput) error {
	if err := s.check(ctx, msg); err != nil {
		return err
	}
	if err := s.checkExecutionContext(ctx); err != nil {
		return err
	}
	s.mu.Lock()
	s.attempts++
	s.mu.Unlock()
	private := "private-rpc-sentinel"
	switch msg.Scenario {
	case "validation":
		return admin.NewDomainError(admin.TextCodeValidationError, private, map[string]any{"fields": map[string]string{"resource_id": private}})
	case "conflict":
		return fmt.Errorf("%s: %w", private, admin.NewDomainError(admin.TextCodeConflict, private, nil))
	case "unavailable":
		return admin.NewDomainError(admin.TextCodeServiceUnavailable, private, nil)
	case "canceled":
		canceled, cancel := context.WithCancel(ctx)
		cancel()
		return fmt.Errorf("%s: %w", private, canceled.Err())
	case "deadline":
		expired, cancel := context.WithDeadline(ctx, time.Now().Add(-time.Second))
		defer cancel()
		return fmt.Errorf("%s: %w", private, expired.Err())
	case "unexpected":
		return errors.New(private)
	case "runner-panic":
		panic(private)
	case "unknown", "unknown-wrapped":
		s.mu.Lock()
		s.effects++
		s.mu.Unlock()
		if msg.Scenario == "unknown-wrapped" {
			return gerrors.Wrap(admin.ErrNotFound, gerrors.CategoryExternal, private).WithTextCode(cmdrpc.CodeOutcomeUnknown)
		}
		return gerrors.New(private, gerrors.CategoryExternal).WithTextCode(cmdrpc.CodeOutcomeUnknown)
	case "internal-wrapped":
		return gerrors.Wrap(admin.ErrForbidden, gerrors.CategoryInternal, private).WithTextCode(cmdrpc.CodeInternal)
	}
	result := rpcParityResult{Value: "checked-" + msg.Resource}
	if msg.Scenario == "result-failure" {
		result.Failed, result.Failure = true, errors.New(private)
	} else {
		s.mu.Lock()
		s.effects++
		s.mu.Unlock()
	}
	if store := command.ResultFromContext[rpcParityResult](ctx); store != nil {
		store.Store(result)
	}
	return nil
}

type rpcParityQueue struct{ service *rpcParityService }

func (s *rpcParityService) checkExecutionContext(ctx context.Context) error {
	_, _, _, factory := s.snapshot()
	actor, ok := auth.ActorFromContext(ctx)
	if !ok || actor == nil || actor.ActorID != factory.Actor.ActorID || actor.TenantID != factory.Actor.TenantID || actor.OrganizationID != factory.Actor.OrganizationID {
		return errors.New("private-rpc-sentinel: execution identity lost")
	}
	opts, ok := command.DispatchOptionsFromContext(ctx)
	if !ok || opts.CorrelationID != factory.Opts.CorrelationID || opts.Metadata["request_id"] != factory.Opts.Metadata["request_id"] {
		return errors.New("private-rpc-sentinel: execution metadata lost")
	}
	run, ok := command.DispatchRunFromContext(ctx)
	if !ok || run.RunID == "" || run.CorrelationID != opts.CorrelationID {
		return errors.New("private-rpc-sentinel: observed dispatch context lost")
	}
	return nil
}

func (q rpcParityQueue) Execute(ctx context.Context, raw any, commandID string, opts command.DispatchOptions) (command.DispatchReceipt, error) {
	msg, ok := raw.(rpcParityInput)
	if !ok {
		return command.DispatchReceipt{}, errors.New("unexpected queue payload")
	}
	if err := q.service.check(ctx, msg); err != nil {
		return command.DispatchReceipt{}, err
	}
	if err := q.service.checkExecutionContext(ctx); err != nil {
		return command.DispatchReceipt{}, err
	}
	q.service.mu.Lock()
	q.service.queued++
	q.service.mu.Unlock()
	at := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return command.DispatchReceipt{Accepted: true, Mode: command.ExecutionModeQueued, CommandID: commandID, DispatchID: "queue-receipt", EnqueuedAt: &at, CorrelationID: opts.CorrelationID}, nil
}

func TestRPCErrorAdoptionProtectedLiveParity(t *testing.T) {
	for _, backend := range []string{"v2", "v3"} {
		for _, structured := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/structured=%t", backend, structured), func(t *testing.T) {
				resetCommandRegistryForTest(t)
				t.Cleanup(func() { resetCommandRegistryForTest(t) })
				policy := &guardedHTTPPolicy{
					groups: map[string]string{"user-a": "group-a", "user-b": "group-b", "denied": "group-a"},
					grants: map[string][]string{"user-a": {"admin.commands.dispatch", "resources.operate"}, "user-b": {"admin.commands.dispatch", "resources.operate"}},
					owners: map[string]string{"resource-a": "group-a", "resource-b": "group-b"},
				}
				service := &rpcParityService{policy: policy}
				provider := &guardedHTTPIdentityProvider{identities: map[string]guardedHTTPIdentity{}}
				for _, id := range []string{"user-a", "user-b", "denied"} {
					provider.identities[id] = guardedHTTPIdentity{protectedAppTestIdentity: protectedAppTestIdentity{id: id, role: "member"}, status: auth.UserStatusActive}
				}
				authCfg := stubAuthConfig{}
				auther := auth.NewAuthenticator(provider, authCfg)
				routeAuth, err := auth.NewHTTPAuthenticator(auther, authCfg)
				require.NoError(t, err)
				authn := admin.NewGoAuthAuthenticator(routeAuth, authCfg, admin.WithAuthErrorHandler(func(c router.Context, _ error) error {
					return c.JSON(401, map[string]string{"error": "unauthorized"})
				}))
				cfg := RPCTransportConfig{Enabled: true, PermissionMode: admin.RPCCommandPermissionModeExact,
					CommandRules: map[string]admin.RPCCommandRule{rpcParityCommand: {Permission: "resources.operate", Resource: "resources"}},
					BeforeInvoke: func(c router.Context, _ string, _ any) error {
						actor, ok := auth.ActorFromContext(c.Context())
						if !ok || actor == nil {
							return admin.ErrForbidden
						}
						// Host-owned scope resolved from the authenticated actor, never the payload.
						copy := *actor
						copy.TenantID, copy.OrganizationID = "tenant-"+actor.ActorID, "org-"+actor.ActorID
						c.SetContext(auth.WithActorContext(c.Context(), &copy))
						return nil
					},
				}
				if structured {
					cfg.ErrorMapper = admin.DefaultRPCErrorMapper
				}
				adm, _, err := NewAdmin(NewAdminConfig("/admin", "Admin", "en"), AdapterHooks{}, WithAdminDependencies(admin.Dependencies{Authenticator: authn, Authorizer: policy}), WithRPCTransport(cfg))
				require.NoError(t, err)
				bus := adm.Commands()
				require.NoError(t, bus.SetOwnedRuntimeConfig(admin.OwnedCommandRuntimeConfig{Executors: map[command.ExecutionMode]dispatcher.CommandExecutor{command.ExecutionModeQueued: rpcParityQueue{service}}}))
				set, err := bus.NewRegistrationSet("rpc-parity")
				require.NoError(t, err)
				require.NoError(t, admin.RegisterSetCommand(set, service))
				require.NoError(t, admin.RegisterSetContextMessageResultFactory[rpcParityInput, rpcParityResult](set, rpcParityCommand, func(ctx context.Context, payload map[string]any, ids []string) (rpcParityInput, error) {
					var msg rpcParityInput
					data, err := json.Marshal(payload)
					if err != nil {
						return msg, err
					}
					if err := json.Unmarshal(data, &msg); err != nil {
						return msg, err
					}
					// Authorization before queue acceptance, in addition to service authorization.
					if err := service.check(ctx, msg); err != nil {
						return msg, err
					}
					actor, _ := auth.ActorFromContext(ctx)
					opts, _ := command.DispatchOptionsFromContext(ctx)
					service.mu.Lock()
					service.seen = rpcParityObservation{Actor: *actor, Opts: opts, IDs: append([]string(nil), ids...)}
					service.mu.Unlock()
					if msg.Scenario == "panic" {
						panic("private-rpc-sentinel")
					}
					return msg, nil
				}))
				handle, err := set.Commit()
				require.NoError(t, err)
				t.Cleanup(func() { assert.NoError(t, handle.Close()) })
				type typedRequest struct {
					Input  rpcParityInput `json:"input"`
					Queued bool           `json:"queued"`
					IDs    []string       `json:"ids"`
				}
				require.NoError(t, adm.RPCServer().RegisterEndpoint(cmdrpc.NewEndpoint[typedRequest, admin.RPCCommandDispatchResponse](
					cmdrpc.EndpointSpec{Method: "resources.typed", Kind: cmdrpc.MethodKindCommand, Permissions: []string{"resources.operate"}},
					func(ctx context.Context, req cmdrpc.RequestEnvelope[typedRequest]) (cmdrpc.ResponseEnvelope[admin.RPCCommandDispatchResponse], error) {
						// Permissions on EndpointSpec are declarative; the host must enforce them.
						if !slices.Contains(policy.ResolvedPermissions(ctx), "admin.commands.dispatch") {
							return cmdrpc.ResponseEnvelope[admin.RPCCommandDispatchResponse]{}, admin.ErrForbidden
						}
						actor, _ := auth.ActorFromContext(ctx)
						opts := command.DispatchOptions{Mode: command.ExecutionModeInline, CorrelationID: req.Meta.CorrelationID, Metadata: map[string]any{
							"request_id": req.Meta.RequestID, "correlation_id": req.Meta.CorrelationID, "actor_id": actor.ActorID, "tenant_id": actor.TenantID, "organization_id": actor.OrganizationID,
						}}
						if req.Data.Queued {
							opts.Mode = command.ExecutionModeQueued
						}
						msg := req.Data.Input
						outcome, err := bus.DispatchByNameWithOutcome(ctx, rpcParityCommand, map[string]any{"resource_id": msg.Resource, "group_id": msg.Group, "scenario": msg.Scenario}, req.Data.IDs, opts)
						return cmdrpc.ResponseEnvelope[admin.RPCCommandDispatchResponse]{Data: admin.RPCCommandDispatchResponse{Receipt: outcome.Receipt, Result: outcome.Result}}, err
					})))
				var serve func(net.Listener) error
				var shutdown func(context.Context) error
				if backend == "v2" {
					a := router.NewFiberAdapter()
					require.NoError(t, adm.Initialize(a.Router()))
					a.Router().Get("/ready", func(c router.Context) error { return c.SendStatus(204) })
					serve, shutdown = a.WrappedRouter().Listener, a.WrappedRouter().ShutdownWithContext
				} else {
					a := router.NewFiberV3Adapter()
					require.NoError(t, adm.Initialize(a.Router()))
					a.Router().Get("/ready", func(c router.Context) error { return c.SendStatus(204) })
					serve = func(l net.Listener) error { return a.WrappedRouter().Listener(l) }
					shutdown = a.WrappedRouter().ShutdownWithContext
				}
				listener, err := (&net.ListenConfig{}).Listen(t.Context(), "tcp4", "127.0.0.1:0")
				require.NoError(t, err)
				done := make(chan error, 1)
				go func() { done <- serve(listener) }()
				client := &http.Client{Timeout: 3 * time.Second}
				base := "http://" + listener.Addr().String()
				t.Cleanup(func() {
					client.CloseIdleConnections()
					ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
					defer cancel()
					assert.NoError(t, shutdown(ctx))
					select {
					case err := <-done:
						assert.NoError(t, err)
					case <-time.After(4 * time.Second):
						t.Error("listener failed to stop")
					}
				})
				require.Eventually(t, func() bool {
					r, e := client.Get(base + "/ready")
					if e != nil {
						return false
					}
					_ = r.Body.Close()
					return r.StatusCode == 204
				}, 3*time.Second, 10*time.Millisecond)
				tokens := map[string]string{}
				for id, identity := range provider.identities {
					tokens[id], err = auther.TokenService().Generate(identity, nil)
					require.NoError(t, err)
				}
				cases := []struct{ name, code string }{
					{"success", ""}, {"user-b", ""}, {"success", ""}, {"result-failure", ""}, {"queued", ""},
					{"validation", cmdrpc.CodeInvalidArgument}, {"conflict", cmdrpc.CodeConflict}, {"unavailable", cmdrpc.CodeUnavailable},
					{"canceled", cmdrpc.CodeCanceled}, {"deadline", cmdrpc.CodeDeadlineExceeded}, {"unexpected", cmdrpc.CodeInternal}, {"panic", cmdrpc.CodeInternal},
					{"runner-panic", cmdrpc.CodeUnavailable}, // Runner recovery leaves no result; retain the existing missing-result failure.
					{"unknown", cmdrpc.CodeOutcomeUnknown}, {"unknown-wrapped", cmdrpc.CodeOutcomeUnknown}, {"internal-wrapped", cmdrpc.CodeInternal}, {"denied", cmdrpc.CodeForbidden}, {"cross-scope", cmdrpc.CodeForbidden}, {"queued-denied", cmdrpc.CodeForbidden},
					{"missing-token", "auth"}, {"bad-token", "auth"},
				}
				for index, tc := range cases {
					var pair []*cmdrpc.Error
					for _, style := range []string{"named", "typed"} {
						t.Run(fmt.Sprintf("%02d-%s/%s", index, tc.name, style), func(t *testing.T) {
							actor, resource, group := "user-a", "resource-a", "group-a"
							if tc.name == "user-b" {
								actor, resource, group = "user-b", "resource-b", "group-b"
							}
							if tc.name == "denied" || tc.name == "queued-denied" {
								actor = "denied"
							}
							if tc.name == "cross-scope" {
								resource = "resource-b"
							}
							queued := tc.name == "queued" || tc.name == "queued-denied"
							msg := rpcParityInput{Resource: resource, Group: group, Scenario: tc.name, Actor: "forged-owner"}
							method := admin.RPCMethodCommandDispatch
							opts := command.DispatchOptions{Mode: command.ExecutionModeInline, CorrelationID: "forged-correlation", Metadata: map[string]any{"actor_id": "forged-owner", "tenant_id": "forged-tenant", "organization_id": "forged-org", "roles": []string{"admin"}, "permissions": []string{"*"}}}
							if queued {
								opts.Mode = command.ExecutionModeQueued
							}
							var data any = admin.RPCCommandDispatchRequest{CommandID: rpcParityCommand, Payload: map[string]any{"resource_id": msg.Resource, "group_id": msg.Group, "scenario": msg.Scenario, "actor_id": msg.Actor, "tenant_id": "forged-tenant", "organization_id": "forged-org", "roles": []string{"admin"}, "permissions": []string{"*"}}, IDs: []string{"selection-1"}, Options: opts}
							if style == "typed" {
								method = "resources.typed"
								data = typedRequest{Input: msg, Queued: queued, IDs: []string{"selection-1"}}
							}
							body, err := json.Marshal(map[string]any{"method": method, "params": cmdrpc.RequestEnvelope[any]{Data: data, Meta: cmdrpc.RequestMeta{ActorID: "forged-owner", Tenant: "forged-tenant", RequestID: "envelope-request", CorrelationID: "envelope-correlation", Roles: []string{"admin"}, Permissions: []string{"*"}, Scope: map[string]any{"tenant_id": "forged-tenant"}}}})
							require.NoError(t, err)
							req, err := http.NewRequestWithContext(t.Context(), "POST", base+path.Join(adm.AdminAPIBasePath(), "rpc"), strings.NewReader(string(body)))
							require.NoError(t, err)
							req.Header.Set("Content-Type", "application/json")
							req.Header.Set("X-Request-ID", "request-"+actor)
							req.Header.Set("X-Correlation-ID", "correlation-"+actor)
							if tc.name != "missing-token" {
								token := tokens[actor]
								if tc.name == "bad-token" {
									token = "invalid"
								}
								req.Header.Set("Authorization", "Bearer "+token)
							}
							a0, e0, q0, _ := service.snapshot()
							resp, err := client.Do(req)
							require.NoError(t, err)
							raw, err := io.ReadAll(resp.Body)
							require.NoError(t, resp.Body.Close())
							require.NoError(t, err)
							assert.NotContains(t, string(raw), "private-rpc-sentinel")
							assert.NotContains(t, string(raw), "forged-")
							a1, e1, q1, seen := service.snapshot()
							if tc.code == "auth" {
								assert.Equal(t, 401, resp.StatusCode)
								assert.JSONEq(t, `{"error":"unauthorized"}`, string(raw))
								assert.Equal(t, a0, a1)
								assert.Equal(t, e0, e1)
								assert.Equal(t, q0, q1)
								return
							}
							assert.Equal(t, 200, resp.StatusCode)
							var out cmdrpc.ResponseEnvelope[admin.RPCCommandDispatchResponse]
							require.NoError(t, json.Unmarshal(raw, &out))
							pair = append(pair, out.Error)
							if tc.code != "" {
								require.NotNil(t, out.Error)
								want := tc.code
								if !structured {
									want = "RPC_INVOKE_FAILED"
								}
								assert.Equal(t, want, out.Error.Code)
								assert.False(t, out.Data.Receipt.Accepted)
							} else {
								require.Nil(t, out.Error)
								assert.True(t, out.Data.Receipt.Accepted)
								assert.Equal(t, rpcParityCommand, out.Data.Receipt.CommandID)
								assert.Equal(t, "correlation-"+actor, out.Data.Receipt.CorrelationID)
								if queued {
									assert.Equal(t, command.ExecutionModeQueued, out.Data.Receipt.Mode)
									assert.Equal(t, "queue-receipt", out.Data.Receipt.DispatchID)
									require.NotNil(t, out.Data.Receipt.EnqueuedAt)
									assert.Equal(t, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), *out.Data.Receipt.EnqueuedAt)
									assert.Nil(t, out.Data.Result)
								} else {
									assert.Equal(t, command.ExecutionModeInline, out.Data.Receipt.Mode)
									result, ok := out.Data.Result.(map[string]any)
									require.True(t, ok)
									assert.Equal(t, "checked-"+resource, result["value"])
									assert.Equal(t, tc.name == "result-failure", result["failed"])
								}
							}
							if tc.code == cmdrpc.CodeForbidden {
								assert.Equal(t, a0, a1)
								assert.Equal(t, e0, e1)
								assert.Equal(t, q0, q1)
								return
							}
							assert.Equal(t, actor, seen.Actor.ActorID)
							assert.Equal(t, "tenant-"+actor, seen.Actor.TenantID)
							assert.Equal(t, "org-"+actor, seen.Actor.OrganizationID)
							assert.Equal(t, "correlation-"+actor, seen.Opts.CorrelationID)
							assert.Equal(t, "request-"+actor, seen.Opts.Metadata["request_id"])
							assert.Equal(t, actor, seen.Opts.Metadata["actor_id"])
							assert.Equal(t, "tenant-"+actor, seen.Opts.Metadata["tenant_id"])
							assert.Equal(t, "org-"+actor, seen.Opts.Metadata["organization_id"])
							assert.NotContains(t, seen.Opts.Metadata, "roles")
							assert.NotContains(t, seen.Opts.Metadata, "permissions")
							assert.Equal(t, []string{"selection-1"}, seen.IDs)
							if queued {
								assert.Equal(t, a0, a1)
								assert.Equal(t, e0, e1)
								assert.Equal(t, q0+1, q1)
							} else {
								attempts := 1
								if tc.name == "panic" {
									attempts = 0
								}
								assert.Equal(t, a0+attempts, a1)
								assert.Equal(t, q0, q1)
								effects := 0
								if tc.name == "success" || tc.name == "user-b" || (tc.name == "unknown" || tc.name == "unknown-wrapped") {
									effects = 1
								}
								assert.Equal(t, e0+effects, e1)
							}
						})
					}
					if structured && len(pair) == 2 {
						assert.Equal(t, pair[0], pair[1], "named/typed public projection: %s", tc.name)
					}
				}
			})
		}
	}

}
