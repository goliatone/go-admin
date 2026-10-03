package data_test

import (
	"github.com/goliatone/go-admin/data"
	"testing"
	"time"
)

func TestPreviewContractsPreparedOnlyAndBounds(t *testing.T) {
	f := newFixture(t)
	selection := catalogSelection(f)
	q := data.OpenApplicationPreviewInput{Selection: selection, SurfaceID: "report", RequestID: "launch-1"}
	if q.Validate() == nil {
		t.Fatal("catalog launch accepted")
	}
	q.Selection.Context = data.ExplorePrepared
	q.Selection.ReceiptID = "receipt"
	q.Selection.ContentRevision = 1
	if err := q.Validate(); err != nil {
		t.Fatal(err)
	}
	q.Selection.Context = data.ExploreActive
	g := uint64(0)
	q.Selection.Generation = &g
	if q.Validate() == nil {
		t.Fatal("active launch accepted")
	}
	cfg := f.serviceConfig(f.store)
	cfg.Preview.Lifetime = 31 * time.Minute
	if _, err := data.NewService(cfg); data.ErrorCode(err) != data.CodeInvalid {
		t.Fatal(err)
	}
	cfg.Preview.Lifetime = time.Minute
	cfg.Preview.Enabled = true
	if _, err := data.NewService(cfg); data.ErrorCode(err) != data.CodeUnavailable {
		t.Fatal(err)
	}
}
