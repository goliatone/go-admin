package handlers

import (
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestGoogleImportRunRecordToMapIncludesLineageTransportFields(t *testing.T) {
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	payload := googleImportRunRecordToMap(stores.GoogleImportRunRecord{
		ID:                  "run-1",
		Status:              stores.GoogleImportRunStatusSucceeded,
		UserID:              "ops-user",
		GoogleFileID:        "google-file-1",
		SourceVersionHint:   "v1",
		DocumentID:          "doc-1",
		AgreementID:         "agr-1",
		SourceDocumentID:    "src-doc-1",
		SourceRevisionID:    "src-rev-1",
		SourceArtifactID:    "src-art-1",
		LineageStatus:       "linked",
		FingerprintStatus:   "pending",
		CandidateStatusJSON: `[{"id":"rel-1","relationship_type":"same_logical_doc","status":"pending_review","confidence_band":"medium","summary":"review"}]`,
		DocumentDetailURL:   "/admin/content/esign_documents/doc-1",
		AgreementDetailURL:  "/admin/content/esign_agreements/agr-1",
		CreatedAt:           now,
		UpdatedAt:           now,
	})

	if payload["source_document_id"] != "src-doc-1" {
		t.Fatalf("expected source_document_id, got %+v", payload)
	}
	if payload["source_revision_id"] != "src-rev-1" {
		t.Fatalf("expected source_revision_id, got %+v", payload)
	}
	if payload["source_artifact_id"] != "src-art-1" {
		t.Fatalf("expected source_artifact_id, got %+v", payload)
	}
	if payload["lineage_status"] != "linked" {
		t.Fatalf("expected lineage_status linked, got %+v", payload)
	}
	candidates, ok := payload["candidate_status"].([]any)
	if !ok || len(candidates) != 1 {
		t.Fatalf("expected candidate_status array, got %+v", payload["candidate_status"])
	}
}
