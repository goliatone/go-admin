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
// See /LOCALE_PATH_V1_GUIDE.md and /LOCALE_PATH_RUNBOOK.md for the full V1
// rollout model, migration guidance, and V2 cleanup plan.
package site
