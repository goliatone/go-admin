package admin

import (
	"testing"

	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestDebugGenerateNonce(t *testing.T) {
	nonce := debugGenerateNonce()
	if nonce == "" {
		t.Fatal("expected non-empty nonce")
	}
	if len(nonce) != debugNonceBytes*2 {
		t.Fatalf("expected nonce length %d, got %d", debugNonceBytes*2, len(nonce))
	}
}

func TestDebugGenerateNonceUnique(t *testing.T) {
	a := debugGenerateNonce()
	b := debugGenerateNonce()
	if a == b {
		t.Fatal("expected two nonces to be different")
	}
}

func TestDebugValidateNonce(t *testing.T) {
	tests := []struct {
		name   string
		cookie string
		body   string
		want   bool
	}{
		{"matching", "abc123", "abc123", true},
		{"mismatched", "abc123", "xyz789", false},
		{"empty cookie", "", "abc123", false},
		{"empty body", "abc123", "", false},
		{"both empty", "", "", false},
		{"whitespace trimmed", " abc123 ", " abc123 ", true},
		{"whitespace mismatch", " abc123 ", " xyz789 ", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := debugValidateNonce(tt.cookie, tt.body)
			if got != tt.want {
				t.Fatalf("debugValidateNonce(%q, %q) = %v, want %v", tt.cookie, tt.body, got, tt.want)
			}
		})
	}
}

func TestDebugEnsureJSErrorNonceNew(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Cookie", mock.Anything).Return()
	// No existing cookie — CookiesM is empty by default.
	nonce := debugEnsureJSErrorNonce(ctx, "/")
	if nonce == "" {
		t.Fatal("expected non-empty nonce from new generation")
	}
	if len(nonce) != debugNonceBytes*2 {
		t.Fatalf("expected nonce length %d, got %d", debugNonceBytes*2, len(nonce))
	}
	// Verify the cookie was stored in mock.
	stored := ctx.CookiesM[debugNonceCookieName]
	if stored != nonce {
		t.Fatalf("expected cookie value %q, got %q", nonce, stored)
	}
}

func TestDebugEnsureJSErrorNonceExisting(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.CookiesM[debugNonceCookieName] = "existing-nonce-value"
	nonce := debugEnsureJSErrorNonce(ctx, "/")
	if nonce != "existing-nonce-value" {
		t.Fatalf("expected existing nonce %q, got %q", "existing-nonce-value", nonce)
	}
}

func TestDebugEnsureJSErrorNonceNilContext(t *testing.T) {
	nonce := debugEnsureJSErrorNonce(nil, "/")
	if nonce != "" {
		t.Fatalf("expected empty nonce for nil context, got %q", nonce)
	}
}
