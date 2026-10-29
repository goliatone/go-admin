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
	event, err := normalizeActivityIngestionEvent(input)
	if err != nil {
		return result, err
	}
	raw, _ := json.Marshal(event)
	if len(raw) > s.config.MaxEnvelopeBytes || len(event.Metadata) > s.config.MaxMetadataBytes {
		return result, ErrActivityIngestionTooLarge
	}
	p, ok := ActivityProducerFromContext(ctx)
	if !ok {
		return result, ErrActivityIngestionUnauthenticated
	}
	for attempt := 0; attempt < 3; attempt++ {
		if ctx.Err() != nil {
			return ActivityIngestResult{}, ErrActivityIngestionUnavailable
		}
		now := s.config.Clock().UTC().Truncate(time.Microsecond)
		if err = validateActivityProducer(p, s.config.Issuer, s.config.Audience, now); err != nil {
			return ActivityIngestResult{}, err
		}
		if err = s.config.Policy.CheckActivityProducer(ctx, p, cloneActivityIngestionEvent(event)); err != nil {
			return ActivityIngestResult{}, safeActivityAuthorityError(err)
		}
		binding, err := s.config.Store.Binding(ctx, p.ProducerID, event.EventID)
		if err != nil {
			return ActivityIngestResult{}, ErrActivityIngestionUnavailable
		}
		resolved := event
		targetConflict := false
		if binding != nil {
			// Stored targets are private until current authorization succeeds. Requested
			// differences never allocate a second identity or reveal the stored target.
			targetConflict = (event.Scope.TenantID != "" && event.Scope.TenantID != binding.TenantID) || (event.Scope.OrgID != "" && event.Scope.OrgID != binding.OrgID)
			resolved.Scope = *binding
		}
		resolved.Scope, err = ResolveActivityIngestionScope(s.config.ScopePolicy, resolved.Scope, p.Binding)
		if err != nil {
			return ActivityIngestResult{}, err
		}
		attribution, err := s.authorize(ctx, p, resolved, now)
		if err != nil {
			return ActivityIngestResult{}, err
		}
		if targetConflict {
			return ActivityIngestResult{}, ErrActivityIngestionConflict
		}
		fingerprint, err := ActivityIngestionFingerprint(resolved, ActivityIngestionFingerprintV1)
		if err != nil {
			return ActivityIngestResult{}, err
		}
		candidate := ActivityIngestResult{ActivityID: uuid.New(), EventID: resolved.EventID, Scope: resolved.Scope, OccurredAt: resolved.OccurredAt, ReceivedAt: now}
		receipt := ActivityIngestionReceipt{ProducerID: p.ProducerID, EventID: resolved.EventID, Scope: resolved.Scope, FingerprintVersion: ActivityIngestionFingerprintV1, Fingerprint: fingerprint, ResultVersion: 1, Result: candidate, ActorKind: resolved.Actor.Kind, Attribution: attribution}
		if resolved.Actor.ID != "" {
			receipt.ActorID = uuid.MustParse(resolved.Actor.ID)
		}
		if resolved.SubjectUserID != "" {
			receipt.SubjectUserID = uuid.MustParse(resolved.SubjectUserID)
		}
		err = s.config.Store.WithinTransaction(ctx, func(tx ActivityIngestionTransaction) error {
			inserted, err := tx.Reserve(ctx, receipt)
			if err != nil {
				return err
			}
			if !inserted {
				// A concurrent winner first discovered inside this transaction requires a
				// fresh outer binding/authorization pass; never authorize via its full receipt.
				if binding == nil {
					return ErrActivityIngestionContention
				}
				stored, err := tx.Receipt(ctx, p.ProducerID, resolved.EventID, resolved.Scope)
				if err != nil {
					return err
				}
				if stored == nil {
					return ErrActivityIngestionUnavailable
				}
				if stored.ResultVersion != 1 {
					return ErrActivityIngestionReplayVersion
				}
				expected, err := ActivityIngestionFingerprint(resolved, stored.FingerprintVersion)
				if err != nil {
					return err
				}
				if expected != stored.Fingerprint {
					return ErrActivityIngestionConflict
				}
				result = stored.Result
				result.Replayed = true
				return nil
			}
			// Receipts must not disappear between binding and reserve (unsupported prune).
			if binding != nil {
				return ErrActivityIngestionUnavailable
			}
			if resolved.OccurredAt.After(now.Add(s.config.MaxFutureSkew)) {
				return ErrActivityIngestionInvalid
			}
			if s.config.ValidateEvent != nil {
				if err = s.config.ValidateEvent(ctx, cloneActivityIngestionEvent(resolved)); err != nil {
					return ErrActivityIngestionInvalid
				}
			}
			data, err := s.disclose(ctx, resolved, receipt)
			if err != nil {
				return err
			}
			record := types.ActivityRecord{ID: candidate.ActivityID, ActorID: receipt.ActorID, UserID: receipt.SubjectUserID, TenantID: uuid.MustParse(resolved.Scope.TenantID), OrgID: uuid.MustParse(resolved.Scope.OrgID), Verb: resolved.Action, ObjectType: resolved.Object.Type, ObjectID: resolved.Object.ID, Channel: resolved.Channel, OccurredAt: resolved.OccurredAt, Data: data}
			if err = tx.Append(ctx, record); err != nil {
				return err
			}
			result = candidate
			return nil
		})
		if err == nil {
			return result, nil
		}
		result = ActivityIngestResult{}
		if errors.Is(err, ErrActivityIngestionContention) {
			continue
		}
		return result, safeActivityStorageError(err)
	}
	return ActivityIngestResult{}, ErrActivityIngestionUnavailable
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
	defer func() { _ = recover() }()
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
	for _, safe := range []error{ErrActivityIngestionInvalid, ErrActivityIngestionUnauthenticated, ErrActivityIngestionForbidden, ErrActivityIngestionConflict, ErrActivityIngestionTooLarge, ErrActivityIngestionMediaType, ErrActivityIngestionUnavailable, ErrActivityIngestionReplayVersion} {
		if errors.Is(err, safe) {
			switch safe {
			case ErrActivityIngestionInvalid:
				return "ACTIVITY_INGEST_INVALID"
			case ErrActivityIngestionUnauthenticated:
				return "ACTIVITY_INGEST_UNAUTHENTICATED"
			case ErrActivityIngestionForbidden:
				return "ACTIVITY_INGEST_FORBIDDEN"
			case ErrActivityIngestionConflict:
				return "ACTIVITY_INGEST_CONFLICT"
			case ErrActivityIngestionTooLarge:
				return "ACTIVITY_INGEST_TOO_LARGE"
			case ErrActivityIngestionMediaType:
				return "ACTIVITY_INGEST_MEDIA_TYPE"
			case ErrActivityIngestionReplayVersion:
				return "ACTIVITY_INGEST_REPLAY_VERSION_UNAVAILABLE"
			default:
				return "ACTIVITY_INGEST_UNAVAILABLE"
			}
		}
	}
	return "ACTIVITY_INGEST_INTERNAL"
}
