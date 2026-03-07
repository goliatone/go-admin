package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"strings"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
	"github.com/phpdave11/gofpdf"
	gofpdi "github.com/phpdave11/gofpdf/contrib/gofpdi"
)

func samplePDF(pageCount int) []byte {
	return GenerateDeterministicPDF(pageCount)
}

func TestExtractPDFMetadata(t *testing.T) {
	raw := samplePDF(2)
	meta, err := ExtractPDFMetadata(raw)
	if err != nil {
		t.Fatalf("ExtractPDFMetadata: %v", err)
	}
	if meta.PageCount != 2 {
		t.Fatalf("expected 2 pages, got %d", meta.PageCount)
	}
	if meta.SizeBytes != int64(len(raw)) {
		t.Fatalf("expected size %d, got %d", len(raw), meta.SizeBytes)
	}
	sum := sha256.Sum256(raw)
	if meta.SHA256 != hex.EncodeToString(sum[:]) {
		t.Fatalf("unexpected sha256 %q", meta.SHA256)
	}
}

func TestExtractPDFMetadataRejectsInvalidPayload(t *testing.T) {
	cases := [][]byte{
		[]byte(""),
		[]byte("not-a-pdf"),
		[]byte("%PDF-1.7\nmissing eof"),
		[]byte("%PDF-1.7\n%%EOF"),
	}
	for i, raw := range cases {
		if _, err := ExtractPDFMetadata(raw); err == nil {
			t.Fatalf("case %d: expected error", i)
		}
	}
}

func TestDocumentServiceUploadPersistsMetadata(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	clock := time.Date(2026, 1, 5, 9, 0, 0, 0, time.UTC)
	store := stores.NewInMemoryStore()
	svc := NewDocumentService(store, WithDocumentClock(func() time.Time { return clock }))

	raw := samplePDF(1)
	record, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "NDA",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		PDF:       raw,
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	if record.ID == "" {
		t.Fatal("expected generated id")
	}
	if record.PageCount != 1 {
		t.Fatalf("expected page count 1, got %d", record.PageCount)
	}
	if record.PDFCompatibilityTier != string(PDFCompatibilityTierFull) {
		t.Fatalf("expected persisted compatibility tier full, got %q", record.PDFCompatibilityTier)
	}
	if record.PDFCompatibilityReason != "" {
		t.Fatalf("expected empty compatibility reason, got %q", record.PDFCompatibilityReason)
	}
	if record.PDFNormalizationStatus != string(PDFNormalizationStatusNotRequested) {
		t.Fatalf("expected normalization status %q, got %q", PDFNormalizationStatusNotRequested, record.PDFNormalizationStatus)
	}
	if record.PDFAnalyzedAt == nil || record.PDFAnalyzedAt.IsZero() {
		t.Fatalf("expected persisted pdf analyzed timestamp")
	}
	if record.PDFPolicyVersion != PDFPolicyVersion {
		t.Fatalf("expected policy version %q, got %q", PDFPolicyVersion, record.PDFPolicyVersion)
	}
	if record.CreatedAt != clock {
		t.Fatalf("expected created_at %v, got %v", clock, record.CreatedAt)
	}
	stored, err := store.Get(ctx, scope, record.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if stored.SourceSHA256 != record.SourceSHA256 {
		t.Fatalf("expected persisted sha256 %q, got %q", record.SourceSHA256, stored.SourceSHA256)
	}
	if stored.PDFCompatibilityTier != record.PDFCompatibilityTier || stored.PDFNormalizationStatus != record.PDFNormalizationStatus {
		t.Fatalf("expected persisted analysis metadata, got %+v", stored)
	}
}

func TestDocumentServiceUploadRequiresObjectKey(t *testing.T) {
	svc := NewDocumentService(stores.NewInMemoryStore())
	_, err := svc.Upload(context.Background(), stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}, DocumentUploadInput{PDF: samplePDF(1)})
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestDocumentServiceUploadPersistsSourcePDFWhenObjectStoreConfigured(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	manager := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	svc := NewDocumentService(store, WithDocumentObjectStore(manager))

	raw := samplePDF(1)
	objectKey := "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf"
	record, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "NDA",
		ObjectKey: objectKey,
		PDF:       raw,
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	if record.SourceObjectKey != objectKey {
		t.Fatalf("expected source object key %q, got %q", objectKey, record.SourceObjectKey)
	}
	stored, err := manager.GetFile(ctx, objectKey)
	if err != nil {
		t.Fatalf("GetFile: %v", err)
	}
	if !bytes.Equal(stored, raw) {
		t.Fatalf("expected persisted source bytes to match upload payload")
	}
	if strings.TrimSpace(record.NormalizedObjectKey) == "" {
		t.Fatalf("expected normalized object key to be persisted")
	}
	normalized, err := manager.GetFile(ctx, record.NormalizedObjectKey)
	if err != nil {
		t.Fatalf("GetFile normalized: %v", err)
	}
	if len(normalized) == 0 {
		t.Fatalf("expected normalized payload to be persisted")
	}
	if record.PDFNormalizationStatus != string(PDFNormalizationStatusCompleted) {
		t.Fatalf("expected normalization status completed, got %q", record.PDFNormalizationStatus)
	}
}

func TestDocumentServiceUploadMarksNormalizationFailedWhenNormalizeImportFails(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	manager := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	svc := NewDocumentService(store, WithDocumentObjectStore(manager))

	previous := gofpdiImportPageFromStream
	t.Cleanup(func() {
		gofpdiImportPageFromStream = previous
	})
	gofpdiImportPageFromStream = func(_ *gofpdi.Importer, _ *gofpdf.Fpdf, _ *io.ReadSeeker, _ int, _ string) int {
		return -1
	}

	raw := samplePDF(1)
	objectKey := "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf"
	record, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "NDA",
		ObjectKey: objectKey,
		PDF:       raw,
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	if record.PDFNormalizationStatus != string(PDFNormalizationStatusFailed) {
		t.Fatalf("expected normalization status failed, got %q", record.PDFNormalizationStatus)
	}
	if record.PDFCompatibilityTier != string(PDFCompatibilityTierUnsupported) {
		t.Fatalf("expected compatibility tier unsupported when normalization fails and preview fallback is disabled, got %q", record.PDFCompatibilityTier)
	}
	if record.PDFCompatibilityReason != PDFCompatibilityReasonPreviewFallbackDisabled {
		t.Fatalf("expected compatibility reason %q, got %q", PDFCompatibilityReasonPreviewFallbackDisabled, record.PDFCompatibilityReason)
	}
	if strings.TrimSpace(record.NormalizedObjectKey) != "" {
		t.Fatalf("expected normalized object key to remain empty on failure, got %q", record.NormalizedObjectKey)
	}
	stored, err := manager.GetFile(ctx, objectKey)
	if err != nil {
		t.Fatalf("GetFile source: %v", err)
	}
	if !bytes.Equal(stored, raw) {
		t.Fatalf("expected source payload to remain persisted even when normalization fails")
	}
}

func TestDocumentServiceUploadMarksNormalizationFailureLimitedWhenPreviewFallbackEnabled(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	manager := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	policy := DefaultPDFPolicy()
	policy.PreviewFallbackEnabled = true
	svc := NewDocumentService(
		store,
		WithDocumentObjectStore(manager),
		WithDocumentPDFService(NewPDFService(WithPDFPolicyResolver(NewStaticPDFPolicyResolver(policy)))),
	)

	previous := gofpdiImportPageFromStream
	t.Cleanup(func() {
		gofpdiImportPageFromStream = previous
	})
	gofpdiImportPageFromStream = func(_ *gofpdi.Importer, _ *gofpdf.Fpdf, _ *io.ReadSeeker, _ int, _ string) int {
		return -1
	}

	record, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "NDA",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		PDF:       samplePDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	if record.PDFNormalizationStatus != string(PDFNormalizationStatusFailed) {
		t.Fatalf("expected normalization status failed, got %q", record.PDFNormalizationStatus)
	}
	if record.PDFCompatibilityTier != string(PDFCompatibilityTierLimited) {
		t.Fatalf("expected compatibility tier limited when preview fallback is enabled, got %q", record.PDFCompatibilityTier)
	}
	if record.PDFCompatibilityReason != PDFCompatibilityReasonNormalizationFailed {
		t.Fatalf("expected compatibility reason %q, got %q", PDFCompatibilityReasonNormalizationFailed, record.PDFCompatibilityReason)
	}
}

func TestDocumentServiceUploadRejectsPayloadExceedingPolicySize(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	policy := DefaultPDFPolicy()
	policy.MaxSourceBytes = 32
	svc := NewDocumentService(store, WithDocumentPDFService(NewPDFService(
		WithPDFPolicyResolver(NewStaticPDFPolicyResolver(policy)),
	)))

	_, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Too Large",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-large/source.pdf",
		PDF:       samplePDF(1),
	})
	if err == nil {
		t.Fatalf("expected max_source_bytes policy rejection")
	}
	snapshot := observability.Snapshot()
	if snapshot.PDFIngestAnalyzeFailTotal != 1 {
		t.Fatalf("expected pdf_ingest_analyze_fail_total=1, got %+v", snapshot)
	}
	if snapshot.PDFIngestPolicyRejectTotal != 1 {
		t.Fatalf("expected pdf_ingest_policy_reject_total=1, got %+v", snapshot)
	}
	if snapshot.PDFIngestPolicyRejectByReasonTier["reason=policy.max_source_bytes,tier=unsupported"] != 1 {
		t.Fatalf("expected labeled max_source_bytes rejection metric, got %+v", snapshot.PDFIngestPolicyRejectByReasonTier)
	}
}

func TestDocumentServiceUploadRejectsEncryptedPDFByPolicy(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	svc := NewDocumentService(store)

	raw := append(samplePDF(1), []byte("\n/Encrypt << /Filter /Standard >>\n")...)
	_, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Encrypted",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-encrypted/source.pdf",
		PDF:       raw,
	})
	if err == nil {
		t.Fatalf("expected encrypted policy rejection")
	}
}

func TestDocumentServiceUploadRejectsCorruptObjectStream(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	svc := NewDocumentService(store)

	raw := []byte("%PDF-1.7\n1 0 obj\n<< /Length 5 >>\nstream\nabcde\nndstream\nendobj\n%%EOF\n")
	_, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Corrupt",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-corrupt/source.pdf",
		PDF:       raw,
	})
	if err == nil {
		t.Fatalf("expected corrupt object stream rejection")
	}
	snapshot := observability.Snapshot()
	if snapshot.PDFIngestAnalyzeFailTotal != 1 {
		t.Fatalf("expected pdf_ingest_analyze_fail_total=1, got %+v", snapshot)
	}
}

func TestDocumentServiceUploadReflectsDynamicSettingsPolicyOverrides(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	settings := newPDFPolicySettingsServiceForTest()

	cfg := *appcfg.Defaults()
	cfg.Signer.PDF.MaxPages = 5
	resolver := NewRuntimePDFPolicyResolver(settings, WithRuntimePDFPolicyConfigProvider(func() appcfg.Config { return cfg }))
	pdfSvc := NewPDFService(WithPDFPolicyResolver(resolver))
	svc := NewDocumentService(store, WithDocumentPDFService(pdfSvc))

	if _, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Two pages",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-policy-1/source.pdf",
		PDF:       samplePDF(2),
	}); err != nil {
		t.Fatalf("expected upload to pass before settings override: %v", err)
	}

	if err := settings.Apply(ctx, coreadmin.SettingsBundle{
		Scope: coreadmin.SettingsScopeSystem,
		Values: map[string]any{
			SettingPDFMaxPages: 1,
		},
	}); err != nil {
		t.Fatalf("apply settings override: %v", err)
	}

	if _, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Two pages blocked",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-policy-2/source.pdf",
		PDF:       samplePDF(2),
	}); err == nil {
		t.Fatalf("expected upload rejection after settings max_pages override")
	}
}

func TestDocumentServiceUploadAnalyzeOnlyAcceptsPolicyViolations(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	policy := DefaultPDFPolicy()
	policy.MaxPages = 1
	policy.PipelineMode = PDFPipelineModeAnalyzeOnly
	svc := NewDocumentService(store, WithDocumentPDFService(NewPDFService(
		WithPDFPolicyResolver(NewStaticPDFPolicyResolver(policy)),
	)))

	record, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "Analyze Only Upload",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-analyze-only/source.pdf",
		PDF:       samplePDF(2),
	})
	if err != nil {
		t.Fatalf("expected analyze_only upload to bypass policy rejection, got %v", err)
	}
	if record.PageCount != 2 {
		t.Fatalf("expected fallback analysis to preserve page count 2, got %d", record.PageCount)
	}
	if record.PDFCompatibilityTier != string(PDFCompatibilityTierUnsupported) {
		t.Fatalf("expected unsupported compatibility tier for policy-violating analyze_only upload, got %q", record.PDFCompatibilityTier)
	}
	if record.PDFCompatibilityReason != string(PDFReasonPolicyMaxPages) {
		t.Fatalf("expected policy max_pages compatibility reason, got %q", record.PDFCompatibilityReason)
	}
}
