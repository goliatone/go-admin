package services

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/phpdave11/gofpdf"
	gofpdi "github.com/phpdave11/gofpdf/contrib/gofpdi"
)

func FuzzPDFServiceAnalyze(f *testing.F) {
	for _, fixture := range pdfCorpusFixtureNames() {
		raw, err := os.ReadFile(filepath.Join("testdata", "pdf_corpus", fixture))
		if err == nil && len(raw) > 0 {
			f.Add(raw)
		}
	}
	f.Add([]byte("%PDF-1.7\n%%EOF\n"))
	f.Add([]byte("not-a-pdf"))

	svc := NewPDFService()
	f.Fuzz(func(t *testing.T, raw []byte) {
		if len(raw) > 2*1024*1024 {
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
		defer cancel()
		_, err := svc.Analyze(ctx, stores.Scope{}, raw)
		if err == nil {
			return
		}
		var pdfErr *PDFError
		if !errors.As(err, &pdfErr) {
			t.Fatalf("expected *PDFError from Analyze, got %T (%v)", err, err)
		}
	})
}

func FuzzSafeImportPageWithBoxes(f *testing.F) {
	for _, fixture := range pdfCorpusFixtureNames() {
		raw, err := os.ReadFile(filepath.Join("testdata", "pdf_corpus", fixture))
		if err == nil && len(raw) > 0 {
			f.Add(raw, uint8(1))
		}
	}
	f.Add([]byte("%PDF-1.7\n%%EOF\n"), uint8(1))
	f.Add([]byte("not-a-pdf"), uint8(2))

	f.Fuzz(func(t *testing.T, payload []byte, pageSeed uint8) {
		if len(payload) > 2*1024*1024 {
			return
		}
		if len(payload) == 0 {
			payload = []byte("%PDF-1.7\n%%EOF\n")
		}
		page := int(pageSeed%8) + 1
		pdfDoc := gofpdf.New("P", "pt", "Letter", "")
		importer := gofpdi.NewImporter()

		defer func() {
			if recovered := recover(); recovered != nil {
				t.Fatalf("safeImportPageWithBoxes must not panic, recovered=%v", recovered)
			}
		}()
		_, _, _ = safeImportPageWithBoxes(importer, pdfDoc, payload, page, "/MediaBox", "/CropBox")
	})
}

func pdfCorpusFixtureNames() []string {
	return []string{
		"deterministic_1_page.pdf",
		"deterministic_2_page.pdf",
		"encrypted_marker.pdf",
		"linearized_marker.pdf",
		"object_stream_marker.pdf",
		"google_import_endstream_corrupt.pdf",
	}
}
