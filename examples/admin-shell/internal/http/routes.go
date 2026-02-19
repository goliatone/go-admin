package apphttp

import (
	"bytes"
	"fmt"
	"html/template"
	"path"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/admin-shell/internal/core"
	"github.com/goliatone/go-router"
)

var homeTemplate = template.Must(template.New("home").Parse(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{{.Name}}</title>
<style>
:root {
  --bg:#f5f7fb;
  --card:#ffffff;
  --ink:#111827;
  --muted:#6b7280;
  --border:#e5e7eb;
  --ok:#166534;
  --bad:#991b1b;
  --accent:#0f766e;
}
*{box-sizing:border-box}
body{margin:0;font:15px/1.45 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:960px;margin:24px auto;padding:0 16px}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:14px}
h1{margin:0 0 8px 0;font-size:24px}
p{margin:4px 0;color:var(--muted)}
code{font-size:13px;background:#f3f4f6;padding:2px 5px;border-radius:4px}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}
@media (max-width:780px){.grid{grid-template-columns:1fr}}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px}
.on{background:#dcfce7;color:var(--ok)}
.off{background:#fee2e2;color:var(--bad)}
pre{margin:8px 0 0;background:#0b1020;color:#dbeafe;padding:10px 12px;border-radius:8px;overflow:auto}
ul{margin:8px 0 0 20px;padding:0}
li{margin:4px 0}
</style>
</head>
<body>
<main>
  <section class="card">
    <h1>{{.Name}}</h1>
    <p>Environment: <code>{{.Env}}</code> | Listening on <code>{{.Address}}</code></p>
    <p>Admin base path: <code>{{.AdminBasePath}}</code></p>
    <p>Config path: <code>{{.ConfigPath}}</code></p>
    <p>Started at: <code>{{.StartedAt}}</code></p>
  </section>

  <section class="card">
    <strong>Quick links</strong>
    <ul>
      {{range .Links}}
      <li><a href="{{.Href}}">{{.Label}}</a> <code>{{.Href}}</code></li>
      {{end}}
    </ul>
  </section>

  <section class="card">
    <strong>Demo auth (go-auth)</strong>
    <ul>
      {{range .Credentials}}
      <li><code>{{.Username}}</code> / <code>{{.Password}}</code></li>
      {{end}}
    </ul>
    <pre>{{.DemoToken}}</pre>
  </section>

  <section class="card">
    <strong>Feature flags</strong>
    <ul>
      {{range .Features}}
      <li><code>{{.Name}}</code> {{if .Enabled}}<span class="badge on">on</span>{{else}}<span class="badge off">off</span>{{end}}</li>
      {{end}}
    </ul>
  </section>
</main>
</body>
</html>
`))

type link struct {
	Label string
	Href  string
}

type homeView struct {
	Name          string
	Env           string
	Address       string
	AdminBasePath string
	ConfigPath    string
	StartedAt     string
	DemoToken     string
	Features      []core.FeatureStatus
	Links         []link
	Credentials   []core.DemoCredential
}

// Register wires shell utility routes on top of go-admin routes.
func Register(appCore *core.Core) error {
	if appCore == nil || appCore.Router == nil {
		return fmt.Errorf("core router is not initialized")
	}

	appCore.Router.Get("/", homeHandler(appCore)).SetName("shell.home")
	appCore.Router.Get("/healthz", healthHandler(appCore)).SetName("shell.healthz")
	appCore.Router.Get("/readyz", readyHandler(appCore)).SetName("shell.readyz")
	return nil
}

func homeHandler(appCore *core.Core) router.HandlerFunc {
	return func(c router.Context) error {
		if appCore == nil || appCore.Config == nil {
			return c.JSON(500, map[string]any{"error": "core config is unavailable"})
		}

		cfg := appCore.Config
		view := homeView{
			Name:          cfg.Name,
			Env:           cfg.Env,
			Address:       normalizeAddress(cfg.Server.Address),
			AdminBasePath: cfg.Admin.BasePath,
			ConfigPath:    cfg.ConfigPath,
			StartedAt:     appCore.StartedAt.Format(time.RFC3339),
			DemoToken:     strings.TrimSpace(appCore.DemoToken),
			Features:      appCore.Features(),
			Credentials:   appCore.DemoCredentials,
			Links: []link{
				{Label: "Home", Href: "/"},
				{Label: "Admin root", Href: cfg.Admin.BasePath},
				{Label: "Admin login", Href: path.Join(cfg.Admin.BasePath, "login")},
				{Label: "Admin dashboard API", Href: path.Join(cfg.Admin.BasePath, "api", "dashboard")},
				{Label: "Admin navigation API", Href: path.Join(cfg.Admin.BasePath, "api", "navigation")},
				{Label: "Health", Href: "/healthz"},
				{Label: "Ready", Href: "/readyz"},
			},
		}
		if view.DemoToken == "" {
			view.DemoToken = "(token mint failed)"
		}

		var out bytes.Buffer
		if err := homeTemplate.Execute(&out, view); err != nil {
			return c.JSON(500, map[string]any{"error": "failed to render home page", "details": err.Error()})
		}
		c.SetHeader("Content-Type", "text/html; charset=utf-8")
		return c.SendString(out.String())
	}
}

func healthHandler(appCore *core.Core) router.HandlerFunc {
	return func(c router.Context) error {
		return c.JSON(200, map[string]any{
			"ok":         true,
			"service":    "admin-shell",
			"started_at": appCore.StartedAt.Format(time.RFC3339),
			"timestamp":  time.Now().UTC().Format(time.RFC3339),
		})
	}
}

func readyHandler(appCore *core.Core) router.HandlerFunc {
	return func(c router.Context) error {
		ready := appCore != nil && appCore.Admin != nil && appCore.Auther != nil && appCore.Server != nil
		status := 200
		if !ready {
			status = 503
		}
		return c.JSON(status, map[string]any{
			"ready":             ready,
			"admin_initialized": appCore != nil && appCore.Admin != nil,
			"auth_initialized":  appCore != nil && appCore.Auther != nil,
			"token_available":   appCore != nil && strings.TrimSpace(appCore.DemoToken) != "",
			"timestamp":         time.Now().UTC().Format(time.RFC3339),
		})
	}
}

func normalizeAddress(address string) string {
	address = strings.TrimSpace(address)
	if address == "" {
		return ""
	}
	if strings.HasPrefix(address, "http://") || strings.HasPrefix(address, "https://") {
		return address
	}
	if strings.HasPrefix(address, ":") {
		return "http://localhost" + address
	}
	return "http://" + address
}
