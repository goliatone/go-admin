# Translation Guide

This guide explains how translation works in the current package and how `examples/web` showcases it as a production-style setup.

It is written as a tutorial first, with maintainer notes at the end.

Maintainer note:
- Backend contract guardrails for translation surfaces are defined in `docs/GUIDE_DEVELOPMENT.md#10-rfc-contract-and-security-guardrails`.

If you only want the current user workflow, start at section 4.

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

- `none`: no translation capability exposure
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

## 4. Tutorial: Translate Content From the Content Panels

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

Translated content is edited in the actual content form, not in the queue row.

Typical edit routes:

- `/admin/content/pages/:id/edit?locale=es`
- `/admin/content/posts/:id/edit?locale=fr`

### Step 5: Use family and matrix views when needed

Useful contextual/deep-link surfaces:

- Family detail: review all locale variants and create missing locales
- Matrix: scan family-by-locale readiness at higher density

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

## 5. Tutorial: Work the Queue

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

- queue rows coordinate work, but they do not replace editing the translated content in the content forms

The assignment editor is opened from queue context or direct links:

- `/admin/translations/assignments/:assignment_id/edit`

The queue/dashboard/editor surfaces are enabled when the queue module is enabled.

## 6. Tutorial: Run the Exchange Workflow

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

Exchange job history endpoints:

- `GET /admin/api/translations/exchange/jobs`
- `GET /admin/api/translations/exchange/jobs/:job_id`
- `DELETE /admin/api/translations/exchange/jobs/:job_id`

## 7. Production Navigation and Verification Checklist

When validating a production-style setup in `examples/web`, verify:

1. Startup capability log includes the expected profile, modules, routes, and resolver keys.
2. The sidebar contains the seeded `Translations` group with:
   - dashboard
   - queue
   - exchange
3. Core/contextual routes remain reachable:
   - family detail
   - matrix
   - assignment editor
4. Disabled profiles behave correctly:
   - `core`: no queue/dashboard/exchange
   - `none`: no translation routes
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

## 8. Release-Readiness Artifacts in the Repo

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

## 9. Permissions

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

## 10. Troubleshooting

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

Expected.

The queue coordinates translation work; the actual translated content still lives in the page/post/news records.

### “Exchange apply failed because a target locale does not exist”

Use the apply option that allows creation of missing translation records, or create the locale variant first from the content/family flow.

### “The Translations menu is missing”

Check:

- `APP_TRANSLATION__PROFILE`
- `APP_TRANSLATION__EXCHANGE`
- `APP_TRANSLATION__QUEUE`
- runtime capability logs

If profile is `none`, the translation menu should not be exposed.

## 11. Maintainer Pointers

Primary example wiring:

- `examples/web/main.go`
- `examples/web/translation_product_fixtures.go`
- `examples/web/release/`

Quickstart/productization references:

- `quickstart/translation_product.go`
- `quickstart/translation_capabilities.go`
- `quickstart/module_registrar.go`
- `quickstart/ui_routes.go`

Translation backend/UI bindings:

- `admin/translation_*`
- `pkg/client/templates/resources/translations/`
- `pkg/client/assets/src/translation-*`
- `pkg/client/assets/src/datatable/translation-*`

If you are changing behavior, update:

1. runtime/tests
2. `examples/web/README.md`
3. this guide
