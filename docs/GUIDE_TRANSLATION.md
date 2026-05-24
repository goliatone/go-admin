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

The seeded `Translations` menu now reflects the production navigation model:

- `Dashboard`
- `Queue`
- `Exchange`

Other translation surfaces still exist, but they are contextual or deep-linked rather than top-level menu items:

- Family detail: `/admin/translations/families/:family_id`
- Matrix: `/admin/translations/matrix`
- Assignment editor: `/admin/translations/assignments/:assignment_id/edit`
- Content list translation filters and actions: `/admin/content/pages`, `/admin/content/posts`, `/admin/content/news`

Queue navigation details:

- Direct queue UI route: `/admin/translations/queue`
- Compatibility alias used by the seeded menu entry: `/admin/content/translations`

Productized UI/nav exposure follows the selected profile:

- `core`: family detail and matrix UI routes are exposed.
- `core+queue`: core UI plus dashboard, queue, assignment editor UI, and queue APIs.
- `core+exchange`: core UI plus exchange UI/API routes.
- `full`: all productized core UI, queue/dashboard/editor UI, queue API, and exchange UI/API routes.

Backend route gating is more granular than the product profile:

- CMS-backed family and matrix APIs are registered by the translation family boot step when CMS is enabled.
- Queue APIs are registered only when the translation queue feature is enabled.
- Exchange APIs are registered only when the translation exchange feature is enabled.
- `none` removes productized translation UI/nav exposure and disabled module capability routes, but does not by itself disable CMS-backed translation-family internals for a CMS-enabled host.

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
- `PATCH /admin/api/translations/variants/:variant_id`
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

- seeded nav entry: `/admin/content/translations`
- direct UI route: `/admin/translations/queue`

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

Core queue API routes:

- `GET /admin/api/translations/dashboard`
- `GET /admin/api/translations/queue`
- `GET /admin/api/translations/my-work`
- `GET /admin/api/translations/assignments`
- `GET /admin/api/translations/assignments/:assignment_id`
- `POST /admin/api/translations/assignments/:assignment_id/actions/:action`
- `PATCH /admin/api/translations/variants/:variant_id`

Queue option endpoints also exist under `/admin/api/translations/options/*` for entity types, source records, locales, families, and assignees.

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
   - exchange
3. Expected contextual UI routes remain reachable for their enabled module:
   - core: family detail and matrix
   - queue: assignment editor
4. Disabled profiles behave correctly:
   - `core`: family detail and matrix UI are exposed; queue/dashboard/editor/exchange are not
   - `core+queue`: queue/dashboard/editor are exposed; exchange is not
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

### “I can open the queue directly, but the sidebar link goes somewhere different”

Expected.

- direct queue shell route: `/admin/translations/queue`
- seeded sidebar entry target: `/admin/content/translations`

They both lead to the queue experience.

### “I requested FR but I still see EN”

You are in fallback mode.

Create the FR locale variant first, then edit the FR record.

### “Publish is blocked even though the locale exists”

Locale existence is only one requirement.

You may still have:

- missing required fields
- pending review
- stale/outdated source

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
- `admin/internal/boot/step_translation_*.go`
- `translations/adapters/goadmin/module_contract.go`
- `translations/core/`
- `translations/services/`
- `translations/ui/openapi/translations.json` (partial OpenAPI snapshot; confirm against boot route steps before treating it as a complete route inventory)
- `pkg/client/templates/resources/translations/`
- `pkg/client/templates/resources/shared/list-base.html`
- `pkg/client/assets/src/translation-*`
- `pkg/client/assets/src/datatable/translation-*`
- `pkg/client/assets/src/datatable/grouped-mode.ts`
- `pkg/client/assets/src/datatable/core-grouped.ts`

If you are changing behavior, update:

1. runtime/tests
2. `examples/web/README.md`
3. this guide
