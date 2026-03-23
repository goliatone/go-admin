# V2 Source Management Runbook

## Baseline Validation

1. Run `"/Users/goliatone/.g/go/bin/go" test ./examples/esign/release -run TestRunSourceManagementValidationProfileCoversPhase18ExitProfile -count=1`.
2. Treat that profile as the release gate for the fresh-environment QA path: it seeds the canonical source scenario, verifies go-search readiness, checks legacy-handle/normalized-text/agreement-title/comment search, reads the reconciliation queue, and applies one queue review action.
3. In long-lived environments, run the same profile first. If it fails only because existing data drifts from the seeded scenario, continue with the targeted procedures below instead of updating fixtures or guards.

## Source-Browser Routing Issues

1. Confirm the runtime routes still publish `/admin/esign/sources`, `/admin/esign/source-search`, and `/admin/esign/reconciliation-queue`.
2. Re-run `"/Users/goliatone/.g/go/bin/go" test ./examples/esign -run 'TestRuntimeSourceManagementPagesBootWithSeededContracts|TestRuntimeSourceSearchUsesGoSearchWhenLegacySearchStoreIsUnavailable' -count=1`.
3. If list/detail routes fail after bootstrap, verify the active `tenant_id` and `org_id` match the canonical source seeded by `examples/esign/fixtures/lineage_runtime.go`.

## Go-Search Provider Drift

1. Query go-search health/stats through the release validator or by exercising the source-search page until the provider snapshot is emitted.
2. Confirm the index for `esign_source_management` is `ready` and carries documents for both canonical source and revision-scoped records.
3. If health is degraded in a fresh environment, rebuild by rerunning the validation profile. In long-lived environments, reindex the affected source document or revision after checking provider storage and registration wiring.
4. Validate the four operator probes after reindex: `fixture-google-file-legacy`, `fixture normalized text for repeated revision`, `Imported Fixture Agreement Rev 2`, and `Need legal approval`.

## Queue Drift

1. Read `/admin/esign/reconciliation-queue` and the candidate detail endpoint for the affected `relationship_id`.
2. If backlog counts drift, compare `source_relationships.status`, `confidence_band`, and review audit metadata against the queue filters the operator used.
3. If a candidate should have left the queue but is still visible, inspect the most recent review audit entry and confirm the relationship was persisted as `confirmed`, `rejected`, or `superseded`.
4. In long-lived environments, prefer replaying the exact review action through the review endpoint instead of mutating queue state directly in SQL.

## Comment-Sync Replay

1. Inspect `source_comment_sync_states` for the target `source_revision_id`.
2. Confirm `payload_json` contains a replayable provider-neutral `SourceCommentSyncInput` payload, not just counters or placeholders.
3. If the latest state is failed or stale, replay through the source-management replay service and verify comments, messages, and search documents converge in place.
4. If credential lookup fails, refresh the Google integration credential for the account bound to the active source handle before retrying replay.

## Reconciliation-Driven Reindex

1. Review actions must trigger go-search freshness for every impacted canonical source.
2. After `attach_handle_to_existing_source`, `merge_source_documents`, or `confirm_related_but_distinct`, re-run the search probes for the canonical source and confirm the reviewed candidate no longer appears in queue backlog results.
3. If queue review succeeds but search is stale, reindex the impacted source documents first, then verify the reconciliation queue is empty or updated before investigating UI behavior.

## Agreement-Title Refresh

1. Agreement-title refresh is required whenever a revision-pinned agreement title changes and the source document remains canonical.
2. Reindex the owning source document after the agreement update and validate `Imported Fixture Agreement Rev 2`-style title search still resolves to the canonical source workspace.
3. In fresh environments, the Phase 18 validation profile is enough. In long-lived environments, also confirm the agreement still points at the expected `source_revision_id` and `source_document_id`.

## Contract Drift

1. Run `"/Users/goliatone/.g/go/bin/go" test ./examples/esign/release -run 'TestV2SourceManagementContractManifest|TestValidateV2ContractFreezeGuard' -count=1`.
2. If provider-specific keys reappear, treat it as a backend contract regression. Do not patch the frontend around it.
3. Update the freeze guard and `examples/esign/release/V2_SOURCE_MANAGEMENT_CONTRACT_LEDGER.md` only after the backend contract review is complete.
