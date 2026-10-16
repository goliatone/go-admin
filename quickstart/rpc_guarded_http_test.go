package quickstart

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"path"
	"slices"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
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
