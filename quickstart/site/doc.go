// Package site implements public-site delivery on top of go-admin CMS records.
//
// Locale-path model:
//   - Family identity is anchored by FamilyID first, then route_key.
//   - path is the localized public path for a specific translation record.
//   - locale prefix policy is applied at runtime, not baked into stored paths.
//
// V1 compatibility:
//   - runtime still tolerates legacy locale-prefixed stored paths
//   - bridge diagnostics can surface when that compatibility branch is used
//
// Historical URL redirects:
//   - WithContentURLRedirectStore wires an optional lookup-only dependency for
//     public-site requests that normal content resolution did not match.
//   - Redirect persistence is host-owned. Stores implement
//     ContentURLRedirectStore and should index normalized source path by site
//     scope, locale, and content channel, plus any host-specific tenant key.
//     WithContentURLRedirectSiteKey can provide an explicit stable site scope;
//     otherwise lookup derives scope from request host, base path, and channel.
//   - Runtime lookup is a safe first rollout step: existing current-content
//     canonical redirects remain authoritative, unknown paths still fall
//     through to the normal 404 flow, and only eligible GET/HEAD HTML requests
//     can use historical redirects.
//   - Hosts that want automatic capture around content moves can call
//     ResolveContentDeliveryPath and CaptureContentURLRedirect from their
//     write flows. Capture compares old and new public delivery paths and calls
//     a host-provided ContentURLRedirectRecorder when a published, routable path
//     changed.
//   - Capture stores runtime-public paths by default, including site base path
//     and locale-prefix policy. Use ContentURLRedirectPathExplicit only for
//     migration tools that intentionally need caller-controlled path shape.
//   - Route-template, base-path, channel, and locale-prefix changes should use
//     CaptureContentURLRedirectBulk so every affected record is evaluated with
//     before/after resolver inputs. Bulk capture supports distinct before/after
//     content channels for channel moves. Use best-effort mode for migrations
//     that should report per-record failures, or fail-fast mode when one bad
//     record should stop the run.
//   - ContentURLRedirectChainUpdater and
//     ContentURLRedirectSourceOwnerLookupService are optional capture-side
//     hooks. Stores can use them to flatten chains such as /a -> /b -> /c and
//     reject source paths that still belong to different active content by ID,
//     type, locale, or channel scope. Set ContentURLRedirectChainRequired when
//     capture must fail instead of recording a redirect without chain flattening.
//   - Backfills should write normalized source paths and validated same-site
//     targets before enabling lookup. If rollout notes are needed for a
//     release, write them in .release-notes.md.
//
// Render cache:
//   - WithRenderCache wires anonymous public HTML response caching for
//     capability-driven site delivery.
//   - Hosts provide the cache backend through RenderCacheStore. The interface is
//     compatible with go-cache-style typed stores, but this package does not
//     import go-cache.
//   - Standard go-router Fiber and HTTPRouter contexts use router-backed
//     response capture by default. RenderCacheTemplateRenderer is optional for
//     tests, custom render stacks, and contexts without the router template
//     capture capability.
//   - RenderCachePolicy.MaxCaptureBodySize limits buffered template output and
//     defaults to router.DefaultMaxCapturedBodySize. Oversized captures bypass
//     storage and then use the normal router template renderer.
//   - Cache hits replay stored RenderedSiteResponse values through site-owned
//     safe-header filtering, HEAD handling, debug headers, and freshness
//     metadata; raw router.CapturedResponse values are not stored or replayed.
//   - StaleTTL enables stale-while-revalidate behavior: stores retain entries
//     for FreshTTL plus StaleTTL, stale hits replay with cache status "stale",
//     expired entries are deleted and refreshed as misses, and hosts can wire
//     RenderCachePolicy.StaleRevalidator for safe background regeneration.
//     Revalidation is keyed so duplicate stale hits do not stampede one process,
//     and host callback panics are recovered.
//   - The default policy is conservative: GET/HEAD, status 200, no arbitrary
//     query variation, auth/session/preview/JSON/search/API/cookie-mutating
//     requests bypass, and only safe response headers are replayed.
//   - Built-in auth bypass checks include Authorization, admin authenticated
//     request context, go-auth claims/actor context, common session/JWT
//     cookies, and host-declared RenderCachePolicy.AuthCookieNames.
//   - RenderCachePolicy.RequireTagIndex is a production guard: memory backends
//     bypass caching, stores must explicitly declare backend kind, stores must
//     implement RenderCacheTagInvalidator, and tag attachment failure removes
//     the just-written entry before it can be served.
//
// See /LOCALE_PATH_V1_GUIDE.md and /LOCALE_PATH_RUNBOOK.md for the full V1
// rollout model, migration guidance, and V2 cleanup plan.
package site
