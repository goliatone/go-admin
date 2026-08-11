# Guide: Adding Dashboard Widgets (Canonical Contract)

This guide covers go-admin widget payloads and the typed go-dashboard theme
boundary. For selector, manifest, preferences, and cross-package token
precedence, see `GUIDE_THEME.md`.

## Contract Rules

When adding a widget definition:

1. Define a typed payload/view-model in code.
2. Return one canonical payload shape for all render paths.
3. Do not return HTML/script/document blobs in widget data.
4. Keep required fields explicit and stable.
5. Do not branch payload shape by render mode.

## Implementation Checklist

1. Register provider with `DashboardProviderSpec`.
2. Build typed payload and return `admin.WidgetPayloadOf(payload)`.
3. For an application-owned provider, register a focused host template; add a
   canonical rendering branch only for a framework-owned definition.
4. Add contract tests for required keys and payload shape.
5. Add regression tests for SSR rendering and hydration behavior.

## Theme Integration

go-dashboard keeps a structural theme boundary and does not require go-theme:

``` go
type ThemeProvider interface {
    SelectTheme(context.Context, ThemeSelector) (*ThemeSelection, error)
}
```

`dashboard.Options` accepts `ThemeProvider` and `ThemeSelector`. In go-admin,
this wiring is automatic: the admin adapter copies the request-scoped theme
name, variant, raw tokens, manifest templates, chart theme, assets, and asset
prefix into `dashboard.ThemeSelection`.

The resolved selection is attached to:

- the canonical typed `dashboard.Page.Theme`;
- each provider's `dashboard.WidgetContext.Theme`;
- the stock template/JSON `theme` payload.

New renderers should accept `dashboard.Page`. Payload-map helpers are migration
adapters only. Do not resolve another theme selector from a widget provider or
template.

The dashboard route remains subordinate to the shared authenticated shell. It
builds typed `AdminPageChrome`, and the canonical dashboard renderer consumes
one typed `dashboard.Page`; widget providers do not own the document, route,
page header, breadcrumbs, or shell renderer. Trusted page actions and bounded
sidebar/breadcrumb/footer overrides remain host template concerns.

The canonical serialized theme can include:

- `name`, `variant`, `tokens`, `css_vars`, and `css_vars_inline`;
- `asset_prefix`, resolved `assets`, and `templates`;
- `chart_theme`;
- `semantic_enabled`, page-aware `semantic_styles`, and
  `semantic_diagnostics`;
- `legacy_styles` only for compatible legacy dashboard variables.

## Semantic Dashboard Contract

Dashboard theme values resolve in this order:

``` text
dashboard component token -> portable token -> existing dashboard default
```

The dashboard-owned extension tokens are:

| Surface | Tokens |
|---|---|
| Page/card | `dashboard.surface`, `dashboard.card.background`, `dashboard.card.border`, `dashboard.card.radius`, `dashboard.card.shadow` |
| Metrics | `dashboard.metric.label`, `dashboard.metric.value`, `dashboard.metric.trend-positive`, `dashboard.metric.trend-negative` |
| Charts | `dashboard.chart.axis`, `dashboard.chart.grid`, `dashboard.chart.tooltip-surface`, `dashboard.chart.tooltip-text` |

Portable fallbacks use the matching `color.*`, `font.*`, `space.*`,
`radius.*`, `shadow.*`, `motion.*`, and `chart.*` tokens. Missing values retain
the package's current output. A valid package-specific token shadows its
portable fallback for that consumer.

Public semantic APIs:

| API | Use |
|---|---|
| `DashboardSemanticProfile()` | Defensive portable-plus-dashboard token registry. |
| `ThemeSelection.SemanticProjection()` | Safe CSS variables plus resolved/invalid/supported/unsupported diagnostics. |
| `ThemeSelection.ResolveSemanticToken(...)` | Resolve one component/portable/current-default chain. |
| `ThemeSelection.SemanticDashboardEnabled()` | Check whether a relevant canonical chrome token activates semantic styling. |
| `ThemeSelection.SemanticDashboardPlan(usage)` | Produce render-aware style flags and consumed/unused diagnostics. |
| `ThemeSelection.DashboardConsumerDiagnostics()` | Conservative diagnostics when no page inventory exists. |
| `CSSProjection.ConsumerDiagnostics(...)` | Append diagnostics for a custom concrete consumer. |
| `ProjectThemeCSSVariables(...)` | Low-level safe projection for custom profiles. |

`DashboardSemanticUsage` describes the rendered inventory: application shell,
dashboard/header, areas, widgets, empty state, and error state. The typed page
adapter derives it automatically. Custom renderers should call
`SemanticDashboardPlan` with the surfaces they actually render instead of
claiming every supported token is consumed.

Semantic dashboard chrome is opt-in. Unrelated, chart-only, invalid, and
legacy-only tokens do not restyle the stock page. Each declaration is emitted
independently, so a focus-only theme does not reset cards or metrics.

### Widget presentation states

Use the typed `WidgetPresentationState` values:

- `WidgetStateReady`
- `WidgetStateLoading`
- `WidgetStateEmpty`
- `WidgetStateError`

Stock templates emit `data-dashboard-state`; loading also emits
`aria-busy="true"`. Empty areas retain `.dashboard-area--empty`. Present state
metadata with an invalid type or unknown value is rejected rather than treated
as ready.

### Application-owned widget templates

Register custom presentation through the provider rather than replacing
`dashboard_widget_content.html`:

``` go
err := adm.Dashboard().RegisterProviderChecked(admin.DashboardProviderSpec{
    Code:     "orders.widget.recent",
    Name:     "Recent Orders",
    Template: "dashboard/widgets/orders/recent.html",
    Handler:  recentOrdersProvider,
})
```

Place the template in the host's normal first-wins view filesystem. The
template receives the canonical `widget` object, including `widget.data`.
Template identifiers must be normalized relative `.html` paths below
`dashboard/widgets/`; absolute paths, traversal, backslashes,
query/fragments, and control characters are rejected.

`RegisterProviderChecked` should be used during host startup so invalid
metadata fails initialization. The older `RegisterProvider` remains a
best-effort compatibility API.

go-admin clears conventionally inferred widget templates before rendering and
projects only the value validated in provider registration. Persisted widget
configuration and payload data therefore cannot select a dynamic include.
Providers without a custom template retain canonical built-in rendering, and
unknown definitions retain the escaped JSON diagnostic fallback.

## Chart Widgets

Use canonical chart fields only:

- `chart_type`
- `title`
- `theme`
- `chart_assets_host`
- `chart_options`

Optional:

- `subtitle`
- `footer_note`

Never emit:

- `chart_html`
- `chart_html_fragment`

### Named themes and semantic chart presentation

`ThemeSelection.ChartTheme` remains the named/custom ECharts theme. Explicit
per-widget `theme`, `WithChartTheme`, and `WithChartThemeResolver` settings win
over selection-derived defaults.

`ThemeSelection.SemanticChartPalette()` returns a typed eight-series palette:

- `Series` and `SeriesActive`;
- `Axis` and `Grid`;
- `TooltipSurface` and `TooltipText`;
- concrete consumer `Diagnostics`.

Portable chart tokens are `chart.series.1` through `chart.series.8`,
`chart.axis`, `chart.grid`, `chart.tooltip-surface`, and
`chart.tooltip-text`. Dashboard-specific axis/grid/tooltip tokens win first,
then portable chart tokens, then portable color fallbacks.

Missing series positions retain their current positional default until the
first semantic color; later gaps rotate through supplied semantic colors.
Cartesian bar, line, and scatter charts consume axis/grid presentation. Pie and
gauge charts omit those options and report the tokens unused. The render cache
includes the resolved named theme and applied semantic palette.

Use `SemanticChartPalette.SeriesColors()` when a custom ECharts provider needs
only an active semantic series override. An inactive palette returns `nil` so a
named/custom ECharts theme can remain authoritative.

## Templates And Assets

The default quickstart renderer uses the canonical packaged `pkg/client`
dashboard templates. `quickstart.DashboardTemplatesFS()` returns
`client.Templates()`; the removed compact quickstart document is not retained as
a fallback. Explicit caller template filesystems remain first-wins overlays.

Manifest template entries arrive as `ThemeSelection.Templates`; they are
metadata for a renderer that reads the key. They do not install or override a
go-admin view file.

`quickstart.NewStaticAssets` mounts the embedded dashboard packages at:

- `/dashboard/assets/echarts/` by default;
- `/dashboard/assets/shell/` by default.

Use `quickstart.WithEChartsPrefix(...)` and
`quickstart.WithDashboardShellPrefix(...)` to change the mounted routes. Pass
the same options to `ResolveDashboardShellAssetsPrefix` or
`WithContentTypeBuilderUIStaticAssetOptions` so rendered shell URLs and mounted
routes stay aligned.

For direct go-dashboard use, `PageAssets.AddShellAssets(...)`,
`EChartsAssetsFS()`, and `ShellAssets()` expose the embedded runtime. Asset
mounting is separate from theme asset roles and manifest template metadata.

## Guardrails

Dashboard provider outputs are sanitized centrally. Unsafe keys/content are stripped before persistence/rendering. Treat sanitizer behavior as a safety net, not a primary contract design tool.

Provider handlers must return `admin.WidgetPayload` with a struct (or pointer to struct) at the root. Root `map[string]any` payloads are rejected.
Dashboard template renderers accept `admin.AdminDashboardPage` only. The typed
wrapper carries the canonical `dashboard.Page` and host chrome through the
renderer boundary; arbitrary map payload bridge paths are not supported.
`quickstart.NormalizeDashboardTemplateData(...)` also accepts a raw typed
`dashboard.Page` for template-adapter compatibility, but that helper does not
broaden the `admin.DashboardRenderer` interface.

## Canonical Hygiene

- Do not add `RenderMode` back to dashboard provider contracts.
- Keep `AdminContext` usage transport-agnostic; payload typing is the contract boundary.
- Keep `dashboard.Page` and `ThemeSelection` typed through rendering; do not
  mutate serialized `theme` maps as the primary integration.
- Apply diagnostics to the surfaces actually rendered and cache concrete
  chart presentation, not the entire raw token map.

## Validation

Focused go-admin checks:

``` sh
go test ./admin -run 'TestDashboard.*Theme|TestDashboardTheme|TestDashboardRouteReturnsTheme|TestDashboardProviderPresentation|TestDashboardRegisterProviderChecked'
go test ./pkg/client -run 'TestDashboardWidgetStylesUseSemanticThemeContract'
go test ./quickstart -run 'TestDefaultDashboardRenderer|TestDashboardRenderer'
go test ./quickstart -run TestDownstreamExtensionContract
```

The downstream contract also proves typed page chrome, one shell/document
owner, provider template and placement metadata, public modal/component CSS,
product CSS mounting, theme propagation, CSRF helpers, and bounded footer
composition without copying the dashboard layout.

When changing go-dashboard itself, also run its theme, chart provider, renderer,
and shell asset tests.
