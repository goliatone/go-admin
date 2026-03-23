# V2 Source Management Contract Ledger

## V2-SM-2026-03-22-001

reviewed_contract_hash: 7bf742470aee564111cd5946ba7740d14a93063b061ccde6e33a0f36ec0d60da
freeze_date: 2026-02-16
approved_by: backend-release-owner
approval_ref: SM-V2-2026-03-22-001
contract_scope:
- Source browser list/detail/read-history contracts
- Source workspace and related-agreement contracts
- Source relationship summary contracts
- Reconciliation queue backlog/detail contracts
- Queue-driven operator review actions and audit semantics
- Merge, reject, supersede, and extractor-aware suppression policies
- Source search contracts
- Source comment contracts
impacted_endpoints:
- GET /admin/api/v1/esign/sources
- GET /admin/api/v1/esign/sources/:source_document_id
- GET /admin/api/v1/esign/sources/:source_document_id/workspace
- GET /admin/api/v1/esign/sources/:source_document_id/revisions
- GET /admin/api/v1/esign/sources/:source_document_id/relationships
- GET /admin/api/v1/esign/sources/:source_document_id/agreements
- GET /admin/api/v1/esign/sources/:source_document_id/handles
- GET /admin/api/v1/esign/sources/:source_document_id/comments
- GET /admin/api/v1/esign/source-revisions/:source_revision_id
- GET /admin/api/v1/esign/source-revisions/:source_revision_id/artifacts
- GET /admin/api/v1/esign/source-revisions/:source_revision_id/comments
- GET /admin/api/v1/esign/source-search
- GET /admin/api/v1/esign/reconciliation-queue
- GET /admin/api/v1/esign/reconciliation-queue/:relationship_id
- POST /admin/api/v1/esign/reconciliation-queue/:relationship_id/review
backend_tests:
- TestV2SourceManagementContractManifestSnapshot
- TestValidateV2ContractFreezeGuardPassesForCurrentSnapshot
- TestRunSourceManagementValidationProfileCoversPhase18ExitProfile
- TestValidateV2SourceManagementStartupRequiresGoSearchWiring
- TestGoogleIntegrationImportDocumentSyncsSourceCommentsAndSearchWhenConfigured
- TestGoogleIntegrationSyncSourceRevisionCommentsPersistsFailureStateOnProviderError
- TestSourceSearchAgreementRefreshServiceReindexesUpdatedAgreementTitle
- TestDefaultSourceReadModelServiceBuildsSourceManagementReadModels
- TestDefaultSourceReadModelServiceBuildsReconciliationQueueReadModels
- TestDefaultSourceReconciliationServiceMergeActionMarksDuplicateMergedAndPreservesAgreementHistory
- TestDefaultSourceReconciliationServiceRejectedCandidateReopensWhenExtractorVersionChanges
- TestRegisterReconciliationQueueRoutesExposeQueueDetailAndReviewAction
- TestRegisterReconciliationQueueReviewReturnsConflictForResolvedCandidate
- TestGoSearchSourceProjectorPublishesSourceAndRevisionDocumentsWithPhase16Fields
- TestGoSearchSourceProjectorParityMatchesInMemoryAndSQLiteFixtures
fixtures:
- pkg/client/assets/tests/fixtures/esign_lineage_phase11/contract_fixtures.json
- examples/esign/fixtures/lineage_runtime.go
runbook:
- examples/esign/release/V2_SOURCE_MANAGEMENT_RUNBOOK.md
