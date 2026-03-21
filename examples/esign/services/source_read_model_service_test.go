package services

import (
	"context"
	"strings"
	"testing"
	"time"

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

func containsCandidateEvidence(evidence []CandidateEvidenceSummary, code, label, details string) bool {
	for _, entry := range evidence {
		if entry.Code == code && entry.Label == label && entry.Details == details {
			return true
		}
	}
	return false
}

func seedSourceReadModelFixtures(t *testing.T) (*stores.InMemoryStore, stores.Scope, sourceReadModelFixtures) {
	t.Helper()

	store := stores.NewInMemoryStore()
	scope := stores.Scope{TenantID: "tenant-lineage-read", OrgID: "org-lineage-read"}
	now := time.Date(2026, time.March, 18, 18, 0, 0, 0, time.UTC)
	second := now.Add(2 * time.Hour)

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
	if _, err := store.CreateSourceDocument(context.Background(), scope, stores.SourceDocumentRecord{
		ID:                "src-doc-candidate",
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Imported Fixture Source",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandMedium,
		CreatedAt:         second,
		UpdatedAt:         second,
	}); err != nil {
		t.Fatalf("CreateSourceDocument candidate: %v", err)
	}
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
	if _, err := store.CreateSourceRelationship(context.Background(), scope, stores.SourceRelationshipRecord{
		ID:                    fixtures.candidateRelationshipID,
		LeftSourceDocumentID:  "src-doc-candidate",
		RightSourceDocumentID: fixtures.sourceDocumentID,
		RelationshipType:      stores.SourceRelationshipTypeSameLogicalDoc,
		ConfidenceBand:        stores.LineageConfidenceBandMedium,
		ConfidenceScore:       0.72,
		Status:                stores.SourceRelationshipStatusPendingReview,
		EvidenceJSON:          `{"candidate_reason":"matching_title_with_partial_google_context"}`,
		CreatedByUserID:       "fixture-user",
		CreatedAt:             second,
		UpdatedAt:             second,
	}); err != nil {
		t.Fatalf("CreateSourceRelationship: %v", err)
	}

	return store, scope, fixtures
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
}
