# Translation Operations Guide

This document covers translation exchange, queue lifecycle semantics, command contracts, permission scope, route keys, quickstart opt-in behavior, and operations guidance.

---

## Translation Exchange

Translation Exchange enables bulk export/import of translatable content fields via CSV/JSON files. This supports external translation workflows (agencies, machine translation, localization platforms).

### Exchange Schema

Exchange rows use the following canonical schema:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resource` | string | ✓ | Content type (e.g., `pages`, `posts`) |
| `entity_id` | string | ✓ | Source entity identifier |
| `translation_group_id` | string | ✓ | Group ID linking source + translations |
| `target_locale` | string | ✓ | Destination locale code |
| `field_path` | string | ✓ | Field being translated (e.g., `title`, `body`) |
| `source_text` | string | export | Original text (export only) |
| `source_hash` | string | validate | Hash for staleness detection |
| `translated_text` | string | apply | Translated content |
| `status` | string | - | Ignored; forced to `draft` on apply |

### Command Names

- `translations.exchange.export` - Export translatable fields to exchange rows
- `translations.exchange.import.validate` - Validate import rows without writing
- `translations.exchange.import.apply` - Apply validated translations
- `translations.exchange.import.run` - Combined validate + apply
- `jobs.translations.exchange.import.run` - Cron/job trigger for scheduled imports

### Safety Rules

1. **Source hash validation**: Import validates `source_hash` against current content hash. Stale rows return `TRANSLATION_EXCHANGE_STALE_SOURCE_HASH` conflict.

2. **Linkage resolution**: Each row must resolve to an existing translation group. Missing linkage returns `TRANSLATION_EXCHANGE_MISSING_LINKAGE` conflict.

3. **Draft workflow enforcement**: All applied translations are forced to `draft` status, regardless of input `status` field. Publish requires separate workflow transition.

4. **Explicit create intent**: Missing target entity requires `create_translation=true` in apply input. Without explicit intent, returns `TRANSLATION_EXCHANGE_INVALID_PAYLOAD` error.

5. **Duplicate row detection**: Multiple rows targeting same `(resource, entity_id, translation_group_id, target_locale, field_path)` return conflict for duplicates.

6. **Continue-on-error semantics**: Set `continue_on_error=false` to abort on first row error. Default (`true`) processes all rows and aggregates results.

7. **Dry run support**: Set `dry_run=true` to simulate apply without persisting changes.

### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/api/translations/export` | Export rows matching filter |
| GET | `/admin/api/translations/template` | Download CSV template |
| POST | `/admin/api/translations/import/validate` | Validate CSV/JSON import |
| POST | `/admin/api/translations/import/apply` | Apply validated translations |

Content-Type support:
- `application/json` - JSON payload with `rows` array
- `multipart/form-data` - CSV file upload

### CLI/Job Triggers

Exchange commands expose `CLIOptions()` for CLI execution:

```
translations export --resources pages,posts --target-locales es,fr
translations import validate --file translations.csv
translations import apply --file translations.csv --create-translation
translations import run --file translations.csv --continue-on-error
```

Scheduled imports use `TranslationImportRunTriggerCommand`:

```go
trigger := &admin.TranslationImportRunTriggerCommand{
    Schedule: "@daily",
    BuildInput: func(ctx context.Context, input admin.TranslationImportRunTriggerInput) (admin.TranslationImportRunInput, error) {
        // Load rows from external source
        return admin.TranslationImportRunInput{...}, nil
    },
}
```

### Quickstart Opt-in

Feature key: `translations.exchange` (default `false`).

Enable with:

```go
adm, _, err := quickstart.NewAdmin(
    cfg,
    quickstart.AdapterHooks{},
    quickstart.WithTranslationExchangeConfig(quickstart.TranslationExchangeConfig{
        Enabled: true,
        // Optional: permission wiring
        PermissionRegister: permissionRegistrar,
    }),
)
```

Wiring performed by quickstart:
1. Registers exchange command handlers + message factories
2. Registers HTTP routes under `/admin/api/translations/*`
3. Optionally registers exchange permissions when `PermissionRegister` is provided

### Permission Matrix

Exchange permissions use `admin.translations.*`:
- `admin.translations.export` - Export rows
- `admin.translations.import` - Validate and apply imports
- `admin.translations.manage` - Full exchange access

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `TRANSLATION_EXCHANGE_STALE_SOURCE_HASH` | 409 | Source content changed since export |
| `TRANSLATION_EXCHANGE_MISSING_LINKAGE` | 409 | Translation group not resolvable |
| `TRANSLATION_EXCHANGE_INVALID_PAYLOAD` | 400 | Row validation failed |
| `TRANSLATION_EXCHANGE_UNSUPPORTED_FORMAT` | 400 | Unsupported file format |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `SERVICE_UNAVAILABLE` | 503 | Exchange service not configured |

---

## Translation Queue Operations

This section covers queue lifecycle semantics, command contracts, permission
scope, route keys, quickstart opt-in behavior, and basic operations guidance.

## State Machine

Assignments model translation coordination for one target locale.

Statuses:
- `pending`
- `assigned`
- `in_progress`
- `review`
- `rejected`
- `approved`
- `published`
- `archived`

Normative transitions:
1. `pending -> assigned`
2. `pending (open_pool) -> in_progress` (claim)
3. `assigned -> in_progress`
4. `in_progress -> review`
5. `review -> approved`
6. `review -> rejected`
7. `rejected -> in_progress`
8. `approved -> published` (publish linkage)
9. Any non-terminal state -> `archived`

Terminal statuses: `published`, `archived`.

## Command Names

Single-item commands:
- `translation.queue.claim`
- `translation.queue.assign`
- `translation.queue.release`
- `translation.queue.submit_review`
- `translation.queue.approve`
- `translation.queue.reject`
- `translation.queue.archive`

Bulk commands:
- `translation.queue.bulk_assign`
- `translation.queue.bulk_release`
- `translation.queue.bulk_priority`
- `translation.queue.bulk_archive`

All commands are wired through typed `Commander[T]` handlers and registered with:
- `admin.RegisterTranslationQueueCommands(...)`
- `admin.RegisterMessageFactory(...)` (via queue command factory registration)

## Permission Matrix

Queue permissions use `admin.translations.*`:
- `admin.translations.view`
- `admin.translations.edit`
- `admin.translations.manage`
- `admin.translations.assign`
- `admin.translations.approve`
- `admin.translations.claim`

Typical action mapping:
- `claim`: `admin.translations.claim`
- `assign` / `release`: `admin.translations.assign`
- `submit_review`: `admin.translations.edit`
- `approve` / `reject`: `admin.translations.approve`
- `archive` / bulk lifecycle management: `admin.translations.manage`

## URL Route Keys

Resolver group: `admin`

Route keys:
- `translations.queue` -> queue panel list route

Semantic queue links (query variants):
- All queue: `translations.queue`
- My queue: `translations.queue?assignee_id={user_id}`
- Open pool: `translations.queue?assignment_type=open_pool&status=pending`
- Review: `translations.queue?status=review`
- Overdue: `translations.queue?overdue=true`

Use resolver keys and URL manager output instead of hardcoded admin paths.

## Quickstart Opt-in

Quickstart queue feature key: `translations.queue` (default `false`).

Enable with:
- `quickstart.WithTranslationQueueConfig(quickstart.TranslationQueueConfig{Enabled: true, ...})`

Wiring performed by quickstart:
1. Registers queue panel and content tabs (`pages`, `posts`).
2. Registers queue command handlers + message factories.
3. Optionally registers queue permissions when `PermissionRegister` is provided.

Locale alignment rule:
1. If `supported_locales` is empty, locales derive from active translation policy requirements.
2. If `supported_locales` is explicitly set and policy locales are available, sets must match exactly; mismatch fails startup.

## Operational Playbook

### Conflict handling

`TRANSLATION_QUEUE_CONFLICT`:
- Cause: active uniqueness key collision (`translation_group_id + entity_type + source_locale + target_locale`).
- Action: reuse active assignment, or archive terminally obsolete assignment before creating a replacement.

`TRANSLATION_QUEUE_VERSION_CONFLICT`:
- Cause: optimistic lock mismatch (stale `expected_version`).
- Action: refetch assignment, reconcile changes, retry with current version.

### Overdue management

1. Filter queue by `overdue=true`.
2. Prioritize by `priority` and reviewer/translator load.
3. Reassign or release stale `assigned`/`in_progress` items.
4. Archive obsolete non-terminal items tied to canceled content work.
5. Monitor dashboard counts (`active`, `review`, `overdue`) for daily triage.

---

## Example Productized Profile Runbook

Use this runbook with `examples/web` to verify translation product wiring end-to-end.

### Environment matrix

| Profile | Exchange expected | Queue expected |
|---------|-------------------|----------------|
| `none` | disabled | disabled |
| `core` | disabled | disabled |
| `core+exchange` | enabled | disabled |
| `core+queue` | disabled | enabled |
| `full` | enabled | enabled |

Optional explicit overrides:
- `ADMIN_TRANSLATION_EXCHANGE=true|false`
- `ADMIN_TRANSLATION_QUEUE=true|false`

Override precedence:
1. `ADMIN_TRANSLATION_PROFILE` baseline
2. explicit module overrides (`ADMIN_TRANSLATION_EXCHANGE`, `ADMIN_TRANSLATION_QUEUE`)

### Startup verification

Run the example with the target profile:

```bash
cd examples/web
ADMIN_TRANSLATION_PROFILE=full go run .
```

Validate startup event `translation.capabilities.startup`:
- `profile` matches intended profile
- module flags under `modules` match intended enablement
- route map includes enabled module routes only
- resolver keys include `admin.translations.exchange` and/or queue keys when enabled

### Route verification

Enabled-module checks:
- Exchange UI route: `GET /admin/translations/exchange`
- Exchange API route: `POST /admin/api/translations/export`
- Queue API panel route: `GET /admin/api/translations`

Disabled-module checks:
- exchange-disabled profiles must not expose `/admin/translations/exchange` or `/admin/api/translations/*`
- queue-disabled profiles must not expose `/admin/api/translations` queue panel routes

### Capability payload verification

Confirm backend capability metadata and UI gating remain aligned:
1. Backend: `quickstart.TranslationCapabilities(adm)` returns module flags and routes consistent with runtime route registration.
2. UI/template context: `translation_capabilities` matches backend metadata so disabled modules do not leak navigation entrypoints.
