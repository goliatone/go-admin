package modules

import (
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
)

func TestBuildDocumentLineagePresentationUsesBackendAuthoredWarnings(t *testing.T) {
	presentation := buildDocumentLineagePresentation(services.DocumentLineageDetail{
		DocumentID: "doc-lineage-presentation",
		SourceDocument: &services.LineageReference{
			ID:    "src-doc-1",
			Label: "Master Service Agreement",
		},
		SourceRevision: &services.SourceRevisionSummary{ID: "src-rev-1"},
		SourceArtifact: &services.SourceArtifactSummary{ID: "src-art-1", ArtifactKind: "signable_pdf"},
		FingerprintStatus: services.FingerprintStatusSummary{
			Status: services.LineageFingerprintStatusPending,
		},
		PresentationWarnings: []services.LineagePresentationWarning{
			{
				ID:                  "rel-1",
				Type:                "candidate_relationship",
				Severity:            services.LineageWarningSeverityWarning,
				Title:               "Same Logical Doc - Pending Review",
				Description:         "Potential continuity candidate requires operator review",
				ActionLabel:         "Review in diagnostics",
				ActionURL:           "/admin/debug/lineage/documents/doc-lineage-presentation",
				ReviewActionVisible: services.LineageReviewVisibilityAdminOnly,
			},
			{
				ID:          "fingerprint_pending_warning",
				Type:        "fingerprint_pending",
				Severity:    services.LineageWarningSeverityInfo,
				Title:       "Fingerprint Processing",
				Description: "Document fingerprinting is in progress. Candidate detection may be incomplete.",
			},
		},
		DiagnosticsURL: "/admin/debug/lineage/documents/doc-lineage-presentation",
		EmptyState:     services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
	})

	warnings, ok := presentation["warnings"].([]map[string]any)
	if !ok || len(warnings) != 2 {
		t.Fatalf("expected document presentation warnings to pass through in backend order, got %+v", presentation["warnings"])
	}
	if toString(warnings[0]["action_label"]) != "Review in diagnostics" {
		t.Fatalf("expected document presentation action label, got %+v", warnings[0])
	}
	if toString(warnings[0]["action_url"]) != "/admin/debug/lineage/documents/doc-lineage-presentation" {
		t.Fatalf("expected document presentation action url, got %+v", warnings[0])
	}
	if toString(warnings[1]["type"]) != "fingerprint_pending" {
		t.Fatalf("expected fingerprint warning to remain in backend-authored list, got %+v", warnings)
	}
}

func TestBuildAgreementLineagePresentationTreatsArtifactOnlyLineageAsPartial(t *testing.T) {
	presentation := buildAgreementLineagePresentation(services.AgreementLineageDetail{
		AgreementID:            "agr-lineage-partial",
		LinkedDocumentArtifact: &services.SourceArtifactSummary{ID: "src-art-partial", ArtifactKind: "signable_pdf"},
		PresentationWarnings:   nil,
		DiagnosticsURL:         "/admin/debug/lineage/agreements/agr-lineage-partial",
		EmptyState:             services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
	})

	if got := toString(presentation["status"]); got != "partial" {
		t.Fatalf("expected artifact-only agreement lineage to render partial status, got %+v", presentation)
	}
	if got := toBool(presentation["has_lineage"]); !got {
		t.Fatalf("expected artifact-only agreement lineage to report has_lineage, got %+v", presentation)
	}
}

func TestBuildAgreementLineagePresentationExposesSourceAndNewerSourceSummary(t *testing.T) {
	presentation := buildAgreementLineagePresentation(services.AgreementLineageDetail{
		AgreementID:            "agr-lineage-native",
		SourceDocument:         &services.LineageReference{ID: "src-doc-1", Label: "Master Service Agreement", URL: "https://docs.google.com/document/d/src-doc-1/edit"},
		PinnedSourceRevisionID: "src-rev-1",
		SourceRevision:         &services.SourceRevisionSummary{ID: "src-rev-1", ProviderRevisionHint: "v1"},
		LinkedDocumentArtifact: &services.SourceArtifactSummary{ID: "src-art-1", ArtifactKind: "signable_pdf"},
		NewerSourceExists:      true,
		NewerSourceSummary: &services.NewerSourceSummary{
			Exists:                 true,
			PinnedSourceRevisionID: "src-rev-1",
			LatestSourceRevisionID: "src-rev-2",
			Summary:                "A newer source revision exists while this agreement remains pinned to the revision used at creation time.",
		},
		EmptyState: services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
	})

	source, ok := presentation["source"].(map[string]any)
	if !ok || toString(source["url"]) != "https://docs.google.com/document/d/src-doc-1/edit" {
		t.Fatalf("expected agreement presentation source link, got %+v", presentation["source"])
	}
	newerSource, ok := presentation["newer_source"].(map[string]any)
	if !ok || toString(newerSource["latest_source_revision_id"]) != "src-rev-2" {
		t.Fatalf("expected agreement newer_source summary, got %+v", presentation["newer_source"])
	}
}

func TestBuildDocumentLineagePresentationExposesFingerprintFailureMetadata(t *testing.T) {
	presentation := buildDocumentLineagePresentation(services.DocumentLineageDetail{
		DocumentID:     "doc-lineage-failed",
		SourceDocument: &services.LineageReference{ID: "src-doc-1"},
		SourceRevision: &services.SourceRevisionSummary{ID: "src-rev-1"},
		SourceArtifact: &services.SourceArtifactSummary{ID: "src-art-1", ArtifactKind: "signable_pdf"},
		DiagnosticsURL: "/admin/debug/lineage/documents/doc-lineage-failed",
		EmptyState:     services.LineageEmptyState{Kind: services.LineageEmptyStateNone},
		FingerprintStatus: services.FingerprintStatusSummary{
			Status:         services.LineageFingerprintStatusFailed,
			ExtractVersion: "v1_pdf_text",
			ErrorCode:      "EXTRACTION_FAILED",
			ErrorMessage:   "PDF text extraction failed",
		},
	})

	fingerprint, ok := presentation["fingerprint_status"].(map[string]any)
	if !ok {
		t.Fatalf("expected fingerprint status presentation map, got %+v", presentation["fingerprint_status"])
	}
	if got := toString(fingerprint["status_label"]); got != "Fingerprint Failed" {
		t.Fatalf("expected failed fingerprint label, got %+v", fingerprint)
	}
	if got := toString(fingerprint["error_code"]); got != "EXTRACTION_FAILED" {
		t.Fatalf("expected failed fingerprint error code, got %+v", fingerprint)
	}
	if got := toString(fingerprint["error_message"]); got != "PDF text extraction failed" {
		t.Fatalf("expected failed fingerprint error message, got %+v", fingerprint)
	}
	if got := toBool(fingerprint["is_not_applicable"]); got {
		t.Fatalf("expected failed fingerprint to not be marked not_applicable, got %+v", fingerprint)
	}
}
