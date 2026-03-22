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
	otherDocument, err := lineage.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ProviderKind: stores.SourceProviderKindGoogleDrive,
		CreatedAt:    now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument other: %v", err)
	}
	otherHandle, err := lineage.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		SourceDocumentID: otherDocument.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-defaults-2",
		AccountID:        "account-2",
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle other: %v", err)
	}
	otherRevision, err := lineage.CreateSourceRevision(ctx, scope, stores.SourceRevisionRecord{
		SourceDocumentID: otherDocument.ID,
		SourceHandleID:   otherHandle.ID,
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision other: %v", err)
	}
	otherArtifact, err := lineage.CreateSourceArtifact(ctx, scope, stores.SourceArtifactRecord{
		SourceRevisionID: otherRevision.ID,
		ArtifactKind:     stores.SourceArtifactKindSignablePDF,
		ObjectKey:        "fixtures/defaults-other.pdf",
		SHA256:           strings.Repeat("f", 64),
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceArtifact other: %v", err)
	}
	if _, err := lineage.CreateSourceFingerprint(ctx, scope, stores.SourceFingerprintRecord{
		SourceRevisionID: revision.ID,
		ArtifactID:       otherArtifact.ID,
		ExtractVersion:   stores.SourceExtractVersionPDFTextV1,
		CreatedAt:        now,
	}); err == nil {
		t.Fatalf("expected mismatched artifact/source revision rejection")
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

func TestPhase12SQLiteLineagePersistenceStoresDirectionalRelationshipEndpointsAndUsageAggregates(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase12-lineage", OrgID: "org-phase12-lineage"}
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
	usageStore, ok := any(adapter).(stores.SourceRevisionUsageStore)
	if !ok {
		t.Fatalf("expected store adapter to implement SourceRevisionUsageStore")
	}

	now := time.Date(2026, 3, 21, 10, 0, 0, 0, time.UTC)
	predecessor, err := lineage.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ID:                "src-doc-predecessor",
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Predecessor",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument predecessor: %v", err)
	}
	successor, err := lineage.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ID:                "src-doc-successor",
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Successor",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument successor: %v", err)
	}
	predecessorHandle, err := lineage.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		ID:               "src-handle-predecessor",
		SourceDocumentID: predecessor.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "file-predecessor",
		AccountID:        "acct-1",
		HandleStatus:     stores.SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle predecessor: %v", err)
	}
	successorHandle, err := lineage.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		ID:               "src-handle-successor",
		SourceDocumentID: successor.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "file-successor",
		AccountID:        "acct-2",
		HandleStatus:     stores.SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle successor: %v", err)
	}
	predecessorRevision, err := lineage.CreateSourceRevision(ctx, scope, stores.SourceRevisionRecord{
		ID:               "src-rev-predecessor",
		SourceDocumentID: predecessor.ID,
		SourceHandleID:   predecessorHandle.ID,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision predecessor: %v", err)
	}
	successorRevision, err := lineage.CreateSourceRevision(ctx, scope, stores.SourceRevisionRecord{
		ID:               "src-rev-successor",
		SourceDocumentID: successor.ID,
		SourceHandleID:   successorHandle.ID,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision successor: %v", err)
	}

	relationship, err := lineage.CreateSourceRelationship(ctx, scope, stores.SourceRelationshipRecord{
		ID:                          "src-rel-directional",
		LeftSourceDocumentID:        predecessor.ID,
		RightSourceDocumentID:       successor.ID,
		PredecessorSourceDocumentID: predecessor.ID,
		SuccessorSourceDocumentID:   successor.ID,
		RelationshipType:            stores.SourceRelationshipTypeCopiedFrom,
		ConfidenceBand:              stores.LineageConfidenceBandHigh,
		ConfidenceScore:             0.9,
		Status:                      stores.SourceRelationshipStatusConfirmed,
		CreatedAt:                   now,
		UpdatedAt:                   now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRelationship directional: %v", err)
	}
	if relationship.PredecessorSourceDocumentID != predecessor.ID || relationship.SuccessorSourceDocumentID != successor.ID {
		t.Fatalf("expected persisted directional endpoints, got %+v", relationship)
	}

	if _, err := adapter.Create(ctx, scope, stores.DocumentRecord{
		ID:                 "doc-pinned-successor",
		Title:              "Pinned Successor",
		SourceOriginalName: "pinned-successor.pdf",
		SourceObjectKey:    "fixtures/pinned-successor.pdf",
		SourceSHA256:       strings.Repeat("c", 64),
		SizeBytes:          2048,
		PageCount:          2,
		SourceDocumentID:   successor.ID,
		SourceRevisionID:   successorRevision.ID,
		CreatedByUserID:    "fixture-user",
		CreatedAt:          now,
		UpdatedAt:          now,
	}); err != nil {
		t.Fatalf("Create pinned document: %v", err)
	}
	if _, err := adapter.CreateDraft(ctx, scope, stores.AgreementRecord{
		ID:               "agr-pinned-successor",
		DocumentID:       "doc-pinned-successor",
		Title:            "Pinned Successor Agreement",
		Status:           stores.AgreementStatusDraft,
		Version:          1,
		SourceRevisionID: successorRevision.ID,
		CreatedByUserID:  "fixture-user",
		UpdatedByUserID:  "fixture-user",
		CreatedAt:        now,
		UpdatedAt:        now,
	}); err != nil {
		t.Fatalf("CreateDraft pinned agreement: %v", err)
	}

	usage, err := usageStore.ListSourceRevisionUsage(ctx, scope, stores.SourceRevisionUsageQuery{
		SourceDocumentIDs: []string{successor.ID},
		SourceRevisionIDs: []string{predecessorRevision.ID, successorRevision.ID},
	})
	if err != nil {
		t.Fatalf("ListSourceRevisionUsage: %v", err)
	}
	if len(usage) != 1 {
		t.Fatalf("expected one usage aggregate, got %+v", usage)
	}
	if usage[0].SourceRevisionID != successorRevision.ID || usage[0].PinnedDocumentCount != 1 || usage[0].PinnedAgreementCount != 1 {
		t.Fatalf("expected successor revision aggregate counts, got %+v", usage[0])
	}
}

func TestPhase13SQLiteLineagePersistenceStoresSourceCommentsAndSearchDocuments(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-phase13-lineage", OrgID: "org-phase13-lineage"}
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

	now := time.Date(2026, 3, 21, 14, 0, 0, 0, time.UTC)
	document, err := lineage.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ID:                "src-doc-phase13",
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Phase 13 Source",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument: %v", err)
	}
	handle, err := lineage.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		ID:               "src-handle-phase13",
		SourceDocumentID: document.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "phase13-file",
		AccountID:        "acct-phase13",
		HandleStatus:     stores.SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	revision, err := lineage.CreateSourceRevision(ctx, scope, stores.SourceRevisionRecord{
		ID:                   "src-rev-phase13",
		SourceDocumentID:     document.ID,
		SourceHandleID:       handle.ID,
		ProviderRevisionHint: "v-phase13",
		CreatedAt:            now,
		UpdatedAt:            now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision: %v", err)
	}

	thread, err := lineage.CreateSourceCommentThread(ctx, scope, stores.SourceCommentThreadRecord{
		ID:                "src-comment-thread-1",
		SourceDocumentID:  document.ID,
		SourceRevisionID:  revision.ID,
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		ProviderCommentID: "provider-comment-1",
		ThreadID:          "provider-thread-1",
		Status:            stores.SourceCommentThreadStatusOpen,
		AnchorKind:        stores.SourceCommentAnchorKindDocument,
		AnchorJSON:        `{"kind":"document","label":"Document"}`,
		AuthorJSON:        `{"display_name":"Reviewer","email":"reviewer@example.com","type":"user"}`,
		BodyPreview:       "First comment body",
		MessageCount:      1,
		ReplyCount:        0,
		SyncStatus:        stores.SourceCommentSyncStatusSynced,
		LastSyncedAt:      &now,
		LastActivityAt:    &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceCommentThread: %v", err)
	}
	if _, err := lineage.CreateSourceCommentMessage(ctx, scope, stores.SourceCommentMessageRecord{
		ID:                    "src-comment-message-1",
		SourceCommentThreadID: thread.ID,
		SourceRevisionID:      revision.ID,
		ProviderMessageID:     "provider-message-1",
		MessageKind:           stores.SourceCommentMessageKindComment,
		BodyText:              "First comment body",
		BodyPreview:           "First comment body",
		AuthorJSON:            `{"display_name":"Reviewer","email":"reviewer@example.com","type":"user"}`,
		CreatedAt:             now,
		UpdatedAt:             now,
	}); err != nil {
		t.Fatalf("CreateSourceCommentMessage: %v", err)
	}
	if _, err := lineage.CreateSourceCommentSyncState(ctx, scope, stores.SourceCommentSyncStateRecord{
		ID:               "src-comment-sync-1",
		SourceDocumentID: document.ID,
		SourceRevisionID: revision.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		SyncStatus:       stores.SourceCommentSyncStatusSynced,
		ThreadCount:      1,
		MessageCount:     1,
		PayloadSHA256:    strings.Repeat("a", 64),
		PayloadJSON:      `{"source_revision_id":"src-rev-phase13"}`,
		LastAttemptAt:    &now,
		LastSyncedAt:     &now,
		CreatedAt:        now,
		UpdatedAt:        now,
	}); err != nil {
		t.Fatalf("CreateSourceCommentSyncState: %v", err)
	}
	searchDoc, err := lineage.CreateSourceSearchDocument(ctx, scope, stores.SourceSearchDocumentRecord{
		ID:                "src-search-doc-1",
		SourceDocumentID:  document.ID,
		SourceRevisionID:  revision.ID,
		ResultKind:        stores.SourceSearchResultKindSourceRevision,
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    document.CanonicalTitle,
		RelationshipState: stores.SourceRelationshipStatusConfirmed,
		CommentSyncStatus: stores.SourceCommentSyncStatusSynced,
		CommentCount:      1,
		HasComments:       true,
		SearchText:        "Phase 13 Source First comment body",
		MetadataJSON:      `{"revision_hints":["v-phase13"]}`,
		IndexedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceSearchDocument: %v", err)
	}

	threads, err := lineage.ListSourceCommentThreads(ctx, scope, stores.SourceCommentThreadQuery{SourceDocumentID: document.ID})
	if err != nil {
		t.Fatalf("ListSourceCommentThreads: %v", err)
	}
	if len(threads) != 1 || threads[0].ID != thread.ID {
		t.Fatalf("expected thread %q, got %+v", thread.ID, threads)
	}
	states, err := lineage.ListSourceCommentSyncStates(ctx, scope, stores.SourceCommentSyncStateQuery{SourceRevisionID: revision.ID})
	if err != nil {
		t.Fatalf("ListSourceCommentSyncStates: %v", err)
	}
	if len(states) != 1 || states[0].SyncStatus != stores.SourceCommentSyncStatusSynced {
		t.Fatalf("expected synced state, got %+v", states)
	}
	searchDocs, err := lineage.ListSourceSearchDocuments(ctx, scope, stores.SourceSearchDocumentQuery{
		SourceRevisionID: revision.ID,
		ResultKind:       stores.SourceSearchResultKindSourceRevision,
		HasComments:      boolPtr(true),
	})
	if err != nil {
		t.Fatalf("ListSourceSearchDocuments: %v", err)
	}
	if len(searchDocs) != 1 || searchDocs[0].ID != searchDoc.ID {
		t.Fatalf("expected search document %q, got %+v", searchDoc.ID, searchDocs)
	}

	if err := lineage.DeleteSourceSearchDocuments(ctx, scope, stores.SourceSearchDocumentQuery{SourceDocumentID: document.ID}); err != nil {
		t.Fatalf("DeleteSourceSearchDocuments: %v", err)
	}
	deletedSearchDocs, err := lineage.ListSourceSearchDocuments(ctx, scope, stores.SourceSearchDocumentQuery{SourceDocumentID: document.ID})
	if err != nil {
		t.Fatalf("ListSourceSearchDocuments after delete: %v", err)
	}
	if len(deletedSearchDocs) != 0 {
		t.Fatalf("expected deleted search documents, got %+v", deletedSearchDocs)
	}
}
