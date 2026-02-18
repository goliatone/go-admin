# Datagrid / Go-CRUD Internal Boundaries

This document defines the in-repo extraction seams introduced in Phase 4.

## Internal Module Boundaries

- `core.ts`
  - Thin orchestrator class (`DataGrid`) that preserves the public method surface.
  - Delegates implementation to focused internal modules.

- `core-state.ts`
  - URL sync, persisted state hydration, share-state token handling.
  - Depends on grouped-mode parsers and shared URL-state helpers.

- `core-fetch-query.ts`
  - Request lifecycle (`refresh`), query param normalization, detail payload normalization.
  - Depends on shared transport helper.

- `core-rendering.ts`
  - Table row/cell rendering, action cell wiring, pagination rendering.
  - Depends on shared transport helper for destructive row actions.

- `core-grouped.ts`
  - Grouped/matrix orchestration, grouped fallback behavior, expand/collapse semantics.
  - Depends on `grouped-mode.ts` contracts.

- `core-lifecycle.ts`
  - UI event binding and controller lifecycle hooks.
  - Depends on shared event delegation helper.

- `core-columns.ts`
  - Column reorder/reset and DOM alignment helpers.

- `go-crud/*.ts`
  - Server contract adapters for search/filter/sort/pagination/export/bulk/column visibility.
  - Uses shared transport helper for request behavior consistency.

## Shared Frontend Primitives

- `src/shared/transport/http-client.ts`
  - Common request wrapper, JSON body handling, idempotency header pass-through, error extraction.

- `src/shared/query-state/url-state.ts`
  - URLSearchParams normalization helpers used by datagrid URL state sync.

- `src/shared/events/delegation.ts`
  - Reusable delegated event registration helper used in datagrid lifecycle bindings.

## Dependency Map

- `datatable/index.ts` -> `core.ts` + feature modules (`grouped-mode`, `translation-context`, `go-crud`, etc.)
- `core.ts` -> `core-state.ts`, `core-fetch-query.ts`, `core-rendering.ts`, `core-grouped.ts`, `core-lifecycle.ts`, `core-columns.ts`
- `core-state.ts` -> `grouped-mode.ts`, `shared/query-state/url-state.ts`
- `core-fetch-query.ts` -> `shared/transport/http-client.ts`
- `core-rendering.ts` -> `shared/transport/http-client.ts`
- `core-lifecycle.ts` -> `shared/events/delegation.ts`
- `go-crud/bulk.ts`, `go-crud/export.ts`, `go-crud/column-visibility.ts` -> `shared/transport/http-client.ts`

## Extraction Readiness Checklist

- Public entrypoint remains stable: `datatable/index.ts` exports unchanged.
- Internal-only split modules are explicit (`core-*` files).
- Datagrid dependencies are grouped by concern (state/fetch/render/grouped/lifecycle/columns).
- Transport/query-state/event primitives are reusable by non-datagrid surfaces.
