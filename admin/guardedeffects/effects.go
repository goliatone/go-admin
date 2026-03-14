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
	EffectID            string
	TenantID            string
	OrgID               string
	Kind                string
	GroupType           string
	GroupID             string
	SubjectType         string
	SubjectID           string
	IdempotencyKey      string
	CorrelationID       string
	Status              string
	AttemptCount        int
	MaxAttempts         int
	GuardPolicy         string
	PreparePayloadJSON  string
	DispatchPayloadJSON string
	ResultPayloadJSON   string
	ErrorJSON           string
	DispatchID          string
	CreatedAt           time.Time
	UpdatedAt           time.Time
	DispatchedAt        *time.Time
	FinalizedAt         *time.Time
	AbortedAt           *time.Time
	RetryAt             *time.Time
}

// DispatchResult is the structured external-effect completion signal consumed by effect finalizers.
type DispatchResult struct {
	Outcome           string
	DispatchID        string
	ProviderMessageID string
	MetadataJSON      string
	OccurredAt        time.Time
}

// Evaluation captures completion-policy output.
type Evaluation struct {
	Outcome string
	Reason  string
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
