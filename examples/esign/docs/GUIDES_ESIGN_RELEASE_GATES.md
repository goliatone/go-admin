# E-Sign Release Gates (Phase 12 Backend)

This guide defines backend release-gate enforcement artifacts for Track A Phase 12.

## Release Checklist Enforcement

Machine-readable checklist:

- `examples/esign/release/phase12_release_checklist.json`

Validation code and tests:

- `examples/esign/release/checklist.go`
- `examples/esign/release/checklist_test.go`

Run:

```sh
"/Users/goliatone/.g/go/bin/go" test ./examples/esign/release -run 'TestChecklistValidateRejectsUnapprovedSignoffs|TestChecklistValidatePassesForApprovedChecklist|TestValidateChecklistFileTemplateShowsPendingApprovals'
```

Expected outcome:

- Checklist cannot pass until BE/FE/QA/Ops sign-offs are explicitly approved.
- Checklist fails if any high-severity security item remains open.
- Checklist fails if runtime requires mock/demo dependencies or manual data patching.
- Checklist fails if runtime still requires API-only fallback for the normal recipient signing path.
- Checklist fails if runtime exposes legacy signer runtime paths (removed in v2).

## Staged Rollout Validation

Validation profile runner:

- `examples/esign/release/validation.go`
- `examples/esign/release/validation_test.go`

Run:

```sh
"/Users/goliatone/.g/go/bin/go" test ./examples/esign/release -run TestRunValidationProfilePassesSLOGates -v
```

The profile executes send/sign/finalize lifecycle flows at production-like sample size (`AgreementCount=120` in test).

Latest local validation run (2026-02-10):

- agreements: `120`
- elapsed: `43.4255ms`
- admin read p95: `0.00ms`
- send p95: `0.00ms`
- finalize p99: `0.00ms`
- email dispatch p99: `0.00ms`
- monthly job success: `100.00%`

## Load Profile (Send/Sign/Finalize)

Benchmark:

- `examples/esign/release/validation_benchmark_test.go`

Run:

```sh
"/Users/goliatone/.g/go/bin/go" test ./examples/esign/release -run '^$' -bench BenchmarkValidationProfileSendSignFinalize -benchtime=15x -count=1
```

Use benchmark output as performance evidence for release gating.

Latest local benchmark run (2026-02-10):

- `BenchmarkValidationProfileSendSignFinalize-10 15 43206 ns/op`

## Security Review

Security regression commands:

```sh
"/Users/goliatone/.g/go/bin/go" test ./examples/esign/handlers ./examples/esign/stores ./examples/esign/modules ./examples/esign/release
```

High-severity release policy:

- `high_severity_open` in checklist must remain `0` before go/no-go.

## SLO Go/No-Go Gate

The checklist validator runs numeric SLO gate enforcement through:

- `observability.EvaluateSLO(...)`

SLO thresholds enforced:

- Admin read p95 <= 400ms
- Send enqueue p95 <= 700ms
- Email dispatch start p99 <= 60s
- Finalize completion p99 <= 120s
- Monthly job success >= 99.5%

## Productization Recipient-Path Gate

Release go/no-go requires zero API-only fallback for normal recipient signing:

1. Public signer path (`/sign/:token`) is available and exercised in smoke/E2E evidence.
2. Signer submits through web-linked flow without operator-side manual API tooling.
3. Checklist runtime field `api_only_fallback_detected` remains `false`.
4. Checklist runtime field `legacy_runtime_path_active` remains `false`.

## Track C V2 Rollback Rehearsal Gate

Track C schema cutover requires rollback rehearsal evidence:

1. Operator checklist: `docs/GUIDES_ESIGN_V2_SCHEMA_ROLLBACK_CHECKLIST.md`
2. Evidence artifact: `docs/artifacts/ESIGN_V2_SCHEMA_ROLLBACK_REHEARSAL_2026-02-15.md`
3. Contract guard snapshot: `examples/esign/release/trackc_contract_guard.json`
4. Contract ledger entry: `docs/GUIDES_ESIGN_TRACK_C_CONTRACT_LEDGER.md#tc-2026-02-15-001`

## Launch Handoff Dependencies

Final launch go/no-go remains blocked until:

1. Checklist sign-offs in `examples/esign/release/phase12_release_checklist.json` are set to approved with timestamps.
2. Staging validation evidence is attached by Ops/QA in release ticket references.
3. Launch-window handoff is completed using `docs/GUIDES_ESIGN_LAUNCH_WINDOW_PLAYBOOK.md`.
