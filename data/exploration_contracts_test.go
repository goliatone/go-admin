package data_test

import (
	"encoding/json"
	"github.com/goliatone/go-admin/data"
	"os"
	"strings"
	"testing"
	"time"
)

func catalogSelection(f *fixture) data.ExploreSelection {
	return data.ExploreSelection{Dataset: f.input.Dataset, Scenario: f.input.Scenario, TargetID: f.input.TargetID, Context: data.ExploreCatalog}
}
func TestExploreSelectionContract(t *testing.T) {
	f := newFixture(t)
	good := catalogSelection(f)
	for _, edit := range []func(*data.ExploreSelection){
		func(s *data.ExploreSelection) { s.Scenario.Dataset.ID = "foreign" },
		func(s *data.ExploreSelection) { s.TargetID = strings.Repeat("x", 129) },
		func(s *data.ExploreSelection) { s.ReceiptID = "receipt" },
		func(s *data.ExploreSelection) { s.Context = data.ExplorePrepared },
		func(s *data.ExploreSelection) { s.Context = "production" },
	} {
		bad := good
		edit(&bad)
		if bad.Validate() == nil {
			t.Fatalf("accepted %+v", bad)
		}
	}
	for _, context := range []string{data.ExploreCatalog, data.ExplorePrepared, data.ExploreActive} {
		s := good
		s.Context = context
		if context != data.ExploreCatalog {
			s.ReceiptID = "receipt"
			s.ContentRevision = 1
		}
		if context == data.ExploreActive {
			g := uint64(0)
			s.Generation = &g
		}
		if err := s.Validate(); err != nil {
			t.Fatal(err)
		}
	}
}
func TestExploreWireAndIndependentPresentationIdentity(t *testing.T) {
	f := newFixture(t)
	d, err := f.service.Describe(t.Context(), f.input.Dataset, f.input.TargetID)
	if err != nil {
		t.Fatal(err)
	}
	before, err := d.CompositeDigest()
	if err != nil {
		t.Fatal(err)
	}
	metadata := data.ExploreMetadata{ExploreEnvelope: data.ExploreEnvelope{PresentationRevision: "2"}, Title: "Cosmetic edit"}
	metadata.Title = "Another title"
	after, err := d.CompositeDigest()
	if err != nil || before != after {
		t.Fatal("presentation changed lifecycle identity", err)
	}
	h := strings.Repeat("a", 64)
	ref := data.DatasetRef{Provider: "kitchen-sink", ID: "synthetic-orders", Version: "1", Digest: h}
	selection := data.ExploreSelection{Dataset: ref, Scenario: data.ScenarioRef{Dataset: ref, ID: "ready", Version: "1", ProfileHash: strings.Repeat("b", 64)}, TargetID: "kitchen-sink", Context: data.ExploreCatalog}
	total := uint64(3)
	sample := data.ExploreSamples{ExploreEnvelope: data.ExploreEnvelope{Selection: selection, PresentationRevision: "1", ObservedAt: time.Date(2026, 10, 2, 12, 0, 0, 0, time.UTC), Provenance: "example", Completeness: "complete", State: data.ExploreAvailable}, EntityID: "orders", SamplingMethod: "declared fixture order", Columns: []data.ExploreField{{ID: "id", Label: "Order", Type: "string"}, {ID: "amount", Label: "Amount", Type: "integer", Unit: "fixture amount"}}, Rows: []data.ExploreRow{}, Total: &total}
	for i, amount := range []int{120, 80, 50} {
		key := []string{"order-1", "order-2", "order-3"}[i]
		sample.Rows = append(sample.Rows, data.ExploreRow{RecordKey: key, Cells: map[string]data.ExploreCell{"id": {State: "value", Value: key}, "amount": {State: "value", Value: amount}}})
	}
	encoded, err := json.MarshalIndent(sample, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	golden, err := os.ReadFile("testdata/exploration-contract.json")
	if err != nil {
		t.Fatal(err)
	}
	if strings.TrimSpace(string(golden)) != string(encoded) {
		t.Fatal("explorer wire differs from FE fixture")
	}
}
