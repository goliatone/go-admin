# `admin/internal/navigation`

Navigation/menu resolution and menu-item normalization/dedupe helpers.

## Purpose
- Resolve navigation from CMS menus or in-memory fallback trees.
- Apply localization and permission filtering for navigation items.
- Provide deterministic helpers for menu item IDs and deduplication across persistent backends.

## Key Files
- `navigation.go`: `Navigation` resolver (CMS vs fallback, filtering, localization).
- `types.go`: Menu/navigation types + normalization, dedupe, and target helpers.
- `slug.go`: Menu slug normalization and deterministic UUID mapping helpers.

## Dependencies
- Depends only on small interfaces (`MenuService`, `Authorizer`, `Translator`) and stdlib.
- Must not import other peer feature packages.

## Where To Change X
- Permission filtering rules: `navigation.go`.
- Menu item ID/dedupe logic: `types.go`.
- Slug normalization rules: `slug.go`.

