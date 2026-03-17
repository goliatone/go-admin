package services

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"math"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
	"github.com/phpdave11/gofpdf"
	gofpdi "github.com/phpdave11/gofpdf/contrib/gofpdi"
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
		Title:              "MSA",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-1/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                sourcePDF,
	})
	if err != nil {
		t.Fatalf("upload source document: %v", err)
	}

	agreementSvc := NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("create draft: %v", err)
	}
	recipient, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Name:         new("Signer One"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("upsert recipient: %v", err)
	}
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  new(1),
		PosX:        new(float64(72)),
		PosY:        new(float64(180)),
		Width:       new(float64(180)),
		Height:      new(float64(48)),
		Required:    new(true),
	})
	if err != nil {
		t.Fatalf("upsert signature field: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        new(stores.FieldTypeText),
		PageNumber:  new(1),
		PosX:        new(float64(72)),
		PosY:        new(float64(260)),
		Width:       new(float64(240)),
		Height:      new(float64(36)),
		Required:    new(true),
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
	events := []stores.AuditEventRecord{
		{ID: "event-1", EventType: "agreement.sent", CreatedAt: time.Date(2026, 2, 12, 10, 0, 0, 0, time.UTC)},
		{ID: "event-2", EventType: "signer.submitted", ActorID: recipient.ID, CreatedAt: time.Date(2026, 2, 12, 10, 5, 0, 0, time.UTC)},
	}
	withImage, err := renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope:       scope,
		Agreement:   agreement,
		Recipients:  recipients,
		Fields:      fields,
		FieldValues: values,
		Events:      events,
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
	withImageRaw := string(withImage.Payload)
	if !strings.Contains(withImageRaw, "Audit Trail") || !strings.Contains(withImageRaw, "Document History") {
		t.Fatalf("expected executed payload to include appended audit trail section")
	}
	if got := strings.Count(withImageRaw, "Document Hash: "); got != 1 {
		t.Fatalf("expected one source-page hash footer, got %d", got)
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
		Events:      events,
	})
	if err != nil {
		t.Fatalf("render executed without image: %v", err)
	}
	if len(withImage.Payload) <= len(withoutImage.Payload) {
		t.Fatalf("expected signature image overlay to increase executed payload size: with=%d without=%d", len(withImage.Payload), len(withoutImage.Payload))
	}
}

func TestReadableArtifactRendererRenderExecutedPrefersNormalizedWhenOriginalUnavailable(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	renderer := NewReadableArtifactRenderer(store, store, objectStore)

	docSvc := NewDocumentService(store, WithDocumentObjectStore(objectStore))
	document, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "MSA",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-norm/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("upload source document: %v", err)
	}
	if strings.TrimSpace(document.NormalizedObjectKey) == "" {
		t.Fatalf("expected normalized object key")
	}
	if _, err := objectStore.UploadFile(ctx, document.SourceObjectKey, []byte("not-a-pdf"), uploader.WithContentType("application/pdf")); err != nil {
		t.Fatalf("overwrite source object: %v", err)
	}

	rendered, err := renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope: scope,
		Agreement: stores.AgreementRecord{
			ID:         "agreement-normalized-preferred",
			DocumentID: document.ID,
		},
	})
	if err != nil {
		t.Fatalf("render executed: %v", err)
	}
	if !bytes.HasPrefix(rendered.Payload, []byte("%PDF-")) {
		t.Fatalf("expected rendered payload to be pdf")
	}
}

func TestReadableArtifactRendererRenderExecutedStrictModeBlocksOriginalFallback(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))

	docSvc := NewDocumentService(store)
	document, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "MSA",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-strict/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("upload source document: %v", err)
	}
	if _, err := objectStore.UploadFile(ctx, document.SourceObjectKey, GenerateDeterministicPDF(1), uploader.WithContentType("application/pdf")); err != nil {
		t.Fatalf("upload source object: %v", err)
	}

	policy := DefaultPDFPolicy()
	policy.CompatibilityMode = PDFCompatibilityModeStrict
	renderer := NewReadableArtifactRenderer(
		store,
		store,
		objectStore,
		WithReadableArtifactRendererPDFService(NewPDFService(WithPDFPolicyResolver(NewStaticPDFPolicyResolver(policy)))),
	)
	_, err = renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope: scope,
		Agreement: stores.AgreementRecord{
			ID:         "agreement-strict-no-fallback",
			DocumentID: document.ID,
		},
	})
	if err == nil {
		t.Fatalf("expected strict mode to block original-source fallback")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "fallback disallowed") {
		t.Fatalf("expected fallback disallowed error, got %v", err)
	}
}

func TestReadableArtifactRendererRenderExecutedBlocksUnsupportedCompatibilityTier(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))

	document, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                     "doc-unsupported-render",
		Title:                  "Unsupported Render Source",
		SourceObjectKey:        "tenant/tenant-1/org/org-1/docs/doc-unsupported-render/source.pdf",
		SourceOriginalName:     "source.pdf",
		SourceSHA256:           strings.Repeat("a", 64),
		SourceType:             stores.SourceTypeUpload,
		PDFCompatibilityTier:   string(PDFCompatibilityTierUnsupported),
		PDFCompatibilityReason: PDFCompatibilityReasonPreviewFallbackDisabled,
		CreatedAt:              time.Now().UTC(),
		UpdatedAt:              time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("create document: %v", err)
	}
	if _, err := objectStore.UploadFile(ctx, document.SourceObjectKey, GenerateDeterministicPDF(1), uploader.WithContentType("application/pdf")); err != nil {
		t.Fatalf("upload source payload: %v", err)
	}

	renderer := NewReadableArtifactRenderer(store, store, objectStore)
	_, err = renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope: scope,
		Agreement: stores.AgreementRecord{
			ID:         "agreement-unsupported-render",
			DocumentID: document.ID,
		},
	})
	if err == nil {
		t.Fatalf("expected unsupported compatibility tier to block render")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "pdf compatibility unsupported") {
		t.Fatalf("expected pdf compatibility unsupported error, got %v", err)
	}
}

func TestReadableArtifactRendererRenderExecutedMultiPageAvoidsInfiniteTemplateScale(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	renderer := NewReadableArtifactRenderer(store, store, objectStore)

	sourcePDF := buildReadableTestPDFPages(t, "Multipage MSA", 3)
	docSvc := NewDocumentService(store, WithDocumentObjectStore(objectStore))
	document, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "MSA Multipage",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-mp/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                sourcePDF,
	})
	if err != nil {
		t.Fatalf("upload source document: %v", err)
	}

	agreementSvc := NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "Agreement Multipage",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("create draft: %v", err)
	}
	recipient, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Name:         new("Signer One"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("upsert recipient: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        new(stores.FieldTypeText),
		PageNumber:  new(3),
		PosX:        new(float64(72)),
		PosY:        new(float64(240)),
		Width:       new(float64(320)),
		Height:      new(float64(36)),
		Required:    new(true),
	})
	if err != nil {
		t.Fatalf("upsert text field: %v", err)
	}
	if _, err := store.UpsertFieldValue(ctx, scope, stores.FieldValueRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		FieldID:     textField.ID,
		ValueText:   "Page 3 Overlay Marker",
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
	rendered, err := renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope:       scope,
		Agreement:   agreement,
		Recipients:  recipients,
		Fields:      fields,
		FieldValues: values,
		Events: []stores.AuditEventRecord{
			{ID: "event-1", EventType: "agreement.completed", CreatedAt: time.Date(2026, 2, 15, 12, 0, 0, 0, time.UTC)},
		},
	})
	if err != nil {
		t.Fatalf("render executed: %v", err)
	}
	if !bytes.HasPrefix(rendered.Payload, []byte("%PDF-")) {
		t.Fatalf("expected executed payload to be pdf")
	}
	if strings.Contains(string(rendered.Payload), "IP: -") {
		t.Fatalf("expected audit trail rows to omit placeholder ip marker")
	}
	raw := string(rendered.Payload)
	if !strings.Contains(raw, "Page 3 Overlay Marker") {
		t.Fatalf("expected multi-page overlay text in rendered payload")
	}
	if strings.Contains(raw, "+Inf") {
		t.Fatalf("expected rendered payload without invalid +Inf template transform")
	}
	if !strings.Contains(raw, "Audit Trail") || !strings.Contains(raw, "Document History") {
		t.Fatalf("expected rendered payload to include appended audit section")
	}
	if got := strings.Count(raw, "Document Hash: "); got != 3 {
		t.Fatalf("expected hash footer count to match source pages (3), got %d", got)
	}
	if strings.Count(raw, "/Type /Page") < 3 {
		t.Fatalf("expected rendered payload to preserve multiple pages")
	}
}

func TestReadableArtifactRendererRenderExecutedRecoversImportPanics(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	renderer := NewReadableArtifactRenderer(store, store, objectStore)

	docSvc := NewDocumentService(store, WithDocumentObjectStore(objectStore))
	document, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "Panic Recovery Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-panic/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                samplePDF(1),
	})
	if err != nil {
		t.Fatalf("upload source document: %v", err)
	}
	agreementSvc := NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "Agreement Panic Recovery",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("create draft: %v", err)
	}

	previous := gofpdiImportPageFromStream
	t.Cleanup(func() {
		gofpdiImportPageFromStream = previous
	})
	gofpdiImportPageFromStream = func(_ *gofpdi.Importer, _ *gofpdf.Fpdf, _ *io.ReadSeeker, _ int, _ string) int {
		panic("forced importer panic")
	}

	defer func() {
		if recovered := recover(); recovered != nil {
			t.Fatalf("expected renderer to recover parser panic, got panic=%v", recovered)
		}
	}()
	_, err = renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope:       scope,
		Agreement:   agreement,
		Recipients:  nil,
		Fields:      nil,
		FieldValues: nil,
		Events:      nil,
	})
	if err == nil {
		t.Fatal("expected render error when importer panics")
	}
	if !strings.Contains(err.Error(), "failed importing source page 1") {
		t.Fatalf("expected import failure error, got %v", err)
	}
	snapshot := observability.Snapshot()
	if snapshot.PDFRenderImportFailTotal != 1 {
		t.Fatalf("expected pdf_render_import_fail_total=1, got %+v", snapshot)
	}
	if snapshot.PDFRenderImportFailByReasonTier["reason=import.failed,tier=full"] != 1 {
		t.Fatalf("expected labeled render import fail metric, got %+v", snapshot.PDFRenderImportFailByReasonTier)
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
		"Audit Trail",
		"Document History",
		"Executed SHA256",
		"Correlation ID",
		"corr-1",
		strings.Repeat("a", 64),
		"COMPLETED",
	} {
		if !strings.Contains(raw, expected) {
			t.Fatalf("expected certificate payload to include %q", expected)
		}
	}
}

func TestReadableArtifactRendererAuditPagesShareCoreMarkersBetweenExecutedAndCertificate(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	renderer := NewReadableArtifactRenderer(store, store, objectStore, WithReadableArtifactRendererClock(func() time.Time {
		return time.Date(2026, 2, 13, 12, 0, 0, 0, time.UTC)
	}))

	sourcePDF := buildReadableTestPDF(t, "Master Services Agreement")
	docSvc := NewDocumentService(store, WithDocumentObjectStore(objectStore))
	document, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "MSA",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-1/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                sourcePDF,
	})
	if err != nil {
		t.Fatalf("upload source document: %v", err)
	}
	agreementSvc := NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("create draft: %v", err)
	}
	recipient, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Name:         new("Signer One"),
		Role:         new(stores.RecipientRoleSigner),
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("upsert recipient: %v", err)
	}
	textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        new(stores.FieldTypeText),
		PageNumber:  new(1),
		PosX:        new(float64(72)),
		PosY:        new(float64(260)),
		Width:       new(float64(240)),
		Height:      new(float64(36)),
		Required:    new(true),
	})
	if err != nil {
		t.Fatalf("upsert text field: %v", err)
	}
	if _, err := store.UpsertFieldValue(ctx, scope, stores.FieldValueRecord{
		AgreementID: agreement.ID,
		RecipientID: recipient.ID,
		FieldID:     textField.ID,
		ValueText:   "Marker",
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
	events := []stores.AuditEventRecord{
		{ID: "evt-1", EventType: "agreement.sent", CreatedAt: time.Date(2026, 2, 12, 10, 0, 0, 0, time.UTC)},
		{ID: "evt-2", EventType: "signer.viewed", ActorID: recipient.ID, IPAddress: "203.0.113.22", CreatedAt: time.Date(2026, 2, 12, 10, 2, 0, 0, time.UTC)},
		{ID: "evt-3", EventType: "signer.submitted", ActorID: recipient.ID, CreatedAt: time.Date(2026, 2, 12, 10, 3, 0, 0, time.UTC)},
		{ID: "evt-4", EventType: "agreement.completed", CreatedAt: time.Date(2026, 2, 12, 10, 5, 0, 0, time.UTC)},
	}

	executed, err := renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope:       scope,
		Agreement:   agreement,
		Recipients:  recipients,
		Fields:      fields,
		FieldValues: values,
		Events:      events,
	})
	if err != nil {
		t.Fatalf("render executed: %v", err)
	}
	certificate, err := renderer.RenderCertificate(ctx, CertificateRenderInput{
		Scope:          scope,
		Agreement:      agreement,
		Recipients:     recipients,
		Events:         events,
		ExecutedSHA256: strings.Repeat("a", 64),
		CorrelationID:  "corr-shared",
	})
	if err != nil {
		t.Fatalf("render certificate: %v", err)
	}
	executedRaw := string(executed.Payload)
	certificateRaw := string(certificate.Payload)
	for _, marker := range []string{"Audit Trail", "Document History", "Status", "SENT", "SIGNED", "COMPLETED"} {
		if !strings.Contains(executedRaw, marker) {
			t.Fatalf("expected executed payload marker %q", marker)
		}
		if !strings.Contains(certificateRaw, marker) {
			t.Fatalf("expected certificate payload marker %q", marker)
		}
	}
	if !strings.Contains(executedRaw, "source.pdf") {
		t.Fatalf("expected executed payload to include source original filename")
	}
	if !strings.Contains(executedRaw, "IP: 203.0.113.22") {
		t.Fatalf("expected rendered audit trail to include event ip address")
	}
	if strings.Contains(executedRaw, "IP: -") {
		t.Fatalf("expected rendered audit trail to omit placeholder ip for missing values")
	}
	executedCompletedIdx := strings.Index(executedRaw, "02/12/2026 10:05:00 UTC")
	executedSignedIdx := strings.Index(executedRaw, "02/12/2026 10:03:00 UTC")
	executedSentIdx := strings.Index(executedRaw, "02/12/2026 10:00:00 UTC")
	if executedCompletedIdx < 0 || executedSignedIdx < 0 || executedSentIdx < 0 {
		t.Fatalf("expected executed timeline timestamps in payload")
	}
	if !(executedCompletedIdx < executedSignedIdx && executedSignedIdx < executedSentIdx) {
		t.Fatalf("expected executed document history newest-first, got completed=%d signed=%d sent=%d", executedCompletedIdx, executedSignedIdx, executedSentIdx)
	}
	certificateCompletedIdx := strings.Index(certificateRaw, "02/12/2026 10:05:00 UTC")
	certificateSignedIdx := strings.Index(certificateRaw, "02/12/2026 10:03:00 UTC")
	certificateSentIdx := strings.Index(certificateRaw, "02/12/2026 10:00:00 UTC")
	if certificateCompletedIdx < 0 || certificateSignedIdx < 0 || certificateSentIdx < 0 {
		t.Fatalf("expected certificate timeline timestamps in payload")
	}
	if !(certificateSentIdx < certificateSignedIdx && certificateSignedIdx < certificateCompletedIdx) {
		t.Fatalf("expected certificate document history oldest-first, got sent=%d signed=%d completed=%d", certificateSentIdx, certificateSignedIdx, certificateCompletedIdx)
	}
	if strings.Contains(certificateRaw, "Document Hash: ") {
		t.Fatalf("expected standalone certificate to omit executed hash footer")
	}
}

func TestReadableArtifactRendererRenderExecutedAuditTrailMatchesSourcePageSize(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	renderer := NewReadableArtifactRenderer(store, store, objectStore)

	sourcePDF := buildReadableTestPDFA4(t, "International Agreement")
	docSvc := NewDocumentService(store, WithDocumentObjectStore(objectStore))
	document, err := docSvc.Upload(ctx, scope, DocumentUploadInput{
		Title:              "A4 Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-a4/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                sourcePDF,
	})
	if err != nil {
		t.Fatalf("upload source document: %v", err)
	}

	rendered, err := renderer.RenderExecuted(ctx, ExecutedRenderInput{
		Scope: scope,
		Agreement: stores.AgreementRecord{
			ID:         "agreement-a4-size-match",
			DocumentID: document.ID,
			Status:     stores.AgreementStatusCompleted,
		},
	})
	if err != nil {
		t.Fatalf("render executed: %v", err)
	}
	if !bytes.HasPrefix(rendered.Payload, []byte("%PDF-")) {
		t.Fatalf("expected executed payload to be pdf")
	}

	geometry, err := NewPDFService().PageGeometry(ctx, scope, rendered.Payload, 0)
	if err != nil {
		t.Fatalf("read rendered page geometry: %v", err)
	}
	if len(geometry) < 2 {
		t.Fatalf("expected rendered payload to include source+audit pages, got %d pages", len(geometry))
	}
	sourcePage := geometry[0]
	auditPage := geometry[len(geometry)-1]
	if !almostEqualReadable(sourcePage.Width, auditPage.Width) || !almostEqualReadable(sourcePage.Height, auditPage.Height) {
		t.Fatalf(
			"expected audit page dimensions to match source page dimensions; source=%.2fx%.2f audit=%.2fx%.2f",
			sourcePage.Width,
			sourcePage.Height,
			auditPage.Width,
			auditPage.Height,
		)
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

func buildReadableTestPDFA4(t *testing.T, title string) []byte {
	t.Helper()
	pdf := gofpdf.New("P", "pt", "A4", "")
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

func buildReadableTestPDFPages(t *testing.T, title string, pages int) []byte {
	t.Helper()
	if pages <= 0 {
		pages = 1
	}
	pdf := gofpdf.New("P", "pt", "Letter", "")
	pdf.SetCompression(false)
	for page := 1; page <= pages; page++ {
		pdf.AddPage()
		pdf.SetFont("Helvetica", "B", 18)
		pdf.Text(72, 88, title)
		pdf.SetFont("Helvetica", "", 11)
		pdf.Text(72, 116, fmt.Sprintf("Source Page %d", page))
	}
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
	for y := range 60 {
		for x := range 220 {
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

//go:fix inline
func strPtrReadable(v string) *string { return new(v) }

//go:fix inline
func intPtrReadable(v int) *int { return new(v) }

//go:fix inline
func floatPtrReadable(v float64) *float64 { return new(v) }

//go:fix inline
func boolPtrReadable(v bool) *bool { return new(v) }

func almostEqualReadable(left, right float64) bool {
	return math.Abs(left-right) <= 0.5
}
