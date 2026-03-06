package handlers

import "testing"

func assertRedacted(t *testing.T, value any, original string) {
	t.Helper()
	masked := toString(value)
	if masked == "" {
		t.Fatalf("expected redacted value, got empty output")
	}
	if masked == original {
		t.Fatalf("expected value to be redacted, got %q", masked)
	}
}

func TestRedactSecurityFieldsMasksSensitiveValues(t *testing.T) {
	input := map[string]any{
		"token":             "raw-token-value",
		"upload_token":      "signed-upload-token",
		"object_key":        "tenant/tenant-1/org/org-1/agreements/a/sig/object.png",
		"sha256":            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		"recipient_email":   "signer@example.com",
		"signature_payload": "data:image/png;base64,AAAA",
		"safe":              "ok",
		"nested": map[string]any{
			"authorization": "Bearer secret-token",
			"meta":          "value",
		},
	}

	masked := RedactSecurityFields(input)

	assertRedacted(t, masked["token"], "raw-token-value")
	assertRedacted(t, masked["upload_token"], "signed-upload-token")
	assertRedacted(t, masked["object_key"], "tenant/tenant-1/org/org-1/agreements/a/sig/object.png")
	assertRedacted(t, masked["sha256"], "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	assertRedacted(t, masked["recipient_email"], "signer@example.com")
	assertRedacted(t, masked["signature_payload"], "data:image/png;base64,AAAA")
	if masked["safe"] != "ok" {
		t.Fatalf("expected safe field preserved, got %v", masked["safe"])
	}

	nested, ok := masked["nested"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested map, got %T", masked["nested"])
	}
	assertRedacted(t, nested["authorization"], "Bearer secret-token")
	if nested["meta"] != "value" {
		t.Fatalf("expected nested meta preserved, got %v", nested["meta"])
	}
}

func TestSecurityLogEventAppliesRedaction(t *testing.T) {
	captured := map[string]any{}
	cfg := registerConfig{
		securityLogEvent: func(_ string, fields map[string]any) {
			captured = fields
		},
	}

	cfg.logSecurityEvent("signer.token.rejected", map[string]any{
		"token":        "secret-token",
		"upload_token": "upload-token",
		"signed_url":   "https://example.com/signed?token=abc",
		"email":        "person@example.com",
		"safe":         "value",
	})

	assertRedacted(t, captured["token"], "secret-token")
	assertRedacted(t, captured["email"], "person@example.com")
	assertRedacted(t, captured["signed_url"], "https://example.com/signed?token=abc")
	assertRedacted(t, captured["upload_token"], "upload-token")
	if captured["safe"] != "value" {
		t.Fatalf("expected safe value preserved, got %v", captured["safe"])
	}
}
