package data

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math"
	"slices"
	"time"
)

func (s *Service) CompareSelections(ctx context.Context, q CompareSelectionsQuery) (SelectionComparison, error) {
	if err := q.Validate(); err != nil {
		return SelectionComparison{}, err
	}
	if ctx == nil {
		return SelectionComparison{}, Error(CodeDenied)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	q.Left = cloneExploreSelection(q.Left)
	q.Right = cloneExploreSelection(q.Right)
	fence, err := s.beginInsightAuthorization(ctx, q.Left, q.Right)
	if err != nil {
		return SelectionComparison{}, err
	}
	// Bind and authorize BOTH before any aggregate query is issued.
	left, err := s.bindExplore(ctx, q.Left)
	if err != nil {
		return SelectionComparison{}, err
	}
	right, err := s.bindExplore(ctx, q.Right)
	if err != nil {
		return SelectionComparison{}, err
	}
	if left.principal != right.principal {
		return SelectionComparison{}, Error(CodeDenied)
	}
	fence.bind(left, right)
	budget := InsightWork{Queries: InsightsMaxQueries, Records: InsightsMaxRecords}
	l, la, err := s.readInsights(ctx, left, ExploreInsightsQuery{Selection: q.Left, MetricSetID: q.MetricSetID, InsightWindow: q.InsightWindow}, &budget, fence != nil)
	if err != nil {
		return SelectionComparison{}, err
	}
	r, ra, err := s.readInsights(ctx, right, ExploreInsightsQuery{Selection: q.Right, MetricSetID: q.MetricSetID, InsightWindow: q.InsightWindow}, &budget, fence != nil)
	if err != nil {
		return SelectionComparison{}, err
	}
	out := SelectionComparison{Left: l, Right: r, ObservedAt: time.Now().UTC(), Metrics: []InsightMetricComparison{}}
	out.Left.authorization, out.Right.authorization = fence, fence
	if err = s.populateFencedComparison(ctx, &out, &la, &ra, fence != nil); err != nil {
		return SelectionComparison{}, err
	}
	out.ComparisonID, err = insightComparisonID(q.Left, q.Right, out.ObservedAt)
	if err != nil {
		return SelectionComparison{}, err
	}
	if err = boundedExplore(out, ExploreMaxResponseBytes); err != nil {
		return SelectionComparison{}, err
	}
	if err = s.deliverInsightGroup(ctx, []exploreBinding{left, right}, []ExploreAccess{la, ra}); err != nil {
		return SelectionComparison{}, err
	}
	if err = s.ValidateInsightsDelivery(ctx, []ExploreInsights{out.Left, out.Right}); err != nil {
		return SelectionComparison{}, err
	}
	return out, nil
}
func (s *Service) populateFencedComparison(ctx context.Context, out *SelectionComparison, la, ra *ExploreAccess, fenced bool) error {
	if fenced {
		return s.populateComparison(ctx, out, la, ra)
	}
	out.LeftDeclarations = InsightDeclarations{UsageCompleteness: "unknown", Usages: []ExploreUsage{}, ExpectedOutcomes: []string{}}
	out.RightDeclarations = out.LeftDeclarations
	return nil
}
func insightDeclarations(m ExploreMetadata) InsightDeclarations {
	out := InsightDeclarations{Usages: m.Usages, UsageCompleteness: m.UsageCompleteness, ExpectedOutcomes: []string{}}
	for _, scenario := range m.Scenarios {
		if scenario.Scenario == m.Selection.Scenario {
			out.ExpectedOutcomes = append(out.ExpectedOutcomes, scenario.ExpectedOutcomes...)
		}
	}
	return out
}
func compareInsightMetric(id string, l, r ExploreInsights) InsightMetricComparison {
	out := InsightMetricComparison{ID: id, Compatibility: "incompatible"}
	for _, m := range l.Metrics {
		if m.ID == id {
			copy := m
			out.Left = &copy
		}
	}
	for _, m := range r.Metrics {
		if m.ID == id {
			copy := m
			out.Right = &copy
		}
	}
	out.Reason = insightOperandReason(out.Left, out.Right, l, r)
	if out.Reason == "policy_suppressed" {
		out.Left = nil
		out.Right = nil
	}
	if out.Reason != "" {
		return out
	}
	delta := *out.Right.Value - *out.Left.Value
	if !insightNumber(&delta) {
		out.Reason = "numeric_range"
		return out
	}
	out.Compatibility = "comparable"
	out.Delta = &delta
	out.PercentChange, out.Reason = insightPercent(delta, *out.Left.Value)

	return out
}

func insightComparisonID(left, right ExploreSelection, at time.Time) (string, error) {
	wire, err := json.Marshal(struct {
		Left, Right ExploreSelection
		At          time.Time
	}{left, right, at})
	if err != nil {
		return "", Error(CodeProvider)
	}
	hash := sha256.Sum256(wire)
	return hex.EncodeToString(hash[:]), nil
}
func (s *Service) populateComparison(ctx context.Context, out *SelectionComparison, la, ra *ExploreAccess) error {
	// Suppression removes both operands and sibling totals, coverage and declarations.
	if out.Left.State == ExploreSuppressed || out.Right.State == ExploreSuppressed {
		suppressInsights(&out.Left)
		suppressInsights(&out.Right)
		out.LeftDeclarations = InsightDeclarations{UsageCompleteness: "unknown", Usages: []ExploreUsage{}, ExpectedOutcomes: []string{}}
		out.RightDeclarations = out.LeftDeclarations
		return nil
	}
	lm, err := s.ExploreMetadata(ctx, ExploreMetadataQuery{Selection: out.Left.Selection})
	if err != nil {
		return err
	}
	rm, err := s.ExploreMetadata(ctx, ExploreMetadataQuery{Selection: out.Right.Selection})
	if err != nil {
		return err
	}
	if !insightPresentationMatches(out.Left, lm) || !insightPresentationMatches(out.Right, rm) {
		return Error(CodeStale)
	}
	out.LeftDeclarations = insightDeclarations(lm)
	out.RightDeclarations = insightDeclarations(rm)
	for _, u := range lm.Usages {
		la.SurfaceIDs = append(la.SurfaceIDs, u.SurfaceID)
	}
	for _, u := range rm.Usages {
		ra.SurfaceIDs = append(ra.SurfaceIDs, u.SurfaceID)
	}
	out.Metrics = compareInsightMetrics(out.Left, out.Right)
	return nil
}
func insightPresentationMatches(side ExploreInsights, metadata ExploreMetadata) bool {
	return side.State == ExploreUnsupported || side.PresentationRevision == metadata.PresentationRevision
}
func compareInsightMetrics(l, r ExploreInsights) []InsightMetricComparison {
	ids := []string{}
	for _, m := range l.Metrics {
		ids = append(ids, m.ID)
	}
	for _, m := range r.Metrics {
		if !slices.Contains(ids, m.ID) {
			ids = append(ids, m.ID)
		}
	}
	result := []InsightMetricComparison{}
	for _, id := range ids {
		result = append(result, compareInsightMetric(id, l, r))
	}
	return result
}

func insightOperandReason(a, b *InsightMetric, l, r ExploreInsights) string {
	switch {
	case a == nil || b == nil:
		return "missing_metric"
	case a.Status == "suppressed" || b.Status == "suppressed":
		return "policy_suppressed"
	case a.Status != "known" || b.Status != "known":
		return "unknown_value"
	case l.Provenance != "observed" || r.Provenance != "observed":
		return "not_observed"
	case l.Completeness != "complete" || r.Completeness != "complete":
		return "partial_population"
	}
	return insightDefinitionReason(*a, *b, l, r)
}
func insightDefinitionReason(a, b InsightMetric, l, r ExploreInsights) string {
	if l.Selection.Dataset != r.Selection.Dataset && (l.EquivalentSchema == "" || l.EquivalentSchema != r.EquivalentSchema) {
		return "uncertified_schema"
	}
	if a.Kind != b.Kind || a.Unit != b.Unit {
		return "unit_mismatch"
	}
	if a.Population != b.Population || a.SamplingMethod != b.SamplingMethod {
		return "population_mismatch"
	}
	if a.TimeScope != b.TimeScope {
		return "time_scope_mismatch"
	}
	if a.Kind == "distribution" && !insightDenominatorsMatch(a, b) {
		return "denominator_mismatch"
	}
	return ""
}
func insightDenominatorsMatch(a, b InsightMetric) bool {
	return a.Denominator != nil && b.Denominator != nil && *a.Denominator == *b.Denominator
}
func insightPercent(delta, baseline float64) (*float64, string) {
	if baseline == 0 {
		return nil, "zero_baseline"
	}
	percent := delta / math.Abs(baseline) * 100
	if !insightNumber(&percent) {
		return nil, "percentage_unavailable"
	}
	return &percent, ""
}
