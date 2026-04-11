# Routing Policy Guide

This is the canonical routing contract for `go-admin` hosts, built-in modules,
and external modules. It covers route ownership, public-site fallback policy,
grouped host routing, theme-scope isolation, and the release-time diagnostics
required for rollout.

## Source of truth

Use these artifacts in this order:

1. `admin/routing/*` and `quickstart/site/*` for the runtime contract.
2. `docs/GUIDE_ROUTING.md` for the published module-author and operator policy.
3. `ROUTING_ARD.md` for the accepted design and migration rationale.
4. `ROUTING_TSK.md` for the execution ledger across all routing/theme phases.
5. `docs/ROUTING_RELEASE_CHECKLIST.md` for final release signoff and
   verification commands.

The canonical execution and signoff chain for this feature is:

1. `ROUTING_ARD.md`
2. `ROUTING_TSK.md`
3. `docs/ROUTING_RELEASE_CHECKLIST.md`

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
5. Public-site fallback is a host policy, not an implicit side effect of
   `RegisterSiteRoutes(...)`.

Default host roots preserve the existing topology:

- Admin UI root: `/admin`
- Admin API root: `/admin/api`
- Public API root: `/api/v1`

Hosts can override those roots through `admin.Config.Routing.Roots` or
`quickstart.WithRoutingConfig(...)`, but modules still resolve beneath the
effective host-owned roots.

### Route domains

Routing ownership is tracked with explicit domains:

- `system`
- `internal_ops`
- `admin_ui`
- `admin_api`
- `public_api`
- `public_site`
- `static`

Every host-owned or module-owned route should resolve to one of those domains in
the startup report and manifest. Route ownership must not depend on whether site
routes were registered before or after admin routes.

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

- Modules do not get a public API mount unless they declare `PublicAPIRoutes`.
- Hosts should treat public API exposure as a deliberate product choice, not a
  side effect of enabling a module.
- When public API exposure is needed, the default mount still remains
  host-owned: `<public_api_root>/<slug>`.

## Public-site ownership contract

`quickstart/site` no longer owns the root router implicitly. Hosts must choose
an explicit public-site fallback policy and register site routes under the
public-site surface.

Supported fallback modes:

1. `quicksite.SiteFallbackModeDisabled`
2. `quicksite.SiteFallbackModePublicContentOnly`
3. `quicksite.SiteFallbackModeExplicitPathsOnly`

The policy shape is:

```go
quicksite.SiteFallbackPolicy{
	Mode:                quicksite.SiteFallbackModePublicContentOnly,
	AllowRoot:           true,
	AllowedMethods:      []router.HTTPMethod{router.GET, router.HEAD},
	AllowedExactPaths:   []string{"/search"},
	AllowedPathPrefixes: []string{"/teachings"},
	ReservedPrefixes:    []string{"/admin", "/api", "/.well-known", "/static", "/assets"},
}
```

Default behavior:

- `DefaultSiteFallbackMode` is `SiteFallbackModePublicContentOnly`.
- `AllowRoot` defaults to `true`.
- Allowed fallback methods default to `GET` and `HEAD`.
- Reserved prefixes default to `/admin`, `/api`, `/.well-known`, `/static`,
  and `/assets`.
- Enabled internal-ops paths such as `/healthz` and `/status` are added to the
  reserved set automatically when hosts provide them through
  `quicksite.SiteConfig.InternalOps`.

Operational rules:

1. Site fallback must never claim reserved prefixes.
2. Site fallback must never handle unsafe methods unless the policy explicitly
   allows them.
3. `SiteFallbackModeExplicitPathsOnly` must not degrade into a generic catch-all.
4. Callback-style matchers are not part of the supported contract.
5. Startup validation and manifest/report output must stay deterministic.

## Grouped host routing

Hosts should register root-level surfaces through `quickstart.NewHostRouter(...)`
instead of mutating the shared router opportunistically.

```go
host := quickstart.NewHostRouter(server.Router(), cfg)

host.System().Get("/.well-known/app-info", appInfoHandler)

_, err := quickstart.RegisterInternalOpsRoutes(
	host.InternalOps(),
	quickstart.InternalOpsConfig{
		EnableHealthz: true,
		EnableStatus:  true,
	},
)
if err != nil {
	return err
}

quicksite.RegisterSiteRoutes(
	host.PublicSite(),
	adm,
	cfg,
	siteCfg,
	quicksite.WithFallbackPolicy(quicksite.SiteFallbackPolicy{
		Mode:      quicksite.SiteFallbackModePublicContentOnly,
		AllowRoot: true,
	}),
)
```

Operationally:

- `host.System()` owns system routes such as `/.well-known/*`.
- `host.InternalOps()` owns `/healthz` and `/status` when enabled.
- `host.AdminUI()` and `host.AdminAPI()` own admin browser and API roots.
- `host.PublicAPI()` owns public API routes.
- `host.PublicSite()` owns public HTML/site delivery.
- `host.Static()` owns static asset prefixes.

Do not rely on route registration order to keep site fallback from swallowing
admin, API, or system paths.

## Theme scope isolation

Admin and public-site theme resolution are intentionally separate.

Use:

```go
adm.WithAdminTheme(adminSelector)
quicksite.WithSiteTheme(siteSelector)
```

or attach the site selector through `SiteConfig.ThemeProvider`.

Rules:

1. `WithGoTheme(...)` is removed.
2. Admin theme selection applies to dashboard, CMS, forms, and admin UI only.
3. Site theme selection applies to public-site templates and bundles only.
4. Site themes do not leak into `/admin/*` unless the host explicitly chooses a
   shared selector.

## Startup diagnostics and release workflow

The release posture for the routing refactor is fixed:

1. Production, staging, development, and tests all use strict fail-fast routing
   validation.
2. Missing module route contracts are fatal for mounted modules.
3. Relaxed router adapter options do not bypass `admin/routing` preflight.
4. Manifest review is mandatory for route-shape changes.
5. Public-site fallback policy must appear in the startup report/manifest with
   mode, methods, allowed paths, and reserved prefixes.

Recommended checks for route-changing work:

- confirm effective roots
- confirm resolved UI/API/public API/public-site ownership
- confirm there are no routing conflicts or ownership violations
- confirm fallback mode, allowed methods, and reserved prefixes in the report
- review manifest diffs for renamed route keys, moved paths, or new public API
  exposure

## Migration guide

### Legacy shared-root site fallback to grouped host routing

When migrating a host from the old shared-router catch-all behavior:

1. Replace direct root-router site registration with
   `quickstart.NewHostRouter(...)`.
2. Register system, internal ops, admin UI, admin API, public API, public site,
   and static assets on the corresponding grouped surfaces.
3. Replace callback matchers or magic fallback mode strings with
   `quicksite.SiteFallbackPolicy` and the exported mode constants.
4. Remove handler-level prefix guards for `/admin`, `/api`, `/.well-known`,
   `/static`, and `/assets`; reserved-prefix enforcement now belongs in the
   grouped router surfaces plus the fallback policy.
5. Move `/healthz` and `/status` to `host.InternalOps()` via
   `quickstart.RegisterInternalOpsRoutes(...)`.

There is no legacy compatibility bridge for ambiguous site catch-all ownership.
Update `RegisterSiteRoutes(...)` callers directly.

### Shared `WithGoTheme(...)` to explicit admin/site theme providers

When migrating old shared theme wiring:

1. Replace `adm.WithGoTheme(selector)` with `adm.WithAdminTheme(selector)`.
2. Attach the public-site selector separately with `quicksite.WithSiteTheme(...)`
   or `SiteConfig.ThemeProvider`.
3. Keep site-theme bundle mounting and site template overrides scoped to the
   public-site runtime.
4. Re-run admin/site theme isolation QA after the cutover.

There is no deprecation bridge for `WithGoTheme(...)`; the clean-break API is
`WithAdminTheme(...)`.

### Recommended QA after migration

- `GET /search` renders with the site theme surface.
- An allowed unknown public content path resolves through site fallback.
- `GET /admin/missing` returns the admin 404 behavior rather than a site page.
- `GET /.well-known/app-info` stays on the system surface.
- `GET /healthz` and `GET /status` stay on the internal-ops surface when
  enabled.
- Admin pages and site pages resolve independent theme bundles by default.

## JSON report endpoint scope

A stable HTTP JSON routing report endpoint is deferred.

For this release, the supported surfaces are the in-process `RoutingReport()`,
the manifest from `RoutingPlanner()`, startup logs, and quickstart doctor
output. Hosts that need an HTTP endpoint can build one on top of those APIs
without treating that endpoint shape as part of the public `go-admin` contract.

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
