package services

import (
	"bytes"
	"fmt"
	"io"
	"strings"

	"github.com/phpdave11/gofpdf"
	gofpdi "github.com/phpdave11/gofpdf/contrib/gofpdi"
)

type PDFImportErrorCode string

const (
	PDFImportErrorCodeInvalidInput    PDFImportErrorCode = "invalid_input"
	PDFImportErrorCodeImportRejected  PDFImportErrorCode = "import_rejected"
	PDFImportErrorCodeInvalidTemplate PDFImportErrorCode = "invalid_template"
	PDFImportErrorCodePanic           PDFImportErrorCode = "panic"
)

type PDFImportError struct {
	Op    string             `json:"op"`
	Page  int                `json:"page"`
	Box   string             `json:"box"`
	Code  PDFImportErrorCode `json:"code"`
	Cause error              `json:"cause"`
}

func (e *PDFImportError) Error() string {
	if e == nil {
		return "pdf import error"
	}
	parts := []string{"pdf import", strings.TrimSpace(e.Op), string(e.Code)}
	if e.Page > 0 {
		parts = append(parts, fmt.Sprintf("page=%d", e.Page))
	}
	if box := strings.TrimSpace(e.Box); box != "" {
		parts = append(parts, fmt.Sprintf("box=%s", box))
	}
	msg := strings.Join(parts, " ")
	if e.Cause != nil {
		return msg + ": " + e.Cause.Error()
	}
	return msg
}

func (e *PDFImportError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

type recoveredPDFPanic struct {
	value any
}

func (e recoveredPDFPanic) Error() string {
	return fmt.Sprintf("panic recovered: %v", e.value)
}

var gofpdiImportPageFromStream = func(importer *gofpdi.Importer, pdf *gofpdf.Fpdf, rs *io.ReadSeeker, page int, box string) int {
	return importer.ImportPageFromStream(pdf, rs, page, box)
}

var gofpdiUseImportedTemplate = func(importer *gofpdi.Importer, pdf *gofpdf.Fpdf, tplID int, x, y, width, height float64) {
	importer.UseImportedTemplate(pdf, tplID, x, y, width, height)
}

func safeImportPageFromStream(importer *gofpdi.Importer, pdf *gofpdf.Fpdf, rs *io.ReadSeeker, page int, box string) (tplID int, err error) {
	if importer == nil || pdf == nil || rs == nil {
		return 0, &PDFImportError{
			Op:   "import_page",
			Page: page,
			Box:  box,
			Code: PDFImportErrorCodeInvalidInput,
		}
	}
	defer func() {
		if recovered := recover(); recovered != nil {
			err = &PDFImportError{
				Op:    "import_page",
				Page:  page,
				Box:   box,
				Code:  PDFImportErrorCodePanic,
				Cause: recoveredPDFPanic{value: recovered},
			}
			tplID = 0
		}
	}()
	tplID = gofpdiImportPageFromStream(importer, pdf, rs, page, box)
	if tplID < 0 {
		return 0, &PDFImportError{
			Op:   "import_page",
			Page: page,
			Box:  box,
			Code: PDFImportErrorCodeImportRejected,
		}
	}
	return tplID, nil
}

func safeImportPageWithBoxes(importer *gofpdi.Importer, pdf *gofpdf.Fpdf, sourcePDF []byte, page int, boxes ...string) (int, string, error) {
	if importer == nil || pdf == nil {
		return 0, "", &PDFImportError{
			Op:   "import_page",
			Page: page,
			Code: PDFImportErrorCodeInvalidInput,
		}
	}
	if len(sourcePDF) == 0 {
		return 0, "", &PDFImportError{
			Op:   "import_page",
			Page: page,
			Code: PDFImportErrorCodeInvalidInput,
		}
	}
	lastErr := error(nil)
	for _, box := range boxes {
		rs := io.ReadSeeker(bytes.NewReader(sourcePDF))
		tplID, err := safeImportPageFromStream(importer, pdf, &rs, page, box)
		if err == nil {
			return tplID, box, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		lastErr = &PDFImportError{
			Op:   "import_page",
			Page: page,
			Code: PDFImportErrorCodeInvalidInput,
		}
	}
	return 0, "", lastErr
}

func safeUseImportedTemplate(importer *gofpdi.Importer, pdf *gofpdf.Fpdf, tplID int, x, y, width, height float64) (err error) {
	if importer == nil || pdf == nil {
		return &PDFImportError{
			Op:   "use_template",
			Code: PDFImportErrorCodeInvalidInput,
		}
	}
	if tplID < 0 {
		return &PDFImportError{
			Op:   "use_template",
			Code: PDFImportErrorCodeInvalidTemplate,
		}
	}
	defer func() {
		if recovered := recover(); recovered != nil {
			err = &PDFImportError{
				Op:    "use_template",
				Code:  PDFImportErrorCodePanic,
				Cause: recoveredPDFPanic{value: recovered},
			}
		}
	}()
	gofpdiUseImportedTemplate(importer, pdf, tplID, x, y, width, height)
	return nil
}
