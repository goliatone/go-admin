# Routing ARD: Namespaced Host Routing, Public Site Fallback Ownership, and Theme Scope Isolation

## Status

Accepted

## Implementation Status

The routing/theme refactor defined here is implemented. The canonical execution
and signoff chain for rollout is:

1. `ROUTING_ARD.md`
2. `ROUTING_TSK.md`
3. `docs/ROUTING_RELEASE_CHECKLIST.md`

## Summary

`go-admin` already has a strong routing-ownership model for admin and API surfaces.
That model needs to be extended to the public site runtime and to theme resolution.

Today, downstream apps can still end up with:

- public site catch-all routes swallowing `/admin/*`
- site 404 pages rendering for system paths such as `/.well-known/*`
- site theme packages leaking into admin views because both surfaces share the same theme selector wiring

Those failures are structural. They happen because route ownership is still partly implicit and route correctness still depends on registration order in some host setups.

This proposal makes route ownership explicit for all major surfaces:

- system
- internal_ops
- admin UI
- admin API
- public API
- public site
- static assets

It also separates admin theme resolution from site theme resolution so a public site package cannot accidentally become the admin theme.

## Problem

The current `quickstart/site` registration flow installs a root content catch-all.
That works for simple examples, but it is unsafe in real host apps where the same router also carries:

- `/admin/*`
- `/admin/debug`
- `/admin/assets/*`
- `/api/*`
- `/.well-known/*`
- host-owned diagnostic endpoints such as `/healthz` and `/status`

When the site catch-all is installed on the same router without explicit exclusions, one of two bad outcomes appears:

1. The site runtime captures requests that belong to another surface.
2. Hosts work around the problem by reordering route registration.

The second option is not acceptable as a long-term model. Route correctness must not depend on whether one module was registered before another.

The same class of leakage exists in theme resolution. If a host attaches a single `go-theme` selector to the shared admin runtime, public site theme packages can become visible to admin views even when the product requirement is "site theme only on public routes".

## Goals

1. Make route ownership explicit for every host-facing surface.
2. Eliminate registration-order dependence for public-site catch-all behavior.
3. Ensure `/admin/*` and other reserved prefixes can never be claimed by the site runtime accidentally.
4. Make site fallback routing an explicit host policy.
5. Make admin theming and site theming independent by default.
6. Give downstream apps a simple, correct setup path.
7. Add startup-time validation so collisions fail fast.

## Non-Goals

1. Rewriting all router adapters.
2. Introducing compatibility shims that preserve ambiguous ownership forever.
3. Making site and admin share one universal theme abstraction.
4. Moving all host routes into `go-admin`. Hosts should still own absolute roots.

## Existing Direction

This proposal extends the same ownership direction already captured in:

- `docs/ADR_0002_API_ROUTE_NAMESPACE_OWNERSHIP.md`
- `docs/GUIDE_ROUTING.md`

That prior work made admin and API route ownership explicit.
This proposal applies the same rigor to:

- public site routing
- root-level fallback ownership
- theme resolution scope

## Decision

### 1. Add explicit route domains to the host contract

`go-admin` should expose first-class route domains:

- `system`
- `internal_ops`
- `admin_ui`
- `admin_api`
- `public_api`
- `public_site`
- `static`

These are ownership domains, not just labels for reporting.
Every route registered through quickstart or module helpers should declare which domain owns it.

This is a clean-break API change.
Existing `RegisterSiteRoutes(...)` callers should be updated to the explicit
fallback-policy model rather than preserved through legacy compatibility code.

### 2. Replace implicit site catch-all behavior with explicit public-site fallback policy

`quickstart/site` should stop unconditionally installing an unrestricted root catch-all on the shared router.

Instead, the host should choose one of these explicit modes:

1. `SiteFallbackModeDisabled`
2. `SiteFallbackModePublicContentOnly`
3. `SiteFallbackModeExplicitPathsOnly`

These modes must be exposed as exported constants so hosts do not need to remember
or type magic strings.

`SiteFallbackModePublicContentOnly` means:

- public site owns `/`
- public site owns configured explicit site routes such as `/search`
- public site may handle unmatched public content paths
- public site may not handle reserved prefixes

`SiteFallbackModeExplicitPathsOnly` means:

- public site only owns `/` when `AllowRoot` is true
- public site owns only configured explicit paths/prefixes
- no generic content fallback is installed

Fallback policy should be declarative and planner-visible.
Avoid callback matchers such as `func(path string) bool`, because they are hard to
validate deterministically, hard to serialize into manifests/reports, and easy to
make adapter-dependent by accident.

### 3. Add reserved-prefix and ops-path policy to the site runtime

The site runtime should accept a declarative fallback policy that states which
paths it may claim and which paths it must never claim.

Example API:

```go
quicksite.WithFallbackPolicy(quicksite.SiteFallbackPolicy{
    Mode: quicksite.SiteFallbackModePublicContentOnly,
    AllowRoot: true,
    AllowedMethods: []router.HTTPMethod{
        router.GET,
        router.HEAD,
    },
    AllowedExactPaths: []string{
        "/search",
    },
    ReservedPrefixes: []string{
        "/admin",
        "/api",
        "/.well-known",
        "/healthz",
        "/status",
    },
})
```

The default reserved set should include at least:

- `/admin`
- `/api`
- `/.well-known`
- `/static`
- `/assets`

Hosts can extend the set.
The actual strings must remain configurable through the app config/setup path
already used by hosts.

Configured internal ops paths must also be treated as reserved when enabled.
By default, quickstart should offer opt-in internal ops routes for:

- `/healthz`
- `/status`

Hosts must be able to override those paths through config.
Those paths should be derived through the same config and URL-builder pattern
used elsewhere in the app, not copied as ad hoc literals throughout host code.

The policy should also support:

- `AllowRoot`
- `AllowedMethods`
- `AllowedExactPaths`
- `AllowedPathPrefixes`

That gives hosts controlled flexibility without resorting to arbitrary callbacks.

### 4. Make public-site registration compose under a host-owned route namespace

Downstream apps should not call a helper that mutates the root router in a way that can shadow unrelated routes.

`go-admin` should support a structure closer to:

```go
host := quickstart.NewHostRouter(server.Router(), cfg)

host.System().Get("/.well-known/app-info", appInfoHandler)
host.InternalOps().Get("/healthz", healthzHandler)
host.InternalOps().Get("/status", statusHandler)
host.AdminUI()
host.AdminAPI()
host.PublicAPI()

quicksite.RegisterSiteRoutes(
    host.PublicSite(),
    adm,
    cfg,
    siteCfg,
    quicksite.WithFallbackPolicy(quicksite.SiteFallbackPolicy{
        Mode: quicksite.SiteFallbackModePublicContentOnly,
        AllowRoot: true,
        AllowedMethods: []router.HTTPMethod{
            router.GET,
            router.HEAD,
        },
        AllowedExactPaths: []string{
            "/search",
        },
        ReservedPrefixes: []string{
            "/admin",
            "/api",
            "/.well-known",
        },
    }),
)
```

This can be implemented as grouped routers, domain-aware wrappers, or planner-backed registrars.
The important part is that site fallback is no longer a root-router side effect.

### 5. Extend routing planner validation to public-site fallback ownership

The routing planner should validate:

- only one fallback owner exists for a given surface
- site fallback does not overlap reserved prefixes
- exact admin/system routes cannot be shadowed by public-site fallback
- static paths cannot be claimed by content fallback
- fallback only applies to allowed methods, defaulting to `GET` and `HEAD`
- explicit-path mode does not silently degrade into generic catch-all behavior
- route manifests include fallback ownership metadata

This should fail startup in every environment.

### 6. Separate admin theme scope from site theme scope

The admin runtime and site runtime must not share one implicit theme provider by default.

Introduce separate theme attachment points:

- `adm.WithAdminTheme(selector)`
- `quicksite.WithSiteTheme(selector)` or `SiteConfig.ThemeProvider`

Admin views should resolve only the admin theme unless the host explicitly opts into shared theme policy.
Site views should resolve only the site theme contract.

This avoids a public-site package being applied to admin UI accidentally.

### 7. Treat debug and system endpoints as non-site surfaces

Debug routes, diagnostics, health, and `.well-known` endpoints should be owned by non-site route domains.

The public site runtime should never render their 404 pages.

That means a request like:

- `/admin/debug`
- `/healthz`
- `/status`
- `/.well-known/appspecific/com.chrome.devtools.json`

must never resolve through site templates.

Quickstart should offer opt-in registration helpers for the internal ops
surface so hosts can enable health/status endpoints without hand-rolling them
on every app.

## Proposed API Surface

### Routing

Add host/domain-aware registration helpers:

```go
type HostRouter interface {
    System() router.Router[T]
    InternalOps() router.Router[T]
    AdminUI() router.Router[T]
    AdminAPI() router.Router[T]
    PublicAPI() router.Router[T]
    PublicSite() router.Router[T]
    Static() router.Router[T]
}
```

Add quickstart ops helpers/config:

```go
type OpsRoutesConfig struct {
    EnableHealthz bool
    EnableStatus  bool
    HealthzPath   string
    StatusPath    string
}

quickstart.WithOpsRoutes(cfg OpsRoutesConfig)
```

The default ops paths should be:

- `/healthz`
- `/status`

Those values must remain configurable through app config and URL-builder
helpers.

Add site-specific policy types and exported constants:

```go
type SiteFallbackMode string

const (
    SiteFallbackModeDisabled          SiteFallbackMode = "disabled"
    SiteFallbackModePublicContentOnly SiteFallbackMode = "public_content_only"
    SiteFallbackModeExplicitPathsOnly SiteFallbackMode = "explicit_paths_only"
)

type SiteFallbackPolicy struct {
    Mode                SiteFallbackMode
    AllowRoot           bool
    AllowedMethods      []router.HTTPMethod
    AllowedExactPaths   []string
    AllowedPathPrefixes []string
    ReservedPrefixes    []string
}

const (
    DefaultSiteFallbackMode = SiteFallbackModePublicContentOnly
)
```

Add options:

```go
quicksite.WithFallbackPolicy(policy)
quicksite.WithReservedPrefixes(prefixes...)   // convenience overlay on policy
quicksite.WithAllowedExactPaths(paths...)     // convenience overlay on policy
quicksite.WithAllowedPathPrefixes(prefixes...) // convenience overlay on policy
quicksite.WithAllowedFallbackMethods(methods...)
```

### Theme

Add separate theme providers:

```go
adm.WithAdminTheme(adminSelector)
quicksite.WithSiteTheme(siteSelector)
```

`adm.WithGoTheme(...)` should be removed as part of this refactor.
The migration path should be documented in the changelog and in the routing
upgrade notes.

If no explicit site selector is provided, site theme resolution should remain
disabled or local to the `SiteConfig` contract.
It should not inherit the admin theme provider accidentally.

## Downstream Refactor Shape

This proposal is intended to make downstream apps simpler and safer.

A downstream refactor such as `garchen-archive-admin` should become:

1. Register system routes on the system surface.
2. Register admin runtime and admin UI on the admin surfaces.
3. Register public APIs on the public API surface.
4. Register site runtime on the public-site surface with explicit fallback policy.
5. Attach site theme only to the public-site runtime.
6. Keep admin theme separate, or leave admin on default theme config.

The host should not need to manually rely on:

- route registration order
- ad hoc prefix guards in random handlers
- one shared theme hook for both admin and site

## Migration Plan

### Phase 1: Upstream routing contract

1. Add public-site fallback mode constants and declarative policy types/options.
2. Update `quickstart/site.RegisterSiteRoutes` to honor those policies.
3. Add `internal_ops` route ownership and quickstart ops-route helpers/config.
4. Extend routing planner/report/manifest to include site fallback ownership.
5. Add validation for reserved-prefix overlap.

### Phase 2: Upstream theme contract

1. Add separate admin and site theme provider APIs.
2. Remove `WithGoTheme(...)` and document the migration path.
3. Update quickstart examples to use distinct theme scopes.

### Phase 3: Downstream adoption

1. Refactor example and host apps to grouped/domain routing.
2. Update existing `RegisterSiteRoutes(...)` callers to the clean fallback API.
3. Remove order-dependent site route registration patterns.
4. Add regression tests for route ownership and theme isolation.

## Testing Requirements

Add upstream tests proving:

1. `/admin/*` never resolves through site fallback.
2. `/.well-known/*` never resolves through site fallback.
3. `/search` resolves through the site runtime when enabled.
4. unknown public content paths may resolve through site fallback when allowed.
5. unknown admin paths do not render site 404 pages.
6. `/healthz` and `/status` never resolve through site fallback when the ops
   surface is enabled.
7. site theme selection does not affect admin theme selection.
8. admin theme selection does not alter site bundle URLs.
9. route manifests capture fallback ownership deterministically.
10. `POST`/`PUT`/`DELETE` requests never resolve through site fallback unless the
   policy explicitly allows them.

Add adapter coverage for at least:

- Fiber
- HTTPRouter

The outcome must be consistent across adapters.

## Acceptance Criteria

This proposal is complete when all of the following are true:

1. Public-site fallback ownership is explicit and host-configurable.
2. Route correctness no longer depends on whether site routes were registered before or after admin routes.
3. Reserved prefixes cannot be claimed by site fallback.
4. Theme scope is separated so site theme packages do not leak into admin UI by default.
5. Routing planner/report surfaces expose enough ownership information to debug collisions and fallback behavior.
6. Example apps and at least one downstream host can adopt the new model without manual guard hacks.
7. Existing `RegisterSiteRoutes(...)` callers are updated to the clean fallback
   API without legacy compatibility code.
8. Quickstart exposes opt-in internal ops routes for `/healthz` and `/status`
   with configurable paths.
9. `WithGoTheme(...)` is removed and replaced by `WithAdminTheme(...)`.

## Rejected Alternatives

### 1. Fix by registration order only

Rejected because this is fragile, adapter-dependent, and easy to regress.

### 2. Keep one root catch-all and add more warnings

Rejected because warnings do not change ownership semantics.

### 3. Keep one shared theme provider for both admin and site

Rejected because product requirements often differ between admin and public site.
One shared provider creates accidental coupling.

### 4. Push all responsibility downstream

Rejected because this is a framework-level ergonomics and correctness issue.
`go-admin` should make the safe path the easy path.

## Implementation Notes

This proposal does not require abandoning the existing `admin/routing` model.
It should build on it.

The public-site runtime should become another first-class routing surface with:

- explicit owner
- explicit fallback policy
- explicit reserved-prefix exclusions
- explicit allowed methods and path scopes
- explicit manifest/report entries

That gives `go-admin` one coherent story:

- hosts own absolute roots
- modules and runtimes declare relative route intent
- fallback ownership is explicit
- startup validation is strict
- theme scope follows route scope
