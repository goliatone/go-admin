# `admin/internal/navigation`

Navigation/menu resolution and menu-item normalization/dedupe helpers.

## Purpose
- Resolve navigation from CMS menus or in-memory fallback trees.
- Apply localization and permission filtering for navigation items.
- Provide deterministic helpers for menu item IDs and deduplication across persistent backends.

## Key Files
- `navigation.go`: `Navigation` resolver (CMS vs fallback, filtering, localization).
- `types.go`: Menu/navigation types + normalization, dedupe, and target helpers.
- `internal/navigationutil/navigationutil.go` (repository root): shared CMS
  menu slug/code and target normalization used by the navigation types.

## Dependencies
- Resolves through small `MenuService`, `Authorizer`, and `Translator`
  interfaces. Types also use go-cms normalization plus shared
  `internal/navigationutil` and `internal/primitives` helpers.

## Where To Change X
- Permission filtering rules: `navigation.go`.
- Menu item ID/dedupe logic: `types.go`.
- Slug normalization rules: `internal/navigationutil/navigationutil.go`.
