package release

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSmokeE2EUsesRuntimeIssuedRecipientLinks(t *testing.T) {
	scriptPath := filepath.Join("..", "smoke_e2e.sh")
	raw, err := os.ReadFile(scriptPath)
	if err != nil {
		t.Fatalf("ReadFile smoke script: %v", err)
	}
	script := string(raw)

	if !strings.Contains(script, "/admin/api/v1/esign/smoke/recipient-links") {
		t.Fatalf("expected smoke script to resolve runtime-issued recipient links from admin capture source")
	}
	if !strings.Contains(script, `resolve_recipient_link "${AGREEMENT_ID}" "${SIGNER_RECIPIENT_ID}" "signing_invitation"`) {
		t.Fatalf("expected smoke script to resolve invitation URL from recipient-link source")
	}
	if !strings.Contains(script, `resolve_recipient_link "${AGREEMENT_ID}" "${CC_RECIPIENT_ID}" "completion_delivery"`) {
		t.Fatalf("expected smoke script to resolve completion URL from recipient-link source")
	}
	if strings.Contains(script, "issue_signing_token") {
		t.Fatalf("smoke script must not use deterministic token mint shortcuts")
	}
	if strings.Contains(script, "/api/v1/esign/signing/fields/") {
		t.Fatalf("smoke script must not start signer journey from legacy /fields shortcut path")
	}
}

