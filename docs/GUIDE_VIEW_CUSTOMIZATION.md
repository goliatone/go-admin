# View Customization Guide

This guide explains how go-admin templates are packaged, how the view engine is wired, and how to customize views, template helpers, and themes in a host application.

## What it provides

- Embedded admin templates and assets via `pkg/client` (HTML templates + static assets).
- Quickstart view engine setup with template/assets fallback stacking.
- Default template helpers (JSON, dict, singularize/pluralize, adminURL, widget titles, etc.).
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
	quickstart.WithViewURLResolver(adm.URLs()),
	quickstart.WithViewBasePath(cfg.BasePath),
)
if err != nil {
	return err
}

quickstart.NewStaticAssets(r, cfg, client.Assets())
```

If you override template funcs, pass the URLKit resolver (or the base path fallback) into the defaults so `adminURL` stays correct:

```go
funcs := quickstart.DefaultTemplateFuncs(
	quickstart.WithTemplateURLResolver(adm.URLs()),
	quickstart.WithTemplateBasePath(cfg.BasePath),
)
views, err := quickstart.NewViewEngine(
	client.FS(),
	quickstart.WithViewTemplateFuncs(funcs),
)
```

Important: `baseFS` must include templates (use `client.FS()` or `client.Templates()` as the base FS).
Using `client.Assets()` as `baseFS`, or disabling embeds without providing templates on disk, will break template lookups
such as `resources/debug/index` (e.g., `/admin/debug`). If you enable the admin layout
debug mode, it also looks for `resources/debug/index_admin`.

Also ensure every filesystem in the template stack shares the same root. If your
base is already rooted at templates (like `client.Templates()`), make sure any
custom FS is also rooted at `templates/`:

```go
customTemplates, _ := fs.Sub(os.DirFS("./web"), "templates")
views, err := quickstart.NewViewEngine(
	client.Templates(),
	quickstart.WithViewTemplatesFS(customTemplates),
)
```

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

The embedded resource CRUD templates under `pkg/client/templates/resources/*` are reusable defaults and can be overridden the same way. Auth and shell templates live at `pkg/client/templates/login.html`, `pkg/client/templates/password_reset.html`, `pkg/client/templates/password_reset_confirm.html`, `pkg/client/templates/admin.html`, and `pkg/client/templates/notifications.html`.

For content-entry panel-specific overrides, keep the same base filename under a
panel-specific directory:

- `templates/resources/content/list.html` (global fallback content list)
- `templates/resources/content/detail.html` (global fallback content detail)
- `templates/resources/<panel-slug>/list.html` (panel-specific list)
- `templates/resources/<panel-slug>/detail.html` (panel-specific detail)

When registering content entry routes, quickstart supports deterministic
template fallback probing via:

- `quickstart.WithContentEntryUITemplateFS(...)`
- `quickstart.WithContentEntryUITemplateExists(...)`

This allows per-panel templates to fall back cleanly to shared
`resources/content/*` templates when a panel-specific template is missing.

## Content DataGrid renderer extension

The content list DataGrid supports named renderers from server-provided column
metadata (`renderer` + `renderer_options`) and a client-side renderer registry.

To register custom renderer functions in templates/pages, assign:

```html
<script>
  window.contentEntryCellRenderers = {
    blocks_summary(value, record, column, context) {
      // context.options contains renderer_options
      return Array.isArray(value) ? `${value.length} blocks` : '-';
    }
  };
</script>
```

Then reference the renderer from a content type `ui_schema` field hint (for
example `renderer: "blocks_summary"`). Built-in renderers include `_array` and
`_object`, and `_object` supports `display_key` / `display_keys` options.

Note: content translation renderers (`locale`, `translation_status`,
`available_locales`) are injected after `window.contentEntryCellRenderers`, so
those built-in translation renderers take precedence when names collide.

### Row action disable states from API

When a list record includes `_action_state`, `SchemaActionBuilder` applies it
to row action buttons automatically. Disabled actions render as disabled and
show the server-provided reason (`reason`) as tooltip text.

Record fragment:

```json
{
  "_action_state": {
    "publish": {
      "enabled": false,
      "reason_code": "workflow_transition_not_available",
      "reason": "transition \"publish\" is not available from state \"published\""
    }
  }
}
```

No template changes are required if your list page already uses
`SchemaActionBuilder`.

### blocks_chips renderer

The `blocks_chips` renderer displays block arrays as styled chips with icons.
It automatically resolves block type icons from the `block_definitions` panel.

If you want this renderer as the default for `blocks`/`block-library-picker`
without setting `ui_schema` per content type, opt in at route registration:

```go
quickstart.RegisterContentEntryUIRoutes(
  r,
  cfg,
  adm,
  authn,
  quickstart.WithContentEntryRecommendedDefaults(),
)
```

**Configuration in ui_schema:**

```json
{
  "fields": {
    "blocks": {
      "renderer": "blocks_chips",
      "renderer_options": {
        "max_visible": 4,
        "show_count": true,
        "chip_variant": "muted"
      }
    }
  }
}
```

**Options:**

| Option            | Default     | Description                                        |
| ----------------- | ----------- | -------------------------------------------------- |
| `max_visible`     | `3`         | Maximum chips shown before overflow badge          |
| `show_count`      | `true`      | Show "+N more" badge when blocks exceed max        |
| `chip_variant`    | `"default"` | Styling: `default` (blue), `muted` (gray), `outline` |
| `block_icons_map` | auto        | Server-provided; can be overridden in ui_schema   |

The server automatically attaches `block_icons_map` by querying active block
definitions for the current environment. User-provided values take precedence.

## Auth UI slots (login extra)

The login template now exposes a slot block you can extend without modifying the base template:

```ejs
{% block login_extra %}{% endblock %}
```

Use it to inject demo-only content (credentials, disclaimers) by creating a new template that extends the base login template and fills the block:

```ejs
{% extends "login.html" %}

{% block login_extra %}
  {% include "partials/demo-credentials.html" %}
{% endblock %}
```

Wire the view engine to include your custom templates FS and point the auth UI to the new template:

```go
//go:embed templates/**
var webTemplates embed.FS

views, err := quickstart.NewViewEngine(
	client.FS(),
	quickstart.WithViewTemplatesFS(webTemplates),
)
if err != nil {
	return err
}

if err := quickstart.RegisterAuthUIRoutes(
	r,
	cfg,
	auther,
	authCookieName,
	quickstart.WithAuthUITemplates("login-demo", "password_reset"),
	quickstart.WithAuthUIPasswordResetConfirmTemplate("password_reset_confirm"),
); err != nil {
	return err
}
```

If the block is empty, the login page renders normally with no extra content.

## Template helpers (functions)

Quickstart exposes default helpers via `quickstart.DefaultTemplateFuncs(...)`.
`WithViewTemplateFuncs` is a strict override, so use `MergeTemplateFuncs` if you want to keep defaults.

Important: helpers are globals (functions), not filters. Call them like:

```ejs
{{ singularize(resource_label|default:resource)|title }}
```

### Available template functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `toJSON` | `toJSON(v any) string` | Serializes a value to JSON string |
| `safeHTML` | `safeHTML(s string) template.HTML` | Marks a string as safe HTML (deprecated, use `safe` filter) |
| `default` | `default(defaultVal, val any) any` | Returns `defaultVal` if `val` is nil or empty string |
| `getWidgetTitle` | `getWidgetTitle(definition string) string` | Resolves widget title from definition key (e.g., `admin.widget.user_stats`) |
| `formatNumber` | `formatNumber(value any) string` | Formats numbers with locale-aware separators |
| `singularize` | `singularize(s string) string` | Converts plural word to singular (via flect) |
| `pluralize` | `pluralize(s string) string` | Converts singular word to plural (via flect) |
| `adminURL` | `adminURL(path string) string` | Resolves admin-relative URL path (uses URLKit if configured) |
| `panelURL` | `panelURL(panel string) string` | Resolves panel list URL (e.g., `/admin/users`) |
| `panelDetailURL` | `panelDetailURL(panel, id string) string` | Resolves panel detail URL (e.g., `/admin/users/123`) |
| `panelEditURL` | `panelEditURL(panel, id string) string` | Resolves panel edit URL (e.g., `/admin/users/123/edit`) |
| `panelPreviewURL` | `panelPreviewURL(panel, id string) string` | Resolves panel preview URL (e.g., `/admin/users/123/preview`) |
| `renderMenuIcon` | `renderMenuIcon(icon string) string` | Renders sidebar/menu icon HTML (emoji, SVG field-type key, or Iconoir) |
| `renderIcon` | `renderIcon(icon string) string` | Renders icon HTML using injected renderer or legacy fallback |
| `renderIconVariant` | `renderIconVariant(icon, variant string) string` | Renders icon HTML with variant using injected renderer |
| `dict` | `dict(values ...any) (map[string]any, error)` | Creates a dictionary from key-value pairs (keys must be strings) |

When `WithTemplateFeatureGate` is configured, additional feature gate helpers are registered from go-featuregate (e.g., `featureEnabled`, `featureDisabled`).

### Template function options

| Option | Description |
|--------|-------------|
| `WithWidgetTitleOverrides(overrides map[string]string)` | Merges label overrides into the default widget title map |
| `WithWidgetTitleMap(titles map[string]string)` | Replaces the default widget title map entirely |
| `WithWidgetTitleFunc(fn func(string) string)` | Provides a custom widget title resolver function |
| `WithTemplateBasePath(basePath string)` | Sets the fallback base path used by `adminURL` |
| `WithTemplateURLResolver(urls urlkit.Resolver)` | Configures URLKit resolver for `adminURL` (preferred over base path) |
| `WithTemplateFeatureGate(gate, opts...)` | Registers feature gate template helpers from go-featuregate |
| `WithTemplateIconRenderer(renderFunc)` | Injects a custom icon renderer for `renderIcon`/`renderIconVariant` |

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
- Auth UI (`/admin/login`, `/admin/logout`, `/admin/password-reset`, `/admin/password-reset/confirm`).

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

### Feature-aware body classes (activity UI)

Quickstart admin UI routes now inject feature-state context keys that let templates style or disable UI surfaces without waiting for API failures:

- `activity_enabled` / `activity_feature_enabled` (bool)
- `body_classes` includes:
  - `feature-activity`
  - `feature-activity-enabled` or `feature-activity-disabled`
  - on the activity page only: `feature-enabled` or `feature-disabled`

The default `layout.html` appends `body_classes` to `<body class="...">`, so page CSS can branch on feature state:

```css
body.feature-activity-disabled #activity-enabled-content { display: none; }
body.feature-activity-disabled #activity-disabled { display: block; }
```

The default activity template also short-circuits JS bootstrapping when `feature-activity-disabled` is present, so it does not call the activity API.

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
