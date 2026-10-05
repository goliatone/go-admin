package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"path/filepath"
	"sync/atomic"
	"testing"

	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	auth "github.com/goliatone/go-auth"
)

func TestDataReceiptDefaultsAndOptionsRequireLifecycleAuthority(t *testing.T) {
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "data.db"), nil)
	own := f.prepareVerified(t)
	// A newer maintenance receipt is safe to view, but only its requester
	// may mutate it. Keep the operator's earlier receipt selectable.
	foreignCtx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "maintenance"})
	in := f.input
	in.IdempotencyKey = "foreign-prepare"
	prepared, err := f.service.Run(foreignCtx, data.Prepare, in)
	if err != nil {
		t.Fatal(err)
	}
	in.ReceiptID = prepared.Receipt.ID
	in.IdempotencyKey = "foreign-verify"
	if _, err = f.service.Run(foreignCtx, data.Verify, in); err != nil {
		t.Fatal(err)
	}
	for _, kind := range []data.Kind{data.Verify, data.Activate} {
		action := dataModuleAction(t, f.snapshot(t, "operator"), kind, "")
		for _, field := range action.Fields {
			if field.Name == "receipt_id" && field.Default != own.ReceiptID {
				t.Fatalf("%s default=%v want=%s", kind, field.Default, own.ReceiptID)
			}
		}
		path := "/admin/data/api/panels/overview/actions/" + action.ID + "/options/receipt_id?limit=100&value=" + in.ReceiptID
		res := f.request(t, http.MethodGet, path, "operator", nil)
		if res.Code != 200 {
			t.Fatal(res.Code, res.Body.String())
		}
		var page console.PanelOptionPage
		if err = json.Unmarshal(res.Body.Bytes(), &page); err != nil {
			t.Fatal(err)
		}
		found := false
		for _, option := range append(page.Items, page.Selected...) {
			if option.Value == in.ReceiptID {
				t.Fatal("foreign receipt offered for mutation")
			}
			if option.Value == own.ReceiptID {
				found = true
			}
		}
		if !found {
			t.Fatal("own retained receipt disappeared")
		}
	}
	// Forged selectors are still denied at the authoritative service boundary.
	in.IdempotencyKey = "foreign-activate"
	zero := uint64(0)
	in.ExpectedGeneration = &zero
	if err = f.service.AuthorizeInput(t.Context(), data.Activate, in); data.ErrorCode(err) != data.CodeDenied {
		t.Fatal("foreign mutation authorized", err)
	}
}

func TestDataReceiptAuthorizationOutageDoesNotBecomeEmptyPicker(t *testing.T) {
	var outage atomic.Bool
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "data.db"), nil, func(cfg *data.ServiceConfig) {
		policy := cfg.Policy
		cfg.Policy = snapshotPolicy{check: func(ctx context.Context, principal data.Principal, request data.AccessRequest) error {
			if outage.Load() && request.Receipt != nil && request.Action == string(data.Activate) {
				return data.Error(data.CodeUnavailable)
			}
			return policy.Authorize(ctx, principal, request)
		}}
	})
	input := f.prepareVerified(t)
	action := dataModuleAction(t, f.snapshot(t, "operator"), data.Activate, "")
	outage.Store(true)
	res := f.request(t, http.MethodGet, "/admin/data/api/panels/overview/actions/"+action.ID+"/options/receipt_id?value="+input.ReceiptID, "operator", nil)
	if res.Code != http.StatusServiceUnavailable {
		t.Fatal("authorization outage became empty/denied picker", res.Code, res.Body.String())
	}
}
