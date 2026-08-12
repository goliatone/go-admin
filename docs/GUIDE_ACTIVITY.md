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
      "actor": "Owner User",
      "actor_href": "/admin/users/actor-uuid",
      "action": "Captured customer consent",
      "action_key": "customer.consent.capture",
      "object": "type:id",
      "object_href": "/admin/customers/object-uuid",
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

- `action` contains the presentation label when read enrichment provides one;
  `action_key` retains the canonical go-users verb.
- `object` joins `object_type` and `object_id` as `type:id`.
- `actor` uses `actor_id` when present (falls back to `user_id`).
- `actor_href` and `object_href` are optional host-resolved local navigation
  targets. They are omitted when navigation is not configured or not allowed.
- `created_at` maps to go-users `occurred_at`.

## Pagination and ordering

- Entries are ordered by the underlying activity query (go-users defaults to `OccurredAt`/`created_at` descending).
- `next_offset` and `has_more` are returned by the Activity feed query implementation.

## Policy behavior

When go-admin builds the feed query from a repository, it applies the go-users `ActivityAccessPolicy`:

- Scopes results using the actor context (tenant/org/user).
- Non-admin roles only see their own activity.
- Machine/system activity is hidden for non-superadmins when policy options disable it.
- Metadata is sanitized via go-masker (IP redaction by default). The default policy masks `actor_email` and `session_id`.
- Channel allow/deny lists are enforced.

If you supply a custom `ActivityFeedQuery`/`ActivityService`, you must apply policy + sanitization yourself.

## Read vs write paths

- **Write path:** `ActivitySink.Record(...)` writes activity entries. go-admin uses this sink for internal actions (users, settings, jobs, notifications, CMS, debug REPL, dashboard layout, etc.). The dashboard “Recent Activity” widget reads from `ActivitySink.List(...)`.
- **Read path:** `/admin/api/activity` uses `ActivityFeedQuery` or an `ActivityRepository` to return paginated results.

## Write time enrichment (go-users + go-admin)

go-admin can enrich activity records before they are persisted by wiring an enricher into the write path. The wrapper always attaches `session_id` (when available) and can optionally enrich actor/object display fields.

Dependencies wiring (default mode is `wrapper`):

```go
deps := admin.Dependencies{
    ActivityEnricher:               admin.NewAdminActivityEnricher(admin.AdminActivityEnricherConfig{ /* resolvers */ }),
    ActivityEnrichmentErrorHandler: usersactivity.DefaultEnrichmentErrorHandler(usersactivity.EnrichmentBestEffort),
    ActivityEnrichmentWriteMode:    usersactivity.EnrichmentWriteModeWrapper, // or Hybrid
    ActivitySessionIDProvider:      usersactivity.SessionIDProviderFunc(func(ctx context.Context) (string, bool) { return "", false }), // optional override
    ActivitySessionIDKey:           "session_id", // optional override
}
```

Notes:

- `EnrichmentWriteModeWrapper` enriches before persistence; `EnrichmentWriteModeHybrid` also enriches via wrapper while allowing a repository hook to run later.
- `ActivityEnrichmentErrorHandler` controls fail-fast vs best-effort behavior; best-effort keeps partial enrichment and still writes the record.
- `ActivitySessionIDKey` overrides the metadata key for session IDs (default is `session_id`).
- If no enricher is provided in wrapper mode, go-admin builds an admin-specific enricher using its user/profile/object sources.

## Session ID extraction order

When the default session ID provider is used, go-admin extracts `session_id` in this order:

1. JWT `jti` (claims ID).
2. `claims.Metadata["session_id"]` (if the claims implement metadata access).
3. `auth.ActorContext.Metadata["session_id"]` (from the request context).

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

## Read-time navigation links

Activity labels can link to host-owned detail pages by supplying an optional
`ActivityNavigationResolver`. The resolver runs only after Activity permission
checks, trusted-scope validation, the feed query, access-policy sanitization,
and optional page enrichment. It receives the canonical record and the trusted
request context through a detached copy; stored metadata is not URL authority.
The API returns links through `ActivityReadEntry`, while the write-side
`ActivityEntry` remains free of presentation fields.

This example matches an application with user detail routes at
`/admin/users/:id` and custom customer detail routes at
`/admin/customers/:id`:

```go
import (
    "context"
    "log/slog"
    "net/url"
    "strings"

    "github.com/goliatone/go-admin/pkg/admin"
    usersactivity "github.com/goliatone/go-users/activity"
    usertypes "github.com/goliatone/go-users/pkg/types"
    "github.com/google/uuid"
)

adminBase := strings.TrimRight(cfg.BasePath, "/")
systemActorIDs := map[uuid.UUID]struct{}{
    // Populate from the host's compiled scheduler/job actor catalog.
}
navigation := admin.ActivityNavigationResolverFunc(func(
    _ context.Context,
    _ admin.ActivityReadContext,
    records []usertypes.ActivityRecord,
) ([]admin.ActivityNavigation, error) {
    out := make([]admin.ActivityNavigation, len(records))

    // Resolve the viewer's destination permissions once for the complete page,
    // then apply them while projecting each record. This example's system
    // actor catalog prevents machine identities from linking to Users.
    for index, record := range records {
        actorID := record.ActorID
        if actorID == uuid.Nil {
            actorID = record.UserID
        }
        _, systemActor := systemActorIDs[actorID]
        actorType, _ := record.Data[usersactivity.DataKeyActorType].(string)
        if actorID != uuid.Nil && !systemActor && strings.EqualFold(actorType, "user") {
            out[index].ActorHref = adminBase + "/users/" + url.PathEscape(actorID.String())
        }

        deleted, objectResolved := record.Data[usersactivity.DataKeyObjectDeleted].(bool)
        if objectResolved && !deleted && strings.EqualFold(strings.TrimSpace(record.ObjectType), "customer") {
            if objectID, err := uuid.Parse(strings.TrimSpace(record.ObjectID)); err == nil && objectID != uuid.Nil {
                out[index].ObjectHref = adminBase + "/customers/" + url.PathEscape(objectID.String())
            }
        }
    }
    return out, nil
})

adminDeps := admin.Dependencies{
    ActivityRepository:         usersDeps.ActivityRepo,
    ActivityAccessPolicy:       usersactivity.NewDefaultAccessPolicy(),
    ActivityPageEnricher:       pageEnricher,
    ActivityNavigationResolver: navigation,
    ActivityNavigationErrorHandler: func(
        ctx context.Context,
        readCtx admin.ActivityReadContext,
        err admin.ActivityNavigationError,
    ) {
        slog.Default().WarnContext(ctx, "activity navigation failed",
            "activity_id", err.ActivityID,
            "target", err.Target,
            "error", err.Err,
        )
    },
}
```

Resolver guidance:

- Build final paths through the host's route registry when available; do not
  assume every object type is a generic panel slug.
- Return only local absolute paths beginning with `/`. go-admin rejects
  schemes, hosts, protocol-relative references, relative paths, backslashes,
  and control characters.
- Return no href for system actors, unsupported object kinds, deleted targets,
  unavailable modules, or denied destination permissions.
- Keep resolution a cheap route/policy projection. Entity lookup and label
  caching belong in the page enricher, not the navigation resolver. Resolve
  request-level permission state once and preserve record order in the result.
- Destination routes must enforce authorization, scope, feature availability,
  and existence again when the link is followed.
- Resolution and unsafe-href errors are reported through the dedicated
  `ActivityNavigationErrorHandler`; the entry remains visible as plain text.
  `ActivityReadErrorHandler` remains reserved for page enrichment and scope
  integrity failures.

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
