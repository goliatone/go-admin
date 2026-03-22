package services

import (
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestDefaultSourceReadModelServiceBuildsDocumentDetails(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	service := NewDefaultSourceReadModelService(store, store, store)

	uploadOnly, err := service.GetDocumentLineageDetail(context.Background(), scope, seeded.uploadOnlyDocumentID)
	if err != nil {
		t.Fatalf("GetDocumentLineageDetail upload-only: %v", err)
	}
	if uploadOnly.EmptyState.Kind != LineageEmptyStateNoSource {
		t.Fatalf("expected upload-only document empty state no_source, got %+v", uploadOnly.EmptyState)
	}
	if uploadOnly.FingerprintStatus.Status != LineageFingerprintStatusNotApplicable {
		t.Fatalf("expected upload-only document fingerprint not_applicable, got %+v", uploadOnly.FingerprintStatus)
	}
	if uploadOnly.SourceDocument != nil || uploadOnly.SourceRevision != nil || uploadOnly.SourceArtifact != nil {
		t.Fatalf("expected upload-only document to omit lineage refs, got %+v", uploadOnly)
	}

	imported, err := service.GetDocumentLineageDetail(context.Background(), scope, seeded.importedDocumentID)
	if err != nil {
		t.Fatalf("GetDocumentLineageDetail imported: %v", err)
	}
	if imported.EmptyState.Kind != LineageEmptyStateNone {
		t.Fatalf("expected imported document empty state none, got %+v", imported.EmptyState)
	}
	if imported.SourceDocument == nil || imported.SourceDocument.ID != seeded.sourceDocumentID {
		t.Fatalf("expected imported document source_document_id %q, got %+v", seeded.sourceDocumentID, imported.SourceDocument)
	}
	if imported.SourceRevision == nil || imported.SourceRevision.ID != seeded.firstSourceRevisionID {
		t.Fatalf("expected imported document source_revision_id %q, got %+v", seeded.firstSourceRevisionID, imported.SourceRevision)
	}
	if imported.SourceArtifact == nil || imported.SourceArtifact.ID != seeded.firstSourceArtifactID {
		t.Fatalf("expected imported document source_artifact_id %q, got %+v", seeded.firstSourceArtifactID, imported.SourceArtifact)
	}
	if imported.GoogleSource == nil || imported.GoogleSource.ExternalFileID != "fixture-google-file-1" {
		t.Fatalf("expected imported document google metadata, got %+v", imported.GoogleSource)
	}
	if imported.GoogleSource.AccountID != "fixture-account-1" || imported.GoogleSource.WebURL != "https://docs.google.com/document/d/fixture-google-file-1/edit" {
		t.Fatalf("expected imported document provenance to stay pinned to first handle, got %+v", imported.GoogleSource)
	}
	if imported.SourceDocument == nil || imported.SourceDocument.URL != "https://docs.google.com/document/d/fixture-google-file-1/edit" {
		t.Fatalf("expected imported document source reference URL to use first handle, got %+v", imported.SourceDocument)
	}
	if imported.FingerprintStatus.Status != LineageFingerprintStatusPending {
		t.Fatalf("expected imported document fingerprint pending, got %+v", imported.FingerprintStatus)
	}
	if imported.FingerprintProcessing.State != LineageFingerprintProcessingRunning {
		t.Fatalf("expected imported document fingerprint processing running fallback, got %+v", imported.FingerprintProcessing)
	}
	if len(imported.CandidateWarningSummary) != 1 {
		t.Fatalf("expected imported document candidate warning, got %+v", imported.CandidateWarningSummary)
	}
	if len(imported.PresentationWarnings) != 2 {
		t.Fatalf("expected imported document presentation warnings, got %+v", imported.PresentationWarnings)
	}
	if imported.PresentationWarnings[0].ActionLabel != "Review in diagnostics" || imported.PresentationWarnings[0].ActionURL != imported.DiagnosticsURL {
		t.Fatalf("expected imported document warning to expose diagnostics review action, got %+v", imported.PresentationWarnings[0])
	}
	if imported.PresentationWarnings[1].Type != "fingerprint_pending" {
		t.Fatalf("expected imported document fingerprint pending presentation warning, got %+v", imported.PresentationWarnings)
	}

	repeated, err := service.GetDocumentLineageDetail(context.Background(), scope, seeded.repeatedImportDocumentID)
	if err != nil {
		t.Fatalf("GetDocumentLineageDetail repeated: %v", err)
	}
	if repeated.SourceDocument == nil || repeated.SourceDocument.ID != seeded.sourceDocumentID {
		t.Fatalf("expected repeated import to resolve same source_document_id, got %+v", repeated.SourceDocument)
	}
	if repeated.SourceRevision == nil || repeated.SourceRevision.ID != seeded.secondSourceRevisionID {
		t.Fatalf("expected repeated import source_revision_id %q, got %+v", seeded.secondSourceRevisionID, repeated.SourceRevision)
	}
	if repeated.SourceArtifact == nil || repeated.SourceArtifact.ID != seeded.secondSourceArtifactID {
		t.Fatalf("expected repeated import source_artifact_id %q, got %+v", seeded.secondSourceArtifactID, repeated.SourceArtifact)
	}
	if repeated.GoogleSource == nil || repeated.GoogleSource.ExternalFileID != "fixture-google-file-2" || repeated.GoogleSource.AccountID != "fixture-account-2" {
		t.Fatalf("expected repeated import provenance to use second handle, got %+v", repeated.GoogleSource)
	}
	if repeated.FingerprintStatus.Status != LineageFingerprintStatusFailed {
		t.Fatalf("expected repeated import fingerprint failed, got %+v", repeated.FingerprintStatus)
	}
	if repeated.FingerprintStatus.ErrorCode == "" || repeated.FingerprintStatus.ErrorMessage == "" {
		t.Fatalf("expected repeated import fingerprint failure details, got %+v", repeated.FingerprintStatus)
	}
	if repeated.FingerprintProcessing.State != LineageFingerprintProcessingFailed {
		t.Fatalf("expected repeated import fingerprint processing failed, got %+v", repeated.FingerprintProcessing)
	}
	if len(repeated.PresentationWarnings) != 2 {
		t.Fatalf("expected repeated import candidate and fingerprint failed warnings, got %+v", repeated.PresentationWarnings)
	}
	if repeated.PresentationWarnings[0].Type != "candidate_relationship" || repeated.PresentationWarnings[1].Type != "fingerprint_failed" {
		t.Fatalf("expected repeated import warning order to preserve candidate precedence, got %+v", repeated.PresentationWarnings)
	}
}

func TestDefaultSourceReadModelServiceBuildsFingerprintProcessingFromDurableJobRuns(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	now := time.Now().UTC()
	if _, _, err := store.EnqueueJob(context.Background(), scope, stores.JobRunEnqueueInput{
		JobName:      "jobs.esign.source_lineage_processing",
		DedupeKey:    "source-lineage|" + seeded.firstSourceRevisionID,
		RequestedAt:  now,
		AvailableAt:  &now,
		ResourceKind: "source_revision",
		ResourceID:   seeded.firstSourceRevisionID,
	}); err != nil {
		t.Fatalf("EnqueueJob: %v", err)
	}

	service := NewDefaultSourceReadModelService(
		store,
		store,
		store,
		WithSourceReadModelJobRuns(store),
	)

	imported, err := service.GetDocumentLineageDetail(context.Background(), scope, seeded.importedDocumentID)
	if err != nil {
		t.Fatalf("GetDocumentLineageDetail imported: %v", err)
	}
	if imported.FingerprintProcessing.State != LineageFingerprintProcessingQueued {
		t.Fatalf("expected imported document fingerprint processing queued, got %+v", imported.FingerprintProcessing)
	}
	if imported.FingerprintStatus.Status != LineageFingerprintStatusPending {
		t.Fatalf("expected queued fingerprint processing to map to pending fingerprint status, got %+v", imported.FingerprintStatus)
	}
}

func TestDefaultSourceReadModelServiceBuildsAgreementDetails(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	service := NewDefaultSourceReadModelService(store, store, store)

	imported, err := service.GetAgreementLineageDetail(context.Background(), scope, seeded.importedAgreementID)
	if err != nil {
		t.Fatalf("GetAgreementLineageDetail imported: %v", err)
	}
	if imported.EmptyState.Kind != LineageEmptyStateNone {
		t.Fatalf("expected imported agreement empty state none, got %+v", imported.EmptyState)
	}
	if imported.SourceRevision == nil || imported.SourceRevision.ID != seeded.firstSourceRevisionID {
		t.Fatalf("expected imported agreement pinned revision %q, got %+v", seeded.firstSourceRevisionID, imported.SourceRevision)
	}
	if imported.PinnedSourceRevisionID != seeded.firstSourceRevisionID {
		t.Fatalf("expected imported agreement pinned_source_revision_id %q, got %+v", seeded.firstSourceRevisionID, imported)
	}
	if imported.SourceDocument == nil || imported.SourceDocument.ID != seeded.sourceDocumentID {
		t.Fatalf("expected imported agreement source_document_id %q, got %+v", seeded.sourceDocumentID, imported.SourceDocument)
	}
	if imported.GoogleSource == nil || imported.GoogleSource.ExternalFileID != "fixture-google-file-1" || imported.GoogleSource.AccountID != "fixture-account-1" {
		t.Fatalf("expected imported agreement provenance to stay pinned to first handle, got %+v", imported.GoogleSource)
	}
	if imported.LinkedDocumentArtifact == nil || imported.LinkedDocumentArtifact.ID != seeded.firstSourceArtifactID {
		t.Fatalf("expected imported agreement artifact %q, got %+v", seeded.firstSourceArtifactID, imported.LinkedDocumentArtifact)
	}
	if !imported.NewerSourceExists {
		t.Fatalf("expected imported agreement to detect newer source")
	}
	if imported.NewerSourceSummary == nil || !imported.NewerSourceSummary.Exists {
		t.Fatalf("expected imported agreement newer source summary, got %+v", imported.NewerSourceSummary)
	}
	if imported.NewerSourceSummary.PinnedSourceRevisionID != seeded.firstSourceRevisionID || imported.NewerSourceSummary.LatestSourceRevisionID != seeded.secondSourceRevisionID {
		t.Fatalf("expected imported agreement newer source summary ids, got %+v", imported.NewerSourceSummary)
	}
	if len(imported.CandidateWarningSummary) != 1 {
		t.Fatalf("expected imported agreement candidate warning, got %+v", imported.CandidateWarningSummary)
	}
	if len(imported.PresentationWarnings) != 2 {
		t.Fatalf("expected imported agreement presentation warnings, got %+v", imported.PresentationWarnings)
	}
	if imported.PresentationWarnings[0].ActionLabel != "Review in diagnostics" || imported.PresentationWarnings[0].ActionURL != imported.DiagnosticsURL {
		t.Fatalf("expected imported agreement warning to expose diagnostics review action, got %+v", imported.PresentationWarnings[0])
	}
	if imported.PresentationWarnings[1].Type != "newer_source_exists" {
		t.Fatalf("expected imported agreement newer-source presentation warning, got %+v", imported.PresentationWarnings)
	}

	agreementService := NewAgreementService(store)
	laterAgreement, err := agreementService.CreateDraft(context.Background(), scope, CreateDraftInput{
		DocumentID:      seeded.repeatedImportDocumentID,
		Title:           "Later Agreement From Linked Document",
		CreatedByUserID: "fixture-user",
	})
	if err != nil {
		t.Fatalf("CreateDraft later agreement: %v", err)
	}
	if strings.TrimSpace(laterAgreement.SourceRevisionID) != seeded.secondSourceRevisionID {
		t.Fatalf("expected CreateDraft to pin latest document revision %q, got %+v", seeded.secondSourceRevisionID, laterAgreement)
	}

	laterDetail, err := service.GetAgreementLineageDetail(context.Background(), scope, laterAgreement.ID)
	if err != nil {
		t.Fatalf("GetAgreementLineageDetail later-created: %v", err)
	}
	if laterDetail.SourceRevision == nil || laterDetail.SourceRevision.ID != seeded.secondSourceRevisionID {
		t.Fatalf("expected later-created agreement pinned revision %q, got %+v", seeded.secondSourceRevisionID, laterDetail.SourceRevision)
	}
	if laterDetail.PinnedSourceRevisionID != seeded.secondSourceRevisionID {
		t.Fatalf("expected later-created agreement pinned_source_revision_id %q, got %+v", seeded.secondSourceRevisionID, laterDetail)
	}
	if laterDetail.LinkedDocumentArtifact == nil || laterDetail.LinkedDocumentArtifact.ID != seeded.secondSourceArtifactID {
		t.Fatalf("expected later-created agreement artifact %q, got %+v", seeded.secondSourceArtifactID, laterDetail.LinkedDocumentArtifact)
	}
	if laterDetail.NewerSourceExists {
		t.Fatalf("expected later-created agreement to be pinned to latest source")
	}
	if laterDetail.NewerSourceSummary == nil || laterDetail.NewerSourceSummary.Exists {
		t.Fatalf("expected later-created agreement newer source summary to report pinned latest revision, got %+v", laterDetail.NewerSourceSummary)
	}
}

func TestDefaultSourceReadModelServiceRequiresPinnedAgreementRevision(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	service := NewDefaultSourceReadModelService(store, store, store)

	agreement, err := store.CreateDraft(context.Background(), scope, stores.AgreementRecord{
		ID:                 "agr-missing-pin",
		DocumentID:         seeded.importedDocumentID,
		Status:             stores.AgreementStatusDraft,
		Title:              "Agreement Missing Pinned Revision",
		CreatedByUserID:    "fixture-user",
		UpdatedByUserID:    "fixture-user",
		CreatedAt:          time.Date(2026, time.March, 18, 21, 0, 0, 0, time.UTC),
		UpdatedAt:          time.Date(2026, time.March, 18, 21, 0, 0, 0, time.UTC),
		SourceRevisionID:   "",
		SourceType:         stores.SourceTypeGoogleDrive,
		SourceGoogleFileID: "fixture-google-file-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft missing-pin agreement: %v", err)
	}

	detail, err := service.GetAgreementLineageDetail(context.Background(), scope, agreement.ID)
	if err != nil {
		t.Fatalf("GetAgreementLineageDetail missing-pin: %v", err)
	}
	if detail.EmptyState.Kind != LineageEmptyStateNoSource {
		t.Fatalf("expected missing-pin agreement to remain empty-state, got %+v", detail.EmptyState)
	}
	if detail.PinnedSourceRevisionID != "" {
		t.Fatalf("expected missing-pin agreement to omit pinned revision, got %+v", detail)
	}
	if detail.SourceRevision != nil || detail.SourceDocument != nil || detail.LinkedDocumentArtifact != nil {
		t.Fatalf("expected missing-pin agreement to omit lineage details, got %+v", detail)
	}
}

func TestCandidateWarningSummaryFromRelationshipSupportsCanonicalAndLegacyWebURLEvidenceKeys(t *testing.T) {
	relationship := stores.SourceRelationshipRecord{
		ID:             "src-rel-web-url",
		Status:         stores.SourceRelationshipStatusPendingReview,
		ConfidenceBand: stores.LineageConfidenceBandMedium,
		EvidenceJSON:   `{"candidate_reason":"matching_title_with_partial_google_context","web_url_match":"true","drive_match":"false"}`,
	}
	summary := candidateWarningSummaryFromRelationship(relationship)
	if !containsCandidateEvidence(summary.Evidence, lineageEvidenceKeyWebURLMatch, "Source URL history", "true") {
		t.Fatalf("expected canonical web_url_match evidence, got %+v", summary.Evidence)
	}

	legacy := stores.SourceRelationshipRecord{
		ID:             "src-rel-web-url-legacy",
		Status:         stores.SourceRelationshipStatusPendingReview,
		ConfidenceBand: stores.LineageConfidenceBandMedium,
		EvidenceJSON:   `{"candidate_reason":"matching_title_with_partial_google_context","web_url":"true","drive_match":"false"}`,
	}
	legacySummary := candidateWarningSummaryFromRelationship(legacy)
	if !containsCandidateEvidence(legacySummary.Evidence, lineageEvidenceKeyWebURLMatch, "Source URL history", "true") {
		t.Fatalf("expected legacy web_url evidence to map to canonical summary, got %+v", legacySummary.Evidence)
	}
}

func TestDefaultSourceReadModelServiceBuildsSourceManagementReadModels(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	service := NewDefaultSourceReadModelService(store, store, store)

	sources, err := service.ListSources(context.Background(), scope, SourceListQuery{})
	if err != nil {
		t.Fatalf("ListSources: %v", err)
	}
	if len(sources.Items) < 1 {
		t.Fatalf("expected at least one source list item, got %+v", sources)
	}
	if sources.Items[0].Source == nil || strings.TrimSpace(sources.Items[0].Source.ID) == "" {
		t.Fatalf("expected source list item source reference, got %+v", sources.Items[0])
	}
	if sources.Items[0].Provider == nil || strings.TrimSpace(sources.Items[0].Provider.Kind) == "" {
		t.Fatalf("expected source list provider summary, got %+v", sources.Items[0])
	}
	if sources.Items[0].Permissions.CanViewDiagnostics || sources.Items[0].Permissions.CanOpenProviderLinks || sources.Items[0].Permissions.CanReviewCandidates || sources.Items[0].Permissions.CanViewComments {
		t.Fatalf("expected direct source list service permissions to remain transport-neutral, got %+v", sources.Items[0].Permissions)
	}
	if sources.PageInfo.Mode != SourceManagementPaginationModePage {
		t.Fatalf("expected page mode pagination, got %+v", sources.PageInfo)
	}

	detail, err := service.GetSourceDetail(context.Background(), scope, seeded.sourceDocumentID)
	if err != nil {
		t.Fatalf("GetSourceDetail: %v", err)
	}
	if detail.Source == nil || detail.Source.ID != seeded.sourceDocumentID {
		t.Fatalf("expected source detail for %q, got %+v", seeded.sourceDocumentID, detail)
	}
	if detail.ActiveHandle == nil || detail.ActiveHandle.ID != seeded.secondSourceHandleID {
		t.Fatalf("expected source detail active handle %q, got %+v", seeded.secondSourceHandleID, detail.ActiveHandle)
	}
	if detail.LatestRevision == nil || detail.LatestRevision.ID != seeded.secondSourceRevisionID {
		t.Fatalf("expected source detail latest revision %q, got %+v", seeded.secondSourceRevisionID, detail.LatestRevision)
	}
	if !containsString(detail.LatestRevision.HistoryLabels, SourceRevisionHistoryLabelLatest) || !containsString(detail.LatestRevision.HistoryLabels, SourceRevisionHistoryLabelPinned) {
		t.Fatalf("expected source detail latest revision labels to include latest and pinned, got %+v", detail.LatestRevision)
	}
	if detail.Permissions.CanViewDiagnostics || detail.Permissions.CanOpenProviderLinks || detail.Permissions.CanReviewCandidates || detail.Permissions.CanViewComments {
		t.Fatalf("expected direct source detail permissions to remain transport-neutral, got %+v", detail.Permissions)
	}

	revisions, err := service.ListSourceRevisions(context.Background(), scope, seeded.sourceDocumentID, SourceRevisionListQuery{})
	if err != nil {
		t.Fatalf("ListSourceRevisions: %v", err)
	}
	if len(revisions.Items) != 2 {
		t.Fatalf("expected two revisions, got %+v", revisions)
	}
	if !revisions.Items[0].IsLatest || revisions.Items[0].Revision == nil || revisions.Items[0].Revision.ID != seeded.secondSourceRevisionID {
		t.Fatalf("expected latest revision first, got %+v", revisions.Items)
	}
	if !containsString(revisions.Items[0].Revision.HistoryLabels, SourceRevisionHistoryLabelLatest) || !containsString(revisions.Items[0].Revision.HistoryLabels, SourceRevisionHistoryLabelPinned) {
		t.Fatalf("expected latest revision labels to include latest and pinned, got %+v", revisions.Items[0].Revision)
	}
	if revisions.Items[1].Revision == nil || revisions.Items[1].Revision.ID != seeded.firstSourceRevisionID {
		t.Fatalf("expected earlier revision second, got %+v", revisions.Items)
	}
	if !containsString(revisions.Items[1].Revision.HistoryLabels, SourceRevisionHistoryLabelPinned) || !containsString(revisions.Items[1].Revision.HistoryLabels, SourceRevisionHistoryLabelSuperseded) {
		t.Fatalf("expected earlier revision labels to include pinned and superseded, got %+v", revisions.Items[1].Revision)
	}
	if revisions.Items[1].Revision.PinnedDocumentCount != 1 || revisions.Items[1].Revision.PinnedAgreementCount != 1 {
		t.Fatalf("expected earlier revision pin counts to reflect document/agreement provenance, got %+v", revisions.Items[1].Revision)
	}

	relationships, err := service.ListSourceRelationships(context.Background(), scope, seeded.sourceDocumentID, SourceRelationshipListQuery{})
	if err != nil {
		t.Fatalf("ListSourceRelationships: %v", err)
	}
	if len(relationships.Items) != 4 {
		t.Fatalf("expected four relationships, got %+v", relationships)
	}
	relationshipByID := make(map[string]SourceRelationshipSummary, len(relationships.Items))
	for _, item := range relationships.Items {
		relationshipByID[item.ID] = item
	}
	if candidate := relationshipByID[seeded.candidateRelationshipID]; candidate.CounterpartSource == nil || candidate.CounterpartSource.ID != "src-doc-candidate" || candidate.RelationshipKind != SourceRelationshipKindContinuity || candidate.CounterpartRole != SourceRelationshipRolePredecessor {
		t.Fatalf("expected continuity predecessor relationship summary, got %+v", candidate)
	}
	if copied := relationshipByID[seeded.copyRelationshipID]; copied.RelationshipKind != SourceRelationshipKindCopy || copied.CounterpartRole != SourceRelationshipRolePredecessor {
		t.Fatalf("expected copy predecessor relationship summary, got %+v", copied)
	}
	if transferred := relationshipByID[seeded.transferRelationshipID]; transferred.RelationshipKind != SourceRelationshipKindTransfer || transferred.CounterpartRole != SourceRelationshipRoleSuccessor {
		t.Fatalf("expected transfer successor relationship summary, got %+v", transferred)
	}
	if forked := relationshipByID[seeded.forkRelationshipID]; forked.RelationshipKind != SourceRelationshipKindFork || forked.CounterpartRole != SourceRelationshipRoleSuccessor {
		t.Fatalf("expected fork successor relationship summary, got %+v", forked)
	}

	handles, err := service.ListSourceHandles(context.Background(), scope, seeded.sourceDocumentID)
	if err != nil {
		t.Fatalf("ListSourceHandles: %v", err)
	}
	if len(handles.Items) != 2 {
		t.Fatalf("expected two handles, got %+v", handles)
	}

	revisionDetail, err := service.GetSourceRevisionDetail(context.Background(), scope, seeded.secondSourceRevisionID)
	if err != nil {
		t.Fatalf("GetSourceRevisionDetail: %v", err)
	}
	if revisionDetail.Revision == nil || revisionDetail.Revision.ID != seeded.secondSourceRevisionID {
		t.Fatalf("expected revision detail for %q, got %+v", seeded.secondSourceRevisionID, revisionDetail)
	}
	if revisionDetail.Provider == nil || revisionDetail.Provider.Extension == nil {
		t.Fatalf("expected provider-neutral extension envelope, got %+v", revisionDetail.Provider)
	}
	if !containsString(revisionDetail.Revision.HistoryLabels, SourceRevisionHistoryLabelLatest) || !containsString(revisionDetail.Revision.HistoryLabels, SourceRevisionHistoryLabelPinned) {
		t.Fatalf("expected revision detail labels to include latest and pinned, got %+v", revisionDetail.Revision)
	}

	artifacts, err := service.ListSourceRevisionArtifacts(context.Background(), scope, seeded.secondSourceRevisionID)
	if err != nil {
		t.Fatalf("ListSourceRevisionArtifacts: %v", err)
	}
	if len(artifacts.Items) != 1 || artifacts.Items[0].ID != seeded.secondSourceArtifactID {
		t.Fatalf("expected artifact list to expose %q, got %+v", seeded.secondSourceArtifactID, artifacts.Items)
	}

	comments, err := service.ListSourceRevisionComments(context.Background(), scope, seeded.secondSourceRevisionID, SourceCommentListQuery{})
	if err != nil {
		t.Fatalf("ListSourceRevisionComments: %v", err)
	}
	if comments.SyncStatus != SourceManagementCommentSyncNotConfigured {
		t.Fatalf("expected source comments not_configured, got %+v", comments)
	}
	if comments.EmptyState.Kind != LineageEmptyStateNoComments {
		t.Fatalf("expected no-comments empty state, got %+v", comments.EmptyState)
	}
	if comments.Permissions.CanViewDiagnostics || comments.Permissions.CanOpenProviderLinks || comments.Permissions.CanReviewCandidates || comments.Permissions.CanViewComments {
		t.Fatalf("expected direct source comment permissions to remain transport-neutral, got %+v", comments.Permissions)
	}

	searchResults, err := service.SearchSources(context.Background(), scope, SourceSearchQuery{Query: "fixture-google-file-2"})
	if err != nil {
		t.Fatalf("SearchSources: %v", err)
	}
	if len(searchResults.Items) == 0 {
		t.Fatalf("expected at least one search result, got %+v", searchResults)
	}
	foundPrimarySource := false
	for _, item := range searchResults.Items {
		if item.Source != nil && item.Source.ID == seeded.sourceDocumentID {
			foundPrimarySource = true
			break
		}
	}
	if !foundPrimarySource {
		t.Fatalf("expected search results to include source %q, got %+v", seeded.sourceDocumentID, searchResults.Items)
	}

	revisionSearchResults, err := service.SearchSources(context.Background(), scope, SourceSearchQuery{Query: "candidate-v1"})
	if err != nil {
		t.Fatalf("SearchSources revision match: %v", err)
	}
	var revisionResult *SourceSearchResultSummary
	for i := range revisionSearchResults.Items {
		if revisionSearchResults.Items[i].ResultKind == SourceManagementSearchResultSourceRevision {
			revisionResult = &revisionSearchResults.Items[i]
			break
		}
	}
	if revisionResult == nil {
		t.Fatalf("expected a revision-scoped search result, got %+v", revisionSearchResults)
	}
	if revisionResult.Revision == nil || revisionResult.Revision.ID != "src-rev-candidate" {
		t.Fatalf("expected revision search result to reference matched revision %q, got %+v", "src-rev-candidate", revisionResult)
	}
	if got := strings.TrimSpace(revisionResult.Links.Self); got != sourceManagementRevisionPath("src-rev-candidate") {
		t.Fatalf("expected revision search self link %q, got %+v", sourceManagementRevisionPath("src-rev-candidate"), revisionResult.Links)
	}
}

func TestSourceRelationshipSummariesUsePersistedDirectionInsteadOfLatestRevisionTime(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	service := NewDefaultSourceReadModelService(store, store, store)

	relationships, err := service.ListSourceRelationships(context.Background(), scope, seeded.sourceDocumentID, SourceRelationshipListQuery{})
	if err != nil {
		t.Fatalf("ListSourceRelationships before newer counterpart revision: %v", err)
	}
	relationshipByID := make(map[string]SourceRelationshipSummary, len(relationships.Items))
	for _, item := range relationships.Items {
		relationshipByID[item.ID] = item
	}
	if relationshipByID[seeded.copyRelationshipID].CounterpartRole != SourceRelationshipRolePredecessor {
		t.Fatalf("expected copy relationship predecessor role before counterpart changes, got %+v", relationshipByID[seeded.copyRelationshipID])
	}

	newer := time.Date(2026, time.March, 21, 20, 0, 0, 0, time.UTC)
	if _, err := store.CreateSourceHandle(context.Background(), scope, stores.SourceHandleRecord{
		ID:               "src-handle-copy-newer",
		SourceDocumentID: "src-doc-copy",
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "fixture-google-file-copy-newer",
		AccountID:        "fixture-account-copy",
		DriveID:          "fixture-drive-copy",
		WebURL:           "https://docs.google.com/document/d/fixture-google-file-copy-newer/edit",
		HandleStatus:     stores.SourceHandleStatusActive,
		ValidFrom:        &newer,
		CreatedAt:        newer,
		UpdatedAt:        newer,
	}); err != nil {
		t.Fatalf("CreateSourceHandle newer counterpart: %v", err)
	}
	if _, err := store.CreateSourceRevision(context.Background(), scope, stores.SourceRevisionRecord{
		ID:                   "src-rev-copy-newer",
		SourceDocumentID:     "src-doc-copy",
		SourceHandleID:       "src-handle-copy-newer",
		ProviderRevisionHint: "copy-v2",
		ModifiedTime:         &newer,
		ExportedAt:           &newer,
		ExportedByUserID:     "fixture-user",
		SourceMimeType:       "application/vnd.google-apps.document",
		MetadataJSON:         `{"external_file_id":"fixture-google-file-copy-newer","account_id":"fixture-account-copy","title_hint":"Imported Fixture Source Copy","source_version_hint":"copy-v2"}`,
		CreatedAt:            newer,
		UpdatedAt:            newer,
	}); err != nil {
		t.Fatalf("CreateSourceRevision newer counterpart: %v", err)
	}

	relationships, err = service.ListSourceRelationships(context.Background(), scope, seeded.sourceDocumentID, SourceRelationshipListQuery{})
	if err != nil {
		t.Fatalf("ListSourceRelationships after newer counterpart revision: %v", err)
	}
	relationshipByID = make(map[string]SourceRelationshipSummary, len(relationships.Items))
	for _, item := range relationships.Items {
		relationshipByID[item.ID] = item
	}
	if relationshipByID[seeded.copyRelationshipID].CounterpartRole != SourceRelationshipRolePredecessor {
		t.Fatalf("expected persisted predecessor role to remain stable after newer counterpart revision, got %+v", relationshipByID[seeded.copyRelationshipID])
	}
}

func TestDefaultSourceReadModelServiceAppliesSourceManagementFiltersAndPagination(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	service := NewDefaultSourceReadModelService(store, store, store)

	trueValue := true
	filtered, err := service.ListSources(context.Background(), scope, SourceListQuery{
		Query:                "fixture-google-file-2",
		HasPendingCandidates: &trueValue,
		Page:                 1,
		PageSize:             1,
		Sort:                 sourceListSortPendingDesc,
	})
	if err != nil {
		t.Fatalf("ListSources filtered: %v", err)
	}
	if len(filtered.Items) != 1 {
		t.Fatalf("expected one filtered source, got %+v", filtered)
	}
	if filtered.Items[0].Source == nil || filtered.Items[0].Source.ID != seeded.sourceDocumentID {
		t.Fatalf("expected filtered source %q, got %+v", seeded.sourceDocumentID, filtered.Items[0])
	}
	if filtered.PageInfo.TotalCount != 1 || filtered.PageInfo.PageSize != 1 {
		t.Fatalf("expected filtered page info to honor pagination, got %+v", filtered.PageInfo)
	}

	revisions, err := service.ListSourceRevisions(context.Background(), scope, seeded.sourceDocumentID, SourceRevisionListQuery{
		Sort:     sourceRevisionSortOldestAsc,
		Page:     1,
		PageSize: 1,
	})
	if err != nil {
		t.Fatalf("ListSourceRevisions sorted: %v", err)
	}
	if len(revisions.Items) != 1 || revisions.Items[0].Revision == nil || revisions.Items[0].Revision.ID != seeded.firstSourceRevisionID {
		t.Fatalf("expected oldest revision first under oldest_asc, got %+v", revisions.Items)
	}

	relationships, err := service.ListSourceRelationships(context.Background(), scope, seeded.sourceDocumentID, SourceRelationshipListQuery{
		Status:           stores.SourceRelationshipStatusPendingReview,
		RelationshipType: stores.SourceRelationshipTypeSameLogicalDoc,
		Page:             1,
		PageSize:         1,
	})
	if err != nil {
		t.Fatalf("ListSourceRelationships filtered: %v", err)
	}
	if len(relationships.Items) != 1 || relationships.Items[0].Status != stores.SourceRelationshipStatusPendingReview || relationships.Items[0].RelationshipKind != SourceRelationshipKindContinuity {
		t.Fatalf("expected pending-review relationship, got %+v", relationships.Items)
	}

	searchResults, err := service.SearchSources(context.Background(), scope, SourceSearchQuery{
		Query:    "Imported Fixture Source",
		Sort:     sourceSearchSortTitleAsc,
		Page:     1,
		PageSize: 5,
	})
	if err != nil {
		t.Fatalf("SearchSources sorted: %v", err)
	}
	if searchResults.PageInfo.Mode != SourceManagementPaginationModePage {
		t.Fatalf("expected paged search semantics, got %+v", searchResults.PageInfo)
	}
}

func TestPhase12SourceManagementRemainsConsistentWithDocumentAndAgreementProvenanceReads(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	service := NewDefaultSourceReadModelService(store, store, store)

	documentDetail, err := service.GetDocumentLineageDetail(context.Background(), scope, seeded.importedDocumentID)
	if err != nil {
		t.Fatalf("GetDocumentLineageDetail: %v", err)
	}
	agreementDetail, err := service.GetAgreementLineageDetail(context.Background(), scope, seeded.importedAgreementID)
	if err != nil {
		t.Fatalf("GetAgreementLineageDetail: %v", err)
	}
	sourceDetail, err := service.GetSourceDetail(context.Background(), scope, seeded.sourceDocumentID)
	if err != nil {
		t.Fatalf("GetSourceDetail: %v", err)
	}
	revisions, err := service.ListSourceRevisions(context.Background(), scope, seeded.sourceDocumentID, SourceRevisionListQuery{})
	if err != nil {
		t.Fatalf("ListSourceRevisions: %v", err)
	}
	relationships, err := service.ListSourceRelationships(context.Background(), scope, seeded.sourceDocumentID, SourceRelationshipListQuery{})
	if err != nil {
		t.Fatalf("ListSourceRelationships: %v", err)
	}

	if documentDetail.SourceDocument == nil || documentDetail.SourceDocument.ID != sourceDetail.Source.ID {
		t.Fatalf("expected document provenance source %q to match source detail, got %+v", sourceDetail.Source.ID, documentDetail.SourceDocument)
	}
	if agreementDetail.SourceDocument == nil || agreementDetail.SourceDocument.ID != sourceDetail.Source.ID {
		t.Fatalf("expected agreement provenance source %q to match source detail, got %+v", sourceDetail.Source.ID, agreementDetail.SourceDocument)
	}

	revisionByID := make(map[string]SourceRevisionListItem, len(revisions.Items))
	for _, item := range revisions.Items {
		if item.Revision != nil {
			revisionByID[item.Revision.ID] = item
		}
	}
	if documentRevision := revisionByID[documentDetail.SourceRevision.ID]; !containsString(documentRevision.Revision.HistoryLabels, SourceRevisionHistoryLabelPinned) || !containsString(documentRevision.Revision.HistoryLabels, SourceRevisionHistoryLabelSuperseded) {
		t.Fatalf("expected document provenance revision to remain visible in revision history as pinned+superseded, got %+v", documentRevision)
	}
	if agreementRevision := revisionByID[agreementDetail.SourceRevision.ID]; agreementRevision.Revision.PinnedAgreementCount != 1 {
		t.Fatalf("expected agreement provenance revision to report agreement pin count, got %+v", agreementRevision)
	}
	if latestRevision := revisionByID[sourceDetail.LatestRevision.ID]; !containsString(latestRevision.Revision.HistoryLabels, SourceRevisionHistoryLabelLatest) {
		t.Fatalf("expected source detail latest revision to match revision history ordering, got %+v", latestRevision)
	}

	relationshipByID := make(map[string]SourceRelationshipSummary, len(relationships.Items))
	for _, item := range relationships.Items {
		relationshipByID[item.ID] = item
	}
	if candidate := relationshipByID[documentDetail.CandidateWarningSummary[0].ID]; candidate.Status != documentDetail.CandidateWarningSummary[0].Status || candidate.RelationshipKind != SourceRelationshipKindContinuity {
		t.Fatalf("expected document candidate warning to remain consistent with source relationship summary, got %+v", candidate)
	}
	if candidate := relationshipByID[agreementDetail.CandidateWarningSummary[0].ID]; candidate.Status != agreementDetail.CandidateWarningSummary[0].Status || candidate.CounterpartRole != SourceRelationshipRolePredecessor {
		t.Fatalf("expected agreement candidate warning to remain consistent with source relationship summary, got %+v", candidate)
	}
}

func TestPhase12SourceManagementReadModelsMatchInMemoryAndSQLiteStores(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-lineage-phase12", OrgID: "org-lineage-phase12"}

	inMemoryStore := stores.NewInMemoryStore()
	inMemoryFixtures := seedSourceReadModelFixturesInStore(t, inMemoryStore, scope)
	inMemoryService := NewDefaultSourceReadModelService(inMemoryStore, inMemoryStore, inMemoryStore)

	relationalStore, cleanup := openSQLiteSourceReadModelFixtureStore(t)
	defer cleanup()
	relationalFixtures := seedSourceReadModelFixturesInStore(t, relationalStore, scope)
	relationalService := NewDefaultSourceReadModelService(relationalStore, relationalStore, relationalStore)

	inMemorySnapshot := buildSourceManagementParitySnapshot(t, ctx, scope, inMemoryService, inMemoryFixtures)
	relationalSnapshot := buildSourceManagementParitySnapshot(t, ctx, scope, relationalService, relationalFixtures)

	inMemoryJSON, err := json.Marshal(inMemorySnapshot)
	if err != nil {
		t.Fatalf("marshal in-memory snapshot: %v", err)
	}
	relationalJSON, err := json.Marshal(relationalSnapshot)
	if err != nil {
		t.Fatalf("marshal relational snapshot: %v", err)
	}
	if string(inMemoryJSON) != string(relationalJSON) {
		t.Fatalf("expected in-memory and sqlite source-management snapshots to match\nin-memory: %s\nsqlite: %s", string(inMemoryJSON), string(relationalJSON))
	}
}

func containsCandidateEvidence(evidence []CandidateEvidenceSummary, code, label, details string) bool {
	for _, entry := range evidence {
		if entry.Code == code && entry.Label == label && entry.Details == details {
			return true
		}
	}
	return false
}

type sourceManagementParitySnapshot struct {
	ListSources        SourceListPage         `json:"list_sources"`
	SourceDetail       SourceDetail           `json:"source_detail"`
	RevisionHistory    SourceRevisionPage     `json:"revision_history"`
	RelationshipList   SourceRelationshipPage `json:"relationship_list"`
	ProviderHandleList SourceHandlePage       `json:"provider_handle_list"`
}

func buildSourceManagementParitySnapshot(t *testing.T, ctx context.Context, scope stores.Scope, service DefaultSourceReadModelService, fixtures sourceReadModelFixtures) sourceManagementParitySnapshot {
	t.Helper()

	listSources, err := service.ListSources(ctx, scope, SourceListQuery{Sort: sourceListSortUpdatedDesc, Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("ListSources snapshot: %v", err)
	}
	sourceDetail, err := service.GetSourceDetail(ctx, scope, fixtures.sourceDocumentID)
	if err != nil {
		t.Fatalf("GetSourceDetail snapshot: %v", err)
	}
	revisionHistory, err := service.ListSourceRevisions(ctx, scope, fixtures.sourceDocumentID, SourceRevisionListQuery{Sort: sourceRevisionSortLatestDesc, Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("ListSourceRevisions snapshot: %v", err)
	}
	relationshipList, err := service.ListSourceRelationships(ctx, scope, fixtures.sourceDocumentID, SourceRelationshipListQuery{Sort: sourceRelationshipSortConfidence, Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("ListSourceRelationships snapshot: %v", err)
	}
	providerHandleList, err := service.ListSourceHandles(ctx, scope, fixtures.sourceDocumentID)
	if err != nil {
		t.Fatalf("ListSourceHandles snapshot: %v", err)
	}
	return sourceManagementParitySnapshot{
		ListSources:        listSources,
		SourceDetail:       sourceDetail,
		RevisionHistory:    revisionHistory,
		RelationshipList:   relationshipList,
		ProviderHandleList: providerHandleList,
	}
}

func openSQLiteSourceReadModelFixtureStore(t *testing.T) (sourceReadModelFixtureStore, func()) {
	t.Helper()

	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.Postgres.DSN = ""
	cfg.Persistence.SQLite.DSN = "file:" + filepath.Join(t.TempDir(), "source_read_model_phase12.db") + "?_busy_timeout=5000&_foreign_keys=on"

	store, cleanup, err := esignpersistence.OpenStore(context.Background(), cfg)
	if err != nil {
		t.Fatalf("OpenStore sqlite: %v", err)
	}
	fixtureStore, ok := store.(sourceReadModelFixtureStore)
	if !ok {
		if cleanup != nil {
			_ = cleanup()
		}
		t.Fatalf("expected sqlite store to satisfy sourceReadModelFixtureStore")
	}
	return fixtureStore, func() {
		if cleanup != nil {
			_ = cleanup()
		}
	}
}

type sourceReadModelFixtureStore interface {
	stores.DocumentStore
	stores.AgreementStore
	stores.LineageStore
	stores.JobRunStore
}

func seedSourceReadModelFixtures(t *testing.T) (*stores.InMemoryStore, stores.Scope, sourceReadModelFixtures) {
	t.Helper()

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-lineage-read", OrgID: "org-lineage-read"}
	fixtures := seedSourceReadModelFixturesInStore(t, store, scope)
	return store, scope, fixtures
}

func seedSourceReadModelFixturesInStore(t *testing.T, store sourceReadModelFixtureStore, scope stores.Scope) sourceReadModelFixtures {
	t.Helper()

	now := time.Date(2026, time.March, 18, 18, 0, 0, 0, time.UTC)
	second := now.Add(2 * time.Hour)
	earlier := now.Add(-2 * time.Hour)
	later := second.Add(2 * time.Hour)

	fixtures := sourceReadModelFixtures{
		uploadOnlyDocumentID:     "doc-upload-only",
		importedDocumentID:       "doc-imported-v1",
		repeatedImportDocumentID: "doc-imported-v2",
		importedAgreementID:      "agr-imported-v1",
		sourceDocumentID:         "src-doc-1",
		activeSourceHandleID:     "src-handle-1",
		secondSourceHandleID:     "src-handle-2",
		firstSourceRevisionID:    "src-rev-1",
		secondSourceRevisionID:   "src-rev-2",
		firstSourceArtifactID:    "src-art-1",
		secondSourceArtifactID:   "src-art-2",
		candidateRelationshipID:  "src-rel-1",
		copyRelationshipID:       "src-rel-copy",
		transferRelationshipID:   "src-rel-transfer",
		forkRelationshipID:       "src-rel-fork",
	}

	createSourceFamily := func(sourceDocumentID, handleID, revisionID, title, externalFileID, accountID, driveID, revisionHint string, modifiedAt time.Time) {
		t.Helper()
		if _, err := store.CreateSourceDocument(context.Background(), scope, stores.SourceDocumentRecord{
			ID:                sourceDocumentID,
			ProviderKind:      stores.SourceProviderKindGoogleDrive,
			CanonicalTitle:    title,
			Status:            stores.SourceDocumentStatusActive,
			LineageConfidence: stores.LineageConfidenceBandMedium,
			CreatedAt:         modifiedAt,
			UpdatedAt:         modifiedAt,
		}); err != nil {
			t.Fatalf("CreateSourceDocument %s: %v", sourceDocumentID, err)
		}
		if _, err := store.CreateSourceHandle(context.Background(), scope, stores.SourceHandleRecord{
			ID:               handleID,
			SourceDocumentID: sourceDocumentID,
			ProviderKind:     stores.SourceProviderKindGoogleDrive,
			ExternalFileID:   externalFileID,
			AccountID:        accountID,
			DriveID:          driveID,
			WebURL:           "https://docs.google.com/document/d/" + externalFileID + "/edit",
			HandleStatus:     stores.SourceHandleStatusActive,
			ValidFrom:        &modifiedAt,
			CreatedAt:        modifiedAt,
			UpdatedAt:        modifiedAt,
		}); err != nil {
			t.Fatalf("CreateSourceHandle %s: %v", handleID, err)
		}
		if _, err := store.CreateSourceRevision(context.Background(), scope, stores.SourceRevisionRecord{
			ID:                   revisionID,
			SourceDocumentID:     sourceDocumentID,
			SourceHandleID:       handleID,
			ProviderRevisionHint: revisionHint,
			ModifiedTime:         &modifiedAt,
			ExportedAt:           &modifiedAt,
			ExportedByUserID:     "fixture-user",
			SourceMimeType:       "application/vnd.google-apps.document",
			MetadataJSON:         `{"external_file_id":"` + externalFileID + `","account_id":"` + accountID + `","web_url":"https://docs.google.com/document/d/` + externalFileID + `/edit","title_hint":"` + title + `","source_version_hint":"` + revisionHint + `"}`,
			CreatedAt:            modifiedAt,
			UpdatedAt:            modifiedAt,
		}); err != nil {
			t.Fatalf("CreateSourceRevision %s: %v", revisionID, err)
		}
	}

	if _, err := store.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                 fixtures.uploadOnlyDocumentID,
		Title:              "Upload Only Fixture",
		SourceOriginalName: "upload-only.pdf",
		SourceObjectKey:    "tenant/upload-only.pdf",
		SourceSHA256:       strings.Repeat("1", 64),
		SizeBytes:          1024,
		PageCount:          1,
		CreatedByUserID:    "fixture-user",
		CreatedAt:          now,
		UpdatedAt:          now,
	}); err != nil {
		t.Fatalf("Create upload-only document: %v", err)
	}

	if _, err := store.CreateSourceDocument(context.Background(), scope, stores.SourceDocumentRecord{
		ID:                fixtures.sourceDocumentID,
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Imported Fixture Source",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	}); err != nil {
		t.Fatalf("CreateSourceDocument: %v", err)
	}
	createSourceFamily("src-doc-candidate", "src-handle-candidate", "src-rev-candidate", "Imported Fixture Source", "fixture-google-file-candidate", "fixture-account-candidate", "fixture-drive-candidate", "candidate-v1", earlier)
	createSourceFamily("src-doc-copy", "src-handle-copy", "src-rev-copy", "Imported Fixture Source Copy", "fixture-google-file-copy", "fixture-account-copy", "fixture-drive-copy", "copy-v1", earlier.Add(30*time.Minute))
	createSourceFamily("src-doc-transfer", "src-handle-transfer", "src-rev-transfer", "Imported Fixture Source Transfer", "fixture-google-file-transfer", "fixture-account-transfer", "fixture-drive-transfer", "transfer-v3", later)
	createSourceFamily("src-doc-fork", "src-handle-fork", "src-rev-fork", "Imported Fixture Source Fork", "fixture-google-file-fork", "fixture-account-fork", "fixture-drive-fork", "fork-v2", later.Add(30*time.Minute))

	validFrom := now
	if _, err := store.CreateSourceHandle(context.Background(), scope, stores.SourceHandleRecord{
		ID:               fixtures.activeSourceHandleID,
		SourceDocumentID: fixtures.sourceDocumentID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "fixture-google-file-1",
		AccountID:        "fixture-account-1",
		DriveID:          "fixture-drive-root",
		WebURL:           "https://docs.google.com/document/d/fixture-google-file-1/edit",
		HandleStatus:     stores.SourceHandleStatusActive,
		ValidFrom:        &validFrom,
		CreatedAt:        now,
		UpdatedAt:        now,
	}); err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	if _, err := store.CreateSourceRevision(context.Background(), scope, stores.SourceRevisionRecord{
		ID:                   fixtures.firstSourceRevisionID,
		SourceDocumentID:     fixtures.sourceDocumentID,
		SourceHandleID:       fixtures.activeSourceHandleID,
		ProviderRevisionHint: "v1",
		ModifiedTime:         &now,
		ExportedAt:           &now,
		ExportedByUserID:     "fixture-user",
		SourceMimeType:       "application/vnd.google-apps.document",
		MetadataJSON:         `{"origin":"native_google_import","external_file_id":"fixture-google-file-1","account_id":"fixture-account-1","web_url":"https://docs.google.com/document/d/fixture-google-file-1/edit","title_hint":"Imported Fixture Source","owner_email":"owner@example.com","parent_id":"fixture-folder","source_version_hint":"v1"}`,
		CreatedAt:            now,
		UpdatedAt:            now,
	}); err != nil {
		t.Fatalf("CreateSourceRevision first: %v", err)
	}
	if _, err := store.CreateSourceArtifact(context.Background(), scope, stores.SourceArtifactRecord{
		ID:                  fixtures.firstSourceArtifactID,
		SourceRevisionID:    fixtures.firstSourceRevisionID,
		ArtifactKind:        stores.SourceArtifactKindSignablePDF,
		ObjectKey:           "tenant/google-v1.pdf",
		SHA256:              strings.Repeat("a", 64),
		PageCount:           3,
		SizeBytes:           4096,
		CompatibilityTier:   "supported",
		NormalizationStatus: "completed",
		CreatedAt:           now,
		UpdatedAt:           now,
	}); err != nil {
		t.Fatalf("CreateSourceArtifact first: %v", err)
	}
	if _, err := store.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                     fixtures.importedDocumentID,
		Title:                  "Imported Fixture Source",
		SourceOriginalName:     "Imported Fixture Source.pdf",
		SourceObjectKey:        "tenant/google-v1.pdf",
		NormalizedObjectKey:    "tenant/google-v1.normalized.pdf",
		SourceSHA256:           strings.Repeat("a", 64),
		SourceType:             stores.SourceTypeGoogleDrive,
		SourceGoogleFileID:     "fixture-google-file-1",
		SourceGoogleDocURL:     "https://docs.google.com/document/d/fixture-google-file-1/edit",
		SourceModifiedTime:     &now,
		SourceExportedAt:       &now,
		SourceExportedByUserID: "fixture-user",
		SourceMimeType:         "application/vnd.google-apps.document",
		SourceIngestionMode:    GoogleIngestionModeExportPDF,
		SourceDocumentID:       fixtures.sourceDocumentID,
		SourceRevisionID:       fixtures.firstSourceRevisionID,
		SourceArtifactID:       fixtures.firstSourceArtifactID,
		SizeBytes:              4096,
		PageCount:              3,
		CreatedByUserID:        "fixture-user",
		CreatedAt:              now,
		UpdatedAt:              now,
	}); err != nil {
		t.Fatalf("Create imported document: %v", err)
	}
	if _, err := store.CreateDraft(context.Background(), scope, stores.AgreementRecord{
		ID:                     fixtures.importedAgreementID,
		DocumentID:             fixtures.importedDocumentID,
		Title:                  "Imported Fixture Agreement",
		Status:                 stores.AgreementStatusDraft,
		Version:                1,
		SourceType:             stores.SourceTypeGoogleDrive,
		SourceGoogleFileID:     "fixture-google-file-1",
		SourceGoogleDocURL:     "https://docs.google.com/document/d/fixture-google-file-1/edit",
		SourceModifiedTime:     &now,
		SourceExportedAt:       &now,
		SourceExportedByUserID: "fixture-user",
		SourceMimeType:         "application/vnd.google-apps.document",
		SourceIngestionMode:    GoogleIngestionModeExportPDF,
		SourceRevisionID:       fixtures.firstSourceRevisionID,
		CreatedByUserID:        "fixture-user",
		UpdatedByUserID:        "fixture-user",
		CreatedAt:              now,
		UpdatedAt:              now,
	}); err != nil {
		t.Fatalf("Create imported agreement: %v", err)
	}
	if _, err := store.CreateSourceHandle(context.Background(), scope, stores.SourceHandleRecord{
		ID:               fixtures.secondSourceHandleID,
		SourceDocumentID: fixtures.sourceDocumentID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "fixture-google-file-2",
		AccountID:        "fixture-account-2",
		DriveID:          "fixture-drive-migrated",
		WebURL:           "https://docs.google.com/document/d/fixture-google-file-2/edit",
		HandleStatus:     stores.SourceHandleStatusActive,
		ValidFrom:        &second,
		CreatedAt:        second,
		UpdatedAt:        second,
	}); err != nil {
		t.Fatalf("CreateSourceHandle second: %v", err)
	}
	if _, err := store.CreateSourceRevision(context.Background(), scope, stores.SourceRevisionRecord{
		ID:                   fixtures.secondSourceRevisionID,
		SourceDocumentID:     fixtures.sourceDocumentID,
		SourceHandleID:       fixtures.secondSourceHandleID,
		ProviderRevisionHint: "v2",
		ModifiedTime:         &second,
		ExportedAt:           &second,
		ExportedByUserID:     "fixture-user",
		SourceMimeType:       "application/vnd.google-apps.document",
		MetadataJSON:         `{"origin":"native_google_import","external_file_id":"fixture-google-file-2","account_id":"fixture-account-2","web_url":"https://docs.google.com/document/d/fixture-google-file-2/edit","title_hint":"Imported Fixture Source","owner_email":"owner@example.com","parent_id":"fixture-folder","source_version_hint":"v2"}`,
		CreatedAt:            second,
		UpdatedAt:            second,
	}); err != nil {
		t.Fatalf("CreateSourceRevision second: %v", err)
	}
	if _, err := store.CreateSourceArtifact(context.Background(), scope, stores.SourceArtifactRecord{
		ID:                  fixtures.secondSourceArtifactID,
		SourceRevisionID:    fixtures.secondSourceRevisionID,
		ArtifactKind:        stores.SourceArtifactKindSignablePDF,
		ObjectKey:           "tenant/google-v2.pdf",
		SHA256:              strings.Repeat("b", 64),
		PageCount:           4,
		SizeBytes:           8192,
		CompatibilityTier:   "supported",
		NormalizationStatus: "completed",
		CreatedAt:           second,
		UpdatedAt:           second,
	}); err != nil {
		t.Fatalf("CreateSourceArtifact second: %v", err)
	}
	if _, err := store.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                     fixtures.repeatedImportDocumentID,
		Title:                  "Imported Fixture Source Rev 2",
		SourceOriginalName:     "Imported Fixture Source Rev 2.pdf",
		SourceObjectKey:        "tenant/google-v2.pdf",
		NormalizedObjectKey:    "tenant/google-v2.normalized.pdf",
		SourceSHA256:           strings.Repeat("b", 64),
		SourceType:             stores.SourceTypeGoogleDrive,
		SourceGoogleFileID:     "fixture-google-file-2",
		SourceGoogleDocURL:     "https://docs.google.com/document/d/fixture-google-file-2/edit",
		SourceModifiedTime:     &second,
		SourceExportedAt:       &second,
		SourceExportedByUserID: "fixture-user",
		SourceMimeType:         "application/vnd.google-apps.document",
		SourceIngestionMode:    GoogleIngestionModeExportPDF,
		SourceDocumentID:       fixtures.sourceDocumentID,
		SourceRevisionID:       fixtures.secondSourceRevisionID,
		SourceArtifactID:       fixtures.secondSourceArtifactID,
		SizeBytes:              8192,
		PageCount:              4,
		CreatedByUserID:        "fixture-user",
		CreatedAt:              second,
		UpdatedAt:              second,
	}); err != nil {
		t.Fatalf("Create repeated import document: %v", err)
	}
	if _, err := store.CreateSourceFingerprint(context.Background(), scope, stores.SourceFingerprintRecord{
		ID:                     "src-fp-2",
		SourceRevisionID:       fixtures.secondSourceRevisionID,
		ArtifactID:             fixtures.secondSourceArtifactID,
		ExtractVersion:         stores.SourceExtractVersionPDFTextV1,
		Status:                 stores.SourceFingerprintStatusFailed,
		ErrorCode:              "EXTRACTION_FAILED",
		ErrorMessage:           "PDF text extraction failed: document is encrypted or corrupted",
		ExtractionMetadataJSON: `{"extractor":"ledongthuc/pdf","extract_version":"` + stores.SourceExtractVersionPDFTextV1 + `"}`,
		CreatedAt:              second,
	}); err != nil {
		t.Fatalf("CreateSourceFingerprint failed: %v", err)
	}
	for _, relationship := range []stores.SourceRelationshipRecord{
		{
			ID:                          fixtures.candidateRelationshipID,
			LeftSourceDocumentID:        "src-doc-candidate",
			RightSourceDocumentID:       fixtures.sourceDocumentID,
			PredecessorSourceDocumentID: "src-doc-candidate",
			SuccessorSourceDocumentID:   fixtures.sourceDocumentID,
			RelationshipType:            stores.SourceRelationshipTypeSameLogicalDoc,
			ConfidenceBand:              stores.LineageConfidenceBandMedium,
			ConfidenceScore:             0.72,
			Status:                      stores.SourceRelationshipStatusPendingReview,
			EvidenceJSON:                `{"candidate_reason":"matching_title_with_partial_google_context"}`,
			CreatedByUserID:             "fixture-user",
			CreatedAt:                   second,
			UpdatedAt:                   second,
		},
		{
			ID:                          fixtures.copyRelationshipID,
			LeftSourceDocumentID:        "src-doc-copy",
			RightSourceDocumentID:       fixtures.sourceDocumentID,
			PredecessorSourceDocumentID: "src-doc-copy",
			SuccessorSourceDocumentID:   fixtures.sourceDocumentID,
			RelationshipType:            stores.SourceRelationshipTypeCopiedFrom,
			ConfidenceBand:              stores.LineageConfidenceBandHigh,
			ConfidenceScore:             0.68,
			Status:                      stores.SourceRelationshipStatusConfirmed,
			EvidenceJSON:                `{"candidate_reason":"copy_lineage_match"}`,
			CreatedByUserID:             "fixture-user",
			CreatedAt:                   second,
			UpdatedAt:                   second,
		},
		{
			ID:                          fixtures.transferRelationshipID,
			LeftSourceDocumentID:        fixtures.sourceDocumentID,
			RightSourceDocumentID:       "src-doc-transfer",
			PredecessorSourceDocumentID: fixtures.sourceDocumentID,
			SuccessorSourceDocumentID:   "src-doc-transfer",
			RelationshipType:            stores.SourceRelationshipTypeTransferredFrom,
			ConfidenceBand:              stores.LineageConfidenceBandHigh,
			ConfidenceScore:             0.67,
			Status:                      stores.SourceRelationshipStatusConfirmed,
			EvidenceJSON:                `{"candidate_reason":"transfer_lineage_match"}`,
			CreatedByUserID:             "fixture-user",
			CreatedAt:                   later,
			UpdatedAt:                   later,
		},
		{
			ID:                          fixtures.forkRelationshipID,
			LeftSourceDocumentID:        fixtures.sourceDocumentID,
			RightSourceDocumentID:       "src-doc-fork",
			PredecessorSourceDocumentID: fixtures.sourceDocumentID,
			SuccessorSourceDocumentID:   "src-doc-fork",
			RelationshipType:            stores.SourceRelationshipTypeForkedFrom,
			ConfidenceBand:              stores.LineageConfidenceBandHigh,
			ConfidenceScore:             0.66,
			Status:                      stores.SourceRelationshipStatusConfirmed,
			EvidenceJSON:                `{"candidate_reason":"fork_lineage_match"}`,
			CreatedByUserID:             "fixture-user",
			CreatedAt:                   later.Add(30 * time.Minute),
			UpdatedAt:                   later.Add(30 * time.Minute),
		},
	} {
		if _, err := store.CreateSourceRelationship(context.Background(), scope, relationship); err != nil {
			t.Fatalf("CreateSourceRelationship %s: %v", relationship.ID, err)
		}
	}

	return fixtures
}

type sourceReadModelFixtures struct {
	uploadOnlyDocumentID     string
	importedDocumentID       string
	repeatedImportDocumentID string
	importedAgreementID      string
	sourceDocumentID         string
	activeSourceHandleID     string
	secondSourceHandleID     string
	firstSourceRevisionID    string
	secondSourceRevisionID   string
	firstSourceArtifactID    string
	secondSourceArtifactID   string
	candidateRelationshipID  string
	copyRelationshipID       string
	transferRelationshipID   string
	forkRelationshipID       string
}
