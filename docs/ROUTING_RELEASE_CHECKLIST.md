# Routing Release Checklist

Final release-readiness checklist for the `admin/routing` rollout.

## Config Wiring

- [x] `admin.Config.Routing` is normalized during admin startup.
- [x] Effective roots derive from canonical URL config defaults when overrides are absent.
- [x] Mounted modules require explicit `RouteContract()` declarations.
- [x] Startup remains strict fail-fast for routing conflicts in every environment.
- [x] Public-site fallback policy and reserved prefixes derive from canonical config plus URL-builder/internal-ops helpers rather than scattered literals.

## Manifest And Topology

- [x] `adm.RoutingPlanner().Manifest()` is deterministic and diffable.
- [x] Default no-override topology is pinned by [`admin/testdata/routing_default_topology_snapshot.json`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/admin/testdata/routing_default_topology_snapshot.json).
- [x] URLKit lookups and runtime router paths are covered by integration/E2E tests for mounted modules.

## Diagnostics

- [x] `adm.RoutingReport()` exposes effective roots, module mounts, conflicts, and warnings.
- [x] `adm.RoutingReport()` and `adm.RoutingPlanner().Manifest()` expose public-site fallback ownership metadata, reserved prefixes, and allowed methods/paths.
- [x] Startup logs emit the routing report.
- [x] quickstart doctor output exposes the routing report under `quickstart.routing`.

## Adapter Audit

- [x] URLKit capability-provider hook remains available through `routing.URLKitCapabilityProvider`.
- [x] Router capability-provider hook remains available through `routing.RouterCapabilityProvider`.
- [x] Fallback warnings remain explicit when upstream native strict/manifest hooks are not advertised.
- [x] Fiber and HTTPRouter both have grouped-host parity coverage for fallback policy, method guards, and runtime ownership boundaries.

## Verification Matrix

- [x] Unit coverage: normalization, slug policy, mount defaults/overrides, ownership, conflicts, conflict-policy fail-fast behavior, manifest determinism.
- [x] Integration coverage: successful startup, fail-fast conflicts, override mounts, URLKit coherence, default topology regression.
- [x] E2E coverage: internal and external-like modules, deliberate conflict injection, doctor/report visibility.
- [x] Performance gate: planner plus validation stays under the 20ms local-dev startup target for a typical module count.
- [x] Fallback validation plus manifest/report generation stay under the same startup budget for a typical module count.
- [x] Example-host E2E covers `/admin/debug`, internal ops, `/.well-known/*`, `/search`, unknown public paths, unknown admin paths, and admin/site theme isolation.

## Release Notes

- [x] Module-author/operator contract is published in [`docs/GUIDE_ROUTING.md`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/docs/GUIDE_ROUTING.md).
- [x] The canonical execution and signoff chain is `ROUTING_ARD.md` ->
  `ROUTING_TSK.md` -> `docs/ROUTING_RELEASE_CHECKLIST.md`.
- [x] Release notes document the clean-break upgrade posture: grouped host
  routing, declarative `SiteFallbackPolicy`, default fallback mode
  `public_content_only`, strict fail-fast startup validation, and the removal of
  `WithGoTheme(...)` in favor of `WithAdminTheme(...)`.
- [x] Deprecation policy is explicit: there is no compatibility bridge for
  legacy shared-root site catch-all wiring, callback fallback matchers, or the
  removed shared admin/site theme hook.

## Verification Commands

```sh
go test ./admin/routing -count=1
go test ./admin -run 'Test(NewExposesRoutingReportAndPreservesDefaultTopologyWithoutOverrides|RoutingDefaultTopologySnapshot)' -count=1
go test ./quickstart -run 'TestQuickstartRouting' -count=1
go test ./quickstart -run 'TestHostRouterPhase7AdapterParityForFallbackOwnershipAndMethods' -count=1
go test ./examples/web -run 'TestExamplePhase7' -count=1
go test ./admin/routing -run 'Test(PlannerValidationTypicalModuleCountMeetsStartupBudget|FallbackValidationAndReportGenerationTypicalModuleCountMeetsStartupBudget|ReleaseAudit|Phase7ReleaseAuditFallbackOwnershipSnapshot)' -count=1
go test ./admin/routing -run '^$' -bench 'Benchmark(PlannerValidationTypicalModuleCount|FallbackValidationAndReportGenerationTypicalModuleCount)' -benchtime=1x
```
