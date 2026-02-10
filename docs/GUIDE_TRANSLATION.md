# Translation Queue Operations

This document covers queue lifecycle semantics, command contracts, permission
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
