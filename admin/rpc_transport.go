package admin

import (
	"context"
	"strings"

	auth "github.com/goliatone/go-auth"
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

type rpcTrustedIdentity struct {
	ActorID        string
	Subject        string
	TenantID       string
	OrganizationID string
	RequestID      string
	CorrelationID  string
}

func newRPCServer(server *cmdrpc.Server) *cmdrpc.Server {
	if server != nil {
		return server
	}
	return cmdrpc.NewServer(cmdrpc.WithFailureMode(cmdrpc.FailureModeRecover))
}

func registerCoreRPCEndpoints(server *cmdrpc.Server, adm *Admin) error {
	if server == nil {
		return nil
	}
	endpoints := []cmdrpc.EndpointDefinition{
		commandDispatchRPCEndpoint(adm),
		commandListRPCEndpoint(adm),
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

func commandDispatchRPCEndpoint(adm *Admin) cmdrpc.EndpointDefinition {
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
			if adm == nil || adm.Commands() == nil {
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

			rule, ok := adm.config.Commands.RPC.ResolveRule(name)
			if !ok {
				return cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse]{}, ErrNotFound
			}
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), rule.Permission, rule.Resource); err != nil {
				return cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse]{}, err
			}

			payload := req.Data.Payload
			if payload == nil {
				payload = map[string]any{}
			}

			identity := trustedRPCIdentityFromContext(ctx, req.Meta, req.Data.Options)
			opts := sanitizeRPCDispatchOptions(identity, req.Data.Options, adm.config.Commands.RPC.MetadataAllowlist)
			policyInput := RPCCommandPolicyInput{
				Method:         RPCMethodCommandDispatch,
				CommandName:    name,
				Payload:        copyRPCMap(payload),
				IDs:            append([]string(nil), req.Data.IDs...),
				Rule:           rule,
				Dispatch:       cloneRPCDispatchOptions(opts),
				ActorID:        identity.ActorID,
				Subject:        identity.Subject,
				TenantID:       identity.TenantID,
				OrganizationID: identity.OrganizationID,
				RequestID:      identity.RequestID,
				CorrelationID:  identity.CorrelationID,
				Metadata:       copyRPCMap(opts.Metadata),
			}
			if hook := adm.rpcCommandPolicyHook; hook != nil {
				if err := hook(ctx, policyInput); err != nil {
					return cmdrpc.ResponseEnvelope[RPCCommandDispatchResponse]{}, err
				}
			}

			receipt, err := adm.Commands().DispatchByNameWithOptions(ctx, name, payload, req.Data.IDs, opts)
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

func commandListRPCEndpoint(adm *Admin) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[map[string]any, RPCCommandListResponse](
		cmdrpc.EndpointSpec{
			Method:      RPCMethodCommandList,
			Kind:        cmdrpc.MethodKindQuery,
			Permissions: []string{"admin.commands.read"},
			Summary:     "List command names registered in the admin command bus",
			Tags:        []string{"admin", "commands"},
			Idempotent:  true,
		},
		func(ctx context.Context, _ cmdrpc.RequestEnvelope[map[string]any]) (cmdrpc.ResponseEnvelope[RPCCommandListResponse], error) {
			if adm == nil {
				return cmdrpc.ResponseEnvelope[RPCCommandListResponse]{}, serviceNotConfiguredDomainError("admin", map[string]any{
					"component": "rpc_transport",
					"method":    RPCMethodCommandList,
				})
			}
			if !adm.config.Commands.RPC.DiscoveryEnabled {
				return cmdrpc.ResponseEnvelope[RPCCommandListResponse]{}, ErrNotFound
			}
			if err := authorizeRPCPermission(ctx, adm.Authorizer(), "admin.commands.read", defaultRPCCommandResource); err != nil {
				return cmdrpc.ResponseEnvelope[RPCCommandListResponse]{}, err
			}

			names := []string{}
			if bus := adm.Commands(); bus != nil {
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

func authorizeRPCPermission(ctx context.Context, authorizer Authorizer, permission, resource string) error {
	permission = strings.TrimSpace(permission)
	resource = strings.TrimSpace(resource)
	if permission == "" {
		return nil
	}
	if resource == "" {
		resource = defaultRPCCommandResource
	}
	if authorizer == nil || !authorizer.Can(ctx, permission, resource) {
		return permissionDenied(permission, resource)
	}
	return nil
}

func trustedRPCIdentityFromContext(ctx context.Context, meta cmdrpc.RequestMeta, opts command.DispatchOptions) rpcTrustedIdentity {
	identity := rpcTrustedIdentity{
		ActorID:        strings.TrimSpace(actorFromContext(ctx)),
		TenantID:       strings.TrimSpace(tenantIDFromContext(ctx)),
		OrganizationID: strings.TrimSpace(orgIDFromContext(ctx)),
		RequestID:      strings.TrimSpace(requestIDFromContext(ctx)),
		CorrelationID:  strings.TrimSpace(correlationIDFromContext(ctx)),
	}
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		identity.Subject = strings.TrimSpace(actor.Subject)
		if identity.ActorID == "" {
			identity.ActorID = strings.TrimSpace(actor.ActorID)
		}
		if identity.ActorID == "" {
			identity.ActorID = strings.TrimSpace(actor.Subject)
		}
		if identity.TenantID == "" {
			identity.TenantID = strings.TrimSpace(actor.TenantID)
		}
		if identity.OrganizationID == "" {
			identity.OrganizationID = strings.TrimSpace(actor.OrganizationID)
		}
	}
	if identity.RequestID == "" {
		identity.RequestID = strings.TrimSpace(meta.RequestID)
	}
	if identity.CorrelationID == "" {
		identity.CorrelationID = strings.TrimSpace(meta.CorrelationID)
	}
	if identity.CorrelationID == "" {
		identity.CorrelationID = strings.TrimSpace(opts.CorrelationID)
	}
	if identity.CorrelationID == "" {
		identity.CorrelationID = identity.RequestID
	}
	if identity.Subject == "" {
		identity.Subject = identity.ActorID
	}
	return identity
}

func sanitizeRPCDispatchOptions(identity rpcTrustedIdentity, opts command.DispatchOptions, allowlist []string) command.DispatchOptions {
	opts.CorrelationID = strings.TrimSpace(identity.CorrelationID)

	metadata := copyAllowedRPCMetadata(opts.Metadata, allowlist)
	if identity.RequestID != "" {
		metadata["request_id"] = identity.RequestID
	}
	if identity.CorrelationID != "" {
		metadata["correlation_id"] = identity.CorrelationID
	}
	if identity.ActorID != "" {
		metadata["actor_id"] = identity.ActorID
	}
	if identity.Subject != "" {
		metadata["subject"] = identity.Subject
	}
	if identity.TenantID != "" {
		metadata["tenant"] = identity.TenantID
		metadata["tenant_id"] = identity.TenantID
	}
	if identity.OrganizationID != "" {
		metadata["organization_id"] = identity.OrganizationID
		metadata["org_id"] = identity.OrganizationID
	}
	if identity.TenantID != "" || identity.OrganizationID != "" {
		scope := map[string]any{}
		if identity.TenantID != "" {
			scope["tenant_id"] = identity.TenantID
		}
		if identity.OrganizationID != "" {
			scope["organization_id"] = identity.OrganizationID
		}
		metadata["scope"] = scope
	}

	opts.Metadata = metadata
	return opts
}

func copyAllowedRPCMetadata(in map[string]any, allowlist []string) map[string]any {
	allowed := map[string]struct{}{}
	for _, value := range normalizeRPCMetadataAllowlist(allowlist) {
		allowed[value] = struct{}{}
	}
	if len(allowed) == 0 || len(in) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	for rawKey, value := range in {
		key := strings.TrimSpace(rawKey)
		if key == "" {
			continue
		}
		normalized := strings.ToLower(key)
		if _, ok := allowed[normalized]; !ok {
			continue
		}
		if isReservedRPCMetadataKey(normalized) {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return map[string]any{}
	}
	return out
}

func isReservedRPCMetadataKey(key string) bool {
	key = strings.TrimSpace(strings.ToLower(key))
	switch key {
	case "actor", "actor_id", "actorid", "subject", "user_id", "userid", "tenant", "tenant_id", "tenantid", "organization", "organization_id", "organizationid", "org", "org_id", "orgid", "roles", "permissions", "scope", "headers", "params", "query":
		return true
	default:
		return false
	}
}

func cloneRPCDispatchOptions(opts command.DispatchOptions) command.DispatchOptions {
	cloned := opts
	cloned.Metadata = copyRPCMap(opts.Metadata)
	if opts.RunAt != nil {
		runAt := opts.RunAt.UTC()
		cloned.RunAt = &runAt
	}
	return cloned
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
	if len(out) == 0 {
		return map[string]any{}
	}
	return out
}
