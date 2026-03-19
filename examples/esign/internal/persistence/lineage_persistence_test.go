package persistence

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestPhase2SQLiteLineagePersistenceAndFixtures(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase2", OrgID: "org-phase2"}
	bootstrap := newSQLiteBootstrapForStoreAdapterTests(t)
	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	t.Cleanup(func() { _ = cleanup() })

	lineage, ok := any(adapter).(stores.LineageStore)
	if !ok {
		t.Fatalf("expected store adapter to implement LineageStore")
	}

	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	document, err := lineage.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Phase 2 Relational Fixture",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument: %v", err)
	}
	handle, err := lineage.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		SourceDocumentID: document.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-file-bootstrap",
		AccountID:        "account-1",
		WebURL:           "https://docs.google.com/document/d/google-file-bootstrap/edit",
		HandleStatus:     stores.SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	revision, err := lineage.CreateSourceRevision(ctx, scope, stores.SourceRevisionRecord{
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
	if _, err := lineage.CreateSourceArtifact(ctx, scope, stores.SourceArtifactRecord{
		SourceRevisionID:    revision.ID,
		ArtifactKind:        stores.SourceArtifactKindSignablePDF,
		ObjectKey:           "fixtures/phase2.pdf",
		SHA256:              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		PageCount:           2,
		SizeBytes:           2048,
		CompatibilityTier:   "full",
		NormalizationStatus: "completed",
		CreatedAt:           now,
		UpdatedAt:           now,
	}); err != nil {
		t.Fatalf("CreateSourceArtifact: %v", err)
	}

	fixtures, err := stores.SeedLineageFixtures(ctx, bootstrap.BunDB, scope)
	if err != nil {
		t.Fatalf("SeedLineageFixtures: %v", err)
	}
	if fixtures.ImportedDocumentID == "" || fixtures.CandidateRelationshipID == "" {
		t.Fatalf("expected seeded lineage fixtures, got %+v", fixtures)
	}
	if err := CheckReadiness(ctx, bootstrap.Client); err != nil {
		t.Fatalf("CheckReadiness: %v", err)
	}
}

func TestPhase2CheckLineageIntegrityFailsOnMalformedGoogleMetadata(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase2-bad", OrgID: "org-phase2-bad"}
	bootstrap := newSQLiteBootstrapForStoreAdapterTests(t)

	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	if _, err := bootstrap.BunDB.ExecContext(ctx, `
INSERT INTO source_documents (id, tenant_id, org_id, provider_kind, canonical_title, status, lineage_confidence, created_at, updated_at)
VALUES (?, ?, ?, 'google_drive', ?, 'active', 'exact', ?, ?)
`, "src-doc-1", scope.TenantID, scope.OrgID, "Bad Metadata", now, now); err != nil {
		t.Fatalf("insert source_documents: %v", err)
	}
	if _, err := bootstrap.BunDB.ExecContext(ctx, `
INSERT INTO source_handles (id, tenant_id, org_id, source_document_id, provider_kind, external_file_id, account_id, drive_id, web_url, handle_status, valid_from, valid_to, created_at, updated_at)
VALUES (?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, 'active', ?, NULL, ?, ?)
`, "src-handle-1", scope.TenantID, scope.OrgID, "src-doc-1", "google-file-1", "account-1", "drive-root", "https://docs.google.com/document/d/google-file-1/edit", now, now, now); err != nil {
		t.Fatalf("insert source_handles: %v", err)
	}
	if _, err := bootstrap.BunDB.ExecContext(ctx, `
INSERT INTO source_revisions (id, tenant_id, org_id, source_document_id, source_handle_id, provider_revision_hint, modified_time, exported_at, exported_by_user_id, source_mime_type, metadata_json, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, "src-rev-1", scope.TenantID, scope.OrgID, "src-doc-1", "src-handle-1", "v1", now, now, "fixture-user", "application/vnd.google-apps.document", `{bad-json`, now, now); err != nil {
		t.Fatalf("insert source_revisions: %v", err)
	}

	if err := CheckLineageIntegrity(ctx, bootstrap.Client); err == nil {
		t.Fatalf("expected malformed metadata integrity failure")
	}
}

func TestPhase2CheckLineageIntegrityFailsOnOrphanedDocumentLinks(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase2-orphan", OrgID: "org-phase2-orphan"}
	bootstrap := newSQLiteBootstrapForStoreAdapterTests(t)

	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	if _, err := bootstrap.BunDB.ExecContext(ctx, `
INSERT INTO documents (id, tenant_id, org_id, title, source_original_name, source_object_key, source_sha256, size_bytes, page_count, source_document_id, source_revision_id, source_artifact_id, created_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, "doc-orphan-1", scope.TenantID, scope.OrgID, "Orphaned Lineage", "orphan.pdf", "fixtures/orphan.pdf", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 1024, 1, "missing-source-doc", "missing-source-rev", "missing-source-artifact", "fixture-user", now, now); err != nil {
		t.Fatalf("insert documents: %v", err)
	}

	if err := CheckLineageIntegrity(ctx, bootstrap.Client); err == nil {
		t.Fatalf("expected orphaned document lineage integrity failure")
	}
}

func TestPhase2SQLiteLineagePersistenceNormalizesDefaultsAndRejectsDuplicateRelationships(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase2-defaults", OrgID: "org-phase2-defaults"}
	bootstrap := newSQLiteBootstrapForStoreAdapterTests(t)
	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	t.Cleanup(func() { _ = cleanup() })

	lineage, ok := any(adapter).(stores.LineageStore)
	if !ok {
		t.Fatalf("expected store adapter to implement LineageStore")
	}

	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	document, err := lineage.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ProviderKind: stores.SourceProviderKindGoogleDrive,
		CreatedAt:    now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument: %v", err)
	}
	if document.Status != stores.SourceDocumentStatusActive {
		t.Fatalf("expected active default status, got %q", document.Status)
	}
	if document.LineageConfidence != stores.LineageConfidenceBandExact {
		t.Fatalf("expected exact default confidence, got %q", document.LineageConfidence)
	}

	handle, err := lineage.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		SourceDocumentID: document.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-file-defaults",
		AccountID:        "account-1",
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	revision, err := lineage.CreateSourceRevision(ctx, scope, stores.SourceRevisionRecord{
		SourceDocumentID: document.ID,
		SourceHandleID:   handle.ID,
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision: %v", err)
	}
	artifact, err := lineage.CreateSourceArtifact(ctx, scope, stores.SourceArtifactRecord{
		SourceRevisionID: revision.ID,
		ArtifactKind:     stores.SourceArtifactKindSignablePDF,
		ObjectKey:        "fixtures/defaults.pdf",
		SHA256:           strings.Repeat("e", 64),
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceArtifact: %v", err)
	}
	if _, err := lineage.CreateSourceFingerprint(ctx, scope, stores.SourceFingerprintRecord{
		SourceRevisionID: revision.ID,
		ArtifactID:       artifact.ID,
		CreatedAt:        now,
	}); err == nil {
		t.Fatalf("expected missing extract_version rejection")
	}

	relationship, err := lineage.CreateSourceRelationship(ctx, scope, stores.SourceRelationshipRecord{
		LeftSourceDocumentID:  document.ID,
		RightSourceDocumentID: document.ID,
		RelationshipType:      stores.SourceRelationshipTypeSameLogicalDoc,
		CreatedAt:             now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRelationship: %v", err)
	}
	if relationship.Status != stores.SourceRelationshipStatusPendingReview {
		t.Fatalf("expected pending_review default status, got %q", relationship.Status)
	}
	if relationship.ConfidenceBand != stores.LineageConfidenceBandMedium {
		t.Fatalf("expected medium default confidence band, got %q", relationship.ConfidenceBand)
	}
	if _, err := lineage.CreateSourceRelationship(ctx, scope, stores.SourceRelationshipRecord{
		LeftSourceDocumentID:  document.ID,
		RightSourceDocumentID: document.ID,
		RelationshipType:      stores.SourceRelationshipTypeSameLogicalDoc,
		CreatedAt:             now.Add(time.Minute),
	}); err == nil {
		t.Fatalf("expected duplicate relationship rejection")
	}
}

func TestPhase2SQLiteLineagePersistenceRejectsRevisionWhenHandleBelongsToDifferentDocument(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase2-mismatch", OrgID: "org-phase2-mismatch"}
	bootstrap := newSQLiteBootstrapForStoreAdapterTests(t)
	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	t.Cleanup(func() { _ = cleanup() })

	lineage, ok := any(adapter).(stores.LineageStore)
	if !ok {
		t.Fatalf("expected store adapter to implement LineageStore")
	}

	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	left, err := lineage.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Left",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument left: %v", err)
	}
	right, err := lineage.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Right",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument right: %v", err)
	}
	handle, err := lineage.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		SourceDocumentID: left.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-file-left",
		AccountID:        "account-1",
		HandleStatus:     stores.SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	if _, err := lineage.CreateSourceRevision(ctx, scope, stores.SourceRevisionRecord{
		SourceDocumentID: right.ID,
		SourceHandleID:   handle.ID,
		CreatedAt:        now,
		UpdatedAt:        now,
	}); err == nil {
		t.Fatalf("expected mismatched handle/document revision rejection")
	}
}
