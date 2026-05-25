# Guide: Theme and go-theme Integration

This guide is the canonical wiring reference for admin theming, `go-theme` integration, template theme payloads, preferences-driven theme selection, and public-site theme isolation. For template override mechanics, see `docs/GUIDE_VIEW_CUSTOMIZATION.md`. For route ownership and fallback policy, see `docs/GUIDE_ROUTING.md`.

Use it when wiring a host theme, adding branded assets, debugging theme payloads in templates, or migrating older shared theme wiring to separate admin and public-site theme providers.

## What It Provides

- Admin theme provider and `go-theme` selector wiring.
- Theme selection resolution order.
- Template/API payload shape.
- Quickstart selector, manifest, token, and asset conventions.
- Sidebar brand token and asset rules.
- Preferences and request override behavior.
- Dashboard, CMS, form, and custom view integration points.
- Public-site theme isolation and `site_theme` handoff.
- Migration and validation checklist.

## Table Of Contents

- [What It Provides](#what-it-provides)
- [Core Model](#core-model)
- [Admin Theme Contract](#admin-theme-contract)
- [go-theme Adapter](#go-theme-adapter)
- [Quickstart Wiring](#quickstart-wiring)
- [Manual Admin Wiring](#manual-admin-wiring)
- [Resolution Order](#resolution-order)
- [Theme Payload](#theme-payload)
- [Template Injection](#template-injection)
- [Brand Assets And Sidebar Tokens](#brand-assets-and-sidebar-tokens)
- [Preferences And Request Overrides](#preferences-and-request-overrides)
- [Dashboard, Forms, And CMS](#dashboard-forms-and-cms)
- [Public-site Theme Isolation](#public-site-theme-isolation)
- [Migration Notes](#migration-notes)
- [Validation Checklist](#validation-checklist)

## Core Model

Theme resolution has three layers:

1.  Config defaults: `admin.Config.Theme`, `ThemeVariant`, `ThemeTokens`, `ThemeAssets`, and `ThemeAssetPrefix`.
2.  Provider selection: an `admin.ThemeProvider`, usually adapted from a `go-theme` selector.
3.  Runtime overrides: preferences, request/context selectors, and final config-level token or asset overrides.

Admin templates consume a normalized `theme` payload. Public-site templates consume a separate `site_theme` payload. Do not assume one provider controls both surfaces.

## Admin Theme Contract

The admin package owns the runtime theme contract:

``` go
type ThemeSelector struct {
    Name    string `json:"name"`
    Variant string `json:"variant"`
}

type ThemeSelection struct {
    Name        string            `json:"name"`
    Variant     string            `json:"variant"`
    Tokens      map[string]string `json:"tokens"`
    CSSVars     map[string]string `json:"css_vars"`
    Assets      map[string]string `json:"assets"`
    Partials    map[string]string `json:"partials"`
    ChartTheme  string            `json:"chart_theme"`
    AssetPrefix string            `json:"asset_prefix"`
}

type ThemeProvider func(ctx context.Context, selector ThemeSelector) (*ThemeSelection, error)
```

Use `adm.Theme(ctx)` when code needs the typed selection. Use `adm.ThemePayload(ctx)` when returning JSON or rendering template context.

## go-theme Adapter

`adm.WithAdminTheme(selector)` adapts a `go-theme` selector into the admin theme provider contract.

The adapter maps the selected `go-theme` snapshot into:

- `ThemeSelection.Name` and `Variant`
- merged design tokens
- CSS variables from `selection.CSSVariables("")`
- resolved assets and asset prefix
- template partial paths
- chart theme, currently derived from the selected variant

The adapter is admin-scoped. Public site theme packages must be wired through `quickstart/site`, not through `adm.WithAdminTheme(...)`.

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
- `adm.WithThemeManifest(manifest)` so the Preferences UI can list variants.

Use `quickstart.WithThemeAssets(...)` for manifest-relative asset filenames. Use `quickstart.WithThemeAssetURLs(...)` or `admin.Config.ThemeAssets` for final resolved host URLs.

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

## Resolution Order

`Admin.Theme(ctx)` and `Admin.ThemePayload(ctx)` resolve the final admin theme as follows:

1.  Start from config defaults captured during admin construction.
2.  If `FeaturePreferences` is enabled and a user is present in context, merge the stored preference selector (`theme`, `theme_variant`).
3.  Merge explicit context selectors from `admin.WithThemeSelection(...)`.
4.  Ask the theme provider for the selected theme/variant.
5.  Merge provider output over the config default selection.
6.  Overlay `Config.ThemeTokenOverrides`, `Config.ThemeAssets`, and `Config.ThemeAssetPrefix`.
7.  Overlay legacy `LogoURL` and `FaviconURL` as final `logo` and `favicon` asset values.
8.  Ensure a chart theme is present, falling back to the selected variant.

Provider errors fall back to the config default selection. Production exposure rules are not changed by theme resolution.

## Theme Payload

Template and JSON payloads use `map[string]map[string]string`:

| Key | Type | Description |
|----|----|----|
| `selection` | `map[string]string` | Active `name` and `variant`. |
| `tokens` | `map[string]string` | Theme tokens, including config and provider tokens. |
| `css_vars` | `map[string]string` | CSS variable names and values, for example `--primary`. |
| `assets` | `map[string]string` | Resolved assets such as `logo`, `icon`, `favicon`, plus optional `prefix`. |
| `partials` | `map[string]string` | Provider-supplied template partial references. |
| `chart` | `map[string]string` | Chart renderer metadata, currently `theme`. |

The admin layout currently reads selected tokens directly, while dashboard and form-related integrations can consume the full payload.

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

## Brand Assets And Sidebar Tokens

Admin branding uses reserved theme asset keys:

- `logo`: expanded/sidebar brand asset.
- `icon`: compact/sidebar and auth icon asset.
- `favicon`: browser/app icon asset.

The sidebar prefers `logo` for expanded mode and `icon` for compact mode, with fallbacks to the bundled admin logo.

The default quickstart manifest includes sidebar sizing/alignment tokens:

- `sidebar-brand-max-height`
- `sidebar-brand-max-width`
- `sidebar-brand-collapsed-size`
- `sidebar-brand-align`

Configure branding through theme assets and these tokens instead of host CSS that forces the sidebar logo dimensions.

## Preferences And Request Overrides

Preferences can override the selected admin theme when `FeaturePreferences` is enabled. The supported preference keys are:

- `theme`
- `theme_variant`

Request and context overrides use the same selector shape:

- Query parameters: `?theme=<name>&variant=<variant>`
- Admin headers on supported routes: `X-Admin-Theme`, `X-Admin-Theme-Variant`
- Code: `admin.WithThemeSelection(ctx, admin.ThemeSelector{...})`

Preference and request overrides affect admin theme selection only. They do not select public-site theme packages.

## Dashboard, Forms, And CMS

The admin theme payload is propagated to the main admin surfaces:

- Dashboard APIs and SSR wrappers carry `theme`, including chart metadata and assets.
- Panel schemas and form adapters include `schema.theme` / `form.theme` so renderers can use tokens consistently.
- Settings and Preferences forms resolve theme with the current request context.
- CMS/content-entry quickstart pages receive theme through the shared admin view context helpers.

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

There is no compatibility bridge for `WithGoTheme(...)`.

## Validation Checklist

- [ ] Admin dashboard, navigation, panel schema, settings form, and custom views all expose the same `theme.selection`, token, and asset payload for the same request.
- [ ] `?theme=` / `?variant=` preview requests affect only routes that opt into request override handling.
- [ ] Preferences can override `theme` and `theme_variant` when the Preferences feature is enabled.
- [ ] `ThemeAssets` / `WithThemeAssetURLs(...)` override provider assets with final URLs.
- [ ] Legacy `LogoURL` and `FaviconURL` still win for `logo` and `favicon` when configured.
- [ ] Public-site routes render `site_theme`, not admin `theme`.
- [ ] `/admin/*` routes do not consume public-site theme bundles or partials.

Focused tests:

``` sh
go test ./admin -run 'TestTheme|TestDashboardRouteReturnsTheme|TestConfigTheme'
go test ./quickstart -run 'TestNewThemeSelector|TestWithTheme|TestNavHelpers'
go test ./quickstart/site -run 'TestQuickstartSiteTheme|TestSiteTheme'
```
