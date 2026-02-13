package services

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
	"github.com/phpdave11/gofpdf"
)

func TestReadableArtifactRendererRenderExecutedUsesSourceAndOverlaysValues(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	renderer := NewReadableArtifactRenderer(store, store, objectStore)

	sourcePDF := buildReadableTestPDF(t, "Master Services Agreement")
	docSvc := NewDocumentService(store, WithDocumentObjectStore(objectStore))
	document, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "MSA",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-1/source.pdf",
		PDF:       sourcePDF,
	})
	if err != nil {
		t.Fatalf("upload source document: %v", err)
	}

	agreementSvc := NewAgreementService(store, store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("create draft: %v", err)
	}
	recipient, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        strPtrReadable("signer@example.com"),
		Name:         strPtrReadable("Signer One"),
		Role:         strPtrReadable(stores.RecipientRoleSigner),
		SigningOrder: intPtrReadable(1),
	}, 0)
	if err != nil {
		t.Fatalf("upsert recipient: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        strPtrReadable(stores.FieldTypeSignature),
		PageNumber:  intPtrReadable(1),
		PosX:        floatPtrReadable(72),
		PosY:        floatPtrReadable(180),
		Width:       floatPtrReadable(180),
		Height:      floatPtrReadable(48),
		Required:    boolPtrReadable(true),
	})
	if err != nil {
		t.Fatalf("upsert signature field: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        strPtrReadable(stores.FieldTypeText),
		PageNumber:  intPtrReadable(1),
		PosX:        floatPtrReadable(72),
		PosY:        floatPtrReadable(260),
		Width:       floatPtrReadable(240),
		Height:      floatPtrReadable(36),
		Required:    boolPtrReadable(true),
	})
	if err != nil {
		t.Fatalf("upsert text field: %v", err)
	}

	signaturePNG := buildReadableSignaturePNG(t)
	signatureObjectKey := "tenant/tenant-1/org/org-1/agreements/" + agreement.ID + "/sig/" + recipient.ID + "/" + signatureField.ID + ".png"
	if _, err := objectStore.UploadFile(ctx, signatureObjectKey, signaturePNG, uploader.WithContentType("image/png")); err != nil {
		t.Fatalf("upload signature png: %v", err)
	}
	artifact, err := store.CreateSignatureArtifact(ctx, scope, stores.SignatureArtifactRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		Type:        "drawn",
		ObjectKey:   signatureObjectKey,
		SHA256:      strings.Repeat("b", 64),
		CreatedAt:   time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("create signature artifact: %v", err)
	}
	if _, err := store.UpsertFieldValue(ctx, scope, stores.FieldValueRecord{
		AgreementID:         agreement.ID,
		RecipientID:         recipient.ID,
		FieldID:             signatureField.ID,
		SignatureArtifactID: artifact.ID,
	}, 0); err != nil {
		t.Fatalf("upsert signature value: %v", err)
	}
	if _, err := store.UpsertFieldValue(ctx, scope, stores.FieldValueRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		FieldID:     textField.ID,
		ValueText:   "Approved by Finance",
	}, 0); err != nil {
		t.Fatalf("upsert text value: %v", err)
	}

	fields, err := store.ListFields(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("list fields: %v", err)
	}
	recipients, err := store.ListRecipients(ctx, scope, agreement.ID)
	if err != nil {
		t.Fatalf("list recipients: %v", err)
	}
	values, err := store.ListFieldValuesByRecipient(ctx, scope, agreement.ID, recipient.ID)
	if err != nil {
		t.Fatalf("list field values: %v", err)
	}

	agreement.Status = stores.AgreementStatusCompleted
	withImage, err := renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope:       scope,
		Agreement:   agreement,
		Recipients:  recipients,
		Fields:      fields,
		FieldValues: values,
	})
	if err != nil {
		t.Fatalf("render executed with image: %v", err)
	}
	if !bytes.HasPrefix(withImage.Payload, []byte("%PDF-")) {
		t.Fatalf("expected executed payload to be pdf")
	}
	if bytes.Equal(withImage.Payload, GenerateDeterministicPDF(1)) {
		t.Fatalf("expected executed payload to be non-deterministic placeholder")
	}
	if !strings.Contains(string(withImage.Payload), "Approved by Finance") {
		t.Fatalf("expected executed payload to include overlaid text value")
	}

	noImageValues := append([]stores.FieldValueRecord(nil), values...)
	for idx := range noImageValues {
		if noImageValues[idx].FieldID == signatureField.ID {
			noImageValues[idx].SignatureArtifactID = ""
		}
	}
	withoutImage, err := renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope:       scope,
		Agreement:   agreement,
		Recipients:  recipients,
		Fields:      fields,
		FieldValues: noImageValues,
	})
	if err != nil {
		t.Fatalf("render executed without image: %v", err)
	}
	if len(withImage.Payload) <= len(withoutImage.Payload) {
		t.Fatalf("expected signature image overlay to increase executed payload size: with=%d without=%d", len(withImage.Payload), len(withoutImage.Payload))
	}
}

func TestReadableArtifactRendererRenderCertificateIncludesAuditDetails(t *testing.T) {
	renderer := NewReadableArtifactRenderer(nil, nil, nil, WithReadableArtifactRendererClock(func() time.Time {
		return time.Date(2026, 2, 13, 12, 0, 0, 0, time.UTC)
	}))

	recipientCompletedAt := time.Date(2026, 2, 13, 11, 45, 0, 0, time.UTC)
	payload, err := renderer.RenderCertificate(context.Background(), CertificateRenderInput{
		Scope: stores.Scope{TenantID: "tenant-1", OrgID: "org-1"},
		Agreement: stores.AgreementRecord{
			ID:     "agreement-1",
			Status: stores.AgreementStatusCompleted,
		},
		Recipients: []stores.RecipientRecord{
			{
				ID:           "recipient-1",
				Name:         "Signer One",
				Email:        "signer@example.com",
				Role:         stores.RecipientRoleSigner,
				SigningOrder: 1,
				CompletedAt:  &recipientCompletedAt,
			},
		},
		Events: []stores.AuditEventRecord{
			{
				ID:           "event-1",
				EventType:    "agreement.completed",
				ActorType:    "system",
				ActorID:      "jobs",
				MetadataJSON: `{"source":"workflow"}`,
				CreatedAt:    time.Date(2026, 2, 13, 11, 46, 0, 0, time.UTC),
			},
		},
		ExecutedSHA256: strings.Repeat("a", 64),
		CorrelationID:  "corr-1",
	})
	if err != nil {
		t.Fatalf("render certificate: %v", err)
	}
	if !bytes.HasPrefix(payload.Payload, []byte("%PDF-")) {
		t.Fatalf("expected certificate payload to be pdf")
	}
	raw := string(payload.Payload)
	for _, expected := range []string{
		"Certificate of Completion",
		"agreement.completed",
		"corr-1",
		strings.Repeat("a", 64),
	} {
		if !strings.Contains(raw, expected) {
			t.Fatalf("expected certificate payload to include %q", expected)
		}
	}
}

func buildReadableTestPDF(t *testing.T, title string) []byte {
	t.Helper()
	pdf := gofpdf.New("P", "pt", "Letter", "")
	pdf.SetCompression(false)
	pdf.AddPage()
	pdf.SetFont("Helvetica", "B", 18)
	pdf.Text(72, 88, title)
	pdf.SetFont("Helvetica", "", 11)
	pdf.Text(72, 116, "This is the source agreement body.")
	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		t.Fatalf("render source pdf: %v", err)
	}
	return out.Bytes()
}

func buildReadableSignaturePNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 220, 60))
	bg := color.RGBA{255, 255, 255, 0}
	stroke := color.RGBA{20, 20, 20, 255}
	for y := 0; y < 60; y++ {
		for x := 0; x < 220; x++ {
			img.Set(x, y, bg)
		}
	}
	for x := 12; x < 208; x++ {
		y := 30 + (x % 9)
		if y >= 0 && y < 60 {
			img.Set(x, y, stroke)
		}
	}
	var out bytes.Buffer
	if err := png.Encode(&out, img); err != nil {
		t.Fatalf("encode signature png: %v", err)
	}
	return out.Bytes()
}

func strPtrReadable(v string) *string     { return &v }
func intPtrReadable(v int) *int           { return &v }
func floatPtrReadable(v float64) *float64 { return &v }
func boolPtrReadable(v bool) *bool        { return &v }
