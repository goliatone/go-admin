package services

import (
	"bytes"
	"io"
	"testing"

	"github.com/phpdave11/gofpdf"
	gofpdi "github.com/phpdave11/gofpdf/contrib/gofpdi"
)

func TestSafeImportPageFromStreamRecoversPanic(t *testing.T) {
	previous := gofpdiImportPageFromStream
	t.Cleanup(func() {
		gofpdiImportPageFromStream = previous
	})
	gofpdiImportPageFromStream = func(_ *gofpdi.Importer, _ *gofpdf.Fpdf, _ *io.ReadSeeker, _ int, _ string) int {
		panic("import panic")
	}

	pdf := gofpdf.New("P", "pt", "Letter", "")
	importer := gofpdi.NewImporter()
	rs := io.ReadSeeker(bytes.NewReader([]byte("%PDF-1.4\n")))
	_, err := safeImportPageFromStream(importer, pdf, &rs, 1, "/MediaBox")
	if err == nil {
		t.Fatal("expected panic to be recovered as error")
	}
	importErr, ok := err.(*PDFImportError)
	if !ok {
		t.Fatalf("expected PDFImportError, got %T", err)
	}
	if importErr.Code != PDFImportErrorCodePanic {
		t.Fatalf("expected panic error code, got %s", importErr.Code)
	}
}

func TestSafeUseImportedTemplateRecoversPanic(t *testing.T) {
	previous := gofpdiUseImportedTemplate
	t.Cleanup(func() {
		gofpdiUseImportedTemplate = previous
	})
	gofpdiUseImportedTemplate = func(_ *gofpdi.Importer, _ *gofpdf.Fpdf, _ int, _ float64, _ float64, _ float64, _ float64) {
		panic("template panic")
	}

	pdf := gofpdf.New("P", "pt", "Letter", "")
	importer := gofpdi.NewImporter()
	err := safeUseImportedTemplate(importer, pdf, 1, 0, 0, 10, 10)
	if err == nil {
		t.Fatal("expected panic to be recovered as error")
	}
	importErr, ok := err.(*PDFImportError)
	if !ok {
		t.Fatalf("expected PDFImportError, got %T", err)
	}
	if importErr.Code != PDFImportErrorCodePanic {
		t.Fatalf("expected panic error code, got %s", importErr.Code)
	}
}

func TestSafeImportPageWithBoxesTriesFallbackBox(t *testing.T) {
	previous := gofpdiImportPageFromStream
	t.Cleanup(func() {
		gofpdiImportPageFromStream = previous
	})
	gofpdiImportPageFromStream = func(_ *gofpdi.Importer, _ *gofpdf.Fpdf, _ *io.ReadSeeker, _ int, box string) int {
		if box == "/CropBox" {
			return -1
		}
		return 7
	}

	pdf := gofpdf.New("P", "pt", "Letter", "")
	importer := gofpdi.NewImporter()
	tplID, box, err := safeImportPageWithBoxes(importer, pdf, []byte("%PDF-1.4\n"), 1, "/CropBox", "/MediaBox")
	if err != nil {
		t.Fatalf("expected fallback import to succeed, got %v", err)
	}
	if tplID != 7 {
		t.Fatalf("expected tplID 7, got %d", tplID)
	}
	if box != "/MediaBox" {
		t.Fatalf("expected fallback box /MediaBox, got %q", box)
	}
}
