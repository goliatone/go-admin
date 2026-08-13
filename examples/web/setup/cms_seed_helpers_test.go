package setup

import "testing"

func TestSeedNormalizePathPreservesFallbackAndInternalPathText(t *testing.T) {
	if got := normalizePath("", " landing "); got != "/landing" {
		t.Fatalf("normalizePath slug fallback = %q", got)
	}
	if got := normalizePath(" pages//draft/../landing ", "ignored"); got != "/pages//draft/../landing" {
		t.Fatalf("normalizePath explicit path = %q", got)
	}
}
