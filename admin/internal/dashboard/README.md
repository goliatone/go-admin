# `admin/internal/dashboard`

Dashboard-related helpers and CMS-backed widget persistence.

## Purpose
- Centralize widget area/definition bootstrapping and provider wiring helpers.
- Provide a CMS-backed store for widget instances (used by go-dashboard integration).

## Key Files
- `types.go`: Core dashboard/widget types shared with CMS bindings.
- `helpers.go`: Widget areas/definitions + provider wiring helpers.
- `cms_widget_store.go`: Widget instance store backed by CMS widget services.

## Dependencies
- May depend on CMS interfaces via `admin/internal/cmsboot` type aliases.
- Must not import other peer feature packages (`navigation`, `settings`, etc).

## Where To Change X
- Default areas/definitions: `helpers.go`.
- CMS widget instance persistence behavior: `cms_widget_store.go`.

