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
	ResolverID string  `json:"resolver_id"`
	Accuracy   float64 `json:"accuracy"`
	Cost       float64 `json:"cost"`
	Latency    float64 `json:"latency"`
	Supported  bool    `json:"supported"`
	Reason     string  `json:"reason"`
}

// ResolverScore captures final weighted ranking score metadata.
type ResolverScore struct {
	ResolverID string  `json:"resolver_id"`
	Accuracy   float64 `json:"accuracy"`
	Cost       float64 `json:"cost"`
	Latency    float64 `json:"latency"`
	Score      float64 `json:"score"`
	Supported  bool    `json:"supported"`
	Reason     string  `json:"reason"`
}

// ScoringWeights controls weighted utility ranking.
type ScoringWeights struct {
	Accuracy float64 `json:"accuracy"`
	Cost     float64 `json:"cost"`
	Latency  float64 `json:"latency"`
}

// ExecutionLimits controls max budget/time constraints for a run.
type ExecutionLimits struct {
	MaxBudget float64       `json:"max_budget"`
	MaxTime   time.Duration `json:"max_time"`
}

// Policy is the effective placement policy applied to a run.
type Policy struct {
	EnabledResolvers []string        `json:"enabled_resolvers"`
	HardOrder        []string        `json:"hard_order"`
	Weights          ScoringWeights  `json:"weights"`
	Limits           ExecutionLimits `json:"limits"`
}

// ResolveResult captures resolver output and optional short-circuit directives.
type ResolveResult struct {
	Suggestions             []Suggestion `json:"suggestions"`
	UnresolvedDefinitionIDs []string     `json:"unresolved_definition_i_ds"`
	Terminate               bool         `json:"terminate"`
	TerminationReason       string       `json:"termination_reason"`
}

// Run captures full run telemetry and merged suggestions.
type Run struct {
	ID                      string          `json:"id"`
	AgreementID             string          `json:"agreement_id"`
	Status                  string          `json:"status"`
	ReasonCode              string          `json:"reason_code"`
	Policy                  Policy          `json:"policy"`
	ResolverOrder           []string        `json:"resolver_order"`
	ExecutedResolvers       []string        `json:"executed_resolvers"`
	Estimates               []Estimate      `json:"estimates"`
	Scores                  []ResolverScore `json:"scores"`
	Suggestions             []Suggestion    `json:"suggestions"`
	UnresolvedDefinitionIDs []string        `json:"unresolved_definition_i_ds"`
	SelectedSource          string          `json:"selected_source"`
	BudgetUsed              float64         `json:"budget_used"`
	Elapsed                 time.Duration   `json:"elapsed"`
	CreatedByUserID         string          `json:"created_by_user_id"`
	CreatedAt               time.Time       `json:"created_at"`
	CompletedAt             time.Time       `json:"completed_at"`
}
