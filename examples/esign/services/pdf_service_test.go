package services

import (
	"bytes"
	"context"
	"errors"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/ledongthuc/pdf"
)

func setPDFReaderFactoryForTest(factory pdfReaderFactory) func() {
	pdfNewReaderMu.Lock()
	previous := pdfNewReader
	if factory == nil {
		factory = func(reader *bytes.Reader, size int64) (*pdf.Reader, error) {
			return pdf.NewReader(reader, size)
		}
	}
	pdfNewReader = factory
	pdfNewReaderMu.Unlock()
	return func() {
		pdfNewReaderMu.Lock()
		pdfNewReader = previous
		pdfNewReaderMu.Unlock()
	}
}

func TestPDFServiceAnalyzeReturnsCanonicalMetadata(t *testing.T) {
	raw := GenerateDeterministicPDF(2)
	svc := NewPDFService()

	analysis, err := svc.Analyze(context.Background(), stores.Scope{}, raw)
	if err != nil {
		t.Fatalf("Analyze: %v", err)
	}
	if analysis.PageCount != 2 {
		t.Fatalf("expected 2 pages, got %d", analysis.PageCount)
	}
	if analysis.SizeBytes != int64(len(raw)) {
		t.Fatalf("expected size %d, got %d", len(raw), analysis.SizeBytes)
	}
	if analysis.SHA256 == "" {
		t.Fatalf("expected sha256 digest")
	}
	if analysis.CompatibilityTier != PDFCompatibilityTierFull {
		t.Fatalf("expected full compatibility tier, got %q", analysis.CompatibilityTier)
	}
}

func TestPDFServiceAnalyzeEnforcesPolicyLimits(t *testing.T) {
	raw := GenerateDeterministicPDF(3)
	resolver := NewStaticPDFPolicyResolver(PDFPolicy{
		MaxSourceBytes: 1,
		MaxPages:       1,
	})
	svc := NewPDFService(WithPDFPolicyResolver(resolver))

	if _, err := svc.Analyze(context.Background(), stores.Scope{}, raw); err == nil {
		t.Fatalf("expected policy violation error")
	} else if reason := pdfErrorReason(t, err); reason != PDFReasonPolicyMaxSourceBytes {
		t.Fatalf("expected max_source_bytes rejection, got %q", reason)
	}
}

func TestPDFServicePageGeometryReturnsPageDimensions(t *testing.T) {
	raw := GenerateDeterministicPDF(2)
	svc := NewPDFService()

	geometry, err := svc.PageGeometry(context.Background(), stores.Scope{}, raw, 0)
	if err != nil {
		t.Fatalf("PageGeometry: %v", err)
	}
	if len(geometry) != 2 {
		t.Fatalf("expected 2 page geometry rows, got %d", len(geometry))
	}
	if geometry[0].Page != 1 || geometry[1].Page != 2 {
		t.Fatalf("expected page sequence 1..2, got %+v", geometry)
	}
	if geometry[0].Width <= 0 || geometry[0].Height <= 0 {
		t.Fatalf("expected positive page dimensions, got %+v", geometry[0])
	}
}

func TestPDFServiceAnalyzeRejectsPageCountExceedingPolicy(t *testing.T) {
	raw := GenerateDeterministicPDF(2)
	svc := NewPDFService(WithPDFPolicyResolver(NewStaticPDFPolicyResolver(PDFPolicy{
		MaxSourceBytes: 20 * 1024 * 1024,
		MaxPages:       1,
		MaxObjects:     100000,
	})))

	_, err := svc.Analyze(context.Background(), stores.Scope{}, raw)
	if err == nil {
		t.Fatalf("expected max_pages rejection")
	}
	if reason := pdfErrorReason(t, err); reason != PDFReasonPolicyMaxPages {
		t.Fatalf("expected max_pages rejection, got %q", reason)
	}
}

func TestPDFServiceAnalyzeRejectsEncryptedPayloadWhenDisallowed(t *testing.T) {
	raw := append(GenerateDeterministicPDF(1), []byte("\n/Encrypt << /Filter /Standard >>\n")...)
	svc := NewPDFService(WithPDFPolicyResolver(NewStaticPDFPolicyResolver(PDFPolicy{
		AllowEncrypted: false,
	})))

	_, err := svc.Analyze(context.Background(), stores.Scope{}, raw)
	if err == nil {
		t.Fatalf("expected encrypted policy rejection")
	}
	if reason := pdfErrorReason(t, err); reason != PDFReasonPolicyEncryptedDisallowed {
		t.Fatalf("expected encrypted rejection reason, got %q", reason)
	}
}

func TestPDFServiceAnalyzeRejectsCorruptObjectStream(t *testing.T) {
	raw := []byte("%PDF-1.7\n1 0 obj\n<< /Length 5 >>\nstream\nabcde\nndstream\nendobj\n%%EOF\n")
	svc := NewPDFService()

	_, err := svc.Analyze(context.Background(), stores.Scope{}, raw)
	if err == nil {
		t.Fatalf("expected parse rejection for corrupt object stream")
	}
	reason := pdfErrorReason(t, err)
	if reason != PDFReasonParseFailed && reason != PDFReasonParseMissingPages {
		t.Fatalf("expected parse-related rejection reason, got %q", reason)
	}
}

func TestPDFServiceAnalyzeRejectsObjectCountBudget(t *testing.T) {
	raw := GenerateDeterministicPDF(1)
	policy := DefaultPDFPolicy()
	policy.MaxObjects = 1
	svc := NewPDFService(WithPDFPolicyResolver(NewStaticPDFPolicyResolver(PDFPolicy{
		MaxSourceBytes:       policy.MaxSourceBytes,
		MaxPages:             policy.MaxPages,
		MaxObjects:           policy.MaxObjects,
		MaxDecompressedBytes: policy.MaxDecompressedBytes,
		ParseTimeout:         policy.ParseTimeout,
		NormalizationTimeout: policy.NormalizationTimeout,
		CompatibilityMode:    policy.CompatibilityMode,
	})))

	_, err := svc.Analyze(context.Background(), stores.Scope{}, raw)
	if err == nil {
		t.Fatalf("expected object-count policy rejection")
	}
	if reason := pdfErrorReason(t, err); reason != PDFReasonPolicyMaxObjects {
		t.Fatalf("expected max_objects rejection reason, got %q", reason)
	}
}

func TestPDFServiceAnalyzeRejectsDecompressedBudget(t *testing.T) {
	raw := append(GenerateDeterministicPDF(1), []byte("\n/Length 2048\n")...)
	policy := DefaultPDFPolicy()
	policy.MaxDecompressedBytes = 1024
	svc := NewPDFService(WithPDFPolicyResolver(NewStaticPDFPolicyResolver(PDFPolicy{
		MaxSourceBytes:       policy.MaxSourceBytes,
		MaxPages:             policy.MaxPages,
		MaxObjects:           policy.MaxObjects,
		MaxDecompressedBytes: policy.MaxDecompressedBytes,
		CompatibilityMode:    policy.CompatibilityMode,
		ParseTimeout:         policy.ParseTimeout,
		NormalizationTimeout: policy.NormalizationTimeout,
	})))

	_, err := svc.Analyze(context.Background(), stores.Scope{}, raw)
	if err == nil {
		t.Fatalf("expected decompressed-bytes policy rejection")
	}
	if reason := pdfErrorReason(t, err); reason != PDFReasonPolicyMaxDecompressedBytes {
		t.Fatalf("expected max_decompressed_bytes rejection reason, got %q", reason)
	}
}

func pdfErrorReason(t *testing.T, err error) PDFReasonCode {
	t.Helper()
	pdfErr, ok := err.(*PDFError)
	if !ok || pdfErr == nil {
		t.Fatalf("expected *PDFError, got %T (%v)", err, err)
	}
	return pdfErr.Reason
}

func TestPDFServiceAnalyzeHonorsContextCancellation(t *testing.T) {
	raw := GenerateDeterministicPDF(1)
	svc := NewPDFService(WithPDFPolicyResolver(NewStaticPDFPolicyResolver(PDFPolicy{
		MaxSourceBytes:       10 * 1024 * 1024,
		MaxPages:             200,
		MaxObjects:           100000,
		MaxDecompressedBytes: 64 * 1024 * 1024,
		ParseTimeout:         2500 * time.Millisecond,
		NormalizationTimeout: 5000 * time.Millisecond,
		CompatibilityMode:    PDFCompatibilityModeBalanced,
	})))

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := svc.Analyze(ctx, stores.Scope{}, raw)
	if err == nil {
		t.Fatalf("expected context cancellation rejection")
	}
	if reason := pdfErrorReason(t, err); reason != PDFReasonContextCanceled {
		t.Fatalf("expected context.canceled reason, got %q", reason)
	}
}

func TestPDFServiceAnalyzeHonorsParseTimeoutBudget(t *testing.T) {
	restore := setPDFReaderFactoryForTest(func(_ *bytes.Reader, _ int64) (*pdf.Reader, error) {
		time.Sleep(50 * time.Millisecond)
		return nil, errors.New("slow parser")
	})
	t.Cleanup(restore)

	policy := DefaultPDFPolicy()
	policy.ParseTimeout = 5 * time.Millisecond
	svc := NewPDFService(WithPDFPolicyResolver(NewStaticPDFPolicyResolver(policy)))
	_, err := svc.Analyze(context.Background(), stores.Scope{}, GenerateDeterministicPDF(1))
	if err == nil {
		t.Fatalf("expected parse timeout error")
	}
	if reason := pdfErrorReason(t, err); reason != PDFReasonTimeoutParse {
		t.Fatalf("expected timeout.parse reason, got %q", reason)
	}
}

func TestPDFServiceAnalyzeRecoversParserPanic(t *testing.T) {
	restore := setPDFReaderFactoryForTest(func(_ *bytes.Reader, _ int64) (*pdf.Reader, error) {
		panic("boom")
	})
	t.Cleanup(restore)

	svc := NewPDFService()
	_, err := svc.Analyze(context.Background(), stores.Scope{}, GenerateDeterministicPDF(1))
	if err == nil {
		t.Fatalf("expected parse failure after parser panic")
	}
	if reason := pdfErrorReason(t, err); reason != PDFReasonParseFailed {
		t.Fatalf("expected parse.failed reason after panic recovery, got %q", reason)
	}
}

func TestPDFPolicyDiagnosticsIncludesResolvedDefaults(t *testing.T) {
	diag := PDFPolicyDiagnostics(PDFPolicy{})
	if diag["policy_version"] != PDFPolicyVersion {
		t.Fatalf("expected policy version %q, got %+v", PDFPolicyVersion, diag["policy_version"])
	}
	if diag["diagnostics_payload_version"] != "v1" {
		t.Fatalf("expected diagnostics payload version v1, got %+v", diag["diagnostics_payload_version"])
	}
	if diag["pipeline_mode"] == "" {
		t.Fatalf("expected pipeline_mode in diagnostics payload, got %+v", diag)
	}
}
