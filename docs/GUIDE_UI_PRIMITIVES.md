# UI Primitives Guide

This guide documents reusable UI primitives available in go-admin for building consistent admin interfaces.

For the broader frontend reuse and server-command decision path, see
`docs/GUIDE_FRONTEND.md`.

The primitives are meant to:

- Provide a consistent visual language across admin pages
- Reduce repeated SSR template markup
- Preserve no-JS server-rendered behavior
- Keep JavaScript enhancement hooks stable
- Use shared status/tone vocabulary where possible

## Authoring Rules

Use the repository paths shown in this guide. Template partials live under `pkg/client/templates/partials/`, and client assets live under `pkg/client/assets/src/`.

Avoid constructing arrays or objects inline in `{% include ... %}` calls. The current Go template engine is sensitive to unsupported object-literal include arguments. Prefer presenter-computed data or existing context variables:

```html
{% include "partials/metric-card.html" with card=card %}
{% include "partials/quick-filters.html" with filters=queue.DataGrid.quick_filters active_value=queue.DataGrid.active_quick_filter label="Status" %}
{% include "partials/status-badge.html" with badge_status=row.status badge_tone=row.status_tone badge_label=row.display_status %}
```

Do not use examples like `with card={...}` or `with filters=[...]` in production templates unless the template engine support has been proven by route render tests.

## Selector Contract

Use two selector namespaces intentionally:

- Translation-owned surfaces, state, filters, tables, tabs, disclosures, rows, and selection controls use `data-translation-*`.
- Shared command, menu, bulk-action, view-mode, and enhanced-action primitives keep their generic contracts: `data-action`, `data-action-menu`, `data-action-menu-trigger`, `data-action-menu-content`, `data-action-menu-item`, `data-bulk-action-overlay`, `data-bulk-selection-count`, `data-bulk-action`, `data-bulk-clear`, `data-view-mode-switcher`, `data-view-mode`, and `data-enhance-action`.

For translation actions that need lifecycle metadata, keep both layers:

```html
<button type="button"
        data-action-menu-item
        data-action="claim"
        data-translation-action="claim"
        data-assignment-id="{{ row.assignment_id }}"
        data-action-group="lifecycle">
  Claim
</button>
```

Do not rename shared action-menu or enhanced-action hooks to translation-specific names. For example, use `data-action-menu`, not `data-translation-action-menu`; use `data-enhance-action="true"`, not a translation-prefixed replacement.

## Busy Buttons And Submit Feedback

Use the shared behavior layer for submit/loading feedback instead of page-local
spinner code. New markup should prefer canonical `data-busy-*` attributes:

```html
<form method="post" action="/admin/example" data-behavior="submit-busy">
  <button type="submit"
          data-busy-button
          data-busy-label="Saving...">
    <span data-busy-spinner hidden></span>
    <span data-busy-label-target>Save</span>
  </button>
</form>
```

Rules:

- Keep the form valid without JavaScript: `method`, `action`, CSRF fields,
  submitter names/values, and server redirect or flash fallback still matter.
- Use `data-behavior="submit-busy"` for native submit busy state.
- Use `data-busy-button` on the submitter or command trigger.
- Use `data-busy-label` and `data-busy-label-target` when the visible label
  should change while busy.
- For buttons with icons or nested markup, include `data-busy-label-target`
  so only the label text changes.
- Prefer an explicit `[data-busy-spinner]` element for stable layout. The busy
  helper can generate a minimal spinner for imperative helpers when needed.
- Use `data-enhance-action` and `data-command-*` only for transport semantics,
  not for visual loading state.
- Do not add `data-behavior="submit-busy"` to Enhanced SSR forms; use
  `data-busy-*` on the submitter and let the enhanced runtime own submission.

Compatibility aliases still work for older login submit markup:
`data-submit-loading-form`, `submit-loading-button`,
`data-submit-loading-busy-label`, `data-submit-loading-label`, and
`.submit-loading-spinner`. Do not use those aliases for new templates.

### Native Navigation Feedback

Use `navigation-busy` when an SSR component contains links or GET forms whose
native current-page navigation may take long enough to need immediate feedback.
The behavior preserves the original URL, browser history, and no-JavaScript
fallback; it does not fetch or replace fragments.

```html
<section data-behavior="navigation-busy"
         data-navigation-busy-label="Updating results..."
         data-navigation-busy-status-target="#results-navigation-status">
  <a href="?status=open" data-navigation-busy-trigger>Open</a>

  <form method="get" data-navigation-busy-trigger>
    <select name="status"><option value="open">Open</option></select>
    <button type="submit">Apply</button>
  </form>

</section>

<div id="results-navigation-status"
     data-navigation-busy-status
     hidden
     role="status"
     aria-live="polite">
  <span data-navigation-busy-label-target>Updating results...</span>
</div>
```

Rules:

- Mark both the behavior root and each intended trigger explicitly. The runtime
  does not treat every descendant link or form as a trigger.
- The first eligible navigation remains native. While it is pending, the root
  becomes `aria-busy`, controls and triggers become unavailable, and duplicate
  trigger events are prevented.
- Modified clicks, downloads, non-self targets, hash-only links, invalid forms,
  and already-prevented events retain their existing behavior.
- Effective targets include element or submitter overrides and the document's
  `<base target>` fallback. New-context navigation never activates pending
  state on the current page.
- Navigation-busy forms are limited to HTTP(S) document submissions. Actions
  using other schemes and forms or submitters using `method="dialog"` retain
  their native behavior without entering pending state.
- Use `data-navigation-busy-label` on a trigger to override the root label.
- Prefer an external status target selected by
  `data-navigation-busy-status-target`. Keeping the live region outside the
  `aria-busy` root avoids deferring its pending announcement. A descendant
  `[data-navigation-busy-status]` remains supported for non-live visual state.
- Keep current content visible beneath feedback until the new document arrives;
  do not optimistically remove filter chips or rows.
- The behavior resets on `pageshow`, explicit behavior reset, or teardown so
  back-forward cache restoration does not retain stale pending UI.
- Overlapping document and enhanced-fragment behavior runtimes coordinate by
  event identity, so one bubbling event starts pending state once while a
  later duplicate activation is still blocked.
- Do not use this behavior for Enhanced SSR or other fetch-owned transports;
  those runtimes own their pending lifecycle through `data-busy-*`.

## Template Partials

### Action Menu

**File**: `pkg/client/templates/partials/action-menu.html`

A dropdown menu for row-level actions with icons, variants, links, dividers, and disabled states.

```html
{% include "partials/action-menu.html" with actions=row_actions row_id=row.id trigger_label=row.action_label %}
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `actions` | array | required | Array of precomputed action objects |
| `row_id` | string | - | Optional row identifier, emitted as `data-row-id` |
| `trigger_label` | string | `"Actions"` | Trigger `aria-label` |
| `position` | string | `"right"` | Menu alignment: `"left"` or `"right"` |

**Action object properties**:

| Property | Type | Description |
|----------|------|-------------|
| `key` | string | Action identifier emitted as `data-action` |
| `label` | string | Display text |
| `href` | string | Link URL; enabled links render as `<a>` |
| `icon` | string | Iconoir icon name without prefix |
| `variant` | string | Visual variant: `danger`, `warning`, or `success` |
| `disabled` | bool | Disables button actions |
| `disabled_reason` | string | Disabled tooltip text |
| `divider` | bool | Renders a separator |

**Data attributes emitted by the partial**:

- `data-action-menu`
- `data-action-menu-trigger`
- `data-action-menu-content`
- `data-action-menu-item`
- `data-action="<key>"`
- `data-row-id`

The partial does not emit translation-specific metadata such as `data-translation-action`, `data-assignment-id`, `data-action-group`, or row version fields. Translation queue templates currently hand-render action menus where those extra attributes are required.

### Quick Filters

**File**: `pkg/client/templates/partials/quick-filters.html`

Inline badge-style filters for fast status/category filtering.

```html
{% include "partials/quick-filters.html" with filters=queue.DataGrid.quick_filters active_value=queue.DataGrid.active_quick_filter label="Status" %}
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | array | required | Array of filter objects |
| `active_value` | string | - | Current active filter value |
| `label` | string | - | Optional visible label and group label |
| `show_label` | bool/string | label value | Whether to show the label |
| `navigation_busy` | bool | `false` | Marks quick-filter links as navigation-busy triggers |

**Filter object properties**:

| Property | Type | Description |
|----------|------|-------------|
| `value` | string | Filter value used for active matching |
| `label` | string | Display text |
| `href` | string | Filter URL |
| `tone` | string | `error`, `danger`, `warning`, `info`, `success`, or `neutral` |
| `count` | number | Optional count badge |

**Data attributes emitted by the partial**:

- `data-quick-filters`
- `data-quick-filter-value`
- `data-tone`
- `data-navigation-busy-trigger` when `navigation_busy` is enabled

Translation pages often wrap this partial in a translation-owned container such as `data-translation-quick-filters`.

### Filter Panel

**File**: `pkg/client/templates/partials/filter-panel.html`

Collapsible advanced filters form using `<details>`.

```html
{% include "partials/filter-panel.html" with filters=queue.DataGrid.filters form_action=queue.DataGrid.view_links.current channel=queue.Meta.channel active_count=queue.DataGrid.active_filter_chips|length grid_cols=5 %}
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | array | required | Array of filter field definitions |
| `form_action` | string | - | Form submission URL |
| `form_method` | string | `"get"` | Form method |
| `channel` | string | - | Optional hidden channel field |
| `active_count` | number | - | Active filter count badge |
| `open` | bool | `false` | Whether the panel starts open |
| `grid_cols` | number | `7` | XL grid column count |
| `navigation_busy` | bool | `false` | Marks the native GET form and Clear link as navigation-busy triggers |

**Filter field properties**:

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Field name |
| `label` | string | Field label |
| `type` | string | `text`, `select`, `date`, or `number` |
| `options` | array | Select options as `{value, label}` |
| `current_value` | string | Current field value |
| `placeholder` | string | Placeholder text |

**Data attributes emitted by the partial**:

- `data-filter-panel`
- `data-filter-panel-form`
- `data-filter-field="<name>"`
- `data-navigation-busy-trigger` when `navigation_busy` is enabled

Translation pages may wrap or hand-render filter forms with translation-owned selectors such as `data-translation-filter-panel`, `data-translation-filter-toolbar`, `data-translation-filter-summary`, and `data-translation-filter-form="true"` when page enhancers need those selectors.

### Filter Summary

**File**: `pkg/client/templates/partials/filter-summary.html`

Displays active filter chips with individual clear links and optional clear-all link.

```html
{% include "partials/filter-summary.html" with filters=queue.DataGrid.active_filter_chips clear_all_url=queue.DataGrid.view_links.clear_all %}
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | array | required | Array of active filter objects |
| `clear_all_url` | string | - | URL to clear all filters |
| `total_count` | number | `filters|length` | Count shown in the summary |
| `navigation_busy` | bool | `false` | Marks individual and clear-all links as navigation-busy triggers |

**Filter object properties**:

| Property | Type | Description |
|----------|------|-------------|
| `label` | string | Filter field label |
| `value` | string | Filter display value |
| `clear_url` | string | URL to clear this filter |

**Data attributes emitted by the partial**:

- `data-filter-summary`
- `data-filter-clear-all`
- `data-navigation-busy-trigger` when `navigation_busy` is enabled

Translation queue wraps this with `data-translation-filter-summary` for translation-owned enhancement and route guards.

### Bulk Action Overlay

**File**: `pkg/client/templates/partials/bulk-action-overlay.html`

Floating toolbar for selection-based bulk operations.

```html
{% include "partials/bulk-action-overlay.html" with selection_count=selected_count actions=bulk_actions position="bottom" bulk_base=bulk_base %}
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selection_count` | number | `0` | Number of selected records |
| `actions` | array | required | Array of bulk action objects |
| `clear_label` | string | `"Clear selection"` | Clear-selection button text |
| `position` | string | `"bottom"` | Overlay position: `"top"` or `"bottom"` |
| `bulk_base` | string | - | Optional base URL for DataGrid DOM-authored bulk actions |

**Data attributes emitted by the partial**:

- `data-bulk-action-overlay`
- `data-bulk-overlay-position`
- `data-selection-count`
- `data-bulk-selection-count`
- `data-bulk-action="<key>"`
- `data-bulk-clear`
- `data-bulk-base` when `bulk_base` is provided

The DataGrid runtime supports these data attributes and the older ID-based selectors (`#bulk-actions-overlay`, `#selected-count`, `#bulk-clear-selection`, and `#clear-selection-btn`). Prefer the data attributes for new reusable partials because they avoid page-global ID coupling.

### Locale Badge

**File**: `pkg/client/templates/partials/locale-badge.html`

Compact locale indicator with optional status or completion percentage.

```html
{% include "partials/locale-badge.html" with locale=row.locale variant="with-status" status=row.status status_tone=row.status_tone %}
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `locale` | string | required | Locale code |
| `display_locale` | string | `locale` | Display text |
| `variant` | string | `"simple"` | `simple`, `with-status`, or `with-percentage` |
| `status` | string | - | Status label |
| `status_icon` | string | - | Iconoir icon name |
| `status_tone` | string | `"neutral"` | `success`, `warning`, `error`, `danger`, `info`, or `neutral` |
| `percentage` | number | - | Completion percentage |
| `size` | string | `"md"` | `sm` or `md` |
| `is_source` | bool | `false` | Applies source-locale styling |

### View Mode Switcher

**File**: `pkg/client/templates/partials/view-mode-switcher.html`

Button group for switching list, grid, matrix, or custom views.

```html
{% include "partials/view-mode-switcher.html" with modes=view_modes active_mode=view_mode %}
```

**Mode object properties**:

| Property | Type | Description |
|----------|------|-------------|
| `key` | string | Mode identifier emitted as `data-view-mode` |
| `label` | string | Display text |
| `href` | string | Optional URL; when present the mode renders as a link |
| `icon` | string | Optional Iconoir icon name |
| `active` | bool | Optional active flag; `active_mode` can be used instead |

Links emit `aria-current="true"` for the active mode. Buttons always emit `aria-pressed="true"` or `aria-pressed="false"` so assistive technology receives a complete toggle state.

### Metric Card

**File**: `pkg/client/templates/partials/metric-card.html`

Unified metric/summary card with support for counts, tones, icons, alerts, simple links, and drilldown actions.

```html
{% include "partials/metric-card.html" with card=card %}
```

**Card properties**:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | string | - | Card identifier |
| `id` | string | - | Fallback identifier for alert/drilldown cards |
| `label` | string | `"Metric"` | Card title |
| `display_label` | string | `label` | Preferred visible card title |
| `count` | number/string | `"0"` | Main metric value |
| `tone` | string | `"neutral"` | Visual tone |
| `description` | string | - | Supporting text |
| `href` | string | - | Simple link for entire card |
| `icon` | string | - | Iconoir icon name |
| `alert` | object | - | Alert badge configuration |
| `display_status` | string | - | Preferred visible alert/status text |
| `drilldown` | object | - | Action link at bottom |

**Alert object**:

- `state`: `healthy`, `warning`, `critical`, `error`, `info`, or `success`
- `text`: fallback badge text

**Drilldown object**:

- `href`: link URL
- `label`: link text, defaulting to `View all`

**Data attributes emitted by the partial**:

- `data-metric-card="<key-or-id>"`
- `data-tone`

### Status Badge

**File**: `pkg/client/templates/partials/status-badge.html`

Consistent status indicator with optional icon and tone classes.

Preferred SSR usage is flat arguments because it avoids inline object construction:

```html
{% include "partials/status-badge.html" with badge_status=row.status badge_tone=row.status_tone badge_label=row.display_status %}
```

Object syntax is supported when `badge` is already present in the template context:

```html
{% include "partials/status-badge.html" with badge=badge %}
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `badge.status` / `badge_status` | string | `"unknown"` | Status value |
| `badge.tone` / `badge_tone` | string | `"neutral"` | Visual tone |
| `badge.label` / `badge_label` | string | generated | Display text |
| `badge.show_icon` / `show_icon` | bool | `true` | Whether to render the icon |

**Template-supported statuses with automatic labels/icons**:

- `blocked`, `ready`, `missing_locales`, `missing_locales_and_fields`
- `in_review`, `in_progress`, `open`, `assigned`
- `changes_requested`, `approved`, `archived`, `overdue`

The status badge template has its own icon fallback map. It is not a direct renderer for `shared/status-vocabulary.ts`.

## Status Vocabulary

**File**: `pkg/client/assets/src/shared/status-vocabulary.ts`

This module maps status strings to tones and icon names for JavaScript-rendered surfaces.

```typescript
import { getStatusTone, getToneClasses, createStatusDisplay } from './status-vocabulary';

const tone = getStatusTone('in_review'); // 'warning'
const classes = getToneClasses('error', 'badge'); // 'bg-rose-50 text-rose-700'
const display = createStatusDisplay('blocked');
```

The shared vocabulary includes assignment workflow statuses, family readiness states, priority levels, due states, review states, publish states, generic states, blocker types, and alert states. Check the source before adding new status names.

Important current nuance: DataGrid translation surfaces also use `pkg/client/assets/src/datatable/translation-status-vocabulary.ts` for canonical DataGrid translation status rendering. Do not replace that path casually; use the shared vocabulary only where the surrounding code already uses it or where a specific refactor moves rendering to it.

### Server-Side Tone Computation

For SSR templates, prefer server-computed tone/display fields over inline template conditionals:

```go
data["status"] = assignment.Status
data["status_tone"] = translationStatusTone(assignment.Status)
data["display_status"] = displayStatus(assignment.Status)
```

```html
{% include "partials/status-badge.html" with badge_status=assignment.status badge_tone=assignment.status_tone badge_label=assignment.display_status %}
```

Some current translation templates still contain inline `{% set %}` tone logic. Treat that as migration debt tracked by the translation SSR renderability work, not as a pattern to copy.

## CSS Components

The primitive styles live under `pkg/client/assets/src/styles/components/`:

| File | Description |
|------|-------------|
| `action-menu.css` | Action menu dropdown styling |
| `quick-filters.css` | Quick filter badge styling |
| `filter-panel.css` | Filter panel form styling and filter-summary companion styles |

Tone classes are mostly Tailwind utility classes in templates, with the same broad palette:

| Tone | Background | Text |
|------|------------|------|
| `neutral` | `bg-gray-100` | `text-gray-700` |
| `info` | `bg-sky-50` / `bg-blue-50` by component | `text-sky-700` / `text-blue-700` |
| `success` | `bg-emerald-50` | `text-emerald-700` |
| `warning` | `bg-amber-50` | `text-amber-700` |
| `error` / `danger` | `bg-rose-50` | `text-rose-700` |

## Translation Selector Examples

Translation-owned selectors currently include:

```html
data-translation-surface="queue|families|dashboard|editor|family-detail"
data-translation-dashboard-ssr="true"
data-translation-family-list-ssr="true"
data-translation-editor-ssr="true"

data-translation-quick-filters
data-translation-filter-toolbar
data-translation-filter-panel
data-translation-filter-form="true"
data-translation-filter-summary

data-translation-table="queue|families|<table_id>"
data-translation-table-tab="<table_id>"
data-translation-table-panel="<table_id>"
data-translation-row
data-translation-row-id="..."
data-translation-row-version="..."
data-translation-select-row
data-translation-select-all

data-translation-disclosure="..."
data-translation-disclosure-panel="..."
data-translation-disclosure-icon
data-translation-action="claim|release|approve|reject|archive|..."
```

Shared selectors that must remain generic include:

```html
data-action="..."
data-action-menu
data-action-menu-trigger
data-action-menu-content
data-action-menu-item
data-enhance-action="true"
data-enhance-error-target="..."
```

Enhanced SSR actions are documented in `docs/GUIDE_ACTIONS.md`. Translation-family enhanced forms must remain valid normal forms with `method`, `action`, CSRF, hidden command fields, and `data-enhance-action="true"`.

## Page Headers

Use `pkg/client/templates/partials/admin-page-header.html` for consistent page headers when a page follows the standard admin header pattern:

```html
{% include "partials/admin-page-header.html" with page_title=page_title page_subtitle=page_subtitle breadcrumbs=breadcrumbs header_actions_id="queue-header-actions" %}
```

The partial accepts `breadcrumbs`, `page_title`, `page_subtitle`, `header_actions_id`, and `header_actions_slot`.

## Migration Checklist

When adding or migrating admin pages, verify:

- [ ] Uses `admin-page-header.html` when the standard admin header pattern applies
- [ ] Uses `quick-filters.html` for simple status/category filters when presenter data is available
- [ ] Uses `filter-panel.html` or equivalent translation-owned form markup for advanced filters
- [ ] Uses `filter-summary.html` for active filter chips when applicable
- [ ] Uses `action-menu.html` or equivalent shared action-menu markup for row menus
- [ ] Preserves generic action/menu/enhanced-action selectors
- [ ] Uses translation-owned `data-translation-*` selectors only for translation surface state and metadata
- [ ] Uses `status-badge.html` with server-computed tone/display data where practical
- [ ] Uses `metric-card.html` for dashboard/summary cards
- [ ] Avoids inline object/array literals in includes unless render tests prove support
- [ ] Route/template tests cover SSR renderability before JavaScript enhancement
