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
	TenantID string
	OrgID    string
}

// Handler owns workflow-specific finalization and failure behavior.
type Handler interface {
	Finalize(ctx context.Context, effect Record, result DispatchResult) error
	Fail(ctx context.Context, effect Record, result DispatchResult, nextRetryAt *time.Time) error
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

// Prepare creates or replays a durable effect row by idempotency key.
func (s Service) Prepare(ctx context.Context, scope Scope, record Record) (Record, bool, error) {
	if s.store == nil {
		return Record{}, false, nil
	}
	record.TenantID = strings.TrimSpace(scope.TenantID)
	record.OrgID = strings.TrimSpace(scope.OrgID)
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
	if record.Status == StatusFinalized || record.Status == StatusAborted {
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
	if record.AttemptCount < 1 {
		record.AttemptCount = 1
	}
	switch eval.Outcome {
	case OutcomeCompleted:
		record.Status = StatusFinalized
		record.FinalizedAt = &now
		record.ErrorJSON = ""
		saved, saveErr := s.store.SaveGuardedEffect(ctx, scope, record)
		if saveErr != nil {
			return Record{}, saveErr
		}
		if handler != nil {
			if err := handler.Finalize(ctx, saved, result); err != nil {
				return Record{}, err
			}
		}
		return saved, nil
	default:
		record.ErrorJSON = eval.Reason
		record.RetryAt = nextRetryAt
		if nextRetryAt != nil {
			record.Status = StatusRetrying
		} else {
			record.Status = StatusDeadLettered
		}
		saved, saveErr := s.store.SaveGuardedEffect(ctx, scope, record)
		if saveErr != nil {
			return Record{}, saveErr
		}
		if handler != nil {
			if err := handler.Fail(ctx, saved, result, nextRetryAt); err != nil {
				return Record{}, err
			}
		}
		return saved, nil
	}
}
