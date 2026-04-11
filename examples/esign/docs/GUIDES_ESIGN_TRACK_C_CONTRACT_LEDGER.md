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
contract_hash: 880d34a7412225d98273e954bc4f3b36268072f16971f4c96e770f51b876f0e9
related_adr: docs/PLAN_ESIGN_REMINDER_SYSTEMIC_HARDENING.md
