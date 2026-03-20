# Track C Contract Change Ledger and ADR Workflow

This ledger is mandatory for every Track C breaking backend/frontend contract change.

## Workflow

1. Add or update the Track C contract snapshot in `examples/esign/release/trackc_contract_guard.json`.
2. Create a new ledger entry in this file with a unique ID (`TC-YYYY-MM-DD-###`).
3. Include all required markers in the entry:
   - `breaking_change_rationale:`
   - `measurable_gain:`
   - `impacted_endpoints:`
   - `backend_tests:`
   - `frontend_tests:`
   - `contract_hash:`
4. Link any deeper architectural decision notes to an ADR section in `docs/`.
5. CI guard test (`TestValidateTrackCContractGuardPassesForCurrentSnapshot`) fails if tracked files, hash snapshot, and ledger entry are not aligned.

## Required Entry Template

```text
## TC-YYYY-MM-DD-###
date: YYYY-MM-DD
owner: team-or-person
breaking_change_rationale: ...
measurable_gain: ...
impacted_endpoints: endpointA, endpointB
backend_tests: test command(s)
frontend_tests: test command(s)
contract_hash: <sha256>
related_adr: docs/<adr-file>.md (optional)
```

## TC-2026-02-15-001

date: 2026-02-15
owner: backend
breaking_change_rationale: replace positional recipient/field draft contracts with stable ID-based participant/definition/instance contracts to remove index-coupled mutation behavior.
measurable_gain: deterministic draft mutation correctness for arbitrary signer/stage modeling, removal of recipient index coupling in active payload handling, and enforced required-definition placement invariants before send.
impacted_endpoints: admin panel agreement draft create/update payloads, agreement send-readiness validation contract, store/service draft mutation interfaces.
backend_tests: "/Users/goliatone/.g/go/bin/go" test ./examples/esign/services ./examples/esign/stores ./examples/esign/modules
frontend_tests: N/A (backend phase entry; FE lockstep planned in Phase 21.FE tasks)
contract_hash: 980208005f1e4bcf1f72719cb8d8037bd5e26889812be67e1f6062af3adc144b
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-02-16-002

date: 2026-02-16
owner: backend
breaking_change_rationale: introduce provider-agnostic CRM/HRIS integration foundation contracts and persistence primitives so sync/mapping/conflict behavior is first-class in v2 runtime without provider-specific schema coupling.
measurable_gain: deterministic mapping compile hash coverage, resumable checkpointed sync runs, explicit conflict lifecycle tracking, and normalized outbound change-event emission with idempotent mutation keys.
impacted_endpoints: /admin/api/v1/esign/integrations/mappings, /admin/api/v1/esign/integrations/sync-runs, /admin/api/v1/esign/integrations/conflicts, /admin/api/v1/esign/integrations/diagnostics, /admin/api/v1/esign/integrations/inbound, /admin/api/v1/esign/integrations/outbound.
backend_tests: "/Users/goliatone/.g/go/bin/go" test ./examples/esign/stores -run 'TestMigrationsExposeIntegrationFoundationTablesAndColumns|TestInMemoryIntegrationCredentialScopedCRUD' && "/Users/goliatone/.g/go/bin/go" test ./examples/esign/services -run 'TestIntegrationFoundation' && "/Users/goliatone/.g/go/bin/go" test ./examples/esign/handlers -run 'TestRegisterIntegration|TestBuildRouteSet'
frontend_tests: N/A (backend-only Phase 26 execution)
contract_hash: 5e38deadc319ecddacece3be802e84cb28024526df90f14f64b8c9f765ed20ae
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-03-05-003

date: 2026-03-05
owner: backend
breaking_change_rationale: add signer saved-signature library persistence contracts (record/store CRUD + count) to support reusable signature/initials modal behavior without profile-field overloading.
measurable_gain: token-scoped reusable signature APIs with deterministic cap enforcement and thumbnail-first listing, plus persisted schema support across in-memory/sqlite store implementations.
impacted_endpoints: /api/v1/esign/signing/signatures/:token, /api/v1/esign/signing/signatures/:token/:id.
backend_tests: go test ./examples/esign/stores ./examples/esign/services ./examples/esign/handlers ./examples/esign/release
frontend_tests: npm run build (pkg/client/assets)
contract_hash: d1e98491d05e368f67c7ad22653d9220be55d45adec20d2846f7fe3979f89ab1
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-03-09-004

date: 2026-03-09
owner: backend
breaking_change_rationale: harden reminder scheduling and lease ownership contracts so multi-worker sweeps cannot send duplicate reminders or leave legacy signer states unscheduled.
measurable_gain: deterministic reminder bootstrap with initialized next_due_at, lease-owner-only reminder state mutation in sweep paths, signer-only reminder controls, and sanitized reminder error exposure in panel payloads.
impacted_endpoints: admin agreement reminder sweep command path, admin agreement reminder pause/resume/send_now actions, agreement detail/list reminder status payload shape.
backend_tests: go test ./examples/esign/stores -run Reminder -count=1 && go test ./examples/esign/services -run Reminder -count=1 && go test ./examples/esign/config -run Reminder -count=1
frontend_tests: N/A (panel payload contract hardening only)
contract_hash: ecd0a4f349ea649800d8a2bf19f01c33c4d5d8f090af1ba373c985a47265f469
related_adr: PLAN_ESIGN_REMINDER_SYSTEMIC_HARDENING.md

## TC-2026-03-10-005

date: 2026-03-10
owner: backend
breaking_change_rationale: make source original filename a first-class required document contract and remove audit-trail filename derivation from generated object keys.
measurable_gain: canonical original filename persistence across store/service/API flows, deterministic audit metadata filename rendering, and elimination of generated key leakage in executed/certificate artifacts.
impacted_endpoints: /admin/api/v1/esign/documents/upload response payload, /admin/content/esign_documents create payload contract, document panel payload shape, executed/certificate audit metadata rendering.
backend_tests: go test ./examples/esign/... -count=1
frontend_tests: cd pkg/client/assets && npm run build
contract_hash: 75b1d9dd96328c0dd35dd9c5d6b21e58f4096760a11a6cedb2c38a4c67e2a169
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-03-18-006

date: 2026-03-18
owner: backend
breaking_change_rationale: move e-sign object persistence onto a configurable object-storage boundary so filesystem-only upload behavior is no longer hardwired into shared store/service and panel contract flows.
measurable_gain: app-mediated uploads can now target fs, s3, or multi storage through config and DI, localstack-backed development uses the same object-store path as production, and document/artifact persistence contracts remain stable while backend bootstrap becomes reusable.
impacted_endpoints: /admin/api/v1/esign/documents/upload response payload, document/admin artifact retrieval paths backed by object_key storage, runtime storage bootstrap/config contracts used by e-sign startup.
backend_tests: go test ./examples/esign ./examples/esign/handlers ./examples/esign/modules ./examples/esign/services ./quickstart/... && (cd ../go-uploader && go test ./...)
frontend_tests: N/A (no frontend contract payload shape change beyond existing object_key response fields)
contract_hash: 58e3e5c4f45d918b6f7d64435f204bffe0dd86b1b657a5c1aa945ba51a42632f
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-03-19-007

date: 2026-03-19
owner: backend
breaking_change_rationale: tighten Track C lineage contracts so panel detail payloads now redact lineage fields when the caller lacks `AdminESignView`, and agreement revision creation stops implicitly backfilling a missing `source_revision_id` from the source document record.
measurable_gain: lineage detail payloads now follow the same permission boundary as the rest of the admin e-sign surface, and revision lineage persistence is deterministic because the service only carries source revision identifiers explicitly provided by the revision source contract.
impacted_endpoints: /admin/content/esign_documents/:id lineage payload, /admin/content/esign_agreements/:id lineage payload, agreement revision lineage metadata produced by backend revision flows that feed panel repositories.
backend_tests: go test ./examples/esign/release ./examples/esign/stores ./examples/esign/modules ./examples/esign/services -count=1
frontend_tests: go test ./pkg/client -count=1
contract_hash: 9273181c2b77b016ba29a4b4ed330af65b5c6b6c88032b5bf1d909625fe9bb13
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md
