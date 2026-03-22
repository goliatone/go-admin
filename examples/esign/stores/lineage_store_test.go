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
	otherDocument, err := store.CreateSourceDocument(ctx, scope, SourceDocumentRecord{
		ProviderKind: SourceProviderKindGoogleDrive,
		CreatedAt:    now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument other: %v", err)
	}
	otherHandle, err := store.CreateSourceHandle(ctx, scope, SourceHandleRecord{
		SourceDocumentID: otherDocument.ID,
		ProviderKind:     SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-defaults-2",
		AccountID:        "account-2",
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle other: %v", err)
	}
	otherRevision, err := store.CreateSourceRevision(ctx, scope, SourceRevisionRecord{
		SourceDocumentID: otherDocument.ID,
		SourceHandleID:   otherHandle.ID,
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision other: %v", err)
	}
	otherArtifact, err := store.CreateSourceArtifact(ctx, scope, SourceArtifactRecord{
		SourceRevisionID: otherRevision.ID,
		ArtifactKind:     SourceArtifactKindSignablePDF,
		ObjectKey:        "fixtures/defaults-other.pdf",
		SHA256:           strings.Repeat("e", 64),
		CreatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceArtifact other: %v", err)
	}
	if _, err := store.CreateSourceFingerprint(ctx, scope, SourceFingerprintRecord{
		SourceRevisionID: revision.ID,
		ArtifactID:       otherArtifact.ID,
		ExtractVersion:   SourceExtractVersionPDFTextV1,
		CreatedAt:        now,
	}); err == nil {
		t.Fatalf("expected mismatched artifact/source revision rejection")
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

func TestInMemoryLineageStorePersistsDirectionalRelationshipEndpointsAndUsageAggregates(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-direction", OrgID: "org-direction"}
	store := NewInMemoryStore()
	now := time.Date(2026, 3, 21, 10, 0, 0, 0, time.UTC)

	predecessor, err := store.CreateSourceDocument(ctx, scope, SourceDocumentRecord{
		ID:                "src-doc-predecessor",
		ProviderKind:      SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Predecessor",
		Status:            SourceDocumentStatusActive,
		LineageConfidence: LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument predecessor: %v", err)
	}
	successor, err := store.CreateSourceDocument(ctx, scope, SourceDocumentRecord{
		ID:                "src-doc-successor",
		ProviderKind:      SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Successor",
		Status:            SourceDocumentStatusActive,
		LineageConfidence: LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument successor: %v", err)
	}
	predecessorHandle, err := store.CreateSourceHandle(ctx, scope, SourceHandleRecord{
		ID:               "src-handle-predecessor",
		SourceDocumentID: predecessor.ID,
		ProviderKind:     SourceProviderKindGoogleDrive,
		ExternalFileID:   "file-predecessor",
		AccountID:        "acct-1",
		HandleStatus:     SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle predecessor: %v", err)
	}
	successorHandle, err := store.CreateSourceHandle(ctx, scope, SourceHandleRecord{
		ID:               "src-handle-successor",
		SourceDocumentID: successor.ID,
		ProviderKind:     SourceProviderKindGoogleDrive,
		ExternalFileID:   "file-successor",
		AccountID:        "acct-2",
		HandleStatus:     SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle successor: %v", err)
	}
	predecessorRevision, err := store.CreateSourceRevision(ctx, scope, SourceRevisionRecord{
		ID:               "src-rev-predecessor",
		SourceDocumentID: predecessor.ID,
		SourceHandleID:   predecessorHandle.ID,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision predecessor: %v", err)
	}
	successorRevision, err := store.CreateSourceRevision(ctx, scope, SourceRevisionRecord{
		ID:               "src-rev-successor",
		SourceDocumentID: successor.ID,
		SourceHandleID:   successorHandle.ID,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision successor: %v", err)
	}

	relationship, err := store.CreateSourceRelationship(ctx, scope, SourceRelationshipRecord{
		ID:                          "src-rel-directional",
		LeftSourceDocumentID:        predecessor.ID,
		RightSourceDocumentID:       successor.ID,
		PredecessorSourceDocumentID: predecessor.ID,
		SuccessorSourceDocumentID:   successor.ID,
		RelationshipType:            SourceRelationshipTypeCopiedFrom,
		ConfidenceBand:              LineageConfidenceBandHigh,
		ConfidenceScore:             0.9,
		Status:                      SourceRelationshipStatusConfirmed,
		CreatedAt:                   now,
		UpdatedAt:                   now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRelationship directional: %v", err)
	}
	if relationship.PredecessorSourceDocumentID != predecessor.ID || relationship.SuccessorSourceDocumentID != successor.ID {
		t.Fatalf("expected persisted directional endpoints, got %+v", relationship)
	}

	if _, err := store.Create(ctx, scope, DocumentRecord{
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
	if _, err := store.CreateDraft(ctx, scope, AgreementRecord{
		ID:               "agr-pinned-successor",
		DocumentID:       "doc-pinned-successor",
		Title:            "Pinned Successor Agreement",
		Status:           AgreementStatusDraft,
		Version:          1,
		SourceRevisionID: successorRevision.ID,
		CreatedByUserID:  "fixture-user",
		UpdatedByUserID:  "fixture-user",
		CreatedAt:        now,
		UpdatedAt:        now,
	}); err != nil {
		t.Fatalf("CreateDraft pinned agreement: %v", err)
	}

	usage, err := store.ListSourceRevisionUsage(ctx, scope, SourceRevisionUsageQuery{
		SourceDocumentIDs: []string{successor.ID},
		SourceRevisionIDs: []string{successorRevision.ID, predecessorRevision.ID},
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

func TestPhase13InMemoryLineageStoreCRUDForSourceCommentsAndSearchDocuments(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-phase13", OrgID: "org-phase13"}
	store := NewInMemoryStore()
	now := time.Date(2026, 3, 21, 12, 0, 0, 0, time.UTC)

	document, err := store.CreateSourceDocument(ctx, scope, SourceDocumentRecord{
		ID:                "src-doc-phase13",
		ProviderKind:      SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Phase 13 Source",
		Status:            SourceDocumentStatusActive,
		LineageConfidence: LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument: %v", err)
	}
	handle, err := store.CreateSourceHandle(ctx, scope, SourceHandleRecord{
		ID:               "src-handle-phase13",
		SourceDocumentID: document.ID,
		ProviderKind:     SourceProviderKindGoogleDrive,
		ExternalFileID:   "phase13-file",
		AccountID:        "acct-phase13",
		HandleStatus:     SourceHandleStatusActive,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	revision, err := store.CreateSourceRevision(ctx, scope, SourceRevisionRecord{
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

	thread, err := store.CreateSourceCommentThread(ctx, scope, SourceCommentThreadRecord{
		ID:                "src-comment-thread-1",
		SourceDocumentID:  document.ID,
		SourceRevisionID:  revision.ID,
		ProviderKind:      SourceProviderKindGoogleDrive,
		ProviderCommentID: "provider-comment-1",
		ThreadID:          "provider-thread-1",
		Status:            SourceCommentThreadStatusOpen,
		AnchorKind:        SourceCommentAnchorKindPage,
		AnchorJSON:        `{"kind":"page","label":"Page 1"}`,
		AuthorJSON:        `{"display_name":"Reviewer","email":"reviewer@example.com","type":"user"}`,
		BodyPreview:       "First comment body",
		MessageCount:      2,
		ReplyCount:        1,
		SyncStatus:        SourceCommentSyncStatusSynced,
		LastSyncedAt:      &now,
		LastActivityAt:    &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceCommentThread: %v", err)
	}
	message, err := store.CreateSourceCommentMessage(ctx, scope, SourceCommentMessageRecord{
		ID:                    "src-comment-message-1",
		SourceCommentThreadID: thread.ID,
		SourceRevisionID:      revision.ID,
		ProviderMessageID:     "provider-message-1",
		MessageKind:           SourceCommentMessageKindComment,
		BodyText:              "First comment body",
		BodyPreview:           "First comment body",
		AuthorJSON:            `{"display_name":"Reviewer","email":"reviewer@example.com","type":"user"}`,
		CreatedAt:             now,
		UpdatedAt:             now,
	})
	if err != nil {
		t.Fatalf("CreateSourceCommentMessage: %v", err)
	}
	state, err := store.CreateSourceCommentSyncState(ctx, scope, SourceCommentSyncStateRecord{
		ID:               "src-comment-sync-1",
		SourceDocumentID: document.ID,
		SourceRevisionID: revision.ID,
		ProviderKind:     SourceProviderKindGoogleDrive,
		SyncStatus:       SourceCommentSyncStatusSynced,
		ThreadCount:      1,
		MessageCount:     1,
		PayloadSHA256:    strings.Repeat("c", 64),
		PayloadJSON:      `{"source_revision_id":"src-rev-phase13"}`,
		LastAttemptAt:    &now,
		LastSyncedAt:     &now,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceCommentSyncState: %v", err)
	}
	searchDoc, err := store.CreateSourceSearchDocument(ctx, scope, SourceSearchDocumentRecord{
		ID:                "src-search-doc-1",
		SourceDocumentID:  document.ID,
		SourceRevisionID:  revision.ID,
		ResultKind:        SourceSearchResultKindSourceRevision,
		ProviderKind:      SourceProviderKindGoogleDrive,
		CanonicalTitle:    document.CanonicalTitle,
		RelationshipState: SourceRelationshipStatusConfirmed,
		CommentSyncStatus: SourceCommentSyncStatusSynced,
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

	threads, err := store.ListSourceCommentThreads(ctx, scope, SourceCommentThreadQuery{SourceRevisionID: revision.ID})
	if err != nil {
		t.Fatalf("ListSourceCommentThreads: %v", err)
	}
	if len(threads) != 1 || threads[0].ID != thread.ID {
		t.Fatalf("expected thread %q, got %+v", thread.ID, threads)
	}
	messages, err := store.ListSourceCommentMessages(ctx, scope, SourceCommentMessageQuery{SourceCommentThreadID: thread.ID})
	if err != nil {
		t.Fatalf("ListSourceCommentMessages: %v", err)
	}
	if len(messages) != 1 || messages[0].ID != message.ID {
		t.Fatalf("expected message %q, got %+v", message.ID, messages)
	}
	states, err := store.ListSourceCommentSyncStates(ctx, scope, SourceCommentSyncStateQuery{SourceRevisionID: revision.ID})
	if err != nil {
		t.Fatalf("ListSourceCommentSyncStates: %v", err)
	}
	if len(states) != 1 || states[0].ID != state.ID {
		t.Fatalf("expected sync state %q, got %+v", state.ID, states)
	}
	searchDocs, err := store.ListSourceSearchDocuments(ctx, scope, SourceSearchDocumentQuery{SourceRevisionID: revision.ID, HasComments: boolPtr(true)})
	if err != nil {
		t.Fatalf("ListSourceSearchDocuments: %v", err)
	}
	if len(searchDocs) != 1 || searchDocs[0].ID != searchDoc.ID {
		t.Fatalf("expected search document %q, got %+v", searchDoc.ID, searchDocs)
	}

	thread.MessageCount = 3
	thread.UpdatedAt = now.Add(time.Minute)
	if _, err := store.SaveSourceCommentThread(ctx, scope, thread); err != nil {
		t.Fatalf("SaveSourceCommentThread: %v", err)
	}
	searchDoc.CommentCount = 3
	searchDoc.UpdatedAt = now.Add(time.Minute)
	if _, err := store.SaveSourceSearchDocument(ctx, scope, searchDoc); err != nil {
		t.Fatalf("SaveSourceSearchDocument: %v", err)
	}
	if err := store.DeleteSourceSearchDocuments(ctx, scope, SourceSearchDocumentQuery{SourceDocumentID: document.ID}); err != nil {
		t.Fatalf("DeleteSourceSearchDocuments: %v", err)
	}
	deletedSearchDocs, err := store.ListSourceSearchDocuments(ctx, scope, SourceSearchDocumentQuery{SourceDocumentID: document.ID})
	if err != nil {
		t.Fatalf("ListSourceSearchDocuments after delete: %v", err)
	}
	if len(deletedSearchDocs) != 0 {
		t.Fatalf("expected deleted search documents, got %+v", deletedSearchDocs)
	}

	if _, err := store.CreateSourceCommentMessage(ctx, scope, SourceCommentMessageRecord{
		ID:                    "src-comment-message-invalid",
		SourceCommentThreadID: thread.ID,
		SourceRevisionID:      "src-rev-other",
		ProviderMessageID:     "provider-message-invalid",
		MessageKind:           SourceCommentMessageKindReply,
		BodyText:              "invalid",
		CreatedAt:             now,
		UpdatedAt:             now,
	}); err == nil {
		t.Fatalf("expected mismatched source revision rejection for source comment message")
	}
}
