package guardedeffects

import (
	"context"
	"strings"
	"time"
)

// Store is the durable persistence boundary required by the guarded effect service.
type Store interface {
	SaveGuardedEffect(ctx context.Context, scope Scope, record Record) (Record, error)
	GetGuardedEffect(ctx context.Context, effectID string) (Record, error)
	GetGuardedEffectByIdempotencyKey(ctx context.Context, scope Scope, key string) (Record, error)
}

// Scope identifies the tenant/org boundary used for idempotency and persistence.
type Scope struct {
	TenantID string `json:"tenant_id"`
	OrgID    string `json:"org_id"`
}

// Handler owns workflow-specific finalization and failure behavior.
type Handler interface {
	Finalize(ctx context.Context, effect Record, result DispatchResult) error
	Fail(ctx context.Context, effect Record, result DispatchResult, nextRetryAt *time.Time) error
}

// PendingHandler receives provider-accepted, not-yet-final outcomes.
type PendingHandler interface {
	Pending(ctx context.Context, effect Record, result DispatchResult) error
}

// AbortHandler receives explicit effect-abort lifecycle events.
type AbortHandler interface {
	Abort(ctx context.Context, effect Record, reason string) error
}

// Service coordinates durable status changes around guarded external effects.
type Service struct {
	store Store
	now   func() time.Time
}

// NewService builds a guarded effect lifecycle coordinator.
func NewService(store Store, now func() time.Time) Service {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return Service{store: store, now: now}
}

func isTerminalStatus(status string) bool {
	switch NormalizeStatus(status) {
	case StatusFinalized, StatusAborted, StatusDeadLettered:
		return true
	default:
		return false
	}
}

// Prepare creates or replays a durable effect row by idempotency key.
func (s Service) Prepare(ctx context.Context, scope Scope, record Record) (Record, bool, error) {
	if s.store == nil {
		return Record{}, false, nil
	}
	record.TenantID = strings.TrimSpace(scope.TenantID)
	record.OrgID = strings.TrimSpace(scope.OrgID)
	record.GroupType = strings.TrimSpace(record.GroupType)
	record.GroupID = strings.TrimSpace(record.GroupID)
	record.Status = NormalizeStatus(record.Status)
	if record.CreatedAt.IsZero() {
		record.CreatedAt = s.now().UTC()
	}
	if record.UpdatedAt.IsZero() {
		record.UpdatedAt = record.CreatedAt
	}
	if key := strings.TrimSpace(record.IdempotencyKey); key != "" {
		existing, err := s.store.GetGuardedEffectByIdempotencyKey(ctx, scope, key)
		if err == nil {
			return existing, true, nil
		}
	}
	saved, err := s.store.SaveGuardedEffect(ctx, scope, record)
	return saved, false, err
}

// MarkDispatching records the start of a real provider dispatch attempt.
func (s Service) MarkDispatching(
	ctx context.Context,
	scope Scope,
	effectID string,
	dispatchID string,
) (Record, error) {
	if s.store == nil {
		return Record{}, nil
	}
	record, err := s.store.GetGuardedEffect(ctx, effectID)
	if err != nil {
		return Record{}, err
	}
	if isTerminalStatus(record.Status) {
		return record, nil
	}
	now := s.now().UTC()
	record.Status = StatusDispatching
	record.DispatchID = strings.TrimSpace(dispatchID)
	record.AttemptCount++
	record.DispatchedAt = &now
	record.RetryAt = nil
	record.UpdatedAt = now
	return s.store.SaveGuardedEffect(ctx, scope, record)
}

// Complete applies one dispatch result and delegates workflow-specific finalize/failure handling.
func (s Service) Complete(
	ctx context.Context,
	scope Scope,
	effectID string,
	policy CompletionPolicy,
	result DispatchResult,
	nextRetryAt *time.Time,
	handler Handler,
) (Record, error) {
	if s.store == nil {
		return Record{}, nil
	}
	record, err := s.store.GetGuardedEffect(ctx, effectID)
	if err != nil {
		return Record{}, err
	}
	if isTerminalStatus(record.Status) {
		return record, nil
	}
	if policy == nil {
		policy = SMTPAcceptedPolicy{}
	}
	eval := policy.EvaluateDispatchResult(result)
	now := s.now().UTC()
	record.DispatchID = strings.TrimSpace(result.DispatchID)
	record.ResultPayloadJSON = strings.TrimSpace(result.MetadataJSON)
	record.UpdatedAt = now
	switch eval.Outcome {
	case OutcomeCompleted:
		return s.completeFinalized(ctx, scope, record, now, result, handler)
	case OutcomePending:
		return s.completePending(ctx, scope, record, result, handler)
	default:
		return s.completeFailed(ctx, scope, record, eval.Reason, result, nextRetryAt, handler)
	}
}

func (s Service) completeFinalized(ctx context.Context, scope Scope, record Record, now time.Time, result DispatchResult, handler Handler) (Record, error) {
	record.Status = StatusFinalized
	record.FinalizedAt = &now
	record.AbortedAt = nil
	record.ErrorJSON = ""
	record.RetryAt = nil
	saved, err := s.store.SaveGuardedEffect(ctx, scope, record)
	if err != nil {
		return Record{}, err
	}
	if handler != nil {
		if err := handler.Finalize(ctx, saved, result); err != nil {
			return Record{}, err
		}
	}
	return saved, nil
}

func (s Service) completePending(ctx context.Context, scope Scope, record Record, result DispatchResult, handler Handler) (Record, error) {
	record.Status = StatusGuardPending
	record.ErrorJSON = ""
	record.RetryAt = nil
	saved, err := s.store.SaveGuardedEffect(ctx, scope, record)
	if err != nil {
		return Record{}, err
	}
	if pendingHandler, ok := handler.(PendingHandler); ok {
		if err := pendingHandler.Pending(ctx, saved, result); err != nil {
			return Record{}, err
		}
	}
	return saved, nil
}

func (s Service) completeFailed(ctx context.Context, scope Scope, record Record, reason string, result DispatchResult, nextRetryAt *time.Time, handler Handler) (Record, error) {
	record.ErrorJSON = reason
	record.RetryAt = nextRetryAt
	if nextRetryAt != nil {
		record.Status = StatusRetrying
	} else {
		record.Status = StatusDeadLettered
	}
	saved, err := s.store.SaveGuardedEffect(ctx, scope, record)
	if err != nil {
		return Record{}, err
	}
	if handler != nil {
		if err := handler.Fail(ctx, saved, result, nextRetryAt); err != nil {
			return Record{}, err
		}
	}
	return saved, nil
}

// Abort moves an effect into an explicit aborted terminal state.
func (s Service) Abort(
	ctx context.Context,
	scope Scope,
	effectID string,
	reason string,
	handler Handler,
) (Record, error) {
	if s.store == nil {
		return Record{}, nil
	}
	record, err := s.store.GetGuardedEffect(ctx, effectID)
	if err != nil {
		return Record{}, err
	}
	if isTerminalStatus(record.Status) {
		return record, nil
	}
	now := s.now().UTC()
	record.Status = StatusAborted
	record.AbortedAt = &now
	record.RetryAt = nil
	record.ErrorJSON = strings.TrimSpace(reason)
	record.UpdatedAt = now
	saved, saveErr := s.store.SaveGuardedEffect(ctx, scope, record)
	if saveErr != nil {
		return Record{}, saveErr
	}
	if abortHandler, ok := handler.(AbortHandler); ok {
		if err := abortHandler.Abort(ctx, saved, strings.TrimSpace(reason)); err != nil {
			return Record{}, err
		}
	}
	return saved, nil
}
