package services

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestPhase1LineageContractFixtureSnapshot(t *testing.T) {
	fixture := buildPhase1LineageContractFixture()
	data, err := json.MarshalIndent(fixture, "", "  ")
	if err != nil {
		t.Fatalf("marshal phase 1 lineage fixture: %v", err)
	}

	path := filepath.Join("..", "..", "..", "pkg", "client", "assets", "tests", "fixtures", "esign_lineage_phase1", "contract_fixtures.json")
	if os.Getenv("UPDATE_FIXTURES") == "1" {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatalf("mkdir fixture dir: %v", err)
		}
		if err := os.WriteFile(path, append(data, '\n'), 0o644); err != nil {
			t.Fatalf("write fixture: %v", err)
		}
	}

	expected, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	if strings.TrimSpace(string(expected)) != strings.TrimSpace(string(data)) {
		t.Fatalf("phase 1 lineage fixture drifted from snapshot")
	}
}

func TestPhase1LineageContractFixtureCoversCanonicalStates(t *testing.T) {
	fixture := buildPhase1LineageContractFixture()

	if fixture.SchemaVersion != 1 {
		t.Fatalf("expected schema version 1, got %d", fixture.SchemaVersion)
	}
	if !fixture.PresentationRules.FrontendPresentationOnly {
		t.Fatalf("expected presentation-only frontend contract")
	}
	if fixture.PresentationRules.CandidateReviewVisibility != LineageReviewVisibilityAdminOnly {
		t.Fatalf("expected admin-only review visibility, got %q", fixture.PresentationRules.CandidateReviewVisibility)
	}
	if fixture.States.DocumentNative.SourceDocument == nil || fixture.States.DocumentNative.SourceRevision == nil || fixture.States.DocumentNative.SourceArtifact == nil {
		t.Fatalf("expected document_native to expose full lineage references")
	}
	if fixture.States.DocumentEmpty.EmptyState.Kind != LineageEmptyStateNoSource {
		t.Fatalf("expected document_empty to expose no-source empty state, got %q", fixture.States.DocumentEmpty.EmptyState.Kind)
	}
	if fixture.States.ImportLinked.LineageStatus != LineageImportStatusLinked {
		t.Fatalf("expected import_linked to expose linked status, got %q", fixture.States.ImportLinked.LineageStatus)
	}
	if len(fixture.States.AgreementNative.CandidateWarningSummary) == 0 {
		t.Fatalf("expected agreement_native candidate warning summary")
	}
}

func TestPhase1LineageServiceBoundariesExposeCanonicalMethods(t *testing.T) {
	identity := reflect.TypeFor[SourceIdentityService]()
	if _, ok := identity.MethodByName("ResolveSourceIdentity"); !ok {
		t.Fatalf("expected SourceIdentityService.ResolveSourceIdentity")
	}

	fingerprint := reflect.TypeFor[SourceFingerprintService]()
	if _, ok := fingerprint.MethodByName("BuildFingerprint"); !ok {
		t.Fatalf("expected SourceFingerprintService.BuildFingerprint")
	}

	reconciliation := reflect.TypeFor[SourceReconciliationService]()
	if _, ok := reconciliation.MethodByName("EvaluateCandidates"); !ok {
		t.Fatalf("expected SourceReconciliationService.EvaluateCandidates")
	}
	if _, ok := reconciliation.MethodByName("ApplyReviewAction"); !ok {
		t.Fatalf("expected SourceReconciliationService.ApplyReviewAction")
	}

	readModels := reflect.TypeFor[SourceReadModelService]()
	for _, method := range []string{
		"GetDocumentLineageDetail",
		"GetAgreementLineageDetail",
		"GetGoogleImportLineageStatus",
		"ListCandidateWarnings",
	} {
		if _, ok := readModels.MethodByName(method); !ok {
			t.Fatalf("expected SourceReadModelService.%s", method)
		}
	}
}

func buildPhase1LineageContractFixture() Phase1LineageContractFixtures {
	modifiedAt := time.Date(2026, time.March, 15, 18, 0, 0, 0, time.UTC)
	exportedAt := time.Date(2026, time.March, 15, 18, 5, 0, 0, time.UTC)

	metadata := SourceMetadataBaseline{
		AccountID:           "acct_primary",
		ExternalFileID:      "google-file-123",
		WebURL:              "https://docs.google.com/document/d/google-file-123/edit",
		ModifiedTime:        &modifiedAt,
		SourceVersionHint:   "v2026-03-15T18:00:00Z",
		SourceMimeType:      "application/vnd.google-apps.document",
		SourceIngestionMode: GoogleIngestionModeExportPDF,
		TitleHint:           "MSA Packet",
		PageCountHint:       12,
		OwnerEmail:          "owner@example.com",
		ParentID:            "folder-legal",
	}

	candidate := CandidateWarningSummary{
		ID:                  "rel_candidate_1",
		RelationshipType:    stores.SourceRelationshipTypeCopiedFrom,
		Status:              stores.SourceRelationshipStatusPendingReview,
		ConfidenceBand:      stores.LineageConfidenceBandMedium,
		ConfidenceScore:     0.87,
		Summary:             "Possible continuity with a copied Google document under a different account.",
		ReviewActionVisible: LineageReviewVisibilityAdminOnly,
		Evidence: []CandidateEvidenceSummary{
			{Code: "normalized_text_match", Label: "Normalized text match", Details: "0.91 similarity"},
			{Code: "title_similarity", Label: "Title similarity", Details: "Identical canonical title"},
		},
	}

	return Phase1LineageContractFixtures{
		SchemaVersion: 1,
		PresentationRules: LineagePresentationRules{
			FrontendPresentationOnly:  true,
			DiagnosticsOwnedByBackend: true,
			WarningPrecedence: []string{
				"candidate_warning",
				"newer_source_exists",
				"fingerprint_pending",
				"empty_state",
			},
			CandidateReviewVisibility: LineageReviewVisibilityAdminOnly,
		},
		MetadataBaseline: metadata,
		States: LineageFixtureStates{
			DocumentNative: DocumentLineageDetail{
				DocumentID: "doc_001",
				SourceDocument: &LineageReference{
					ID:    "src_doc_001",
					Label: "MSA Packet",
				},
				SourceRevision: &SourceRevisionSummary{
					ID:                   "src_rev_001",
					ProviderRevisionHint: metadata.SourceVersionHint,
					ModifiedTime:         &modifiedAt,
					ExportedAt:           &exportedAt,
					ExportedByUserID:     "ops-user",
					SourceMimeType:       metadata.SourceMimeType,
				},
				SourceArtifact: &SourceArtifactSummary{
					ID:                  "src_art_001",
					ArtifactKind:        stores.SourceArtifactKindSignablePDF,
					ObjectKey:           "tenant/tenant-1/org/org-1/docs/doc_001/source.pdf",
					SHA256:              strings.Repeat("a", 64),
					PageCount:           12,
					SizeBytes:           24576,
					CompatibilityTier:   "supported",
					NormalizationStatus: "completed",
				},
				GoogleSource: metadataPtr(metadata),
				FingerprintStatus: FingerprintStatusSummary{
					Status:            LineageFingerprintStatusReady,
					ExtractVersion:    stores.SourceExtractVersionPDFTextV1,
					EvidenceAvailable: true,
				},
				CandidateWarningSummary: []CandidateWarningSummary{candidate},
				DiagnosticsURL:          "/admin/debug/lineage/documents/doc_001",
				EmptyState: LineageEmptyState{
					Kind: LineageEmptyStateNone,
				},
			},
			DocumentEmpty: DocumentLineageDetail{
				DocumentID: "doc_upload_only",
				FingerprintStatus: FingerprintStatusSummary{
					Status:            LineageFingerprintStatusUnknown,
					EvidenceAvailable: false,
				},
				DiagnosticsURL: "/admin/debug/lineage/documents/doc_upload_only",
				EmptyState: LineageEmptyState{
					Kind:        LineageEmptyStateNoSource,
					Title:       "No source lineage",
					Description: "This document was uploaded directly and has no linked source document.",
				},
			},
			AgreementNative: AgreementLineageDetail{
				AgreementID: "agr_001",
				SourceRevision: &SourceRevisionSummary{
					ID:                   "src_rev_001",
					ProviderRevisionHint: metadata.SourceVersionHint,
					ModifiedTime:         &modifiedAt,
					ExportedAt:           &exportedAt,
					ExportedByUserID:     "ops-user",
					SourceMimeType:       metadata.SourceMimeType,
				},
				LinkedDocumentArtifact: &SourceArtifactSummary{
					ID:                  "src_art_001",
					ArtifactKind:        stores.SourceArtifactKindSignablePDF,
					SHA256:              strings.Repeat("a", 64),
					PageCount:           12,
					SizeBytes:           24576,
					CompatibilityTier:   "supported",
					NormalizationStatus: "completed",
				},
				GoogleSource:            metadataPtr(metadata),
				NewerSourceExists:       true,
				CandidateWarningSummary: []CandidateWarningSummary{candidate},
				DiagnosticsURL:          "/admin/debug/lineage/agreements/agr_001",
				EmptyState:              LineageEmptyState{Kind: LineageEmptyStateNone},
			},
			AgreementEmpty: AgreementLineageDetail{
				AgreementID:    "agr_upload_only",
				DiagnosticsURL: "/admin/debug/lineage/agreements/agr_upload_only",
				EmptyState: LineageEmptyState{
					Kind:        LineageEmptyStateNoSource,
					Title:       "No source lineage",
					Description: "This agreement is linked to a document without source provenance.",
				},
			},
			ImportRunning: GoogleImportLineageStatus{
				ImportRunID:   "gir_queued_001",
				LineageStatus: LineageImportStatusRunning,
				FingerprintStatus: FingerprintStatusSummary{
					Status:            LineageFingerprintStatusPending,
					ExtractVersion:    stores.SourceExtractVersionPDFTextV1,
					EvidenceAvailable: false,
				},
			},
			ImportLinked: GoogleImportLineageStatus{
				ImportRunID:   "gir_linked_001",
				LineageStatus: LineageImportStatusLinked,
				SourceDocument: &LineageReference{
					ID:    "src_doc_001",
					Label: "MSA Packet",
				},
				SourceRevision: &SourceRevisionSummary{
					ID:                   "src_rev_001",
					ProviderRevisionHint: metadata.SourceVersionHint,
					ModifiedTime:         &modifiedAt,
					ExportedAt:           &exportedAt,
					ExportedByUserID:     "ops-user",
					SourceMimeType:       metadata.SourceMimeType,
				},
				SourceArtifact: &SourceArtifactSummary{
					ID:                  "src_art_001",
					ArtifactKind:        stores.SourceArtifactKindSignablePDF,
					SHA256:              strings.Repeat("a", 64),
					PageCount:           12,
					SizeBytes:           24576,
					CompatibilityTier:   "supported",
					NormalizationStatus: "completed",
				},
				FingerprintStatus: FingerprintStatusSummary{
					Status:            LineageFingerprintStatusReady,
					ExtractVersion:    stores.SourceExtractVersionPDFTextV1,
					EvidenceAvailable: true,
				},
				CandidateStatus:    []CandidateWarningSummary{candidate},
				DocumentDetailURL:  "/admin/content/esign_documents/doc_001",
				AgreementDetailURL: "/admin/content/esign_agreements/agr_001",
			},
		},
	}
}

func metadataPtr(value SourceMetadataBaseline) *SourceMetadataBaseline {
	copy := value
	return &copy
}
