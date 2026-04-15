package services

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

type delayedActiveHandleStore struct {
	stores.LineageStore
	suppressFirstLookup bool
}

func (s *delayedActiveHandleStore) GetActiveSourceHandle(ctx context.Context, scope stores.Scope, providerKind, externalFileID, accountID string) (stores.SourceHandleRecord, error) {
	if s.suppressFirstLookup {
		s.suppressFirstLookup = false
		return stores.SourceHandleRecord{}, goerrors.New("source handle not found", goerrors.CategoryNotFound).
			WithCode(404).
			WithTextCode("NOT_FOUND")
	}
	return s.LineageStore.GetActiveSourceHandle(ctx, scope, providerKind, externalFileID, accountID)
}

func TestDefaultSourceIdentityServiceCreatesAndReusesExactRevision(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	service := NewDefaultSourceIdentityService(store, WithSourceIdentityClock(func() time.Time { return now }))

	first, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind: stores.SourceProviderKindGoogleDrive,
		ActorID:      "ops-user",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-1",
			ExternalFileID:    "google-file-1",
			WebURL:            "https://docs.google.com/document/d/google-file-1/edit",
			ModifiedTime:      &now,
			SourceVersionHint: "v1",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Customer NDA",
			OwnerEmail:        "owner@example.com",
			ParentID:          "root",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity first: %v", err)
	}
	if first.SourceDocument.ID == "" || first.SourceHandle.ID == "" || first.SourceRevision.ID == "" {
		t.Fatalf("expected lineage ids on first resolution, got %+v", first)
	}
	if first.ResolutionKind != sourceResolutionNewSource {
		t.Fatalf("expected new_source resolution, got %q", first.ResolutionKind)
	}

	second, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind: stores.SourceProviderKindGoogleDrive,
		ActorID:      "ops-user",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-1",
			ExternalFileID:    "google-file-1",
			WebURL:            "https://docs.google.com/document/d/google-file-1/edit",
			ModifiedTime:      &now,
			SourceVersionHint: "v1",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Customer NDA",
			OwnerEmail:        "owner@example.com",
			ParentID:          "root",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity second: %v", err)
	}
	if second.SourceDocument.ID != first.SourceDocument.ID {
		t.Fatalf("expected same source document, got %q vs %q", second.SourceDocument.ID, first.SourceDocument.ID)
	}
	if second.SourceRevision.ID != first.SourceRevision.ID {
		t.Fatalf("expected same source revision, got %q vs %q", second.SourceRevision.ID, first.SourceRevision.ID)
	}
	if second.ResolutionKind != sourceResolutionExactActiveHandle {
		t.Fatalf("expected exact_active_handle on replay, got %q", second.ResolutionKind)
	}
}

func TestDefaultSourceIdentityServiceSeparatesDriveIdentityFromFolderContext(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	service := NewDefaultSourceIdentityService(store, WithSourceIdentityClock(func() time.Time { return now }))

	resolved, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind: stores.SourceProviderKindGoogleDrive,
		ActorID:      "ops-user",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-1",
			ExternalFileID:    "google-file-1",
			DriveID:           "shared-drive-1",
			WebURL:            "https://docs.google.com/document/d/google-file-1/edit",
			ModifiedTime:      &now,
			SourceVersionHint: "v1",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Customer NDA",
			OwnerEmail:        "owner@example.com",
			ParentID:          "folder-legal",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity: %v", err)
	}
	if resolved.SourceHandle.DriveID != "shared-drive-1" {
		t.Fatalf("expected handle drive_id to preserve provider drive identity, got %+v", resolved.SourceHandle)
	}
	if !strings.Contains(resolved.SourceRevision.MetadataJSON, `"drive_id":"shared-drive-1"`) {
		t.Fatalf("expected revision metadata to persist drive_id, got %s", resolved.SourceRevision.MetadataJSON)
	}
	if !strings.Contains(resolved.SourceRevision.MetadataJSON, `"parent_id":"folder-legal"`) {
		t.Fatalf("expected revision metadata to persist parent_id separately, got %s", resolved.SourceRevision.MetadataJSON)
	}
}

func TestDefaultSourceIdentityServiceCreatesCandidateRelationshipForSimilarGoogleSource(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	service := NewDefaultSourceIdentityService(store, WithSourceIdentityClock(func() time.Time { return now }))

	_, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind: stores.SourceProviderKindGoogleDrive,
		ActorID:      "ops-user",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-1",
			ExternalFileID:    "google-file-1",
			WebURL:            "https://docs.google.com/document/d/google-file-1/edit",
			ModifiedTime:      &now,
			SourceVersionHint: "v1",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Master Services Agreement",
			OwnerEmail:        "owner@example.com",
			ParentID:          "root",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity seed: %v", err)
	}

	candidate, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind: stores.SourceProviderKindGoogleDrive,
		ActorID:      "ops-user",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-2",
			ExternalFileID:    "google-file-2",
			WebURL:            "https://docs.google.com/document/d/google-file-2/edit",
			ModifiedTime:      &now,
			SourceVersionHint: "v1",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Master Services Agreement",
			OwnerEmail:        "owner@example.com",
			ParentID:          "root",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity candidate: %v", err)
	}
	if candidate.CandidateRelationship == nil {
		t.Fatalf("expected candidate relationship, got %+v", candidate)
	}
	if candidate.ResolutionKind != sourceResolutionCandidateCreated {
		t.Fatalf("expected candidate_created, got %q", candidate.ResolutionKind)
	}
	if candidate.CandidateRelationship.Status != stores.SourceRelationshipStatusPendingReview {
		t.Fatalf("expected pending_review, got %q", candidate.CandidateRelationship.Status)
	}
}

func TestDefaultSourceIdentityServiceDoesNotCreateCandidateForTitleOnlyMatch(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	service := NewDefaultSourceIdentityService(store, WithSourceIdentityClock(func() time.Time { return now }))

	_, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind: stores.SourceProviderKindGoogleDrive,
		ActorID:      "ops-user",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-1",
			ExternalFileID:    "google-file-1",
			WebURL:            "https://docs.google.com/document/d/google-file-1/edit",
			ModifiedTime:      &now,
			SourceVersionHint: "v1",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Master Services Agreement",
			OwnerEmail:        "owner-1@example.com",
			ParentID:          "root-a",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity seed: %v", err)
	}

	candidate, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind: stores.SourceProviderKindGoogleDrive,
		ActorID:      "ops-user",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-2",
			ExternalFileID:    "google-file-2",
			WebURL:            "https://docs.google.com/document/d/google-file-2/edit",
			ModifiedTime:      &now,
			SourceVersionHint: "v9",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Master Services Agreement",
			OwnerEmail:        "owner-2@example.com",
			ParentID:          "root-b",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity candidate: %v", err)
	}
	if candidate.CandidateRelationship != nil {
		t.Fatalf("expected no candidate relationship for title-only match, got %+v", candidate.CandidateRelationship)
	}
	if candidate.ResolutionKind != sourceResolutionNewSource {
		t.Fatalf("expected new_source without corroborating candidate evidence, got %q", candidate.ResolutionKind)
	}
}

func TestDefaultSourceIdentityServiceReusesRevisionWhenContentUnchangedAcrossMetadataChanges(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	service := NewDefaultSourceIdentityService(store, WithSourceIdentityClock(func() time.Time { return now }))

	first, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind:          stores.SourceProviderKindGoogleDrive,
		ActorID:               "ops-user",
		RevisionContentSHA256: "sha256-same-content",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-1",
			ExternalFileID:    "google-file-1",
			WebURL:            "https://docs.google.com/document/d/google-file-1/edit",
			ModifiedTime:      &now,
			SourceVersionHint: "v1",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Customer NDA",
			OwnerEmail:        "owner@example.com",
			ParentID:          "root",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity first: %v", err)
	}

	changedMetadataAt := now.Add(10 * time.Minute)
	second, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind:          stores.SourceProviderKindGoogleDrive,
		ActorID:               "ops-user",
		RevisionContentSHA256: "sha256-same-content",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-1",
			ExternalFileID:    "google-file-1",
			WebURL:            "https://docs.google.com/document/d/google-file-1/edit",
			ModifiedTime:      &changedMetadataAt,
			SourceVersionHint: "v2",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Customer NDA",
			OwnerEmail:        "owner@example.com",
			ParentID:          "root",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity second: %v", err)
	}
	if second.SourceRevision.ID != first.SourceRevision.ID {
		t.Fatalf("expected unchanged content to reuse source revision, got %q vs %q", second.SourceRevision.ID, first.SourceRevision.ID)
	}
}

func TestDefaultSourceIdentityServiceReusesRevisionAcrossConfirmedContinuityHandles(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	service := NewDefaultSourceIdentityService(store, WithSourceIdentityClock(func() time.Time { return now }))

	document, err := store.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Customer NDA",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandHigh,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument: %v", err)
	}
	primaryHandle, err := store.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		SourceDocumentID: document.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-file-1",
		AccountID:        "account-1",
		WebURL:           "https://docs.google.com/document/d/google-file-1/edit",
		HandleStatus:     stores.SourceHandleStatusActive,
		ValidFrom:        &now,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle primary: %v", err)
	}
	metadataJSON, err := buildRevisionMetadataJSON(SourceMetadataBaseline{
		AccountID:         "account-1",
		ExternalFileID:    "google-file-1",
		WebURL:            "https://docs.google.com/document/d/google-file-1/edit",
		ModifiedTime:      &now,
		SourceVersionHint: "v1",
		SourceMimeType:    GoogleDriveMimeTypeDoc,
		TitleHint:         "Customer NDA",
		OwnerEmail:        "owner@example.com",
		ParentID:          "root",
	}, SourceIdentityResolutionInput{
		ActorID:               "ops-user",
		RevisionContentSHA256: "sha256-same-content",
	}, buildCanonicalRevisionSignature(SourceMetadataBaseline{
		SourceMimeType: GoogleDriveMimeTypeDoc,
	}, "sha256-same-content"))
	if err != nil {
		t.Fatalf("buildRevisionMetadataJSON: %v", err)
	}
	revision, err := store.CreateSourceRevision(ctx, scope, stores.SourceRevisionRecord{
		SourceDocumentID:     document.ID,
		SourceHandleID:       primaryHandle.ID,
		ProviderRevisionHint: "v1",
		ModifiedTime:         cloneSourceTimePtr(&now),
		ExportedAt:           cloneSourceTimePtr(&now),
		ExportedByUserID:     "ops-user",
		SourceMimeType:       GoogleDriveMimeTypeDoc,
		MetadataJSON:         metadataJSON,
		CreatedAt:            now,
		UpdatedAt:            now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision: %v", err)
	}
	secondHandleAt := now.Add(30 * time.Minute)
	_, err = store.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		SourceDocumentID: document.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-file-2",
		AccountID:        "account-2",
		WebURL:           "https://docs.google.com/document/d/google-file-2/edit",
		HandleStatus:     stores.SourceHandleStatusActive,
		ValidFrom:        &secondHandleAt,
		CreatedAt:        secondHandleAt,
		UpdatedAt:        secondHandleAt,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle continuity: %v", err)
	}

	modifiedAt := now.Add(1 * time.Hour)
	resolved, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind:          stores.SourceProviderKindGoogleDrive,
		ActorID:               "ops-user",
		RevisionContentSHA256: "sha256-same-content",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-2",
			ExternalFileID:    "google-file-2",
			WebURL:            "https://docs.google.com/document/d/google-file-2/edit",
			ModifiedTime:      &modifiedAt,
			SourceVersionHint: "v2",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Customer NDA",
			OwnerEmail:        "owner@example.com",
			ParentID:          "new-root",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity continuity handle: %v", err)
	}
	if resolved.SourceDocument.ID != document.ID {
		t.Fatalf("expected continuity handle to resolve canonical source document %q, got %+v", document.ID, resolved.SourceDocument)
	}
	if resolved.SourceRevision.ID != revision.ID {
		t.Fatalf("expected continuity handle replay to reuse canonical revision %q, got %+v", revision.ID, resolved.SourceRevision)
	}
}

func TestDefaultSourceIdentityServiceConflictFallbackKeepsCanonicalHandleOwnership(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	baseStore := stores.NewInMemoryStore()
	store := &delayedActiveHandleStore{
		LineageStore:        baseStore,
		suppressFirstLookup: true,
	}
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	service := NewDefaultSourceIdentityService(store, WithSourceIdentityClock(func() time.Time { return now }))

	canonical, err := baseStore.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Canonical Existing Source",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument canonical: %v", err)
	}
	canonicalHandle, err := baseStore.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		SourceDocumentID: canonical.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-file-1",
		AccountID:        "account-1",
		WebURL:           "https://docs.google.com/document/d/google-file-1/edit",
		HandleStatus:     stores.SourceHandleStatusActive,
		ValidFrom:        &now,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle canonical: %v", err)
	}

	highConfidenceTarget, err := baseStore.CreateSourceDocument(ctx, scope, stores.SourceDocumentRecord{
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Imported NDA",
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandHigh,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument highConfidenceTarget: %v", err)
	}
	_, err = baseStore.CreateSourceHandle(ctx, scope, stores.SourceHandleRecord{
		SourceDocumentID: highConfidenceTarget.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "other-google-file",
		AccountID:        "account-2",
		WebURL:           "https://docs.google.com/document/d/imported-nda/edit",
		HandleStatus:     stores.SourceHandleStatusActive,
		ValidFrom:        &now,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle highConfidenceTarget: %v", err)
	}

	resolved, err := service.ResolveSourceIdentity(ctx, scope, SourceIdentityResolutionInput{
		ProviderKind:          stores.SourceProviderKindGoogleDrive,
		ActorID:               "ops-user",
		RevisionContentSHA256: "sha256-imported-nda",
		Metadata: SourceMetadataBaseline{
			AccountID:         "account-1",
			ExternalFileID:    "google-file-1",
			WebURL:            "https://docs.google.com/document/d/imported-nda/edit",
			ModifiedTime:      &now,
			SourceVersionHint: "v1",
			SourceMimeType:    GoogleDriveMimeTypeDoc,
			TitleHint:         "Imported NDA",
			OwnerEmail:        "owner@example.com",
			ParentID:          "root",
		},
	})
	if err != nil {
		t.Fatalf("ResolveSourceIdentity: %v", err)
	}
	if resolved.SourceDocument.ID != canonical.ID {
		t.Fatalf("expected canonical source document %q, got %q", canonical.ID, resolved.SourceDocument.ID)
	}
	if resolved.SourceHandle.ID != canonicalHandle.ID {
		t.Fatalf("expected canonical source handle %q, got %q", canonicalHandle.ID, resolved.SourceHandle.ID)
	}
	if resolved.SourceRevision.SourceDocumentID != canonical.ID || resolved.SourceRevision.SourceHandleID != canonicalHandle.ID {
		t.Fatalf("expected revision to stay aligned to canonical handle/document, got %+v", resolved.SourceRevision)
	}
}
