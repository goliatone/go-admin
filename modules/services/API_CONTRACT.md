# go-admin Services API Contract (v1)

This document defines the backend contract exposed by `go-admin/modules/services` for frontend consumers.

Base path: `/admin/api/services`

## Error Envelope

Every non-2xx response uses:

```json
{
  "error": {
    "code": "validation_error",
    "message": "...",
    "details": {},
    "retryable": false,
    "request_id": "..."
  }
}
```

Canonical codes: `validation_error`, `forbidden`, `missing_resource`, `missing_permissions`, `provider_unavailable`, `conflict`, `internal_error`, `unauthorized`.

## Idempotency

- Mutating routes require `Idempotency-Key` when `api.require_idempotency_key=true`.
- Same key + same payload -> replay original status/body.
- Same key + different payload -> `409 conflict`.
- Provider-originated ingress routes (`/webhooks/*`, `/inbound/*`) use delivery/message claim stores and skip client idempotency keys.

## Permissions

- `admin.services.view`
- `admin.services.connect`
- `admin.services.edit`
- `admin.services.revoke`
- `admin.services.reconsent`
- `admin.services.activity.view`
- `admin.services.webhooks`

## List Envelope

List endpoints return endpoint-specific collections plus a shared envelope:

- `items`: normalized list payload
- `total`
- `limit`
- `offset`
- `page`
- `per_page`
- `has_more`
- `has_next`
- `next_offset`
- `filter_applied`

Endpoint-specific aliases are preserved (for example `connections`, `subscriptions`, `entries`).

## Route Contract Matrix

### Core list/read routes

| Method | Path | Permission | Request params | Response keys |
| --- | --- | --- | --- | --- |
| GET | `/providers` | `admin.services.view` | none | `providers`, list envelope |
| GET | `/activity` | `admin.services.activity.view` | `channel`, `channels`, `action`, `scope_type`, `scope_id`, `object_type`, `object_id`, `provider_id`, `status`, `since`, `until`, `q`, `limit/offset` or `page/per_page` | `entries`, `action_label_overrides`, list envelope |
| GET | `/status` | `admin.services.activity.view` | none | lifecycle/activity runtime status payload |
| GET | `/installations` | `admin.services.view` | `provider_id`, `scope_type`, `scope_id`, `status`, `page`, `per_page` | `installations`, list envelope |
| GET | `/connections` | `admin.services.view` | `provider_id`, `scope_type`, `scope_id`, `status`, `page`, `per_page` | `connections`, list envelope |
| GET | `/connections/:ref` | `admin.services.view` | `ref=connection_id` | `connection`, `credential_health`, `grants_summary`, `subscription_summary`, `sync_summary`, `rate_limit_summary` |
| GET | `/connections/:ref/grants` | `admin.services.view` | `ref=connection_id` | `snapshot` |
| GET | `/subscriptions` | `admin.services.view` | `provider_id`, `connection_id`, `status`, `page`, `per_page` | `subscriptions`, list envelope |
| GET | `/sync/:ref/status` | `admin.services.view` | `ref=connection_id` | `connection_id`, `sync_summary` |
| GET | `/rate-limits` | `admin.services.view` | `provider_id`, `scope_type`, `scope_id`, `bucket_key`, optional `connection_id|connection_ref|ref`, `page`, `per_page` | `rate_limits`, `summary`, list envelope |

### Mutating/API workflow routes

| Method | Path | Permission | Request body/query | Response keys |
| --- | --- | --- | --- | --- |
| POST | `/activity/retention/cleanup` | `admin.services.edit` | optional metadata | cleanup status payload |
| POST | `/installations/:ref/begin` | `admin.services.connect` | `scope_type`, `scope_id`, `redirect_uri`, `state`, `requested_grants`, `metadata` | `begin`, `installation` |
| POST | `/installations/:ref/uninstall` | `admin.services.revoke` | optional `reason` | `status`, `installation_id`, `revoked_connections` |
| POST | `/connections/:ref/begin` | `admin.services.connect` | `scope_type`, `scope_id`, `redirect_uri`, `state`, `requested_grants`, `metadata` | `begin` |
| GET | `/connections/:ref/callback` | `admin.services.connect` | query: `scope_type`, `scope_id`, `code`, `state`, `redirect_uri`, metadata passthrough | `completion` |
| POST | `/connections/:ref/reconsent/begin` | `admin.services.reconsent` | `redirect_uri`, `state`, `requested_grants`, `metadata` | `begin` |
| POST | `/connections/:ref/refresh` | `admin.services.edit` | optional `provider_id`, `metadata` | queued payload (`202`) or `refresh` result (`200`) |
| POST | `/connections/:ref/revoke` | `admin.services.revoke` | optional `reason` | `status`, `connection_id` |
| POST | `/capabilities/:provider/:capability/invoke` | `admin.services.edit` | `scope_type`, `scope_id`, optional `connection_id`, `payload` | `result` |
| POST | `/subscriptions/:ref/renew` | `admin.services.edit` | optional `metadata` | queued payload (`202`) or `subscription` (`200`) |
| POST | `/subscriptions/:ref/cancel` | `admin.services.edit` | optional `reason` | `status`, `subscription_id` |
| POST | `/sync/:ref/run` | `admin.services.edit` | required: `provider_id`, `resource_type`, `resource_id`; optional `metadata` | queued payload (`202`) or `job` (`200`) |

### Provider ingress routes

| Method | Path | Permission | Request requirements | Response keys |
| --- | --- | --- | --- | --- |
| POST | `/webhooks/:provider` | `admin.services.webhooks` | provider signature/delivery headers + payload | `result` |
| POST | `/inbound/:provider/:surface` | `admin.services.webhooks` | provider signature/message headers + payload | `result` |

## Read Model Highlights

### `GET /connections/:ref`

- `credential_health`: `has_active_credential`, `expires_at`, `last_refresh_at`, `next_refresh_attempt_at`, `last_error`, `refreshable`
- `grants_summary`: `snapshot_found`, `version`, `captured_at`, `requested_grants`, `granted_grants`, `required_grants`, `missing_grants`
- `subscription_summary`: totals + `subscriptions[]` (includes `channel_id`, `expires_at`, `last_notified_at`, status)
- `sync_summary`: cursor/job operational state (`cursor_count`, `last_cursor`, `last_synced_at`, `last_sync_error`, `cursors[]`, `last_job`)
- `rate_limit_summary`: quota view (`bucket_count`, `total_limit`, `total_remaining`, `next_reset_at`, `max_retry_after`, `retry_after_trend`, `buckets`)

### `GET /rate-limits`

- Returns filtered rate-limit bucket rows plus aggregate summary for page payload.
- Supports resolving scope filters from `connection_id`.

## Parameter Convention

- `:ref` is the canonical route token for entity references (connection/subscription/installation).
- Provider-specific routes use `:provider` and ingress uses `:surface` for inbound type.
