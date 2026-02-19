# Cross-Package Release Gates - Phase 1 Operational Readiness

Date: 2026-02-19
Scope: `go-admin/modules/services` + `go-services` runtime contracts consumed by the module.

## Task 1.1 Security Review

Status: Complete

### Secret Handling

- `go-services` credential encryption is enforced through `security.AppKeySecretProvider` (AES-GCM envelope with key-id/version metadata and AAD validation).
- `go-admin/modules/services` wires `SecretProvider` from config (`EncryptionKey`, `EncryptionKeyID`, `EncryptionVersion`) and injects it into `go-services` during setup.
- Verified by focused security tests:
  - `go-services/security`: app-key and managed provider encryption/decryption, metadata mismatch rejection.

### Redaction Policy

- `go-services/store/sql` redaction is applied before audit/grant metadata persistence (`RedactMetadata` on sensitive keys like token/secret/password/signature/authorization).
- Verified by SQL integration coverage for audit/grant event redaction behavior.

### Webhook/Inbound Signature Verification

- Webhook path: `go-admin/modules/services` forwards ingress to `go-services/webhooks.Processor`, which invokes verifier before claim/dispatch.
- Inbound path: `go-admin/modules/services` forwards ingress to `go-services/inbound.Dispatcher`, which invokes verifier before idempotency claim/dispatch.
- Verified by webhook/inbound verifier and retry-claim lifecycle tests in both packages.

### RBAC Enforcement

- All services routes are wrapped through `wrapServiceRoute(...)` and `authorizeRoute(...)` with explicit `admin.services.*` permissions.
- Forbidden envelopes are normalized via `api_errors.go`.
- Verified by authz integration tests including full route permission matrix checks.

## Task 1.2 Performance/Load Validation

Status: Complete

Validated high-risk paths with repeated focused suites (`-count=3`) plus module integration checks:

- Webhook bursts and retry-ready reprocessing:
  - `go-services/webhooks`: burst coalescing, debounce, retry-ready processing.
- Outbox lag/retry lifecycle:
  - `go-services/store/sql`: outbox claim/ack/retry lifecycle.
  - `go-admin/modules/services`: lifecycle status/outbox lag surfaces and replay behavior.
- Sync backfills and cursor-safe progression:
  - `go-services/store/sql`: webhook-triggered sync dedupe/cursor-advance integration.
- Activity query hot paths:
  - `go-services/store/sql`: activity retention/query integration.
  - `go-admin/modules/services`: list filters/pagination envelope and detail summary loaders.

Result: all targeted suites passed without regressions.

## Task 1.3 Runbook and Alerting Coverage

Status: Complete

### Runbook Coverage

- Canonical failure-mode runbook exists in `go-services`:
  - `../go-services/docs/runbooks/services_failure_modes.md`
- Covered scenarios include provider outage, token revocation, webhook replay, outbox lag, and notification failure.

### Alerting Surface Coverage in go-admin

- `GET /admin/api/services/status` exposes operational health fields suitable for alerts:
  - outbox `status_counts`
  - outbox `pending_lag_seconds`
  - notification dispatch status counts
  - activity fallback/cleanup degraded state
- `GET /admin/api/services/operations/status` exposes retry/backoff and last-operation error/status per connection.

Recommended alert rules for operators:

- Outbox lag threshold breach (`pending_lag_seconds` sustained above SLO).
- Failed outbox/notification statuses > 0 sustained.
- Lifecycle `degraded=true` sustained.
- Retry/backoff growth with persistent operation errors.

## Task 1.4 Migration Notes and Versioning Strategy

Status: Complete

Consumer migration strategy (ad-hoc integrations -> `go-services` primitives via `go-admin/modules/services`):

1. Register migrations in dependency order: `go-auth -> go-users -> go-services -> app-local`.
2. Configure credential encryption material (`encryption_key`, optional key-id/version).
3. Enable/seed required RBAC permissions (`admin.services.*`).
4. Route provider webhooks/inbound callbacks to services module endpoints.
5. Move async processing to services worker jobs (refresh, webhook process, renewals, sync, outbox dispatch).
6. Use stable API contract from `modules/services/API_CONTRACT.md` for frontend/ops clients.

Versioning policy:

- `go-services` is pre-`v1.0.0`; intentional breaking changes are allowed and must be documented in changelog and migration notes.
- `go-admin` should pin and validate against explicit `go-services` revisions before release tagging.

## Task 1.5 Dependency-Policy Compliance Check

Status: Complete

Confirmed default wiring uses required Goliatone packages and preserves override hooks:

- Logging: `go-logger` (`ResolveForJob` path, provider/logger resolution).
- Errors: `go-errors` factory/mapper path.
- Config layering: `go-config/cfgx` + `go-options` resolver.
- Persistence/repository: `go-persistence-bun` + `go-repository-bun`.
- Secret handling: `go-services/security` provider integration.

Override hooks validated:

- `WithLoggerProvider`, `WithLogger`, `WithErrorFactory`, `WithErrorMapper`
- `WithPersistenceClient`, `WithRepositoryFactory`, `WithSecretProvider`
- `WithConfigProvider`, `WithOptionsResolver`, and other module `WithX(...)` hooks

Focused setup tests confirm default+override behavior and fail-fast misconfiguration semantics.

## Validation Commands Run

- `"/Users/goliatone/.g/go/bin/go" test ./modules/services -run 'TestServicesAPI_AuthzEnforced|TestServicesAPI_RoutePermissionMatrixReturnsForbiddenEnvelope|TestServicesAPI_WebhookVerificationAndClaimLifecycleRetry|TestServicesAPI_InboundVerificationAndClaimLifecycleRetry|TestServicesAPI_QueueFailureAndErrorEnvelopeMapping|TestServicesAPI_MutatingRouteIdempotencyReplayAndConflict|TestSetup_RespectsWithXOverrides|TestSetup_ModuleStartupDefaultsAndWiring|TestSetup_MisconfigurationFailures|TestServicesLifecycle_OutboxLagReplayAndStatus|TestServicesLifecycle_NotificationRetryAndDuplicateIdempotency|TestServicesLifecycle_RetentionAndFallbackExecutionPaths|TestServicesAPI_ListFiltersPaginationAndEnvelope|TestServicesAPI_ConnectionDetailSummaryLoaders|TestServicesAPI_RateLimitRuntimeAndProviderOperationStatus' -count=1`
- `"/Users/goliatone/.g/go/bin/go" test ./security ./webhooks ./inbound -run 'TestAppKeySecretProvider_EncryptDecryptRoundTrip|TestAppKeySecretProvider_RejectsMetadataMismatch|TestProcessor_DedupesDeliveries|TestProcessor_RecordsRetryOnHandlerFailure|TestProcessor_ReprocessesRetryReadyDeliveries|TestProcessor_CoalescesWebhookBurstsByChannel|TestDispatcher_SharedVerificationAndIdempotency|TestDispatcher_RetriesAfterTransientHandlerFailure|TestDispatcher_RejectsInvalidInboundSignature|TestInMemoryClaimStore_RecoversAfterLeaseExpiry' -count=1` (workdir: `../go-services`)
- `"/Users/goliatone/.g/go/bin/go" test ./store/sql -run 'TestAuditAndGrantStores_RedactSensitiveMetadata|TestWebhookDeliveryStore_ClaimLifecycle|TestWebhookDeliveryStore_ReclaimsExpiredProcessingLease|TestOutboxStore_ClaimAckRetryLifecycle|TestActivityStore_OperationalRetentionAndQuery|TestWebhookTriggeredSync_DedupeAndCursorAdvance_Integration' -count=1` (workdir: `../go-services`)
- `"/Users/goliatone/.g/go/bin/go" test ./webhooks ./inbound -run 'TestProcessor_CoalescesWebhookBurstsByChannel|TestProcessor_DebounceWindowAllowsAfterQuietPeriod|TestProcessor_ReprocessesRetryReadyDeliveries|TestDispatcher_SharedVerificationAndIdempotency|TestDispatcher_RetriesAfterTransientHandlerFailure|TestInMemoryClaimStore_RecoversAfterLeaseExpiry' -count=3` (workdir: `../go-services`)
- `"/Users/goliatone/.g/go/bin/go" test ./store/sql -run 'TestOutboxStore_ClaimAckRetryLifecycle|TestActivityStore_OperationalRetentionAndQuery|TestWebhookTriggeredSync_DedupeAndCursorAdvance_Integration' -count=3` (workdir: `../go-services`)

## Notes

- During validation, `go-services` API changes required `go-admin/modules/services` compatibility updates:
  - typed `AuthKind` and `InstallationStatus` usage
  - explicit facade activity reader wiring (`WithActivityReader(...)`)
- These compatibility updates were applied and all targeted suites passed afterward.
