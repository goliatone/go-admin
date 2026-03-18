package handlers

import (
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestMatchRedirectRecipientRequiresStableEmailMatch(t *testing.T) {
	source := stores.RecipientRecord{
		Email:        "alice@example.com",
		Name:         "Alice",
		Role:         stores.RecipientRoleSigner,
		SigningOrder: 1,
	}
	targets := []stores.RecipientRecord{
		{
			ID:           "recipient-bob",
			Email:        "bob@example.com",
			Name:         "Bob",
			Role:         stores.RecipientRoleSigner,
			SigningOrder: 1,
		},
	}

	if _, ok := matchRedirectRecipient(source, targets); ok {
		t.Fatal("expected email mismatch to block redirect remapping")
	}
}

func TestMatchRedirectRecipientRejectsAmbiguousNameFallback(t *testing.T) {
	source := stores.RecipientRecord{
		Name:         "Reviewer",
		Role:         stores.RecipientRoleSigner,
		SigningOrder: 1,
	}
	targets := []stores.RecipientRecord{
		{
			ID:           "recipient-1",
			Name:         "Reviewer",
			Role:         stores.RecipientRoleSigner,
			SigningOrder: 1,
		},
		{
			ID:           "recipient-2",
			Name:         "Reviewer",
			Role:         stores.RecipientRoleSigner,
			SigningOrder: 1,
		},
	}

	if _, ok := matchRedirectRecipient(source, targets); ok {
		t.Fatal("expected ambiguous name fallback to block redirect remapping")
	}
}
