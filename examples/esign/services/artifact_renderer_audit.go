package services

import (
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/phpdave11/gofpdf"
)

type auditTrailRenderOptions struct {
	StandaloneCertificate bool    `json:"standalone_certificate"`
	ReverseChronological  bool    `json:"reverse_chronological"`
	PageWidth             float64 `json:"page_width"`
	PageHeight            float64 `json:"page_height"`
}

type auditTrailMetadataRow struct {
	Label     string `json:"label"`
	Value     string `json:"value"`
	Monospace bool   `json:"monospace"`
	Status    bool   `json:"status"`
}

type auditTrailColor struct {
	R int `json:"r"`
	G int `json:"g"`
	B int `json:"b"`
}

type auditTrailStyle struct {
	PageWidth      float64         `json:"page_width"`
	PageHeight     float64         `json:"page_height"`
	MarginLeft     float64         `json:"margin_left"`
	MarginRight    float64         `json:"margin_right"`
	MarginTop      float64         `json:"margin_top"`
	MarginBottom   float64         `json:"margin_bottom"`
	FooterReserve  float64         `json:"footer_reserve"`
	TimelineOffset float64         `json:"timeline_offset"`
	Text           auditTrailColor `json:"text"`
	Muted          auditTrailColor `json:"muted"`
	Border         auditTrailColor `json:"border"`
	Surface        auditTrailColor `json:"surface"`
	Brand          auditTrailColor `json:"brand"`
}

func defaultAuditTrailStyle() auditTrailStyle {
	return auditTrailStyle{
		PageWidth:      PDFDefaultPageWidthPt,
		PageHeight:     PDFDefaultPageHeightPt,
		MarginLeft:     54,
		MarginRight:    54,
		MarginTop:      56,
		MarginBottom:   48,
		FooterReserve:  30,
		TimelineOffset: 28,
		Text:           auditTrailColor{R: 17, G: 24, B: 39},
		Muted:          auditTrailColor{R: 107, G: 114, B: 128},
		Border:         auditTrailColor{R: 209, G: 213, B: 219},
		Surface:        auditTrailColor{R: 249, G: 250, B: 251},
		Brand:          auditTrailColor{R: 37, G: 99, B: 235},
	}
}

func (r ReadableArtifactRenderer) renderAuditTrailPages(pdf *gofpdf.Fpdf, doc AuditTrailDocument, opts auditTrailRenderOptions) error {
	if pdf == nil {
		return fmt.Errorf("render audit trail: pdf writer required")
	}
	style := defaultAuditTrailStyle()
	if opts.PageWidth > 0 {
		style.PageWidth = opts.PageWidth
	}
	if opts.PageHeight > 0 {
		style.PageHeight = opts.PageHeight
	}
	entries := append([]AuditTrailEntry(nil), doc.Entries...)
	if len(entries) == 0 {
		fallbackAt := doc.GeneratedAt.UTC()
		if fallbackAt.IsZero() {
			fallbackAt = r.now().UTC()
		}
		entries = []AuditTrailEntry{{
			EventType:   AuditTrailEventIncomplete,
			Timestamp:   fallbackAt,
			Description: "This document has not been fully executed by all signers.",
			Severity:    "warning",
		}}
	}
	if opts.ReverseChronological {
		reverseAuditTrailEntries(entries)
	}

	startPage := func(firstPage bool) float64 {
		orientation := "P"
		if style.PageWidth > style.PageHeight {
			orientation = "L"
		}
		pdf.AddPageFormat(orientation, gofpdf.SizeType{Wd: style.PageWidth, Ht: style.PageHeight})
		pdf.SetMargins(style.MarginLeft, style.MarginTop, style.MarginRight)
		pdf.SetAutoPageBreak(false, 0)

		currentY := style.MarginTop
		currentY = drawAuditTrailHeader(pdf, style, doc, opts, currentY)
		if firstPage {
			currentY = drawAuditTrailMetadata(pdf, style, doc, opts, currentY+8)
		}
		currentY = drawAuditTrailSectionTitle(pdf, style, currentY+16, firstPage)
		drawAuditTrailFooter(pdf, style)
		return currentY + 8
	}

	rowY := startPage(true)
	bottomLimit := style.PageHeight - style.MarginBottom - style.FooterReserve
	for idx, entry := range entries {
		rowHeight := estimateAuditTrailTimelineRowHeight(pdf, style, entry)
		if rowY+rowHeight > bottomLimit {
			rowY = startPage(false)
		}
		rowY = drawAuditTrailTimelineRow(pdf, style, entry, rowY, idx == len(entries)-1)
	}
	return nil
}

func reverseAuditTrailEntries(entries []AuditTrailEntry) {
	for left, right := 0, len(entries)-1; left < right; left, right = left+1, right-1 {
		entries[left], entries[right] = entries[right], entries[left]
	}
}

func drawAuditTrailHeader(pdf *gofpdf.Fpdf, style auditTrailStyle, doc AuditTrailDocument, opts auditTrailRenderOptions, startY float64) float64 {
	title := "Audit Trail"
	subtitle := strings.TrimSpace(doc.Title)
	if subtitle == "" {
		subtitle = "Agreement"
	}
	if opts.StandaloneCertificate {
		title = "Certificate of Completion"
		subtitle = "Audit Trail"
	}

	pdf.SetXY(style.MarginLeft, startY)
	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(style.Brand.R, style.Brand.G, style.Brand.B)
	pdf.CellFormat(140, 16, "E-Sign", "", 0, "L", false, 0, "")

	pdf.SetFont("Helvetica", "B", 17)
	pdf.SetTextColor(style.Text.R, style.Text.G, style.Text.B)
	pdf.CellFormat(style.PageWidth-style.MarginLeft-style.MarginRight-140, 16, title, "", 1, "R", false, 0, "")

	pdf.SetX(style.MarginLeft)
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(style.Muted.R, style.Muted.G, style.Muted.B)
	pdf.CellFormat(style.PageWidth-style.MarginLeft-style.MarginRight, 12, subtitle, "", 1, "R", false, 0, "")

	dividerY := pdf.GetY() + 4
	pdf.SetDrawColor(style.Border.R, style.Border.G, style.Border.B)
	pdf.Line(style.MarginLeft, dividerY, style.PageWidth-style.MarginRight, dividerY)
	return dividerY + 8
}

func drawAuditTrailMetadata(pdf *gofpdf.Fpdf, style auditTrailStyle, doc AuditTrailDocument, opts auditTrailRenderOptions, startY float64) float64 {
	rows := auditTrailMetadataRows(doc, opts)
	valueX := style.MarginLeft + 134
	valueWidth := style.PageWidth - style.MarginRight - valueX - 10
	rowHeights := make([]float64, len(rows))
	totalRowsHeight := 0.0
	for idx, row := range rows {
		rowHeights[idx] = estimateAuditTrailMetadataRowHeight(pdf, row, valueWidth)
		totalRowsHeight += rowHeights[idx]
	}

	boxX := style.MarginLeft
	boxW := style.PageWidth - style.MarginLeft - style.MarginRight
	boxH := totalRowsHeight + 18
	pdf.SetFillColor(style.Surface.R, style.Surface.G, style.Surface.B)
	pdf.SetDrawColor(style.Border.R, style.Border.G, style.Border.B)
	pdf.Rect(boxX, startY, boxW, boxH, "DF")

	currentY := startY + 14
	for idx, row := range rows {
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetTextColor(style.Muted.R, style.Muted.G, style.Muted.B)
		pdf.Text(boxX+10, currentY, strings.TrimSpace(row.Label))

		if row.Status {
			renderAuditTrailStatusValue(pdf, style, row.Value, valueX, currentY)
		} else {
			renderAuditTrailTextValue(pdf, style, row, valueX, currentY, valueWidth)
		}
		currentY += rowHeights[idx]
	}
	return startY + boxH
}

func renderAuditTrailStatusValue(pdf *gofpdf.Fpdf, style auditTrailStyle, value string, valueX, currentY float64) {
	statusColor := auditTrailStatusColor(value)
	pdf.SetFillColor(statusColor.R, statusColor.G, statusColor.B)
	pdf.Circle(valueX+3, currentY-3, 2.4, "F")
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetTextColor(style.Text.R, style.Text.G, style.Text.B)
	pdf.Text(valueX+10, currentY, auditTrailStatusLabel(value))
}

func renderAuditTrailTextValue(
	pdf *gofpdf.Fpdf,
	style auditTrailStyle,
	row auditTrailMetadataRow,
	valueX, currentY, valueWidth float64,
) {
	value := strings.TrimSpace(row.Value)
	if value == "" {
		value = "-"
	}
	if row.Monospace {
		pdf.SetFont("Courier", "", 9)
	} else {
		pdf.SetFont("Helvetica", "", 10)
	}
	pdf.SetTextColor(style.Text.R, style.Text.G, style.Text.B)
	lines := pdf.SplitText(value, valueWidth)
	if len(lines) == 0 {
		lines = []string{"-"}
	}
	lineY := currentY
	for _, line := range lines {
		pdf.Text(valueX, lineY, strings.TrimSpace(line))
		lineY += 11
	}
}

func drawAuditTrailSectionTitle(pdf *gofpdf.Fpdf, style auditTrailStyle, startY float64, firstPage bool) float64 {
	title := "Document History"
	if !firstPage {
		title = "Document History (continued)"
	}
	pdf.SetXY(style.MarginLeft, startY)
	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(style.Text.R, style.Text.G, style.Text.B)
	pdf.CellFormat(style.PageWidth-style.MarginLeft-style.MarginRight, 12, title, "", 1, "L", false, 0, "")
	return pdf.GetY()
}

func drawAuditTrailFooter(pdf *gofpdf.Fpdf, style auditTrailStyle) {
	y := style.PageHeight - style.MarginBottom + 8
	pdf.SetDrawColor(style.Border.R, style.Border.G, style.Border.B)
	pdf.Line(style.MarginLeft, y-12, style.PageWidth-style.MarginRight, y-12)
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(style.Muted.R, style.Muted.G, style.Muted.B)
	pdf.Text(style.MarginLeft, y, "Powered by E-Sign")
}

func estimateAuditTrailMetadataRowHeight(pdf *gofpdf.Fpdf, row auditTrailMetadataRow, valueWidth float64) float64 {
	if row.Status {
		return 16
	}
	value := strings.TrimSpace(row.Value)
	if value == "" {
		return 16
	}
	if row.Monospace {
		pdf.SetFont("Courier", "", 9)
	} else {
		pdf.SetFont("Helvetica", "", 10)
	}
	lines := pdf.SplitText(value, valueWidth)
	if len(lines) <= 1 {
		return 16
	}
	height := float64(len(lines)) * 11
	if height < 16 {
		return 16
	}
	return height
}

func estimateAuditTrailTimelineRowHeight(pdf *gofpdf.Fpdf, style auditTrailStyle, entry AuditTrailEntry) float64 {
	contentWidth := style.PageWidth - style.MarginLeft - style.MarginRight - style.TimelineOffset
	pdf.SetFont("Helvetica", "", 10)
	description := strings.TrimSpace(entry.Description)
	if description == "" {
		description = "-"
	}
	lines := pdf.SplitText(description, contentWidth)
	if len(lines) == 0 {
		lines = []string{"-"}
	}
	height := 26 + float64(len(lines))*11
	if shouldRenderAuditTrailIP(entry) {
		height += 11
	}
	if height < 56 {
		height = 56
	}
	return height
}

func drawAuditTrailTimelineRow(pdf *gofpdf.Fpdf, style auditTrailStyle, entry AuditTrailEntry, startY float64, isLast bool) float64 {
	rowHeight := estimateAuditTrailTimelineRowHeight(pdf, style, entry)
	contentX := style.MarginLeft + style.TimelineOffset
	contentWidth := style.PageWidth - style.MarginLeft - style.MarginRight - style.TimelineOffset
	iconX := style.MarginLeft + 8
	iconY := startY + 10

	pdf.SetDrawColor(style.Border.R, style.Border.G, style.Border.B)
	lineEndY := startY + rowHeight - 4
	if isLast {
		lineEndY = startY + rowHeight - 12
	}
	if lineEndY > iconY {
		pdf.Line(iconX, iconY+3, iconX, lineEndY)
	}

	eventColor := auditTrailEventColor(entry)
	pdf.SetFillColor(eventColor.R, eventColor.G, eventColor.B)
	pdf.Circle(iconX, iconY, 3.5, "F")

	pdf.SetXY(contentX, startY)
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(eventColor.R, eventColor.G, eventColor.B)
	pdf.CellFormat(76, 11, strings.ToUpper(coalesce(entry.EventType, "EVENT")), "", 0, "L", false, 0, "")

	pdf.SetFont("Courier", "", 8)
	pdf.SetTextColor(style.Muted.R, style.Muted.G, style.Muted.B)
	pdf.CellFormat(contentWidth-76, 11, formatAuditTrailTimestampUTC(entry.Timestamp), "", 1, "R", false, 0, "")

	description := strings.TrimSpace(entry.Description)
	if description == "" {
		description = "-"
	}
	descriptionColor := style.Text
	if strings.EqualFold(strings.TrimSpace(entry.Severity), "warning") || strings.EqualFold(strings.TrimSpace(entry.EventType), AuditTrailEventIncomplete) {
		descriptionColor = auditTrailColor{R: 185, G: 28, B: 28}
	}
	pdf.SetXY(contentX, startY+12)
	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(descriptionColor.R, descriptionColor.G, descriptionColor.B)
	pdf.MultiCell(contentWidth, 11, description, "", "L", false)

	if shouldRenderAuditTrailIP(entry) {
		pdf.SetFont("Courier", "", 8)
		pdf.SetTextColor(style.Muted.R, style.Muted.G, style.Muted.B)
		pdf.SetX(contentX)
		pdf.CellFormat(contentWidth, 10, "IP: "+DisplayAuditIPAddress(entry.IPAddress), "", 1, "L", false, 0, "")
	}

	nextY := startY + rowHeight
	if pdf.GetY()+4 > nextY {
		nextY = pdf.GetY() + 4
	}
	return nextY
}

func shouldRenderAuditTrailIP(entry AuditTrailEntry) bool {
	return entry.ShowIPAddress && strings.TrimSpace(entry.IPAddress) != ""
}

func auditTrailMetadataRows(doc AuditTrailDocument, opts auditTrailRenderOptions) []auditTrailMetadataRow {
	rows := []auditTrailMetadataRow{
		{Label: "Title", Value: coalesce(strings.TrimSpace(doc.Title), "Agreement")},
		{Label: "File name", Value: coalesce(strings.TrimSpace(doc.FileName), "document.pdf")},
		{Label: "Document ID", Value: coalesce(strings.TrimSpace(doc.DocumentID), strings.TrimSpace(doc.AgreementID)), Monospace: true},
		{Label: "Document Hash", Value: strings.TrimSpace(doc.DocumentHash), Monospace: true},
		{Label: "Audit trail date format", Value: "MM/DD/YYYY"},
		{Label: "Status", Value: strings.TrimSpace(doc.Status), Status: true},
	}
	if opts.StandaloneCertificate {
		rows = append(rows,
			auditTrailMetadataRow{Label: "Agreement ID", Value: strings.TrimSpace(doc.AgreementID), Monospace: true},
			auditTrailMetadataRow{Label: "Generated At", Value: formatAuditTrailTimestampUTC(doc.GeneratedAt)},
			auditTrailMetadataRow{Label: "Executed SHA256", Value: strings.TrimSpace(doc.ExecutedSHA256), Monospace: true},
			auditTrailMetadataRow{Label: "Root Agreement ID", Value: strings.TrimSpace(doc.RootAgreementID), Monospace: true},
			auditTrailMetadataRow{Label: "Parent Agreement ID", Value: strings.TrimSpace(doc.ParentAgreementID), Monospace: true},
			auditTrailMetadataRow{Label: "Parent Executed SHA256", Value: strings.TrimSpace(doc.ParentExecutedSHA256), Monospace: true},
			auditTrailMetadataRow{Label: "Correlation ID", Value: strings.TrimSpace(doc.CorrelationID), Monospace: true},
		)
	}
	return rows
}

func formatAuditTrailTimestampUTC(value time.Time) string {
	if value.IsZero() {
		return "-"
	}
	return value.UTC().Format("01/02/2006 15:04:05 UTC")
}

func auditTrailStatusLabel(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case stores.AgreementStatusCompleted:
		return "Completed"
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
		return "Pending signature"
	case stores.AgreementStatusDeclined, stores.AgreementStatusVoided, stores.AgreementStatusExpired:
		return "Incomplete"
	case stores.AgreementStatusDraft:
		return "Draft"
	default:
		if strings.TrimSpace(status) == "" {
			return "Unknown"
		}
		normalized := strings.ReplaceAll(strings.ToLower(strings.TrimSpace(status)), "_", " ")
		parts := strings.Fields(normalized)
		for idx, part := range parts {
			if part == "" {
				continue
			}
			parts[idx] = strings.ToUpper(part[:1]) + part[1:]
		}
		if len(parts) == 0 {
			return "Unknown"
		}
		return strings.Join(parts, " ")
	}
}

func auditTrailStatusColor(status string) auditTrailColor {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case stores.AgreementStatusCompleted:
		return auditTrailColor{R: 22, G: 163, B: 74}
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
		return auditTrailColor{R: 37, G: 99, B: 235}
	case stores.AgreementStatusDeclined, stores.AgreementStatusVoided, stores.AgreementStatusExpired:
		return auditTrailColor{R: 220, G: 38, B: 38}
	default:
		return auditTrailColor{R: 107, G: 114, B: 128}
	}
}

func auditTrailEventColor(entry AuditTrailEntry) auditTrailColor {
	switch strings.ToUpper(strings.TrimSpace(entry.EventType)) {
	case AuditTrailEventCreated:
		return auditTrailColor{R: 71, G: 85, B: 105}
	case AuditTrailEventSent:
		return auditTrailColor{R: 37, G: 99, B: 235}
	case AuditTrailEventViewed:
		return auditTrailColor{R: 2, G: 132, B: 199}
	case AuditTrailEventSigned, AuditTrailEventCompleted:
		return auditTrailColor{R: 22, G: 163, B: 74}
	case AuditTrailEventDeclined:
		return auditTrailColor{R: 234, G: 88, B: 12}
	case AuditTrailEventIncomplete:
		return auditTrailColor{R: 220, G: 38, B: 38}
	default:
		if strings.EqualFold(strings.TrimSpace(entry.Severity), "warning") {
			return auditTrailColor{R: 185, G: 28, B: 28}
		}
		return auditTrailColor{R: 107, G: 114, B: 128}
	}
}
