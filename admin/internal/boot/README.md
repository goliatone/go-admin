# `admin/internal/boot`

Boot orchestration for the admin runtime.

## Purpose
- Provide an ordered boot pipeline (steps) that mounts routes and wires feature services.
- Keep `admin.Admin` thin by pushing boot concerns into focused, testable step functions.

## Key Files
- `run.go`: Runs steps with a `BootCtx`.
- `default_steps.go`: Default step ordering.
- `types.go`: Core `BootCtx` contract plus binding interfaces (panels, dashboard, etc).
- `step_*.go`: Feature-specific boot steps (routes, widgets, jobs, etc).
- `route_helpers.go`: Route spec helpers and shared parsing.

## Dependencies
- Leaf package: should not import other `admin/internal/*` feature packages.
- Depends on router abstractions (`go-router`) and the `BootCtx` interfaces only.

## Where To Change X
- Add/modify default startup sequence: `default_steps.go`.
- Mount a new API route group: create/update a `step_<feature>.go`.
- Adjust how route paths are built: `route_helpers.go`.

