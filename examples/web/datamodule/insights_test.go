package datamodule

import (
	"context"
	"errors"
	"github.com/goliatone/go-admin/data"
	"reflect"
	"testing"
)

func insightPrepared(t *testing.T, r *Runtime, s *data.Service, scenario string, verify bool) data.ExploreSelection {
	t.Helper()
	in := scenarioInput(t, r, scenario, "insight-prepare-"+scenario)
	prepared, err := s.Run(t.Context(), data.Prepare, in)
	if err != nil || prepared.Receipt == nil {
		t.Fatal(prepared, err)
	}
	selection := explorerSelection(t, r, scenario)
	selection.Context = data.ExplorePrepared
	selection.ReceiptID = prepared.Receipt.ID
	selection.ContentRevision = prepared.Receipt.ContentRevision
	if verify {
		in.ReceiptID = selection.ReceiptID
		in.IdempotencyKey = "insight-verify-" + scenario
		verified, err := s.Run(t.Context(), data.Verify, in)
		if err != nil || verified.Verification == nil || !verified.Verification.Passed() {
			t.Fatal(verified, err)
		}
	}
	return selection
}
func TestSyntheticInsightsReadyQuietCoverageAndComparisons(t *testing.T) {
	r, s := explorerRuntime(t)
	ready, quiet := explorerSelection(t, r, "ready"), explorerSelection(t, r, "quiet")
	for _, selection := range []data.ExploreSelection{ready, quiet} {
		out, err := s.ExploreInsights(t.Context(), data.ExploreInsightsQuery{Selection: selection, MetricSetID: "orders"})
		if err != nil || out.Provenance != "example" || out.Coverage[0].Status != data.Uncovered || out.Coverage[0].Evidence != nil {
			t.Fatal(out, err)
		}
	}
	example, err := s.CompareSelections(t.Context(), data.CompareSelectionsQuery{Left: ready, Right: quiet, MetricSetID: "orders"})
	if err != nil || example.Metrics[0].Delta != nil || example.Metrics[0].Reason != "not_observed" {
		t.Fatal(example, err)
	}
	ready = insightPrepared(t, r, s, "ready", false)
	out, err := s.ExploreInsights(t.Context(), data.ExploreInsightsQuery{Selection: ready, MetricSetID: "orders"})
	if err != nil || out.Coverage[0].Status != data.Uncovered {
		t.Fatal(out, err)
	}
	ready = insightPrepared(t, r, s, "ready", true)
	quiet = insightPrepared(t, r, s, "quiet", true)
	before, err := s.Active(t.Context(), TargetID)
	if err != nil {
		t.Fatal(err)
	}
	ops, err := s.Operations(t.Context(), TargetID, 100)
	if err != nil {
		t.Fatal(err)
	}
	compared, err := s.CompareSelections(t.Context(), data.CompareSelectionsQuery{Left: ready, Right: quiet, MetricSetID: "orders"})
	if err != nil {
		t.Fatal(err)
	}
	if *compared.Metrics[0].Delta != -3 || *compared.Metrics[1].Delta != -250 || compared.Left.Coverage[0].Status != "covered" || compared.Right.Coverage[0].Status != data.CoveredEmpty || compared.Right.Coverage[0].Evidence.VerificationID == "" || len(compared.LeftDeclarations.ExpectedOutcomes) == 0 {
		t.Fatal(compared)
	}
	after, err := s.Active(t.Context(), TargetID)
	if err != nil || !reflect.DeepEqual(before, after) {
		t.Fatal("comparison moved target", err)
	}
	afterOps, err := s.Operations(t.Context(), TargetID, 100)
	if err != nil || !reflect.DeepEqual(ops, afterOps) {
		t.Fatal("comparison claimed work", err)
	}
}
func TestSyntheticInsightsPinnedActiveAndCancellation(t *testing.T) {
	r, s := explorerRuntime(t)
	ready := insightPrepared(t, r, s, "ready", true)
	quiet := insightPrepared(t, r, s, "quiet", true)
	in := scenarioInput(t, r, "ready", "insight-activate")
	in.ReceiptID = ready.ReceiptID
	g := uint64(0)
	in.ExpectedGeneration = &g
	active, err := s.Run(t.Context(), data.Activate, in)
	if err != nil || active.Activation == nil {
		t.Fatal(active, err)
	}
	ready.Context = data.ExploreActive
	generation := active.Activation.Generation
	ready.Generation = &generation
	c := data.CompareSelectionsQuery{Left: quiet, Right: ready, MetricSetID: "orders"}
	compared, err := s.CompareSelections(t.Context(), c)
	if err != nil || *compared.Metrics[0].Delta != 3 {
		t.Fatal(compared, err)
	}
	generation++
	compared, err = s.CompareSelections(t.Context(), c)
	if data.ErrorCode(err) != data.CodeStale || len(compared.Metrics) > 0 {
		t.Fatal(compared, err)
	}
	generation--
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	compared, err = s.CompareSelections(ctx, c)
	if !errors.Is(err, context.Canceled) || len(compared.Metrics) > 0 {
		t.Fatal(compared, err)
	}
	if _, err = r.db.ExecContext(t.Context(), `UPDATE data_example_records SET amount=999 WHERE stage=(SELECT stage FROM data_example_routes WHERE scope='demo' AND target=?)`, TargetID); err != nil {
		t.Fatal(err)
	}
	compared, err = s.CompareSelections(t.Context(), c)
	if err == nil || len(compared.Metrics) > 0 {
		t.Fatal("tampered stage disclosed", compared, err)
	}
}
