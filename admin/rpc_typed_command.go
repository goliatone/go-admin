package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"reflect"

	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	cmdrpc "github.com/goliatone/go-command/rpc"
)

// ExportRPCContracts exports explicitly selected declarations, applying admin's
// authority-key policy to named command inputs. It never constructs a service.
func ExportRPCContracts(options cmdrpc.ExportOptions) (*cmdrpc.ContractManifest, error) {
	manifest, err := cmdrpc.ExportContracts(options)
	if err != nil {
		return nil, err
	}
	for id, declaration := range manifest.Commands {
		input := declaration.Input
		seen := map[string]bool{}
		for input.Ref != "" && !seen[input.Ref] {
			seen[input.Ref] = true
			input = manifest.Definitions[input.Ref]
		}
		if input.Kind != "object" && input.Kind != "map" {
			return nil, fmt.Errorf("command %s: named RPC input must serialize as an object", id)
		}
		if err := validateRPCAuthoritySchema(manifest, declaration.Input, map[string]bool{}); err != nil {
			return nil, fmt.Errorf("command %s: %w", id, err)
		}
	}
	return manifest, nil
}

func validateRPCAuthoritySchema(m *cmdrpc.ContractManifest, schema cmdrpc.WireSchema, seen map[string]bool) error {
	if schema.Ref != "" {
		if seen[schema.Ref] {
			return nil
		}
		seen[schema.Ref] = true
		return validateRPCAuthoritySchema(m, m.Definitions[schema.Ref], seen)
	}
	for key, property := range schema.Properties {
		if isReservedRPCMetadataKey(key) {
			return fmt.Errorf("reserved authority field %q", key)
		}
		if err := validateRPCAuthoritySchema(m, property.Schema, seen); err != nil {
			return err
		}
	}
	if schema.Element != nil {
		if err := validateRPCAuthoritySchema(m, *schema.Element, seen); err != nil {
			return err
		}
	}
	for _, variant := range schema.Variants {
		if err := validateRPCAuthoritySchema(m, variant, seen); err != nil {
			return err
		}
	}
	return nil
}

// RPCCommandBinding pairs a public Go declaration with its input and egress
// validators. Its immutable schema is shared by all registrations using it.
// Result=nil declarations are receipt-only; otherwise Result must match R.
type RPCCommandBinding[I, R any] struct {
	declaration cmdrpc.CommandContract
	manifest    *cmdrpc.ContractManifest
	schema      cmdrpc.NamedCommandContract
}

// NewRPCCommandBinding validates a declaration and snapshots its wire policy.
// options supplies bounds/enums/overrides; selection is owned by declaration.
func NewRPCCommandBinding[I, R any](declaration cmdrpc.CommandContract, options cmdrpc.ExportOptions) (*RPCCommandBinding[I, R], error) {
	if declaration.Input != reflect.TypeFor[I]() || (declaration.Result != nil && declaration.Result != reflect.TypeFor[R]()) {
		return nil, validationDomainError("RPC declaration types do not match binding", nil)
	}
	options.Commands = []cmdrpc.CommandContract{declaration}
	options.Endpoints = nil
	manifest, err := ExportRPCContracts(options)
	if err != nil {
		return nil, err
	}
	// Exported overrides can retain caller-owned maps/slices. Snapshot once at
	// binding time so later option edits cannot change an owned generation.
	encoded, err := json.Marshal(manifest)
	if err != nil {
		return nil, err
	}
	var snapshot cmdrpc.ContractManifest
	if err = json.Unmarshal(encoded, &snapshot); err != nil {
		return nil, err
	}
	return &RPCCommandBinding[I, R]{declaration: declaration, manifest: &snapshot, schema: snapshot.Commands[declaration.ID]}, nil
}

// Contract returns the same static declaration used for offline selection.
func (b *RPCCommandBinding[I, R]) Contract() cmdrpc.CommandContract { return b.declaration }

// Decode accepts original public JSON, rejecting authority keys at any depth.
// Other unknown fields retain encoding/json semantics, including camel-case tags.
func (b *RPCCommandBinding[I, R]) Decode(raw json.RawMessage) (I, error) {
	var zero I
	if b == nil || b.manifest == nil {
		return zero, validationDomainError("RPC binding required", nil)
	}
	if err := rejectRPCAuthorityJSON(raw); err != nil {
		return zero, validationDomainError(err.Error(), nil)
	}
	value, err := cmdrpc.DecodeContractJSON[I](b.manifest, b.schema.Input, raw)
	if err != nil {
		return zero, validationDomainError(err.Error(), nil)
	}
	return value, nil
}

// ValidateResult enforces the public wire contract before serialization.
func (b *RPCCommandBinding[I, R]) ValidateResult(value R) error {
	if b == nil || b.schema.Result == nil {
		return nil
	}
	if err := cmdrpc.ValidateContractValue(b.manifest, *b.schema.Result, value); err != nil {
		return serviceUnavailableDomainError("command result violates its RPC contract", map[string]any{"command_name": b.declaration.ID})
	}
	return nil
}

func rejectRPCAuthorityJSON(raw json.RawMessage) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var visit func(int) error
	visit = func(depth int) error {
		if depth > 256 {
			return fmt.Errorf("RPC payload nesting too deep")
		}
		token, err := decoder.Token()
		if err != nil {
			return err
		}
		delim, ok := token.(json.Delim)
		if !ok {
			return nil
		}
		switch delim {
		case '{':
			for decoder.More() {
				key, err := decoder.Token()
				if err != nil {
					return err
				}
				name, ok := key.(string)
				if !ok {
					return fmt.Errorf("invalid object key")
				}
				if isReservedRPCMetadataKey(name) {
					return fmt.Errorf("reserved authority field %q", name)
				}
				if err := visit(depth + 1); err != nil {
					return err
				}
			}
		case '[':
			for decoder.More() {
				if err := visit(depth + 1); err != nil {
					return err
				}
			}
		default:
			return fmt.Errorf("invalid JSON delimiter")
		}
		_, err = decoder.Token()
		return err
	}
	if err := visit(0); err != nil {
		return err
	}
	if _, err := decoder.Token(); err != io.EOF {
		return fmt.Errorf("invalid trailing JSON")
	}
	return nil
}

// RegisterSetTypedRPCCommand stages a typed public input builder and result
// decoder in the same owned generation as its command handler. It opts the host
// into raw named-dispatch decoding without changing untyped factories.
func RegisterSetTypedRPCCommand[T, I, R any](set *CommandRegistrationSet, binding *RPCCommandBinding[I, R], build func(context.Context, I, []string) (T, error)) error {
	if set == nil || binding == nil || binding.manifest == nil || build == nil {
		return validationDomainError("registration set, binding and builder required", nil)
	}
	name := binding.declaration.ID
	decode := func(ctx context.Context, raw json.RawMessage, ids []string) (T, error) {
		var zero T
		input, err := binding.Decode(raw)
		if err != nil {
			return zero, err
		}
		return build(ctx, input, ids)
	}
	rawDispatch := func(ctx context.Context, raw json.RawMessage, ids []string, opts command.DispatchOptions, runtime *dispatcher.Runtime) (DispatchOutcome, error) {
		if err := cmdrpc.ValidateContractValue(binding.manifest, binding.manifest.Canonical["DispatchOptions"], opts); err != nil {
			return DispatchOutcome{}, validationDomainError(err.Error(), nil)
		}
		message, err := decode(ctx, raw, ids)
		if err != nil {
			return DispatchOutcome{}, err
		}
		if binding.schema.Result == nil || opts.Mode != command.ExecutionModeInline {
			out, err := runtime.Dispatch(ctx, command.HandlerKindCommand, message, opts)
			return DispatchOutcome{Receipt: out.Receipt}, err
		}
		result := command.NewResult[R]()
		out, err := runtime.Dispatch(command.ContextWithResult(ctx, result), command.HandlerKindCommand, message, opts)
		if err != nil {
			return DispatchOutcome{Receipt: out.Receipt}, err
		}
		if out.ResultPresent {
			if err := result.StoreDynamic(out.Result); err != nil {
				return DispatchOutcome{Receipt: out.Receipt}, err
			}
		}
		value, stored := result.Load()
		if !stored {
			return DispatchOutcome{Receipt: out.Receipt}, serviceUnavailableDomainError("command result was not stored", map[string]any{"command_name": name})
		}
		if err := result.Error(); err != nil {
			return DispatchOutcome{Receipt: out.Receipt}, err
		}
		if err := binding.ValidateResult(value); err != nil {
			return DispatchOutcome{Receipt: out.Receipt}, err
		}
		return DispatchOutcome{Receipt: out.Receipt, Result: value}, nil
	}
	builder := func(ctx context.Context, payload map[string]any, ids []string) (T, error) {
		raw, err := json.Marshal(payload)
		if err != nil {
			var zero T
			return zero, err
		}
		return decode(ctx, raw, ids)
	}
	return set.addFactory(ownedFactoryDeclaration{name: name, requestType: reflect.TypeFor[T](), factory: messageFactory(name, builder), result: binding.schema.Result != nil, rawDispatch: rawDispatch,
		dispatch: func(ctx context.Context, payload map[string]any, ids []string, opts command.DispatchOptions, runtime *dispatcher.Runtime) (DispatchOutcome, error) {
			raw, err := json.Marshal(payload)
			if err != nil {
				return DispatchOutcome{}, err
			}
			return rawDispatch(ctx, raw, ids, opts, runtime)
		},
	})
}

// The endpoint's public reflection types stay canonical. Only NewRequest opts
// into the carrier, and Invoke continues accepting canonical direct callers.
type typedDispatchEndpoint struct {
	cmdrpc.EndpointDefinition
	admin *Admin
}
type rpcRawPayloadKey struct{}
type rpcDispatchCarrier struct {
	cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]
	raw json.RawMessage
	bus *CommandBus
}

func (r *rpcDispatchCarrier) UnmarshalJSON(data []byte) error {
	// Capture the public payload independently; do not round-trip it through any.
	var wire struct {
		Data struct {
			*RPCCommandDispatchRequest
			Payload json.RawMessage `json:"payload"`
		} `json:"data"`
		Meta cmdrpc.RequestMeta `json:"meta"`
	}
	wire.Data.RPCCommandDispatchRequest = &r.Data
	if err := json.Unmarshal(data, &wire); err != nil {
		return err
	}
	r.Meta = wire.Meta
	r.raw = wire.Data.Payload
	if r.raw == nil {
		r.raw = json.RawMessage(`{}`)
	}
	// Retain the exact old decoder for untyped command IDs on mixed hosts.
	r.bus.mu.RLock()
	typed := r.bus.ownedFactories[r.Data.ResolvedCommandID()].declaration.rawDispatch != nil
	r.bus.mu.RUnlock()
	if !typed {
		return json.Unmarshal(data, &r.RequestEnvelope)
	}
	// Policy hooks see ordinary float64 numbers when representable. Preserve
	// otherwise-unrepresentable unknown JSON numbers as tokens: Go's typed decoder
	// may ignore them, and they must not prevent valid public DTO decoding.
	decoder := json.NewDecoder(bytes.NewReader(r.raw))
	decoder.UseNumber()
	if err := decoder.Decode(&r.Data.Payload); err != nil {
		return err
	}
	r.Data.Payload = rpcPolicyNumbers(r.Data.Payload).(map[string]any)
	return nil
}
func rpcPolicyNumbers(value any) any {
	switch value := value.(type) {
	case json.Number:
		if number, err := value.Float64(); err == nil {
			return number
		}
		return value
	case map[string]any:
		for key, child := range value {
			value[key] = rpcPolicyNumbers(child)
		}
		return value
	case []any:
		for key, child := range value {
			value[key] = rpcPolicyNumbers(child)
		}
		return value
	default:
		return value
	}
}
func (e *typedDispatchEndpoint) NewRequest() any {
	if e.admin != nil && e.admin.Commands() != nil {
		bus := e.admin.Commands()
		bus.mu.RLock()
		defer bus.mu.RUnlock()
		for _, entry := range bus.ownedFactories {
			if entry.declaration.rawDispatch != nil {
				return &rpcDispatchCarrier{bus: bus}
			}
		}
	}
	return e.EndpointDefinition.NewRequest()
}
func (e *typedDispatchEndpoint) Invoke(ctx context.Context, request any) (any, error) {
	if carrier, ok := request.(*rpcDispatchCarrier); ok && carrier != nil {
		return e.EndpointDefinition.Invoke(context.WithValue(ctx, rpcRawPayloadKey{}, carrier.raw), &carrier.RequestEnvelope)
	}
	return e.EndpointDefinition.Invoke(ctx, request)
}
