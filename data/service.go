package data

import (
	"context"
	"errors"
	"reflect"
	"sort"
	"sync"
	"time"

	gerrors "github.com/goliatone/go-errors"
	"github.com/google/uuid"
)

type ServiceConfig struct {
	Providers map[string]Provider
	Target    ManagedTarget
	Store     OperationStore
	Policy    Policy
	// Resolve must consult current trusted state, including revocation, on every
	// invocation. It must not read actor/scope/delegation from Input.
	// Use CodeProvider/CodeUnavailable for backend outages, standard context
	// causes for cancellation, and CodeDenied (or a legacy untyped denial) for
	// invalid/revoked identities.
	Resolve        func(context.Context) (Principal, error)
	LeaseDuration  time.Duration
	CleanupTimeout time.Duration
	// WritesEnabled is the host's explicit conformance gate (T05). Durable capability
	// flags are additionally required; they are not themselves conformance evidence.
	WritesEnabled bool
	// RetryWindow is the host-declared replay window of request claims; it must
	// match the operation store's retention (1 hour–90 days). Zero leaves it
	// undeclared, so request reconciliation never reports a missing claim as
	// safely resubmittable.
	RetryWindow time.Duration
}
type Service struct{ config ServiceConfig }

func NewService(cfg ServiceConfig) (*Service, error) {
	if nilValue(cfg.Store) || nilValue(cfg.Policy) || nilValue(cfg.Target) || cfg.Resolve == nil || len(cfg.Providers) == 0 {
		return nil, Error(CodeUnavailable)
	}
	providers := make(map[string]Provider, len(cfg.Providers))
	for id, p := range cfg.Providers {
		if !identifier(id) || nilValue(p) {
			return nil, Error(CodeInvalid)
		}
		providers[id] = p
	}
	cfg.Providers = providers
	var err error
	cfg, err = normalizeServiceConfig(cfg)
	if err != nil {
		return nil, err
	}
	return &Service{config: cfg}, nil
}
func normalizeServiceConfig(cfg ServiceConfig) (ServiceConfig, error) {
	if cfg.LeaseDuration == 0 {
		cfg.LeaseDuration = 30 * time.Second
	}
	if cfg.CleanupTimeout == 0 {
		cfg.CleanupTimeout = 10 * time.Second
	}
	if cfg.LeaseDuration < 5*time.Second || cfg.LeaseDuration > 60*time.Second || cfg.CleanupTimeout < time.Second || cfg.CleanupTimeout > 60*time.Second {
		return cfg, Error(CodeInvalid)
	}
	if cfg.RetryWindow != 0 && (cfg.RetryWindow < time.Hour || cfg.RetryWindow > 90*24*time.Hour) {
		return cfg, Error(CodeInvalid)
	}
	if cfg.WritesEnabled && (!cfg.Store.Capabilities().WriteReady() || !cfg.Target.Capabilities().Recovery || !cfg.Target.Capabilities().Fencing) {
		return cfg, Error(CodeUnavailable)
	}
	return cfg, nil
}

func nilValue(v any) bool {
	if v == nil {
		return true
	}
	r := reflect.ValueOf(v)
	switch r.Kind() {
	case reflect.Pointer, reflect.Map, reflect.Func, reflect.Slice, reflect.Interface, reflect.Chan:
		return r.IsNil()
	}
	return false
}
func (s *Service) principal(ctx context.Context) (Principal, error) {
	if s == nil || ctx == nil {
		return Principal{}, Error(CodeDenied)
	}
	if ctx.Err() != nil {
		return Principal{}, ctx.Err()
	}
	p, err := s.config.Resolve(ctx)
	if ctx.Err() != nil {
		return Principal{}, ctx.Err()
	}
	if err != nil {
		return Principal{}, authorizationFailure(ctx, err)
	}
	if !p.Valid() {
		return Principal{}, Error(CodeDenied)
	}
	return p, nil
}
func (s *Service) authorize(ctx context.Context, p Principal, a AccessRequest) error {
	current, err := s.principal(ctx)
	if err != nil {
		return err
	}
	if current != p {
		return Error(CodeDenied)
	}
	return s.authorizeResolved(ctx, p, a)
}

// The caller has just resolved p and has done no provider/repository work since.
// Lifecycle paths retain authorize's comparison with their original principal.
func (s *Service) authorizeResolved(ctx context.Context, p Principal, a AccessRequest) error {
	if a.Target.ScopeKey != p.ScopeKey || !identifier(a.Target.TargetID) {
		return Error(CodeDenied)
	}
	if err := s.config.Policy.Authorize(ctx, p, a); err != nil {
		return authorizationFailure(ctx, err)
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	return nil
}

// Untyped policy/resolver errors retain the legacy denial contract. Adapters
// distinguish a backend outage with CodeProvider/CodeUnavailable, and retain
// cooperative cancellation with standard context causes (including wrappers).
func authorizationFailure(ctx context.Context, err error) error {
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return err
	}
	if code, known := SafeErrorCode(err); known && (code == CodeProvider || code == CodeUnavailable) {
		return gerrors.Wrap(err, gerrors.CategoryExternal, "Data authorization is unavailable. Retry the request.").WithCode(503).WithTextCode(code)
	}
	return Error(CodeDenied)
}

// Hidden authoritative records stay indistinguishable from missing records;
// an authorization backend failure or cancellation is neither of those things.
func hiddenReadFailure(err error) error {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return err
	}
	if code, known := SafeErrorCode(err); known && (code == CodeDenied || code == CodeGone) {
		return Error(CodeGone)
	}
	return err
}

// AuthorizeProjection checks current policy for previously loaded display data.
// It avoids repository reads, validates scope/target binding, and never grants
// authority to execute Input. Factories, Run and artifact lookups still load and
// authorize their exact authoritative records at their existing boundaries.
func (s *Service) AuthorizeProjection(ctx context.Context, a AccessRequest) error {
	p, err := s.principal(ctx)
	if err != nil {
		return err
	}
	if a.Action != "view" && !Kind(a.Action).Valid() {
		return Error(CodeInvalid)
	}
	if a.Artifact != nil {
		return Error(CodeInvalid)
	}
	if a.Receipt != nil && a.Receipt.Target != a.Target {
		return Error(CodeGone)
	}
	if a.Operation != nil && a.Operation.Target != a.Target {
		return Error(CodeGone)
	}
	if a.Action == string(Recover) && (!s.writeReady() || a.Operation == nil) {
		return Error(CodeUnavailable)
	}
	if a.Action == string(Cancel) {
		if a.Operation == nil || a.Operation.Principal.ActorID != p.ActorID {
			return Error(CodeGone)
		}
		a.Action = string(a.Operation.Result.Kind)
	}
	return s.authorizeResolved(ctx, p, a)
}
func (s *Service) writeReady() bool {
	return s.config.WritesEnabled && s.config.Store.Capabilities().WriteReady() && s.config.Target.Capabilities().Recovery && s.config.Target.Capabilities().Fencing
}

// Keep cooperative cancellation distinct from safe provider/storage failures.
func readFailure(ctx context.Context, err error) error {
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return err
	}
	return Error(ErrorCode(err))
}

func (s *Service) Describe(ctx context.Context, ref DatasetRef, targetID string) (Descriptor, error) {
	p, err := s.principal(ctx)
	if err != nil {
		return Descriptor{}, err
	}
	key := TargetKey{ScopeKey: p.ScopeKey, TargetID: targetID}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return Descriptor{}, err
	}
	provider := s.config.Providers[ref.Provider]
	if provider == nil || !ref.Valid() {
		return Descriptor{}, Error(CodeGone)
	}
	d, err := provider.Describe(ctx, p, ref)
	if err != nil {
		return Descriptor{}, readFailure(ctx, err)
	}
	if d.Dataset != ref {
		return Descriptor{}, Error(CodeConflict)
	}
	if err = d.ValidateIdentity(); err != nil {
		return Descriptor{}, err
	}
	current, err := s.principal(ctx)
	if err != nil {
		return Descriptor{}, err
	}
	if current != p {
		return Descriptor{}, Error(CodeDenied)
	}
	if err = s.authorize(ctx, current, AccessRequest{Action: "view", Target: key}); err != nil {
		return Descriptor{}, err
	}
	d.Capabilities, err = s.projectCapabilities(ctx, p, key, provider, d.Capabilities)
	if err != nil {
		return Descriptor{}, err
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return Descriptor{}, err
	}
	return d, nil
}
func (s *Service) projectCapabilities(ctx context.Context, p Principal, key TargetKey, provider Provider, source map[Kind]Capability) (map[Kind]Capability, error) {
	capabilities := make(map[Kind]Capability, len(source))
	for kind, c := range source {
		c.Permitted = false
		if kind.Writes() && !s.writeReady() {
			c.Supported = false
			c.Reason = "durable_write_gate"
		}
		if kind == Generate {
			if _, ok := provider.(Generator); !ok {
				c.Supported = false
				c.Reason = "generation_unavailable"
			}
		}
		if kind == Reset && !s.config.Target.Capabilities().SafeReset {
			c.Supported = false
			c.Reason = "safe_reset_unavailable"
		}
		if kind == Cancel && !s.config.Target.Capabilities().Cancellation {
			c.Supported = false
			c.Reason = "cancellation_unavailable"
		}
		if c.Supported {
			permitted, err := capabilityPermission(s.authorize(ctx, p, AccessRequest{Action: string(kind), Target: key}))
			if err != nil {
				return nil, err
			}
			c.Permitted = permitted
		}
		capabilities[kind] = c
	}
	return capabilities, nil
}

func (s *Service) Catalog(ctx context.Context, targetID string, limit int) ([]Descriptor, error) {
	p, err := s.principal(ctx)
	if err != nil {
		return nil, err
	}
	if limit < 1 || limit > 100 {
		return nil, Error(CodeInvalid)
	}
	key := TargetKey{ScopeKey: p.ScopeKey, TargetID: targetID}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return nil, err
	}
	out := []Descriptor{}
	ids := make([]string, 0, len(s.config.Providers))
	for id := range s.config.Providers {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	for _, id := range ids {
		descriptors, catalogErr := s.catalogFromProvider(ctx, p, key, id, limit-len(out))
		if catalogErr != nil {
			return nil, catalogErr
		}
		out = append(out, descriptors...)
		if len(out) == limit {
			break
		}
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return nil, err
	}
	return out, nil
}
func (s *Service) catalogFromProvider(ctx context.Context, p Principal, key TargetKey, id string, limit int) ([]Descriptor, error) {
	out := []Descriptor{}
	provider, ok := s.config.Providers[id].(CatalogProvider)
	if !ok {
		return nil, nil
	}
	refs, e := provider.Catalog(ctx, p, key, limit)
	if e != nil {
		return nil, readFailure(ctx, e)
	}
	if len(refs) > limit {
		return nil, Error(CodeInvalid)
	}
	for _, ref := range refs {
		if ref.Provider != id {
			return nil, Error(CodeInvalid)
		}
		descriptor, e := s.Describe(ctx, ref, key.TargetID)
		if e != nil {
			if ErrorCode(e) == CodeDenied || ErrorCode(e) == CodeGone {
				continue
			}
			return nil, e
		}
		out = append(out, descriptor)
	}
	return out, nil
}

func (s *Service) Active(ctx context.Context, targetID string) (ActiveState, error) {
	p, err := s.principal(ctx)
	if err != nil {
		return ActiveState{}, err
	}
	key := TargetKey{ScopeKey: p.ScopeKey, TargetID: targetID}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return ActiveState{}, err
	}
	state, err := s.config.Store.Target(ctx, key)
	if err != nil {
		return ActiveState{}, readFailure(ctx, err)
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return ActiveState{}, err
	}
	out := ActiveState{Target: key, Activation: state.Activation, Transitioning: state.Pending != nil, RecoveryRequired: state.RecoveryRequired}
	if state.Pending != nil {
		out.PendingOperationID = state.Pending.OperationID
		out.PendingReceiptID = state.Pending.Next.ReceiptID
	}
	if out.Transitioning || out.RecoveryRequired {
		out.Activation.Ready = false
	}
	return out, nil
}

func (s *Service) LookupOperation(ctx context.Context, id string) (Operation, error) {
	p, err := s.principal(ctx)
	if err != nil {
		return Operation{}, err
	}
	op, err := s.config.Store.GetOperation(ctx, id)
	if err != nil {
		return Operation{}, readFailure(ctx, err)
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: op.Target, Operation: &op}); err != nil {
		return Operation{}, hiddenReadFailure(err)
	}
	return op, nil
}

// LookupReceipt reads the current authoritative receipt, including its latest
// verification, rather than an immutable historical operation result.
func (s *Service) LookupReceipt(ctx context.Context, targetID, id string) (PreparationReceipt, error) {
	p, err := s.principal(ctx)
	if err != nil {
		return PreparationReceipt{}, err
	}
	key := TargetKey{ScopeKey: p.ScopeKey, TargetID: targetID}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return PreparationReceipt{}, err
	}
	r, err := s.config.Store.GetReceipt(ctx, id)
	if err != nil {
		return PreparationReceipt{}, readFailure(ctx, err)
	}
	if r.Target != key {
		return PreparationReceipt{}, Error(CodeGone)
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key, Receipt: &r}); err != nil {
		return PreparationReceipt{}, hiddenReadFailure(err)
	}
	return r, nil
}

// Receipts exposes bounded, current-policy pages independent of operation
// history. Filtering does not alter the store cursor; denied rows stay omitted.
func (s *Service) Receipts(ctx context.Context, targetID string, query ReceiptQuery) (ReceiptPage, error) {
	p, err := s.principal(ctx)
	if err != nil {
		return ReceiptPage{}, err
	}
	if query.Limit < 1 || query.Limit > 100 || len(query.Cursor) > 2048 {
		return ReceiptPage{}, Error(CodeInvalid)
	}
	key := TargetKey{ScopeKey: p.ScopeKey, TargetID: targetID}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return ReceiptPage{}, err
	}
	page, err := s.config.Store.ListReceipts(ctx, key, query)
	if err != nil {
		return ReceiptPage{}, readFailure(ctx, err)
	}
	if len(page.Receipts) > query.Limit {
		return ReceiptPage{}, Error(CodeInvalid)
	}
	out := ReceiptPage{Receipts: []PreparationReceipt{}, NextCursor: page.NextCursor}
	for _, receipt := range page.Receipts {
		if receipt.Target != key {
			continue
		}
		if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key, Receipt: &receipt}); err != nil {
			if ErrorCode(err) != CodeDenied && ErrorCode(err) != CodeGone {
				return ReceiptPage{}, err
			}
		} else {
			out.Receipts = append(out.Receipts, receipt)
		}
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return ReceiptPage{}, err
	}
	return out, nil
}
func (s *Service) Operations(ctx context.Context, targetID string, limit int) ([]Operation, error) {
	p, err := s.principal(ctx)
	if err != nil {
		return nil, err
	}
	if limit < 1 || limit > 100 {
		return nil, Error(CodeInvalid)
	}
	key := TargetKey{p.ScopeKey, targetID}
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return nil, err
	}
	ops, err := s.config.Store.ListOperations(ctx, key, limit)
	if err != nil {
		return nil, readFailure(ctx, err)
	}
	out := []Operation{}
	for _, op := range ops {
		if op.Target != key {
			continue
		}
		if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key, Operation: &op}); err != nil {
			if ErrorCode(err) != CodeDenied && ErrorCode(err) != CodeGone {
				return nil, err
			}
		} else {
			out = append(out, op)
		}
	}
	// Record filtering may take time or discover a revoked principal. Earlier
	// rows are not deliverable unless the target view grant is still current.
	if err = s.authorize(ctx, p, AccessRequest{Action: "view", Target: key}); err != nil {
		return nil, err
	}
	return out, nil
}
func (s *Service) LookupArtifact(ctx context.Context, providerID, artifactID string) (any, error) {

	p, err := s.principal(ctx)
	if err != nil {
		return nil, err
	}
	ref, loadErr := s.config.Store.GetArtifact(ctx, providerID, artifactID)
	if loadErr != nil || ref.Provider != providerID || ref.ID != artifactID {
		return nil, Error(CodeGone)
	}
	if ref.RequesterID != p.ActorID || !identifier(ref.ID) || ref.ExpiresAt.IsZero() || !time.Now().Before(ref.ExpiresAt) {
		return nil, Error(CodeGone)
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "artifact", Target: ref.Target, Artifact: &ref}); err != nil {
		return nil, Error(CodeGone)
	}
	state, err := s.config.Store.Target(ctx, ref.Target)
	if err != nil || !artifactGenerationCurrent(state, ref) {
		return nil, Error(CodeGone)
	}
	provider, ok := s.config.Providers[providerID].(ArtifactProvider)
	if !ok {
		return nil, Error(CodeUnavailable)
	}
	value, err := provider.LookupArtifact(ctx, p, ref)
	if err != nil {
		return nil, readFailure(ctx, err)
	}
	// Recheck grants, expiry and generation after potentially slow provider I/O.
	if !s.artifactStillVisible(ctx, p, ref) {
		return nil, Error(CodeGone)
	}
	return value, nil
}

func (s *Service) artifactStillVisible(ctx context.Context, prior Principal, ref ArtifactRef) bool {
	current, err := s.principal(ctx)
	if err != nil || current != prior || !time.Now().Before(ref.ExpiresAt) {
		return false
	}
	state, err := s.config.Store.Target(ctx, ref.Target)
	return err == nil && artifactGenerationCurrent(state, ref) &&
		s.authorize(ctx, current, AccessRequest{Action: "artifact", Target: ref.Target, Artifact: &ref}) == nil
}

func artifactGenerationCurrent(state TargetState, ref ArtifactRef) bool {
	return state.Activation.Generation == ref.Generation && state.Pending == nil && !state.RecoveryRequired
}

// Run executes bounded work inline. Transport acceptance is distinct from Result:
// only the latter reports preparation/verification/activation. Queued transports
// dispatch these same messages; they must propagate a trusted bounded principal.
func (s *Service) Run(ctx context.Context, kind Kind, input Input) (Result, error) {
	if s == nil || ctx == nil {
		return Result{}, Error(CodeUnavailable)
	}
	if kind == Recover {
		if err := s.AuthorizeInput(ctx, kind, input); err != nil {
			return Result{}, err
		}
		return s.Recover(ctx, input.OperationID)
	}
	result, err := s.run(ctx, kind, input)
	return s.deliverResult(ctx, result, err, "")
}

// Delivery authorization is independent of execution success. Deferred lease
// release can fail after durable completion; that error must not bypass current
// grants or erase an outcome that an authorized caller can still receive.
// An empty action uses the original command and requires requester ownership;
// recovery uses its own grant so authorized supervisors can inspect the outcome.
func (s *Service) deliverResult(ctx context.Context, result Result, executionErr error, action string) (Result, error) {
	if result.OperationID == "" {
		return Result{}, executionErr
	}
	p, err := s.principal(ctx)
	if err != nil {
		return Result{}, err
	}
	op, err := s.config.Store.GetOperation(ctx, result.OperationID)
	if err != nil {
		return Result{}, Error(ErrorCode(err))
	}
	if action == "" {
		if op.Principal.ActorID != p.ActorID {
			return Result{}, Error(CodeDenied)
		}
		action = string(op.Result.Kind)
	}
	if s.authorize(ctx, p, AccessRequest{Action: action, Target: op.Target, Operation: &op}) != nil {
		return Result{}, Error(CodeDenied)
	}
	return result, executionErr
}

// ResolveRequestGeneration binds an adapter's generation precondition to the
// first durable request using the same actor/target/command/key. A refreshed form
// may observe a newer generation, but a retry must preserve the original one.
// All other inputs must match. New requests retain their submitted generation;
// Run's atomic claim and generation CAS remain the final authority.
// Direct typed Run callers keep strict fingerprint semantics.
func (s *Service) ResolveRequestGeneration(ctx context.Context, kind Kind, input Input) (Input, error) {
	if kind != Activate && kind != Reset {
		return input, Error(CodeInvalid)
	}
	if err := input.Validate(kind); err != nil {
		return Input{}, err
	}
	p, err := s.principal(ctx)
	if err != nil {
		return Input{}, err
	}
	key := TargetKey{ScopeKey: p.ScopeKey, TargetID: input.TargetID}
	if err = s.authorize(ctx, p, AccessRequest{Action: string(kind), Target: key}); err != nil {
		return Input{}, err
	}
	op, found, err := s.config.Store.LookupRequest(ctx, RequestKey{ActorID: p.ActorID, Target: key, Kind: kind, IdempotencyKey: input.IdempotencyKey})
	if err != nil {
		return Input{}, Error(ErrorCode(err))
	}
	access := AccessRequest{Action: string(kind), Target: key}
	if found {
		if op.Target != key || op.Principal.ActorID != p.ActorID || op.Result.Kind != kind || op.Input.ExpectedGeneration == nil {
			return Input{}, Error(CodeDenied)
		}
		generation := *op.Input.ExpectedGeneration
		input.ExpectedGeneration = &generation
		fingerprint, fingerprintErr := input.Fingerprint(kind)
		if fingerprintErr != nil || fingerprint != op.Fingerprint {
			return Input{}, Error(CodeConflict)
		}
		access.Operation = &op
	}
	if err = s.authorize(ctx, p, access); err != nil {
		return Input{}, err
	}
	return input, nil
}

// AuthorizeView rechecks current target read grants without loading lifecycle
// state. It is suitable for delivery of projections already loaded by the service.
func (s *Service) AuthorizeView(ctx context.Context, targetID string) error {
	p, err := s.principal(ctx)
	if err != nil {
		return err
	}
	return s.authorizeResolved(ctx, p, AccessRequest{Action: "view", Target: TargetKey{ScopeKey: p.ScopeKey, TargetID: targetID}})
}

// AuthorizeAction rechecks current target grants without loading lifecycle
// records. It filters already declared controls; AuthorizeInput and Run still
// enforce ownership, selected input and capabilities before dispatch/effects.
func (s *Service) AuthorizeAction(ctx context.Context, kind Kind, targetID string) error {
	if !kind.Valid() {
		return Error(CodeInvalid)
	}
	p, err := s.principal(ctx)
	if err != nil {
		return err
	}
	return s.authorizeResolved(ctx, p, AccessRequest{Action: string(kind), Target: TargetKey{ScopeKey: p.ScopeKey, TargetID: targetID}})
}

// AuthorizeInput performs no effects. Named factories use it before dispatch;
// typed handlers still enforce policy again at the service boundary.
func (s *Service) AuthorizeInput(ctx context.Context, kind Kind, input Input) error {
	if err := input.Validate(kind); err != nil {
		return err
	}
	p, err := s.principal(ctx)
	if err != nil {
		return err
	}
	key := TargetKey{ScopeKey: p.ScopeKey, TargetID: input.TargetID}
	access := AccessRequest{Action: string(kind), Target: key}
	if kind == Activate || kind == Verify {
		r, e := s.config.Store.GetReceipt(ctx, input.ReceiptID)
		if e != nil {
			return readFailure(ctx, e)
		}
		if r.Target != key {
			return Error(CodeGone)
		}
		access.Receipt = &r
	}
	if kind == Recover {
		if !s.writeReady() {
			return Error(CodeUnavailable)
		}
		op, e := s.config.Store.GetOperation(ctx, input.OperationID)
		if e != nil {
			return readFailure(ctx, e)
		}
		if op.Target != key {
			return Error(CodeGone)
		}
		access.Operation = &op
	}
	if kind == Cancel {
		op, e := s.config.Store.GetOperation(ctx, input.OperationID)
		if e != nil {
			return readFailure(ctx, e)
		}
		if op.Target != key || op.Principal.ActorID != p.ActorID {
			return Error(CodeGone)
		}
		access.Action = string(op.Result.Kind)
		access.Operation = &op
	}
	return s.authorize(ctx, p, access)
}
func (s *Service) run(ctx context.Context, kind Kind, input Input) (Result, error) {
	if err := input.Validate(kind); err != nil {
		return Result{}, err
	}
	input = input.Normalize()
	ctx, cancel := context.WithTimeout(ctx, time.Duration(input.TimeoutSeconds)*time.Second)
	defer cancel()
	p, err := s.principal(ctx)
	if err != nil {
		return Result{}, err
	}
	key := TargetKey{p.ScopeKey, input.TargetID}
	if kind == Cancel {
		return s.cancel(ctx, p, key, input)
	}
	if authErr := s.authorize(ctx, p, AccessRequest{Action: string(kind), Target: key}); authErr != nil {
		return Result{}, authErr
	}
	provider := s.config.Providers[input.Dataset.Provider]
	if provider == nil || !s.operationSupported(kind, input) {
		return Result{}, Error(CodeUnavailable)
	}
	claim, err := s.claimOperation(ctx, p, key, kind, input)
	if err != nil {
		return Result{}, err
	}
	if claim.Replay {
		return claim.Operation.Result, nil
	}
	return s.runClaim(ctx, provider, claim.Operation, p, input, kind)
}

func (s *Service) operationSupported(kind Kind, input Input) bool {
	if kind.Writes() && !input.DryRun && !s.writeReady() {
		return false
	}
	return kind != Reset || s.config.Target.Capabilities().SafeReset
}

func (s *Service) claimOperation(ctx context.Context, p Principal, key TargetKey, kind Kind, input Input) (Claim, error) {
	fingerprint, err := input.Fingerprint(kind)
	if err != nil {
		return Claim{}, err
	}
	proposed := Operation{Result: Result{OperationID: uuid.NewString(), Kind: kind, State: Queued, Revision: 1, Phase: "accepted", DryRun: input.DryRun}, Target: key, Principal: p, Input: input, Fingerprint: fingerprint, CreatedAt: time.Now().UTC()}
	claim, err := s.config.Store.Claim(ctx, proposed)
	if err != nil {
		return Claim{}, Error(ErrorCode(err))
	}
	op := claim.Operation
	if op.Target != key || op.Principal.ActorID != p.ActorID || op.Fingerprint != fingerprint {
		return Claim{}, Error(CodeConflict)
	}
	if err := s.authorize(ctx, p, AccessRequest{Action: string(kind), Target: key, Operation: &op}); err != nil {
		return Claim{}, err
	}
	return claim, nil
}

func (s *Service) runClaim(ctx context.Context, provider Provider, op Operation, principal Principal, input Input, kind Kind) (result Result, runErr error) {
	var lease *Lease
	if kind.Writes() && !input.DryRun {
		got, err := s.config.Store.Acquire(ctx, op.Result.OperationID, op.Target, s.config.LeaseDuration)
		if err != nil {
			return s.finish(ctx, op, nil, err)
		}
		lease = &got
	}
	run := s.newRun(ctx, op, lease)
	defer func() { runErr = errors.Join(runErr, run.release()) }()
	if err := run.update(func(o *Operation) { o.Result.State = Running; o.Result.Phase = "running" }); err != nil {
		return Result{}, Error(ErrorCode(err))
	}
	work := Work{OperationID: op.Result.OperationID, Principal: principal, Input: input, BeforeEffects: run.before, Progress: run.progress}
	if lease != nil {
		work.Lease = run.currentLease()
	}
	return s.executeRun(run, provider, work, kind)
}

func (s *Service) executeRun(run *serviceRun, provider Provider, work Work, kind Kind) (Result, error) {
	err := run.before(run.ctx)
	if err == nil {
		err = validateRunProvider(run, provider, work, kind)
	}
	if err == nil && !work.Input.DryRun && (kind == Prepare || kind == Refresh || kind == Generate) {
		err = validateRunRequirements(run, provider, work)
	}
	var receipt *PreparationReceipt
	if err == nil && (kind == Verify || kind == Activate) {
		receipt, err = s.loadRunReceipt(run, work, kind)
	}
	if err == nil {
		if !work.Input.DryRun && (kind == Activate || kind == Reset) {
			return s.activate(run, work, receipt)
		}
		err = s.executeProviderWork(run, provider, &work, kind, receipt)
	}
	if err == nil {
		err = run.before(run.ctx)
	}
	return run.finish(s.cleanupRunStage(run, work, err))
}

func validateRunProvider(run *serviceRun, provider Provider, work Work, kind Kind) error {
	d, err := provider.Describe(run.ctx, work.Principal, work.Input.Dataset)
	if err != nil {
		return err
	}
	if d.Dataset != work.Input.Dataset || d.ValidateIdentity() != nil {
		return Error(CodeConflict)
	}
	scenarioFound := false
	for _, scenario := range d.Scenarios {
		if scenario == work.Input.Scenario {
			scenarioFound = true
		}
	}
	if !scenarioFound {
		return Error(CodeInvalid)
	}
	if !d.Capabilities[kind].Supported {
		return Error(CodeUnavailable)
	}
	return nil
}

func validateRunRequirements(run *serviceRun, provider Provider, work Work) error {
	checks, providerErr := provider.Validate(run.ctx, work.Principal, work.Input)
	if err := executedChecks(checks); err != nil {
		if providerErr != nil {
			return providerErr
		}
		return err
	}
	// Persist valid executed evidence before deciding whether requirements pass.
	// Failure finalization keeps these checks for lookup and console projections.
	if err := run.update(func(o *Operation) { o.Result.Checks = checks }); err != nil {
		return err
	}
	if providerErr != nil {
		return providerErr
	}
	return passedChecks(checks)
}

func (s *Service) loadRunReceipt(run *serviceRun, work Work, kind Kind) (*PreparationReceipt, error) {
	r, err := s.config.Store.GetReceipt(run.ctx, work.Input.ReceiptID)
	if err != nil {
		return nil, err
	}
	key := run.operation().Target
	if err := s.validateReceipt(work.Principal, key, work.Input, r); err != nil {
		return nil, err
	}
	if err := s.authorize(run.ctx, work.Principal, AccessRequest{Action: string(kind), Target: key, Receipt: &r}); err != nil {
		return nil, err
	}
	if err := s.config.Target.InspectReceipt(run.ctx, r); err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *Service) executeProviderWork(run *serviceRun, provider Provider, work *Work, kind Kind, receipt *PreparationReceipt) error {
	if work.Input.DryRun {
		return s.planProviderWork(run, provider, *work, kind, receipt)
	}
	switch kind {
	case Validate:
		return validateRunRequirements(run, provider, *work)
	case Prepare, Refresh:
		return s.prepareRun(run, provider, work, kind)
	case Verify:
		return s.verifyRun(run, provider, *work, *receipt)
	case Generate:
		return generateRun(run, provider, *work)
	}
	return nil
}

func (s *Service) planProviderWork(run *serviceRun, provider Provider, work Work, kind Kind, receipt *PreparationReceipt) error {
	if kind == Activate || kind == Reset {
		state, err := s.config.Store.Target(run.ctx, run.operation().Target)
		if err != nil {
			return err
		}
		if _, err = nextRunActivation(run.operation(), state, receipt); err != nil {
			return err
		}
	}
	return planRun(run, provider, work, kind)
}

func planRun(run *serviceRun, provider Provider, work Work, kind Kind) error {
	checks, err := provider.Plan(run.ctx, work.Principal, kind, work.Input)
	for _, check := range checks {
		if check.ID == "" || (check.Status != CheckPlanned && check.Status != CheckUnavailable) {
			err = Error(CodeInvalid)
		}
	}
	if err != nil {
		return err
	}
	return run.update(func(o *Operation) { o.Result.Checks = checks; o.Result.Phase = "planned" })
}

func (s *Service) prepareRun(run *serviceRun, provider Provider, work *Work, kind Kind) error {
	work.StageID = uuid.NewString()
	if err := run.update(func(o *Operation) { o.StageID = work.StageID; o.Result.Phase = "preparing" }); err != nil {
		return err
	}
	if err := run.before(run.ctx); err != nil {
		return err
	}
	if err := s.config.Target.Allocate(run.ctx, *work); err != nil {
		return err
	}
	if err := run.before(run.ctx); err != nil {
		return err
	}
	var receipt PreparationReceipt
	var err error
	if kind == Prepare {
		receipt, err = provider.Prepare(run.ctx, *work)
	} else {
		receipt, err = provider.Refresh(run.ctx, *work)
	}
	if err != nil {
		return err
	}
	if receipt.StageID != work.StageID || receipt.Verification != nil {
		return Error(CodeInvalid)
	}
	if err := s.validateReceipt(work.Principal, run.operation().Target, work.Input, receipt); err != nil {
		return err
	}
	return s.persistPreparedReceipt(run, receipt)
}

func (s *Service) persistPreparedReceipt(run *serviceRun, receipt PreparationReceipt) error {
	if err := run.before(run.ctx); err != nil {
		return err
	}
	if err := s.config.Target.InspectReceipt(run.ctx, receipt); err != nil {
		return err
	}
	if err := s.config.Store.PutReceipt(run.ctx, run.currentLease(), receipt); err != nil {
		return err
	}
	return run.update(func(o *Operation) { o.Result.Receipt = &receipt; o.Result.Phase = "prepared" })
}

func (s *Service) verifyRun(run *serviceRun, provider Provider, work Work, receipt PreparationReceipt) error {
	verification, err := provider.Verify(run.ctx, work, receipt)
	if err != nil {
		return err
	}
	if verification.ID == "" || verification.ContentRevision != receipt.ContentRevision {
		return Error(CodeConflict)
	}
	if err := executedChecks(verification.Checks); err != nil {
		return err
	}
	for i := range verification.Artifacts {
		if verification.Artifacts[i].Provider != "" && verification.Artifacts[i].Provider != work.Input.Dataset.Provider {
			return Error(CodeInvalid)
		}
		verification.Artifacts[i].Provider = work.Input.Dataset.Provider
	}
	if err := s.validateArtifacts(work.Principal, run.operation().Target, verification); err != nil {
		return err
	}
	if err := run.before(run.ctx); err != nil {
		return err
	}
	if err := s.config.Target.InspectReceipt(run.ctx, receipt); err != nil {
		return err
	}
	return s.persistVerification(run, receipt, verification)
}

func (s *Service) persistVerification(run *serviceRun, receipt PreparationReceipt, verification VerificationResult) error {
	saved, err := s.config.Store.PutVerification(run.ctx, run.currentLease(), receipt.ID, receipt.ContentRevision, verification)
	if err != nil {
		return err
	}
	return run.update(func(o *Operation) {
		o.Result.Receipt = &saved
		o.Result.Verification = &verification
		o.Result.Phase = "verification_failed"
		if verification.Passed() {
			o.Result.Phase = "verified"
		}
	})
}

func generateRun(run *serviceRun, provider Provider, work Work) error {
	generator, ok := provider.(Generator)
	if !ok {
		return Error(CodeUnavailable)
	}
	ref, err := generator.Generate(run.ctx, work)
	if err != nil {
		return err
	}
	if !ref.Valid() || ref.Provider != work.Input.Dataset.Provider {
		return Error(CodeInvalid)
	}
	return run.update(func(o *Operation) { o.Result.Dataset = &ref; o.Result.Phase = "generated" })
}

func (s *Service) cleanupRunStage(run *serviceRun, work Work, primary error) error {
	if primary == nil || work.StageID == "" {
		return primary
	}
	cleanup, done := context.WithTimeout(context.WithoutCancel(run.ctx), s.config.CleanupTimeout)
	defer done()
	if err := s.config.Store.CheckCleanup(cleanup, run.currentLease(), work.StageID); err != nil {
		return Error(CodeRecovery)
	}
	if err := s.config.Target.DrainCleanup(cleanup, work, work.StageID); err != nil {
		return Error(CodeRecovery)
	}
	return primary
}

func (run *serviceRun) release() error {
	run.stop()
	if run.lease == nil {
		return nil
	}
	cleanup, done := context.WithTimeout(context.WithoutCancel(run.ctx), run.service.config.CleanupTimeout)
	defer done()
	if err := run.service.config.Store.Release(cleanup, run.currentLease()); err != nil {
		return Error(ErrorCode(err))
	}
	return nil
}

func passedChecks(checks []Check) error {
	if err := executedChecks(checks); err != nil {
		return err
	}
	for _, c := range checks {
		if c.Status != CheckPassed {
			return Error(CodeInvalid)
		}
	}
	return nil
}
func executedChecks(checks []Check) error {
	if len(checks) == 0 {
		return Error(CodeInvalid)
	}
	seen := map[string]bool{}
	for _, c := range checks {
		if c.ID == "" || seen[c.ID] || (c.Status != CheckPassed && c.Status != CheckFailed && c.Status != CheckUnavailable) {
			return Error(CodeInvalid)
		}
		seen[c.ID] = true
	}
	return nil
}
func (s *Service) validateReceipt(p Principal, key TargetKey, in Input, r PreparationReceipt) error {
	if !identifier(r.ID) || !identifier(r.StageID) || r.Target != key || r.Dataset != in.Dataset || r.Scenario != in.Scenario || r.RequesterID != p.ActorID || r.ModuleHash != p.ModuleHash || r.PolicyHash != p.PolicyHash || r.PermissionHash != p.PermissionHash || r.ContentRevision == 0 || r.ContentRevision > MaxWireCounter || r.SourceCheckpoint == "" || r.DerivedCheckpoint == "" {
		return Error(CodeConflict)
	}
	return nil
}
func (s *Service) validateArtifacts(p Principal, key TargetKey, v VerificationResult) error {
	for _, a := range v.Artifacts {
		if !identifier(a.ID) || a.Target != key || a.RequesterID != p.ActorID || a.ExpiresAt.IsZero() || !time.Now().Before(a.ExpiresAt) || a.ExpiresAt.After(time.Now().Add(90*24*time.Hour)) {
			return Error(CodeInvalid)
		}
	}
	return nil
}
func (s *Service) cancel(ctx context.Context, p Principal, key TargetKey, in Input) (Result, error) {
	if !s.config.Target.Capabilities().Cancellation {
		return Result{}, Error(CodeUnavailable)
	}
	op, err := s.config.Store.GetOperation(ctx, in.OperationID)
	if err != nil {
		return Result{}, Error(CodeGone)
	}
	if op.Target != key || op.Principal.ActorID != p.ActorID {
		return Result{}, Error(CodeGone)
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: string(op.Result.Kind), Target: key, Operation: &op}); err != nil {
		return Result{}, err
	}
	if op.Result.State.Terminal() {
		return op.Result, nil
	}
	// CAS protects a concurrently committed activation. Retry attaches, not reruns.
	for range 3 {
		next, e := s.config.Store.RequestCancel(ctx, in.OperationID, op.Result.Revision)
		if e == nil {
			return next.Result, nil
		}
		if ErrorCode(e) != CodeConflict {
			return Result{}, Error(ErrorCode(e))
		}
		op, e = s.config.Store.GetOperation(ctx, in.OperationID)
		if e != nil {
			return Result{}, Error(CodeGone)
		}
		if op.Result.State.Terminal() {
			return op.Result, nil
		}
	}
	return Result{}, Error(CodeBusy)
}
func (s *Service) finish(ctx context.Context, op Operation, lease *Lease, err error) (Result, error) {
	op.Result.State = Succeeded
	if err != nil {
		op.Result.State = Failed
		op.Result.Failure = &Failure{Code: ErrorCode(err)}
	}
	saved, e := s.config.Store.Save(ctx, op, op.Result.Revision, lease)
	if e != nil {
		return Result{}, Error(ErrorCode(e))
	}
	return saved.Result, nil
}

type serviceRun struct {
	service           *Service
	ctx               context.Context
	cancel            context.CancelCauseFunc
	mu                sync.Mutex
	op                Operation
	lease             *Lease
	done              chan struct{}
	stopped           chan struct{}
	recoveryPrincipal *Principal
}

func (s *Service) newRun(ctx context.Context, op Operation, lease *Lease) *serviceRun {
	ctx, cancel := context.WithCancelCause(ctx)
	r := &serviceRun{service: s, ctx: ctx, cancel: cancel, op: op, lease: lease, done: make(chan struct{}), stopped: make(chan struct{})}
	if lease == nil {
		close(r.stopped)
		return r
	}
	go func() {
		defer close(r.stopped)
		ticker := time.NewTicker(s.config.LeaseDuration / 3)
		defer ticker.Stop()
		for {
			select {
			case <-r.done:
				return
			case <-ctx.Done():
				return
			case <-ticker.C:
				r.mu.Lock()
				next, err := s.config.Store.Renew(ctx, *r.lease, s.config.LeaseDuration)
				if err == nil {
					*r.lease = next
				}
				r.mu.Unlock()
				if err != nil {
					cancel(Error(CodeLeaseLost))
					return
				}
			}
		}
	}()
	return r
}
func (r *serviceRun) stop() { close(r.done); <-r.stopped; r.cancel(nil) }
func (r *serviceRun) currentLease() Lease {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.lease == nil {
		return Lease{}
	}
	return *r.lease
}
func (r *serviceRun) operation() Operation { r.mu.Lock(); defer r.mu.Unlock(); return r.op }
func (r *serviceRun) before(ctx context.Context) error {
	if cause := context.Cause(r.ctx); cause != nil {
		if ErrorCode(cause) == CodeLeaseLost {
			return Error(CodeLeaseLost)
		}
		return Error(CodeCanceled)
	}
	op := r.operation()
	current, err := r.service.principal(ctx)
	if err != nil || current != op.Principal {
		return Error(CodeDenied)
	}
	if err = r.service.authorize(ctx, current, AccessRequest{Action: string(op.Result.Kind), Target: op.Target, Operation: &op}); err != nil {
		return err
	}
	persisted, err := r.service.config.Store.GetOperation(ctx, op.Result.OperationID)
	if err != nil {
		return err
	}
	if persisted.CancelRequested {
		return Error(CodeCanceled)
	}
	if r.lease != nil {
		return r.service.config.Store.CheckLease(ctx, r.currentLease())
	}
	return nil
}
func (r *serviceRun) update(change func(*Operation)) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for range 3 {
		next := r.op
		change(&next)
		saved, err := r.service.config.Store.Save(r.ctx, next, r.op.Result.Revision, r.lease)
		if err == nil {
			r.op = saved
			return nil
		}
		if ErrorCode(err) != CodeConflict {
			return err
		}
		latest, err := r.service.config.Store.GetOperation(r.ctx, r.op.Result.OperationID)
		if err != nil {
			return err
		}
		r.op = latest
		if latest.Result.State.Terminal() {
			return Error(CodeConflict)
		}
	}
	return Error(CodeBusy)
}
func (r *serviceRun) progress(ctx context.Context, p Progress) error {
	if len(p.Stage) > 128 || p.Completed > p.Total || p.Total >= 1<<53 {
		return Error(CodeInvalid)
	}
	if err := r.before(ctx); err != nil {
		return err
	}
	return r.update(func(o *Operation) { o.Result.Progress = p })
}
func (r *serviceRun) finish(err error) (Result, error) {
	// Persist using a short uncanceled context; a lost fence still fails closed.
	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.ctx), r.service.config.CleanupTimeout)
	defer cancel()
	r.mu.Lock()
	defer r.mu.Unlock()
	for range 3 {
		latest, e := r.service.config.Store.GetOperation(ctx, r.op.Result.OperationID)
		if e != nil {
			return Result{}, Error(ErrorCode(e))
		}
		if latest.Result.State.Terminal() {
			return latest.Result, nil
		}
		if r.recoveryPrincipal != nil {
			latest.RecoveryPrincipal = r.recoveryPrincipal
		}
		if latest.CancelRequested && err == nil {
			err = Error(CodeCanceled)
		}
		latest.Result.State = Succeeded
		if err != nil {
			code := ErrorCode(err)
			latest.Result.Active = false
			latest.Result.Receipt = nil
			latest.Result.Verification = nil
			latest.Result.Activation = nil
			latest.Result.Phase = "failed"
			latest.Result.Failure = &Failure{Code: code}
			latest.Result.State = Failed
			if code == CodeCanceled || errors.Is(err, context.Canceled) {
				latest.Result.State = Canceled
				latest.Result.Phase = "canceled"
			}
			if code == CodeRecovery || code == CodeLeaseLost {
				latest.Result.State = Running
				latest.Result.Phase = "recovering"
				latest.Result.Failure = &Failure{Code: CodeRecovery}
			}
		}
		saved, e := r.service.config.Store.Save(ctx, latest, latest.Result.Revision, r.lease)
		if e == nil {
			r.op = saved
			return saved.Result, nil
		}
		if ErrorCode(e) != CodeConflict {
			return Result{}, Error(ErrorCode(e))
		}
	}
	return Result{}, Error(CodeBusy)
}
func (s *Service) activate(run *serviceRun, work Work, receipt *PreparationReceipt) (Result, error) {
	if err := run.before(run.ctx); err != nil {
		return run.finish(err)
	}
	op := run.operation()
	state, err := s.config.Store.Target(run.ctx, op.Target)
	if err != nil {
		return run.finish(err)
	}
	next, err := nextRunActivation(op, state, receipt)
	if err != nil {
		return run.finish(err)
	}
	intent := Intent{ID: uuid.NewString(), OperationID: op.Result.OperationID, Target: op.Target, Kind: op.Result.Kind, Prior: state.Activation, Next: next, Receipt: receipt, Fence: run.currentLease().Fence}
	if err = s.config.Store.BeginIntent(run.ctx, run.currentLease(), intent, op.Result.Revision); err != nil {
		return run.finish(err)
	}
	// After intent, every failure is reconciled. Cancellation must never cause a
	// committed handover to be reported canceled or release evidence for deletion.
	if err = run.before(run.ctx); err == nil {
		if receipt != nil {
			err = s.config.Target.InspectReceipt(run.ctx, *receipt)
		}
		if err == nil {
			err = s.config.Target.Commit(run.ctx, work, intent)
		}
	}
	return s.reconcile(run, intent, err)
}
func nextRunActivation(op Operation, state TargetState, receipt *PreparationReceipt) (Activation, error) {
	if state.Pending != nil || state.RecoveryRequired {
		return Activation{}, Error(CodeRecovery)
	}
	if state.Activation.Generation != *op.Input.ExpectedGeneration {
		return Activation{}, Error(CodeStale)
	}
	if state.Activation.Generation >= 1<<53-1 {
		return Activation{}, Error(CodeUnavailable)
	}
	next := Activation{Generation: state.Activation.Generation + 1}
	if op.Result.Kind == Activate {
		if receipt == nil || receipt.Verification == nil || !receipt.Verification.Passed() || receipt.Verification.ContentRevision != receipt.ContentRevision {
			return Activation{}, Error(CodeConflict)
		}
		next.ReceiptID = receipt.ID
		next.Ready = true
	}
	return next, nil
}

func (s *Service) reconcile(run *serviceRun, intent Intent, commitErr error) (Result, error) {
	ctx, done := context.WithTimeout(context.WithoutCancel(run.ctx), s.config.CleanupTimeout)
	defer done()
	observation, err := s.config.Target.InspectIntent(ctx, intent)
	if err != nil {
		observation = Observation{}
	}
	observation.Routing = observation.AuthoritativeRouting()
	op, e := s.config.Store.GetOperation(ctx, intent.OperationID)
	if e != nil {
		return Result{}, Error(ErrorCode(e))
	}
	if run.recoveryPrincipal != nil {
		op.RecoveryPrincipal = run.recoveryPrincipal
	}
	op.Result.Failure = nil
	op.Result.Active = false
	switch observation.Routing {
	case RoutingNext:
		op.Result.State = Succeeded
		op.Result.Phase = "activated"
		op.Result.Activation = &intent.Next
		op.Result.Receipt = intent.Receipt
		op.Result.Active = intent.Next.Ready
		if intent.Kind == Reset {
			op.Result.Phase = "reset"
		}
	case RoutingPrior:
		op.Result.State = Failed
		op.Result.Phase = "not_activated"
		code := CodeProvider
		if commitErr != nil {
			code = ErrorCode(commitErr)
		}
		if op.CancelRequested {
			code = CodeCanceled
			op.Result.State = Canceled
		}
		op.Result.Failure = &Failure{Code: code}
	default:
		op.Result.State = Running
		op.Result.Phase = "recovering"
		op.Result.Failure = &Failure{Code: CodeRecovery}
	}
	saved, e := s.config.Store.ResolveIntent(ctx, run.currentLease(), intent, observation, op, op.Result.Revision)
	if e != nil {
		return Result{}, Error(ErrorCode(e))
	}
	return saved.Result, nil
}

// Recover is an explicit authorized supervisor operation, never an implicit UI
// retry. It waits for lease expiry through the store, fences old workers and
// inspects routing. Unknown authority retains the intent and blocks new writes.
func (s *Service) Recover(ctx context.Context, operationID string) (Result, error) {
	if s == nil || ctx == nil {
		return Result{}, Error(CodeUnavailable)
	}
	result, err := s.recover(ctx, operationID)
	return s.deliverResult(ctx, result, err, "recover")
}
func (s *Service) recover(ctx context.Context, operationID string) (result Result, recoverErr error) {
	p, err := s.principal(ctx)
	if err != nil {
		return Result{}, err
	}
	op, err := s.config.Store.GetOperation(ctx, operationID)
	if err != nil {
		return Result{}, Error(CodeGone)
	}
	if err = s.authorize(ctx, p, AccessRequest{Action: "recover", Target: op.Target, Operation: &op}); err != nil {
		return Result{}, err
	}
	if op.Result.State.Terminal() {
		return op.Result, nil
	}
	if !s.writeReady() {
		return Result{}, Error(CodeUnavailable)
	}
	lease, err := s.config.Store.AcquireRecovery(ctx, operationID, op.Target, s.config.LeaseDuration)
	if err != nil {
		return Result{}, Error(ErrorCode(err))
	}
	run := s.newRun(ctx, op, &lease)
	run.recoveryPrincipal = &p
	defer func() { recoverErr = errors.Join(recoverErr, run.release()) }()
	state, err := s.config.Store.Target(ctx, op.Target)
	if err != nil {
		return Result{}, Error(ErrorCode(err))
	}
	if state.Pending != nil {
		if state.Pending.OperationID != operationID {
			return Result{}, Error(CodeRecovery)
		}
		// Recovery performs inspection, not a new Commit. A healthy prior route
		// settles a failed handover; do not leave a recovery_required failure on
		// a terminal operation whose target no longer needs recovery.
		return s.reconcile(run, *state.Pending, nil)
	}
	if op.StageID != "" && op.Result.Receipt == nil {
		work := Work{OperationID: operationID, Principal: p, Input: op.Input, StageID: op.StageID, Lease: lease, BeforeEffects: func(ctx context.Context) error {
			return s.config.Store.CheckCleanup(ctx, run.currentLease(), op.StageID)
		}}
		if err = work.BeforeEffects(ctx); err == nil {
			err = s.config.Target.DrainCleanup(ctx, work, op.StageID)
		}
		if err != nil {
			return run.finish(Error(CodeRecovery))
		}
	}
	// A persisted prepared receipt is preserved, but absence of a terminal commit
	// cannot be presented as completed provider work. Never rerun business effects.
	return run.finish(Error(CodeProvider))
}

// Only an actual denial withdraws a displayed capability. Cancellation keeps
// its cause even when an error chain also carries a gone/denied lifecycle code.
func capabilityPermission(err error) (bool, error) {
	if err == nil {
		return true, nil
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return false, err
	}
	if code := ErrorCode(err); code == CodeDenied || code == CodeGone {
		return false, nil
	}
	return false, err
}
