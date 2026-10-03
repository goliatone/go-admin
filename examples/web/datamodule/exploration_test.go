package datamodule

import (
	"context"
	"encoding/json"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/data"
)

func explorerRuntime(t *testing.T) (*Runtime, *data.Service) {
	t.Helper()
	r, err := Open(filepath.Join(t.TempDir(), "explore.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := r.Close(); err != nil {
			t.Error(err)
		}
	})
	return r, demoService(t, r, r)
}
func explorerSelection(t *testing.T, r *Runtime, scenario string) data.ExploreSelection {
	t.Helper()
	in := scenarioInput(t, r, scenario, "explore")
	return data.ExploreSelection{Dataset: in.Dataset, Scenario: in.Scenario, TargetID: TargetID, Context: data.ExploreCatalog}
}
func TestSyntheticExplorerReadyQuietMetadataAndPagination(t *testing.T) {
	r, s := explorerRuntime(t)
	ctx := t.Context()
	for _, scenario := range []string{"ready", "quiet"} {
		selection := explorerSelection(t, r, scenario)
		metadata, err := s.ExploreMetadata(ctx, data.ExploreMetadataQuery{Selection: selection})
		if err != nil {
			t.Fatal(err)
		}
		if metadata.Title != "Synthetic orders" || metadata.Origin != "synthetic" || *metadata.Inventory[0].Total != 3 || metadata.Inventory[0].Scope != "catalog_inventory" || metadata.Period.Timezone != "UTC" || len(metadata.Usages) != 1 || metadata.Usages[0].Href != "" || metadata.UsageCompleteness != "partial" {
			t.Fatal(metadata)
		}
		q := data.ExploreSamplesQuery{Selection: selection, EntityID: "orders", Limit: 2}
		sample, err := s.ExploreSamples(ctx, q)
		if err != nil {
			t.Fatal(err)
		}
		if scenario == "quiet" {
			if sample.State != data.ExploreEmpty || *sample.Total != 0 || len(sample.Rows) != 0 || sample.NextCursor != nil {
				t.Fatal(sample)
			}
			continue
		}
		if len(sample.Rows) != 2 || *sample.Total != 3 || sample.NextCursor == nil || sample.Completeness != "partial" {
			t.Fatal(sample)
		}
		total := 0
		for _, row := range sample.Rows {
			total += row.Cells["amount"].Value.(int)
			if row.Cells["local_day"].Value != "2026-01-01" || row.RecordKey == row.Cells["id"].Value {
				t.Fatal(row)
			}
		}
		q.Cursor = *sample.NextCursor
		next, err := s.ExploreSamples(ctx, q)
		if err != nil || len(next.Rows) != 1 || next.NextCursor != nil {
			t.Fatal(next, err)
		}
		total += next.Rows[0].Cells["amount"].Value.(int)
		if total != 250 {
			t.Fatal(total)
		}
		quiet := q
		quiet.Selection = explorerSelection(t, r, "quiet")
		if _, err = s.ExploreSamples(ctx, quiet); data.ErrorCode(err) != data.CodeInvalid {
			t.Fatal("cursor crossed scenario", err)
		}
		q.Cursor += "x"
		if _, err = s.ExploreSamples(ctx, q); data.ErrorCode(err) != data.CodeInvalid {
			t.Fatal("forged cursor accepted", err)
		}
		principal, err := demoPrincipal(ctx)
		if err != nil {
			t.Fatal(err)
		}
		principal.ActorID = "another-actor"
		q.Cursor = *sample.NextCursor
		if _, err = r.ExploreSamples(ctx, principal, data.ExploreRead{Selection: selection, Target: data.TargetKey{ScopeKey: principal.ScopeKey, TargetID: TargetID}}, q); data.ErrorCode(err) != data.CodeInvalid {
			t.Fatal("cursor crossed actor", err)
		}
	}
	var stages int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM data_example_stages`).Scan(&stages); err != nil || stages != 0 {
		t.Fatal("catalog reads prepared stages", stages, err)
	}
	operations, err := s.Operations(ctx, TargetID, 100)
	if err != nil || len(operations) != 0 {
		t.Fatal("reads claimed work", operations, err)
	}
	active, err := s.Active(ctx, TargetID)
	if err != nil || active.Activation.Generation != 0 || active.Activation.ReceiptID != "" {
		t.Fatal(active, err)
	}
}
func TestSyntheticExplorerPreparedAndActiveReadsHaveNoEffects(t *testing.T) {
	r, s := explorerRuntime(t)
	ctx := t.Context()
	in := scenarioInput(t, r, "ready", "explore-prepare")
	prepared, err := s.Run(ctx, data.Prepare, in)
	if err != nil || prepared.Receipt == nil {
		t.Fatal(prepared, err)
	}
	selection := explorerSelection(t, r, "ready")
	selection.Context = data.ExplorePrepared
	selection.ReceiptID = prepared.Receipt.ID
	selection.ContentRevision = prepared.Receipt.ContentRevision
	q := data.ExploreSamplesQuery{Selection: selection, EntityID: "orders"}
	assertRead := func(q data.ExploreSamplesQuery) {
		t.Helper()
		before, err := s.Active(ctx, TargetID)
		if err != nil {
			t.Fatal(err)
		}
		ops, err := s.Operations(ctx, TargetID, 100)
		if err != nil {
			t.Fatal(err)
		}
		sample, err := s.ExploreSamples(ctx, q)
		if err != nil || len(sample.Rows) != 3 || *sample.Total != 3 || sample.Provenance != "observed" || !sample.Selection.Equal(q.Selection) {
			t.Fatal(sample, err)
		}
		after, err := s.Active(ctx, TargetID)
		if err != nil || !reflect.DeepEqual(before, after) {
			t.Fatal("read moved route", before, after, err)
		}
		afterOps, err := s.Operations(ctx, TargetID, 100)
		if err != nil || !reflect.DeepEqual(ops, afterOps) {
			t.Fatal("read claimed work", err)
		}
	}
	assertRead(q)
	in.IdempotencyKey = "explore-verify"
	in.ReceiptID = selection.ReceiptID
	verified, err := s.Run(ctx, data.Verify, in)
	if err != nil || verified.Receipt == nil {
		t.Fatal(verified, err)
	}
	g := uint64(0)
	in.IdempotencyKey = "explore-activate"
	in.ExpectedGeneration = &g
	active, err := s.Run(ctx, data.Activate, in)
	if err != nil || active.Activation == nil {
		t.Fatal(active, err)
	}
	q.Selection.Context = data.ExploreActive
	generation := active.Activation.Generation
	q.Selection.Generation = &generation
	assertRead(q)
	physicalBefore, err := r.ActiveRecords(ctx, data.TargetKey{ScopeKey: "demo", TargetID: TargetID})
	if err != nil {
		t.Fatal(err)
	}
	quiet := explorerSelection(t, r, "quiet")
	out, err := s.ExploreSamples(ctx, data.ExploreSamplesQuery{Selection: quiet, EntityID: "orders"})
	if err != nil || *out.Total != 0 {
		t.Fatal(out, err)
	}
	physicalAfter, err := r.ActiveRecords(ctx, data.TargetKey{ScopeKey: "demo", TargetID: TargetID})
	if err != nil || !reflect.DeepEqual(physicalBefore, physicalAfter) {
		t.Fatal("quiet catalog read moved active route", err)
	}
	generation++
	out, err = s.ExploreSamples(ctx, q)
	if data.ErrorCode(err) != data.CodeStale || len(out.Rows) > 0 {
		t.Fatal(out, err)
	}
	generation--
	// Content tampering is refused; it cannot be disguised by a presentation revision.
	if _, err = r.db.ExecContext(ctx, `UPDATE data_example_records SET amount=999 WHERE stage=? AND id='order-1'`, prepared.Receipt.StageID); err != nil {
		t.Fatal(err)
	}
	out, err = s.ExploreSamples(ctx, q)
	if err == nil || len(out.Rows) > 0 {
		t.Fatal("tampered stage disclosed", out, err)
	}
}
func TestSyntheticExplorerDeletedStageCancellationAndPresentationIdentity(t *testing.T) {
	r, s := explorerRuntime(t)
	ctx := t.Context()
	before, err := r.descriptor.CompositeDigest()
	if err != nil {
		t.Fatal(err)
	}
	selection := explorerSelection(t, r, "ready")
	metadata, err := s.ExploreMetadata(ctx, data.ExploreMetadataQuery{Selection: selection})
	if err != nil {
		t.Fatal(err)
	}
	metadata.Title = "Cosmetic replacement"
	metadata.PresentationRevision = "2"
	encoded, err := json.Marshal(metadata)
	if err != nil || len(encoded) == 0 {
		t.Fatal(err)
	}
	after, err := r.descriptor.CompositeDigest()
	if err != nil || before != after {
		t.Fatal("presentation changed digest", err)
	}
	canceled, cancel := context.WithCancel(ctx)
	cancel()
	out, err := s.ExploreSamples(canceled, data.ExploreSamplesQuery{Selection: selection, EntityID: "orders"})
	if err != context.Canceled || len(out.Rows) > 0 {
		t.Fatal(out, err)
	}
	in := scenarioInput(t, r, "ready", "delete-stage-prepare")
	prepared, err := s.Run(ctx, data.Prepare, in)
	if err != nil || prepared.Receipt == nil {
		t.Fatal(prepared, err)
	}
	selection.Context = data.ExplorePrepared
	selection.ReceiptID = prepared.Receipt.ID
	selection.ContentRevision = prepared.Receipt.ContentRevision
	if _, err = r.db.ExecContext(ctx, `DELETE FROM data_example_stages WHERE id=?`, prepared.Receipt.StageID); err != nil {
		t.Fatal(err)
	}
	out, err = s.ExploreSamples(ctx, data.ExploreSamplesQuery{Selection: selection, EntityID: "orders"})
	if data.ErrorCode(err) != data.CodeGone || len(out.Rows) > 0 {
		t.Fatal("deleted stage fell back", out, err)
	}
}
