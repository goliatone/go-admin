# Background Command Routing Observability Guide

This guide documents the Phase 9 observability contract for mode-selectable command dispatch and e-sign PDF remediation.

## `go-command`

- Use stable message `Type()` values as canonical `command_id`.
- Preserve dispatch routing fields in logs and metadata:
  - `command_id`
  - `execution_mode` (`inline|queued`)
  - `dispatch_id`
  - `correlation_id`
- Keep dispatch receipt semantics explicit (`accepted`, `mode`, `dispatch_id`, `enqueued_at`) for both inline and queued paths.

### Owned runtime generations

Owner-scoped command registration sets build a private dispatcher runtime and
registry, then publish dispatch factories and catalog descriptors together.
Configure `OwnedCommandRuntimeConfig` before committing a set when it needs a
queued executor, placement resolver, remote dispatcher, or default runner
options. The snapshot affects future generations only.

Queued executors receive an observed context containing the safe
`command.DispatchRunContext`. Persist only the required run ID, command ID,
dispatch ID, correlation ID, execution mode, attempt, and other explicitly
safe fields. Arbitrary request-context values and raw secrets are not a queue
payload contract. A worker reconstructs the safe run context and executes the
job through `dispatcher.RunObservedCommand` so started/progress/terminal events
retain the same run identity.

Runner retry and queue retry are distinct:

- `runner.Option` values passed to `RegisterSetCommand` govern in-process
  handler attempts and are opt-in.
- queue retry governs delivery/redelivery after accepted queued dispatch.

Do not enable both accidentally for a non-idempotent command; the combined
attempt count is multiplicative.

### Catalog and redaction

Descriptors exposed by an owned registry retain permissions, schemas,
execution/progress metadata, dynamic option references, and redaction hints.
They appear only while that owner generation is committed.

The go-admin command-run observer recursively redacts sensitive metadata before
publication, including idempotency keys and nested token/secret/password
fields. Receipts and lifecycle stores must never render or persist raw
idempotency material. Transport or queue integrations that publish events
outside this bridge must apply an equivalent redaction boundary.

## `go-job`

- Queued dispatch status drives remediation lifecycle states (`accepted|running|retrying|succeeded|failed|canceled|dead_letter`).
- Dedup/idempotency behavior should use a shared durable dedup store when non-`ignore` policies are enabled.
- Missing dedup-store wiring is surfaced as an explicit dispatch rejection reason (`dedup_store_missing`) and is alertable.

## `quickstart`

- Configure command routing with:
  - `WithCommandExecutionPolicy(...)`
  - `WithCommandQueueRouting(...)`
- For queued remediation in local/prod worker topologies, keep policy and queue adapter wiring identical between API and worker processes.
- Quickstart docs now include the routing observability fields and expected alert codes.

## `esign`

### Structured logs

Dispatch and remediation logs include:
- `command_id`
- `execution_mode`
- `dispatch_id`
- `correlation_id`
- `accepted` (dispatch logs)

### Metrics

Use `examples/esign/observability.Snapshot()` and track:

- Dispatch:
  - `CommandDispatchAcceptedTotal`
  - `CommandDispatchRejectedTotal`
  - `CommandDispatchAcceptedByMode`
  - `CommandDispatchRejectedByReason`
- Dedup:
  - `DedupStoreMissTotal`
  - `DedupStoreMissByCommandID`
- Remediation lifecycle:
  - `RemediationCandidateTotal`
  - `RemediationStartedTotal`
  - `RemediationSucceededTotal`
  - `RemediationFailedTotal`
  - `RemediationFailureByReason`
- Remediation queue transitions:
  - `RemediationRetryingTotal`
  - `RemediationCanceledTotal`
  - `RemediationDeadLetterTotal`
- Remediation concurrency/locking:
  - `RemediationDuplicateSuppressedTotal`
  - `RemediationLockContentionTotal`
  - `RemediationLockTimeoutTotal`

### Alerts

`observability.EvaluateAlerts(...)` includes:
- `command.dedup_store_miss_detected`
- `pdf.remediation_retrying_high`
- `pdf.remediation_dead_letter_high`
- `pdf.remediation_lock_contention_high`
- `pdf.remediation_lock_timeout_high`

### Activity and audit lifecycle

- Activity feed emits remediation lifecycle actions:
  - `esign.pdf_remediation.requested`
  - `esign.pdf_remediation.started`
  - `esign.pdf_remediation.succeeded`
  - `esign.pdf_remediation.failed`
- Agreement-scoped audit append uses:
  - `document.remediation.requested`
  - `document.remediation.started`
  - `document.remediation.succeeded`
  - `document.remediation.failed`
- Document-only remediation (no `agreement_id`) remains Activity-only (no audit append).
