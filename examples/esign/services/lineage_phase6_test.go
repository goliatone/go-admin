package services

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestDefaultLineageDiagnosticsServiceExposesResolvedEntitiesAndStates(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	diagnostics := NewDefaultLineageDiagnosticsService(
		store,
		store,
		store,
		WithSourceReadModelImportRuns(store),
	)

	documentDiagnostics, err := diagnostics.GetDocumentLineageDiagnostics(context.Background(), scope, seeded.importedDocumentID)
	if err != nil {
		t.Fatalf("GetDocumentLineageDiagnostics: %v", err)
	}
	if documentDiagnostics.SourceDocument == nil || documentDiagnostics.SourceDocument.ID != seeded.sourceDocumentID {
		t.Fatalf("expected source document %q, got %+v", seeded.sourceDocumentID, documentDiagnostics.SourceDocument)
	}
	if documentDiagnostics.SourceRevision == nil || documentDiagnostics.SourceRevision.ID != seeded.firstSourceRevisionID {
		t.Fatalf("expected source revision %q, got %+v", seeded.firstSourceRevisionID, documentDiagnostics.SourceRevision)
	}
	if documentDiagnostics.LatestSourceRevision == nil || documentDiagnostics.LatestSourceRevision.ID != seeded.secondSourceRevisionID {
		t.Fatalf("expected latest source revision %q, got %+v", seeded.secondSourceRevisionID, documentDiagnostics.LatestSourceRevision)
	}
	if len(documentDiagnostics.CandidateRelationships) == 0 {
		t.Fatalf("expected candidate relationship state, got %+v", documentDiagnostics.CandidateRelationships)
	}
	foundCandidate := false
	for _, relationship := range documentDiagnostics.CandidateRelationships {
		if relationship.ID == seeded.candidateRelationshipID && relationship.Status == stores.SourceRelationshipStatusPendingReview {
			foundCandidate = true
			break
		}
	}
	if !foundCandidate {
		t.Fatalf("expected pending candidate relationship %q, got %+v", seeded.candidateRelationshipID, documentDiagnostics.CandidateRelationships)
	}
	if documentDiagnostics.FingerprintStatus.Status != LineageFingerprintStatusPending {
		t.Fatalf("expected fingerprint status pending, got %+v", documentDiagnostics.FingerprintStatus)
	}

	agreementDiagnostics, err := diagnostics.GetAgreementLineageDiagnostics(context.Background(), scope, seeded.importedAgreementID)
	if err != nil {
		t.Fatalf("GetAgreementLineageDiagnostics: %v", err)
	}
	if agreementDiagnostics.SourceRevision == nil || agreementDiagnostics.SourceRevision.ID != seeded.firstSourceRevisionID {
		t.Fatalf("expected agreement source revision %q, got %+v", seeded.firstSourceRevisionID, agreementDiagnostics.SourceRevision)
	}
	if agreementDiagnostics.LatestSourceRevision == nil || agreementDiagnostics.LatestSourceRevision.ID != seeded.secondSourceRevisionID {
		t.Fatalf("expected agreement latest source revision %q, got %+v", seeded.secondSourceRevisionID, agreementDiagnostics.LatestSourceRevision)
	}
}

func TestBuildLineageExamplePayloadsBuildsCanonicalExamples(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	now := time.Date(2026, time.March, 18, 22, 0, 0, 0, time.UTC)
	run, created, err := store.BeginGoogleImportRun(context.Background(), scope, stores.GoogleImportRunInput{
		UserID:            "ops-user",
		GoogleFileID:      "fixture-google-file-1",
		SourceVersionHint: "v1",
		DedupeKey:         "ops-user|fixture-google-file-1|v1",
		DocumentTitle:     "Imported Fixture Source",
		AgreementTitle:    "Imported Fixture Agreement",
		CreatedByUserID:   "fixture-user",
		CorrelationID:     "corr-lineage-phase6",
		RequestedAt:       now,
	})
	if err != nil {
		t.Fatalf("BeginGoogleImportRun: %v", err)
	}
	if !created {
		t.Fatalf("expected import run to be created")
	}
	if _, err := store.MarkGoogleImportRunSucceeded(context.Background(), scope, run.ID, stores.GoogleImportRunSuccessInput{
		DocumentID:         seeded.importedDocumentID,
		AgreementID:        seeded.importedAgreementID,
		SourceDocumentID:   seeded.sourceDocumentID,
		SourceRevisionID:   seeded.firstSourceRevisionID,
		SourceArtifactID:   seeded.firstSourceArtifactID,
		LineageStatus:      LineageImportStatusLinked,
		FingerprintStatus:  LineageFingerprintStatusPending,
		DocumentDetailURL:  "/admin/content/documents/" + seeded.importedDocumentID,
		AgreementDetailURL: "/admin/content/agreements/" + seeded.importedAgreementID,
		SourceMimeType:     "application/vnd.google-apps.document",
		IngestionMode:      GoogleIngestionModeExportPDF,
		CompletedAt:        now,
	}); err != nil {
		t.Fatalf("MarkGoogleImportRunSucceeded: %v", err)
	}

	readModels := NewDefaultSourceReadModelService(
		store,
		store,
		store,
		WithSourceReadModelImportRuns(store),
	)
	diagnostics := NewDefaultLineageDiagnosticsService(
		store,
		store,
		store,
		WithSourceReadModelImportRuns(store),
	)
	examples, err := BuildLineageExamplePayloads(context.Background(), scope, readModels, diagnostics, LineageExamplePayloadBuildInput{
		DocumentID:  seeded.importedDocumentID,
		AgreementID: seeded.importedAgreementID,
		ImportRunID: run.ID,
	})
	if err != nil {
		t.Fatalf("BuildLineageExamplePayloads: %v", err)
	}
	if examples.SchemaVersion != 1 {
		t.Fatalf("expected schema version 1, got %d", examples.SchemaVersion)
	}
	if examples.DocumentDetail.DocumentID != seeded.importedDocumentID {
		t.Fatalf("expected document detail id %q, got %+v", seeded.importedDocumentID, examples.DocumentDetail)
	}
	if examples.AgreementDetail.AgreementID != seeded.importedAgreementID {
		t.Fatalf("expected agreement detail id %q, got %+v", seeded.importedAgreementID, examples.AgreementDetail)
	}
	if examples.ImportStatus.ImportRunID != run.ID || examples.ImportStatus.SourceRevision == nil || examples.ImportStatus.SourceRevision.ID != seeded.firstSourceRevisionID {
		t.Fatalf("expected import status to resolve canonical lineage refs, got %+v", examples.ImportStatus)
	}
	if examples.DocumentDiagnostics.SourceDocument == nil || examples.AgreementDiagnostics.SourceRevision == nil {
		t.Fatalf("expected diagnostics payloads to include lineage entities, got %+v", examples)
	}
}

func TestDefaultLineageRepairServiceReplaysRepairsWithoutMutatingAgreementIdentity(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	fingerprints := &recordingFingerprintService{}
	reconciliation := &recordingReconciliationService{}
	repairs := NewDefaultLineageRepairService(
		store,
		store,
		store,
		WithLineageRepairFingerprintService(fingerprints),
		WithLineageRepairReconciliationService(reconciliation),
	)

	before, err := store.GetAgreement(context.Background(), scope, seeded.importedAgreementID)
	if err != nil {
		t.Fatalf("GetAgreement before repair: %v", err)
	}
	result, err := repairs.RepairAgreement(context.Background(), scope, seeded.importedAgreementID)
	if err != nil {
		t.Fatalf("RepairAgreement: %v", err)
	}
	after, err := store.GetAgreement(context.Background(), scope, seeded.importedAgreementID)
	if err != nil {
		t.Fatalf("GetAgreement after repair: %v", err)
	}

	if fingerprints.lastInput.SourceRevisionID != seeded.firstSourceRevisionID || fingerprints.lastInput.ArtifactID != seeded.firstSourceArtifactID {
		t.Fatalf("expected fingerprint repair to target pinned agreement revision/artifact, got %+v", fingerprints.lastInput)
	}
	if reconciliation.lastInput.SourceDocumentID != seeded.sourceDocumentID || reconciliation.lastInput.SourceRevisionID != seeded.firstSourceRevisionID {
		t.Fatalf("expected reconciliation repair to target pinned agreement source, got %+v", reconciliation.lastInput)
	}
	if before.DocumentID != after.DocumentID || before.SourceRevisionID != after.SourceRevisionID {
		t.Fatalf("expected repair to preserve agreement identity fields, before=%+v after=%+v", before, after)
	}
	if result.TargetKind != "agreement" || result.Diagnostics.SourceRevision == nil || result.Diagnostics.SourceRevision.ID != seeded.firstSourceRevisionID {
		t.Fatalf("expected repair result to include agreement diagnostics, got %+v", result)
	}
}

func TestDefaultLineageRepairServiceUsesLatestRevisionForSourceDocumentRepairs(t *testing.T) {
	store, scope, seeded := seedSourceReadModelFixtures(t)
	fingerprints := &recordingFingerprintService{}
	repairs := NewDefaultLineageRepairService(
		store,
		store,
		store,
		WithLineageRepairFingerprintService(fingerprints),
	)

	result, err := repairs.RepairSourceDocument(context.Background(), scope, seeded.sourceDocumentID)
	if err != nil {
		t.Fatalf("RepairSourceDocument: %v", err)
	}
	if fingerprints.lastInput.SourceRevisionID != seeded.secondSourceRevisionID || fingerprints.lastInput.ArtifactID != seeded.secondSourceArtifactID {
		t.Fatalf("expected source repair to use latest revision/artifact, got %+v", fingerprints.lastInput)
	}
	if result.SourceRevisionID != seeded.secondSourceRevisionID || result.SourceArtifactID != seeded.secondSourceArtifactID {
		t.Fatalf("expected repair result to report latest lineage ids, got %+v", result)
	}
}

type recordingFingerprintService struct {
	lastInput SourceFingerprintBuildInput
}

func (r *recordingFingerprintService) BuildFingerprint(ctx context.Context, scope stores.Scope, input SourceFingerprintBuildInput) (SourceFingerprintBuildResult, error) {
	r.lastInput = input
	return SourceFingerprintBuildResult{
		Status: FingerprintStatusSummary{
			Status:            LineageFingerprintStatusPending,
			EvidenceAvailable: false,
		},
	}, nil
}

type recordingReconciliationService struct {
	lastInput SourceReconciliationInput
}

func (r *recordingReconciliationService) EvaluateCandidates(ctx context.Context, scope stores.Scope, input SourceReconciliationInput) (SourceReconciliationResult, error) {
	r.lastInput = input
	return SourceReconciliationResult{}, nil
}

func (r *recordingReconciliationService) ApplyReviewAction(ctx context.Context, scope stores.Scope, input SourceRelationshipReviewInput) (CandidateWarningSummary, error) {
	return CandidateWarningSummary{}, nil
}

func (r *recordingReconciliationService) ListCandidateRelationships(ctx context.Context, scope stores.Scope, sourceDocumentID string) ([]stores.SourceRelationshipRecord, error) {
	return nil, nil
}
