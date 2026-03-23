package pathutil

import "testing"

func TestNormalizeBasePath(t *testing.T) {
	tests := map[string]string{
		"":         "",
		"   ":      "",
		"/":        "/",
		"admin":    "/admin",
		"/admin/":  "/admin",
		" /a/b/  ": "/a/b",
	}
	for input, want := range tests {
		if got := NormalizeBasePath(input); got != want {
			t.Fatalf("NormalizeBasePath(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestEnsureLeadingSlash(t *testing.T) {
	if got := EnsureLeadingSlash("admin"); got != "/admin" {
		t.Fatalf("EnsureLeadingSlash mismatch: %q", got)
	}
	if got := EnsureLeadingSlash(" /admin "); got != "/admin" {
		t.Fatalf("EnsureLeadingSlash trim mismatch: %q", got)
	}
}

func TestJoinBasePath(t *testing.T) {
	if got := JoinBasePath("/admin", "content"); got != "/admin/content" {
		t.Fatalf("JoinBasePath mismatch: %q", got)
	}
	if got := JoinBasePath("/", "content"); got != "/content" {
		t.Fatalf("JoinBasePath root mismatch: %q", got)
	}
	if got := JoinBasePath("/admin", "/"); got != "/admin" {
		t.Fatalf("JoinBasePath blank suffix mismatch: %q", got)
	}
}

func TestPrefixBasePath(t *testing.T) {
	if got := PrefixBasePath("/admin", "content"); got != "/admin/content" {
		t.Fatalf("PrefixBasePath mismatch: %q", got)
	}
	if got := PrefixBasePath("/admin", "/admin/content"); got != "/admin/content" {
		t.Fatalf("PrefixBasePath should keep prefixed path: %q", got)
	}
	if got := PrefixBasePath("/", "content"); got != "/content" {
		t.Fatalf("PrefixBasePath root mismatch: %q", got)
	}
}

func TestTrimTrailingSlash(t *testing.T) {
	if got := TrimTrailingSlash("/admin/"); got != "/admin" {
		t.Fatalf("TrimTrailingSlash mismatch: %q", got)
	}
	if got := TrimTrailingSlash("/"); got != "/" {
		t.Fatalf("TrimTrailingSlash root mismatch: %q", got)
	}
}

func TestIsAbsoluteURL(t *testing.T) {
	if !IsAbsoluteURL("https://example.com/a") {
		t.Fatalf("expected https URL to be absolute")
	}
	if !IsAbsoluteURL("//cdn.example.com/a") {
		t.Fatalf("expected scheme-relative URL to be absolute")
	}
	if IsAbsoluteURL("/admin") {
		t.Fatalf("path should not be absolute URL")
	}
}
