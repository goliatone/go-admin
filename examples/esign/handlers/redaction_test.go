package handlers

import "testing"

func TestRedactSecurityFieldsMasksSensitiveValues(t *testing.T) {
	input := map[string]any{
		"token":             "raw-token-value",
		"recipient_email":   "signer@example.com",
		"signature_payload": "data:image/png;base64,AAAA",
		"safe":              "ok",
		"nested": map[string]any{
			"authorization": "Bearer secret-token",
			"meta":          "value",
		},
	}

	masked := RedactSecurityFields(input)

	if masked["token"] != redactionPlaceholder {
		t.Fatalf("expected token redacted, got %v", masked["token"])
	}
	if masked["recipient_email"] != redactionPlaceholder {
		t.Fatalf("expected recipient_email redacted, got %v", masked["recipient_email"])
	}
	if masked["signature_payload"] != redactionPlaceholder {
		t.Fatalf("expected signature_payload redacted, got %v", masked["signature_payload"])
	}
	if masked["safe"] != "ok" {
		t.Fatalf("expected safe field preserved, got %v", masked["safe"])
	}

	nested, ok := masked["nested"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested map, got %T", masked["nested"])
	}
	if nested["authorization"] != redactionPlaceholder {
		t.Fatalf("expected nested authorization redacted, got %v", nested["authorization"])
	}
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
		"token": "secret-token",
		"email": "person@example.com",
		"safe":  "value",
	})

	if captured["token"] != redactionPlaceholder {
		t.Fatalf("expected token redacted, got %v", captured["token"])
	}
	if captured["email"] != redactionPlaceholder {
		t.Fatalf("expected email redacted, got %v", captured["email"])
	}
	if captured["safe"] != "value" {
		t.Fatalf("expected safe value preserved, got %v", captured["safe"])
	}
}
