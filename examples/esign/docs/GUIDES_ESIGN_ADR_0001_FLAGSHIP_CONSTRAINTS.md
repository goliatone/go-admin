# ADR 0001: Flagship E-Sign Phase-0 Constraints

## Status

Accepted

## Context

The e-sign app is intended to be production-grade and must avoid demo-only
runtime shortcuts. Phase 0 sets non-negotiable technical constraints for all
later implementation phases.

## Decision

1. Startup must use `quickstart.NewAdmin` and explicit feature defaults.
2. URL namespaces must be configured explicitly for admin and public APIs.
3. E-sign routes must be generated from URL resolver namespaces, not hardcoded
   full paths in business logic.
4. Typed, API-safe e-sign error codes are defined in phase 0 and reused by
   handlers/services.
5. Package boundaries are fixed: handlers/services/stores/commands/jobs/modules.

## Consequences

- Early structure reduces refactors in domain and persistence phases.
- Route generation remains environment-safe when base path/version changes.
- Error contracts remain consistent across handlers, services, and clients.
