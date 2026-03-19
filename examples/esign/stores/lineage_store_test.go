package stores

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestInMemoryLineageStoreCRUDAndUniqueness(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)

	document, err := store.CreateSourceDocument(ctx, scope, SourceDocumentRecord{
		ProviderKind:      SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Store Lineage Fixture",
		Status:            SourceDocumentStatusActive,
		LineageConfidence: LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument: %v", err)
	}
	handle, err := store.CreateSourceHandle(ctx, scope, SourceHandleRecord{
		SourceDocumentID: document.ID,
		ProviderKind:     SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-file-1",
		AccountID:        "account-1",
		WebURL:           "https://docs.google.com/document/d/google-file-1/edit",
		HandleStatus:     SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	revision, err := store.CreateSourceRevision(ctx, scope, SourceRevisionRecord{
		SourceDocumentID:     document.ID,
		SourceHandleID:       handle.ID,
		ProviderRevisionHint: "v1",
		ModifiedTime:         &now,
		ExportedAt:           &now,
		ExportedByUserID:     "fixture-user",
		SourceMimeType:       "application/vnd.google-apps.document",
		MetadataJSON:         `{"revision_signature":"sig-v1"}`,
		CreatedAt:            now,
		UpdatedAt:            now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision: %v", err)
	}
	artifact, err := store.CreateSourceArtifact(ctx, scope, SourceArtifactRecord{
		SourceRevisionID:    revision.ID,
		ArtifactKind:        SourceArtifactKindSignablePDF,
		ObjectKey:           "fixtures/store-lineage.pdf",
		SHA256:              strings.Repeat("a", 64),
		PageCount:           3,
		SizeBytes:           1024,
		CompatibilityTier:   "full",
		NormalizationStatus: "completed",
		CreatedAt:           now,
		UpdatedAt:           now,
	})
	if err != nil {
		t.Fatalf("CreateSourceArtifact: %v", err)
	}
	if _, err := store.CreateSourceFingerprint(ctx, scope, SourceFingerprintRecord{
		SourceRevisionID:     revision.ID,
		ArtifactID:           artifact.ID,
		ExtractVersion:       SourceExtractVersionPDFTextV1,
		RawSHA256:            strings.Repeat("a", 64),
		NormalizedTextSHA256: strings.Repeat("b", 64),
		TokenCount:           42,
		CreatedAt:            now,
	}); err != nil {
		t.Fatalf("CreateSourceFingerprint: %v", err)
	}
	if _, err := store.CreateSourceRelationship(ctx, scope, SourceRelationshipRecord{
		LeftSourceDocumentID:  document.ID,
		RightSourceDocumentID: document.ID,
		RelationshipType:      SourceRelationshipTypeSameLogicalDoc,
		ConfidenceBand:        LineageConfidenceBandHigh,
		ConfidenceScore:       1,
		Status:                SourceRelationshipStatusConfirmed,
		EvidenceJSON:          `{}`,
		CreatedByUserID:       "fixture-user",
		CreatedAt:             now,
		UpdatedAt:             now,
	}); err != nil {
		t.Fatalf("CreateSourceRelationship: %v", err)
	}

	if _, err := store.GetActiveSourceHandle(ctx, scope, SourceProviderKindGoogleDrive, "google-file-1", "account-1"); err != nil {
		t.Fatalf("GetActiveSourceHandle: %v", err)
	}
	revisions, err := store.ListSourceRevisions(ctx, scope, SourceRevisionQuery{SourceDocumentID: document.ID})
	if err != nil {
		t.Fatalf("ListSourceRevisions: %v", err)
	}
	if len(revisions) != 1 || revisions[0].ID != revision.ID {
		t.Fatalf("expected revision %q, got %+v", revision.ID, revisions)
	}
	artifacts, err := store.ListSourceArtifacts(ctx, scope, SourceArtifactQuery{SourceRevisionID: revision.ID})
	if err != nil {
		t.Fatalf("ListSourceArtifacts: %v", err)
	}
	if len(artifacts) != 1 || artifacts[0].ID != artifact.ID {
		t.Fatalf("expected artifact %q, got %+v", artifact.ID, artifacts)
	}

	if _, err := store.CreateSourceHandle(ctx, scope, SourceHandleRecord{
		SourceDocumentID: document.ID,
		ProviderKind:     SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-file-1",
		AccountID:        "account-1",
		HandleStatus:     SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	}); err == nil {
		t.Fatalf("expected duplicate active handle rejection")
	}
}

func TestInMemoryLineageStoreNormalizesDefaultsAndRejectsInvalidFingerprintCreate(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-defaults", OrgID: "org-defaults"}
	store := NewInMemoryStore()
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)

	document, err := store.CreateSourceDocument(ctx, scope, SourceDocumentRecord{
		ProviderKind: SourceProviderKindGoogleDrive,
		CreatedAt:    now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument: %v", err)
	}
	if document.Status != SourceDocumentStatusActive {
		t.Fatalf("expected active default status, got %q", document.Status)
	}
	if document.LineageConfidence != LineageConfidenceBandExact {
		t.Fatalf("expected exact default confidence, got %q", document.LineageConfidence)
	}

	handle, err := store.CreateSourceHandle(ctx, scope, SourceHandleRecord{
		SourceDocumentID: document.ID,
		ProviderKind:     SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-defaults-1",
		AccountID:        "account-1",
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	revision, err := store.CreateSourceRevision(ctx, scope, SourceRevisionRecord{
		SourceDocumentID: document.ID,
		SourceHandleID:   handle.ID,
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision: %v", err)
	}
	artifact, err := store.CreateSourceArtifact(ctx, scope, SourceArtifactRecord{
		SourceRevisionID: revision.ID,
		ArtifactKind:     SourceArtifactKindSignablePDF,
		ObjectKey:        "fixtures/defaults.pdf",
		SHA256:           strings.Repeat("d", 64),
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceArtifact: %v", err)
	}
	if _, err := store.CreateSourceFingerprint(ctx, scope, SourceFingerprintRecord{
		SourceRevisionID: revision.ID,
		ArtifactID:       artifact.ID,
		CreatedAt:        now,
	}); err == nil {
		t.Fatalf("expected missing extract version rejection")
	}

	relationship, err := store.CreateSourceRelationship(ctx, scope, SourceRelationshipRecord{
		LeftSourceDocumentID:  document.ID,
		RightSourceDocumentID: document.ID,
		RelationshipType:      SourceRelationshipTypeSameLogicalDoc,
		CreatedAt:             now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRelationship: %v", err)
	}
	if relationship.Status != SourceRelationshipStatusPendingReview {
		t.Fatalf("expected pending_review default status, got %q", relationship.Status)
	}
	if relationship.ConfidenceBand != LineageConfidenceBandMedium {
		t.Fatalf("expected medium default confidence band, got %q", relationship.ConfidenceBand)
	}
}

func TestInMemoryLineageStoreRejectsRevisionWhenHandleBelongsToDifferentDocument(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-lineage", OrgID: "org-lineage"}
	store := NewInMemoryStore()
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)

	left, err := store.CreateSourceDocument(ctx, scope, SourceDocumentRecord{
		ProviderKind:      SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Left",
		Status:            SourceDocumentStatusActive,
		LineageConfidence: LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument left: %v", err)
	}
	right, err := store.CreateSourceDocument(ctx, scope, SourceDocumentRecord{
		ProviderKind:      SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Right",
		Status:            SourceDocumentStatusActive,
		LineageConfidence: LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument right: %v", err)
	}
	handle, err := store.CreateSourceHandle(ctx, scope, SourceHandleRecord{
		SourceDocumentID: left.ID,
		ProviderKind:     SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-file-left",
		AccountID:        "account-1",
		HandleStatus:     SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	if _, err := store.CreateSourceRevision(ctx, scope, SourceRevisionRecord{
		SourceDocumentID: right.ID,
		SourceHandleID:   handle.ID,
		CreatedAt:        now,
		UpdatedAt:        now,
	}); err == nil {
		t.Fatalf("expected mismatched handle/document revision rejection")
	}
}
