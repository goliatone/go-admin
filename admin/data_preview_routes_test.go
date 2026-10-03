package admin

import (
	"encoding/json"
	"github.com/goliatone/go-admin/data"
	"net/http"
	"net/url"
	"path/filepath"
	"testing"
)

func TestDataPreviewRoutesUnsupportedAndReadOnlyBoundaries(t *testing.T) {
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "preview-routes.db"), nil)
	in := f.input
	in.IdempotencyKey = "preview-prepare"
	prepared, err := f.service.Run(t.Context(), data.Prepare, in)
	if err != nil || prepared.Receipt == nil {
		t.Fatal(prepared, err)
	}
	r := prepared.Receipt
	selection := data.ExploreSelection{Dataset: r.Dataset, Scenario: r.Scenario, TargetID: r.Target.TargetID, Context: data.ExplorePrepared, ReceiptID: r.ID, ContentRevision: r.ContentRevision}
	wire, err := json.Marshal(selection)
	if err != nil {
		t.Fatal(err)
	}
	path := "/admin/data/api/preview/capabilities?" + url.Values{"selection": {string(wire)}}.Encode()
	res := f.request(t, http.MethodGet, path, "operator", nil)
	var capability data.PreviewCapability
	if res.Code != 200 || json.Unmarshal(res.Body.Bytes(), &capability) != nil || capability.Supported || capability.Reason != "not_supported" || res.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatal(res.Code, res.Body.String())
	}
	res = f.request(t, http.MethodPost, "/admin/data/api/preview/sessions", "operator", data.OpenApplicationPreviewInput{Selection: selection, SurfaceID: "report", RequestID: "launch"})
	if res.Code != 503 {
		t.Fatal(res.Code, res.Body.String())
	}
	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete} {
		for _, path := range []string{"/admin/data/preview/forged/surfaces/report", "/admin/data/preview/forged/surfaces/report/api/report"} {
			res = f.request(t, method, path, "operator", map[string]any{"amount": 999})
			if res.Code != 403 {
				t.Fatal(method, path, res.Code, res.Body.String())
			}
		}
	}
	for _, effect := range []string{"jobs", "webhooks", "exports"} {
		res = f.request(t, http.MethodPost, "/admin/data/preview/forged/effects/"+effect, "operator", nil)
		if res.Code != 403 {
			t.Fatal(effect, res.Code)
		}
	}
	for _, name := range []string{(data.OpenApplicationPreviewInput{}).Type(), (data.CloseApplicationPreviewCommand{}).Type(), (data.ApplicationPreviewSessionQuery{}).Type()} {
		if !f.module.bus.CommandRegistration(name).CanDispatch() {
			t.Fatal("missing typed message", name)
		}
	}
	f.view.Store(false)
	res = f.request(t, http.MethodGet, path, "operator", nil)
	if res.Code != 403 {
		t.Fatal(res.Code, res.Body.String())
	}
}
