# Translation Guide

This guide explains how translation works in the current package and how `examples/web` showcases it as a production-style setup.

It starts with the current model and integration contracts, then walks through the main user workflows.

Maintainer note:
- Backend contract guardrails for translation surfaces are defined in `docs/GUIDE_DEVELOPMENT.md#10-rfc-contract-and-security-guardrails`.

## Table Of Contents

- [1. Quick Start](#1-quick-start)
- [2. What `examples/web` Shows Today](#2-what-examplesweb-shows-today)
- [3. Core Model](#3-core-model)
- [4. Grouped Translation-Family Lists](#4-grouped-translation-family-lists)
- [5. Content DataGrid Integration](#5-content-datagrid-integration)
- [6. Tutorial: Translate Content From the Content Panels](#6-tutorial-translate-content-from-the-content-panels)
- [7. Tutorial: Work the Queue](#7-tutorial-work-the-queue)
- [8. Tutorial: Run the Exchange Workflow](#8-tutorial-run-the-exchange-workflow)
- [9. Production Navigation and Verification Checklist](#9-production-navigation-and-verification-checklist)
- [10. Release-Readiness Artifacts in the Repo](#10-release-readiness-artifacts-in-the-repo)
- [11. Permissions](#11-permissions)
- [12. Troubleshooting](#12-troubleshooting)
- [13. Maintainer Pointers](#13-maintainer-pointers)

If you only want the current user workflow, start at section 6.

## 1. Quick Start

Run the example app:

```bash
cd examples/web
APP_TRANSLATION__PROFILE=full go run .
```

Important current defaults:

- `examples/web/config/app.json` sets:
  - `translation.profile=full`
  - `translation.exchange=true`
  - `translation.queue=true`
- `examples/web` is intentionally configured to showcase the production-style translation setup by default.
- `examples/web` also enables `TranslationQueueConfig.EnhancedFilterSelects` for the queue module so Advanced Filters use endpoint-backed controls.
- Quickstart itself still resolves an omitted profile to `core` for CMS-enabled apps. That package-level default is different from the example app’s explicit `full` config.

Supported profiles:

- `none`: no productized translation menu/module exposure
- `core`: translation family/core UI only
- `core+exchange`: core UI + exchange
- `core+queue`: core UI + queue/dashboard/editor
- `full`: core UI + queue/dashboard/editor + exchange

Optional overrides:

- `APP_TRANSLATION__EXCHANGE=true|false`
- `APP_TRANSLATION__QUEUE=true|false`

## 2. What `examples/web` Shows Today

`examples/web` no longer uses QA-only shortcut menu items.

The seeded `Translations` menu reflects the production navigation model. In the
default `full` example profile, queue-enabled entries are:

- `Dashboard`
- `Queue`
- `Assignments`

Exchange-enabled profiles also add:

- `Exchange`

Other translation surfaces still exist, but they are contextual or deep-linked rather than top-level menu items:

- Family detail: `/admin/translations/families/:family_id`
- Matrix: `/admin/translations/matrix`
- Assignment editor: `/admin/translations/assignments/:assignment_id/edit`
- Content list translation filters and actions: `/admin/content/pages`, `/admin/content/posts`, `/admin/content/news`

Queue navigation details:

- Direct queue UI route: `/admin/translations/queue`
- Assignments compatibility route: `/admin/content/translations`
- Generated queue menu entries resolve to `/admin/translations/queue`; the compatibility route remains available for callers that still resolve the `translations.assignments` route key.

Productized UI/nav exposure follows the selected profile:

- `core`: family detail and matrix UI routes are exposed as contextual/deep-link surfaces.
- `core+queue`: core UI plus dashboard, queue, assignments compatibility route, assignment editor UI, queue APIs, and queue menu entries.
- `core+exchange`: core UI plus exchange UI/API routes and exchange menu entry.
- `full`: all productized core UI, queue/dashboard/editor UI, queue API, exchange UI/API routes, and generated translation menu entries.

Backend route gating is more granular than the product profile:

- CMS-backed family and matrix APIs are registered by the translation family boot step when CMS is enabled.
- Queue APIs are registered only when the translation queue feature is enabled.
- Exchange APIs are registered only when the translation exchange feature is enabled.
- `none` removes productized translation UI/nav exposure and disabled module capability routes, but does not by itself disable CMS-backed translation-family internals for a CMS-enabled host.

### Enhanced SSR action status

Translation family assignment is the first enhanced SSR action pilot.

Implemented contracts:

- `go.mod` uses `replace github.com/goliatone/go-crud => ../go-crud` so this checkout can consume local go-crud enhanced mutation helpers during cross-repo development.
- go-crud detects mutation response mode with `X-Enhanced-Action: 1`, the enhanced `Accept` media type, normal browser form posts, and JSON clients. go-admin emits and accepts `application/vnd.admin.enhanced+json` for enhanced SSR mutation envelopes.
- Apps can override enhanced action request header/value, request media types, and response media type with `admin.EnhancedActionNegotiationConfig`; the translation-family page initializer accepts matching `enhancedAction` runtime options for custom browser markers.
- go-admin defines `MutationPresentation`, `EnhancedMutationResponder`, toast/fragment/error envelopes, and known family-detail fragment targets in `admin/enhanced_mutation.go` and `admin/enhanced_family_fragments.go`.
- The shared browser runtime in `pkg/client/assets/src/shared/enhanced-action.ts` progressively enhances `form[data-enhance-action]`, sends enhanced headers, applies `replace` fragments, shows toasts, renders field errors, restores focus, and reinitializes Formgen relationships.
- Family detail SSR contains stable replacement roots: `data-family-locale-coverage`, `data-family-assignments`, `data-family-publish-gate`, and `data-family-activity`.
- Family detail `Assign to me` and `Assign` controls are semantic POST forms with CSRF, hidden command fields, `data-enhance-action="true"`, and scoped error targets.
- The family assignment endpoint executes one command-backed mutation path and negotiates three response shapes at the presentation boundary:
  - enhanced browser requests return `application/vnd.admin.enhanced+json` with fragments, toast, focus, and redirect fallback
  - normal HTML form posts redirect to the family detail page with flash headers
  - existing JSON clients keep the existing JSON response shape when they do not send the enhanced marker

Authoring rules for future translation-family enhanced actions:

- Keep business logic in transport-neutral command adapters. Do not pass HTTP, DOM selectors, templates, toasts, or redirects into commands.
- Render enhanced fragments from the same family detail presenter data used by first-paint SSR.
- Use only the known family detail fragment roots unless a new root is documented and tested.
- Use `replace` fragments only; defer append/prepend until a real page needs them.
- Preserve no-JS behavior by keeping valid `method`, `action`, CSRF, and hidden command fields on the form.
- Preserve JSON compatibility by requiring the enhanced marker before returning fragment envelopes.
- Test the Go responder path, template roots, no-JS redirect/flash, JSON compatibility, built assets, and client fragment/toast/error handling.

## 3. Core Model

### Translation family

All locale variants of the same content item share a translation family/group.

Typical fields:

- `translation_group_id`
- `family_id`
- locale-specific status/readiness metadata

Example:

- EN page: family `tg_home`
- ES page: family `tg_home`
- FR page: family `tg_home`

### Source record

The source record is the locale variant you start from, usually `en`.

Example:

- You have `Home` in `en`
- You choose `Add Translation`
- You create `es`
- `en` is the source
- `es` is the target variant you edit

### Translation variant

A translation variant is another content record in the same family with a different locale.

### Missing translations

"Missing" is policy-driven.

It is computed from:

- required locales for the current environment/transition
- currently available locales in the family

Field completeness is separate:

- missing locale: the locale variant does not exist
- missing field: the locale exists, but required translated fields are incomplete

### Translation policy lifecycle

Publish readiness is derived in this order:

1. Configure `quickstart.TranslationPolicyConfig` for every content type that participates in family readiness, including custom types such as `news`.
2. Ensure suitable page/content services that implement `CheckTranslations` are discoverable through the CMS module, `CMSOptions.GoCMSConfig`, or explicit `quickstart.WithTranslationPolicyServices`; `pages` is the go-cms Pages service entity and uses the page checker by default, while `page` is the backing content type slug used by generic content bridges. Other content types use the content checker unless declared in `page_entities`.
3. Validate policy coverage before startup when seeded or displayed family content types are known; each family content type must have effective `publish` requirements.
4. Run translation family sync so `content_families`, `locale_variants`, and `family_blockers` reflect the current CMS records and policy.
5. Treat `policy_denied` blockers with `details.reason=policy_unavailable` as configuration or wiring work, not translator locale work.

### Fallback mode

If a requested locale does not exist and fallback is allowed:

- `requested_locale` is the locale you asked for
- `resolved_locale` is the locale actually rendered
- the UI shows fallback state and blocks normal editing until the missing locale is created

## 4. Grouped Translation-Family Lists

Translation-enabled content lists can render a grouped family view.

The important implementation detail is that grouped translation-family UX is backed by real sibling rows, not only `available_locales` metadata on one row.

List read rules:

- Explicit locale filters such as `locale=en` remain locale-scoped and return only that locale.
- `locale=all` is a wildcard list request for all locale siblings, not a literal locale code.
- `group_by=family_id` switches the list into family grouping.
- `family_id=<id>` sibling lookups return the locale variants in that family when no explicit locale filter narrows the request.
- Grouped panel responses keep the existing grouped-row contract: `children`, `records`, and `family_summary`.
- The backend change is upstream row production: the source record set must contain one real row per locale sibling before the DataGrid groups it.

This applies to translation-enabled structured content lists and page-backed lists:

- `CMSContentTypeEntryRepository` / `AdminContentReadService` for structured content.
- `CMSPageRepository` for page-backed panels.
- `PageApplicationService.List` when the configured read adapter supports expanded family reads.

For go-cms page admin reads:

- `NewGoCMSAdminPageReadAdapter(...)` is projection-oriented unless the underlying service already expands siblings.
- `NewGoCMSAdminPageReadAdapterWithContent(...)` should be used when grouped page lists must expand locale siblings through the CMS content service.

Family detail and matrix views are complementary to grouped content lists:

- grouped lists keep editors in the normal content-panel workflow
- family detail focuses one translation family
- matrix focuses high-density family-by-locale readiness

## 5. Content DataGrid Integration

Translation-enabled content panels use `datagrid_config` to turn on the translation UX and grouped mode.

Current configuration fields:

- `translation_ux_enabled=true`: shows the translation panel toggle and mounts translation helpers.
- `enable_grouped_mode=true`: enables grouped DataGrid behavior.
- `default_view_mode=grouped`: starts the table in grouped family mode.
- `group_by_field=family_id`: groups locale variants by translation family.
- `api_endpoint`: list JSON endpoint used by the DataGrid.
- `action_base`: base path for row and bulk actions.
- `preferences_endpoint`: persisted grid preferences endpoint.
- `column_storage_key`: browser storage key for column state.
- `state_store` and `url_state`: DataGrid state and URL synchronization.
- `export_config`: export behavior for the panel.

The shared list template checks `datagrid_config.translation_ux_enabled` before rendering the translation panel toggle and panel slot. If that flag is missing, the content list can still work as a normal DataGrid, but the translation panel is not shown.

Client-side DataGrid translation modules live under `pkg/client/assets/src/datatable/`:

- `translation-context.ts`: normalizes translation fields from rows and renders readiness/context labels.
- `translation-panel.ts`: owns the panel UI.
- `translation-bulk-actions.ts`: wires create-missing and related bulk actions.
- `translation-status-vocabulary.ts`: centralizes status/readiness vocabulary.
- `grouped-mode.ts` and `core-grouped.ts`: group records by `family_id` and fetch grouped/sibling data.

The DataGrid expects translation-aware rows to carry these fields when available:

- identity/linkage: `family_id`, `translation_group_id`, `translation_family_id`, `translation_family_url`, `links.translation_family`
- locale state: `locale`, `source_locale`, `requested_locale`, `resolved_locale`, `available_locales`, `missing_requested_locale`, `fallback_used`, `in_fallback_mode`
- missing locales: `missing_locales`, `missing_translations`, `translation_readiness.missing_required_locales`
- readiness: `translation_status` or `status`, `translation_readiness.readiness_state`, `translation_readiness.required_locales`, `translation_readiness.available_locales`, `translation_readiness.missing_required_fields_by_locale`, `translation_readiness.ready_for_transition`
- action diagnostics: blocker codes/details used by create-translation and publish remediation actions
- workflow summaries: `translation_assignment_summary`, `translation_exchange_summary`
- locale navigation: `translation_locale_urls`

Translation actions are exposed through the same action contract as other content panels:

- row action `create_translation` is normally labeled `Add Translation`
- blocker/remediation actions can create missing locales or route the editor to the right surface
- bulk create-missing actions are available when the panel enables them and the backend action is registered
- normal action state, permissions, CSRF, and capability checks still apply

The grouped DataGrid request flow uses the same URL/state machinery as other panels. When grouped mode is active, fetches can include `group_by=family_id`, `locale=all`, or `family_id=<id>` depending on whether the user is viewing grouped families, expanding a family, or drilling into one family.

## 6. Tutorial: Translate Content From the Content Panels

This is the primary editorial workflow.

### Step 1: Open a content list

Open one of:

- `/admin/content/pages`
- `/admin/content/posts`
- `/admin/content/news`

The list surfaces translation-aware columns and actions, including readiness, missing locales, assignment summary, and exchange summary.

### Step 2: Create source content

Create or open a source record in the default locale, usually `en`.

For production-like policy behavior in `examples/web`:

- Pages commonly require `en`, `es`, and `fr` for production
- Staging requirements may be less strict depending on policy

### Step 3: Add a translation

Use one of these entrypoints:

- row action: `Add Translation`
- fallback warning/banner when a requested locale is missing
- blocker/remediation UI when publish readiness is missing locales
- exchange apply with create-missing enabled

The new locale variant is created as a draft record.

### Step 4: Edit the translated record

There are two current edit surfaces:

- Content forms remain the primary content-owner edit path.
- The assignment editor is the queue/review edit path with autosave, source drift detection, QA surfacing, review feedback, and workflow actions.

Typical edit routes:

- `/admin/content/pages/:id/edit?locale=es`
- `/admin/content/posts/:id/edit?locale=fr`
- `/admin/translations/assignments/:assignment_id/edit`

Editor API routes used by the assignment editor:

- `GET /admin/api/translations/assignments/:assignment_id`
- `GET /admin/api/translations/assignments/:assignment_id/preview`
- `GET /admin/api/translations/sync/resources/:kind/:id`
- `PATCH /admin/api/translations/sync/resources/:kind/:id`
- `POST /admin/api/translations/assignments/:assignment_id/actions/:action`

### Step 5: Use family and matrix views when needed

Useful contextual/deep-link surfaces:

- Family detail: review all locale variants and create missing locales
- Matrix: scan family-by-locale readiness at higher density, create missing variants in bulk, and export selected work

These are especially useful when debugging why a record is not publish-ready.

### Step 6: Publish

If policy requirements are satisfied:

- all required locales exist
- required fields are complete
- review requirements are satisfied where configured

publish can proceed normally.

If publish is blocked, expect readiness/blocker metadata such as:

- missing required locales
- missing required fields
- pending review
- outdated source / stale translation

## 7. Tutorial: Work the Queue

Use the queue for work coordination and lifecycle management.

Open:

- seeded queue nav entry: `/admin/translations/queue`
- assignments compatibility route: `/admin/content/translations`

Typical queue actions:

- claim
- assign
- release
- submit for review
- approve
- reject
- archive

Important rule:

- queue rows coordinate work; use the assignment editor for queue/review editing, or content forms for direct content editing

The assignment editor is opened from queue context or direct links:

- `/admin/translations/assignments/:assignment_id/edit`

The queue/dashboard/editor surfaces are enabled when the queue module is enabled.

Queue filter controls:

- By default, quickstart keeps compatible lightweight queue filters.
- Set `TranslationQueueConfig.EnhancedFilterSelects=true` to render endpoint-backed Advanced Filters.
- Enhanced mode renders `entity_type` as a remote select, and `assignee_id`, `reviewer_id`, and `family_id` as typeahead controls.
- Content type accepts `entity_type` (canonical) plus the compatibility aliases `content_type` and `type`.
- Source-title and source-path matching use case-insensitive contains semantics. The canonical keys are `title__ilike` and `path__ilike`; `title__contains`, `source_title__ilike`, `source_title__contains`, `path__contains`, `source_path__ilike`, and `source_path__contains` remain accepted aliases.
- These controls still submit the existing query keys, so bookmarked URLs, presets, chips, pagination, grouped views, and server-family queue mode keep working.
- Existing raw IDs are hydrated into readable labels when option endpoints can resolve them. If JavaScript is disabled, an endpoint fails, or a value cannot be resolved, the editable raw-value field remains usable.
- Queue pages use `page` and `per_page`. Filter and page-size changes reset to page 1; previous/next navigation preserves active filters, sort, grouping, review state, channel, and auth-derived tenant/org scope.
- Flat-mode totals count assignments. In server-family mode, the top-level total and page range count families while assignment totals remain available in grouping metadata.
- SSR remains the default. The explicit `translation_client_render=1` diagnostic mode hydrates the same URL query and scope contract without applying an implicit preset when the URL already contains queue state.

Core queue API routes:

- `GET /admin/api/translations/dashboard`
- `GET /admin/api/translations/queue`
- `GET /admin/api/translations/my-work`
- `GET /admin/api/translations/assignments`
- `GET /admin/api/translations/assignments/:assignment_id`
- `GET /admin/api/translations/assignments/:assignment_id/preview`
- `POST /admin/api/translations/assignments/:assignment_id/actions/:action`
- `POST /admin/api/translations/assignment-actions/snapshot`
- `POST /admin/api/translations/assignment-actions/bulk`
- `GET /admin/api/translations/sync/resources/:kind/:id`
- `PATCH /admin/api/translations/sync/resources/:kind/:id`

Queue option endpoints also exist under `/admin/api/translations/options/*` for entity types, source records, locales, families, and assignees.

Enhanced queue filters use:

- `GET /admin/api/translations/options/entity-types`
- `GET /admin/api/translations/options/assignees`
- `GET /admin/api/translations/options/families`

The assignee endpoint is reused for reviewer lookup in this slice. Option requests are bounded and permission-gated by translation view access. Selected-value hydration uses the `selected` query parameter where supported and falls back to displaying the raw submitted value when no label can be resolved.

### Queue bulk action contract

The browser-facing bulk endpoint supports current-page selections and server-created filter snapshots. Current-page requests send an action plus selected assignment/version pairs:

```json
{
  "action": "assign",
  "selection_scope": "current_page",
  "assignments": [
    {"assignment_id": "asg_1", "expected_version": 3}
  ]
}
```

Supported actions are `assign`, `release`, `priority`, and `archive`. Responses include updated assignment rows when available, per-assignment errors, and metadata with requested, succeeded, failed, partial, and selection-scope counts. Version conflicts, permission failures, invalid statuses, and missing assignments are reported per item where possible.

For all-matching-filter selection, the browser first creates a server-side snapshot:

```json
{
  "filters": {
    "status": "open,assigned",
    "assignee_id": "__me__",
    "priority": "high,urgent",
    "locale": "es",
    "family_id": "tg_123",
    "review_state": "qa_blocked",
    "sort": "due_date",
    "order": "asc"
  }
}
```

`POST /admin/api/translations/assignment-actions/snapshot` resolves the filter vocabulary used by `GET /admin/api/translations/assignments`, binds the snapshot to the authenticated tenant, org, actor, channel, and creation time, and stores assignment IDs with their row versions. The response includes:

```json
{
  "data": {
    "selection_scope": "filter_snapshot",
    "snapshot_id": "snap_...",
    "requested": 42,
    "filters": {"status": "open,assigned", "sort": "due_date", "order": "asc"},
    "filter_summary": ["Status: open, assigned", "Sort: due_date ascending"],
    "created_at": "2026-06-01T12:00:00Z",
    "expires_at": "2026-06-01T12:15:00Z"
  }
}
```

The confirmed bulk request references the snapshot instead of sending all matching IDs to the browser:

```json
{
  "action": "assign",
  "selection_scope": "filter_snapshot",
  "snapshot_id": "snap_...",
  "assignee_id": "translator-1",
  "idempotency_key": "translation_queue_filter_snapshot:snap_...:assign:translator-1:"
}
```

Snapshot execution supports the same `assign`, `release`, `priority`, and `archive` action set as current-page bulk actions. `assign` requires `assignee_id`; `priority` requires `priority`. Clients should send an `idempotency_key` for confirmed snapshot executions. Reusing the same key with the same payload returns the original response with `meta.idempotency_hit=true`; reusing it with a different payload is rejected as a conflict.

Snapshot execution reuses the current-page bulk action semantics per assignment. If an assignment was updated, removed, no longer matches the snapshot filter scope, denied by permissions, or no longer supports the action, that item is returned as a per-assignment failure. Snapshots are short-lived and actor-scoped; expired or cross-actor snapshot references are rejected before mutation. Repositories that cannot resolve a snapshot filter efficiently must return an unsupported-filter error instead of falling back to broad assignment hydration.

### Queue grouping contract

`GET /admin/api/translations/assignments?group_by=family_id` returns a queue-specific grouped response. This is separate from the content DataGrid grouped contract.

Page-local semantics:

- grouping is page-local: assignment filters, sorting, and pagination run first
- group rows use `row_type=group`, `group_by=family_id`, `parent`, `children`, `records`, and `family_summary`
- child rows retain normal assignment action states
- parent action state is informational; execute actions against child assignments
- `meta.grouping` advertises `strategy=page_local`, `scope=current_page`, `assignment_count`, `group_count`, supported modes, and the filtering/sorting/pagination rules

Server-family semantics:

- request parent families with `GET /admin/api/translations/assignments?group_by=family_id&group_strategy=server_family`
- parent pagination uses `page` and `per_page`, defaults to `25`, clamps to `100`, and top-level `meta.total` means total matching families
- assignment totals are exposed separately as `meta.grouping.assignment_total` and `meta.assignment_total`
- parent rows use `row_type=family`, `id=family:<family_id>`, `family_id`, `family_label`, source identity fields, `assignment_count`, `locale_count`, `target_locales`, `status_counts`, `due_state_counts`, `priority_counts`, persisted blocker metadata, informational `action_state`, optional `action_hints`, and `expansion`
- `family_blocker_count` is a persisted family blocker aggregate; unavailable stores return `family_blocker_count=null`, `family_blocker_count_available=false`, and a reason such as `persisted_blockers_unavailable`
- parent rows do not expose executable assignment actions; actions remain on expanded child rows
- each parent `expansion` includes JSON child-expansion metadata: `href`, `route=translations.assignments.family_assignments`, `params.family_id`, and normalized effective query filters
- each parent also exposes `assignments_href` for SSR UI navigation to `/admin/translations/families/:family_id/assignments`; clients must not use `row.expansion.href` as a normal browser navigation link
- expanded child rows load from `GET /admin/api/translations/families/:family_id/assignments`
- family assignments SSR row actions use the assignment action API base `/admin/api/translations/assignments` for mutations, producing `POST /admin/api/translations/assignments/:assignment_id/actions/:action`; they do not post mutations to the read-only family child-expansion endpoint
- child expansion uses page-based `page` and `per_page`, defaults to `25`, clamps to `100`, and returns normal assignment rows plus `meta.family_id`, `total`, `has_next`, `sort`, and `order`
- server-family parent sort keys are `updated_at`, `created_at`, `due_date`, `due_state`, and `priority`; parent rows use aggregate semantics and `family_id` as the stable tie-breaker
- expanded child rows inherit the normalized `sort` and `order` from the parent expansion request and use normal assignment-row sort semantics
- explicit ambiguous flat queue sorts such as `locale`, `assignee_id`, `reviewer_id`, and `status` return a validation error in server-family mode
- `review_state=qa_blocked` means persisted family blocker evidence in the filtered queue scope; unavailable persisted blocker data returns a structured unsupported response instead of live QA hydration
- `meta.grouping.capabilities.server_family.supported` controls whether the UI may expose server-side family grouping for the active repository

Unsupported grouping modes return a validation error instead of silently changing the response shape.

### Dashboard remediation context

Dashboard blocked-family rows can include optional remediation fields:

- `blocker_codes`
- `blocker_labels`
- `reason_breakdown`
- `affected_locales`
- `reason_data`

`reason_data.state` is one of `available`, `unavailable`, or `degraded`. Clients should treat these fields as optional and keep rendering the existing dashboard payload when they are absent. Populated `family_blockers` rows are the actionable source for reason buckets; fallback-only `content_families.blocker_codes` values provide labels but should render as unavailable or degraded reason context when detailed blocker rows are absent.

`blocker_codes` remains the canonical machine field. A row can still carry `policy_denied` while `blocker_labels.policy_denied` or `reason_breakdown[].code=policy_unavailable` tells operators the policy checker was unavailable or not configured.

The optimized dashboard path derives family aggregates from `content_families` and reason detail from `family_blockers`, scoped by tenant, org, channel, and dashboard limits. It should not call broad family or assignment hydration paths, derive family reason buckets from assignment rows, or require a denormalized dashboard projection for the current contract.

Dashboard overdue assignment metrics and top-overdue rows count actionable workflow statuses only: `open`, `assigned`, `in_progress`, `in_review`, and `changes_requested`. Approved assignments can retain a past `due_date` for audit/inspection, but they are not overdue remediation work.

### Scope policy

Translation family, queue, assignment, dashboard, and sync paths use the
go-admin effective-scope contract. Request handlers should call
`Admin.EffectiveScopeFromRequest(...)` or consume the `AdminContext` produced by
go-admin request binding; background syncs and service jobs should call
`Admin.EffectiveScope(...)` with trusted record/service input. Query parameters
named `tenant_id` or `org_id` are filters only when a path explicitly treats
them as trusted service input; authenticated admin actor scope does not come
from browser query strings.

Single-tenant sync fills missing tenant/org values on materialized translation
family rows before persistence. Explicit record metadata still wins. Multi-tenant
sync leaves missing scope blank unless trusted context or record metadata
provides it. Optimized Bun stores apply exact scoped predicates to family detail,
child variants, blockers, assignments, dashboard metrics, and translation memory
suggestions; global fallback is opt-in per call path.

Use quickstart doctor check `quickstart.scope_drift` to find existing blank
tenant/org rows in `content_families`, `locale_variants`, `family_blockers`, and
`translation_assignments`. The diagnostic reports counts only and does not
repair data. When `quickstart.NewBunScopeDriftInspector(db)` is wired, the
explicit command `quickstart.scope_drift.repair` supports dry-run by default and
`apply: true` mode for allowlisted single-tenant backfills.

### Assignment editor assist

The assignment editor assist payload includes:

- `glossary_matches`
- `style_guide_summary`
- `translation_memory_suggestions`

Translation memory suggestions currently come from internal variant history only. A suggestion is eligible when another family in the same tenant/org, content type, source locale, target locale, and field path has an exact source-field match and an approved or published target variant. The editor reads this through a bounded family-store lookup; stores without that optimized lookup return an empty suggestion list instead of scanning all families. Suggestions include score, source label, locale pair, source/target locale, field path, source text, suggested text, and stale-source metadata.

AI suggestions are not part of this contract.

## 8. Tutorial: Run the Exchange Workflow

Use exchange for external translators, batch updates, or import/export-driven localization workflows.

Open:

- `/admin/translations/exchange`

### Step 1: Export

Choose:

- resources such as `pages`, `posts`, `news`
- source locale
- target locales
- whether to include source hash/linkage data

The quickstart exchange wizard can be host-configured through `TranslationExchangeConfig.UI`. Configure source locale options, target locales, resource IDs/labels, default selections, template link metadata, and apply/export defaults there. Missing UI config keeps the demo `pages/posts` and `en/es/fr/de/it` fallback; partial host config does not mix in those demo values.

Host apps should map their own runtime config into the quickstart contract. For example, a host with locales `en`, `bo`, and `zh` should set source `en`, target locales `bo` and `zh`, and its own exchange resource IDs. Resource IDs are exact host-owned identifiers, so configure them with the same casing the exchange store expects. Site supported locales are not read directly by `go-admin`.

Core API endpoints:

- `POST /admin/api/translations/exchange/export`
- `GET /admin/api/translations/exchange/template`
- `POST /admin/api/translations/exchange/import/validate`
- `POST /admin/api/translations/exchange/import/apply`

Security note:

- Programmatic clients should prefer Bearer auth against the exchange API.
- Browser or cookie-backed clients must send `X-CSRF-Token` on unsafe same-origin requests. The admin shell exposes the token through `meta[name="csrf-token"]`.

### Step 2: Translate externally

Exported rows carry source/linkage metadata so imports can validate staleness and target resolution safely.

### Step 3: Validate import

Use:

- `POST /admin/api/translations/exchange/import/validate`

Validation should be run before apply.

### Step 4: Apply import

Use:

- `POST /admin/api/translations/exchange/import/apply`

Important apply controls include:

- create missing translation records
- dry run
- continue on error
- source hash override, when explicitly allowed

### Step 5: Review and publish

Applied translations still flow back into the normal editorial surfaces:

- content forms
- queue/editor
- family/matrix views

### Step 6: Inspect job history

Exchange job history and retention endpoints:

- `GET /admin/api/translations/exchange/jobs`
- `GET /admin/api/translations/exchange/jobs/:job_id`
- `DELETE /admin/api/translations/exchange/jobs/:job_id`

The exchange UI uses the same endpoints for retained history, status polling, and retry-oriented flows.

## 9. Production Navigation and Verification Checklist

When validating a production-style setup in `examples/web`, verify:

1. Startup capability log includes the expected profile, modules, routes, and resolver keys.
2. The sidebar contains the seeded `Translations` group with:
   - dashboard
   - queue
   - assignments
   - exchange
3. Expected contextual UI routes remain reachable for their enabled module:
   - core: family detail and matrix
   - queue: assignment editor
4. Disabled profiles behave correctly:
   - `core`: family detail and matrix UI are exposed as deep links; queue/dashboard/editor/exchange menu entries are not
   - `core+queue`: queue/dashboard/assignments/editor are exposed; exchange is not
   - `core+exchange`: exchange is exposed; queue/dashboard/editor are not
   - `none`: no productized translation menu or module UI entrypoints
5. Privileged roles retain required translation permissions.

Quick smoke matrix:

```bash
# production-style showcase
APP_TRANSLATION__PROFILE=full go run .

# core only
APP_TRANSLATION__PROFILE=core go run .

# translation disabled
APP_TRANSLATION__PROFILE=none go run .
```

See also:

- `examples/web/README.md`
- `examples/web/release/README.md`

## 10. Release-Readiness Artifacts in the Repo

The repo keeps two different release artifacts on purpose:

- `examples/web/release/translation_release_checklist.json`
  - the real rollout template
  - intentionally incomplete until the next release is signed off
- `examples/web/release/testdata/translation_release_checklist_approved_sample.json`
  - an approved sample bundle
  - demonstrates the finished release shape with repo-local evidence references

The checklist expects:

- backend signoff
- frontend signoff
- QA signoff
- ops signoff
- evidence for contracts, migrations, scope, security, observability, performance, extraction dry run, accessibility, E2E, and staging soak
- rollback instructions including both translation kill switches

Use the sample bundle as the tutorial/example.
Use the template for the actual next release.

## 11. Permissions

### Queue permissions

- `admin.translations.view`
- `admin.translations.edit`
- `admin.translations.manage`
- `admin.translations.assign`
- `admin.translations.approve`
- `admin.translations.claim`

### Exchange permissions

- `admin.translations.export`
- `admin.translations.import.view`
- `admin.translations.import.validate`
- `admin.translations.import.apply`

### Content permissions still matter

Translation does not bypass normal content permissions.

You still need content-panel permissions such as:

- `admin.pages.edit`
- `admin.pages.publish`
- `admin.posts.edit`
- `admin.posts.publish`

`examples/web` seeds privileged roles such as `superadmin` and `owner` with the full translation permission set and runs authz preflight checks in development-oriented setups.

## 12. Troubleshooting

### “I have both `/admin/translations/queue` and `/admin/content/translations` links”

Expected.

- direct queue shell route and generated queue nav target: `/admin/translations/queue`
- assignments compatibility route: `/admin/content/translations`

They both remain valid entrypoints for queue/assignment workflows.

### “I requested FR but I still see EN”

You are in fallback mode.

Create the FR locale variant first, then edit the FR record.

### “Publish is blocked even though the locale exists”

Locale existence is only one requirement.

You may still have:

- missing required fields
- pending review
- stale/outdated source

### “Publish is blocked by policy unavailable”

This is a host configuration issue. Check that:

- `WithTranslationPolicyConfig` covers the content type with effective `publish` requirements.
- the suitable page/content service implementing `CheckTranslations` is discoverable, or pass it with `WithTranslationPolicyServices`.
- the content type is included in policy coverage validation.
- translation family sync has been run after policy or CMS wiring changes.

### “Queue is enabled, but editing still happens in a content form”

Expected for direct content-owner editing.

The actual translated content still lives in the page/post/news records. Queue users can also edit through the assignment editor, which saves back to the same translated variant record.

### “Exchange apply failed because a target locale does not exist”

Use the apply option that allows creation of missing translation records, or create the locale variant first from the content/family flow.

### “The Translations menu is missing”

Check:

- `APP_TRANSLATION__PROFILE`
- `APP_TRANSLATION__EXCHANGE`
- `APP_TRANSLATION__QUEUE`
- runtime capability logs

If profile is `none`, the translation menu should not be exposed.

## 13. Maintainer Pointers

Primary example wiring:

- `examples/web/main.go`
- `examples/web/translation_product_fixtures.go`
- `examples/web/release/`

Quickstart/productization references:

- `quickstart/translation_product.go`
- `quickstart/translation_capabilities.go`
- `quickstart/module_registrar.go`
- `quickstart/ui_routes.go`
- `quickstart/view_capabilities.go`
- `quickstart/content_entry_routes_translation.go`
- `quickstart/content_entry_routes_test.go`

Translation backend/UI bindings:

- `admin/translation_*`
- `admin/enhanced_mutation.go`
- `admin/enhanced_family_fragments.go`
- `admin/internal/boot/step_translation_*.go`
- `translations/adapters/goadmin/module_contract.go`
- `translations/core/`
- `translations/services/`
- `translations/ui/openapi/translations.json` (partial OpenAPI snapshot; confirm against boot route steps before treating it as a complete route inventory)
- `pkg/client/templates/resources/translations/`
- `pkg/client/templates/resources/shared/list-base.html`
- `pkg/client/assets/src/shared/enhanced-action.ts`
- `pkg/client/assets/src/translation-*`
- `pkg/client/assets/src/datatable/translation-*`
- `pkg/client/assets/src/datatable/grouped-mode.ts`
- `pkg/client/assets/src/datatable/core-grouped.ts`

If you are changing behavior, update:

1. runtime/tests
2. `examples/web/README.md`
3. this guide
