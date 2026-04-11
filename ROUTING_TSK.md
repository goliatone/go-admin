# Routing Ownership and Theme Scope - Implementation Plan

Execution plan for the public-site ownership, fallback-policy, host-routing,
and theme-scope refactor defined in `ROUTING_ARD.md`.

`slices -> phases -> tasks -> grouped by BE/FE`

Rules enforced in this plan:

- Phase IDs are global, monotonically increasing, and unique across the
  document.
- Task IDs are unique within a phase and use `Task X.Y`, where `X` is the
  phase ID.
- Within each phase, backend tasks come first and frontend/example-host tasks
  follow.
- A phase is complete only when its contract tests, adapter coverage,
  diagnostics/report updates, and example-host verification are in place for
  the touched surface.


Status note:

- This file is the canonical implementation-status ledger for the work defined
  in `ROUTING_ARD.md`.
- `docs/ROUTING_TSK.md` remains the historical execution plan for the already
  landed `admin/routing` foundation. Do not create a second active checkbox set
  there for this feature.
- Operational release signoff should be reflected in
  `docs/ROUTING_RELEASE_CHECKLIST.md`; completed code tasks in this file do not,
  by themselves, mean rollout approval is complete.

## Source-of-Truth Documents

1. `ROUTING_ARD.md`
2. `docs/GUIDE_ROUTING.md`
3. `docs/ROUTING_TDD.md` for the existing `admin/routing` baseline that this
   feature extends.
4. `docs/ROUTING_RELEASE_CHECKLIST.md`
5. `docs/ROUTING_TSK.md` only as historical reference for completed routing
   foundation phases.

## Delivery Order And Dependency Rules

Core route-ownership critical path:

1. Phase 1 -> Phase 2 -> Phase 3 -> Phase 5 -> Phase 6 -> Phase 7 -> Phase 8

Parallel branch:

1. Phase 4 depends on Phase 1 and can run while Phase 3 or Phase 5 is in
   progress.
2. Phase 6 depends on both Phase 4 and Phase 5.

Execution rules:

- Backend contract and validation tasks in a phase must land before
  frontend/example-host tasks in the same phase are considered unblocked.
- Do not start example-host migration before the routing planner, fallback
  policy, and diagnostics contracts are stable.
- Keep the feature deployable behind explicit configuration with one usable
  `examples/web` path for each completed slice.
- The last task in every phase must update `examples/web/main.go` so the newly
  completed slice is exercised in the demo for live QA.
- Preserve the already-landed `admin/routing` module boundary; extend it rather
  than introducing parallel routing registries.
- Avoid callback-driven fallback semantics. Policy must remain declarative,
  planner-visible, and serializable into manifests/reports.
- Deliver the improved site fallback design from `ROUTING_ARD.md` completely:
  declarative `SiteFallbackPolicy`, exported mode constants, reserved-prefix
  enforcement, allowed-method enforcement, grouped host routing, planner/report
  visibility, and admin/site theme isolation.
- Treat this as a clean-break refactor for `RegisterSiteRoutes(...)` callers:
  update callers rather than carrying legacy bridge code.

## Slice Order

1. Slice 0 - Foundation and Contract Baseline
2. Slice 1 - Public Site Ownership and Fallback Enforcement
3. Slice 2 - Theme Scope Isolation
4. Slice 3 - Host Adoption, Verification, and Release Hardening

This ordering reflects the dependency chain in `ROUTING_ARD.md`: explicit
fallback policy and ownership validation must be stable before grouped host
routing and theme isolation are rolled through examples and downstream hosts.

## Acceptance Mapping

This plan is complete only when the repo satisfies all ADR-level outcomes:

1. Public-site fallback ownership is explicit and host-configurable.
2. Route correctness no longer depends on whether site routes were registered
   before or after admin routes.
3. Reserved prefixes cannot be claimed by site fallback.
4. Theme scope is separated so site theme packages do not leak into admin UI by
   default.
5. Routing planner/report surfaces expose enough ownership information to debug
   collisions and fallback behavior.
6. Example apps and at least one downstream-style host can adopt the new model
   without manual guard hacks.
7. The improved site fallback API is declarative and exposed through typed
   constants instead of magic strings or callback matchers.
8. Quickstart exposes opt-in internal ops routes for `/healthz` and `/status`
   with configurable paths derived from app config/URL-builder helpers.
9. `WithGoTheme(...)` is removed and replaced by `WithAdminTheme(...)`, with a
   documented migration path.

---

## Slice 0. Foundation And Contract Baseline

**Depends on**: existing `admin/routing` foundation is already landed.

**Outcome**: the repo has canonical fallback-policy types, route-domain
vocabulary, default reserved-prefix rules, and stable upgrade decisions before
runtime behavior changes.

### Phase 1. Public-Site Ownership Contract And Baseline Decisions

**Depends on**: none.

**Why**: later routing, planner, and theme work all need one canonical contract
for route domains, fallback modes, allowed methods, reserved prefixes, and
upgrade posture.

**BE**

- [x] Task 1.1 - Add first-class route-domain vocabulary for `system`,
  `internal_ops`, `admin_ui`, `admin_api`, `public_api`, `public_site`, and
  `static` in the routing/report/manifest layer, without regressing existing
  `ui`/`api`/`public_api` semantics.
- [x] Task 1.2 - Define the declarative site fallback contract in
  `quickstart/site`: `SiteFallbackMode`, `SiteFallbackPolicy`,
  `DefaultSiteFallbackMode`, and the exported mode constants
  `SiteFallbackModeDisabled`,
  `SiteFallbackModePublicContentOnly`, and
  `SiteFallbackModeExplicitPathsOnly` so hosts do not need magic strings.
- [x] Task 1.3 - Implement policy normalization helpers covering default mode,
  default reserved prefixes (`/admin`, `/api`, `/.well-known`, `/static`,
  `/assets`), default allowed methods (`GET`, `HEAD`), path normalization,
  duplicate elimination, and deterministic ordering for report/manifest output.
- [x] Task 1.4 - Decide and document the supported improved policy shape:
  `Mode`, `AllowRoot`, `AllowedMethods`, `AllowedExactPaths`,
  `AllowedPathPrefixes`, and `ReservedPrefixes`, and explicitly reject
  callback-style fallback matchers from the supported contract.
- [x] Task 1.5 - Decide and document the release-time default for existing
  `RegisterSiteRoutes(...)` callers, including whether the default remains
  compatibility-preserving for one release or moves immediately to the safe
  policy with reserved prefixes.
- [x] Task 1.6 - Lock the clean-break rollout decision: existing
  `RegisterSiteRoutes(...)` callers will be updated to the explicit policy API
  instead of preserved through legacy compatibility code.
- [x] Task 1.7 - Define internal ops route config and defaults for quickstart:
  opt-in `/healthz` and `/status`, configurable path strings, and derivation
  through existing app config plus URL-builder helpers instead of hardcoded
  literals.
- [x] Task 1.8 - Add unit tests for fallback-mode constants, policy-field
  normalization, convenience-overlay normalization, reserved-prefix defaults,
  allowed-method defaults, and path-list
  determinism.
- [x] Task 1.9 - Add test helpers/fixtures that model host-owned routes,
  reserved prefixes, explicit site paths, allowed methods, and
  adapter-specific catch-all,
  internal ops paths, and opt-in health/status registration expectations.
- [x] Task 1.10 - Audit quickstart/admin/example config paths so reserved
  prefixes and ops routes can use the existing app config and URL-builder
  pattern instead of scattered string literals.
- [x] Task 1.11 - Audit example/test call sites for stringly-typed or implicit
  fallback semantics and replace them with typed policy/config helpers so the
  migration path is explicit from the start.

**FE**

- [x] Task 1.12 - Add example-host config scaffolding in `examples/web` so the
  demo can select explicit fallback policy and separate host-owned routes
  without hidden defaults.
- [x] Task 1.13 - Add example-host config scaffolding for opt-in internal ops
  routes (`/healthz`, `/status`) using the app config/URL-builder pattern.
- [x] Task 1.14 - Update any example/test configuration that would otherwise
  rely on magic strings for fallback modes so example wiring uses the exported
  mode constants.
- [x] Task 1.15 - Update `examples/web/main.go` as the final phase-integration
  step so the baseline contract compiles through the demo and becomes the
  canonical reference wiring.

**Exit Criteria**

- Public-site ownership vocabulary and the improved declarative site fallback
  policy are stable and test-backed.
- The repo has one documented answer for default mode, default reserved
  prefixes, allowed fallback methods, and the exported constants hosts should
  use instead of magic strings.
- Internal ops defaults and configuration hooks for `/healthz` and `/status`
  are defined before runtime refactors start.

**Quick QA UI Expectation**

- No visible behavior change is required yet, but the example app should build
  with explicit typed fallback-policy configuration rather than relying on
  implicit site catch-all behavior.

---

## Slice 1. Public Site Ownership And Fallback Enforcement

**Depends on**: Slice 0 complete.

**Outcome**: `quickstart/site` stops behaving like an unrestricted peer on the
shared router and becomes an explicit owner of public-site routes and fallback
policy.

### Phase 2. Guarded Site Registration And Declarative Fallback Behavior

**Depends on**: Phase 1.

**Why**: the main runtime defect today is that `quickstart/site` always mounts
`/` plus a catch-all. That must be replaced before planner/report work has
meaningful ownership metadata to expose.

**BE**

- [x] Task 2.1 - Extend `quickstart/site` options to accept a normalized
  `SiteFallbackPolicy` plus convenience overlays such as
  `WithReservedPrefixes(...)`, `WithAllowedExactPaths(...)`,
  `WithAllowedPathPrefixes(...)`, and `WithAllowedFallbackMethods(...)`, while
  ensuring typed mode constants are the only supported mode selectors.
- [x] Task 2.2 - Refactor `quickstart/site` registration flow so explicit site
  routes and fallback registration are separate concerns; `/`, `/search`, site
  API routes, and module routes must not depend on generic catch-all
  registration.
- [x] Task 2.3 - Replace unconditional catch-all registration in
  `quickstart/site/register_runtime_flow.go` with policy-aware registration
  supporting:
  `SiteFallbackModeDisabled`,
  `SiteFallbackModePublicContentOnly`, and
  `SiteFallbackModeExplicitPathsOnly`, including support for `AllowRoot`,
  `AllowedExactPaths`, and `AllowedPathPrefixes`.
- [x] Task 2.4 - Enforce reserved-prefix and allowed-method checks in the site
  runtime before content fallback can claim a request. Default fallback must
  use the ADR reserved-prefix baseline and never handle `POST`, `PUT`, `PATCH`,
  or `DELETE`.
- [x] Task 2.5 - Preserve adapter parity by implementing policy-aware fallback
  registration for both Fiber and HTTPRouter without relying on route order to
  hide invalid ownership.
- [x] Task 2.6 - Remove or reject any callback-style fallback API such as a
  public path matcher callback so planner-visible declarative policy is the
  only supported path.
- [x] Task 2.7 - Add runtime/integration tests proving:
  `/admin/*`, `/api/*`, `/.well-known/*`, `/assets/*`, and `/static/*` never
  resolve through site fallback, while root `/`, `/search`, and allowed public
  content paths still work under valid policies.
- [x] Task 2.8 - Add regression tests for `SiteFallbackModeExplicitPathsOnly`
  so it never degrades into generic catch-all behavior and never claims
  unspecified paths by accident.
- [x] Task 2.9 - Implement quickstart internal ops route helpers/config so
  health/status endpoints can be enabled explicitly, use configurable path
  strings, and are always treated as non-site-owned when enabled.

**FE**

- [x] Task 2.10 - Update `examples/web` site/runtime wiring to use explicit
  fallback-policy configuration and add QA-facing example routes that prove
  explicit site routes still render while reserved prefixes remain host-owned.
- [x] Task 2.11 - Add example-app tests covering root page, search page,
  public-content fallback success, and reserved-prefix rejection behavior.
- [x] Task 2.12 - Add example-app coverage for opt-in `/healthz` and `/status`
  routes proving they bypass site templates and remain host-owned.
- [x] Task 2.13 - Update `examples/web/main.go` as the final phase-integration
  step so the guarded site-registration flow is live in the demo for QA.

**Exit Criteria**

- `quickstart/site` no longer installs an unrestricted root catch-all by
  default.
- Public-site fallback is explicit, declarative, method-scoped, and adapter
  consistent.
- Opt-in health/status routes are available through quickstart without ad hoc
  per-host wiring.

**Quick QA UI Expectation**

- Public site pages such as `/` and `/search` should still render normally, but
  requests under `/admin`, `/api`, `/.well-known`, `/assets`, and `/static`
  should no longer fall into site templates or site 404 pages.
- When internal ops routes are enabled, `/healthz` and `/status` should also
  bypass site templates completely.

### Phase 3. Planner, Manifest, Report, And Startup Validation Extension

**Depends on**: Phase 2.

**Why**: once the runtime behavior is explicit, the planner/report layer must
capture that ownership so collisions fail fast and operators can debug routing
state deterministically.

**BE**

- [x] Task 3.1 - Extend `admin/routing` config, manifest, and startup-report
  structures to represent `public_site`, `system`, `internal_ops`, and
  `static` ownership, including fallback ownership metadata.
- [x] Task 3.2 - Add planner/validator support for public-site fallback
  registration, including:
  one fallback owner per surface, reserved-prefix overlap checks, static/system
  exclusions, and exact-route shadowing protection.
- [x] Task 3.3 - Serialize fallback-policy metadata into manifests/reports:
  mode, reserved prefixes, allowed methods, `AllowRoot`, explicit paths,
  explicit path prefixes, and fallback owner.
- [x] Task 3.4 - Update startup diagnostics and logging so routing reports
  explain effective fallback policy, fallback owner, and reserved-prefix
  enforcement decisions.
- [x] Task 3.5 - Add deterministic manifest/report tests and snapshot fixtures
  covering no-fallback, public-content-only, and explicit-paths-only hosts.
- [x] Task 3.6 - Add integration tests proving startup fails when site fallback
  overlaps reserved prefixes or attempts to shadow host/system/static/admin
  routes.

**FE**

- [x] Task 3.7 - Surface routing-report visibility in the example host so QA
  can inspect fallback metadata through logs, doctor output, or equivalent demo
  diagnostics.
- [x] Task 3.8 - Update example verification fixtures/assertions to include
  fallback ownership and reserved-prefix metadata from the startup report.
- [x] Task 3.9 - Update `examples/web/main.go` as the final phase-integration
  step so the demo exposes the new planner/report semantics.

**Exit Criteria**

- Planner/report/manifest surfaces expose enough information to debug public
  site ownership and collisions.
- Invalid public-site ownership fails at startup rather than relying on route
  order or runtime fallthrough.
- Diagnostics can also explain internal ops ownership for configured
  health/status routes.

**Quick QA UI Expectation**

- Operators should be able to boot the example app and see, in diagnostics,
  which surface owns public-site fallback, which prefixes are reserved, and why
  reserved or invalid paths do not route through site templates.

---

## Slice 2. Theme Scope Isolation

**Depends on**: Slice 0 complete.

**Outcome**: admin and public-site theme selection become independent by
default, with explicit opt-in if a host wants shared behavior.

### Phase 4. Separate Admin And Site Theme Contracts

**Depends on**: Phase 1.

**Why**: current theme wiring intentionally shares one provider across
dashboard, CMS, forms, and site rendering. The ARD requires route-scope-aware
theme resolution instead of accidental coupling.

**BE**

- [x] Task 4.1 - Introduce explicit admin theme attachment APIs
  (`adm.WithAdminTheme(...)` or equivalent) while preserving a clear migration
  path from the removed `adm.WithGoTheme(...)`.
- [x] Task 4.2 - Introduce explicit site theme attachment APIs in
  `quickstart/site`, such as `quicksite.WithSiteTheme(...)` or a
  `SiteConfig.ThemeProvider`, distinct from the admin runtime theme provider.
- [x] Task 4.3 - Refactor site request-theme resolution so site templates no
  longer depend on `adm.ThemePayload(...)` as the default resolution path for
  public-site requests.
- [x] Task 4.4 - Preserve admin theme behavior for dashboard widgets, forms,
  and admin views while keeping site theme bundle URLs, assets, and partials
  isolated from admin defaults unless the host explicitly opts into sharing.
- [x] Task 4.5 - Add tests proving:
  site theme selection does not affect admin theme selection,
  admin theme selection does not affect site bundle URLs,
  request-level site theme overrides stay scoped to site routes.
- [x] Task 4.6 - Add compatibility tests for hosts that intentionally choose a
  shared admin/site theme policy so the opt-in path is explicit and stable.
- [x] Task 4.7 - Remove `adm.WithGoTheme(...)` and update admin-side theme
  wiring, tests, and call sites to use `adm.WithAdminTheme(...)`.

**FE**

- [x] Task 4.8 - Update `examples/web` theme wiring to use distinct admin and
  site providers/selectors, including separate asset-prefix and site-theme
  package registration paths.
- [x] Task 4.9 - Update example handlers/templates/tests so admin pages continue
  to render the admin theme while public pages render the site theme package.
- [x] Task 4.10 - Update `examples/web/main.go` as the final phase-integration
  step so the split theme pipelines are the canonical example wiring.

**Exit Criteria**

- Theme scope follows route scope by default.
- Site theme packages no longer leak into admin UI unless the host explicitly
  requests shared behavior.
- `WithGoTheme(...)` no longer exists in the public admin API.

**Quick QA UI Expectation**

- Admin pages should keep the admin look-and-feel even when the public site is
  using a separate site theme package, and public site requests should continue
  to render site-specific bundles/assets.

---

## Slice 3. Host Adoption, Verification, And Release Hardening

**Depends on**: Slices 1 and 2 complete.

**Outcome**: host apps register routes through explicit surfaces, examples and
downstream-style hosts adopt the model, and the repo carries the diagnostics,
tests, and docs needed for a safe release.

### Phase 5. Host Router And Domain-Aware Registration Surfaces

**Depends on**: Phase 2 and Phase 3.

**Why**: the routing model becomes structurally enforceable when host-owned
routes, admin routes, public APIs, site routes, and static/system routes are
registered through explicit grouped surfaces instead of a flat shared router.

**BE**

- [x] Task 5.1 - Introduce a host/domain-aware router helper in quickstart
  (`NewHostRouter(...)` or equivalent) exposing grouped surfaces for `System`,
  `InternalOps`, `AdminUI`, `AdminAPI`, `PublicAPI`, `PublicSite`, and
  `Static`.
- [x] Task 5.2 - Refactor quickstart/admin/example boot paths so host-owned
  endpoints such as `/.well-known/*`, internal ops routes such as `/healthz`
  and `/status`, admin debug routes, and static asset routes register on
  explicit surfaces rather than relying on shared-root mutation.
- [x] Task 5.3 - Ensure `RegisterSiteRoutes(...)` composes under the
  `PublicSite()` surface and never mutates unrelated host-owned route domains.
- [x] Task 5.4 - Add registration-order-independence tests proving the same
  effective ownership is produced whether system/admin/site registration occurs
  earlier or later in the boot sequence.
- [x] Task 5.5 - Add adapter/integration tests covering grouped-router behavior
  and ownership invariants across Fiber and HTTPRouter.

**FE**

- [x] Task 5.6 - Migrate `examples/web` boot wiring to use the grouped host
  router abstraction and expose canonical host-owned routes for QA.
- [x] Task 5.7 - Update example-app tests to assert admin/debug/system/static
  routes stay outside site-template handling regardless of registration order.
- [x] Task 5.8 - Update example-app tests to assert `InternalOps()` routes for
  `/healthz` and `/status` stay outside site-template handling regardless of
  registration order.
- [x] Task 5.9 - Update `examples/web/main.go` as the final phase-integration
  step so grouped host routing is the demo default.

**Exit Criteria**

- Host-owned routes are structurally separated from public-site fallback.
- Route correctness no longer depends on site/admin registration order.
- Internal ops routes have a dedicated structural home rather than being mixed
  into generic site or admin registration.

**Quick QA UI Expectation**

- The example app should still serve admin UI, admin APIs, public APIs,
  system routes, and static routes, but those surfaces should be isolated
  enough that site 404 pages never appear for non-site requests.

### Phase 6. Example And Downstream-Style Adoption

**Depends on**: Phase 4 and Phase 5.

**Why**: the feature is not done until at least one real host shape can adopt it
without ad hoc prefix guards or shared-theme hacks.

**BE**

- [x] Task 6.1 - Refactor `examples/web` and at least one downstream-style test
  harness to use explicit public-site fallback policy, grouped host routing, and
  separate admin/site theme wiring.
- [x] Task 6.2 - Remove order-dependent site-route registration patterns and
  random handler-level prefix guards from migrated hosts.
- [x] Task 6.3 - Publish migration helpers or upgrade notes covering old
  `quickstart/site` registration assumptions, callback/magic-string fallback
  usage, shared-theme usage, grouped host-router adoption, and the
  `WithGoTheme(...)` to `WithAdminTheme(...)` migration.
- [x] Task 6.4 - Add regression tests for host-owned diagnostics endpoints,
  admin 404 behavior, site 404 behavior, search route ownership, and public
  content fallback after migration.

**FE**

- [x] Task 6.5 - Update example templates, handlers, and QA flows so:
  unknown public content routes use site fallback when allowed,
  unknown admin routes use admin 404 behavior,
  `/.well-known/*` and similar endpoints bypass site templates entirely.
- [x] Task 6.6 - Add end-to-end example coverage for the routed surfaces and
  separate theme outputs after migration.
- [x] Task 6.7 - Update `examples/web/main.go` as the final phase-integration
  step so the migrated example host reflects the final intended product shape.

**Exit Criteria**

- The example app and one downstream-style host can adopt the feature without
  relying on registration order or shared theme provider hacks.
- Public-site fallback and theme scope are both verifiably correct in a real
  host shape.

**Quick QA UI Expectation**

- QA should be able to click through admin pages, public site pages, search,
  health/debug endpoints, and a `.well-known` path and see that each request is
  handled by the intended surface with the intended theme/404 behavior.

### Phase 7. Verification Matrix, Adapter Audit, And Release Readiness

**Depends on**: Phase 6.

**Why**: this feature changes ownership semantics across startup, runtime
registration, diagnostics, and theming, so release readiness requires a full
matrix rather than isolated unit tests.

**BE**

- [x] Task 7.1 - Complete the unit/integration matrix from `ROUTING_ARD.md`:
  reserved-prefix blocking, allowed-method enforcement, explicit-path mode,
  manifest determinism, startup failures, theme isolation, and registration
  order independence.
- [x] Task 7.2 - Add explicit Fiber and HTTPRouter adapter coverage proving
  equivalent behavior for fallback policy, grouped registration, and runtime
  ownership.
- [x] Task 7.3 - Add release-audit tests and snapshots for routing reports and
  manifests that now include fallback ownership metadata.
- [x] Task 7.4 - Add startup-budget/performance checks showing fallback-policy
  validation and report generation stay within acceptable local-dev and CI
  bounds.
- [x] Task 7.5 - Update `docs/ROUTING_RELEASE_CHECKLIST.md` with the new
  feature gates, verification commands, and operator signoff items.

**FE**

- [x] Task 7.6 - Add end-to-end example-host coverage for:
  `/admin/debug` not resolving through site templates,
  `/healthz` not resolving through site templates,
  `/status` not resolving through site templates,
  `/.well-known/*` not resolving through site templates,
  `/search` resolving through site templates,
  unknown public paths resolving through site fallback when allowed,
  unknown admin paths not rendering site 404 pages.
- [x] Task 7.7 - Add UI/theme isolation tests covering admin pages versus site
  pages under different theme selections.
- [x] Task 7.8 - Update `examples/web/main.go` as the final phase-integration
  step so the demo remains the canonical release-ready reference wiring.

**Exit Criteria**

- All ADR acceptance criteria are covered by automated tests or explicit release
  checklist items.
- Adapter parity, manifest/report determinism, and theme isolation are
  release-ready.

**Quick QA UI Expectation**

- QA should be able to run the example app and verify all route ownership and
  theme isolation scenarios without needing to infer hidden routing rules.

### Phase 8. Docs, Operator Guidance, And Final Rollout Signoff

**Depends on**: Phase 7.

**Why**: the feature changes how hosts reason about public-site routing,
reserved prefixes, and theme scoping, so module authors and operators need a
published clean-break contract and migration path.

**BE**

- [x] Task 8.1 - Update `docs/GUIDE_ROUTING.md` so the published routing
  contract includes public-site ownership, reserved prefixes, fallback modes,
  grouped host routing, and startup diagnostics.
- [x] Task 8.2 - Publish migration guidance from legacy shared-root site
  catch-all wiring to declarative `SiteFallbackPolicy`, exported mode
  constants, and grouped host-router registration.
- [x] Task 8.3 - Publish migration guidance from shared `WithGoTheme(...)`
  behavior to explicit admin and site theme providers/selectors, and document
  the `WithAdminTheme(...)` replacement in the changelog.
- [x] Task 8.4 - Update release notes and operator docs so the final upgrade
  posture, default fallback mode, and deprecation policy are explicit before
  rollout.
- [x] Task 8.5 - Mark this plan, `ROUTING_ARD.md`, and
  `docs/ROUTING_RELEASE_CHECKLIST.md` as the canonical execution and signoff
  chain for the feature.

**FE**

- [x] Task 8.6 - Update `examples/web/README.md` and any in-demo comments so
  the example host documents the final grouped routing and split-theme setup for
  operators and developers.
- [x] Task 8.7 - Refresh inline comments and wiring notes in
  `examples/web/main.go` as the final phase-integration step so the demo
  remains the canonical implementation reference.

**Exit Criteria**

- Module authors and host operators have a published contract and migration path
  for adopting explicit public-site ownership and theme scope isolation.
- Release signoff can happen from docs/checklists without tribal knowledge.

**Quick QA UI Expectation**

- The example app should behave exactly like the docs describe: explicit route
  ownership by surface, guarded public-site fallback, and independent admin/site
  theme resolution.
