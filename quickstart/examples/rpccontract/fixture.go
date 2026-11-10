// Package rpccontract is an executable consumer example, not an application helper API.
package rpccontract

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"reflect"
	"sync"
	"time"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	cmdrpc "github.com/goliatone/go-command/rpc"
	gerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

const CommandID = "resources.update"
const UpdateMethod = "resources.update.typed"
const QueryMethod = "resources.get"

type Count int64
type Resource struct {
	DisplayName string `json:"displayName"`
}
type Input struct {
	ResourceID string   `json:"resourceId"`
	DryRun     bool     `json:"dryRun"`
	Resource   Resource `json:"resource"`
	Count      Count    `json:"count"`
	Revision   uint64   `json:"revision,string"`
	Scenario   string   `json:"scenario,omitempty"`
}
type Result struct {
	Data    string `json:"data"`
	Result  string `json:"result"`
	Applied bool   `json:"applied"`
	Failed  bool   `json:"failed"`
	Input   Input  `json:"input"`
}
type Query struct {
	ResourceID string `json:"resourceId"`
}

func (Query) Type() string { return QueryMethod }

type QueryResult struct {
	Writes     int32  `json:"writes"`
	ResourceID string `json:"resourceId"`
}
type Message struct {
	Input   Input
	ActorID string
	IDs     []string
}

func (Message) Type() string { return CommandID }

func Declaration() cmdrpc.CommandContract { return cmdrpc.CommandContractFor[Input, Result](CommandID) }
func WirePolicy() cmdrpc.ExportOptions {
	return cmdrpc.ExportOptions{Overrides: map[reflect.Type]cmdrpc.WireSchema{reflect.TypeFor[any](): {Kind: "json"}}, Bounds: map[reflect.Type]cmdrpc.IntegerBounds{reflect.TypeFor[time.Duration](): {Minimum: 0, Maximum: cmdrpc.MaxSafeInteger}, reflect.TypeFor[Count](): {Minimum: 0, Maximum: cmdrpc.MaxSafeInteger}}}
}
func Binding() (*admin.RPCCommandBinding[Input, Result], error) {
	return admin.NewRPCCommandBinding[Input, Result](Declaration(), WirePolicy())
}

// Export selects only this application's declarations. No authentication,
// runtime, service, registration or network listener is constructed here.
func Export() (*cmdrpc.ContractManifest, error) {
	opts := WirePolicy()
	opts.Commands = []cmdrpc.CommandContract{Declaration(), ReceiptDeclaration()}
	opts.Endpoints = endpoints(nil)
	return admin.ExportRPCContracts(opts)
}

type Observation struct {
	ActorID  string
	TenantID string
	IDs      []string
	Options  command.DispatchOptions
	Input    Input
}
type Service struct {
	mu           sync.Mutex
	writes       int32
	observations []Observation
}

func (s *Service) Snapshot() (int32, []Observation) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.writes, append([]Observation(nil), s.observations...)
}
func (s *Service) Authorize(ctx context.Context, id string) error {
	actor, ok := auth.ActorFromContext(ctx)
	if !ok || actor == nil || actor.ActorID != "operator" || actor.TenantID != "tenant-a" || id != "resource-a" {
		return admin.ErrForbidden
	}
	return nil
}
func (s *Service) Update(ctx context.Context, m Message) (Result, error) {
	if err := s.Authorize(ctx, m.Input.ResourceID); err != nil {
		return Result{}, err
	}
	if err := ctx.Err(); err != nil {
		return Result{}, err
	}
	if m.Input.Scenario == "cancel" {
		return Result{}, context.Canceled
	}
	if m.Input.Scenario == "conflict" {
		return Result{}, gerrors.New("resource revision conflict", gerrors.CategoryConflict)
	}
	actor, _ := auth.ActorFromContext(ctx)
	opts, _ := command.DispatchOptionsFromContext(ctx)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.observations = append(s.observations, Observation{ActorID: actor.ActorID, TenantID: actor.TenantID, IDs: append([]string(nil), m.IDs...), Options: opts, Input: m.Input})
	applied := !m.Input.DryRun && m.Input.Scenario != "failure"
	if applied {
		s.writes++
	}
	out := Result{Data: "application-data", Result: "application-result", Applied: applied, Failed: m.Input.Scenario == "failure", Input: m.Input}
	if m.Input.Scenario == "unsafe-result" {
		out.Input.Count = Count(cmdrpc.MaxSafeInteger + 1)
	}
	return out, nil
}
func (s *Service) Read(ctx context.Context, q Query) (QueryResult, error) {
	if err := s.Authorize(ctx, q.ResourceID); err != nil {
		return QueryResult{}, err
	}
	if err := ctx.Err(); err != nil {
		return QueryResult{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return QueryResult{s.writes, q.ResourceID}, nil
}

type handler struct{ service *Service }

func (h handler) Execute(ctx context.Context, m Message) error {
	value, err := h.service.Update(ctx, m)
	if err != nil {
		return err
	}
	command.ResultFromContext[Result](ctx).Store(value)
	return nil
}

type queue struct{ service *Service }

func (q queue) Execute(ctx context.Context, raw any, id string, opts command.DispatchOptions) (command.DispatchReceipt, error) {
	var m Message
	switch value := raw.(type) {
	case Message:
		m = value
	case receiptMessage:
		m = value.Message
	case legacyMessage:
		m = value.Message
	default:
		return command.DispatchReceipt{}, fmt.Errorf("unexpected message %T", raw)
	}
	if err := q.service.Authorize(ctx, m.Input.ResourceID); err != nil {
		return command.DispatchReceipt{}, err
	}
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return command.DispatchReceipt{Accepted: true, Mode: command.ExecutionModeQueued, CommandID: id, DispatchID: "example-queue", EnqueuedAt: &now, CorrelationID: opts.CorrelationID}, nil
}

// Host owns its registrations and query runtime. Close never resets global state.
type Host struct {
	serve             func(net.Listener) error
	stop              func(context.Context) error
	Admin             *admin.Admin
	Service           *Service
	binding           *admin.RPCCommandBinding[Input, Result]
	registration      admin.CommandRegistrationHandle
	queries           *dispatcher.Runtime
	querySubscription dispatcher.Subscription
	auther            auth.Authenticator
}

func New(signingKey string) (host *Host, err error) {
	binding, err := Binding()
	if err != nil {
		return nil, err
	}
	host = &Host{Service: &Service{}, binding: binding, queries: dispatcher.NewRuntime()}
	defer func() {
		if err != nil {
			host.Close()
		}
	}()
	adapter := router.NewFiberAdapter()
	host.serve = func(l net.Listener) error { return adapter.WrappedRouter().Listener(l) }
	host.stop = func(ctx context.Context) error { return adapter.WrappedRouter().ShutdownWithContext(ctx) }
	cfg := authConfig{key: signingKey}
	host.auther = auth.NewAuthenticator(identityProvider{}, cfg)
	httpAuth, err := auth.NewHTTPAuthenticator(host.auther, cfg)
	if err != nil {
		return nil, err
	}
	authn := admin.NewGoAuthAuthenticator(httpAuth, cfg, admin.WithAuthErrorHandler(func(c router.Context, _ error) error { return c.JSON(401, map[string]string{"error": "unauthorized"}) }))
	host.Admin, _, err = quickstart.NewAdmin(quickstart.NewAdminConfig("/admin", "RPC example", "en"), quickstart.AdapterHooks{},
		quickstart.WithFeatureSet(map[string]bool{"commands": true}),
		quickstart.WithAdminDependencies(admin.Dependencies{Router: adapter.Router(), Authenticator: authn, Authorizer: policy{}}),
		quickstart.WithRPCTransport(quickstart.RPCTransportConfig{Enabled: true, PermissionMode: admin.RPCCommandPermissionModeExact, ErrorMapper: admin.DefaultRPCErrorMapper,
			CommandRules: map[string]admin.RPCCommandRule{CommandID: {Permission: "resources.write", Resource: "resources"}, LegacyCommandID: {Permission: "resources.write", Resource: "resources"}, ReceiptCommandID: {Permission: "resources.write", Resource: "resources"}},
			BeforeInvoke: func(c router.Context, _ string, _ any) error {
				actor, ok := auth.ActorFromContext(c.Context())
				if !ok || actor == nil {
					return admin.ErrForbidden
				}
				trusted := *actor
				trusted.TenantID = "tenant-a"
				c.SetContext(auth.WithActorContext(c.Context(), &trusted))
				return nil
			}}))
	if err != nil {
		return nil, err
	}
	bus := host.Admin.Commands()
	if err = bus.SetOwnedRuntimeConfig(admin.OwnedCommandRuntimeConfig{Executors: map[command.ExecutionMode]dispatcher.CommandExecutor{command.ExecutionModeQueued: queue{host.Service}}}); err != nil {
		return nil, err
	}
	if err = host.Register(); err != nil {
		return nil, err
	}
	host.querySubscription = dispatcher.SubscribeQueryTo(host.queries, command.QueryFunc[Query, QueryResult](host.Service.Read))
	for _, endpoint := range endpoints(host) {
		if err = host.Admin.RPCServer().RegisterEndpoint(endpoint); err != nil {
			return nil, err
		}
	}
	return host, nil
}
func (h *Host) Register() error {
	set, err := h.Admin.Commands().NewRegistrationSet("rpc-contract-example")
	if err != nil {
		return err
	}
	if err = admin.RegisterSetCommand(set, handler{h.Service}); err != nil {
		return err
	}
	if err = admin.RegisterSetTypedRPCCommand(set, h.binding, func(ctx context.Context, in Input, ids []string) (Message, error) {
		if err := h.Service.Authorize(ctx, in.ResourceID); err != nil {
			return Message{}, err
		}
		actor, _ := auth.ActorFromContext(ctx)
		return Message{in, actor.ActorID, ids}, nil
	}); err != nil {
		return err
	}
	if err := registerLegacy(set, h); err != nil {
		return err
	}
	if err := registerReceipt(set, h); err != nil {
		return err
	}
	if h.registration != nil {
		if err := h.registration.Close(); err != nil {
			return err
		}
	}
	next, err := set.Commit()
	if err != nil {
		return err
	}
	h.registration = next
	return nil
}
func (h *Host) Close() {
	if h == nil {
		return
	}
	if h.registration != nil {
		_ = h.registration.Close()
	}
	if h.querySubscription != nil {
		h.querySubscription.Unsubscribe()
	}
	if h.queries != nil {
		h.queries.Reset()
	}
}
func (h *Host) Token(actor string) (string, error) {
	return h.auther.TokenService().Generate(identity(actor), nil)
}
func (h *Host) Query(ctx context.Context, q Query) (QueryResult, error) {
	return dispatcher.QueryTo[Query, QueryResult](ctx, h.queries, q)
}
func TrustedContext(ctx context.Context) context.Context {
	return auth.WithActorContext(ctx, &auth.ActorContext{ActorID: "operator", Subject: "operator", TenantID: "tenant-a"})
}
func (h *Host) Direct(ctx context.Context, input Input, ids []string, opts command.DispatchOptions) (admin.DispatchOutcome, error) {
	raw, err := json.Marshal(input)
	if err != nil {
		return admin.DispatchOutcome{}, err
	}
	var payload map[string]any
	if err = json.Unmarshal(raw, &payload); err != nil {
		return admin.DispatchOutcome{}, err
	}
	return h.Admin.Commands().DispatchByNameWithOutcome(ctx, CommandID, payload, ids, opts)
}

// The dedicated endpoint exposes Input in discovery/export but preserves bytes
// until the same named-command validator has checked them. The host enforces
// policy by forwarding through the canonical named endpoint, not metadata hints.
type updateEndpoint struct {
	cmdrpc.EndpointDefinition
	host *Host
}

func (e updateEndpoint) NewRequest() any { return &cmdrpc.RequestEnvelope[json.RawMessage]{} }
func (e updateEndpoint) Invoke(ctx context.Context, value any) (any, error) {
	raw, ok := value.(*cmdrpc.RequestEnvelope[json.RawMessage])
	if !ok {
		return e.EndpointDefinition.Invoke(ctx, value)
	}
	input, err := e.host.binding.Decode(raw.Data)
	if err != nil {
		return nil, err
	}
	return invokeUpdate(e.host, ctx, cmdrpc.RequestEnvelope[Input]{Data: input, Meta: raw.Meta})
}
func invokeUpdate(h *Host, ctx context.Context, req cmdrpc.RequestEnvelope[Input]) (cmdrpc.ResponseEnvelope[Result], error) {
	raw, err := json.Marshal(req.Data)
	if err != nil {
		return cmdrpc.ResponseEnvelope[Result]{}, err
	}
	var payload map[string]any
	if err = json.Unmarshal(raw, &payload); err != nil {
		return cmdrpc.ResponseEnvelope[Result]{}, err
	}
	out, err := h.Admin.RPCServer().Invoke(ctx, admin.RPCMethodCommandDispatch, cmdrpc.RequestEnvelope[admin.RPCCommandDispatchRequest]{Data: admin.RPCCommandDispatchRequest{CommandID: CommandID, Payload: payload}, Meta: req.Meta})
	if err != nil {
		return cmdrpc.ResponseEnvelope[Result]{}, err
	}
	dispatch := out.(cmdrpc.ResponseEnvelope[admin.RPCCommandDispatchResponse])
	result, ok := dispatch.Data.Result.(Result)
	if !ok {
		return cmdrpc.ResponseEnvelope[Result]{}, fmt.Errorf("inline command did not return its result")
	}
	return cmdrpc.ResponseEnvelope[Result]{Data: result}, nil
}
func endpoints(h *Host) []cmdrpc.EndpointDefinition {
	update := cmdrpc.NewEndpoint[Input, Result](cmdrpc.EndpointSpec{Method: UpdateMethod, Kind: cmdrpc.MethodKindCommand}, func(ctx context.Context, req cmdrpc.RequestEnvelope[Input]) (cmdrpc.ResponseEnvelope[Result], error) {
		return invokeUpdate(h, ctx, req)
	})
	query := cmdrpc.NewEndpoint[Query, QueryResult](cmdrpc.EndpointSpec{Method: QueryMethod, Kind: cmdrpc.MethodKindQuery}, func(ctx context.Context, req cmdrpc.RequestEnvelope[Query]) (cmdrpc.ResponseEnvelope[QueryResult], error) {
		out, err := h.Query(ctx, req.Data)
		return cmdrpc.ResponseEnvelope[QueryResult]{Data: out}, err
	})
	return []cmdrpc.EndpointDefinition{updateEndpoint{update, h}, query, wireEndpoint(h)}
}
