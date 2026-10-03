package data_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/goliatone/go-admin/data"
)

func TestExploreGenerationChangesDuringLastAuthorization(t *testing.T) {
	f, p, s := exploreFixture(t)
	receipt := prepared(t, f, "final-race-prepare")
	receipt = verified(t, f, receipt, "final-race-verify")
	activation := run(t, f, data.Activate, activationInput(f, receipt, 0, "final-race-activate"))
	successful(t, activation)
	q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
	q.Selection.Context = data.ExploreActive
	q.Selection.ReceiptID = receipt.ID
	q.Selection.ContentRevision = receipt.ContentRevision
	g := activation.Activation.Generation
	q.Selection.Generation = &g
	p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) { return testSample(q), nil }
	checks := 0
	p.auth = func(a data.ExploreAccess) error {
		if len(a.RecordKeys) > 0 {
			checks++
		}
		if checks == 2 {
			checks++
			next := prepared(t, f, "final-race-next")
			next = verified(t, f, next, "final-race-next-verify")
			successful(t, run(t, f, data.Activate, activationInput(f, next, g, "final-race-next-activate")))
		}
		return nil
	}
	out, err := s.ExploreSamples(t.Context(), q)
	if data.ErrorCode(err) != data.CodeStale || len(out.Rows) > 0 {
		t.Fatal("generation changed during final policy but was delivered", out, err)
	}
}

func TestExploreMetadataDeliveryChecksCompleteGrantGroup(t *testing.T) {
	f, p, s := exploreFixture(t)
	old := p.metadata
	p.metadata = func() data.ExploreMetadata {
		m := old()
		m.Entities = append(m.Entities, data.ExploreEntity{ID: "customers", Fields: []data.ExploreField{{ID: "id", Type: "string"}}})
		return m
	}
	revoked, customers := false, 0
	p.auth = func(a data.ExploreAccess) error {
		if a.EntityID == "orders" && revoked {
			return data.Error(data.CodeDenied)
		}
		if a.EntityID == "customers" && len(a.Fields) > 0 {
			customers++
			if customers == 2 {
				revoked = true
			}
		}
		return nil
	}
	out, err := s.ExploreMetadata(t.Context(), data.ExploreMetadataQuery{Selection: catalogSelection(f)})
	if data.ErrorCode(err) != data.CodeDenied || len(out.Entities) > 0 {
		t.Fatal("later entity authorization revoked earlier entity", out, err)
	}
}
func TestExploreFinalAuthorizationRevocationAndCancellation(t *testing.T) {
	for _, kind := range []string{"identity", "cancellation", "descriptor"} {
		t.Run(kind, func(t *testing.T) {
			f, p, s := exploreFixture(t)
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
			p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) { return testSample(q), nil }
			checks := 0
			p.auth = func(a data.ExploreAccess) error {
				if len(a.RecordKeys) > 0 {
					checks++
					if checks == 2 {
						switch kind {
						case "identity":
							f.revoked.Store(true)
						case "cancellation":
							cancel()
						case "descriptor":
							p.input.Scenario.ID = "removed"
						}
					}
				}
				return nil
			}
			out, err := s.ExploreSamples(ctx, q)
			want := data.CodeDenied
			if kind == "descriptor" {
				want = data.CodeStale
			}
			if kind == "cancellation" {
				if !errors.Is(err, context.Canceled) {
					t.Fatal(err)
				}
			} else if data.ErrorCode(err) != want {
				t.Fatal(err)
			}
			if len(out.Rows) > 0 {
				t.Fatal("late invalidation delivered rows", out)
			}
		})
	}
}
func TestExploreAuthorizationBatchRejectsMixedSelectionsAndExcess(t *testing.T) {
	f, _, s := exploreFixture(t)
	access := data.ExploreAccess{Selection: catalogSelection(f), EntityID: "orders"}
	other := access
	other.Selection.TargetID = "foreign"
	if err := s.AuthorizeExploration(t.Context(), access, other); data.ErrorCode(err) != data.CodeInvalid {
		t.Fatal("mixed grant selections", err)
	}
	if err := s.AuthorizeExploration(t.Context(), access, make([]data.ExploreAccess, 17)...); data.ErrorCode(err) != data.CodeInvalid {
		t.Fatal("unbounded grant group", err)
	}
}

func TestExplorePreparedSelectionChangesDuringLastAuthorization(t *testing.T) {
	for _, kind := range []string{"pruned", "verification", "stage"} {
		t.Run(kind, func(t *testing.T) {
			f, p, s := exploreFixture(t)
			receipt := prepared(t, f, "last-prepare")
			q := data.ExploreSamplesQuery{Selection: catalogSelection(f), EntityID: "orders"}
			q.Selection.Context = data.ExplorePrepared
			q.Selection.ReceiptID = receipt.ID
			q.Selection.ContentRevision = receipt.ContentRevision
			p.samples = func(q data.ExploreSamplesQuery) (data.ExploreSamples, error) { return testSample(q), nil }
			checks := 0
			p.auth = func(a data.ExploreAccess) error {
				if len(a.RecordKeys) > 0 {
					checks++
					if checks == 2 {
						switch kind {
						case "pruned":
							f.now.Add(int64(8 * 24 * time.Hour))
							if err := f.store.Prune(t.Context()); err != nil {
								t.Fatal(err)
							}
						case "verification":
							verified(t, f, receipt, "last-verification")
						case "stage":
							if err := os.WriteFile(filepath.Join(f.target.root, receipt.StageID, "records.json"), []byte("changed"), 0600); err != nil {
								t.Fatal(err)
							}
						}
					}
				}
				return nil
			}
			out, err := s.ExploreSamples(t.Context(), q)
			want := data.CodeStale
			if kind == "pruned" {
				want = data.CodeGone
			}
			if kind == "stage" {
				want = data.CodeConflict
			}
			if data.ErrorCode(err) != want || len(out.Rows) > 0 {
				t.Fatal("late prepared selection invalidation", kind, out, err)
			}
		})
	}
}
func TestExploreSelfRelationshipRetainsSeparateSourceRecordGrant(t *testing.T) {
	f, p, s := exploreFixture(t)
	checked := false
	p.auth = func(a data.ExploreAccess) error {
		if a.EntityID == "orders" && a.RecordKey == "source-opaque" && len(a.RecordKeys) == 0 {
			checked = true
			return data.Error(data.CodeDenied)
		}
		return nil
	}
	err := s.AuthorizeExploration(t.Context(), data.ExploreAccess{Selection: catalogSelection(f), EntityID: "orders", SourceEntityID: "orders", RelationshipID: "children", RecordKey: "source-opaque", RecordKeys: []string{"destination-opaque"}})
	if !checked || data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("self relationship omitted source record grant", checked, err)
	}
}
