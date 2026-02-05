package admin

import (
	"strings"
	"testing"
)

func TestDebugMaskInlineStringEmpty(t *testing.T) {
	cfg := DebugConfig{}
	result := debugMaskInlineString(cfg, "")
	if result != "" {
		t.Fatalf("expected empty string, got %q", result)
	}
	result = debugMaskInlineString(cfg, "   ")
	if result != "   " {
		t.Fatalf("expected whitespace preserved, got %q", result)
	}
}

func TestDebugMaskQueryParams(t *testing.T) {
	cfg := DebugConfig{MaskPlaceholder: "***"}
	debugMasker(cfg) // ensure masker initialized

	input := "failed at http://example.com/api?apikey=abc123&name=test"
	result := debugMaskQueryParams(cfg, input)
	if strings.Contains(result, "abc123") {
		t.Fatalf("expected apikey value masked, got %q", result)
	}
	if !strings.Contains(result, "name=test") {
		t.Fatalf("expected non-sensitive param preserved, got %q", result)
	}
}

func TestDebugMaskQueryParamsMultipleSensitive(t *testing.T) {
	cfg := DebugConfig{MaskPlaceholder: "***"}
	debugMasker(cfg)

	input := "error at http://host/p?secret=a&session=b&ok=c"
	result := debugMaskQueryParams(cfg, input)
	if strings.Contains(result, "secret=a") {
		t.Fatalf("expected secret masked, got %q", result)
	}
	if strings.Contains(result, "session=b") {
		t.Fatalf("expected session masked, got %q", result)
	}
	if !strings.Contains(result, "ok=c") {
		t.Fatalf("expected ok param preserved, got %q", result)
	}
}

func TestDebugMaskQueryParamsNoURL(t *testing.T) {
	cfg := DebugConfig{MaskPlaceholder: "***"}
	debugMasker(cfg)

	input := "plain error message without URLs"
	result := debugMaskQueryParams(cfg, input)
	if result != input {
		t.Fatalf("expected no change for non-URL string, got %q", result)
	}
}

func TestDebugMaskInlineTokensBearer(t *testing.T) {
	input := "error: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature123 at line 5"
	result := debugMaskInlineTokens(input)
	if strings.Contains(result, "eyJhbGciOiJIUzI1NiJ9") {
		t.Fatalf("expected bearer token masked, got %q", result)
	}
	if !strings.Contains(result, "Bearer ") {
		t.Fatalf("expected Bearer prefix preserved, got %q", result)
	}
}

func TestDebugMaskInlineTokensJWT(t *testing.T) {
	jwt := "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
	input := "token was " + jwt + " in header"
	result := debugMaskInlineTokens(input)
	if strings.Contains(result, jwt) {
		t.Fatalf("expected JWT masked, got %q", result)
	}
	if !strings.Contains(result, "token was ") {
		t.Fatalf("expected surrounding text preserved, got %q", result)
	}
}

func TestDebugPreserveEnds(t *testing.T) {
	result := debugPreserveEnds("abcdefghijklm", 4, 4)
	if result != "abcd***jklm" {
		t.Fatalf("expected preserved ends, got %q", result)
	}
	// Short string falls back to placeholder
	result = debugPreserveEnds("short", 4, 4)
	if result != "***" {
		t.Fatalf("expected placeholder for short string, got %q", result)
	}
}

func TestDebugIsSensitiveField(t *testing.T) {
	cfg := DebugConfig{
		MaskFieldTypes: map[string]string{"custom_secret": "filled"},
	}
	debugMasker(cfg)

	if !debugIsSensitiveField(cfg, "apikey") {
		t.Fatal("expected apikey to be sensitive")
	}
	if !debugIsSensitiveField(cfg, "session") {
		t.Fatal("expected session to be sensitive")
	}
	if !debugIsSensitiveField(cfg, "custom_secret") {
		t.Fatal("expected custom_secret from config to be sensitive")
	}
	if debugIsSensitiveField(cfg, "name") {
		t.Fatal("expected name to not be sensitive")
	}
}

func TestDebugMaskInlineStringCombined(t *testing.T) {
	cfg := DebugConfig{MaskPlaceholder: "***"}
	debugMasker(cfg)

	input := "error: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature123 at http://host/api?apikey=secret123&page=1"
	result := debugMaskInlineString(cfg, input)
	if strings.Contains(result, "secret123") {
		t.Fatalf("expected apikey value masked, got %q", result)
	}
	if !strings.Contains(result, "page=1") {
		t.Fatalf("expected non-sensitive param preserved, got %q", result)
	}
}
