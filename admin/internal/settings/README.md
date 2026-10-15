# `admin/internal/settings`

Settings bootstrap defaults and form helpers.

## Purpose
- Derive/register default settings definitions and system-scoped bootstrap values.
- Provide helpers used by settings forms/adapters without coupling to `admin.Admin`.

## Key Files
- `bootstrap.go`: Default definitions + bootstrap application helpers.
- `form_helpers.go`: Shared helpers for settings form rendering/adapters.

## Dependencies
- Bootstrap defaults use stdlib and minimal callbacks; form helpers also use
  the go-options contract for typed settings resolution.
- Must not import peer feature packages.

## Where To Change X
- Default setting keys/values: `bootstrap.go`.
- Form schema shaping: `form_helpers.go`.
