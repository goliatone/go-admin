package admin

import (
	"net/http"
	"testing"
)

func TestServiceUnavailableDomainErrorMetadataUsesHTTP503(t *testing.T) {
	entry, ok := DomainErrorCodeFor(TextCodeServiceUnavailable)
	if !ok {
		t.Fatalf("expected %s to be registered", TextCodeServiceUnavailable)
	}
	if entry.HTTPStatus != http.StatusServiceUnavailable {
		t.Fatalf("expected %s registry HTTP status %d, got %d", TextCodeServiceUnavailable, http.StatusServiceUnavailable, entry.HTTPStatus)
	}

	err := NewDomainError(TextCodeServiceUnavailable, "media service unavailable", nil)
	if err.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected direct %s error HTTP status %d, got %d", TextCodeServiceUnavailable, http.StatusServiceUnavailable, err.Code)
	}
	if err.TextCode != TextCodeServiceUnavailable {
		t.Fatalf("expected direct error text code %q, got %q", TextCodeServiceUnavailable, err.TextCode)
	}
}
