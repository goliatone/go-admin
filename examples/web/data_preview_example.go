package main

import (
	"bytes"
	"context"
	"encoding/json"
	"html/template"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/examples/web/datamodule"
	"github.com/goliatone/go-admin/examples/web/setup"
	router "github.com/goliatone/go-router"
)

// Application-owned ordinary report route. It renders the same report view as
// the authenticated preview surface (datamodule.RenderOrdersReport) over the
// same OrdersReport model, inside this application's own page; API clients
// that ask for JSON receive the report model.
type syntheticOrdersReportModule struct {
	runtime *datamodule.Runtime
	access  setup.DataConsoleAccess
	assets  string
	home    string
}

// syntheticOrdersPage is the application page around the report view: it
// names the data source (what the target serves now) and links back to the
// admin. A preview instead wraps the same view in the Data module's chrome.
var syntheticOrdersPage = template.Must(template.New("synthetic-orders-page").Parse(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Synthetic orders report</title>
  <link rel="stylesheet" href="{{.Assets}}/assets/output.css">
  <link rel="stylesheet" href="{{.Assets}}/assets/dist/styles/console.css">
  <style>
    .application-view { min-height: 100vh; background: var(--console-canvas); color: var(--console-text); font-family: var(--console-font); }
    .application-view__bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; padding: 12px 24px; border-bottom: 1px solid var(--console-border); background: var(--console-surface); }
    .application-view__source { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0; color: var(--console-text-muted); }
    .application-view__main { max-width: 1120px; margin: 0 auto; padding: 24px; }
    @media (max-width: 640px) { .application-view__bar, .application-view__main { padding: 12px 16px; } }
  </style>
</head>
<body>
  <div class="console-root application-view">
    <header class="application-view__bar">
      <nav aria-label="Application"><a class="console-link" href="{{.Home}}"><span aria-hidden="true">← </span>Admin</a></nav>
      <p class="application-view__source"><span class="console-badge console-badge--success">Active data</span> What {{.TargetID}} serves now.</p>
    </header>
    <main class="application-view__main" id="main">{{.Body}}</main>
  </div>
</body>
</html>
`))

type syntheticOrdersPageView struct {
	Assets, Home, TargetID string
	Body                   template.HTML
}

func wantsReportJSON(c router.Context) bool {
	return c.Query("format") == "json" || strings.Contains(strings.ToLower(c.Header("Accept")), "application/json")
}

func (m *syntheticOrdersReportModule) renderPage(report datamodule.OrdersReport) ([]byte, error) {
	fragment, err := datamodule.RenderOrdersReport(report)
	if err != nil {
		return nil, data.Error(data.CodeProvider)
	}
	var out bytes.Buffer
	view := syntheticOrdersPageView{Assets: m.assets, Home: m.home, TargetID: datamodule.TargetID, Body: template.HTML(fragment)} //nolint:gosec // escaped by the report template
	if err = syntheticOrdersPage.Execute(&out, view); err != nil {
		return nil, data.Error(data.CodeProvider)
	}
	return out.Bytes(), nil
}

func (*syntheticOrdersReportModule) Manifest() coreadmin.ModuleManifest {
	return coreadmin.ModuleManifest{ID: "synthetic-orders", NameKey: "Synthetic orders report"}
}
func (*syntheticOrdersReportModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{Slug: "synthetic-orders", RouteNamePrefix: "synthetic_orders", UIRouteDeclarations: map[string]routing.RouteDeclaration{"orders.report": {Method: router.GET, Path: "report"}}}
}
func (m *syntheticOrdersReportModule) Register(mc coreadmin.ModuleContext) error {
	path := mc.Routing.RoutePath(routing.SurfaceUI, "orders.report")
	if path == "" || mc.ProtectedRouter == nil || mc.Admin == nil {
		return data.Error(data.CodeInvalid)
	}
	m.assets = strings.TrimRight(strings.TrimSpace(mc.Admin.BasePath()), "/")
	m.home = m.assets
	if m.home == "" {
		m.home = "/"
	}
	mc.ProtectedRouter.Get(path, func(c router.Context) error {
		c.SetHeader("Cache-Control", "private, no-store")
		ctx, cancel := context.WithTimeout(c.Context(), 10*time.Second)
		defer cancel()
		p, err := m.access.AuthorizeOrdersReport(ctx)
		if err != nil {
			return err
		}
		report, err := m.runtime.ActiveOrdersReport(ctx, data.TargetKey{ScopeKey: p.ScopeKey, TargetID: datamodule.TargetID})
		if err != nil {
			return err
		}
		asJSON := wantsReportJSON(c)
		var body []byte
		if asJSON {
			body, err = json.Marshal(report)
		} else {
			body, err = m.renderPage(report)
		}
		if err != nil {
			return data.Error(data.CodeProvider)
		}
		current, err := m.access.AuthorizeOrdersReport(ctx)
		if err != nil {
			return err
		}
		if current != p {
			return data.Error(data.CodeDenied)
		}
		c.SetHeader("Vary", "Accept")
		if asJSON {
			c.SetHeader("Content-Type", "application/json")
		} else {
			c.SetHeader("Content-Type", "text/html; charset=utf-8")
		}
		return c.Send(body)
	})
	return nil
}

// syntheticPreviewSurface renders the ordinary report view over the pinned
// prepared stage; the Data module wraps it in the preview chrome.
func syntheticPreviewSurface(runtime *datamodule.Runtime) coreadmin.DataPreviewSurface {
	return coreadmin.DataPreviewSurface{
		Label: "Synthetic orders report",
		Read: func(ctx context.Context, read data.PreviewReadContext) (any, error) {
			return runtime.PreviewOrdersReport(ctx, read)
		},
		Render: func(_ context.Context, _ data.PreviewReadContext, out any) ([]byte, error) {
			report, ok := out.(datamodule.OrdersReport)
			if !ok {
				return nil, data.Error(data.CodeProvider)
			}
			return datamodule.RenderOrdersReport(report)
		},
	}
}
