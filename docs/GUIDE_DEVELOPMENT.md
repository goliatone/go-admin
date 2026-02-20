# Development Guide

This guide is the shared development playbook for this repository. It is meant to be practical for both human contributors and coding agents.

## 1. Purpose

Use this document to standardize:

- How we implement changes.
- How we test and validate behavior.
- How we log and debug issues.
- How we keep docs/tasks aligned with code.

## 2. Working Model

Default workflow:

1. Confirm the target behavior and affected package(s).
2. Make the smallest structural change that solves the problem.
3. Add or update tests close to the changed code.
4. Run targeted tests first, then broader tests when possible.
5. Update documentation/tasks when behavior or conventions changed.

Principles:

- Prefer structural fixes over UI-only or one-off patches.
- Keep cross-package contracts explicit (types, route names, config keys).
- Avoid hidden behavior in examples that is not reusable in `quickstart`.

## 3. Repository Orientation

High-level areas:

- `admin/`: core framework behavior, modules, transport, routing, debug collector.
- `quickstart/`: helpers and defaults used by host apps.
- `examples/`: integration-style apps demonstrating real wiring.
- `pkg/client/`: frontend assets and templates.
- `docs/`: design docs, guides, and task plans.

Useful references:

- `README.md`
- `quickstart/README.md`
- `docs/GUIDE_DEBUG_MODULE.md`
- `docs/GUIDE_DEBUG_CLIENT.md`

## 4. Local Development Flow

Typical loop:

1. Identify code with `rg`.
2. Implement change.
3. `gofmt` changed Go files.
4. Run focused tests first.
5. Run broader package tests if dependencies allow.

Command examples:

```bash
rg -n "symbol|type|function" admin quickstart examples
gofmt -w path/to/file.go
go test ./path/to/package -run TestName
go test ./examples/esign/...
```

## 5. Logging

This project uses `go-logger` compatible dependency injection (`glog.Logger` / `glog.LoggerProvider`) as the runtime logging baseline.

### 5.1 Logging rules

- Resolve loggers through DI (`Dependencies.Logger`, `Dependencies.LoggerProvider`) and use scoped names where useful (`adm.NamedLogger("scope.name")`).
- For runtime behavior in `admin/`, `quickstart/`, and `examples/`, avoid stdlib `log.Printf` and package-global logger state.
- Choose levels intentionally:
  - `INFO`: normal lifecycle/success path.
  - `WARN`: recoverable or user-caused issues (4xx class, retries, fallbacks).
  - `ERROR`: failures, unexpected states, 5xx class behavior.
- Prefer stable key/value pairs in log arguments:
  - `method`, `path`, `status`, `duration_ms`, `remote_ip`, `user_agent`, `error`.
- Do not log secrets, tokens, credentials, raw auth headers, or sensitive payloads.

### 5.2 Debug Console integration

Server logs appear in Debug Console only if they flow through the debug collector path.

Core wiring:

- Register debug module: `admin.NewDebugModule(cfg.Debug)`.
- Attach request capture middleware: `quickstart.AttachDebugMiddleware(...)`.
- Attach `slog` forwarding/bridge path: `quickstart.AttachDebugLogHandler(...)`.

For Fiber apps using `quickstart.NewFiberServer`:

- A default Fiber -> `slog` request bridge is installed when:
  - `cfg.Debug.Enabled == true`
  - `cfg.Debug.CaptureLogs == true`
- Level mapping in the bridge:
  - `ERROR` when handler returns error or status >= 500
  - `WARN` when status >= 400
  - `INFO` otherwise

`slog` remains the debug-capture transport. Runtime library callsites should still emit through the DI logger path so both app logs and request logs converge in the Debug Console stream.

### 5.3 Legacy logging

- Startup/fatal bootstrap logs should use the base app logger when available (for example `adm.NamedLogger("app.bootstrap")`).
- Keep stdlib `log.Fatalf` only where process termination semantics are required before logger wiring is available.

## 6. Testing and Validation

Rules:

- Add tests for behavior changes, not just implementation details.
- Prefer package-local tests near changed code.
- If full suite cannot run due unrelated failures, run focused tests and report blockers explicitly.

### 6.1 Noisy test logs (go-cms runtime)

When tests use `examples/web/setup.SetupPersistentCMS`, go-cms runtime mutation logs (for example `logger=cms.pages`, `logger=cms.content`) are disabled by default under `go test`.

Use these controls when you need verbose CMS logs for debugging:

- Per test run flag: `go test ./examples/web -args -cms-test-logs`
- Env override (works in tests and non-test contexts): `GO_ADMIN_CMS_LOGS=true` or `GO_ADMIN_CMS_LOGS=false`

Precedence:

1. `GO_ADMIN_CMS_LOGS` env override (if set and parseable).
2. Test flag `-cms-test-logs` (test runs only).
3. Default behavior (`false` in tests, `true` outside tests).

Validation checklist per change:

1. Changed files formatted (`gofmt`).
2. Targeted tests pass.
3. No unintended API/config contract changes.
4. Docs updated for behavior or workflow changes.

## 7. Documentation and Task Hygiene

When you change behavior:

- Update the closest guide or README.
- If the work maps to a task doc (`*_TSK.md`), check or update the relevant item.
- Keep docs precise and operational (commands, paths, config keys).

Use docs for:

- Stable conventions.
- Troubleshooting steps.
- Integration contracts.

Avoid docs for:

- Temporary experiments.
- Ambiguous TODOs without owner or acceptance criteria.

## 8. Troubleshooting Patterns

If Debug Console logs are missing:

1. Verify `cfg.Debug.Enabled` and `cfg.Debug.CaptureLogs`.
2. Verify debug module is registered.
3. Verify `AttachDebugMiddleware` and `AttachDebugLogHandler` are called.
4. Verify DI logger wiring is present (`Dependencies.Logger` / `Dependencies.LoggerProvider`) and runtime callsites are not bypassing it.
5. Verify request logs reach `slog` bridge output, and app logs are emitted via DI logger (both should appear in one collector stream).
6. Run focused bridge tests:
   - `go test -mod=mod ./... -run 'TestAttachDebugLogHandler(WiresSlog|AvoidsDefaultDelegateRecursion|InstallsBridgeIdempotently)$|TestDebugFiberSlogMiddlewareEmitsLevelByResponse$|TestDebugLogCaptureIncludesFiberRequestsAndDILogs$'` (workdir: `quickstart`).

If Debug Console logs duplicate:

1. Verify `AttachDebugLogHandler` is not wrapped multiple times by custom host code.
2. Confirm idempotent bridge install test still passes:
   - `go test -mod=mod ./... -run 'TestAttachDebugLogHandlerInstallsBridgeIdempotently$'` (workdir: `quickstart`).
3. Verify only one request logging middleware is active for the same route stack.

If tests fail outside changed scope:

1. Record failing package and exact compiler/test error.
2. Confirm your targeted tests for changed scope still pass.
3. Report blockers before widening refactors.

## 9. Definition of Done

A change is done when:

1. Behavior is correct and structural.
2. Tests for changed behavior pass.
3. Logging/observability implications are handled.
4. Documentation is updated where needed.
5. Open risks or unrelated blockers are clearly called out.

## 10. RFC: Contract and Security Guardrails

This section is the baseline RFC for backend-facing contracts in `go-admin` and `quickstart`.

### 10.1 Async Job Contract (Security)

Rules:

- Async job IDs must be opaque/non-enumerable.
- Job status endpoints must enforce owner scope (actor/tenant/org) by default.
- Poll/status handlers must reject cross-actor access even when the caller has broad module permissions.

Implementation baseline:

- Prefer random IDs (UUID/ULID or equivalent entropy).
- Persist owner identity on job creation and verify it on each status read.
- Treat missing owner identity as unauthorized for status reads.

### 10.2 Action Schema Contract (Determinism)

Rules:

- Every emitted action in `schema.actions` and `schema.bulk_actions` must include a deterministic `order`.
- Server must not rely on frontend fallbacks to recover missing order values.
- Unknown/custom action names must still receive stable fallback order values.

Implementation baseline:

- Normalize actions through one contract path in core (`admin/`).
- Add tests that fail if any emitted action has `order <= 0`.

### 10.3 Supplemental Payload Contract (Degradation Signaling)

Rules:

- Supplemental payloads (for example siblings/related records) must not fail silently.
- When backend cannot fully resolve supplemental data, responses must include explicit degraded flags/reasons.
- Expensive list-scan fallbacks must be bounded to prevent unbounded O(N) behavior in detail endpoints.

Implementation baseline:

- Prefer targeted repository queries (for example by `translation_group_id`) over full scans.
- Emit machine-readable degradation keys (for example `*_degraded`, `*_degraded_reason`).

### 10.4 Required Regression Coverage

- Cross-user async job poll attempts must return `403`.
- Action schema tests must assert positive `order` values for all emitted actions.
- Detail payload tests must assert degraded flags when supplemental queries fail.
