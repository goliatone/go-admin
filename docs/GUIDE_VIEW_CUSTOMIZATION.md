# View Customization Guide

This guide explains how go-admin templates are packaged, how the view engine is wired, and how to customize views, template helpers, and themes in a host application.

## What it provides

- Embedded admin templates and assets via `pkg/client` (HTML templates + static assets).
- Quickstart view engine setup with first-wins template/assets stacking.
- Default template helpers (JSON, dict, singularize/pluralize, adminURL, widget titles, etc.).
- Canonical client shell templates used by ordinary and dashboard SSR views.
- Theme payload handoff points for templates; detailed go-theme wiring lives in
  `docs/GUIDE_THEME.md`.
- Opt-in UI route helpers for the admin shell, notifications, and auth pages.
- Optional asset fallback probing for local dev builds.
- Default export template renderer wiring (HTML + PDF).

For schema-driven form generation, UI schema overlays, formgen component
registration, and field-level form templates, see `docs/GUIDE_FORMGEN.md`.

## Template sources and layering

The view engine normalizes every filesystem to its template root and resolves
the first file found. The order is:

`quickstart.NewViewEngine(baseFS, ...)`:

- each `WithViewTemplatesFS(...)` value, in call order;
- `baseFS` (looking below `templates/` when that directory exists);
- quickstart compatibility fallbacks such as `SidebarTemplatesFS()`.

`WithViewTemplatesFS` therefore supplies overlays, not trailing fallbacks. An
overlay may contain one file; missing paths continue through the stack.

- Put host overrides in a filesystem passed through `WithViewTemplatesFS`.
- Keep `client.FS()` or `client.Templates()` as the base to retain packaged
  pages and partials.

## Using the embedded templates

The admin UI templates ship with the module and are exported from `pkg/client`.

```go
views, err := quickstart.NewViewEngine(
	client.FS(),
	quickstart.WithViewAdmin(adm),
	quickstart.WithViewURLResolver(adm.URLs()),
	quickstart.WithViewBasePath(cfg.BasePath),
)
if err != nil {
	return err
}

host := quickstart.NewHostRouter(r, cfg)
quickstart.NewStaticAssets(host.Static(), cfg, client.Assets())
```

If you override template funcs, pass the URLKit resolver (or the base path fallback) into the defaults so `adminURL` stays correct:

```go
funcs := quickstart.DefaultTemplateFuncs(
	quickstart.WithTemplateURLResolver(adm.URLs()),
	quickstart.WithTemplateBasePath(cfg.BasePath),
)
views, err := quickstart.NewViewEngine(
	client.FS(),
	quickstart.WithViewAdmin(adm),
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

Your copy takes precedence when its filesystem is passed through
`WithViewTemplatesFS`.

Keep the embedded templates as the base and prepend the host overlay:

```go
views, err := quickstart.NewViewEngine(
	client.Templates(),
	quickstart.WithViewTemplatesFS(os.DirFS("./web/templates")),
	quickstart.WithViewAdmin(adm),
)
```

## Canonical authenticated shell

Authenticated pages extend `layout.html` directly or through the shared list
and detail bases. The shell owns the sidebar, page-header frame, below-header
region, content boundary, and optional footer. Pages fill these blocks:

- `page_title`, `page_pretitle`, and `page_subtitle`;
- `page_header_actions` (with `header_actions`,
  `header_actions_prepend`, and `header_actions_append` compatibility aliases);
- `page_below_header` (with the `tabs_area` compatibility alias);
- `content` (nested beneath the canonical `shell_content` block).

Do not copy `layout.html` merely to change page actions. Extend a packaged base:

```html
{% extends "resources/shared/list-base.html" %}
{% block page_title %}Orders{% endblock %}
{% block header_actions_append %}
  <button class="btn btn-secondary" data-export-orders>Export</button>
{% endblock %}
```

The legacy `partials/admin-page-header.html` include and `header_*`/`tabs_area`
aliases remain for at least one major release. New templates should use the
shell-owned blocks. The compatibility include delegates breadcrumbs to the
canonical leaf and must not become a second public block owner.

### Bounded structural partial overrides

Only three Admin-owned structural keys are supported:

| Key | Packaged path |
|---|---|
| `admin.shell.sidebar` | `partials/sidebar.html` |
| `admin.page.breadcrumbs` | `partials/breadcrumbs.html` |
| `admin.shell.footer` | `partials/admin-footer.html` |

A fixed-path override needs only the matching file in the host overlay. For
example, embed `templates/partials/breadcrumbs.html`, prepend that filesystem,
and bind the exact stack to Admin:

```go
views, err := quickstart.NewViewEngine(
	client.FS(),
	quickstart.WithViewTemplatesFS(hostTemplates),
	quickstart.WithViewAdmin(adm),
)
```

The embedded breadcrumb override is a normal leaf; it receives the existing
resolved `breadcrumbs` input:

```html
{% if breadcrumbs %}
<nav aria-label="Breadcrumb" data-host-breadcrumbs>
  {% for crumb in breadcrumbs %}
    {% if crumb.href and not crumb.current %}<a href="{{ crumb.href }}">{{ crumb.label }}</a>{% else %}<span {% if crumb.current %}aria-current="page"{% endif %}>{{ crumb.label }}</span>{% endif %}
  {% endfor %}
</nav>
{% endif %}
```

For richer host chrome, keep page actions in the page block shown above and
override only `partials/admin-footer.html` (or select another registered footer
path):

```html
<footer class="admin-shell-footer border-t px-8 py-3" data-admin-shell-footer>
  <span>{{ deployment_name }}</span>
  <a href="{{ support_url }}">Support</a>
</footer>
```

For a theme-selected alternative, register a safe template identifier in the
manifest and provide that file through the same view stack:

```go
manifest.Templates[admin.AdminPartialPageBreadcrumbs] = "themes/acme/breadcrumbs.html"
```

Manifest metadata never mounts files. Identifiers must be relative `.html`
paths using letters, numbers, `/`, `.`, `_`, or `-`; absolute paths, traversal,
backslashes, queries/fragments, hidden segments, controls, and unregistered
files fall back to the packaged path. Without `WithViewAdmin`, Admin deliberately
ignores structural manifest metadata and returns packaged defaults.

Rejected reserved keys use safe diagnostics with reason codes
`invalid_identifier`, `template_unavailable`, or `unsupported_admin_key`.
Diagnostics are sorted, deduplicated, omit raw candidate values, and are capped
at eight per request under `admin_partial_diagnostics`.

Inside templates, the resolved `admin_partials` contract is a serialized
lowercase map: `admin_partials.sidebar`, `admin_partials.breadcrumbs`,
`admin_partials.footer`, and `admin_partials.diagnostics`. Use these lowercase
keys in host templates. Go integrations should continue to use the typed
`admin.AdminStructuralPartials` API.

The embedded resource CRUD templates under `pkg/client/templates/resources/*` are reusable defaults and can be overridden the same way. Auth and shell templates live at `pkg/client/templates/login.html`, `pkg/client/templates/password_reset.html`, `pkg/client/templates/password_reset_confirm.html`, `pkg/client/templates/admin.html`, and `pkg/client/templates/notifications.html`.

Resource form templates usually wrap `form_html`, which is generated by
go-formgen. Use this guide for page template layering, and use
`docs/GUIDE_FORMGEN.md` for the schema, component, and form renderer pipeline.

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

## Panel List DataGrid Contract

Quickstart list routes now provide a canonical DataGrid wiring object in view
context: `datagrid_config`.

Use these keys in templates:

- `datagrid_config.table_id`
- `datagrid_config.api_endpoint`
- `datagrid_config.action_base`
- `datagrid_config.preferences_endpoint` (optional)
- `datagrid_config.column_storage_key`
- `datagrid_config.translation_ux_enabled` (optional)
- `datagrid_config.enable_grouped_mode` (optional)
- `datagrid_config.default_view_mode` (optional)
- `datagrid_config.group_by_field` (optional)
- `datagrid_config.state_store` (optional: `mode`, `resource`, `sync_debounce_ms`, `hydrate_timeout_ms`, `max_share_entries`)
- `datagrid_config.url_state` (optional: `max_url_length`, `max_filters_length`, `enable_state_token`)
- `datagrid_config.export_config`

Recommended template pattern:

```js
const dataGridConfig = {{ toJSON(datagrid_config)|safe }} || {};
const tableId = `${dataGridConfig.table_id || '{{ datatable_id|default:resource }}'}-datatable`;
const apiEndpoint = dataGridConfig.api_endpoint || '{{ list_api|default:"" }}';
const actionBasePath = dataGridConfig.action_base || '{{ action_base|default:"" }}';
const preferencesEndpoint = dataGridConfig.preferences_endpoint || '{{ preferences_api_path|default:"" }}';
const stateStoreConfig = dataGridConfig.state_store || null;
const urlStateConfig = dataGridConfig.url_state || null;
const exportConfig = dataGridConfig.export_config || {{ toJSON(export_config)|safe }};
```

`state_store` defaults to local browser storage when omitted. `url_state`
controls URL sync guardrails and optional state-token fallback to avoid long
query strings.

Legacy keys (`datatable_id`, `list_api`, `action_base`, `export_config`) are
still injected for compatibility, but treat them as fallback-only for custom
templates.

### Preserving semantic DataGrid hooks

The embedded list template opts into theme-aware presentation with
`admin-datagrid` and `admin-datagrid__*` classes. Dynamic rows and states use
the same namespace, plus `data-state`, `data-datagrid-state`, and
`data-selected`. These are presentation hooks; existing DataGrid IDs and
behavioral data attributes remain the runtime contract.

When replacing `resources/shared/list-base.html`, preserve or reproduce the
semantic hooks if the custom view should consume `datagrid.*` tokens. Custom
markup that omits them keeps its own current styling. Do not apply these
classes to public-site tables: admin theme variables are intentionally scoped
to the admin layout.

Rebuild generated assets after changing DataGrid TypeScript or CSS:

```sh
cd pkg/client/assets
npm run build
npm test
```

For full CRUD, DataGrid, and workflow/action wiring, see
`docs/GUIDE_CRUD.md`.

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
      "reason_code": "INVALID_STATUS",
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

### permission-matrix component

Roles use a custom `permission-matrix` form component registered through
`admin.PermissionMatrixDescriptor(basePath)`.

For the general component registration and UI schema overlay flow, see
`docs/GUIDE_FORMGEN.md`.

Template override key:

- `forms.permission-matrix` (defaults to `templates/components/permission_matrix.tmpl`)

If you override the template and keep chips-based Additional permissions, ensure
the host page loads and initializes relationship runtime:

- `runtime/formgen-relationships.min.js`
- `window.FormgenRelationships.initRelationships(...)`

For full component behavior, options, and roles split configuration, see
`GUIDES_PERMISSION_MATRIX.md`.

## Auth UI slots (login extra)

### Login logo placement

The packaged login template supports two logo positions through
`admin.Config.LoginLogoPlacement`:

- `admin.LoginLogoPlacementOutsideCard` is the backward-compatible default.
- `admin.LoginLogoPlacementInsideCard` renders the same theme-resolved mark at
  the top of the login card, before the heading and form.

Use `quickstart.WithLoginLogoPlacement(...)` when assembling quickstart config.
Empty and unknown values normalize to `outside-card`. The logo never moves
inside the HTML `<form>` element; this option controls the surrounding login
card composition and keeps the identity mark outside form submission semantics.

The shared markup lives in `partials/login-logo.html`, so theme icon/logo and
fallback behavior remain identical in both positions.

### Additional login content

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

### Auth UI SSO providers

The default login template can render SSO sign-in controls from
`sso_providers`, a display-only view context value injected by an integration
through `WithAuthUIViewContextBuilder(...)`. go-admin only renders the supplied
provider entries; provider discovery, OIDC configuration, begin-login routes,
callbacks, and secret filtering belong in the auth integration.

Each provider entry is a map with these keys:

| Key | Type | Description |
|-----|------|-------------|
| `key` | `string` | Stable non-secret provider identifier |
| `label` | `string` | Required user-facing provider name |
| `login_url` | `string` | Required begin-login URL for enabled providers |
| `icon_class` | `string` | Optional CSS/icon class metadata |
| `icon_url` | `string` | Optional image/icon asset URL |
| `disabled_reason` | `string` | Optional non-secret unavailable reason |

Rendering rules:

- Missing or empty `sso_providers` omits the SSO divider and provider section.
- Entries without a usable `label` are ignored.
- Entries with `label`, `login_url`, and no `disabled_reason` render as links.
- Entries with `disabled_reason` render disabled and never include an `href`.
- A usable `login_url` is a non-empty relative URL or `http`/`https` URL
  without control characters; blank URLs and unsafe schemes are filtered.
- The section renders only when at least one provider remains after malformed
  entries are filtered.

Example:

```go
quickstart.WithAuthUIViewContextBuilder(func(ctx router.ViewContext, c router.Context) router.ViewContext {
	ctx["sso_providers"] = []map[string]any{
		{
			"key":        "acme",
			"label":      "Acme ID",
			"login_url":  "/admin/auth/sso/acme",
			"icon_class": "iconoir-key",
		},
		{
			"key":             "okta",
			"label":           "Okta",
			"disabled_reason": "Temporarily unavailable",
		},
	}
	return ctx
})
```

When overriding auth or admin templates, preserve the CSRF helpers:

- Keep `{{ csrf_meta|safe }}` in the page `<head>` so browser scripts can read `meta[name="csrf-token"]`.
- Keep `{{ csrf_field|safe }}` inside custom HTML forms that post back to protected browser routes.
- For custom same-origin JavaScript writes, send `X-CSRF-Token` using the value from `meta[name="csrf-token"]`.

## Rendering from custom handlers

Use `quickstart.RenderTemplateView(...)` when a custom quickstart handler
should preserve the same template boundary as packaged routes:

```go
viewCtx := quickstart.WithNav(
    router.ViewContext{"record": record},
    adm,
    cfg,
    "records",
    c.Context(),
)
return quickstart.RenderTemplateView(c, "records/detail", viewCtx)
```

The helper uses the active router view engine, propagates request CSRF helpers,
and normalizes whole-number JSON values before rendering. It returns an error
for a nil router context. Prefer it over a direct `c.Render(...)` call when a
custom handler must match quickstart form/CSRF behavior or when view data came
through generic JSON decoding.

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
| `panelURL` | `panelURL(panel string) string` | Resolves canonical panel entry URL (for most panels this is list; some panels can resolve to detail based on `PanelEntryMode`) |
| `panelDetailURL` | `panelDetailURL(panel, id string) string` | Resolves panel detail URL (e.g., `/admin/users/123`) |
| `panelEditURL` | `panelEditURL(panel, id string) string` | Resolves panel edit URL (e.g., `/admin/users/123/edit`) |
| `panelPreviewURL` | `panelPreviewURL(panel, id string) string` | Resolves panel preview URL (e.g., `/admin/users/123/preview`) |
| `renderMenuIcon` | `renderMenuIcon(icon string) string` | Renders sidebar/menu icon HTML (emoji, SVG field-type key, or Iconoir) |
| `renderIcon` | `renderIcon(icon string) string` | Renders icon HTML using injected renderer or legacy fallback |
| `renderIconVariant` | `renderIconVariant(icon, variant string) string` | Renders icon HTML with variant using injected renderer |
| `dict` | `dict(values ...any) (map[string]any, error)` | Creates a dictionary from key-value pairs (keys must be strings) |

When `WithTemplateFeatureGate` is configured, additional feature gate helpers are registered from go-featuregate (e.g., `featureEnabled`, `featureDisabled`).

Usage guidance:

- `adminURL(...)` is built in and should be the default choice for admin-relative links and admin-hosted assets.
- Use `asset_base_path` directly only when the template must honor a separate asset host/CDN instead of the admin base path.
- Avoid hand-building admin URLs with `{{ base_path }}/...` when `adminURL(...)` expresses the intent directly.

Entry-route note:

- `panelURL("profile")` resolves to `/admin/profile`, but the rendered view is
  controlled by panel entry mode. For built-in profile this is
  `detail_current_user`, so it opens the current-user detail screen.

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

## View context variables

Admin layout templates receive a view context with standard keys injected by `buildAdminLayoutViewContext` (core) and quickstart helpers. These variables are available in all admin templates at runtime.

### Core layout variables

| Variable | Type | Description | Source |
|----------|------|-------------|--------|
| `base_path` | `string` | Admin base path (e.g., `/admin`) | `admin.Config.BasePath` |
| `api_base_path` | `string` | API base path (e.g., `/admin/api`) | URLKit or config |
| `asset_base_path` | `string` | Asset base path (defaults to `base_path`) | Config or explicit |
| `active` | `string` | Active menu item key for nav highlighting | Route handler |
| `title` | `string` | Page title | Route handler |
| `nav_items` | `[]map[string]any` | Navigation menu items | `Navigation.ResolveMenu()` |
| `session_user` | `map[string]any` | Current user session data | Auth context |
| `theme` | `map[string]map[string]string` | Theme payload (`selection`, `tokens`, `css_vars`, `assets`, `partials`, `chart`) | `ThemeProvider` |

### Panel list variables

These keys are injected for quickstart panel/content-entry list templates:

| Variable | Type | Description |
|----------|------|-------------|
| `datagrid_config` | `map[string]any` | Canonical DataGrid contract (`table_id`, `api_endpoint`, `action_base`, `column_storage_key`, optional `state_store`, optional `url_state`, `export_config`) |
| `datatable_id` | `string` | Legacy compatibility key for table base id (fallback) |
| `list_api` | `string` | Legacy compatibility key for list endpoint (fallback) |
| `action_base` | `string` | Legacy compatibility key for row action base path (fallback) |
| `export_config` | `map[string]any` | Legacy compatibility key for export behavior (fallback) |

### Session user object (`session_user`)

The `session_user` map contains authenticated user data:

| Key | Type | Description |
|-----|------|-------------|
| `id` | `string` | User ID |
| `subject` | `string` | JWT subject |
| `username` | `string` | Username |
| `email` | `string` | Email address |
| `role` | `string` | Primary role |
| `tenant_id` | `string` | Tenant ID (if tenants feature enabled) |
| `organization_id` | `string` | Organization ID (if orgs feature enabled) |
| `environment` | `string` | Environment name |
| `resource_roles` | `map[string]string` | Resource-specific roles |
| `metadata` | `map[string]any` | Additional claims metadata |
| `scopes` | `[]string` | Collected scopes |
| `is_authenticated` | `bool` | Whether user is authenticated |
| `display_name` | `string` | Display name for UI |
| `subtitle` | `string` | Subtitle (e.g., `role @ tenant`) |
| `initial` | `string` | First character of display name |
| `avatar_url` | `string` | Avatar image URL |
| `issued_at` | `time.Time` | Token issue time |
| `expires_at` | `time.Time` | Token expiration time |

### Navigation item structure (`nav_items`)

Each item in `nav_items` contains:

| Key | Type | Description |
|-----|------|-------------|
| `id` | `string` | Menu item ID |
| `type` | `string` | Item type (`item`, `group`, `divider`) |
| `label` | `string` | Display label |
| `label_key` | `string` | i18n key for label |
| `group_title` | `string` | Group heading title |
| `group_title_key` | `string` | i18n key for group title |
| `icon` | `string` | Icon reference (emoji, library/Iconoir name, or `asset:<role>` / `theme:<role>` theme asset) |
| `href` | `string` | Link URL |
| `key` | `string` | Unique key for active matching |
| `badge` | `any` | Badge content |
| `classes` | `string` | CSS classes |
| `styles` | `string` | Inline styles |
| `children` | `[]map[string]any` | Child menu items |
| `has_children` | `bool` | Whether item has children |
| `collapsible` | `bool` | Whether item can collapse |
| `collapsed` | `bool` | Current collapsed state |
| `expanded` | `bool` | Whether expanded (inverse of collapsed) |
| `position` | `int` | Sort position |
| `active` | `bool` | Whether this item is active |
| `child_active` | `bool` | Whether a child is active |
| `enabled` | `bool` | Present when the resolver explicitly marked the item enabled or disabled |
| `disabled` | `bool` | True when the item should render as a disabled non-link |
| `aria_disabled` | `bool` | True when templates should emit `aria-disabled="true"` |
| `disabled_reason` | `string` | Human-readable unavailable reason |
| `disabled_reason_code` | `string` | Stable reason code such as `permission_denied` |
| `missing_permission` | `string` | First missing permission when available |

### Navigation permission-denial rendering

Navigation items with `Permissions` are hidden by default when the active user is denied. Configure `admin.Config.NavPermissionDeniedMode` or quickstart `WithNavPermissionDeniedMode(admin.NavigationPermissionDeniedModeDisable)` to keep denied items visible with disabled metadata. Public site CMS menus use the same `permission_denied_mode` field on `quickstart/site.SiteNavigationConfig`, and their permission checks continue to use the `navigation` authorization resource for compatibility.

Recommended environment policy:

- Development/staging: `disable`, so missing role or permission grants are visible in the menu.
- Production: `hide`, so restricted feature names and links are not exposed.

Use the shared template helpers instead of duplicating inline checks:

```pongo
{% if navItemVisible(item) %}
  {% if navItemDisabled(item) %}
    <span aria-disabled="true" title="{{ item.disabled_reason|default:'Unavailable' }}">{{ item.label }}</span>
  {% else %}
    <a href="{{ item.href }}">{{ item.label }}</a>
  {% endif %}
{% endif %}
```

### Theme payload (`theme`)

| Key | Type | Description |
|-----|------|-------------|
| `tokens` | `map[string]string` | Theme CSS tokens |
| `selection` | `map[string]string` | Active theme selection (`name`, `variant`) |
| `assets` | `map[string]string` | Resolved theme assets (`logo`, `icon`, `favicon`, `icon-*`) plus optional `prefix` |
| `css_vars` | `map[string]string` | CSS variable names and values, for example `--primary` |
| `semantic_tokens` | `map[string]string` | Valid canonical values supported by the go-admin semantic profile |
| `styles` | `map[string]string` | Safe declarations under `root`; this is the only theme style emitted by shared layouts |
| `partials` | `map[string]string` | Provider-supplied template partial references |
| `chart` | `map[string]string` | Chart renderer metadata, currently `theme` |

Additional top-level keys when using `WithThemeContext`:
- `theme_name` - Active theme name
- `theme_variant` - Active theme variant

Shared admin layout enrichment also supplies:

| Variable | Type | Description |
|---|---|---|
| `sidebar_hide_search` | `bool` | Whether the shared sidebar omits its search slot |
| `external_assets` | `map[string]string` | Resolved Iconoir, simple-datatables, and ECharts document URLs |

### Feature context variables

Injected by quickstart UI routes and by `quickstart.WithNav(...)` / `quickstart.WithNavPlacements(...)` via `withUIFeatureContext`:

| Variable | Type | Description |
|----------|------|-------------|
| `activity_enabled` | `bool` | Activity feature enabled |
| `activity_feature_enabled` | `bool` | Alias for `activity_enabled` |
| `translation_capabilities` | `map[string]any` | Translation module capabilities |
| `body_classes` | `string` | Feature-aware CSS classes for `<body>` |

Custom handlers that call `quickstart.WithNav(...)` inherit the same feature keys as built-in quickstart UI routes.

Feature gate template context keys (from go-featuregate):
- `_fg_ctx` - Request context for feature checks
- `_fg_scope` - Scope data for feature evaluation
- `_fg_snapshot` - Feature state snapshot

### Debug context variables

When debug mode is enabled (`cfg.Debug.Enabled`):

| Variable | Type | Description |
|----------|------|-------------|
| `layout_mode` | `string` | Debug layout mode (`admin` or `standalone`) |
| `debug_path` | `string` | Debug panel path |
| `debug_standalone_path` | `string` | Standalone debug path |
| `debug_admin_path` | `string` | Admin-embedded debug path |
| `debug_toolbar_enabled` | `bool` | Whether debug toolbar is shown |
| `hide_content_header` | `bool` | Hide content header in admin layout |

### Auth UI context variables

For login/registration pages via `WithAuthUIViewContext`:

| Variable | Type | Description |
|----------|------|-------------|
| `password_reset_path` | `string` | Password reset page path |
| `password_reset_confirm_path` | `string` | Password reset confirm path |
| `register_path` | `string` | Registration page path |
| `sso_providers` | `[]map[string]any` | Optional display-only SSO providers supplied by integrations |

### Route-specific API paths

Injected by specific UI route handlers:

| Variable | Route | Description |
|----------|-------|-------------|
| `activity_api_path` | `/admin/api/activity` | Activity API endpoint path |
| `feature_flags_api_path` | `/admin/api/feature-flags` | Feature flags API endpoint path |
| `translation_exchange_api_path` | `/admin/api/translations/exchange` | Translation exchange API endpoint path |

### Navigation debug variables

When `NAV_DEBUG=true`:

| Variable | Type | Description |
|----------|------|-------------|
| `nav_items_json` | `string` | JSON-serialized nav items |
| `nav_debug` | `bool` | Debug mode flag |

### Using view context in templates

Example template usage:

```html
{% if session_user.is_authenticated %}
  <span>{{ session_user.display_name }}</span>
  <img src="{{ session_user.avatar_url }}" alt="{{ session_user.initial }}">
{% endif %}

{% for item in nav_items %}
  <a href="{{ item.href }}" class="{% if item.active %}active{% endif %}">
    {{ item.label }}
  </a>
{% endfor %}

<link rel="stylesheet" href="{{ asset_base_path }}/assets/output.css">
<script>
  const API_BASE = "{{ api_base_path }}";
</script>
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

Quickstart dashboard SSR uses the same canonical client shell as ordinary
views. `DashboardTemplatesFS()` returns `client.Templates()`; there is no
compact alternate dashboard document.

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

When `views` is the shared application view engine, the dashboard renderer uses
that exact stack. The standalone renderer prepends `WithDashboardTemplatesFS`
values to the canonical client templates. If
`WithDashboardEmbeddedTemplates(false)` is used, the supplied stack must
contain the complete compatible shell and dashboard template set or renderer
construction fails explicitly.

### Dashboard canonical payload contract

Dashboard rendering now uses one canonical widget payload shape for both SSR and
client hydration:

- Widget handlers return `admin.WidgetPayload` built from typed view models.
- SSR and client consume the same payload fields.
- Render mode (`ssr` vs `client`) is a transport concern only, not a data-shape concern.
- Dashboard payloads must not include full-document/script blobs (for example
  `chart_html`, `<html>`, `<body>`, `<script>`).

For chart widgets, return structured chart data (for example `chart_type`,
`chart_options`, `theme`) and let templates/client renderers draw from those
fields.

Template context serialization should always go through
`router.SerializeAsContext(...)` before rendering so numeric values stay stable
for templates (for example integer spans stay `6`, not `6.000000`).

## Theming

Use `docs/GUIDE_THEME.md` for the canonical `go-theme` wiring contract,
semantic profiles and diagnostics, resolution order, typed form/dashboard
adapters, sidebar assets, preferences overrides, and public-site theme
isolation.

When rendering custom views, use the helper to inject theme payloads (supports query overrides):

```go
viewCtx = quickstart.WithThemeContext(viewCtx, adm, c)
```

Manifest partials and view templates are different layers.
`theme.partials["forms.input"]`, for example, is metadata for a renderer that
reads that key; it does not make a template file available to the admin view
engine. The three reserved Admin structural keys are also metadata until
`WithViewAdmin(adm)` validates their identifiers against the registered
first-wins stack. Override a concrete admin template through that filesystem
stack; never treat a manifest path as file delivery.

When overriding `partials/sidebar.html`:

- call `renderThemeMenuIcon(item.icon, theme.assets)` so `asset:<role>` and
  `icon-<normalized-name>` assets fall back safely to normal icon rendering;
- keep `logo`, `icon`, and favicon roles distinct;
- preserve the mobile disclosure state attributes, `aria-expanded`, Escape and
  focus behavior, breakpoint hooks, and the desktop collapsed-state key;
- keep collapsed presentation keyed from
  `html[data-admin-sidebar-collapsed="true"] #sidebar` so the saved desktop
  state is correct before the sidebar element and normal runtime are parsed,
  without affecting module-owned `.sidebar` elements;
- preserve the `sidebar_hide_search` conditional when hosts may remove search.

The stock `layout.html` needs no sidebar-state configuration. A full layout
override must retain the render-blocking `assets/sidebar-state.js` tag in the
head before shell stylesheets, and must serve that file through
`asset_base_path`. Assets are same-origin by default; a CDN asset host must be
allowed by the document's `script-src` CSP. Place the regular `sidebar.js`
immediately after the sidebar markup and before main content. The head asset
establishes the first-paint root state; the adjacent runtime synchronizes
element attributes, accessibility metadata, interactions, and safe persistence
before page content is parsed. Deferring the head asset or moving the runtime
after main content reintroduces an inconsistent shell initialization window.

Theme icon assets accept safe relative paths or `http`/`https` URLs. They render
as decorative images with the canonical
`--admin-sidebar-icon-size` variable, falling back to the legacy
`--sidebar-icon-size`.

## Static assets

Use the embedded assets or serve your own:

```go
host := quickstart.NewHostRouter(r, cfg)
quickstart.NewStaticAssets(host.Static(), cfg, client.Assets())
```

To override assets, mount your FS first or use `quickstart.NewStaticAssets(...)` with your own FS.

The helper mounts separate package-owned surfaces:

| Surface | Default prefix | Option |
|---|---|---|
| Admin/host/sidebar assets | `<basePath>/assets` | `WithAssetsPrefix` |
| go-formgen runtime | `<basePath>/runtime` plus required root alias | `WithRuntimePrefix` |
| go-formgen renderer assets | `<basePath>/formgen` | `WithFormgenPrefix` |
| go-dashboard ECharts | `/dashboard/assets/echarts` | `WithEChartsPrefix` |
| go-dashboard shell | `/dashboard/assets/shell` | `WithDashboardShellPrefix` |

The admin asset filesystem is first-wins: disk development override, supplied
host assets, extra fallbacks, explicit `WithSidebarAssetsFS` overrides, then
packaged sidebar assets. A custom sidebar filesystem may override one file;
missing files continue to use packaged state, runtime, and stylesheet assets.
Theme manifest filenames do not mount files; their resolved prefix must point
at one of these or another host-owned static route.

For local dev fallback, opt in and probe for a disk build:

```go
diskAssetsDir := quickstart.ResolveDiskAssetsDir(
	"output.css",
	"path/to/pkg/client/assets",
	"assets",
)
quickstart.NewStaticAssets(
	host.Static(),
	cfg,
	client.Assets(),
	quickstart.WithDiskAssetsDir(diskAssetsDir),
)
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
