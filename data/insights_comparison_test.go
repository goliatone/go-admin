package data

import "testing"

func TestInsightCompatibilityReasons(t *testing.T) {
	value, denominator := float64(3), float64(3)
	metric := InsightMetric{InsightMetricDefinition: InsightMetricDefinition{ID: "orders", Kind: "count", Unit: "orders", Population: "scenario"}, Value: &value, Status: "known", TimeScope: ExplorePeriod{Start: "2026-01-01", End: "2026-01-01", Timezone: "UTC"}, SamplingMethod: "complete"}
	side := ExploreInsights{ExploreEnvelope: ExploreEnvelope{Provenance: "observed", Completeness: "complete"}, Metrics: []InsightMetric{metric}}
	for _, test := range []struct {
		name, reason string
		edit         func(*ExploreInsights)
	}{
		{"compatible", "", func(*ExploreInsights) {}},
		{"example", "not_observed", func(s *ExploreInsights) { s.Provenance = "example" }},
		{"expected", "not_observed", func(s *ExploreInsights) { s.Provenance = "expected" }},
		{"unit", "unit_mismatch", func(s *ExploreInsights) { s.Metrics[0].Unit = "USD" }},
		{"population", "population_mismatch", func(s *ExploreInsights) { s.Metrics[0].Population = "catalog" }},
		{"sample", "population_mismatch", func(s *ExploreInsights) { s.Metrics[0].SamplingMethod = "sample" }},
		{"timezone", "time_scope_mismatch", func(s *ExploreInsights) { s.Metrics[0].TimeScope.Timezone = "America/Los_Angeles" }},
		{"interval", "time_scope_mismatch", func(s *ExploreInsights) { s.Metrics[0].TimeScope.End = "2026-01-02" }},
		{"partial", "partial_population", func(s *ExploreInsights) { s.Completeness = "partial" }},
		{"unknown", "unknown_value", func(s *ExploreInsights) { s.Metrics[0].Status = "unknown"; s.Metrics[0].Value = nil }},
		{"missing", "missing_metric", func(s *ExploreInsights) { s.Metrics = nil }},
		{"suppressed", "policy_suppressed", func(s *ExploreInsights) { s.Metrics[0].Status = "suppressed"; s.Metrics[0].Value = nil }},
		{"different dataset", "uncertified_schema", func(s *ExploreInsights) { s.Selection.Dataset.ID = "different" }},
	} {
		t.Run(test.name, func(t *testing.T) {
			right := side
			right.Metrics = append([]InsightMetric(nil), side.Metrics...)
			test.edit(&right)
			out := compareInsightMetric("orders", side, right)
			if out.Reason != test.reason || test.reason != "" && out.Delta != nil || test.reason == "" && (out.Delta == nil || *out.Delta != 0) {
				t.Fatal(out)
			}
			if test.reason == "policy_suppressed" && (out.Left != nil || out.Right != nil) {
				t.Fatal(out)
			}
		})
	}
	left := side
	left.Metrics = append([]InsightMetric(nil), side.Metrics...)
	left.Metrics[0].Kind = "distribution"
	left.Metrics[0].Denominator = &denominator
	right := left
	right.Metrics = append([]InsightMetric(nil), left.Metrics...)
	right.Metrics[0].Denominator = nil
	if out := compareInsightMetric("orders", left, right); out.Delta != nil || out.Reason != "denominator_mismatch" {
		t.Fatal(out)
	}
	right = side
	right.Selection.Dataset.ID = "other"
	right.EquivalentSchema = "orders-v1"
	left = side
	left.EquivalentSchema = "orders-v1"
	if out := compareInsightMetric("orders", left, right); out.Delta == nil {
		t.Fatal("certified equivalent definitions", out)
	}
}
