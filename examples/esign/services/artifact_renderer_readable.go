package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/phpdave11/gofpdf"
	gofpdi "github.com/phpdave11/gofpdf/contrib/gofpdi"
)

const (
	defaultPDFPageWidthPt  = 612.0
	defaultPDFPageHeightPt = 792.0
)

// ReadableArtifactRenderer renders user-facing executed/certificate PDFs from agreement data.
// It preserves source pages for executed output and overlays completed field values/signatures.
type ReadableArtifactRenderer struct {
	documents  stores.DocumentStore
	signatures stores.SignatureArtifactStore
	objects    artifactObjectStore
	now        func() time.Time
}

// ReadableArtifactRendererOption customizes renderer behavior.
type ReadableArtifactRendererOption func(*ReadableArtifactRenderer)

// WithReadableArtifactRendererClock overrides renderer clock (primarily for tests).
func WithReadableArtifactRendererClock(now func() time.Time) ReadableArtifactRendererOption {
	return func(r *ReadableArtifactRenderer) {
		if r == nil || now == nil {
			return
		}
		r.now = now
	}
}

// NewReadableArtifactRenderer builds the runtime renderer used for signer-visible artifacts.
func NewReadableArtifactRenderer(
	documents stores.DocumentStore,
	signatures stores.SignatureArtifactStore,
	objects artifactObjectStore,
	opts ...ReadableArtifactRendererOption,
) ReadableArtifactRenderer {
	renderer := ReadableArtifactRenderer{
		documents:  documents,
		signatures: signatures,
		objects:    objects,
		now: func() time.Time {
			return time.Now().UTC()
		},
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&renderer)
	}
	return renderer
}

func (r ReadableArtifactRenderer) RenderExecuted(ctx context.Context, input ExecutedRenderInput) (RenderedArtifact, error) {
	agreementID := strings.TrimSpace(input.Agreement.ID)
	if agreementID == "" {
		return RenderedArtifact{}, fmt.Errorf("render executed: agreement id required")
	}
	if r.documents == nil || r.objects == nil {
		return RenderedArtifact{}, fmt.Errorf("render executed: source document dependencies not configured")
	}
	documentID := strings.TrimSpace(input.Agreement.DocumentID)
	if documentID == "" {
		return RenderedArtifact{}, fmt.Errorf("render executed: agreement document id required")
	}
	document, err := r.documents.Get(ctx, input.Scope, documentID)
	if err != nil {
		return RenderedArtifact{}, fmt.Errorf("render executed: source document not found: %w", err)
	}
	sourceKey := strings.TrimSpace(document.SourceObjectKey)
	if sourceKey == "" {
		return RenderedArtifact{}, fmt.Errorf("render executed: source document object key required")
	}
	sourcePDF, err := r.objects.GetFile(ctx, sourceKey)
	if err != nil || len(sourcePDF) == 0 {
		return RenderedArtifact{}, fmt.Errorf("render executed: source document payload unavailable")
	}
	if !bytes.HasPrefix(sourcePDF, []byte("%PDF-")) {
		return RenderedArtifact{}, fmt.Errorf("render executed: source payload is not a pdf")
	}

	renderedPDF, err := r.renderExecutedWithOverlays(ctx, sourcePDF, document.PageCount, input)
	if err != nil {
		// Phase 1 fallback: preserve readable source document even if overlay rendering fails.
		renderedPDF = append([]byte{}, sourcePDF...)
	}

	sum := sha256.Sum256(renderedPDF)
	return RenderedArtifact{
		ObjectKey: fmt.Sprintf("tenant/%s/org/%s/agreements/%s/executed.pdf", input.Scope.TenantID, input.Scope.OrgID, agreementID),
		SHA256:    hex.EncodeToString(sum[:]),
		Payload:   renderedPDF,
	}, nil
}

func (r ReadableArtifactRenderer) renderExecutedWithOverlays(
	ctx context.Context,
	sourcePDF []byte,
	sourcePageCount int,
	input ExecutedRenderInput,
) ([]byte, error) {
	pageCount := sourcePageCount
	if pageCount <= 0 {
		pageCount = maxFieldPage(input.Fields)
	}
	if pageCount <= 0 {
		pageCount = 1
	}

	pdf := gofpdf.New("P", "pt", "Letter", "")
	pdf.SetCompression(false)
	importer := gofpdi.NewImporter()
	overlaysByPage := r.buildExecutedOverlays(ctx, input)

	for page := 1; page <= pageCount; page++ {
		rs := io.ReadSeeker(bytes.NewReader(sourcePDF))
		tplID := importer.ImportPageFromStream(pdf, &rs, page, "/MediaBox")
		width, height := importedPageSize(importer.GetPageSizes(), page)
		orientation := "P"
		if width > height {
			orientation = "L"
		}
		pdf.AddPageFormat(orientation, gofpdf.SizeType{Wd: width, Ht: height})
		importer.UseImportedTemplate(pdf, tplID, 0, 0, width, height)
		for _, overlay := range overlaysByPage[page] {
			drawExecutedOverlay(pdf, overlay)
		}
	}

	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	rendered := out.Bytes()
	if !bytes.HasPrefix(rendered, []byte("%PDF-")) {
		return nil, fmt.Errorf("render executed: output is not a pdf")
	}
	return rendered, nil
}

func (r ReadableArtifactRenderer) buildExecutedOverlays(ctx context.Context, input ExecutedRenderInput) map[int][]executedOverlay {
	fieldsByID := make(map[string]stores.FieldRecord, len(input.Fields))
	for _, field := range input.Fields {
		fieldsByID[strings.TrimSpace(field.ID)] = field
	}
	recipientsByID := make(map[string]stores.RecipientRecord, len(input.Recipients))
	for _, recipient := range input.Recipients {
		recipientsByID[strings.TrimSpace(recipient.ID)] = recipient
	}

	overlaysByPage := map[int][]executedOverlay{}
	for _, value := range input.FieldValues {
		fieldID := strings.TrimSpace(value.FieldID)
		field, ok := fieldsByID[fieldID]
		if !ok || field.PageNumber <= 0 {
			continue
		}
		overlay := executedOverlay{
			PageNumber: field.PageNumber,
			X:          field.PosX,
			Y:          field.PosY,
			W:          field.Width,
			H:          field.Height,
		}
		recipient := recipientsByID[strings.TrimSpace(field.RecipientID)]
		resolvedText := resolveOverlayText(field, value, recipient)
		if strings.TrimSpace(resolvedText) != "" {
			overlay.Text = resolvedText
			overlay.Style = overlayTextStyle(field.Type)
		}
		if isSignatureAttachFieldType(field.Type) {
			overlay.Image = r.resolveSignatureImage(ctx, input.Scope, value.SignatureArtifactID)
		}
		if overlay.Text == "" && len(overlay.Image) == 0 {
			continue
		}
		overlaysByPage[field.PageNumber] = append(overlaysByPage[field.PageNumber], overlay)
	}
	for pageNumber, overlays := range overlaysByPage {
		sort.SliceStable(overlays, func(i, j int) bool {
			if overlays[i].Y == overlays[j].Y {
				return overlays[i].X < overlays[j].X
			}
			return overlays[i].Y < overlays[j].Y
		})
		overlaysByPage[pageNumber] = overlays
	}
	return overlaysByPage
}

func (r ReadableArtifactRenderer) resolveSignatureImage(ctx context.Context, scope stores.Scope, signatureArtifactID string) []byte {
	if r.signatures == nil || r.objects == nil {
		return nil
	}
	signatureArtifactID = strings.TrimSpace(signatureArtifactID)
	if signatureArtifactID == "" {
		return nil
	}
	artifact, err := r.signatures.GetSignatureArtifact(ctx, scope, signatureArtifactID)
	if err != nil {
		return nil
	}
	if strings.ToLower(strings.TrimSpace(artifact.Type)) != "drawn" {
		return nil
	}
	payload, err := r.objects.GetFile(ctx, strings.TrimSpace(artifact.ObjectKey))
	if err != nil || len(payload) == 0 {
		return nil
	}
	return append([]byte{}, payload...)
}

func (r ReadableArtifactRenderer) RenderCertificate(_ context.Context, input CertificateRenderInput) (RenderedArtifact, error) {
	agreementID := strings.TrimSpace(input.Agreement.ID)
	if agreementID == "" {
		return RenderedArtifact{}, fmt.Errorf("render certificate: agreement id required")
	}

	pdf := gofpdf.New("P", "pt", "Letter", "")
	pdf.SetCompression(false)
	pdf.SetMargins(54, 54, 54)
	pdf.SetAutoPageBreak(true, 54)
	pdf.AddPage()

	pdf.SetFont("Helvetica", "B", 24)
	pdf.CellFormat(0, 30, "Certificate of Completion", "", 1, "L", false, 0, "")

	pdf.SetFont("Helvetica", "", 12)
	pdf.CellFormat(0, 18, "Agreement completion audit trail and verification details.", "", 1, "L", false, 0, "")
	pdf.Ln(4)

	r.writeCertificateSectionTitle(pdf, "Agreement")
	r.writeCertificateKV(pdf, "Agreement ID", agreementID)
	r.writeCertificateKV(pdf, "Status", coalesce(strings.TrimSpace(input.Agreement.Status), stores.AgreementStatusCompleted))
	r.writeCertificateKV(pdf, "Generated At", r.now().UTC().Format(time.RFC3339))
	r.writeCertificateKV(pdf, "Executed SHA256", strings.TrimSpace(input.ExecutedSHA256))
	r.writeCertificateKV(pdf, "Correlation ID", strings.TrimSpace(input.CorrelationID))

	pdf.Ln(6)
	r.writeCertificateSectionTitle(pdf, "Recipients")
	recipients := append([]stores.RecipientRecord(nil), input.Recipients...)
	sort.Slice(recipients, func(i, j int) bool {
		if recipients[i].SigningOrder == recipients[j].SigningOrder {
			return recipients[i].ID < recipients[j].ID
		}
		return recipients[i].SigningOrder < recipients[j].SigningOrder
	})
	if len(recipients) == 0 {
		r.writeCertificateBody(pdf, "- None")
	} else {
		for _, recipient := range recipients {
			status := "pending"
			if recipient.CompletedAt != nil {
				status = "completed at " + recipient.CompletedAt.UTC().Format(time.RFC3339)
			}
			if recipient.DeclinedAt != nil {
				status = "declined at " + recipient.DeclinedAt.UTC().Format(time.RFC3339)
			}
			line := fmt.Sprintf("- %s <%s> role=%s stage=%d status=%s",
				coalesce(strings.TrimSpace(recipient.Name), strings.TrimSpace(recipient.ID)),
				strings.TrimSpace(recipient.Email),
				strings.TrimSpace(recipient.Role),
				normalizeSigningStage(recipient.SigningOrder),
				status,
			)
			r.writeCertificateBody(pdf, line)
		}
	}

	pdf.Ln(6)
	r.writeCertificateSectionTitle(pdf, "Stage Timeline")
	stageTimeline := buildCertificateStageTimeline(recipients)
	if len(stageTimeline) == 0 {
		r.writeCertificateBody(pdf, "- No signer stage data recorded")
	} else {
		for _, line := range stageTimeline {
			r.writeCertificateBody(pdf, "- "+line)
		}
	}

	pdf.Ln(6)
	r.writeCertificateSectionTitle(pdf, "Audit Timeline")
	events := append([]stores.AuditEventRecord(nil), input.Events...)
	sort.Slice(events, func(i, j int) bool {
		if events[i].CreatedAt.Equal(events[j].CreatedAt) {
			return events[i].ID < events[j].ID
		}
		return events[i].CreatedAt.Before(events[j].CreatedAt)
	})
	if len(events) == 0 {
		r.writeCertificateBody(pdf, "- No audit events recorded")
	} else {
		for _, event := range events {
			parts := []string{
				event.CreatedAt.UTC().Format(time.RFC3339),
				coalesce(strings.TrimSpace(event.EventType), "event"),
				fmt.Sprintf("actor=%s:%s", strings.TrimSpace(event.ActorType), strings.TrimSpace(event.ActorID)),
			}
			if metadata := compactMetadata(event.MetadataJSON); metadata != "" {
				parts = append(parts, "metadata="+metadata)
			}
			r.writeCertificateBody(pdf, "- "+strings.Join(parts, " "))
		}
	}

	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return RenderedArtifact{}, err
	}
	payload := out.Bytes()
	sum := sha256.Sum256(payload)
	return RenderedArtifact{
		ObjectKey: fmt.Sprintf("tenant/%s/org/%s/agreements/%s/certificate.pdf", input.Scope.TenantID, input.Scope.OrgID, agreementID),
		SHA256:    hex.EncodeToString(sum[:]),
		Payload:   payload,
	}, nil
}

func (r ReadableArtifactRenderer) writeCertificateSectionTitle(pdf *gofpdf.Fpdf, title string) {
	pdf.SetFont("Helvetica", "B", 14)
	pdf.CellFormat(0, 18, strings.TrimSpace(title), "", 1, "L", false, 0, "")
}

func (r ReadableArtifactRenderer) writeCertificateKV(pdf *gofpdf.Fpdf, key, value string) {
	line := fmt.Sprintf("%s: %s", strings.TrimSpace(key), coalesce(strings.TrimSpace(value), "-"))
	r.writeCertificateBody(pdf, line)
}

func (r ReadableArtifactRenderer) writeCertificateBody(pdf *gofpdf.Fpdf, text string) {
	pdf.SetFont("Helvetica", "", 11)
	pdf.MultiCell(0, 15, strings.TrimSpace(text), "", "L", false)
}

func buildCertificateStageTimeline(recipients []stores.RecipientRecord) []string {
	byStage := map[int][]stores.RecipientRecord{}
	stages := make([]int, 0)
	for _, recipient := range recipients {
		if recipient.Role != stores.RecipientRoleSigner {
			continue
		}
		stage := normalizeSigningStage(recipient.SigningOrder)
		if _, ok := byStage[stage]; !ok {
			stages = append(stages, stage)
		}
		byStage[stage] = append(byStage[stage], recipient)
	}
	if len(stages) == 0 {
		return nil
	}
	sort.Ints(stages)

	lines := make([]string, 0, len(stages))
	for _, stage := range stages {
		signers := byStage[stage]
		sort.Slice(signers, func(i, j int) bool {
			if strings.TrimSpace(signers[i].Name) == strings.TrimSpace(signers[j].Name) {
				return signers[i].ID < signers[j].ID
			}
			return strings.TrimSpace(signers[i].Name) < strings.TrimSpace(signers[j].Name)
		})

		completedCount := 0
		declinedCount := 0
		participantStatus := make([]string, 0, len(signers))
		for _, signer := range signers {
			status := "pending"
			if signer.CompletedAt != nil {
				status = "completed@" + signer.CompletedAt.UTC().Format(time.RFC3339)
				completedCount++
			}
			if signer.DeclinedAt != nil {
				status = "declined@" + signer.DeclinedAt.UTC().Format(time.RFC3339)
				declinedCount++
			}
			participantStatus = append(participantStatus, fmt.Sprintf("%s<%s>:%s",
				coalesce(strings.TrimSpace(signer.Name), strings.TrimSpace(signer.ID)),
				strings.TrimSpace(signer.Email),
				status,
			))
		}
		lines = append(lines, fmt.Sprintf("stage=%d signers=%d completed=%d declined=%d participants=[%s]",
			stage,
			len(signers),
			completedCount,
			declinedCount,
			strings.Join(participantStatus, ", "),
		))
	}
	return lines
}

type executedOverlay struct {
	PageNumber int
	X          float64
	Y          float64
	W          float64
	H          float64
	Text       string
	Style      overlayStyle
	Image      []byte
}

type overlayStyle struct {
	FontStyle string
	FontSize  float64
}

func drawExecutedOverlay(pdf *gofpdf.Fpdf, overlay executedOverlay) {
	x := rendererMaxFloat(0, overlay.X)
	y := rendererMaxFloat(0, overlay.Y)
	w := rendererMaxFloat(1, overlay.W)
	h := rendererMaxFloat(1, overlay.H)

	if len(overlay.Image) > 0 {
		if imageCfg, _, err := image.DecodeConfig(bytes.NewReader(overlay.Image)); err == nil && imageCfg.Width > 0 && imageCfg.Height > 0 {
			aspect := float64(imageCfg.Width) / float64(imageCfg.Height)
			boxAspect := w / h
			drawW := w
			drawH := h
			if aspect > boxAspect {
				drawH = w / aspect
			} else {
				drawW = h * aspect
			}
			drawX := x + (w-drawW)/2
			drawY := y + (h-drawH)/2
			sum := sha256.Sum256(overlay.Image)
			imageName := "sig_" + hex.EncodeToString(sum[:8])
			pdf.RegisterImageOptionsReader(imageName, gofpdf.ImageOptions{ImageType: "png", ReadDpi: false}, bytes.NewReader(overlay.Image))
			pdf.ImageOptions(imageName, drawX, drawY, drawW, drawH, false, gofpdf.ImageOptions{ImageType: "png", ReadDpi: false}, 0, "")
			return
		}
	}

	if strings.TrimSpace(overlay.Text) == "" {
		return
	}
	fontStyle := strings.TrimSpace(overlay.Style.FontStyle)
	if fontStyle == "" {
		fontStyle = ""
	}
	fontSize := overlay.Style.FontSize
	if fontSize <= 0 {
		fontSize = 12
	}
	pdf.SetFont("Helvetica", fontStyle, fontSize)
	pdf.SetTextColor(20, 20, 20)
	margin := 2.0
	usableWidth := rendererMaxFloat(1, w-(margin*2))
	lineHeight := rendererMaxFloat(10, fontSize+1)
	lines := pdf.SplitText(strings.TrimSpace(overlay.Text), usableWidth)
	if len(lines) == 0 {
		lines = []string{strings.TrimSpace(overlay.Text)}
	}
	maxLines := int((h - (margin * 2)) / lineHeight)
	if maxLines <= 0 {
		maxLines = 1
	}
	for idx, line := range lines {
		if idx >= maxLines {
			break
		}
		baseline := y + margin + float64(idx+1)*lineHeight - 1
		pdf.Text(x+margin, baseline, line)
	}
}

func resolveOverlayText(field stores.FieldRecord, value stores.FieldValueRecord, recipient stores.RecipientRecord) string {
	text := strings.TrimSpace(value.ValueText)
	switch strings.ToLower(strings.TrimSpace(field.Type)) {
	case stores.FieldTypeCheckbox:
		if value.ValueBool != nil && *value.ValueBool {
			return "X"
		}
		return ""
	case stores.FieldTypeDateSigned:
		if text != "" {
			return text
		}
		if recipient.CompletedAt != nil {
			return recipient.CompletedAt.UTC().Format("2006-01-02")
		}
		return ""
	case stores.FieldTypeName:
		if text != "" {
			return text
		}
		return strings.TrimSpace(recipient.Name)
	case stores.FieldTypeSignature:
		if text != "" {
			return text
		}
		return strings.TrimSpace(recipient.Name)
	case stores.FieldTypeInitials:
		if text != "" {
			return text
		}
		return initialsFromName(recipient.Name)
	default:
		return text
	}
}

func overlayTextStyle(fieldType string) overlayStyle {
	switch strings.ToLower(strings.TrimSpace(fieldType)) {
	case stores.FieldTypeSignature:
		return overlayStyle{FontStyle: "I", FontSize: 14}
	case stores.FieldTypeInitials:
		return overlayStyle{FontStyle: "B", FontSize: 13}
	case stores.FieldTypeCheckbox:
		return overlayStyle{FontStyle: "B", FontSize: 16}
	default:
		return overlayStyle{FontStyle: "", FontSize: 11}
	}
}

func initialsFromName(name string) string {
	parts := strings.Fields(strings.TrimSpace(name))
	if len(parts) == 0 {
		return ""
	}
	if len(parts) == 1 {
		runes := []rune(parts[0])
		if len(runes) == 0 {
			return ""
		}
		return strings.ToUpper(string(runes[0]))
	}
	first := []rune(parts[0])
	last := []rune(parts[len(parts)-1])
	if len(first) == 0 || len(last) == 0 {
		return ""
	}
	return strings.ToUpper(string(first[0]) + string(last[0]))
}

func compactMetadata(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	decoded := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &decoded); err == nil {
		encoded, err := json.Marshal(decoded)
		if err == nil {
			raw = string(encoded)
		}
	}
	if len(raw) > 240 {
		return raw[:237] + "..."
	}
	return raw
}

func maxFieldPage(fields []stores.FieldRecord) int {
	maxPage := 0
	for _, field := range fields {
		if field.PageNumber > maxPage {
			maxPage = field.PageNumber
		}
	}
	return maxPage
}

func importedPageSize(pageSizes map[int]map[string]map[string]float64, page int) (float64, float64) {
	if pageSizes == nil {
		return defaultPDFPageWidthPt, defaultPDFPageHeightPt
	}
	boxes, ok := pageSizes[page]
	if !ok {
		return defaultPDFPageWidthPt, defaultPDFPageHeightPt
	}
	for _, box := range []string{"/MediaBox", "/CropBox", "/TrimBox", "/BleedBox", "/ArtBox"} {
		if dimensions, found := boxes[box]; found {
			if width := dimensions["w"]; width > 0 {
				if height := dimensions["h"]; height > 0 {
					return width, height
				}
			}
		}
	}
	for _, dimensions := range boxes {
		if width := dimensions["w"]; width > 0 {
			if height := dimensions["h"]; height > 0 {
				return width, height
			}
		}
	}
	return defaultPDFPageWidthPt, defaultPDFPageHeightPt
}

func rendererMaxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func coalesce(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) == "" {
			continue
		}
		return strings.TrimSpace(value)
	}
	return ""
}
