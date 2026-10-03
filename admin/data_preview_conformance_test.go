package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"slices"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/goliatone/go-admin/data"
	demo "github.com/goliatone/go-admin/examples/web/datamodule"
)

type previewHTTPPolicy struct {
	data.Policy
	hidden   atomic.Bool
	revision atomic.Uint64
}

func (p *previewHTTPPolicy) Authorize(ctx context.Context, principal data.Principal, a data.AccessRequest) error {
	if err := p.Policy.Authorize(ctx, principal, a); err != nil {
		return err
	}
	if a.Explore != nil && p.hidden.Load() {
		if slices.Contains(a.Explore.Fields, "amount") {
			return data.Error(data.CodeDenied)
		}
	}
	return nil
}
func (p *previewHTTPPolicy) InsightAuthorizationRevision(ctx context.Context, _ data.Principal) (string, error) {
	return fmt.Sprint(p.revision.Load()), ctx.Err()
}

func newPreviewHTTPFixture(t *testing.T) (*dataModuleFixture, *previewHTTPPolicy) {
	t.Helper()
	p := &previewHTTPPolicy{}
	f := newDataModuleFixture(t, filepath.Join(t.TempDir(), "preview-http.db"), nil, func(c *data.ServiceConfig) {
		target, ok := c.Target.(*dataModuleTarget)
		if !ok {
			t.Fatal("unexpected fixture target")
		}
		p.Policy = c.Policy
		c.Policy = p
		c.Preview = data.ApplicationPreviewConfig{Adapter: target.Runtime, Enabled: true, ApplicationID: "test", EnvironmentID: "dev", Surfaces: []data.PreviewSurface{{ID: demo.OrdersReportSurface, Label: "Orders", Kind: "report", EntityID: "orders", Fields: []string{"id", "amount", "local_day"}}}}
	})
	return f, p
}
func previewHTTPPrepared(t *testing.T, f *dataModuleFixture, scenario, key string) data.OpenApplicationPreviewInput {
	t.Helper()
	catalog, err := f.service.Catalog(t.Context(), demo.TargetID, 10)
	if err != nil {
		t.Fatal(err)
	}
	in := f.input
	for _, s := range catalog[0].Scenarios {
		if s.ID == scenario {
			in.Scenario = s
		}
	}
	in.IdempotencyKey = key
	result, err := f.service.Run(t.Context(), data.Prepare, in)
	if err != nil || result.Receipt == nil {
		t.Fatal(result, err)
	}
	r := result.Receipt
	return data.OpenApplicationPreviewInput{Selection: data.ExploreSelection{Dataset: r.Dataset, Scenario: r.Scenario, TargetID: r.Target.TargetID, Context: data.ExplorePrepared, ReceiptID: r.ID, ContentRevision: r.ContentRevision}, SurfaceID: demo.OrdersReportSurface, RequestID: key + "-launch"}
}
func previewHTTPOpen(t *testing.T, f *dataModuleFixture, q data.OpenApplicationPreviewInput, actor string) data.ApplicationPreviewSession {
	t.Helper()
	res := f.request(t, http.MethodPost, "/admin/data/api/preview/sessions", actor, q)
	var session data.ApplicationPreviewSession
	if res.Code != 200 || json.Unmarshal(res.Body.Bytes(), &session) != nil || session.State != data.PreviewReady || !session.ReadOnly || !strings.HasPrefix(session.LaunchURL, "/admin/data/preview/") || !strings.Contains(session.ReturnURL, "selection=") {
		t.Fatal(res.Code, res.Body.String())
	}
	return session
}
func TestDataPreviewHTTPReadyQuietReplayIsolationAndNoActivation(t *testing.T) {
	f, _ := newPreviewHTTPFixture(t)
	ready := previewHTTPPrepared(t, f, "ready", "http-ready")
	quiet := previewHTTPPrepared(t, f, "quiet", "http-quiet")
	before, err := f.service.Active(t.Context(), demo.TargetID)
	if err != nil {
		t.Fatal(err)
	}
	a := previewHTTPOpen(t, f, ready, "operator")
	b := previewHTTPOpen(t, f, quiet, "operator")
	replay := previewHTTPOpen(t, f, ready, "operator")
	if replay.SessionID != a.SessionID || !replay.ExpiresAt.Equal(a.ExpiresAt) {
		t.Fatal("replay repinned or extended expiry")
	}
	read := func(session data.ApplicationPreviewSession, count, total int) {
		t.Helper()
		for _, path := range []string{session.LaunchURL, session.LaunchURL + "/api/report"} {
			res := f.request(t, http.MethodGet, path, "operator", nil)
			var report demo.OrdersReport
			if res.Code != 200 || json.Unmarshal(res.Body.Bytes(), &report) != nil || report.OrderCount != count || report.AmountTotal != total || res.Header().Get("Cache-Control") != "private, no-store" {
				t.Fatal(res.Code, res.Body.String())
			}
		}
	}
	read(a, 3, 250)
	read(b, 0, 0)
	conflict := quiet
	conflict.RequestID = ready.RequestID
	res := f.request(t, http.MethodPost, "/admin/data/api/preview/sessions", "operator", conflict)
	if res.Code != 409 {
		t.Fatal(res.Code, res.Body.String())
	}
	res = f.request(t, http.MethodGet, a.LaunchURL, "other-actor", nil)
	if res.Code != 404 || strings.Contains(res.Body.String(), "order-1") {
		t.Fatal(res.Code, res.Body.String())
	}
	other := previewHTTPOpen(t, f, ready, "other-actor")
	if other.SessionID == a.SessionID {
		t.Fatal("cross-actor replay")
	}
	res = f.request(t, http.MethodGet, strings.Replace(a.LaunchURL, demo.OrdersReportSurface, "forged-surface", 1), "operator", nil)
	if res.Code != 404 {
		t.Fatal(res.Code)
	}
	for _, effect := range []string{"jobs", "webhooks", "exports"} {
		res = f.request(t, http.MethodPost, "/admin/data/preview/"+a.SessionID+"/effects/"+effect, "operator", nil)
		if res.Code != 403 {
			t.Fatal(effect, res.Code)
		}
	}
	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete} {
		res = f.request(t, method, a.LaunchURL+"/api/report", "operator", map[string]any{"amount": 999})
		if res.Code != 403 {
			t.Fatal(method, res.Code)
		}
	}
	res = f.request(t, http.MethodPost, "/admin/data/api/preview/sessions/"+a.SessionID+"/close", "operator", nil)
	if res.Code != 200 {
		t.Fatal(res.Code, res.Body.String())
	}
	res = f.request(t, http.MethodGet, a.LaunchURL, "operator", nil)
	if res.Code != 404 {
		t.Fatal("closed report visible", res.Code, res.Body.String())
	}
	read(b, 0, 0)
	after, err := f.service.Active(t.Context(), demo.TargetID)
	if err != nil || before.Activation != after.Activation {
		t.Fatal("HTTP preview changed generation/routing", err)
	}
}
func TestDataPreviewHTTPFinalFieldHostRevocationAndCSRF(t *testing.T) {
	f, p := newPreviewHTTPFixture(t)
	q := previewHTTPPrepared(t, f, "ready", "grants")
	session := previewHTTPOpen(t, f, q, "operator")
	ordinary := f.module.config.PreviewSurfaces[demo.OrdersReportSurface]
	f.module.config.PreviewSurfaces[demo.OrdersReportSurface] = DataPreviewSurface{Read: ordinary.Read, Render: func(_ context.Context, _ data.PreviewReadContext, _ any) ([]byte, error) {
		p.hidden.Store(true)
		p.revision.Add(1)
		return []byte("private-order-amount"), nil
	}}
	res := f.request(t, http.MethodGet, session.LaunchURL, "operator", nil)
	if res.Code != 403 || strings.Contains(res.Body.String(), "private-order-amount") {
		t.Fatal("late field grant leaked HTML", res.Code, res.Body.String())
	}
	selection, err := json.Marshal(q.Selection)
	if err != nil {
		t.Fatal(err)
	}
	res = f.request(t, http.MethodGet, "/admin/data/api/preview/capabilities?"+url.Values{"selection": {string(selection)}}.Encode(), "operator", nil)
	var cap data.PreviewCapability
	if res.Code != 200 || json.Unmarshal(res.Body.Bytes(), &cap) != nil || cap.Supported || len(cap.Surfaces) != 0 {
		t.Fatal("hidden fields advertised", res.Code, res.Body.String())
	}
	p.hidden.Store(false)
	p.revision.Add(1)
	// Revocation is terminal; restoring grants requires a fresh launch identity.
	res = f.request(t, http.MethodGet, session.LaunchURL, "operator", nil)
	if res.Code != 404 && res.Code != 403 {
		t.Fatal("revoked session revived", res.Code, res.Body.String())
	}
	q.RequestID = "fresh-grants"
	session = previewHTTPOpen(t, f, q, "operator")
	f.module.config.PreviewSurfaces[demo.OrdersReportSurface] = DataPreviewSurface{Read: func(ctx context.Context, r data.PreviewReadContext) (any, error) {
		out, readErr := ordinary.Read(ctx, r)
		f.view.Store(false)
		return out, readErr
	}}
	res = f.request(t, http.MethodGet, session.LaunchURL+"/api/report", "operator", nil)
	if res.Code != 403 || strings.Contains(res.Body.String(), "order-1") {
		t.Fatal("late Data grant leaked API", res.Code, res.Body.String())
	}
	f.view.Store(true)
	// Cookie mutations without a CSRF protector/token fail before dispatch.
	body, err := json.Marshal(q)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/admin/data/api/preview/sessions", strings.NewReader(string(body)))
	req.Header.Set("X-Test-User", "operator")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Cookie", "session=test")
	response := httptest.NewRecorder()
	f.handler.ServeHTTP(response, req)
	if response.Code != 400 || !strings.Contains(response.Body.String(), TextCodeAdminCSRFInvalid) {
		t.Fatal("cookie launch bypassed CSRF", response.Code, response.Body.String())
	}
}

func TestDataPreviewHTTPCancelledNavigationPreservesSession(t *testing.T) {
	f, _ := newPreviewHTTPFixture(t)
	q := previewHTTPPrepared(t, f, "ready", "cancelled-navigation")
	session := previewHTTPOpen(t, f, q, "operator")
	ordinary := f.module.config.PreviewSurfaces[demo.OrdersReportSurface]
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	f.module.config.PreviewSurfaces[demo.OrdersReportSurface] = DataPreviewSurface{Read: ordinary.Read, Render: func(context.Context, data.PreviewReadContext, any) ([]byte, error) {
		cancel()
		return []byte("private-order-report"), nil
	}}
	req := httptest.NewRequestWithContext(ctx, http.MethodGet, session.LaunchURL, nil)
	req.Header.Set("X-Test-User", "operator")
	response := httptest.NewRecorder()
	f.handler.ServeHTTP(response, req)
	if response.Code == 200 || strings.Contains(response.Body.String(), "private-order-report") {
		t.Fatal("cancelled navigation delivered report", response.Code, response.Body.String())
	}
	record, err := f.runtime.LookupPreview(t.Context(), session.SessionID)
	if err != nil || record.Session.State != data.PreviewReady {
		t.Fatal("cancelled navigation killed existing session", record, err)
	}
	f.module.config.PreviewSurfaces[demo.OrdersReportSurface] = ordinary
	response = f.request(t, http.MethodGet, session.LaunchURL, "operator", nil)
	if response.Code != 200 || !strings.Contains(response.Body.String(), "order-1") {
		t.Fatal("retry could not read session", response.Code, response.Body.String())
	}
}
