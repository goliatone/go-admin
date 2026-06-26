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

type rpcExactPermissionAuthorizer struct {
	allow       map[string]bool
	permissions []string
}

func (a rpcExactPermissionAuthorizer) Can(ctx context.Context, action string, resource string) bool {
	return rpcTestAuthorizer{allow: a.allow}.Can(ctx, action, resource)
}

func (a rpcExactPermissionAuthorizer) ResolvedPermissions(context.Context) []string {
	return append([]string(nil), a.permissions...)
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

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	result, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
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

func TestAdminRPCDispatchEndpointRoutesTranslationSuggestionCommand(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				Commands: map[string]RPCCommandRule{
					TranslationSuggestionGenerateCommandName: DefaultTranslationSuggestionRPCCommandRule(),
				},
			},
		},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.dispatch|commands":             true,
			PermAdminTranslationsSuggest + "|translations": true,
		}},
	})
	service := &stubTranslationSuggestionService{
		result: TranslationSuggestionResult{
			AssignmentID:  "tqa_rpc_1",
			FieldPath:     "title",
			SuggestedText: "Hola por RPC",
		},
	}
	if err := RegisterTranslationSuggestionCommands(adm.Commands(), service); err != nil {
		t.Fatalf("register suggestion command: %v", err)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "translator-1", Subject: "translator-1"})
	result, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{
			Name: TranslationSuggestionGenerateCommandName,
			Payload: map[string]any{
				"assignment_id": "tqa_rpc_1",
				"field_path":    "title",
			},
		},
	})
	if err != nil {
		t.Fatalf("invoke suggestion rpc dispatch: %v", err)
	}
	resp, ok := result.(cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse])
	if !ok {
		t.Fatalf("unexpected rpc response type %T", result)
	}
	suggestion, ok := resp.Data.Result.(TranslationSuggestionResult)
	if !ok {
		t.Fatalf("expected suggestion result, got %T", resp.Data.Result)
	}
	if suggestion.SuggestedText != "Hola por RPC" {
		t.Fatalf("unexpected suggestion result: %+v", suggestion)
	}
	if service.calls != 1 {
		t.Fatalf("expected one suggestion service call, got %d", service.calls)
	}
}

func TestAdminRPCDispatchEndpointRejectsTranslationSuggestionWithoutCommandRule(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.dispatch|commands":             true,
			PermAdminTranslationsSuggest + "|translations": true,
		}},
	})
	if err := RegisterTranslationSuggestionCommands(adm.Commands(), &stubTranslationSuggestionService{}); err != nil {
		t.Fatalf("register suggestion command: %v", err)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "translator-1", Subject: "translator-1"})
	_, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{
			Name: TranslationSuggestionGenerateCommandName,
			Payload: map[string]any{
				"assignment_id": "tqa_rpc_1",
				"field_path":    "title",
			},
		},
	})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound without suggestion RPC rule, got %v", err)
	}
}

func TestAdminRPCDispatchEndpointAcceptsCanonicalCommandID(t *testing.T) {
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
		return rpcDispatchTestMessage{Value: toString(payload["value"])}, nil
	}); err != nil {
		t.Fatalf("register message factory: %v", err)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	result, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{
			CommandID: "rpc.dispatch.test",
			Payload:   map[string]any{"value": "canonical"},
		},
	})
	if err != nil {
		t.Fatalf("invoke rpc dispatch: %v", err)
	}
	resp, ok := result.(cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse])
	if !ok || !resp.Data.Receipt.Accepted {
		t.Fatalf("expected accepted dispatch response, got %#v", result)
	}
	if seenValue != "canonical" {
		t.Fatalf("expected canonical command payload, got %q", seenValue)
	}
}

func TestAdminRPCDispatchEndpointReturnsInlineResult(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.result": {Permission: "admin.commands.dispatch"},
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
	if _, err := RegisterCommand(bus, command.CommandFunc[rpcDispatchTestMessage](func(ctx context.Context, msg rpcDispatchTestMessage) error {
		if result := command.ResultFromContext[map[string]any](ctx); result != nil {
			result.Store(map[string]any{"value": msg.Value + "-result"})
		}
		return nil
	})); err != nil {
		t.Fatalf("register command: %v", err)
	}
	if err := RegisterMessageResultFactory[rpcDispatchTestMessage, map[string]any](bus, "rpc.dispatch.result", func(payload map[string]any, ids []string) (rpcDispatchTestMessage, error) {
		_ = ids
		return rpcDispatchTestMessage{Value: toString(payload["value"])}, nil
	}); err != nil {
		t.Fatalf("register message result factory: %v", err)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	result, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{
			Name:    "rpc.dispatch.result",
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
	payload, ok := resp.Data.Result.(map[string]any)
	if !ok {
		t.Fatalf("expected result payload, got %T", resp.Data.Result)
	}
	if payload["value"] != "ok-result" {
		t.Fatalf("expected ok-result, got %#v", payload["value"])
	}
}

func TestAdminRPCDispatchEndpointAcceptsAuthenticatedRequestMarkerWithoutActorContext(t *testing.T) {
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
	if _, err := RegisterCommand(bus, command.CommandFunc[rpcDispatchTestMessage](func(_ context.Context, msg rpcDispatchTestMessage) error {
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

	result, err := adm.RPCServer().Invoke(WithAuthenticatedRequest(context.Background()), RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{
			Name:    "rpc.dispatch.test",
			Payload: map[string]any{"value": "ok"},
		},
	})
	if err != nil {
		t.Fatalf("invoke rpc dispatch: %v", err)
	}
	resp, ok := result.(cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse])
	if !ok || !resp.Data.Receipt.Accepted {
		t.Fatalf("expected accepted dispatch response, got %#v", result)
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
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	_, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{Name: "rpc.dispatch.test"},
	})
	var denied PermissionDeniedError
	if !errors.As(err, &denied) {
		t.Fatalf("expected PermissionDeniedError, got %T (%v)", err, err)
	}
}

func TestAdminRPCDispatchEndpointRequiresDispatchPermission(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.test": {Permission: "admin.operations.search.read", Resource: "search"},
				},
			},
		},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.operations.search.read|search": true,
		}},
	})
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	_, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{Name: "rpc.dispatch.test"},
	})
	var denied PermissionDeniedError
	if !errors.As(err, &denied) {
		t.Fatalf("expected dispatch PermissionDeniedError, got %T (%v)", err, err)
	}
}

func TestAdminRPCDispatchEndpointExactPermissionModeIgnoresResourceRoleAllow(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.test": {
						Permission:     "admin.operations.search.manage",
						Resource:       "search",
						PermissionMode: RPCCommandPermissionModeExact,
					},
				},
			},
		},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcExactPermissionAuthorizer{
			allow: map[string]bool{
				"admin.commands.dispatch|commands":      true,
				"admin.operations.search.manage|search": true,
			},
			permissions: []string{"admin.commands.dispatch"},
		},
	})
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	_, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{Name: "rpc.dispatch.test"},
	})
	var denied PermissionDeniedError
	if !errors.As(err, &denied) {
		t.Fatalf("expected exact permission denial, got %T (%v)", err, err)
	}
}

func TestAdminRPCDispatchEndpointGlobalExactPermissionModeAppliesToRules(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				PermissionMode: RPCCommandPermissionModeExact,
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.test": {
						Permission: "admin.operations.search.manage",
						Resource:   "search",
					},
				},
			},
		},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcExactPermissionAuthorizer{
			allow: map[string]bool{
				"admin.commands.dispatch|commands":      true,
				"admin.operations.search.manage|search": true,
			},
			permissions: []string{"admin.commands.dispatch"},
		},
	})
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	_, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{Name: "rpc.dispatch.test"},
	})
	var denied PermissionDeniedError
	if !errors.As(err, &denied) {
		t.Fatalf("expected inherited exact permission denial, got %T (%v)", err, err)
	}
}

func TestAdminRPCDispatchEndpointExactPermissionModeAllowsResolvedPermission(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.test": {
						Permission:     "admin.operations.search.manage",
						Resource:       "search",
						PermissionMode: RPCCommandPermissionModeExact,
					},
				},
			},
		},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcExactPermissionAuthorizer{
			allow: map[string]bool{
				"admin.commands.dispatch|commands": true,
			},
			permissions: []string{"admin.operations.search.manage"},
		},
	})
	bus := adm.Commands()
	if bus == nil {
		t.Fatalf("expected command bus")
	}
	dispatched := false
	if _, err := RegisterCommand(bus, command.CommandFunc[rpcDispatchTestMessage](func(_ context.Context, msg rpcDispatchTestMessage) error {
		dispatched = true
		return nil
	})); err != nil {
		t.Fatalf("register command: %v", err)
	}
	if err := RegisterMessageFactory(bus, "rpc.dispatch.test", func(payload map[string]any, ids []string) (rpcDispatchTestMessage, error) {
		_ = payload
		_ = ids
		return rpcDispatchTestMessage{}, nil
	}); err != nil {
		t.Fatalf("register message factory: %v", err)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	result, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{Name: "rpc.dispatch.test"},
	})
	if err != nil {
		t.Fatalf("invoke exact rpc dispatch: %v", err)
	}
	resp, ok := result.(cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse])
	if !ok || !resp.Data.Receipt.Accepted {
		t.Fatalf("expected accepted dispatch response, got %#v", result)
	}
	if !dispatched {
		t.Fatalf("expected command dispatch")
	}
}

func TestAuthorizeRPCPermissionExactModeHonorsAdminWildcardGrant(t *testing.T) {
	authorizer := rpcExactPermissionAuthorizer{permissions: []string{"admin.*"}}
	if err := authorizeRPCPermissionWithMode(context.Background(), authorizer, "admin.operations.search.manage", "search", RPCCommandPermissionModeExact); err != nil {
		t.Fatalf("expected admin wildcard to allow exact RPC permission: %v", err)
	}
	if err := authorizeRPCPermissionWithMode(context.Background(), authorizer, "reports.operations.search.manage", "search", RPCCommandPermissionModeExact); err == nil {
		t.Fatalf("expected admin wildcard to deny non-admin exact RPC permission")
	}
}

func TestAdminRPCCommandListExactPermissionModeRequiresReadGrant(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				DiscoveryEnabled: true,
				PermissionMode:   RPCCommandPermissionModeExact,
			},
		},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcExactPermissionAuthorizer{
			allow: map[string]bool{
				"admin.commands.read|commands": true,
			},
			permissions: []string{"admin.commands.dispatch"},
		},
	})
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	_, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandList, &cmdrpc.RequestEnvelope[map[string]any]{})
	var denied PermissionDeniedError
	if !errors.As(err, &denied) {
		t.Fatalf("expected exact discovery permission denial, got %T (%v)", err, err)
	}
}

func TestAdminRPCDispatchEndpointRejectsUnauthenticatedRequestWhenRuleRequiresAuth(t *testing.T) {
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
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.dispatch|commands": true,
		}},
	})
	_, err := adm.RPCServer().Invoke(context.Background(), RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{Name: "rpc.dispatch.test"},
	})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %T (%v)", err, err)
	}
}

func TestAdminRPCDispatchEndpointAllowsExplicitUnauthenticatedRuleWithoutActor(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{
			RPC: RPCCommandConfig{
				Commands: map[string]RPCCommandRule{
					"rpc.dispatch.test": {AllowUnauthenticated: true},
				},
			},
		},
	}, Dependencies{
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
			Payload: map[string]any{"value": "anon"},
		},
	})
	if err != nil {
		t.Fatalf("invoke rpc dispatch: %v", err)
	}
	resp, ok := result.(cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse])
	if !ok || !resp.Data.Receipt.Accepted {
		t.Fatalf("expected accepted dispatch response, got %#v", result)
	}
	if seenValue != "anon" {
		t.Fatalf("expected anonymous dispatch payload, got %q", seenValue)
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
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	_, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{
		Data: RPCCommandDispatchRequest{Name: "rpc.dispatch.test"},
	})
	if !errors.Is(err, hookErr) {
		t.Fatalf("expected hook error, got %v", err)
	}
}

func TestAdminRPCDispatchEndpointSanitizesUntrustedMetadata(t *testing.T) {
	var captured command.DispatchOptions
	var capturedPayload map[string]any
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
	bus.dispatchers["rpc.meta.test"] = func(_ context.Context, payload map[string]any, _ []string, opts command.DispatchOptions) (command.DispatchReceipt, error) {
		capturedPayload = copyRPCMap(payload)
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
			Payload: map[string]any{
				"actor_id":        "spoofed-payload",
				"actorId":         "spoofed-payload-camel",
				"user_id":         "spoofed-user",
				"userId":          "spoofed-user-camel",
				"tenant_id":       "tenant-payload",
				"tenantId":        "tenant-payload-camel",
				"org_id":          "org-payload",
				"orgId":           "org-payload-camel",
				"organization_id": "org-payload-alt",
				"organizationId":  "org-payload-alt-camel",
			},
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
	if capturedPayload["actor_id"] != "actor-context" {
		t.Fatalf("expected trusted actor_id payload, got %v", capturedPayload["actor_id"])
	}
	if capturedPayload["user_id"] != "actor-context" {
		t.Fatalf("expected trusted user_id payload, got %v", capturedPayload["user_id"])
	}
	if capturedPayload["tenant_id"] != "tenant-context" {
		t.Fatalf("expected trusted tenant_id payload, got %v", capturedPayload["tenant_id"])
	}
	if capturedPayload["org_id"] != "org-context" {
		t.Fatalf("expected trusted org_id payload, got %v", capturedPayload["org_id"])
	}
	if capturedPayload["organization_id"] != "org-context" {
		t.Fatalf("expected trusted organization_id payload, got %v", capturedPayload["organization_id"])
	}
	if _, ok := capturedPayload["actorId"]; ok {
		t.Fatalf("expected camelCase actorId payload key to be removed")
	}
	if _, ok := capturedPayload["userId"]; ok {
		t.Fatalf("expected camelCase userId payload key to be removed")
	}
	if _, ok := capturedPayload["tenantId"]; ok {
		t.Fatalf("expected camelCase tenantId payload key to be removed")
	}
	if _, ok := capturedPayload["orgId"]; ok {
		t.Fatalf("expected camelCase orgId payload key to be removed")
	}
	if _, ok := capturedPayload["organizationId"]; ok {
		t.Fatalf("expected camelCase organizationId payload key to be removed")
	}
}

func TestAdminRPCListEndpointHiddenByDefault(t *testing.T) {
	adm := mustNewAdmin(t, Config{}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
	})
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	_, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandList, &cmdrpc.RequestEnvelope[map[string]any]{})
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
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	_, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandList, &cmdrpc.RequestEnvelope[map[string]any]{})
	var denied PermissionDeniedError
	if !errors.As(err, &denied) {
		t.Fatalf("expected PermissionDeniedError, got %T (%v)", err, err)
	}
}

func TestAdminRPCListEndpointRequiresActorWhenEnabled(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{RPC: RPCCommandConfig{DiscoveryEnabled: true}},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands": true,
		}},
	})
	_, err := adm.RPCServer().Invoke(context.Background(), RPCMethodCommandList, &cmdrpc.RequestEnvelope[map[string]any]{})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %T (%v)", err, err)
	}
}

func TestAdminRPCListEndpointAcceptsAuthenticatedRequestMarkerWhenEnabled(t *testing.T) {
	adm := mustNewAdmin(t, Config{
		Commands: CommandConfig{RPC: RPCCommandConfig{DiscoveryEnabled: true}},
	}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCommands),
		Authorizer: rpcTestAuthorizer{allow: map[string]bool{
			"admin.commands.read|commands": true,
		}},
	})
	result, err := adm.RPCServer().Invoke(WithAuthenticatedRequest(context.Background()), RPCMethodCommandList, &cmdrpc.RequestEnvelope[map[string]any]{})
	if err != nil {
		t.Fatalf("invoke rpc list: %v", err)
	}
	resp, ok := result.(cmdrpc.ResponseEnvelope[RPCCommandListResponse])
	if !ok {
		t.Fatalf("unexpected rpc response type %T", result)
	}
	if len(resp.Data.Commands) == 0 {
		t.Fatalf("expected command list response, got %#v", resp.Data)
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
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "rpc-user", Subject: "rpc-user"})
	result, err := adm.RPCServer().Invoke(ctx, RPCMethodCommandList, &cmdrpc.RequestEnvelope[map[string]any]{})
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
