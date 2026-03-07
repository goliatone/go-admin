package services

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestPDFAnalysisCorpusFixtures(t *testing.T) {
	svc := NewPDFService()
	cases := []struct {
		fixture       string
		expectedPages int
		rejectReasons map[PDFReasonCode]bool
	}{
		{fixture: "deterministic_1_page.pdf", expectedPages: 1},
		{fixture: "deterministic_2_page.pdf", expectedPages: 2},
		{fixture: "linearized_marker.pdf", rejectReasons: map[PDFReasonCode]bool{PDFReasonParseFailed: true, PDFReasonParseMissingPages: true}},
		{fixture: "object_stream_marker.pdf", rejectReasons: map[PDFReasonCode]bool{PDFReasonParseFailed: true, PDFReasonParseMissingPages: true}},
		{fixture: "encrypted_marker.pdf", rejectReasons: map[PDFReasonCode]bool{PDFReasonPolicyEncryptedDisallowed: true}},
		{fixture: "google_import_endstream_corrupt.pdf", rejectReasons: map[PDFReasonCode]bool{PDFReasonParseFailed: true, PDFReasonParseMissingPages: true}},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.fixture, func(t *testing.T) {
			raw := loadPDFCorpusFixture(t, tc.fixture)
			analysis, err := svc.Analyze(context.Background(), stores.Scope{}, raw)
			if len(tc.rejectReasons) > 0 {
				if err == nil {
					t.Fatalf("expected rejection for fixture %s", tc.fixture)
				}
				reason := pdfErrorReason(t, err)
				if !tc.rejectReasons[reason] {
					t.Fatalf("unexpected reject reason for fixture %s: %q", tc.fixture, reason)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected analysis failure for fixture %s: %v", tc.fixture, err)
			}
			if analysis.PageCount != tc.expectedPages {
				t.Fatalf("expected page count %d for fixture %s, got %d", tc.expectedPages, tc.fixture, analysis.PageCount)
			}
			if analysis.CompatibilityTier != PDFCompatibilityTierFull {
				t.Fatalf("expected full compatibility tier for fixture %s, got %q", tc.fixture, analysis.CompatibilityTier)
			}
		})
	}
}

func loadPDFCorpusFixture(t *testing.T, name string) []byte {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("testdata", "pdf_corpus", name))
	if err != nil {
		t.Fatalf("read corpus fixture %s: %v", name, err)
	}
	if len(raw) == 0 {
		t.Fatalf("expected non-empty corpus fixture %s", name)
	}
	return raw
}
