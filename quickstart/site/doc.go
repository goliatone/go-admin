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
