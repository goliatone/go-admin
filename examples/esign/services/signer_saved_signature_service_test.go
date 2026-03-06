package services

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const testSavedSignaturePNGDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5+qf8AAAAASUVORK5CYII="

func TestSignerSavedSignatureServiceRoundTrip(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	service := NewSignerSavedSignatureService(stores.NewInMemoryStore())

	saved, err := service.SaveSignature(ctx, scope, "Signer@Example.com", SaveSignerSignatureInput{
		Type:    stores.FieldTypeSignature,
		Label:   "Main signature",
		DataURL: testSavedSignaturePNGDataURL,
	})
	if err != nil {
		t.Fatalf("SaveSignature: %v", err)
	}
	if saved.ID == "" {
		t.Fatal("expected signature id")
	}
	if saved.Type != stores.FieldTypeSignature {
		t.Fatalf("expected signature type, got %q", saved.Type)
	}

	rows, err := service.ListSavedSignatures(ctx, scope, "signer@example.com", stores.FieldTypeSignature)
	if err != nil {
		t.Fatalf("ListSavedSignatures: %v", err)
	}
	if len(rows) != 1 {
		t.Fatalf("expected 1 saved signature, got %d", len(rows))
	}
	if rows[0].ID != saved.ID {
		t.Fatalf("expected id %q, got %q", saved.ID, rows[0].ID)
	}

	if err := service.DeleteSavedSignature(ctx, scope, "signer@example.com", saved.ID); err != nil {
		t.Fatalf("DeleteSavedSignature: %v", err)
	}
	rowsAfterDelete, err := service.ListSavedSignatures(ctx, scope, "signer@example.com", stores.FieldTypeSignature)
	if err != nil {
		t.Fatalf("ListSavedSignatures after delete: %v", err)
	}
	if len(rowsAfterDelete) != 0 {
		t.Fatalf("expected no signatures after delete, got %d", len(rowsAfterDelete))
	}
}

func TestSignerSavedSignatureServiceEnforcesLimit(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	service := NewSignerSavedSignatureService(stores.NewInMemoryStore(), WithSignerSavedSignatureDefaultLimit(1))

	_, err := service.SaveSignature(ctx, scope, "signer@example.com", SaveSignerSignatureInput{
		Type:    stores.FieldTypeInitials,
		DataURL: testSavedSignaturePNGDataURL,
	})
	if err != nil {
		t.Fatalf("first SaveSignature: %v", err)
	}

	_, err = service.SaveSignature(ctx, scope, "signer@example.com", SaveSignerSignatureInput{
		Type:    stores.FieldTypeInitials,
		DataURL: testSavedSignaturePNGDataURL,
	})
	if err == nil {
		t.Fatal("expected limit error")
	}
	if !strings.Contains(err.Error(), string(ErrorCodeSignatureLibraryLimit)) {
		t.Fatalf("expected %s error code, got %v", ErrorCodeSignatureLibraryLimit, err)
	}
}

func TestSignerSavedSignatureServiceRejectsInvalidDataURL(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	service := NewSignerSavedSignatureService(stores.NewInMemoryStore())

	_, err := service.SaveSignature(ctx, scope, "signer@example.com", SaveSignerSignatureInput{
		Type:    stores.FieldTypeSignature,
		DataURL: "data:image/jpeg;base64,abc",
	})
	if err == nil {
		t.Fatal("expected invalid data_url error")
	}
	if !strings.Contains(err.Error(), string(ErrorCodeMissingRequiredFields)) {
		t.Fatalf("expected %s validation error, got %v", ErrorCodeMissingRequiredFields, err)
	}
}
