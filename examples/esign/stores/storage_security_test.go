package stores

import (
	"strings"
	"testing"
)

func TestObjectStorageSecurityPolicyRequiresEncryption(t *testing.T) {
	policy := DefaultObjectStorageSecurityPolicy()
	key := "tenant/tenant-1/org/org-1/agreements/ag-1/executed.pdf"

	if err := policy.ValidateObjectWrite(key, "aws:kms"); err != nil {
		t.Fatalf("expected encrypted write to pass, got %v", err)
	}
	if err := policy.ValidateObjectWrite(key, ""); err == nil {
		t.Fatal("expected missing encryption to fail")
	} else if !strings.Contains(err.Error(), "STORAGE_ENCRYPTION_REQUIRED") {
		t.Fatalf("expected STORAGE_ENCRYPTION_REQUIRED, got %v", err)
	}
}

func TestObjectStorageSecurityPolicyValidatesRuntimePathShape(t *testing.T) {
	policy := DefaultObjectStorageSecurityPolicy()
	if err := policy.ValidateObjectWrite("agreements/ag-1/executed.pdf", "aws:kms"); err == nil {
		t.Fatal("expected non-tenant path to fail")
	} else if !strings.Contains(err.Error(), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS, got %v", err)
	}
}
