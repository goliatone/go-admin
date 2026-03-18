package guardedeffects

import (
	"strings"
	"time"
)

const (
	StatusPrepared     = "prepared"
	StatusDispatching  = "dispatching"
	StatusGuardPending = "guard_pending"
	StatusFinalized    = "finalized"
	StatusRetrying     = "retrying"
	StatusAborted      = "aborted"
	StatusDeadLettered = "dead_lettered"

	OutcomeCompleted = "completed"
	OutcomePending   = "pending"
	OutcomeFailed    = "failed"

	PolicySMTPAccepted = "smtp_accepted"
)

// Record is the durable lifecycle boundary for a guarded external effect.
type Record struct {
	EffectID            string     `json:"effect_id"`
	TenantID            string     `json:"tenant_id"`
	OrgID               string     `json:"org_id"`
	Kind                string     `json:"kind"`
	GroupType           string     `json:"group_type"`
	GroupID             string     `json:"group_id"`
	SubjectType         string     `json:"subject_type"`
	SubjectID           string     `json:"subject_id"`
	IdempotencyKey      string     `json:"idempotency_key"`
	CorrelationID       string     `json:"correlation_id"`
	Status              string     `json:"status"`
	AttemptCount        int        `json:"attempt_count"`
	MaxAttempts         int        `json:"max_attempts"`
	GuardPolicy         string     `json:"guard_policy"`
	PreparePayloadJSON  string     `json:"prepare_payload_json"`
	DispatchPayloadJSON string     `json:"dispatch_payload_json"`
	ResultPayloadJSON   string     `json:"result_payload_json"`
	ErrorJSON           string     `json:"error_json"`
	DispatchID          string     `json:"dispatch_id"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	DispatchedAt        *time.Time `json:"dispatched_at"`
	FinalizedAt         *time.Time `json:"finalized_at"`
	AbortedAt           *time.Time `json:"aborted_at"`
	RetryAt             *time.Time `json:"retry_at"`
}

// DispatchResult is the structured external-effect completion signal consumed by effect finalizers.
type DispatchResult struct {
	Outcome           string    `json:"outcome"`
	DispatchID        string    `json:"dispatch_id"`
	ProviderMessageID string    `json:"provider_message_id"`
	MetadataJSON      string    `json:"metadata_json"`
	OccurredAt        time.Time `json:"occurred_at"`
}

// Evaluation captures completion-policy output.
type Evaluation struct {
	Outcome string `json:"outcome"`
	Reason  string `json:"reason"`
}

// CompletionPolicy classifies one dispatch result.
type CompletionPolicy interface {
	Name() string
	EvaluateDispatchResult(result DispatchResult) Evaluation
}

// SMTPAcceptedPolicy treats provider acceptance as the completion boundary.
type SMTPAcceptedPolicy struct{}

func (SMTPAcceptedPolicy) Name() string {
	return PolicySMTPAccepted
}

func (SMTPAcceptedPolicy) EvaluateDispatchResult(result DispatchResult) Evaluation {
	switch strings.ToLower(strings.TrimSpace(result.Outcome)) {
	case OutcomeCompleted:
		return Evaluation{Outcome: OutcomeCompleted}
	case OutcomePending:
		return Evaluation{Outcome: OutcomePending}
	default:
		reason := strings.TrimSpace(result.MetadataJSON)
		if reason == "" {
			reason = "dispatch failed"
		}
		return Evaluation{Outcome: OutcomeFailed, Reason: reason}
	}
}

func NormalizeStatus(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case StatusPrepared:
		return StatusPrepared
	case StatusDispatching:
		return StatusDispatching
	case StatusGuardPending:
		return StatusGuardPending
	case StatusFinalized:
		return StatusFinalized
	case StatusRetrying:
		return StatusRetrying
	case StatusAborted:
		return StatusAborted
	case StatusDeadLettered:
		return StatusDeadLettered
	default:
		return StatusPrepared
	}
}

func NormalizeOutcome(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case OutcomeCompleted:
		return OutcomeCompleted
	case OutcomePending:
		return OutcomePending
	default:
		return OutcomeFailed
	}
}
