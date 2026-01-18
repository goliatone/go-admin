# View Customization Guide

This guide explains how go-admin templates are packaged, how the view engine is wired, and how to customize views, template helpers, and themes in a host application.

## What it provides

- Embedded admin templates and assets via `pkg/client` (HTML templates + static assets).
- Quickstart view engine setup with template/assets fallback stacking.
- Default template helpers (JSON, dict, singularize/pluralize, widget titles, etc.).
- Sidebar templates/assets and dashboard SSR templates embedded in quickstart.
- Theme wiring helpers for go-theme.
- Opt-in UI route helpers for the admin shell, notifications, and auth pages.
- Optional asset fallback probing for local dev builds.
- Default export template renderer wiring (HTML + PDF).

## Template sources and layering

The view engine always starts with a base filesystem and then appends optional fallbacks.

`quickstart.NewViewEngine(baseFS, ...)`:

- Uses `baseFS` as the primary template root (looks for `templates/` by default).
- Appends any `WithViewTemplatesFS(...)` fallbacks.
- Appends quickstart sidebar templates (`quickstart.SidebarTemplatesFS()`) automatically.

So overrides are "first wins":

- Put your customized templates in `baseFS/templates/...` to override.
- For fallbacks, pass additional FS values to `WithViewTemplatesFS(...)`.

## Using the embedded templates

The admin UI templates ship with the module and are exported from `pkg/client`.

```go
views, err := quickstart.NewViewEngine(
	client.FS(),
	quickstart.WithViewTemplateFuncs(quickstart.DefaultTemplateFuncs()),
)
if err != nil {
	return err
}

quickstart.NewStaticAssets(r, cfg, client.Assets())
```

Important: `baseFS` must include templates (use `client.FS()` or `client.Templates()` as the base FS).
Using `client.Assets()` as `baseFS`, or disabling embeds without providing templates on disk, will break template lookups
such as `resources/debug/index` (e.g., `/admin/debug`). If you enable the admin layout
debug mode, it also looks for `resources/debug/index_admin`.

## Overriding or extending templates

To override a template, copy it from `pkg/client/templates/...` into your own `templates/` directory, preserving the same relative path.

Example: override the users list

```go
templates/resources/users/list.html
```

Your copy will take precedence over the embedded version because `baseFS` is resolved first.

You can still fall back to the embedded templates:

```go
views, err := quickstart.NewViewEngine(
	os.DirFS("./web"),
	quickstart.WithViewTemplatesFS(client.Templates()),
)
```

The embedded resource CRUD templates under `pkg/client/templates/resources/*` are reusable defaults and can be overridden the same way. Auth and shell templates live at `pkg/client/templates/login.html`, `pkg/client/templates/password_reset.html`, `pkg/client/templates/admin.html`, and `pkg/client/templates/notifications.html`.

## Template helpers (functions)

Quickstart exposes default helpers via `quickstart.DefaultTemplateFuncs(...)`.
`WithViewTemplateFuncs` is a strict override, so use `MergeTemplateFuncs` if you want to keep defaults.

Important: helpers are globals (functions), not filters. Call them like:

```ejs
{{ singularize(resource_label|default:resource)|title }}
```

Example:

```go
funcs := quickstart.MergeTemplateFuncs(map[string]any{
	"titleize": strings.ToUpper,
}, quickstart.WithWidgetTitleOverrides(map[string]string{
	"admin.widget.user_profile_overview": "Profile Overview",
}))

views, err := quickstart.NewViewEngine(
	os.DirFS("./web"),
	quickstart.WithViewTemplateFuncs(funcs),
)
```

## UI routes (opt-in)

Quickstart can register common UI routes for you:

- Admin shell (`/admin`) and notifications (`/admin/notifications`).
- Auth UI (`/admin/login`, `/admin/logout`, `/admin/password-reset`).

```go
if err := quickstart.RegisterAdminUIRoutes(r, cfg, adm, authn); err != nil {
	return err
}

if err := quickstart.RegisterAuthUIRoutes(
	r,
	cfg,
	auther,
	authCookieName,
	quickstart.WithAuthUITitles("Login", "Password Reset"),
); err != nil {
	return err
}
```

Use `WithUIDashboardActive(...)` / `WithUINotificationsActive(...)` to control which nav item is marked active.
Use `WithUIViewContextBuilder(...)` to inject additional data into the admin/notifications templates.
Use `WithAuthUIViewContextBuilder(...)` if you need to inject theme or custom fields into the login/reset templates.

## Dashboard SSR templates

Quickstart provides a default dashboard renderer that uses embedded templates:

- Embedded dashboard templates: `quickstart.DashboardTemplatesFS()`
- Wiring helper: `quickstart.WithDefaultDashboardRenderer(...)`

To override:

```go
err := quickstart.WithDefaultDashboardRenderer(
	adm,
	views,
	cfg,
	quickstart.WithDashboardTemplatesFS(os.DirFS("./web/templates")),
)
```

## Theming

Use go-theme to standardize theme tokens across dashboard, CMS, and forms:

```go
selector, _, err := quickstart.NewThemeSelector(
	cfg.Theme,
	cfg.ThemeVariant,
	cfg.ThemeTokens,
	quickstart.WithThemeAssets(path.Join(cfg.BasePath, "assets"), map[string]string{
		"logo":    "logo.svg",
		"favicon": "logo.svg",
	}),
)
if err != nil {
	return err
}
adm.WithGoTheme(selector)
```

Preferences can optionally override theme/variant at runtime (see `docs/GUIDE_MOD_PREFERENCES.md`).

When rendering custom views, use the helper to inject theme payloads (supports query overrides):

```go
viewCtx = quickstart.WithThemeContext(viewCtx, adm, c)
```

## Static assets

Use the embedded assets or serve your own:

```go
quickstart.NewStaticAssets(r, cfg, client.Assets())
```

To override assets, mount your FS first or use `quickstart.NewStaticAssets(...)` with your own FS.

For local dev fallback, opt in and probe for a disk build:

```go
diskAssetsDir := quickstart.ResolveDiskAssetsDir(
	"output.css",
	"path/to/pkg/client/assets",
	"assets",
)
quickstart.NewStaticAssets(r, cfg, client.Assets(), quickstart.WithDiskAssetsDir(diskAssetsDir))
```

## Export templates

If you use go-export template/PDF renderers, quickstart provides a default wiring helper:

```go
if err := quickstart.ConfigureExportRenderers(
	exportBundle,
	client.Templates(),
	quickstart.WithExportTemplateFuncs(quickstart.DefaultTemplateFuncs()),
); err != nil {
	return err
}
```

## Key files

- `pkg/client/assets.go` (embedded templates/assets)
- `quickstart/view_engine.go` (template/asset stacking)
- `quickstart/template_funcs.go` (default helpers + options)
- `quickstart/sidebar_embed.go` (sidebar templates/assets)
- `quickstart/dashboard_templates.go` (dashboard SSR templates)
- `examples/web/main.go` (example wiring)
