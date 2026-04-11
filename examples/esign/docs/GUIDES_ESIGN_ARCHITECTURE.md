# E-Sign Flagship Architecture (Phase 0)

## Scope

This document defines the phase-0 baseline architecture for the flagship e-sign
application package at `examples/esign`.

Goals for this phase:

1. Create a clean package scaffold with explicit boundaries.
2. Wire startup through `quickstart.NewAdmin` with stable feature defaults.
3. Use URL resolver-derived paths for admin/signer route construction.
4. Establish typed e-sign error code namespace for later phases.

## Package Boundaries

`examples/esign/modules`

- Registers the e-sign module, menu entry, and baseline routes.

`examples/esign/handlers`

- Owns HTTP route registration and resolver-derived path construction.
- Contains baseline status/session placeholders only in phase 0.

`examples/esign/services`

- Owns domain-level typed error namespace and registration hooks.

`examples/esign/stores`

- Owns store contracts and scoped persistence boundaries.

`examples/esign/commands`

- Owns command IDs and future command handler registration.

`examples/esign/jobs`

- Owns job IDs and async job boundary definitions.

## URL Strategy

1. Configure explicit admin/public URL namespaces in `main.go`.
2. Resolve namespace roots from URLKit (`admin`, `admin.api.*`, `public.api.*`).
3. Build e-sign route paths from resolved namespace roots.
4. Keep route literals centralized in handler route helpers only.

## Feature Defaults

- `esign = true`
- `esign_google = false`

Defaults can be overridden by environment variables for local runs:

- `ESIGN_FEATURE_ENABLED`
- `ESIGN_GOOGLE_FEATURE_ENABLED`

## Deferred to Later Phases

1. Migrations, persistence implementations, lifecycle guards.
2. AuthZ, rate limiting, token cryptography.
3. Full signer/admin API contracts and async artifact pipeline.
