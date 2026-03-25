# Routing Policy Guide

This is the canonical routing contract for `go-admin` hosts, built-in modules,
and external modules. It complements `admin/routing`, the operational incident
history in `REPORT_ROUTES.md`, and the rollout/acceptance details in
`ROUTING_TDD.md`.

## Source of truth

Use these artifacts in this order:

1. `admin/routing/*` for the actual contract and runtime behavior.
2. `GUIDE_ROUTING.md` for the published module-author and operator policy.
3. `ROUTING_RELEASE_CHECKLIST.md` for release-readiness gates and verification commands.
4. `REPORT_ROUTES.md` for incidents, guardrails, and operational notes.

The canonical diagnostics surfaces are in-process, not HTTP:

- `adm.RoutingReport()` returns the current `routing.StartupReport`.
- `adm.RoutingPlanner().Manifest()` returns the deterministic route manifest.
- `routing.DiffManifests(before, after)` is the supported manifest diff helper.
- quickstart doctor output includes the same routing report under
  `quickstart.routing`.

## Browser route contract

For cookie-backed admin HTML routes, keep browser protection package-managed and
consistent:

1. Prefer the shared browser protection path instead of a parallel custom CSRF
   wrapper.
2. Preserve the shared shell contract: `csrf_meta` in layouts, `csrf_field` in
   browser forms, and `X-CSRF-Token` on unsafe same-origin JavaScript writes.
3. Treat regressions in CSRF header emission, origin enforcement, or session-key
   resolution as package-contract issues first, not example-local patches.

## Host-owned routing model

The routing model is intentionally opinionated:

1. Hosts own absolute roots.
2. Modules declare relative route templates.
3. Startup validation is strict and fail-fast in every environment.
4. Manifest diffs are a release-review tool, not a compatibility fallback.

Default host roots preserve the existing topology:

- Admin UI root: `/admin`
- Admin API root: `/admin/api`
- Public API root: `/api/v1`

Hosts can override those roots through `admin.Config.Routing.Roots` or
`quickstart.WithRoutingConfig(...)`, but modules still resolve beneath the
effective host-owned roots.

## External module contract

Mounted modules must implement both `admin.Module` and
`admin.RouteContractProvider`.

```go
type PartnerToolsModule struct{}

func (*PartnerToolsModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: "partner.tools"}
}

func (*PartnerToolsModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug: "partner_tools",
		UIRoutes: map[string]string{
			"partner_tools.index": "/",
		},
		APIRoutes: map[string]string{
			"partner_tools.ping": "/ping",
		},
	}
}

func (*PartnerToolsModule) Register(ctx admin.ModuleContext) error {
	ctx.Router.Get(
		ctx.Routing.RoutePath(routing.SurfaceUI, "partner_tools.index"),
		handler,
	)
	ctx.ProtectedRouter.Get(
		ctx.Routing.RoutePath(routing.SurfaceAPI, "partner_tools.ping"),
		apiHandler,
	)
	return nil
}
```

### Required contract rules

1. Declare a unique slug.
   Slugs must match `^[a-z][a-z0-9_-]{1,62}$`.
2. Do not use reserved slugs.
   Reserved values are `admin`, `api`, `public`, `debug`, `health`, `rpc`,
   `static`, and `assets`.
3. Keep route tables relative.
   Use route templates such as `/`, `/queue`, or `/jobs/:id`.
   Do not hardcode `/admin/...`, `/api/...`, or other host bases in the module
   contract.
4. Keep route ownership explicit.
   Module route keys must use the `<slug>.` prefix and route names must use the
   module route-name prefix.
5. Treat absolute mount bases as host-owned.
   Host policy belongs in `admin.Config.Routing.Modules[slug].Mount` or
   `quickstart.WithRoutingConfig(...)`, not in reusable external modules.
6. Do not claim reserved roots directly.
   Module mounts must remain under the effective admin, admin API, or public
   API roots.
7. Expect collisions to fail startup.
   Method/path conflicts, route-name conflicts, slug violations, and ownership
   violations are release blockers.
8. Preserve quickstart canonical-route precedence where applicable.
   In quickstart content-entry HTML routing, concrete canonical routes must be
   registered before generic `/content/:name/*` handlers so routes like
   `/admin/content/documents/new` resolve to the intended browser owner.

## Surface defaults

Surface exposure is explicit per route table:

- `UIRoutes` mount by default at `<admin_root>/<slug>`.
- `APIRoutes` mount by default at `<api_root>/<slug>`.
- `PublicAPIRoutes` mount by default at `<public_api_root>/<slug>`.

The public API surface is opt-in.

- Modules do not get a public API mount unless they declare
  `PublicAPIRoutes`.
- Hosts should treat public API exposure as a deliberate product choice, not a
  side effect of enabling a module.
- When public API exposure is needed, the default mount still remains
  host-owned: `<public_api_root>/<slug>`.

## Startup and release policy

The release posture for the routing refactor is fixed:

1. Production, staging, development, and tests all use strict fail-fast routing
   validation.
2. Missing module route contracts are fatal for mounted modules.
3. Relaxed router adapter options do not bypass `admin/routing` preflight.
4. Manifest review is mandatory for route-shape changes.

This means hosts should treat startup routing failures as configuration or
contract defects that must be fixed before rollout, not as warnings to ignore.

## Diagnostics and manifest workflow

The canonical rollout workflow is:

1. Boot the admin and inspect `adm.RoutingReport()`.
2. Capture `adm.RoutingPlanner().Manifest()` in tests or fixture-based release
   checks.
3. Use `routing.DiffManifests(...)` to classify added, removed, and changed
   entries.
4. Include the manifest diff summary in code review when routes change.

Recommended checks for route-changing work:

- confirm effective roots
- confirm resolved UI/API/public API mounts
- confirm there are no routing conflicts or ownership violations
- review manifest diffs for renamed route keys, moved paths, or new public API
  exposure

## JSON report endpoint scope

A stable HTTP JSON routing report endpoint is deferred.

For the first release of the clean-break routing API, the supported surfaces are
the in-process `RoutingReport()`, the manifest from `RoutingPlanner()`, startup
logs, and quickstart doctor output. Hosts that need an HTTP endpoint can build
one on top of those APIs without treating that endpoint shape as part of the
public `go-admin` contract yet.

## CI and PR review guidance

Route changes should be visible in pull requests. The minimum workflow is:

1. Add or update a test that boots the relevant admin configuration.
2. Capture the current routing manifest in the test.
3. Diff it against the checked-in expected manifest or asserted route set.
4. Summarize the diff in the PR when routes moved, were added, or were removed.

Practical guidance:

- Use `adm.RoutingPlanner().Manifest()` in integration or example-app tests.
- Use `routing.DiffManifests(...)` to keep review output deterministic.
- Keep route-manifest fixtures close to the owning package or example app.
- Treat new public API entries as a higher bar change that needs explicit review.

If a PR changes routing and no manifest-oriented assertion changed, that should
be treated as a review smell.
