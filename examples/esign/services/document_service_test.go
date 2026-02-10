package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func samplePDF(pageCount int) []byte {
	if pageCount <= 0 {
		pageCount = 1
	}
	var b strings.Builder
	b.WriteString("%PDF-1.7\n")
	b.WriteString("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n")
	b.WriteString("2 0 obj<< /Type /Pages /Count ")
	b.WriteString("1")
	b.WriteString(" /Kids [")
	for i := 0; i < pageCount; i++ {
		b.WriteString("3 0 R")
		if i < pageCount-1 {
			b.WriteString(" ")
		}
	}
	b.WriteString("] >>endobj\n")
	for i := 0; i < pageCount; i++ {
		b.WriteString("3 0 obj<< /Type /Page /Parent 2 0 R >>endobj\n")
	}
	b.WriteString("%%EOF")
	return []byte(b.String())
}

func TestExtractPDFMetadata(t *testing.T) {
	raw := samplePDF(2)
	meta, err := ExtractPDFMetadata(raw)
	if err != nil {
		t.Fatalf("ExtractPDFMetadata: %v", err)
	}
	if meta.PageCount != 2 {
		t.Fatalf("expected 2 pages, got %d", meta.PageCount)
	}
	if meta.SizeBytes != int64(len(raw)) {
		t.Fatalf("expected size %d, got %d", len(raw), meta.SizeBytes)
	}
	sum := sha256.Sum256(raw)
	if meta.SHA256 != hex.EncodeToString(sum[:]) {
		t.Fatalf("unexpected sha256 %q", meta.SHA256)
	}
}

func TestExtractPDFMetadataRejectsInvalidPayload(t *testing.T) {
	cases := [][]byte{
		[]byte(""),
		[]byte("not-a-pdf"),
		[]byte("%PDF-1.7\nmissing eof"),
		[]byte("%PDF-1.7\n%%EOF"),
	}
	for i, raw := range cases {
		if _, err := ExtractPDFMetadata(raw); err == nil {
			t.Fatalf("case %d: expected error", i)
		}
	}
}

func TestDocumentServiceUploadPersistsMetadata(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	clock := time.Date(2026, 1, 5, 9, 0, 0, 0, time.UTC)
	store := stores.NewInMemoryStore()
	svc := NewDocumentService(store, WithDocumentClock(func() time.Time { return clock }))

	raw := samplePDF(1)
	record, err := svc.Upload(ctx, scope, DocumentUploadInput{
		Title:     "NDA",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		PDF:       raw,
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	if record.ID == "" {
		t.Fatal("expected generated id")
	}
	if record.PageCount != 1 {
		t.Fatalf("expected page count 1, got %d", record.PageCount)
	}
	if record.CreatedAt != clock {
		t.Fatalf("expected created_at %v, got %v", clock, record.CreatedAt)
	}
	stored, err := store.Get(ctx, scope, record.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if stored.SourceSHA256 != record.SourceSHA256 {
		t.Fatalf("expected persisted sha256 %q, got %q", record.SourceSHA256, stored.SourceSHA256)
	}
}

func TestDocumentServiceUploadRequiresObjectKey(t *testing.T) {
	svc := NewDocumentService(stores.NewInMemoryStore())
	_, err := svc.Upload(context.Background(), stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}, DocumentUploadInput{PDF: samplePDF(1)})
	if err == nil {
		t.Fatal("expected validation error")
	}
}
