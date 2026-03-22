# V2 Source Management Contract Ledger

## V2-SM-2026-03-22-001

reviewed_contract_hash: 276d5ad0c8a6296b8459667f69badae06d8c1f0d6e0dcc1fa994ca17044a00af
freeze_date: 2026-02-16
approved_by: backend-release-owner
approval_ref: SM-V2-2026-03-22-001
contract_scope:
- Source browser list/detail/read-history contracts
- Source relationship summary contracts
- Source search contracts
- Source comment contracts
impacted_endpoints:
- GET /admin/api/v1/esign/sources
- GET /admin/api/v1/esign/sources/:source_document_id
- GET /admin/api/v1/esign/sources/:source_document_id/revisions
- GET /admin/api/v1/esign/sources/:source_document_id/relationships
- GET /admin/api/v1/esign/sources/:source_document_id/handles
- GET /admin/api/v1/esign/sources/:source_document_id/comments
- GET /admin/api/v1/esign/source-revisions/:source_revision_id
- GET /admin/api/v1/esign/source-revisions/:source_revision_id/artifacts
- GET /admin/api/v1/esign/source-revisions/:source_revision_id/comments
- GET /admin/api/v1/esign/source-search
backend_tests:
- TestV2SourceManagementContractManifestSnapshot
- TestValidateV2ContractFreezeGuardPassesForCurrentSnapshot
- TestRunSourceManagementValidationProfileCoversPhase14LandingZone
- TestValidateV2SourceManagementStartupRequiresSearchStoreReadiness
fixtures:
- pkg/client/assets/tests/fixtures/esign_lineage_phase11/contract_fixtures.json
- examples/esign/fixtures/lineage_runtime.go
runbook:
- examples/esign/release/V2_SOURCE_MANAGEMENT_RUNBOOK.md
