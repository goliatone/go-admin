package data_test

import (
	"encoding/json"
	"github.com/goliatone/go-admin/data"
	"os"
	"strings"
	"testing"
)

func TestInsightsQueryBounds(t *testing.T) {
	f := newFixture(t)
	q := data.ExploreInsightsQuery{Selection: catalogSelection(f), MetricSetID: "orders"}
	if err := q.Validate(); err != nil {
		t.Fatal(err)
	}
	for _, w := range []data.InsightWindow{{From: "2026-01-01"}, {From: "2026-01-02", To: "2026-01-01"}, {From: "2026-01-01", To: "2026-04-01"}, {Limit: 33}, {From: "2026-02-30", To: "2026-03-01"}} {
		q.InsightWindow = w
		if q.Validate() == nil {
			t.Fatal(w)
		}
	}
	q.InsightWindow = data.InsightWindow{From: "2026-01-01", To: "2026-03-31", Limit: 32}
	if err := q.Validate(); err != nil {
		t.Fatal(err)
	}
	// An omitted metric set is valid for one selection (the provider's default
	// set); a malformed one is not, and a comparison always names its set.
	q.MetricSetID = ""
	if err := q.Validate(); err != nil {
		t.Fatal(err)
	}
	q.MetricSetID = " orders"
	if q.Validate() == nil {
		t.Fatal("malformed metric set")
	}
	q.MetricSetID = "orders"
	if (data.CompareSelectionsQuery{Left: q.Selection, Right: q.Selection}).Validate() == nil {
		t.Fatal("comparison without a metric set")
	}
	compare := data.CompareSelectionsQuery{Left: q.Selection, Right: q.Selection, MetricSetID: "orders"}
	if err := compare.Validate(); err != nil {
		t.Fatal(err)
	}
	compare.Right.Context = "production"
	if compare.Validate() == nil {
		t.Fatal("invalid second side")
	}
}
func TestInsightsNullableWireFixture(t *testing.T) {
	raw, err := os.ReadFile("testdata/insights-contract.json")
	if err != nil {
		t.Fatal(err)
	}
	var result data.ExploreInsights
	if err = json.Unmarshal(raw, &result); err != nil {
		t.Fatal(err)
	}
	if len(result.Metrics) != 1 || result.Metrics[0].Value != nil || result.Metrics[0].Denominator != nil {
		t.Fatal(result)
	}
	wire, err := json.Marshal(result)
	if err != nil || !strings.Contains(string(wire), `"value":null`) {
		t.Fatal(string(wire), err)
	}
}
