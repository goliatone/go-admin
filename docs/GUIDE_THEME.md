# Guide: Theme and go-theme Integration

This guide is the canonical wiring reference for admin theming, `go-theme` integration, template theme payloads, preferences-driven theme selection, and public-site theme isolation. For template override mechanics, see `docs/GUIDE_VIEW_CUSTOMIZATION.md`. For route ownership and fallback policy, see `docs/GUIDE_ROUTING.md`.

Use it when wiring a host theme, adding branded assets, debugging theme payloads in templates, or migrating older shared theme wiring to separate admin and public-site theme providers.

## What It Provides

- Admin theme provider and `go-theme` selector wiring.
- Theme selection resolution order.
- Safe semantic projection, diagnostics, and template/API payload shape.
- Coordinated ownership across `go-theme`, `go-formgen`, `go-dashboard`, and
  `go-admin`.
- Quickstart selector, manifest, token, and asset conventions.
- Sidebar brand, menu-icon, shell, and external-asset rules.
- Preferences and request override behavior.
- Typed dashboard, chart, form, CMS, and custom-view integration points.
- Public-site theme isolation and `site_theme` handoff.
- Migration and validation checklist.

## Table Of Contents

- [What It Provides](#what-it-provides)
- [Core Model](#core-model)
- [Coordinated Package Contract](#coordinated-package-contract)
- [Admin Theme Contract](#admin-theme-contract)
- [go-theme Adapter](#go-theme-adapter)
- [Semantic Projection And Diagnostics](#semantic-projection-and-diagnostics)
- [Quickstart Wiring](#quickstart-wiring)
- [Manual Admin Wiring](#manual-admin-wiring)
- [Resolution Order](#resolution-order)
- [Theme Payload](#theme-payload)
- [Template Injection](#template-injection)
- [Template And Asset Ownership](#template-and-asset-ownership)
- [Brand Assets, Menu Icons, And Shell Configuration](#brand-assets-menu-icons-and-shell-configuration)
- [Preferences And Request Overrides](#preferences-and-request-overrides)
- [go-formgen Integration](#go-formgen-integration)
- [go-dashboard And Chart Integration](#go-dashboard-and-chart-integration)
- [CMS And Custom Views](#cms-and-custom-views)
- [Public-site Theme Isolation](#public-site-theme-isolation)
- [Migration Notes](#migration-notes)
- [Validation Checklist](#validation-checklist)

## Core Model

Theme resolution has three layers:

1.  Config defaults: `admin.Config.Theme`, `ThemeVariant`, `ThemeTokens`, `ThemeAssets`, and `ThemeAssetPrefix`.
2.  Provider selection: an `admin.ThemeProvider`, usually adapted from a `go-theme` selector.
3.  Runtime overrides: preferences, request/context selectors, and final config-level token or asset overrides.

Admin templates consume a normalized `theme` payload. Public-site templates consume a separate `site_theme` payload. Do not assume one provider controls both surfaces.

## Coordinated Package Contract

The theme stack is additive and package-owned:

| Package | Owns | Main APIs |
|---|---|---|
| `go-theme` | Manifest loading, registry/selection, variant merging, safe CSS projection, the portable semantic profile, and renderer-neutral diagnostics. | `Selection.Snapshot`, `Selection.RendererTheme`, `PortableSemanticProfile`, `ProjectCSSVariables`, `ValidateTokenProfile` |
| `go-admin` | Request-scoped selection, preferences/request/config precedence, the admin semantic profile, shell/DataGrid consumers, view payloads, and adapters to renderer packages. | `WithAdminTheme`, `WithThemeManifest`, `Admin.Theme`, `Admin.ThemePayload`, `Admin.FormTheme`, `AdminSemanticProfile` |
| `go-formgen` | Form-specific tokens, typed renderer configuration, semantic form markup/styles, field state consumption, and form consumer diagnostics. | `render.ThemeConfig`, `defaults.FormSemanticProfile`, `render.FormSemanticTokenSpecs`, `ThemeDiagnosticsForConsumer` |
| `go-dashboard` | A structural theme provider boundary, dashboard-specific tokens, render-aware dashboard styles, widget states, and typed ECharts presentation. | `ThemeSelection.SemanticProjection`, `SemanticDashboardPlan`, `SemanticChartPalette` |
| Host | Brand values/assets, the manifest, supported variants, final URL overrides, optional template filesystems, and public-site theme policy. | quickstart/config options described below |

One resolved admin selection is adapted at package boundaries. Do not make
forms or dashboards resolve a second independent selector when they are
rendered inside go-admin. Do not hide a reusable package gap in broad host CSS.

## Admin Theme Contract

The admin package owns the runtime theme contract:

``` go
type ThemeSelector struct {
    Name    string `json:"name"`
    Variant string `json:"variant"`
}

type ThemeSelection struct {
    Name              string                 `json:"name"`
    Variant           string                 `json:"variant"`
    VariantResolved   bool                   `json:"-"`
    Tokens            map[string]string      `json:"tokens"`
    CSSVars           map[string]string      `json:"css_vars"`
    SemanticTokens    map[string]string      `json:"semantic_tokens,omitempty"`
    RootCSSVarsInline string                 `json:"root_css_vars_inline,omitempty"`
    Diagnostics       []ThemeTokenDiagnostic `json:"diagnostics,omitempty"`
    Assets            map[string]string      `json:"assets"`
    Partials          map[string]string      `json:"partials"`
    ChartTheme        string                 `json:"chart_theme"`
    AssetPrefix       string                 `json:"asset_prefix"`
}

type ThemeProvider func(ctx context.Context, selector ThemeSelector) (*ThemeSelection, error)
```

Use `adm.Theme(ctx)` when code needs the typed selection. Use `adm.ThemePayload(ctx)` when returning JSON or rendering template context.

## go-theme Adapter

`adm.WithAdminTheme(selector)` adapts a `go-theme` selector into the admin theme provider contract.

The adapter maps the selected `go-theme` snapshot into:

- `ThemeSelection.Name` and `Variant`
- the non-serialized `VariantResolved` marker, including authoritative empty
  base variants
- merged design tokens
- legacy CSS variables from `selection.CSSVariables("")`
- validated semantic tokens, a deterministic safe root declaration, and
  resolved/invalid/unsupported/consumed/unused diagnostics
- resolved assets and asset prefix
- template partial paths
- chart theme, currently derived from the selected variant

The adapter is admin-scoped. Public site theme packages must be wired through `quickstart/site`, not through `adm.WithAdminTheme(...)`.

## Semantic Projection And Diagnostics

`go-theme` v0.5 adds an opt-in safe projection boundary:

``` go
profile := theme.PortableSemanticProfile()
projection := theme.ProjectCSSVariables(tokens, theme.ProjectionOptions{
    Profile: &profile,
})
```

`CSSProjection` contains:

- `Variables`: safe normalized custom properties such as
  `--color-surface-default`.
- `Inline`: deterministic declarations ordered by input token name.
- `Diagnostics`: `resolved`/`invalid` plus
  `supported`/`unsupported` outcomes.

`ProjectCSSVariables` validates token names, output names, prefixes, collisions,
and typed values. Constraints cover CSS values, colors, lengths, numbers,
durations, easing, font families/weights, shadows, identifiers, and alignment.
Unknown but safe tokens remain available for legacy consumers and are reported
as unsupported when a profile is supplied. Invalid values are omitted.
Canonical keys win over aliases; projection never chooses a collision winner
from map iteration order.

`admin.AdminSemanticProfile()` defensively extends the portable profile with
admin shell/sidebar, DataGrid, form, and dashboard namespaces. The normalized
`ThemeSelection` exposes:

- `SemanticTokens`: supported, valid canonical values.
- `RootCSSVarsInline`: the safe admin root declarations.
- `Diagnostics`: projection/support results plus `consumed`/`unused` results
  for `go-admin/client`.

Package consumers append their own diagnostics at the boundary. A token can be
valid and supported but still unused because the current page has no matching
surface or a more specific component token won the fallback chain.

The portable registry is grouped as follows:

| Group | Canonical tokens |
|---|---|
| Color | `color.action.{accent,primary,primary-hover}`, `color.border.{default,strong}`, `color.focus.ring`, `color.status.{success,warning,danger,info}`, `color.surface.{canvas,default,raised,subtle}`, `color.text.{primary,secondary,inverse}` |
| Typography | `font.family.{body,heading}`, `font.size.{body,heading,label}`, `font.weight.{body,emphasis,heading}`, `line.height.{body,heading}`, `letter.spacing.{body,heading}` |
| Layout | `space.control.{block,inline}`, `space.{stack,surface}`, `size.control.height`, `radius.{control,surface}`, `shadow.surface` |
| Motion | `motion.duration.{fast,normal}`, `motion.easing.standard` |
| Charts | `chart.{axis,grid,tooltip-surface,tooltip-text}` and `chart.series.1` through `chart.series.8` |

The go-admin extension adds `admin.shell.*`, `admin.header.*`,
`admin.page.gap`, `admin.sidebar.*`, `datagrid.*`, `form.*`, and
`dashboard.*`. Use the component namespace only to override a portable value
for that package. The form and dashboard extension registries and fallback
tables are listed in their dedicated guides.

Use `ValidateTokenProfile(tokens, profile)` when only support classification is
needed. Keep `Manifest.CSSVariables` and `Selection.CSSVariables` for legacy
map transport; do not place those arbitrary values directly in an inline
style. The shared admin layouts emit only the validated
`theme.styles.root`.

## Quickstart Wiring

Most hosts should use the quickstart selector helper:

``` go
selector, manifest, err := quickstart.NewThemeSelector(
    cfg.Theme,
    cfg.ThemeVariant,
    cfg.ThemeTokens,
    quickstart.WithThemeAssets(path.Join(cfg.BasePath, "assets"), map[string]string{
        "logo":    "logo.light.svg",
        "icon":    "icon.light.svg",
        "favicon": "favicon.svg",
    }),
)
if err != nil {
    return err
}

adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithThemeSelector(selector, manifest),
)
if err != nil {
    return err
}
```

`quickstart.WithThemeSelector(...)` wires both:

- `adm.WithAdminTheme(selector)` for runtime selection.
- `adm.WithThemeManifest(manifest)` so runtime selection can reject unlisted
  variants and the Preferences UI can list only supported variants.

Use `quickstart.WithThemeAssets(...)` for manifest-relative asset filenames. Use `quickstart.WithThemeAssetURLs(...)` or `admin.Config.ThemeAssets` for final resolved host URLs.

The two quickstart option families have different owners:

| API | Layer | Behavior |
|---|---|---|
| `WithTheme(name, variant)` | `AdminConfigOption` | Sets default selector values. |
| `WithThemeTokens(tokens)` | `AdminConfigOption` | Merges config tokens and final token overrides. |
| `WithThemeAssetURLs(assets)` | `AdminConfigOption` | Adds final resolved URL/path overrides after provider resolution. |
| `WithThemeAssetPrefix(prefix)` | `AdminConfigOption` | Adds the final config-level asset prefix. |
| `WithThemeRegistry(registry)` | `ThemeOption` | Reuses a registry for `NewThemeSelector`. |
| `WithThemeManifest(manifest)` | `ThemeOption` | Replaces the generated manifest. |
| `WithThemeAssets(prefix, files)` | `ThemeOption` | Supplies manifest-relative asset files and prefix. |
| `WithThemeVariants(variants)` | `ThemeOption` | Supplies named manifest variants when the manifest does not already define them. |
| `WithThemeSelector(selector, manifest)` | `AdminOption` | Attaches runtime selection and manifest authority to `NewAdmin`. |

An existing registered or explicitly supplied manifest is preserved.
`WithThemeAssets` and `WithThemeVariants` only fill missing manifest fields;
they do not overwrite populated fields. The generated compatibility manifest
contains a `light` label and `dark` variant. For a base-only theme, provide a
manifest with no variants and resolve `Variant == ""`.

## Manual Admin Wiring

When constructing `Admin` without quickstart theme options:

``` go
adm, err := admin.New(cfg, deps)
if err != nil {
    return err
}

adm.WithAdminTheme(selector)
adm.WithThemeManifest(manifest)
```

Use `adm.WithThemeProvider(provider)` only when the host already has a provider that returns `*admin.ThemeSelection`. Prefer `adm.WithAdminTheme(...)` for normal `go-theme` selectors.

Admin API quick reference:

| API | Purpose |
|---|---|
| `ThemeProviderFromGoThemeSelector(selector)` | Adapt a go-theme selector without mutating an admin. |
| `adm.WithAdminTheme(selector)` | Install that adapter as the admin provider. |
| `adm.WithThemeProvider(provider)` | Install a native `admin.ThemeProvider`. |
| `adm.WithThemeManifest(manifest)` | Attach variant and Preferences authority. |
| `admin.WithThemeSelection(ctx, selector)` | Add request-scoped name/variant overrides. |
| `admin.ThemeSelectorFromContext(ctx)` | Read those explicit overrides. |
| `adm.Theme(ctx)` | Return a defensive typed `ThemeSelection`. |
| `selection.Payload()` / `adm.ThemePayload(ctx)` | Return the cloned wire/view map. |
| `adm.FormTheme(ctx)` | Return the defensive typed go-formgen projection. |
| `admin.AdminSemanticProfile()` | Return a defensive portable-plus-admin token profile. |

## Resolution Order

`Admin.Theme(ctx)` and `Admin.ThemePayload(ctx)` resolve the final admin theme as follows:

1.  Start from config defaults captured during admin construction.
2.  If `FeaturePreferences` is enabled and a user is present in context, merge the stored preference selector (`theme`, `theme_variant`).
3.  Merge explicit context selectors from `admin.WithThemeSelection(...)`.
4.  Ask the theme provider for the selected theme/variant.
5.  Merge provider output over the config default selection.
6.  Reconcile a matching attached manifest: retain a declared variant or fall
    back to its empty base variant. A provider error or nil selection uses the
    configured manifest base when the manifest represents the configured
    theme.
7.  Overlay `Config.ThemeTokenOverrides`, `Config.ThemeAssets`, and `Config.ThemeAssetPrefix`.
8.  Overlay legacy `LogoURL` and `FaviconURL` as final `logo` and `favicon` asset values.
9.  Ensure a chart theme is present, falling back to the selected variant.

Without an attached manifest, provider errors and the legacy
`ThemeVariant == "default"` behavior continue to use the config default
selection. Production exposure rules are not changed by theme resolution.

## Theme Payload

Template and JSON payloads use `map[string]map[string]string`:

| Key | Type | Description |
|----|----|----|
| `selection` | `map[string]string` | Active `name` and `variant`. |
| `tokens` | `map[string]string` | Theme tokens, including config and provider tokens. |
| `css_vars` | `map[string]string` | CSS variable names and values, for example `--primary`. |
| `semantic_tokens` | `map[string]string` | Valid canonical tokens from the go-admin semantic profile. |
| `styles` | `map[string]string` | Safe deterministic declarations under `root`, ready for the shared layout. |
| `assets` | `map[string]string` | Resolved assets such as `logo`, `icon`, `favicon`, plus optional `prefix`. |
| `partials` | `map[string]string` | Provider-supplied template partial references. |
| `chart` | `map[string]string` | Chart renderer metadata, currently `theme`. |

The shared admin and auth layouts emit only `theme.styles.root`; arbitrary
manifest tokens and unsafe values never become root declarations. The legacy
`tokens` and `css_vars` sections remain available for compatible custom
templates and APIs.

### Semantic token behavior

`admin.AdminSemanticProfile()` extends the portable `go-theme` profile with
admin shell/sidebar, embedded DataGrid, form, and dashboard package tokens.
Values are validated by their declared type before projection. Component
variables fall back to portable variables and then to the existing literal, so
hosts without semantic tokens retain the current appearance.

Examples:

```text
admin.shell.background -> color.surface.canvas -> current shell background
datagrid.row.hover -> color.surface.subtle -> current row hover
form.control.border -> color.border.default -> current control border
```

Legacy keys such as `primary`, `sidebar-width`, and
`sidebar-brand-max-height` remain supported aliases. Canonical keys win when
both forms are present. `admin.sidebar.title-height` is transport-only and is
reported unused because the shared sidebar has no reusable title slot.

The legacy `surface` key is a global compatibility alias for
`color.surface.default`; it is not a sidebar color. Use
`admin.sidebar.background` for a dark sidebar in an otherwise light admin.
Quickstart's generated theme follows that rule and leaves the global default
surface unset so page headers, controls, cards, and DataGrid rows retain their
light defaults. When a caller explicitly supplies `surface` or
`color.surface.default`, quickstart does not add a component-level sidebar
background that would shadow that override.

Use `ThemeSelection.Diagnostics` to audit support and actual go-admin client
consumption. Diagnostics follow the same ordered fallback chains as the CSS:
the first resolved component or portable token is consumed, and a resolved
portable fallback is unused when a component token shadows it everywhere in
the go-admin client inventory. Transport-only tokens remain unused. Form and
dashboard renderers append their own consumer diagnostics at their package
boundary.

## Template Injection

Admin layout templates receive theme data through these helpers:

- `admin.EnrichLayoutViewContext(...)` injects `theme` for custom module views that render the shared admin layout.
- `quickstart.WithNav(...)` injects nav, session, feature context, path helpers, and `theme` from the request context.
- `quickstart.WithThemeContext(...)` reads `?theme=` and `?variant=` from the router request, resolves `adm.ThemePayload(...)`, and adds `theme_name` and `theme_variant` convenience keys.

For custom quickstart views that need query-string theme previews, call `WithThemeContext(...)` after `WithNav(...)`:

``` go
viewCtx = quickstart.WithNav(viewCtx, adm, cfg, "custom", c.Context())
viewCtx = quickstart.WithThemeContext(viewCtx, adm, c)
```

For custom module views that do not need query overrides, use `admin.EnrichLayoutViewContext(...)`.

## Template And Asset Ownership

Manifest templates are logical renderer metadata. Resolution is:

``` text
selected variant template -> base template -> caller fallback
```

They affect only consumers that read the key. For example, go-formgen reads
`render.ThemeConfig.Partials`, and go-dashboard receives
`ThemeSelection.Templates`. A manifest entry does not add a file to go-admin's
view engine and cannot override `partials/sidebar.html` by itself.

Admin page/template overrides use the first-wins view filesystem stack:

``` text
explicit/host templates -> packaged client templates -> quickstart fallbacks
```

Static files use a separate first-wins filesystem stack under the admin asset
route. `quickstart.NewStaticAssets` also mounts go-formgen runtime and renderer
assets plus go-dashboard ECharts and shell assets at their package-owned
prefixes. A manifest filename is usable only if its prefix points at a route
that actually serves the file.

Keep these mechanisms separate:

- Use manifest `templates` for renderer partial selection.
- Use `WithViewTemplatesFS` for concrete go-admin page/partial overrides.
- Use `WithThemeAssets` for manifest-relative files.
- Use `ThemeAssets` / `WithThemeAssetURLs` for already resolved host URLs.
- Use `NewStaticAssets` and its prefix options to mount package assets.

## Brand Assets, Menu Icons, And Shell Configuration

Admin branding uses reserved theme asset keys:

- `logo`: expanded/sidebar brand asset.
- `icon`: compact/sidebar and auth icon asset.
- `favicon`: browser/app icon asset.

The sidebar prefers `logo` for expanded mode and `icon` for compact mode, with
fallbacks to the bundled admin logo. Admin and auth layouts render the resolved
`favicon` as a browser icon when present.

Theme-owned navigation icons are opt-in. A menu icon reference can use
`asset:<role>` or `theme:<role>`, which resolves `icon-<role>`, or retain its
normal Iconoir/library name and resolve the conventional
`icon-<normalized-name>` asset. The template helper
`renderThemeMenuIcon(icon, theme.assets)` accepts only relative paths and
`http`/`https` URLs, emits decorative image semantics, and falls back to
`renderMenuIcon`. Preserve that helper when overriding the shared sidebar.

The default quickstart manifest includes legacy aliases for these canonical
sidebar tokens:

| Canonical token | Legacy alias |
|---|---|
| `admin.sidebar.width` | `sidebar-width` |
| `admin.sidebar.padding-inline` | `sidebar-padding-x` |
| `admin.sidebar.padding-block` | `sidebar-padding-y` |
| `admin.sidebar.item-height` | `sidebar-item-height` |
| `admin.sidebar.section-gap` | `sidebar-gap-sections` |
| `admin.sidebar.icon-size` | `sidebar-icon-size` |
| `admin.sidebar.footer-height` | `sidebar-footer-height` |
| `admin.sidebar.brand-max-height` | `sidebar-brand-max-height` |
| `admin.sidebar.brand-max-width` | `sidebar-brand-max-width` |
| `admin.sidebar.brand-collapsed-size` | `sidebar-brand-collapsed-size` |
| `admin.sidebar.brand-align` | `sidebar-brand-align` |

Configure branding through theme assets and these tokens instead of host CSS that forces the sidebar logo dimensions.

Shell-specific configuration is not a token:

- `Config.SidebarHideSearch` removes the sidebar search slot.
- `Config.ExternalAssets` overrides the Iconoir, simple-datatables, and ECharts
  document URLs. Empty fields retain the current published defaults.

The shared narrow sidebar is an off-canvas disclosure. Its mobile open state is
ephemeral and separate from the persisted desktop collapsed state; it maintains
`aria-expanded`, closes on Escape, restores focus, responds to breakpoint
changes, and suppresses transitions under reduced motion. Preserve the
packaged state attributes and controls in sidebar overrides.

## Preferences And Request Overrides

Preferences can override the selected admin theme when `FeaturePreferences` is enabled. The supported preference keys are:

- `theme`
- `theme_variant`

Request and context overrides use the same selector shape:

- Query parameters: `?theme=<name>&variant=<variant>`
- Admin headers on supported routes: `X-Admin-Theme`, `X-Admin-Theme-Variant`
- Code: `admin.WithThemeSelection(ctx, admin.ThemeSelector{...})`

Preference and request overrides affect admin theme selection only. They do not select public-site theme packages.

An attached manifest is authoritative for its theme. A manifest with no named
variants always resolves the base variant and Preferences displays only
“System Default.” Stale stored or request variants cannot reintroduce a name
that the manifest does not declare.

## go-formgen Integration

Use `adm.FormTheme(ctx)` when rendering a form inside go-admin:

``` go
opts := render.RenderOptions{
    Theme: adm.FormTheme(ctx),
}
```

`Admin.FormTheme` returns a defensive `*render.ThemeConfig` containing theme,
variant, partials, raw tokens, safe CSS variables/inline declarations,
semantic tokens, diagnostics, and an asset resolver. `PanelFormRequest`
exposes the same typed value as `RenderTheme` for in-process rendering while
keeping it out of JSON because `AssetURL` is a function. The wire payload
remains under `Theme`.

Quickstart content-entry routes pass this typed projection to go-formgen
automatically. For a standalone formgen orchestrator, opt in through
`pkg/orchestrator/defaults`:

``` go
forms := defaults.New(
    defaults.WithTheme(selector, defaults.DefaultThemeFallbacks()),
)
```

Available options are `WithThemeSelector`, `WithThemeProvider`,
`WithThemeFallbacks`, and `WithTheme`. The lower-level headless orchestrator
does not import go-theme.

`defaults.FormSemanticProfile()` extends the portable profile with
`form.*` tokens. `render.FormSemanticTokenSpecs()` returns the defensive
registry. Custom renderers can use:

- `ThemeConfig.ResolveSemanticToken` for
  `form component -> portable fallback`.
- `ThemeConfig.SemanticCSSValue` for a safe CSS variable expression.
- `render.ThemeCSSVariablesStyle` for safe deterministic root declarations.
- `render.ThemeDiagnosticsForConsumer` to append render-specific
  consumed/unused outcomes.

The vanilla and Preact renderers opt into semantic styling only when semantic
tokens exist, mark the root with `data-formgen-semantic="true"`, and cover
default, focus, invalid, disabled, readonly, loading, label/help/error,
typography, spacing, and narrow layout states. Vanilla also consumes primary
action/hover tokens; Preact currently reports those action tokens unused.
Missing themes keep existing renderer classes and styles unchanged. See
`GUIDE_FORMGEN.md` for the complete form token table and custom-renderer
example.

## go-dashboard And Chart Integration

go-dashboard deliberately keeps a structural `ThemeProvider` interface and
does not require go-theme. go-admin adapts the request-scoped selection into
`dashboard.ThemeSelection`, copying tokens, templates, chart theme, assets, and
prefix. The selection is attached to the typed `dashboard.Page`, each
`WidgetContext`, and the canonical template payload.

Dashboard consumers resolve:

``` text
dashboard component token -> portable token -> existing dashboard default
```

Use:

- `ThemeSelection.SemanticProjection()` for safe variables and projection
  diagnostics.
- `ThemeSelection.SemanticDashboardPlan(usage)` for page-aware styles and
  consumed/unused diagnostics.
- `DashboardConsumerDiagnostics()` only when there is no concrete page
  inventory; it conservatively avoids claiming consumption.
- `ThemeSelection.SemanticChartPalette()` for the typed eight-series ECharts
  palette plus axis, grid, tooltip, and diagnostics.

The stock page adapter derives `DashboardSemanticUsage` from the typed page,
including shell, header, areas, widgets, empty state, and error state. Semantic
chrome activates only when a valid relevant token is present; chart-only,
unrelated, and legacy token maps do not restyle dashboard chrome.

Named/custom `ChartTheme` remains active. Per-widget chart configuration and
explicit chart theme resolvers win. Semantic series colors and presentation
are layered onto typed chart options; Cartesian charts consume axis/grid
tokens, while pie/gauge charts report them unused. Cache identity includes the
resolved named theme and applied semantic palette.

See `GUIDE_DASHBOARD_WIDGETS.md` for dashboard token names, widget state hooks,
payload fields, custom renderer APIs, and asset mounting.

## CMS And Custom Views

- Panel schemas and form adapters include `schema.theme` / `form.theme` plus
  the typed in-process form configuration.
- Settings and Preferences forms resolve the current request-scoped theme.
- CMS/content-entry pages receive the same selection through the shared admin
  view context and typed form projection.
- Dashboard APIs and SSR pages carry the same resolved theme, including chart
  metadata, templates, assets, and asset prefix.

When writing custom renderers, consume the existing `theme` payload instead of calling the provider again from templates or client code.

## Public-site Theme Isolation

Admin and public-site theme resolution are intentionally separate.

Use:

``` go
adm.WithAdminTheme(adminSelector)
quicksite.WithSiteTheme(siteSelector)
```

or attach the site selector through `SiteConfig.ThemeProvider`.

Public-site resolution uses `quickstart/site` concepts:

- `SiteThemeProvider`
- `SiteThemeConfig`
- `WithSiteTheme(...)`
- `WithSiteThemeProvider(...)`
- `site_theme` request/view context

Site request overrides are host-policy controlled and ignored in production runtime mode. Site theme assets, bundles, and partials must stay scoped to the public-site runtime.

## Migration Notes

Older shared theme wiring should be migrated directly:

1.  Replace `adm.WithGoTheme(selector)` with `adm.WithAdminTheme(selector)`.
2.  Attach public-site themes separately with `quicksite.WithSiteTheme(...)` or `SiteConfig.ThemeProvider`.
3.  Keep site theme bundle mounting under the public-site/static surface.
4.  Re-run admin/site isolation QA after migration.

For token migration:

1. Move renderer-independent values to canonical portable dotted keys.
2. Use `admin.*`, `form.*`, `datagrid.*`, or `dashboard.*` only for a
   package-specific override.
3. Keep aliases only for a compatibility window; canonical keys win.
4. Replace arbitrary inline emission with semantic projection and
   `theme.styles.root`.
5. Check consumed/unused diagnostics before deleting an alias or host CSS
   fallback.

There is no compatibility bridge for `WithGoTheme(...)`.

Custom `ThemeProvider` implementations that intentionally resolve the empty
base variant should return `ThemeSelection{VariantResolved: true}`. Providers
that omit the marker retain the legacy rule where only non-empty variants
override the current selection.

## Validation Checklist

- [ ] Admin dashboard, navigation, panel schema, settings form, and custom views all expose the same `theme.selection`, token, and asset payload for the same request.
- [ ] `?theme=` / `?variant=` preview requests affect only routes that opt into request override handling.
- [ ] Preferences can override `theme` and `theme_variant` when the Preferences feature is enabled.
- [ ] Base-only manifests clear config, stored, and preview variant sentinels,
      including the derived chart theme.
- [ ] `ThemeAssets` / `WithThemeAssetURLs(...)` override provider assets with final URLs.
- [ ] Legacy `LogoURL` and `FaviconURL` still win for `logo` and `favicon` when configured.
- [ ] Admin and auth layouts render the resolved `favicon`.
- [ ] Invalid or unsupported tokens do not appear in `theme.styles.root`.
- [ ] Shell, form, dashboard, and DataGrid component tokens fall back to
      portable tokens and then to existing defaults.
- [ ] Form renderers receive `adm.FormTheme(ctx)` or an explicit formgen
      defaults theme option and emit semantic state hooks only when themed.
- [ ] Dashboard pages use the typed page/selection boundary; chart cache keys
      include the resolved named theme and applied semantic palette.
- [ ] Manifest partial metadata is not mistaken for a go-admin view filesystem
      override, and manifest asset paths are backed by a mounted static route.
- [ ] Sidebar overrides preserve theme menu-icon fallback, mobile disclosure,
      focus, ARIA, breakpoint, desktop persistence, and reduced-motion hooks.
- [ ] Public-site routes render `site_theme`, not admin `theme`.
- [ ] `/admin/*` routes do not consume public-site theme bundles or partials.

Focused tests:

``` sh
go test ./admin -run 'TestTheme|TestNormalizeThemeProjection|TestDashboardRouteReturnsTheme|TestConfigTheme'
go test ./pkg/client -run 'TestSemantic|TestDataGrid|TestTheme'
go test ./quickstart -run 'TestNewThemeSelector|TestWithTheme|TestNavHelpers'
go test ./quickstart/site -run 'TestQuickstartSiteTheme|TestSiteTheme'
```
