package models

import "time"

const (
	RunStatusCompleted       = "completed"
	RunStatusPartial         = "partial"
	RunStatusBudgetExhausted = "budget_exhausted"
	RunStatusTimedOut        = "timed_out"
	RunStatusFailed          = "failed"
)

const (
	RunReasonResolvedAll       = "resolved_all"
	RunReasonUnresolvedFields  = "unresolved_fields"
	RunReasonBudgetExhausted   = "budget_exhausted"
	RunReasonTimedOut          = "timed_out"
	RunReasonResolverError     = "resolver_error"
	RunReasonResolverShortStop = "resolver_short_circuit"
)

// Estimate captures pre-execution resolver quality/cost/latency estimates.
type Estimate struct {
	ResolverID string
	Accuracy   float64
	Cost       float64
	Latency    float64
	Supported  bool
	Reason     string
}

// ResolverScore captures final weighted ranking score metadata.
type ResolverScore struct {
	ResolverID string
	Accuracy   float64
	Cost       float64
	Latency    float64
	Score      float64
	Supported  bool
	Reason     string
}

// ScoringWeights controls weighted utility ranking.
type ScoringWeights struct {
	Accuracy float64
	Cost     float64
	Latency  float64
}

// ExecutionLimits controls max budget/time constraints for a run.
type ExecutionLimits struct {
	MaxBudget float64
	MaxTime   time.Duration
}

// Policy is the effective placement policy applied to a run.
type Policy struct {
	EnabledResolvers []string
	HardOrder        []string
	Weights          ScoringWeights
	Limits           ExecutionLimits
}

// ResolveResult captures resolver output and optional short-circuit directives.
type ResolveResult struct {
	Suggestions             []Suggestion
	UnresolvedDefinitionIDs []string
	Terminate               bool
	TerminationReason       string
}

// Run captures full run telemetry and merged suggestions.
type Run struct {
	ID                      string
	AgreementID             string
	Status                  string
	ReasonCode              string
	Policy                  Policy
	ResolverOrder           []string
	ExecutedResolvers       []string
	Estimates               []Estimate
	Scores                  []ResolverScore
	Suggestions             []Suggestion
	UnresolvedDefinitionIDs []string
	SelectedSource          string
	BudgetUsed              float64
	Elapsed                 time.Duration
	CreatedByUserID         string
	CreatedAt               time.Time
	CompletedAt             time.Time
}
