# Translation Guide

This guide explains how translation works in the `examples/web` app from an editor/user perspective first, then with implementation notes for maintainers.

Maintainer note:
- Backend contract guardrails for translation surfaces (async job ownership, action order determinism, degraded payload signaling) are defined in `docs/GUIDE_DEVELOPMENT.md#10-rfc-contract-and-security-guardrails`.

It answers:

- What is a source record vs a translation variant?
- What does "missing translations" mean?
- Where should translations be created?
- How do I complete an end-to-end translation workflow for a page?

If you only want the "day to day" workflow, start at section 4.

## 1. Quick Setup (examples/web)

Run the app with translation modules enabled:

```bash
cd examples/web
APP_TRANSLATION__PROFILE=full go run .
```

Profile defaults:

- `none`: no translation capabilities
- `core`: translation policy only (no exchange UI, no queue UI)
- `core+exchange`: exchange only
- `core+queue`: queue only
- `full`: exchange + queue

Important defaults in this repo:

- If `translation.profile` is unset, profile resolves to `core` (for CMS enabled apps)
- Translation exchange and queue feature flags default to `false` in quickstart defaults
- So with no overrides, you get core translation mechanics but no Exchange/Queue UI routes

Optional explicit overrides:

- `translation.exchange=true|false` (`APP_TRANSLATION__EXCHANGE`)
- `translation.queue=true|false` (`APP_TRANSLATION__QUEUE`)

In `examples/web/main.go`, profile defaults are resolved first, then explicit module overrides are applied from loaded runtime config.

## 2. Core Model

### Translation group

`translation_group_id` links all locale variants of the same content item.

Example:

- EN page: `translation_group_id = tg_123`
- ES page: `translation_group_id = tg_123`
- FR page: `translation_group_id = tg_123`

### Source record

In UI workflows, the source is the existing record you start from (usually `en`).

Example:

- You have page `Home` in `en`
- You click `Add Translation` and choose `es`
- The `en` row is the source for the creation action
- The new `es` row is the translation target you now edit

In Exchange, `source_text` is exported from the source locale row and hashed (`source_hash`) for stale content detection.

### Translation variant

A translation is another record in the same `translation_group_id` with a different `locale`.

### Missing translations

"Missing" is policy driven, not just "locale not created".

For list/detail UI, readiness is computed as:

- `required_locales` (from translation policy for transition/environment)
- minus `available_locales` (locales currently present in the group)

If any required locales are absent, readiness is not `ready`.

Field completeness is separate from locale existence:

- Locale existence drives `missing_required_locales`
- Required field checks drive `missing_required_fields_by_locale`
- In list rows, field level readiness is evaluated for the active row locale

### Fallback mode

If user requests locale `fr` but only `en` exists:

- `requested_locale = fr`
- `resolved_locale = en`
- `missing_requested_locale = true`
- `fallback_used = true`

UI then shows fallback warning and blocks saving until translation is created.

## 3. Where To Create Translations

Use one of these paths:

1. Pages/Posts row action: `Add Translation` (`create_translation` action)
2. Fallback warning banner in detail/edit: `Create XX`
3. Publish blocker modal (`TRANSLATION_MISSING`): create missing locale from modal
4. Translation Exchange apply: check `Create missing translation records`

Where you actually write translated text:

- In the translated Pages/Posts record form (`/admin/content/pages` or `/admin/content/posts`)
- Not in queue rows
- Not directly in Exchange (Exchange imports values, but editorial review still happens in content forms)

## 4. End to End Tutorial: Translate a Page in UI

### Step 1: Create the source page

1. Open `http://localhost:8080/admin/content/pages`
2. Create a page in `en` (draft)
3. Save

### Step 2: Check translation columns

In Pages list you will see:

- `translation_status`
- `available_locales`
- `translation_readiness`
- `missing_translations`

If only `en` exists, it will typically show missing locales for publish policy.

### Step 3: Create first translation (ES)

1. On the EN row, click `Add Translation`
2. Choose `es`
3. Open the new ES record (it is created in `draft`)
4. Enter translated fields and save

### Step 4: Create second translation (FR)

Repeat with locale `fr`.

### Step 5: Verify “missing” is gone

When required locales exist for the translation group:

- readiness no longer shows missing locales
- missing badge disappears
- quick filter `Incomplete` drops locale rows that are now ready

### Step 6: Publish

Publish from row action.

With default `DefaultContentTranslationPolicyConfig()`:

- Pages publish requires `en, es, fr` in production
- Pages publish requires `en, es` in staging
- Required page fields per locale: `title`, `path`

If blocked, API returns `TRANSLATION_MISSING` and UI shows a blocker modal with missing locales and remediation actions.
Status code is typically:

- `409` when locales are missing
- `422` when required fields are missing

---

## 5. End-to-End Tutorial: Exchange Workflow (CSV/JSON)

Use this for external translators or batch workflows.

### Step 1: Open exchange UI

`GET /admin/translations/exchange`

### Step 2: Export

1. Select resources (`pages`, `posts`)
2. Select source locale (`en`)
3. Select target locales (`es`, `fr`)
4. Keep `Include source hash` enabled
5. Export CSV

Export rows include fields like:

- `resource`, `entity_id`, `translation_group_id`, `source_locale`, `target_locale`, `field_path`, `source_text`, `source_hash`

### Step 3: Translate externally

Fill `translated_text` per row.

### Step 4: Validate import

Upload file and click `Validate`.

### Step 5: Apply import

If target locale records do not yet exist, enable:

- `Create missing translation records` (`allow_create_missing` / `create_translation`)

Optional controls:

- `allow_source_hash_override`
- `continue_on_error`
- `dry_run`

Apply writes translations as `draft` status.

### Step 6: Review in Pages/Posts and publish

Open translated variants, complete required fields if needed, then publish.

---

## 6. Translation Queue (What It Is For)

When queue module is enabled:

- UI route: `/admin/content/translations`
- Panel slug: `translations`

Queue actions include claim/assign/release/review/approve/reject/archive.

Pages and Posts detail views also get a `Translations` tab filtered by `translation_group_id`.

Queue tracks work coordination and lifecycle only. It does not replace editing translated content in page/post forms.

---

## 7. Permissions

### Exchange permissions

- `admin.translations.export`
- `admin.translations.import.view`
- `admin.translations.import.validate`
- `admin.translations.import.apply`

### Queue permissions

- `admin.translations.view`
- `admin.translations.edit`
- `admin.translations.manage`
- `admin.translations.assign`
- `admin.translations.approve`
- `admin.translations.claim`

### Content permissions still apply

For page/post creation/edit/publish flows you also need standard panel permissions such as:

- `admin.pages.edit`, `admin.pages.publish`
- `admin.posts.edit`, `admin.posts.publish`

If permissions were changed for a role, re-authenticate so JWT claims refresh.

---

## 8. Routes and API Reference

### UI routes

- Exchange UI: `GET /admin/translations/exchange` (when exchange enabled)
- Queue UI: `GET /admin/content/translations` (when queue enabled)

### Exchange API routes

- `POST /admin/api/translations/export`
- `GET /admin/api/translations/template`
- `POST /admin/api/translations/import/validate`
- `POST /admin/api/translations/import/apply`

### Queue panel API base

- `GET /admin/api/translations`

### Command names

Queue command names:

- `translation.queue.claim`
- `translation.queue.assign`
- `translation.queue.release`
- `translation.queue.submit_review`
- `translation.queue.approve`
- `translation.queue.reject`
- `translation.queue.archive`
- `translation.queue.bulk_assign`
- `translation.queue.bulk_release`
- `translation.queue.bulk_priority`
- `translation.queue.bulk_archive`

Exchange message command names:

- `admin.translations.exchange.export`
- `admin.translations.exchange.import.validate`
- `admin.translations.exchange.import.apply`
- `admin.translations.exchange.import.run`

CLI command paths:

- `translations exchange export`
- `translations exchange import validate`
- `translations exchange import apply`
- `translations exchange import run`

---

## 9. Troubleshooting Common Confusion

### “I can see FR requested, but it still shows EN content”

You are in fallback mode (`missing_requested_locale=true`). Create FR first, then edit FR.

### “Save is disabled in edit page”

Expected in fallback mode. Server also enforces this with `TRANSLATION_FALLBACK_EDIT_BLOCKED`.

### “Create translation returns conflict”

That locale already exists in this translation group. API returns `TRANSLATION_EXISTS`.

### “Publish blocked even though locale rows exist”

Locale rows existing is not enough. Publish can still fail when required fields are missing in one or more locales.
Check blocker metadata (`missing_fields_by_locale`) and complete those fields in the affected locale records.

### “Exchange apply fails with create required”

Enable create intent (`allow_create_missing` / `create_translation`) when target locale record does not exist.

### “Unknown locale (for example de) fails in Add Translation action”

By default, action schema in this example app supports `en`, `es`, `fr` only.

---

## 10. Implementation Pointers (for maintainers)

Primary wiring in example app:

- `examples/web/main.go`
- `examples/web/setup/panels.go`
- `examples/web/translation_product_fixtures.go`

Core mechanics and guards:

- `admin/boot_bindings.go`
- `admin/translation_readiness.go`
- `quickstart/content_entry_routes.go`
- `pkg/client/templates/partials/translation-summary.html`
- `pkg/client/templates/resources/content/list.html`
- `pkg/client/templates/resources/content/form.html`
- `pkg/client/templates/resources/translations/exchange.html`

---

## 11. Datagrid Translation Integration

Content panels (Pages, Posts, etc.) render translation information directly in list views. This section explains how translation columns work in content datagrids.

### Translation Columns

Content panel builders expose these translation-related columns:

| Column | Helper | Description |
|--------|--------|-------------|
| `translation_status` | `renderTranslationStatusCell` / `renderTranslationMatrixCell` | Shows locale badge + available locales (switches to matrix view in matrix mode) |
| `translation_family_url` | `renderTranslationFamilyLink` | Link to family view with member count badge |
| `family_member_count` | `renderTranslationFamilyMemberCount` | Number of locales in the translation family |
| `translation_readiness` | `renderReadinessIndicator` | Canonical readiness state (ready/missing_locales/missing_fields) |
| `missing_translations` | `renderMissingTranslationsBadge` | Prominent badge showing missing required locales |
| `locale_completeness` | `renderLocaleCompleteness` | X/Y format showing available vs required locales |
| `translation_assignment_summary` | `renderTranslationAssignmentSummary` | Assignment status and priority |
| `translation_exchange_summary` | `renderTranslationExchangeSummary` | Exchange job status and pending count |

All renderers are imported from `datatable/index.js` and use canonical backend contracts.

### Family Navigation

Content rows support a server-authored "View Family" action:

```go
// In setup/panels.go
viewFamilyAction("admin.pages.view")  // Adds to page panel actions
viewFamilyAction("admin.posts.view")  // Adds to post panel actions
```

The action:
- Uses `translation_family_url` metadata from the row
- Navigates to `/admin/translations/family/{group_id}`
- Respects `_action_state` for permission/workflow gating
- Appears in row action menu with `git-branch` icon

### Quick Filters

Content lists use canonical predicates for translation filtering:

| Filter Key | Predicate | Description |
|------------|-----------|-------------|
| `missing_locales` | `readiness_state=missing_locales` | Records missing required locales |
| `missing_fields` | `readiness_state=missing_fields` | Records with incomplete fields |
| `incomplete` | `incomplete=true` | General incomplete filter |
| `fallback` | `fallback_used=true` | Records showing fallback content |

Quick filters are initialized via `createTranslationQuickFilters()` when `translation_ux_enabled=true` in datagrid config.

### View Modes

Content lists support three view modes:

- **Flat**: Standard row-per-record list
- **Grouped**: Records grouped by `translation_group_id` with family headers
- **Matrix**: Compact locale status indicators (●/◐/○) per required locale

View mode is controlled by datagrid config (`default_view_mode`) and user preference. The `translation_status` cell renderer automatically switches between `renderTranslationStatusCell` (flat/grouped) and `renderTranslationMatrixCell` (matrix).

### Backend Contract Fields

Panels must publish these fields for translation UX to work:

```go
// In panel builder ListFields()
admin.Field{Name: "translation_family_url", Label: "Family", Type: "text"},
admin.Field{Name: "family_member_count", Label: "Locales", Type: "number"},
admin.Field{Name: "translation_readiness", Label: "Readiness", Type: "text"},
admin.Field{Name: "missing_translations", Label: "Missing", Type: "text"},
admin.Field{Name: "translation_assignment_summary", Label: "Assignment", Type: "text"},
admin.Field{Name: "translation_exchange_summary", Label: "Exchange", Type: "text"},
```

The backend must also populate `translation_readiness` as a nested object with canonical fields:

```json
{
  "translation_readiness": {
    "readiness_state": "missing_locales",
    "required_locales": ["en", "es", "fr"],
    "available_locales": ["en"],
    "missing_required_locales": ["es", "fr"],
    "ready_for_transition": { "publish": false }
  }
}
```

See `admin/translation_readiness.go` for backend implementation.
