package admin

import (
	"encoding/json"
	"net/http"
	"net/url"
	"path/filepath"
	"testing"

	"github.com/goliatone/go-admin/data"
	demo "github.com/goliatone/go-admin/examples/web/datamodule"
)

// Real protected routing, trusted browser identity, owned dispatch, lifecycle
// authority and the SQLite reference provider run together with Debug disabled.
func TestDataExplorerReferenceHTTPReadyQuietAndPinnedActive(t *testing.T) {
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "explore-http.db"), nil)
	f.execute.Store(false)
	selection := data.ExploreSelection{Dataset: f.input.Dataset, Scenario: f.input.Scenario, TargetID: demo.TargetID, Context: data.ExploreCatalog}
	get := func(kind string, s data.ExploreSelection) *httpResult {
		t.Helper()
		wire, err := json.Marshal(s)
		if err != nil {
			t.Fatal(err)
		}
		params := url.Values{"selection": {string(wire)}, "entity_id": {"orders"}}
		res := f.request(t, http.MethodGet, "/admin/data/api/explore/"+kind+"?"+params.Encode(), "operator", nil)
		return &httpResult{status: res.Code, body: res.Body.Bytes()}
	}
	meta := get("metadata", selection)
	if meta.status != 200 {
		t.Fatal(meta.status, string(meta.body))
	}
	var metadata data.ExploreMetadata
	if err := json.Unmarshal(meta.body, &metadata); err != nil {
		t.Fatal(err)
	}
	if metadata.Title != "Synthetic orders" || metadata.Period.Timezone != "UTC" || *metadata.Inventory[0].Total != 3 {
		t.Fatal(metadata)
	}
	ready := get("samples", selection)
	if ready.status != 200 {
		t.Fatal(ready.status, string(ready.body))
	}
	var sample data.ExploreSamples
	if err := json.Unmarshal(ready.body, &sample); err != nil {
		t.Fatal(err)
	}
	amount := float64(0)
	for _, row := range sample.Rows {
		amount += row.Cells["amount"].Value.(float64)
	}
	if amount != 250 || *sample.Total != 3 || sample.Provenance != "example" {
		t.Fatal(sample)
	}
	for _, scenario := range metadata.Scenarios {
		if scenario.Scenario.ID == "quiet" {
			quiet := selection
			quiet.Scenario = scenario.Scenario
			res := get("samples", quiet)
			if res.status != 200 {
				t.Fatal(res.status, string(res.body))
			}
			if err := json.Unmarshal(res.body, &sample); err != nil {
				t.Fatal(err)
			}
			if sample.State != data.ExploreEmpty || *sample.Total != 0 || len(sample.Rows) > 0 {
				t.Fatal(sample)
			}
		}
	}
	ops, err := f.service.Operations(t.Context(), demo.TargetID, 100)
	if err != nil || len(ops) != 0 {
		t.Fatal("viewer read claimed lifecycle work", ops, err)
	}
	f.execute.Store(true)
	in := f.input
	in.IdempotencyKey = "explore-http-prepare"
	prepared, err := f.service.Run(t.Context(), data.Prepare, in)
	if err != nil || prepared.Receipt == nil {
		t.Fatal(prepared, err)
	}
	selection.Context = data.ExplorePrepared
	selection.ReceiptID = prepared.Receipt.ID
	selection.ContentRevision = prepared.Receipt.ContentRevision
	if res := get("samples", selection); res.status != 200 {
		t.Fatal(res.status, string(res.body))
	}
	in.ReceiptID = selection.ReceiptID
	in.IdempotencyKey = "explore-http-verify"
	verify, err := f.service.Run(t.Context(), data.Verify, in)
	if err != nil || verify.Receipt == nil {
		t.Fatal(verify, err)
	}
	g := uint64(0)
	in.ExpectedGeneration = &g
	in.IdempotencyKey = "explore-http-activate"
	active, err := f.service.Run(t.Context(), data.Activate, in)
	if err != nil || active.Activation == nil {
		t.Fatal(active, err)
	}
	selection.Context = data.ExploreActive
	generation := active.Activation.Generation
	selection.Generation = &generation
	f.execute.Store(false)
	if res := get("samples", selection); res.status != 200 {
		t.Fatal(res.status, string(res.body))
	}
	generation++
	res := get("samples", selection)
	if res.status != 409 {
		t.Fatal(res.status, string(res.body))
	}
	generation--
	after, err := f.service.Active(t.Context(), demo.TargetID)
	if err != nil || after.Activation.Generation != generation || after.Activation.ReceiptID != selection.ReceiptID {
		t.Fatal("read changed active generation", after, err)
	}
	f.view.Store(false)
	res = get("metadata", selection)
	if res.status != 403 {
		t.Fatal(res.status, string(res.body))
	}
}

type httpResult struct {
	status int
	body   []byte
}
