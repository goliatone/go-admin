package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/data"
	demo "github.com/goliatone/go-admin/examples/web/datamodule"
)

func previewPageRoutes() DataPreviewURLs {
	return DataPreviewURLs{
		Capabilities: "/admin/data/api/preview/capabilities",
		Open:         "/admin/data/api/preview/sessions",
		Session:      "/admin/data/api/preview/sessions/:session",
		Close:        "/admin/data/api/preview/sessions/:session/close",
		Surface:      "/admin/data/preview/:session/surfaces/:surface",
		API:          "/admin/data/preview/:session/surfaces/:surface/api/report",
	}
}

func previewPageSession(dataset, scenario string) data.ApplicationPreviewSession {
	ref := data.DatasetRef{Provider: "kitchen-sink", ID: dataset, Version: "1", Digest: strings.Repeat("a", 64)}
	selection := data.ExploreSelection{Dataset: ref, Scenario: data.ScenarioRef{Dataset: ref, ID: scenario, Version: "1", ProfileHash: strings.Repeat("b", 64)},
		TargetID: "kitchen-sink", Context: data.ExplorePrepared, ReceiptID: "ready-receipt", ContentRevision: 4}
	return data.ApplicationPreviewSession{SessionID: "preview-1", Selection: selection, SurfaceID: demo.OrdersReportSurface, State: data.PreviewReady,
		ExpiresAt: time.Date(2026, 10, 3, 12, 15, 0, 0, time.UTC), ReadOnly: true}
}

func TestDataPreviewPageChromeShowsExactIdentityAndPreviewRoutes(t *testing.T) {
	session := previewPageSession("synthetic-orders", "ready")
	page, err := RenderDataPreviewPage(DataPreviewPage{Session: session, Title: "Synthetic orders report", Routes: previewPageRoutes(), DataPage: "/admin/data",
		AssetBase: "/admin", CSRFToken: "csrf-1", Now: time.Date(2026, 10, 3, 12, 0, 0, 0, time.UTC), Body: []byte(`<section data-view>view</section>`)})
	if err != nil {
		t.Fatal(err)
	}
	html := string(page)
	selection, err := json.Marshal(session.Selection)
	if err != nil {
		t.Fatal(err)
	}
	returnURL := "/admin/data?" + url.Values{"selection": {string(selection)}}.Encode()
	for _, want := range []string{
		`<title>Synthetic orders report · Application preview</title>`,
		`<meta name="csrf-token" content="csrf-1">`,
		`<link rel="stylesheet" href="/admin/assets/dist/styles/console.css">`,
		`<script type="module" src="/admin/assets/dist/console/data-preview-page.js"></script>`,
		`data-preview-session="preview-1"`,
		`data-preview-session-url="/admin/data/api/preview/sessions/preview-1"`,
		`data-preview-close-url="/admin/data/api/preview/sessions/preview-1/close"`,
		`data-preview-expires="2026-10-03T12:15:00Z"`,
		`data-preview-server-now="2026-10-03T12:00:00Z"`,
		`>Preview</span>`, `>Read-only</span>`,
		`Prepared data, not what kitchen-sink serves.`,
		`<span class="data-preview__value">synthetic-orders</span>`,
		`<span class="data-preview__value">ready</span>`,
		`<code class="data-preview__value">ready-receipt</code> <span class="data-preview__meta">content revision 4</span>`,
		`>12:15 UTC</time>`,
		`<a href="/admin/data/preview/preview-1/surfaces/synthetic-orders-report" aria-current="page">View</a>`,
		`<a href="/admin/data/preview/preview-1/surfaces/synthetic-orders-report/api/report">View data (JSON)</a>`,
		`<button type="button" class="console-btn console-btn--sm" data-preview-close hidden>Close preview</button>`,
		`<main class="data-preview__surface" id="data-preview-main" tabindex="-1" data-preview-main>`,
		`<section data-view>view</section>`,
	} {
		if !strings.Contains(html, want) {
			t.Fatalf("preview page lacks %q:\n%s", want, html)
		}
	}
	// html/template escapes the Return link's query in attribute context.
	if !strings.Contains(html, `href="`+strings.ReplaceAll(returnURL, "&", "&amp;")+`" data-preview-return`) {
		t.Fatalf("return link does not carry the exact selection:\n%s", html)
	}
	for _, unwanted := range []string{"<form", "http://", "https://"} {
		if strings.Contains(html, unwanted) {
			t.Fatalf("preview page contains %q", unwanted)
		}
	}
}

func TestDataPreviewPageEscapesIdentityAndRejectsUnsafeRoutes(t *testing.T) {
	hostile := `<img src=x onerror="alert(1)">"q"`
	session := previewPageSession(hostile, hostile)
	page, err := RenderDataPreviewPage(DataPreviewPage{Session: session, Title: hostile, Routes: previewPageRoutes(), DataPage: "/admin/data", Body: []byte("<p>view</p>")})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(page), "<img") || strings.Contains(string(page), `onerror="alert(1)"`) {
		t.Fatalf("identity was not escaped:\n%s", page)
	}
	routes := previewPageRoutes()
	routes.Close = "//evil.example/close/:session"
	if _, err = RenderDataPreviewPage(DataPreviewPage{Session: session, Routes: routes, DataPage: "/admin/data"}); data.ErrorCode(err) != data.CodeProvider {
		t.Fatal("protocol-relative close route accepted", err)
	}
	catalog := session
	catalog.Selection.Context = data.ExploreCatalog
	if _, err = RenderDataPreviewPage(DataPreviewPage{Session: catalog, Routes: previewPageRoutes(), DataPage: "/admin/data"}); data.ErrorCode(err) != data.CodeProvider {
		t.Fatal("non-prepared selection rendered", err)
	}
	if _, err = RenderDataPreviewPage(DataPreviewPage{Session: session, Routes: previewPageRoutes(), DataPage: "https://evil.example/data"}); data.ErrorCode(err) != data.CodeProvider {
		t.Fatal("absolute return page accepted", err)
	}
}

func TestDataPreviewHTTPWrapsRenderedViewInChromeAndKeepsAPIJSON(t *testing.T) {
	f, _ := newPreviewHTTPFixture(t)
	ordinary := f.module.config.PreviewSurfaces[demo.OrdersReportSurface]
	f.module.config.PreviewSurfaces[demo.OrdersReportSurface] = DataPreviewSurface{Label: "Synthetic orders report", Read: ordinary.Read,
		Render: func(_ context.Context, _ data.PreviewReadContext, out any) ([]byte, error) {
			report, ok := out.(demo.OrdersReport)
			if !ok {
				return nil, data.Error(data.CodeProvider)
			}
			return demo.RenderOrdersReport(report)
		}}
	for _, item := range []struct {
		scenario, want string
		rows           int
	}{{"ready", `data-report-amount-total>250</span>`, 3}, {"quiet", `data-report-empty`, 0}} {
		q := previewHTTPPrepared(t, f, item.scenario, "chrome-"+item.scenario)
		session := previewHTTPOpen(t, f, q, "operator")
		res := f.request(t, http.MethodGet, session.LaunchURL, "operator", nil)
		body := res.Body.String()
		if res.Code != http.StatusOK || !strings.HasPrefix(res.Header().Get("Content-Type"), "text/html") || res.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatal(item.scenario, res.Code, res.Header(), body)
		}
		for _, want := range []string{"data-preview-page", `data-preview-session="` + session.SessionID + `"`, "Synthetic orders report · Application preview",
			`<code class="data-preview__value">` + q.Selection.ReceiptID + `</code>`, item.want} {
			if !strings.Contains(body, want) {
				t.Fatalf("%s page lacks %q:\n%s", item.scenario, want, body)
			}
		}
		if got := strings.Count(body, "data-report-order>"); got != item.rows {
			t.Fatalf("%s rows %d, want %d", item.scenario, got, item.rows)
		}
		res = f.request(t, http.MethodGet, session.LaunchURL+"/api/report", "operator", nil)
		var report demo.OrdersReport
		if res.Code != http.StatusOK || json.Unmarshal(res.Body.Bytes(), &report) != nil || len(report.Orders) != item.rows {
			t.Fatal("API read is not the JSON report model", res.Code, res.Body.String())
		}
	}
}
