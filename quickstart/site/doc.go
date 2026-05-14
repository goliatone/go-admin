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
//   - Hosts must provide a RenderCacheTemplateRenderer before rendered responses
//     can be stored. Without one, requests bypass storage and use the normal
//     router template renderer.
//   - The default policy is conservative: GET/HEAD, status 200, no arbitrary
//     query variation, auth/session/preview/JSON/search/API/cookie-mutating
//     requests bypass, and only safe response headers are replayed.
//   - Built-in auth bypass checks include Authorization, admin authenticated
//     request context, go-auth claims/actor context, common session/JWT
//     cookies, and host-declared RenderCachePolicy.AuthCookieNames.
//
// See /LOCALE_PATH_V1_GUIDE.md and /LOCALE_PATH_RUNBOOK.md for the full V1
// rollout model, migration guidance, and V2 cleanup plan.
package site
