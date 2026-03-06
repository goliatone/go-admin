package main

import (
	"strings"
	"testing"
)

func TestESignDemoIdentityStringMasksPassword(t *testing.T) {
	identity := eSignDemoIdentity{
		id:       "identity-id",
		email:    "admin@example.com",
		role:     "admin",
		password: "plain-text-secret",
	}

	plain := identity.String()
	if strings.Contains(plain, "plain-text-secret") {
		t.Fatalf("expected String() to mask password, got: %s", plain)
	}
	if !strings.Contains(plain, "password:") {
		t.Fatalf("expected String() output to include password field")
	}

	goString := identity.GoString()
	if strings.Contains(goString, "plain-text-secret") {
		t.Fatalf("expected GoString() to mask password, got: %s", goString)
	}
}
