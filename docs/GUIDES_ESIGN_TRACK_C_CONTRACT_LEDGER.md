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
contract_hash: 21896ef49e315a2f257f2eeb1e13f7184c12f2abdcd84c4d1f20c29f466cff56
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-03-23-008

date: 2026-03-23
owner: backend
breaking_change_rationale: review and re-freeze the Track C contract set after cleanup work touched tracked service and panel repository files, so the guard reflects the currently accepted contract shape instead of an older reviewed snapshot.
measurable_gain: CI now validates the current reviewed Track C file set without false failures, while preserving an auditable contract-hash checkpoint for subsequent backend/panel changes.
impacted_endpoints: no externally intended endpoint shape change; tracked Track C backend contract files reviewed were examples/esign/services/agreement_service.go and examples/esign/modules/panel_repositories.go within the frozen contract set.
backend_tests: go test ./examples/esign/release ./examples/esign/services ./examples/esign/modules ./examples/esign/stores -count=1 && go test ./...
frontend_tests: N/A (no frontend contract payload change in this review-only snapshot refresh)
contract_hash: 33d4406270b3a8edb2db3a42039143c6d671e4b32846fcb4dbe52ce2c19b06bc
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-03-25-009

date: 2026-03-25
owner: backend
breaking_change_rationale: refresh the Track C guard after subsequent backend contract edits changed the reviewed file hash, so CI tracks the current accepted store, service, and panel repository contract shape instead of failing against the March 23, 2026 snapshot.
measurable_gain: release validation now matches the reviewed Track C file set, preserving a new auditable checkpoint while preventing false guard failures during full-repo verification.
impacted_endpoints: no intended externally visible endpoint payload change; reviewed Track C files remain examples/esign/stores/contracts.go, examples/esign/stores/models.go, examples/esign/stores/memory.go, examples/esign/services/agreement_service.go, and examples/esign/modules/panel_repositories.go.
backend_tests: go test ./examples/esign/release ./examples/esign/services ./examples/esign/modules ./examples/esign/stores -count=1 && go test ./...
frontend_tests: N/A (no frontend contract payload change in this guard refresh)
contract_hash: 3dcfd3d3bd2074a8033a28fd8e6be984267cc08ffb27f6aec03feb0df73aaeb3
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-04-02-010

date: 2026-04-02
owner: backend
breaking_change_rationale: refresh the Track C guard after the reviewed store, service, and panel repository contract set changed again, so the enforced snapshot matches the current accepted backend contract shape.
measurable_gain: full-repo verification no longer fails on a stale Track C hash, while preserving a dated audit checkpoint for the current reviewed contract boundary.
impacted_endpoints: no intended externally visible endpoint payload change; reviewed Track C files remain examples/esign/stores/contracts.go, examples/esign/stores/models.go, examples/esign/stores/memory.go, examples/esign/services/agreement_service.go, and examples/esign/modules/panel_repositories.go.
backend_tests: go test ./examples/esign/release ./examples/esign/services ./examples/esign/modules ./examples/esign/stores -count=1 && go test ./...
frontend_tests: N/A (no frontend contract payload change in this guard refresh)
contract_hash: d4450024575af6eb29a6a20ad4d691882b47f2309ae09f72019d52e23e365bd5
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-04-16-011

date: 2026-04-16
owner: backend
breaking_change_rationale: refresh the Track C guard after additional low-risk store and service refactors changed the reviewed contract hash, so release verification tracks the current accepted backend contract boundary instead of failing against the April 2, 2026 snapshot.
measurable_gain: full e-sign verification now validates the current reviewed Track C file set without false guard failures, while preserving a dated audit checkpoint for the accepted contract boundary after the latest refactor tranche.
impacted_endpoints: no intended externally visible endpoint payload change; reviewed Track C files remain examples/esign/stores/contracts.go, examples/esign/stores/models.go, examples/esign/stores/memory.go, examples/esign/services/agreement_service.go, and examples/esign/modules/panel_repositories.go.
backend_tests: go test ./examples/esign/...
frontend_tests: N/A (no frontend contract payload change in this guard refresh)
contract_hash: 8d9a01403b08a6f06c5f34865abcdc6e718a67cb2a826515431ab077ee7d5221
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-04-16-012

date: 2026-04-16
owner: backend
breaking_change_rationale: split reminder-state upsert and claim flows into explicit normalization, lease-preservation, candidate selection, and claim-application helpers so the in-memory Track C store preserves lease ownership and deterministic claim semantics under concurrent reminder sweeps.
measurable_gain: stable reminder lease retention on unfenced active upserts, shared validation for claim inputs and state records, and deterministic due-reminder ordering before in-memory claim mutation.
impacted_endpoints: admin agreement reminder sweep command path, admin agreement reminder pause/resume/send_now actions, agreement detail/list reminder status payload shape.
backend_tests: go test ./examples/esign/release -run TestValidateTrackCContractGuardPassesForCurrentSnapshot -count=1
frontend_tests: N/A (backend in-memory contract maintenance only)
contract_hash: 7f45792e5797d469f997cca69eede0548abe19ab29b2112f347cb47d3c607151
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md

## TC-2026-04-22-013

date: 2026-04-22
owner: backend
breaking_change_rationale: refresh the Track C guard after the reviewed store, service, and panel repository contract set changed, so release validation tracks the current accepted backend contract boundary instead of failing against the April 16, 2026 snapshot.
measurable_gain: CI validates the current reviewed Track C contract shape with a dated audit checkpoint, while preserving the prior reminder-state checkpoint for traceability.
impacted_endpoints: no intended externally visible endpoint payload change; reviewed Track C files remain examples/esign/stores/contracts.go, examples/esign/stores/models.go, examples/esign/stores/memory.go, examples/esign/services/agreement_service.go, and examples/esign/modules/panel_repositories.go.
backend_tests: go test ./examples/esign/release -count=1
frontend_tests: N/A (no frontend contract payload change in this guard refresh)
contract_hash: f6f71723dfcd3a5d8732c9d51d3dd1ed36206fbd981a59b2ef4e70acf88838c9
related_adr: docs/GUIDES_ESIGN_ADR_0001_FLAGSHIP_CONSTRAINTS.md
