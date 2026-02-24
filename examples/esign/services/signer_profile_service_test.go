package services

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestSignerProfileServiceSaveRejectsEmptyPatch(t *testing.T) {
	store := stores.NewInMemoryStore()
	service := NewSignerProfileService(store)

	_, err := service.Save(
		context.Background(),
		stores.Scope{TenantID: "tenant-1", OrgID: "org-1"},
		"recipient-1",
		"profile-key",
		SignerProfilePatch{},
	)
	if err == nil {
		t.Fatalf("expected empty patch validation error")
	}
	if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS text code, got %v", err)
	}
}

func TestSignerProfileServiceSaveRejectsOverlongKey(t *testing.T) {
	store := stores.NewInMemoryStore()
	service := NewSignerProfileService(store)
	fullName := "Signer Example"

	_, err := service.Save(
		context.Background(),
		stores.Scope{TenantID: "tenant-1", OrgID: "org-1"},
		"recipient-1",
		strings.Repeat("k", defaultSignerProfileMaxKeyLength+1),
		SignerProfilePatch{FullName: &fullName},
	)
	if err == nil {
		t.Fatalf("expected key length validation error")
	}
	if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS text code, got %v", err)
	}
}

func TestSignerProfileServiceSaveRejectsControlCharactersInKey(t *testing.T) {
	store := stores.NewInMemoryStore()
	service := NewSignerProfileService(store)
	fullName := "Signer Example"

	_, err := service.Save(
		context.Background(),
		stores.Scope{TenantID: "tenant-1", OrgID: "org-1"},
		"recipient-1",
		"valid-prefix\ninvalid",
		SignerProfilePatch{FullName: &fullName},
	)
	if err == nil {
		t.Fatalf("expected key character validation error")
	}
	if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS text code, got %v", err)
	}
}
