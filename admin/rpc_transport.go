package admin

import (
	"context"
	"strings"

	"github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
)

const (
	// RPCMethodCommandDispatch dispatches a named command through the admin command bus.
	RPCMethodCommandDispatch = "admin.commands.dispatch"
	// RPCMethodCommandList returns registered command names available for dispatch.
	RPCMethodCommandList = "admin.commands.list"
)

// RPCCommandDispatchRequest describes the generic command-dispatch RPC payload.
type RPCCommandDispatchRequest struct {
	Name    string                  `json:"name"`
	Payload map[string]any          `json:"payload,omitempty"`
	IDs     []string                `json:"ids,omitempty"`
	Options command.DispatchOptions `json:"options,omitempty"`
}

// RPCCommandDispatchResponse returns command dispatch receipt metadata.
type RPCCommandDispatchResponse struct {
	Receipt command.DispatchReceipt `json:"receipt"`
}

// RPCCommandListResponse describes available command names.
type RPCCommandListResponse struct {
	Commands []string `json:"commands,omitempty"`
}

func newRPCServer(server *cmdrpc.Server) *cmdrpc.Server {
	if server != nil {
		return server
	}
	return cmdrpc.NewServer(cmdrpc.WithFailureMode(cmdrpc.FailureModeRecover))
}

func registerCoreRPCEndpoints(server *cmdrpc.Server, bus *CommandBus) error {
	if server == nil {
		return nil
	}
	endpoints := []cmdrpc.EndpointDefinition{
		commandDispatchRPCEndpoint(bus),
		commandListRPCEndpoint(bus),
	}
	for _, endpoint := range endpoints {
		if endpoint == nil {
			continue
		}
		spec := endpoint.Spec()
		if strings.TrimSpace(spec.Method) == "" || hasRPCEndpoint(server, spec.Method) {
			continue
		}
		if err := server.RegisterEndpoint(endpoint); err != nil {
			return err
		}
	}
	return nil
}

func hasRPCEndpoint(server *cmdrpc.Server, method string) bool {
	if server == nil {
		return false
	}
	method = strings.TrimSpace(method)
	if method == "" {
		return false
	}
	endpoints := server.EndpointsMeta()
	for _, endpoint := range endpoints {
		if strings.TrimSpace(endpoint.Method) == method {
			return true
		}
	}
	return false
}

func commandDispatchRPCEndpoint(bus *CommandBus) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[RPCCommandDispatchRequest, RPCCommandDispatchResponse](
		cmdrpc.EndpointSpec{
			Method:      RPCMethodCommandDispatch,
			Kind:        cmdrpc.MethodKindCommand,
			Permissions: []string{"admin.commands.dispatch"},
			Summary:     "Dispatch a named admin command",
			Tags:        []string{"admin", "commands"},
			Idempotent:  false,
		},
		func(ctx context.Context, req cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]) (cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse], error) {
			if bus == nil {
				return cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse]{}, serviceNotConfiguredDomainError("command bus", map[string]any{
					"component": "rpc_transport",
					"method":    RPCMethodCommandDispatch,
				})
			}
			name := strings.TrimSpace(req.Data.Name)
			if name == "" {
				return cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse]{}, requiredFieldDomainError("name", map[string]any{
					"component": "rpc_transport",
					"method":    RPCMethodCommandDispatch,
				})
			}
			payload := req.Data.Payload
			if payload == nil {
				payload = map[string]any{}
			}
			opts := applyRPCMetaToDispatchOptions(req.Meta, req.Data.Options)
			receipt, err := bus.DispatchByNameWithOptions(ctx, name, payload, req.Data.IDs, opts)
			if err != nil {
				return cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse]{}, err
			}
			return cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse]{
				Data: RPCCommandDispatchResponse{
					Receipt: receipt,
				},
			}, nil
		},
	)
}

func commandListRPCEndpoint(bus *CommandBus) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[map[string]any, RPCCommandListResponse](
		cmdrpc.EndpointSpec{
			Method:      RPCMethodCommandList,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.commands.read"},
			Summary:     "List command names registered in the admin command bus",
			Tags:        []string{"admin", "commands"},
			Idempotent:  true,
		},
		func(_ context.Context, _ cmdrpc.RequestEnvelope[map[string]any]) (cmdrpc.ResponseEnvelope[RPCCommandListResponse], error) {
			names := []string{}
			if bus != nil {
				names = bus.Names()
			}
			return cmdrpc.ResponseEnvelope[RPCCommandListResponse]{
				Data: RPCCommandListResponse{
					Commands: names,
				},
			}, nil
		},
	)
}

func applyRPCMetaToDispatchOptions(meta cmdrpc.RequestMeta, opts command.DispatchOptions) command.DispatchOptions {
	correlation := strings.TrimSpace(opts.CorrelationID)
	if correlation == "" {
		correlation = strings.TrimSpace(meta.CorrelationID)
	}
	if correlation == "" {
		correlation = strings.TrimSpace(meta.RequestID)
	}
	opts.CorrelationID = correlation

	metadata := copyRPCMap(opts.Metadata)
	if actorID := strings.TrimSpace(meta.ActorID); actorID != "" {
		metadata["actor_id"] = actorID
	}
	if tenant := strings.TrimSpace(meta.Tenant); tenant != "" {
		metadata["tenant"] = tenant
	}
	if requestID := strings.TrimSpace(meta.RequestID); requestID != "" {
		metadata["request_id"] = requestID
	}
	if len(meta.Roles) > 0 {
		metadata["roles"] = append([]string(nil), meta.Roles...)
	}
	if len(meta.Permissions) > 0 {
		metadata["permissions"] = append([]string(nil), meta.Permissions...)
	}
	if len(meta.Scope) > 0 {
		metadata["scope"] = copyRPCMap(meta.Scope)
	}
	if len(meta.Headers) > 0 {
		headers := map[string]any{}
		for key, value := range meta.Headers {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			headers[key] = value
		}
		if len(headers) > 0 {
			metadata["headers"] = headers
		}
	}
	if len(meta.Params) > 0 {
		params := map[string]any{}
		for key, value := range meta.Params {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			params[key] = value
		}
		if len(params) > 0 {
			metadata["params"] = params
		}
	}
	if len(meta.Query) > 0 {
		query := map[string]any{}
		for key, value := range meta.Query {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			query[key] = append([]string(nil), value...)
		}
		if len(query) > 0 {
			metadata["query"] = query
		}
	}
	opts.Metadata = metadata
	return opts
}

func copyRPCMap(in map[string]any) map[string]any {
	if len(in) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		out[key] = value
	}
	return out
}
