# Activity API Guide

This guide documents the Activity read API, query parameters, pagination contract, access policy behavior, and quickstart wiring for the activity feed + UI.

## Endpoint and permissions

`GET /admin/api/activity` (registered by `Admin.Boot` under `Config.BasePath`)

- Requires actor context (go-auth middleware). Missing actor returns 401.
- Requires `admin.activity.view` (configurable via `Config.ActivityPermission`).
- Requires an Activity feed query or repository; otherwise the API returns a feature-disabled error (404 + `FEATURE_DISABLED`).

## Query parameters

- `user_id`: UUID filter for the subject user.
- `actor_id`: UUID filter for the actor.
- `verb`: activity verb; repeatable and accepts comma-separated values.
- `object_type`: activity object type.
- `object_id`: activity object identifier.
- `channel`: single channel filter (mutually exclusive with `channels`).
- `channels`: channel allow list; repeatable and accepts comma-separated values.
- `channel_denylist`: channel deny list; repeatable and accepts comma-separated values.
- `since`: RFC3339/RFC3339Nano lower bound for `occurred_at`.
- `until`: RFC3339/RFC3339Nano upper bound for `occurred_at`.
- `q`: keyword search string.
- `limit`: page size. Default `50`, max `200` (clamped).
- `offset`: start offset. Default `0` (negative values return 400).

Validation rules:
- `channel` and `channels` cannot be used together.
- Invalid timestamp formats return 400.
- Invalid UUID formats return 400.

## Response shape

```json
{
  "entries": [
    {
      "id": "uuid",
      "actor": "uuid-or-string",
      "action": "verb",
      "object": "type:id",
      "channel": "users",
      "metadata": {
        "ip": "0.0.0.0"
      },
      "created_at": "2026-01-14T10:30:00Z"
    }
  ],
  "total": 123,
  "next_offset": 50,
  "has_more": true
}
```

Notes:
- `action` maps to go-users `verb`.
- `object` joins `object_type` and `object_id` as `type:id`.
- `actor` uses `actor_id` when present (falls back to `user_id`).
- `created_at` maps to go-users `occurred_at`.

## Pagination and ordering

- Entries are ordered by the underlying activity query (go-users defaults to `OccurredAt`/`created_at` descending).
- `next_offset` and `has_more` are returned by the Activity feed query implementation.

## Policy behavior

When go-admin builds the feed query from a repository, it applies the go-users `ActivityAccessPolicy`:
- Scopes results using the actor context (tenant/org/user).
- Non-admin roles only see their own activity.
- Machine/system activity is hidden for non-superadmins when policy options disable it.
- Metadata is sanitized via go-masker (IP redaction by default).
- Channel allow/deny lists are enforced.

If you supply a custom `ActivityFeedQuery`/`ActivityService`, you must apply policy + sanitization yourself.

## Read vs write paths

- **Write path:** `ActivitySink.Record(...)` writes activity entries. go-admin uses this sink for internal actions (users, settings, jobs, notifications, CMS, debug REPL, dashboard layout, etc.). The dashboard “Recent Activity” widget reads from `ActivitySink.List(...)`.
- **Read path:** `/admin/api/activity` uses `ActivityFeedQuery` or an `ActivityRepository` to return paginated results.

## Wiring (go-users repository + policy)

Reads are backed by `ActivityFeedQuery`/`ActivityService` or `types.ActivityRepository` plus a policy. Writes still go through `ActivitySink`.

```go
import (
    "github.com/goliatone/go-admin/pkg/admin"
    "github.com/goliatone/go-admin/quickstart"
    usersactivity "github.com/goliatone/go-users/activity"
)

adminDeps := admin.Dependencies{
    // Read path: supply a query/service or a repository + policy.
    ActivityRepository:   usersDeps.ActivityRepo,
    ActivityAccessPolicy: usersactivity.NewDefaultAccessPolicy(),
}

adm, _, err := quickstart.NewAdmin(cfg, hooks, quickstart.WithAdminDependencies(adminDeps))
```

If you already have an `ActivityFeedQuery` or `ActivityService`, provide that instead of the repository.

## Quickstart activity wiring (sink + UI)

Quickstart can swap the default in-memory activity sink for a go-users-backed sink behind `USE_GO_USERS_ACTIVITY=true` (or `WithAdapterFlags`). This only affects the write path; you still need a feed query or repository for the read API.

```go
hooks := quickstart.AdapterHooks{
    GoUsersActivity: func() admin.ActivitySink {
        // Build a go-users logger/lister and adapt to go-admin.
        return admin.NewActivitySinkAdapter(logger, lister)
    },
}

deps := admin.Dependencies{
    ActivityRepository:   usersDeps.ActivityRepo,
    ActivityAccessPolicy: usersactivity.NewDefaultAccessPolicy(),
}

adm, result, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithAdminDependencies(deps),
    quickstart.WithAdapterFlags(quickstart.AdapterFlags{UseGoUsersActivity: true}),
)
_ = result
```

To expose the activity UI page, use quickstart UI routes (enabled by default) and make sure `Admin.Boot` has been called to register the API route:

```go
if err := quickstart.RegisterAdminUIRoutes(router, cfg, adm, authn); err != nil {
    return err
}
// Default UI route: {basePath}/activity with activity_api_path in the view context.
```

Note: the UI route is wrapped by your auth middleware but does not enforce `admin.activity.view`; the API does. Missing permissions results in 403 responses and an empty UI.

## Activity module UI integration

The Activity module is registered by default and contributes:
- A navigation item for `{basePath}/activity` gated by `Config.ActivityPermission`.
- A “User Activity” tab on user detail pages that links to the activity page with `user_id` populated.

If you disable module loading or override modules, ensure `NewActivityModule()` is registered if you want these UI integrations.

## Permissions and roles

Ensure the active role has `admin.activity.view`. The Activity API enforces this permission even if the UI renders. If roles are seeded, include it in the role permissions and reissue tokens after updates.

## Migration notes (breaking change)

Legacy query params are removed and not bridged:
- `actor` -> `actor_id`
- `action` -> `verb`
- `object` -> `object_type` + `object_id`
- `channel` remains `channel` (or `channels` for multi)

Clients must update requests and parse the paginated response shape (`entries`, `total`, `next_offset`, `has_more`).
