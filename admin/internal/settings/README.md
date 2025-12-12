# `admin/internal/settings`

Settings bootstrap defaults and form helpers.

## Purpose
- Derive/register default settings definitions and system-scoped bootstrap values.
- Provide helpers used by settings forms/adapters without coupling to `admin.Admin`.

## Key Files
- `bootstrap.go`: Default definitions + bootstrap application helpers.
- `form_helpers.go`: Shared helpers for settings form rendering/adapters.

## Dependencies
- Pure helpers: should depend only on stdlib and minimal function callbacks.
- Must not import peer feature packages.

## Where To Change X
- Default setting keys/values: `bootstrap.go`.
- Form schema shaping: `form_helpers.go`.

