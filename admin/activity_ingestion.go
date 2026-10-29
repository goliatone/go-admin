package admin

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	command "github.com/goliatone/go-command"
	gerrors "github.com/goliatone/go-errors"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

const (
	// ActivityIngestCommandName identifies the inline, service-backed ingestion command.
	ActivityIngestCommandName = "activity.ingest.v1"
	// ActivityIngestionRouteKey is resolved in the effective admin API URLKit group.
	ActivityIngestionRouteKey = "activity.ingest"
	// ActivityIngestionPurpose distinguishes producer credentials from browser sessions.
	ActivityIngestionPurpose = "activity.ingest"
	// ActivityIngestionFingerprintV1 must remain available while v1 receipts are retained.
	ActivityIngestionFingerprintV1    = 1
	ActivityIngestionMaxEnvelopeBytes = 64 * 1024
	ActivityIngestionMaxMetadataBytes = 32 * 1024
	ActivityIngestionMaxStoredBytes   = 36 * 1024
	// ActivityIngestionMaxFractionDigits is the exact PostgreSQL JSONB numeric
	// scale supported by both storage adapters, after removing trailing zeroes.
	ActivityIngestionMaxFractionDigits = 16383
	// ActivityIngestionMaxDepth counts from the event root at 0; metadata starts at 1.
	ActivityIngestionMaxDepth = 16
)

// ActivityIngestionActor describes the initiator, independently of SubjectUserID.
// Kind is user, system or job. Only user actors carry an umbrella UUID ID.
type ActivityIngestionActor struct {
	Kind string `json:"kind"`
	ID   string `json:"id,omitempty"`
}

// ActivityIngestionObject identifies a resource in the producer's authorized namespace.
type ActivityIngestionObject struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

// ActivityIngestionEvent is the single-event wire contract. Scope fields may be
// omitted; only the service can resolve them using shared deployment policy and
// verified bindings. EventID is case-sensitive and unique across a producer.
// Metadata is an object, decoded with exact numbers. Credentials never belong here.
type ActivityIngestionEvent struct {
	SchemaVersion int                     `json:"schema_version"`
	EventID       string                  `json:"event_id"`
	OccurredAt    time.Time               `json:"occurred_at"`
	Scope         ScopeInput              `json:"scope"`
	Actor         ActivityIngestionActor  `json:"actor"`
	SubjectUserID string                  `json:"subject_user_id,omitempty"`
	Action        string                  `json:"action"`
	Object        ActivityIngestionObject `json:"object"`
	Channel       string                  `json:"channel"`
	CorrelationID string                  `json:"correlation_id,omitempty"`
	Metadata      json.RawMessage         `json:"metadata,omitempty"`
}

// ActivityIngestMsg carries no serialized authority. All transports use the same
// event and verified execution context. HTTP uses the flat event envelope.
type ActivityIngestMsg struct {
	Event ActivityIngestionEvent `json:"event"`
}

func (ActivityIngestMsg) Type() string { return ActivityIngestCommandName }

// Validate checks shape and hard bounds, allowing scope omissions and historical
// timestamps. Acceptance-time checks and authority always remain in the service.
func (m ActivityIngestMsg) Validate() error {
	_, err := normalizeActivityIngestionEvent(m.Event)
	return err
}

// ActivityIngestResult is returned only after commit or authorized retained replay.
// A receipt proves historical central acceptance, not remote business success.
type ActivityIngestResult struct {
	ActivityID uuid.UUID  `json:"activity_id"`
	EventID    string     `json:"event_id"`
	Scope      ScopeInput `json:"scope"`
	OccurredAt time.Time  `json:"occurred_at"`
	ReceivedAt time.Time  `json:"received_at"`
	Replayed   bool       `json:"replayed"`
}

// ActivityProducerCredential is transient verifier input; never log or serialize it.
type ActivityProducerCredential struct{ Bearer string }

// ActivityProducerPrincipal contains verified claims, never credential material.
// Verifiers must validate signature/algorithm or active opaque-key registration,
// issuer, audience, dedicated producer purpose, validity and fixed scope bindings.
// Current policy must recheck both ProducerID and CredentialID on every invocation.
type ActivityProducerPrincipal struct {
	ProducerID   string
	CredentialID string
	Issuer       string
	Audience     string
	Purpose      string
	NotBefore    time.Time
	ExpiresAt    time.Time
	Binding      ScopeInput
}

// ActivityProducerVerifier is host-owned authentication, independent of cookies.
// Return ErrActivityIngestionUnauthenticated for invalid credentials and
// ErrActivityIngestionUnavailable for backend outages. Other errors are sanitized.
type ActivityProducerVerifier interface {
	VerifyActivityProducer(context.Context, ActivityProducerCredential) (ActivityProducerPrincipal, error)
}

// ActivityAttributionEvidence binds a verified delegation to one exact scope and actor.
// Purpose must be activity.ingest; Audience/Issuer must match the trusted producer.
type ActivityAttributionEvidence struct {
	ProducerID string
	ActorID    string
	Scope      ScopeInput
	Issuer     string
	Audience   string
	Purpose    string
	NotBefore  time.Time
	ExpiresAt  time.Time
}

// ActivityAttributionVerifier verifies transient actor proof, including issuer,
// audience, purpose and validity. A supplied proof cannot fall back to attestation.
type ActivityAttributionVerifier interface {
	VerifyActivityAttribution(context.Context, ActivityProducerPrincipal, string) (ActivityAttributionEvidence, error)
}

// ActivityIngestionAuthorization is a detached policy input. Event has exact scope.
type ActivityIngestionAuthorization struct {
	Producer ActivityProducerPrincipal
	Evidence *ActivityAttributionEvidence
	Event    ActivityIngestionEvent
}

// ActivityIngestionDecision is authorization, never a replacement event.
type ActivityIngestionDecision struct {
	Allowed                  bool
	AllowProducerAttestation bool
}

// ActivityIngestionPolicy checks live revocation and namespace grants before even
// a private binding lookup, then scope/relationship/actor/subject grants before
// receipt disclosure. Implementations must check CredentialID as well as ProducerID.
type ActivityIngestionPolicy interface {
	CheckActivityProducer(context.Context, ActivityProducerPrincipal, ActivityIngestionEvent) error
	AuthorizeActivityIngestion(context.Context, ActivityIngestionAuthorization) (ActivityIngestionDecision, error)
}

// ActivityIngestionValidation and ActivityIngestionDisclosure run only on new
// acceptance with detached input. They must be pure, bounded, and perform no I/O
// or business effects; a contention retry can invoke them again.
type ActivityIngestionValidation func(context.Context, ActivityIngestionEvent) error
type ActivityIngestionDisclosure func(context.Context, ActivityIngestionEvent) (json.RawMessage, error)

// ActivityIngestionReceipt is a completed atomic receipt. Keep it after activity
// retention; no TTL or cascading deletion may silently remove replay protection.
type ActivityIngestionReceipt struct {
	ProducerID         string
	EventID            string
	Scope              ScopeInput
	FingerprintVersion int
	Fingerprint        string
	ResultVersion      int
	Result             ActivityIngestResult
	ActorKind          string
	Attribution        string
	ActorID            uuid.UUID
	SubjectUserID      uuid.UUID
}

// ActivityIngestionTransaction exposes persistence only. A false Reserve result
// requires the service to reauthorize the winner's binding before Receipt access.
type ActivityIngestionTransaction interface {
	Binding(context.Context, string, string) (*ScopeInput, error)
	Receipt(context.Context, string, string, ScopeInput) (*ActivityIngestionReceipt, error)
	Reserve(context.Context, ActivityIngestionReceipt) (bool, error)
	Append(context.Context, userstypes.ActivityRecord) error
}

// ActivityIngestionStore binds receipts and activity to one durable transaction.
// Binding reveals only a private producer-owned target. WithinTransaction must
// roll back on callback failure and report commit errors. Constructors never DDL.
type ActivityIngestionStore interface {
	CheckReady(context.Context) error
	Binding(context.Context, string, string) (*ScopeInput, error)
	WithinTransaction(context.Context, func(ActivityIngestionTransaction) error) error
}

// ActivityReadIdentity is trusted presentation state from receipt associations.
// It never changes canonical actor or subject IDs, or restores sanitized metadata.
type ActivityReadIdentity struct{ ActorKind string }

// ActivityReadIdentityResolver batches associations for an already authorized
// exact-scope page and fails closed if the persisted identity cannot be verified.
type ActivityReadIdentityResolver interface {
	ResolveActivityReadIdentities(context.Context, ActivityReadContext, []userstypes.ActivityRecord) (map[uuid.UUID]ActivityReadIdentity, error)
}

type activityProducerContextKey struct{}
type activityAttributionContextKey struct{}

// WithVerifiedActivityProducer is a trusted in-process host boundary, not a
// verifier. Call only after authenticating a producer. JSON/headers cannot set it.
func WithVerifiedActivityProducer(ctx context.Context, principal ActivityProducerPrincipal) context.Context {
	return context.WithValue(ctx, activityProducerContextKey{}, principal)
}

// WithVerifiedActivityAttribution installs already verified transient evidence.
func WithVerifiedActivityAttribution(ctx context.Context, evidence ActivityAttributionEvidence) context.Context {
	return context.WithValue(ctx, activityAttributionContextKey{}, evidence)
}

// ActivityProducerFromContext returns only the typed, host-installed principal.
func ActivityProducerFromContext(ctx context.Context) (ActivityProducerPrincipal, bool) {
	if ctx == nil {
		return ActivityProducerPrincipal{}, false
	}
	p, ok := ctx.Value(activityProducerContextKey{}).(ActivityProducerPrincipal)
	return p, ok
}

// Stable safe errors contain no payload, proof, credential or foreign error text.
var (
	ErrActivityIngestionInvalid         = activityIngestionError("INVALID", "invalid activity event", 400, gerrors.CategoryValidation)
	ErrActivityIngestionUnauthenticated = activityIngestionError("UNAUTHENTICATED", "producer authentication required", 401, gerrors.CategoryAuth)
	ErrActivityIngestionForbidden       = activityIngestionError("FORBIDDEN", "activity ingestion denied", 403, gerrors.CategoryAuthz)
	ErrActivityIngestionConflict        = activityIngestionError("CONFLICT", "event identity already accepted with different content", 409, gerrors.CategoryConflict)
	ErrActivityIngestionTooLarge        = activityIngestionError("TOO_LARGE", "activity event exceeds bounds", 413, gerrors.CategoryValidation)
	ErrActivityIngestionMediaType       = activityIngestionError("MEDIA_TYPE", "application/json required", 415, gerrors.CategoryValidation)
	ErrActivityIngestionUnavailable     = activityIngestionError("UNAVAILABLE", "activity ingestion temporarily unavailable", 503, gerrors.CategoryExternal)
	ErrActivityIngestionReplayVersion   = activityIngestionError("REPLAY_VERSION_UNAVAILABLE", "retained replay version unavailable", 503, gerrors.CategoryExternal)
	ErrActivityIngestionInternal        = activityIngestionError("INTERNAL", "activity ingestion failed", 500, gerrors.CategoryInternal)
	// ErrActivityIngestionContention permits at most three whole service attempts.
	ErrActivityIngestionContention = errors.New("activity ingestion transaction contention")
)

func activityIngestionError(code, message string, status int, category gerrors.Category) *gerrors.Error {
	return gerrors.New(message, category).WithTextCode("ACTIVITY_INGEST_" + code).WithCode(status)
}
func activityIngestionNil(v any) bool {
	if v == nil {
		return true
	}
	r := reflect.ValueOf(v)
	switch r.Kind() {
	case reflect.Pointer, reflect.Interface, reflect.Func, reflect.Map, reflect.Slice:
		return r.IsNil()
	}
	return false
}
func validActivityIngestionID(v string, limit int) bool {
	if v == "" || len(v) > limit || !utf8.ValidString(v) || strings.TrimSpace(v) != v {
		return false
	}
	for _, r := range v {
		if unicode.IsControl(r) {
			return false
		}
	}
	return true
}
func activityIngestionUUID(v string, optional bool) (string, error) {
	if v == "" && optional {
		return "", nil
	}
	id, err := uuid.Parse(v)
	if err != nil || id == uuid.Nil {
		return "", ErrActivityIngestionInvalid
	}
	return id.String(), nil
}
func activityIngestionScope(scope ScopeInput, optional bool) (ScopeInput, error) {
	var err error
	scope.TenantID, err = activityIngestionUUID(scope.TenantID, optional)
	if err != nil {
		return ScopeInput{}, err
	}
	scope.OrgID, err = activityIngestionUUID(scope.OrgID, optional)
	return scope, err
}

// ResolveActivityIngestionScope adapts requested targets and verified bindings to
// the shared ScopePolicy. Single-mode defaults fill omissions only; fixed tenant
// and producer bindings reject conflicts. Multi mode never uses global defaults.
func ResolveActivityIngestionScope(policy ScopePolicy, requested, binding ScopeInput) (ScopeInput, error) {
	if err := validateActivityIngestionScopePolicy(policy); err != nil {
		return ScopeInput{}, err
	}
	requested, err := activityIngestionScope(requested, true)
	if err != nil {
		return ScopeInput{}, err
	}
	binding, err = activityIngestionScope(binding, true)
	if err != nil {
		return ScopeInput{}, ErrActivityIngestionForbidden
	}
	if (binding.TenantID != "" && requested.TenantID != "" && requested.TenantID != binding.TenantID) || (binding.OrgID != "" && requested.OrgID != "" && requested.OrgID != binding.OrgID) {
		return ScopeInput{}, ErrActivityIngestionForbidden
	}
	if requested.TenantID == "" {
		requested.TenantID = binding.TenantID
	}
	if requested.OrgID == "" {
		requested.OrgID = binding.OrgID
	}
	if policy.Mode == ScopePolicySingle {
		tenant, _ := activityIngestionUUID(policy.DefaultTenantID, false)
		if requested.TenantID != "" && requested.TenantID != tenant {
			return ScopeInput{}, ErrActivityIngestionForbidden
		}
		// Reuse central effective-scope defaulting with no request or browser context.
		a := &Admin{config: Config{ScopeMode: string(policy.Mode), DefaultTenantID: tenant, DefaultOrgID: policy.DefaultOrgID}}
		resolved := a.EffectiveScope(context.Background(), requested)
		requested = ScopeInput{TenantID: resolved.TenantID, OrgID: resolved.OrgID}
	}
	return activityIngestionScope(requested, false)
}
func validateActivityIngestionScopePolicy(p ScopePolicy) error {
	if p.Mode == ScopePolicyMulti {
		return nil
	}
	if p.Mode != ScopePolicySingle {
		return ErrActivityIngestionUnavailable
	}
	if _, err := activityIngestionUUID(p.DefaultTenantID, false); err != nil {
		return ErrActivityIngestionUnavailable
	}
	if _, err := activityIngestionUUID(p.DefaultOrgID, true); err != nil {
		return ErrActivityIngestionUnavailable
	}
	return nil
}

func checkActivityIngestionDispatch(ctx context.Context) error {
	if ctx == nil {
		ctx = context.Background()
	}
	opts, _ := command.DispatchOptionsFromContext(ctx)
	if (opts.Mode != "" && opts.Mode != command.ExecutionModeInline) || opts.Delay != 0 || opts.RunAt != nil || opts.IdempotencyKey != "" || (opts.DedupPolicy != "" && opts.DedupPolicy != command.DedupPolicyIgnore) {
		return ErrActivityIngestionInvalid
	}
	return nil
}

// DispatchActivityIngestion is the supported typed adapter entry. It rejects
// inherited queue/delay/dedup options before executor selection, then dispatches
// through the registered command and requires its committed typed result.
func DispatchActivityIngestion(ctx context.Context, bus *CommandBus, msg ActivityIngestMsg) (ActivityIngestResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := checkActivityIngestionDispatch(ctx); err != nil {
		return ActivityIngestResult{}, err
	}
	event, err := normalizeActivityIngestionEvent(msg.Event)
	if err != nil {
		return ActivityIngestResult{}, err
	}
	raw, err := json.Marshal(event)
	if err != nil {
		return ActivityIngestResult{}, ErrActivityIngestionInvalid
	}
	value, err := decodeActivityIngestionJSON(raw, ActivityIngestionMaxEnvelopeBytes, false)
	if err != nil {
		return ActivityIngestResult{}, err
	}
	outcome, err := bus.DispatchByNameWithOutcome(ctx, ActivityIngestCommandName, value.(map[string]any), nil, command.DispatchOptions{Mode: command.ExecutionModeInline})
	if err != nil {
		return ActivityIngestResult{}, err
	}
	result, ok := outcome.Result.(ActivityIngestResult)
	if !ok {
		return ActivityIngestResult{}, ErrActivityIngestionUnavailable
	}
	return result, nil
}

func validateActivityProducer(p ActivityProducerPrincipal, issuer, audience string, now time.Time) error {
	if !validActivityIngestionID(p.ProducerID, 128) || !validActivityIngestionID(p.CredentialID, 128) || p.Issuer != issuer || p.Audience != audience || p.Purpose != ActivityIngestionPurpose || !activityIngestionValidInterval(now, p.NotBefore, p.ExpiresAt) {
		return ErrActivityIngestionUnauthenticated
	}
	if _, err := activityIngestionScope(p.Binding, true); err != nil {
		return ErrActivityIngestionUnauthenticated
	}
	return nil
}
func validateActivityAttribution(e ActivityAttributionEvidence, p ActivityProducerPrincipal, event ActivityIngestionEvent, now time.Time) error {
	scope, err := activityIngestionScope(e.Scope, false)
	if err != nil {
		return ErrActivityIngestionForbidden
	}
	actor, err := activityIngestionUUID(e.ActorID, false)
	if err != nil {
		return ErrActivityIngestionForbidden
	}
	if event.Actor.Kind != "user" || actor != event.Actor.ID || scope != event.Scope || e.ProducerID != p.ProducerID || e.Issuer != p.Issuer || e.Audience != p.Audience || e.Purpose != ActivityIngestionPurpose || !activityIngestionValidInterval(now, e.NotBefore, e.ExpiresAt) {
		return ErrActivityIngestionForbidden
	}
	return nil
}
