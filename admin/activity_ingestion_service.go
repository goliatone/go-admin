package admin

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

// ActivityIngestionConfig supplies mandatory host authority and shared scope
// policy. Issuer/Audience are the verifier's trusted producer domain. Zero limits
// use hard defaults; lower limits are supported. Configure before concurrent use.
type ActivityIngestionConfig struct {
	Store            ActivityIngestionStore
	Policy           ActivityIngestionPolicy
	ScopePolicy      ScopePolicy
	Issuer           string
	Audience         string
	MaxEnvelopeBytes int
	MaxMetadataBytes int
	MaxFutureSkew    time.Duration
	ValidateEvent    ActivityIngestionValidation
	Disclose         ActivityIngestionDisclosure
	Observe          func(context.Context, ActivityIngestionObservation)
	Clock            func() time.Time
}

// ActivityIngestionObservation reports only safe outcome/code, never an event or
// credentials. Observers are best effort, must not recurse into ingestion, and
// cannot turn committed acceptance into failure (including observer panics).
type ActivityIngestionObservation struct {
	Outcome string
	Code    string
}

// ActivityIngestionService owns authority, canonical mapping, disclosure and the
// atomic acceptance/replay workflow. Direct Ingest calls require the same verified
// context and current policy as commands; no router or browser context is used.
type ActivityIngestionService struct{ config ActivityIngestionConfig }

// NewActivityIngestionService validates dependencies/configuration without DDL.
// Call CheckReady after migrations and before exposing any transport.
func NewActivityIngestionService(cfg ActivityIngestionConfig) (*ActivityIngestionService, error) {
	if activityIngestionNil(cfg.Store) || activityIngestionNil(cfg.Policy) || !validActivityIngestionID(cfg.Issuer, 256) || !validActivityIngestionID(cfg.Audience, 256) {
		return nil, ErrActivityIngestionUnavailable
	}
	if err := validateActivityIngestionScopePolicy(cfg.ScopePolicy); err != nil {
		return nil, err
	}
	if cfg.MaxEnvelopeBytes == 0 {
		cfg.MaxEnvelopeBytes = ActivityIngestionMaxEnvelopeBytes
	}
	if cfg.MaxMetadataBytes == 0 {
		cfg.MaxMetadataBytes = ActivityIngestionMaxMetadataBytes
	}
	if cfg.MaxFutureSkew == 0 {
		cfg.MaxFutureSkew = 5 * time.Minute
	}
	if cfg.MaxEnvelopeBytes < 1 || cfg.MaxEnvelopeBytes > ActivityIngestionMaxEnvelopeBytes || cfg.MaxMetadataBytes < 2 || cfg.MaxMetadataBytes > ActivityIngestionMaxMetadataBytes || cfg.MaxFutureSkew < 0 {
		return nil, ErrActivityIngestionUnavailable
	}
	if cfg.Clock == nil {
		cfg.Clock = time.Now
	}
	return &ActivityIngestionService{config: cfg}, nil
}

// CheckReady probes the configured durable store; it never repairs schema.
func (s *ActivityIngestionService) CheckReady(ctx context.Context) error {
	if s == nil {
		return ErrActivityIngestionUnavailable
	}
	if err := s.config.Store.CheckReady(ctx); err != nil {
		return ErrActivityIngestionUnavailable
	}
	return nil
}

// Ingest returns a durable result only after commit or authorized retained replay.
// At most three whole transactions are attempted for recognized contention.
// Retrying uncertain outcomes with the same producer event ID is safe.
func (s *ActivityIngestionService) Ingest(ctx context.Context, input ActivityIngestionEvent) (result ActivityIngestResult, err error) {
	if s == nil {
		return result, ErrActivityIngestionUnavailable
	}
	if ctx == nil {
		ctx = context.Background()
	}
	defer func() { s.observe(ctx, result, err) }()
	if err = checkActivityIngestionDispatch(ctx); err != nil {
		return result, err
	}
	event, err := s.normalizeEvent(input)
	if err != nil {
		return result, err
	}
	p, ok := ActivityProducerFromContext(ctx)
	if !ok {
		return result, ErrActivityIngestionUnauthenticated
	}
	for range 3 {
		result, err = s.ingestAttempt(ctx, p, event)
		if !errors.Is(err, ErrActivityIngestionContention) {
			return result, err
		}
	}
	return ActivityIngestResult{}, ErrActivityIngestionUnavailable
}

func (s *ActivityIngestionService) normalizeEvent(input ActivityIngestionEvent) (ActivityIngestionEvent, error) {
	event, err := normalizeActivityIngestionEvent(input)
	if err != nil {
		return event, err
	}
	raw, err := json.Marshal(event)
	if err != nil {
		return event, ErrActivityIngestionInvalid
	}
	if len(raw) > s.config.MaxEnvelopeBytes || len(event.Metadata) > s.config.MaxMetadataBytes {
		return event, ErrActivityIngestionTooLarge
	}
	return event, nil
}

func (s *ActivityIngestionService) ingestAttempt(ctx context.Context, p ActivityProducerPrincipal, event ActivityIngestionEvent) (ActivityIngestResult, error) {
	if ctx.Err() != nil {
		return ActivityIngestResult{}, ErrActivityIngestionUnavailable
	}
	now := s.config.Clock().UTC().Truncate(time.Microsecond)
	if err := validateActivityProducer(p, s.config.Issuer, s.config.Audience, now); err != nil {
		return ActivityIngestResult{}, err
	}
	if err := s.config.Policy.CheckActivityProducer(ctx, p, cloneActivityIngestionEvent(event)); err != nil {
		return ActivityIngestResult{}, safeActivityAuthorityError(err)
	}
	binding, err := s.config.Store.Binding(ctx, p.ProducerID, event.EventID)
	if err != nil {
		return ActivityIngestResult{}, ErrActivityIngestionUnavailable
	}
	resolved, attribution, err := s.resolveAuthorizedEvent(ctx, p, event, binding, now)
	if err != nil {
		return ActivityIngestResult{}, err
	}
	receipt, err := newActivityIngestionReceipt(p, resolved, attribution, now)
	if err != nil {
		return ActivityIngestResult{}, err
	}
	var result ActivityIngestResult
	err = s.config.Store.WithinTransaction(ctx, func(tx ActivityIngestionTransaction) error {
		var writeErr error
		result, writeErr = s.writeIngestion(ctx, tx, resolved, receipt, binding != nil)
		return writeErr
	})
	if err == nil {
		return result, nil
	}
	// A candidate result is not durable until the transaction commits.
	if errors.Is(err, ErrActivityIngestionContention) {
		return ActivityIngestResult{}, ErrActivityIngestionContention
	}
	return ActivityIngestResult{}, safeActivityStorageError(err)
}

func (s *ActivityIngestionService) resolveAuthorizedEvent(ctx context.Context, p ActivityProducerPrincipal, event ActivityIngestionEvent, binding *ScopeInput, now time.Time) (ActivityIngestionEvent, string, error) {
	resolved := event
	targetConflict := false
	if binding != nil {
		// Stored targets are private until current authorization succeeds. Requested
		// differences never allocate a second identity or reveal the stored target.
		targetConflict = (event.Scope.TenantID != "" && event.Scope.TenantID != binding.TenantID) || (event.Scope.OrgID != "" && event.Scope.OrgID != binding.OrgID)
		resolved.Scope = *binding
	}
	var err error
	resolved.Scope, err = ResolveActivityIngestionScope(s.config.ScopePolicy, resolved.Scope, p.Binding)
	if err != nil {
		return resolved, "", err
	}
	attribution, err := s.authorize(ctx, p, resolved, now)
	if err != nil {
		return resolved, "", err
	}
	if targetConflict {
		return resolved, "", ErrActivityIngestionConflict
	}
	return resolved, attribution, nil
}

func newActivityIngestionReceipt(p ActivityProducerPrincipal, event ActivityIngestionEvent, attribution string, now time.Time) (ActivityIngestionReceipt, error) {
	fingerprint, err := ActivityIngestionFingerprint(event, ActivityIngestionFingerprintV1)
	if err != nil {
		return ActivityIngestionReceipt{}, err
	}
	candidate := ActivityIngestResult{ActivityID: uuid.New(), EventID: event.EventID, Scope: event.Scope, OccurredAt: event.OccurredAt, ReceivedAt: now}
	receipt := ActivityIngestionReceipt{ProducerID: p.ProducerID, EventID: event.EventID, Scope: event.Scope, FingerprintVersion: ActivityIngestionFingerprintV1, Fingerprint: fingerprint, ResultVersion: 1, Result: candidate, ActorKind: event.Actor.Kind, Attribution: attribution}
	if event.Actor.ID != "" {
		receipt.ActorID = uuid.MustParse(event.Actor.ID)
	}
	if event.SubjectUserID != "" {
		receipt.SubjectUserID = uuid.MustParse(event.SubjectUserID)
	}
	return receipt, nil
}

func (s *ActivityIngestionService) writeIngestion(ctx context.Context, tx ActivityIngestionTransaction, event ActivityIngestionEvent, receipt ActivityIngestionReceipt, bound bool) (ActivityIngestResult, error) {
	inserted, err := tx.Reserve(ctx, receipt)
	if err != nil {
		return ActivityIngestResult{}, err
	}
	if !inserted {
		return replayActivityIngestion(ctx, tx, event, receipt.ProducerID, bound)
	}
	// Receipts must not disappear between binding and reserve (unsupported prune).
	if bound {
		return ActivityIngestResult{}, ErrActivityIngestionUnavailable
	}
	if event.OccurredAt.After(receipt.Result.ReceivedAt.Add(s.config.MaxFutureSkew)) {
		return ActivityIngestResult{}, ErrActivityIngestionInvalid
	}
	if s.config.ValidateEvent != nil {
		if err = s.config.ValidateEvent(ctx, cloneActivityIngestionEvent(event)); err != nil {
			return ActivityIngestResult{}, ErrActivityIngestionInvalid
		}
	}
	data, err := s.disclose(ctx, event, receipt)
	if err != nil {
		return ActivityIngestResult{}, err
	}
	record := types.ActivityRecord{ID: receipt.Result.ActivityID, ActorID: receipt.ActorID, UserID: receipt.SubjectUserID, TenantID: uuid.MustParse(event.Scope.TenantID), OrgID: uuid.MustParse(event.Scope.OrgID), Verb: event.Action, ObjectType: event.Object.Type, ObjectID: event.Object.ID, Channel: event.Channel, OccurredAt: event.OccurredAt, Data: data}
	if err = tx.Append(ctx, record); err != nil {
		return ActivityIngestResult{}, err
	}
	return receipt.Result, nil
}

func replayActivityIngestion(ctx context.Context, tx ActivityIngestionTransaction, event ActivityIngestionEvent, producerID string, bound bool) (ActivityIngestResult, error) {
	// A concurrent winner first discovered inside this transaction requires a
	// fresh outer binding/authorization pass; never authorize via its full receipt.
	if !bound {
		return ActivityIngestResult{}, ErrActivityIngestionContention
	}
	stored, err := tx.Receipt(ctx, producerID, event.EventID, event.Scope)
	if err != nil {
		return ActivityIngestResult{}, err
	}
	if stored == nil {
		return ActivityIngestResult{}, ErrActivityIngestionUnavailable
	}
	if stored.ResultVersion != 1 {
		return ActivityIngestResult{}, ErrActivityIngestionReplayVersion
	}
	expected, err := ActivityIngestionFingerprint(event, stored.FingerprintVersion)
	if err != nil {
		return ActivityIngestResult{}, err
	}
	if expected != stored.Fingerprint {
		return ActivityIngestResult{}, ErrActivityIngestionConflict
	}
	result := stored.Result
	result.Replayed = true
	return result, nil
}

func (s *ActivityIngestionService) authorize(ctx context.Context, p ActivityProducerPrincipal, event ActivityIngestionEvent, now time.Time) (string, error) {
	var evidence *ActivityAttributionEvidence
	if e, ok := ctx.Value(activityAttributionContextKey{}).(ActivityAttributionEvidence); ok {
		if err := validateActivityAttribution(e, p, event, now); err != nil {
			return "", err
		}
		evidence = &e
	}
	decision, err := s.config.Policy.AuthorizeActivityIngestion(ctx, ActivityIngestionAuthorization{Producer: p, Evidence: evidence, Event: cloneActivityIngestionEvent(event)})
	if err != nil {
		return "", safeActivityAuthorityError(err)
	}
	if !decision.Allowed {
		return "", ErrActivityIngestionForbidden
	}
	if event.Actor.Kind != "user" {
		return event.Actor.Kind, nil
	}
	if evidence != nil {
		return "delegated", nil
	}
	if !decision.AllowProducerAttestation {
		return "", ErrActivityIngestionForbidden
	}
	return "producer_attested", nil
}
func (s *ActivityIngestionService) disclose(ctx context.Context, event ActivityIngestionEvent, r ActivityIngestionReceipt) (map[string]any, error) {
	raw := json.RawMessage(`{}`)
	var err error
	if s.config.Disclose != nil {
		raw, err = s.config.Disclose(ctx, cloneActivityIngestionEvent(event))
		if err != nil {
			return nil, ErrActivityIngestionInvalid
		}
	}
	// A nil disclosure result means drop metadata, not an unbounded native object.
	if len(raw) == 0 {
		raw = json.RawMessage(`{}`)
	}
	value, err := decodeActivityIngestionMetadata(raw, s.config.MaxMetadataBytes)
	if err != nil {
		return nil, err
	}
	data, ok := value.(map[string]any)
	if !ok {
		return nil, ErrActivityIngestionInvalid
	}
	data["_ingestion"] = map[string]any{"producer_id": r.ProducerID, "event_id": r.EventID, "schema_version": 1, "received_at": r.Result.ReceivedAt.Format(time.RFC3339Nano), "attribution": r.Attribution}
	if event.Actor.Kind != "user" {
		data[ActivityActorTypeKey] = event.Actor.Kind
	}
	if _, err = encodeActivityIngestionJSON(data, ActivityIngestionMaxStoredBytes, false); err != nil {
		return nil, err
	}
	return data, nil
}
func safeActivityAuthorityError(err error) error {
	for _, safe := range []error{ErrActivityIngestionUnauthenticated, ErrActivityIngestionForbidden} {
		if errors.Is(err, safe) {
			return safe
		}
	}
	return ErrActivityIngestionUnavailable
}
func safeActivityStorageError(err error) error {
	for _, safe := range []error{ErrActivityIngestionInvalid, ErrActivityIngestionTooLarge, ErrActivityIngestionForbidden, ErrActivityIngestionConflict, ErrActivityIngestionReplayVersion} {
		if errors.Is(err, safe) {
			return safe
		}
	}
	return ErrActivityIngestionUnavailable
}
func (s *ActivityIngestionService) observe(ctx context.Context, result ActivityIngestResult, err error) {
	if s.config.Observe == nil {
		return
	}
	defer func() {
		if recover() != nil {
			// Observation is best effort and cannot change the committed outcome.
			return
		}
	}()
	observation := ActivityIngestionObservation{Outcome: "accepted"}
	if err != nil {
		observation.Outcome = "failed"
		switch {
		case errors.Is(err, ErrActivityIngestionConflict):
			observation.Outcome = "conflicting"
		case errors.Is(err, ErrActivityIngestionInvalid), errors.Is(err, ErrActivityIngestionForbidden), errors.Is(err, ErrActivityIngestionUnauthenticated), errors.Is(err, ErrActivityIngestionTooLarge):
			observation.Outcome = "rejected"
		}
		observation.Code = activityIngestionSafeCode(err)
	} else if result.Replayed {
		observation.Outcome = "replayed"
	}
	s.config.Observe(ctx, observation)
}
func activityIngestionSafeCode(err error) string {
	// Codes are selected from local sentinels only.
	for _, entry := range []struct {
		err  error
		code string
	}{
		{ErrActivityIngestionInvalid, "ACTIVITY_INGEST_INVALID"},
		{ErrActivityIngestionUnauthenticated, "ACTIVITY_INGEST_UNAUTHENTICATED"},
		{ErrActivityIngestionForbidden, "ACTIVITY_INGEST_FORBIDDEN"},
		{ErrActivityIngestionConflict, "ACTIVITY_INGEST_CONFLICT"},
		{ErrActivityIngestionTooLarge, "ACTIVITY_INGEST_TOO_LARGE"},
		{ErrActivityIngestionMediaType, "ACTIVITY_INGEST_MEDIA_TYPE"},
		{ErrActivityIngestionUnavailable, "ACTIVITY_INGEST_UNAVAILABLE"},
		{ErrActivityIngestionReplayVersion, "ACTIVITY_INGEST_REPLAY_VERSION_UNAVAILABLE"},
	} {
		if errors.Is(err, entry.err) {
			return entry.code
		}
	}
	return "ACTIVITY_INGEST_INTERNAL"
}
