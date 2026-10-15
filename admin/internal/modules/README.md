# `admin/internal/modules`

Module ordering and loading for admin features.

## Purpose
- Provide a small module runtime to load manifests in a stable order.
- Keep module loading logic out of `admin.Admin` and avoid peer-to-peer feature imports.

## Key Files
- `types.go`: Module/manifest contracts.
- `load.go`: Loader implementation and ordering rules.

## Dependencies
- Uses stdlib, go-errors, and the go-featuregate gate contract for loading.
- Contracts share navigation types and translator helpers through
  `admin/internal/navigation` and `admin/internal/helpers`; concrete admin
  feature implementations remain outside the loader.

## Where To Change X
- Module ordering rules: `load.go`.
- Module contracts/manifests: `types.go`.
