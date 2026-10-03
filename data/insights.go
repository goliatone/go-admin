package data

import (
	"context"
	"time"
)

const (
	InsightsMaxMetrics    = 16
	InsightsMaxCategories = 32
	InsightsMaxDays       = 90
	InsightsMaxQueries    = 8
	InsightsMaxRecords    = 10000
)

// InsightWindow is inclusive in the metric set's declared timezone. Empty means
// the registered default interval; a browser cannot select arbitrary dimensions.
type InsightWindow struct {
	From  string `json:"from,omitempty"`
	To    string `json:"to,omitempty"`
	Limit int    `json:"limit,omitempty"`
}

func (w InsightWindow) Validate() error {
	if w.Limit < 0 || w.Limit > InsightsMaxCategories || (w.From == "") != (w.To == "") {
		return Error(CodeInvalid)
	}
	if w.From != "" {
		from, e1 := time.Parse("2006-01-02", w.From)
		to, e2 := time.Parse("2006-01-02", w.To)
		if e1 != nil || e2 != nil || to.Before(from) || to.Sub(from)/(24*time.Hour) >= InsightsMaxDays {
			return Error(CodeInvalid)
		}
	}
	return nil
}

// ExploreInsightsQuery reads one registered metric set. An omitted MetricSetID
// selects the provider's first registered set for the selection; the result
// names the set it read, which a comparison must then name explicitly.
type ExploreInsightsQuery struct {
	Selection   ExploreSelection `json:"selection"`
	MetricSetID string           `json:"metric_set_id"`
	InsightWindow
}

func (ExploreInsightsQuery) Type() string { return "data.explore.insights" }
func (q ExploreInsightsQuery) Validate() error {
	if err := q.Selection.Validate(); err != nil {
		return err
	}
	if q.MetricSetID != "" && !exploreID(q.MetricSetID) {
		return Error(CodeInvalid)
	}
	return q.InsightWindow.Validate()
}

type CompareSelectionsQuery struct {
	Left        ExploreSelection `json:"left"`
	Right       ExploreSelection `json:"right"`
	MetricSetID string           `json:"metric_set_id"`
	InsightWindow
}

func (CompareSelectionsQuery) Type() string { return "data.explore.compare" }
func (q CompareSelectionsQuery) Validate() error {
	if err := q.Left.Validate(); err != nil {
		return err
	}
	if err := q.Right.Validate(); err != nil {
		return err
	}
	if !exploreID(q.MetricSetID) {
		return Error(CodeInvalid)
	}
	return q.InsightWindow.Validate()
}

// Definitions are provider registered and must match every returned metric.
// EquivalentSchema certifies equivalent definitions across datasets; empty only
// permits the same exact dataset. Policy includes metric IDs and coverage grants.
type InsightMetricDefinition struct {
	ID         string `json:"id"`
	Label      string `json:"label"`
	Kind       string `json:"kind"`
	Unit       string `json:"unit"`
	Population string `json:"population"`
}
type InsightMetricSet struct {
	ID               string                    `json:"id"`
	EquivalentSchema string                    `json:"equivalent_schema,omitempty"`
	Metrics          []InsightMetricDefinition `json:"metrics"`
	Period           ExplorePeriod             `json:"period"`
	MaxQueries       int                       `json:"max_queries"`
	MaxRecords       int                       `json:"max_records"`
	WorkEvidence     string                    `json:"work_evidence"`
}
type InsightBucket struct {
	ID     string   `json:"id"`
	Label  string   `json:"label"`
	Value  *float64 `json:"value"`
	Status string   `json:"status"`
}
type InsightMetric struct {
	InsightMetricDefinition
	TimeScope      ExplorePeriod   `json:"time_scope"`
	Denominator    *float64        `json:"denominator"`
	Value          *float64        `json:"value"`
	Status         string          `json:"status"`
	Buckets        []InsightBucket `json:"buckets"`
	SamplingMethod string          `json:"sampling_method"`
}

// Coverage evidence must bind the exact selection. Covered-empty additionally
// requires matching passed lifecycle verification; expected dates are uncovered.
type InsightEvidence struct {
	Selection      ExploreSelection `json:"selection"`
	Ref            string           `json:"ref"`
	VerificationID string           `json:"verification_id,omitempty"`
}
type InsightCoverage struct {
	LocalDay string           `json:"local_day"`
	Timezone string           `json:"timezone"`
	Status   string           `json:"status"`
	Evidence *InsightEvidence `json:"evidence"`
	Reason   string           `json:"reason,omitempty"`
}
type InsightWork struct {
	Queries int `json:"queries"`
	Records int `json:"records"`
}
type ExploreInsights struct {
	authorization *insightAuthorization
	ExploreEnvelope
	MetricSetID      string            `json:"metric_set_id"`
	EquivalentSchema string            `json:"equivalent_schema,omitempty"`
	Metrics          []InsightMetric   `json:"metrics"`
	Coverage         []InsightCoverage `json:"coverage"`
	Work             InsightWork       `json:"work"`
}
type InsightMetricComparison struct {
	ID            string         `json:"id"`
	Left          *InsightMetric `json:"left"`
	Right         *InsightMetric `json:"right"`
	Compatibility string         `json:"compatibility"`
	Delta         *float64       `json:"delta"`
	PercentChange *float64       `json:"percent_change"`
	Reason        string         `json:"reason,omitempty"`
}
type InsightDeclarations struct {
	Usages            []ExploreUsage `json:"usages"`
	UsageCompleteness string         `json:"usage_completeness"`
	ExpectedOutcomes  []string       `json:"expected_outcomes"`
}
type SelectionComparison struct {
	Left              ExploreInsights           `json:"left"`
	Right             ExploreInsights           `json:"right"`
	ComparisonID      string                    `json:"comparison_id"`
	ObservedAt        time.Time                 `json:"observed_at"`
	Metrics           []InsightMetricComparison `json:"metrics"`
	LeftDeclarations  InsightDeclarations       `json:"left_declarations"`
	RightDeclarations InsightDeclarations       `json:"right_declarations"`
}

// InsightsProvider is optional alongside ExplorationProvider. Capabilities and
// results are detached, read-only, current-policy filtered and cancellable.
// MaxQueries/Records bound actual domain-query work, not merely returned rows.
// The supplied remaining budget covers the entire request including both sides.
type InsightsProvider interface {
	ExplorationProvider
	InsightMetricSets(context.Context, Principal, ExploreRead) ([]InsightMetricSet, error)
	ExploreInsights(context.Context, Principal, ExploreRead, ExploreInsightsQuery, InsightWork) (ExploreInsights, error)
}

// InsightAuthorizationRevision is required alongside InsightsProvider for safe
// aggregate delivery. The opaque revision covers ALL domain decisions affecting
// this principal's observations: row filters, metrics, coverage and usages across
// every selection. Advance it atomically with policy changes; never reuse an old
// revision (including revoke/restore). Constant revisions are valid only for
// immutable policy. Reads must be bounded, cancellable and observation-only:
// they must not invoke authorization callbacks or mutate any participant's policy.
//
// A host Policy must also implement this interface if its decisions can change
// without changing the principal's current ModuleHash/PolicyHash/PermissionHash.
// Revisions are a coherence fence, never a cached grant. Individual current
// Authorize/AuthorizeExplore checks remain mandatory.
type InsightAuthorizationRevision interface {
	InsightAuthorizationRevision(context.Context, Principal) (string, error)
}

// InsightDeliveryCheck performs the transport's final current host/session check.
// Return its resolved context, derived from the supplied request context, so the
// seal retains any refreshed trusted state and tighter cancellation/deadline.
type InsightDeliveryCheck func(context.Context) (context.Context, error)
