package jobs

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestDeterministicEmailProviderCapturesRecipientLinks(t *testing.T) {
	ResetCapturedRecipientLinks()
	t.Cleanup(ResetCapturedRecipientLinks)

	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	input := EmailSendInput{
		Scope: scope,
		Agreement: stores.AgreementRecord{
			ID: "agreement-1",
		},
		Recipient: stores.RecipientRecord{
			ID:    "recipient-1",
			Email: "signer@example.test",
		},
		TemplateCode: "esign.sign_request_invitation",
		Notification: "signing_invitation",
		SignURL:      "https://esign.test/sign/token-1",
	}

	if _, err := (DeterministicEmailProvider{}).Send(context.Background(), input); err != nil {
		t.Fatalf("deterministic send: %v", err)
	}

	captured, ok := LookupCapturedRecipientLink(scope, "agreement-1", "recipient-1", "signing_invitation")
	if !ok {
		t.Fatal("expected captured invitation link")
	}
	if captured.SignURL != "https://esign.test/sign/token-1" {
		t.Fatalf("expected sign URL captured, got %q", captured.SignURL)
	}
}

func TestLookupCapturedRecipientLinkReturnsLatestEntry(t *testing.T) {
	ResetCapturedRecipientLinks()
	t.Cleanup(ResetCapturedRecipientLinks)

	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	CaptureRecipientLink(EmailSendInput{
		Scope: scope,
		Agreement: stores.AgreementRecord{
			ID: "agreement-1",
		},
		Recipient: stores.RecipientRecord{
			ID: "recipient-1",
		},
		Notification: "signing_invitation",
		SignURL:      "https://esign.test/sign/token-old",
	})
	CaptureRecipientLink(EmailSendInput{
		Scope: scope,
		Agreement: stores.AgreementRecord{
			ID: "agreement-1",
		},
		Recipient: stores.RecipientRecord{
			ID: "recipient-1",
		},
		Notification: "signing_invitation",
		SignURL:      "https://esign.test/sign/token-new",
	})

	captured, ok := LookupCapturedRecipientLink(scope, "agreement-1", "recipient-1", "signing_invitation")
	if !ok {
		t.Fatal("expected latest captured link")
	}
	if captured.SignURL != "https://esign.test/sign/token-new" {
		t.Fatalf("expected latest sign URL, got %q", captured.SignURL)
	}
}
