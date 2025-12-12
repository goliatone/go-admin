# `admin/internal/panels`

Panels feature package (planned extraction target).

## Purpose
- Host panel service logic, routes, and supporting adapters once panel internals are moved out of `admin/`.

## Current State
- Panel route mounting is handled by `admin/internal/boot/step_panels.go` using `boot.PanelBinding`.
- Panel implementations/types currently live under `admin/` (for example `admin/panel.go`).

## Where To Change X
- Panel CRUD routes behavior: `admin/internal/boot/step_panels.go`.
- Panel types/behavior: `admin/panel.go`.

