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
	if len(fixture.States.DocumentNative.PresentationWarnings) == 0 {
		t.Fatalf("expected document_native presentation warnings")
	}
	if fixture.States.DocumentNative.PresentationWarnings[0].ActionURL == "" {
		t.Fatalf("expected document_native presentation warning to expose diagnostics action")
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
	if _, ok := reconciliation.MethodByName("ListCandidateRelationships"); !ok {
		t.Fatalf("expected SourceReconciliationService.ListCandidateRelationships")
	}

	readModels := reflect.TypeFor[SourceReadModelService]()
	for _, method := range []string{
		"GetDocumentLineageDetail",
		"GetAgreementLineageDetail",
		"GetGoogleImportLineageStatus",
		"ListCandidateWarnings",
		"ListSources",
		"GetSourceDetail",
		"GetSourceWorkspace",
		"ListSourceRevisions",
		"ListSourceRelationships",
		"ListSourceAgreements",
		"ListSourceHandles",
		"GetSourceRevisionDetail",
		"ListSourceRevisionArtifacts",
		"ListSourceRevisionComments",
		"SearchSources",
		"ListReconciliationQueue",
		"GetReconciliationCandidate",
	} {
		if _, ok := readModels.MethodByName(method); !ok {
			t.Fatalf("expected SourceReadModelService.%s", method)
		}
	}
}

func TestPhase11SourceManagementContractFixtureSnapshot(t *testing.T) {
	fixture := buildPhase11SourceManagementContractFixture(t)
	data, err := json.MarshalIndent(fixture, "", "  ")
	if err != nil {
		t.Fatalf("marshal phase 11 source management fixture: %v", err)
	}

	path := filepath.Join("..", "..", "..", "pkg", "client", "assets", "tests", "fixtures", "source_management_contracts", "contract_fixtures.json")
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
		t.Fatalf("phase 11 source management fixture drifted from snapshot")
	}
}

func TestPhase11SourceManagementContractFixtureCoversCanonicalStates(t *testing.T) {
	fixture := buildPhase11SourceManagementContractFixture(t)

	if fixture.SchemaVersion != 1 {
		t.Fatalf("expected schema version 1, got %d", fixture.SchemaVersion)
	}
	if !fixture.Rules.FrontendPresentationOnly {
		t.Fatalf("expected presentation-only frontend source-management contract")
	}
	if fixture.Rules.PaginationMode != SourceManagementPaginationModePage {
		t.Fatalf("expected page-based pagination semantics, got %+v", fixture.Rules)
	}
	if len(fixture.States.SourceListEmpty.Items) != 0 || fixture.States.SourceListEmpty.EmptyState.Kind != LineageEmptyStateNoResults {
		t.Fatalf("expected empty source list state, got %+v", fixture.States.SourceListEmpty)
	}
	if len(fixture.States.SourceListSingle.Items) != 1 {
		t.Fatalf("expected single-source list state, got %+v", fixture.States.SourceListSingle)
	}
	if fixture.States.SourceDetailRepeated.LatestRevision == nil || fixture.States.SourceDetailRepeated.ActiveHandle == nil {
		t.Fatalf("expected repeated source detail to expose latest revision and active handle, got %+v", fixture.States.SourceDetailRepeated)
	}
	if fixture.States.SourceWorkspaceRepeated.ActivePanel != SourceWorkspacePanelAgreements || len(fixture.States.SourceWorkspaceRepeated.Timeline.Entries) == 0 {
		t.Fatalf("expected repeated source workspace to expose panel drill-ins and revision timeline, got %+v", fixture.States.SourceWorkspaceRepeated)
	}
	if !containsString(fixture.States.SourceDetailRepeated.LatestRevision.HistoryLabels, SourceRevisionHistoryLabelLatest) {
		t.Fatalf("expected repeated source detail latest revision history label, got %+v", fixture.States.SourceDetailRepeated.LatestRevision)
	}
	if len(fixture.States.SourceHandlesMulti.Items) < 2 {
		t.Fatalf("expected multi-handle state, got %+v", fixture.States.SourceHandlesMulti)
	}
	if len(fixture.States.SourceRelationshipsReview.Items) == 0 || fixture.States.SourceRelationshipsReview.Items[0].ReviewActionVisible != LineageReviewVisibilityAdminOnly {
		t.Fatalf("expected candidate-review relationship state, got %+v", fixture.States.SourceRelationshipsReview)
	}
	if len(fixture.States.SourceAgreementsRepeated.Items) < 2 {
		t.Fatalf("expected repeated source agreements to expose multi-revision agreement history, got %+v", fixture.States.SourceAgreementsRepeated)
	}
	if fixture.States.SourceRelationshipsReview.Items[0].RelationshipKind == "" || fixture.States.SourceRelationshipsReview.Items[0].CounterpartRole == "" {
		t.Fatalf("expected source relationship review semantics, got %+v", fixture.States.SourceRelationshipsReview.Items[0])
	}
	if fixture.States.SourceRevisionDetail.Provider == nil || fixture.States.SourceRevisionDetail.Provider.Extension == nil {
		t.Fatalf("expected provider-neutral extension envelope, got %+v", fixture.States.SourceRevisionDetail)
	}
	if !containsString(fixture.States.SourceRevisionDetail.Revision.HistoryLabels, SourceRevisionHistoryLabelLatest) {
		t.Fatalf("expected source revision detail history labels, got %+v", fixture.States.SourceRevisionDetail.Revision)
	}
	if fixture.States.SourceCommentsEmpty.SyncStatus != SourceManagementCommentSyncNotConfigured {
		t.Fatalf("expected no-comment sync state to be explicit, got %+v", fixture.States.SourceCommentsEmpty)
	}
	if fixture.States.SourceCommentsEmpty.Permissions.CanViewComments {
		t.Fatalf("expected source-comments fixture to keep comments unavailable until configured, got %+v", fixture.States.SourceCommentsEmpty.Permissions)
	}
	if len(fixture.States.SourceSearchResults.Items) != 1 || fixture.States.SourceSearchResults.Items[0].Revision == nil {
		t.Fatalf("expected source-search fixture to expose a revision-scoped result, got %+v", fixture.States.SourceSearchResults)
	}
	if got := strings.TrimSpace(fixture.States.SourceSearchResults.Items[0].Links.Self); got != sourceManagementRevisionPath("src-rev-2") {
		t.Fatalf("expected source-search fixture to link to matched revision detail, got %+v", fixture.States.SourceSearchResults.Items[0].Links)
	}
	if fixture.States.SourceDetailMerged.Status != stores.SourceDocumentStatusMerged {
		t.Fatalf("expected merged source state, got %+v", fixture.States.SourceDetailMerged)
	}
	if fixture.States.SourceDetailArchived.Status != stores.SourceDocumentStatusArchived {
		t.Fatalf("expected archived source state, got %+v", fixture.States.SourceDetailArchived)
	}
	if len(fixture.States.ReconciliationQueueBacklog.Items) != 1 || fixture.States.ReconciliationQueueBacklog.Items[0].Candidate == nil {
		t.Fatalf("expected reconciliation queue backlog state, got %+v", fixture.States.ReconciliationQueueBacklog)
	}
	if fixture.States.ReconciliationQueueEmpty.EmptyState.Kind != LineageEmptyStateNoResults {
		t.Fatalf("expected reconciliation queue empty state, got %+v", fixture.States.ReconciliationQueueEmpty)
	}
	if fixture.States.ReconciliationCandidate.Candidate == nil || len(fixture.States.ReconciliationCandidate.Actions) < 5 {
		t.Fatalf("expected reconciliation candidate detail with action metadata, got %+v", fixture.States.ReconciliationCandidate)
	}
}

func buildPhase1LineageContractFixture() Phase1LineageContractFixtures {
	modifiedAt := time.Date(2026, time.March, 15, 18, 0, 0, 0, time.UTC)
	exportedAt := time.Date(2026, time.March, 15, 18, 5, 0, 0, time.UTC)

	metadata := SourceMetadataBaseline{
		AccountID:           "acct_primary",
		ExternalFileID:      "google-file-123",
		DriveID:             "shared-drive-123",
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
				"fingerprint_failed",
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
				PresentationWarnings: []LineagePresentationWarning{
					{
						ID:                  "rel_candidate_1",
						Type:                "candidate_relationship",
						Severity:            LineageWarningSeverityWarning,
						Title:               "Copied From - Pending Review",
						Description:         "Possible continuity with a copied Google document under a different account.",
						ActionLabel:         "Review in diagnostics",
						ActionURL:           "/admin/debug/lineage/documents/doc_001",
						ReviewActionVisible: LineageReviewVisibilityAdminOnly,
						Evidence:            append([]CandidateEvidenceSummary{}, candidate.Evidence...),
					},
				},
				DiagnosticsURL: "/admin/debug/lineage/documents/doc_001",
				EmptyState: LineageEmptyState{
					Kind: LineageEmptyStateNone,
				},
			},
			DocumentEmpty: DocumentLineageDetail{
				DocumentID: "doc_upload_only",
				FingerprintStatus: FingerprintStatusSummary{
					Status:            LineageFingerprintStatusNotApplicable,
					EvidenceAvailable: false,
				},
				PresentationWarnings: nil,
				DiagnosticsURL:       "/admin/debug/lineage/documents/doc_upload_only",
				EmptyState: LineageEmptyState{
					Kind:        LineageEmptyStateNoSource,
					Title:       "No source lineage",
					Description: "This document was uploaded directly and has no linked source document.",
				},
			},
			AgreementNative: AgreementLineageDetail{
				AgreementID:            "agr_001",
				PinnedSourceRevisionID: "src_rev_001",
				SourceDocument: &LineageReference{
					ID:    "src_doc_001",
					Label: metadata.TitleHint,
					URL:   metadata.WebURL,
				},
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
				GoogleSource:      metadataPtr(metadata),
				NewerSourceExists: true,
				NewerSourceSummary: &NewerSourceSummary{
					Exists:                 true,
					PinnedSourceRevisionID: "src_rev_001",
					LatestSourceRevisionID: "src_rev_002",
					Summary:                "A newer source revision exists while this agreement remains pinned to the revision used at creation time.",
				},
				CandidateWarningSummary: []CandidateWarningSummary{candidate},
				PresentationWarnings: []LineagePresentationWarning{
					{
						ID:                  "rel_candidate_1",
						Type:                "candidate_relationship",
						Severity:            LineageWarningSeverityWarning,
						Title:               "Copied From - Pending Review",
						Description:         "Possible continuity with a copied Google document under a different account.",
						ActionLabel:         "Review in diagnostics",
						ActionURL:           "/admin/debug/lineage/agreements/agr_001",
						ReviewActionVisible: LineageReviewVisibilityAdminOnly,
						Evidence:            append([]CandidateEvidenceSummary{}, candidate.Evidence...),
					},
					{
						ID:          "newer_source_warning",
						Type:        "newer_source_exists",
						Severity:    LineageWarningSeverityInfo,
						Title:       "Newer Source Available",
						Description: "A newer source revision exists. This agreement remains pinned to the earlier revision used when it was created.",
					},
				},
				DiagnosticsURL: "/admin/debug/lineage/agreements/agr_001",
				EmptyState:     LineageEmptyState{Kind: LineageEmptyStateNone},
			},
			AgreementEmpty: AgreementLineageDetail{
				AgreementID:          "agr_upload_only",
				PresentationWarnings: nil,
				DiagnosticsURL:       "/admin/debug/lineage/agreements/agr_upload_only",
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
				DocumentDetailURL:  "/admin/content/documents/doc_001",
				AgreementDetailURL: "/admin/content/agreements/agr_001",
			},
		},
	}
}

func metadataPtr(value SourceMetadataBaseline) *SourceMetadataBaseline {
	copy := value
	return &copy
}

func buildPhase11SourceManagementContractFixture(t *testing.T) Phase11SourceManagementContractFixtures {
	t.Helper()

	modifiedAtV1 := time.Date(2026, time.March, 18, 18, 0, 0, 0, time.UTC)
	modifiedAtV2 := time.Date(2026, time.March, 18, 20, 0, 0, 0, time.UTC)
	exportedAtV1 := modifiedAtV1.Add(5 * time.Minute)
	exportedAtV2 := modifiedAtV2.Add(5 * time.Minute)
	validFromV1 := modifiedAtV1
	validFromV2 := modifiedAtV2
	pendingOnly := true
	permissions := SourceManagementPermissions{
		CanViewDiagnostics:   true,
		CanOpenProviderLinks: true,
		CanReviewCandidates:  true,
		CanViewComments:      false,
	}
	sourceRef := &LineageReference{
		ID:    "src-doc-1",
		Label: "Imported Fixture Source",
		URL:   sourceManagementSourcePath("src-doc-1"),
	}
	candidateRef := &LineageReference{
		ID:    "src-doc-candidate",
		Label: "Imported Fixture Source",
		URL:   sourceManagementSourcePath("src-doc-candidate"),
	}
	firstRevision := &SourceRevisionSummary{
		ID:                   "src-rev-1",
		ProviderRevisionHint: "v1",
		ModifiedTime:         &modifiedAtV1,
		ExportedAt:           &exportedAtV1,
		ExportedByUserID:     "fixture-user",
		SourceMimeType:       "application/vnd.google-apps.document",
		HistoryLabels:        []string{SourceRevisionHistoryLabelPinned, SourceRevisionHistoryLabelSuperseded},
		PinnedDocumentCount:  1,
		PinnedAgreementCount: 1,
	}
	secondRevision := &SourceRevisionSummary{
		ID:                   "src-rev-2",
		ProviderRevisionHint: "v2",
		ModifiedTime:         &modifiedAtV2,
		ExportedAt:           &exportedAtV2,
		ExportedByUserID:     "fixture-user",
		SourceMimeType:       "application/vnd.google-apps.document",
		HistoryLabels:        []string{SourceRevisionHistoryLabelLatest, SourceRevisionHistoryLabelPinned},
		PinnedDocumentCount:  1,
	}
	firstHandle := SourceHandleSummary{
		ID:             "src-handle-1",
		ProviderKind:   stores.SourceProviderKindGoogleDrive,
		ExternalFileID: "fixture-google-file-1",
		AccountID:      "fixture-account-1",
		DriveID:        "fixture-drive-root",
		WebURL:         "https://docs.google.com/document/d/fixture-google-file-1/edit",
		HandleStatus:   stores.SourceHandleStatusActive,
		ValidFrom:      &validFromV1,
		Links:          SourceManagementLinks{Provider: "https://docs.google.com/document/d/fixture-google-file-1/edit"},
	}
	secondHandle := SourceHandleSummary{
		ID:             "src-handle-2",
		ProviderKind:   stores.SourceProviderKindGoogleDrive,
		ExternalFileID: "fixture-google-file-2",
		AccountID:      "fixture-account-2",
		DriveID:        "fixture-drive-root",
		WebURL:         "https://docs.google.com/document/d/fixture-google-file-2/edit",
		HandleStatus:   stores.SourceHandleStatusActive,
		ValidFrom:      &validFromV2,
		Links:          SourceManagementLinks{Provider: "https://docs.google.com/document/d/fixture-google-file-2/edit"},
	}
	providerV2 := &SourceProviderSummary{
		Kind:           stores.SourceProviderKindGoogleDrive,
		Label:          "Google Drive",
		ExternalFileID: "fixture-google-file-2",
		AccountID:      "fixture-account-2",
		DriveID:        "fixture-drive-root",
		WebURL:         "https://docs.google.com/document/d/fixture-google-file-2/edit",
		Extension: &SourceProviderExtensionEnvelope{
			Schema: "google_drive.v1",
			Values: map[string]any{
				"owner_email":         "owner@example.com",
				"parent_id":           "fixture-folder",
				"source_version_hint": "v2",
				"source_mime_type":    "application/vnd.google-apps.document",
				"title_hint":          "Imported Fixture Source",
			},
		},
	}
	providerV1 := &SourceProviderSummary{
		Kind:           stores.SourceProviderKindGoogleDrive,
		Label:          "Google Drive",
		ExternalFileID: "fixture-google-file-1",
		AccountID:      "fixture-account-1",
		DriveID:        "fixture-drive-root",
		WebURL:         "https://docs.google.com/document/d/fixture-google-file-1/edit",
		Extension: &SourceProviderExtensionEnvelope{
			Schema: "google_drive.v1",
			Values: map[string]any{
				"owner_email":         "owner@example.com",
				"parent_id":           "fixture-folder",
				"source_version_hint": "v1",
				"source_mime_type":    "application/vnd.google-apps.document",
				"title_hint":          "Imported Fixture Source",
			},
		},
	}
	secondArtifact := SourceArtifactSummary{
		ID:                  "src-art-2",
		ArtifactKind:        stores.SourceArtifactKindSignablePDF,
		ObjectKey:           "tenant/google-v2.pdf",
		SHA256:              strings.Repeat("b", 64),
		PageCount:           4,
		SizeBytes:           8192,
		CompatibilityTier:   "supported",
		NormalizationStatus: "completed",
	}
	sourceListEmpty := SourceListPage{
		Items:        []SourceListItem{},
		PageInfo:     SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 10, TotalCount: 0, HasMore: false, Sort: sourceListSortPendingDesc},
		AppliedQuery: SourceListQuery{Query: "missing-source", Sort: sourceListSortPendingDesc, Page: 1, PageSize: 10},
		Permissions:  permissions,
		EmptyState:   LineageEmptyState{Kind: LineageEmptyStateNoResults, Title: "No sources", Description: "No canonical source documents match the current filters."},
		Links:        SourceManagementLinks{Self: sourceManagementSourcesPath()},
	}
	sourceListSingle := SourceListPage{
		Items: []SourceListItem{{
			Source:                sourceRef,
			Status:                stores.SourceDocumentStatusActive,
			LineageConfidence:     stores.LineageConfidenceBandExact,
			Provider:              providerV2,
			LatestRevision:        secondRevision,
			ActiveHandle:          &secondHandle,
			RevisionCount:         2,
			HandleCount:           2,
			RelationshipCount:     1,
			PendingCandidateCount: 1,
			Permissions:           permissions,
			Links:                 sourceLinksForDocument("src-doc-1"),
		}},
		PageInfo:     SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 10, TotalCount: 1, HasMore: false, Sort: sourceListSortPendingDesc},
		AppliedQuery: SourceListQuery{Query: "fixture-google-file-2", HasPendingCandidates: &pendingOnly, Sort: sourceListSortPendingDesc, Page: 1, PageSize: 10},
		Permissions:  permissions,
		EmptyState:   LineageEmptyState{Kind: LineageEmptyStateNone},
		Links:        SourceManagementLinks{Self: sourceManagementSourcesPath()},
	}
	sourceDetailRepeated := SourceDetail{
		Source:                sourceRef,
		Status:                stores.SourceDocumentStatusActive,
		LineageConfidence:     stores.LineageConfidenceBandExact,
		Provider:              providerV2,
		ActiveHandle:          &secondHandle,
		LatestRevision:        secondRevision,
		RevisionCount:         2,
		HandleCount:           2,
		RelationshipCount:     1,
		PendingCandidateCount: 1,
		Permissions:           permissions,
		Links:                 sourceLinksForDocument("src-doc-1"),
		EmptyState:            LineageEmptyState{Kind: LineageEmptyStateNone},
	}
	sourceAgreementsRepeated := SourceAgreementPage{
		Source: sourceRef,
		Items: []SourceAgreementSummary{
			{
				Agreement:            &LineageReference{ID: "agr-imported-v2", Label: "Imported Fixture Agreement Rev 2", URL: sourceManagementAgreementDetailPath("agr-imported-v2")},
				Document:             &LineageReference{ID: "doc-imported-v2", Label: "Imported Fixture Source Rev 2", URL: sourceManagementDocumentDetailPath("doc-imported-v2")},
				PinnedSourceRevision: secondRevision,
				Status:               stores.AgreementStatusDraft,
				IsPinnedLatest:       true,
				Links: SourceManagementLinks{
					Self:       sourceManagementAgreementDetailPath("agr-imported-v2"),
					Agreement:  sourceManagementAgreementDetailPath("agr-imported-v2"),
					Workspace:  sourceManagementSourceWorkspacePath("src-doc-1"),
					Agreements: sourceManagementSourceAgreementsPath("src-doc-1"),
					Anchor:     sourceManagementWorkspaceAnchorPath("src-doc-1", SourceWorkspacePanelAgreements, "agreement:agr-imported-v2"),
				},
			},
			{
				Agreement:            &LineageReference{ID: "agr-imported-v1", Label: "Imported Fixture Agreement", URL: sourceManagementAgreementDetailPath("agr-imported-v1")},
				Document:             &LineageReference{ID: "doc-imported-v1", Label: "Imported Fixture Source", URL: sourceManagementDocumentDetailPath("doc-imported-v1")},
				PinnedSourceRevision: firstRevision,
				Status:               stores.AgreementStatusDraft,
				Links: SourceManagementLinks{
					Self:       sourceManagementAgreementDetailPath("agr-imported-v1"),
					Agreement:  sourceManagementAgreementDetailPath("agr-imported-v1"),
					Workspace:  sourceManagementSourceWorkspacePath("src-doc-1"),
					Agreements: sourceManagementSourceAgreementsPath("src-doc-1"),
					Anchor:     sourceManagementWorkspaceAnchorPath("src-doc-1", SourceWorkspacePanelAgreements, "agreement:agr-imported-v1"),
				},
			},
		},
		PageInfo:     SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 10, TotalCount: 2, HasMore: false, Sort: sourceAgreementSortUpdatedDesc},
		AppliedQuery: SourceAgreementListQuery{Sort: sourceAgreementSortUpdatedDesc, Page: 1, PageSize: 10},
		Permissions:  permissions,
		EmptyState:   LineageEmptyState{Kind: LineageEmptyStateNone},
		Links:        sourceLinksForDocument("src-doc-1"),
	}
	sourceHandlesMulti := SourceHandlePage{
		Source:      sourceRef,
		Items:       []SourceHandleSummary{secondHandle, firstHandle},
		PageInfo:    SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 2, TotalCount: 2, HasMore: false, Sort: sourceListSortUpdatedDesc},
		Permissions: permissions,
		EmptyState:  LineageEmptyState{Kind: LineageEmptyStateNone},
		Links:       sourceLinksForDocument("src-doc-1"),
	}
	sourceRevisionsRepeated := SourceRevisionPage{
		Source: sourceRef,
		Items: []SourceRevisionListItem{
			{
				Revision:              secondRevision,
				Provider:              providerV2,
				PrimaryArtifact:       &secondArtifact,
				FingerprintStatus:     FingerprintStatusSummary{Status: LineageFingerprintStatusFailed, EvidenceAvailable: false, ErrorCode: "OCR_TIMEOUT", ErrorMessage: "text extraction exceeded retry budget"},
				FingerprintProcessing: FingerprintProcessingSummary{State: LineageFingerprintProcessingFailed, LastErrorCode: "OCR_TIMEOUT", LastErrorMessage: "text extraction exceeded retry budget", AttemptCount: 3},
				IsLatest:              true,
				Links:                 sourceRevisionLinks("src-rev-2", "src-doc-1"),
			},
			{
				Revision: firstRevision,
				Provider: &SourceProviderSummary{
					Kind:           stores.SourceProviderKindGoogleDrive,
					Label:          "Google Drive",
					ExternalFileID: "fixture-google-file-1",
					AccountID:      "fixture-account-1",
					DriveID:        "fixture-drive-root",
					WebURL:         "https://docs.google.com/document/d/fixture-google-file-1/edit",
				},
				PrimaryArtifact: &SourceArtifactSummary{
					ID:                  "src-art-1",
					ArtifactKind:        stores.SourceArtifactKindSignablePDF,
					ObjectKey:           "tenant/google-v1.pdf",
					SHA256:              strings.Repeat("a", 64),
					PageCount:           3,
					SizeBytes:           4096,
					CompatibilityTier:   "supported",
					NormalizationStatus: "completed",
				},
				FingerprintStatus:     FingerprintStatusSummary{Status: LineageFingerprintStatusPending, EvidenceAvailable: false},
				FingerprintProcessing: FingerprintProcessingSummary{State: LineageFingerprintProcessingRunning, StatusLabel: "In progress", Retryable: true},
				IsLatest:              false,
				Links:                 sourceRevisionLinks("src-rev-1", "src-doc-1"),
			},
		},
		PageInfo:     SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 10, TotalCount: 2, HasMore: false, Sort: sourceRevisionSortLatestDesc},
		AppliedQuery: SourceRevisionListQuery{Sort: sourceRevisionSortLatestDesc, Page: 1, PageSize: 10},
		Permissions:  permissions,
		EmptyState:   LineageEmptyState{Kind: LineageEmptyStateNone},
		Links:        sourceLinksForDocument("src-doc-1"),
	}
	sourceRelationshipsReview := SourceRelationshipPage{
		Source: sourceRef,
		Items: []SourceRelationshipSummary{{
			ID:                  "src-rel-1",
			RelationshipType:    stores.SourceRelationshipTypeCopiedFrom,
			RelationshipKind:    SourceRelationshipKindCopy,
			Status:              stores.SourceRelationshipStatusPendingReview,
			CounterpartRole:     SourceRelationshipRolePredecessor,
			ConfidenceBand:      stores.LineageConfidenceBandMedium,
			ConfidenceScore:     0.82,
			Summary:             "Pending review predecessor copy lineage",
			LeftSource:          sourceRef,
			RightSource:         candidateRef,
			CounterpartSource:   candidateRef,
			ReviewActionVisible: LineageReviewVisibilityAdminOnly,
			Evidence: []CandidateEvidenceSummary{
				{Code: lineageEvidenceKeyNormalizedTextSimilarity, Label: "Normalized text match", Details: "0.91 similarity"},
				{Code: lineageEvidenceKeyAccountMatch, Label: "Account history", Details: "fixture-account-2"},
			},
			Links: SourceManagementLinks{
				Self:   sourceManagementSourceRelationshipsPath("src-doc-1"),
				Source: sourceManagementSourcePath("src-doc-candidate"),
			},
		}},
		PageInfo:     SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 10, TotalCount: 1, HasMore: false, Sort: sourceRelationshipSortConfidence},
		AppliedQuery: SourceRelationshipListQuery{Status: stores.SourceRelationshipStatusPendingReview, Sort: sourceRelationshipSortConfidence, Page: 1, PageSize: 10},
		Permissions:  permissions,
		EmptyState:   LineageEmptyState{Kind: LineageEmptyStateNone},
		Links:        sourceLinksForDocument("src-doc-1"),
	}
	sourceRevisionDetail := SourceRevisionDetail{
		Source:                sourceRef,
		Revision:              secondRevision,
		Provider:              providerV2,
		FingerprintStatus:     FingerprintStatusSummary{Status: LineageFingerprintStatusFailed, EvidenceAvailable: false, ErrorCode: "OCR_TIMEOUT", ErrorMessage: "text extraction exceeded retry budget"},
		FingerprintProcessing: FingerprintProcessingSummary{State: LineageFingerprintProcessingFailed, LastErrorCode: "OCR_TIMEOUT", LastErrorMessage: "text extraction exceeded retry budget", AttemptCount: 3},
		Permissions:           permissions,
		Links:                 sourceRevisionLinks("src-rev-2", "src-doc-1"),
		EmptyState:            LineageEmptyState{Kind: LineageEmptyStateNone},
	}
	sourceArtifacts := SourceArtifactPage{
		Revision:    secondRevision,
		Items:       []SourceArtifactSummary{secondArtifact},
		PageInfo:    SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 1, TotalCount: 1, HasMore: false, Sort: sourceRevisionSortLatestDesc},
		Permissions: permissions,
		EmptyState:  LineageEmptyState{Kind: LineageEmptyStateNone},
		Links:       sourceRevisionLinks("src-rev-2", "src-doc-1"),
	}
	sourceCommentsEmpty := SourceCommentPage{
		Revision:    secondRevision,
		Items:       []SourceCommentThreadSummary{},
		PageInfo:    SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 0, TotalCount: 0, HasMore: false, Sort: sourceRevisionSortLatestDesc},
		Permissions: permissions,
		EmptyState: LineageEmptyState{
			Kind:        LineageEmptyStateNoComments,
			Title:       "No comments",
			Description: "Source-level comment sync is not configured yet for this revision.",
		},
		SyncStatus: SourceManagementCommentSyncNotConfigured,
		Links:      sourceRevisionLinks("src-rev-2", "src-doc-1"),
	}
	sourceWorkspaceRepeated := SourceWorkspace{
		Source:                sourceRef,
		Status:                stores.SourceDocumentStatusActive,
		LineageConfidence:     stores.LineageConfidenceBandExact,
		Provider:              providerV2,
		ActiveHandle:          &secondHandle,
		LatestRevision:        secondRevision,
		RevisionCount:         2,
		HandleCount:           2,
		RelationshipCount:     1,
		PendingCandidateCount: 1,
		ActivePanel:           SourceWorkspacePanelAgreements,
		ActiveAnchor:          "agreement:agr-imported-v2",
		Panels: []SourceWorkspacePanelSummary{
			{ID: SourceWorkspacePanelOverview, Label: "Overview", Links: sourceWorkspaceLinksForDocument("src-doc-1", SourceWorkspacePanelOverview, "")},
			{ID: SourceWorkspacePanelTimeline, Label: "Revision Timeline", ItemCount: 2, Links: sourceWorkspaceLinksForDocument("src-doc-1", SourceWorkspacePanelTimeline, "")},
			{ID: SourceWorkspacePanelAgreements, Label: "Related Agreements", ItemCount: 2, Links: sourceWorkspaceLinksForDocument("src-doc-1", SourceWorkspacePanelAgreements, "")},
			{ID: SourceWorkspacePanelArtifacts, Label: "Related Artifacts", ItemCount: 3, Links: sourceWorkspaceLinksForDocument("src-doc-1", SourceWorkspacePanelArtifacts, "")},
			{ID: SourceWorkspacePanelComments, Label: "Related Comments", ItemCount: 0, Links: sourceWorkspaceLinksForDocument("src-doc-1", SourceWorkspacePanelComments, "")},
			{ID: SourceWorkspacePanelHandles, Label: "Active Handles", ItemCount: 2, Links: sourceWorkspaceLinksForDocument("src-doc-1", SourceWorkspacePanelHandles, "")},
		},
		Continuity: SourceContinuitySummary{
			Status:  stores.SourceDocumentStatusActive,
			Summary: "Canonical source continuity is tracked from the active handle through revision history.",
			Links:   sourceLinksForDocument("src-doc-1"),
		},
		Timeline: SourceRevisionTimeline{
			Entries: []SourceRevisionTimelineEntry{
				{
					Revision:          secondRevision,
					Handle:            &secondHandle,
					PrimaryArtifact:   &secondArtifact,
					AgreementCount:    1,
					ArtifactCount:     1,
					IsLatest:          true,
					ContinuitySummary: "Latest observed revision for this canonical source.",
					DrillIn:           &SourceWorkspaceDrillIn{Panel: SourceWorkspacePanelTimeline, Anchor: "revision:src-rev-2", Href: sourceManagementWorkspaceAnchorPath("src-doc-1", SourceWorkspacePanelTimeline, "revision:src-rev-2")},
					Links:             sourceRevisionLinks("src-rev-2", "src-doc-1"),
				},
				{
					Revision:          firstRevision,
					Handle:            &firstHandle,
					AgreementCount:    1,
					ArtifactCount:     2,
					ContinuitySummary: "Historical revision remains pinned for downstream document and agreement lineage.",
					DrillIn:           &SourceWorkspaceDrillIn{Panel: SourceWorkspacePanelTimeline, Anchor: "revision:src-rev-1", Href: sourceManagementWorkspaceAnchorPath("src-doc-1", SourceWorkspacePanelTimeline, "revision:src-rev-1")},
					Links:             sourceRevisionLinks("src-rev-1", "src-doc-1"),
				},
			},
			Permissions: permissions,
			EmptyState:  LineageEmptyState{Kind: LineageEmptyStateNone},
			Links:       sourceLinksForDocument("src-doc-1"),
		},
		Agreements: sourceAgreementsRepeated,
		Artifacts: SourceWorkspaceArtifactPage{
			Source: sourceRef,
			Items: []SourceWorkspaceArtifactSummary{
				{Artifact: &secondArtifact, Revision: secondRevision, Provider: providerV2, DrillIn: &SourceWorkspaceDrillIn{Panel: SourceWorkspacePanelArtifacts, Anchor: "artifact:src-art-2", Href: sourceManagementWorkspaceAnchorPath("src-doc-1", SourceWorkspacePanelArtifacts, "artifact:src-art-2")}, Links: sourceRevisionLinks("src-rev-2", "src-doc-1")},
				{Artifact: &SourceArtifactSummary{ID: "src-art-1-preview", ArtifactKind: stores.SourceArtifactKindPreviewPDF, ObjectKey: "tenant/google-v1.preview.pdf", SHA256: strings.Repeat("c", 64), PageCount: 3, SizeBytes: 2048, CompatibilityTier: "supported", NormalizationStatus: "completed"}, Revision: firstRevision, DrillIn: &SourceWorkspaceDrillIn{Panel: SourceWorkspacePanelArtifacts, Anchor: "artifact:src-art-1-preview", Href: sourceManagementWorkspaceAnchorPath("src-doc-1", SourceWorkspacePanelArtifacts, "artifact:src-art-1-preview")}, Links: sourceRevisionLinks("src-rev-1", "src-doc-1")},
				{Artifact: &SourceArtifactSummary{ID: "src-art-1", ArtifactKind: stores.SourceArtifactKindSignablePDF, ObjectKey: "tenant/google-v1.pdf", SHA256: strings.Repeat("a", 64), PageCount: 3, SizeBytes: 4096, CompatibilityTier: "supported", NormalizationStatus: "completed"}, Revision: firstRevision, DrillIn: &SourceWorkspaceDrillIn{Panel: SourceWorkspacePanelArtifacts, Anchor: "artifact:src-art-1", Href: sourceManagementWorkspaceAnchorPath("src-doc-1", SourceWorkspacePanelArtifacts, "artifact:src-art-1")}, Links: sourceRevisionLinks("src-rev-1", "src-doc-1")},
			},
			PageInfo:    SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 3, TotalCount: 3, HasMore: false, Sort: sourceRevisionSortLatestDesc},
			Permissions: permissions,
			EmptyState:  LineageEmptyState{Kind: LineageEmptyStateNone},
			Links:       sourceLinksForDocument("src-doc-1"),
		},
		Comments:    sourceCommentsEmpty,
		Handles:     sourceHandlesMulti,
		Permissions: permissions,
		Links:       sourceWorkspaceLinksForDocument("src-doc-1", SourceWorkspacePanelAgreements, "agreement:agr-imported-v2"),
		EmptyState:  LineageEmptyState{Kind: LineageEmptyStateNone},
	}
	sourceSearchResults := SourceSearchResults{
		Items: []SourceSearchResultSummary{{
			ResultKind:    SourceManagementSearchResultSourceRevision,
			Source:        sourceRef,
			Revision:      secondRevision,
			Provider:      providerV2,
			MatchedFields: []string{"external_file_id", "provider_revision_hint"},
			Summary:       "Matched external_file_id, provider_revision_hint across canonical source metadata.",
			DrillIn:       &SourceWorkspaceDrillIn{Panel: SourceWorkspacePanelTimeline, Anchor: "revision:src-rev-2", Href: sourceManagementWorkspaceAnchorPath("src-doc-1", SourceWorkspacePanelTimeline, "revision:src-rev-2")},
			Links:         sourceRevisionLinks("src-rev-2", "src-doc-1"),
		}},
		PageInfo:     SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 10, TotalCount: 1, HasMore: false, Sort: sourceSearchSortRelevance},
		AppliedQuery: SourceSearchQuery{Query: "fixture-google-file-2", Sort: sourceSearchSortRelevance, Page: 1, PageSize: 10},
		Permissions:  permissions,
		EmptyState:   LineageEmptyState{Kind: LineageEmptyStateNone},
		Links:        SourceManagementLinks{Self: sourceManagementSearchPath()},
	}
	sourceDetailMerged := SourceDetail{
		Source:                &LineageReference{ID: "src-doc-merged", Label: "Merged Fixture Source", URL: sourceManagementSourcePath("src-doc-merged")},
		Status:                stores.SourceDocumentStatusMerged,
		LineageConfidence:     stores.LineageConfidenceBandMedium,
		Provider:              providerV2,
		ActiveHandle:          &secondHandle,
		LatestRevision:        secondRevision,
		RevisionCount:         2,
		HandleCount:           2,
		RelationshipCount:     1,
		PendingCandidateCount: 0,
		Permissions:           permissions,
		Links:                 sourceLinksForDocument("src-doc-merged"),
		EmptyState:            LineageEmptyState{Kind: LineageEmptyStateNone},
	}
	sourceDetailArchived := SourceDetail{
		Source:                &LineageReference{ID: "src-doc-archived", Label: "Archived Fixture Source", URL: sourceManagementSourcePath("src-doc-archived")},
		Status:                stores.SourceDocumentStatusArchived,
		LineageConfidence:     stores.LineageConfidenceBandExact,
		Provider:              providerV2,
		ActiveHandle:          &secondHandle,
		LatestRevision:        secondRevision,
		RevisionCount:         2,
		HandleCount:           2,
		RelationshipCount:     1,
		PendingCandidateCount: 0,
		Permissions:           permissions,
		Links:                 sourceLinksForDocument("src-doc-archived"),
		EmptyState:            LineageEmptyState{Kind: LineageEmptyStateNone},
	}
	reconciliationActions := []ReconciliationReviewAction{
		{ID: SourceRelationshipActionAttach, Label: "Attach Handle", RequiresReason: true, Available: true, Tone: "confirm"},
		{ID: SourceRelationshipActionMerge, Label: "Merge Sources", RequiresReason: true, Available: true, Tone: "warn"},
		{ID: SourceRelationshipActionRelated, Label: "Confirm Related", RequiresReason: true, Available: true, Tone: "confirm"},
		{ID: SourceRelationshipActionReject, Label: "Reject", RequiresReason: true, Available: true, Tone: "danger"},
		{ID: SourceRelationshipActionSupersede, Label: "Supersede", RequiresReason: true, Available: true, Tone: "secondary"},
	}
	reconciliationQueueBacklog := ReconciliationQueuePage{
		Items: []ReconciliationQueueItem{{
			Candidate: &SourceRelationshipSummary{
				ID:                  "src-rel-1",
				RelationshipType:    stores.SourceRelationshipTypeSameLogicalDoc,
				RelationshipKind:    SourceRelationshipKindContinuity,
				Status:              stores.SourceRelationshipStatusPendingReview,
				CounterpartRole:     SourceRelationshipRoleRelated,
				ConfidenceBand:      stores.LineageConfidenceBandMedium,
				ConfidenceScore:     0.72,
				Summary:             "Pending continuity candidate ready for queue review.",
				LeftSource:          &LineageReference{ID: "src-doc-candidate", Label: "Candidate Fixture Source", URL: sourceManagementSourcePath("src-doc-candidate")},
				RightSource:         sourceRef,
				ReviewActionVisible: LineageReviewVisibilityAdminOnly,
				Evidence:            []CandidateEvidenceSummary{{Code: "candidate_reason", Label: "Candidate match evidence"}},
				Links:               SourceManagementLinks{Self: sourceManagementReconciliationCandidatePath("src-rel-1"), Queue: sourceManagementReconciliationQueuePath(), Review: sourceManagementReconciliationCandidateReviewPath("src-rel-1")},
			},
			LeftSource: &ReconciliationQueueSourceSummary{
				Source:            &LineageReference{ID: "src-doc-candidate", Label: "Candidate Fixture Source", URL: sourceManagementSourcePath("src-doc-candidate")},
				Status:            stores.SourceDocumentStatusActive,
				LineageConfidence: stores.LineageConfidenceBandMedium,
				Provider:          providerV1,
				LatestRevision:    firstRevision,
				Permissions:       permissions,
				Links:             SourceManagementLinks{Self: sourceManagementSourcePath("src-doc-candidate"), Queue: sourceManagementReconciliationQueuePath()},
			},
			RightSource: &ReconciliationQueueSourceSummary{
				Source:            sourceRef,
				Status:            stores.SourceDocumentStatusActive,
				LineageConfidence: stores.LineageConfidenceBandExact,
				Provider:          providerV2,
				LatestRevision:    secondRevision,
				ActiveHandle:      &secondHandle,
				Permissions:       permissions,
				Links:             SourceManagementLinks{Self: sourceManagementSourcePath("src-doc-1"), Queue: sourceManagementReconciliationQueuePath()},
			},
			QueueAgeBand: ReconciliationQueueAgeBandLT7D,
			QueueAgeDays: 4,
			UpdatedAt:    timePtr(time.Date(2026, time.March, 18, 20, 0, 0, 0, time.UTC)),
			Actions:      reconciliationActions,
			Links:        SourceManagementLinks{Self: sourceManagementReconciliationCandidatePath("src-rel-1"), Queue: sourceManagementReconciliationQueuePath(), Review: sourceManagementReconciliationCandidateReviewPath("src-rel-1")},
		}},
		PageInfo:     SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 10, TotalCount: 1, HasMore: false, Sort: reconciliationQueueSortConfidenceDesc},
		AppliedQuery: ReconciliationQueueQuery{ConfidenceBand: stores.LineageConfidenceBandMedium, Sort: reconciliationQueueSortConfidenceDesc, Page: 1, PageSize: 10},
		Permissions:  permissions,
		EmptyState:   LineageEmptyState{Kind: LineageEmptyStateNone},
		Links:        SourceManagementLinks{Self: sourceManagementReconciliationQueuePath(), Queue: sourceManagementReconciliationQueuePath()},
	}
	reconciliationQueueEmpty := ReconciliationQueuePage{
		Items:        []ReconciliationQueueItem{},
		PageInfo:     SourceManagementPageInfo{Mode: SourceManagementPaginationModePage, Page: 1, PageSize: 10, TotalCount: 0, HasMore: false, Sort: reconciliationQueueSortConfidenceDesc},
		AppliedQuery: ReconciliationQueueQuery{ProviderKind: stores.SourceProviderKindGoogleDrive, Sort: reconciliationQueueSortConfidenceDesc, Page: 1, PageSize: 10},
		Permissions:  permissions,
		EmptyState:   LineageEmptyState{Kind: LineageEmptyStateNoResults, Title: "No queue candidates", Description: "There are no pending reconciliation candidates for the current filters."},
		Links:        SourceManagementLinks{Self: sourceManagementReconciliationQueuePath(), Queue: sourceManagementReconciliationQueuePath()},
	}
	reconciliationCandidate := ReconciliationCandidateDetail{
		Candidate:             reconciliationQueueBacklog.Items[0].Candidate,
		LeftSource:            reconciliationQueueBacklog.Items[0].LeftSource,
		RightSource:           reconciliationQueueBacklog.Items[0].RightSource,
		MatchedSourceRevision: firstRevision,
		Evidence: []CandidateEvidenceSummary{
			{Code: "candidate_reason", Label: "Candidate match evidence"},
			{Code: lineageEvidenceKeyTitleSimilarity, Label: "Title similarity", Details: "1.000"},
		},
		AuditTrail: []ReconciliationAuditEntry{{
			ID:         "audit-src-rel-1",
			Action:     "candidate_created",
			ActorID:    "fixture-user",
			Reason:     "initial queue seeding",
			FromStatus: "",
			ToStatus:   stores.SourceRelationshipStatusPendingReview,
			Summary:    "Candidate entered the reconciliation queue.",
			CreatedAt:  timePtr(time.Date(2026, time.March, 18, 20, 0, 0, 0, time.UTC)),
		}},
		Actions:     reconciliationActions,
		Permissions: permissions,
		Links:       SourceManagementLinks{Self: sourceManagementReconciliationCandidatePath("src-rel-1"), Queue: sourceManagementReconciliationQueuePath(), Review: sourceManagementReconciliationCandidateReviewPath("src-rel-1")},
		EmptyState:  LineageEmptyState{Kind: LineageEmptyStateNone},
	}

	return Phase11SourceManagementContractFixtures{
		SchemaVersion: 1,
		Rules: SourceManagementContractRules{
			FrontendPresentationOnly:   true,
			PaginationMode:             SourceManagementPaginationModePage,
			DefaultPageSize:            defaultSourceManagementPageSize,
			MaxPageSize:                maxSourceManagementPageSize,
			SupportedSourceSorts:       []string{sourceListSortUpdatedDesc, sourceListSortTitleAsc, sourceListSortTitleDesc, sourceListSortPendingDesc},
			SupportedRevisionSorts:     []string{sourceRevisionSortLatestDesc, sourceRevisionSortOldestAsc},
			SupportedRelationshipSorts: []string{sourceRelationshipSortConfidence, sourceRelationshipSortCreated},
			SupportedSearchSorts:       []string{sourceSearchSortRelevance, sourceSearchSortTitleAsc},
			ProviderLinkVisibility:     SourceManagementLinkVisibilityAdminView,
			DiagnosticsVisibility:      SourceManagementLinkVisibilityAdminView,
			CandidateReviewVisibility:  LineageReviewVisibilityAdminOnly,
		},
		Queries: Phase11SourceManagementQueryFixtures{
			ListSources: SourceListQuery{Query: "fixture-google-file-2", HasPendingCandidates: &pendingOnly, Sort: sourceListSortPendingDesc, Page: 1, PageSize: 10},
			ListRevisions: SourceRevisionListQuery{
				Sort:     sourceRevisionSortLatestDesc,
				Page:     1,
				PageSize: 10,
			},
			ListRelationships: SourceRelationshipListQuery{
				Status:   stores.SourceRelationshipStatusPendingReview,
				Sort:     sourceRelationshipSortConfidence,
				Page:     1,
				PageSize: 10,
			},
			Search: SourceSearchQuery{
				Query:    "fixture-google-file-2",
				Sort:     sourceSearchSortRelevance,
				Page:     1,
				PageSize: 10,
			},
		},
		States: Phase11SourceManagementFixtureStates{
			SourceListEmpty:            sourceListEmpty,
			SourceListSingle:           sourceListSingle,
			SourceDetailRepeated:       sourceDetailRepeated,
			SourceWorkspaceRepeated:    sourceWorkspaceRepeated,
			SourceHandlesMulti:         sourceHandlesMulti,
			SourceRevisionsRepeated:    sourceRevisionsRepeated,
			SourceRelationshipsReview:  sourceRelationshipsReview,
			SourceAgreementsRepeated:   sourceAgreementsRepeated,
			SourceRevisionDetail:       sourceRevisionDetail,
			SourceArtifacts:            sourceArtifacts,
			SourceCommentsEmpty:        sourceCommentsEmpty,
			SourceSearchResults:        sourceSearchResults,
			SourceDetailMerged:         sourceDetailMerged,
			SourceDetailArchived:       sourceDetailArchived,
			ReconciliationQueueBacklog: reconciliationQueueBacklog,
			ReconciliationQueueEmpty:   reconciliationQueueEmpty,
			ReconciliationCandidate:    reconciliationCandidate,
		},
	}
}

func timePtr(value time.Time) *time.Time {
	cloned := value.UTC()
	return &cloned
}
