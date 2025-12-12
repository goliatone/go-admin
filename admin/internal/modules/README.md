# `admin/internal/modules`

Module ordering and loading for admin features.

## Purpose
- Provide a small module runtime to load manifests in a stable order.
- Keep module loading logic out of `admin.Admin` and avoid peer-to-peer feature imports.

## Key Files
- `types.go`: Module/manifest contracts.
- `load.go`: Loader implementation and ordering rules.

## Dependencies
- Should depend only on stdlib and small callback interfaces.
- Must not import other `admin/internal/*` packages.

## Where To Change X
- Module ordering rules: `load.go`.
- Module contracts/manifests: `types.go`.

