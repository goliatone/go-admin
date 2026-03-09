package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/phpdave11/gofpdf"
)

// ReadableArtifactRenderer renders user-facing executed/certificate PDFs from agreement data.
// It preserves source pages for executed output and overlays completed field values/signatures.
type ReadableArtifactRenderer struct {
	documents  stores.DocumentStore
	signatures stores.SignatureArtifactStore
	objects    artifactObjectStore
	pdfs       PDFService
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

// WithReadableArtifactRendererPDFService sets the shared PDF service for source-page import/render.
func WithReadableArtifactRendererPDFService(service PDFService) ReadableArtifactRendererOption {
	return func(r *ReadableArtifactRenderer) {
		if r == nil {
			return
		}
		r.pdfs = service
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
		pdfs:       NewPDFService(),
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
	policy := r.pdfs.Policy(ctx, input.Scope)
	compatibility := resolveDocumentCompatibility(policy, document)
	sourcePDF, err := r.resolveRenderSourcePDF(ctx, policy, document, compatibility)
	if err != nil {
		return RenderedArtifact{}, err
	}

	trailDoc := BuildAuditTrailDocument(AuditTrailBuildInput{
		Agreement:     input.Agreement,
		Recipients:    input.Recipients,
		Events:        input.Events,
		GeneratedAt:   r.now().UTC(),
		DocumentID:    strings.TrimSpace(document.ID),
		DocumentTitle: strings.TrimSpace(document.Title),
		DocumentKey:   strings.TrimSpace(document.SourceObjectKey),
		DocumentHash:  strings.TrimSpace(document.SourceSHA256),
		CorrelationID: strings.TrimSpace(input.CorrelationID),
	})
	renderedPDF, err := r.renderExecutedWithOverlays(
		ctx,
		sourcePDF,
		document.PageCount,
		strings.TrimSpace(document.SourceSHA256),
		string(compatibility.Tier),
		trailDoc,
		input,
	)
	if err != nil {
		return RenderedArtifact{}, err
	}

	sum := sha256.Sum256(renderedPDF)
	return RenderedArtifact{
		ObjectKey: fmt.Sprintf("tenant/%s/org/%s/agreements/%s/executed.pdf", input.Scope.TenantID, input.Scope.OrgID, agreementID),
		SHA256:    hex.EncodeToString(sum[:]),
		Payload:   renderedPDF,
	}, nil
}

func (r ReadableArtifactRenderer) resolveRenderSourcePDF(ctx context.Context, policy PDFPolicy, document stores.DocumentRecord, compatibility PDFCompatibilityStatus) ([]byte, error) {
	if r.objects == nil {
		return nil, fmt.Errorf("render executed: source document dependencies not configured")
	}
	if compatibility.Tier == PDFCompatibilityTierUnsupported && !policyAllowsAnalyzeOnlyUpload(policy) {
		return nil, pdfUnsupportedError("artifact.render_executed", string(compatibility.Tier), compatibility.Reason, map[string]any{
			"document_id": document.ID,
		})
	}
	normalizedKey := strings.TrimSpace(document.NormalizedObjectKey)
	sourceKey := strings.TrimSpace(document.SourceObjectKey)

	if !policyPrefersNormalizedSource(policy) {
		if sourceKey != "" {
			sourcePDF, err := r.resolveRenderSourcePDFObject(ctx, sourceKey)
			if err == nil {
				return sourcePDF, nil
			}
		}
		if normalizedKey != "" {
			return r.resolveRenderSourcePDFObject(ctx, normalizedKey)
		}
		return nil, fmt.Errorf("render executed: source document object key required")
	}

	normalizedUnavailable := false
	if normalizedKey != "" {
		normalizedPDF, err := r.resolveRenderSourcePDFObject(ctx, normalizedKey)
		if err == nil {
			return normalizedPDF, nil
		}
		normalizedUnavailable = true
		if !policyAllowsOriginalFallback(policy) {
			return nil, fmt.Errorf("render executed: normalized source unavailable and original fallback disallowed")
		}
	} else {
		normalizedUnavailable = true
	}

	if sourceKey == "" {
		if normalizedUnavailable {
			return nil, fmt.Errorf("render executed: normalized source unavailable")
		}
		return nil, fmt.Errorf("render executed: source document object key required")
	}
	if normalizedUnavailable && !policyAllowsOriginalFallback(policy) {
		return nil, fmt.Errorf("render executed: normalized source unavailable and original fallback disallowed")
	}
	return r.resolveRenderSourcePDFObject(ctx, sourceKey)
}

func (r ReadableArtifactRenderer) resolveRenderSourcePDFObject(ctx context.Context, objectKey string) ([]byte, error) {
	objectKey = strings.TrimSpace(objectKey)
	if objectKey == "" {
		return nil, fmt.Errorf("render executed: source document object key required")
	}
	sourcePDF, err := r.objects.GetFile(ctx, objectKey)
	if err != nil || len(sourcePDF) == 0 {
		return nil, fmt.Errorf("render executed: source document payload unavailable")
	}
	if !bytes.HasPrefix(sourcePDF, []byte("%PDF-")) {
		return nil, fmt.Errorf("render executed: source payload is not a pdf")
	}
	return sourcePDF, nil
}

func (r ReadableArtifactRenderer) renderExecutedWithOverlays(
	ctx context.Context,
	sourcePDF []byte,
	sourcePageCount int,
	sourceSHA256 string,
	compatibilityTier string,
	auditDoc AuditTrailDocument,
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
	overlaysByPage := r.buildExecutedOverlays(ctx, input)
	footerText := executedDocumentHashFooter(sourceSHA256)
	auditPageWidth := 0.0
	auditPageHeight := 0.0
	if err := r.pdfs.RenderSourcePages(ctx, input.Scope, pdf, sourcePDF, pageCount, func(page int, width, height float64) error {
		for _, overlay := range overlaysByPage[page] {
			drawExecutedOverlay(pdf, overlay)
		}
		drawExecutedFooter(pdf, width, height, footerText)
		auditPageWidth = width
		auditPageHeight = height
		return nil
	}); err != nil {
		observability.ObservePDFRenderImportFail(ctx, pdfRenderImportReason(err), strings.TrimSpace(compatibilityTier))
		var pdfErr *PDFError
		if errors.As(err, &pdfErr) && pdfErr.Page > 0 {
			return nil, fmt.Errorf("render executed: failed importing source page %d: %w", pdfErr.Page, err)
		}
		return nil, fmt.Errorf("render executed: %w", err)
	}

	if err := r.renderAuditTrailPages(pdf, auditDoc, auditTrailRenderOptions{
		ReverseChronological: true,
		PageWidth:            auditPageWidth,
		PageHeight:           auditPageHeight,
	}); err != nil {
		return nil, err
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

func pdfRenderImportReason(err error) string {
	if err == nil {
		return "import.failed"
	}
	var pdfErr *PDFError
	if errors.As(err, &pdfErr) {
		reason := strings.TrimSpace(string(pdfErr.Reason))
		if reason != "" {
			return reason
		}
	}
	return "import.failed"
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
	pdf.SetMargins(54, 48, 54)
	pdf.SetAutoPageBreak(false, 0)
	trailDoc := BuildAuditTrailDocument(AuditTrailBuildInput{
		Agreement:      input.Agreement,
		Recipients:     input.Recipients,
		Events:         input.Events,
		GeneratedAt:    r.now().UTC(),
		DocumentID:     strings.TrimSpace(input.Agreement.DocumentID),
		DocumentTitle:  strings.TrimSpace(input.Agreement.Title),
		DocumentHash:   strings.TrimSpace(input.ExecutedSHA256),
		ExecutedSHA256: strings.TrimSpace(input.ExecutedSHA256),
		CorrelationID:  strings.TrimSpace(input.CorrelationID),
	})
	if err := r.renderAuditTrailPages(pdf, trailDoc, auditTrailRenderOptions{StandaloneCertificate: true}); err != nil {
		return RenderedArtifact{}, err
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

func executedDocumentHashFooter(sourceSHA256 string) string {
	normalized := normalizeSHA256Hex(sourceSHA256)
	if normalized == "" {
		return ""
	}
	if len(normalized) < 24 {
		return "Document Hash: " + normalized
	}
	return fmt.Sprintf("Document Hash: %s...%s", normalized[:16], normalized[len(normalized)-8:])
}

func drawExecutedFooter(pdf *gofpdf.Fpdf, pageWidth, pageHeight float64, footer string) {
	footer = strings.TrimSpace(footer)
	if footer == "" {
		return
	}
	const footerYInset = 22.0
	pdf.SetFont("Courier", "", 8)
	pdf.SetTextColor(97, 99, 103)
	pdf.Text(40, pageHeight-footerYInset, footer)
	pdf.SetTextColor(20, 20, 20)
	_ = pageWidth
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

func maxFieldPage(fields []stores.FieldRecord) int {
	maxPage := 0
	for _, field := range fields {
		if field.PageNumber > maxPage {
			maxPage = field.PageNumber
		}
	}
	return maxPage
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
