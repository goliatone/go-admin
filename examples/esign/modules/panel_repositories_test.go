package modules

import (
	"encoding/base64"
	"strings"
	"testing"
)

func TestDecodePDFPayloadRequiresPayload(t *testing.T) {
	_, err := decodePDFPayload(map[string]any{"title": "Missing payload"})
	if err == nil {
		t.Fatal("expected missing payload error")
	}
	if !strings.Contains(err.Error(), "pdf payload is required") {
		t.Fatalf("expected required-payload error, got %v", err)
	}
}

func TestDecodePDFPayloadRejectsInvalidBase64(t *testing.T) {
	_, err := decodePDFPayload(map[string]any{"pdf_base64": "not-base64"})
	if err == nil {
		t.Fatal("expected invalid base64 error")
	}
	if !strings.Contains(err.Error(), "invalid base64 pdf payload") {
		t.Fatalf("expected invalid-base64 error, got %v", err)
	}
}

func TestDecodePDFPayloadAcceptsValidBase64(t *testing.T) {
	raw := []byte("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Type /Page >>\nendobj\n%%EOF")
	encoded := base64.StdEncoding.EncodeToString(raw)
	decoded, err := decodePDFPayload(map[string]any{"pdf_base64": encoded})
	if err != nil {
		t.Fatalf("decodePDFPayload: %v", err)
	}
	if string(decoded) != string(raw) {
		t.Fatalf("expected decoded payload to match input")
	}
}
