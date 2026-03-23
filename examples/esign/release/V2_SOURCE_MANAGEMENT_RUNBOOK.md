# V2 Source Management Runbook

## Diagnose Source-Browser Read Failures

1. Run `"/Users/goliatone/.g/go/bin/go" test ./examples/esign/release -run TestRunSourceManagementValidationProfileCoversPhase14LandingZone -count=1` to confirm the fresh-environment source-management landing zone still boots and reads correctly.
2. If the validation fails before fixture seeding, inspect persistence bootstrap and verify the canonical lineage tables (`source_documents`, `source_handles`, `source_revisions`, `source_relationships`, and `source_comment_*`) exist in the target database.
3. If source list or source detail reads fail after bootstrapping, query the canonical source ids from the seeded QA scenario and confirm `tenant_id` and `org_id` match the current runtime scope.

## Diagnose Contract Mismatches

1. Run `"/Users/goliatone/.g/go/bin/go" test ./examples/esign/release -run 'TestV2SourceManagementContractManifest|TestValidateV2ContractFreezeGuard' -count=1`.
2. If the manifest snapshot drifts, review `examples/esign/services/lineage_contracts.go`, `examples/esign/handlers/register_lineage_routes.go`, and `pkg/client/assets/tests/fixtures/esign_lineage_phase11/contract_fixtures.json` together before changing the frozen hash.
3. Do not update `examples/esign/release/v2_contract_freeze_guard.json` without adding a matching review entry to `examples/esign/release/V2_SOURCE_MANAGEMENT_CONTRACT_LEDGER.md`.

## Diagnose Comment Sync Drift

1. Check `source_comment_sync_states` for the affected `source_revision_id` and confirm `sync_status`, `thread_count`, `message_count`, `last_attempt_at`, and `last_synced_at` match the expected provider sync event.
2. If source comments are present but the page is empty, re-run the release validation profile and compare `source_comment_threads` and `source_comment_messages` against the revision-scoped comments payload.
3. If the sync state is stale or failed, replay the revision sync through the source-management replay service before investigating frontend rendering.

## Diagnose Search Indexing Regressions

1. Run `"/Users/goliatone/.g/go/bin/go" test ./examples/esign -run 'TestRuntimeSourceManagementPagesBootWithSeededContracts|TestRuntimeSourceSearchUsesGoSearchWhenLegacySearchStoreIsUnavailable' -count=1` to confirm the live runtime search page still boots through `../go-search`.
2. Verify search still finds the seeded continuity handle (`fixture-google-file-legacy`) and the seeded comment body (`Need legal approval`); those two probes cover handle-driven and comment-driven discovery through the go-search-backed runtime path.
3. If either probe fails, rebuild the source-management go-search index by rerunning the runtime or validation profile, then repeat the probes before investigating template or frontend behavior.

## Diagnose Provider-Neutral Metadata Degradation

1. Source-management payloads must expose provider data only through `provider.kind`, `provider.label`, and `provider.extension`; they must not reintroduce `google_*` transport fields.
2. Run `"/Users/goliatone/.g/go/bin/go" test ./examples/esign/release -run 'TestRunSourceManagementValidationProfileCoversPhase14LandingZone|TestV2SourceManagementContractManifestJSONRemainsProviderNeutral' -count=1`.
3. If a response introduces provider-specific keys, treat it as a contract regression and update the manifest, fixtures, guard, and ledger only after backend review.
