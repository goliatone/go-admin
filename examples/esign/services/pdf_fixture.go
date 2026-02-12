package services

import (
	"bytes"
	"fmt"
	"strings"
)

// GenerateDeterministicPDF returns a compact, parser-valid PDF payload used by deterministic paths/tests.
func GenerateDeterministicPDF(pageCount int) []byte {
	if pageCount <= 0 {
		pageCount = 1
	}

	totalObjects := 2 + pageCount
	offsets := make([]int, totalObjects+1)
	var out bytes.Buffer
	out.WriteString("%PDF-1.7\n")

	// 1: Catalog.
	offsets[1] = out.Len()
	out.WriteString("1 0 obj\n")
	out.WriteString("<< /Type /Catalog /Pages 2 0 R >>\n")
	out.WriteString("endobj\n")

	// 2: Pages tree.
	offsets[2] = out.Len()
	out.WriteString("2 0 obj\n")
	out.WriteString("<< /Type /Pages /Count ")
	out.WriteString(fmt.Sprintf("%d", pageCount))
	out.WriteString(" /Kids [")
	for i := 0; i < pageCount; i++ {
		if i > 0 {
			out.WriteByte(' ')
		}
		out.WriteString(fmt.Sprintf("%d 0 R", i+3))
	}
	out.WriteString("] >>\n")
	out.WriteString("endobj\n")

	// 3..N: Page objects.
	for i := 0; i < pageCount; i++ {
		objNum := i + 3
		offsets[objNum] = out.Len()
		out.WriteString(fmt.Sprintf("%d 0 obj\n", objNum))
		out.WriteString("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\n")
		out.WriteString("endobj\n")
	}

	xrefOffset := out.Len()
	out.WriteString("xref\n")
	out.WriteString(fmt.Sprintf("0 %d\n", totalObjects+1))
	out.WriteString("0000000000 65535 f \n")
	for objNum := 1; objNum <= totalObjects; objNum++ {
		out.WriteString(fmt.Sprintf("%010d 00000 n \n", offsets[objNum]))
	}
	out.WriteString("trailer\n")
	out.WriteString("<< /Size ")
	out.WriteString(fmt.Sprintf("%d", totalObjects+1))
	out.WriteString(" /Root 1 0 R >>\n")
	out.WriteString("startxref\n")
	out.WriteString(fmt.Sprintf("%d\n", xrefOffset))
	out.WriteString("%%EOF\n")

	return []byte(strings.TrimSpace(out.String()) + "\n")
}
