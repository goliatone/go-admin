package services

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/phpdave11/gofpdf"
)

type fingerprintObjectStoreStub struct {
	files map[string][]byte
}

func (s *fingerprintObjectStoreStub) GetFile(_ context.Context, path string) ([]byte, error) {
	if s == nil {
		return nil, errors.New("object store not configured")
	}
	payload, ok := s.files[strings.TrimSpace(path)]
	if !ok {
		return nil, errors.New("object not found")
	}
	return append([]byte{}, payload...), nil
}

func TestDefaultSourceFingerprintServiceBuildsDeterministicEvidence(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-fingerprint", OrgID: "org-fingerprint"}
	store := stores.NewInMemoryStore()
	seeded := seedFingerprintLineageFixture(t, store, scope, "artifact-a", makeTextPDF(t,
		"Master Services Agreement\n\nThis AGREEMENT covers onboarding, pricing, and support terms.",
		"Appendix A\n\nPricing terms and support obligations remain unchanged.",
	))
	service := NewDefaultSourceFingerprintService(store, seeded.objects)

	first, err := service.BuildFingerprint(ctx, scope, SourceFingerprintBuildInput{
		SourceRevisionID: seeded.revisionID,
		ArtifactID:       seeded.artifactID,
		Metadata: SourceMetadataBaseline{
			ExternalFileID:      "google-file-fingerprint-1",
			TitleHint:           "Master Services Agreement",
			SourceMimeType:      GoogleDriveMimeTypeDoc,
			SourceIngestionMode: GoogleIngestionModeExportPDF,
		},
	})
	if err != nil {
		t.Fatalf("BuildFingerprint first: %v", err)
	}
	second, err := service.BuildFingerprint(ctx, scope, SourceFingerprintBuildInput{
		SourceRevisionID: seeded.revisionID,
		ArtifactID:       seeded.artifactID,
		Metadata: SourceMetadataBaseline{
			ExternalFileID:      "google-file-fingerprint-1",
			TitleHint:           "Master Services Agreement",
			SourceMimeType:      GoogleDriveMimeTypeDoc,
			SourceIngestionMode: GoogleIngestionModeExportPDF,
		},
	})
	if err != nil {
		t.Fatalf("BuildFingerprint second: %v", err)
	}
	if first.Fingerprint.ID == "" || first.Fingerprint.ID != second.Fingerprint.ID {
		t.Fatalf("expected deterministic fingerprint record id, first=%+v second=%+v", first.Fingerprint, second.Fingerprint)
	}
	if first.Status.Status != LineageFingerprintStatusReady || second.Status.Status != LineageFingerprintStatusReady {
		t.Fatalf("expected ready fingerprint status, first=%+v second=%+v", first.Status, second.Status)
	}
	if first.Fingerprint.NormalizedTextSHA256 == "" || first.Fingerprint.NormalizedTextSHA256 != second.Fingerprint.NormalizedTextSHA256 {
		t.Fatalf("expected stable normalized fingerprint hash, first=%+v second=%+v", first.Fingerprint, second.Fingerprint)
	}
	if first.Fingerprint.SimHash64 == "" || first.Fingerprint.SimHash64 != second.Fingerprint.SimHash64 {
		t.Fatalf("expected stable simhash, first=%+v second=%+v", first.Fingerprint, second.Fingerprint)
	}
	if first.Fingerprint.TokenCount <= 0 {
		t.Fatalf("expected extracted token count, got %+v", first.Fingerprint)
	}
	if !strings.Contains(first.Fingerprint.ExtractionMetadataJSON, `"title_hint":"Master Services Agreement"`) {
		t.Fatalf("expected extraction metadata to include title hint, got %s", first.Fingerprint.ExtractionMetadataJSON)
	}
	records, err := store.ListSourceFingerprints(ctx, scope, stores.SourceFingerprintQuery{
		SourceRevisionID: seeded.revisionID,
		ArtifactID:       seeded.artifactID,
		ExtractVersion:   stores.SourceExtractVersionPDFTextV1,
	})
	if err != nil {
		t.Fatalf("ListSourceFingerprints: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("expected deduped fingerprint record, got %+v", records)
	}
}

func TestDefaultSourceFingerprintServicePersistsFailedExtractionState(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-fingerprint-failed", OrgID: "org-fingerprint-failed"}
	store := stores.NewInMemoryStore()
	seeded := seedFingerprintLineageFixture(t, store, scope, "artifact-empty", GenerateDeterministicPDF(1))
	service := NewDefaultSourceFingerprintService(store, seeded.objects)

	result, err := service.BuildFingerprint(ctx, scope, SourceFingerprintBuildInput{
		SourceRevisionID: seeded.revisionID,
		ArtifactID:       seeded.artifactID,
		Metadata:         SourceMetadataBaseline{TitleHint: "Blank Export"},
	})
	if err != nil {
		t.Fatalf("BuildFingerprint failed-state: %v", err)
	}
	if result.Status.Status != LineageFingerprintStatusFailed {
		t.Fatalf("expected failed fingerprint status, got %+v", result.Status)
	}
	if result.Fingerprint.Status != stores.SourceFingerprintStatusFailed {
		t.Fatalf("expected stored fingerprint failure state, got %+v", result.Fingerprint)
	}
	if result.Fingerprint.ErrorCode == "" || result.Fingerprint.ErrorMessage == "" {
		t.Fatalf("expected stored fingerprint failure details, got %+v", result.Fingerprint)
	}
	if result.Status.EvidenceAvailable {
		t.Fatalf("expected failed fingerprint to expose no evidence, got %+v", result.Status)
	}
	if result.Status.ErrorCode == "" || result.Status.ErrorMessage == "" {
		t.Fatalf("expected failed fingerprint summary to expose failure details, got %+v", result.Status)
	}
}

func TestDefaultSourceFingerprintServiceRejectsMismatchedArtifactRevisionPairs(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-fingerprint-mismatch", OrgID: "org-fingerprint-mismatch"}
	store := stores.NewInMemoryStore()
	left := seedFingerprintLineageFixture(t, store, scope, "artifact-left", makeTextPDF(t, "Left revision"))
	right := seedFingerprintLineageFixture(t, store, scope, "artifact-right", makeTextPDF(t, "Right revision"))
	service := NewDefaultSourceFingerprintService(store, &fingerprintObjectStoreStub{
		files: map[string][]byte{
			"tenant/" + scope.TenantID + "/lineage/artifact-left.pdf":  append([]byte{}, left.objects.files["tenant/"+scope.TenantID+"/lineage/artifact-left.pdf"]...),
			"tenant/" + scope.TenantID + "/lineage/artifact-right.pdf": append([]byte{}, right.objects.files["tenant/"+scope.TenantID+"/lineage/artifact-right.pdf"]...),
		},
	})

	_, err := service.BuildFingerprint(ctx, scope, SourceFingerprintBuildInput{
		SourceRevisionID: left.revisionID,
		ArtifactID:       right.artifactID,
		Metadata:         SourceMetadataBaseline{TitleHint: "Mismatch"},
	})
	if err == nil {
		t.Fatal("expected mismatched revision/artifact rejection")
	}
}

type fingerprintFixtureSeed struct {
	revisionID string
	artifactID string
	objects    *fingerprintObjectStoreStub
}

func seedFingerprintLineageFixture(t *testing.T, store stores.LineageStore, scope stores.Scope, suffix string, pdf []byte) fingerprintFixtureSeed {
	t.Helper()
	now := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	sourceDocument, err := store.CreateSourceDocument(context.Background(), scope, stores.SourceDocumentRecord{
		ID:                "src-doc-" + suffix,
		ProviderKind:      stores.SourceProviderKindGoogleDrive,
		CanonicalTitle:    "Fingerprint Fixture " + suffix,
		Status:            stores.SourceDocumentStatusActive,
		LineageConfidence: stores.LineageConfidenceBandExact,
		CreatedAt:         now,
		UpdatedAt:         now,
	})
	if err != nil {
		t.Fatalf("CreateSourceDocument: %v", err)
	}
	handle, err := store.CreateSourceHandle(context.Background(), scope, stores.SourceHandleRecord{
		ID:               "src-handle-" + suffix,
		SourceDocumentID: sourceDocument.ID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		ExternalFileID:   "google-file-" + suffix,
		AccountID:        "account-" + suffix,
		WebURL:           "https://docs.google.com/document/d/google-file-" + suffix + "/edit",
		HandleStatus:     stores.SourceHandleStatusActive,
		ValidFrom:        &now,
		CreatedAt:        now,
		UpdatedAt:        now,
	})
	if err != nil {
		t.Fatalf("CreateSourceHandle: %v", err)
	}
	revision, err := store.CreateSourceRevision(context.Background(), scope, stores.SourceRevisionRecord{
		ID:                   "src-rev-" + suffix,
		SourceDocumentID:     sourceDocument.ID,
		SourceHandleID:       handle.ID,
		ProviderRevisionHint: "rev-" + suffix,
		ExportedAt:           &now,
		ExportedByUserID:     "ops-user",
		SourceMimeType:       GoogleDriveMimeTypeDoc,
		MetadataJSON:         `{"title_hint":"Fingerprint Fixture"}`,
		CreatedAt:            now,
		UpdatedAt:            now,
	})
	if err != nil {
		t.Fatalf("CreateSourceRevision: %v", err)
	}
	artifactObjectKey := "tenant/" + scope.TenantID + "/lineage/" + suffix + ".pdf"
	artifact, err := store.CreateSourceArtifact(context.Background(), scope, stores.SourceArtifactRecord{
		ID:                  "src-art-" + suffix,
		SourceRevisionID:    revision.ID,
		ArtifactKind:        stores.SourceArtifactKindSignablePDF,
		ObjectKey:           artifactObjectKey,
		SHA256:              hashFingerprintBytes(pdf),
		PageCount:           2,
		SizeBytes:           int64(len(pdf)),
		CompatibilityTier:   string(PDFCompatibilityTierFull),
		NormalizationStatus: string(PDFNormalizationStatusCompleted),
		CreatedAt:           now,
		UpdatedAt:           now,
	})
	if err != nil {
		t.Fatalf("CreateSourceArtifact: %v", err)
	}
	return fingerprintFixtureSeed{
		revisionID: revision.ID,
		artifactID: artifact.ID,
		objects: &fingerprintObjectStoreStub{
			files: map[string][]byte{artifactObjectKey: append([]byte{}, pdf...)},
		},
	}
}

func makeTextPDF(t *testing.T, pages ...string) []byte {
	t.Helper()
	doc := gofpdf.New("P", "pt", "Letter", "")
	doc.SetMargins(48, 48, 48)
	doc.SetFont("Helvetica", "", 12)
	for _, page := range pages {
		doc.AddPage()
		for paragraph := range strings.SplitSeq(page, "\n\n") {
			doc.MultiCell(0, 16, paragraph, "", "L", false)
			doc.Ln(8)
		}
	}
	var out bytes.Buffer
	if err := doc.Output(&out); err != nil {
		t.Fatalf("makeTextPDF output: %v", err)
	}
	return out.Bytes()
}
