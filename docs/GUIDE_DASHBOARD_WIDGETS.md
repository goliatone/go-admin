# Guide: Adding Dashboard Widgets (Canonical Contract)

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
3. Add template/client rendering branch for the widget definition.
4. Add contract tests for required keys and payload shape.
5. Add regression tests for SSR rendering and hydration behavior.

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

## Guardrails

Dashboard provider outputs are sanitized centrally. Unsafe keys/content are stripped before persistence/rendering. Treat sanitizer behavior as a safety net, not a primary contract design tool.

Provider handlers must return `admin.WidgetPayload` with a struct (or pointer to struct) at the root. Root `map[string]any` payloads are rejected.
Dashboard template renderers accept `DashboardLayout` only; map payload bridge paths are not supported.

## Canonical Hygiene

- Do not add `RenderMode` back to dashboard provider contracts.
- Keep `AdminContext` usage transport-agnostic; payload typing is the contract boundary.
